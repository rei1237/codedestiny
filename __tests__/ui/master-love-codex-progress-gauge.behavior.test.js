/**
 * 진행 게이지가 **서버가 확정한 상태만** 그린다는 것을 무는 회귀 테스트.
 *
 * 2026-09-19 장애의 게이지 쪽 얼굴:
 *   ① 퍼센트를 화면에서 `completed/total` 로 만들어 5~95 로 가두고 `completed >= total`
 *      이면 100% 로 그렸다 — 최종 검증·완료 확정 전에 100% 가 뜨는 경로였다.
 *   ② 상태 문구는 4.2초마다 도는 장식이라 실제 단계(작성/검증/저장/재시도)와 무관했다.
 *   ③ 1장이 도착해 화면이 리더로 바뀌면 진행 표시 자체가 사라졌다.
 *
 * 여기서 무는 것은 "프런트가 퍼센트를 다시 계산하지 않는다"와 "단계 문구가 서버 step 에서
 * 온다"이다. 규칙을 테스트에 다시 적지 않고 **실제 함수를 소스에서 뽑아** 돌린다.
 * 네트워크·LLM·결제 실호출 0건이다.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const COPY = "src/features/master-love-codex/_lib/copy.ts";
const GENERATING = "src/features/master-love-codex/components/CodexGenerating.tsx";
const RESULT_CLIENT = "app/master-love-codex/result/MasterLoveCodexResultClient.tsx";
const LANDING = "src/features/master-love-codex/MasterLoveCodexPage.tsx";

function read(relativePath) {
  return readFileSync(resolve(__dirname, "..", "..", relativePath), "utf8");
}

function parse(relativePath) {
  return ts.createSourceFile("source.tsx", read(relativePath), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}

/** 소스에서 선언 하나를 뽑아 `globalThis.<as>` 로 붙일 JS 를 만든다. */
function extract(relativePath, name, as = name) {
  const ast = parse(relativePath);
  let found;
  function walk(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === name) found = node.initializer;
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) found = node;
    ts.forEachChild(node, walk);
  }
  walk(ast);
  assert.ok(found, `${name} exists in ${relativePath}`);
  const text = found.getText(ast).replace(/^export\s+/, "");
  return ts.transpileModule(`globalThis.${as} = ${text};`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText;
}

/** 선언의 원문을 그대로 본다 — "이 계산이 남아 있으면 안 된다" 류 계약용. */
function sourceOf(relativePath, name) {
  const ast = parse(relativePath);
  let found;
  function walk(node) {
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) found = node;
    ts.forEachChild(node, walk);
  }
  walk(ast);
  assert.ok(found, `${name} exists in ${relativePath}`);
  return found.getText(ast);
}

const context = vm.createContext({});
vm.runInContext(extract(COPY, "codexStepLabel"), context);
vm.runInContext(extract(RESULT_CLIENT, "isStaleCodexUpdate"), context);

const codexStepLabel = (copy, step) => context.codexStepLabel(copy, step);
const isStaleCodexUpdate = (current, sessionId, updatedAt) => context.isStaleCodexUpdate(current, sessionId, updatedAt);

/** 로케일 문구가 아니라 **어떤 키를 골랐는지**를 본다 — 문구가 바뀌어도 매핑은 지켜져야 한다. */
const LABELS = {
  chapterStatePending: "<pending>",
  chapterStateWriting: "<writing>",
  chapterStateRetrying: "<retrying>",
  chapterStateBlocked: "<blocked>",
  stepPreparing: "<preparing>",
  stepValidating: "<validating>",
  stepSaving: "<saving>",
  stepFinalizing: "<finalizing>",
};

const gauge = sourceOf(GENERATING, "CodexGenerating");
const resultClient = sourceOf(RESULT_CLIENT, "MasterLoveCodexResultClient");

