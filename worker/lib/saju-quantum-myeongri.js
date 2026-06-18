const STEM_ELEMENT = Object.freeze({
  甲: "wood",
  乙: "wood",
  丙: "fire",
  丁: "fire",
  戊: "earth",
  己: "earth",
  庚: "metal",
  辛: "metal",
  壬: "water",
  癸: "water",
});

const BRANCH_ELEMENT = Object.freeze({
  子: "water",
  丑: "earth",
  寅: "wood",
  卯: "wood",
  辰: "earth",
  巳: "fire",
  午: "fire",
  未: "earth",
  申: "metal",
  酉: "metal",
  戌: "earth",
  亥: "water",
});

const ELEMENT_LABELS = Object.freeze({
  wood: "목(木)",
  fire: "화(火)",
  earth: "토(土)",
  metal: "금(金)",
  water: "수(水)",
});

const CONTROL_TO = Object.freeze({
  wood: "earth",
  fire: "metal",
  earth: "water",
  metal: "wood",
  water: "fire",
});

const GENERATE_TO = Object.freeze({
  wood: "fire",
  fire: "earth",
  earth: "metal",
  metal: "water",
  water: "wood",
});

const GAN_HE = Object.freeze({
  甲: { 己: "earth" },
  己: { 甲: "earth" },
  乙: { 庚: "metal" },
  庚: { 乙: "metal" },
  丙: { 辛: "water" },
  辛: { 丙: "water" },
  丁: { 壬: "wood" },
  壬: { 丁: "wood" },
  戊: { 癸: "fire" },
  癸: { 戊: "fire" },
});

const ZHI_HE = Object.freeze({
  子: { 丑: "earth" },
  丑: { 子: "earth" },
  寅: { 亥: "wood" },
  亥: { 寅: "wood" },
  卯: { 戌: "fire" },
  戌: { 卯: "fire" },
  辰: { 酉: "metal" },
  酉: { 辰: "metal" },
  巳: { 申: "water" },
  申: { 巳: "water" },
  午: { 未: "fire" },
  未: { 午: "fire" },
});

const GAN_CHUNG = Object.freeze({
  甲: "庚",
  庚: "甲",
  乙: "辛",
  辛: "乙",
  丙: "壬",
  壬: "丙",
  丁: "癸",
  癸: "丁",
});

const ZHI_CHUNG = Object.freeze({
  子: "午",
  午: "子",
  丑: "未",
  未: "丑",
  寅: "申",
  申: "寅",
  卯: "酉",
  酉: "卯",
  辰: "戌",
  戌: "辰",
  巳: "亥",
  亥: "巳",
});

const SAMHAP = Object.freeze([
  { members: ["申", "子", "辰"], element: "water" },
  { members: ["亥", "卯", "未"], element: "wood" },
  { members: ["寅", "午", "戌"], element: "fire" },
  { members: ["巳", "酉", "丑"], element: "metal" },
]);

const ELEMENT_ALIASES = Object.freeze({
  wood: "wood",
  "목": "wood",
  "목(木)": "wood",
  fire: "fire",
  "화": "fire",
  "화(火)": "fire",
  earth: "earth",
  "토": "earth",
  "토(土)": "earth",
  metal: "metal",
  "금": "metal",
  "금(金)": "metal",
  water: "water",
  "수": "water",
  "수(水)": "water",
});

function normalizeElementKey(value) {
  const text = String(value || "").trim();
  return ELEMENT_ALIASES[text] || "";
}

function normalizeElementKeys(value, fallback = []) {
  const source = Array.isArray(value) ? value : [value];
  const keys = source.map(normalizeElementKey).filter(Boolean);
  if (keys.length) return [...new Set(keys)];
  return normalizeElementKeys(fallback, []);
}

function whoControls(element) {
  return Object.entries(CONTROL_TO).find(([, target]) => target === element)?.[0] || "earth";
}

function parentOf(element) {
  return Object.entries(GENERATE_TO).find(([, target]) => target === element)?.[0] || "earth";
}

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
}

function normalizePillars(pillars = {}) {
  const read = (primary, alt) => {
    const p = pillars?.[primary] || pillars?.[alt] || {};
    return {
      g: String(p.g || p.stem || "").trim(),
      j: String(p.j || p.branch || "").trim(),
    };
  };
  return {
    y: read("y", "year"),
    m: read("m", "month"),
    d: read("d", "day"),
    h: read("h", "hour"),
  };
}

