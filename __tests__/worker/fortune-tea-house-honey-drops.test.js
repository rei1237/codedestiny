/**
 * @jest-environment node
 */

const USER_ID = "64f0a1b2c3d4e5f678901234";
const SERVICE_SCOPE = "FORTUNE_TEA_HOUSE";
const teaFixtures = require('../fixtures/fortune-tea-llm-payload.cjs');
// Multi-part stress fixture; the default one-part contract has separate coverage.
const timeoutPolicy = jest.requireActual('../../worker/lib/sync-llm-timeout.js');
jest.unstable_mockModule('../../worker/lib/sync-llm-timeout.js', () => ({ ...timeoutPolicy, PAID_LLM_PARTS_PER_REQUEST: 4 }));

let handleFortuneTeaHouseRoutes;
let nativeTeaContract, bindNativeTossRequest;
let authState = { userId: USER_ID, email: "tea@example.com", role: "user" };
let paidAccessAllowed = true;
let callGeminiTextMock;
let billingMock;
let billingCalls;
let appliedKeys;
let loseApplyResponse;
let settleCalls = [];

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function valueAt(source, path) {
  return String(path).split(".").reduce((current, key) => (current == null ? undefined : current[key]), source);
}

function setAt(target, path, value) {
  const keys = String(path).split(".");
  let current = target;
  keys.slice(0, -1).forEach((key) => {
    if (!current[key] || typeof current[key] !== "object") current[key] = {};
    current = current[key];
  });
  current[keys[keys.length - 1]] = value;
}

function unsetAt(target, path) {
  const keys = String(path).split(".");
  let current = target;
  keys.slice(0, -1).forEach((key) => {
    current = current?.[key];
  });
  if (current && typeof current === "object") delete current[keys[keys.length - 1]];
}

function matchesCondition(actual, expected) {
  if (expected && typeof expected === "object" && !Array.isArray(expected)) {
    if (Object.prototype.hasOwnProperty.call(expected, "$lte")) return actual !== undefined && new Date(actual).getTime() <= new Date(expected.$lte).getTime();
    if (Object.prototype.hasOwnProperty.call(expected, "$gte")) return Number(actual || 0) >= Number(expected.$gte);
    if (Object.prototype.hasOwnProperty.call(expected, "$exists")) return expected.$exists ? actual !== undefined : actual === undefined;
    if (Object.prototype.hasOwnProperty.call(expected, "$in")) return Array.isArray(expected.$in) && expected.$in.includes(actual);
    if (Object.prototype.hasOwnProperty.call(expected, "$ne")) return actual !== expected.$ne;
  }
  if (actual instanceof Date || expected instanceof Date) return new Date(actual).getTime() === new Date(expected).getTime();
  return actual === expected;
}

function matchesQuery(doc, query = {}) {
  return Object.entries(query).every(([key, expected]) => {
    if (key === "$or") return Array.isArray(expected) && expected.some((item) => matchesQuery(doc, item));
    if (key === "$and") return Array.isArray(expected) && expected.every((item) => matchesQuery(doc, item));
    return matchesCondition(valueAt(doc, key), expected);
  });
}

function applyUpdate(doc, update, inserting = false) {
  if (update.$inc) {
    Object.entries(update.$inc).forEach(([key, amount]) => {
      setAt(doc, key, Number(valueAt(doc, key) || 0) + Number(amount));
    });
  }
  if (update.$set) {
    Object.entries(update.$set).forEach(([key, value]) => setAt(doc, key, clone(value)));
  }
  if (update.$unset) {
    Object.keys(update.$unset).forEach((key) => unsetAt(doc, key));
  }
  if (update.$push) {
    Object.entries(update.$push).forEach(([key, value]) => setAt(doc, key, [...(valueAt(doc, key) || []), clone(value)]));
  }
  if (inserting && update.$setOnInsert) {
    Object.entries(update.$setOnInsert).forEach(([key, value]) => setAt(doc, key, clone(value)));
  }
}

class FakeCollection {
  constructor() {
    this.rows = new Map();
    this.seq = 0;
  }

  async insertOne(doc) {
    const next = clone(doc);
    next._id = next._id || `fake_${++this.seq}`;
    if (this.rows.has(next._id)) {
      const error = new Error("duplicate key");
      error.code = 11000;
      throw error;
    }
    this.rows.set(next._id, next);
    return { acknowledged: true, insertedId: next._id };
  }

  async findOne(query) {
    const row = Array.from(this.rows.values()).find((doc) => matchesQuery(doc, query));
    return clone(row || null);
  }

  find(query) {
    let rows = this.all().filter(doc => matchesQuery(doc, query));
    const cursor = {
      sort(order) { const [key, direction] = Object.entries(order)[0]; rows.sort((a, b) => direction * (new Date(valueAt(a, key)) - new Date(valueAt(b, key)))); return cursor; },
      limit(count) { rows = rows.slice(0, count); return cursor; },
      next: async () => clone(rows[0] || null),
      toArray: async () => clone(rows),
    };
    return cursor;
  }

  async updateOne(query, update, options = {}) {
    const key = Array.from(this.rows.keys()).find((id) => matchesQuery(this.rows.get(id), query));
    if (!key) {
      if (!options.upsert) return { matchedCount: 0, modifiedCount: 0, upsertedCount: 0 };
      const doc = {};
      Object.entries(query).forEach(([queryKey, value]) => {
        if (!value || typeof value !== "object" || Array.isArray(value)) setAt(doc, queryKey, value);
      });
      applyUpdate(doc, update, true);
      doc._id = doc._id || `fake_${++this.seq}`;
      if (this.rows.has(doc._id)) throw Object.assign(new Error("duplicate key"), { code: 11000 });
      this.rows.set(doc._id, doc);
      return { matchedCount: 0, modifiedCount: 0, upsertedCount: 1 };
    }
    applyUpdate(this.rows.get(key), update, false);
    return { matchedCount: 1, modifiedCount: 1, upsertedCount: 0 };
  }

  async findOneAndUpdate(query, update) {
    const key = Array.from(this.rows.keys()).find((id) => matchesQuery(this.rows.get(id), query));
    if (!key) return { value: null };
    applyUpdate(this.rows.get(key), update, false);
    return { value: clone(this.rows.get(key)) };
  }

  all() {
    return Array.from(this.rows.values()).map(clone);
  }
}

const fakeDb = {
  collections: new Map(),
  collection(name) {
    if (!this.collections.has(name)) this.collections.set(name, new FakeCollection());
    return this.collections.get(name);
  },
  reset() {
    this.collections.clear();
  },
};

function collection(name) {
  return fakeDb.collection(name);
}

function modelForCollection(name) {
  /* find/findById 도 있어야 한다 — 월정석 증빙 정본(worker/lib/moonstone-spend-proof.js)이
     find().select().sort().limit().lean() 과 User.findById().select().lean() 을 쓴다. */
  const chainOver = (produce) => {
    const chain = {
      sort() { return chain; },
      select() { return chain; },
      limit() { return chain; },
      lean: async () => produce(),
    };
    return chain;
  };
  return {
    findOne(query) {
      return chainOver(() => clone(collection(name).all().find((doc) => matchesQuery(doc, query)) || null));
    },
    find(query) {
      return chainOver(() => collection(name).all().filter((doc) => matchesQuery(doc, query)).map(clone));
    },
    findById(id) {
      return chainOver(() => clone(collection(name).all().find((doc) => String(doc._id) === String(id)) || null));
    },
    exists: async (query) => Boolean(collection(name).all().find((doc) => matchesQuery(doc, query))),
  };
}

function validConsultBody(attemptId = "attempt-1") {
  return {
    consultationMode: "tarot",
    attemptId,
    selectedTeaCupId: "honey-peach",
    selectedTeaCupName: "꿀복숭아차",
    selectedTeaCupTopic: "인연",
    question: "지금 이 마음을 어떻게 바라보면 좋을까요?",
  };
}

