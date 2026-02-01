import type { VideoMetadata } from '@stream/api-types';
import axios from 'axios';
import { Save, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-xl font-semibold text-white">Edit Metadata</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="text-center text-slate-400 py-8">Loading...</div>
          ) : (
            <>
              {/* Display Name */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-300">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  placeholder="Movie Title"
                />
              </div>

              {/* Year */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-300">Year</label>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(e.target.value === '' ? '' : parseInt(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  placeholder="e.g. 2023"
                />
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-300">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white resize-none focus:outline-none focus:border-blue-500"
                  placeholder="Enter request description..."
                />
              </div>

              {/* Tags */}
              <div className="space-y-1 relative">
                <label className="text-sm font-medium text-slate-300">Tags</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {tags.map(tag => (
                    <span key={tag} className="inline-flex items-center bg-blue-600/20 text-blue-300 px-2 py-1 rounded-full text-sm border border-blue-600/30">
                      {tag}
                      <button onClick={() => removeTag(tag)} className="ml-1 hover:text-white">
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="relative">
                  <input
                    ref={tagInputRef}
                    type="text"
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
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    placeholder="Add tag..."
                  />
                  {showTagSuggestions && tagInput && filteredTags.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl max-h-40 overflow-y-auto">
                      {filteredTags.map(tag => (
                        <button
                          key={tag}
                          onClick={() => addTag(tag)}
                          className="w-full text-left px-3 py-2 text-slate-300 hover:bg-slate-700 hover:text-white"
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

        <div className="p-4 border-t border-slate-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading || saving}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <Save size={18} />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
