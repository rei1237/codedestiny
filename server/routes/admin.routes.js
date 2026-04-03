const express = require("express");
const mongoose = require("mongoose");
const crypto = require("crypto");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");

const User = require("../models/User");
const AdminAuditLog = require("../models/AdminAuditLog");
const { requireAuth, requireAdmin } = require("../middleware/auth.middleware");

// 2FA/TOTP
let otplib = null;
let qrcode = null;
try {
  // otplib/qrcode는 관리자 인증 흐름에만 사용한다.
  // dependency 설치 전에는 서버 기동이 깨질 수 있으니 try/catch로 가드한다.
  otplib = require("otplib");
  qrcode = require("qrcode");
} catch (_) {}

const router = express.Router();
const ADMIN_SECURITY_LEVEL = String(process.env.ADMIN_SECURITY_LEVEL || "relaxed").toLowerCase();
const IS_STRICT_SECURITY = ADMIN_SECURITY_LEVEL === "strict";
const DEFAULT_ADMIN_ENTRY_PASSWORD_SHA256 = "f76a173ef47f93eec43168e10fc32dcbefb2d32200c44cbd33e4f0324437fb4e";

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function verifyAdminEntryPassword(rawInput) {
  const input = String(rawInput || "");
  if (!input) return false;

  const expectedHex = String(process.env.ADMIN_ENTRY_PASSWORD_HASH || DEFAULT_ADMIN_ENTRY_PASSWORD_SHA256)
    .trim()
    .toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(expectedHex)) return false;

  const inputHex = crypto.createHash("sha256").update(input, "utf8").digest("hex");
  const expectedBuf = Buffer.from(expectedHex, "hex");
  const inputBuf = Buffer.from(inputHex, "hex");
  if (expectedBuf.length !== inputBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, inputBuf);
}

function getCookieValue(req, cookieName) {
  const raw = req.headers.cookie || "";
  if (!raw) return null;
  const parts = raw.split(";").map((v) => v.trim());
  for (const p of parts) {
    const [k, ...rest] = p.split("=");
    if (k === cookieName) return decodeURIComponent(rest.join("="));
  }
  return null;
}

function setCookie(res, name, value, options = {}) {
  // 보안 요구사항:
  // - HttpOnly: 토큰 탈취/XSS 대응
  // - Secure: HTTPS 강제(운영 환경에서 true 권장)
  // - SameSite=Strict: CSRF 완화
  // - maxAge: 세션 만료 정책 준수
  res.cookie(name, value, {
    httpOnly: options.httpOnly !== false,
    // relaxed 모드에서는 로컬(http) 테스트를 위해 secure=false 허용
    secure: options.secure !== false && IS_STRICT_SECURITY,
    sameSite: IS_STRICT_SECURITY ? "strict" : "lax",
    path: "/",
    maxAge: options.maxAge,
  });
}

function denyNotFound(res) {
  return res.status(404).json({ message: "Not found" });
}

function getClientIp(req) {
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string" && xff.trim()) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const xrip = req.headers["x-real-ip"];
  if (typeof xrip === "string" && xrip.trim()) return xrip.trim();
  return req.ip || "0.0.0.0";
}

function parseAllowedIps(raw) {
  return String(raw || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function ipWhitelistMiddleware(req, res, next) {
  // strict 모드: 기본 deny
  // relaxed 모드: 설정이 없으면 allow (개발/초기 운영 편의)
  const allowed = parseAllowedIps(process.env.ADMIN_ALLOWED_IPS);
  if (!IS_STRICT_SECURITY && !allowed.length) return next();
  if (!allowed.length) {
    // 개발 편의를 위해 localhost만 허용(운영에서는 ADMIN_ALLOWED_IPS를 반드시 설정)
    const ip = getClientIp(req);
    const isLocal = ip === "127.0.0.1" || ip === "::1" || ip.startsWith("::ffff:127.");
    if (!isLocal) return denyNotFound(res);
    return next();
  }

  const ip = getClientIp(req);
  if (!allowed.includes(ip)) return denyNotFound(res);
  return next();
}

// 관리자 API 요청 빈도 제한 (분당 60회)
const adminMinuteLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: IS_STRICT_SECURITY ? 60 : 300,
  standardHeaders: true,
  legacyHeaders: false,
});

