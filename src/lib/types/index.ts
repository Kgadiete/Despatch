// Core types for Despatch Diary

export interface MediaFile {
  id: string;
  entryId: string;
  type: 'voice' | 'photo' | 'video' | 'file';
  name: string;
  mimeType: string;
  size: number;
  createdAt: number;
  fileHandle?: FileSystemFileHandle; // For File System Access API
  blob?: Blob; // Fallback for IndexedDB storage
}

export interface Entry {
  id: string;
  header: string; // e.g., "HT76CBGP"
  text?: string;
  tags: string[];
  createdAt: number; // timestamp
  media: MediaFile[];
  reminders: Reminder[];
}

export interface Reminder {
  id: string;
  entryId: string;
  message: string;
  scheduledAt: number; // timestamp
  completed: boolean;
  notificationShown: boolean;
}

export interface DayArchive {
  date: string; // YYYY-MM-DD
  entries: Entry[];
}

export interface WeekArchive {
  weekNumber: number;
  year: number;
  days: DayArchive[];
}

export interface MonthArchive {
  month: number; // 1-12
  year: number;
  weeks: WeekArchive[];
}

export interface YearArchive {
  year: number;
  months: MonthArchive[];
}

/** One forklift batch — accepted tyres only (rejects not counted). */
export interface Trip {
  id: string;
  sessionId: string;
  count: number;
  notes?: string;
  createdAt: number;
  media: MediaFile[];
}

/** Daily tyre inspection counting session. */
export interface CountingSession {
  id: string;
  date: string; // YYYY-MM-DD
  createdAt: number;
  trips: Trip[];
  notes?: string;
  media: MediaFile[];
}