function normalizePower(power = {}) {
  return {
    yongshin: normalizeElementKeys(power.yongshin || power.yong || power.useful || power.favorable),
    kijishin: normalizeElementKeys(power.kijishin || power.gi || power.kishin || power.caution),
  };
}

function normalizeJohuType(johu = {}, pillars = {}) {
  const raw = String(johu?.type || johu?.coldHot || johu?.label || "").toLowerCase();
  if (/cold|cool|한랭|차|냉/.test(raw)) return "cold";
  if (/hot|warm|과열|온|열/.test(raw)) return "hot";
  const monthBranch = pillars?.m?.j || "";
  if (["亥", "子", "丑", "寅"].includes(monthBranch)) return "cold";
  if (["巳", "午", "未"].includes(monthBranch)) return "hot";
  return "neutral";
}

function normalizeJong(jong = {}, pillars = {}) {
  const dominant = normalizeElementKey(jong?.dominant || jong?.element || jong?.mainElement);
  const dayElement = STEM_ELEMENT[pillars?.d?.g] || "";
  return {
    isJong: jong?.isJong === true,
    isGaJong: jong?.isGaJong === true,
    name: String(jong?.name || ""),
    dominant,
    parEl: normalizeElementKey(jong?.parEl || jong?.supportElement || dominant),
    dayEl: normalizeElementKey(jong?.dayEl || dayElement),
    ganHeMerged: jong?.ganHeMerged && typeof jong.ganHeMerged === "object" ? jong.ganHeMerged : {},
    jiHeMerged: jong?.jiHeMerged && typeof jong.jiHeMerged === "object" ? jong.jiHeMerged : {},
  };
}

function getJohuScore(element, isZhi, charStr, johuType) {
  const weight = isZhi ? 1.5 : 1;
  if (johuType === "cold") {
    if (element === "fire") return 10 * weight;
    if (element === "earth") return isZhi && ["未", "戌"].includes(charStr) ? 8 * weight : 5 * weight;
    if (element === "wood") return 3 * weight;
    if (element === "metal") return -3 * weight;
    if (element === "water") return -10 * weight;
  }
  if (johuType === "hot") {
    if (element === "water") return 10 * weight;
    if (element === "metal") return 5 * weight;
    if (element === "earth") {
      if (isZhi && ["辰", "丑"].includes(charStr)) return 5 * weight;
      if (isZhi && ["未", "戌"].includes(charStr)) return -8 * weight;
      return -3 * weight;
    }
    if (element === "wood") return -3 * weight;
    if (element === "fire") return -10 * weight;
  }
  return 0;
}

function getEokbuScore(element, isZhi, power, jong) {
  const weight = jong.isJong ? (isZhi ? 15 : 10) : (isZhi ? 12 : 8);
  if (jong.isJong) {
    if (element === jong.dominant || element === jong.parEl) return weight;
    if (element === whoControls(jong.dominant)) return -weight;
    if (jong.name.includes("종재격") && jong.dayEl && element === parentOf(jong.dayEl)) return -weight;
    return 0;
  }
  if (power.yongshin.includes(element)) return weight;
  if (power.kijishin.includes(element)) return -weight;
  return 0;
}

function baseElementType(element, power, jong, johuType) {
  if (!element) return "neutral";
  if (jong.isJong) {
    if (element === jong.dominant || element === jong.parEl) return "good";
    if (element === whoControls(jong.dominant)) return "bad";
    return "neutral";
  }
  let johuGood = false;
  let johuBad = false;
  if (johuType === "hot") {
    johuGood = ["water", "metal"].includes(element);
    johuBad = ["fire", "wood"].includes(element);
  } else if (johuType === "cold") {
    johuGood = ["fire", "wood"].includes(element);
    johuBad = ["water", "metal"].includes(element);
  }
  const eokbuGood = power.yongshin.includes(element);
  const eokbuBad = power.kijishin.includes(element);
  if (johuGood || eokbuGood) return "good";
  if (johuBad || eokbuBad) return "bad";
  return "neutral";
}

function evaluateSajuQuantumElement(element, context = {}) {
  const pillars = normalizePillars(context.pillars);
  const power = normalizePower(context.power);
  const jong = normalizeJong(context.jong, pillars);
  const johuType = normalizeJohuType(context.johu, pillars);
  return baseElementType(normalizeElementKey(element) || element, power, jong, johuType);
}

