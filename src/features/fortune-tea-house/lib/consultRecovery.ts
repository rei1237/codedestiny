import type { FortuneTeaHouseConsultRequest, FortuneTeaHouseQuestionInput } from "../data/consult";
import type { TeaHouseCup } from "../data/teaCups";

export type FortuneTeaRecovery = {
  ownerId: string;
  attemptId: string;
  featureKey: string;
  billingGate: Record<string, unknown>;
  requestPayload: FortuneTeaHouseConsultRequest & Record<string, unknown>;
  questionInput: FortuneTeaHouseQuestionInput;
  cup: TeaHouseCup;
};

const RECOVERY_PREFIX = "cd_tea_consult_recovery:";
const RECOVERY_TTL_MS = 24 * 60 * 60 * 1000;

function recoveryStores(): Storage[] {
  if (typeof window === "undefined") return [];
  const stores: Storage[] = [];
  for (const name of ["localStorage", "sessionStorage"] as const) {
    try { stores.push(window[name]); } catch { /* 메모리의 시도는 계속 유지한다. */ }
  }
  return stores;
}

// 권한을 부여하는 기록이 아니다. /consult가 매번 현재 계정과 원래 증빙을 검증한다.
export function saveFortuneTeaRecovery(value: FortuneTeaRecovery): boolean {
  if (!value.ownerId || !value.attemptId) return false;
  for (const store of recoveryStores()) {
    try {
      store.setItem(RECOVERY_PREFIX + value.ownerId, JSON.stringify({ ...value, at: Date.now() }));
      return true;
    } catch { /* 다음 저장소를 사용한다. */ }
  }
  return false;
}

export function readFortuneTeaRecovery(ownerId: string): FortuneTeaRecovery | null {
  if (!ownerId) return null;
  for (const store of recoveryStores()) {
    try {
      const value = JSON.parse(store.getItem(RECOVERY_PREFIX + ownerId) || "null");
      if (value?.ownerId === ownerId && value.attemptId && value.featureKey && value.cup?.id
        && value.questionInput?.consultationMode && value.requestPayload?.attemptId === value.attemptId
        && value.requestPayload?.requestId === value.attemptId && value.requestPayload?.idempotencyKey === value.attemptId
        && Number.isFinite(value.at) && Date.now() - value.at >= 0 && Date.now() - value.at < RECOVERY_TTL_MS) return value;
    } catch { /* 손상되거나 차단된 저장소는 재개 근거로 쓰지 않는다. */ }
  }
  return null;
}

export function clearFortuneTeaRecovery(ownerId: string, attemptId: string): void {
  for (const store of recoveryStores()) {
    try {
      const value = JSON.parse(store.getItem(RECOVERY_PREFIX + ownerId) || "null");
      if (value?.attemptId === attemptId) store.removeItem(RECOVERY_PREFIX + ownerId);
    } catch { /* 다른 탭의 새 시도는 지우지 않는다. */ }
  }
}
