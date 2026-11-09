// Each dimension changes a visible part. Animation timing is deliberately excluded.
export const PET_APPEARANCE_VERSION = 2;
export const PET_APPEARANCE_VARIANTS = Object.freeze({ headwear: 16, neckwear: 16, prop: 16, trim: 8, charm: 8, pattern: 4 });
export const PET_APPEARANCE_COMBINATIONS = Object.values(PET_APPEARANCE_VARIANTS).reduce((total, count) => total * count, 1);
export function rollPetAppearance(random) {
  return { version: PET_APPEARANCE_VERSION, ...Object.fromEntries(Object.entries(PET_APPEARANCE_VARIANTS).map(([key, count]) => [key, Math.floor(random() * count)])) };
}
export function petAppearanceKey(appearance) {
  if (appearance?.version !== PET_APPEARANCE_VERSION) return null;
  const values = Object.entries(PET_APPEARANCE_VARIANTS).map(([key, count]) => Number.isInteger(appearance[key]) && appearance[key] >= 0 && appearance[key] < count ? appearance[key] : null);
  return values.includes(null) ? null : 'pet-v2:' + values.join('.');
}
export const PET_TRIM_HUES = Object.freeze([0, 28, 62, 110, 160, 200, 250, 310]);
const charms = [
  'M12 3l2.7 5.6 6.2.9-4.5 4.3 1.1 6.2-5.5-2.9L6.5 20l1.1-6.2-4.5-4.3 6.2-.9Z',
  'M5 7h11v7a5.5 5.5 0 0 1-11 0Zm11 1h2a3 3 0 0 1 0 6h-2M3 21h17',
  'M12 9C6 0 0 9 8 12c-8 5-2 12 4 4 6 8 12 1 4-4 8-3 2-12-4-3ZM12 10v4m-2-2h4',
  'M4 20 17 5m-9 10c-5-7 2-13 12-12 1 10-4 17-12 12Zm5-5h5m-8 3v-5',
  'M17 4A8 8 0 1 0 20 17 9 9 0 0 1 17 4Z',
  'M12 12C2 14 2 3 8 4c4-7 10 0 4 8 8-6 15 0 8 4 1 6-10 6-8-4Zm0 0-4 9',
  'M12 20C-3 10 6 0 12 7 18 0 27 10 12 20Z',
  'M5 20 18 6M5 16C1 6 9 2 21 3c0 12-7 18-16 13Zm5-6 1 6m3-9 1 5',
];
export function petCharmMarkup(index) {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + charms[index] + '"/></svg>';
}
