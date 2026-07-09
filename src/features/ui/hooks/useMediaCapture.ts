import { useRef, useState, useCallback } from 'react';
import type { MediaFile } from '../../../lib/types/index';
import { createMediaFile } from '../../../lib/media';

export function useMediaCapture() {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const resolveRef = useRef<((media: MediaFile) => void) | null>(null);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const startVoiceRecord = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;

    const chunks: BlobPart[] = [];
    mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
    mediaRecorder.onstop = () => {
      stopStream();
      const blob = new Blob(chunks, { type: 'audio/webm' });
      resolveRef.current?.(createMediaFile('voice', blob));
      resolveRef.current = null;
      setIsRecording(false);
    };

    mediaRecorder.start();
    setIsRecording(true);
  }, []);

  const stopVoiceRecord = useCallback((): Promise<MediaFile> => {
    return new Promise((resolve, reject) => {
      if (!mediaRecorderRef.current || !isRecording) {
        reject(new Error('Not recording'));
        return;
      }
      resolveRef.current = resolve;
      mediaRecorderRef.current.stop();
    });
  }, [isRecording]);

  const filesToMedia = (files: FileList | File[], type: MediaFile['type']): MediaFile[] =>
    Array.from(files).map((file) => createMediaFile(type, file, file.name));

  return {
    isRecording,
    startVoiceRecord,
    stopVoiceRecord,
    filesToMedia,
  };
}
