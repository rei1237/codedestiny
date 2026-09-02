// AI 프롬프트의 CMS 오버라이드 리더.
//
// 사용법은 한 줄이다. 각 프롬프트 빌더가 만들던 문자열을 그대로 fallback 으로 넘긴다:
//   const systemPrompt = await cmsPromptText(env, "astrology-ai", buildSystemPrompt());
//
// 설계 원칙 두 가지.
//   1) 절대 던지지 않는다. 프롬프트 조회 실패가 AI 상담 자체를 죽이면 안 된다. 실패 = 코드 기본값.
//   2) 절대 오래 붙잡지 않는다. Mongo 가 느린 순간에 LLM 요청 앞단에 12초를 얹으면
//      멀쩡하던 유료 기능이 타임아웃난다. 그래서 재시도 0회 + 1.5초 시도 상한으로 읽는다
//      (새 타임아웃 계층을 덧씌우는 게 아니라 withMongoRetry 의 옵션을 좁히는 것 — 코딩 원칙 6).
import { connectDb, withMongoRetry } from "./db.js";
import { CmsEntry } from "./models.js";
import { readCmsThroughCache } from "./cms-cache.js";
import { buildCmsPublicStatusQuery } from "./cms-status.js";
import { setPromptTemplateOverrides } from "./cms-prompt-template-store.js";

const PROMPT_NAMESPACES = ["prompt.system", "prompt.domain"];
const PROMPT_CACHE_KEY = "cms-prompt-overrides:ko";
const PROMPT_CACHE_TTL_SECONDS = 60;
const PROMPT_READ_TIMEOUT_MS = 1500;

async function loadPromptOverrides(env) {
  try {
    const { value } = await readCmsThroughCache({
      key: PROMPT_CACHE_KEY,
      ttlSeconds: PROMPT_CACHE_TTL_SECONDS,
      staleTtlSeconds: 3600,
      load: async () => {
        await connectDb(env);
        const docs = await withMongoRetry(
          env,
          async () => CmsEntry.find({
            namespace: { $in: PROMPT_NAMESPACES },
            locale: "ko",
            ...buildCmsPublicStatusQuery(),
          }).limit(500).lean(),
          { retries: 0, attemptTimeoutMS: PROMPT_READ_TIMEOUT_MS },
        );

        const grouped = {};
        for (const doc of docs) {
          const ns = String(doc?.namespace || "");
          const key = String(doc?.key || "");
          if (!ns || !key) continue;
          if (!grouped[ns]) grouped[ns] = {};
          grouped[ns][key] = doc?.fields && typeof doc.fields === "object" ? doc.fields : {};
        }
        return grouped;
      },
    });
    // 분야별 템플릿은 동기 접근자(getSajuPromptTemplate 등) 깊숙한 곳에서 읽히므로
    // 여기서 보관소에 실어 둔다. 이후 같은 아이솔레이트의 접근자 호출이 오버라이드를 본다.
    setPromptTemplateOverrides(value?.["prompt.domain"] || {});
    return value || {};
  } catch (e) {
    // 조회 실패 = 오버라이드 없음. 호출부는 코드 기본값을 그대로 쓴다.
    // 🔴 보관소도 함께 비운다. 이게 없으면 시스템 프롬프트는 코드 기본값으로 돌아가는데
    // 도메인 템플릿만 아이솔레이트에 남은 옛 오버라이드를 계속 써서, 한 번의 생성 안에서
    // 서로 다른 세대의 프롬프트가 섞인다.
    setPromptTemplateOverrides({});
    return {};
  }
}

/**
 * 분야별 템플릿 오버라이드를 프롬프트 빌드 전에 미리 채운다.
 * 시스템 프롬프트는 LLM 호출 직전에 해소되는데, 도메인 템플릿은 그보다 먼저 읽히기 때문에
 * 도메인 프롬프트를 쓰는 라우트는 빌드 전에 이 함수를 한 번 불러 준다.
 */
export async function primePromptTemplateOverrides(env) {
  await loadPromptOverrides(env);
}

/** 시스템 프롬프트 본문. 오버라이드가 없으면 fallback 을 그대로 돌려준다. */
export async function cmsPromptText(env, key, fallback) {
  const overrides = await loadPromptOverrides(env);
  const text = overrides?.["prompt.system"]?.[String(key)]?.text;
  return typeof text === "string" && text.trim() ? text : fallback;
}

/**
 * CMS 필드에서 숫자를 읽는다. 숫자와 비어 있지 않은 문자열만 값으로 친다.
 *
 * 🔴 `Number.isFinite(Number(v))` 로 바로 재면 안 된다. 관리자가 칸을 비워 두면 필드가 빈 문자열로
 * 저장되는데 `Number("")` 는 0 이라, "지정 안 함"이 "온도 0"(같은 답만 나오는 결정론 생성)이 된다.
 * `null`·`[]`·`true` 도 같은 함정이다.
 */
function finiteFieldNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim()) {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  }
  return null;
}

