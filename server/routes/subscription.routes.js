const express = require("express");

const DailyFortuneSubscription = require("../models/DailyFortuneSubscription");

const router = express.Router();

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post("/daily-fortune", async (req, res, next) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const subDaily = req.body?.subDaily !== false;
    const subMonthly = req.body?.subMonthly === true;

    if (!email || !emailRegex.test(email)) {
      return res.status(400).json({
        message: "유효한 이메일 주소를 입력해 주세요.",
      });
    }

    if (!subDaily && !subMonthly) {
      return res.status(400).json({
        message: "일일 운세 또는 월별 운세 중 하나 이상을 선택해 주세요.",
      });
    }

    const saved = await DailyFortuneSubscription.findOneAndUpdate(
      { email },
      {
        $set: {
          subDaily,
          subMonthly,
          isActive: true,
          source: "saju-analysis",
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      },
    ).lean();

    return res.status(200).json({
      message: "매일 운세 이메일 구독이 등록되었습니다.",
      subscription: {
        id: String(saved._id),
        email: saved.email,
        subDaily: !!saved.subDaily,
        subMonthly: !!saved.subMonthly,
        isActive: !!saved.isActive,
      },
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
