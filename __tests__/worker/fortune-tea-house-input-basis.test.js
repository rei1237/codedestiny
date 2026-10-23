/** @jest-environment node */
// 입력만으로 정해지는 계산 근거는 결제·차감 앞에서 확인한다. 못 여는 입력(음력에 없는 날짜)은 차감 없이 422 로 끝나고,
// 양력에 없지만 음력에는 실재하는 생일(음력 2월 30일 등)은 열린다.
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

let u, core, astronomy;
beforeAll(async () => {
  ({ __fortuneTeaHouseTestUtils: u } = await import("../../worker/routes/fortune-tea-house.js"));
  core = await import("../../lib/korean-calendar/index.js");
  astronomy = await import('../../worker/lib/sukuyo-astronomy.js');
});

const baseBody = { selectedTeaCupId: "plain-cup", selectedTeaCupName: "플레인", selectedTeaCupTopic: "love", question: "두 사람의 앞날이 궁금해요", consultationVersion: "tea-v2" };
const person = (extra) => ({ name: "나", birthDate: "1990-05-05", calendarType: "solar", birthTimeUnknown: true, gender: "female", ...extra });
const request = (mode, key, user, partner) => u.normalizeRequest({ ...baseBody, consultationMode: mode, birthDate: "1990-05-05", birthTimeUnknown: true, [key]: { user: person(user), partner: person(partner) } });
const sukuyo = (user, partner) => request("sukuyo", "sukuyo", user, partner);
const sajuPair = (user, partner) => request("sajuCompatibility", "sajuCompatibility", user, partner);
const saju = (extra) => u.normalizeRequest({ ...baseBody, consultationMode: "saju", birthDate: "1990-05-05", birthTimeUnknown: true, gender: "female", ...extra });

// 코어에 실재하는 음력 2월 30일이 있는 해와 없는 해를 코어 표에서 찾는다.
const lunarFeb30 = (exists) => {
  for (let year = 1940; year <= 2010; year += 1) if (Boolean(core.lunarToSolar(year, 2, 30, false)) === exists) return `${year}-02-30`;
  throw new Error("sample year missing");
};

test("음력 생일은 코어에 실재하는 날짜만 읽히고, 같은 문자열을 양력으로 읽으면 여전히 닫힌다", () => {
  const real = lunarFeb30(true);
  expect(u.parseFortuneTeaSukuyoBirthDate(real, { calendarType: "lunar" })).toMatchObject({ raw: real });
  expect(u.parseFortuneTeaSukuyoBirthDate(real, { calendarType: "solar" })).toBeNull();
  expect(u.parseFortuneTeaSukuyoBirthDate(lunarFeb30(false), { calendarType: "lunar" })).toBeNull();
  expect(u.parseFortuneTeaSukuyoBirthDate("1991-05-31", { calendarType: "lunar" })).toBeNull();
  expect(u.parseFortuneTeaSukuyoBirthDate("1899-12-31", { calendarType: "solar" })).toBeNull();
});

test("숙요는 실재하는 음력 2월 30일을 열고, 음력에 없는 날짜는 결제 전에 닫는다", () => {
  expect(() => u.assertFortuneTeaInputOpenable(sukuyo({ birthDate: lunarFeb30(true), calendarType: "lunar" }, {}))).not.toThrow();
  for (const bad of [{ birthDate: lunarFeb30(false), calendarType: "lunar" }, { birthDate: "1991-05-31", calendarType: "lunar" }, { birthDate: "1991-02-30" }]) {
    expect(() => u.assertFortuneTeaInputOpenable(sukuyo({}, bad))).toThrow(expect.objectContaining({ status: 422, code: "FORTUNE_TEA_HOUSE_SUKUYO_BASIS_MISSING" }));
  }
});

test("사주와 사주 궁합은 음력에 없는 날짜를 500 이 아닌 계산 근거 부재 422 로 닫는다", () => {
  const missing = expect.objectContaining({ status: 422, code: "FORTUNE_TEA_HOUSE_SAJU_BASIS_MISSING" });
  expect(() => u.assertFortuneTeaInputOpenable(saju({ birthDate: "1991-05-31", calendarType: "lunar" }))).toThrow(missing);
  expect(() => u.assertFortuneTeaInputOpenable(sajuPair({}, { birthDate: "1991-05-31", calendarType: "lunar" }))).toThrow(missing);
});

