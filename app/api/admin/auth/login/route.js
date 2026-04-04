// POST /api/admin/auth/login
// 관리자 이메일+비밀번호 인증 → flower_admin_token 쿠키 + 응답 body 발급
export const runtime = "nodejs";

import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { dbConnect } from "../../../../_lib/dbConnect.js";
import { getUserModel } from "../../../../_lib/models/UserModel.js";
import { generateFlowerAdminToken } from "../../../../_lib/flowerAdminToken.js";

const TOKEN_MAX_AGE_SEC = 8 * 60 * 60; // 8시간

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...extraHeaders,
    },
  });
}

function getClientIp(request) {
  return (
    request.headers.get("cf-connecting-ip") ||
    (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() ||
    "unknown"
  );
}

// 간단한 브루트포스 방어 (메모리 기반, Worker 재시작 시 초기화됨)
const _attempts = new Map();
const RATE_MAX = 5;
const RATE_WINDOW_MS = 30 * 60 * 1000;

function checkRate(key) {
  const now = Date.now();
  const e = _attempts.get(key);
  if (!e || now > e.resetAt) return true;
  return e.count < RATE_MAX;
}

function recordFail(key) {
  const now = Date.now();
  const e = _attempts.get(key);
  if (!e || now > e.resetAt) {
    _attempts.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
  } else {
    e.count += 1;
  }
}

function notFound() {
  return json({ message: "Not found" }, 404);
}

export async function POST(request) {
  try {
    const ip = getClientIp(request);
    let body;
    try { body = await request.json(); } catch { return notFound(); }

    const email = String(body?.email || "").trim().toLowerCase();
    const password = String(body?.password || "");
    if (!email || !password) return notFound();

    const key = `${ip}|${email}`;
    if (!checkRate(key)) return notFound();

    await dbConnect();
    const User = await getUserModel();

    const user = await User.findOne({ email, role: "admin" }).select("+passwordHash").lean();
    if (!user || !user.passwordHash) {
      recordFail(key);
      return notFound();
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      recordFail(key);
      return notFound();
    }

    const token = await generateFlowerAdminToken();
    const csrf = crypto.randomBytes(24).toString("hex");

    const res = new Response(
      JSON.stringify({ ok: true, flow: "done", token }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store",
        },
      }
    );

    // fortune_auth_token: HttpOnly, SameSite=Lax
    res.headers.append(
      "Set-Cookie",
      `fortune_auth_token=${encodeURIComponent(token)}; HttpOnly; Path=/; Max-Age=${TOKEN_MAX_AGE_SEC}; SameSite=Lax`
    );
    // fortune_csrf_token: 클라이언트에서 읽어 x-csrf-token 헤더로 전송
    res.headers.append(
      "Set-Cookie",
      `fortune_csrf_token=${csrf}; Path=/; Max-Age=${TOKEN_MAX_AGE_SEC}; SameSite=Lax`
    );

    return res;
  } catch {
    return notFound();
  }
}

export async function GET() {
  return json({ message: "Not found" }, 404);
}
