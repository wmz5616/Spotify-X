import { Injectable, Logger } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';
import { PrismaService } from 'src/prisma/prisma.service';
import * as mm from 'music-metadata';
import { ensureDir, ensureSymlink, pathExists, remove, copy } from 'fs-extra';
import { Subject, Observable } from 'rxjs';

export interface ScanProgress {
  percentage: number;
  message: string;
  current?: number;
  total?: number;
}

interface ParsedInfo {
  artist: string;
  album: string;
  title: string;
  trackNumber?: number;
  imageBuffer?: Buffer;
  duration?: number;
  filePath: string;
  embeddedLyrics?: string;
}

@Injectable()
export class MusicLibraryService {
  private readonly logger = new Logger(MusicLibraryService.name);
  private progressSubject = new Subject<ScanProgress>();

  constructor(private prisma: PrismaService) { }

  getProgressStream(): Observable<ScanProgress> {
    return this.progressSubject.asObservable();
  }

  async scanAndSaveMusic(directory: string, forceUpdate: boolean = false) {
    this.logger.log(`Starting optimized scan... (Force: ${forceUpdate})`);
    const startTime = Date.now();

    this.progressSubject.next({ percentage: 0, message: 'Initializing...' });
    const coversDir = path.join(process.cwd(), 'public', 'covers');
    const artistImagesDir = path.join(process.cwd(), 'public', 'artist-images');
    await ensureDir(coversDir);
    await ensureDir(artistImagesDir);

    try {
      const dirents = await fs.readdir(directory, { withFileTypes: true });
      for (const dirent of dirents) {
        if (dirent.isDirectory()) {
          const artistName = this.sanitizeString(dirent.name);
          if (!artistName) continue;

          await this.prisma.$transaction(async (tx) => {
            const artist = await tx.artist.upsert({
              where: { name: artistName },
              create: { name: artistName },
              update: {},
            });
            const artistPath = path.join(directory, dirent.name);
            await this.processArtistImages(
              artist.id,
              artistPath,
              artistImagesDir,
              tx,
            );
          });
        }
      }
    } catch (e) {
      this.logger.warn(`Error scanning top-level directories: ${e}`);
    }

    const filePaths = await this.getAudioFilePaths(directory);
    const totalFiles = filePaths.length;
    this.logger.log(
      `Found ${totalFiles} audio files. Starting batch processing...`,
    );

    const BATCH_SIZE = 50;
    let processedCount = 0;

    for (let i = 0; i < totalFiles; i += BATCH_SIZE) {
      const batchPaths = filePaths.slice(i, i + BATCH_SIZE);

      const parsedBatch = await Promise.all(
        batchPaths.map(async (filePath) => {
          try {
            return await this.extractMetadata(filePath, directory);
          } catch (e) {
            this.logger.warn(`Failed to parse ${filePath}: ${e}`);
            return null;
          }
        }),
      );

      const validInfos = parsedBatch.filter(
        (info): info is ParsedInfo => info !== null,
      );

      if (validInfos.length > 0) {
        await this.saveBatch(
          validInfos,
          coversDir,
          artistImagesDir,
          forceUpdate,
        );
      }

      processedCount += batchPaths.length;
      const percentage = Math.round((processedCount / totalFiles) * 80) + 10;
      this.progressSubject.next({
        percentage,
        message: `Processing: ${processedCount}/${totalFiles}`,
        current: processedCount,
        total: totalFiles,
      });
    }

    this.progressSubject.next({
      percentage: 95,
      message: 'Cleaning up library...',
    });
    const cacheDir = path.join(process.cwd(), 'public', 'cache', 'covers');
    await this.cleanupOrphanedRecords(filePaths, coversDir, artistImagesDir, cacheDir);

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    this.logger.log(`Scan complete in ${duration}s.`);
    this.progressSubject.next({
      percentage: 100,
      message: 'Done!',
      current: totalFiles,
      total: totalFiles,
    });
  }

