#!/usr/bin/env node

const args = process.argv.slice(2);

function readArgValue(flag, fallback = "") {
  const index = args.findIndex((item) => item === flag);
  if (index < 0) return fallback;
  return String(args[index + 1] || "").trim() || fallback;
}

const base = String(
  readArgValue("--base")
  || process.env.TEST_BASE_URL
  || process.env.AUTH_API_BASE_URL
  || process.env.NEXT_PUBLIC_AUTH_API_BASE_URL
  || "https://code-destiny.com"
).replace(/\/+$/, "");

const now = Date.now();
const email = `qa.signup.${now}@example.com`;
const password = "QaSignup!23456";
const registerPayload = {
  name: "QA Signup User",
  email,
  password,
  birthDate: "1994-08-20",
  birthTime: "10:30",
  gender: "OTHER",
};

async function parseJsonSafe(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (e) {
    return { raw: text.slice(0, 500) };
  }
}

async function request(path, init = {}) {
  const response = await fetch(`${base}${path}`, init);
  const data = await parseJsonSafe(response);
  return { response, data };
}

function printResult(label, value) {
  console.log(`${label}=${value}`);
}

(async () => {
  printResult("BASE", base);
  printResult("TEST_EMAIL", email);

  const register = await request("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(registerPayload),
  });

  printResult("REGISTER_STATUS", register.response.status);
  printResult("REGISTER_CODE", register.data?.code || "");

  if (register.response.status !== 201) {
    console.error("[test-signup] register failed:", register.data);
    process.exit(2);
  }

  const debugUser = await request(`/api/debug/user-exists?email=${encodeURIComponent(email)}`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  printResult("DEBUG_USER_EXISTS_STATUS", debugUser.response.status);
  printResult("DEBUG_USER_EXISTS", String(Boolean(debugUser.data?.exists)));

  if (debugUser.response.status === 403) {
    console.error("[test-signup] /api/debug/user-exists is disabled. Set DEBUG_MODE=true on Worker to verify Mongo users read path.");
    process.exit(3);
  }

  if (!debugUser.response.ok || !debugUser.data?.exists) {
    console.error("[test-signup] user existence check failed:", debugUser.data);
    process.exit(4);
  }

  const duplicate = await request("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(registerPayload),
  });

  printResult("DUPLICATE_STATUS", duplicate.response.status);
  printResult("DUPLICATE_CODE", duplicate.data?.code || duplicate.data?.error || "");

  const duplicateCode = String(duplicate.data?.code || duplicate.data?.error || "").toLowerCase();
  const duplicateOk = duplicate.response.status === 409 && duplicateCode === "duplicate_email";

  if (!duplicateOk) {
    console.error("[test-signup] duplicate email check failed:", duplicate.data);
    process.exit(5);
  }

  const mongoWrite = await request("/api/debug/mongo-write-test", {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  printResult("MONGO_WRITE_TEST_STATUS", mongoWrite.response.status);
  printResult("MONGO_WRITE_TEST_OK", String(Boolean(mongoWrite.data?.ok)));

  if (!mongoWrite.response.ok || !mongoWrite.data?.ok) {
    console.error("[test-signup] mongo write/read/delete debug test failed:", mongoWrite.data);
    process.exit(6);
  }

  printResult("TEST_RESULT", "PASS");
  process.exit(0);
})().catch((error) => {
  console.error("[test-signup] unexpected error:", error);
  process.exit(1);
});
