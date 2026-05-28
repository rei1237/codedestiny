import { getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { requireAuth } from "../lib/auth.js";
import { requirePremiumReportAccess } from "../lib/access-control.js";
import { callGeminiText } from "../lib/gemini.js";

const CHAPTER_BLUEPRINTS = [
  { id: "01", title: "1장. 사주 원국의 핵심 설계도" },
  { id: "02", title: "2장. 일간과 월지로 읽는 기본 기질" },
  { id: "03", title: "3장. 용신/희신/기신 운용 전략" },
  { id: "04", title: "4장. 대운 흐름과 전환 시점" },
  { id: "05", title: "5장. 재능 구조와 사회적 역할" },
  { id: "06", title: "6장. 관계 패턴과 경계 전략" },
  { id: "07", title: "7장. 연애/결혼 흐름 분석" },
  { id: "08", title: "8장. 커리어와 실행 루틴" },
  { id: "09", title: "9장. 재물 운용과 리스크 관리" },
  { id: "10", title: "10장. 건강/에너지 회복 설계" },
  { id: "11", title: "11장. 위기 신호와 반전 타이밍" },
  { id: "12", title: "12장. 12개월 실행 로드맵" },
  { id: "13", title: "13장. 인생 마스터 플랜" },
];

const FORBIDDEN_TEXT = [
  "fallback",
  "placeholder",
  "debug",
  "internal payload",
  "json dump",
  "테스트 문구",
];

function clean(value) {
  return String(value || "").trim();
}

function toInt(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function normalizeInput(body = {}) {
  const name = clean(body.name) || "사용자";
  const gender = clean(body.gender) || "unknown";
  const year = toInt(body.year, NaN);
  const month = toInt(body.month, NaN);
  const day = toInt(body.day, NaN);
  const hour = toInt(body.hour, 12);
  const minute = toInt(body.minute, 0);
  const birthplace = clean(body.birthplace) || "대한민국";

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return { ok: false, message: "생년월일은 필수입니다." };
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return { ok: false, message: "생년월일 형식이 올바르지 않습니다." };
  }
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return { ok: false, message: "출생 시간 형식이 올바르지 않습니다." };
  }

  return {
    ok: true,
    profile: {
      name,
      gender,
      year,
      month,
      day,
      hour,
      minute,
      birthplace,
      birthIso: `${year}-${pad2(month)}-${pad2(day)} ${pad2(hour)}:${pad2(minute)}`,
    },
  };
}

function pickByIndex(list, index) {
  return list[((index % list.length) + list.length) % list.length];
}

function deriveLocalSignals(profile) {
  const stems = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"];
  const branches = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"];
  const elements = ["목", "화", "토", "금", "수"];

  const seed = (
    profile.year * 37
    + profile.month * 19
    + profile.day * 13
    + profile.hour * 7
    + profile.minute
  );

  const dayMaster = pickByIndex(stems, seed);
  const yearBranch = pickByIndex(branches, profile.year + profile.month);
  const monthBranch = pickByIndex(branches, profile.month + profile.day);
  const useful = pickByIndex(elements, seed + 2);
  const support = pickByIndex(elements, seed + 4);
  const caution = pickByIndex(elements, seed + 1);

  return {
    dayMaster,
    yearBranch,
    monthBranch,
    useful,
    support,
    caution,
    rhythm: `${pickByIndex(branches, seed)}-${pickByIndex(branches, seed + 3)}-${pickByIndex(branches, seed + 6)}`,
  };
}

function chapterParagraphs(profile, signals, chapterTitle) {
  return [
    `${profile.name}님의 생년월일시(${profile.birthIso})를 기준으로 보면 일간의 중심축은 ${signals.dayMaster}의 결을 띱니다. 월지 ${signals.monthBranch}와 연지 ${signals.yearBranch}의 만남은 기회가 열릴 때 속도전보다 기준 정렬이 먼저라는 메시지를 줍니다.`,
    `이 장에서는 ${chapterTitle} 관점에서 ${signals.useful} 기운을 실제 행동으로 바꾸는 방법을 제시합니다. 강점은 단순 재능이 아니라 반복 가능한 운영 방식에서 생기므로, 하루 루틴과 관계 경계선을 함께 설계해야 효과가 커집니다.`,
    `${signals.support} 기운은 확장 에너지로 작동하고 ${signals.caution} 기운은 과속 신호로 나타날 가능성이 큽니다. 따라서 중요한 결정을 내릴 때는 1) 사실 점검 2) 감정 점수 기록 3) 실행 단위를 1주 단위로 축소하는 순서를 고정해 손실을 줄이는 것이 좋습니다.`,
    `핵심은 운을 기다리는 것이 아니라, 운이 왔을 때 즉시 실행 가능한 구조를 미리 만드는 것입니다. 이 챕터의 제안은 이상적 문장이 아니라 실전 적용을 전제로 하며, 작은 행동의 누적이 3개월 뒤 체감 가능한 결과로 연결되도록 설계되어 있습니다.`,
  ];
}

function validateChapterText(text) {
  const source = clean(text);
  if (!source) return { ok: false, reason: "empty" };
  if (source.length < 600) return { ok: false, reason: "too_short" };

  const lowered = source.toLowerCase();
  for (const forbidden of FORBIDDEN_TEXT) {
    if (lowered.includes(forbidden)) return { ok: false, reason: `forbidden:${forbidden}` };
  }

  return { ok: true, reason: "ok" };
}

