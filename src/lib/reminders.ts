import * as storage from './storage';

let checkInterval: ReturnType<typeof setInterval> | null = null;

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

export async function checkAndShowReminders(): Promise<void> {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  const pending = await storage.getPendingReminders();

  for (const reminder of pending) {
    const entry = await storage.getEntry(reminder.entryId);
    const title = entry?.header || 'Despatch Diary';
    new Notification(`Reminder: ${title}`, {
      body: reminder.message,
      icon: '/favicon.svg',
      tag: `reminder-${reminder.id}`,
    });
    await storage.updateReminderNotificationStatus(reminder.id, true);
  }
}

export function startReminderChecker(): void {
  if (checkInterval) return;
  checkInterval = setInterval(() => {
    void checkAndShowReminders();
  }, 30_000);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      void checkAndShowReminders();
    }
  });

  void checkAndShowReminders();
}

export function stopReminderChecker(): void {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
  }
}
