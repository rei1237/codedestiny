// Presentation only. The engine, saved evidence and citation IDs remain intact.
export const READER_COUNSEL_VERSION = 'reader-counsel-20261029';
const meanings:Record<string,string> = {
  비견:'자기 기준을 지키고 스스로 결정하려는 힘', 겁재:'경쟁이나 협력 속에서 자기 몫을 지키려는 힘',
  식신:'꾸준히 익히고 돌보며 결과를 만들어 내는 힘', 상관:'생각을 표현하고 익숙한 방식을 바꾸려는 힘',
  정재:'자원을 계획적으로 관리하려는 힘', 편재:'기회를 찾아 자원을 움직이려는 힘',
  정관:'역할과 약속을 지키려는 힘', 편관:'압박과 도전에 대응하려는 힘',
  정인:'배우고 이해하며 안정감을 쌓으려는 힘', 편인:'다른 관점으로 탐색하고 의미를 찾으려는 힘',
};

function readableWeights(value:unknown):unknown {
  if(!value || typeof value!=='object' || Array.isArray(value))return value;
  const entries=Object.entries(value);
  const levels=[...new Set(entries.filter(([k,v])=>k in meanings&&typeof v==='number'&&v>0).map(([,v])=>v as number))].sort((a,b)=>b-a);
  return Object.fromEntries(entries.map(([key,weight])=>[key,key in meanings&&typeof weight==='number'
    ? {meaning:meanings[key],relativePresence:weight<=0?'집계되지 않음':weight===levels[0]?'이 분포에서 가장 두드러짐':weight===levels[1]?'그다음으로 두드러짐':'함께 나타나는 기운'}
    :weight]));
}

function readableProfile(value:unknown):unknown {
  if(!value||typeof value!=='object'||Array.isArray(value))return value;
  return Object.fromEntries(Object.entries(value).filter(([key])=>key!=='visibleCount').map(([key,item])=>[key,
    key==='surface'||key==='hidden'?readableWeights(item)
      :key==='families'&&Array.isArray(item)?item.map(family=>Object.fromEntries(Object.entries(family).filter(([field])=>!['weight','visible','hidden'].includes(field))))
      :item]));
}

// 5A: the 조후 score and its element counts, and the 일간 강약 score, reached prose as '(-4점)', 'score -4', '점수 41'.
// The prompt copy carries only words; the engine values stay in the stored facts.
const TEMPERATURE:Record<string,string>={hot:'매우 뜨거운 편',warm:'따뜻한 편',neutral:'한난이 균형에 가까운 편',cool:'서늘한 편',cold:'매우 차가운 편'};
const HUMIDITY:Record<string,string>={wet:'습한 편',dry:'건조한 편',balanced:'습조가 균형에 가까운 편'};
const SEASON_NUMBERS=['score','type','moistType','fc','wc','wdc','mc','moistCnt','dryCnt','badgeCls','badgeTxt'];
function readableSeason(value:unknown):unknown {
  if(!value||typeof value!=='object'||Array.isArray(value))return value;
  const v=value as Record<string,unknown>;
  return {...Object.fromEntries(Object.entries(v).filter(([key])=>!SEASON_NUMBERS.includes(key))),
    ...(TEMPERATURE[String(v.type)]?{temperature:TEMPERATURE[String(v.type)]}:{}),...(HUMIDITY[String(v.moistType)]?{humidity:HUMIDITY[String(v.moistType)]}:{})};
}
// calcPower reads 신강 at 30; one peripheral stem or branch is worth 7 (lib/saju/natal-power.js), so within 7 is a boundary reading.
function readableStrength(value:unknown):unknown {
  if(!value||typeof value!=='object'||Array.isArray(value))return value;
  const {score,...rest}=value as Record<string,unknown>;
  if(typeof rest.isStrong!=='boolean'||typeof score!=='number')return rest;
  const near=Math.abs(score-30)<7;
  return {...rest,strengthLevel:rest.isStrong?(near?'신강 쪽이지만 경계에 가까움':'신강이 뚜렷함'):(near?'신약 쪽이지만 경계에 가까움':'신약이 뚜렷함')};
}
const READABLE:Record<string,(value:unknown)=>unknown>={tenGods:readableWeights,tenGodProfile:readableProfile,seasonalBalance:readableSeason,strengthHeuristic:readableStrength};

/** Remove ten-god weights and 조후·강약 scores from both chapter facts and the nested ask evidence packet. */
export function readerEvidence<T>(input:T):T {
  if(Array.isArray(input))return input.map(readerEvidence) as T;
  if(!input||typeof input!=='object')return input;
  const row=input as Record<string,unknown>;
  return Object.fromEntries(Object.entries(row).map(([key,value])=>{
    const readable=READABLE[key]||(key==='value'?READABLE[String(row.label)]:undefined);
    return [key,readable?readable(value):readerEvidence(value)];
  })) as T;
}

