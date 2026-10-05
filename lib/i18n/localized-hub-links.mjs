import { FEATURE_INTRODUCTIONS, introductionRoutes } from './feature-introductions.mjs';

// Only link to translations that already have a generated public route.
// Tool actions, query strings and payment/auth destinations keep their contracts.
export function localizeHubLinks(html, locale) {
  if (!['ja', 'en', 'zh', 'zh-tw'].includes(locale)) return html;
  const routes = Object.fromEntries(['ziwei', 'sukuyo', 'today', 'insights', 'fortune']
    .map(topic => [`/${topic}/`, `/${locale}/${topic}/`]));
  for (const [topic, translations] of Object.entries(FEATURE_INTRODUCTIONS)) {
    if (translations[locale]) routes[introductionRoutes(topic).ko] = introductionRoutes(topic)[locale];
  }
  return html.replace(/<a\b[^>]*>/gi, tag => {
    const href = /\bhref="([^"]+)"/.exec(tag)?.[1];
    if (!href) return tag;
    // The six homepage cards use real hubs as their no-JS destinations.
    // Keep data-action: the selected locale's existing tool still opens with JS.
    const quickZiwei = /\bclass="cdh-method"/.test(tag) && /\bdata-cd-service-id="ziwei"/.test(tag);
    const localized = quickZiwei && href === '/ziwei/chart/'
      ? routes['/ziwei/'] : routes[href.endsWith('/') ? href : `${href}/`];
    return localized ? tag.replace(`href="${href}"`, `href="${localized}"`) : tag;
  });
}
