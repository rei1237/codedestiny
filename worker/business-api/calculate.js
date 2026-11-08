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
