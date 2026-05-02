const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

const BASE_URL = "https://code-destiny-web.bulegyung.workers.dev";
const PASSWORD = "QaTest!23456";

function nowSec() {
  return Math.floor(Date.now() / 1000);
}

async function postJson(url, body, headers = {}, timeoutMs = 25000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await res.text();
    let json;
    try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
    return { ok: res.ok, status: res.status, body: json };
  } finally {
    clearTimeout(timer);
  }
}

async function getJson(url, headers = {}, timeoutMs = 25000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "GET",
      headers,
      signal: controller.signal,
    });
    const text = await res.text();
    let json;
    try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
    return { ok: res.ok, status: res.status, body: json };
  } finally {
    clearTimeout(timer);
  }
}

async function retryCall(label, maxRetry, fn) {
  let last = null;
  for (let i = 1; i <= maxRetry; i += 1) {
    try {
      const res = await fn();
      if (res && res.ok) {
        return { attempt: i, res };
      }
      last = res;
      console.log(`${label}_RETRY attempt=${i} status=${res ? res.status : "unknown"}`);
    } catch (e) {
      last = { ok: false, status: -1, body: { message: String(e && e.message ? e.message : e) } };
      console.log(`${label}_RETRY attempt=${i} status=EXCEPTION`);
    }
  }
  const err = new Error(`${label} failed after retries`);
  err.last = last;
  throw err;
}

async function updatePointsTo9999(email) {
  dotenv.config({ path: path.join(process.cwd(), ".env.cloudflare.local") });
  const uri = String(process.env.MONGO_URI || "").replace(/^"|"$/g, "");
  const dbName = String(process.env.MONGO_DB_NAME || "").replace(/^"|"$/g, "") || undefined;
  if (!uri) {
    throw new Error("MONGO_URI missing in .env.cloudflare.local");
  }

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 12000, dbName });
  const User = mongoose.model(
    "UserE2E",
    new mongoose.Schema({ email: String, points: Number }, { collection: "users" }),
  );

  const result = await User.updateOne(
    { email: String(email).toLowerCase() },
    { $set: { points: 9999 } },
  );
  const doc = await User.findOne({ email: String(email).toLowerCase() }).lean();
  await mongoose.disconnect();

  return {
    matched: result.matchedCount || 0,
    points: doc && typeof doc.points !== "undefined" ? doc.points : null,
  };
}

(async () => {
  const email = `qa.e2e.${nowSec()}@example.com`;

  const register = await retryCall("REGISTER", 4, () => postJson(`${BASE_URL}/api/auth/register`, {
    name: "QA User",
    email,
    password: PASSWORD,
    birthDate: "1992-06-15",
    birthTime: "12:30",
    gender: "OTHER",
  }));

  const db = await updatePointsTo9999(email);
  if (db.matched < 1 || db.points !== 9999) {
    throw new Error(`DB update failed matched=${db.matched} points=${db.points}`);
  }

  const login = await retryCall("LOGIN", 8, () => postJson(`${BASE_URL}/api/auth/login`, {
    email,
    password: PASSWORD,
  }));
  const token = String(login.res.body && login.res.body.token ? login.res.body.token : "");
  if (!token) {
    throw new Error("Login token missing");
  }

  const authHeader = { Authorization: `Bearer ${token}` };
  const me = await retryCall("AUTH_ME", 8, () => getJson(`${BASE_URL}/api/auth/me`, authHeader));
  const prepare = await retryCall("PAY_PREPARE", 8, () => postJson(`${BASE_URL}/api/payments/prepare`, { paymentAmount: 3300 }, authHeader));
  const payMe = await retryCall("PAY_ME", 8, () => getJson(`${BASE_URL}/api/payments/me`, authHeader));

  const mePoints = Number((me.res.body && me.res.body.user && me.res.body.user.points) || -1);
  const payMePoints = Number((payMe.res.body && payMe.res.body.user && payMe.res.body.user.points) || -1);

  console.log(`TEST_EMAIL=${email}`);
  console.log(`REGISTER_STATUS=${register.res.status}`);
  console.log(`REGISTER_OK_ATTEMPT=${register.attempt}`);
  console.log(`DB_UPDATE_MATCHED=${db.matched}`);
  console.log(`DB_POINTS=${db.points}`);
  console.log(`LOGIN_STATUS=${login.res.status}`);
  console.log(`LOGIN_OK_ATTEMPT=${login.attempt}`);
  console.log(`AUTH_ME_STATUS=${me.res.status}`);
  console.log(`AUTH_ME_OK_ATTEMPT=${me.attempt}`);
  console.log(`AUTH_ME_POINTS=${mePoints}`);
  console.log(`PAY_PREPARE_STATUS=${prepare.res.status}`);
  console.log(`PAY_PREPARE_OK_ATTEMPT=${prepare.attempt}`);
  console.log(`PAY_PREPARE_CHARGE_POINTS=${prepare.res.body && prepare.res.body.order ? prepare.res.body.order.chargePoints : ""}`);
  console.log(`PAY_ME_STATUS=${payMe.res.status}`);
  console.log(`PAY_ME_OK_ATTEMPT=${payMe.attempt}`);
  console.log(`PAY_ME_POINTS=${payMePoints}`);

  fs.writeFileSync(path.join(process.cwd(), "._qa_test_email.tmp"), email);
  process.exit(0);
})().catch(async (error) => {
  console.error(error && error.message ? error.message : String(error));
  if (error && error.last) {
    console.error(JSON.stringify(error.last));
  }
  try { await mongoose.disconnect(); } catch (_) {}
  process.exit(1);
});
