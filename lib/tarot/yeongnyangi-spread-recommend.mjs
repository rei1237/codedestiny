// Rule-based spread recommendation for the v3 tarot order form. Pure and
// deterministic: the same question, inputs and tier always give the same
// spread. Variety comes from fitting the question's structure (purpose, target,
// options, period), never from randomness.
import {getYeongnyangiSpread,tierAllowsSpread,TAROT_TIER_ORDER} from './yeongnyangi-spread-catalog.mjs';
import {nativeQuestionSignals} from './yeongnyangi-question-signals.mjs';

export const tarotQuestionPresets=[
 {id:'likes_me',question:'그 사람, 나에게 마음이 있는 걸까?'},
 {id:'contact_first',question:'내가 먼저 연락해도 괜찮을까?'},
 {id:'reunion_repeat',question:'다시 만나면 같은 이유로 헤어질까?'},
 {id:'new_bond',question:'새로운 인연을 만나려면 무엇이 필요할까?'},
 {id:'job_change',question:'지금 이직하면 무엇을 얻고 잃을까?'},
 {id:'work_block',question:'내 일이 막히는 진짜 지점은 어디일까?'},
 {id:'offer',question:'이 제안, 받아도 괜찮을까?'},
 {id:'repeat_pattern',question:'나는 왜 같은 관계를 반복할까?'},
 {id:'month',question:'앞으로 한 달, 어디에 힘을 써야 할까?'},
];

const has=(re,text)=>re.test(text)||Boolean(nativeQuestionSignals[Object.keys(RE).find(key=>RE[key]===re)]?.test(text));
const RE={
 options:/\bA\b.*\bB\b|A와 ?B|둘 중|어느 쪽|아니면|vs|중에 (뭘|무엇|어디)|할까 말까|갈까 말까|중 하나/i,
 jobChange:/이직|퇴사|회사를 옮|직장을 옮|잔류|그만둘까|남을까/,
 offer:/제안|오퍼|스카우트|협업|러브콜|받아도 (될|괜찮)/,
 // Who acts decides the spread: first person or an object marker ("~에게/한테") means my action;
 // a third-person subject marker ("그 사람이/은") means waiting on them.
 contactAct:/(내가|제가|나부터|저부터).{0,16}(연락|카톡|문자|디엠|dm|전화|말 ?걸)|(에게|한테|께) ?(먼저 )?(연락|카톡|문자|디엠|dm|전화|말 ?걸)|연락해도|연락해 볼까|연락할까 말까|연락을 해야|^\s*먼저 ?(연락|카톡|문자|전화)/i,
 contactWait:/(그 ?사람|걔|그 ?애|상대|그|그녀|그 ?분)(이|가|은|는|도|이가)? .{0,10}(연락|답장|카톡).{0,8}(할까|올까|줄까|오나|올지|할지|해 ?줄까)|연락이 (올까|올지|오나)/,
 reunion:/재회|다시 만나|다시 시작|헤어진|이별|전 ?(남친|여친|애인|연인)|돌아올까/,
 feelings:/마음이 있|좋아할까|좋아하는지|관심이 있|호감|속마음|날 어떻게 생각|나를 어떻게 생각|진심/,
 repeat:/반복|매번 같은|늘 같은|자꾸 같은|같은 (사람|관계|패턴|실수)/,
 newBond:/새로운 인연|새 인연|소개팅|인연을 만나|연애를 시작|좋은 사람을 만나|만남이 없/,
 deepen:/더 깊|오래 가|오래 함께|결혼|동거|권태|관계를 이어|사이를 지키/,
 period:/한 ?달|이번 ?달|다음 ?달|4주|앞으로 몇 주|이번 ?주/,
 recovery:/지쳤|지친|지쳐|번아웃|무기력|쉬고 싶|버거|소진/,
 money:/돈|지출|소비|저축|월급|빚|재테크|가계|용돈|투자/,
 work:/일이|업무|성과|커리어|승진|프로젝트|사업|직장|회사|일에서/,
 relation:/그 ?사람|상대|애인|연인|남친|여친|연애|썸|관계|짝사랑|배우자/,
};

