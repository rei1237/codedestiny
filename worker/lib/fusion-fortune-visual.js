/**
 * 초융합 시각화 데이터 정규화.
 *
 * 레이더(체계별 신호 강도)·12개월 타이밍 라인·교차 검증 게이지는 모두 이 모듈이 만든 값을
 * 그린다. LLM 이 채워 주면 그 값을 쓰고, 빠지거나 형식이 깨지면 서버 컨텍스트에서 결정론적으로
 * 메운다.
 *
 * 🔴 시각화는 파생 데이터지 유료 본문이 아니다. 여기서 반려를 만들면 본문이 멀쩡한데도
 * 결과 전체가 폴백으로 떨어져, 3만원을 낸 사용자가 결정론 텍스트를 받는다. 그래서
 * normalize 는 **항상 유효한 값을 돌려준다**(실패 경로가 없다).
 */

export const FUSION_VISUAL_SYSTEMS = Object.freeze([
  Object.freeze({ key: "saju", label: "사주" }),
  Object.freeze({ key: "ziwei", label: "자미두수" }),
  Object.freeze({ key: "vedic", label: "베다점" }),
  Object.freeze({ key: "sukuyo", label: "숙요점" }),
  Object.freeze({ key: "astrology", label: "점성술" }),
  Object.freeze({ key: "tarot", label: "타로" }),
]);

export const FUSION_TIMELINE_MONTHS = 12;

/** 근거 밀도가 낮아도 레이더가 원점으로 찌그러지지 않도록 하한을 둔다. */
const SCORE_MIN = 42;
const SCORE_MAX = 94;

function clean(value, max = 160) {
  return String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, max);
}

function clampScore(value, fallback) {
  const number = Math.round(Number(value));
  if (!Number.isFinite(number)) return fallback;
  return Math.min(SCORE_MAX, Math.max(SCORE_MIN, number));
}

/**
 * 월별 강도는 레이더보다 넓게 둔다. 레이더의 하한(42)은 도형이 원점으로 찌그러지지 않게
 * 하려는 것이지만, 선 그래프에서는 낮은 달이 낮게 보이는 것 자체가 정보다.
 */
function clampIntensity(value, fallback) {
  const number = Math.round(Number(value));
  if (!Number.isFinite(number)) return fallback;
  return Math.min(95, Math.max(15, number));
}

/**
 * 컨텍스트가 그 체계에 대해 실제로 확정한 근거의 양.
 * "이 사람의 점수"가 아니라 "이 체계가 이번 질문에 얼마나 말할 거리가 있는가"다.
 */
function evidenceWeight(system) {
  if (!system || typeof system !== "object") return 0;
  let weight = 0;
  for (const value of Object.values(system)) {
    if (Array.isArray(value)) weight += Math.min(4, value.length);
    else if (typeof value === "string" && value.trim().length >= 2) weight += 1;
    else if (value !== null && value !== undefined && value !== "") weight += 1;
  }
  return weight;
}

/**
 * 🔴 절대 비율(채워진 필드 / 전체 필드)로 매기면 대부분의 실제 컨텍스트에서 여섯 체계가
 * 모두 상한에 붙어 레이더가 꽉 찬 육각형이 된다 — 아무것도 말하지 않는 그림이다.
 * 그래서 여섯 체계 **사이의 상대 순위**로 편다. 라벨이 "신호 강도"인 것과도 맞는다.
 */
function fallbackScores(context = {}) {
  const weights = FUSION_VISUAL_SYSTEMS.map((system) => evidenceWeight(context?.systems?.[system.key]));
  const lowest = Math.min(...weights);
  const highest = Math.max(...weights);
  const span = highest - lowest;
  return FUSION_VISUAL_SYSTEMS.map((system, index) => ({
    key: system.key,
    label: system.label,
    // 전부 같으면 가운데로 모은다(우열이 없다는 뜻이지, 전부 만점이라는 뜻이 아니다).
    score: span === 0 ? 72 : clampScore(SCORE_MIN + Math.round(((weights[index] - lowest) / span) * (SCORE_MAX - SCORE_MIN)), SCORE_MIN),
    note: "",
  }));
}

export function normalizeFusionSystemScores(raw, context = {}) {
  const defaults = fallbackScores(context);
  const provided = new Map();
  const list = Array.isArray(raw) ? raw : Object.entries(raw || {}).map(([key, value]) => (
    value && typeof value === "object" ? { key, ...value } : { key, score: value }
  ));
  for (const item of list) {
    const key = clean(item?.key, 20);
    if (!FUSION_VISUAL_SYSTEMS.some((system) => system.key === key)) continue;
    provided.set(key, item);
  }
  return defaults.map((entry) => {
    const item = provided.get(entry.key);
    return {
      key: entry.key,
      label: entry.label,
      score: clampScore(item?.score, entry.score),
      note: clean(item?.note, 40),
    };
  });
}

