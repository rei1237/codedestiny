import { MOONSTONE_MIN_PRODUCT_KRW } from '../../worker/lib/paid-feature-registry.js';
import { renderPressCoverageHtml } from "../../lib/seo/press-coverage.mjs";
import { readFileSync, writeFileSync } from 'node:fs';
import { parse } from 'parse5';
import { runInNewContext } from 'node:vm';
import { CURRENT_PASS_PLANS } from '../../lib/payment/pass-policy.js';
import { listServicePackPlans } from '../../worker/payments/service-pack-policy.js';
import { FEATURE_KEY_PRICE_TABLE } from '../../worker/lib/paid-feature-registry.js';
import { splitReviews, postedMonth } from '../../lib/brand/customer-reviews.mjs';
import { EXPERTISE_FACTS } from '../../lib/brand/expertise-facts.mjs';
import { renderTrustStoriesHtml } from '../../lib/brand/trust-stories.mjs';
import { renderNeoHomeIntroduction } from '../../lib/brand/neo-home-introduction.mjs';
import { renderNeoEmailHomeEntry } from '../../lib/brand/neo-email-home-entry.mjs';
import { KRW_PER_COIN, MEMBERSHIP_CREDIT_PER_COIN } from '../../worker/lib/billing-policy.js';
import signupBenefitPolicy from '../../js/core/signup-benefit-policy.mjs';

const original = readFileSync('index.html', 'utf8');
const doc = parse(original, { sourceCodeLocationInfo: true });
const attrs = (node) => Object.fromEntries((node.attrs || []).map((attr) => [attr.name, attr.value]));

function find(node, predicate) {
  if (predicate(node, attrs(node))) return node;
  for (const child of node.childNodes || []) {
    const result = find(child, predicate);
    if (result) return result;
  }
}

const byId = (id) => find(doc, (_node, values) => values.id === id);
const byClass = (className, extra = () => true) => find(doc, (node, values) =>
  String(values.class || '').split(/\s+/).includes(className) && extra(node, values));
const htmlOf = (node, label) => {
  const location = node?.sourceCodeLocation;
  if (!location) throw new Error(`Existing home section is required: ${label}`);
  return original.slice(location.startOffset, location.endOffset);
};

const nodes = {
  quick: byId('cdQuickServices'),
  today: byId('cdTodayHub'),
  concern: byId('cdConcernPick'),
  signature: byId('cdSignatureConsult'),
  // The pass banner is re-rendered below; locate the previous render by its stable marker, not its class.
  pass: find(doc, (_node, values) => values['data-design-marker'] === 'moonlight-pass-banner-v20260626'),
  gateway: byId('fortuneGatewayEntry'),
  story: byClass('moon-story-entry'),
  music: byId('moonMusicEntry'),
  reviews: byId('cdReviews'),
  guide: byClass('cd-home-guide'),
  feedback: byId('cdFeedbackGate'),
  finder: byId('cdFinder'),
  diary: byId('cdDiaryPlannerEntry'),
  experts: byId('cdAiFeatures'),
};

