import { TAROT_CARDS } from "../../../../lib/tarot/tarot-cards.mjs";
import { CATEGORY_LABEL, DEFAULT_QUESTION_BY_CATEGORY, getLocalizedPromptMakerData, normalizePromptMakerLocale as normalizePromptBuilderLocale, type PromptMakerLocale as PromptBuilderLocale } from "../data/tarotSpreadLibrary";
import type { DrawnTarotCard, TarotSpread } from "../types";

type OraclePromptResult = {
  prompt: string;
  summary: string;
  cardDigest: string[];
  guidance: string[];
  effectiveQuestion: string;
};

type SuitCode = "W" | "C" | "S" | "P";

type OraclePromptOptions = {
  questionCategory?: TarotSpread["category"];
  locale?: string | null;
};

type LocalizedPromptBuilderCopy = {
  tarotRole: string;
  lenormandRole: string;
  outputLanguage: string;
  clientQuestion: string;
  spreadInfo: string;
  cards: string;
  readingRules: string;
  outputFormat: string;
  voice: string;
  category: string;
  spreadName: (categoryName: string, count: number) => string;
  cardCount: (count: number) => string;
  cardDigest: (index: number, cardName: string, cardCode: string, direction: string) => string;
  lenormandDigest: (index: number, cardName: string, cardCode: string) => string;
  orientation: Record<"upright" | "reversed", string>;
  tarotGuidance: string[];
  lenormandGuidance: string[];
  tarotOutput: string[];
  lenormandOutput: string[];
  voiceLines: string[];
  tarotSummary: (spreadName: string, categoryName: string) => string;
  lenormandSummary: (spreadName: string) => string;
};

type TarotMeaning = {
  core?: string[];
  shadow?: string[];
  advice?: string[];
  shadowText?: string;
  adviceText?: string;
  boundaryPattern?: string[];
  recoveryAdvice?: string[];
  caution?: string[];
  [key: string]: unknown;
};

type TarotCardWithMeanings = {
  code?: string;
  upright?: TarotMeaning;
  reversed?: TarotMeaning;
};

type SpreadAnalysis = {
  total: number;
  majorCount: number;
  courtCount: number;
  suitCounts: Record<SuitCode, number>;
  uprightCount: number;
  reversedCount: number;
  repeatedSuits: string[];
  tone: string;
  firstCard: DrawnTarotCard | null;
  lastCard: DrawnTarotCard | null;
  adviceCard: DrawnTarotCard | null;
  obstacleCard: DrawnTarotCard | null;
  outcomeCard: DrawnTarotCard | null;
  summaryLines: string[];
};

const ORIENTATION_MEANING: Record<"upright" | "reversed", string> = {
  upright: "정방향: 에너지가 비교적 자연스럽게 발현되는 상태",
  reversed: "역방향: 지연, 과잉, 내면화, 왜곡처럼 에너지가 비틀려 나타나는 상태",
};

const SUIT_EXPERT_LENS: Record<string, string> = {
  W: "완드: 추진력, 욕망, 행동 에너지, 리스크 감수",
  C: "컵: 감정 교류, 애착, 정서적 안전감, 친밀성",
  S: "소드: 인지 프레임, 경계, 갈등 인식, 의사결정",
  P: "펜타클: 현실성, 지속 가능성, 자원 운용, 관계의 실무",
};

const RANK_EXPERT_LENS: Record<string, string> = {
  "01": "에이스: 씨앗, 시작점, 잠재력 점화",
  "02": "투: 양자 선택, 균형/줄다리기, 기준 확립",
  "03": "쓰리: 확장, 연계, 외부 상호작용",
  "04": "포: 안정화 또는 고착화, 보호 본능",
  "05": "파이브: 갈등, 결핍 체감, 전환 압박",
  "06": "식스: 회복, 재정렬, 관계 온도 복원",
  "07": "세븐: 경계, 전략, 시험 구간",
  "08": "에잇: 가속 또는 압박, 방향 전환 직전",
  "09": "나인: 정리, 내면 점검, 마무리 직전",
  "10": "텐: 종결, 최대치, 다음 사이클 진입",
  "11": "페이지: 신호 포착, 학습, 탐색",
  "12": "나이트: 돌진, 속도, 결과 선호",
  "13": "퀸: 정서적 통제력, 맥락 읽기, 조율",
  "14": "킹: 책임, 최종 판단, 구조화",
};

const MAJOR_EXPERT_LENS: Record<string, string> = {
  M00: "바보: 무경계의 시작, 가능성 점프, 리스크 인식 필요",
  M01: "마법사: 의도-행동 정렬, 실행력, 현실화",
  M02: "여사제: 침묵의 정보, 직관, 보류된 진실",
  M03: "여황제: 돌봄, 풍요, 관계 양육",
  M04: "황제: 구조, 규칙, 책임, 통제 이슈",
  M05: "교황: 가치 체계, 합의, 제도/약속",
  M06: "연인: 선택과 결합, 가치 일치 여부",
  M07: "전차: 의지 주행, 속도 조절, 방향성",
  M08: "힘: 감정 조율, 자기 통제, 회복 탄력",
  M09: "은둔자: 거리 두기, 성찰, 재정의",
  M10: "운명의 수레바퀴: 타이밍, 순환, 외부 변수",
  M11: "정의: 균형, 책임 배분, 인과 정렬",
  M12: "매달린 사람: 유예, 관점 전환, 전략적 멈춤",
  M13: "죽음: 패턴 종결, 구조적 전환, 재시작",
  M14: "절제: 통합, 속도 완화, 중간지대 협상",
  M15: "악마: 집착, 의존, 경계 붕괴 리스크",
  M16: "탑: 급변, 붕괴, 강제 재편",
  M17: "별: 회복, 신뢰 재건, 장기 희망",
  M18: "달: 불안, 투사, 정보 불명확성",
  M19: "태양: 명료성, 개방, 활력 회복",
  M20: "심판: 재평가, 호출, 관계 재결정",
  M21: "세계: 통합, 완결, 성숙한 귀결",
};

const SUIT_LABEL: Record<SuitCode, string> = {
  W: "완드",
  C: "컵",
  S: "소드",
  P: "펜타클",
};

const CATEGORY_FOCUS: Record<TarotSpread["category"], string[]> = {
  love: ["상대 마음", "관계 흐름", "호감의 온도", "내가 취할 태도", "피해야 할 행동"],
  reunion: ["연락 가능성", "미련과 정리의 균형", "관계 재정의", "기다림과 행동의 속도", "회복 가능한 소통 방식"],
  third_party: ["제3자의 실제 영향력", "불안과 사실의 분리", "경쟁 구도에서의 내 경계", "상대의 행동 단서", "관계 보호 전략"],
  relationship: ["갈등의 핵심", "말과 행동의 불일치", "관계의 신뢰도", "조율해야 할 경계", "현실적인 대화 방식"],
  career: ["현재 상황", "기회와 리스크", "나의 강점", "현실적 선택 기준", "다음 행동"],
  money: ["돈의 흐름", "위험요소", "확장 가능성", "관리해야 할 부분", "현실적 조언"],
  family: ["가족 안의 반복 패턴", "감정적 거리", "말하지 않은 요구", "내가 지킬 경계", "회복 가능한 대화"],
  self: ["내면 감정", "반복되는 심리 패턴", "회복 포인트", "자기 보호", "작은 실천"],
  choice: ["선택 A/B의 기준", "얻는 것과 잃는 것", "내가 감당할 수 있는 현실", "보류가 필요한 지점", "결정 후 행동"],
  daily: ["오늘의 분위기", "주의할 말과 행동", "기회 신호", "감정 조율", "하루 마무리 조언"],
  crisis: ["문제의 표면과 본질", "즉시 피해야 할 충동", "통제 가능한 변수", "외부 도움 필요성", "첫 번째 현실 행동"],
  future: ["가까운 흐름", "준비해야 할 변화", "반복될 가능성이 있는 패턴", "내가 바꿀 수 있는 선택", "장기 조언"],
  spiritual: ["반복되는 직관 신호", "내면의 상징 언어", "현실과 영감의 균형", "받아들일 메시지", "오늘의 의식적 선택"],
  power: ["영향력의 방향", "성공 욕구와 책임", "리더십의 그림자", "조직 안의 균형", "지속 가능한 야망"],
  special: ["질문의 진짜 의도", "핵심 변수", "숨은 감정", "현실적 대응", "오늘 가능한 조정"],
  legal: ["감정과 사실의 분리", "리스크 점검", "전문가 상담 필요성", "기록과 준비", "신중한 대응"],
};

