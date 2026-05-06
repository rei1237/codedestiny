const express = require("express");
const mongoose = require("mongoose");

const User = require("../models/User");
const { requireAuth } = require("../middleware/auth.middleware");

const router = express.Router();

function toIsoOrNull(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

async function findUserByIdRaw(userId, projection = {}) {
  const normalizedId = String(userId || "").trim();
  if (!mongoose.Types.ObjectId.isValid(normalizedId)) return null;

  return User.collection.findOne(
    { _id: new mongoose.Types.ObjectId(normalizedId) },
    { projection },
  );
}

router.get("/status", requireAuth, async (req, res, next) => {
  try {
    const userId = req.auth?.userId;
    if (!userId) {
      return res.status(401).json({ message: "인증 정보가 없습니다." });
    }

    const user = await findUserByIdRaw(userId, {
      profileSubscription: 1,
    });

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
