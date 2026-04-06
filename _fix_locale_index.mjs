import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

// 로케일 index.html 파일 목록
const localeFiles = [
  'public/zh-cn/index.html',
  'public/de-de/index.html',
  'public/hi-in/index.html',
  'public/nl-nl/index.html',
  'public/fr-fr/index.html',
  'public/static/index.html',
];

// 검색해서 있는 파일만
const existing = localeFiles.filter(f => {
  try { statSync(f); return true; } catch { return false; }
});

console.log('Processing', existing.length, 'locale files');

for (const p of existing) {
  try {
    let c = readFileSync(p, 'utf8');
    const orig = c;
    let changes = [];

    // 1. prem-card 자미두수 이미지 업데이트
    const old1 = `src="/fuctionassets/jami.webp" alt="H 프리미엄 자미두수"`;
    const new1 = `src="/fuctionassets/jamipremiun.webp" alt="H 프리미엄 자미두수"`;
    if (c.includes(old1)) { c = c.replace(old1, new1); changes.push('ziwei prem img'); }

    // 2. tarot-tile 자미두수 data-img-src 업데이트
    const old2 = `data-img-src="/fuctionassets/jami.webp" data-img-alt="자미두수`;
    const new2 = `data-img-src="/fuctionassets/jamipremiun.webp" data-img-alt="자미두수`;
    if (c.includes(old2)) { c = c.replace(old2, new2); changes.push('tarot-tile ziwei img'); }

    // 3. D 객체 openZiweiModal img 업데이트
    const old3 = `openZiweiModal:{cat:'자미두수 · 진로 적성 특화',`;
    if (c.includes(old3)) {
      c = c.replace(/openZiweiModal:\{[^}]+img:'\/fuctionassets\/jami\.webp'\}/,
        m => m.replace("'/fuctionassets/jami.webp'", "'/fuctionassets/jamipremiun.webp'"));
      changes.push('D[openZiweiModal] img');
    }

    // 4. D 객체에 openLifeBookModal 추가 (없으면)
    const lbEntry = `    openLifeBookModal:{cat:'프리미엄 · 사주 심층 분석',title:'📜 인생의 책',tagline:'10년 후 내 인생이 어떻게 될지 지금 미리 볼 수 있습니다 — 돈이 들어오는 해와 조심해야 할 해를 미리 아는 것',feats:['사주 팔자 8글자로 평생 운세 흐름 완전 분석','대운 10년 단위로 기회의 해 & 위기의 해 미리 파악','재물이 크게 들어오는 시기 & 피해야 할 시기 정확히 계산','평생 간직할 PDF 저장 가능 프리미엄 리포트'],cost:'🪙 490코인',ct:'paid',img:'/fuctionassets/lifebook.webp'},\n`;
    const lsAnchor = `    openLoveSecretModal:{cat:'프리미엄 · 연애 전략서'`;
    if (!c.includes("openLifeBookModal:{cat:'") && c.includes(lsAnchor)) {
      c = c.replace(lsAnchor, lbEntry + lsAnchor);
      changes.push('openLifeBookModal added to D');
    }

    // 5. D 객체에 gotoZiweiPremium 추가 (없으면)
    const zpEntry = `    gotoZiweiPremium:{cat:'자미두수 · Ziwei Premium',title:'🌌 H 프리미엄 자미두수 인생 총론',tagline:'중국 황실 비전의 자미두수 명반 완전판 — 12궁 완전 분석으로 당신의 평생 운명 지도를 완성하고 대운 시나리오까지 제시합니다',feats:['12궁 완전 분석 · 명궁·재백궁·관록궁 심층 해독','상하관계 처세술 · 사람을 다루는 지혜 전략','평생 마스터플랜 카드 · 대운·세운 시나리오 제시','590코인 단 한 번 결제로 평생 무제한 이용'],cost:'🔒 영구 해금 590코인',ct:'paid',img:'/fuctionassets/jamipremiun.webp'},\n`;
    const dsAnchor = `    openDestinyFlowerStudio:{cat:'운명의 꽃`;
    if (!c.includes('gotoZiweiPremium:') && c.includes(dsAnchor)) {
      c = c.replace(dsAnchor, zpEntry + dsAnchor);
      changes.push('gotoZiweiPremium added to D');
    }

    // 6. 프리뷰 인터셉터에 prem-card 추가
    const old6 = `.tarot-tile,.lifebook-tile,.lovebible-tile';`;
    const new6 = `.tarot-tile,.lifebook-tile,.lovebible-tile,.prem-card';`;
    if (c.includes(old6)) { c = c.replace(old6, new6); changes.push('interceptor extended'); }

    // 7. _onCta lock fix
    const old7 = `var _pvwCoinCost=Number(tile.getAttribute('data-coin-cost')||0);
    if(href&&tile.tagName==='A'&&_pvwCoinCost<=0){window.location.href=href;return;}`;
    const new7 = `var _pvwCoinCost=Number(tile.getAttribute('data-coin-cost')||0);
    var _pvwLockCost=Number(tile.getAttribute('data-tile-lock-cost')||0);
    if(href&&tile.tagName==='A'&&_pvwCoinCost<=0&&_pvwLockCost<=0){window.location.href=href;return;}`;
    if (c.includes(old7)) { c = c.replace(old7, new7); changes.push('_onCta lock fix'); }

    if (c !== orig) {
      writeFileSync(p, c, 'utf8');
      console.log('[' + p + '] SAVED: ' + changes.join(', '));
    } else {
      console.log('[' + p + '] NO CHANGES');
    }
  } catch (e) {
    console.error('[' + p + '] ERROR: ' + e.message);
  }
}
console.log('DONE');
