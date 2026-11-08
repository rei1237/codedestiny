import type { LoadingLocale } from "@/constants/loadingMessages";

/** 위젯 그림은 승인된 영냥이 부적 원본에서 만든 작은 사본이다(scripts/build-widget-assets.mjs). */
export const WIDGET_TALISMANS = ["study", "wealth", "love", "contact", "success"] as const;
export type WidgetTalisman = typeof WIDGET_TALISMANS[number];
export const AFFIRMATION_IDS = ["own-pace", "enough", "breathe", "good-news", "kind-self", "small-step"] as const;
export type AffirmationId = typeof AFFIRMATION_IDS[number];

export type HomeWidgetCopy = {
  backHome: string; brand: string; headline: string; intro: string;
  kindLegend: string; talisman: string; affirmation: string;
  talismanLegend: string; affirmationLegend: string; preview: string;
  add: string; change: string; busy: string;
  requested: string; added: string; updated: string; missing: string; failed: string;
  manualTitle: string; manualSteps: string; manualHint: string; webOnly: string;
  editing: string; offline: string; remove: string;
  affirmations: Record<AffirmationId, string>;
};

const ko: HomeWidgetCopy = {
  backHome: "홈으로",
  brand: "꿀꿀운세",
  headline: "연이의 달빛 홈 화면",
  intro: "연이와 영냥이 중 곁에 두고 싶은 친구를 골라 보세요.",
  kindLegend: "무엇을 놓을까요?",
  talisman: "부적",
  affirmation: "긍정 확언",
  talismanLegend: "부적 고르기",
  affirmationLegend: "확언 고르기",
  preview: "홈 화면 미리보기",
  add: "홈 화면에 위젯 추가",
  change: "이 위젯 변경",
  busy: "준비하는 중…",
  requested: "확인창에서 '추가'를 누르면 홈 화면에 놓여요. 취소했다면 다시 눌러 주세요.",
  added: "홈 화면에 놓았어요.",
  updated: "위젯을 바꿨어요.",
  missing: "이 위젯을 찾지 못했어요. 새로 추가해 주세요.",
  failed: "위젯을 놓지 못했어요. 잠시 뒤 다시 시도해 주세요.",
  manualTitle: "직접 추가하는 방법",
  manualSteps: "홈 화면 빈 곳 길게 누르기 → 위젯 → 꿀꿀운세",
  manualHint: "고른 내용은 기기에 저장돼 있어서, 위젯을 놓으면 바로 보여요.",
  webOnly: "홈 화면 위젯은 Android 앱에서 놓을 수 있어요.",
  editing: "지금 누른 위젯의 내용을 바꾸는 중이에요.",
  offline: "한 번 놓으면 인터넷이 없어도 그대로 보여요. 위젯을 누르면 언제든 바꿀 수 있어요.",
  remove: "없애려면 홈 화면의 위젯을 길게 누른 뒤 '삭제'를 누르세요.",
  affirmations: {
    "own-pace": "오늘은 내 속도로 가도 괜찮아",
    enough: "지금의 나로도 충분해",
    breathe: "잠깐 숨 고르고 다시 걸으면 돼",
    "good-news": "좋은 소식은 조용히 오고 있어",
    "kind-self": "오늘은 나에게 조금 더 다정하게",
    "small-step": "작은 한 걸음도 분명 앞으로야",
  },
};

const en: HomeWidgetCopy = {
  backHome: "Home",
  brand: "Code Destiny",
  headline: "Yeoni’s moonlit home screen",
  intro: "Choose Yeoni or Yeongnyangi to keep you company on your home screen.",
  kindLegend: "What would you like to place?",
  talisman: "Talisman",
  affirmation: "Affirmation",
  talismanLegend: "Choose a talisman",
  affirmationLegend: "Choose an affirmation",
  preview: "Home screen preview",
  add: "Add to my home screen",
  change: "Change this widget",
  busy: "Preparing…",
  requested: "Tap 'Add' in the confirmation to place it. If you cancelled, tap the button again.",
  added: "Placed on your home screen.",
  updated: "Widget updated.",
  missing: "We couldn't find this widget. Please add a new one.",
  failed: "We couldn't place the widget. Please try again shortly.",
  manualTitle: "Add it yourself",
  manualSteps: "Long-press an empty spot on the home screen → Widgets → 꿀꿀운세",
  manualHint: "Your choice is saved on this device, so it appears as soon as you place the widget.",
  webOnly: "Home screen widgets are available in the Android app.",
  editing: "You're changing the widget you just tapped.",
  offline: "Once placed, it shows even without internet. Tap the widget any time to change it.",
  remove: "To remove it, long-press the widget on your home screen and tap 'Remove'.",
  affirmations: {
    "own-pace": "It's okay to go at my own pace today",
    enough: "I am enough just as I am",
    breathe: "Pause, breathe, and walk on again",
    "good-news": "Good news is quietly on its way",
    "kind-self": "A little kinder to myself today",
    "small-step": "Even a small step is still forward",
  },
};

/** 한국어·영어만 직접 옮겼다. 다른 언어는 영어로 보인다(부적 이름은 부적 화면의 번역을 쓴다). */
export function getHomeWidgetCopy(locale: LoadingLocale): HomeWidgetCopy {
  return locale === "ko" ? ko : en;
}