// Double Submit Cookie 기반 CSRF 검증
function csrfTokenMiddleware(req, res, next) {
  if (!IS_STRICT_SECURITY) return next();
  if (req.method !== "POST") return next();
  if (req.path === "/entry/password") return next();

  const cookieCsrf = getCookieValue(req, "fortune_csrf_token");
  const headerCsrf = req.headers["x-csrf-token"];
  if (!cookieCsrf || !headerCsrf || String(cookieCsrf) !== String(headerCsrf)) {
    // CSRF 실패는 시스템 정보 노출을 피하기 위해 404로 위장한다.
    return denyNotFound(res);
  }
  return next();
}

// 로그인 실패 잠금: IP+이메일 기준 5회 실패 시 30분 잠금
const loginFailures = new Map(); // key -> { count, lockedUntil }
const unlockCodes = new Map(); // key -> { code, expiresAt }

function getLoginKey({ ip, email }) {
  return `${ip}|${String(email || "").trim().toLowerCase()}`;
}

function isLocked(loginKey) {
  const rec = loginFailures.get(loginKey);
  if (!rec) return false;
  return rec.lockedUntil && Date.now() < rec.lockedUntil;
}

function recordFailure(loginKey) {
  const rec = loginFailures.get(loginKey) || { count: 0, lockedUntil: null };
  rec.count = Number(rec.count || 0) + 1;
  if (rec.count >= 5) {
    rec.lockedUntil = Date.now() + 30 * 60 * 1000;
  }
  loginFailures.set(loginKey, rec);
  return rec;
}

function clearFailures(loginKey) {
  loginFailures.delete(loginKey);
}

async function sendUnlockEmail({ email, code }) {
  // 환경변수가 없으면 이메일 발송 대신 404로 종료(정보 노출 방지)
  const host = process.env.ADMIN_SMTP_HOST;
  const port = Number(process.env.ADMIN_SMTP_PORT || 587);
  const user = process.env.ADMIN_SMTP_USER;
  const pass = process.env.ADMIN_SMTP_PASS;
  const from = process.env.ADMIN_SMTP_FROM;
  if (!host || !user || !pass || !from) return false;

  // lazy require (서버에서 SMTP 설정이 없으면 dependency 실패를 줄인다)
  let nodemailer = null;
  try {
    nodemailer = require("nodemailer");
  } catch (_) {}
  if (!nodemailer) return false;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from,
    to: email,
    subject: "잠금 해제 인증 코드",
    text: `인증 코드는 ${code} 입니다. 유효 시간은 30분입니다.`,
  });
  return true;
}

function signAccessToken(user) {
  const secret = process.env.JWT_SECRET || "dev-secret";
  return jwt.sign(
    { userId: String(user._id), email: user.email, role: user.role },
    secret,
    { expiresIn: "15m", issuer: "code-destiny-admin" },
  );
}

function signRefreshToken(user) {
  const secret = process.env.JWT_SECRET || "dev-secret";
  return jwt.sign(
    { userId: String(user._id), email: user.email, role: user.role },
    secret,
    { expiresIn: "7d", issuer: "code-destiny-admin" },
  );
}

function signPending2faToken(user) {
  const secret = process.env.JWT_SECRET || "dev-secret";
  return jwt.sign(
    { userId: String(user._id), role: user.role, purpose: "admin-2fa-pending" },
    secret,
    { expiresIn: "5m", issuer: "code-destiny-admin" },
  );
}

function sha256(input) {
  return crypto.createHash("sha256").update(String(input || ""), "utf8").digest("hex");
}

