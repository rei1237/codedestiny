import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { CURRENT_PASS_PLANS, CURRENT_PASS_POLICY_VERSION } from '../../lib/payment/pass-policy.js';
import { listServicePackPlans } from '../../worker/payments/service-pack-policy.js';
import { FEATURE_KEY_PRICE_TABLE, UNLOCK_PRODUCT_BY_FEATURE_KEY } from '../../worker/lib/paid-feature-registry.js';
import { renderNeoEmailHomeEntry } from '../../lib/brand/neo-email-home-entry.mjs';
import { CONSULTATION_MASTERS } from '../../lib/marketing/consultation-discovery.mjs';
import { renderConsultationMethodGuide } from '../../lib/brand/consultation-methods.mjs';

const original = readFileSync('index.html', 'utf8');
const vars = {};
vars.consultationMethods = renderConsultationMethodGuide('ggul-consultation-methods');

// 가벼운 체험만 선별한다. 유료 표시는 서버 상품 정본에서 생성한다.
const LIGHT_FORTUNES = [
  { name: '포춘 피쉬', href: '/fortune-teller-fish.html', image: '/images/mini-games/fortune-fish-320.webp', desc: '작은 금붕어의 몸짓으로 오늘의 기분 읽기' },
  { name: '오미쿠지', href: '/emoi_omikuji_v2.html', image: '/images/mini-games/omikuji-320.webp', desc: '제비통에서 꺼내 보는 오늘의 한 장' },
  { name: '심리테스트', href: '/psychotest/', image: '/images/mini-games/psychotest-320.webp', desc: '나는 어떤 타입일까? 친구와 성향 비교하기' },
  { name: '영국 홍차점', href: '/oracle/royal-tea/', image: '/images/service-introductions/royal-tea-oracle-320.webp', desc: '찻잎이 남긴 모양에서 찾는 오늘의 힌트', key: 'royal-tea-oracle' },
  { name: '운명의 꽃', href: '/flower/', image: '/images/service-introductions/destiny-flower-320.webp', desc: '나의 기질을 닮은 꽃과 색을 카드에 담기', key: 'flower-fc' },
  { name: '최애운명', href: '/saju/destiny-bias/', image: '/images/service-introductions/bias-destiny-320.webp', desc: '최애와 나의 케미를 포토카드로 만나기', key: 'destiny-bias-analyze' },
];
vars.lightFortunes = LIGHT_FORTUNES.map(item => {
  const product = item.key && (FEATURE_KEY_PRICE_TABLE[item.key] || UNLOCK_PRODUCT_BY_FEATURE_KEY[item.key]);
  if (item.key && (!Number.isSafeInteger(product?.amountKRW) || product.amountKRW <= 0)) throw new Error('Missing light fortune price: ' + item.key);
  const price = product ? (product.accessModel === 'unlock' ? '해금 ' : '1회 ') + product.amountKRW.toLocaleString('ko-KR') + '원' : '무료';
  return '<a class="cdh-light__item" href="' + item.href + '"><img src="' + item.image + '" width="160" height="100" loading="lazy" decoding="async" alt=""><span class="cdh-light__copy"><strong>' + item.name + '</strong><span>' + item.desc + '</span><small' + (item.key ? ' data-cd-play-price data-cd-play-feature="' + item.key + '" data-cd-play-kind="' + (product.accessModel === 'unlock' ? 'unlock' : 'perUse') + '" data-cd-price-key="' + item.key + '" data-price-krw="' + product.amountKRW + '"' : ' data-cd-price-free="true"') + '>' + price + '</small></span></a>';
}).join('');

const introductionArt = JSON.parse(readFileSync('lib/marketing/service-introduction-art.json', 'utf8'));

// 2026-10-17 "직관성": 홈은 대표 상담 덱·무료 여섯 체계·1:1 상담·이용권·뮤직비디오를 조립한다. 예전 홈 섹션(고민 칩·탐색기·오늘 허브 등)은
// 모두 생성 영역 안에만 있었으므로 영역을 갈아끼우면 함께 빠진다 — 기능 페이지와 URL 은 그대로다.
// 무료로 먼저 — 여섯 체계. 모두 레지스트리의 '무료 시작' 항목이고 액션도 레지스트리에서 읽는다(오늘의 운세는 전체 운세 시트에 남긴다).
const registryWindow = {};
runInNewContext(readFileSync('js/core/service-registry.js', 'utf8'), { window: registryWindow });
const FREE_CARDS = [
  { id: 'saju', key: 'freeSaju', title: '무료 사주', noteKo: '생년월일로 바로 보기', attrs: 'data-cdh-free ' },
  { id: 'tarot', key: 'freeTarot', title: '타로', noteKo: '카드 한 장으로 가볍게' },
  { id: 'ziwei', key: 'freeZiwei', title: '자미두수', noteKo: '12궁 명반 보기' },
  { id: 'sukuyo', key: 'freeSukuyo', title: '숙요점', noteKo: '나의 본명숙 찾기' },
  { id: 'vedic', key: 'freeVedic', title: '베다점', noteKo: '라그나·나크샤트라 보기' },
  { id: 'astrology', key: 'freeAstro', title: '점성술', noteKo: '출생차트 행성 배치' },
].map(card => {
  const service = registryWindow.__cdServiceRegistry.find(item => item.id === card.id);
  if (service?.price !== '무료 시작' || !service.action) throw new Error('Free home card must retain its catalog free entry: ' + card.id);
  return { attrs: '', ...card, action: service.action };
});
vars.quick = `<section id="cdQuickServices" class="cdh-free__grid" aria-labelledby="cdhFreeTitle" data-cd-funnel-section="quick_services" data-marker="cd-quick-services-free-v20261017b">${FREE_CARDS.map(card => `<a class="cdh-free-card" ${card.attrs}href="/?action=${card.action}" data-action="${card.action}" data-cd-service-id="${card.id}"><span class="cdh-free-card__medal" aria-hidden="true"><img src="/images/service-introductions/${card.id}-320.webp" width="160" height="160" alt="" loading="lazy" decoding="async"></span><span class="cdh-free-card__copy"><strong data-cd-trans="home.simpleHome.${card.key}">${card.title}</strong><small data-cd-trans="home.simpleHome.${card.key}Note">${card.noteKo}</small></span><span class="cdh-free-card__seal" data-cd-trans="home.simpleHome.freeBadge">무료</span></a>`).join('')}</section>`;

