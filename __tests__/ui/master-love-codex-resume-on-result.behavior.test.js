/**
 * 인연의 서 이어쓰기의 주체가 **결과 화면**이라는 것을 무는 회귀 테스트.
 *
 * 배치 루프가 진입 화면에만 있던 동안은 20장 완주에 그 탭이 5~10분 살아 있어야 했고, PG
 * 리다이렉트로 돌아온 모바일 문서가 그 조건을 못 채워 "결제했는데 책이 미완성"이 반복됐다.
 * 이제 결과 화면이 /session 이 함께 내려주는 accessToken 으로 남은 장을 직접 밀어붙인다.
 *
 * 소스를 그대로 뽑아 vm 에서 돌린다(같은 폴더의 purchase-recovery 하네스와 동일한 방식) —
 * 네트워크·LLM·결제 실호출 0건이다.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function extract(relativePath, name) {
  const source = readFileSync(resolve(__dirname, "..", "..", relativePath), "utf8");
  const ast = ts.createSourceFile("source.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let found;
  function walk(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === name) found = node.initializer;
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) found = node;
    ts.forEachChild(node, walk);
  }
  walk(ast);
  assert.ok(found, `${name} exists in ${relativePath}`);
  // 함수 선언은 `export` 를 달고 나온다 — 식으로 붙이려면 그 한정자를 떼야 한다.
  const text = found.getText(ast).replace(/^export\s+/, "");
  return ts.transpileModule(`globalThis.run = ${text};`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText;
}

const RUNNER = "src/features/master-love-codex/_lib/runCodexBatches.ts";
const RESULT_CLIENT = "app/master-love-codex/result/MasterLoveCodexResultClient.tsx";
const ERROR_TEXT = { GENERATION_BUDGET_EXCEEDED: "budget", SERVER_ERROR: "server", NETWORK_ERROR: "network" };

function chaptersOfLength(count) {
  return Array.from({ length: count }, (_, index) => ({ index, title: `chapter ${index + 1}` }));
}

/** runCodexBatches 를 실제 소스에서 뽑아, 왕복만 목으로 갈아끼운 컨텍스트에서 돌린다. */
function loopFixture({ generate, session = async () => ({ status: 200, data: null }) }) {
  const calls = [];
  const context = vm.createContext({
    // 지연은 0 으로 접는다 — 백오프 시간을 재는 테스트가 아니라 순서를 재는 테스트다.
    setTimeout: (fn) => { fn(); return 0; },
    isRetriableResultPollFailure: (status, data) => status === 409 || status >= 500 || Boolean(data?.retryable),
    mapCodexError: (data, status, errorText) => String(data?.message || errorText.SERVER_ERROR),
    MAX_BATCHES: 32,
    MAX_NO_PROGRESS_BATCHES: 3,
    GENERATION_STALL_BUDGET_MS: 240_000,
    postCodexJson: async (url, body) => { calls.push(["generate", body.accessToken]); return generate(calls); },
    fetchCodexSession: async (sessionId) => { calls.push(["session", sessionId]); return session(calls); },
  });
  vm.runInContext(extract(RUNNER, "runCodexBatches"), context);
  return { context, calls };
}

test("결과 화면의 루프가 남은 장을 끝까지 밀고 진척을 매 배치 흘려보낸다", async () => {
  let written = 0;
  const { context, calls } = loopFixture({
    generate: async () => {
      written += 4;
      return { status: 200, data: { ok: true, chapters: chaptersOfLength(written), accessToken: `token-${written}`, done: written >= 20 } };
    },
  });
  const progress = [];
  const final = await context.run({
    sessionId: "book-1",
    accessToken: "token-0",
    seed: { status: "generating", chapters: [] },
    errorText: ERROR_TEXT,
    onProgress: (next) => progress.push(next.chapters.length),
  });

  assert.deepEqual(progress, [4, 8, 12, 16, 20]);
  assert.equal(final.done, true);
  // 🔴 매 왕복이 직전 응답의 토큰으로 나가야 한다. 첫 토큰을 계속 쓰면 만료 후 402 로 죽는다.
  assert.deepEqual(calls.map((row) => row[1]), ["token-0", "token-4", "token-8", "token-12", "token-16"]);
});