const vars = Object.fromEntries(Object.entries(nodes).map(([key, node]) => [key, htmlOf(node, key)]));
const fusionCard = htmlOf(byClass('cd-sig-card--fusion'), 'fusion recommendation');
vars.signature = vars.signature.replace(fusionCard, '');
// The second render finds the same authoritative card in its new section.
if (byId('cdFusionRecommendation')) nodes.fusionRecommendation = byId('cdFusionRecommendation');
vars.fusionRecommendation = `<section id="cdFusionRecommendation" class="cdh-fusion-recommendation" aria-label="초융합 운세">${fusionCard}</section>`;
const registryWindow = {};
runInNewContext(readFileSync('js/core/service-registry.js', 'utf8'), { window: registryWindow });
const lightCards = ['saju', 'tarot', 'ziwei', 'sukuyo'].map(id => {
  const service = registryWindow.__cdServiceRegistry.find(item => item.id === id);
  if (service?.price !== '무료 시작') throw new Error('Light recommendation must retain its catalog free entry: ' + id);
  const card = find(nodes.quick, (_node, values) => values['data-cd-service-id'] === id);
  return htmlOf(card, id).replace('</a>', '<span data-cd-trans="home.followup.free">무료 시작 · 심화는 별도</span></a>');
});
vars.lightRecommendations = `<section class="cdh-light" aria-labelledby="cdhLightTitle"><h2 id="cdhLightTitle" data-cd-trans="home.followup.light">가볍게 둘러보기</h2><div class="cdh-methods-grid">${lightCards.join('')}</div></section>`;
vars.signupAmount = signupBenefitPolicy.amount.toLocaleString('ko-KR');
vars.signupValue = (signupBenefitPolicy.amount * KRW_PER_COIN / MEMBERSHIP_CREDIT_PER_COIN).toLocaleString('ko-KR');
vars.signupDays = signupBenefitPolicy.days;
vars.moonstoneMinimum = MOONSTONE_MIN_PRODUCT_KRW.toLocaleString('ko-KR');
vars.pickReason = htmlOf(byId('cdPickReason'), 'consultation recommendation');
vars.signature = vars.signature.replace(vars.pickReason, '').replace(/^[ \t]+$/gm, '');
const paidTodayTerms = '<p class="cd-today__terms">1회 3,000원 · 생년월일 프로필 카드로 계산해요</p>';
const freeTodayTerms = '<p class="cd-today__terms"><strong>무료</strong> · 생년월일 프로필 카드로 계산해요</p>';
if (vars.today.includes(paidTodayTerms)) vars.today = vars.today.replace(paidTodayTerms, freeTodayTerms);
else if (!vars.today.includes(freeTodayTerms)) throw new Error('Today hub terms changed: keep the free home disclosure in sync');
const signatureProducts = [
  {
    id: 'neo-operation-room',
    className: 'neo',
    href: '/neo-operation-room/',
    title: '네오의 팩폭 전략실',
    question: '고민은 충분히 했다. 이제 무엇부터 바꿀까?',
    description: '선택한 운세 체계의 근거로 반복되는 선택의 빈틈을 짚고, 오늘 실행할 현실적인 작전을 정리합니다.',
    image: '/images/feature-details/neo-operation-room-hero-v1.webp',
    imageAlt: '달빛 전략실에서 선택의 판세를 정리하는 네오',
    featureKey: 'neo-operation-room-consultation',
    master: { caption: '마스터', names: '네오', avatars: ['neo'] },
    report: ['선택한 운세 체계 1종', '초기 브리핑 · 현실 점검', '정제 리포트 · 다음 작전'],
    cta: '전략실 입장하기',
  },
  {
    id: 'fortune-tea-house',
    className: 'tea',
    href: '/fortune-tea-house/',
    title: '연이의 운명 찻집',
    question: '재회부터 사업까지, 어떤 선택이 고민인가요?',
    description: '연애·재회, 진로·사업, 금전과 인간관계까지. 연이와 찻잔을 고르고, 내 고민에 맞는 흐름과 다음 선택을 함께 살펴봅니다.',
    image: '/images/home/yeoni-tea-together-v1-1200.webp',
    imageAlt: '한복 입은 연이와 꽃돼지가 함께 차를 건네는 운명의 찻집',
    featureKey: 'fortune-tea-house-tarot-consultation',
    master: { caption: '마스터', names: '연이', avatars: ['yeoni'] },
    report: ['선택한 찻잔과 질문', '고민별 흐름과 선택지', '오늘의 기준 · 행동 제안'],
    cta: '운명 찻집 들어가기',
  },
  {
    id: 'master-love-codex',
    className: 'master',
    href: '/master-love-codex/',
    title: '마스터 인연의 서',
    question: '내 다음 연애는 언제 시작될까?',
    description: '사주와 자미두수를 함께 읽어 관계의 반복 패턴과 만남의 방향을 살펴봅니다.',
    image: '/images/feature-details/master-love-codex-hero-v3.webp',
    imageAlt: '달빛 아래 인연의 지도를 펼쳐 보는 마스터 인연의 서',
    featureKey: 'master-love-codex',
    master: { caption: '인연의 서', names: '마스터', avatars: ['master'] },
    priceSuffix: '~',
    report: ['20장 연애 리포트', '사주 · 자미두수 교차 해석', 'PDF 저장'],
    cta: '인연의 서 펼치기',
  },
  {
    id: 'love-secret-ai',
    className: 'love',
    href: '/love-secret-ai/',
    title: '연애 비책',
    question: '마음부터 들려주세요. 두 분 사이의 거리는 서한비가 재어 드릴게요.',
    description: '연이가 내 연애 성향과 마음을, 서한비가 상대와의 거리·갈등·다가갈 때를 읽어요. 다음 대화와 7일 실천까지 항목별로 정리해 드려요.',
    image: '/images/home/love-secret-masters-v1-1200.webp',
    imageSrcset: '/images/home/love-secret-masters-v1-600.webp 600w, /images/home/love-secret-masters-v1-1200.webp 1200w',
    imageAlt: '달빛 찻집에서 찻잔을 든 연이와 관계 장부를 곁에 둔 서한비',
    featureKey: 'love-secret-ai-consultation',
    master: { caption: '공동 마스터', names: '연이 · 서한비', avatars: ['yeoni-love', 'hanbi-love'] },
    report: ['6부 28개 섹션', '관계 · 궁합 · 시기 분석', '7일 실천 가이드 · PDF'],
    cta: '연애 비책 시작하기',
  },
  {
    id: 'new-year-ai',
    className: 'year',
    href: '/new-year-ai-consultation/',
    title: '신년운세',
    question: '올해 판세는 내가 먼저 읽는다. 어디서 밀고, 언제 멈출까?',
    description: '선택한 해의 세운을 네 명식과 맞대어, 일·재물·관계와 열두 달의 작전을 나눠 정리한다.',
    image: '/images/home/new-year-neo-v1-1200.webp',
    imageSrcset: '/images/home/new-year-neo-v1-600.webp 600w, /images/home/new-year-neo-v1-1200.webp 1200w',
    imageAlt: '새해 첫 해가 드는 작전실에서 열두 달 작전판을 짚는 네오와 백사자',
    featureKey: 'new-year-ai-consultation',
    master: { caption: '마스터', names: '네오', avatars: ['neo-new-year'] },
    report: ['5개 세운 섹션', '1월~12월 월별 흐름', '질문 답변 · PDF'],
    cta: '신년운세 받기',
  },
  {
    id: 'life-book-ai',
    className: 'life',
    href: '/life-book-ai/',
    title: '인생의 책',
    question: '당신의 인생, 첫 장부터 읽어 드릴게요.',
    description: '타고난 기질부터 일·사랑·재물, 대운과 가까운 세운까지. 반복되는 장면이 어디서 오는지 한 권의 서사로 엮어 드려요.',
    image: '/images/home/life-book-yun-v2-1200.webp',
    imageSrcset: '/images/home/life-book-yun-v2-600.webp 600w, /images/home/life-book-yun-v2-1200.webp 1200w',
    imageAlt: '달빛 서고에서 빛이 오르는 녹색 인생의 책을 펼친 윤달과 흰 고양이',
    featureKey: 'life-book-ai-consultation',
    master: { caption: '마스터', names: '윤달', avatars: ['yun-life-book'] },
    report: ['10개 장의 인생 서사', '대운 · 세운 흐름', '핵심 판독 4편 · PDF'],
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
vars.signature = `<section data-cd-funnel-section="signature_consult" class="cd-sig cd-sig--curated" id="cdSignatureConsult" data-marker="cd-signature-consult-v20261015" aria-labelledby="cdSignatureTitle" lang="ko">
  <div class="cd-sig__head"><h2 class="cd-sig__title" id="cdSignatureTitle">대표 운명 상담</h2><p class="cd-sig__sub">고민의 깊이와 필요한 리포트 구성을 먼저 확인하고, 지금의 나에게 맞는 상담을 골라보세요.</p></div>
  <div class="cd-sig__viewport" id="cdSigViewport"><div class="cd-sig__grid" id="cdSigGrid">${signatureProducts.map((product) => `<a class="cd-sig-card cd-sig-card--${product.className}" data-cd-service-id="${product.id}" href="${product.href}" aria-label="${product.title} 상담 알아보기" data-pvw-paid="true"><span class="cd-yehwa-seal" aria-hidden="true"></span><span class="cd-sig-card__media"><img class="cd-sig-card__img" width="1200" height="675" loading="lazy" decoding="async" src="${product.image}"${product.imageSrcset ? ` srcset="${product.imageSrcset}"` : ''} sizes="(max-width: 767px) calc(100vw - 64px), (max-width: 1199px) 42vw, 360px" alt="${product.imageAlt}"></span><span class="cd-sig-card__body">${signatureMaster(product.master)}<span class="cd-sig-card__title">${product.title}</span><span class="cd-sig-card__q">${product.question}</span><span class="cd-sig-card__desc">${product.description}</span><span class="cd-sig-card__report"><b>리포트 구성</b>${product.report.map((item) => `<span>${item}</span>`).join('')}</span><span class="cd-sig-card__price">${signaturePrice(product.featureKey, product.priceSuffix)}</span><span class="cd-sig-card__meta"><span>이용권 · 월정석 · 단건 결제</span></span><span class="cd-sig-card__cta"><span>상담 알아보기</span> <i aria-hidden="true">→</i></span></span></a>`).join('')}</div></div>
  <a class="cd-sig__samples-link" href="/consultation-samples/"><span>상담 결과 전체 미리보기</span><span class="cd-yehwa-spray cd-sig__samples-motif" aria-hidden="true"></span></a>
</section>`;
vars.pressCoverage = renderPressCoverageHtml();
vars.trustStories = renderTrustStoriesHtml();
vars.neoIntroduction = renderNeoHomeIntroduction();
vars.reviewKrwPerStone = KRW_PER_COIN / MEMBERSHIP_CREDIT_PER_COIN;

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
  <p class="cdh-pass__note" data-cd-trans="home.gardenCopy.passNote">작은·중간·큰 꿀단지는 꽃돼지 운세에, 패밀리 꿀단지는 꽃돼지와 영냥이 유료 리딩에 적용됩니다. 기존에 구매한 이용권은 구매 당시 조건을 유지합니다.</p>
  <h3 class="cdh-pass__group" data-cd-trans="home.passCopy.packTitle">영냥이 전용 이용권</h3>
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
  <p class="cdh-pass__note" data-cd-trans="home.passCopy.packNote">영냥이 세트는 같은 생선 상담에만 1회씩 사용돼요. 꽃돼지 이용권과 따로 적용돼요.</p>
  <a class="cdh-pass__btn" href="/points/?source=flower-membership" data-cd-trans="home.gardenCopy.passCta">나에게 맞는 이용권 확인하기</a>
</section>`;
vars.representativePrice = Number(FEATURE_KEY_PRICE_TABLE['yeongnyangi-saju-mackerel'].amountKRW).toLocaleString('ko-KR') + '원';
for (const fish of ['mackerel', 'salmon', 'flounder', 'tuna']) {
  const featureKey = `yeongnyangi-saju-${fish}`;
  const price = FEATURE_KEY_PRICE_TABLE[featureKey]?.amountKRW;
  if (!Number.isSafeInteger(price) || price <= 0) throw new Error(`Missing Yeongnyangi home price: ${featureKey}`);
  vars[`yeongnyangi${fish[0].toUpperCase()}${fish.slice(1)}Price`] = price.toLocaleString('ko-KR');
}
// 홈 '연애·궁합' 입구는 인연의 서 상세로 바로 간다. 가격은 registry 값을 그대로 쓴다.
for (const [token, featureKey] of [['codexPrice', 'master-love-codex'], ['codexCompatPrice', 'master-love-codex-compat']]) {
  const price = FEATURE_KEY_PRICE_TABLE[featureKey]?.amountKRW;
  if (!Number.isSafeInteger(price) || price <= 0) throw new Error(`Missing master love codex home price: ${featureKey}`);
  vars[token] = price.toLocaleString('ko-KR');
}
// 신뢰 블록 제목·고지·CTA 는 12개 로케일 사전에 "3,000원" 을 문구로 굽는다(2026-10-12 고등어 가격). 가격이 바뀌면 문구가 거짓이 되므로 빌드를 멈춘다.
if (Number(FEATURE_KEY_PRICE_TABLE['yeongnyangi-saju-mackerel'].amountKRW) !== 5000) throw new Error('home funnel trust offer copy says 5,000원: update offerTitle/offerNote/offerCta before changing the mackerel price');;
// 홈 두 상담 카드(#fortuneGatewayEntry)의 '1회 5,000원'은 사전 문구다 — 가격이 바뀌면 문구부터 고친다.
if (Number(FEATURE_KEY_PRICE_TABLE['fortune-chat-consultation'].amountKRW) !== 5000) throw new Error('home chat doors say 5,000원: update shell.fortuneGatewayDoor.fortuneGatewayDoorMeta.n13000 before changing the fortune chat price');
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
// 채팅형 카드 — App Router CustomerReviews 와 같은 시각 언어(인용 · 상단 바 · 아바타 · 발신자 · 말풍선 · 메타).
// 인용(highlight)은 말풍선 원문의 부분 문자열이라 보조기기에는 숨긴다. 대표는 splitReviews 가 neo-1on1 에서만 뽑으므로 바 문구는 고정이다.
const reviewAvatar = '<span class="cdh-kakao__avatar" aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/></svg></span>';
const reviewCard = review => `<li><article class="cdh-kakao__card">${review.highlight ? `<p class="cdh-kakao__quote" aria-hidden="true" lang="ko">${escapeHtml(review.highlight)}</p>` : ''}<p class="cdh-kakao__bar" data-cd-trans="home.funnelCopy.reviewsBar">네오 1:1 상담 · 카카오톡</p><div class="cdh-kakao__thread">${reviewAvatar}<div class="cdh-kakao__bubbles"><span class="cdh-kakao__sender" data-cd-trans="home.funnelCopy.reviewsSender">익명 상담 고객</span><div class="cdh-kakao__msgs" lang="ko">${review.bubbles.map(text => '<p>' + escapeHtml(text).replace(/\n/g, '<br>') + '</p>').join('')}</div></div></div><p class="cdh-kakao__meta"><span data-cd-trans="home.funnelCopy.reviewsMeta">실제 이용자 후기 · 게시 동의</span> <span class="cdh-kakao__when">· <time datetime="${review.postedAt}">${postedMonth(review)}</time> <span data-cd-trans="home.funnelCopy.reviewsPosted">블로그 게시</span></span></p></article></li>`;
const { lead: leadReviews } = splitReviews(3);
// 게시 가능한 후기가 없으면 후기 영역 전체를 비운다(fail-closed, 빈 카드 없음).
vars.customerReviews = leadReviews.length ? `<p id="cdhReviewsTitle" class="cdh-kakao-lead" data-cd-trans="home.funnelCopy.reviewsLead">네오가 1:1로 상담할 때 받은 실제 카카오톡 후기예요. 고객이 쓴 문장 그대로 옮겼고, 생략한 곳은 …로 표시했어요.</p><ul class="cdh-kakao">${leadReviews.map(reviewCard).join('')}</ul><p class="cdh-kakao-fine" data-cd-trans="home.funnelCopy.reviewsFine">개인 경험에 따른 후기이며 결과를 보장하지 않습니다. 사주 풀이는 참고용 정보입니다.</p>` : '';
vars.expertiseFacts = EXPERTISE_FACTS.map(fact => `<li data-cd-trans="home.funnelCopy.expertise.${fact.key}">${escapeHtml(fact.ko)}</li>`).join('');
const template = readFileSync('templates/home-funnel.html', 'utf8');
vars.neoEmailConsultation = renderNeoEmailHomeEntry();
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

// Remove each source node before inserting the assembled home. Reverse offsets keep ranges stable.
let cleaned = original;
const removals = Object.entries(nodes).map(([key, node]) => ({ key, ...node.sourceCodeLocation }))
  .sort((a, b) => b.startOffset - a.startOffset);
for (const removal of removals) {
  cleaned = cleaned.slice(0, removal.startOffset)
    + `<!-- ${removal.key} moved intact into #cdHomeFunnel at build time. -->`
    + cleaned.slice(removal.endOffset);
}

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
