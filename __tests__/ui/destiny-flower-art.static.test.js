/**
 * 운명의 꽃 아트 시스템 가드.
 *
 * 지키는 것:
 *   1. 카탈로그 89종이 **전부** 형태 계열에 매핑돼 있는가 (새 꽃을 추가하고 매핑을 빼먹으면 실패)
 *   2. 종마다 SVG 가 실제로 생성되고 XML 로 파싱되는가
 *   3. data-URI 가 크기 예산 안에 있는가 (이 그림은 매번 이미지로 실려 나간다)
 *   4. 같은 입력이 같은 그림을 주는가 (결정론 — Math.random 을 쓰면 새로고침마다 꽃이 바뀐다)
 *   5. 인라인 런타임이 아트 모듈에 위임하되 폴백을 남겨 두는가
 *
 * 🔴 계열 목록을 손으로 열거하지 않는다. 카탈로그 소스에서 전수 추출하고, 추출이 0건이면
 *    파서가 빗나간 것이므로 실패시킨다(CLAUDE.md 코딩 원칙 10).
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

const ART_REL = "js/services/destiny-flower-art.js";
const ENGINE_REL = "js/services/destiny-flower-engine.js";
const RUNTIME_REL = "js/core/index-inline-runtime.js";
const BOOTSTRAP_REL = "js/core/bootstrapDestinyFlower.js";

const artSource = read(ART_REL);
const engineSource = read(ENGINE_REL);
const runtimeSource = read(RUNTIME_REL);

/** 카탈로그 전수 추출 — id / 색 / 입자. */
const species = [...engineSource.matchAll(
  /id: '([^']+)',\s*\n\s*name: '([^']+)',\s*\n\s*scientific_name: '([^']+)',\s*\n\s*symbolism: '[^']*',\s*\n\s*primary_color: '([^']+)',\s*\n\s*secondary_color: '([^']+)',\s*\n\s*particle_type: '([^']+)'/g,
)].map((m) => ({ id: m[1], name: m[2], latin: m[3], primary: m[4], secondary: m[5], particle: m[6] }));

/**
 * 루트 package.json 이 "type": "commonjs" 라 Node 는 이 ESM `.js` 를 직접 import 하지 못한다
 * (브라우저는 동적 import 로 읽으므로 무관하다). 소스를 data URL 모듈로 실어 불러온다.
 */
async function loadArt() {
  return import("data:text/javascript;base64," + Buffer.from(artSource, "utf8").toString("base64"));
}