function longHoneyLetter() {
  const paragraph = "손님, 연이가 달빛 아래 찻잔을 두 손으로 감싸고 천천히 편지를 씁니다. 오늘 달 카드의 정방향은 마음이 아직 다 말하지 못한 장면을 비추지만, 그 빛은 겁을 주려는 빛이 아니라 조용히 속도를 늦추라는 빛에 가깝습니다. 꿀방울을 하나씩 모아 여기까지 온 마음이 참 기특해서, 연이는 꽃돼지처럼 살짝 웃으며 말하고 싶어요. 지금은 누군가의 마음을 단정하기보다 손님 마음이 어디에서 떨리고 어디에서 쉬고 싶은지 먼저 살피면 좋아요. 찻잔 끝에 남은 향처럼, 직감은 작지만 분명하게 남아 있습니다. 오늘은 큰 결론을 밀어붙이지 말고, 마음을 해치지 않는 말 한 줄과 손님을 지키는 침묵 한 조각을 함께 골라 주세요. 그 작은 선택이 내일의 문을 조금 더 부드럽게 열어 줄 거예요. ";
  return `${paragraph}${paragraph}${paragraph}`;
}

async function readJson(response) {
  return { status: response.status, payload: await response.json() };
}

async function seedReadyResult({ resultId = "fortune-tea-house:letter-1", balance = 10, serviceScope = SERVICE_SCOPE, mode = "tarot", generationMode = "gemini" } = {}) {
  await collection("fortune_tea_house_honey_wallets").insertOne({
    _id: `wallet:${USER_ID}`,
    userId: USER_ID,
    serviceScope: SERVICE_SCOPE,
    balance,
    totalEarned: balance,
    totalSpent: 0,
  });
  await collection("fortune_tea_house_results").insertOne({
    _id: `result:${USER_ID}:${resultId}`,
    userId: USER_ID,
    resultId,
    serviceScope,
    consultationMode: mode,
    status: "completed",
    generationMeta: { mode: generationMode },
    result: {
      resultId,
      serviceScope,
      consultationMode: mode,
      questionSummary: "지금 이 마음을 어떻게 바라보면 좋을까요?",
      teaCup: { id: "honey-peach", name: "꿀복숭아차", topic: "인연" },
      tarot: { nameKo: "달", orientation: "upright", keywords: ["직감", "달빛"] },
    },
  });
  return resultId;
}

beforeAll(async () => {
  jest.unstable_mockModule("../../worker/lib/swiss-ephemeris.js", () => ({
    getSwissMoonLongitudes: async (_env, moments) => moments.map(() => 120),
  }));
  jest.unstable_mockModule("../../worker/lib/auth.js", () => ({
    getCurrentUser: jest.fn(async () => authState),
    getOptionalUserFromRequest: jest.fn(async () => authState),
  }));
  jest.unstable_mockModule("../../worker/lib/db.js", () => ({
    connectDb: jest.fn(async () => undefined),
    mongoose: { connection: { db: fakeDb } },
    resetMongooseConnection: jest.fn(async () => undefined),
    requestPoolRecovery: jest.fn(async () => undefined),
    resolveMongoDbName: jest.fn(() => "test"),
    withMongoRetry: jest.fn(async (env, fn) => fn()),
    isTransientMongoError: jest.fn(() => false),
  }));
  jest.unstable_mockModule("../../worker/lib/paid-feature-access.js", () => ({
    // 라우트가 인증 단계에서 같은 User 문서를 한 번에 읽으려고 이 projection 을 함께 import 한다.
    // 모킹에서 빠지면 라우트 모듈 로드가 SyntaxError 로 죽으므로 실제 모듈 표면과 맞춰 둔다.
    PAID_FEATURE_ACCESS_USER_PROJECTION: {},
    canAccessPaidFeature: jest.fn(async (userId, featureKey) => ({
      allowed: paidAccessAllowed,
      // isReusableFortuneTeaAccessDecision()이 reason/accessSource/licenseType에서
      // admin|monthly|subscription|membership_credit|license|pass|family 중 하나를 인식해야
      // allowed=true가 실제로 반영된다 — "TEST_ACCESS"는 매칭되지 않아 항상 결제 필요로 처리됐다.
      reason: paidAccessAllowed ? "license_active" : "PAYMENT_REQUIRED",
      userId,
      featureKey,
      pricing: null,
    })),
  }));
  // 이용권 허용(license_active)은 읽기 전용 판정이라 생성 claim 직후 정산을 거친다(2026-10-16).
  // 정산 계약은 consultation-per-use-payment·fortune-tea-house-pass-settlement 가 지키고, 여기서는 통과만 세운다.
  jest.unstable_mockModule("../../worker/lib/nakshatra-paid-access.js", () => ({
    settlePerUseAccessDecision: jest.fn(async (_env, args) => { settleCalls.push(args); return { allowed: true, source: "pass", reason: "" }; }),
    verifyPerUsePayment: jest.fn(async () => ({ proven: false, source: "", reason: "NO_RECORD" })),
  }));
  jest.unstable_mockModule("../../worker/lib/models.js", () => ({
    PaidExecutionRecord: modelForCollection("paid_execution_records"),
    PointHistory: modelForCollection("point_histories"),
    MonthlyCreditLedger: modelForCollection("monthly_credit_ledger"),
    Payment: modelForCollection("payments"),
    // 월정석 증빙 정본이 미정산 예약행을 판정할 때 읽는다(recentConsumeRequestIds).
    User: modelForCollection("users"),
    // 라우트가 llm-cache-store 를 통해 참조한다. 이 스위트는 캐시 동작을 검증하지 않으므로 빈 스텁.
    LlmResponseCache: {},
  }));
  billingMock = jest.fn(async (request) => {
    const body = await request.json();
    const path = new URL(request.url).pathname.split("/").pop();
    billingCalls.push({ path, ...body });
    if (path === "apply") {
      const doc = await collection("fortune_tea_house_results").findOne({ resultId: body.resultId });
      expect(doc.status).toBe("delivery_pending");
      expect(doc.result).toBeTruthy();
      appliedKeys.add(body.requestId);
      if (loseApplyResponse) {
        loseApplyResponse = false;
        throw new Error("MOCK_APPLY_RESPONSE_LOST");
      }
    }
    return new Response(JSON.stringify({ ok: true, data: { deferredUsage: true, status: "completed" } }), {
      status: 200, headers: { "content-type": "application/json" },
    });
  });
  jest.unstable_mockModule("../../worker/routes/billing.js", () => ({
    handleBillingRoutes: billingMock,
    BILLING_SNAPSHOT_USER_PROJECTION: {},
  }));
  callGeminiTextMock = jest.fn(async () => ({ ok: false, error: "external_call_blocked" }));
  jest.unstable_mockModule("../../worker/lib/gemini.js", () => ({
    callGeminiText: callGeminiTextMock,
  }));
  const mod = await import("../../worker/routes/fortune-tea-house.js");
  handleFortuneTeaHouseRoutes = mod.handleFortuneTeaHouseRoutes;
  nativeTeaContract = mod.nativeTeaContract;
  ({bindNativeTossRequest}=await import('../../worker/toss/native-context.js'));
});

beforeEach(() => {
  // LLM fixtures settle immediately; clear unused group deadlines per test.
  jest.useFakeTimers({ doNotFake: ['Date', 'performance', 'nextTick', 'queueMicrotask', 'setImmediate', 'clearImmediate'] });
  jest.spyOn(globalThis, "fetch").mockImplementation(() => { throw new Error("EXTERNAL_FETCH_FORBIDDEN"); });
  billingCalls = [];
  appliedKeys = new Set();
  loseApplyResponse = false;
  settleCalls = [];
  fakeDb.reset();
  authState = { userId: USER_ID, email: "tea@example.com", role: "user" };
  paidAccessAllowed = true;
  callGeminiTextMock?.mockClear();
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllTimers();
  jest.useRealTimers();
});

const FEATURE_KEYS = {
  tarot: "fortune-tea-house-tarot-consultation",
  saju: "fortune-tea-house-saju-consultation",
  sukuyo: "fortune-tea-house-sukuyo-compatibility-consultation",
};

