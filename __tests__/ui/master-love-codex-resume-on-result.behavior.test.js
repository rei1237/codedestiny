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
