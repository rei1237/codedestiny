import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { dbConnect } from "../app/_lib/dbConnect.js";
import { getUserModel } from "../app/_lib/models/UserModel.js";
import { signAuthToken } from "../worker/lib/auth.js";
import { handleBillingRoutes } from "../worker/routes/billing.js";
import { handleZiweiBookRoutes, __ziweiBookTestUtils as ziweiBook } from "../worker/routes/ziwei-book.js";

for (const fileName of [".env.local", ".env"]) {
  const envPath = path.join(process.cwd(), fileName);
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: false });
  }
}

const currentMongoUri = String(process.env.MONGO_URI || "").trim();
const fallbackMongoUri = String(process.env.MONGODB_URI || "").trim();
if (
  fallbackMongoUri
  && (!currentMongoUri || /(?:localhost|127\.0\.0\.1)(?::\d+)?/i.test(currentMongoUri))
) {
  process.env.MONGO_URI = fallbackMongoUri;
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const key = String(argv[i] || "");
    if (!key.startsWith("--")) continue;
    const next = argv[i + 1];
    if (typeof next === "string" && !next.startsWith("--")) {
      out[key.slice(2)] = next;
      i += 1;
    } else {
      out[key.slice(2)] = "true";
    }
  }
  return out;
}

function extractZiweiDetailBlock(text, label, nextLabel) {
  const source = String(text || "");
  const start = source.indexOf(label);
  if (start < 0) return "";
  const bodyStart = start + label.length;
  const nextMarkers = [`\n${nextLabel}`, `\r\n${nextLabel}`];
  const end = nextMarkers
    .map((marker) => source.indexOf(marker, bodyStart))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b)[0];
  const body = source.slice(bodyStart, end >= 0 ? end : undefined);
  return body.replace(/\s+/g, " ").trim();
}

const args = parseArgs(process.argv.slice(2));
const TEST_EMAIL = String(args.email || process.env.ZIWEI_SMOKE_EMAIL || "test1234@example.com").trim().toLowerCase();
const START_POINTS = Number.isFinite(Number(args.points)) ? Number(args.points) : Number(process.env.ZIWEI_SMOKE_POINTS || 2000);
const OUT_FILE = path.resolve(process.cwd(), String(args.out || "_tmp_ziwei_premium_smoke.html"));

if (!Number.isFinite(START_POINTS) || START_POINTS < 700) {
  throw new Error("--points는 700 이상 정수로 지정해야 합니다.");
}

function getEnvForWorker() {
  return {
    MONGO_URI: String(process.env.MONGO_URI || ""),
    MONGODB_URI: String(process.env.MONGODB_URI || ""),
    MONGO_DB_NAME: String(process.env.MONGO_DB_NAME || process.env.MONGODB_DB_NAME || ""),
    JWT_SECRET: String(process.env.JWT_SECRET || process.env.AUTH_SECRET || "dev-secret"),
    AUTH_SECRET: String(process.env.AUTH_SECRET || ""),
    FLOWER_ADMIN_SECRET: String(process.env.FLOWER_ADMIN_SECRET || "flower-admin-dev-secret-placeholder-000000"),
    NODE_ENV: String(process.env.NODE_ENV || "development"),
  };
}

function reqJson(url, method, token, body, extraHeaders = {}) {
  const headers = {
    "content-type": "application/json",
    authorization: `Bearer ${token}`,
    ...extraHeaders,
  };
  return new Request(url, {
    method,
    headers,
    body: body == null ? undefined : JSON.stringify(body),
  });
}

function pad2(v) {
  return String(Number(v) || 0).padStart(2, "0");
}

