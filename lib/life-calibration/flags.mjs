// 인생 보정 P2 입력 화면(/profile/life/)과 "한 걸음 더" 진입 스위치. 설계: docs/context/life-calibration.md
// 기본 OFF. 처리방침 개정 시행 뒤 true 로 바꾸고 배포한다. 정적 셸 js/destiny-profile.js 의 같은 이름 상수와
// 값을 함께 바꾼다(__tests__/ui/life-calibration-input.test.mjs 가 묶는다). 서버 API 는 별도 플래그 lifeCalibrationOn(env,'api').

/** /profile/life/ 화면과 프로필 저장 직후 "한 걸음 더" 진입을 켠다. */
export const LIFE_CALIBRATION_INPUT_ENABLED = false;

/** 로컬 화면 검수 전용 미리보기 쿼리. next dev(NODE_ENV=development)에서만 읽는다. */
export const LIFE_CALIBRATION_PREVIEW_PARAM = 'lcPreview';

/**
 * 화면을 보여 줄지 정한다. 상수가 true 이거나, 개발 서버에서 ?lcPreview=1 일 때만 참이다.
 * 프로덕션 빌드는 NODE_ENV 가 'production' 으로 고정 치환되므로 쿼리로 켤 수 없다(fail-closed).
 */
export function lifeCalibrationInputEnabled({ nodeEnv = process.env.NODE_ENV, search = '' } = {}) {
  if (LIFE_CALIBRATION_INPUT_ENABLED === true) return true;
  if (nodeEnv !== 'development') return false;
  try { return new URLSearchParams(String(search || '')).get(LIFE_CALIBRATION_PREVIEW_PARAM) === '1'; } catch { return false; }
}
