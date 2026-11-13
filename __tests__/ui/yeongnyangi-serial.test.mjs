import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SEASON_ONE } from '../../lib/yeongnyangi/season-1.mjs';
import { PAGE_RANGE, completeness, formatKst, latestEpisode, nextRelease, pageFiles, publishedEpisodes, serialNow } from '../../lib/yeongnyangi/serial.mjs';

// 게이트 규칙은 고정 연재표(FIXTURE)로, 실제 연재표는 회차·일정·파일 완비로 따로 검증한다.
const EP2 = '2026-11-21T21:00:00+09:00';
const WEEK = 7 * 86400000;
const pages = count => Array.from({ length: count }, (_, i) => ({ n: i + 1, alt: `p${i + 1}` }));
const fixture = (no, status, publishAt, count = 16) => ({ no, slug: `ep${no}`, title: `t${no}`, status, publishAt, logline: '', format: 'pages', w: 1122, h: 1402, pages: pages(count) });
const FIXTURE = [fixture(2, 'ready', EP2), fixture(3, 'ready', '2026-11-28T21:00:00+09:00'), fixture(4, 'draft', '2026-12-05T21:00:00+09:00')];
const allFiles = { fileExists: () => true, episodes: FIXTURE };
const at = (iso, minutes = 0) => new Date(Date.parse(iso) + minutes * 60000);
const slugs = (now, options = allFiles) => publishedEpisodes(now, options).map(episode => episode.slug);
const real = iso => publishedEpisodes(new Date(iso)).map(episode => episode.slug);

test('season 1 runs episodes 2-7 as weekly page-format episodes after the always-open episode 1', () => {
  assert.equal(SEASON_ONE.prologue.href, '/yeongnyangi/season-1/prologue/');
  assert.deepEqual(SEASON_ONE.episodes.map(episode => episode.slug), ['ep2', 'ep3', 'ep4', 'ep5', 'ep6', 'ep7']);
  assert.deepEqual(SEASON_ONE.episodes.map(episode => episode.pages.length), [20, 19, 20, 20, 19, 17]);
  assert.equal(SEASON_ONE.episodes[0].publishAt, EP2);
  SEASON_ONE.episodes.forEach((episode, index) => {
    assert.equal(episode.format, 'pages', episode.slug);
    assert.equal(episode.w, 1122, episode.slug);
    assert.equal(episode.h, 1402, episode.slug);
    assert.equal(Date.parse(episode.publishAt), Date.parse(EP2) + index * WEEK, episode.slug);
    const kst = new Date(Date.parse(episode.publishAt) + 9 * 3600000);
    assert.equal(kst.getUTCDay(), 6, episode.slug);
    assert.equal(kst.getUTCHours(), 21, episode.slug);
  });
});

test('every ready episode passes the gate with its images in content/', () => {
  for (const episode of SEASON_ONE.episodes.filter(item => item.status === 'ready')) assert.deepEqual(completeness(episode), [], episode.slug);
});

test('the real schedule opens one ready episode a week and holds drafts', () => {
  assert.deepEqual(real('2026-11-14T21:10:00+09:00'), []);
  assert.deepEqual(real('2026-11-21T20:59:00+09:00'), []);
  assert.deepEqual(real('2026-11-21T21:01:00+09:00'), ['ep2']);
  assert.deepEqual(real('2026-11-28T21:01:00+09:00'), ['ep2', 'ep3']);
  assert.deepEqual(real('2026-12-05T21:01:00+09:00'), ['ep2', 'ep3', 'ep4']);
  assert.deepEqual(real('2026-12-12T21:01:00+09:00'), ['ep2', 'ep3', 'ep4', 'ep5']);
  assert.deepEqual(real('2026-12-19T21:01:00+09:00'), ['ep2', 'ep3', 'ep4', 'ep5', 'ep6']);
  assert.deepEqual(real('2026-12-26T20:59:00+09:00'), ['ep2', 'ep3', 'ep4', 'ep5', 'ep6']);
  assert.deepEqual(real('2026-12-26T21:01:00+09:00'), ['ep2', 'ep3', 'ep4', 'ep5', 'ep6', 'ep7']);
  const ready = SEASON_ONE.episodes.filter(episode => episode.status === 'ready').map(episode => episode.slug);
  assert.deepEqual(real('2027-01-01T00:00:00+09:00'), ready);
  assert.deepEqual(nextRelease(new Date('2026-11-14T21:10:00+09:00')), { no: 2, publishAt: EP2 });
});

