const express = require("express");

const DailyFortuneSubscription = require("../models/DailyFortuneSubscription");
const {
  normalizeEmail,
  buildUnsubscribeUrl,
  verifyUnsubscribeToken,
} = require("../utils/subscription-link");

const router = express.Router();

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post("/daily-fortune", async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const subDaily = req.body?.subDaily !== false;
    const subMonthly = req.body?.subMonthly === true;
    const rawBirthYear = req.body?.birthYear;
    const birthYear = rawBirthYear ? parseInt(rawBirthYear, 10) : null;
    const source = req.body?.source || "saju-analysis";

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

    const updateFields = {
      subDaily,
      subMonthly,
      isActive: true,
      unsubscribedAt: null,
      source,
    };
    if (birthYear && birthYear >= 1900 && birthYear <= 2100) {
      updateFields.birthYear = birthYear;
    }

    const saved = await DailyFortuneSubscription.findOneAndUpdate(
      { email },
      { $set: updateFields },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      },
    ).lean();

    return res.status(200).json({
      message: "매일 운세 이메일 구독이 등록되었습니다.",
      unsubscribeUrl: buildUnsubscribeUrl(saved.email),
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

router.get("/daily-fortune/unsubscribe", async (req, res, next) => {
  try {
    const email = normalizeEmail(req.query?.email);
    const token = String(req.query?.token || "");

    if (!email || !emailRegex.test(email) || !verifyUnsubscribeToken(email, token)) {
      return res.status(400).type("text/html; charset=utf-8").send("<h1>유효하지 않은 구독 해지 링크입니다.</h1>");
    }

    await DailyFortuneSubscription.updateOne(
      { email },
      {
        $set: {
          isActive: false,
          subDaily: false,
          subMonthly: false,
          unsubscribedAt: new Date(),
        },
      },
    );

    return res.status(200).type("text/html; charset=utf-8").send("<h1>구독 해지가 완료되었습니다.</h1><p>앞으로 매일 운세 메일이 발송되지 않습니다.</p>");
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
