/** Resolve modern CSS colors in the capture clone using the browser's sRGB rasterizer. */
export function normalizeCaptureColors(doc: Document, root: HTMLElement): void {
  const view = doc.defaultView;
  const canvas = doc.createElement('canvas');
  canvas.width = canvas.height = 1;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!view || !context) throw new Error('PDF_CAPTURE_COLOR_CONTEXT_UNAVAILABLE');
  const colors = new Map<string, string>();
  const convert = (color: string): string => {
    const cached = colors.get(color);
    if (cached) return cached;
    if (!view.CSS.supports('color', color)) throw new Error('PDF_CAPTURE_INVALID_COLOR');
    context.clearRect(0, 0, 1, 1);
    context.fillStyle = color;
    context.fillRect(0, 0, 1, 1);
    const [r, g, b, alpha] = context.getImageData(0, 0, 1, 1).data;
    const rgba = `rgba(${r}, ${g}, ${b}, ${alpha / 255})`;
    colors.set(color, rgba);
    return rgba;
  };
  for (const element of [root, ...Array.from(root.querySelectorAll<HTMLElement>('*'))]) {
    const computed = view.getComputedStyle(element);
    for (const property of Array.from(computed)) {
      if (!/(?:color$|^(?:background-image|box-shadow|text-shadow|fill|stroke)$)/.test(property) || property.startsWith('--')) continue;
      const value = computed.getPropertyValue(property);
      const pattern = /\b(?:color-mix|color|oklab|oklch|lab|lch|light-dark)\(/g;
      let match: RegExpExecArray | null, offset = 0, converted = '';
      while ((match = pattern.exec(value))) {
        let end = pattern.lastIndex, depth = 1;
        while (end < value.length && depth) {
          if (value[end] === '(') depth++;
          if (value[end] === ')') depth--;
          end++;
        }
        if (depth) throw new Error('PDF_CAPTURE_INVALID_COLOR');
        converted += value.slice(offset, match.index) + convert(value.slice(match.index, end));
        offset = end; pattern.lastIndex = end;
      }
      if (offset) element.style.setProperty(property, converted + value.slice(offset), 'important');
    }
  }
}
