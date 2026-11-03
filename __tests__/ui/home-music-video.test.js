const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const read = p => fs.readFileSync(p, 'utf8');
test('home film is visible without opening a story disclosure and playlist remains in its former slot', () => {
  const doc = new JSDOM(read('index.html')).window.document;
  const film = doc.querySelector('#cdhMoonlightMv');
  assert.ok(film);
  assert.equal(film.closest('details'), null);
  assert.equal(doc.querySelectorAll('#cdhMoonlightMv').length, 1);
  assert.equal(film.querySelector('video').autoplay, false);
  assert.equal(doc.querySelector('.cdh-story__card--music').getAttribute('href'), '/music/');
  assert.ok(doc.querySelector('.cdh-story__card--novel'));
  assert.ok(film.querySelector('track[kind="subtitles"]'));
});
test('both homes keep explicit playback and shared media sources', async () => {
  const { moonlightVideo } = await import('../../lib/marketing/moonlight-video.mjs');
  assert.ok(read('index.html').includes(moonlightVideo.src720));
  const component = read('app/components/HomeMusicVideo.jsx');
  assert.match(component, /preload="none"/);
  assert.doesNotMatch(component, /autoPlay/);
  assert.match(component, /controls playsInline/);
  assert.match(read('app/page.js'), /<HomeMusicVideo\s*\/>/);
});
