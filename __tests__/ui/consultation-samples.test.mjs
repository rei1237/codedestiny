import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import samples from '../../lib/marketing/result-samples.json' with {type:'json'};
import {renderResultSamples} from '../../lib/marketing/render-result-samples.mjs';
import {renderConsultationSampleGuide} from '../../js/consultation-sample-guide.mjs';
import {renderFeatureDetailPanels} from '../../js/feature-detail-panels.mjs';
import {NODE_TEST_PATTERNS} from '../../scripts/lib/mock-test-config.mjs';
const representative=samples.filter(item=>item.group==='대표 상담');
const source='https://claude.ai/artifact/PtPUfhaiHM37ebpxtr4nQV';

test('comparison preserves seven products, anchors, official art and four Yeongnyangi links',()=>{
  assert.deepEqual(representative.map(item=>item.id),['fusion','codex','love-secret','new-year','neo','yeoni','life-book']);
  const doc=JSDOM.fragment(renderResultSamples({prefix:'landing-sample'}));
  for(const item of samples){
    const card=doc.querySelector('#landing-sample-'+item.id);
    assert.equal(card.querySelector('.result-sample__cta').getAttribute('href'),item.href);
    assert.ok(existsSync('public'+item.visual),item.visual);
    assert.ok(card.querySelector('img').getAttribute('alt'));
  }
  assert.equal(doc.querySelectorAll('.consultation-guide').length,0,'deep examples belong in detail views');
  assert.ok(NODE_TEST_PATTERNS.includes('__tests__/ui/*.test.mjs'),'existing CI test:node discovers this regression');
});

test('each detail has one immediately readable example and two native disclosure examples with honest provenance',()=>{
  for(const item of representative){
    assert.equal(item.guide.examples.length,3,item.id);
    const doc=JSDOM.fragment(renderResultSamples({ids:[item.id]}));
    const examples=doc.querySelectorAll('[data-example-kind]');
    assert.equal(examples.length,3,item.id);
    assert.equal(examples[0].closest('details'),null);
    assert.ok(examples[1].closest('details'));
    assert.ok(examples[2].closest('details'));
    assert.equal(doc.querySelector('details').hasAttribute('open'),false);
    for(const example of examples){
      if(example.dataset.exampleKind==='result'){
        assert.equal(example.querySelector('a').getAttribute('href'),source);
        assert.match(example.textContent,/가상 프로필/);
        assert.match(example.textContent,/발췌 출처/);
      }else assert.match(example.textContent,/실제 생성 결과 아님/);
    }
  }
});

test('current fusion, separate codex editions and tea source boundary are explicit',()=>{
  const byId=id=>samples.find(item=>item.id===id).guide;
  const fusion=JSON.stringify(byId('fusion'));
  for(const term of ['사주','자미두수','베다점','숙요점','서양 점성술','타로','공통점과 차이점','시기','행동','최종 판단']) assert.ok(fusion.includes(term),term);
  assert.ok(byId('fusion').examples.every(example=>example.kind==='editorial'));
  assert.ok(byId('yeoni').examples.every(example=>example.kind==='editorial'));
  const codex=JSON.stringify(byId('codex'));
  assert.match(codex,/개인판/); assert.match(codex,/궁합판/); assert.match(codex,/각 판 20개 챕터/); assert.match(codex,/총 5만 자/);
  assert.match(byId('love-secret').examples[1].text,/피해야 할 대화 문장/,'negative source example must retain its context');
});

test('generated feature introductions use the same guide and retain conversion actions',()=>{
  for(const item of representative){
    const detail=JSON.parse(readFileSync('public/feature-details/'+item.slug+'.json','utf8'));
    assert.deepEqual(detail.consultationGuide,item.guide,item.slug);
    const doc=JSDOM.fragment(renderFeatureDetailPanels(detail,{conversionPrompt:true}));
    assert.equal(doc.querySelectorAll('.consultation-guide').length,1,item.id);
    assert.ok(doc.querySelector('[data-fortune-hero-action]'));
    assert.equal(doc.querySelectorAll('.consultation-guide [data-example-kind]').length,3);
    const guide = doc.querySelector('.consultation-guide');
    assert.ok(guide.querySelector('.consultation-guide__reading').compareDocumentPosition(guide.querySelector('.consultation-guide__outline')) & 4, 'sample appears before the full outline');
  }
});

test('guide escapes content and only links the approved public source',()=>{
  const guide=structuredClone(representative[0].guide);
  guide.audience='<script>bad()</script>';
  guide.examples=[{title:'<img onerror=bad()>',text:'<script>bad()</script>',kind:'result',sourceUrl:'javascript:bad()',sourceLabel:'bad'}];
  const doc=JSDOM.fragment(renderConsultationSampleGuide(guide));
  assert.equal(doc.querySelector('script,img,a'),null);
  assert.match(doc.textContent,/<script>bad/);
});

test('comparison colors do not require home masks and detail entry routes cover all seven',()=>{
  for(const file of ['styles/result-samples.css','app/consultation-samples/samples-landing.css']){
    const css=readFileSync(file,'utf8');
    assert.doesNotMatch(css,/mask:|--cd-yehwa|#100c1d|#f4eeff/);
    assert.match(css,/--cd-samples-paper/);
  }
  for(const file of ['app/neo-operation-room/page.tsx','app/fortune-tea-house/page.tsx','app/life-book-ai/page.tsx']) assert.match(readFileSync(file,'utf8'),/ResultSamples/);
});
