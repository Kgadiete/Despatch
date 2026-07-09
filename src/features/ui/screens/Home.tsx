import { useCallback, useEffect, useState } from 'react';
import { useDiaryStore } from '../../../lib/store';
import Navigation, { type AppView } from '../components/Navigation';
import DayView from './DayView';
import NewEntryModal from '../components/NewEntryModal';
import QuickCaptureBar from '../components/QuickCaptureBar';
import QuickNoteSheet from '../components/QuickNoteSheet';
import EntryDetail from '../components/EntryDetail';
import Archive from './Archive';
import Search from './Search';
import TripCount from './TripCount';
import Documents from './Documents';

interface HomeProps {
  view: AppView;
  onNavigate: (view: AppView) => void;
}

const Home = ({ view, onNavigate }: HomeProps) => {
  const { loadEntries, currentDate, setCurrentDate, entries, loadEntryWithMedia } = useDiaryStore();
  const [showNewEntry, setShowNewEntry] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const [detailEntryId, setDetailEntryId] = useState<string | null>(null);

  useEffect(() => {
    if (view === 'home') {
      void loadEntries(currentDate);
    }
  }, [currentDate, view, loadEntries]);

  const handlePreviousDay = () => {
    const date = new Date(currentDate + 'T12:00:00');
    date.setDate(date.getDate() - 1);
    setCurrentDate(date.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const date = new Date(currentDate + 'T12:00:00');
    date.setDate(date.getDate() + 1);
    setCurrentDate(date.toISOString().split('T')[0]);
  };

  const openEntry = useCallback(
    async (id: string) => {
      await loadEntryWithMedia(id);
      setDetailEntryId(id);
    },
    [loadEntryWithMedia]
  );

  const detailEntry = detailEntryId
    ? entries.find((e) => e.id === detailEntryId) ?? null
    : null;

  if (view === 'count') {
    return (
      <div className="flex flex-col h-screen">
        <Navigation view={view} onNavigate={onNavigate} />
        <TripCount />
      </div>
    );
  }

  if (view === 'search') {
    return (
      <div className="flex flex-col h-screen">
        <Navigation view={view} onNavigate={onNavigate} />
        <Search onBack={() => onNavigate('home')} />
      </div>
    );
  }

  if (view === 'archive') {
    return (
      <div className="flex flex-col h-screen">
        <Navigation view={view} onNavigate={onNavigate} />
        <main className="flex-1 overflow-y-auto">
          <Archive onBack={() => onNavigate('home')} />
        </main>
      </div>
    );
  }

  if (view === 'documents') {
    return (
      <div className="flex flex-col h-screen">
        <Navigation view={view} onNavigate={onNavigate} />
        <main className="flex-1 overflow-y-auto">
          <Documents onBack={() => onNavigate('home')} />
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <Navigation view={view} onNavigate={onNavigate} />

      <main className="flex-1 overflow-y-auto p-4 pb-28">
        <div className="flex items-center justify-between mb-4 gap-2">
          <button type="button" onClick={handlePreviousDay} className="btn-secondary text-sm shrink-0">
            ←
          </button>
          <h1 className="text-lg sm:text-xl font-bold text-amber-400 text-center">
            {new Date(currentDate + 'T12:00:00').toLocaleDateString('en-GB', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </h1>
          <button type="button" onClick={handleNextDay} className="btn-secondary text-sm shrink-0">
            →
          </button>
        </div>

        <QuickCaptureBar
          onNoteCapture={() => setShowNote(true)}
          onEntryCreated={(id) => void openEntry(id)}
        />

        <DayView onOpenEntry={(id) => void openEntry(id)} />
      </main>

      <div className="fixed bottom-6 right-6 z-40">
        <button
          type="button"
          onClick={() => setShowNewEntry(true)}
          className="bg-amber-400 hover:bg-amber-500 text-slate-900 rounded-full w-14 h-14 flex items-center justify-center font-bold text-2xl shadow-lg"
          aria-label="Full entry"
        >
          +
        </button>
      </div>

      {showNewEntry && <NewEntryModal onClose={() => setShowNewEntry(false)} />}
      {showNote && (
        <QuickNoteSheet
          onClose={() => setShowNote(false)}
          onCreated={(id) => void openEntry(id)}
        />
      )}
      {detailEntry && (
        <EntryDetail entry={detailEntry} onClose={() => setDetailEntryId(null)} />
      )}
    </div>
  );
};

export default Home;
