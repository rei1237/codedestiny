/**
 * 앱 번들에서 `<!--cd-app-strip-->` … `<!--/cd-app-strip-->` 구간을 걷어내는 패스
 * (scripts/build-mobile-app.mjs 의 stripAppOnlyMarkedBlocks)를 지킨다.
 *
 * 왜 마커인가 (2026-09-03): 셸 `index.html` 은 인라인 스타일만 816KB 라 앱 전용 분기를 코드로
 * 넣을 자리가 없다. 그래서 소스에 표식만 남기고 앱 빌드에서 그 구간을 통째로 지운다.
 * 현재 대상 둘 — 푸터의 SEO 내부 링크 허브(28링크), 관리자 진입 꽃 버튼(#cdAdminFlowerWrap).
 *
 * 🔴 이 패스는 **`scripts/strip-dist-html-comments.mjs` 의 `mustKeep` 에 의존한다.**
 *    postbuild 가 먼저 돌면서 저작 주석을 지우는데, 거기서 표식까지 지우면 이 패스가 대상 0건이
 *    된다. 그 결합을 잊어 표식을 지우면 아래 fail-closed ① 가 문다.
 *
 * 죽는 방식 셋을 전부 잠근다:
 *   · 매칭 0건인데 통과 — rewriteVnAssetsToCdn 이 실제로 그렇게 죽어 있었다(fail-open)
 *   · 표식 짝이 안 맞아 구간이 앱에 그대로 남기 — 지운 줄 알고 넘어간다
 *   · 표식 밖까지 잘라내기 — 개인정보처리방침·이용약관·사업자 정보가 함께 사라진다
 *     (Play 정책·전자상거래법상 앱에도 있어야 한다)
 *
 * 🔴 jest 가 아니라 node:test 다. scripts/** 는 tier=standard 라 jest(critical 티어)에서는
 *    정작 이 파일을 고치는 PR 에서 스킵된다. test:node 는 PR CI fast 잡이라 항상 돈다.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const fsp = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { readFileSync } = require("node:fs");
const { pathToFileURL } = require("node:url");

const root = path.resolve(__dirname, "../..");
const scriptPath = path.join(root, "scripts", "build-mobile-app.mjs");
const commentStripPath = path.join(root, "scripts", "strip-dist-html-comments.mjs");
const loadScript = () => import(pathToFileURL(scriptPath).href);

const makeDist = () => fsp.mkdtemp(path.join(os.tmpdir(), "cd-app-strip-"));

test("표식 사이만 걷어내고 바깥은 그대로 둔다", async () => {
  const { stripAppOnlyBlocks } = await loadScript();

  const footer = [
    '<footer role="contentinfo">',
    "<!--cd-app-strip-->",
    '<div class="cd-footer-shell"><a href="/tarot/">타로</a></div>',
    "<!--/cd-app-strip-->",
    '<div class="cd-footer-legal"><a href="/privacy/">개인정보처리방침</a></div>',
    "<!--cd-app-strip-->",
    '<div id="cdAdminFlowerWrap">🌸</div>',
    "<!--/cd-app-strip-->",
    "</footer>",
  ].join("\n");

  const result = stripAppOnlyBlocks(footer);
  assert.equal(result.stripped, 2, "표식 구간 2개가 모두 걷혀야 한다");
  assert.ok(!result.html.includes("cd-footer-shell"), "SEO 링크 허브가 남았다");
  assert.ok(!result.html.includes("cdAdminFlowerWrap"), "관리자 진입 버튼이 남았다");
  assert.ok(!result.html.includes("cd-app-strip"), "표식 자체도 남으면 안 된다");

  // 🔴 법적 고지는 표식 밖이다. 여기가 무너지면 앱 심사에서 걸린다.
  assert.ok(result.html.includes('href="/privacy/"'), "개인정보처리방침 링크가 함께 지워졌다");
  assert.ok(result.html.includes("cd-footer-legal"), "표식 밖 푸터 본체가 함께 지워졌다");

  // 표식이 없는 문서는 손대지 않는다.
  const untouched = "<html><body>표식 없음</body></html>";
  assert.deepEqual(stripAppOnlyBlocks(untouched), { html: untouched, stripped: 0 });
});

test("dist 를 훑어 실제로 파일을 고치고, 대상이 0건이면 실패한다", async () => {
  const { stripAppOnlyMarkedBlocks } = await loadScript();

  const dist = await makeDist();
  await fsp.mkdir(path.join(dist, "tarot"), { recursive: true });
  await fsp.writeFile(
    path.join(dist, "index.html"),
    '<footer><!--cd-app-strip--><div class="cd-footer-shell">허브</div><!--/cd-app-strip--><a href="/terms/">이용약관</a></footer>',
    "utf8"
  );
  await fsp.writeFile(
    path.join(dist, "tarot", "index.html"),
    "<main><!--cd-app-strip-->제거<!--/cd-app-strip-->유지</main>",
    "utf8"
  );
  await fsp.writeFile(path.join(dist, "keep.txt"), "표식 없는 파일", "utf8");

  const result = await stripAppOnlyMarkedBlocks(dist);
  assert.equal(result.stripped, 2);
  assert.equal(result.files, 2, "표식이 있는 HTML 두 벌 모두 고쳐야 한다");
  assert.equal(
    await fsp.readFile(path.join(dist, "index.html"), "utf8"),
    '<footer><a href="/terms/">이용약관</a></footer>'
  );
  assert.equal(await fsp.readFile(path.join(dist, "tarot", "index.html"), "utf8"), "<main>유지</main>");

  // 두 번째 실행은 고칠 게 없다 → fail-closed ①. "대상이 없으니 통과"는 가드가 아니다.
  await assert.rejects(() => stripAppOnlyMarkedBlocks(dist), /한 건도 찾지 못했다/);

  await fsp.rm(dist, { recursive: true, force: true });
});

test("짝이 맞지 않는 표식이 남으면 실패한다", async () => {
  const { stripAppOnlyMarkedBlocks } = await loadScript();

  const dist = await makeDist();
  // 여는 표식 2개 / 닫는 표식 1개 — 첫 짝만 걷히고 두 번째 여는 표식이 남는다.
  await fsp.writeFile(
    path.join(dist, "index.html"),
    "<footer><!--cd-app-strip-->A<!--/cd-app-strip--><!--cd-app-strip-->B</footer>",
    "utf8"
  );

  await assert.rejects(() => stripAppOnlyMarkedBlocks(dist), /짝이 맞지 않는/);

  await fsp.rm(dist, { recursive: true, force: true });
});

test("main() 이 이 패스를 부르고, 주석 스트리퍼가 표식을 보존한다", () => {
  const source = readFileSync(scriptPath, "utf8");
  assert.match(source, /await stripAppOnlyMarkedBlocks\(\)/, "패스가 main() 에 배선돼 있어야 한다");

  // 🔴 postbuild 가 표식을 지우면 위 fail-closed ① 가 앱 빌드를 통째로 세운다.
  const commentStripper = readFileSync(commentStripPath, "utf8");
  assert.match(
    commentStripper,
    /cd-app-strip/,
    "strip-dist-html-comments.mjs 의 mustKeep 이 앱 스트립 표식을 더 이상 보존하지 않는다"
  );
});
