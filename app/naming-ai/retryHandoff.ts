// 작명 AI 생성은 즉시-202 후 백그라운드(waitUntil)에서 완주하므로, 진짜 LLM 실패는 폼이 아니라
// 결과 페이지에서 표면화된다. 폼이 /generate를 재호출할 수 있는 페이로드(input/inputHash/access 증거)를
// executionId 키로 세션에 넘겨, 결과 페이지의 "다시 시도"가 추가 차감 없이 재생성(= /generate 재호출)하도록 한다.
// (문서화된 정본 재시도: 단건/이용권은 환불 없이 같은 증거로 /generate 재호출 시 추가 차감 없이 재생성)

export interface NamingRetryPayload {
  input: Record<string, unknown>;
  inputHash: string;
  access: Record<string, unknown>;
}

const KEY_PREFIX = "namingAiRetryV1:";

export function stashNamingRetryPayload(executionId: string, payload: NamingRetryPayload): void {
  if (!executionId || typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(KEY_PREFIX + executionId, JSON.stringify(payload));
  } catch {
    // 저장 실패는 재시도 편의만 잃는다 — 무시.
  }
}

export function readNamingRetryPayload(executionId: string): NamingRetryPayload | null {
  if (!executionId || typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(KEY_PREFIX + executionId);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && parsed.inputHash && parsed.input) {
      return parsed as NamingRetryPayload;
    }
  } catch {
    // 파싱 실패는 재시도 편의만 잃는다 — 무시.
  }
  return null;
}

export function clearNamingRetryPayload(executionId: string): void {
  if (!executionId || typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(KEY_PREFIX + executionId);
  } catch {
    // 무시.
  }
}
