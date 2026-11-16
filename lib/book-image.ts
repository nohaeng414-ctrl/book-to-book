import { getImageDataUrl, ImageDataError } from "@/lib/image-data";

const MAX_BOOK_IMAGE_SIZE = 500 * 1024;

export class BookImageError extends Error {}

export async function getBookImageDataUrl(value: FormDataEntryValue | null) {
  try {
    return await getImageDataUrl(
      value,
      MAX_BOOK_IMAGE_SIZE,
      "حجم صورة الغلاف بعد الضغط يجب ألا يتجاوز 500 كيلوبايت.",
      "اختر صورة بصيغة JPG أو PNG أو WEBP أو GIF.",
    );
  } catch (error) {
    if (error instanceof ImageDataError) throw new BookImageError(error.message);
    throw error;
  }
}
