// 심화 자미두수 궁 챕터(/ziwei/chart 의 "하나씩 펼쳐 읽기")가 교재체로 되돌아가지 않는지 잠그는 가드.
//
// 🔴 검사 축은 "길이"가 아니라 "카드 품질"이다(2026-09-06 교체). 예전에는 절 본문 450자 하한이 있었고,
//    그 하한을 맞추려고 엔진이 filler 문장을 순환 주입해 같은 말이 반복되는 교재체가 나왔다. 길이 하한을
//    지우고 아래 축으로 바꾼다 — 🔴 엔진의 런타임 임계와 이 파일의 임계는 함께 움직여야 한다. 한쪽만
//    조이면 생성이 매번 검증 실패로 떨어져 조용히 재생성 경로를 타므로 화면에서는 티가 안 난다.
//
//  분량   절 본문 길이 하한 → 카드 4블록(✦/⚠/💡/왜 이렇게 읽었나) 존재 + 카드 앞면 700자 상한
//  밀도   신호 4종 → 블록별 항목 수(강점·주의·활용 각 2, 근거칩 3, 근거 노트 2)
//  어투   디버그 토큰 10종 → + BANNED_ZIWEI_TONE_PHRASES(엔진에서 import, 비면 실패)
//  시점   신설 — 한 줄 핵심이 2인칭("당신")인지
//  반복   fullText 9회 허용 → 카드 앞면은 같은 문장 2회부터 실패
//  비문   신설 — 별·궁 이름 뒤 조사가 받침과 어긋나면 실패("자미이", "명궁는")
//  내부   신설 — 해석 메타데이터(meta.lens)가 화면 노출 필드로 새면 실패
//  배선   신설 — 화면이 palaceReading.categories 를 직접 렌더하는지 정적 확인(문자열 재분해로 되돌아가면 실패)
//
// 네트워크·LLM 호출 없음. 픽스처 명반 2개 × 12궁을 그대로 생성해 검사한다.
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const ts = require("typescript");
const { buildSampleChart } = require("./lib/ziwei-deep-chart-fixture.cjs");

const ROOT = process.cwd();
const CACHE = new Map();

function ensureFile(targetPath) {
  const candidates = [
    targetPath,
    `${targetPath}.ts`,
    `${targetPath}.tsx`,
    `${targetPath}.js`,
    `${targetPath}.mjs`,
    `${targetPath}.cjs`,
    path.join(targetPath, "index.ts"),
    path.join(targetPath, "index.js"),
  ];
  for (const filePath of candidates) {
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) return filePath;
  }
  return null;
}

function transpileAndLoadTsModule(filePath) {
  const absolutePath = path.resolve(filePath);
  if (CACHE.has(absolutePath)) return CACHE.get(absolutePath).exports;

  const source = fs.readFileSync(absolutePath, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      allowSyntheticDefaultImports: true,
      jsx: ts.JsxEmit.React,
      resolveJsonModule: true,
    },
    fileName: absolutePath,
    reportDiagnostics: false,
  }).outputText;

  const moduleRecord = { exports: {} };
  CACHE.set(absolutePath, moduleRecord);

  const dirname = path.dirname(absolutePath);
  const localRequire = (specifier) => {
    if (specifier.startsWith(".")) {
      const resolvedBase = path.resolve(dirname, specifier);
      const resolved = ensureFile(resolvedBase);
      if (!resolved) {
        throw new Error(`[ziwei-counseling-quality] module not found: ${specifier} from ${absolutePath}`);
      }
      if (/\.(ts|tsx)$/i.test(resolved)) {
        return transpileAndLoadTsModule(resolved);
      }
      return require(resolved);
    }
    return require(specifier);
  };

  const wrapper = `(function(require,module,exports,__filename,__dirname){\n${transpiled}\n})`;
  const fn = vm.runInThisContext(wrapper, { filename: absolutePath });
  fn(localRequire, moduleRecord, moduleRecord.exports, absolutePath, dirname);
  return moduleRecord.exports;
}

