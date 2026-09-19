/**
 * 인연의 서 리더가 **구매한 구성 전부**를 그린다는 것을 무는 회귀 테스트.
 *
 * 2026-09-19 장애의 화면 쪽 얼굴: 2장이 늦게 오면 목차·막 탭·장 수 표기가 전부 "받은 장"
 * 에서 파생돼, 1장짜리 책이 봉인 화면까지 띄운 완성본으로 보였다. 여기서 무는 것은 셋이다.
 *   ① 기대 장 수 N 을 받은 장 수로 역산하지 않는다.
 *   ② 서버가 ready 라고 해도 본문이 없으면 열지 않는다(fail-closed).
 *   ③ 전 장이 실제로 도착했을 때만 봉인·마무리·PDF 를 연다.
 *
 * 규칙을 테스트에 다시 적지 않고 **실제 함수를 소스에서 뽑아** 돌린다 — 두 벌이 되면
 * 화면은 틀린 채로 테스트만 통과한다. 네트워크·LLM·결제 실호출 0건이다.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const ACTS = "src/features/master-love-codex/data/acts.ts";
const COPY = "src/features/master-love-codex/_lib/copy.ts";
const READER = "src/features/master-love-codex/components/CodexReader.tsx";
const SPINE = "src/features/master-love-codex/components/CodexSpine.tsx";
const SEAL = "src/features/master-love-codex/components/CodexSeal.tsx";
const RESULT_CLIENT = "app/master-love-codex/result/MasterLoveCodexResultClient.tsx";

function read(relativePath) {
  return readFileSync(resolve(__dirname, "..", "..", relativePath), "utf8");
}

/** 소스에서 선언 하나를 뽑아 `globalThis.<as>` 로 붙일 JS 를 만든다. */
function extract(relativePath, name, as = name) {
  const source = read(relativePath);
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
  return ts.transpileModule(`globalThis.${as} = ${text};`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText;
}

/** 선언의 원문(주석 제외)을 그대로 본다 — "이 속성이 붙어 있으면 안 된다" 류 계약용. */
function sourceOf(relativePath, name) {
  const source = read(relativePath);
  const ast = ts.createSourceFile("source.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
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
vm.runInContext(extract(ACTS, "PENDING_STATES"), context);
vm.runInContext(extract(ACTS, "mergeCodexOutline"), context);
vm.runInContext(extract(COPY, "codexChapterStateLabel"), context);

const mergeCodexOutline = (outline, chapters, total) => context.mergeCodexOutline(outline, chapters, total);
const codexChapterStateLabel = (copy, state) => context.codexChapterStateLabel(copy, state);

function outlineOf(total, states = {}) {
  return Array.from({ length: total }, (_, index) => ({
    id: `c${index + 1}`,
    order: index + 1,
    title: `제${index + 1}장 · 제목 ${index + 1}`,
    state: states[index + 1] || "pending",
  }));
}

function chapterAt(order) {
  return { id: `c${order}`, order, title: `제${order}장 · 제목 ${order}`, body: "본문".repeat(400) };
}

test("본문이 1장뿐이어도 목차는 구매한 20장을 전부 만든다", () => {
  const rows = mergeCodexOutline(outlineOf(20), [chapterAt(1)], 20);
  assert.equal(rows.length, 20);
  assert.equal(rows.filter((row) => row.state === "ready").length, 1);
  assert.equal(rows[0].state, "ready");
  assert.ok(rows[0].chapter, "1장은 본문을 들고 있다");
  assert.equal(rows[1].state, "pending");
  assert.equal(rows[1].chapter, null);
  // 제목은 목차(서버 outline)에서 와야 한다 — 아직 안 쓰인 장도 무슨 장인지 보여 준다.
  assert.match(rows[19].title, /제20장/);
});

test("받은 장 수로 전체 구성을 역산하지 않는다", () => {
  // 낡은 캐시·구버전 응답이라 목차가 통째로 없어도 N 은 total 에서 온다.
  const rows = mergeCodexOutline(null, [chapterAt(1)], 20);
  assert.equal(rows.length, 20, "목차가 없어도 1장짜리 책이 되지 않는다");
  assert.equal(rows.filter((row) => row.state === "ready").length, 1);
});

test("구멍이 뚫린 채 도착한 장도 제 번호 자리에 들어간다", () => {
  // 앞구간 절단이 사라진 뒤의 정상 모습: 2장이 비어도 3·5장은 읽을 수 있다.
  const rows = mergeCodexOutline(outlineOf(20, { 2: "retrying" }), [chapterAt(1), chapterAt(3), chapterAt(5)], 20);
  // vm 컨텍스트에서 온 배열이라 프로토타입이 달라 deepStrictEqual 이 걸린다 — 값으로 본다.
  assert.equal(rows.filter((row) => row.state === "ready").map((row) => row.order).join(","), "1,3,5");
  assert.equal(rows[1].state, "retrying", "재시도 중인 장은 사유를 들고 있다");
});

test("서버가 ready 라고 해도 본문이 없으면 열지 않는다", () => {
  const rows = mergeCodexOutline(outlineOf(20, { 2: "ready", 3: "ready" }), [chapterAt(1)], 20);
  assert.equal(rows[1].state, "pending", "본문 없는 ready 는 신뢰하지 않는다(fail-closed)");
  assert.equal(rows[2].state, "pending");
  assert.equal(rows.filter((row) => row.state === "ready").length, 1);
});

test("목차가 total 보다 길면 목차를 따른다", () => {
  // 구성 버전이 올라간 세션(기대 22장)에서 낡은 total 이 장을 잘라먹지 않는다.
  const rows = mergeCodexOutline(outlineOf(22), [chapterAt(1)], 20);
  assert.equal(rows.length, 22);
});

test("중복 order 가 와도 행이 불어나지 않는다", () => {
  const rows = mergeCodexOutline(outlineOf(20), [chapterAt(1), chapterAt(1)], 20);
  assert.equal(rows.length, 20);
  assert.equal(rows.filter((row) => row.state === "ready").length, 1);
});

test("상태 문구는 목차와 본문 자리가 같은 표를 본다", () => {
  const copy = {
    chapterStatePending: "작성 대기",
    chapterStateWriting: "작성 중",
    chapterStateRetrying: "재시도 중",
    chapterStateBlocked: "확인 필요",
  };
  assert.equal(codexChapterStateLabel(copy, "pending"), "작성 대기");
  assert.equal(codexChapterStateLabel(copy, "writing"), "작성 중");
  assert.equal(codexChapterStateLabel(copy, "retrying"), "재시도 중");
  assert.equal(codexChapterStateLabel(copy, "blocked"), "확인 필요");
  // 모르는 상태를 "작성 완료"쪽으로 흘려보내지 않는다.
  assert.equal(codexChapterStateLabel(copy, "somethingNew"), "작성 대기");
  assert.equal(codexChapterStateLabel(copy, ""), "작성 대기");
});

test("막 탭은 생성 상태로 비활성되지 않는다", () => {
  const spine = read(SPINE);
  assert.ok(!/disabled/.test(spine), "막 버튼에 disabled 가 남아 있으면 II~V 가 잠긴 것처럼 보인다");
  assert.ok(spine.includes("codexChapterStateLabel"), "목차는 안 쓰인 장에 사유를 붙인다");
});

test("리더는 기대 목록으로 5막 전부를 그린다", () => {
  const reader = read(READER);
  assert.ok(reader.includes("mergeCodexOutline("), "목차 병합은 리더가 직접 한다");
  assert.ok(reader.includes("groupByAct(rows, mode, { keepEmpty: true })"), "본문이 없는 막도 렌더한다");
  assert.ok(!reader.includes("groupByAct(ordered, mode)"), "받은 장으로 막을 만들던 경로가 남아 있다");
  assert.ok(reader.includes("<ChapterPlaceholder"), "안 쓰인 장은 사유 자리표시자를 그린다");
});

test("자리표시자는 앵커를 남기되 PDF 에는 들어가지 않는다", () => {
  const placeholder = sourceOf(READER, "ChapterPlaceholder");
  assert.ok(!placeholder.includes("data-codex-pdf-page"), "빈 장이 소장본 PDF 에 끼면 안 된다");
  assert.ok(placeholder.includes("CODEX_CHAPTER_ANCHOR_PREFIX"), "목차·이전/다음 이동이 걸릴 대상이 필요하다");
  assert.ok(placeholder.includes("tabIndex={-1}"), "키보드 이동 대상이어야 한다");
  assert.ok(placeholder.includes("codexChapterStateLabel"), "왜 비어 있는지 적는다");
});

test("봉인·마무리·PDF 는 전 장이 실제로 도착했을 때만 열린다", () => {
  const reader = read(READER);
  assert.ok(
    /const sealed = completed && rows\.length > 0 && readyCount === rows\.length/.test(reader),
    "sealed 는 completed 플래그만으로 서지 않는다",
  );
  assert.ok(reader.includes("{sealed ? <CodexSeal"), "1장짜리 책에 봉인 화면이 뜨면 안 된다");
  assert.ok(reader.includes("{sealed && <CodexReportOutro"), "마무리 카드도 같은 조건이다");
  assert.ok(reader.includes("disabled={pdfLoading || !sealed}"), "미완성 책을 PDF 로 굽지 않는다");
  assert.ok(!/chapterCount=\{ordered\.length\}/.test(reader), "부분 길이를 완성 분량처럼 적지 않는다");
  assert.ok(reader.includes("copy.coverChapterProgressSuffix"), "다 쓰이기 전에는 N장 중 K장으로 적는다");
});

test("하단 이동 버튼은 '보관함' 하나로 통일돼 실제 보관함으로 간다", () => {
  const seal = read(SEAL);
  assert.ok(!seal.includes("destiny-island"), "운명의 지도 이동 핸들러가 남아 있다");
  assert.ok(seal.includes("CODEX_LIBRARY_ANCHOR"), "목적지는 실제로 존재하는 보관함 앵커다");
  assert.ok(seal.includes("copy.libraryNavLink"), "라벨은 리더 아래 링크와 같은 키를 본다");

  const copySource = read(COPY);
  assert.ok(!copySource.includes("continueDestinyButton"), "고아가 된 문구 키가 남아 있다");
  assert.match(copySource, /libraryNavLink:\s*"보관함"/, "ko 라벨은 정확히 '보관함' 이다");
});

test("결과 화면이 서버 목차를 리더까지 들고 간다", () => {
  const client = read(RESULT_CLIENT);
  assert.ok(/outline:\s*Array\.isArray\(payload\.outline\)/.test(client), "/session 의 outline 을 복사한다");
  assert.ok(client.includes("outline={session.outline}"), "리더로 내려보낸다");
  assert.ok(client.includes("totalChapters={session.generationProgress?.total}"), "기대 장 수도 서버에서 온다");
});
