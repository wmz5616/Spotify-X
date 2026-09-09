import {
  Controller,
  Get,
  Param,
  Post,
  Body,
  ParseIntPipe,
  Res,
  Req,
  NotFoundException,
  Query,
  HttpException,
  HttpStatus,
  Logger,
  Sse,
  MessageEvent,
  UseGuards,
  UsePipes,
  ValidationPipe,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiSecurity,
} from '@nestjs/swagger';
import { MusicLibraryService } from './music-library.service';
import { OnlineMusicService } from './online-music.service';
import { StreamingService } from '../streaming/streaming.service';
import type { Request, Response } from 'express';
import { createReadStream, statSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import * as http from 'http';
import * as https from 'https';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import * as mime from 'mime-types';
import * as path from 'path';
import sharp from 'sharp';
import rangeParser from 'range-parser';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import {
  CreateLibraryPlaylistDto,
  AddSongsDto,
  SearchQueryDto,
  GetCoverQueryDto,
} from './dto/music-library.dto';

@Controller('api')
export class MusicLibraryController {
  private readonly logger = new Logger(MusicLibraryController.name);
  private isScanning = false;

  constructor(
    private readonly musicLibraryService: MusicLibraryService,
    private readonly onlineMusicService: OnlineMusicService,
    private readonly streamingService: StreamingService,
  ) { }

  private validateQueryToken(key?: string) {
    const validApiKey = process.env.API_KEY;
    if (!validApiKey) {
      throw new InternalServerErrorException(
        'Server configuration error: API_KEY is missing',
      );
    }
    if (key !== validApiKey) {
      throw new UnauthorizedException('Invalid or missing API Key');
    }
  }

  @ApiTags('Library')
  @ApiOperation({
    summary: '扫描进度 SSE 流',
    description: '通过 Server-Sent Events 实时获取音乐库扫描进度',
  })
  @ApiSecurity('api-key')
  @UseGuards(ApiKeyGuard)
  @Sse('library/scan/progress')
  scanProgress(): Observable<MessageEvent> {
    return this.musicLibraryService.getProgressStream().pipe(
      map((progress) => ({
        data: progress,
      })),
    );
  }

  @ApiTags('Library')
  @ApiOperation({
    summary: '扫描音乐库 (已暂时停用)',
    description: '本地音乐扫描功能已停用，系统当前运行在在线 API 模式下',
  })
  @ApiResponse({ status: 200, description: '扫描功能已停用' })
  @ApiSecurity('api-key')
  @UseGuards(ApiKeyGuard)
  @Post('library/scan')
  async scanLibrary(@Query('force') force: string) {
    this.logger.warn('Received scanLibrary request, but scanning is currently disabled.');
    return {
      message: '本地音乐库扫描功能已停用，系统当前运行在在线 API 模式下。',
      onlineMode: true,
    };
    /*
    // [TEMPORARILY DISABLED: Local Folder Scanning]
    if (this.isScanning) {
      throw new HttpException('扫描正在进行中，请稍后', HttpStatus.CONFLICT);
    }

    const musicDirectory = process.env.MUSIC_DIRECTORY;
    if (!musicDirectory) {
      throw new HttpException(
        '服务器未配置 MUSIC_DIRECTORY 环境变量',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const forceUpdate = force === 'true';
    this.logger.log(`Received scan request. Force update: ${forceUpdate}`);

    this.isScanning = true;
    this.musicLibraryService
      .scanAndSaveMusic(musicDirectory, forceUpdate)
      .finally(() => {
        this.isScanning = false;
      });

    return {
      message:
        'Scan started in background. Please connect to /api/library/scan/progress for updates.',
    };
    */
  }

  @ApiTags('Albums')
  @ApiOperation({
    summary: '获取专辑封面',
    description: '根据专辑 ID 获取封面图片，支持自定义尺寸',
  })
  @ApiParam({ name: 'id', description: '专辑 ID', example: 1 })
  @ApiQuery({
    name: 'size',
    required: false,
    description: '封面尺寸 (像素)',
    example: '300',
  })
  @ApiQuery({ name: 'key', required: true, description: 'API Key' })
  @ApiResponse({ status: 200, description: '成功返回封面图片' })
  @ApiResponse({ status: 404, description: '封面不存在' })
  @Get('covers/:id')
  @UsePipes(new ValidationPipe({ transform: true }))
  async getAlbumCover(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: GetCoverQueryDto,
    @Query('key') key: string,
    @Res() response: Response,
  ) {
    this.validateQueryToken(key);

    let width: number | undefined;
    if (query.size) {
      width = parseInt(query.size);
      if (isNaN(width) || width > 2048) {
        width = 2048;
      } else if (width <= 0) {
        width = undefined;
      }
    }

    const projectRoot = process.cwd();
    const cacheDir = path.join(projectRoot, 'public', 'cache', 'covers');
    const cacheKey = width ? `${id}_w${width}.jpg` : `${id}_full.jpg`;
    const cachePath = path.join(cacheDir, cacheKey);

    if (existsSync(cachePath)) {
      response.setHeader('Content-Type', 'image/jpeg');
      response.setHeader('Cache-Control', 'public, max-age=31536000');
      createReadStream(cachePath).pipe(response);
      return;
    }

    const placeholderPath = path.join(projectRoot, 'public', 'placeholder.jpg');
    let targetPath = placeholderPath;
    let isPlaceholder = true;

    const album = await this.musicLibraryService.findAlbumArt(id);
    if (album && album.coverPath) {
      if (album.coverPath.startsWith('http://') || album.coverPath.startsWith('https://')) {
        try {
          if (!existsSync(cacheDir)) {
            mkdirSync(cacheDir, { recursive: true });
          }
          const buf = await this.onlineMusicService.fetchRemoteImage(album.coverPath);
          if (buf) {
            let pipeline = sharp(buf);
            if (width) {
              pipeline = pipeline.resize(width, width, { fit: 'cover' });
            }
            const outputBuffer = await pipeline.jpeg({ quality: 80 }).toBuffer();
            writeFileSync(cachePath, outputBuffer);
            response.setHeader('Content-Type', 'image/jpeg');
            response.setHeader('Cache-Control', 'public, max-age=31536000');
            response.send(outputBuffer);
            return;
          }
        } catch (e) {
          this.logger.warn(`Failed to process remote cover ${album.coverPath}: ${e}`);
          return response.redirect(album.coverPath);
        }
      }

      const relativePath = album.coverPath.startsWith('/')
        ? album.coverPath.slice(1)
        : album.coverPath;
      const fullPath = path.join(projectRoot, 'public', relativePath);

      if (existsSync(fullPath)) {
        targetPath = fullPath;
        isPlaceholder = false;
      }
    }

    if (!existsSync(targetPath)) {
      const fallback = await sharp({
        create: {
          width: width || 300,
          height: width || 300,
          channels: 3,
          background: { r: 35, g: 35, b: 35 },
        },
      })
        .jpeg()
        .toBuffer();
      response.setHeader('Content-Type', 'image/jpeg');
      response.setHeader('Cache-Control', 'public, max-age=60');
      response.send(fallback);
      return;
    }

    try {
      if (!existsSync(cacheDir)) {
        mkdirSync(cacheDir, { recursive: true });
      }

      const pipeline = sharp(targetPath);
      if (width) {
        pipeline.resize(width, width, { fit: 'cover' });
      }
      pipeline.jpeg({ quality: 80, mozjpeg: true });

      await pipeline.toFile(cachePath);

      response.setHeader('Content-Type', 'image/jpeg');
      // 给 URL 增加 ETag 或更好的缓存控制
      const cacheAge = isPlaceholder ? 60 : 31536000;
      response.setHeader('Cache-Control', `public, max-age=${cacheAge}`);

      createReadStream(cachePath).pipe(response);
    } catch (error) {
      this.logger.error('Error processing image:', error);
      createReadStream(targetPath).pipe(response);
    }
  }

  @ApiTags('Albums')
  @ApiOperation({
    summary: '获取随机专辑',
    description: '随机获取指定数量的专辑，用于首页推荐',
  })
  @ApiQuery({
    name: 'take',
    required: false,
    description: '返回数量',
    example: 6,
  })
  @ApiResponse({ status: 200, description: '成功返回随机专辑列表' })
  @ApiSecurity('api-key')
  @UseGuards(ApiKeyGuard)
  @Get('albums/random')
  findRandomAlbums(
    @Query('take', new ParseIntPipe({ optional: true })) take: number = 6,
  ) {
    return this.musicLibraryService.findRandomAlbums(take);
  }

  @ApiTags('Artists')
  @ApiOperation({
    summary: '获取所有艺术家',
    description: '返回音乐库中所有艺术家列表',
  })
  @ApiResponse({ status: 200, description: '成功返回艺术家列表' })
  @ApiSecurity('api-key')
  @UseGuards(ApiKeyGuard)
  @Get('artists')
  findAllArtists() {
    return this.musicLibraryService.findAllArtists();
  }

  @ApiTags('Artists')
  @ApiOperation({ summary: '获取艺术家头像' })
  @Get('artists/:id/avatar')
  async getArtistAvatar(
    @Param('id', ParseIntPipe) id: number,
    @Res() response: Response,
  ) {
    const cacheDir = path.join(process.cwd(), 'public', 'cache', 'artists');
    const cachePath = path.join(cacheDir, `${id}.jpg`);
    if (existsSync(cachePath)) {
      response.setHeader('Content-Type', 'image/jpeg');
      response.setHeader('Cache-Control', 'public, max-age=31536000');
      createReadStream(cachePath).pipe(response);
      return;
    }

    const artist = await this.musicLibraryService.findArtistById(id);
    if (artist?.avatarUrl) {
      if (artist.avatarUrl.startsWith('http://') || artist.avatarUrl.startsWith('https://')) {
        try {
          if (!existsSync(cacheDir)) {
            mkdirSync(cacheDir, { recursive: true });
          }
          const buf = await this.onlineMusicService.fetchRemoteImage(artist.avatarUrl);
          if (buf) {
            writeFileSync(cachePath, buf);
            response.setHeader('Content-Type', 'image/jpeg');
            response.setHeader('Cache-Control', 'public, max-age=31536000');
            response.send(buf);
            return;
          }
        } catch {
          return response.redirect(artist.avatarUrl);
        }
      }
    }
    return response.status(404).send('Avatar not found');
  }

  @ApiTags('Images')
  @ApiOperation({ summary: '远程图片代理与缓存' })
  @Get('images/proxy')
  async proxyImage(
    @Query('url') imageUrl: string,
    @Query('w') widthStr: string,
    @Res() response: Response,
  ) {
    if (!imageUrl) {
      return response.status(400).send('Missing url parameter');
    }
    const cleanUrl = decodeURIComponent(imageUrl);
    const hash = Buffer.from(cleanUrl).toString('base64').replace(/[/+=]/g, '_').slice(0, 48);
    const cacheDir = path.join(process.cwd(), 'public', 'cache', 'proxy');
    const cachePath = path.join(cacheDir, `${hash}.jpg`);

    if (existsSync(cachePath)) {
      response.setHeader('Content-Type', 'image/jpeg');
      response.setHeader('Cache-Control', 'public, max-age=31536000');
      createReadStream(cachePath).pipe(response);
      return;
    }

    try {
      const buf = await this.onlineMusicService.fetchRemoteImage(cleanUrl);
      if (buf) {
        if (!existsSync(cacheDir)) {
          mkdirSync(cacheDir, { recursive: true });
        }
        let pipeline = sharp(buf);
        if (widthStr) {
          const w = parseInt(widthStr, 10);
          if (!isNaN(w) && w > 0 && w <= 2048) {
            pipeline = pipeline.resize(w, w, { fit: 'cover' });
          }
        }
        const outputBuffer = await pipeline.jpeg({ quality: 85 }).toBuffer();
        writeFileSync(cachePath, outputBuffer);
        response.setHeader('Content-Type', 'image/jpeg');
        response.setHeader('Cache-Control', 'public, max-age=31536000');
        response.send(outputBuffer);
        return;
      }
    } catch (e) {
      this.logger.warn(`Failed to proxy image ${cleanUrl}: ${e}`);
    }
    return response.redirect(cleanUrl);
  }

  @ApiTags('Artists')
  @ApiOperation({
    summary: '获取艺术家详情',
    description: '根据 ID 获取艺术家详细信息，包括专辑列表',
  })
  @ApiParam({ name: 'id', description: '艺术家 ID', example: 1 })
  @ApiResponse({ status: 200, description: '成功返回艺术家信息' })
  @ApiResponse({ status: 404, description: '艺术家不存在' })
  @ApiSecurity('api-key')
  @UseGuards(ApiKeyGuard)
  @Get('artists/:id')
  async findArtistById(@Param('id', ParseIntPipe) id: number) {
    const artist = await this.musicLibraryService.findArtistById(id);
    if (!artist) {
      throw new NotFoundException(`Artist with ID ${id} not found`);
    }
    return artist;
  }

  @ApiTags('Artists')
  @ApiOperation({
    summary: '根据名称获取艺术家详情',
    description: '根据艺术家名称获取详细信息，包括专辑列表',
  })
  @ApiParam({ name: 'name', description: '艺术家名称', example: '周杰伦' })
  @ApiResponse({ status: 200, description: '成功返回艺术家信息' })
  @ApiResponse({ status: 404, description: '艺术家不存在' })
  @ApiSecurity('api-key')
  @UseGuards(ApiKeyGuard)
  @Get('artists/name/:name')
  async findArtistByName(@Param('name') name: string) {
    const artist = await this.musicLibraryService.findArtistByName(name);
    if (!artist) {
      throw new NotFoundException(`Artist with name ${name} not found`);
    }
    return artist;
  }

  @ApiTags('Albums')
  @ApiOperation({
    summary: '获取所有专辑',
    description: '返回音乐库中所有专辑列表',
  })
  @ApiResponse({ status: 200, description: '成功返回专辑列表' })
  @ApiSecurity('api-key')
  @UseGuards(ApiKeyGuard)
  @Get('albums')
  findAllAlbums() {
    return this.musicLibraryService.findAllAlbums();
  }

  @ApiTags('Albums')
  @ApiOperation({
    summary: '获取专辑详情',
    description: '根据 ID 获取专辑详细信息，包括歌曲列表',
  })
  @ApiParam({ name: 'id', description: '专辑 ID', example: 1 })
  @ApiResponse({ status: 200, description: '成功返回专辑信息' })
  @ApiResponse({ status: 404, description: '专辑不存在' })
  @ApiSecurity('api-key')
  @UseGuards(ApiKeyGuard)
  @Get('albums/:id')
  async findAlbumById(@Param('id', ParseIntPipe) id: number) {
    const album = await this.musicLibraryService.findAlbumById(id);
    if (!album) {
      throw new NotFoundException(`Album with ID ${id} not found`);
    }
    return album;
  }

  @ApiTags('Songs')
  @ApiOperation({
    summary: '获取歌曲详情',
    description: '根据 ID 获取歌曲信息，包括歌词',
  })
  @ApiParam({ name: 'id', description: '歌曲 ID', example: 1 })
  @ApiResponse({ status: 200, description: '成功返回歌曲信息' })
  @ApiResponse({ status: 404, description: '歌曲不存在' })
  @ApiSecurity('api-key')
  @UseGuards(ApiKeyGuard)
  @Get('songs/:id')
  async findSongById(@Param('id', ParseIntPipe) id: number) {
    const song = await this.musicLibraryService.findSongById(id);
    if (!song) {
      throw new NotFoundException(`Song with ID ${id} not found`);
    }
    this.logger.log(
      `Fetching song ${id}: ${song.title}, Has Lyrics: ${!!song.lyrics}, Length: ${song.lyrics?.length}`,
    );
    return song;
  }

  @ApiTags('Songs')
  @ApiOperation({
    summary: '获取歌词',
    description: '获取指定歌曲的歌词内容 (支持本地和在线歌词)',
  })
  @ApiParam({ name: 'id', description: '歌曲 ID', example: 1 })
  @ApiResponse({ status: 200, description: '成功返回歌词' })
  @ApiSecurity('api-key')
  @UseGuards(ApiKeyGuard)
  @Get('songs/:id/lyrics')
  async getLyrics(@Param('id', ParseIntPipe) id: number) {
    const song = await this.musicLibraryService.findSongById(id);
    if (song && song.lyrics) {
      return { lyrics: song.lyrics };
    }
    const onlineLyrics = await this.onlineMusicService.getLyrics(id);
    return { lyrics: onlineLyrics || '' };
  }

  @ApiTags('Search')
  @ApiOperation({
    summary: '搜索',
    description: '全局搜索艺术家、专辑和歌曲',
  })
  @ApiQuery({
    name: 'q',
    required: false,
    description: '搜索关键词',
    example: '周杰伦',
  })
  @ApiResponse({ status: 200, description: '成功返回搜索结果' })
  @ApiSecurity('api-key')
  @UseGuards(ApiKeyGuard)
  @Get('search')
  @UsePipes(new ValidationPipe({ transform: true }))
  search(@Query() query: SearchQueryDto) {
    return this.musicLibraryService.search(query.q || '');
  }

  @ApiTags('Songs')
  @ApiOperation({
    summary: '获取音频流令牌',
    description: '获取一个短效的音频流令牌，用于后续 stream 接口调用',
  })
  @ApiParam({ name: 'id', description: '歌曲 ID', example: 1 })
  @ApiSecurity('api-key')
  @UseGuards(ApiKeyGuard)
  @Get('songs/:id/stream-token')
  async getStreamToken(@Param('id', ParseIntPipe) id: number) {
    const token = this.streamingService.createToken(id);
    return { token };
  }

  @ApiTags('Songs')
  @ApiOperation({
    summary: '获取音频流',
    description: '流式传输音频文件，支持本地和在线流媒体 (带 Range 支持)',
  })
  @ApiParam({ name: 'id', description: '歌曲 ID', example: 1 })
  @ApiQuery({ name: 'token', required: false, description: '流授权令牌' })
  @ApiQuery({ name: 'key', required: false, description: 'API Key (不建议使用，仅作延迟兼容)' })
  @ApiResponse({ status: 200, description: '返回音频流' })
  @ApiResponse({ status: 206, description: '返回部分音频 (Range 请求)' })
  @ApiResponse({ status: 404, description: '歌曲不存在' })
  @Get('stream/:id')
  async getAudioStream(
    @Param('id', ParseIntPipe) id: number,
    @Query('token') token: string,
    @Query('key') key: string,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    if (token) {
      if (!this.streamingService.validateToken(token, id)) {
        throw new UnauthorizedException('Invalid or expired stream token');
      }
    } else {
      this.validateQueryToken(key);
    }

    // 1. Check if song exists on local disk
    const songPath = await this.musicLibraryService.findSongPath(id);
    if (songPath && existsSync(songPath)) {
      return this.streamLocalFile(songPath, request, response);
    }

    // 2. Otherwise, resolve from online streaming service!
    const onlineUrl = await this.onlineMusicService.resolveStreamUrl(id);
    if (onlineUrl) {
      return this.streamRemoteUrl(onlineUrl, request, response);
    }

    throw new NotFoundException('Audio stream not available for this song');
  }

  private streamLocalFile(songPath: string, request: Request, response: Response) {
    const mimeType = mime.lookup(songPath) || 'application/octet-stream';
    const { size } = statSync(songPath);
    const rangeHeader = request.headers.range;

    const handleStreamError = (stream: any) => {
      stream.on('error', (err: any) => {
        if (err.code !== 'ECONNRESET') {
          this.logger.error(`Stream error for file ${songPath}:`, err);
        }
        if (!response.headersSent) {
          response.sendStatus(HttpStatus.INTERNAL_SERVER_ERROR);
        }
      });
    };

    if (rangeHeader) {
      const ranges = rangeParser(size, rangeHeader, { combine: true });

      if (ranges === -1 || ranges === -2) {
        throw new HttpException(
          'Range Not Satisfiable',
          HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE,
        );
      }

      if (Array.isArray(ranges) && ranges.length > 0) {
        const { start, end } = ranges[0];
        const chunksize = end - start + 1;

        response.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${size}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': mimeType,
          'X-Content-Type-Options': 'nosniff',
          'Content-Disposition': 'inline',
        });

        const file = createReadStream(songPath, { start, end });
        handleStreamError(file);
        file.pipe(response);
        return;
      }
    }

    response.writeHead(200, {
      'Content-Length': size,
      'Content-Type': mimeType,
      'Accept-Ranges': 'bytes',
      'X-Content-Type-Options': 'nosniff',
      'Content-Disposition': 'inline',
    });

    const file = createReadStream(songPath);
    handleStreamError(file);
    file.pipe(response);
  }

  private streamRemoteUrl(url: string, request: Request, response: Response) {
    const mod = url.startsWith('https') ? https : http;
    const clientHeaders: Record<string, string> = {
      'User-Agent': 'okhttp/3.10.0',
    };
    if (request.headers.range) {
      clientHeaders['Range'] = request.headers.range as string;
    }

    const req = mod.get(url, { headers: clientHeaders }, (remoteRes) => {
      if (remoteRes.statusCode && remoteRes.statusCode >= 300 && remoteRes.statusCode < 400 && remoteRes.headers.location) {
        return this.streamRemoteUrl(remoteRes.headers.location, request, response);
      }

      const statusCode = remoteRes.statusCode || 200;
      const responseHeaders: Record<string, any> = {
        'Content-Type': remoteRes.headers['content-type'] || 'audio/mpeg',
        'Accept-Ranges': 'bytes',
        'X-Content-Type-Options': 'nosniff',
        'Content-Disposition': 'inline',
      };

      if (remoteRes.headers['content-length']) {
        responseHeaders['Content-Length'] = remoteRes.headers['content-length'];
      }
      if (remoteRes.headers['content-range']) {
        responseHeaders['Content-Range'] = remoteRes.headers['content-range'];
      }

      response.writeHead(statusCode, responseHeaders);
      remoteRes.pipe(response);
    });

    req.on('error', (err) => {
      this.logger.error(`Remote audio stream error for ${url}:`, err);
      if (!response.headersSent) {
        response.sendStatus(HttpStatus.INTERNAL_SERVER_ERROR);
      }
    });
  }

  @ApiTags('Playlists')
  @ApiOperation({
    summary: '获取所有播放列表',
    description: '返回用户创建的所有播放列表',
  })
  @ApiResponse({ status: 200, description: '成功返回播放列表' })
  @ApiSecurity('api-key')
  @UseGuards(ApiKeyGuard)
  @Get('playlists')
  findAllPlaylists() {
    return this.musicLibraryService.findAllPlaylists();
  }

  @ApiTags('Playlists')
  @ApiOperation({
    summary: '获取播放列表详情',
    description: '根据 ID 获取播放列表详情，包括歌曲列表',
  })
  @ApiParam({ name: 'id', description: '播放列表 ID', example: 1 })
  @ApiResponse({ status: 200, description: '成功返回播放列表' })
  @ApiResponse({ status: 404, description: '播放列表不存在' })
  @ApiSecurity('api-key')
  @UseGuards(ApiKeyGuard)
  @Get('playlists/:id')
  async findPlaylistById(@Param('id', ParseIntPipe) id: number) {
    const playlist = await this.musicLibraryService.findPlaylistById(id);
    if (!playlist) {
      throw new NotFoundException(`Playlist with ID ${id} not found`);
    }
    return playlist;
  }

  @ApiTags('Playlists')
  @ApiOperation({
    summary: '创建播放列表',
    description: '创建一个新的播放列表',
  })
  @ApiResponse({ status: 201, description: '播放列表创建成功' })
  @ApiSecurity('api-key')
  @UseGuards(ApiKeyGuard)
  @Post('playlists')
  @UsePipes(new ValidationPipe())
  createPlaylist(@Body() createPlaylistDto: CreateLibraryPlaylistDto) {
    return this.musicLibraryService.createPlaylist(
      createPlaylistDto.name,
      createPlaylistDto.description,
    );
  }

  @ApiTags('Playlists')
  @ApiOperation({
    summary: '添加歌曲到播放列表',
    description: '将一首或多首歌曲添加到指定播放列表',
  })
  @ApiParam({ name: 'id', description: '播放列表 ID', example: 1 })
  @ApiResponse({ status: 200, description: '歌曲添加成功' })
  @ApiResponse({ status: 404, description: '播放列表不存在' })
  @ApiSecurity('api-key')
  @UseGuards(ApiKeyGuard)
  @Post('playlists/:id/songs')
  @UsePipes(new ValidationPipe())
  addSongsToPlaylist(
    @Param('id', ParseIntPipe) id: number,
    @Body() addSongsDto: AddSongsDto,
  ) {
    return this.musicLibraryService.addSongsToPlaylist(id, addSongsDto.songIds);
  }
}
