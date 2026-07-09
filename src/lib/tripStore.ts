import { create } from 'zustand';
import type { CountingSession, MediaFile, Trip } from './types/index';
import * as storage from './storage';

function sessionIdForDate(date: string): string {
  return `session-${date}`;
}

export function sessionTotal(session: CountingSession | null): number {
  if (!session) return 0;
  return session.trips.reduce((sum, t) => sum + t.count, 0);
}

interface TripStore {
  session: CountingSession | null;
  currentDate: string;
  loading: boolean;
  error: string | null;
  history: CountingSession[];

  loadSession: (date: string) => Promise<void>;
  loadHistory: () => Promise<void>;
  addTrip: (count: number, notes?: string) => Promise<Trip>;
  updateTrip: (trip: Trip) => Promise<void>;
  deleteTrip: (tripId: string) => Promise<void>;
  setSessionNotes: (notes: string) => Promise<void>;
  addMediaToTrip: (tripId: string, media: MediaFile) => Promise<void>;
  removeMediaFromTrip: (tripId: string, mediaId: string) => Promise<void>;
  addMediaToSession: (media: MediaFile) => Promise<void>;
  setCurrentDate: (date: string) => void;
}

async function ensureSession(date: string): Promise<CountingSession> {
  let session = await storage.getCountingSessionByDate(date);
  if (!session) {
    session = {
      id: sessionIdForDate(date),
      date,
      createdAt: Date.now(),
      trips: [],
      media: [],
    };
    await storage.saveCountingSession(session);
  }
  return session;
}

export const useTripStore = create<TripStore>((set, get) => ({
  session: null,
  currentDate: new Date().toISOString().split('T')[0],
  loading: false,
  error: null,
  history: [],

  loadSession: async (date: string) => {
    set({ loading: true, error: null });
    try {
      const session = await ensureSession(date);
      set({ session, currentDate: date });
    } catch (err) {
      set({ error: (err as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  loadHistory: async () => {
    try {
      const history = await storage.getAllCountingSessions();
      set({ history });
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },

  addTrip: async (count: number, notes?: string) => {
    const date = get().currentDate;
    const session = await ensureSession(date);
    const trip: Trip = {
      id: `trip-${Date.now()}`,
      sessionId: session.id,
      count,
      notes: notes?.trim() || undefined,
      createdAt: Date.now(),
      media: [],
    };
    const updated: CountingSession = {
      ...session,
      trips: [...session.trips, trip].sort((a, b) => a.createdAt - b.createdAt),
    };
    await storage.saveCountingSession(updated);
    set({ session: updated });
    return trip;
  },

  updateTrip: async (trip: Trip) => {
    const session = get().session;
    if (!session) throw new Error('No session');

    const updated: CountingSession = {
      ...session,
      trips: session.trips.map((t) => (t.id === trip.id ? trip : t)),
    };
    await storage.saveCountingSession(updated);
    set({ session: updated });
  },

  deleteTrip: async (tripId: string) => {
    const session = get().session;
    if (!session) return;

    const trip = session.trips.find((t) => t.id === tripId);
    if (trip) {
      for (const m of trip.media) {
        await storage.deleteMedia(m.id);
      }
    }

    const updated: CountingSession = {
      ...session,
      trips: session.trips.filter((t) => t.id !== tripId),
    };
    await storage.saveCountingSession(updated);
    set({ session: updated });
  },

  setSessionNotes: async (notes: string) => {
    const session = get().session;
    if (!session) return;
    const updated = { ...session, notes: notes.trim() || undefined };
    await storage.saveCountingSession(updated);
    set({ session: updated });
  },

  addMediaToTrip: async (tripId: string, media: MediaFile) => {
    const session = get().session;
    if (!session) throw new Error('No session');

    const mediaItem = { ...media, entryId: tripId };
    await storage.saveMediaWithBlob(mediaItem);

    const updated: CountingSession = {
      ...session,
      trips: session.trips.map((t) =>
        t.id === tripId ? { ...t, media: [...t.media, mediaItem] } : t
      ),
    };
    await storage.saveCountingSession(updated);
    set({ session: updated });
  },

  removeMediaFromTrip: async (tripId: string, mediaId: string) => {
    const session = get().session;
    if (!session) return;

    await storage.deleteMedia(mediaId);
    const updated: CountingSession = {
      ...session,
      trips: session.trips.map((t) =>
        t.id === tripId ? { ...t, media: t.media.filter((m) => m.id !== mediaId) } : t
      ),
    };
    await storage.saveCountingSession(updated);
    set({ session: updated });
  },

  addMediaToSession: async (media: MediaFile) => {
    const session = get().session;
    if (!session) throw new Error('No session');

    const mediaItem = { ...media, entryId: session.id };
    await storage.saveMediaWithBlob(mediaItem);
    const updated = { ...session, media: [...session.media, mediaItem] };
    await storage.saveCountingSession(updated);
    set({ session: updated });
  },

  setCurrentDate: (date: string) => {
    set({ currentDate: date });
  },
}));
