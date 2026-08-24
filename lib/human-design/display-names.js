// 휴먼 디자인 표시 이름 — ko / en. **순수 데이터 모듈**(의존성 0).
//
// 🔴 이 파일이 이름의 정본이다. 차트 화면(app/human-design/_copy/index.ts)과 프리미엄 리포트
//    플랜(lib/human-design/report-plan.js), 그리고 그 플랜을 조판하는 PDF 가 **같은 표**를 본다.
//    앱 쪽 _copy 에만 두면 PDF 조판기가 app/ 을 import 해야 하고, 사본을 만들면 웹과 PDF 의
//    라벨이 갈린다 — 요구 3("웹과 PDF 가 다른 내용을 만들지 않는다")이 이름에서부터 깨진다.
//
// 🔴 여기 있는 것은 **이름뿐**이다. 서술 문장(summary)은 화면 카피라 _copy 에 남는다.
//    이름은 계산 결과의 라벨이고, 서술은 편집물이라 수명이 다르다.

/**
 * @typedef {{ ko: string, en: string, ja: string, "zh-CN": string, "zh-TW": string }} Bilingual
 *
 * 🔴 다섯 개 전부 채운다. 휴먼 디자인은 영어 원어가 정본인 체계라 ja 는 통용 가타카나 표기를,
 *    zh 는 통용 의역을 쓴다 — 없는 용어를 지어내지 않는다.
 */

export const TYPE_NAME = Object.freeze({
  TYPE_GENERATOR: Object.freeze({ ko: "제너레이터", en: "Generator", ja: "ジェネレーター", "zh-CN": "生产者", "zh-TW": "生產者" }),
  TYPE_MANIFESTING_GENERATOR: Object.freeze({ ko: "매니페스팅 제너레이터", en: "Manifesting Generator", ja: "マニフェスティング・ジェネレーター", "zh-CN": "显示生产者", "zh-TW": "顯示生產者" }),
  TYPE_PROJECTOR: Object.freeze({ ko: "프로젝터", en: "Projector", ja: "プロジェクター", "zh-CN": "投射者", "zh-TW": "投射者" }),
  TYPE_MANIFESTOR: Object.freeze({ ko: "매니페스터", en: "Manifestor", ja: "マニフェスター", "zh-CN": "显示者", "zh-TW": "顯示者" }),
  TYPE_REFLECTOR: Object.freeze({ ko: "리플렉터", en: "Reflector", ja: "リフレクター", "zh-CN": "反映者", "zh-TW": "反映者" }),
});

export const STRATEGY_NAME = Object.freeze({
  STRATEGY_RESPOND: Object.freeze({ ko: "반응하기", en: "Respond", ja: "反応する", "zh-CN": "回应", "zh-TW": "回應" }),
  STRATEGY_WAIT_FOR_INVITATION: Object.freeze({ ko: "초대를 기다리기", en: "Wait for the invitation", ja: "招待を待つ", "zh-CN": "等待邀请", "zh-TW": "等待邀請" }),
  STRATEGY_INFORM: Object.freeze({ ko: "알리기", en: "Inform", ja: "告知する", "zh-CN": "告知", "zh-TW": "告知" }),
  STRATEGY_WAIT_A_LUNAR_CYCLE: Object.freeze({ ko: "한 달의 주기를 기다리기", en: "Wait a lunar cycle", ja: "月の周期を待つ", "zh-CN": "等待一个月亮周期", "zh-TW": "等待一個月亮週期" }),
});

export const AUTHORITY_NAME = Object.freeze({
  AUTHORITY_EMOTIONAL: Object.freeze({ ko: "감정 권위", en: "Emotional", ja: "感情の権威", "zh-CN": "情绪权威", "zh-TW": "情緒權威" }),
  AUTHORITY_SACRAL: Object.freeze({ ko: "천골 권위", en: "Sacral", ja: "仙骨の権威", "zh-CN": "荐骨权威", "zh-TW": "薦骨權威" }),
  AUTHORITY_SPLENIC: Object.freeze({ ko: "비장 권위", en: "Splenic", ja: "脾臓の権威", "zh-CN": "脾权威", "zh-TW": "脾權威" }),
  AUTHORITY_EGO: Object.freeze({ ko: "에고(하트) 권위", en: "Ego", ja: "エゴ（ハート）の権威", "zh-CN": "自我（心）权威", "zh-TW": "自我（心）權威" }),
  AUTHORITY_SELF_PROJECTED: Object.freeze({ ko: "자기투사 권위", en: "Self-Projected", ja: "自己投射の権威", "zh-CN": "自我投射权威", "zh-TW": "自我投射權威" }),
  AUTHORITY_MENTAL: Object.freeze({ ko: "환경 권위", en: "Mental / Environmental", ja: "環境の権威", "zh-CN": "环境权威", "zh-TW": "環境權威" }),
  AUTHORITY_LUNAR: Object.freeze({ ko: "달 주기 권위", en: "Lunar", ja: "月の周期の権威", "zh-CN": "月亮周期权威", "zh-TW": "月亮週期權威" }),
});

