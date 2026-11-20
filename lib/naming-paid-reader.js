// Only the stored owner-bound execution id is posted. This loop cannot open a checkout.
export async function runNamingReader(executionId, { get, post, show, active, visible, wait }) {
  let resume = null;
  let failures = 0;
  for (let wave = 0; wave < 12 && active(); wave++) {
    if (!visible()) return false;
    let reply;
    try { reply = resume ? await post(resume) : await get(executionId); }
    catch (error) {
      if (!active()) return false;
      resume = null;
      if (++failures > 3) throw error;
      await wait(3000); continue;
    }
    if (!active()) return false;
    const { status, data } = reply;
    if (data.result) show(data.result);
    if ([200, 201].includes(status) && data.ok && data.result) return true;
    if (status === 202 && data.retryable !== false) {
      resume = data.resumeBody || null; failures = 0; await wait(1000); continue;
    }
    // R10: 다시 시도 보류(추가 결제·차감 없는 다시 시도·환불 요청 선택)는 자동 재시도하지 않고 화면에 넘긴다.
    if (data.retry && data.retry.available === true && data.refunded !== true) {
      throw Object.assign(new Error(data.message || "작명 결과를 끝까지 만들지 못했어요."), { retryHold: data });
    }
    if ([429, 503].includes(status) && data.retryable !== false && ++failures <= 3) {
      resume = null; await wait(4000); continue;
    }
    throw new Error(data.message || (status === 403 ? "취소·환불된 결과는 이어서 생성할 수 없어요." : "저장된 작명 결과를 보존했어요. 같은 결과를 다시 확인해 주세요."));
  }
  return false;
}
