// Display copy only. Shared by React homes, the generated shell and FAQ/JSON-LD.
// Basis: founder.ts; fortune/saju/runtime.ts -> calculateNatalSaju + life-book-ai-saju;
// each domain owns its interpretation; neo-consultation/policy.js owns human delivery.
export const CONSULTATION_METHOD_INTRO = '어느 입구로 오셔도, 박병하(네오)가 설계한 풀이 기준을 만나요.';
export const CONSULTATION_METHOD_FAQS = [
  {
    question: '선생님의 풀이 기준이 담긴 상담은 어디에서 받나요?',
    answer: '영냥이와 꿀꿀운세의 운세·상담에는 박병하(네오)가 설계한 풀이 기준이 반영돼요. 네오 작전 결정서 이메일 상담도 같은 상담 경험을 바탕으로 해요. 이름이 달라서 다른 선생님의 풀이인 것은 아니에요. 다만 사주·타로·점성술 등은 각각의 체계로 읽으며, 상품마다 다루는 질문과 해석 범위가 달라요.',
  },
  {
    question: '영냥이·꿀꿀운세·네오, 어떻게 고르면 되나요?',
    answer: '꿀꿀운세는 여러 운세와 상담을 모아 둔 서비스예요. 질문과 상황을 적고 AI 해설을 챕터로 읽고 싶다면 영냥이, 연애·한 해·인생처럼 주제별 도구와 리포트를 고르고 싶다면 꿀꿀운세로 들어오세요. 접수 내용을 네오가 직접 읽고 작성·검수한 답변을 원한다면 네오 작전 결정서 이메일 상담을 선택해요.',
  },
  {
    question: '네오의 AI 상담과 직접 검수 상담은 무엇이 다른가요?',
    answer: '네오의 팩폭 전략실은 풀이 자료를 바탕으로 AI가 해설하는 상담이에요. 네오 작전 결정서는 네오가 접수 내용을 직접 읽고 AI 분석을 활용해 답변을 작성·검수한 뒤 이메일로 전해요. 실시간 채팅·전화·대면 상담은 아니에요. 풀이 기준을 설계했다는 안내가 모든 AI 결과를 사람이 직접 검토한다는 뜻은 아니에요.',
  },
];
export const CONSULTATION_METHOD_OPTIONS = [
  {image:'/assets/yeongnyangi/original/hero-480.webp',imageAlt:'보랏빛 모자를 쓰고 질문을 듣는 영냥이',name:'영냥이',need:'내 질문을 중심으로',format:'질문·상황을 반영한 AI 해설을 챕터로 읽어요.',href:'/yeongnyangi/',action:'영냥이 상담 보기'},
  {image:'/images/home/illustrated/yeoni-character-480.webp',imageAlt:'운세를 안내하는 꽃돼지 연이',name:'꿀꿀운세',need:'주제를 골라 살펴보기',format:'여러 운세 도구와 주제별 AI 리포트를 골라요.',href:'/ggulggul/',action:'주제별 상담 보기'},
  {image:'/images/service-introductions/neo-consultation-640.webp',imageAlt:'상담 자료와 편지를 검토하는 네오',name:'네오 작전 결정서',need:'직접 검수한 답변 받기',format:'네오가 직접 읽고 작성·검수해 이메일로 전해요.',href:'/neo-consultation/',action:'이메일 상담 안내 보기'},
];
const escape = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function renderMemo() {
  return `<aside class="consultation-memo" aria-label="상담 전에 알아두세요"><span class="consultation-memo__seal" aria-hidden="true"></span><h3>상담 전에 알아두세요</h3><dl class="consultation-memo__notes"><div><dt>풀이 기준</dt><dd>${escape(CONSULTATION_METHOD_FAQS[0].answer)}</dd></div><div><dt>AI와 직접 검수의 차이</dt><dd>${escape(CONSULTATION_METHOD_FAQS[2].answer)}</dd></div><div><dt>이용 조건 확인</dt><dd>선택한 상담의 구성과 예시를 살펴본 뒤, 가격과 이용권·월정석·단건 결제 적용 여부를 확인해 주세요.</dd></div></dl></aside>`;
}

