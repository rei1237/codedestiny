import { authFetch } from "@/app/_lib/auth-client";

// /api/life-calibration 클라이언트(worker/routes/life-calibration.js). 응답 본문·메모를 로그로 남기지 않는다.
export type LifeCalibrationResult<T> = { ok: true; data: T } | { ok: false; status: number; code: string };
export type LifeCalibrationApiEvent = {
  year: number;
  month: number | null;
  domain: string | null;
  outcome: string;
  intensity: number;
  certainty: string;
  source?: string;
  channel?: string;
  note: string;
  noteUnavailable?: boolean;
};

const BASE = "/api/life-calibration";

function readCode(status: number, data: unknown): string {
  const body = (data && typeof data === "object" ? data : {}) as { code?: unknown; error?: unknown };
  if (typeof body.code === "string" && body.code) return body.code;
  const err = body.error as { code?: unknown } | string | undefined;
  if (err && typeof err === "object" && typeof err.code === "string" && err.code) return err.code;
  if (typeof err === "string" && err) return err.toUpperCase();
  return status ? `HTTP_${status}` : "NETWORK_ERROR";
}

async function call<T>(path: string, init: RequestInit = {}): Promise<LifeCalibrationResult<T>> {
  let response: Response;
  try {
    response = await authFetch(`${BASE}${path}`, {
      credentials: "include",
      cache: "no-store",
      ...init,
      headers: { Accept: "application/json", ...(init.body ? { "Content-Type": "application/json" } : {}), ...(init.headers || {}) },
    });
  } catch {
    return { ok: false, status: 0, code: "NETWORK_ERROR" };
  }
  let data: unknown = null;
  try { data = await response.json(); } catch { data = null; }
  if (!response.ok || !data || (data as { ok?: unknown }).ok === false) return { ok: false, status: response.status, code: readCode(response.status, data) };
  return { ok: true, data: data as T };
}

const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) });
const q = (profileId: string) => `?profileId=${encodeURIComponent(profileId)}`;

export const lifeCalibrationApi = {
  getConsent: () => call<{ granted: boolean; version: string }>("/consent", { method: "GET" }),
  setConsent: (granted: boolean, age14Attested = false) =>
    call<{ granted: boolean; version: string }>("/consent", json("POST", { granted, source: "profile_form", ...(granted ? { age14Attested } : {}) })),
  setSelf: (profileId: string) => call<{ profileId: string; isSelf: true }>("/self", json("POST", { profileId })),
  getEvents: (profileId: string) => call<{ profileId: string; events: LifeCalibrationApiEvent[] }>(`/events${q(profileId)}`, { method: "GET" }),
  putEvents: (profileId: string, events: LifeCalibrationApiEvent[]) =>
    call<{ profileId: string; events: LifeCalibrationApiEvent[] }>("/events", json("PUT", { profileId, events })),
};