async function issueSessionTokens(res, user) {
  const access = signAccessToken(user);
  const refresh = signRefreshToken(user);
  const refreshHash = sha256(refresh);

  user.adminRefreshTokenHash = refreshHash;
  user.adminLastActivityAt = new Date();
  await user.save().catch(() => {});

  const accessMaxAge = 15 * 60 * 1000;
  const refreshMaxAge = 7 * 24 * 60 * 60 * 1000;

  setCookie(res, "fortune_auth_token", access, { maxAge: accessMaxAge, httpOnly: true });
  // refresh는 서버에서만 사용되므로 HttpOnly로 유지
  setCookie(res, "fortune_auth_refresh", refresh, { maxAge: refreshMaxAge, httpOnly: true });
  // 꽃 버튼 노출을 위해 role은 클라이언트 JS에서 읽을 수 있어야 한다.
  // (보안 요구가 HttpOnly+Strict 세션 쿠키를 중심으로 하므로 role 쿠키는 非 HttpOnly로 둔다.)
  setCookie(res, "fortune_auth_role", "admin", { maxAge: accessMaxAge, httpOnly: false, secure: true });

  // CSRF 쿠키(서버는 HttpOnly 없이 발급한다. Double Submit Cookie 패턴)
  const csrf = crypto.randomBytes(24).toString("hex");
  setCookie(res, "fortune_csrf_token", csrf, { maxAge: refreshMaxAge, httpOnly: false, secure: true });
  return true;
}

function extractPending2faToken(req) {
  return getCookieValue(req, "fortune_admin_2fa_pending");
}

function extractAccessTokenFromCookie(req) {
  return getCookieValue(req, "fortune_auth_token");
}

function decodeAccessToken(accessToken) {
  const secret = process.env.JWT_SECRET || "dev-secret";
  const payload = jwt.verify(accessToken, secret);
  return payload && payload.role === "admin" ? payload : null;
}

router.use(ipWhitelistMiddleware);
router.use(adminMinuteLimiter);
router.use(csrfTokenMiddleware);

// -------------------------------------------------------------------------
// 관리자 진입(꽃 버튼 클릭) - 비밀 경로 리다이렉트만 수행
// -------------------------------------------------------------------------
router.get("/entry", async (req, res) => {
  try {
    const expected = String(process.env.ADMIN_SECRET_HASH || "").trim();
    if (!expected) return denyNotFound(res);

    const accessToken = extractAccessTokenFromCookie(req);
    if (!accessToken) {
      // 사용성 개선: 로그인 전에는 비밀 경로의 login 페이지로 이동
      return res.redirect(302, `/${expected}/login`);
    }

    const payload = decodeAccessToken(accessToken);
    if (!payload) {
      return res.redirect(302, `/${expected}/login`);
    }

    // 보안: Location에 관리자 문자열/정보 노출 없이 해시 경로로만 이동한다.
    return res.redirect(302, `/${expected}/dashboard`);
  } catch {
    const expected = String(process.env.ADMIN_SECRET_HASH || "").trim();
    if (!expected) return denyNotFound(res);
    return res.redirect(302, `/${expected}/login`);
  }
});

router.post("/entry/password", async (req, res) => {
  try {
    const expected = String(process.env.ADMIN_SECRET_HASH || "").trim();
    if (!expected) return denyNotFound(res);

    const password = String(req.body?.password || "");
    if (!verifyAdminEntryPassword(password)) return denyNotFound(res);

    return res.status(200).json({
      ok: true,
      nextUrl: `/${expected}/login`,
    });
  } catch {
    return denyNotFound(res);
  }
});

// -------------------------------------------------------------------------
// 관리자 인증 유틸 API
// -------------------------------------------------------------------------
router.get("/auth/csrf", async (req, res) => {
  const csrf = crypto.randomBytes(24).toString("hex");
  // CSRF 쿠키는 HttpOnly를 false로 둔다(클라이언트가 x-csrf-token 헤더로 함께 전송)
  setCookie(res, "fortune_csrf_token", csrf, { maxAge: 7 * 24 * 60 * 60 * 1000, httpOnly: false, secure: true });
  return res.status(200).json({ ok: true });
});

