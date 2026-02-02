import {
    BadRequestException,
    Controller,
    Post,
    UploadedFile,
    UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TorrentService } from './torrent.service';

@Controller('api/torrents')
export class TorrentController {
  constructor(private readonly torrentService: TorrentService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadTorrent(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (!file.originalname.endsWith('.torrent')) {
      throw new BadRequestException('Invalid file type. Only .torrent files are allowed');
    }

    const result = await this.torrentService.addTorrent(file.buffer);
    return {
      success: true,
      data: result,
    };
  }
}