test('Toss context uses the original card draw, checkpoints, stored result and revocation without web billing', async () => {
  authState=null;paidAccessAllowed=false;
  const body={...teaFixtures.consultBody({attemptId:'toss-native-original'}),consultationVersion:'tea-v2',
    tarotSpreadId:'yn_knot_three',requestId:'toss-native-original',featureKey:FEATURE_KEYS.tarot};
  delete body.draftResult;
  const contract=nativeTeaContract(body),auth={userId:USER_ID,tossNative:true};
  let revoked=false,checks=0;
  const context={auth,access:async input=>{
    expect(nativeTeaContract(input)).toEqual(contract);checks++;
    if(revoked)throw Object.assign(new Error('ORDER_REFUNDED'),{status:409});
    return {ok:true,auth,featureKey:contract.featureKey,pricing:contract.pricing,deferredUsage:false,
      accessDecision:{allowed:true,reason:'TOSS_IAP',accessSource:'toss',paymentId:'toss-order',claimEvidenceIds:[]}};
  },assertStored:async doc=>{
    expect(doc.userId).toBe(USER_ID);expect(doc.generationRequestHash).toBe(contract.inputHash);
    expect(doc.deliveryAccessKey).toBe('toss-order');
    if(revoked)throw Object.assign(new Error('ORDER_REFUNDED'),{status:409});
  }};
  const send=async(path,input)=>{
    const request=new Request('https://example.com/api/fortune-tea-house'+path,{method:input?'POST':'GET',
      headers:{'content-type':'application/json','cf-connecting-ip':'toss-native-original'},...(input?{body:JSON.stringify(input)}:{})});
    bindNativeTossRequest(request,context);
    return readJson(await handleFortuneTeaHouseRoutes(request,{NODE_ENV:'test',GEMINIF_API_KEY:'mock-key'}));
  };
  expect((await send('/tarot/prepare',body)).status).toBe(200);
  const drafts=collection('fortune_tea_house_tarot_drafts');
  const draft=drafts.all()[0];
  await drafts.updateOne({_id:draft._id},{$set:{'deck.order':['P10','C05','M04'],'deck.reversed':[false,false,false]}});
  const drawn=await send('/tarot/draw',{attemptId:body.attemptId,picks:[0,1,2]});
  expect(drawn.status).toBe(200);
  callGeminiTextMock.mockImplementation(async()=>{
    const output=teaFixtures.buildLlmPayload('three');
    output.tarotCardReadings.forEach((card,index)=>{card.positionId=drawn.payload.draft.cards[index].positionId;});
    return {ok:true,provider:'gemini',model:'offline-fixture',text:JSON.stringify(output)
      .replaceAll('minor_pentacles_10','P10').replaceAll('minor_cups_05','C05').replaceAll('major_04_emperor','M04')
      .replaceAll('펜타클 10','펜타클 텐').replaceAll('컵 5','컵 파이브')};
  });
  let response;
  for(let wave=0;wave<12;wave++){
    response=await send('/consult',body);
    if(response.status!==202)break;
  }
  if(response.status!==200){const {completedSections,...progress}=response.payload;throw new Error(JSON.stringify({status:response.status,progress,parts:completedSections?.map(s=>s.key),checkpoint:collection('fortune_tea_house_results').all()[0]?.generationCheckpoint?.errors}).slice(0,2500));}
  expect(response.payload.result.resultId).toBe(contract.resultId);
  const count=callGeminiTextMock.mock.calls.length;
  expect(count).toBeGreaterThan(0);expect(checks).toBeGreaterThan(1);
  const saved=await send('/results/'+encodeURIComponent(contract.resultId));
  expect(saved.status).toBe(200);expect(saved.payload.result.tarotSpreadCards).toEqual(response.payload.result.tarotSpreadCards);
  expect(callGeminiTextMock).toHaveBeenCalledTimes(count);expect(billingCalls).toHaveLength(0);expect(settleCalls).toHaveLength(0);
  expect(collection('fortune_tea_house_results').all()[0].tossNative).toBe(true);
  revoked=true;
  expect((await send('/results/'+encodeURIComponent(contract.resultId))).status).toBe(409);
  expect((await send('/consult',body)).status).toBe(409);
  expect(callGeminiTextMock).toHaveBeenCalledTimes(count);
});

function consultBodyForMode(mode, attemptId) {
  const body = {
    ...validConsultBody(attemptId),
    consultationMode: mode,
  };
  if (mode === "saju") {
    body.birthDate = "1990-01-01";
    body.birthTime = "12:00";
    body.gender = "female";
    body.calendarType = "solar";
    // 화면이 계산해 보내는 명식 초안. 사주 상담은 이 근거 없이는 생성 단계로 넘어가지 않는다.
    body.draftResult = { consultationMode: "saju", saju: { available: true } };
  }
  if (mode === "sukuyo") {
    body.sukuyo = {
      user: { name: "A", birthDate: "1990-01-01", calendarType: "solar", gender: "female" },
      partner: { name: "B", birthDate: "1991-02-02", calendarType: "solar", gender: "male" },
      relationshipType: "love",
      focus: "current",
    };
  }
  return body;
}

async function seedBillingEvidence({ featureKey, requestId, accessMethod = "single", pricingSnapshot }) {
  await collection("paid_execution_records").insertOne({
    _id: `paid:${requestId}`,
    userId: USER_ID,
    featureId: featureKey,
    requestId,
    idempotencyKey: requestId,
    executionId: `exec:${requestId}`,
    paymentId: `pay:${requestId}`,
    orderId: `order:${requestId}`,
    accessMethod,
    status: "paid_pending_generation",
    result: { deferredUsage: { requestId, paymentId: `pay:${requestId}`, accessType: accessMethod, pricingSnapshot } },
  });
}

function billingGatePayload(featureKey, requestId) {
  return {
    featureKey,
    requestId,
    idempotencyKey: requestId,
    executionId: `exec:${requestId}`,
    paymentId: `pay:${requestId}`,
    accessGrant: { featureKey, requestId, paymentId: `pay:${requestId}` },
    consume: { featureKey, requestId, transactionId: `exec:${requestId}`, accessType: "single_purchase" },
  };
}

async function seedChargedLetter(balance = 10) {
  const resultId = await seedReadyResult({ balance });
  const key = require('node:crypto').createHash('sha256').update(resultId).digest('hex');
  const draft = { status: 'pending', receiptToken: 'legacy-token', idempotencyKey: 'legacy-key',
    spendLedgerId: `spend:${USER_ID}:${resultId}:legacy-token`, letter: { title: '연이의 꿀편지', body: longHoneyLetter().trim() } };
  await collection('fortune_tea_house_results').updateOne({ resultId }, { $set: { honeyLetterDelivery: draft } });
  await collection('fortune_tea_house_honey_wallets').updateOne({ userId: USER_ID }, { $set: {
    [`honeyLetterSpends.${key}`]: { status: 'charged', token: draft.receiptToken, spendLedgerId: draft.spendLedgerId }
  } });
  return resultId;
}
const sendLegacyLetter = resultId => handleFortuneTeaHouseRoutes(new Request(
  `https://example.com/api/fortune-tea-house/results/${encodeURIComponent(resultId)}/honey-letter`,
  { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ idempotencyKey: 'resume-letter' }) }), {});
