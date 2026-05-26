const SAJU_LOVE_FORBIDDEN_PHRASES = Object.freeze([
  "fallback",
  "placeholder",
  "Chapter 1",
  "Chapter 2",
  "Internal server error",
  "JSON payload",
  "raw payload",
  "engine raw",
]);

const SOLO_CHAPTER_DEFS = Object.freeze([
  { id: "love-solo-01", title: "Ch.1 Solo Core Profile", categories: [["love-solo-01-01", "1-1 Core first impression"],["love-solo-01-02", "1-2 Day master love stance"],["love-solo-01-03", "1-3 Day branch intimacy instinct"],["love-solo-01-04", "1-4 Strongest love signal"],["love-solo-01-05", "1-5 Weakest love signal"],["love-solo-01-06", "1-6 Core love keywords"]] },
  { id: "love-solo-02", title: "Ch.2 Attraction Signals", categories: [["love-solo-02-01", "2-1 Dohwa attraction"],["love-solo-02-02", "2-2 Hongyeom afterglow"],["love-solo-02-03", "2-3 Hwagae distance"],["love-solo-02-04", "2-4 Unconscious charm"],["love-solo-02-05", "2-5 Charm drop moments"],["love-solo-02-06", "2-6 Healthy charm usage"]] },
  { id: "love-solo-03", title: "Ch.3 Preferred Partner Type", categories: [["love-solo-03-01", "3-1 Partner star ideal"],["love-solo-03-02", "3-2 Deep pull from day branch"],["love-solo-03-03", "3-3 Repeating attraction type"],["love-solo-03-04", "3-4 Risky attraction type"],["love-solo-03-05", "3-5 Long-term fit"],["love-solo-03-06", "3-6 Avoid type"]] },
  { id: "love-solo-04", title: "Ch.4 Relationship Pattern", categories: [["love-solo-04-01", "4-1 Start pattern"],["love-solo-04-02", "4-2 Opening speed"],["love-solo-04-03", "4-3 Deepening trigger"],["love-solo-04-04", "4-4 Shake pattern"],["love-solo-04-05", "4-5 Distance breakup reason"],["love-solo-04-06", "4-6 Pattern break"]] },
  { id: "love-solo-05", title: "Ch.5 Weakness Structure", categories: [["love-solo-05-01", "5-1 Ego barrier"],["love-solo-05-02", "5-2 Expression gap"],["love-solo-05-03", "5-3 Anxiety cling point"],["love-solo-05-04", "5-4 Push pull"],["love-solo-05-05", "5-5 Hidden hurt mode"],["love-solo-05-06", "5-6 Self protection"]] },
  { id: "love-solo-06", title: "Ch.6 Long-term Strategy", categories: [["love-solo-06-01", "6-1 Fit speed"],["love-solo-06-02", "6-2 Contact expression line"],["love-solo-06-03", "6-3 Conflict resolve mode"],["love-solo-06-04", "6-4 Trust building"],["love-solo-06-05", "6-5 Explain my traits"],["love-solo-06-06", "6-6 Long-term routine"]] },
  { id: "love-solo-07", title: "Ch.7 Marriage and Long-term", categories: [["love-solo-07-01", "7-1 Marriage stance"],["love-solo-07-02", "7-2 Life base linkage"],["love-solo-07-03", "7-3 Responsibility rise"],["love-solo-07-04", "7-4 Post-marriage caution"],["love-solo-07-05", "7-5 Long-term strengths"],["love-solo-07-06", "7-6 Marriage luck advice"]] },
  { id: "love-solo-08", title: "Ch.8 Timing and Luck", categories: [["love-solo-08-01", "8-1 Current big-luck task"],["love-solo-08-02", "8-2 Current big-luck opening"],["love-solo-08-03", "8-3 Good timing conditions"],["love-solo-08-04", "8-4 Caution periods"],["love-solo-08-05", "8-5 Next big-luck shift"],["love-solo-08-06", "8-6 Timing strategy"]] },
  { id: "love-solo-09", title: "Ch.9 Recovery Pattern", categories: [["love-solo-09-01", "9-1 Biggest post-break shake"],["love-solo-09-02", "9-2 Why attachment remains"],["love-solo-09-03", "9-3 Why re-love is hard"],["love-solo-09-04", "9-4 Self-worth recovery"],["love-solo-09-05", "9-5 Prep for next love"],["love-solo-09-06", "9-6 Emotional recovery routine"]] },
  { id: "love-solo-10", title: "Ch.10 Final Solo Roadmap", categories: [["love-solo-10-01", "10-1 Core summary"],["love-solo-10-02", "10-2 Biggest charm"],["love-solo-10-03", "10-3 Repeat weakness"],["love-solo-10-04", "10-4 Reinforce stance"],["love-solo-10-05", "10-5 Avoid choices"],["love-solo-10-06", "10-6 Final advice"]] },
]);

