// MindScanTarot(/tarot/mindscan, 말과 행동 사이 타로) UI 크롬 전용 카피.
// 신규 필드는 en/ja/zh-CN/zh-TW만 채운다 — 나머지 로케일은 getMindScanTarotCopy()가 EN과 병합해 자동 폴백한다.
//
// 제외 대상(로케일 무관, 손대지 않음):
// - AI 리딩 결과(reading.*)의 실제 값과 그 값이 비었을 때의 한국어 기본 대체 문구 — 서버 생성 콘텐츠(PR #881로
//   locale directive가 이미 스레딩됨, worker/lib/ai-locale-context.js)와 같은 등록부라 라벨만 번역하고 값은 그대로 둔다.
// - buildMindscanAiPromptText()/buildText()가 만드는 AI 프롬프트·공유 텍스트 본문 — 룬/prompt-hub 클러스터의
//   AI 프롬프트 템플릿 제외 전례와 동일(로케일 무관 한국어 지시문 고정).
// - LOVE_SIGNAL_CLASS/RISK_LEVEL_CLASS의 키("긍정"/"낮음" 등) — AI 응답이 반환하는 고정 한국어 enum 토큰이라
//   변경하면 스타일 매핑이 깨진다.
// - `.toLocaleString("ko-KR")` 금액 포맷 — 별도 기존 버그 클래스(handoff 문서 7번 항목), 이 PR 범위 밖.

import type { LoadingLocale } from "@/constants/loadingMessages";

export interface MindScanTarotCopy {
  positionLabels: { top: string; left: string; center: string; right: string; bottom: string };
  positionMeanings: { top: string; left: string; center: string; right: string; bottom: string };
  introImageAlt: string;
  questionPlaceholder: string;
  shareTitle: string;
  saveImageButton: string;
  shareButton: string;
  copyReadingButton: string;
  kakaoShareButton: string;
  kakaoButtonLabel: string;
  goHomeButton: string;
  aiPromptAriaLabel: string;
  subscriptionIncludedMessage: string;
  genericErrorFallback: string;

  introBadgeMindScan: string;
  introTitleLine1: string;
  introTitleLine2: string;
  introDesc: string;
  flowSteps: [string, string, string, string, string, string, string];
  introCtaButton: string;
  introFooterHint: string;

  pickingHighlightMain: string;
  pickingHighlightSub: string;
  pickingTitleSuffix: string;
  pickingDoneMain: string;
  pickingDoneAll: string;
  pickingSelectingTemplate: (icon: string, label: string, meaning: string) => string;
  pickingSelectPrompt: string;
  roundTabMain: string;
  roundTabSub: string;

  spreadAllRevealedPrefix: string;
  spreadAllRevealedHighlight: string;
  spreadRevealingSuffix: string;
  consultationQuestionLabel: string;
  questionRequiredHint: string;
  allCardsReadyHint: string;
  generateButtonLoading: string;
  generateButtonIdle: string;
  questionRequiredError: string;

  resultEyebrowSuffix: string;
  resultHeroTitlePrefix: string;
  resultHeroTitleHighlight: string;
  introSectionTitle: string;
  summaryCardTitle: string;
  emotionalTempLabel: string;
  emotionalTempAriaTemplate: (level: number) => string;
  reApproachLabel: string;
  contactChanceLabel: string;
  relationFlowLabel: string;
  hiddenCoreLabel: string;
  recommendedActionLabel: string;
  relationshipStageLabel: string;
  silenceDriverLabel: string;
  situationPressureLabel: string;
  insightDeckTitle: string;
  insightDeckHint: string;
  insightHiddenPieceTemplate: (n: number) => string;
  insightOpenLabel: string;
  insightOpenedSuffix: string;
  riskLabelPrefix: string;
  headlineLabel: string;
  sectionFrontCardLabel: string;
  sectionBackCardLabel: string;
  sectionCardFaceLabel: string;
  sectionCardMeaningLabel: string;
  sectionPositionWhisperLabel: string;
  sectionEmotionalReadingLabel: string;
  sectionHiddenMessageLabel: string;
  sectionCautionLabel: string;
  sectionAdviceLabel: string;
  orientationReversed: string;
  orientationUpright: string;
  suggestedMessagesTitle: string;
  suggestedMessageFallbackTemplate: (n: number) => string;
  masterAdviceTitle: string;
  overallConsultTitle: string;
  overallHiddenCoreLabel: string;
  overallRiskLabel: string;
  overallAttitudeLabel: string;
  overallFinalFlowLabel: string;
  overallOracleLabel: string;
  footerRuleEngine: string;
  footerDefault: string;
  saveShareLabel: string;
  aiPromptHeading: string;
  aiPromptDesc: string;
  copyAiPromptButton: string;
  restartButton: string;

  shareCompleteToast: string;
  readingCopiedToast: string;
  shareFailedToast: string;
  kakaoOpenedToast: string;
  kakaoLinkOpenedToast: string;
  kakaoFallbackCopiedToast: string;
  kakaoFailedToast: string;
  clipboardCopiedToast: string;
  copyFailedToast: string;
  aiPromptCopiedToast: string;
  aiPromptCopyFailedToast: string;
  imageSavedToast: string;
  imageSaveFailedToast: string;
  kakaoShareDescFallback: string;

  paymentReasonFull: string;
  paymentReasonShort: string;
  moonlightStoneToastTemplate: (creditsText: string, remainingSuffix: string) => string;
  moonlightRemainingSuffixTemplate: (text: string) => string;
  coinChargedToastTemplate: (amount: string, balance: string) => string;
  loginRequiredError: string;
  insufficientCoinsErrorTemplate: (amount: string) => string;
  refundedToast: string;
  paymentNotConfirmedError: string;
  requestFailedTemplate: (status: number) => string;
}

