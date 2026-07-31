/**
 * 동시성 제한 병렬 실행.
 *
 * 같은 구현이 master-love-codex.js / ziwei-deep-report.js / neo-operation-room.js 세 곳에
 * 복붙되어 있다. 네 번째 사본을 만드는 대신 여기로 모은다. 기존 세 곳은 동작 중인 유료
 * 경로라 이번 변경 범위 밖이므로 건드리지 않는다 — 옮길 때는 각각 따로 검증할 것.
 *
 * worker 는 throw 하지 않는 편이 좋다. 한 항목이 던지면 Promise.all 이 전체를 실패시키므로,
 * 호출부에서 실패를 값으로 돌리는 패턴(`{ ok: false, reason }`)과 함께 쓴다.
 */
export async function runWithConcurrency(items, limit, worker) {
  const list = Array.isArray(items) ? items : [];
  const results = new Array(list.length);
  let cursor = 0;
  async function runner() {
    while (cursor < list.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(list[index], index);
    }
  }
  const size = Math.max(1, Math.min(Number(limit) || 1, list.length));
  await Promise.all(Array.from({ length: size }, () => runner()));
  return results;
}
