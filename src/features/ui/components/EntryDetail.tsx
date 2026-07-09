import { useEffect, useRef, useState } from 'react';
import type { Entry, Reminder } from '../../../lib/types/index';
import { useDiaryStore } from '../../../lib/store';
import { PRESET_TAGS, isPlaceholderHeader } from '../../../lib/constants';
import { requestNotificationPermission } from '../../../lib/reminders';
import { useMediaCapture } from '../hooks/useMediaCapture';
import MediaPreview from './MediaPreview';

interface EntryDetailProps {
  entry: Entry;
  onClose: () => void;
}

const EntryDetail = ({ entry: initialEntry, onClose }: EntryDetailProps) => {
  const {
    updateEntry,
    updateEntryHeader,
    addMediaToEntry,
    removeMediaFromEntry,
    addReminderToEntry,
    loadEntryWithMedia,
  } = useDiaryStore();

  const [entry, setEntry] = useState(initialEntry);
  const [header, setHeader] = useState(initialEntry.header);
  const [editingHeader, setEditingHeader] = useState(isPlaceholderHeader(initialEntry.header));
  const [text, setText] = useState(initialEntry.text ?? '');
  const [tags, setTags] = useState<string[]>(initialEntry.tags);
  const [tagInput, setTagInput] = useState('');
  const [showReminderForm, setShowReminderForm] = useState(false);
  const [reminderMessage, setReminderMessage] = useState('');
  const [reminderTime, setReminderTime] = useState('09:00');

  const { isRecording, startVoiceRecord, stopVoiceRecord, filesToMedia } = useMediaCapture();
  const photoRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void loadEntryWithMedia(initialEntry.id).then((loaded) => {
      if (loaded) {
        setEntry(loaded);
        setHeader(loaded.header);
        setText(loaded.text ?? '');
        setTags(loaded.tags);
      }
    });
  }, [initialEntry.id, loadEntryWithMedia]);

  const persistTextAndTags = async () => {
    const updated = { ...entry, text, tags };
    await updateEntry(updated);
    setEntry(updated);
  };

  const saveHeader = async () => {
    await updateEntryHeader(entry.id, header);
    const updated = { ...entry, header: header.trim() || entry.header };
    setEntry(updated);
    setEditingHeader(false);
  };

  const toggleTag = async (tag: string) => {
    const next = tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag];
    setTags(next);
    const updated = { ...entry, tags: next };
    await updateEntry(updated);
    setEntry(updated);
  };

  const addCustomTag = async () => {
    const t = tagInput.trim();
    if (!t || tags.includes(t)) return;
    const next = [...tags, t];
    setTags(next);
    setTagInput('');
    const updated = { ...entry, tags: next };
    await updateEntry(updated);
    setEntry(updated);
  };

  const handleAddReminder = async () => {
    if (!reminderMessage.trim()) return;
    const ok = await requestNotificationPermission();
    if (!ok) {
      alert('Enable notifications to use reminders.');
      return;
    }

    const [hours, minutes] = reminderTime.split(':').map(Number);
    const scheduled = new Date();
    scheduled.setHours(hours, minutes, 0, 0);
    if (scheduled.getTime() <= Date.now()) {
      scheduled.setDate(scheduled.getDate() + 1);
    }

    const reminder: Reminder = {
      id: `reminder-${Date.now()}`,
      entryId: entry.id,
      message: reminderMessage,
      scheduledAt: scheduled.getTime(),
      completed: false,
      notificationShown: false,
    };

    await addReminderToEntry(entry.id, reminder);
    const updated = { ...entry, reminders: [...entry.reminders, reminder] };
    setEntry(updated);
    setReminderMessage('');
    setShowReminderForm(false);
  };

  const appendMedia = async (files: FileList | null, type: 'photo' | 'video' | 'file') => {
    if (!files?.length) return;
    for (const media of filesToMedia(files, type)) {
      await addMediaToEntry(entry.id, media);
    }
    const loaded = await loadEntryWithMedia(entry.id);
    if (loaded) setEntry(loaded);
  };

  const handleVoiceAppend = async () => {
    try {
      if (isRecording) {
        const m = await stopVoiceRecord();
        await addMediaToEntry(entry.id, m);
        const loaded = await loadEntryWithMedia(entry.id);
        if (loaded) setEntry(loaded);
      } else {
        await startVoiceRecord();
      }
    } catch {
      alert('Microphone access required.');
    }
  };

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet-panel" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />

        <div className="flex justify-between items-start mb-4">
          {editingHeader ? (
            <div className="flex-1 flex gap-2 mr-2">
              <input
                type="text"
                value={header}
                onChange={(e) => setHeader(e.target.value)}
                placeholder="Truck reg, invoice, etc."
                className="input-base flex-1"
                autoFocus
              />
              <button type="button" onClick={() => void saveHeader()} className="btn-primary shrink-0">
                Save
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setEditingHeader(true)}
              className="text-left flex-1"
            >
              <h2
                className={`text-2xl font-bold ${
                  isPlaceholderHeader(entry.header) ? 'text-gray-400 italic' : 'text-amber-400'
                }`}
              >
                {entry.header}
              </h2>
              <span className="text-xs text-gray-500">Tap to edit title</span>
            </button>
          )}
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-200 text-2xl">
            ✕
          </button>
        </div>

        <textarea
          placeholder="Notes"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => void persistTextAndTags()}
          className="input-base w-full mb-3 h-24"
        />

        <div className="mb-4">
          <p className="text-sm text-gray-400 mb-2">Tags</p>
          <div className="flex flex-wrap gap-2 mb-2">
            {PRESET_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => void toggleTag(tag)}
                className={`px-3 py-1 rounded text-sm ${
                  tags.includes(tag)
                    ? 'bg-amber-400 text-slate-900'
                    : 'bg-slate-700 text-gray-300'
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
              onKeyDown={(e) => e.key === 'Enter' && addCustomTag()}
              className="input-base flex-1"
            />
            <button type="button" onClick={() => void addCustomTag()} className="btn-secondary">
              Add
            </button>
          </div>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-400 mb-2">Add more</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => void handleVoiceAppend()}
              className={isRecording ? 'btn-danger' : 'btn-secondary'}
            >
              {isRecording ? '⏹ Stop' : '🎤 Voice'}
            </button>
            <button type="button" onClick={() => photoRef.current?.click()} className="btn-secondary">
              📷 Photo
            </button>
            <button type="button" onClick={() => videoRef.current?.click()} className="btn-secondary">
              🎥 Video
            </button>
            <button type="button" onClick={() => fileRef.current?.click()} className="btn-secondary">
              📎 File
            </button>
          </div>
          <input
            ref={photoRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="hidden"
            onChange={(e) => void appendMedia(e.target.files, 'photo')}
          />
          <input
            ref={videoRef}
            type="file"
            accept="video/*"
            capture="environment"
            multiple
            className="hidden"
            onChange={(e) => void appendMedia(e.target.files, 'video')}
          />
          <input
            ref={fileRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => void appendMedia(e.target.files, 'file')}
          />
        </div>

        {entry.media.length > 0 && (
          <div className="mb-4 space-y-2">
            <h3 className="font-bold text-gray-200">Media</h3>
            {entry.media.map((m) => (
              <MediaPreview
                key={m.id}
                media={m}
                onRemove={() =>
                  void removeMediaFromEntry(entry.id, m.id).then(() =>
                    loadEntryWithMedia(entry.id).then((loaded) => loaded && setEntry(loaded))
                  )
                }
              />
            ))}
          </div>
        )}

        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold text-gray-200">Reminders</h3>
            <button
              type="button"
              onClick={() => setShowReminderForm(!showReminderForm)}
              className="btn-secondary text-sm"
            >
              {showReminderForm ? 'Cancel' : '+ Add'}
            </button>
          </div>
          {showReminderForm && (
            <div className="bg-slate-700 p-3 rounded mb-2 space-y-2">
              <input
                type="text"
                placeholder="Reminder message"
                value={reminderMessage}
                onChange={(e) => setReminderMessage(e.target.value)}
                className="input-base w-full"
              />
              <div className="flex gap-2">
                <input
                  type="time"
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value)}
                  className="input-base flex-1"
                />
                <button type="button" onClick={() => void handleAddReminder()} className="btn-primary">
                  Set
                </button>
              </div>
            </div>
          )}
          {entry.reminders.length > 0 ? (
            <div className="space-y-2">
              {entry.reminders.map((rem) => (
                <div key={rem.id} className="bg-slate-700 p-2 rounded text-sm">
                  <p className="text-gray-300">{rem.message}</p>
                  <p className="text-gray-500 text-xs">
                    {new Date(rem.scheduledAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No reminders</p>
          )}
        </div>

        <p className="text-xs text-gray-500 border-t border-slate-700 pt-2">
          Created {new Date(entry.createdAt).toLocaleString()}
        </p>
      </div>
    </div>
  );
};

export default EntryDetail;
