import { Maximize, Pause, Play, Volume2, VolumeX } from 'lucide-react';
import { formatTime } from '../lib/format';
import { cn } from '../lib/utils';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

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
  displayName?: string;
  tags?: string[];
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
  displayName,
  tags,
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
      <div className='relative group/slider mb-4 flex items-center cursor-pointer'>
        <Slider
          value={[currentTime]}
          max={duration}
          step={1}
          onValueChange={(vals) => onSeek(Array.isArray(vals) ? vals[0] : (vals as number))}
          className="w-full relative z-20"
        />
        {/* Buffered Bar - Positioned absolutely under the slider track */}
        <div className='absolute top-1/2 -translate-y-1/2 left-0 w-full h-1.5 rounded-full overflow-hidden pointer-events-none px-[1px]'>
             <div
                className='h-full bg-white/20 rounded-full transition-all duration-500 ease-out'
                style={{ width: `${(buffered / duration) * 100}%` }}
             />
        </div>
      </div>

      {/* Buttons Row */}
      <div className='flex items-center justify-between text-white'>
        <div className='flex items-center gap-4'>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Button variant="ghost" size="icon" onClick={onPlayPause} className='text-white hover:text-primary hover:bg-white/10'>
                    {isPlaying ? (
                    <Pause size={24} fill='currentColor' />
                    ) : (
                    <Play size={24} fill='currentColor' />
                    )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isPlaying ? 'Pause' : 'Play'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Volume */}
          <div className='flex items-center gap-2 group/vol'>
             <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Button variant="ghost" size="icon" onClick={onToggleMute} className="text-white hover:text-white hover:bg-white/10">
                        {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{isMuted ? 'Unmute' : 'Mute'}</p>
                  </TooltipContent>
                </Tooltip>
             </TooltipProvider>

            <div className='w-0 overflow-hidden group-hover/vol:w-24 transition-all duration-300 pl-2'>
                <Slider
                    value={[isMuted ? 0 : volume]}
                    max={1}
                    step={0.1}
                    onValueChange={(vals) => onVolumeChange(Array.isArray(vals) ? vals[0] : (vals as number))}
                    className="w-24"
                />
            </div>
          </div>

          <span className='text-sm font-medium font-mono text-gray-300 ml-2'>
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>

        <div className='flex items-center gap-4'>
           {/* Metadata Info */}
           <div className="flex flex-col items-end mr-2 text-right hidden md:flex">
              <h2 className='text-sm font-semibold text-gray-200 max-w-md truncate'>
                {displayName || title}
              </h2>
              <div className="flex items-center gap-2">
                 {displayName && title && (
                   <span className="text-xs text-gray-400 truncate max-w-[200px]">{title}</span>
                 )}
                 {tags?.map(tag => (
                   <Badge key={tag} variant="secondary" className="px-1 text-[10px] h-4 bg-white/20 hover:bg-white/30 text-white border-transparent">
                     {tag}
                   </Badge>
                 ))}
              </div>
           </div>

          {/* Quality Badge */}
          {title && (
            <Badge variant="outline" className='text-xs font-bold text-gray-400 border-gray-500 shrink-0'>
              {isTranscoded ? 'CONVERTED' : 'DIRECT'}
            </Badge>
          )}

          <TooltipProvider>
            <Tooltip>
                <TooltipTrigger>
                    <Button variant="ghost" size="icon" onClick={onToggleFullscreen} className='text-white hover:text-white hover:bg-white/10'>
                        <Maximize size={20} />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Fullscreen</p>
                </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

      </div>
    </div>
  );
}