// 1:1 상담 — 연이 대화 상담(1회 5,000원)과 네오 이메일 상담. e76391603 에서 홈에서 빠졌던 두 입구를 다시 둔다.
const chatPrice = Number(FEATURE_KEY_PRICE_TABLE['fortune-chat-consultation']?.amountKRW);
if (chatPrice !== 5000) throw new Error('Yeoni chat home door copy says 1회 5,000원; registry amount changed: ' + chatPrice);
vars.neoEmailConsultation = renderNeoEmailHomeEntry();
// 영냥이 메인 배너(2026-10-18 복구) — 생선 등급 가격은 registry 값을 그대로 쓴다.
for (const fish of ['mackerel', 'salmon', 'flounder', 'tuna']) {
  const featureKey = `yeongnyangi-saju-${fish}`;
  const price = FEATURE_KEY_PRICE_TABLE[featureKey]?.amountKRW;
  if (!Number.isSafeInteger(price) || price <= 0) throw new Error(`Missing Yeongnyangi home price: ${featureKey}`);
  vars[`yeongnyangi${fish[0].toUpperCase()}${fish.slice(1)}Price`] = price.toLocaleString('ko-KR');
}

// 초융합의 기존 소개·구성은 유지하고, 전문가 초상만 개별 상담 입구로 연결한다.
// 마스터 배정은 components/fortune/master-profiles.ts productMasters.fusion(결과 화면 화자)과 같다.
const fusionPrice = Number(FEATURE_KEY_PRICE_TABLE['fusion-fortune-consultation']?.amountKRW);
if (fusionPrice !== 50000) throw new Error('Fusion signature band copy says 50,000원; registry amount changed: ' + fusionPrice);
const won = value => Number(value).toLocaleString('ko-KR') + '원';
const FUSION_MASTERS = [
  { id: 'neo', role: '사주 · 재물 · 일' },
  { id: 'yeoni', role: '타로 · 연애' },
  { id: 'hanbi', role: '숙요 · 결혼 · 관계' },
  { id: 'yun', role: '점성술 · 시기 · 건강' },
  { id: 'musung', role: '자미두수 · 성향' },
].map(({ id, role }) => ({ ...CONSULTATION_MASTERS.find(master => master.id === id), role }));
const FUSION_SYSTEMS = ['사주', '자미두수', '숙요', '베다', '점성술', '타로'];
const FUSION_AREAS = ['타고난 성향', '인생의 시기', '연애', '결혼', '재물', '직업', '건강', '인간관계'];
vars.fusionSignature = `<section class="cdh-fusion-sig" id="cdhFusionSignature" data-cd-funnel-section="fusion_signature" data-marker="cdh-fusion-signature-v20261017" aria-labelledby="cdhFusionSigTitle" lang="ko">
  <a class="cdh-fusion-sig__art" href="/fusion-fortune/?from=home_signature" tabindex="-1" aria-hidden="true" data-cd-service-id="fusion-fortune"><img src="/images/service-introductions/fusion-fortune-masters-v3-960.webp" srcset="/images/service-introductions/fusion-fortune-masters-v3-640.webp 640w, /images/service-introductions/fusion-fortune-masters-v3-960.webp 960w" sizes="(max-width: 860px) calc(100vw - 32px), 640px" width="1200" height="800" loading="lazy" decoding="async" alt=""></a>
  <div class="cdh-fusion-sig__body">
    <p class="cdh-fusion-sig__eyebrow">여섯 체계 종합 상담</p>
    <h2 class="cdh-fusion-sig__title" id="cdhFusionSigTitle">초융합 운세</h2>
    <p class="cdh-fusion-sig__lead">다섯 마스터가 여섯 체계로 교차해 읽는 한 권. 타고난 성향부터 시기·연애·결혼·재물까지 영역별로 짚어 드려요.</p>
    <ul class="cdh-fusion-sig__masters" role="list">${FUSION_MASTERS.map(master => `<li><a href="${master.href}" aria-label="${master.name}에게 물어보기 · ${master.text}" title="${master.name}에게 물어보기" data-cd-question="${master.id}"><img src="${master.image}" width="44" height="44" alt="" loading="lazy" decoding="async"></a><span><b>${master.name}</b><small>${master.role}</small></span></li>`).join('')}</ul>
    <div class="cdh-fusion-sig__chips"><p><span class="cdh-fusion-sig__chip-label">여섯 체계</span>${FUSION_SYSTEMS.map(name => `<span class="cdh-fusion-sig__chip">${name}</span>`).join('')}</p><p><span class="cdh-fusion-sig__chip-label">영역별 8장</span>${FUSION_AREAS.map(name => `<span class="cdh-fusion-sig__chip cdh-fusion-sig__chip--area">${name}</span>`).join('')}</p></div>
    <a class="cdh-fusion-sig__cta" href="/fusion-fortune/?from=home_signature" data-cd-service-id="fusion-fortune" data-pvw-paid="true"><span>초융합 운세 받기</span><b>${won(fusionPrice)}</b><i aria-hidden="true">→</i></a>
  </div>
</section>`;
// 다른 재밌는 운세 — 질문 카테고리(2026-10-17 복구). e76391603 에서 빠진 #cdConcernPick 을 데이터로 다시 그린다.
// DOM 계약(카드·패널·질문 링크 속성)과 home.concernPick.* i18n 키는 예전 그대로 — index.html 의 토글 스크립트·계측(analytics.js)을 재사용한다.
// 카테고리마다 핵심 질문 셋, 보조 링크는 무료인 것만 남긴다. price 는 i18n 가격 키(w5000 / from5000 / free)이고 레지스트리 금액과 대조한다.
const QUESTION_MASTER = {
  yeoni: '/images/master-profiles/avatars/yeoni.webp', neo: '/images/master-profiles/avatars/neo.webp', yun: '/images/master-profiles/avatars/yun.webp',
  hanbi: '/images/master-profiles/avatars/hanbi.webp', musung: '/images/master-profiles/avatars/musung.webp', master: '/images/master-profiles/avatars/master.webp',
  yeongnyangi: '/assets/yeongnyangi/original/avatar.webp',
};
const QUESTION_CATEGORIES = [
  { id: 'love', label: '사랑', chip: '그 사람의 마음 · 내 다음 연애', img: '/images/home-questions/love', questions: [
    { id: 'loveMind', href: '/tarot/mindscan/', key: 'tarot-mindscan', master: 'yeoni', t: '그 사람의 말과 행동, 왜 다를까?', b: '말과 행동 사이 타로', price: 'w5000' },
    { id: 'loveStatus', href: '/tarot/love/', key: 'tarot-love-relationship', master: 'yeoni', t: '우리는 지금 어떤 사이일까?', b: '타로 · 우리는 무슨 사이?', price: 'w5000' },
    { id: 'loveNext', href: '/master-love-codex/', key: 'master-love-codex', master: 'master', t: '내 다음 연애는 언제 시작될까?', b: '사주 · 마스터 인연의 서', price: 'from30000' },
  ] },
  { id: 'reunion', label: '재회', chip: '다시 만날 가능성', img: '/images/home-questions/reunion', questions: [
    { id: 'reunionAgain', href: '/tarot/reunion/', key: 'tarot-reunion-reading', master: 'yeoni', t: '우리, 다시 만날 수 있을까?', b: '재회운 타로', price: 'w5000' },
    { id: 'reunionContact', href: '/yeongnyangi/?question=reconnect#questions', key: 'yeongnyangi-tarot-mackerel', master: 'yeongnyangi', t: '다시 연락해도 될까, 기다려야 할까?', b: '영냥이 · 타로', price: 'from5000' },
    { id: 'reunionClosure', href: '/fortune-tea-house/', key: 'fortune-tea-house-tarot-consultation', master: 'yeoni', t: '이 마음, 어떻게 정리하면 좋을까?', b: '타로·사주 · 운명의 찻집', price: 'from5000' },
  ] },
  { id: 'marriage', label: '결혼', chip: '결혼할 사람', img: '/images/home-questions/marriage', questions: [
    { id: 'marriagePartner', href: '/yeongnyangi/?question=partner#questions', key: 'yeongnyangi-saju-mackerel', master: 'yeongnyangi', t: '나는 어떤 사람과 결혼하게 될까?', b: '영냥이 · 사주', price: 'from5000' },
    { id: 'marriageDate', href: '/nakshatra/muhurta/', key: 'nakshatra-muhurta', master: 'yun', t: '이 일, 언제 하면 좋을까?', b: '인도 점성술 · 택일 무후르타', price: 'w7000' },
  ] },
  { id: 'money', label: '돈', chip: '돈이 풀리는 때', img: '/assets/yeongnyangi/scenes/wealth', questions: [
    { id: 'moneyWhen', href: '/yeongnyangi/?question=money#questions', key: 'yeongnyangi-saju-salmon', master: 'yeongnyangi', t: '내 돈은 언제부터 풀릴까?', b: '영냥이 · 사주', price: 'from10000' },
    { id: 'moneyWay', href: '/ziwei/chart/', master: 'musung', t: '나에게 맞는 돈 버는 방식은 뭘까?', b: '자미두수 명반', price: 'free' },
    { id: 'moneyMonth', href: '/tarot/year/', key: 'tarot-year-fortune', master: 'yeoni', t: '돈이 모이는 달을 미리 알 수 있을까?', b: '타로 · 십이지신 천운 타로', price: 'w10000' },
  ] },
  { id: 'career', label: '일', chip: '이직해도 될까', img: '/assets/yeongnyangi/scenes/work', questions: [
    { id: 'careerMove', href: '/tarot-ijik.html', key: 'tarot-ijik', master: 'yeoni', t: '지금 이직해도 괜찮을까?', b: '타로 · 이직 운명의 카드', price: 'w5000' },
    { id: 'careerFit', href: '/yeongnyangi/?question=career-astrology#questions', key: 'yeongnyangi-astrology-salmon', master: 'yeongnyangi', t: '나에게 맞는 일은 따로 있을까?', b: '영냥이 · 점성술', price: 'from10000' },
    { id: 'careerTurn', href: '/destiny-compass/', key: 'destiny-compass-life-voyage', master: 'neo', t: '지금 방향을 바꿔도 될까?', b: '4체계 · 운명의 나침반', price: 'w7000' },
  ] },
  { id: 'future', label: '미래', chip: '내 인생의 황금기 · 올해 가장 중요한 일', img: '/assets/yeongnyangi/scenes/journey', questions: [
    { id: 'futurePrime', href: '/life-book-ai/', key: 'life-book-ai-consultation', master: 'yun', t: '내 인생의 황금기는 언제일까?', b: '사주 대운 · 인생의 책', price: 'w30000' },
    { id: 'futureYear', href: '/new-year-ai-consultation/', key: 'new-year-ai-consultation', master: 'neo', t: '올해 나에게 가장 중요한 일은 뭘까?', b: '사주 · 신년운세', price: 'w30000' },
    { id: 'futureCross', href: '/fusion-fortune/?from=home_question', key: 'fusion-fortune-consultation', master: 'musung', fusion: true, t: '운세마다 말이 다를 때, 무엇을 따를까?', b: '6체계 교차 · 초융합 심층 리딩', price: 'w50000' },
  ] },
  { id: 'self', label: '나 자신', chip: '나는 왜 같은 선택을 반복할까?', img: '/assets/yeongnyangi/scenes/self', questions: [
    { id: 'selfRepeat', href: '/yeongnyangi/readings/saju/', key: 'yeongnyangi-saju-mackerel', master: 'yeongnyangi', t: '나는 왜 같은 선택을 반복할까?', b: '영냥이 · 사주', price: 'from5000' },
    { id: 'selfStrength', href: '/saju/animal-destiny/', key: 'animal-destiny-unlock', master: 'neo', t: '남들이 모르는 내 강점은 뭘까?', b: '사주 · 십이운성 동물점', price: 'w7000', alt: { href: '/human-design/', name: '휴먼 디자인' } },
    { id: 'selfGrain', href: '/?action=cdOneStepFreeSajuEntry', master: 'neo', t: '나는 어떤 결의 사람일까?', b: '사주팔자', price: 'free' },
  ] },
  { id: 'people', label: '인간관계', chip: '가까워질수록 왜 지칠까?', img: '/images/home-questions/people', questions: [
    { id: 'peopleTired', href: '/yeongnyangi/readings/sukuyo/', key: 'yeongnyangi-sukuyo-mackerel', master: 'yeongnyangi', t: '가까워질수록 왜 지칠까?', b: '영냥이 · 숙요', price: 'from5000', alt: { href: '/index.html?action=openSukuyoModal', name: '숙요점' } },
    { id: 'peopleMatch', href: '/nakshatra/compat/', key: 'nakshatra-compat', master: 'hanbi', t: '그 사람과 나, 어떤 궁합일까?', b: '인도 점성술·숙요 · 동서 통합 궁합', price: 'w20000' },
    { id: 'peopleDistance', href: '/fortune-chat/', key: 'fortune-chat-consultation', master: 'yeoni', t: '이 관계, 거리를 둬야 할까?', b: '대화형 운명 상담', price: 'w5000' },
  ] },
];
const questionPriceLabel = price => {
  if (price === 'free') return '무료';
  const [, from, amount] = price.match(/^(w|from)(\d+)$/);
  return won(amount) + (from === 'from' ? '부터' : '');
};
for (const question of QUESTION_CATEGORIES.flatMap(category => category.questions)) {
  if (!QUESTION_MASTER[question.master]) throw new Error('Unknown question master: ' + question.id);
  if (question.price === 'free') { if (question.key) throw new Error('Free home question must not carry a paid feature key: ' + question.id); continue; }
  const amount = Number(FEATURE_KEY_PRICE_TABLE[question.key]?.amountKRW);
  if (amount !== Number(question.price.replace(/\D/g, ''))) throw new Error(`Home question ${question.id} says ${question.price}; registry amount for ${question.key} is ${amount}`);
}
const capitalize = value => value[0].toUpperCase() + value.slice(1);
const questionLink = question => `<li class="cd-concern__q"><a class="cd-concern__q-link${question.fusion ? ' cd-concern__q-link--fusion' : ''}" href="${question.href}" data-cd-question="${question.id}"${question.price.startsWith('from') ? ' data-price-from="true"' : ''}${question.key ? ` data-cd-price-key="${question.key}"` : ' data-cd-price-free'}><img class="cd-concern__q-master" src="${QUESTION_MASTER[question.master]}" width="28" height="28" alt="" loading="lazy" decoding="async"><span class="cd-concern__q-text"><strong class="cd-concern__q-title" data-cd-trans="home.concernPick.q.${question.id}.t">${question.t}</strong><span class="cd-concern__q-badge" data-cd-trans="home.concernPick.q.${question.id}.b">${question.b}</span></span><span class="cd-concern__q-price"${question.key ? ` data-cd-play-price data-cd-play-feature="${question.key}"${question.price.startsWith('from') ? ' data-cd-play-kind="from"' : ''}` : ''} data-cd-trans="home.concernPick.price.${question.price}">${questionPriceLabel(question.price)}</span><span class="cd-concern__q-go" aria-hidden="true">→</span></a>${question.alt ? `<a class="cd-concern__q-alt" href="${question.alt.href}" data-cd-question="${question.id}" data-cd-question-alt data-cd-price-free><span data-cd-trans="home.concernPick.altLabel">다른 방식으로</span> <span class="cd-concern__q-alt-name" data-cd-trans="home.concernPick.q.${question.id}.alt">${question.alt.name}</span> <span class="cd-concern__q-price" data-cd-trans="home.concernPick.price.free">무료</span></a>` : ''}</li>`;
vars.questionCategories = `<section class="cdh-other" id="cdhOtherFortunes" aria-labelledby="cdhOtherFortunesTitle" data-marker="cdh-other-fortunes-v20261017">
  <section data-cd-funnel-section="concern_pick" class="cd-concern cdh-qcat" id="cdConcernPick" aria-labelledby="cdhOtherFortunesTitle" data-marker="cd-concern-pick-v20260824">
    <header class="cdh-qcat__head">
      <h2 class="cdh-qcat__title" id="cdhOtherFortunesTitle" data-cd-trans="home.simpleHome.otherTitle">다른 재밌는 운세</h2>
      <p class="cdh-qcat__voice"><img src="/images/master-profiles/avatars/yeoni.webp" width="40" height="40" alt="" loading="lazy" decoding="async"><span><b>연이</b><span data-cd-trans="home.concernPick.title">지금 가장 궁금한 건 무엇인가요?</span></span></p>
    </header>
    <div class="cdh-concern-scroll" data-concern-scroll hidden><span>옆으로 넘겨 골라보세요</span><div><button type="button" data-concern-prev aria-label="이전 고민 보기"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m14 6-6 6 6 6"/></svg></button><button type="button" data-concern-next aria-label="다음 고민 보기"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m10 6 6 6-6 6"/></svg></button></div></div>
    <div class="cd-concern__cards" role="group" aria-labelledby="cdhOtherFortunesTitle">${QUESTION_CATEGORIES.map((category, index) => `<button type="button" class="cd-concern__card" data-cd-concern="${category.id}" aria-expanded="${index === 0}" aria-controls="cdConcernPanel${capitalize(category.id)}"><span class="cd-concern__card-media" aria-hidden="true"><img src="${category.img}-240.webp" srcset="${category.img}-240.webp 240w, ${category.img}-400.webp 400w" sizes="(max-width: 599px) 42vw, 240px" alt="" width="960" height="640" loading="lazy" decoding="async"></span><span class="cd-concern__card-label" data-cd-trans="home.concernPick.${category.id}">${category.label}</span><span class="cd-concern__card-desc" data-cd-trans="home.concernPick.chip.${category.id}">${category.chip}</span></button>`).join('')}</div>
${QUESTION_CATEGORIES.map((category, index) => `    <div class="cd-concern__panel" id="cdConcernPanel${capitalize(category.id)}" data-cd-concern-panel="${category.id}"${index === 0 ? '' : ' hidden'}><h3 class="cd-concern__panel-title"><span data-cd-trans="home.concernPick.${category.id}">${category.label}</span> · <span>관련 운세</span></h3><ul class="cd-concern__qs">${category.questions.map(questionLink).join('')}</ul></div>`).join('\n')}
    <div class="cd-concern__actions"><a class="cd-concern__free" href="#destinyCardForm" data-cd-trans="home.concernPick.freeCta">무료로 먼저 확인하기</a><a class="cd-concern__ask" href="/fortune-chat/?character=yeoni" data-cd-price-key="fortune-chat-consultation"><span data-cd-trans="home.concernPick.ask">직접 물어보기</span> <em class="cd-concern__q-price" data-cd-play-price data-cd-play-feature="fortune-chat-consultation" data-cd-trans="home.concernPick.price.w5000">${won(chatPrice)}</em></a></div>
  </section>
</section>`;

