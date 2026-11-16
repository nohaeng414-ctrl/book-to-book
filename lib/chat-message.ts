export const IMAGE_MESSAGE_PREFIX = "bookchat:image:";

export type ParsedChatMessage = {
  text: string;
  imageUrl?: string;
};

export function encodeImageMessage(imageUrl: string, text: string) {
  return `${IMAGE_MESSAGE_PREFIX}${JSON.stringify({ imageUrl, text })}`;
}

export function parseChatMessage(content: string): ParsedChatMessage {
  if (!content.startsWith(IMAGE_MESSAGE_PREFIX)) return { text: content };

  try {
    const parsed: unknown = JSON.parse(content.slice(IMAGE_MESSAGE_PREFIX.length));
    if (
      parsed &&
      typeof parsed === "object" &&
      "imageUrl" in parsed &&
      typeof parsed.imageUrl === "string" &&
      /^data:image\/(?:jpeg|png|webp|gif);base64,/.test(parsed.imageUrl)
    ) {
      return {
        imageUrl: parsed.imageUrl,
        text: "text" in parsed && typeof parsed.text === "string" ? parsed.text : "",
      };
    }
  } catch {
    // Show malformed historic message content as plain text.
  }

  return { text: content };
}
