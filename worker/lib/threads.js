import { getEnv } from "./env.js";

/**
 * Threads(Meta) 발행 유틸.
 *
 * 🔴 계약은 worker/lib/telegram.js 와 같다 — 토큰이 없든 API 가 거절하든 **절대 throw 하지 않고**
 * 결과 객체를 돌려준다. 호출부는 일일 크론이라 여기서 던지면 같은 실행을 공유하는 나머지
 * 태스크(운세 발송·구독 정산 등)까지 위험해진다. 실패를 사람에게 올리는 일은 태스크가 맡는다.
 *
 * 🔴 액세스 토큰은 **POST 본문에만** 싣는다. Graph API 는 쿼리스트링도 받지만, 쿼리에 실으면
 * 토큰이 URL 에 들어가 로그·에러 리포트·프록시 기록에 남을 수 있다. 그래서 이 파일은 URL 을
 * 조립할 때 토큰을 넣지 않고, 어떤 경우에도 요청 URL 을 로그에 남기지 않는다.
 *
 * 발행은 2단계다(Threads API 규격): 컨테이너 생성 → 발행. 답글은 컨테이너를 만들 때
 * reply_to_id 로 상위 글을 가리킨다. 그래서 N 글짜리 체인은 요청이 2N 회다.
 *
 * fetchImpl 을 주입받는 이유는 검증 스크립트가 **실제 발행 없이** 계약을 확인하기 위해서다
 * (telegram.js 와 같은 관례).
 */

const THREADS_API_BASE = "https://graph.threads.net";
const THREADS_API_VERSION = "v1.0";

// Threads 글 본문 상한. 넘기면 API 가 거절하므로 보내기 전에 호출부에서 자른다 —
// 여기서는 자르지 않고 **거절한다**. 조용히 잘린 글이 공개 채널에 나가는 것보다 안 나가는 게 낫다.
export const THREADS_TEXT_LIMIT = 500;

/**
 * Threads 가 세는 길이. 문서상 상한은 "500자"인데 **이모지는 UTF-8 바이트로 계산한다** —
 * 🌙 한 글자가 3자로 잡힌다. 그래서 String#length 나 [...text].length 로 재면 상한을 넘겨 놓고도
 * 통과한다. BMP 밖 코드포인트(이모지)만 바이트 길이로 세고 나머지는 1로 센다(보수적).
 */
export function threadsTextWeight(text) {
  let weight = 0;
  for (const ch of String(text ?? "")) {
    weight += ch.codePointAt(0) > 0xffff ? new TextEncoder().encode(ch).length : 1;
  }
  return weight;
}

/**
 * Graph API 오류 봉투: {"error":{"message","type","code","error_subcode","fbtrace_id"}}
 *
 * permanent = 사람이 손대야 풀리는 것(토큰 만료·권한). 다음 날 크론이 다시 시도해도 똑같이 실패한다.
 * 그 외(1·2 일시 장애, 4·17·32·613 레이트리밋, 네트워크)는 재시도로 풀릴 수 있으므로 permanent 가 아니다.
 */
function classifyThreadsError(payload, status) {
  const detail = payload && typeof payload === "object" ? payload.error : null;
  const code = Number(detail?.code);
  const type = String(detail?.type || "");
  const message = String(detail?.message || "").trim();

  const permanent = type === "OAuthException" || code === 190 || code === 200 || code === 10 || status === 401 || status === 403;

  return {
    error: message || `http_${status}`,
    code: Number.isFinite(code) ? code : null,
    permanent,
  };
}

/**
 * Graph API 한 번 호출. 토큰은 본문에만 들어간다.
 * @returns {Promise<{ok: boolean, status: number, id?: string, error?: string, code?: number|null, permanent?: boolean}>}
 */
