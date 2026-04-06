import { readFileSync, writeFileSync } from 'fs';

const path = 'public/index.html';
let c = readFileSync(path, 'utf8');
const orig = c;
let changes = [];

// ── 1. 소형 카드 그리드 자미두수 이미지 jami.webp → jamipremiun.webp ──
// prem-fortune-grid 안의 H 프리미엄 자미두수 카드
const premCardOld = `<img src="/fuctionassets/jami.webp" alt="H 프리미엄 자미두수"
                     style="width:100%;height:100%;object-fit:cover;display:block;" loading="lazy">`;
const premCardNew = `<img src="/fuctionassets/jamipremiun.webp" alt="H 프리미엄 자미두수"
                     style="width:100%;height:100%;object-fit:cover;display:block;" loading="lazy">`;
if (c.includes(premCardOld)) {
  c = c.replace(premCardOld, premCardNew);
  changes.push('prem-card ziwei image updated');
} else {
  changes.push('WARN: prem-card ziwei image not found (may already updated)');
}

// ── 2. tarot-tile 자미두수 (openZiweiModal tile) data-img-src 업데이트 ──
// 자미두수 12궁 타일과 자미두수 꽃 타일 모두 jamipremiun으로 교체
const tileImgOld = `data-img-src="/fuctionassets/jami.webp" data-img-alt="자미두수 — 12궁 명반 운명 분석"`;
const tileImgNew = `data-img-src="/fuctionassets/jamipremiun.webp" data-img-alt="자미두수 — 12궁 명반 운명 분석"`;
if (c.includes(tileImgOld)) {
  c = c.replace(tileImgOld, tileImgNew);
  changes.push('tarot-tile ziwei img-src updated');
} else {
  changes.push('WARN: tarot-tile ziwei img-src not found');
}

// ── 3. D 객체 자미두수 관련 img 필드 업데이트 ──
// openZiweiModal
c = c.replace(
  `openZiweiModal:{cat:'자미두수 · 진로 적성 특화',title:'🌌 자미두수(紫微)',tagline:'중국 황제들이 세자 교육에 쓴 명리학 — 진로·직업 적성에 특화되어 있어 왜 이 일이 맞는지 즉시 납득됩니다',feats:['자미두수 12궁으로 내 진짜 직업 적성 완전 파악','관록궁·재백궁으로 어떤 분야에서 돈을 버는지 분석','숨겨진 재능과 성공 패턴 완전 해독','400코인 단 한 번 결제로 평생 무제한 이용'],cost:'🔒 영구 해금 400코인',ct:'paid',img:'/fuctionassets/jami.webp'}`,
  `openZiweiModal:{cat:'자미두수 · 진로 적성 특화',title:'🌌 자미두수(紫微)',tagline:'중국 황제들이 세자 교육에 쓴 명리학 — 진로·직업 적성에 특화되어 있어 왜 이 일이 맞는지 즉시 납득됩니다',feats:['자미두수 12궁으로 내 진짜 직업 적성 완전 파악','관록궁·재백궁으로 어떤 분야에서 돈을 버는지 분석','숨겨진 재능과 성공 패턴 완전 해독','400코인 단 한 번 결제로 평생 무제한 이용'],cost:'🔒 영구 해금 400코인',ct:'paid',img:'/fuctionassets/jamipremiun.webp'}`
);
changes.push('D[openZiweiModal] img updated');

// ── 4. D 객체에 gotoZiweiPremium 추가 ──
const gotoZiweiEntry = `    gotoZiweiPremium:{cat:'자미두수 · Ziwei Premium',title:'🌌 H 프리미엄 자미두수 인생 총론',tagline:'중국 황실 비전의 자미두수 명반 완전판 — 12궁 완전 분석으로 당신의 평생 운명 지도를 완성하고 대운 시나리오까지 제시합니다',feats:['12궁 완전 분석 · 명궁·재백궁·관록궁 심층 해독','상하관계 처세술 · 사람을 다루는 지혜 전략','평생 마스터플랜 카드 · 대운·세운 시나리오 제시','590코인 단 한 번 결제로 평생 무제한 이용'],cost:'🔒 영구 해금 590코인',ct:'paid',img:'/fuctionassets/jamipremiun.webp'},\n`;

// openDestinyFlowerStudio 앞에 삽입
const flowerAnchor = `    openDestinyFlowerStudio:`;
if (c.includes(flowerAnchor) && !c.includes('gotoZiweiPremium:')) {
  c = c.replace(flowerAnchor, gotoZiweiEntry + flowerAnchor);
  changes.push('gotoZiweiPremium D entry added');
} else if (c.includes('gotoZiweiPremium:')) {
  changes.push('SKIP: gotoZiweiPremium already in D');
} else {
  changes.push('WARN: openDestinyFlowerStudio anchor not found');
}

// ── 5. 프리뷰 인터셉터 클래스 선택자에 prem-card 추가 ──
const interceptorOld = `var tile=e.target.closest('.tarot-tile,.lifebook-tile,.lovebible-tile');`;
const interceptorNew = `var tile=e.target.closest('.tarot-tile,.lifebook-tile,.lovebible-tile,.prem-card');`;
if (c.includes(interceptorOld)) {
  c = c.replace(interceptorOld, interceptorNew);
  changes.push('preview interceptor extended to prem-card');
} else {
  changes.push('WARN: preview interceptor selector not found');
}

// ── 6. _onCta에서 잠금(lock) 타일인 경우 직접 navigate 방지 ──
// A 태그이고 coin-cost=0이더라도 lock-cost가 있으면 직접 navigate 하지 않음
const ctaOld = `var _pvwCoinCost=Number(tile.getAttribute('data-coin-cost')||0);
    if(href&&tile.tagName==='A'&&_pvwCoinCost<=0){window.location.href=href;return;}`;
const ctaNew = `var _pvwCoinCost=Number(tile.getAttribute('data-coin-cost')||0);
    var _pvwLockCost=Number(tile.getAttribute('data-tile-lock-cost')||0);
    if(href&&tile.tagName==='A'&&_pvwCoinCost<=0&&_pvwLockCost<=0){window.location.href=href;return;}`;
if (c.includes(ctaOld)) {
  c = c.replace(ctaOld, ctaNew);
  changes.push('_onCta lock-tile navigation fix applied');
} else {
  changes.push('WARN: _onCta pattern not found');
}

if (c !== orig) {
  writeFileSync(path, c, 'utf8');
  console.log('SAVED: ' + path);
} else {
  console.log('NO CHANGES');
}

console.log('Changes:', changes.join('\n  '));
