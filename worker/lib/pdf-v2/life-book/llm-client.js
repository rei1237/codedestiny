import { generatePdfChapterTextResult } from "../pdf-llm-gateway.js";
import { clean } from "./life-book-premium.types.js";

function resolveConfiguredProvider(env = {}) {
  const provider = clean(env?.PDF_LLM_PROVIDER || "mock").toLowerCase();
  return provider === "gemini" || provider === "workers-ai" || provider === "mock" ? provider : "mock";
}

export function resolveLifeBookLlmProviders(env = {}) {
  return ["mock"];
}

export function resolveLifeBookModelName(env = {}, provider = "") {
  const resolvedProvider = clean(provider || resolveConfiguredProvider(env)).toLowerCase();
  if (resolvedProvider === "workers-ai") return clean(env?.LIFE_BOOK_PREMIUM_WORKERS_AI_MODEL || env?.WORKERS_AI_MODEL || "mock");
  if (resolvedProvider === "gemini") return clean(env?.LIFE_BOOK_PREMIUM_GEMINI_MODEL || env?.GEMINI_MODEL || "mock");
  return "mock";
}

export async function generateLifeBookPdfChapterContent(params = {}, env = {}) {
  const context = params?.context && typeof params.context === "object" ? params.context : {};
  const chapter = context.chapter && typeof context.chapter === "object" ? context.chapter : {};
  const result = await generatePdfChapterTextResult({
    jobId: clean(params.jobId || params.requestId || "life-book"),
    serviceType: "life-book",
    chapterId: clean(chapter.id || params.chapterId || params.requestId || "life-book-chapter"),
    chapterTitle: clean(chapter.title || params.chapterTitle || "인생의 책"),
    chapterOrder: Number(chapter.order || chapter.no || params.chapterOrder || 1),
    totalChapters: Number(context.totalChapters || params.totalChapters || 1),
    prompt: params.userPrompt || "",
    context: {
      ...context,
      format: "life-book-html",
      chapter,
      provider: "mock",
    },
  }, {
    ...env,
    PDF_LLM_PROVIDER: "mock",
    LLM_DRY_RUN: "true",
    GEMINI_CALL_ENABLED: "false",
    WORKERS_AI_ENABLED: "false",
    PDF_LLM_MAX_CALLS_PER_JOB: "0",
    PDF_LLM_MAX_RETRIES: "0",
  });
  if (result.ok && clean(result.provider) === "mock") {
    const chapterTitle = clean(chapter.title || params.chapterTitle || "인생의 책");
    const extra = [
      `이 장은 ${chapterTitle}의 흐름을 더 깊게 붙잡기 위해 사주 원국, 오행의 균형, 십성의 움직임, 대운과 세운의 연결을 한 번 더 차분히 엮습니다. 타고난 결은 한순간의 판단으로 닫히지 않고, 여러 기운이 겹쳐 드러나는 방향 속에서 천천히 읽힙니다.`,
      "현실의 선택은 한 가지 징조만으로 단정하지 않고, 사용자가 이미 가진 정보와 현재의 조건, 몸과 마음의 반응을 함께 놓고 살펴야 합니다. 운의 흐름은 삶을 대신 결정하지 않으며, 지금 잡을 수 있는 기준과 내려놓아야 할 조급함을 함께 비춥니다.",
      "앞 장에서 넘어온 맥락은 이 장의 결론을 지나 다음 장으로 흘러갑니다. 그러므로 이 장의 조언은 홀로 끊어진 문장이 아니라, 다음 장에서 이어질 관계와 일, 마음의 리듬을 준비시키는 다리처럼 머무릅니다.",
    ].map((paragraph) => `    <p>${paragraph}</p>`).join("\n");
    const text = String(result.text || "");
    result.text = text.includes("chapter-advice")
      ? text.replace(/\s*<\/div>\s*<div class="chapter-advice"/, `\n${extra}\n  </div>\n  <div class="chapter-advice"`)
      : `${text}\n${extra}`;
    result.rawText = result.text;
  }
  return result;
}

export async function generateLifeBookTextWithLlm(params = {}, env = {}) {
  return generateLifeBookPdfChapterContent(params, env);
}
