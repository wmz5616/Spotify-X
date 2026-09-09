import { Injectable, Logger } from '@nestjs/common';
import * as http from 'http';
import * as https from 'https';

export interface OnlineArtist {
  id: number;
  name: string;
  avatarUrl?: string | null;
  headerUrl?: string | null;
  bio?: string | null;
  albums?: (OnlineAlbum & { songs: OnlineSong[]; artists: OnlineArtist[] })[];
  _count?: {
    albums?: number;
    songs?: number;
  };
}

export interface OnlineAlbum {
  id: number;
  title: string;
  coverPath?: string | null;
  artists: OnlineArtist[];
  songs?: OnlineSong[];
  releaseDate?: string;
  duration?: number;
  _count: {
    songs: number;
  };
}

export interface OnlineSong {
  id: number;
  title: string;
  artist: string;
  trackNumber: number | null;
  duration: number;
  year?: string | number;
  lyrics?: string | null;
  album: {
    id: number;
    title: string;
    coverPath?: string | null;
    artists: OnlineArtist[];
  };
}

export interface OnlineSearchResult {
  songs: OnlineSong[];
  albums: OnlineAlbum[];
  artists: OnlineArtist[];
  playlists: any[];
}

@Injectable()
export class OnlineMusicService {
  private readonly logger = new Logger(OnlineMusicService.name);

  // Tidal credentials extracted from monochrome.tf
  private readonly TIDAL_CLIENT_ID = 'txNoH4kkV41MfH25';
  private readonly TIDAL_CLIENT_SECRET = 'dQjy0MinCEvxi1O4UmxvxWnDjt4cgHBPw8ll6nYBk98=';
  private tidalAccessToken: string | null = null;
  private tidalTokenExpiresAt = 0;

  // In-memory cache for fast metadata lookup
  private songCache = new Map<number, OnlineSong>();
  private albumCache = new Map<number, OnlineAlbum>();
  private artistCache = new Map<number, OnlineArtist>();
  private artistNameCache = new Map<string, OnlineArtist>();
  private streamUrlCache = new Map<number, string>();
  private lyricsCache = new Map<number, string>();
  private artistHeaderCache = new Map<string, string>();
  private spotifyAccessToken: string | null = null;
  private spotifyTokenExpiresAt = 0;

