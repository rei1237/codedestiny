import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';

test('Ziwei presentation keeps the explanatory face visible when removing decorative images',()=>{
 const dom=new JSDOM('<html lang="ko"><body><div id="ziweiModalOverlay"><div id="reading"><img id="decoration" src="old-art.webp"><div class="zw-dashboard"><div class="zw-grid-wrap"></div></div></div></div></body></html>',{url:'https://example.test',runScripts:'outside-only'});
 try {
  dom.window.fetch=async()=>({ok:true,json:async()=>[]});
  for(const file of ['js/core/fortune-consultation-ui.js','js/core/saju/basicFortunePresentation.js'])dom.window.eval(fs.readFileSync(file,'utf8'));
  const area=dom.window.document.querySelector('#reading');
  dom.window.BasicFortunePresentation.ziwei(area,{});
  const face=area.querySelector('.fc-master-reading__portrait');
  assert.ok(face);
  assert.equal(face.hidden,false);
  assert.match(face.src,/free-fortune-faces\/museong\.webp$/);
  assert.equal(area.querySelector('#decoration').hidden,true);
  assert.match(face.parentElement.textContent,/무성의 자미두수 해설/);
 } finally {dom.window.close();}
});
