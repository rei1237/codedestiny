const DESTINY_BIAS_COPY_TRANSLATIONS = {
  ko: {
    loadingMessages: [
      "운명의 무대 조명을 켜는 중...",
      "당신의 사주 에너지와 최애 케미를 맞춰보는 중...",
      "별빛 응원봉이 반응하고 있어요...",
      "메인 스테이지 카드가 열리고 있어요...",
    ],
    intro: {
      title: "최애운명",
      subtitle: "My Destiny Bias",
      lead: "내 생일 에너지가 최애의 무대와 만나는 순간",
      description:
        "두 사람의 생년월일로 케미를 읽고, 업로드 이미지까지 합성한 글래스 포토카드를 만들어드려요. 덕질 모드에 딱 맞는 결과를 한 번에!",
      ctaPrimary: "운명 연결 시작하기",
      ctaSecondary: "Cosmic Stage 입장",
      coinBadge: "무료 · 글래스 포토카드 포함",
    },
  },
  en: {
    loadingMessages: [
      "Turning on the lights of the destiny stage...",
      "Matching your Saju energy with your bias chemistry...",
      "The starlight fanlight is responding...",
      "Opening your main-stage card...",
    ],
    intro: {
      title: "My Destiny Bias",
      subtitle: "My Destiny Bias",
      lead: "When your birthday energy meets your bias on stage",
      description:
        "Read the chemistry between two birth dates and create a glass photocard with your uploaded image. A fandom-ready result in one flow.",
      ctaPrimary: "Start destiny connection",
      ctaSecondary: "Enter Cosmic Stage",
      coinBadge: "Free · includes glass photocard",
    },
  },
  ja: {
    loadingMessages: [
      "運命のステージライトを灯しています...",
      "あなたの四柱推命エネルギーと推しとのケミを合わせています...",
      "星明かりのペンライトが反応しています...",
      "メインステージカードが開いています...",
    ],
    intro: {
      title: "推し運命",
      subtitle: "My Destiny Bias",
      lead: "あなたの誕生日エネルギーが推しのステージと出会う瞬間",
      description:
        "二人の生年月日からケミを読み、アップロード画像まで合成したグラスフォトカードを作ります。推し活モードにぴったりの結果を一度に。",
      ctaPrimary: "運命の接続を始める",
      ctaSecondary: "Cosmic Stageへ入る",
      coinBadge: "無料 · グラスフォトカード付き",
    },
  },
} as const;

export const destinyBiasLoadingMessages = DESTINY_BIAS_COPY_TRANSLATIONS.ko.loadingMessages;

export const destinyBiasIntroCopy = DESTINY_BIAS_COPY_TRANSLATIONS.ko.intro;
