// Build-time React only: reuse current legal/CMS sources and emit ordinary HTML/CSS.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { STATIC_POLICY_ROUTES, policyStaticPath } from '../../lib/navigation/static-policy-routes.mjs';

const root = process.cwd();
const cache = path.resolve('build-cache/static-policies');
fs.mkdirSync(cache, { recursive: true });
const outfile = path.join(cache, 'pages.cjs');
const imports = STATIC_POLICY_ROUTES.map((route, index) => `import * as p${index} from './app/${route.source}/page.js';`).join('\n');

await build({
  stdin: {
    contents: `${imports}\nexport const pages=[${STATIC_POLICY_ROUTES.map((_, index) => `p${index}`).join(',')}];\nexport { BUSINESS_IDENTITY, SUPPORT_EMAIL } from './lib/site-policy-config.js';\nexport { buildOrganizationJsonLd, buildWebsiteJsonLd } from './lib/structured-data';\nexport { toCanonicalUrl } from './lib/seo/siteSeo';`,
    resolveDir: root,
  },
  outfile,
  bundle: true,
  platform: 'node',
  format: 'cjs',
  jsx: 'automatic',
  external: ['react', 'react-dom', 'react/jsx-runtime', '/icons/*'],
  loader: { '.js': 'jsx', '.css': 'local-css' },
  logLevel: 'silent',
  plugins: [{
    name: 'static-html-elements',
    setup(builder) {
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
fs.writeFileSync('public/styles/static-policy.css', styles);
const cssVersion = createHash('sha256').update(styles).digest('hex').slice(0, 12);
const contactSource = fs.readFileSync('js/static-policy-contact.js');
const contactVersion = createHash('sha256').update(contactSource).digest('hex').slice(0, 12);
const business = compiled.BUSINESS_IDENTITY;
const email = compiled.SUPPORT_EMAIL;
const siteSchema = JSON.stringify({ '@context': 'https://schema.org', '@graph': [compiled.buildOrganizationJsonLd(), compiled.buildWebsiteJsonLd()] }).replace(/</g, '\\u003c');
const nav = STATIC_POLICY_ROUTES.map((route) => `<a href="${route.canonical}/">${route.label}</a>`).join('');
const summary = [];

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
  const seoTags = `<meta name="robots" content="${escape(robots)}"><meta name="googlebot" content="${escape(robots)}"><meta property="og:type" content="${escape(metadata.openGraph?.type || 'website')}">${imageUrl ? `<meta property="og:image" content="${escape(imageUrl)}">` : ''}${metadata.keywords ? `<meta name="keywords" content="${escape(Array.isArray(metadata.keywords) ? metadata.keywords.join(', ') : metadata.keywords)}">` : ''}`;
  let main = renderToStaticMarkup(createElement(page.default));
  if (!main.includes('<main') || !main.includes('<h1')) throw new Error(`Incomplete policy content: ${route.key}`);
  if (route.key === 'contact') main = main.replace(/<form\b/, `<form data-policy-contact data-support-email="${escape(email)}"`);
  main = main.replace('<main ', '<main id="policyContent" ');
  const phone = String(business.phone || '');
  const contactScript = route.key === 'contact'
    ? `<script src="/js/static-policy-contact.js?v=${contactVersion}" defer></script><noscript><p class="policy-nojs">문의는 <a href="mailto:${escape(email)}">${escape(email)}</a>로 보내주세요. 입력 내용을 자동으로 전송하지 않습니다.</p></noscript>`
    : '';
  const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><title>${escape(title)}</title><meta name="description" content="${escape(metadata.description)}"><link rel="canonical" href="${escape(canonical)}">${alternates}<meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(metadata.description)}"><meta property="og:url" content="${escape(canonical)}"><link rel="icon" href="/icons/app-logo-96.png"><script>try{if(localStorage.getItem('fortuneThemeModeStateV1')==='neo')document.documentElement.classList.add('neo-mode')}catch(e){}</script><link rel="stylesheet" href="/styles/static-policy.css?v=${cssVersion}"><link rel="stylesheet" href="/styles/fonts-serif.css" media="print" onload="this.onload=null;this.media='all'"><noscript><link rel="stylesheet" href="/styles/fonts-serif.css"></noscript>${seoTags}<script type="application/ld+json">${siteSchema}</script></head><body class="cd-policy-static"><a class="policy-skip" href="#policyContent">본문 바로가기</a><header class="policy-site-header"><a class="policy-brand" href="/"><span aria-hidden="true">月花</span>꿀꿀운세</a><a href="/">홈으로 <span aria-hidden="true">↗</span></a></header>${main}<footer class="policy-site-footer"><a class="policy-brand" href="/">月花 · 꿀꿀운세</a><p>당신의 이야기가 꽃피는 달빛 정원</p><nav aria-label="서비스 안내">${nav}</nav><details><summary>사업자 정보</summary><p>${escape(business.companyName)} · 대표 ${escape(business.representative)}<br>사업자등록번호 ${escape(business.registrationNumber)}<br>통신판매업 신고번호 ${escape(business.mailOrderNumber)}<br>${escape(business.address)}<br><a href="tel:${escape(phone.replace(/[^0-9]/g, ''))}">${escape(phone)}</a> · <a href="mailto:${escape(email)}">${escape(email)}</a></p></details><a class="policy-home" href="/">홈으로 돌아가기</a></footer>${contactScript}</body></html>`;
  const target = path.join(root, 'public', policyStaticPath(route));
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, html);
  summary.push({ route: route.canonical, aliases: route.aliases, bytes: Buffer.byteLength(html), reactRuntime: false });
}

fs.copyFileSync('js/static-policy-contact.js', 'public/js/static-policy-contact.js');
fs.writeFileSync(path.join(cache, 'manifest.json'), JSON.stringify(summary, null, 2));
console.log('[static-policies] generated 6 pages from current content, without React runtime');
