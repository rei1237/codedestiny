/**
 * 🔴 휴먼 디자인 로케일 가드.
 *
 * 2026-08-25 이전 상태와 그때 드러난 것:
 *  ① `page.tsx` 두 곳이 `locale="ko"` 를 넘겨서, 이 기능이 갖고 있던 **영어 카피 204항목이
 *     한 번도 렌더된 적이 없었다.** 다 써 두고 배달만 안 되던 번역이다.
 *  ② 로케일이 둘뿐이라 컴포넌트가 `locale === "ko" ? A : B` 삼항으로 갈랐다. 삼항은 언어가
 *     둘일 때만 성립한다 — 셋째가 붙는 순간 ko 아닌 전부가 한쪽으로 쏠린다.
 *
 * 그래서 이 가드가 보는 것은 문구가 아니라 **배달 경로**다.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const AUTHORED = ["ko", "en", "ja", "zh-CN", "zh-TW"];

/** 카피 표의 항목마다 다섯 로케일이 다 있는지 — 소스에서 전수 발견한다. */
function assertEveryEntryHasFiveLocales(file) {
  const source = read(file);
  const entries = source.match(/\{\s*ko:\s*"(?:[^"\\]|\\.)*"[\s\S]{0,4000}?\}/g) || [];
  assert.ok(entries.length > 20, `${file}: 카피 항목을 ${entries.length}개밖에 못 찾았다 — 탐지가 깨진 것이다`);
  const broken = [];
  for (const entry of entries) {
    const missing = AUTHORED.filter((locale) => {
      const key = locale.includes("-") ? `"${locale}":` : `${locale}:`;
      return !entry.includes(key);
    });
    if (missing.length) broken.push(`${entry.slice(0, 60).replace(/\s+/g, " ")} — 빠짐 ${missing.join(", ")}`);
  }
  assert.deepEqual(broken, [], `${file}: 다섯 로케일이 다 없는 항목\n  ${broken.join("\n  ")}`);
  return entries.length;
}

test("휴먼 디자인 카피 표는 항목마다 다섯 로케일을 갖는다", () => {
  let total = 0;
  for (const file of [
    "app/human-design/_copy/index.ts",
    "app/human-design/report/_lib/copy.ts",
    "lib/human-design/display-names.js",
  ]) {
    total += assertEveryEntryHasFiveLocales(file);
  }
  assert.ok(total >= 250, `카피 항목이 ${total}개뿐이다 — 표가 통째로 줄었는지 확인할 것`);
});

test("page.tsx 가 로케일을 하드코딩하지 않는다", () => {
  for (const file of ["app/human-design/page.tsx", "app/human-design/report/page.tsx"]) {
    const source = read(file).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    assert.ok(
      !/locale=["'][a-z-]+["']/.test(source),
      `${file}: 로케일을 하드코딩하면 그 화면의 다른 언어 카피가 통째로 배달되지 않는다`,
    );
  }
});

test("컴포넌트가 ko 이분 삼항으로 로케일을 가르지 않는다", () => {
  const files = [
    "app/human-design/HumanDesignClient.tsx",
    "app/human-design/_components/BodyGraph.tsx",
    "app/human-design/_components/DetailSheet.tsx",
  ];
  for (const file of files) {
    const source = read(file).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    assert.ok(
      !/locale\s*===\s*["']ko["']\s*\?/.test(source),
      `${file}: locale === "ko" ? A : B 는 언어가 둘일 때만 맞다 — pick(UI_TEXT.x, locale) 을 쓸 것`,
    );
  }
});

test("신규 생성은 서비스 언어를 받고 기존 결제 ID 생성 계약은 유지한다", () => {
  const source = read("app/human-design/report/HumanDesignReportClient.tsx");
  // 기존 한국어 키는 바꾸지 않는다. 새로운 언어의 보고서는 기존 언어별 ID 계약을 쓴다.
  assert.ok(
    /const bodyRequestLocale: ReportLocale = useLocale\(\);/.test(source),
    "신규 생성 언어가 현재 서비스 locale을 따르지 않는다",
  );
  assert.ok(source.includes("locale: bodyRequestLocale,"), "생성 훅에 서비스 언어가 전달되지 않는다");
  const hook = read("app/human-design/report/_lib/useReportGeneration.ts");
  assert.ok(hook.includes("const key = `${REQUEST_ID_STORAGE_PREFIX}:${inputHash}:${locale}`;"));
  assert.ok(source.includes("uiLocale: locale,"), "화면 문구가 뷰어 언어를 받지 않는다");
});