const MIND_SCAN_TAROT_COPY_EN: MindScanTarotCopy = {
  positionLabels: { top: "Outward Words", left: "Lingering Feeling", center: "The Standstill", right: "Unspoken Wish", bottom: "Reality" },
  positionMeanings: { top: "The attitude shown on the surface", left: "The texture of feeling left behind", center: "Why things came to a stop", right: "The wish left unspoken", bottom: "A realistic read of the relationship" },
  introImageAlt: "Between Words Tarot",
  questionPlaceholder: "e.g. Their words and actions don't match lately — how close, and how fast, should I approach right now?",
  shareTitle: "Between Words Tarot Reading",
  saveImageButton: "📷 Save image",
  shareButton: "🔗 Share",
  copyReadingButton: "📋 Copy reading",
  kakaoShareButton: "💛 Share on KakaoTalk",
  kakaoButtonLabel: "Open reading",
  goHomeButton: "🏠 Go home",
  aiPromptAriaLabel: "Between Words Tarot AI question prompt",
  subscriptionIncludedMessage: "Your pass benefit applied — opened with no extra payment.",
  genericErrorFallback: "Something went wrong. Please try again.",

  introBadgeMindScan: "Mind Scan",
  introTitleLine1: "The Temperature Between Words and Actions",
  introTitleLine2: "A Relationship-Distance Reading",
  introDesc: "Follow your intuition and choose 10 cards.\nRead the emotional distance and the pace at which you can approach, caught between words and silence.",
  flowSteps: ["5 main cards", "→", "5 sub cards", "→", "Positions revealed", "→", "Deep reading"],
  introCtaButton: "🔮 Open the door of the heart",
  introFooterHint: "✦ Quietly bring their words, actions, and silence to mind before you begin ✦",

  pickingHighlightMain: "Main cards",
  pickingHighlightSub: "Sub cards",
  pickingTitleSuffix: ": choose 5",
  pickingDoneMain: "✨ Done! Moving on to the sub cards...",
  pickingDoneAll: "✨ All cards selected!",
  pickingSelectingTemplate: (icon, label, meaning) => `Selecting: ${icon} ${label} — ${meaning}`,
  pickingSelectPrompt: "Choose a card",
  roundTabMain: "Main cards",
  roundTabSub: "Sub cards",

  spreadAllRevealedPrefix: "The threads of the heart have all",
  spreadAllRevealedHighlight: "unfolded",
  spreadRevealingSuffix: " position is opening",
  consultationQuestionLabel: "Your question",
  questionRequiredHint: "A question is required. The context of your question lets the reading combine the card symbolism with the emotional flow more specifically.",
  allCardsReadyHint: "All 10 cards are ready",
  generateButtonLoading: "Reading the distance between the cards...",
  generateButtonIdle: "✨ Open the reading of the heart",
  questionRequiredError: "Please enter your question.",

  resultEyebrowSuffix: " · A Relationship-Distance Reading",
  resultHeroTitlePrefix: "The temperature between words and actions has",
  resultHeroTitleHighlight: "opened",
  introSectionTitle: "The Threshold of the Heart",
  summaryCardTitle: "The Overall Current of Relationship Distance",
  emotionalTempLabel: "Emotional temperature",
  emotionalTempAriaTemplate: (level) => `Emotional temperature: level ${level} of 5`,
  reApproachLabel: "Chance of things reopening:",
  contactChanceLabel: "Chance of reconnecting:",
  relationFlowLabel: "Relationship flow:",
  hiddenCoreLabel: "What's hidden beneath the surface:",
  recommendedActionLabel: "What to offer today:",
  relationshipStageLabel: "The relationship's current threshold:",
  silenceDriverLabel: "The shadow behind the silence:",
  situationPressureLabel: "What's holding the flow back:",
  insightDeckTitle: "Hidden Emotion Support Cards",
  insightDeckHint: "Open one at a time to find clues to your heart",
  insightHiddenPieceTemplate: (n) => `Hidden piece ${n}`,
  insightOpenLabel: "Reveal",
  insightOpenedSuffix: "Revealed",
  riskLabelPrefix: "Shadow",
  headlineLabel: "What's revealed:",
  sectionFrontCardLabel: "Front:",
  sectionBackCardLabel: "Behind:",
  sectionCardFaceLabel: "The card's face:",
  sectionCardMeaningLabel: "What the card illuminates:",
  sectionPositionWhisperLabel: "This position's whisper:",
  sectionEmotionalReadingLabel: "The feeling left behind:",
  sectionHiddenMessageLabel: "The unspoken message:",
  sectionCautionLabel: "The shadow to watch for:",
  sectionAdviceLabel: "The attitude to offer:",
  orientationReversed: "reversed",
  orientationUpright: "upright",
  suggestedMessagesTitle: "Messages Good to Send Right Now",
  suggestedMessageFallbackTemplate: (n) => `Message ${n}`,
  masterAdviceTitle: "A Practical Action Guide",
  overallConsultTitle: "Overall Consultation",
  overallHiddenCoreLabel: "The feeling left beneath the words:",
  overallRiskLabel: "Warning signs in the relationship:",
  overallAttitudeLabel: "The attitude to take today:",
  overallFinalFlowLabel: "The final flow:",
  overallOracleLabel: "Oracle message:",
  footerRuleEngine: "✦ A card-meaning based reading",
  footerDefault: "✦ A relationship-distance reading",
  saveShareLabel: "Save & Share Your Reading",
  aiPromptHeading: "Shine a Little More Light on the Temperature Between Words and Actions",
  aiPromptDesc: "Hand over the threads of the five positions just as they opened, and you can explore the signals left between their words and actions even further.",
  copyAiPromptButton: "Copy prompt",
  restartButton: "🔄 Open the cards again",

  shareCompleteToast: "Shared!",
  readingCopiedToast: "The reading has been copied.",
  shareFailedToast: "Share failed",
  kakaoOpenedToast: "Opened the KakaoTalk share window!",
  kakaoLinkOpenedToast: "Opened the KakaoTalk share link!",
  kakaoFallbackCopiedToast: "Couldn't open KakaoTalk, so the link was copied instead!",
  kakaoFailedToast: "Couldn't open KakaoTalk share.",
  clipboardCopiedToast: "Copied to clipboard!",
  copyFailedToast: "Copy failed",
  aiPromptCopiedToast: "The prompt has been copied.",
  aiPromptCopyFailedToast: "Please select and copy it manually.",
  imageSavedToast: "Image saved!",
  imageSaveFailedToast: "Failed to save the image",
  kakaoShareDescFallback: "A relationship-distance tarot reading that gently reads the temperature between words and actions",

  paymentReasonFull: "Between Words Tarot Reading",
  paymentReasonShort: "Between Words Tarot",
  moonlightStoneToastTemplate: (creditsText, remainingSuffix) => `Opened Between Words Tarot using ${creditsText} in moonstone value.${remainingSuffix}`,
  moonlightRemainingSuffixTemplate: (text) => ` Remaining moonstone: worth ${text}`,
  coinChargedToastTemplate: (amount, balance) => `Your ${amount} payment for Between Words Tarot was approved. Remaining balance: ${balance}`,
  loginRequiredError: "Login required. Please log in and try again.",
  insufficientCoinsErrorTemplate: (amount) => `Insufficient balance for payment. ${amount} is required.`,
  refundedToast: "The reading couldn't be completed, so this payment was refunded.",
  paymentNotConfirmedError: "Payment confirmation was not completed.",
  requestFailedTemplate: (status) => `Request failed (${status})`,
};

