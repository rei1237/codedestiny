import { readFileSync, writeFileSync } from 'node:fs';
import { parse } from 'parse5';
import { FEATURE_KEY_PRICE_TABLE } from '../../worker/lib/paid-feature-registry.js';
import { CURRENT_PASS_PLANS } from '../../lib/payment/pass-policy.js';

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
  homeMore: byClass('cd-home-more'),
  feedback: byId('cdFeedbackGate'),
  finder: byId('cdFinder'),
  diary: byId('cdDiaryPlannerEntry'),
  experts: byId('cdAiFeatures'),
};

const vars = Object.fromEntries(Object.entries(nodes).map(([key, node]) => [key, htmlOf(node, key)]));
const won = value => Number(value).toLocaleString('ko-KR') + '원';
vars.pass = `<section class="cdh-pass" aria-labelledby="cdhPassTitle" data-design-marker="moonlight-pass-banner-v20260626">
  <div class="cdh-pass__intro">
    <img class="cdh-pass__mascot" src="/images/home/yeoni-pass-mascot-240.webp" srcset="/images/home/yeoni-pass-mascot-240.webp 240w, /images/home/yeoni-pass-mascot-480.webp 480w" sizes="(max-width: 640px) 104px, 168px" alt="이용권 카드를 들고 웃는 꽃돼지 연이" width="240" height="240" loading="lazy" decoding="async">
    <div class="cdh-pass__copy">
      <span class="cdh-pass__eyebrow">자동갱신 없는 30일 이용권</span>
      <h2 class="cdh-pass__title" id="cdhPassTitle">자주 보신다면, 30일 이용권</h2>
      <p class="cdh-pass__desc">상담 가격만큼 한도에서 차감돼요. 30일이 지나면 자동으로 끝나요.</p>
    </div>
  </div>
  <ul class="cdh-pass__tiers" role="list">${Object.values(CURRENT_PASS_PLANS).map(plan => `
    <li class="cdh-pass__tier${plan.tier === 'family' ? ' cdh-pass__tier--family' : ''}"><a class="cdh-pass__tier-link" href="/points/?source=flower-membership&amp;plan=${plan.tier}">
      ${plan.tier === 'family' ? '<span class="cdh-pass__badge">영냥이까지</span>' : ''}<span class="cdh-pass__tier-name">${plan.name}</span>
      <strong class="cdh-pass__tier-price">${won(plan.wonPrice)}<small> / 30일</small></strong>
      <span class="cdh-pass__tier-line">${plan.tier === 'family' ? '유료 리딩 건당 한도 없음' : `건당 ${won(plan.maxCoveredCoin * 100)} 이하`}</span>
      <span class="cdh-pass__tier-line">누적 ${won(plan.monthlyLimitCoin * 100)}까지</span>
      <span class="cdh-pass__tier-line">${plan.profileLimit === 0 ? '프로필 무제한' : `프로필 최대 ${plan.profileLimit}개`}</span>
    </a></li>`).join('')}
  </ul>
  <p class="cdh-pass__note">Standard·Premium·VVIP는 꽃돼지 운세에, Family는 꽃돼지와 영냥이 유료 리딩에 적용됩니다. 기존에 구매한 이용권은 구매 당시 조건을 유지합니다.</p>
  <a class="cdh-pass__btn" href="/points/?source=flower-membership">이용권 4종 확인하기</a>
</section>`;
vars.representativePrice = Number(FEATURE_KEY_PRICE_TABLE['yeongnyangi-saju-mackerel'].amountKRW).toLocaleString('ko-KR') + '원';
const records = JSON.parse(readFileSync('lib/brand/prediction-records.json','utf8'));
vars.predictionRecords = records.map(record => '<li><a href="'+record.url+'" target="_blank" rel="noopener noreferrer">'+record.date+' · '+record.title+'</a></li>').join('');
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
