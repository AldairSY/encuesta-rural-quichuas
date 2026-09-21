export type SupportedImageMime = "image/jpeg" | "image/png" | "image/webp";

export function detectImageMime(bytes: Uint8Array): SupportedImageMime | null {
  const png =
    bytes[0] === 137 &&
    bytes[1] === 80 &&
    bytes[2] === 78 &&
    bytes[3] === 71 &&
    bytes[4] === 13 &&
    bytes[5] === 10 &&
    bytes[6] === 26 &&
    bytes[7] === 10;
  if (png) return "image/png";

  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (jpeg) return "image/jpeg";

  const webp =
    new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" &&
    new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";
  return webp ? "image/webp" : null;
}

export function imageExtension(mime: SupportedImageMime) {
  return mime === "image/png" ? "png" : mime === "image/jpeg" ? "jpg" : "webp";
}
