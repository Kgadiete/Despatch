import type { CountingSession, Entry, MediaFile, Reminder, Trip } from './types/index';

const DB_NAME = 'despatch-diary';
const DB_VERSION = 3;

const STORES = {
  entries: 'entries',
  media: 'media',
  reminders: 'reminders',
  blobs: 'blobs',
  countingSessions: 'countingSessions',
} as const;

let db: IDBDatabase;

function stripBlob(media: MediaFile): MediaFile {
  const rest = { ...media } as Partial<MediaFile>;
  delete rest.blob;
  delete rest.fileHandle;
  return rest as MediaFile;
}

function stripEntryForPersist(entry: Entry): Entry {
  return {
    ...entry,
    media: entry.media.map(stripBlob),
  };
}

function stripSessionForPersist(session: CountingSession): CountingSession {
  return {
    ...session,
    media: session.media.map(stripBlob),
    trips: session.trips.map((t) => ({
      ...t,
      media: t.media.map(stripBlob),
    })),
  };
}

export async function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      if (!database.objectStoreNames.contains(STORES.entries)) {
        const entryStore = database.createObjectStore(STORES.entries, { keyPath: 'id' });
        entryStore.createIndex('createdAt', 'createdAt', { unique: false });
      } else {
        const tx = (event.target as IDBOpenDBRequest).transaction;
        if (tx) {
          const entryStore = tx.objectStore(STORES.entries);
          if (!entryStore.indexNames.contains('createdAt')) {
            entryStore.createIndex('createdAt', 'createdAt', { unique: false });
          }
        }
      }

      if (!database.objectStoreNames.contains(STORES.media)) {
        database.createObjectStore(STORES.media, { keyPath: 'id' });
      }

      if (!database.objectStoreNames.contains(STORES.reminders)) {
        database.createObjectStore(STORES.reminders, { keyPath: 'id' });
      }

      if (!database.objectStoreNames.contains(STORES.blobs)) {
        database.createObjectStore(STORES.blobs, { keyPath: 'id' });
      }

      if (!database.objectStoreNames.contains(STORES.countingSessions)) {
        const sessionStore = database.createObjectStore(STORES.countingSessions, {
          keyPath: 'id',
        });
        sessionStore.createIndex('date', 'date', { unique: false });
      }
    };
  });
}

export async function saveBlob(id: string, blob: Blob): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.blobs], 'readwrite');
    const store = transaction.objectStore(STORES.blobs);
    const request = store.put({ id, blob });

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function getBlob(id: string): Promise<Blob | null> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.blobs], 'readonly');
    const store = transaction.objectStore(STORES.blobs);
    const request = store.get(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const row = request.result as { id: string; blob: Blob } | undefined;
      resolve(row?.blob ?? null);
    };
  });
}

export async function deleteBlob(id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.blobs], 'readwrite');
    const store = transaction.objectStore(STORES.blobs);
    const request = store.delete(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function saveMediaWithBlob(media: MediaFile): Promise<void> {
  if (media.blob) {
    await saveBlob(media.id, media.blob);
  }
  await saveMedia(stripBlob(media));
}

export async function hydrateMedia(media: MediaFile): Promise<MediaFile> {
  if (media.blob) return media;
  const blob = await getBlob(media.id);
  return blob ? { ...media, blob } : media;
}

export async function hydrateEntryMedia(entry: Entry): Promise<Entry> {
  const media = await Promise.all(entry.media.map(hydrateMedia));
  return { ...entry, media };
}

export async function saveEntry(entry: Entry): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.entries], 'readwrite');
    const store = transaction.objectStore(STORES.entries);
    const request = store.put(stripEntryForPersist(entry));

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function getEntry(id: string): Promise<Entry | null> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.entries], 'readonly');
    const store = transaction.objectStore(STORES.entries);
    const request = store.get(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = async () => {
      const entry = request.result as Entry | undefined;
      if (!entry) {
        resolve(null);
        return;
      }
      resolve(await hydrateEntryMedia(entry));
    };
  });
}

export async function getEntriesByDate(date: string): Promise<Entry[]> {
  const all = await getAllEntries();
  return all.filter((entry) => {
    const entryDate = new Date(entry.createdAt).toISOString().split('T')[0];
    return entryDate === date;
  });
}

export async function getAllEntries(): Promise<Entry[]> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.entries], 'readonly');
    const store = transaction.objectStore(STORES.entries);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = async () => {
      const entries = request.result as Entry[];
      const hydrated = await Promise.all(entries.map(hydrateEntryMedia));
      resolve(hydrated.sort((a, b) => b.createdAt - a.createdAt));
    };
  });
}

