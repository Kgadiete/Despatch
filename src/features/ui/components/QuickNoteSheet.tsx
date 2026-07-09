import { useState } from 'react';
import { useDiaryStore } from '../../../lib/store';

interface QuickNoteSheetProps {
  onClose: () => void;
  onCreated?: (entryId: string) => void;
}

const QuickNoteSheet = ({ onClose, onCreated }: QuickNoteSheetProps) => {
  const { createDraftEntry } = useDiaryStore();
  const [text, setText] = useState('');

  const handleSave = async () => {
    if (!text.trim()) {
      onClose();
      return;
    }
    const entry = await createDraftEntry({ text: text.trim() });
    onCreated?.(entry.id);
    onClose();
  };

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet-panel" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <h2 className="text-xl font-bold text-amber-400 mb-3">Quick note</h2>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What happened?"
          className="input-base w-full h-32 mb-4"
          autoFocus
        />
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button type="button" onClick={() => void handleSave()} className="btn-primary">
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuickNoteSheet;
