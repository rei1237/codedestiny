import { NEO_EMAIL_SALE_ENABLED, neoMoney, neoUnitPrice, neoZiweiAddonPrice } from '../neo-consultation/contract.js';

const priceCopy = (key, amount, copy) => '<span data-cd-trans="home.guideCopy.' + key + '" data-cd-vars="' + JSON.stringify({ amount: amount.toLocaleString('ko-KR') }).replaceAll('"', '&quot;') + '">' + copy + '</span>';

export function renderNeoEmailHomeEntry() {
  return '<section class="cdh-neo-letter" aria-labelledby="cdhNeoLetterTitle" lang="ko">'
    + '<picture class="cdh-neo-letter__art" aria-hidden="true"><source media="(max-width:640px)" srcset="/images/service-introductions/neo-consultation-640.webp"><img src="/images/service-introductions/neo-consultation.webp" width="1536" height="1024" alt="" loading="lazy" decoding="async"></picture>'
    + '<div class="cdh-neo-letter__copy"><p class="cdh-neo-letter__method">직접 검수 · 이메일 상담</p><h2 id="cdhNeoLetterTitle">네오 작전 결정서</h2>'
    + '<p>현재 상황과 고민하는 선택을 남겨주세요. 네오가 직접 읽고 AI 분석을 활용해 작성·검수한 답변을 이메일로 전합니다.</p>'
    + '<p class="cdh-neo-letter__price">' + priceCopy('emailBase', neoUnitPrice(), '사주 질문당 ' + neoMoney(neoUnitPrice()) + ' · 단건 결제') + '</p>'
    + '<a href="/yeongnyangi/neo-decision/"><span>질문 작성하기</span> <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M4 12h16m-6-6 6 6-6 6"/></svg></a>'
    + '<small>' + (NEO_EMAIL_SALE_ENABLED ? '실시간 채팅이 아닌 이메일 상담입니다.' : '판매 준비 중 · 실제 결제와 접수는 아직 열리지 않았어요.') + '</small>'
    + '<details class="cdh-neo-letter__details"><summary>풀이 구성·답변 안내</summary><p>' + priceCopy('emailZiwei', neoUnitPrice() + neoZiweiAddonPrice(), '사주 + 자미두수 질문당 ' + neoMoney(neoUnitPrice() + neoZiweiAddonPrice())) + '</p>'
    + (NEO_EMAIL_SALE_ENABLED ? '<p>보통 24시간, 접수가 몰리면 3일 이내 이메일 답변 · 하루 질문 30개</p>' : '') + '</details></div></section>';
}