test('an episode opens exactly at its publish time, not one minute before', () => {
  assert.deepEqual(slugs(at(EP2, -1)), []);
  assert.deepEqual(slugs(at(EP2, 0)), ['ep2']);
  assert.deepEqual(slugs(at(EP2, 1)), ['ep2']);
  assert.equal(latestEpisode(at(EP2, -1), allFiles), null);
  assert.equal(latestEpisode(at(EP2, 1), allFiles).slug, 'ep2');
  assert.equal(latestEpisode(at(EP2, 1), allFiles).dir, '/assets/yeongnyangi/season-1/ep2');
});

test('draft episodes stay hidden after their date and the next release reveals no title', () => {
  const late = new Date('2027-01-01T00:00:00+09:00');
  assert.deepEqual(slugs(late), ['ep2', 'ep3']);
  assert.deepEqual(nextRelease(late, allFiles), { no: 4, publishAt: null });
  assert.deepEqual(nextRelease(at(EP2, -1), allFiles), { no: 2, publishAt: EP2 });
});

test('the page gate needs 12-24 numbered pages, an alt on every page and the page format', () => {
  const only = episode => slugs(at(EP2, 1), { ...allFiles, episodes: [episode] });
  assert.deepEqual(PAGE_RANGE, [12, 24]);
  assert.deepEqual(only(fixture(2, 'ready', EP2, 12)), ['ep2']);
  assert.deepEqual(only(fixture(2, 'ready', EP2, 24)), ['ep2']);
  assert.deepEqual(only(fixture(2, 'ready', EP2, 11)), []);
  assert.deepEqual(only(fixture(2, 'ready', EP2, 25)), []);
  const noAlt = fixture(2, 'ready', EP2);
  noAlt.pages[5] = { n: 6, alt: ' ' };
  assert.deepEqual(only(noAlt), []);
  assert.deepEqual(completeness(noAlt, allFiles), ['page 6 alt']);
  const skipped = fixture(2, 'ready', EP2);
  skipped.pages.splice(3, 1);
  assert.deepEqual(only(skipped), []);
  assert.deepEqual(only({ ...fixture(2, 'ready', EP2), format: 'cuts' }), []);
});

test('a ready episode missing even one image file is held instead of published on schedule', () => {
  const episode = FIXTURE[0];
  const files = pageFiles(episode, episode.pages[7]);
  assert.deepEqual(files.map(file => file.replace(/\\/g, '/')), ['720.avif', '720.webp', '1122.avif', '1122.webp'].map(tail => `content/yeongnyangi/season-1/ep2/08-${tail}`));
  const missing = { ...allFiles, fileExists: file => file !== files[3] };
  assert.deepEqual(slugs(at(EP2, 1), missing), []);
  assert.deepEqual(completeness(episode, missing), [`missing ${files[3]}`]);
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

test('the episode route reads pages with its own resume key, keeps noindex and still emits one path when nothing is published', () => {
  const source = readFileSync('app/yeongnyangi/season-1/[episode]/page.tsx', 'utf8');
  assert.ok(source.includes(': [{ episode: NO_EPISODE_PLACEHOLDER }]'));
  assert.match(source, /if \(index < 0\) notFound\(\);/);
  assert.ok(source.includes('<PageReader '));
  assert.ok(source.includes('storageKey={`cd:webtoon:yeoni-s1-${episode.slug}:page`}'));
  assert.ok(source.includes('<SerialEndCard '));
  assert.match(source, /robots: \{ index: false, follow: true \},\s+openGraph/);
  assert.ok(readFileSync('app/yeongnyangi/season-1/prologue/page.tsx', 'utf8').includes('<SerialEndCard '));
});
