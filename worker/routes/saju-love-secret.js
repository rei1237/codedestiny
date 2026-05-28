import { getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { requireAuth } from "../lib/auth.js";
import { requirePremiumReportAccess } from "../lib/access-control.js";
import { callGeminiText } from "../lib/gemini.js";
import { LOVE_SECRET_MODE_CONFIG } from "../lib/saju-premium-chapters.js";

const LOVE_SECRET_SERVICE_KEY = "saju-love-secret";
const LOVE_SECRET_FEATURE_KEY = "saju_love_book_pdf";

const DEFAULT_CATEGORY_BY_MODE = {
  solo: {
    1: ["연애 자아 진단", "감정 작동 방식", "핵심 욕구", "강점 포인트", "주의 신호"],
    2: ["매력 코드", "도화·홍염·화개", "끌림 포인트", "매력 활용법", "금기 요소"],
    3: ["이상형 분석", "위험한 상대", "오래 갈 인연", "반복 인연 패턴", "회피 기준"],
    4: ["붕괴 패턴", "반복 실수", "이별 트리거", "감정 후폭풍", "패턴 전환법"],
    5: ["감정 집착", "중독 신호", "불안의 원인", "자기 소진", "회복 기준"],
    6: ["회복 탄성", "갈등 복구", "재접속 방식", "신뢰 회복", "정서 복원력"],
    7: ["결혼 태도", "장기 안정성", "현실 조건", "배우자궁 신호", "장기 전략"],
    8: ["위험 인연", "금지 패턴", "경고 신호", "반복 중독", "차단 기준"],
    9: ["현실 전략", "고백·대화", "거리 조절", "관계 운영", "실행 규칙"],
    10: ["최종 요약", "핵심 매력", "반복 약점", "행동 우선순위", "연애 로드맵"],
  },
  compatibility: {
    1: ["원국 요약", "각자의 연애 자아", "핵심 차이", "관계 기본축", "총론"],
    2: ["끌림 포인트", "상호 매력 구조", "강한 유인", "불안 스위치", "안정 장치"],
    3: ["감정 리듬", "애착 온도차", "속도 차이", "오해 포인트", "조율 전략"],
    4: ["소통 습관", "오해 구조", "갈등 언어", "대화 회복", "실행 규칙"],
    5: ["생활 루틴", "현실 역할", "책임 분배", "돈·생활 조건", "적합도"],
    6: ["장기 유지 조건", "신뢰 구조", "안정 장치", "경계선", "장기 전략"],
    7: ["갈등 트리거", "방어 반응", "반복 상처", "폭발 지점", "복구 루틴"],
    8: ["거리감 신호", "이별 위험", "재회 가능성", "되돌림 조건", "판단 기준"],
    9: ["성장 지점", "서로의 배움", "협력 구조", "보완 포인트", "관계 확장"],
    10: ["대운 흐름", "세운 변화", "좋은 타이밍", "주의 타이밍", "시기 전략"],
    11: ["첫 30일", "다음 30일", "마지막 30일", "갈등 완화", "신뢰 회복"],
    12: ["핵심 장점", "핵심 위험", "유지 전략", "정리 기준", "최종 로드맵"],
  },
};

function clean(value) {
  return String(value || "").trim();
}

function normalizeMode(rawMode) {
  const mode = clean(rawMode).toLowerCase();
  if (mode === "compatibility" || mode === "compat" || mode === "couple") return "compatibility";
  return "solo";
}

function toConfigMode(mode) {
  return mode === "compatibility" ? "couple" : "solo";
}

function toFeatureKey() {
  return LOVE_SECRET_FEATURE_KEY;
}

function stripUnsafeText(value) {
  return clean(value)
    .replace(/\b(undefined|null|nan)\b/gi, "")
    .replace(/\b(payload|json|localdraft|fallback|llm)\b/gi, "")
    .replace(/chapter\s*1/gi, "")
    .replace(/자동\s*복구\s*생성/gi, "")
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

  return {
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

function getChapterSpecificSections(body, chapterNo, mode) {
  const input = Array.isArray(body?.chapterSpecificSections) ? body.chapterSpecificSections : [];
  const cleanedInput = input.map((v) => stripUnsafeText(v)).filter(Boolean);
  if (cleanedInput.length) return cleanedInput.slice(0, 8);
  const defaults = DEFAULT_CATEGORY_BY_MODE[mode] || DEFAULT_CATEGORY_BY_MODE.solo;
  return (defaults[chapterNo] || defaults[1] || ["핵심 성향", "관계 패턴", "주의점", "실전 전략", "행동 가이드"]).slice(0, 8);
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

  const text = [
    `${chapterTitle}의 ${sectionTitle}는 일간 ${dm}, 일지 ${db}, 월지 ${mb}를 중심 축으로 해석했습니다.`,
    `${strengthLabel} 구조와 주도 십성(${tenGod})의 결합은 감정 표현의 방식과 관계의 주도권 이동을 결정합니다. 특히 ${mode === "compatibility" ? "두 사람의" : "개인의"} 반복 패턴은 우세 오행(${dominantEl})이 과열될 때 강해지고, 결핍 오행(${deficientEl})을 보강할 때 안정됩니다.`,
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
  const systemPrompt = [
    "당신은 30년 경력의 명리학 상담가이자 프리미엄 연애 리포트 작가입니다.",
    "사주 계산은 이미 Code:Destiny의 로컬 사주 엔진이 완료했습니다.",
    "당신은 사주 원국, 오행, 십성, 신강/신약, 조후, 용신, 신살을 새로 계산하지 않습니다.",
    "당신의 역할은 제공된 사주 계산 결과와 이미 확정된 연애 비책 챕터 구조를 바탕으로, 사용자가 읽을 수 있는 고품질 상담문을 작성하는 것입니다.",
    "절대 규칙:",
    "1. 챕터 id, 챕터 제목, 순서, 세부 카테고리 제목을 변경하지 마세요.",
    "2. 개인 모드와 궁합 모드를 섞지 마세요.",
    "3. 제공되지 않은 계산값을 계산 근거처럼 지어내지 마세요.",
    "4. 내부 JSON, payload, debug 값, 함수명은 출력하지 마세요.",
    "5. 각 세부 카테고리마다 실제 상담문을 작성하세요.",
    "6. 막연한 위로가 아니라 사주 계산 결과에 근거한 성향, 반복 패턴, 주의점, 실전 전략을 작성하세요.",
    "7. 결과는 지정된 JSON schema로만 반환하세요.",
  ].join("\n");

  const userPrompt = [
    `mode: ${mode}`,
    `chapterNo: ${chapterNo}`,
    `chapterTitle: ${chapter.chapterTitle}`,
    `chapterSubtitle: ${chapter.chapterSubtitle}`,
    "sajuBase:",
    JSON.stringify(base, null, 2),
    "chapterSchema:",
    JSON.stringify({
      sections: chapter.sections.map((s) => ({ id: s.id, title: s.title, body: "" })),
    }, null, 2),
    "응답은 위 chapterSchema와 동일한 JSON만 반환하세요.",
  ].join("\n\n");

  const llm = await callGeminiText(env, `${systemPrompt}\n\n${userPrompt}`, {
    modelEnvKeys: ["LOVE_SECRET_GEMINI_MODEL", "GEMINI_MODEL"],
    temperature: 0.72,
    maxOutputTokens: 1800,
    timeoutMs: 9000,
    totalTimeoutMs: 12000,
  });

  if (!llm?.ok || !clean(llm?.text)) {
    return { ...chapter, fallbackUsed: true };
  }

  const raw = clean(llm.text).replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  let parsed = null;
  try { parsed = JSON.parse(raw); } catch { parsed = null; }
  if (!parsed || !Array.isArray(parsed.sections)) {
    return { ...chapter, fallbackUsed: true };
  }

  const mergedSections = chapter.sections.map((section, idx) => {
    const incoming = parsed.sections[idx] || parsed.sections.find((r) => clean(r?.id) === section.id || clean(r?.title) === section.title);
    const body = stripUnsafeText(incoming?.body || incoming?.content || section.body);
    return {
      ...section,
      body: body || section.body,
    };
  });
  const finalText = mergedSections.map((s) => `## ${s.title}\n\n${s.body}`).join("\n\n");
  return {
    ...chapter,
    sections: mergedSections,
    finalText: stripUnsafeText(finalText) || chapter.finalText,
    fallbackUsed: false,
  };
}

function buildApiError(code, message, status = 400, debugSafe = null) {
  return json({
    ok: false,
    code,
    message,
    ...(debugSafe && typeof debugSafe === "object" ? { debugSafe } : {}),
  }, { status });
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

  const featureKey = toFeatureKey();
  const reportId = clean(body?.reportId);
  const sessionId = clean(body?.sessionId || body?.reportSessionId || body?.chapterSessionId);
  const purchaseId = clean(body?.purchaseId || body?.reportPurchaseId || body?.accessGrant?.purchaseId || body?.payment?.purchaseId || body?._paymentContext?.purchaseId);

  const access = await requirePremiumReportAccess(env, auth.userId, "loveSecret", {
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

  return { ok: true, auth, featureKey };
}

async function handleGenerateChapter(request, env) {
  const body = await readJson(request);
  const mode = normalizeMode(body?.mode || body?.reportMode);
  const authz = await authorizeLoveSecret(request, env, body, mode);
  if (!authz.ok) return authz.response;

  const chapterNo = Number(body?.chapter || 1);
  const config = safeModeChapterConfig(mode);
  const totalChapters = Number(config.totalChapters || 0);
  if (!Number.isFinite(chapterNo) || chapterNo < 1 || chapterNo > totalChapters) {
    return buildApiError("INVALID_CHAPTER", "요청한 챕터 번호가 유효하지 않습니다.", 400);
  }

  const base = normalizeSajuBase(body);
  const valid = validateMinimumSaju(base);
  if (!valid.ok) {
    return buildApiError("MISSING_SAJU_DATA", "사주 분석 결과가 충분하지 않습니다. 사주 분석 화면에서 다시 계산해 주세요.", 400);
  }

  const chapterMeta = (Array.isArray(config.chapters) ? config.chapters : [])[chapterNo - 1] || {};
  const title = stripUnsafeText(body?.chapterTitle || chapterMeta.title || `연애 비책 ${chapterNo}장`);
  const subtitle = stripUnsafeText(body?.chapterSubtitle || chapterMeta.subtitle || "") || "";
  const sectionTitles = getChapterSpecificSections(body, chapterNo, mode);

  const local = buildLocalChapter(base, title, subtitle, sectionTitles, mode, chapterNo);
  const llm = await maybeEnhanceWithLlm(env, base, local, mode, chapterNo);
  const finalText = stripUnsafeText(llm.finalText || local.finalText) || local.finalText;

  return json({
    ok: true,
    featureKey: authz.featureKey,
    mode,
    sessionId: clean(body?.sessionId || body?.reportSessionId || body?.chapterSessionId) || "",
    chapter: chapterNo,
    chapterCount: totalChapters,
    chapterMeta: { title, subtitle },
    fallbackUsed: Boolean(llm.fallbackUsed),
    pdfUrl: "",
    text: finalText,
    sections: Array.isArray(llm.sections) ? llm.sections : local.sections,
  });
}

async function handlePrepare(request, env) {
  const body = await readJson(request);
  const mode = normalizeMode(body?.mode || body?.reportMode);
  const authz = await authorizeLoveSecret(request, env, body, mode);
  if (!authz.ok) return authz.response;

  const base = normalizeSajuBase(body);
  const valid = validateMinimumSaju(base);
  if (!valid.ok) {
    return buildApiError("MISSING_SAJU_DATA", "사주 분석 결과가 충분하지 않습니다. 사주 분석 화면에서 다시 계산해 주세요.", 400);
  }

  const config = safeModeChapterConfig(mode);
  const totalChapters = Number(config.totalChapters || 0);
  const chapters = [];
  let fallbackUsed = false;

  for (let i = 0; i < totalChapters; i += 1) {
    const chapterNo = i + 1;
    const chapterMeta = (Array.isArray(config.chapters) ? config.chapters : [])[i] || {};
    const title = stripUnsafeText(chapterMeta.title || `연애 비책 ${chapterNo}장`);
    const subtitle = stripUnsafeText(chapterMeta.subtitle || "");
    const sectionTitles = getChapterSpecificSections({}, chapterNo, mode);
    const local = buildLocalChapter(base, title, subtitle, sectionTitles, mode, chapterNo);
    const llm = await maybeEnhanceWithLlm(env, base, local, mode, chapterNo);
    if (llm.fallbackUsed) fallbackUsed = true;
    chapters.push({
      chapter: chapterNo,
      title,
      subtitle,
      text: stripUnsafeText(llm.finalText || local.finalText) || local.finalText,
      sections: Array.isArray(llm.sections) ? llm.sections : local.sections,
    });
  }

  return json({
    ok: true,
    featureKey: authz.featureKey,
    mode,
    sessionId: clean(body?.sessionId || body?.reportSessionId) || "",
    chapterCount: totalChapters,
    fallbackUsed,
    pdfUrl: "",
    chapters,
  });
}

export async function handleSajuLoveSecretRoutes(request, env = {}) {
  try {
    const method = request.method.toUpperCase();
    const path = getRoutePath(request, "/api/love-secret");

    if (method === "POST" && (path === "" || path === "/" || path === "/generate-chapter")) {
      return await handleGenerateChapter(request, env);
    }

    if (method === "POST" && path === "/prepare") {
      return await handlePrepare(request, env);
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
