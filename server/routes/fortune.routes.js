const express = require("express");

const User = require("../models/User");
const PointHistory = require("../models/PointHistory");
const { requireAuth } = require("../middleware/auth.middleware");
const { requireSufficientPoints } = require("../middleware/point.middleware");

const router = express.Router();

const FORTUNE_COST_POINTS = Number(process.env.DEFAULT_FORTUNE_COST_POINTS || 1000);
const FORTUNE_FEATURE_KEY = "saju-report";

router.use(requireAuth);

router.get(
  "/check",
  requireSufficientPoints(FORTUNE_COST_POINTS, {
    message: "포인트가 부족합니다.",
    rechargeUrl: "/points",
  }),
  async (req, res) => {
    return res.status(200).json({
      message: "운세 조회 가능 포인트가 확인되었습니다.",
      requiredPoints: FORTUNE_COST_POINTS,
      currentPoints: Number(req.pointGate?.currentPoints || 0),
    });
  },
);

router.post(
  "/consume",
  requireSufficientPoints(FORTUNE_COST_POINTS, {
    message: "포인트가 부족합니다.",
    rechargeUrl: "/points",
  }),
  async (req, res, next) => {
    try {
      const reason = String(req.body?.reason || "사주 운세 조회 포인트 차감").slice(0, 120);

      const updatedUser = await User.findOneAndUpdate(
        {
          _id: req.auth.userId,
          points: { $gte: FORTUNE_COST_POINTS },
        },
        {
          $inc: { points: -FORTUNE_COST_POINTS },
        },
        {
          new: true,
          projection: { points: 1 },
        },
      ).lean();

      if (!updatedUser) {
        return res.status(402).json({
          message: "포인트가 부족합니다.",
          requiredPoints: FORTUNE_COST_POINTS,
          rechargeUrl: "/points",
        });
      }

      await PointHistory.create({
        userId: req.auth.userId,
        kind: "deduct",
        delta: -FORTUNE_COST_POINTS,
        balanceAfter: Number(updatedUser.points || 0),
        reason,
        featureKey: FORTUNE_FEATURE_KEY,
        metadata: {
          source: "fortune.consume",
        },
      });

      return res.status(200).json({
        message: `${FORTUNE_COST_POINTS.toLocaleString("ko-KR")} 포인트가 차감되었습니다.`,
        requiredPoints: FORTUNE_COST_POINTS,
        user: {
          id: String(req.auth.userId),
          points: Number(updatedUser.points || 0),
        },
      });
    } catch (error) {
      return next(error);
    }
  },
);

module.exports = router;
