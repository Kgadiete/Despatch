'use client';

import { useState } from 'react';

interface ToastMessage {
  id: number;
  text: string;
  type: 'success' | 'error' | 'info';
}

let toastId = 0;
let addToastFn: ((text: string, type: ToastMessage['type']) => void) | null = null;

export function showToast(text: string, type: ToastMessage['type'] = 'success') {
  addToastFn?.(text, type);
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  addToastFn = (text: string, type: ToastMessage['type']) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  return (
    <div className="fixed top-16 left-0 right-0 z-50 flex flex-col items-center gap-2 px-4 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`px-4 py-2 rounded-lg text-sm font-medium shadow-lg animate-slide-down pointer-events-auto ${
            t.type === 'success' ? 'bg-green-600 text-white' :
            t.type === 'error' ? 'bg-red-600 text-white' :
            'bg-slate-700 text-white'
          }`}
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}
