/** Compress an image blob to a max width, preserving aspect ratio */
export function compressImage(blob: Blob, maxWidth = 1024): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (result) => resolve(result || blob),
        'image/jpeg',
        0.85,
      );
    };
    img.src = URL.createObjectURL(blob);
  });
}
