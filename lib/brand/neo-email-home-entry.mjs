import { NEO_EMAIL_PORTRAIT, NEO_EMAIL_SALE_ENABLED, neoMoney, neoUnitPrice } from '../neo-consultation/contract.js';

export function renderNeoEmailHomeEntry() {
  return '<section class="cdh-neo-letter" aria-labelledby="cdhNeoLetterTitle" lang="ko">'
    + '<picture class="cdh-neo-letter__art" aria-hidden="true"><source media="(max-width:640px)" srcset="/images/neo-consultation/moonlight-garden-768.webp"><img src="/images/neo-consultation/moonlight-garden-1536.webp" width="1536" height="1024" alt="" loading="lazy" decoding="async"></picture>'
    + '<div class="cdh-neo-letter__copy"><h2 id="cdhNeoLetterTitle">네오에게 물어봐</h2>'
    + '<p class="cdh-neo-letter__lead">마음은 깊게 읽고,<br>선택은 선명하게.</p>'
    + '<p>질문 하나씩, 네오가 직접 검수해 이메일로 답합니다.</p>'
    + '<p class="cdh-neo-letter__price">질문당 ' + neoMoney(neoUnitPrice()) + ' · 단건 결제</p>'
    + '<a href="/neo-consultation/">질문 작성하기 <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M4 12h16m-6-6 6 6-6 6"/></svg></a>'
    + '<small>' + (NEO_EMAIL_SALE_ENABLED ? '보통 24시간, 접수가 몰리면 3일 이내 이메일 답변 · 하루 질문 30개' : '판매 준비 중 · 실제 결제와 접수는 아직 열리지 않았어요.') + '</small></div>'
    + '<figure><img src="' + NEO_EMAIL_PORTRAIT + '" width="600" height="720" loading="lazy" decoding="async" alt="은빛 머리의 인간형 네오 캐릭터"><figcaption>네오가 직접 읽고 검수하는 이메일 상담</figcaption></figure></section>';
}
