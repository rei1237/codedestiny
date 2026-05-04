import { getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { callGeminiText } from "../lib/gemini.js";

function clean(value) {
  return String(value || "").trim();
}

function parseDurationFromPrompt(text) {
  const source = clean(text);
  if (!source) return 30;
  if (source.includes("60분")) return 60;
  const match = source.match(/(\d{2,3})\s*분/);
  const value = match ? Number(match[1]) : 30;
  if (!Number.isFinite(value)) return 30;
  return Math.max(15, Math.min(120, value));
}

function fallbackCourse(userPrompt) {
  const duration = parseDurationFromPrompt(userPrompt);
  const isLong = duration >= 60;

  return {
    course_metadata: {
      title: isLong ? "Shiva's Transformation Flow" : "Ganesha's Awakening Flow",
      deity_theme: isLong ? "시바의 변환 에너지" : "가네샤의 장애물 제거 에너지",
      duration_min: duration,
      intensity: isLong ? "Intermediate" : "Beginner",
      focus_area: isLong ? "전신 유연성, 코어 안정, 호흡 리듬" : "긴장 완화, 하체 순환, 호흡 정렬",
      chakra_focus: isLong ? "Anahata + Manipura" : "Muladhara + Svadhisthana",
    },
    sequence: [
      {
        step_number: 1,
        type: "Warmup",
        sanskrit_name: "Sukshma Vyayama",
        english_name: "Joint Awakening (관절 깨우기)",
        duration_seconds: isLong ? 420 : 300,
        instructions: [
          "발목, 무릎, 고관절을 원으로 풀며 호흡을 안정화합니다.",
          "어깨를 크게 돌리고, 목 옆면 긴장을 천천히 내려놓습니다.",
          "들이숨에 척추를 길게, 날숨에 어깨 힘을 완전히 놓습니다.",
        ],
        breathing_guide: "들이숨 4박, 날숨 6박으로 10회 반복",
        benefits_physical: "관절 가동성 향상, 근육 긴장 완화, 순환 촉진",
        benefits_spiritual: "몸의 문을 열어 수련의 집중 상태로 진입",
        caution: "통증 범위를 넘기지 말고 가동 범위를 서서히 넓히세요.",
        visual_cue_ui: "새벽빛이 관절을 따라 흐르며 몸이 따뜻해지는 느낌",
      },
      {
        step_number: 2,
        type: "Asana",
        sanskrit_name: "Surya Namaskara",
        english_name: "Sun Salutation (태양 경배 자세)",
        duration_seconds: isLong ? 780 : 540,
        instructions: [
          "동작 전환은 급하지 않게, 호흡이 동작을 이끕니다.",
          "척추 길이를 유지하며 전굴/후굴 시 목에 과신전이 없게 합니다.",
          "무릎이 불편하면 런지에서 뒷무릎을 바닥에 내려 수정합니다.",
        ],
        breathing_guide: "들숨에 확장, 날숨에 접힘. 6~10라운드",
        benefits_physical: "전신 순환 강화, 체온 상승, 유연성 개선",
        benefits_spiritual: "태양의 리듬과 내면 의지를 연결",
        caution: "허리 통증이 있다면 후굴 깊이를 줄이고 코어를 먼저 고정하세요.",
        visual_cue_ui: "황금빛 호흡이 척추를 따라 상승",
      },
      {
        step_number: 3,
        type: "Asana",
        sanskrit_name: "Virabhadrasana II",
        english_name: "Warrior II (전사 자세 II)",
        duration_seconds: isLong ? 600 : 420,
        instructions: [
          "앞무릎은 발끝 방향과 일치시키고 안쪽 붕괴를 막습니다.",
          "골반을 과하게 정면 고정하지 말고 자연스러운 개방을 유지합니다.",
          "양팔을 길게 뻗되 어깨를 끌어올리지 않습니다.",
        ],
        breathing_guide: "한쪽 5~8호흡 유지 후 반대편 반복",
        benefits_physical: "하체 안정성, 고관절 개방, 코어 활성화",
        benefits_spiritual: "내면의 결단력과 균형 감각 강화",
        caution: "무릎 통증 시 보폭을 줄이고 무게중심을 중앙에 둡니다.",
        visual_cue_ui: "가슴 중앙에서 빛이 확장되며 자세가 안정됨",
      },
      {
        step_number: 4,
        type: "Pranayama",
        sanskrit_name: "Nadi Shodhana",
        english_name: "Alternate Nostril Breathing (교대 비강 호흡)",
        duration_seconds: isLong ? 420 : 300,
        instructions: [
          "편안한 좌위에서 척추를 세우고 턱을 살짝 당깁니다.",
          "오른손으로 비강을 교차 조절하며 좌우 호흡을 동일하게 맞춥니다.",
          "호흡이 거칠어지면 즉시 템포를 늦추고 길이를 줄입니다.",
        ],
        breathing_guide: "좌들숨 4 - 정지 2 - 우날숨 4 - 우들숨 4 - 정지 2 - 좌날숨 4",
        benefits_physical: "자율신경 균형, 심박 안정, 과호흡 완화",
        benefits_spiritual: "이중성의 통합, 마음의 파동 정돈",
        caution: "어지러우면 정지를 생략하고 자연 호흡으로 전환하세요.",
        visual_cue_ui: "좌우 에너지 채널이 교차하며 균형을 회복",
      },
      {
        step_number: 5,
        type: "Meditation",
        sanskrit_name: "Ajna Dhyana",
        english_name: "Third-Eye Meditation (아즈나 명상)",
        duration_seconds: isLong ? 600 : 420,
        instructions: [
          "미간에 시선을 두되 눈 주위 힘은 완전히 이완합니다.",
          "생각을 없애려 하지 말고 떠오르는 흐름을 관찰합니다.",
          "한 문장 만트라를 들숨/날숨에 맞춰 내면으로 반복합니다.",
        ],
        breathing_guide: "들이숨 5박, 날숨 7박. 자연스러운 리듬 유지",
        benefits_physical: "긴장성 두통 완화, 집중력 회복, 수면 전환 도움",
        benefits_spiritual: "직관 강화, 내면 관찰력 심화",
        caution: "집중이 과도해 미간에 힘이 들어가면 시선을 부드럽게 풀어주세요.",
        visual_cue_ui: "남청색 점광이 미간에서 맥동",
      },
      {
        step_number: 6,
        type: "Relaxation",
        sanskrit_name: "Savasana",
        english_name: "Corpse Pose (사바사나)",
        duration_seconds: isLong ? 780 : 540,
        instructions: [
          "등 전체를 바닥에 맡기고 턱/어깨/복부 힘을 순서대로 풉니다.",
          "발끝부터 정수리까지 신체 스캔을 진행합니다.",
          "마지막 3호흡에서 오늘 수련의 감각을 저장합니다.",
        ],
        breathing_guide: "자연 호흡. 날숨마다 체중이 바닥으로 녹아내림",
        benefits_physical: "심신 회복, 근긴장 완전 이완, 피로 회복",
        benefits_spiritual: "수련 에너지 통합, 고요한 안정감 정착",
        caution: "허리가 불편하면 무릎 아래에 쿠션을 두세요.",
        visual_cue_ui: "잔잔한 금빛 파동이 전신을 덮는 장면",
      },
    ],
    closing_mantra: "ॐ शान्तिः शान्तिः शान्तिः · 옴 샨티 샨티 샨티 (평화가 몸과 마음과 세계에 깃들기를)",
  };
}

function parseJsonCandidate(text) {
  const source = clean(text);
  if (!source) return null;

  const candidates = [source];
  const fenced = source.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced && fenced[1]) candidates.push(clean(fenced[1]));

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
      // try next candidate
    }
  }

  return null;
}