/** Structural features of a question; exported for tests and for the evidence snapshot. */
export function questionFeatures({question='',options,period}={}){
 const text=String(question).slice(0,1000);
 const hasOptions=Boolean(options?.a&&options?.b)||has(RE.options,text);
 const clauses=text.split(/[.?!\n]|그리고|근데|그런데|하지만/).map(s=>s.trim()).filter(Boolean).length;
 const domains=['relation','work','money','recovery'].filter(key=>has(RE[key],text));
 const purpose=hasOptions||has(RE.jobChange,text)?'compare':has(RE.period,text)||period?'period':
  has(RE.contactAct,text)||has(RE.offer,text)?'act':has(RE.relation,text)?'relation':'understand';
 const target=hasOptions?'options':has(RE.relation,text)?'relation':has(RE.work,text)||has(RE.jobChange,text)?'work':'self';
 return {purpose,target,hasOptions,period:period||(has(RE.period,text)?'month':undefined),
  complex:text.length>160&&(clauses>=4||domains.length>=2),clauses,domains};
}

// First matching rule wins. Each rule names one primary spread, up to two
// alternatives and the one-sentence reason Yeongnyangi gives.
const rules=[
 {id:'job_change',when:(t)=>has(RE.jobChange,t),spread:'yn_stay_leave_nine',alts:['yn_ab_seven','yn_work_block_six'],
  reason:'남는 길과 옮기는 길을 같은 기준으로 재야 공정하니까, 두 길에 같은 네 자리를 놓고 나란히 볼게냥.'},
 {id:'offer',when:(t)=>has(RE.offer,t),spread:'yn_offer_six',alts:['yn_ab_seven','yn_knot_three'],
  reason:'끌리는 마음과 실제 조건은 다른 문제라서, 이익과 부담을 저울에 올리고 확인할 조건부터 정리할게냥.'},
 {id:'options',when:(t,f)=>f.hasOptions,spread:'yn_ab_seven',alts:['yn_offer_six','yn_knot_three'],
  reason:'두 선택지에 같은 수의 자리를 똑같이 놓아야 한쪽으로 기울지 않으니까, 기회·부담·행동을 나란히 비교할게냥.'},
 {id:'contact_act',when:(t)=>has(RE.contactAct,t),spread:'yn_contact_first',alts:['yn_crossed_six','yn_knot_three'],
  reason:'연락 여부와 관계의 지속 가능성은 다른 문제라서, 이번에는 연락을 막는 요인과 연락 이후의 흐름을 나누어 살펴볼게냥.'},
 {id:'contact_wait',when:(t)=>has(RE.contactWait,t),spread:'yn_crossed_six',alts:['yn_contact_first','trad_past_present_future'],
  reason:'상대의 연락은 내가 정할 수 없는 일이라서, 지금 소통이 어디서 엇갈리고 그 패턴이 어디로 가는지를 살펴볼게냥.'},
 {id:'reunion',when:(t)=>has(RE.reunion,t),spread:'yn_reunion_seven',alts:['yn_repeat_pattern_six','yn_contact_first'],
  reason:'다시 만나는 것보다 같은 이유가 되풀이되지 않을 조건이 더 중요하니까, 반복 위험과 재접촉 조건을 차례로 볼게냥.'},
 {id:'feelings',when:(t)=>has(RE.feelings,t),spread:'yn_crossed_six',alts:['yn_contact_first','trad_past_present_future'],
  reason:'남의 마음을 대신 읽을 수는 없어서, 드러난 태도와 내 기대가 어디서 엇갈리는지부터 나누어 볼게냥.'},
 {id:'repeat',when:(t)=>has(RE.repeat,t),spread:'yn_repeat_pattern_six',alts:['yn_crossed_six','yn_knot_three'],
  reason:'반복은 장면보다 그 밑의 욕구에서 풀리니까, 반응과 그 대가, 다르게 해 볼 행동을 이어서 볼게냥.'},
 {id:'new_bond',when:(t)=>has(RE.newBond,t),spread:'yn_new_bond_five',alts:['yn_repeat_pattern_six','yn_one_word'],
  reason:'새 인연은 준비와 행동에서 열리니까, 드러낼 매력과 내려놓을 패턴, 넓혀 볼 행동을 살펴볼게냥.'},
 {id:'deepen',when:(t)=>has(RE.deepen,t),spread:'yn_deepen_seven',alts:['yn_crossed_six','yn_knot_three'],
  reason:'오래 가는 관계는 두 사람의 필요와 생활의 마찰을 함께 봐야 하니까, 합의할 것까지 나란히 짚어 볼게냥.'},
 {id:'period',when:(t,f)=>f.purpose==='period',spread:'yn_month_compass_six',alts:['trad_past_present_future','yn_knot_three'],
  reason:'기간을 정해 물어봤으니까, 한 달의 주제와 주차별 초점을 순서대로 짚어 볼게냥. 사건을 예언하진 않아.'},
 {id:'recovery',when:(t)=>has(RE.recovery,t),spread:'yn_recovery_four',alts:['yn_one_word','yn_knot_three'],
  reason:'지친 마음엔 많은 카드보다 쉬어도 되는 것과 기댈 곳이 먼저라서, 네 자리로 차분히 볼게냥.'},
 {id:'money',when:(t)=>has(RE.money,t),spread:'yn_money_pattern_five',alts:['yn_knot_three','yn_offer_six'],
  reason:'돈 고민은 수익 예측보다 쓰는 습관에서 실마리가 나오니까, 태도와 새는 패턴부터 살펴볼게냥.'},
 {id:'work',when:(t)=>has(RE.work,t),spread:'yn_work_block_six',alts:['yn_knot_three','yn_stay_leave_nine'],
  reason:'일이 막힐 땐 안의 장애와 바깥 제약을 나눠야 손댈 곳이 보이니까, 둘을 나란히 놓고 작은 실험을 찾아볼게냥.'},
 {id:'relation',when:(t,f)=>f.target==='relation',spread:'yn_crossed_six',alts:['yn_deepen_seven','yn_contact_first'],
  reason:'관계 고민은 두 쪽의 기대가 어디서 어긋나는지에서 시작하니까, 엇갈리는 지점과 조율할 부분을 볼게냥.'},
 {id:'complex',when:(t,f)=>f.complex,spread:'yn_whole_map_ten',alts:['trad_celtic_cross_ten','yn_knot_three'],
  reason:'여러 고민이 얽혀 있어서, 중심 갈등과 주변 요인을 한 장의 지도로 펼쳐 볼게냥.'},
];
const fallback={id:'default',spread:'yn_knot_three',alts:['yn_one_word','trad_past_present_future'],
 reason:'지금 막힌 매듭과 쓸 수 있는 자원, 다음 한 걸음을 세 장으로 이어서 볼게냥.'};
