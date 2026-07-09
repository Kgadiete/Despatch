export type AppView = 'home' | 'count' | 'search' | 'archive' | 'documents';

interface NavigationProps {
  view: AppView;
  onNavigate: (view: AppView) => void;
}

const Navigation = ({ view, onNavigate }: NavigationProps) => {
  return (
    <nav className="bg-slate-800 border-b border-slate-700 p-4 safe-top">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="flex items-center space-x-2"
        >
          <span className="bg-amber-400 text-slate-900 rounded-lg p-2 font-bold">DD</span>
          <h1 className="text-xl font-bold text-white">Despatch Diary</h1>
        </button>
        <div className="flex space-x-2">
          <button
            type="button"
            onClick={() => onNavigate('count')}
            className={`text-sm py-2 px-3 rounded-lg font-semibold ${
              view === 'count' ? 'bg-amber-400 text-slate-900' : 'btn-secondary'
            }`}
          >
            Count
          </button>
          <button
            type="button"
            onClick={() => onNavigate('search')}
            className={`text-sm py-2 px-3 rounded-lg font-semibold ${
              view === 'search' ? 'bg-amber-400 text-slate-900' : 'btn-secondary'
            }`}
          >
            Search
          </button>
          <button
            type="button"
            onClick={() => onNavigate('documents')}
            className={`text-sm py-2 px-3 rounded-lg font-semibold ${
              view === 'documents' ? 'bg-amber-400 text-slate-900' : 'btn-secondary'
            }`}
          >
            Documents
          </button>
          <button
            type="button"
            onClick={() => onNavigate('archive')}
            className={`text-sm py-2 px-3 rounded-lg font-semibold ${
              view === 'archive' ? 'bg-amber-400 text-slate-900' : 'btn-secondary'
            }`}
          >
            Archive
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
