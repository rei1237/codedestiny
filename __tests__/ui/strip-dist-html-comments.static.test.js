/**
 * postbuild 주석 제거기가 **정적 셸의 저작 주석만** 걷어내는지 검증한다.
 *
 * 왜 이 가드가 있나:
 * ① React 가 하이드레이션하는 HTML 의 `<!--$-->` `<!--/$-->` `<!-- -->` 는 저작 주석이 아니라
 *    Suspense 경계·텍스트 구분자다. 지우면 하이드레이션이 어긋난다. 2026-08-28 실측으로
 *    dist HTML 744개 중 709개가 하이드레이션 대상이고 그 안에 마커가 18,188블록 있었다.
 * ② `<script>` 안의 `<!--` 는 주석이 아니라 스크립트 텍스트다.
 * ③ 🔴 반대로, **주석 본문에 적힌 `<script>` 라는 글자가 가짜 스크립트 구간을 열어** 그 뒤의
 *    진짜 주석을 삼키면 안 된다. 정규식으로 스크립트 구간을 먼저 잡던 첫 구현이 그랬고,
 *    셸의 preconnect 설명 주석 때문에 실제로 주석 1개가 남았다(2026-08-28).
 *
 * 실제 dist 산출물이 필요 없도록 임시 dist 를 만들어 스크립트를 그대로 돌린다.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const root = path.resolve(__dirname, "../..");
const script = path.join(root, "scripts", "strip-dist-html-comments.mjs");

const AUTHORING = "<!-- 홈 히어로 첫 페인트 확정값 (cd-hero-firstpaint-lock-v20260820) -->";
const MENTIONS_SCRIPT = "<!-- 이 preconnect 는 <script> 가 crossorigin 없이 나가는 것을 막는다 -->";
const AFTER_MENTION = "<!-- 위 주석 뒤에도 반드시 지워져야 하는 주석 -->";
const CONDITIONAL = "<!--[if IE]><p>old</p><![endif]-->";
const IN_SCRIPT = '<script>var s = "<!-- not a comment -->";</script>';

function buildFixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cd-strip-comments-"));
  const dist = path.join(dir, "dist");
  fs.mkdirSync(dist, { recursive: true });
  // 정적 셸: 하이드레이션 대상이 아니다 → 저작 주석이 지워져야 한다.
  fs.writeFileSync(
    path.join(dist, "shell.html"),
    `<html><head>${AUTHORING}${MENTIONS_SCRIPT}${AFTER_MENTION}${CONDITIONAL}</head>` +
      `<body><div id="keep">본문</div>${IN_SCRIPT}</body></html>`,
    "utf8",
  );
  // Next 프리렌더: 플라이트 페이로드가 있다 → 주석을 하나도 건드리면 안 된다.
  fs.writeFileSync(
    path.join(dist, "app.html"),
    `<html><body><!--$--><p>a<!-- -->b</p><!--/$-->${AUTHORING}` +
      `<script>self.__next_f.push([1,"x"])</script></body></html>`,
    "utf8",
  );
  return { dir, dist };
}

test("주석 제거기는 정적 셸의 저작 주석만 지우고 하이드레이션 HTML 은 그대로 둔다", () => {
  const { dir, dist } = buildFixture();
  try {
    execFileSync(process.execPath, [script], { cwd: dir, stdio: "pipe" });

    const shell = fs.readFileSync(path.join(dist, "shell.html"), "utf8");
    const app = fs.readFileSync(path.join(dist, "app.html"), "utf8");

    assert.ok(!shell.includes(AUTHORING), "정적 셸의 저작 주석이 남았다(감소 이득이 사라진다)");
    assert.ok(!shell.includes(MENTIONS_SCRIPT), "`<script>` 를 언급하는 주석이 남았다");
    assert.ok(
      !shell.includes(AFTER_MENTION),
      "`<script>` 를 언급하는 주석 뒤의 주석이 남았다 — 가짜 스크립트 구간이 뒤를 삼키고 있다",
    );
    assert.ok(shell.includes(CONDITIONAL), "조건부 주석이 지워졌다");
    assert.ok(shell.includes(IN_SCRIPT), "`<script>` 안의 문자열이 변형됐다");
    assert.ok(shell.includes('<div id="keep">본문</div>'), "주석 밖 마크업이 함께 지워졌다");

    assert.ok(app.includes("<!--$-->") && app.includes("<!--/$-->"), "Suspense 경계 마커가 지워졌다 — 하이드레이션이 깨진다");
    assert.ok(app.includes("<!-- -->"), "React 텍스트 구분자가 지워졌다");
    assert.ok(app.includes(AUTHORING), "하이드레이션 HTML 을 건드렸다");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("dist 에 HTML 이 없으면 조용히 통과하지 않는다", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cd-strip-comments-empty-"));
  try {
    assert.throws(
      () => execFileSync(process.execPath, [script], { cwd: dir, stdio: "pipe" }),
      /./,
      "검사 대상이 없을 때 exit 0 이면 일을 한 척하는 단계가 된다",
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
