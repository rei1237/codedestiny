export type OracleDeliveryResponse = {
  ok?: boolean; status?: string; saved?: boolean; retryable?: boolean; busy?: boolean;
  resultId?: string; code?: string; reason?: string; completedParts?: string[]; totalParts?: number;
  sections?: { key: string; title: string; body: string }[];
  resumeInputs?: Record<string, unknown>; consultation?: unknown;
  reading?: unknown; deliverySections?: { key: string; title: string; body: string }[];
};

// Before checkout, send the exact first POST body through the same authFetch (its locale rewrite included) so
// the server keeps it as a payment intent (worker/lib/paid-narrative-intent.js): a page that dies after payment
// still leaves the server its input. The reply is unused and checkout never waits more than 1.5 s for it.
export function registerPaidNarrativeIntent(featureKey: string, body: Record<string, unknown>): Promise<void> {
  const sent = import('./auth-client').then(({ authFetch }) => authFetch(`/api/paid-narrative/intent?featureKey=${encodeURIComponent(featureKey)}`, {
    method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })).then(() => undefined, () => undefined);
  return Promise.race([sent, new Promise<void>(resolve => setTimeout(resolve, 1500))]);
}

// Each request saves one bounded part; transport retries keep the same identity.
export async function continueOracleDelivery({ body, fetcher, active, progress, endpoint = '/api/tarot/oracle-consultation', pause = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms)) }: {
  body: Record<string, unknown>; fetcher: (url: string, init: RequestInit) => Promise<Response>;
  active: () => boolean; progress: (data: OracleDeliveryResponse) => void; pause?: (ms: number) => Promise<void>; endpoint?: string;
}) {
  let pending = body, failures = 0;
  for (let wave = 0; wave < 40 && active(); wave += 1) {
    try {
      const response = await fetcher(endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pending),
      });
      const data: OracleDeliveryResponse = await response.json();
      if (!active()) return null;
      progress(data);
      if (response.status === 200 && data.ok && data.saved && data.status === 'completed' && (data.consultation || data.reading)) return data;
      if (data.resultId) pending = { resumeResultId: data.resultId };
      if (response.status === 202 && data.ok) {
        failures = 0;
        if (data.retryable === false) return data;
        await pause(data.busy ? 5000 : 1000);
        continue;
      }
      if (data.retryable === false || response.status < 500 || ++failures >= 3) return data;
    } catch {
      if (!active()) return null;
      if (++failures >= 3) return { ok: false, retryable: true, reason: 'NETWORK_UNAVAILABLE' };
    }
    await pause(2000);
  }
  return active() ? { ok: false, retryable: true, reason: 'RESUME_REQUIRED' } : null;
}