test("서버 step 이 화면 단계 문구를 고른다 — 작성/검증/저장/재시도/최종 확인", () => {
  assert.equal(codexStepLabel(LABELS, "writing"), LABELS.chapterStateWriting);
  assert.equal(codexStepLabel(LABELS, "validating"), LABELS.stepValidating);
  assert.equal(codexStepLabel(LABELS, "saving"), LABELS.stepSaving);
  assert.equal(codexStepLabel(LABELS, "retrying"), LABELS.chapterStateRetrying);
  assert.equal(codexStepLabel(LABELS, "finalizing"), LABELS.stepFinalizing);
  assert.equal(codexStepLabel(LABELS, "pending"), LABELS.chapterStatePending);
  assert.equal(codexStepLabel(LABELS, "failed"), LABELS.chapterStateBlocked);
});

test("서버 step 을 모르면 진행한 척하지 않는다 — 빈 값·미지의 값은 '구성 확인 중'", () => {
  // 🔴 fail-closed. 모르는 단계를 '작성 중'으로 떨어뜨리면 멈춘 책이 도는 것처럼 보인다.
  assert.equal(codexStepLabel(LABELS, ""), LABELS.stepPreparing);
  assert.equal(codexStepLabel(LABELS, "sealed"), LABELS.stepPreparing);
  assert.equal(codexStepLabel(LABELS, undefined), LABELS.stepPreparing);
});

test("step 이 complete 여도 '최종 확인 중'으로 적는다 — 리더가 열려야 완료다", () => {
  assert.equal(codexStepLabel(LABELS, "complete"), LABELS.stepFinalizing);
});