const CATEGORY_EXPRESSION_GUIDE: Record<TarotSpread["category"], string> = {
  love: "상대의 마음은 확정하지 말고, 카드가 보여주는 가능성과 행동 단서로 말합니다.",
  reunion: "재회 가능성은 단정하지 말고, 미련·현실 조건·연락 타이밍을 분리합니다.",
  third_party: "제3자 문제는 불안을 키우지 말고, 확인된 행동과 추정되는 감정을 구분합니다.",
  daily: "오늘의 흐름은 하루 안에 실천 가능한 조언으로 짧고 선명하게 정리합니다.",
  choice: "선택 질문은 정답을 대신 정하지 말고, 얻는 것과 잃는 것을 비교해 기준을 세웁니다.",
  career: "커리어 질문은 감정적 만족, 현실 조건, 준비도를 함께 봅니다.",
  money: "금전 질문은 투자 확답이나 수익 보장을 피하고, 관리·점검·보수적 선택 기준으로 안내합니다.",
  relationship: "인간관계 질문은 책임 소재를 단정하지 말고, 대화 순서와 경계선을 제안합니다.",
  self: "심리 질문은 진단처럼 쓰지 말고, 감정 이름 붙이기와 회복 행동으로 낮춥니다.",
  crisis: "위기 질문은 공포를 키우지 말고, 멈출 행동·바로 할 행동·도움을 청할 지점을 분리합니다.",
  future: "미래 질문은 예언보다 현재 패턴이 이어질 때의 가능성으로 말합니다.",
  spiritual: "영적 메시지는 현실을 회피하게 만들지 말고, 상징을 오늘의 선택으로 번역합니다.",
  family: "가족 질문은 오래된 패턴을 다루되, 죄책감보다 경계와 회복 가능성을 우선합니다.",
  power: "성공과 권력 질문은 욕망을 부정하지 말고, 책임과 균형의 그림자를 함께 읽습니다.",
  legal: "법률 질문은 승패나 판결을 예언하지 말고, 기록 정리와 전문가 상담을 권하는 참고용 상징 해석으로 제한합니다.",
  special: "특별 상황은 질문자의 의도를 먼저 재정리하고, 핵심 변수와 오늘 가능한 조정을 중심으로 말합니다.",
};

const CATEGORY_SAFETY_GUIDE: Partial<Record<TarotSpread["category"], string[]>> = {
  crisis: [
    "긴급한 위험, 폭력, 자해 가능성이 보이면 타로 판단을 멈추고 즉시 주변 도움이나 전문기관 연결을 권합니다.",
    "불안을 증폭하는 예언 대신 지금 멈출 행동, 확인할 사실, 요청할 도움을 순서대로 제시합니다.",
  ],
  legal: [
    "판결, 승패, 고소 성공 여부를 확정하지 않고 기록 정리와 전문가 상담을 우선 안내합니다.",
    "감정적 해석과 법적 사실을 분리해 참고용 상징 해석으로만 표현합니다.",
  ],
  money: [
    "수익, 투자 성공, 손실 회복을 보장하지 않고 위험 신호와 보수적 관리 기준으로 안내합니다.",
  ],
  self: [
    "진단명처럼 말하지 않고 감정의 이름, 회복 행동, 도움을 청할 수 있는 선택지로 낮춥니다.",
  ],
};

const CONSULTATION_PROTOCOL = [
  "질문자가 진짜 알고 싶어 하는 의도를 먼저 한 문장으로 밝힙니다.",
  "스프레드의 목적과 각 포지션의 역할을 질문 맥락에 맞게 연결합니다.",
  "카드별 해석은 카드 이름보다 포지션, 방향, 질문 맥락을 우선합니다.",
  "카드 간 긴장과 조화를 읽어 전체 이야기를 하나의 흐름으로 엮습니다.",
  "결론은 운명 선언이 아니라 질문자가 회복할 수 있는 선택지로 마무리합니다.",
];

const PROMPT_COMPLETION_CHECKLIST = [
  "질문 재정의가 원문 반복에 그치지 않고 질문자의 실제 의도를 드러냈는지 확인합니다.",
  "모든 포지션 해석에 카드 방향, 포지션 의미, 질문 맥락이 함께 들어갔는지 확인합니다.",
  "카드 간 관계를 최소 한 번 이상 연결해 전체 흐름을 하나의 이야기로 묶었는지 확인합니다.",
  "민감 주제에서 확정 표현, 공포 표현, 전문가 판단 대체 표현이 없는지 확인합니다.",
  "마지막 조언이 오늘 실행 가능한 행동과 마음가짐으로 끝나는지 확인합니다.",
];

const FORBIDDEN_PHRASES = ["반드시", "무조건", "100%", "끝났다", "절대 안 된다", "망합니다", "합격합니다", "병이 있습니다", "죽음이 보입니다"];

const CARD_MEANING_MAP = new Map(
  (TAROT_CARDS as TarotCardWithMeanings[])
    .filter((card) => card?.code)
    .map((card) => [String(card.code).toUpperCase(), card]),
);

