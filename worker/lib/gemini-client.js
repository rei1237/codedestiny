import { callLLM } from "../../lib/llm-client.ts";
import { getAmbientAiLocale } from "./ai-locale-context.js";

function clean(value, maxLength = 0) {
  const text = String(value || "").trim();
  return maxLength > 0 ? text.slice(0, maxLength) : text;
}

function normalizeProvider(provider) {
  return provider === "cloudflare" ? "workers-ai" : provider;
}

// callLLM 게이트웨이의 대체 진입점(현재 프로덕션 호출자 없음, CLAUDE.md 문서화된 공개 래퍼).
export async function generateWithGemini(env, prompt, options = {}) {
  try {
    const result = await callLLM({
      prompt: clean(prompt),
      systemPrompt: clean(options.systemPrompt),
      locale: clean(options.locale) || getAmbientAiLocale() || undefined,
      maxTokens: Number(options.maxOutputTokens || options.maxTokens) || undefined,
      temperature: Number.isFinite(Number(options.temperature)) ? Number(options.temperature) : undefined,
      taskType: options.taskType || "pdf",
    }, env);

    return {
      ok: true,
      text: result.text,
      model: result.model,
      provider: normalizeProvider(result.provider),
    };
  } catch (error) {
    return {
      ok: false,
      error: clean(error?.code || "llm_failed"),
      message: clean(error?.message || error, 500),
      status: Number(error?.status || 0) || null,
    };
  }
}
