// 신호 추출 — 두 명식(연·월·일주)에서 설명 가능한 관계 신호를 뽑는다.
// 각 신호는 {key, tone, weight, evidenceKo}. tone: harmony|friction|neutral. weight: 1(일주)|0.5(연·월지 보조)|0(참고).
// 유형 판정(chemiTypes.js)은 일주 신호만 쓰고, signalStrength 는 모든 비중립 신호의 가중 합으로 잰다.
import {
  ELEMENT_KO,
  branchRelations,
  controls,
  generates,
  hongyeomBranch,
  peachBlossomBranch,
  stemRelation,
  tenGodFromDayMaster,
  tenGodTone,
} from "./relations.js";

const BRANCH_RELATION_TONE = Object.freeze({
  yukhap: "harmony",
  samhap: "harmony",
  chung: "friction",
  hyeong: "friction",
  pa: "friction",
  hae: "friction",
  wonjin: "friction",
});
const BRANCH_RELATION_KO = Object.freeze({
  yukhap: "육합", samhap: "삼합", chung: "충", hyeong: "형", pa: "파", hae: "해", wonjin: "원진",
});
const YIN_YANG_KO = Object.freeze({ yang: "양", yin: "음" });

function signal(key, tone, weight, evidenceKo) {
  return Object.freeze({ key, tone, weight, evidenceKo });
}

function stemPairKo(user, partner) {
  return "나 " + user.day.stem + "(" + ELEMENT_KO[user.day.stemElement] + ") · 최애 " + partner.day.stem + "(" + ELEMENT_KO[partner.day.stemElement] + ")";
}

function stemSignals(user, partner) {
  const rel = stemRelation(user.day.stem, partner.day.stem);
  const out = [];
  const pair = stemPairKo(user, partner);
  if (rel === "hap") out.push(signal("dayStem.hap", "harmony", 1, "일간 천간합 — " + pair));
  else if (rel === "chung") out.push(signal("dayStem.chung", "friction", 1, "일간 천간충 — " + pair));
  else if (rel === "same") out.push(signal("dayStem.same", "harmony", 1, "일간 같은 오행 — " + pair));
  else if (rel === "generate") {
    const dir = generates(user.day.stemElement, partner.day.stemElement) ? "내가 최애를 살리는 방향" : "최애가 나를 살리는 방향";
    out.push(signal("dayStem.generate", "harmony", 1, "일간 상생 — " + pair + ", " + dir));
  } else if (rel === "control") {
    const dir = controls(user.day.stemElement, partner.day.stemElement) ? "내가 최애를 다잡는 방향" : "최애가 나를 다잡는 방향";
    out.push(signal("dayStem.control", "friction", 1, "일간 상극 — " + pair + ", " + dir));
  }
  if (user.yinYang !== partner.yinYang) {
    out.push(signal("yinYang.opposite", "neutral", 1, "일간 음양이 반대 — 나 " + YIN_YANG_KO[user.yinYang] + " · 최애 " + YIN_YANG_KO[partner.yinYang]));
  }
  const tenGod = tenGodFromDayMaster(user.day.stem, partner.day.stem);
  if (tenGod) {
    const tone = tenGodTone(tenGod);
    const mapped = tone === "harmonious" ? "harmony" : tone === "frictional" ? "friction" : "neutral";
    out.push(signal("tenGod." + tenGod, mapped, 0, "내 일간이 보는 최애: " + tenGod));
  }
  return out;
}

function branchSignals(prefix, labelKo, a, b, weight) {
  return branchRelations(a.branch, b.branch).map((rel) =>
    signal(prefix + "." + rel, BRANCH_RELATION_TONE[rel], weight, labelKo + " " + BRANCH_RELATION_KO[rel] + " — 나 " + a.branch + " · 최애 " + b.branch),
  );
}

function elementSignals(user, partner) {
  const out = [];
  const complement = user.lacking.includes(partner.strongest) || user.weakest === partner.strongest;
  if (complement) {
    out.push(signal("element.complement", "harmony", 1, "내게 적은 " + ELEMENT_KO[partner.strongest] + " 기운이 최애에게 가장 많음"));
  }
  if (user.strongest === partner.strongest) {
    out.push(signal("element.sameStrongest", "neutral", 0.5, "둘 다 " + ELEMENT_KO[user.strongest] + " 기운이 가장 많음"));
  }
  return out;
}

function sinsalSignals(user, partner) {
  const out = [];
  const dohwaU = peachBlossomBranch(user.day.branch);
  const dohwaP = peachBlossomBranch(partner.day.branch);
  if (dohwaU && partner.day.branch === dohwaU) out.push(signal("sinsal.dohwa", "harmony", 1, "최애 일지 " + partner.day.branch + "가 내 도화 자리"));
  else if (dohwaP && user.day.branch === dohwaP) out.push(signal("sinsal.dohwa", "harmony", 1, "내 일지 " + user.day.branch + "가 최애 도화 자리"));
  const hyU = hongyeomBranch(user.day.stem);
  const hyP = hongyeomBranch(partner.day.stem);
  if (hyU && partner.day.branch === hyU) out.push(signal("sinsal.hongyeom", "harmony", 1, "최애 일지 " + partner.day.branch + "가 내 홍염 자리"));
  else if (hyP && user.day.branch === hyP) out.push(signal("sinsal.hongyeom", "harmony", 1, "내 일지 " + user.day.branch + "가 최애 홍염 자리"));
  return out;
}

/**
 * @param user buildChemiPillars 결과
 * @param partner buildChemiPillars 결과
 * @param {{minorMode?:boolean}} options minorMode 면 도화·홍염 신호를 아예 만들지 않는다.
 */
export function deriveSignals(user, partner, options) {
  const minorMode = Boolean(options && options.minorMode);
  const out = [
    ...stemSignals(user, partner),
    ...branchSignals("dayBranch", "일지", user.day, partner.day, 1),
    ...branchSignals("yearBranch", "연지", user.year, partner.year, 0.5),
    ...branchSignals("monthBranch", "월지", user.month, partner.month, 0.5),
    ...elementSignals(user, partner),
  ];
  if (!minorMode) out.push(...sinsalSignals(user, partner));
  return Object.freeze(out);
}

/** 비중립 신호 가중 합 → high(≥4) / medium(2~3) / low(≤1). */
export function resolveSignalStrength(signals) {
  const score = signals.filter((s) => s.tone !== "neutral").reduce((sum, s) => sum + s.weight, 0);
  if (score >= 4) return "high";
  if (score >= 2) return "medium";
  return "low";
}

export function hasSignal(signals, key) {
  return signals.some((s) => s.key === key);
}
