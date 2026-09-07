import { PASS_MONTHLY_WON } from '../../../lib/payment/pass-pricing.js';
import { PASS_LIMITS_KRW, MONTHLY_PASS_LIMITS_KRW } from '../../../worker/lib/profile-limits.js';

// Offline presentation prototype. No auth, payment, profile or LLM runtime is loaded.
const registry = window.__cdServiceRegistry;
const money = value => `${value.toLocaleString('ko-KR')}원`;
const el = (tag, text, className) => {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  return node;
};
const byId = id => document.getElementById(id);
const max = PASS_LIMITS_KRW.standard;
const budget = MONTHLY_PASS_LIMITS_KRW.standard;
const count = Math.floor(budget / max);
byId('single-total').textContent = money(max * count);
byId('single-equation').textContent = `${money(max)} 리딩 × ${count}회`;
byId('pass-price').textContent = money(PASS_MONTHLY_WON.standard);
byId('pass-conditions').textContent = `건당 ${money(max)} 이하 · 월 이용 한도 ${money(budget)} · 해당 가격 리딩만 이용하면 최대 ${count}회. 30일 만료 또는 한도 소진 시 종료됩니다.`;

const demo = title => { byId('demo-title').textContent = title; byId('demo').showModal(); };
document.addEventListener('click', event => {
  const button = event.target.closest('[data-demo]');
  if (button) demo(button.dataset.demo);
});
const intents = [
  ['☼', '오늘 운세', '오늘 조심할 것과 잡아야 할 기회', '무료', 'today'],
  ['◇', '재물·직업', '돈, 이직, 사업 흐름', '무료·유료', 'money'],
  ['♡', '연애·궁합', '상대 마음, 관계 흐름, 인연', '무료·유료', 'love'],
  ['✧', '내 사주 깊게 보기', '성격, 대운, 올해 흐름', '무료·유료', 'self'],
  ['♧', '타로·신탁', '지금 고민을 바로 묻기', '무료·유료', 'tarot'],
  ['⌕', '전체 서비스', '자미두수·숙요점·베다점·점성술까지', '가격·방식별 찾기', ''],
];
for (const [icon, title, desc, price, filter] of intents) {
  const link = el('a', '', 'intent'); link.href = `#services/${filter}`;
  link.append(el('span', icon, 'intent-icon'));
  const copy = el('div', '', 'intent-copy');
  copy.append(el('h3', title), el('p', desc), el('span', price, `badge ${price === '무료' ? 'free' : ''}`));
  link.append(copy, el('span', '보기 ›', 'conditions')); byId('intent-list').append(link);
}
function reading(item, situation) {
  const card = el('article', '', 'reading');
  card.append(el('p', item.name, 'reading-name'), el('h3', situation || item.name));
  const free = /무료/.test(item.price || '');
  const badges = el('div');
  badges.append(el('span', item.price || '서비스에서 확인', `badge ${free ? 'free' : 'paid'}`));
  if (item.featureKey && !free) {
    const prices = [...item.price.matchAll(/[\d,]+(?=원)/g)].map(match => Number(match[0].replaceAll(',', '')));
    const cost = Math.max(...prices);
    const tier = ['standard', 'premium', 'vvip', 'family'].find(tier => PASS_LIMITS_KRW[tier] >= cost);
    const names = { standard: '스탠다드', premium: '프리미엄', vvip: 'VVIP', family: '패밀리' };
    badges.append(el('span', `${names[tier]} 이용권 · 한도 내`, 'badge'));
  }
  card.append(badges, el('p', item.desc));
  const forms = { 'fusion-fortune': '긴 리포트', 'fortune-tea-house': '선택한 방식의 상담 리포트', 'love-secret-ai': '연애 흐름 분석', nakshatra: '베다 별자리 해석' };
  if (forms[item.id]) card.append(el('p', `받는 결과 · ${forms[item.id]}`, 'conditions'));
  const button = el('button', free ? '무료로 결과 보기 ↗' : '상담 살펴보기 ↗', 'text-link');
  button.style.background = 'transparent'; button.style.color = 'inherit';
  button.dataset.demo = `${item.name} · 기존 ${item.href || item.action} 진입`;
  card.append(button); return card;
}
const picks = [ ['fusion-fortune', '서로 다른 운세가 헷갈릴 때'], ['fortune-tea-house', '누군가에게 마음을 털어놓고 싶을 때'], ['love-secret-ai', '상대 마음과 내 선택이 헷갈릴 때'], ['nakshatra', '나도 몰랐던 나의 결을 알고 싶을 때'] ];
for (const [id, title] of picks) byId('featured-list').append(reading(registry.find(item => item.id === id), title));

