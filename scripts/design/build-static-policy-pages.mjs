// Build-time React only: reuse current legal/CMS sources and emit ordinary HTML/CSS.
import fs from 'node:fs';
import { trustDocumentLinks } from '../../lib/i18n/public-trust-copy.mjs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { STATIC_POLICY_ROUTES, policyStaticPath } from '../../lib/navigation/static-policy-routes.mjs';
import { BRAND_FACTS } from '../../lib/brand/brand-facts.mjs';

const root = process.cwd();
const cache = path.resolve('build-cache/static-policies');
fs.mkdirSync(cache, { recursive: true });
const outfile = path.join(cache, 'pages.cjs');
const imports = STATIC_POLICY_ROUTES.map((route, index) => `import * as p${index} from './app/${route.source}/page.js';`).join('\n');

await build({
  stdin: {
    contents: `${imports}\nexport const pages=[${STATIC_POLICY_ROUTES.map((_, index) => `p${index}`).join(',')}];\nexport { BUSINESS_IDENTITY, SUPPORT_EMAIL } from './lib/site-policy-config.js';\nexport { buildOrganizationJsonLd, buildWebsiteJsonLd } from './lib/structured-data';\nexport { toCanonicalUrl } from './lib/seo/siteSeo';\nexport { FOOTER_BYLINE, FOOTER_LINKS, FOOTER_TRUST_LINKS, FOOTER_NOTICE } from './lib/brand/site-footer';`,
    resolveDir: root,
  },
  outfile,
  bundle: true,
  platform: 'node',
  format: 'cjs',
  jsx: 'automatic',
  external: ['react', 'react-dom', 'react/jsx-runtime', '/icons/*', '/assets/*', '/images/*'],
  loader: { '.js': 'jsx', '.css': 'local-css' },
  logLevel: 'silent',
  plugins: [{
    name: 'static-html-elements',
    setup(builder) {
      // About-only CSS is linked separately; other policy pages do not download its fonts.
      builder.onLoad({ filter: /[\\/]about[\\/]service-intro(?:-fonts)?\.css$/ }, (args) => ({
        contents: '', loader: 'css', resolveDir: path.dirname(args.path),
      }));
      builder.onLoad({ filter: /[\\/]styles[\\/]trust-stories\.css$/ }, () => ({ contents: '', loader: 'css' }));
      builder.onResolve({ filter: /^next\/(link|image)$/ }, (args) => ({ path: args.path, namespace: 'static-html' }));
      builder.onLoad({ filter: /.*/, namespace: 'static-html' }, (args) => ({
        resolveDir: root,
        loader: 'jsx',
        contents: args.path === 'next/link'
          ? `export default function Link({href,children,prefetch,replace,scroll,shallow,locale,...props}){return <a href={href} {...props}>{children}</a>}`
          : `export default function Image({src,alt,width,height,sizes,priority,quality,unoptimized,fill,...props}){return <img src={src} alt={alt} width={width} height={height} loading="lazy" decoding="async" {...props}/>}`,
      }));
    },
  }],
});

const require = createRequire(import.meta.url);
delete require.cache[outfile];
const compiled = require(outfile);
const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const compiledCssPath = path.join(cache, 'pages.css');
const styles = (fs.existsSync(compiledCssPath) ? fs.readFileSync(compiledCssPath, 'utf8') + '\n' : '')
  + fs.readFileSync('styles/static-policy.css', 'utf8');
