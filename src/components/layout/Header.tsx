'use client';

import { useRouter } from 'next/navigation';
import { useSync } from '@/context/SyncContext';

interface HeaderProps {
  title: string;
  showBack?: boolean;
  actions?: React.ReactNode;
}

export default function Header({ title, showBack, actions }: HeaderProps) {
  const router = useRouter();
  const { isOnline, syncStatus } = useSync();

  return (
    <header className="sticky top-0 z-30 bg-[#1e3a5f] text-white safe-area-top">
      <div className="flex items-center h-14 px-4 max-w-lg mx-auto">
        {showBack && (
          <button
            onClick={() => router.back()}
            className="mr-2 p-1 -ml-1 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Go back"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
        )}
        <h1 className="text-lg font-semibold truncate flex-1">{title}</h1>
        <div className="flex items-center gap-2">
          {syncStatus === 'syncing' && (
            <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          )}
          <span
            className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-green-400' : 'bg-red-400'}`}
            title={isOnline ? 'Online' : 'Offline'}
          />
          {actions}
        </div>
      </div>
    </header>
  );
}
