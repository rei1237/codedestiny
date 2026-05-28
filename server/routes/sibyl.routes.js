const express = require("express");
const { requireAuth } = require("../middleware/auth.middleware");

const router = express.Router();

const SIBYL_MIN_TOTAL_CHARS = 20000;
const SIBYL_MIN_CHAPTER_CHARS = 1900;
const SIBYL_CATEGORY_PLAN = [
  { title: "운명 코드 코어 진단", focus: "일간·월지·지배 오행·주도 십성 기반의 성향 엔진" },
  { title: "강점/약점 매트릭스", focus: "실제 환경에서 강점이 약점으로 뒤집히는 트리거 분석" },
  { title: "커리어 적합도 세분화", focus: "조직형·창업형·프리랜스형·전문가형 비교" },
  { title: "돈의 흐름과 수익 구조", focus: "수익 모델, 지출 누수, 리스크 관리, 현금흐름 습관" },
  { title: "인간관계/협업 전략", focus: "갈등 유발 패턴과 협업 최적화 커뮤니케이션" },
  { title: "리스크 시그널 해부", focus: "관성/재성/비겁 과다·부족에 따른 실패 패턴" },
  { title: "연애/파트너십 적용", focus: "관계 선택 기준, 경계선 설정, 장기 파트너십 유지 방식" },
  { title: "12개월 실행 로드맵", focus: "월별 의사결정 가이드와 실행 우선순위" },
  { title: "3년 변곡점 시나리오", focus: "확장기·조정기·재정비기 행동 전략" },
  { title: "Dominator 90일 실전 플랜", focus: "1~7일, 8~30일, 31~60일, 61~90일 단계별 처방" },
];

function clean(value) {
  return String(value || "").trim();
}

function normalizeLineBreaks(text) {
  return clean(String(text || "").replace(/\r\n?/g, "\n"));
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function stableHash(input) {
  const text = clean(input);
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function pickGeminiKeys() {
  return [
    process.env.SIBYL_GEMINI_API_KEY1,
    process.env.SIBYL_GEMINI_API_KEY2,
    process.env.GEMINIF_API_KEY1,
    process.env.GEMINIF_API_KEY2,
    process.env.GEMINIF_API_KEY3,
    process.env.GEMINIF_API_KEY4,
    process.env.GEMINI_API_KEY,
    process.env.GOOGLE_GEMINI_API_KEY,
    process.env.GOOGLE_API_KEY,
  ]
    .map((value) => clean(value))
    .filter(Boolean)
    .filter((value, index, arr) => arr.indexOf(value) === index);
}

function pickGeminiModels() {
  const models = [
    process.env.SIBYL_GEMINI_MODEL,
    process.env.GEMINI_MODEL,
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-1.5-flash",
    "gemini-2.5-pro",
  ]
    .map((value) => clean(value))
    .filter(Boolean);

  return models.filter((value, index, arr) => arr.indexOf(value) === index);
}

function extractGeminiText(payload) {
  const parts = payload?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts.map((part) => clean(part?.text)).filter(Boolean).join("\n").trim();
}

function parseJsonCandidate(text) {
  const source = clean(text);
  if (!source) return null;

  const candidates = [source];
  const fenced = source.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) candidates.push(clean(fenced[1]));

  const firstBrace = source.indexOf("{");
  const lastBrace = source.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    candidates.push(source.slice(firstBrace, lastBrace + 1));
  }

  for (const raw of candidates) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") return parsed;
    } catch (e) {
      // try next
    }
  }

  return null;
}

function buildSibylFingerprint(body = {}) {
  const profile = body?.profile || {};
  const b = profile?.birth || {};
  const pillars = body?.pillars || {};
  const seed = [
    clean(profile?.id),
    toNumber(b?.year, ""),
    toNumber(b?.month, ""),
    toNumber(b?.day, ""),
    toNumber(b?.hour, ""),
    toNumber(b?.minute, ""),
    clean(profile?.gender || body?.gender),
    clean(body?.dominantEl),
    clean(body?.dominantTenStar),
    toNumber(body?.aptCoeff, ""),
    toNumber(body?.riskScore, ""),
    JSON.stringify(pillars || {}),
  ].join("|");
  return `sibyl_${stableHash(seed)}`;
}