test("게이지가 퍼센트를 스스로 만들지 않는다 — 5~95 클램프와 completed>=total 이 사라졌다", () => {
  assert.ok(!/Math\.min\(\s*95/.test(gauge), "5~95 클램프의 상한이 남아 있다");
  assert.ok(!/Math\.max\(\s*5\s*,/.test(gauge), "5~95 클램프의 하한이 남아 있다");
  assert.ok(!/completed\s*>=\s*total/.test(gauge), "completed>=total → 100% 경로가 남아 있다");
  assert.ok(gauge.includes("Number(progress?.percent)"), "퍼센트가 서버 값에서 오지 않는다");
});

test("서버가 퍼센트를 주지 않으면 막대를 움직이지 않는다", () => {
  // null = 미확정. 폭 0, aria 값 없음, 대신 '구성 확인 중'을 읽어 준다.
  assert.ok(gauge.includes("width: `${percent ?? 0}%`"));
  assert.ok(gauge.includes("aria-valuenow={percent ?? undefined}"));
  assert.ok(gauge.includes("aria-valuetext={percent === null ? copy.stepPreparing : undefined}"));
});

test("퍼센트가 없으면 단계도 비운다 — 절반만 서버 값인 상태를 만들지 않는다", () => {
  assert.ok(gauge.includes('const step = percent === null ? "" : String(progress?.step || "");'));
});

test("K / N 은 서버 validated·total 이 먼저다 — 받은 장 수는 폴백일 뿐", () => {
  assert.ok(gauge.includes("progress?.validated ?? progress?.completed ?? completed"));
  assert.ok(gauge.includes("progress?.total ?? total"));
});

test("4.2초 순환 문구는 배경 문구로 내려갔다 — 단계 문구는 서버 step 에서 만든다", () => {
  assert.ok(gauge.includes("const ambience = copy.generatingStatusLines[lineIndex]"), "순환 문구가 배경 문구가 아니다");
  assert.ok(gauge.includes("const stepLabel = error ? copy.chapterStateBlocked : codexStepLabel(copy, step);"));
  // 상태 문구 문단은 aria-live 로 읽어 주고, 장식 라틴 표제는 읽지 않는다(이중 낭독 방지).
  assert.ok(/\{stepLabel\}/.test(gauge));
});

test("1장이 도착해 리더로 바뀌어도 진행 표시가 사라지지 않는다", () => {
  assert.ok(resultClient.includes('{session.status !== "completed" ? ('), "미완성 안내 띠의 조건이 바뀌었다");
  const band = resultClient.includes("{progressReady} / {progressTotal} · {progressStepLabel}");
  assert.ok(band, "안내 띠에 K / N · 단계가 없다");
  // 갈래(멈춤/재시도/이어쓰기) 안이 아니라 **밖**에 있어야 어느 갈래에서도 보인다.
  const lastBranch = resultClient.indexOf("{copy.resultContinueWriting}");
  assert.ok(lastBranch > 0);
  assert.ok(
    resultClient.indexOf("{progressReady} / {progressTotal}") > lastBranch,
    "진행 줄이 안내 갈래 ternary 안에 들어가 있다 — 한 갈래에서만 보인다",
  );
});

test("결과 화면도 퍼센트를 서버에서만 받는다", () => {
  assert.ok(resultClient.includes("const rawProgressPercent = Number(progress?.percent);"));
  assert.ok(resultClient.includes("Number.isFinite(rawProgressPercent)"));
  assert.ok(
    resultClient.includes('codexStepLabel(copy, progressPercent === null ? "" : String(progress?.step || ""))'),
    "퍼센트 없이 단계만 그리는 경로가 생겼다",
  );
  assert.ok(resultClient.includes("progress={session.generationProgress}"), "게이지에 서버 진행 상태가 전달되지 않는다");
});

test("진입 화면 게이지도 같은 서버 값을 본다 — 두 화면이 다른 숫자를 말하지 않게", () => {
  const landing = read(LANDING);
  assert.ok(landing.includes("progress={codexProgress}"), "진입 화면이 서버 진행 상태를 넘기지 않는다");
  assert.ok(landing.includes("setCodexProgress(seed?.generationProgress || null);"), "/start 씨앗의 진행 상태를 버린다");
  assert.ok(landing.includes("if (session.generationProgress) setCodexProgress(session.generationProgress);"), "이어쓰기 진척이 게이지에 반영되지 않는다");
});

test("O — 늦게 도착한 옛 응답이 새 상태를 되돌리지 않는다", () => {
  const seen = { sessionId: "s1", updatedAt: "2026-09-19T10:00:05.000Z" };
  // 같은 세션의 더 오래된 응답 → 버린다.
  assert.equal(isStaleCodexUpdate(seen, "s1", "2026-09-19T10:00:01.000Z"), true);
  // 더 새로운 응답 → 받는다.
  assert.equal(isStaleCodexUpdate(seen, "s1", "2026-09-19T10:00:09.000Z"), false);
  // 같은 시각 → 받는다(같은 상태를 다시 그리는 것은 해롭지 않다).
  assert.equal(isStaleCodexUpdate(seen, "s1", seen.updatedAt), false);
});

test("다른 세션의 응답은 현재 진행률을 덮지 않는다", () => {
  const seen = { sessionId: "s1", updatedAt: "2026-09-19T10:00:05.000Z" };
  assert.equal(isStaleCodexUpdate(seen, "s2", "2026-09-19T10:00:09.000Z"), true);
});

test("비교할 시각이 없으면 막지 않는다 — 새 응답을 버리는 쪽이 더 위험하다", () => {
  assert.equal(isStaleCodexUpdate(null, "s1", "2026-09-19T10:00:05.000Z"), false);
  assert.equal(isStaleCodexUpdate({ sessionId: "s1" }, "s1", "2026-09-19T10:00:05.000Z"), false);
  assert.equal(isStaleCodexUpdate({ sessionId: "s1", updatedAt: "2026-09-19T10:00:05.000Z" }, "s1", ""), false);
  assert.equal(isStaleCodexUpdate({ sessionId: "s1", updatedAt: "nope" }, "s1", "also-nope"), false);
});