const COMPAT_CHAPTER_DEFS = Object.freeze([
  { id: "love-compat-01", title: "Ch.1 Two Profiles", categories: [["love-compat-01-01", "1-1 A profile"],["love-compat-01-02", "1-2 B profile"],["love-compat-01-03", "1-3 A values"],["love-compat-01-04", "1-4 B values"],["love-compat-01-05", "1-5 Difference"],["love-compat-01-06", "1-6 First attraction"]] },
  { id: "love-compat-02", title: "Ch.2 Day Master Compatibility", categories: [["love-compat-02-01", "2-1 DM relation"],["love-compat-02-02", "2-2 Helpful qi"],["love-compat-02-03", "2-3 Exhausting qi"],["love-compat-02-04", "2-4 Nature gap"],["love-compat-02-05", "2-5 Needed perspective"],["love-compat-02-06", "2-6 Practical advice"]] },
  { id: "love-compat-03", title: "Ch.3 Day Branch and Spouse Palace", categories: [["love-compat-03-01", "3-1 A spouse palace"],["love-compat-03-02", "3-2 B spouse palace"],["love-compat-03-03", "3-3 Pull and tension"],["love-compat-03-04", "3-4 Common misunderstanding"],["love-compat-03-05", "3-5 Rhythm distance"],["love-compat-03-06", "3-6 Advice"]] },
  { id: "love-compat-04", title: "Ch.4 Five Elements Balance", categories: [["love-compat-04-01", "4-1 A weak element and B role"],["love-compat-04-02", "4-2 B weak element and A role"],["love-compat-04-03", "4-3 Complement points"],["love-compat-04-04", "4-4 Excess points"],["love-compat-04-05", "4-5 Balance break moments"],["love-compat-04-06", "4-6 Regulation"]] },
  { id: "love-compat-05", title: "Ch.5 Ten Gods Compatibility", categories: [["love-compat-05-01", "5-1 A partner star and B response"],["love-compat-05-02", "5-2 B partner star and A response"],["love-compat-05-03", "5-3 Wealth authority realism"],["love-compat-05-04", "5-4 Expression exchange"],["love-compat-05-05", "5-5 Ego competition"],["love-compat-05-06", "5-6 Advice"]] },
  { id: "love-compat-06", title: "Ch.6 Attraction Chemistry", categories: [["love-compat-06-01", "6-1 Dohwa signals"],["love-compat-06-02", "6-2 Hongyeom afterglow"],["love-compat-06-03", "6-3 Hwagae distance"],["love-compat-06-04", "6-4 Why strong pull"],["love-compat-06-05", "6-5 Anxiety switch"],["love-compat-06-06", "6-6 Healthy attraction"]] },
  { id: "love-compat-07", title: "Ch.7 Conflict Pattern", categories: [["love-compat-07-01", "7-1 Expression speed gap"],["love-compat-07-02", "7-2 Silence reassurance cycle"],["love-compat-07-03", "7-3 Ego collision"],["love-compat-07-04", "7-4 Misread moments"],["love-compat-07-05", "7-5 Escalation language"],["love-compat-07-06", "7-6 Dialogue rule"]] },
  { id: "love-compat-08", title: "Ch.8 Long-term and Marriage", categories: [["love-compat-08-01", "8-1 Condition to become long-term"],["love-compat-08-02", "8-2 Marriage and life base gaps"],["love-compat-08-03", "8-3 Responsibility pattern"],["love-compat-08-04", "8-4 Real-world adjustment"],["love-compat-08-05", "8-5 Strength over time"],["love-compat-08-06", "8-6 Practical advice"]] },
  { id: "love-compat-09", title: "Ch.9 Breakup Risk and Recovery", categories: [["love-compat-09-01", "9-1 Core distancing cause"],["love-compat-09-02", "9-2 Why attachment remains"],["love-compat-09-03", "9-3 Hard-to-restart pattern"],["love-compat-09-04", "9-4 Recovery opening"],["love-compat-09-05", "9-5 Required change"],["love-compat-09-06", "9-6 Re-approach rule"]] },
  { id: "love-compat-10", title: "Ch.10 Timing Compatibility", categories: [["love-compat-10-01", "10-1 A big-luck task"],["love-compat-10-02", "10-2 B big-luck task"],["love-compat-10-03", "10-3 Timing match"],["love-compat-10-04", "10-4 Timing mismatch"],["love-compat-10-05", "10-5 Good progress flow"],["love-compat-10-06", "10-6 Timing strategy"]] },
  { id: "love-compat-11", title: "Ch.11 Relationship Operation", categories: [["love-compat-11-01", "11-1 Contact and expression line"],["love-compat-11-02", "11-2 Recovery order"],["love-compat-11-03", "11-3 Protect each ego"],["love-compat-11-04", "11-4 Trust action"],["love-compat-11-05", "11-5 Keep routine"],["love-compat-11-06", "11-6 Safe zone"]] },
  { id: "love-compat-12", title: "Ch.12 Final Compatibility Roadmap", categories: [["love-compat-12-01", "12-1 Core summary"],["love-compat-12-02", "12-2 Biggest strength"],["love-compat-12-03", "12-3 Biggest risk"],["love-compat-12-04", "12-4 Save choices"],["love-compat-12-05", "12-5 Ruin choices"],["love-compat-12-06", "12-6 Final advice"]] },
]);