router.get("/auth/me", requireAuth, requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.auth.userId).select({ passwordHash: 0, __v: 0 }).lean();
    return res.status(200).json({
      ok: true,
      user: {
        id: String(user?._id || req.auth.userId),
        name: user?.name || "사용자",
        email: user?.email || "",
        role: "admin",
      },
    });
  } catch {
    return denyNotFound(res);
  }
});

router.post("/auth/logout", requireAuth, requireAdmin, async (req, res) => {
  try {
    // refresh token 단일 세션 강화를 위해 서버에 저장된 hash도 제거
    const user = await User.findById(req.auth.userId).lean();
    if (user) {
      await User.findByIdAndUpdate(req.auth.userId, {
        $set: { adminRefreshTokenHash: "", adminLastActivityAt: null },
      }).catch(() => {});
    }
    res.clearCookie("fortune_auth_token", { path: "/" });
    res.clearCookie("fortune_auth_refresh", { path: "/" });
    res.clearCookie("fortune_auth_role", { path: "/" });
    res.clearCookie("fortune_admin_2fa_pending", { path: "/" });
    res.clearCookie("fortune_csrf_token", { path: "/" });
    await AdminAuditLog.create({
      action: "logout",
      actorUserId: req.auth.userId,
      ip: getClientIp(req),
      userAgent: String(req.headers["user-agent"] || ""),
      meta: {},
    }).catch(() => {});
    return res.status(200).json({ ok: true });
  } catch {
    return denyNotFound(res);
  }
});

// -------------------------------------------------------------------------
// 1단계: 이메일+비밀번호 로그인 (관리자 전용)
// - 5회 실패 시 30분 잠금
// - 잠금 해제는 이메일 인증으로 처리(환경설정 필요)
// - 실패/잠금/권한 없음은 모두 404로 위장
// -------------------------------------------------------------------------
router.post("/auth/login", async (req, res) => {
  try {
    const ip = getClientIp(req);
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    if (!email || !password) return denyNotFound(res);

    // 잠금 상태 확인
    const loginKey = getLoginKey({ ip, email });
    if (IS_STRICT_SECURITY && isLocked(loginKey)) return denyNotFound(res);

    const user = await User.findOne({ email, role: "admin" }).select("+passwordHash").lean();
    if (!user || !user.passwordHash) {
      if (IS_STRICT_SECURITY) recordFailure(loginKey);
      return denyNotFound(res);
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      if (IS_STRICT_SECURITY) recordFailure(loginKey);
      return denyNotFound(res);
    }

    if (IS_STRICT_SECURITY) clearFailures(loginKey);

    // relaxed 모드: 2FA를 선택사항으로 완화 (바로 세션 발급)
    if (!IS_STRICT_SECURITY) {
      await issueSessionTokens(res, user);
      await AdminAuditLog.create({
        action: "login.relaxed",
        actorUserId: user._id,
        ip,
        userAgent: String(req.headers["user-agent"] || ""),
        meta: { securityLevel: ADMIN_SECURITY_LEVEL },
      }).catch(() => {});
      return res.status(200).json({ ok: true, flow: "done" });
    }

    const pendingToken = signPending2faToken(user);
    setCookie(res, "fortune_admin_2fa_pending", pendingToken, { maxAge: 5 * 60 * 1000, httpOnly: true });

    await AdminAuditLog.create({
      action: "login.stage1",
      actorUserId: user._id,
      ip,
      userAgent: String(req.headers["user-agent"] || ""),
      meta: { success: true, has2FA: !!user.twoFA?.enabled },
    }).catch(() => {});

    if (user.twoFA?.enabled && user.twoFA?.totpSecret) {
      return res.status(200).json({ ok: true, flow: "2fa" });
    }
    // 2FA 설정이 필요할 경우 setup 화면으로 전환
    return res.status(200).json({ ok: true, flow: "setup" });
  } catch {
    return denyNotFound(res);
  }
});

