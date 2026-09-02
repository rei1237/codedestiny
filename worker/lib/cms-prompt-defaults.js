// 관리자 CMS 가 보여줄 "코드에 있는 기본값" 카탈로그.
//
// 프롬프트 원문은 여전히 각 라우트/라이브러리 안에 있다(폴백 우선 — 코드에서 지우지 않는다).
// 이 모듈은 그것들을 한 곳에서 열거하고, 관리자 화면이 기본값을 볼 수 있게 읽어 오기만 한다.
//
// 무거운 라우트 모듈을 정적으로 붙들지 않으려고 전부 동적 import 로 가져온다.
// 이 경로는 관리자 "기본값 불러오기" 에서만 타므로 공개 트래픽에는 영향이 없다.

/** prompt.system — 각 AI 상담의 최상위 지시문. */
const SYSTEM_PROMPT_SOURCES = [
  {
    key: "astrology-ai",
    label: "점성술 AI 상담",
    service: "서양 점성술",
    load: async () => (await import("../routes/astrology-ai.js")).getDefaultSystemPrompt(),
  },
  {
    key: "ziwei-ai",
    label: "자미두수 AI 상담",
    service: "자미두수",
    load: async () => (await import("../routes/ziwei-ai.js")).getDefaultSystemPrompt(),
  },
  {
    key: "destiny-compass",
    label: "운명의 지도 (꽃돼지 해설)",
    service: "운명의 지도",
    load: async () => (await import("../routes/destiny-compass.js")).getDefaultSystemPrompt(),
  },
  {
    key: "destiny-compass-report",
    label: "운명의 지도 심층 리포트 (9섹션)",
    service: "운명의 지도",
    load: async () => (await import("./destiny-compass-report-contract.js")).buildCompassSystemPrompt(),
  },
  {
    key: "saju-ai-result",
    label: "사주 AI 결과 해설",
    service: "사주",
    load: async () => (await import("../routes/fortune.js")).getDefaultSajuAiResultSystemPrompt(),
  },
  {
    key: "feature-ai-result",
    label: "기능 공통 AI 결과 해설",
    service: "공통",
    load: async () => (await import("../routes/fortune.js")).getDefaultFeatureAiResultSystemPrompt(),
  },
  {
    key: "love-secret-ai",
    label: "연애 비밀 AI",
    service: "연애",
    load: async () => (await import("./love-secret-ai-prompt.js")).LOVE_SECRET_AI_SYSTEM_PROMPT,
  },
  {
    key: "sukuyo-compatibility",
    label: "숙요 궁합 AI 상담",
    service: "숙요",
    load: async () => (await import("../routes/sukuyo-compatibility-ai.js")).getDefaultSystemPrompt(),
  },
  {
    key: "sukuyo-compatibility-json",
    label: "숙요 궁합 AI (구조화 출력)",
    service: "숙요",
    load: async () => (await import("../routes/sukuyo-compatibility-ai.js")).getDefaultCompatibilityJsonSystemPrompt(),
  },
  // sukuyo.js 의 SUKYO_COMPAT_AI_SYSTEM_PROMPT 는 선언만 있고 호출부가 없다(데드코드).
  // 편집해도 서비스에 영향이 없으므로 일부러 목록에서 뺀다 — 상수 자체는 손대지 않았다.
  {
    key: "vedic-ai",
    label: "베다 점성술 AI 상담",
    service: "베다",
    load: async () => (await import("../routes/vedic-ai.js")).getDefaultSystemPrompt(),
  },
  {
    key: "animal-totem",
    label: "동물 토템 AI 상담",
    service: "동물 토템",
    load: async () => (await import("../routes/animal-totem.js")).getDefaultSystemPrompt(),
  },
];

/** prompt.domain — 체계별 × 분야별 분석 관점/예시 질문. 키는 `체계:도메인`. */
const DOMAIN_TEMPLATE_SOURCES = [
  { system: "saju", label: "사주", load: async () => (await import("./saju-ai-prompt-templates.mjs")).SAJU_PROMPT_TEMPLATES },
  { system: "vedic", label: "베다", load: async () => (await import("./vedic-ai-prompt-templates.mjs")).VEDIC_PROMPT_TEMPLATES },
  { system: "sukuyo", label: "숙요", load: async () => (await import("./sukuyo-ai-prompt-templates.mjs")).SUKUYO_PROMPT_TEMPLATES },
  { system: "astrology", label: "점성술", load: async () => (await import("./astrology-ai-prompt-templates.mjs")).ASTROLOGY_PROMPT_TEMPLATES },
  { system: "ziwei", label: "자미두수", load: async () => (await import("./ziwei-ai-prompt-templates.mjs")).ZIWEI_PROMPT_TEMPLATES },
];

/** 목록만 필요한 곳(관리자 좌측 목록)에서 쓰는 가벼운 카탈로그. 본문은 읽지 않는다. */
export function listPromptCatalog(ns) {
  if (ns === "prompt.system") {
    return SYSTEM_PROMPT_SOURCES.map((item) => ({ key: item.key, label: item.label, service: item.service }));
  }
  if (ns === "prompt.domain") {
    // 도메인 키 목록은 템플릿을 실제로 열어야 알 수 있어 여기서는 체계만 알려준다.
    return DOMAIN_TEMPLATE_SOURCES.map((item) => ({ key: `${item.system}:*`, label: item.label, service: item.label }));
  }
  return [];
}

async function loadSystemPromptDefaults() {
  const defaults = {};

  await Promise.all(SYSTEM_PROMPT_SOURCES.map(async (item) => {
    try {
      const text = await item.load();
      if (typeof text === "string" && text.trim()) {
        defaults[item.key] = { label: item.label, service: item.service, fields: { text } };
      }
    } catch (e) {
      // 한 프롬프트를 못 읽어도 나머지는 편집할 수 있어야 한다.
      defaults[item.key] = { label: item.label, service: item.service, fields: {}, unavailable: true };
    }
  }));

  return defaults;
}

async function loadDomainTemplateDefaults() {
  const defaults = {};

  await Promise.all(DOMAIN_TEMPLATE_SOURCES.map(async (source) => {
    try {
      const templates = await source.load();
      for (const [domain, template] of Object.entries(templates || {})) {
        defaults[`${source.system}:${domain}`] = {
          label: `${source.label} · ${template?.domainKo || domain}`,
          service: source.label,
          fields: {
            title: String(template?.title || ""),
            analysisAngles: Array.isArray(template?.analysisAngles) ? template.analysisAngles : [],
            questionPatterns: Array.isArray(template?.questionPatterns) ? template.questionPatterns : [],
          },
        };
      }
    } catch (e) {
      // 한 체계를 못 읽어도 나머지는 편집할 수 있어야 한다.
    }
  }));

  return defaults;
}

/** 관리자 화면이 기본값을 채울 때 호출한다. `{ key: { label, service, fields } }` */
export async function listPromptDefaults(ns) {
  if (ns === "prompt.system") return loadSystemPromptDefaults();
  if (ns === "prompt.domain") return loadDomainTemplateDefaults();
  return {};
}