function evaluateDaewun(ganChar, zhiChar, context = {}) {
  const pillars = normalizePillars(context.pillars);
  const power = normalizePower(context.power);
  const jong = normalizeJong(context.jong, pillars);
  const johuType = normalizeJohuType(context.johu, pillars);
  const origGans = [pillars.y.g, pillars.m.g, pillars.d.g, pillars.h.g].filter(Boolean);
  const origZhis = [pillars.y.j, pillars.m.j, pillars.d.j, pillars.h.j].filter(Boolean);
  const ganEl = STEM_ELEMENT[ganChar] || "earth";
  const zhiEl = BRANCH_ELEMENT[zhiChar] || "earth";

  let finalGanEl = ganEl;
  origGans.forEach((og) => {
    if (GAN_HE[ganChar]?.[og]) finalGanEl = GAN_HE[ganChar][og];
    else if (GAN_HE[og]?.[ganChar]) finalGanEl = GAN_HE[og][ganChar];
  });

  let finalZhiEl = zhiEl;
  origZhis.forEach((oz) => {
    if (ZHI_HE[zhiChar]?.[oz]) finalZhiEl = ZHI_HE[zhiChar][oz];
    else if (ZHI_HE[oz]?.[zhiChar]) finalZhiEl = ZHI_HE[oz][zhiChar];
  });

  const ganJohu = getJohuScore(finalGanEl, false, ganChar, johuType);
  const zhiJohu = getJohuScore(finalZhiEl, true, zhiChar, johuType);
  const ganEokbu = getEokbuScore(finalGanEl, false, power, jong);
  const zhiEokbu = getEokbuScore(finalZhiEl, true, power, jong);
  const ganScore = ganJohu + ganEokbu;
  const zhiScore = zhiJohu + zhiEokbu;

  const isFavorable = (element, isZhi, charStr) => (
    getJohuScore(element, isZhi, charStr, johuType) + getEokbuScore(element, isZhi, power, jong)
  ) > 0;
  const isUnfavorable = (element, isZhi, charStr) => (
    getJohuScore(element, isZhi, charStr, johuType) + getEokbuScore(element, isZhi, power, jong)
  ) < 0;

  let chungBonus = 0;
  let chungPenalty = 0;
  let hasChungBonus = false;
  let hasChungPenalty = false;
  let chungBonusText = "";
  let chungPenaltyText = "";
  const isMetalDayMaster = ["庚", "辛"].includes(pillars.d.g);
  let isFireFavorable = power.yongshin.includes("fire") || isFavorable("fire", false, "丙");
  if (jong.isJong) isFireFavorable = isFireFavorable || jong.dominant === "fire" || jong.parEl === "fire";
  const checkMetalFireWater = (srcChar, targetChar) => {
    if (!isMetalDayMaster || !isFireFavorable) return false;
    const srcEl = STEM_ELEMENT[srcChar] || BRANCH_ELEMENT[srcChar] || "";
    const targetEl = STEM_ELEMENT[targetChar] || BRANCH_ELEMENT[targetChar] || "";
    return (srcEl === "fire" && targetEl === "water") || (srcEl === "water" && targetEl === "fire");
  };

  if (pillars.d.g === "辛" && ganChar === "丁") {
    const hasWood = zhiEl === "wood"
      || origGans.some((g) => STEM_ELEMENT[g] === "wood")
      || origZhis.some((z) => BRANCH_ELEMENT[z] === "wood");
    chungPenalty -= hasWood ? 55 : 15;
    hasChungPenalty = true;
    chungPenaltyText = hasWood ? "신금 일간의 丁 대운에 목 기운까지 겹쳐 보호막이 약해집니다." : "신금 일간의 丁 대운은 과열된 편관으로 작동합니다.";
  }

  if (GAN_CHUNG[ganChar] && origGans.includes(GAN_CHUNG[ganChar])) {
    const targetChar = GAN_CHUNG[ganChar];
    if (!jong.ganHeMerged[targetChar]) {
      const targetEl = STEM_ELEMENT[targetChar] || "earth";
      if (checkMetalFireWater(ganChar, targetChar)) {
        chungBonus += 25;
        hasChungBonus = true;
        chungBonusText = "화련진금 발복";
      } else if (ganScore > 0 && isUnfavorable(targetEl, false, targetChar)) {
        chungBonus += 15;
        hasChungBonus = true;
        chungBonusText = "흉신 파기";
      } else if (ganScore < 0 && isFavorable(targetEl, false, targetChar)) {
        chungPenalty -= 15;
        hasChungPenalty = true;
        chungPenaltyText = "천간 용신 파손";
      } else if (ganScore > 0 && ganEl !== finalGanEl) {
        chungBonus += 10;
        hasChungBonus = true;
        chungBonusText = "합화 용신 보너스";
      }
    }
  }

  if (ZHI_CHUNG[zhiChar] && origZhis.includes(ZHI_CHUNG[zhiChar])) {
    const targetChar = ZHI_CHUNG[zhiChar];
    const targetEl = BRANCH_ELEMENT[targetChar] || "earth";
    if (checkMetalFireWater(zhiChar, targetChar)) {
      chungBonus += 30;
      hasChungBonus = true;
      chungBonusText = [chungBonusText, "수화기제 발복"].filter(Boolean).join(" / ");
    } else if (zhiScore > 0 && isUnfavorable(targetEl, true, targetChar)) {
      chungBonus += 20;
      hasChungBonus = true;
      chungBonusText = [chungBonusText, "지장 흉신 파기"].filter(Boolean).join(" / ");
    } else if (zhiScore < 0 && isFavorable(targetEl, true, targetChar)) {
      chungPenalty -= 20;
      hasChungPenalty = true;
      chungPenaltyText = [chungPenaltyText, "지지 용신 붕괴"].filter(Boolean).join(" / ");
    } else if (zhiScore > 0 && zhiEl !== finalZhiEl) {
      chungBonus += 15;
      hasChungBonus = true;
      chungBonusText = [chungBonusText, "지지 합화 명국"].filter(Boolean).join(" / ");
    }
  }

  let jiheBonus = 0;
  let hasJiheBonus = false;
  let jiheBonusText = "";
  if (ZHI_HE[zhiChar]) {
    origZhis.forEach((oz) => {
      const heEl = ZHI_HE[zhiChar]?.[oz];
      if (!heEl) return;
      const bonus = isFavorable(heEl, true, zhiChar) ? 10 : (isUnfavorable(heEl, true, zhiChar) ? -10 : 0);
      jiheBonus += bonus;
      if (bonus > 0) hasJiheBonus = true;
      if (bonus) jiheBonusText = bonus > 0 ? `지지 육합 ${zhiChar}${oz} ${ELEMENT_LABELS[heEl] || heEl} 강화` : "지지 육합 기신 강화";
    });
  }

  let samhapBonus = 0;
  let hasSamhapBonus = false;
  let samhapBonusText = "";
  SAMHAP.forEach((group) => {
    if (!group.members.includes(zhiChar)) return;
    const matchCount = origZhis.filter((oz) => group.members.includes(oz)).length;
    if (matchCount >= 2) {
      const bonus = isFavorable(group.element, true, zhiChar) ? 22 : (isUnfavorable(group.element, true, zhiChar) ? -22 : 0);
      samhapBonus += bonus;
      if (bonus > 0) hasSamhapBonus = true;
      if (bonus) samhapBonusText = bonus > 0 ? `삼합 ${ELEMENT_LABELS[group.element] || group.element} 발복` : "삼합 기신 강화";
    } else if (matchCount >= 1) {
      const bonus = isFavorable(group.element, true, zhiChar) ? 10 : (isUnfavorable(group.element, true, zhiChar) ? -10 : 0);
      samhapBonus += bonus;
      if (bonus > 0) {
        hasSamhapBonus = true;
        samhapBonusText = `반합 ${ELEMENT_LABELS[group.element] || group.element} 강화`;
      }
    }
  });

  const score = clampScore(50 + ganScore + zhiScore + chungBonus + chungPenalty + jiheBonus + samhapBonus);
  let label = "🙂 보통 운";
  let className = "neutral";
  let tagClassName = "tag-ok";
  let emoji = "🙂";
  if (score >= 80) {
    label = "🌟 최고의 운";
    className = "excellent";
    tagClassName = "tag-best";
    emoji = "🌟";
  } else if (score >= 60) {
    label = "😊 좋은 운";
    className = "good";
    tagClassName = "tag-good";
    emoji = "😊";
  } else if (score < 20) {
    label = "🌧️ 역경 운";
    className = "bad";
    tagClassName = "tag-bad";
    emoji = "🌧️";
  } else if (score < 40) {
    label = "⚠️ 주의 운";
    className = "caution";
    tagClassName = "tag-caut";
    emoji = "⚠️";
  }

  let evalSummary = "";
  if (jong.isJong) {
    const jongLabel = jong.isGaJong ? "가종격" : "종격";
    if (ganEokbu > 0 || zhiEokbu > 0) evalSummary = `${jongLabel} 강화운`;
    else if (ganEokbu < 0 || zhiEokbu < 0) evalSummary = `${jongLabel} 약화운`;
    else evalSummary = `${jongLabel} 중립운`;
  } else {
    const positive = [];
    const negative = [];
    if (ganJohu > 0 || zhiJohu > 5) positive.push("조후용신");
    if (ganJohu < 0 || zhiJohu < -5) negative.push("조후기신");
    if (ganEokbu > 0 || zhiEokbu > 5) positive.push("억부희용");
    if (ganEokbu < 0 || zhiEokbu < -5) negative.push("억부기구");
    if (positive.length && !negative.length) evalSummary = `${positive.join("+")} 대운`;
    else if (!positive.length && negative.length) evalSummary = `${negative.join("+")} 대운`;
    else if (positive.length && negative.length) evalSummary = `복합운(${positive[0]} 외)`;
    else evalSummary = "평운";
  }
  if (hasChungBonus) evalSummary = `[흉신파기] ${evalSummary}`;
  if (hasChungPenalty) evalSummary = `[용신파손] ${evalSummary}`;
  if (hasSamhapBonus) evalSummary = `[삼합발복] ${evalSummary}`;
  else if (hasJiheBonus) evalSummary = `[육합강화] ${evalSummary}`;

  let jongStrength = "";
  if (jong.isJong) {
    if (ganEokbu > 0 || zhiEokbu > 0) jongStrength = "strengthen";
    else if (ganEokbu < 0 || zhiEokbu < 0) jongStrength = "weaken";
    else jongStrength = "neutral";
  }

  return {
    score,
    label,
    className,
    tagClassName,
    emoji,
    evalSummary,
    ganElement: ganEl,
    zhiElement: zhiEl,
    finalGanElement: finalGanEl,
    finalZhiElement: finalZhiEl,
    ganJohu,
    zhiJohu,
    ganEokbu,
    zhiEokbu,
    hasChungBonus,
    hasChungPenalty,
    chungBonusText,
    chungPenaltyText,
    hasJiheBonus,
    jiheBonusText,
    hasSamhapBonus,
    samhapBonusText,
    jongStrength,
  };
}

