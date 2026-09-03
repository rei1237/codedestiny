/**
 * worker/payments/ 테스트용 인메모리 컬렉션.
 *
 * 왜 스텁이 아니라 **진짜 구현**인가: Atlas M0 에는 트랜잭션이 없어서 결제의 원자성이 전부
 * CAS 필터에 실려 있다. 그 필터가 맞는지는 인프라가 아니라 **연산자 의미**를 확인해야 알 수 있으므로,
 * 여기서는 실제로 쓰는 연산자를 전부 구현한다. 통과시켜 주는 스텁이면 검증하는 게 없다.
 *
 * 지원: $nin · $in · $ne · $lt · $exists · $or · $set · $inc · $unset · $setOnInsert · $addToSet
 *       · $push($each/$slice) · upsert · returnDocument(before|after) · dot notation(필터·$set·$inc·$push)
 * 미구현 연산자를 만나면 **조용히 통과시키지 않고 던진다** — 조용한 통과가 가짜 초록불을 만든다.
 */

function isOperatorMap(cond) {
  return cond && typeof cond === "object" && !Array.isArray(cond)
    && Object.keys(cond).some((key) => key.startsWith("$"));
}

/* 필터도 dot notation 을 읽어야 한다. 결제의 CAS 는 전부 중첩 필드를 조건으로 건다
   (예: "profileSubscription.membershipCreditLotsVersion" 낙관적 버전 가드). 평면 키로만 읽으면
   그 조건이 항상 undefined 와 비교돼 **CAS 가 검증되는 척만 한다.** */
function getPath(doc, key) {
  if (!key.includes(".")) return doc[key];
  let node = doc;
  for (const part of key.split(".")) {
    if (node === null || node === undefined || typeof node !== "object") return undefined;
    node = node[part];
  }
  return node;
}

export function matches(doc, filter) {
  return Object.entries(filter).every(([key, cond]) => {
    if (key === "$or") return cond.some((sub) => matches(doc, sub));
    // 같은 필드에 조건 두 개를 AND 로 걸 때 쓴다(월정석 증빙 조회: 기능키 매칭 ∧ 토큰 매칭).
    // 없으면 $and 가 평범한 필드명으로 취급돼 **항상 false** 가 되고, 그 쿼리를 쓰는 테스트는
    // "아무것도 못 찾는다"만 확인하게 된다.
    if (key === "$and") return cond.every((sub) => matches(doc, sub));
    const value = getPath(doc, key);
    // ObjectId·Date 처럼 프로퍼티를 가진 '값 객체'를 연산자 맵으로 오인하면 안 된다.
    if (isOperatorMap(cond)) {
      return Object.entries(cond).every(([op, operand]) => {
        if (op === "$nin") return !operand.includes(value);
        if (op === "$in") return operand.includes(value);
        /* 배열 필드의 $ne 는 "어떤 원소도 일치하지 않음"이다. 문자열화해 비교하면
           ["a","b"] 에 $ne:"a" 가 통과해 버리고, 그러면 월정석 이중차감을 막는
           recentConsumeRequestIds 가드를 검증하는 테스트가 아무것도 검증하지 않는다. */
        if (op === "$ne") {
          if (Array.isArray(value)) return !value.some((item) => String(item) === String(operand));
          return String(value) !== String(operand);
        }
        if (op === "$lt") return value != null && value < operand;
        if (op === "$gt") return value != null && value > operand;
        // $lte/$gte 는 이용권 예산 CAS 가 쓴다(passes.js consumePassCoverage). 값이 없으면
        // 아직 0 이라는 뜻이므로 통과시킨다 — 실드라이버는 missing 을 비교에서 제외하지만,
        // 이 픽스처의 소비 CAS 는 항상 cycleKey 일치 필터와 AND 라 그 조합에서만 도달한다.
        if (op === "$lte") return value == null ? operand >= 0 : value <= operand;
        if (op === "$gte") return value == null ? operand <= 0 : value >= operand;
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

/* $push 의 $each/$slice. 월정석 멱등 마커(recentConsumeRequestIds)가 상한을 이 조합으로 강제한다
   — 스키마 배열 validator 는 업데이트 연산자에서 실행되지 않아 $slice 가 유일한 수단이기 때문이다
   (worker/lib/models.js). 모르는 수정자는 조용히 무시하지 않고 던진다. */
function applyPush(doc, key, spec) {
  const current = getPath(doc, key);
  const list = Array.isArray(current) ? current.slice() : [];
  if (!isOperatorMap(spec)) {
    setPath(doc, key, list.concat([spec]));
    return;
  }
  const unknown = Object.keys(spec).filter((op) => op !== "$each" && op !== "$slice");
  if (unknown.length) throw new Error(`fake-payment-db: 미구현 $push 수정자 ${unknown.join(",")}`);
  let next = list.concat(Array.isArray(spec.$each) ? spec.$each : []);
  if (typeof spec.$slice === "number") {
    next = spec.$slice >= 0 ? next.slice(0, spec.$slice) : next.slice(spec.$slice);
  }
  setPath(doc, key, next);
}

export function applyUpdate(doc, update) {
  for (const op of Object.keys(update)) {
    if (!["$set", "$inc", "$unset", "$setOnInsert", "$addToSet", "$push"].includes(op)) {
      throw new Error(`fake-payment-db: 미구현 갱신 연산자 ${op}`);
    }
  }
  if (update.$set) for (const [k, v] of Object.entries(update.$set)) setPath(doc, k, v);
  // $inc 도 dot notation 을 따라야 한다 — 평면 키로 쓰면 필터가 보는 중첩 필드와 갈라져
  // 낙관적 버전 가드가 영원히 0 을 읽는다(= 경합 테스트가 통과하는 척만 한다).
  if (update.$inc) for (const [k, v] of Object.entries(update.$inc)) setPath(doc, k, (Number(getPath(doc, k)) || 0) + v);
  if (update.$unset) for (const k of Object.keys(update.$unset)) delete doc[k];
  if (update.$addToSet) {
    for (const [k, v] of Object.entries(update.$addToSet)) {
      const list = Array.isArray(getPath(doc, k)) ? getPath(doc, k) : [];
      if (!list.includes(v)) list.push(v);
      setPath(doc, k, list);
    }
  }
  if (update.$push) for (const [k, spec] of Object.entries(update.$push)) applyPush(doc, k, spec);
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
    async find(_Model, filter, options = {}) {
      ctx.ops += 1;
      let out = rows.filter((r) => matches(r, filter));
      // 드라이버 FindOptions 의 sort/limit 만 흉내 낸다(단일 키). 크론 재지급의 "최신 우선"이 여기 기댄다.
      if (options.sort && typeof options.sort === "object") {
        const [key, dir] = Object.entries(options.sort)[0] || [];
        if (key) out = [...out].sort((a, b) => (a[key] > b[key] ? 1 : a[key] < b[key] ? -1 : 0) * (Number(dir) < 0 ? -1 : 1));
      }
      if (Number.isFinite(Number(options.limit)) && Number(options.limit) > 0) out = out.slice(0, Number(options.limit));
      return out;
    },
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
