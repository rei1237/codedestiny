import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { JSDOM, VirtualConsole } from 'jsdom';
import postcss from 'postcss';

export const usageFile = new URL('./data/legacy-home-style-usage.json', import.meta.url);
export const digest = value => createHash('sha256').update(value).digest('hex');
export const deferredSheets = new Set([
  'fortune-ui-home', 'fortune-gateway', 'tarot-ritual', 'consultation-method-guide',
  'home-mv', 'press-coverage', 'saju-reading',
].map(name => '/styles/' + name + '.css'));

// Sheets the capture records and the split may shorten. Both sides use this,
// so a sheet whose content hash (and file name) changed is still recognised.
export const trackedSheet = (url, size) => deferredSheets.has(url)
  || ((/^\/css\/shell\/(?:home|s)-[0-9a-f]+\.css$/.test(url) || url === '/styles/cosmic-main.css') && size >= 15000);

function isDeferredSheet(el, url) {
  if (!deferredSheets.has(url) || el.attributes.length !== 4) return false;
  const onload = el.getAttribute('onload');
  return (el.rel === 'preload' && el.getAttribute('as') === 'style' && onload === "this.onload=null;this.rel='stylesheet'")
    || (el.rel === 'stylesheet' && el.media === 'print' && onload === "this.onload=null;this.media='all'");
}

// The recording has to survive the daily edits to the home. It therefore keeps
// no byte offsets, file hashes or page hash (the 11-24 version did, and turned
// itself off for good after the next edit). A rule is named by its at-rule chain
// and selector, an element by the fields below. Only a rule that was seen and
// unused at capture may leave the first paint; anything written since stays.
const short = value => digest(value).slice(0, 12);
export function ruleKey(rule) {
  const chain = [];
  for (let parent = rule.parent; parent && parent.type !== 'root'; parent = parent.parent) {
    if (parent.type === 'atrule') chain.unshift('@' + parent.name + ' ' + parent.params.replace(/\s+/g, ' ').trim());
  }
  return short(chain.join('{') + '|' + rule.selector.replace(/\s+/g, ' ').trim());
}
const shellElements = document => [...document.body.querySelectorAll('*')]
  .filter(el => !['SCRIPT', 'LINK', 'STYLE', 'TEMPLATE', 'NOSCRIPT'].includes(el.tagName));
const signature = el => short([el.tagName, el.id, el.getAttribute('class'), el.getAttribute('role'), el.getAttribute('data-action')].join('|'));
export const homeSignatures = document => [...new Set(shellElements(document).map(signature))].sort();

export function splitTop(text, test) {
  const parts = [];
  let depth = 0, quote = null, from = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '\\') { i++; continue; }
    if (quote) { if (c === quote) quote = null; continue; }
    if (c === '"' || c === "'") quote = c;
    else if (c === '(' || c === '[') depth++;
    else if (c === ')' || c === ']') depth--;
    else if (!depth && test(c)) { parts.push(text.slice(from, i)); from = i + 1; }
  }
  parts.push(text.slice(from));
  return parts;
}