  private async extractMetadata(
    filePath: string,
    rootDir: string,
  ): Promise<ParsedInfo | null> {
    const relativePath = path.relative(rootDir, filePath);
    const parts = relativePath.split(path.sep);
    if (parts.length < 3) return null;

    let artistName = this.sanitizeString(parts[0]);
    let albumTitle = this.sanitizeString(parts[1]);
    if (!artistName || !albumTitle) return null;

    const fileName = path.basename(filePath);
    const filenameMatch = fileName.match(/^(.+?)\s+-\s+(.+)\.[^.]+$/);

    let title = path.basename(filePath, path.extname(filePath));
    let isFilenameParsed = false;

    if (filenameMatch) {
      const extractedTitle = this.sanitizeString(filenameMatch[2]);

      if (extractedTitle) {
        title = extractedTitle;
        isFilenameParsed = true;
      }
    }

    if (!isFilenameParsed) {
      title = title.replace(/^\d+\s*[-.]?\s*/, '');
    }

    let trackNumber: number | undefined;
    let duration: number | undefined;
    let imageBuffer: Buffer | undefined;
    let embeddedLyrics: string | undefined;

    try {
      const metadata = await mm.parseFile(filePath, { skipCovers: false });
      trackNumber = metadata.common.track.no ?? undefined;
      duration = metadata.format.duration;

      if (!isFilenameParsed) {
        title =
          this.sanitizeString(metadata.common.title) ||
          this.sanitizeString(title);
      }

      if (metadata.common.picture && metadata.common.picture.length > 0) {
        imageBuffer = Buffer.from(metadata.common.picture[0].data);
      }

      if (metadata.common.lyrics && metadata.common.lyrics.length > 0) {
        const lyricEntry = metadata.common.lyrics[0];
        embeddedLyrics =
          typeof lyricEntry === 'string' ? lyricEntry : lyricEntry.text;
      }
    } catch {
    }

    return {
      artist: artistName,
      album: albumTitle,
      title: isFilenameParsed ? title : this.cleanTitle(title, artistName),
      trackNumber,
      duration,
      imageBuffer,
      filePath,
      embeddedLyrics,
    };
  }

  private cleanTitle(title: string, artistName: string): string {
    if (!title || !artistName) return title;

    const regex = /^(.+?)\s*[-_]\s*(.+)$/;
    const match = title.match(regex);

    if (match) {
      const prefix = match[1].toLowerCase();
      const cleanArtist = artistName.toLowerCase();
      const potentialTitle = match[2];

      if (prefix.includes(cleanArtist) || cleanArtist.includes(prefix)) {
        return potentialTitle;
      }
    }

    return title;
  }

  private async saveBatch(
    infos: ParsedInfo[],
    coversDir: string,
    artistImagesDir: string,
    forceUpdate: boolean,
  ) {
    await this.prisma.$transaction(
      async (tx) => {
        for (const info of infos) {
          const artist = await tx.artist.upsert({
            where: { name: info.artist },
            create: { name: info.artist },
            update: {},
          });

          const albumUniqueId = `${info.album}___${info.artist}`;
          const album = await tx.album.upsert({
            where: { uniqueId: albumUniqueId },
            create: {
              title: info.album,
              uniqueId: albumUniqueId,
              artists: { connect: { id: artist.id } },
            },
            update: {
              artists: { connect: { id: artist.id } },
            },
          });

          if (!album.coverPath || forceUpdate) {
            const albumDir = path.dirname(info.filePath);
            await this.processAlbumCover(
              album.id,
              albumDir,
              coversDir,
              info.imageBuffer,
              tx,
            );
          }

          const lrcPath = info.filePath.replace(/\.[^/.]+$/, '.lrc');
          let finalLyrics: string | null = null;
          try {
            if (await pathExists(lrcPath)) {
              finalLyrics = await fs.readFile(lrcPath, 'utf-8');
            } else if (info.embeddedLyrics) {
              finalLyrics = info.embeddedLyrics;
            }
          } catch {
          }

          await tx.song.upsert({
            where: { path: info.filePath },
            update: {
              title: info.title,
              trackNumber: info.trackNumber,
              duration: info.duration,
              albumId: album.id,
              ...(finalLyrics ? { lyrics: finalLyrics } : {}),
            },
            create: {
              path: info.filePath,
              title: info.title,
              trackNumber: info.trackNumber,
              duration: info.duration,
              albumId: album.id,
              lyrics: finalLyrics,
            },
          });
        }
      },
      {
        timeout: 20000,
      },
    );
  }

