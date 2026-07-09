import { precacheAndRoute } from 'workbox-precaching';

precacheAndRoute(self.__WB_MANIFEST);

async function checkReminders() {
  try {
    const db = await openDB();
    const reminders = await getPendingReminders(db);

    for (const reminder of reminders) {
      await sendNotification(reminder);
      await updateReminderStatus(db, reminder.id);
    }
  } catch (err) {
    console.error('Error checking reminders:', err);
  }
}

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('despatch-diary', 2);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function getPendingReminders(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['reminders'], 'readonly');
    const store = transaction.objectStore('reminders');
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const now = Date.now();
      const pending = request.result.filter(
        (r) => !r.completed && !r.notificationShown && r.scheduledAt <= now
      );
      resolve(pending);
    };
  });
}

function sendNotification(reminder) {
  return self.registration.showNotification('Despatch Diary Reminder', {
    body: reminder.message,
    icon: '/favicon.svg',
    tag: `reminder-${reminder.id}`,
    requireInteraction: true,
  });
}

function updateReminderStatus(db, reminderId) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['reminders'], 'readwrite');
    const store = transaction.objectStore('reminders');
    const getRequest = store.get(reminderId);

    getRequest.onerror = () => reject(getRequest.error);
    getRequest.onsuccess = () => {
      const reminder = getRequest.result;
      if (!reminder) {
        resolve();
        return;
      }
      reminder.notificationShown = true;
      const updateRequest = store.put(reminder);
      updateRequest.onerror = () => reject(updateRequest.error);
      updateRequest.onsuccess = () => resolve();
    };
  });
}

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-reminders') {
    event.waitUntil(checkReminders());
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      if (clients.length > 0) {
        return clients[0].focus();
      }
      return self.clients.openWindow('/');
    })
  );
});
