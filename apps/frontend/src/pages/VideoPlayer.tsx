import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import screenfull from 'screenfull';
import { toast } from 'sonner';
import { VideoControls } from '../components/VideoControls';
import { Button } from '../components/ui/button';
import { videoApi } from '../lib/api';
import { cn } from '../lib/utils';

export default function VideoPlayer() {
  const [searchParams] = useSearchParams();
  const path = searchParams.get('path') || '';
  const navigate = useNavigate();

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- STATE ---
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0); // Ez a "Látszólagos" idő
  const [seekOffset, setSeekOffset] = useState(0); // Az eltolás (MKV hack)
  const [showControls, setShowControls] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [buffered, setBuffered] = useState(0);

  // --- ADATLEKÉRÉS (Metadata) ---
  const { data: metadata, isLoading: metaLoading } = useQuery({
    queryKey: ['metadata', path],
    queryFn: () => videoApi.getMetadata(path),
    enabled: !!path,
  });

  // Ha nincs path, vissza a böngészőbe
  useEffect(() => {
    if (!path) navigate('/browse');
  }, [path, navigate]);

  // --- CALCULATED PROPS ---
  const isTranscoded =
    metadata && !['mp4', 'webm', 'mov'].includes(metadata.container.split(',')[0]);
  const duration = metadata?.duration || 0;

  // Stream URL generálása
  // Ha transzkódolt és van offset, akkor ?start=XX paraméterrel hívjuk
  const streamUrl = `/api/videos/stream?path=${encodeURIComponent(path)}${
    isTranscoded && seekOffset > 0 ? `&start=${seekOffset}` : ''
  }`;

  // --- PLAYER LOGIC ---

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    // A látszólagos idő = offset + a videóelem belső ideje
    setCurrentTime(seekOffset + videoRef.current.currentTime);
  };

  const handleSeek = (value: number) => {
    if (!videoRef.current) return;

    // Optimista UI frissítés
    setCurrentTime(value);

    if (isTranscoded) {
      // MKV LOGIKA: Újratöltjük a streamet az új pozícióból
      setSeekOffset(value);
      toast.info(`Seeking to ${Math.floor(value)}s...`);
      // A video elem ideje 0-ra ugrik majd, de a seekOffset miatt a UI jót mutat
      // Fontos: AutoPlay kell az újratöltés után
    } else {
      // MP4 LOGIKA: Sima natív seek
      videoRef.current.currentTime = value;
    }
  };

  const handleProgress = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    // A 'buffered' egy TimeRanges objektum (több szakasz is lehet)
    if (video.buffered.length > 0) {
      // Megkeressük azt a szakaszt, amit éppen nézünk
      // Mivel a video.currentTime transzkódolásnál "relatív" (0-tól indul),
      // a buffer is relatív lesz.
      const currentVidTime = video.currentTime;

      for (let i = 0; i < video.buffered.length; i++) {
        // Ha a jelenlegi lejátszási idő benne van ebben a buffer tartományban
        if (video.buffered.start(i) <= currentVidTime && video.buffered.end(i) >= currentVidTime) {
          // A buffer vége + az offset (ha volt tekerés)
          const absoluteBufferEnd = video.buffered.end(i) + seekOffset;
          setBuffered(absoluteBufferEnd);
          break;
        }
      }
    }
  };

  const toggleFullscreen = () => {
    if (containerRef.current && screenfull.isEnabled) {
      screenfull.toggle(containerRef.current);
    }
  };

  // Egérmozgásra előbújnak a gombok
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 2500); // 2.5mp inaktivitás után eltűnik
  };

  // --- KEYBOARD SHORTCUTS ---
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault(); // Ne görgessen
        togglePlay();
      }
      if (e.code === 'ArrowRight') handleSeek(Math.min(currentTime + 10, duration));
      if (e.code === 'ArrowLeft') handleSeek(Math.max(currentTime - 10, 0));
      if (e.code === 'KeyF') toggleFullscreen();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [togglePlay, currentTime, duration]);

  // --- RENDER ---

  if (metaLoading)
    return (
      <div className='h-screen bg-black flex items-center justify-center text-white'>
        <Loader2 className='animate-spin mr-2' /> Loading metadata...
      </div>
    );

  return (
    <div
      ref={containerRef}
      className='relative w-full h-screen bg-black overflow-hidden group select-none'
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      onDoubleClick={toggleFullscreen}
      onClick={togglePlay} // Kattintásra play/pause
    >
      {/* --- VIDEO ELEMENT --- */}
      <video
        ref={videoRef}
        src={streamUrl}
        className='w-full h-full object-contain'
        autoPlay
        onPlay={() => {
            setIsPlaying(true);
        }}
        onPause={() => {
            setIsPlaying(false);
        }}
        onTimeUpdate={handleTimeUpdate}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => setIsBuffering(false)}
        onEnded={() => {
          // Itt jöhet majd a "Next Video" logika
          setIsPlaying(false);
          setShowControls(true);
        }}
        onProgress={handleProgress}
      />

      {/* --- BUFFERING SPINNER --- */}
      {isBuffering && (
        <div className='absolute inset-0 flex items-center justify-center pointer-events-none bg-black/20'>
          <Loader2 className='w-16 h-16 text-white animate-spin drop-shadow-lg' />
        </div>
      )}

      {/* --- CONTROLS OVERLAY --- */}
      <VideoControls
        showControls={showControls}
        isPlaying={isPlaying}
        isMuted={isMuted}
        volume={volume}
        currentTime={currentTime}
        duration={duration}
        buffered={buffered}
        title={metadata?.filename}
        displayName={metadata?.displayName}
        tags={metadata?.tags}
        isTranscoded={isTranscoded}
        onPlayPause={togglePlay}
        onSeek={handleSeek}
        onVolumeChange={(val) => {
          setVolume(val);
          if (videoRef.current) videoRef.current.volume = val;
          setIsMuted(val === 0);
        }}
        onToggleMute={() => {
          const nextState = !isMuted;
          setIsMuted(nextState);
          if (videoRef.current) {
            videoRef.current.muted = nextState;
          }
        }}
        onToggleFullscreen={toggleFullscreen}
      />

      {/* Back Button (Top Left) */}
      <Button
        variant="ghost"
        size="icon"
        onClick={(e) => {
          e.stopPropagation();
          navigate(-1);
        }}
        className={cn(
          'absolute top-4 left-4 h-12 w-12 bg-black/50 hover:bg-black/80 rounded-full text-white backdrop-blur-sm transition-opacity duration-300 z-50',
          showControls ? 'opacity-100' : 'opacity-0',
        )}
      >
        <ArrowLeft size={24} />
      </Button>
    </div>
  );
}