test("409 백오프 중에는 /session 을 읽어 서버가 밀어 놓은 진척을 흡수한다", async () => {
  let generates = 0;
  const { context, calls } = loopFixture({
    // 첫 왕복은 락 경합(409). 서버 회수 태스크가 락을 쥔 정상 상태이기도 하다.
    generate: async () => {
      generates += 1;
      if (generates === 1) return { status: 409, data: { ok: false, reason: "GENERATION_IN_PROGRESS" } };
      return { status: 200, data: { ok: true, chapters: chaptersOfLength(20), done: true } };
    },
    session: async () => ({ status: 200, data: { ok: true, chapters: chaptersOfLength(8), accessToken: "token-cron" } }),
  });
  const progress = [];
  await context.run({
    sessionId: "book-2",
    accessToken: "token-0",
    seed: { status: "generating", chapters: [] },
    errorText: ERROR_TEXT,
    onProgress: (next) => progress.push(next.chapters.length),
  });

  // 409 뒤에 /generate 를 곧장 다시 치지 않고 세션을 한 번 읽는다.
  assert.deepEqual(calls.map((row) => row[0]), ["generate", "session", "generate"]);
  assert.deepEqual(progress, [8, 20]);
  // 흡수한 뒤의 왕복은 서버가 준 새 토큰으로 나간다.
  assert.equal(calls[2][1], "token-cron");
});

/** 결과 화면의 resume 콜백을 소스에서 뽑아, 루프만 목으로 갈아끼운다. */
function resumeFixture(target) {
  const events = [];
  const context = vm.createContext({
    useCallback: (fn) => fn,
    copy: { errorText: ERROR_TEXT },
    load: async () => { events.push(["reload"]); },
    setResuming: (value) => events.push(["resuming", value]),
    setResumeError: (value) => { if (value) events.push(["resumeError", value]); },
    setSession: () => {},
    stoppedRef: { current: false },
    runningRef: { current: false },
    captureOwner: () => () => true,
    document: { hidden: false }, navigator: { onLine: true },
    runCodexBatches: async (options) => { events.push(["loop", options.sessionId, options.accessToken]); return {}; },
  });
  vm.runInContext(extract(RESULT_CLIENT, "resume"), context);
  return { context, events, target };
}

test("토큰이 있는 미완성 세션은 결과 화면이 스스로 이어 쓴다", async () => {
  const { context, events } = resumeFixture();
  await context.run({ sessionId: "book-3", status: "generating", accessToken: "token-live", chapters: [] });

  assert.deepEqual(events.filter((row) => row[0] === "loop"), [["loop", "book-3", "token-live"]]);
  // 마지막 배치 응답에는 loveDna·글자수가 아직 없을 수 있어 완성본을 한 번 다시 읽는다.
  assert.ok(events.some((row) => row[0] === "reload"));
  assert.equal(events.some((row) => row[0] === "resumeError"), false);
});

test("토큰이 없으면 이어쓰기를 걸지 않는다 — 서버가 허가하지 않은 세션이다", async () => {
  const { context, events } = resumeFixture();
  await context.run({ sessionId: "book-4", status: "generating", accessToken: "", chapters: [] });

  assert.deepEqual(events, []);
});

