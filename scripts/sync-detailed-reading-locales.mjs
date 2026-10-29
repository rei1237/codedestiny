#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ENGLISH_READING_LOCALES, applyDetailedReadingEdition } from './lib/detailed-reading-locale-policy.mjs';

const directory = resolve(dirname(fileURLToPath(import.meta.url)), '../public/i18n');
const english = JSON.parse(readFileSync(resolve(directory, 'en.json'), 'utf8'));
const check = process.argv.includes('--check');
const drift = [];
for (const locale of ENGLISH_READING_LOCALES) {
  const path = resolve(directory, `${locale}.json`);
  const original = JSON.parse(readFileSync(path, 'utf8'));
  const next = applyDetailedReadingEdition(original, english, locale);
  if (JSON.stringify(original) === JSON.stringify(next)) continue;
  drift.push(locale);
  if (!check) writeFileSync(path, `${JSON.stringify(next, null, 2)}\n`);
}
if (check && drift.length) throw new Error(`Run node scripts/sync-detailed-reading-locales.mjs: ${drift.join(', ')}`);
console.log(`[detailed-reading-locales] ${check ? 'verified' : 'synchronized'} English reading edition for ${ENGLISH_READING_LOCALES.length} locales; other UI namespaces preserved.`);
