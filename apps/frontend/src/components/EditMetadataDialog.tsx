import type { VideoMetadata } from '@stream/api-types';
import axios from 'axios';
import { Save, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';

interface EditMetadataDialogProps {
  isOpen: boolean;
  onClose: () => void;
  filePath: string;
  onSave: () => void;
}

export function EditMetadataDialog({ isOpen, onClose, filePath, onSave }: EditMetadataDialogProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [year, setYear] = useState<number | ''>('');
  const [tags, setTags] = useState<string[]>([]);

  // Tag autocomplete
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const tagInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && filePath) {
      loadMetadata();
      loadTags();
    }
  }, [isOpen, filePath]);

  const loadMetadata = async () => {
    setLoading(true);
    try {
      // Direct axios call or use api wrapper if I knew its structure. Using axios for now.
      const res = await axios.get<VideoMetadata>(`/api/videos/metadata?path=${encodeURIComponent(filePath)}`);
      const data = res.data;
      setDisplayName(data.displayName || data.filename || '');
      setDescription(data.description || '');
      setYear(data.year || '');
      setTags(data.tags || []);
    } catch (error) {
      console.error('Failed to load metadata', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTags = async () => {
    try {
      const res = await axios.get<string[]>('/api/videos/tags');
      setAvailableTags(res.data);
    } catch (error) {
      console.error('Failed to load tags', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.post(`/api/videos/metadata?path=${encodeURIComponent(filePath)}`, {
        displayName,
        description,
        year: year === '' ? undefined : Number(year),
        tags
      });
      onSave();
      onClose();
    } catch (error) {
      console.error('Failed to save metadata', error);
      alert('Failed to save metadata');
    } finally {
      setSaving(false);
    }
  };

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
    }
    setTagInput('');
    setShowTagSuggestions(false);
    tagInputRef.current?.focus();
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const filteredTags = availableTags.filter(t =>
    t.toLowerCase().includes(tagInput.toLowerCase()) && !tags.includes(t)
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Metadata</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {loading ? (
            <div className="text-center text-muted-foreground py-8">Loading...</div>
          ) : (
            <>
              {/* Display Name */}
              <div className="space-y-2">
                <Label>Display Name</Label>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Movie Title"
                />
              </div>

              {/* Year */}
              <div className="space-y-2">
                <Label>Year</Label>
                <Input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(e.target.value === '' ? '' : parseInt(e.target.value))}
                  placeholder="e.g. 2023"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="resize-none"
                  placeholder="Enter video description..."
                />
              </div>

              {/* Tags */}
              <div className="space-y-2 relative">
                <Label>Tags</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="px-2 py-1 gap-1">
                      {tag}
                      <button onClick={() => removeTag(tag)} className="hover:text-destructive transition-colors rounded-full p-0.5">
                        <X size={12} />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="relative">
                  <Input
                    ref={tagInputRef}
                    value={tagInput}
                    onChange={(e) => {
                      setTagInput(e.target.value);
                      setShowTagSuggestions(true);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && tagInput) {
                        e.preventDefault();
                        addTag(tagInput);
                      }
                      if (e.key === 'Tab' && filteredTags.length > 0) {
                          e.preventDefault();
                          addTag(filteredTags[0]);
                      }
                    }}
                    onFocus={() => setShowTagSuggestions(true)}
                    // Delay blur to allow clicking suggestions
                    onBlur={() => setTimeout(() => setShowTagSuggestions(false), 200)}
                    placeholder="Add tag..."
                  />
                  {showTagSuggestions && tagInput && filteredTags.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-popover border border-border rounded-md shadow-md max-h-40 overflow-y-auto">
                      {filteredTags.map(tag => (
                        <button
                          key={tag}
                          onClick={() => addTag(tag)}
                          className="w-full text-left px-3 py-2 text-sm text-popover-foreground hover:bg-accent hover:text-accent-foreground"
                          // Use onMouseDown to prevent blur from firing before click
                          onMouseDown={(e) => e.preventDefault()}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading || saving}>
            {saving ? <span className="animate-spin mr-2">⏳</span> : <Save size={16} className="mr-2" />}
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