function compactObject(value) {
  if (!value || typeof value !== "object") return {};
  const out = {};
  for (const [key, item] of Object.entries(value)) {
    if (item == null) continue;
    if (typeof item === "string" && !item.trim()) continue;
    if (Array.isArray(item) && item.length === 0) continue;
    if (typeof item === "object" && !Array.isArray(item) && Object.keys(item).length === 0) continue;
    out[key] = item;
  }
  return out;
}

function isNonEmptyObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value) && Object.keys(compactObject(value)).length > 0;
}

function buildCategoryWritingInstruction(categoryTitle, part) {
  return [
    `${categoryTitle} section guidance.`,
    part === "compatibility"
      ? "Use only user.saju, partner.saju, compatibility sourceData."
      : "Use only user.saju sourceData.",
    "Do not expose raw JSON keys.",
    "Include practical advice.",
  ].join(" ");
}

function buildCoreSajuSnapshot(person = {}) {
  const day = person?.fourPillars?.day || {};
  return compactObject({
    chartSignature: `${person?.fourPillars?.year?.ganji || ""}-${person?.fourPillars?.month?.ganji || ""}-${person?.fourPillars?.day?.ganji || ""}-${person?.fourPillars?.hour?.ganji || ""}`,
    pillars: compactObject({
      year: person?.fourPillars?.year || null,
      month: person?.fourPillars?.month || null,
      day,
      hour: person?.fourPillars?.hour || null,
    }),
    dayMaster: person?.dayMaster || null,
    dayBranch: day?.branch || null,
    elements: person?.fiveElements || null,
    tenGods: person?.tenGods || null,
    hiddenStems: day?.hiddenStems || null,
    specialStars: person?.attractionStars || null,
    spouseStar: person?.tenGods?.loveRelatedGods?.spouseStar || null,
    relationshipSignals: person?.loveProfile || null,
    luckCycles: compactObject({
      currentDaewoon: person?.luck?.currentDaewoon || null,
      nextDaewoon: person?.luck?.nextDaewoon || null,
    }),
    yearlyFlow: person?.luck?.annualLuck || null,
    chartSummary: compactObject({
      strength: person?.dayMaster?.strength || null,
      usefulGods: person?.usefulGods || null,
      johu: person?.johu || null,
    }),
  });
}

function buildCompatibilitySnapshot(compatibility = {}) {
  return compactObject({
    dayMasterRelation: compatibility?.dayMasterRelation || null,
    dayBranchRelation: compatibility?.spousePalaceInteraction || compatibility?.dayBranchRelation || null,
    elementRelation: compatibility?.elementBalance || compatibility?.elementRelation || null,
    tenGodRelation: compatibility?.tenGodCompatibility || compatibility?.tenGodRelation || null,
    branchRelations: compatibility?.stemBranchInteractions || compatibility?.branchRelations || null,
    loveChemistry: compactObject({
      score: compatibility?.attractionScore,
      strengths: compatibility?.strengths || [],
      risks: compatibility?.risks || [],
      advice: compatibility?.advice || [],
      summary: compatibility?.summary || null,
    }),
  });
}

