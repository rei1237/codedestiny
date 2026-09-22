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
  pass: byClass('membership-recap-cta', (_node, values) => values['data-design-marker'] === 'moonlight-pass-banner-v20260626'),
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
vars.pass = `<section class="membership-recap-cta" aria-label="꽃돼지 서비스 전용 이용권" data-design-marker="moonlight-pass-banner-v20260626">
  <span class="membership-recap-cta__eyebrow">꽃돼지 서비스 전용</span>
  <div class="membership-recap-cta__content">
    <div class="membership-recap-cta__copy">
      <h3 class="membership-recap-cta__title">반복 상담을 위한 30일 이용권</h3>
      <p class="membership-recap-cta__desc">자주 보는 꽃돼지 운세를 30일 이용권으로 이용할 수 있습니다. 영냥이는 단건 결제로 이용해 주세요.</p>
      <p class="membership-recap-cta__desc">자동갱신 없이 실제 상담 가격만큼 한도를 사용합니다. 기존에 구매한 이용권은 구매 당시 조건을 유지합니다.</p>
    </div>
    <ul class="membership-recap-cta__tiers" role="list">${Object.values(CURRENT_PASS_PLANS).map(plan => `
      <li class="membership-recap-cta__tier"><a class="membership-recap-cta__tier-link" href="/points/?source=flower-membership&amp;plan=${plan.tier}">
        <span class="membership-recap-cta__tier-name">${plan.name}</span>
        <strong class="membership-recap-cta__tier-price">30일 · ${won(plan.wonPrice)}</strong>
        <span class="membership-recap-cta__tier-line">건당 ${won(plan.maxCoveredCoin * 100)} 이하</span>
        <span class="membership-recap-cta__tier-benefit">누적 ${won(plan.monthlyLimitCoin * 100)}까지</span>
        <span class="membership-recap-cta__tier-benefit">프로필 최대 ${plan.profileLimit}개</span>
      </a></li>`).join('')}
    </ul>
    <a class="membership-recap-cta__btn" href="/points/?source=flower-membership">이용권 3종 확인하기</a>
  </div>
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
