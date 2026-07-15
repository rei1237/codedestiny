// Layer 1 — 결정론 궁합 엔진.
// 순수 함수. 선택지·stats·난수·Date를 인자로 받지 않는다 → 결과 오염이 타입 레벨에서 불가능하다.
// per-person 명리는 normalizeSaju(=calculateLocalSaju)가 이미 계산했고, 여기서는 두 명식을 "비교"만 한다.

import type {
  CompatDimension,
  CompatDimensionKey,
  CompatIndicator,
  CompatibilityProfile,
  ElementKey,
  NormalizedSaju,
} from "./compatibilityTypes";
import { DIMENSION_KEYS, DIMENSION_LABELS } from "./compatibilityTypes";
import type { CompatWeights } from "../_config/weights.config";
import {
  ELEMENT_KO,
  branchRelations,
  hongyeomBranch,
  peachBlossomBranch,
  stemRelation,
  tenGodFromDayMaster,
  tenGodTone,
} from "./relations";

const ENGINE_VERSION = "1.0.0";

type DimEffect = { dim: CompatDimensionKey; amount: number };

// conflict 차원은 "마찰의 크기"(높을수록 갈등 큼)를 뜻한다.
// 나머지 차원은 "그 자질의 크기"(높을수록 좋음)를 뜻한다.
// amount는 해당 차원의 자질을 올리는 방향이 +다.