function reinforceChapterText(profile, signals, chapterTitle, originText) {
  const appendix = [
    "",
    "실행 보강 메모",
    `- 기준 축: ${signals.dayMaster} 일간의 장점을 살리는 환경(시간 블록, 반복 루틴) 확보`,
    `- 확장 축: ${signals.useful}/${signals.support} 기운이 강한 시간대에 핵심 작업 배치`,
    `- 리스크 축: ${signals.caution} 과잉 시 즉흥 의사결정 금지, 24시간 검토 규칙 적용`,
    `- 적용 대상: ${profile.name}님의 현재 우선순위 1개에 먼저 적용 후 7일 단위 점검`,
  ].join("\n");
  return `${clean(originText)}\n\n${appendix}`.trim();
}

async function maybeEnhanceChapterWithLlm(env, profile, signals, chapter) {
  const prompt = [
    "당신은 사주 상담 리포트 편집자입니다.",
    "다음 본문을 한국어로 자연스럽게 다듬되, 데이터/알고리즘/디버그/JSON 같은 내부 용어는 절대 쓰지 마세요.",
    "결과는 본문만 출력하세요.",
    "",
    `이름: ${profile.name}`,
    `출생: ${profile.birthIso}`,
    `핵심: 일간 ${signals.dayMaster}, 월지 ${signals.monthBranch}, 연지 ${signals.yearBranch}, 용신 ${signals.useful}`,
    `챕터: ${chapter.title}`,
    "",
    chapter.text,
  ].join("\n");

  const ai = await callGeminiText(env, prompt, {
    modelEnvKeys: ["LIFEBOOK_GEMINI_MODEL", "GEMINI_MODEL"],
    temperature: 0.75,
    maxOutputTokens: 2200,
    timeoutMs: 9000,
    totalTimeoutMs: 12000,
  });

  if (!ai.ok) {
    return { text: chapter.text, source: "local" };
  }

  const candidate = clean(ai.text);
  const check = validateChapterText(candidate);
  if (!check.ok) {
    return { text: chapter.text, source: "local" };
  }

  return { text: candidate, source: "llm" };
}

function buildPdfReadyPayload(profile, chapters, metadata = {}) {
  return {
    title: `${profile.name} 사주 인생의 책`,
    generatedAt: new Date().toISOString(),
    profile,
    metadata,
    chapters: chapters.map((chapter, index) => ({
      chapter: index + 1,
      id: chapter.id,
      title: chapter.title,
      text: chapter.text,
      source: chapter.source || "local",
    })),
  };
}

async function handlePrepare(request, env) {
  const auth = await requireAuth(request, env);
  const body = await readJson(request);

  const normalized = normalizeInput(body);
  if (!normalized.ok) {
    return json({ ok: false, message: normalized.message }, { status: 400 });
  }

  const profile = normalized.profile;
  const access = await requirePremiumReportAccess(env, auth.userId, "sajuLifeBook", {
    ...body,
    featureKey: clean(body.featureKey) || "saju_lifebook_pdf",
    reportType: "sajuLifeBook",
    _accessRoute: "/api/premium/saju-lifebook/prepare",
  });

  if (!access?.ok) {
    return json({
      ok: false,
      message: access?.message || "결제 또는 해금 확인이 필요합니다.",
      code: access?.code || "PAYMENT_REQUIRED",
    }, { status: Number(access?.status || 402) });
  }

  const signals = deriveLocalSignals(profile);

  const localChapters = CHAPTER_BLUEPRINTS.map((chapter) => {
    const baseText = chapterParagraphs(profile, signals, chapter.title).join("\n\n");
    return {
      id: chapter.id,
      title: chapter.title,
      text: baseText,
      source: "local",
    };
  });

  const finalChapters = [];
  for (let i = 0; i < localChapters.length; i += 1) {
    const localChapter = localChapters[i];
    const llmResult = await maybeEnhanceChapterWithLlm(env, profile, signals, localChapter);

    let chapterText = clean(llmResult.text || localChapter.text);
    const validation = validateChapterText(chapterText);
    if (!validation.ok) {
      chapterText = reinforceChapterText(profile, signals, localChapter.title, localChapter.text);
    }

    finalChapters.push({
      id: localChapter.id,
      title: localChapter.title,
      text: chapterText,
      source: llmResult.source,
    });
  }

  const pdfReady = buildPdfReadyPayload(profile, finalChapters, {
    featureKey: "saju_lifebook_pdf",
    reportType: "sajuLifeBook",
    accessType: String(access.accessType || "unknown"),
  });

  return json({
    ok: true,
    data: {
      reportId: `saju-lifebook-${Date.now()}`,
      featureKey: "saju_lifebook_pdf",
      reportType: "sajuLifeBook",
      profile,
      chapters: finalChapters,
      pdfReady,
    },
  });
}

export async function handleSajuLifebookRoutes(request, env = {}) {
  try {
    const method = request.method.toUpperCase();
    const path = getRoutePath(request, "/api/premium/saju-lifebook");

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
        route: "saju-lifebook",
        method: request?.method || "",
        requestPath: (() => {
          try { return new URL(request.url).pathname; } catch (_) { return ""; }
        })(),
      },
    });
  }
}
