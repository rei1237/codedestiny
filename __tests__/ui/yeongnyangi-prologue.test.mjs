import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { renderStoryLibrary } from '../../lib/marketing/home-story-library.mjs';
import { mountStoryLibrary } from '../../js/core/home-story-library.mjs';
import { PROLOGUE, PROLOGUE_DIR, PROLOGUE_WIDTHS, prologuePage } from '../../lib/yeongnyangi/prologue.mjs';

test('episode 1 (the prologue) has 18 pages in order, each with a script alt and both image formats at every width', () => {
  assert.equal(PROLOGUE.title, '아무도 재촉하지 않았다');
  assert.equal(PROLOGUE.pages.length, 18);
  assert.deepEqual(PROLOGUE.pages.map(page => page.n), Array.from({ length: 18 }, (_, i) => i + 1));
  for (const page of PROLOGUE.pages) {
    assert.ok(page.alt.trim().length > 0, `page ${page.n} alt`);
    for (const w of PROLOGUE_WIDTHS) {
      for (const ext of ['avif', 'webp']) {
        const file = `public${prologuePage(page.n)}-${w}.${ext}`;
        assert.ok(existsSync(file), file);
      }
    }
  }
});

test('no page image is left over from the old 24-page prologue', () => {
  const numbers = readdirSync(`public${PROLOGUE_DIR}`).map(name => Number(name.slice(0, 2))).filter(Number.isFinite);
  assert.equal(Math.max(...numbers), PROLOGUE.pages.length);
});

test('the story shelf features episode 1 and keeps the latest episode outside the card', () => {
  const source = readFileSync('app/consultations/StoryDiscovery.tsx', 'utf8');
  assert.ok(source.includes('href={PROLOGUE.href}'));
  assert.ok(source.includes('data-serial-latest'));
  assert.equal(PROLOGUE.href, '/yeongnyangi/season-1/prologue/');
  assert.ok(existsSync('app/yeongnyangi/season-1/prologue/page.tsx'));
});

test('the shelf keeps the most recently read episode separate from the latest published episode', async t => {
  const dom = new JSDOM(renderStoryLibrary(), {url:'https://example.test/ggulggul/',runScripts:'outside-only'});
  t.after(() => dom.window.close());
  const win = dom.window;
  const labels = JSON.parse(readFileSync('public/i18n/en.json', 'utf8')).home.shelf;
  win.cdTranslate = (key, vars) => labels[key.split('.').at(-1)].replace(/\{(\w+)\}/g, (_, name) => vars[name]);
  let enter, requests = 0;
  win.IntersectionObserver = class {
    constructor(callback) { enter = () => callback([{isIntersecting:true}]); }
    observe() {}
  };
  const latestEpisode = {no:2, slug:'ep2', href:'/yeongnyangi/season-1/ep2/', pages:12};
  win.fetch = async path => {
    assert.equal(path, '/assets/yeongnyangi/season-1/published.json');
    requests++;
    return {ok:true,json:async () => [latestEpisode]};
  };
  const progressKey = 'cd:webtoon:yeoni-s1-ep1:page';
  win.localStorage.setItem(progressKey, '4');
  win.localStorage.setItem('cd:webtoon:yeoni-s1-ep2:page', '2');
  win.localStorage.setItem('cd:webtoon:last-read', progressKey);
  mountStoryLibrary(win.document.querySelector('.yh-library'));
  assert.equal(requests, 0, 'the shelf only loads the episode manifest when reached');
  enter();
  await new Promise(resolve => setTimeout(resolve, 0));
  const latest = win.document.querySelector('[data-serial-latest]');
  const resume = win.document.querySelector('[data-serial-resume]');
  assert.equal(latest.pathname, latestEpisode.href);
  assert.equal(resume.hidden, false);
  assert.equal(resume.pathname, PROLOGUE.href);
  assert.equal(resume.textContent, 'Continue episode 1, page 4');
  assert.equal(latest.textContent, 'Read the latest episode (2)');
  assert.equal(resume.dataset.cdOriginText, '1화 4쪽 이어보기');
  win.localStorage.setItem(progressKey, String(PROLOGUE.pages.length));
  win.localStorage.setItem('cd:webtoon:yeoni-s1-ep2:page', '-1');
  win.dispatchEvent(new win.Event('pageshow'));
  assert.equal(resume.hidden, true, 'completed and invalid bookmarks do not offer resume');
  assert.equal(requests, 1);
});
