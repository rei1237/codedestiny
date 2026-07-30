// lib/cms/build-text.ts 의 테스트용 대역.
//
// 이 레포의 Jest 에는 TS 프리셋이 없다(package-lock.json 을 건드리지 않고는 devDependency 를
// 추가할 수 없음 — jest.config.cjs 상단 주석 참고). constants/*.js 같은 순수 JS 모듈이
// CMS 폴백 유틸을 물면서 파싱 단계에서 깨지므로 여기서 대체한다.
//
// 테스트 환경에는 발행된 오버라이드가 없다. 따라서 "항상 코드 기본값을 돌려준다"가
// 실제 동작과 정확히 같다 — 폴백 우선 원칙이 테스트에서도 그대로 검증된다.

function cmsText(ns, key, field, fallback) {
  return fallback;
}

function cmsLines(ns, key, field, fallback) {
  return fallback;
}

function cmsQaList(ns, key, field, fallback) {
  return fallback;
}

function cmsRecord(ns, key, fallback) {
  return fallback;
}

function cmsRecordFlat(ns, key, fallback) {
  return fallback;
}

function cmsRecordRow(ns, key, recordKey, fallback) {
  return fallback;
}

function hasCmsEntry() {
  return false;
}

function getCmsEntriesSnapshot() {
  return {};
}

module.exports = {
  cmsText,
  cmsLines,
  cmsQaList,
  cmsRecord,
  cmsRecordFlat,
  cmsRecordRow,
  hasCmsEntry,
  getCmsEntriesSnapshot,
};