function buildSajuLoveCategorySourceData(mode, part, categoryId, userSaju, partnerSaju, compatibility) {
  const base = compactObject({ mode, categoryId, userSaju });
  if (part === "solo") return base;
  return compactObject({ ...base, partnerSaju, compatibility });
}

function buildChapterFromDef(def, order, part, mode, userSaju, partnerSaju, compatibility) {
  const categories = def.categories
    .map(([categoryId, title]) => ({
      id: categoryId,
      title,
      sourceData: buildSajuLoveCategorySourceData(mode, part, categoryId, userSaju, partnerSaju, compatibility),
      writingInstruction: buildCategoryWritingInstruction(title, part),
    }))
    .filter((row) => isNonEmptyObject(row.sourceData));

  return { id: def.id, order, title: def.title, part, categories };
}

export function buildSajuLoveSoloChapterManifest(mode, userSaju) {
  return SOLO_CHAPTER_DEFS.map((def, idx) => buildChapterFromDef(def, idx + 1, "solo", mode, userSaju, null, null));
}

export function buildSajuLoveCompatibilityChapterManifest(mode, userSaju, partnerSaju, compatibility) {
  return COMPAT_CHAPTER_DEFS.map((def, idx) => buildChapterFromDef(def, idx + 1, "compatibility", mode, userSaju, partnerSaju, compatibility));
}

export function buildSajuLoveChapterManifest(mode, userSaju, partnerSaju, compatibility) {
  if (mode === "compatibility") return buildSajuLoveCompatibilityChapterManifest(mode, userSaju, partnerSaju, compatibility);
  return buildSajuLoveSoloChapterManifest(mode, userSaju);
}

export function buildSajuLovePdfPayload(params = {}) {
  const mode = String(params.mode || "solo").trim() === "compatibility" ? "compatibility" : "solo";
  const user = params.user || {};
  const partner = params.partner || null;
  const userSaju = buildCoreSajuSnapshot(params.userPerson || {});
  const partnerSaju = mode === "compatibility" ? buildCoreSajuSnapshot(params.partnerPerson || {}) : null;
  const compatibility = mode === "compatibility" ? buildCompatibilitySnapshot(params.compatibility || {}) : null;

  const payload = {
    mode,
    reportTitle: mode === "compatibility" ? "Saju Love Book Compatibility" : "Saju Love Book",
    user: compactObject({
      name: user?.name || "user",
      gender: user?.gender || "unknown",
      birthInfo: user?.birthInfo || null,
      calendarType: user?.calendarType || "solar",
      timezone: user?.timezone || "Asia/Seoul",
      saju: userSaju,
    }),
    chapters: buildSajuLoveChapterManifest(mode, userSaju, partnerSaju, compatibility),
  };

  if (mode === "solo") {
    payload.saju = userSaju;
    return payload;
  }

  payload.partner = compactObject({
    name: partner?.name || "partner",
    gender: partner?.gender || "unknown",
    birthInfo: partner?.birthInfo || null,
    saju: partnerSaju,
  });
  payload.compatibility = compatibility;
  return payload;
}

export function assertNoSajuLoveFallbackText(text, label = "text") {
  const source = String(text || "");
  for (const token of SAJU_LOVE_FORBIDDEN_PHRASES) {
    if (source.toLowerCase().includes(String(token).toLowerCase())) {
      throw new Error(`SAJU_LOVE_FORBIDDEN_TEXT:${label}:${token}`);
    }
  }
}

function validateCategory(category, path, errors) {
  if (!category || typeof category !== "object") {
    errors.push(`${path}:category_missing`);
    return;
  }
  if (!String(category.id || "").trim()) errors.push(`${path}.id:required`);
  if (!String(category.title || "").trim()) errors.push(`${path}.title:required`);
  if (!isNonEmptyObject(category.sourceData)) errors.push(`${path}.sourceData:required`);
  if (!String(category.writingInstruction || "").trim()) errors.push(`${path}.writingInstruction:required`);
  try {
    assertNoSajuLoveFallbackText(JSON.stringify(category), `${path}`);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : `${path}:forbidden_text`);
  }
}