fs.mkdirSync('public/styles', { recursive: true });
fs.mkdirSync('public/js', { recursive: true });
// Replace the mirrored source atomically; overwriting it immediately after the
// copy can fail on Windows and leave the public stylesheet incomplete.
const publicCssPath = 'public/styles/static-policy.css';
const temporaryCssPath = `${publicCssPath}.${process.pid}.tmp`;
try {
  fs.writeFileSync(temporaryCssPath, styles);
  fs.renameSync(temporaryCssPath, publicCssPath);
} finally {
  if (fs.existsSync(temporaryCssPath)) fs.unlinkSync(temporaryCssPath);
}
for (const file of ['service-intro.css', 'service-intro-fonts.css']) {
  fs.copyFileSync(`app/about/${file}`, `public/styles/${file}`);
}
const introVersion = createHash('sha256').update(fs.readFileSync('app/about/service-intro.css', 'utf8').replace(/\r\n?/g, '\n')).digest('hex').slice(0, 12);
const themeVersion = createHash('sha256').update(fs.readFileSync('styles/theme-tokens.css')).digest('hex').slice(0, 12);
const cssVersion = createHash('sha256').update(styles).digest('hex').slice(0, 12);
const faqSource = fs.readFileSync('js/faq-search.js');
const faqVersion = createHash('sha256').update(faqSource).digest('hex').slice(0, 12);
const contactSource = fs.readFileSync('js/static-policy-contact.js');
const contactVersion = createHash('sha256').update(contactSource).digest('hex').slice(0, 12);
const business = compiled.BUSINESS_IDENTITY;
const email = compiled.SUPPORT_EMAIL;
const siteSchema = JSON.stringify({ '@context': 'https://schema.org', '@graph': [compiled.buildOrganizationJsonLd(), compiled.buildWebsiteJsonLd()] }).replace(/</g, '\\u003c');
const nav = STATIC_POLICY_ROUTES.map((route) => `<a href="${route.canonical}/">${route.label}</a>`).join('')
  + trustDocumentLinks().map(({ href, label }) => `<a href="${href}">${escape(label)}</a>`).join('');
// 푸터는 React 푸터(SiteFooterHub)와 같은 최소 규격이다(2026-10-16 "직관성"): 전문성 한 줄 → 정책 링크 → 안내 한 줄 → 사업자 정보.
const footerLink = ({ href, text, strong }, quiet) => `<a href="${href}"${strong ? ' class="is-strong"' : quiet ? ' class="is-quiet"' : ''}>${escape(text)}</a>`;
const footerNav = compiled.FOOTER_LINKS.map((link) => footerLink(link)).join('')
  + '<span class="policy-legal-break" aria-hidden="true"></span>'
  + compiled.FOOTER_TRUST_LINKS.map((link) => footerLink(link, true)).join('');
const summary = [];
const publisherId = fs.readFileSync('ads.txt', 'utf8').match(/^google\.com,\s*(pub-\d+),\s*DIRECT,/m)?.[1];
if (!publisherId) throw new Error('Missing Google publisher record in ads.txt');
const accountMeta = `<meta name="google-adsense-account" content="ca-${publisherId}">`;

