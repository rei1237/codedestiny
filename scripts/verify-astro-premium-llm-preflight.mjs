#!/usr/bin/env node
import "dotenv/config";
import { existsSync } from "node:fs";
import { writeFile, unlink } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { generateAstrologyPremiumPdfV2 } from "../worker/lib/pdf-v2/astrology/create-astrology-premium-pdf-job.js";
import { astrologyPremiumChapterPlanV2 } from "../worker/lib/pdf-v2/astrology/astrology-premium.chapter-plan.js";
import { stripTags } from "../worker/lib/pdf-v2/astrology/astrology-premium.types.js";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const TMP_HTML = new URL("../.tmp-astro-premium-preflight.html", import.meta.url);
const GEMINI_KEYS = [
  "ASTROLOGY_PREMIUM_GEMINI_MODEL",
  "GEMINI_MODEL",
  "GEMINIF_API_KEY",
];

function parseArgs(argv) {
  const out = {};
  for (let index = 0; index < argv.length; index += 1) {
    const item = String(argv[index] || "");
    if (!item.startsWith("--")) continue;
    const key = item.slice(2);
    const next = String(argv[index + 1] || "");
    if (next && !next.startsWith("--")) {
      out[key] = next;
      index += 1;
    } else {
      out[key] = "true";
    }
  }
  return out;
}

function clean(value) {
  return String(value ?? "").trim();
}

function fixtureChart() {
  return {
    birthInput: {
      name: "테스트",
      gender: "female",
      birthDate: "1991-02-20",
      birthTime: "07:00",
      timezone: "Asia/Seoul",
      birthPlace: "서울",
      latitude: 37.5665,
      longitude: 126.978,
    },
    calculationMode: "swiss-wasm-local",
    chartSource: "swiss-wasm-local",
    engineQuality: "swiss",
    houseSystem: "Placidus",
    chart: {
      zodiacType: "tropical",
      houseSystem: "Placidus",
      sunSign: "물고기자리",
      moonSign: "천칭자리",
      ascendantSign: "천칭자리",
      midheavenSign: "게자리",
      elementBalance: { fire: 2, earth: 1, air: 3, water: 4 },
      modalityBalance: { cardinal: 4, fixed: 2, mutable: 4 },
      planets: [
        { name: "Sun", sign: "물고기자리", house: 5, degree: 1.2 },
        { name: "Moon", sign: "천칭자리", house: 1, degree: 12.3 },
        { name: "Mercury", sign: "물병자리", house: 4, degree: 22.1 },
        { name: "Venus", sign: "양자리", house: 7, degree: 4.4 },
        { name: "Mars", sign: "쌍둥이자리", house: 9, degree: 18.2 },
        { name: "Jupiter", sign: "사자자리", house: 11, degree: 7.8 },
        { name: "Saturn", sign: "염소자리", house: 4, degree: 28.5 },
      ],
      houses: Array.from({ length: 12 }, (_, index) => ({
        house: index + 1,
        sign: ["천칭자리", "전갈자리", "사수자리", "염소자리", "물병자리", "물고기자리", "양자리", "황소자리", "쌍둥이자리", "게자리", "사자자리", "처녀자리"][index],
        cuspDegree: `${index * 30}도`,
      })),
      aspects: [
        { planetA: "Sun", planetB: "Moon", type: "trine", orb: 2.1 },
        { planetA: "Venus", planetB: "Mars", type: "opposition", orb: 1.4 },
      ],
    },
    timingInsights: {
      calculated: true,
      source: "western-transit-swiss",
      baseDate: "2026-06-20",
      snapshots: [
        { label: "현재", outerPlanets: ["목성 게자리"], aspects: [{ text: "목성-태양 트라인" }] },
        { label: "90일", outerPlanets: ["토성 양자리"], aspects: [{ text: "토성-달 섹스타일" }] },
      ],
    },
  };
}