  private async processAlbumCover(
    albumId: number,
    albumDir: string,
    coversDir: string,
    buffer: Buffer | undefined,
    tx: any,
  ) {
    let coverPathForDb: string | null = null;

    const folderCover = await this.findFolderCover(albumDir);
    if (folderCover) {
      const ext = path.extname(folderCover);
      const targetName = `${albumId}${ext}`;
      const targetPath = path.join(coversDir, targetName);
      if (await this.safeLinkOrCopy(folderCover, targetPath)) {
        coverPathForDb = `/covers/${targetName}`;
      }
    }

    if (!coverPathForDb && buffer) {
      const targetName = `${albumId}.jpg`;
      const targetPath = path.join(coversDir, targetName);
      try {
        await fs.writeFile(targetPath, buffer);
        coverPathForDb = `/covers/${targetName}`;
      } catch (e) {
        this.logger.warn(`Failed to write embedded cover for album ${albumId}`);
      }
    }

    if (coverPathForDb) {
      await tx.album.update({
        where: { id: albumId },
        data: { coverPath: coverPathForDb },
      });
    }
  }

  private async safeLinkOrCopy(src: string, dest: string): Promise<boolean> {
    try {
      if (await pathExists(dest)) await remove(dest);
      await ensureSymlink(src, dest);
      return true;
    } catch (e) {
      try {
        await fs.link(src, dest);
        return true;
      } catch (e2) {
        try {
          await copy(src, dest, { overwrite: true });
          return true;
        } catch (copyErr) {
          return false;
        }
      }
    }
  }

  private async findFolderCover(albumPath: string): Promise<string | null> {
    try {
      const files = await fs.readdir(albumPath);
      const candidates = ['cover.jpg', 'cover.png', 'folder.jpg', 'folder.png'];
      for (const f of files) {
        if (candidates.includes(f.toLowerCase()))
          return path.join(albumPath, f);
      }
    } catch {
      return null;
    }
    return null;
  }

  private async processArtistImages(
    artistId: number,
    artistDir: string,
    targetDir: string,
    tx: any,
  ) {
    const avatarCandidates = [
      'avatar.jpg',
      'avatar.png',
      'artist.jpg',
      'artist.png',
    ];
    const headerCandidates = [
      'header.jpg',
      'header.png',
      'banner.jpg',
      'banner.png',
      'background.jpg',
      'background.png',
    ];

    let avatarFound: string | null = null;
    let headerFound: string | null = null;

    try {
      const files = await fs.readdir(artistDir);
      for (const f of files) {
        const lower = f.toLowerCase();
        if (!avatarFound && avatarCandidates.includes(lower)) {
          avatarFound = path.join(artistDir, f);
        }
        if (!headerFound && headerCandidates.includes(lower)) {
          headerFound = path.join(artistDir, f);
        }
      }
    } catch {
      return;
    }

    const updateData: Record<string, string> = {};

    if (avatarFound) {
      const ext = path.extname(avatarFound);
      const targetName = `${artistId}-avatar${ext}`;
      const target = path.join(targetDir, targetName);
      if (await this.safeLinkOrCopy(avatarFound, target)) {
        updateData.avatarUrl = `/artist-images/${targetName}`;
      }
    }

    if (headerFound) {
      const ext = path.extname(headerFound);
      const targetName = `${artistId}-header${ext}`;
      const target = path.join(targetDir, targetName);
      if (await this.safeLinkOrCopy(headerFound, target)) {
        updateData.headerUrl = `/artist-images/${targetName}`;
      }
    }

    if (Object.keys(updateData).length > 0) {
      await tx.artist
        .update({
          where: { id: artistId },
          data: updateData,
        })
        .catch(() => { });
    }
  }

