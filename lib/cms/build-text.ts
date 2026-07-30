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

/** 해당 키에 발행된 오버라이드가 있는지. 관리자 미리보기·검증 스크립트용. */
export function hasCmsEntry(ns: string, key: string): boolean {
  return Boolean(entries?.[ns]?.[key]);
}
