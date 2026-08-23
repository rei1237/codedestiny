/**
 * 운명의 꽃 진입 통합 가드.
 *
 * 2026-08-23 이전 상태: 같은 상품(`flower-fc`, 같은 잠금 키·같은 가격)을 홈 타일 4장 ·
 * 랜딩 4개로 쪼개 놓아 사용자에게는 "2만원짜리가 네 개"로 보였다. 카드·랜딩·가격을 하나로
 * 합쳤고, 이 가드가 다시 쪼개지는 것을 막는다.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const exists = (rel) => fs.existsSync(path.join(root, rel));

const SHELL_REL = "index.html";
const RUNTIME_REL = "js/core/index-inline-runtime.js";
const LANDING_REL = "app/components/FeatureLandingPage.tsx";

const shell = read(SHELL_REL);
const runtime = read(RUNTIME_REL);
const landing = read(LANDING_REL);

/**
 * 셸의 잠금 타일을 전수 추출한다(마크업 속성만 — JS 안의 같은 문자열은 세지 않는다).
 * 🔴 `<button>` 으로만 찾으면 안 된다 — animal-destiny 타일은 `<a>` 다.
 * 2026-08-23 실측 기준 마크업 잠금 타일은 4개(saju-guardian / olympus-fc / flower-fc / animal-destiny).
 */
function lockTileKeys() {
  const keys = [...shell.matchAll(/\sdata-tile-lock-key="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(keys.length >= 3, `잠금 타일 추출 ${keys.length}개 — 파서가 빗나갔다`);
  return keys;
}

/** `data-tile-lock-key="flower-fc"` 를 품은 여는 태그 하나를 통째로 돌려준다. */
function flowerTileTag() {
  const at = shell.indexOf('data-tile-lock-key="flower-fc"');
  assert.ok(at > 0, "셸에서 flower-fc 타일을 찾지 못했다");
  // 배지(`tarot-tile__coin-badge`)는 여는 태그가 아니라 자식이라 타일 전체를 잘라 온다.
  const open = shell.lastIndexOf("<button", at);
  const close = shell.indexOf("</button>", at);
  assert.ok(open >= 0 && close > open, "flower-fc 타일의 경계를 찾지 못했다");
  return shell.slice(open, close + 9);
}

test("홈에 꽃 타일은 하나뿐이다", () => {
  const flower = lockTileKeys().filter((key) => key === "flower-fc");
  assert.equal(
    flower.length,
    1,
    `flower-fc 타일이 ${flower.length}개다. 같은 상품을 여러 카드로 쪼개면 사용자에게 ` +
      `"같은 가격표가 여러 개"로 보인다 — 카드는 하나여야 한다.`,
  );
});

test("꽃 타일 가격이 레지스트리와 같다", () => {
  const registry = read("worker/lib/paid-feature-registry.js");
  // 🔴 RAW_PIG_COIN_UNLOCK_PRODUCTS 만 본다. LEGACY_UNLOCK_PRODUCTS_65DE451 은 과거 스냅샷이라
  //    값이 달라도 정상이고, 그쪽은 별도 테스트가 고정한다.
  const rawBlock = registry.slice(
    registry.indexOf("RAW_PIG_COIN_UNLOCK_PRODUCTS"),
    registry.indexOf("LEGACY_UNLOCK_PRODUCTS_65DE451"),
  );
  const registryCost = /"unlock\.flower_fc":\s*\{\s*featureKey:\s*"flower-fc",\s*cost:\s*(\d+)/.exec(rawBlock);
  assert.ok(registryCost, "레지스트리에서 unlock.flower_fc 가격을 읽지 못했다");

  const tile = flowerTileTag();
  const tileCost = /data-tile-lock-cost="(\d+)"/.exec(tile);
  assert.ok(tileCost, "셸 타일에서 data-tile-lock-cost 를 읽지 못했다");

  assert.equal(
    tileCost[1],
    registryCost[1],
    `셸 타일(${tileCost[1]}코인)과 워커 레지스트리(${registryCost[1]}코인)의 가격이 다르다. ` +
      `타일 값이 결제 게이트를 여닫고 레지스트리 값이 실제 청구액이다.`,
  );

  const krw = Number(registryCost[1]) * 100;
  const badge = /data-key="home\.tiles\.(unlock\d+)"/.exec(tile);
  assert.ok(badge, "타일 배지의 i18n 키를 읽지 못했다");
  assert.equal(
    badge[1],
    `unlock${krw}`,
    `배지 키(${badge[1]})가 실제 가격(${krw}원)과 다르다 — 사용자에게 틀린 값이 보인다`,
  );
});

test("랜딩은 /flower 하나이고 옛 경로는 리다이렉트다", () => {
  assert.ok(exists("app/flower/page.tsx"), "app/flower/page.tsx 가 없다");
  for (const slug of ["destiny", "astrology", "jamidusu", "sukuyo"]) {
    const rel = `app/flower/${slug}/page.tsx`;
    if (!exists(rel)) continue;
    assert.match(
      read(rel),
      /redirect\("\/flower"\)/,
      `${rel} 이 리다이렉트가 아니다 — 같은 상품에 랜딩이 둘 이상이면 가격 표기가 갈린다`,
    );
  }
  const paidBlock = landing.slice(landing.indexOf("const PAID_SLUG_META"), landing.indexOf("\n};", landing.indexOf("const PAID_SLUG_META")));
  const flowerKeys = [...paidBlock.matchAll(/"(\/flower[^"]*)":/g)].map((m) => m[1]);
  assert.deepEqual(flowerKeys, ["/flower"], `PAID_SLUG_META 의 꽃 경로가 하나가 아니다: ${flowerKeys.join(", ")}`);
});

test("네 체계는 해금 키 하나로 함께 열린다 (순차 잠금 없음)", () => {
  const at = runtime.indexOf("function _dfComputeSourceUnlockCache");
  assert.ok(at > 0, `${RUNTIME_REL}: _dfComputeSourceUnlockCache 를 찾지 못했다`);
  const body = runtime.slice(at, runtime.indexOf("\n}\n", at)).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

  assert.doesNotMatch(
    body,
    /progress\[/,
    `${RUNTIME_REL}: 해금 판정이 진행도(progress)를 다시 보고 있다. 전체 해금 상품이 하나뿐이므로 ` +
      `"앞 체계를 끝내야 다음이 열린다"는 규칙은 결제한 사람에게 잠긴 화면을 보여준다.`,
  );
  assert.match(body, /_dfIsFlowerAtelierUnlocked\(\)/, `${RUNTIME_REL}: 해금 키 기준 판정을 쓰지 않는다`);
});

test("잠금 타일 조회가 사라진 타일에 의존하지 않는다", () => {
  const at = runtime.indexOf("function _dfResolveLockTileBySource");
  assert.ok(at > 0, `${RUNTIME_REL}: _dfResolveLockTileBySource 를 찾지 못했다`);
  const body = runtime.slice(at, runtime.indexOf("\n}\n", at));
  for (const goneAction of ["openAstrologyFlowerStudio", "openJamidusuFlowerStudio", "openSukuyoFlowerStudio"]) {
    assert.ok(
      !body.includes(goneAction),
      `${RUNTIME_REL}: 잠금 타일을 ${goneAction} 로 찾고 있다. 홈 타일이 하나로 합쳐져 그 조회는 ` +
        `null 을 돌려주고, 그 소스는 결제해도 영구히 잠긴다.`,
    );
  }
});
