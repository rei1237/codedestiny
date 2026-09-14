export type OracleDeliveryResponse = {
  ok?: boolean; status?: string; saved?: boolean; retryable?: boolean; busy?: boolean;
  resultId?: string; code?: string; reason?: string; completedParts?: string[]; totalParts?: number;
  sections?: { key: string; title: string; body: string }[];
  resumeInputs?: Record<string, unknown>; consultation?: unknown;
};

// Four bounded server calls run per wave; transport retries keep the same identity.
export async function continueOracleDelivery({ body, fetcher, active, progress, pause = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms)) }: {
  body: Record<string, unknown>; fetcher: (url: string, init: RequestInit) => Promise<Response>;
  active: () => boolean; progress: (data: OracleDeliveryResponse) => void; pause?: (ms: number) => Promise<void>;
}) {
  let pending = body, failures = 0;
  for (let wave = 0; wave < 40 && active(); wave += 1) {
    try {
      const response = await fetcher('/api/tarot/oracle-consultation', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pending),
      });
      const data: OracleDeliveryResponse = await response.json();
      if (!active()) return null;
      progress(data);
      if (response.status === 200 && data.ok && data.saved && data.status === 'completed' && data.consultation) return data;
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