function fnv1a(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function buildInputHash(self: NormalizedSaju, partner: NormalizedSaju, weightsVersion: string): string {
  const sig = (s: NormalizedSaju) =>
    [
      s.pillars.year?.ganji ?? "",
      s.pillars.month?.ganji ?? "",
      s.pillars.day.ganji,
      s.pillars.hour?.ganji ?? "",
      s.dayStem,
      s.dayBranch,
      s.yinYang,
      s.coreYongshin ?? "",
      s.gisin.join(","),
    ].join("/");
  return fnv1a(`${ENGINE_VERSION}|${weightsVersion}|${sig(self)}||${sig(partner)}`);
}

export function computeCompatibilityProfile(
  self: NormalizedSaju,
  partner: NormalizedSaju,
  weights: CompatWeights,
): CompatibilityProfile {
  const indicators: CompatIndicator[] = [];
  const dimContribs: Record<CompatDimensionKey, number[]> = {
    attraction: [],
    stability: [],
    communication: [],
    conflict: [],
    longevity: [],
  };

  const addIndicator = (
    key: string,
    label: string,
    evidence: string,
    confidence: CompatIndicator["confidence"],
    effects: DimEffect[],
  ) => {
    const weight = weights.indicators[key] ?? 0;
    if (weight === 0 || effects.length === 0) return;
    const rep = effects.reduce((max, e) => (Math.abs(e.amount) > Math.abs(max) ? e.amount : max), 0);
    indicators.push({
      key,
      label,
      rawScore: rep,
      weight,
      weighted: rep * weight,
      evidence,
      dimensions: effects.map((e) => e.dim),
      confidence,
    });
    effects.forEach((e) => dimContribs[e.dim].push(e.amount * weight));
  };

  const ko = (element: ElementKey | null) => (element ? ELEMENT_KO[element] : "");

  // ── 1) 일간(日干) 관계 ──
  const sRel = stemRelation(self.dayStem, partner.dayStem);
  const stemPair = `${self.dayStem}·${partner.dayStem}`;
  if (sRel === "hap") {
    addIndicator("dayStem.hap", "일간 천간합", `두 일간 ${stemPair}이 천간합을 이뤄, 서로의 감정 반응을 빠르게 알아차리고 자연스럽게 끌어당깁니다.`, "high", [
      { dim: "attraction", amount: 80 },
      { dim: "stability", amount: 50 },
      { dim: "longevity", amount: 40 },
    ]);
  } else if (sRel === "generate") {
    addIndicator("dayStem.generate", "일간 상생", `일간 오행이 상생의 흐름이라, 한 사람의 기운이 다른 사람의 안정과 설렘을 살려 줍니다.`, "high", [
      { dim: "longevity", amount: 65 },
      { dim: "stability", amount: 45 },
      { dim: "attraction", amount: 35 },
    ]);
  } else if (sRel === "same") {
    addIndicator("dayStem.same", "일간 동류", `두 일간이 같은 결의 기운이라 반응 속도와 감각이 닮아, 처음부터 낯설지 않습니다.`, "high", [
      { dim: "communication", amount: 45 },
      { dim: "stability", amount: 20 },
    ]);
  } else if (sRel === "control") {
    addIndicator("dayStem.control", "일간 상극", `일간 오행이 상극이라 강하게 끌리는 만큼, 말의 속도와 자존심이 부딪히기 쉽습니다.`, "high", [
      { dim: "attraction", amount: 45 },
      { dim: "conflict", amount: 65 },
      { dim: "stability", amount: -35 },
    ]);
  } else if (sRel === "chung") {
    addIndicator("dayStem.chung", "일간 천간충", `두 일간 ${stemPair}이 천간충이라, 끌림은 선명해도 정면으로 부딪히는 긴장이 큽니다.`, "high", [
      { dim: "conflict", amount: 80 },
      { dim: "stability", amount: -55 },
      { dim: "attraction", amount: 25 },
    ]);
  }

  // ── 2) 지지(地支) 관계 — 배우자궁(일지) 기준 ──
  const branchPair = `${self.dayBranch}·${partner.dayBranch}`;
  const bRels = branchRelations(self.dayBranch, partner.dayBranch);
  const branchEffectMap: Record<string, { label: string; evidence: string; effects: DimEffect[] }> = {
    yukhap: {
      label: "배우자궁 육합",
      evidence: `배우자궁 지지 ${branchPair}가 육합으로 묶여, 관계의 기본 리듬과 생활 감각이 은근히 맞물립니다.`,
      effects: [{ dim: "stability", amount: 65 }, { dim: "longevity", amount: 45 }, { dim: "communication", amount: 20 }],
    },
    samhap: {
      label: "배우자궁 삼합",
      evidence: `배우자궁 지지가 삼합의 결에 함께 들어, 같은 방향을 바라볼 때 결속이 오래갑니다.`,
      effects: [{ dim: "longevity", amount: 55 }, { dim: "stability", amount: 40 }],
    },
    chung: {
      label: "배우자궁 충",
      evidence: `배우자궁 지지 ${branchPair}가 충이라, 생활 리듬이 어긋날 때 작은 오해도 크게 번질 수 있습니다.`,
      effects: [{ dim: "conflict", amount: 70 }, { dim: "stability", amount: -45 }],
    },
    hyeong: {
      label: "배우자궁 형",
      evidence: `배우자궁 지지에 형(刑)의 결이 있어, 서로를 다듬으려는 마음이 지나치면 피로가 쌓입니다.`,
      effects: [{ dim: "conflict", amount: 45 }, { dim: "communication", amount: -25 }],
    },
    pa: {
      label: "배우자궁 파",
      evidence: `배우자궁 지지에 파(破)의 신호가 있어, 약속이 흔들리면 신뢰가 금 가기 쉽습니다.`,
      effects: [{ dim: "conflict", amount: 30 }, { dim: "stability", amount: -20 }],
    },
    hae: {
      label: "배우자궁 해",
      evidence: `배우자궁 지지에 해(害)의 결이 있어, 서운함이 말없이 쌓이지 않도록 자주 확인해야 합니다.`,
      effects: [{ dim: "conflict", amount: 40 }, { dim: "communication", amount: -20 }],
    },
    wonjin: {
      label: "배우자궁 원진",
      evidence: `배우자궁 지지 ${branchPair}가 원진이라, 이유를 설명하기 어려운 서운함과 거리감이 반복될 수 있습니다.`,
      effects: [{ dim: "conflict", amount: 55 }, { dim: "communication", amount: -25 }, { dim: "attraction", amount: -15 }],
    },
  };
  bRels.forEach((rel) => {
    const def = branchEffectMap[rel];
    if (def) addIndicator(`branch.${rel}`, def.label, def.evidence, self.timeUnknown || partner.timeUnknown ? "medium" : "high", def.effects);
  });

  // ── 3) 오행 균형 · 용신 상호충족 ──
  const selfCore = self.coreYongshin;
  const partnerCore = partner.coreYongshin;
  const partnerFeedsSelf = Boolean(selfCore && partner.strongElements.includes(selfCore));
  const selfFeedsPartner = Boolean(partnerCore && self.strongElements.includes(partnerCore));
  const fulfillCount = (partnerFeedsSelf ? 1 : 0) + (selfFeedsPartner ? 1 : 0);
  if (fulfillCount > 0) {
    const targets = [
      partnerFeedsSelf && selfCore ? `상대의 기운이 당신의 용신(${ko(selfCore)})을 채워 줍니다` : "",
      selfFeedsPartner && partnerCore ? `당신의 기운이 상대의 용신(${ko(partnerCore)})을 채워 줍니다` : "",
    ].filter(Boolean).join("; ");
    addIndicator("element.yongshinFulfill", "용신 상호충족", `${targets}. 필요한 기운을 서로 보태 주는 관계라 오래 함께할수록 안정이 쌓입니다.`, fulfillCount === 2 ? "high" : "medium", [
      { dim: "stability", amount: fulfillCount === 2 ? 70 : 45 },
      { dim: "longevity", amount: fulfillCount === 2 ? 55 : 35 },
    ]);
  }
  const partnerFeedsSelfGisin = Boolean(self.gisin.length && partner.strongElements.some((e) => self.gisin.includes(e)));
  const selfFeedsPartnerGisin = Boolean(partner.gisin.length && self.strongElements.some((e) => partner.gisin.includes(e)));
  const gisinCount = (partnerFeedsSelfGisin ? 1 : 0) + (selfFeedsPartnerGisin ? 1 : 0);
  if (gisinCount > 0) {
    addIndicator("element.gisinSupply", "기신 자극", `서로에게 부담이 되는 기운(기신)을 키우는 조합이 있어, 지칠 때 그 기운이 먼저 올라올 수 있습니다.`, "medium", [
      { dim: "conflict", amount: gisinCount === 2 ? 60 : 45 },
    ]);
  }

  const sharedStrong = self.strongElements.filter((e) => partner.strongElements.includes(e));
  if (sharedStrong.length > 0) {
    addIndicator("element.resonance", "오행 공명", `강한 기운 중 ${sharedStrong.map(ko).join(", ")}이 겹쳐, 취향과 표현 방식이 자연스럽게 닿습니다.`, "high", [
      { dim: "communication", amount: 30 },
      { dim: "attraction", amount: 15 },
    ]);
  }
  const selfLacking = (Object.entries(self.elementCounts) as Array<[ElementKey, number]>).filter(([, v]) => v === 0).map(([e]) => e);
  const partnerLacking = (Object.entries(partner.elementCounts) as Array<[ElementKey, number]>).filter(([, v]) => v === 0).map(([e]) => e);
  const complements = partner.strongElements.some((e) => selfLacking.includes(e)) || self.strongElements.some((e) => partnerLacking.includes(e));
  if (complements) {
    addIndicator("element.complement", "오행 보완", `서로에게 부족한 기운을 채워 주는 결이라, 함께 있을 때 선택의 폭과 마음의 여유가 넓어집니다.`, "medium", [
      { dim: "stability", amount: 40 },
      { dim: "longevity", amount: 25 },
    ]);
  }

  // ── 4) 십신(十神) 배치 — 두 일간의 교차 역학 ──
  const tenGodMeaning: Record<string, string> = {
    정관: "안정적인 신뢰와 책임의 역할", 편관: "긴장과 통제가 오가는 자극의 역할",
    정재: "현실적으로 아껴 주는 역할", 편재: "즐거움과 변화가 큰 역할",
    정인: "돌봄과 포용을 받는 역할", 편인: "생각을 넓혀 주지만 거리도 있는 역할",
    식신: "편안한 표현과 여유를 나누는 역할", 상관: "재기 넘치지만 표현이 부딪히는 역할",
    비견: "친구 같은 대등한 역할", 겁재: "경쟁심이 섞인 대등한 역할",
  };
  const addTenGod = (fromStem: string, toStem: string, subjectLabel: string) => {
    const tg = tenGodFromDayMaster(fromStem, toStem);
    if (!tg) return;
    const tone = tenGodTone(tg);
    const meaning = tenGodMeaning[tg] || "관계 역할";
    if (tone === "harmonious") {
      addIndicator("tenGod.harmonious", "십신 배치", `${subjectLabel} ${tg}(十神)에 해당해 ${meaning}을 만듭니다.`, "high", [
        { dim: "communication", amount: 45 },
        { dim: "attraction", amount: 25 },
      ]);
    } else if (tone === "frictional") {
      addIndicator("tenGod.frictional", "십신 배치", `${subjectLabel} ${tg}(十神)에 해당해 ${meaning}이라, 말과 감정의 속도를 맞춰야 합니다.`, "high", [
        { dim: "conflict", amount: 45 },
        { dim: "communication", amount: -15 },
      ]);
    } else {
      addIndicator("tenGod.neutral", "십신 배치", `${subjectLabel} ${tg}(十神)에 해당해 ${meaning}을 만듭니다.`, "medium", [
        { dim: "communication", amount: 15 },
      ]);
    }
  };
  addTenGod(self.dayStem, partner.dayStem, "상대는 당신에게");
  addTenGod(partner.dayStem, self.dayStem, "당신은 상대에게");

  // ── 5) 신살(神殺) 교차 — 도화·홍염 ──
  const selfDohwa = [peachBlossomBranch(self.dayBranch), peachBlossomBranch(self.yearBranch ?? "")].filter(Boolean) as string[];
  const partnerDohwa = [peachBlossomBranch(partner.dayBranch), peachBlossomBranch(partner.yearBranch ?? "")].filter(Boolean) as string[];
  const dohwaHits = (selfDohwa.includes(partner.dayBranch) ? 1 : 0) + (partnerDohwa.includes(self.dayBranch) ? 1 : 0);
  if (dohwaHits > 0) {
    addIndicator("sinsal.dohwa", "도화 교차", `상대의 지지가 서로의 도화(桃花) 자리를 건드려, 첫인상부터 끌림이 또렷하게 살아납니다.`, "medium", [
      { dim: "attraction", amount: Math.min(60, dohwaHits * 35) },
    ]);
  }
  const selfHong = hongyeomBranch(self.dayStem);
  const partnerHong = hongyeomBranch(partner.dayStem);
  const hongHits = (selfHong && partner.dayBranch === selfHong ? 1 : 0) + (partnerHong && self.dayBranch === partnerHong ? 1 : 0);
  if (hongHits > 0) {
    addIndicator("sinsal.hongyeom", "홍염 교차", `홍염(紅艶)의 매혹이 상대의 지지와 닿아, 은근하지만 오래 남는 호감이 흐릅니다.`, "medium", [
      { dim: "attraction", amount: Math.min(50, hongHits * 35) },
    ]);
  }

  // ── 6) 음양(陰陽) ──
  if (self.yinYang === partner.yinYang) {
    addIndicator("yinYang.same", "음양 동조", `${self.yinYang === "yin" ? "음" : "양"}의 리듬이 닮아, 관계의 속도를 맞추기 쉽습니다.`, "high", [
      { dim: "communication", amount: 30 },
    ]);
  } else {
    addIndicator("yinYang.complement", "음양 보완", `음양이 달라 서로의 빈칸을 채우지만, 확인의 언어를 자주 맞춰야 오해가 줄어듭니다.`, "high", [
      { dim: "attraction", amount: 25 },
      { dim: "communication", amount: 15 },
    ]);
  }

  // ── 종합 규칙 (단순 합산 금지) ──
  const BASE = 50;
  const synthesisNotes: string[] = [];
  const dimScore: Record<CompatDimensionKey, number> = {
    attraction: BASE, stability: BASE, communication: BASE, conflict: BASE, longevity: BASE,
  };
  let conflictTransfer = 0;

  (["attraction", "stability", "communication", "longevity"] as CompatDimensionKey[]).forEach((dim) => {
    const arr = dimContribs[dim];
    const P = arr.filter((x) => x > 0).reduce((a, b) => a + b, 0);
    const N = arr.filter((x) => x < 0).reduce((a, b) => a - b, 0); // 양수 절대값
    let contribution: number;
    if (P > 0 && N > 0) {
      const bigger = Math.max(P, N);
      const smaller = Math.min(P, N);
      contribution = (P >= N ? 1 : -1) * bigger * 0.7;
      conflictTransfer += smaller * 0.5;
      synthesisNotes.push(`${DIMENSION_LABELS[dim]}에는 우호와 마찰 신호가 함께 있어, 강한 쪽을 중심으로 보되 긴장을 갈등 지표로 옮겨 반영했습니다.`);
    } else {
      contribution = P - N;
    }
    dimScore[dim] = clamp(BASE + contribution);
  });
  const conflictRaw = dimContribs.conflict.reduce((a, b) => a + b, 0);
  dimScore.conflict = clamp(BASE + conflictRaw + conflictTransfer);

  // 차원 객체 구성
  const driversFor = (dim: CompatDimensionKey) =>
    indicators
      .filter((ind) => ind.dimensions.includes(dim))
      .sort((a, b) => Math.abs(b.weighted) - Math.abs(a.weighted))
      .slice(0, 3)
      .map((ind) => ind.key);
  const bandFor = (dim: CompatDimensionKey, value: number): CompatDimension["band"] => {
    const good = dim === "conflict" ? 100 - value : value;
    if (good >= 66) return "strong";
    if (good <= 40) return "watch";
    return "balanced";
  };
  const dimensions = DIMENSION_KEYS.reduce((acc, dim) => {
    acc[dim] = {
      key: dim,
      label: DIMENSION_LABELS[dim],
      score: Math.round(dimScore[dim]),
      band: bandFor(dim, dimScore[dim]),
      drivers: driversFor(dim),
    };
    return acc;
  }, {} as Record<CompatDimensionKey, CompatDimension>);

  // 종합 점수 — conflict는 (100-score)로 역산
  const dw = weights.dimensionWeights;
  const rawScore =
    dw.attraction * dimScore.attraction +
    dw.stability * dimScore.stability +
    dw.communication * dimScore.communication +
    dw.longevity * dimScore.longevity +
    dw.conflict * (100 - dimScore.conflict);
  const score = clamp(Math.round(rawScore));

  const grade = resolveGrade(score);
  const coreVerdict = resolveCoreVerdict(dimensions, score);

  const dataGaps: string[] = [];
  if (self.timeUnknown || partner.timeUnknown) dataGaps.push("출생 시간이 없어 시주(時柱)는 제외하고 계산했습니다.");
  if (!self.coreYongshin || !partner.coreYongshin) dataGaps.push("용신 정보가 일부 확인되지 않아 오행 보완 판단을 보수적으로 봤습니다.");

  return {
    engineVersion: ENGINE_VERSION,
    weightsVersion: weights.version,
    inputHash: buildInputHash(self, partner, weights.version),
    indicators,
    dimensions,
    score,
    grade,
    coreVerdict,
    synthesisNotes: Array.from(new Set(synthesisNotes)),
    dataGaps,
  };
}

// 기존 UX 연속성을 위해 등급명 유지(resolveSajuCompatibilityGrade와 동일 밴드).
function resolveGrade(score: number): string {
  if (score >= 86) return "상급 궁합";
  if (score >= 74) return "안정 성장궁합";
  if (score >= 62) return "설렘 조율궁합";
  if (score >= 48) return "거리 조절궁합";
  return "냉각 주의궁합";
}

function resolveCoreVerdict(dimensions: Record<CompatDimensionKey, CompatDimension>, score: number): string {
  const strong = (k: CompatDimensionKey) => dimensions[k].band === "strong";
  const watch = (k: CompatDimensionKey) => dimensions[k].band === "watch";
  const lowConflict = dimensions.conflict.score <= 45;
  const highConflict = dimensions.conflict.score >= 60;

  if (strong("attraction") && strong("stability") && lowConflict) return "운명의 코드가 열린 관계";
  if (strong("stability") && strong("longevity")) return "천천히 깊어지는 인연";
  if (strong("attraction") && highConflict) return "설렘은 크지만 조율이 필요한 관계";
  if (watch("communication")) return "서로의 언어를 배워야 하는 관계";
  if (highConflict) return "거리감 조절이 필요한 관계";
  if (score >= 62) return "차분히 서로를 맞춰 가는 관계";
  return "속도를 늦춰 확인이 필요한 관계";
}
