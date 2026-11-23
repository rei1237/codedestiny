import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';

const root = fs.readFileSync('app/page.js', 'utf8');
const doc = new JSDOM(fs.readFileSync('index.html', 'utf8'), { virtualConsole: new VirtualConsole() }).window.document;
const template = new JSDOM(fs.readFileSync('templates/home-funnel.html', 'utf8'), { virtualConsole: new VirtualConsole() }).window.document;

test('service chooser omits only the four service-home discovery cards', () => {
  assert.doesNotMatch(root, /styles\.explore|href="\/(?:saju\/free|mini-games|entry-webtoon)\/"|href="\/codedestiny-novel\.html"/);
  assert.match(root, /href="\/business\/api\/"/);
  assert.match(root, /<HomeDailyEntry\s*\/>/);
  assert.match(root, /data-cd-home-widget-entry/);
});

test('ggulggul retains destinations and opens active games without promoting the paused hub', () => {
  const home = doc.querySelector('#cdHomeFunnel');
  const guide = home.querySelector('.yh-library a[href="/entry-webtoon/"]');
  assert.ok(guide, 'the usage comic is reachable from the service bookshelf');
  assert.ok(home.querySelector('.cdh-story a[href$="#homeStoryTitle"]'), 'moonlight stories opens the bookshelf');
  const storySections = home.querySelectorAll('details.cdh-story');
  assert.equal(storySections.length, 1);
  assert.match(storySections[0].querySelector(':scope > summary').textContent, /달빛 이야기/);
  assert.ok(home.querySelector('.cdh-story a[href="#homeStoryTitle"] img[width][height]'));
  for (const href of ['/codedestiny-novel.html', '/music/']) {
    assert.ok(home.querySelector(`.cdh-story a[href="${href}"]`), href);
  }
  assert.ok(home.querySelector('a[data-action="cdOneStepFreeSajuEntry"]'));
  assert.ok(home.querySelector('#cdhLightFortunes a[href="/emoi_omikuji_v2.html"]'));
  for (const surface of [template, home]) {
    assert.equal(surface.querySelectorAll('[data-cdh-entry-card="free-saju"]').length, 0);
    assert.equal(surface.querySelectorAll('a[href="/mini-games/"]').length, 0);
    const games = surface.querySelector('details#cdhLightFortunes[data-cdh-entry-card="mini-games"]');
    assert.ok(games);
    assert.equal(games.open, false);
    assert.match(games.querySelector(':scope > summary').textContent, /미니 운세 게임/);
    assert.ok(games.querySelector('.cdh-light__list'));
  }
});
