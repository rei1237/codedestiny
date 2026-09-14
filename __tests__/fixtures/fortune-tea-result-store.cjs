// 콘텐츠 검사도 저장 후 재조회 계약을 통과하도록 하는 메모리 결과 컬렉션.
module.exports = function createResultStore() {
  const rows = new Map();
  const read = (doc, key) => key.split('.').reduce((value, part) => value?.[part], doc);
  const matches = (doc, query) => Object.entries(query).every(([key, expected]) => {
    const actual = read(doc, key);
    if (Object.prototype.toString.call(expected) === '[object Date]') return new Date(actual).getTime() === new Date(expected).getTime();
    if (expected && typeof expected === 'object' && !(expected instanceof Date)) {
      if ('$exists' in expected) return (actual !== undefined) === expected.$exists;
      if ('$in' in expected) return expected.$in.includes(actual);
    }
    if (expected instanceof Date) return new Date(actual).getTime() === expected.getTime();
    return actual === expected;
  });
  const assign = (doc, key, value, remove = false) => {
    const parts = key.split('.');
    const last = parts.pop();
    const target = parts.reduce((obj, part) => (obj[part] ||= {}), doc);
    if (remove) delete target[last];
    else target[last] = structuredClone(value);
  };
  return {
    find(query) {
      let selected = [...rows.values()].filter(doc => matches(doc, query));
      const cursor = {
        sort(order) { const [key, direction] = Object.entries(order)[0]; selected.sort((a, b) => direction * (new Date(read(a, key)) - new Date(read(b, key)))); return cursor; },
        limit(count) { selected = selected.slice(0, count); return cursor; },
        async next() { return structuredClone(selected[0] || null); },
        async toArray() { return structuredClone(selected); },
      };
      return cursor;
    },
    async findOne(query) { return structuredClone([...rows.values()].find(doc => matches(doc, query)) || null); },
    async updateOne(query, update, options = {}) {
      let doc = [...rows.values()].find(row => matches(row, query));
      const inserting = !doc;
      if (inserting && !options.upsert) return { matchedCount: 0 };
      if (inserting) {
        doc = { _id: query._id, userId: query.userId, resultId: query.resultId };
        if (rows.has(doc._id)) throw Object.assign(new Error('duplicate'), { code: 11000 });
        Object.entries(update.$setOnInsert || {}).forEach(([key, value]) => assign(doc, key, value));
      }
      Object.entries(update.$set || {}).forEach(([key, value]) => assign(doc, key, value));
      Object.keys(update.$unset || {}).forEach(key => assign(doc, key, undefined, true));
      rows.set(doc._id, doc);
      return { matchedCount: inserting ? 0 : 1, upsertedCount: inserting ? 1 : 0 };
    },
  };
};
