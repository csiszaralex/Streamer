import { Download, Edit, Film, Folder } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { EditMetadataDialog } from './EditMetadataDialog';

interface MediaCardProps {
  entry: {
    name: string;
    type: 'file' | 'folder';
    path: string;
  };
}

export function MediaCard({ entry }: MediaCardProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const isFolder = entry.type === 'folder';
  // If folder -> /browse/path, if file -> /watch?path=...
  // Note: Backend provides relative path, we append it
  const linkTarget = isFolder
    ? `/browse/${entry.path}`
    : `/watch?path=${encodeURIComponent(entry.path)}`; // Player handles this

  const handleDownload = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Trigger download
    const downloadUrl = `/api/videos/download?path=${encodeURIComponent(entry.path)}`;
    window.open(downloadUrl, '_blank');
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsEditDialogOpen(true);
  };

  return (
    <>
      <Link
        to={linkTarget}
        className={cn(
          'relative flex flex-col items-center justify-between p-4 rounded-xl transition-all duration-200 group aspect-square border',
          'bg-surface border-slate-700 hover:bg-slate-700 hover:border-slate-500 hover:scale-105 shadow-lg',
        )}
      >
        {!isFolder && (
          <div className='absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10'>
            <button
              onClick={handleEdit}
              className='p-1.5 bg-slate-800/80 rounded-full text-slate-300 hover:text-white hover:bg-blue-600 transition-colors'
              title='Edit Metadata'
            >
              <Edit size={16} />
            </button>
            <button
              onClick={handleDownload}
              className='p-1.5 bg-slate-800/80 rounded-full text-slate-300 hover:text-white hover:bg-green-600 transition-colors'
              title='Download'
            >
              <Download size={16} />
            </button>
          </div>
        )}

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

      {!isFolder && (
        <EditMetadataDialog
          isOpen={isEditDialogOpen}
          onClose={() => setIsEditDialogOpen(false)}
          filePath={entry.path}
          onSave={() => {
            // Optional: Refresh list or show success toast
            console.log('Metadata saved');
          }}
        />
      )}
    </>
  );
}
