// Page-scoped practice topics only. No I/O, user profile, diagnosis or LLM calls.
export const TOPIC_RULES = Object.freeze({
  mindfulness: ['현재에 머무는 연습', '호흡·감각·현재의 행동을 살피라는 권고', '단순 불안 언급·타인 상태·명상보다 다른 행동 우선', '일상 마음챙김 실천'],
  'letting-go': ['내려놓음', '지난 인연이나 통제할 수 없는 일에서 거리를 두는 연습', '집착 부정문·재회 보장', '내려놓음·수용'],
  'self-reflection': ['자기성찰', '자신의 선택과 반응을 돌아보라는 권고', '타인 성격 해석', '성찰·선택 기록'],
  'karma-philosophy': ['불교의 업과 선택', '검수한 불교 업 철학 콘텐츠 또는 명시적 관심 선택', '반복 행동만으로 업보 추정·부정문', '불교 철학'],
  'modern-spirituality': ['현대 영성', '검수한 현대 영성 콘텐츠 또는 명시적 관심 선택', '종교 추론·업보 해소 효능', '현대 영성 입문'],
  'relationship-patterns': ['반복되는 관계', '자신이 반복하는 관계 선택을 돌아보라는 권고', '상대 진단·전생 원인 단정', '관계 패턴·선택'],
  boundaries: ['나의 기준 세우기', '거절·관계의 경계·자기 기준을 정하는 권고', '상대방 질환 진단', '경계 설정·자기존중'],
  'self-compassion': ['나를 다정하게 대하기', '비교와 자책을 줄이고 자신을 돌보는 권고', '건강 상태 추론', '자기연민·자기돌봄'],
  acceptance: ['수용', '바꿀 수 없는 일이나 현재 감정을 인정하는 연습', '부당한 관계를 참으라는 주장', '자기수용·철학 에세이'],
  'habit-building': ['작은 습관', '작은 행동을 정해 꾸준히 반복하는 권고', '성공 보장·성격 설명만 있는 문장', '습관 형성 실용서'],
  journaling: ['기록과 회고', '일기·회고·감사 기록을 직접 해보라는 권고', '기록이라는 개념만 설명', '기록법·성찰 노트'],
  'meaning-purpose': ['삶의 의미', '삶의 가치와 방향을 탐색하는 권고 또는 검수 콘텐츠', '이용자 종교 추정', '의미·철학 에세이'],
  focus: ['집중과 학습', '집중 시간·방해 요소·학습 방법을 정하는 권고', '산만하다는 성격 판단', '집중·학습 실용서'],
  budgeting: ['예산과 소비 점검', '지출·소비·예산을 점검하는 권고', '재물운이 좋다는 해석·수익 보장', '가계부·소비 습관'],
  rest: ['휴식과 속도 조절', '일상 속 휴식 시간을 확보하는 권고', '질병 치료·불면 진단', '일상 에세이·휴식 실천'],
  symbolism: ['색상과 다짐', '확인한 색·모티프와 명시적으로 선택한 상징', '운세 개선·액막이 효능', '색상·상징 소품'],
  ...Object.fromEntries([['saju','사주'],['ziwei','자미두수'],['sukuyo','숙요점'],['vedic','베다 점성술'],['astrology','서양 점성술'],['tarot','타로']].map(([id,label]) => [`${id}-study`, [label + ' 공부', '해당 체계 학습을 다루는 검수 콘텐츠 또는 명시적 관심', '같은 체계의 개인 풀이를 봤다는 사실만으로 추천', label + ' 입문서']])),
});
export const PRACTICE_TOPICS = Object.keys(TOPIC_RULES);
export const BOOK_PERSPECTIVES = ['practical', 'essay', 'poetry', 'buddhist-philosophy', 'modern-spirituality', 'divination-study'];
export const bookPerspectiveLabel = (id, locale = 'ko') => locale === 'ko' ? ({practical:'실용서',essay:'에세이',poetry:'시집','buddhist-philosophy':'불교 철학','modern-spirituality':'현대 영성','divination-study':'점술 체계 학습'}[id] || '') : id.replaceAll('-', ' ');
export const SYMBOL_COLORS = ['red','orange','yellow','green','blue','purple','pink','white','black','gold','silver'];
export const SYMBOL_MOTIFS = ['star','moon','flower','tree','heart'];
export const cleanTopics = values => Array.isArray(values) ? [...new Set(values.filter(x => Object.hasOwn(TOPIC_RULES, x)))].slice(0, 8) : [];

