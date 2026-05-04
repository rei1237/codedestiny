import { requireAuth } from "../lib/auth.js";
import { callGeminiText } from "../lib/gemini.js";
import { getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";

function clean(value) {
  return String(value || "").trim();
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
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
    } catch {
      // try next
    }
  }

  return null;
}

function buildFallbackReport(body = {}) {
  const dominantEl = clean(body?.dominantEl) || "water";
  const dominantTenStar = clean(body?.dominantTenStar) || "편재";
  const aptCoeff = toNumber(body?.aptCoeff, 420);
  const riskScore = Math.max(5, Math.min(99, toNumber(body?.riskScore, 35)));
  const currentYear = toNumber(body?.currentYear, new Date().getFullYear());

  const chapters = [
    {
      title: "운명 코드 요약",
      content:
        `당신의 현재 코드는 '${dominantTenStar}' 중심으로 작동합니다. `
        + `지배 오행은 ${dominantEl} 계열이며 적성 계수는 ${aptCoeff}입니다. `
        + "이 조합은 단기 성과보다 구조적 성장 설계를 선택할 때 가장 큰 효율을 냅니다.",
    },
    {
      title: "핵심 적성 섹터",
      content:
        "현재 패턴에서 유리한 섹터는 분석·기획·전략·콘텐츠/브랜딩의 교차 지점입니다. "
        + "혼자 오래 고민하기보다 작은 실행 단위를 빠르게 검증하는 방식이 적합합니다.",
    },
    {
      title: "강점 활성화 포인트",
      content:
        "강점은 상황 판단과 맥락 해석 능력입니다. 기록 기반 의사결정을 유지하면 성과 재현성이 높아집니다. "
        + "주 1회 성과 로그를 남기고, 반복되는 성공 조건을 템플릿화하세요.",
    },
    {
      title: "리스크 계수 분석",
      content:
        `현재 리스크 계수는 ${riskScore}로 평가됩니다. `
        + (riskScore >= 70
          ? "고위험 구간에 가까우므로 기존 패턴의 고집은 손실 확률을 높입니다."
          : riskScore >= 45
            ? "중간 위험 구간으로, 의사결정 지연과 과도한 완벽주의를 경계해야 합니다."
            : "저위험 구간으로, 과감한 실행보다 리듬 유지가 더 큰 성과를 만듭니다.")
        + " 결정 전 감정·사실·가정을 분리해 검토하세요.",
    },
    {
      title: "3년 변곡 타임라인",
      content:
        `${currentYear}~${currentYear + 1}에는 기반 재정비, ${currentYear + 2}에는 확장, ${currentYear + 3}에는 선택과 집중이 유효합니다. `
        + "각 연도마다 하나의 핵심 KPI를 고정하면 변동성이 줄어듭니다.",
    },
    {
      title: "인간관계 · 협업 전략",
      content:
        "협업에서는 역할 경계와 기대치를 초기에 명확히 합의하는 것이 중요합니다. "
        + "당신의 추진력은 강점이지만, 속도 차이를 고려한 커뮤니케이션이 필수입니다.",
    },
    {
      title: "커리어 · 재물 실행안",
      content:
        "90일 계획으로 실행하세요: 1~30일 역량 가시화, 31~60일 파일럿 성과 확보, 61~90일 포지셔닝 강화. "
        + "수익·평판·확장성 중 1순위를 고정하면 판단이 쉬워집니다.",
    },
    {
      title: "개운 처방전",
      content:
        "매일 20분 루틴(정리 5분·실행 10분·회고 5분)을 유지하세요. "
        + "집중력 소모가 큰 날은 '완료 기준 축소'로 리듬을 끊지 않는 것이 핵심입니다.",
    },
  ];

  return {
    source: "fallback",
    chapters,
  };
}

function normalizeReportPayload(raw, fallback) {
  const parsed = raw && typeof raw === "object" ? raw : {};
  const input = Array.isArray(parsed.chapters) ? parsed.chapters : [];
  const chapters = input
    .map((item, idx) => {
      const title = clean(item?.title) || `CH.${String(idx + 1).padStart(2, "0")}`;
      const content = clean(item?.content);
      if (!content) return null;
      return { title, content };
    })
    .filter(Boolean)
    .slice(0, 12);

  if (chapters.length) {
    return {
      source: "gemini",
      chapters,
    };
  }

  return fallback;
}

function buildReportPrompt(body = {}) {
  const profile = body?.profile || {};
  const b = profile?.birth || {};
  const pillars = body?.pillars || {};

  return [
    "당신은 SIBYL SYSTEM의 사주 기반 커리어 분석 마스터입니다.",
    "아래 입력을 바탕으로 심층 도미네이터 리포트를 작성하세요.",
    "출력은 반드시 JSON 하나만 반환하세요. 마크다운 금지.",
    "JSON 스키마:",
    '{"chapters":[{"title":"","content":""}]}',
    "규칙:",
    "- 최소 8개 챕터 생성",
    "- 각 챕터는 실질적 행동 지침 포함",
    "- 모호한 표현 대신 실행 가능한 문장 사용",
    "- 한국어로 작성",
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
    }),
  ].join("\n\n");
}

async function buildSibylReport(env, body) {
  const fallback = buildFallbackReport(body);
  const prompt = buildReportPrompt(body);

  const ai = await callGeminiText(env, prompt, {
    modelEnvKeys: ["SIBYL_GEMINI_MODEL"],
    temperature: 0.72,
    topP: 0.92,
    maxOutputTokens: 8192,
    timeoutMs: Number(env.SIBYL_PROVIDER_TIMEOUT_MS || 65000),
    maxAttemptsPerPair: 2,
  });

  if (!ai.ok) {
    return {
      ...fallback,
      message: ai.message || "Gemini 응답 실패로 기본 리포트를 반환했습니다.",
    };
  }

  const parsed = parseJsonCandidate(ai.text);
  const normalized = normalizeReportPayload(parsed, fallback);

  return {
    ...normalized,
    model: ai.model || "",
  };
}

export async function handleSibylRoutes(request, env = {}) {
  try {
    const method = request.method.toUpperCase();
    if (method !== "POST") {
      if (["GET", "POST"].includes(method)) return notFound();
      return methodNotAllowed();
    }

    const path = getRoutePath(request, "/api/sibyl");
    if (path !== "/report") return notFound();

    await requireAuth(request, env);
    const body = await readJson(request);
    const report = await buildSibylReport(env, body);
    return json(report);
  } catch (error) {
    return handleRouteError(error);
  }
}
