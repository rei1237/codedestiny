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
  detailBody: string;
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
    detailBody: "태어난 시각을 연·월·일·시 네 기둥으로 세워 타고난 기질과 시기의 흐름을 좌표로 잡습니다. 오행이 어디로 몰리고 어디가 비었는지, 지금 지나는 대운과 세운이 그 기질을 어느 쪽으로 밀고 있는지를 계산해 넘깁니다. 결과에는 어떤 값에서 나온 문장인지 사주 근거가 함께 붙습니다.",
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
    detailBody: "생시를 기준으로 명궁과 신궁을 세우고 열두 궁에 별을 배치해 삶의 전선이 어디에 놓였는지를 봅니다. 어느 궁에 힘이 실렸는지, 대운과 연운이 그 배치를 어떻게 흔드는지를 계산해 명궁이 가리키는 방향에서 벗어난 습관을 짚습니다. 결과에는 자미두수 근거가 함께 붙습니다.",
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
    detailBody: "출생 시각과 시간대로 라그나를 세우고 항성 기준 황도에서 행성과 하우스를 계산합니다. 지금 돌고 있는 다샤 주기와 트랜짓이 어느 영역에 압력을 걸고 있는지, 그 압력이 실제 선택에서 어떻게 새고 있는지를 넘깁니다. 시간대가 비면 생성 전에 막습니다.",
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
    detailBody: "출생 시각과 시간대로 상승궁을 세우고 태양·달·행성이 열두 하우스 어디에 떨어지는지, 서로 어떤 애스펙트를 맺는지를 계산합니다. 행성 각도가 만드는 감정 반응과 현실 선택 사이의 간극이 언제 벌어지는지를 넘깁니다. 결과에는 점성술 근거가 함께 붙습니다.",
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

// 🔴 아래 7개 필드만 실제로 화면에 렌더된다
// (label/statusLabel/cardEyebrow/inputSummary/resultEvidenceLabel/calculableData/detailBody).
// calculableData·detailBody 는 선택한 카드가 펼쳐질 때만 나오는 상세 블록에서 쓴다.
// cardBody/requiredInputs/llmSummaryFields/realityCheckStrategy/qualityNote 는 git grep 으로
// 확인한 결과 어디서도 읽히지 않는 죽은 필드라 번역 대상에서 제외했다.
type NeoWarRoomMethodDisplayText = Pick<
  NeoWarRoomMethodDefinition,
  | "label"
  | "statusLabel"
  | "cardEyebrow"
  | "inputSummary"
  | "resultEvidenceLabel"
  | "calculableData"
  | "detailBody"
>;

const NEO_METHOD_TEXT_EN: Record<NeoWarRoomConsultMode, NeoWarRoomMethodDisplayText> = {
  saju: {
    label: "Saju",
    statusLabel: "Live",
    cardEyebrow: "The season you were born into, and your temperament",
    inputSummary: "Birth date, gender, birth time",
    resultEvidenceLabel: "Saju basis",
    calculableData: ["Four Pillars", "Day Master", "Five Elements balance", "Ten Gods spread", "Major luck cycle", "Annual luck"],
    detailBody: "Your birth moment is set into four pillars — year, month, day and hour — so temperament and timing become coordinates. We compute where the five elements pile up and where they run empty, and which way the major and annual luck cycles you are passing through are pushing that temperament. Every sentence in the result comes back with the Saju basis it was drawn from.",
  },
  ziwei: {
    label: "Ziwei Doushu",
    statusLabel: "Live",
    cardEyebrow: "The Life Palace and life's front lines",
    inputSummary: "Birth date, gender, birth time",
    resultEvidenceLabel: "Ziwei Doushu basis",
    calculableData: ["Life Palace", "Body Palace", "Twelve Palaces", "Major stars", "Major luck cycle", "Annual flow"],
    detailBody: "Your birth hour fixes the Life Palace and the Body Palace, and the stars are laid across the twelve palaces to show where your front line actually sits. We compute which palace carries the weight and how the major and annual cycles shake that arrangement, then name the habits that have drifted off the direction the Life Palace points to. The result carries the Ziwei Doushu basis with it.",
  },
  vedic: {
    label: "Vedic Astrology",
    statusLabel: "Live",
    cardEyebrow: "Karma and planetary pressure",
    inputSummary: "Birth date, gender, birth time, time zone",
    resultEvidenceLabel: "Vedic astrology basis",
    calculableData: ["Lagna", "Moon", "Sun", "Planets", "Houses", "Dasha", "Transits", "Yogas"],
    detailBody: "Your birth time and time zone fix the Lagna, and planets and houses are computed on the sidereal zodiac. We pass on which area the running dasha period and the current transits are pressing, and how that pressure leaks into the choices you actually make. Without a time zone the reading is blocked before generation starts.",
  },
  astrology: {
    label: "Astrology",
    statusLabel: "Live",
    cardEyebrow: "Star signs and psychological tactics",
    inputSummary: "Birth date, gender, birth time, time zone",
    resultEvidenceLabel: "Astrology basis",
    calculableData: ["Sun", "Moon", "Ascendant", "Planets", "Houses", "Aspects", "Timing flow"],
    detailBody: "Your birth time and time zone fix the Ascendant, and we compute where the Sun, Moon and planets fall across the twelve houses and what aspects they form with one another. We pass on the gap between the emotional reactions those angles produce and the choices you actually make, and when that gap tends to widen. The result carries the Astrology basis with it.",
  },
};

