import { jsonSchemaFromExample } from "../lib/json-text-repair.js";
// 운명 구조도 — 결정론 문장 다듬기 라우트(무료·선택 보강). 정적 셸의 엔진·문구가 이미 완성한 문장을
// 고쳐 쓰기만 한다. 점수·회로·HD 타입·권위는 클라이언트가 결정론 값으로 그대로 그린다.
// 🔴 기본 꺼짐: ENABLE_DESTINY_ANATOMY_REAL_LLM 이 "true" 일 때만 LLM 을 부른다. 스테이징 [vars] 에만
//    "false" 로 선언돼 있고(verify-worker-config-parity STAGING_ONLY_KEYS), 프로덕션에는 키가 없다.
//    꺼져 있으면 DB·LLM 에 닿기 전에 즉시 돌려준다 — 화면은 결정론 문장을 그대로 둔다.
// 🔴 출생 정보·원국 글자는 받지 않는다. 지문(da1-…)과 이미 화면에 있는 문장만 받는다.
// 선례: worker/routes/destiny-compass.js(narrate) — 한도·예산·충실도 교정 구조를 그대로 따른다.

import { getRoutePath, json, methodNotAllowed, notFound, readJson, HttpError } from "../lib/http.js";
import { incrementRateLimit } from "../lib/rate-limit.js";
import { createHash } from "node:crypto";
import { callGeminiJsonWithRetry } from "../lib/structured-consultation.js";
import { getAmbientAiLocale } from "../lib/ai-locale-context.js";
import { createLlmCacheStore } from "../lib/llm-cache-store.js";

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 20;
const RATE_LIMIT_ENDPOINT = "destiny-anatomy:narrate";
// 아이솔레이트·IP 를 가리지 않는 전역 상한 — 분산 호출로 비용이 새지 않게 한다.
const GLOBAL_WINDOW_MS = 60 * 60 * 1000;
const GLOBAL_MAX_REQUESTS = 600;
const GLOBAL_SUBJECT = createHash("sha256").update("destiny-anatomy:global").digest("hex");
const requestBuckets = new Map();

// 클라이언트(js/core/saju/destiny-anatomy/boot.js)는 32초에 중단한다. 서버는 그보다 먼저 끝낸다.
export const DESTINY_ANATOMY_NARRATION_POLICY = Object.freeze({
  maxFaithfulnessAttempts: 2,
  providerChainTimeoutMs: 10_000,
  serverBudgetMs: 24_000,
});

// 문장 상한. 넘치면 거부하지 않고 문장 경계에서 자른다(LLM 안전 규칙: 형식 상한은 결정론 교정).
const LIMITS = Object.freeze({ mindLine: 220, insight: 360, minRatio: 0.4 });
const AXIS_IDS = new Set(["selfDrive", "expression", "reality", "structure", "reflection"]);

export function isDestinyAnatomyLlmEnabled(env) {
  return String(env?.ENABLE_DESTINY_ANATOMY_REAL_LLM || "").trim().toLowerCase() === "true";
}

function readClientKey(request) {
  return String(
    request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "local",
  ).slice(0, 160);
}

/** DB 가 죽었을 때만 쓰는 아이솔레이트 폴백 카운터. */
function checkLocalRateLimit(request) {
  const key = readClientKey(request);
  const now = Date.now();
  const current = requestBuckets.get(key);
  if (!current || current.resetAt <= now) {
    requestBuckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    if (requestBuckets.size > 512) {
      for (const [bucketKey, bucket] of requestBuckets) {
        if (bucket.resetAt <= now) requestBuckets.delete(bucketKey);
      }
    }
    return true;
  }
  if (current.count >= RATE_LIMIT_MAX_REQUESTS) return false;
  current.count += 1;
  return true;
}

async function checkRateLimit(request, env) {
  const ip = readClientKey(request);
  try {
    const own = await incrementRateLimit({
      subjectHash: createHash("sha256").update(ip).digest("hex"),
      endpoint: RATE_LIMIT_ENDPOINT,
      windowMs: RATE_LIMIT_WINDOW_MS,
      env,
    });
    if (own.count > RATE_LIMIT_MAX_REQUESTS) return false;
    const all = await incrementRateLimit({ subjectHash: GLOBAL_SUBJECT, endpoint: `${RATE_LIMIT_ENDPOINT}:global`, windowMs: GLOBAL_WINDOW_MS, env });
    return all.count <= GLOBAL_MAX_REQUESTS;
  } catch (error) {
    console.warn("[anatomy narrate] rate-limit increment failed", String(error?.message || error).slice(0, 200));
    return checkLocalRateLimit(request);
  }
}

function invalidInput(message) {
  return new HttpError(400, message, { error: "INVALID_INPUT" });
}

