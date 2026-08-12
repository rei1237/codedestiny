/**
 * worker/payments/ 테스트용 인메모리 컬렉션.
 *
 * 왜 스텁이 아니라 **진짜 구현**인가: Atlas M0 에는 트랜잭션이 없어서 결제의 원자성이 전부
 * CAS 필터에 실려 있다. 그 필터가 맞는지는 인프라가 아니라 **연산자 의미**를 확인해야 알 수 있으므로,
 * 여기서는 실제로 쓰는 연산자를 전부 구현한다. 통과시켜 주는 스텁이면 검증하는 게 없다.
 *
 * 지원: $nin · $in · $ne · $lt · $exists · $or · $set · $inc · $unset · $setOnInsert · $addToSet
 *       · upsert · returnDocument(before|after)
 * 미구현 연산자를 만나면 **조용히 통과시키지 않고 던진다** — 조용한 통과가 가짜 초록불을 만든다.
 */

function isOperatorMap(cond) {
  return cond && typeof cond === "object" && !Array.isArray(cond)
    && Object.keys(cond).some((key) => key.startsWith("$"));
}

export function matches(doc, filter) {
  return Object.entries(filter).every(([key, cond]) => {
    if (key === "$or") return cond.some((sub) => matches(doc, sub));
    const value = doc[key];
    // ObjectId·Date 처럼 프로퍼티를 가진 '값 객체'를 연산자 맵으로 오인하면 안 된다.
    if (isOperatorMap(cond)) {
      return Object.entries(cond).every(([op, operand]) => {
        if (op === "$nin") return !operand.includes(value);
        if (op === "$in") return operand.includes(value);
        if (op === "$ne") return String(value) !== String(operand);
        if (op === "$lt") return value != null && value < operand;
        if (op === "$gt") return value != null && value > operand;
        if (op === "$exists") return (value !== undefined) === operand;
        throw new Error(`fake-payment-db: 미구현 연산자 ${op}`);
      });
    }
    if (cond === null) return value === null || value === undefined;
    return String(value) === String(cond);
  });
}

/* Mongo 의 dot notation $set 시맨틱: "a.b" 는 중첩 필드를 갱신한다. 이용권 활성화
   (worker/payments/passes.js activatePassSubscription)가 flat 19경로 $set 을 실사용하므로,
   평면 키로 흉내내면 "갱신됐다"는 테스트가 아무것도 검증하지 않는다. */
function setPath(doc, key, value) {
  if (!key.includes(".")) { doc[key] = value; return; }
  const parts = key.split(".");
  let node = doc;
  for (const part of parts.slice(0, -1)) {
    if (!node[part] || typeof node[part] !== "object") node[part] = {};
    node = node[part];
  }
  node[parts[parts.length - 1]] = value;
}

export function applyUpdate(doc, update) {
  for (const op of Object.keys(update)) {
    if (!["$set", "$inc", "$unset", "$setOnInsert", "$addToSet"].includes(op)) {
      throw new Error(`fake-payment-db: 미구현 갱신 연산자 ${op}`);
    }
  }
  if (update.$set) for (const [k, v] of Object.entries(update.$set)) setPath(doc, k, v);
  if (update.$inc) for (const [k, v] of Object.entries(update.$inc)) doc[k] = (Number(doc[k]) || 0) + v;
  if (update.$unset) for (const k of Object.keys(update.$unset)) delete doc[k];
  if (update.$addToSet) {
    for (const [k, v] of Object.entries(update.$addToSet)) {
      const list = Array.isArray(doc[k]) ? doc[k] : [];
      if (!list.includes(v)) list.push(v);
      doc[k] = list;
    }
  }
  return doc;
}

function duplicateKeyError() {
  const error = new Error("E11000 duplicate key error");
  error.code = 11000;
  return error;
}

/**
 * @param {{ onDuplicate?: (filter: object) => boolean, uniqueKeys?: string[][] }} [options]
 *   uniqueKeys  — unique 인덱스를 모사한다. 결제 설계가 기대는 제약을 fixture 가 갖고 있지 않으면
 *                 "중복이 막힌다"는 테스트가 아무것도 검증하지 않는다.
 *   onDuplicate — upsert 경합을 임의 시점에 재현하는 용도.
 */
export function makeFakePaymentDb(options = {}) {
  const rows = [];
  const ctx = { ops: 0 };
  const uniqueKeys = options.uniqueKeys || [];
  let nextId = 1;

  function violatesUnique(doc) {
    return uniqueKeys.some((keys) => {
      if (keys.some((key) => doc[key] === undefined)) return false;
      return rows.some((row) => keys.every((key) => String(row[key]) === String(doc[key])));
    });
  }

  return {
    rows,
    ctx,
    async findOne(_Model, filter) { ctx.ops += 1; return rows.find((r) => matches(r, filter)) || null; },
    async find(_Model, filter) { ctx.ops += 1; return rows.filter((r) => matches(r, filter)); },
    async countDocuments(_Model, filter) { ctx.ops += 1; return rows.filter((r) => matches(r, filter)).length; },
    async insertOne(_Model, doc) {
      ctx.ops += 1;
      if (violatesUnique(doc)) throw duplicateKeyError();
      const created = { _id: `oid${nextId += 1}`, ...doc };
      rows.push(created);
      return { insertedId: created._id };
    },
    async updateOne(_Model, filter, update) {
      ctx.ops += 1;
      const hit = rows.find((r) => matches(r, filter));
      if (!hit) return { matchedCount: 0, modifiedCount: 0 };
      applyUpdate(hit, update);
      return { matchedCount: 1, modifiedCount: 1 };
    },
    async findOneAndUpdate(_Model, filter, update, opts = {}) {
      ctx.ops += 1;
      const hit = rows.find((r) => matches(r, filter));
      if (hit) {
        const before = { ...hit };
        applyUpdate(hit, update);
        return opts.returnDocument === "before" ? before : hit;
      }
      if (!opts.upsert) return null;
      if (options.onDuplicate?.(filter)) throw duplicateKeyError();
      const created = { _id: `oid${nextId += 1}`, ...(update.$setOnInsert || {}) };
      applyUpdate(created, { ...update, $setOnInsert: undefined });
      rows.push(created);
      // upsert 로 **새로 만든** 경우 before 는 없다. 이 null 이 "처음 지급"의 신호다.
      return opts.returnDocument === "before" ? null : created;
    },
    async deleteOne(_Model, filter) {
      ctx.ops += 1;
      const index = rows.findIndex((r) => matches(r, filter));
      if (index >= 0) rows.splice(index, 1);
      return { deletedCount: index >= 0 ? 1 : 0 };
    },
  };
}
