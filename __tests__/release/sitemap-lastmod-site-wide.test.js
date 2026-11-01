/**
 * 사이트 전역 모듈을 고쳐도 사이트맵 lastmod 가 한꺼번에 올라가지 않는지 지킨다.
 *
 * 지키는 사고 (2026-11-01 실측): lib/seo/entity-registry.mjs·siteSeo.ts 같은 공유 모듈을 고치자
 * 830개 중 329개 라우트의 lastmod 가 그날로 올라갔다. 본문이 바뀐 페이지는 거의 없었다.
 * 이제 원장 라우트의 80% 이상이 import 하는 파일은 라우트 서명에서 빠지고, 그 파일 안의
 * 라우트 전용 항목(`path: "/a"` 객체와 그 번역 키)만 그 라우트 서명에 들어간다.
 *
 * 실제 저장소 대신 임시 루트를 쓴다 — 공유 모듈을 고쳐 보는 게 이 테스트의 본질이다.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const LEDGER_MODULE = path.resolve(__dirname, "../../scripts/lib/sitemap-lastmod.mjs");
const ROUTES = ["/a/", "/b/", "/c/"];

function write(root, rel, text) {
  const abs = path.join(root, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, text, "utf8");
}

function makeFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "sitemap-site-wide-"));
  fs.mkdirSync(path.join(root, "config"));
  write(root, "lib/fortune/periods.ts", 'export const FORTUNE_PERIOD_IDS = ["today", "tomorrow", "weekly", "monthly"] as const;\n');
  write(root, "lib/i18n/locales.ts", 'export const LOCALES = [{ pathPrefix: "/en" }];\n');
  write(
    root,
    "lib/shared.mjs",
    [
      'const TEXT = {',
      '  "shared.a": "A 제목",',
      '  "shared.b": "B 제목",',
      '};',
      'export const BRAND = "꿀꿀 운세";',
      'export const PAGES = [',
      '  { path: "/a", title: TEXT["shared.a"] },',
      '  { path: "/b", title: TEXT["shared.b"] },',
      '];',
      '',
    ].join("\n"),
  );
  write(root, "lib/a-body.mjs", 'export const BODY = "A 본문";\n');
  write(root, "app/a/page.js", 'import "../../lib/shared.mjs";\nimport "../../lib/a-body.mjs";\n');
  write(root, "app/b/page.js", 'import "../../lib/shared.mjs";\n');
  write(root, "app/c/page.js", 'import "../../lib/shared.mjs";\n');
  return root;
}

async function build(root, today, options = {}) {
  const { createSitemapLastmodLedger } = await import(pathToFileURL(LEDGER_MODULE).href);
  const ledger = createSitemapLastmodLedger({ rootDir: root, today, routes: ROUTES, ...options });
  const lastmods = Object.fromEntries(ROUTES.map((route) => [route, ledger.lastmodFor(route)]));
  ledger.save();
  return lastmods;
}

function edit(root, rel, from, to) {
  const abs = path.join(root, rel);
  const text = fs.readFileSync(abs, "utf8");
  assert.ok(text.includes(from), `${rel} 에 ${from} 이 없습니다.`);
  fs.writeFileSync(abs, text.replace(from, to), "utf8");
}

test("전역 모듈의 공용 부분을 고쳐도 어느 라우트도 올라가지 않는다", async (t) => {
  const root = makeFixture();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  await build(root, "2026-11-01");

  edit(root, "lib/shared.mjs", '"꿀꿀 운세"', '"꿀꿀 운세 공식"');
  assert.deepEqual(await build(root, "2026-11-02"), { "/a/": "2026-11-01", "/b/": "2026-11-01", "/c/": "2026-11-01" });
});

test("전역 모듈 안의 라우트 전용 항목(번역 키 포함)을 고치면 그 라우트만 올라간다", async (t) => {
  const root = makeFixture();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  await build(root, "2026-11-01");

  edit(root, "lib/shared.mjs", '"B 제목"', '"B 새 제목"');
  assert.deepEqual(await build(root, "2026-11-02"), { "/a/": "2026-11-01", "/b/": "2026-11-02", "/c/": "2026-11-01" });

  edit(root, "lib/a-body.mjs", "A 본문", "A 새 본문");
  assert.deepEqual(await build(root, "2026-11-03"), { "/a/": "2026-11-03", "/b/": "2026-11-02", "/c/": "2026-11-01" });
});

test("v1 원장에서 올라와도 알고리즘 변경만으로는 lastmod 가 바뀌지 않는다", async (t) => {
  const root = makeFixture();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  // routes 를 주지 않으면 전역 제외가 없어 v1 과 같은 서명이 나온다.
  await build(root, "2026-10-01", { routes: undefined });
  const ledgerPath = path.join(root, "config/sitemap-lastmod.json");
  const v1 = JSON.parse(fs.readFileSync(ledgerPath, "utf8"));
  fs.writeFileSync(ledgerPath, JSON.stringify({ ...v1, version: 1 }), "utf8");

  assert.deepEqual(await build(root, "2026-11-02"), { "/a/": "2026-10-01", "/b/": "2026-10-01", "/c/": "2026-10-01" });
  assert.equal(JSON.parse(fs.readFileSync(ledgerPath, "utf8")).version, 2);
});
