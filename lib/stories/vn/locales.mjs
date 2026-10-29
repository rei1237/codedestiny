// The novel has its own language choice; it must not change consultation language.
export const NOVEL_LOCALES = Object.freeze(['ko', 'en', 'ja', 'zh-CN', 'zh-TW']);
export const NOVEL_LANGUAGE_LABELS = Object.freeze({
  ko: '한국어', en: 'English', ja: '日本語', 'zh-CN': '简体中文', 'zh-TW': '繁體中文',
});

export function resolveNovelLocale(value) {
  const tag = String(value || '').trim().toLowerCase().replaceAll('_', '-');
  const base = tag.split('-')[0];
  if (base === 'ko' || base === 'ja') return base;
  if (base === 'zh') return /(?:^|-)(?:hant|tw|hk|mo)(?:-|$)/.test(tag) ? 'zh-TW' : 'zh-CN';
  return 'en';
}