export const DEFINITION_NAME = Object.freeze({
  DEFINITION_NONE: Object.freeze({ ko: "정의 없음", en: "No Definition", ja: "定義なし", "zh-CN": "无定义", "zh-TW": "無定義" }),
  DEFINITION_SINGLE: Object.freeze({ ko: "단일 정의", en: "Single Definition", ja: "単一定義", "zh-CN": "单一定义", "zh-TW": "單一定義" }),
  DEFINITION_SPLIT: Object.freeze({ ko: "분할 정의", en: "Split Definition", ja: "分裂定義", "zh-CN": "分裂定义", "zh-TW": "分裂定義" }),
  DEFINITION_TRIPLE_SPLIT: Object.freeze({ ko: "삼중 분할 정의", en: "Triple Split Definition", ja: "三分裂定義", "zh-CN": "三重分裂定义", "zh-TW": "三重分裂定義" }),
  DEFINITION_QUADRUPLE_SPLIT: Object.freeze({ ko: "사중 분할 정의", en: "Quadruple Split Definition", ja: "四分裂定義", "zh-CN": "四重分裂定义", "zh-TW": "四重分裂定義" }),
});

export const SIGNATURE_NAME = Object.freeze({
  SIGNATURE_SATISFACTION: Object.freeze({ ko: "만족", en: "Satisfaction", ja: "満足", "zh-CN": "满足", "zh-TW": "滿足" }),
  SIGNATURE_SUCCESS: Object.freeze({ ko: "성공", en: "Success", ja: "成功", "zh-CN": "成功", "zh-TW": "成功" }),
  SIGNATURE_PEACE: Object.freeze({ ko: "평화", en: "Peace", ja: "平和", "zh-CN": "平静", "zh-TW": "平靜" }),
  SIGNATURE_SURPRISE: Object.freeze({ ko: "놀라움", en: "Surprise", ja: "驚き", "zh-CN": "惊喜", "zh-TW": "驚喜" }),
});

export const NOT_SELF_NAME = Object.freeze({
  NOT_SELF_FRUSTRATION: Object.freeze({ ko: "좌절", en: "Frustration", ja: "もどかしさ", "zh-CN": "挫败感", "zh-TW": "挫敗感" }),
  NOT_SELF_BITTERNESS: Object.freeze({ ko: "쓴맛", en: "Bitterness", ja: "苦さ", "zh-CN": "苦涩", "zh-TW": "苦澀" }),
  NOT_SELF_ANGER: Object.freeze({ ko: "분노", en: "Anger", ja: "怒り", "zh-CN": "愤怒", "zh-TW": "憤怒" }),
  NOT_SELF_DISAPPOINTMENT: Object.freeze({ ko: "실망", en: "Disappointment", ja: "失望", "zh-CN": "失望", "zh-TW": "失望" }),
});

export const CROSS_ANGLE_NAME = Object.freeze({
  CROSS_ANGLE_RIGHT: Object.freeze({ ko: "라이트 앵글 크로스", en: "Right Angle Cross", ja: "ライトアングル・クロス", "zh-CN": "右角度十字", "zh-TW": "右角度十字" }),
  CROSS_ANGLE_LEFT: Object.freeze({ ko: "레프트 앵글 크로스", en: "Left Angle Cross", ja: "レフトアングル・クロス", "zh-CN": "左角度十字", "zh-TW": "左角度十字" }),
  CROSS_ANGLE_JUXTAPOSITION: Object.freeze({ ko: "저스크타포지션 크로스", en: "Juxtaposition Cross", ja: "ジャクスタポジション・クロス", "zh-CN": "并置十字", "zh-TW": "並置十字" }),
});

