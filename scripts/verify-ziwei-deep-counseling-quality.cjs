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

function countCoverageSignals(text) {
  const checks = [
    /(성향|기질|반응|욕구|자존감|사고방식)/,
    /(관계|사람|상대|연애|동료|가족|신뢰)/,
    /(현실|직업|돈|사랑|가족|생활|업무|수입|소비)/,
    /(주의|조심|리스크|충돌|번아웃|갈등|흔들)/,
    /(조언|실행|오늘부터|루틴|규칙|행동)/,
  ];
  return checks.reduce((acc, regex) => (regex.test(text) ? acc + 1 : acc), 0);
}

function hasRepeatedSentence(text) {
  const rows = String(text || "")
    .split(/(?<=[.!?다요])\s+|\n+/)
    .map((row) => row.trim())
    .filter((row) => row.length >= 24);
  const counts = new Map();
  for (const row of rows) {
    const key = row.replace(/\s+/g, " ");
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  for (const [, count] of counts.entries()) {
    if (count >= 9) return true;
  }
  return false;
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

  const generateZiweiDeepChapter = chapterModule.generateZiweiDeepChapter;
  const ZIWEI_PALACE_NAME = typeModule.ZIWEI_PALACE_NAME;

  assert(typeof generateZiweiDeepChapter === "function", "generateZiweiDeepChapter 로드 실패");

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
      sections.forEach((section, idx) => {
        if (section.body.length < 450) sectionProblems.push(`section${idx + 1}:len<450`);
        if (countCoverageSignals(section.body) < 4) sectionProblems.push(`section${idx + 1}:coverage<4`);
      });

      const forbiddenFound = forbidden.filter((token) => String(chapter.fullText || "").includes(token));
      const repeated = hasRepeatedSentence(chapter.fullText);
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