describe('previously charged honey letter delivery', () => {
  test.each(['before', 'after'])('lost final save %s write retries without a new deduction or generation', async when => {
    const resultId = await seedChargedLetter();
    const results = collection('fortune_tea_house_results'), save = results.updateOne.bind(results);
    let fail = true;
    jest.spyOn(results, 'updateOne').mockImplementation(async (q, u, o) => {
      if (fail && u?.$set?.honeyLetter) { fail = false; if (when === 'after') await save(q,u,o); throw Error('lost response'); }
      return save(q,u,o);
    });
    expect((await sendLegacyLetter(resultId)).status).toBe(503);
    const response = await readJson(await sendLegacyLetter(resultId));
    expect(response.payload.honeyLetter.body).toBe(longHoneyLetter().trim());
    expect(collection('fortune_tea_house_honey_wallets').all()[0].balance).toBe(10);
    expect(callGeminiTextMock).not.toHaveBeenCalled();
    expect((await readJson(await sendLegacyLetter(resultId))).payload.spent).toBe(0);
  });
  test('confirmed save failure refunds the old debit once and prevents a new purchase', async () => {
    const resultId = await seedChargedLetter(0), results = collection('fortune_tea_house_results');
    const save = results.updateOne.bind(results);
    jest.spyOn(results,'updateOne').mockImplementation((q,u,o) => u?.$set?.honeyLetter ? { matchedCount: 1, modifiedCount: 0 } : save(q,u,o));
    expect((await sendLegacyLetter(resultId)).status).toBe(500);
    expect(collection('fortune_tea_house_honey_wallets').all()[0].balance).toBe(10);
    expect((await sendLegacyLetter(resultId)).status).toBe(403);
    expect(collection('fortune_tea_house_honey_ledgers').all().filter(row=>row.type==='refund')).toHaveLength(1);
  });
  test('another account cannot resume the existing draft', async () => {
    const resultId = await seedChargedLetter(); authState = { userId: 'another-user' };
    expect((await sendLegacyLetter(resultId)).status).toBe(404);
  });
  test('new album unlock is blocked while previously unlocked albums remain available', async () => {
    await seedReadyResult({ balance: 30 });
    const send = () => handleFortuneTeaHouseRoutes(new Request('https://example.com/api/fortune-tea-house/honey-drops/tarot-album/unlock',
      { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }), {});
    expect((await send()).status).toBe(403);
    await collection('fortune_tea_house_honey_wallets').updateOne({ userId: USER_ID }, { $set: { tarotAlbumUnlocked: true } });
    expect((await readJson(await send())).payload.spent).toBe(0);
    expect(collection('fortune_tea_house_honey_wallets').all()[0].balance).toBe(30);
  });
});

describe("fortune tea house honey drops", () => {
  test.each(["tarot", "saju", "sukuyo"])("%s consult accepts verified billing gate evidence", async (mode) => {
    paidAccessAllowed = false;
    const requestId = `billing-${mode}`;
    const featureKey = FEATURE_KEYS[mode];
    await seedBillingEvidence({ featureKey, requestId });

    const response = await handleFortuneTeaHouseRoutes(new Request("https://example.com/api/fortune-tea-house/consult", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...consultBodyForMode(mode, requestId),
        featureKey,
        billingGate: billingGatePayload(featureKey, requestId),
      }),
    }), { NODE_ENV: "test" });
    const { status, payload } = await readJson(response);

    expect(status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.result.consultationMode).toBe(mode);
    expect(payload.result.featureKey).toBe(featureKey);
  });

  test("legacy personal saju retains its paid 10,000 snapshot after the new price", async () => {
    paidAccessAllowed = false;
    const requestId = 'legacy-saju-price', featureKey = FEATURE_KEYS.saju;
    const pricingSnapshot = { featureKey, cost: 100, coinPrice: 100, amountKRW: 10000 };
    await seedBillingEvidence({featureKey,requestId,pricingSnapshot});
    const body = {...consultBodyForMode('saju',requestId),featureKey,billingGate:billingGatePayload(featureKey,requestId)};
    const send = () => handleFortuneTeaHouseRoutes(new Request('https://example.com/api/fortune-tea-house/consult', {
      method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),
    }), {NODE_ENV:'test'});
    const first = await readJson(await send());
    expect(first.status).toBe(200);
    expect(first.payload.result.pricing).toMatchObject(pricingSnapshot);
    expect(first.payload.result.sajuReportVersion).toBeUndefined();
    const calls = callGeminiTextMock.mock.calls.length;
    const reread = await readJson(await send());
    expect(reread.status).toBe(200);
    expect(reread.payload.result.pricing.amountKRW).toBe(10000);
    expect(callGeminiTextMock.mock.calls.length).toBe(calls);
  });

  test("paid consult without evidence returns payment payload", async () => {
    paidAccessAllowed = false;
    const response = await handleFortuneTeaHouseRoutes(new Request("https://example.com/api/fortune-tea-house/consult", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(validConsultBody("payment-required")),
    }), { NODE_ENV: "test" });
    const { status, payload } = await readJson(response);

    expect(status).toBe(402);
    expect(payload.paymentRequired).toBe(true);
    expect(payload.paymentPayload.featureKey).toBe(FEATURE_KEYS.tarot);
    expect(payload.paymentPayload.amountKRW).toBe(5000);
    expect(payload.paymentPayload.runtimeGate.paymentAmount).toBe(5000);
  });

  test("billing evidence with another fortune tea feature key is rejected", async () => {
    paidAccessAllowed = false;
    const requestId = "mismatch-feature";
    await seedBillingEvidence({ featureKey: FEATURE_KEYS.tarot, requestId });

    const response = await handleFortuneTeaHouseRoutes(new Request("https://example.com/api/fortune-tea-house/consult", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...consultBodyForMode("saju", requestId),
        billingGate: billingGatePayload(FEATURE_KEYS.tarot, requestId),
      }),
    }), { NODE_ENV: "test" });
    const { status, payload } = await readJson(response);

    expect(status).toBe(400);
    expect(payload.ok).toBe(false);
  });
  test("상담 성공 후 전용 wallet에 꿀방울 1개만 중복 없이 지급한다", async () => {
    const env = { NODE_ENV: "test" };
    const first = await handleFortuneTeaHouseRoutes(new Request("https://example.com/api/fortune-tea-house/consult", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(validConsultBody("same-result")),
    }), env);
    const callCountAfterFirst = callGeminiTextMock.mock.calls.length;
    const second = await handleFortuneTeaHouseRoutes(new Request("https://example.com/api/fortune-tea-house/consult", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(validConsultBody("same-result")),
    }), env);

    const firstPayload = await first.json();
    const secondPayload = await second.json();
    const wallet = await collection("fortune_tea_house_honey_wallets").findOne({ userId: USER_ID, serviceScope: SERVICE_SCOPE });
    const ledgers = collection("fortune_tea_house_honey_ledgers").all().filter((row) => row.reason === "TEA_HOUSE_CONSULTATION_REWARD");

    expect(firstPayload.honeyDrops.earnedThisResult).toBe(true);
    expect(secondPayload.honeyDrops.duplicateResult).toBe(true);
    // 이용권은 결과 1건에 한 번만 정산한다. 완료된 결과의 재요청은 정산 없이 저장본을 준다.
    expect(settleCalls).toEqual([expect.objectContaining({ requestId: "fortune-tea-house:same-result" })]);
    expect(callGeminiTextMock.mock.calls.length).toBe(callCountAfterFirst);
    expect(wallet.balance).toBe(1);
    expect(ledgers).toHaveLength(1);
  });

  test("비로그인 상담에는 전용 꿀방울을 지급하지 않는다", async () => {
    authState = null;
    const response = await handleFortuneTeaHouseRoutes(new Request("https://example.com/api/fortune-tea-house/consult", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(validConsultBody("guest-result")),
    }), { NODE_ENV: "test" });
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.paymentRequired).toBe(true);
    expect(collection("fortune_tea_house_honey_wallets").all()).toHaveLength(0);
    expect(collection("fortune_tea_house_honey_ledgers").all()).toHaveLength(0);
  });

  test("꿀방울 부족 시 결제 흐름 없이 부족 코드만 반환한다", async () => {
    const resultId = await seedReadyResult({ balance: 4 });
    const response = await handleFortuneTeaHouseRoutes(new Request(`https://example.com/api/fortune-tea-house/results/${encodeURIComponent(resultId)}/honey-letter`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ idempotencyKey: "short-balance" }),
    }), { NODE_ENV: "test", FORTUNE_TEA_HOUSE_HONEY_LETTER_TEST_TEXT: longHoneyLetter() });
    const { status, payload } = await readJson(response);
    const wallet = await collection("fortune_tea_house_honey_wallets").findOne({ userId: USER_ID, serviceScope: SERVICE_SCOPE });

    expect(status).toBe(403);
    expect(payload.errorCode).toBe("HONEY_GGULGGUL_ONLY");
    expect(wallet.balance).toBe(4);
    expect(collection("fortune_tea_house_honey_ledgers").all().filter((row) => row.type === "spend")).toHaveLength(0);
  });

  test('new letter requests never deduct even with enough balance', async () => {
    const resultId = await seedReadyResult({ balance: 30 });
    expect((await sendLegacyLetter(resultId)).status).toBe(403);
    expect((await sendLegacyLetter(resultId)).status).toBe(403);
    expect(collection('fortune_tea_house_honey_wallets').all()[0].balance).toBe(30);
    expect(callGeminiTextMock).not.toHaveBeenCalled();
  });

  test("운명의 찻집 외부 scope 결과에는 꿀방울을 사용할 수 없다", async () => {
    const resultId = await seedReadyResult({ balance: 10, serviceScope: "SAJU" });
    const response = await handleFortuneTeaHouseRoutes(new Request(`https://example.com/api/fortune-tea-house/results/${encodeURIComponent(resultId)}/honey-letter`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ idempotencyKey: "wrong-scope" }),
    }), { NODE_ENV: "test", FORTUNE_TEA_HOUSE_HONEY_LETTER_TEST_TEXT: longHoneyLetter() });
    const { status, payload } = await readJson(response);

    expect(status).toBe(403);
    expect(payload.errorCode).toBe("HONEY_DROPS_ONLY_FOR_FORTUNE_TEA_HOUSE");
    expect(collection("fortune_tea_house_honey_ledgers").all().filter((row) => row.type === "spend")).toHaveLength(0);
  });

  test("LLM 실패 시 꿀방울을 차감하지 않는다", async () => {
    const resultId = await seedReadyResult({ balance: 10 });
    const response = await handleFortuneTeaHouseRoutes(new Request(`https://example.com/api/fortune-tea-house/results/${encodeURIComponent(resultId)}/honey-letter`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ idempotencyKey: "llm-fails" }),
    }), { NODE_ENV: "test" });
    const { status, payload } = await readJson(response);
    const wallet = await collection("fortune_tea_house_honey_wallets").findOne({ userId: USER_ID, serviceScope: SERVICE_SCOPE });

    expect(status).toBe(403);
    expect(payload.errorCode).toBe("HONEY_GGULGGUL_ONLY");
    expect(wallet.balance).toBe(10);
    expect(collection("fortune_tea_house_honey_ledgers").all().filter((row) => row.type === "spend")).toHaveLength(0);
  });


});


