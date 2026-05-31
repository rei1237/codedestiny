#!/usr/bin/env node

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const key = String(argv[i] || "");
    if (!key.startsWith("--")) continue;
    const next = String(argv[i + 1] || "");
    if (next && !next.startsWith("--")) {
      out[key.slice(2)] = next;
      i += 1;
      continue;
    }
    out[key.slice(2)] = "true";
  }
  return out;
}

function clean(value) {
  return String(value == null ? "" : value).trim();
}

function ensure(condition, message, details) {
  if (condition) return;
  const error = new Error(message);
  error.details = details;
  throw error;
}

async function parseJsonSafe(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (_) {
    return { raw: text.slice(0, 1600) };
  }
}

async function requestJson(base, path, init = {}) {
  const response = await fetch(`${base}${path}`, init);
  const data = await parseJsonSafe(response);
  return { response, data };
}

function extractToken(data) {
  const candidates = [
    data?.token,
    data?.accessToken,
    data?.jwt,
    data?.data?.token,
    data?.data?.accessToken,
    data?.data?.jwt,
  ];
  for (const candidate of candidates) {
    const token = clean(candidate);
    if (token.length > 20) return token;
  }
  return "";
}

function extractPoints(data) {
  const candidates = [
    data?.points,
    data?.user?.points,
    data?.data?.points,
    data?.data?.user?.points,
    data?.profile?.points,
    data?.data?.profile?.points,
  ];
  for (const value of candidates) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function printKv(label, value) {
  console.log(`${label}=${value}`);
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
    token: extractToken(data),
  };
}