function mockArticle(prompt) {
  const chapterId = (prompt.match(/data-chapter-id="([^"]+)"/) || [])[1] || "astro-01";
  const title = (prompt.match(/\n제목: ([^\n]+)/) || prompt.match(/<h2>([\s\S]*?)<\/h2>/) || [])[1] || "점성술 챕터";
  const bodyParagraphs = [
    `${title}에서는 출생 차트의 Sun 물고기자리, Moon 천칭자리, 상승궁 천칭자리, MC 게자리 흐름을 중심으로 삶의 큰 방향을 읽습니다. 태양은 자기표현의 중심을, 달은 감정의 안전감을, 상승궁은 관계 안에서 처음 드러나는 태도를 비춥니다.`,
    `이 차트는 Venus 양자리와 Mars 쌍둥이자리의 움직임이 사랑과 행동 방식에 또렷하게 닿아 있습니다. 금성은 관계에서 빠르게 마음이 열리는 지점을 보여 주고, 화성은 말과 배움, 이동성 안에서 추진력이 살아나는 패턴을 가리킵니다.`,
    `하우스 배치를 함께 보면 5하우스의 태양과 1하우스의 달이 자기표현과 감정 반응을 강하게 연결합니다. 이 흐름은 사람들 앞에서 부드럽게 빛나고 싶어 하면서도, 가까운 관계에서는 균형과 공정함을 중요하게 여기는 심리로 드러납니다.`,
    `Sun-Moon trine과 Venus-Mars opposition은 조화와 긴장이 함께 움직이는 신호입니다. 장점은 감정과 의지가 비교적 자연스럽게 이어진다는 점이고, 주의점은 사랑과 선택의 속도가 빨라질 때 상대의 리듬을 놓칠 수 있다는 점입니다.`,
    `현재 트랜짓에서는 목성-태양 트라인과 토성-달 섹스타일 흐름이 성장과 정돈을 동시에 요구합니다. 지금은 관계와 창작의 가능성을 넓히되, 생활 리듬과 약속의 경계를 분명히 세울수록 운의 흐름이 안정적으로 열립니다.`,
  ].map((text) => `<p>${text}</p>`).join("");
  return `<section class="astrology-chapter" data-chapter-id="${chapterId}">
  <h2>${title}</h2>
  <div class="chapter-summary">
    <p>출생 차트의 태양, 달, 상승궁, 하우스, 어스펙트가 한 방향으로만 흐르지 않고 조화와 긴장을 함께 만듭니다. 제공된 계산 결과 안에서 확인되는 신호를 중심으로 현재의 선택 기준을 정리합니다. 이 장은 성향의 장점과 조율 지점을 현실 조언으로 연결합니다.</p>
  </div>
  <div class="chapter-body">${bodyParagraphs}</div>
  <div class="chapter-advice">
    <h3>별자리 처방</h3>
    <ul>
      <li>감정이 앞설 때는 Moon 천칭자리의 균형 감각으로 대화의 순서를 늦추세요.</li>
      <li>Venus 양자리의 빠른 끌림은 약속과 경계 확인을 거칠 때 더 안정됩니다.</li>
      <li>목성-태양 트라인이 열어 주는 확장 기회를 작은 실행 계획으로 붙잡으세요.</li>
    </ul>
  </div>
</section>`;
}

function buildEnv(mode) {
  if (mode === "live") {
    const env = { ...process.env };
    env.ASTROLOGY_PREMIUM_LLM_PROVIDERS = clean(env.ASTROLOGY_PREMIUM_LLM_PROVIDERS || "gemini");
    env.ASTROLOGY_PREMIUM_DISABLE_GEMINI_FALLBACK = clean(env.ASTROLOGY_PREMIUM_DISABLE_GEMINI_FALLBACK || "false");
    return env;
  }
  return {
    AI: {
      run: async (_model, request) => ({ response: mockArticle(request.messages[1].content) }),
    },
  };
}

function providerStatus() {
  const geminiKeys = GEMINI_KEYS.filter((key) => clean(process.env[key]));
  return {
    geminiReady: geminiKeys.some((key) => /API_KEY|GEMINIF|PREMIUM_GEMINI/.test(key)),
    configuredNames: geminiKeys,
    workersAiBindingReady: false,
  };
}

function installLogFilter(verbose) {
  if (verbose) return;
  const originalInfo = console.info.bind(console);
  console.info = (...args) => {
    if (String(args[0] || "").startsWith("[AstrologyPremiumPDF]")) return;
    originalInfo(...args);
  };
}

function assertResult(generated, progressEvents = []) {
  const html = clean(generated?.pdfReady?.html);
  const text = stripTags(html);
  const foreignTokens = Array.from(text.matchAll(/\b[A-Za-z][A-Za-z0-9_-]{2,}\b/g))
    .map((match) => match[0])
    .filter((token) => ![
      "PDF",
      "HTML",
      "MC",
      "IC",
      "ASC",
      "ID",
      "Sun",
      "Moon",
      "Mercury",
      "Venus",
      "Mars",
      "Jupiter",
      "Saturn",
      "female",
      "Asia",
      "Seoul",
      "tropical",
      "Placidus",
      "trine",
      "opposition",
      "Sun-Moon",
      "Venus-Mars",
      "astro-preflight-local",
      "astro-preflight-live",
    ].includes(token));
  const summary = {
    ok: generated?.ok === true,
    status: generated?.status,
    downloadUrl: clean(generated?.downloadUrl),
    completionOk: generated?.pdfCompletionValidation?.ok === true,
    chapterCount: Number(generated?.chapterCount || 0),
    expectedChapterCount: Number(generated?.expectedChapterCount || 0),
    chapterSectionCount: (html.match(/class="astrology-chapter"/g) || []).length,
    tableCount: (html.match(/astro-table/g) || []).length,
    chartBasisCount: (html.match(/astro-chart-basis/g) || []).length,
    finalAdviceCount: (html.match(/astro-final-advice/g) || []).length,
    foreignTokens,
    progressStatuses: Array.from(new Set(progressEvents.map((event) => clean(event.status)).filter(Boolean))),
    lastProgress: progressEvents.length ? progressEvents[progressEvents.length - 1] : null,
  };
  const pass = summary.ok
    && summary.status === "completed"
    && Boolean(summary.downloadUrl)
    && summary.completionOk
    && summary.chapterCount === astrologyPremiumChapterPlanV2.chapters.length
    && summary.expectedChapterCount === astrologyPremiumChapterPlanV2.chapters.length
    && summary.chapterSectionCount === astrologyPremiumChapterPlanV2.chapters.length
    && summary.tableCount >= 3
    && summary.chartBasisCount >= 1
    && summary.finalAdviceCount >= 1
    && summary.foreignTokens.length === 0
    && summary.progressStatuses.includes("validating")
    && summary.progressStatuses.includes("generating")
    && summary.progressStatuses.includes("rendering")
    && summary.progressStatuses.includes("completed")
    && Number(summary.lastProgress?.progress || 0) === 100;
  return { pass, summary, html };
}