describe.each(["membership_pass", "monthly", "single"])("delivery recovery: %s", (accessMethod) => {
  const resultCollection = () => collection("fortune_tea_house_results");
  async function prepare(id) {
    paidAccessAllowed = false;
    callGeminiTextMock.mockImplementation(async () => ({ ok: true, provider: 'gemini', model: 'gemini-2.5-flash', text: JSON.stringify(teaFixtures.buildLlmPayload('three')) }));
    await seedBillingEvidence({ featureKey: FEATURE_KEYS.tarot, requestId: id, accessMethod });
    return { ...teaFixtures.consultBody({attemptId: id}), requestId: id, idempotencyKey: id, billingGate: billingGatePayload(FEATURE_KEYS.tarot, id) };
  }
  const postOnce = async (body) => {
    const response = await handleFortuneTeaHouseRoutes(new Request("https://example.com/api/fortune-tea-house/consult", {
      method: "POST", headers: { "content-type": "application/json", "cf-connecting-ip": body.requestId }, body: JSON.stringify(body),
    }), { NODE_ENV: "test", GEMINIF_API_KEY: 'mock-key' });
    return { status: response.status, payload: await response.json() };
  };
  const post = async body => {
    for (let wave = 0; wave < 12; wave += 1) {
      const response = await postOnce(body);
      if (response.status !== 202 || response.payload.busy || response.payload.retryable === false) return response;
    }
    throw new Error('mock wave budget exhausted');
  };
  const rewards = () => collection("fortune_tea_house_honey_ledgers").all().filter(row => row.reason === "TEA_HOUSE_CONSULTATION_REWARD");

  const pending = async () => readJson(await handleFortuneTeaHouseRoutes(new Request('https://example.com/api/fortune-tea-house/pending'), { NODE_ENV: 'test' }));

  test('four concurrent parts are durable before apply; server recovery reuses every good part', async () => {
    const body = await prepare(`parts-${accessMethod}`);
    const first = await postOnce(body);
    expect(first.status).toBe(202);
    expect(first.payload.completedSections).toHaveLength(4);
    expect(callGeminiTextMock).toHaveBeenCalledTimes(4);
    expect(billingCalls).toHaveLength(0);
    expect(rewards()).toHaveLength(0);
    const saved = resultCollection().all()[0].generationCheckpoint;
    authState = { userId: USER_ID, role: 'user' };
    const recovered = await pending();
    expect(recovered.status).toBe(202);
    expect(recovered.payload.requestPayload).toEqual(body);
    const complete = await post(recovered.payload.requestPayload);
    expect(complete.status).toBe(200);
    expect(callGeminiTextMock).toHaveBeenCalledTimes(9);
    expect(resultCollection().all()[0].generationCheckpoint.parts).toMatchObject(saved.parts);
    expect(appliedKeys.size).toBe(1);
    expect(rewards()).toHaveLength(1);
    for (const call of callGeminiTextMock.mock.calls) {
      expect(call[2].timeoutMs).toBeLessThanOrEqual(45000);
      expect(call[2].fallbackToWorkersAI).toBe(false);
    }
  });

  test.each(['throw', 'null', 'confirmation_null'])('partial checkpoint %s returns 503 without apply or refund', async fault => {
    const body = await prepare(`partial-store-${accessMethod}-${fault}`);
    const rows = resultCollection(), update = rows.updateOne.bind(rows), read = rows.findOne.bind(rows);
    let failed = false;
    jest.spyOn(rows, 'updateOne').mockImplementation(async (query, change, options) => {
      if (!failed && change.$set?.generationCheckpoint && fault !== 'confirmation_null') {
        failed = true;
        if (fault === 'throw') throw Error('MOCK_STORAGE_FAILURE');
        return null;
      }
      return update(query, change, options);
    });
    jest.spyOn(rows, 'findOne').mockImplementation(async query => {
      const doc = await read(query);
      if (!failed && fault === 'confirmation_null' && doc?.generationCheckpoint) { failed = true; return null; }
      return doc;
    });
    const first = await postOnce(body);
    expect(first.status).toBe(503);
    expect(first.payload).toMatchObject({ ok: false, retryable: true, reason: 'RESULT_STORAGE_UNAVAILABLE' });
    expect(callGeminiTextMock).not.toHaveBeenCalled();
    expect(billingCalls).toHaveLength(0);
    expect(rewards()).toHaveLength(0);
    expect((await post(body)).status).toBe(200);
    expect(appliedKeys.size).toBe(1);
  });

  test('pending read isolates accounts and rejects a revoked original proof', async () => {
    const body = await prepare(`pending-owner-${accessMethod}`);
    await postOnce(body);
    authState = { userId: '64f0a1b2c3d4e5f678901999', role: 'user' };
    expect((await pending()).status).toBe(404);
    authState = { userId: USER_ID, role: 'user' };
    await collection('paid_execution_records').updateOne({ requestId: body.requestId }, { $set: { status: 'refunded' } });
    expect((await pending()).status).toBe(402);
    expect(callGeminiTextMock).toHaveBeenCalledTimes(4);
    expect(billingCalls).toHaveLength(0);
  });

  test('one truncated part is regenerated without replacing accepted parts', async () => {
    const body = await prepare(`truncated-${accessMethod}`);
    callGeminiTextMock.mockResolvedValueOnce({ ok: true, provider: 'gemini', truncated: true, text: JSON.stringify(teaFixtures.buildLlmPayload('three')) });
    const first = await postOnce(body);
    expect(first.payload.completedSections).toHaveLength(3);
    const saved = resultCollection().all()[0].generationCheckpoint.parts;
    expect((await post(body)).status).toBe(200);
    expect(callGeminiTextMock).toHaveBeenCalledTimes(10);
    expect(resultCollection().all()[0].generationCheckpoint.parts).toMatchObject(saved);
  });

  test.each(["throw", "null", "write_response_lost"])("checkpoint %s never completes or applies", async (fault) => {
    const body = await prepare(`checkpoint-${accessMethod}-${fault}`);
    const rows = resultCollection();
    const update = rows.updateOne.bind(rows);
    const read = rows.findOne.bind(rows);
    let failed = false;
    jest.spyOn(rows, "updateOne").mockImplementation(async (q, u, o) => {
      if (!failed && u.$set?.status === "delivery_pending") {
        failed = true;
        if (fault === "write_response_lost") await update(q, u, o);
        if (fault !== "null") throw new Error("MOCK_STORAGE_UNAVAILABLE");
        return null;
      }
      return update(q, u, o);
    });
    const first = await post(body);
    expect(first.status).toBe(503);
    expect(first.payload).toMatchObject({ ok: false, retryable: true, reason: "RESULT_STORAGE_UNAVAILABLE" });
    expect(billingCalls).toHaveLength(0);
    expect(rewards()).toHaveLength(0);
    const generated = callGeminiTextMock.mock.calls.length;
    const next = await post(body);
    expect(next.status).toBe(200);
    if (fault === "write_response_lost") expect(callGeminiTextMock.mock.calls.length).toBe(generated);
    expect((await read({ resultId: next.payload.result.resultId })).status).toBe("completed");
    expect(appliedKeys.size).toBe(1);
  });

  test.each(["throw", "null", "confirmation_null"])("final save %s preserves exact result for retry", async (fault) => {
    const body = await prepare(`final-${accessMethod}-${fault}`);
    const rows = resultCollection();
    const update = rows.updateOne.bind(rows);
    const read = rows.findOne.bind(rows);
    let failed = false;
    jest.spyOn(rows, "updateOne").mockImplementation(async (q, u, o) => {
      if (!failed && u.$set?.status === "completed" && fault !== "confirmation_null") {
        failed = true;
        if (fault === "throw") throw new Error("MOCK_STORAGE_UNAVAILABLE");
        return null;
      }
      return update(q, u, o);
    });
    jest.spyOn(rows, "findOne").mockImplementation(async (q) => {
      if (!failed && q.status === "completed" && fault === "confirmation_null") { failed = true; return null; }
      return read(q);
    });
    const first = await post(body);
    expect(first.status).toBe(503);
    expect(first.payload.reason).toBe("RESULT_STORAGE_UNAVAILABLE");
    expect(rewards()).toHaveLength(0);
    const saved = rows.all()[0];
    const generated = callGeminiTextMock.mock.calls.length;
    // New Request and auth object stand in for a refreshed/re-authenticated client.
    authState = { userId: USER_ID, role: "user" };
    const next = await post(JSON.parse(JSON.stringify(body)));
    expect(next.status).toBe(200);
    expect(next.payload.result).toEqual(saved.result);
    expect(callGeminiTextMock.mock.calls.length).toBe(generated);
    expect(appliedKeys.size).toBe(1);
    expect(billingCalls.every(call => call.requestId === body.requestId && call.idempotencyKey === body.requestId)).toBe(true);
    const detail = await handleFortuneTeaHouseRoutes(new Request(`https://example.com/api/fortune-tea-house/results/${encodeURIComponent(saved.resultId)}`), { NODE_ENV: "test" });
    expect(detail.status).toBe(200);
  });

  test("apply response loss retries same evidence without generation or cancel", async () => {
    const body = await prepare(`apply-${accessMethod}`);
    loseApplyResponse = true;
    expect((await post(body)).status).toBe(503);
    const saved = resultCollection().all()[0];
    expect(saved.status).toBe("delivery_pending");
    const generated = callGeminiTextMock.mock.calls.length;
    const next = await post(body);
    expect(next.status).toBe(200);
    expect(next.payload.result).toEqual(saved.result);
    expect(callGeminiTextMock.mock.calls.length).toBe(generated);
    expect(appliedKeys.size).toBe(1);
    expect(billingCalls.map(call => call.path)).toEqual(["apply", "apply"]);
  });

  test("reward failure preserves successful delivery and cached reread", async () => {
    const body = await prepare(`reward-${accessMethod}`);
    jest.spyOn(collection("fortune_tea_house_honey_wallets"), "updateOne").mockRejectedValue(new Error("MOCK_REWARD_UNAVAILABLE"));
    const first = await post(body);
    expect(first.status).toBe(200);
    expect(first.payload.honeyDrops.reason).toBe("honey_reward_unavailable");
    expect(resultCollection().all()[0].status).toBe("completed");
    const next = await post(body);
    expect(next.payload.cached).toBe(true);
    expect(next.payload.result).toEqual(first.payload.result);
  });

  test.each(["cancelled", "refunded"])("%s evidence cannot resume pending result even with a current pass", async (status) => {
    const body = await prepare(`revoked-${accessMethod}-${status}`);
    loseApplyResponse = true;
    await post(body);
    const generated = callGeminiTextMock.mock.calls.length;
    await collection("paid_execution_records").updateOne({ requestId: body.requestId }, { $set: { status } });
    paidAccessAllowed = true;
    const next = await post(body);
    expect(next.status).toBe(402);
    expect(callGeminiTextMock.mock.calls.length).toBe(generated);
    expect(resultCollection().all()[0].status).toBe("delivery_pending");
  });

  test("refunded original payment overrides an old completed execution proof", async () => {
    const body = await prepare(`payment-refund-${accessMethod}`);
    loseApplyResponse = true;
    await post(body);
    await collection("paid_execution_records").updateOne({ requestId: body.requestId }, { $set: { status: "completed" } });
    await collection("payments").insertOne({ _id: "refund", userId: USER_ID, merchantUid: `pay:${body.requestId}`, status: "refunded" });
    paidAccessAllowed = true;
    const next = await post(body);
    expect(next.status).toBe(402);
    expect(next.payload.reason).toBe("BILLING_EVIDENCE_REVOKED");
    expect(billingCalls).toHaveLength(1);
  });

  test("pending recovery rejects a changed payment identity", async () => {
    const body = await prepare(`proof-change-${accessMethod}`);
    loseApplyResponse = true;
    await post(body);
    await collection("paid_execution_records").updateOne({ requestId: body.requestId }, { $set: { paymentId: "different-payment" } });
    expect((await post(body)).status).toBe(409);
    expect(billingCalls).toHaveLength(1);
  });

  test("pending concurrent recovery retains original result and confirms once", async () => {
    const body = await prepare(`pending-concurrent-${accessMethod}`);
    loseApplyResponse = true;
    await post(body);
    const saved = resultCollection().all()[0];
    const generated = callGeminiTextMock.mock.calls.length;
    const responses = await Promise.all([post(body), post(body)]);
    expect(responses.map(r => r.status).sort()).toEqual([200, 202]);
    expect(responses.find(r => r.status === 200).payload.result).toEqual(saved.result);
    expect(callGeminiTextMock.mock.calls.length).toBe(generated);
    expect(appliedKeys.size).toBe(1);
  });

  test("pending input changes return 409 without changing stored input or applying", async () => {
    const body = await prepare(`input-conflict-${accessMethod}`);
    loseApplyResponse = true;
    await post(body);
    const saved = resultCollection().all()[0];
    const next = await post({ ...body, question: "다른 질문으로 바꾼 요청입니다" });
    expect(next.status).toBe(409);
    expect(resultCollection().all()[0]).toEqual(saved);
    expect(billingCalls).toHaveLength(1);
  });

  test("late final write cannot complete or release a newer owner's lock", async () => {
    const body = await prepare(`stale-lock-${accessMethod}`);
    const rows = resultCollection();
    const update = rows.updateOne.bind(rows);
    jest.spyOn(rows, "updateOne").mockImplementation(async (q, u, o) => {
      if (u.$set?.status === "completed") {
        await update({ resultId: q.resultId }, { $set: { "generationLock.token": "new-owner" } });
      }
      return update(q, u, o);
    });
    const next = await post(body);
    expect(next.status).toBe(503);
    const saved = rows.all()[0];
    expect(saved.status).toBe("delivery_pending");
    expect(saved.generationLock.token).toBe("new-owner");
    expect(rewards()).toHaveLength(0);
  });

  test("cancellation during generation is rechecked before apply", async () => {
    const body = await prepare(`mid-cancel-${accessMethod}`);
    const rows = resultCollection();
    const update = rows.updateOne.bind(rows);
    jest.spyOn(rows, "updateOne").mockImplementation(async (q, u, o) => {
      const result = await update(q, u, o);
      if (u.$set?.status === "delivery_pending") {
        await collection("paid_execution_records").updateOne({ requestId: body.requestId }, { $set: { status: "refunded" } });
      }
      return result;
    });
    expect((await post(body)).status).toBe(402);
    expect(billingCalls).toHaveLength(0);
    expect(rows.all()[0].status).toBe("delivery_pending");
    expect(rewards()).toHaveLength(0);
  });

  test("concurrent same-key requests generate and apply once", async () => {
    const body = await prepare(`concurrent-${accessMethod}`);
    const results = await Promise.all([post(body), post(body)]);
    expect(results.map(r => r.status).sort()).toEqual([200, 202]);
    expect(billingCalls.filter(call => call.path === "apply")).toHaveLength(1);
    expect(rewards()).toHaveLength(1);
    expect((await post(body)).payload.cached).toBe(true);
  });
});


