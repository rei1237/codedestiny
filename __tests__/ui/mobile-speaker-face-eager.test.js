const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { JSDOM } = require('jsdom');
const source = readFileSync(require('node:path').join(__dirname, '../../js/mobile-interaction-patch.js'), 'utf8');
const perf = source.slice(source.indexOf('  function applyMobileMediaPerformance('), source.indexOf('  function watchMobileMediaPerformance('));
test('mobile media pass keeps saju speaker faces eager and still lazy-loads other images', () => {
 const dom = new JSDOM('<body><div id="letterBox" style="display:none"><span class="cd-speaker__face"><img id="face" src="/images/fortune-chat/persona/yeoni-greet.webp" loading="eager"></span><img id="other" src="/images/x.webp" loading="eager"></div></body>', { runScripts:'outside-only' });
 const w=dom.window;
 w.eval('function isMobileRuntime(){return true;}'+perf+';applyMobileMediaPerformance(document);');
 assert.equal(w.document.getElementById('face').getAttribute('loading'),'eager');
 assert.equal(w.document.getElementById('other').getAttribute('loading'),'lazy');
 dom.window.close();
});