function buildSajuQuantumElementMap(context = {}) {
  return ["wood", "fire", "earth", "metal", "water"].map((element) => ({
    element,
    label: ELEMENT_LABELS[element],
    verdict: evaluateSajuQuantumElement(element, context),
  }));
}

function buildSajuQuantumDaewunRows(daewoonRows = [], context = {}) {
  return (Array.isArray(daewoonRows) ? daewoonRows : []).map((row) => {
    const ganji = String(row?.ganji || row?.pillar || "").trim();
    const gan = String(row?.gan || ganji.slice(0, 1) || "").trim();
    const zhi = String(row?.zhi || ganji.slice(1) || "").trim();
    if (!gan || !zhi) return null;
    const evaluated = evaluateDaewun(gan, zhi, context);
    return {
      age: row?.startAge ?? row?.startAgeYears ?? row?.startAgeDecimal ?? row?.startYear ?? null,
      gan,
      zhi,
      ganElement: ELEMENT_LABELS[evaluated.ganElement] || evaluated.ganElement,
      zhiElement: ELEMENT_LABELS[evaluated.zhiElement] || evaluated.zhiElement,
      score: evaluated.score,
      label: evaluated.label,
      className: evaluated.className,
      tagClassName: evaluated.tagClassName,
      emoji: evaluated.emoji,
      evalSummary: evaluated.evalSummary,
      jongStrength: evaluated.jongStrength,
      hasChungBonus: evaluated.hasChungBonus,
      hasChungPenalty: evaluated.hasChungPenalty,
      hasJiheBonus: evaluated.hasJiheBonus,
      hasSamhapBonus: evaluated.hasSamhapBonus,
      chungBonusText: evaluated.chungBonusText,
      chungPenaltyText: evaluated.chungPenaltyText,
      jiheBonusText: evaluated.jiheBonusText,
      samhapBonusText: evaluated.samhapBonusText,
    };
  }).filter(Boolean);
}

export {
  ELEMENT_LABELS as SAJU_QUANTUM_ELEMENT_LABELS,
  evaluateDaewun,
  evaluateSajuQuantumElement,
  buildSajuQuantumDaewunRows,
  buildSajuQuantumElementMap,
  normalizeElementKeys,
};
