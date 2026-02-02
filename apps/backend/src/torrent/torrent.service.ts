import { forwardRef, Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as path from 'path';
import * as WebTorrent from 'webtorrent';
import { AppConfigService } from '../configs/app-config.service';
import { TorrentGateway } from './torrent.gateway';

export interface TorrentInfo {
  infoHash: string;
  name: string;
  progress: number;
  downloadSpeed: number;
  peers: number;
  state: 'downloading' | 'paused' | 'done' | 'error';
}

@Injectable()
export class TorrentService implements OnModuleInit {
  private client: WebTorrent.Instance;
  private readonly logger = new Logger(TorrentService.name);
  private readonly downloadPath: string;
  private activeTorrents: Map<string, TorrentInfo> = new Map();

  constructor(
    private configService: AppConfigService,
    @Inject(forwardRef(() => TorrentGateway)) private readonly torrentGateway: TorrentGateway,
  ) {
    this.downloadPath = path.resolve(this.configService.get('VIDEO_ROOT_PATH'));
  }

  getAllTorrents(): TorrentInfo[] {
    return Array.from(this.activeTorrents.values());
  }

  onModuleInit() {
    import('webtorrent')
      .then((WebTorrentModule) => {
        // @ts-ignore
        this.client = new WebTorrentModule.default();
        this.logger.log('WebTorrent client initialized');
      })
      .catch((err) => {
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

        const torrentInfo: TorrentInfo = {
          infoHash: torrent.infoHash,
          name: torrent.name,
          progress: 0,
          downloadSpeed: 0,
          peers: 0,
          state: 'downloading',
        };
        this.activeTorrents.set(torrent.infoHash, torrentInfo);
        this.torrentGateway.broadcastTorrentAdded(torrentInfo);

        let lastLogProgress = 0;
        torrent.on('download', () => {
          const progress = Math.round(torrent.progress * 100);

          // Update state
          const info = this.activeTorrents.get(torrent.infoHash);
          if (info) {
            info.progress = progress;
            info.downloadSpeed = torrent.downloadSpeed;
            info.peers = torrent.numPeers;

            // Broadcast progress (throttle this in a real app if needed, here we rely on React debounce or similar if it's too fast,
            // but WebTorrent 'download' event fires frequently. Let's checking if we should emit.)
            // To avoid flooding, maybe only emit on percentage change or every second.
            // For now, let's just emit.
            this.torrentGateway.broadcastProgress(info);
          }

          if (progress >= lastLogProgress + 10) {
            this.logger.log(
              `Downloading ${torrent.name}: ${progress}% - ${Math.round(torrent.downloadSpeed / 1024)} KB/s`,
            );
            lastLogProgress = progress;
          }
        });

        torrent.on('done', () => {
          this.logger.log(`Torrent download finished: ${torrent.name}`);
          const info = this.activeTorrents.get(torrent.infoHash);
          if (info) {
            info.progress = 100;
            info.state = 'done';
            this.torrentGateway.broadcastTorrentDone(info);
            // Optionally remove from active torrents map if we don't want to show finished ones purely as active
            // But keeping it there for "Done" status is good for now.
          }
        });

        torrent.on('error', (err) => {
          const msg = typeof err === 'string' ? err : err.message;
          this.logger.error(`Torrent error ${torrent.name}: ${msg}`);
          const info = this.activeTorrents.get(torrent.infoHash);
          if (info) {
            info.state = 'error';
            this.torrentGateway.broadcastTorrentError({ ...info, error: msg });
          }
        });

        resolve({
          infoHash: torrent.infoHash,
          name: torrent.name,
        });
      });
    });
  }
}
