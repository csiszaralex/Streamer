import { forwardRef, Inject, Logger } from '@nestjs/common';
import { OnGatewayConnection, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { TorrentInfo, TorrentService } from './torrent.service';

@WebSocketGateway({
  cors: {
    origin: '*', // Adjust this in production
  },
})
export class TorrentGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(TorrentGateway.name);

  constructor(
    @Inject(forwardRef(() => TorrentService))
    private readonly torrentService: TorrentService,
  ) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    const activeTorrents = this.torrentService.getAllTorrents();
    client.emit('torrent-list', activeTorrents);
  }

  broadcastProgress(data: TorrentInfo) {
    this.server.emit('torrent-progress', data);
  }

  broadcastTorrentAdded(data: TorrentInfo) {
    this.server.emit('torrent-added', data);
  }

  broadcastTorrentDone(data: TorrentInfo) {
    this.server.emit('torrent-done', data);
  }

  broadcastTorrentError(data: TorrentInfo & { error: string }) {
    this.server.emit('torrent-error', data);
  }
}
