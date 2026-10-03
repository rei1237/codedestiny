import { renderPressCoverageHtml } from "../../lib/seo/press-coverage.mjs";
import { readFileSync, writeFileSync } from 'node:fs';
import { parse } from 'parse5';
import { FEATURE_KEY_PRICE_TABLE } from '../../worker/lib/paid-feature-registry.js';
import { CURRENT_PASS_PLANS } from '../../lib/payment/pass-policy.js';
import { splitReviews, postedMonth } from '../../lib/brand/customer-reviews.mjs';
import { EXPERTISE_FACTS } from '../../lib/brand/expertise-facts.mjs';

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
vars.pressCoverage = renderPressCoverageHtml();
const won = value => Number(value).toLocaleString('ko-KR') + '원';
vars.pass = `<section class="cdh-pass" aria-labelledby="cdhPassTitle" data-design-marker="moonlight-pass-banner-v20260626">
  <div class="cdh-pass__intro">
    <img class="cdh-pass__mascot" src="/images/home/yeoni-pass-mascot-240.webp" srcset="/images/home/yeoni-pass-mascot-240.webp 240w, /images/home/yeoni-pass-mascot-480.webp 480w" sizes="(max-width: 640px) 104px, 168px" alt="이용권 카드를 들고 웃는 꽃돼지 연이" data-cd-trans-attr="alt:home.gardenCopy.passMascotAlt" width="240" height="240" loading="lazy" decoding="async">
    <div class="cdh-pass__copy">
      <span class="cdh-pass__eyebrow" data-cd-trans="home.gardenCopy.passEyebrow">자동갱신 없는 30일 이용권</span>
      <h2 class="cdh-pass__title" id="cdhPassTitle" data-cd-trans="home.gardenCopy.passTitle">자주 보신다면, 30일 이용권</h2>
      <p class="cdh-pass__desc" data-cd-trans="home.gardenCopy.passDesc">상담 가격만큼 한도에서 차감돼요. 30일이 지나면 자동으로 끝나요.</p>
    </div>
  </div>
  <ul class="cdh-pass__tiers" role="list">${Object.values(CURRENT_PASS_PLANS).map(plan => `
    <li class="cdh-pass__tier${plan.tier === 'family' ? ' cdh-pass__tier--family' : ''}"><a class="cdh-pass__tier-link" href="/points/?source=flower-membership&amp;plan=${plan.tier}">
      ${plan.tier === 'family' ? '<span class="cdh-pass__badge" data-cd-trans="home.gardenCopy.passBadge">영냥이까지</span>' : ''}<span class="cdh-pass__tier-name">${plan.name}</span>
      <strong class="cdh-pass__tier-price">${won(plan.wonPrice)} <small data-cd-trans="home.gardenCopy.passPer">/ 30일</small></strong>
      <span class="cdh-pass__tier-line">${plan.tier === 'family' ? '유료 리딩 건당 한도 없음' : `건당 ${won(plan.maxCoveredCoin * 100)} 이하`}</span>
      <span class="cdh-pass__tier-line">누적 ${won(plan.monthlyLimitCoin * 100)}까지</span>
      <span class="cdh-pass__tier-line">${plan.profileLimit === 0 ? '프로필 무제한' : `프로필 최대 ${plan.profileLimit}개`}</span>
    </a></li>`).join('')}
  </ul>
  <p class="cdh-pass__note" data-cd-trans="home.gardenCopy.passNote">Standard·Premium·VVIP는 꽃돼지 운세에, Family는 꽃돼지와 영냥이 유료 리딩에 적용됩니다. 기존에 구매한 이용권은 구매 당시 조건을 유지합니다.</p>
  <a class="cdh-pass__btn" href="/points/?source=flower-membership" data-cd-trans="home.gardenCopy.passCta">이용권 4종 확인하기</a>
</section>`;
vars.representativePrice = Number(FEATURE_KEY_PRICE_TABLE['yeongnyangi-saju-mackerel'].amountKRW).toLocaleString('ko-KR') + '원';
// 신뢰 블록 제목·고지·CTA 는 12개 로케일 사전에 "1,000원" 을 문구로 굽는다. 가격이 바뀌면 문구가 거짓이 되므로 빌드를 멈춘다.
if (Number(FEATURE_KEY_PRICE_TABLE['yeongnyangi-saju-mackerel'].amountKRW) !== 1000) throw new Error('home funnel trust offer copy says 1,000원: update offerTitle/offerNote/offerCta before changing the mackerel price');;
// 홈 두 상담 카드(#fortuneGatewayEntry)의 '이후 1회 3,000원'은 사전 문구다 — 가격이 바뀌면 문구부터 고친다.
if (Number(FEATURE_KEY_PRICE_TABLE['fortune-chat-consultation'].amountKRW) !== 3000) throw new Error('home chat doors say 3,000원: update shell.fortuneGatewayDoor.fortuneGatewayDoorMeta.n115000 before changing the fortune chat price');
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
// 채팅형 카드 — App Router CustomerReviews 와 같은 시각 언어(인용 · 상단 바 · 아바타 · 발신자 · 말풍선 · 메타).
// 인용(highlight)은 말풍선 원문의 부분 문자열이라 보조기기에는 숨긴다. 대표는 splitReviews 가 neo-1on1 에서만 뽑으므로 바 문구는 고정이다.
const reviewAvatar = '<span class="cdh-kakao__avatar" aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/></svg></span>';
const reviewCard = review => `<li><article class="cdh-kakao__card">${review.highlight ? `<p class="cdh-kakao__quote" aria-hidden="true" lang="ko">${escapeHtml(review.highlight)}</p>` : ''}<p class="cdh-kakao__bar" data-cd-trans="home.funnelCopy.reviewsBar">네오 1:1 상담 · 카카오톡</p><div class="cdh-kakao__thread">${reviewAvatar}<div class="cdh-kakao__bubbles"><span class="cdh-kakao__sender" data-cd-trans="home.funnelCopy.reviewsSender">익명 상담 고객</span><div class="cdh-kakao__msgs" lang="ko">${review.bubbles.map(text => '<p>' + escapeHtml(text).replace(/\n/g, '<br>') + '</p>').join('')}</div></div></div><p class="cdh-kakao__meta"><span data-cd-trans="home.funnelCopy.reviewsMeta">실제 이용자 후기 · 게시 동의</span> <span class="cdh-kakao__when">· <time datetime="${review.postedAt}">${postedMonth(review)}</time> <span data-cd-trans="home.funnelCopy.reviewsPosted">블로그 게시</span></span></p></article></li>`;
const { lead: leadReviews } = splitReviews(3);
// 게시 가능한 후기가 없으면 후기 영역 전체를 비운다(fail-closed, 빈 카드 없음).
vars.customerReviews = leadReviews.length ? `<p class="cdh-kakao-lead" data-cd-trans="home.funnelCopy.reviewsLead">네오가 1:1로 상담할 때 받은 실제 카카오톡 후기예요. 고객이 쓴 문장 그대로 옮겼고, 생략한 곳은 …로 표시했어요.</p><ul class="cdh-kakao">${leadReviews.map(reviewCard).join('')}</ul><p class="cdh-kakao-fine" data-cd-trans="home.funnelCopy.reviewsFine">개인 경험에 따른 후기이며 결과를 보장하지 않습니다. 사주 풀이는 참고용 정보입니다.</p>` : '';
vars.expertiseFacts = EXPERTISE_FACTS.map(fact => `<li data-cd-trans="home.funnelCopy.expertise.${fact.key}">${escapeHtml(fact.ko)}</li>`).join('');
const template = readFileSync('templates/home-funnel.html', 'utf8');
const homeHtml = template.replace(/\{\{(\w+)\}\}/g, (_token, key) => {
  if (!(key in vars)) throw new Error(`Unknown home funnel template token: ${key}`);
  return vars[key];
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

if (process.argv.includes('--check')) {
  if (original !== updated) throw new Error('Home funnel needs regeneration');
  console.log('[home-funnel] current');
} else {
  writeFileSync('index.html', updated);
  console.log('[home-funnel] assembled from existing sections; no runtime DOM reflow');
}
