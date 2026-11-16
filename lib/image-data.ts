const IMAGE_SIGNATURES = [
  {
    mimeType: "image/png",
    matches: (bytes: Buffer) =>
      bytes.length >= 8 &&
      bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
  },
  {
    mimeType: "image/jpeg",
    matches: (bytes: Buffer) =>
      bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
  },
  {
    mimeType: "image/webp",
    matches: (bytes: Buffer) =>
      bytes.length >= 12 &&
      bytes.toString("ascii", 0, 4) === "RIFF" &&
      bytes.toString("ascii", 8, 12) === "WEBP",
  },
  {
    mimeType: "image/gif",
    matches: (bytes: Buffer) =>
      bytes.length >= 6 && ["GIF87a", "GIF89a"].includes(bytes.toString("ascii", 0, 6)),
  },
] as const;

export class ImageDataError extends Error {}

export async function getImageDataUrl(
  value: FormDataEntryValue | null,
  maxSize: number,
  sizeError: string,
  formatError: string,
): Promise<string | undefined> {
  if (!(value instanceof File) || value.size === 0) return undefined;
  if (value.size > maxSize) throw new ImageDataError(sizeError);

  const bytes = Buffer.from(await value.arrayBuffer());
  const imageType = IMAGE_SIGNATURES.find(({ matches }) => matches(bytes))?.mimeType;
  if (!imageType) throw new ImageDataError(formatError);

  return `data:${imageType};base64,${bytes.toString("base64")}`;
}
