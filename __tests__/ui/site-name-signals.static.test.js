/**
 * 사이트 이름 신호가 **한 값으로 모여 있는지** 지킨다.
 *
 * 지키는 사고 (2026-08-28 전수 실측): 사이트 이름이 다섯 갈래로 갈려 있었다.
 *   - 정적 셸 6개  `og:site_name = "CODE DESTINY"`
 *   - public/famous `og:site_name = "Code Destiny (꿀꿀 만세력)"`
 *   - public/fortune `og:site_name = "Code Destiny"`
 *   - app 라우트 400여 개 `og:site_name = "Code Destiny"` (siteSeo.siteName)
 *   - `WebSite` 스키마 `name = "꿀꿀 운세"` (siteSeo.brandName)
 *
 * 구글은 `WebSite.name` · `og:site_name` · `application-name` · title 접미사가 **서로 일치할 때만**
 * 사이트 이름을 채택한다. 갈려 있는 동안에는 어느 이름도 잡히지 않았고, 실제로 "꿀꿀 운세"로
 * 검색하면 이 사이트가 나오지 않았다(2026-08-28 검색 실측 — 경쟁사만 반환됐고 엔진은 "꿀꿀"을
 * 브랜드가 아니라 일반어로 처리했다).
 *
 * 🔴 대상을 손으로 적지 않는다(CLAUDE.md 원칙 10). 셸은 디렉터리를 걸어 전수 발견하고,
 *    **하나도 못 찾으면 통과가 아니라 실패**다. 기대값도 상수로 박지 않고 siteSeo.ts 에서 읽는다 —
 *    브랜드를 바꾸면 이 테스트가 아니라 정본 한 곳만 고치면 되게.
 *
 * 🔴 jest 가 아니라 node:test 다. `app/**`·`lib/**` 은 tier 분류에 따라 jest 가 스킵될 수 있는데,
 *    `test:node` 는 PR CI 의 fast 잡이라 티어와 무관하게 항상 돈다.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");

/** 기대값의 정본. 상수로 복제하면 브랜드 변경 때 두 곳이 갈린다. */
function readBrandName() {
  const source = fs.readFileSync(path.join(root, "lib", "seo", "siteSeo.ts"), "utf8");
  const match = /\bbrandName:\s*"([^"]+)"/.exec(source);
  assert.ok(match, "lib/seo/siteSeo.ts 에서 brandName 을 읽지 못했습니다 — 구조가 바뀌었다면 이 가드를 함께 고치세요.");
  return match[1];
}

const BRAND = readBrandName();

/** 정적 셸이 있을 수 있는 곳. 존재하지 않는 경로는 건너뛰되, 전체가 비면 아래에서 실패한다. */
const SHELL_ROOTS = [root, path.join(root, "public")];

function walkHtml(dir, out, depth = 0) {
  if (depth > 4 || !fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".git" || entry.name === ".next") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkHtml(full, out, depth + 1);
    else if (entry.isFile() && entry.name.endsWith(".html")) out.push(full);
  }
  return out;
}

