import { useRef, useState } from 'react';
import { useDiaryStore } from '../../../lib/store';
import { PRESET_TAGS } from '../../../lib/constants';
import { useMediaCapture } from '../hooks/useMediaCapture';
import type { MediaFile } from '../../../lib/types/index';

interface NewEntryModalProps {
  onClose: () => void;
}

const NewEntryModal = ({ onClose }: NewEntryModalProps) => {
  const { createDraftEntry } = useDiaryStore();
  const [header, setHeader] = useState('');
  const [text, setText] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [recordedMedia, setRecordedMedia] = useState<MediaFile[]>([]);

  const { isRecording, startVoiceRecord, stopVoiceRecord, filesToMedia } = useMediaCapture();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const togglePresetTag = (tag: string) => {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const handleAddTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) {
      setTags([...tags, t]);
      setTagInput('');
    }
  };

  const handleVoice = async () => {
    try {
      if (isRecording) {
        const m = await stopVoiceRecord();
        setRecordedMedia((prev) => [...prev, m]);
      } else {
        await startVoiceRecord();
      }
    } catch {
      alert('Unable to access microphone');
    }
  };

  const addFiles = (files: FileList | null, type: MediaFile['type']) => {
    if (!files?.length) return;
    setRecordedMedia((prev) => [...prev, ...filesToMedia(files, type)]);
  };

  const handleSubmit = async () => {
    try {
      await createDraftEntry({
        header: header.trim() || undefined,
        text: text.trim() || undefined,
        tags,
        media: recordedMedia.length ? recordedMedia : undefined,
      });

      onClose();
    } catch (err) {
      alert('Error creating entry');
      console.error(err);
    }
  };

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet-panel max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-amber-400">Full entry</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-200 text-2xl">
            ✕
          </button>
        </div>

        <input
          type="text"
          placeholder="Header (optional — e.g. HT76CBGP)"
          value={header}
          onChange={(e) => setHeader(e.target.value)}
          className="input-base w-full mb-3"
        />

        <textarea
          placeholder="Notes (optional)"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="input-base w-full mb-3 h-24"
        />

        <div className="mb-3">
          <p className="text-sm text-gray-400 mb-2">Tags</p>
          <div className="flex flex-wrap gap-2 mb-2">
            {PRESET_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => togglePresetTag(tag)}
                className={`px-3 py-1 rounded text-sm ${
                  tags.includes(tag) ? 'bg-amber-400 text-slate-900' : 'bg-slate-700 text-gray-300'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Custom tag"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
              className="input-base flex-1"
            />
            <button type="button" onClick={handleAddTag} className="btn-primary">
              Add
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <button
            type="button"
            onClick={() => void handleVoice()}
            className={isRecording ? 'btn-danger' : 'btn-secondary'}
          >
            {isRecording ? '⏹ Stop' : '🎤 Voice'}
          </button>
          <button type="button" onClick={() => photoInputRef.current?.click()} className="btn-secondary">
            📷 Photo
          </button>
          <button type="button" onClick={() => videoInputRef.current?.click()} className="btn-secondary">
            🎥 Video
          </button>
          <button type="button" onClick={() => fileInputRef.current?.click()} className="btn-secondary">
            📎 File
          </button>
        </div>

        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          className="hidden"
          onChange={(e) => addFiles(e.target.files, 'photo')}
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          capture="environment"
          multiple
          className="hidden"
          onChange={(e) => addFiles(e.target.files, 'video')}
        />
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => addFiles(e.target.files, 'file')}
        />

        {recordedMedia.length > 0 && (
          <p className="text-sm text-gray-400 mb-3">{recordedMedia.length} file(s) attached</p>
        )}

        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button type="button" onClick={() => void handleSubmit()} className="btn-primary">
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewEntryModal;
