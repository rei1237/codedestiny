const test = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { resolve } = require("node:path");

const root = resolve(process.cwd());
const script = resolve(root, "scripts/externalize-dist-inline-css.mjs");

test("CSS 외부화기는 첫 페인트 잠금과 React HTML을 보존하고 stylesheet 경계를 넘지 않는다", () => {
  const fixture = mkdtempSync(resolve(tmpdir(), "code-destiny-css-shell-"));
  try {
    const dist = resolve(fixture, "dist");
    mkdirSync(dist, { recursive: true });
    const shell = `<!doctype html>
      <style id="cd-main-shell-critical-v20260604">.shell{color:rebeccapurple}</style>
      <style id="cd-hero-firstpaint-lock-v20260820">.lock{opacity:0}</style>
      <style id="after-lock">.after{display:block}</style>
      <link rel="stylesheet" href="/styles/theme.css">
      <style id="after-link">.later{display:grid}</style>`;
    writeFileSync(resolve(dist, "index.html"), shell, { encoding: "utf8", flag: "w" });
    writeFileSync(
      resolve(dist, "react.html"),
      `<!doctype html>${shell}<script>self.__next_f.push([])</script>`,
      { encoding: "utf8", flag: "w" },
    );

    execFileSync(process.execPath, [script], { cwd: fixture, encoding: "utf8" });

    const output = readFileSync(resolve(dist, "index.html"), "utf8");
    const reactOutput = readFileSync(resolve(dist, "react.html"), "utf8");
    const cssFiles = readdirSync(resolve(dist, "css", "shell"));

    assert.match(output, /href="\/css\/shell\/s-[a-f0-9]+\.css"/, "정적 셸 CSS가 파일로 분리되지 않았다");
    assert.match(output, /id="cd-hero-firstpaint-lock-v20260820"/, "첫 페인트 잠금 CSS가 외부화됐다");
    assert.match(output, /href="\/styles\/theme\.css"/, "기존 stylesheet 경계가 사라졌다");
    assert.match(reactOutput, /id="cd-main-shell-critical-v20260604"/, "React 하이드레이션 HTML을 건드렸다");
    assert.equal(cssFiles.length, 3, "잠금 style과 stylesheet link가 각각 외부화 경계를 만들어야 한다");
    assert.match(
      cssFiles.map((name) => readFileSync(resolve(dist, "css", "shell", name), "utf8")).join("\n"),
      /\.after/,
      "잠금 뒤의 정적 CSS가 빠졌다",
    );
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});
