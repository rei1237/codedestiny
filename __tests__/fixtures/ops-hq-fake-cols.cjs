// 별빛 운영본부 테스트용 인메모리 컬렉션 — worker/ops-hq 가 쓰는 연산자만 흉내 낸다.
// _id 중복은 실제 드라이버처럼 code 11000 으로 던진다(멱등성 테스트의 핵심).

const clone = (value) => (value === undefined ? undefined : structuredClone(value));

function getAt(doc, path) {
  return path.split(".").reduce((value, key) => (value == null ? undefined : value[key]), doc);
}

function setAt(doc, path, value) {
  const keys = path.split(".");
  let node = doc;
  for (const key of keys.slice(0, -1)) {
    if (node[key] == null || typeof node[key] !== "object") node[key] = {};
    node = node[key];
  }
  node[keys.at(-1)] = value;
}

function unsetAt(doc, path) {
  const keys = path.split(".");
  const parent = keys.length > 1 ? getAt(doc, keys.slice(0, -1).join(".")) : doc;
  if (parent && typeof parent === "object") delete parent[keys.at(-1)];
}

function comparable(value) {
  if (value instanceof Date) return value.getTime();
  if (value && typeof value === "object" && typeof value.toHexString === "function") return value.toHexString();
  return value;
}

function equals(a, b) {
  if (a == null && b == null) return true;
  return JSON.stringify(comparable(a)) === JSON.stringify(comparable(b));
}

function isOperatorObject(value) {
  return value && typeof value === "object" && !(value instanceof Date) && !Array.isArray(value)
    && Object.keys(value).length > 0 && Object.keys(value).every((key) => key.startsWith("$"));
}

function matchValue(actual, condition) {
  if (isOperatorObject(condition)) {
    return Object.entries(condition).every(([op, operand]) => {
      const values = Array.isArray(actual) ? actual : [actual];
      switch (op) {
        case "$in": return operand.some((item) => values.some((value) => equals(value, item)));
        case "$nin": return !operand.some((item) => values.some((value) => equals(value, item)));
        case "$ne": return !values.some((value) => equals(value, operand));
        case "$gt": return actual != null && comparable(actual) > comparable(operand);
        case "$gte": return actual != null && comparable(actual) >= comparable(operand);
        case "$lt": return actual != null && comparable(actual) < comparable(operand);
        case "$lte": return actual != null && comparable(actual) <= comparable(operand);
        default: throw new Error(`fake: unsupported operator ${op}`);
      }
    });
  }
  if (Array.isArray(actual) && !Array.isArray(condition)) return actual.some((value) => equals(value, condition));
  return equals(actual, condition);
}

function matches(doc, query = {}) {
  return Object.entries(query).every(([key, condition]) => {
    if (key === "$or") return condition.some((branch) => matches(doc, branch));
    return matchValue(getAt(doc, key), condition);
  });
}

function applyUpdate(doc, update, inserting) {
  for (const [op, fields] of Object.entries(update)) {
    for (const [path, value] of Object.entries(fields || {})) {
      switch (op) {
        case "$set": setAt(doc, path, clone(value)); break;
        case "$setOnInsert": if (inserting) setAt(doc, path, clone(value)); break;
        case "$inc": setAt(doc, path, (Number(getAt(doc, path)) || 0) + value); break;
        case "$max": {
          const current = getAt(doc, path);
          if (current == null || comparable(value) > comparable(current)) setAt(doc, path, clone(value));
          break;
        }
        case "$unset": unsetAt(doc, path); break;
        case "$addToSet": {
          const list = getAt(doc, path) || [];
          if (!list.some((item) => equals(item, value))) list.push(clone(value));
          setAt(doc, path, list);
          break;
        }
        case "$push": {
          const list = getAt(doc, path) || [];
          const each = value && typeof value === "object" && "$each" in value ? value.$each : [value];
          let next = [...list, ...clone(each)];
          if (value && typeof value === "object" && "$slice" in value) next = value.$slice < 0 ? next.slice(value.$slice) : next.slice(0, value.$slice);
          setAt(doc, path, next);
          break;
        }
        default: throw new Error(`fake: unsupported update ${op}`);
      }
    }
  }
}

function sortRows(rows, spec) {
  const keys = Object.entries(spec);
  return rows.sort((a, b) => {
    for (const [key, direction] of keys) {
      const left = comparable(getAt(a, key));
      const right = comparable(getAt(b, key));
      if (left === right) continue;
      if (left == null) return -direction;
      if (right == null) return direction;
      return (left < right ? -1 : 1) * direction;
    }
    return 0;
  });
}

function duplicateKey() {
  return Object.assign(new Error("E11000 duplicate key error"), { code: 11000 });
}

class FakeCollection {
  constructor(name) {
    this.collectionName = name;
    this.rows = new Map();
    this.failNextInsert = null;
  }

  all() {
    return [...this.rows.values()].map(clone);
  }

  find(query = {}) {
    let rows = this.all().filter((doc) => matches(doc, query));
    const cursor = {
      sort(spec) { rows = sortRows(rows, spec); return cursor; },
      limit(count) { if (count) rows = rows.slice(0, count); return cursor; },
      toArray: async () => rows,
    };
    return cursor;
  }

  async findOne(query = {}) {
    return clone(this.all().find((doc) => matches(doc, query)) || null);
  }

  async insertOne(doc) {
    if (this.failNextInsert) {
      const hook = this.failNextInsert;
      this.failNextInsert = null;
      await hook(this, doc);
    }
    if (this.rows.has(doc._id)) throw duplicateKey();
    this.rows.set(doc._id, clone(doc));
    return { acknowledged: true, insertedId: doc._id };
  }

  async updateOne(query, update, options = {}) {
    const found = [...this.rows.values()].find((doc) => matches(doc, query));
    if (found) {
      applyUpdate(found, update, false);
      return { matchedCount: 1, modifiedCount: 1, upsertedCount: 0 };
    }
    if (!options.upsert) return { matchedCount: 0, modifiedCount: 0, upsertedCount: 0 };
    const doc = {};
    for (const [key, value] of Object.entries(query)) {
      if (!key.startsWith("$") && !isOperatorObject(value)) setAt(doc, key, clone(value));
    }
    applyUpdate(doc, update, true);
    if (this.rows.has(doc._id)) throw duplicateKey();
    this.rows.set(doc._id, doc);
    return { matchedCount: 0, modifiedCount: 0, upsertedCount: 1 };
  }
}

function createOpsCols() {
  const names = ["quests", "evidence", "ledger", "xpState", "revenueFacts", "traffic", "achievements", "settings", "syncState"];
  return Object.fromEntries(names.map((name) => [name, new FakeCollection(name)]));
}

module.exports = { FakeCollection, createOpsCols, matches };
