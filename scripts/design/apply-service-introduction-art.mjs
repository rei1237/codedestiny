import fs from 'node:fs';
import ts from 'typescript';
import { parse } from 'parse5';

// Apply only image fields on identified feature entries, preserving source formatting.
// No routing/action/price fields are written.
const ledger = JSON.parse(fs.readFileSync('docs/design/service-introduction-art.json', 'utf8'));
const art = JSON.parse(fs.readFileSync('lib/marketing/service-introduction-art.json', 'utf8'));
const productCatalogue = JSON.parse(fs.readFileSync('content/product-details/catalog.json', 'utf8'));
const koreanDictionary = JSON.parse(fs.readFileSync('public/i18n/ko.json','utf8'));
const aliases = new Map();
const normalize = value => String(value || '').replace(/\/$/, '');
for (const row of ledger.assets) {
  if (!art[row.slug]) continue;
  for (const alias of [row.slug, ...(row.aliases || [])]) {
    const key = normalize(alias);
    if (!aliases.has(key)) aliases.set(key, row.slug);
  }
}
const editFile = (file, transform) => {
  const before = fs.readFileSync(file, 'utf8');
  const after = transform(before);
  if (before !== after) fs.writeFileSync(file, after);
};
const applyEdits = (source, edits) => {
  const unique = [...new Map(edits.map(edit => [edit.start, edit])).values()].sort((a,b) => b.start - a.start);
  let boundary = source.length;
  for (const edit of unique) {
    if (edit.end > boundary) throw new Error('Overlapping source edits');
    source = source.slice(0, edit.start) + edit.text + source.slice(edit.end);
    boundary = edit.start;
  }
  return source;
};
editFile('js/core/service-registry.js', source => {
  const parsed = ts.createSourceFile('registry.js', source, ts.ScriptTarget.Latest, true);
  const edits = [];
  function walk(node) {
    if (ts.isObjectLiteralExpression(node)) {
      const id = node.properties.find(p => p.name?.getText(parsed) === 'id')?.initializer?.text;
      if (art[id]) {
        for (const [key, value] of [['image', art[id].cardImage], ['imageAlt', art[id].alt]]) {
          const prop = node.properties.find(p => p.name?.getText(parsed) === key);
          if (prop) edits.push({start: prop.initializer.getStart(parsed), end: prop.initializer.end, text: JSON.stringify(value)});
        }
        const missing = ['image', 'imageAlt'].filter(key => !node.properties.some(p => p.name?.getText(parsed) === key));
        if (missing.length) edits.push({start: node.getStart(parsed) + 1, end: node.getStart(parsed) + 1, text: '\n    ' + missing.map(key => `${key}: ${JSON.stringify(key === 'image' ? art[id].cardImage : art[id].alt)},`).join('\n    ')});
      }
    }
    ts.forEachChild(node, walk);
  }
  walk(parsed);
  return applyEdits(source, edits);
});
for (const file of ['index.html', 'templates/home-funnel.html']) editFile(file, source => {
  const document = parse(source, {sourceCodeLocationInfo:true});
  const edits = [];
  const escape = value => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  function visit(node, inherited) {
    const attrs = Object.fromEntries((node.attrs || []).map(a => [a.name, a.value]));
    const slug = ['data-feature-key', 'data-cd-service-id', 'data-action', 'href'].map(key => aliases.get(normalize(attrs[key]))).find(Boolean) || inherited;
    const profileAvatar = /\/avatars\/|\/avatar(?:-\d+)?\.webp/.test(attrs.src || '');
    if (art[slug] && !profileAvatar) {
      const imageKeys = node.tagName === 'img' ? ['src', 'data-lazy-src', 'data-img-src', 'srcset', 'alt'] : node.tagName === 'source' ? ['srcset'] : ['data-img-src', 'data-img-alt'];
      for (const key of imageKeys) {
        const location = node.sourceCodeLocation?.attrs?.[key];
        if (!location) continue;
        const translationKey=(attrs['data-cd-trans-attr']||'').split(',').map(x=>x.trim().split(':')).find(x=>x[0]===key)?.[1];
        const translatedAlt=translationKey?.split('.').reduce((value,part)=>value?.[part],koreanDictionary);
        const value = key === 'alt' || key === 'data-img-alt' ? translatedAlt || art[slug].alt : key === 'srcset' ? `${art[slug].cardImage} 320w, ${art[slug].image.replace('.webp','-640.webp')} 640w` : art[slug].cardImage;
        edits.push({start:location.startOffset,end:location.endOffset,text:`${key}="${escape(value)}"`});
      }
    }
    for (const child of node.childNodes || []) visit(child, slug);
  }
  visit(document);
  // Legacy D entries are feature-specific image fields inside inline scripts.
  const regex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
  for (const match of source.matchAll(regex)) {
    if (!match[1].includes('var D=')) continue;
    const offset = match.index + match[0].indexOf('>') + 1;
    const parsed = ts.createSourceFile('inline.js', match[1], ts.ScriptTarget.Latest, true);
    function walk(node) {
      if (ts.isPropertyAssignment(node) && ts.isObjectLiteralExpression(node.initializer)) {
        const key = node.name.text || node.name.getText(parsed);
        const slug = aliases.get(normalize(key));
        if (art[slug]) for (const property of node.initializer.properties) {
          const name = property.name?.text || property.name?.getText(parsed);
          if (!['img', 'image', 'outlineImage'].includes(name) || !property.initializer || !ts.isStringLiteralLike(property.initializer)) continue;
          edits.push({start:offset + property.initializer.getStart(parsed),end:offset + property.initializer.end,text:JSON.stringify(art[slug].image)});
        }
      }
      ts.forEachChild(node, walk);
    }
    walk(parsed);
  }
  return applyEdits(source, edits);
});
editFile('lib/marketing/result-samples.json', source => {
  const rows = JSON.parse(source);
  for (const row of rows) {
    if (!art[row.slug]) continue;
    row.visual = art[row.slug].image;
    row.visualAlt = art[row.slug].alt;
  }
  return JSON.stringify(rows, null, 2) + '\n';
});
const productArt = new Map();
if (art['fortune-chat-yeoni']) productArt.set('chat-yeoni', art['fortune-chat-yeoni']);
for (const [slug, ids] of Object.entries(productCatalogue.introductions)) {
  if (art[slug]) for (const id of ids) productArt.set(id, art[slug]);
}
for (const id of Object.values(productCatalogue.products)) {
  if (!id.startsWith('yeongnyangi-')) continue;
  const domain = id.match(/^yeongnyangi-(saju|ziwei|sukuyo|vedic|astrology|tarot)-/)?.[1];
  const key = domain ? `yeongnyangi-${domain}` : id;
  if (art[key]) productArt.set(id, art[key]);
}
for(const [id,slug] of Object.entries({'tea-saju':'tea-saju','tea-saju-compat':'tea-saju-compat','tea-sukuyo':'tea-sukuyo','tea-tarot-three':'tea-tarot','tea-tarot-five':'tea-tarot'})) if(art[slug])productArt.set(id,art[slug]);
for (const [id, image] of productArt) {
  const file = `content/product-details/${id}/manifest.json`;
  if (!fs.existsSync(file)) throw new Error(`Missing authored product ${id}`);
  editFile(file, source => {
    const data = JSON.parse(source);
    const first = data.panels?.[0];
    if (!first) return source;
    first.src = image.image;
    first.alt = image.alt;
    first.width = 1536;
    first.height = 1024;
    first.variants = [320, 640, 960].map(width => ({src:image.image.replace('.webp', `-${width}.webp`), width}));
    // Text remains real selectable HTML when a text-bearing cover is replaced.
    first.textBelowImage = true;
    return JSON.stringify(data, null, 2) + '\n';
  });
}
console.log(`Applied image fields for ${Object.keys(art).length} generated features`);
