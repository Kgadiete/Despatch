import { useEffect, useMemo } from 'react';
import type { MediaFile } from '../../../lib/types/index';
import { blobUrl } from '../../../lib/media';

interface MediaPreviewProps {
  media: MediaFile;
  onRemove?: () => void;
}

const MediaPreview = ({ media, onRemove }: MediaPreviewProps) => {
  const url = useMemo(() => (media.blob ? blobUrl(media.blob) : null), [media.blob]);

  useEffect(() => {
    if (!url) return;
    return () => URL.revokeObjectURL(url);
  }, [url]);

  if (!media.blob && !url) {
    return (
      <div className="bg-slate-700 p-3 rounded text-sm text-gray-400">{media.name} (loading…)</div>
    );
  }

  return (
    <div className="bg-slate-700 p-3 rounded space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-300 truncate">{media.name}</span>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-red-400 hover:text-red-300 text-xs shrink-0 ml-2"
          >
            Remove
          </button>
        )}
      </div>

      {media.type === 'photo' && url && (
        <img src={url} alt={media.name} className="w-full rounded max-h-48 object-cover" />
      )}
      {media.type === 'video' && url && (
        <video src={url} controls className="w-full rounded max-h-48" />
      )}
      {media.type === 'voice' && url && <audio src={url} controls className="w-full" />}
      {media.type === 'file' && url && (
        <a href={url} download={media.name} className="text-amber-400 text-sm underline">
          Download file
        </a>
      )}
    </div>
  );
};

export default MediaPreview;