function deterministicExpansionBlock(body = {}, category = {}, index = 0) {
  const dominantEl = clean(body?.dominantEl) || "water";
  const dominantTenStar = clean(body?.dominantTenStar) || "편재";
  const aptCoeff = toNumber(body?.aptCoeff, 420);
  const riskScore = Math.max(5, Math.min(99, toNumber(body?.riskScore, 35)));
  const currentYear = toNumber(body?.currentYear, new Date().getFullYear());
  const lines = [
    `현재 분석 블록 ${index + 1}: ${category.title}`,
    `주도 십성(${dominantTenStar})과 지배 오행(${dominantEl})의 결합은 의사결정 속도와 품질의 균형이 핵심 과제임을 시사합니다.`,
    `적성 계수 ${aptCoeff} 기준으로 볼 때, 단기 성과보다 재현 가능한 프로세스 구축이 장기 성과를 크게 만듭니다.`,
    `리스크 계수 ${riskScore} 구간에서는 과감함보다 검증 루프를 짧게 돌리는 전략이 손실을 줄입니다.`,
    `실전 가이드: 목표를 "성과 지표 1개 + 행동 규칙 2개"로 단순화하고 ${currentYear}년 기준 월 1회 리뷰를 고정하세요.`,
    `협업 상황에서는 역할 경계와 완료 기준을 문서로 남겨 감정 소모를 줄이고, 재작업 비용을 통제해야 합니다.`,
  ];
  return lines.join("\n\n");
}

function buildFallbackChapter(body = {}, category = {}, index = 0, minChars = SIBYL_MIN_CHAPTER_CHARS) {
  let text = [
    `${category.title}는 단일 운세 문장이 아니라 행동 시스템 설계 영역입니다.`,
    deterministicExpansionBlock(body, category, index),
    "실행 체크리스트: 오늘 1개, 이번 주 1개, 이번 달 1개의 우선순위를 정해 즉시 실행 가능한 단위로 쪼개세요.",
    "실패 패턴은 의지 부족이 아니라 구조 부재에서 발생합니다. 구조를 먼저 만들면 성과는 뒤따릅니다.",
  ].join("\n\n");

  let safety = 0;
  while (text.length < minChars && safety < 8) {
    text += `\n\n${deterministicExpansionBlock(body, category, safety + 10)}`;
    safety += 1;
  }
  return normalizeLineBreaks(text);
}

function buildFallbackReport(body = {}) {
  const chapters = SIBYL_CATEGORY_PLAN.map((category, index) => ({
    title: category.title,
    content: buildFallbackChapter(body, category, index),
  }));
  const totalChars = chapters.reduce((sum, chapter) => sum + chapter.content.length, 0);
  return {
    source: "fallback",
    reportId: buildSibylFingerprint(body),
    minTotalChars: SIBYL_MIN_TOTAL_CHARS,
    totalChars,
    chapters,
  };
}

function padReportLength(chapters = [], body = {}, minTotalChars = SIBYL_MIN_TOTAL_CHARS) {
  const output = chapters.map((chapter) => ({ ...chapter }));
  let total = output.reduce((sum, chapter) => sum + clean(chapter?.content).length, 0);
  if (!output.length || total >= minTotalChars) return { chapters: output, totalChars: total };

  let cursor = 0;
  let guard = 0;
  while (total < minTotalChars && guard < 80) {
    const idx = cursor % output.length;
    const chapter = output[idx];
    const expansion = deterministicExpansionBlock(body, { title: chapter.title }, guard + idx + 20);
    chapter.content = `${normalizeLineBreaks(chapter.content)}\n\n${expansion}`;
    total = output.reduce((sum, item) => sum + clean(item?.content).length, 0);
    cursor += 1;
    guard += 1;
  }
  return { chapters: output, totalChars: total };
}

