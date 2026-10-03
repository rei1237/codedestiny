// 점수 가중치·임계값(설계서 §7·§8). 숫자만 둔다 — 로직은 score.ts·candidates.ts.

/** 항목별 가중(합 100). 각 항목 점수는 0~1 로 정규화한 뒤 곱한다. */
export const WEIGHTS = Object.freeze({ saju: 35, suri: 25, sound: 15, practical: 15, samjae: 5, yinyang: 5 });

/** 4격 가중(합 25 = WEIGHTS.suri 와 같은 비율). */
export const SURI_GRID_WEIGHTS = Object.freeze({ jeong: 9, won: 7, hyeong: 6, i: 3 });
export const GRADE_VALUE = Object.freeze({ good: 1, half: 0.5, bad: 0 });
/** 수리오행 배열(원→형→이→정 인접) 보정 폭: 전부 상생 +10%, 전부 상극 −10%. 출처 없는 설계 선택(§6.2). */
export const SURI_FLOW_RANGE = 0.1;

/** 사주 보완 내부 배분(합 35). 기피 오행 글자는 avoid 몫을 잃는 데서 그치지 않고 같은 크기만큼 깎는다. */
export const SAJU_PARTS = Object.freeze({ useful: 20, support: 10, avoid: 5 });
/** 8자+이름 오행 분포 보정: 비어 있던 오행(기피 제외)을 이름이 채우면 하나당 +0.05, 최대 +0.1. */
export const DIST_BONUS = Object.freeze({ perElement: 0.05, max: 0.1 });

/** 자원오행 신뢰도: full 미만은 적중 가중을 비례로 낮추고, floor 미만(미분류)은 완화 3단계 전까지 후보에서 뺀다. */
export const CONFIDENCE = Object.freeze({ full: 0.7, floor: 0.5 });

/** 소리오행 인접 쌍 점수와 같은 오행 3연속 감점(§6.5). */
export const SOUND = Object.freeze({ generate: 1, same: 0.5, control: 0, tripleSamePenalty: 0.25 });

/** 어감·실용 감점(1 에서 뺀다). */
export const PRACTICAL = Object.freeze({
  blacklistWarn: 0.5,
  allBatchim: 0.05, // 성·이름 모든 음절에 받침
  repeatedSyllable: 0.1, // 인접 음절이 같은 소리
  initialRieul: 0.1, // 이름 첫 음절이 ㄹ 로 시작(리융·량후 — 두음 형태가 따로 있다)
  buryongSingleLineage: 0.05, // 불용 관행 — 출처 계열 1개
  buryongMultiLineage: 0.1, // 불용 관행 — 출처 계열 2개 이상
  extA: 0.3, // 확장 A — 입력·글꼴 지원이 약하다
  extBPlus: 0.5, // 확장 B 이상(BMP 밖)
  nonBasicEdu: 0.05, // 교육용 기초한자 밖 — 읽기·쓰기 친숙도
});

export const SEARCH = Object.freeze({
  /** (획수, 소리오행) 칸마다 남기는 글자 수. 2자 이름은 칸 5개 × 획수 쌍 만큼 조합한다. */
  perStrokeSound: 10,
  topK: 200,
  freeCount: 5,
  paidCount: 12,
  mmrLambda: 0.7,
});

/** 완화 단계(§7): 0 엄격 → 1 원격·형격 흉 허용 → 2 정격 반길 허용 → 3 신뢰도 하한·훈 없음·무료 분쟁 제외 해제. 정격 흉은 끝까지 막는다. */
export const MAX_RELAXATION_STAGE = 3;