  private async cleanupOrphanedRecords(
    currentValidPaths: string[],
    coversDir: string,
    artistImagesDir: string,
    cacheDir?: string,
  ) {
    const validPathsSet = new Set(currentValidPaths);
    const allSongs = await this.prisma.song.findMany({
      select: { id: true, path: true },
    });
    const songIdsToDelete = allSongs
      .filter((s) => !validPathsSet.has(s.path))
      .map((s) => s.id);

    if (songIdsToDelete.length > 0) {
      this.logger.log(`Deleting ${songIdsToDelete.length} orphaned songs...`);
      await this.prisma.song.deleteMany({
        where: { id: { in: songIdsToDelete } },
      });
    }

    const emptyAlbums = await this.prisma.album.findMany({
      where: { songs: { none: {} } },
      select: { id: true },
    });
    if (emptyAlbums.length > 0) {
      await this.prisma.album.deleteMany({
        where: { id: { in: emptyAlbums.map((a) => a.id) } },
      });
    }

    const emptyArtists = await this.prisma.artist.findMany({
      where: {
        albums: { none: {} },
        avatarUrl: null,
        headerUrl: null,
      },
      select: { id: true },
    });
    if (emptyArtists.length > 0) {
      await this.prisma.artist.deleteMany({
        where: { id: { in: emptyArtists.map((a) => a.id) } },
      });
    }

    try {
      const allAlbums = await this.prisma.album.findMany({
        select: { coverPath: true },
      });
      const validCovers = new Set(
        allAlbums
          .map((a) => a.coverPath)
          .filter((p): p is string => !!p)
          .map((p) => path.basename(p)),
      );

      if (await pathExists(coversDir)) {
        const files = await fs.readdir(coversDir);
        for (const file of files) {
          if (!validCovers.has(file) && file !== 'placeholder.jpg') {
            await remove(path.join(coversDir, file));
          }
        }
      }

      const allArtists = await this.prisma.artist.findMany({
        select: { avatarUrl: true, headerUrl: true },
      });

      const validImages = new Set<string>();
      allArtists.forEach((a) => {
        if (a.avatarUrl) validImages.add(path.basename(a.avatarUrl));
        if (a.headerUrl) validImages.add(path.basename(a.headerUrl));
      });

      if (await pathExists(artistImagesDir)) {
        const files = await fs.readdir(artistImagesDir);
        for (const file of files) {
          if (!validImages.has(file)) {
            await remove(path.join(artistImagesDir, file));
          }
        }
      }

      if (cacheDir && (await pathExists(cacheDir))) {
        this.logger.log('Cleaning up processed covers cache...');
        await remove(cacheDir);
        await ensureDir(cacheDir);
      }
    } catch (e) {
      this.logger.warn(`Cleanup files error: ${e}`);
    }
  }

  async search(query: string) {
    if (!query || !query.trim()) return { artists: [], albums: [], songs: [] };
    const q = query.trim();

    const [artists, albums, songs] = await Promise.all([
      this.prisma.artist.findMany({
        where: { name: { contains: q } },
        take: 5,
        include: { albums: { take: 1 } },
      }),
      this.prisma.album.findMany({
        where: { title: { contains: q } },
        take: 5,
        include: { artists: true },
      }),
      this.prisma.song.findMany({
        where: { title: { contains: q } },
        take: 10,
        select: {
          id: true,
          title: true,
          trackNumber: true,
          duration: true,
          albumId: true,
          lyrics: true,
          album: { include: { artists: true } },
        },
      }),
    ]);
    return { artists, albums, songs };
  }