function buildMockZiweiBase() {
  const names = [
    "명궁",
    "형제궁",
    "부부궁",
    "자녀궁",
    "재백궁",
    "질액궁",
    "천이궁",
    "노복궁",
    "관록궁",
    "전택궁",
    "복덕궁",
    "부모궁",
  ];
  const keys = [
    "ming",
    "siblings",
    "spouse",
    "children",
    "wealth",
    "health",
    "travel",
    "friends",
    "career",
    "property",
    "fortune",
    "parents",
  ];
  const branches = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"];

  const palaces = names.map((nameKo, idx) => ({
    key: keys[idx],
    nameKo,
    branch: branches[idx],
    mainStars: [
      {
        name: idx % 2 === 0 ? "자미" : "천기",
        strengthName: idx % 2 === 0 ? "묘" : "득",
        strengthSymbol: idx % 2 === 0 ? "◎" : "O",
      },
    ],
    auxStars: [
      {
        name: "문창",
        strengthName: "리",
        strengthSymbol: "▲",
      },
    ],
    maleficStars: [
      {
        name: "경양",
        strengthName: "함",
        strengthSymbol: "X",
      },
    ],
    transformations: [{ star: "자미", type: "화록" }],
  }));

  return {
    chartMeta: {
      mingGong: "자",
      shenGong: "오",
      fiveElementBureau: "화육국",
      yearStem: "갑",
      yearBranch: "자",
      lunarDate: "1991-01-06",
    },
    palaces,
    transformations: [
      { star: "자미", type: "화록" },
      { star: "천기", type: "화권" },
      { star: "문창", type: "화과" },
      { star: "경양", type: "화기" },
    ],
    luck: {
      decadeLuck: [{ label: "31-40", current: true, palace: "관록궁" }],
      annual: [{ year: 2026, palace: "명궁" }],
    },
  };
}

