import {
  PREMIUM_PDF_V2_BANNED_PHRASES,
  hasValueByPath,
  validateChapterData,
  validateGeneratedChapterText,
} from "./validation.js";

export const PDF_PURCHASE_TRANSACTION_TYPES = Object.freeze({
  HOLD: "PDF_PURCHASE_HOLD",
  CAPTURE: "PDF_PURCHASE_CAPTURE",
  REFUND: "PDF_PURCHASE_REFUND",
});

function toErrorCode(error, fallback = "PREMIUM_PDF_V2_FAILED") {
  const code = String(error?.code || fallback || "PREMIUM_PDF_V2_FAILED").trim();
  return code || "PREMIUM_PDF_V2_FAILED";
}

function toMessage(error, fallback = "PDF 생성에 필요한 계산 데이터가 일부 누락되어 생성을 중단했습니다. 코인은 차감되지 않았거나 자동으로 환불되었습니다. 잠시 후 다시 시도해 주세요.") {
  const message = String(error?.message || fallback || "").trim();
  return message || fallback;
}

function chapterPromptById(promptTemplates = [], promptTemplateId = "") {
  return promptTemplates.find((template) => String(template?.promptTemplateId) === String(promptTemplateId)) || null;
}

function pickDataForChapter(normalizedData, requiredFields = []) {
  const picked = {};
  const source = normalizedData && typeof normalizedData === "object" ? normalizedData : {};
  requiredFields.forEach((path) => {
    picked[path] = hasValueByPath(source, path);
  });
  return {
    source,
    coverage: picked,
  };
}

function makeGeminiInput({ pdfType, chapterPlan, normalizedData, promptTemplate }) {
  const chapterData = pickDataForChapter(normalizedData, chapterPlan.requiredFields || []);
  return {
    pdfType,
    chapter: {
      chapterId: chapterPlan.chapterId,
      title: chapterPlan.title,
      purpose: String(promptTemplate?.purpose || `${chapterPlan.title}의 목적에 맞는 해석`),
    },
    normalizedData: chapterData.source,
    writingRules: {
      minChars: chapterPlan.minChars,
      maxChars: chapterPlan.maxChars,
      tone: "전문적이지만 이해하기 쉬운 프리미엄 상담 문체",
      avoid: [
        "데이터가 없어 기본 해석만 제공합니다",
        "일반적으로",
        "추측됩니다만",
      ],
    },
    systemPrompt: String(promptTemplate?.systemPrompt || ""),
    requiredCoverage: chapterData.coverage,
  };
}

function getDisallowedKeywordsByPdfType(pdfType) {
  const key = String(pdfType || "").trim();
  if (key === "vedicPremium") {
    return ["어센던트", "Ascendant", "Solar Return", "Synastry", "Composite"];
  }
  if (key === "westernAstrologyPremium") {
    return ["라그나", "나크샤트라", "비므쇼타리", "Vimshottari", "다샤"];
  }
  return [];
}

async function safePaymentRelease(payment, context, logger) {
  try {
    if (payment?.release) {
      const releaseResult = await payment.release({
        ...context,
        transactionType: PDF_PURCHASE_TRANSACTION_TYPES.REFUND,
      });
      if (releaseResult && releaseResult.ok === false) {
        logger?.error?.("[PDF_V2_PAYMENT_RELEASE_RESULT_NOT_OK]", releaseResult);
      }
    }
  } catch (releaseError) {
    logger?.error?.("[PDF_V2_PAYMENT_RELEASE_FAILED]", releaseError);
  }
}

