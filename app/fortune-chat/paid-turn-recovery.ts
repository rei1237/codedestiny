type PendingTurn = { body: Record<string, unknown>; completed: boolean };
const keyFor = (sessionId: string) => `cd.guardian.paid-turn:${sessionId}`;

export function readPendingTurn(sessionId: string, includeCompleted = false): PendingTurn | null {
  if (!sessionId) return null;
  try {
    const value = JSON.parse(sessionStorage.getItem(keyFor(sessionId)) || 'null');
    return value?.body?.requestId && (includeCompleted || !value.completed) ? value : null;
  } catch { return null; }
}

export async function requestGuardianTurn(options: {
  url: string; sessionId: string; paid: boolean; body: Record<string, unknown>;
  headers: Record<string, string>; signal: AbortSignal; active: () => boolean;
  fetcher?: typeof fetch; wait?: (ms: number) => Promise<void>;
}) {
  const previous = readPendingTurn(options.sessionId, true);
  const body = previous && previous.body.requestId === options.body.requestId ? previous.body : options.body;
  let retained = options.paid;
  const save = (completed: boolean) => {
    if (!retained || !options.sessionId || !options.active()) return;
    try { sessionStorage.setItem(keyFor(options.sessionId), JSON.stringify({ body, completed })); } catch { /* Server result remains authoritative. */ }
  };
  const wait = options.wait || ((ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms)));
  save(false);
  for (let attempt = 0; attempt < 4; attempt += 1) {
    if (!options.active() || options.signal.aborted) throw new DOMException('Request cancelled', 'AbortError');
    let response;
    try {
      response = await (options.fetcher || fetch)(options.url, { method: 'POST', credentials: 'include', signal: options.signal, headers: options.headers, body: JSON.stringify(body) });
    } catch (error) {
      if (!retained || attempt === 3 || options.signal.aborted || !options.active()) throw error;
      await wait(1500); continue;
    }
    const payload = await response.json().catch(() => null);
    if (!options.active()) return { ok: false, status: response.status, payload: null, stale: true };
    retained ||= payload?.generationSource === 'paid' || payload?.paymentRetainedForRetry === true;
    if (response.status === 200 && payload?.ok) { save(true); return { ok: true, status: 200, payload, stale: false }; }
    if ([401, 402, 403].includes(response.status)) {
      if (options.sessionId) try { sessionStorage.removeItem(keyFor(options.sessionId)); } catch { /* Optional local hint. */ }
      return { ok: false, status: response.status, payload, stale: false };
    }
    save(false);
    if (!retained || ![202, 409, 429, 503].includes(response.status) || payload?.retryable === false || attempt === 3) return { ok: false, status: response.status, payload, stale: false };
    await wait(Math.min(5000, Math.max(1000, Number(payload?.retryAfterMs) || 1500)));
  }
  throw new Error('저장된 상담을 다시 확인해 주세요.');
}