// -------------------------------------------------------------------------
// 잠금 해제: 이메일 인증
// -------------------------------------------------------------------------
router.post("/auth/unlock-request", async (req, res) => {
  try {
    if (!IS_STRICT_SECURITY) return res.status(200).json({ ok: true, skipped: true });
    const ip = getClientIp(req);
    const email = String(req.body?.email || "").trim().toLowerCase();
    if (!email) return denyNotFound(res);

    const loginKey = getLoginKey({ ip, email });
    if (!isLocked(loginKey)) return denyNotFound(res);

    const code = String(Math.floor(100000 + Math.random() * 900000));
    unlockCodes.set(loginKey, { code, expiresAt: Date.now() + 30 * 60 * 1000 });

    // 이메일 발송 성공 여부에 따라 응답을 위장한다.
    const sent = await sendUnlockEmail({ email, code }).catch(() => false);
    if (!sent) {
      // 민감정보(코드)가 화면에 노출되면 안 되므로 404로 위장한다.
      return denyNotFound(res);
    }

    return res.status(200).json({ ok: true });
  } catch {
    return denyNotFound(res);
  }
});

router.post("/auth/unlock-verify", async (req, res) => {
  try {
    if (!IS_STRICT_SECURITY) return res.status(200).json({ ok: true, skipped: true });
    const ip = getClientIp(req);
    const email = String(req.body?.email || "").trim().toLowerCase();
    const code = String(req.body?.code || "").trim();
    if (!email || !code) return denyNotFound(res);

    const loginKey = getLoginKey({ ip, email });
    const rec = unlockCodes.get(loginKey);
    if (!rec) return denyNotFound(res);
    if (Date.now() > rec.expiresAt) {
      unlockCodes.delete(loginKey);
      return denyNotFound(res);
    }
    if (rec.code !== code) return denyNotFound(res);

    unlockCodes.delete(loginKey);
    clearFailures(loginKey);

    return res.status(200).json({ ok: true });
  } catch {
    return denyNotFound(res);
  }
});

// -------------------------------------------------------------------------
// 2FA 설정(사전 준비): QR/백업코드 생성
// -------------------------------------------------------------------------
router.get("/auth/2fa-setup", async (req, res) => {
  try {
    if (!otplib?.authenticator || !qrcode) return denyNotFound(res);

    const pendingToken = extractPending2faToken(req);
    if (!pendingToken) return denyNotFound(res);

    const secret = process.env.JWT_SECRET || "dev-secret";
    const payload = jwt.verify(pendingToken, secret);
    if (!payload || payload.purpose !== "admin-2fa-pending") return denyNotFound(res);

    const user = await User.findById(payload.userId);
    if (!user || user.role !== "admin") return denyNotFound(res);

    if (user.twoFA?.enabled && user.twoFA?.totpSecret) {
      return res.status(200).json({ ok: true, already: true });
    }

    // QR/비밀키/백업코드 생성
    const totpSecret = otplib.authenticator.generateSecret();
    user.twoFA = user.twoFA || {};
    user.twoFA.enabled = false;
    user.twoFA.totpSecret = totpSecret;

    // 백업코드: 10개 생성 후 bcrypt 해시로 저장
    const backupCodes = [];
    const backupCodesHash = [];
    for (let i = 0; i < 10; i += 1) {
      const code = crypto.randomBytes(6).toString("hex").toUpperCase(); // 12 hex chars
      backupCodes.push(code);
      // salt rounds 12: bcrypt 정책 준수
      const h = await bcrypt.hash(code, 12);
      backupCodesHash.push(h);
    }
    user.twoFA.backupCodesHash = backupCodesHash;
    await user.save().catch(() => {});

    const label = "Code Destiny";
    const otpauthUrl = otplib.authenticator.keyuri(user.email, label, totpSecret);
    const qrcodeDataUrl = await qrcode.toDataURL(otpauthUrl);

    await AdminAuditLog.create({
      action: "2fa.setup.generated",
      actorUserId: user._id,
      ip: getClientIp(req),
      userAgent: String(req.headers["user-agent"] || ""),
      meta: { secretGenerated: true },
    }).catch(() => {});

    // 백업코드는 “생성 시점에만” 클라이언트에 전달한다.
    return res.status(200).json({
      ok: true,
      qrcodeDataUrl,
      backupCodes,
    });
  } catch {
    return denyNotFound(res);
  }
});

