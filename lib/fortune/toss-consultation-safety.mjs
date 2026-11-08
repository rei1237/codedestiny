export const consultationSafetyMessages=Object.freeze({
  TOSS_CRISIS_SUPPORT:'이렇게 힘든 마음을 꺼내 주셔서 고마워요. 지금 가까운 사람에게 상황을 알리고 함께 있어 달라고 해 주세요. 곧 스스로를 다칠 것 같거나 이미 다쳤다면 현지 응급서비스나 가까운 응급실에 바로 도움을 요청해 주세요.',
  TOSS_HARMFUL_REQUEST:'다른 사람을 해치거나 위험한 행동을 실행하는 방법은 안내할 수 없어요. 위협에서 벗어나거나 갈등을 안전하게 풀 방법에 관한 질문은 함께 살펴볼 수 있어요.',
});

// Match requests for an act or a method. A topic name by itself (violence,
// addiction, suicide prevention) is insufficient grounds to block a consultation.
const crisisMethods=[
  /(?:자살|자해)(?:을|를)?(?:하는|할|하는데쓸|하기위한)?(?:구체적인|자세한|확실한|쉬운)?(?:방법|법|절차|수단)/u,
  /(?:스스로|내|제)(?:목숨|생명|삶)(?:을)?(?:끊는|끝내는)(?:방법|법)/u,
  /(?:고통없이|아프지않게|확실하게)(?:죽는|죽을수있는)(?:방법|법)/u,
  /(?:howto(?:kill|hurt)myself|howtocommitsuicide|methodsofsuicide)/u,
];
const personalCrisis=[
  /(?:죽고싶(?:어요|어|다|습니다)|살고싶지않(?:아|아요|습니다)|살기싫(?:어요|어|다))(?!서?했|해|하|한|고(?:말|했|하|한|해서)|는사람|는친구)/u,
  /(?:자살|자해)(?:을|를)?(?:할거(?:야|예요|에요)|하려고(?:해|합니다)|하고싶(?:어|습니다)|할생각(?:이야|이에요|입니다))/u,
  /(?:자살|자해)(?:할)?생각이(?:자꾸)?(?:들어요|납니다|나요)/u,
  /(?:제|내)(?:목숨|삶)(?:을)?(?:지금|오늘)?(?:끊|끝내)(?:으?려고|겠|고싶)/u,
  /(?:지금|오늘)(?:당장)?(?:자해충동이(?:들|심)|극단적(?:인)?선택을(?:하고싶|하려고)|목숨을끊으려고)/u,
  /(?:iwanttokillmyself|iwanttodie|imgoingtokillmyself|i'mgoingtokillmyself)/u,
];
const harmfulMethods=[
  /(?:사람|상대방?|누군가|친구|이웃|동료|연인|전남친|전여친|배우자|남편|아내|선생님)(?:을|를)?(?:몰래|흔적없이|안들키고|들키지않고|효과적으로)?(?:죽이|해치|다치게하|때리|기절시키|공격하|협박하)(?:는)?(?:구체적인|자세한)?(?:방법|법|절차|계획)/u,
  /(?:폭탄|폭발물|사제총기|사제폭탄|필로폰|마약)(?:을|를)?(?:집에서|직접|몰래)?(?:만드는|제조하는|조립하는|제조|제작)(?:구체적인|상세한)?(?:방법|법|절차|재료|레시피)/u,
  /(?:타인|남|다른사람|친구|상대)(?:의)?(?:계정|비밀번호)(?:을|를)?(?:몰래)?(?:해킹하는|훔치는|탈취하는)(?:방법|법|절차)/u,
  /(?:howto(?:murder|kill|poison)someone|howto(?:make|build)abomb|howtostealsomeone(?:’|')?spassword)/u,
];

export function consultationSafetyCode(text){
  if(typeof text!=='string')return null;
  const normalized=text.normalize('NFKC').toLowerCase().replace(/[\s\u200B-\u200D\u2060\uFEFF]/gu,'');
  if(crisisMethods.some(pattern=>pattern.test(normalized)))return 'TOSS_CRISIS_SUPPORT';
  // A third party reporting someone else's distress often needs ordinary support.
  // Remove just the reported clause, so a separate first-person crisis still counts.
  const direct=normalized.replace(/(?:친구|가족|동료|아들|딸|연인|언니|동생)(?:가|이|는|은)[^.!?。！？]{0,24}?(?:죽고싶(?:다|어요|어)|자해하고싶(?:다|어요|어)|자살할거(?:야|예요))['"’”]?(?:고|라고|라)(?:도)?(?:말|해|해서|한다|했|하)/gu,'')
    .replace(/(?:친구|가족|동료|아들|딸|연인|언니|동생)(?:가|이|는|은)(?:지금|오늘)?(?:자살|자해)(?:을|를)?하려고(?:해요|합니다|해서)/gu,'');
  if(personalCrisis.some(pattern=>pattern.test(direct)))return 'TOSS_CRISIS_SUPPORT';
  if(harmfulMethods.some(pattern=>pattern.test(normalized)))return 'TOSS_HARMFUL_REQUEST';
  return null;
}

export function consultationInputCode(body){
  const scope=body?.questionDecision;
  const codes=[body?.question,scope?.situation,scope?.options,scope?.period,scope?.constraints].map(consultationSafetyCode);
  return codes.includes('TOSS_CRISIS_SUPPORT')?'TOSS_CRISIS_SUPPORT':codes.find(Boolean)||null;
}

export function consultationInputNotice(body){
  return consultationSafetyMessages[consultationInputCode(body)]||'';
}
