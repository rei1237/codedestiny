export interface CodexConsultationInput {
  relationship: "new" | "crush" | "dating" | "reunion" | "marriage";
  situation: string;
  questions: string[];
  relationshipStartedAt: string;
  separatedAt: string;
}
export interface CodexConsultation {
  referenceDate: string;
  questions: Array<{ id: string; text: string; chapterOrder: number }>;
  periods: Array<{ id: string; from: string; until: string }>;
  years: number[];
}
export interface CodexQuestionAnswer {
  questionId: string; answer: string; reasoning: string; outlook: string; actions: string[]; reassess: string;
}
export interface CodexPeriodReading {
  periodId: string; interpretation: string; action: string; reassess: string;
}
export const EMPTY_CONSULTATION: CodexConsultationInput = {
  relationship: "new", situation: "", questions: [""], relationshipStartedAt: "", separatedAt: "",
};

// UI-only copy follows the existing scoped locale and English fallback.
const EN = {
  title: "What would you like to ask?", optional: "Optional. Leave this blank for a general reading.",
  relationship: "Relationship stage", states: ["New connection", "Crush", "Dating", "Reunion", "Marriage"],
  situation: "Your situation", question: "Question", add: "Add a question", remove: "Remove",
  started: "Relationship start date (optional)", separated: "Separation date (optional)",
  hint: "Up to 3 questions, 500 characters each. Context: 1,500 characters. You can ask without the other person's birth details.",
  example: "Should I reach out again? What signs should I look for before deciding?",
  index: "Your questions and where to find answers", timing: "12 months and 3 years ahead",
  basis: "Why this interpretation", outlook: "Timing and possible developments",
  actions: "What to do", reassess: "When to reconsider", reference: "Reading date",
};
const COPIES: Record<string, typeof EN> = {
  en: EN,
  ko: {
    title: "어떤 인연이 궁금한가요?", optional: "선택 입력이에요. 비워두면 기존 종합 리포트로 안내해요.",
    relationship: "현재 관계", states: ["새로운 인연", "썸", "연애 중", "이별·재회", "결혼 고민"],
    situation: "현재 상황", question: "질문", add: "질문 추가하기", remove: "삭제",
    started: "관계 시작일 (선택)", separated: "이별일 (선택)",
    hint: "질문은 최대 3개·각 500자, 상황은 1,500자까지 적을 수 있어요. 상대의 생년정보 없이도 질문할 수 있어요.",
    example: "다시 연락해도 될까요? 어느 시기에 어떤 반응을 확인하고 결정하면 좋을까요?",
    index: "내 질문과 답변 위치", timing: "12개월·3년의 인연 흐름",
    basis: "이렇게 해석한 근거", outlook: "시기와 예상 흐름", actions: "실행할 행동", reassess: "판단을 다시 살필 신호", reference: "상담 기준일",
  },
  ja: {
    title: "どんなご縁について知りたいですか？", optional: "任意です。空欄の場合は総合鑑定をお届けします。",
    relationship: "現在の関係", states: ["新しい出会い", "気になる人", "交際中", "別れ・復縁", "結婚"],
    situation: "現在の状況", question: "質問", add: "質問を追加", remove: "削除",
    started: "交際開始日（任意）", separated: "別れた日（任意）",
    hint: "質問は3件まで各500文字、状況は1,500文字まで。相手の出生情報がなくても質問できます。",
    example: "もう一度連絡してもよいでしょうか？いつ、どんな反応を見て判断すればよいですか？",
    index: "質問と回答の場所", timing: "12か月・3年間のご縁の流れ",
    basis: "解釈の根拠", outlook: "時期と考えられる展開", actions: "実行すること", reassess: "見直すサイン", reference: "鑑定基準日",
  },
  "zh-CN": {
    title: "你想了解怎样的缘分？", optional: "选填。留空则提供综合解读。",
    relationship: "当前关系", states: ["新的缘分", "暧昧", "恋爱中", "分手·复合", "婚姻"],
    situation: "当前情况", question: "问题", add: "添加问题", remove: "删除",
    started: "关系开始日期（选填）", separated: "分手日期（选填）",
    hint: "最多3个问题，每个500字；情况说明限1,500字。没有对方的出生信息也可以提问。",
    example: "可以再次联系吗？适合在什么时期观察哪些反应再做决定？",
    index: "我的问题与回答位置", timing: "12个月与3年的缘分走向",
    basis: "解读依据", outlook: "时期与可能的发展", actions: "行动建议", reassess: "需要重新判断的信号", reference: "解读基准日期",
  },
  "zh-TW": {
    title: "你想了解怎樣的緣分？", optional: "選填。留空則提供綜合解讀。",
    relationship: "目前關係", states: ["新的緣分", "曖昧", "戀愛中", "分手·復合", "婚姻"],
    situation: "目前情況", question: "問題", add: "新增問題", remove: "刪除",
    started: "關係開始日期（選填）", separated: "分手日期（選填）",
    hint: "最多3個問題，每個500字；情況說明限1,500字。沒有對方的出生資訊也可以提問。",
    example: "可以再次聯絡嗎？適合在什麼時期觀察哪些反應再做決定？",
    index: "我的問題與回答位置", timing: "12個月與3年的緣分走向",
    basis: "解讀依據", outlook: "時期與可能的發展", actions: "行動建議", reassess: "需要重新判斷的訊號", reference: "解讀基準日期",
  },
};
export const codexConsultationCopy = (locale: string) => COPIES[locale] || EN;

