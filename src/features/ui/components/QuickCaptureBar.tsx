import { useRef } from 'react';
import { useDiaryStore } from '../../../lib/store';
import { useMediaCapture } from '../hooks/useMediaCapture';
import type { MediaFile } from '../../../lib/types/index';

interface QuickCaptureBarProps {
  onNoteCapture?: () => void;
  onEntryCreated?: (entryId: string) => void;
}

const QuickCaptureBar = ({ onNoteCapture, onEntryCreated }: QuickCaptureBarProps) => {
  const { createDraftEntry } = useDiaryStore();
  const { isRecording, startVoiceRecord, stopVoiceRecord, filesToMedia } = useMediaCapture();

  const photoRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);

  const saveWithMedia = async (media: MediaFile[]) => {
    const entry = await createDraftEntry({ media });
    onEntryCreated?.(entry.id);
  };

  const handleVoice = async () => {
    try {
      if (isRecording) {
        const m = await stopVoiceRecord();
        await saveWithMedia([m]);
      } else {
        await startVoiceRecord();
      }
    } catch {
      alert('Microphone access is required for voice notes.');
    }
  };

  const handleFiles = async (files: FileList | null, type: MediaFile['type']) => {
    if (!files?.length) return;
    await saveWithMedia(filesToMedia(files, type));
  };

  const btnClass =
    'min-h-[72px] rounded-xl bg-slate-800 border-2 border-amber-400/40 hover:border-amber-400 text-amber-400 font-bold text-lg active:scale-[0.98] transition-transform';

  return (
    <div className="grid grid-cols-2 gap-3 mb-6">
      <button
        type="button"
        onClick={() => void handleVoice()}
        className={
          isRecording
            ? 'min-h-[72px] rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-lg'
            : btnClass
        }
      >
        {isRecording ? '⏹ Stop' : '🎤 Voice'}
      </button>
      <button type="button" onClick={() => photoRef.current?.click()} className={btnClass}>
        📷 Camera
      </button>
      <button type="button" onClick={onNoteCapture} className={btnClass}>
        📝 Note
      </button>
      <button type="button" onClick={() => videoRef.current?.click()} className={btnClass}>
        🎥 Video
      </button>

      <input
        ref={photoRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={(e) => void handleFiles(e.target.files, 'photo')}
      />
      <input
        ref={videoRef}
        type="file"
        accept="video/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={(e) => void handleFiles(e.target.files, 'video')}
      />
    </div>
  );
};

export default QuickCaptureBar;
