import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../../scripts/i18n-merge-authored.mjs',import.meta.url),'utf8');
const start=source.indexOf('function setDeep('),end=source.indexOf('// 저작 파일 수집',start);
const scope={};vm.runInNewContext(source.slice(start,end),scope);
test('authored replacement of one array item preserves all neighboring content',()=>{
  const data={feature:{faq:[{q:'first question',a:'first answer'},{q:'second question',a:'second answer'}]}};
  scope.setDeep(data,'feature.faq.0.q','translated question');
  assert.ok(Array.isArray(data.feature.faq));assert.equal(data.feature.faq.length,2);
  assert.equal(data.feature.faq[0].a,'first answer');assert.equal(data.feature.faq[1].q,'second question');
  assert.equal(data.feature.faq[0].q,'translated question');
});

test('an explicitly reviewed complete array removes only obsolete trailing copy',()=>{
  const data={feature:{notes:['current policy','current access','obsolete policy'],other:['keep']}};
  scope.trimAuthoredArray(data,'feature.notes',2);
  assert.deepEqual(data.feature.notes,['current policy','current access']);
  assert.deepEqual(data.feature.other,['keep']);
  assert.throws(()=>scope.trimAuthoredArray(data,'feature.notes',3),/Incomplete/);
  assert.throws(()=>scope.trimAuthoredArray(data,'feature.notes',-1),/Invalid/);
});