function normalizeSequenceItem(item, index) {
  const safe = item && typeof item === "object" ? item : {};
  const type = ["Warmup", "Asana", "Pranayama", "Meditation", "Relaxation"].includes(clean(safe.type))
    ? clean(safe.type)
    : "Asana";

  return {
    step_number: Number.isFinite(Number(safe.step_number)) ? Number(safe.step_number) : (index + 1),
    type,
    sanskrit_name: clean(safe.sanskrit_name) || "Asana",
    english_name: clean(safe.english_name) || "Guided Step (가이드 동작)",
    duration_seconds: Math.max(30, Number(safe.duration_seconds) || 120),
    instructions: Array.isArray(safe.instructions)
      ? safe.instructions.map((x) => clean(x)).filter(Boolean).slice(0, 8)
      : [],
    breathing_guide: clean(safe.breathing_guide) || "들이숨 4박, 날숨 6박으로 호흡을 고르게 유지하세요.",
    benefits_physical: clean(safe.benefits_physical) || "긴장 완화와 순환 개선에 도움이 됩니다.",
    benefits_spiritual: clean(safe.benefits_spiritual) || "호흡과 주의 집중을 통해 내면 안정감을 회복합니다.",
    caution: clean(safe.caution) || "통증이 느껴지면 즉시 강도를 낮추고 호흡을 안정시키세요.",
    visual_cue_ui: clean(safe.visual_cue_ui) || "부드러운 빛이 몸의 중심을 따라 흐르는 장면",
  };
}

