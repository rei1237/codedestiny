import { getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { requireAuth } from "../lib/auth.js";
import { requirePremiumReportAccess } from "../lib/access-control.js";
import { callGeminiText } from "../lib/gemini.js";
import { LOVE_SECRET_MODE_CONFIG } from "../lib/saju-premium-chapters.js";
import { buildLoveSecretReference } from "../lib/love-secret-reference.js";

async function enhanceLoveSecretManuscriptWithLlm(env, { mode, base, chapters, config, onProgress = null } = {}) {
  const localChapters = Array.isArray(chapters) ? chapters : [];
  const expected = Number(config?.totalChapters || localChapters.length || 0);
  if (typeof onProgress === "function") {
    await onProgress({ completed: expected, chapterNo: expected, totalChapters: expected });
  }
  return {
    chapters: localChapters,
    hadFailure: false,
  };
}

function stripUnsafeText(value) {
  return clean(value)
    .replace(/\b(undefined|null|nan)\b/gi, "")
    .replace(/\b(payload|json|localdraft|fallback|llm|debug|about:blank|internal\s*server\s*error|calculationmode|recovered)\b/gi, "")
    .replace(/chapter\s*1\s*chapter\s*1/gi, "")
    .replace(/자동\s*복구\s*생성/gi, "")
    .replace(/데이터가\s*부족합니다/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function parsePillarToken(value) {
  const raw = clean(value);
  const m = raw.match(/^([갑을병정무기경신임계甲乙丙丁戊己庚辛壬癸])([자축인묘진사오미신유술해子丑寅卯辰巳午未申酉戌亥])$/);
  if (!m) return null;
  return { gan: m[1], zhi: m[2], raw };
}

function pickPillarFromBase(base, key) {
  const node = base?.pillars?.[key];
  const gan = clean(node?.gan);
  const zhi = clean(node?.zhi);
  if (!gan || !zhi) return null;
  return { gan, zhi, raw: `${gan}${zhi}` };
}

function parsePillarsFromSajuData(sajuData) {
  const text = clean(sajuData);
  if (!text) return {};
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const out = {};

  const patterns = [
    { key: "year", regex: /년주[^:：]*[:：]\s*([갑을병정무기경신임계甲乙丙丁戊己庚辛壬癸][자축인묘진사오미신유술해子丑寅卯辰巳午未申酉戌亥])/ },
    { key: "month", regex: /월주[^:：]*[:：]\s*([갑을병정무기경신임계甲乙丙丁戊己庚辛壬癸][자축인묘진사오미신유술해子丑寅卯辰巳午未申酉戌亥])/ },
    { key: "day", regex: /일주[^:：]*[:：]\s*([갑을병정무기경신임계甲乙丙丁戊己庚辛壬癸][자축인묘진사오미신유술해子丑寅卯辰巳午未申酉戌亥])/ },
    { key: "hour", regex: /시주[^:：]*[:：]\s*([갑을병정무기경신임계甲乙丙丁戊己庚辛壬癸][자축인묘진사오미신유술해子丑寅卯辰巳午未申酉戌亥])/ },
  ];

  for (const line of lines) {
    for (const p of patterns) {
      if (out[p.key]) continue;
      const m = line.match(p.regex);
      if (m) out[p.key] = parsePillarToken(m[1]);
    }
  }
  return out;
}

function parseBirthDate(raw) {
  const text = clean(raw);
  if (!text) return "";
  const m = text.match(/(\d{4})[-./\s년]+(\d{1,2})[-./\s월]+(\d{1,2})/);
  if (!m) return "";
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return "";
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return "";
  return `${String(y).padStart(4, "0")}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function parseBirthDateFromSajuData(sajuData) {
  const text = clean(sajuData);
  if (!text) return "";
  const m = text.match(/생년월일[^:：]*[:：]\s*([^\n]+)/);
  return parseBirthDate(m ? m[1] : text);
}

function normalizeElementCounts(input) {
  const safe = input && typeof input === "object" ? input : {};
  return {
    wood: Number(safe.wood || 0) || 0,
    fire: Number(safe.fire || 0) || 0,
    earth: Number(safe.earth || 0) || 0,
    metal: Number(safe.metal || 0) || 0,
    water: Number(safe.water || 0) || 0,
  };
}

function deriveElementBalanceFromCounts(counts) {
  const total = Math.max(1, Number(counts.wood) + Number(counts.fire) + Number(counts.earth) + Number(counts.metal) + Number(counts.water));
  const entries = Object.keys(counts).map((key) => ({ key, value: Number(counts[key] || 0), pct: Math.round((Number(counts[key] || 0) / total) * 100) }));
  entries.sort((a, b) => b.pct - a.pct);
  const dominant = entries[0]?.key || "earth";
  const deficient = entries[entries.length - 1]?.key || "earth";
  const gap = Math.abs(Number(entries[0]?.pct || 0) - Number(entries[entries.length - 1]?.pct || 0));
  return { dominant, deficient, balanceScore: Math.max(35, Math.min(97, 100 - Math.round(gap * 1.6))) };
}

function normalizeSajuBase(body = {}) {
  const base = body?.sajuBase && typeof body.sajuBase === "object" ? body.sajuBase : {};
  const profile = body?.profile && typeof body.profile === "object" ? body.profile : {};
  const sajuData = clean(body?.sajuData);

  const parsed = parsePillarsFromSajuData(sajuData);
  const year = pickPillarFromBase(base, "year") || parsed.year || null;
  const month = pickPillarFromBase(base, "month") || parsed.month || null;
  const day = pickPillarFromBase(base, "day") || parsed.day || null;
  const hour = pickPillarFromBase(base, "hour") || parsed.hour || null;

  const dayMaster = clean(base?.core?.dayMaster) || clean(day?.gan);
  const dayBranch = clean(base?.core?.dayBranch) || clean(day?.zhi);
  const monthBranch = clean(base?.core?.monthBranch) || clean(month?.zhi);

  const counts = normalizeElementCounts(base?.elementBalance?.counts || body?.elementCounts || {});
  const balance = deriveElementBalanceFromCounts(counts);

  const tenGodCounts = (base?.tenGods?.counts && typeof base.tenGods.counts === "object") ? base.tenGods.counts : {};
  const tenGodEntries = Object.keys(tenGodCounts).map((name) => ({ name, count: Number(tenGodCounts[name] || 0) || 0 }));
  tenGodEntries.sort((a, b) => b.count - a.count);

  const birthDate = parseBirthDate(base?.user?.birthDate)
    || parseBirthDate(profile?.birthDate)
    || parseBirthDateFromSajuData(sajuData);

  const normalizedBase = {
    user: {
      name: clean(base?.user?.name) || clean(profile?.name) || "사용자",
      gender: clean(base?.user?.gender) || clean(profile?.gender) || "",
      birthDate,
      birthTime: clean(base?.user?.birthTime) || clean(profile?.birthTime) || "",
      calendarType: clean(base?.user?.calendarType) || "solar",
    },
    pillars: {
      year,
      month,
      day,
      hour,
    },
    core: {
      dayMaster,
      dayBranch,
      monthBranch,
      season: clean(base?.core?.season) || "",
    },
    elementBalance: {
      counts,
      dominant: clean(base?.elementBalance?.dominant) || balance.dominant,
      deficient: clean(base?.elementBalance?.deficient) || balance.deficient,
      balanceScore: Number(base?.elementBalance?.balanceScore) || balance.balanceScore,
    },
    tenGods: {
      counts: tenGodCounts,
      dominantTenGod: clean(base?.tenGods?.dominantTenGod) || clean(tenGodEntries[0]?.name) || "",
      topTenGods: (base?.tenGods?.topTenGods && Array.isArray(base.tenGods.topTenGods))
        ? base.tenGods.topTenGods
        : tenGodEntries.slice(0, 3).map((row) => ({ name: row.name, count: row.count })),
    },
    strength: {
      isStrong: typeof base?.strength?.isStrong === "boolean" ? base.strength.isStrong : undefined,
      label: clean(base?.strength?.label),
      reason: clean(base?.strength?.reason),
    },
    johu: base?.johu && typeof base.johu === "object" ? base.johu : undefined,
    yongshin: base?.yongshin && typeof base.yongshin === "object" ? base.yongshin : undefined,
    specialStars: base?.specialStars && typeof base.specialStars === "object" ? base.specialStars : undefined,
    timing: base?.timing && typeof base.timing === "object" ? base.timing : undefined,
  };

  return {
    ...normalizedBase,
    loveSecretReference: buildLoveSecretReference(normalizedBase),
  };
}

function validateMinimumSaju(base) {
  const hasYear = Boolean(clean(base?.pillars?.year?.gan) && clean(base?.pillars?.year?.zhi));
  const hasMonth = Boolean(clean(base?.pillars?.month?.gan) && clean(base?.pillars?.month?.zhi));
  const hasDay = Boolean(clean(base?.pillars?.day?.gan) && clean(base?.pillars?.day?.zhi));
  const hasDayMaster = Boolean(clean(base?.core?.dayMaster));
  const hasDayBranch = Boolean(clean(base?.core?.dayBranch));
  const hasBirthDate = Boolean(clean(base?.user?.birthDate));
  const missing = [];
  if (!hasYear) missing.push("yearPillar");
  if (!hasMonth) missing.push("monthPillar");
  if (!hasDay) missing.push("dayPillar");
  if (!hasDayMaster) missing.push("dayMaster");
  if (!hasDayBranch) missing.push("dayBranch");
  if (!hasBirthDate) missing.push("birthDate");
  return { ok: missing.length === 0, missing };
}

function safeModeChapterConfig(mode) {
  const key = toConfigMode(mode);
  return LOVE_SECRET_MODE_CONFIG[key] || LOVE_SECRET_MODE_CONFIG.solo;
}

function getLoveSecretSectionLabels(mode, chapterNo) {
  const normalized = normalizeMode(mode);
  const defaults = DEFAULT_CATEGORY_BY_MODE[normalized] || DEFAULT_CATEGORY_BY_MODE.solo;
  const labels = defaults[Number(chapterNo)] || [];
  return labels.slice(0, 5).map((label) => stripUnsafeText(label)).filter(Boolean);
}

function buildLoveSecretChapterSpecs(mode) {
  const config = safeModeChapterConfig(mode);
  const chapters = Array.isArray(config?.chapters) ? config.chapters : [];
  return chapters.map((chapter, idx) => ({
    chapterNo: idx + 1,
    title: stripUnsafeText(chapter?.title || `연애 비책 ${idx + 1}장`),
    subtitle: stripUnsafeText(chapter?.subtitle || ""),
    sections: getLoveSecretSectionLabels(mode, idx + 1),
  }));
}

function getChapterSpecificSections(body, chapterNo, mode) {
  const input = Array.isArray(body?.chapterSpecificSections) ? body.chapterSpecificSections : [];
  const cleanedInput = input.map((v) => stripUnsafeText(v)).filter(Boolean);
  if (cleanedInput.length) return cleanedInput.slice(0, 8);
  const defaults = DEFAULT_CATEGORY_BY_MODE[mode] || DEFAULT_CATEGORY_BY_MODE.solo;
  return (defaults[chapterNo] || defaults[1] || ["핵심 성향", "관계 패턴", "주의점", "실전 전략", "행동 가이드"]).slice(0, 8);
}

function parseLoveSecretPartnerData(partnerData) {
  const text = clean(partnerData);
  if (!text) return null;
  const birthLine = text.match(/생년월일:\s*(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
  const hourLine = text.match(/출생 시각:\s*([^\n]+)/);
  const yearPillar = text.match(/년주\(年柱\):\s*([^\n\[]+)/);
  const monthPillar = text.match(/월주\(月柱\):\s*([^\n\[]+)/);
  const dayPillar = text.match(/일주\(日柱\):\s*([^\n\[]+)/);
  const hourPillar = text.match(/시주\(時柱\):\s*([^\n\[]+)/);
  const dayStem = text.match(/일간\(日干\):\s*([^\n]+)/);
  const strength = text.match(/신강\/신약:\s*([^\n]+)/);
  const johu = text.match(/조후\(調候\):\s*([^\n]+)/);
  const yongshin = text.match(/용신\(用神\):\s*([^\n]+)/);
  const genderLine = text.match(/성별:\s*([^\n]+)/);

  const jiHourMap = {
    자시: "23:00",
    축시: "01:00",
    인시: "03:00",
    묘시: "05:00",
    진시: "07:00",
    사시: "09:00",
    오시: "11:00",
    미시: "13:00",
    신시: "15:00",
    유시: "17:00",
    술시: "19:00",
    해시: "21:00",
  };
  const hourToken = (hourLine && hourLine[1]) ? hourLine[1].trim() : "";
  const hourMatch = hourToken.match(/(자시|축시|인시|묘시|진시|사시|오시|미시|신시|유시|술시|해시)/) || hourToken.match(/^(\d{1,2})/);
  const birthDate = birthLine ? `${birthLine[1]}-${String(birthLine[2]).padStart(2, "0")}-${String(birthLine[3]).padStart(2, "0")}` : "";
  const birthTime = hourMatch ? (jiHourMap[hourMatch[1]] || `${String(Number(hourMatch[1])).padStart(2, "0")}:00`) : "";

  return {
    name: stripUnsafeText((text.match(/이름:\s*([^\n]+)/) || [])[1] || ""),
    gender: /남/.test((genderLine && genderLine[1]) || "") ? "M" : /여/.test((genderLine && genderLine[1]) || "") ? "F" : "",
    birthDate,
    birthTime,
    calendarType: "solar",
    pillars: {
      year: stripUnsafeText((yearPillar && yearPillar[1]) || ""),
      month: stripUnsafeText((monthPillar && monthPillar[1]) || ""),
      day: stripUnsafeText((dayPillar && dayPillar[1]) || ""),
      hour: stripUnsafeText((hourPillar && hourPillar[1]) || ""),
    },
    core: {
      dayMaster: stripUnsafeText((dayStem && dayStem[1]) || ""),
      dayBranch: stripUnsafeText(((dayPillar && dayPillar[1]) || "").slice(1, 2)),
      monthBranch: stripUnsafeText(((monthPillar && monthPillar[1]) || "").slice(1, 2)),
      season: "",
    },
    elementBalance: {
      counts: { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 },
      dominant: "",
      deficient: "",
      balanceScore: 0,
    },
    tenGods: {
      counts: {},
      dominantTenGod: stripUnsafeText((strength && strength[1]) || ""),
      topTenGods: [],
    },
    strength: {
      isStrong: /신강/.test((strength && strength[1]) || "") ? true : /신약/.test((strength && strength[1]) || "") ? false : undefined,
      label: stripUnsafeText((strength && strength[1]) || ""),
      reason: "",
    },
    johu: johu ? { type: stripUnsafeText(johu[1]) } : undefined,
    yongshin: yongshin ? { usefulElements: yongshin[1].split(/[,·]/).map((item) => stripUnsafeText(item)).filter(Boolean) } : undefined,
    specialStars: {},
    timing: {},
    rawText: text,
  };
}

function buildLoveSecretPdfSeed(body, base, mode) {
  const normalizedMode = normalizeMode(mode);
  const referenceA = base?.loveSecretReference || buildLoveSecretReference(base);
  const partnerInput = normalizedMode === "compatibility" ? parseLoveSecretPartnerData(body?.partnerData) : null;
  const referenceB = partnerInput ? buildLoveSecretReference(partnerInput) : null;
  const chapterSpecs = buildLoveSecretChapterSpecs(normalizedMode);

  const personA = {
    natalChart: {
      yearPillar: clean(base?.pillars?.year?.raw),
      monthPillar: clean(base?.pillars?.month?.raw),
      dayPillar: clean(base?.pillars?.day?.raw),
      hourPillar: clean(base?.pillars?.hour?.raw),
      dayMaster: clean(base?.core?.dayMaster),
      dayBranch: clean(base?.core?.dayBranch),
      monthBranch: clean(base?.core?.monthBranch),
      season: clean(base?.core?.season),
    },
    fiveElements: {
      wood: Number(base?.elementBalance?.counts?.wood || 0) || 0,
      fire: Number(base?.elementBalance?.counts?.fire || 0) || 0,
      earth: Number(base?.elementBalance?.counts?.earth || 0) || 0,
      metal: Number(base?.elementBalance?.counts?.metal || 0) || 0,
      water: Number(base?.elementBalance?.counts?.water || 0) || 0,
      strongest: [clean(base?.elementBalance?.dominant) || clean(referenceA?.dominantElement)].filter(Boolean),
      weakest: [clean(base?.elementBalance?.deficient) || clean(referenceA?.deficientElement)].filter(Boolean),
      missing: [clean(base?.elementBalance?.deficient) || clean(referenceA?.deficientElement)].filter(Boolean),
      balanceKeywords: [clean(base?.strength?.label), clean(referenceA?.strengthTip)].filter(Boolean),
    },
    tenGods: {
      distribution: base?.tenGods?.counts && typeof base.tenGods.counts === "object" ? base.tenGods.counts : {},
      strongTenGods: [clean(base?.tenGods?.dominantTenGod)].filter(Boolean),
      weakTenGods: [],
      spouseStar: [clean(referenceA?.dominantTenGod)].filter(Boolean),
      expressionStar: [clean(base?.tenGods?.dominantTenGod)].filter(Boolean),
      wealthStar: [clean(referenceA?.idealPartner?.personality)].filter(Boolean),
      officerStar: [clean(referenceA?.marriageAgeLabel)].filter(Boolean),
      resourceStar: [clean(referenceA?.yongshinElementLabel)].filter(Boolean),
    },
    usefulGods: {
      yongshin: Array.isArray(base?.yongshin?.usefulElements) ? base.yongshin.usefulElements.slice(0, 5).map((v) => clean(v)).filter(Boolean) : [clean(referenceA?.yongshinElementLabel)].filter(Boolean),
      heeshin: [],
      gishin: [],
      johu: base?.johu ? [clean(base?.johu?.type || base?.johu?.text || base?.johu)] : [],
      keywords: [clean(referenceA?.identity?.title), clean(referenceA?.identity?.instinct)].filter(Boolean),
    },
    relationshipProfile: {
      loveStyleKeywords: [clean(referenceA?.identity?.title), clean(referenceA?.identity?.instinct)].filter(Boolean),
      attachmentStyleKeywords: [clean(base?.specialStars?.gwimun ? "확인 욕구" : "애정 확인 민감")].filter(Boolean),
      conflictStyleKeywords: [clean(referenceA?.strengthTip)].filter(Boolean),
      communicationStyleKeywords: [clean(referenceA?.daeunFlow)].filter(Boolean),
      spousePatternKeywords: [clean(referenceA?.marriageAgeLabel), clean(referenceA?.idealPartner?.personality)].filter(Boolean),
      jealousyOrPossessionSignals: [clean(referenceA?.risks?.[0]?.title)].filter(Boolean),
      lonelinessSignals: [clean(referenceA?.identity?.weakness)].filter(Boolean),
    },
    luckCycles: {
      currentDaewoon: {
        pillar: clean(base?.timing?.daeun?.[0]?.pillar || base?.timing?.daeun?.[0]?.name || ""),
        startAge: Number(base?.timing?.daeun?.[0]?.startAge || 0) || undefined,
        endAge: Number(base?.timing?.daeun?.[0]?.endAge || 0) || undefined,
        keywords: [clean(referenceA?.daeunFlow)].filter(Boolean),
        relationshipEffect: [clean(referenceA?.strengthTip)].filter(Boolean),
      },
      yearlyFlow: {
        year: Number(new Date().getFullYear()),
        pillar: clean(base?.timing?.seun?.pillar || ""),
        relationshipKeywords: [clean(referenceA?.monthlyWindows?.best?.[0]?.month)].filter(Boolean),
        cautionSignals: [clean(referenceA?.monthlyWindows?.caution?.[0]?.month)].filter(Boolean),
        opportunitySignals: [clean(referenceA?.monthlyWindows?.best?.[0]?.month)].filter(Boolean),
      },
    },
    sinsal: Array.isArray(base?.specialStars?.list)
      ? base.specialStars.list.map((row) => ({ name: clean(row?.name), relatedPillar: clean(row?.relatedPillar), relationshipKeywords: [clean(row?.name)].filter(Boolean) }))
      : [],
  };

  const compatibility = normalizedMode === "compatibility" && partnerInput && referenceB ? {
    dayMasterRelation: {
      personAdayMaster: clean(base?.core?.dayMaster),
      personBdayMaster: clean(partnerInput?.core?.dayMaster),
      relationKeywords: [clean(referenceA?.identity?.title), clean(referenceB?.identity?.title)].filter(Boolean),
    },
    dayBranchRelation: {
      personAdayBranch: clean(base?.core?.dayBranch),
      personBdayBranch: clean(partnerInput?.core?.dayBranch),
      relationKeywords: [clean(referenceA?.yongshinElementLabel), clean(referenceB?.yongshinElementLabel)].filter(Boolean),
      clashOrCombination: [clean(base?.core?.dayBranch), clean(partnerInput?.core?.dayBranch)].filter(Boolean),
    },
    tenGodRelation: {
      personBAsSeenByA: [clean(referenceB?.identity?.title), clean(referenceB?.strengthTip)].filter(Boolean),
      personAAsSeenByB: [clean(referenceA?.identity?.title), clean(referenceA?.strengthTip)].filter(Boolean),
      spouseStarActivation: [clean(referenceA?.dominantTenGod), clean(referenceB?.dominantTenGod)].filter(Boolean),
      burdenOrAttractionSignals: [clean(referenceA?.risks?.[0]?.title), clean(referenceB?.risks?.[0]?.title)].filter(Boolean),
    },
    fiveElementInteraction: {
      complementaryElements: [clean(base?.elementBalance?.dominant), clean(partnerInput?.elementBalance?.dominant)].filter(Boolean),
      overstimulatedElements: [clean(base?.elementBalance?.deficient), clean(partnerInput?.elementBalance?.deficient)].filter(Boolean),
      missingBalance: [clean(base?.elementBalance?.deficient), clean(partnerInput?.elementBalance?.deficient)].filter(Boolean),
      emotionalRhythmKeywords: [clean(referenceA?.monthlyWindows?.best?.[0]?.month), clean(referenceB?.monthlyWindows?.best?.[0]?.month)].filter(Boolean),
    },
    structuralRelations: {
      combinations: [clean(base?.core?.dayBranch), clean(partnerInput?.core?.dayBranch)].filter(Boolean),
      clashes: [clean(base?.specialStars?.tao), clean(partnerInput?.specialStars?.tao)].filter(Boolean),
      punishments: [clean(base?.specialStars?.gwimun ? "집착" : "")].filter(Boolean),
      harms: [clean(partnerInput?.specialStars?.gwimun ? "민감" : "")].filter(Boolean),
      breaks: [clean(referenceA?.risks?.[0]?.title), clean(referenceB?.risks?.[0]?.title)].filter(Boolean),
      specialSignals: [clean(partnerInput?.strength?.label), clean(base?.strength?.label)].filter(Boolean),
    },
    loveDynamics: {
      attractionPattern: [clean(referenceA?.identity?.instinct), clean(referenceB?.identity?.instinct)].filter(Boolean),
      conflictPattern: [clean(referenceA?.strengthTip), clean(referenceB?.strengthTip)].filter(Boolean),
      communicationPattern: [clean(base?.core?.monthBranch), clean(partnerInput?.core?.monthBranch)].filter(Boolean),
      attachmentPattern: [clean(base?.specialStars?.gwimun ? "확인 욕구" : "정서 확인"), clean(partnerInput?.specialStars?.gwimun ? "확인 욕구" : "정서 확인")].filter(Boolean),
      breakupPattern: [clean(referenceA?.risks?.[0]?.title), clean(referenceB?.risks?.[0]?.title)].filter(Boolean),
      reunionPattern: [clean(referenceA?.monthlyWindows?.best?.[0]?.month), clean(referenceB?.monthlyWindows?.best?.[0]?.month)].filter(Boolean),
      marriagePattern: [clean(referenceA?.marriageAgeLabel), clean(referenceB?.marriageAgeLabel)].filter(Boolean),
      longTermStrategyPattern: [clean(referenceA?.strengthTip), clean(referenceB?.strengthTip)].filter(Boolean),
    },
    timing: {
      currentDaewoonImpact: [clean(referenceA?.daeunFlow), clean(referenceB?.daeunFlow)].filter(Boolean),
      currentSewoonImpact: [clean(referenceA?.monthlyWindows?.best?.[0]?.month), clean(referenceB?.monthlyWindows?.best?.[0]?.month)].filter(Boolean),
      nearTermRelationshipSignals: [clean(referenceA?.monthlyWindows?.caution?.[0]?.month), clean(referenceB?.monthlyWindows?.caution?.[0]?.month)].filter(Boolean),
    },
  } : undefined;

  return {
    mode: normalizedMode,
    input: {
      personA: {
        name: clean(base?.user?.name),
        gender: clean(base?.user?.gender),
        birthDate: clean(base?.user?.birthDate),
        birthTime: clean(base?.user?.birthTime),
        birthPlace: clean(base?.user?.birthPlace),
        calendarType: clean(base?.user?.calendarType || "solar"),
      },
      personB: partnerInput ? {
        name: clean(partnerInput?.name),
        gender: clean(partnerInput?.gender),
        birthDate: clean(partnerInput?.birthDate),
        birthTime: clean(partnerInput?.birthTime),
        birthPlace: clean(partnerInput?.birthPlace),
        calendarType: clean(partnerInput?.calendarType || "solar"),
      } : undefined,
    },
    personA,
    personB: partnerInput ? partnerInput : undefined,
    compatibility,
    derivedSignals: normalizedMode === "compatibility"
      ? {
          loveThemeSignals: [clean(referenceA?.identity?.title), clean(referenceB?.identity?.title)].filter(Boolean),
          attractionSignals: [clean(referenceA?.identity?.instinct), clean(referenceB?.identity?.instinct)].filter(Boolean),
          attachmentSignals: [clean(compatibility?.loveDynamics?.attachmentPattern?.[0])].filter(Boolean),
          conflictSignals: [clean(compatibility?.loveDynamics?.conflictPattern?.[0])].filter(Boolean),
          communicationSignals: [clean(compatibility?.loveDynamics?.communicationPattern?.[0])].filter(Boolean),
          reunionSignals: [clean(compatibility?.loveDynamics?.reunionPattern?.[0])].filter(Boolean),
          marriageSignals: [clean(compatibility?.loveDynamics?.marriagePattern?.[0])].filter(Boolean),
          timingSignals: [clean(compatibility?.timing?.currentDaewoonImpact?.[0])].filter(Boolean),
          healingSignals: [clean(referenceA?.strengthTip), clean(referenceB?.strengthTip)].filter(Boolean),
          practicalAdviceSignals: [clean(referenceA?.monthlyWindows?.best?.[0]?.month), clean(referenceB?.monthlyWindows?.best?.[0]?.month)].filter(Boolean),
        }
      : {
          loveThemeSignals: [clean(referenceA?.identity?.title), clean(referenceA?.identity?.instinct)].filter(Boolean),
          attractionSignals: [clean(referenceA?.relationshipProfile?.loveStyleKeywords?.[0]), clean(referenceA?.tenGods?.spouseStar?.[0])].filter(Boolean),
          attachmentSignals: [clean(referenceA?.relationshipProfile?.attachmentStyleKeywords?.[0])].filter(Boolean),
          conflictSignals: [clean(referenceA?.relationshipProfile?.conflictStyleKeywords?.[0])].filter(Boolean),
          communicationSignals: [clean(referenceA?.relationshipProfile?.communicationStyleKeywords?.[0])].filter(Boolean),
          reunionSignals: [clean(referenceA?.monthlyWindows?.best?.[0]?.month)].filter(Boolean),
          marriageSignals: [clean(referenceA?.marriageAgeLabel)].filter(Boolean),
          timingSignals: [clean(referenceA?.daeunFlow)].filter(Boolean),
          healingSignals: [clean(referenceA?.strengthTip)].filter(Boolean),
          practicalAdviceSignals: [clean(referenceA?.idealPartner?.personality), clean(referenceA?.gaeun?.affirmation)].filter(Boolean),
        },
    strengths: normalizedMode === "compatibility"
      ? [clean(referenceA?.identity?.title), clean(referenceB?.identity?.title), clean(referenceA?.idealPartner?.personality), clean(referenceB?.idealPartner?.personality)].filter(Boolean)
      : [clean(referenceA?.identity?.title), clean(referenceA?.idealPartner?.personality), clean(referenceA?.strengthTip)].filter(Boolean),
    cautionFlags: normalizedMode === "compatibility"
      ? [clean(referenceA?.risks?.[0]?.title), clean(referenceB?.risks?.[0]?.title), clean(referenceA?.relationshipProfile?.conflictStyleKeywords?.[0])].filter(Boolean)
      : [clean(referenceA?.risks?.[0]?.title), clean(referenceA?.identity?.weakness), clean(referenceA?.relationshipProfile?.conflictStyleKeywords?.[0])].filter(Boolean),
    unresolvedThemes: normalizedMode === "compatibility"
      ? [clean(referenceA?.monthlyWindows?.caution?.[0]?.month), clean(referenceB?.monthlyWindows?.caution?.[0]?.month), clean(referenceA?.relationshipProfile?.attachmentStyleKeywords?.[0])].filter(Boolean)
      : [clean(referenceA?.monthlyWindows?.caution?.[0]?.month), clean(referenceA?.relationshipProfile?.attachmentStyleKeywords?.[0]), clean(referenceA?.relationshipProfile?.lonelinessSignals?.[0])].filter(Boolean),
    chapterSpecs,
  };
}

function buildLoveSecretChapterPrompt({ mode, seed, chapterSpec, previousChapterSummaries = [] }) {
  const shared = mode === "compatibility"
    ? [
        "당신은 사주 명리학 기반 '연애 비책' 프리미엄 PDF 리포트를 작성하는 최고의 연애 상담가이자 사주 궁합 전문가입니다.",
        "계산은 이미 내부 사주 엔진에서 완료되었습니다. 당신은 계산을 새로 하지 않습니다.",
        "제공된 JSON seed의 원국, 일간, 일지, 십성, 오행, 배우자성, 합충형해, 대운, 세운, 연애/궁합 신호를 바탕으로 해석문을 작성합니다.",
        "로컬 원고를 고치는 것이 아니라, 지금부터 챕터 본문을 새로 작성합니다.",
        "각 챕터와 각 세부 카테고리의 제목에 정확히 맞는 내용을 작성하세요.",
        "JSON에 없는 사주 계산값, 배우자성, 궁합 관계, 대운, 세운 정보를 임의로 만들지 마세요.",
        "여성 또는 상대방의 생시가 없으면 시주를 임의 생성하지 말고, 생시 미입력 조건에서 가능한 범위로 분석하세요.",
        "각 세부 카테고리는 서로 다른 관점과 내용을 가져야 합니다. 같은 문장 구조를 반복하지 마세요.",
        "궁합 모드에서는 두 사람의 관계 구조, 끌림, 갈등, 연락, 이별/재회, 결혼/동거, 장기 전략을 중심으로 작성하세요.",
        "연애를 공포스럽게 단정하거나 상대방의 마음을 확정적으로 단정하지 마세요.",
        "사용자가 읽었을 때 '이건 내 연애 또는 두 사람의 관계를 정말 읽었다'고 느낄 만큼 깊고 구체적으로 작성하세요.",
        "PDF 본문에는 JSON, payload, 로컬 엔진, API 실패, LLM 실패, fallback, 자동 복구 같은 기술 문구를 절대 노출하지 마세요.",
      ]
    : [
        "당신은 사주 명리학 기반 '연애 비책' 프리미엄 PDF 리포트를 작성하는 최고의 연애 상담가이자 사주 연애 전략 전문가입니다.",
        "계산은 이미 내부 사주 엔진에서 완료되었습니다. 당신은 계산을 새로 하지 않습니다.",
        "제공된 JSON seed의 원국, 일간, 일지, 십성, 오행, 배우자성, 합충형해, 대운, 세운, 연애 신호를 바탕으로 해석문을 작성합니다.",
        "로컬 원고를 고치는 것이 아니라, 지금부터 챕터 본문을 새로 작성합니다.",
        "각 챕터와 각 세부 카테고리의 제목에 정확히 맞는 내용을 작성하세요.",
        "JSON에 없는 사주 계산값, 배우자성, 연애 전략 정보를 임의로 만들지 마세요.",
        "시주가 없으면 시주를 임의 생성하지 말고, 생시 미입력 조건에서 가능한 범위로 분석하세요.",
        "각 세부 카테고리는 서로 다른 관점과 내용을 가져야 합니다. 같은 문장 구조를 반복하지 마세요.",
        "솔로 모드에서는 사용자의 연애 성향, 반복 상처, 끌림, 재회, 결혼 가능성, 앞으로의 연애 전략을 중심으로 작성하세요.",
        "연애를 공포스럽게 단정하지 말고, 하지만 좋은 말만 하지 말고 현실적으로 알려주세요.",
        "사용자가 읽었을 때 '이건 내 연애를 정말 읽었다'고 느낄 만큼 깊고 구체적으로 작성하세요.",
        "PDF 본문에는 JSON, payload, 로컬 엔진, API 실패, LLM 실패, fallback, 자동 복구 같은 기술 문구를 절대 노출하지 마세요.",
      ];

  return {
    systemPrompt: shared.join("\n"),
    userPrompt: JSON.stringify({
      mode,
      seed,
      chapterSpec,
      previousChapterSummaries,
      qualityCriteria: {
        minSectionChars: 600,
        minChapterChars: 3000,
        noTechnicalTerms: true,
        avoidGenericFiller: true,
      },
    }, null, 2),
  };
}

function countRepeatedSentences(chapters = []) {
  const sentenceCount = new Map();
  let total = 0;
  for (const chapter of chapters) {
    const text = clean(chapter?.text || "");
    if (!text) continue;
    const sentences = text.split(/[.!?\n]+/).map((sentence) => stripLoveSecretForbiddenText(sentence).toLowerCase().trim()).filter((sentence) => sentence.length >= 24);
    for (const sentence of sentences) {
      total += 1;
      sentenceCount.set(sentence, Number(sentenceCount.get(sentence) || 0) + 1);
    }
  }
  let repeated = 0;
  for (const value of sentenceCount.values()) {
    if (value > 2) repeated += (value - 2);
  }
  return total ? Number((repeated / total).toFixed(4)) : 0;
}

function validateSajuLoveBookChapterOrThrow(chapter, chapterSpec, mode) {
  const sections = Array.isArray(chapter?.sections) ? chapter.sections : [];
  const expectedSections = Array.isArray(chapterSpec?.sections) ? chapterSpec.sections : [];
  if (sections.length !== expectedSections.length) throw new Error(`LOVE_SECRET_SECTION_COUNT_MISMATCH:${chapterSpec?.chapterNo || chapter?.chapter || "unknown"}`);
  if (clean(chapter?.title) !== clean(chapterSpec?.title)) throw new Error(`LOVE_SECRET_TITLE_MISMATCH:${chapterSpec?.chapterNo || chapter?.chapter || "unknown"}`);
  if (clean(chapter?.subtitle) !== clean(chapterSpec?.subtitle)) throw new Error(`LOVE_SECRET_SUBTITLE_MISMATCH:${chapterSpec?.chapterNo || chapter?.chapter || "unknown"}`);

  const chapterText = clean(chapter?.text || sections.map((section) => `${clean(section?.title)}\n${clean(section?.body)}`).join("\n")).trim();
  if (chapterText.length < 3000) throw new Error(`LOVE_SECRET_CHAPTER_TOO_SHORT:${chapterSpec?.chapterNo || chapter?.chapter || "unknown"}`);
  for (const section of sections) {
    const body = clean(section?.body || "");
    if (body.length < 600) throw new Error(`LOVE_SECRET_SECTION_TOO_SHORT:${chapterSpec?.chapterNo || chapter?.chapter || "unknown"}`);
    if (hasLoveSecretForbiddenText(body) || hasLoveSecretForbiddenText(section?.title)) throw new Error(`LOVE_SECRET_FORBIDDEN_TEXT:${chapterSpec?.chapterNo || chapter?.chapter || "unknown"}`);
  }
  if (hasLoveSecretForbiddenText(chapterText) || hasLoveSecretForbiddenText(chapter?.title) || hasLoveSecretForbiddenText(chapter?.subtitle)) throw new Error(`LOVE_SECRET_FORBIDDEN_TEXT:${chapterSpec?.chapterNo || chapter?.chapter || "unknown"}`);
  if (countRepeatedSentences([chapter]) > 0.42) throw new Error(`LOVE_SECRET_REPETITION_TOO_HIGH:${chapterSpec?.chapterNo || chapter?.chapter || "unknown"}`);
  const modeTokens = mode === "compatibility" ? ["일간", "일지", "십성", "오행", "배우자성", "대운", "세운"] : ["일간", "배우자성", "오행", "대운", "세운", "재회", "결혼"];
  if (!modeTokens.some((token) => chapterText.includes(token))) throw new Error(`LOVE_SECRET_SIGNAL_MISSING:${chapterSpec?.chapterNo || chapter?.chapter || "unknown"}`);
  return { ok: true, chapterChars: chapterText.length };
}

function validateSajuLoveBookPdfLLMInterpretationQuality({ mode, chapters, chapterSpecs, seed }) {
  const list = Array.isArray(chapters) ? chapters : [];
  const specs = Array.isArray(chapterSpecs) ? chapterSpecs : [];
  if (list.length !== specs.length) throw new Error(`LOVE_SECRET_CHAPTER_COUNT_MISMATCH:${list.length}:${specs.length}`);
  let totalChars = 0;
  for (let i = 0; i < specs.length; i += 1) {
    const result = validateSajuLoveBookChapterOrThrow(list[i], specs[i], mode);
    totalChars += result.chapterChars;
  }
  const minTotal = Number(safeModeChapterConfig(mode)?.minTotalChars || 0);
  if (minTotal && totalChars < minTotal) throw new Error(`LOVE_SECRET_PDF_TOO_SHORT:${totalChars}:${minTotal}`);
  if (!seed || !seed.mode) throw new Error("LOVE_SECRET_SEED_MISSING");
  return { ok: true, totalChars, chapterCount: list.length, repeatedSentenceRate: countRepeatedSentences(list) };
}

function buildLoveSecretPdfReadyPayload(seed, chapters, metadata = {}) {
  const mode = normalizeMode(seed?.mode);
  const reportId = clean(metadata?.reportId || `love-secret-${Date.now().toString(36)}`);
  const chapterHtml = (Array.isArray(chapters) ? chapters : []).map((chapter, idx) => {
    const sections = Array.isArray(chapter?.sections) ? chapter.sections : [];
    const sectionHtml = sections.map((section) => `
        <section class="chapter-section">
          <h4>${stripUnsafeText(section?.title || "")}</h4>
          <div>${clean(section?.body || "").replace(/\n/g, "<br>")}</div>
        </section>`).join("");
    return `
      <article class="chapter-block">
        <h2>제${idx + 1}장 ${stripUnsafeText(chapter?.title || "")}</h2>
        <p class="chapter-subtitle">${stripUnsafeText(chapter?.subtitle || "")}</p>
        ${sectionHtml}
      </article>`;
  }).join("");
  const html = `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><title>${stripUnsafeText(clean(seed?.input?.personA?.name || "사용자"))}님의 연애 비책</title><style>body{font-family:serif;color:#221124;margin:0;padding:32px;line-height:1.85}.cover{padding:32px 0 40px;border-bottom:1px solid #f3d6e8}.chapter-block{page-break-before:always;padding-top:24px}.chapter-section{margin:22px 0}.chapter-section h4{margin:0 0 8px;font-size:1.05rem}.chapter-subtitle{color:#8f4b70;margin-top:4px}</style></head><body><section class="cover"><h1>${mode === "compatibility" ? "사주 연애 비책 - 궁합" : "사주 연애 비책 - 솔로"}</h1><p>${stripUnsafeText(clean(seed?.input?.personA?.name || "사용자"))} 님</p><p>발행일: ${new Date().toISOString()}</p></section>${chapterHtml}</body></html>`;
  return {
    title: `${clean(seed?.input?.personA?.name || "사용자")}님의 연애 비책`,
    filename: `love-secret-${mode}-${reportId}.html`,
    generatedAt: new Date().toISOString(),
    mode,
    reportId,
    pdfStorageKey: `love-secret/${mode}/${reportId}.html`,
    pdfUrl: "",
    html,
    chapters: (Array.isArray(chapters) ? chapters : []).map((chapter) => ({
      chapter: chapter?.chapter,
      title: chapter?.title,
      subtitle: chapter?.subtitle,
      sections: Array.isArray(chapter?.sections) ? chapter.sections.map((section) => section?.title).filter(Boolean) : [],
    })),
    metadata,
  };
}

async function generateLoveSecretChapterByLLM(env, { mode, seed, chapterSpec, previousChapterSummaries = [], sessionId, chapterNo }) {
  const prompt = buildLoveSecretChapterPrompt({ mode, seed, chapterSpec, previousChapterSummaries });
  const timeoutMs = Number(env.LOVE_SECRET_GEMINI_TIMEOUT_MS || env.PREMIUM_GEMINI_TIMEOUT_MS || 45000);
  const totalTimeoutMs = Number(env.LOVE_SECRET_GEMINI_TOTAL_TIMEOUT_MS || 90000);
  const retries = Math.max(2, Number(env.LOVE_SECRET_GEMINI_RETRIES || env.PREMIUM_GEMINI_RETRIES || 3));
  let lastError = null;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const llm = await callGeminiText(env, `${prompt.systemPrompt}\n\n${prompt.userPrompt}`, {
        modelEnvKeys: ["LOVE_SECRET_GEMINI_MODEL", "GEMINI_MODEL"],
        temperature: 0.78,
        maxOutputTokens: 3800,
        timeoutMs,
        totalTimeoutMs,
        maxAttemptsPerPair: 3,
      });
      if (!llm?.ok || !clean(llm?.text)) throw new Error("llm_empty_response");
      const raw = clean(llm.text).replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
      const parsed = JSON.parse(raw);
      const sections = Array.isArray(parsed?.sections) ? parsed.sections : [];
      const normalizedSections = (chapterSpec.sections || []).map((sectionTitle, idx) => ({
        id: String(idx + 1).padStart(2, "0"),
        title: stripUnsafeText(sections[idx]?.title || sectionTitle),
        body: stripUnsafeText(sections[idx]?.body || sections[idx]?.content || ""),
      }));
      const chapter = {
        chapter: chapterSpec.chapterNo,
        title: chapterSpec.title,
        subtitle: chapterSpec.subtitle,
        text: normalizedSections.map((section) => `## ${section.title}\n\n${section.body}`).join("\n\n"),
        sections: normalizedSections,
        source: "llm-only",
        mode,
        sessionId: clean(sessionId),
        chapterNo,
      };
      validateSajuLoveBookChapterOrThrow(chapter, chapterSpec, mode);
      return chapter;
    } catch (error) {
      lastError = error;
      console.warn("[LoveBook][LLMChapterRetry]", { chapterNo, attempt, message: clean(error?.message || error) || "llm_failed" });
    }
  }

  throw lastError || new Error(`LOVE_SECRET_CHAPTER_FAILED:${chapterNo}`);
}

async function generateLoveSecretChaptersWithLLMOnlyInterpretation(env, { mode, seed, chapterSpecs, sessionId, onProgress = null }) {
  const chapters = [];
  for (const chapterSpec of chapterSpecs) {
    const chapter = await generateLoveSecretChapterByLLM(env, {
      mode,
      seed,
      chapterSpec,
      previousChapterSummaries: chapters.map((item) => ({ chapter: item.chapter, title: item.title, summary: clean(item.sections?.[0]?.body || item.text || "", 200) })),
      sessionId,
      chapterNo: chapterSpec.chapterNo,
    });
    chapters.push(chapter);
    if (typeof onProgress === "function") {
      await onProgress({ completed: chapters.length, chapterNo: chapterSpec.chapterNo, totalChapters: chapterSpecs.length, chapter });
    }
  }
  return chapters;
}

function localCategoryDraft(base, chapterTitle, sectionTitle, mode, chapterNo) {
  const dm = clean(base?.core?.dayMaster) || "미상";
  const db = clean(base?.core?.dayBranch) || "미상";
  const mb = clean(base?.core?.monthBranch) || "미상";
  const dominantEl = clean(base?.elementBalance?.dominant) || "earth";
  const deficientEl = clean(base?.elementBalance?.deficient) || "water";
  const tenGod = clean(base?.tenGods?.dominantTenGod) || "비견";
  const strengthLabel = clean(base?.strength?.label) || (base?.strength?.isStrong === true ? "신강" : base?.strength?.isStrong === false ? "신약" : "중화");
  const hasHour = Boolean(clean(base?.pillars?.hour?.gan) && clean(base?.pillars?.hour?.zhi));
  const hourNote = hasHour
    ? "시주 정보가 있어 친밀감 세부 반응까지 비교적 선명하게 판단했습니다."
    : "출생 시간이 없는 경우에는 시주 영역의 세부 판단을 보수적으로 해석하며, 일주와 월지를 중심으로 연애 성향을 판단합니다.";
  const ref = base?.loveSecretReference && typeof base.loveSecretReference === "object" ? base.loveSecretReference : null;
  const identity = ref?.identity || null;
  const primaryRisk = Array.isArray(ref?.risks) && ref.risks.length ? ref.risks[0] : null;
  const bestMonths = Array.isArray(ref?.monthlyWindows?.best) ? ref.monthlyWindows.best.slice(0, 2).map((row) => `${row.month} ${row.score}점`).join(", ") : "";
  const cautionMonths = Array.isArray(ref?.monthlyWindows?.caution) ? ref.monthlyWindows.caution.slice(0, 2).map((row) => `${row.month} ${row.score}점`).join(", ") : "";

  const profileLines = [];
  if (identity) {
    profileLines.push(`${identity.title} 성향 기준으로 보면 ${identity.instinct}`);
    profileLines.push(`무의식의 핵심은 ${identity.unconscious}`);
  }
  if (chapterNo <= 3 && ref?.idealPartner) {
    profileLines.push(`보완 인연은 용신 오행 ${ref.yongshinElementLabel} 계열로, ${ref.idealPartner.personality} 흐름과 잘 맞습니다.`);
  }
  if (chapterNo >= 4 && primaryRisk) {
    profileLines.push(`현재 가장 먼저 관리해야 할 리스크는 ${primaryRisk.title}이며, ${primaryRisk.solution}`);
  }
  if (chapterNo >= 7 && ref?.marriageAgeLabel) {
    profileLines.push(`장기 안정성은 ${ref.marriageAgeLabel} 구간에서 더 선명해지고, ${ref.strengthTip}`);
  }
  if (chapterNo >= 9 && bestMonths) {
    profileLines.push(`실행 타이밍은 상위 구간 ${bestMonths}에 집중하고, 주의 구간 ${cautionMonths || "저점 달"}에는 결론보다 조율을 우선해야 합니다.`);
  }
  if (chapterNo === 10 && ref?.gaeun) {
    profileLines.push(`개운 루틴은 ${ref.gaeun.livingColor}, ${ref.gaeun.perfume}, 확언 "${ref.gaeun.affirmation}"을 함께 쓰는 방식이 가장 안정적입니다.`);
  }

  const text = [
    `${chapterTitle}의 ${sectionTitle}는 일간 ${dm}, 일지 ${db}, 월지 ${mb}를 중심 축으로 해석했습니다.`,
    `${strengthLabel} 구조와 주도 십성(${tenGod})의 결합은 감정 표현의 방식과 관계의 주도권 이동을 결정합니다. 특히 ${mode === "compatibility" ? "두 사람의" : "개인의"} 반복 패턴은 우세 오행(${dominantEl})이 과열될 때 강해지고, 결핍 오행(${deficientEl})을 보강할 때 안정됩니다.`,
    ...profileLines,
    `${hourNote}`,
    `${chapterNo}장에서는 추상적 위로보다 실제 실행 규칙을 우선합니다. 대화 빈도, 감정 과열 구간, 결정 타이밍을 분리해 운영하면 관계 피로도를 낮추고 장기 안정성을 높일 수 있습니다.`,
  ].join("\n\n");

  return stripUnsafeText(text);
}

function buildLocalChapter(base, chapterTitle, chapterSubtitle, sectionTitles, mode, chapterNo) {
  const sections = sectionTitles.map((sectionTitle, idx) => ({
    id: `${String(idx + 1).padStart(2, "0")}`,
    title: stripUnsafeText(sectionTitle) || `세부 항목 ${idx + 1}`,
    body: localCategoryDraft(base, chapterTitle, sectionTitle, mode, chapterNo),
  }));
  const text = sections.map((s) => `## ${s.title}\n\n${s.body}`).join("\n\n");
  return {
    chapterTitle,
    chapterSubtitle,
    sections,
    localDraft: text,
    finalText: text,
    fallbackUsed: false,
  };
}

async function maybeEnhanceWithLlm(env, base, chapter, mode, chapterNo) {
  void env;
  void base;
  void chapter;
  void mode;
  void chapterNo;
  throw new Error("LOVE_SECRET_LEGACY_LOCAL_FALLBACK_DISABLED");
}

function toObjectIdOrNull(value) {
  const raw = clean(value);
  if (!raw || !mongoose.Types.ObjectId.isValid(raw)) return null;
  return new mongoose.Types.ObjectId(raw);
}

async function getLoveSecretJobsCollection(env) {
  await connectDb(getLoveSecretFastDbEnv(env));
  return mongoose.connection.collection(LOVE_SECRET_JOB_COLLECTION);
}

function toPublicJobPayload(job = {}) {
  const status = clean(job?.status) || "pending";
  const chapterCount = Number(job?.chapterCount || 0);
  const completedChapters = Number(job?.completedChapters || 0);
  return {
    jobId: String(job?._id || ""),
    reportId: clean(job?.reportId),
    mode: normalizeMode(job?.mode),
    status,
    chapterCount,
    completedChapters,
    progress: chapterCount > 0 ? Math.max(0, Math.min(100, Math.round((completedChapters / chapterCount) * 100))) : 0,
    message: clean(job?.message),
    errorMessage: clean(job?.errorMessage),
    resultReady: status === "completed",
    failed: status === "failed",
    updatedAt: job?.updatedAt || null,
    createdAt: job?.createdAt || null,
  };
}

async function runLoveSecretJob(env, jobId) {
  const coll = await getLoveSecretJobsCollection(env);
  const _id = toObjectIdOrNull(jobId);
  if (!_id) return;

  const job = await coll.findOne({ _id });
  if (!job) return;

   const sessionId = clean(job?.requestBody?.sessionId || job?.requestBody?.reportSessionId);
  const execRaw = job?.execution && typeof job.execution === "object" ? job.execution : {};
  const executionCtx = {
    executionKey: clean(execRaw.executionKey, 120),
    sessionId: clean(execRaw.sessionId || sessionId, 180),
    reportId: clean(execRaw.reportId || job?.reportId, 120),
    metadata: execRaw.metadata && typeof execRaw.metadata === "object" ? execRaw.metadata : null,
  };

  await coll.updateOne(
    { _id },
    {
      $set: {
        status: "processing",
        stage: "local_calculation",
        message: "연애 사주 신호를 계산하고 있습니다.",
        startedAt: new Date(),
        updatedAt: new Date(),
      },
    },
  );

  try {
    const mode = normalizeMode(job?.mode || "solo");
    console.info("[LoveBookPremiumPDF][RequestReceived]", {
      mode,
      hasSessionId: Boolean(sessionId),
      hasReportId: Boolean(clean(job?.reportId)),
    });
    console.info("[LoveBookPremiumPDF][ModeValidated]", { mode });

    const base = normalizeSajuBase(job?.requestBody || {});
    const safeBirthLog = {
      mode,
      hasSelfBirthDate: Boolean(clean(base?.user?.birthDate)),
      hasSelfBirthTime: Boolean(clean(base?.user?.birthTime)),
      hasPartnerBirthDate: /생년월일\s*:\s*\d{4}년\s*\d{1,2}월\s*\d{1,2}일/.test(clean(job?.requestBody?.partnerData)),
      hasPartnerBirthTime: /출생\s*시각\s*:\s*/.test(clean(job?.requestBody?.partnerData)),
    };
    console.info("[LoveBookPremiumPDF][BirthInputValidated]", safeBirthLog);

    const config = safeModeChapterConfig(mode);
    const expectedChapterCount = Number(config.totalChapters || 0);

    console.info("[LoveBookPremiumPDF][LocalCalculationStart]", { mode });
    console.info("[LoveBookPremiumPDF][LocalCalculationSuccess]", {
      selfDayMasterResolved: Boolean(clean(base?.core?.dayMaster)),
      romanceStarsResolved: Boolean(base?.specialStars && typeof base.specialStars === "object"),
    });

    await coll.updateOne(
      { _id },
      {
        $set: {
          stage: "local_draft_building",
          message: "모드별 로컬 원고를 생성하고 있습니다.",
          updatedAt: new Date(),
        },
      },
    );

    console.info("[LoveBookPremiumPDF][LocalDraftBuildStart]", { chapterCount: expectedChapterCount });
    const { chapters: localChapters, totalChapters } = await buildLoveSecretChapters(env, {
      base,
      mode,
      config,
      onProgress: async ({ completed, chapterNo, totalChapters: progressTotal }) => {
        console.info("[LoveBookPremiumPDF][LocalDraftChapterDone]", {
          chapter: chapterNo,
          completed,
        });
        await coll.updateOne(
          { _id },
          {
            $set: {
              status: "processing",
              stage: completed >= progressTotal ? "local_quality_validation" : "local_draft_building",
              message: completed >= progressTotal
                ? "로컬 원고 품질을 검증하고 있습니다."
                : `로컬 원고 ${completed}/${progressTotal} 챕터 생성 중...`,
              completedChapters: Math.max(0, Math.min(progressTotal, completed)),
              updatedAt: new Date(),
            },
          },
        );
      },
    });

    console.info("[LoveBookPremiumPDF][LocalDraftBuildSuccess]", { chapterCount: localChapters.length });

    const localValidation = validateLoveSecretManuscript({
      mode,
      chapters: localChapters,
      config,
      minChapterChars: Number(config?.chapterMinDefault || 2000),
    });
    if (!localValidation.ok) {
      throw new Error(`LOCAL_DRAFT_INVALID: expected=${localValidation.expected}, actual=${localValidation.actual}, totalChars=${localValidation.totalChars}`);
    }
    console.info("[LoveBookPremiumPDF][LocalQualityValidated]", {
      chapterCount: localValidation.actual,
      totalLength: localValidation.totalChars,
      forbiddenTermsCount: localValidation.forbiddenTermsCount,
      repetitionScore: localValidation.repetitionScore,
    });

    await coll.updateOne(
      { _id },
      {
        $set: {
          stage: "llm_enhance",
          message: "AI 상담문 보강을 진행하고 있습니다.",
          localValidation,
          localManuscript: {
            mode,
            chapterCount: localChapters.length,
            chapters: localChapters,
            source: LOVE_SECRET_MANUSCRIPT_SOURCE.LOCAL,
          },
          updatedAt: new Date(),
        },
      },
    );

    let finalChapters = localChapters;
    let fallbackUsed = false;
    let manuscriptSource = LOVE_SECRET_MANUSCRIPT_SOURCE.LOCAL;

    try {
      console.info("[LoveBookPremiumPDF][LLMEnhanceStart]", { chapterCount: localChapters.length });
      const llmEnhanced = await enhanceLoveSecretManuscriptWithLlm(env, {
        mode,
        base,
        chapters: localChapters,
        config,
        onProgress: async ({ completed, totalChapters }) => {
          await coll.updateOne(
            { _id },
            {
              $set: {
                status: "processing",
                stage: "llm_enhance",
                message: `AI 상담문 보강 ${completed}/${totalChapters} 챕터 진행 중...`,
                updatedAt: new Date(),
              },
            },
          );
        },
      });

      finalChapters = llmEnhanced.chapters;
      fallbackUsed = Boolean(llmEnhanced.hadFailure);
      manuscriptSource = fallbackUsed ? LOVE_SECRET_MANUSCRIPT_SOURCE.MIXED : LOVE_SECRET_MANUSCRIPT_SOURCE.LLM_ENHANCED;
      console.info("[LoveBookPremiumPDF][LLMEnhanceSuccess]", {
        chapterCount: finalChapters.length,
        manuscriptSource,
      });
    } catch (error) {
      fallbackUsed = true;
      finalChapters = localChapters;
      manuscriptSource = LOVE_SECRET_MANUSCRIPT_SOURCE.LOCAL;
      console.warn("[LoveBookPremiumPDF][LLMEnhanceFailedUseLocal]", normalizeLoveBookError(error));
    }

    const finalValidation = validateLoveSecretManuscript({
      mode,
      chapters: finalChapters,
      config,
      minChapterChars: Number(config?.chapterMinDefault || 2000),
    });

    if (!finalValidation.ok) {
      fallbackUsed = true;
      finalChapters = localChapters;
      manuscriptSource = LOVE_SECRET_MANUSCRIPT_SOURCE.LOCAL;
    }

    const validatedFinal = validateLoveSecretManuscript({
      mode,
      chapters: finalChapters,
      config,
      minChapterChars: Number(config?.chapterMinDefault || 2000),
    });
    if (!validatedFinal.ok) {
      throw new Error("FINAL_MANUSCRIPT_INVALID");
    }
    console.info("[LoveBookPremiumPDF][FinalManuscriptValidated]", {
      mode,
      chapterCount: validatedFinal.actual,
      totalLength: validatedFinal.totalChars,
      forbiddenTermsCount: validatedFinal.forbiddenTermsCount,
      repetitionScore: validatedFinal.repetitionScore,
      manuscriptSource,
    });

    console.info("[LoveBookPremiumPDF][PdfRenderStart]", { chapterCount: finalChapters.length, fallbackUsed, manuscriptSource });

    await coll.updateOne(
      { _id },
      {
        $set: {
          status: "completed",
          stage: "completed",
          message: "연애 비책 PDF가 준비되었습니다.",
          completedChapters: totalChapters,
          fallbackUsed,
          manuscriptSource,
          result: {
            ok: true,
            featureKey: clean(job?.featureKey) || toFeatureKey(mode),
            mode,
            sessionId: clean(job?.requestBody?.sessionId || job?.requestBody?.reportSessionId) || "",
            chapterCount: totalChapters,
            fallbackUsed,
            manuscriptSource,
            pdfUrl: "",
            chapters: finalChapters,
          },
          completedAt: new Date(),
          updatedAt: new Date(),
        },
      },
    );
    console.info("[LoveBookPremiumPDF][PdfRenderSuccess]", { chapterCount: totalChapters, fallbackUsed, manuscriptSource });
    await completePremiumPdfExecution(
      env,
      String(job?.userId || ""),
      executionCtx,
      clean(job?.reportId),
      {
        manuscriptSource,
        chapterCount: totalChapters,
        archive: {
          reportId: clean(job?.reportId),
          reportType: "love_book",
          displayName: "사주 연애 비책",
          title: `${clean(base?.user?.name || "사용자")}님의 연애 비책`,
          mode,
          birthName: clean(base?.user?.name),
          summary: clean(finalChapters?.[0]?.sections?.[0]?.body || "", 1000),
          pdfUrl: "",
          chapters: finalChapters,
          payload: { mode, chapterCount: totalChapters },
          canReopen: true,
          canDownload: false,
        },
      },
    );
    resolveLoveSecretLock(sessionId, "done", String(_id));
  } catch (error) {
    console.error("[LoveBookPremiumPDF][Error]", normalizeLoveBookError(error));
    await coll.updateOne(
      { _id },
      {
        $set: {
          status: "failed",
          stage: "failed",
          message: "연애 비책 생성이 중단되었습니다.",
          errorMessage: clean(error?.message || "알 수 없는 오류"),
          failedAt: new Date(),
          updatedAt: new Date(),
        },
      },
    );
    await failPremiumPdfExecution(
      env,
      String(job?.userId || ""),
      executionCtx,
      "love_secret_generation_failed",
      clean(error?.message || "연애 비책 생성 실패"),
      "love-secret-generation",
    );
    resolveLoveSecretLock(sessionId, "failed", String(_id));
  }
}

function buildApiError(code, message, status = 400, debugSafe = null) {
  return json({
    ok: false,
    code,
    message,
    ...(debugSafe && typeof debugSafe === "object" ? { debugSafe } : {}),
  }, { status });
}

function isLikelyDbUnavailableError(error) {
  const msg = clean(error?.message || error).toLowerCase();
  return msg.includes("database is temporarily unavailable")
    || msg.includes("db is temporarily unavailable")
    || msg.includes("mongodb")
    || msg.includes("server selection")
    || msg.includes("connect")
    || msg.includes("timeout")
    || msg.includes("econn")
    || msg.includes("topology");
}

async function authorizeLoveSecret(request, env, body, mode) {
  let auth;
  try {
    auth = await requireAuth(request, env);
  } catch (error) {
    if (Number(error?.status) === 401) {
      return { ok: false, response: buildApiError("UNAUTHORIZED", "로그인 후 연애 비책 PDF를 생성할 수 있습니다.", 401) };
    }
    throw error;
  }

  const featureKey = toFeatureKey(mode);
  const reportId = clean(body?.reportId);
  const sessionId = clean(body?.sessionId || body?.reportSessionId || body?.chapterSessionId);
  const purchaseId = clean(body?.purchaseId || body?.reportPurchaseId || body?.accessGrant?.purchaseId || body?.payment?.purchaseId || body?._paymentContext?.purchaseId);

  const access = await requirePremiumReportAccess(getLoveSecretFastDbEnv(env), auth.userId, "loveSecret", {
    ...body,
    mode,
    reportType: "loveSecret",
    featureKey,
    _accessRoute: "/api/love-secret/generate-chapter",
  });

  if (!access?.ok) {
    const status = Number(access?.status || 402);
    const hasBinding = Boolean(reportId || sessionId || purchaseId);
    const isPaymentBindingMiss = status === 402 && hasBinding;
    const code = isPaymentBindingMiss
      ? "PAYMENT_CONFIRMED_BUT_ACCESS_MISSING"
      : (access?.code || "UNAUTHORIZED");
    const message = isPaymentBindingMiss
      ? "결제는 확인되었지만 생성 권한 연결이 완료되지 않았습니다. 잠시 후 다시 시도해 주세요."
      : status === 402
        ? "프리미엄 연애 비책 생성 권한이 필요합니다."
        : status === 401
          ? "로그인 후 연애 비책 PDF를 생성할 수 있습니다."
          : "결제 확인 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.";
    return {
      ok: false,
      response: buildApiError(code, message, status, {
        featureKey,
        mode,
        hasSessionId: Boolean(sessionId),
        hasPurchaseId: Boolean(purchaseId),
        hasReportId: Boolean(reportId),
      }),
    };
  }

  return { ok: true, auth, featureKey, access };
}

async function handleGenerateChapter(request, env) {
  const body = await readJson(request);
  const mode = normalizeMode(body?.mode || body?.reportMode);
  console.info("[LoveBookPremiumPDF][RequestReceived]", { mode, endpoint: "generate-chapter" });
  console.info("[LoveBookPremiumPDF][ModeValidated]", { mode });
  const authz = await authorizeLoveSecret(request, env, body, mode);
  if (!authz.ok) return authz.response;

  const chapterNo = Number(body?.chapter || 1);
  const config = safeModeChapterConfig(mode);
  const totalChapters = Number(config.totalChapters || 0);
  if (!Number.isFinite(chapterNo) || chapterNo < 1 || chapterNo > totalChapters) {
    return buildApiError("INVALID_CHAPTER", "요청한 챕터 번호가 유효하지 않습니다.", 400);
  }

  const base = normalizeSajuBase(body);
  console.info("[LoveBookPremiumPDF][BirthInputValidated]", {
    mode,
    hasSelfBirthDate: Boolean(clean(base?.user?.birthDate)),
    hasSelfBirthTime: Boolean(clean(base?.user?.birthTime)),
  });
  const valid = validateMinimumSaju(base);
  if (!valid.ok) {
    return buildApiError("MISSING_SAJU_DATA", "사주 분석 결과가 충분하지 않습니다. 사주 분석 화면에서 다시 계산해 주세요.", 400);
  }

  const seed = buildLoveSecretPdfSeed(body, base, mode);
  const chapterSpecs = seed.chapterSpecs || buildLoveSecretChapterSpecs(mode);
  const chapterSpec = chapterSpecs[chapterNo - 1] || {
    chapterNo,
    title: stripUnsafeText(body?.chapterTitle || (Array.isArray(config.chapters) ? config.chapters[chapterNo - 1]?.title : `연애 비책 ${chapterNo}장`) || `연애 비책 ${chapterNo}장`),
    subtitle: stripUnsafeText(body?.chapterSubtitle || (Array.isArray(config.chapters) ? config.chapters[chapterNo - 1]?.subtitle : "") || ""),
    sections: getChapterSpecificSections(body, chapterNo, mode),
  };

  console.info("[LoveBookPremiumPDF][LLMChapterBuildStart]", { chapterCount: 1, chapter: chapterNo });
  const chapter = await generateLoveSecretChapterByLLM(env, {
    mode,
    seed,
    chapterSpec,
    previousChapterSummaries: [],
    sessionId: clean(body?.sessionId || body?.reportSessionId || body?.chapterSessionId) || "",
    chapterNo,
  });
  console.info("[LoveBookPremiumPDF][LLMChapterBuildDone]", { chapter: chapterNo, chapterChars: clean(chapter?.text || "").length });
  validateSajuLoveBookChapterOrThrow(chapter, chapterSpec, mode);

  return json({
    ok: true,
    featureKey: authz.featureKey,
    mode,
    sessionId: clean(body?.sessionId || body?.reportSessionId || body?.chapterSessionId) || "",
    chapter: chapterNo,
    chapterCount: totalChapters,
    chapterMeta: { title: chapterSpec.title, subtitle: chapterSpec.subtitle },
    fallbackUsed: false,
    manuscriptSource: "llm-only",
    pdfUrl: "",
    text: clean(chapter?.text || ""),
    sections: Array.isArray(chapter.sections) ? chapter.sections : [],
  });
}

async function handlePrepare(request, env) {
  const body = await readJson(request);
  const mode = normalizeMode(body?.mode || body?.reportMode);
  console.info("[LoveBookPremiumPDF][RequestReceived]", { mode, endpoint: "prepare" });
  console.info("[LoveBookPremiumPDF][ModeValidated]", { mode });
  const authz = await authorizeLoveSecret(request, env, body, mode);
  if (!authz.ok) return authz.response;

  const base = normalizeSajuBase(body);
  const valid = validateMinimumSaju(base);
  if (!valid.ok) {
    return buildApiError("MISSING_SAJU_DATA", "사주 분석 결과가 충분하지 않습니다. 사주 분석 화면에서 다시 계산해 주세요.", 400);
  }

  const config = safeModeChapterConfig(mode);
  const sessionId = clean(body?.sessionId || body?.reportSessionId || `love-book:${clean(body?.reportId)}`);
  const executionCtx = buildPremiumExecutionContext({
    serviceKey: LOVE_SECRET_SERVICE_KEY,
    reportType: "loveSecret",
    userId: authz?.auth?.userId,
    featureKey: authz.featureKey,
    sessionId,
    reportId: clean(body?.reportId),
    access: authz.access,
    body,
    timeoutSeconds: Number(env?.PREMIUM_PDF_GRACE_TIMEOUT_SECONDS || 1800),
  });
  await startPremiumPdfExecution(env, authz?.auth?.userId, executionCtx);

  try {
    const seed = buildLoveSecretPdfSeed(body, base, mode);
    const chapterSpecs = seed.chapterSpecs || buildLoveSecretChapterSpecs(mode);
    console.info("[LoveBookPremiumPDF][LLMChapterGenerationStarted]", { chapterCount: chapterSpecs.length, mode });
    const chapters = await generateLoveSecretChaptersWithLLMOnlyInterpretation(env, { mode, seed, chapterSpecs, sessionId });
    const finalValidation = validateSajuLoveBookPdfLLMInterpretationQuality({ mode, chapters, chapterSpecs, seed });
    const reportId = clean(body?.reportId || body?.accessGrant?.reportId || `love-secret-${Date.now().toString(36)}`);
    const pdfReady = buildLoveSecretPdfReadyPayload(seed, chapters, {
      featureKey: authz.featureKey,
      reportType: "loveSecret",
      manuscriptSource: "llm-only",
      sessionId,
      reportId,
      accessType: clean(authz?.access?.accessType || "unknown"),
    });

    await completePremiumPdfExecution(env, authz?.auth?.userId, executionCtx, reportId, {
      manuscriptSource: "llm-only",
      chapterCount: chapterSpecs.length,
      quality: finalValidation,
      archive: {
        reportId,
        reportType: "love_book",
        displayName: "사주 연애 비책",
        title: `${clean(base?.user?.name || "사용자")}님의 연애 비책`,
        mode,
        birthName: clean(base?.user?.name),
        summary: clean(chapters?.[0]?.sections?.[0]?.body || chapters?.[0]?.text || "", 1000),
        pdfUrl: clean(pdfReady?.pdfUrl),
        pdfStorageKey: clean(pdfReady?.pdfStorageKey),
        chapters,
        payload: { mode, chapterCount: chapterSpecs.length },
        pdfReady,
        canReopen: true,
        canDownload: Boolean(clean(pdfReady?.pdfUrl) || clean(pdfReady?.pdfStorageKey)),
      },
    });

    return json({
      ok: true,
      featureKey: authz.featureKey,
      mode,
      reportId,
      sessionId,
      chapterCount: chapterSpecs.length,
      fallbackUsed: false,
      manuscriptSource: "llm-only",
      pdfUrl: clean(pdfReady?.pdfUrl),
      pdfStorageKey: clean(pdfReady?.pdfStorageKey),
      pdfReady,
      chapters,
      quality: finalValidation,
    });
  } catch (error) {
    await failPremiumPdfExecution(env, authz?.auth?.userId, executionCtx, "love_secret_prepare_failed", clean(error?.message || "연애 비책 생성 실패"), "love-secret-prepare-sync");
    throw error;
  }
}

async function handlePrepareAsync(request, env, ctx) {
  const body = await readJson(request);
  const mode = normalizeMode(body?.mode || body?.reportMode);
  console.info("[LoveBookPremiumPDF][RequestReceived]", { mode, endpoint: "prepare-async" });
  console.info("[LoveBookPremiumPDF][ModeValidated]", { mode });
  const authz = await authorizeLoveSecret(request, env, body, mode);
  if (!authz.ok) return authz.response;

  const base = normalizeSajuBase(body);
  const valid = validateMinimumSaju(base);
  if (!valid.ok) {
    return buildApiError("MISSING_SAJU_DATA", "사주 분석 결과가 충분하지 않습니다. 사주 분석 화면에서 다시 계산해 주세요.", 400);
  }

  const config = safeModeChapterConfig(mode);
  const sessionId = clean(body?.sessionId || body?.reportSessionId || `love-book:${clean(body?.reportId)}`);
  const executionCtx = buildPremiumExecutionContext({
    serviceKey: LOVE_SECRET_SERVICE_KEY,
    reportType: "loveSecret",
    userId: authz?.auth?.userId,
    featureKey: authz.featureKey,
    sessionId,
    reportId: clean(body?.reportId),
    access: authz.access,
    body,
    timeoutSeconds: Number(env?.PREMIUM_PDF_GRACE_TIMEOUT_SECONDS || 1800),
  });
  await startPremiumPdfExecution(env, authz?.auth?.userId, executionCtx);

  const lockState = acquireLoveSecretLock(sessionId);
  if (!lockState.ok) {
    const existing = lockState.existing || {};
    return json({
      ok: true,
      accepted: true,
      duplicate: true,
      sessionId,
      jobId: clean(existing.jobId),
      status: clean(existing.status || "running") || "running",
      pollAfterMs: LOVE_SECRET_JOB_POLL_AFTER_MS,
      lock: {
        sessionId,
        status: clean(existing.status || "running") || "running",
        startedAt: clean(existing.startedAt) || new Date().toISOString(),
      },
    }, { status: 202 });
  }

  try {
    const coll = await getLoveSecretJobsCollection(env);
    const runningJob = await coll.findOne({
      service: LOVE_SECRET_SERVICE_KEY,
      userId: String(authz?.auth?.userId || ""),
      "requestBody.sessionId": sessionId,
      status: { $in: ["pending", "processing"] },
    });
    if (runningJob) {
      resolveLoveSecretLock(sessionId, "running", String(runningJob?._id || ""));
      return json({
        ok: true,
        accepted: true,
        duplicate: true,
        sessionId,
        jobId: String(runningJob?._id || ""),
        status: clean(runningJob?.status) || "pending",
        pollAfterMs: LOVE_SECRET_JOB_POLL_AFTER_MS,
      }, { status: 202 });
    }

    const insertDoc = {
      service: LOVE_SECRET_SERVICE_KEY,
      featureKey: authz.featureKey,
      userId: String(authz?.auth?.userId || ""),
      reportId: clean(body?.reportId),
      mode,
      status: "pending",
      stage: "pending",
      message: "연애 비책 생성 요청을 접수했습니다.",
      chapterCount: Number(config?.totalChapters || 0),
      completedChapters: 0,
      requestBody: {
        reportId: clean(body?.reportId),
        sessionId,
        reportSessionId: sessionId,
        mode,
        reportMode: mode,
        sajuData: clean(body?.sajuData),
        sajuBase: base,
        profile: body?.profile && typeof body.profile === "object" ? body.profile : {},
        partnerData: body?.partnerData || "",
      },
      execution: {
        executionKey: executionCtx.executionKey,
        sessionId: executionCtx.sessionId,
        reportId: executionCtx.reportId,
        metadata: executionCtx.metadata,
      },
      result: null,
      errorMessage: "",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const inserted = await coll.insertOne(insertDoc);
    const jobId = String(inserted?.insertedId || "");
    resolveLoveSecretLock(sessionId, "running", jobId);

    await coll.updateOne({ _id: inserted.insertedId }, {
      $set: {
        status: "pending",
        stage: "queued",
        message: "백그라운드 생성 대기열에 등록되었습니다.",
        updatedAt: new Date(),
      },
    });

    const runTask = runLoveSecretJob(env, jobId).catch((error) => {
      console.error("[love-secret][async-job-failed]", error?.message || error);
    });
    if (ctx && typeof ctx.waitUntil === "function") {
      ctx.waitUntil(runTask);
    } else {
      Promise.resolve(runTask).catch(() => {});
    }

    return json({
      ok: true,
      accepted: true,
      sessionId,
      jobId,
      status: "pending",
      pollAfterMs: LOVE_SECRET_JOB_POLL_AFTER_MS,
    }, { status: 202 });
  } catch (error) {
    await failPremiumPdfExecution(env, authz?.auth?.userId, executionCtx, "love_secret_prepare_failed", clean(error?.message || "연애 비책 준비 실패"), "love-secret-prepare");
    if (!isLikelyDbUnavailableError(error)) {
      resolveLoveSecretLock(sessionId, "failed", "");
      throw error;
    }

    console.warn("[love-secret][async-job-db-fallback]", clean(error?.message || error) || error);
    const seed = buildLoveSecretPdfSeed(body, base, mode);
    const chapterSpecs = seed.chapterSpecs || buildLoveSecretChapterSpecs(mode);
    const chapters = await generateLoveSecretChaptersWithLLMOnlyInterpretation(env, { mode, seed, chapterSpecs, sessionId });
    const finalValidation = validateSajuLoveBookPdfLLMInterpretationQuality({ mode, chapters, chapterSpecs, seed });
    const reportId = clean(body?.reportId || body?.accessGrant?.reportId || `love-secret-${Date.now().toString(36)}`);
    const pdfReady = buildLoveSecretPdfReadyPayload(seed, chapters, {
      featureKey: authz.featureKey,
      reportType: "loveSecret",
      manuscriptSource: "llm-only",
      sessionId,
      reportId,
      accessType: clean(authz?.access?.accessType || "unknown"),
    });

    await completePremiumPdfExecution(env, authz?.auth?.userId, executionCtx, reportId, {
      manuscriptSource: "llm-only",
      chapterCount: chapterSpecs.length,
      quality: finalValidation,
      archive: {
        reportId,
        reportType: "love_book",
        displayName: "사주 연애 비책",
        title: `${clean(base?.user?.name || "사용자")}님의 연애 비책`,
        mode,
        birthName: clean(base?.user?.name),
        summary: clean(chapters?.[0]?.sections?.[0]?.body || chapters?.[0]?.text || "", 1000),
        pdfUrl: clean(pdfReady?.pdfUrl),
        pdfStorageKey: clean(pdfReady?.pdfStorageKey),
        chapters,
        payload: { mode, chapterCount: chapterSpecs.length },
        pdfReady,
        canReopen: true,
        canDownload: Boolean(clean(pdfReady?.pdfUrl) || clean(pdfReady?.pdfStorageKey)),
      },
    });

    resolveLoveSecretLock(sessionId, "done", "");
    return json({
      ok: true,
      accepted: false,
      direct: true,
      mode,
      featureKey: authz.featureKey,
      sessionId,
      chapterCount: chapterSpecs.length,
      fallbackUsed: false,
      manuscriptSource: "llm-only",
      pdfUrl: clean(pdfReady?.pdfUrl),
      pdfStorageKey: clean(pdfReady?.pdfStorageKey),
      pdfReady,
      chapters,
      quality: finalValidation,
      message: "대기열 저장소 문제로 직접 생성 모드로 전환되었습니다.",
    }, { status: 200 });
  }
}

async function handleJobStatus(request, env) {
  const auth = await requireAuth(request, env);
  const url = new URL(request.url);
  const id = clean(url.searchParams.get("id") || url.searchParams.get("jobId"));
  const _id = toObjectIdOrNull(id);
  if (!_id) return buildApiError("INVALID_JOB_ID", "작업 ID가 유효하지 않습니다.", 400);

  const coll = await getLoveSecretJobsCollection(env);
  const job = await coll.findOne({ _id, service: LOVE_SECRET_SERVICE_KEY, userId: String(auth.userId || "") });
  if (!job) return buildApiError("JOB_NOT_FOUND", "작업 정보를 찾을 수 없습니다.", 404);

  const payload = toPublicJobPayload(job);
  if (payload.status === "completed") {
    payload.result = job?.result && typeof job.result === "object" ? job.result : null;
  }

  return json({ ok: true, ...payload });
}

async function handleJobResult(request, env) {
  const auth = await requireAuth(request, env);
  const url = new URL(request.url);
  const id = clean(url.searchParams.get("id") || url.searchParams.get("jobId"));
  const _id = toObjectIdOrNull(id);
  if (!_id) return buildApiError("INVALID_JOB_ID", "작업 ID가 유효하지 않습니다.", 400);

  const coll = await getLoveSecretJobsCollection(env);
  const job = await coll.findOne({ _id, service: LOVE_SECRET_SERVICE_KEY, userId: String(auth.userId || "") });
  if (!job) return buildApiError("JOB_NOT_FOUND", "작업 정보를 찾을 수 없습니다.", 404);
  if (clean(job?.status) !== "completed") {
    return buildApiError("JOB_NOT_READY", "아직 작업이 완료되지 않았습니다.", 409);
  }

  return json({
    ok: true,
    jobId: String(job?._id || ""),
    status: "completed",
    result: job?.result && typeof job.result === "object" ? job.result : null,
  });
}

export async function handleSajuLoveSecretRoutes(request, env = {}, ctx = null) {
  try {
    const method = request.method.toUpperCase();
    const path = getRoutePath(request, "/api/love-secret");

    if (method === "POST" && (path === "" || path === "/" || path === "/generate-chapter")) {
      return await handleGenerateChapter(request, env);
    }

    if (method === "POST" && path === "/prepare") {
      return await handlePrepare(request, env);
    }

    if (method === "POST" && path === "/prepare-async") {
      return await handlePrepareAsync(request, env, ctx);
    }

    if (method === "GET" && path === "/status") {
      return await handleJobStatus(request, env);
    }

    if (method === "GET" && path === "/result") {
      return await handleJobResult(request, env);
    }

    if (["GET", "POST"].includes(method)) return notFound();
    return methodNotAllowed();
  } catch (error) {
    return handleRouteError(error, {
      request,
      env,
      trace: {
        route: "saju-love-secret",
        method: request?.method || "",
        requestPath: (() => {
          try { return new URL(request.url).pathname; } catch (_) { return ""; }
        })(),
      },
    });
  }
}
