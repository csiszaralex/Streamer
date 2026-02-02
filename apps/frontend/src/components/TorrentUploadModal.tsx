import { useMutation } from '@tanstack/react-query';
import { FileUp, Upload, X } from 'lucide-react';
import { useState } from 'react';
import { videoApi } from '../lib/api';
import { cn } from '../lib/utils'; // Assuming you have a utils file for cn
import { Button } from './ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from './ui/dialog';
import { Input } from './ui/input';

interface TorrentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TorrentUploadModal({ isOpen, onClose }: TorrentUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const uploadMutation = useMutation({
    mutationFn: (file: File) => videoApi.uploadTorrent(file),
    onSuccess: () => {
      // Maybe invalidate query to refresh file list if it appears immediately,
      // but torrents take time. Just closing for now.
      onClose();
      setFile(null);
      alert('Torrent added successfully!');
    },
    onError: (error) => {
      console.error('Upload failed', error);
      alert('Failed to upload torrent.');
    },
  });

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.endsWith('.torrent')) {
        setFile(droppedFile);
      } else {
        alert('Please upload a .torrent file');
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
    }
  };

  const handleUpload = () => {
    if (file) {
      uploadMutation.mutate(file);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Upload Torrent</DialogTitle>
          <DialogDescription>
            Drag and drop a .torrent file here or click to browse.
          </DialogDescription>
        </DialogHeader>

        <div
          className={cn(
            "grid gap-4 py-4 border-2 border-dashed rounded-lg text-center transition-colors px-6 cursor-pointer", // Added missing classes
            isDragging ? "border-primary bg-primary/10" : "border-muted-foreground/25 hover:border-primary/50"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => document.getElementById('file-upload')?.click()}
        >
          <div className="flex flex-col items-center justify-center gap-2 py-8">
            {file ? (
                <>
                    <FileUp className="h-10 w-10 text-primary" />
                    <div className="text-sm font-medium">{file.name}</div>
                    <Button variant="ghost" size="sm" onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                    }}>
                        <X className="h-4 w-4 mr-2" /> Remove
                    </Button>
                </>
            ) : (
                <>
                    <Upload className="h-10 w-10 text-muted-foreground" />
                    <div className="text-sm text-muted-foreground">
                        Drag & drop or click to select
                    </div>
                </>
            )}
            <Input
              id="file-upload"
              type="file"
              accept=".torrent"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleUpload} disabled={!file || uploadMutation.isPending}>
            {uploadMutation.isPending ? 'Uploading...' : 'Upload'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
