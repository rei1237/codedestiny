// AdvancedZiweiSectionV2(/ziwei/chart, 심화 자미두수) UI 크롬 전용 카피.
// 신규 필드는 en/ja/zh-CN/zh-TW만 채운다 — 나머지 로케일은 getAdvancedZiweiCopy()가 EN과 병합해 자동 폴백한다.
//
// 제외 대상(로케일 무관, 손대지 않음):
// - 명반 해석 생성 엔진: buildStarMeaningLine/buildEnergyScore/buildPalaceSpecialAdvice/buildPalaceReading/
//   buildTrackAnalysis 등이 만드는 모든 문장, PALACE_DEFINITION_MAP/STAR_MEANING_MAP/BRIGHTNESS_RULES/
//   TRANSFORMATION_RULES의 tone·caution, ZIWEI_COUNSELING_TRACKS의 purpose 외 나머지 필드(keyQuestions 등).
// - 자미두수 고유 명사(도메인 용어): 12궁 이름(명궁/형제궁 등), 별 이름(자미/천기 등), 사화 이름(화록/화권/화과/화기),
//   묘·득·리·평·함 밝기 등급명 — 다른 전통 점성 클러스터(Vedic/Graha, 나크샤트라)와 동일하게 원어 유지.

import type { LoadingLocale } from "@/constants/loadingMessages";

export interface AdvancedZiweiCopy {
  trackTitles: {
    life: string;
    career: string;
    wealth: string;
    love: string;
    relationships: string;
    family: string;
    health: string;
    timing: string;
  };
  trackPurpose: {
    life: string;
    career: string;
    wealth: string;
    love: string;
    relationships: string;
    family: string;
    health: string;
    timing: string;
  };
  chapterTitles: {
    conclusion: string;
    whyChart: string;
    realLife: string;
    repeatedPattern: string;
    currentTiming: string;
    actionAdvice: string;
    closing: string;
  };
  palaceLinkTitles: [string, string, string, string, string, string];
  sihuaLabels: { hualu: string; huaquan: string; huake: string; huaji: string };
  genderLabels: { female: string; male: string };
  calendarLabels: { solar: string; lunar: string };
  namePlaceholder: string;
  birthPlacePlaceholder: string;
  strengthKeywordLabel: string;
  cautionKeywordLabel: string;
  routineKeywordLabel: string;
  actionPlanTitles: { start: string; reduce: string; maintain: string };
  strengthDescriptions: { miao: string; deuk: string; li: string; ping: string; ham: string };

  introTitle: string;
  introDesc: string;
  introStartButton: string;
  introBasicButton: string;

  formTitle: string;
  formDesc: string;
  goBasicButton: string;
  fullscreenExitLabel: string;
  fullscreenEnterLabel: string;
  fieldNameLabel: string;
  fieldGenderLabel: string;
  fieldBirthYearLabel: string;
  fieldBirthMonthLabel: string;
  fieldBirthDayLabel: string;
  fieldBirthHourLabel: string;
  fieldCalendarLabel: string;
  fieldBirthPlaceLabel: string;
  fieldTimezoneLabel: string;
  unknownHourCheckboxLabel: string;
  leapMonthCheckboxLabel: string;
  formDisclaimer: string;
  computeButton: string;
  defaultBirthPlaceValue: string;

  alertMissingBirthHour: string;
  alertCheckInput: string;
  alertChartError: string;
  alertComputeError: string;
  loadingInitialText: string;
  progressTexts: [string, string, string, string, string];

  computingEyebrow: string;
  computingTrackLabelPrefix: string;

  resultTitleTemplate: (name: string) => string;
  resultTitleDefaultName: string;
  resultDesc: string;
  statYearFlowLabel: string;
  masterAdviceLabel: string;
  starStrengthSectionLabel: string;
  sihuaTextureLabel: string;

  selectedTrackPrefix: string;
  primaryPalaceLabel: string;
  evidenceToggleLabel: string;
  precisionNoteLabel: string;
  counselingTrackSectionLabel: string;
  corePalaceLabelPrefix: string;

  gridSectionEyebrow: string;
  gridSectionTitle: string;
  selectedPalaceLabelPrefix: string;
  centerPanelSubtitle: string;
  centerPanelDesc: string;

  rereadButtonLabel: string;
  palaceReadingSuffixLabel: string;
  emotionalTextureLabel: string;
  starPowerBalanceHint: string;
  mainStarsCardLabel: string;

  overallSummaryHeading: string;
  strongTop3Heading: string;
  weakTop3Heading: string;
  detailHeading: string;
  palaceLinkHeading: string;
  sihuaHeading: string;
  borrowedStarHeading: string;
  actionGuideHeadingPrefix: string;
  summaryTableHeading: string;

  tableColPalace: string;
  tableColDefinition: string;
  tableColMainStar: string;
  tableColAuxStar: string;
  tableColForce: string;
  tableColPriority: string;

  keywordLabelPrefix: string;

  detailCard: {
    evidenceSummaryTitle: string;
    customerReadingTitle: string;
    workingWellTitle: string;
    overworkingTitle: string;
    realLifeSceneTitle: string;
    crossPalaceTitle: string;
    currentTimingTitle: string;
    practicalUseTitle: string;
    mainStarLabel: string;
    auxLabel: string;
    sihuaLabel: string;
    connectedPalaceLabel: string;
    meaningLabel: string;
    corePatternLabel: string;
    baseTraitLabel: string;
  };

  selfCheckLabel: string;
  flowSectionLabelPrefix: string;
  stepLabel: string;

  currentTimingHeading: string;
  opportunityHeading: string;
  timingCautionHeading: string;
  timingEvidenceToggleLabel: string;

  closingHeading: string;
  closingBodyTemplate: (trackTitle: string) => string;

  borrowedStarFallback: string;
  overallSummaryLoadingLine1: string;
  overallSummaryLoadingLine2: string;
}

