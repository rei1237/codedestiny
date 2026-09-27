// Formatting only: never invent, duplicate or truncate interpretation text.
const paragraphs = body => body.trim().split(/\n\s*\n/u).map(part => part.trim()).filter(Boolean);
const sentenceBoundary = /(?<=[^\s\d][.!?。？！]["'”’)\]」』]*)\s+(?=\S)|(?<=[。？！][」』]*)\s*(?=[^\s」』])/u;

export function normalizeNarrativeParagraphs(body, count) {
  if (typeof body !== 'string' || !body.trim()) return body;
  const parts = paragraphs(body);
  while (parts.length < count) {
    // Preserve existing paragraph boundaries. Split the longest paragraph that
    // has multiple sentences; a missing substantive item cannot be fabricated.
    let index = -1, units;
    for (let i = 0; i < parts.length; i++) {
      const candidate = parts[i].split(sentenceBoundary).filter(Boolean);
      if (candidate.length > 1 && (index < 0 || parts[i].length > parts[index].length)) {
        index = i; units = candidate;
      }
    }
    if (index < 0) break;
    const half = parts[index].length / 2;
    let cut = 1, length = units[0].length;
    while (cut < units.length - 1 && length + units[cut].length / 2 < half) length += units[cut++].length;
    parts.splice(index, 1, units.slice(0, cut).join(' '), units.slice(cut).join(' '));
  }
  while (parts.length > count) {
    let index = 0;
    for (let i = 1; i < parts.length - 1; i++) {
      if (parts[i].length + parts[i + 1].length < parts[index].length + parts[index + 1].length) index = i;
    }
    parts.splice(index, 2, `${parts[index]} ${parts[index + 1]}`);
  }
  return parts.join('\n\n');
}

export function normalizeNarrativeEndings(body, locale = 'ko') {
  if (typeof body !== 'string' || !body.trim()) return body;
  const mark = /^(ja|zh)(?:-|$)/i.test(locale) ? '。' : '.';
  return paragraphs(body).map(part => {
    if (/[.!?。？！]["'”’)\]」』]*$/u.test(part)) return part;
    // Insert before closing quotation marks. Provider truncation is checked by
    // the caller before this cosmetic correction; no missing words are supplied.
    return part.replace(/(["'”’)\]」』]*)$/u, `${mark}$1`);
  }).join('\n\n');
}
