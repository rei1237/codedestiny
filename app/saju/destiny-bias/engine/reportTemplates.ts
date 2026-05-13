type ReportArgs = {
  userName: string;
  biasName: string;
  userEnergyType: string;
  biasEnergyType: string;
  totalScore: number;
  emotionalScore: number;
  fandomScore: number;
  longTermScore: number;
  supportStyleScore: number;
  relationMood: string;
  biasMood: string;
  connectionKeyword: string[];
};

function hasFinalConsonant(value: string) {
  const text = String(value || "").trim();
  if (!text) return false;

  const chars = Array.from(text);
  const last = chars[chars.length - 1];
  if (!last) return false;

  const code = last.charCodeAt(0);
  if (code >= 0xac00 && code <= 0xd7a3) {
    return (code - 0xac00) % 28 !== 0;
  }

  if (/[0-9]/.test(last)) {
    return /[013678]/.test(last);
  }

  if (/[a-z]/i.test(last)) {
    return /[bcdfghjklmnpqrstvwxyz]$/i.test(last);
  }

  return false;
}

function withParticle(value: string, consonant: string, vowel: string) {
  return `${String(value || "").trim()}${hasFinalConsonant(value) ? consonant : vowel}`;
}

const STAGE_IMAGES = [
  "센터가 아니어도 시선이 자동 포커싱되는 자기장형",
  "카메라가 스치면 장면이 서사로 변하는 컷메이커형",
  "강약을 리듬처럼 타서 무대를 장악하는 디렉터형",
  "과한 제스처 없이도 팬 심박을 올리는 미세발광형",
];

const HIDDEN_CHARMS = [
  "강한 텐션 뒤에서 감정을 정리해 주는 정돈력",
  "카리스마 바깥에 숨어 있는 디테일 집착력",
  "무심해 보여도 작은 변화를 다 읽어내는 레이더",
  "존재감이 큰데도 이상하게 편안한 온도감",
];

const MISSION_POOL = [
  "오늘 직캠에서 심장 흔든 7초 구간만 저장하고 한 줄 코멘트 남기기",
  "응원 멘트 14자 챌린지: 오글거림 없이 센스 있게",
  "플리 3곡으로 텐션 리셋 루프 만들고 내일 같은 시간에 반복",
  "포토카드 보면서 오늘 감정 키워드 3개를 별자리처럼 기록",
  "과몰입 경보 뜨면 10초 호흡하고 응원 템포를 반 박자 늦추기",
];

const SIGNAL_POOL = [
  "응원봉 박자와 심장 BPM이 동기화되는 밤",
  "조명이 퍼지는 순간 감정선이 또렷해지는 연결",
  "낮엔 차분, 밤엔 폭발하는 듀얼 공명 패턴",
  "잔광처럼 남아 하루를 버티게 하는 운명 시그널",
  "짧은 눈맞춤 한 번으로 서사가 잠금해제되는 무드",
];

export function generateBiasPersonalityReport(args: ReportArgs) {
  const stageImage = STAGE_IMAGES[args.totalScore % STAGE_IMAGES.length];
  const hiddenCharm = HIDDEN_CHARMS[(args.totalScore + args.fandomScore) % HIDDEN_CHARMS.length];

  return [
    `사주형 에너지 매칭 기준으로 ${args.biasName}의 기본 결은 ${args.biasEnergyType}입니다. 겉무드는 ${args.biasMood}로 보이지만, 내부 파동은 생각보다 정교해서 감정의 온도를 스스로 조절하는 타입으로 읽힙니다.`,
    `무대 체감은 ${stageImage}에 가깝습니다. 그래서 한 장면만 봐도 "오늘 왜 이렇게 생각나지?" 하는 잔상이 길게 남습니다.`,
    `관계 축에서는 ${args.relationMood} 모드의 팬과 합이 좋습니다. 텐션을 억지로 올리지 않아도, 서로 리듬이 맞을 때 몰입이 급상승하는 구조입니다.`,
    `숨은 매력은 ${hiddenCharm}입니다. 처음엔 화려함이 먼저 보이고, 오래 볼수록 디테일이 천천히 열리는 타입이에요.`,
    `에너지 키워드: ${args.connectionKeyword.join(", ")}`,
    `한 줄 결론: ${args.biasName}의 아우라는 순간 폭발형보다 잔광 누적형에 가깝고, 그래서 덕질 만족도가 시간이 지날수록 더 커집니다.`,
  ].join("\n\n");
}

