/**
 * 무료 운세·타로가 함께 쓰는 단계형 플로우 컨트롤러(순수 상태기).
 *
 * 정본 명세: docs/context/guided-step-flow-spec.md (2026-11-20 승인, §6 추천 열이 확정값).
 * React·DOM 에 의존하지 않는다. 타이머는 scheduler 로 주입받아 node --test 에서 결정적으로 돌린다.
 * history·URL·저장소 연결은 app/components/guided-flow/useGuidedFlow.ts 가 아래 순수 도우미로 한다.
 *
 * 단계 정의: { id, kind, history?, transient?, restoreTo?, autoAdvance?, awaitWork? }
 * - kind: "choice"(단일 선택, 자동 진행) | "input"(자유 입력·다중 선택, CTA 로만 진행) | "wait"(계산 대기) | "result"
 * - history: "push"(기본) | "replace" | "none". 계산 대기처럼 URL 에 남기지 않을 단계는 "none".
 * - transient: 뒤로가기·새로고침에서 건너뛰는 일시 단계(셔플·계산 대기). restoreTo 로 복원 위치를 정한다.
 * - awaitWork: true 면 host 가 workDone() 을 부를 때까지 대기 단계를 끝내지 않는다. 기본은 결정적 계산(즉시 완료).
 */

/** 명세 §2-1 확정값. D1 450ms 자동 진행, 최소 대기 1.2s, D5 느린 대기 문턱 3s. */
export const GUIDED_FLOW_TIMING = Object.freeze({ autoAdvanceMs: 450, minWaitMs: 1200, slowWaitMs: 3000 });

/** 랜딩(기본 URL). 진행 표시·guided_step_view 대상이 아니다(명세 §5-2: 랜딩 → 시작은 free_feature_start). */
export const LANDING = -1;

export const GUIDED_SNAPSHOT_VERSION = 1;

const KINDS = new Set(["choice", "input", "wait", "result"]);
const HISTORY_MODES = new Set(["push", "replace", "none"]);
const ID_PATTERN = /^[a-z][a-z0-9_-]{0,31}$/;

const defaultScheduler = {
  set: (fn, ms) => setTimeout(fn, ms),
  clear: (handle) => clearTimeout(handle),
};

export function validateSteps(steps) {
  if (!Array.isArray(steps) || steps.length === 0) throw new Error("guided-flow: steps 가 비었다");
  const ids = new Set();
  for (const step of steps) {
    if (!step || !ID_PATTERN.test(String(step.id))) throw new Error(`guided-flow: 잘못된 단계 id ${step && step.id}`);
    if (ids.has(step.id)) throw new Error(`guided-flow: 중복 단계 id ${step.id}`);
    ids.add(step.id);
    if (!KINDS.has(step.kind)) throw new Error(`guided-flow: 알 수 없는 kind ${step.kind}`);
    if (step.history && !HISTORY_MODES.has(step.history)) throw new Error(`guided-flow: 알 수 없는 history ${step.history}`);
  }
  for (const step of steps) {
    if (step.restoreTo && !ids.has(step.restoreTo)) throw new Error(`guided-flow: restoreTo ${step.restoreTo} 가 없다`);
  }
  return steps;
}

/** 진행을 막는 답이 필요한 단계인가. 선택·입력 단계는 기본으로 답이 있어야 다음으로 간다. */
export function stepNeedsAnswer(step) {
  return (step.kind === "choice" || step.kind === "input") && step.required !== false;
}