function buildReportPrompt(body = {}, category = {}, chapterIndex = 0, chapterCount = SIBYL_CATEGORY_PLAN.length, minChars = SIBYL_MIN_CHAPTER_CHARS) {
  const profile = body?.profile || {};
  const b = profile?.birth || {};
  const pillars = body?.pillars || {};

  return [
    "당신은 SIBYL SYSTEM의 사주 기반 커리어 분석 마스터입니다.",
    "아래 입력을 바탕으로 SIBYL 도미네이터 리포트의 단일 카테고리 챕터를 작성하세요.",
    `현재 챕터: ${chapterIndex + 1}/${chapterCount} — ${category.title}`,
    `챕터 주제: ${category.focus}`,
    `최소 분량: ${minChars}자 이상`,
    "출력 형식 규칙:",
    "- JSON/마크다운 코드블록 금지",
    "- 한국어 본문만 출력",
    "- 소제목을 포함한 구조적 서술로 작성",
    "- 실행 단계, 체크포인트, 실수 방지 규칙을 구체적으로 제시",
    "- 운세 단정 대신 조건-행동-결과 프레임으로 설명",
    "입력 데이터:",
    JSON.stringify({
      profile: {
        gender: clean(body?.gender || profile?.gender || ""),
        birth: {
          year: toNumber(b?.year, null),
          month: toNumber(b?.month, null),
          day: toNumber(b?.day, null),
          hour: toNumber(b?.hour, null),
          minute: toNumber(b?.minute, null),
        },
      },
      pillars,
      dominantEl: clean(body?.dominantEl),
      dominantTenStar: clean(body?.dominantTenStar),
      aptCoeff: toNumber(body?.aptCoeff, 0),
      riskScore: toNumber(body?.riskScore, 0),
      currentYear: toNumber(body?.currentYear, new Date().getFullYear()),
      natal: body?.natal || null,
      category: category,
    }),
  ].join("\n\n");
}

function buildExpansionPrompt(category = {}, content = "", minChars = SIBYL_MIN_CHAPTER_CHARS) {
  const text = normalizeLineBreaks(content);
  return [
    "아래 리포트 초안을 더 깊고 구체적으로 확장하세요.",
    `카테고리: ${category.title}`,
    `목표 분량: 최소 ${minChars}자`,
    "요구 사항:",
    "- 사례형 설명 2개 이상",
    "- 실패 패턴과 수정 루틴을 단계별로 제시",
    "- 다음 7일/30일/90일 실행안을 명확히 제시",
    "- 한국어 본문만 출력",
    "초안:",
    text,
  ].join("\n\n");
}

function isRetriableStatus(status) {
  return status === 408 || status === 429 || (status >= 500 && status <= 599);
}

