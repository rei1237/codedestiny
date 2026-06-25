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
  const pdfArticleCount = (pdfHtml.match(/<article\b/g) || []).length;
  const pdfChapterIds = Array.from({ length: 15 }, (_, index) => `ch${String(index + 1).padStart(2, "0")}`);
  const missingPdfChapterIds = pdfChapterIds.filter((id) => !pdfHtml.includes(`data-chapter-id="${id}"`));
  if (pdfArticleCount < 15 || missingPdfChapterIds.length) {
    throw new Error(`ziwei v3 pdf chapters incomplete: articles=${pdfArticleCount}, missing=${missingPdfChapterIds.join(",")}`);
  }
  if (String(llmAssembly.provider || "") !== "gemini") throw new Error(`ziwei llmAssembly provider must be gemini: ${llmAssembly.provider || ""}`);
  if (!String(llmAssembly.modelName || "").trim()) throw new Error("ziwei llmAssembly.modelName missing");
  const categoryTexts = chapters.flatMap((chapter) => Array.isArray(chapter?.categories) ? chapter.categories.map((category) => String(category?.finalText || category?.text || "")) : []);
  if (categoryTexts.length < 75) throw new Error(`ziwei v3 category count too small: ${categoryTexts.length}`);
  const thinCategories = [];
  chapters.forEach((chapter, chapterIndex) => {
    const categories = Array.isArray(chapter?.categories) ? chapter.categories : [];
    if (categories.length < 5) thinCategories.push({ chapter: chapterIndex + 1, categoryCount: categories.length });
    categories.forEach((category, categoryIndex) => {
      const text = String(category?.finalText || category?.text || "").trim();
      if (text.length < 300 || !/[\uac00-\ud7a3]/.test(text)) {
        thinCategories.push({ chapter: chapterIndex + 1, category: categoryIndex + 1, title: category?.title, length: text.length });
      }
    });
  });
  if (thinCategories.length) {
    throw new Error(`ziwei v3 category text invalid: ${JSON.stringify(thinCategories.slice(0, 8))}`);
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
