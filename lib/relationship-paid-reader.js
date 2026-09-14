// Retry only the original paid request or its server-owned resume id; no checkout dependency.
export async function runRelationshipReader(initial, { get, post, show, persist, active, visible, wait }) {
  let body = initial, failures = 0;
  for (let wave = 0; wave < 14 && active(); wave++) {
    if (!visible()) return false;
    let reply;
    try { reply = body ? await post(body) : await get(); }
    catch (error) { if (!active()) return false; if (++failures > 3) throw error; await wait(3000); continue; }
    if (!active()) return false;
    const { status, data } = reply;
    if ([200, 201].includes(status) && data.ok && data.sessionId) { show({ ...data, status: "completed" }); return true; }
    if (status === 202 && data.sessionId && data.resumeBody) {
      body = data.resumeBody; persist(body); show(data);
      if (data.retryable === false) throw new Error("저장된 장면을 보존했어요. 생성 한도에 도달해 추가 확인이 필요합니다.");
      failures = 0; await wait(1000); continue;
    }
    if (status === 404 && !body) return false;
    if ([429, 503].includes(status) && data.retryable !== false && ++failures <= 3) { await wait(4000); continue; }
    throw new Error(data.message || (status === 403 ? "취소·환불된 결과는 이어서 생성할 수 없어요." : "결과를 보존했어요. 같은 요청을 다시 확인해 주세요."));
  }
  return false;
}
