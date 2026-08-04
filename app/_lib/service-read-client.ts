import { authFetch } from "./auth-client";
import { isRetryableReadStatus, normalizeApiError, readJsonSafely, retryAfterMs } from "./api-contract";

type ServiceReadOptions = {
  apiBase?: string;
  clientSource?: string;
  retryOn401?: boolean;
  signal?: AbortSignal;
  maxRetries?: number;
  circuitKey?: string;
  circuitCooldownMs?: number;
};

type ReadCircuitState = { failures: number; openUntil: number };

const readCircuits = new Map<string, ReadCircuitState>();
const DEFAULT_CIRCUIT_COOLDOWN_MS = 5_000;

function circuitKeyFor(input: string, options: ServiceReadOptions) {
  if (options.circuitKey) return String(options.circuitKey);
  try {
    return `${String(options.clientSource || "service-read")}::${new URL(input, window.location.origin).pathname}`;
  } catch {
    return `${String(options.clientSource || "service-read")}::${input}`;
  }
}

function circuitOpenError(circuitKey: string) {
  const error = new Error("현재 조회 요청을 잠시 중단했습니다. 잠시 후 다시 확인해 주세요.");
  Object.assign(error, {
    status: 503,
    code: "READ_CIRCUIT_OPEN",
    retryable: true,
    circuitKey,
  });
  return error;
}

function recordCircuitSuccess(circuitKey: string) {
  readCircuits.delete(circuitKey);
}

function recordCircuitFailure(circuitKey: string, cooldownMs: number) {
  const previous = readCircuits.get(circuitKey);
  const failures = (previous?.failures || 0) + 1;
  readCircuits.set(circuitKey, {
    failures,
    openUntil: failures >= 2 ? Date.now() + cooldownMs : 0,
  });
}

function sleep(ms: number, signal?: AbortSignal) {
  if (ms <= 0) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(resolve, ms);
    const abort = () => {
      window.clearTimeout(timer);
      reject(new DOMException("The operation was aborted.", "AbortError"));
    };
    if (signal?.aborted) {
      abort();
      return;
    }
    signal?.addEventListener("abort", abort, { once: true });
  });
}

export async function readServiceJson<T>(
  input: string,
  init: RequestInit = {},
  options: ServiceReadOptions = {},
): Promise<{ response: Response; data: T }> {
  const maxRetries = Math.max(0, Math.min(1, Math.floor(Number(options.maxRetries ?? 1))));
  const signal = options.signal ?? init.signal ?? undefined;
  const circuitKey = circuitKeyFor(input, options);
  const circuit = readCircuits.get(circuitKey);
  if (circuit?.openUntil && circuit.openUntil > Date.now()) throw circuitOpenError(circuitKey);
  if (circuit?.openUntil && circuit.openUntil <= Date.now()) readCircuits.delete(circuitKey);
  const circuitCooldownMs = Math.max(1_000, Math.min(60_000, Number(options.circuitCooldownMs ?? DEFAULT_CIRCUIT_COOLDOWN_MS)));
  let attempt = 0;

  while (true) {
    const response = await authFetch(input, {
      ...init,
      method: "GET",
      signal,
    }, {
      apiBase: options.apiBase,
      clientSource: options.clientSource,
      retryOn401: options.retryOn401 !== false,
    });
    const payload = await readJsonSafely(response);
    if (response.ok) {
      recordCircuitSuccess(circuitKey);
      return { response, data: payload as T };
    }

    const apiError = normalizeApiError(response, payload);
    if (!apiError.retryable || !isRetryableReadStatus(response.status) || attempt >= maxRetries) {
      if (isRetryableReadStatus(response.status)) recordCircuitFailure(circuitKey, circuitCooldownMs);
      const error = new Error(apiError.message);
      Object.assign(error, apiError);
      throw error;
    }

    attempt += 1;
    const retryAfter = retryAfterMs(response);
    const backoff = retryAfter ?? Math.min(5_000, 400 * (2 ** (attempt - 1)) + Math.floor(Math.random() * 200));
    await sleep(backoff, signal);
  }
}
