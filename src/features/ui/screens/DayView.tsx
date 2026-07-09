import { useDiaryStore } from '../../../lib/store';
import EntryCard from '../components/EntryCard';

interface DayViewProps {
  onOpenEntry?: (id: string) => void;
}

const DayView = ({ onOpenEntry }: DayViewProps) => {
  const { entries, loading, error } = useDiaryStore();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <p className="text-gray-400">Loading entries…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card bg-red-900/20 border-red-700">
        <p className="text-red-400">Error: {error}</p>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex justify-center items-center h-40">
        <div className="text-center">
          <p className="text-gray-400 text-lg">No entries for this day</p>
          <p className="text-gray-500 text-sm mt-2">Use the buttons above to capture something</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {entries.map((entry) => (
        <EntryCard key={entry.id} entry={entry} onOpenEntry={onOpenEntry} />
      ))}
    </div>
  );
};

export default DayView;
