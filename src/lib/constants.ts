export const PRESET_TAGS = [
  'urgent',
  'tyres',
  'invoice',
  'loading',
  'dispatch',
  'driver',
] as const;

export type PresetTag = (typeof PRESET_TAGS)[number];

export function makePlaceholderHeader(date = new Date()): string {
  const time = date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `Untitled · ${time}`;
}

export function isPlaceholderHeader(header: string): boolean {
  return header.startsWith('Untitled ·');
}
