import { NextResponse } from "next/server";
import { proxyLegacyApi } from "../../_lib/legacyApiProxy";

export const runtime = "nodejs";

const SPREAD_POSITIONS = {
  one_card: ["focus"],
  three_card_past_present_future: ["past", "present", "future"],
  relationship_six_card: [
    "position_1",
    "position_2",
    "position_3",
    "position_4",
    "position_5",
    "position_6",
  ],
  healing_rising_four_card: ["hidden_truth", "embrace_pain", "silver_lining", "step_forward"],
  yearly_three_card: ["year_overview", "year_challenge", "year_advice"],
  yearly_twelve_card: [
    "jan",
    "feb",
    "mar",
    "apr",
    "may",
    "jun",
    "jul",
    "aug",
    "sep",
    "oct",
    "nov",
    "dec",
  ],
};

function normalizeSpreadType(raw) {
  const value = String(raw || "one_card").trim();
  if (value in SPREAD_POSITIONS) return value;
  return "one_card";
}

function makeFallbackCards(spreadType) {
  const positions = SPREAD_POSITIONS[spreadType] || SPREAD_POSITIONS.one_card;
  const deck = Array.from({ length: 78 }, (_, i) => i);

  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return positions.map((position, idx) => ({
    cardId: String(deck[idx]),
    position,
    orientation: Math.random() < 0.18 ? "reversed" : "upright",
  }));
}

export async function POST(request) {
  const fallbackClone = request.clone();
  let upstreamResponse = null;

  try {
    upstreamResponse = await proxyLegacyApi(request);
    if (upstreamResponse?.ok) return upstreamResponse;
  } catch {
    // fallback path below
  }

  const body = await fallbackClone.json().catch(() => ({}));
  const spreadType = normalizeSpreadType(body?.spreadType);
  const cards = makeFallbackCards(spreadType);

  return NextResponse.json(
    {
      ok: true,
      spreadType,
      cards,
      source: "local-fallback",
      upstreamStatus: upstreamResponse?.status || null,
    },
    { status: 200 },
  );
}