  private httpGet(url: string, headers: Record<string, string> = {}): Promise<string> {
    return new Promise((resolve, reject) => {
      const mod = url.startsWith('https') ? https : http;
      const req = mod.get(url, { headers }, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return this.httpGet(res.headers.location, headers).then(resolve).catch(reject);
        }
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve(data));
      });
      req.on('error', (err) => reject(err));
      req.setTimeout(10000, () => {
        req.destroy();
        reject(new Error(`Request timeout: ${url}`));
      });
    });
  }

  private httpPost(url: string, body: string, headers: Record<string, string> = {}): Promise<string> {
    return new Promise((resolve, reject) => {
      const mod = url.startsWith('https') ? https : http;
      const u = new URL(url);
      const req = mod.request(
        {
          hostname: u.hostname,
          port: u.port || (url.startsWith('https') ? 443 : 80),
          path: u.pathname + u.search,
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(body),
            ...headers,
          },
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => resolve(data));
        },
      );
      req.on('error', (err) => reject(err));
      req.setTimeout(10000, () => {
        req.destroy();
        reject(new Error(`POST timeout: ${url}`));
      });
      req.write(body);
      req.end();
    });
  }

  /**
   * Acquire Tidal client_credentials access token (identical to Monochrome.tf)
   */
  private async getTidalAccessToken(): Promise<string | null> {
    if (this.tidalAccessToken && Date.now() < this.tidalTokenExpiresAt) {
      return this.tidalAccessToken;
    }

    try {
      const basic = Buffer.from(`${this.TIDAL_CLIENT_ID}:${this.TIDAL_CLIENT_SECRET}`).toString('base64');
      const body = `grant_type=client_credentials&client_id=${this.TIDAL_CLIENT_ID}&client_secret=${encodeURIComponent(this.TIDAL_CLIENT_SECRET)}`;
      const res = await this.httpPost('https://auth.tidal.com/v1/oauth2/token', body, {
        Authorization: `Basic ${basic}`,
        'User-Agent': 'Mozilla/5.0',
      });
      const data = JSON.parse(res);
      if (data.access_token) {
        this.tidalAccessToken = data.access_token;
        this.tidalTokenExpiresAt = Date.now() + (data.expires_in || 86400) * 1000 - 60000;
        return this.tidalAccessToken;
      }
    } catch (e) {
      this.logger.warn('Failed to obtain Tidal token:', e);
    }
    return null;
  }

  /**
   * Helper to format Tidal image paths from UUIDs
   */
  private formatTidalImageUrl(uuid?: string | null, size = '640x640'): string | null {
    if (!uuid) return null;
    return `https://resources.tidal.com/images/${uuid.replace(/-/g, '/')}/${size}.jpg`;
  }

  /**
   * Acquire Spotify client_credentials token if SPOTIFY_CLIENT_ID & SECRET are configured
   */
  private async getSpotifyAccessToken(): Promise<string | null> {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    if (!clientId || !clientSecret) return null;

    if (this.spotifyAccessToken && Date.now() < this.spotifyTokenExpiresAt) {
      return this.spotifyAccessToken;
    }

    try {
      const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      const body = 'grant_type=client_credentials';
      const res = await this.httpPost('https://accounts.spotify.com/api/token', body, {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      });
      const data = JSON.parse(res);
      if (data.access_token) {
        this.spotifyAccessToken = data.access_token;
        this.spotifyTokenExpiresAt = Date.now() + (data.expires_in || 3600) * 1000 - 60000;
        return this.spotifyAccessToken;
      }
    } catch (e) {
      this.logger.warn('Failed to obtain Spotify token:', e);
    }
    return null;
  }

  /**
   * Fetch high-definition artist background / banner image (Spotify / Deezer / Tidal)
   */
  async fetchArtistHeaderImage(artistName: string): Promise<string | null> {
    const trimmed = artistName?.trim();
    if (!trimmed) return null;
    const lower = trimmed.toLowerCase();
    if (this.artistHeaderCache.has(lower)) {
      return this.artistHeaderCache.get(lower)!;
    }

    // 1. Spotify Web API (if credentials configured in env)
    try {
      const spotifyToken = await this.getSpotifyAccessToken();
      if (spotifyToken) {
        const spotifySearch = await this.httpGet(
          `https://api.spotify.com/v1/search?q=${encodeURIComponent(trimmed)}&type=artist&limit=1`,
          { Authorization: `Bearer ${spotifyToken}` },
        );
        const spotifyJson = JSON.parse(spotifySearch);
        const artistItem = spotifyJson.artists?.items?.[0];
        if (artistItem?.images?.[0]?.url) {
          const url = artistItem.images[0].url;
          this.artistHeaderCache.set(lower, url);
          this.logger.log(`Fetched Spotify artist banner for "${trimmed}": ${url}`);
          return url;
        }
      }
    } catch (e) {
      this.logger.warn(`Spotify API artist image lookup error for "${trimmed}": ${e}`);
    }

    // 2. High-res Photography via Deezer Open API (1000x1000 official artist portrait)
    try {
      const deezerRaw = await this.httpGet(
        `https://api.deezer.com/search/artist?q=${encodeURIComponent(trimmed)}`,
        { 'User-Agent': 'Mozilla/5.0' },
      );
      const deezerJson = JSON.parse(deezerRaw);
      if (Array.isArray(deezerJson?.data) && deezerJson.data.length > 0) {
        const match =
          deezerJson.data.find((a: any) => a.name.toLowerCase() === lower) ||
          deezerJson.data[0];
        const bannerUrl = match?.picture_xl || match?.picture_big;
        if (bannerUrl) {
          this.artistHeaderCache.set(lower, bannerUrl);
          this.logger.log(`Fetched HD artist banner via Deezer for "${trimmed}": ${bannerUrl}`);
          return bannerUrl;
        }
      }
    } catch (e) {
      this.logger.warn(`Deezer artist banner error for "${trimmed}": ${e}`);
    }

    return null;
  }

  /**
   * Load real-time trending albums and tracks directly from Monochrome's official hot API (https://hot.monochrome.tf/)
   */
  private async loadMonochromeHot(): Promise<void> {
    try {
      const raw = await this.httpGet('https://hot.monochrome.tf/', {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
      });
      const json = JSON.parse(raw);

      // 1. Process top_albums from Monochrome / Tidal
      if (Array.isArray(json.top_albums)) {
        for (const alb of json.top_albums) {
          const albumId = alb.id;
          const artistObj: OnlineArtist = {
            id: alb.artists?.[0]?.id || Math.abs(this.hashCode(alb.artists?.[0]?.name || 'Unknown')),
            name: alb.artists?.[0]?.name || 'Various Artists',
            avatarUrl: this.formatTidalImageUrl(alb.artists?.[0]?.picture, '320x320'),
          };
          this.artistCache.set(artistObj.id, artistObj);
          this.artistNameCache.set(artistObj.name.toLowerCase(), artistObj);

          const coverUrl = this.formatTidalImageUrl(alb.cover, '640x640') || 'https://resources.tidal.com/images/default/640x640.jpg';
          const albumObj: OnlineAlbum = {
            id: albumId,
            title: alb.title || 'Untitled Album',
            coverPath: coverUrl,
            artists: [artistObj],
            releaseDate: alb.releaseDate,
            duration: alb.duration,
            songs: [],
            _count: { songs: alb.numberOfTracks || 1 },
          };
          this.albumCache.set(albumId, albumObj);
        }
      }

      // 2. Process top_tracks from Monochrome / Tidal
      if (Array.isArray(json.top_tracks)) {
        for (const trk of json.top_tracks) {
          const songId = trk.id;
          const artistObj: OnlineArtist = {
            id: trk.artists?.[0]?.id || Math.abs(this.hashCode(trk.artists?.[0]?.name || 'Unknown')),
            name: trk.artists?.[0]?.name || 'Various Artists',
            avatarUrl: this.formatTidalImageUrl(trk.artists?.[0]?.picture, '320x320'),
          };
          this.artistCache.set(artistObj.id, artistObj);
          this.artistNameCache.set(artistObj.name.toLowerCase(), artistObj);

          const albumId = trk.album?.id || songId;
          const coverUrl = this.formatTidalImageUrl(trk.album?.cover, '640x640') || 'https://resources.tidal.com/images/default/640x640.jpg';
          const albumObj: OnlineAlbum = {
            id: albumId,
            title: trk.album?.title || trk.title,
            coverPath: coverUrl,
            artists: [artistObj],
            _count: { songs: 1 },
          };
          this.albumCache.set(albumId, albumObj);

          const songObj: OnlineSong = {
            id: songId,
            title: trk.title,
            artist: artistObj.name,
            trackNumber: trk.trackNumber || 1,
            duration: trk.duration || 180,
            year: trk.album?.releaseDate ? trk.album.releaseDate.slice(0, 4) : 2026,
            album: {
              id: albumId,
              title: albumObj.title,
              coverPath: coverUrl,
              artists: [artistObj],
            },
          };
          this.songCache.set(songId, songObj);
        }
      }
    } catch (e) {
      this.logger.error('Failed to load real-time hot content from hot.monochrome.tf:', e);
    }
  }

  /**
   * Search for songs, albums, and artists online (Tidal API as Monochrome does, with multi-provider fallback)
   */
  async search(query: string, page = 0, limit = 20): Promise<OnlineSearchResult> {
    const trimmed = query.trim();
    if (!trimmed) {
      return { songs: [], albums: [], artists: [], playlists: [] };
    }

    // 1. Try Tidal search (as used in monochrome.tf)
    try {
      const token = await this.getTidalAccessToken();
      if (token) {
        const tidalUrl = `https://api.tidal.com/v1/search?query=${encodeURIComponent(trimmed)}&limit=${limit}&offset=${page * limit}&countryCode=US`;
        const raw = await this.httpGet(tidalUrl, {
          Authorization: `Bearer ${token}`,
          'User-Agent': 'Mozilla/5.0',
        });
        const json = JSON.parse(raw);

        if (json && (json.tracks?.items?.length || json.albums?.items?.length || json.artists?.items?.length)) {
          const songs: OnlineSong[] = [];
          const albumMap = new Map<number, OnlineAlbum>();
          const artistMap = new Map<number, OnlineArtist>();

          // Parse Artists
          if (json.artists?.items) {
            for (const item of json.artists.items) {
              const artistObj: OnlineArtist = {
                id: item.id,
                name: item.name,
                avatarUrl: this.formatTidalImageUrl(item.picture, '320x320'),
                _count: { albums: 1, songs: 1 },
              };
              artistMap.set(item.id, artistObj);
              this.artistCache.set(item.id, artistObj);
              this.artistNameCache.set(item.name.toLowerCase(), artistObj);
            }
          }

          // Parse Albums
          if (json.albums?.items) {
            for (const item of json.albums.items) {
              const artist = item.artists?.[0];
              const artistObj: OnlineArtist = {
                id: artist?.id || Math.abs(this.hashCode(artist?.name || 'Unknown')),
                name: artist?.name || 'Unknown',
                avatarUrl: this.formatTidalImageUrl(artist?.picture, '320x320'),
              };
              const albumObj: OnlineAlbum = {
                id: item.id,
                title: item.title,
                coverPath: this.formatTidalImageUrl(item.cover, '640x640'),
                artists: [artistObj],
                releaseDate: item.releaseDate,
                duration: item.duration,
                _count: { songs: item.numberOfTracks || 1 },
              };
              albumMap.set(item.id, albumObj);
              this.albumCache.set(item.id, albumObj);
            }
          }

          // Parse Tracks
          if (json.tracks?.items) {
            for (const item of json.tracks.items) {
              const artist = item.artists?.[0];
              const artistObj: OnlineArtist = {
                id: artist?.id || Math.abs(this.hashCode(artist?.name || 'Unknown')),
                name: artist?.name || 'Unknown',
                avatarUrl: this.formatTidalImageUrl(artist?.picture, '320x320'),
              };
              const album = item.album;
              const albumId = album?.id || item.id;
              const coverUrl = this.formatTidalImageUrl(album?.cover, '640x640');
              const songObj: OnlineSong = {
                id: item.id,
                title: item.title,
                artist: artistObj.name,
                trackNumber: item.trackNumber || 1,
                duration: item.duration || 180,
                year: album?.releaseDate ? album.releaseDate.slice(0, 4) : 2026,
                album: {
                  id: albumId,
                  title: album?.title || item.title,
                  coverPath: coverUrl,
                  artists: [artistObj],
                },
              };
              songs.push(songObj);
              this.songCache.set(item.id, songObj);
              if (!albumMap.has(albumId)) {
                albumMap.set(albumId, {
                  id: albumId,
                  title: album?.title || item.title,
                  coverPath: coverUrl,
                  artists: [artistObj],
                  songs: [songObj],
                  _count: { songs: 1 },
                });
              }
            }
          }

          return {
            songs,
            albums: Array.from(albumMap.values()),
            artists: Array.from(artistMap.values()),
            playlists: [],
          };
        }
      }
    } catch (e) {
      this.logger.warn(`Tidal search failed for query "${trimmed}", trying aggregator:`, e);
    }

    // 2. High-speed aggregator fallback (supports Chinese & regional titles)
    try {
      const searchUrl = `https://www.kuwo.cn/search/searchMusicBykeyWord?vipver=1&client=kt&ft=music&cluster=0&strategy=2012&encoding=utf8&rformat=json&mobi=1&issubtitle=1&show_copyright_off=1&pn=${page}&rn=${limit}&all=${encodeURIComponent(trimmed)}`;
      const raw = await this.httpGet(searchUrl, {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
      });
      const json = JSON.parse(raw);
      if (json && Array.isArray(json.abslist)) {
        const songs: OnlineSong[] = [];
        const albumMap = new Map<number, OnlineAlbum>();
        const artistMap = new Map<number, OnlineArtist>();

        for (const item of json.abslist) {
          const rawRid = item.MUSICRID ? item.MUSICRID.replace('MUSIC_', '') : item.DC_TARGETID;
          const songId = parseInt(rawRid, 10);
          if (isNaN(songId)) continue;

          const artistId = parseInt(item.ARTISTID, 10) || Math.abs(this.hashCode(item.ARTIST || 'Unknown'));
          const albumId = parseInt(item.ALBUMID, 10) || Math.abs(this.hashCode(item.ALBUM || 'Unknown'));

          const title = this.cleanString(item.SONGNAME || item.NAME || '未知曲目');
          const artistName = this.cleanString(item.ARTIST || '群星');
          const albumTitle = this.cleanString(item.ALBUM || '单曲');
          const duration = parseInt(item.DURATION, 10) || 0;

          let coverPath = 'https://resources.tidal.com/images/default/640x640.jpg';
          if (item.web_albumpic_short) {
            coverPath = `https://img1.kuwo.cn/star/albumcover/${item.web_albumpic_short.replace(/^120\//, '500/')}`;
          }

          const artistObj: OnlineArtist = {
            id: artistId,
            name: artistName,
            avatarUrl: item.web_artistpic_short ? `https://img1.kuwo.cn/star/starheads/${item.web_artistpic_short}` : null,
          };
          this.artistNameCache.set(artistName.toLowerCase(), artistObj);

          const songObj: OnlineSong = {
            id: songId,
            title,
            artist: artistName,
            trackNumber: item.track || 1,
            duration,
            year: 2026,
            album: {
              id: albumId,
              title: albumTitle,
              coverPath,
              artists: [artistObj],
            },
          };

          songs.push(songObj);
          this.songCache.set(songId, songObj);
          if (!albumMap.has(albumId)) {
            albumMap.set(albumId, {
              id: albumId,
              title: albumTitle,
              coverPath,
              artists: [artistObj],
              songs: [songObj],
              _count: { songs: 1 },
            });
          }
        }

        return {
          songs,
          albums: Array.from(albumMap.values()),
          artists: Array.from(artistMap.values()),
          playlists: [],
        };
      }
    } catch (err) {
      this.logger.error(`Search error for "${query}":`, err);
    }

    return { songs: [], albums: [], artists: [], playlists: [] };
  }

  /**
   * Find a song by ID
   */
  async findSongById(id: number): Promise<OnlineSong | null> {
    if (this.songCache.has(id)) {
      return this.songCache.get(id)!;
    }
    await this.loadMonochromeHot();
    if (this.songCache.has(id)) {
      return this.songCache.get(id)!;
    }

    // Try Tidal track lookup
    try {
      const token = await this.getTidalAccessToken();
      if (token) {
        const raw = await this.httpGet(`https://api.tidal.com/v1/tracks/${id}?countryCode=US`, {
          Authorization: `Bearer ${token}`,
          'User-Agent': 'Mozilla/5.0',
        });
        const trk = JSON.parse(raw);
        if (trk && trk.id) {
          const artistObj: OnlineArtist = {
            id: trk.artists?.[0]?.id || 1,
            name: trk.artists?.[0]?.name || 'Unknown',
            avatarUrl: this.formatTidalImageUrl(trk.artists?.[0]?.picture, '320x320'),
          };
          const albumObj: OnlineAlbum = {
            id: trk.album?.id || trk.id,
            title: trk.album?.title || trk.title,
            coverPath: this.formatTidalImageUrl(trk.album?.cover, '640x640'),
            artists: [artistObj],
            _count: { songs: 1 },
          };
          const songObj: OnlineSong = {
            id: trk.id,
            title: trk.title,
            artist: artistObj.name,
            trackNumber: trk.trackNumber || 1,
            duration: trk.duration || 180,
            year: trk.album?.releaseDate ? trk.album.releaseDate.slice(0, 4) : 2026,
            album: albumObj,
          };
          this.songCache.set(trk.id, songObj);
          return songObj;
        }
      }
    } catch {
      // Ignore
    }

    return null;
  }

  /**
   * Find album by ID (fetches tracks from Tidal or cache)
   */
  async findAlbumById(id: number): Promise<OnlineAlbum | null> {
    const cached = this.albumCache.get(id);
    if (cached && cached.songs && cached.songs.length > 0) {
      return cached;
    }

    // Fetch from Tidal
    try {
      const token = await this.getTidalAccessToken();
      if (token) {
        const [albumRaw, itemsRaw] = await Promise.all([
          this.httpGet(`https://api.tidal.com/v1/albums/${id}?countryCode=US`, {
            Authorization: `Bearer ${token}`,
            'User-Agent': 'Mozilla/5.0',
          }),
          this.httpGet(`https://api.tidal.com/v1/albums/${id}/items?limit=100&countryCode=US`, {
            Authorization: `Bearer ${token}`,
            'User-Agent': 'Mozilla/5.0',
          }),
        ]);

        const alb = JSON.parse(albumRaw);
        const itemsJson = JSON.parse(itemsRaw);

        if (alb && alb.id) {
          const artistObj: OnlineArtist = {
            id: alb.artists?.[0]?.id || Math.abs(this.hashCode(alb.artists?.[0]?.name || 'Unknown')),
            name: alb.artists?.[0]?.name || 'Unknown',
            avatarUrl: this.formatTidalImageUrl(alb.artists?.[0]?.picture, '320x320'),
          };

          const coverUrl = this.formatTidalImageUrl(alb.cover, '640x640');
          const songs: OnlineSong[] = [];

          if (Array.isArray(itemsJson.items)) {
            itemsJson.items.forEach((entry: any, idx: number) => {
              const trk = entry.item;
              if (!trk) return;
              const songObj: OnlineSong = {
                id: trk.id,
                title: trk.title,
                artist: trk.artists?.[0]?.name || artistObj.name,
                trackNumber: trk.trackNumber || idx + 1,
                duration: trk.duration || 180,
                year: alb.releaseDate ? alb.releaseDate.slice(0, 4) : 2026,
                album: {
                  id: alb.id,
                  title: alb.title,
                  coverPath: coverUrl,
                  artists: [artistObj],
                },
              };
              songs.push(songObj);
              this.songCache.set(trk.id, songObj);
            });
          }

          const albumObj: OnlineAlbum = {
            id: alb.id,
            title: alb.title,
            coverPath: coverUrl,
            artists: [artistObj],
            releaseDate: alb.releaseDate,
            duration: alb.duration,
            songs,
            _count: { songs: songs.length || alb.numberOfTracks || 1 },
          };

          this.albumCache.set(id, albumObj);
          return albumObj;
        }
      }
    } catch (e) {
      this.logger.warn(`Failed to fetch Tidal album ${id}:`, e);
    }

    if (cached) return cached;
    return null;
  }

  /**
   * Find artist by Name (searches Tidal or cache, returns artist with albums and popular songs)
   */
  async findArtistByName(name: string): Promise<any | null> {
    const trimmed = name.trim();
    if (!trimmed) return null;

    // 1. Check cache
    const lower = trimmed.toLowerCase();
    const cached = this.artistNameCache.get(lower);
    if (cached?.albums && cached.albums.length > 0) {
      return cached;
    }

    // 2. Search Tidal by artist name
    try {
      const token = await this.getTidalAccessToken();
      if (token) {
        const searchRaw = await this.httpGet(
          `https://api.tidal.com/v1/search?query=${encodeURIComponent(trimmed)}&limit=5&countryCode=US`,
          {
            Authorization: `Bearer ${token}`,
            'User-Agent': 'Mozilla/5.0',
          },
        );
        const searchJson = JSON.parse(searchRaw);
        const artistItem = searchJson.artists?.items?.find(
          (a: any) => a.name.toLowerCase() === lower,
        ) || searchJson.artists?.items?.[0];

        if (artistItem && artistItem.id) {
          return await this.findArtistById(artistItem.id, artistItem);
        }
      }
    } catch (e) {
      this.logger.warn(`Failed to find artist by name "${trimmed}":`, e);
    }

    // Fallback: create mock artist from cached tracks
    if (cached) {
      return {
        ...cached,
        albums: [],
      };
    }

    return null;
  }

  /**
   * Find artist by ID (fetches albums and top tracks from Tidal)
   */
  async findArtistById(id: number, initialArtistData?: any): Promise<any | null> {
    try {
      const token = await this.getTidalAccessToken();
      if (token) {
        let artist = initialArtistData;
        if (!artist) {
          const raw = await this.httpGet(`https://api.tidal.com/v1/artists/${id}?countryCode=US`, {
            Authorization: `Bearer ${token}`,
            'User-Agent': 'Mozilla/5.0',
          });
          artist = JSON.parse(raw);
        }

        if (artist && artist.id) {
          const [albumsRaw, tracksRaw] = await Promise.all([
            this.httpGet(`https://api.tidal.com/v1/artists/${id}/albums?limit=20&countryCode=US`, {
              Authorization: `Bearer ${token}`,
              'User-Agent': 'Mozilla/5.0',
            }),
            this.httpGet(`https://api.tidal.com/v1/artists/${id}/toptracks?limit=20&countryCode=US`, {
              Authorization: `Bearer ${token}`,
              'User-Agent': 'Mozilla/5.0',
            }),
          ]);

          const albumsJson = JSON.parse(albumsRaw);
          const tracksJson = JSON.parse(tracksRaw);

          const hdHeaderUrl =
            (await this.fetchArtistHeaderImage(artist.name)) ||
            this.formatTidalImageUrl(artist.picture, '750x750');

          const artistObj: OnlineArtist = {
            id: artist.id,
            name: artist.name,
            avatarUrl: this.formatTidalImageUrl(artist.picture, '750x750'),
            headerUrl: hdHeaderUrl,
            bio: `${artist.name} is a renowned artist featured on Tidal and Monochrome.`,
          };

          const popularSongs: OnlineSong[] = [];
          if (Array.isArray(tracksJson.items)) {
            tracksJson.items.forEach((trk: any, idx: number) => {
              const coverUrl = this.formatTidalImageUrl(trk.album?.cover, '640x640');
              const songObj: OnlineSong = {
                id: trk.id,
                title: trk.title,
                artist: artist.name,
                trackNumber: trk.trackNumber || idx + 1,
                duration: trk.duration || 180,
                year: trk.album?.releaseDate ? trk.album.releaseDate.slice(0, 4) : 2026,
                album: {
                  id: trk.album?.id || trk.id,
                  title: trk.album?.title || trk.title,
                  coverPath: coverUrl,
                  artists: [artistObj],
                },
              };
              popularSongs.push(songObj);
              this.songCache.set(trk.id, songObj);
            });
          }

          const albums: any[] = [];
          if (Array.isArray(albumsJson.items)) {
            albumsJson.items.forEach((alb: any) => {
              const coverUrl = this.formatTidalImageUrl(alb.cover, '640x640');
              albums.push({
                id: alb.id,
                title: alb.title,
                coverPath: coverUrl,
                releaseDate: alb.releaseDate,
                duration: alb.duration,
                artists: [artistObj],
                songs: popularSongs.filter((s) => s.album.id === alb.id),
                _count: { songs: alb.numberOfTracks || 1 },
              });
            });
          }

          const fullArtistDetails = {
            ...artistObj,
            albums: albums.length > 0 ? albums : [
              {
                id: id * 10,
                title: 'Popular Tracks',
                coverPath: artistObj.avatarUrl,
                artists: [artistObj],
                songs: popularSongs,
                _count: { songs: popularSongs.length },
              },
            ],
          };

          this.artistCache.set(artist.id, fullArtistDetails);
          this.artistNameCache.set(artist.name.toLowerCase(), fullArtistDetails);
          return fullArtistDetails;
        }
      }
    } catch (e) {
      this.logger.warn(`Failed to fetch Tidal artist ${id}:`, e);
    }

    const cached = this.artistCache.get(id);
    if (cached) return cached;
    return null;
  }

  /**
   * Resolve a playable audio stream URL (Full-length audio, avoiding previews/trials)
   */
  async resolveStreamUrl(id: number): Promise<string | null> {
    const cached = this.streamUrlCache.get(id);
    if (cached) return cached;

    // 1. If it's directly a Kuwo song id from local or direct search
    if (id < 100000000) {
      try {
        const url = `http://antiserver.kuwo.cn/anti.s?type=convert_url&rid=${id}&format=mp3&response=url`;
        const directUrl = await this.httpGet(url, { 'User-Agent': 'okhttp/3.10.0' });
        if (directUrl && directUrl.startsWith('http') && !directUrl.includes('/nf/resource/') && !directUrl.includes('/pay3_v2/')) {
          this.streamUrlCache.set(id, directUrl.trim());
          return directUrl.trim();
        }
      } catch {}
    }

    // 2. Song lookup in cache
    // 2. Song lookup in cache or Tidal
    const song = await this.findSongById(id);
    if (!song) return null;

    const cleanTitle = song.title.replace(/\s*\(.*?\)/g, '').replace(/\s*\[.*?\]/g, '').replace(/feat\..*$/i, '').trim() || song.title;
    const cleanArtist = song.artist.replace(/\s*[,/&].*$/, '').trim() || song.artist;
    const targetDuration = song.duration || 180;

    let neteasePreviewCandidate: string | null = null;
    // 3. Priority 1: NetEase Cloud Music via Meting (provides full audio for pop, international, and Chinese tracks)
    try {
      let neteaseSearchUrl = `https://music.163.com/api/search/get/web?s=${encodeURIComponent(song.title + ' ' + cleanArtist)}&type=1&limit=5`;
      let neteaseRaw = await this.httpGet(neteaseSearchUrl, { 'User-Agent': 'Mozilla/5.0' });
      let neteaseJson = JSON.parse(neteaseRaw);
      if (!Array.isArray(neteaseJson?.result?.songs) || neteaseJson.result.songs.length === 0) {
        neteaseSearchUrl = `https://music.163.com/api/search/get/web?s=${encodeURIComponent(cleanTitle + ' ' + cleanArtist)}&type=1&limit=5`;
        neteaseRaw = await this.httpGet(neteaseSearchUrl, { 'User-Agent': 'Mozilla/5.0' });
        neteaseJson = JSON.parse(neteaseRaw);
      }

      if (Array.isArray(neteaseJson?.result?.songs) && neteaseJson.result.songs.length > 0) {
        // Sort by closest duration to targetDuration
        const sorted = [...neteaseJson.result.songs].sort((a: any, b: any) => {
          const diffA = Math.abs(a.duration / 1000 - targetDuration);
          const diffB = Math.abs(b.duration / 1000 - targetDuration);
          return diffA - diffB;
        });
        const match = sorted[0];
        if (match?.id) {
          const metingUrl = `https://api.injahow.cn/meting/?type=url&id=${match.id}`;
          // If the song is completely free on NetEase (fee === 0), it is a full length stream
          if (match.fee === 0) {
            this.streamUrlCache.set(id, metingUrl);
            this.logger.log(`Resolved full free stream via NetEase for "${song.title}" (${match.id}, duration: ${match.duration / 1000}s)`);
            return metingUrl;
          }
          // If VIP/paid, keep as preview candidate and try Kuwo first for a full track
          neteasePreviewCandidate = metingUrl;
        }
      }
    } catch (e) {
      this.logger.warn(`NetEase stream matching error for "${song.title}": ${e}`);
    }

    // 4. Priority 2: Kuwo full-track search (rejecting /nf/resource/ and /pay3_v2/ 5s trial clips)
    try {
      const kuwoQuery = `${cleanTitle} ${cleanArtist}`;
      const kuwoSearchUrl = `https://www.kuwo.cn/search/searchMusicBykeyWord?vipver=1&client=kt&ft=music&cluster=0&strategy=2012&encoding=utf8&rformat=json&mobi=1&issubtitle=1&show_copyright_off=1&pn=0&rn=8&all=${encodeURIComponent(kuwoQuery)}`;
      const raw = await this.httpGet(kuwoSearchUrl, { 'User-Agent': 'Mozilla/5.0' });
      const json = JSON.parse(raw);
      if (Array.isArray(json?.abslist)) {
        for (const cand of json.abslist) {
          const candDur = parseInt(cand.DURATION, 10) || 0;
          if (targetDuration > 60 && Math.abs(candDur - targetDuration) > 45) {
            continue; // Skip shortened edits / ringtones
          }
          const altId = cand.MUSICRID?.replace('MUSIC_', '') || cand.DC_TARGETID;
          if (altId) {
            const streamRes = await this.httpGet(`http://antiserver.kuwo.cn/anti.s?type=convert_url&rid=${altId}&format=mp3&response=url`, {
              'User-Agent': 'okhttp/3.10.0',
            });
            if (streamRes && streamRes.startsWith('http')) {
              const streamUrl = streamRes.trim();
              if (streamUrl.includes('/nf/resource/') || streamUrl.includes('/pay3_v2/')) {
                continue; // Skip trial clips
              }
              this.streamUrlCache.set(id, streamUrl);
              this.logger.log(`Resolved full stream via Kuwo for "${song.title}" (${altId})`);
              return streamUrl;
            }
          }
        }
      }
    } catch (e) {
      this.logger.warn(`Kuwo stream matching error for "${song.title}": ${e}`);
    }

    // 5. If Kuwo didn't have full track but NetEase had a preview/stream candidate, use it!
    if (neteasePreviewCandidate) {
      this.streamUrlCache.set(id, neteasePreviewCandidate);
      this.logger.log(`Resolved stream via NetEase preview candidate for "${song.title}"`);
      return neteasePreviewCandidate;
    }

    // 6. Fallback: Title-only NetEase search
    try {
      const neteaseSearchUrl = `https://music.163.com/api/search/get/web?s=${encodeURIComponent(cleanTitle)}&type=1&limit=3`;
      const neteaseRaw = await this.httpGet(neteaseSearchUrl, { 'User-Agent': 'Mozilla/5.0' });
      const neteaseJson = JSON.parse(neteaseRaw);
      if (neteaseJson?.result?.songs?.[0]?.id) {
        const metingUrl = `https://api.injahow.cn/meting/?type=url&id=${neteaseJson.result.songs[0].id}`;
        this.streamUrlCache.set(id, metingUrl);
        return metingUrl;
      }
    } catch {}

    return null;
  }

  /**
   * Fetch high-accuracy synced and bilingual lyrics (NetEase Cloud Music + LRCLIB + Kuwo)
   */
  async getLyrics(id: number): Promise<string> {
    const cached = this.lyricsCache.get(id);
    if (cached) return cached;

    const song = await this.findSongById(id);
    if (!song) return '';

    const cleanTitle = song.title.replace(/\s*\(.*?\)/g, '').replace(/\s*\[.*?\]/g, '').replace(/feat\..*$/i, '').trim() || song.title;
    const cleanArtist = song.artist.replace(/\s*[,/&].*$/, '').trim() || song.artist;

    // 1. Primary: NetEase Cloud Music (best bilingual synced lyrics in the industry)
    try {
      let searchUrl = `https://music.163.com/api/search/get/web?s=${encodeURIComponent(song.title + ' ' + cleanArtist)}&type=1&limit=3`;
      let raw = await this.httpGet(searchUrl, { 'User-Agent': 'Mozilla/5.0' });
      let json = JSON.parse(raw);
      if (!Array.isArray(json?.result?.songs) || json.result.songs.length === 0) {
        searchUrl = `https://music.163.com/api/search/get/web?s=${encodeURIComponent(cleanTitle + ' ' + cleanArtist)}&type=1&limit=3`;
        raw = await this.httpGet(searchUrl, { 'User-Agent': 'Mozilla/5.0' });
        json = JSON.parse(raw);
      }

      if (Array.isArray(json?.result?.songs) && json.result.songs.length > 0) {
        const neteaseId = json.result.songs[0].id;
        const lrcRaw = await this.httpGet(`https://music.163.com/api/song/lyric?os=pc&id=${neteaseId}&lv=-1&kv=-1&tv=-1`, {
          'User-Agent': 'Mozilla/5.0',
        });
        const lrcJson = JSON.parse(lrcRaw);
        const origLrc = lrcJson?.lrc?.lyric;
        const transLrc = lrcJson?.tlyric?.lyric;

        if (origLrc && origLrc.length > 20) {
          let finalLrc = origLrc;
          if (transLrc && transLrc.length > 20) {
            // Merge translation with original
            const transMap = new Map<string, string>();
            const timeRegex = /\[(\d{2}:\d{2}\.\d{2,3})\]/;
            for (const line of transLrc.split('\n')) {
              const match = line.match(timeRegex);
              if (match) {
                const text = line.replace(timeRegex, '').trim();
                if (text) transMap.set(match[1].slice(0, 5), text);
              }
            }

            finalLrc = origLrc
              .split('\n')
              .map((line: string) => {
                const match = line.match(timeRegex);
                if (match) {
                  const key = match[1].slice(0, 5);
                  const trans = transMap.get(key);
                  const text = line.replace(timeRegex, '').trim();
                  if (trans && text && !text.includes('作词') && !text.includes('作曲') && !text.startsWith('by:')) {
                    return `[${match[1]}] ${text} (${trans})`;
                  }
                }
                return line;
              })
              .join('\n');
          }

          this.lyricsCache.set(id, finalLrc);
          this.logger.log(`Fetched synced lyrics via NetEase for "${song.title}"`);
          return finalLrc;
        }
      }
    } catch (e) {
      this.logger.warn(`NetEase lyrics error for "${song.title}": ${e}`);
    }

    // 2. Secondary: LRCLIB (International synced lyrics)
    try {
      const lrcUrl = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(cleanArtist)}&track_name=${encodeURIComponent(cleanTitle)}`;
      const raw = await this.httpGet(lrcUrl, { 'User-Agent': 'Spotify-X/1.0' });
      const json = JSON.parse(raw);
      if (json.syncedLyrics) {
        this.lyricsCache.set(id, json.syncedLyrics);
        return json.syncedLyrics;
      }
      if (json.plainLyrics) {
        this.lyricsCache.set(id, json.plainLyrics);
        return json.plainLyrics;
      }
    } catch {}

    // 3. Tertiary: Kuwo H5 lyrics
    try {
      const kuwoSearchUrl = `https://www.kuwo.cn/search/searchMusicBykeyWord?vipver=1&client=kt&ft=music&cluster=0&strategy=2012&encoding=utf8&rformat=json&mobi=1&issubtitle=1&show_copyright_off=1&pn=0&rn=3&all=${encodeURIComponent(cleanTitle + ' ' + cleanArtist)}`;
      const rawSearch = await this.httpGet(kuwoSearchUrl, { 'User-Agent': 'Mozilla/5.0' });
      const jsonSearch = JSON.parse(rawSearch);
      const kuwoId = jsonSearch?.abslist?.[0]?.MUSICRID?.replace('MUSIC_', '') || jsonSearch?.abslist?.[0]?.DC_TARGETID;
      if (kuwoId) {
        const h5Url = `http://m.kuwo.cn/newh5/singles/songinfoandlrc?musicId=${kuwoId}`;
        const raw = await this.httpGet(h5Url, { 'User-Agent': 'Mozilla/5.0' });
        const json = JSON.parse(raw);
        if (json?.data?.lrclist) {
          const lrc = json.data.lrclist
            .map((item: any) => {
              const timeNum = parseFloat(item.time) || 0;
              const mins = Math.floor(timeNum / 60).toString().padStart(2, '0');
              const secs = (timeNum % 60).toFixed(2).padStart(5, '0');
              return `[${mins}:${secs}] ${item.lineLyric}`;
            })
            .join('\n');
          this.lyricsCache.set(id, lrc);
          return lrc;
        }
      }
    } catch {}

    return '';
  }

  /**
   * Get real-time curated trending albums for the home page (direct from https://hot.monochrome.tf/)
   */
  async getTrendingAlbums(take = 12): Promise<OnlineAlbum[]> {
    if (this.albumCache.size < take) {
      await this.loadMonochromeHot();
    }
    return Array.from(this.albumCache.values()).slice(0, take);
  }

  /**
   * Get random albums for the home page (from Monochrome hot albums)
   */
  async getRandomAlbums(take = 6): Promise<OnlineAlbum[]> {
    const all = await this.getTrendingAlbums(20);
    const shuffled = [...all].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, take);
  }

  /**
   * Get trending artists (from Monochrome hot albums and tracks)
   */
  async getTrendingArtists(take = 10): Promise<OnlineArtist[]> {
    if (this.artistCache.size < take) {
      await this.loadMonochromeHot();
    }
    return Array.from(this.artistCache.values()).slice(0, take);
  }

  private cleanString(str: string): string {
    if (!str) return '';
    return str
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
  }

  /**
   * Fetch image bytes from a remote URL (Tidal / Kuwo CDN)
   */
  async fetchRemoteImage(url: string): Promise<Buffer | null> {
    try {
      if (typeof fetch === 'function') {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        const res = await fetch(url, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
            'Referer': 'https://monochrome.tf/',
          },
        });
        clearTimeout(timeout);
        if (res.ok) {
          const ab = await res.arrayBuffer();
          return Buffer.from(ab);
        }
      }
    } catch {
      // Fall back to https module
    }

    return new Promise((resolve) => {
      const mod = url.startsWith('https') ? https : http;
      const req = mod.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return this.fetchRemoteImage(res.headers.location).then(resolve);
        }
        if (res.statusCode !== 200) {
          resolve(null);
          return;
        }
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      });
      req.on('error', () => resolve(null));
      req.setTimeout(8000, () => {
        req.destroy();
        resolve(null);
      });
    });
  }

  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }
}