export function generateCompatibilityReport(args: ReportArgs) {
  const caution = args.totalScore >= 88
    ? "감정이 급상승할 때도 루틴 앵커(수면/식사/기록)만 지키면 오래 행복하게 갑니다."
    : "한 번에 불태우기보다 주간 루틴으로 분할 응원하면 에너지 소모를 크게 줄일 수 있습니다.";

  return [
    `사주 입력값 기반 궁합 점수는 ${args.totalScore}점입니다. 결론부터 말하면 두 사람은 "즉시 점화 + 장기 안정"이 동시에 가능한 페어링입니다.`,
    `세부 스코어는 감정 ${args.emotionalScore}점, 팬심 ${args.fandomScore}점, 장기지속 ${args.longTermScore}점, 응원방식 ${args.supportStyleScore}점으로 잡혔습니다.`,
    `끌림 포인트는 감정 회복과 무대 몰입의 교차 지점입니다. 한쪽이 과열되면 다른 축이 완충해 줘서, 오래 갈수록 밸런스가 좋아지는 구조입니다.`,
    `주의 포인트는 "컨디션 무시한 고정 텐션"입니다. ${caution}`,
    `추천 루틴은 주 2~3회 집중 응원 + 짧은 로그 기록 + 과열 시 10초 리셋입니다. 이 조합이 만족도와 지속력을 같이 올려줍니다.`,
    `총평: 이 궁합은 반짝이고 끝나는 타입이 아니라, 기록할수록 서사가 두꺼워지는 성장형 결입니다.`,
  ].join("\n\n");
}

export function generateEnergyConnectionReport(args: ReportArgs) {
  const oneLine = `${withParticle(`${args.userName}님`, "은", "는")} ${withParticle(args.userEnergyType, "과", "와")} ${args.biasName}의 ${withParticle(args.biasEnergyType, "이", "가")} 만나, 오늘은 ${withParticle(args.connectionKeyword[0] || "네온 공명", "이", "가")} 특히 선명합니다.`;
  const mission = MISSION_POOL[(args.totalScore + args.supportStyleScore) % MISSION_POOL.length];

  const report = [
    `오늘 연결 키워드는 ${args.connectionKeyword.join(", ")}입니다. 이 패턴은 "현실 밸런스를 지키면서 설렘을 오래 유지"하는 사주형 공명으로 분류됩니다.`,
    `${args.userName}님이 ${args.biasName}에게 끌리는 핵심은 외형보다 에너지 결입니다. 무대를 볼 때 내 감정이 정리되는 느낌이 드는 이유가 여기서 나옵니다.`,
    `회복 트리거는 "다시 시작할 수 있다"는 감각입니다. 덕질이 단순 소비가 아니라 일상 회복 루틴으로 작동하는 타입이에요.`,
    `오늘은 큰 결심보다 작은 실행이 유리합니다. 짧고 정확한 응원 루틴이 오히려 파동을 안정시키고 만족도를 끌어올립니다.`,
    `포토카드 해석 키워드: 감정 리듬을 되돌리는 개인 앵커. 컨디션이 흔들릴 때 이 카드가 정렬 스위치 역할을 합니다.`,
    `실전 팁: 감정이 올라오면 바로 소비하지 말고 3줄 로그를 남긴 뒤 행동하세요. 이 순서가 과열을 줄이고 여운을 길게 만듭니다.`,
  ].join("\n\n");

  return {
    oneLine,
    mission,
    report,
  };
}

export function generateBiasEnergySummary(args: ReportArgs) {
  const energySignal = args.connectionKeyword[1] || "무대 몰입";
  return [
    `${withParticle(args.biasName, "은", "는")} ${args.biasEnergyType} 결을 가진 파동형입니다. 밀어붙이는 타입이 아니라, 맞는 리듬에서 출력이 급격히 상승합니다.`,
    `핵심 공명축은 ${energySignal}입니다. ${withParticle(args.userName, "이", "가")} 응원 템포를 일정하게 유지할수록 반응 에너지가 더 맑고 오래 올라옵니다.`,
    `오늘의 운영법: 짧고 선명한 멘트 + 간격 있는 응원 루틴. 과열 없이도 존재감은 충분히 커집니다.`,
  ].join("\n\n");
}

export function generateChemistrySummary(args: ReportArgs) {
  const first = args.connectionKeyword[0] || "네온 공명";
  const second = args.connectionKeyword[1] || "무대 몰입";
  return `${args.userName}님과 ${args.biasName}의 공명축은 ${first} · ${second}입니다. 초반 점화가 빠른데 루틴 앵커를 걸면 오래 반짝이는 희귀 결로 해석됩니다.`;
}

export function generateDestinySignal(args: ReportArgs) {
  return SIGNAL_POOL[(args.totalScore + args.supportStyleScore + args.fandomScore) % SIGNAL_POOL.length];
}
