/** Decode a base64 image locally; fetch(data:) is blocked by the site's CSP. */
export function dataUrlToBlob(dataUrl: string): Blob {
  const match = /^data:(image\/[\w.+-]+);base64,([\s\S]+)$/.exec(dataUrl);
  if (!match) throw new Error("Invalid image data URL");
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: match[1] });
}
