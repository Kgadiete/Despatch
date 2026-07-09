import { create } from 'zustand';
import type { Entry, Reminder, MediaFile } from './types/index';
import { makePlaceholderHeader } from './constants';
import * as storage from './storage';

interface CreateDraftOptions {
  header?: string;
  text?: string;
  tags?: string[];
  media?: MediaFile[];
}

interface DiaryStore {
  entries: Entry[];
  currentEntry: Entry | null;
  currentDate: string;
  loading: boolean;
  error: string | null;

  loadEntries: (date: string) => Promise<void>;
  createEntry: (header: string, text?: string, tags?: string[]) => Promise<Entry>;
  createDraftEntry: (options?: CreateDraftOptions) => Promise<Entry>;
  updateEntry: (entry: Entry) => Promise<void>;
  updateEntryHeader: (id: string, header: string) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  setCurrentEntry: (entry: Entry | null) => void;
  setCurrentDate: (date: string) => void;
  addMediaToEntry: (entryId: string, media: MediaFile) => Promise<void>;
  removeMediaFromEntry: (entryId: string, mediaId: string) => Promise<void>;
  addReminderToEntry: (entryId: string, reminder: Reminder) => Promise<void>;
  loadEntryWithMedia: (id: string) => Promise<Entry | null>;
  searchEntries: (query: string, tags?: string[]) => Promise<Entry[]>;
}

function upsertEntryInList(entries: Entry[], entry: Entry): Entry[] {
  const idx = entries.findIndex((e) => e.id === entry.id);
  if (idx === -1) return [...entries, entry].sort((a, b) => b.createdAt - a.createdAt);
  const next = [...entries];
  next[idx] = entry;
  return next.sort((a, b) => b.createdAt - a.createdAt);
}

export const useDiaryStore = create<DiaryStore>((set, get) => ({
  entries: [],
  currentEntry: null,
  currentDate: new Date().toISOString().split('T')[0],
  loading: false,
  error: null,

  loadEntries: async (date: string) => {
    set({ loading: true, error: null });
    try {
      const entries = await storage.getEntriesByDate(date);
      set({ entries, currentDate: date });
    } catch (err) {
      set({ error: (err as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  createEntry: async (header: string, text?: string, tags: string[] = []) => {
    const id = `entry-${Date.now()}`;
    const entry: Entry = {
      id,
      header: header.trim() || makePlaceholderHeader(),
      text,
      tags,
      createdAt: Date.now(),
      media: [],
      reminders: [],
    };

    await storage.saveEntry(entry);
    set((state) => ({
      entries: upsertEntryInList(state.entries, entry),
      currentEntry: entry,
    }));
    return entry;
  },

  createDraftEntry: async (options: CreateDraftOptions = {}) => {
    const id = `entry-${Date.now()}`;
    const entry: Entry = {
      id,
      header: options.header?.trim() || makePlaceholderHeader(),
      text: options.text,
      tags: options.tags ?? [],
      createdAt: Date.now(),
      media: [],
      reminders: [],
    };

    await storage.saveEntry(entry);

    if (options.media?.length) {
      for (const raw of options.media) {
        const media: MediaFile = { ...raw, entryId: id };
        await storage.saveMediaWithBlob(media);
        entry.media.push(media);
      }
      await storage.saveEntry(entry);
    }

    set((state) => ({
      entries: upsertEntryInList(state.entries, entry),
      currentEntry: entry,
    }));
    return entry;
  },

  updateEntry: async (entry: Entry) => {
    await storage.saveEntry(entry);
    set((state) => ({
      entries: upsertEntryInList(state.entries, entry),
      currentEntry: state.currentEntry?.id === entry.id ? entry : state.currentEntry,
    }));
  },

  updateEntryHeader: async (id: string, header: string) => {
    const entry =
      get().entries.find((e) => e.id === id) ||
      (get().currentEntry?.id === id ? get().currentEntry : null);
    if (!entry) throw new Error('Entry not found');
    const updated = { ...entry, header: header.trim() || makePlaceholderHeader() };
    await get().updateEntry(updated);
  },

  deleteEntry: async (id: string) => {
    await storage.deleteEntry(id);
    set((state) => ({
      entries: state.entries.filter((e) => e.id !== id),
      currentEntry: state.currentEntry?.id === id ? null : state.currentEntry,
    }));
  },

  setCurrentEntry: (entry: Entry | null) => {
    set({ currentEntry: entry });
  },

  setCurrentDate: (date: string) => {
    set({ currentDate: date });
  },

  addMediaToEntry: async (entryId: string, media: MediaFile) => {
    let entry =
      get().entries.find((e) => e.id === entryId) ||
      (await storage.getEntry(entryId));
    if (!entry) throw new Error('Entry not found');

    const mediaItem: MediaFile = { ...media, entryId };
    await storage.saveMediaWithBlob(mediaItem);
    entry = { ...entry, media: [...entry.media, mediaItem] };
    await storage.saveEntry(entry);

    set((state) => ({
      entries: upsertEntryInList(state.entries, entry),
      currentEntry: state.currentEntry?.id === entryId ? entry : state.currentEntry,
    }));
  },

  removeMediaFromEntry: async (entryId: string, mediaId: string) => {
    const entry = get().entries.find((e) => e.id === entryId);
    if (!entry) throw new Error('Entry not found');

    const updated = {
      ...entry,
      media: entry.media.filter((m) => m.id !== mediaId),
    };
    await storage.deleteMedia(mediaId);
    await storage.saveEntry(updated);

    set((state) => ({
      entries: upsertEntryInList(state.entries, updated),
      currentEntry: state.currentEntry?.id === entryId ? updated : state.currentEntry,
    }));
  },

  addReminderToEntry: async (entryId: string, reminder: Reminder) => {
    const entry = get().entries.find((e) => e.id === entryId);
    if (!entry) throw new Error('Entry not found');

    const updated = { ...entry, reminders: [...entry.reminders, reminder] };
    await storage.saveReminder(reminder);
    await storage.saveEntry(updated);

    set((state) => ({
      entries: upsertEntryInList(state.entries, updated),
      currentEntry: state.currentEntry?.id === entryId ? updated : state.currentEntry,
    }));
  },

  loadEntryWithMedia: async (id: string) => {
    const entry = await storage.getEntry(id);
    if (entry) {
      set((state) => ({
        entries: upsertEntryInList(state.entries, entry),
        currentEntry: entry,
      }));
    }
    return entry;
  },

  searchEntries: async (query: string, tags: string[] = []) => {
    try {
      const allEntries = await storage.getAllEntries();
      const q = query.trim().toLowerCase();

      return allEntries.filter((entry) => {
        const matchesQuery =
          !q ||
          entry.header.toLowerCase().includes(q) ||
          (entry.text?.toLowerCase().includes(q) ?? false) ||
          entry.tags.some((t) => t.toLowerCase().includes(q));

        const matchesTags =
          tags.length === 0 || tags.some((tag) => entry.tags.includes(tag));

        return matchesQuery && matchesTags;
      });
    } catch (err) {
      set({ error: (err as Error).message });
      return [];
    }
  },
}));