function search() {
  const query = byId('service-search').value.trim().toLowerCase();
  const purpose = byId('purpose').value, method = byId('method').value, price = byId('price').value;
  const items = registry.filter(item => {
    const free = /무료/.test(item.price || '');
    return `${item.name} ${item.desc} ${item.keys}`.toLowerCase().includes(query)
      && (!purpose || item.purposes?.includes(purpose)) && (!method || item.methods?.includes(method))
      && (!price || (price === 'free' ? free : !free && item.featureKey));
  });
  byId('search-count').textContent = `${items.length}개 서비스`;
  byId('search-results').replaceChildren(...items.map(item => reading(item)));
  if (!items.length) byId('search-results').append(el('p', '일치하는 서비스가 없어요. 검색어나 필터를 바꿔보세요.'));
}
for (const id of ['service-search', 'purpose', 'method', 'price']) byId(id).addEventListener('input', search);
byId('search-preview').addEventListener('submit', event => { event.preventDefault(); byId('service-search').value = byId('home-search').value; location.hash = 'services'; });

const policies = {
  terms: ['이용약관', [['이용 기준', '서비스의 범위와 이용자의 권리'], ['유료 이용', '이용권·월정석·단건 결제'], ['문제 해결', '환불·청약철회와 문의']], ['서비스 내용과 이용 기준', '무료 체험 및 유료 이용권', '환불 및 청약철회', '권리·의무와 책임 제한']],
  privacy: ['개인정보처리방침', [['수집 목적', '어떤 정보를 왜 사용하는지'], ['보관·삭제', '보관 기간과 이용자 권리'], ['문의', '개인정보 권리행사 방법']], ['로그인 전·후 수집 항목과 이용 목적', '프로필 카드 삭제와 보관 기간', '쿠키·광고와 처리 위탁', '개인정보 문의와 권리행사']],
  refund: ['환불·취소 안내', [['단건 결제', '콘텐츠 제공·사용 여부 확인'], ['이용권', '기간·사용 내역 기준 확인'], ['결제 오류', '결제 내역을 기준으로 문의']], ['단건 결제와 이미 사용한 콘텐츠', '이용권 환불·청약철회', 'PG 결제 후 반영 지연', '모바일 결제 후 돌아오기', '고객센터 문의']],
  contact: ['고객센터', [['이용 문의', '서비스와 오류 신고'], ['결제 문의', '결제 내역과 이용 상황'], ['개인정보', '권리행사 요청 안내']], ['결제·이용권 문의', '결과가 보이지 않거나 복귀가 안 될 때', '프로필·개인정보 문의', '이메일·문의 폼']],
  about: ['사람이 설계한 기준, 다정한 해석', [['만드는 사람', '10년 경력 명리학자'], ['계산과 표현', '고전 규칙과 AI의 역할'], ['교차검증', '여러 체계의 공통점과 차이']], ['만드는 사람과 검수 기준', 'AI가 하는 일, 사람이 설계한 기준', '교차검증을 읽는 방법', '미래의 확정이 아닌 선택의 참고 자료']],
  faq: ['자주 묻는 질문', [['처음이라면', '무료 운세와 시작 방법'], ['유료 이용', '이용권과 단건 결제'], ['도움이 필요할 때', '결제·프로필·개인정보']], ['무료로 어디까지 볼 수 있나요?', '이용권은 자동으로 결제되나요?', '리딩을 열지 못했어요', '프로필 카드는 어떻게 관리하나요?']],
};
function showPolicy(key) {
  const [title, summaries, topics] = policies[key] || policies.terms;
  byId('policy-title').textContent = title;
  byId('policy-summary').replaceChildren(...summaries.map(([title, body]) => {
    const item = el('article'); item.append(el('h2', title), el('p', body)); return item;
  }));
  byId('policy-body').replaceChildren(...topics.map((title, index) => {
    const item = el('details'); item.open = index === 0;
    item.append(el('summary', title), el('p', key === 'about' ? '고전 규칙에 기반한 계산과 사람이 설계한 해석 기준을 바탕으로, AI가 결과를 읽기 쉬운 언어로 정리합니다. 운세는 선택을 돕는 참고 자료입니다.' : '이 위치에는 기존 정책 본문의 해당 항목을 그대로 표시합니다. 요약과 전문을 분리해, 필요한 기준을 먼저 찾고 자세한 내용을 읽을 수 있도록 구성했습니다.'));
    return item;
  }));
  document.querySelectorAll('.policy-tabs a').forEach(link => { if (link.hash === `#policy/${key}`) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current'); });
}
function route() {
  const [page, key] = location.hash.slice(1).split('/');
  const target = page === 'policy' ? 'policy' : page === 'services' ? 'services' : 'home';
  document.querySelectorAll('.page').forEach(node => node.hidden = node.id !== target);
  if (target === 'policy') showPolicy(key);
  if (target === 'services') {
    byId('purpose').value = key && key !== 'tarot' ? key : '';
    byId('method').value = key === 'tarot' ? 'tarot' : ''; search();
  }
  document.querySelectorAll('.bottom-nav a').forEach(link => { if (link.hash === `#${page || 'home'}`) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current'); });
  if (page === 'pass' || page === 'featured') byId(page).scrollIntoView(); else window.scrollTo(0, 0);
}
window.addEventListener('hashchange', route); route();
