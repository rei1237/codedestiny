import type { LLMRequest, LLMResponse } from "./llm-client";

export interface CacheStore {
  get(key: string): Promise<LLMResponse | null>;
  set(key: string, value: LLMResponse, ttlSeconds: number): Promise<void>;
}

export interface LLMCacheConfig {
  store?: CacheStore;
  deterministic?: boolean;
  ttlSeconds?: number;
  keyExtra?: string;
  // 이번 호출만 캐시 조회를 건너뛴다(쓰기는 유지). 캐시는 기능별 품질 검증 이전 단계라
  // 검증에서 떨어진 응답도 저장되는데, 그 뒤 재시도가 같은 키로 같은 실패를 반복한다.
  // 쓰기를 살려 두면 성공한 재시도가 그 키를 덮어써 스스로 낫는다.
  skipRead?: boolean;
}

const DEFAULT_TTL_SECONDS = 30 * 24 * 60 * 60;

const textEncoder = new TextEncoder();

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error || "unknown error");
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", textEncoder.encode(input));
  const bytes = new Uint8Array(digest);
  let hex = "";
  for (let i = 0; i < bytes.length; i += 1) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}

// 이미지 base64(inline_data.data)는 매우 길어 키에 그대로 넣지 않고 개별 해시로 축약한다.
async function summarizeGeminiParts(
  parts: LLMRequest["geminiParts"],
): Promise<Array<Record<string, unknown>> | null> {
  if (!Array.isArray(parts) || !parts.length) return null;
  const summarized: Array<Record<string, unknown>> = [];
  for (const part of parts) {
    if (part?.inline_data?.data) {
      summarized.push({
        text: String(part.text || ""),
        inline_data: {
          mime_type: String(part.inline_data.mime_type || ""),
          dataHash: await sha256Hex(String(part.inline_data.data)),
        },
      });
    } else {
      summarized.push({ text: String(part?.text || "") });
    }
  }
  return summarized;
}

// callLLM 이 실제로 프로바이더에 전달하는 필드만 정규화해 SHA-256 해시한다.
// (topP/modelEnvKeys/retry 등 버려지는 옵션은 키에 넣지 않는다.)
export async function buildCacheKey(request: LLMRequest, keyExtra = ""): Promise<string> {
  const normalized = {
    prompt: String(request.prompt || "").trim(),
    systemPrompt: String(request.systemPrompt || "").trim(),
    taskType: request.taskType || "general",
    maxTokens: Number(request.maxTokens) || 0,
    temperature: Number.isFinite(Number(request.temperature)) ? Number(request.temperature) : null,
    responseMimeType: String(request.responseMimeType || ""),
    model: String(request.model || ""),
    geminiParts: await summarizeGeminiParts(request.geminiParts),
    keyExtra: String(keyExtra || ""),
  };
  return sha256Hex(JSON.stringify(normalized));
}

// 같은 캐시 키로 이미 진행 중인 호출이 있으면 그 Promise를 공유한다 (isolate-local in-flight dedup).
const inflightMap = new Map<string, Promise<LLMResponse>>();

export function deduplicatedCall(
  cacheKey: string,
  callFn: () => Promise<LLMResponse>,
): Promise<LLMResponse> {
  const existing = inflightMap.get(cacheKey);
  if (existing) return existing;
  const promise = callFn().finally(() => {
    inflightMap.delete(cacheKey);
  });
  inflightMap.set(cacheKey, promise);
  return promise;
}

// 캐시 저장소(Mongo)가 느리거나 응답하지 않아도 LLM 생성 흐름을 막지 않도록 하는 상한.
// get 이 이 시간을 넘기면 캐시 미스로 간주하고 바로 생성으로 진행한다.
const CACHE_GET_TIMEOUT_MS = 1500;
// set 이 이 시간을 넘기면 포기한다. 캐시 쓰기는 best-effort 이므로 사용자 응답을 지연시키지 않는다.
const CACHE_SET_TIMEOUT_MS = 2000;

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

// 결정적 호출은 캐시 + dedup, 비결정적 호출은 dedup 만 적용한다.
// 캐시 히트든 미스든 결제/DB 저장은 호출자(라우트) 흐름에서 그대로 실행되므로 이 레이어는 관여하지 않는다.
// 캐시는 순수 부가기능이다: 키 생성/조회/저장의 어떤 실패·지연도 생성 흐름을 절대 막거나 늦추면 안 된다.
export async function withLLMCache(
  request: LLMRequest,
  callUncached: (request: LLMRequest) => Promise<LLMResponse>,
  config: LLMCacheConfig,
): Promise<LLMResponse> {
  const store = config?.store;
  const deterministic = config?.deterministic === true;
  const ttlSeconds = Number(config?.ttlSeconds) > 0 ? Number(config.ttlSeconds) : DEFAULT_TTL_SECONDS;

  // 캐시 키 생성이 실패하면 캐시/dedup 을 건너뛰고 바로 호출한다(생성이 막히면 안 됨).
  let cacheKey: string;
  try {
    cacheKey = await buildCacheKey(request, config?.keyExtra);
  } catch (error) {
    console.warn("[llm-cache] cache key build failed; bypassing cache:", getErrorMessage(error));
    return callUncached(request);
  }

  // 1. 캐시 조회 (결정적 호출만). 저장소가 느리면 타임아웃하고 생성으로 진행한다.
  if (deterministic && store && config?.skipRead !== true) {
    try {
      const cached = await withTimeout(store.get(cacheKey), CACHE_GET_TIMEOUT_MS, null);
      if (cached && cached.text) {
        if (request.logContext) request.logContext.cacheHit = true;
        console.info("[llm cache_hit]", {
          taskType: request.taskType || "general",
          provider: cached.provider,
          model: cached.model,
          keyPrefix: cacheKey.slice(0, 12),
        });
        return cached;
      }
    } catch (error) {
      console.warn("[llm-cache] cache lookup failed:", getErrorMessage(error));
    }
  }

  // 2. Dedup + 실제 호출
  const result = await deduplicatedCall(cacheKey, () => callUncached(request));

  // 3. 캐시 저장 (결정적 호출만, best-effort). 응답을 지연시키지 않도록 상한을 둔다.
  // 잘린 응답(truncated)은 저장하지 않는다 — TTL 동안 잘린 텍스트가 고정되는 것을 방지.
  if (deterministic && store && result?.text && !result.truncated) {
    try {
      await withTimeout(
        store.set(cacheKey, result, ttlSeconds).catch((error) => {
          console.warn("[llm-cache] cache write failed:", getErrorMessage(error));
        }),
        CACHE_SET_TIMEOUT_MS,
        undefined,
      );
    } catch (error) {
      console.warn("[llm-cache] cache write timed out:", getErrorMessage(error));
    }
  }

  return result;
}
