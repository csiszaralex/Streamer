import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  CustomMetadata,
  FFMPEGMetadata,
  FileEntry,
  FolderContent,
  VideoMetadata,
} from '@stream/api-types';
import { spawn } from 'child_process';
import { Response } from 'express';
import { constants, createReadStream, statSync } from 'fs';
import * as fs from 'fs/promises';
import * as path from 'path';
import { AppConfigService } from 'src/configs/app-config.service';
import { FFProbeRawOutput } from './interfaces/ffprobeOutput.interface';

@Injectable()
export class VideoService {
  private readonly rootPath: string;
  private readonly logger = new Logger(VideoService.name);
  private readonly ffmpegPath: string;
  private readonly ffprobePath: string;

  constructor(private configService: AppConfigService) {
    const configuredPath = this.configService.get('VIDEO_ROOT_PATH');
    this.rootPath = path.resolve(configuredPath);
    this.ffmpegPath = this.configService.get('FFMPEG_PATH');
    this.ffprobePath = this.configService.get('FFPROBE_PATH');
  }

  private resolveSafePath(relativePath: string): string {
    const decodedPath = decodeURIComponent(relativePath);
    const normalizedPath = path.normalize(path.join(this.rootPath, decodedPath));
    if (!normalizedPath.startsWith(this.rootPath)) {
      throw new BadRequestException('Invalid path: Access denied');
    }
    return normalizedPath;
  }

  async getVideoMetadata(relativePath: string): Promise<VideoMetadata> {
    const filePath = this.resolveSafePath(relativePath);

    try {
      await fs.access(filePath, constants.R_OK);
    } catch {
      throw new NotFoundException('File not found');
    }

    const technicalMetadata = await this.getFFprobeMetadata(filePath, relativePath);
    const userMetadata = await this.getSidecarMetadata(filePath);

    return {
      ...technicalMetadata,
      ...userMetadata,
    };
  }

  private async getFFprobeMetadata(
    filePath: string,
    relativePath: string,
  ): Promise<FFMPEGMetadata> {
    return new Promise((resolve, reject) => {
      const args = [
        '-v',
        'quiet',
        '-print_format',
        'json',
        '-show_format',
        '-show_streams',
        filePath,
      ];

      const process = spawn(this.ffprobePath, args);

      let rawData = '';

      process.stdout.on('data', (chunk: Buffer) => {
        rawData += chunk.toString();
      });

      process.on('close', (code) => {
        if (code !== 0) {
          this.logger.error(`FFprobe exited with code ${code} for ${relativePath}`);
          return reject(new BadRequestException('Failed to read video metadata'));
        }

        try {
          const output = JSON.parse(rawData) as FFProbeRawOutput;
          const format = output.format || {};

          const videoStream = (output.streams || []).find((s) => s.codec_type === 'video');
          const audioStream = (output.streams || []).find((s) => s.codec_type === 'audio');

          const metadata: VideoMetadata = {
            filename: path.basename(filePath),
            duration: parseFloat(format.duration || '0'),
            size: parseInt(format.size || '0', 10),
            container: format.format_name || 'unknown',

            width: videoStream?.width ?? 0,
            height: videoStream?.height ?? 0,
            videoCodec: videoStream?.codec_name ?? 'unknown',

            audioCodec: audioStream?.codec_name ?? 'unknown',
          };

          resolve(metadata);
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          this.logger.error(`Failed to parse FFprobe JSON: ${errorMessage}`);
          reject(new BadRequestException('Invalid metadata format'));
        }
      });

      process.on('error', (err) => {
        this.logger.error(`Failed to spawn ffprobe: ${err.message}`);
        reject(err);
      });
    });
  }

