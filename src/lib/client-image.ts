// Client-side image helper — resizes a chosen photo down to a small square-ish
// JPEG before upload so avatar uploads are always tiny (well under limits).

export async function resizeImageToJpeg(file: File, maxDim = 512, quality = 0.85): Promise<Blob> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('Could not read that image file'));
      i.src = objectUrl;
    });

    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas is not supported in this browser');
    ctx.drawImage(img, 0, 0, w, h);

    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (!blob) throw new Error('Could not process the image');
    return blob;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
