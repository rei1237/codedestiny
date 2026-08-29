/**
 * 앱 번들 전용 이미지 축소·중복 제거(scripts/build-mobile-app.mjs)의 fail-safe 를 지킨다.
 *
 * 왜 생겼나 (2026-08-29 실측, `unzip -v` 로 AAB 압축 크기 집계): 릴리스 AAB 110.7MB 중
 * 이미지가 72.4MB(65%)였고 텍스트·코드는 전부 합쳐 32.4MB였다. 폰에 1080px 넘는 원본을
 * 담을 이유가 없어 앱 번들 사본만 줄인다 — public/ 원본과 웹 배포본은 이 스크립트를
 * 타지 않으므로 그대로다.
 *
 * fail-safe 가 죽으면 조용히 사고가 난다:
 *   · 결과가 원본보다 커도 쓰면 번들이 오히려 붇는다
 *   · 상한 이하를 확대하면 화질은 그대로인데 용량만 는다
 *   · 중복 묶음이 전부 참조 0건일 때 다 지우면 이미지가 깨진다 — 파일명을 동적으로
 *     조립하는 코드를 색인이 놓쳤을 수 있다(tadagochi 사고와 같은 축)
 *   · 판정 함수만 있고 main() 이 안 부르면 전부 무의미하다
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
const sharp = require("sharp");

const root = path.resolve(__dirname, "../..");
const scriptPath = path.join(root, "scripts", "build-mobile-app.mjs");
const loadScript = () => import(pathToFileURL(scriptPath).href);

/**
 * 결정적 노이즈 이미지. 단색으로 만들면 q82 와 q90 의 결과 크기가 같아져
 * 품질 등급이 실제로 갈리는지 못 본다.
 */
async function noiseWebp(width, height, seed, quality = 100) {
  const channels = 3;
  const data = Buffer.alloc(width * height * channels);
  let state = seed;
  for (let i = 0; i < data.length; i += 1) {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    data[i] = (state >> 16) & 0xff;
  }
  return sharp(data, { raw: { width, height, channels } }).webp({ quality }).toBuffer();
}

const makeDist = () => fsp.mkdtemp(path.join(os.tmpdir(), "cd-app-images-"));

test("상한을 넘는 이미지만 줄이고, 상한 이하는 확대하지 않는다", async () => {
  const { shrinkOversizedImages } = await loadScript();
  const dist = await makeDist();
  const wide = path.join(dist, "wide-art.webp");
  const small = path.join(dist, "small-art.webp");
  await fsp.writeFile(wide, await noiseWebp(2000, 1000, 11));
  // 이미 세게 압축된 파일 — q82 로 다시 인코딩하면 오히려 커진다. "커지면 버린다"가 여기서 물린다.
  await fsp.writeFile(small, await noiseWebp(300, 300, 12, 20));
  const smallBefore = (await fsp.stat(small)).size;
  const wideBefore = (await fsp.stat(wide)).size;

  const result = await shrinkOversizedImages(dist);

  assert.equal((await sharp(await fsp.readFile(wide)).metadata()).width, 1080, "상한 초과분은 1080px 로 줄어야 한다");
  assert.equal((await sharp(await fsp.readFile(small)).metadata()).width, 300, "상한 이하는 폭을 그대로 둬야 한다");
  assert.ok((await fsp.stat(wide)).size < wideBefore, "줄인 파일은 작아져야 한다");
  assert.equal((await fsp.stat(small)).size, smallBefore, "재인코딩이 더 커지는 파일은 원본 그대로 남아야 한다");
  assert.equal(result.total, 2);

  await fsp.rm(dist, { recursive: true, force: true });
});

test("선명해야 하는 자산은 더 높은 품질로 인코딩된다", async () => {
  const { shrinkOversizedImages } = await loadScript();
  const dist = await makeDist();
  // 같은 원본을 이름만 다르게 둔다 — CRISP_PATTERNS 의 'sprite' 하나만 차이다.
  const source = await noiseWebp(1600, 800, 21);
  const plain = path.join(dist, "plain-art.webp");
  const crisp = path.join(dist, "yeoni-sprite-sheet.webp");
  await fsp.writeFile(plain, source);
  await fsp.writeFile(crisp, source);

  await shrinkOversizedImages(dist);

  const plainSize = (await fsp.stat(plain)).size;
  const crispSize = (await fsp.stat(crisp)).size;
  assert.ok(crispSize > plainSize, `스프라이트가 더 높은 품질이어야 한다 (crisp ${crispSize} ≤ plain ${plainSize})`);

  await fsp.rm(dist, { recursive: true, force: true });
});

test("참조 0건 사본만 지우고, 묶음이 전부 참조 0건이면 한 벌은 남긴다", async () => {
  const { removeRedundantImageCopies } = await loadScript();
  const dist = await makeDist();
  const shared = await noiseWebp(64, 64, 31);
  await fsp.writeFile(path.join(dist, "used.webp"), shared);
  await fsp.writeFile(path.join(dist, "unused.webp"), shared);
  const ghost = await noiseWebp(64, 64, 32);
  await fsp.writeFile(path.join(dist, "ghost-a.webp"), ghost);
  await fsp.writeFile(path.join(dist, "ghost-b.webp"), ghost);

  const removed = await removeRedundantImageCopies(new Set(["used.webp"]), dist);

  const left = await fsp.readdir(dist);
  assert.ok(left.includes("used.webp"), "참조된 사본은 남아야 한다");
  assert.ok(!left.includes("unused.webp"), "참조 0건 사본은 지워야 한다");
  assert.equal(left.filter((name) => name.startsWith("ghost-")).length, 1, "전부 참조 0건인 묶음은 한 벌을 남겨야 한다");
  assert.equal(removed.length, 2);

  await fsp.rm(dist, { recursive: true, force: true });
});

test("main() 이 두 단계를 실제로 부른다", () => {
  const source = readFileSync(scriptPath, "utf8");
  assert.match(source, /await removeRedundantImageCopies\(referenced\)/, "중복 제거가 main() 에 배선돼 있어야 한다");
  assert.match(source, /await shrinkOversizedImages\(\)/, "이미지 축소가 main() 에 배선돼 있어야 한다");
});
