export const TEA_SAJU_URL = '/fortune-tea-house/?mode=saju&reading=joint&entry=saju-analysis';
export const TEA_SAJU_DRAFT_KEY = 'cd_tea_saju_entry_v1';
const TTL = 30 * 60 * 1000;

// Only a question and profile reference cross the entry boundary. Birth data is
// selected from the signed-in user's profiles in the tea room, never from a URL.
export function writeSajuTeaDraft(storage, { owner = '', profileId = '', question = '' }, now = Date.now()) {
  try {
    storage.setItem(TEA_SAJU_DRAFT_KEY, JSON.stringify({ owner: String(owner), at: now,
      profileId: String(profileId).slice(0, 120), question: String(question).slice(0, 1000) }));
  } catch { /* Navigation still works without optional storage. */ }
}

export function readSajuTeaDraft(storage, owner = '', now = Date.now()) {
  try {
    const raw = storage.getItem(TEA_SAJU_DRAFT_KEY);
    storage.removeItem(TEA_SAJU_DRAFT_KEY);
    const saved = JSON.parse(raw || 'null');
    if (!saved || saved.owner !== String(owner) || !Number.isFinite(saved.at) || now < saved.at || now - saved.at > TTL) return null;
    return { consultationMode: 'saju', concernTopic: '사주 전문 상담',
      question: typeof saved.question === 'string' ? saved.question.slice(0, 1000) : '',
      ...(owner && typeof saved.profileId === 'string' ? { profileId: saved.profileId.slice(0, 120) } : {}) };
  } catch { return null; }
}

export function teaSajuEntryMarkup() {
  return `<section class="saju-tea-entry" aria-labelledby="sajuTeaEntryTitle">
    <picture class="saju-tea-entry__art"><source media="(max-width: 600px)" srcset="/images/consultation/saju-yeoni-neo-joint-v1-640.webp"><img src="/images/consultation/saju-yeoni-neo-joint-v1-1280.webp" width="1280" height="853" loading="lazy" decoding="async" alt="연이가 펼친 명식을 인간형 네오가 함께 살펴보며 중요한 부분을 짚는 모습"></picture>
    <div class="saju-tea-entry__copy"><h3 id="sajuTeaEntryTitle">연이와 네오,<br>내 사주를 함께 펼치다</h3>
      <p class="saju-tea-entry__product">연이·네오 공동 사주 상담 · 별도 상품</p>
      <p>명식만으로 풀리지 않는 고민이 있나요? 일과 돈, 관계와 건강·회복 리듬까지 내 질문과 연결해 깊이 살펴봐요.</p>
      <dl class="saju-tea-entry__roles"><div><dt>연이</dt><dd>마음의 결과 반복되는 패턴을 살펴봐요.</dd></div><div><dt>네오</dt><dd>중요한 선택과 실행할 순서를 짚어드립니다.</dd></div></dl>
      <a class="saju-tea-entry__cta" data-tea-saju-open href="${TEA_SAJU_URL}">내 고민, 사주로 깊이 상담하기 <span aria-hidden="true">→</span></a>
      <p class="saju-tea-entry__price">단건 결제 <strong data-tea-saju-price>가격 확인 중</strong> · 이용권·월정석은 결제창에서 확인</p>
      <p class="saju-tea-entry__note">연이의 해석과 네오의 전략, 함께 정리하는 30일 계획을 담은 AI 생성 상담입니다.</p>
      <details class="saju-tea-entry__details"><summary>상담에서 무엇을 볼 수 있나요?</summary><p>질문에 대한 핵심 답부터 명식의 근거, 직업·재물·연애·가족·건강과 회복 리듬, 질문에 관련된 대운·세운, 선택지와 실행 조언까지 읽어보세요. 전체 시기별 표를 읽는 대운 분석 리포트와는 별도 상담이에요.</p></details>
    </div></section>`;
}

export function mountTeaSajuEntry(root, context) {
  if (!root || root.querySelector('.saju-tea-entry')) return;
  root.insertAdjacentHTML('afterbegin', teaSajuEntryMarkup());
  root.querySelector('[data-tea-saju-open]').addEventListener('click', () => {
    try { writeSajuTeaDraft(window.sessionStorage, context()); } catch { /* Storage is optional. */ }
    window.cdTrack?.('consultation_entry_click', { service_id: 'fortune-tea-house-saju-joint-consultation', entry_location: 'saju-analysis', ux_version: 'joint-v1' });
  });
  Promise.resolve(window.CodeDestinyFeaturePricingStore?.getOrLoad?.('fortune-tea-house-saju-joint-consultation')).then(price => {
    const amount = Number(price?.amountKRW);
    root.querySelector('[data-tea-saju-price]').textContent = price?.displayPrice || (Number.isFinite(amount) && amount > 0 ? new Intl.NumberFormat('ko-KR').format(amount) + '원' : '찻집에서 가격 확인');
  }).catch(() => { root.querySelector('[data-tea-saju-price]').textContent = '찻집에서 가격 확인'; });
}
