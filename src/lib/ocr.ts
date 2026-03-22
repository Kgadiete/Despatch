import { createWorker, type Worker } from 'tesseract.js';
import type { OCRResult } from '@/types';
import { extractFieldsFromText } from './ocr-patterns';

let worker: Worker | null = null;
let currentProgressCallback: ((progress: number) => void) | null = null;

async function getWorker(): Promise<Worker> {
  if (!worker) {
    worker = await createWorker('eng', undefined, {
      logger: (m) => {
        if (currentProgressCallback && m.status === 'recognizing text') {
          currentProgressCallback(m.progress);
        }
      },
    });
  }
  return worker;
}

export async function recognizeSlip(
  imageBlob: Blob,
  onProgress?: (progress: number) => void,
): Promise<OCRResult> {
  currentProgressCallback = onProgress ?? null;
  const w = await getWorker();

  // Pre-process image for better OCR on metal/plastic tags
  const processedBlob = await preprocessImage(imageBlob);

  const { data } = await w.recognize(processedBlob);

  currentProgressCallback = null;

  const rawText = data.text;
  const fields = extractFieldsFromText(rawText);

  return { raw_text: rawText, fields };
}

export async function terminateOCR(): Promise<void> {
  if (worker) {
    await worker.terminate();
    worker = null;
  }
}

/** Increase contrast and convert to grayscale for better OCR on metal tags */
function preprocessImage(blob: Blob): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;

      // Draw original
      ctx.drawImage(img, 0, 0);

      // Get image data and increase contrast + grayscale
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const contrast = 1.5;
      const offset = 128 * (1 - contrast);

      for (let i = 0; i < data.length; i += 4) {
        // Grayscale
        const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        // Apply contrast
        const val = Math.min(255, Math.max(0, gray * contrast + offset));
        data[i] = val;
        data[i + 1] = val;
        data[i + 2] = val;
      }

      ctx.putImageData(imageData, 0, 0);
      canvas.toBlob((b) => resolve(b || blob), 'image/jpeg', 0.9);
    };
    img.src = URL.createObjectURL(blob);
  });
}