test("네트워크 단절 뒤 같은 책을 조회해 완료 확인을 흡수한다", async () => {
 const {context,calls}=loopFixture({generate:async()=>{throw new TypeError('network')},session:async()=>({status:200,data:{ok:true,status:'completed',chapters:chaptersOfLength(20)}})});
 const result=await context.run({sessionId:'original-book',accessToken:'original-token',seed:{status:'generating',chapters:chaptersOfLength(20)},errorText:ERROR_TEXT});
 assert.equal(result.status,'completed');assert.deepEqual(calls,[['generate','original-token'],['session','original-book']]);
});
test("소유자가 변경되면 늦은 생성 결과를 화면에 반영하지 않는다",async()=>{
 let stopped=false;const {context}=loopFixture({generate:async()=>{stopped=true;return{status:200,data:{ok:true,done:true,chapters:chaptersOfLength(20)}}}});
 let shown=0;await context.run({sessionId:'original',accessToken:'token',seed:{status:'generating',chapters:[]},errorText:ERROR_TEXT,shouldStop:()=>stopped,onProgress:()=>shown++});assert.equal(shown,0);
});

test("앞 장이 지연되어도 뒤 장의 확정 저장을 진행으로 세고 완성한다", async () => {
  let saved = 0;
  const { context } = loopFixture({ generate: async () => {
    saved += 3;
    return { status: 202, data: { ok: true, chapters: saved < 12 ? [] : chaptersOfLength(20),
      generationProgress: { completed: Math.min(saved, 20), total: 20 }, done: saved >= 12 } };
  } });
  const result = await context.run({ sessionId: "gapped-book", accessToken: "token",
    seed: { status: "generating", chapters: [] }, errorText: ERROR_TEXT });
  assert.equal(result.done, true);
});

test("완료된 구매본은 화면 복귀 때 생성하지 않는다", async () => {
  const { context, events } = resumeFixture();
  await context.run({ sessionId: "complete", status: "completed", accessToken: "token", chapters: [] });
  assert.deepEqual(events, []);
});

test("초기 조회 장애 뒤 같은 구매본을 다시 읽으면 오류가 해제된다", async () => {
  let attempt = 0, error = "", stored;
  const context = vm.createContext({ useCallback: fn => fn, captureOwner: () => () => true,
    window: { location: { search: "?sessionId=paid-book" } }, URLSearchParams,
    copy: { resultUnstableRefreshError: "temporary", errorText: ERROR_TEXT },
    setError: value => { error = value; }, setLoading() {},
    // loadSession 은 낡은 응답을 가리려고 함수형 업데이터로 부른다 — React 처럼 이전 값을 먹인다.
    setSession: value => { stored = typeof value === "function" ? value(stored) : value; },
    isRetriableResultPollFailure: status => status === 503,
    fetchCodexSession: async () => (++attempt === 1
      ? { status: 503, data: { ok: false } }
      : { status: 200, data: { ok: true, sessionId: "paid-book", status: "generating", accessToken: "token", chapters: [] } }),
  });
  // 낡은 응답 판정도 같은 소스에서 뽑아 붙인다 — 목으로 흉내 내면 판정이 두 벌이 된다.
  vm.runInContext(extract(RESULT_CLIENT, "isStaleCodexUpdate"), context);
  context.isStaleCodexUpdate = context.run;
  vm.runInContext(extract(RESULT_CLIENT, "loadSession"), context);
  await context.run(); assert.equal(error, "temporary");
  await context.run(); assert.equal(error, ""); assert.equal(stored.sessionId, "paid-book");
});

test("명시적인 retryable false는 503이어도 같은 구매본의 자동 호출을 중단한다", async () => {
  const { context, calls } = loopFixture({ generate: async () => ({ status: 503, data: { ok: false, retryable: false, message: "review" } }) });
  await assert.rejects(context.run({ sessionId: "review-book", accessToken: "t", seed: {}, errorText: ERROR_TEXT }), /review/);
  assert.deepEqual(calls.map(row => row[0]), ["generate"]);
});