const NEO_METHOD_TEXT_BY_LOCALE: Partial<Record<Exclude<LoadingLocale, "ko">, Record<NeoWarRoomConsultMode, NeoWarRoomMethodDisplayText>>> = {
  en: NEO_METHOD_TEXT_EN,
  ja: {
    saju: {
      label: "四柱推命",
      statusLabel: "実戦接続",
      cardEyebrow: "生まれた季節と気質",
      inputSummary: "生年月日、性別、出生時間",
      resultEvidenceLabel: "四柱推命の根拠",
      calculableData: ["四柱八字", "日干", "五行の分布", "十神の分布", "大運", "歳運"],
      detailBody: "生まれた時刻を年・月・日・時の四本の柱に立て、生まれ持った気質と時期の流れを座標にします。五行がどこに偏りどこが空いているか、いま巡る大運と歳運がその気質をどちらへ押しているかを計算して渡します。結果にはどの値から出た文章なのか、四柱推命の根拠が添えられます。",
    },
    ziwei: {
      label: "紫微斗数",
      statusLabel: "実戦接続",
      cardEyebrow: "命宮と人生の戦線",
      inputSummary: "生年月日、性別、出生時間",
      resultEvidenceLabel: "紫微斗数の根拠",
      calculableData: ["命宮", "身宮", "十二宮", "主星", "大運", "年運"],
      detailBody: "生時をもとに命宮と身宮を立て、十二宮に星を配置して人生の戦線がどこにあるかを見ます。どの宮に力が乗り、大運と年運がその配置をどう揺らすかを計算し、命宮が指す方向から外れた習慣を指摘します。結果には紫微斗数の根拠が添えられます。",
    },
    vedic: {
      label: "ヴェーダ占星術",
      statusLabel: "実戦接続",
      cardEyebrow: "カルマと惑星の圧力",
      inputSummary: "生年月日、性別、出生時間、タイムゾーン",
      resultEvidenceLabel: "ヴェーダ占星術の根拠",
      calculableData: ["ラグナ", "月", "太陽", "惑星", "ハウス", "ダシャー", "トランジット", "ヨーガ"],
      detailBody: "出生時刻とタイムゾーンからラグナを立て、恒星基準の黄道で惑星とハウスを計算します。いま巡るダシャーとトランジットがどの領域に圧力をかけ、その圧力が実際の選択でどう漏れているかを渡します。タイムゾーンが欠けていると生成の前に止めます。",
    },
    astrology: {
      label: "西洋占星術",
      statusLabel: "実戦接続",
      cardEyebrow: "星座と心理戦術",
      inputSummary: "生年月日、性別、出生時間、タイムゾーン",
      resultEvidenceLabel: "西洋占星術の根拠",
      calculableData: ["太陽", "月", "アセンダント", "惑星", "ハウス", "アスペクト", "タイミングの流れ"],
      detailBody: "出生時刻とタイムゾーンからアセンダントを立て、太陽・月・惑星が十二ハウスのどこに落ち、互いにどんなアスペクトを結ぶかを計算します。惑星の角度が生む感情反応と現実の選択との隔たりが、いつ広がるのかを渡します。結果には西洋占星術の根拠が添えられます。",
    },
  },
  "zh-CN": {
    saju: {
      label: "四柱",
      statusLabel: "实战衔接",
      cardEyebrow: "出生的季节与气质",
      inputSummary: "出生日期、性别、出生时间",
      resultEvidenceLabel: "四柱依据",
      calculableData: ["四柱八字", "日干", "五行分布", "十神分布", "大运", "流年"],
      detailBody: "把出生时刻立成年、月、日、时四柱，将天生的气质与时期的流向化为坐标。计算五行偏向何处、何处空缺，以及此刻所行的大运与流年正把这份气质推向哪一边。结果会附上每句话出自哪个数值的四柱依据。",
    },
    ziwei: {
      label: "紫微斗数",
      statusLabel: "实战衔接",
      cardEyebrow: "命宫与人生战线",
      inputSummary: "出生日期、性别、出生时间",
      resultEvidenceLabel: "紫微斗数依据",
      calculableData: ["命宫", "身宫", "十二宫", "主星", "大运", "流年"],
      detailBody: "以生时立命宫与身宫，把星曜排入十二宫，看人生的战线究竟落在哪里。计算哪一宫承载了重量，大运与流年又如何撼动这套布局，并指出偏离命宫方向的习惯。结果会附上紫微斗数依据。",
    },
    vedic: {
      label: "吠陀占星",
      statusLabel: "实战衔接",
      cardEyebrow: "业力与行星的压力",
      inputSummary: "出生日期、性别、出生时间、时区",
      resultEvidenceLabel: "吠陀占星依据",
      calculableData: ["拉格纳", "月亮", "太阳", "行星", "宫位", "大运周期", "行运", "瑜伽格局"],
      detailBody: "以出生时刻与时区立起拉格纳，在恒星黄道上计算行星与宫位。将当前运行的大运周期与行运正在施压的领域，以及这份压力如何在实际选择中泄漏，一并交出。缺少时区则在生成前拦下。",
    },
    astrology: {
      label: "西洋占星",
      statusLabel: "实战衔接",
      cardEyebrow: "星座与心理战术",
      inputSummary: "出生日期、性别、出生时间、时区",
      resultEvidenceLabel: "西洋占星依据",
      calculableData: ["太阳", "月亮", "上升点", "行星", "宫位", "相位", "时机流向"],
      detailBody: "以出生时刻与时区立起上升点，计算太阳、月亮与行星落在十二宫的哪一处，彼此又结成怎样的相位。交出行星角度所生的情绪反应与现实选择之间的落差，以及这道落差在何时拉开。结果会附上西洋占星依据。",
    },
  },
  "zh-TW": {
    saju: {
      label: "四柱",
      statusLabel: "實戰銜接",
      cardEyebrow: "出生的季節與氣質",
      inputSummary: "出生日期、性別、出生時間",
      resultEvidenceLabel: "四柱依據",
      calculableData: ["四柱八字", "日干", "五行分佈", "十神分佈", "大運", "流年"],
      detailBody: "把出生時刻立成年、月、日、時四柱，將天生的氣質與時期的流向化為座標。計算五行偏向何處、何處空缺，以及此刻所行的大運與流年正把這份氣質推向哪一邊。結果會附上每句話出自哪個數值的四柱依據。",
    },
    ziwei: {
      label: "紫微斗數",
      statusLabel: "實戰銜接",
      cardEyebrow: "命宮與人生戰線",
      inputSummary: "出生日期、性別、出生時間",
      resultEvidenceLabel: "紫微斗數依據",
      calculableData: ["命宮", "身宮", "十二宮", "主星", "大運", "流年"],
      detailBody: "以生時立命宮與身宮，把星曜排入十二宮，看人生的戰線究竟落在哪裡。計算哪一宮承載了重量，大運與流年又如何撼動這套佈局，並指出偏離命宮方向的習慣。結果會附上紫微斗數依據。",
    },
    vedic: {
      label: "吠陀占星",
      statusLabel: "實戰銜接",
      cardEyebrow: "業力與行星的壓力",
      inputSummary: "出生日期、性別、出生時間、時區",
      resultEvidenceLabel: "吠陀占星依據",
      calculableData: ["拉格納", "月亮", "太陽", "行星", "宮位", "大運週期", "行運", "瑜伽格局"],
      detailBody: "以出生時刻與時區立起拉格納，在恆星黃道上計算行星與宮位。將當前運行的大運週期與行運正在施壓的領域，以及這份壓力如何在實際選擇中洩漏，一併交出。缺少時區則在生成前攔下。",
    },
    astrology: {
      label: "西洋占星",
      statusLabel: "實戰銜接",
      cardEyebrow: "星座與心理戰術",
      inputSummary: "出生日期、性別、出生時間、時區",
      resultEvidenceLabel: "西洋占星依據",
      calculableData: ["太陽", "月亮", "上升點", "行星", "宮位", "相位", "時機流向"],
      detailBody: "以出生時刻與時區立起上升點，計算太陽、月亮與行星落在十二宮的哪一處，彼此又結成怎樣的相位。交出行星角度所生的情緒反應與現實選擇之間的落差，以及這道落差在何時拉開。結果會附上西洋占星依據。",
    },
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
