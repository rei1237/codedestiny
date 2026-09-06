const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
// 🔴 이 레포에는 CRLF 파일이 섞여 있다. 줄바꿈을 정규화하고 본다.
const read = (file) => fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");

/**
 * `/diary` 화면 문안 정책 가드.
 *
 * 이 앱에서 운기는 결과를 정하는 것이 아니라 **사용자가 자기 기록과 대조하는 관찰 도구**다.
 * 그 전제가 깨지는 두 가지를 정적으로 막는다:
 *   ① 명리 용어가 화면에 나가는 것 — 한글 십성 이름은 `lib/diary/fortune-adapter.ts` 안에서
 *      계열 키로 바뀌고, `app/diary/**` 에는 한 글자도 오면 안 된다.
 *   ② 결정론 문장 — "운이 좋다/나쁘다", "흉일", "~하면 성공한다".
 *
 * 🔴 fail-closed 다 — 대상 파일을 소스에서 전수로 발견하고, 한 건도 못 찾으면 실패한다
 * (손으로 쓴 파일 목록은 가드가 아니다, 원칙 10).
 */

/** 주석 안의 용어는 화면에 나가지 않는다 — 이 가드가 무는 것은 실제 코드·문안뿐이다. */
function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/.*$/gm, "$1");
}

function walk(dir) {
  const stack = [dir];
  const files = [];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (/\.(tsx?|jsx?|css)$/.test(entry.name)) files.push(full);
    }
  }
  return files.sort();
}

const DIARY_DIR = path.join(root, "app/diary");
const DIARY_FILES = walk(DIARY_DIR);

/** 화면에 올리지 않는 명리 용어. `app/diary/_lib/flow-copy.ts` 머리 주석의 목록과 같다. */
const FORBIDDEN_TERMS = [
  "일진",
  "십성",
  "용신",
  "기신",
  "신강",
  "신약",
  "오행",
  "비견",
  "겁재",
  "식신",
  "상관",
  "편재",
  "정재",
  "편관",
  "정관",
  "편인",
  "정인",
  "종격",
];

/** 결정론 문장. 운기가 결과를 정한다고 읽히는 형태 전부. */
const DETERMINISTIC_PATTERNS = [
  /운이\s*(?:좋|나쁘|안\s*좋)/,
  /흉일/,
  /길일/,
  /하면\s*(?:성공|실패)/,
  /운기가[^.\n]*결정/,
  /반드시\s*(?:된다|됩니다|이뤄)/,
];

const TONES = ["very-good", "good", "normal", "bad", "very-bad"];
const GROUPS = ["peer", "express", "wealth", "order", "support"];

const DAY_COPY_FILE = path.join(DIARY_DIR, "_lib/day-copy.ts");

test("the diary copy scan actually sees Korean copy", () => {
  // 🔴 대상이 비면 통과하는 가드는 가드가 아니다.
  assert.ok(DIARY_FILES.length > 0, "app/diary 아래에서 파일을 찾지 못했다");
  assert.ok(
    DIARY_FILES.some((file) => file.endsWith(".tsx")),
    "app/diary 아래에서 화면 컴포넌트를 찾지 못했다",
  );

  let hangulLiterals = 0;
  for (const file of DIARY_FILES) {
    const source = stripComments(read(file));
    hangulLiterals += (source.match(/["'`][^"'`\n]*[가-힣][^"'`\n]*["'`]/g) || []).length;
  }
  assert.ok(hangulLiterals >= 40, `한글 문안 리터럴이 ${hangulLiterals}건뿐이다 — 스캔이 헛돌고 있다`);
});

test("no myeongri vocabulary reaches the diary surface", () => {
  for (const file of DIARY_FILES) {
    const source = stripComments(read(file));
    for (const term of FORBIDDEN_TERMS) {
      assert.ok(
        !source.includes(term),
        `${path.relative(root, file)} 에 화면 금칙어 「${term}」가 있다`,
      );
    }
  }
});

test("no deterministic fortune phrasing reaches the diary surface", () => {
  for (const file of DIARY_FILES) {
    const source = stripComments(read(file));
    for (const pattern of DETERMINISTIC_PATTERNS) {
      assert.doesNotMatch(source, pattern, `${path.relative(root, file)} 가 결정론 문장을 쓴다`);
    }
  }
});

test("the day copy table fills all 25 grade x group cells", () => {
  const source = stripComments(read(DAY_COPY_FILE));
  const table = /const DIARY_DAY_LINES[^=]*=\s*\{([\s\S]*?)\n\};/.exec(source);
  assert.ok(table, "DIARY_DAY_LINES 표를 찾지 못했다");
  const body = table[1];

  const starts = TONES.map((tone) => {
    const marker = new RegExp(`(?:"${tone}"|${tone})\\s*:\\s*\\{`, "g");
    const found = body.match(marker) || [];
    assert.equal(found.length, 1, `등급 「${tone}」 칸이 ${found.length}개다 — 정확히 하나여야 한다`);
    return { tone, index: body.search(new RegExp(`(?:"${tone}"|${tone})\\s*:\\s*\\{`)) };
  }).sort((a, b) => a.index - b.index);

  starts.forEach((entry, order) => {
    const end = order + 1 < starts.length ? starts[order + 1].index : body.length;
    const segment = body.slice(entry.index, end);
    for (const group of GROUPS) {
      assert.match(
        segment,
        new RegExp(`\\b${group}\\s*:\\s*\\{`),
        `등급 「${entry.tone}」에 계열 「${group}」 칸이 없다`,
      );
    }
    assert.equal(
      (segment.match(/\bread:\s*"/g) || []).length,
      GROUPS.length,
      `등급 「${entry.tone}」의 문장 수가 계열 수와 다르다`,
    );
  });

  const reads = [...source.matchAll(/\bread:\s*"([^"]+)"/g)].map((match) => match[1]);
  const watches = [...source.matchAll(/\bwatch:\s*"([^"]+)"/g)].map((match) => match[1]);
  assert.equal(reads.length, TONES.length * GROUPS.length);
  assert.equal(watches.length, TONES.length * GROUPS.length);
  // 같은 문장을 두 칸에 붙이면 25칸을 채운 척만 한 것이다.
  assert.equal(new Set(reads).size, reads.length, "읽는 줄에 중복이 있다");
  assert.equal(new Set(watches).size, watches.length, "살피는 줄에 중복이 있다");
});

test("every day copy line keeps the observation frame", () => {
  const source = stripComments(read(DAY_COPY_FILE));
  for (const [, line] of source.matchAll(/\bread:\s*"([^"]+)"/g)) {
    assert.ok(line.endsWith("좋은 조건입니다."), `읽는 줄이 관찰 프레임을 벗어났다: ${line}`);
  }
  for (const [, line] of source.matchAll(/\bwatch:\s*"([^"]+)"/g)) {
    assert.ok(line.endsWith("눈에 띄면 적어 두세요."), `살피는 줄이 관찰 프레임을 벗어났다: ${line}`);
  }
});