// Only bounded, explicitly selected advice fields are read. Ambiguity means no tag.
const recommendations = /(?:하세요|해\s?보세요|해봐|해라|보자|보세요|권해|권합니다|추천해|추천합니다|좋겠|좋아요|좋습니다|도움이|우선|필요해|정리하|기록하|확보하|연습하|줄여|줄이|세워)/;
const excluded = /(?:뜻은?\s*아니|단정할?\s*수\s*없|때문[이가]?\s*아니|않[다아는을]|아니[다라고라는]|하지\s*마|필요(?:는|가)?\s*없|예를\s*들|예시|가정|가령|만약|한다면|상대(?:가|는|방)|그(?:가|녀가)|친구(?:가|는)|질환|진단|치료|우울증|공황|자해)/;
const patterns = {
  mindfulness: /(?:호흡|마음챙김|현재의?\s*(?:감각|순간)|지금\s*이\s*순간)/,
  'letting-go': /(?:내려놓|떠나보|지난\s*인연|통제할\s*수\s*없는)/,
  'self-reflection': /(?:돌아보|자기성찰|자신의\s*선택|내\s*반응)/,
  'relationship-patterns': /(?:반복되는?\s*(?:관계|선택)|관계\s*패턴)/,
  boundaries: /(?:경계(?:를|\s*설정)|거절|자신의\s*기준|나의\s*기준)/,
  'self-compassion': /(?:자책|자기연민|자기돌봄|비교를?\s*줄|자신을\s*(?:돌보|다정))/,
  acceptance: /(?:수용|감정을?\s*인정|있는\s*그대로\s*받아)/,
  'habit-building': /(?:작은\s*(?:행동|습관|실천)|습관을|꾸준히\s*반복)/,
  journaling: /(?:일기|회고|감사\s*기록|기록장|노트에\s*적)/,
  'meaning-purpose': /(?:삶의\s*(?:의미|가치|방향)|소중한\s*가치)/,
  focus: /(?:집중\s*시간|방해\s*요소|학습\s*방법|한\s*가지에\s*집중)/,
  budgeting: /(?:가계부|지출|소비\s*(?:습관|내역)|예산)/,
  rest: /(?:휴식\s*시간|쉬는\s*시간|속도를?\s*늦|잠시\s*쉬)/,
};
export function adviceTopics(advice) {
  if (!Array.isArray(advice)) return [];
  const found = new Set();
  for (const paragraph of advice.slice(0, 24)) {
    if (typeof paragraph !== 'string') continue;
    for (let sentence of paragraph.slice(0, 1200).split(/[.!?\n]+/)) {
      // In a contrast, only the explicitly prioritized alternative is eligible.
      if (sentence.includes('보다')) sentence = sentence.slice(sentence.lastIndexOf('보다') + 2);
      if (!recommendations.test(sentence) || excluded.test(sentence)) continue;
      for (const [tag, pattern] of Object.entries(patterns)) if (pattern.test(sentence)) found.add(tag);
    }
  }
  return cleanTopics([...found]);
}

// Adapters return tags, never the private text they inspect. Do not recurse into results.
export function chapterAdviceTopics(chapters) {
  if (!Array.isArray(chapters)) return [];
  return adviceTopics(chapters.slice(0, 20).flatMap(c => [...(Array.isArray(c?.advice) ? c.advice.slice(0,8) : [c?.advice]), ...(Array.isArray(c?.content?.actions) ? c.content.actions.slice(0,8) : []), ...(Array.isArray(c?.questionAnswers) ? c.questionAnswers.filter(a => a && a.mode !== 'care' && a.mode !== 'limited').slice(0,8).map(a => a.action) : [])]));
}
export function teaAdviceTopics(result) {
  return adviceTopics([result?.actionPrescription, result?.yeoniReading?.advice, result?.saju?.actionPrescription, result?.sukuyoCompatibility?.roleGuide?.userAction]);
}
export function neoAdviceTopics(briefing, refined) {
  return adviceTopics([...(Array.isArray(briefing?.actionOrders) ? briefing.actionOrders : []), ...(Array.isArray(refined?.actionAlternatives) ? refined.actionAlternatives.map(x => x?.action) : []), ...(Array.isArray(refined?.thirtyDayStrategy) ? refined.thirtyDayStrategy : [])]);
}
