import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

// The native screen overrides this authored panel only; keep every tea
// disclosure covered if its source manifest changes.
for(const id of ['tea-tarot-three','tea-tarot-five','tea-saju','tea-saju-compat','tea-sukuyo']){
 test(`${id} identifies the payment guidance panel`,async()=>{
  const file=new URL(`../../../public/feature-details/crafted/${id}/manifest.json`,import.meta.url);
  const manifest=JSON.parse(await readFile(file,'utf8'));
  const paymentPanels=manifest.panels.filter(panel=>/이용권|월정석|결제/.test(panel.text||''));
  assert.deepEqual(paymentPanels.map(panel=>panel.id),['editorial-5']);
 });
}
