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

function hasBearerToken(payload) {
  const token = clean(payload?.token || payload?.accessToken || payload?.jwt);
  return token.length > 20 ? token : "";
}

function buildBirthPayload() {
  return {
    name: "E2E Astro QA",
    gender: "female",
    birthDate: "1991-02-20",
    birthYear: 1991,
    birthMonth: 2,
    birthDay: 20,
    birthTime: "07:00",
    birthHour: 7,
    birthMinute: 0,
    timezone: "Asia/Seoul",
    birthPlace: "Seoul",
    latitude: 37.5665,
    longitude: 126.978,
    isTimeUnknown: false,
  };
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

async function login(base, email, password) {
  const payload = { email, password };
  const { response, data } = await requestJson(base, "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return {
    status: response.status,
    ok: response.ok,
    data,
    token: hasBearerToken(data),
  };
}

async function consumeForAstro(base, authToken, requestId) {
  const body = {
    featureKey: "premium-astrology-report",
    reason: "점성술 프리미엄 PDF 리포트 생성",
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

async function prepareAstro(base, authToken, premiumAccessToken, westernChart = null) {
  const birthInput = buildBirthPayload();
  const sessionId = `astro-e2e-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const reportId = sessionId;
  const chartPayload = westernChart?.data && typeof westernChart.data === "object" ? westernChart.data : westernChart;
  const body = {
    featureKey: "premium-astrology-report",
    sessionId,
    reportSessionId: sessionId,
    reportId,
    premiumAccessToken,
    birthInput,
    ...(chartPayload && typeof chartPayload === "object" ? { swissChart: chartPayload } : {}),
    profile: {
      name: birthInput.name,
      gender: birthInput.gender,
      birth: {
        year: birthInput.birthYear,
        month: birthInput.birthMonth,
        day: birthInput.birthDay,
        hour: birthInput.birthHour,
        minute: birthInput.birthMinute,
      },
      location: {
        label: birthInput.birthPlace,
        lat: birthInput.latitude,
        lon: birthInput.longitude,
        tz: birthInput.timezone,
      },
    },
  };

  const { response, data } = await requestJson(base, "/api/astro/premium/prepare", {
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
    headers: {
      errorCode: clean(response.headers.get("x-error-code")),
      cfRay: clean(response.headers.get("cf-ray")),
    },
    data,
    sessionId,
    reportId,
  };
}

async function fetchWesternChart(base, authToken, birthInput) {
  const body = {
    year: Number(birthInput.birthYear),
    month: Number(birthInput.birthMonth),
    day: Number(birthInput.birthDay),
    hour: Number(birthInput.birthHour),
    minute: Number(birthInput.birthMinute || 0),
    timezone: 9,
    lat: Number(birthInput.latitude),
    lon: Number(birthInput.longitude),
  };
  const { response, data } = await requestJson(base, "/api/astro/western-chart", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify(body),
  });

  return {
    status: response.status,
    ok: response.ok,
    data,
  };
}

async function fetchExecutionStatus(base, authToken, sessionId, reportId) {
  const params = new URLSearchParams();
  if (sessionId) params.set("sessionId", sessionId);
  if (reportId) params.set("reportId", reportId);
  const path = `/api/billing/executions/status${params.toString() ? `?${params.toString()}` : ""}`;
  const { response, data } = await requestJson(base, path, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  });
  const execution = data?.data?.execution && typeof data.data.execution === "object"
    ? data.data.execution
    : data?.execution;

  return {
    status: response.status,
    ok: response.ok,
    data,
    execution: execution && typeof execution === "object" ? execution : null,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const base = clean(args.base || process.env.AUTH_SMOKE_BASE || process.env.TEST_BASE_URL || "https://code-destiny.com").replace(/\/+$/, "");
  const email = clean(args.email || process.env.TEST_LOGIN_ID || "test1234@example.com").toLowerCase();
  const password = clean(args.password || process.env.TEST_PASSWORD || "test!1234");

  printKeyValue("BASE", base);
  printKeyValue("EMAIL", email);

  const loginResult = await login(base, email, password);
  printKeyValue("LOGIN_STATUS", loginResult.status);
  ensure(loginResult.ok && loginResult.token, "로그인 실패 또는 토큰 누락", loginResult.data);

  const birthInput = buildBirthPayload();
  const western = await fetchWesternChart(base, loginResult.token, birthInput);
  const westernPlanets = western?.data?.planets && typeof western.data.planets === "object"
    ? Object.keys(western.data.planets).length
    : 0;
  const westernAspects = Array.isArray(western?.data?.aspects) ? western.data.aspects.length : 0;
  const westernHouses = Array.isArray(western?.data?.houseCusps) ? western.data.houseCusps.length : 0;

  printKeyValue("WESTERN_STATUS", western.status);
  printKeyValue("WESTERN_PLANETS", westernPlanets);
  printKeyValue("WESTERN_ASPECTS", westernAspects);
  printKeyValue("WESTERN_HOUSES", westernHouses);
  ensure(western.ok && westernPlanets >= 7 && westernHouses === 12, "western-chart 계산 실패", western.data);

  const consumeRequestId = `astro-e2e-consume-${Date.now().toString(36)}`;
  const consumeResult = await consumeForAstro(base, loginResult.token, consumeRequestId);
  printKeyValue("CONSUME_STATUS", consumeResult.status);
  printKeyValue("CONSUME_CODE", consumeResult.code || "");
  printKeyValue("CONSUME_CHARGED", consumeResult.chargedCoins);

  ensure(
    consumeResult.ok && consumeResult.premiumAccessToken,
    "유료 처리 또는 premium access token 발급 실패",
    consumeResult.data,
  );

  const prepareResult = await prepareAstro(base, loginResult.token, consumeResult.premiumAccessToken, western.data);
  printKeyValue("PREPARE_STATUS", prepareResult.status);
  printKeyValue("PREPARE_ERROR_CODE", prepareResult.headers.errorCode || "");
  printKeyValue("PREPARE_CF_RAY", prepareResult.headers.cfRay || "");

  const payload = prepareResult.data || {};
  const chapters = Array.isArray(payload.chapters) ? payload.chapters : [];
  const manuscriptSource = clean(payload.manuscriptSource).toLowerCase();
  const calcMode = clean(payload?.localAstroChartJson?.calculationMode).toLowerCase();
  const hasPdfHtml = Boolean(clean(payload?.pdfReady?.html));
  const pdfUrl = clean(payload?.pdfReady?.pdfUrl || payload?.pdfUrl);
  const htmlUrl = clean(payload?.pdfReady?.htmlUrl || payload?.htmlUrl);
  const mimeType = clean(payload?.pdfReady?.mimeType);
  const masterSchema = clean(payload?.astroMasterJson?.schemaVersion);
  const masterValidationOk = Boolean(payload?.masterJsonValidation?.ok);
  const validationOk = Boolean(payload?.validation?.ok);
  const localDraftChapterCount = Number(payload?.localDraftChapterCount || 0);
  const localAssembly = payload?.localAssembly && typeof payload.localAssembly === "object"
    ? payload.localAssembly
    : {};
  const pdfLocalAssembly = payload?.pdfReady?.localAssembly && typeof payload.pdfReady.localAssembly === "object"
    ? payload.pdfReady.localAssembly
    : {};
  const pdfCompletionValidationOk = Boolean(payload?.pdfCompletionValidation?.ok || payload?.pdfReady?.pdfCompletionValidation?.ok);

  printKeyValue("PREPARE_OK", Boolean(payload.ok));
  printKeyValue("CHAPTERS", chapters.length);
  printKeyValue("MANUSCRIPT_SOURCE", manuscriptSource);
  printKeyValue("LOCAL_DRAFT_CHAPTERS", localDraftChapterCount);
  printKeyValue("LOCAL_ASSEMBLY_ENABLED", localAssembly.enabled === true);
  printKeyValue("LOCAL_ASSEMBLY_CHAPTERS", Number(localAssembly.chapterCount || 0));
  printKeyValue("LOCAL_ASSEMBLY_EXTERNAL_GENERATION", localAssembly.externalGeneration === true);
  printKeyValue("SEED_CALC_MODE", calcMode);
  printKeyValue("MASTER_SCHEMA", masterSchema);
  printKeyValue("MASTER_VALIDATION_OK", masterValidationOk);
  printKeyValue("VALIDATION_OK", validationOk);
  printKeyValue("PDF_COMPLETION_VALIDATION_OK", pdfCompletionValidationOk);
  printKeyValue("HAS_PDF_HTML", hasPdfHtml);
  printKeyValue("PDF_URL", pdfUrl);
  printKeyValue("HTML_URL", htmlUrl);
  printKeyValue("MIME_TYPE", mimeType);
  const sessionId = clean(payload.sessionId || prepareResult.sessionId);
  const reportId = clean(payload.reportId || prepareResult.reportId);
  printKeyValue("SESSION_ID", sessionId);
  printKeyValue("REPORT_ID", reportId);

  if (!prepareResult.ok || !payload.ok) {
    try {
      const executionStatus = await fetchExecutionStatus(base, loginResult.token, sessionId, reportId);
      const execution = executionStatus.execution || {};
      printKeyValue("EXECUTION_STATUS_HTTP", executionStatus.status);
      printKeyValue("EXECUTION_STATUS", clean(execution.status));
      printKeyValue("EXECUTION_PREMIUM_STATUS", clean(execution.premiumStatus));
      printKeyValue("EXECUTION_REFUND_STATUS", clean(execution.refundStatus));
      printKeyValue("EXECUTION_REASON_CODE", clean(execution.reasonCode));
      printKeyValue("EXECUTION_COIN_REFUNDED", Boolean(execution?.compensation?.coinRefunded));
    } catch (statusError) {
      printKeyValue("EXECUTION_STATUS_ERROR", clean(statusError?.message || statusError));
    }
  }

  ensure(prepareResult.ok && payload.ok, "점성술 prepare 실패", payload);
  ensure(chapters.length === 12, "챕터 수가 12가 아님", { chapterCount: chapters.length, payload });
  ensure(manuscriptSource === "local-assembled", "ASTRO manuscript source is not local-assembled", { manuscriptSource, payload });
  ensure(localDraftChapterCount === 12, "ASTRO local draft chapter count must be 12", { localDraftChapterCount, payload });
  ensure(localAssembly.enabled === true, "ASTRO local assembly flag missing", { localAssembly, payload });
  ensure(localAssembly.externalGeneration === false, "ASTRO external generation must be blocked", { localAssembly, payload });
  ensure(Number(localAssembly.chapterCount || 0) === 12, "ASTRO local assembly chapter count must be 12", { localAssembly, payload });
  ensure(Number(localAssembly.expectedChapterCount || 0) === 12, "ASTRO local assembly expected chapter count must be 12", { localAssembly, payload });
  ensure(clean(localAssembly.templateVersion), "ASTRO local assembly template version missing", { localAssembly, payload });
  ensure(pdfLocalAssembly.enabled === true, "ASTRO pdfReady local assembly flag missing", { pdfLocalAssembly, payload });
  ensure(pdfLocalAssembly.externalGeneration === false, "ASTRO pdfReady external generation must be blocked", { pdfLocalAssembly, payload });
  ensure(calcMode === "full", "Swiss 기반 full 계산 seed 아님", { calcMode, payload });
  ensure(masterSchema === "astro-premium-master-json.v1", "점성술 마스터 JSON 스키마 누락", payload?.astroMasterJson || payload);
  ensure(masterValidationOk, "점성술 마스터 JSON 검증 실패", payload?.masterJsonValidation || payload);
  ensure(validationOk, "최종 원고 검증 실패", payload?.validation || payload);
  ensure(pdfCompletionValidationOk, "ASTRO PDF completion validation failed", payload?.pdfCompletionValidation || payload?.pdfReady?.pdfCompletionValidation || payload);
  ensure(hasPdfHtml, "PDF html 누락", payload?.pdfReady || payload);
  ensure(/\/api\/premium\/pdf-archive\/.+[?&]format=pdf/i.test(pdfUrl), "PDF archive URL 형식 오류", payload?.pdfReady || payload);
  ensure(/\/api\/premium\/pdf-archive\/.+[?&]format=html/i.test(htmlUrl), "HTML archive URL 형식 오류", payload?.pdfReady || payload);
  ensure(mimeType === "application/pdf", "PDF mimeType 오류", payload?.pdfReady || payload);

  printKeyValue("E2E_RESULT", "PASS");
}

main().catch((error) => {
  const detail = error && error.details ? error.details : null;
  console.error("[smoke-astro-premium-e2e] FAIL", {
    message: String(error?.message || error),
    details: detail,
  });
  process.exitCode = 1;
});