/** index-inline-runtime.js 의 _dfHashText 와 같은 FNV-1a 변형. */
function hashText(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const svgFor = (art, s, source) => art.buildFlowerSvg({
  flowerId: s.id,
  source,
  primaryHex: s.primary,
  secondaryHex: s.secondary,
  seed: hashText(s.id + "|" + s.latin),
  particleType: s.particle,
  label: s.name,
});

test("꽃 카탈로그가 실제로 추출된다 (fail-closed)", () => {
  assert.ok(
    species.length > 80,
    `카탈로그 추출 ${species.length}종 — 파서가 빗나갔다. ${ENGINE_REL} 의 항목 형식이 바뀌었는지 볼 것`,
  );
  const ids = new Set(species.map((s) => s.id));
  assert.equal(ids.size, species.length, "카탈로그에 중복 id 가 있다");
});

test("카탈로그의 모든 종이 형태 계열에 매핑돼 있다", async () => {
  const art = await loadArt();
  const unmapped = species
    .filter((s) => !Object.prototype.hasOwnProperty.call(art.FLOWER_FORM_BY_ID, s.id))
    .map((s) => `${s.id}(${s.name})`);
  assert.deepEqual(
    unmapped,
    [],
    `${ART_REL} 의 FLOWER_FORM_BY_ID 에 없는 꽃이 있다. 매핑이 없으면 기본 계열로 그려져 ` +
      `그 꽃만 엉뚱한 모양이 된다: ${unmapped.join(", ")}`,
  );

  const bogus = Object.entries(art.FLOWER_FORM_BY_ID)
    .filter(([, form]) => !art.FLOWER_FORMS.includes(form))
    .map(([id, form]) => `${id}→${form}`);
  assert.deepEqual(bogus, [], `FLOWER_FORMS 에 없는 계열을 가리키는 매핑: ${bogus.join(", ")}`);

  const used = new Set(species.map((s) => art.resolveFlowerForm(s.id)));
  const unusedForms = art.FLOWER_FORMS.filter((f) => !used.has(f));
  assert.deepEqual(unusedForms, [], `어느 꽃도 쓰지 않는 계열이 있다(죽은 렌더러): ${unusedForms.join(", ")}`);
});

test("모든 종의 SVG 가 생성되고 XML 로 파싱된다", async () => {
  const art = await loadArt();
  const broken = [];
  for (const s of species) {
    const svg = svgFor(art, s, "saju");
    if (!svg.startsWith("<svg ") || !svg.endsWith("</svg>")) { broken.push(s.id + ": svg 래퍼 없음"); continue; }
    // 태그 균형 — 여는 태그 수와 닫는/자기완결 태그 수가 맞아야 한다.
    const open = (svg.match(/<[a-zA-Z][^>]*?>/g) || []).filter((t) => !t.endsWith("/>")).length;
    const close = (svg.match(/<\/[a-zA-Z]+>/g) || []).length;
    if (open !== close) broken.push(`${s.id}: 태그 불균형 (여는 ${open} / 닫는 ${close})`);
    if (/NaN|undefined|Infinity/.test(svg)) broken.push(`${s.id}: 좌표에 NaN/undefined 가 들어갔다`);
  }
  assert.deepEqual(broken, [], `깨진 SVG: ${broken.slice(0, 8).join(" | ")}`);
});

test("data-URI 가 크기 예산 안에 있다", async () => {
  const art = await loadArt();
  /**
   * 예산 근거(2026-08-23 실측): 교체 대상이던 제네릭 렌더러가 소스별 6.29~9.47KB 였다.
   * 새 시스템은 89종을 각기 다르게 그리면서 평균 7.1KB / 최대 10.4KB 다. 14KB 를 상한으로 둔다 —
   * 넘으면 그리기가 아니라 마크업 낭비를 의심할 것(반복 요소는 <use> 로 묶는다).
   */
  const LIMIT_KB = 14;
  const over = [];
  let total = 0;
  for (const s of species) {
    const kb = encodeURIComponent(svgFor(art, s, "saju")).length / 1024;
    total += kb;
    if (kb > LIMIT_KB) over.push(`${s.id} ${kb.toFixed(1)}KB`);
  }
  assert.deepEqual(over, [], `data-URI 예산(${LIMIT_KB}KB) 초과: ${over.join(", ")}`);
  assert.ok(total / species.length < 10, `평균이 ${(total / species.length).toFixed(1)}KB 로 커졌다`);
});

test("같은 종은 항상 같은 그림이다 (결정론)", async () => {
  const art = await loadArt();
  for (const s of species.slice(0, 12)) {
    assert.equal(svgFor(art, s, "saju"), svgFor(art, s, "saju"), `${s.id} 의 그림이 호출마다 달라진다`);
  }
  assert.doesNotMatch(
    artSource,
    /Math\.random\(\)/,
    `${ART_REL}: Math.random 을 쓰면 새로고침마다 꽃이 바뀐다 — 시드 난수(makeRandom)를 쓸 것`,
  );
});

test("서로 다른 계열은 서로 다른 그림을 만든다", async () => {
  const art = await loadArt();
  const oneEach = art.FLOWER_FORMS.map((form) => species.find((s) => art.resolveFlowerForm(s.id) === form));
  const bodies = oneEach.map((s) => svgFor(art, s, "saju"));
  assert.equal(new Set(bodies).size, bodies.length, "계열이 다른데 같은 SVG 가 나왔다 — 렌더러가 공유되고 있다");
});

test("인라인 런타임이 아트 모듈에 위임하되 폴백을 남긴다", () => {
  assert.match(
    runtimeSource,
    /window\.CDFlowerArt && typeof window\.CDFlowerArt\.buildFlowerSvg === 'function'/,
    `${RUNTIME_REL}: _dfBuildFlowerSvgMarkup 이 아트 모듈에 위임하지 않는다`,
  );
  assert.match(
    runtimeSource,
    /flower\.id \|\| '', flower\.particle_type \|\| ''/,
    `${RUNTIME_REL}: _dfBuildFlowerDataUri 가 flowerId/particleType 을 넘기지 않으면 종별 그림이 안 나온다`,
  );
  assert.match(
    runtimeSource,
    /var petalCount = 10;/,
    `${RUNTIME_REL}: 제네릭 폴백을 지우면 아트 모듈 로드 실패 시 유료 결과 화면이 빈 이미지가 된다`,
  );
  assert.match(
    read(BOOTSTRAP_REL),
    /registerFlowerArtGlobals/,
    `${BOOTSTRAP_REL}: 아트 모듈을 등록하지 않으면 위임이 항상 폴백으로 떨어진다`,
  );
});

test("생성 SVG 위에 사진용 blend 를 다시 걸지 않는다", () => {
  for (const rel of ["styles/fortune-ui.css", "styles/fortune-ui-home.css"]) {
    const block = read(rel).split(".df-studio-visual img")[1] || "";
    assert.doesNotMatch(
      block.slice(0, 400),
      /mix-blend-mode:\s*multiply/,
      `${rel}: .df-studio-visual img 에 multiply 가 있으면 SVG 가 자기 배경과 곱해져 통째로 어두워진다`,
    );
  }
});
