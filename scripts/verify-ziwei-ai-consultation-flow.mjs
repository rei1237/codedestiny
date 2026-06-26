import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(path, "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`[verify:ziwei-ai-consultation-flow] ${message}`);
  }
}

function extractFunction(source, marker) {
  const start = source.indexOf(marker);
  assert(start >= 0, `${marker} not found`);
  const braceStart = source.indexOf("{", start);
  assert(braceStart >= 0, `${marker} body not found`);
  let depth = 0;
  let quote = "";
  let escaped = false;
  for (let i = braceStart; i < source.length; i += 1) {
    const ch = source[i];
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === quote) {
        quote = "";
      }
      continue;
    }
    if (ch === "\"" || ch === "'" || ch === "`") {
      quote = ch;
      continue;
    }
    if (ch === "{") depth += 1;
    if (ch === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(`[verify:ziwei-ai-consultation-flow] ${marker} body did not close`);
}

const worker = read("worker/routes/ziwei-book.js");
assert(worker.includes("import { callGeminiText } from \"../lib/gemini.js\";"), "worker must reuse callGeminiText");
assert(worker.includes("ZIWEI_AI_CONSULTATION_ROUTE = \"/api/ziwei-book/ai-consultation\""), "worker route constant missing");
assert(worker.includes("[Ziwei AI Consultation]"), "server log marker missing");
assert(worker.includes("ziwei_ai_consultation"), "serviceType missing");
assert(worker.includes("handleZiweiAIConsultation"), "handler missing");
assert(worker.includes("paymentRetainedForRetry"), "LLM failure retry billing marker missing");

const ui = read("js/ziwei-book.js");
const generateBlock = extractFunction(ui, "window.generateZiweiBook = async function");
assert(ui.includes("var CONSULTATION_API = '/api/ziwei-book/ai-consultation';"), "consultation API constant missing");
assert(ui.includes("function postConsultation("), "postConsultation missing");
assert(ui.includes("function renderZiweiAIResult("), "AI result renderer missing");
assert(generateBlock.includes("postConsultation("), "generate flow must call postConsultation");
assert(!generateBlock.includes("postPrepare("), "generate flow must not call postPrepare");
assert(!generateBlock.includes("PdfRequestStart"), "generate flow must not emit PDF request marker");

const html = read("index.html");
assert(html.includes("ziwei-ai-consultation-v20260627"), "index marker missing");
assert(html.includes("/js/ziwei-book.js?v=20260627-ziwei-ai-consultation"), "index cache key missing");
assert(html.includes("자미두수 AI 상담"), "AI consultation title missing");
assert(html.includes("id=\"zbAiConsultFields\""), "consultation fields missing");
const cardStart = html.indexOf("data-ziwei-premium-card=\"ziwei-ai-consultation-v20260627\"");
const cardEnd = html.indexOf("</button>", cardStart);
const cardBlock = html.slice(cardStart, cardEnd);
assert(!/프리미엄 PDF|PDF 생성|PDF 다운로드|15챕터|챕터 구성/.test(cardBlock), "default premium card still contains PDF/chapter wording");
const modalStart = html.indexOf("id=\"ziweiBookModal\"");
const modalEnd = html.indexOf("<!-- 오류 화면 -->", modalStart);
const modalBlock = html.slice(modalStart, modalEnd);
assert(!/자미두수 프리미엄 PDF|PDF 생성|PDF 다운로드|PDF 조판|PDF로 저장하기|15챕터 구성/.test(modalBlock), "default modal still contains PDF wording");

const runtime = read("js/core/index-inline-runtime.js");
const bindings = read("js/core/uiBindings.js");
assert(runtime.includes("/js/ziwei-book.js?v=20260627-ziwei-ai-consultation"), "runtime cache key missing");
assert(bindings.includes("/js/ziwei-book.js?v=20260627-ziwei-ai-consultation"), "uiBindings cache key missing");

const sync = read("scripts/sync-legacy-static-to-public.mjs");
assert(sync.includes("ZIWEI_AI_CONSULTATION_CACHE_KEY"), "sync cache-key guard missing");
assert(sync.includes("20260627-ziwei-ai-consultation"), "sync cache-key value missing");

console.log("[verify:ziwei-ai-consultation-flow] ok");
