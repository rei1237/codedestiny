// Public reading excerpts are generated from the same authored articles as /insights.
import { register } from 'node:module';
import { readFile, writeFile, mkdir, readdir, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
register(pathToFileURL(resolve('scripts/app-module-loader.mjs')));
const { INSIGHT_SEED_ARTICLES } = await import(pathToFileURL(resolve('app/insights/seed-articles.js')).href);
const articles = INSIGHT_SEED_ARTICLES.filter(a => a.category === '숙요점' && a.slug && a.contentHtml);
const files = new Map();
const index = articles.map(a => {
  const body = JSON.stringify({ title: a.title, contentHtml: a.contentHtml });
  const hash = createHash('sha256').update(body).digest('hex').slice(0, 12);
  const filename = `${a.slug}-${hash}.json`;
  files.set(filename, body + '\n');
  return { slug: a.slug, title: a.title, description: a.description || a.excerpt || '', href: `/insights/${a.slug}/`, body: filename };
});
if (!index.length || new Set(index.map(a => a.slug)).size !== index.length) throw new Error('Invalid Sukuyo article catalogue');
files.set('index.json', JSON.stringify(index, null, 2) + '\n');
const dir = resolve('public/data/sukuyo-reading');
if (!process.argv.includes('--check')) await mkdir(dir, { recursive: true });
if (!process.argv.includes('--check')) {
  for (const name of await readdir(dir)) {
    if (/^[a-z0-9-]+-[a-f0-9]{12}\.json$/.test(name) && !files.has(name)) await unlink(resolve(dir, name));
  }
}
for (const [name, content] of files) {
  const file = resolve(dir, name);
  if (process.argv.includes('--check')) {
    if (await readFile(file, 'utf8').catch(() => '') !== content) throw new Error(`Sukuyo article mirror is stale: ${name}`);
  } else await writeFile(file, content);
}
console.log(`[sukuyo-reading] ${index.length} authored articles ${process.argv.includes('--check') ? 'verified' : 'generated'}`);
