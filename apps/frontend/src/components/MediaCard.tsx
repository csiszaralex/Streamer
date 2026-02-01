import { Download, Edit, Film, Folder } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { EditMetadataDialog } from './EditMetadataDialog';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';

import { Badge } from './ui/badge';

interface MediaCardProps {
  entry: {
    name: string;
    type: 'file' | 'folder';
    path: string;
    displayName?: string;
    tags?: string[];
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
      <Link to={linkTarget} className="block group">
        <Card className={cn(
          'relative flex flex-col items-center justify-between p-4 transition-all duration-200 aspect-square border-border/50',
          'bg-card hover:bg-accent/50 hover:border-accent hover:scale-105 shadow-md hover:shadow-xl'
        )}>
          {!isFolder && (
            <div className='absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10'>
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8 rounded-full bg-background/80 hover:bg-background hover:text-blue-500"
                onClick={handleEdit}
                title='Edit Metadata'
              >
                <Edit size={14} />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8 rounded-full bg-background/80 hover:bg-background hover:text-green-500"
                onClick={handleDownload}
                title='Download'
              >
                <Download size={14} />
              </Button>
            </div>
          )}

          <CardContent className='flex-1 flex items-center justify-center w-full p-0 relative'>
            {isFolder ? (
              <Folder
                size={48}
                className='text-yellow-500 group-hover:text-yellow-400 drop-shadow-md transition-colors'
              />
            ) : (
              <div className='relative flex flex-col items-center gap-2'>
                <Film size={48} className='text-blue-500 group-hover:text-blue-400 drop-shadow-md transition-colors' />

                {/* Tags Overlay - only show first 3 tags to avoid crowding */}
                {entry.tags && entry.tags.length > 0 && (
                  <div className="absolute top-12 pt-4 flex flex-wrap justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity w-full max-w-[140px]">
                    {entry.tags.slice(0, 3).map(tag => (
                      <Badge key={tag} variant="secondary" className="px-1 text-[10px] h-4">{tag}</Badge>
                    ))}
                    {entry.tags.length > 3 && (
                      <Badge variant="secondary" className="px-1 text-[10px] h-4">+{entry.tags.length - 3}</Badge>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>

          <div className='w-full mt-4 text-center'>
            <p className='text-sm font-medium text-foreground truncate w-full' title={entry.displayName || entry.name}>
              {entry.displayName || entry.name}
            </p>
            {entry.displayName && (
               <p className='text-xs text-muted-foreground truncate w-full' title={entry.name}>
                 {entry.name}
               </p>
            )}
          </div>
        </Card>
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
