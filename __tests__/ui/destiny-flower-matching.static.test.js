/**
 * 운명의 꽃 매칭 정합성 가드 — "점술 근거가 실제로 결과를 바꾸는가".
 *
 * 2026-08-24 이전 상태(전수 재현):
 *   · 카탈로그가 넷으로 갈라져 있고 매칭 필드가 사주 67종에만 있었다. 나머지 세 체계는
 *     각각 8·6·8종 안에서 해시로 골랐다.
 *   · 점성술은 태양궁만 봤고 **불의 3궁(양·사자·궁수)이 전부 같은 꽃**이었다. 실사용 7종.
 *   · 자미두수는 밝기·궁·사화가 꽃 선택에 전혀 쓰이지 않았다.
 *   · 숙요는 **달 위상이 꽃 선택에 아무 영향이 없었고**, 27수 표가 계산기와 인덱스 8부터
 *     끝까지 어긋나(牛 있음·軫 없음) 19개 수가 밀리고 軫은 생년월일 해시로 폴백했다.
 *
 * 🔴 목록을 손으로 적지 않는다. 카탈로그·27수 표를 소스에서 전수 추출하고 0건이면 실패한다.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

const ENGINE_REL = "js/services/destiny-flower-engine.js";
const TRAITS_REL = "js/services/destiny-flower-traits.js";
const CALC_REL = "js/saju-engine-tarot-sukuyo-quantum.js";

const engineSource = read(ENGINE_REL);
const traitsSource = read(TRAITS_REL);
const calcSource = read(CALC_REL);

/**
 * 루트 package.json 이 "type": "commonjs" 라 Node 가 이 ESM `.js` 들을 직접 import 하지 못한다
 * (브라우저는 동적 import 라 무관). 상대 import 를 data URL 로 바꿔 실어 불러온다.
 */
let enginePromise = null;
function loadEngine() {
  if (!enginePromise) {
    const traitsUrl = "data:text/javascript;base64," + Buffer.from(traitsSource, "utf8").toString("base64");
    const patched = engineSource.replace(/from '\.\/destiny-flower-traits\.js[^']*'/, `from '${traitsUrl}'`);
    assert.ok(patched !== engineSource, `${ENGINE_REL}: traits 모듈 import 를 찾지 못했다`);
    enginePromise = import("data:text/javascript;base64," + Buffer.from(patched, "utf8").toString("base64"));
  }
  return enginePromise;
}

const SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
const STARS = ["자미", "천기", "태양", "무곡", "천동", "염정", "천부", "태음", "탐랑", "거문", "천상", "천량", "칠살", "파군"];
const PHASES = ["그믐달", "초승달", "반달", "상현달", "보름달"];

test("27수 표가 계산기와 스물일곱 개 전부 일치한다", async () => {
  const engine = await loadEngine();
  const block = calcSource.slice(calcSource.indexOf("const mansions27"));
  const calcList = [...block.slice(0, block.indexOf("];")).matchAll(/ch_name: "([^"]+)"/g)].map((m) => m[1]);
  assert.equal(calcList.length, 27, `${CALC_REL}: 27수 추출 ${calcList.length}개 — 파서가 빗나갔다`);

  const engineList = engine.SUKUYO_MANSIONS_27.map((m) => m.han);
  assert.deepEqual(
    engineList,
    calcList,
    `${TRAITS_REL} 의 27수가 계산기와 다르다. 한 칸만 밀려도 그 뒤 전부가 엉뚱한 꽃·수호동물에 ` +
      `매핑되고, 목록에 없는 수는 생년월일 해시 폴백으로 떨어진다.`,
  );
  // 28수에서 牛를 뺀 정통 27수인지 — 목록이 통째로 바뀌는 사고를 잡는다.
  assert.ok(!engineList.includes("牛"), "27수에 牛(우)가 들어 있다 — 그것은 28수의 것이다");
  assert.ok(engineList.includes("軫"), "27수에 軫(진)이 없다");
});

test("통합 카탈로그가 89종이고 모두 매칭 필드를 갖는다", async () => {
  const engine = await loadEngine();
  const catalog = engine.unifiedFlowerCatalog;
  assert.ok(catalog.length > 80, `통합 카탈로그 ${catalog.length}종 — 병합이 빗나갔다`);
  assert.equal(new Set(catalog.map((f) => f.id)).size, catalog.length, "카탈로그에 중복 id 가 있다");

  const REQUIRED = ["elements", "seasons", "environments", "water_levels", "description"];
  const missing = catalog
    .map((f) => ({ id: f.id, gaps: REQUIRED.filter((k) => !f[k] || (Array.isArray(f[k]) && !f[k].length)) }))
    .filter((row) => row.gaps.length);
  assert.deepEqual(
    missing.map((r) => `${r.id}(${r.gaps.join(",")})`),
    [],
    "매칭 필드가 빠진 꽃이 있다. 그 꽃은 점수 계산에서 사실상 제외되어 어느 체계에서도 뽑히지 않는다.",
  );
});

