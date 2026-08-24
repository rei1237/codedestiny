// 무료 초안 패널의 로케일 카피 — 후보 설명(note)·안내문(status)·분위기 칩(moods).
//
// 🔴 이것은 ① 사전 스윕이 못 잡는 층이다. 사전(public/i18n/**/shellRuntime.json)은 텍스트 노드를
//    통째로 치환하는 역인덱스라, 여기처럼 **런타임에 보간·조립되는 문자열**은 잡지 못한다.
//    (docs/handoff/locale-service-optimization-2026-08-25.md 의 세 층 표 ② 계층)
//
// 🔴 범위는 en·ja·zh-CN·zh-TW 네 개다(사용자 결정, 2026-08-25) — resultCopy.ts 와 같은 관행.
//    ko 는 여기 없다: 한국어 사용자는 기존 한글 조합 경로를 그대로 타고, 그 경로의 문구는
//    namingRecommendations.ts 안에 한국어로 박혀 있다. 옮기면 골든 동작이 흔들린다.
//    나머지 일곱(vi·hi·es·fr·de·nl·ms)은 영어로 폴백한다.

import type { ElementKey } from "./namingRecommendations";
import type { LoadingLocale } from "@/constants/loadingMessages";

export type NamingDraftCopy = {
  genderM: string;
  genderF: string;
  /** 남녀 공용으로 쓰이는 이름이라는 표시. */
  genderNeutral: string;
  elementLabels: Record<ElementKey, string>;
  /** 후보 설명의 "이 오행을 보완한다" 조각. */
  supplements: (labels: string) => string;
  /** 읽는 법 조각 — 라틴권은 표기가 곧 읽는 법이라 빈 문자열이다. */
  reading: (value: string) => string;
  noteFallback: string;
  pinnedNote: string;
  currentNameNote: string;
  statusWithElements: (labels: string) => string;
  statusAvoid: (labels: string) => string;
  statusGender: (genderLabel: string) => string;
  statusNoElements: string;
  /** 이 초안이 조합이 아니라 실재 이름 목록에서 왔다는 고지. */
  statusPoolScope: string;
  statusPinnedNotice: string;
  /** 라틴권 — 이름에 "글자 수" 개념이 없어 그 조건을 적용하지 않았다는 고지. */
  statusLengthNotApplicable: string;
  /** CJK — 요청한 글자 수의 후보가 목록에 없어 다른 길이도 함께 보여준다는 고지. */
  statusLengthRelaxed: (count: number) => string;
  statusGenderPrompt: string;
  statusComputing: string;
  statusNeedBirthDate: string;
  statusReference: string;
  moodsByElement: Record<ElementKey, string[]>;
  moodsGeneral: string[];
};

const DRAFT_EN: NamingDraftCopy = {
  genderM: "Boy",
  genderF: "Girl",
  genderNeutral: "Used for either",
  elementLabels: {
    wood: "Wood (木)",
    fire: "Fire (火)",
    earth: "Earth (土)",
    metal: "Metal (金)",
    water: "Water (水)",
  },
  supplements: (labels) => `supplies ${labels}`,
  reading: () => "",
  noteFallback: "Draft based on what you entered",
  pinnedNote: "The name you wrote, kept as is",
  currentNameNote: "A second look at the name you are considering",
  statusWithElements: (labels) =>
    `We read the chart for its favourable element, took ${labels} as the axis to supply, and picked names whose meaning carries it.`,
  statusAvoid: (labels) => `Names leaning towards ${labels} were left out.`,
  statusGender: (genderLabel) => `Picked for a ${genderLabel.toLowerCase()}, against the family name and the feel you asked for.`,
  statusNoElements: "We started from the family name and the feel you asked for.",
  statusPoolScope:
    "These drafts are chosen from names that are actually in use — they are not assembled syllable by syllable.",
  statusPinnedNotice: "We kept the name you wrote as the first candidate and picked variations around it.",
  statusLengthNotApplicable:
    "Names in this language are not counted in characters, so the name-length setting was not applied here.",
  statusLengthRelaxed: (count) =>
    `We had no candidate of exactly ${count} character(s) in the list, so names of other lengths are shown too.`,
  statusGenderPrompt: "Choose a gender and we will pick again from the names used for it.",
  statusComputing: "Reading the chart for its favourable element. The drafts will change once the axis is in.",
  statusNeedBirthDate: "Add a birth date and we will read the chart to set the element axis.",
  statusReference: "These drafts are for reference; the paid booklet works the question through again.",
  moodsByElement: {
    wood: ["green and growing", "fresh, spring-like", "open and upward"],
    fire: ["bright and warm", "sunlit", "full of energy"],
    earth: ["steady and grounded", "warm and reliable", "centred"],
    metal: ["clean and precise", "clear-cut", "quietly sharp"],
    water: ["calm and deep", "flowing, soft", "still and clear"],
  },
  moodsGeneral: ["clear and understated", "warm and kind", "modern and simple"],
};

