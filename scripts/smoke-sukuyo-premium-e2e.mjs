#!/usr/bin/env node

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const key = String(argv[i] || "");
    if (!key.startsWith("--")) continue;
    const value = String(argv[i + 1] || "");
    if (value && !value.startsWith("--")) {
      out[key.slice(2)] = value;
      i += 1;
      continue;
    }
    out[key.slice(2)] = "true";
  }
  return out;
}

function clean(value) {
  return String(value || "").trim();
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

function buildCompatibilityInput() {
  return {
    mode: "compatibility",
    self: {
      name: "사용자",
      gender: "male",
      calendarType: "solar",
      birthDate: "1991-02-20",
      birthTime: "08:40",
      timezone: "Asia/Seoul",
    },
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

async function consumeForSukuyo(base, authToken, requestId) {
  const body = {
    featureKey: "premium-sukuyo-report-compat",
    reason: "숙요점 프리미엄 PDF 궁합 리포트 생성",
    requestId,
  };

  const { response, data } = await requestJson(base, "/api/billing/coin-gate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      ...body,
      paymentMode: "COIN",
      forceDeduct: true,
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
  };
}

async function prepare(base, authToken, premiumAccessToken, input) {
  const sessionId = `sukuyo-e2e-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const body = {
    sessionId,
    featureKey: "premium-sukuyo-report-compat",
    premiumAccessToken,
    mode: "compatibility",
    reportMode: "compatibility",
    reportType: "sookyoPremium",
    self: input.self,
    partner: input.partner,
    user: input.self,
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
  const email = clean(args.email || process.env.TEST_LOGIN_ID || "test1234@example.com").toLowerCase();
  const password = clean(args.password || process.env.TEST_PASSWORD || "test!1234");

  printKeyValue("BASE", base);
  printKeyValue("EMAIL", email);

  const input = buildCompatibilityInput();

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

  const loginResult = await login(base, email, password);
  printKeyValue("LOGIN_STATUS", loginResult.status);
  ensure(loginResult.ok && clean(loginResult.token).length > 20, "로그인 실패 또는 토큰 누락", loginResult.data);

  const consumeRequestId = `sukuyo-e2e-consume-${Date.now().toString(36)}`;
  const consumeResult = await consumeForSukuyo(base, loginResult.token, consumeRequestId);
  printKeyValue("CONSUME_STATUS", consumeResult.status);
  printKeyValue("CONSUME_CODE", consumeResult.code || "");
  printKeyValue("CONSUME_CHARGED", consumeResult.chargedCoins);
  ensure(consumeResult.ok && consumeResult.premiumAccessToken, "코인 차감 또는 premium access token 발급 실패", consumeResult.data);

  const prepareResult = await prepare(base, loginResult.token, consumeResult.premiumAccessToken, input);
  const payload = prepareResult.data || {};
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

main().catch((error) => {
  const detail = error && error.details ? error.details : null;
  console.error("[smoke-sukuyo-premium-e2e] FAIL", {
    message: String(error?.message || error),
    details: detail,
  });
  process.exitCode = 1;
});
