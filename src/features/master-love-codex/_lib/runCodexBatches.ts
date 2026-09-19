/**
 * 인연의 서 배치 생성 루프 — **정본 하나**.
 *
 * 20장을 4장씩 나눠 /generate 를 왕복하는 이 루프는 원래 진입 화면(MasterLoveCodexPage)에만
 * 있었다. 그래서 완주하려면 그 탭이 5~10분 포그라운드로 살아 있어야 했고, PG 리다이렉트로
 * 돌아온 모바일 문서가 정확히 그 조건을 못 채워 "결제했는데 책이 미완성"이 반복됐다.
 *
 * 🔴 이 파일을 복제하지 않는다. 진입 화면과 결과 화면(/master-love-codex/result)이 같은 함수를
 *    import 한다 — 결과 화면이 이어쓰기 주체가 되면서 "탭을 붙잡아야 한다"가 "읽기 화면에
 *    머물면 된다"로 바뀐다.
 * 🔴 서버 쪽 waitUntil 백그라운드 생성으로 대체하지 않는다. 9850c890 이 그 패턴을 7개 라우트에서
 *    되돌렸다 — 공유 mongoose 연결을 여러 요청이 재사용해 Workers 요청 간 I/O 격리로 결과가
 *    고착됐다(네오 92%). 20장 390초 홀딩은 그 실패의 최악 케이스다.
 */

import { authFetch } from "@/app/_lib/auth-client";
import { isRetriableResultPollFailure } from "@/app/_lib/consultationResultPolling";
import type { MasterLoveCodexErrorText } from "./copy";
import type { CodexChapter, CodexLoveDna } from "../components/CodexReader";
import type { CodexOutlineEntry } from "../data/acts";

// 서버가 예산을 넘기면 4장이 아니라 1~3장만 커밋하고 돌아온다(worker/routes/master-love-codex.js).
// 그래서 왕복 수는 20/4=5 회로 고정되지 않는다 — 최악(장당 1회)까지 여유를 둔 터미널 가드다.
export const MAX_BATCHES = 32;
// 200 을 받았는데 장이 하나도 안 늘어난 경우의 상한. 서버는 1장 이상 커밋하거나 503 을 주므로
// 정상 경로에서는 발생하지 않는다 — 순수 무한루프 방지용이다.
export const MAX_NO_PROGRESS_BATCHES = 3;
// 🔴 '연속 실패'가 이어지는 시간의 상한이다(생성 시작 시각 기준이 아니다). 성공 배치가 하나라도
//    끼면 초기화된다 — 20장 생성은 정상적으로도 몇 분이 걸려서, 시작 기준으로 재면 후반 배치의
//    일시적 실패에는 완충이 하나도 남지 않는다.
//    서버 배치 락 TTL(120초)보다 길어야 엣지 컷 뒤 남은 락이 풀릴 때까지 버틴다.
export const GENERATION_STALL_BUDGET_MS = 240_000;

/**
 * 서버가 내구 상태에서 유도한 진행 상황(worker/routes/master-love-codex.js publicSession).
 *
 * 🔴 화면이 이 값을 다시 계산하지 않는다. `percent` 는 서버가 `(K + F) / (N + 1)` 로 준 값이고,
 *    전 장이 저장돼도 완료 확정 전에는 100 이 되지 않는다. 프런트에서 클램프·보간·예상 시간으로
 *    앞질러 그리면 "1장만 있는 책이 100%" 가 다시 만들어진다.
 * 구버전 응답에는 `validated` 이후 필드가 없다 — 그때는 없는 대로 두고 추측하지 않는다.
 */
export type CodexGenerationProgress = {
  completed: number;
  readable?: number;
  total: number;
  /** 검증·저장까지 끝난 고유 장 수(K) */
  validated?: number;
  /** 최종 확정까지 끝났을 때만 1(F) */
  finalized?: number;
  percent?: number;
  /** pending | writing | validating | saving | retrying | finalizing | failed | complete */
  step?: string;
  currentChapter?: { id?: string; order?: number; symbol?: string; title?: string } | null;
  blockedChapterIds?: string[];
};

