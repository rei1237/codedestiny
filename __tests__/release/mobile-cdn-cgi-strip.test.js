/**
 * 앱 번들에서 동일 오리진 Cloudflare Image Resizing 접두어를 걷어내는 패스
 * (scripts/build-mobile-app.mjs 의 stripSameOriginImageResizing)를 지킨다.
 *
 * 왜 생겼나 (2026-08-30): 홈의 "당신에게 맞는 운세를 선택하세요" 카드 6장이 안드로이드 앱에서
 * 전부 깨진 이미지로 떴다. src/srcset 정본이 `/cdn-cgi/image/<opts>/…` 인데 이건 Cloudflare
 * **존(zone) 기능**이라 앱(https://localhost 출처)에는 없다 — 번들에 cdn-cgi/ 디렉터리가 없고
 * MainActivity 의 RouteProcessor 가 자산 요청으로 흘려보내 전부 404 다. 마크업의 인라인
 * onerror 폴백은 재현 하네스에서는 구제하는데 실기기에서는 구제하지 못했다.
 *
 * 이 패스가 조용히 죽으면 사고가 그대로 돌아온다. 죽는 방식이 셋이라 셋 다 잠근다:
 *   · 매칭 0건인데 통과 — rewriteVnAssetsToCdn 이 실제로 그렇게 죽어 있었다(fail-open)
 *   · 교차 오리진(assets.code-destiny.com)까지 잘라내기 — 그쪽은 별개 존이라 앱에서도 정상이다
 *   · 런타임 조립용 조각 리터럴까지 잘라내기 — `${origin}` 접합이 깨진다
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
const loadScript = () => import(pathToFileURL(scriptPath).href);

const makeDist = () => fsp.mkdtemp(path.join(os.tmpdir(), "cd-app-cdncgi-"));

test("동일 오리진 리사이즈 접두어만 걷어낸다", async () => {
  const { stripSameOriginResizePrefixes } = await loadScript();

  const card = stripSameOriginResizePrefixes(
    '<img src="/cdn-cgi/image/width=384,quality=80,format=auto/fuctionassets/saju.webp"' +
      ' srcset="/cdn-cgi/image/width=384,quality=80,format=auto/fuctionassets/saju.webp 1x,' +
      ' /cdn-cgi/image/width=768,quality=80,format=auto/fuctionassets/saju.webp 2x">'
  );
  assert.equal(card.rewritten, 3, "src 1건 + srcset 2건이 모두 바뀌어야 한다");
  assert.ok(!card.text.includes("/cdn-cgi/"), "동일 오리진 접두어가 남으면 앱에서 404 다");
  assert.equal(card.text.split("/fuctionassets/saju.webp").length - 1, 3, "경로는 그대로 남아야 한다");

  const css = stripSameOriginResizePrefixes("background:url(/cdn-cgi/image/width=200,format=auto/images/x.webp)");
  assert.equal(css.text, "background:url(/images/x.webp)", "CSS url() 도 대상이다");

  // 퍼센트 인코딩된 한글 파일명(앱에서 실제로 깨지던 'ai tarrot.webp' 형태)도 대상이다.
  const encoded = stripSameOriginResizePrefixes(
    '<img src="/cdn-cgi/image/width=384,quality=80,format=auto/fuctionassets/ai%20tarrot.webp">'
  );
  assert.equal(encoded.text, '<img src="/fuctionassets/ai%20tarrot.webp">');
});

test("교차 오리진과 조각 리터럴은 건드리지 않는다", async () => {
  const { stripSameOriginResizePrefixes } = await loadScript();

  // assets.code-destiny.com 은 별개 존이라 앱에서도 리사이즈가 정상 동작한다 — 자르면 원본을 받는다.
  const remote = '<img src="https://assets.code-destiny.com/cdn-cgi/image/width=384,format=auto/a/b.webp">';
  assert.deepEqual(stripSameOriginResizePrefixes(remote), { text: remote, rewritten: 0 });

  // app/points/PointsClient.tsx 의 resizePrefix — 뒤에 경로가 없고 런타임에 조립된다.
  const fragment = 'const resizePrefix = "/cdn-cgi/image/width=220,quality=82,format=auto";';
  assert.deepEqual(stripSameOriginResizePrefixes(fragment), { text: fragment, rewritten: 0 });
});

test("dist 를 훑어 실제로 파일을 고치고, 대상이 0건이면 실패한다", async () => {
  const { stripSameOriginImageResizing } = await loadScript();

  const dist = await makeDist();
  await fsp.mkdir(path.join(dist, "js"), { recursive: true });
  await fsp.writeFile(
    path.join(dist, "index.html"),
    '<img src="/cdn-cgi/image/width=384,format=auto/fuctionassets/saju.webp">',
    "utf8"
  );
  // 인라인 스크립트는 externalize 로 js/shell/*.js 에 빠져 있다 — HTML 만 훑으면 놓친다.
  await fsp.writeFile(path.join(dist, "js", "shell.js"), 'var u="/cdn-cgi/image/width=96,format=auto/icons/a.webp";', "utf8");
  await fsp.writeFile(path.join(dist, "app.css"), "a{background:url(/cdn-cgi/image/width=64,format=auto/images/b.webp)}", "utf8");
  await fsp.writeFile(path.join(dist, "keep.txt"), "본문에는 아무 참조도 없다", "utf8");

  const result = await stripSameOriginImageResizing(dist);
  assert.equal(result.rewritten, 3);
  assert.equal(result.files, 3, "HTML·JS·CSS 세 파일 모두 고쳐야 한다");
  assert.equal(await fsp.readFile(path.join(dist, "index.html"), "utf8"), '<img src="/fuctionassets/saju.webp">');
  assert.equal(await fsp.readFile(path.join(dist, "js", "shell.js"), "utf8"), 'var u="/icons/a.webp";');
  assert.equal(await fsp.readFile(path.join(dist, "app.css"), "utf8"), "a{background:url(/images/b.webp)}");

  // 두 번째 실행은 고칠 게 없다 → fail-closed ①. "대상이 없으니 통과"는 가드가 아니다.
  await assert.rejects(() => stripSameOriginImageResizing(dist), /한 건도 찾지 못했다/);

  await fsp.rm(dist, { recursive: true, force: true });
});

test("main() 이 이 패스를 실제로 부른다", () => {
  const source = readFileSync(scriptPath, "utf8");
  assert.match(source, /await stripSameOriginImageResizing\(\)/, "패스가 main() 에 배선돼 있어야 한다");
});