function sentencesOf(text) {
  return String(text || "")
    .split(/(?<=[.!?])\s+|\n+/)
    .map((row) => row.trim().replace(/\s+/g, " "))
    .filter((row) => row.length >= 24);
}

// 문서 전체에서 같은 문장이 limit 회 이상 나오면 반복으로 본다.
function maxSentenceRepeat(text) {
  const counts = new Map();
  for (const row of sentencesOf(text)) counts.set(row, (counts.get(row) || 0) + 1);
  let max = 0;
  for (const [, count] of counts.entries()) if (count > max) max = count;
  return max;
}

const JOSA_PAIRS = [
  ["은", "는"],
  ["이", "가"],
  ["을", "를"],
  ["과", "와"],
];

// 한글 마지막 음절의 받침 유무. 한글로 끝나지 않으면 null.
function hasFinalConsonant(word) {
  const code = String(word || "").charCodeAt(String(word).length - 1);
  if (!(code >= 0xac00 && code <= 0xd7a3)) return null;
  return (code - 0xac00) % 28 > 0;
}

// 별·궁 이름 뒤 조사가 받침과 어긋난 자리를 찾는다. 화면에 그대로 노출되는 문장이라 비문은 곧 품질 사고다.
function findJosaErrors(text, vocabulary) {
  const value = String(text || "");
  const errors = [];
  for (const word of vocabulary) {
    const final = hasFinalConsonant(word);
    if (final === null) continue;
    for (const [withFinal, withoutFinal] of JOSA_PAIRS) {
      const wrong = final ? withoutFinal : withFinal;
      const regex = new RegExp(`${word}${wrong}(?=\\s|$|[.,!?)])`, "g");
      if (regex.test(value)) errors.push(`${word}${wrong}`);
    }
  }
  return [...new Set(errors)];
}

function splitSections(fullText) {
  const sections = [];
  const regex = /###\s+(\d+)\.\s+([^\n]+)\n\n([\s\S]*?)(?=\n###\s+\d+\.\s+|$)/g;
  let match;
  while ((match = regex.exec(String(fullText || ""))) !== null) {
    sections.push({
      order: Number(match[1] || 0),
      title: String(match[2] || "").trim(),
      body: String(match[3] || "").trim(),
    });
  }
  return sections;
}

function toWords(text) {
  return new Set(
    String(text || "")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((v) => v && v.length >= 2),
  );
}

