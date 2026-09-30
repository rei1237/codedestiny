import { calcPower, analyzeJohu, detectJong, applyRuntimeYongshinPolicy } from "../yeongnyangi/fortune/saju-runtime.mjs";

export const SAJU_ELEMENT_KO = Object.freeze({ wood: "목", fire: "화", earth: "토", metal: "금", water: "수" });
const elementNames = (values) => (values || []).map((element) => SAJU_ELEMENT_KO[element]).filter(Boolean);

// Interpret the canonical chart once. Element counts remain a display metric, never a yongshin rule.
export function buildSajuNatalAnalysis(pillars = {}, { timeUnknown = false } = {}) {
  const analysisPillars = Object.fromEntries(["year", "month", "day", "hour"].map((key, index) => {
    const pillar = key === "hour" && timeUnknown ? "" : String(pillars[key] || "");
    return [["y", "m", "d", "h"][index], { g: pillar[0] || "", j: pillar[1] || "" }];
  }));
  const johu = analyzeJohu(analysisPillars);
  const candidate = detectJong(analysisPillars);
  const power = applyRuntimeYongshinPolicy(calcPower(analysisPillars), candidate, johu);
  const jong = { ...candidate, confirmationRequired: candidate.isJong === true };
  const uncertainty = timeUnknown ? " 시주를 제외한 잠정 해석으로 출생 시각에 따라 달라질 수 있습니다." : "";
  const jongNote = jong.isJong ? " 종격은 후보이며 원국의 반대 기운과 성립 조건을 함께 확인합니다." : "";
  const useful = elementNames(power?.yongshin).join("·");
  const caution = elementNames(power?.kijishin).join("·");
  return {
    power,
    johu,
    jong,
    analysisBasis: "screen-saju-runtime: eokbu + johu; jong candidates remain conditional",
    limitation: "오행 수량의 최소값은 용신 판정이 아닙니다. 월령과 일간의 관계, 억부·조후를 함께 본 조건부 해석입니다." + jongNote + uncertainty,
    strength: (power ? (power.isStrong ? "억부 기준 신강: 일간을 돕는 기운이 강한 편" : "억부 기준 신약: 일간을 돕는 기운이 약한 편") : "일간 강약 미산출") + jongNote + uncertainty,
    usefulGod: (useful ? useful + " 기운을 공통 억부·조후 해석의 희용신 후보로 봅니다. 오행 수량이 가장 적다는 이유로 정한 용신은 아닙니다." : "희용신 후보를 산출하지 못했습니다.") + jongNote + uncertainty,
    unfavorableGod: (caution ? caution + " 기운은 공통 억부·조후 해석에서 과도한 작용을 살필 기신 후보입니다. 손실이나 불운을 확정하는 뜻은 아닙니다." : "특정 기신 후보를 확정하지 않고 원국의 균형을 살핍니다.") + jongNote + uncertainty,
  };
}
