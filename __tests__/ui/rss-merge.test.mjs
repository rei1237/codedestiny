import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync('public/_worker.js', 'utf8');
function edge(fetchImpl = () => { throw Error('Unexpected network'); }) {
  return runInNewContext(source.replace('export default {', 'globalThis.worker = {') + '\nworker;', { URL, Request, Response, Headers, console, fetch: fetchImpl });
}

const HEAD = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Code Destiny Insights RSS</title>
    <link>https://code-destiny.com/insights/</link>
    <atom:link href="https://code-destiny.com/rss.xml" rel="self" type="application/rss+xml" />
`;
const TAIL = '  </channel>\n</rss>\n';
const DAY = 86400000;
const BASE = Date.UTC(2026, 0, 1);
const pub = (n) => new Date(BASE + n * DAY).toUTCString();
function item({ n, guid, link, pubDate = pub(n) }) {
  const parts = [`<title>item ${n}</title>`];
  if (link !== null) parts.push(`<link>${link ?? `https://code-destiny.com/insights/p${n}/`}</link>`);
  if (guid !== null) parts.push(`<guid isPermaLink="true">${guid ?? `https://code-destiny.com/insights/p${n}/`}</guid>`);
  if (pubDate !== null) parts.push(`<pubDate>${pubDate}</pubDate>`);
  return `    <item>\n      ${parts.join('\n      ')}\n    </item>\n`;
}
const feed = (items, head = HEAD) => head + items.join('') + TAIL;
const titles = (xml) => [...xml.matchAll(/<item>[\s\S]*?<title>([^<]*)<\/title>/g)].map((m) => m[1]);

async function merged(staticXml, dynamicXml, { dynamicOk = true, path = '/rss.xml' } = {}) {
  const env = { ASSETS: { fetch: async () => new Response(staticXml, { headers: { 'Content-Type': 'application/xml' } }) } };
  const worker = edge(async () => dynamicOk ? new Response(dynamicXml, { status: 200 }) : new Response('boom', { status: 500 }));
  const response = await worker.fetch(new Request('https://code-destiny.test' + path, { headers: { Accept: 'application/xml' } }), env);
  return { response, body: await response.text() };
}

test('merged feed drops duplicates by guid then link', async () => {
  const stat = feed([item({ n: 1 }), item({ n: 2, guid: 'shared-guid' })]);
  const dyn = feed([
    item({ n: 3, guid: 'shared-guid', link: 'https://code-destiny.com/insights/other/' }), // same guid
    item({ n: 4, guid: null, link: 'https://code-destiny.com/insights/p1/' }),              // no guid, link == static guid
    item({ n: 5 }),
    item({ n: 5, pubDate: pub(9) }),                                                         // duplicate inside dynamic
  ]);
  const { body } = await merged(stat, dyn);
  assert.deepEqual(titles(body).sort(), ['item 1', 'item 2', 'item 5']);
});

test('static copy wins over the dynamic duplicate', async () => {
  const stat = feed([item({ n: 1, guid: 'g1' })]);
  const dyn = feed([item({ n: 7, guid: 'g1' })]);
  const { body } = await merged(stat, dyn);
  assert.deepEqual(titles(body), ['item 1']);
});

test('merged feed sorts by pubDate, newest first, across static and dynamic items', async () => {
  const stat = feed([item({ n: 1 }), item({ n: 5 }), item({ n: 3 })]);
  const dyn = feed([item({ n: 6 }), item({ n: 2 }), item({ n: 4 })]);
  const { body } = await merged(stat, dyn);
  assert.deepEqual(titles(body), ['item 6', 'item 5', 'item 4', 'item 3', 'item 2', 'item 1']);
});

test('items with a missing or invalid pubDate sort last, in their original order', async () => {
  const stat = feed([item({ n: 10, pubDate: null }), item({ n: 1 }), item({ n: 11, pubDate: 'not a date' })]);
  const dyn = feed([item({ n: 12, pubDate: '' }), item({ n: 2 }), item({ n: 13, pubDate: null })]);
  const { body } = await merged(stat, dyn);
  assert.deepEqual(titles(body), ['item 2', 'item 1', 'item 10', 'item 11', 'item 12', 'item 13']);
});

test('merged feed keeps at most 60 items', async () => {
  const stat = feed(Array.from({ length: 50 }, (_, i) => item({ n: i })));
  const dyn = feed(Array.from({ length: 50 }, (_, i) => item({ n: 50 + i })));
  const { body } = await merged(stat, dyn);
  const got = titles(body);
  assert.equal(got.length, 60);
  assert.equal(got[0], 'item 99');
  assert.equal(got[59], 'item 40');
});

test('channel metadata before the items survives and the document stays well formed', async () => {
  const stat = feed([item({ n: 1 })]);
  const dyn = feed([item({ n: 2 })]);
  const { body } = await merged(stat, dyn);
  assert.ok(body.startsWith(HEAD), 'head is byte-identical');
  assert.ok(body.endsWith(TAIL), 'tail is byte-identical');
  assert.match(body, /<title>Code Destiny Insights RSS<\/title>/);
  assert.match(body, /<atom:link href="https:\/\/code-destiny\.com\/rss\.xml" rel="self"/);
  assert.equal(body.match(/<item>/g).length, body.match(/<\/item>/g).length);
  assert.equal(body.match(/<channel>/g).length, 1);
  assert.equal(body.match(/<\/channel>/g).length, 1);
  assert.equal(body.match(/<\/rss>/g).length, 1);
  // every item is a whole block: only whitespace between item blocks
  const inner = body.slice(HEAD.length, body.length - TAIL.length);
  assert.equal(inner.replace(/<item>[\s\S]*?<\/item>/g, '').trim(), '');
});

test('a static feed with no items still gets the dynamic items inside the channel', async () => {
  const { body } = await merged(HEAD + TAIL, feed([item({ n: 2 })]));
  assert.ok(body.startsWith(HEAD));
  assert.ok(body.endsWith(TAIL));
  assert.deepEqual(titles(body), ['item 2']);
});

test('items with neither guid nor link are dropped', async () => {
  const stat = feed([item({ n: 1 }), item({ n: 8, guid: null, link: null })]);
  const dyn = feed([item({ n: 2 }), item({ n: 9, guid: null, link: null })]);
  const { body } = await merged(stat, dyn);
  assert.deepEqual(titles(body), ['item 2', 'item 1']);
});

test('a static file without </channel> yields the dynamic feed as is', async () => {
  const dyn = feed([item({ n: 2 })]);
  const { body } = await merged('not xml', dyn);
  assert.equal(body, dyn);
});

test('a failing feed API still serves the static file', async () => {
  const stat = feed([item({ n: 1 })]);
  const { response, body } = await merged(stat, '', { dynamicOk: false });
  assert.equal(response.status, 200);
  assert.equal(body, stat);
  assert.notEqual(response.headers.get('X-Code-Destiny-Feed'), 'merged');
});

test('the insights feed path is merged the same way', async () => {
  const { response, body } = await merged(feed([item({ n: 1 })]), feed([item({ n: 2 })]), { path: '/insights/rss.xml' });
  assert.equal(response.headers.get('X-Code-Destiny-Feed'), 'merged');
  assert.deepEqual(titles(body), ['item 2', 'item 1']);
});
