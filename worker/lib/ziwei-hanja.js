// 자미두수 용어 한자 병기 — 서버 확정본.
//
// 왜 모델에게 안 맡기는가: buildFirstPrompt 의 규칙에 "빈 괄호 '( )' 를 절대 출력하지 마라"를
// 두 번(규칙 0, 규칙 14) 못 박았는데도 운영 화면에 `천이궁( ) 거문( ) 화록( )` 이 그대로 나왔다.
// 프롬프트 지시로는 못 고치는 실패였다 — 시간 예산에 쫓겨 폴백 모델이 답을 쓰면 한자를 비우고,
// 한자를 쓰더라도 틀린 글자를 넣을 여지가 남는다. 용어 집합이 고정(12궁·14주성·사화·보좌살성)이므로
// 서버가 결정론적으로 붙이는 편이 정확하고 프롬프트 토큰도 아낀다.
//
// 프롬프트 쪽은 "한자를 쓰지 말고 한글 용어로만 서술하라"로 바뀌었다. 여기가 유일한 병기 지점이다.

// 12궁 + 신궁. 궁 이름은 chart.palaces[].name 과 같은 표기를 쓴다.
const PALACE_HANJA = Object.freeze({
  명궁: "命宮",
  형제궁: "兄弟宮",
  부부궁: "夫妻宮",
  자녀궁: "子女宮",
  재백궁: "財帛宮",
  질액궁: "疾厄宮",
  천이궁: "遷移宮",
  노복궁: "奴僕宮",
  교우궁: "交友宮",
  관록궁: "官祿宮",
  전택궁: "田宅宮",
  복덕궁: "福德宮",
  부모궁: "父母宮",
  신궁: "身宮",
});

// 14주성. ziwei-ai-chart.js 의 MAIN_STARS 와 같은 표기.
const MAIN_STAR_HANJA = Object.freeze({
  자미: "紫微",
  천기: "天機",
  태양: "太陽",
  무곡: "武曲",
  천동: "天同",
  염정: "廉貞",
  천부: "天府",
  태음: "太陰",
  탐랑: "貪狼",
  거문: "巨門",
  천상: "天相",
  천량: "天梁",
  칠살: "七殺",
  파군: "破軍",
});

// 보좌성·살성. ziwei-ai-chart.js 의 ASSISTANT_STARS / MALEFIC_STARS 와 같은 표기.
const MINOR_STAR_HANJA = Object.freeze({
  문창: "文昌",
  문곡: "文曲",
  좌보: "左輔",
  우필: "右弼",
  천괴: "天魁",
  천월: "天鉞",
  녹존: "祿存",
  천마: "天馬",
  함지: "咸池",
  천요: "天姚",
  경양: "擎羊",
  타라: "陀羅",
  화성: "火星",
  영성: "鈴星",
  지공: "地空",
  지겁: "地劫",
});

// 사화. 화기(化忌)는 흉의만 남지 않도록 본문에서 대처법과 함께 다뤄진다.
const SIHUA_HANJA = Object.freeze({
  화록: "化祿",
  화권: "化權",
  화과: "化科",
  화기: "化忌",
});

// 상담문에 반복해서 나오는 전문 용어.
const TERM_HANJA = Object.freeze({
  자미두수: "紫微斗數",
  삼방사정: "三方四正",
  대궁: "對宮",
  대한: "大限",
  세운: "歲運",
  유년: "流年",
  공궁: "空宮",
  명주: "命主",
  신주: "身主",
  오행국: "五行局",
  회조: "會照",
  자화: "自化",
});

export const ZIWEI_HANJA = Object.freeze({
  ...PALACE_HANJA,
  ...MAIN_STAR_HANJA,
  ...MINOR_STAR_HANJA,
  ...SIHUA_HANJA,
  ...TERM_HANJA,
});

// 긴 용어를 앞에 둔 교대(alternation). 정규식 교대는 왼쪽부터 시도하므로 이 정렬이 곧 최장 매칭이 되고,
// replace 는 매칭 구간을 건너뛰며 진행하므로 이미 병기한 용어의 앞부분이 다시 잡히지 않는다.
// (`자미두수(紫微斗數)` 를 만든 뒤 그 앞의 `자미` 를 다시 잡아 `자미(紫微)두수(紫微斗數)` 가 되던 문제)
// 용어가 전부 한글이라 정규식 특수문자 이스케이프는 필요 없다.
const TERM_PATTERN = new RegExp(
  Object.keys(ZIWEI_HANJA).sort((a, b) => b.length - a.length).join("|"),
  "g",
);

const EMPTY_PAREN_PATTERN = /[（(][\s　]*[）)]/g;

/**
 * 모델이 남긴 빈 괄호를 지운다. 앞 공백까지 함께 정리해 `거문 :` 같은 잔재가 남지 않게 한다.
 * 이미 DB에 저장된 과거 상담의 재열람 경로에도 적용해야 화면에서 사라진다.
 */
export function stripEmptyParens(text) {
  if (!text) return "";
  return String(text).replace(EMPTY_PAREN_PATTERN, "").replace(/[ 　]+([,.:;、·])/g, "$1");
}

/**
 * 용어의 첫 등장 1회에만 한자를 병기한다. `seen` 을 넘기면 여러 섹션에 걸쳐 1회를 보장한다.
 * 이미 뒤에 괄호가 열려 있으면(사람이 쓴 병기, 강약 표기 `최상(◎)` 등) 건드리지 않는다.
 */
export function annotateZiweiHanja(text, seen = new Set()) {
  if (!text) return "";
  return String(text).replace(TERM_PATTERN, (term, offset, whole) => {
    if (seen.has(term)) return term;
    seen.add(term);
    // 뒤가 곧바로 괄호면 이미 무언가 병기·표기된 자리다(강약 표기 `최상(◎)` 포함). 중복으로 열지 않는다.
    const tail = whole[offset + term.length];
    if (tail === "(" || tail === "（") return term;
    return `${term}(${ZIWEI_HANJA[term]})`;
  });
}

/**
 * 구조화 상담 JSON 문자열(= {meta, sections}) 전체에 빈 괄호 제거 + 한자 병기를 적용한다.
 * 섹션 순서를 그대로 따라가며 하나의 `seen` 을 공유하므로, 각 용어는 상담 전체에서 딱 한 번 병기된다.
 * 파싱에 실패하면(폴백 모델의 프로즈 응답 등) 빈 괄호 제거만 하고 원문 형태를 유지한다.
 */
export function applyZiweiHanjaToStructuredText(text) {
  const source = String(text || "");
  if (!source) return source;

  let parsed = null;
  try {
    parsed = JSON.parse(source);
  } catch {
    parsed = null;
  }
  if (!parsed || typeof parsed !== "object" || !parsed.sections || typeof parsed.sections !== "object") {
    return stripEmptyParens(source);
  }

  const seen = new Set();
  for (const section of Object.values(parsed.sections)) {
    if (!section || typeof section !== "object") continue;
    if (typeof section.title === "string") section.title = stripEmptyParens(section.title);
    if (typeof section.body === "string") {
      section.body = annotateZiweiHanja(stripEmptyParens(section.body), seen);
    }
  }
  return JSON.stringify(parsed, null, 2);
}
