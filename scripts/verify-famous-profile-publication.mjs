import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import profiles from '../lib/famous-saju/public-profile-records.json' with { type:'json' };
import { getPublishedProfiles, isProfilePublished } from '../lib/famous-saju/profile-publication.js';
import { getIndexedCelebritySlugs, CELEBRITY_EDITORIAL } from '../lib/famous-saju/celebrity-editorial.js';
import { loadTsModule } from './lib/load-ts-module.mjs';
const { getFamousArchive } = loadTsModule('lib/famous-saju/archive.ts');
const { canLoadAdsense } = await import('../app/components/adsense-route-policy.js');
const people = getFamousArchive();
const indexed = getIndexedCelebritySlugs();
assert.equal(indexed.length, new Set(indexed).size);
assert.equal(profiles.length, new Set(profiles.map(p=>p.slug)).size);
assert.equal(isProfilePublished({ ...profiles[0], publication:null }), false, 'unapproved stays noindex');
assert.equal(isProfilePublished({ ...profiles[0], sources:[] }), false, 'missing evidence stays noindex');
const results = [];
for (const profile of getPublishedProfiles()) {
  const person = people.find(p=>p.slug===profile.slug);
  assert.ok(person?.dayPillar, `${profile.slug}: real engine calculation required`);
  assert.equal(person.birthTime, null);
  assert.equal(person.classification, 'needs_review', 'approval must not certify birth boundaries');
  assert.equal(profile.reviewedAt, null, 'publication permission does not claim a manual manuscript review');
  assert.equal(canLoadAdsense(`/insights/famous-saju/${profile.slug}`), false);
  assert.ok(indexed.includes(profile.slug));
  assert.ok((profile.career+profile.reading).length>=300, `${profile.slug}: substantive individual commentary`);
  assert.ok(profile.sources.every(s=>new URL(s.url).protocol==='https:'));
  for (const key of ['approvedAt','publishedAt','updatedAt']) {
    const value=profile.publication[key];
    assert.equal(new Date(value+'T00:00:00Z').toISOString().slice(0,10), value);
    assert.ok(value<=new Date().toISOString().slice(0,10));
  }
  if (profile.comparisonSlug) {
    const other=people.find(p=>p.slug===profile.comparisonSlug);
    assert.ok(other && other.slug!==person.slug);
    assert.equal(other.dayPillar,person.dayPillar,`${profile.slug}: comparison day must match engine`);
  }
  results.push({slug:profile.slug,dayCandidate:person.dayPillar,monthCandidate:person.month,comparisonSlug:profile.comparisonSlug,
    uniqueCommentaryCharacters:(profile.career+profile.reading).length,
    manuscriptSha256:createHash('sha256').update(JSON.stringify({question:profile.question,career:profile.career,reading:profile.reading,sources:profile.sources})).digest('hex')});
}
const report={totalPeople:people.length,profileArticles:results.length,indexableDetails:indexed.length,
  legacyReviewedArticles:Object.values(CELEBRITY_EDITORIAL).filter(p=>p.reviewedAt).length,
  profileDrafts:profiles.length-results.length,duplicateSlugs:0,confirmedBirthTimes:0,
  sameDayCandidateComparisons:results.filter(p=>p.comparisonSlug).length,
  approval:{name:'박병하(네오)',date:'2026-10-15',scope:'사용자 직접 공개 승인. AI 작성·편집 점검과 출생 기록의 확정은 구분한다.'},
  results};
fs.writeFileSync('docs/design/moon-library/profile-publication-audit.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,results:undefined}));
