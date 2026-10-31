import { NEO_EMAIL_SALE_ENABLED, neoMoney, neoUnitPrice, neoZiweiAddonPrice } from '../neo-consultation/contract.js';

const priceCopy = (key, amount, copy) => '<span data-cd-trans="home.guideCopy.' + key + '" data-cd-vars="' + JSON.stringify({ amount: amount.toLocaleString('ko-KR') }).replaceAll('"', '&quot;') + '">' + copy + '</span>';

export function renderNeoEmailHomeEntry() {
  return '<section class="cdh-neo-letter cdh-choice-card cdh-choice-card--neo" aria-labelledby="cdhNeoLetterTitle">'
    + '<picture class="cdh-neo-letter__art cdh-choice-card__art cdh-choice-card__art--neo" aria-hidden="true"><img src="/images/service-introductions/neo-consultation-640.webp" srcset="/images/service-introductions/neo-consultation-320.webp 320w, /images/service-introductions/neo-consultation-640.webp 640w, /images/service-introductions/neo-consultation-960.webp 960w" sizes="(max-width: 640px) calc(100vw - 62px), (max-width: 1100px) 180px, 220px" width="640" height="427" alt="" loading="lazy" decoding="async"></picture>'
    + '<div class="cdh-neo-letter__copy cdh-choice-card__copy"><h3 id="cdhNeoLetterTitle" data-cd-trans="home.consultChoice.neo.title">네오 작전 결정서</h3><p class="cdh-neo-letter__method cdh-choice-card__method" data-cd-trans="home.consultChoice.neo.method">AI 작성 · 사람 검수 · 이메일 전달</p>'
    + '<p data-cd-trans="home.consultChoice.neo.body">한 가지 선택의 기준과 실행안을 더 구체적으로 알고 싶다면 이용해 보세요. AI가 답변을 작성하고 사람이 검수해 이메일로 전해드려요.</p>'
    + '<small data-cd-trans="' + (NEO_EMAIL_SALE_ENABLED ? 'home.consultChoice.neo.note' : 'home.consultChoice.neo.saleClosed') + '">' + (NEO_EMAIL_SALE_ENABLED ? '검수한 답변을 이메일로 받는 상담이에요.' : '판매 준비 중 · 실제 결제와 접수는 아직 열리지 않았어요.') + '</small>'
    + '<details class="cdh-neo-letter__details"><summary>풀이 구성·답변 안내</summary><p class="cdh-neo-letter__price">' + priceCopy('emailBase', neoUnitPrice(), '사주 질문당 ' + neoMoney(neoUnitPrice()) + ' · 단건 결제') + '</p><p>' + priceCopy('emailZiwei', neoUnitPrice() + neoZiweiAddonPrice(), '사주 + 자미두수 질문당 ' + neoMoney(neoUnitPrice() + neoZiweiAddonPrice())) + '</p>'
    + (NEO_EMAIL_SALE_ENABLED ? '<p>보통 24시간, 접수가 몰리면 3일 이내 이메일 답변 · 하루 질문 30개</p>' : '') + '</details>'
    + '<a class="cdh-choice-card__cta" href="/neo-consultation/"><span data-cd-trans="home.consultChoice.neo.cta">네오에게 질문하기</span> <span aria-hidden="true">→</span></a>'
    + '</div></section>';
}
