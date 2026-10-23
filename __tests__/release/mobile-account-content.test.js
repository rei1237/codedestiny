const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const { pathToFileURL } = require("node:url");
const { JSDOM } = require("jsdom");
const root = path.resolve(__dirname, "../..");
const loadBuild = () => import(pathToFileURL(path.join(root, "scripts/build-mobile-app.mjs")).href);

test("앱은 웹 결제 화면만 제거하고 계정 기록과 콘텐츠를 보존한다", async () => {
  const dist = await fs.mkdtemp(path.join(os.tmpdir(), "cd-mobile-content-"));
  const preserved = ["points/history", "records", "yeongnyangi/library", "insights", "famous-saju", "ja/insights"];
  try {
    for (const route of [...preserved, "points", "premium-unlock"]) {
      await fs.mkdir(path.join(dist, route), { recursive: true });
      await fs.writeFile(path.join(dist, route, "index.html"), route);
    }
    await fs.writeFile(path.join(dist, "points.html"), "web-payment");
    await (await loadBuild()).removeAppForbiddenRoutes(dist);
    for (const route of preserved) assert.equal(await fs.readFile(path.join(dist, route, "index.html"), "utf8"), route);
    for (const route of ["points/index.html", "points.html", "premium-unlock/index.html"]) {
      await assert.rejects(fs.access(path.join(dist, route)));
    }
  } finally { await fs.rm(dist, { recursive: true, force: true }); }
});

test("가드는 구매 내역과 콘텐츠 링크를 가로채거나 삭제하지 않는다", async () => {
  const links = ["/points/history/", "/ja/points/history/index.html", "/insights/", "/famous-saju/", "/records/", "/yeongnyangi/library/"];
  const dom = new JSDOM("<body>" + links.map(href => `<a href="${href}">read</a>`).join("") + "</body>", { url: "https://localhost", runScripts: "outside-only" });
  try {
    dom.window.fetch = async () => { throw new Error("network forbidden"); };
    dom.window.eval(await fs.readFile(path.join(root, "scripts/app-payment-guard.js"), "utf8"));
    dom.window.__cdAppPaymentGuard.applyPrunedRouteCleanup();
    assert.equal(dom.window.document.querySelectorAll("a").length, links.length);
    for (const a of dom.window.document.querySelectorAll("a")) {
      const event = new dom.window.MouseEvent("click", { bubbles: true, cancelable: true });
      let reached = false, intercepted = false;
      a.addEventListener("click", e => {
        reached = true; intercepted = e.defaultPrevented; e.preventDefault();
      }, { once: true });
      a.dispatchEvent(event);
      assert.equal(reached, true);
      assert.equal(intercepted, false);
    }
  } finally { dom.window.close(); }
});

test("부적 PNG 원본은 모바일 축소와 중복 제거 후에도 바이트와 해상도가 유지된다", async () => {
  const dist = await fs.mkdtemp(path.join(os.tmpdir(), "cd-mobile-original-"));
  try {
    const sharp = require("sharp");
    const bytes = await sharp({ create: { width: 1440, height: 3120, channels: 3, background: "#112233" } }).png().toBuffer();
    const original = path.join(dist, "assets/talismans/originals/test-only.png");
    await fs.mkdir(path.dirname(original), { recursive: true });
    await fs.writeFile(original, bytes);
    await fs.writeFile(path.join(dist, "referenced-copy.png"), bytes);
    const build = await loadBuild();
    await build.removeRedundantImageCopies(new Set(["referenced-copy.png"]), dist);
    await build.shrinkOversizedImages(dist);
    assert.deepEqual(await fs.readFile(original), bytes);
    assert.equal((await sharp(original).metadata()).width, 1440);
  } finally { await fs.rm(dist, { recursive: true, force: true }); }
});

test("React head의 인라인 순서를 유지하며 앱 브릿지가 API 출처를 먼저 정한다", async () => {
  const html = '<html><head><meta charset="utf-8"><script>window.reactOwned=1;</script></head><body></body></html>';
  const build = await loadBuild();
  const transformed = build.injectGuardTag(html).html;
  const dom = new JSDOM(transformed, { url: 'https://localhost', runScripts: 'outside-only' });
  try {
    assert.deepEqual(Array.from(dom.window.document.querySelectorAll('script:not([src])'), el => el.textContent), ['window.reactOwned=1;']);
    assert.ok(transformed.indexOf('/js/app-native-bridge.js') < transformed.indexOf('/js/app-payment-guard.js'));
    assert.ok(transformed.indexOf('/js/app-payment-guard.js') < transformed.indexOf('window.reactOwned'));
    dom.window.fetch = async () => { throw new Error('network forbidden'); };
    dom.window.eval(await fs.readFile(path.join(root, 'scripts/app-native-bridge.js'), 'utf8'));
    assert.equal(dom.window.CODE_DESTINY_API_BASE_URL, 'https://code-destiny.com');
    assert.equal(build.injectGuardTag(transformed).changed, false);
  } finally { dom.window.close(); }
});

test("앱 내 정보에서 부적과 읽기 콘텐츠로 이동할 수 있고 언어 변경이 반영된다", async () => {
  const dom = new JSDOM('<html lang="ko"><body><ul class="cd-sheet__menu my-garden-menu"><li><a href="/points/history/">결제 내역</a></li></ul></body></html>', {url:'https://localhost',runScripts:'outside-only'});
  try {
    dom.window.fetch = async () => { throw new Error('network forbidden'); };
    const source=await fs.readFile(path.join(root,'scripts/app-native-bridge.js'),'utf8');
    dom.window.eval(source);
    if(dom.window.document.readyState==='loading') await new Promise(resolve=>dom.window.document.addEventListener('DOMContentLoaded',resolve,{once:true}));
    for(const [id,href] of [['cdTalismanEntry','/app/talismans/index.html'],['cdInsightsEntry','/insights/index.html'],['cdFamousEntry','/insights/famous-saju/index.html']]) assert.equal(dom.window.document.getElementById(id)?.getAttribute('href'),href);
    dom.window.document.documentElement.lang='ja';
    dom.window.dispatchEvent(new dom.window.CustomEvent('cd:locale-ready'));
    assert.equal(dom.window.document.getElementById('cdFamousEntry').textContent,'有名人の四柱推命');
    assert.equal(dom.window.document.querySelectorAll('a[href="/points/history/"]').length,1);
  } finally { dom.window.close(); }
});
