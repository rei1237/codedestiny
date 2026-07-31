"use client";

/**
 * 프롬프트 허브의 브라우저 저장소 세 가지 — 무료 체험 카운터, 로그인 재개 스냅샷, 보관함.
 *
 * 🔴 이 카운터는 접근 제어가 아니라 가입 UX 넛지다. 프롬프트 조립이 전부 클라이언트에서
 * 일어나므로(서버 라우트·LLM 호출 없음) 막을 서버 지점 자체가 없고, DevTools 로 이 키를
 * 지우면 그대로 우회된다. 나중에 진짜 강제가 필요해지면 아래 정책 상수를 서버 응답으로
 * 대체하고 게이트 판정을 워커로 옮기면 된다 — 호출부는 그대로 둘 수 있게 상수를 분리해 뒀다.
 */

export const PROMPT_HUB_FREE_GENERATION_LIMIT = 1;
export const PROMPT_HUB_LIBRARY_MAX_ITEMS = 20;
export const PROMPT_HUB_LIBRARY_MAX_PROMPT_CHARS = 12000;
export const PROMPT_HUB_RESUME_TTL_MS = 30 * 60 * 1000;
const RESUME_MAX_SERIALIZED_BYTES = 20 * 1024;

const FREE_USAGE_KEY = "cd:promptHub:freeUses:v1";
const RESUME_KEY = "cd:promptHub:resume:v1";
const LIBRARY_PREFIX = "cd:promptHub:library:v1:";

// 사파리 프라이빗 모드는 스토리지 접근 자체가 throw 한다. 실패는 조용히 흡수한다 —
// 저장이 안 되면 카운터가 늘 0 이라 무제한이 되는데, 소프트 게이트라 의도된 열화다.
function readRaw(store: "local" | "session", key: string): string | null {
  try {
    if (typeof window === "undefined") return null;
    return (store === "local" ? window.localStorage : window.sessionStorage).getItem(key);
  } catch {
    return null;
  }
}

function writeRaw(store: "local" | "session", key: string, value: string): boolean {
  try {
    if (typeof window === "undefined") return false;
    (store === "local" ? window.localStorage : window.sessionStorage).setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function removeRaw(store: "local" | "session", key: string) {
  try {
    if (typeof window === "undefined") return;
    (store === "local" ? window.localStorage : window.sessionStorage).removeItem(key);
  } catch {
    /* noop */
  }
}

/* ── 무료 체험 카운터 (기기 단위, 도구 무관) ───────────────────────────── */

export type PromptHubFreeUsage = { count: number; firstUsedAt: number };

export function readFreeUsage(): PromptHubFreeUsage {
  const raw = readRaw("local", FREE_USAGE_KEY);
  if (!raw) return { count: 0, firstUsedAt: 0 };
  try {
    const parsed = JSON.parse(raw);
    const count = Number(parsed?.count);
    return {
      count: Number.isFinite(count) && count > 0 ? Math.floor(count) : 0,
      firstUsedAt: Number(parsed?.firstUsedAt) || 0,
    };
  } catch {
    return { count: 0, firstUsedAt: 0 };
  }
}

export function hasFreeGenerationLeft(): boolean {
  return readFreeUsage().count < PROMPT_HUB_FREE_GENERATION_LIMIT;
}

export function recordFreeGeneration() {
  const current = readFreeUsage();
  writeRaw(
    "local",
    FREE_USAGE_KEY,
    JSON.stringify({ count: current.count + 1, firstUsedAt: current.firstUsedAt || Date.now() }),
  );
}

/* ── 로그인 재개 스냅샷 ────────────────────────────────────────────────
 * 로그인 화면으로 이탈하면 React state 의 draft 가 사라진다. 돌아왔을 때 다시 입력하게
 * 만들지 않으려고 잠시 보관한다. 생년월일이 들어가므로 sessionStorage(탭 닫으면 소멸) +
 * 읽는 즉시 삭제 + TTL 30분 + 크기 상한으로 노출 범위를 좁혔다. 서버로는 나가지 않는다.
 */

/** 로그인 화면으로 나가기 직전에 누르려던 동작. 돌아왔을 때 그대로 이어서 해 준다. */
export type PromptHubResumeIntent = "generate" | "save";

export type PromptHubResumeSnapshot = {
  v: 1;
  toolId: string;
  draft: Record<string, unknown>;
  intent: PromptHubResumeIntent;
  savedAt: number;
};

export function saveResumeSnapshot(
  toolId: string,
  draft: Record<string, unknown>,
  intent: PromptHubResumeIntent = "generate",
) {
  let serialized = "";
  try {
    serialized = JSON.stringify({ v: 1, toolId, draft, intent, savedAt: Date.now() });
  } catch {
    return;
  }
  if (serialized.length > RESUME_MAX_SERIALIZED_BYTES) return;
  writeRaw("session", RESUME_KEY, serialized);
}

export function consumeResumeSnapshot(): PromptHubResumeSnapshot | null {
  const raw = readRaw("session", RESUME_KEY);
  if (!raw) return null;
  removeRaw("session", RESUME_KEY);
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.v !== 1 || typeof parsed.toolId !== "string" || !parsed.draft) return null;
    const savedAt = Number(parsed.savedAt) || 0;
    if (!savedAt || Date.now() - savedAt > PROMPT_HUB_RESUME_TTL_MS) return null;
    return { ...parsed, intent: parsed.intent === "save" ? "save" : "generate" } as PromptHubResumeSnapshot;
  } catch {
    return null;
  }
}