const DRAFT_JA: NamingDraftCopy = {
  genderM: "男の子",
  genderF: "女の子",
  genderNeutral: "男女どちらにも",
  elementLabels: { wood: "木", fire: "火", earth: "土", metal: "金", water: "水" },
  supplements: (labels) => `${labels}を補う`,
  reading: (value) => `よみ ${value}`,
  noteFallback: "入力条件からの初案",
  pinnedNote: "ご記入いただいた名前をそのまま",
  currentNameNote: "いま考えている名前を中心にもう一度",
  statusWithElements: (labels) =>
    `四柱から用神を割り出して補う軸を${labels}に定め、その意味を持つ名前を選びました。`,
  statusAvoid: (labels) => `${labels}に傾く名前は外しています。`,
  statusGender: (genderLabel) => `${genderLabel}を前提に、姓とご希望の雰囲気に合わせて選びました。`,
  statusNoElements: "姓とご希望の雰囲気を手がかりに初案を選びました。",
  statusPoolScope: "この初案は実際に使われている名前の中から選んでいます。音を組み合わせて作ったものではありません。",
  statusPinnedNotice: "ご記入いただいた名前を最初の候補に置き、その字を活かした案を続けています。",
  statusLengthNotApplicable: "この言語の名前は字数で数えないため、名前の字数の設定は適用していません。",
  statusLengthRelaxed: (count) => `${count}字ちょうどの候補が一覧になかったため、ほかの字数の名前も並べています。`,
  statusGenderPrompt: "性別を選ぶと、その性別で使われる名前から選び直します。",
  statusComputing: "四柱の用神を計算しています。まもなく五行の軸を反映した候補に変わります。",
  statusNeedBirthDate: "生年月日を入れると四柱の用神を計算して五行の軸を合わせます。",
  statusReference: "初案は参考用です。最終的な判断は有料の作名帖でもう一度整理します。",
  moodsByElement: {
    wood: ["みずみずしい緑", "春めいた軽さ", "まっすぐ伸びる印象"],
    fire: ["あたたかな明るさ", "陽だまりの温度", "はなやかな元気"],
    earth: ["どっしりした安定感", "ぬくもりのある落ち着き", "中心のある雰囲気"],
    metal: ["洗練された澄みかた", "きりっとした輪郭", "静かな鋭さ"],
    water: ["月あかりのような静けさ", "水のようなやわらかさ", "深く澄んだ印象"],
  },
  moodsGeneral: ["清らかで端正な結", "やさしく親しみのある結", "現代的で洗練された結"],
};