// 2026-10-04 서버 초안 도입 때 궁합 pair 에 available 이 빠져, 정상 입력의 사주 궁합이 결제·차감 뒤 계산 근거 부재 422 로 닫혔다.
// handleConsult 와 같은 초안 → normalizeDraftResult → 근거 검사 경로를 그대로 밟는다.
test("정상 입력의 사주 궁합 서버 초안은 정규화를 거쳐도 계산 근거 검사를 통과한다", () => {
  const req = sajuPair({}, { name: "상대", birthDate: "1992-03-03", gender: "male" });
  const draft = u.buildTeaV2SajuServerDraft(req);
  expect(draft.sajuCompatibility.available).toBe(true);
  expect(() => u.assertSajuCalculationBasis(req, u.normalizeDraftResult(draft, req))).not.toThrow();
  const single = saju({});
  expect(() => u.assertSajuCalculationBasis(single, u.normalizeDraftResult(u.buildTeaV2SajuServerDraft(single), single))).not.toThrow();
});

test("사주와 사주 궁합은 실재하는 입력(출생시간 미상·한국 밖 시간대·범위 끝·음력 2월 30일)을 연다", () => {
  const open = (candidate) => expect(() => u.assertFortuneTeaInputOpenable(candidate)).not.toThrow();
  open(saju({}));
  open(sajuPair({}, {}));
  open(saju({ birthDate: "1900-01-01" }));
  open(saju({ birthDate: "2100-12-31" }));
  open(saju({ birthDate: lunarFeb30(true), calendarType: "lunar" }));
  open(sajuPair({ birthTimeUnknown: false, birthTime: "23:30", timezone: "America/New_York" }, { birthDate: lunarFeb30(true), calendarType: "lunar" }));
});

