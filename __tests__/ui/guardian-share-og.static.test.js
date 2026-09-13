/**
 * public/_worker.js 의 /fortune/share/ 카카오 카드 메타 생성기.
 *
 * 지켜야 하는 계약 셋:
 *   1. 경로와 shareId 가 **동시에** 맞을 때만 진입한다 — 이 파일은 사이트맵에 있는
 *      /fortune/** 약 96개를 서빙하므로 매칭이 한 칸만 넓어져도 반경이 그만큼이다.
 *   2. og:url 에는 shareId 만 남는다 — 추천 파라미터가 붙으면 수신자마다 URL 이 달라져
 *      카카오 캐시(키가 URL 이다)가 통째로 무력화된다.
 *   3. 주입 JSON 은 `<` 를 이스케이프한다 — 본문에 </script> 가 섞이면 태그가 끊긴다.
 *
 * _worker.js 는 ESM 이고 레포는 commonjs 라 require 할 수 없다. 소스에서 순수부만 잘라
 * vm 으로 평가한다 — fortune-legacy-redirect.static.test.js 와 같은 방식이다.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "../..");
const workerSource = fs.readFileSync(path.join(root, "public/_worker.js"), "utf8");

const start = workerSource.indexOf("const GUARDIAN_SHARE_PATHS =");
assert.notEqual(start, -1, "public/_worker.js 에서 GUARDIAN_SHARE_PATHS 를 찾지 못했다");
const end = workerSource.indexOf("function transformGuardianShareHtml");
assert.ok(end > start, "public/_worker.js 에서 순수부의 끝을 찾지 못했다");

const sandbox = { module: {}, URLSearchParams };
vm.createContext(sandbox);
vm.runInContext(
  `${workerSource.slice(start, end)}\nmodule.exports = { guardianShareIdFromUrl, buildGuardianShareOgMeta, guardianShareSnapshotScript };`,
  sandbox,
);
const { guardianShareIdFromUrl, buildGuardianShareOgMeta, guardianShareSnapshotScript } = sandbox.module.exports;

const SHARE_ID = "gf_abcdefghijklmnopqrstuvwx";
const ORIGIN = "https://code-destiny.com";

test("공유 경로와 정상 shareId 가 동시에 맞을 때만 진입한다", () => {
  assert.equal(guardianShareIdFromUrl(new URL(`${ORIGIN}/fortune/share/?shareId=${SHARE_ID}`)), SHARE_ID);
  assert.equal(guardianShareIdFromUrl(new URL(`${ORIGIN}/fortune/share?shareId=${SHARE_ID}`)), SHARE_ID);
  assert.equal(guardianShareIdFromUrl(new URL(`${ORIGIN}/fortune/share/`)), "");
  assert.equal(guardianShareIdFromUrl(new URL(`${ORIGIN}/fortune/share/?shareId=gf_short`)), "");
  assert.equal(guardianShareIdFromUrl(new URL(`${ORIGIN}/fortune/share/?shareId=../../etc`)), "");
  assert.equal(guardianShareIdFromUrl(new URL(`${ORIGIN}/fortune/today/aries/?shareId=${SHARE_ID}`)), "");
  assert.equal(guardianShareIdFromUrl(new URL(`${ORIGIN}/fortune/`)), "");
});

test("og:url 은 shareId 만 남기고 카드 이미지는 동적 OG 를 가리킨다", () => {
  const meta = buildGuardianShareOgMeta(
    { title: "오늘의 귀인은 가까이에 있어요", shareText: "미루던 연락 하나가 흐름을 바꿔요." },
    { origin: ORIGIN, shareId: SHARE_ID },
  );
  assert.equal(meta.url, `${ORIGIN}/fortune/share/?shareId=${SHARE_ID}`);
  const image = new URL(meta.image);
  assert.equal(image.pathname, "/api/og");
  assert.equal(image.searchParams.get("badge"), "fortune");
  assert.equal(image.searchParams.get("title"), "오늘의 귀인은 가까이에 있어요");
  assert.equal(image.searchParams.get("desc"), "미루던 연락 하나가 흐름을 바꿔요.");
});

test("제목·설명이 없거나 shareId 가 틀리면 카드를 만들지 않는다", () => {
  const valid = { title: "제목", shareText: "설명" };
  assert.equal(buildGuardianShareOgMeta(null, { origin: ORIGIN, shareId: SHARE_ID }), null);
  assert.equal(buildGuardianShareOgMeta({ title: "", shareText: "설명" }, { origin: ORIGIN, shareId: SHARE_ID }), null);
  assert.equal(buildGuardianShareOgMeta({ title: "제목" }, { origin: ORIGIN, shareId: SHARE_ID }), null);
  assert.equal(buildGuardianShareOgMeta(valid, { origin: ORIGIN, shareId: "not-a-share-id" }), null);
  assert.equal(buildGuardianShareOgMeta(valid, { origin: "", shareId: SHARE_ID }), null);
});

test("긴 문구는 잘라내고 줄바꿈을 한 줄로 편다", () => {
  const meta = buildGuardianShareOgMeta(
    { title: "가".repeat(120), shareText: "첫 줄\n\n둘째 줄" },
    { origin: ORIGIN, shareId: SHARE_ID },
  );
  assert.equal(meta.title.length, 60);
  assert.ok(meta.title.endsWith("…"));
  assert.equal(meta.description, "첫 줄 둘째 줄");
});

test("주입 JSON 은 </script> 로 태그를 끊지 못한다", () => {
  const script = guardianShareSnapshotScript({ shareId: SHARE_ID, title: "</script><img onerror=alert(1)>" });
  // 닫는 태그는 맨 끝 하나뿐이어야 한다 — 본문의 </script> 가 살아 있으면 여기서 걸린다.
  assert.equal(script.indexOf("</script>"), script.length - "</script>".length);
  assert.ok(script.includes("\\u003c/script>"));
});
