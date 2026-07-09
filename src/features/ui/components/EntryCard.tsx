import { useState } from 'react';
import type { Entry } from '../../../lib/types/index';
import { useDiaryStore } from '../../../lib/store';
import { isPlaceholderHeader } from '../../../lib/constants';
import EntryDetail from './EntryDetail';

interface EntryCardProps {
  entry: Entry;
  onOpenEntry?: (id: string) => void;
}

const EntryCard = ({ entry, onOpenEntry }: EntryCardProps) => {
  const { deleteEntry } = useDiaryStore();
  const [showDetail, setShowDetail] = useState(false);

  const handleOpen = () => {
    if (onOpenEntry) {
      onOpenEntry(entry.id);
    } else {
      setShowDetail(true);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Delete this entry?')) {
      await deleteEntry(entry.id);
    }
  };

  const timeStr = new Date(entry.createdAt).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <>
      <article
        role="button"
        tabIndex={0}
        onClick={handleOpen}
        onKeyDown={(e) => e.key === 'Enter' && handleOpen()}
        className="card cursor-pointer hover:bg-slate-700 transition-colors"
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3
              className={`text-lg font-bold truncate ${
                isPlaceholderHeader(entry.header) ? 'text-gray-400 italic' : 'text-amber-400'
              }`}
            >
              {entry.header}
            </h3>
            {entry.text && (
              <p className="text-gray-300 mt-2 line-clamp-2">{entry.text}</p>
            )}
            {entry.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {entry.tags.map((tag) => (
                  <span
                    key={tag}
                    className="bg-slate-700 text-amber-300 px-2 py-1 rounded text-xs"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
            {entry.media.length > 0 && (
              <p className="mt-3 text-sm text-gray-400">📎 {entry.media.length} media</p>
            )}
            {entry.reminders.length > 0 && (
              <p className="mt-1 text-sm text-gray-400">⏰ {entry.reminders.length} reminder(s)</p>
            )}
          </div>
          <div className="text-right ml-4 shrink-0">
            <p className="text-sm text-gray-400">{timeStr}</p>
            <button
              type="button"
              onClick={handleDelete}
              className="text-red-400 hover:text-red-300 text-xs mt-2"
            >
              Delete
            </button>
          </div>
        </div>
      </article>

      {showDetail && !onOpenEntry && (
        <EntryDetail entry={entry} onClose={() => setShowDetail(false)} />
      )}
    </>
  );
};

export default EntryCard;
