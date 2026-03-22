'use client';

import { useEffect } from 'react';
import { showToast } from './Toast';

const VERSION_KEY = 'despatch_last_version';
const currentVersion = process.env.NEXT_PUBLIC_APP_VERSION || 'dev';

export default function UpdateNotifier() {
  useEffect(() => {
    const lastVersion = localStorage.getItem(VERSION_KEY);
    if (lastVersion && lastVersion !== currentVersion && currentVersion !== 'dev') {
      showToast(`Updated to v${currentVersion}`, 'info');
    }
    localStorage.setItem(VERSION_KEY, currentVersion);
  }, []);

  return null;
}