const ADVANCED_ZIWEI_COPY_EN: AdvancedZiweiCopy = {
  trackTitles: {
    life: "Overall Life Flow",
    career: "Career Path",
    wealth: "Wealth & Business",
    love: "Love & Spouse",
    relationships: "Relationships",
    family: "Family & Children",
    health: "Health & Life Rhythm",
    timing: "Cycles & Current Timing",
  },
  trackPurpose: {
    life: "Centers on the Life and Body palaces to read your life direction, choice habits, and repeated patterns as a whole.",
    career: "Centers on the Career palace to distinguish your working style, roles that bring results, and environments that burn you out.",
    wealth: "Centers on the Wealth palace to read how you generate income, your management habits, and where value tends to leak.",
    love: "Centers on the Spouse palace to look at the relationship types you're drawn to, how you express affection, and how you handle conflict and recovery.",
    relationships: "Centers on the Friends and Siblings palaces to read how trust forms, collaboration, rivalry, and boundary-setting.",
    family: "Reads the roles, emotional distance, and responsibility patterns within the family through the Parents, Siblings, and Children palaces.",
    health: "Centers on the Health and Fortune palaces to look at stress responses, burnout signals, and recovery routines.",
    timing: "Contrasts your natal chart with the provided cycle data to separate what deserves focus now from what calls for a conservative approach.",
  },
  chapterTitles: {
    conclusion: "The Most Important Conclusion Right Now",
    whyChart: "Why the Chart Shows This",
    realLife: "How It Shows Up in Real Life",
    repeatedPattern: "Repeating Patterns and Their Causes",
    currentTiming: "The Flow of the Current Period",
    actionAdvice: "Action Advice for You",
    closing: "Closing the Consultation",
  },
  palaceLinkTitles: [
    "Life Palace ↔ Career Palace",
    "Life Palace ↔ Spouse Palace",
    "Wealth Palace ↔ Career Palace",
    "Spouse Palace ↔ Fortune Palace",
    "Property Palace ↔ Wealth Palace",
    "Friends Palace ↔ Career Palace",
  ],
  sihuaLabels: { hualu: "Hua Lu", huaquan: "Hua Quan", huake: "Hua Ke", huaji: "Hua Ji" },
  genderLabels: { female: "Female", male: "Male" },
  calendarLabels: { solar: "Solar", lunar: "Lunar" },
  namePlaceholder: "e.g. Alex Kim",
  birthPlacePlaceholder: "e.g. Seoul, South Korea",
  strengthKeywordLabel: "Core Strengths",
  cautionKeywordLabel: "Caution Signals",
  routineKeywordLabel: "7-Day Routine",
  actionPlanTitles: { start: "Actions to Try Now", reduce: "Actions to Reduce or Moderate", maintain: "Standards to Maintain" },
  strengthDescriptions: {
    miao: "The star's power flourishes at its most brilliant",
    deuk: "The star's nature is expressed in a stable flow",
    li: "The star's power shifts depending on the situation",
    ping: "An unremarkable flow that shifts with direction",
    ham: "A state where the star's energy is easily suppressed or distorted",
  },

  introTitle: "Advanced Zi Wei 12-Palace Consultation",
  introDesc: "Beyond a basic chart view, this brings your main stars, four transformations, palace triangles, and decade cycles together into one reading of how relationships, money, and work actually play out in your choices.",
  introStartButton: "Open the Advanced Chart",
  introBasicButton: "View the Free Basic Chart",

  formTitle: "Preparing Your Advanced Zi Wei Consultation Chart",
  formDesc: "The free basic Zi Wei chart is for checking your 12-palace layout. This screen expands the same chart into an advanced consultation covering four transformations, palace triangles, decade cycles, and action advice.",
  goBasicButton: "Go to Basic Chart",
  fullscreenExitLabel: "Exit fullscreen",
  fullscreenEnterLabel: "Enter fullscreen",
  fieldNameLabel: "Name",
  fieldGenderLabel: "Gender",
  fieldBirthYearLabel: "Birth year",
  fieldBirthMonthLabel: "Birth month",
  fieldBirthDayLabel: "Birth day",
  fieldBirthHourLabel: "Birth hour",
  fieldCalendarLabel: "Solar / Lunar",
  fieldBirthPlaceLabel: "Birthplace",
  fieldTimezoneLabel: "Timezone",
  unknownHourCheckboxLabel: "Birth time unknown (noon-based reference reading)",
  leapMonthCheckboxLabel: "Leap month",
  formDisclaimer: "In Zi Wei Dou Shu, the Life and Body palaces and some palace positions shift depending on birth time. If the time is uncertain, a noon-based reference chart is shown.",
  computeButton: "Open Advanced Zi Wei Consultation",
  defaultBirthPlaceValue: "Seoul, South Korea",

  alertMissingBirthHour: "Please select the exact birth hour, or check \"birth time unknown\" to proceed with a noon-based reference chart.",
  alertCheckInput: "Please check your input values.",
  alertChartError: "Something briefly went off track while opening the chart. Please try again.",
  alertComputeError: "Something went wrong while opening the consultation view.",
  loadingInitialText: "Opening the gate of destiny...",
  progressTexts: [
    "Settling the flow of destiny...",
    "Aligning the axis of the Life and Body palaces...",
    "Weaving together the flow of all 12 palaces...",
    "Refining the sentences needed for the consultation...",
    "Getting ready to open the first scene...",
  ],

  computingEyebrow: "The Moment the Gate of Destiny Opens",
  computingTrackLabelPrefix: "Consultation track: ",

  resultTitleTemplate: (name) => `${name}'s Advanced Zi Wei Consultation Report`,
  resultTitleDefaultName: "Your",
  resultDesc: "Cross-referencing the axis of the Life and Body palaces, the brightness of the main stars, the four transformations and palace triangles, and the flow of decade and yearly cycles to walk you through your life priorities like a consultation.",
  statYearFlowLabel: "This Year's Flow",
  masterAdviceLabel: "Master Advice",
  starStrengthSectionLabel: "Star Strength",
  sihuaTextureLabel: "Texture of the Four Transformations",

  selectedTrackPrefix: "Selected consultation track · ",
  primaryPalaceLabel: "Priority Palaces",
  evidenceToggleLabel: "View chart evidence",
  precisionNoteLabel: "Precision Notes",
  counselingTrackSectionLabel: "Consultation Track",
  corePalaceLabelPrefix: "Core palaces: ",

  gridSectionEyebrow: "12-Palace Chart",
  gridSectionTitle: "Palace Layout",
  selectedPalaceLabelPrefix: "Selected palace: ",
  centerPanelSubtitle: "Zi Wei Star Chart",
  centerPanelDesc: "The stronger a palace's starlight, the more clearly that axis of destiny operates in the chart.",

  rereadButtonLabel: "Reread the current palace",
  palaceReadingSuffixLabel: "star reading",
  emotionalTextureLabel: "Emotional Texture",
  starPowerBalanceHint: "Strong stars shape direction, and weak stars signal fatigue. Real-world advice only comes alive when you catch both.",
  mainStarsCardLabel: "Key Stars",

  overallSummaryHeading: "1. Overall Chart Summary",
  strongTop3Heading: "2. Top 3 Strongest Palaces",
  weakTop3Heading: "3. Top 3 Palaces Needing Attention",
  detailHeading: "4. Detailed Consultation Reading Per Palace",
  palaceLinkHeading: "5. Cross-Palace Connection Reading",
  sihuaHeading: "6. Four Transformations Reading",
  borrowedStarHeading: "7. Borrowed-Star Correction Reading",
  actionGuideHeadingPrefix: "8. ",
  summaryTableHeading: "12-Palace Summary Table",

  tableColPalace: "Palace",
  tableColDefinition: "Meaning",
  tableColMainStar: "Main Star",
  tableColAuxStar: "Auxiliary Star",
  tableColForce: "Palace Strength",
  tableColPriority: "Consultation Priority",

  keywordLabelPrefix: "Key keywords: ",

  detailCard: {
    evidenceSummaryTitle: "Chart Evidence Summary",
    customerReadingTitle: "Reading for You",
    workingWellTitle: "When It Works Well",
    overworkingTitle: "When It Overworks",
    realLifeSceneTitle: "How It Shows Up in Real Life",
    crossPalaceTitle: "Connected with Other Palaces",
    currentTimingTitle: "What the Current Cycle Shows",
    practicalUseTitle: "Practical Ways to Use It",
    mainStarLabel: "Key main stars",
    auxLabel: "Supporting elements",
    sihuaLabel: "Four transformations",
    connectedPalaceLabel: "Connected palaces",
    meaningLabel: "Meaning",
    corePatternLabel: "Core pattern",
    baseTraitLabel: "Base tendency",
  },

  selfCheckLabel: "Self-Check Questions",
  flowSectionLabelPrefix: "Flow of the Consultation · ",
  stepLabel: "STEP",

  currentTimingHeading: "Current Period Analysis",
  opportunityHeading: "Flows Good to Use as Opportunity",
  timingCautionHeading: "Actions to Watch",
  timingEvidenceToggleLabel: "View timing evidence",

  closingHeading: "Closing the Consultation",
  closingBodyTemplate: (trackTitle) => `The flow of ${trackTitle} does not lock you into a single personality. Use the palaces that shine brightly in your chart as a source of choice, and tend to the palaces that need adjusting as a standard for daily life — that's when things move more comfortably.`,

  borrowedStarFallback: "Borrowed-star correction doesn't stand out as a major issue in this chart. Still, for important choices, checking the alignment of environment, relationships, and timing first can reduce wasted luck.",
  overallSummaryLoadingLine1: "Loading your chart data.",
  overallSummaryLoadingLine2: "The overall flow summary will appear shortly.",
};