const LOCALIZED_PROMPT_BUILDER_COPY: Record<Exclude<PromptBuilderLocale, "ko">, LocalizedPromptBuilderCopy> = {
  en: {
    tarotRole: "You are a professional tarot reader consulting a real client.",
    lenormandRole: "You are a professional Lenormand reader consulting a real client.",
    outputLanguage: "Write the final reading in natural English.",
    clientQuestion: "Client question",
    spreadInfo: "Spread information",
    cards: "Cards",
    readingRules: "Reading rules",
    outputFormat: "Output format",
    voice: "Voice",
    category: "Question category",
    spreadName: (categoryName, count) => `${categoryName} ${count}-card spread`,
    cardCount: (count) => `${count} cards`,
    cardDigest: (index, cardName, cardCode, direction) => `${index}. ${cardName} (${cardCode}) - ${direction}`,
    lenormandDigest: (index, cardName, cardCode) => `${index}. ${cardName} (${cardCode})`,
    orientation: { upright: "upright", reversed: "reversed" },
    tarotGuidance: ["Read the card in relation to the question and its order, not as an isolated keyword.", "Do not make fixed predictions about love, money, health, legal matters, pregnancy, or exam outcomes.", "End with realistic actions the client can choose today."],
    lenormandGuidance: ["Read neighboring cards as a sentence-like flow.", "Do not use tarot reversals; read order, distance, and repeated signs.", "Separate current flow, repeated pattern, and next practical action."],
    tarotOutput: ["1. The real theme behind the question", "2. The first overall flow shown by the spread", "3. Card-by-card reading", "4. Tensions and harmonies between cards", "5. Possible illusion or over-expectation to watch", "6. Two or three realistic actions from today", "7. A final sentence that settles the heart"],
    lenormandOutput: ["1. Question scope and what to check now", "2. The one-sentence flow made by the six cards", "3. Neighboring card pair readings", "4. Repeated signs and actions to reduce", "5. Two or three actions to increase", "6. A final sentence that organizes judgment"],
    voiceLines: ["Use a warm, trustworthy consultation tone.", "Speak like a real reader, not like a technical report.", "Keep Code Destiny's moonlit tone without fear-based or exaggerated claims."],
    tarotSummary: (spreadName, categoryName) => `${spreadName} is ready for a ${categoryName} consultation prompt in English.`,
    lenormandSummary: (spreadName) => `${spreadName} is ready as a Lenormand prompt in English.`,
  },
  ja: {
    tarotRole: "あなたは実際の相談者を前にする専門タロットリーダーです。",
    lenormandRole: "あなたは実際の相談者を前にする専門ルノルマンリーダーです。",
    outputLanguage: "最終リーディングは自然な日本語のです・ます調で書いてください。",
    clientQuestion: "相談者の質問",
    spreadInfo: "スプレッド情報",
    cards: "カード",
    readingRules: "リーディング基準",
    outputFormat: "出力形式",
    voice: "語り口",
    category: "質問カテゴリ",
    spreadName: (categoryName, count) => `${categoryName} ${count}枚スプレッド`,
    cardCount: (count) => `${count}枚`,
    cardDigest: (index, cardName, cardCode, direction) => `${index}. ${cardName}（${cardCode}） - ${direction}`,
    lenormandDigest: (index, cardName, cardCode) => `${index}. ${cardName}（${cardCode}）`,
    orientation: { upright: "正位置", reversed: "逆位置" },
    tarotGuidance: ["カードを単独の意味ではなく、質問と並び順に結びつけて読んでください。", "恋愛、金銭、健康、法律、妊娠、合否は断定せず参考として扱ってください。", "最後は今日選べる現実的な行動で結んでください。"],
    lenormandGuidance: ["隣り合うカードを一文の流れのように読んでください。", "タロットの逆位置は使わず、順序、距離、繰り返すサインを見てください。", "現在の流れ、反復パターン、次の現実行動を分けてください。"],
    tarotOutput: ["1. 質問の奥にある本当のテーマ", "2. スプレッド全体で最初に見える流れ", "3. カードごとの解釈", "4. カード同士の緊張と調和", "5. 気をつけたい思い込みや過剰な期待", "6. 今日からできる現実行動2〜3個", "7. 心を整える最後の一言"],
    lenormandOutput: ["1. 質問範囲と今確認するポイント", "2. 6枚がつくる一文の流れ", "3. 隣接カードの組み合わせ解釈", "4. 繰り返すサインと減らす行動", "5. 増やすとよい行動2〜3個", "6. 判断を整える最後の一言"],
    voiceLines: ["温かく信頼できる相談口調で書いてください。", "技術文書ではなく、実際の占い師が語るように自然に話してください。", "Code Destinyらしい月明かりの繊細な雰囲気を保ち、恐怖や誇張は避けてください。"],
    tarotSummary: (spreadName, categoryName) => `${spreadName}で、${categoryName}の相談プロンプトを日本語で作成します。`,
    lenormandSummary: (spreadName) => `${spreadName}で、ルノルマン相談プロンプトを日本語で作成します。`,
  },
  "zh-CN": {
    tarotRole: "你是一位为真实来访者咨询的专业塔罗师。",
    lenormandRole: "你是一位为真实来访者咨询的专业雷诺曼牌读者。",
    outputLanguage: "请用自然的简体中文写最终解读。",
    clientQuestion: "来访者问题",
    spreadInfo: "牌阵信息",
    cards: "卡牌",
    readingRules: "解读规则",
    outputFormat: "输出格式",
    voice: "语气",
    category: "问题分类",
    spreadName: (categoryName, count) => `${categoryName}${count}张牌阵`,
    cardCount: (count) => `${count}张`,
    cardDigest: (index, cardName, cardCode, direction) => `${index}. ${cardName}（${cardCode}） - ${direction}`,
    lenormandDigest: (index, cardName, cardCode) => `${index}. ${cardName}（${cardCode}）`,
    orientation: { upright: "正位", reversed: "逆位" },
    tarotGuidance: ["请把卡牌放在问题和顺序中解读，不要孤立解释关键词。", "爱情、金钱、健康、法律、怀孕、录取结果都不要作确定断言。", "结尾请给出来访者今天可以选择的现实行动。"],
    lenormandGuidance: ["把相邻卡牌读成一句连续的流向。", "不要使用塔罗逆位，重点看顺序、距离和重复信号。", "区分当前流向、重复模式和下一步现实行动。"],
    tarotOutput: ["1. 问题背后的真正主题", "2. 牌阵整体最先显示的流向", "3. 逐张卡牌解读", "4. 卡牌之间的张力与和谐", "5. 需要留意的错觉或过度期待", "6. 今天可以做的现实行动2到3项", "7. 让内心安定的最后一句"],
    lenormandOutput: ["1. 问题范围和现在要确认的重点", "2. 六张牌连接成的一句话流向", "3. 相邻卡牌组合解读", "4. 重复信号和需要减少的行动", "5. 可以增加的行动2到3项", "6. 整理判断的最后一句"],
    voiceLines: ["请使用温暖、可信的咨询语气。", "像真实读牌者一样说话，不要写成技术报告。", "保留Code Destiny的月光感，避免恐吓或夸张断言。"],
    tarotSummary: (spreadName, categoryName) => `${spreadName}已准备好生成${categoryName}咨询提示词。`,
    lenormandSummary: (spreadName) => `${spreadName}已准备好生成雷诺曼咨询提示词。`,
  },
  "zh-TW": {
    tarotRole: "你是一位為真實來訪者諮詢的專業塔羅師。",
    lenormandRole: "你是一位為真實來訪者諮詢的專業雷諾曼牌讀者。",
    outputLanguage: "請用自然的繁體中文寫最終解讀。",
    clientQuestion: "來訪者問題",
    spreadInfo: "牌陣資訊",
    cards: "卡牌",
    readingRules: "解讀規則",
    outputFormat: "輸出格式",
    voice: "語氣",
    category: "問題分類",
    spreadName: (categoryName, count) => `${categoryName}${count}張牌陣`,
    cardCount: (count) => `${count}張`,
    cardDigest: (index, cardName, cardCode, direction) => `${index}. ${cardName}（${cardCode}） - ${direction}`,
    lenormandDigest: (index, cardName, cardCode) => `${index}. ${cardName}（${cardCode}）`,
    orientation: { upright: "正位", reversed: "逆位" },
    tarotGuidance: ["請把卡牌放在問題和順序中解讀，不要孤立解釋關鍵字。", "愛情、金錢、健康、法律、懷孕、錄取結果都不要作確定斷言。", "結尾請給出來訪者今天可以選擇的現實行動。"],
    lenormandGuidance: ["把相鄰卡牌讀成一句連續的流向。", "不要使用塔羅逆位，重點看順序、距離和重複訊號。", "區分目前流向、重複模式和下一步現實行動。"],
    tarotOutput: ["1. 問題背後的真正主題", "2. 牌陣整體最先顯示的流向", "3. 逐張卡牌解讀", "4. 卡牌之間的張力與和諧", "5. 需要留意的錯覺或過度期待", "6. 今天可以做的現實行動2到3項", "7. 讓內心安定的最後一句"],
    lenormandOutput: ["1. 問題範圍和現在要確認的重點", "2. 六張牌連接成的一句話流向", "3. 相鄰卡牌組合解讀", "4. 重複訊號和需要減少的行動", "5. 可以增加的行動2到3項", "6. 整理判斷的最後一句"],
    voiceLines: ["請使用溫暖、可信的諮詢語氣。", "像真實讀牌者一樣說話，不要寫成技術報告。", "保留Code Destiny的月光感，避免恐嚇或誇張斷言。"],
    tarotSummary: (spreadName, categoryName) => `${spreadName}已準備好生成${categoryName}諮詢提示詞。`,
    lenormandSummary: (spreadName) => `${spreadName}已準備好生成雷諾曼諮詢提示詞。`,
  },
  vi: {
    tarotRole: "Bạn là một tarot reader chuyên nghiệp đang tư vấn cho khách thật.",
    lenormandRole: "Bạn là một Lenormand reader chuyên nghiệp đang tư vấn cho khách thật.",
    outputLanguage: "Hãy viết phần luận giải cuối bằng tiếng Việt tự nhiên.",
    clientQuestion: "Câu hỏi của khách",
    spreadInfo: "Thông tin trải bài",
    cards: "Lá bài",
    readingRules: "Quy tắc luận giải",
    outputFormat: "Định dạng trả lời",
    voice: "Giọng điệu",
    category: "Danh mục câu hỏi",
    spreadName: (categoryName, count) => `trải ${count} lá cho ${categoryName}`,
    cardCount: (count) => `${count} lá`,
    cardDigest: (index, cardName, cardCode, direction) => `${index}. ${cardName} (${cardCode}) - ${direction}`,
    lenormandDigest: (index, cardName, cardCode) => `${index}. ${cardName} (${cardCode})`,
    orientation: { upright: "xuôi", reversed: "ngược" },
    tarotGuidance: ["Đọc lá bài trong quan hệ với câu hỏi và thứ tự, không tách thành từ khóa rời.", "Không kết luận chắc chắn về tình yêu, tiền bạc, sức khỏe, pháp lý, thai kỳ hay kết quả thi cử.", "Kết bằng hành động thực tế khách có thể chọn hôm nay."],
    lenormandGuidance: ["Đọc các lá liền kề như một dòng câu.", "Không dùng đảo chiều kiểu tarot; hãy đọc thứ tự, khoảng cách và tín hiệu lặp lại.", "Tách dòng hiện tại, mẫu lặp lại và hành động thực tế tiếp theo."],
    tarotOutput: ["1. Chủ đề thật phía sau câu hỏi", "2. Dòng lớn đầu tiên hiện trong trải bài", "3. Luận giải từng lá", "4. Căng thẳng và hòa hợp giữa các lá", "5. Ảo tưởng hoặc kỳ vọng quá mức cần chú ý", "6. Hai hoặc ba hành động thực tế từ hôm nay", "7. Một câu cuối giúp lòng yên lại"],
    lenormandOutput: ["1. Phạm vi câu hỏi và điểm cần kiểm tra", "2. Dòng một câu do sáu lá tạo thành", "3. Luận giải cặp lá liền kề", "4. Tín hiệu lặp lại và hành động nên giảm", "5. Hai hoặc ba hành động nên tăng", "6. Một câu cuối để sắp lại phán đoán"],
    voiceLines: ["Dùng giọng tư vấn ấm và đáng tin.", "Nói như một reader thật, không như tài liệu kỹ thuật.", "Giữ sắc thái ánh trăng của Code Destiny, tránh gây sợ hoặc phóng đại."],
    tarotSummary: (spreadName, categoryName) => `${spreadName} đã sẵn sàng cho prompt tư vấn ${categoryName}.`,
    lenormandSummary: (spreadName) => `${spreadName} đã sẵn sàng cho prompt Lenormand.`,
  },
  hi: {
    tarotRole: "आप वास्तविक client को consult करने वाले professional tarot reader हैं.",
    lenormandRole: "आप वास्तविक client को consult करने वाले professional Lenormand reader हैं.",
    outputLanguage: "Final reading natural Hindi में लिखें.",
    clientQuestion: "Client question",
    spreadInfo: "Spread information",
    cards: "Cards",
    readingRules: "Reading rules",
    outputFormat: "Output format",
    voice: "Voice",
    category: "Question category",
    spreadName: (categoryName, count) => `${categoryName} ${count}-card spread`,
    cardCount: (count) => `${count} cards`,
    cardDigest: (index, cardName, cardCode, direction) => `${index}. ${cardName} (${cardCode}) - ${direction}`,
    lenormandDigest: (index, cardName, cardCode) => `${index}. ${cardName} (${cardCode})`,
    orientation: { upright: "upright", reversed: "reversed" },
    tarotGuidance: ["Card को isolated keyword की तरह नहीं, question और order से जोड़कर पढ़ें.", "Love, money, health, legal, pregnancy या exam outcomes पर fixed prediction न दें.", "अंत में client आज चुन सके ऐसी realistic actions दें."],
    lenormandGuidance: ["Neighboring cards को sentence-like flow की तरह पढ़ें.", "Tarot reversals न लगाएँ; order, distance और repeated signs पढ़ें.", "Current flow, repeated pattern और next practical action अलग करें."],
    tarotOutput: ["1. Question के पीछे का real theme", "2. Spread में पहले दिखने वाला बड़ा flow", "3. Card-by-card reading", "4. Cards के बीच tension और harmony", "5. ध्यान रखने योग्य illusion या over-expectation", "6. आज से संभव 2-3 realistic actions", "7. Heart को settle करने वाली final sentence"],
    lenormandOutput: ["1. Question scope और अभी check करने का point", "2. Six cards से बना one-sentence flow", "3. Neighboring card pair readings", "4. Repeated signs और घटाने वाली actions", "5. बढ़ाने योग्य 2-3 actions", "6. Judgment organize करने वाली final sentence"],
    voiceLines: ["Warm और trustworthy consultation tone रखें.", "Technical report नहीं, real reader की तरह बोलें.", "Code Destiny का moonlit tone रखें, fear या exaggeration से बचें."],
    tarotSummary: (spreadName, categoryName) => `${spreadName} ${categoryName} consultation prompt के लिए ready है.`,
    lenormandSummary: (spreadName) => `${spreadName} Lenormand prompt के लिए ready है.`,
  },
  es: {
    tarotRole: "Eres una tarotista profesional que atiende a una persona real.",
    lenormandRole: "Eres una lectora Lenormand profesional que atiende a una persona real.",
    outputLanguage: "Escribe la lectura final en español natural.",
    clientQuestion: "Pregunta de la persona consultante",
    spreadInfo: "Información de la tirada",
    cards: "Cartas",
    readingRules: "Reglas de lectura",
    outputFormat: "Formato de salida",
    voice: "Voz",
    category: "Categoría de pregunta",
    spreadName: (categoryName, count) => `tirada de ${count} cartas para ${categoryName}`,
    cardCount: (count) => `${count} cartas`,
    cardDigest: (index, cardName, cardCode, direction) => `${index}. ${cardName} (${cardCode}) - ${direction}`,
    lenormandDigest: (index, cardName, cardCode) => `${index}. ${cardName} (${cardCode})`,
    orientation: { upright: "derecha", reversed: "invertida" },
    tarotGuidance: ["Lee cada carta en relación con la pregunta y el orden, no como palabra clave aislada.", "No hagas predicciones fijas sobre amor, dinero, salud, temas legales, embarazo o resultados.", "Cierra con acciones realistas que la persona pueda elegir hoy."],
    lenormandGuidance: ["Lee las cartas vecinas como un flujo de frase.", "No uses invertidas de tarot; lee orden, distancia y señales repetidas.", "Separa flujo actual, patrón repetido y próxima acción práctica."],
    tarotOutput: ["1. Tema real detrás de la pregunta", "2. Primer gran flujo que muestra la tirada", "3. Lectura carta por carta", "4. Tensiones y armonías entre cartas", "5. Ilusión o expectativa excesiva a vigilar", "6. Dos o tres acciones realistas desde hoy", "7. Una frase final que ordene el corazón"],
    lenormandOutput: ["1. Alcance de la pregunta y punto a revisar ahora", "2. Flujo en una frase creado por las seis cartas", "3. Lecturas de pares vecinos", "4. Señales repetidas y acciones a reducir", "5. Dos o tres acciones a aumentar", "6. Una frase final para ordenar el juicio"],
    voiceLines: ["Usa un tono de consulta cálido y confiable.", "Habla como una lectora real, no como un informe técnico.", "Mantén el tono lunar de Code Destiny sin miedo ni exageración."],
    tarotSummary: (spreadName, categoryName) => `${spreadName} está lista para un prompt de consulta de ${categoryName}.`,
    lenormandSummary: (spreadName) => `${spreadName} está lista como prompt Lenormand.`,
  },
  fr: {
    tarotRole: "Vous êtes une lectrice de tarot professionnelle qui conseille une personne réelle.",
    lenormandRole: "Vous êtes une lectrice Lenormand professionnelle qui conseille une personne réelle.",
    outputLanguage: "Rédigez la lecture finale en français naturel.",
    clientQuestion: "Question de la personne",
    spreadInfo: "Informations du tirage",
    cards: "Cartes",
    readingRules: "Règles de lecture",
    outputFormat: "Format de sortie",
    voice: "Voix",
    category: "Catégorie de question",
    spreadName: (categoryName, count) => `tirage ${count} cartes pour ${categoryName}`,
    cardCount: (count) => `${count} cartes`,
    cardDigest: (index, cardName, cardCode, direction) => `${index}. ${cardName} (${cardCode}) - ${direction}`,
    lenormandDigest: (index, cardName, cardCode) => `${index}. ${cardName} (${cardCode})`,
    orientation: { upright: "droite", reversed: "renversée" },
    tarotGuidance: ["Lisez la carte avec la question et l'ordre, pas comme un mot-clé isolé.", "Ne faites pas de prédiction fixe sur amour, argent, santé, droit, grossesse ou résultats.", "Terminez par des actions réalistes que la personne peut choisir aujourd'hui."],
    lenormandGuidance: ["Lisez les cartes voisines comme un flux de phrase.", "N'utilisez pas les renversées du tarot; lisez ordre, distance et signes répétés.", "Séparez flux actuel, motif répété et prochaine action pratique."],
    tarotOutput: ["1. Thème réel derrière la question", "2. Premier grand flux montré par le tirage", "3. Lecture carte par carte", "4. Tensions et harmonies entre les cartes", "5. Illusion ou attente excessive à surveiller", "6. Deux ou trois actions réalistes dès aujourd'hui", "7. Une phrase finale qui apaise le coeur"],
    lenormandOutput: ["1. Portée de la question et point à vérifier", "2. Flux en une phrase créé par les six cartes", "3. Lectures des paires voisines", "4. Signes répétés et actions à réduire", "5. Deux ou trois actions à renforcer", "6. Une phrase finale pour organiser le jugement"],
    voiceLines: ["Utilisez un ton de consultation chaleureux et fiable.", "Parlez comme une vraie lectrice, pas comme un rapport technique.", "Gardez le ton lunaire de Code Destiny sans peur ni exagération."],
    tarotSummary: (spreadName, categoryName) => `${spreadName} est prêt pour un prompt de consultation ${categoryName}.`,
    lenormandSummary: (spreadName) => `${spreadName} est prêt comme prompt Lenormand.`,
  },
  de: {
    tarotRole: "Du bist eine professionelle Tarotleserin und berätst eine echte Person.",
    lenormandRole: "Du bist eine professionelle Lenormand-Leserin und berätst eine echte Person.",
    outputLanguage: "Schreibe die finale Deutung in natürlichem Deutsch.",
    clientQuestion: "Frage der Person",
    spreadInfo: "Legungsinformationen",
    cards: "Karten",
    readingRules: "Leseregeln",
    outputFormat: "Ausgabeformat",
    voice: "Stimme",
    category: "Fragenkategorie",
    spreadName: (categoryName, count) => `${count}-Karten-Legung für ${categoryName}`,
    cardCount: (count) => `${count} Karten`,
    cardDigest: (index, cardName, cardCode, direction) => `${index}. ${cardName} (${cardCode}) - ${direction}`,
    lenormandDigest: (index, cardName, cardCode) => `${index}. ${cardName} (${cardCode})`,
    orientation: { upright: "aufrecht", reversed: "umgekehrt" },
    tarotGuidance: ["Lies die Karte in Bezug auf Frage und Reihenfolge, nicht als isoliertes Stichwort.", "Keine festen Vorhersagen zu Liebe, Geld, Gesundheit, Recht, Schwangerschaft oder Ergebnissen.", "Schließe mit realistischen Handlungen, die heute gewählt werden können."],
    lenormandGuidance: ["Lies benachbarte Karten wie einen Satzfluss.", "Nutze keine Tarot-Umkehrungen; lies Reihenfolge, Abstand und wiederholte Zeichen.", "Trenne aktuellen Verlauf, wiederholtes Muster und nächste praktische Handlung."],
    tarotOutput: ["1. Das wahre Thema hinter der Frage", "2. Der erste große Verlauf der Legung", "3. Karte-für-Karte-Deutung", "4. Spannungen und Harmonien zwischen den Karten", "5. Mögliche Illusion oder überhöhte Erwartung", "6. Zwei oder drei realistische Handlungen ab heute", "7. Ein letzter Satz, der das Herz ordnet"],
    lenormandOutput: ["1. Fragerahmen und jetzt zu prüfender Punkt", "2. Ein-Satz-Verlauf aus sechs Karten", "3. Lesung benachbarter Paare", "4. Wiederholte Zeichen und zu reduzierende Handlungen", "5. Zwei oder drei Handlungen zum Verstärken", "6. Ein letzter Satz zur Klärung"],
    voiceLines: ["Nutze einen warmen, vertrauenswürdigen Beratungston.", "Sprich wie eine echte Leserin, nicht wie ein technischer Bericht.", "Bewahre Code Destinys Mondlichtton ohne Angst oder Übertreibung."],
    tarotSummary: (spreadName, categoryName) => `${spreadName} ist für einen ${categoryName}-Beratungsprompt bereit.`,
    lenormandSummary: (spreadName) => `${spreadName} ist als Lenormand-Prompt bereit.`,
  },
  nl: {
    tarotRole: "Je bent een professionele tarotlezer die een echte cliënt adviseert.",
    lenormandRole: "Je bent een professionele Lenormand-lezer die een echte cliënt adviseert.",
    outputLanguage: "Schrijf de uiteindelijke reading in natuurlijk Nederlands.",
    clientQuestion: "Vraag van de cliënt",
    spreadInfo: "Spreadinformatie",
    cards: "Kaarten",
    readingRules: "Leesregels",
    outputFormat: "Uitvoerformaat",
    voice: "Stem",
    category: "Vraagcategorie",
    spreadName: (categoryName, count) => `${count}-kaart spread voor ${categoryName}`,
    cardCount: (count) => `${count} kaarten`,
    cardDigest: (index, cardName, cardCode, direction) => `${index}. ${cardName} (${cardCode}) - ${direction}`,
    lenormandDigest: (index, cardName, cardCode) => `${index}. ${cardName} (${cardCode})`,
    orientation: { upright: "rechtop", reversed: "omgekeerd" },
    tarotGuidance: ["Lees de kaart met de vraag en volgorde, niet als los sleutelwoord.", "Doe geen vaste voorspellingen over liefde, geld, gezondheid, recht, zwangerschap of uitslagen.", "Eindig met realistische acties die de cliënt vandaag kan kiezen."],
    lenormandGuidance: ["Lees naburige kaarten als een zinsstroom.", "Gebruik geen tarot-omkeringen; lees volgorde, afstand en herhaalde signalen.", "Scheid huidige stroom, herhaald patroon en volgende praktische actie."],
    tarotOutput: ["1. Het echte thema achter de vraag", "2. De eerste grote stroom in de spread", "3. Kaart-voor-kaart reading", "4. Spanningen en harmonie tussen kaarten", "5. Illusie of te hoge verwachting om op te letten", "6. Twee of drie realistische acties vanaf vandaag", "7. Een laatste zin die het hart ordent"],
    lenormandOutput: ["1. Vraagbereik en wat nu te controleren", "2. Eén-zinsstroom van de zes kaarten", "3. Readings van naburige paren", "4. Herhaalde signalen en acties om te verminderen", "5. Twee of drie acties om te versterken", "6. Een laatste zin om oordeel te ordenen"],
    voiceLines: ["Gebruik een warme, betrouwbare consulttoon.", "Spreek als een echte reader, niet als een technisch rapport.", "Behoud de maanlichte toon van Code Destiny zonder angst of overdrijving."],
    tarotSummary: (spreadName, categoryName) => `${spreadName} is klaar voor een ${categoryName}-consultprompt.`,
    lenormandSummary: (spreadName) => `${spreadName} is klaar als Lenormand-prompt.`,
  },
  ms: {
    tarotRole: "Anda ialah pembaca tarot profesional yang menasihati klien sebenar.",
    lenormandRole: "Anda ialah pembaca Lenormand profesional yang menasihati klien sebenar.",
    outputLanguage: "Tulis bacaan akhir dalam bahasa Melayu yang semula jadi.",
    clientQuestion: "Soalan klien",
    spreadInfo: "Maklumat spread",
    cards: "Kad",
    readingRules: "Peraturan bacaan",
    outputFormat: "Format output",
    voice: "Suara",
    category: "Kategori soalan",
    spreadName: (categoryName, count) => `spread ${count} kad untuk ${categoryName}`,
    cardCount: (count) => `${count} kad`,
    cardDigest: (index, cardName, cardCode, direction) => `${index}. ${cardName} (${cardCode}) - ${direction}`,
    lenormandDigest: (index, cardName, cardCode) => `${index}. ${cardName} (${cardCode})`,
    orientation: { upright: "tegak", reversed: "terbalik" },
    tarotGuidance: ["Baca kad bersama soalan dan susunan, bukan sebagai kata kunci terasing.", "Jangan buat ramalan tetap tentang cinta, wang, kesihatan, undang-undang, kehamilan atau keputusan.", "Akhiri dengan tindakan realistik yang boleh dipilih klien hari ini."],
    lenormandGuidance: ["Baca kad berjiran seperti aliran satu ayat.", "Jangan gunakan terbalik tarot; baca susunan, jarak dan isyarat berulang.", "Pisahkan aliran semasa, pola berulang dan tindakan praktikal seterusnya."],
    tarotOutput: ["1. Tema sebenar di sebalik soalan", "2. Aliran besar pertama dalam spread", "3. Bacaan setiap kad", "4. Ketegangan dan harmoni antara kad", "5. Ilusi atau harapan berlebihan yang perlu dijaga", "6. Dua atau tiga tindakan realistik mulai hari ini", "7. Satu ayat akhir yang menenangkan hati"],
    lenormandOutput: ["1. Ruang soalan dan perkara yang perlu diperiksa sekarang", "2. Aliran satu ayat daripada enam kad", "3. Bacaan pasangan kad berjiran", "4. Isyarat berulang dan tindakan yang perlu dikurangkan", "5. Dua atau tiga tindakan yang baik ditambah", "6. Satu ayat akhir untuk menyusun pertimbangan"],
    voiceLines: ["Gunakan nada konsultasi yang hangat dan dipercayai.", "Bercakap seperti reader sebenar, bukan laporan teknikal.", "Kekalkan nada cahaya bulan Code Destiny tanpa rasa takut atau keterlaluan."],
    tarotSummary: (spreadName, categoryName) => `${spreadName} sedia untuk prompt konsultasi ${categoryName}.`,
    lenormandSummary: (spreadName) => `${spreadName} sedia sebagai prompt Lenormand.`,
  },
};

