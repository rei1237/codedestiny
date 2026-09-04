import { getCurrentLoadingLocale, normalizeLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";

export type MeihuaMode = "basic" | "target" | "compatibility";

export type GuaElement = "목" | "화" | "토" | "금" | "수";

export type GuaInfo = {
  number: number;
  short: string;
  name: string;
  element: GuaElement;
  symbols: string;
  lines: [boolean, boolean, boolean];
};

export type MeihuaCalcResult = {
  mode: MeihuaMode;
  modeLabel: string;
  question: string;
  baseDateTime: string;
  name?: string;
  gender?: string;
  birthDate?: string;
  birthTime?: string;
  calendarType?: string;
  targetDate?: string;
  targetTime?: string;
  targetPurpose?: string;
  personAName?: string;
  personABirthDate?: string;
  personABirthTime?: string;
  personAGua?: GuaInfo;
  personBName?: string;
  personBBirthDate?: string;
  personBBirthTime?: string;
  personBGua?: GuaInfo;
  relationshipType?: string;
  personElementRelation?: string;
  upperGua: GuaInfo;
  lowerGua: GuaInfo;
  mainHexagramName: string;
  mutualHexagramName: string;
  changingLine: number;
  changedHexagramName: string;
  bodyGua: GuaInfo;
  useGua: GuaInfo;
  bodyUseRelation: string;
  coreSummary: string;
};

type MeihuaCalcCopy = {
  modeBasicLabel: string;
  modeBasicDescription: string;
  modeTargetLabel: string;
  modeTargetDescription: string;
  modeCompatibilityLabel: string;
  modeCompatibilityDescription: string;
};

type MeihuaCalcTextKey = keyof MeihuaCalcCopy;

const MEIHUA_CALC_TEXT_TRANSLATIONS: Partial<Record<LoadingLocale, MeihuaCalcCopy>> = {
  ko: {
    modeBasicLabel: "매화역수 기본 해석",
    modeBasicDescription: "생년월일 기반으로 매화역수 기본 해석을 제공합니다.",
    modeTargetLabel: "매화역수 지정일 해석",
    modeTargetDescription: "출생 정보와 지정일을 비교해 흐름을 해석합니다.",
    modeCompatibilityLabel: "매화역수 궁합 해석",
    modeCompatibilityDescription: "두 사람의 흐름과 조화를 매화역수로 비교합니다.",
  },
  en: {
    modeBasicLabel: "Meihua Yishu Basic Reading",
    modeBasicDescription: "Provide a basic Meihua Yishu reading from the birth date.",
    modeTargetLabel: "Meihua Yishu Target-Date Reading",
    modeTargetDescription: "Compare birth details with a selected date to read the flow.",
    modeCompatibilityLabel: "Meihua Yishu Compatibility",
    modeCompatibilityDescription: "Compare two people's flow and harmony through Meihua Yishu.",
  },
  ja: {
    modeBasicLabel: "梅花易数 基本解釈",
    modeBasicDescription: "生年月日をもとに梅花易数の基本解釈を行います。",
    modeTargetLabel: "梅花易数 指定日解釈",
    modeTargetDescription: "出生情報と指定日を比較し、流れを読み解きます。",
    modeCompatibilityLabel: "梅花易数 相性解釈",
    modeCompatibilityDescription: "二人の流れと調和を梅花易数で比較します。",
  },
  "zh-CN": {
    modeBasicLabel: "梅花易数基础解读",
    modeBasicDescription: "根据出生日期提供梅花易数基础解读。",
    modeTargetLabel: "梅花易数指定日解读",
    modeTargetDescription: "比较出生信息与指定日期，解读其流向。",
    modeCompatibilityLabel: "梅花易数合盘解读",
    modeCompatibilityDescription: "以梅花易数比较两个人的流向与和谐度。",
  },
  "zh-TW": {
    modeBasicLabel: "梅花易數基礎解讀",
    modeBasicDescription: "根據出生日期提供梅花易數基礎解讀。",
    modeTargetLabel: "梅花易數指定日解讀",
    modeTargetDescription: "比較出生資訊與指定日期，解讀其流向。",
    modeCompatibilityLabel: "梅花易數合盤解讀",
    modeCompatibilityDescription: "以梅花易數比較兩個人的流向與和諧度。",
  },
};

function meihuaCalcText(key: MeihuaCalcTextKey, locale?: LoadingLocale | string | null) {
  const activeLocale = locale ? normalizeLoadingLocale(locale) : getCurrentLoadingLocale();
  return MEIHUA_CALC_TEXT_TRANSLATIONS[activeLocale]?.[key]
    ?? MEIHUA_CALC_TEXT_TRANSLATIONS.en?.[key]
    ?? MEIHUA_CALC_TEXT_TRANSLATIONS.ko![key];
}

export function getMeihuaModes(locale?: LoadingLocale | string | null) {
  return [
    { id: "basic" as const, label: meihuaCalcText("modeBasicLabel", locale), description: meihuaCalcText("modeBasicDescription", locale) },
    { id: "target" as const, label: meihuaCalcText("modeTargetLabel", locale), description: meihuaCalcText("modeTargetDescription", locale) },
    { id: "compatibility" as const, label: meihuaCalcText("modeCompatibilityLabel", locale), description: meihuaCalcText("modeCompatibilityDescription", locale) },
  ];
}

export const MEIHUA_MODES = getMeihuaModes();

export const TARGET_PURPOSES = ["계약", "이사", "창업", "고백", "시험", "발표", "여행", "병원 방문", "중요한 만남", "기타"];

export const RELATIONSHIP_TYPES = ["연애", "결혼", "썸", "재회", "친구", "가족", "사업 파트너", "직장 관계", "기타"];

export const GUA_BY_NUMBER: Record<number, GuaInfo> = {
  1: { number: 1, short: "건", name: "건乾", element: "금", symbols: "하늘, 주도권, 권위, 결단, 아버지, 강한 추진력", lines: [true, true, true] },
  2: { number: 2, short: "태", name: "태兌", element: "금", symbols: "연못, 말, 기쁨, 설득, 교류, 막내딸, 즐거움과 유혹", lines: [true, true, false] },
  3: { number: 3, short: "리", name: "리離", element: "화", symbols: "불, 밝음, 드러남, 명예, 문서, 시선, 중녀", lines: [true, false, true] },
  4: { number: 4, short: "진", name: "진震", element: "목", symbols: "우레, 시작, 충격, 움직임, 장남, 갑작스러운 변화", lines: [true, false, false] },
  5: { number: 5, short: "손", name: "손巽", element: "목", symbols: "바람, 침투, 소문, 거래, 장녀, 유연한 확장", lines: [false, true, true] },
  6: { number: 6, short: "감", name: "감坎", element: "수", symbols: "물, 위험, 고민, 비밀, 지연, 중남", lines: [false, true, false] },
  7: { number: 7, short: "간", name: "간艮", element: "토", symbols: "산, 멈춤, 경계, 축적, 막내아들, 정지와 확인", lines: [false, false, true] },
  8: { number: 8, short: "곤", name: "곤坤", element: "토", symbols: "땅, 수용, 기반, 현실, 어머니, 협력과 지속", lines: [false, false, false] },
};

export const HEXAGRAM_NAMES: Record<string, Record<string, string>> = {
  건: { 건: "중천건 重天乾", 태: "천택리 天澤履", 리: "천화동인 天火同人", 진: "천뢰무망 天雷無妄", 손: "천풍구 天風姤", 감: "천수송 天水訟", 간: "천산둔 天山遯", 곤: "천지비 天地否" },
  태: { 건: "택천쾌 澤天夬", 태: "중택태 重澤兌", 리: "택화혁 澤火革", 진: "택뢰수 澤雷隨", 손: "택풍대과 澤風大過", 감: "택수곤 澤水困", 간: "택산함 澤山咸", 곤: "택지췌 澤地萃" },
  리: { 건: "화천대유 火天大有", 태: "화택규 火澤睽", 리: "중화리 重火離", 진: "화뢰서합 火雷噬嗑", 손: "화풍정 火風鼎", 감: "화수미제 火水未濟", 간: "화산려 火山旅", 곤: "화지진 火地晉" },
  진: { 건: "뇌천대장 雷天大壯", 태: "뇌택귀매 雷澤歸妹", 리: "뇌화풍 雷火豊", 진: "중뢰진 重雷震", 손: "뇌풍항 雷風恆", 감: "뇌수해 雷水解", 간: "뇌산소과 雷山小過", 곤: "뇌지예 雷地豫" },
  손: { 건: "풍천소축 風天小畜", 태: "풍택중부 風澤中孚", 리: "풍화가인 風火家人", 진: "풍뢰익 風雷益", 손: "중풍손 重風巽", 감: "풍수환 風水渙", 간: "풍산점 風山漸", 곤: "풍지관 風地觀" },
  감: { 건: "수천수 水天需", 태: "수택절 水澤節", 리: "수화기제 水火旣濟", 진: "수뢰둔 水雷屯", 손: "수풍정 水風井", 감: "중수감 重水坎", 간: "수산건 水山蹇", 곤: "수지비 水地比" },
  간: { 건: "산천대축 山天大畜", 태: "산택손 山澤損", 리: "산화비 山火賁", 진: "산뢰이 山雷頤", 손: "산풍고 山風蠱", 감: "산수몽 山水蒙", 간: "중산간 重山艮", 곤: "산지박 山地剝" },
  곤: { 건: "지천태 地天泰", 태: "지택림 地澤臨", 리: "지화명이 地火明夷", 진: "지뢰복 地雷復", 손: "지풍승 地風升", 감: "지수사 地水師", 간: "지산겸 地山謙", 곤: "중지곤 重地坤" },
};

const GENERATES: Record<GuaElement, GuaElement> = { 목: "화", 화: "토", 토: "금", 금: "수", 수: "목" };
const CONTROLS: Record<GuaElement, GuaElement> = { 목: "토", 토: "수", 수: "화", 화: "금", 금: "목" };

export function mod8(value: number) {
  const result = value % 8;
  return result === 0 ? 8 : result;
}

export function mod6(value: number) {
  const result = value % 6;
  return result === 0 ? 6 : result;
}

export function getGuaByNumber(value: number) {
  return GUA_BY_NUMBER[mod8(value)];
}

export function getGuaByLines(lines: [boolean, boolean, boolean]) {
  const match = Object.values(GUA_BY_NUMBER).find((gua) => gua.lines.every((line, index) => line === lines[index]));
  if (!match) throw new Error("팔괘 효 배열을 찾을 수 없습니다.");
  return match;
}

export function getHexagramName(upperGua: GuaInfo, lowerGua: GuaInfo) {
  return HEXAGRAM_NAMES[upperGua.short]?.[lowerGua.short] || "미산출";
}

export function buildHexagramLines(upperGua: GuaInfo, lowerGua: GuaInfo): [boolean, boolean, boolean, boolean, boolean, boolean] {
  return [...lowerGua.lines, ...upperGua.lines] as [boolean, boolean, boolean, boolean, boolean, boolean];
}

export function calculateChangedHexagram(upperGua: GuaInfo, lowerGua: GuaInfo, changingLine: number) {
  const lines = buildHexagramLines(upperGua, lowerGua);
  lines[changingLine - 1] = !lines[changingLine - 1];
  const changedLower = getGuaByLines([lines[0], lines[1], lines[2]]);
  const changedUpper = getGuaByLines([lines[3], lines[4], lines[5]]);
  return { upperGua: changedUpper, lowerGua: changedLower, name: getHexagramName(changedUpper, changedLower), lines };
}

export function calculateMutualHexagram(upperGua: GuaInfo, lowerGua: GuaInfo) {
  const lines = buildHexagramLines(upperGua, lowerGua);
  const mutualLower = getGuaByLines([lines[1], lines[2], lines[3]]);
  const mutualUpper = getGuaByLines([lines[2], lines[3], lines[4]]);
  return { upperGua: mutualUpper, lowerGua: mutualLower, name: getHexagramName(mutualUpper, mutualLower) };
}

export function calculateBodyUse(upperGua: GuaInfo, lowerGua: GuaInfo, changingLine: number) {
  if (changingLine <= 3) return { bodyGua: upperGua, useGua: lowerGua };
  return { bodyGua: lowerGua, useGua: upperGua };
}

// 한글 받침 유무로 조사를 고른다 — 오행 이름(목·화·토·금·수)이 그대로 문장에 박히는데
// "금가"·"목를" 처럼 어긋난 조사가 프롬프트 산출 데이터에 실려 나갔다(2026-09-04 수정).
function finalConsonantIndex(value: string) {
  const text = String(value || "");
  if (!text) return 0;
  const code = text.charCodeAt(text.length - 1) - 0xac00;
  return code >= 0 && code <= 11171 ? code % 28 : 0;
}

function hasFinalConsonant(value: string) {
  return finalConsonantIndex(value) !== 0;
}

function subjectParticle(value: string) {
  return `${value}${hasFinalConsonant(value) ? "이" : "가"}`;
}

function objectParticle(value: string) {
  return `${value}${hasFinalConsonant(value) ? "을" : "를"}`;
}

// 괘 이름은 "수천수 水天需" 처럼 한글 독음 뒤에 한자가 붙어 있어, 마지막 글자로 받침을 판정하면
// 언제나 "받침 없음"이 되어 "火天大有으로" 같은 문장이 프롬프트에 그대로 실린다(2026-09-04 수정).
// 공백 앞 한글 독음으로 판정하고, 받침이 없거나 ㄹ(종성 8)이면 "로", 그 외에는 "으로"를 붙인다.
function directionParticle(name: string) {
  const reading = String(name || "").split(" ")[0];
  const final = finalConsonantIndex(reading);
  return `${name}${final === 0 || final === 8 ? "로" : "으로"}`;
}

export function calculateElementRelation(bodyElement: GuaElement, useElement: GuaElement, bodyLabel = "체", useLabel = "용") {
  if (bodyElement === useElement) return `${bodyLabel}와 ${subjectParticle(useLabel)} 같은 ${bodyElement} 기운이라 같은 성질이 반복되며 장단점이 모두 커지는 흐름`;
  if (GENERATES[useElement] === bodyElement) return `${useLabel} ${subjectParticle(useElement)} ${bodyLabel} ${objectParticle(bodyElement)} 생하므로 외부 상황이 나를 돕는 흐름`;
  if (GENERATES[bodyElement] === useElement) return `${bodyLabel} ${subjectParticle(bodyElement)} ${useLabel} ${objectParticle(useElement)} 생하므로 내가 힘을 써야 일이 움직이는 흐름`;
  if (CONTROLS[bodyElement] === useElement) return `${bodyLabel} ${subjectParticle(bodyElement)} ${useLabel} ${objectParticle(useElement)} 극하므로 내가 상황을 통제하려는 흐름`;
  if (CONTROLS[useElement] === bodyElement) return `${useLabel} ${subjectParticle(useElement)} ${bodyLabel} ${objectParticle(bodyElement)} 극하므로 외부 압박이나 장애가 강한 흐름`;
  return `${bodyLabel} ${bodyElement}와 ${useLabel} ${useElement}의 관계는 추가 맥락을 함께 보아야 하는 흐름`;
}

function composeResult(input: {
  mode: MeihuaMode;
  modeLabel: string;
  question: string;
  baseDateTime: string;
  upperNumber: number;
  lowerNumber: number;
  changingLine: number;
  extras?: Partial<MeihuaCalcResult>;
}) {
  const upperGua = getGuaByNumber(input.upperNumber);
  const lowerGua = getGuaByNumber(input.lowerNumber);
  const mainHexagramName = getHexagramName(upperGua, lowerGua);
  const mutualHexagramName = calculateMutualHexagram(upperGua, lowerGua).name;
  const changedHexagramName = calculateChangedHexagram(upperGua, lowerGua, input.changingLine).name;
  const { bodyGua, useGua } = calculateBodyUse(upperGua, lowerGua, input.changingLine);
  const bodyUseRelation = calculateElementRelation(bodyGua.element, useGua.element);
  const coreSummary = `${mainHexagramName}에서 ${directionParticle(changedHexagramName)} 움직이며, ${bodyUseRelation}입니다.`;
  return {
    mode: input.mode,
    modeLabel: input.modeLabel,
    question: input.question,
    baseDateTime: input.baseDateTime,
    upperGua,
    lowerGua,
    mainHexagramName,
    mutualHexagramName,
    changingLine: input.changingLine,
    changedHexagramName,
    bodyGua,
    useGua,
    bodyUseRelation,
    coreSummary,
    ...input.extras,
  } as MeihuaCalcResult;
}

export function calculateBasicMeihua(input: {
  modeLabel: string;
  name: string;
  gender: string;
  birthDate: string;
  birthTime: string;
  calendarType: string;
  question: string;
  year: number;
  month: number;
  day: number;
  hour24: number;
  minute: number;
  baseDateTime: string;
}) {
  const seed = input.year + input.month + input.day;
  return composeResult({
    mode: "basic",
    modeLabel: input.modeLabel,
    question: input.question,
    baseDateTime: input.baseDateTime,
    upperNumber: mod8(seed),
    lowerNumber: mod8(seed + input.hour24),
    changingLine: mod6(seed + input.hour24 + input.minute),
    extras: {
      name: input.name,
      gender: input.gender,
      birthDate: input.birthDate,
      birthTime: input.birthTime,
      calendarType: input.calendarType,
    },
  });
}

export function calculateTargetDateMeihua(input: {
  modeLabel: string;
  name: string;
  gender: string;
  birthDate: string;
  birthTime: string;
  calendarType: string;
  question: string;
  birthYear: number;
  birthMonth: number;
  birthDay: number;
  targetYear: number;
  targetMonth: number;
  targetDay: number;
  targetHour24: number;
  targetMinute: number;
  baseDateTime: string;
  targetDate: string;
  targetTime: string;
  targetPurpose: string;
}) {
  const birthSeed = input.birthYear + input.birthMonth + input.birthDay;
  const targetSeed = input.targetYear + input.targetMonth + input.targetDay;
  return composeResult({
    mode: "target",
    modeLabel: input.modeLabel,
    question: input.question,
    baseDateTime: input.baseDateTime,
    upperNumber: mod8(birthSeed + input.targetMonth + input.targetDay),
    lowerNumber: mod8(targetSeed + input.targetHour24),
    changingLine: mod6(birthSeed + targetSeed + input.targetHour24 + input.targetMinute),
    extras: {
      name: input.name,
      gender: input.gender,
      birthDate: input.birthDate,
      birthTime: input.birthTime,
      calendarType: input.calendarType,
      targetDate: input.targetDate,
      targetTime: input.targetTime,
      targetPurpose: input.targetPurpose,
    },
  });
}

export function calculateCompatibilityMeihua(input: {
  modeLabel: string;
  question: string;
  aName: string;
  aBirthDate: string;
  aBirthTime: string;
  aYear: number;
  aMonth: number;
  aDay: number;
  bName: string;
  bBirthDate: string;
  bBirthTime: string;
  bYear: number;
  bMonth: number;
  bDay: number;
  relationshipType: string;
  baseMonth: number;
  baseDay: number;
  baseHour24: number;
  baseMinute: number;
  baseDateTime: string;
}) {
  const aSeed = input.aYear + input.aMonth + input.aDay;
  const bSeed = input.bYear + input.bMonth + input.bDay;
  const personAGua = getGuaByNumber(aSeed);
  const personBGua = getGuaByNumber(bSeed);
  const result = composeResult({
    mode: "compatibility",
    modeLabel: input.modeLabel,
    question: input.question,
    baseDateTime: input.baseDateTime,
    upperNumber: mod8(aSeed + input.baseMonth + input.baseDay),
    lowerNumber: mod8(bSeed + input.baseHour24),
    changingLine: mod6(aSeed + bSeed + input.baseMonth + input.baseDay + input.baseHour24 + input.baseMinute),
    extras: {
      personAName: input.aName,
      personABirthDate: input.aBirthDate,
      personABirthTime: input.aBirthTime,
      personAGua,
      personBName: input.bName,
      personBBirthDate: input.bBirthDate,
      personBBirthTime: input.bBirthTime,
      personBGua,
      relationshipType: input.relationshipType,
      personElementRelation: calculateElementRelation(personAGua.element, personBGua.element, "A", "B"),
    },
  });
  return result;
}

export function formatMeihuaDateTime(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function getMeihuaQuestionNotice(question: string) {
  const trimmed = question.trim();
  if (!trimmed) return "";
  const questionMarks = (trimmed.match(/[?？]/g) || []).length;
  if (questionMarks > 1 || /\b(그리고|또|동시에|둘 다|여러 가지|각각)\b/u.test(trimmed)) {
    return "매화역수는 하나의 흐름을 괘로 세울 때 가장 안정적입니다.";
  }
  return "";
}

function buildSummary(result: MeihuaCalcResult) {
  const birthLine = result.mode === "compatibility"
    ? `A 생년월일: ${result.personABirthDate || "미입력"}\nB 생년월일: ${result.personBBirthDate || "미입력"}`
    : `입력 생년월일: ${result.birthDate || "미입력"}`;
  return `[매화역수 계산 요약]
선택 메뉴: ${result.modeLabel}
질문: ${result.question}
기준 날짜와 시간: ${result.baseDateTime}
${birthLine}
상괘: ${result.upperGua.name} / ${result.upperGua.element}
하괘: ${result.lowerGua.name} / ${result.lowerGua.element}
본괘: ${result.mainHexagramName}
호괘: ${result.mutualHexagramName}
동효: ${result.changingLine}효
변괘: ${result.changedHexagramName}
체괘: ${result.bodyGua.name} / ${result.bodyGua.element}
용괘: ${result.useGua.name} / ${result.useGua.element}
체용 관계: ${result.bodyUseRelation}
핵심 요약: ${result.coreSummary}`;
}

export function buildMeihuaPrompt(result: MeihuaCalcResult) {
  if (result.mode === "compatibility") {
    return `${buildSummary(result)}

당신은 매화역수와 주역 해석에 능숙한 전문 상담가입니다.

[관계 입력 정보]
A 이름: ${result.personAName || "미입력"}
A 생년월일: ${result.personABirthDate || "미입력"}
A 출생시간: ${result.personABirthTime || "모름"}
A 개인괘: ${result.personAGua?.name || "미산출"} / ${result.personAGua?.element || "미산출"}

B 이름: ${result.personBName || "미입력"}
B 생년월일: ${result.personBBirthDate || "미입력"}
B 출생시간: ${result.personBBirthTime || "모름"}
B 개인괘: ${result.personBGua?.name || "미산출"} / ${result.personBGua?.element || "미산출"}

관계 유형: ${result.relationshipType || "미입력"}
관계 질문: ${result.question}
기준 날짜와 시간: ${result.baseDateTime}

[관계 매화역수 계산 결과]
관계 본괘: ${result.mainHexagramName}
관계 호괘: ${result.mutualHexagramName}
관계 동효: ${result.changingLine}효
관계 변괘: ${result.changedHexagramName}
A와 B의 오행 관계: ${result.personElementRelation || "미산출"}
체괘: ${result.bodyGua.name} / ${result.bodyGua.element}
용괘: ${result.useGua.name} / ${result.useGua.element}
체용 관계: ${result.bodyUseRelation}

궁합 해석 요청:

1. 두 사람의 기본 기질 차이
2. 관계에서 잘 맞는 부분
3. 관계에서 반복 충돌이 생기는 부분
4. 본괘가 보여주는 현재 관계의 구조
5. 호괘가 보여주는 숨은 감정과 내부 변수
6. 변괘가 보여주는 앞으로의 변화 방향
7. 관계를 안정시키기 위해 A가 줄일 행동과 늘릴 행동
8. 관계를 안정시키기 위해 B가 줄일 행동과 늘릴 행동
9. 재회, 결혼, 동거, 사업 파트너 등 관계 유형별 현실 조언
10. 최종 궁합 요약

결과는 재미와 참고 목적의 운세 리딩임을 자연스럽게 안내해 주세요.`;
  }

  const targetSection = result.mode === "target"
    ? `
[지정일 정보]
지정일: ${result.targetDate || "미입력"}
지정 시간: ${result.targetTime || "미입력"}
지정일 목적: ${result.targetPurpose || "미입력"}

추가 해석 요청:

* 이 날짜가 질문자의 흐름과 잘 맞는지 봐주세요.
* 지정일에 강하게 드러나는 변수와 주의할 점을 알려 주세요.
* 이 날짜에 바로 실행해도 좋은지, 준비 후 실행이 나은지 구분해 주세요.
* 대체 날짜를 직접 단정하지 말고, 어떤 성격의 날짜가 더 좋은지 설명해 주세요.
`
    : "";

  return `${buildSummary(result)}

당신은 매화역수와 주역 해석에 능숙한 전문 상담가입니다.

아래 정보는 사용자가 입력한 생년월일, 질문, 기준 날짜 정보를 바탕으로 계산한 매화역수 괘 정보입니다. 단순히 길흉만 말하지 말고, 본괘·호괘·변괘·체용 관계·오행 생극을 종합해 현실적인 선택 방향을 제시해 주세요.

[입력 정보]
선택 메뉴: ${result.modeLabel}
이름 또는 별칭: ${result.name || "미입력"}
생년월일: ${result.birthDate || "미입력"}
출생시간: ${result.birthTime || "모름"}
달력 기준: ${result.calendarType || "미입력"}
질문: ${result.question}
기준 날짜와 시간: ${result.baseDateTime}
${targetSection}
[매화역수 계산 결과]
상괘: ${result.upperGua.name} / ${result.upperGua.element}
하괘: ${result.lowerGua.name} / ${result.lowerGua.element}
본괘: ${result.mainHexagramName}
호괘: ${result.mutualHexagramName}
동효: ${result.changingLine}효
변괘: ${result.changedHexagramName}
체괘: ${result.bodyGua.name} / ${result.bodyGua.element}
용괘: ${result.useGua.name} / ${result.useGua.element}
체용 관계: ${result.bodyUseRelation}
핵심 흐름: ${result.coreSummary}

[해석 요청]
아래 순서로 매화역수 리딩을 작성해 주세요.

1. 질문의 성립성
- 이 질문이 매화역수로 보기 적절한지 설명해 주세요.
- 질문이 너무 넓다면 어떤 식으로 좁히면 좋은지 알려 주세요.

2. 본괘 해석
- 본괘가 보여주는 현재 상황의 구조를 설명해 주세요.
- 질문자가 현재 어떤 국면에 있는지 알려 주세요.
- 본괘의 상괘와 하괘가 서로 어떤 그림을 만드는지 쉽게 설명해 주세요.

3. 호괘 해석
- 호괘가 보여주는 숨은 마음, 내부 조건, 보이지 않는 변수를 설명해 주세요.
- 겉으로 드러난 상황과 실제 내부 흐름이 같은지 다른지 알려 주세요.

4. 동효 해석
- 몇 효가 움직였는지에 따라 지금 가장 흔들리는 지점을 설명해 주세요.
- 이 동효가 질문자에게 요구하는 태도와 조심해야 할 행동을 알려 주세요.

5. 변괘 해석
- 일이 진행될 경우 어떤 방향으로 바뀌는지 설명해 주세요.
- 결과가 빠른 변화인지, 지연인지, 정리인지, 재시도인지 구분해 주세요.

6. 체용 관계 해석
- 체괘는 질문자 또는 중심축으로 보고, 용괘는 사건·상대·외부 상황으로 보아 설명해 주세요.
- 체와 용의 오행 관계가 좋은지, 부담이 큰지, 내가 힘을 써야 하는지, 외부가 나를 돕는지 판단해 주세요.

7. 현실 조언
- 지금 줄여야 할 행동 3가지
- 지금 늘려야 할 행동 3가지
- 확인해야 할 현실 조건 3가지
- 선택 전 체크리스트를 작성해 주세요.

8. 최종 요약
- 가능성: 높음 / 보통 / 낮음 중 하나로 정리해 주세요.
- 단, 단정적인 예언이 아니라 괘의 흐름상 그렇게 보는 이유를 함께 설명해 주세요.
- 마지막에는 질문자가 바로 실행할 수 있는 한 문장 조언을 주세요.

[문체 조건]
- 지나치게 공포스럽거나 운명론적으로 쓰지 마세요.
- 전문 용어는 쉬운 설명을 붙여 주세요.
- 전통 해석과 현실 조언을 함께 제시해 주세요.
- 결과는 재미와 참고 목적의 운세 리딩임을 자연스럽게 안내해 주세요.`;
}

export function runMeihuaSelfTests() {
  const assert = (condition: boolean, message: string) => {
    if (!condition) throw new Error(message);
  };
  assert(mod8(8) === 8, "mod8(8)");
  assert(mod8(9) === 1, "mod8(9)");
  assert(mod8(16) === 8, "mod8(16)");
  assert(mod6(6) === 6, "mod6(6)");
  assert(mod6(7) === 1, "mod6(7)");
  assert(mod6(12) === 6, "mod6(12)");
  assert(getGuaByNumber(1).short === "건", "1 = 건");
  assert(getGuaByNumber(8).short === "곤", "8 = 곤");
  const gun = GUA_BY_NUMBER[1];
  const changed1 = calculateChangedHexagram(gun, gun, 1);
  assert(changed1.lowerGua.short === "손", "건괘 1효 변");
  const changed4 = calculateChangedHexagram(gun, gun, 4);
  assert(changed4.upperGua.short === "손", "동효 4효 상괘 변");
  const mutual = calculateMutualHexagram(gun, gun);
  assert(mutual.lowerGua.short === "건" && mutual.upperGua.short === "건", "호괘 2·3·4 / 3·4·5");
  const body3 = calculateBodyUse(GUA_BY_NUMBER[3], GUA_BY_NUMBER[6], 3);
  assert(body3.bodyGua.short === "리" && body3.useGua.short === "감", "동효 1~3 체용");
  const body4 = calculateBodyUse(GUA_BY_NUMBER[3], GUA_BY_NUMBER[6], 4);
  assert(body4.bodyGua.short === "감" && body4.useGua.short === "리", "동효 4~6 체용");
  return true;
}