for (let index = 0; index < STATIC_POLICY_ROUTES.length; index += 1) {
  const route = STATIC_POLICY_ROUTES[index];
  const page = compiled.pages[index];
  const metadata = page.generateMetadata ? await page.generateMetadata() : page.metadata;
  if (!metadata?.description) throw new Error(`Missing policy metadata: ${route.key}`);
  const title = typeof metadata.title === 'string' ? metadata.title : metadata.title?.absolute || metadata.title?.default || route.label;
  const canonical = compiled.toCanonicalUrl(route.canonical);
  const alternates = Object.entries(metadata.alternates?.languages || {}).map(([lang, href]) => `<link rel="alternate" hreflang="${escape(lang)}" href="${escape(href)}">`).join('');
  const robots = typeof metadata.robots === 'string'
    ? metadata.robots
    : `${metadata.robots?.index === false ? 'noindex' : 'index'}, ${metadata.robots?.follow === false ? 'nofollow' : 'follow'}`;
  const image = metadata.openGraph?.images?.[0];
  const imageUrl = typeof image === 'string' ? image : image?.url;
  const seoTags = accountMeta + `<meta name="robots" content="${escape(robots)}"><meta name="googlebot" content="${escape(robots)}"><meta property="og:type" content="${escape(metadata.openGraph?.type || 'website')}">${imageUrl ? `<meta property="og:image" content="${escape(imageUrl)}">` : ''}${metadata.keywords ? `<meta name="keywords" content="${escape(Array.isArray(metadata.keywords) ? metadata.keywords.join(', ') : metadata.keywords)}">` : ''}`;
  let main = renderToStaticMarkup(createElement(page.default));
  if (!main.includes('<main') || !main.includes('<h1')) throw new Error(`Incomplete policy content: ${route.key}`);
  if (route.key === 'contact') main = main.replace(/<form\b/, `<form data-policy-contact data-support-email="${escape(email)}"`);
  main = main.replace('<main ', '<main id="policyContent" ');
  const phone = String(business.phone || '');
  const pressStyles = route.key === 'about' ? `<link rel="stylesheet" href="/styles/trust-stories.css"><link rel="stylesheet" href="/styles/press-coverage.css"><link rel="stylesheet" href="/styles/service-intro.css?v=${introVersion}">` : '';
  const contactScript = route.key === 'contact'
    ? `<script src="/js/static-policy-contact.js?v=${contactVersion}" defer></script><noscript><p class="policy-nojs">문의는 <a href="mailto:${escape(email)}">${escape(email)}</a>로 보내주세요. 입력 내용을 자동으로 전송하지 않습니다.</p></noscript>`
    : '';
  const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><title>${escape(title)}</title><meta name="description" content="${escape(metadata.description)}"><link rel="canonical" href="${escape(canonical)}">${alternates}<meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(metadata.description)}"><meta property="og:url" content="${escape(canonical)}"><meta property="og:site_name" content="${escape(BRAND_FACTS.service.name)}"><link rel="icon" href="/icons/app-logo-96.png"><script>try{if(localStorage.getItem('fortuneThemeModeStateV1')==='neo')document.documentElement.classList.add('neo-mode')}catch(e){}</script><link rel="stylesheet" href="/styles/theme-tokens.css?v=${themeVersion}"><link rel="stylesheet" href="/styles/static-policy.css?v=${cssVersion}">${pressStyles}<link rel="stylesheet" href="/styles/fonts-serif.css" media="print" onload="this.onload=null;this.media='all'"><noscript><link rel="stylesheet" href="/styles/fonts-serif.css"></noscript>${seoTags}<script type="application/ld+json">${siteSchema}</script></head><body class="cd-policy-static"><a class="policy-skip" href="#policyContent">본문 바로가기</a><header class="policy-site-header"><div class="policy-header-shell"><a class="policy-brand" href="/"><img src="/icons/app-logo-512.webp" alt="" width="512" height="512"><span><strong>CODE DESTINY</strong><small>${escape(BRAND_FACTS.service.name)}</small></span></a><nav class="policy-main-nav" aria-label="메인 서비스 바로가기"><a href="/">홈</a><a href="/saju/">사주</a><a href="/tarot/mingri/">타로</a><a href="/astrology/">점성술</a><a href="/insights/">운세 인사이트</a></nav><details class="policy-menu"><summary>메뉴</summary><nav aria-label="정책 메뉴">${nav}</nav></details></div></header>${main}<footer class="policy-site-footer" aria-label="사이트 정보"><p class="policy-footer-byline"><a href="/about/#author"><img src="/icons/moonlight-garden-v1-512.webp" alt="" width="512" height="512" loading="lazy"><span><strong>꿀꿀 운세</strong> — ${escape(compiled.FOOTER_BYLINE)}</span></a></p><nav class="policy-legal-nav" aria-label="회사 및 정책 링크">${footerNav}</nav><p class="policy-notice">${escape(compiled.FOOTER_NOTICE)}</p><p class="policy-business"><span>상호명 ${escape(business.companyName)}</span><span>대표자 ${escape(business.representative)}</span><span>사업자등록번호 ${escape(business.registrationNumber)}</span><span>통신판매업 신고번호 ${escape(business.mailOrderNumber)}</span><span>연락처 <a href="tel:${escape(phone.replace(/[^0-9]/g, ''))}">${escape(phone)}</a></span><span>이메일 <a href="mailto:${escape(email)}">${escape(email)}</a></span><span>사업장 주소 ${escape(business.address)}</span></p><p class="policy-copyright">© 2026 꿀꿀 운세 · CODE DESTINY</p></footer>${contactScript}${route.key === 'faq' ? `<script type="module" src="/js/faq-search.js?v=${faqVersion}"></script>` : ''}</body></html>`;
  const target = path.join(root, 'public', policyStaticPath(route));
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, html);
  summary.push({ route: route.canonical, aliases: route.aliases, bytes: Buffer.byteLength(html), reactRuntime: false });
}

fs.copyFileSync('js/faq-search.js', 'public/js/faq-search.js');
fs.copyFileSync('js/static-policy-contact.js', 'public/js/static-policy-contact.js');
fs.writeFileSync(path.join(cache, 'manifest.json'), JSON.stringify(summary, null, 2));
console.log('[static-policies] generated 6 pages from current content, without React runtime');