test("헤더가 도착해도 JSON 본문이 멈추면 예산 안에 취소한다", async () => {
  let signal;
  const context = vm.createContext({ AbortController, setTimeout, clearTimeout,
    authFetch: async (_url, init) => { signal = init.signal; return { ok: true, status: 200, json: () => new Promise(() => {}) }; },
  });
  vm.runInContext(extract(RUNNER, "codexJson"), context);
  await assert.rejects(context.run("/mock", {}, 15), /CODEX_RESPONSE_TIMEOUT/);
  assert.equal(signal.aborted, true);
});

test("복귀 이벤트가 겹쳐도 최신 저장 상태를 한 번 읽고 같은 구매본에 합류한다", async () => {
  let release, reads = 0, resumed = 0;
  const context = vm.createContext({ useCallback: fn => fn, accountEpoch: 0, captureOwner: () => () => true, loadInFlightRef: { current: null }, recoveryInFlightRef: { current: false },
    runningRef: { current: false }, stoppedRef: { current: false }, resumeStartedForRef: { current: "" },
    document: { hidden: false }, navigator: { onLine: true },
    loadSession: () => { reads++; return new Promise(resolve => { release = resolve; }); }, resume: async latest => { assert.equal(latest.accessToken, "fresh"); resumed++; },
  });
  vm.runInContext(extract(RESULT_CLIENT, "load"), context); context.load = context.run;
  vm.runInContext(extract(RESULT_CLIENT, "retryResume"), context);
  const active = context.run(); const duplicate = context.run();
  release({ sessionId: "same-book", status: "generating", accessToken: "fresh" });
  await Promise.all([active, duplicate]); assert.equal(reads, 1); assert.equal(resumed, 1);
});

test("계정 복원 중 이전 조회가 늦게 등록돼도 새 계정 저장본을 다시 읽는다", async () => {
  let releaseOld, releaseNew, reads = 0;
  const inFlight = { current: null };
  const makeLoad = epoch => {
    const context = vm.createContext({ useCallback: fn => fn, accountEpoch: epoch, captureOwner: () => () => true, loadInFlightRef: inFlight,
      loadSession: () => { reads++; return new Promise(resolve => { if (reads === 1) releaseOld = resolve; else releaseNew = resolve; }); },
    });
    vm.runInContext(extract(RESULT_CLIENT, "load"), context);
    return context.run;
  };
  const oldLoad = makeLoad(0);
  const pendingOld = oldLoad();
  inFlight.current = null; // usePaidDeliveryScope 콜백이 이전 계정 조회를 무효화한다.
  const newLoad = makeLoad(1);
  const pendingNew = newLoad();
  assert.equal(reads, 2);
  releaseOld({ sessionId: "old" });
  await pendingOld;
  assert.equal(inFlight.current?.epoch, 1);
  releaseNew({ sessionId: "new" });
  assert.equal((await pendingNew).sessionId, "new");
});

test("StrictMode 재설치 때 무효가 된 첫 조회를 재사용하지 않는다", async () => {
  let valid = true, reads = 0, releaseOld, releaseNew;
  const inFlight = { current: null };
  const context = vm.createContext({ useCallback: fn => fn, accountEpoch: 0, loadInFlightRef: inFlight,
    captureOwner: () => { const startedValid = valid; return () => startedValid && valid; },
    loadSession: () => { reads++; return new Promise(resolve => { if (reads === 1) releaseOld = resolve; else releaseNew = resolve; }); },
  });
  vm.runInContext(extract(RESULT_CLIENT, "load"), context);
  const old = context.run();
  valid = false; // 첫 effect 정리로 기존 owner scope 무효화
  const freshContext = vm.createContext({ ...context, useCallback: fn => fn, accountEpoch: 0, loadInFlightRef: inFlight,
    captureOwner: () => () => true,
    loadSession: context.loadSession,
  });
  vm.runInContext(extract(RESULT_CLIENT, "load"), freshContext);
  const fresh = freshContext.run();
  assert.equal(reads, 2);
  releaseOld(undefined); await old;
  releaseNew({ sessionId: "saved-book" });
  assert.equal((await fresh).sessionId, "saved-book");
});