function ensureText(value: string) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function toUnique(values: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  values.forEach((value) => {
    const normalized = ensureText(value);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    out.push(normalized);
  });
  return out;
}

function cardCodeParts(cardCode: string) {
  const normalized = String(cardCode || "").toUpperCase();
  const suitCode = normalized.slice(0, 1);
  const rankCode = normalized.slice(1, 3);
  return { normalized, suitCode, rankCode };
}

function toTextArray(value: unknown) {
  if (Array.isArray(value)) return value.map((item) => ensureText(String(item))).filter(Boolean);
  const text = ensureText(String(value || ""));
  return text ? [text] : [];
}

function resolveCardMeaning(card: DrawnTarotCard) {
  const source = CARD_MEANING_MAP.get(card.cardCode.toUpperCase());
  return source?.[card.orientation] || null;
}

function deriveCardMeaningClues(card: DrawnTarotCard, category: TarotSpread["category"]) {
  const meaning = resolveCardMeaning(card);
  if (!meaning) return [];
  return toUnique([
    ...toTextArray(meaning[category]).map((line) => `상황별 해석: ${line}`),
    ...toTextArray(meaning.core).map((line) => `핵심: ${line}`),
    ...toTextArray(meaning.shadow).map((line) => `그림자: ${line}`),
    ...toTextArray(meaning.shadowText).map((line) => `주의: ${line}`),
    ...toTextArray(meaning.advice).map((line) => `조언: ${line}`),
    ...toTextArray(meaning.adviceText).map((line) => `실행: ${line}`),
    ...toTextArray(meaning.boundaryPattern).map((line) => `경계 패턴: ${line}`),
    ...toTextArray(meaning.recoveryAdvice).map((line) => `회복 조언: ${line}`),
    ...toTextArray(meaning.caution).map((line) => `주의점: ${line}`),
  ]).slice(0, 6);
}

