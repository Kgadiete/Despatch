import { useEffect, useState } from 'react';
import { initDB } from './lib/storage';
import { startReminderChecker } from './lib/reminders';
import Home from './features/ui/screens/Home';
import type { AppView } from './features/ui/components/Navigation';
import './index.css';

function App() {
  const [dbInitialized, setDbInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<AppView>('home');

  useEffect(() => {
    const init = async () => {
      try {
        await initDB();
        setDbInitialized(true);
        startReminderChecker();
      } catch (err) {
        setError((err as Error).message);
        console.error('Initialization error:', err);
      }
    };

    void init();
  }, []);

  if (error) {
    return (
      <div className="w-full h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="card">
          <h2 className="text-red-500 font-bold">Error</h2>
          <p className="text-gray-300 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  if (!dbInitialized) {
    return (
      <div className="w-full h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-400 mx-auto mb-4" />
          <p className="text-gray-300">Loading Despatch Diary…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 min-h-screen">
      <Home view={view} onNavigate={setView} />
    </div>
  );
}

export default App;
