import { Film, Folder } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';

interface MediaCardProps {
  entry: {
    name: string;
    type: 'file' | 'folder';
    path: string;
  };
}

export function MediaCard({ entry }: MediaCardProps) {
  const isFolder = entry.type === 'folder';
  // If folder -> /browse/path, if file -> /watch?path=...
  // Note: Backend provides relative path, we append it
  const linkTarget = isFolder
    ? `/browse/${entry.path}`
    : `/watch?path=${encodeURIComponent(entry.path)}`; // Player handles this

  return (
    <Link
      to={linkTarget}
      className={cn(
        'flex flex-col items-center justify-between p-4 rounded-xl transition-all duration-200 group aspect-square border',
        'bg-surface border-slate-700 hover:bg-slate-700 hover:border-slate-500 hover:scale-105 shadow-lg',
      )}
    >
      <div className='flex-1 flex items-center justify-center w-full'>
        {isFolder ? (
          <Folder
            size={48}
            className='text-yellow-500 group-hover:text-yellow-400 drop-shadow-lg'
          />
        ) : (
          <div className='relative'>
            <Film size={48} className='text-blue-500 group-hover:text-blue-400 drop-shadow-lg' />
            {/* Badge could go here, e.g. 4K */}
          </div>
        )}
      </div>

      <div className='w-full mt-3 text-center'>
        <p className='text-sm font-medium text-gray-200 truncate w-full' title={entry.name}>
          {entry.name}
        </p>
        {/* If file, could show size if backend sends it in the list */}
      </div>
    </Link>
  );
}