  async getAlbumArtBuffer(id: number): Promise<Buffer | null> {
    const album = await this.prisma.album.findUnique({
      where: { id },
      select: { coverPath: true },
    });
    if (!album?.coverPath) return null;
    const fullPath = path.join(
      process.cwd(),
      'public',
      album.coverPath.startsWith('/')
        ? album.coverPath.slice(1)
        : album.coverPath,
    );
    try {
      return await fs.readFile(fullPath);
    } catch {
      return null;
    }
  }

  async getAudioFilePaths(dir: string): Promise<string[]> {
    const files: string[] = [];
    const stack: string[] = [path.resolve(dir)];
    const visited = new Set<string>();

    while (stack.length > 0) {
      const currentPath = stack.pop()!;
      try {
        const realPath = await fs.realpath(currentPath);
        if (visited.has(realPath)) continue;
        visited.add(realPath);

        const dirents = await fs.readdir(realPath, { withFileTypes: true });
        for (const dirent of dirents) {
          const res = path.resolve(realPath, dirent.name);
          if (dirent.isDirectory()) stack.push(res);
          else if (
            ['.mp3', '.flac', '.m4a'].includes(path.extname(res).toLowerCase())
          )
            files.push(res);
        }
      } catch (e) {
      }
    }
    return files;
  }

  async findAllArtists() {
    return this.prisma.artist.findMany({ take: 50, orderBy: { name: 'asc' } });
  }

  async findArtistById(id: number) {
    return this.prisma.artist.findUnique({
      where: { id },
      include: {
        albums: {
          include: {
            artists: true,
            songs: {
              orderBy: { trackNumber: 'asc' },
              select: { id: true, title: true, duration: true },
            },
          },
        },
      },
    });
  }

  async findArtistByName(name: string) {
    return this.prisma.artist.findUnique({
      where: { name },
      include: {
        albums: {
          include: {
            artists: true,
            songs: {
              orderBy: { trackNumber: 'asc' },
              select: { id: true, title: true, duration: true },
            },
          },
        },
      },
    });
  }

  async findAllAlbums() {
    return this.prisma.album.findMany({
      select: {
        id: true,
        title: true,
        coverPath: true,
        artists: { select: { id: true, name: true } },
        _count: { select: { songs: true } },
      },
    });
  }

  async findAlbumById(id: number) {
    return this.prisma.album.findUnique({
      where: { id },
      include: {
        artists: true,
        songs: {
          orderBy: { trackNumber: 'asc' },
          select: {
            id: true,
            title: true,
            duration: true,
            trackNumber: true,
            lyrics: true,
          },
        },
      },
    });
  }

  async findSongById(id: number) {
    return this.prisma.song.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        duration: true,
        lyrics: true,
        album: { include: { artists: true } },
      },
    });
  }

  async findSongPath(id: number) {
    const s = await this.prisma.song.findUnique({
      where: { id },
      select: { path: true },
    });
    return s?.path ?? null;
  }

  async findAlbumArt(id: number) {
    return this.prisma.album.findUnique({
      where: { id },
      select: { coverPath: true },
    });
  }

  async findRandomAlbums(take: number) {
    const count = await this.prisma.album.count();
    const skip = Math.max(0, Math.floor(Math.random() * count) - take);
    return this.prisma.album.findMany({
      take,
      skip,
      include: { artists: true },
    });
  }

  async findAllPlaylists() {
    return this.prisma.playlist.findMany({
      include: { _count: { select: { songs: true } } },
    });
  }
  async createPlaylist(name: string, description?: string) {
    return this.prisma.playlist.create({ data: { name, description } });
  }
  async findPlaylistById(id: number) {
    return this.prisma.playlist.findUnique({
      where: { id },
      include: { songs: { include: { album: true } } },
    });
  }
  async addSongsToPlaylist(playlistId: number, songIds: number[]) {
    return this.prisma.playlist.update({
      where: { id: playlistId },
      data: { songs: { connect: songIds.map((id) => ({ id })) } },
    });
  }

  private sanitizeString(str: string | undefined): string {
    return str ? str.replace(/\u0000/g, '').trim() : '';
  }
}
