import type { LoadingLocale } from "@/constants/loadingMessages";

const ko = {
  title: "네오가 짚어주는 핵심", question: "당신이 남긴 질문", verdict: "네오의 핵심 판단",
  firstAction: "먼저 할 한 가지", strengths: "살려야 할 강점", cautions: "조절해야 할 습관",
  pattern: "반복을 끊는 지점", repeated: "반복되는 선택", pressure: "지금 부딪히는 지점", strategy: "바꿀 방향",
  relationship: "서로를 보는 방향", towardPartner: "당신 → 상대", towardMe: "상대 → 당신",
  dialogue: "갈등 속 대화", timing: "시기별 실행 작전", mission: "당신의 실행 순서", caution: "이 행동은 잠시 멈추세요",
  evidence: "왜 이렇게 판단했을까요?", closing: "네오의 마지막 한마디", details: "상담 원문 펼쳐보기",
  detailsHint: "핵심을 확인했다면, 각 장에서 판단의 근거와 상세 조언을 읽어보세요.",
  expand: "전체 펼치기", collapse: "전체 접기", readMore: "상세 원문", day: "일차", steps: "실행 작전",
} as const;
type VisualCopy = { [K in keyof typeof ko]: string };
const translations: Partial<Record<Exclude<LoadingLocale, "ko">, VisualCopy>> = {
  en: {
    title: "NEO's essential briefing", question: "Your question", verdict: "NEO's key assessment", firstAction: "One action to start",
    strengths: "Strengths to use", cautions: "Habits to adjust", pattern: "Where to break the pattern", repeated: "Repeated choices",
    pressure: "Current friction", strategy: "A new direction", relationship: "How you see each other", towardPartner: "You → Partner", towardMe: "Partner → You",
    dialogue: "A conversation in conflict", timing: "Actions by timing", mission: "Your action sequence", caution: "Pause this action",
    evidence: "Why this assessment?", closing: "NEO's closing words", details: "Read the full consultation",
    detailsHint: "Open each chapter for the reasoning and detailed advice behind the briefing.", expand: "Expand all", collapse: "Collapse all", readMore: "Full text", day: "Day", steps: "Action plan",
  },
  ja: {
    title: "ネオが伝える要点", question: "あなたの質問", verdict: "ネオの判断", firstAction: "まず一つ行うこと",
    strengths: "活かしたい強み", cautions: "調整したい習慣", pattern: "繰り返しを断つポイント", repeated: "繰り返す選択",
    pressure: "今ぶつかる課題", strategy: "変える方向", relationship: "お互いを見る方向", towardPartner: "あなた → 相手", towardMe: "相手 → あなた",
    dialogue: "衝突の中の対話", timing: "時期別の行動", mission: "あなたの行動順序", caution: "この行動は一度止めましょう",
    evidence: "判断の根拠は？", closing: "ネオの最後のひと言", details: "相談の全文を読む",
    detailsHint: "各章を開いて、判断の根拠と詳しい助言を確認できます。", expand: "すべて開く", collapse: "すべて閉じる", readMore: "全文", day: "日目", steps: "行動計画",
  },
  "zh-CN": {
    title: "尼奥解说重点", question: "你的问题", verdict: "尼奥的核心判断", firstAction: "先做一件事",
    strengths: "值得发挥的优势", cautions: "需要调整的习惯", pattern: "打破重复的切入点", repeated: "重复的选择",
    pressure: "当前的阻力", strategy: "改变的方向", relationship: "彼此的视角", towardPartner: "你 → 对方", towardMe: "对方 → 你",
    dialogue: "冲突中的对话", timing: "分时期行动", mission: "你的行动顺序", caution: "先暂停这个行动",
    evidence: "为什么这样判断？", closing: "尼奥最后的话", details: "展开咨询全文",
    detailsHint: "展开各章，了解判断依据和详细建议。", expand: "全部展开", collapse: "全部收起", readMore: "详细原文", day: "天", steps: "行动计划",
  },
  "zh-TW": {
    title: "尼奧解說重點", question: "你的問題", verdict: "尼奧的核心判斷", firstAction: "先做一件事",
    strengths: "值得發揮的優勢", cautions: "需要調整的習慣", pattern: "打破重複的切入點", repeated: "重複的選擇",
    pressure: "當前的阻力", strategy: "改變的方向", relationship: "彼此的視角", towardPartner: "你 → 對方", towardMe: "對方 → 你",
    dialogue: "衝突中的對話", timing: "分時期行動", mission: "你的行動順序", caution: "先暫停這個行動",
    evidence: "為什麼這樣判斷？", closing: "尼奧最後的話", details: "展開諮詢全文",
    detailsHint: "展開各章，了解判斷依據和詳細建議。", expand: "全部展開", collapse: "全部收起", readMore: "詳細原文", day: "天", steps: "行動計畫",
  },
};

export function getNeoVisualCopy(locale: LoadingLocale): VisualCopy {
  return locale === "ko" ? ko : translations[locale] || translations.en || ko;
}