// 덱 순서가 곧 강약이다. 대표 상담 3종(연애 비책·신년운세·인생의 책)을 Ⅰ–Ⅲ 첫 줄에 두고, 네오·연이·마스터 상담이 뒤를 잇는다.
const signatureProducts = [
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
  {
    id: 'neo-operation-room',
    className: 'neo',
    href: '/neo-operation-room/',
    title: '네오의 팩폭 전략실',
    question: '고민은 충분히 했다. 이제 무엇부터 바꿀까?',
    image: '/images/feature-details/neo-operation-room-hero-v2-textless.webp',
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
    question: '사람은 바뀌는데, 연애의 고민은 왜 비슷할까?',
    image: '/images/feature-details/master-love-codex-hero-v3.webp',
    imageAlt: '달빛 아래 인연의 지도를 펼쳐 보는 마스터 인연의 서',
    featureKey: 'master-love-codex',
    master: { caption: '인연의 서', names: '마스터', avatars: ['master'] },
    priceSuffix: '~',
    cta: '인연의 서 펼치기',
  },
];
for (const product of signatureProducts) {
  const art = introductionArt[product.id];
  if (!art) throw new Error(`Missing introduction artwork: ${product.id}`);
  product.image = art.image.replace('.webp', '-640.webp');
  product.imageSrcset = `${art.cardImage} 320w, ${product.image} 640w, ${art.image} 1536w`;
  product.imageAlt = art.alt;
  if (registryWindow.__cdServiceRegistry.find(item => item.id === product.id)?.priceFrom) product.priceSuffix = '부터';
}
const signaturePrice = (featureKey, suffix = '') => {
  const amount = FEATURE_KEY_PRICE_TABLE[featureKey]?.amountKRW;
  if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error(`Missing signature consultation price: ${featureKey}`);
  return `${amount.toLocaleString('ko-KR')}원${suffix}`;
};
// 마스터 칩 — 아바타는 build-master-avatars.mjs 가 만든 128px 한 장. 이름이 옆에 있으니 이미지는 장식(alt="").
const signatureMaster = ({ caption, names, avatars }) => `<span class="cd-sig-card__masters"><span class="cd-sig-card__avatars" aria-hidden="true">${avatars.map((key) => `<img src="/images/master-profiles/avatars/${key}.webp" width="48" height="48" alt="" loading="lazy" decoding="async">`).join('')}</span><span class="cd-sig-card__master"><span>${caption}</span> <b>${names}</b></span></span>`;
// 타로 덱 — 카드 한 장이 상담 하나. 숫자는 장식(aria-hidden)이고, 카드 이름은 제목이 말한다.
// 카드에는 고르는 데 필요한 것만 둔다: 마스터·제목·대표 질문·가격·CTA. 리포트 구성은 각 상담 상세가 보여 준다.
const TAROT_NUMERALS = ['Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ', 'Ⅴ', 'Ⅵ'];
vars.signature = `<section data-cd-funnel-section="signature_consult" class="cd-sig cd-sig--curated cd-sig--deck" id="cdSignatureConsult" data-marker="cd-signature-consult-v20261016" aria-labelledby="cdSignatureTitle" lang="ko">
  <div class="cd-sig__head"><h2 class="cd-sig__title" id="cdSignatureTitle">지금 필요한 상담을 골라보세요</h2><p class="cd-sig__sub">같은 풀이 기준으로, 주제에 맞춘 AI 해설을 읽어요. 구성과 예시를 먼저 살펴보세요.</p></div>
  <div class="cd-sig__viewport" id="cdSigViewport"><div class="cd-sig__grid" id="cdSigGrid">${signatureProducts.map((product, index) => `${index === 3 ? '<details class="cd-sig__more"><summary>다른 대표 상담도 살펴보기</summary><div class="cd-sig__more-grid">' : ''}<a class="cd-sig-card cd-sig-card--${product.className}" data-cd-service-id="${product.id}" href="${product.href}" aria-label="${product.title} — ${product.cta}" data-pvw-paid="true"${product.priceSuffix === '부터' ? ' data-price-from="true"' : ''}><span class="cd-yehwa-seal" aria-hidden="true"></span><span class="cd-sig-card__top"><span class="cd-sig-card__numeral" aria-hidden="true">${TAROT_NUMERALS[index]}</span></span><span class="cd-sig-card__media"><img class="cd-sig-card__img" width="1200" height="675" loading="lazy" decoding="async" src="${product.image}"${product.imageSrcset ? ` srcset="${product.imageSrcset}"` : ''} sizes="(max-width: 699px) 44vw, (max-width: 1023px) 30vw, 360px" alt="${product.imageAlt}"></span><span class="cd-sig-card__body">${signatureMaster(product.master)}<span class="cd-sig-card__title">${product.title}</span><span class="cd-sig-card__q">${product.question}</span><span class="cd-sig-card__price" data-cd-play-price data-cd-play-feature="${product.featureKey}"${product.priceSuffix ? ' data-cd-play-kind="from"' : ''}>${signaturePrice(product.featureKey, product.priceSuffix)}</span><span class="cd-sig-card__cta"><span>${product.cta}</span> <i aria-hidden="true">→</i></span></span></a>${index === signatureProducts.length - 1 ? '</div></details>' : ''}`).join('')}</div></div>
  <a class="cd-sig__samples-link" href="/consultation-samples/"><span>상담별 구성과 예시 보기</span><span class="cd-yehwa-spray cd-sig__samples-motif" aria-hidden="true"></span></a>
</section>`;

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
      <strong class="cdh-pass__tier-price"><span data-cd-play-price data-cd-play-pass="${plan.tier}" data-cd-play-policy="${CURRENT_PASS_POLICY_VERSION}" data-cd-trans="home.overseasCopy.krwAmount" data-cd-vars='{"amount":"${Number(plan.wonPrice).toLocaleString('en-US')}"}'>${won(plan.wonPrice)}</span> <small data-cd-trans="home.gardenCopy.passPer">· 기간 제한 없음</small></strong>
      <span class="cdh-pass__tier-line" data-cd-trans="home.overseasCopy.${plan.tier === 'family' ? 'passNoLimit' : 'passPerLimit'}" data-cd-vars='{"amount":"${Number(plan.maxCoveredCoin * 100).toLocaleString('en-US')}"}'>${plan.tier === 'family' ? '유료 리딩 건당 한도 없음' : `건당 ${won(plan.maxCoveredCoin * 100)} 이하`}</span>
      <span class="cdh-pass__tier-line" data-cd-trans="home.overseasCopy.passTotal" data-cd-vars='{"amount":"${Number(plan.monthlyLimitCoin * 100).toLocaleString('en-US')}"}'>누적 ${won(plan.monthlyLimitCoin * 100)}까지</span>
    </a></li>`).join('')}
  </ul>
  <p class="cdh-pass__note" data-cd-trans="home.gardenCopy.passNote">작은·중간·큰 꿀단지는 꿀꿀 운세에, 패밀리 꿀단지는 꿀꿀 운세와 영냥이 유료 리딩에 적용됩니다. 기존에 구매한 이용권은 구매 당시 조건을 유지합니다.</p>
  <details class="cdh-pass__packs"><summary class="cdh-pass__group">
    <img class="cdh-pass__pack-guide" src="/assets/yeongnyangi/original/hero-800.webp" alt="" width="800" height="800" loading="lazy" decoding="async">
    <span class="cdh-pass__pack-heading"><span data-cd-trans="home.passCopy.packTitle">영냥이 전용 이용권</span><small data-cd-trans="home.passCopy.packNote">영냥이 세트는 같은 생선 상담에만 1회씩 사용돼요. 꽃돼지 이용권과 따로 적용돼요.</small></span>
  </summary>
  <ul class="cdh-pass__tiers cdh-pass__tiers--packs" role="list">${listServicePackPlans().map(plan => {
    const fishKey = '@home.passCopy.fish' + plan.fishId[0].toUpperCase() + plan.fishId.slice(1);
    const fishKo = plan.label.split(' ')[0];
    return `
    <li class="cdh-pass__tier cdh-pass__tier--pack" data-pack-plan="${plan.planId}"><a class="cdh-pass__tier-link" href="/points/#fish-packs">
      <img class="cdh-pass__pack-art" src="/assets/yeongnyangi/service-packs/${plan.fishId}-gift-set-v2.webp" alt="" width="240" height="240" loading="lazy" decoding="async">
      <span class="cdh-pass__tier-name" data-cd-trans="home.passCopy.packName" data-cd-vars='{"fish":"${fishKey}","total":"${plan.totalUses}"}'>${plan.label}</span>
      <strong class="cdh-pass__tier-price"><span data-cd-play-price data-cd-trans="home.overseasCopy.krwAmount" data-cd-vars='{"amount":"${Number(plan.priceKRW).toLocaleString('en-US')}"}'>${won(plan.priceKRW)}</span></strong>
      <span class="cdh-pass__tier-line" data-cd-trans="home.passCopy.packPerUse" data-cd-vars='{"amount":"${Number(plan.unitPriceKRW).toLocaleString('en-US')}"}'>회당 ${won(plan.unitPriceKRW)} 상담</span>
      <span class="cdh-pass__tier-line" data-cd-trans="home.passCopy.packScope" data-cd-vars='{"fish":"${fishKey}","total":"${plan.totalUses}"}'>${fishKo} 상담 전용 · 사용 기한 없음 · 총 ${plan.totalUses}회</span>
    </a></li>`;
  }).join('')}
  </ul>
  </details>
  <a class="cdh-pass__btn" href="/points/?source=flower-membership" data-cd-trans="home.gardenCopy.passCta">나에게 맞는 이용권 확인하기</a>
</section>`;
const template = readFileSync('templates/home-funnel.html', 'utf8');
let homeHtml = template.replace(/\{\{(\w+)\}\}/g, (_token, key) => {
  if (!(key in vars)) throw new Error(`Unknown home funnel template token: ${key}`);
  return vars[key];
});