// What the subject (last compound) of a selector demands of an element.
// null means it cannot be judged statically, so the rule is kept.
function subject(complex) {
  let compound = splitTop(complex.trim(), c => /[\s>+~]/.test(c)).filter(Boolean).at(-1) || '';
  if (/:(?:is|where|has|host)\(|\\/i.test(compound)) return null;
  compound = compound.replace(/\[[^\]]*\]/g, '').replace(/::?[\w-]+(?:\((?:[^()]|\([^()]*\))*\))?/g, '');
  const tag = (compound.match(/^[a-z][\w-]*/i) || [])[0]?.toLowerCase();
  return {
    tag,
    ids: [...compound.matchAll(/#([\w-]+)/g)].map(m => m[1]),
    classes: [...compound.matchAll(/\.([\w-]+)/g)].map(m => m[1]),
  };
}
const fits = (need, el) => !need || ((!need.tag || need.tag === el.tag)
  && need.ids.every(id => id === el.id) && need.classes.every(name => el.classes.has(name)));

function initialCss(source, unused, added) {
  const sheet = postcss.parse(source);
  sheet.walkRules(rule => {
    if (rule.parent?.name?.endsWith('keyframes')) return;
    if (/\.yh-|\[data-home-yeoni\b|\.cdh-top\b|\.cd-boot-gate\b|#cdMobileBottomNav\b/.test(rule.selector)) return;
    for (let parent = rule.parent; parent; parent = parent.parent) {
      if (parent.type === 'atrule' && /prefers-|forced-colors|\bprint\b/.test(parent.params)) return;
    }
    if (rule.nodes.some(n => n.type === 'decl' && /^(?:animation|transition)(?:-|$)/.test(n.prop))) return;
    // Used at capture, or written since: the recording cannot vouch for it.
    if (!unused.has(ruleKey(rule))) return;
    // A closed panel can have no layout at capture time. Retain its hidden
    // state so an existing layer never flashes or intercepts a first touch.
    if (rule.nodes.some(n => n.type === 'decl' && (
      (['display', 'visibility', 'content-visibility', 'pointer-events'].includes(n.prop) && /hidden|none/.test(n.value))
      || (n.prop === 'opacity' && Number(n.value) === 0)
    ))) return;
    // Markup added after the capture may be the first to use an old rule.
    if (added.length && splitTop(rule.selector, c => c === ',').some(part => {
      const need = subject(part);
      return added.some(el => fits(need, el));
    })) return;
    rule.remove();
  });
  sheet.walkAtRules(rule => { if (rule.nodes && !rule.nodes.length) rule.remove(); });
  return sheet.toString();
}

// CSS for Home, My and Find is already present. A gesture enables the full
// styles in their original cascade slots before an optional workflow opens.
// After load the full sheets are fetched at idle, so that gesture finds them
// in the cache instead of starting a download (both paths are immutable).
const activate = `(function(){
  var armed = false, pending = null;
  function install() {
    document.querySelectorAll('template[data-home-workflow-css]').forEach(function(t){ t.replaceWith(t.content); });
  }
  function restore() {
    armed = true;
    install();
    if (!pending && document.readyState === 'loading') {
      pending = new MutationObserver(install);
      pending.observe(document.documentElement,{childList:true,subtree:true});
    }
  }
  function warm() {
    document.querySelectorAll('template[data-home-workflow-css]').forEach(function(t){
      var sheet = t.content.querySelector('link[href]');
      if (!sheet) return;
      var hint = document.createElement('link');
      hint.rel = 'prefetch'; hint.as = 'style'; hint.href = sheet.getAttribute('href');
      document.head.appendChild(hint);
    });
  }
  ['pointerover','pointerdown','touchstart','focusin','keydown','scroll','hashchange','beforeprint'].forEach(function(type){
    addEventListener(type, restore, {capture:true, once:true, passive:true});
  });
  if (location.search || location.hash) restore();
  try {
    if (localStorage.getItem('fortune_auth_token') || localStorage.getItem('fortune_auth_user') || /(?:^|;\\s*)fortune_auth_role=/.test(document.cookie)) restore();
  } catch (_) {}
  document.addEventListener('DOMContentLoaded', function(){ if (pending) pending.disconnect(); if (armed) install(); }, {once:true});
  addEventListener('load', function(){
    if (window.requestIdleCallback) requestIdleCallback(warm, {timeout:3000}); else setTimeout(warm, 200);
  }, {once:true});
})();`;

export function optimizeLegacyHomePaint(html, dist, coverage, report = () => {}) {
  if (!html.includes('id="cdHomeFunnel"') || html.includes('data-home-workflow-css')) return html;
  const profile = coverage || JSON.parse(readFileSync(usageFile, 'utf8'));
  // An older or unreadable recording must never shorten anything.
  if (profile.version !== 2 || !Array.isArray(profile.unused) || !Array.isArray(profile.elements)) {
    report('[legacy-home-paint] skipped: recording is not version 2. Run scripts/capture-legacy-home-style-usage.mjs');
    return html;
  }
  const unused = new Set(profile.unused), known = new Set(profile.elements);
  const dom = new JSDOM(html, { includeNodeLocations: true, virtualConsole: new VirtualConsole() });
  const document = dom.window.document;
  const edits = [], rewritten = new Map();
  try {
    const elements = shellElements(document);
    const added = elements.filter(el => !known.has(signature(el))).map(el => ({
      tag: el.tagName.toLowerCase(), id: el.id, classes: new Set(el.classList),
    }));
    let before = 0, after = 0;
    for (const el of document.querySelectorAll('link[href]')) {
      if (el.closest('template,noscript')) continue;
      const href = el.getAttribute('href');
      const url = href.split('?')[0];
      const deferred = isDeferredSheet(el, url);
      if (!deferred && (el.rel !== 'stylesheet' || el.attributes.length !== 2)) continue;
      const file = path.join(dist, url);
      if (!existsSync(file) || !trackedSheet(url, statSync(file).size)) continue;
      const original = readFileSync(file, 'utf8');
      const initial = initialCss(original, unused, added);
      if (initial.length > original.length * .85) continue;
      before += original.length; after += initial.length;
      const portable = !/@import\b|<\/style/i.test(initial) && !Array.from(initial.matchAll(/url\(\s*(["']?)([^)"']+)\1\s*\)/gi))
        .some(match => !/^(?:\/|data:|https?:|#)/i.test(match[2]));
      const {startOffset, endOffset} = dom.nodeLocation(el);
      let first;
      if (deferred && portable && Buffer.byteLength(initial) < 9000) {
        first = '<style>' + initial + '</style>';
        rewritten.set(href, '');
      } else {
        // Keep a relative @import or image in the same directory as its source.
        const parent = portable ? '/css/shell' : path.posix.dirname(url);
        const asset = parent + '/first-' + digest(initial).slice(0,16) + '.css';
        const target = path.join(dist, asset);
        mkdirSync(path.dirname(target), {recursive:true});
        writeFileSync(target, initial);
        const link = el.cloneNode(false);
        link.setAttribute('href', asset);
        first = link.outerHTML;
        rewritten.set(href, asset);
      }
      const originalLink = document.createElement('link');
      originalLink.rel = 'stylesheet';
      originalLink.setAttribute('href',href);
      const full = originalLink.outerHTML;
      const noscript = el.nextElementSibling?.tagName === 'NOSCRIPT' &&
        html.slice(dom.nodeLocation(el.nextElementSibling).startOffset, dom.nodeLocation(el.nextElementSibling).endOffset).includes(href);
      edits.push([startOffset,endOffset,first + '<template data-home-workflow-css>' + full + '</template>' + (noscript ? '' : '<noscript>' + full + '</noscript>')]);
    }
    report('[legacy-home-paint] ' + edits.length + ' sheets ' + before + ' -> ' + after + ' bytes; '
      + added.length + '/' + elements.length + ' elements newer than the recording');
    if (!edits.length) return html;
    const hinted = new Set();
    for (const el of document.querySelectorAll('link[rel="preload"][as="style"]:not([onload])')) {
      const href = el.getAttribute('href');
      if (!rewritten.has(href)) continue;
      const {startOffset, endOffset} = dom.nodeLocation(el);
      const asset = rewritten.get(href);
      const hint = asset && !hinted.has(asset) ? '<link data-cd-home-preload rel="preload" as="style" href="' + asset + '">' : '';
      hinted.add(asset);
      edits.push([startOffset,endOffset,hint]);
    }
    const end = dom.nodeLocation(document.head).endTag.startOffset;
    edits.push([end, end, '<script>' + activate + '</script>']);
    let output = html;
    for (const [start, end, content] of edits.sort((a,b) => b[0] - a[0])) output = output.slice(0,start) + content + output.slice(end);
    return output;
  } finally { dom.window.close(); }
}
