// Natal day-master element, not the most abundant element or today's fortune.
const ELEMENTS = Object.freeze({
  '목': { name: '목 · 나무', color: '#a8d6b2', shade: '#244d3b', symbol: '<path d="M24 35V21m0 8c-9 0-13-5-12-12 8-1 12 3 12 12Zm0-6c0-8 4-12 12-12 1 8-4 13-12 12Z"/>' },
  '화': { name: '화 · 불', color: '#ffb39b', shade: '#743b32', symbol: '<path d="M25 10c2 8 10 10 10 18a11 11 0 0 1-22 0c0-5 3-8 5-11 0 5 2 6 3 7 4-4 5-9 4-14Z"/><path d="M24 27c-2 3-4 5-4 7a4 4 0 0 0 8 0c0-2-2-5-4-7Z"/>' },
  '토': { name: '토 · 흙', color: '#edcf91', shade: '#695035', symbol: '<path d="m10 33 9-17 6 10 4-7 10 14H10Z"/><path d="m16 22 3 3 3-3m4 14h9M14 38h9"/>' },
  '금': { name: '금 · 쇠', color: '#e5e5f0', shade: '#50516b', symbol: '<path d="m16 13 16 0 7 11-15 14L9 24l7-11Z"/><path d="M9 24h30M16 13l8 25 8-25M16 13l8 11 8-11"/>' },
  '수': { name: '수 · 물', color: '#aad6ed', shade: '#304e71', symbol: '<path d="M24 10c-4 7-12 13-12 19a12 12 0 0 0 24 0c0-6-8-12-12-19Z"/><path d="M17 29c0 4 3 7 7 7m-6-13 2-3"/>' },
});

export function elementBadgeMarkup(element) {
  const badge = ELEMENTS[element];
  if (!badge) return '';
  return `<span class="pc-element-badge" title="사주 일간을 기준으로 한 타고난 오행" style="--pc-element:${badge.color};--pc-element-shade:${badge.shade}"><svg class="pc-element-seal" viewBox="0 0 48 48" aria-hidden="true" focusable="false"><path class="pc-element-rim" d="M24 6C10-3 1 10 8 22-1 35 13 47 24 40c13 8 25-5 17-17C48 10 36-1 24 6Z"/><path class="pc-element-enamel" d="M24 10C13 3 6 14 12 23 5 34 15 42 24 36c10 6 20-4 13-13C43 13 33 4 24 10Z"/><g class="pc-element-symbol">${badge.symbol}</g><path class="pc-element-glint" d="M10 16c0-4 3-6 6-6"/><circle class="pc-element-cheek" cx="13" cy="29" r="2"/><circle class="pc-element-cheek" cx="35" cy="29" r="2"/></svg><span><span class="pc-element-caption">타고난 오행</span><strong>${badge.name}</strong></span></span>`;
}