async function callThreadsApi(doFetch, token, endpoint, params) {
  const body = new URLSearchParams(params);
  body.set("access_token", token);

  let response;
  let raw = "";
  try {
    response = await doFetch(`${THREADS_API_BASE}/${THREADS_API_VERSION}/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    raw = await response.text();
  } catch (error) {
    // 🔴 URL 을 찍지 않는다.
    console.error("[THREADS] 요청 자체가 실패:", error?.message || error);
    return { ok: false, status: 0, error: String(error?.message || "threads_request_failed"), permanent: false };
  }

  let payload = null;
  if (raw) {
    try {
      payload = JSON.parse(raw);
    } catch (_parseError) {
      payload = null;
    }
  }

  if (!response.ok || !payload || payload.error) {
    const classified = classifyThreadsError(payload, response.status);
    console.error("[THREADS] 호출 실패:", { endpoint, status: response.status, error: classified.error, permanent: classified.permanent });
    return { ok: false, status: response.status, ...classified };
  }

  const id = String(payload.id || "").trim();
  if (!id) {
    console.error("[THREADS] 응답에 id 가 없다:", { endpoint, status: response.status });
    return { ok: false, status: response.status, error: "missing_id_in_response", permanent: false };
  }

  return { ok: true, status: response.status, id };
}

/**
 * 텍스트 글 하나를 발행한다(컨테이너 생성 → 발행).
 * @param {string} [replyToId] 있으면 그 글의 답글로 붙는다.
 */
async function publishOneThread(doFetch, token, text, replyToId) {
  const params = { media_type: "TEXT", text };
  if (replyToId) params.reply_to_id = replyToId;

  const container = await callThreadsApi(doFetch, token, "me/threads", params);
  if (!container.ok) return container;

  return await callThreadsApi(doFetch, token, "me/threads_publish", { creation_id: container.id });
}

/**
 * 글 여러 개를 답글로 이어 붙여 발행한다. texts[0] 이 루트고, 그다음부터는 **직전에 발행된 글**의
 * 답글로 붙는다(타임라인에서 한 덩어리로 읽힌다).
 *
 * 🔴 중간에 실패하면 이미 나간 글은 되돌리지 않는다 — 지우는 API 를 쓰면 "삭제까지 실패한 상태"가
 * 하나 더 생긴다. 대신 어디까지 나갔는지(ids)와 몇 번째에서 멈췄는지(failedAt)를 그대로 돌려주고,
 * 판단은 호출부(태스크)와 사람이 한다.
 *
 * @param {Object} env
 * @param {Object} options
 * @param {string[]} options.texts 발행할 글들. 각 THREADS_TEXT_LIMIT 이하여야 한다.
 * @param {Function} [options.fetchImpl] 검증용 주입구. 기본값은 전역 fetch.
 * @returns {Promise<{ok: boolean, status: number, ids: string[], error?: string, code?: number|null, permanent?: boolean, failedAt?: number}>}
 */
export async function postThreadsChain(env, options = {}) {
  const { texts, fetchImpl } = options;

  const token = getEnv(env, "THREADS_ACCESS_TOKEN");
  if (!token) {
    console.error("[THREADS] THREADS_ACCESS_TOKEN 이 없다 — 발행을 건너뛴다.");
    return { ok: false, status: 0, ids: [], error: "missing_access_token", permanent: true };
  }

  const chain = Array.isArray(texts) ? texts.map((item) => String(item ?? "").trim()).filter(Boolean) : [];
  if (!chain.length) {
    console.error("[THREADS] 본문이 비어 있다 — 발행을 건너뛴다.");
    return { ok: false, status: 0, ids: [], error: "empty_text", permanent: false };
  }

  const tooLong = chain.findIndex((item) => threadsTextWeight(item) > THREADS_TEXT_LIMIT);
  if (tooLong >= 0) {
    console.error(`[THREADS] ${tooLong + 1}번째 글이 ${THREADS_TEXT_LIMIT}자를 넘는다 — 발행을 건너뛴다.`);
    return { ok: false, status: 0, ids: [], error: "text_too_long", permanent: false, failedAt: tooLong };
  }

  const doFetch = typeof fetchImpl === "function" ? fetchImpl : fetch;
  const ids = [];

  for (let index = 0; index < chain.length; index += 1) {
    const result = await publishOneThread(doFetch, token, chain[index], ids[ids.length - 1]);
    if (!result.ok) {
      return { ...result, ids, failedAt: index };
    }
    ids.push(result.id);
  }

  return { ok: true, status: 200, ids };
}
