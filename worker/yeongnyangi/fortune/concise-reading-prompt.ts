import type {ChapterSpec} from './book-contracts';

type ConcisePromptOptions = {
  domains?: string[];
  plainLanguageOnly?: boolean;
  questionCount?: number;
};

const domainFocus: Record<string, string> = {
  saju: '제공된 일간·월지와 오행·십성의 관계 중 이번 논점을 가르는 근거를 연결한다. 강점이 유용한 조건과 부담으로 바뀌는 조건을 구분한다. 원국의 성향과 제공된 운의 시기를 섞지 않는다.',
  ziwei: '이번 주제의 궁과 제공된 성요·사화의 연결이 어떤 선택 패턴을 만드는지 설명한다. 별의 뜻을 나열하거나 다른 궁의 결론을 이번 궁의 사실처럼 쓰지 않는다.',
  sukuyo: '제공된 숙과 관계 유형을 바탕으로 친밀해지는 속도·거리 조절·갈등 대응의 차이를 설명한다. 관계 이름 자체를 좋은 관계나 나쁜 관계의 판정으로 쓰지 않는다.',
  vedic: '제공된 라그나·라시·나크샤트라와 해당 기간 근거 중 이번 주제에 필요한 관계만 연결한다. 서양 점성술의 기준으로 바꾸거나 제공되지 않은 다샤를 만들지 않는다. 출생 배치만 있으면 올해의 기회나 유리한 시기라고 확정하지 않고, 요청 기간의 판단에 필요한 근거가 없음을 밝힌다.',
  astrology: '제공된 행성·하우스·각의 조합이 드러나는 조건을 연결한다. 별자리 일반론 대신 서로 다른 신호가 함께 작동하는 방식을 설명하고 출생 배치와 트랜싯을 구분한다.',
  tarot: '저장된 카드·위치·정역방향을 그대로 읽고 카드 사이의 긴장과 이어지는 흐름으로 질문에 답한다. 카드 뜻을 나열하지 않고 상대의 생각을 사실로 단정하지 않는다. 이번 질문에서 살펴볼 가능한 선택 패턴으로 읽으며, 카드로 타고난 성격·고유한 강점·계속될 행동을 확정하지 않는다.',
};

// Depth comes from the reasoning, not a higher word or provider-call count.
const tierDepth: Partial<Record<NonNullable<ChapterSpec['tier']>, string>> = {
  mackerel: '핵심 읽기: 이 장의 가장 중요한 판단, 그 판단을 뒷받침하는 근거, 먼저 해볼 행동을 분명히 연결한다.',
  salmon: '상세 읽기: 핵심 판단에 더해 왜 그런 흐름이 생기는지와 생활에서 어떻게 드러날 수 있는지를 구분한다. 같은 주제라도 근거의 원인과 현실의 양상을 풀어서 설명한다.',
  flounder: '심화 읽기: 원인과 생활 양상에 더해 서로 다른 근거가 지지하거나 제한하는 조건을 구분한다. 같은 주제에서도 어떤 상황에 해석이 달라지는지, 그때 선택할 대안은 무엇인지 설명한다.',
  tuna: '종합 심화 읽기: 원인·생활 양상·조건별 대안을 연결하고, 제공된 근거 중 이번 판단에서 무엇을 우선하는지와 이유를 설명한다. 같은 주제의 선택지를 상황별로 비교하고 행동 뒤 무엇을 관찰해 선택을 조정할지까지 제시한다.',
};

