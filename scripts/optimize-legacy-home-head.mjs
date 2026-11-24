// Package the parser-blocking assets of the Korean web entry without changing
// their execution or cascade order. Detail routes, native shells and Next pages
// retain their original assets. Run after the existing dist minify/extract steps.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { JSDOM, VirtualConsole } from 'jsdom';
import { optimizeLegacyHomePaint } from './optimize-legacy-home-paint.mjs';

const ORIGIN = 'https://shell.invalid';
const inlineStyleLimit = 9 * 1024;
const inlineScriptLimit = 24 * 1024;

// These small classic scripts deliberately have parser-time dependencies. Keep
// original tag positions and separate script scopes; only their delivery changes.
const bootScripts = new Set([
  '/js/inline/canonical-redirect.js', '/js/inline/global-error-guard.js',
  '/js/inline/gesture-arbiter.js', '/js/core/free-fortune-policy.js',
  '/js/core/pass-verdict.js', '/js/core/birth-scope-unlocks.js',
  '/js/core/auth-hint.js', '/js/core/payment-service.js', '/js/core/app-context.js',
]);

// Other links may be replaced or queried by service code. Only these static
// shell styles and the previous build step's immutable inline-CSS groups qualify.
const ownedStyles = new Set([
  '/css/paid-editorial-report.css', '/styles/review-reward.css', '/styles/trust-stories.css',
  '/styles/moonlit-birth-form.css', '/styles/theme-tokens.css', '/styles/fortune-reading-actions.css',
  '/styles/service-entry-scene.css', '/styles/guide-primitives.css', '/styles/core-ui.css',
  '/styles/yehwa-motifs.css', '/styles/yehwa-motifs-nav.css', '/styles/brand-typography.css',
  '/styles/cosmic-main.css', '/styles/mobile-totem-flower-fix.css', '/styles/yehwa-home.css',
  '/styles/home-featured-actions.css', '/styles/home-finder.css', '/styles/first-visit-guide.css',
  '/styles/home-consultation-picker.css', '/styles/concern-first-home.css', '/styles/my-garden.css',
  '/styles/saju-tea-entry.css', '/styles/fortune-consultation-entry.css', '/styles/fortune-consultation.css',
]);
const generatedStyle = /^\/css\/shell\/s-[0-9a-f]{16}\.css$/;
const plainImports = new Map([
  ['/styles/core-ui.css', '/styles/brand-typography.css'],
  ['/styles/brand-typography.css', '/styles/fonts-ui.generated.css'],
]);

