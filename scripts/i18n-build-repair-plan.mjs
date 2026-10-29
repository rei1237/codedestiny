#!/usr/bin/env node
/** Read-only translation inventory. Key parity does not imply translated content. */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { RUNTIME_LOCALES } from '../lib/i18n/locale-normalize.js';
import { NOVEL_LOCALES } from '../lib/stories/vn/locales.mjs';

const root = process.cwd();
const outputArg = process.argv.find(arg => arg.startsWith('--output='));
if (!outputArg) throw new Error('Specify --output=<review JSON path>. No dictionaries are changed.');
const read = file => JSON.parse(readFileSync(resolve(root, file), 'utf8'));
const flatten = (value, prefix = '', result = {}) => {
  for (const [key, child] of Object.entries(value || {})) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof child === 'string') result[path] = child;
    else if (child && typeof child === 'object') flatten(child, path, result);
  }
  return result;
};
const hash = value => createHash('sha256').update(value).digest('hex');
const jobs = new Map();
const excluded = [];
const add = (locale, source, kind, location) => {
  const id = hash(JSON.stringify([locale, kind, source]));
  if (!jobs.has(id)) jobs.set(id, { id, locale, kind, source, locations: [] });
  jobs.get(id).locations.push(location);
};
const locales = RUNTIME_LOCALES.filter(locale => locale !== 'ko');
for (const locale of locales) {
  const fileLocale = locale.toLowerCase();
  const files = [{ en: 'public/i18n/en.json', target: `public/i18n/${fileLocale}.json`, ko: 'public/i18n/ko.json' }];
  for (const name of readdirSync(resolve(root, 'public/i18n/en'))) {
    if (name.endsWith('.json')) files.push({ en: `public/i18n/en/${name}`, target: `public/i18n/${fileLocale}/${name}`, ko: `public/i18n/ko/${name}` });
  }
  for (const file of files) {
    const en = flatten(read(file.en));
    const target = existsSync(resolve(root, file.target)) ? flatten(read(file.target)) : {};
    const ko = existsSync(resolve(root, file.ko)) ? flatten(read(file.ko)) : {};
    for (const [key, english] of Object.entries(en)) {
      // Legal identities and the account-deletion confirmation token must stay exact.
      if (key.startsWith('business.') || key.startsWith('withdrawModal.')) continue;
      const current = target[key];
      const missing = typeof current !== 'string' || !current.trim();
      const korean = /[가-힣]/.test(String(current || '').replace(/꿀꿀\s?운세|코드데스티니/g, ''));
      const mirrored = locale !== 'en' && current === english && /[A-Za-z]{3}/.test(english);
      if (!missing && !korean && !mirrored) continue;
      if (!missing && !korean && (english.length <= 20 || /^(https?:|mailto:|[\w.+-]+@)/.test(english))) {
        // Short shared words, acronyms and names need editorial review, not blind rewriting.
        excluded.push({ locale, file: file.target, key, value: english, reason: 'short or technical shared text' });
        continue;
      }
      const source = ko[key] && /[가-힣]/.test(ko[key]) ? ko[key] : english;
      add(locale, source, 'interface', { file: file.target, key, previous: current ?? null, reason: missing ? 'missing' : korean ? 'Korean text' : 'English mirror' });
    }
  }
}

const novelFile = 'content/novel/episodes.source.json';
const novelRaw = readFileSync(resolve(root, novelFile), 'utf8');
const novel = JSON.parse(novelRaw);
const sourceHash = hash(novelRaw);
// Include names, choices and skill labels as well as prose: the former draft tool omitted them.
for (const locale of NOVEL_LOCALES.filter(locale => locale !== 'ko')) {
  novel.episodes.forEach((episode, index) => {
    const episodeId = episode.no === 'PROLOGUE' ? 'prologue' : episode.no.toLowerCase().replace('.', '-');
    const texts = flatten(episode);
    for (const [key, source] of Object.entries(texts)) {
      if (!/^(?:tag|title|ending\.label|beats\.\d+\.(?:t|nm|skill\.name|choice\.options\.\d+\.label))$/.test(key)) continue;
      if (!/[가-힣]/.test(source)) continue;
      add(locale, source, 'novel', { sourceFile: novelFile, sourceHash, episodeId, episodeIndex: index, key });
    }
  });
}
const entries = [...jobs.values()];
const summary = locales.map(locale => {
  const selected = entries.filter(job => job.locale === locale);
  return { locale, jobs: selected.length, sourceCharacters: selected.reduce((sum, job) => sum + job.source.length, 0), interfaceJobs: selected.filter(job => job.kind === 'interface').length, novelJobs: selected.filter(job => job.kind === 'novel').length };
});
const output = resolve(outputArg.slice('--output='.length));
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify({ generatedAt: new Date().toISOString(), status: 'requires translation and editorial review', sourceHash, novelEpisodes: novel.episodes.length, note: 'Candidate inventory, not proof of completeness. Review short shared words and hardcoded UI separately. No network calls or source changes.', summary, excluded, jobs: entries }, null, 2) + '\n');
console.log(JSON.stringify({ output, summary, excludedForReview: excluded.length, networkCalls: 0 }, null, 2));