export const CENTER_NAME = Object.freeze({
  HEAD: Object.freeze({ ko: "헤드", en: "Head", ja: "ヘッド", "zh-CN": "头脑中心", "zh-TW": "頭腦中心" }),
  AJNA: Object.freeze({ ko: "아즈나", en: "Ajna", ja: "アジナ", "zh-CN": "阿基那中心", "zh-TW": "阿基那中心" }),
  THROAT: Object.freeze({ ko: "목", en: "Throat", ja: "スロート", "zh-CN": "喉咙中心", "zh-TW": "喉嚨中心" }),
  G: Object.freeze({ ko: "G", en: "G", ja: "G", "zh-CN": "G中心", "zh-TW": "G中心" }),
  HEART: Object.freeze({ ko: "하트", en: "Heart", ja: "ハート", "zh-CN": "心中心", "zh-TW": "心中心" }),
  SOLAR_PLEXUS: Object.freeze({ ko: "감정", en: "Solar Plexus", ja: "感情", "zh-CN": "太阳神经丛", "zh-TW": "太陽神經叢" }),
  SACRAL: Object.freeze({ ko: "천골", en: "Sacral", ja: "仙骨", "zh-CN": "荐骨中心", "zh-TW": "薦骨中心" }),
  SPLEEN: Object.freeze({ ko: "비장", en: "Spleen", ja: "脾臓", "zh-CN": "脾中心", "zh-TW": "脾中心" }),
  ROOT: Object.freeze({ ko: "뿌리", en: "Root", ja: "ルート", "zh-CN": "根部中心", "zh-TW": "根部中心" }),
});

export const PLANET_NAME = Object.freeze({
  Sun: Object.freeze({ ko: "태양", en: "Sun", ja: "太陽", "zh-CN": "太阳", "zh-TW": "太陽" }),
  Earth: Object.freeze({ ko: "지구", en: "Earth", ja: "地球", "zh-CN": "地球", "zh-TW": "地球" }),
  Moon: Object.freeze({ ko: "달", en: "Moon", ja: "月", "zh-CN": "月亮", "zh-TW": "月亮" }),
  NorthNode: Object.freeze({ ko: "북교점", en: "North Node", ja: "ノースノード", "zh-CN": "北交点", "zh-TW": "北交點" }),
  SouthNode: Object.freeze({ ko: "남교점", en: "South Node", ja: "サウスノード", "zh-CN": "南交点", "zh-TW": "南交點" }),
  Mercury: Object.freeze({ ko: "수성", en: "Mercury", ja: "水星", "zh-CN": "水星", "zh-TW": "水星" }),
  Venus: Object.freeze({ ko: "금성", en: "Venus", ja: "金星", "zh-CN": "金星", "zh-TW": "金星" }),
  Mars: Object.freeze({ ko: "화성", en: "Mars", ja: "火星", "zh-CN": "火星", "zh-TW": "火星" }),
  Jupiter: Object.freeze({ ko: "목성", en: "Jupiter", ja: "木星", "zh-CN": "木星", "zh-TW": "木星" }),
  Saturn: Object.freeze({ ko: "토성", en: "Saturn", ja: "土星", "zh-CN": "土星", "zh-TW": "土星" }),
  Uranus: Object.freeze({ ko: "천왕성", en: "Uranus", ja: "天王星", "zh-CN": "天王星", "zh-TW": "天王星" }),
  Neptune: Object.freeze({ ko: "해왕성", en: "Neptune", ja: "海王星", "zh-CN": "海王星", "zh-TW": "海王星" }),
  Pluto: Object.freeze({ ko: "명왕성", en: "Pluto", ja: "冥王星", "zh-CN": "冥王星", "zh-TW": "冥王星" }),
});

export const LAYER_NAME = Object.freeze({
  personality: Object.freeze({ ko: "의식", en: "Personality", ja: "意識", "zh-CN": "意识", "zh-TW": "意識" }),
  design: Object.freeze({ ko: "무의식", en: "Design", ja: "無意識", "zh-CN": "无意识", "zh-TW": "無意識" }),
});

/**
 * 표에서 canonical 값을 사람이 읽는 이름으로.
 * 🔴 모르는 값은 **빈 문자열이 아니라 원본**을 돌려준다. 새 canonical 이 추가됐을 때 화면이
 *    조용히 비는 것보다 낯선 코드가 보이는 편이 사고를 빨리 드러낸다.
 */
export function displayName(table, canonical, locale) {
  const entry = table[canonical];
  if (!entry) return String(canonical == null ? "" : canonical);
  return entry[locale] || entry.en || String(canonical);
}
