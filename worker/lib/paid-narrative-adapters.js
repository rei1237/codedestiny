// Server resume adapters for executions created by runPaidNarrativeDelivery.
// A key is featureKey|reportType because expert follow-ups reuse their parent
// feature keys. Pairs not listed here return null and the recovery task skips
// them (fail-closed), so a new paid narrative product stays browser-only until
// it is added here with its adapter.
const SERVER_RESUME_PRODUCTS = Object.freeze({
  expertFollowUp: ["karma-destiny-ai-consultation", "love-secret-ai-consultation"],
  featureQuestionConsultation: ["astrology_ai_prompt_generator", "ziwei_ai_prompt_generator", "sukuyo_ai_prompt_generator", "vedic_ai_prompt_generator"],
  guardianPaidTurn: ["fortune-chat-consultation"],
  loveTarot: ["tarot-love-relationship"],
  mindscan: ["tarot-mindscan"],
  tarotOracleConsultation: ["tarot-prompt-maker", "tarot-prompt-maker-standard", "tarot-prompt-maker-deep", "tarot-prompt-maker-master"],
  geomancyOracle: ["geomancy"],
  yogaGuruCourse: ["yoga-guru-per-use"],
  dreamPsychoAnalysis: ["dream-psycho-analysis"],
  petSajuReport: ["pet-saju-ai-consultation"],
  petCompatReport: ["pet-compatibility-ai"],
  "animal-totem": ["animal-totem-basic", "animal-totem-deep"],
});

export const PAID_NARRATIVE_SERVER_RESUME_KEYS = Object.freeze(Object.entries(SERVER_RESUME_PRODUCTS)
  .flatMap(([reportType, featureKeys]) => featureKeys.map(featureKey => `${featureKey}|${reportType}`)));

// Completed follow-up answers are attached by the normal consultation GET.
export const PAID_NARRATIVE_SERVER_RESUME_EXCLUSIONS = Object.freeze({});

export const PAID_NARRATIVE_SERVER_RESUME_FEATURE_KEYS = Object.freeze(Object.values(SERVER_RESUME_PRODUCTS).flat());
export const PAID_NARRATIVE_SERVER_RESUME_REPORT_TYPES = Object.freeze(Object.keys(SERVER_RESUME_PRODUCTS));

export async function loadPaidNarrativeAdapter(env, featureKey, reportType, userId) {
  if (!PAID_NARRATIVE_SERVER_RESUME_KEYS.includes(`${featureKey}|${reportType}`)) return null;
  switch (reportType) {
    case "expertFollowUp": {
      const route = featureKey === "karma-destiny-ai-consultation"
        ? await import('../routes/karma-destiny-ai.js') : await import('../routes/love-secret-ai.js');
      return route.serverExpertFollowUpAdapter(env);
    }
    case "featureQuestionConsultation": {
      const { featureQuestionNarrativeAdapter } = await import("./feature-question-delivery.js");
      return featureQuestionNarrativeAdapter(env, featureKey);
    }
    case "guardianPaidTurn": {
      // The route refuses paid turns while the real model is off; a resume
      // would only spend the stored attempts on a null result.
      const { shouldUseRealGuardianFortuneLLM } = await import("./guardian-fortune-llm-policy.js");
      if (String(env.NODE_ENV).toLowerCase() !== "test" && !shouldUseRealGuardianFortuneLLM({ env, userId })) return null;
      const { guardianNarrativeAdapter } = await import("./guardian-paid-delivery.js");
      return guardianNarrativeAdapter(env, userId);
    }
    case "loveTarot": {
      const { loveTarotNarrativeAdapter } = await import("./love-tarot-delivery.js");
      return loveTarotNarrativeAdapter(env);
    }
    case "mindscan": {
      const { mindscanNarrativeAdapter } = await import("./mindscan-delivery.js");
      return mindscanNarrativeAdapter(env);
    }
    case "tarotOracleConsultation": {
      const { tarotOracleNarrativeAdapter } = await import("./tarot-oracle-delivery.js");
      return tarotOracleNarrativeAdapter(env);
    }
    case "geomancyOracle": {
      const { geomancyNarrativeAdapter } = await import("../routes/oracle.js");
      return geomancyNarrativeAdapter(env);
    }
    case "yogaGuruCourse": {
      const { yogaNarrativeAdapter } = await import("../routes/yoga-guru.js");
      return yogaNarrativeAdapter(env);
    }
    case "dreamPsychoAnalysis": {
      const { dreamPsychoNarrativeAdapter } = await import("../routes/dream.js");
      return dreamPsychoNarrativeAdapter(env);
    }
    case "petSajuReport":
    case "petCompatReport": {
      const { petNarrativeAdapter } = await import("../routes/pet-saju-ai.js");
      return petNarrativeAdapter(env, reportType);
    }
    case "animal-totem": {
      const { animalTotemNarrativeAdapter } = await import("../routes/animal-totem.js");
      return animalTotemNarrativeAdapter(env);
    }
    default:
      return null;
  }
}
