export type WallpaperTarget = "lock" | "home" | "both";
export type ScreenSize = { width: number; height: number };

export function normalizeScreen(width: number, height: number): ScreenSize {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return { width: 1080, height: 2340 };
  const short = Math.min(width, height), long = Math.max(width, height);
  const scale = Math.min(1, 2160 / short, 4096 / long);
  return { width: Math.max(720, Math.round(short * scale)), height: Math.max(1280, Math.round(long * scale)) };
}

// Fit the whole original inside safe padding. No crop, stretch or upscaling of the artwork.
export function wallpaperFit(image: ScreenSize, screen: ScreenSize, size = 1, position = 0.5) {
  const scale = Math.min(1, screen.width * 0.9 / image.width, screen.height * 0.82 / image.height) * Math.min(1, Math.max(0.6, size));
  const width = Math.round(image.width * scale), height = Math.round(image.height * scale);
  const top = screen.height * 0.04, bottom = screen.height * 0.14;
  return { x: Math.round((screen.width - width) / 2), y: Math.round(top + (screen.height - top - bottom - height) * Math.min(1, Math.max(0, position))), width, height };
}

export async function fittedWallpaper(source: string, imageSize: ScreenSize, screen: ScreenSize, size: number, position: number, background: string, name: string): Promise<File> {
  const picture = new Image();
  await new Promise<void>((resolve, reject) => { picture.onload = () => resolve(); picture.onerror = () => reject(new Error("IMAGE_READ_FAILED")); picture.src = source; });
  const canvas = document.createElement("canvas");
  canvas.width = screen.width; canvas.height = screen.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("IMAGE_EXPORT_FAILED");
  context.fillStyle = background; context.fillRect(0, 0, canvas.width, canvas.height);
  const fit = wallpaperFit(imageSize, screen, size, position);
  context.drawImage(picture, fit.x, fit.y, fit.width, fit.height);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(result => result ? resolve(result) : reject(new Error("IMAGE_EXPORT_FAILED")), "image/png"));
  return new File([blob], name, { type: "image/png" });
}
