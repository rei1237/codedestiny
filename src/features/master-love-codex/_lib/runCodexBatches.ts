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
  loveDna?: CodexLoveDna | null;
  totalCharCount?: number;
  totalChapters?: number;
  birthInfo?: Record<string, unknown> | null;
  partnerInfo?: unknown;
  done?: boolean;
  paymentPayload?: Record<string, unknown>;
};

export async function postCodexJson(url: string, body: Record<string, unknown>, idempotencyKey?: string) {
  const response = await authFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}) },
    credentials: "include",
    body: JSON.stringify(body),
  }, { retryOn401: false });
  let data = (await response.json().catch(() => null)) as CodexSessionPayload | null;
  // 🔴 엣지 컷(524)·게이트웨이 오류는 JSON 이 아니라 HTML 을 돌려준다. 예전처럼 {} 로 뭉개면
  //    상태 코드까지 사라져 "일시적 지연"과 "확정 실패"를 구분할 수 없게 되고, 모든 실패가
  //    같은 제네릭 문구 하나로 표면화된다. 본문이 없으면 상태 코드로 사유를 세운다.
  if (!data) {
    data = response.ok
      ? { ok: false, reason: "SERVER_ERROR" }
      : { ok: false, reason: response.status >= 500 ? "EDGE_TIMEOUT" : "SERVER_ERROR", retryable: response.status >= 500 };
  }
  return { status: response.status, data };
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
  const response = await authFetch(
    `/api/master-love-codex/session?sessionId=${encodeURIComponent(sessionId)}`,
    { cache: "no-store", credentials: "include" },
  );
  const data = (await response.json().catch(() => null)) as CodexSessionPayload | null;
  return { status: response.status, data };
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
  let written = Array.isArray(seed.chapters) ? seed.chapters.length : 0;
  let batches = 0;
  let retries = 0;
  let noProgress = 0;
  let stallStartedAt = 0;

  while (!(current.done || String(current.status) === "completed")) {
    if (shouldStop?.()) return current;
    if (batches >= MAX_BATCHES) throw new Error(errorText.GENERATION_BUDGET_EXCEEDED);
    const { status, data } = await postCodexJson("/api/master-love-codex/generate", { sessionId, accessToken: token })
      .catch(() => ({ status: 503, data: { ok: false, retryable: true, reason: "NETWORK_ERROR" } as CodexSessionPayload }));
    if (shouldStop?.()) return current;

    if (!data?.ok) {
      // 일시적 실패(409 재기동 대기 · 503 예산 초과/DB 블립 · 엣지 컷)는 종료 사유가 아니다.
      // 판정은 다른 유료 화면 10곳이 쓰는 공용 함수를 그대로 재사용한다(중복 구현 금지).
      if (!stallStartedAt) stallStartedAt = Date.now();
      const withinStallBudget = Date.now() - stallStartedAt < stallBudgetMs;
      if (isRetriableResultPollFailure(status, data) && withinStallBudget) {
        retries += 1;
        const delayMs = Math.min(8000, Math.round(1500 * 1.8 ** Math.min(retries - 1, 4)));
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        // 🔴 백오프 뒤에 곧장 /generate 를 또 치지 않고 세션을 한 번 읽는다. 409
        //    GENERATION_IN_PROGRESS 는 서버 회수 크론이 락을 쥔 **정상 상태**이기도 해서,
        //    그 사이 늘어난 장을 흡수하지 않으면 화면이 멈춘 것처럼 보이고 정체 예산만 탄다.
        if (shouldStop?.()) return current;
        const polled = await fetchCodexSession(sessionId).catch(() => ({ status: 503, data: null }));
        if (shouldStop?.()) return current;
        const chapters = Array.isArray(polled.data?.chapters) ? polled.data.chapters : [];
        if (polled.data?.ok && (chapters.length > written || polled.data.status === "completed" || polled.data.done)) {
          written = chapters.length;
          current = polled.data;
          if (polled.data.accessToken) token = polled.data.accessToken;
          retries = 0;
          stallStartedAt = 0;
          noProgress = 0;
          onProgress?.(polled.data);
        }
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
    if (chapters.length > written) { written = chapters.length; noProgress = 0; } else { noProgress += 1; }
    if (!(current.done || current.status === "completed") && noProgress >= MAX_NO_PROGRESS_BATCHES) throw new Error(errorText.GENERATION_BUDGET_EXCEEDED);
  }
  return current;
}
