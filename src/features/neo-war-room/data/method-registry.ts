import type { LoadingLocale } from "@/constants/loadingMessages";
import type { NeoWarRoomAsset, NeoWarRoomConsultMode } from "./assets";
import { neoWarRoomAssets } from "./assets";

export type NeoWarRoomMethodStatus = "active" | "beta" | "comingSoon";

export type NeoWarRoomMethodDefinition = {
  mode: NeoWarRoomConsultMode;
  label: string;
  status: NeoWarRoomMethodStatus;
  statusLabel: string;
  enabled: boolean;
  coverAsset: NeoWarRoomAsset;
  cardEyebrow: string;
  cardBody: string;
  inputSummary: string;
  requiredInputs: string[];
  calculableData: string[];
  llmSummaryFields: string[];
  resultEvidenceLabel: string;
  realityCheckStrategy: string;
  qualityNote: string;
};

export const neoWarRoomMethodRegistry: NeoWarRoomMethodDefinition[] = [
  {
    mode: "saju",
    label: "사주",
    status: "active",
    statusLabel: "실전 연결",
    enabled: true,
    coverAsset: neoWarRoomAssets.methods.saju,
    cardEyebrow: "태어난 계절과 기질",
    cardBody: "오행의 균형과 흐름에서 지금 흔들리는 선택의 중심을 잡는다.",
    inputSummary: "생년월일, 성별, 출생시간",
    requiredInputs: ["생년월일", "성별", "출생시간 또는 출생시간 모름"],
    calculableData: ["사주 팔자", "일간", "오행 분포", "십성 분포", "대운", "세운"],
    llmSummaryFields: ["summary", "evidenceSummary", "pillars", "fiveElements", "tenGods", "majorLuck", "yearlyLuck"],
    resultEvidenceLabel: "사주 근거",
    realityCheckStrategy: "타고난 기질과 현재 반복 선택의 어긋남을 중심으로 현실 점검 질문을 만든다.",
    qualityNote: "로컬 사주 엔진으로 계산한 요약값을 LLM에 전달한다.",
  },
  {
    mode: "ziwei",
    label: "자미두수",
    status: "active",
    statusLabel: "실전 연결",
    enabled: true,
    coverAsset: neoWarRoomAssets.methods.ziwei,
    cardEyebrow: "명궁과 삶의 전선",
    cardBody: "자미두수의 별자리 배치로 반복되는 운명의 작전선을 읽는다.",
    inputSummary: "생년월일, 성별, 출생시간",
    requiredInputs: ["생년월일", "성별", "출생시간 또는 출생시간 모름"],
    calculableData: ["명궁", "신궁", "12궁", "주요 별", "대운", "연운"],
    llmSummaryFields: ["summary", "evidenceSummary", "mingGong", "shenGong", "palaces", "stars", "majorLuck", "yearlyFlow"],
    resultEvidenceLabel: "자미두수 근거",
    realityCheckStrategy: "명궁과 신궁의 방향성에서 벗어난 습관과 선택 패턴을 묻는다.",
    qualityNote: "자미두수 차트 계산 결과를 요약해 LLM에 전달한다.",
  },
  {
    mode: "vedic",
    label: "베다점",
    status: "active",
    statusLabel: "실전 연결",
    enabled: true,
    coverAsset: neoWarRoomAssets.methods.vedic,
    cardEyebrow: "카르마와 행성의 압력",
    cardBody: "베다의 별빛이 밀어붙이는 과제와 타이밍을 분명히 가른다.",
    inputSummary: "생년월일, 성별, 출생시간, 시간대",
    requiredInputs: ["생년월일", "성별", "출생시간 또는 출생시간 모름", "시간대"],
    calculableData: ["라그나", "달", "태양", "행성", "하우스", "다샤", "트랜짓", "요가"],
    llmSummaryFields: ["summary", "evidenceSummary", "lagna", "moon", "sun", "planets", "houses", "dasha", "transits", "yogas"],
    resultEvidenceLabel: "베다점 근거",
    realityCheckStrategy: "현재 다샤와 행성 압력이 실제 선택에서 어떻게 새고 있는지 확인한다.",
    qualityNote: "시간대가 있어야 계산 정합성이 올라가며, 입력값이 부족하면 생성 전 차단한다.",
  },
  {
    mode: "astrology",
    label: "점성술",
    status: "active",
    statusLabel: "실전 연결",
    enabled: true,
    coverAsset: neoWarRoomAssets.methods.astrology,
    cardEyebrow: "별자리와 심리 전술",
    cardBody: "점성술의 행성 각도에서 선택 습관과 관계의 패턴을 짚는다.",
    inputSummary: "생년월일, 성별, 출생시간, 시간대",
    requiredInputs: ["생년월일", "성별", "출생시간 또는 출생시간 모름", "시간대"],
    calculableData: ["태양", "달", "상승궁", "행성", "하우스", "애스펙트", "타이밍 흐름"],
    llmSummaryFields: ["summary", "evidenceSummary", "sun", "moon", "ascendant", "planets", "houses", "aspects", "timingInsights"],
    resultEvidenceLabel: "점성술 근거",
    realityCheckStrategy: "행성 각도가 가리키는 감정 반응과 현실 선택 사이의 간극을 묻는다.",
    qualityNote: "점성술 계산 준비 결과를 요약해 LLM에 전달하며, 시간대 입력을 요구한다.",
  },
];

export const neoWarRoomActiveMethodModes = neoWarRoomMethodRegistry
  .filter((method) => method.enabled)
  .map((method) => method.mode);

export function getNeoWarRoomMethodDefinition(method?: string) {
  return neoWarRoomMethodRegistry.find((item) => item.mode === method);
}