router.post("/auth/2fa-setup-verify", async (req, res) => {
  try {
    if (!otplib?.authenticator) return denyNotFound(res);
    const pendingToken = extractPending2faToken(req);
    if (!pendingToken) return denyNotFound(res);

    const otp = String(req.body?.otp || "").trim();
    if (!otp) return denyNotFound(res);

    const secret = process.env.JWT_SECRET || "dev-secret";
    const payload = jwt.verify(pendingToken, secret);
    if (!payload || payload.purpose !== "admin-2fa-pending") return denyNotFound(res);

    const user = await User.findById(payload.userId);
    if (!user || user.role !== "admin") return denyNotFound(res);
    if (!user.twoFA?.totpSecret) return denyNotFound(res);

    const ok = otplib.authenticator.check(otp, user.twoFA.totpSecret);
    if (!ok) return denyNotFound(res);

    user.twoFA.enabled = true;
    user.adminLastActivityAt = new Date();
    await user.save().catch(() => {});

    await issueSessionTokens(res, user);

    await AdminAuditLog.create({
      action: "login.stage2.2fa_setup_verified",
      actorUserId: user._id,
      ip: getClientIp(req),
      userAgent: String(req.headers["user-agent"] || ""),
      meta: {},
    }).catch(() => {});

    res.clearCookie("fortune_admin_2fa_pending", { path: "/" });
    return res.status(200).json({ ok: true });
  } catch {
    return denyNotFound(res);
  }
});

// -------------------------------------------------------------------------
// 2단계: OTP/백업코드 검증 후 세션 발급
// -------------------------------------------------------------------------
router.post("/auth/verify-2fa", async (req, res) => {
  try {
    if (!otplib?.authenticator) return denyNotFound(res);

    const pendingToken = extractPending2faToken(req);
    if (!pendingToken) return denyNotFound(res);

    const otp = String(req.body?.otp || "").trim();
    const backupCode = req.body?.backupCode ? String(req.body.backupCode).trim() : "";

    if (!otp && !backupCode) return denyNotFound(res);

    const secret = process.env.JWT_SECRET || "dev-secret";
    const payload = jwt.verify(pendingToken, secret);
    if (!payload || payload.purpose !== "admin-2fa-pending") return denyNotFound(res);

    const user = await User.findById(payload.userId);
    if (!user || user.role !== "admin") return denyNotFound(res);
    if (!user.twoFA?.totpSecret) return denyNotFound(res);

    let verified = false;
    let usedBackup = false;

    if (otp) {
      verified = otplib.authenticator.check(otp, user.twoFA.totpSecret);
    }

    if (!verified && backupCode) {
      // 백업 코드 단일 사용: 일치하는 해시를 제거한다.
      const hashes = Array.isArray(user.twoFA.backupCodesHash) ? user.twoFA.backupCodesHash : [];
      for (let i = 0; i < hashes.length; i += 1) {
        const h = hashes[i];
        const match = await bcrypt.compare(backupCode, h);
        if (match) {
          hashes.splice(i, 1);
          usedBackup = true;
          verified = true;
          break;
        }
      }
      if (verified) {
        user.twoFA.backupCodesHash = hashes;
      }
    }

    if (!verified) return denyNotFound(res);

    user.adminLastActivityAt = new Date();
    await user.save().catch(() => {});

    await issueSessionTokens(res, user);

    await AdminAuditLog.create({
      action: "login.stage2.2fa_verified",
      actorUserId: user._id,
      ip: getClientIp(req),
      userAgent: String(req.headers["user-agent"] || ""),
      meta: { otpUsed: !!otp, usedBackupCode: usedBackup },
    }).catch(() => {});

    res.clearCookie("fortune_admin_2fa_pending", { path: "/" });
    return res.status(200).json({ ok: true });
  } catch {
    return denyNotFound(res);
  }
});

