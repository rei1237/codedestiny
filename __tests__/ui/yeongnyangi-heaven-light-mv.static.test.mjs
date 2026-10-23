import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const bytes = path => statSync(new URL(`../../${path}`, import.meta.url)).size;
const cinema = read('app/yeongnyangi/_components/HeavenLightCinema.tsx');

test('the HEAVEN LIGHT card sits right after the question journey on the Korean home', () => {
  const home = read('app/yeongnyangi/_original/FortuneHome.tsx');
  const order = ['<NightHero/>', '<QuestionJourney source="home"/>', '<HeavenLightCinema/>', '{guide}'].map(mark => home.indexOf(mark));
  assert.ok(order.every(index => index > 0), `missing mount: ${order}`);
  assert.deepEqual([...order].sort((a, b) => a - b), order);
});

test('video is an immutable content-hashed R2 key and nothing loads before the click', () => {
  const urls = [...cinema.matchAll(/'(https:\/\/assets\.code-destiny\.com\/[^']+)'/g)].map(match => match[1]);
  assert.equal(urls.length, 2);
  for (const url of urls) assert.match(url, /^https:\/\/assets\.code-destiny\.com\/yeongnyangi\/mv\/heaven-light-(1080p|720p)-[0-9a-f]{12}\.mp4$/);
  assert.match(cinema, /<video[^>]*preload="none"/);
  assert.match(cinema, /<video[^>]*playsInline/);
  assert.match(cinema, /const LYRICS='\/media\/mv\/heaven-light-ko-v6\.vtt'/);
});

test('lyrics, chapters and the stated length all fit the 4:44 cut', () => {
  const vtt = read('public/media/mv/heaven-light-ko-v6.vtt').replace(/\r\n/g, '\n');
  assert.ok(vtt.startsWith('WEBVTT\n'));
  const seconds = stamp => stamp.split(':').reduce((total, part) => total * 60 + Number(part), 0);
  const cues = [...vtt.matchAll(/^(\d\d:\d\d:\d\d\.\d{3}) --> (\d\d:\d\d:\d\d\.\d{3})$/gm)].map(([, start, end]) => [seconds(start), seconds(end)]);
  assert.equal(cues.length, 106);
  cues.forEach(([start, end], index) => {
    assert.ok(start < end, `cue ${index + 1}`);
    if (index) assert.ok(start >= cues[index - 1][1], `cue ${index + 1} overlaps`);
  });
  assert.ok(cues.at(-1)[1] <= 283.84);
  const chapters = [...cinema.matchAll(/\{name:'[^']+',at:([\d.]+)\}/g)].map(match => Number(match[1]));
  assert.equal(chapters.length, 6);
  chapters.forEach((at, index) => assert.ok(index ? at > chapters[index - 1] && at < 283.84 : at === 0, `chapter ${index + 1}`));
  assert.equal(cinema.match(/4분 44초/g)?.length, 3);
  assert.ok(!cinema.includes('3분 20초'));
});

test('card, poster and chapter art stay inside their byte budgets', () => {
  const art = 'public/assets/yeongnyangi/mv/heaven-light';
  // KiB. card-600.webp is held to the existing home card (root-card-yeongnyangi-600.webp, 89 KiB).
  const budgets = {
    'card-360.avif': 50, 'card-360.webp': 50, 'card-600.avif': 60, 'card-600.webp': 95,
    'v6-poster-640.webp': 180, 'v6-poster-960.webp': 180, 'v6-poster-1440.webp': 180,
  };
  // Chapter art is renamed per cut: same-name files stay cached at the edge for up to 7 days.
  assert.ok(cinema.includes('/heaven-light-v6-ch${index+1}-320.webp'));
  for (let chapter = 1; chapter <= 6; chapter++) budgets[`v6-ch${chapter}-320.webp`] = 12;
  for (const [name, limit] of Object.entries(budgets)) assert.ok(bytes(`${art}-${name}`) <= limit * 1024, `${name} > ${limit} KiB`);
});

test('every music-video event is emitted and documented', () => {
  const docs = read('docs/analytics-kpi.md');
  for (const name of ['impression', 'open', 'play', 'chapter', 'complete', 'cta'].map(step => `yeongnyangi_mv_${step}`)) {
    assert.ok(cinema.includes(`trackEvent('${name}'`), `${name} is not emitted`);
    assert.ok(docs.includes(`\`${name}\``), `${name} is not documented`);
  }
});

test('the end-of-video CTA closes the theatre and lands on the question box', () => {
  const journey = read('app/components/QuestionJourney.tsx');
  assert.match(journey, /<section id="questions"/);
  assert.match(journey, /<textarea id="home-question"/);
  assert.ok(cinema.includes("getElementById('questions')") && cinema.includes("getElementById('home-question')"));
  const docs = read('docs/analytics-kpi.md');
  for (const placement of ['theatre_end', 'theatre_footer']) {
    assert.ok(cinema.includes(`ask('${placement}')`), `${placement} is not wired`);
    assert.ok(docs.includes(`\`${placement}\``), `${placement} is not documented`);
  }
  for (const copy of ['오늘 밤, 당신의 별은?', '영냥이에게 내 운세 묻기', '다시 보기', '내 운세 보러 가기']) assert.ok(cinema.includes(copy), copy);
});
