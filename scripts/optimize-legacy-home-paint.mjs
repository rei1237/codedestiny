import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { JSDOM, VirtualConsole } from 'jsdom';
import postcss from 'postcss';

export const usageFile = new URL('./data/legacy-home-style-usage.json', import.meta.url);
export const digest = value => createHash('sha256').update(value).digest('hex');

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
  ['pointerover','pointerdown','touchstart','focusin','keydown','hashchange','beforeprint'].forEach(function(type){
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
    for (const el of document.querySelectorAll('link[rel="stylesheet"][href]')) {
      if (el.attributes.length !== 2 || el.closest('template,noscript')) continue;
      const href = el.getAttribute('href');
      const url = href.split('?')[0];
      const recording = profile.styles[url];
      if (!recording || !existsSync(path.join(dist, url))) continue;
      const original = readFileSync(path.join(dist, url), 'utf8');
      if (digest(original) !== recording.sha256) continue;
      if (!url.startsWith('/css/shell/') && (/@import\b/i.test(original) || Array.from(original.matchAll(/url\(\s*(["']?)([^)"']+)\1\s*\)/gi))
        .some(match => !/^(?:\/|data:|https?:|#)/i.test(match[2])))) continue;
      const initial = initialCss(original, recording.ranges);
      if (initial.length > original.length * .85) continue;
      const asset = '/css/shell/first-' + digest(initial).slice(0, 16) + '.css';
      const file = path.join(dist, asset);
      mkdirSync(path.dirname(file), { recursive: true });
      writeFileSync(file, initial);
      rewritten.set(href, asset);
      const {startOffset, endOffset} = dom.nodeLocation(el);
      const tag = html.slice(startOffset, endOffset);
      edits.push([startOffset, endOffset, '<link rel="stylesheet" href="' + asset + '"><template data-home-workflow-css>' + tag + '</template><noscript>' + tag + '</noscript>']);
    }
    if (!edits.length) return html;
    for (const el of document.querySelectorAll('link[data-cd-home-preload]')) {
      const href = el.getAttribute('href');
      if (!rewritten.has(href)) continue;
      const {startOffset, endOffset} = dom.nodeLocation(el);
      edits.push([startOffset, endOffset, '<link data-cd-home-preload rel="preload" as="style" href="' + rewritten.get(href) + '">']);
    }
    const end = dom.nodeLocation(document.head).endTag.startOffset;
    edits.push([end, end, '<script>' + activate + '</script>']);
    let output = html;
    for (const [start, end, content] of edits.sort((a,b) => b[0] - a[0])) output = output.slice(0,start) + content + output.slice(end);
    return output;
  } finally { dom.window.close(); }
}
