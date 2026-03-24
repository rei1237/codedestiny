const crypto = require("crypto");

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function getSubscriptionSecret() {
  return process.env.SUBSCRIPTION_LINK_SECRET
    || process.env.JWT_SECRET
    || "dev-subscription-secret";
}

function signUnsubscribeEmail(email) {
  const normalized = normalizeEmail(email);
  return crypto
    .createHmac("sha256", getSubscriptionSecret())
    .update(normalized)
    .digest("hex");
}

function verifyUnsubscribeToken(email, token) {
  const expected = signUnsubscribeEmail(email);
  const given = String(token || "").trim().toLowerCase();
  if (!expected || !given || expected.length !== given.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(given));
  } catch (_) {
    return false;
  }
}

function getPublicSiteBaseUrl() {
  const configured = String(
    process.env.SITE_BASE_URL
    || process.env.NEXT_PUBLIC_SITE_URL
    || "",
  ).trim();

  if (configured) return configured.replace(/\/+$/, "");
  return "https://code-destiny.com";
}

function buildUnsubscribeUrl(email) {
  const normalized = normalizeEmail(email);
  const token = signUnsubscribeEmail(normalized);
  const base = getPublicSiteBaseUrl();
  return `${base}/api/subscriptions/daily-fortune/unsubscribe?email=${encodeURIComponent(normalized)}&token=${encodeURIComponent(token)}`;
}

module.exports = {
  normalizeEmail,
  signUnsubscribeEmail,
  verifyUnsubscribeToken,
  buildUnsubscribeUrl,
  getPublicSiteBaseUrl,
};