test('specialist saju rejects a health prediction, resumes only that group and rereads without generation', async () => {
  const body = { ...consultBodyForMode('saju', 'specialist-health-resume'), sajuReportVersion: 'saju-specialist-v1' };
  let rejectedHealth = false;
  let sequence = 0;
  const long = (label, minimum = 2200) => {
    let text = '';
    while (text.replace(/\s/g, '').length < minimum) {
      const n = ++sequence;
      text += `${label}의 ${n}번째 확인에서는 일간과 오행, 십성을 주어진 근거 안에서 읽고 대운과 세운을 생활의 선택에 연결합니다. ${label} 점검 ${n}에서는 금전과 소비, 30일의 투자 계획을 현실의 일정과 비교하며 회복할 시간과 협력할 조건을 구분합니다.\n`;
    }
    return text;
  };
  callGeminiTextMock.mockImplementation(async (_env, raw) => {
    const prompt = JSON.parse(raw);
    expect(prompt.focusRule).toContain('각각 독립 장');
    const output = clone(collection('fortune_tea_house_results').all()[0].generationCheckpoint.fallback);
    output.saju.deepSections = (prompt.groupRule.exactSectionTitles || []).map(title => ({ title, body: long(title) }));
    output.questionSummary = long('질문의 답');
    output.saju.summary = long('명식 요약');
    output.emotionAnalysis = output.emotionAnalysis.map(item => ({ ...item, description: long(item.label, 500) }));
    for (const key of Object.keys(output.yeoniReading)) output.yeoniReading[key] = long(key, 1200);
    output.synthesis.summary = long('종합 선택', 1200);
    output.choiceSimulation = output.choiceSimulation.map((item, i) => ({ ...item, result: long(`선택${i}`, 450), caution: long(`보류${i}`, 450) }));
    output.actionPrescription = long('실행 순서', 1200);
    output.closingLine = '실제 생활에서 확인한 변화와 회복의 시간을 함께 기록해 보세요.';
    if (!rejectedHealth && prompt.groupRule.exactSectionTitles?.some(title => title.includes('건강과 생활 리듬'))) {
      rejectedHealth = true;
      output.saju.deepSections.at(-1).body += ' 내년에 심장병에 걸릴 가능성이 높습니다.';
    }
    return { ok: true, provider: 'gemini', text: JSON.stringify(output) };
  });
  const post = () => handleFortuneTeaHouseRoutes(new Request('https://example.com/api/fortune-tea-house/consult', {
    method:'POST', headers:{'content-type':'application/json','cf-connecting-ip':'specialist-resume'}, body:JSON.stringify(body),
  }), { NODE_ENV:'test', GEMINIF_API_KEY:'mock-key' }).then(readJson);
  let response;
  for (let wave = 0; wave < 5; wave += 1) {
    response = await post();
    if (response.status !== 202 || response.payload.retryable === false) break;
  }
  const saved = collection('fortune_tea_house_results').all()[0];
  expect({status:response.status,quality:saved?.generationCheckpoint?.qualityError}).toEqual({status:200,quality:undefined});
  expect(rejectedHealth).toBe(true);
  expect(response.payload.result.sajuReportVersion).toBe('saju-specialist-v1');
  expect(response.payload.result.saju.deepSections.some(section => section.title.includes('건강과 생활 리듬'))).toBe(true);
  expect(JSON.stringify(response.payload.result)).not.toContain('심장병에 걸릴');
  expect(callGeminiTextMock).toHaveBeenCalledTimes(7);
  expect((await post()).payload.cached).toBe(true);
  expect(callGeminiTextMock).toHaveBeenCalledTimes(7);
});

