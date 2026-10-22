// Display-only navigation shared by the public home and the generated app shell.
// Prices, access and intake state remain owned by the destination product.
// 그림이 붙는 앞 세 칸은 서로 다른 상담으로 간다. 같은 상담이 두 칸을 차지하면 고를 거리가 줄어든다(2026-10-23).
export const CONSULTATION_CONCERNS = [
  {id:'love-pattern',title:'사람은 바뀌는데, 연애의 고민은 비슷해요',text:'인연의 서 개인판에서 끌림과 표현, 반복되는 갈등을 읽어요.',label:'인연의 서 · 개인',href:'/master-love-codex/'},
  {id:'human-review',title:'복잡한 제 사정을 직접 읽어주셨으면 해요',text:'네오가 접수 내용을 읽고 AI 분석을 활용해 작성·검수한 답변을 이메일로 전해요.',label:'네오에게 물어봐 · 이메일',href:'/neo-consultation/'},
  {id:'one-question',title:'지금 궁금한 질문 하나부터 물어볼래요',text:'영냥이에게 고민을 남기고, 선택한 상담의 범위와 가격을 먼저 확인해요.',label:'영냥이 질문 상담',href:'/yeongnyangi/'},
  {id:'relationship',title:'좋아하는데, 우리는 왜 자꾸 부딪힐까요?',text:'인연의 서 궁합판에서 두 사람의 차이와 함께 조정할 지점을 살펴요.',label:'인연의 서 · 궁합',href:'/master-love-codex/'},
  {id:'decision',title:'생각은 많이 했는데, 결정하지 못하겠어요',text:'네오의 전략실에서 판단의 근거와 지금 실행할 행동을 정리해요.',label:'네오의 팩폭 전략실 · AI 상담',href:'/neo-operation-room/'},
  {id:'next-year',title:'다가올 한 해, 어디에 힘을 쓰면 좋을까요?',text:'내 명식과 선택한 연도를 함께 읽고 일·관계·월별 계획을 살펴요.',label:'신년운세',href:'/new-year-ai-consultation/'},
  {id:'deep-reading',title:'나를 더 깊이 이해할 관점을 찾고 있어요',text:'마스터마다 읽는 근거와 실제 상담 예시를 비교해 보세요.',label:'마스터 상담 비교',href:'/consultation-samples/'},
];
export const CONSULTATION_MASTERS = [
  {id:'master',name:'인연의 서 마스터',text:'사주와 자미두수로 읽는 사랑의 패턴',href:'/master-love-codex/',image:'/images/master-profiles/master-love-portrait.webp'},
  {id:'neo',name:'네오',text:'판단의 근거와 실행할 행동',href:'/neo-operation-room/',image:'/images/master-profiles/avatars/neo.webp'},
  {id:'yeoni',name:'연이',text:'꺼내기 어려운 마음과 다음 선택',href:'/fortune-tea-house/',image:'/images/master-profiles/avatars/yeoni.webp'},
  {id:'yun',name:'윤달',text:'베다점의 출생 배치와 시기의 흐름',href:'/vedic-ai/',image:'/images/master-profiles/avatars/yun.webp'},
  {id:'musung',name:'무성',text:'자미두수 명반으로 읽는 삶의 영역',href:'/ziwei-ai/',image:'/images/master-profiles/avatars/musung.webp'},
  {id:'hanbi',name:'서한비',text:'숙요점으로 읽는 두 사람의 거리',href:'/sukuyo-compatibility-ai/',image:'/images/master-profiles/avatars/hanbi.webp'},
];
const escape = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function renderConsultationDiscovery() {
  const scenes=['/images/service-introductions/master-love-codex.webp','/images/service-introductions/neo-consultation-640.webp','/images/service-introductions/yeongnyangi-tarot-640.webp'];
  const tracking = id => ` data-cd-question="${escape(id)}"`;
  return `<section class="consultation-discovery" lang="ko" aria-labelledby="consultation-discovery-title" data-cd-funnel-section="consultation_discovery"><header class="consultation-discovery__header"><h2 id="consultation-discovery-title">어떤 마음으로<br>찾아오셨나요?</h2><p class="consultation-discovery__lead">마음에 남은 질문 하나.<br>그 이야기를 읽어줄 상담을 만나보세요.</p></header><ul class="consultation-discovery__concerns">${CONSULTATION_CONCERNS.map((item,index)=>`<li class="${index<3?'consultation-discovery__feature':'consultation-discovery__other'}"><a href="${item.href}"${tracking(item.id)}>${scenes[index]?`<div class="consultation-discovery__scene"><img src="${scenes[index]}" width="640" height="427" alt="" loading="lazy" decoding="async"></div>`:''}<div class="consultation-discovery__copy"><strong>${escape(item.title)}</strong><span>${escape(item.text)}</span><b>${escape(item.label)} <span aria-hidden="true"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 12h14m-6-6 6 6-6 6"/></svg></span></b></div></a></li>`).join('')}</ul><details class="consultation-discovery__masters"><summary>마스터로 찾아보기 <span>누구의 시선으로 읽어볼까요?</span></summary><ul>${CONSULTATION_MASTERS.map(item=>`<li><a href="${item.href}"${tracking(item.id)}><img src="${item.image}" width="64" height="64" alt="" loading="lazy" decoding="async"><span><strong>${escape(item.name)}</strong><span>${escape(item.text)}</span></span></a></li>`).join('')}</ul><p>마스터별 AI 해석과 네오가 직접 검수하는 이메일 상담은 제공 방식이 달라요. 각 상담의 안내를 확인해 주세요.</p></details></section>`;
}
