import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { renderCraftedDetail } from '../../js/feature-detail-panels.mjs';
import { currentFreeCraftedPanel } from '../../js/free-crafted-panel-policy.mjs';
import { isFreeFortuneFeatureKey } from '../../js/core/free-fortune-policy.mjs';
const root='public/feature-details/crafted';
const manifest=id=>JSON.parse(fs.readFileSync(`${root}/${id}/manifest.json`,'utf8'));
test('generated ESM is the unchanged canonical exact-key policy',()=>{
 assert.equal(fs.readFileSync('js/core/free-fortune-policy.mjs','utf8').split('\n').slice(1).join('\n'),fs.readFileSync('lib/payment/free-fortune-policy.mjs','utf8'));
 assert.equal(isFreeFortuneFeatureKey('human-design-report'),false);
});
test('free condition panels retain prose and disclaimers but not retired artwork',()=>{
 const detail=manifest('sukuyo-yearly'); const p=detail.panels.find(p=>p.id==='02-the-year-you-choose'); const next=currentFreeCraftedPanel(detail,p);
 assert.equal(next.currentFreeAccess,true);assert.ok(next.text.includes('한 해의 큰 주제를 읽은 뒤'));assert.ok(!next.text.includes('구매 전'));
 const html=renderCraftedDetail(detail);assert.ok(html.includes('data-current-free-access'));assert.ok(!html.includes(`src="${p.src}"`));assert.ok(html.includes('무료 계산형 콘텐츠입니다. AI 생성 상담은 별도 유료입니다.'));
 assert.ok(html.includes(detail.panels.find(p=>p.id==='05-four-domains-of-daily-life').src));assert.ok(html.includes('질병을 진단하는 내용은 아니에요.'));
});
test('no-purchase, fictional-review, and external-AI disclaimers preserve their illustrations',()=>{
 for(const [id,panelId] of [['life-skill-tree','04-skills-you-use-and-develop'],['nakshatra-compat','09-read-together'],['ziwei-compatibility','09-a-story-and-a-tool']]){const d=manifest(id),p=d.panels.find(p=>p.id===panelId);assert.strictEqual(currentFreeCraftedPanel(d,p),p);}
});
test('paid light/daewun, AI and unknown keys do not use the free replacement',()=>{
 const p={title:'안내',src:'/test.webp',text:'아래에서 현재 해금 조건을 확인하세요.'};
 for(const featureKey of ['section_summary','section_daewun','nakshatra-ai-consultation','unknown'])assert.strictEqual(currentFreeCraftedPanel({featureKey},p),p);
});
test('all manifest changes are exact free keys and preserve unchanged panels',()=>{
 let changed=0;
 for(const id of fs.readdirSync(root)){let d;try{d=manifest(id)}catch{continue}for(const p of d.panels||[]){const n=currentFreeCraftedPanel(d,p);if(n!==p){changed++;assert.ok(isFreeFortuneFeatureKey(d.featureKey));assert.equal(n.src,p.src);assert.equal(n.title,p.title);}else assert.strictEqual(n,p);}}
 assert.ok(changed>40&&changed<60, String(changed));
});

test('price options use exact option keys and keep mixed AI prices intact',async()=>{
 const {renderFeatureDetailPanels}=await import('../../js/feature-detail-panels.mjs');
 const d={verification:'verified',featureKey:'nakshatra-basic-reading',title:'안내',href:'/nakshatra/',ctaLabel:'보기',priceOptions:[{featureKey:'nakshatra-basic-reading',label:'기본',amountKRW:3000},{featureKey:'nakshatra-ai-consultation',label:'AI',amountKRW:30000}]};
 const html=renderFeatureDetailPanels(d,{startPriceLabel:'기본과 AI 별도'});
 assert.ok(html.includes('<dt>기본</dt><dd>무료</dd>'));
 assert.ok(html.includes('<dt>AI</dt><dd>30,000원</dd>'));
 assert.ok(html.includes('기본과 AI 별도'));
 const free=renderFeatureDetailPanels({...d,priceOptions:[]},{startPriceLabel:'3,000원'});
 assert.ok(!free.includes('3,000원'));assert.ok(free.includes('무료 계산형 콘텐츠 · AI 생성 상담 별도'));
});

test('notice keeps disclaimers and personal-result limitations verbatim',async()=>{
 const {currentFreeCraftedNotice}=await import('../../js/free-crafted-panel-policy.mjs');
 for(const id of fs.readdirSync(root)){let d;try{d=manifest(id)}catch{continue}const n=currentFreeCraftedNotice(d);
 if(!isFreeFortuneFeatureKey(d.featureKey)){assert.equal(n,d.notice||'');continue;}
 for(const clause of (d.notice||'').split(/(?<=[.!?。])\s+/).filter(s=>/진단|보장|확률|후기|시간.*모르|시각.*미입력|포함하지 않|포함되지 않/.test(s)&&!/가격|조건|해금/.test(s)))assert.ok(n.includes(clause),id+': '+clause);
 assert.ok(!/기존 가격|결제 조건|해금 조건|현재해금조건|결제창/.test(n),id);
 }
 const d=manifest('astro-direct-synastry');assert.ok(currentFreeCraftedNotice(d).includes('외부 AI의 답변이나 별도 질문 상담 구매를 포함하지 않습니다.'));
 const html=renderCraftedDetail(manifest('sukuyo-yearly'));assert.ok(!html.includes('구매 전 선택한 프로필·연도와 현재 결제 조건'));
});
test('basic renderer free CTA does not alter paid light or daewun bundle',async()=>{
 const {renderBasicFortuneDetail}=await import('../../js/basic-fortune-detail.mjs');
 for(const id of ['astro-basic-deep','ziwei-decade','sukuyo-nature','vedic-basic-reading']){const html=renderBasicFortuneDetail(manifest(id));assert.ok(html.includes('무료 상세 풀이 보기'));assert.ok(!html.includes('한 번 결제'));}
 for(const id of ['saju-summary','saju-daewun']){const html=renderBasicFortuneDetail({id,title:'제목'});assert.ok(html.includes('한 번 결제로 같은 생년월일의 사주에 영구히 열려요.'));assert.ok(html.includes('라이트 사주 풀이 열기'));assert.ok(!html.includes('무료 상세 풀이 보기'));}
});