async function main() {
  await dbConnect();
  const env = getEnvForWorker();
  const User = await getUserModel();

  const user = await User.findOne({ email: TEST_EMAIL }).lean();
  if (!user?._id) {
    throw new Error(`테스트 계정이 없습니다: ${TEST_EMAIL}. 먼저 npm run seed:test-account 실행 필요`);
  }

  await User.updateOne(
    { _id: user._id },
    {
      $set: {
        role: "user",
        points: Math.trunc(START_POINTS),
        unlockedFeatures: [],
        recentConsumeRequestIds: [],
        "profileSubscription.tier": "free",
        "profileSubscription.source": "coin",
        "profileSubscription.expiresAt": null,
      },
    },
  );

  const freshUser = await User.findById(user._id).lean();
  const beforePoints = Number(freshUser?.points || 0);
  const authToken = await signAuthToken(freshUser, env);

  const requestId = `ziwei-smoke-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const coinGateReq = reqJson(
    "https://local.test/api/billing/coin-gate",
    "POST",
    authToken,
    {
      featureKey: "premium_pdf_ziwei",
      reason: "자미두수 프리미엄 PDF 리포트 생성",
      forceDeduct: true,
      reportType: "ziweiPremium",
      serviceKey: "ziwei-book",
      requestId,
      sessionId: requestId,
    },
  );

  const coinGateRes = await handleBillingRoutes(coinGateReq, env);
  const coinGateJson = await coinGateRes.json().catch(() => ({}));
  if (!coinGateRes.ok || !coinGateJson?.ok) {
    throw new Error(`coin-gate 실패: status=${coinGateRes.status}, body=${JSON.stringify(coinGateJson)}`);
  }

  const coinGateData = coinGateJson?.data || {};
  const premiumAccessToken = String(coinGateData?.premiumAccessToken || coinGateJson?.premiumAccessToken || "").trim();
  if (!premiumAccessToken) {
    throw new Error("coin-gate는 성공했지만 premiumAccessToken이 비어 있습니다.");
  }

  const chargedCoins = Math.max(0, Number(coinGateData?.consume?.chargedCoins || coinGateData?.consume?.delta || 0));
  const afterGateUser = await User.findById(user._id).select("points").lean();
  const afterGatePoints = Number(afterGateUser?.points || 0);

  const birthProfile = {
    name: "자미 스모크",
    gender: "male",
    year: 1991,
    month: 2,
    day: 20,
    hour: 7,
    minute: 0,
    calendarType: "solar",
    birthplace: "대한민국",
    birthIso: "1991-02-20 07:00",
  };

  const birthInput = {
    name: "자미 스모크",
    gender: "male",
    calendarType: "solar",
    birthDate: "1991-02-20",
    birthYear: 1991,
    birthMonth: 2,
    birthDay: 20,
    birthTime: "07:00",
    birthHour: 7,
    birthMinute: 0,
    timezone: "Asia/Seoul",
    isTimeUnknown: false,
  };

  const sessionId = `ziwei-premium:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`;
  const prepareReq = reqJson(
    "https://local.test/api/ziwei-book/prepare",
    "POST",
    authToken,
    {
      featureKey: "premium_pdf_ziwei",
      reportType: "ziweiPremium",
      sessionId,
      premiumAccessToken,
      paymentContext: {
        featureKey: "premium_pdf_ziwei",
        requestId,
        sessionId,
        reportSessionId: sessionId,
        accessGrant: coinGateData?.accessGrant || null,
      },
      birthProfile,
      birthInput,
      ziweiBase: buildMockZiweiBase(),
    },
    { "x-premium-access-token": premiumAccessToken },
  );

  const prepareRes = await handleZiweiBookRoutes(prepareReq, env);
  const prepareJson = await prepareRes.json().catch(() => ({}));

  if (!prepareRes.ok || !prepareJson?.ok) {
    throw new Error(`ziwei prepare 실패: status=${prepareRes.status}, body=${JSON.stringify(prepareJson)}`);
  }

  const chapters = Array.isArray(prepareJson?.chapters) ? prepareJson.chapters : [];
  const reportId = String(prepareJson?.reportId || "").trim();
  const pdfHtml = String(prepareJson?.pdfReady?.html || "").trim();
  const manuscriptSource = String(prepareJson?.manuscriptSource || "").trim();
  const llmAssembly = prepareJson?.llmAssembly && typeof prepareJson.llmAssembly === "object" ? prepareJson.llmAssembly : {};
  const ziweiJsonV2 = prepareJson?.ziweiJsonV2 || prepareJson?.payload?.ziweiJsonV2 || prepareJson?.ziweiPayload?.ziweiJsonV2;
  const ziweiMasterJson = prepareJson?.ziweiMasterJson || prepareJson?.payload?.ziweiMasterJson || prepareJson?.ziweiPayload?.ziweiMasterJson;
  const masterJsonValidation = prepareJson?.masterJsonValidation || prepareJson?.payload?.masterJsonValidation || prepareJson?.ziweiPayload?.masterJsonValidation;
  const pdfReady = prepareJson?.pdfReady || {};
  const evidenceMap = Array.isArray(ziweiJsonV2?.chapterEvidenceMap) ? ziweiJsonV2.chapterEvidenceMap : [];

  fs.writeFileSync(OUT_FILE, pdfHtml, "utf8");

  if (!reportId) throw new Error("reportId가 비어 있습니다.");
  if (chapters.length < 15) throw new Error(`챕터 수가 부족합니다: ${chapters.length}`);
  if (pdfHtml.length < 5000) throw new Error(`pdfReady.html 길이가 비정상적으로 짧습니다: ${pdfHtml.length}`);
  if (manuscriptSource !== "llm-html-v3") throw new Error(`ziwei manuscriptSource must be llm-html-v3: ${manuscriptSource}`);
  if (prepareJson?.llmAssemblyOnly !== true) throw new Error("ziwei llmAssemblyOnly missing");
  if (prepareJson?.externalCallsAllowed !== true) throw new Error("ziwei externalCallsAllowed must be true");
  if (prepareJson?.externalGeneration !== true) throw new Error("ziwei externalGeneration must be true");
  if (prepareJson?.fallbackUsed !== false) throw new Error("ziwei fallbackUsed must be false");
  if (prepareJson?.fallbackAllowed !== false) throw new Error("ziwei fallbackAllowed must be false");
  if (prepareJson?.localFallbackUsed !== false) throw new Error("ziwei localFallbackUsed must be false");
  if (llmAssembly.enabled !== true) throw new Error("ziwei llmAssembly.enabled missing");
  if (llmAssembly.source !== "llm-html-v3") throw new Error(`ziwei llmAssembly source mismatch: ${llmAssembly.source || ""}`);
  if (llmAssembly.externalCallsAllowed !== true) throw new Error("ziwei llmAssembly.externalCallsAllowed must be true");
  if (llmAssembly.externalGeneration !== true) throw new Error("ziwei llmAssembly.externalGeneration must be true");
  if (llmAssembly.fallbackUsed !== false) throw new Error("ziwei llmAssembly.fallbackUsed must be false");
  if (llmAssembly.localFallbackUsed !== false) throw new Error("ziwei llmAssembly.localFallbackUsed must be false");
  if (Number(llmAssembly.chapterCount || 0) < 15) throw new Error(`ziwei llmAssembly chapterCount invalid: ${llmAssembly.chapterCount}`);
  if (ziweiJsonV2?.schemaVersion !== "ziwei-pdf-v2") throw new Error("ziweiJsonV2 schemaVersion missing");
  if (ziweiMasterJson?.schemaVersion !== "ziwei-premium-master-json.v1") throw new Error("ziweiMasterJson schemaVersion missing");
  if (masterJsonValidation?.ok !== true) throw new Error(`ziweiMasterJson validation failed: ${JSON.stringify(masterJsonValidation)}`);
  if (evidenceMap.length < 15) throw new Error(`ziweiJsonV2 evidence map too small: ${evidenceMap.length}`);
  if (ziweiJsonV2?.quality?.writingPipeline !== "ziwei-premium-html-v3.0.0") throw new Error(`ziwei writingPipeline mismatch: ${ziweiJsonV2?.quality?.writingPipeline || ""}`);
  if (ziweiJsonV2?.quality?.manuscriptSource !== "llm-html-v3") throw new Error(`ziweiJsonV2 manuscriptSource mismatch: ${ziweiJsonV2?.quality?.manuscriptSource || ""}`);
  if (ziweiJsonV2?.quality?.externalCallsAllowed !== true) throw new Error("ziweiJsonV2 externalCallsAllowed must be true");
  if (ziweiJsonV2?.quality?.fallbackUsed !== false) throw new Error("ziweiJsonV2 fallbackUsed must be false");
  if (ziweiJsonV2?.quality?.fallbackAllowed !== false) throw new Error("ziweiJsonV2 fallbackAllowed must be false");
  if (ziweiJsonV2?.quality?.qualityTier !== "premium-llm-authored") throw new Error(`ziweiJsonV2 qualityTier mismatch: ${ziweiJsonV2?.quality?.qualityTier || ""}`);
  if (!String(pdfReady?.downloadUrl || "").includes("/api/premium/pdf-archive/") || !String(pdfReady?.downloadUrl || "").includes("format=pdf")) {
    throw new Error(`pdfReady.downloadUrl is not premium archive pdf: ${pdfReady?.downloadUrl || ""}`);
  }
  if (!String(pdfReady?.htmlUrl || "").includes("/api/premium/pdf-archive/") || !String(pdfReady?.htmlUrl || "").includes("format=html")) {
    throw new Error(`pdfReady.htmlUrl is not premium archive html: ${pdfReady?.htmlUrl || ""}`);
  }
  if (pdfReady?.contentType !== "application/pdf" || pdfReady?.renderFormat !== "pdf-archive") {
    throw new Error(`pdfReady contract invalid: ${JSON.stringify({ contentType: pdfReady?.contentType, renderFormat: pdfReady?.renderFormat })}`);
  }
  if (pdfHtml.includes("부처궁")) {
    throw new Error("ziwei pdf contains spouse palace typo: 부처궁");
  }
  const requiredPdfSections = ["핵심 결론 5개", "14주성 매트릭스", "활성 주성", "보조 판단", "빈자리"];
  const missingPdfSections = requiredPdfSections.filter((token) => !pdfHtml.includes(token));
  if (missingPdfSections.length) {
    throw new Error(`ziwei pdf summary sections missing: ${missingPdfSections.join(",")}`);
  }
  const allMajorStars = ["자미", "천기", "태양", "무곡", "천동", "염정", "천부", "태음", "탐랑", "거문", "천상", "천량", "칠살", "파군"];
  const missingMajorStars = allMajorStars.filter((star) => !pdfHtml.includes(star));
  if (missingMajorStars.length) {
    throw new Error(`ziwei pdf 14 major stars incomplete: ${missingMajorStars.join(",")}`);
  }
  const consultationQuality = prepareJson?.diagnostics?.consultationQuality
    || prepareJson?.pdfReady?.quality?.consultationQuality
    || ziweiJsonV2?.quality?.consultationQuality
    || {};
  const detailLabels = ["핵심 근거", "상담 해석", "실행 전략", "주의 흐름", "다음 점검"];
  const categoryTexts = chapters.flatMap((chapter) => Array.isArray(chapter?.categories) ? chapter.categories.map((category) => String(category?.finalText || category?.text || "")) : []);
  const detailedCategoryCount = categoryTexts.filter((text) => detailLabels.every((label) => text.includes(label))).length;
  if (categoryTexts.length < 75 || detailedCategoryCount !== categoryTexts.length) {
    const missingDetail = [];
    chapters.forEach((chapter, chapterIndex) => {
      (Array.isArray(chapter?.categories) ? chapter.categories : []).forEach((category, categoryIndex) => {
        const text = String(category?.finalText || category?.text || "");
        const missingLabels = detailLabels.filter((label) => !text.includes(label));
        if (missingLabels.length) {
          missingDetail.push({ chapter: chapterIndex + 1, category: categoryIndex + 1, title: category?.title, missingLabels });
        }
      });
    });
    throw new Error(`ziwei category detail blocks invalid: ${detailedCategoryCount}/${categoryTexts.length} ${JSON.stringify(missingDetail.slice(0, 5))}`);
  }
  const renderedCategorySectionCount = (pdfHtml.match(/<section class="zb-category-section/g) || []).length;
  const renderedActionSectionCount = (pdfHtml.match(/zb-category-section--action/g) || []).length;
  const renderedOrderedListCount = (pdfHtml.match(/<ol>/g) || []).length;
  const expectedCategorySectionCount = categoryTexts.length * detailLabels.length;
  if (renderedCategorySectionCount < expectedCategorySectionCount) {
    throw new Error(`ziwei pdf html category sections incomplete: ${renderedCategorySectionCount}/${expectedCategorySectionCount}`);
  }
  if (renderedActionSectionCount < 75 || renderedOrderedListCount < 75) {
    throw new Error(`ziwei pdf html action lists incomplete: actionSections=${renderedActionSectionCount}, orderedLists=${renderedOrderedListCount}`);
  }
  const requiredPrintCss = ["print-color-adjust:exact", "thead{display:table-header-group}", "widows:3", "orphans:3"];
  const missingPrintCss = requiredPrintCss.filter((token) => !pdfHtml.includes(token));
  if (missingPrintCss.length) throw new Error(`ziwei pdf print css missing: ${missingPrintCss.join(",")}`);
  if (Number(consultationQuality.detailScore || 0) < 100) {
    throw new Error(`ziwei consultation detailScore too low: ${consultationQuality.detailScore}`);
  }
  if (Number(consultationQuality.score || 0) < 88) {
    throw new Error(`ziwei consultation score too low: ${consultationQuality.score}`);
  }
  if (Array.isArray(consultationQuality.issues) && consultationQuality.issues.length) {
    throw new Error(`ziwei consultation quality issues remain: ${consultationQuality.issues.join(",")}`);
  }
  const categoryEvidenceProblems = [];
  const staleTemplateFragments = [
    "흐름을 중심으로 읽습니다",
    "궁의 자리, 주성의 강약, 보좌성과 살성의 압력을 함께 대조해야 실제 상담의 결이 선명해집니다",
    "힘을 쓰는 방식과 판단의 출발점을 보여 줍니다",
    "자연스럽게 열리는 힘",
    "보완과 회복을 요구하는 신호로 보아야 합니다",
    "실제로 남은 변화와 사라진 부담을 나누어 보십시오",
    "장점을 과속으로 쓰는 데 있습니다",
    "작은 확인 단위로 나누고",
    "상담 지도가 됩니다",
    "상담 지도로 굳어집니다",
    "첫째,",
    "둘째,",
    "셋째,",
    "세부 근거는",
    "사화와 운 보조 신호는",
    "주의할 지점은",
    "압박을 못 본 척하거나",
    "운세가 깨어나는 자리",
    "월말마다 실행 결과와 피로도를 함께 대조합니다",
    "삶의 한 축",
    "의 별로",
    "라는 흐름으로 읽힙니다",
    "강함 강점",
    "권한 위임 규칙을 문서화해 과부하를 줄이세요 힘",
  ];
  const badParticlePattern = /화록로|화권로|화기으로|화과으로|구조은|가이드은|체크리스트은|흐름를|축를|작동와|모임로|명궁가|관록궁가|만듦와|[◎O▲△X]은/g;
  const roughPredicatePattern = /(극대화|적합|우수|작동|강점|확장|상승|구축|성과화|필수|좌우)입니다|직무 잘 맞습니다/g;
  const relationshipLeakPattern = /재무|자금|투자|수익|자산|현금흐름|포트폴리오|사업개발/g;
  const healthLeakPattern = /영업|홍보|사업개발|브랜딩|투자|재무 대시보드/g;
  chapters.forEach((chapter, chapterIndex) => {
    const categories = Array.isArray(chapter?.categories) ? chapter.categories : [];
    const evidenceSignatures = new Set();
    categories.forEach((category, categoryIndex) => {
      const text = String(category?.finalText || category?.text || "");
      const consultationText = extractZiweiDetailBlock(text, "상담 해석", "실행 전략");
      const consultationTooThin = consultationText.length < 240;
      const palaceNames = Array.isArray(category?.palaceNames) ? category.palaceNames.map(String).filter(Boolean) : [];
      const anchors = Array.isArray(category?.evidenceAnchors) ? category.evidenceAnchors : [];
      const categoryIntent = String(category?.categoryIntent || category?.contextFocus || "").trim();
      const missingPalaceNames = palaceNames.filter((name) => !text.includes(name));
      const hasPalaceAnchor = anchors.some((anchor) => anchor?.type === "palace" && String(anchor?.name || "").trim());
      const hasStarAnchor = anchors.some((anchor) => anchor?.type === "star" && String(anchor?.name || "").trim());
      const hasStarRuleMeaning = /의 결을 품고|의 기운이|의 작용을|기운이 .*에서 열리며|움직여|모여/.test(text);
      const badParticleMatches = text.match(badParticlePattern) || [];
      const roughPredicateMatches = text.match(roughPredicatePattern) || [];
      const staleTemplateMatches = staleTemplateFragments.filter((phrase) => text.includes(phrase));
      const genericRepeats = ["약속, 돈, 시간, 감정의 한계", "확인, 휴식, 책임 분리의 순서", "강점이 결과로 남았는지 기록"].filter((phrase) => text.includes(phrase));
      const scopeText = `${chapter?.title || ""} ${category?.title || ""} ${categoryIntent}`;
      const relationshipLeakMatches = /부부|부처|자녀|가족|연애|결혼|인연|관계|사람|노복|형제/.test(scopeText)
        ? text.match(relationshipLeakPattern) || []
        : [];
      const healthLeakMatches = /질액|건강|몸|마음|취약|예방|회복/.test(scopeText)
        ? text.match(healthLeakPattern) || []
        : [];
      const timingMode = String(category?.timingMode || "").trim();
      const annualMonthCount = timingMode === "annual" ? new Set(text.match(/\d+월/g) || []).size : 0;
      const annualCoverageWeak = timingMode === "annual" && annualMonthCount < 12;
      const longAnnualSentences = timingMode === "annual"
        ? text.split(/[.!?。！？]\s*/).filter((sentence) => /\d+월/.test(sentence) && sentence.length > 220)
        : [];
      const hasPalaceRelation = /삼방사정|대궁|궁위 간 응답|운한의 교차점|한 궁의 장점|명궁은 타고난 출발점|명궁을 타고난 출발점|재백궁과 관록궁|부부궁·자녀궁|질액궁은 몸의 경고|질액궁을 몸의 경고|천이궁은 밖으로 나가는 문|천이궁을 밖으로 나가는 문|노복궁과 형제궁/.test(text);
      const hasSihuaPhenomenon = /화록은|화권은|화과는|화기는|사화 기준은|사화가 강하게 튀기보다/.test(text);
      const hasFourteenStarsDigest = chapterIndex !== 3 || (/14주성|활성 주성|보조 판단|빈자리/.test(text) && /자미|천기|태양|무곡|천동|염정|천부|태음|탐랑|거문|천상|천량|칠살|파군/.test(text));
      if (!palaceNames.length || missingPalaceNames.length || !hasPalaceAnchor || !hasStarAnchor || !categoryIntent || !text.includes(categoryIntent) || consultationTooThin || !hasStarRuleMeaning || !hasPalaceRelation || !hasSihuaPhenomenon || !hasFourteenStarsDigest || badParticleMatches.length || roughPredicateMatches.length || staleTemplateMatches.length || genericRepeats.length || relationshipLeakMatches.length || healthLeakMatches.length || annualCoverageWeak || longAnnualSentences.length) {
        categoryEvidenceProblems.push({
          chapter: chapterIndex + 1,
          category: categoryIndex + 1,
          title: category?.title,
          categoryIntent,
          hasIntentInText: Boolean(categoryIntent && text.includes(categoryIntent)),
          palaceNames,
          missingPalaceNames,
          hasPalaceAnchor,
          hasStarAnchor,
          consultationLength: consultationText.length,
          consultationTooThin,
          hasStarRuleMeaning,
          hasPalaceRelation,
          hasSihuaPhenomenon,
          hasFourteenStarsDigest,
          badParticleMatches,
          roughPredicateMatches,
          staleTemplateMatches,
          genericRepeats,
          relationshipLeakMatches,
          healthLeakMatches,
          annualMonthCount,
          longAnnualSentences: longAnnualSentences.map((sentence) => sentence.slice(0, 260)),
        });
      }
      evidenceSignatures.add(JSON.stringify(anchors));
      const requiredTimingTokens = timingMode === "decade"
        ? ["대한", "10년"]
        : timingMode === "annual"
          ? ["유년", "올해", "월별", "분기"]
          : timingMode === "lifetime"
            ? ["생애"]
            : timingMode === "final"
              ? ["대한", "유년"]
              : timingMode === "sihua"
                ? ["사화"]
                : [];
      const missingTimingTokens = requiredTimingTokens.filter((token) => !text.includes(token));
      if (missingTimingTokens.length) {
        categoryEvidenceProblems.push({
          chapter: chapterIndex + 1,
          category: categoryIndex + 1,
          title: category?.title,
          timingMode,
          missingTimingTokens,
        });
      }
    });
    if (categories.length && evidenceSignatures.size < categories.length) {
      categoryEvidenceProblems.push({
        chapter: chapterIndex + 1,
        title: chapter?.title,
        uniqueEvidence: evidenceSignatures.size,
        categoryCount: categories.length,
      });
    }
  });
  const sentenceCounts = new Map();
  categoryTexts
    .join("\n")
    .split(/[.!?。！？]\s*/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => /[가-힣]/.test(sentence) && sentence.length >= 18)
    .forEach((sentence) => {
      sentenceCounts.set(sentence, (sentenceCounts.get(sentence) || 0) + 1);
    });
  const repeatedSentences = Array.from(sentenceCounts.entries())
    .filter(([, count]) => count > 5)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([sentence, count]) => ({ count, sentence: sentence.slice(0, 220) }));
  if (repeatedSentences.length) {
    categoryEvidenceProblems.push({ repeatedSentences });
  }
  if (categoryEvidenceProblems.length) {
    throw new Error(`ziwei category evidence invalid: ${JSON.stringify(categoryEvidenceProblems.slice(0, 8))}`);
  }

  const variantProfile = {
    ...birthProfile,
    name: "자미 변형",
    gender: "female",
    birthIso: "1988-11-22 18:30",
    year: 1988,
    month: 11,
    day: 22,
    hour: 18,
    minute: 30,
  };
  const baseSeed = ziweiBook.buildZiweiPdfSeed(birthProfile, buildMockZiweiBase());
  const variantBase = buildMockZiweiBase();
  variantBase.chartMeta = { ...variantBase.chartMeta, mingGong: "오", shenGong: "자", yearStem: "경", yearBranch: "신" };
  variantBase.palaces = variantBase.palaces.map((palace, index) => ({
    ...palace,
    branch: index % 2 === 0 ? "오" : palace.branch,
    mainStars: [{ name: index % 2 === 0 ? "무곡" : "태양", strengthName: index % 2 === 0 ? "왕" : "평", strengthSymbol: index % 2 === 0 ? "O" : "△" }],
    stars: [{ name: index % 2 === 0 ? "무곡" : "태양", strengthName: index % 2 === 0 ? "왕" : "평", strengthSymbol: index % 2 === 0 ? "O" : "△" }],
  }));
  const variantSeed = ziweiBook.buildZiweiPdfSeed(variantProfile, variantBase);
  if (JSON.stringify(baseSeed.chart?.palaces?.[0]?.mainStars || []) === JSON.stringify(variantSeed.chart?.palaces?.[0]?.mainStars || [])) {
    throw new Error("ziwei chart json must vary by input");
  }

  const finalUser = await User.findById(user._id).select("points").lean();
  const finalPoints = Number(finalUser?.points || 0);

  console.log("[smoke-ziwei-premium-e2e] PASS");
  console.log(`  - user: ${TEST_EMAIL}`);
  console.log(`  - points(before): ${beforePoints}`);
  console.log(`  - points(after coin-gate): ${afterGatePoints}`);
  console.log(`  - points(final): ${finalPoints}`);
  console.log(`  - chargedCoins: ${chargedCoins}`);
  console.log(`  - reportId: ${reportId}`);
  console.log(`  - chapters: ${chapters.length}`);
  console.log(`  - ziweiJsonV2: ${ziweiJsonV2.schemaVersion}`);
  console.log(`  - ziweiMasterJson: ${ziweiMasterJson.schemaVersion}`);
  console.log(`  - evidenceMap: ${evidenceMap.length}`);
  console.log(`  - manuscriptSource: ${manuscriptSource}`);
  console.log(`  - llmAssembly: ${llmAssembly.chapterCount || 0} chapters`);
  console.log(`  - htmlLength: ${pdfHtml.length}`);
  console.log(`  - outFile: ${path.relative(process.cwd(), OUT_FILE)}`);
}

main()
  .catch((error) => {
    console.error("[smoke-ziwei-premium-e2e] FAIL:", error?.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await mongoose.disconnect();
    } catch (_) {
      // noop
    }
  });