// 엄격한 입력 — 지문 형식·축 이름·문장 길이. 알 수 없는 키는 버린다(원국·출생 정보가 실려 와도 프롬프트에 닿지 않는다).
export function normalizeNarration(body) {
  const fingerprint = String(body?.fingerprint || "");
  if (!/^da1-[0-9a-f]{16}$/.test(fingerprint)) throw invalidInput("fingerprint 형식이 아닙니다.");
  const base = body?.base;
  if (!base || typeof base !== "object") throw invalidInput("base 문장이 필요합니다.");
  const text = (v, max) => {
    const s = String(v ?? "").replace(/\s+/g, " ").trim();
    if (s.length > max) throw invalidInput("문장이 너무 깁니다.");
    return s;
  };
  const mindLine = text(base.mindLine, LIMITS.mindLine);
  if (!mindLine) throw invalidInput("mindLine 이 필요합니다.");
  const insights = Array.isArray(base.insights) ? base.insights : [];
  if (insights.length > 3) throw invalidInput("insights 는 3개까지입니다.");
  const axes = Array.isArray(body?.axes) ? body.axes.filter((a) => AXIS_IDS.has(a)).slice(0, 5) : [];
  const names = Array.isArray(body?.names) ? body.names.slice(0, 5).map((n) => text(n, 24)).filter(Boolean) : [];
  return {
    fingerprint,
    axes,
    names,
    mindLine,
    insights: insights.map((i) => ({ title: text(i?.title, 80), body: text(i?.body, LIMITS.insight) })).filter((i) => i.body),
  };
}

function buildSystemPrompt() {
  return [
    "You polish short self-reflection copy for a free Korean fortune service section called Destiny Anatomy.",
    "SOURCE DATA IS AUTHORITATIVE. The base sentences were produced by a deterministic engine from the user's saju, Human Design and Vedic data.",
    "Your only job is to rewrite each base sentence so it reads warmer and more natural. Do not add new facts, new engine names, new Human Design types or authorities, new zodiac signs, numbers, dates or predictions.",
    "Keep every engine, type and authority name exactly as written in the base sentence.",
    "Write in the same language and the same politeness level as the base sentences.",
    "Never use medical, psychological-diagnosis, legal or investment language. Never state outcomes as certain or guaranteed.",
    "Return JSON only: {\"mindLine\": string, \"insights\": string[]} with exactly as many insights as given, in the same order.",
  ].join("\n");
}

export function buildNarrativePrompt(n, attempt = 0) {
  const lines = [];
  if (attempt > 0) lines.push("The previous attempt broke the rules (lost a name, changed the count, or added forbidden wording). Follow every rule this time.", "");
  if (n.names.length) lines.push(`Names that must stay exactly as written: ${n.names.join(", ")}`);
  lines.push(`mindLine (max ${LIMITS.mindLine} characters): ${n.mindLine}`);
  n.insights.forEach((i, k) => lines.push(`insight ${k + 1} [${i.title}] (max ${LIMITS.insight} characters): ${i.body}`));
  lines.push("", "JSON:");
  return lines.join("\n");
}

// 문장 경계에서 자른다. 경계가 없으면 글자 상한에서 자르고 말줄임표를 붙인다.
export function clipToSentence(text, max) {
  const s = String(text || "").replace(/\s+/g, " ").trim();
  if (s.length <= max) return s;
  const head = s.slice(0, max);
  const cut = Math.max(head.lastIndexOf(". "), head.lastIndexOf("。"), head.lastIndexOf("! "), head.lastIndexOf("? "), head.lastIndexOf("요. "));
  if (cut >= max * 0.5) return head.slice(0, cut + 1).trim();
  return head.slice(0, max - 1).trim() + "…";
}

// 한국어 금지어(의료·진단·확정 단정). 비-ko 는 영어만 따로 본다 — 다른 언어에서 ko 패턴은 의미가 없다.
const FORBIDDEN_KO = /진단|처방|질환|질병|장애|우울증|치료|약물|틀림없이|무조건|반드시\s*(성공|실패|이룬|잃)/;
const FORBIDDEN_EN = /\b(diagnos\w*|disorder|disease|prescri\w*|medication|therapy|guarantee\w*)\b/i;

function parseOutput(raw) {
  let t = String(raw || "").trim().replace(/^```[a-z]*\s*|\s*```$/gi, "");
  try {
    const j = JSON.parse(t);
    if (!j || typeof j !== "object") return null;
    return { mindLine: String(j.mindLine || ""), insights: Array.isArray(j.insights) ? j.insights.map((x) => String(x || "")) : [] };
  } catch {
    return null;
  }
}

