import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import postcss from 'postcss';
import { JSDOM, VirtualConsole } from 'jsdom';
import { popularTop5Copy } from '../js/core/popular-top5.mjs';

// Keep styles in their exported cascade order. The reduced sheet covers the
// server-rendered document; the original Next resource also loads for later
// dialogs, locale changes and client navigation.
function needsInitialRule(selector, classes) {
  return postcss.list.comma(selector).some(part => {
    // Only drop rules with a mandatory leading class. Retain attributes,
    // functional selectors and unfamiliar CSS syntax conservatively. Tailwind
    // escapes punctuation in class names (e.g. md\:flex and w-\[20px\]).
    const match = /^\.((?:\\[^\da-f\s]|[\w-])+)(?=$|[\s>+~:.#\[])/i.exec(part);
    if (!match) return true;
    const name = match[1].replace(/\\(.)/g, '$1');
    return classes.has(name) || classes.has(name.split('_')[0] + '_*');
  });
}

function coversText(range, codepoints) {
  return range.split(',').some(part => {
    const match = /^u\+([0-9a-f]{1,6})(?:-([0-9a-f]{1,6}))?$/i.exec(part.trim());
    if (!match) return true;
    const low = parseInt(match[1], 16), high = parseInt(match[2] || match[1], 16);
    return codepoints.some(code => code >= low && code <= high);
  });
}

// The popular TOP5 draws its rows only in the display and body families
// (styles/popular-top5.css), so its late glyphs keep only those faces.
const POPULAR_TOP5_FONT_FAMILIES = new Set(['CodeDestinyRounded', 'CodeDestinyBody']);

export function initialStyles(css, classes, codepoints, lateCodepoints = []) {
  const ast = postcss.parse(css);
  ast.walkRules(rule => {
    if (rule.parent.type === 'atrule' && rule.parent.name.endsWith('keyframes')) return;
    if (!needsInitialRule(rule.selector, classes)) rule.remove();
  });
  ast.walkAtRules('font-face', face => {
    const range = face.nodes.find(node => node.prop === 'unicode-range');
    if (!range || coversText(range.value, codepoints)) return;
    const family = face.nodes.find(node => node.prop === 'font-family')?.value.replace(/["']/g, '').trim();
    if (!(lateCodepoints.length && POPULAR_TOP5_FONT_FAMILIES.has(family) && coversText(range.value, lateCodepoints))) face.remove();
  });
  ast.walkAtRules(rule => { if (rule.nodes?.length === 0) rule.remove(); });
  return ast.toString();
}

// Serialized into an async resource so React can hydrate the original head.
function prepareHomeStyles() {
  if (location.pathname === '/' && matchMedia('(max-width: 640px)').matches && !document.querySelector('link[data-home-floral]')) {
    let theme = 'light';
    try {
      if (localStorage.getItem('fortuneThemeModeStateV1') === 'neo') theme = 'dark';
    } catch { /* Storage is optional. */ }
    const hint = document.createElement('link');
    hint.rel = 'preload';
    hint.as = 'image';
    hint.fetchPriority = 'high';
    hint.href = '/images/home/illustrated/moon-floral-' + theme + '-480.webp';
    hint.setAttribute('data-home-floral', '');
    document.head.append(hint);
  }
  const events = ['pointerdown', 'keydown', 'focusin', 'beforeprint'];
  function activate() {
    for (const event of events) window.removeEventListener(event, activate, true);
    for (const sheet of document.querySelectorAll('link[data-cd-home-deferred]')) {
      sheet.removeAttribute('media');
      sheet.disabled = false;
    }
  }
  // Warm the cache once the page has loaded, so the first tap does not wait on the network.
  function warm() {
    for (const sheet of document.querySelectorAll('link[data-cd-home-deferred]')) {
      if (!sheet.disabled) continue;
      const hint = document.createElement('link');
      hint.rel = 'prefetch';
      hint.as = 'style';
      hint.href = sheet.href;
      document.head.append(hint);
    }
  }
  function scheduleWarm() {
    if (window.requestIdleCallback) requestIdleCallback(warm, { timeout: 3000 });
    else setTimeout(warm, 200);
  }
  if (document.readyState === 'complete') scheduleWarm();
  else window.addEventListener('load', scheduleWarm, { once: true });

  // A deep link can open a dialog without a pointer or keyboard event.
  if (location.search || location.hash) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', activate, { once: true });
    else activate();
  } else {
    for (const event of events) window.addEventListener(event, activate, true);
  }
}

export function optimizeNextHomeStyles(directory) {
  for (const route of ['index.html', 'yeongnyangi/index.html']) {
    const target = path.join(directory, route);
    const html = readFileSync(target, 'utf8');
    if (html.includes('data-cd-home-critical')) continue;
    const dom = new JSDOM(html, { virtualConsole: new VirtualConsole() });
    const doc = dom.window.document;
    const classes = new Set([...doc.querySelectorAll('[class]')].flatMap(el => [...el.classList]));
    // An interactive component can reveal focus, pressed and dialog states
    // before its background CSS has arrived. Keep that whole CSS module.
    for (const name of [...classes]) {
      const moduleClass = /^([\w-]+?)_[\w-]+__[\w-]+$/.exec(name);
      if (moduleClass) classes.add(moduleClass[1] + '_*');
    }
    // Both garden themes and keyboard/interaction classes share the same sheet.
    for (const name of ['neo-mode','dark','light','sr-only','hidden','active','open']) classes.add(name);
    // Consent reads browser storage after hydration and can appear before any
    // interaction. Its fixed positioning prevents it from shifting the home.
    classes.add('AnalyticsConsent_*');
    // The popular TOP5 skeleton is server-rendered, but its ranked rows and
    // their copy arrive after hydration. Keep the whole block and its glyphs.
    const popularTop5 = classes.has('cd-pop5');
    if (popularTop5) classes.add('cd-pop5_*');
    const text = [...doc.body.querySelectorAll('*')].filter(el => !el.closest('script, style, template')).flatMap(el => [
      ...[...el.childNodes].filter(node => node.nodeType === 3).map(node => node.textContent),
      el.getAttribute('placeholder') || '', el.getAttribute('aria-label') || '', el.getAttribute('alt') || '',
    ]).join('');
    const codepoints = [...new Set(Array.from(text, ch => ch.codePointAt(0)))];
    const lateCodepoints = popularTop5 ? [...new Set(Array.from(popularTop5Copy(), ch => ch.codePointAt(0)))] : [];
    dom.window.close();
    let before = 0;
    const sheets = [];
    const links = /<link\b[^>]*\brel="stylesheet"[^>]*\bhref="(\/_next\/static\/css\/[\da-f]+\.css)"[^>]*>/g;
    for (const [, url] of html.matchAll(links)) {
      const file = path.join(directory, url);
      const source = readFileSync(file, 'utf8');
      const originalBytes = Buffer.byteLength(source);
      before += originalBytes;
      sheets.push(initialStyles(source, classes, codepoints, lateCodepoints));
    }
    if (!sheets.length) continue;
    // Prefer compact versions of the same two official UI fonts. Existing
    // Unicode ranges still handle names, translations and future copy.
    const fontSheet = route === 'index.html' ? 'entry' : 'yeongnyangi';
    const fonts = readFileSync(path.join(directory, 'assets/fonts/home', fontSheet + '.css'), 'utf8');
    const reduced = sheets.concat(fonts).join('\n');
    const name = 'home-' + createHash('sha256').update(reduced).digest('hex').slice(0, 16) + '.css';
    writeFileSync(path.join(directory, '_next/static/css', name), reduced);
    // Disabled stylesheets keep Next's resource identity and stay unapplied until a route,
    // account menu or keyboard action needs them. Chrome's preload scanner still fetches
    // disabled sheets at the highest priority, so media="print" drops them to the lowest
    // priority behind the LCP image and fonts on slow phones (11-25: LCP 4.6s -> 2.2s).
    const loader = '(' + prepareHomeStyles.toString() + ')();';
    const loaderName = 'home-styles-' + createHash('sha256').update(loader).digest('hex').slice(0, 12) + '.js';
    writeFileSync(path.join(directory, '_next/static', loaderName), loader);
    const loaderTag = '<script async src="/_next/static/' + loaderName + '"></script>';
    let first = true;
    let output = html;
    let imageHint = '';
    if (route === 'index.html') {
      // The floral LCP background otherwise waits for app/layout.js's inline hint, which runs
      // behind the blocking sheet and then shares the line with the entry fonts (11-25).
      // A static hint must stay a hoistable <link>: an inline <script> here breaks hydration
      // (React #418). Neo-theme phones also fetch this 17KB light file; layout.js still adds
      // the dark hint because this tag carries no data-home-floral marker.
      imageHint = '<link rel="preload" as="image" media="(max-width: 640px)" href="/images/home/illustrated/moon-floral-light-480.webp" fetchpriority="high"/>';
    } else {
      imageHint = '<link rel="preload" as="image" type="image/avif" media="(max-width: 699px)" href="/assets/yeongnyangi/night/consultation-room-mobile.avif" fetchpriority="high"/>';
    }
    output = output.replace(links, original => {
      const critical = first ? imageHint + loaderTag + '<link rel="stylesheet" data-cd-home-critical href="/_next/static/css/' + name + '"/>' : '';
      first = false;
      const deferred = original.replace('rel="stylesheet"', 'rel="stylesheet" media="print" disabled data-cd-home-deferred');
      return critical + deferred + '<noscript>' + original + '</noscript>';
    });
    writeFileSync(target, output);
    console.log('[home-styles]', route, 'blocking CSS', before, '->', Buffer.byteLength(reduced), 'bytes');
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  optimizeNextHomeStyles(path.resolve(process.argv[2] || 'dist'));
}
