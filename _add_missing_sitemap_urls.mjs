/**
 * _add_missing_sitemap_urls.mjs
 * 사이트맵에 누락된 실제 존재 페이지 추가
 */
import { readFileSync, writeFileSync } from 'fs';

const BASE = 'https://code-destiny.com';
const LOCALES = ['', '/de-de', '/en-us', '/es-es', '/fr-fr', '/hi-in', '/ja-jp', '/ms-my', '/nl-nl', '/zh-cn'];
const today = '2026-04-05';

// 누락된 실제 앱 라우트
const MISSING_ROUTES = [
  { path: '/oracle/hwatu-life',       cf: 'weekly', pri: 0.85 },
  { path: '/oracle/royal-tea',        cf: 'weekly', pri: 0.85 },
  { path: '/oracle/sikojen-povailu',  cf: 'weekly', pri: 0.85 },
  { path: '/saju/love-simulation',    cf: 'weekly', pri: 0.85 },
  { path: '/saju-picture',            cf: 'weekly', pri: 0.85 },
  { path: '/olympus',                 cf: 'monthly', pri: 0.70 },
];

let sitemap = readFileSync('sitemap.xml', 'utf8');

// 기존 URL 세트 (중복 방지)
const existingUrls = new Set(
  [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1])
);

let newEntries = '';
let added = 0;

for (const route of MISSING_ROUTES) {
  for (const locale of LOCALES) {
    const url = `${BASE}${locale}${route.path}`;
    if (!existingUrls.has(url)) {
      newEntries += `  <url>\n    <loc>${url}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${route.cf}</changefreq>\n    <priority>${route.pri}</priority>\n  </url>\n`;
      added++;
    }
  }
}

sitemap = sitemap.replace('</urlset>', newEntries + '</urlset>');
writeFileSync('sitemap.xml', sitemap, 'utf8');
console.log(`✅ ${added}개 URL 추가 완료`);
console.log(`총 URL: ${(sitemap.match(/<loc>/g) || []).length}`);