async function postGemini(endpoint, key, prompt, timeoutMs) {
  const hasAbort = typeof AbortController === "function";
  const controller = hasAbort ? new AbortController() : null;
  const timeoutId = setTimeout(() => {
    if (controller) {
      try { controller.abort(); } catch (_) {}
    }
  }, timeoutMs);

  try {
    const response = await fetch(`${endpoint}?key=${encodeURIComponent(key)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.72,
          topP: 0.92,
          maxOutputTokens: 8192,
        },
      }),
      signal: controller ? controller.signal : undefined,
    });

    const data = await response.json().catch(() => ({}));
    return { response, data };
  } finally {
    clearTimeout(timeoutId);
  }
}

async function callGeminiReport(prompt, options = {}) {
  const keys = pickGeminiKeys();
  const models = pickGeminiModels();
  if (!keys.length || !models.length) {
    return { ok: false, message: "Gemini API 키 또는 모델이 설정되지 않았습니다." };
  }

  const timeoutMs = Math.max(15000, Number(options.timeoutMs || process.env.SIBYL_PROVIDER_TIMEOUT_MS || 65000));
  const maxAttemptsPerPair = Math.max(1, Math.min(3, Number(options.maxAttemptsPerPair || 2)));
  let lastError = "";

  for (const model of models) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

    for (const key of keys) {
      for (let attempt = 1; attempt <= maxAttemptsPerPair; attempt += 1) {
        try {
          const { response, data } = await postGemini(endpoint, key, prompt, timeoutMs);

          if (!response.ok) {
            lastError = clean(data?.error?.message) || `Gemini 요청 실패 (${response.status})`;
            if (attempt < maxAttemptsPerPair && isRetriableStatus(response.status)) continue;
            break;
          }

          const text = extractGeminiText(data);
          if (text) {
            return { ok: true, text, model };
          }

          lastError = "Gemini 응답 본문이 비어 있습니다.";
          if (attempt < maxAttemptsPerPair) continue;
          break;
        } catch (error) {
          lastError = clean(error?.message) || String(error);
          if (attempt < maxAttemptsPerPair) continue;
          break;
        }
      }
    }
  }

  return { ok: false, message: lastError || "Gemini 호출이 모두 실패했습니다." };
}

async function generateCategoryChapter(body = {}, category = {}, chapterIndex = 0) {
  const prompt = buildReportPrompt(body, category, chapterIndex, SIBYL_CATEGORY_PLAN.length, SIBYL_MIN_CHAPTER_CHARS);
  let usedFallback = false;
  let model = "";

  const ai = await callGeminiReport(prompt, {
    timeoutMs: Number(process.env.SIBYL_PROVIDER_TIMEOUT_MS || 70000),
    maxAttemptsPerPair: Number(process.env.SIBYL_PROVIDER_RETRIES || 2),
  });

  let content = "";
  if (ai.ok && clean(ai.text)) {
    const parsed = parseJsonCandidate(ai.text);
    if (parsed?.content && typeof parsed.content === "string") {
      content = normalizeLineBreaks(parsed.content);
    } else {
      content = normalizeLineBreaks(ai.text);
    }
    model = ai.model || "";
  }

  if (content.length < Math.floor(SIBYL_MIN_CHAPTER_CHARS * 0.8)) {
    const fallback = buildFallbackChapter(body, category, chapterIndex);
    content = fallback;
    usedFallback = true;
  }

  if (content.length < SIBYL_MIN_CHAPTER_CHARS) {
    const expand = await callGeminiReport(buildExpansionPrompt(category, content, SIBYL_MIN_CHAPTER_CHARS), {
      timeoutMs: Number(process.env.SIBYL_PROVIDER_TIMEOUT_MS || 70000),
      maxAttemptsPerPair: 1,
    });
    if (expand.ok && clean(expand.text)) {
      const expandedText = normalizeLineBreaks(expand.text);
      if (expandedText.length >= content.length) {
        content = expandedText;
      } else {
        content = `${content}\n\n${expandedText}`;
      }
    }
  }

  if (content.length < SIBYL_MIN_CHAPTER_CHARS) {
    usedFallback = true;
    const safety = buildFallbackChapter(body, category, chapterIndex, SIBYL_MIN_CHAPTER_CHARS);
    content = content.length > safety.length ? content : safety;
  }

  return {
    title: category.title,
    content: normalizeLineBreaks(content),
    model,
    usedFallback,
  };
}

async function buildRichSibylReport(body = {}) {
  const chapters = [];
  const warnings = [];
  const modelCounter = {};

  for (let i = 0; i < SIBYL_CATEGORY_PLAN.length; i += 1) {
    const category = SIBYL_CATEGORY_PLAN[i];
    const chapter = await generateCategoryChapter(body, category, i);
    chapters.push({ title: chapter.title, content: chapter.content });
    if (chapter.usedFallback) warnings.push(`${i + 1}챕터(${category.title}) fallback`);
    if (chapter.model) modelCounter[chapter.model] = (modelCounter[chapter.model] || 0) + 1;
  }

  const padded = padReportLength(chapters, body, SIBYL_MIN_TOTAL_CHARS);
  const model = Object.entries(modelCounter).sort((a, b) => b[1] - a[1])[0]?.[0] || "";

  return {
    source: warnings.length ? "gemini+fallback" : "gemini",
    reportId: buildSibylFingerprint(body),
    minTotalChars: SIBYL_MIN_TOTAL_CHARS,
    totalChars: padded.totalChars,
    categoryCount: SIBYL_CATEGORY_PLAN.length,
    categories: SIBYL_CATEGORY_PLAN.map((item) => item.title),
    chapters: padded.chapters,
    warnings,
    model,
  };
}

router.use(requireAuth);

router.post("/report", async (req, res) => {
  try {
    const body = req.body || {};
    const rich = await buildRichSibylReport(body);
    if (rich.totalChars >= SIBYL_MIN_TOTAL_CHARS) {
      return res.status(200).json(rich);
    }

    const fallback = buildFallbackReport(body);
    return res.status(200).json({
      ...fallback,
      message: "리포트 분량이 기준 미만이어서 fallback 리포트로 대체했습니다.",
    });
  } catch (error) {
    console.error("[sibyl/report]", error);
    return res.status(500).json({ message: "시빌라 리포트 생성 중 오류가 발생했습니다." });
  }
});

module.exports = router;
