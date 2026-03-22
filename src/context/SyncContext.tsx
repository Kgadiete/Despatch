'use client';

import { createContext, useContext, useCallback, useRef, useEffect, useState, type ReactNode } from 'react';
import { syncAll } from '@/lib/sync';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import type { SyncStatus } from '@/types';

interface SyncContextValue {
  isOnline: boolean;
  syncStatus: SyncStatus;
  lastSyncResult: { synced: number; failed: number } | null;
  triggerSync: () => Promise<void>;
}

const SyncContext = createContext<SyncContextValue>({
  isOnline: true,
  syncStatus: 'idle',
  lastSyncResult: null,
  triggerSync: async () => {},
});

export function SyncProvider({ children }: { children: ReactNode }) {
  const isOnline = useOnlineStatus();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [lastSyncResult, setLastSyncResult] = useState<{ synced: number; failed: number } | null>(null);
  const syncLock = useRef(false);

  const triggerSync = useCallback(async () => {
    if (syncLock.current || !navigator.onLine) return;
    syncLock.current = true;
    setSyncStatus('syncing');
    try {
      const result = await syncAll();
      setLastSyncResult(result);
      setSyncStatus('idle');
    } catch {
      setSyncStatus('error');
    } finally {
      syncLock.current = false;
    }
  }, []);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline) {
      triggerSync();
    }
  }, [isOnline, triggerSync]);

  return (
    <SyncContext.Provider value={{ isOnline, syncStatus, lastSyncResult, triggerSync }}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSync() {
  return useContext(SyncContext);
}
