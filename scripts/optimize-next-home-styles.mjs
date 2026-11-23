import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import postcss from 'postcss';
import { JSDOM, VirtualConsole } from 'jsdom';

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

export function initialStyles(css, classes, codepoints) {
  const ast = postcss.parse(css);
  ast.walkRules(rule => {
    if (rule.parent.type === 'atrule' && rule.parent.name.endsWith('keyframes')) return;
    if (!needsInitialRule(rule.selector, classes)) rule.remove();
  });
  ast.walkAtRules('font-face', face => {
    const range = face.nodes.find(node => node.prop === 'unicode-range');
    if (range && !coversText(range.value, codepoints)) face.remove();
  });
  ast.walkAtRules(rule => { if (rule.nodes?.length === 0) rule.remove(); });
  return ast.toString();
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
    const text = [...doc.body.querySelectorAll('*')].filter(el => !el.closest('script, style, template')).flatMap(el => [
      ...[...el.childNodes].filter(node => node.nodeType === 3).map(node => node.textContent),
      el.getAttribute('placeholder') || '', el.getAttribute('aria-label') || '', el.getAttribute('alt') || '',
    ]).join('');
    const codepoints = [...new Set(Array.from(text, ch => ch.codePointAt(0)))];
    dom.window.close();
    let before = 0, after = 0;
    const output = html.replace(/<link\b[^>]*\brel="stylesheet"[^>]*\bhref="(\/_next\/static\/css\/[\da-f]+\.css)"[^>]*>/g, (original, url) => {
      const file = path.join(directory, url);
      const source = readFileSync(file, 'utf8');
      const originalBytes = Buffer.byteLength(source);
      before += originalBytes;
      if (originalBytes < 15000) { after += originalBytes; return original; }
      const reduced = initialStyles(source, classes, codepoints);
      const bytes = Buffer.byteLength(reduced);
      if (originalBytes - bytes < 12000) { after += originalBytes; return original; }
      after += bytes;
      let replacement = '';
      if (bytes) {
        const hash = createHash('sha256').update(reduced).digest('hex').slice(0, 16);
        const name = 'home-' + hash + '.css';
        writeFileSync(path.join(path.dirname(file), name), reduced);
        replacement = '<link rel="stylesheet" data-cd-home-critical href="/_next/static/css/' + name + '"/>';
      }
      const deferred = original.replace('rel="stylesheet"', 'rel="stylesheet" media="print" fetchpriority="low" onload="this.media=\'all\'"');
      return replacement + deferred + '<noscript>' + original + '</noscript>';
    });
    writeFileSync(target, output);
    console.log('[home-styles]', route, 'blocking CSS', before, '->', after, 'bytes');
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  optimizeNextHomeStyles(path.resolve(process.argv[2] || 'dist'));
}
