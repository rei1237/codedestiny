/** Presentation only: never advances a bow session or counts cycles. */
export function createSpriteCompositor(canvas: HTMLCanvasElement, size = 384) {
 const context = canvas.getContext('2d');
 const previous = document.createElement('canvas');
 previous.width = previous.height = size;
 const old = previous.getContext('2d');
 if (!context || !old) throw new Error('Sprite canvas unavailable');
 canvas.width = canvas.height = size;
 let pending = 0, painted = false, disposed = false;
 let paint: ((amount: number) => void) | null = null, started = 0;
 const cancel = () => { if (pending) cancelAnimationFrame(pending); pending = 0; };
 const tick = (now: number) => {
  pending = 0;
  if (disposed || !paint) return;
  const amount = document.hidden ? 1 : Math.min(1, (now - started) / 70);
  paint(amount);
  if (amount < 1) pending = requestAnimationFrame(tick);
 };
 function show(image: HTMLImageElement, frame: number, immediate = false) {
  if (disposed) return;
  // Snapshot the displayed composite, even when its transition was interrupted.
  old!.clearRect(0, 0, size, size);
  if (painted) old!.drawImage(canvas, 0, 0);
  const cell = image.naturalWidth / 4;
  const draw = (amount: number) => {
   context!.clearRect(0, 0, size, size);
   context!.globalCompositeOperation = 'source-over';
   context!.globalAlpha = 1 - amount;
   context!.drawImage(previous, 0, 0);
   // Complementary premultiplied alpha avoids a transparent midpoint flicker.
   context!.globalCompositeOperation = 'lighter';
   context!.globalAlpha = amount;
   context!.drawImage(image, frame % 4 * cell, Math.floor(frame / 4) * cell, cell, cell, 0, 0, size, size);
   context!.globalAlpha = 1;
   context!.globalCompositeOperation = 'source-over';
  };
  paint = draw;
  if (!painted || immediate || document.hidden) { cancel(); draw(1); painted = true; return; }
  started = performance.now();
  // Keep the pending callback; frequent state updates must not starve a slow display.
  if (!pending) pending = requestAnimationFrame(tick);
 }
 const hide = () => { if (document.hidden) cancel(); };
 document.addEventListener('visibilitychange', hide);
 return {show, dispose() { disposed = true; cancel(); document.removeEventListener('visibilitychange', hide); previous.width = previous.height = 0; }};
}
