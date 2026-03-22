'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import { useSync } from '@/context/SyncContext';
import { db } from '@/lib/db';
import { terminateOCR } from '@/lib/ocr';
import { showToast } from '@/components/Toast';

export default function SettingsPage() {
  const { isOnline, syncStatus, lastSyncResult, triggerSync } = useSync();
  const [stats, setStats] = useState({ trucks: 0, slips: 0, photos: 0 });
  const [clearing, setClearing] = useState(false);
  const [ocrEnabled, setOcrEnabled] = useState(true);

  useEffect(() => {
    async function loadStats() {
      const [trucks, slips, photos] = await Promise.all([
        db.trucks.count(),
        db.slips.count(),
        db.photos.count(),
      ]);
      setStats({ trucks, slips, photos });
    }
    loadStats();
    // Load OCR preference
    try {
      setOcrEnabled(localStorage.getItem('despatch_ocr_enabled') !== 'false');
    } catch { /* ignore */ }
  }, [syncStatus]);

  async function handleSync() {
    await triggerSync();
    if (lastSyncResult) {
      showToast(
        `Synced ${lastSyncResult.synced} items${lastSyncResult.failed ? `, ${lastSyncResult.failed} failed` : ''}`,
        lastSyncResult.failed ? 'error' : 'success'
      );
    }
  }

  async function handleClearCache() {
    const ok = window.confirm(
      'Clear all locally cached photos? Synced data will remain in the cloud. Unsynced photos will be lost.'
    );
    if (!ok) return;
    setClearing(true);
    try {
      await db.photos.clear();
      await terminateOCR();
      showToast('Cache cleared', 'success');
      setStats(prev => ({ ...prev, photos: 0 }));
    } catch {
      showToast('Failed to clear cache', 'error');
    } finally {
      setClearing(false);
    }
  }

  async function handleClearAll() {
    const ok = window.confirm(
      'Delete ALL local data? This removes all trucks, slips, and photos from this device. Cloud data is NOT affected.'
    );
    if (!ok) return;
    setClearing(true);
    try {
      await db.delete();
      await db.open();
      await terminateOCR();
      showToast('All local data cleared', 'success');
      setStats({ trucks: 0, slips: 0, photos: 0 });
    } catch {
      showToast('Failed to clear data', 'error');
    } finally {
      setClearing(false);
    }
  }

  return (
    <>
      <Header title="Settings" />

      <div className="px-4 pt-4 pb-24 space-y-4">
        {/* Connection status */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Connection</h2>
          <div className="flex items-center gap-3">
            <span className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-slate-600">
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
          <button
            onClick={handleSync}
            disabled={syncStatus === 'syncing' || !isOnline}
            className="mt-3 w-full py-2.5 bg-[#1e3a5f] text-white rounded-lg text-sm font-medium hover:bg-[#162d4a] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {syncStatus === 'syncing' ? (
              <>
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Syncing...
              </>
            ) : (
              'Force Sync Now'
            )}
          </button>
          {lastSyncResult && (
            <p className="text-xs text-slate-500 mt-2 text-center">
              Last sync: {lastSyncResult.synced} synced, {lastSyncResult.failed} failed
            </p>
          )}
        </div>

        {/* Local storage */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Local Storage</h2>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Trucks</span>
              <span className="font-medium text-slate-700">{stats.trucks}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Slips</span>
              <span className="font-medium text-slate-700">{stats.slips}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Cached Photos</span>
              <span className="font-medium text-slate-700">{stats.photos}</span>
            </div>
          </div>
        </div>

        {/* Scanning */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Scanning</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-700">Text Extraction (OCR)</p>
              <p className="text-xs text-slate-400">Auto-read text from slip photos</p>
            </div>
            <button
              onClick={() => {
                const next = !ocrEnabled;
                setOcrEnabled(next);
                localStorage.setItem('despatch_ocr_enabled', String(next));
                showToast(next ? 'OCR enabled' : 'OCR disabled', 'info');
              }}
              className={`relative w-11 h-6 rounded-full transition-colors ${ocrEnabled ? 'bg-green-500' : 'bg-slate-300'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${ocrEnabled ? 'translate-x-5' : ''}`} />
            </button>
          </div>
        </div>

        {/* Danger zone */}
        <div className="bg-white rounded-xl border border-red-200 p-4">
          <h2 className="text-sm font-semibold text-red-700 mb-3">Danger Zone</h2>
          <div className="space-y-3">
            <button
              onClick={handleClearCache}
              disabled={clearing}
              className="w-full py-2.5 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors disabled:opacity-50"
            >
              Clear Photo Cache
            </button>
            <button
              onClick={handleClearAll}
              disabled={clearing}
              className="w-full py-2.5 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors disabled:opacity-50"
            >
              Clear All Local Data
            </button>
          </div>
        </div>

        {/* About */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">About</h2>
          <p className="text-xs text-slate-500">
            Despatch Tracker — Offline-first PWA for tracking unscanned tyre slips during dispatch loading at ATT.
          </p>
          <div className="mt-3 pt-3 border-t border-slate-100">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Build</span>
              <span className="font-mono text-slate-600">{process.env.NEXT_PUBLIC_APP_VERSION || 'dev'}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