export function readerCounsel(opening:boolean,symbolic:boolean){
  return {
    version:READER_COUNSEL_VERSION,
    numbers:'십성 가중치·내부 점수·순위·확률을 본문·요약·예시·질문 답변·제목에 숫자로 옮기지 않는다. 비견이 2.35, 겁재가 1처럼 쓰지 않는다. 상대적인 분포를 쉬운 뜻으로 설명하고 위치·계절·다른 근거와 함께 읽는다. 가장 두드러진다는 표현도 전체 인격의 강약이나 실제 행동을 확정하지 않는다. 집계되지 않음은 해당 능력의 부재가 아니다. 필요한 실제 날짜·기간·금액과 내부 가중치는 구분한다. 앞 장의 숫자 표현도 그대로 반복하지 않는다.',
    opening:opening
      ? symbolic
        ? '첫 본문 소절에서 현재 고민에 반응하는 태도와 선택 패턴을 설명한다. 출생 성향을 계산하지 않는 자료로 타고난 성격을 지어내지 않는다. 제공된 출생 성향 근거가 없다는 한계를 짧게 밝힌다. 카드·질문 순간의 상징은 현재 상황을 돌아보는 단서로만 쓴다.'
        : '첫 장은 질문에 한 줄로 답한 뒤, 타고난 성향 소절(nature 소절. 없으면 첫 본문 소절)에서 타고난 성향 총론을 먼저 쓴다. 제공된 차트의 중심 지표(사주 일간·월지·오행 분포, 자미두수 명궁·신궁, 숙요 본명숙, 베다 라그나·달, 점성술 태양·달·상승점 중 실제로 제공된 것)를 근거로 이 사람의 타고난 기질과 성향을 먼저 전반적으로 짚어, 상담자가 나를 정확히 봤다고 느끼도록 신뢰가 서게 시작한다. 핵심 기질 두세 가지, 감정과 관계에서의 반응, 일과 결정을 내리는 습관, 에너지를 채우는 방식을 계산 사실의 쉬운 뜻 → 생활에서 드러나는 장면 순서로 구체적으로 쓰고, 실제 근거가 없는 특징은 지어내지 않는다. 이어지는 소절에서 그 성향을 신청한 주제와 구체적인 질문에 연결한다. 재물은 수입을 만드는 방식·소비·저축·위험 판단, 이직은 일하는 방식·책임·변화에 대한 반응, 연애는 감정 표현·거리 조절·갈등 반응처럼 해당 주제의 선택 습관에 초점을 맞춘다. 다른 주제는 그 질문의 실제 선택과 연결되는 특징을 골라 설명한다. 계산 사실의 쉬운 뜻 → 생활에서 드러날 조건 → 현재 고민과의 연결을 쓴다. 기존 소절 ID와 장 수는 유지한다. 총론 소절 제목은 구매 언어로 타고난 성향을 드러내고, 주제 연결 소절 제목은 예를 들어 재물 상담은 돈을 다루는 나의 성향, 이직 상담은 일과 변화를 대하는 나의 성향처럼 신청 주제와 성향의 연결을 드러낸다. 재물·연애·직업·시기 운세로 성향 총론을 대신하지 않는다. 출생 성향 근거가 부족하면 그 한계를 밝히고 입력된 상황에 근거한 반응 패턴만 설명한다. 궁합은 각 사람의 근거를 구별하고 퓨전은 체계별 근거와 용어를 섞지 않고 출처를 구분한다.'
      : '첫 장의 전체 성향 분석을 반복하지 않고 이번 장의 질문과 관련된 특징만 연결한다. 체계별 기초 장(nature 소절)은 그 체계의 근거로 타고난 성향을 깊이 풀되 첫 장 총론과 같은 문장은 쓰지 않고 한 줄로만 가리킨다.',
    counseling:'냉정함은 사람에 대한 평가가 아니라 선택의 비용·현실 조건·불확실성을 분명히 보는 태도다. 실제 근거로 판단을 먼저 밝히고, 그런 선택을 하게 되는 필요나 부담을 조건부로 공감한 뒤, 오늘 감당할 수 있는 작은 행동과 선택권을 제안한다. 공감과 따뜻한 조언은 마지막 캐릭터 한마디에만 몰아넣지 말고 해석과 행동 문단에도 연결한다. 확인하지 않은 과거·상처·감정을 아는 척하지 않는다. 비난·훈계·빈 칭찬·성공 보장 대신 구체적인 강점과 조정 방법을 함께 쓴다. 같은 위로나 조언을 반복하지 않는다. 저장된 화자의 말투와 구매 언어를 유지한다.',
  };
}