// -------------------------------------------------------------------------
// 관리자 대시보드/모니터링(초기 구현은 더미/부분 구현)
// -------------------------------------------------------------------------
router.get("/dashboard", requireAuth, requireAdmin, async (req, res) => {
  return res.status(200).json({
    ok: true,
    visitors: { today: 120, week: 580, month: 2100 },
    languageRatio: { KR: 60, EN: 12, JP: 10, CN: 12, FR: 6 },
  });
});

router.get("/security/summary", requireAuth, requireAdmin, async (req, res) => {
  const attempts = await AdminAuditLog.find({ action: /login\.stage1|login\.stage2/ }).limit(12).lean().catch(() => []);
  return res.status(200).json({
    ok: true,
    recentAttempts: attempts.length ? attempts.map((a) => a.action).join(", ") : "-",
    blockedIps: "설정된 차단 정책은 서버 로그 기준으로 확인하세요.",
    anomalies: "초기 구현(서버 로직 확장 필요)",
  });
});

router.post("/content/schedule", requireAuth, requireAdmin, async (req, res) => {
  // SNS 연동은 Buffer API/각 플랫폼 OAuth 등에 따라 달라진다.
  // 프론트가 호출하는 엔드포인트만 먼저 둔다.
  return res.status(200).json({ ok: true, message: "예약 요청 접수(초기 구현)" });
});

router.post("/content/preview", requireAuth, requireAdmin, async (req, res) => {
  return res.status(200).json({ ok: true, preview: req.body?.content || "" });
});

// 관리자 허용 IP를 비밀번호 확인 후 변경
// - 운영 편의를 위해 .env 파일의 ADMIN_ALLOWED_IPS 값을 갱신한다.
router.post("/security/allowed-ip", requireAuth, requireAdmin, async (req, res) => {
  try {
    const nextIp = String(req.body?.ip || "").trim();
    const password = String(req.body?.password || "");
    if (!nextIp || !password) {
      return res.status(400).json({ message: "ip와 password가 필요합니다." });
    }

    // IPv4 기본 검증
    const ipv4Re = /^(25[0-5]|2[0-4]\d|1?\d?\d)\.(25[0-5]|2[0-4]\d|1?\d?\d)\.(25[0-5]|2[0-4]\d|1?\d?\d)\.(25[0-5]|2[0-4]\d|1?\d?\d)$/;
    if (!ipv4Re.test(nextIp)) {
      return res.status(400).json({ message: "유효한 IPv4 형식이 아닙니다." });
    }

    const me = await User.findById(req.auth.userId).select("+passwordHash").lean();
    if (!me || !me.passwordHash) return denyNotFound(res);

    const ok = await bcrypt.compare(password, me.passwordHash);
    if (!ok) return denyNotFound(res);

    const fs = require("fs");
    const envPath = path.resolve(__dirname, "..", ".env");
    let content = "";
    try {
      content = fs.readFileSync(envPath, "utf8");
    } catch {
      return res.status(500).json({ message: ".env 파일을 읽을 수 없습니다." });
    }

    if (/^ADMIN_ALLOWED_IPS=.*$/m.test(content)) {
      content = content.replace(/^ADMIN_ALLOWED_IPS=.*$/m, `ADMIN_ALLOWED_IPS=${nextIp}`);
    } else {
      content = `${content.trim()}\nADMIN_ALLOWED_IPS=${nextIp}\n`;
    }
    fs.writeFileSync(envPath, content, "utf8");
    process.env.ADMIN_ALLOWED_IPS = nextIp;

    await AdminAuditLog.create({
      action: "security.allowed_ip.updated",
      actorUserId: req.auth.userId,
      ip: getClientIp(req),
      userAgent: String(req.headers["user-agent"] || ""),
      meta: { nextIp },
    }).catch(() => {});

    return res.status(200).json({
      ok: true,
      message: "허용 IP가 변경되었습니다. (서버 재시작 후 완전 반영 권장)",
      nextIp,
    });
  } catch (error) {
    return res.status(500).json({ message: error?.message || "처리 실패" });
  }
});