test("점성술이 태양궁 말고 달·상승궁도 쓴다", async () => {
  const engine = await loadEngine();
  const pick = (sun, moon, rising) => engine.getAstrologyFlower({ sunSign: sun, moonSign: moon, risingSign: rising }).flower.id;

  // 불의 3궁이 갈리는가 — 원소만 보던 시절의 대표 증상.
  const fire = ["Aries", "Leo", "Sagittarius"].map((s) => pick(s, "Cancer", "Libra"));
  assert.equal(
    new Set(fire).size,
    3,
    `불의 3궁이 같은 꽃으로 뭉친다(${fire.join(", ")}). 원소 넷만으로는 열두 궁을 가르지 못한다 — ` +
      `삼분법(활동·고정·변통)이 보조 축으로 들어가야 한다.`,
  );

  // 태양궁이 같아도 달궁이 다르면 결과가 달라져야 한다.
  const byMoon = new Set(SIGNS.map((moon) => pick("Leo", moon, "Libra")));
  assert.ok(byMoon.size > 1, "달궁을 바꿔도 결과가 그대로다 — 달궁이 표시 전용으로 되돌아갔다");

  const byRising = new Set(SIGNS.map((rising) => pick("Leo", "Cancer", rising)));
  assert.ok(byRising.size > 1, "상승궁을 바꿔도 결과가 그대로다");
});

test("자미두수가 밝기·궁을 꽃 선택에 쓴다", async () => {
  const engine = await loadEngine();
  const pick = (star, palace, brightness) =>
    engine.getJamidusuFlower({ mainStar: star, stars: [star], palace, brightness }).flower.id;

  const byBrightness = new Set(["묘", "득", "리", "평", "함"].map((b) => pick("자미", "명궁", b)));
  assert.ok(byBrightness.size > 1, "밝기를 바꿔도 결과가 그대로다 — 밝기가 시각효과 전용으로 되돌아갔다");

  const byPalace = new Set(["명궁", "부부궁", "재백궁", "관록궁", "복덕궁"].map((p) => pick("자미", p, "묘")));
  assert.ok(byPalace.size > 1, "궁을 바꿔도 결과가 그대로다");

  // 염정이 규칙에 걸리는가 — '렴정' 오타가 되살아나면 기본 규칙(자미)으로 떨어진다.
  assert.notEqual(
    pick("염정", "명궁", "묘"),
    pick("자미", "명궁", "묘"),
    "염정과 자미가 같은 꽃이다 — 별 이름 표기가 계산기와 어긋났을 수 있다",
  );
});

test("숙요가 달 위상을 꽃 선택에 쓴다", async () => {
  const engine = await loadEngine();
  let changed = 0;
  for (let i = 1; i <= 27; i += 1) {
    const ids = new Set(PHASES.map((p) => engine.calculateSukyoFlower(i, p).flower.id));
    if (ids.size > 1) changed += 1;
  }
  assert.ok(
    changed >= 14,
    `달 위상이 결과를 바꾸는 수가 ${changed}/27 뿐이다. 위상이 시각효과 전용으로 되돌아가면 ` +
      `랜딩이 광고하는 "달 위상 보정"이 사실과 어긋난다.`,
  );

  // 27수가 서로 다른 결과를 낸다(같은 위상에서).
  const byMansion = new Set(Array.from({ length: 27 }, (_, i) => engine.calculateSukyoFlower(i + 1, "보름달").flower.id));
  assert.ok(byMansion.size >= 12, `같은 위상에서 27수가 ${byMansion.size}종으로 뭉친다`);
});

test("네 체계가 각각 카탈로그를 넓게 쓴다", async () => {
  const engine = await loadEngine();
  const astro = new Set();
  for (const sun of SIGNS) for (const moon of SIGNS) astro.add(engine.getAstrologyFlower({ sunSign: sun, moonSign: moon, risingSign: "Libra" }).flower.id);

  const ziwei = new Set();
  for (const star of STARS) for (const b of ["묘", "득", "평", "함"]) ziwei.add(engine.getJamidusuFlower({ mainStar: star, stars: [star], palace: "명궁", brightness: b }).flower.id);

  const sukuyo = new Set();
  for (let i = 1; i <= 27; i += 1) for (const p of PHASES) sukuyo.add(engine.calculateSukyoFlower(i, p).flower.id);

  // 예전 상한은 각각 7 / 6 / 8 종이었다. 그 수준으로 되돌아가면 실패한다.
  assert.ok(astro.size >= 15, `점성술이 ${astro.size}종만 쓴다(이전 7종)`);
  assert.ok(ziwei.size >= 12, `자미두수가 ${ziwei.size}종만 쓴다(이전 6종)`);
  assert.ok(sukuyo.size >= 20, `숙요가 ${sukuyo.size}종만 쓴다(이전 8종)`);
});

test("같은 입력은 같은 꽃을 준다 (결정론)", async () => {
  const engine = await loadEngine();
  const once = () => [
    engine.getAstrologyFlower({ sunSign: "Leo", moonSign: "Pisces", risingSign: "Taurus" }).flower.id,
    engine.getJamidusuFlower({ mainStar: "탐랑", stars: ["탐랑"], palace: "부부궁", brightness: "묘" }).flower.id,
    engine.calculateSukyoFlower(13, "상현달").flower.id,
  ].join("|");
  assert.equal(once(), once(), "같은 입력이 다른 꽃을 준다 — 시드 없는 난수가 섞였다");
  assert.doesNotMatch(traitsSource, /Math\.random\(\)/, `${TRAITS_REL}: Math.random 은 결과를 새로고침마다 바꾼다`);
});
