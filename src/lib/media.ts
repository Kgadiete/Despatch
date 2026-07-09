import type { MediaFile } from './types/index';

export function createMediaFile(
  type: MediaFile['type'],
  blob: Blob,
  name?: string
): MediaFile {
  const id = `media-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const defaultNames: Record<MediaFile['type'], string> = {
    voice: `Voice · ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`,
    photo: `Photo · ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`,
    video: `Video · ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`,
    file: name || 'Attachment',
  };

  return {
    id,
    entryId: '',
    type,
    name: name || defaultNames[type],
    mimeType: blob.type || 'application/octet-stream',
    size: blob.size,
    createdAt: Date.now(),
    blob,
  };
}

export function blobUrl(blob: Blob): string {
  return URL.createObjectURL(blob);
}