async function fetchAuthMe(base, token) {
  const { response, data } = await requestJson(base, "/api/auth/me", {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  return {
    status: response.status,
    ok: response.ok,
    data,
    points: extractPoints(data),
  };
}

async function consumeZiwei(base, token, requestId) {
  const body = {
    featureKey: "premium_pdf_ziwei",
    reason: "자미두수 프리미엄 PDF 리포트 생성",
    requestId,
  };

  const { response, data } = await requestJson(base, "/api/fortune/pig-coin/consume", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  return {
    status: response.status,
    ok: response.ok,
    data,
    chargedCoins: Number(data?.chargedCoins || data?.data?.chargedCoins || 0),
    premiumAccessToken: clean(data?.premiumAccessToken || data?.data?.premiumAccessToken || ""),
  };
}

function buildBirthInput() {
  return {
    name: "Ziwei Retry QA",
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
}

function buildMockZiweiBase() {
  const names = ["명궁", "형제궁", "부부궁", "자녀궁", "재백궁", "질액궁", "천이궁", "노복궁", "관록궁", "전택궁", "복덕궁", "부모궁"];
  const keys = ["ming", "siblings", "spouse", "children", "wealth", "health", "travel", "friends", "career", "property", "fortune", "parents"];
  const branches = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"];
  const palaces = names.map((nameKo, idx) => ({
    key: keys[idx],
    nameKo,
    branch: branches[idx],
    mainStars: [{ name: idx % 2 === 0 ? "자미" : "무곡", strengthName: idx % 2 === 0 ? "묘" : "득", strengthSymbol: idx % 2 === 0 ? "◎" : "O" }],
    auxStars: [{ name: "문창", strengthName: "리", strengthSymbol: "▲" }],
    maleficStars: [{ name: "경양", strengthName: "함", strengthSymbol: "X" }],
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

async function prepareZiwei(base, token, premiumAccessToken, sessionId, opts = {}) {
  const body = {
    featureKey: "premium_pdf_ziwei",
    reportType: "ziweiPremium",
    sessionId,
    reportSessionId: sessionId,
    premiumAccessToken,
    paymentContext: {
      featureKey: "premium_pdf_ziwei",
      requestId: clean(opts.requestId),
      sessionId,
      reportSessionId: sessionId,
    },
    birthProfile: {
      name: "Ziwei Retry QA",
      gender: "male",
      year: 1991,
      month: 2,
      day: 20,
      hour: 7,
      minute: 0,
      calendarType: "solar",
      birthplace: "대한민국",
      birthIso: "1991-02-20 07:00",
    },
    birthInput: buildBirthInput(),
    ziweiBase: buildMockZiweiBase(),
  };

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
  if (premiumAccessToken) headers["x-premium-access-token"] = premiumAccessToken;
  if (opts.forceFailSecret) headers["x-ziwei-smoke-fail"] = opts.forceFailSecret;

  const { response, data } = await requestJson(base, "/api/ziwei-book/prepare", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  return {
    status: response.status,
    ok: response.ok,
    data,
  };
}

async function fetchResult(base, token, sessionId, reportId) {
  const q = [];
  if (clean(sessionId)) q.push(`sessionId=${encodeURIComponent(clean(sessionId))}`);
  if (clean(reportId)) q.push(`reportId=${encodeURIComponent(clean(reportId))}`);
  const path = `/api/ziwei-book/result${q.length ? `?${q.join("&")}` : ""}`;

  const { response, data } = await requestJson(base, path, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  return {
    status: response.status,
    ok: response.ok,
    data,
  };
}

async function pollResult(base, token, sessionId, reportId, maxAttempts = 4) {
  let last = null;
  for (let i = 1; i <= maxAttempts; i += 1) {
    const result = await fetchResult(base, token, sessionId, reportId);
    const chapters = Array.isArray(result?.data?.chapters) ? result.data.chapters.length : 0;
    const hasHtml = Boolean(clean(result?.data?.pdfReady?.html));
    if (result.ok && result.data?.ok === true && chapters >= 13 && hasHtml) {
      return { ok: true, attempt: i, result };
    }
    last = { attempt: i, result };
    await new Promise((resolve) => setTimeout(resolve, 900));
  }
  return { ok: false, last };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const base = clean(args.base || process.env.TEST_BASE_URL || "https://code-destiny.com").replace(/\/+$/, "");
  const email = clean(args.email || process.env.TEST_LOGIN_ID || "test1234@example.com").toLowerCase();
  const password = clean(args.password || process.env.TEST_PASSWORD || "test!1234");
  const forceFailSecret = clean(args.forceFailSecret || process.env.ZIWEI_SMOKE_FORCE_FAIL_SECRET || "");

  printKv("BASE", base);
  printKv("EMAIL", email);
  printKv("FORCE_FAIL_ENABLED", Boolean(forceFailSecret));

  ensure(Boolean(forceFailSecret), "ZIWEI_SMOKE_FORCE_FAIL_SECRET(또는 --forceFailSecret) 값이 필요합니다.");

  const loginResult = await login(base, email, password);
  printKv("LOGIN_STATUS", loginResult.status);
  ensure(loginResult.ok && loginResult.token, "로그인 실패 또는 토큰 누락", loginResult.data);

  const meBefore = await fetchAuthMe(base, loginResult.token);
  printKv("ME_BEFORE_STATUS", meBefore.status);
  printKv("POINTS_BEFORE", meBefore.points == null ? "NA" : meBefore.points);

  const requestId = `ziwei-retry-smoke-${Date.now().toString(36)}`;
  const consumeResult = await consumeZiwei(base, loginResult.token, requestId);
  printKv("CONSUME_STATUS", consumeResult.status);
  printKv("CONSUME_CHARGED", consumeResult.chargedCoins);
  ensure(consumeResult.ok && consumeResult.premiumAccessToken, "결제 또는 premiumAccessToken 발급 실패", consumeResult.data);

  const sessionId = `ziwei-retry-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  const forcedPrepare = await prepareZiwei(base, loginResult.token, consumeResult.premiumAccessToken, sessionId, {
    requestId,
    forceFailSecret,
  });

  printKv("FORCED_PREPARE_STATUS", forcedPrepare.status);
  printKv("FORCED_PREPARE_CODE", clean(forcedPrepare.data?.code));
  ensure(forcedPrepare.status === 500, "강제 500 시나리오 실패(HTTP 500 아님)", forcedPrepare.data);
  ensure(Boolean(forcedPrepare.data?.retryable), "강제 실패 응답이 retryable이 아님", forcedPrepare.data);

  const retryPrepare = await prepareZiwei(base, loginResult.token, consumeResult.premiumAccessToken, sessionId, {
    requestId,
  });

  printKv("RETRY_PREPARE_STATUS", retryPrepare.status);
  printKv("RETRY_PREPARE_OK", Boolean(retryPrepare.data?.ok));

  const retryReportId = clean(retryPrepare.data?.reportId || forcedPrepare.data?.reportId);

  let finalPayload = retryPrepare;
  const retryChapters = Array.isArray(retryPrepare?.data?.chapters) ? retryPrepare.data.chapters.length : 0;
  const retryHasHtml = Boolean(clean(retryPrepare?.data?.pdfReady?.html));

  if (!(retryPrepare.ok && retryPrepare.data?.ok === true && retryChapters >= 13 && retryHasHtml)) {
    const polled = await pollResult(base, loginResult.token, sessionId, retryReportId, 5);
    ensure(polled.ok, "result 복구 조회 실패", polled.last?.result?.data || polled.last);
    finalPayload = polled.result;
    printKv("RESULT_POLL_ATTEMPT", polled.attempt);
  }

  const chapters = Array.isArray(finalPayload?.data?.chapters) ? finalPayload.data.chapters.length : 0;
  const hasHtml = Boolean(clean(finalPayload?.data?.pdfReady?.html));
  const finalReportId = clean(finalPayload?.data?.reportId || retryReportId);

  ensure(finalPayload.ok && finalPayload.data?.ok === true, "최종 결과가 ok=true가 아님", finalPayload.data);
  ensure(chapters >= 13, "최종 챕터 수 부족", { chapters, payload: finalPayload.data });
  ensure(hasHtml, "최종 pdfReady.html 누락", finalPayload.data);

  const meAfter = await fetchAuthMe(base, loginResult.token);
  printKv("ME_AFTER_STATUS", meAfter.status);
  printKv("POINTS_AFTER", meAfter.points == null ? "NA" : meAfter.points);
  if (Number.isFinite(meBefore.points) && Number.isFinite(meAfter.points)) {
    printKv("POINTS_DELTA", Number(meAfter.points) - Number(meBefore.points));
  }

  printKv("REPORT_ID", finalReportId);
  printKv("CHAPTERS", chapters);
  printKv("HAS_PDF_HTML", hasHtml);
  printKv("E2E_RESULT", "PASS");
}

main().catch((error) => {
  console.error("[smoke-ziwei-paid-retry-recovery] FAIL", error?.message || error);
  if (error?.details) {
    try {
      console.error(JSON.stringify(error.details, null, 2));
    } catch (_) {
      console.error(String(error.details));
    }
  }
  process.exitCode = 1;
});
