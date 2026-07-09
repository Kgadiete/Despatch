import { useEffect, useRef, useState } from 'react';
import type { Trip } from '../../../lib/types/index';
import { useTripStore } from '../../../lib/tripStore';
import { useMediaCapture } from '../hooks/useMediaCapture';
import MediaPreview from './MediaPreview';
import * as storage from '../../../lib/storage';

interface TripDetailSheetProps {
  trip: Trip;
  tripIndex: number;
  onClose: () => void;
}

const TripDetailSheet = ({ trip: initialTrip, tripIndex, onClose }: TripDetailSheetProps) => {
  const { updateTrip, deleteTrip, addMediaToTrip, removeMediaFromTrip } = useTripStore();
  const [trip, setTrip] = useState(initialTrip);
  const [count, setCount] = useState(String(initialTrip.count));
  const [notes, setNotes] = useState(initialTrip.notes ?? '');

  const { isRecording, startVoiceRecord, stopVoiceRecord, filesToMedia } = useMediaCapture();
  const photoRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void storage.hydrateTripMedia(initialTrip).then(setTrip);
  }, [initialTrip]);

  const save = async () => {
    const n = parseInt(count, 10);
    if (!Number.isFinite(n) || n < 1) {
      alert('Enter a valid tyre count (1 or more).');
      return;
    }
    const updated = { ...trip, count: n, notes: notes.trim() || undefined };
    await updateTrip(updated);
    setTrip(updated);
    onClose();
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete trip ${tripIndex + 1}?`)) return;
    await deleteTrip(trip.id);
    onClose();
  };

  const appendMedia = async (files: FileList | null, type: 'photo' | 'file') => {
    if (!files?.length) return;
    for (const media of filesToMedia(files, type)) {
      await addMediaToTrip(trip.id, media);
    }
    const session = useTripStore.getState().session;
    const refreshed = session?.trips.find((t) => t.id === trip.id);
    if (refreshed) setTrip(await storage.hydrateTripMedia(refreshed));
  };

  const handleVoice = async () => {
    try {
      if (isRecording) {
        const m = await stopVoiceRecord();
        await addMediaToTrip(trip.id, m);
        const session = useTripStore.getState().session;
        const refreshed = session?.trips.find((t) => t.id === trip.id);
        if (refreshed) setTrip(await storage.hydrateTripMedia(refreshed));
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
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-amber-400">Trip {tripIndex + 1}</h2>
          <button type="button" onClick={onClose} className="text-gray-400 text-2xl">
            ✕
          </button>
        </div>

        <label className="text-sm text-gray-400 block mb-1">Tyres counted (accepted only)</label>
        <input
          type="number"
          inputMode="numeric"
          min={1}
          value={count}
          onChange={(e) => setCount(e.target.value)}
          className="input-base w-full text-2xl font-bold mb-4 text-center"
        />

        <textarea
          placeholder="Notes — rejects, damage, batch ID…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="input-base w-full h-24 mb-4"
        />

        <p className="text-sm text-gray-400 mb-2">Attach media</p>
        <div className="grid grid-cols-3 gap-2 mb-4">
          <button
            type="button"
            onClick={() => void handleVoice()}
            className={isRecording ? 'btn-danger text-sm' : 'btn-secondary text-sm'}
          >
            {isRecording ? 'Stop' : 'Voice'}
          </button>
          <button
            type="button"
            onClick={() => photoRef.current?.click()}
            className="btn-secondary text-sm"
          >
            Photo
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="btn-secondary text-sm"
          >
            File
          </button>
        </div>
        <input
          ref={photoRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => void appendMedia(e.target.files, 'photo')}
        />
        <input
          ref={fileRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => void appendMedia(e.target.files, 'file')}
        />

        {trip.media.length > 0 && (
          <div className="space-y-2 mb-4">
            {trip.media.map((m) => (
              <MediaPreview
                key={m.id}
                media={m}
                onRemove={() =>
                  void removeMediaFromTrip(trip.id, m.id).then(async () => {
                    const session = useTripStore.getState().session;
                    const refreshed = session?.trips.find((t) => t.id === trip.id);
                    if (refreshed) setTrip(await storage.hydrateTripMedia(refreshed));
                  })
                }
              />
            ))}
          </div>
        )}

        <p className="text-xs text-gray-500 mb-4">
          Logged {new Date(trip.createdAt).toLocaleString()}
        </p>

        <div className="flex gap-2">
          <button type="button" onClick={() => void handleDelete()} className="btn-danger flex-1">
            Delete trip
          </button>
          <button type="button" onClick={() => void save()} className="btn-primary flex-1">
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default TripDetailSheet;
