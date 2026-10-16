// 테스트·로컬 mock 서버 전용. 운영 라우트에서 import 하지 않는다.
export function createNeoMemoryRepository() {
  const rows = new Map();
  const copy = value => value == null ? null : structuredClone(value);
  return {
    async insert(row) { if (rows.has(row.id)) throw new Error('DUPLICATE_ORDER'); rows.set(row.id, copy(row)); },
    async get(id) { return copy(rows.get(id)); },
    async list(userId) { return [...rows.values()].filter(row => !userId || row.userId === userId).map(copy).reverse(); },
    async compareAndSwap(id, version, next) {
      if (rows.get(id)?.version !== version) return false;
      rows.set(id, copy(next)); return true;
    },
  };
}
