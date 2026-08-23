/**
 * 운명의 꽃 매칭이 브라우저로 되돌아오지 않게 막는 가드.
 *
 * 2026-08-24 이전 상태: 매칭 엔진(89종 카탈로그 + 네 체계 점수 함수)이 브라우저에 통째로
 * 실려 있었다. 결제는 서버가 차감하는데 **결과는 브라우저가 만들어서**, 콘솔에서
 * `matchDestinyFlower(payload)` 한 줄이면 1만원짜리 결과가 공짜로 나왔다.
 *
 * 🔴 정적 호스팅이라 `js/**` 아래 파일은 아무도 import 하지 않아도 URL 로 그냥 열린다.
 *    그래서 "import 를 끊었다"는 것으로는 부족하고, 파일이 그 아래 **없어야** 한다.
 *    이 가드는 브라우저에 서빙되는 JS 전체를 훑어 매칭 로직의 부재를 단언한다.
 *
 * 🔴 **여기는 배치(配置)만 본다 — 게이트가 실제로 막는지는 여기서 알 수 없다.**
 *    음성 테스트로 확인함(2026-08-24): 해금 확인을 `if (false)` 로 무력화해도 이 파일은
 *    전부 통과한다. 문자열로는 죽은 분기를 구분할 수 없기 때문이다. 그 판정은 라우트를
 *    실제로 돌리는 `__tests__/worker/destiny-flower.route.test.js` 가 맡고, 같은 변조에서
 *    그쪽은 실패한다. 둘 중 하나만 남기지 말 것.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const exists = (rel) => fs.existsSync(path.join(root, rel));

/**
 * 주석을 걷어낸 소스. 🔴 이걸 빼먹으면 가드가 **자기 주석에 걸린다** — 이 가드를 설명하는
 * 주석에 금지 심볼 이름이 들어가기 때문이다(2026-08-23·24 두 번 겪었다).
 */
const stripComments = (source) => source
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .split("\n")
  .map((line) => line.replace(/^\s*\/\/.*$/, ""))
  .join("\n");

const RUNTIME_REL = "js/core/index-inline-runtime.js";
const BOOTSTRAP_REL = "js/core/bootstrapDestinyFlower.js";
const ENGINE_REL = "worker/lib/destiny-flower-engine.js";
const ROUTE_REL = "worker/routes/destiny-flower.js";

/**
 * 브라우저에 실제로 서빙되는 JS 를 전수 수집한다. 0건이면 실패 — fail-closed.
 *
 * 🔴 **`public/` 을 반드시 함께 본다.** 배포되는 것은 미러이고, `sync:public` 은 소스에서
 *    사라진 파일을 미러에서 지우지 않는다. 2026-08-24 실사고: 엔진을 `js/services/` 에서
 *    워커로 옮겼는데 `public/js/services/destiny-flower-engine.js` 가 그대로 남아,
 *    소스만 보는 가드는 초록불인 채로 우회가 열려 있었다. 리포 루트 `.ignore` 가 미러를
 *    Grep/Glob 에서 빼기 때문에 손으로 찾기도 어렵다.
 */
function browserServedJsFiles() {
  const out = [];
  const skip = new Set(["node_modules", ".git", "coverage"]);
  const roots = ["js", "public"].filter((rel) => fs.existsSync(path.join(root, rel)));
  assert.equal(roots.length, 2, "js/ 또는 public/ 을 찾지 못했다 — 스캐너가 빗나갔다");
  for (const rel of roots) {
    (function walk(dir) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (skip.has(entry.name)) continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name.endsWith(".js")) out.push(path.relative(root, full).split(path.sep).join("/"));
      }
    })(path.join(root, rel));
  }
  assert.ok(out.length > 100, `서빙 JS 를 ${out.length}개만 찾았다 — 스캐너가 빗나갔다`);
  assert.ok(
    out.some((f) => f.startsWith("public/")),
    "미러(public/)를 하나도 못 봤다 — 배포되는 쪽을 안 보는 가드는 가드가 아니다",
  );
  return out;
}

test("매칭 엔진과 특성표가 브라우저 경로에 없다", () => {
  assert.ok(exists(ENGINE_REL), "엔진이 워커에 없다 — 옮기다 만 상태다");
  assert.ok(exists("worker/lib/destiny-flower-traits.js"), "특성표가 워커에 없다");
  // 🔴 소스와 미러를 **둘 다** 본다. 배포되는 것은 미러이고, sync:public 은 소스에서 사라진
  //    파일을 미러에서 지우지 않는다(2026-08-24 실사고 — 소스만 보던 초안이 초록불이었다).
  for (const dir of ["js/services", "public/js/services"]) {
    assert.ok(
      !exists(dir + "/destiny-flower-engine.js"),
      `매칭 엔진이 ${dir} 로 돌아왔다 — 정적 호스팅에서는 URL 로 그대로 열린다`,
    );
    assert.ok(
      !exists(dir + "/destiny-flower-traits.js"),
      `특성표가 ${dir} 로 돌아왔다 — 카탈로그 점수의 재료가 그대로 노출된다`,
    );
  }
  // 꽃 그림은 결과가 아니라 표현이라 브라우저에 남는다.
  assert.ok(exists("js/services/destiny-flower-art.js"), "꽃 아트까지 옮겨 버렸다");
});