const presetRules={likes_me:'feelings',contact_first:'contact_act',reunion_repeat:'reunion',new_bond:'new_bond',job_change:'job_change',
 work_block:'work',offer:'offer',repeat_pattern:'repeat',month:'period'};
// Within-tier fallbacks per target when the best fit needs more cards than the tier allows.
const tierFallbacks={options:['yn_knot_three','trad_past_present_future'],relation:['yn_contact_first','trad_past_present_future','yn_knot_three'],
 work:['yn_knot_three','trad_past_present_future'],self:['yn_knot_three','yn_recovery_four','yn_one_word']};
const tierNames={mackerel:'고등어',salmon:'연어',flounder:'광어',tuna:'참치'};

export function recommendTarotSpread(input={}){
 const preset=tarotQuestionPresets.find(p=>p.id===input.presetId);
 const question=String(input.question||preset?.question||'').trim();
 const features=questionFeatures({question,options:input.options,period:input.period});
 const rule=(preset&&rules.find(r=>r.id===presetRules[preset.id]))||rules.find(r=>r.when(question,features))||fallback;
 const primary=getYeongnyangiSpread(rule.spread);
 const tier=TAROT_TIER_ORDER.includes(input.tier)?input.tier:undefined;
 let alternatives=rule.alts;
 let tierNote;
 if(tier&&!tierAllowsSpread(tier,primary)){
  tierNote=`이 배열은 ${primary.cardCount}장이라 ${tierNames[primary.minTier]} 이상에서 볼 수 있어요.`;
  alternatives=[...rule.alts,...tierFallbacks[features.target]].filter(id=>tierAllowsSpread(tier,getYeongnyangiSpread(id)));
 }
 alternatives=[...new Set(alternatives)].filter(id=>id!==primary.id).slice(0,2);
 const fitsTier=tier?tierAllowsSpread(tier,primary):true;
 // bestInTier is what the order form preselects: the primary when it fits, else the first in-tier alternative.
 return {ruleId:rule.id,primary:primary.id,alternatives,reason:rule.reason,features,fitsTier,
  bestInTier:fitsTier?primary.id:(alternatives[0]||'yn_one_word'),...(tierNote?{tierNote}:{})};
}
