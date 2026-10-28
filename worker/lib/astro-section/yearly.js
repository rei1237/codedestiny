import paidYearly from "./paid-yearly.cjs";
import transitsCore from "../../../js/core/astro/transits.js";
import natalCore from "../../../js/core/astro/natal-reading.js";
import { toNatalReadingChart } from "../astro-basic-deep-report.js";
import { createSwissTransitLonsAt } from "../swiss-ephemeris.js";

// 앞으로 12개월(astro_yearly_transit, 출생 단위 영구 해금 50코인) — 잠긴 본문은 이 서버 사본으로만 만든다.
export const ASTRO_YEARLY_TRANSIT_KEY = "astro_yearly_transit";

const { AstroTransits } = transitsCore;
const two = (n) => String(n).padStart(2, "0");

// 화면의 기기 시간대(분 단위 오프셋 → 시간)로 본 오늘. 서버 시계만 쓴다 — 요청이 날짜를 고르지 못한다.
export function yearlyToday(nowMs, tzHours) {
  const shifted = new Date(nowMs + tzHours * 3600000);
  return `${shifted.getUTCFullYear()}-${two(shifted.getUTCMonth() + 1)}-${two(shifted.getUTCDate())}`;
}

// 화면 _astroCounselYearlyHtml 과 같은 흐름: natal-reading periods + transits period() → year() → renderYear().
// 출생 차트는 요청 값이 아니라 서버 Swiss 차트(getSwissWesternChart)이고, 행성 위치도 서버 Swiss 로 구한다.
export function buildAstroYearlyReading({ chart, timeKnown, birth, today, tz, lonsAt }) {
  const natalChart = toNatalReadingChart(chart, timeKnown);
  const periods = natalCore.build(natalChart, { timeKnown, today, birth }).periods;
  const period = AstroTransits.period(AstroTransits.natalOf(natalChart, timeKnown), { today, tz, lonsAt });
  const reading = paidYearly.year(period, { periods, birth });
  const html = paidYearly.renderYear(reading);
  if (!html || !html.trim()) throw new Error("Empty astro yearly body");
  return { reading, html };
}

export async function buildAstroYearlyHtml({ env, request, chart, input, tz, nowMs = Date.now() }) {
  const [hour, minute] = String(input.time || "12:00").split(":").map(Number);
  const birth = { year: input.birth.year, month: input.birth.month, day: input.birth.day, hour, minute };
  const lonsAt = await createSwissTransitLonsAt(env, { requestUrl: request?.url });
  return buildAstroYearlyReading({ chart, timeKnown: input.timeKnown, birth, today: yearlyToday(nowMs, tz), tz, lonsAt });
}