function deriveExpertKeywords(card: DrawnTarotCard, category: TarotSpread["category"]) {
  const { normalized, suitCode, rankCode } = cardCodeParts(card.cardCode);
  const orientationLens = card.orientation === "reversed"
    ? ["에너지 역전", "지연/과잉", "내면 갈등"]
    : ["자연 발현", "진행 신호", "행동 가능"];
  const majorLens = MAJOR_EXPERT_LENS[normalized] ? [MAJOR_EXPERT_LENS[normalized]] : [];
  const suitLens = SUIT_EXPERT_LENS[suitCode] ? [SUIT_EXPERT_LENS[suitCode]] : [];
  const rankLens = RANK_EXPERT_LENS[rankCode] ? [RANK_EXPERT_LENS[rankCode]] : [];
  return toUnique([
    ...card.keywords,
    card.focus,
    ...orientationLens,
    ...majorLens,
    ...suitLens,
    ...rankLens,
    ...deriveCardMeaningClues(card, category),
  ]).slice(0, 12);
}

function buildQuestionClarityGuide(question: string) {
  const text = ensureText(question);
  if (text.length < 12) return "질문이 짧으므로 대상, 현재 상황, 질문자가 원하는 결론을 해석 안에서 부드럽게 보완합니다.";
  if (text.length > 170) return "질문이 길기 때문에 사건의 핵심, 감정의 핵심, 실제로 알고 싶은 결론을 먼저 정리한 뒤 해석합니다.";
  if (!/(어떻게|무엇|뭐|왜|언제|가능성|마음|흐름|조언|선택|해야|될까|일까|할까|괜찮|가능|타이밍|결과|주의)/u.test(text)) {
    return "질문 방향이 넓으므로 카드 해석 전에 질문자가 확인하고 싶은 초점을 한 문장으로 좁힙니다.";
  }
  return "질문 초점이 충분하므로 카드와 포지션을 질문자의 실제 상황에 바로 연결합니다.";
}

