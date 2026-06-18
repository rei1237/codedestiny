#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

let seedMongoose = null;

function parseArgs(argv) {
  const out = {};
  const setArg = (name, value) => {
    out[name] = value;
    const camelName = name.replace(/-([a-z])/g, (_, ch) => ch.toUpperCase());
    out[camelName] = value;
  };
  for (let i = 0; i < argv.length; i += 1) {
    const key = String(argv[i] || "");
    if (!key.startsWith("--")) continue;
    const value = String(argv[i + 1] || "");
    if (value && !value.startsWith("--")) {
      setArg(key.slice(2), value);
      i += 1;
      continue;
    }
    setArg(key.slice(2), "true");
  }
  return out;
}

function clean(value) {
  return String(value || "").trim();
}

function isEnabled(value) {
  return value === true || String(value || "").trim().toLowerCase() === "true";
}

function loadEnvFiles() {
  for (const fileName of [".env.local", ".env"]) {
    const envPath = path.join(process.cwd(), fileName);
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath, override: false });
    }
  }
}

function normalizeMongoUriEnv() {
  const currentMongoUri = String(process.env.MONGO_URI || "").trim();
  const fallbackMongoUri = String(process.env.MONGODB_URI || "").trim();
  if (
    fallbackMongoUri
    && (!currentMongoUri || /(?:localhost|127\.0\.0\.1)(?::\d+)?/i.test(currentMongoUri))
  ) {
    process.env.MONGO_URI = fallbackMongoUri;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function parseJsonSafe(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (_) {
    return { raw: text.slice(0, 1200) };
  }
}

async function requestJson(base, path, init = {}) {
  const response = await fetch(`${base}${path}`, init);
  const data = await parseJsonSafe(response);
  return { response, data };
}

function printKeyValue(label, value) {
  console.log(`${label}=${value}`);
}

function ensure(condition, message, details) {
  if (condition) return;
  const error = new Error(message);
  error.details = details;
  throw error;
}

function readAuthToken(payload) {
  return clean(payload?.token || payload?.accessToken || payload?.jwt);
}

function pad2(value) {
  return String(Number(value) || 0).padStart(2, "0");
}

function normalizeSukuyoGender(value) {
  const raw = clean(value).toLowerCase();
  if (["m", "male", "man", "남", "남자"].includes(raw)) return "male";
  if (["f", "female", "woman", "여", "여자"].includes(raw)) return "female";
  return "unknown";
}

function buildSeedProfileInput(args = {}) {
  return {
    profileId: clean(args.profileId || "sukuyo-family-e2e-profile"),
    name: clean(args.profileName || "숙요 패밀리 테스트"),
    gender: clean(args.profileGender || "M"),
    birthDate: clean(args.profileBirthDate || "1991-02-20"),
    birthTime: clean(args.profileBirthTime || "08:40"),
    calendarType: clean(args.profileCalendarType || "solar"),
    location: {
      label: clean(args.profileLocation || "Seoul"),
      tz: clean(args.profileTimezone || "Asia/Seoul"),
      lat: 37.5665,
      lng: 126.978,
    },
  };
}

function buildSelfInputFromProfile(profile, fallback = {}) {
  const source = profile && typeof profile === "object" ? profile : {};
  const birth = source.birth && typeof source.birth === "object" ? source.birth : {};
  const fallbackBirth = fallback.birth && typeof fallback.birth === "object" ? fallback.birth : {};
  const year = Number(birth.year || fallbackBirth.year || 1991);
  const month = Number(birth.month || fallbackBirth.month || 2);
  const day = Number(birth.day || fallbackBirth.day || 20);
  const hour = Number.isFinite(Number(birth.hour)) ? Number(birth.hour) : Number(fallbackBirth.hour || 8);
  const minute = Number.isFinite(Number(birth.minute)) ? Number(birth.minute) : Number(fallbackBirth.minute || 40);
  return {
    name: clean(source.name || fallback.name || "사용자"),
    gender: normalizeSukuyoGender(source.gender || fallback.gender || "M"),
    calendarType: clean(birth.calType || source.calendarType || fallback.calendarType || "solar"),
    birthDate: `${String(year).padStart(4, "0")}-${pad2(month)}-${pad2(day)}`,
    birthTime: `${pad2(hour)}:${pad2(minute)}`,
    timezone: clean(source.location?.tz || fallback.location?.tz || "Asia/Seoul"),
  };
}

function buildCompatibilityInput(selfProfile = null, fallbackProfile = null) {
  const self = selfProfile ? buildSelfInputFromProfile(selfProfile, fallbackProfile || {}) : {
    name: "사용자",
    gender: "male",
    calendarType: "solar",
    birthDate: "1991-02-20",
    birthTime: "08:40",
    timezone: "Asia/Seoul",
  };
  return {
    mode: "compatibility",
    self,
    partner: {
      name: "상대방",
      gender: "female",
      calendarType: "solar",
      birthDate: "1995-05-10",
      birthTime: "",
      timezone: "Asia/Seoul",
    },
  };
}

async function seedFamilyAccountIfRequested({ args, base, email, password }) {
  if (!isEnabled(args.seedFamily) && !isEnabled(process.env.SUKUYO_E2E_SEED_FAMILY)) return null;
  if (!isEnabled(args.allowSeed) && !isEnabled(process.env.ALLOW_SUKUYO_FAMILY_E2E_SEED)) {
    throw new Error("ALLOW_SUKUYO_FAMILY_E2E_SEED=true 또는 --allow-seed true가 필요합니다.");
  }
  if (!/^https?:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?(?:\/|$)/i.test(base) && !isEnabled(args.allowRemoteSeed)) {
    throw new Error("--seed-family는 로컬 base에서만 허용됩니다. 원격 base는 --allow-remote-seed true가 필요합니다.");
  }
  if (!email.endsWith("@code-destiny.local") && !isEnabled(args.allowExternalTestEmail)) {
    throw new Error("--seed-family 테스트 계정은 @code-destiny.local 이메일만 허용됩니다.");
  }

  loadEnvFiles();
  normalizeMongoUriEnv();

  const [{ connectDb, mongoose }, { User }, { hashPassword }] = await Promise.all([
    import("../worker/lib/db.js"),
    import("../worker/lib/models.js"),
    import("../worker/lib/password.js"),
  ]);

  await connectDb({ ...process.env, MONGO_IP_FAMILY: "4" });
  seedMongoose = mongoose;

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 365);
  const passwordHash = await hashPassword(password);
  const user = await User.findOneAndUpdate(
    { email },
    {
      $set: {
        name: clean(args.name || "Sukuyo Family E2E"),
        email,
        passwordHash,
        birthDate: "1991-02-20",
        birthTime: "08:40",
        gender: "M",
        role: "user",
        status: "active",
        points: 0,
        unlockedFeatures: [],
        localAuth: {
          enabled: true,
          activatedAt: now,
        },
        profileSubscription: {
          tier: "family",
          source: "pass",
          planId: "sukuyo-family-e2e",
          productType: "family",
          durationMonths: 12,
          profileLimit: 0,
          passTier: "family",
          passTotalUses: 0,
          passRemainingUses: 0,
          passUsedCount: 0,
          maxCoveredCoin: 999999999,
          freeLimit: 999999999,
          passLimit: 999999999,
          membershipCreditBalance: 0,
          membershipCreditGranted: 0,
          membershipCreditUsed: 0,
          startedAt: now,
          expiresAt,
          firstSubAt: now,
          lastBillingStatus: "success",
        },
      },
      $setOnInsert: {
        joinedAt: now,
      },
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  ).lean();

  return {
    userId: String(user?._id || ""),
    email,
    tier: clean(user?.profileSubscription?.tier),
    passTier: clean(user?.profileSubscription?.passTier),
    expiresAt: user?.profileSubscription?.expiresAt,
  };
}

async function closeSeedDb() {
  if (!seedMongoose || !seedMongoose.connection || seedMongoose.connection.readyState === 0) return;
  try {
    await seedMongoose.disconnect();
  } catch (_) {}
}

async function login(base, email, password) {
  const { response, data } = await requestJson(base, "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  return {
    status: response.status,
    ok: response.ok,
    data,
    token: readAuthToken(data),
  };
}

async function fetchProfile(base, authToken, profileId) {
  const { response, data } = await requestJson(base, `/api/profile/${encodeURIComponent(profileId)}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  });
  return {
    status: response.status,
    ok: response.ok,
    data,
    profile: data?.profile || data?.data || null,
  };
}

async function createOrFetchProfile(base, authToken, profileInput) {
  const { response, data } = await requestJson(base, "/api/profile", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({ profile: profileInput }),
  });

  if (response.ok) {
    return {
      status: response.status,
      ok: true,
      created: response.status === 201,
      data,
      profile: data?.profile || data?.data || null,
      currentId: clean(data?.currentId || data?.profile?.id || data?.profile?.profileId),
    };
  }

  if (response.status === 409 && clean(profileInput?.profileId)) {
    const existing = await fetchProfile(base, authToken, profileInput.profileId);
    return {
      status: response.status,
      ok: existing.ok,
      created: false,
      data: existing.data,
      profile: existing.profile,
      currentId: clean(existing.profile?.id || existing.profile?.profileId || profileInput.profileId),
      reusedExisting: true,
    };
  }

  return {
    status: response.status,
    ok: false,
    created: false,
    data,
    profile: null,
    currentId: "",
  };
}

async function preflight(base, input) {
  const { response, data } = await requestJson(base, "/api/sukuyo/premium/preflight", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...input,
      reportMode: "compatibility",
      reportType: "sookyoPremium",
    }),
  });

  return {
    status: response.status,
    ok: response.ok,
    data,
  };
}

async function consumeForSukuyo(base, authToken, requestId, options = {}) {
  const useFamilyPass = options.accessMode === "family";
  const body = {
    featureKey: "premium-sukuyo-report-compat",
    reason: "숙요점 프리미엄 PDF 궁합 리포트 생성",
    requestId,
    ...(options.profileId ? { profileId: options.profileId, selectedProfileId: options.profileId } : {}),
    ...(options.sessionId ? { sessionId: options.sessionId, reportSessionId: options.sessionId } : {}),
    ...(options.reportId ? { reportId: options.reportId } : {}),
  };

  const { response, data } = await requestJson(base, "/api/billing/coin-gate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      ...body,
      paymentMode: useFamilyPass ? "membership_pass" : "COIN",
      ...(useFamilyPass ? { accessMethod: "FAMILY", forceDeduct: false } : { forceDeduct: true }),
    }),
  });
  const billingData = data?.data && typeof data.data === "object" ? data.data : data;
  const consume = billingData?.consume && typeof billingData.consume === "object" ? billingData.consume : billingData;

  return {
    status: response.status,
    ok: response.ok,
    data,
    premiumAccessToken: clean(billingData?.premiumAccessToken || data?.premiumAccessToken),
    chargedCoins: Number(consume?.chargedCoins || consume?.cost || data?.chargedCoins || 0),
    code: clean(billingData?.code || data?.code),
    accessSource: clean(billingData?.accessSource || data?.accessSource),
    freeBySubscription: billingData?.freeBySubscription === true || data?.freeBySubscription === true,
    membershipPassTier: clean(billingData?.membershipPass?.tier || billingData?.membershipPass?.passTier || data?.membershipPass?.tier || data?.membershipPass?.passTier),
    accessDecisionReason: clean(billingData?.accessDecision?.reason || data?.accessDecision?.reason),
  };
}

function buildE2eIds() {
  const suffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    sessionId: `sukuyo-e2e-${suffix}`,
    reportId: `sukuyo-e2e-report-${suffix}`,
  };
}

async function prepare(base, authToken, premiumAccessToken, input, options = {}) {
  const sessionId = clean(options.sessionId) || `sukuyo-e2e-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const reportId = clean(options.reportId);
  const body = {
    sessionId,
    ...(reportId ? { reportId } : {}),
    featureKey: "premium-sukuyo-report-compat",
    premiumAccessToken,
    mode: "compatibility",
    reportMode: "compatibility",
    reportType: "sookyoPremium",
    self: input.self,
    partner: input.partner,
    user: input.self,
    ...(options.profileId ? { profileId: options.profileId, selectedProfileId: options.profileId } : {}),
  };

  const { response, data } = await requestJson(base, "/api/sukuyo/premium/prepare", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
      ...(premiumAccessToken ? { "x-premium-access-token": premiumAccessToken } : {}),
    },
    body: JSON.stringify(body),
  });

  return {
    status: response.status,
    ok: response.ok,
    data,
  };
}

async function fetchGenerationStatus(base, authToken, { sessionId, reportId }) {
  const params = new URLSearchParams();
  if (sessionId) params.set("sessionId", sessionId);
  if (reportId) params.set("reportId", reportId);
  const { response, data } = await requestJson(base, `/api/sukuyo/premium/status?${params.toString()}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  });
  return {
    status: response.status,
    ok: response.ok,
    data,
  };
}

function readReportPayload(payload) {
  if (payload?.report && typeof payload.report === "object") return payload.report;
  return payload || {};
}

function isCompletedReport(payload) {
  const report = readReportPayload(payload);
  return Boolean(
    report?.ok
    && clean(report.serverStatus) === "completed"
    && clean(report.qualityStatus) === "passed"
    && Array.isArray(report.chapters)
    && report.chapters.length === 15
  );
}

async function waitForCompletedReport(base, authToken, initialPayload, { sessionId, reportId, attempts = 80, delayMs = 3000 } = {}) {
  if (isCompletedReport(initialPayload)) return readReportPayload(initialPayload);
  let last = initialPayload;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    await sleep(delayMs);
    const statusResult = await fetchGenerationStatus(base, authToken, { sessionId, reportId });
    last = statusResult.data;
    const executionStatus = clean(last?.execution?.status);
    if (isCompletedReport(last)) return readReportPayload(last);
    if (executionStatus === "failed") {
      const error = new Error("숙요 PDF 생성 상태가 failed입니다.");
      error.details = last;
      throw error;
    }
  }
  const error = new Error("숙요 PDF 생성 완료 대기 시간이 초과되었습니다.");
  error.details = last;
  throw error;
}

async function fetchArchive(base, authToken, reportId, usePremiumRoute) {
  const route = usePremiumRoute
    ? `/api/premium/pdf-archive/${encodeURIComponent(reportId)}`
    : `/api/billing/pdf-archive/${encodeURIComponent(reportId)}`;

  const { response, data } = await requestJson(base, route, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  });

  return {
    route,
    status: response.status,
    ok: response.ok,
    data,
  };
}

async function fetchArchiveWithRetry(base, authToken, reportId, usePremiumRoute, attempts = 12, delayMs = 2500) {
  let lastResult = null;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    lastResult = await fetchArchive(base, authToken, reportId, usePremiumRoute);
    if (lastResult.ok && lastResult.data?.ok) return lastResult;
    if (attempt < attempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  return lastResult;
}

function resolveStoredUrl(payload) {
  const p = payload || {};
  const ready = p.pdfReady && typeof p.pdfReady === "object" ? p.pdfReady : {};
  return clean(
    p.pdfUrl
    || p.downloadUrl
    || p.htmlUrl
    || ready.pdfUrl
    || ready.downloadUrl
    || ready.htmlUrl,
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const base = clean(args.base || process.env.AUTH_SMOKE_BASE || process.env.TEST_BASE_URL || "https://code-destiny.com").replace(/\/+$/, "");
  const seedFamily = isEnabled(args.seedFamily) || isEnabled(process.env.SUKUYO_E2E_SEED_FAMILY);
  const accessMode = clean(args.access || args.accessMode || (seedFamily ? "family" : "coin")).toLowerCase();
  const email = clean(args.email || process.env.TEST_LOGIN_ID || (seedFamily ? "sukuyo-family-e2e@code-destiny.local" : "test1234@example.com")).toLowerCase();
  const password = clean(args.password || process.env.TEST_PASSWORD || (seedFamily ? "SukuyoFamily!2026" : "test!1234"));

  printKeyValue("BASE", base);
  printKeyValue("EMAIL", email);
  printKeyValue("ACCESS_MODE", accessMode);

  const seeded = await seedFamilyAccountIfRequested({ args, base, email, password });
  if (seeded) {
    printKeyValue("SEEDED_FAMILY_USER", seeded.userId);
    printKeyValue("SEEDED_FAMILY_TIER", seeded.tier);
    printKeyValue("SEEDED_FAMILY_PASS_TIER", seeded.passTier);
  }

  const loginResult = await login(base, email, password);
  printKeyValue("LOGIN_STATUS", loginResult.status);
  ensure(loginResult.ok && clean(loginResult.token).length > 20, "로그인 실패 또는 토큰 누락", loginResult.data);

  let profileResult = null;
  let profileInput = null;
  if (seedFamily || isEnabled(args.createProfile)) {
    profileInput = buildSeedProfileInput(args);
    profileResult = await createOrFetchProfile(base, loginResult.token, profileInput);
    printKeyValue("PROFILE_STATUS", profileResult.status);
    printKeyValue("PROFILE_CREATED", Boolean(profileResult.created));
    printKeyValue("PROFILE_REUSED", Boolean(profileResult.reusedExisting));
    printKeyValue("PROFILE_ID", clean(profileResult.currentId || profileResult.profile?.profileId || profileResult.profile?.id));
    ensure(profileResult.ok && profileResult.profile, "프로필 생성/조회 실패", profileResult.data);
  }

  const profileId = clean(profileResult?.currentId || profileResult?.profile?.profileId || profileResult?.profile?.id || profileInput?.profileId);
  const input = buildCompatibilityInput(profileResult?.profile, profileInput);

  const preflightResult = await preflight(base, input);
  printKeyValue("PREFLIGHT_STATUS", preflightResult.status);
  printKeyValue("PREFLIGHT_OK", Boolean(preflightResult.data?.ok));
  printKeyValue("PREFLIGHT_CHAPTER_COUNT", Number(preflightResult.data?.dryRun?.chapterCount || 0));
  printKeyValue("PREFLIGHT_SELF_STAR", Boolean(preflightResult.data?.dryRun?.selfStarReady));
  printKeyValue("PREFLIGHT_PARTNER_STAR", Boolean(preflightResult.data?.dryRun?.partnerStarReady));
  printKeyValue("PREFLIGHT_RELATION", clean(preflightResult.data?.dryRun?.relationType));

  ensure(preflightResult.ok && preflightResult.data?.ok, "preflight 실패", preflightResult.data);
  ensure(Number(preflightResult.data?.dryRun?.chapterCount) === 15, "preflight chapterCount 불일치", preflightResult.data);
  ensure(Boolean(preflightResult.data?.dryRun?.selfStarReady), "preflight self star 계산 실패", preflightResult.data);
  ensure(Boolean(preflightResult.data?.dryRun?.partnerStarReady), "preflight partner star 계산 실패", preflightResult.data);
  ensure(Boolean(clean(preflightResult.data?.dryRun?.relationType)), "preflight relationType 누락", preflightResult.data);

  const ids = buildE2eIds();
  const consumeRequestId = `sukuyo-e2e-consume-${Date.now().toString(36)}`;
  const consumeResult = await consumeForSukuyo(base, loginResult.token, consumeRequestId, {
    accessMode,
    profileId,
    sessionId: ids.sessionId,
    reportId: ids.reportId,
  });
  printKeyValue("CONSUME_STATUS", consumeResult.status);
  printKeyValue("CONSUME_CODE", consumeResult.code || "");
  printKeyValue("CONSUME_CHARGED", consumeResult.chargedCoins);
  printKeyValue("CONSUME_ACCESS_SOURCE", consumeResult.accessSource || "");
  printKeyValue("CONSUME_FREE_BY_SUBSCRIPTION", Boolean(consumeResult.freeBySubscription));
  printKeyValue("CONSUME_PASS_TIER", consumeResult.membershipPassTier || "");
  printKeyValue("CONSUME_ACCESS_DECISION", consumeResult.accessDecisionReason || "");
  ensure(consumeResult.ok && consumeResult.premiumAccessToken, "유료 처리 또는 premium access token 발급 실패", consumeResult.data);
  if (accessMode === "family") {
    ensure(consumeResult.chargedCoins === 0, "패밀리 이용권 처리에서 코인이 차감되었습니다.", consumeResult.data);
    ensure(consumeResult.freeBySubscription, "패밀리 이용권 적용 플래그가 누락되었습니다.", consumeResult.data);
    ensure(consumeResult.membershipPassTier === "family", "패밀리 passTier가 확인되지 않았습니다.", consumeResult.data);
  }

  const prepareResult = await prepare(base, loginResult.token, consumeResult.premiumAccessToken, input, {
    profileId,
    sessionId: ids.sessionId,
    reportId: ids.reportId,
  });
  const payload = await waitForCompletedReport(base, loginResult.token, prepareResult.data || {}, {
    sessionId: clean(prepareResult.data?.sessionId || ids.sessionId),
    reportId: clean(prepareResult.data?.reportId || ids.reportId),
  });
  const chapters = Array.isArray(payload.chapters) ? payload.chapters : [];
  const firstChapterSectionCount = Array.isArray(chapters?.[0]?.sections) ? chapters[0].sections.length : 0;
  const storedUrl = resolveStoredUrl(payload);

  printKeyValue("PREPARE_STATUS", prepareResult.status);
  printKeyValue("PREPARE_OK", Boolean(payload.ok));
  printKeyValue("PREPARE_SERVER_STATUS", clean(payload.serverStatus));
  printKeyValue("PREPARE_QUALITY_STATUS", clean(payload.qualityStatus));
  printKeyValue("PREPARE_REPORT_ID", clean(payload.reportId));
  printKeyValue("PREPARE_CHAPTERS", chapters.length);
  printKeyValue("PREPARE_SECTION_COUNT_CH1", firstChapterSectionCount);
  printKeyValue("PREPARE_HAS_PDF_HTML", Boolean(clean(payload?.pdfReady?.html)));
  printKeyValue("PREPARE_HAS_STORED_URL", Boolean(storedUrl));
  printKeyValue("PREPARE_CAN_REOPEN", Boolean(payload?.canReopen));
  printKeyValue("PREPARE_CAN_DOWNLOAD", Boolean(payload?.canDownload));
  printKeyValue("PREPARE_CANONICAL_FEATURE", clean(payload?.canonicalFeatureKey));
  printKeyValue("PREPARE_ALIAS_FEATURE", clean(payload?.aliasFeatureKey));

  ensure(prepareResult.ok && payload.ok, "prepare 실패", payload);
  ensure(clean(payload.serverStatus) === "completed", "serverStatus가 completed가 아님", payload);
  ensure(clean(payload.qualityStatus) === "passed", "qualityStatus가 passed가 아님", payload);
  ensure(clean(payload.reportId), "reportId 누락", payload);
  ensure(chapters.length === 15, "15챕터 미달", { chapterCount: chapters.length, payload });
  ensure(firstChapterSectionCount === 5, "챕터 섹션 수 불일치", { firstChapterSectionCount, payload });
  ensure(Boolean(clean(payload?.pdfReady?.html)), "pdfReady.html 누락", payload);
  ensure(Boolean(storedUrl), "저장 URL 누락", payload);
  ensure(Boolean(payload?.canReopen), "canReopen false", payload);
  ensure(Boolean(payload?.canDownload), "canDownload false", payload);

  const reportId = clean(payload.reportId);
  const premiumArchive = await fetchArchiveWithRetry(base, loginResult.token, reportId, true);
  const billingArchive = await fetchArchiveWithRetry(base, loginResult.token, reportId, false);

  printKeyValue("ARCHIVE_PREMIUM_STATUS", premiumArchive.status);
  printKeyValue("ARCHIVE_BILLING_STATUS", billingArchive.status);

  const premiumReport = premiumArchive?.data?.report || {};
  const billingReport = billingArchive?.data?.report || {};
  const premiumReportType = clean(premiumReport.reportType);
  const billingReportType = clean(billingReport.reportType);

  printKeyValue("ARCHIVE_PREMIUM_TYPE", premiumReportType);
  printKeyValue("ARCHIVE_BILLING_TYPE", billingReportType);
  printKeyValue("ARCHIVE_PREMIUM_CAN_DOWNLOAD", Boolean(premiumReport?.canDownload));
  printKeyValue("ARCHIVE_BILLING_CAN_DOWNLOAD", Boolean(billingReport?.canDownload));

  ensure(premiumArchive.ok && premiumArchive.data?.ok, "premium archive 재열람 실패", premiumArchive.data);
  ensure(billingArchive.ok && billingArchive.data?.ok, "billing archive 재열람 실패", billingArchive.data);
  ensure(["sukyo_book", "sookyoPremium", "sukyoPremium"].includes(premiumReportType), "premium archive reportType alias 불일치", premiumArchive.data);
  ensure(["sukyo_book", "sookyoPremium", "sukyoPremium"].includes(billingReportType), "billing archive reportType alias 불일치", billingArchive.data);
  ensure(Boolean(clean(premiumReport?.pdfUrl || premiumReport?.htmlUrl)), "premium archive URL 누락", premiumArchive.data);
  ensure(Boolean(clean(billingReport?.pdfUrl || billingReport?.htmlUrl)), "billing archive URL 누락", billingArchive.data);

  printKeyValue("E2E_RESULT", "PASS");
}

main()
  .catch((error) => {
    const detail = error && error.details ? error.details : null;
    console.error("[smoke-sukuyo-premium-e2e] FAIL", {
      message: String(error?.message || error),
      details: detail,
    });
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeSeedDb();
  });
