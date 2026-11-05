import { HOME_CATEGORIES } from '../seo/home-discovery.mjs';
import { questionFeatures } from '../tarot/yeongnyangi-spread-recommend.mjs';

const methods = HOME_CATEGORIES.filter(item => ['tarot','saju','ziwei','astrology','vedic','sukuyo'].includes(item.key));
export const directory = methods;
const art = '/images/service-introductions/';
const signatureReports = {
  'new-year': {title:'신년운세',href:'/new-year-ai-consultation/',image:art+'new-year-ai-320.webp',test:/신년운세|(?:올해|내년|한 해).{0,14}(?:운세|전체 흐름|월별|시기별)/,reason:'하나의 결정보다 한 해 전체의 흐름을 먼저 보고 싶은 질문이에요.',format:'내 명식에 선택한 해의 흐름을 겹쳐 일과 관계, 시기별 선택을 읽어요.',action:'신년운세 상담 보기'},
  'life-book': {title:'인생의 책',href:'/life-book-ai/',image:art+'life-book-ai-320.webp',test:/인생의 책|인생.{0,8}(?:총운|큰 흐름|전체 흐름)/,reason:'눈앞의 고민을 넘어 삶의 큰 흐름을 살펴보고 싶으시군요.',format:'사주의 기질과 재능, 대운의 변화를 인생의 챕터로 읽어요.',action:'인생의 책 펼치기'},
  'love-secret': {title:'연애 비책',href:'/love-secret-ai/',image:art+'love-secret-ai-320.webp',test:/연애\s*비책/,reason:'사주로 내 관계 방식과 연애 고민을 함께 보는 상담이에요.',format:'사랑을 표현하는 습관과 두 사람의 속도를 짚고 질문에 맞는 연애 비책을 읽어요.',action:'연애 비책 상담 보기'}
};
const methodRules = {
  saju: /사주|명리|만세력|오행/, ziwei: /자미두수|자미명반/, astrology: /서양\s*점성|점성술|출생\s*차트/,
  vedic: /베다|인도\s*점성|나크샤트라/, sukuyo: /숙요/, tarot: /타로|카드.{0,10}(?:뽑|상징|펼|고르|리딩)|카드로.{0,16}(?:보고|보고싶|보면|살펴)/
};
const methodFormats = {
  saju:'태어난 날의 오행과 십성으로 타고난 기질과 시기의 흐름을 읽어요.',
  ziwei:'명반의 열두 궁에 놓인 별을 따라 일과 관계 등 삶의 주제를 살펴봐요.',
  astrology:'태어날 때의 행성 배치와 하우스로 성향과 관계의 특징을 읽어요.',
  vedic:'인도 점성술의 출생차트를 바탕으로 기질과 시기별 흐름을 읽어요.',
  sukuyo:'태어난 날의 별인 숙을 기준으로 두 사람의 끌림과 거리감을 살펴봐요.',
  tarot:'질문에 맞는 배열을 고른 뒤 카드의 상징으로 상황과 선택지를 읽어요.'
};
export const guides = {
  ...signatureReports,
  yeoni: { title:'연이의 운명의 찻집', href:'/fortune-tea-house/?counsel=letter', image:'/images/yeoni/welcome/yeoni-mark-v1-192.webp', reason:'무엇을 할지 정하기 전에, 마음에 남은 감정을 들여다보고 싶으시군요.', format:'연이가 고민 속 감정과 작은 실마리를 다정한 상담 편지로 짚어줘요.', action:'연이의 상담 열기', person:'연이', limit:120 },
  neo: { title:'네오의 팩폭 전략실', href:'/neo-operation-room/', image:'/images/master-profiles/avatars/neo.webp', reason:'다음 행동을 정할 기준이 필요할 때는 선택지의 이점과 부담을 나란히 보는 게 도움이 돼요.', format:'현실 진단과 그 근거, 피할 행동과 먼저 시도할 일을 작전서로 읽어요.', action:'네오의 전략실 열기', person:'네오', limit:600 },
  cat: { title:'운세보는 영냥이', href:'/yeongnyangi/fortune/?flow=question', image:'/assets/yeongnyangi/original/hero-480.webp', reason:'지금 한 번의 선택보다, 비슷한 상황에서 되풀이되는 내 반응이 궁금하시군요.', format:'사주에 나타난 기질을 내 질문에 비춰 보고, 해석의 근거와 행동 조언을 챕터로 읽어요.', action:'영냥이 질문 상담 열기', person:'영냥이', limit:1000 },
  ...Object.fromEntries(methods.map(item=>[item.key,{...item,reason:item.title+' 방식으로 살펴보고 싶다는 말씀에 맞춰 골랐어요.',format:methodFormats[item.key],action:item.title+' 메뉴 보기'}])),
  loveTarot:{title:'우리는 무슨 사이? · 관계 타로',href:'/tarot/love/',image:art+'tarot-320.webp',reason:'두 사람의 관계를 카드로 보고 싶다는 질문에 맞는 배열이에요.',format:'여섯 장의 카드로 서로의 시선과 관계를 막는 요인을 살펴봐요.',action:'관계 타로 배열 보기'},
  reunionTarot:{title:'재회 타로',href:'/tarot/reunion/',image:art+'tarot-320.webp',reason:'헤어진 뒤의 관계를 카드로 살펴보고 싶으시군요.',format:'카드의 상징으로 이별 뒤의 거리감과 다시 다가갈 때 고려할 점을 읽어요.',action:'재회 타로 살펴보기'},
};
export const examples=['먼저 연락해도 될까요?', '이직 제안을 어떻게 비교할까요?', '연애에서 왜 비슷한 일이 반복될까요?'];
export const choices=[
  ['yeoni','제 마음부터 정리하고 싶어요.'],['neo','판단할 기준을 세우고 싶어요.'],['cat','제 반응이 반복되는 이유를 알고 싶어요.']
];
function intent(text,context) {
  // Read the preferred clause first in “위로보다 …”, “타로 말고 …”.
  const preferred=text.split(/말고|보다는?|보다|아니라|좋지만|필요\s*없고/).at(-1).trim() || text;
  const pattern=/반복|기질|패턴|왜.{0,10}(늘|자꾸|비슷)|늘.{0,10}(반응|비슷)/.test(preferred);
  for(const key of ['vedic','sukuyo','ziwei','astrology','tarot','saju']){
    if(!methodRules[key].test(preferred))continue;
    if(key==='saju'&&pattern)return 'cat';
    if(key==='tarot'){
      if(/헤어|헤어진|재회|이별/.test(context))return 'reunionTarot';
      if(questionFeatures({question:context}).target==='relation'||/사랑|관계/.test(context))return 'loveTarot';
    }
    return key;
  }
  const report=Object.entries(signatureReports).find(([,item])=>item.test.test(preferred));
  if(report)return report[0];
  if(pattern)return 'cat';
  if(/기준|비교|우선순위|전략|실행|먼저 할|무엇부터|행동|장단점/.test(preferred))return 'neo';
  if(/위로|다독|자책|제 탓|서운|그리움|망설여|마음.{0,12}(정리|달래|돌보)|감정.{0,10}(정리|이해)/.test(preferred))return 'yeoni';
  return null;
}
export function alternative(id,question) {
  if(!/연락|답장|재회/.test(question))return null;
  if(id==='neo')return {id:'yeoni',text:'연락 여부를 정하기 전에, 답을 기다리는 내 마음부터 돌봐요.'};
  if(id==='yeoni')return {id:'neo',text:'마음을 짚는 대신, 먼저 연락할 조건과 멈출 기준을 세워요.'};
  return null;
}
export function matchQuestion(question,answer=''){
  return intent(answer||question,[question,answer].join(' '));
}
