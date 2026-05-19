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

    if (!adapterValidation.ok) {
      await payment.release?.({ holdId, idempotencyKey, reason: "PDF_V2_MISSING_FIELDS" });
      await pushStatus(deps, {
        jobId,
        code: "PDF_V2_MISSING_FIELDS",
        message: "필수 계산 데이터가 누락되어 생성을 중단했습니다.",
        missingByChapter: adapterValidation.missingByChapter || [],
      });
      return {
        ok: false,
        ...resultBase,
        code: "PDF_V2_MISSING_FIELDS",
        missingByChapter: adapterValidation.missingByChapter || [],
      };
    }

    const templates = typeof deps.resolvePromptTemplates === "function"
      ? await deps.resolvePromptTemplates(params, chapterPlan)
      : [];

    const chapters = [];
    for (const chapter of chapterPlan) {
      const requiredCheck = validateChapterData(normalizedData, chapter);
      if (!requiredCheck.ok) {
        await payment.release?.({ holdId, idempotencyKey, reason: "PDF_V2_MISSING_FIELDS" });
        await pushStatus(deps, {
          jobId,
          code: "PDF_V2_MISSING_FIELDS",
          message: "챕터 필수 필드가 누락되었습니다.",
          chapterId: chapter.chapterId,
          missingFields: requiredCheck.missingFields,
        });
        return {
          ok: false,
          ...resultBase,
          code: "PDF_V2_MISSING_FIELDS",
          chapterId: chapter.chapterId,
          missingFields: requiredCheck.missingFields,
        };
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
        await payment.release?.({ holdId, idempotencyKey, reason: "PDF_V2_CHAPTER_GENERATION_FAILED" });
        await pushStatus(deps, {
          jobId,
          code: String(error?.code || "PDF_V2_CHAPTER_GENERATION_FAILED"),
          message: asErrorMessage(error, "챕터 생성 실패"),
          chapterId: chapter.chapterId,
        });
        return {
          ok: false,
          ...resultBase,
          code: String(error?.code || "PDF_V2_CHAPTER_GENERATION_FAILED"),
          chapterId: chapter.chapterId,
          message: asErrorMessage(error, "챕터 생성 실패"),
        };
      }

      const cleaned = removeRepeatedParagraphs(generated);
      const textValidation = validateGeneratedChapterText(cleaned, {
        minChars: chapter.minChars,
        maxChars: chapter.maxChars,
        normalizedData,
        pdfType: params?.pdfType,
      });

      if (!textValidation.ok) {
        await payment.release?.({ holdId, idempotencyKey, reason: "PDF_V2_CHAPTER_VALIDATION_FAILED" });
        await pushStatus(deps, {
          jobId,
          code: "PDF_V2_CHAPTER_VALIDATION_FAILED",
          message: "챕터 본문 품질 검증 실패",
          chapterId: chapter.chapterId,
          errors: textValidation.errors,
        });
        return {
          ok: false,
          ...resultBase,
          code: "PDF_V2_CHAPTER_VALIDATION_FAILED",
          chapterId: chapter.chapterId,
          errors: textValidation.errors,
        };
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

    await pushStatus(deps, {
      jobId,
      code: "PDF_V2_COMPLETED",
      message: "PDF 생성 완료",
      fileUrl: save?.fileUrl || "",
    });

    return {
      ok: true,
      ...resultBase,
      fileUrl: save?.fileUrl || "",
      renderStatus: render?.status || "completed",
      chapters: chapters.length,
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