function isSuitCode(value: string): value is SuitCode {
  return value === "W" || value === "C" || value === "S" || value === "P";
}

function cardLabel(card: DrawnTarotCard | null) {
  if (!card) return "해당 카드 없음";
  return `${card.positionLabel} 위치의 ${card.cardNameKo} ${card.orientationLabel}`;
}

function findCardByPosition(cards: DrawnTarotCard[], patterns: RegExp[]) {
  return cards.find((card) => {
    const text = `${card.positionLabel} ${card.positionDescription}`;
    return patterns.some((pattern) => pattern.test(text));
  }) || null;
}

function dominantTone(analysis: Omit<SpreadAnalysis, "tone" | "summaryLines" | "repeatedSuits">) {
  const scores: Record<string, number> = {
    "감정 중심": analysis.suitCounts.C,
    "갈등 중심": analysis.suitCounts.S,
    "현실 중심": analysis.suitCounts.P,
    "행동 중심": analysis.suitCounts.W,
    "전환점 중심": analysis.majorCount,
  };
  if (analysis.reversedCount >= Math.ceil(analysis.total / 2)) scores["내면 정체 중심"] = analysis.reversedCount;
  return Object.entries(scores).sort((a, b) => b[1] - a[1])[0]?.[0] || "균형 조율 중심";
}

function analyzeSpreadCards(cards: DrawnTarotCard[]): SpreadAnalysis {
  const suitCounts: Record<SuitCode, number> = { W: 0, C: 0, S: 0, P: 0 };
  let majorCount = 0;
  let courtCount = 0;
  let uprightCount = 0;
  let reversedCount = 0;

  cards.forEach((card) => {
    const { normalized, suitCode, rankCode } = cardCodeParts(card.cardCode);
    if (normalized.startsWith("M")) majorCount += 1;
    if (isSuitCode(suitCode)) suitCounts[suitCode] += 1;
    if (Number(rankCode) >= 11 && Number(rankCode) <= 14) courtCount += 1;
    if (card.orientation === "reversed") reversedCount += 1;
    else uprightCount += 1;
  });

  const repeatedSuits = (Object.keys(suitCounts) as SuitCode[])
    .filter((suit) => suitCounts[suit] >= 2)
    .map((suit) => `${SUIT_LABEL[suit]} ${suitCounts[suit]}장`);
  const base = {
    total: cards.length,
    majorCount,
    courtCount,
    suitCounts,
    uprightCount,
    reversedCount,
    firstCard: cards[0] || null,
    lastCard: cards[cards.length - 1] || null,
    adviceCard: findCardByPosition(cards, [/조언/, /최종/, /행동/, /태도/]),
    obstacleCard: findCardByPosition(cards, [/장애/, /위험/, /막는/, /두려움/, /병목/]),
    outcomeCard: findCardByPosition(cards, [/결과/, /미래/, /종합/, /가능성/]),
  };
  const tone = dominantTone(base);
  const summaryLines = [
    `총 ${cards.length}장 중 메이저 아르카나가 ${majorCount}장으로, 질문자가 통제하기 어려운 전환 흐름의 강도를 함께 봅니다.`,
    `슈트 비율은 완드 ${suitCounts.W}장, 컵 ${suitCounts.C}장, 소드 ${suitCounts.S}장, 펜타클 ${suitCounts.P}장입니다.`,
    `정방향 ${uprightCount}장, 역방향 ${reversedCount}장으로 흐름의 개방성과 지연/내면화 가능성을 비교합니다.`,
    `궁정 카드는 ${courtCount}장입니다. 인물, 태도, 관계 역학이 카드 배열에서 얼마나 크게 작동하는지 확인합니다.`,
    repeatedSuits.length ? `반복되는 슈트: ${repeatedSuits.join(", ")}.` : "반복되는 슈트가 강하지 않아 카드별 포지션 관계를 더 세밀하게 봅니다.",
    `전체 톤은 ${tone}으로 읽습니다.`,
    `첫 카드: ${cardLabel(base.firstCard)} / 마지막 카드: ${cardLabel(base.lastCard)}.`,
    `장애물 카드: ${cardLabel(base.obstacleCard)} / 조언 카드: ${cardLabel(base.adviceCard)} / 결과 카드: ${cardLabel(base.outcomeCard)}.`,
  ];

  return {
    ...base,
    repeatedSuits,
    tone,
    summaryLines,
  };
}

function reframeQuestion(question: string, category: TarotSpread["category"]) {
  const normalized = ensureText(question);
  if (normalized.length >= 12) {
    return `${normalized}라는 질문을 고객이 현재 무엇을 알고 싶고 어떤 태도를 선택해야 하는지 살피는 상담 질문으로 재정의합니다.`;
  }
  const fallback: Partial<Record<TarotSpread["category"], string>> = {
    love: "상대의 마음과 관계 흐름을 확인하되, 내 감정과 행동 기준을 함께 세우는 질문",
    reunion: "상대가 다시 움직일 가능성과 내가 어떤 태도로 기다리거나 움직이면 좋을지를 보는 질문",
    career: "지금 일의 부담과 새로운 기회의 현실성을 함께 비교하는 질문",
    money: "현재 돈의 흐름과 관리해야 할 위험요소를 현실적으로 점검하는 질문",
    choice: "두 선택지의 장단점과 내가 감당할 수 있는 기준을 확인하는 질문",
    self: "내 마음의 반복 패턴과 회복에 필요한 태도를 살피는 질문",
  };
  return fallback[category] || "짧거나 모호한 질문을 고객의 의도를 추정하되 확정하지 않고, 상담 가능한 형태로 부드럽게 넓힌 질문";
}

