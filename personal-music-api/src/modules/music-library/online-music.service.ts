import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as http from 'http';
import * as https from 'https';

export interface OnlineArtist {
  id: number;
  name: string;
  avatarUrl?: string | null;
  headerUrl?: string | null;
  bio?: string | null;
  popularSongs?: OnlineSong[];
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
  publishTime?: number;
  year?: number;
  duration?: number;
  isComplete?: boolean;
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
export class OnlineMusicService implements OnModuleInit {
  private readonly logger = new Logger(OnlineMusicService.name);

  // In-memory cache for fast metadata lookup
  private songCache = new Map<number, OnlineSong>();
  private albumCache = new Map<number, OnlineAlbum>();
  private artistCache = new Map<number, OnlineArtist>();
  private artistNameCache = new Map<string, OnlineArtist>();
  private streamUrlCache = new Map<number, string>();
  private lyricsCache = new Map<number, string>();


  private chartLoaded = false;
  private lastChartLoadTime = 0;

  async onModuleInit() {
    // Automatically pre-load domestic music charts when server boots
    this.loadDomesticCharts().catch((err) =>
      this.logger.warn(`Failed to pre-load domestic charts on init: ${err.message}`),
    );
  }

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

  /**
   * Load domestic Chinese charts (NetEase Hot Songs Top 200)
   */
  async loadDomesticCharts(): Promise<void> {
    // Throttle refresh: at most once per 2 hours
    if (this.chartLoaded && Date.now() - this.lastChartLoadTime < 7200000) {
      return;
    }

    try {
      this.logger.log('Loading domestic charts (网易云音乐官方热歌榜 & 热门歌手榜)...');

      // 1. Dynamically fetch real-time Top Artists Leaderboard (热门歌手榜 TOP 50)
      try {
        const topArtistsRaw = await this.httpGet('https://music.163.com/api/artist/top?offset=0&limit=50', {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
          Referer: 'https://music.163.com',
        });
        const topArtistsJson = JSON.parse(topArtistsRaw);
        if (Array.isArray(topArtistsJson.artists)) {
          for (const ar of topArtistsJson.artists) {
            const avatar = (ar.img1v1Url || ar.picUrl || '').replace(/^http:\/\//i, 'https://');
            const header = (ar.picUrl || ar.img1v1Url || '').replace(/^http:\/\//i, 'https://');
            const artistObj: OnlineArtist = {
              id: ar.id,
              name: ar.name,
              avatarUrl: avatar,
              headerUrl: header,
              _count: { albums: ar.albumSize || 10, songs: ar.musicSize || 50 },
            };
            this.artistCache.set(ar.id, artistObj);
            this.artistNameCache.set(ar.name.toLowerCase(), artistObj);
          }
          this.logger.log(`Dynamically loaded ${topArtistsJson.artists.length} top artists from NetEase Leaderboard.`);
        }
      } catch (e: any) {
        this.logger.warn(`Failed to fetch dynamic top artists leaderboard: ${e.message}`);
      }

      // 2. Fetch NetEase Hot Songs Chart (id: 3778678)
      try {
        let rawHot = '';
        try {
          rawHot = await this.httpGet('https://music.163.com/api/playlist/detail?id=3778678', {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
            Referer: 'https://music.163.com',
          });
        } catch {
          rawHot = await this.httpGet('https://music-api.gdstudio.xyz/api.php?types=playlist&id=3778678');
        }

        const jsonHot = JSON.parse(rawHot);
        const tracksHot = jsonHot.result?.tracks || jsonHot.playlist?.tracks || [];
        const chartSongs = this.parsePlaylistTracks(tracksHot);

        if (chartSongs.length > 0) {
          const hotChartAlbum: OnlineAlbum = {
            id: 3778678,
            title: '华语热歌榜 TOP 50',
            coverPath: chartSongs[0]?.album.coverPath || null,
            artists: [{ id: 1, name: '热歌榜官方精选' }],
            songs: chartSongs.slice(0, 50),
            isComplete: true,
            _count: { songs: Math.min(50, chartSongs.length) },
          };
          this.albumCache.set(3778678, hotChartAlbum);

          const soarChartAlbum: OnlineAlbum = {
            id: 19723756,
            title: '流行飙升榜新势力',
            coverPath: chartSongs[1]?.album.coverPath || null,
            artists: [{ id: 2, name: '潮流飙升选辑' }],
            songs: chartSongs.slice(20, 60),
            isComplete: true,
            _count: { songs: Math.min(40, chartSongs.length - 20) },
          };
          this.albumCache.set(19723756, soarChartAlbum);
        }
      } catch (e: any) {
        this.logger.error(`Failed to load domestic charts: ${e.message}`);
      }

      // 3. Fetch Billboard Hot 100 Chart (id: 60198)
      try {
        const rawBb = await this.httpGet('https://music.163.com/api/playlist/detail?id=60198', {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
          Referer: 'https://music.163.com',
        });
        const jsonBb = JSON.parse(rawBb);
        const tracksBb = jsonBb.result?.tracks || jsonBb.playlist?.tracks || [];
        const bbSongs = this.parsePlaylistTracks(tracksBb);
        if (bbSongs.length > 0) {
          const bbAlbum: OnlineAlbum = {
            id: 60198,
            title: '美国公告榜',
            coverPath: (jsonBb.result?.coverImgUrl || jsonBb.playlist?.coverImgUrl || bbSongs[0]?.album.coverPath || '').replace(/^http:\/\//i, 'https://'),
            artists: [{ id: 3, name: 'Billboard官方精选' }],
            songs: bbSongs.slice(0, 50),
            isComplete: true,
            _count: { songs: Math.min(50, bbSongs.length) },
          };
          this.albumCache.set(60198, bbAlbum);
        }
      } catch (e: any) {
        this.logger.warn(`Failed to fetch Billboard chart: ${e.message}`);
      }

      // 4. Fetch Korea Korean Chart (id: 745956260)
      try {
        const rawKr = await this.httpGet('https://music.163.com/api/playlist/detail?id=745956260', {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
          Referer: 'https://music.163.com',
        });
        const jsonKr = JSON.parse(rawKr);
        const tracksKr = jsonKr.result?.tracks || jsonKr.playlist?.tracks || [];
        const krSongs = this.parsePlaylistTracks(tracksKr);
        if (krSongs.length > 0) {
          const krAlbum: OnlineAlbum = {
            id: 745956260,
            title: '韩国榜',
            coverPath: (jsonKr.result?.coverImgUrl || jsonKr.playlist?.coverImgUrl || krSongs[0]?.album.coverPath || '').replace(/^http:\/\//i, 'https://'),
            artists: [{ id: 4, name: '韩语流行音乐精选' }],
            songs: krSongs.slice(0, 50),
            isComplete: true,
            _count: { songs: Math.min(50, krSongs.length) },
          };
          this.albumCache.set(745956260, krAlbum);
        }
      } catch (e: any) {
        this.logger.warn(`Failed to fetch Korea chart: ${e.message}`);
      }

      this.chartLoaded = true;
      this.lastChartLoadTime = Date.now();
      this.logger.log(`Domestic and international charts loaded successfully! (cached size: ${this.albumCache.size})`);
    } catch (e: any) {
      this.logger.error(`Failed to load charts: ${e.message}`);
    }
  }

  public parsePlaylistTracks(tracks: any[]): OnlineSong[] {
    const chartSongs: OnlineSong[] = [];
    if (!Array.isArray(tracks)) return chartSongs;

    for (let i = 0; i < tracks.length; i++) {
      const t = tracks[i];
      const artistItem = t.artists?.[0] || t.ar?.[0];
      const artistName = artistItem?.name || '群星';
      const artistId = artistItem?.id || Math.abs(this.hashCode(artistName));
      const avatarUrl =
        (artistItem?.picUrl ||
          artistItem?.img1v1Url ||
          t.album?.picUrl ||
          t.al?.picUrl ||
          '').replace(/^http:\/\//i, 'https://') || null;

      let artistObj = this.artistCache.get(artistId);
      if (!artistObj) {
        artistObj = {
          id: artistId,
          name: artistName,
          avatarUrl,
          headerUrl: avatarUrl,
          _count: { albums: 1, songs: 1 },
        };
        this.artistCache.set(artistId, artistObj);
        this.artistNameCache.set(artistName.toLowerCase(), artistObj);
      }

      const albumItem = t.album || t.al;
      const albumId = albumItem?.id || t.id;
      const albumTitle = albumItem?.name || t.name;
      const coverUrl = (albumItem?.picUrl || '').replace(/^http:\/\//i, 'https://') || avatarUrl || null;

      const songObj: OnlineSong = {
        id: t.id,
        title: t.name,
        artist: artistName,
        trackNumber: i + 1,
        duration: Math.round((t.duration || t.dt || 180000) / 1000),
        year: albumItem?.publishTime ? new Date(albumItem.publishTime).getFullYear() : 2026,
        album: {
          id: albumId,
          title: albumTitle,
          coverPath: coverUrl,
          artists: [artistObj],
        },
      };

      this.songCache.set(t.id, songObj);
      chartSongs.push(songObj);

      if (!this.albumCache.has(albumId)) {
        this.albumCache.set(albumId, {
          id: albumId,
          title: albumTitle,
          coverPath: coverUrl,
          artists: [artistObj],
          songs: [songObj],
          _count: { songs: 1 },
        });
      } else {
        const existing = this.albumCache.get(albumId)!;
        if (existing.songs && !existing.songs.some((s) => s.id === t.id)) {
          existing.songs.push(songObj);
          existing._count.songs = existing.songs.length;
        }
      }
    }
    return chartSongs;
  }

  /**
   * Search for songs, albums, and artists online (Kuwo + NetEase domestic multi-provider)
   */
  async search(query: string, page = 0, limit = 20): Promise<OnlineSearchResult> {
    const trimmed = query.trim();
    if (!trimmed) {
      return { songs: [], albums: [], artists: [], playlists: [] };
    }

    const songs: OnlineSong[] = [];
    const albumMap = new Map<number, OnlineAlbum>();
    const artistMap = new Map<number, OnlineArtist>();

    // 1. Search NetEase CloudSearch for Artists (type=100) - provides 100% authentic artist names & real avatars
    try {
      const artistUrl = `https://music.163.com/api/cloudsearch/pc?s=${encodeURIComponent(trimmed)}&type=100&offset=0&limit=10`;
      const raw = await this.httpGet(artistUrl, {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Referer: 'https://music.163.com',
      });
      const json = JSON.parse(raw);
      const artistsList = json.result?.artists;
      if (Array.isArray(artistsList)) {
        for (const ar of artistsList) {
          const avatar = (ar.img1v1Url || ar.picUrl || '').replace(/^http:\/\//i, 'https://');
          const artistObj: OnlineArtist = {
            id: ar.id,
            name: ar.name,
            avatarUrl: avatar || null,
            headerUrl: avatar || null,
            _count: { albums: ar.albumSize || 1, songs: ar.musicSize || 1 },
          };
          artistMap.set(ar.id, artistObj);
          this.artistCache.set(ar.id, artistObj);
          const lowerName = ar.name.toLowerCase();
          if (!this.artistNameCache.has(lowerName)) {
            this.artistNameCache.set(lowerName, artistObj);
          }
        }
      }
    } catch (e: any) {
      this.logger.warn(`NetEase artist search failed for "${trimmed}": ${e.message}`);
    }

    // 2. Search NetEase CloudSearch for Songs (type=1) - high-precision track & authentic album info
    try {
      const neteaseUrl = `https://music.163.com/api/cloudsearch/pc?s=${encodeURIComponent(trimmed)}&type=1&offset=${page * limit}&limit=${limit}`;
      const raw = await this.httpGet(neteaseUrl, {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Referer: 'https://music.163.com',
      });
      const json = JSON.parse(raw);
      const neteaseSongs = json.result?.songs;

      if (Array.isArray(neteaseSongs)) {
        for (const s of neteaseSongs) {
          const primaryArtist = s.ar?.[0] || s.artists?.[0];
          const artistName = primaryArtist?.name || '未知歌手';
          const artistId = primaryArtist?.id || Math.abs(this.hashCode(artistName));

          if (songs.some((existing) => existing.title.toLowerCase() === s.name.toLowerCase() && existing.artist.toLowerCase() === artistName.toLowerCase())) {
            continue; // Deduplicate
          }

          const albumItem = s.al || s.album;
          const albumId = albumItem?.id || s.id;
          const albumTitle = albumItem?.name || s.name;
          const coverUrl = (albumItem?.picUrl || '').replace(/^http:\/\//i, 'https://') || null;

          let artistObj = artistMap.get(artistId) || this.artistCache.get(artistId);
          if (!artistObj) {
            artistObj = {
              id: artistId,
              name: artistName,
              avatarUrl: null,
              _count: { albums: 1, songs: 1 },
            };
            this.artistCache.set(artistId, artistObj);
            this.artistNameCache.set(artistName.toLowerCase(), artistObj);
          }

          const songObj: OnlineSong = {
            id: s.id,
            title: s.name,
            artist: artistName,
            trackNumber: null,
            duration: Math.round((s.dt || s.duration || 180000) / 1000),
            album: {
              id: albumId,
              title: albumTitle,
              coverPath: coverUrl,
              artists: [artistObj],
            },
          };

          songs.push(songObj);
          this.songCache.set(s.id, songObj);

          if (!albumMap.has(albumId)) {
            const alb: OnlineAlbum = {
              id: albumId,
              title: albumTitle,
              coverPath: coverUrl,
              artists: [artistObj],
              songs: [songObj],
              _count: { songs: 1 },
            };
            albumMap.set(albumId, alb);
            this.albumCache.set(albumId, alb);
          }
        }
      }
    } catch (e: any) {
      this.logger.warn(`NetEase song search failed for "${trimmed}": ${e.message}`);
    }

    // 3. Search NetEase CloudSearch for Albums (type=10) - real albums with authentic artwork
    try {
      const albumUrl = `https://music.163.com/api/cloudsearch/pc?s=${encodeURIComponent(trimmed)}&type=10&offset=0&limit=10`;
      const raw = await this.httpGet(albumUrl, {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Referer: 'https://music.163.com',
      });
      const json = JSON.parse(raw);
      const albumsList = json.result?.albums;

      if (Array.isArray(albumsList)) {
        for (const alb of albumsList) {
          if (albumMap.has(alb.id)) continue;
          const albCover = (alb.picUrl || alb.blurPicUrl || '').replace(/^http:\/\//i, 'https://') || null;
          const albArtistName = alb.artist?.name || alb.artists?.[0]?.name || '未知歌手';
          const albArtistId = alb.artist?.id || alb.artists?.[0]?.id || Math.abs(this.hashCode(albArtistName));
          const albArtistAvatar = (alb.artist?.picUrl || alb.artist?.img1v1Url || '').replace(/^http:\/\//i, 'https://') || null;

          let albArtist = artistMap.get(albArtistId) || this.artistCache.get(albArtistId);
          if (!albArtist) {
            albArtist = {
              id: albArtistId,
              name: albArtistName,
              avatarUrl: albArtistAvatar,
              _count: { albums: 1, songs: 1 },
            };
            this.artistCache.set(albArtistId, albArtist);
          }

          const albObj: OnlineAlbum = {
            id: alb.id,
            title: alb.name,
            coverPath: albCover,
            publishTime: alb.publishTime,
            year: alb.publishTime ? new Date(alb.publishTime).getFullYear() : 2026,
            artists: [albArtist],
            songs: [],
            _count: { songs: alb.size || 1 },
          };
          albumMap.set(alb.id, albObj);
          this.albumCache.set(alb.id, albObj);
        }
      }
    } catch (e: any) {
      this.logger.warn(`NetEase album search failed for "${trimmed}": ${e.message}`);
    }

    // 4. Supplementary search from Kuwo (if NetEase returned fewer results or to enrich library)
    if (songs.length < limit) {
      try {
        const kuwoLimit = limit - songs.length;
        const kuwoSearchUrl = `https://music-api.gdstudio.xyz/api.php?types=search&count=${kuwoLimit}&source=kuwo&pages=${page + 1}&name=${encodeURIComponent(trimmed)}`;
        const raw = await this.httpGet(kuwoSearchUrl);
        const items = JSON.parse(raw);

        if (Array.isArray(items)) {
          for (const item of items) {
            const artistName = item.artist?.[0] || '未知歌手';
            if (songs.some((existing) => existing.title.toLowerCase() === item.name.toLowerCase() && existing.artist.toLowerCase() === artistName.toLowerCase())) {
              continue; // Deduplicate
            }

            const songId = Number(item.id) || Math.abs(this.hashCode(item.name + artistName));
            const artistId = Math.abs(this.hashCode(artistName));
            const albumTitle = item.album || item.name;
            const albumId = Math.abs(this.hashCode(albumTitle));

            const coverUrl = item.pic_id
              ? `https://img1.kuwo.cn/star/albumcover/${item.pic_id}`
              : null;

            let artistObj = artistMap.get(artistId) || this.artistCache.get(artistId);
            if (!artistObj) {
              artistObj = {
                id: artistId,
                name: artistName,
                avatarUrl: null,
                _count: { albums: 1, songs: 1 },
              };
              this.artistCache.set(artistId, artistObj);
            }

            const songObj: OnlineSong = {
              id: songId,
              title: item.name,
              artist: artistName,
              trackNumber: null,
              duration: 210,
              album: {
                id: albumId,
                title: albumTitle,
                coverPath: coverUrl,
                artists: [artistObj],
              },
            };

            songs.push(songObj);
            this.songCache.set(songId, songObj);

            if (!albumMap.has(albumId)) {
              const alb: OnlineAlbum = {
                id: albumId,
                title: albumTitle,
                coverPath: coverUrl,
                artists: [artistObj],
                songs: [songObj],
                _count: { songs: 1 },
              };
              albumMap.set(albumId, alb);
              this.albumCache.set(albumId, alb);
            }
          }
        }
      } catch (e: any) {
        this.logger.warn(`Kuwo supplementary search failed for "${trimmed}": ${e.message}`);
      }
    }

    return {
      songs,
      albums: Array.from(albumMap.values()),
      artists: Array.from(artistMap.values()),
      playlists: [],
    };
  }

  /**
   * Find artist by name (fetches Top 50 hot songs and details)
   */
  async findArtistByName(name: string): Promise<any | null> {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const lower = trimmed.toLowerCase();

    // 1. If already cached with full albums, return cached
    const cached = this.artistNameCache.get(lower);
    if (cached && cached.albums && cached.albums.length > 0) {
      return cached;
    }

    try {
      // 2. Search NetEase Official API to resolve authentic top-ranked artist ID
      const searchUrl = `https://music.163.com/api/cloudsearch/pc?s=${encodeURIComponent(trimmed)}&type=100&offset=0&limit=5`;
      const raw = await this.httpGet(searchUrl, {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Referer: 'https://music.163.com/',
      });
      const json = JSON.parse(raw);
      const artistsList = json.result?.artists;
      if (Array.isArray(artistsList) && artistsList.length > 0) {
        // Pick exact match first, else top-ranked result
        const best = artistsList.find((a: any) => a.name?.toLowerCase() === lower) || artistsList[0];
        if (best && best.id) {
          const full = await this.findArtistById(best.id);
          if (full) {
            this.artistNameCache.set(lower, full);
            return full;
          }
        }
      }
    } catch (e: any) {
      this.logger.warn(`Failed to find artist by name "${trimmed}": ${e.message}`);
    }

    // 3. Fallback to cached stub if available
    if (cached?.id) {
      const full = await this.findArtistById(cached.id);
      if (full) return full;
    }

    if (cached) {
      return {
        ...cached,
        albums: cached.albums || [],
        popularSongs: cached.popularSongs || [],
      };
    }
    return null;
  }

  /**
   * Find artist by ID (fetches Top 50 hot songs and authentic real albums from NetEase)
   */
  async findArtistById(id: number, initialArtistData?: any): Promise<any | null> {
    try {
      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Referer: 'https://music.163.com/',
        Cookie: 'appver=2.7.1.198277; os=pc',
      };

      const raw = await this.httpGet(`https://music.163.com/api/artist/${id}`, headers);
      const json = JSON.parse(raw);

      if (json.artist) {
        const artist = json.artist;
        const avatar = (artist.img1v1Url || artist.picUrl || '').replace(/^http:\/\//i, 'https://');
        const header = (artist.picUrl || artist.img1v1Url || '').replace(/^http:\/\//i, 'https://');
        const artistObj: OnlineArtist = {
          id: artist.id,
          name: artist.name,
          avatarUrl: avatar,
          headerUrl: header,
          bio: artist.briefDesc || `${artist.name}，华语流行乐坛知名音乐人。`,
        };

        // 1. Parse Top 50 Popular Songs with their REAL original album information
        const hotSongs: OnlineSong[] = [];
        if (Array.isArray(json.hotSongs)) {
          json.hotSongs.slice(0, 50).forEach((s: any, idx: number) => {
            const albumItem = s.album || s.al;
            const albumId = albumItem?.id || artist.id;
            const albumTitle = albumItem?.name || `${artist.name} 歌曲`;
            const coverUrl = (albumItem?.picUrl || artist.picUrl || '').replace(/^http:\/\//i, 'https://');

            const songObj: OnlineSong = {
              id: s.id,
              title: s.name,
              artist: artist.name,
              trackNumber: idx + 1,
              duration: Math.round((s.duration || s.dt || 180000) / 1000),
              year: albumItem?.publishTime ? new Date(albumItem.publishTime).getFullYear() : 2026,
              album: {
                id: albumId,
                title: albumTitle,
                coverPath: coverUrl,
                artists: [artistObj],
              },
            };
            hotSongs.push(songObj);
            this.songCache.set(s.id, songObj);
          });
        }

        // 2. Fetch the artist's REAL albums and EPs/singles
        const realAlbums: (OnlineAlbum & { songs: OnlineSong[]; artists: OnlineArtist[] })[] = [];
        try {
          const albumsRaw = await this.httpGet(
            `https://music.163.com/api/artist/albums/${id}?offset=0&limit=50`,
            headers,
          );
          const albumsJson = JSON.parse(albumsRaw);
          if (Array.isArray(albumsJson.hotAlbums)) {
            for (const alb of albumsJson.hotAlbums) {
              const albCover = (alb.picUrl || artist.picUrl || '').replace(/^http:\/\//i, 'https://');
              const albSongs = hotSongs.filter((s) => s.album?.id === alb.id);
              const albObj: OnlineAlbum & { songs: OnlineSong[]; artists: OnlineArtist[] } = {
                id: alb.id,
                title: alb.name,
                coverPath: albCover,
                publishTime: alb.publishTime,
                year: alb.publishTime ? new Date(alb.publishTime).getFullYear() : 2026,
                artists: [artistObj],
                songs: albSongs,
                _count: { songs: alb.size || Math.max(1, albSongs.length) },
              };
              this.albumCache.set(alb.id, albObj);
              realAlbums.push(albObj);
            }
          }
        } catch (e: any) {
          this.logger.warn(`Failed to fetch real albums for artist ${id}: ${e.message}`);
        }

        // Fallback: if artist albums endpoint returned none, group distinct real albums from hot songs
        if (realAlbums.length === 0 && hotSongs.length > 0) {
          const albumMap = new Map<number, OnlineSong[]>();
          for (const s of hotSongs) {
            const aId = s.album.id;
            if (!albumMap.has(aId)) albumMap.set(aId, []);
            albumMap.get(aId)!.push(s);
          }
          for (const [aId, sList] of albumMap.entries()) {
            const first = sList[0];
            const albObj: OnlineAlbum & { songs: OnlineSong[]; artists: OnlineArtist[] } = {
              id: aId,
              title: first.album.title,
              coverPath: first.album.coverPath,
              artists: [artistObj],
              songs: sList,
              _count: { songs: sList.length },
            };
            this.albumCache.set(aId, albObj);
            realAlbums.push(albObj);
          }
        }

        const fullArtistDetails = {
          ...artistObj,
          popularSongs: hotSongs,
          albums: realAlbums,
        };

        this.artistCache.set(artist.id, fullArtistDetails);
        const lowerName = artist.name.toLowerCase();
        if (!this.artistNameCache.has(lowerName)) {
          this.artistNameCache.set(lowerName, fullArtistDetails);
        }
        return fullArtistDetails;
      }
    } catch (e: any) {
      this.logger.warn(`Failed to fetch artist ${id}: ${e.message}`);
    }

    const cached = this.artistCache.get(id);
    if (cached) {
      if (cached.name && (!cached.albums || cached.albums.length === 0)) {
        const byName = await this.findArtistByName(cached.name);
        if (byName) return byName;
      }
      return cached;
    }
    return null;
  }

  /**
   * Find album by ID (fetches authentic complete tracklist via NetEase API v1)
   */
  async findAlbumById(id: number): Promise<OnlineAlbum | null> {
    const cached = this.albumCache.get(id);
    if (cached && (cached.isComplete || (cached.songs && cached.songs.length > 0))) {
      return cached;
    }

    // Direct playlist charts fallback (Hot, Soar, Billboard, Korea)
    const chartMap: Record<number, { title: string; curator: string; playlistId: number; sliceStart?: number; sliceEnd?: number }> = {
      3778678: { title: '华语热歌榜 TOP 50', curator: '热歌榜官方精选', playlistId: 3778678, sliceStart: 0, sliceEnd: 50 },
      19723756: { title: '流行飙升榜新势力', curator: '潮流飙升选辑', playlistId: 3778678, sliceStart: 20, sliceEnd: 60 },
      60198: { title: '美国公告榜', curator: 'Billboard官方精选', playlistId: 60198, sliceStart: 0, sliceEnd: 50 },
      745956260: { title: '韩国榜', curator: '韩语流行音乐精选', playlistId: 745956260, sliceStart: 0, sliceEnd: 50 },
    };

    if (chartMap[id]) {
      try {
        const info = chartMap[id];
        const raw = await this.httpGet(`https://music.163.com/api/playlist/detail?id=${info.playlistId}`, {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
          Referer: 'https://music.163.com',
        });
        const json = JSON.parse(raw);
        const tracks = json.result?.tracks || json.playlist?.tracks || [];
        const chartSongs = this.parsePlaylistTracks(tracks);
        const songs = chartSongs.slice(info.sliceStart || 0, info.sliceEnd || 50);
        const coverImg = (json.result?.coverImgUrl || json.playlist?.coverImgUrl || songs[0]?.album?.coverPath || '').replace(/^http:\/\//i, 'https://');
        const albumObj: OnlineAlbum = {
          id,
          title: info.title,
          coverPath: coverImg || null,
          artists: [{ id, name: info.curator }],
          songs,
          isComplete: true,
          _count: { songs: songs.length },
        };
        this.albumCache.set(id, albumObj);
        return albumObj;
      } catch (e: any) {
        this.logger.error(`Failed to fetch chart playlist ${id}: ${e.message}`);
      }
    }

    try {
      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Referer: 'https://music.163.com/',
        Cookie: 'appver=2.7.1.198277; os=pc',
      };
      const raw = await this.httpGet(`https://music.163.com/api/v1/album/${id}`, headers);
      const json = JSON.parse(raw);

      if (json.album && Array.isArray(json.songs)) {
        const alb = json.album;
        const artistObj: OnlineArtist = {
          id: alb.artist?.id || alb.artists?.[0]?.id || 1,
          name: alb.artist?.name || alb.artists?.[0]?.name || '华语歌手',
          avatarUrl: (alb.artist?.picUrl || alb.picUrl || '').replace(/^http:\/\//i, 'https://'),
        };
        const coverUrl = (alb.picUrl || '').replace(/^http:\/\//i, 'https://');

        const songs: OnlineSong[] = json.songs.map((s: any, idx: number) => ({
          id: s.id,
          title: s.name,
          artist: s.ar?.[0]?.name || s.artists?.[0]?.name || artistObj.name,
          trackNumber: idx + 1,
          duration: Math.round((s.dt || s.duration || 180000) / 1000),
          year: alb.publishTime ? new Date(alb.publishTime).getFullYear() : 2026,
          album: {
            id: alb.id,
            title: alb.name,
            coverPath: coverUrl,
            artists: [artistObj],
          },
        }));

        songs.forEach((s) => this.songCache.set(s.id, s));

        const albumObj: OnlineAlbum = {
          id: alb.id,
          title: alb.name,
          coverPath: coverUrl,
          publishTime: alb.publishTime,
          year: alb.publishTime ? new Date(alb.publishTime).getFullYear() : 2026,
          artists: [artistObj],
          songs,
          isComplete: true,
          _count: { songs: songs.length },
        };

        this.albumCache.set(alb.id, albumObj);
        return albumObj;
      }
    } catch { }

    return cached || null;
  }

  /**
   * Find song by ID
   */
  async findSongById(id: number): Promise<OnlineSong | null> {
    const cached = this.songCache.get(id);
    if (cached) return cached;

    try {
      const raw = await this.httpGet(`https://music.163.com/api/song/detail?id=${id}&ids=%5B${id}%5D`, {
        'User-Agent': 'Mozilla/5.0',
        Referer: 'https://music.163.com',
      });
      const json = JSON.parse(raw);
      const songData = json.songs?.[0];

      if (songData) {
        const artistName = songData.artists?.[0]?.name || '未知歌手';
        const artistId = songData.artists?.[0]?.id || 1;
        const albumItem = songData.album;
        const coverUrl = albumItem?.picUrl;

        const songObj: OnlineSong = {
          id: songData.id,
          title: songData.name,
          artist: artistName,
          trackNumber: 1,
          duration: Math.round((songData.duration || 180000) / 1000),
          album: {
            id: albumItem?.id || songData.id,
            title: albumItem?.name || songData.name,
            coverPath: coverUrl,
            artists: [{ id: artistId, name: artistName, avatarUrl: coverUrl }],
          },
        };

        this.songCache.set(id, songObj);
        return songObj;
      }
    } catch { }

    return null;
  }

  /**
   * Resolve audio stream URL with multi-source fallback (NetEase -> Kuwo -> GDStudio -> HaiTang)
   */
  async resolveStreamUrl(id: number): Promise<string | null> {
    const cached = this.streamUrlCache.get(id);
    if (cached) return cached;

    // 1. If it's a Kuwo song ID (usually numeric under 100,000,000)
    if (id < 100000000) {
      try {
        const kuwoDirect = await this.httpGet(
          `http://antiserver.kuwo.cn/anti.s?type=convert_url&rid=${id}&format=mp3&response=url`,
          { 'User-Agent': 'okhttp/3.10.0' },
        );
        if (kuwoDirect && kuwoDirect.startsWith('http') && !kuwoDirect.includes('/nf/resource/')) {
          this.streamUrlCache.set(id, kuwoDirect.trim());
          return kuwoDirect.trim();
        }
      } catch { }
    }

    // 2. Try NetEase Official direct stream outer URL
    try {
      const neteaseOuter = `https://music.163.com/song/media/outer/url?id=${id}.mp3`;
      if (typeof fetch === 'function') {
        const headRes = await fetch(neteaseOuter, { method: 'HEAD', redirect: 'follow' });
        const ct = headRes.headers.get('content-type') || '';
        const cl = parseInt(headRes.headers.get('content-length') || '0', 10);
        // Valid if it returned audio with actual byte size (> 50KB)
        if (headRes.ok && (ct.includes('audio') || ct.includes('octet-stream')) && (cl === 0 || cl > 50000)) {
          this.streamUrlCache.set(id, headRes.url || neteaseOuter);
          return headRes.url || neteaseOuter;
        }
      }
    } catch { }

    // 3. Try GDStudio NetEase direct resolver
    try {
      const gdRes = await this.httpGet(`https://music-api.gdstudio.xyz/api.php?types=url&id=${id}&source=netease`);
      const gdJson = JSON.parse(gdRes);
      if (gdJson.url && gdJson.url.startsWith('http')) {
        this.streamUrlCache.set(id, gdJson.url);
        return gdJson.url;
      }
    } catch { }

    // 4. Multi-link Cross-Platform Fallback:
    // Lookup the song's title & artist, then resolve via Kuwo CDN
    const song = await this.findSongById(id);
    if (song) {
      const cleanTitle = song.title.replace(/\s*\(.*?\)/g, '').replace(/\s*\[.*?\]/g, '').trim() || song.title;
      const cleanArtist = song.artist.replace(/\s*[,/&].*$/, '').trim() || song.artist;
      const searchQuery = `${cleanTitle} ${cleanArtist}`;

      try {
        const kwSearch = await this.httpGet(
          `https://music-api.gdstudio.xyz/api.php?types=search&count=2&source=kuwo&pages=1&name=${encodeURIComponent(searchQuery)}`,
        );
        const kwJson = JSON.parse(kwSearch);
        const kwSong = kwJson?.[0];

        if (kwSong && kwSong.id) {
          // Try Kuwo native anti.s converter
          const playUrl = await this.httpGet(
            `http://antiserver.kuwo.cn/anti.s?type=convert_url&rid=${kwSong.id}&format=mp3&response=url`,
            { 'User-Agent': 'okhttp/3.10.0' },
          );
          if (playUrl && playUrl.startsWith('http')) {
            this.streamUrlCache.set(id, playUrl.trim());
            return playUrl.trim();
          }

          // Try backup HaiTang endpoint (like in qdy)
          const backupUrl = `https://musicapi.haitangw.net/music/kw.php?type=mp3&id=${kwSong.id}&level=lossless`;
          this.streamUrlCache.set(id, backupUrl);
          return backupUrl;
        }
      } catch (e: any) {
        this.logger.warn(`Kuwo cross-match failed for "${searchQuery}": ${e.message}`);
      }
    }

    return null;
  }

  /**
   * Get synchronized LRC lyrics
   */
  async getLyrics(id: number): Promise<string> {
    const cached = this.lyricsCache.get(id);
    if (cached) return cached;

    // 1. Try NetEase Official Lyric API
    try {
      const raw = await this.httpGet(`https://music.163.com/api/song/lyric?id=${id}&lv=1&kv=1&tv=-1`, {
        'User-Agent': 'Mozilla/5.0',
        Referer: 'https://music.163.com',
      });
      const json = JSON.parse(raw);
      if (json.lrc?.lyric) {
        this.lyricsCache.set(id, json.lrc.lyric);
        return json.lrc.lyric;
      }
    } catch { }

    // 2. Try GDStudio NetEase
    try {
      const raw = await this.httpGet(`https://music-api.gdstudio.xyz/api.php?types=lyric&id=${id}&source=netease`);
      const json = JSON.parse(raw);
      if (json.lyric) {
        this.lyricsCache.set(id, json.lyric);
        return json.lyric;
      }
    } catch { }

    // 3. Try Kuwo Lyric
    try {
      const raw = await this.httpGet(`https://music-api.gdstudio.xyz/api.php?types=lyric&id=${id}&source=kuwo`);
      const json = JSON.parse(raw);
      if (json.lyric) {
        this.lyricsCache.set(id, json.lyric);
        return json.lyric;
      }
    } catch { }

    return '';
  }

  /**
   * Get trending albums for the home page (NetEase hot charts & collections)
   */
  async getTrendingAlbums(take = 12): Promise<OnlineAlbum[]> {
    if (this.albumCache.size < take) {
      await this.loadDomesticCharts();
    }
    return Array.from(this.albumCache.values()).slice(0, take);
  }

  /**
   * Get random/featured albums for top recommendations
   */
  async getRandomAlbums(take = 6): Promise<OnlineAlbum[]> {
    const all = await this.getTrendingAlbums(20);
    const shuffled = [...all].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, take);
  }

  /**
   * Get trending artists for sidebar and artist listings
   */
  async getTrendingArtists(take = 25): Promise<OnlineArtist[]> {
    if (this.artistCache.size < take) {
      await this.loadDomesticCharts();
    }
    return Array.from(this.artistCache.values()).slice(0, take);
  }

  /**
   * Fetch image bytes from a remote URL
   */
  async fetchRemoteImage(url: string): Promise<Buffer | null> {
    try {
      if (typeof fetch === 'function') {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        const res = await fetch(url, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            Referer: 'https://music.163.com',
          },
        });
        clearTimeout(timeout);
        if (res.ok) {
          const ab = await res.arrayBuffer();
          return Buffer.from(ab);
        }
      }
    } catch { }

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