/** A first-attempt writing contract, not a new rejection or regeneration gate. */
export function conciseReadingPrompt(chapter: ChapterSpec, options: ConcisePromptOptions = {}): Record<string, unknown> {
  const domains = [...new Set(options.domains || chapter.systems || [])];
  return {
    conciseReading: {
      contractVersion: 'concise-evidence-language-20260930-r2',
      goal: '분량보다 이 사람의 질문에 대한 구체적인 판단을 우선한다. 모든 해설은 구매 언어로 쓴다.',
      opening: 'summary는 이 장의 판단을 1~2문장으로 바로 말한다. 질문 복창·인사·상투적 위로·목차 예고는 생략한다. 직접 답한 뒤 그 판단이 달라지는 조건을 짧게 붙인다.',
      personalBasis: '사용자가 실제로 제공한 고민·상황과 계산된 근거만 연결한다. 이름만 바꾸어도 누구에게나 맞는 칭찬 대신 서로 다른 근거가 만드는 구체적인 선택 패턴을 짚는다. 알려주지 않은 직업·과거 사건·관계 상태를 맞혔다고 꾸미지 않는다. 알려주지 않은 현재 습관을 이미 반복해 왔거나 계속 유지 중이라고 전제하지 않는다.',
      explanation: '해석 소절은 판단 → 실제 근거와 쉬운 뜻 → 그 해석이 드러날 수 있는 생활 신호로 이어간다. 소절마다 다른 정보를 더하고, 같은 결론을 표현만 바꾸어 늘리지 않는다. 모순되는 근거가 있으면 판단의 한계로 설명한다.',
      recognition: '생활 장면은 사용자 경험의 단정이 아니라 스스로 확인할 수 있는 조건부 예시로 쓴다. 이 장의 고유 주제와 질문에 맞는 장면을 고르고 앞 장의 사례를 재사용하지 않는다.',
      action: '행동 소절에는 이 해석에서 나오는 우선 행동과 확인할 신호를 제시한다. 사용자가 통제할 수 있는 작고 구체적인 행동을 쓰고 막연한 마음가짐 목록은 줄인다. 관찰 시점은 운명적인 사건 날짜로 표현하지 않는다.',
      economy: 'sectionContract와 insightUnits의 고유 논점·필수 질문은 모두 유지한다. 문장마다 판단·근거·조건·행동 중 새 정보를 더하고, 요약을 본문에 그대로 복사하지 않는다. 목표 분량을 채우기 위한 재서술은 하지 않는다.',
      ...(chapter.tier && tierDepth[chapter.tier] ? {tierDepth: {
        tier: chapter.tier,
        approach: tierDepth[chapter.tier],
        boundary: '장·소절의 소유 주제와 근거 범위 안에서만 깊이를 더한다. 상위 상담도 분량을 늘려 하위 상담을 반복하지 않는다. 조건·비교·시기의 근거가 없으면 만들지 말고 한계를 밝힌다. 다른 장에 배정된 전문 해석은 끌어오지 않는다.',
      }} : {}),
      honesty: '적중률·확신 점수·성공 보장을 만들지 않는다. 근거 없는 좋은 말로 한계를 덮지 않으며 불확실성은 해당 판단 옆에서 설명한다. 개인 경험과 타인의 속마음은 제공된 사실과 해석을 구분한다. 출생 자료의 성향도 늘 드러나는 고정 특성이 아니라 조건에 따라 확인할 가설로 쓴다. ‘항상 나타난다’, ‘타고난 성향이므로 지속된다’로 확정하지 않는다.',
      ...(options.questionCount ? {questionPriority: '배정된 질문에 먼저 직접 답한다. 짧게 쓰더라도 질문 ID나 세부 질문을 누락하지 않는다. reason은 실제 근거, timing은 제공된 기간과 한계, action은 이 질문에 필요한 행동으로 구분해 같은 답을 네 번 반복하지 않는다. timing을 출생 성향의 지속성을 단정하는 칸으로 쓰지 않는다. 요청한 올해·이번 주를 뒷받침하는 해당 체계의 기간 근거가 없으면 예측 근거가 없다고 밝히고 실천·관찰 기간으로만 제시한다.'} : {}),
      domainFocus: options.plainLanguageOnly
        ? ['제공된 구조화 상징과 그 한계만 쉬운 말로 연결한다. 전문 용어·내부 근거 이름·사건 날짜·실제 위치·타인의 속마음을 새로 만들지 않는다.']
        : domains.map(domain => domainFocus[domain]).filter(Boolean),
      ...(domains.length > 1 && !options.plainLanguageOnly ? {crossReading: '체계별 판단을 먼저 구분하고 일치점과 어긋나는 점을 설명한다. 같은 관측을 공유하는 체계를 독립된 증거 수나 적중 확률로 세지 않는다.'} : {}),
    },
  };
}
