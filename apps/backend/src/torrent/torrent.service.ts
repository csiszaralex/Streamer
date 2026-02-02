import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as path from 'path';
import * as WebTorrent from 'webtorrent';
import { AppConfigService } from '../configs/app-config.service';

@Injectable()
export class TorrentService implements OnModuleInit {
  private client: WebTorrent.Instance;
  private readonly logger = new Logger(TorrentService.name);
  private readonly downloadPath: string;

  constructor(private configService: AppConfigService) {
    this.downloadPath = path.resolve(this.configService.get('VIDEO_ROOT_PATH'));
  }

  onModuleInit() {
    import('webtorrent').then((WebTorrentModule) => {
        // @ts-ignore
      this.client = new WebTorrentModule.default();
      this.logger.log('WebTorrent client initialized');
    }).catch(err => {
        this.logger.error('Failed to initialize WebTorrent', err);
    });
  }

  async addTorrent(torrentBuffer: Buffer): Promise<{ infoHash: string; name: string }> {
    return new Promise((resolve, reject) => {
        if (!this.client) {
            return reject(new Error('WebTorrent client not initialized'));
        }
      this.client.add(torrentBuffer, { path: this.downloadPath }, (torrent) => {
        this.logger.log(`Torrent added: ${torrent.name} (${torrent.infoHash})`);

        let lastLogProgress = 0;
        torrent.on('download', () => {
             const progress = Math.round(torrent.progress * 100);
             if (progress >= lastLogProgress + 10) {
                 this.logger.log(`Downloading ${torrent.name}: ${progress}% - ${Math.round(torrent.downloadSpeed / 1024)} KB/s`);
                 lastLogProgress = progress;
             }
        });

        torrent.on('done', () => {
          this.logger.log(`Torrent download finished: ${torrent.name}`);
        });

        torrent.on('error', (err) => {
            const msg = typeof err === 'string' ? err : err.message;
            this.logger.error(`Torrent error ${torrent.name}: ${msg}`);
        });

        resolve({
          infoHash: torrent.infoHash,
          name: torrent.name,
        });
      });
    });
  }
}
