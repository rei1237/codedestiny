// 휴먼 디자인 표시 이름 — ko / en. **순수 데이터 모듈**(의존성 0).
//
// 🔴 이 파일이 이름의 정본이다. 차트 화면(app/human-design/_copy/index.ts)과 프리미엄 리포트
//    플랜(lib/human-design/report-plan.js), 그리고 그 플랜을 조판하는 PDF 가 **같은 표**를 본다.
//    앱 쪽 _copy 에만 두면 PDF 조판기가 app/ 을 import 해야 하고, 사본을 만들면 웹과 PDF 의
//    라벨이 갈린다 — 요구 3("웹과 PDF 가 다른 내용을 만들지 않는다")이 이름에서부터 깨진다.
//
// 🔴 여기 있는 것은 **이름뿐**이다. 서술 문장(summary)은 화면 카피라 _copy 에 남는다.
//    이름은 계산 결과의 라벨이고, 서술은 편집물이라 수명이 다르다.

/** @typedef {{ ko: string, en: string }} Bilingual */

export const TYPE_NAME = Object.freeze({
  TYPE_GENERATOR: Object.freeze({ ko: "제너레이터", en: "Generator" }),
  TYPE_MANIFESTING_GENERATOR: Object.freeze({ ko: "매니페스팅 제너레이터", en: "Manifesting Generator" }),
  TYPE_PROJECTOR: Object.freeze({ ko: "프로젝터", en: "Projector" }),
  TYPE_MANIFESTOR: Object.freeze({ ko: "매니페스터", en: "Manifestor" }),
  TYPE_REFLECTOR: Object.freeze({ ko: "리플렉터", en: "Reflector" }),
});

export const STRATEGY_NAME = Object.freeze({
  STRATEGY_RESPOND: Object.freeze({ ko: "반응하기", en: "Respond" }),
  STRATEGY_WAIT_FOR_INVITATION: Object.freeze({ ko: "초대를 기다리기", en: "Wait for the invitation" }),
  STRATEGY_INFORM: Object.freeze({ ko: "알리기", en: "Inform" }),
  STRATEGY_WAIT_A_LUNAR_CYCLE: Object.freeze({ ko: "한 달의 주기를 기다리기", en: "Wait a lunar cycle" }),
});

export const AUTHORITY_NAME = Object.freeze({
  AUTHORITY_EMOTIONAL: Object.freeze({ ko: "감정 권위", en: "Emotional" }),
  AUTHORITY_SACRAL: Object.freeze({ ko: "천골 권위", en: "Sacral" }),
  AUTHORITY_SPLENIC: Object.freeze({ ko: "비장 권위", en: "Splenic" }),
  AUTHORITY_EGO: Object.freeze({ ko: "에고(하트) 권위", en: "Ego" }),
  AUTHORITY_SELF_PROJECTED: Object.freeze({ ko: "자기투사 권위", en: "Self-Projected" }),
  AUTHORITY_MENTAL: Object.freeze({ ko: "환경 권위", en: "Mental / Environmental" }),
  AUTHORITY_LUNAR: Object.freeze({ ko: "달 주기 권위", en: "Lunar" }),
});

export const DEFINITION_NAME = Object.freeze({
  DEFINITION_NONE: Object.freeze({ ko: "정의 없음", en: "No Definition" }),
  DEFINITION_SINGLE: Object.freeze({ ko: "단일 정의", en: "Single Definition" }),
  DEFINITION_SPLIT: Object.freeze({ ko: "분할 정의", en: "Split Definition" }),
  DEFINITION_TRIPLE_SPLIT: Object.freeze({ ko: "삼중 분할 정의", en: "Triple Split Definition" }),
  DEFINITION_QUADRUPLE_SPLIT: Object.freeze({ ko: "사중 분할 정의", en: "Quadruple Split Definition" }),
});

export const SIGNATURE_NAME = Object.freeze({
  SIGNATURE_SATISFACTION: Object.freeze({ ko: "만족", en: "Satisfaction" }),
  SIGNATURE_SUCCESS: Object.freeze({ ko: "성공", en: "Success" }),
  SIGNATURE_PEACE: Object.freeze({ ko: "평화", en: "Peace" }),
  SIGNATURE_SURPRISE: Object.freeze({ ko: "놀라움", en: "Surprise" }),
});

export const NOT_SELF_NAME = Object.freeze({
  NOT_SELF_FRUSTRATION: Object.freeze({ ko: "좌절", en: "Frustration" }),
  NOT_SELF_BITTERNESS: Object.freeze({ ko: "쓴맛", en: "Bitterness" }),
  NOT_SELF_ANGER: Object.freeze({ ko: "분노", en: "Anger" }),
  NOT_SELF_DISAPPOINTMENT: Object.freeze({ ko: "실망", en: "Disappointment" }),
});

export const CROSS_ANGLE_NAME = Object.freeze({
  CROSS_ANGLE_RIGHT: Object.freeze({ ko: "라이트 앵글 크로스", en: "Right Angle Cross" }),
  CROSS_ANGLE_LEFT: Object.freeze({ ko: "레프트 앵글 크로스", en: "Left Angle Cross" }),
  CROSS_ANGLE_JUXTAPOSITION: Object.freeze({ ko: "저스크타포지션 크로스", en: "Juxtaposition Cross" }),
});

export const CENTER_NAME = Object.freeze({
  HEAD: Object.freeze({ ko: "헤드", en: "Head" }),
  AJNA: Object.freeze({ ko: "아즈나", en: "Ajna" }),
  THROAT: Object.freeze({ ko: "목", en: "Throat" }),
  G: Object.freeze({ ko: "G", en: "G" }),
  HEART: Object.freeze({ ko: "하트", en: "Heart" }),
  SOLAR_PLEXUS: Object.freeze({ ko: "감정", en: "Solar Plexus" }),
  SACRAL: Object.freeze({ ko: "천골", en: "Sacral" }),
  SPLEEN: Object.freeze({ ko: "비장", en: "Spleen" }),
  ROOT: Object.freeze({ ko: "뿌리", en: "Root" }),
});

export const PLANET_NAME = Object.freeze({
  Sun: Object.freeze({ ko: "태양", en: "Sun" }),
  Earth: Object.freeze({ ko: "지구", en: "Earth" }),
  Moon: Object.freeze({ ko: "달", en: "Moon" }),
  NorthNode: Object.freeze({ ko: "북교점", en: "North Node" }),
  SouthNode: Object.freeze({ ko: "남교점", en: "South Node" }),
  Mercury: Object.freeze({ ko: "수성", en: "Mercury" }),
  Venus: Object.freeze({ ko: "금성", en: "Venus" }),
  Mars: Object.freeze({ ko: "화성", en: "Mars" }),
  Jupiter: Object.freeze({ ko: "목성", en: "Jupiter" }),
  Saturn: Object.freeze({ ko: "토성", en: "Saturn" }),
  Uranus: Object.freeze({ ko: "천왕성", en: "Uranus" }),
  Neptune: Object.freeze({ ko: "해왕성", en: "Neptune" }),
  Pluto: Object.freeze({ ko: "명왕성", en: "Pluto" }),
});

export const LAYER_NAME = Object.freeze({
  personality: Object.freeze({ ko: "의식", en: "Personality" }),
  design: Object.freeze({ ko: "무의식", en: "Design" }),
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