function relationshipSignals(cards: DrawnTarotCard[], analysis: SpreadAnalysis) {
  const lines = [
    `시작 카드와 마지막 카드의 흐름: ${cardLabel(analysis.firstCard)}에서 시작해 ${cardLabel(analysis.lastCard)}로 이어지므로, 첫 인상과 최종 조언의 온도 차이를 비교하세요.`,
  ];
  if (analysis.obstacleCard && analysis.adviceCard) {
    lines.push(`장애물과 조언의 관계: ${cardLabel(analysis.obstacleCard)}가 막는 지점을 ${cardLabel(analysis.adviceCard)}의 태도로 조절할 수 있는지 봅니다.`);
  }
  if (analysis.outcomeCard && analysis.adviceCard && analysis.outcomeCard !== analysis.adviceCard) {
    lines.push(`결과 위치와 조언 위치가 다르면 결과를 단정하지 말고, 조언을 따랐을 때 흐름이 어떻게 달라질 수 있는지 설명하세요.`);
  }
  if (analysis.suitCounts.C > 0 && analysis.suitCounts.P > 0) {
    lines.push("감정 카드와 현실 카드가 함께 있으므로 마음의 온도와 실제 조건의 균형을 반드시 함께 읽습니다.");
  }
  if (analysis.suitCounts.S >= 2) {
    lines.push("소드가 반복되면 말, 판단, 거리두기, 오해 가능성을 핵심 갈등 축으로 다룹니다.");
  }
  if (analysis.majorCount >= Math.ceil(cards.length / 2)) {
    lines.push("메이저 아르카나 비율이 높으면 고객이 즉시 통제하기 어려운 큰 전환 흐름을 인정하되, 오늘 선택할 수 있는 작은 행동으로 내려옵니다.");
  }
  return lines;
}

function lenormandCardLine(card: DrawnTarotCard | null) {
  if (!card) return "해당 카드 없음";
  return `${card.positionLabel}의 ${card.cardNameKo}`;
}

function buildLenormandPairLines(cards: DrawnTarotCard[]) {
  return cards.slice(0, -1).map((card, index) => {
    const next = cards[index + 1];
    return `${card.cardNameKo} + ${next.cardNameKo}: ${card.focus}에서 ${next.focus}로 이어지는 흐름을 한 문장처럼 읽습니다.`;
  });
}

function cardDisplayName(card: DrawnTarotCard) {
  return ensureText(card.cardNameEn) || ensureText(card.cardNameKo) || card.cardCode;
}

function buildLocalizedLenormandPrompt(spread: TarotSpread, question: string, drawnCards: DrawnTarotCard[], locale: Exclude<PromptBuilderLocale, "ko">): OraclePromptResult {
  const copy = LOCALIZED_PROMPT_BUILDER_COPY[locale] || LOCALIZED_PROMPT_BUILDER_COPY.en;
  const localized = getLocalizedPromptMakerData(locale);
  const categoryName = localized.categoryLabel[spread.category];
  const spreadName = copy.spreadName(categoryName, spread.cardCount);
  const effectiveQuestion = ensureText(question) || localized.defaultQuestionByCategory[spread.category];
  const cardDigest = drawnCards.map((card, index) => copy.lenormandDigest(index + 1, cardDisplayName(card), card.cardCode));
  const pairLines = drawnCards.slice(0, -1).map((card, index) => {
    const next = drawnCards[index + 1];
    return `${cardDisplayName(card)} + ${cardDisplayName(next)}`;
  });
  const guidance = copy.lenormandGuidance;
  const summary = copy.lenormandSummary(spreadName);
  const prompt = [
    copy.lenormandRole,
    copy.outputLanguage,
    "",
    `[${copy.clientQuestion}]`,
    effectiveQuestion,
    "",
    `[${copy.spreadInfo}]`,
    `${copy.category}: ${categoryName}`,
    `${copy.cardCount(spread.cardCount)}`,
    "",
    `[${copy.cards}]`,
    ...cardDigest,
    "",
    "[Pairs]",
    ...pairLines.map((line) => `- ${line}`),
    "",
    `[${copy.readingRules}]`,
    ...guidance.map((rule, index) => `${index + 1}. ${rule}`),
    "",
    `[${copy.outputFormat}]`,
    ...copy.lenormandOutput,
    "",
    `[${copy.voice}]`,
    ...copy.voiceLines,
  ].join("\n");
  return { prompt, summary, cardDigest, guidance, effectiveQuestion };
}

function buildLocalizedTarotPrompt(
  spread: TarotSpread,
  question: string,
  drawnCards: DrawnTarotCard[],
  options: OraclePromptOptions,
  locale: Exclude<PromptBuilderLocale, "ko">,
): OraclePromptResult {
  const questionCategory = options.questionCategory || spread.category;
  const copy = LOCALIZED_PROMPT_BUILDER_COPY[locale] || LOCALIZED_PROMPT_BUILDER_COPY.en;
  const localized = getLocalizedPromptMakerData(locale);
  const categoryName = localized.categoryLabel[questionCategory];
  const spreadName = copy.spreadName(categoryName, spread.cardCount);
  const effectiveQuestion = ensureText(question) || localized.defaultQuestionByCategory[questionCategory];
  const cardDigest = drawnCards.map((card, index) => copy.cardDigest(index + 1, cardDisplayName(card), card.cardCode, copy.orientation[card.orientation]));
  const guidance = copy.tarotGuidance;
  const summary = copy.tarotSummary(spreadName, categoryName);
  const prompt = [
    copy.tarotRole,
    copy.outputLanguage,
    "",
    `[${copy.clientQuestion}]`,
    effectiveQuestion,
    "",
    `[${copy.spreadInfo}]`,
    `${copy.category}: ${categoryName}`,
    `${copy.cardCount(spread.cardCount)}`,
    "",
    `[${copy.cards}]`,
    ...cardDigest,
    "",
    `[${copy.readingRules}]`,
    ...guidance.map((rule, index) => `${index + 1}. ${rule}`),
    "",
    `[${copy.outputFormat}]`,
    ...copy.tarotOutput,
    "",
    `[${copy.voice}]`,
    ...copy.voiceLines,
  ].join("\n");
  return { prompt, summary, cardDigest, guidance, effectiveQuestion };
}

export function buildLenormandPrompt(spread: TarotSpread, question: string, drawnCards: DrawnTarotCard[], localeRaw?: string | null): OraclePromptResult {
  const locale = normalizePromptBuilderLocale(localeRaw);
  if (locale !== "ko") return buildLocalizedLenormandPrompt(spread, question, drawnCards, locale);
  const effectiveQuestion = ensureText(question) || "지금 보고 싶은 상황에서 가장 먼저 확인해야 할 흐름과 행동 단서는 무엇일까?";
  const cardFlow = drawnCards.map((card) => `${card.positionLabel}의 ${card.cardNameKo}`).join(", ");
  const cardDigest = drawnCards.map((card, index) => [
    `${index + 1}. ${card.positionLabel} - ${card.positionDescription}`,
    `카드: ${card.cardNameKo}`,
    `핵심 단서: ${toUnique([...card.keywords, card.focus]).join(" | ")}`,
  ].join("\n"));
  const pairLines = buildLenormandPairLines(drawnCards);
  const guidance = [
    "레노먼드는 카드를 한 장씩 고립해 보기보다 인접 카드와 조합을 문장처럼 이어 읽습니다.",
    "타로식 역방향을 쓰지 않고 카드의 순서, 거리, 반복되는 신호를 기준으로 해석합니다.",
    "결과를 단정형 예언으로 고정하지 말고 현재 흐름, 반복 패턴, 다음 행동 후보로 나누어 읽습니다.",
    "질문, 현재 상황, 뽑는 시점을 한 문장으로 정리한 뒤 카드의 흐름을 연결합니다.",
    "좋고 나쁨을 판정하기보다 어떤 행동을 줄이거나 늘릴지 확인합니다.",
    "의료, 법률, 재무처럼 손실이 큰 결정은 이 리딩만으로 확정하지 말고 참고 자료로 표현합니다.",
  ];
  const summary = `${spread.title} 안에 ${cardFlow} 흐름이 놓였습니다. 6장의 인접 조합을 따라 현재 상황, 반복 신호, 행동 단서가 차례로 드러납니다.`;
  const prompt = [
    "당신은 실제 고객을 상담하는 전문 레노먼드 리더입니다.",
    "",
    "고객의 질문은 다음과 같습니다.",
    "",
    "[고객 질문]",
    effectiveQuestion,
    "",
    "질문을 적으면 그 주제에 맞는 프롬프트와 해석 흐름이 바로 열립니다.",
    "주제를 입력하고 6장 레노먼드 카드로 흐름과 행동 단서를 봅니다.",
    "",
    "[전통과 이야기]",
    "레노먼드는 19세기 프랑스의 점술가 마드무아젤 르노르망과 연결되어 널리 알려진 36장 카드 전통입니다.",
    "",
    "[입력 전 체크]",
    "질문, 현재 상황, 뽑는 시점을 한 문장으로 정리합니다. 레노먼드는 출생시간보다 질문의 초점과 산출된 카드 순서가 중요합니다.",
    "",
    "[사용한 배열]",
    `배열: ${spread.title}`,
    `카드 수: ${spread.cardCount}`,
    `배열 목적: ${spread.purpose}`,
    "",
    "[6장 레노먼드 카드]",
    ...cardDigest,
    "",
    "[인접 카드 조합]",
    ...pairLines.map((line) => `- ${line}`),
    "",
    "[전체 흐름 단서]",
    `- 첫 카드: ${lenormandCardLine(drawnCards[0] || null)}`,
    `- 중심 카드: ${lenormandCardLine(drawnCards[Math.floor(drawnCards.length / 2)] || null)}`,
    `- 마지막 카드: ${lenormandCardLine(drawnCards[drawnCards.length - 1] || null)}`,
    "",
    "[해석 기준]",
    ...guidance.map((rule, index) => `${index + 1}. ${rule}`),
    "",
    "[출력 형식]",
    "아래 순서로 실제 레노먼드 상담 결과를 작성하세요.",
    "",
    "1. 질문 범위와 지금 확인해야 할 포인트",
    "2. 6장이 이어 만드는 한 문장 흐름",
    "3. 인접 카드 조합별 해석",
    "4. 반복되는 신호와 줄여야 할 행동",
    "5. 늘리면 좋은 행동 단서 2~3가지",
    "6. 판단을 정리하는 마지막 한마디",
    "",
    "[목소리]",
    "문체는 전문적이고 신뢰감 있는 레노먼드 상담체로 작성하세요.",
    "카드 이름을 기계적으로 나열하지 말고, 인접 카드가 이어지는 문장을 따라 질문자의 현실에 닿게 말하세요.",
    "단정적인 예언보다 지금 드러난 흐름, 반복 패턴, 선택 가능한 행동을 선명하게 비추세요.",
  ].join("\n");

  return {
    prompt,
    summary,
    cardDigest,
    guidance,
    effectiveQuestion,
  };
}