homeHtml = homeHtml.replace('id="cdSigGrid"', 'id="cdSigGrid" data-home-stagger="signature"');

// Mark authored text-only home labels; preserve nested markup and original quotations.
const overseasLabels = Object.assign({}, ...readdirSync('i18n/authored').filter(file => /^homeOverseas-\d+\.json$/.test(file)).sort().map(file => JSON.parse(readFileSync('i18n/authored/' + file, 'utf8'))));
const labelKeys = new Map(Object.entries(overseasLabels).filter(([, value]) => !value.ko.includes('{')).map(([key, value]) => [value.ko, key]));
const varsAttribute = values => ' data-cd-vars="' + JSON.stringify(values).replaceAll('"', '&quot;') + '"';
const copyReference = text => {
  const key = labelKeys.get(text);
  if (!key) throw new Error('Missing authored home label: ' + text);
  return '@' + key;
};
for (const product of signatureProducts) {
  homeHtml = homeHtml.replace('aria-label="' + product.title + ' — ' + product.cta + '"',
    'aria-label="' + product.title + ' — ' + product.cta + '" data-cd-trans-attr="aria-label:home.guideCopy.cardLabel"' + varsAttribute({ title: copyReference(product.title), action: copyReference(product.cta) }));
  homeHtml = homeHtml.replace('alt="' + product.imageAlt + '"',
    'alt="' + product.imageAlt + '" data-cd-trans-attr="alt:home.guideCopy.sceneAlt"' + varsAttribute({ name: copyReference(product.master.names), title: copyReference(product.title) }));
}
for (const master of FUSION_MASTERS) {
  homeHtml = homeHtml.replace('aria-label="' + master.name + '에게 물어보기 · ' + master.text + '" title="' + master.name + '에게 물어보기"',
    'aria-label="' + master.name + '에게 물어보기 · ' + master.text + '" title="' + master.name + '에게 물어보기" data-cd-trans-attr="aria-label:home.guideCopy.masterLabel,title:home.guideCopy.askMaster"' + varsAttribute({ name: copyReference(master.name), role: copyReference(master.role) }));
}
homeHtml = homeHtml.replace('alt="연이·꽃돼지 연이의 연이와 나누는 대화 상담 상담 장면"',
  'alt="연이·꽃돼지 연이의 연이와 나누는 대화 상담 상담 장면" data-cd-trans-attr="alt:home.guideCopy.sceneAlt"' + varsAttribute({ name: '@home.guideCopy.yeoniName', title: '@home.guideCopy.tabYeoni' }));