/** 12개월 라벨은 생성 시점의 이번 달부터 센다. 연도가 넘어가도 "1월"로 이어진다. */
function monthLabels(now = new Date()) {
  const base = new Date(now.getTime());
  return Array.from({ length: FUSION_TIMELINE_MONTHS }, (_, index) => {
    const month = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + index, 1));
    return { label: `${month.getUTCMonth() + 1}월`, offset: index };
  });
}

/**
 * 폴백 강도·지침은 난수가 아니라 1년을 한 바퀴 도는 "정리 → 준비 → 시험 → 확장 → 회수" 리듬이다.
 * 🔴 3개월 주기를 돌려 쓰면 12칸 중 같은 문장이 네 번 나온다 — 30,000원짜리 결과에서 곧바로
 * 눈에 띈다. 열두 달에 각각 다른 지침과 강도를 준다.
 */
const FALLBACK_MONTHS = Object.freeze([
  Object.freeze({ intensity: 54, note: "벌여 둔 일 가운데 하나를 끝내고, 지금의 기준을 한 문장으로 적어 두세요." }),
  Object.freeze({ intensity: 62, note: "다음 석 달에 쓸 시간과 돈의 상한을 미리 정해 두면 판단이 쉬워집니다." }),
  Object.freeze({ intensity: 74, note: "준비한 것을 되돌릴 수 있는 크기로 한 번 시험하고 반응을 기록하세요." }),
  Object.freeze({ intensity: 81, note: "반응이 좋았던 쪽에 힘을 더 싣고, 나머지는 잠시 멈춰 두어도 됩니다." }),
  Object.freeze({ intensity: 68, note: "속도가 붙을수록 관계에서 지킬 경계를 먼저 말해 두는 편이 안전합니다." }),
  Object.freeze({ intensity: 57, note: "성과를 평가하기보다 새는 시간과 주의를 찾아 한 가지만 막아 보세요." }),
  Object.freeze({ intensity: 63, note: "쉬는 방식을 점검할 때입니다. 회복이 되는 활동과 아닌 것을 나눠 보세요." }),
  Object.freeze({ intensity: 77, note: "미뤄 둔 대화를 꺼내기 좋습니다. 결론보다 사실 확인부터 시작하세요." }),
  Object.freeze({ intensity: 85, note: "올해 배운 것을 다시 쓸 수 있는 형태로 남겨 두면 다음 선택이 빨라집니다." }),
  Object.freeze({ intensity: 71, note: "새로 벌이기보다 이미 시작한 일의 마감을 확보하는 데 씁니다." }),
  Object.freeze({ intensity: 60, note: "숫자와 일정으로 한 해를 정리하고, 다음 해에 줄일 것을 한 가지 고르세요." }),
  Object.freeze({ intensity: 66, note: "기준을 다시 세우는 달입니다. 지난 열한 달의 기록을 근거로 삼으세요." }),
]);

export function normalizeFusionMonthlyTimeline(raw, { now = new Date() } = {}) {
  const labels = monthLabels(now);
  const list = Array.isArray(raw) ? raw : [];
  return labels.map((month, index) => {
    const item = list[index] && typeof list[index] === "object" ? list[index] : {};
    const fallback = FALLBACK_MONTHS[index % FALLBACK_MONTHS.length];
    return {
      label: clean(item.label, 12) || month.label,
      intensity: clampIntensity(item.intensity, fallback.intensity),
      note: clean(item.note, 90) || fallback.note,
    };
  });
}

function normalizeCrossCheckList(raw, { maxItems, fallback }) {
  const list = (Array.isArray(raw) ? raw : [])
    .map((item) => ({
      theme: clean(item?.theme, 60),
      systems: (Array.isArray(item?.systems) ? item.systems : [])
        .map((value) => clean(value, 20))
        .filter((value) => FUSION_VISUAL_SYSTEMS.some((system) => system.key === value || system.label === value))
        .map((value) => FUSION_VISUAL_SYSTEMS.find((system) => system.key === value || system.label === value).key)
        .filter((value, index, all) => all.indexOf(value) === index)
        .slice(0, 6),
      meaning: clean(item?.meaning || item?.choice, 200),
    }))
    .filter((item) => item.theme && item.meaning && item.systems.length >= 2)
    .slice(0, maxItems);
  return list.length ? list : fallback;
}

function fallbackCrossChecks(context = {}) {
  const insight = context?.integratedInsight || {};
  const theme = clean(insight.currentTheme, 60) || "지금의 선택 기준";
  const advice = clean(insight.adviceDirection, 200) || "여러 체계가 같은 방향을 가리킬 때는 그 조언을 우선순위로 삼습니다.";
  const caution = clean(insight.cautionPattern, 200) || "체계마다 다르게 말하는 부분은 모순이 아니라 상황에 따라 갈리는 선택지로 남깁니다.";
  return {
    aligned: [{ theme, systems: ["saju", "ziwei"], meaning: advice }],
    divergent: [{ theme: `${theme}의 갈림길`, systems: ["astrology", "sukuyo"], meaning: caution }],
  };
}

export function normalizeFusionCrossChecks(raw, context = {}) {
  const fallback = fallbackCrossChecks(context);
  return {
    aligned: normalizeCrossCheckList(raw?.aligned, { maxItems: 4, fallback: fallback.aligned }),
    divergent: normalizeCrossCheckList(raw?.divergent, { maxItems: 3, fallback: fallback.divergent }),
  };
}

