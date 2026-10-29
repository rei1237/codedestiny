const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// Only used with trusted markup from our shared display-copy renderers.
// Translate complete text nodes and descriptive attributes before React renders
// the HTML. URLs, IDs, artwork, prices and event handling are never rewritten.
export function localizeNativeHomeHtml(html, locale, copy) {
  if (locale === 'ko') return html;
  const translated = new Map(Object.entries(copy).filter(([, row]) => row[locale]).map(([source, row]) => [escape(source), escape(row[locale])]));
  const text = value => {
    const trimmed = value.trim();
    const target = translated.get(trimmed);
    return target === undefined ? value : value.replace(trimmed, () => target);
  };
  return html.replace(/>([^<>]+)</g, (_, value) => `>${text(value)}<`)
    .replace(/\b(aria-label|title|alt)="([^"]*)"/g, (_, name, value) => `${name}="${text(value)}"`)
    .replace(/\blang="ko"/g, `lang="${locale}"`);
}