async function renderCheck(html) {
  const chromePath = [
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    `${process.env.LOCALAPPDATA || ""}/Google/Chrome/Application/chrome.exe`,
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  ].find((path) => path && existsSync(path));
  if (!chromePath) return { skipped: true, reason: "BROWSER_EXECUTABLE_NOT_FOUND" };
  const { default: puppeteer } = await import("puppeteer-core");
  await writeFile(TMP_HTML, html, "utf8");
  try {
    const browser = await puppeteer.launch({
      executablePath: chromePath,
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 });
    await page.goto(pathToFileURL(fileURLToPath(TMP_HTML)).href, { waitUntil: "load", timeout: 30000 });
    const result = await page.evaluate(() => {
      const box = (selector) => {
        const el = document.querySelector(selector);
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        return { width: Math.round(rect.width), height: Math.round(rect.height), visible: rect.width > 0 && rect.height > 0 };
      };
      const count = (selector) => document.querySelectorAll(selector).length;
      const allVisible = (selector) => Array.from(document.querySelectorAll(selector)).every((el) => {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
      return {
        title: document.title,
        chapters: count("section.astrology-chapter[data-chapter-id]"),
        tableCount: count(".astro-table"),
        chartBasisCount: count(".astro-chart-basis"),
        finalAdviceCount: count(".astro-final-advice"),
        visualSection: box(".astro-core-summary"),
        planetTable: box(".astro-planet-table"),
        tablesVisible: allVisible(".astro-table"),
        chartBasisVisible: allVisible(".astro-chart-basis"),
        finalAdviceVisible: allVisible(".astro-final-advice"),
      };
    });
    await browser.close();
    return result;
  } finally {
    await unlink(TMP_HTML).catch(() => {});
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  installLogFilter(args.verbose === "true");
  const mode = args.live === "true" ? "live" : "mock";
  const status = providerStatus();
  if (mode === "live" && !status.geminiReady) {
    console.log(JSON.stringify({
      ok: false,
      skipped: true,
      reason: "ASTROLOGY_LIVE_LLM_ENV_MISSING",
      providerStatus: status,
      hint: "Set a Gemini key env and run with --live.",
    }, null, 2));
    process.exitCode = args.require === "true" ? 2 : 0;
    return;
  }

  const reportSuffix = mode === "mock" ? "local" : "live";
  const progressEvents = [];
  const generated = await generateAstrologyPremiumPdfV2({
    userId: "preflight-user",
    env: buildEnv(mode),
    input: { localAstroChartJson: fixtureChart() },
    requestUrl: "https://example.test/api/astro/premium/prepare",
    reportId: `astro-preflight-${reportSuffix}`,
    sessionId: `astro-preflight-${reportSuffix}`,
    paymentContext: { reportId: `astro-preflight-${reportSuffix}`, sessionId: `astro-preflight-${reportSuffix}` },
    onProgress: (event) => progressEvents.push(event),
  });
  const checked = assertResult(generated, progressEvents);
  const render = args.noRender === "true" ? { skipped: true, reason: "NO_RENDER" } : await renderCheck(checked.html);
  const renderPass = render.skipped === true || (
    render.chapters === astrologyPremiumChapterPlanV2.chapters.length
    && render.tableCount >= 3
    && render.chartBasisCount >= 1
    && render.finalAdviceCount >= 1
    && render.tablesVisible === true
    && render.chartBasisVisible === true
    && render.finalAdviceVisible === true
  );
  const ok = checked.pass && renderPass;
  console.log(JSON.stringify({
    ok,
    mode,
    providerStatus: status,
    summary: checked.summary,
    render,
  }, null, 2));
  if (!ok) process.exitCode = 1;
}

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    error: clean(error?.message || error),
    code: clean(error?.code),
  }, null, 2));
  process.exitCode = 1;
});
