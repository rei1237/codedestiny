import { readFileSync, writeFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { CURRENT_PASS_PLANS } from '../../lib/payment/pass-policy.js';
import { listServicePackPlans } from '../../worker/payments/service-pack-policy.js';
import { FEATURE_KEY_PRICE_TABLE } from '../../worker/lib/paid-feature-registry.js';

const original = readFileSync('index.html', 'utf8');
const vars = {};

// 2026-10-17 "직관성": 홈은 대표 상담 덱·무료 세 장·이용권만 조립한다. 예전 홈 섹션(고민 칩·탐색기·오늘 허브·뮤직비디오 등)은
// 모두 생성 영역 안에만 있었으므로 영역을 갈아끼우면 함께 빠진다 — 기능 페이지와 URL 은 그대로다.
// 무료로 먼저 — 세 장만. 사주·타로는 레지스트리의 '무료 시작' 항목이고, 오늘의 운세는 /today/ 페이지다.
const registryWindow = {};
runInNewContext(readFileSync('js/core/service-registry.js', 'utf8'), { window: registryWindow });
for (const id of ['saju', 'tarot']) {
  const service = registryWindow.__cdServiceRegistry.find(item => item.id === id);
  if (service?.price !== '무료 시작') throw new Error('Free home card must retain its catalog free entry: ' + id);
}
const FREE_CARDS = [
  { attrs: 'data-cdh-free href="/?action=cdOneStepFreeSajuEntry" data-action="cdOneStepFreeSajuEntry" data-cd-service-id="saju"', image: '/images/home/illustrated/method-saju-160.webp', key: 'freeSaju', title: '무료 사주', note: 'freeSajuNote', noteKo: '생년월일로 바로 보기' },
  { attrs: 'href="/today/"', image: '/images/today/yeoni-daily-tea-320.webp', key: 'freeToday', title: '오늘의 운세', note: 'freeTodayNote', noteKo: '매일 새로 열리는 하루 운' },
  { attrs: 'href="/?action=cdHomeTarotEntry" data-action="cdHomeTarotEntry" data-cd-service-id="tarot"', image: '/images/home/illustrated/method-tarot-160.webp', key: 'freeTarot', title: '타로', note: 'freeTarotNote', noteKo: '카드 한 장으로 가볍게' },
];
vars.quick = `<section id="cdQuickServices" class="cdh-free__grid" aria-labelledby="cdhFreeTitle" data-cd-funnel-section="quick_services" data-marker="cd-quick-services-free-v20261017">${FREE_CARDS.map(card => `<a class="cdh-free-card" ${card.attrs}><img src="${card.image}" width="160" height="160" alt="" loading="lazy" decoding="async"><span class="cdh-free-card__copy"><strong data-cd-trans="home.simpleHome.${card.key}">${card.title}</strong><small data-cd-trans="home.simpleHome.${card.note}">${card.noteKo}</small></span></a>`).join('')}</section>`;
const signatureProducts = [
  {
    id: 'neo-operation-room',
    className: 'neo',
    href: '/neo-operation-room/',
    title: '네오의 팩폭 전략실',
    question: '고민은 충분히 했다. 이제 무엇부터 바꿀까?',
    image: '/images/feature-details/neo-operation-room-hero-v1.webp',
    imageAlt: '달빛 전략실에서 선택의 판세를 정리하는 네오',
    featureKey: 'neo-operation-room-consultation',
    master: { caption: '마스터', names: '네오', avatars: ['neo'] },
    cta: '전략실 입장하기',
  },
  {
    id: 'fortune-tea-house',
    className: 'tea',
    href: '/fortune-tea-house/',
    title: '연이의 운명 찻집',
    question: '재회부터 사업까지, 어떤 선택이 고민인가요?',
    image: '/images/home/yeoni-tea-together-v1-1200.webp',
    imageAlt: '한복 입은 연이와 꽃돼지가 함께 차를 건네는 운명의 찻집',
    featureKey: 'fortune-tea-house-tarot-consultation',
    master: { caption: '마스터', names: '연이', avatars: ['yeoni'] },
    cta: '운명 찻집 들어가기',
  },
  {
    id: 'master-love-codex',
    className: 'master',
    href: '/master-love-codex/',
    title: '마스터 인연의 서',
    question: '내 다음 연애는 언제 시작될까?',
    image: '/images/feature-details/master-love-codex-hero-v3.webp',
    imageAlt: '달빛 아래 인연의 지도를 펼쳐 보는 마스터 인연의 서',
    featureKey: 'master-love-codex',
    master: { caption: '인연의 서', names: '마스터', avatars: ['master'] },
    priceSuffix: '~',
    cta: '인연의 서 펼치기',
  },
  {
    id: 'love-secret-ai',
    className: 'love',
    href: '/love-secret-ai/',
    title: '연애 비책',
    question: '마음부터 들려주세요. 두 분 사이의 거리는 서한비가 재어 드릴게요.',
    image: '/images/home/love-secret-masters-v1-1200.webp',
    imageSrcset: '/images/home/love-secret-masters-v1-600.webp 600w, /images/home/love-secret-masters-v1-1200.webp 1200w',
    imageAlt: '달빛 찻집에서 찻잔을 든 연이와 관계 장부를 곁에 둔 서한비',
    featureKey: 'love-secret-ai-consultation',
    master: { caption: '공동 마스터', names: '연이 · 서한비', avatars: ['yeoni-love', 'hanbi-love'] },
    cta: '연애 비책 시작하기',
  },
  {
    id: 'new-year-ai',
    className: 'year',
    href: '/new-year-ai-consultation/',
    title: '신년운세',
    question: '올해 판세는 내가 먼저 읽는다. 어디서 밀고, 언제 멈출까?',
    image: '/images/home/new-year-neo-v1-1200.webp',
    imageSrcset: '/images/home/new-year-neo-v1-600.webp 600w, /images/home/new-year-neo-v1-1200.webp 1200w',
    imageAlt: '새해 첫 해가 드는 작전실에서 열두 달 작전판을 짚는 네오와 백사자',
    featureKey: 'new-year-ai-consultation',
    master: { caption: '마스터', names: '네오', avatars: ['neo-new-year'] },
    cta: '신년운세 받기',
  },
  {
    id: 'life-book-ai',
    className: 'life',
    href: '/life-book-ai/',
    title: '인생의 책',
    question: '당신의 인생, 첫 장부터 읽어 드릴게요.',
    image: '/images/home/life-book-yun-v2-1200.webp',
    imageSrcset: '/images/home/life-book-yun-v2-600.webp 600w, /images/home/life-book-yun-v2-1200.webp 1200w',
    imageAlt: '달빛 서고에서 빛이 오르는 녹색 인생의 책을 펼친 윤달과 흰 고양이',
    featureKey: 'life-book-ai-consultation',
    master: { caption: '마스터', names: '윤달', avatars: ['yun-life-book'] },
    cta: '인생의 책 펼치기',
  },
];
const signaturePrice = (featureKey, suffix = '') => {
  const amount = FEATURE_KEY_PRICE_TABLE[featureKey]?.amountKRW;
  if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error(`Missing signature consultation price: ${featureKey}`);
  return `${amount.toLocaleString('ko-KR')}원${suffix}`;
};
// 마스터 칩 — 아바타는 build-master-avatars.mjs 가 만든 128px 한 장. 이름이 옆에 있으니 이미지는 장식(alt="").
const signatureMaster = ({ caption, names, avatars }) => `<span class="cd-sig-card__masters"><span class="cd-sig-card__avatars" aria-hidden="true">${avatars.map((key) => `<img src="/images/master-profiles/avatars/${key}.webp" width="48" height="48" alt="" loading="lazy" decoding="async">`).join('')}</span><span class="cd-sig-card__master">${caption} <b>${names}</b></span></span>`;
// 타로 덱 — 카드 한 장이 상담 하나. 숫자는 장식(aria-hidden)이고, 카드 이름은 제목이 말한다.
// 카드에는 고르는 데 필요한 것만 둔다: 마스터·제목·대표 질문·가격·CTA. 리포트 구성은 각 상담 상세가 보여 준다.
const TAROT_NUMERALS = ['Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ', 'Ⅴ', 'Ⅵ'];
vars.signature = `<section data-cd-funnel-section="signature_consult" class="cd-sig cd-sig--curated cd-sig--deck" id="cdSignatureConsult" data-marker="cd-signature-consult-v20261016" aria-labelledby="cdSignatureTitle" lang="ko">
  <div class="cd-sig__head"><h2 class="cd-sig__title" id="cdSignatureTitle">대표 상담 여섯 장</h2><p class="cd-sig__sub">카드 한 장이 상담 하나예요. 지금 필요한 한 장을 골라보세요.</p></div>
  <div class="cd-sig__viewport" id="cdSigViewport"><div class="cd-sig__grid" id="cdSigGrid">${signatureProducts.map((product, index) => `<a class="cd-sig-card cd-sig-card--${product.className}" data-cd-service-id="${product.id}" href="${product.href}" aria-label="${product.title} — ${product.cta}" data-pvw-paid="true"><span class="cd-yehwa-seal" aria-hidden="true"></span><span class="cd-sig-card__top"><span class="cd-sig-card__numeral" aria-hidden="true">${TAROT_NUMERALS[index]}</span></span><span class="cd-sig-card__media"><img class="cd-sig-card__img" width="1200" height="675" loading="lazy" decoding="async" src="${product.image}"${product.imageSrcset ? ` srcset="${product.imageSrcset}"` : ''} sizes="(max-width: 1023px) min(72vw, 280px), 360px" alt="${product.imageAlt}"></span><span class="cd-sig-card__body">${signatureMaster(product.master)}<span class="cd-sig-card__title">${product.title}</span><span class="cd-sig-card__q">${product.question}</span><span class="cd-sig-card__price">${signaturePrice(product.featureKey, product.priceSuffix)}</span><span class="cd-sig-card__cta"><span>${product.cta}</span> <i aria-hidden="true">→</i></span></span></a>`).join('')}</div></div>
  <p class="cd-sig__dots" aria-hidden="true">${signatureProducts.map((product, index) => `<span class="cd-sig__dot" data-cd-sig-dot="${index}"></span>`).join('')}</p>
  <a class="cd-sig__samples-link" href="/consultation-samples/"><span>결과 예시 먼저 보기</span><span class="cd-yehwa-spray cd-sig__samples-motif" aria-hidden="true"></span></a>
</section>`;

const won = value => Number(value).toLocaleString('ko-KR') + '원';
vars.pass = `<section class="cdh-pass" aria-labelledby="cdhPassTitle" data-design-marker="moonlight-pass-banner-v20260626">
  <div class="cdh-pass__intro">
    <img class="cdh-pass__mascot" src="/images/home/yeoni-pass-mascot-240.webp" srcset="/images/home/yeoni-pass-mascot-240.webp 240w, /images/home/yeoni-pass-mascot-480.webp 480w" sizes="(max-width: 640px) 104px, 168px" alt="이용권 카드를 들고 웃는 꽃돼지 연이" data-cd-trans-attr="alt:home.gardenCopy.passMascotAlt" width="240" height="240" loading="lazy" decoding="async">
    <div class="cdh-pass__copy">
      <span class="cdh-pass__eyebrow" data-cd-trans="home.gardenCopy.passEyebrow">기간·자동갱신 없는 이용권</span>
      <h2 class="cdh-pass__title" id="cdhPassTitle" data-cd-trans="home.gardenCopy.passTitle">연이가 알려드리는 이용권</h2>
      <p class="cdh-pass__desc" data-cd-trans="home.gardenCopy.passDesc">가끔은 단건 결제로, 자주 본다면 이용권으로 이용해요. 사용할 수 있는 상담과 이용 한도를 확인해 주세요.</p>
    </div>
  </div>
  <ul class="cdh-pass__tiers" role="list">${Object.values(CURRENT_PASS_PLANS).map(plan => `
    <li class="cdh-pass__tier${plan.tier === 'family' ? ' cdh-pass__tier--family' : ''}"><a class="cdh-pass__tier-link" href="/points/?source=flower-membership&amp;plan=${plan.tier}">
      ${plan.tier === 'family' ? '<span class="cdh-pass__badge" data-cd-trans="home.gardenCopy.passBadge">영냥이까지</span>' : ''}<span class="cdh-pass__tier-name">${plan.name}</span>
      <strong class="cdh-pass__tier-price"><span data-cd-trans="home.overseasCopy.krwAmount" data-cd-vars='{"amount":"${Number(plan.wonPrice).toLocaleString('en-US')}"}'>${won(plan.wonPrice)}</span> <small data-cd-trans="home.gardenCopy.passPer">· 기간 제한 없음</small></strong>
      <span class="cdh-pass__tier-line" data-cd-trans="home.overseasCopy.${plan.tier === 'family' ? 'passNoLimit' : 'passPerLimit'}" data-cd-vars='{"amount":"${Number(plan.maxCoveredCoin * 100).toLocaleString('en-US')}"}'>${plan.tier === 'family' ? '유료 리딩 건당 한도 없음' : `건당 ${won(plan.maxCoveredCoin * 100)} 이하`}</span>
      <span class="cdh-pass__tier-line" data-cd-trans="home.overseasCopy.passTotal" data-cd-vars='{"amount":"${Number(plan.monthlyLimitCoin * 100).toLocaleString('en-US')}"}'>누적 ${won(plan.monthlyLimitCoin * 100)}까지</span>
    </a></li>`).join('')}
  </ul>
  <p class="cdh-pass__note" data-cd-trans="home.gardenCopy.passNote">작은·중간·큰 꿀단지는 꿀꿀 운세에, 패밀리 꿀단지는 꿀꿀 운세와 영냥이 유료 리딩에 적용됩니다. 기존에 구매한 이용권은 구매 당시 조건을 유지합니다.</p>
  <details class="cdh-pass__packs"><summary class="cdh-pass__group" data-cd-trans="home.passCopy.packTitle">영냥이 전용 이용권</summary>
  <ul class="cdh-pass__tiers cdh-pass__tiers--packs" role="list">${listServicePackPlans().map(plan => {
    const fishKey = '@home.passCopy.fish' + plan.fishId[0].toUpperCase() + plan.fishId.slice(1);
    const fishKo = plan.label.split(' ')[0];
    return `
    <li class="cdh-pass__tier cdh-pass__tier--pack" data-pack-plan="${plan.planId}"><a class="cdh-pass__tier-link" href="/points/#fish-packs">
      <span class="cdh-pass__tier-name" data-cd-trans="home.passCopy.packName" data-cd-vars='{"fish":"${fishKey}","total":"${plan.totalUses}"}'>${plan.label}</span>
      <strong class="cdh-pass__tier-price"><span data-cd-trans="home.overseasCopy.krwAmount" data-cd-vars='{"amount":"${Number(plan.priceKRW).toLocaleString('en-US')}"}'>${won(plan.priceKRW)}</span></strong>
      <span class="cdh-pass__tier-line" data-cd-trans="home.passCopy.packPerUse" data-cd-vars='{"amount":"${Number(plan.unitPriceKRW).toLocaleString('en-US')}"}'>회당 ${won(plan.unitPriceKRW)} 상담</span>
      <span class="cdh-pass__tier-line" data-cd-trans="home.passCopy.packScope" data-cd-vars='{"fish":"${fishKey}","days":"${plan.validityDays}","total":"${plan.totalUses}"}'>${fishKo} 상담 전용 · ${plan.validityDays}일 · 총 ${plan.totalUses}회</span>
    </a></li>`;
  }).join('')}
  </ul>
  <p class="cdh-pass__note" data-cd-trans="home.passCopy.packNote">영냥이 세트는 같은 생선 상담에만 1회씩 사용돼요. 꽃돼지 이용권과 따로 적용돼요.</p></details>
  <a class="cdh-pass__btn" href="/points/?source=flower-membership" data-cd-trans="home.gardenCopy.passCta">나에게 맞는 이용권 확인하기</a>
</section>`;
const template = readFileSync('templates/home-funnel.html', 'utf8');
let homeHtml = template.replace(/\{\{(\w+)\}\}/g, (_token, key) => {
  if (!(key in vars)) throw new Error(`Unknown home funnel template token: ${key}`);
  return vars[key];
});

// Mark authored text-only home labels; preserve nested markup and original quotations.
const overseasLabels = JSON.parse(readFileSync('i18n/authored/homeOverseas-01.json', 'utf8'));
const labelKeys = new Map(Object.entries(overseasLabels).filter(([, value]) => !value.ko.includes('{')).map(([key, value]) => [value.ko, key]));
homeHtml = homeHtml.replace(/(<[a-z][^>]*>)([^<>]+)(<\/[a-z][a-z0-9]*>)/g, (whole, open, text, close) => {
  if (/^\d[\d,]*원$/.test(text) && !/\sdata-cd-trans(?=[\s=>])/.test(open)) {
    return open.slice(0, -1) + ' data-cd-trans="home.overseasCopy.krwAmount" data-cd-vars=\"' + JSON.stringify({amount:text.slice(0,-1)}).replaceAll('\"', '&quot;') + '\">' + text + close;
  }
  const key = labelKeys.get(text);
  return !key || /\sdata-cd-trans(?=[\s=>])/.test(open) ? whole : open.slice(0, -1) + ' data-cd-trans="' + key + '">' + text + close;
});

let cleaned = original;

const marker = /<!-- cd-home-funnel:start[\s\S]*?<!-- cd-home-funnel:end -->/;
let updated;
if (marker.test(cleaned)) {
  updated = cleaned.replace(marker, homeHtml.trimEnd());
} else {
  updated = cleaned.replace('    <header class="logo-area" role="banner">', homeHtml + '\n    <header class="logo-area" role="banner">');
}

// Result samples now live on their own application pages. Do not load their stylesheet on the home shell.
updated = updated.replace(/\s*<link rel="stylesheet" href="\/styles\/result-samples\.css(?:\?v=[^"]*)?">/g, '');

if (process.argv.includes('--check')) {
  if (original !== updated) throw new Error('Home funnel needs regeneration');
  console.log('[home-funnel] current');
} else {
  writeFileSync('index.html', updated);
  console.log('[home-funnel] assembled from existing sections; no runtime DOM reflow');
}
