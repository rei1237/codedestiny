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

const STAGE_IMAGES = [
  "무대 위에서는 스포트라이트를 자연스럽게 끌어당기는 중심축",
  "카메라가 스쳐도 서사가 남는 표정 연출형",
  "강약 조절이 뛰어난 퍼포먼스 디렉터형",
  "팬의 시선을 부드럽게 끌어당기는 발광형",
];

const HIDDEN_CHARMS = [
  "밝은 에너지 뒤에 감정의 결을 오래 품는 면",
  "카리스마 이미지 속 의외로 섬세한 루틴형 성향",
  "무심한 듯하지만 디테일을 놓치지 않는 관찰력",
  "강한 존재감 안에 안정감을 주는 온기",
];

const MISSION_POOL = [
  "오늘의 최애 무대 1장면을 골라 나만의 한 줄 평 남기기",
  "응원 메시지 12자 챌린지: 짧고 선명하게 마음 표현하기",
  "최애 덕질 플레이리스트 3곡으로 감정 리셋 루틴 만들기",
  "포토카드와 함께 오늘의 감정 키워드 3개 기록하기",
  "과몰입 신호가 오면 10초 호흡 후 응원 템포 다시 맞추기",
];

export function generateBiasPersonalityReport(args: ReportArgs) {
  const stageImage = STAGE_IMAGES[args.totalScore % STAGE_IMAGES.length];
  const hiddenCharm = HIDDEN_CHARMS[(args.totalScore + args.fandomScore) % HIDDEN_CHARMS.length];

  return [
    `${args.biasName}의 기본 에너지는 ${args.biasEnergyType}로 읽힙니다. 겉으로는 ${args.biasMood} 무드가 선명하게 드러나지만, 실제로는 감정의 속도를 스스로 조율하는 힘이 큰 타입입니다.`,
    `${stageImage}에 가깝고, 팬에게는 단순한 설렘보다 "계속 지켜보고 싶게 만드는 서사"를 남깁니다.`,
    `관계에서 보이는 매력 포인트는 팬의 리듬을 읽고 텐션을 맞춰주는 공감력입니다. 특히 ${args.relationMood} 감성의 팬에게 안정감과 몰입감을 동시에 주는 경향이 강합니다.`,
    `숨겨진 반전 매력은 ${hiddenCharm}이며, 그래서 오래 덕질할수록 새로운 결이 계속 보입니다.`,
    `상징 키워드: ${args.connectionKeyword.join(", ")}`,
  ].join("\n\n");
}

export function generateCompatibilityReport(args: ReportArgs) {
  const caution = args.totalScore >= 88
    ? "감정이 빠르게 올라올 때 현실 루틴을 함께 지켜 균형을 맞추면 더 오래 즐길 수 있습니다."
    : "응원 템포를 무리하게 끌어올리기보다, 주간 루틴으로 나눠 덕질하면 피로를 줄일 수 있습니다.";

  return [
    `전체 궁합 점수는 ${args.totalScore}점입니다. 입력된 생년월일/이름 패턴을 기반으로 계산한 결과, 두 에너지의 접점이 안정적으로 형성됩니다.`,
    `세부 점수는 감정 궁합 ${args.emotionalScore}점, 팬심 궁합 ${args.fandomScore}점, 장기 덕질 궁합 ${args.longTermScore}점, 응원 방식 궁합 ${args.supportStyleScore}점입니다.`,
    `서로에게 끌리는 포인트는 "감정 회복"과 "무대 몰입"의 교차에 있습니다. 사용자는 최애의 톤에서 정서적 회복감을 얻고, 최애는 사용자의 응원 리듬과 잘 맞는 흐름을 만듭니다.`,
    `조심해야 할 과몰입 포인트는 컨디션이 낮은 날에도 텐션을 동일하게 유지하려는 패턴입니다. ${caution}`,
    `잘 맞는 덕질 방식 추천: 주 2~3회 집중 응원 + 짧은 기록 루틴 + 감정 과열 시 10초 리셋 호흡.`,
  ].join("\n\n");
}

export function generateEnergyConnectionReport(args: ReportArgs) {
  const oneLine = `${args.userName}님의 ${args.userEnergyType}와 ${args.biasName}의 ${args.biasEnergyType}가 만나, 오늘은 ${args.connectionKeyword[0] || "네온 공명"}이 특히 선명합니다.`;
  const mission = MISSION_POOL[(args.totalScore + args.supportStyleScore) % MISSION_POOL.length];

  const report = [
    `두 사람의 에너지 연결 키워드는 ${args.connectionKeyword.join(", ")}입니다. 이 조합은 "현실의 나를 지키면서도 설렘을 유지하는 팬덤형 연결"에 가깝습니다.`,
    `${args.userName}님이 ${args.biasName}에게 끌리는 이유는 단순한 외형 매력보다, 무대를 볼 때 내 감정의 결이 정리되는 경험 때문입니다.`,
    `최애를 볼 때 회복되는 감정은 "다시 시작해도 괜찮다"는 감각이며, 이는 일상 동기부여에도 연결됩니다.`,
    `${args.biasName}의 에너지는 오늘 ${args.userName}님에게 작은 실행력을 부여합니다. 거창한 목표보다 짧고 정확한 응원 루틴이 더 큰 만족을 만듭니다.`,
    `소장용 포토카드는 "나의 감정 리듬을 돌려주는 상징 오브젝트"로 해석할 수 있습니다.`,
  ].join("\n\n");

  return {
    oneLine,
    mission,
    report,
  };
}
