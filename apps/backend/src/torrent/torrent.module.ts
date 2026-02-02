import { Module } from '@nestjs/common';
import { TorrentController } from './torrent.controller';
import { TorrentGateway } from './torrent.gateway';
import { TorrentService } from './torrent.service';

@Module({
  controllers: [TorrentController],
  providers: [TorrentService, TorrentGateway],
})
export class TorrentModule {}
