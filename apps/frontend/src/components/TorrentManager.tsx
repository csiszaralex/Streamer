import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { AlertCircle, ChevronDown, ChevronUp, Download } from 'lucide-react';
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';

interface TorrentInfo {
  infoHash: string;
  name: string;
  progress: number;
  downloadSpeed: number;
  peers: number;
  state: 'downloading' | 'paused' | 'done' | 'error';
  error?: string;
}

const SOCKET_URL = import.meta.env.DEV ? 'http://localhost:3000' : '/';

export function TorrentManager() {
  const [_socket, setSocket] = useState<Socket | null>(null);
  const [torrents, setTorrents] = useState<Map<string, TorrentInfo>>(new Map());
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasConnectionError, setHasConnectionError] = useState(false);

  useEffect(() => {
    const newSocket = io(SOCKET_URL, {
        reconnectionDelayMax: 10000,
        transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      console.log('Connected to WebSocket');
      setHasConnectionError(false);
    });

    newSocket.on('connect_error', (err) => {
        console.error('WebSocket connection error:', err);
        setHasConnectionError(true);
    });

    newSocket.on('torrent-list', (data: TorrentInfo[]) => {
      const newMap = new Map(data.map(t => [t.infoHash, t]));
      setTorrents(newMap);
      if (data.length > 0 && data.some(t => t.state === 'downloading')) {
          setIsExpanded(true);
      }
    });

    newSocket.on('torrent-added', (data: TorrentInfo) => {
      setTorrents(prev => {
          const next = new Map(prev);
          next.set(data.infoHash, data);
          return next;
      });
      setIsExpanded(true);
      toast.info(`Download started: ${data.name}`);
    });

    newSocket.on('torrent-progress', (data: TorrentInfo) => {
      setTorrents(prev => {
          const next = new Map(prev);
          // Only update if exists or just let it set
          next.set(data.infoHash, data);
          return next;
      });
    });

    newSocket.on('torrent-done', (data: TorrentInfo) => {
      setTorrents(prev => {
          const next = new Map(prev);
          next.set(data.infoHash, data);
          return next;
      });
      toast.success(`Download finished: ${data.name}`);
    });

    newSocket.on('torrent-error', (data: TorrentInfo) => {
        setTorrents(prev => {
            const next = new Map(prev);
            next.set(data.infoHash, data);
            return next;
        });
        toast.error(`Download failed: ${data.name}`);
      });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  const torrentList = Array.from(torrents.values());
  const activeCount = torrentList.filter(t => t.state === 'downloading' || t.state === 'paused').length;

  if (torrentList.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 md:w-96">
      <Card className="shadow-2xl border-t-4 border-t-primary">
        <CardHeader className="p-3 bg-muted/50">
            <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    Downloads ({activeCount})
                </CardTitle>
                <div className="flex items-center gap-1">
                     {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                </div>
            </div>
        </CardHeader>

        {isExpanded && (
            <CardContent className="p-3 max-h-[60vh] overflow-y-auto space-y-4">
                {hasConnectionError && (
                    <div className="text-xs text-destructive mb-2 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Connection lost
                    </div>
                )}

                {torrentList.map(torrent => (
                    <div key={torrent.infoHash} className="space-y-1">
                        <div className="flex justify-between items-start text-xs">
                            <span className="font-medium truncate max-w-[70%]" title={torrent.name}>{torrent.name}</span>
                            <span className={cn(
                                "capitalize",
                                torrent.state === 'done' ? "text-green-500" :
                                torrent.state === 'error' ? "text-destructive" :
                                "text-muted-foreground"
                            )}>{torrent.state}</span>
                        </div>

                        <Progress value={torrent.progress} className="h-1.5" />

                        <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                            <span>{torrent.progress}%</span>
                            {torrent.state === 'downloading' && (
                                <div className="flex gap-2">
                                    <span>{(torrent.downloadSpeed / 1024 / 1024).toFixed(1)} MB/s</span>
                                    <span>{torrent.peers} peers</span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </CardContent>
        )}
      </Card>
    </div>
  );
}
