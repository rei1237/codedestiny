const express = require("express");

const User = require("../models/User");
const PointHistory = require("../models/PointHistory");
const { requireAuth } = require("../middleware/auth.middleware");

const router = express.Router();

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const userId = req.auth?.userId;
    if (!userId) {
      return res.status(401).json({ message: "인증 정보가 없습니다." });
    }

    const user = await User.findById(userId)
      .select("name email points")
      .lean();

    const pointHistories = await PointHistory.find({ userId })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    const transactions = pointHistories.map((entry) => ({
      id: String(entry._id),
      kind: entry.kind,
      delta: Number(entry.delta || 0),
      balanceAfter: Number(entry.balanceAfter || 0),
      reason: entry.reason,
      featureKey: entry.featureKey,
      createdAt: entry.createdAt,
    }));

    const balance = Number(user?.points || 0);

    return res.status(200).json({
      success: true,
      ok: true,
      data: {
        balance,
        transactions,
        payments: [],
        subscriptions: [],
      },
      user: {
        id: String(userId),
        name: user?.name || "",
        email: user?.email || "",
        points: balance,
      },
      pointHistories: transactions,
      transactions,
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
