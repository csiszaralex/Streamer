import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Maximize, Pause, Play, Volume2, VolumeX } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import screenfull from 'screenfull';
import { videoApi } from '../lib/api';
import { formatTime } from '../lib/format';
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
      onClick={togglePlay} // Kattintásra play/pause
    >
      {/* --- VIDEO ELEMENT --- */}
      <video
        ref={videoRef}
        src={streamUrl}
        className='w-full h-full object-contain'
        autoPlay
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
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
      <div
        className={cn(
          'absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/90 to-transparent px-6 pb-6 pt-20 transition-opacity duration-300',
          showControls ? 'opacity-100' : 'opacity-0 cursor-none',
        )}
        onClick={(e) => e.stopPropagation()} // Hogy a gombokra kattintás ne állítsa meg a videót
      >
        {/* Progress Bar (Custom Slider) */}
        <div className='relative group/slider mb-4 h-4 flex items-center cursor-pointer'>
          <input
            type='range'
            min={0}
            max={duration}
            value={currentTime}
            onChange={(e) => handleSeek(Number(e.target.value))}
            className='absolute w-full h-full opacity-0 z-20 cursor-pointer'
          />
          {/* Visual Track (Szürke háttér) */}
          <div className='w-full h-1 bg-gray-600/50 rounded-full group-hover/slider:h-2 transition-all overflow-hidden relative'>
            {/* 1. RÉTEG: BUFFERED BAR (Világosszürke) */}
            <div
              className='absolute top-0 left-0 h-full bg-gray-400/80 rounded-full transition-all duration-500 ease-out'
              style={{ width: `${(buffered / duration) * 100}%` }}
            />

            {/* 2. RÉTEG: PROGRESS FILL (Piros) */}
            <div
              className='absolute top-0 left-0 h-full bg-red-600 rounded-full z-10'
              style={{ width: `${(currentTime / duration) * 100}%` }}
            />
          </div>
          {/* Thumb (gömb) - csak hoverkor látszik */}
          <div
            className='absolute w-4 h-4 bg-red-600 rounded-full shadow pointer-events-none opacity-0 group-hover/slider:opacity-100 transition-opacity'
            style={{ left: `${(currentTime / duration) * 100}%`, transform: 'translateX(-50%)' }}
          />
        </div>

        {/* Buttons Row */}
        <div className='flex items-center justify-between text-white'>
          <div className='flex items-center gap-6'>
            <button onClick={togglePlay} className='hover:text-red-500 transition'>
              {isPlaying ? (
                <Pause size={32} fill='currentColor' />
              ) : (
                <Play size={32} fill='currentColor' />
              )}
            </button>

            {/* Volume */}
            <div className='flex items-center gap-2 group/vol'>
              <button
                onClick={() => {
                  const nextState = !isMuted;
                  setIsMuted(nextState);

                  if (videoRef.current) {
                    videoRef.current.muted = nextState;
                  }
                }}
              >
                {isMuted || volume === 0 ? <VolumeX size={24} /> : <Volume2 size={24} />}
              </button>
              <input
                type='range'
                min='0'
                max='1'
                step='0.1'
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setVolume(val);
                  if (videoRef.current) videoRef.current.volume = val;
                  setIsMuted(val === 0);
                }}
                className='w-0 overflow-hidden group-hover/vol:w-24 transition-all h-1 bg-gray-400 accent-white rounded-full ml-2'
              />
            </div>

            <span className='text-sm font-medium font-mono text-gray-300'>
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className='flex items-center gap-4'>
            {/* Title */}
            <h2 className='text-sm font-semibold text-gray-300 hidden md:block max-w-md truncate'>
              {metadata?.filename}
            </h2>

            {/* Quality Badge */}
            {metadata && (
              <span className='px-2 py-0.5 rounded border border-gray-500 text-xs font-bold text-gray-400'>
                {isTranscoded ? 'CONVERTED' : 'DIRECT'}
              </span>
            )}

            <button onClick={toggleFullscreen} className='hover:text-white transition'>
              <Maximize size={24} />
            </button>
          </div>
        </div>
      </div>

      {/* Back Button (Top Left) */}
      <button
        onClick={() => navigate(-1)}
        className={cn(
          'absolute top-4 left-4 p-3 bg-black/50 hover:bg-black/80 rounded-full text-white backdrop-blur-sm transition-opacity duration-300 z-50',
          showControls ? 'opacity-100' : 'opacity-0',
        )}
      >
        <ArrowLeft size={24} />
      </button>
    </div>
  );
}
