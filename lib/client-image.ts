const TARGET_SIZE = 500 * 1024;
const MAX_DIMENSION = 1400;

function blobFromCanvas(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error("تعذر ضغط الصورة على هذا الجهاز.")),
      type,
      quality,
    );
  });
}

export async function compressImageFile(
  file: File,
  { maxBytes = TARGET_SIZE, maxDimension = MAX_DIMENSION } = {},
) {
  if (!file.type.startsWith("image/")) throw new Error("اختر ملف صورة صالحاً.");

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("تعذر فتح الصورة. جرّب صورة بصيغة JPG أو PNG أو WEBP.");
  }

  try {
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    let width = Math.max(1, Math.round(bitmap.width * scale));
    let height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) throw new Error("تعذر تجهيز الصورة للضغط.");

    for (let resizeAttempt = 0; resizeAttempt < 6; resizeAttempt++) {
      canvas.width = width;
      canvas.height = height;
      context.clearRect(0, 0, width, height);
      context.drawImage(bitmap, 0, 0, width, height);

      for (const quality of [0.88, 0.82, 0.76, 0.68, 0.6, 0.52]) {
        const blob = await blobFromCanvas(canvas, "image/webp", quality);
        if (blob.type !== "image/webp") throw new Error("متصفحك لا يدعم حفظ الصور بصيغة WebP.");
        if (blob.size <= maxBytes) {
          const baseName = file.name.replace(/\.[^.]+$/, "") || "image";
          return new File([blob], `${baseName}.webp`, { type: "image/webp", lastModified: Date.now() });
        }
      }

      width = Math.max(1, Math.round(width * 0.82));
      height = Math.max(1, Math.round(height * 0.82));
    }
  } finally {
    bitmap.close();
  }

  throw new Error("تعذر تقليص الصورة إلى 500 كيلوبايت مع الحفاظ على وضوحها. اختر صورة أصغر.");
}
