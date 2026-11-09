import { calculateNatalSaju } from "../../lib/korean-calendar/index.js";
import { TAROT_CARDS } from "../../lib/tarot/tarot-cards.mjs";
import { getSpreadDefinition } from "../../lib/tarot/spreads.mjs";
export class InvalidInput extends Error {}
function invalid(message) {
  throw new InvalidInput(message);
}
export async function calculate(slug, input) {
  if (!input || typeof input !== "object" || Array.isArray(input))
    invalid("JSON 객체가 필요합니다.");
  if (["astrology", "vedic", "sukuyo"].includes(slug)) {
    if (
      typeof input.birthDate !== "string" ||
      typeof input.birthTime !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(input.birthDate) ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.birthTime) ||
      !Number.isFinite(input.timezoneOffsetHours) ||
      Math.abs(input.timezoneOffsetHours) > 14
    )
      invalid("양력 날짜, 확정된 출생시각, UTC 시차를 확인해 주세요.");
    const [year, month, day] = input.birthDate.split("-").map(Number);
    if (
      new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10) !==
      input.birthDate
    )
      invalid("양력 날짜를 확인해 주세요.");
    const [hour, minute] = input.birthTime.split(":").map(Number);
    if (slug !== "sukuyo") {
      if (
        year < 1900 ||
        year > 2050 ||
        !Number.isFinite(input.latitude) ||
        Math.abs(input.latitude) >= 90 ||
        !Number.isFinite(input.longitude) ||
        Math.abs(input.longitude) > 180
      )
        invalid(
          "1900~2050년 범위의 날짜와 유효한 출생지 위도·경도를 입력해 주세요.",
        );
      const date = new Date(
        Date.UTC(year, month - 1, day, hour, minute) -
          input.timezoneOffsetHours * 3600000,
      );
      const { westernPositions, vedicPositions } = await import(
        "../lib/verified-natal.js"
      );
      if (slug === "vedic")
        return vedicPositions(date, input.latitude, input.longitude);
      const chart = westernPositions(date, input.latitude, input.longitude);
      return {
        providerVersion: chart.providerVersion,
        planets: Object.fromEntries(
          Object.entries(chart.planets).map(([body, p]) => [
            body,
            { longitude: p.longitude, signIndex: p.sign, house: p.house },
          ]),
        ),
        ascendant: chart.ascendant.longitude,
        midheaven: chart.midheaven.longitude,
        houseSystem: chart.houseSystem,
        houseCusps: chart.houseCusps,
      };
    }
    const { verifiedSukuyoForCivilTime } = await import(
      "../lib/sukuyo-verified-provider.js"
    );
    const chart = verifiedSukuyoForCivilTime({
      year,
      month,
      day,
      hour,
      minute,
      timezoneOffsetHours: input.timezoneOffsetHours,
    });
    if (!chart)
      invalid("검증 기간 밖이거나 두 숙의 경계에 있는 출생시각입니다.");
    return {
      mansion: chart.mansion,
      index: chart.index,
      moonSiderealLongitude: chart.moonSiderealLongitude,
      providerVersion: chart.astronomyVersion,
    };
  }
  if (slug === "tarot") {
    if (!["one_card", "three_card_past_present_future"].includes(input.spread))
      invalid("지원하는 스프레드를 선택해 주세요.");
    const spread = getSpreadDefinition(input.spread);
    if (
      !Array.isArray(input.cards) ||
      input.cards.length !== spread.positions.length
    )
      invalid("카드 수를 확인해 주세요.");
    const used = new Set();
    return {
      spread: spread.id,
      cards: input.cards.map((pick, i) => {
        const card = TAROT_CARDS.find((c) => c.code === pick?.id);
        if (
          !card ||
          used.has(card.code) ||
          !["upright", "reversed"].includes(pick.direction)
        )
          invalid("카드 ID, 중복, 방향을 확인해 주세요.");
        used.add(card.code);
        return {
          id: card.code,
          name: card.nameKo,
          direction: pick.direction,
          position: spread.positions[i].label,
        };
      }),
    };
  }
  if (slug === "saju") {
    try {
      const { pillars } = calculateNatalSaju(input);
      return { pillars, dayMaster: pillars.day[0] };
    } catch (error) {
      if (error.code) invalid(error.code);
      throw error;
    }
  }
  if (slug === "ziwei") {
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(input.birthDate) ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.birthTime) ||
      !["M", "F"].includes(input.gender)
    )
      invalid("양력 생년월일, 한국 출생시각, 성별이 필요합니다.");
    const [birthYear, birthMonth, birthDay] = input.birthDate
      .split("-")
      .map(Number);
    const date = new Date(Date.UTC(birthYear, birthMonth - 1, birthDay));
    if (
      birthYear < 1900 ||
      birthYear > 2100 ||
      date.toISOString().slice(0, 10) !== input.birthDate
    )
      invalid("양력 날짜를 확인해 주세요.");
    const [birthHour, birthMinute] = input.birthTime.split(":").map(Number);
    const { calculateZiweiChart } = await import(
      "../../app/_lib/ziwei-engine.ts"
    );
    const chart = calculateZiweiChart({
      birthYear,
      birthMonth,
      birthDay,
      birthHour,
      birthMinute,
      gender: input.gender,
      timezone: "Asia/Seoul",
    });
    return {
      mingGong: chart.mingGong,
      shenGong: chart.shenGong,
      palaces: chart.palaces.map((p) => ({
        name: p.name,
        branch: p.branch,
        stars: p.allStars.map((s) => s.name),
      })),
    };
  }
  throw new Error("PRODUCT_UNAVAILABLE");
}