const GUIDE_EN = {
 name: "Seo Hanbi", alt: "Seo Hanbi opens the Love Codex in a moonlit study.",
 lines: ["Tell me about the connection you hope to find. We will begin with what matters most to you.",
 "Tell me about the moments that felt close, and the ones that left you wondering.",
 "Tell me what brings you together and what keeps repeating between you.",
 "Tell me about your last conversation and the distance between you now. We will consider when to reach out and when to wait.",
 "Tell me about the future you imagine together. We will look at everyday life as well as affection."],
};
const GUIDES: Record<string, typeof GUIDE_EN> = {
 en: GUIDE_EN,
 ko: {name:"서한비",alt:"달빛 서재에서 인연의 서를 펼쳐 놓고 이야기를 기다리는 서한비",
 lines:["어떤 인연을 기다리고 있나요? 마음에 오래 남은 질문부터 이 책에 적어주세요.",
 "가까워졌다고 느낀 순간과 아직 알 수 없는 마음을 들려주세요. 다음 한 걸음을 함께 살펴볼게요.",
 "두 사람을 이어주는 것과 자꾸 엇갈리는 지점을 들려주세요. 관계의 흐름부터 차근히 읽어볼게요.",
 "마지막 대화와 지금의 거리부터 들려주세요. 연락할 때와 기다릴 때를 함께 살펴볼게요.",
 "함께 그리는 미래는 어떤 모습인가요? 설렘뿐 아니라 일상과 생활의 결까지 펼쳐볼게요."]},
 ja: {name:"ソ・ハンビ",alt:"月明かりの書斎で縁の書を開くソ・ハンビ",
 lines:["どんなご縁を待っていますか。心に残っている問いから書いてください。","近づいたと感じた瞬間と、まだ分からない気持ちを聞かせてください。","二人を結ぶものと、繰り返すすれ違いを聞かせてください。","最後の会話と今の距離から聞かせてください。連絡するときと待つときを一緒に考えます。","一緒に描く未来はどんな姿ですか。ときめきだけでなく日々の暮らしも見ていきましょう。"]},
 "zh-CN": {name:"徐韩妃",alt:"月光书房中翻开姻缘之书的徐韩妃",
 lines:["你在等待怎样的缘分？先写下心中最在意的问题。","请告诉我让你觉得靠近的时刻，以及仍然不明白的心意。","请说说连接你们的事，以及反复出现的分歧。","从最后一次对话和如今的距离说起吧。一起看看何时联系、何时等待。","你们共同期待怎样的未来？我们会一起看感情，也看日常生活。"]},
 "zh-TW": {name:"徐韓妃",alt:"月光書房中翻開姻緣之書的徐韓妃",
 lines:["你在等待怎樣的緣分？先寫下心中最在意的問題。","請告訴我讓你覺得靠近的時刻，以及仍然不明白的心意。","請說說連結你們的事，以及反覆出現的分歧。","從最後一次對話和如今的距離說起吧。一起看看何時聯絡、何時等待。","你們共同期待怎樣的未來？我們會一起看感情，也看日常生活。"]},
};
export const codexGuideCopy = (locale: string) => GUIDES[locale] || GUIDE_EN;
