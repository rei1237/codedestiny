import { readFileSync, writeFileSync } from 'node:fs';
import vm from 'node:vm';
import { parse } from 'parse5';

// Presentation is generated at build time. Prices and pass limits keep their existing owners.
const sourceModule = async (file) => import(`data:text/javascript;base64,${Buffer.from(readFileSync(file, 'utf8')).toString('base64')}`);
const { PASS_MONTHLY_WON } = await sourceModule('lib/payment/pass-pricing.js');
const { PASS_LIMITS_KRW, MONTHLY_PASS_LIMITS_KRW } = await sourceModule('worker/lib/profile-limits.js');
const context = { window: {} };
vm.runInNewContext(readFileSync('js/core/service-registry.js', 'utf8'), context);
const registry = context.window.__cdServiceRegistry;
const escape = (text) => String(text).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const won = value => `${value.toLocaleString('ko-KR')}원`;
const get = id => { const item = registry.find(item => item.id === id); if (!item) throw new Error(`Missing service ${id}`); return item; };
const cards = [
  ['fusion-fortune', '서로 다른 운세가 헷갈릴 때', '긴 리포트'],
  ['fortune-tea-house', '마음을 털어놓고 싶을 때', '선택한 방식의 상담 리포트'],
  ['love-secret-ai', '상대 마음과 내 선택이 헷갈릴 때', '연애 흐름 분석'],
  ['nakshatra', '나도 몰랐던 나의 결이 궁금할 때', '베다 별자리 해석'],
];
const tierNames = { standard: '스탠다드', premium: '프리미엄', vvip: 'VVIP', family: '패밀리' };
const featured = cards.map(([id, situation, format]) => {
  const item = get(id), free = /무료/.test(item.price);
  const amounts = [...item.price.matchAll(/[\d,]+(?=원)/g)].map(match => Number(match[0].replaceAll(',', '')));
  const tier = Object.keys(tierNames).find(tier => PASS_LIMITS_KRW[tier] >= Math.max(...amounts));
  if (!free && (!tier || !item.featureKey)) throw new Error(`Unclassified price: ${id}`);
  // Match finder openerNode: preview only. Never arm a payment gate on a home card.
  const gate = free ? 'data-pvw-free="1"' : `data-feature-key="${escape(item.featureKey)}" data-pvw-paid="1"`;
  return `<article class="cdh-reading"><p class="cdh-reading-name">${escape(item.name)}</p><h3>${escape(situation)}</h3><div><span class="cdh-badge ${free ? 'cdh-free' : 'cdh-paid'}">${escape(item.price)}</span>${free ? '' : `<span class="cdh-badge">${tierNames[tier]} 이용권 · 한도 내</span>`}</div><p>${escape(item.desc)}</p><p class="cdh-note">받는 결과 · ${escape(format)}</p><a class="cdh-link" href="${escape(item.href)}" ${gate}>${free ? '무료로 결과 보기' : '상담 살펴보기'} ↗</a></article>`;
}).join('\n');
const intents = [
  ['☼','오늘 운세','오늘 조심할 것과 잡아야 할 기회','무료','#destinyCardForm','data-cdh-free'],
  ['◇','재물·직업','돈, 이직, 사업 흐름','무료·유료','#services/money',''],
  ['♡','연애·궁합','상대 마음, 관계 흐름, 인연','무료·유료','#services/love',''],
  ['✧','내 사주 깊게 보기','성격, 대운, 올해 흐름','무료·유료','#services/self',''],
  ['♧','타로·신탁','지금 고민을 바로 묻기','무료·유료','#services/tarot',''],
  ['⌕','전체 서비스','자미두수·숙요점·베다점·점성술까지','가격·방식별 찾기','#services',''],
].map(([icon,title,desc,price,href,attrs]) => `<a class="cdh-intent" href="${href}" ${attrs}><span class="cdh-intent-icon" aria-hidden="true">${icon}</span><span><strong>${title}</strong><span class="cdh-intent-desc">${desc}</span><span class="cdh-badge ${price==='무료'?'cdh-free':''}">${price}</span></span><span class="cdh-intent-go" aria-hidden="true">보기 ›</span></a>`).join('\n');
const original = readFileSync('index.html', 'utf8');
const doc = parse(original, { sourceCodeLocationInfo: true });
function find(node, id) { if (node.attrs?.some(a=>a.name==='id' && a.value===id)) return node; for(const child of node.childNodes || []) {const result=find(child,id);if(result)return result;} }
const finder = find(doc, 'cdFinder')?.sourceCodeLocation;
if (!finder) throw new Error('Existing service finder is required');
const finderHtml = original.slice(finder.startOffset, finder.endOffset);
const unit = PASS_LIMITS_KRW.standard, budget = MONTHLY_PASS_LIMITS_KRW.standard, count = Math.floor(budget / unit);
const vars = {unit:won(unit),budget:won(budget),count,total:won(unit*count),passPrice:won(PASS_MONTHLY_WON.standard),featured,intents,finder:finderHtml};
const html = readFileSync('templates/home-funnel.html','utf8').replace(/\{\{(\w+)\}\}/g,(_,key)=> { if (!(key in vars)) throw new Error(`Unknown token: ${key}`); return vars[key]; });
const marker = /<!-- cd-home-funnel:start[\s\S]*?<!-- cd-home-funnel:end -->/;
let updated;
if (marker.test(original)) updated = original.replace(marker,html.trimEnd());
else {
  updated = original.slice(0,finder.startOffset) + '<!-- Service finder moved intact into #cdhServices. -->' + original.slice(finder.endOffset);
  updated = updated.replace('    <header class="logo-area" role="banner">',html+'\n    <header class="logo-area" role="banner">');
}
if(process.argv.includes('--check')) { if(original!==updated) throw new Error('Home funnel needs regeneration'); console.log('[home-funnel] current'); }
else { writeFileSync('index.html',updated); console.log('[home-funnel] generated from existing pricing and service registry'); }
