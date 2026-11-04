import { selectGeminiModel } from "../../lib/gemini-model-policy.js";
import { getAmbientAiLocale } from "./ai-locale-context.js";
import { getEnv } from "./env.js";
import { createGeminiContextCache, restoreGeminiContextCache } from "./gemini.js";
import { createLlmCacheStore } from "./llm-cache-store.js";
import { getPaidGenerationContext } from "./paid-generation-context.js";

const MIN_PREFIX_CHARS = 4000;
const CACHE_TTL_SECONDS = 600;
const RECORD_TTL_SECONDS = 1800;
// Gemini checks the handle when the request arrives, so a minute of life is enough for the call.
const MIN_HANDLE_LIFE_MS = 60_000;
const CREATE_TIMEOUT_MS = 5000;
// Delivery owns the clock: a slow store or create gives up the discount, never the attempt.
const PREPARE_LIMIT_MS = 6000;
const NO_CACHE = Object.freeze({ cache: undefined, spentMs: 0 });

async function recordKey(input, model, locale) {
  const source = JSON.stringify([input.scope, model, locale, input.outputRegister || "", input.systemPrompt || "", input.prefix]);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(source));
  return `context-cache-v1:${[...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

function parseRecord(value) {
  try { return value?.text ? JSON.parse(value.text) : null; } catch { return null; }
}

async function prepare(env, input) {
  const model = selectGeminiModel(input.model, input.reasoningTask);
  const locale = String(input.locale || getAmbientAiLocale() || "");
  const shared = { prefix: input.prefix, systemPrompt: input.systemPrompt, locale, outputRegister: input.outputRegister };
  const store = createLlmCacheStore(env);
  const key = await recordKey(input, model, locale);
  const record = parseRecord(await store.get(key));
  if (!record) {
    // One call on this prefix cannot pay for a cache, so the first sighting only remembers it.
    await store.set(key, { text: JSON.stringify({ seen: true }) }, RECORD_TTL_SECONDS);
    return undefined;
  }
  if (record.name && Number(record.expiresAt) - Date.now() > MIN_HANDLE_LIFE_MS) {
    return restoreGeminiContextCache({ ...shared, name: record.name });
  }
  const created = await createGeminiContextCache(env, {
    ...shared, model: input.model, reasoningTask: input.reasoningTask,
    ttlSeconds: CACHE_TTL_SECONDS, timeoutMs: CREATE_TIMEOUT_MS,
  });
  if (!created) return undefined;
  await store.set(key, { text: JSON.stringify({ name: created.name, expiresAt: Date.now() + CACHE_TTL_SECONDS * 1000 }) }, RECORD_TTL_SECONDS);
  return created;
}

/**
 * For reports whose parts span separate requests or queue messages. The handle lives in the
 * response-cache collection, outside the order and its delivery state, and any failure means a
 * plain call. A retry never uses it, so a cache fault cannot fail the same part twice.
 *
 * Pass the exact prompt about to be sent: a prefix it does not start with is never cached.
 * Returns the handle plus the time spent, which the caller takes out of a tight attempt budget.
 */
export async function resumableContextCache(env, input) {
  const { scope, attempt, prefix, prompt } = input;
  if (!scope || typeof prefix !== "string" || prefix.length < MIN_PREFIX_CHARS) return NO_CACHE;
  if (typeof prompt !== "string" || !prompt.startsWith(prefix) || Number(attempt) > 1) return NO_CACHE;
  if (["0", "false", "off"].includes(String(getEnv(env, "GEMINI_CONTEXT_CACHE") || "").trim().toLowerCase())) return NO_CACHE;
  const startedAt = Date.now();
  let timer;
  try {
    const cache = await Promise.race([
      prepare(env, input),
      new Promise((resolve) => { timer = setTimeout(() => resolve(undefined), PREPARE_LIMIT_MS); }),
    ]);
    return { cache: cache || undefined, spentMs: Date.now() - startedAt };
  } catch (error) {
    console.warn("[context-cache] prepare failed", error?.name || "unknown");
    return { cache: undefined, spentMs: Date.now() - startedAt };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * The options a paid route spreads into its provider call. Scope and attempt come from the paid
 * generation context unless the route has its own; a call that knows neither stays plain.
 */
export async function contextCacheOptions(env, { timeoutMs, ...input }) {
  const context = getPaidGenerationContext();
  const scope = input.scope ?? (context?.requestId ? [context.requestId] : undefined);
  const attempt = input.attempt ?? context?.attempt;
  if (!Number.isInteger(attempt)) return { timeoutMs };
  const { cache, spentMs } = await resumableContextCache(env, { ...input, scope, attempt });
  return { ...(cache ? { geminiCachedContent: cache } : {}), timeoutMs: timeoutMs - spentMs };
}