export type CodexSessionPayload = {
  ok?: boolean;
  reason?: string;
  message?: string;
  /** 서버가 "일시적이니 다시 불러도 된다"고 표시한 응답 — 공용 판정(isRetriableResultPollFailure)이 읽는다 */
  retryable?: boolean;
  sessionId?: string;
  status?: string;
  accessToken?: string;
  accessType?: string;
  mode?: string;
  chapters?: CodexChapter[];
  /**
   * 기대 장 목록. 본문(`chapters`)과 달리 **아직 안 쓰인 장까지** 들어 있어, 화면이 구매한
   * 구성 전부를 그릴 수 있게 한다. 구버전 응답에는 없으므로 선택 필드다.
   */
  outline?: CodexOutlineEntry[];
  generationProgress?: CodexGenerationProgress;
  retryAfterMs?: number;
  loveDna?: CodexLoveDna | null;
  totalCharCount?: number;
  totalChapters?: number;
  birthInfo?: Record<string, unknown> | null;
  partnerInfo?: unknown;
  done?: boolean;
  /** 문서가 마지막으로 바뀐 시각 — 늦게 도착한 옛 응답이 새 상태를 되돌리지 않게 비교한다 */
  updatedAt?: string | null;
  paymentPayload?: Record<string, unknown>;
};

export async function postCodexJson(url: string, body: Record<string, unknown>, idempotencyKey?: string) {
  return codexJson(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}) },
    credentials: "include",
    body: JSON.stringify(body),
  }, 95_000);
}

/** The deadline and AbortSignal cover headers AND the JSON response body. */
export async function codexJson(url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      (async () => {
        const response = await authFetch(url, { ...init, signal: controller.signal }, { retryOn401: false, forceFresh: true });
        let data = (await response.json().catch(error => {
          if (controller.signal.aborted) throw error;
          return null;
        })) as CodexSessionPayload | null;
        // Gateway HTML has no JSON; preserve its HTTP retry semantics.
        if (!data) {
          data = response.ok
            ? { ok: false, reason: "SERVER_ERROR" }
            : { ok: false, reason: response.status >= 500 ? "EDGE_TIMEOUT" : "SERVER_ERROR", retryable: response.status >= 500 };
        }
        return { status: response.status, data };
      })(),
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => { controller.abort(); reject(new Error("CODEX_RESPONSE_TIMEOUT")); }, timeoutMs);
      }),
    ]);
  } finally { if (timer !== undefined) clearTimeout(timer); }
}

export function mapCodexError(data: CodexSessionPayload | null, status: number, errorText: MasterLoveCodexErrorText) {
  const reason = String(data?.reason || "").toUpperCase() as keyof MasterLoveCodexErrorText;
  const serverMessage = String(data?.message || "").trim();
  // SERVER_ERROR 는 서버가 상황을 훨씬 정확히 안다 — 제네릭 상수로 덮어쓰면
  // "결제와 지금까지 쓰인 장은 보존됩니다" 같은 안내가 사용자에게 영영 닿지 않는다.
  // (다른 사유는 기존 문구를 그대로 쓴다 — 이 화면의 표현 계약이 바뀌지 않게.)
  if (reason === "SERVER_ERROR" && serverMessage) return serverMessage;
  if (reason && errorText[reason]) return errorText[reason];
  if (status === 401) return errorText.LOGIN_REQUIRED;
  if (status === 402) return errorText.PAYMENT_VERIFY_FAILED;
  return serverMessage || errorText.SERVER_ERROR;
}

/** 세션 1회 조회. 백오프 중 크론(회수 태스크)이 밀어 놓은 진척을 흡수하는 데 쓴다. */
export async function fetchCodexSession(sessionId: string) {
  return codexJson(
    `/api/master-love-codex/session?sessionId=${encodeURIComponent(sessionId)}`,
    { cache: "no-store", credentials: "include" }, 25_000,
  );
}

export type RunCodexBatchesOptions = {
  sessionId: string;
  accessToken: string;
  /** 직전에 받은 세션 응답(= /start 또는 /session 결과). 여기 담긴 장 수가 진행 기준선이다. */
  seed: CodexSessionPayload;
  errorText: MasterLoveCodexErrorText;
  /** 배치가 하나 커밋될 때마다 최신 세션을 흘려보낸다 — 화면 갱신·핸드오프 판단용. */
  onProgress?: (session: CodexSessionPayload) => void;
  /** true 를 돌려주면 루프를 즉시 멈춘다(다른 화면에 이어쓰기를 넘긴 경우). */
  shouldStop?: () => boolean;
  stallBudgetMs?: number;
};

/**
 * 남은 장을 끝까지 쓴다. 화면 이동·상태 표시는 하지 않는다 — 호출부의 몫이다.
 * 완주(또는 shouldStop) 시점의 세션 응답을 돌려준다.
 */
