// Display copy only. Shared by React homes, the generated shell and FAQ/JSON-LD.
// Basis: founder.ts; fortune/saju/runtime.ts -> calculateNatalSaju + life-book-ai-saju;
// each domain owns its interpretation; neo-consultation/policy.js owns human delivery.
export const CONSULTATION_METHOD_INTRO = '어느 입구로 오셔도, 박병하(네오)가 설계한 풀이 기준을 만나요.';
export const CONSULTATION_METHOD_FAQS = [
  {
    question: '선생님의 풀이 기준이 담긴 상담은 어디에서 받나요?',
    answer: '영냥이와 꿀꿀운세의 운세·상담에는 박병하(네오)가 설계한 풀이 기준이 반영돼요. 네오에게 물어봐 이메일 상담도 같은 상담 경험을 바탕으로 해요. 이름이 달라서 다른 선생님의 풀이인 것은 아니에요. 다만 사주·타로·점성술 등은 각각의 체계로 읽으며, 상품마다 다루는 질문과 해석 범위가 달라요.',
  },
  {
    question: '영냥이·꿀꿀운세·네오, 어떻게 고르면 되나요?',
    answer: '꿀꿀운세는 여러 운세와 상담을 모아 둔 서비스예요. 질문과 상황을 적고 AI 해설을 챕터로 읽고 싶다면 영냥이, 연애·한 해·인생처럼 주제별 도구와 리포트를 고르고 싶다면 꿀꿀운세로 들어오세요. 접수 내용을 네오가 직접 읽고 작성·검수한 답변을 원한다면 네오에게 물어봐 이메일 상담을 선택해요.',
  },
  {
    question: '네오의 AI 상담과 직접 검수 상담은 무엇이 다른가요?',
    answer: '네오의 팩폭 전략실은 풀이 자료를 바탕으로 AI가 해설하는 상담이에요. 네오에게 물어봐는 네오가 접수 내용을 직접 읽고 AI 분석을 활용해 답변을 작성·검수한 뒤 이메일로 전해요. 실시간 채팅·전화·대면 상담은 아니에요. 풀이 기준을 설계했다는 안내가 모든 AI 결과를 사람이 직접 검토한다는 뜻은 아니에요.',
  },
];
export const CONSULTATION_METHOD_OPTIONS = [
  {name:'영냥이',need:'내 질문을 중심으로',format:'질문·상황을 반영한 AI 해설을 챕터로 읽어요.',href:'/yeongnyangi/',action:'영냥이 상담 보기'},
  {name:'꿀꿀운세',need:'주제를 골라 살펴보기',format:'여러 운세 도구와 주제별 AI 리포트를 골라요.',href:'/ggulggul/',action:'주제별 상담 보기'},
  {name:'네오에게 물어봐',need:'직접 검수한 답변 받기',format:'네오가 AI 분석을 활용해 작성·검수하고 이메일로 전해요.',href:'/neo-consultation/',action:'이메일 상담 안내 보기'},
];
const escape = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function renderConsultationMethodGuide(id = 'consultation-methods') {
  return `<section class="consultation-methods" lang="ko" aria-labelledby="${escape(id)}"><h2 id="${escape(id)}">풀이 기준은 함께,<br>상담 방식은 나에게 맞게</h2><p class="consultation-methods__intro">${CONSULTATION_METHOD_INTRO}</p><details><summary>영냥이·꿀꿀운세·네오, 어떤 상담을 고를까요?</summary><p class="consultation-methods__basis">${CONSULTATION_METHOD_FAQS[0].answer}</p><dl>${CONSULTATION_METHOD_OPTIONS.map(item=>`<div><dt>${item.name}<span>${item.need}</span></dt><dd><p>${item.format}</p><a href="${item.href}">${item.action}<span aria-hidden="true"> →</span></a></dd></div>`).join('')}</dl><p class="consultation-methods__note">네오의 팩폭 전략실은 AI 상담이에요. 직접 검수·이메일 전달은 ‘네오에게 물어봐’에서 안내해요.</p><p class="consultation-methods__note">선택한 상담의 구성과 예시를 살펴본 뒤, 가격과 이용권·월정석·단건 결제 적용 여부를 확인해 주세요.</p><a class="consultation-methods__samples" href="/consultation-samples/">상담 결과 예시 비교하기 →</a></details></section>`;
}
