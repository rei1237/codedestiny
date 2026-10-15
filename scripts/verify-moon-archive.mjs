import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildSync } from 'esbuild';
import Module from 'node:module';
import { loadTsModule } from './lib/load-ts-module.mjs';
import { CELEBRITY_EDITORIAL } from '../lib/famous-saju/celebrity-editorial.js';
const { ILJU, STEMS }=loadTsModule('lib/famous-saju/cycle.ts');
const { getFamousArchive }=loadTsModule('lib/famous-saju/archive.ts');
const { celebritySajuSeeds }=loadTsModule('lib/famous-saju/celebrity-data.ts');
const { calculateFamousSaju }=loadTsModule('lib/famous-saju/celebrity-saju-service.ts');
assert.equal(ILJU.length,60);assert.equal(new Set(ILJU.map(x=>x.name)).size,60);
for(const stem of STEMS)assert.equal(ILJU.filter(x=>x.stem===stem).length,6);
assert.deepEqual(ILJU.filter(x=>x.stem==='병').map(x=>x.name).sort(),['병자','병인','병진','병오','병신','병술'].sort());
const people=getFamousArchive();assert.equal(new Set(people.map(x=>x.slug)).size,people.length);
for(const person of people){
 assert.ok(fs.existsSync('public'+person.cover));
 const source=celebritySajuSeeds.find(x=>x.slug===person.slug);
 assert.equal(person.dayPillar,calculateFamousSaju(source).saju?.pillars.day.ganji || null,person.slug);
 assert.equal(source.birthTime,null,`${person.slug}: unsourced time must not become a real hour pillar`);
 assert.equal(person.classification,'needs_review');
}
for(const cycle of ILJU)assert.ok(fs.existsSync(`public/images/saju/ilju/${cycle.slug}.svg`));
const report={people:people.length,published:celebritySajuSeeds.filter(x=>x.published).length,editorials:Object.keys(CELEBRITY_EDITORIAL).length,reviewed:Object.values(CELEBRITY_EDITORIAL).filter(x=>x.reviewedAt).length,editorialDrafts:Object.values(CELEBRITY_EDITORIAL).filter(x=>!x.reviewedAt).length,withoutUniqueEditorial:people.filter(x=>!CELEBRITY_EDITORIAL[x.slug]).length,duplicateSlugs:people.length-new Set(people.map(x=>x.slug)).size,calculatedCandidates:people.filter(x=>x.dayPillar).length,classificationNeedsReview:people.filter(x=>x.classification==='needs_review').length,sourceLinked:people.filter(x=>x.dateSourceStatus==='source_linked').length,cycle:ILJU.length};
fs.writeFileSync('docs/design/moon-library/data-audit.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));

const bundle=buildSync({entryPoints:['app/insights/seed-articles.js'],bundle:true,platform:'node',format:'cjs',write:false}).outputFiles[0].text;
const module=new Module(process.cwd()+'/audit.cjs');module._compile(bundle,'audit.cjs');const articles=module.exports.INSIGHT_SEED_ARTICLES;
assert.equal(articles.length,new Set(articles.map(x=>x.slug)).size);
fs.writeFileSync('docs/design/moon-library/insight-audit.json',JSON.stringify({total:articles.length,published:articles.filter(x=>x.isPublished!==false).length,drafts:articles.filter(x=>x.isPublished===false).length,duplicates:articles.length-new Set(articles.map(x=>x.slug)).size,categories:[...new Set(articles.map(x=>x.category))]},null,2)+'\n');
