/**
 * postbuild CSS 압축기가 **React 가 하이드레이션하는 HTML 의 인라인 <style> 을 건드리지 않는지** 검증한다.
 *
 * 왜 이 가드가 있나 (2026-08-23 실측):
 * 컴포넌트가 렌더한 <style> 의 텍스트는 JS 번들 안 템플릿 리터럴에 원본 그대로 들어 있다.
 * 산출물 HTML 쪽만 압축하면 하이드레이션에서 텍스트가 어긋나 React 가
 * "Minified React error #418 (text)" 를 던지고 서브트리를 다시 그린다.
 * 프로덕션 /flower/destiny 의 <style> 이 SSR 2,300B vs 클라이언트 3,053B 로 갈려 있었고
 * app/components/FeatureLandingPage.tsx 를 쓰는 라우트 18개 전부가 이 오류를 냈다.
 * 배포 스모크는 pageerror 를 실패로 보므로 그중 하나가 스모크 목록에 들어온 순간 릴리스가 막혔다.
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
const script = path.join(root, "scripts", "minify-dist-css.mjs");

/** 압축하면 눈에 띄게 줄어드는 CSS. `100%` → `to` 치환이 압축 여부의 지표다. */
const CSS = `
        @keyframes flp-orb { 0%,100%{opacity:.85;transform:scale(1)} 50%{opacity:1;transform:scale(1.1)} }
        .flp-particle { position: absolute; opacity: 0.5; }
`;

function buildFixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cd-minify-css-"));
  const dist = path.join(dir, "dist");
  fs.mkdirSync(dist, { recursive: true });
  // 정적 셸: 하이드레이션 대상이 아니다 → 압축돼야 한다.
  fs.writeFileSync(path.join(dist, "shell.html"), `<html><head><style>${CSS}</style></head><body>shell</body></html>`, "utf8");
  // Next 프리렌더: 플라이트 페이로드가 있다 → 인라인 <style> 을 건드리면 안 된다.
  fs.writeFileSync(
    path.join(dist, "app.html"),
    `<html><head><style>${CSS}</style></head><body><script>self.__next_f.push([1,"x"])</script></body></html>`,
    "utf8",
  );
  return { dir, dist };
}

test("압축기는 정적 셸의 인라인 <style> 은 줄이고 하이드레이션 HTML 은 그대로 둔다", () => {
  const { dir, dist } = buildFixture();
  try {
    execFileSync(process.execPath, [script], { cwd: dir, stdio: "pipe" });

    const shell = fs.readFileSync(path.join(dist, "shell.html"), "utf8");
    const app = fs.readFileSync(path.join(dist, "app.html"), "utf8");

    // 정적 셸은 압축됐다 — esbuild 가 100% 를 to 로 줄인다.
    assert.match(shell, /0%,to\{/, "정적 셸의 인라인 <style> 이 압축되지 않았다(압축 이득이 사라진다)");

    // 하이드레이션 HTML 은 바이트 그대로여야 한다.
    assert.ok(app.includes(CSS), "React 하이드레이션 HTML 의 인라인 <style> 이 변형됐다 — React #418 이 재발한다");
    assert.doesNotMatch(app, /0%,to\{/, "하이드레이션 HTML 의 <style> 이 압축됐다");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("압축기 소스가 하이드레이션 판별을 유지한다", () => {
  const source = fs.readFileSync(script, "utf8");
  assert.match(source, /__next_f/, "하이드레이션 판별자(__next_f)가 사라졌다");
  assert.match(source, /isReactHydratedHtml/, "isReactHydratedHtml 가드가 사라졌다");
});
