import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { JSDOM, VirtualConsole } from 'jsdom';
import postcss from 'postcss';

export const usageFile = new URL('./data/legacy-home-style-usage.json', import.meta.url);
export const digest = value => createHash('sha256').update(value).digest('hex');
export const deferredSheets = new Set([
  'fortune-ui-home', 'fortune-gateway', 'tarot-ritual', 'consultation-method-guide',
  'home-mv', 'press-coverage', 'saju-reading',
].map(name => '/styles/' + name + '.css'));

function isDeferredSheet(el, url) {
  if (!deferredSheets.has(url) || el.attributes.length !== 4) return false;
  const onload = el.getAttribute('onload');
  return (el.rel === 'preload' && el.getAttribute('as') === 'style' && onload === "this.onload=null;this.rel='stylesheet'")
    || (el.rel === 'stylesheet' && el.media === 'print' && onload === "this.onload=null;this.media='all'");
}

// A new or moved element may use a rule the previous recording never needed.
// Keep the complete original styles until a developer captures the new shell.
export function homeStructure(document) {
  const hash = createHash('sha256');
  for (const el of document.body.querySelectorAll('*')) {
    if (['SCRIPT', 'LINK', 'STYLE', 'TEMPLATE', 'NOSCRIPT'].includes(el.tagName)) continue;
    hash.update([el.tagName, el.id, el.getAttribute('class'), el.getAttribute('role'), el.getAttribute('data-action')].join('|') + '\n');
  }
  return hash.digest('hex');
}

function initialCss(source, ranges) {
  const sheet = postcss.parse(source);
  sheet.walkRules(rule => {
    if (rule.parent?.name?.endsWith('keyframes')) return;
    if (/\.yh-|\[data-home-yeoni\b|\.cdh-top\b|\.cd-boot-gate\b|#cdMobileBottomNav\b/.test(rule.selector)) return;
    for (let parent = rule.parent; parent; parent = parent.parent) {
      if (parent.type === 'atrule' && /prefers-|forced-colors|\bprint\b/.test(parent.params)) return;
    }
    if (rule.nodes.some(n => n.type === 'decl' && /^(?:animation|transition)(?:-|$)/.test(n.prop))) return;
    const { start, end } = rule.source;
    if (ranges.some(([left, right]) => left < end.offset && right > start.offset)) return;
    // A closed panel can have no layout at capture time. Retain its hidden
    // state so an existing layer never flashes or intercepts a first touch.
    if (rule.nodes.some(n => n.type === 'decl' && (
      (['display', 'visibility', 'content-visibility', 'pointer-events'].includes(n.prop) && /hidden|none/.test(n.value))
      || (n.prop === 'opacity' && Number(n.value) === 0)
    ))) return;
    rule.remove();
  });
  sheet.walkAtRules(rule => { if (rule.nodes && !rule.nodes.length) rule.remove(); });
  return sheet.toString();
}

// CSS for Home, My and Find is already present. A gesture enables the full
// styles in their original cascade slots before an optional workflow opens.
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
  ['pointerover','pointerdown','touchstart','focusin','keydown','scroll','hashchange','beforeprint'].forEach(function(type){
    addEventListener(type, restore, {capture:true, once:true, passive:true});
  });
  if (location.search || location.hash) restore();
  try {
    if (localStorage.getItem('fortune_auth_token') || localStorage.getItem('fortune_auth_user') || /(?:^|;\\s*)fortune_auth_role=/.test(document.cookie)) restore();
  } catch (_) {}
  document.addEventListener('DOMContentLoaded', function(){ if (pending) pending.disconnect(); if (armed) install(); }, {once:true});
})();`;

export function optimizeLegacyHomePaint(html, dist, coverage) {
  if (!html.includes('id="cdHomeFunnel"') || html.includes('data-home-workflow-css')) return html;
  const profile = coverage || JSON.parse(readFileSync(usageFile, 'utf8'));
  const dom = new JSDOM(html, { includeNodeLocations: true, virtualConsole: new VirtualConsole() });
  const document = dom.window.document;
  const edits = [], rewritten = new Map();
  try {
    if (homeStructure(document) !== profile.structure) return html;
    for (const el of document.querySelectorAll('link[href]')) {
      if (el.closest('template,noscript')) continue;
      const href = el.getAttribute('href');
      const url = href.split('?')[0];
      const deferred = isDeferredSheet(el, url);
      if (!deferred && (el.rel !== 'stylesheet' || el.attributes.length !== 2)) continue;
      const recording = profile.styles[url];
      if (!recording || !existsSync(path.join(dist, url))) continue;
      const original = readFileSync(path.join(dist, url), 'utf8');
      if (digest(original) !== recording.sha256) continue;
      const initial = initialCss(original, recording.ranges);
      if (initial.length > original.length * .85) continue;
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
        const file = path.join(dist, asset);
        mkdirSync(path.dirname(file), {recursive:true});
        writeFileSync(file, initial);
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