test("브라우저에 서빙되는 JS 어디에도 매칭 로직이 없다", () => {
  // 엔진의 핵심 심볼. 하나라도 브라우저 쪽에 있으면 결과를 로컬에서 만들 수 있다는 뜻이다.
  // `flowerSymbology` 는 여기 없다 — 서버 응답의 필드명(`matched.flowerSymbology`)과 겹쳐
  // 오탐이 난다. 전역 카탈로그(`window.flowerSymbology`)는 아래 런타임 테스트가 막는다.
  const FORBIDDEN = [
    "unifiedFlowerCatalog",
    "rankUnifiedCandidates",
    "buildSourceLens",
    "SUKUYO_MANSIONS_27",
    "FLOWER_TRAIT_SUPPLEMENT",
    "ZIWEI_STAR_TO_WUXING",
    "WESTERN_ELEMENT_TO_WUXING",
  ];
  const offenders = [];
  for (const rel of browserServedJsFiles()) {
    const source = stripComments(read(rel));
    for (const symbol of FORBIDDEN) {
      if (source.includes(symbol)) offenders.push(`${rel} → ${symbol}`);
    }
  }
  assert.deepEqual(offenders, [], "브라우저 JS 에 매칭 로직이 남아 있다:\n  " + offenders.join("\n  "));
});

test("부트스트랩은 꽃 아트만 올린다", () => {
  const bootstrap = stripComments(read(BOOTSTRAP_REL));
  assert.ok(/registerFlowerArtGlobals/.test(bootstrap), "꽃 아트 등록이 사라졌다");
  assert.ok(
    !/destiny-flower-engine|registerDestinyFlowerEngineGlobals|createDestinyFlowerEngine/.test(bootstrap),
    "부트스트랩이 매칭 엔진을 다시 올린다",
  );
});

test("셸 런타임이 매칭을 서버에만 묻는다", () => {
  const runtime = stripComments(read(RUNTIME_REL));

  assert.ok(
    /_dfRequestServerMatch\s*\(/.test(runtime) && /'\/api\/destiny-flower\/match'/.test(runtime),
    "서버 매칭 요청 경로가 없다",
  );
  // 네 리졸버가 전부 서버 캐시를 읽어야 한다.
  for (const source of ["saju", "astrology", "jamidusu", "sukuyo"]) {
    assert.ok(
      new RegExp(`_dfGetServerMatched\\('${source}'\\)`).test(runtime),
      `${source} 리졸버가 서버 결과를 읽지 않는다`,
    );
  }
  // 🔴 브라우저 매칭 전역을 다시 부르면 우회가 돌아온다.
  for (const global of [
    "window.DestinyFlowerEngine",
    "window.matchDestinyFlower",
    "window.matchAstrologyFlower",
    "window.matchJamidusuFlower",
    "window.matchSukuyoFlower",
    "window.getAstrologyFlower",
    "window.getJamidusuFlower",
    "window.calculateSukyoFlower",
    "window.flowerSymbology",
  ]) {
    assert.ok(!runtime.includes(global), `런타임이 ${global} 을 다시 부른다`);
  }
});

test("자미두수 차트를 서버로 실어 보낸다", () => {
  const runtime = read(RUNTIME_REL);
  assert.ok(
    /payload\.ziweiChart\s*=\s*zw/.test(runtime),
    "원본 차트를 안 보내면 서버가 '오늘의 강한 별'을 못 뽑고 명궁 별로 퇴화한다",
  );
  const engine = read(ENGINE_REL);
  assert.ok(
    /userData\.ziweiChart/.test(engine) && /chooseJamidusuStrongStar\(zw\)/.test(engine),
    "엔진이 넘겨받은 차트로 강한 별을 뽑지 않는다",
  );
  assert.ok(
    !/window\.calcZiweiPalaces\s*\(/.test(engine),
    "엔진이 워커에 없는 전역을 다시 부른다",
  );
});

test("라우트가 해금을 확인하고 미해금에 402 를 낸다", () => {
  const route = read(ROUTE_REL);
  assert.ok(/"flower-fc"/.test(route), "해금 키가 라우트에 없다");
  assert.ok(/unlockedFeatures/.test(route), "라우트가 사용자 해금 목록을 보지 않는다");
  assert.ok(/status:\s*402/.test(route), "미해금 402 응답이 없다");
  assert.ok(/requireAuth/.test(route), "라우트가 로그인을 요구하지 않는다");

  // 🔴 로컬 스냅샷을 신뢰 근거로 받으면 그게 곧 우회다.
  assert.ok(
    !/body\.(unlocked|snapshot|entitlement)|body\?\.(unlocked|snapshot)/.test(route),
    "라우트가 클라이언트가 보낸 해금 주장을 읽는다",
  );
});

test("라우트가 워커에 배선돼 있다", () => {
  const index = read("worker/index.js");
  assert.ok(
    /handleDestinyFlowerRoutes/.test(index) && /"\/api\/destiny-flower"/.test(index),
    "worker/index.js 에 /api/destiny-flower 배선이 없다",
  );
});