// 🔴 아래 5개 필드만 실제로 화면에 렌더된다(label/statusLabel/cardEyebrow/inputSummary/resultEvidenceLabel).
// cardBody/requiredInputs/calculableData/llmSummaryFields/realityCheckStrategy/qualityNote 는
// git grep 으로 확인한 결과 어디서도 읽히지 않는 죽은 필드라 번역 대상에서 제외했다.
type NeoWarRoomMethodDisplayText = Pick<
  NeoWarRoomMethodDefinition,
  "label" | "statusLabel" | "cardEyebrow" | "inputSummary" | "resultEvidenceLabel"
>;

const NEO_METHOD_TEXT_EN: Record<NeoWarRoomConsultMode, NeoWarRoomMethodDisplayText> = {
  saju: { label: "Saju", statusLabel: "Live", cardEyebrow: "The season you were born into, and your temperament", inputSummary: "Birth date, gender, birth time", resultEvidenceLabel: "Saju basis" },
  ziwei: { label: "Ziwei Doushu", statusLabel: "Live", cardEyebrow: "The Life Palace and life's front lines", inputSummary: "Birth date, gender, birth time", resultEvidenceLabel: "Ziwei Doushu basis" },
  vedic: { label: "Vedic Astrology", statusLabel: "Live", cardEyebrow: "Karma and planetary pressure", inputSummary: "Birth date, gender, birth time, time zone", resultEvidenceLabel: "Vedic astrology basis" },
  astrology: { label: "Astrology", statusLabel: "Live", cardEyebrow: "Star signs and psychological tactics", inputSummary: "Birth date, gender, birth time, time zone", resultEvidenceLabel: "Astrology basis" },
};

const NEO_METHOD_TEXT_BY_LOCALE: Partial<Record<Exclude<LoadingLocale, "ko">, Record<NeoWarRoomConsultMode, NeoWarRoomMethodDisplayText>>> = {
  en: NEO_METHOD_TEXT_EN,
  ja: {
    saju: { label: "四柱推命", statusLabel: "実戦接続", cardEyebrow: "生まれた季節と気質", inputSummary: "生年月日、性別、出生時間", resultEvidenceLabel: "四柱推命の根拠" },
    ziwei: { label: "紫微斗数", statusLabel: "実戦接続", cardEyebrow: "命宮と人生の戦線", inputSummary: "生年月日、性別、出生時間", resultEvidenceLabel: "紫微斗数の根拠" },
    vedic: { label: "ヴェーダ占星術", statusLabel: "実戦接続", cardEyebrow: "カルマと惑星の圧力", inputSummary: "生年月日、性別、出生時間、タイムゾーン", resultEvidenceLabel: "ヴェーダ占星術の根拠" },
    astrology: { label: "西洋占星術", statusLabel: "実戦接続", cardEyebrow: "星座と心理戦術", inputSummary: "生年月日、性別、出生時間、タイムゾーン", resultEvidenceLabel: "西洋占星術の根拠" },
  },
  "zh-CN": {
    saju: { label: "四柱", statusLabel: "实战衔接", cardEyebrow: "出生的季节与气质", inputSummary: "出生日期、性别、出生时间", resultEvidenceLabel: "四柱依据" },
    ziwei: { label: "紫微斗数", statusLabel: "实战衔接", cardEyebrow: "命宫与人生战线", inputSummary: "出生日期、性别、出生时间", resultEvidenceLabel: "紫微斗数依据" },
    vedic: { label: "吠陀占星", statusLabel: "实战衔接", cardEyebrow: "业力与行星的压力", inputSummary: "出生日期、性别、出生时间、时区", resultEvidenceLabel: "吠陀占星依据" },
    astrology: { label: "西洋占星", statusLabel: "实战衔接", cardEyebrow: "星座与心理战术", inputSummary: "出生日期、性别、出生时间、时区", resultEvidenceLabel: "西洋占星依据" },
  },
  "zh-TW": {
    saju: { label: "四柱", statusLabel: "實戰銜接", cardEyebrow: "出生的季節與氣質", inputSummary: "出生日期、性別、出生時間", resultEvidenceLabel: "四柱依據" },
    ziwei: { label: "紫微斗數", statusLabel: "實戰銜接", cardEyebrow: "命宮與人生戰線", inputSummary: "出生日期、性別、出生時間", resultEvidenceLabel: "紫微斗數依據" },
    vedic: { label: "吠陀占星", statusLabel: "實戰銜接", cardEyebrow: "業力與行星的壓力", inputSummary: "出生日期、性別、出生時間、時區", resultEvidenceLabel: "吠陀占星依據" },
    astrology: { label: "西洋占星", statusLabel: "實戰銜接", cardEyebrow: "星座與心理戰術", inputSummary: "出生日期、性別、出生時間、時區", resultEvidenceLabel: "西洋占星依據" },
  },
};

/** ko(+원본) 는 그대로, 나머지 로케일은 위 표를 병합한 사본을 돌려준다. 표에 없으면 en 으로 대신한다. */
export function getLocalizedNeoWarRoomMethodRegistry(locale: LoadingLocale): NeoWarRoomMethodDefinition[] {
  if (locale === "ko") return neoWarRoomMethodRegistry;
  const table = NEO_METHOD_TEXT_BY_LOCALE[locale as Exclude<LoadingLocale, "ko">] || NEO_METHOD_TEXT_EN;
  return neoWarRoomMethodRegistry.map((item) => ({ ...item, ...table[item.mode] }));
}

export function getLocalizedNeoWarRoomMethodDefinition(method: string | undefined, locale: LoadingLocale) {
  return getLocalizedNeoWarRoomMethodRegistry(locale).find((item) => item.mode === method);
}