// handleConsult 의 실제 본문을 돌려 순서를 본다: 계산 근거가 없으면 증빙 claim·세대 문서보다 앞에서 끝나고,
// 코인 게이트가 유보해 둔 사용은 그 자리에서 취소된다.
const source = fs.readFileSync(path.join(__dirname, "../../worker/routes/fortune-tea-house.js"), "utf8");
const ast = ts.createSourceFile("fortune-tea-house.js", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const declared = (name) => ast.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === name).getText(ast);
test('숙요 입력 오류와 천문 서비스 오류는 차감 전에 422와 재시도 503으로 구분한다', async () => {
  for (const invalid of [true,false]) {
    const consult=sukuyo({birthTime:invalid?'25:00':'09:00',birthTimeUnknown:false},{});
    const verify=jest.fn(async()=>({ok:false,response:{status:402}}));
    const context={console,checkRateLimit:()=>true,readJson:async()=>consult,normalizeRequest:x=>x,fortuneTeaRequestHash:()=>'',
      parseFortuneTeaSukuyoBirthDate:u.parseFortuneTeaSukuyoBirthDate,assertSukuyoCalculationBasis:u.assertSukuyoCalculationBasis,
      localMomentToUtc:astronomy.localMomentToUtc,resolveSolarMoment:astronomy.resolveSolarMoment,
      calculateSukuyoForMoment:jest.fn(async()=>{throw new RangeError('mock ephemeris failure');}),verifyFortuneTeaHouseConsultAccess:verify};
    vm.createContext(context);vm.runInContext(['assertSukuyoCalculationBasis','prepareFortuneTeaSukuyoAstronomy','handleConsult'].map(declared).join('\n'),context);
    await expect(context.handleConsult({url:'https://mock.test'},{})).rejects.toMatchObject(invalid
      ? {status:422,code:'FORTUNE_TEA_HOUSE_SUKUYO_BASIS_MISSING'}
      : {status:503,code:'FORTUNE_TEA_HOUSE_SUKUYO_CALCULATION_UNAVAILABLE',retryable:true});
    expect(verify).not.toHaveBeenCalled();
    if(invalid)expect(context.calculateSukuyoForMoment).not.toHaveBeenCalled();
  }
});
test('숙요 로컬 미리보기도 입력한 윤달로 검증하고 윤달 표시를 보존한다', () => {
  const text=fs.readFileSync(path.join(__dirname,'../../src/features/fortune-tea-house/lib/sukuyoCompatibilityAdapter.ts'),'utf8');
  const tree=ts.createSourceFile('adapter.ts',text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
  const pick=name=>tree.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name).getText(tree);
  const context={lunarToSolar:core.lunarToSolar,solarToLunar:core.solarToLunar};vm.createContext(context);
  vm.runInContext(ts.transpileModule(['cleanText','normalizeCalendarType','parseBirthDate','lunarForPerson'].map(pick).join('\n'),{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText,context);
  expect(context.lunarForPerson({birthDate:'2023-02-01',calendarType:'lunar',isLeapMonth:true})).toMatchObject({isLeapMonth:true,lunarMonth:2});
  expect(()=>context.lunarForPerson({birthDate:'2023-03-01',calendarType:'lunar',isLeapMonth:true})).toThrow('INVALID_SUKUYO_BIRTH');
});

function bootConsult({ fallback, deferredUsage }) {
  const calls = { claim: [], begin: [], deferred: [] };
  const context = {
    console,
    cleanText: (value) => String(value ?? ""),
    checkRateLimit: () => true,
    readJson: async () => ({}),
    json: (body, options = {}) => ({ body, status: options.status || 200 }),
    normalizeRequest: () => ({ consultationVersion: "tea-v2", consultationMode: "saju" }),
    fortuneTeaRequestHash: () => "hash",
    prepareFortuneTeaSukuyoAstronomy: async () => {},
    verifyFortuneTeaHouseConsultAccess: async () => ({
      ok: true, auth: { userId: "user-1" }, featureKey: "fortune-tea-house-saju-consultation", pricing: {}, deferredUsage,
      accessDecision: { claimEvidenceIds: ["ev-1"] },
    }),
    buildTeaV2SajuServerDraft: () => null,
    normalizeDraftResult: () => fallback,
    buildHoneyResultId: () => "result-1",
    readFortuneTeaRequestId: () => "req-1",
    callFortuneTeaDeferredUsageRoute: async (args) => { calls.deferred.push(args); },
    claimRequestBillingEvidence: async (_env, args) => { calls.claim.push(args); return { ok: false, status: 409 }; },
    evidenceClaimErrorBody: () => ({ ok: false }),
    connectDb: async () => {},
    beginFortuneTeaHouseGeneration: async (args) => { calls.begin.push(args); return {}; },
  };
  vm.createContext(context);
  vm.runInContext(["assertSajuCalculationBasis", "assertSukuyoCalculationBasis", "handleConsult"].map(declared).join("\n"), context);
  return { calls, run: () => context.handleConsult({ url: "https://example.test/api/fortune-tea-house/consult" }, {}) };
}

test("계산 근거가 없는 상담은 증빙 claim·세대 문서보다 앞에서 422 로 끝나고 유보된 코인 사용을 취소한다", async () => {
  const f = bootConsult({ fallback: { saju: { available: false } }, deferredUsage: true });
  await expect(f.run()).rejects.toMatchObject({ status: 422, code: "FORTUNE_TEA_HOUSE_SAJU_BASIS_MISSING" });
  expect(f.calls.claim).toHaveLength(0);
  expect(f.calls.begin).toHaveLength(0);
  expect(f.calls.deferred).toEqual([expect.objectContaining({ path: "cancel", requestId: "req-1", resultId: "result-1" })]);
});

test("유보된 코인 사용이 없으면 취소 호출 없이 끝나고, 근거가 있으면 증빙 claim 까지 진행한다", async () => {
  const closed = bootConsult({ fallback: { saju: { available: false } }, deferredUsage: false });
  await expect(closed.run()).rejects.toMatchObject({ status: 422 });
  expect(closed.calls.deferred).toHaveLength(0);
  expect(closed.calls.claim).toHaveLength(0);

  const open = bootConsult({ fallback: { saju: { available: true } }, deferredUsage: true });
  expect(await open.run()).toMatchObject({ status: 409 });
  expect(open.calls.claim).toHaveLength(1);
  expect(open.calls.deferred).toHaveLength(0);
});
