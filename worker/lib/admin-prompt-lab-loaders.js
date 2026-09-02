// 프롬프트 랩 조립기 로더 — 레지스트리 키 → 그 운세의 buildAdminLabPrompt.
//
// 편집 대상 선언은 lib/admin/prompt-lab-registry.mjs 하나뿐이다(순수 데이터라 관리자 UI 도 같이 읽는다).
// 이 파일은 그 키를 실제 함수에 잇기만 한다.
//
// 🔴 전부 동적 import 다. 무거운 라우트 모듈을 정적으로 붙들면 관리자 경로가 아닌 요청에서도
//    같이 끌려온다. 이 경로는 관리자 인증을 통과한 프롬프트 랩에서만 탄다.
//
// 🔴 여기서 프롬프트를 새로 쓰지 않는다. 각 모듈의 buildAdminLabPrompt 가 프로덕션 조립 함수를
//    그대로 부르는 것이 이 기능의 전제다 — 다르게 쓰면 랩이 거짓말을 하게 된다.

const LOADERS = {
  // ── 심층 리포트 ──
  "new-year": () => import("../routes/new-year-ai.js"),
  "karma-destiny": () => import("../routes/karma-destiny-ai.js"),
  "life-book": () => import("../routes/life-book-ai.js"),
  "ziwei-deep-report": () => import("./ziwei-deep-report-prompt.mjs"),
  "fusion-fortune": () => import("./fusion-fortune-prompt.js"),

  // ── 궁합 · 관계 ──
  "sukuyo-compatibility": () => import("../routes/sukuyo-compatibility-ai.js"),
  "master-love-codex": () => import("./master-love-codex-prompt.mjs"),
  "love-secret": () => import("./love-secret-ai-prompt.js"),

  // ── 특화 상담 ──
  "destiny-compass": () => import("../routes/destiny-compass.js"),
  "destiny-compass-report": () => import("./destiny-compass-report-contract.js"),
  "fortune-tea-house": () => import("../routes/fortune-tea-house.js"),
  "ziwei-island": () => import("./island/consult/palace-prompts.js"),
  nakshatra: () => import("./nakshatra-ai-prompt.js"),
  "neo-operation-room": () => import("./neo-operation-room-prompt.js"),
  "animal-totem": () => import("../routes/animal-totem.js"),
  "guardian-fortune": () => import("./guardian-fortune-prompt.js"),
  "human-design": () => import("./human-design-ai-prompt.js"),
  "human-design-report": () => import("./human-design-report-prompt.js"),
  dream: () => import("../routes/dream.js"),
  "pet-saju": () => import("../routes/pet-saju-ai.js"),
};

/** 레지스트리에 선언됐고 이 파일에 로더가 있는 키인지. 커버리지 가드가 읽는다. */
export function hasPromptLabLoader(key) {
  return Object.prototype.hasOwnProperty.call(LOADERS, String(key || ""));
}

export function listPromptLabLoaderKeys() {
  return Object.keys(LOADERS);
}

/**
 * 해당 운세의 프롬프트를 조립한다.
 * 반환 계약: { systemPrompt, prompt, partial?, partialReason?, variantKey?, variants?, notes? }
 * - partial: true 면 사용자 프롬프트를 만들 수 없어 시스템 프롬프트만 담겼다는 뜻이다.
 */
export async function buildPromptLabResult(key, body = {}, options = {}) {
  const loader = LOADERS[String(key || "")];
  if (!loader) {
    const error = new Error("지원하지 않는 운세입니다.");
    error.code = "INVALID_PROMPT_SERVICE";
    throw error;
  }

  const mod = await loader();
  if (typeof mod.buildAdminLabPrompt !== "function") {
    const error = new Error("이 운세는 아직 프롬프트 조립기를 노출하지 않습니다.");
    error.code = "PROMPT_LAB_BUILDER_MISSING";
    throw error;
  }

  const built = await mod.buildAdminLabPrompt(body, options);
  const systemPrompt = String(built?.systemPrompt || "");
  const prompt = String(built?.prompt || "");

  /* 질문을 받아 놓고 아무 데도 안 쓰면 운영자는 "입력했는데 왜 그대로지?" 만 남는다.
     기능마다 질문 슬롯이 있는지 다르므로(리포트·장 단위 기능은 아예 없다) 손으로 표시하지 않고
     실제 결과에 질문이 들어갔는지 보고 판정한다. 조립기를 늘려도 이 판정은 그대로 맞는다. */
  const askedQuestion = String(body?.question || "").trim();
  const questionUsed = Boolean(askedQuestion) && prompt.includes(askedQuestion);

  // 시스템·사용자 프롬프트가 모두 비면 화면에 보여 줄 것이 없다 — 조립 실패로 본다.
  if (!systemPrompt.trim() && !prompt.trim() && !Array.isArray(built?.variants)) {
    const error = new Error("프롬프트 본문을 만들지 못했습니다.");
    error.code = "PROMPT_BODY_EMPTY";
    throw error;
  }

  const notes = Array.isArray(built?.notes) ? [...built.notes] : [];
  if (askedQuestion && !questionUsed) {
    notes.push("이 기능의 프롬프트에는 질문이 그대로 실리지 않습니다 — 장·섹션 단위로 쓰거나(리포트형), 질문을 인용하지 않고 답변 방향만 잡도록 설계된 기능입니다.");
  }

  return {
    systemPrompt,
    prompt,
    partial: Boolean(built?.partial),
    partialReason: String(built?.partialReason || ""),
    variantKey: String(built?.variantKey || ""),
    variants: Array.isArray(built?.variants) ? built.variants : [],
    notes,
    questionUsed,
  };
}
