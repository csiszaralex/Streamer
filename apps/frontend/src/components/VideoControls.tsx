import { Maximize, Pause, Play, Volume2, VolumeX } from 'lucide-react';
import { formatTime } from '../lib/format';
import { cn } from '../lib/utils';

interface VideoControlsProps {
  showControls: boolean;
  isPlaying: boolean;
  isMuted: boolean;
  volume: number;
  currentTime: number;
  duration: number;
  buffered: number;
  title?: string;
  isTranscoded?: boolean;
  onPlayPause: () => void;
  onSeek: (value: number) => void;
  onVolumeChange: (value: number) => void;
  onToggleMute: () => void;
  onToggleFullscreen: () => void;
}

export function VideoControls({
  showControls,
  isPlaying,
  isMuted,
  volume,
  currentTime,
  duration,
  buffered,
  title,
  isTranscoded,
  onPlayPause,
  onSeek,
  onVolumeChange,
  onToggleMute,
  onToggleFullscreen,
}: VideoControlsProps) {
  return (
    <div
      className={cn(
        'absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/90 to-transparent px-6 pb-6 pt-20 transition-opacity duration-300',
        showControls ? 'opacity-100' : 'opacity-0 cursor-none',
      )}
      onClick={(e) => e.stopPropagation()} // Prevent click from pausing video
    >
      {/* Progress Bar (Custom Slider) */}
      <div className='relative group/slider mb-4 h-4 flex items-center cursor-pointer'>
        <input
          type='range'
          min={0}
          max={duration}
          value={currentTime}
          onChange={(e) => onSeek(Number(e.target.value))}
          className='absolute w-full h-full opacity-0 z-20 cursor-pointer'
        />
        {/* Visual Track (Gray background) */}
        <div className='w-full h-1 bg-gray-600/50 rounded-full group-hover/slider:h-2 transition-all overflow-hidden relative'>
          {/* 1. LAYER: BUFFERED BAR (Light gray) */}
          <div
            className='absolute top-0 left-0 h-full bg-gray-400/80 rounded-full transition-all duration-500 ease-out'
            style={{ width: `${(buffered / duration) * 100}%` }}
          />

          {/* 2. LAYER: PROGRESS FILL (Red) */}
          <div
            className='absolute top-0 left-0 h-full bg-red-600 rounded-full z-10'
            style={{ width: `${(currentTime / duration) * 100}%` }}
          />
        </div>
        {/* Thumb (sphere) - visible on hover */}
        <div
          className='absolute w-4 h-4 bg-red-600 rounded-full shadow pointer-events-none opacity-0 group-hover/slider:opacity-100 transition-opacity'
          style={{ left: `${(currentTime / duration) * 100}%`, transform: 'translateX(-50%)' }}
        />
      </div>

      {/* Buttons Row */}
      <div className='flex items-center justify-between text-white'>
        <div className='flex items-center gap-6'>
          <button onClick={onPlayPause} className='hover:text-red-500 transition'>
            {isPlaying ? (
              <Pause size={32} fill='currentColor' />
            ) : (
              <Play size={32} fill='currentColor' />
            )}
          </button>

          {/* Volume */}
          <div className='flex items-center gap-2 group/vol'>
            <button onClick={onToggleMute}>
              {isMuted || volume === 0 ? <VolumeX size={24} /> : <Volume2 size={24} />}
            </button>
            <input
              type='range'
              min='0'
              max='1'
              step='0.1'
              value={isMuted ? 0 : volume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
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
            {title}
          </h2>

          {/* Quality Badge */}
          {title && (
            <span className='px-2 py-0.5 rounded border border-gray-500 text-xs font-bold text-gray-400'>
              {isTranscoded ? 'CONVERTED' : 'DIRECT'}
            </span>
          )}

          <button onClick={onToggleFullscreen} className='hover:text-white transition'>
            <Maximize size={24} />
          </button>
        </div>
      </div>
    </div>
  );
}