const ADVANCED_ZIWEI_COPY: Partial<Record<LoadingLocale, AdvancedZiweiCopy>> = {
  ko: {
    trackTitles: {
      life: "종합·인생 흐름",
      career: "직업·진로",
      wealth: "재물·사업",
      love: "연애·배우자",
      relationships: "인간관계",
      family: "가족·자녀",
      health: "건강·생활 리듬",
      timing: "대운·세운·시기",
    },
    trackPurpose: {
      life: "명궁과 신궁을 중심으로 삶의 방향, 선택 습관, 반복 패턴을 통합해서 봅니다.",
      career: "관록궁을 중심으로 일하는 방식, 성과가 나는 역할, 소진되는 환경을 구분합니다.",
      wealth: "재백궁을 중심으로 수입화 방식, 관리 습관, 위험 선호와 누수 패턴을 읽습니다.",
      love: "부부궁을 중심으로 끌리는 관계 유형, 애정 표현, 갈등과 회복 방식을 봅니다.",
      relationships: "교우궁과 형제궁을 중심으로 신뢰 형성, 협업, 경쟁, 경계 설정을 읽습니다.",
      family: "부모궁, 형제궁, 자녀궁으로 가족 안의 역할과 정서적 거리, 책임 패턴을 읽습니다.",
      health: "질액궁과 복덕궁을 중심으로 스트레스 반응, 소진 신호, 회복 루틴을 봅니다.",
      timing: "원국과 제공된 운한 데이터를 대조해 지금 집중할 일과 보수적으로 접근할 일을 구분합니다.",
    },
    chapterTitles: {
      conclusion: "지금 가장 중요한 상담 결론",
      whyChart: "명반이 보여주는 이유",
      realLife: "현실에서 나타나는 모습",
      repeatedPattern: "반복되는 패턴과 원인",
      currentTiming: "현재 시기의 흐름",
      actionAdvice: "고객을 위한 실행 조언",
      closing: "상담 마무리",
    },
    palaceLinkTitles: ["명궁 ↔ 관록궁", "명궁 ↔ 부부궁", "재백궁 ↔ 관록궁", "부부궁 ↔ 복덕궁", "전택궁 ↔ 재백궁", "노복궁 ↔ 관록궁"],
    sihuaLabels: { hualu: "화록", huaquan: "화권", huake: "화과", huaji: "화기" },
    genderLabels: { female: "여성", male: "남성" },
    calendarLabels: { solar: "양력", lunar: "음력" },
    namePlaceholder: "예: 홍길동",
    birthPlacePlaceholder: "예: 대한민국 서울",
    strengthKeywordLabel: "핵심 강점",
    cautionKeywordLabel: "주의 신호",
    routineKeywordLabel: "7일 루틴",
    actionPlanTitles: { start: "지금 시도할 행동", reduce: "줄이거나 조절할 행동", maintain: "유지할 기준" },
    strengthDescriptions: {
      miao: "별의 힘이 가장 찬란하게 살아나는 상태",
      deuk: "별의 본성이 안정적으로 발휘되는 흐름",
      li: "상황에 따라 힘이 달라지는 별의 상태",
      ping: "무난하지만 방향에 따라 달라지는 흐름",
      ham: "별의 에너지가 눌리거나 왜곡되기 쉬운 상태",
    },

    introTitle: "심화 자미두수 12궁 상담",
    introDesc: "기본 명반 보기와 별개로, 주성·사화·삼방사정·대한을 한 판단으로 묶어 관계와 돈과 일의 실제 선택 흐름까지 읽습니다.",
    introStartButton: "심화 명반 열기",
    introBasicButton: "기본 무료 명반 보기",

    formTitle: "심화 자미두수 상담 명반을 준비합니다",
    formDesc: "기본 무료 자미두수는 12궁 명반 확인용입니다. 이 화면은 같은 명반을 사화·삼방사정·대한·실행 조언까지 확장해 읽는 심화 상담용입니다.",
    goBasicButton: "기본 명반으로 이동",
    fullscreenExitLabel: "전체화면 나가기",
    fullscreenEnterLabel: "전체화면 켜기",
    fieldNameLabel: "이름",
    fieldGenderLabel: "성별",
    fieldBirthYearLabel: "출생 연도",
    fieldBirthMonthLabel: "출생 월",
    fieldBirthDayLabel: "출생 일",
    fieldBirthHourLabel: "출생 시",
    fieldCalendarLabel: "양력/음력",
    fieldBirthPlaceLabel: "출생지",
    fieldTimezoneLabel: "시간대",
    unknownHourCheckboxLabel: "출생시간 미상(정오 기준 참고 리딩)",
    leapMonthCheckboxLabel: "윤달",
    formDisclaimer: "자미두수는 출생 시각에 따라 명궁·신궁과 일부 궁위가 달라집니다. 시각이 불확실하면 정오 기준 참고 명반으로 표시됩니다.",
    computeButton: "심화 자미두수 상담 열기",
    defaultBirthPlaceValue: "대한민국 서울",

    alertMissingBirthHour: "정확한 출생 시를 선택하거나, 출생시간 미상을 체크해 정오 기준 참고 명반으로 진행해 주세요.",
    alertCheckInput: "입력값을 확인해 주세요.",
    alertChartError: "명반을 여는 과정에서 잠시 흐름이 어긋났습니다. 다시 시도해 주세요.",
    alertComputeError: "상담 장면을 여는 중 문제가 생겼습니다.",
    loadingInitialText: "운명의 문을 여는 중...",
    progressTexts: [
      "운명의 결을 정돈하는 중...",
      "명궁과 신궁의 축을 맞추는 중...",
      "12궁의 흐름을 천천히 엮는 중...",
      "상담에 필요한 문장을 다듬는 중...",
      "첫 장면을 열 준비를 마치는 중...",
    ],

    computingEyebrow: "운명의 문이 열리는 순간",
    computingTrackLabelPrefix: "상담 트랙: ",

    resultTitleTemplate: (name) => `${name}님의 심화 자미두수 상담 리포트`,
    resultTitleDefaultName: "당신",
    resultDesc: "명궁·신궁의 축, 주성의 묘왕평함, 사화와 삼방사정, 대한·유년의 흐름을 함께 대조해 삶의 우선순위를 상담하듯 풀어드립니다.",
    statYearFlowLabel: "올해 흐름",
    masterAdviceLabel: "마스터 조언",
    starStrengthSectionLabel: "별의 세기",
    sihuaTextureLabel: "사화의 결",

    selectedTrackPrefix: "선택한 상담 트랙 · ",
    primaryPalaceLabel: "우선 해석 궁",
    evidenceToggleLabel: "명반 근거 보기",
    precisionNoteLabel: "정밀도 참고",
    counselingTrackSectionLabel: "상담 트랙",
    corePalaceLabelPrefix: "핵심 궁: ",

    gridSectionEyebrow: "12궁 명반",
    gridSectionTitle: "궁위 배치",
    selectedPalaceLabelPrefix: "선택한 궁: ",
    centerPanelSubtitle: "자미 성도 명반",
    centerPanelDesc: "별빛이 강한 궁일수록 명반에서 선명하게 작동하는 운명의 축입니다.",

    rereadButtonLabel: "현재 궁 다시 읽기",
    palaceReadingSuffixLabel: "성요 판독",
    emotionalTextureLabel: "감정의 결",
    starPowerBalanceHint: "강한 별은 방향을 만들고, 약한 별은 피로를 알립니다. 둘 다 놓치지 않아야 현실 조언이 살아납니다.",
    mainStarsCardLabel: "주요 별",

    overallSummaryHeading: "1. 전체 명반 종합 요약",
    strongTop3Heading: "2. 강한 궁 TOP 3",
    weakTop3Heading: "3. 관리가 필요한 궁 TOP 3",
    detailHeading: "4. 각 궁별 상세 상담 해석",
    palaceLinkHeading: "5. 궁간 연결 해석",
    sihuaHeading: "6. 사화 해석",
    borrowedStarHeading: "7. 차성 보정 해석",
    actionGuideHeadingPrefix: "8. ",
    summaryTableHeading: "12궁 요약 표",

    tableColPalace: "궁",
    tableColDefinition: "정의",
    tableColMainStar: "주성",
    tableColAuxStar: "보조성",
    tableColForce: "궁세",
    tableColPriority: "상담 우선순위",

    keywordLabelPrefix: "핵심 키워드: ",

    detailCard: {
      evidenceSummaryTitle: "명반 근거 요약",
      customerReadingTitle: "고객용 해석",
      workingWellTitle: "잘 발휘될 때",
      overworkingTitle: "과도하게 작동할 때",
      realLifeSceneTitle: "현실에서 나타나는 장면",
      crossPalaceTitle: "다른 궁과 연결했을 때",
      currentTimingTitle: "현재 운한에서 보는 부분",
      practicalUseTitle: "구체적인 활용법",
      mainStarLabel: "핵심 주성",
      auxLabel: "보조 요소",
      sihuaLabel: "사화",
      connectedPalaceLabel: "연결 궁",
      meaningLabel: "의미",
      corePatternLabel: "핵심 구성",
      baseTraitLabel: "기본 성향",
    },

    selfCheckLabel: "자기 점검 질문",
    flowSectionLabelPrefix: "상담의 흐름 · ",
    stepLabel: "STEP",

    currentTimingHeading: "현재 시기 분석",
    opportunityHeading: "기회로 쓰기 좋은 흐름",
    timingCautionHeading: "주의할 행동",
    timingEvidenceToggleLabel: "시기 근거 보기",

    closingHeading: "상담 마무리",
    closingBodyTemplate: (trackTitle) => `${trackTitle}의 흐름은 당신을 하나의 성격으로 고정하지 않습니다. 명반에서 강하게 열린 궁은 선택의 힘으로 쓰고, 조율이 필요한 궁은 생활 기준으로 돌볼 때 더 편안하게 움직입니다.`,

    borrowedStarFallback: "이번 명반에서는 차성 보정이 핵심 이슈로 크게 드러나지 않습니다. 다만 중요한 선택에서는 환경·관계·타이밍의 정렬을 먼저 확인하면 운의 낭비를 줄일 수 있습니다.",
    overallSummaryLoadingLine1: "명반 데이터를 불러오는 중입니다.",
    overallSummaryLoadingLine2: "잠시 후 전체 흐름 요약이 표시됩니다.",
  },
  ja: {
    trackTitles: {
      life: "総合・人生の流れ",
      career: "職業・進路",
      wealth: "財運・事業",
      love: "恋愛・配偶者",
      relationships: "人間関係",
      family: "家族・子ども",
      health: "健康・生活リズム",
      timing: "大運・流年・時期",
    },
    trackPurpose: {
      life: "命宮と身宮を中心に、人生の方向性、選択の習慣、繰り返されるパターンを統合して見ます。",
      career: "官禄宮を中心に、仕事の進め方、成果が出る役割、消耗する環境を見分けます。",
      wealth: "財帛宮を中心に、収入化の方法、管理習慣、リスク選好と漏れのパターンを読みます。",
      love: "夫妻宮を中心に、惹かれる関係のタイプ、愛情表現、対立と回復の方法を見ます。",
      relationships: "交友宮と兄弟宮を中心に、信頼形成、協力、競争、境界設定を読みます。",
      family: "父母宮・兄弟宮・子女宮から、家族内での役割、心理的距離、責任のパターンを読みます。",
      health: "疾厄宮と福徳宮を中心に、ストレス反応、消耗のサイン、回復ルーティンを見ます。",
      timing: "命盤と提供された運限データを照らし合わせ、今集中すべきことと慎重に扱うべきことを見分けます。",
    },
    chapterTitles: {
      conclusion: "今いちばん重要な相談の結論",
      whyChart: "命盤が示す理由",
      realLife: "現実に現れる姿",
      repeatedPattern: "繰り返されるパターンと原因",
      currentTiming: "現在の時期の流れ",
      actionAdvice: "お客様のための実行アドバイス",
      closing: "相談のまとめ",
    },
    palaceLinkTitles: ["命宮 ↔ 官禄宮", "命宮 ↔ 夫妻宮", "財帛宮 ↔ 官禄宮", "夫妻宮 ↔ 福徳宮", "田宅宮 ↔ 財帛宮", "奴僕宮 ↔ 官禄宮"],
    sihuaLabels: { hualu: "化禄", huaquan: "化権", huake: "化科", huaji: "化忌" },
    genderLabels: { female: "女性", male: "男性" },
    calendarLabels: { solar: "太陽暦", lunar: "太陰暦" },
    namePlaceholder: "例：山田太郎",
    birthPlacePlaceholder: "例：韓国 ソウル",
    strengthKeywordLabel: "核心的な強み",
    cautionKeywordLabel: "注意信号",
    routineKeywordLabel: "7日間ルーティン",
    actionPlanTitles: { start: "今試すべき行動", reduce: "減らす・調整する行動", maintain: "維持すべき基準" },
    strengthDescriptions: {
      miao: "星の力が最も輝かしく生きる状態",
      deuk: "星の本性が安定的に発揮される流れ",
      li: "状況によって力が変わる星の状態",
      ping: "無難だが方向によって変わる流れ",
      ham: "星のエネルギーが抑えられたり歪みやすい状態",
    },

    introTitle: "深化紫微斗数12宮相談",
    introDesc: "基本命盤の閲覧とは別に、主星・四化・三方四正・大限を一つの判断にまとめ、関係・お金・仕事の実際の選択の流れまで読み解きます。",
    introStartButton: "深化命盤を開く",
    introBasicButton: "無料の基本命盤を見る",

    formTitle: "深化紫微斗数相談命盤を準備します",
    formDesc: "無料の基本紫微斗数は12宮命盤の確認用です。この画面は同じ命盤を四化・三方四正・大限・実行アドバイスまで拡張して読む深化相談用です。",
    goBasicButton: "基本命盤へ移動",
    fullscreenExitLabel: "全画面を終了",
    fullscreenEnterLabel: "全画面表示",
    fieldNameLabel: "名前",
    fieldGenderLabel: "性別",
    fieldBirthYearLabel: "生年",
    fieldBirthMonthLabel: "生月",
    fieldBirthDayLabel: "生日",
    fieldBirthHourLabel: "生まれた時間",
    fieldCalendarLabel: "陽暦/陰暦",
    fieldBirthPlaceLabel: "出生地",
    fieldTimezoneLabel: "タイムゾーン",
    unknownHourCheckboxLabel: "出生時刻不明（正午基準の参考リーディング）",
    leapMonthCheckboxLabel: "閏月",
    formDisclaimer: "紫微斗数は出生時刻によって命宮・身宮と一部の宮の位置が変わります。時刻が不確かな場合は正午基準の参考命盤として表示されます。",
    computeButton: "深化紫微斗数相談を開く",
    defaultBirthPlaceValue: "韓国 ソウル",

    alertMissingBirthHour: "正確な出生時刻を選択するか、出生時刻不明にチェックして正午基準の参考命盤で進めてください。",
    alertCheckInput: "入力内容をご確認ください。",
    alertChartError: "命盤を開く過程で一時的に流れがずれました。もう一度お試しください。",
    alertComputeError: "相談画面を開く際に問題が発生しました。",
    loadingInitialText: "運命の扉を開いています...",
    progressTexts: [
      "運命の結びを整えています...",
      "命宮と身宮の軸を合わせています...",
      "12宮の流れをゆっくり織り込んでいます...",
      "相談に必要な文章を整えています...",
      "最初の場面を開く準備をしています...",
    ],

    computingEyebrow: "運命の扉が開く瞬間",
    computingTrackLabelPrefix: "相談トラック：",

    resultTitleTemplate: (name) => `${name}様の深化紫微斗数相談レポート`,
    resultTitleDefaultName: "あなた",
    resultDesc: "命宮・身宮の軸、主星の廟旺平陥、四化と三方四正、大限・流年の流れを合わせて対照し、人生の優先順位を相談のように解き明かします。",
    statYearFlowLabel: "今年の流れ",
    masterAdviceLabel: "マスターアドバイス",
    starStrengthSectionLabel: "星の強さ",
    sihuaTextureLabel: "四化の結び",

    selectedTrackPrefix: "選択した相談トラック・",
    primaryPalaceLabel: "優先解釈宮",
    evidenceToggleLabel: "命盤根拠を見る",
    precisionNoteLabel: "精度についての注記",
    counselingTrackSectionLabel: "相談トラック",
    corePalaceLabelPrefix: "核心宮：",

    gridSectionEyebrow: "12宮命盤",
    gridSectionTitle: "宮位配置",
    selectedPalaceLabelPrefix: "選択した宮：",
    centerPanelSubtitle: "紫微星図命盤",
    centerPanelDesc: "星の光が強い宮ほど、命盤の中で運命の軸としてはっきり働きます。",

    rereadButtonLabel: "現在の宮を読み直す",
    palaceReadingSuffixLabel: "星耀判読",
    emotionalTextureLabel: "感情の結び",
    starPowerBalanceHint: "強い星は方向を作り、弱い星は疲労を知らせます。両方を見逃さないことで現実的なアドバイスが生きてきます。",
    mainStarsCardLabel: "主要な星",

    overallSummaryHeading: "1. 命盤全体の総合まとめ",
    strongTop3Heading: "2. 強い宮TOP3",
    weakTop3Heading: "3. ケアが必要な宮TOP3",
    detailHeading: "4. 各宮の詳細な相談解釈",
    palaceLinkHeading: "5. 宮同士の連結解釈",
    sihuaHeading: "6. 四化の解釈",
    borrowedStarHeading: "7. 借星補正の解釈",
    actionGuideHeadingPrefix: "8. ",
    summaryTableHeading: "12宮まとめ表",

    tableColPalace: "宮",
    tableColDefinition: "定義",
    tableColMainStar: "主星",
    tableColAuxStar: "補助星",
    tableColForce: "宮勢",
    tableColPriority: "相談優先順位",

    keywordLabelPrefix: "核心キーワード：",

    detailCard: {
      evidenceSummaryTitle: "命盤根拠まとめ",
      customerReadingTitle: "あなたのための解釈",
      workingWellTitle: "うまく機能するとき",
      overworkingTitle: "過度に働くとき",
      realLifeSceneTitle: "現実に現れる場面",
      crossPalaceTitle: "他の宮とつなげたとき",
      currentTimingTitle: "現在の運限から見る部分",
      practicalUseTitle: "具体的な活用法",
      mainStarLabel: "核心主星",
      auxLabel: "補助要素",
      sihuaLabel: "四化",
      connectedPalaceLabel: "連結宮",
      meaningLabel: "意味",
      corePatternLabel: "核心構成",
      baseTraitLabel: "基本的な性向",
    },

    selfCheckLabel: "自己点検の質問",
    flowSectionLabelPrefix: "相談の流れ・",
    stepLabel: "STEP",

    currentTimingHeading: "現在の時期分析",
    opportunityHeading: "チャンスとして使いやすい流れ",
    timingCautionHeading: "注意すべき行動",
    timingEvidenceToggleLabel: "時期の根拠を見る",

    closingHeading: "相談のまとめ",
    closingBodyTemplate: (trackTitle) => `${trackTitle}の流れは、あなたを一つの性格に固定するものではありません。命盤で強く開いている宮は選択の力として使い、調整が必要な宮は生活の基準として整えるとき、より心地よく動けます。`,

    borrowedStarFallback: "今回の命盤では、借星補正が大きな課題として目立ってはいません。ただし重要な選択の際は、環境・関係・タイミングの整合を先に確認すると運の無駄遣いを減らせます。",
    overallSummaryLoadingLine1: "命盤データを読み込んでいます。",
    overallSummaryLoadingLine2: "まもなく全体の流れのまとめが表示されます。",
  },
  "zh-CN": {
    trackTitles: {
      life: "综合·人生流转",
      career: "事业·前程",
      wealth: "财运·事业",
      love: "恋爱·配偶",
      relationships: "人际关系",
      family: "家庭·子女",
      health: "健康·生活节奏",
      timing: "大限·流年·时机",
    },
    trackPurpose: {
      life: "以命宫、身宫为中心，综合解读人生方向、选择习惯与反复出现的模式。",
      career: "以官禄宫为中心，区分工作方式、能出成果的角色，以及容易耗竭的环境。",
      wealth: "以财帛宫为中心，解读赚钱方式、管理习惯、风险偏好与漏财模式。",
      love: "以夫妻宫为中心，解读吸引你的关系类型、感情表达、冲突与恢复方式。",
      relationships: "以交友宫与兄弟宫为中心，解读信任的形成、协作、竞争与界限设定。",
      family: "通过父母宫、兄弟宫、子女宫解读家庭中的角色、情感距离与责任模式。",
      health: "以疾厄宫、福德宫为中心，解读压力反应、耗竭信号与恢复routine。",
      timing: "对照本命盘与提供的运限数据，区分现在应重点关注与应保守应对的事项。",
    },
    chapterTitles: {
      conclusion: "现在最重要的咨询结论",
      whyChart: "命盘揭示的原因",
      realLife: "现实中呈现的样子",
      repeatedPattern: "反复出现的模式与原因",
      currentTiming: "当前时期的流转",
      actionAdvice: "给你的行动建议",
      closing: "咨询总结",
    },
    palaceLinkTitles: ["命宫 ↔ 官禄宫", "命宫 ↔ 夫妻宫", "财帛宫 ↔ 官禄宫", "夫妻宫 ↔ 福德宫", "田宅宫 ↔ 财帛宫", "奴仆宫 ↔ 官禄宫"],
    sihuaLabels: { hualu: "化禄", huaquan: "化权", huake: "化科", huaji: "化忌" },
    genderLabels: { female: "女性", male: "男性" },
    calendarLabels: { solar: "阳历", lunar: "阴历" },
    namePlaceholder: "例：李小龙",
    birthPlacePlaceholder: "例：韩国首尔",
    strengthKeywordLabel: "核心优势",
    cautionKeywordLabel: "注意信号",
    routineKeywordLabel: "7日routine",
    actionPlanTitles: { start: "现在可以尝试的行动", reduce: "需要减少或调节的行动", maintain: "需要维持的准则" },
    strengthDescriptions: {
      miao: "星曜之力最灿烂发挥的状态",
      deuk: "星曜本性稳定发挥的流转",
      li: "力量随情况而变化的星曜状态",
      ping: "平淡但会随方向而变化的流转",
      ham: "星曜能量容易被压制或扭曲的状态",
    },

    introTitle: "深化紫微斗数12宫咨询",
    introDesc: "有别于基础命盘查看，将主星、四化、三方四正、大限整合为一次判断，解读关系、金钱与工作中真实的选择流转。",
    introStartButton: "打开深化命盘",
    introBasicButton: "查看免费基础命盘",

    formTitle: "正在准备你的深化紫微斗数咨询命盘",
    formDesc: "免费的基础紫微斗数用于查看12宫命盘。此界面将同一命盘扩展为涵盖四化、三方四正、大限与行动建议的深化咨询。",
    goBasicButton: "前往基础命盘",
    fullscreenExitLabel: "退出全屏",
    fullscreenEnterLabel: "开启全屏",
    fieldNameLabel: "姓名",
    fieldGenderLabel: "性别",
    fieldBirthYearLabel: "出生年份",
    fieldBirthMonthLabel: "出生月份",
    fieldBirthDayLabel: "出生日期",
    fieldBirthHourLabel: "出生时辰",
    fieldCalendarLabel: "阳历/阴历",
    fieldBirthPlaceLabel: "出生地",
    fieldTimezoneLabel: "时区",
    unknownHourCheckboxLabel: "出生时间未知（以正午为基准的参考解读）",
    leapMonthCheckboxLabel: "闰月",
    formDisclaimer: "紫微斗数会根据出生时刻改变命宫、身宫及部分宫位。若时刻不确定，将显示以正午为基准的参考命盘。",
    computeButton: "打开深化紫微斗数咨询",
    defaultBirthPlaceValue: "韩国首尔",

    alertMissingBirthHour: "请选择准确的出生时辰，或勾选「出生时间未知」以正午为基准的参考命盘继续。",
    alertCheckInput: "请确认输入内容。",
    alertChartError: "开启命盘的过程中流程暂时出现偏差，请重试。",
    alertComputeError: "打开咨询画面时出现问题。",
    loadingInitialText: "正在开启命运之门...",
    progressTexts: [
      "正在梳理命运的脉络...",
      "正在校准命宫与身宫的轴线...",
      "正在缓缓编织12宫的流转...",
      "正在打磨咨询所需的文字...",
      "正在准备开启第一个场景...",
    ],

    computingEyebrow: "命运之门开启的瞬间",
    computingTrackLabelPrefix: "咨询方向：",

    resultTitleTemplate: (name) => `${name}的深化紫微斗数咨询报告`,
    resultTitleDefaultName: "您",
    resultDesc: "综合对照命宫、身宫的轴线，主星的庙旺平陷，四化与三方四正，以及大限、流年的流转，为你梳理人生的优先事项，如同一场咨询。",
    statYearFlowLabel: "今年流转",
    masterAdviceLabel: "大师建议",
    starStrengthSectionLabel: "星曜强度",
    sihuaTextureLabel: "四化之结",

    selectedTrackPrefix: "已选咨询方向 · ",
    primaryPalaceLabel: "优先解读宫位",
    evidenceToggleLabel: "查看命盘依据",
    precisionNoteLabel: "精度说明",
    counselingTrackSectionLabel: "咨询方向",
    corePalaceLabelPrefix: "核心宫位：",

    gridSectionEyebrow: "12宫命盘",
    gridSectionTitle: "宫位排布",
    selectedPalaceLabelPrefix: "已选宫位：",
    centerPanelSubtitle: "紫微星图命盘",
    centerPanelDesc: "星光越强的宫位，在命盘中运作的命运轴线就越清晰。",

    rereadButtonLabel: "重新解读当前宫位",
    palaceReadingSuffixLabel: "星曜判读",
    emotionalTextureLabel: "情绪之结",
    starPowerBalanceHint: "强星塑造方向，弱星提示疲惫。两者都不忽视，现实建议才会真正生效。",
    mainStarsCardLabel: "主要星曜",

    overallSummaryHeading: "1. 全盘综合摘要",
    strongTop3Heading: "2. 最强宫位 TOP 3",
    weakTop3Heading: "3. 需要留意的宫位 TOP 3",
    detailHeading: "4. 各宫详细咨询解读",
    palaceLinkHeading: "5. 宫位间连结解读",
    sihuaHeading: "6. 四化解读",
    borrowedStarHeading: "7. 借星补正解读",
    actionGuideHeadingPrefix: "8. ",
    summaryTableHeading: "12宫摘要表",

    tableColPalace: "宫位",
    tableColDefinition: "定义",
    tableColMainStar: "主星",
    tableColAuxStar: "辅星",
    tableColForce: "宫势",
    tableColPriority: "咨询优先级",

    keywordLabelPrefix: "核心关键词：",

    detailCard: {
      evidenceSummaryTitle: "命盘依据摘要",
      customerReadingTitle: "为你解读",
      workingWellTitle: "运作良好时",
      overworkingTitle: "过度运作时",
      realLifeSceneTitle: "现实中呈现的场景",
      crossPalaceTitle: "与其他宫位连结时",
      currentTimingTitle: "当前运限所呈现的部分",
      practicalUseTitle: "具体应用方法",
      mainStarLabel: "核心主星",
      auxLabel: "辅助要素",
      sihuaLabel: "四化",
      connectedPalaceLabel: "连结宫位",
      meaningLabel: "含义",
      corePatternLabel: "核心结构",
      baseTraitLabel: "基本性向",
    },

    selfCheckLabel: "自我检视问题",
    flowSectionLabelPrefix: "咨询流程 · ",
    stepLabel: "STEP",

    currentTimingHeading: "当前时期分析",
    opportunityHeading: "适合把握的机会流转",
    timingCautionHeading: "需要留意的行动",
    timingEvidenceToggleLabel: "查看时机依据",

    closingHeading: "咨询总结",
    closingBodyTemplate: (trackTitle) => `${trackTitle}的流转并不会将你固定为单一性格。把命盘中强势开启的宫位当作选择的力量善加利用，把需要调整的宫位当作生活准则来照顾，运势会走得更顺畅。`,

    borrowedStarFallback: "此次命盘中，借星补正并未成为突出的核心议题。不过在重要抉择时，先确认环境、关系与时机的对齐，可以减少运势的浪费。",
    overallSummaryLoadingLine1: "正在加载命盘数据。",
    overallSummaryLoadingLine2: "稍后将显示整体流转摘要。",
  },
  "zh-TW": {
    trackTitles: {
      life: "綜合·人生流轉",
      career: "事業·前程",
      wealth: "財運·事業",
      love: "戀愛·配偶",
      relationships: "人際關係",
      family: "家庭·子女",
      health: "健康·生活節奏",
      timing: "大限·流年·時機",
    },
    trackPurpose: {
      life: "以命宮、身宮為中心，綜合解讀人生方向、選擇習慣與反覆出現的模式。",
      career: "以官祿宮為中心，區分工作方式、能出成果的角色，以及容易耗竭的環境。",
      wealth: "以財帛宮為中心，解讀賺錢方式、管理習慣、風險偏好與漏財模式。",
      love: "以夫妻宮為中心，解讀吸引你的關係類型、感情表達、衝突與恢復方式。",
      relationships: "以交友宮與兄弟宮為中心，解讀信任的形成、協作、競爭與界線設定。",
      family: "透過父母宮、兄弟宮、子女宮解讀家庭中的角色、情感距離與責任模式。",
      health: "以疾厄宮、福德宮為中心，解讀壓力反應、耗竭訊號與恢復routine。",
      timing: "對照本命盤與提供的運限資料，區分現在應重點關注與應保守應對的事項。",
    },
    chapterTitles: {
      conclusion: "現在最重要的諮詢結論",
      whyChart: "命盤揭示的原因",
      realLife: "現實中呈現的樣子",
      repeatedPattern: "反覆出現的模式與原因",
      currentTiming: "當前時期的流轉",
      actionAdvice: "給你的行動建議",
      closing: "諮詢總結",
    },
    palaceLinkTitles: ["命宮 ↔ 官祿宮", "命宮 ↔ 夫妻宮", "財帛宮 ↔ 官祿宮", "夫妻宮 ↔ 福德宮", "田宅宮 ↔ 財帛宮", "奴僕宮 ↔ 官祿宮"],
    sihuaLabels: { hualu: "化祿", huaquan: "化權", huake: "化科", huaji: "化忌" },
    genderLabels: { female: "女性", male: "男性" },
    calendarLabels: { solar: "陽曆", lunar: "陰曆" },
    namePlaceholder: "例：李小龍",
    birthPlacePlaceholder: "例：韓國首爾",
    strengthKeywordLabel: "核心優勢",
    cautionKeywordLabel: "注意訊號",
    routineKeywordLabel: "7日routine",
    actionPlanTitles: { start: "現在可以嘗試的行動", reduce: "需要減少或調節的行動", maintain: "需要維持的準則" },
    strengthDescriptions: {
      miao: "星曜之力最燦爛發揮的狀態",
      deuk: "星曜本性穩定發揮的流轉",
      li: "力量隨情況而變化的星曜狀態",
      ping: "平淡但會隨方向而變化的流轉",
      ham: "星曜能量容易被壓制或扭曲的狀態",
    },

    introTitle: "深化紫微斗數12宮諮詢",
    introDesc: "有別於基礎命盤查看，將主星、四化、三方四正、大限整合為一次判斷，解讀關係、金錢與工作中真實的選擇流轉。",
    introStartButton: "打開深化命盤",
    introBasicButton: "查看免費基礎命盤",

    formTitle: "正在準備你的深化紫微斗數諮詢命盤",
    formDesc: "免費的基礎紫微斗數用於查看12宮命盤。此畫面將同一命盤擴展為涵蓋四化、三方四正、大限與行動建議的深化諮詢。",
    goBasicButton: "前往基礎命盤",
    fullscreenExitLabel: "退出全螢幕",
    fullscreenEnterLabel: "開啟全螢幕",
    fieldNameLabel: "姓名",
    fieldGenderLabel: "性別",
    fieldBirthYearLabel: "出生年份",
    fieldBirthMonthLabel: "出生月份",
    fieldBirthDayLabel: "出生日期",
    fieldBirthHourLabel: "出生時辰",
    fieldCalendarLabel: "陽曆/陰曆",
    fieldBirthPlaceLabel: "出生地",
    fieldTimezoneLabel: "時區",
    unknownHourCheckboxLabel: "出生時間未知（以正午為基準的參考解讀）",
    leapMonthCheckboxLabel: "閏月",
    formDisclaimer: "紫微斗數會根據出生時刻改變命宮、身宮及部分宮位。若時刻不確定，將顯示以正午為基準的參考命盤。",
    computeButton: "打開深化紫微斗數諮詢",
    defaultBirthPlaceValue: "韓國首爾",

    alertMissingBirthHour: "請選擇準確的出生時辰，或勾選「出生時間未知」以正午為基準的參考命盤繼續。",
    alertCheckInput: "請確認輸入內容。",
    alertChartError: "開啟命盤的過程中流程暫時出現偏差，請重試。",
    alertComputeError: "打開諮詢畫面時發生問題。",
    loadingInitialText: "正在開啟命運之門...",
    progressTexts: [
      "正在梳理命運的脈絡...",
      "正在校準命宮與身宮的軸線...",
      "正在緩緩編織12宮的流轉...",
      "正在打磨諮詢所需的文字...",
      "正在準備開啟第一個場景...",
    ],

    computingEyebrow: "命運之門開啟的瞬間",
    computingTrackLabelPrefix: "諮詢方向：",

    resultTitleTemplate: (name) => `${name}的深化紫微斗數諮詢報告`,
    resultTitleDefaultName: "您",
    resultDesc: "綜合對照命宮、身宮的軸線，主星的廟旺平陷，四化與三方四正，以及大限、流年的流轉，為你梳理人生的優先事項，如同一場諮詢。",
    statYearFlowLabel: "今年流轉",
    masterAdviceLabel: "大師建議",
    starStrengthSectionLabel: "星曜強度",
    sihuaTextureLabel: "四化之結",

    selectedTrackPrefix: "已選諮詢方向 · ",
    primaryPalaceLabel: "優先解讀宮位",
    evidenceToggleLabel: "查看命盤依據",
    precisionNoteLabel: "精度說明",
    counselingTrackSectionLabel: "諮詢方向",
    corePalaceLabelPrefix: "核心宮位：",

    gridSectionEyebrow: "12宮命盤",
    gridSectionTitle: "宮位排布",
    selectedPalaceLabelPrefix: "已選宮位：",
    centerPanelSubtitle: "紫微星圖命盤",
    centerPanelDesc: "星光越強的宮位，在命盤中運作的命運軸線就越清晰。",

    rereadButtonLabel: "重新解讀目前宮位",
    palaceReadingSuffixLabel: "星曜判讀",
    emotionalTextureLabel: "情緒之結",
    starPowerBalanceHint: "強星塑造方向，弱星提示疲憊。兩者都不忽視，現實建議才會真正生效。",
    mainStarsCardLabel: "主要星曜",

    overallSummaryHeading: "1. 全盤綜合摘要",
    strongTop3Heading: "2. 最強宮位 TOP 3",
    weakTop3Heading: "3. 需要留意的宮位 TOP 3",
    detailHeading: "4. 各宮詳細諮詢解讀",
    palaceLinkHeading: "5. 宮位間連結解讀",
    sihuaHeading: "6. 四化解讀",
    borrowedStarHeading: "7. 借星補正解讀",
    actionGuideHeadingPrefix: "8. ",
    summaryTableHeading: "12宮摘要表",

    tableColPalace: "宮位",
    tableColDefinition: "定義",
    tableColMainStar: "主星",
    tableColAuxStar: "輔星",
    tableColForce: "宮勢",
    tableColPriority: "諮詢優先級",

    keywordLabelPrefix: "核心關鍵字：",

    detailCard: {
      evidenceSummaryTitle: "命盤依據摘要",
      customerReadingTitle: "為你解讀",
      workingWellTitle: "運作良好時",
      overworkingTitle: "過度運作時",
      realLifeSceneTitle: "現實中呈現的場景",
      crossPalaceTitle: "與其他宮位連結時",
      currentTimingTitle: "當前運限所呈現的部分",
      practicalUseTitle: "具體應用方法",
      mainStarLabel: "核心主星",
      auxLabel: "輔助要素",
      sihuaLabel: "四化",
      connectedPalaceLabel: "連結宮位",
      meaningLabel: "含義",
      corePatternLabel: "核心結構",
      baseTraitLabel: "基本性向",
    },

    selfCheckLabel: "自我檢視問題",
    flowSectionLabelPrefix: "諮詢流程 · ",
    stepLabel: "STEP",

    currentTimingHeading: "當前時期分析",
    opportunityHeading: "適合把握的機會流轉",
    timingCautionHeading: "需要留意的行動",
    timingEvidenceToggleLabel: "查看時機依據",

    closingHeading: "諮詢總結",
    closingBodyTemplate: (trackTitle) => `${trackTitle}的流轉並不會將你固定為單一性格。把命盤中強勢開啟的宮位當作選擇的力量善加利用，把需要調整的宮位當作生活準則來照顧，運勢會走得更順暢。`,

    borrowedStarFallback: "此次命盤中，借星補正並未成為突出的核心議題。不過在重要抉擇時，先確認環境、關係與時機的對齊，可以減少運勢的浪費。",
    overallSummaryLoadingLine1: "正在載入命盤資料。",
    overallSummaryLoadingLine2: "稍後將顯示整體流轉摘要。",
  },
  en: ADVANCED_ZIWEI_COPY_EN,
};

export function getAdvancedZiweiCopy(locale: LoadingLocale): AdvancedZiweiCopy {
  return { ...ADVANCED_ZIWEI_COPY_EN, ...(ADVANCED_ZIWEI_COPY[locale] || {}) };
}
