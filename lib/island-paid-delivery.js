const key = owner => `cdIslandPaidDelivery:${encodeURIComponent(owner)}`;
export function readIslandDelivery(owner, storage) {
  if (!owner) return null;
  try {
    const value = JSON.parse(storage.getItem(key(owner)) || "null");
    return value?.idempotencyKey && value?.payload ? value : null;
  } catch { return null; }
}
export function writeIslandDelivery(owner, value, storage) {
  if (!owner) return;
  try { storage.setItem(key(owner), JSON.stringify(value)); } catch { /* Server discovery also recovers saved requests. */ }
}
export function clearIslandDelivery(owner, storage) {
  if (!owner) return;
  try { storage.removeItem(key(owner)); } catch { /* Completed server replay is safe. */ }
}

// No payment gate here. A bounded wave reuses the exact request and its original receipt.
export async function runIslandDelivery(initial, { post, persist, display, active, visible, wait }) {
  let record = initial;
  let failures = 0;
  persist(record);
  for (let wave = 0; wave < 12 && active(); wave++) {
    if (!visible()) return false;
    let reply;
    try { reply = await post({ ...record.payload, ...record.extra, idempotencyKey: record.idempotencyKey }); }
    catch (error) {
      if (!active()) return false;
      if (++failures > 3) throw error;
      await wait(3000); continue;
    }
    if (!active()) return false;
    const { status, data } = reply;
    if (data.resumeBody || data.sessionId || data.resultId) {
      record = { ...record, payload: { ...record.payload, ...data.resumeBody,
        resumeSessionId: data.sessionId || data.resultId || record.payload.resumeSessionId } };
      persist(record);
    }
    if (data.consultation) display(data);
    if (status === 200 && data.ok && data.consultation?.status === "completed") return true;
    if (status === 202 && data.retryable !== false) { failures = 0; await wait(800); continue; }
    if (status === 503 && data.retryable === true && ++failures <= 3) { await wait(3000); continue; }
    throw new Error(data.message || (data.retryable === false ? "저장된 상담은 보존했어요. 이어서 생성할 수 있는지 상담 내역 확인이 필요합니다." : "연결을 확인한 뒤 같은 상담을 이어서 생성해 주세요."));
  }
  return false;
}
