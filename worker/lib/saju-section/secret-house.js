import { createSecretHouseRuntime } from "./runtime.generated.mjs";

// 시크릿 하우스(rpt_secretHouseEntryCard) 한 걸음. 페이지는 지금까지 고른 선택지 글자(history)만 보내고,
// 서버는 매번 D1_M 부터 그 글자들을 다시 밟아(handleChoice) 호감·플래그를 만든다 — 페이지가 보낸 점수·플래그는 받지 않는다.
// 돌려주는 것은 지금 장면(대사·선택지), 마지막 선택의 반응 카드, 캐릭터별 누적 점수, 최종 선택 뒤의 결과 카드다.
// 순서·분기·문장은 secret-house_real.html 의 buildScene·renderSceneChoices·closeRxn·revealResult 와 같다.
const HISTORY_MAX = 20;
const STEM_SET = new Set(["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"]);
const BRANCH_SET = new Set(["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"]);

function captureDocument() {
  const byId = {};
  const doc = {
    title: "",
    getElementById: (id) => byId[id] || (byId[id] = { style: {}, classList: { add() {}, remove() {} }, innerHTML: "" }),
    querySelectorAll: () => [],
    querySelector: () => null,
  };
  return { doc, byId };
}

export function normalizeSecretHouseStem(value) {
  const stem = String(value || "").trim();
  return STEM_SET.has(stem) ? stem : "";
}

export function normalizeSecretHouseBranch(value) {
  const branch = String(value || "").trim();
  return BRANCH_SET.has(branch) ? branch : "";
}

/**
 * @param {{stem:string, branch?:string, history?:unknown, finalCharId?:unknown}} input
 * @param {(message:string, code:string) => never} fail 입력 오류(400)를 던진다.
 */
export function buildSecretHouseStep(input, fail) {
  const stem = normalizeSecretHouseStem(input.stem);
  if (!stem) fail("일간을 확인해 주세요.", "SAJU_INVALID_HOUSE_STEM");
  const history = input.history === undefined ? [] : input.history;
  if (!Array.isArray(history) || history.length > HISTORY_MAX || history.some((lbl) => typeof lbl !== "string" || !/^[A-Z]$/.test(lbl))) {
    fail("선택 기록을 확인해 주세요.", "SAJU_INVALID_HOUSE_CHOICE");
  }
  const { doc, byId } = captureDocument();
  const rt = createSecretHouseRuntime({ document: doc });
  const G = rt.G;
  // confirmStem · startGame 과 같은 시작 상태.
  G.userStem = stem;
  G.userDayBranch = normalizeSecretHouseBranch(input.branch);
  G.baseAff = rt.calcBase(stem);
  G.si = 0;
  G.currentSceneId = "D1_M";
  const visible = (scene) => (scene.choices || []).filter((c) => !c.requiredFlag || G.flags[c.requiredFlag]);

  let current = "D1_M";
  let reaction = null;
  for (const lbl of history) {
    const base = rt.SCENE_MAP[current];
    if (!base) fail("선택 기록을 확인해 주세요.", "SAJU_INVALID_HOUSE_CHOICE");
    const scene = rt.resolveDynamicScene(base);
    G.currentSceneId = scene.id;
    const choice = visible(scene).find((c) => c.lbl === lbl);
    if (!choice) fail("선택 기록을 확인해 주세요.", "SAJU_INVALID_HOUSE_CHOICE");
    rt.rxnPending = false;
    rt.handleChoice(choice, { style: {}, classList: { add() {} } }, scene);
    reaction = { html: byId.rxnContent.innerHTML, border: byId.rxnCard.style.border, effect: choice.effect || "" };
    G.si += 1;
    current = G.nextSceneId;
  }

  let scene = null;
  const base = current && rt.SCENE_MAP[current];
  if (base) {
    const s = rt.resolveDynamicScene(base);
    G.currentSceneId = s.id;
    const orderIdx = Math.max(0, rt.SCENE_ORDER.indexOf(s.id));
    scene = {
      id: s.id, badge: s.badge, mood: s.mood || "mystic", type: s.type || "", sit: s.sit || "",
      beats: rt.buildSceneStoryArc(s).map((beat) => beat.text),
      choices: visible(s).map((c) => ({ lbl: c.lbl, txt: c.txt })),
      orderIdx, pct: 18 + Math.round((orderIdx / Math.max(1, rt.SCENE_ORDER.length - 1)) * 52),
    };
  }
  const totals = Object.fromEntries(rt.CHARS.map((c) => [c.stem, rt.getTotal(c.stem)]));
  const step = { userStem: stem, scene, reaction, totals, maxTotal: rt.getMaxTotal(), topCharId: rt.getTopChar().id, ended: !scene || scene.type === "final" };

  if (input.finalCharId !== undefined && input.finalCharId !== null && input.finalCharId !== "") {
    const finalId = String(input.finalCharId);
    const finalChar = Object.hasOwn(rt.CHAR_BY_ID, finalId) ? rt.CHAR_BY_ID[finalId] : null;
    if (!finalChar || !step.ended) fail("최종 선택을 확인해 주세요.", "SAJU_INVALID_HOUSE_FINAL");
    G.finalChar = finalChar;
    rt.buildResult();
    const total = rt.getTotal(finalChar.stem);
    step.result = {
      html: byId.resCard.innerHTML, border: byId.resCard.style.border, endingType: G.endingType, endingReason: G.endingReason,
      title: doc.title, finalCharId: finalChar.id, total,
      // buildResult 의 온도 막대(#tempFill) 너비 — 페이지가 600ms 뒤에 채운다.
      temp: Math.min(99, Math.max(24, Math.round((total / 170) * 100))),
    };
  }
  return step;
}
