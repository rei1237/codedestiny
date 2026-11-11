import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const css=fs.readFileSync('styles/fortune-reading-actions.css','utf8');
test('free reading actions reuse the existing moon-flower button tokens',()=>{
 for(const token of ['--cd-cta-primary-bg','--cd-cta-primary-ink','--cd-cta-hairline','--cd-button-sprig-mask','--cd-yehwa-line','--cd-focus-ring'])assert.ok(css.includes(`var(${token})`));
 assert.match(css,/min-height:48px!important/);assert.match(css,/min-width:44px/);assert.match(css,/:focus-visible/);assert.match(css,/:disabled/);assert.match(css,/prefers-reduced-motion:no-preference/);assert.match(css,/animation:none!important/);
 assert.doesNotMatch(css,/#[\da-f]{3,8}\b/i);
});
test('only explicit free action scopes are styled, not AI, payment or navigation',()=>{
 for(const scope of ['[data-cd-reading-action="primary"]','#sukuyoModalOverlay','#ziweiModalOverlay','#astroModalOverlay','#v_run_btn'])assert.ok(css.includes(scope));
 assert.doesNotMatch(css,/(?:#astroAiPromptGenerateBtn|#vedicAiGenerateBtn|#vedicPrashnaPayBtn|\.fc-primary|\.modal-close|\.tab-btn)\s*[,:{]/);
 assert.doesNotMatch(css,/\[data-unlock-key\^=/);
 assert.ok(fs.readFileSync('app/layout.js','utf8').includes('import "../styles/fortune-reading-actions.css"'));
});

test("free key selectors cannot restyle result card containers",()=>{
 assert.doesNotMatch(css, /(?<!button)\[data-unlock-key=/);
});
