import { getImageDataUrl, ImageDataError } from "@/lib/image-data";

const MAX_CHAT_IMAGE_SIZE = 500 * 1024;

export class ChatImageError extends Error {}

export async function getChatImageDataUrl(value: FormDataEntryValue | null) {
  try {
    return await getImageDataUrl(
      value,
      MAX_CHAT_IMAGE_SIZE,
      "حجم الصورة يجب ألا يتجاوز 500 كيلوبايت.",
      "اختر صورة بصيغة JPG أو PNG أو WEBP أو GIF.",
    );
  } catch (error) {
    if (error instanceof ImageDataError) throw new ChatImageError(error.message);
    throw error;
  }
}
