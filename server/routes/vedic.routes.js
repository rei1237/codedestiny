/**
 * 베다점(조티시) API 라우트
 * 출생 정보를 받아 베다점 API를 호출하고, 정제된 데이터를 반환합니다.
 */

const express = require("express");
const { getBirthChartFromUserInput } = require("../services/vedic-astrology.service");
const { refineBirthChartForClient } = require("../utils/vedicChartUtils");

const router = express.Router();

/**
 * POST /api/vedic/birth-chart
 * Body: { name?, birthDate, birthTime, latitude, longitude, timezone?, ayanamsa?, language? }
 * 응답: { ok, chart?, message?, userMessage? }
 */
router.post("/birth-chart", async (req, res) => {
  try {
    const body = req.body || {};
    const input = {
      name: body.name,
      birthDate: body.birthDate ?? body.date,
      birthTime: body.birthTime ?? body.time,
      latitude: body.latitude,
      longitude: body.longitude,
      timezone: body.timezone,
      ayanamsa: body.ayanamsa,
      language: body.language,
    };

    const result = await getBirthChartFromUserInput(input);

    if (!result.success) {
      return res.status(400).json({
        ok: false,
        message: result.userMessage || "우주의 흐름을 읽는 중 잠시 지연이 발생했습니다.",
        userMessage: result.userMessage,
        code: result.code,
      });
    }

    const chartForClient = refineBirthChartForClient(result.data, { name: input.name });

    return res.status(200).json({
      ok: true,
      chart: chartForClient,
      normalizedParams: result.normalizedParams,
    });
  } catch (err) {
    console.error("[vedic] birth-chart error:", err);
    return res.status(500).json({
      ok: false,
      message: "서버 오류가 발생했습니다.",
      userMessage: "우주의 흐름을 읽는 중 잠시 지연이 발생했습니다. 잠시 후 다시 시도해 주세요.",
    });
  }
});

module.exports = router;
