import { createWorker, type Worker } from 'tesseract.js';
import type { OCRResult, OCRFields } from '@/types';
import { extractFieldsFromText, countExtractedFields } from './ocr-patterns';

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

  let bestText = '';
  let bestFields: OCRFields = {
    job_number: null, cs_number: null, customer: null,
    service_type: null, tyre_make: null, tyre_size: null, serial: null,
  };
  let bestScore = -1;

  // Single pass with light preprocessing (fast — ~10-15s on mobile)
  const processed = await preprocessImage(imageBlob, 0);
  const { data } = await w.recognize(processed);
  const text = data.text;
  const fields = extractFieldsFromText(text);
  const score = countExtractedFields(fields) + (data.confidence / 100) * 0.5;

  if (score > bestScore) {
    bestScore = score;
    bestText = text;
    bestFields = fields;
  }

  // Only try 90° if first pass got <2 fields (rotated label)
  if (countExtractedFields(bestFields) < 2) {
    if (currentProgressCallback) currentProgressCallback(0.5);
    const rotated = await preprocessImage(imageBlob, 90);
    const { data: data2 } = await w.recognize(rotated);
    const fields2 = extractFieldsFromText(data2.text);
    const score2 = countExtractedFields(fields2) + (data2.confidence / 100) * 0.5;
    if (score2 > bestScore) {
      bestText = data2.text;
      bestFields = fields2;
    }
  }

  currentProgressCallback = null;
  return { raw_text: bestText, fields: bestFields };
}

export async function terminateOCR(): Promise<void> {
  if (worker) {
    await worker.terminate();
    worker = null;
  }
}

/**
 * Aggressive image preprocessing for metal/plastic tyre labels:
 * - Upscale small images (Tesseract works best at 300+ DPI equivalent)
 * - Rotate to specified angle
 * - Adaptive thresholding via contrast stretching
 * - Sharpen edges
 * - Binarize (black text on white background)
 */
function preprocessImage(blob: Blob, rotateDeg = 0, invert = false): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const url = img.src;

      // Step 1: Upscale so the shorter side is at least 2000px
      const minDim = Math.min(img.width, img.height);
      const scale = minDim < 2000 ? 2000 / minDim : 1;
      const sw = Math.round(img.width * scale);
      const sh = Math.round(img.height * scale);

      // Step 2: Calculate rotated canvas size
      const radians = (rotateDeg * Math.PI) / 180;
      const cos = Math.abs(Math.cos(radians));
      const sin = Math.abs(Math.sin(radians));
      const rw = Math.round(sw * cos + sh * sin);
      const rh = Math.round(sw * sin + sh * cos);

      const canvas = document.createElement('canvas');
      canvas.width = rw;
      canvas.height = rh;
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

      // White background (important for rotated images)
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, rw, rh);

      // Rotate from center
      ctx.translate(rw / 2, rh / 2);
      ctx.rotate(radians);
      ctx.drawImage(img, -sw / 2, -sh / 2, sw, sh);
      ctx.setTransform(1, 0, 0, 1, 0, 0);

      // Step 3: Pixel-level processing
      const imageData = ctx.getImageData(0, 0, rw, rh);
      const px = imageData.data;

      // Convert to grayscale
      for (let i = 0; i < px.length; i += 4) {
        const gray = px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114;
        px[i] = px[i + 1] = px[i + 2] = gray;
      }

      // Compute histogram for adaptive thresholding
      const hist = new Uint32Array(256);
      for (let i = 0; i < px.length; i += 4) {
        hist[px[i]]++;
      }

      // Find 5th and 95th percentile for contrast stretch
      const totalPixels = rw * rh;
      let cumulative = 0;
      let lo = 0, hi = 255;
      for (let v = 0; v < 256; v++) {
        cumulative += hist[v];
        if (cumulative >= totalPixels * 0.05 && lo === 0) lo = v;
        if (cumulative >= totalPixels * 0.95) { hi = v; break; }
      }

      // Stretch contrast + apply sharpening via unsharp mask approach
      const range = Math.max(hi - lo, 1);
      for (let i = 0; i < px.length; i += 4) {
        let v = ((px[i] - lo) / range) * 255;
        v = Math.min(255, Math.max(0, v));

        // Binarize with Otsu-like threshold (midpoint of stretched range)
        const threshold = invert ? 160 : 128;
        v = v < threshold ? (invert ? 255 : 0) : (invert ? 0 : 255);

        px[i] = px[i + 1] = px[i + 2] = v;
      }

      ctx.putImageData(imageData, 0, 0);
      canvas.toBlob((b) => {
        URL.revokeObjectURL(url);
        resolve(b || blob);
      }, 'image/png');
    };
    img.src = URL.createObjectURL(blob);
  });
}
