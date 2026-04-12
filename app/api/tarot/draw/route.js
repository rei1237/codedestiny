import { NextResponse } from "next/server";
import { proxyLegacyApi } from "../../_lib/legacyApiProxy";
import { createRequire } from "module";

export const runtime = "nodejs";

// Load the CJS tarot engine for card drawing with full metadata
const _require = createRequire(import.meta.url);
let _engine = null;
function getEngine() {
  if (!_engine) {
    _engine = _require("../../../../server/services/tarot-engine.service.js");
  }
  return _engine;
}

// Fallback card draw when engine unavailable - returns minimal {cardId, position, orientation}
const SPREAD_POSITIONS = {
  one_card: ["focus"],
  three_card_past_present_future: ["past", "present", "future"],
  relationship_six_card: ["position_1","position_2","position_3","position_4","position_5","position_6"],
  healing_rising_four_card: ["hidden_truth","embrace_pain","silver_lining","step_forward"],
  three_card_cause_process_outcome: ["cause","process","outcome"],
  reunion_lighthouse_five_card: ["past_bond","their_now","outside_factor","their_heart","reunion_outcome"],
  self_esteem_levelup_five_card: ["past_debuff","inner_monster","current_damage","mind_shield","levelup_mastery"],
  job_change_seven_card: ["calling","happy_direction","inner_vocation","life_after_move","action_steps","let_go","overall_advice"],
  yearly_three_card: ["base_energy","challenge_opportunity","outcome_advice"],
  yearly_twelve_card: ["month_1","month_2","month_3","month_4","month_5","month_6","month_7","month_8","month_9","month_10","month_11","month_12"],
};

const CARD_IDS = [
  "M00","M01","M02","M03","M04","M05","M06","M07","M08","M09","M10","M11",
  "M12","M13","M14","M15","M16","M17","M18","M19","M20","M21",
  "W01","W02","W03","W04","W05","W06","W07","W08","W09","W10","W11","W12","W13","W14",
  "C01","C02","C03","C04","C05","C06","C07","C08","C09","C10","C11","C12","C13","C14",
  "S01","S02","S03","S04","S05","S06","S07","S08","S09","S10","S11","S12","S13","S14",
  "P01","P02","P03","P04","P05","P06","P07","P08","P09","P10","P11","P12","P13","P14",
];

function makeFallbackCards(spreadType) {
  const positions = SPREAD_POSITIONS[spreadType] || SPREAD_POSITIONS.one_card;
  const deck = CARD_IDS.slice();
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return positions.map((position, idx) => ({
    cardId: deck[idx],
    position,
    orientation: Math.random() < 0.18 ? "reversed" : "upright",
  }));
}

export async function POST(request) {
  const fallbackClone = request.clone();
  let upstreamResponse = null;

  // 1. Try Express server proxy
  try {
    upstreamResponse = await proxyLegacyApi(request);
    if (upstreamResponse?.ok) return upstreamResponse;
  } catch {
    // fall through
  }

  const body = await fallbackClone.json().catch(() => ({}));
  const rawSpreadType = String(body?.spreadType || "one_card").trim();

  // 2. Use tarot engine for rich card data (names, images, keywords)
  try {
    const engine = getEngine();
    const spreadType = engine.normalizeSpreadType(rawSpreadType);
    const cards = engine.drawCards(spreadType);
    return NextResponse.json(
      { ok: true, spreadType, cards, source: "engine" },
      { status: 200 }
    );
  } catch {
    // 3. Minimal fallback
    const normalizedSpreadType = SPREAD_POSITIONS[rawSpreadType] ? rawSpreadType : "one_card";
    const cards = makeFallbackCards(normalizedSpreadType);
    return NextResponse.json(
      {
        ok: true,
        spreadType: normalizedSpreadType,
        cards,
        source: "local-fallback",
        upstreamStatus: upstreamResponse?.status || null,
      },
      { status: 200 }
    );
  }

}
