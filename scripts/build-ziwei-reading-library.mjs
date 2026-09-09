// Public reading excerpts are generated from the same authored articles as /insights.
import { register } from 'node:module';
import { readFile, writeFile, mkdir, readdir, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';

register(pathToFileURL(resolve('scripts/app-module-loader.mjs')));
const { INSIGHT_SEED_ARTICLES } = await import(pathToFileURL(resolve('app/insights/seed-articles.js')).href);
const articles = INSIGHT_SEED_ARTICLES.filter((article) => article.category === '자미두수' && article.slug && article.contentHtml);
const files = new Map();
const index = articles.map((article) => {
  const body = JSON.stringify({ title: article.title, contentHtml: article.contentHtml });
  const hash = createHash('sha256').update(body).digest('hex').slice(0, 12);
  const filename = `${article.slug}-${hash}.json`;
  files.set(filename, body + '\n');
  return {
    slug: article.slug,
    title: article.title,
    description: article.description || article.excerpt || '',
    href: `/insights/${article.slug}/`,
    body: filename,
  };
});

if (!index.length || new Set(index.map((article) => article.slug)).size !== index.length) {
  throw new Error('Invalid Ziwei article catalogue');
}

files.set('index.json', JSON.stringify(index, null, 2) + '\n');
const directory = resolve('public/data/ziwei-reading');
if (!process.argv.includes('--check')) await mkdir(directory, { recursive: true });
if (!process.argv.includes('--check')) {
  for (const name of await readdir(directory)) {
    if (/^[a-z0-9-]+-[a-f0-9]{12}\.json$/.test(name) && !files.has(name)) {
      await unlink(resolve(directory, name));
    }
  }
}

for (const [name, content] of files) {
  const file = resolve(directory, name);
  if (process.argv.includes('--check')) {
    if (await readFile(file, 'utf8').catch(() => '') !== content) {
      throw new Error(`Ziwei article mirror is stale: ${name}`);
    }
  } else {
    await writeFile(file, content);
  }
}

console.log(`[ziwei-reading] ${index.length} authored articles ${process.argv.includes('--check') ? 'verified' : 'generated'}`);