export function validateSajuLovePdfPayload(payload = {}) {
  const errors = [];
  const mode = String(payload?.mode || "").trim();
  if (mode !== "solo" && mode !== "compatibility") errors.push("mode:invalid");
  if (!String(payload?.reportTitle || "").trim()) errors.push("reportTitle:required");

  const chapters = Array.isArray(payload?.chapters) ? payload.chapters : [];
  if (!chapters.length) errors.push("chapters:required");

  const soloChapters = chapters.filter((row) => String(row?.part || "") === "solo");
  const compatChapters = chapters.filter((row) => String(row?.part || "") === "compatibility");

  chapters.forEach((chapter, idx) => {
    const basePath = `chapters[${idx}]`;
    if (!String(chapter?.id || "").trim()) errors.push(`${basePath}.id:required`);
    if (!String(chapter?.title || "").trim()) errors.push(`${basePath}.title:required`);
    if (!Array.isArray(chapter?.categories) || chapter.categories.length === 0) {
      errors.push(`${basePath}.categories:required`);
    } else {
      chapter.categories.forEach((category, cIdx) => validateCategory(category, `${basePath}.categories[${cIdx}]`, errors));
    }
  });

  if (mode === "solo") {
    if (soloChapters.length !== 10) errors.push("solo_chapters:must_be_10");
    if (compatChapters.length > 0) errors.push("solo_mode_no_compatibility_chapters");
    if (payload?.partner) errors.push("solo_mode_no_partner");
    if (payload?.compatibility) errors.push("solo_mode_no_compatibility");

    const userBirth = payload?.user?.birthInfo;
    if (!isNonEmptyObject(userBirth)) errors.push("user.birthInfo:required");
    if (!String(payload?.user?.gender || "").trim()) errors.push("user.gender:required");
    const saju = payload?.saju || payload?.user?.saju;
    if (!isNonEmptyObject(saju)) errors.push("saju:required");
    if (!isNonEmptyObject(saju?.pillars)) errors.push("saju.pillars:required");
    if (!saju?.dayMaster) errors.push("saju.dayMaster:required");
    if (!saju?.elements) errors.push("saju.elements:required");
    if (!saju?.tenGods) errors.push("saju.tenGods:required");
  }

  if (mode === "compatibility") {
    if (soloChapters.length !== 0) errors.push("compat_mode_solo_chapters:must_be_0");
    if (compatChapters.length !== 12) errors.push("compat_mode_compatibility_chapters:must_be_12");

    if (!isNonEmptyObject(payload?.user?.birthInfo)) errors.push("user.birthInfo:required");
    if (!isNonEmptyObject(payload?.partner?.birthInfo)) errors.push("partner.birthInfo:required");

    const userSaju = payload?.user?.saju;
    const partnerSaju = payload?.partner?.saju;
    if (!isNonEmptyObject(userSaju)) errors.push("user.saju:required");
    if (!isNonEmptyObject(partnerSaju)) errors.push("partner.saju:required");
    if (!isNonEmptyObject(userSaju?.pillars)) errors.push("user.saju.pillars:required");
    if (!isNonEmptyObject(partnerSaju?.pillars)) errors.push("partner.saju.pillars:required");
    if (!userSaju?.dayMaster) errors.push("user.saju.dayMaster:required");
    if (!partnerSaju?.dayMaster) errors.push("partner.saju.dayMaster:required");

    const comp = payload?.compatibility;
    if (!isNonEmptyObject(comp)) {
      errors.push("compatibility:required");
    } else {
      const hasAnyRelation = Boolean(comp?.dayMasterRelation || comp?.elementRelation || comp?.dayBranchRelation);
      if (!hasAnyRelation) errors.push("compatibility.relation:required");
    }

    for (const chapter of compatChapters) {
      for (const category of chapter.categories || []) {
        if (!category?.sourceData?.userSaju || !category?.sourceData?.partnerSaju || !category?.sourceData?.compatibility) {
          errors.push(`compat_chapter_missing_required_source:${chapter.id}:${category.id}`);
        }
      }
    }
  }

  try {
    assertNoSajuLoveFallbackText(JSON.stringify(payload), "payload");
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "payload:forbidden_text");
  }

  return { ok: errors.length === 0, errors };
}

export function getSajuLoveForbiddenPhrases() {
  return SAJU_LOVE_FORBIDDEN_PHRASES.slice();
}

export function getSajuLoveChapterDefs() {
  return {
    solo: SOLO_CHAPTER_DEFS,
    compatibility: COMPAT_CHAPTER_DEFS,
  };
}