test('sukuyo completes saved groups while preserving calculated relationship facts', async () => {
  const body = consultBodyForMode('sukuyo', 'sukuyo-checkpoint-complete');
  let facts;
  callGeminiTextMock.mockImplementation(async (_env, raw) => {
    const prompt = JSON.parse(raw);
    facts = prompt.preserveExactly.sukuyoCompatibility;
    const output = teaFixtures.buildLlmPayload('three');
    const long = (label, count) => Array.from({length: count}, (_, i) => `${label} 사례 ${i}는 ${facts.user.sukuyoName}와 ${facts.partner.sukuyoName}의 ${facts.relationType} 관계를 주어진 계산값 안에서 설명합니다. ${label} 조건 ${i}에서는 두 사람의 대화 속도와 현실의 약속을 비교하고 상대의 마음을 단정하지 않으며 구체적인 확인 행동을 선택합니다.`).join('\n');
    output.sukuyoCompatibility = { title: '두 사람의 본명숙 관계', summary: long('요약', 36), strengths: [long('강점', 24)], cautions: [long('주의', 24)], adviceKeywords: ['거리 확인', '약속 정리'], relationType: '계산값 변조', scores: {total: 100},
      chapters: ['월별 흐름 — 두 별의 석 달', '관계 처방 — 서로에게 맞는 거리와 말', '실행 체크리스트 — 함께 확인할 것'].map(title => ({title, body: long(title, 20)})) };
    return {ok: true, provider: 'gemini', text: JSON.stringify(output)};
  });
  let response;
  for (let wave = 0; wave < 10; wave += 1) {
    response = await readJson(await handleFortuneTeaHouseRoutes(new Request('https://example.com/api/fortune-tea-house/consult', {method: 'POST', headers: {'content-type':'application/json', 'cf-connecting-ip':'sukuyo-parts'}, body:JSON.stringify(body)}), {NODE_ENV:'test', GEMINIF_API_KEY:'mock-key'}));
    if(response.status !== 202 || response.payload.retryable === false) break;
  }
  const saved = collection('fortune_tea_house_results').all()[0];
  expect({status: response.status, quality: saved?.generationCheckpoint?.qualityError}).toEqual({status: 200, quality: undefined});
  expect(response.payload.result.sukuyoCompatibility.relationType).toBe(facts.relationType);
  expect(response.payload.result.sukuyoCompatibility.scores).toEqual(facts.scores);
  expect(callGeminiTextMock).toHaveBeenCalledTimes(11);
});

async function sukuyoConsultResponse(attemptId, mutate) {
  const body = consultBodyForMode('sukuyo', attemptId);
  mutate?.(body);
  return readJson(await handleFortuneTeaHouseRoutes(new Request('https://example.com/api/fortune-tea-house/consult', {method: 'POST', headers: {'content-type':'application/json', 'cf-connecting-ip': attemptId}, body: JSON.stringify(body)}), {NODE_ENV:'test', GEMINIF_API_KEY:'mock-key'}));
}

test('sukuyo consult stops before generation when the 27-sukuyo calculation is closed', async () => {
  // 양력 왕복을 통과하지 못하는 날짜는 prepareFortuneTeaSukuyoAstronomy 가 조용히 건너뛰어 초안이 닫힌다.
  const invalid = await sukuyoConsultResponse('sukuyo-basis-invalid', body => { body.sukuyo.user.birthDate = '1991-02-31'; });
  const missing = await sukuyoConsultResponse('sukuyo-basis-missing', body => { body.sukuyo.partner.birthDate = ''; });
  expect([invalid.status, missing.status]).toEqual([422, 422]);
  expect(callGeminiTextMock).not.toHaveBeenCalled();
});

