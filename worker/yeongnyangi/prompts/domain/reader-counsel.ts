// Presentation only. The engine, saved evidence and citation IDs remain intact.
export const READER_COUNSEL_VERSION = 'reader-counsel-20261009';
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

/** Remove ten-god weights from both chapter facts and the nested ask evidence packet. */
export function readerEvidence<T>(input:T):T {
  if(Array.isArray(input))return input.map(readerEvidence) as T;
  if(!input||typeof input!=='object')return input;
  const row=input as Record<string,unknown>;
  return Object.fromEntries(Object.entries(row).map(([key,value])=>[key,
    key==='tenGods'||key==='value'&&row.label==='tenGods'
      ?readableWeights(value)
      :key==='tenGodProfile'||key==='value'&&row.label==='tenGodProfile'?readableProfile(value):readerEvidence(value)])) as T;
}

export function readerCounsel(opening:boolean,symbolic:boolean){
  return {
    version:READER_COUNSEL_VERSION,
    numbers:'십성 가중치·내부 점수·순위·확률을 본문·요약·예시·질문 답변·제목에 숫자로 옮기지 않는다. 비견이 2.35, 겁재가 1처럼 쓰지 않는다. 상대적인 분포를 쉬운 뜻으로 설명하고 위치·계절·다른 근거와 함께 읽는다. 가장 두드러진다는 표현도 전체 인격의 강약이나 실제 행동을 확정하지 않는다. 집계되지 않음은 해당 능력의 부재가 아니다. 필요한 실제 날짜·기간·금액과 내부 가중치는 구분한다. 앞 장의 숫자 표현도 그대로 반복하지 않는다.',
    opening:opening
      ? symbolic
        ? '첫 본문 소절에서 현재 고민에 반응하는 태도와 선택 패턴을 설명한다. 출생 성향을 계산하지 않는 자료로 타고난 성격을 지어내지 않는다. 제공된 출생 성향 근거가 없다는 한계를 짧게 밝힌다. 카드·질문 순간의 상징은 현재 상황을 돌아보는 단서로만 쓴다.'
        : '첫 장은 질문에 한 줄로 답한 뒤, 첫 본문 소절을 신청한 주제와 구체적인 질문에 관련된 타고난 성향 분석으로 시작한다. 일반적인 성격 총론은 쓰지 않는다. 재물은 수입을 만드는 방식·소비·저축·위험 판단, 이직은 일하는 방식·책임·변화에 대한 반응, 연애는 감정 표현·거리 조절·갈등 반응처럼 해당 주제의 선택 습관에 초점을 맞춘다. 다른 주제는 그 질문의 실제 선택과 연결되는 특징만 골라 설명한다. 기존 소절 ID와 장 수는 유지하고 첫 소절 제목은 구매 언어로 신청 주제와 성향의 연결을 드러낸다. 예를 들어 재물 상담은 돈을 다루는 나의 성향, 이직 상담은 일과 변화를 대하는 나의 성향처럼 쓴다. 자기 기준·감정과 관계 반응·강점과 과해질 때의 부담 중 실제 근거가 있는 특징을 구체적으로 설명한다. 계산 사실의 쉬운 뜻 → 생활에서 드러날 조건 → 현재 고민과의 연결을 쓴다. 재물·연애·직업·시기 운세로 이 부분을 대신하지 않는다. 출생 성향 근거가 부족하면 그 한계를 밝히고 입력된 상황에 근거한 반응 패턴만 설명한다. 궁합은 각 사람의 근거를 구별하고 퓨전은 체계를 섞지 않는다.'
      : '첫 장의 전체 성향 분석을 반복하지 않고 이번 장의 질문과 관련된 특징만 연결한다.',
    counseling:'냉정함은 사람에 대한 평가가 아니라 선택의 비용·현실 조건·불확실성을 분명히 보는 태도다. 실제 근거로 판단을 먼저 밝히고, 그런 선택을 하게 되는 필요나 부담을 조건부로 공감한 뒤, 오늘 감당할 수 있는 작은 행동과 선택권을 제안한다. 공감과 따뜻한 조언은 마지막 캐릭터 한마디에만 몰아넣지 말고 해석과 행동 문단에도 연결한다. 확인하지 않은 과거·상처·감정을 아는 척하지 않는다. 비난·훈계·빈 칭찬·성공 보장 대신 구체적인 강점과 조정 방법을 함께 쓴다. 같은 위로나 조언을 반복하지 않는다. 저장된 화자의 말투와 구매 언어를 유지한다.',
  };
}
