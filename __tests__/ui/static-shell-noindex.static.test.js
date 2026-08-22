/**
 * 정적 셸 사본 라우트(writeStaticShellCanonicalRoutes 산출물)의 색인 정책 가드.
 *
 * 🔴 이 라우트들은 body 가 루트 index.html 과 사실상 동일한 SPA 딥링크다. 홈과 중복이라
 *    **색인시키지 않는 것이 제품 결정**이고(2026-08-23 사용자 확정), generate-sitemap.mjs 의
 *    noindexPathPrefixes 와 주입기의 robots 값이 그 결정을 함께 지킨다.
 *
 * 왜 가드가 필요한가: 실제로 한 번 어긋났었다. 같은 주입기가 두 스크립트에 복사돼 있었고
 * prepare-cloudflare-dist 쪽은 `index, follow` + 슬래시 없는 canonical 을 쓰고 있었다.
 * postbuild 순서 덕에 promote 쪽 값이 덮어써서 라이브에는 안 나갔을 뿐, 순서가 바뀌면
 * 그대로 배포되는 상태였다. 구현은 scripts/lib/static-shell-route-meta.mjs 하나로 합쳤고,
 * 이 테스트가 그 결정이 조용히 뒤집히지 않도록 잠근다.
 *
 * 대상은 손으로 적지 않는다 — getStaticShellCanonicalRoutes() 에서 전수 발견하므로
 * 셸 사본 라우트를 새로 추가하면 자동으로 검사 대상이 된다(CLAUDE.md 원칙 10).
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const shell = fs.readFileSync(path.join(root, "index.html"), "utf8");
const sitemap = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");
const sitemapSource = fs.readFileSync(path.join(root, "scripts/generate-sitemap.mjs"), "utf8");

const toModuleUrl = (relative) =>
  new URL(`file:///${path.join(root, relative).replace(/\\/g, "/")}`).href;

async function loadStaticShellRoutes() {
  const { getStaticShellCanonicalRoutes } = await import(
    toModuleUrl("scripts/static-canonical-route-map.mjs")
  );
  return getStaticShellCanonicalRoutes();
}

async function loadInjector() {
  const { injectStaticShellRouteMeta } = await import(
    toModuleUrl("scripts/lib/static-shell-route-meta.mjs")
  );
  return injectStaticShellRouteMeta;
}

function readNoindexPrefixes() {
  const block = sitemapSource.match(/const noindexPathPrefixes = \[([\s\S]*?)\n\];/);
  assert.ok(block, "generate-sitemap.mjs 에서 noindexPathPrefixes 배열을 찾지 못했다");
  return [...block[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
}

function pick(html, pattern) {
  const found = html.match(pattern);
  return found ? found[1] : null;
}

test("검사 대상 셸 사본 라우트를 실제로 찾았다 (fail-closed)", async () => {
  const routes = await loadStaticShellRoutes();
  assert.ok(routes.length > 0, "static-shell 라우트가 0개면 이 가드는 아무것도 지키지 않는다");
  for (const route of routes) {
    assert.ok(route.canonical && route.title && route.description, `불완전한 엔트리: ${route.canonical}`);
  }
});

test("🔴 셸 사본은 noindex 로 나가고 self-canonical 이 성립한다", async () => {
  const routes = await loadStaticShellRoutes();
  const inject = await loadInjector();

  for (const route of routes) {
    const html = inject(shell, route);
    const robots = pick(html, /<meta name="robots" content="([^"]*)"/i);
    const canonical = pick(html, /<link rel="canonical" href="([^"]*)"/i);

    assert.ok(
      robots && robots.startsWith("noindex"),
      `${route.canonical}: robots 가 noindex 로 시작해야 한다 (실제: ${robots})`,
    );
    assert.equal(
      canonical,
      `https://code-destiny.com${route.canonical}/`,
      `${route.canonical}: trailingSlash:true 라 후행 슬래시가 있어야 self-canonical 이 성립한다`,
    );
  }
});

test("셸 사본의 소셜 카드는 홈이 아니라 그 라우트를 가리킨다", async () => {
  const routes = await loadStaticShellRoutes();
  const inject = await loadInjector();
  const homeOgDescription = pick(shell, /<meta property="og:description" content="([^"]*)"/i);
  assert.ok(homeOgDescription, "홈 셸에서 og:description 을 찾지 못했다");

  for (const route of routes) {
    const html = inject(shell, route);
    const canonical = pick(html, /<link rel="canonical" href="([^"]*)"/i);

    assert.equal(pick(html, /<meta property="og:title" content="([^"]*)"/i), route.title, `${route.canonical}: og:title`);
    assert.equal(pick(html, /<meta name="twitter:title" content="([^"]*)"/i), route.title, `${route.canonical}: twitter:title`);
    assert.equal(pick(html, /<meta property="og:url" content="([^"]*)"/i), canonical, `${route.canonical}: og:url 은 canonical 과 같아야 한다`);
    assert.notEqual(
      pick(html, /<meta property="og:description" content="([^"]*)"/i),
      homeOgDescription,
      `${route.canonical}: 홈 og:description 이 그대로 남아 공유 카드가 홈으로 보인다`,
    );
  }
});

test("셸 사본 라우트는 noindexPathPrefixes 에 있고 사이트맵에는 없다", async () => {
  const routes = await loadStaticShellRoutes();
  const prefixes = readNoindexPrefixes();

  for (const route of routes) {
    assert.ok(
      prefixes.includes(route.canonical),
      `${route.canonical}: generate-sitemap.mjs 의 noindexPathPrefixes 에 없다 — 사이트맵에 섞여 들어간다`,
    );
    assert.ok(
      !sitemap.includes(`https://code-destiny.com${route.canonical}/`),
      `${route.canonical}: noindex 인데 sitemap.xml 에 있다 (GSC "제출된 URL에 noindex" 오류)`,
    );
  }
});
