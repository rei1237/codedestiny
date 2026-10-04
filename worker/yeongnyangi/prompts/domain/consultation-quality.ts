import type {DomainContext} from '../../fortune/shared/contracts';

// Editorial guidance only: no new calculation, output field, quality gate or paid retry.
export const CONSULTATION_QUALITY_VERSION='four-system-counseling-v2';
export const CONSULTATION_QUALITY_POLICY={
  structure:'기존 sectionContract와 장별 역할을 유지한다. 각 해석에서 결론 → 실제 계산 근거와 쉬운 뜻 → 생활에서 드러날 조건 → 반대 가능성·한계 → 선택 가능한 행동과 관찰 기준을 연결한다. 모든 소절에 같은 순서를 기계적으로 반복하거나 새 소절을 추가하지 않는다. 시기·장면·선택은 이번 장 계약이 허용할 때만 쓴다.',
  evidence:'sources에 유효한 ID가 있다는 것만으로 문장의 의미가 입증되지는 않는다. 그 근거의 실제 값으로 설명할 수 있는 해석만 한다. 없는 십성·신살·별·요가·각은 부재로 설명하고, 반대 성향·특별한 능력·낮은 위험·좋은 결과를 도출하지 않는다. 미제공 정보와 계산된 부재를 구별한다. 하나의 근거로 성격·직업·경제 상태·상대 마음을 연쇄 확정하지 않는다.',
  counseling:'전문용어는 처음 등장할 때 짧게 풀어 쓴다. 추상적인 칭찬이나 공포 대신 이 장 고유의 긴장과 선택을 다룬다. 생활 장면은 실제 경험이 아닌 가정으로 쓴다. 조언은 시작 행동과 판단을 바꿀 관찰 신호가 드러나게 쓰되, 앞 장의 행동을 단어만 바꿔 재사용하지 않는다. 명식에서 관찰 가능한 사실과 사용자가 현실에서 확인할 가설을 구분한다.',
  question:'배정된 질문을 먼저 직접 답하고 reason에는 그 답을 지지하는 실제 근거를 쉬운 말로 연결한다. 근거가 반대 가능성도 허용하면 조건을 설명한다. 시기 근거가 없으면 점검 기간을 예측 기간처럼 말하지 않는다. askEvidenceContract의 limited와 질문별 F/T 범위를 따른다. 배정되지 않은 질문의 답변 항목을 만들거나 이전 답변을 반복하지 않는다.',
  domains:{
    saju:'오행 개수나 일간 비유 하나로 성격을 확정하지 않는다. 제공된 월령·통근·조후·십성·합충의 실제 관계로 이번 장의 논점을 설명한다. 강약·용신·종격은 엔진의 참고 판단이며 미제공 관계를 계산하지 않는다. 정재가 없다고 유연한 투자에 능하다거나 편재가 없다고 저축에 강하다는 결론은 금지다. 정관·편관이 없다고 자유로운 직업·압박 없는 삶·위기 대처 능력을 도출하지 않는다. 신살은 있는 위치와 조건에 한정하며 인기를 보장하지 않는다. 배우자 자리는 관계의 과제이지 실제 배우자의 성격·존재를 확정하는 자료가 아니다.',
    ziwei:'한국 음력 명반에서 궁은 삶의 영역, 별은 그 영역을 해석하는 단서다. 실제 주성·보조성·살성과 궁 자료의 strengths(강약)를 구별하고 배치가 어떤 조건에서 강점과 부담으로 나타날지 연결한다. 명궁·신궁이 같은 궁이면 같은 배치를 두 독립 증거처럼 세지 않는다. 빈 궁은 불운으로 채우지 않고, 대궁 주성은 제공된 oppositeReference 만 참고로 빌려 쓰며 본궁 별로 세지 않는다. 사화의 별·궁과 생년/대한/유년의 출처를 구별하고 제공되지 않은 사화는 만들지 않는다. 대궁·삼합·양옆 궁은 궁 자료의 facing·trines·flanks 로 제공된 연결만 사용한다. 부부궁·질액궁으로 상대 성격이나 질환을 확정하지 않는다.',
    vedic:'Lahiri sidereal·whole-sign bhava를 유지한다. 라그나(삶을 마주하는 출발점), 달·나크샤트라·파다(감정 반응의 해석 단서)의 서로 다른 역할을 설명한다. 이번 장에 제공된 행성의 하우스·하우스 주인 배치·품위·애스펙트를 실제 값으로 연결한다. 요가는 엔진이 확인한 구성·강도·제약만 해설하며 부재를 실패로 보지 않는다. 다샤와 안타르다샤는 제공된 시작·끝과 위계 안에서 읽으며 날짜가 곧 사건 발생일은 아니다. 분할 차트는 원차트의 해당 주제와 대조하는 보조 행성 배치다. 완전한 분할 하우스·상승점·룰러를 만들지 않는다. 트랜짓·프라티얀타르다샤·서양 tropical 해석을 섞지 않는다.',
    astrology:'서양 tropical·Placidus 출생 차트다. 태양(의식적 방향), 달(감정 반응), 상승점(접근 방식)을 같은 성격 설명으로 합치지 않는다. 이번 장의 실제 행성·sign·house와 제공된 각의 두 행성·종류·orb를 연결한다. 오브만으로 사건의 강도나 적중률을 수치화하지 않는다. 긴장각은 재능과 조절 부담, 조화각은 쉽게 활용하는 힘과 안주 가능성을 함께 설명한다. 세대 행성의 별자리만으로 개인 경험을 단정하지 않는다. 하우스 주인은 제공된 전통 7행성 룰러 배치만 쓰고 천왕성·해왕성·명왕성을 하우스 주인으로 읽지 않는다. 본질 품위·섹트·원소 분포는 제공된 값만 근거로 쓰고 새로 판정하지 않는다. 트랜짓 없는 출생 배치로 미래 사건 날짜를 예측하지 않는다. 베다 다샤·sidereal을 섞지 않는다.',
  },
} as const;

export function buildConsultationQuality(contexts:readonly DomainContext[],facts:DomainContext,symbolic=false){
  // A fusion chapter can select one domain; the original analysis must also be single-system.
  if(symbolic||contexts.length!==1)return undefined;
  const domain=contexts[0].domain;
  if(!(domain in CONSULTATION_QUALITY_POLICY.domains))return undefined;
  return {
    version:CONSULTATION_QUALITY_VERSION,
    structure:CONSULTATION_QUALITY_POLICY.structure,
    evidence:CONSULTATION_QUALITY_POLICY.evidence,
    counseling:CONSULTATION_QUALITY_POLICY.counseling,
    question:CONSULTATION_QUALITY_POLICY.question,
    domain:CONSULTATION_QUALITY_POLICY.domains[domain as keyof typeof CONSULTATION_QUALITY_POLICY.domains],
    availableFactIds:facts.facts.map(f=>f.id),
    limitations:facts.limitations,
  };
}
