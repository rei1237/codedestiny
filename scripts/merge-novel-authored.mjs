#!/usr/bin/env node
import { readFileSync,readdirSync,writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { assembleNovelAuthored } from './lib/novel-authored-merge.mjs';
import { NOVEL_LOCALES } from '../lib/stories/vn/locales.mjs';

const root=resolve(import.meta.dirname,'..');
const localeArg=process.argv.find(value=>value.startsWith('--locale='));
const locales=localeArg?[localeArg.slice(9)]:NOVEL_LOCALES.filter(value=>value!=='ko');
const directory=resolve(root,'content/novel/translations/authored');
const documents=readdirSync(directory).filter(file=>file.endsWith('.json')).map(file=>JSON.parse(readFileSync(resolve(directory,file),'utf8')));
const sourceRaw=readFileSync(resolve(root,'content/novel/episodes.source.json'),'utf8');
const uiCopy=JSON.parse(readFileSync(resolve(root,'content/novel/ui-copy.json'),'utf8'));
for(const locale of locales){
  const result=assembleNovelAuthored(sourceRaw,documents,locale,uiCopy);
  console.log(JSON.stringify({locale,translatedBeats:result.translatedBeats,totalBeats:result.totalBeats,missingFields:result.missing.length,missingSample:result.missing.slice(0,8),networkCalls:0}));
  if(result.missing.length){if(process.argv.includes('--write'))process.exitCode=1;continue;}
  if(process.argv.includes('--write'))writeFileSync(resolve(root,`content/novel/translations/${locale}.json`),JSON.stringify(result.translation,null,2)+'\n');
}
