import { getAuthState } from "@/app/_lib/auth-store";

// 원래 입력과 결제 증빙을 계정별로 보존한다. 결과 페이지는 서버에 저장된 실행 ID로
// 미완료 장만 요청하며, 완료 확인 전에는 이 복구 정보를 삭제하지 않는다.

export interface NamingRetryPayload {
  input: Record<string, unknown>;
  inputHash: string;
  access: Record<string, unknown>;
}

const KEY_PREFIX = "namingAiRetryV2:";
function ownerKey(executionId: string) {
  const user = getAuthState().user;
  const owner = String(user?.id || user?.userId || user?._id || user?.uid || "");
  return owner && executionId ? `${KEY_PREFIX}${encodeURIComponent(owner)}:${executionId}` : "";
}

export function stashNamingRetryPayload(executionId: string, payload: NamingRetryPayload): void {
  if (!ownerKey(executionId) || typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(ownerKey(executionId), JSON.stringify(payload));
  } catch {
    // 저장 실패는 재시도 편의만 잃는다 — 무시.
  }
}

export function readNamingRetryPayload(executionId: string): NamingRetryPayload | null {
  if (!ownerKey(executionId) || typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(ownerKey(executionId));
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
  if (!ownerKey(executionId) || typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(ownerKey(executionId));
  } catch {
    // 무시.
  }
}
