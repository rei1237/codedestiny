import type {DomainId, Evidence} from '../../fortune/shared/contracts';

export const RECOGNITION_VERSION = 'grounded-recognition-20261007';

// These are reading lenses, never calculated traits or evidence of a lived event.
// Only the chapter's already selected, privacy-filtered facts can activate a lens.
const LENSES: Record<DomainId, {id:string; labels:string[]; guidance:string}[]> = {
  saju: [
    {id:'role-and-expression', labels:['tenGodsByPillar','pillarDetails','tenGodProfile'], guidance:'실제 십성의 위치·관계와 월령을 함께 읽어 책임을 지는 방식, 부탁을 거절하거나 자기 요구를 표현할 때 들 수 있는 노력을 살핀다. 특정 십성 하나를 착함·억압·희생의 증거로 삼지 않는다.'},
    {id:'competing-needs', labels:['natalInteractions','seasonalBalance','strengthHeuristic','usefulGod','jong'], guidance:'계산된 합충과 계절·강약·조절 판단이 허용하는 범위에서 하고 싶은 것과 감당할 수 있는 것의 간격을 살핀다. 종격→억부→조후의 기존 우선순위를 지키고 오행 과다·결핍만으로 힘든 과거를 만들지 않는다.'},
    {id:'changing-demands', labels:['questionTiming','yearlyLuck','monthlyLuck'], guidance:'실제 제공된 시기와 원국의 작용 안에서 익숙한 대응을 바꿔야 하는 부담을 설명한다. 과거 사건이나 고생한 나이를 역산하지 않는다.'},
  ],
  ziwei: [
    {id:'private-and-public', labels:['lifePalace','bodyPalace','palaces'], guidance:'실제 명궁·신궁·복덕궁·관록궁 등 질문에 관련된 궁과 별의 강약으로 겉으로 맡는 역할과 스스로 편안해지는 조건의 차이를 읽는다. 같은 궁의 중복을 별도 근거로 세지 않는다.'},
    {id:'attention-and-obligation', labels:['fourTransformations','sanFangSiZheng'], guidance:'계산된 사화의 별·궁·출처와 궁 연결로 신경을 많이 쓰는 영역, 기대와 책임이 겹치는 조건을 살핀다. 화기를 곧 불행·상처·질병으로 읽지 않는다.'},
  ],
  astrology: [
    {id:'needs-and-response', labels:['planets','ascendant','aspects'], guidance:'실제 태양·달·수성·금성·화성의 배치와 계산된 각으로 의식적으로 원하는 것, 안정되는 조건, 표현·행동 속도의 차이를 살핀다. 예를 들어 욕구와 표현이 어긋나는 근거가 있을 때만 말한 뒤 혼자 다시 곱씹는 장면을 조건부로 제시한다.'},
    {id:'effort-and-boundaries', labels:['houseRulers','aspects','chartSect'], guidance:'실제 하우스 주인 배치와 각에서 질문에 관련된 책임·경계·노력의 조건을 읽는다. 토성이나 긴장각 하나로 엄격한 부모·상처·가난을 지어내지 않고 조화각도 편한 인생으로 단정하지 않는다.'},
  ],
  vedic: [
    {id:'inner-and-outer-rhythm', labels:['lagna','moon','moonNakshatra','planets','grahas'], guidance:'Lahiri 체계의 라그나와 달·나크샤트라, 실제 행성 배치로 일을 대하는 방식과 감정을 회복하는 조건의 차이를 살핀다. 파다·각·품위는 제공된 경우에만 쓴다.'},
    {id:'responsibility-and-transition', labels:['houses','bhavas','yogas','vimshottariDasha','questionTiming'], guidance:'실제 하우스 주인·조건이 확인된 요가·다샤의 위계와 기간으로 현재 요청받는 역할과 소모되는 노력을 연결한다. 업보·전생·벌로 힘듦을 정당화하거나 다샤로 과거 사건을 확정하지 않는다.'},
  ],
  sukuyo: [
    {id:'relating-rhythm', labels:['personA'], guidance:'계산된 본명숙에 실제 제공된 특징으로 친밀감·표현·거리 조절을 살핀다. 이름만 있는 경우 구체적인 성향·힘듦을 새로 추론하지 않는다.'},
    {id:'different-distance', labels:['personB','relation','forwardDistance','reverseDistance','distanceLabel'], guidance:'두 사람 자료가 있을 때 방향별 관계와 거리를 함께 읽어 한쪽에는 관심인 행동이 다른 쪽에는 부담일 수 있는 조건을 설명한다. 관계 유형만으로 가해자·피해자·실제 상대 마음·파국을 정하지 않는다.'},
  ],
  tarot: [
    {id:'present-tension', labels:['cards','reading','tarotConsultation'], guidance:'저장된 카드·자리·정역방향과 카드 사이의 관계를 질문에 연결해 기대와 망설임, 기다림이나 선택에 드는 노력을 살핀다. 카드 의미의 고정 문구를 나열하지 않는다. 타고난 성격·실제 과거·상대 속마음의 증거로 사용하지 않는다. 사용자 선택 전에는 해석하지 않는다.'},
  ],
};

