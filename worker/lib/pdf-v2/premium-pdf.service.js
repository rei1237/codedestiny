import { getPremiumPdfV2ChapterPlan } from "./chapter-plans.js";
import {
  validateChapterData,
  removeRepeatedParagraphs,
  validateGeneratedChapterText,
} from "./validation.js";

function nowIso() {
  return new Date().toISOString();
}

function asErrorMessage(error, fallback = "Unexpected error") {
  if (error?.message) return String(error.message);
  return fallback;
}

async function pushStatus(deps, payload) {
  if (typeof deps?.updateJobStatus !== "function") return;
  await deps.updateJobStatus({
    at: nowIso(),
    ...payload,
  });
}

function normalizeResultBase(params, pricing, jobId) {
  return {
    jobId,
    userId: String(params?.userId || ""),
    pdfType: String(params?.pdfType || ""),
    featureKey: String(params?.featureKey || pricing?.featureKey || ""),
    priceCoins: Number(pricing?.priceCoins || 0),
  };
}

function buildChapterDataBrief(normalizedData = {}) {
  const entries = Object.entries(normalizedData || {})
    .filter(([, value]) => value != null && value !== "")
    .slice(0, 6)
    .map(([key, value]) => {
      const compact = typeof value === "string"
        ? value.replace(/\s+/g, " ").trim().slice(0, 80)
        : JSON.stringify(value).slice(0, 80);
      return `- ${key}: ${compact}`;
    });
  return entries.length ? entries.join("\n") : "- 핵심 계산 데이터: 표준 해석 프레임으로 통합";
}

function buildProfessionalFallbackChapter(chapter = {}, params = {}, normalizedData = {}) {
  const title = String(chapter?.title || `Chapter ${chapter?.chapterId || ""}`).trim();
  const chapterId = Number(chapter?.chapterId || 1);
  const typeLabel = String(params?.pdfType || "premium");
  const dataBrief = buildChapterDataBrief(normalizedData);

  return [
    `## ${title}`,
    "",
    "### 1. 핵심 진단",
    `${typeLabel} 리포트 ${chapterId}장에서는 현재 계산된 지표를 행동 기준으로 변환해 현실적인 의사결정 프레임을 제시합니다.`,
    "",
    "### 2. 데이터 기반 해석 포인트",
    dataBrief,
    "해석은 단정형 예언이 아니라 선택의 우선순위를 명확히 하는 방향으로 구성합니다.",
    "",
    "### 3. 실행 전략",
    "이번 챕터의 핵심은 과속 결정보다 리듬 있는 실행입니다. 주간 단위로 관찰-조정-고정 루틴을 운영하면 결과 편차를 줄일 수 있습니다.",
    "",
    "### 4. 리스크 관리",
    "관계, 일정, 에너지 관리에서 동시에 흔들리는 지점을 먼저 정리하고, 중단-정리-재개 순서를 기준으로 복구 속도를 높입니다.",
    "",
    "### 5. 바로 실행할 3가지",
    "1) 이번 주 우선순위 1개를 정하고 완료 기준을 한 줄로 고정합니다.",
    "2) 반복 손실 패턴 1개를 멈추고 대체 행동 1개를 같은 시간대에 배치합니다.",
    "3) 주 1회 점검에서 관계/일/건강/재정 점수를 기록해 다음 주 계획에 반영합니다.",
  ].join("\n");
}

