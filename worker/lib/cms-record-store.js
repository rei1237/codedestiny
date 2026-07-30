// 워커 해설 표 오버라이드의 런타임 보관소.
//
// 왜 이렇게 하는가: MANSION_DAY_ADVICE·VEDIC_* 같은 표는 리포트 조립 함수 깊숙한 곳에서
// 동기로 읽힌다. 여기에 DB 조회를 먹이려고 그 함수들을 async 로 바꾸면 숙요·베다 유료
// 리포트 경로 전체의 시그니처가 흔들린다. 대신 요청 앞단에서 primeCmsRecords(env) 로
// 값을 채우고, 읽는 쪽은 동기 접근자 하나만 쓴다.
//
// 의존성을 두지 않는다(순수 저장소) — cms-records.js 가 채우고 표 모듈은 읽기만 한다.
// 반대로 엮으면 records -> models -> ... -> records 순환이 생긴다.

let records = {};

/** cms-records.js 가 CMS 조회 결과로 호출한다. */
export function setCmsRecords(next) {
  records = next && typeof next === "object" ? next : {};
}

/** 표의 한 칸. 없으면 fallback 그대로(폴백 우선). */
export function cmsRecordCellSync(ns, key, recordKey, field, fallback) {
  const value = records?.[ns]?.[key]?.[String(recordKey)]?.[field];
  return typeof value === "string" && value.trim() ? value : fallback;
}

/** 표의 한 행을 병합. 문자열 필드만 덮어쓰고 나머지(배열·숫자)는 기본값을 지킨다. */
export function cmsRecordRowSync(ns, key, recordKey, fallback) {
  if (!fallback || typeof fallback !== "object") return fallback;

  const row = records?.[ns]?.[key]?.[String(recordKey)];
  if (!row || typeof row !== "object") return fallback;

  const merged = { ...fallback };
  let changed = false;
  for (const [field, value] of Object.entries(row)) {
    if (!(field in fallback)) continue;
    if (typeof value !== "string" || !value.trim()) continue;
    merged[field] = value;
    changed = true;
  }

  return changed ? merged : fallback;
}