export async function runCodexBatches({
  sessionId, accessToken, seed, errorText, onProgress, shouldStop,
  stallBudgetMs = GENERATION_STALL_BUDGET_MS,
}: RunCodexBatchesOptions): Promise<CodexSessionPayload> {
  let token = accessToken;
  let current = seed;
  let written = Math.max(seed.chapters?.length || 0, seed.generationProgress?.completed || 0);
  let batches = 0;
  let retries = 0;
  let noProgress = 0;
  let stallStartedAt = 0;

  while (!(current.done || String(current.status) === "completed")) {
    if (shouldStop?.()) return current;
    if (current.retryable === false) throw new Error(mapCodexError(current, 503, errorText));
    if (Number(current.retryAfterMs) > 0) {
      if (!stallStartedAt) stallStartedAt = Date.now();
      if (Date.now() - stallStartedAt >= stallBudgetMs) throw new Error(mapCodexError(current, 503, errorText));
      const delay = Math.min(8000, Number(current.retryAfterMs));
      await new Promise(resolve => setTimeout(resolve, delay));
      if (shouldStop?.()) return current;
      const polled = await fetchCodexSession(sessionId).catch(() => ({ status: 503, data: null }));
      if (shouldStop?.()) return current;
      current = polled.data?.ok ? polled.data : { ...current, retryAfterMs: Math.max(0, Number(current.retryAfterMs) - delay) };
      if (current.accessToken) token = current.accessToken;
      const saved = current.generationProgress?.completed ?? current.chapters?.length ?? 0;
      if (saved > written) { written = saved; stallStartedAt = 0; noProgress = 0; }
      onProgress?.(current);
      continue;
    }
    if (batches >= MAX_BATCHES) throw new Error(errorText.GENERATION_BUDGET_EXCEEDED);
    const { status, data } = await postCodexJson("/api/master-love-codex/generate", { sessionId, accessToken: token })
      .catch(() => ({ status: 503, data: { ok: false, retryable: true, reason: "NETWORK_ERROR" } as CodexSessionPayload }));
    if (shouldStop?.()) return current;

    if (!data?.ok) {
      // 일시적 실패(409 재기동 대기 · 503 예산 초과/DB 블립 · 엣지 컷)는 종료 사유가 아니다.
      // 판정은 다른 유료 화면 10곳이 쓰는 공용 함수를 그대로 재사용한다(중복 구현 금지).
      if (!stallStartedAt) stallStartedAt = Date.now();
      const withinStallBudget = Date.now() - stallStartedAt < stallBudgetMs;
      if (data?.retryable !== false && isRetriableResultPollFailure(status, data) && withinStallBudget) {
        retries += 1;
        const delayMs = Math.min(8000, Number(data?.retryAfterMs) || Math.round(1500 * 1.8 ** Math.min(retries - 1, 4)));
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        // 🔴 백오프 뒤에 곧장 /generate 를 또 치지 않고 세션을 한 번 읽는다. 409
        //    GENERATION_IN_PROGRESS 는 서버 회수 크론이 락을 쥔 **정상 상태**이기도 해서,
        //    그 사이 늘어난 장을 흡수하지 않으면 화면이 멈춘 것처럼 보이고 정체 예산만 탄다.
        if (shouldStop?.()) return current;
        const polled = await fetchCodexSession(sessionId).catch(() => ({ status: 503, data: null }));
        if (shouldStop?.()) return current;
        const chapters = Array.isArray(polled.data?.chapters) ? polled.data.chapters : [];
        const saved = Math.max(chapters.length, polled.data?.generationProgress?.completed || 0);
        if (polled.data?.ok) {
          current = polled.data;
          if (polled.data.accessToken) token = polled.data.accessToken;
          if (saved > written || polled.data.status === "completed" || polled.data.done) {
            written = saved; retries = 0; stallStartedAt = 0; noProgress = 0;
          }
          onProgress?.(polled.data);
        } else if (Number(data?.retryAfterMs) > delayMs) current = { ...current, retryAfterMs: Number(data.retryAfterMs) - delayMs };
        continue;
      }
      throw new Error(mapCodexError(data, status, errorText));
    }

    batches += 1;
    retries = 0;
    stallStartedAt = 0;
    if (data.accessToken) token = data.accessToken;
    current = data;
    const chapters = Array.isArray(data.chapters) ? data.chapters : [];
    onProgress?.(data);
    // 서버는 1장 이상 커밋하거나 503 을 준다. 진행 없는 200 이 이어지면 그건 무한루프다.
    const saved = Math.max(chapters.length, data.generationProgress?.completed || 0);
    if (saved > written) { written = saved; noProgress = 0; } else { noProgress += 1; }
    if (!(current.done || current.status === "completed") && noProgress >= MAX_NO_PROGRESS_BATCHES) throw new Error(errorText.GENERATION_BUDGET_EXCEEDED);
  }
  return current;
}