export const RECOGNITION_CONTRACT = [
  '질문에 먼저 답한 뒤, 그 질문과 직접 관련된 공감 장면 한 가지를 기존 생활 장면 또는 해석 문단에 자연스럽게 연결한다. 성향 이름을 나열하는 데서 끝내지 말고 그 방식으로 버텨 왔을 때 들 수 있는 노력·엇갈린 기대·알아주지 못하는 부담을 구체적으로 설명한다.',
  '계산 사실 → 쉬운 의미 → 질문과 맞는 생활 조건 → 그때 들 수 있는 감정·노력 → 선택 가능한 작은 행동을 연결한다. 좋은 신호에서도 유지에 드는 노력과 여지를 읽고, 힘든 신호에서도 사용자의 강점과 선택권을 남긴다. 모든 사람에게 고통이나 상처가 있다고 전제하지 않는다.',
  '사용자가 직접 밝힌 사실에는 그 표현을 정확히 받아 공감한다. 밝히지 않은 경험은 “만약 …한 상황이 반복됐다면, …하는 데 힘이 들었을 수 있어요”처럼 조건부로 제시한다. 단순히 “수 있어요”를 붙이는 것으로 미제공 사건의 창작을 허용하지 않는다. 가족사·괴롭힘·가난·트라우마·진단·관계 상태·과거 사건은 만들지 않는다.',
  '넌 겉으론 강하지만 속으론 여리다, 아무도 몰라줬다 같은 누구에게나 맞는 문장을 근거 없이 쓰지 않는다. 실제 근거가 어떤 조건에서 해당 장면으로 연결되는지 설명하고 반대 신호가 있으면 함께 제시한다. 맞지 않는 장면은 사용자가 내려놓거나 정정할 수 있게 한다. 공감받기 위해 추가 질문·구매를 해야 한다고 말하지 않는다.',
  '아래 lenses는 해석 후보이며 계산 결론이 아니다. 제공된 실제 값으로 지지되고 현재 질문과 관련된 후보만 골라 쓴다. sources에는 실제 사용한 factIds만 넣는다. 적합한 후보가 없으면 개인화된 힘듦을 억지로 만들지 말고 사용자가 말한 상황에만 반응한다. 새 계산·점수·확률·재생성·출력 필드를 만들지 않는다.',
  '화자는 표현만 바꾼다. 영냥이는 친근하게 이해를 돕고, 연이는 노력과 마음을 차분하게 받아주며, 네오는 부담이 생기는 조건을 명료하게 짚는다. 다정함으로 긍정 결론을, 직설성으로 부정 결론을 만들지 않는다. 후속 답변은 같은 장면을 반복하지 않고 새로 확인된 상황에 연결하며 확인·정정·지원에는 공감 해석을 억지로 덧붙이지 않는다.',
].join('\n');

const present = (v:unknown):boolean => v !== null && v !== undefined && v !== '' &&
  (typeof v !== 'object' || Object.keys(v).length > 0);

export function buildRecognition(facts:readonly Evidence[], domains:readonly string[]) {
  const lenses = [...new Set(domains)].flatMap(domain => (LENSES[domain as DomainId] || []).flatMap(lens => {
    const factIds = facts.filter(f => f.id.startsWith(domain+'.') && lens.labels.includes(f.label) && present(f.value)).map(f => f.id);
    return factIds.length ? [{domain, id:lens.id, factIds, guidance:lens.guidance}] : [];
  }));
  return {version:RECOGNITION_VERSION, contract:RECOGNITION_CONTRACT, lenses};
}
