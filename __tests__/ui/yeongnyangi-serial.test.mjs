import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SEASON_ONE } from '../../lib/yeongnyangi/season-1.mjs';
import { completeness, formatKst, latestEpisode, nextRelease, publishedEpisodes, serialNow } from '../../lib/yeongnyangi/serial.mjs';

const allFiles = { fileExists: () => true };
const at = (iso, minutes = 0) => new Date(Date.parse(iso) + minutes * 60000);
const slugs = (now, options = allFiles) => publishedEpisodes(now, options).map(episode => episode.slug);
const EP2 = SEASON_ONE.episodes[1].publishAt;

test('season 1 runs six weekly episodes on Saturday 21:00 KST, ep1 to ep3 ready and the rest draft', () => {
  assert.equal(SEASON_ONE.episodes.length, 6);
  assert.deepEqual(SEASON_ONE.episodes.map(episode => episode.status), ['ready', 'ready', 'ready', 'draft', 'draft', 'draft']);
  for (const episode of SEASON_ONE.episodes.slice(1)) {
    const kst = new Date(Date.parse(episode.publishAt) + 9 * 3600000);
    assert.equal(kst.getUTCDay(), 6, episode.slug);
    assert.equal(kst.getUTCHours(), 21, episode.slug);
  }
});

test('an episode opens exactly at its publish time, not one minute before', () => {
  assert.deepEqual(slugs(at(EP2, -1)), ['ep1']);
  assert.deepEqual(slugs(at(EP2, 0)), ['ep1', 'ep2']);
  assert.deepEqual(slugs(at(EP2, 1)), ['ep1', 'ep2']);
  assert.equal(latestEpisode(at(EP2, -1), allFiles).slug, 'ep1');
  assert.equal(latestEpisode(at(EP2, 1), allFiles).slug, 'ep2');
});

test('draft episodes stay hidden after their date and the next release reveals no title', () => {
  const late = new Date('2027-01-01T00:00:00+09:00');
  assert.deepEqual(slugs(late), ['ep1', 'ep2', 'ep3']);
  assert.deepEqual(nextRelease(late, allFiles), { no: 4, publishAt: null });
  assert.deepEqual(Object.keys(nextRelease(at(EP2, -1), allFiles)).sort(), ['no', 'publishAt']);
});

test('an incomplete ready episode is held instead of published on schedule', () => {
  const missing = { fileExists: file => !file.includes('ep2') };
  assert.deepEqual(slugs(at(EP2, 1), missing), ['ep1']);
  assert.ok(completeness(SEASON_ONE.episodes[1], missing).some(problem => problem.startsWith('missing')));
  const oneCut = { ...allFiles, cuts: { ep1: { cuts: [] } } };
  assert.deepEqual(slugs(at(EP2, 1), oneCut), []);
});

test('re-running at the same instant gives the same result', () => {
  const now = serialNow({ SERIAL_NOW: '2026-11-14T21:00:00+09:00' });
  assert.deepEqual(publishedEpisodes(now, allFiles), publishedEpisodes(now, allFiles));
  assert.throws(() => serialNow({ SERIAL_NOW: 'not-a-date' }));
});

test('sitemap lists the season index but no individual episode', () => {
  for (const file of ['sitemap.xml', 'public/sitemap.xml']) {
    const xml = readFileSync(file, 'utf8');
    assert.ok(xml.includes('/yeongnyangi/season-1/</loc>'), file);
    assert.ok(!/\/yeongnyangi\/season-1\/ep\d/.test(xml), file);
  }
});

test('episode times are shown in KST', () => {
  assert.equal(formatKst('2026-11-14T21:00:00+09:00'), '11월 14일(토) 21:00');
  assert.equal(formatKst('2026-11-14T12:00:00Z'), '11월 14일(토) 21:00');
});
