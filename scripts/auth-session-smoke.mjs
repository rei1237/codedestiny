#!/usr/bin/env node

const args = process.argv.slice(2);

function readArgValue(flag, fallback = "") {
  const index = args.findIndex((item) => item === flag);
  if (index < 0) return fallback;
  return String(args[index + 1] || "").trim() || fallback;
}

const base = String(
  readArgValue("--base")
  || process.env.AUTH_SMOKE_BASE
  || process.env.TEST_BASE_URL
  || "https://code-destiny.com"
).replace(/\/+$/, "");

const now = Date.now();
const email = `qa.auth.session.${now}@example.com`;
const password = "QaAuth!23456";
const wrongPassword = "QaAuthWrong!23456";

function parseJsonSafe(text) {
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text.slice(0, 500) };
  }
}

function updateCookieJar(jar, response) {
  const setCookies = typeof response.headers.getSetCookie === "function"
    ? response.headers.getSetCookie()
    : [];

  for (const header of setCookies) {
    const cookieLine = String(header || "").trim();
    if (!cookieLine) continue;

    const segments = cookieLine.split(";").map((segment) => segment.trim());
    const first = segments[0] || "";
    const eqIndex = first.indexOf("=");
    if (eqIndex <= 0) continue;

    const name = first.slice(0, eqIndex).trim();
    const value = first.slice(eqIndex + 1);
    const maxAgeSegment = segments.find((segment) => /^max-age=/i.test(segment));
    const maxAge = maxAgeSegment ? Number(maxAgeSegment.split("=")[1]) : null;

    if (!value || maxAge === 0) {
      delete jar[name];
      continue;
    }

    jar[name] = value;
  }
}

function buildCookieHeader(jar) {
  return Object.entries(jar)
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}

async function request(path, { method = "GET", body, headers = {} } = {}, jar) {
  const requestHeaders = {
    Accept: "application/json",
    ...headers,
  };

  const cookieHeader = buildCookieHeader(jar);
  if (cookieHeader) {
    requestHeaders.Cookie = cookieHeader;
  }

  const response = await fetch(`${base}${path}`, {
    method,
    headers: requestHeaders,
    body,
    redirect: "manual",
  });

  updateCookieJar(jar, response);

  const raw = await response.text();
  const data = parseJsonSafe(raw);

  return {
    status: response.status,
    data,
  };
}

function shouldRetryStatus(status) {
  const value = Number(status || 0);
  return value === 408 || value === 425 || value === 429 || (value >= 500 && value <= 504);
}

async function requestWithRetry(path, options, jar, maxAttempts = 3) {
  let last = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const result = await request(path, options, jar);
    last = result;
    if (!shouldRetryStatus(result.status) || attempt >= maxAttempts) {
      return result;
    }
  }
  return last;
}

function assert(condition, message, detail) {
  if (condition) return;
  console.error(`[auth-session-smoke] FAIL: ${message}`);
  if (detail !== undefined) {
    console.error(detail);
  }
  process.exit(2);
}

function print(label, value) {
  console.log(`${label}=${value}`);
}

(async () => {
  const jar = {};

  print("BASE", base);
  print("TEST_EMAIL", email);

  const invalidRegister = await requestWithRetry("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "QA Session",
      email: "not-an-email",
      password,
      birthDate: "1993-10-01",
      birthTime: "11:20",
      gender: "OTHER",
    }),
  }, jar);
  print("INVALID_REGISTER_STATUS", invalidRegister.status);
  assert(invalidRegister.status === 400, "invalid register should be 400", invalidRegister.data);

  const register = await requestWithRetry("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "QA Session",
      email,
      password,
      birthDate: "1993-10-01",
      birthTime: "11:20",
      gender: "OTHER",
    }),
  }, jar);
  print("REGISTER_STATUS", register.status);
  assert(register.status === 201, "register should be 201", register.data);

  const duplicateRegister = await requestWithRetry("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "QA Session",
      email,
      password,
      birthDate: "1993-10-01",
      birthTime: "11:20",
      gender: "OTHER",
    }),
  }, jar);
  print("DUPLICATE_REGISTER_STATUS", duplicateRegister.status);
  assert(duplicateRegister.status === 409, "duplicate register should be 409", duplicateRegister.data);

  const logoutAfterRegister = await requestWithRetry("/api/auth/logout", {
    method: "POST",
  }, jar);
  print("POST_REGISTER_LOGOUT_STATUS", logoutAfterRegister.status);
  assert(logoutAfterRegister.status === 200, "logout after register should be 200", logoutAfterRegister.data);

  const wrongLogin = await requestWithRetry("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: wrongPassword }),
  }, jar);
  print("WRONG_LOGIN_STATUS", wrongLogin.status);
  assert(wrongLogin.status === 401, "wrong password login should be 401", wrongLogin.data);

  const login = await requestWithRetry("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  }, jar);
  print("LOGIN_STATUS", login.status);
  assert(login.status === 200, "login should be 200", login.data);

  const meAuthenticated = await requestWithRetry("/api/auth/me", { method: "GET" }, jar);
  print("ME_AUTH_STATUS", meAuthenticated.status);
  assert(
    meAuthenticated.status === 200
      && meAuthenticated.data
      && meAuthenticated.data.authenticated !== false
      && meAuthenticated.data.user,
    "me after login should return authenticated user",
    meAuthenticated.data,
  );

  const logout = await requestWithRetry("/api/auth/logout", { method: "POST" }, jar);
  print("LOGOUT_STATUS", logout.status);
  assert(logout.status === 200, "logout should be 200", logout.data);

  const meAfterLogout = await requestWithRetry("/api/auth/me", { method: "GET" }, jar);
  print("ME_AFTER_LOGOUT_STATUS", meAfterLogout.status);
  const unauthenticated = (
    meAfterLogout.status === 401
    || (
      meAfterLogout.status === 200
      && (
        meAfterLogout.data?.authenticated === false
        || meAfterLogout.data?.ok === false
      )
    )
  );
  assert(unauthenticated, "me after logout should be unauthenticated", meAfterLogout.data);

  print("TEST_RESULT", "PASS");
})().catch((error) => {
  console.error("[auth-session-smoke] unexpected error:", error);
  process.exit(1);
});
