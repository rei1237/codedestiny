// 빌드타임 CMS 소비 유틸 — 정적 렌더 문구용.
//
// 사용법은 기존 문자열을 폴백으로 감싸는 것뿐이다:
//   <h2>{cmsText("page-copy", "about", "heading", ABOUT_PAGE_COPY.heading)}</h2>
//
// 🔴 폴백 우선. 코드의 기존 문자열을 지우지 않는다.
//   - CMS 가 비어 있거나 빌드 시 조회가 실패해도(fail-soft) 화면이 그대로 나온다.
//   - 서버 렌더 텍스트가 사라지지 않으므로 AdSense 배포 게이트(라우트별 최소 분량)가 안전하다.
//   - 화면 하나씩 점진 이전할 수 있고, 되돌리기도 오버라이드 삭제 한 번이면 된다.
//
// 값의 출처는 scripts/fetch-content-overrides.mjs 가 빌드 직전에 쓴 cms.generated.json 이다.
// 런타임 조회가 아니므로 이 함수는 동기이고 비용이 없다.
import generated from "../../app/_content/cms.generated.json";

type CmsFields = Record<string, unknown>;
type CmsNamespaceEntries = Record<string, CmsFields>;

const entries: Record<string, CmsNamespaceEntries> =
  (generated as { entries?: Record<string, CmsNamespaceEntries> })?.entries || {};

function readField(ns: string, key: string, field: string): unknown {
  return entries?.[ns]?.[key]?.[field];
}

/** 문자열 필드. 오버라이드가 없으면 fallback 을 그대로 돌려준다. */
export function cmsText(ns: string, key: string, field: string, fallback: string): string {
  const value = readField(ns, key, field);
  return typeof value === "string" && value.trim() ? value : fallback;
}

/** 문자열 배열 필드(kind: "lines"). 비어 있으면 fallback. */
export function cmsLines(ns: string, key: string, field: string, fallback: string[]): string[] {
  const value = readField(ns, key, field);
  if (!Array.isArray(value)) return fallback;
  const cleaned = value.map((item) => String(item ?? "").trim()).filter(Boolean);
  return cleaned.length ? cleaned : fallback;
}

export interface CmsQaItem {
  question: string;
  answer: string;
}

/** 질문/답변 목록 필드(kind: "qa-list"). 비어 있으면 fallback. */
export function cmsQaList(ns: string, key: string, field: string, fallback: CmsQaItem[]): CmsQaItem[] {
  const value = readField(ns, key, field);
  if (!Array.isArray(value)) return fallback;

  const cleaned = value
    .map((item) => ({
      question: String((item as CmsQaItem)?.question ?? "").trim(),
      answer: String((item as CmsQaItem)?.answer ?? "").trim(),
    }))
    .filter((item) => item.question && item.answer);

  return cleaned.length ? cleaned : fallback;
}

/**
 * 표 형태 해설 데이터(`Record<키, 값>`)에 오버라이드를 얹는다.
 *
 * 운세 해설 대부분이 "십성 10종 × 5필드" 처럼 고정 키 테이블이다. CMS 에 있는 키만 갈아끼우고
 * 나머지는 코드 기본값 그대로 두므로, 한 항목만 고쳐도 나머지가 사라지지 않는다(부분 편집 안전).
 * 값이 객체면 필드 단위로 병합한다 — 한 필드만 고친 오버라이드가 나머지 필드를 지우면 안 된다.
 *
 * 키를 새로 추가하지는 않는다. 코드가 모르는 키는 어차피 렌더되지 않고,
 * 오타 키가 조용히 쌓이면 편집 화면과 실제 화면이 어긋난다.
 */
export function cmsRecord<T>(ns: string, key: string, fallback: Record<string, T>): Record<string, T> {
  // record 네임스페이스는 필드가 `record` 하나뿐이다(lib/cms/registry.mjs).
  const override = entries?.[ns]?.[key]?.record as Record<string, unknown> | undefined;
  if (!override || typeof override !== "object") return fallback;

  const merged: Record<string, T> = { ...fallback };
  let changed = false;

  for (const [recordKey, value] of Object.entries(override)) {
    if (!(recordKey in fallback) || value === undefined || value === null) continue;

    const base = fallback[recordKey];
    if (base && typeof base === "object" && !Array.isArray(base) && typeof value === "object" && !Array.isArray(value)) {
      merged[recordKey] = { ...base, ...(value as object) } as T;
      changed = true;
      continue;
    }
    if (typeof value === "string" && !value.trim()) continue;
    if (Array.isArray(value) && !value.length) continue;

    merged[recordKey] = value as T;
    changed = true;
  }

  return changed ? merged : fallback;
}

/**
 * 값이 문장 한 줄인 표(`{ 키: "문장" }`)에 오버라이드를 얹는다.
 * 편집 화면에서는 `{ 키: { text: "문장" } }` 형태로 저장되므로 여기서 text 필드를 꺼낸다
 * — 표 편집기 하나로 중첩 표와 평면 표를 함께 다루기 위한 약속이다.
 */
export function cmsRecordFlat(ns: string, key: string, fallback: Record<string, string>): Record<string, string> {
  const table = entries?.[ns]?.[key]?.record as Record<string, unknown> | undefined;
  if (!table || typeof table !== "object") return fallback;

  const merged: Record<string, string> = { ...fallback };
  let changed = false;

  for (const [recordKey, row] of Object.entries(table)) {
    if (!(recordKey in fallback)) continue;
    const value = row && typeof row === "object" && !Array.isArray(row)
      ? (row as Record<string, unknown>).text
      : row;
    if (typeof value !== "string" || !value.trim()) continue;
    merged[recordKey] = value;
    changed = true;
  }

  return changed ? merged : fallback;
}

/**
 * 표에서 한 행만 병합한다. `as const` 로 굳힌 테이블처럼 키별 타입을 지켜야 하는 곳에서 쓴다
 * (`cmsRecord` 는 표 전체를 `Record<string, T>` 로 넓혀 리터럴 타입을 잃는다).
 */
export function cmsRecordRow<T extends object>(ns: string, key: string, recordKey: string, fallback: T): T {
  const table = entries?.[ns]?.[key]?.record as Record<string, unknown> | undefined;
  const row = table?.[recordKey];
  if (!row || typeof row !== "object" || Array.isArray(row)) return fallback;

  const patch: Record<string, unknown> = {};
  for (const [field, value] of Object.entries(row)) {
    if (!(field in fallback)) continue;
    if (typeof value !== "string" || !value.trim()) continue;
    patch[field] = value;
  }

  return Object.keys(patch).length ? { ...fallback, ...patch } : fallback;
}

/** 해당 키에 발행된 오버라이드가 있는지. 관리자 미리보기·검증 스크립트용. */
export function hasCmsEntry(ns: string, key: string): boolean {
  return Boolean(entries?.[ns]?.[key]);
}

/** 바닐라 셸(js/core/cms-static.js)이 받아 갈 build 채널 전체 스냅샷. */
export function getCmsEntriesSnapshot(): Record<string, CmsNamespaceEntries> {
  return entries;
}