// 충실도: 개수·최소 분량·금지어·(ko) 이름 보존. 상한 초과는 여기 오기 전에 잘라 둔다.
export function checkFaithful(out, n, locale) {
  if (!out || out.insights.length !== n.insights.length) return "count";
  const pieces = [[out.mindLine, n.mindLine], ...out.insights.map((x, k) => [x, n.insights[k].body])];
  for (const [text, base] of pieces) {
    if (text.replace(/\s+/g, "").length < Math.max(12, base.replace(/\s+/g, "").length * LIMITS.minRatio)) return "short";
  }
  const joined = pieces.map(([text]) => text).join("\n");
  if (locale === "en" && FORBIDDEN_EN.test(joined)) return "forbidden";
  if ((locale || "ko") !== "ko") return "";
  if (FORBIDDEN_KO.test(joined)) return "forbidden";
  for (const [text, base] of pieces) {
    for (const name of n.names) if (base.includes(name) && !text.includes(name)) return "name";
  }
  return "";
}

async function handleNarrate(request, env) {
  const n = normalizeNarration(await readJson(request));
  const locale = getAmbientAiLocale() || "ko";
  const store = createLlmCacheStore(env);
  const systemPrompt = buildSystemPrompt();
  const deadlineAt = Date.now() + DESTINY_ANATOMY_NARRATION_POLICY.serverBudgetMs;
  for (let attempt = 0; attempt < DESTINY_ANATOMY_NARRATION_POLICY.maxFaithfulnessAttempts; attempt += 1) {
    const remainingMs = deadlineAt - Date.now();
    if (remainingMs <= 0) break;
    let ai = null;
    try {
      ai = await callGeminiJsonWithRetry(env, buildNarrativePrompt(n, attempt), {
        systemPrompt,
        taskType: "general",
        responseSchema: jsonSchemaFromExample({ mindLine: "", insights: [""] }),
        temperature: 0.5,
        timeoutMs: Math.min(DESTINY_ANATOMY_NARRATION_POLICY.providerChainTimeoutMs, remainingMs),
        attempts: 1,
        // 상한(220 + 360×3 자) + JSON 머리말 + thinking 여유.
        baseTokens: 2400,
        capTokens: 3600,
        fallbackToWorkersAI: true,
        cache: { store, deterministic: true, ttlSeconds: 30 * 24 * 60 * 60, keyExtra: `da-v1:${n.fingerprint}:${locale}:a${attempt}` },
      });
    } catch (error) {
      console.warn("[anatomy narrate] threw", String(error?.message || error).slice(0, 300));
      ai = null;
    }
    if (!ai?.ok) {
      console.warn("[anatomy narrate] llm_failed", { attempt, error: ai?.error || "", status: ai?.status ?? null, message: String(ai?.message || "").slice(0, 300) });
      continue;
    }
    // 스테이징 mock 응답은 문장으로 쓰지 않는다 — 결정론 문장이 더 정확하다.
    if (/mock/i.test(String(ai.provider || "")) || ai.isMock === true) {
      return json({ ok: false, source: "deterministic", error: "MOCK_PROVIDER" });
    }
    const parsed = parseOutput(ai.text);
    const out = parsed && {
      mindLine: clipToSentence(parsed.mindLine, LIMITS.mindLine),
      insights: parsed.insights.map((x) => clipToSentence(x, LIMITS.insight)),
    };
    const reason = checkFaithful(out, n, locale);
    if (!reason) {
      return json({ ok: true, source: "llm", mindLine: out.mindLine, insights: out.insights, provider: ai.provider || "gemini" });
    }
    console.warn("[anatomy narrate] unfaithful", { attempt, locale, reason, provider: ai.provider || "" });
  }
  return json({ ok: false, source: "deterministic", error: "NARRATION_UNFAITHFUL" });
}

function routeError(error) {
  if (error instanceof HttpError) {
    return json({ ok: false, error: error.payload?.error || "BAD_REQUEST", message: error.message }, { status: error.status });
  }
  return json({ ok: false, error: "INTERNAL", message: "잠시 후 다시 시도해 주세요." }, { status: 500 });
}

export async function handleDestinyAnatomyRoutes(request, env) {
  try {
    const path = getRoutePath(request, "/api/destiny-anatomy");
    const method = request.method.toUpperCase();
    if (method === "OPTIONS") return new Response(null, { status: 204 });
    if (path === "/narrate") {
      if (method !== "POST") return methodNotAllowed();
      if (!isDestinyAnatomyLlmEnabled(env)) return json({ ok: false, source: "deterministic", error: "DISABLED" });
      if (!(await checkRateLimit(request, env))) {
        return json({ ok: false, error: "RATE_LIMITED", message: "잠시 후 다시 시도해 주세요." }, { status: 429, headers: { "Retry-After": "60" } });
      }
      return await handleNarrate(request, env);
    }
    return notFound();
  } catch (error) {
    return routeError(error);
  }
}