test("정적 셸의 og:site_name 이 전부 브랜드명과 같다", () => {
  // SHELL_ROOTS 의 루트가 public/ 을 다시 훑으므로 경로로 한 번 접는다.
  const files = [];
  for (const dir of SHELL_ROOTS) walkHtml(dir, files);
  const uniqueFiles = [...new Set(files)];

  const declarations = [];
  for (const file of uniqueFiles) {
    const html = fs.readFileSync(file, "utf8");
    for (const match of html.matchAll(/og:site_name"\s+content="([^"]*)"/g)) {
      declarations.push({ file: path.relative(root, file), value: match[1] });
    }
  }

  // 🔴 검사 대상이 0 이면 가드가 아니다.
  assert.ok(
    declarations.length > 0,
    "og:site_name 을 선언한 셸을 하나도 찾지 못했습니다 — 셸이 옮겨졌거나 속성 표기가 바뀌었습니다.",
  );

  const wrong = declarations.filter((entry) => entry.value !== BRAND);
  assert.deepEqual(
    wrong,
    [],
    `og:site_name 이 브랜드명("${BRAND}")과 다른 셸이 있습니다:\n` +
      wrong.map((entry) => `  ${entry.file}: "${entry.value}"`).join("\n"),
  );
});

test("셸을 만들어 내는 스크립트도 브랜드명을 쓴다", () => {
  // 생성기가 옛 값을 들고 있으면 셸을 고쳐도 다음 빌드가 되돌린다.
  const source = fs.readFileSync(path.join(root, "scripts", "build-fortune-hub-shell.mjs"), "utf8");
  const match = /og:site_name"\s+content="([^"]*)"/.exec(source);
  assert.ok(match, "build-fortune-hub-shell.mjs 에서 og:site_name 선언을 찾지 못했습니다.");
  assert.equal(match[1], BRAND, "운세 허브 셸 생성기가 옛 사이트 이름을 굳히고 있습니다.");
});

test("og:site_name·application-name 에 발행처 이름(siteSeo.siteName)을 쓰지 않는다", () => {
  // 이것이 갈라짐을 만든 정확한 패턴이다. 전 저장소에서 0건이어야 한다.
  const offenders = [];
  const scanRoots = [path.join(root, "app"), path.join(root, "lib")];

  function walkSource(dir, depth = 0) {
    if (depth > 6 || !fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === "node_modules") continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walkSource(full, depth + 1);
        continue;
      }
      if (!/\.(?:js|jsx|ts|tsx)$/.test(entry.name)) continue;
      const source = fs.readFileSync(full, "utf8");
      const lines = source.split(/\r?\n/);
      lines.forEach((line, index) => {
        if (/(?:siteName|applicationName):\s*siteSeo\.siteName\b/.test(line)) {
          offenders.push(`${path.relative(root, full)}:${index + 1}`);
        }
      });
    }
  }

  for (const dir of scanRoots) walkSource(dir);
  assert.deepEqual(
    offenders,
    [],
    "og:site_name / application-name 에 siteSeo.siteName 을 쓰는 곳이 남아 있습니다:\n  " + offenders.join("\n  "),
  );
});

test("92개 라우트가 타는 공유 빌더와 로케일 표의 ko 항목이 브랜드명을 쓴다", () => {
  const builder = fs.readFileSync(path.join(root, "lib", "generate-page-metadata.ts"), "utf8");
  const brandUses = [...builder.matchAll(/siteName:[^\n]*siteSeo\.brandName/g)].length;
  assert.equal(
    brandUses,
    2,
    `lib/generate-page-metadata.ts 의 siteName 두 자리가 모두 brandName 이어야 합니다(발견 ${brandUses}곳).`,
  );

  const locales = fs.readFileSync(path.join(root, "lib", "i18n", "locales.ts"), "utf8");
  const koBlock = /ko:\s*\{[\s\S]*?\}/.exec(locales);
  assert.ok(koBlock, "lib/i18n/locales.ts 에서 ko 항목을 찾지 못했습니다.");
  assert.match(
    koBlock[0],
    new RegExp(`siteName:\\s*"${BRAND}"`),
    `로케일 표의 ko 항목 siteName 이 브랜드명("${BRAND}")이 아닙니다.`,
  );
});

test("app/ 에 남은 비-브랜드 siteName 리터럴은 렌더되지 않는 비-한국어 카피 4개뿐이다", () => {
  // 개수를 찍어 둔다 — 새 라우트가 브랜드명을 손으로 박으면 여기서 개수가 어긋나 걸린다.
  // 남겨 둔 4개는 `sikojenLayoutCopy = ...ko` / `sajuGuardianLayoutCopy = ...ko` 처럼
  // **ko 항목만 실제로 렌더**되는 파일의 en·ja 사본이라 사이트 이름 신호로 나가지 않는다.
  const found = [];

  function walkSource(dir, depth = 0) {
    if (depth > 6 || !fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === "node_modules") continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walkSource(full, depth + 1);
        continue;
      }
      if (!/\.(?:js|jsx|ts|tsx)$/.test(entry.name)) continue;
      const lines = fs.readFileSync(full, "utf8").split(/\r?\n/);
      lines.forEach((line, index) => {
        const match = /siteName:\s*["']([^"']+)["']/.exec(line);
        if (match && match[1] !== BRAND) {
          found.push(`${path.relative(root, full).split(path.sep).join("/")}:${index + 1} → "${match[1]}"`);
        }
      });
    }
  }

  walkSource(path.join(root, "app"));

  assert.equal(
    found.length,
    4,
    "app/ 의 비-브랜드 siteName 리터럴 개수가 달라졌습니다. 새로 생긴 것이라면 siteSeo.brandName 을 쓰세요:\n  " +
      found.join("\n  "),
  );
  for (const entry of found) {
    assert.match(
      entry,
      /(sikojen-povailu\/layout\.tsx|saju-guardian\/layout\.js)/,
      `예상하지 못한 파일에 비-브랜드 siteName 리터럴이 있습니다: ${entry}`,
    );
  }
});