function normalizeCoursePayload(candidate, userPrompt) {
  const fallback = fallbackCourse(userPrompt);
  const parsed = candidate && typeof candidate === "object" ? candidate : {};
  const meta = parsed.course_metadata && typeof parsed.course_metadata === "object"
    ? parsed.course_metadata
    : {};

  const sequenceInput = Array.isArray(parsed.sequence) ? parsed.sequence : [];
  const sequence = (sequenceInput.length ? sequenceInput : fallback.sequence)
    .map((item, index) => normalizeSequenceItem(item, index))
    .slice(0, 16);

  const duration = Number.isFinite(Number(meta.duration_min))
    ? Number(meta.duration_min)
    : parseDurationFromPrompt(userPrompt);

  return {
    course_metadata: {
      title: clean(meta.title) || fallback.course_metadata.title,
      deity_theme: clean(meta.deity_theme) || fallback.course_metadata.deity_theme,
      duration_min: Math.max(15, Math.min(120, duration || 30)),
      intensity: ["Beginner", "Intermediate", "Advanced"].includes(clean(meta.intensity))
        ? clean(meta.intensity)
        : fallback.course_metadata.intensity,
      focus_area: clean(meta.focus_area) || fallback.course_metadata.focus_area,
      chakra_focus: clean(meta.chakra_focus) || fallback.course_metadata.chakra_focus,
    },
    sequence,
    closing_mantra: clean(parsed.closing_mantra) || fallback.closing_mantra,
  };
}

async function handleGenerateYogaCourse(request, env) {
  const body = await readJson(request);
  const systemPrompt = clean(body?.systemPrompt);
  const userPrompt = clean(body?.userPrompt);

  if (!systemPrompt || !userPrompt) {
    return json({ ok: false, message: "systemPrompt와 userPrompt가 필요합니다." }, { status: 400 });
  }

  const prompt = [
    systemPrompt,
    "",
    "[사용자 입력]",
    userPrompt,
    "",
    "출력은 반드시 JSON 객체 하나만 반환하세요.",
  ].join("\n");

  const ai = await callGeminiText(env, prompt, {
    modelEnvKeys: ["YOGA_GURU_GEMINI_MODEL"],
    temperature: 0.72,
    topP: 0.92,
    maxOutputTokens: 8192,
    timeoutMs: Number(env.YOGA_GURU_PROVIDER_TIMEOUT_MS || 55000),
    maxAttemptsPerPair: 2,
  });

  const parsed = ai.ok ? parseJsonCandidate(ai.text) : null;
  const normalized = normalizeCoursePayload(parsed, userPrompt);

  return json({
    ok: true,
    source: parsed ? "gemini" : "fallback",
    model: ai.ok ? ai.model : null,
    message: ai.ok ? "ok" : (ai.message || "Gemini unavailable. Fallback course generated."),
    ...normalized,
  });
}

export async function handleYogaGuruRoutes(request, env = {}) {
  try {
    const method = request.method.toUpperCase();
    if (method !== "POST") {
      if (["GET", "POST"].includes(method)) return notFound();
      return methodNotAllowed();
    }

    const path = getRoutePath(request, "/api/yoga-guru");
    if (path !== "/") return notFound();

    return await handleGenerateYogaCourse(request, env);
  } catch (error) {
    return handleRouteError(error);
  }
}
