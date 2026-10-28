const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { JSDOM } = require('jsdom');
const source = readFileSync(require('node:path').join(__dirname, '../../js/mobile-interaction-patch.js'), 'utf8');
const lifecycle = source.slice(source.indexOf('  function hasOverlayLifecycleResidue()'), source.indexOf('  function scheduleOverlayLifecycleGuard('));
test('visible tarot keeps the background locked; closed tarot permits cleanup', () => {
 const dom = new JSDOM('<body style="overflow:hidden"><div id="tarotModalOverlay" style="display:block"></div></body>', { runScripts:'outside-only' });
 const w=dom.window, overlay=w.document.getElementById('tarotModalOverlay');
 overlay.getBoundingClientRect=()=>({width:390,height:844});
 w.eval(lifecycle+';reconcileOverlayLifecycle();');
 assert.equal(w.document.body.style.overflow,'hidden');
 overlay.style.display='none';w.eval('reconcileOverlayLifecycle();');
 assert.equal(w.document.body.style.overflow,'');
 dom.window.close();
});