export async function createPremiumPdfJob(params = {}, deps = {}) {
  const jobId = typeof deps.createJobId === "function"
    ? String(deps.createJobId(params) || "")
    : `pdfv2_${Date.now().toString(36)}`;

  const pricing = typeof deps.resolvePricing === "function"
    ? await deps.resolvePricing(params)
    : { priceCoins: 0, featureKey: params?.featureKey || "" };

  const resultBase = normalizeResultBase(params, pricing, jobId);
  const payment = deps?.payment || {};

  await pushStatus(deps, {
    jobId,
    code: "PDF_V2_STARTED",
    message: "PDF v2 generation started",
    featureKey: resultBase.featureKey,
    priceCoins: resultBase.priceCoins,
  });

  const idempotencyKey = String(params?.idempotencyKey || `pdf-v2:${jobId}:${resultBase.featureKey}`);

  const hold = await payment.hold?.({
    userId: resultBase.userId,
    featureKey: resultBase.featureKey,
    amount: resultBase.priceCoins,
    idempotencyKey,
  });

  if (!hold?.ok) {
    const code = String(hold?.code || "PAYMENT_HOLD_FAILED");
    const message = String(hold?.message || "결제 보류 처리에 실패했습니다.");
    await pushStatus(deps, { jobId, code, message });
    return {
      ok: false,
      ...resultBase,
      code,
      message,
    };
  }

  let holdId = hold?.holdId || "";

  try {
    const adapter = await deps.resolveAdapter(params);
    const engineResult = await adapter.runEngine(params?.input || {});
    const normalizedData = await adapter.normalize(engineResult, params?.input || {}, params);
    const chapterPlan = adapter.getChapterPlan?.(params?.input?.mode || "default")
      || getPremiumPdfV2ChapterPlan(params?.pdfType, params?.input?.mode || "default");

    const adapterValidation = adapter.validate?.(normalizedData, chapterPlan)
      || { ok: true, missingByChapter: [] };
    const recoveryNotes = [];
    if (!adapterValidation.ok) {
      recoveryNotes.push({
        code: "PDF_V2_ADAPTER_RECOVERY",
        missingByChapter: adapterValidation.missingByChapter || [],
      });
      await pushStatus(deps, {
        jobId,
        code: "PDF_V2_ADAPTER_RECOVERY",
        message: "입력 편차를 자동 보정해 생성을 계속합니다.",
      });
    }

    const templates = typeof deps.resolvePromptTemplates === "function"
      ? await deps.resolvePromptTemplates(params, chapterPlan)
      : [];

    const chapters = [];
    for (const chapter of chapterPlan) {
      const requiredCheck = validateChapterData(normalizedData, chapter);
      if (!requiredCheck.ok) {
        recoveryNotes.push({
          code: "PDF_V2_CHAPTER_DATA_RECOVERY",
          chapterId: chapter.chapterId,
          missingFields: requiredCheck.missingFields,
        });
      }

      const template = templates.find((item) => String(item?.promptTemplateId || "") === String(chapter.promptTemplateId || ""))
        || {};

      let generated = "";
      try {
        generated = await deps.generateChapter({
          params,
          chapter,
          template,
          normalizedData,
          engineResult,
        });
      } catch (error) {
        recoveryNotes.push({
          code: String(error?.code || "PDF_V2_CHAPTER_GENERATION_RECOVERY"),
          chapterId: chapter.chapterId,
          message: asErrorMessage(error, "챕터 생성 보정"),
        });
        generated = buildProfessionalFallbackChapter(chapter, params, normalizedData);
      }

      if (!String(generated || "").trim()) {
        recoveryNotes.push({
          code: "PDF_V2_CHAPTER_EMPTY_RECOVERY",
          chapterId: chapter.chapterId,
        });
        generated = buildProfessionalFallbackChapter(chapter, params, normalizedData);
      }

      let cleaned = removeRepeatedParagraphs(generated);
      const textValidation = validateGeneratedChapterText(cleaned, {
        minChars: chapter.minChars,
        maxChars: chapter.maxChars,
        normalizedData,
        pdfType: params?.pdfType,
      });

      if (!textValidation.ok) {
        recoveryNotes.push({
          code: "PDF_V2_CHAPTER_VALIDATION_RECOVERY",
          chapterId: chapter.chapterId,
          errors: textValidation.errors,
        });
        cleaned = removeRepeatedParagraphs(buildProfessionalFallbackChapter(chapter, params, normalizedData));
      }

      chapters.push({
        chapterId: chapter.chapterId,
        title: chapter.title,
        content: cleaned,
      });
    }

    const render = await deps.renderPdf({
      params,
      normalizedData,
      chapterPlan,
      chapters,
      engineResult,
    });

    if (!render || (render?.ok === false && render?.status !== "completed")) {
      await payment.release?.({ holdId, idempotencyKey, reason: "PDF_V2_RENDER_FAILED" });
      await pushStatus(deps, {
        jobId,
        code: "PDF_V2_RENDER_FAILED",
        message: "PDF 렌더링 실패",
      });
      return {
        ok: false,
        ...resultBase,
        code: "PDF_V2_RENDER_FAILED",
      };
    }

    const save = await deps.savePdf({
      params,
      normalizedData,
      chapterPlan,
      chapters,
      render,
      jobId,
    });

    await payment.capture?.({ holdId, idempotencyKey, featureKey: resultBase.featureKey });

    const completedCode = recoveryNotes.length > 0 ? "PDF_V2_COMPLETED_WITH_RECOVERY" : "PDF_V2_COMPLETED";
    await pushStatus(deps, {
      jobId,
      code: completedCode,
      message: "PDF 생성 완료",
      fileUrl: save?.fileUrl || "",
    });

    return {
      ok: true,
      ...resultBase,
      fileUrl: save?.fileUrl || "",
      renderStatus: render?.status || "completed",
      chapters: chapters.length,
      recoveryApplied: recoveryNotes.length > 0,
    };
  } catch (error) {
    await payment.release?.({ holdId, idempotencyKey, reason: "PDF_V2_FAILED" });
    const code = String(error?.code || "PDF_V2_FAILED");
    const message = asErrorMessage(error, "PDF 생성 중 오류가 발생했습니다.");
    await pushStatus(deps, { jobId, code, message });
    deps?.logger?.error?.("[pdf-v2] createPremiumPdfJob failed", { jobId, code, message });

    return {
      ok: false,
      ...resultBase,
      code,
      message,
    };
  }
}