export function buildOraclePrompt(spread: TarotSpread, question: string, drawnCards: DrawnTarotCard[], options: OraclePromptOptions = {}): OraclePromptResult {
  const locale = normalizePromptBuilderLocale(options.locale);
  if (locale !== "ko") return buildLocalizedTarotPrompt(spread, question, drawnCards, options, locale);
  const questionCategory = options.questionCategory || spread.category;
  const effectiveQuestion = ensureText(question) || DEFAULT_QUESTION_BY_CATEGORY[questionCategory];
  const analysis = analyzeSpreadCards(drawnCards);
  const categoryFocus = CATEGORY_FOCUS[questionCategory];
  const categoryExpressionGuide = CATEGORY_EXPRESSION_GUIDE[questionCategory];
  const categorySafetyGuide = CATEGORY_SAFETY_GUIDE[questionCategory] || [];
  const reframedQuestion = reframeQuestion(effectiveQuestion, questionCategory);
  const questionClarityGuide = buildQuestionClarityGuide(effectiveQuestion);
  const cardFlow = drawnCards.map((card) => `${card.positionLabel}의 ${card.cardNameKo} ${card.orientationLabel}`).join(", ");
  const cardDigest = drawnCards.map((card, index) => {
    const expertKeywords = deriveExpertKeywords(card, questionCategory);
    return [
      `${index + 1}. ${card.positionLabel} - ${card.positionDescription}`,
      `카드: ${card.cardNameKo}`,
      `방향: ${card.orientationLabel}`,
      `상담 단서: ${expertKeywords.join(" | ")}`,
    ].join("\n");
  });
  const guidance = [
    "카드의 일반적인 의미보다 해당 카드가 놓인 위치의 의미를 우선합니다.",
    "포지션의 역할, 카드 방향, 카드별 상황 해석 단서를 한 문장 안에서 함께 엮습니다.",
    "각 카드를 따로 설명하는 데서 끝내지 말고 전체 배열의 흐름을 하나의 상담 이야기로 연결합니다.",
    "메이저 아르카나 비율, 슈트 반복, 정방향/역방향 비율, 숫자 흐름, 궁정 카드 여부를 종합합니다.",
    "현재 위치, 장애물 위치, 숨은 원인 위치, 조언 위치, 결과 위치의 관계를 비교합니다.",
    "연애 질문은 상대 마음을 단정하지 말고 카드가 보여주는 정서적 가능성과 관계 흐름으로 설명합니다.",
    "직업/금전 질문은 현실 조건, 리스크, 준비도, 실행 타이밍을 함께 설명합니다.",
    "연애운과 미래 흐름은 확정 미래가 아니라 현재 패턴과 선택에 따라 달라질 수 있는 가능성으로 설명합니다.",
    "고객에게 공포를 주거나 운명을 단정하지 않습니다.",
    "법률, 의료, 투자, 생명·사망, 임신, 합격 여부 등은 확정적으로 말하지 말고 참고용 조언으로만 표현합니다.",
    `다음 단정 표현을 피합니다: ${FORBIDDEN_PHRASES.join(", ")}.`,
    "마지막에는 고객이 오늘부터 실제로 할 수 있는 행동 조언을 2~3개 제시합니다.",
    ...categorySafetyGuide,
  ];
  const summary = `${spread.title} 위에 ${cardFlow} 흐름이 놓였습니다. 이 전문가 상담 프롬프트는 ${CATEGORY_LABEL[questionCategory]} 질문을 포지션 의미, 카드 방향, 카드 간 관계, 안전 표현 기준까지 묶어 실제 상담 원고로 펼칩니다.`;
  const relationLines = relationshipSignals(drawnCards, analysis);

  const prompt = [
    "당신은 실제 고객을 상담하는 전문 타로 리더입니다.",
    "",
    "고객의 질문은 다음과 같습니다.",
    "",
    "[고객 질문]",
    effectiveQuestion,
    "",
    "이 질문은 단순히 카드 뜻을 설명하는 것이 아니라, 고객이 현재 어떤 상황에서 무엇을 알고 싶어 하는지 파악한 뒤 상담하듯이 해석해야 합니다.",
    "",
    "먼저 고객의 질문을 상담 가능한 형태로 재정의하세요.",
    "질문이 짧거나 모호하다면, 고객의 의도를 추정하되 확정하지 말고 부드럽게 표현하세요.",
    "",
    "[질문 재정의]",
    reframedQuestion,
    "",
    "[질문 카테고리]",
    CATEGORY_LABEL[questionCategory],
    "",
    "[질문 선명도 보정]",
    questionClarityGuide,
    "",
    "[상담 초점]",
    ...categoryFocus.map((focus) => `- ${focus}`),
    "",
    "[카테고리 표현 기준]",
    categoryExpressionGuide,
    "",
    ...(categorySafetyGuide.length ? [
      "[민감 질문 안전 기준]",
      ...categorySafetyGuide.map((rule) => `- ${rule}`),
      "",
    ] : []),
    "[상담 프로토콜]",
    ...CONSULTATION_PROTOCOL.map((rule, index) => `${index + 1}. ${rule}`),
    "",
    "[완성도 점검]",
    ...PROMPT_COMPLETION_CHECKLIST.map((rule, index) => `${index + 1}. ${rule}`),
    "",
    "[사용한 배열]",
    `스프레드: ${spread.title}`,
    `스프레드 원래 분류: ${CATEGORY_LABEL[spread.category]}`,
    `질문 상담 카테고리: ${CATEGORY_LABEL[questionCategory]}`,
    `카드 수: ${spread.cardCount}`,
    `배열 목적: ${spread.purpose}`,
    "",
    "[배열 위치와 카드]",
    ...cardDigest,
    "",
    "[배열 요약]",
    ...analysis.summaryLines.map((line) => `- ${line}`),
    "",
    "[카드 간 관계 단서]",
    ...relationLines.map((line) => `- ${line}`),
    "",
    "[방향 해석 기준]",
    `- ${ORIENTATION_MEANING.upright}`,
    `- ${ORIENTATION_MEANING.reversed}`,
    "",
    "[해석 원칙]",
    ...guidance.map((rule, index) => `${index + 1}. ${rule}`),
    "",
    "[출력 형식]",
    "아래 순서로 실제 상담 결과를 작성하세요.",
    "",
    "1. 질문자가 지금 묻고 있는 진짜 주제",
    "2. 스프레드 전체에서 먼저 보이는 큰 흐름",
    "3. 포지션별 카드 해석",
    "4. 카드들이 서로 만드는 긴장과 조화",
    "5. 질문자가 조심해야 할 착각 또는 과잉 기대",
    "6. 오늘부터 가능한 현실 행동 2~3가지",
    "7. 마음을 정리하는 마지막 한마디",
    "",
    "[목소리]",
    "문체는 따뜻하고 신뢰감 있는 상담체로 작성하세요.",
    "단순한 해설문이 아니라 질문자가 실제로 상담을 받은 느낌이 들도록, 불안을 낮추고 판단 기준을 선명하게 제시하세요.",
    "카드 이름을 기계적으로 나열하지 말고, 실제 타로 상담사가 고객 앞에서 설명하듯 자연스럽게 말하세요.",
    "달빛과 별빛 같은 Code:Destiny의 섬세한 톤은 유지하되, 과장되거나 공포를 주는 표현은 피하세요.",
  ].join("\n");

  return {
    prompt,
    summary,
    cardDigest,
    guidance,
    effectiveQuestion,
  };
}