function jaccard(textA, textB) {
  const a = toWords(textA);
  const b = toWords(textB);
  if (!a.size || !b.size) return 0;
  let intersect = 0;
  for (const w of a) if (b.has(w)) intersect += 1;
  const union = a.size + b.size - intersect;
  return union > 0 ? intersect / union : 0;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function run() {
  const chapterModule = transpileAndLoadTsModule(path.join(ROOT, "app", "_lib", "generate-ziwei-deep-chapter.ts"));
  const typeModule = transpileAndLoadTsModule(path.join(ROOT, "app", "_lib", "ziwei-types.ts"));
  const readingModule = transpileAndLoadTsModule(path.join(ROOT, "app", "_lib", "ziwei-deep-reading.ts"));

  const generateZiweiDeepChapter = chapterModule.generateZiweiDeepChapter;
  const ZIWEI_PALACE_NAME = typeModule.ZIWEI_PALACE_NAME;
  const validateZiweiDeepReading = readingModule.validateZiweiDeepReading;
  const bannedTonePhrases = readingModule.BANNED_ZIWEI_TONE_PHRASES;

  assert(typeof generateZiweiDeepChapter === "function", "generateZiweiDeepChapter 로드 실패");
  assert(typeof validateZiweiDeepReading === "function", "validateZiweiDeepReading 로드 실패");
  // 🔴 fail-closed — 목록이 비면 어투 검사가 통째로 무력화되므로 통과가 아니라 실패다.
  assert(Array.isArray(bannedTonePhrases) && bannedTonePhrases.length >= 10, `BANNED_ZIWEI_TONE_PHRASES 비정상: ${bannedTonePhrases && bannedTonePhrases.length}`);

  // 정적 배선 — 화면이 계산된 절 구조를 직접 렌더하는지. 문자열 재분해로 되돌아가면 카드가 조용히 사라진다.
  const componentSource = fs.readFileSync(path.join(ROOT, "app", "components", "AdvancedZiweiSectionV2.tsx"), "utf8");
  assert(componentSource.length > 20000, "AdvancedZiweiSectionV2.tsx 가 비정상적으로 짧다(경로 변경?)");
  assert(
    componentSource.includes("activeChapter.palaceReading?.categories"),
    "화면이 palaceReading.categories 를 직접 렌더하지 않는다 — 장문 재분해로 되돌아갔다.",
  );
  for (const slot of ["card.headline", "card.strengths", "card.cautions", "card.actions", "card.basisChips", "card.evidenceNotes"]) {
    assert(componentSource.includes(slot), `화면 카드에 ${slot} 렌더가 없다.`);
  }
  assert(!componentSource.includes("card.meta"), "🔴 해석 메타데이터(meta)가 화면에 렌더되고 있다.");

  // 정적 소스 — 검증 실패 재생성이 no-op 으로 돌아가지 않게 잠근다(예전 결함: reverse().reverse()).
  const readingSource = fs.readFileSync(path.join(ROOT, "app", "_lib", "ziwei-deep-reading.ts"), "utf8");
  assert(!/\.reverse\(\)\s*\.reverse\(\)/.test(readingSource), "🔴 이중 reverse 는 no-op 이라 재생성이 같은 텍스트를 만든다.");
  assert(readingSource.includes("function withJosa("), "조사 보정기(withJosa)가 사라졌다 — 별 이름 뒤 비문이 되살아난다.");

  const palaceIds = Object.keys(ZIWEI_PALACE_NAME || {});
  assert(palaceIds.length === 12, `12궁 키 개수 비정상: ${palaceIds.length}`);

  const forbidden = [
    "질문:",
    "해석 신호:",
    "usedSignals",
    "payload",
    "debug",
    "fallback",
    "데이터 부족",
    "보강",
    "CHAPTER 메모",
    "강약 서열",
    "raw json",
  ];

  const keywordChecks = {
    spouse: /(연애|관계|갈등|신뢰)/,
    career: /(직업|조직|평판|독립|이직)/,
    fortune: /(내면|행복|불안|회복)/,
  };

  const report = {
    generatedAt: new Date().toISOString(),
    sampleCount: 0,
    palaceCount: palaceIds.length,
    pass: true,
    failures: [],
    details: [],
  };

  const samples = [
    { name: "샘플A", chart: buildSampleChart("A", ZIWEI_PALACE_NAME) },
    { name: "샘플B", chart: buildSampleChart("B", ZIWEI_PALACE_NAME) },
  ];

  for (const sample of samples) {
    const chart = sample.chart;
    let foundEmptyPalace = false;
    const sampleRow = {
      input: {
        birthDate: `${chart.user.birthYear}-${String(chart.user.birthMonth).padStart(2, "0")}-${String(chart.user.birthDay).padStart(2, "0")}`,
        birthTime: `${String(chart.user.birthHour).padStart(2, "0")}:${String(chart.user.birthMinute).padStart(2, "0")}`,
        gender: chart.user.gender,
      },
      palaceChecks: [],
      distinctness: {},
    };

    const chapterMap = {};

    for (const palaceId of palaceIds) {
      const chapter = generateZiweiDeepChapter(chart, palaceId);
      chapterMap[palaceId] = chapter;

      const sections = splitSections(chapter.fullText);
      const sectionProblems = [];
      const REQUIRED_BLOCKS = ["**✦ ", "**⚠ ", "**💡 ", "**왜 이렇게 읽었나**"];
      sections.forEach((section, idx) => {
        const missing = REQUIRED_BLOCKS.filter((block) => !section.body.includes(block));
        if (missing.length) sectionProblems.push(`section${idx + 1}:block-missing`);
        if (bannedTonePhrases.some((phrase) => section.body.includes(phrase))) sectionProblems.push(`section${idx + 1}:tone`);
        if (section.title && section.body.split(section.title).length - 1 > 3) sectionProblems.push(`section${idx + 1}:title-repeat`);
      });

      // 카드 앞면(화면에서 접히지 않고 먼저 읽히는 부분)만 따로 본다.
      const categories = chapter.palaceReading?.categories || [];
      const chartVocabulary = [
        ...Object.values(ZIWEI_PALACE_NAME || {}),
        ...(chart.palaces || []).flatMap((p) => (p.allStars || []).map((s) => s.name)),
      ].filter((word) => typeof word === "string" && word.length >= 2);
      const seenFrontSentences = new Map();
      categories.forEach((category, idx) => {
        const tag = `card${idx + 1}`;
        const front = [
          category.headline || "",
          category.interpretation || "",
          ...(category.strengths || []),
          ...(category.cautions || []),
          ...(category.actions || []),
        ].filter(Boolean).join(" ").trim();

        if (!String(category.headline || "").includes("당신")) sectionProblems.push(`${tag}:headline-not-2nd-person`);
        if ((category.strengths || []).length < 2) sectionProblems.push(`${tag}:strengths<2`);
        if ((category.cautions || []).length < 2) sectionProblems.push(`${tag}:cautions<2`);
        if ((category.actions || []).length < 2) sectionProblems.push(`${tag}:actions<2`);
        if ((category.basisChips || []).length < 3) sectionProblems.push(`${tag}:chips<3`);
        if ((category.evidenceNotes || []).length < 2) sectionProblems.push(`${tag}:evidence<2`);
        if (front.length < 180) sectionProblems.push(`${tag}:front<180`);
        if (front.length > 700) sectionProblems.push(`${tag}:front>700`);
        if (category.categoryQuestion && front.includes(category.categoryQuestion)) sectionProblems.push(`${tag}:question-leak`);
        if (bannedTonePhrases.some((phrase) => front.includes(phrase))) sectionProblems.push(`${tag}:tone`);
        if (category.meta?.lens && front.includes(category.meta.lens)) sectionProblems.push(`${tag}:meta-leak`);
        const josaErrors = findJosaErrors(front, chartVocabulary);
        if (josaErrors.length) sectionProblems.push(`${tag}:josa(${josaErrors.slice(0, 3).join("/")})`);
        // 🔴 카드 앞면은 반복 무관용 — 절이 8개라 같은 문장이 두 번만 보여도 눈에 띈다.
        for (const row of sentencesOf(front)) {
          if (seenFrontSentences.has(row)) sectionProblems.push(`${tag}:front-repeat`);
          seenFrontSentences.set(row, true);
        }
      });

      const engineValidation = validateZiweiDeepReading(chapter);
      if (!engineValidation.valid) {
        sectionProblems.push(`engine-invalid(${engineValidation.issues.slice(0, 3).join(" / ")})`);
      }

      const forbiddenFound = forbidden.filter((token) => String(chapter.fullText || "").includes(token));
      // 근거 노트까지 합친 문서 전체 기준. 절이 8개뿐이라 5회 이상은 회전이 고장 났다는 뜻이다.
      const repeated = maxSentenceRepeat(chapter.fullText) >= 5;
      const isEmptyPalace = Boolean(chapter.palaceReading?.isEmptyPalace);
      if (isEmptyPalace) foundEmptyPalace = true;

      if (isEmptyPalace) {
        const emptyHints = /(환경과 상대|마주 보는 궁|연결되느냐|유연성|기준표|관계 경계|선택 조건)/;
        if (!emptyHints.test(String(chapter.fullText || ""))) {
          sectionProblems.push("empty-palace-guidance-missing");
        }
      }

      const name = String(chapter.palaceReading?.palaceName || ZIWEI_PALACE_NAME[palaceId] || palaceId);
      const hasWrongIntro = palaceIds
        .filter((id) => id !== palaceId)
        .map((id) => String(ZIWEI_PALACE_NAME[id] || ""))
        .some((otherName) => otherName && String(chapter.fullText || "").includes(`${otherName}은 당신의 삶에서`));

      const row = {
        palaceId,
        palaceName: name,
        categoryCount: chapter.palaceReading?.categories?.length || 0,
        sectionCount: sections.length,
        forbiddenFound,
        repeatedSentence: repeated,
        maxSentenceRepeat: maxSentenceRepeat(chapter.fullText),
        sectionProblems,
        hasWrongIntro,
      };

      sampleRow.palaceChecks.push(row);

      if (row.categoryCount !== 8) report.failures.push(`[${sample.name}] ${name}: categoryCount=${row.categoryCount}`);
      if (row.sectionCount !== 8) report.failures.push(`[${sample.name}] ${name}: sectionCount=${row.sectionCount}`);
      if (forbiddenFound.length) report.failures.push(`[${sample.name}] ${name}: forbidden=${forbiddenFound.join(",")}`);
      if (repeated) report.failures.push(`[${sample.name}] ${name}: repeated-sentence`);
      if (hasWrongIntro) report.failures.push(`[${sample.name}] ${name}: wrong-palace-intro`);
      if (sectionProblems.length) report.failures.push(`[${sample.name}] ${name}: ${sectionProblems.join(",")}`);

      const keywordRule = keywordChecks[palaceId];
      if (keywordRule && !keywordRule.test(String(chapter.fullText || ""))) {
        report.failures.push(`[${sample.name}] ${name}: keyword-rule-miss`);
      }
    }

    if (!foundEmptyPalace) {
      report.failures.push(`[${sample.name}] 공궁 샘플 미검출: 입력 케이스 확장 필요`);
    }

    const mingText = String(chapterMap.ming?.fullText || "");
    const wealthText = String(chapterMap.wealth?.fullText || "");
    const similarity = jaccard(mingText, wealthText);
    sampleRow.distinctness = {
      mingVsWealthJaccard: similarity,
      pass: similarity < 0.82,
    };
    if (!(similarity < 0.82)) {
      report.failures.push(`[${sample.name}] 명궁/재백궁 문장 유사도 과다: ${similarity.toFixed(3)}`);
    }

    report.details.push(sampleRow);
  }

  report.sampleCount = report.details.length;
  report.pass = report.failures.length === 0;

  const outDir = path.join(ROOT, "reports");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "ziwei-deep-counseling-quality-report.json");
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), "utf8");

  if (!report.pass) {
    console.error("[verify-ziwei-deep-counseling-quality] FAIL");
    report.failures.forEach((line) => console.error(`  - ${line}`));
    console.error(`  - report: ${path.relative(ROOT, outPath)}`);
    process.exitCode = 1;
    return;
  }

  console.log("[verify-ziwei-deep-counseling-quality] PASS");
  console.log(`  - samples: ${report.sampleCount}`);
  console.log(`  - palaces(each): ${report.palaceCount}`);
  console.log(`  - report: ${path.relative(ROOT, outPath)}`);
}

try {
  run();
} catch (error) {
  console.error("[verify-ziwei-deep-counseling-quality] FAIL:", error && error.message ? error.message : error);
  if (error && error.stack) {
    console.error(error.stack);
  }
  process.exitCode = 1;
}
