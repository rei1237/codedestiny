import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SEASON_ONE } from '../../lib/yeongnyangi/season-1.mjs';
import { completeness, formatKst, latestEpisode, nextRelease, publishedEpisodes, serialNow } from '../../lib/yeongnyangi/serial.mjs';

// 2026-11-13 1차 배포: 옛 2~6화를 내려 연재표가 비어 있다. 게이트 규칙은 고정 연재표(FIXTURE)로 검증한다.
const EP2 = '2026-11-21T21:00:00+09:00';
const FIXTURE = [
  { no: 2, slug: 'ep2', title: 't2', status: 'ready', publishAt: EP2, logline: '', nextQuestion: '' },
  { no: 3, slug: 'ep3', title: 't3', status: 'ready', publishAt: '2026-11-28T21:00:00+09:00', logline: '', nextQuestion: '' },
  { no: 4, slug: 'ep4', title: 't4', status: 'draft', publishAt: '2026-12-05T21:00:00+09:00', logline: '', nextQuestion: '' },
];
const fixtureCuts = slug => ({ cuts: Array.from({ length: 8 }, (_, i) => ({ src: `/assets/yeongnyangi/season-1/${slug}/${i + 1}`, widths: [720], fallback: 720, w: 720, h: 900, alt: 'alt', cover: i === 0 })) });
const CUTS = Object.fromEntries(FIXTURE.map(episode => [episode.slug, fixtureCuts(episode.slug)]));
const allFiles = { fileExists: () => true, episodes: FIXTURE, cuts: CUTS };
const at = (iso, minutes = 0) => new Date(Date.parse(iso) + minutes * 60000);
const slugs = (now, options = allFiles) => publishedEpisodes(now, options).map(episode => episode.slug);

test('season 1 opens with the prologue and has no published episode after the 1st deploy (old ep2~ep6 taken down)', () => {
  assert.equal(SEASON_ONE.prologue.href, '/yeongnyangi/season-1/prologue/');
  assert.deepEqual(SEASON_ONE.episodes, []);
  const now = new Date('2026-11-14T21:10:00+09:00');
  assert.deepEqual(publishedEpisodes(now), []);
  assert.equal(latestEpisode(now), null);
  assert.equal(nextRelease(now), null);
  for (const episode of SEASON_ONE.episodes) {
    const kst = new Date(Date.parse(episode.publishAt) + 9 * 3600000);
    assert.equal(kst.getUTCDay(), 6, episode.slug);
    assert.equal(kst.getUTCHours(), 21, episode.slug);
  }
});

test('an episode opens exactly at its publish time, not one minute before', () => {
  assert.deepEqual(slugs(at(EP2, -1)), []);
  assert.deepEqual(slugs(at(EP2, 0)), ['ep2']);
  assert.deepEqual(slugs(at(EP2, 1)), ['ep2']);
  assert.equal(latestEpisode(at(EP2, -1), allFiles), null);
  assert.equal(latestEpisode(at(EP2, 1), allFiles).slug, 'ep2');
});

test('draft episodes stay hidden after their date and the next release reveals no title', () => {
  const late = new Date('2027-01-01T00:00:00+09:00');
  assert.deepEqual(slugs(late), ['ep2', 'ep3']);
  assert.deepEqual(nextRelease(late, allFiles), { no: 4, publishAt: null });
  assert.deepEqual(nextRelease(at(EP2, -1), allFiles), { no: 2, publishAt: EP2 });
});

test('an incomplete ready episode is held instead of published on schedule', () => {
  const missing = { ...allFiles, fileExists: file => !file.includes('ep2') };
  assert.deepEqual(slugs(at(EP2, 1), missing), []);
  assert.ok(completeness(FIXTURE[0], missing).some(problem => problem.startsWith('missing')));
  const oneCut = { ...allFiles, cuts: { ...CUTS, ep2: { cuts: [] } } };
  assert.deepEqual(slugs(at(EP2, 1), oneCut), []);
});

test('re-running at the same instant gives the same result', () => {
  const now = serialNow({ SERIAL_NOW: '2026-11-14T21:00:00+09:00' });
  assert.deepEqual(publishedEpisodes(now, allFiles), publishedEpisodes(now, allFiles));
  assert.throws(() => serialNow({ SERIAL_NOW: 'not-a-date' }));
});

test('sitemap lists the season index and the prologue but no individual episode', () => {
  for (const file of ['sitemap.xml', 'public/sitemap.xml']) {
    const xml = readFileSync(file, 'utf8');
    assert.ok(xml.includes('/yeongnyangi/season-1/</loc>'), file);
    assert.ok(xml.includes('/yeongnyangi/season-1/prologue/</loc>'), file);
    assert.ok(!/\/yeongnyangi\/season-1\/ep\d/.test(xml), file);
  }
});

test('episode times are shown in KST', () => {
  assert.equal(formatKst('2026-11-14T21:00:00+09:00'), '11월 14일(토) 21:00');
  assert.equal(formatKst('2026-11-14T12:00:00Z'), '11월 14일(토) 21:00');
});

test('the episode route still emits one static path when no episode is published (output:export rejects an empty list)', () => {
  const source = readFileSync('app/yeongnyangi/season-1/[episode]/page.tsx', 'utf8');
  assert.ok(source.includes(': [{ episode: NO_EPISODE_PLACEHOLDER }]'));
  assert.match(source, /if \(index < 0\) notFound\(\);/);
});
