const jwt = require("jsonwebtoken");
const User = require("../models/User");
const ADMIN_SECURITY_LEVEL = String(process.env.ADMIN_SECURITY_LEVEL || "relaxed").toLowerCase();
const IS_STRICT_SECURITY = ADMIN_SECURITY_LEVEL === "strict";

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

function getTokenFromHeader(req) {
  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) return null;
  return authHeader.slice(7);
}

function getTokenFromRequest(req) {
  // 1) 기존 동작: Authorization Bearer 토큰
  const fromHeader = getTokenFromHeader(req);
  if (fromHeader) return fromHeader;

  // 2) 관리자/웹 세션: HttpOnly 쿠키(fortune_auth_token)
  // - cookie-parser 미사용: 직접 쿠키 파싱
  const fromCookie = getCookieValue(req, "fortune_auth_token");
  return fromCookie || null;
}

function requireAuth(req, res, next) {
  const token = getTokenFromRequest(req);

  if (!token) {
    return res.status(401).json({ message: "인증 토큰이 필요합니다.", code: "UNAUTHORIZED" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || "dev-secret");
    req.auth = {
      userId: payload.userId,
      role: payload.role,
      email: payload.email,
      issuer: payload.iss,
    };
    return next();
  } catch (error) {
    return res.status(401).json({ message: "유효하지 않거나 만료된 토큰입니다.", code: "UNAUTHORIZED" });
  }
}

async function requireAdmin(req, res, next) {
  const issuer = req.auth && req.auth.issuer;
  // relaxed 모드에서는 issuer 강제 체크를 완화한다.
  const issuerOk = IS_STRICT_SECURITY ? issuer === "code-destiny-admin" : true;
  if (!req.auth || req.auth.role !== "admin" || !issuerOk) {
    // 보안 우선: 권한이 없다는 정보를 노출하지 않기 위해 404로 위장
    return res.status(404).json({ message: "Not found" });
  }

  // strict 모드에서만 비활동 30분 자동 로그아웃 적용
  // - 토큰만으로는 “비활동”을 판단하기 어렵기 때문에 마지막 활동 시간을 사용자 문서에 저장한다.
  if (!IS_STRICT_SECURITY) return next();

  try {
    const user = await User.findById(req.auth.userId).select({ adminLastActivityAt: 1 }).lean();
    const last = user?.adminLastActivityAt ? new Date(user.adminLastActivityAt).getTime() : null;
    const thirtyMinMs = 30 * 60 * 1000;
    if (last && Date.now() - last > thirtyMinMs) {
      res.clearCookie("fortune_auth_token", { path: "/" });
      res.clearCookie("fortune_auth_refresh", { path: "/" });
      res.clearCookie("fortune_auth_role", { path: "/" });
      res.clearCookie("fortune_csrf_token", { path: "/" });
      return res.status(404).json({ message: "Not found" });
    }

    // 활동 갱신
    await User.updateOne(
      { _id: req.auth.userId },
      { $set: { adminLastActivityAt: new Date() } },
    ).catch(() => {});
  } catch {
    return res.status(404).json({ message: "Not found" });
  }

  return next();
}

module.exports = {
  requireAuth,
  requireAdmin,
};