test('sukuyo consult ignores an available flag forged on the client draft', async () => {
  const forged = await sukuyoConsultResponse('sukuyo-basis-forged', body => {
    body.sukuyo.user.birthDate = '1991-02-31';
    body.draftResult = { consultationMode: 'sukuyo', sukuyoCompatibility: { available: true, user: { name: '나', sukuyoName: '익숙' }, partner: { name: '상대', sukuyoName: '각숙' }, relationType: '명', scores: { total: 100 } } };
  });
  expect(forged.status).toBe(422);
  expect(callGeminiTextMock).not.toHaveBeenCalled();
});

describe("tea follow-up question", () => {
  const results = () => collection("fortune_tea_house_results");
  const env = { NODE_ENV: "test", GEMINIF_API_KEY: "mock-key" };
  const long = (label, n) => Array.from({ length: n }, (_, i) => `${label} ${i + 1}번째 장면에서 같은 카드의 흐름을 차분히 짚어 봅니다.`).join(" ");
  const answer = { answerTitle: "이직 시기", directAnswer: long("핵심", 14), evidence: [long("현재", 10), long("흐름", 10), long("조언", 10)], guidance: long("해볼 일", 14), caution: long("주의", 6), closing: "천천히 정해도 늦지 않아요." };
  const reply = { ok: true, provider: "gemini", model: "gemini-2.5-flash", text: JSON.stringify(answer) };
  // 앞 스위트의 모의 구현이 남지 않게, 모델은 기본으로 실패한다.
  beforeEach(() => callGeminiTextMock.mockReset().mockResolvedValue({ ok: false, error: "external_call_blocked" }));
  const ask =async (resultId, clientQuestionId, question = "이직은 언제쯤 움직이면 좋을까요?") => {
    const response = await handleFortuneTeaHouseRoutes(new Request(`https://example.com/api/fortune-tea-house/results/${encodeURIComponent(resultId)}/follow-up`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ question, clientQuestionId }),
    }), env);
    return { status: response.status, retryAfter: response.headers.get("Retry-After"), payload: await response.json() };
  };
  // 실제 체크포인트 경로로 결제된 타로 상담을 끝낸다. 추가 질문은 이 문서의 서버 체크포인트로 근거를 다시 만든다.
  async function completedTarot(id) {
    paidAccessAllowed = false;
    callGeminiTextMock.mockImplementation(async () => ({ ok: true, provider: "gemini", model: "gemini-2.5-flash", text: JSON.stringify(teaFixtures.buildLlmPayload("three")) }));
    await seedBillingEvidence({ featureKey: FEATURE_KEYS.tarot, requestId: id });
    const body = { ...teaFixtures.consultBody({ attemptId: id }), requestId: id, idempotencyKey: id, billingGate: billingGatePayload(FEATURE_KEYS.tarot, id) };
    for (let wave = 0; wave < 12; wave += 1) {
      const response = await handleFortuneTeaHouseRoutes(new Request("https://example.com/api/fortune-tea-house/consult", {
        method: "POST", headers: { "content-type": "application/json", "cf-connecting-ip": id }, body: JSON.stringify(body),
      }), env);
      if (response.status === 200) {
        callGeminiTextMock.mockReset();
        return { body, doc: results().all()[0] };
      }
    }
    throw new Error("mock wave budget exhausted");
  }

  test("a saved tarot result answers one follow-up from the same stored cards", async () => {
    const { doc } = await completedTarot("follow-up-cards");
    let prompt;
    callGeminiTextMock.mockImplementation(async (_env, raw, options) => { prompt = { input: JSON.parse(raw), options }; return reply; });
    const answered = await ask(doc.resultId, "client-question-1");
    expect(answered.status).toBe(200);
    expect(answered.payload).toMatchObject({ ok: true, alreadyApplied: false, followUpAllowance: { limit: 1, used: 1, remaining: 0 } });
    expect(answered.payload.followUp.answer.evidence).toHaveLength(3);
    expect(callGeminiTextMock).toHaveBeenCalledTimes(1);
    expect(prompt.input.tarotFactInput.spreadCards.map((card) => card.cardId)).toEqual(doc.generationCheckpoint.fallback.tarotSpreadCards.map((card) => card.cardId));
    expect(prompt.input.followUpQuestion).toBe("이직은 언제쯤 움직이면 좋을까요?");
    expect(prompt.options).toMatchObject({ fallbackToWorkersAI: false, thinkingBudget: 0, responseMimeType: "application/json" });
    expect(prompt.options.systemPrompt).toContain("새 카드를 뽑지 않는다");
    const saved = results().all()[0];
    expect(saved.leaseFollowUp).toBeUndefined();
    expect(saved.followUps).toHaveLength(1);
    const detail = await readJson(await handleFortuneTeaHouseRoutes(new Request(`https://example.com/api/fortune-tea-house/results/${encodeURIComponent(doc.resultId)}`), env));
    expect(detail.payload.result.followUps[0].question).toBe("이직은 언제쯤 움직이면 좋을까요?");
    expect(detail.payload.result.followUps[0].model).toBeUndefined();
  });

  test("the same client id replays the saved answer and a second question is refused", async () => {
    const resultId = await seedReadyResult({ resultId: "fortune-tea-house:follow-up-once" });
    callGeminiTextMock.mockResolvedValue(reply);
    expect((await ask(resultId, "client-question-1")).status).toBe(200);
    const replay = await ask(resultId, "client-question-1");
    expect([replay.status, replay.payload.alreadyApplied]).toEqual([200, true]);
    const second = await ask(resultId, "client-question-2", "그럼 연애운은 어떤가요?");
    expect([second.status, second.payload.errorCode, second.payload.followUpAllowance.remaining]).toEqual([409, "FOLLOW_UP_LIMIT_REACHED", 0]);
    expect(callGeminiTextMock).toHaveBeenCalledTimes(1);
    expect(results().all()[0].followUps).toHaveLength(1);
  });

  test("an active lease waits with 202 and a failed answer keeps the allowance", async () => {
    const resultId = await seedReadyResult({ resultId: "fortune-tea-house:follow-up-busy" });
    await results().updateOne({ resultId }, { $set: { leaseFollowUp: { token: "other", clientQuestionId: "client-question-0", expiresAt: new Date(Date.now() + 60000) } } });
    const busy = await ask(resultId, "client-question-1");
    expect([busy.status, busy.payload.errorCode, busy.retryAfter]).toEqual([202, "FOLLOW_UP_IN_PROGRESS", "5"]);
    expect(callGeminiTextMock).not.toHaveBeenCalled();
    await results().updateOne({ resultId }, { $set: { "leaseFollowUp.expiresAt": new Date(0) } });
    const failed = await ask(resultId, "client-question-1");
    expect([failed.status, failed.payload.errorCode, failed.payload.retryable, failed.payload.followUpAllowance.remaining]).toEqual([503, "FOLLOW_UP_GENERATION_FAILED", true, 1]);
    const saved = results().all()[0];
    expect([saved.followUps, saved.leaseFollowUp]).toEqual([undefined, undefined]);
  });

  test("a refund during generation saves nothing and other accounts cannot ask", async () => {
    const { body, doc } = await completedTarot("follow-up-revoked");
    authState = { userId: "64f0a1b2c3d4e5f678901999", role: "user" };
    expect((await ask(doc.resultId, "client-question-1")).status).toBe(404);
    authState = { userId: USER_ID, role: "user" };
    callGeminiTextMock.mockImplementation(async () => {
      await collection("paid_execution_records").updateOne({ requestId: body.requestId }, { $set: { status: "refunded" } });
      return reply;
    });
    const revoked = await ask(doc.resultId, "client-question-1");
    expect([revoked.status, revoked.payload.errorCode]).toEqual([403, "RESULT_REVOKED"]);
    const saved = results().all()[0];
    expect([saved.followUps, saved.leaseFollowUp]).toEqual([undefined, undefined]);
  });
});