const DRAFT_ZH_CN: NamingDraftCopy = {
  genderM: "男孩",
  genderF: "女孩",
  genderNeutral: "男女通用",
  elementLabels: { wood: "木", fire: "火", earth: "土", metal: "金", water: "水" },
  supplements: (labels) => `补${labels}`,
  reading: (value) => `拼音 ${value}`,
  noteFallback: "依你填写的条件所拟初稿",
  pinnedNote: "你写下的名字，原样保留",
  currentNameNote: "以你正在考虑的名字为中心再看一次",
  statusWithElements: (labels) => `我们先算出八字用神，把要补的轴定在${labels}，再挑字义能承接它的名字。`,
  statusAvoid: (labels) => `偏向${labels}的名字已经避开。`,
  statusGender: (genderLabel) => `按${genderLabel}来选，并配合姓氏与你想要的气质。`,
  statusNoElements: "先从姓氏与你想要的气质入手拟了初稿。",
  statusPoolScope: "这些初稿是从实际在用的名字里挑的，并非把字随意拼起来。",
  statusPinnedNotice: "把你写下的名字放在第一位，再围绕那个字挑了几个变化。",
  statusLengthNotApplicable: "这个语言的名字不按字数计，因此名字字数的设定未予套用。",
  statusLengthRelaxed: (count) => `名单里没有正好${count}个字的候选，因此一并列出其他字数的名字。`,
  statusGenderPrompt: "选择性别后，会从该性别常用的名字中重新挑选。",
  statusComputing: "正在计算八字用神，稍后会换成已反映五行轴的候选。",
  statusNeedBirthDate: "填入出生日期后，我们会算出八字用神来对齐五行轴。",
  statusReference: "初稿仅供参考，最终判断由付费取名册再梳理一次。",
  moodsByElement: {
    wood: ["清新的草木气", "春意的轻盈", "向上舒展的样子"],
    fire: ["明亮而温暖", "阳光落下的温度", "鲜明的活力"],
    earth: ["扎实的安定感", "温厚可靠", "有重心的气质"],
    metal: ["清透而利落", "轮廓分明", "安静的锋利"],
    water: ["月色般的安静", "如水的柔和", "深而清澈的印象"],
  },
  moodsGeneral: ["清朗端正", "温柔亲切", "现代而简净"],
};

const DRAFT_ZH_TW: NamingDraftCopy = {
  genderM: "男孩",
  genderF: "女孩",
  genderNeutral: "男女通用",
  elementLabels: { wood: "木", fire: "火", earth: "土", metal: "金", water: "水" },
  supplements: (labels) => `補${labels}`,
  reading: (value) => `拼音 ${value}`,
  noteFallback: "依你填寫的條件所擬初稿",
  pinnedNote: "你寫下的名字，原樣保留",
  currentNameNote: "以你正在考慮的名字為中心再看一次",
  statusWithElements: (labels) => `我們先算出八字用神，把要補的軸定在${labels}，再挑字義能承接它的名字。`,
  statusAvoid: (labels) => `偏向${labels}的名字已經避開。`,
  statusGender: (genderLabel) => `按${genderLabel}來選，並配合姓氏與你想要的氣質。`,
  statusNoElements: "先從姓氏與你想要的氣質入手擬了初稿。",
  statusPoolScope: "這些初稿是從實際在用的名字裡挑的，並非把字隨意拼起來。",
  statusPinnedNotice: "把你寫下的名字放在第一位，再圍繞那個字挑了幾個變化。",
  statusLengthNotApplicable: "這個語言的名字不按字數計，因此名字字數的設定未予套用。",
  statusLengthRelaxed: (count) => `名單裡沒有正好${count}個字的候選，因此一併列出其他字數的名字。`,
  statusGenderPrompt: "選擇性別後，會從該性別常用的名字中重新挑選。",
  statusComputing: "正在計算八字用神，稍後會換成已反映五行軸的候選。",
  statusNeedBirthDate: "填入出生日期後，我們會算出八字用神來對齊五行軸。",
  statusReference: "初稿僅供參考，最終判斷由付費取名冊再梳理一次。",
  moodsByElement: {
    wood: ["清新的草木氣", "春意的輕盈", "向上舒展的樣子"],
    fire: ["明亮而溫暖", "陽光落下的溫度", "鮮明的活力"],
    earth: ["扎實的安定感", "溫厚可靠", "有重心的氣質"],
    metal: ["清透而俐落", "輪廓分明", "安靜的鋒利"],
    water: ["月色般的安靜", "如水的柔和", "深而清澈的印象"],
  },
  moodsGeneral: ["清朗端正", "溫柔親切", "現代而簡淨"],
};

/** 🔴 en·ja·zh-CN·zh-TW 만 채운다. 나머지 일곱은 영어로 폴백(사용자 결정, 2026-08-25). */
const NAMING_DRAFT_COPY: Partial<Record<LoadingLocale, NamingDraftCopy>> = {
  en: DRAFT_EN,
  ja: DRAFT_JA,
  "zh-CN": DRAFT_ZH_CN,
  "zh-TW": DRAFT_ZH_TW,
};

export function getNamingDraftCopy(locale: LoadingLocale | string): NamingDraftCopy {
  return NAMING_DRAFT_COPY[locale as LoadingLocale] || DRAFT_EN;
}

export { DRAFT_EN as NAMING_DRAFT_COPY_EN, NAMING_DRAFT_COPY };