homeHtml = homeHtml.replace(/(<[a-z][^>]*>)([^<>]+)(<\/[a-z][a-z0-9]*>)/g, (whole, open, text, close) => {
  if (/^해금 \d[\d,]*원$/.test(text) && !/\sdata-cd-trans(?=[\s=>])/.test(open)) {
    return open.slice(0, -1) + ' data-cd-trans="home.guideCopy.unlockPrice"' + varsAttribute({ amount: text.replace(/^해금 |원$/g, '') }) + '>' + text + close;
  }
  if (/^\d[\d,]*원(?:부터)?$/.test(text) && !/\sdata-cd-trans(?=[\s=>])/.test(open)) {
    return open.slice(0, -1) + ' data-cd-trans="' + (text.endsWith('부터') ? 'home.simple.priceFrom' : 'home.overseasCopy.krwAmount') + '" data-cd-vars=\"' + JSON.stringify({amount:text.replace(/원(?:부터)?$/, '')}).replaceAll('\"', '&quot;') + '\">' + text + close;
  }
  const key = labelKeys.get(text);
  return !key || /\sdata-cd-trans(?=[\s=>])/.test(open) ? whole : open.slice(0, -1) + ' data-cd-trans="' + key + '">' + text + close;
});

// Translate accessibility copy alongside visible text, without replacing controls.
homeHtml = homeHtml.replace(/<[a-z][^>]*>/g, open => {
  const entries = [];
  for (const attr of ['aria-label', 'title', 'alt']) {
    const value = open.match(new RegExp('\\s' + attr + '="([^"]*)"'))?.[1];
    const key = labelKeys.get(value);
    if (key && !open.includes(attr + ':')) entries.push(attr + ':' + key);
  }
  if (!entries.length) return open;
  return open.includes('data-cd-trans-attr="')
    ? open.replace(/(data-cd-trans-attr=")([^"]*)"/, (_all, start, attrs) => start + attrs + ',' + entries.join(',') + '"')
    : open.slice(0, -1) + ' data-cd-trans-attr="' + entries.join(',') + '">';
}).replaceAll(' lang="ko"', '');

let cleaned = original;

const marker = /<!-- cd-home-funnel:start[\s\S]*?<!-- cd-home-funnel:end -->/;
let updated;
if (marker.test(cleaned)) {
  updated = cleaned.replace(marker, homeHtml.trimEnd());
} else {
  updated = cleaned.replace('    <header class="logo-area" role="banner">', homeHtml + '\n    <header class="logo-area" role="banner">');
}

// Result samples now live on their own application pages. Do not load their stylesheet on the home shell.
if (!updated.includes('href="/styles/consultation-method-guide.css"')) {
  updated = updated.replace('<link rel="stylesheet" href="/styles/home-funnel.css">', '<link rel="stylesheet" href="/styles/home-funnel.css">\n<link rel="stylesheet" href="/styles/consultation-method-guide.css">');
}
updated = updated.replace(/\s*<link rel="stylesheet" href="\/styles\/result-samples\.css(?:\?v=[^"]*)?">/g, '');

if (process.argv.includes('--check')) {
  if (original !== updated) throw new Error('Home funnel needs regeneration');
  console.log('[home-funnel] current');
} else {
  writeFileSync('index.html', updated);
  console.log('[home-funnel] assembled from existing sections; no runtime DOM reflow');
}