// The owned sheets already use root-absolute URLs. Leave a sheet in place if
// a future edit introduces a URL that would resolve differently after bundling.
function portableSheet(dist, pathname) {
  let usesUiFonts = false;
  let css = readFileSync(path.join(dist, pathname), 'utf8');
  if (/@import/i.test(css)) {
    const match = /^@import\s*["']([^"']+)["']\s*;/i.exec(css);
    const expected = plainImports.get(pathname);
    if (!match || !expected || new URL(match[1], ORIGIN + pathname).pathname !== expected) return null;
    // Both original import chains reach the same font-face registry.
    if (expected === '/styles/fonts-ui.generated.css') {
      usesUiFonts = true;
      css = css.slice(match[0].length);
    } else {
      const dependency = portableSheet(dist, expected);
      if (!dependency) return null;
      usesUiFonts = dependency.usesUiFonts;
      css = dependency.css + '\n' + css.slice(match[0].length);
    }
  }
  if (/@(?:import|charset|namespace)\b|<\/style/i.test(css)) return null;
  for (const match of css.matchAll(/url\(\s*(["']?)([^)"']+)\1\s*\)/gi)) {
    if (!/^(?:\/|data:|https?:|#)/i.test(match[2])) return null;
  }
  return { css, usesUiFonts };
}

export function optimizeLegacyHomeHead(html, dist) {
  if (!html.includes('id="cdHomeFunnel"') || html.includes('data-cd-home-preload')) return html;
  const headEnd = html.indexOf('</head>');
  if (headEnd < 0) return html;
  const dom = new JSDOM(html.slice(0, headEnd + 7), { includeNodeLocations: true, virtualConsole: new VirtualConsole() });
  const head = dom.window.document.head;
  const headStart = dom.nodeLocation(head)?.startTag;
  if (!headStart) { dom.window.close(); return html; }
  const edits = [], hints = new Set();
  const groups = [];
  let group = [];

  function replace(node, text) {
    const { startOffset, endOffset } = dom.nodeLocation(node);
    edits.push({ start: startOffset, end: endOffset, text });
  }
  function flush() {
    if (!group.length) return;
    groups.push(group);
    group = [];
  }
  function emit(group, lastFontOwner, registry) {
    const css = group.map(item => item === lastFontOwner ? registry + "\n" + item.css : item.css).join("\n");
    if (Buffer.byteLength(css) < inlineStyleLimit) {
      replace(group[0].node, '<style>' + css + '</style>');
    } else if (group.length > 1 || group[0].flattened) {
      const hash = createHash('sha256').update(css).digest('hex').slice(0, 16);
      const href = '/css/shell/home-' + hash + '.css';
      const target = path.join(dist, href);
      mkdirSync(path.dirname(target), { recursive: true });
      writeFileSync(target, css);
      replace(group[0].node, '<link rel="stylesheet" href="' + href + '">');
      hints.add(href);
    } else {
      hints.add(group[0].href);
    }
    group.slice(1).forEach(item => replace(item.node, ''));
  }

  for (const node of head.children) {
    const attrs = Object.fromEntries(Array.from(node.attributes, attr => [attr.name, attr.value]));
    if (node.localName === 'link' && attrs.rel === 'stylesheet' && /^\/(?!\/)/.test(attrs.href || '') && node.attributes.length === 2) {
      const pathname = new URL(attrs.href, ORIGIN).pathname;
      if (ownedStyles.has(pathname) || generatedStyle.test(pathname)) {
        const sheet = portableSheet(dist, pathname);
        if (sheet) {
          group.push({ node, ...sheet, href: attrs.href, flattened: plainImports.has(pathname) });
          continue;
        }
      }
      hints.add(attrs.href);
    }
    // Never move style rules across another sheet, script or conditional noscript.
    flush();
    if (node.localName === 'script' && /^\/(?!\/)/.test(attrs.src || '') && node.attributes.length === 1) {
      const pathname = new URL(attrs.src, ORIGIN).pathname;
      if (!bootScripts.has(pathname) && !/^\/js\/shell\/s-[0-9a-f]{16}\.js$/.test(pathname)) continue;
      const js = readFileSync(path.join(dist, pathname), 'utf8');
      if (Buffer.byteLength(js) <= inlineScriptLimit && !/currentScript|sourceMappingURL|<\/script|import\s*\(/i.test(js)) {
        replace(node, '<script>' + js + '</script>');
      }
    }
  }
  flush();
  // Identical @font-face definitions resolve in reverse source order. Keep
  // their last original position without registering every subset twice.
  const lastFontOwner = groups.flat().findLast(item => item.usesUiFonts);
  const registry = lastFontOwner ? portableSheet(dist, "/styles/fonts-ui.generated.css") : null;
  if (lastFontOwner && !registry) { dom.window.close(); return html; }
  groups.forEach(items => emit(items, lastFontOwner, registry?.css));
  // Keep the encoding declaration inside the HTML encoding prescan window.
  const charset = head.querySelector('meta[charset]');
  const offset = charset ? dom.nodeLocation(charset).endOffset : headStart.endOffset;
  dom.window.close();
  if (!edits.length) return html;
  const preload = [...hints].map(href => '<link data-cd-home-preload rel="preload" as="style" href="' + href.replaceAll('&', '&amp;').replaceAll('"', '&quot;') + '">').join('\n');
  edits.push({ start: offset, end: offset, text: '\n' + preload });
  let result = html;
  for (const { start, end, text } of edits.sort((a, b) => b.start - a.start)) {
    result = result.slice(0, start) + text + result.slice(end);
  }
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href && process.env.NEXT_PUBLIC_RUNTIME_TARGET !== 'mobile-app') {
  const dist = path.resolve('dist');
  const entry = path.join(dist, 'ggulggul', 'index.html');
  if (existsSync(entry)) {
    const html = readFileSync(entry, 'utf8');
    const head = optimizeLegacyHomeHead(html, dist);
    const packed = process.env.CD_RECORD_HOME_STYLES === '1' ? head : optimizeLegacyHomePaint(head, dist);
    if (packed !== html) writeFileSync(entry, packed);
    console.log('[legacy-home-head] Render-blocking assets packaged for /ggulggul/.');
  }
}