const MIND_SCAN_TAROT_COPY: Partial<Record<LoadingLocale, MindScanTarotCopy>> = {
  ko: {
    positionLabels: { top: "겉말", left: "마음결", center: "멈춤", right: "바람", bottom: "현실" },
    positionMeanings: { top: "겉으로 보이는 태도", left: "남은 감정의 결", center: "멈춰 선 이유", right: "말하지 못한 바람", bottom: "관계의 현실 판단" },
    introImageAlt: "말과 행동 사이 타로",
    questionPlaceholder: "예: 요즘 말과 행동이 달라졌는데, 지금은 어떤 거리와 속도로 다가가야 할까요?",
    shareTitle: "말과 행동 사이 타로 리딩",
    saveImageButton: "📷 이미지 저장",
    shareButton: "🔗 공유",
    copyReadingButton: "📋 리딩 문장 복사",
    kakaoShareButton: "💛 카카오톡 공유",
    kakaoButtonLabel: "리딩 열기",
    goHomeButton: "🏠 홈으로 가기",
    aiPromptAriaLabel: "말과 행동 사이 타로 AI 질문문",
    subscriptionIncludedMessage: "이용권 혜택이 적용되어 추가 결제 없이 열렸습니다.",
    genericErrorFallback: "오류가 발생했습니다. 다시 시도해주세요.",

    introBadgeMindScan: "Mind Scan",
    introTitleLine1: "말과 행동 사이의 온도",
    introTitleLine2: "관계 간격 리딩",
    introDesc: "직관을 따라 10장의 카드를 선택하세요.\n말과 침묵 사이에 놓인 감정의 거리와 다가갈 수 있는 속도를 읽습니다.",
    flowSteps: ["메인 5장", "→", "보조 5장", "→", "자리 공개", "→", "심층 리딩"],
    introCtaButton: "🔮 마음의 문 열기",
    introFooterHint: "✦ 그 사람의 말, 행동, 침묵을 조용히 떠올리며 시작하세요 ✦",

    pickingHighlightMain: "메인 카드",
    pickingHighlightSub: "보조 카드",
    pickingTitleSuffix: " 5장 선택",
    pickingDoneMain: "✨ 완료! 보조 카드로 이동합니다...",
    pickingDoneAll: "✨ 모든 카드 선택 완료!",
    pickingSelectingTemplate: (icon, label, meaning) => `선택 중: ${icon} ${label} — ${meaning}`,
    pickingSelectPrompt: "카드를 선택하세요",
    roundTabMain: "메인 카드",
    roundTabSub: "보조 카드",

    spreadAllRevealedPrefix: "마음의 결이 모두",
    spreadAllRevealedHighlight: "펼쳐졌습니다",
    spreadRevealingSuffix: " 포지션이 열립니다",
    consultationQuestionLabel: "상담 질문",
    questionRequiredHint: "질문은 필수입니다. 질문의 맥락이 있어야 카드 상징과 감정 흐름을 구체적으로 결합할 수 있습니다.",
    allCardsReadyHint: "10장의 카드가 모두 준비되었습니다",
    generateButtonLoading: "카드의 간격을 읽는 중...",
    generateButtonIdle: "✨ 마음의 결 리딩 열기",
    questionRequiredError: "상담 질문을 입력해 주세요.",

    resultEyebrowSuffix: " · 관계 간격 리딩",
    resultHeroTitlePrefix: "말과 행동 사이의 온도가",
    resultHeroTitleHighlight: "열렸습니다",
    introSectionTitle: "마음의 문턱",
    summaryCardTitle: "관계 간격의 전체 기류",
    emotionalTempLabel: "감정 온도",
    emotionalTempAriaTemplate: (level) => `감정 온도 5단계 중 ${level}단계`,
    reApproachLabel: "다시 열릴 여지:",
    contactChanceLabel: "다시 닿을 여지:",
    relationFlowLabel: "관계 흐름:",
    hiddenCoreLabel: "겉으로 숨긴 중심:",
    recommendedActionLabel: "오늘 건넬 태도:",
    relationshipStageLabel: "관계의 현재 문턱:",
    silenceDriverLabel: "침묵의 그림자:",
    situationPressureLabel: "흐름을 누르는 힘:",
    insightDeckTitle: "숨은 감정 보조 카드",
    insightDeckHint: "한 장씩 열어 마음의 단서를 확인하세요",
    insightHiddenPieceTemplate: (n) => `숨은 조각 ${n}`,
    insightOpenLabel: "열어보기",
    insightOpenedSuffix: "열림",
    riskLabelPrefix: "그림자",
    headlineLabel: "드러난 결:",
    sectionFrontCardLabel: "앞장:",
    sectionBackCardLabel: "이면:",
    sectionCardFaceLabel: "카드의 얼굴:",
    sectionCardMeaningLabel: "카드가 비춘 장면:",
    sectionPositionWhisperLabel: "이 자리의 속삭임:",
    sectionEmotionalReadingLabel: "남은 감정의 결:",
    sectionHiddenMessageLabel: "말하지 못한 메시지:",
    sectionCautionLabel: "조심할 그림자:",
    sectionAdviceLabel: "내가 건넬 태도:",
    orientationReversed: "역방향",
    orientationUpright: "정방향",
    suggestedMessagesTitle: "지금 보내기 좋은 메시지 예시",
    suggestedMessageFallbackTemplate: (n) => `메시지 ${n}`,
    masterAdviceTitle: "현실적인 행동 가이드",
    overallConsultTitle: "전체 종합 상담",
    overallHiddenCoreLabel: "겉말 아래 남은 감정:",
    overallRiskLabel: "관계의 위험 신호:",
    overallAttitudeLabel: "오늘 내가 취할 태도:",
    overallFinalFlowLabel: "최종 흐름:",
    overallOracleLabel: "오라클 메시지:",
    footerRuleEngine: "✦ 카드 의미 기반 리딩",
    footerDefault: "✦ 관계 간격 리딩",
    saveShareLabel: "리딩 저장과 공유",
    aiPromptHeading: "말과 행동 사이의 온도를 한 번 더 비추기",
    aiPromptDesc: "방금 열린 다섯 자리의 결을 그대로 건네면, 상대의 말과 행동 사이에 남은 신호를 더 깊게 이어 볼 수 있습니다.",
    copyAiPromptButton: "질문문 복사",
    restartButton: "🔄 다시 카드 열기",

    shareCompleteToast: "공유 완료!",
    readingCopiedToast: "리딩 문장이 복사되었습니다.",
    shareFailedToast: "공유 실패",
    kakaoOpenedToast: "카카오톡 공유 창을 열었어요!",
    kakaoLinkOpenedToast: "카카오 공유 링크를 열었어요!",
    kakaoFallbackCopiedToast: "카카오 공유 대체로 링크를 복사했어요!",
    kakaoFailedToast: "카카오 공유를 열지 못했습니다.",
    clipboardCopiedToast: "클립보드에 복사됨!",
    copyFailedToast: "복사 실패",
    aiPromptCopiedToast: "질문문이 복사되었습니다.",
    aiPromptCopyFailedToast: "직접 선택해 복사해 주세요.",
    imageSavedToast: "이미지 저장 완료!",
    imageSaveFailedToast: "이미지 저장 실패",
    kakaoShareDescFallback: "말과 행동 사이의 온도를 섬세하게 읽는 관계 간격 타로",

    paymentReasonFull: "말과 행동 사이 타로 리딩",
    paymentReasonShort: "말과 행동 사이 타로",
    moonlightStoneToastTemplate: (creditsText, remainingSuffix) => `월정석 ${creditsText} 상당으로 말과 행동 사이 타로가 열렸습니다.${remainingSuffix}`,
    moonlightRemainingSuffixTemplate: (text) => ` 남은 월정석: ${text} 상당`,
    coinChargedToastTemplate: (amount, balance) => `말과 행동 사이 타로 ${amount}원 결제가 승인되었습니다. 잔여 원화 가치: ${balance}원`,
    loginRequiredError: "로그인이 필요합니다. 로그인 후 다시 시도해 주세요.",
    insufficientCoinsErrorTemplate: (amount) => `결제 가능 금액이 부족합니다. ${amount}원 결제가 필요합니다.`,
    refundedToast: "리딩 생성이 완료되지 않아 이번 결제가 환불되었습니다.",
    paymentNotConfirmedError: "결제 확인이 완료되지 않았습니다.",
    requestFailedTemplate: (status) => `요청 실패 (${status})`,
  },
  ja: {
    positionLabels: { top: "表向きの言葉", left: "残る心の結び", center: "止まった理由", right: "言えなかった願い", bottom: "現実" },
    positionMeanings: { top: "表面に見える態度", left: "残っている感情の結び", center: "立ち止まった理由", right: "言葉にできなかった願い", bottom: "関係の現実的な判断" },
    introImageAlt: "言葉と行動の間のタロット",
    questionPlaceholder: "例：最近言葉と行動が違ってきましたが、今はどんな距離とスピードで近づけばいいでしょうか？",
    shareTitle: "言葉と行動の間タロットリーディング",
    saveImageButton: "📷 画像を保存",
    shareButton: "🔗 共有",
    copyReadingButton: "📋 リーディングをコピー",
    kakaoShareButton: "💛 カカオトークで共有",
    kakaoButtonLabel: "リーディングを開く",
    goHomeButton: "🏠 ホームへ",
    aiPromptAriaLabel: "言葉と行動の間タロットAI質問文",
    subscriptionIncludedMessage: "パス特典が適用され、追加決済なしで開かれました。",
    genericErrorFallback: "エラーが発生しました。もう一度お試しください。",

    introBadgeMindScan: "Mind Scan",
    introTitleLine1: "言葉と行動の間の温度",
    introTitleLine2: "関係の距離リーディング",
    introDesc: "直感に従って10枚のカードを選んでください。\n言葉と沈黙の間にある感情の距離と、近づけるスピードを読み解きます。",
    flowSteps: ["メイン5枚", "→", "サブ5枚", "→", "位置を公開", "→", "深層リーディング"],
    introCtaButton: "🔮 心の扉を開く",
    introFooterHint: "✦ その人の言葉、行動、沈黙を静かに思い浮かべながら始めましょう ✦",

    pickingHighlightMain: "メインカード",
    pickingHighlightSub: "サブカード",
    pickingTitleSuffix: " 5枚選択",
    pickingDoneMain: "✨ 完了！サブカードに移動します...",
    pickingDoneAll: "✨ 全てのカード選択が完了しました！",
    pickingSelectingTemplate: (icon, label, meaning) => `選択中：${icon} ${label} — ${meaning}`,
    pickingSelectPrompt: "カードを選んでください",
    roundTabMain: "メインカード",
    roundTabSub: "サブカード",

    spreadAllRevealedPrefix: "心の結びがすべて",
    spreadAllRevealedHighlight: "広がりました",
    spreadRevealingSuffix: " のポジションが開かれます",
    consultationQuestionLabel: "相談したい質問",
    questionRequiredHint: "質問は必須です。質問の文脈があってこそ、カードの象徴と感情の流れを具体的に結びつけられます。",
    allCardsReadyHint: "10枚のカードがすべて準備できました",
    generateButtonLoading: "カードの間隔を読んでいます...",
    generateButtonIdle: "✨ 心の結びのリーディングを開く",
    questionRequiredError: "相談したい質問を入力してください。",

    resultEyebrowSuffix: "・関係の距離リーディング",
    resultHeroTitlePrefix: "言葉と行動の間の温度が",
    resultHeroTitleHighlight: "開かれました",
    introSectionTitle: "心の敷居",
    summaryCardTitle: "関係の距離の全体的な流れ",
    emotionalTempLabel: "感情の温度",
    emotionalTempAriaTemplate: (level) => `感情の温度 5段階中 ${level}段階`,
    reApproachLabel: "再び開かれる余地：",
    contactChanceLabel: "再びつながる余地：",
    relationFlowLabel: "関係の流れ：",
    hiddenCoreLabel: "表に隠された核心：",
    recommendedActionLabel: "今日差し出す態度：",
    relationshipStageLabel: "関係の現在の敷居：",
    silenceDriverLabel: "沈黙の影：",
    situationPressureLabel: "流れを押さえつける力：",
    insightDeckTitle: "隠れた感情の補助カード",
    insightDeckHint: "一枚ずつ開いて心の手がかりを確認しましょう",
    insightHiddenPieceTemplate: (n) => `隠れた欠片 ${n}`,
    insightOpenLabel: "開いてみる",
    insightOpenedSuffix: "開示済み",
    riskLabelPrefix: "影",
    headlineLabel: "現れた結び：",
    sectionFrontCardLabel: "表：",
    sectionBackCardLabel: "裏：",
    sectionCardFaceLabel: "カードの顔：",
    sectionCardMeaningLabel: "カードが照らす場面：",
    sectionPositionWhisperLabel: "この位置のささやき：",
    sectionEmotionalReadingLabel: "残る感情の結び：",
    sectionHiddenMessageLabel: "言えなかったメッセージ：",
    sectionCautionLabel: "注意すべき影：",
    sectionAdviceLabel: "差し出すべき態度：",
    orientationReversed: "逆位置",
    orientationUpright: "正位置",
    suggestedMessagesTitle: "今送るのに良いメッセージ例",
    suggestedMessageFallbackTemplate: (n) => `メッセージ ${n}`,
    masterAdviceTitle: "現実的な行動ガイド",
    overallConsultTitle: "総合相談",
    overallHiddenCoreLabel: "言葉の裏に残る感情：",
    overallRiskLabel: "関係の危険信号：",
    overallAttitudeLabel: "今日取るべき態度：",
    overallFinalFlowLabel: "最終的な流れ：",
    overallOracleLabel: "オラクルメッセージ：",
    footerRuleEngine: "✦ カード意味ベースのリーディング",
    footerDefault: "✦ 関係の距離リーディング",
    saveShareLabel: "リーディングの保存と共有",
    aiPromptHeading: "言葉と行動の間の温度をもう一度照らす",
    aiPromptDesc: "たった今開かれた5つの位置の結びをそのまま渡せば、相手の言葉と行動の間に残る信号をさらに深く読み解けます。",
    copyAiPromptButton: "質問文をコピー",
    restartButton: "🔄 もう一度カードを開く",

    shareCompleteToast: "共有完了！",
    readingCopiedToast: "リーディング文がコピーされました。",
    shareFailedToast: "共有失敗",
    kakaoOpenedToast: "カカオトークの共有ウィンドウを開きました！",
    kakaoLinkOpenedToast: "カカオ共有リンクを開きました！",
    kakaoFallbackCopiedToast: "カカオ共有の代わりにリンクをコピーしました！",
    kakaoFailedToast: "カカオ共有を開けませんでした。",
    clipboardCopiedToast: "クリップボードにコピーされました！",
    copyFailedToast: "コピー失敗",
    aiPromptCopiedToast: "質問文がコピーされました。",
    aiPromptCopyFailedToast: "直接選択してコピーしてください。",
    imageSavedToast: "画像の保存が完了しました！",
    imageSaveFailedToast: "画像の保存に失敗しました",
    kakaoShareDescFallback: "言葉と行動の間の温度を繊細に読み解く関係の距離タロット",

    paymentReasonFull: "言葉と行動の間タロットリーディング",
    paymentReasonShort: "言葉と行動の間タロット",
    moonlightStoneToastTemplate: (creditsText, remainingSuffix) => `月精石 ${creditsText}相当で言葉と行動の間タロットが開かれました。${remainingSuffix}`,
    moonlightRemainingSuffixTemplate: (text) => ` 残りの月精石：${text}相当`,
    coinChargedToastTemplate: (amount, balance) => `言葉と行動の間タロット ${amount}の決済が承認されました。残高：${balance}`,
    loginRequiredError: "ログインが必要です。ログイン後にもう一度お試しください。",
    insufficientCoinsErrorTemplate: (amount) => `決済可能な金額が不足しています。${amount}の決済が必要です。`,
    refundedToast: "リーディングが完了しなかったため、この決済は返金されました。",
    paymentNotConfirmedError: "決済確認が完了していません。",
    requestFailedTemplate: (status) => `リクエスト失敗 (${status})`,
  },
  "zh-CN": {
    positionLabels: { top: "表面言语", left: "残留心绪", center: "停滞", right: "未说心愿", bottom: "现实" },
    positionMeanings: { top: "表面呈现的态度", left: "残留的情感余韵", center: "停下来的原因", right: "未能说出口的心愿", bottom: "对关系现实的判断" },
    introImageAlt: "言语与行动之间塔罗",
    questionPlaceholder: "例：最近言语和行动不一致了，现在该以怎样的距离和速度靠近呢？",
    shareTitle: "言语与行动之间塔罗解读",
    saveImageButton: "📷 保存图片",
    shareButton: "🔗 分享",
    copyReadingButton: "📋 复制解读文本",
    kakaoShareButton: "💛 分享到 KakaoTalk",
    kakaoButtonLabel: "打开解读",
    goHomeButton: "🏠 回到首页",
    aiPromptAriaLabel: "言语与行动之间塔罗 AI 提问文",
    subscriptionIncludedMessage: "已应用通行证权益，无需额外付款即可开启。",
    genericErrorFallback: "发生错误，请重试。",

    introBadgeMindScan: "Mind Scan",
    introTitleLine1: "言语与行动之间的温度",
    introTitleLine2: "关系距离解读",
    introDesc: "跟随直觉选择10张卡牌。\n解读言语与沉默之间残留的情感距离，以及可以靠近的速度。",
    flowSteps: ["主牌5张", "→", "副牌5张", "→", "公开位置", "→", "深度解读"],
    introCtaButton: "🔮 打开心之门",
    introFooterHint: "✦ 静静想起那个人的话语、行动与沉默，然后开始 ✦",

    pickingHighlightMain: "主牌",
    pickingHighlightSub: "副牌",
    pickingTitleSuffix: " 选择5张",
    pickingDoneMain: "✨ 完成！即将进入副牌选择...",
    pickingDoneAll: "✨ 所有卡牌选择完成！",
    pickingSelectingTemplate: (icon, label, meaning) => `正在选择：${icon} ${label} — ${meaning}`,
    pickingSelectPrompt: "请选择卡牌",
    roundTabMain: "主牌",
    roundTabSub: "副牌",

    spreadAllRevealedPrefix: "心绪已全部",
    spreadAllRevealedHighlight: "展开",
    spreadRevealingSuffix: " 位置正在开启",
    consultationQuestionLabel: "想咨询的问题",
    questionRequiredHint: "问题为必填项。只有问题带有具体情境，才能将卡牌象征与情感流转具体地结合起来。",
    allCardsReadyHint: "全部10张卡牌已准备就绪",
    generateButtonLoading: "正在解读卡牌之间的距离...",
    generateButtonIdle: "✨ 打开心绪解读",
    questionRequiredError: "请输入想咨询的问题。",

    resultEyebrowSuffix: " · 关系距离解读",
    resultHeroTitlePrefix: "言语与行动之间的温度已",
    resultHeroTitleHighlight: "开启",
    introSectionTitle: "心之门槛",
    summaryCardTitle: "关系距离的整体气流",
    emotionalTempLabel: "情感温度",
    emotionalTempAriaTemplate: (level) => `情感温度 共5级中的第${level}级`,
    reApproachLabel: "再次敞开的余地：",
    contactChanceLabel: "再次触及的余地：",
    relationFlowLabel: "关系流转：",
    hiddenCoreLabel: "表面下隐藏的核心：",
    recommendedActionLabel: "今天可以给出的态度：",
    relationshipStageLabel: "关系目前所处的门槛：",
    silenceDriverLabel: "沉默背后的阴影：",
    situationPressureLabel: "压住流转的力量：",
    insightDeckTitle: "隐藏情感辅助卡",
    insightDeckHint: "逐张打开，确认内心的线索",
    insightHiddenPieceTemplate: (n) => `隐藏碎片 ${n}`,
    insightOpenLabel: "打开查看",
    insightOpenedSuffix: "已打开",
    riskLabelPrefix: "阴影",
    headlineLabel: "揭示的结果：",
    sectionFrontCardLabel: "正面：",
    sectionBackCardLabel: "背面：",
    sectionCardFaceLabel: "卡牌的面貌：",
    sectionCardMeaningLabel: "卡牌照亮的场景：",
    sectionPositionWhisperLabel: "这个位置的低语：",
    sectionEmotionalReadingLabel: "残留的情感余韵：",
    sectionHiddenMessageLabel: "未说出口的讯息：",
    sectionCautionLabel: "需要留意的阴影：",
    sectionAdviceLabel: "可以给出的态度：",
    orientationReversed: "逆位",
    orientationUpright: "正位",
    suggestedMessagesTitle: "现在适合发送的讯息范例",
    suggestedMessageFallbackTemplate: (n) => `讯息 ${n}`,
    masterAdviceTitle: "现实行动指南",
    overallConsultTitle: "整体综合咨询",
    overallHiddenCoreLabel: "言语之下残留的情感：",
    overallRiskLabel: "关系的危险信号：",
    overallAttitudeLabel: "今天该采取的态度：",
    overallFinalFlowLabel: "最终流转：",
    overallOracleLabel: "神谕讯息：",
    footerRuleEngine: "✦ 基于卡牌含义的解读",
    footerDefault: "✦ 关系距离解读",
    saveShareLabel: "保存与分享解读",
    aiPromptHeading: "再次照亮言语与行动之间的温度",
    aiPromptDesc: "将刚刚开启的五个位置的脉络原样交出，就能更深入地探寻对方言语与行动之间残留的信号。",
    copyAiPromptButton: "复制提问文",
    restartButton: "🔄 重新开牌",

    shareCompleteToast: "分享完成！",
    readingCopiedToast: "解读文本已复制。",
    shareFailedToast: "分享失败",
    kakaoOpenedToast: "已打开 KakaoTalk 分享窗口！",
    kakaoLinkOpenedToast: "已打开 KakaoTalk 分享链接！",
    kakaoFallbackCopiedToast: "无法打开 KakaoTalk 分享，已改为复制链接！",
    kakaoFailedToast: "无法打开 KakaoTalk 分享。",
    clipboardCopiedToast: "已复制到剪贴板！",
    copyFailedToast: "复制失败",
    aiPromptCopiedToast: "提问文已复制。",
    aiPromptCopyFailedToast: "请手动选择并复制。",
    imageSavedToast: "图片保存完成！",
    imageSaveFailedToast: "图片保存失败",
    kakaoShareDescFallback: "细腻解读言语与行动之间温度的关系距离塔罗",

    paymentReasonFull: "言语与行动之间塔罗解读",
    paymentReasonShort: "言语与行动之间塔罗",
    moonlightStoneToastTemplate: (creditsText, remainingSuffix) => `已使用价值 ${creditsText} 的月精石开启言语与行动之间塔罗。${remainingSuffix}`,
    moonlightRemainingSuffixTemplate: (text) => ` 剩余月精石：价值 ${text}`,
    coinChargedToastTemplate: (amount, balance) => `言语与行动之间塔罗 ${amount} 的付款已获批准。剩余余额：${balance}`,
    loginRequiredError: "需要登录，请登录后重试。",
    insufficientCoinsErrorTemplate: (amount) => `可用支付余额不足，需支付 ${amount}。`,
    refundedToast: "解读未能完成生成，本次付款已退还。",
    paymentNotConfirmedError: "支付确认尚未完成。",
    requestFailedTemplate: (status) => `请求失败 (${status})`,
  },
  "zh-TW": {
    positionLabels: { top: "表面言語", left: "殘留心緒", center: "停滯", right: "未說心願", bottom: "現實" },
    positionMeanings: { top: "表面呈現的態度", left: "殘留的情感餘韻", center: "停下來的原因", right: "未能說出口的心願", bottom: "對關係現實的判斷" },
    introImageAlt: "言語與行動之間塔羅",
    questionPlaceholder: "例：最近言語和行動不一致了，現在該以怎樣的距離和速度靠近呢？",
    shareTitle: "言語與行動之間塔羅解讀",
    saveImageButton: "📷 儲存圖片",
    shareButton: "🔗 分享",
    copyReadingButton: "📋 複製解讀文字",
    kakaoShareButton: "💛 分享到 KakaoTalk",
    kakaoButtonLabel: "開啟解讀",
    goHomeButton: "🏠 回到首頁",
    aiPromptAriaLabel: "言語與行動之間塔羅 AI 提問文",
    subscriptionIncludedMessage: "已套用通行證權益，無需額外付款即可開啟。",
    genericErrorFallback: "發生錯誤，請重試。",

    introBadgeMindScan: "Mind Scan",
    introTitleLine1: "言語與行動之間的溫度",
    introTitleLine2: "關係距離解讀",
    introDesc: "跟隨直覺選擇10張卡牌。\n解讀言語與沉默之間殘留的情感距離，以及可以靠近的速度。",
    flowSteps: ["主牌5張", "→", "副牌5張", "→", "公開位置", "→", "深度解讀"],
    introCtaButton: "🔮 打開心之門",
    introFooterHint: "✦ 靜靜想起那個人的話語、行動與沉默，然後開始 ✦",

    pickingHighlightMain: "主牌",
    pickingHighlightSub: "副牌",
    pickingTitleSuffix: " 選擇5張",
    pickingDoneMain: "✨ 完成！即將進入副牌選擇...",
    pickingDoneAll: "✨ 所有卡牌選擇完成！",
    pickingSelectingTemplate: (icon, label, meaning) => `正在選擇：${icon} ${label} — ${meaning}`,
    pickingSelectPrompt: "請選擇卡牌",
    roundTabMain: "主牌",
    roundTabSub: "副牌",

    spreadAllRevealedPrefix: "心緒已全部",
    spreadAllRevealedHighlight: "展開",
    spreadRevealingSuffix: " 位置正在開啟",
    consultationQuestionLabel: "想諮詢的問題",
    questionRequiredHint: "問題為必填項。只有問題帶有具體情境，才能將卡牌象徵與情感流轉具體地結合起來。",
    allCardsReadyHint: "全部10張卡牌已準備就緒",
    generateButtonLoading: "正在解讀卡牌之間的距離...",
    generateButtonIdle: "✨ 打開心緒解讀",
    questionRequiredError: "請輸入想諮詢的問題。",

    resultEyebrowSuffix: " · 關係距離解讀",
    resultHeroTitlePrefix: "言語與行動之間的溫度已",
    resultHeroTitleHighlight: "開啟",
    introSectionTitle: "心之門檻",
    summaryCardTitle: "關係距離的整體氣流",
    emotionalTempLabel: "情感溫度",
    emotionalTempAriaTemplate: (level) => `情感溫度 共5級中的第${level}級`,
    reApproachLabel: "再次敞開的餘地：",
    contactChanceLabel: "再次觸及的餘地：",
    relationFlowLabel: "關係流轉：",
    hiddenCoreLabel: "表面下隱藏的核心：",
    recommendedActionLabel: "今天可以給出的態度：",
    relationshipStageLabel: "關係目前所處的門檻：",
    silenceDriverLabel: "沉默背後的陰影：",
    situationPressureLabel: "壓住流轉的力量：",
    insightDeckTitle: "隱藏情感輔助卡",
    insightDeckHint: "逐張打開，確認內心的線索",
    insightHiddenPieceTemplate: (n) => `隱藏碎片 ${n}`,
    insightOpenLabel: "打開查看",
    insightOpenedSuffix: "已打開",
    riskLabelPrefix: "陰影",
    headlineLabel: "揭示的結果：",
    sectionFrontCardLabel: "正面：",
    sectionBackCardLabel: "背面：",
    sectionCardFaceLabel: "卡牌的面貌：",
    sectionCardMeaningLabel: "卡牌照亮的場景：",
    sectionPositionWhisperLabel: "這個位置的低語：",
    sectionEmotionalReadingLabel: "殘留的情感餘韻：",
    sectionHiddenMessageLabel: "未說出口的訊息：",
    sectionCautionLabel: "需要留意的陰影：",
    sectionAdviceLabel: "可以給出的態度：",
    orientationReversed: "逆位",
    orientationUpright: "正位",
    suggestedMessagesTitle: "現在適合傳送的訊息範例",
    suggestedMessageFallbackTemplate: (n) => `訊息 ${n}`,
    masterAdviceTitle: "現實行動指南",
    overallConsultTitle: "整體綜合諮詢",
    overallHiddenCoreLabel: "言語之下殘留的情感：",
    overallRiskLabel: "關係的危險訊號：",
    overallAttitudeLabel: "今天該採取的態度：",
    overallFinalFlowLabel: "最終流轉：",
    overallOracleLabel: "神諭訊息：",
    footerRuleEngine: "✦ 基於卡牌含義的解讀",
    footerDefault: "✦ 關係距離解讀",
    saveShareLabel: "儲存與分享解讀",
    aiPromptHeading: "再次照亮言語與行動之間的溫度",
    aiPromptDesc: "將剛剛開啟的五個位置的脈絡原樣交出，就能更深入地探尋對方言語與行動之間殘留的訊號。",
    copyAiPromptButton: "複製提問文",
    restartButton: "🔄 重新開牌",

    shareCompleteToast: "分享完成！",
    readingCopiedToast: "解讀文字已複製。",
    shareFailedToast: "分享失敗",
    kakaoOpenedToast: "已開啟 KakaoTalk 分享視窗！",
    kakaoLinkOpenedToast: "已開啟 KakaoTalk 分享連結！",
    kakaoFallbackCopiedToast: "無法開啟 KakaoTalk 分享，已改為複製連結！",
    kakaoFailedToast: "無法開啟 KakaoTalk 分享。",
    clipboardCopiedToast: "已複製到剪貼簿！",
    copyFailedToast: "複製失敗",
    aiPromptCopiedToast: "提問文已複製。",
    aiPromptCopyFailedToast: "請手動選取並複製。",
    imageSavedToast: "圖片儲存完成！",
    imageSaveFailedToast: "圖片儲存失敗",
    kakaoShareDescFallback: "細膩解讀言語與行動之間溫度的關係距離塔羅",

    paymentReasonFull: "言語與行動之間塔羅解讀",
    paymentReasonShort: "言語與行動之間塔羅",
    moonlightStoneToastTemplate: (creditsText, remainingSuffix) => `已使用價值 ${creditsText} 的月精石開啟言語與行動之間塔羅。${remainingSuffix}`,
    moonlightRemainingSuffixTemplate: (text) => ` 剩餘月精石：價值 ${text}`,
    coinChargedToastTemplate: (amount, balance) => `言語與行動之間塔羅 ${amount} 的付款已獲批准。剩餘餘額：${balance}`,
    loginRequiredError: "需要登入，請登入後重試。",
    insufficientCoinsErrorTemplate: (amount) => `可用支付餘額不足，需支付 ${amount}。`,
    refundedToast: "解讀未能完成產生，本次付款已退還。",
    paymentNotConfirmedError: "付款確認尚未完成。",
    requestFailedTemplate: (status) => `請求失敗 (${status})`,
  },
  en: MIND_SCAN_TAROT_COPY_EN,
};

export function getMindScanTarotCopy(locale: LoadingLocale): MindScanTarotCopy {
  return { ...MIND_SCAN_TAROT_COPY_EN, ...(MIND_SCAN_TAROT_COPY[locale] || {}) };
}
