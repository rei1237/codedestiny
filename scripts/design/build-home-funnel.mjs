import { readFileSync, writeFileSync } from 'node:fs';
import { parse } from 'parse5';

const original = readFileSync('index.html', 'utf8');
const doc = parse(original, { sourceCodeLocationInfo: true });
const attrs = (node) => Object.fromEntries((node.attrs || []).map((attr) => [attr.name, attr.value]));

function find(node, predicate) {
  if (predicate(node, attrs(node))) return node;
  for (const child of node.childNodes || []) {
    const result = find(child, predicate);
    if (result) return result;
  }
}

const byId = (id) => find(doc, (_node, values) => values.id === id);
const byClass = (className, extra = () => true) => find(doc, (node, values) =>
  String(values.class || '').split(/\s+/).includes(className) && extra(node, values));
const htmlOf = (node, label) => {
  const location = node?.sourceCodeLocation;
  if (!location) throw new Error(`Existing home section is required: ${label}`);
  return original.slice(location.startOffset, location.endOffset);
};

const nodes = {
  quick: byId('cdQuickServices'),
  today: byId('cdTodayHub'),
  concern: byId('cdConcernPick'),
  signature: byId('cdSignatureConsult'),
  pass: byClass('membership-recap-cta', (_node, values) => values['data-design-marker'] === 'moonlight-pass-banner-v20260626'),
  gateway: byId('fortuneGatewayEntry'),
  story: byClass('moon-story-entry'),
  music: byId('moonMusicEntry'),
  reviews: byId('cdReviews'),
  guide: byClass('cd-home-guide'),
  homeMore: byClass('cd-home-more'),
  finder: byId('cdFinder'),
};

const vars = Object.fromEntries(Object.entries(nodes).map(([key, node]) => [key, htmlOf(node, key)]));
const template = readFileSync('templates/home-funnel.html', 'utf8');
const homeHtml = template.replace(/\{\{(\w+)\}\}/g, (_token, key) => {
  if (!(key in vars)) throw new Error(`Unknown home funnel template token: ${key}`);
  return vars[key];
});

// Remove each source node before inserting the assembled home. Reverse offsets keep ranges stable.
let cleaned = original;
const removals = Object.entries(nodes).map(([key, node]) => ({ key, ...node.sourceCodeLocation }))
  .sort((a, b) => b.startOffset - a.startOffset);
for (const removal of removals) {
  cleaned = cleaned.slice(0, removal.startOffset)
    + `<!-- ${removal.key} moved intact into #cdHomeFunnel at build time. -->`
    + cleaned.slice(removal.endOffset);
}

const marker = /<!-- cd-home-funnel:start[\s\S]*?<!-- cd-home-funnel:end -->/;
let updated;
if (marker.test(cleaned)) {
  updated = cleaned.replace(marker, homeHtml.trimEnd());
} else {
  updated = cleaned.replace('    <header class="logo-area" role="banner">', homeHtml + '\n    <header class="logo-area" role="banner">');
}

if (process.argv.includes('--check')) {
  if (original !== updated) throw new Error('Home funnel needs regeneration');
  console.log('[home-funnel] current');
} else {
  writeFileSync('index.html', updated);
  console.log('[home-funnel] assembled from existing sections; no runtime DOM reflow');
}
