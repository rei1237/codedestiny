// Display-only navigation shared by the public home and the generated app shell.
// Prices, access and intake state remain owned by the destination product.
// 그림이 붙는 앞 세 칸은 서로 다른 상담으로 간다. 같은 상담이 두 칸을 차지하면 고를 거리가 줄어든다(2026-10-23).
export const CONSULTATION_CONCERNS = [
  {id:'love-pattern',title:'내 흐름 깊이 읽기',text:'인연의 서 개인판에서 사주·자미두수로 살핀 사랑의 패턴을 AI 리포트로 읽어요.',label:'인연의 서 · 개인',href:'/master-love-codex/'},
  {id:'human-review',title:'내 사정을 직접 읽어주세요',text:'네오가 접수 내용을 읽고 AI 분석을 활용해 작성·검수한 답변을 이메일로 전해요.',label:'네오에게 물어봐 · 이메일',href:'/neo-consultation/'},
  {id:'one-question',title:'질문 하나부터 나누기',text:'영냥이에게 질문과 상황을 남기면, 선택한 체계의 AI 해설을 챕터로 읽을 수 있어요.',label:'영냥이 질문 상담',href:'/yeongnyangi/'},
  {id:'relationship',title:'좋아하는데, 우리는 왜 자꾸 부딪힐까요?',text:'인연의 서 궁합판에서 두 사람의 차이와 함께 조정할 지점을 살펴요.',label:'인연의 서 · 궁합',href:'/master-love-codex/'},
  {id:'decision',title:'생각은 많이 했는데, 결정하지 못하겠어요',text:'네오의 전략실에서 판단의 근거와 지금 실행할 행동을 정리해요.',label:'네오의 팩폭 전략실 · AI 상담',href:'/neo-operation-room/'},
  {id:'next-year',title:'다가올 한 해, 어디에 힘을 쓰면 좋을까요?',text:'내 명식과 선택한 연도를 함께 읽고 일·관계·월별 계획을 살펴요.',label:'신년운세',href:'/new-year-ai-consultation/'},
  {id:'deep-reading',title:'나를 더 깊이 이해할 관점을 찾고 있어요',text:'마스터마다 읽는 근거와 실제 상담 예시를 비교해 보세요.',label:'마스터 상담 비교',href:'/consultation-samples/'},
];
export const CONSULTATION_MASTERS = [
  {id:'neo',name:'네오',text:'판단의 근거와 실행할 행동',href:'/neo-operation-room/',image:'/images/master-profiles/avatars/neo.webp'},
  {id:'yeoni',name:'연이',text:'꺼내기 어려운 마음과 다음 선택',href:'/fortune-tea-house/',image:'/images/master-profiles/avatars/yeoni.webp'},
  {id:'yun',name:'윤달',text:'베다점의 출생 배치와 시기의 흐름',href:'/vedic-ai/',image:'/images/master-profiles/avatars/yun.webp'},
  {id:'musung',name:'무성',text:'자미두수 명반으로 읽는 삶의 영역',href:'/ziwei-ai/',image:'/images/master-profiles/avatars/musung.webp'},
  {id:'hanbi',name:'서한비',text:'숙요점으로 읽는 두 사람의 거리',href:'/sukuyo-compatibility-ai/',image:'/images/master-profiles/avatars/hanbi.webp'},
];
const escape = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// Service identity owns the artwork, independently of display order.
const featuredIds = ['one-question', 'love-pattern', 'human-review'];
const scenes = {
  'one-question': 'yeongnyangi-tarot',
  'love-pattern': 'master-love-codex',
  'human-review': 'neo-consultation',
};
export function renderConsultationDiscovery() {
  const tracking = id => ` data-cd-question="${escape(id)}"`;
  const renderItem = item => {
    if (!scenes[item.id]) return `<li class="consultation-discovery__other"><a href="${item.href}"${tracking(item.id)}><div class="consultation-discovery__copy"><strong>${escape(item.label)}</strong><span>${escape(item.title)}</span></div><svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 12h14m-6-6 6 6-6 6"/></svg></a></li>`;
    const base = scenes[item.id] && '/images/service-introductions/' + scenes[item.id];
    const scene = base ? `<div class="consultation-discovery__scene"><img src="${base}-640.webp" srcset="${base}-320.webp 320w, ${base}-640.webp 640w, ${base}-960.webp 960w" sizes="(max-width: 700px) calc(100vw - 72px), (max-width: 1080px) 30vw, 312px" width="640" height="427" alt="" loading="lazy" decoding="async"></div>` : '';
    return `<li class="${base ? 'consultation-discovery__feature' : 'consultation-discovery__other'}"><a href="${item.href}"${tracking(item.id)}>${scene}<div class="consultation-discovery__copy"><strong>${escape(item.title)}</strong><span>${escape(item.text)}</span><b>${escape(item.label)} <span aria-hidden="true"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 12h14m-6-6 6 6-6 6"/></svg></span></b></div></a></li>`;
  };
  const featured = featuredIds.map(id => CONSULTATION_CONCERNS.find(item => item.id === id));
  const others = CONSULTATION_CONCERNS.filter(item => !featuredIds.includes(item.id));
  return `<section class="consultation-discovery" lang="ko" aria-labelledby="consultation-discovery-title" data-cd-funnel-section="consultation_discovery"><header class="consultation-discovery__header"><h2 id="consultation-discovery-title">어떤 방식으로<br>이야기해 볼까요?</h2><p class="consultation-discovery__lead">질문·리포트·직접 검수 이메일.<br>필요한 답변의 방식으로 골라보세요.</p></header><ul class="consultation-discovery__concerns">${featured.map(renderItem).join('')}</ul><details class="consultation-discovery__more"><summary>다른 상담도 살펴보기</summary><ul class="consultation-discovery__concerns">${others.map(renderItem).join('')}</ul></details></section>`;
}
