import {
  BadRequestException,
  Controller,
  Get,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { VideoService } from './video.service';
import { VideoMetadata } from '@stream/api-types';

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
}
