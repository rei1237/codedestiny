/** Widths must match `images.imageSizes` ∪ `images.deviceSizes` in next.config.mjs */
export type NextImageWidth = 16 | 32 | 64 | 96 | 128 | 256 | 384 | 640 | 750 | 1080;

/**
 * Same optimizer pipeline as `next/image` — usable from legacy HTML or vanilla JS.
 * @param pathname Absolute path, e.g. `/fuctionassets/flower.webp` (may include `%20`).
 */
export function optimizedPublicImageUrl(
  pathname: string,
  width: NextImageWidth,
  quality = 75
): string {
  return `/_next/image?url=${encodeURIComponent(pathname)}&w=${width}&q=${quality}`;
}