const ENTRY_TUTORIALS = [
  {
    key: 'ggulggul', option: CONSULTATION_METHOD_OPTIONS[1], name: '꿀꿀 운세',
    title: '보고 싶은 주제부터 골라요',
    description: '사주·타로 같은 운세 도구와 연애·재물·신년운세 등 주제별 리포트를 한곳에서 살펴보는 서비스예요.',
    example: '“올해 일과 돈의 흐름을 알고 싶어요.”',
    steps: ['관심 있는 주제나 운세 도구를 골라요.', '선택한 도구가 요청하는 출생정보나 질문을 입력해요.', '결과를 읽거나, 더 깊이 보고 싶은 상담의 구성과 이용 조건을 확인해요.'],
    result: '선택한 도구의 운세 결과 또는 주제별 AI 리포트를 받아요.',
  },
  {
    key: 'yeongnyangi', option: CONSULTATION_METHOD_OPTIONS[0], name: '영냥이',
    title: '내 상황과 질문을 깊이 풀어요',
    description: '내가 처한 상황과 구체적인 질문을 바탕으로, 선택한 운세 체계의 AI 해설을 챕터별로 읽는 상담 서비스예요.',
    example: '“이직 제안을 받았어요. 무엇을 기준으로 결정하면 좋을까요?”',
    steps: ['고민에 맞는 상담 종류와 구성을 살펴봐요.', '질문·현재 상황과 상담에 필요한 정보를 입력해요.', '이용 조건을 확인한 뒤, 완성된 해설을 챕터별로 읽어요.'],
    result: '질문에 대한 해석, 그 근거와 현실적인 행동 조언을 받아요.',
  },
];

function renderEntryTutorial(id) {
  const tutorials = ENTRY_TUTORIALS.map(item => `<article class="consultation-tutorial__service" aria-labelledby="${escape(id)}-${item.key}">
    <header><img src="${item.option.image}" alt="" width="72" height="72" loading="lazy" decoding="async"><div><h3 id="${escape(id)}-${item.key}">${item.name}</h3><p class="consultation-tutorial__purpose">${item.title}</p></div></header>
    <p>${item.description}</p>
    <p class="consultation-tutorial__example"><span>이런 고민이라면</span>${item.example}</p>
    <h4>이렇게 이용해요</h4><ol>${item.steps.map(step => `<li>${step}</li>`).join('')}</ol>
    <p class="consultation-tutorial__result"><strong>받게 되는 내용</strong>${item.result}</p>
  </article>`).join('');
  return `<section class="consultation-methods consultation-methods--entry" lang="ko" aria-labelledby="${escape(id)}"><details data-home-disclosure="guide" open><summary><span class="consultation-methods__question" id="${escape(id)}">처음 오셨다면, 이렇게 시작해요</span><span class="consultation-methods__toggle" aria-hidden="true"><span class="consultation-methods__open">펼쳐보기</span><span class="consultation-methods__close">접기</span><i></i></span></summary>
    <div class="consultation-methods__content consultation-tutorial"><p class="consultation-tutorial__intro">어떤 고민을 들려주고 싶으세요? 나에게 가까운 쪽을 천천히 살펴보고, 위의 카드에서 시작해 주세요.</p><div class="consultation-tutorial__services">${tutorials}</div>
    <aside class="consultation-tutorial__notes" aria-label="시작 전에 확인해 주세요"><h3>시작 전에 확인해 주세요</h3><p>무료 도구와 유료 상담의 범위는 서비스마다 달라요. 유료 상담은 구성과 가격, 이용권·월정석·단건 결제 적용 여부를 결제 전에 확인해 주세요.</p><p>AI 해설과 사람이 직접 검수하는 상담은 달라요. 네오 작전 결정서는 접수 내용을 네오가 직접 읽고 작성·검수해 이메일로 전하는 별도 상담이에요.</p></aside>
    <a class="consultation-methods__samples" href="/consultation-samples/"><span>상담 결과가 궁금하다면, 예시 먼저 보기</span><span aria-hidden="true">→</span></a></div></details></section>`;
}

export function renderConsultationMethodGuide(id = 'consultation-methods', variant = 'full') {
  if (variant === 'entry') return renderEntryTutorial(id);
  const cards = CONSULTATION_METHOD_OPTIONS.map(item => `<div class="consultation-choice"><dt><img src="${item.image}" alt="${item.imageAlt}" width="480" height="320" loading="lazy" decoding="async"><span class="consultation-methods__identity"><span>${item.name}</span><small>${item.need}</small></span></dt><dd><p>${item.format}</p><a href="${item.href}"><span>${item.action}</span><span aria-hidden="true"> →</span></a></dd></div>`).join('');
  return `<section class="consultation-methods" lang="ko" aria-labelledby="${escape(id)}"><h2 id="${escape(id)}"><span>풀이 기준은 함께,</span><br><span>상담 방식은 나에게 맞게</span></h2><p class="consultation-methods__intro">${CONSULTATION_METHOD_INTRO}</p><details><summary><span class="consultation-methods__question">영냥이·꿀꿀운세·네오, 어떤 상담을 고를까요?</span><span class="consultation-methods__toggle" aria-hidden="true"><span class="consultation-methods__open">펼쳐보기</span><span class="consultation-methods__close">접기</span><i></i></span></summary><div class="consultation-methods__content"><dl class="consultation-methods__choices">${cards}</dl>${renderMemo()}<a class="consultation-methods__samples" href="/consultation-samples/"><span>상담 결과 예시 비교하기</span> <span aria-hidden="true">→</span></a></div></details></section>`;
}