  private async getSidecarMetadata(filePath: string): Promise<CustomMetadata> {
    const metaFilePath = `${filePath}.meta.json`;
    try {
      await fs.access(metaFilePath, constants.R_OK);
      const content = await fs.readFile(metaFilePath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return {};
    }
  }

  async saveVideoMetadata(relativePath: string, metadata: Partial<VideoMetadata>): Promise<void> {
    const filePath = this.resolveSafePath(relativePath);
    const metaFilePath = `${filePath}.meta.json`; // e.g. movie.mp4 -> movie.mp4.meta.json

    try {
      await fs.access(filePath, constants.R_OK);
    } catch {
      throw new NotFoundException('Video file not found');
    }

    // Read existing metadata to preserve other fields if needed,
    // but here we just want to update the editable fields.
    // We should probably read existing sidecar first to be safe,
    // or just overwrite with the new "user" fields.
    const existingsidecar = await this.getSidecarMetadata(filePath);

    const newSidecar: Partial<VideoMetadata> = {
      ...existingsidecar,
      displayName: metadata.displayName,
      description: metadata.description,
      year: metadata.year,
      tags: metadata.tags,
    };

    await fs.writeFile(metaFilePath, JSON.stringify(newSidecar, null, 2), 'utf-8');
  }

  async getAllTags(): Promise<string[]> {
    const tags = new Set<string>();
    await this.scanForTags(this.rootPath, tags);
    return Array.from(tags).sort();
  }

  private async scanForTags(dir: string, tags: Set<string>) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await this.scanForTags(fullPath, tags);
        } else if (entry.isFile() && entry.name.endsWith('.meta.json')) {
          try {
            const content = await fs.readFile(fullPath, 'utf-8');
            const data = JSON.parse(content);
            if (Array.isArray(data.tags)) {
              data.tags.forEach((t: string) => tags.add(t));
            }
          } catch (e) {
            this.logger.warn(`Failed to read/parse existing meta file: ${fullPath}`);
          }
        }
      }
    } catch (e) {
      this.logger.warn(`Failed to scan directory for tags: ${dir}`);
    }
  }

  async listFolder(folderPath: string = ''): Promise<FolderContent> {
    const fullPath = this.resolveSafePath(folderPath);
    try {
      const stats = await fs.stat(fullPath);
      if (!stats.isDirectory()) throw new BadRequestException('Path is not a directory');

      const dirEntries = await fs.readdir(fullPath, { withFileTypes: true });
      const entries: FileEntry[] = dirEntries
        .map((entry): FileEntry => {
          const entryPath = path.join(fullPath, entry.name);
          const relativePath = path.relative(this.rootPath, entryPath).replace(/\\/g, '/');

          return {
            name: entry.name,
            type: entry.isDirectory() ? 'folder' : 'file',
            path: relativePath,
          };
        })
        .filter(
          (entry) => entry.type === 'folder' || /\.(mp4|mkv|avi|webm|srt|vtt)$/i.test(entry.name),
        )
        .sort((a, b) => {
          if (a.type === b.type) return a.name.localeCompare(b.name);
          return a.type === 'folder' ? -1 : 1;
        });

      const parent =
        folderPath && folderPath !== '.' && folderPath !== '/'
          ? path.dirname(folderPath).replace(/\\/g, '/')
          : undefined;

      return {
        path: folderPath,
        parent: parent === '.' ? '' : parent,
        entries,
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new NotFoundException('Directory not found');
    }
  }

  async streamVideo(relativePath: string, range: string, startParam: string, res: Response) {
    const filePath = this.resolveSafePath(relativePath);

    try {
      await fs.access(filePath, constants.R_OK);
    } catch {
      throw new NotFoundException('File not found');
    }

    const ext = path.extname(filePath).toLowerCase();

    if (ext === '.mp4' || ext === '.webm') {
      const stat = statSync(filePath);
      const fileSize = stat.size;

      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = end - start + 1;

        const file = createReadStream(filePath, { start, end });
        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': 'video/mp4',
        });
        return file.pipe(res);
      } else {
        res.writeHead(200, {
          'Content-Length': fileSize,
          'Content-Type': 'video/mp4',
        });
        return createReadStream(filePath).pipe(res);
      }
    } else {
      const startTime = startParam ? parseInt(startParam, 10) : 0;
      this.logger.log(`Starting Native FFmpeg remux for: ${relativePath} at ${startTime}s`);

      res.writeHead(200, {
        'Content-Type': 'video/mp4',
      });

      const args = [
        ...(startTime > 0 ? ['-ss', String(startTime)] : []),
        '-i',
        filePath,
        '-movflags',
        'frag_keyframe+empty_moov',
        '-c:v',
        'copy',
        '-c:a',
        'aac',
        '-b:a',
        '192k',
        '-f',
        'mp4',
        '-',
      ];

      const ffmpegProcess = spawn(this.ffmpegPath, args);

      ffmpegProcess.stdout.pipe(res);

      ffmpegProcess.stderr.on('data', (data: Buffer) => {
        const msg = data.toString();
        if (msg.includes('Error')) {
          this.logger.error(`FFmpeg Error: ${msg}`);
        }
      });

      res.on('close', () => {
        this.logger.log('Client closed connection, killing FFmpeg process...');
        ffmpegProcess.kill('SIGKILL');
      });

      ffmpegProcess.on('error', (err) => {
        this.logger.error('Failed to spawn ffmpeg process:', err);
        if (!res.headersSent) {
          res.status(500).send('Streaming error');
        }
      });
    }
  }

  async downloadVideo(relativePath: string, res: Response) {
    const filePath = this.resolveSafePath(relativePath);
    try {
      await fs.access(filePath, constants.R_OK);
    } catch {
      throw new NotFoundException('File not found');
    }

    const filename = path.basename(filePath);
    res.download(filePath, filename, (err) => {
      if (err) {
        this.logger.error(`Download error: ${err.message}`);
        if (!res.headersSent) {
          res.status(500).send('Download failed');
        }
      }
    });
  }
}