export async function createPremiumPdfJob(params, deps) {
  const {
    userId,
    featureKey,
    pdfType,
    input,
  } = params || {};

  const logger = deps?.logger || console;
  const jobId = String(deps?.createJobId?.(params) || `pdfv2_${Date.now()}`);
  const idempotencyKey = `pdf-v2:${String(userId || "")}:${String(featureKey || "")}:${jobId}`;

  const payment = deps?.payment || {};
  const mode = String(input?.mode || input?.reportMode || "");

  try {
    await deps?.updateJobStatus?.({ jobId, status: "processing", code: "PDF_V2_STARTED" });

    const pricing = await deps?.resolvePricing?.({ featureKey, pdfType, input });
    if (!pricing || !Number.isFinite(Number(pricing?.priceCoins))) {
      const priceError = new Error("가격 조회에 실패했습니다.");
      priceError.code = "PDF_V2_PRICE_NOT_FOUND";
      throw priceError;
    }

    const hold = payment?.hold
      ? await payment.hold({
        userId,
        featureKey,
        amount: Number(pricing.priceCoins || 0),
        idempotencyKey,
        transactionType: PDF_PURCHASE_TRANSACTION_TYPES.HOLD,
        jobId,
      })
      : { ok: true, holdId: `hold_${jobId}` };

    if (!hold?.ok) {
      const holdError = new Error(String(hold?.message || "코인 hold에 실패했습니다."));
      holdError.code = String(hold?.code || "PDF_V2_HOLD_FAILED");
      throw holdError;
    }

    const adapter = await deps?.resolveAdapter?.(pdfType, input);
    if (!adapter) {
      const adapterError = new Error("PDF 타입에 맞는 adapter를 찾을 수 없습니다.");
      adapterError.code = "PDF_V2_ADAPTER_NOT_FOUND";
      throw adapterError;
    }

    const engineResult = await adapter.runEngine(input);
    const normalizedData = await adapter.normalize(engineResult, input);
    const chapterPlan = adapter.getChapterPlan(mode);
    const promptTemplates = await deps?.resolvePromptTemplates?.(pdfType, mode) || [];

    if (!Array.isArray(chapterPlan) || chapterPlan.length === 0) {
      const chapterError = new Error("챕터 플랜이 비어 있습니다.");
      chapterError.code = "PDF_V2_CHAPTER_PLAN_EMPTY";
      throw chapterError;
    }

    const chapterResults = [];

    for (let i = 0; i < chapterPlan.length; i += 1) {
      const chapter = chapterPlan[i];
      const chapterValidation = validateChapterData(normalizedData, chapter);

      if (!chapterValidation.ok) {
        const missingJoined = chapterValidation.missingFields.join(",");
        logger?.error?.(
          `[PDF_V2_MISSING_FIELDS] pdfType=${pdfType} chapterId=${chapter.chapterId} missingFields=${missingJoined}`,
        );

        const err = new Error("PDF 생성에 필요한 계산 데이터가 일부 누락되어 생성을 중단했습니다. 코인은 차감되지 않았거나 자동으로 환불되었습니다. 잠시 후 다시 시도해 주세요.");
        err.code = "PDF_V2_MISSING_FIELDS";
        err.chapterId = chapter.chapterId;
        err.missingFields = chapterValidation.missingFields;
        throw err;
      }

      const promptTemplate = chapterPromptById(promptTemplates, chapter.promptTemplateId);
      const geminiInput = makeGeminiInput({
        pdfType,
        chapterPlan: chapter,
        normalizedData,
        promptTemplate,
      });

      const generatedText = await deps?.generateChapter?.({
        pdfType,
        chapter,
        geminiInput,
        promptTemplate,
      });

      const generatedValidation = validateGeneratedChapterText(generatedText, {
        minChars: chapter.minChars,
        maxChars: chapter.maxChars,
        chapterTitle: chapter.title,
        normalizedData,
        bannedPhrases: PREMIUM_PDF_V2_BANNED_PHRASES,
        disallowedKeywords: getDisallowedKeywordsByPdfType(pdfType),
      });

      if (!generatedValidation.ok) {
        const genError = new Error("챕터 생성 품질 검증에 실패했습니다.");
        genError.code = "PDF_V2_CHAPTER_VALIDATION_FAILED";
        genError.chapterId = chapter.chapterId;
        genError.validation = generatedValidation;
        throw genError;
      }

      chapterResults.push({
        chapterId: chapter.chapterId,
        title: chapter.title,
        content: generatedValidation.text,
        warnings: generatedValidation.warnings,
      });
    }

    const pdfBinary = await deps?.renderPdf?.({
      pdfType,
      chapterPlan,
      chapters: chapterResults,
      normalizedData,
      input,
    });

    const saveResult = await deps?.savePdf?.({
      userId,
      featureKey,
      pdfType,
      jobId,
      pdfBinary,
      chapterPlan,
      chapters: chapterResults,
      normalizedData,
    });

    if (payment?.capture) {
      const captureResult = await payment.capture({
        userId,
        featureKey,
        amount: Number(pricing.priceCoins || 0),
        idempotencyKey,
        jobId,
        holdId: hold?.holdId,
        transactionType: PDF_PURCHASE_TRANSACTION_TYPES.CAPTURE,
      });
      if (!captureResult?.ok) {
        const captureError = new Error(String(captureResult?.message || "코인 확정 차감에 실패했습니다."));
        captureError.code = String(captureResult?.code || "PDF_V2_CAPTURE_FAILED");
        throw captureError;
      }
    }

    await deps?.updateJobStatus?.({
      jobId,
      status: "completed",
      code: "PDF_V2_COMPLETED",
      output: saveResult || null,
    });

    return {
      ok: true,
      jobId,
      idempotencyKey,
      pdfType,
      featureKey,
      priceCoins: Number(pricing.priceCoins || 0),
      output: saveResult || null,
      chapters: chapterResults,
    };
  } catch (error) {
    await safePaymentRelease(payment, {
      userId,
      featureKey,
      idempotencyKey,
      jobId,
    }, logger);

    await deps?.updateJobStatus?.({
      jobId,
      status: "failed",
      code: toErrorCode(error),
      message: toMessage(error),
      error: {
        chapterId: String(error?.chapterId || ""),
        missingFields: Array.isArray(error?.missingFields) ? error.missingFields : [],
      },
    });

    return {
      ok: false,
      jobId,
      idempotencyKey,
      code: toErrorCode(error),
      message: toMessage(error),
      missingFields: Array.isArray(error?.missingFields) ? error.missingFields : [],
    };
  }
}
