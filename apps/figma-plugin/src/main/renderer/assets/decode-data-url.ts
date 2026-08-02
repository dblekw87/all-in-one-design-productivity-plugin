export function decodeDataUrl(dataUrl: string): Uint8Array {
  const match = /^data:[^;,]+;base64,(.+)$/i.exec(dataUrl);
  if (!match) throw new Error("INLINE_IMAGE_DATA_URL_INVALID");
  const binary = atob(match[1]!);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}