/* ── 보관함 (로그인 사용자, 이 기기 브라우저 한정) ───────────────────── */

export type PromptLibraryItem = {
  id: string;
  toolId: string;
  toolLabel: string;
  prompt: string;
  generatedAt: string;
  savedAt: number;
};

/**
 * 저장 키를 사용자별로 갈라 둔다 — 계정을 바꾸면 키가 달라지므로 남의 보관함이 보일 수 없다.
 * 게스트는 빈 문자열이 나오고, 호출부는 그때 저장·조회를 하지 않는다.
 */
export function resolveLibraryOwnerKey(
  user: { id?: string; _id?: string; userId?: string; email?: string } | null | undefined,
): string {
  const raw = String(user?.id || user?._id || user?.userId || user?.email || "").trim().toLowerCase();
  if (!raw) return "";
  return raw.replace(/[^a-z0-9_.@-]/g, "").slice(0, 64);
}

function libraryKey(ownerKey: string) {
  return `${LIBRARY_PREFIX}${ownerKey}`;
}

export function readLibrary(ownerKey: string): PromptLibraryItem[] {
  if (!ownerKey) return [];
  const raw = readRaw("local", libraryKey(ownerKey));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is PromptLibraryItem =>
        Boolean(item) && typeof item.id === "string" && typeof item.prompt === "string",
    );
  } catch {
    return [];
  }
}

function persistLibrary(ownerKey: string, items: PromptLibraryItem[]): PromptLibraryItem[] {
  let next = items.slice(0, PROMPT_HUB_LIBRARY_MAX_ITEMS);
  if (writeRaw("local", libraryKey(ownerKey), JSON.stringify(next))) return next;
  // 쿼터 초과면 가장 오래된 절반을 버리고 한 번만 더 시도한다.
  next = next.slice(0, Math.max(1, Math.floor(next.length / 2)));
  if (writeRaw("local", libraryKey(ownerKey), JSON.stringify(next))) return next;
  // 끝내 못 썼다면 요청한 목록이 아니라 저장소의 실제 내용을 돌려준다. 화면에만 저장된 것처럼
  // 보였다가 새로고침에서 사라지는 편이 훨씬 나쁘다.
  return readLibrary(ownerKey);
}

export function saveToLibrary(
  ownerKey: string,
  item: Omit<PromptLibraryItem, "id" | "savedAt">,
): PromptLibraryItem[] {
  if (!ownerKey) return [];
  const prompt = item.prompt.slice(0, PROMPT_HUB_LIBRARY_MAX_PROMPT_CHARS);
  const existing = readLibrary(ownerKey);
  const savedAt = Date.now();
  // 같은 도구에서 같은 문장을 다시 저장하면 새 항목을 쌓지 않고 맨 앞으로 올리기만 한다.
  const deduped = existing.filter((entry) => !(entry.toolId === item.toolId && entry.prompt === prompt));
  return persistLibrary(ownerKey, [
    { ...item, prompt, id: `${item.toolId}-${savedAt}`, savedAt },
    ...deduped,
  ]);
}

export function removeFromLibrary(ownerKey: string, id: string): PromptLibraryItem[] {
  if (!ownerKey) return [];
  return persistLibrary(
    ownerKey,
    readLibrary(ownerKey).filter((entry) => entry.id !== id),
  );
}
