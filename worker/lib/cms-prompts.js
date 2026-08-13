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

/** 모델 파라미터 오버라이드. 지정되지 않은 값은 키 자체를 빼서 호출부 기본값이 살아있게 한다. */
export async function cmsPromptConfig(env, key) {
  const overrides = await loadPromptOverrides(env);
  const fields = overrides?.["prompt.system"]?.[String(key)] || {};
  const config = {};

  if (Number.isFinite(Number(fields.temperature))) config.temperature = Number(fields.temperature);
  if (Number.isFinite(Number(fields.topP))) config.topP = Number(fields.topP);
  if (Number.isFinite(Number(fields.maxTokens))) config.maxTokens = Number(fields.maxTokens);

  return config;
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
