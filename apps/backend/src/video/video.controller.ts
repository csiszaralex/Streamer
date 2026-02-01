import { BadRequestException, Body, Controller, Get, Post, Query, Req, Res } from '@nestjs/common';
import { VideoMetadata } from '@stream/api-types';
import type { Request, Response } from 'express';
import { VideoService } from './video.service';

@Controller('api/videos')
export class VideoController {
  constructor(private readonly videoService: VideoService) {}

  @Get('browse')
  async browse(@Query('path') path: string) {
    return this.videoService.listFolder(path || '');
  }

  @Get('stream')
  async stream(
    @Query('path') path: string,
    @Query('start') start: string,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    const range = req.headers.range || '';
    return this.videoService.streamVideo(path, range, start, res);
  }

  @Get('metadata')
  async getMetadata(@Query('path') path: string): Promise<VideoMetadata> {
    if (!path) {
      throw new BadRequestException('Path query parameter is required');
    }
    return this.videoService.getVideoMetadata(path);
  }
  @Get('download')
  async download(@Query('path') path: string, @Res() res: Response) {
    if (!path) {
      throw new BadRequestException('Path query parameter is required');
    }
    return this.videoService.downloadVideo(path, res);
  }

  @Post('metadata')
  async saveMetadata(@Query('path') path: string, @Body() metadata: Partial<VideoMetadata>) {
    if (!path) {
      throw new BadRequestException('Path query parameter is required');
    }
    await this.videoService.saveVideoMetadata(path, metadata);
    return { success: true };
  }

  @Get('tags')
  async getTags() {
    return this.videoService.getAllTags();
  }
}
