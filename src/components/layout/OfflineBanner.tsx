'use client';

import { useSync } from '@/context/SyncContext';

export default function OfflineBanner() {
  const { isOnline } = useSync();

  if (isOnline) return null;

  return (
    <div className="bg-amber-500 text-amber-950 text-sm font-medium text-center py-2 px-4">
      You&apos;re offline. Data will sync when connection returns.
    </div>
  );
}
