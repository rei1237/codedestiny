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
  "PREMIUM_GEMINI_API_KEY0",
  "PREMIUM_GEMINI_API_KEY1",
  "PREMIUM_GEMINI_API_KEY2",
  "PREMIUM_GEMINI_API_KEY3",
  "PREMIUM_GEMINI_API_KEY4",
  "PREMIUM_GEMINI_API_KEY5",
  "PREMIUM_GEMINI_API_KEY6",
  "PREMIUM_GEMINI_API_KEY7",
  "PREMIUM_GEMINI_API_KEY8",
  "GEMINIF_API_KEY0",
  "GEMINIF_API_KEY1",
  "GEMINIF_API_KEY2",
  "GEMINIF_API_KEY3",
  "GEMINIF_API_KEY4",
  "GEMINIF_API_KEY5",
  "GEMINIF_API_KEY6",
  "GEMINIF_API_KEY7",
  "GEMINIF_API_KEY8",
  "GEMINI_API_KEY",
  "GOOGLE_GEMINI_API_KEY",
  "GOOGLE_GENERATIVE_AI_API_KEY",
  "GOOGLE_API_KEY",
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
  const chapterId = (prompt.match(/<article data-chapter-id="([^"]+)"/) || [])[1] || "ch01";
  const title = (prompt.match(/<h1>([\s\S]*?)<\/h1>/) || [])[1] || "점성술 챕터";
  const grounding = ((prompt.match(/필수 근거 용어: ([^\n]+)/) || [])[1] || "태양 / 달 / 상승궁")
    .split("/")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 4)
    .join(", ");
  const outputFormat = prompt.slice(Math.max(0, prompt.lastIndexOf("[출력 형식]")));
  const sections = Array.from(outputFormat.matchAll(/<h2>([\s\S]*?)<\/h2>/g)).map((match) => match[1]);
  const body = sections.map((section, index) => {
    const marker = ` [장${chapterId.replace("ch", "")}-${index + 1}]`;
    const first = `${section}${marker}에서는 ${grounding}의 근거와 함께 태양, 달, 상승궁, 하우스와 애스펙트가 만드는 흐름을 차분히 읽습니다. ${section}${marker}의 핵심은 계산된 차트에 있는 행성 배치와 현재 트랜짓을 현실의 감각으로 번역하는 데 있습니다. ${section}${marker}은 사용자가 반복해 선택하는 기준, 감정이 먼저 반응하는 방향, 관계 안에서 자연스럽게 취하는 태도를 하나씩 밝혀 줍니다.`;
    const second = `${section}${marker}의 조언은 단정적인 예언이 아니라 자기이해를 돕는 안내입니다. ${section}${marker}은 제공된 점성술 계산 결과를 기준으로 확인되는 신호만 다루며, 부족한 정보는 신중하게 제한을 밝힙니다. ${section}${marker}의 흐름은 관계, 일, 돈, 생활 리듬에서 지금 조정할 수 있는 행동을 부드럽게 가리킵니다.`;
    const third = `${section}${marker}을 현실에 적용할 때는 행성의 위치와 하우스의 무대가 겹치는 부분을 먼저 봅니다. ${section}${marker}은 당장 바꿀 수 있는 습관, 더 지켜봐야 할 변화, 타인과 대화로 풀어야 할 주제를 구분하게 합니다. ${section}${marker}의 마지막 조언은 오늘의 작은 선택을 차트의 큰 방향과 맞추는 데 있습니다.`;
    return `<section><h2>${section}</h2><p>${first}</p><p>${second}</p><p>${third}</p></section>`;
  }).join("");
  return `<article data-chapter-id="${chapterId}"><h1>${title}</h1>${body}</article>`;
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

function assertResult(generated) {
  const html = clean(generated?.pdfReady?.html);
  const text = stripTags(html);
  const foreignTokens = Array.from(text.matchAll(/\b[A-Za-z][A-Za-z0-9_-]{2,}\b/g))
    .map((match) => match[0])
    .filter((token) => !["PDF", "HTML", "MC", "IC", "ASC"].includes(token));
  const summary = {
    ok: generated?.ok === true,
    status: generated?.status,
    downloadUrl: clean(generated?.downloadUrl),
    completionOk: generated?.pdfCompletionValidation?.ok === true,
    chapterCount: Number(generated?.chapterCount || 0),
    expectedChapterCount: Number(generated?.expectedChapterCount || 0),
    articleCount: (html.match(/data-chapter-id=/g) || []).length,
    tableCount: (html.match(/astro-table/g) || []).length,
    barCount: (html.match(/astro-bar-track/g) || []).length,
    timelineCount: (html.match(/astro-transit-timeline/g) || []).length,
    foreignTokens,
  };
  const pass = summary.ok
    && summary.status === "completed"
    && Boolean(summary.downloadUrl)
    && summary.completionOk
    && summary.chapterCount === astrologyPremiumChapterPlanV2.chapters.length
    && summary.expectedChapterCount === astrologyPremiumChapterPlanV2.chapters.length
    && summary.articleCount === astrologyPremiumChapterPlanV2.chapters.length
    && summary.tableCount >= 3
    && summary.barCount >= 6
    && summary.timelineCount >= 1
    && summary.foreignTokens.length === 0;
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
        articles: count("article[data-chapter-id]"),
        tableCount: count(".astro-table"),
        barCount: count(".astro-bar-track i"),
        timelineCount: count(".astro-transit-timeline li"),
        visualSection: box(".astro-visual-section"),
        planetTable: box(".astro-planet-table"),
        firstBar: box(".astro-bar-track i"),
        tablesVisible: allVisible(".astro-table"),
        barsVisible: allVisible(".astro-bar-track i"),
        timelineVisible: allVisible(".astro-transit-timeline li"),
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

  const generated = await generateAstrologyPremiumPdfV2({
    userId: "preflight-user",
    env: buildEnv(mode),
    input: { localAstroChartJson: fixtureChart() },
    requestUrl: "https://example.test/api/astro/premium/prepare",
    reportId: `astro-preflight-${mode}`,
    sessionId: `astro-preflight-${mode}`,
    paymentContext: { reportId: `astro-preflight-${mode}`, sessionId: `astro-preflight-${mode}` },
  });
  const checked = assertResult(generated);
  const render = args.noRender === "true" ? { skipped: true, reason: "NO_RENDER" } : await renderCheck(checked.html);
  const renderPass = render.skipped === true || (
    render.articles === astrologyPremiumChapterPlanV2.chapters.length
    && render.tableCount >= 3
    && render.barCount >= 6
    && render.timelineCount >= 1
    && render.tablesVisible === true
    && render.barsVisible === true
    && render.timelineVisible === true
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
