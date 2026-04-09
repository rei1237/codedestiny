/**
 * flower-admin.middleware.js
 * Express 미들웨어: flower_admin_token (HMAC-SHA256) 검증
 *
 * flowerAdminToken.js (Next.js) 와 동일한 토큰 포맷을 Node.js crypto 로 검증.
 * 토큰 포맷: "<payloadB64url>.<hmacHex>"
 *   - payloadB64url: base64url(JSON { v:1, issued, exp })
 *   - hmacHex: HMAC-SHA256(payloadB64url, FLOWER_ADMIN_SECRET) as hex string
 */
const crypto = require("crypto");

const FLOWER_TOKEN_TTL_SEC = 8 * 60 * 60;

function getSecret() {
  return String(process.env.FLOWER_ADMIN_SECRET || "flower-admin-dev-secret-placeholder-000000");
}

function b64uDecode(b64u) {
  const b64 = b64u.replace(/-/g, "+").replace(/_/g, "/");
  const padding = (4 - (b64.length % 4)) % 4;
  return Buffer.from(b64 + "=".repeat(padding), "base64").toString("utf8");
}

function hmacHex(data, secret) {
  return crypto.createHmac("sha256", secret).update(data, "utf8").digest("hex");
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function extractFlowerToken(req) {
  // 1. Authorization: Bearer <token>
  const auth = String(req.headers.authorization || "").trim();
  if (auth.startsWith("Bearer ")) {
    const t = auth.slice(7).trim();
    if (t) return t;
  }
  // 2. x-admin-token header
  const xat = String(req.headers["x-admin-token"] || "").trim();
  if (xat) return xat;
  // 3. flower_admin_token cookie
  const raw = req.headers.cookie || "";
  for (const part of raw.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === "flower_admin_token") return decodeURIComponent(rest.join("="));
  }
  return null;
}

function verifyFlowerToken(token) {
  if (!token || typeof token !== "string") return false;
  try {
    const dotIdx = token.lastIndexOf(".");
    if (dotIdx < 1) return false;
    const payloadB64 = token.slice(0, dotIdx);
    const sigFromToken = token.slice(dotIdx + 1);
    const secret = getSecret();
    const expectedSig = hmacHex(payloadB64, secret);
    if (!timingSafeEqual(expectedSig, sigFromToken)) return false;
    const parsed = JSON.parse(b64uDecode(payloadB64));
    if (!parsed || parsed.v !== 1) return false;
    const now = Math.floor(Date.now() / 1000);
    const exp = Number(parsed.exp || 0);
    return Number.isFinite(exp) && now <= exp;
  } catch {
    return false;
  }
}

/**
 * Express 미들웨어: flower_admin_token 검증 실패 시 401 반환.
 */
function requireFlowerAdmin(req, res, next) {
  const token = extractFlowerToken(req);
  if (!verifyFlowerToken(token)) {
    return res.status(401).json({ ok: false, message: "Unauthorized" });
  }
  return next();
}

module.exports = { requireFlowerAdmin, verifyFlowerToken, extractFlowerToken };