// -------------------------------------------------------------------------
// 황금 돼지 코인 지급/차감 API
// -------------------------------------------------------------------------
router.post("/members/points", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const userId = String(req.body?.userId || "").trim();
    const delta = Number(req.body?.delta);
    const reason = String(req.body?.reason || "관리자 코인 지급").trim().slice(0, 200);

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "유효하지 않은 사용자 ID입니다." });
    }
    if (!Number.isFinite(delta) || delta === 0) {
      return res.status(400).json({ message: "코인 수량(delta)이 유효하지 않습니다." });
    }
    if (Math.abs(delta) > 10_000) {
      return res.status(400).json({ message: "1회 지급 한도(10,000 코인)를 초과했습니다." });
    }

    const isDeduct = delta < 0;

    // 차감 시 잔액 부족 방지
    const updateQuery = isDeduct
      ? { $inc: { points: delta } }
      : { $inc: { points: delta } };

    const filter = isDeduct
      ? { _id: userId, points: { $gte: -delta } }
      : { _id: userId };

    const updatedUser = await User.findOneAndUpdate(
      filter,
      updateQuery,
      { new: true, projection: { points: 1, name: 1, email: 1 } },
    ).lean();

    if (!updatedUser) {
      const exists = await User.exists({ _id: userId });
      if (!exists) return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
      return res.status(402).json({ message: "코인이 부족합니다." });
    }

    const PointHistory = require("../models/PointHistory");
    await PointHistory.create({
      userId,
      kind: "adjust",
      delta,
      balanceAfter: Number(updatedUser.points || 0),
      reason,
      featureKey: "admin-coin-grant",
      metadata: {
        source: "admin.members.points",
        actorUserId: String(req.auth.userId),
      },
    }).catch(() => {});

    await AdminAuditLog.create({
      action: "member.points.adjusted",
      actorUserId: req.auth.userId,
      ip: getClientIp(req),
      userAgent: String(req.headers["user-agent"] || ""),
      meta: { targetUserId: userId, delta, reason, balanceAfter: Number(updatedUser.points || 0) },
    }).catch(() => {});

    return res.status(200).json({
      ok: true,
      message: `${delta > 0 ? `+${delta.toLocaleString("ko-KR")}` : delta.toLocaleString("ko-KR")} 코인이 반영되었습니다.`,
      user: {
        id: String(updatedUser._id),
        name: updatedUser.name || "",
        email: updatedUser.email || "",
        points: Number(updatedUser.points || 0),
      },
    });
  } catch (error) {
    return next(error);
  }
});

// -------------------------------------------------------------------------
// 기존 회원 관리 API (쿠키 기반 인증/권한 체크 동작하도록 requireAuth 수정 반영됨)
// -------------------------------------------------------------------------
router.get("/users", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const rawSearch = String(req.query.search || "").trim();
    const filter = rawSearch
      ? {
        $or: [
          { name: { $regex: escapeRegex(rawSearch), $options: "i" } },
          { email: { $regex: escapeRegex(rawSearch), $options: "i" } },
        ],
      }
      : {};

    const [totalCount, users] = await Promise.all([
      User.countDocuments({}),
      User.find(filter, { passwordHash: 0, __v: 0 })
        .sort({ joinedAt: -1, createdAt: -1 })
        .lean(),
    ]);

    return res.status(200).json({
      totalCount,
      count: users.length,
      search: rawSearch,
      users,
    });
  } catch (error) {
    return next(error);
  }
});

router.delete("/users/:userId", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "유효하지 않은 사용자 ID입니다." });
    }

    if (String(req.auth.userId) === String(userId)) {
      return res.status(400).json({ message: "본인 계정은 관리자 API로 삭제할 수 없습니다." });
    }

    const deleted = await User.findByIdAndDelete(userId).lean();

    if (!deleted) {
      return res.status(404).json({ message: "삭제할 사용자를 찾지 못했습니다." });
    }

    await AdminAuditLog.create({
      action: "member.deleted",
      actorUserId: req.auth.userId,
      ip: getClientIp(req),
      userAgent: String(req.headers["user-agent"] || ""),
      meta: { deletedUserId: userId },
    }).catch(() => {});

    return res.status(200).json({
      message: "사용자를 삭제했습니다.",
      userId,
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
