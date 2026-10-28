/**
 * 운명의 나침반 심화 3종(갈림길·미래 시뮬레이션·삶의 항로)의 보관함 저장.
 * 결과는 브라우저가 이미 계산해 둔 방향장에서 펼쳐질 뿐이라, 결제 뒤 화면을 그린 값을
 * POST /api/result-archive/<featureKey> 로 보낸다. 서버는 그 결제 requestId 를 확인한 뒤에만 남긴다
 * (worker/routes/compat-result-archive.js). 저장 실패는 화면을 막지 않는다.
 */
import { authFetch } from "@/app/_lib/auth-client";

export type CompassArchiveKey = "destiny-compass-crossroads" | "destiny-compass-future-sim" | "destiny-compass-life-voyage";

export interface CompassArchivePayload {
  requestId: string;
  /** 이용권 즉시 사용이면 'pass' — 사용 기록보다 저장이 먼저 도착해도 서버가 같은 requestId 로 확정한다. */
  accessMethod?: string;
  facts: Record<string, string | number>;
  sections: { title: string; body: string }[];
}

// 403(결제 기록이 아직 안 씀)·503·5xx·네트워크 오류만 다시 보낸다. 셸 _seSaveCompatArchive 와 같은 간격.
const RETRY_DELAYS_MS = [4000, 12000, 30000];
const FINAL_STATUSES = new Set([400, 401, 404, 413]);
const sent = new Set<string>();

export function saveCompassArchive(featureKey: CompassArchiveKey, payload: CompassArchivePayload, attempt = 0): void {
  if (!payload.requestId || !payload.sections.length) return;
  if (attempt === 0) {
    // 결제 1건 = 기록 1건 — 같은 결제를 리렌더마다 다시 보내지 않는다.
    if (sent.has(payload.requestId)) return;
    sent.add(payload.requestId);
  }
  const retry = (reason: unknown) => {
    if (attempt >= RETRY_DELAYS_MS.length) {
      console.warn("[compass-archive] 보관함 저장 실패", featureKey, reason);
      return;
    }
    window.setTimeout(() => saveCompassArchive(featureKey, payload, attempt + 1), RETRY_DELAYS_MS[attempt]);
  };
  authFetch(`/api/result-archive/${featureKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
    .then((response) => {
      if (response.ok || FINAL_STATUSES.has(response.status)) {
        if (!response.ok) console.warn("[compass-archive] 저장 거절", featureKey, response.status);
        return;
      }
      retry(response.status);
    })
    .catch(retry);
}