/**
 * 결과에 붙일 시각화 블록. 어떤 입력이 와도 그릴 수 있는 값을 돌려준다.
 * @returns {{ systemScores: Array, monthlyTimeline: Array, crossChecks: { aligned: Array, divergent: Array } }}
 */
export function normalizeFusionVisualization(raw, context = {}, { now = new Date() } = {}) {
  return {
    systemScores: normalizeFusionSystemScores(raw?.systemScores, context),
    monthlyTimeline: normalizeFusionMonthlyTimeline(raw?.monthlyTimeline, { now }),
    crossChecks: normalizeFusionCrossChecks(raw?.crossChecks, context),
  };
}


/** 최종 판정의 체계별 입장. 근거 없이 전부 agree 로 몰리는 것을 막기 위해 값으로 고정한다. */
const VERDICT_STANCES = Object.freeze(["agree", "conditional", "caution"]);

/**
 * 최종 교차 판정 블록 정규화.
 *
 * 🔴 이건 파생 데이터가 아니라 본문이다. 그래서 비어 있으면 조용히 지어내지 않고
 *    ok:false 를 돌려 그룹 재생성을 유도한다. 다만 체계 목록과 stance 값처럼 **형식**은
 *    여기서 강제해, 여섯 체계가 빠지거나 엉뚱한 stance 가 들어오는 것을 막는다.
 */
export function normalizeFusionFinalVerdict(raw) {
  if (!raw || typeof raw !== "object") return { ok: false, reason: "missing" };
  const headline = clean(raw.headline, 90);
  const rationale = clean(raw.rationale, 4000);
  if (!headline) return { ok: false, reason: "missing_headline" };
  if (!rationale) return { ok: false, reason: "missing_rationale" };

  const provided = new Map();
  for (const item of Array.isArray(raw.systemVerdicts) ? raw.systemVerdicts : []) {
    const key = clean(item?.key, 20);
    if (FUSION_VISUAL_SYSTEMS.some((system) => system.key === key)) provided.set(key, item);
  }
  if (provided.size !== FUSION_VISUAL_SYSTEMS.length) return { ok: false, reason: "incomplete_system_verdicts" };

  const systemVerdicts = FUSION_VISUAL_SYSTEMS.map((system) => {
    const item = provided.get(system.key);
    const stance = clean(item?.stance, 16);
    return {
      key: system.key,
      label: system.label,
      stance: VERDICT_STANCES.includes(stance) ? stance : "conditional",
      note: clean(item?.note, 120),
    };
  });
  if (systemVerdicts.some((item) => !item.note)) return { ok: false, reason: "missing_verdict_note" };

  const doNow = (Array.isArray(raw.doNow) ? raw.doNow : []).map((item) => clean(item, 120)).filter(Boolean).slice(0, 5);
  const avoid = (Array.isArray(raw.avoid) ? raw.avoid : []).map((item) => clean(item, 120)).filter(Boolean).slice(0, 4);
  if (doNow.length < 3 || avoid.length < 2) return { ok: false, reason: "missing_actions" };

  // confidence 는 모델이 준 값보다 stance 분포가 더 정직하다. 둘을 맞춰 준다.
  const agreed = systemVerdicts.filter((item) => item.stance === "agree").length;
  const conditional = systemVerdicts.filter((item) => item.stance === "conditional").length;
  const derived = Math.round(((agreed + conditional * 0.5) / systemVerdicts.length) * 100);
  const claimed = Math.round(Number(raw.confidence));
  const confidence = Number.isFinite(claimed) && Math.abs(claimed - derived) <= 20
    ? Math.min(100, Math.max(0, claimed))
    : derived;

  return { ok: true, value: { headline, confidence, systemVerdicts, rationale, doNow, avoid } };
}

/** 검증용 — normalize 를 통과한 모양인지 확인한다. */
export function isFusionFinalVerdictShaped(value) {
  return normalizeFusionFinalVerdict(value).ok;
}

/** 검증용 — normalize 를 통과한 블록인지 확인한다. */
export function isFusionVisualizationShaped(value) {
  if (!value || typeof value !== "object") return false;
  if (!Array.isArray(value.systemScores) || value.systemScores.length !== FUSION_VISUAL_SYSTEMS.length) return false;
  if (value.systemScores.some((item) => !FUSION_VISUAL_SYSTEMS.some((system) => system.key === item?.key) || !Number.isFinite(Number(item?.score)))) return false;
  if (!Array.isArray(value.monthlyTimeline) || value.monthlyTimeline.length !== FUSION_TIMELINE_MONTHS) return false;
  if (value.monthlyTimeline.some((item) => !clean(item?.label, 12) || !Number.isFinite(Number(item?.intensity)) || !clean(item?.note, 90))) return false;
  const { aligned, divergent } = value.crossChecks || {};
  if (!Array.isArray(aligned) || !aligned.length || !Array.isArray(divergent) || !divergent.length) return false;
  return true;
}