/** 모델 파라미터 오버라이드. 지정되지 않은 값은 키 자체를 빼서 호출부 기본값이 살아있게 한다. */
export async function cmsPromptConfig(env, key) {
  const overrides = await loadPromptOverrides(env);
  const fields = overrides?.["prompt.system"]?.[String(key)] || {};
  const config = {};

  const temperature = finiteFieldNumber(fields.temperature);
  const topP = finiteFieldNumber(fields.topP);
  const maxTokens = finiteFieldNumber(fields.maxTokens);
  if (temperature !== null) config.temperature = temperature;
  if (topP !== null) config.topP = topP;
  if (maxTokens !== null) config.maxTokens = maxTokens;

  return config;
}

/**
 * 온도의 허용 범위. Gemini 는 2까지 받지만 1.2 위는 상담문이 사실 관계를 놓치기 시작한다 —
 * 유료 상담에서 그 구간을 관리자가 실수로 고를 수 있게 두지 않는다.
 */
export const PROMPT_TEMPERATURE_MIN = 0;
export const PROMPT_TEMPERATURE_MAX = 1.2;

function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/**
 * CMS 모델 파라미터 오버라이드를 라우트가 견딜 수 있는 범위로 자른다.
 *
 * 🔴 클램프 없이 배선하면 관리자 한 번의 오타가 유료 생성을 통째로 망가뜨린다. 두 방향 다 사고다:
 *   · 토큰을 낮추면 요구 분량을 못 채워 잘린 결과가 정상 결제로 배달된다.
 *   · 토큰을 올리면 생성이 라우트 타임아웃(동기 생성은 엣지 100초)을 넘겨 결제만 남고 결과가 없다.
 * 그래서 토큰은 [계약 하한, 코드 기본값] 안에서만 움직인다. 위쪽을 코드 기본값으로 막는 이유는
 * 그 값이 각 라우트의 타임아웃에 맞춰 고른 수라서다 — 그 위는 코드가 검증한 적 없는 구간이다.
 *
 * 🔴 topP 는 돌려주지 않는다. callGeminiText 가 읽지 않는 옵션이라 넘겨도 조용히 버려지는데,
 * 그걸 배선하면 관리자 화면에서는 값이 걸린 것처럼 보인다. 같은 함정을 두 라우트가 이미 밟고
 * 지웠다(worker/routes/oracle.js:165 · worker/routes/yoga-guru.js:355 의 주석). 프로바이더가
 * topP 를 읽게 되는 날 이 함수에 한 줄 더하면 세 라우트가 동시에 따라온다.
 *
 * @param {{temperature?: number, topP?: number, maxTokens?: number}} config cmsPromptConfig 결과
 * @param {{minTokens: number, maxTokens: number}} limits 그 호출의 계약 하한 · 코드 기본값
 * @returns {{temperature?: number, maxOutputTokens?: number}} 지정되지 않은 값은 키 자체를 뺀다
 */
export function clampPromptModelConfig(config = {}, limits = {}) {
  const minTokens = finiteFieldNumber(limits?.minTokens);
  const maxTokens = finiteFieldNumber(limits?.maxTokens);
  const temperature = finiteFieldNumber(config?.temperature);
  const requestedTokens = finiteFieldNumber(config?.maxTokens);
  const resolved = {};

  if (temperature !== null) {
    resolved.temperature = clampNumber(temperature, PROMPT_TEMPERATURE_MIN, PROMPT_TEMPERATURE_MAX);
  }
  // 밴드가 없거나 하한이 코드 기본값보다 크면(계약이 기본값보다 큰 예산을 요구하면) 범위가 뒤집힌다.
  // 그때는 오버라이드를 통째로 버린다 — 뒤집힌 범위에서 고른 값은 어느 쪽 계약도 지키지 못한다.
  if (requestedTokens !== null && minTokens !== null && maxTokens !== null && minTokens <= maxTokens) {
    resolved.maxOutputTokens = Math.round(clampNumber(requestedTokens, minTokens, maxTokens));
  }

  return resolved;
}

/**
 * 모델 파라미터 오버라이드를 읽어 그 자리에서 클램프한다. 라우트는 이 함수만 부른다 —
 * cmsPromptConfig 를 직접 부르면 클램프를 건너뛰게 되므로 호출부를 여기 하나로 모은다.
 */
export async function cmsPromptModelConfig(env, key, limits) {
  return clampPromptModelConfig(await cmsPromptConfig(env, key), limits);
}

/**
 * 분야별 템플릿 오버라이드를 코드 템플릿 위에 병합한다.
 * key 는 "saju:love" 처럼 `체계:도메인` 형식.
 */
export async function cmsPromptDomain(env, key, fallbackTemplate) {
  const overrides = await loadPromptOverrides(env);
  const fields = overrides?.["prompt.domain"]?.[String(key)];
  if (!fields) return fallbackTemplate;

  const merged = { ...fallbackTemplate };
  if (typeof fields.title === "string" && fields.title.trim()) merged.title = fields.title;
  if (Array.isArray(fields.analysisAngles) && fields.analysisAngles.length) merged.analysisAngles = fields.analysisAngles;
  if (Array.isArray(fields.questionPatterns) && fields.questionPatterns.length) merged.questionPatterns = fields.questionPatterns;

  return merged;
}

/** 발행 직후 관리자 요청 컨텍스트에서 캐시를 미리 채워, 다음 AI 요청이 곧바로 새 값을 쓰게 한다. */
export async function warmPromptOverrides(env) {
  await loadPromptOverrides(env);
}
