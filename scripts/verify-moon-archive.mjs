import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildSync } from 'esbuild';
import Module from 'node:module';
import { loadTsModule } from './lib/load-ts-module.mjs';
import { CELEBRITY_EDITORIAL } from '../lib/famous-saju/celebrity-editorial.js';
import { getPublishedProfiles } from '../lib/famous-saju/profile-publication.js';
const { ILJU, STEMS }=loadTsModule('lib/famous-saju/cycle.ts');
const { getFamousArchive }=loadTsModule('lib/famous-saju/archive.ts');
const { celebritySajuSeeds }=loadTsModule('lib/famous-saju/celebrity-data.ts');
const { calculateFamousSaju }=loadTsModule('lib/famous-saju/celebrity-saju-service.ts');
const { publicProfiles }=loadTsModule('lib/famous-saju/public-profiles.ts');
const { matchesFamousSearch }=loadTsModule('lib/famous-saju/archive-search.ts');
assert.equal(ILJU.length,60);assert.equal(new Set(ILJU.map(x=>x.name)).size,60);
for(const stem of STEMS)assert.equal(ILJU.filter(x=>x.stem===stem).length,6);
assert.deepEqual(ILJU.filter(x=>x.stem==='병').map(x=>x.name).sort(),['병자','병인','병진','병오','병신','병술'].sort());
const people=getFamousArchive();assert.equal(new Set(people.map(x=>x.slug)).size,people.length);
assert.equal(new Set(publicProfiles.map(p=>p.name)).size,publicProfiles.length);
for(const key of ['intro','question','career','reading']) assert.equal(new Set(publicProfiles.map(p=>p[key])).size,publicProfiles.length,`Unique profile ${key}`);
for(const profile of publicProfiles){
 const person=people.find(p=>p.slug===profile.slug);
 assert.ok(person,profile.slug);
 assert.equal(person.intro,profile.intro);
 assert.equal(person.reviewed,false);
 assert.equal(profile.reviewedAt,null);
 assert.equal(profile.birthTime,null);
 assert.equal(new Date(profile.birthDate+'T00:00:00Z').toISOString().slice(0,10),profile.birthDate);
 assert.ok(person.sourceRecord.birthSources.length>0,`${profile.slug}: birth source`);
 assert.ok(person.sourceRecord.activitySources.length>0,`${profile.slug}: career source`);
 assert.ok(profile.sources.every(s=>new URL(s.url).protocol==='https:'));
 assert.ok(profile.career.length>60 && profile.reading.length>60);
 for(const alias of [profile.name,profile.nameEn,...profile.aliases]) assert.ok(matchesFamousSearch(person,alias+' 사주'),`${profile.slug}: ${alias}`);
}
for(const [query,slug] of [['박위 사주','park-wi'],['WERACLE','park-wi'],['이말년','chimchakman'],['곽준빈','kwaktube'],['이상혁','faker'],['입짧은 햇님','haetnim']])assert.ok(people.filter(p=>matchesFamousSearch(p,query)).some(p=>p.slug===slug),query);
const rescene=people.filter(p=>p.aliases.some(alias=>alias.toLowerCase()==='rescene'));
assert.deepEqual(rescene.map(p=>p.slug).sort(),['rescene-liv','rescene-mei','rescene-minami','rescene-wonyi','rescene-zena']);
for(const slug of ['grace-hopper','alan-turing','katherine-johnson']){
 const person=people.find(p=>p.slug===slug);
 assert.ok(person?.fields.includes('과학자·발명가'),slug);
 assert.equal(person.birthTime,null);
 assert.ok(person.sourceRecord.birthSources.length>0,`${slug}: birth source`);
 assert.equal(person.reviewed,false,`${slug}: do not invent expert review`);
}
for(const person of people){
 assert.ok(fs.existsSync('public'+person.cover));
 const source=celebritySajuSeeds.find(x=>x.slug===person.slug);
 assert.equal(person.dayPillar,calculateFamousSaju(source).saju?.pillars.day.ganji || null,person.slug);
 assert.equal(source.birthTime,null,`${person.slug}: unsourced time must not become a real hour pillar`);
 assert.equal(person.classification,'needs_review');
}
for(const cycle of ILJU)assert.ok(fs.existsSync(`public/images/saju/ilju/${cycle.slug}.svg`));
const report={people:people.length,published:celebritySajuSeeds.filter(x=>x.published).length,editorials:Object.keys(CELEBRITY_EDITORIAL).length,reviewed:Object.values(CELEBRITY_EDITORIAL).filter(x=>x.reviewedAt).length,editorialDrafts:Object.values(CELEBRITY_EDITORIAL).filter(x=>!x.reviewedAt).length,profileArticles:getPublishedProfiles().length,withoutUniqueEditorial:people.filter(x=>!CELEBRITY_EDITORIAL[x.slug] && !publicProfiles.some(p=>p.slug===x.slug)).length,duplicateSlugs:people.length-new Set(people.map(x=>x.slug)).size,calculatedCandidates:people.filter(x=>x.dayPillar).length,classificationNeedsReview:people.filter(x=>x.classification==='needs_review').length,sourceLinked:people.filter(x=>x.dateSourceStatus==='source_linked').length,cycle:ILJU.length};
fs.writeFileSync('docs/design/moon-library/data-audit.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
fs.writeFileSync('docs/design/moon-library/profile-expansion-audit.json',JSON.stringify({total:people.length,addedProfiles:publicProfiles.length,publicationApprovedProfiles:getPublishedProfiles().length,draftProfiles:publicProfiles.filter(p=>p.reviewStatus==='draft').length,humanReviewedProfiles:publicProfiles.filter(p=>p.reviewedAt).length,duplicateSlugs:report.duplicateSlugs,fields:Object.fromEntries([...new Set(publicProfiles.flatMap(p=>p.fields))].map(field=>[field,publicProfiles.filter(p=>p.fields.includes(field)).length])),slugs:publicProfiles.map(p=>p.slug)},null,2)+'\n');

const bundle=buildSync({entryPoints:['app/insights/seed-articles.js'],bundle:true,platform:'node',format:'cjs',write:false}).outputFiles[0].text;
const articleModule=new Module(process.cwd()+'/audit.cjs');articleModule._compile(bundle,'audit.cjs');const articles=articleModule.exports.INSIGHT_SEED_ARTICLES;
assert.equal(articles.length,new Set(articles.map(x=>x.slug)).size);
for(const slug of ['rescene-members-saju-reading-guide','tarot-question-journal-before-redraw','same-day-pillar-different-season-reading']){
 const article=articles.find(a=>a.slug===slug);
 assert.equal(article?.contentSource,'authored',slug);
 assert.ok(article.displayDescription.length>30 && article.displayDescription.length<200,`${slug}: specific short summary`);
}
fs.writeFileSync('docs/design/moon-library/insight-audit.json',JSON.stringify({total:articles.length,published:articles.filter(x=>x.isPublished!==false).length,drafts:articles.filter(x=>x.isPublished===false).length,duplicates:articles.length-new Set(articles.map(x=>x.slug)).size,categories:[...new Set(articles.map(x=>x.category))]},null,2)+'\n');