function hasAnswer(value) {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

/** 진행 카운터에 세는 단계. 결과는 세지 않는다(완주 화면). */
export function progressSteps(steps) {
  return steps.filter((step) => step.kind !== "result");
}

/**
 * 새로고침·popstate 때 갈 단계를 정한다.
 * - URL 단계가 없거나 모르는 값이면 랜딩.
 * - 일시 단계는 restoreTo(없으면 바로 앞의 일시가 아닌 단계)로 바꾼다. 셔플·대기를 다시 하지 않는다.
 * - 앞 단계 답이 없으면 답이 빠진 첫 단계로 돌린다(공유받은 ?step=result 링크가 빈 결과를 그리지 않게).
 */
export function resolveRestoreIndex(steps, stepId, answers = {}) {
  if (!stepId) return LANDING;
  let index = steps.findIndex((step) => step.id === stepId);
  if (index < 0) return LANDING;
  if (steps[index].transient) {
    const target = steps[index].restoreTo;
    if (target) index = steps.findIndex((step) => step.id === target);
    else {
      while (index > 0 && steps[index].transient) index -= 1;
    }
  }
  for (let i = 0; i < index; i += 1) {
    if (stepNeedsAnswer(steps[i]) && !hasAnswer(answers[steps[i].id])) return i;
  }
  return index;
}

/**
 * @param {object} options
 * @param {Array} options.steps
 * @param {{autoAdvanceMs:number,minWaitMs:number,slowWaitMs:number}} [options.timing]
 * @param {{set:(fn:()=>void,ms:number)=>unknown,clear:(handle:unknown)=>void}} [options.scheduler]
 * @param {boolean} [options.reducedMotion]
 */
export function createStepController({ steps, timing = GUIDED_FLOW_TIMING, scheduler = defaultScheduler, reducedMotion = false } = {}) {
  validateSteps(steps);
  const listeners = new Set();
  const handlers = new Set();
  const timers = { auto: null, min: null, slow: null };

  let state = {
    index: LANDING,
    answers: {},
    direction: "forward",
    pendingAuto: false,
    /** @type {{ stepId: string, minDone: boolean, workDone: boolean, slow: boolean } | null} */
    waiting: null,
    reducedMotion: Boolean(reducedMotion),
    completed: false,
    /** 마지막 전환의 원인. host 가 history push/replace 를 고를 때 본다. */
    source: "init",
  };

  const notify = () => { for (const fn of listeners) fn(state); };
  const emit = (type, detail) => { for (const fn of handlers) fn({ type, ...detail }); };
  const commit = (patch) => { state = { ...state, ...patch }; notify(); };

  function clearTimer(name) {
    if (timers[name] !== null) {
      scheduler.clear(timers[name]);
      timers[name] = null;
    }
  }
  function clearAll() { clearTimer("auto"); clearTimer("min"); clearTimer("slow"); }

  function current() { return state.index >= 0 ? steps[state.index] : null; }

  function enter(index, { direction, advance = "cta", source = "user" }) {
    clearAll();
    const from = state.index;
    if (from >= 0 && direction === "forward" && source !== "history" && source !== "restore") {
      emit("stepComplete", { step: steps[from], index: from, advance });
    }
    commit({ index, direction, pendingAuto: false, waiting: null, source });
    if (index < 0) return;
    const step = steps[index];
    emit("stepView", { step, index, restored: source === "restore", source });
    if (step.kind === "wait") startWait(step);
    if (step.kind === "result" && !state.completed) {
      commit({ completed: true });
      emit("flowComplete", { step, index, restored: source === "restore" });
    }
  }

  function startWait(step) {
    const minMs = state.reducedMotion ? 0 : timing.minWaitMs;
    const waiting = { stepId: step.id, minDone: minMs === 0, workDone: !step.awaitWork, slow: false };
    commit({ waiting });
    if (!waiting.minDone) {
      timers.min = scheduler.set(() => {
        timers.min = null;
        if (state.waiting && state.waiting.stepId === step.id) settleWait({ minDone: true }, "auto");
      }, minMs);
    }
    timers.slow = scheduler.set(() => {
      timers.slow = null;
      if (state.waiting && state.waiting.stepId === step.id) commit({ waiting: { ...state.waiting, slow: true } });
    }, timing.slowWaitMs);
    if (waiting.minDone && waiting.workDone) settleWait({}, "auto");
  }

  function settleWait(patch, advance) {
    const waiting = { ...state.waiting, ...patch };
    if (waiting.minDone && waiting.workDone) {
      clearTimer("slow");
      clearTimer("min");
      const nextIndex = state.index + 1;
      if (nextIndex < steps.length) enter(nextIndex, { direction: "forward", advance, source: "auto" });
      else commit({ waiting: null });
      return;
    }
    commit({ waiting });
  }

  function canAdvance() {
    const step = current();
    if (!step) return true;
    if (step.kind === "wait" || step.kind === "result") return false;
    return !stepNeedsAnswer(step) || hasAnswer(state.answers[step.id]);
  }

  const api = {
    getState: () => state,
    steps,
    subscribe(fn) { listeners.add(fn); return () => { listeners.delete(fn); }; },
    on(fn) { handlers.add(fn); return () => { handlers.delete(fn); }; },
    canAdvance,

    /** 다음 단계. 답이 없으면 false. advance: "cta" | "auto" | "skip". */
    next(advance = "cta") {
      if (!canAdvance()) return false;
      const nextIndex = state.index + 1;
      if (nextIndex >= steps.length) return false;
      enter(nextIndex, { direction: "forward", advance, source: advance === "auto" ? "auto" : "user" });
      return true;
    },

    /** 이전 단계. 일시 단계는 건너뛴다(명세 §2-3: 결과에서 뒤로 → 카드 고르기). 답은 유지한다. */
    back() {
      if (state.index <= LANDING) return false;
      let target = state.index - 1;
      while (target >= 0 && steps[target].transient) target -= 1;
      enter(target, { direction: "back", source: "user" });
      return true;
    },

    /**
     * 특정 단계로 간다. source "history"(popstate)·"restore"(새로고침)는 답이 빠진 단계로 돌리고
     * 일시 단계를 다시 실행하지 않는다.
     */
    goTo(target, { source = "user" } = {}) {
      let index = typeof target === "number" ? target : (target === null ? LANDING : steps.findIndex((step) => step.id === target));
      if (source === "history" || source === "restore") {
        index = resolveRestoreIndex(steps, index >= 0 ? steps[index].id : null, state.answers);
      }
      if (index < LANDING || index >= steps.length) return false;
      if (index === state.index && source !== "restore") return false;
      enter(index, { direction: index < state.index ? "back" : "forward", source });
      return true;
    },

    /** 새로고침 복원. 저장된 답을 먼저 넣고 단계로 간다(결과면 로딩 없이 바로 결과). */
    restore({ stepId, answers }) {
      commit({ answers: { ...(answers || {}) } });
      const index = resolveRestoreIndex(steps, stepId, state.answers);
      if (index === LANDING) { commit({ source: "restore" }); return LANDING; }
      enter(index, { direction: "forward", source: "restore" });
      return index;
    },

    /**
     * 단일 선택. 다른 값을 고르면 자동 진행 타이머를 처음부터 다시 센다. 같은 값을 다시 누르면 선택을 풀고 타이머를 취소한다.
     * reduced-motion 이면 자동 진행하지 않는다(명세 D3: '다음' 버튼 상시).
     */
    select(value) {
      const step = current();
      if (!step || step.kind !== "choice") return false;
      clearTimer("auto");
      const answers = { ...state.answers };
      if (answers[step.id] === value) {
        delete answers[step.id];
        commit({ answers, pendingAuto: false });
        return true;
      }
      answers[step.id] = value;
      const auto = !state.reducedMotion && step.autoAdvance !== false;
      commit({ answers, pendingAuto: auto });
      if (auto) {
        const stepIndex = state.index;
        timers.auto = scheduler.set(() => {
          timers.auto = null;
          if (state.index === stepIndex) {
            commit({ pendingAuto: false });
            api.next("auto");
          }
        }, timing.autoAdvanceMs);
      }
      return true;
    },

    /** 자유 입력·다중 선택 값. 자동 진행하지 않는다. */
    setAnswer(value) {
      const step = current();
      if (!step || step.kind !== "input") return false;
      commit({ answers: { ...state.answers, [step.id]: value } });
      return true;
    },

    cancelAutoAdvance() {
      if (timers.auto === null) return false;
      clearTimer("auto");
      commit({ pendingAuto: false });
      return true;
    },

    /** 대기 단계 탭 건너뛰기: 최소 대기만 건너뛴다. 계산이 안 끝났으면 끝날 때 넘어간다. */
    skipWait() {
      if (!state.waiting) return false;
      clearTimer("min");
      settleWait({ minDone: true }, "skip");
      return true;
    },

    /** awaitWork 단계의 계산이 끝났다. */
    workDone() {
      if (!state.waiting) return false;
      settleWait({ workDone: true }, "auto");
      return true;
    },

    setReducedMotion(flag) {
      const reduced = Boolean(flag);
      if (reduced === state.reducedMotion) return;
      if (reduced) clearTimer("auto");
      commit({ reducedMotion: reduced, pendingAuto: reduced ? false : state.pendingAuto });
    },

    destroy() {
      clearAll();
      listeners.clear();
      handlers.clear();
    },
  };
  return api;
}

/* ───────────── URL · history · 저장소 도우미 (순수) ───────────── */

/** `?step=` 값. 형식이 틀리면 null. */
export function stepFromSearch(search) {
  const value = new URLSearchParams(String(search || "")).get("step");
  return value && ID_PATTERN.test(value) ? value : null;
}

/** 다른 쿼리·해시를 보존한 채 `?step=` 만 바꾼 상대 URL. stepId 가 없으면 지운다(랜딩 = 기본 URL). */
export function urlWithStep(href, stepId) {
  const url = new URL(String(href), "https://placeholder.invalid");
  if (stepId) url.searchParams.set("step", stepId);
  else url.searchParams.delete("step");
  const search = url.searchParams.toString();
  return `${url.pathname}${search ? `?${search}` : ""}${url.hash}`;
}

/** history.state 에 넣는 값. 본문 상태는 저장소가 정본이고 URL 은 위치만 가리킨다(명세 §2-3). */
export function historyStateFor(flowId, stepId, position) {
  return { cdGuidedFlow: flowId, step: stepId || null, version: GUIDED_SNAPSHOT_VERSION, position };
}

export function readHistoryState(value, flowId) {
  if (!value || typeof value !== "object" || value.cdGuidedFlow !== flowId || value.version !== GUIDED_SNAPSHOT_VERSION) return null;
  const position = Number.isInteger(value.position) && value.position >= 0 ? value.position : 0;
  const step = typeof value.step === "string" && ID_PATTERN.test(value.step) ? value.step : null;
  return { step, position };
}

export function snapshotKey(flowId) {
  return `cd:${flowId}:guided:v${GUIDED_SNAPSHOT_VERSION}`;
}

/** 저장 값 = { version, stepId, answers }. 답은 문자열·문자열 배열·유한수만 받는다. */
export function serializeSnapshot(state, steps) {
  const step = state.index >= 0 ? steps[state.index] : null;
  return JSON.stringify({ version: GUIDED_SNAPSHOT_VERSION, stepId: step ? step.id : null, answers: state.answers });
}

function validAnswer(value) {
  if (typeof value === "string") return value.length <= 2000;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.length <= 32 && value.every((item) => typeof item === "string" && item.length <= 200);
  return false;
}

/** 검증 실패면 null(버린다). 모르는 단계의 답은 떨군다. */
export function parseSnapshot(raw, steps) {
  if (typeof raw !== "string" || !raw) return null;
  let value;
  try { value = JSON.parse(raw); } catch { return null; }
  if (!value || typeof value !== "object" || value.version !== GUIDED_SNAPSHOT_VERSION) return null;
  if (value.stepId !== null && (typeof value.stepId !== "string" || !steps.some((step) => step.id === value.stepId))) return null;
  if (!value.answers || typeof value.answers !== "object" || Array.isArray(value.answers)) return null;
  const answers = {};
  for (const step of steps) {
    if (Object.prototype.hasOwnProperty.call(value.answers, step.id)) {
      if (!validAnswer(value.answers[step.id])) return null;
      answers[step.id] = value.answers[step.id];
    }
  }
  return { stepId: value.stepId, answers };
}
