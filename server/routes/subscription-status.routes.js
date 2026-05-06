const express = require("express");

const User = require("../models/User");
const { requireAuth } = require("../middleware/auth.middleware");

const router = express.Router();

function toIsoOrNull(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

router.get("/status", requireAuth, async (req, res, next) => {
  try {
    const userId = req.auth?.userId;
    if (!userId) {
      return res.status(401).json({ message: "인증 정보가 없습니다." });
    }

    const user = await User.findById(userId)
      .select("profileSubscription")
      .lean();

    const sub = user?.profileSubscription || {};
    const tier = String(sub.tier || "free").trim() || "free";
    const validExpiresAt = toIsoOrNull(sub.expiresAt);

    return res.status(200).json({
      ok: true,
      success: true,
      tier,
      source: String(sub.source || "coin"),
      isActive: tier !== "free" && !!validExpiresAt && new Date(validExpiresAt).getTime() > Date.now(),
      expiresAt: validExpiresAt,
      profileLimit: Number(sub.profileLimit || 1),
      cancelAtPeriodEnd: !!sub.cancelAtPeriodEnd,
      cancelRequestedAt: toIsoOrNull(sub.cancelRequestedAt),
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
