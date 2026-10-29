import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {assembleNovelAuthored} from '../../scripts/lib/novel-authored-merge.mjs';
const source=JSON.stringify({episodes:[{no:'PROLOGUE',title:'제목',tag:'태그',beats:[{id:'p:1',t:'원문',nm:'이름',skill:{name:'기술',unit:'단위'},choice:{options:[{id:'a',label:'선택'}]}}]}]});
const document={locale:'en',episodeId:'prologue',sourceTitle:'제목',sourceTag:'태그',title:'Title',tag:'Prologue',beats:[{id:'p:1',source:'원문',sourceHash:createHash('sha256').update('원문').digest('hex'),t:'Prose',nm:'Name',skill:{name:'Skill',unit:'First Beat'},choice:{options:[{id:'a',label:'Choice'}]}}]};
test('offline assembly checks source text and preserves every display field',()=>{
  const result=assembleNovelAuthored(source,[document],'en');
  assert.deepEqual(result.missing,[]);assert.equal(result.translatedBeats,1);
  assert.equal(result.translation.episodes[0].beats[0].choice.options[0].label,'Choice');
  assert.throws(()=>assembleNovelAuthored(source,[{...document,sourceTitle:'옛 제목'}],'en'),/Stale authored metadata/);
  assert.throws(()=>assembleNovelAuthored(source,[{...document,beats:[{...document.beats[0],source:'구판'}]}],'en'),/Stale authored beat/);
  assert.throws(()=>assembleNovelAuthored(source,[document,document],'en'),/Duplicate/);
});
test('missing display copy is a publication failure even with translated prose',()=>{
  const draft={...document,beats:[{...document.beats[0],nm:undefined,skill:undefined,choice:undefined}]};
  const result=assembleNovelAuthored(source,[draft],'en');
  assert.deepEqual(result.missing,['p:1/nm','p:1/skill.name','p:1/skill.unit','p:1/choice/a']);
});