export async function deleteEntry(id: string): Promise<void> {
  const entry = await getEntry(id);
  if (entry) {
    for (const m of entry.media) {
      await deleteMedia(m.id);
      await deleteBlob(m.id);
    }
    for (const r of entry.reminders) {
      await deleteReminder(r.id);
    }
  }

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.entries], 'readwrite');
    const store = transaction.objectStore(STORES.entries);
    const request = store.delete(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function saveMedia(media: MediaFile): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.media], 'readwrite');
    const store = transaction.objectStore(STORES.media);
    const request = store.put(stripBlob(media));

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function getMediaByEntry(entryId: string): Promise<MediaFile[]> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.media], 'readonly');
    const store = transaction.objectStore(STORES.media);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = async () => {
      const media = (request.result as MediaFile[]).filter((m) => m.entryId === entryId);
      const hydrated = await Promise.all(media.map(hydrateMedia));
      resolve(hydrated);
    };
  });
}

export async function deleteMedia(id: string): Promise<void> {
  await deleteBlob(id);
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.media], 'readwrite');
    const store = transaction.objectStore(STORES.media);
    const request = store.delete(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function saveReminder(reminder: Reminder): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.reminders], 'readwrite');
    const store = transaction.objectStore(STORES.reminders);
    const request = store.put(reminder);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function deleteReminder(id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.reminders], 'readwrite');
    const store = transaction.objectStore(STORES.reminders);
    const request = store.delete(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function getPendingReminders(): Promise<Reminder[]> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.reminders], 'readonly');
    const store = transaction.objectStore(STORES.reminders);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const now = Date.now();
      const reminders = (request.result as Reminder[]).filter(
        (r) => !r.completed && !r.notificationShown && r.scheduledAt <= now
      );
      resolve(reminders);
    };
  });
}

export async function updateReminderNotificationStatus(
  id: string,
  notificationShown: boolean
): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.reminders], 'readwrite');
    const store = transaction.objectStore(STORES.reminders);
    const request = store.get(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const reminder = request.result as Reminder;
      if (!reminder) {
        resolve();
        return;
      }
      reminder.notificationShown = notificationShown;
      const updateRequest = store.put(reminder);
      updateRequest.onerror = () => reject(updateRequest.error);
      updateRequest.onsuccess = () => resolve();
    };
  });
}

export async function hydrateTripMedia(trip: Trip): Promise<Trip> {
  const media = await Promise.all(trip.media.map(hydrateMedia));
  return { ...trip, media };
}

export async function hydrateSession(session: CountingSession): Promise<CountingSession> {
  const sessionMedia = await Promise.all(session.media.map(hydrateMedia));
  const trips = await Promise.all(session.trips.map(hydrateTripMedia));
  return { ...session, media: sessionMedia, trips };
}

export async function saveCountingSession(session: CountingSession): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.countingSessions], 'readwrite');
    const store = transaction.objectStore(STORES.countingSessions);
    const request = store.put(stripSessionForPersist(session));

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function getCountingSessionByDate(date: string): Promise<CountingSession | null> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.countingSessions], 'readonly');
    const store = transaction.objectStore(STORES.countingSessions);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = async () => {
      const sessions = request.result as CountingSession[];
      const match = sessions.find((s) => s.date === date);
      if (!match) {
        resolve(null);
        return;
      }
      resolve(await hydrateSession(match));
    };
  });
}

export async function getAllCountingSessions(): Promise<CountingSession[]> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.countingSessions], 'readonly');
    const store = transaction.objectStore(STORES.countingSessions);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = async () => {
      const sessions = request.result as CountingSession[];
      const hydrated = await Promise.all(sessions.map(hydrateSession));
      resolve(
        hydrated.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
      );
    };
  });
}

export async function deleteCountingSession(id: string): Promise<void> {
  const session = await getCountingSessionById(id);
  if (session) {
    for (const trip of session.trips) {
      for (const m of trip.media) {
        await deleteMedia(m.id);
      }
    }
    for (const m of session.media) {
      await deleteMedia(m.id);
    }
  }

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.countingSessions], 'readwrite');
    const store = transaction.objectStore(STORES.countingSessions);
    const request = store.delete(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

async function getCountingSessionById(id: string): Promise<CountingSession | null> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.countingSessions], 'readonly');
    const store = transaction.objectStore(STORES.countingSessions);
    const request = store.get(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = async () => {
      const session = request.result as CountingSession | undefined;
      if (!session) {
        resolve(null);
        return;
      }
      resolve(await hydrateSession(session));
    };
  });
}

export async function clearAllData(): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      [
        STORES.entries,
        STORES.media,
        STORES.reminders,
        STORES.blobs,
        STORES.countingSessions,
      ],
      'readwrite'
    );

    Object.values(STORES).forEach((storeName) => {
      transaction.objectStore(storeName).clear();
    });

    transaction.onerror = () => reject(transaction.error);
    transaction.oncomplete = () => resolve();
  });
}
