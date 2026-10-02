// Threads 🐷 오늘의 띠별 운세 — 08:30 KST. 2026-10-02 추가(자미두수 12:00 슬롯을 대신한다).
//
// 근거는 하나다: 오늘 일진의 지지와 각 띠 지지의 관계(saju-shinsal.js getBranchPairRelations 정본).
//   충 → clash, 육합·삼합 → good, 원진·형·파·해 → rough, 같은 지지 → same, 그 외 → plain.
// 🔴 "조심할 띠"를 모델이 고르지 않는다. 띠마다 kind 가 계산으로 정해지고, 모델 문장이 kind 와
//    반대 방향(clash 띠에 대박, good 띠에 조심)이면 그 문장을 버리고 kind 별 결정론 문장으로 간다.
// 12띠 한 줄씩을 링크와 한 글에 담으면 480자를 넘는다 — 본 글(티저+링크) + 첫 답글(12줄) 체인으로 낸다.

import { BRANCH_HANGUL, BRANCH_HANJA, STEM_HANGUL, ganji } from "../../../lib/korean-calendar/index.js";
import { getKstDateParts } from "../daily-fortune-task.js";
import { getBranchPairRelations } from "../saju-shinsal.js";
import {
  CASUAL_RULES,
  SCOPE_LINE,
  acceptCopyField,
  generateJsonCopy,
  kstDateLabel,
  renderPost,
} from "./shared.js";

export const TYPE = "zodiac";
export const PATH = "/fortune/today/";
export const HASHTAG = "띠별운세";
export const CTA = "내 띠 오늘 운세 자세히 보기";

const ANIMALS = ["쥐", "소", "호랑이", "토끼", "용", "뱀", "말", "양", "원숭이", "닭", "개", "돼지"];
const ANIMAL_EMOJI = ["🐭", "🐮", "🐯", "🐰", "🐲", "🐍", "🐴", "🐑", "🐵", "🐔", "🐶", "🐷"];
const BAD_RELATIONS = ["원진", "형", "파", "해"];
const LINE_MAX = 22;

/** 띠 한 줄 결정론 문장. kind 마다 10개 — 같은 날 같은 kind 띠끼리는 겹치지 않게 고른다. */
const LINE_POOL = Object.freeze({
  good: ["부탁하면 웬만하면 다 들어줌.", "연락 먼저 해. 답 빨리 옴.", "사람 운 좋음. 약속 잡아.", "미뤘던 말, 오늘 하면 통함.", "오늘은 네 편이 많다.", "손 내밀면 잡아 주는 날.", "같이 하면 두 배로 빨라.", "소개·추천 들어오면 받아.", "협상은 오늘 하는 게 유리.", "칭찬 들을 각. 티 내도 됨."],
  clash: ["입 닫아. 진짜로.", "장바구니 결제 버튼 누르지 마.", "약속엔 30분 일찍 나가.", "욱하면 지는 날. 숨 세 번.", "계획 틀어져도 놀라지 마.", "답장 바로 하지 마. 한 번 읽고.", "큰돈 결정은 내일로 미뤄.", "이동은 여유 있게 잡아.", "싸움 걸려도 받지 마.", "새로 벌이지 말고 정리만 해."],
  rough: ["사소한 말에 서운해지기 쉬움.", "오해 생기면 그 자리에서 풀어.", "서류는 한 번 더 확인해.", "남 일에 끼지 마. 피곤해짐.", "기대는 반만. 그럼 남는 게 있음.", "말투 하나로 분위기 갈림.", "약속 겹치기 쉬움. 달력 봐.", "자잘한 지출이 새는 날.", "오늘은 들어 주는 쪽이 이김.", "핑계 말고 짧게 사과해."],
  same: ["평소대로 하면 됨. 근데 두 배로.", "네 고집이 무기도 되고 독도 됨.", "잘하는 거 밀어. 오늘 먹힘.", "습관 그대로 나옴. 나쁜 것도.", "자기 확신 MAX. 한 번만 의심해."],
  plain: ["무난함. 밀린 거 치우기 딱.", "조용히 실속 챙기는 날.", "튀지 말고 평타만 쳐도 됨.", "루틴 지키면 본전 이상.", "큰일 없음. 그게 복임.", "일찍 자면 내일이 편함.", "오늘은 쉬어도 아무도 뭐라 안 함.", "작은 거 하나 끝내면 기분 좋음.", "물 마셔. 그게 오늘 운세임.", "애매하면 하지 마. 그게 정답."],
});

// 문장이 kind 와 반대 방향인지 가르는 말. 반대 방향이면 그 문장을 버린다.
const UP_WORDS = ["대박", "최고", "잭팟", "술술", "잘 풀", "운 좋", "운 터", "행운", "꿀", "질러"];
const DOWN_WORDS = ["조심", "주의", "닫아", "하지 마", "말아", "피해", "싸움", "손해", "부딪", "미뤄", "참아", "서운"];

function hashText(text) {
  return [...String(text)].reduce((sum, char) => (sum * 31 + char.codePointAt(0)) >>> 0, 7);
}

function classify(relations, same) {
  if (same) return "same";
  if (relations.includes("충")) return "clash";
  if (relations.includes("육합") || relations.includes("삼합")) return "good";
  if (relations.some((name) => BAD_RELATIONS.includes(name))) return "rough";
  return "plain";
}

/**
 * 순수 계산. 같은 시각이면 언제나 같은 facts 다.
 * @returns {object|null}
 */
export function buildFacts(_env, now) {
  const { y, m, d } = getKstDateParts(now);
  const core = ganji({ year: y, month: m, day: d, hour: 12, minute: 0 });
  if (!core) return null;
  const { stemIndex, branchIndex } = core.day;
  const dayBranch = BRANCH_HANJA[branchIndex];
  const animals = ANIMALS.map((name, index) => {
    const relations = index === branchIndex ? [] : getBranchPairRelations(BRANCH_HANJA[index], dayBranch);
    return { name, emoji: ANIMAL_EMOJI[index], branch: BRANCH_HANGUL[index], relations, kind: classify(relations, index === branchIndex) };
  });
  const pick = (kinds) => animals.filter((animal) => kinds.includes(animal.kind)).map((animal) => animal.name);
  return {
    type: TYPE,
    dateLabel: kstDateLabel(now),
    dayPillar: { ko: `${STEM_HANGUL[stemIndex]}${BRANCH_HANGUL[branchIndex]}`, animal: ANIMALS[branchIndex] },
    animals,
    good: pick(["good"]),
    clash: pick(["clash"]),
    rough: pick(["rough"]),
  };
}

function kindOf(facts, name) {
  return facts.animals.find((animal) => animal.name === name)?.kind || "";
}

/**
 * 문장 안에서 띠 이름과 방향 말이 서로 어긋나면 false. 한 문장에 여러 띠가 섞이면 문장 단위로 본다.
 * @param {string} text
 * @param {object} facts
 * @param {string} [fixedKind] 띠 한 줄처럼 대상 띠가 정해져 있으면 그 kind
 */
export function matchesKinds(text, facts, fixedKind = "") {
  for (const sentence of String(text).split(/[.!?…\n]+/)) {
    const up = UP_WORDS.some((word) => sentence.includes(word));
    const down = DOWN_WORDS.some((word) => sentence.includes(word));
    if (!up && !down) continue;
    // "띠"가 붙은 것만 띠로 본다 — 말·소·용·양 한 글자는 말투·소개·사용·양보에도 들어 있다.
    const kinds = fixedKind ? [fixedKind] : ANIMALS.filter((name) => sentence.includes(`${name}띠`)).map((name) => kindOf(facts, name));
    for (const kind of kinds) {
      if (up && (kind === "clash" || kind === "rough")) return false;
      if (down && kind === "good") return false;
    }
  }
  return true;
}

function fallbackLines(facts) {
  const used = {};
  return facts.animals.map((animal) => {
    const pool = LINE_POOL[animal.kind];
    const start = hashText(`${facts.dateLabel}:${animal.kind}`) % pool.length;
    const offset = used[animal.kind] || 0;
    used[animal.kind] = offset + 1;
    return pool[(start + offset) % pool.length];
  });
}

function hookOptions(facts) {
  const clash = facts.clash[0];
  const good = facts.good.slice(0, 2).join("·");
  return [
    clash && `${clash}띠 오늘 진짜 입 조심. 이유는 답글에.`,
    clash && good && `${good}띠는 웃고 ${clash}띠는 참아야 하는 날.`,
    good && `오늘 사람 복 있는 띠: ${good}. 나머진 답글 봐.`,
    clash && `오늘 ${clash}띠는 계획대로 안 될 수 있음. 미리 말해 둠.`,
    "오늘 제일 잘 풀리는 띠랑 제일 조심할 띠 정리함.",
    "내 띠 오늘 어떤지 한 줄로 봐. 답글에 12띠 다 있음.",
  ].filter(Boolean);
}

function fallbackHook(facts, recent = []) {
  const options = hookOptions(facts);
  const seen = new Set(recent.map((row) => row.hook));
  const start = hashText(facts.dateLabel) % options.length;
  return Array.from({ length: options.length }, (_, i) => options[(start + i) % options.length]).find((hook) => !seen.has(hook)) || options[start];
}

function fallbackTip(facts) {
  if (facts.clash.length) return `${facts.clash.join("·")}띠 친구 있으면 오늘은 좀 봐줘.`;
  return "오늘 운 좋은 띠 친구한테 밥 사 달라 해.";
}

function fallbackCopy(facts, recent = []) {
  const lines = fallbackLines(facts);
  return { hook: fallbackHook(facts, recent), body: lines.join(" / "), tip: fallbackTip(facts), lines };
}

const SYSTEM_PROMPT = [
  "당신은 띠별 운세를 친구한테 카톡 보내듯 쓰는 사람이다. 웃기고 세게, 하지만 근거는 facts 의 띠 관계뿐이다.",
  "오늘은 날짜 일진과 각 띠의 관계만 다룬다. 개인 사주·궁합·상대 속마음을 말하지 않는다.",
  "kind 뜻: good=손발 맞음(육합·삼합), clash=정면으로 부딪힘(충), rough=자잘하게 삐걱(원진·형·파·해), same=같은 기운 겹침, plain=무난.",
  "good 띠에 경고를, clash·rough 띠에 대박·행운을 쓰지 않는다.",
  CASUAL_RULES,
].join("\n");

export function buildPrompt(facts) {
  const compact = { dateLabel: facts.dateLabel, dayPillar: facts.dayPillar, animals: facts.animals.map(({ name, kind, relations }) => ({ name, kind, relations })) };
  return [
    "facts — 정본 역법 엔진이 계산한 오늘 일진과 띠별 관계다. 값을 바꾸지 말고 문장으로만 옮겨라.",
    JSON.stringify(compact, null, 1),
    "",
    "다음 JSON 하나만 출력하라. 설명·코드펜스를 붙이지 마라.",
    "{",
    '  "hook": "스크롤 멈추게 하는 반말 한 줄. clash 나 good 띠 이름을 넣어 찌른다. 40자 이내.",',
    `  "lines": { "쥐": "그 띠 kind 에 맞는 오늘 한 줄. 반말, ${LINE_MAX}자 이내", "소": "…", …12띠 모두 },`,
    '  "tip": "clash 띠 또는 모두에게 하는 마무리 한 줄. 반말, 40자 이내."',
    "}",
  ].join("\n");
}

const VOCABULARY = ["육합", "삼합", "원진", "상충", "형살", "도화", "역마", "화개", "천을귀인", "백호", "괴강", "공망"];

/** @returns {Promise<{copy: Object, model: string|null, rejected: string[]}>} */
export async function writeCopy(env, facts, { generateImpl, recent = [] } = {}) {
  const fallback = fallbackCopy(facts, recent);
  const generated = await generateJsonCopy(env, { type: TYPE, systemPrompt: SYSTEM_PROMPT, prompt: buildPrompt(facts), generateImpl, recent, maxOutputTokens: 2048 });
  if (!generated) return { copy: fallback, model: null, rejected: [] };

  const allowed = [...new Set(facts.animals.flatMap((animal) => animal.relations))];
  const base = { vocabulary: VOCABULARY, allowed, casual: true };
  const rejected = [];
  let used = 0;
  const take = (key, value, rule) => {
    const text = acceptCopyField(value, { ...base, ...rule });
    if (text) used += 1;
    else rejected.push(key);
    return text;
  };

  const hook = take("hook", generated.fields?.hook, { min: 8, max: 40, validate: (text) => matchesKinds(text, facts) });
  const tip = take("tip", generated.fields?.tip, { min: 6, max: 40, validate: (text) => matchesKinds(text, facts) });
  const modelLines = generated.fields?.lines && typeof generated.fields.lines === "object" ? generated.fields.lines : {};
  // 같은 문장을 여러 띠에 복붙한 줄은 두 번째부터 버린다 — 실호출에서 12줄 중 같은 문장이 4번 나왔다(2026-10-02).
  const seen = new Set();
  const lines = facts.animals.map((animal, index) => {
    const text = take(`line:${animal.name}`, modelLines[animal.name], { min: 4, max: LINE_MAX, validate: (line) => matchesKinds(line, facts, animal.kind) && !seen.has(line) });
    if (text) seen.add(text);
    return text || fallback.lines[index];
  });

  const copy = { hook: hook || fallback.hook, tip: tip || fallback.tip, lines, body: lines.join(" / ") };
  return { copy, model: used ? generated.model || null : null, rejected };
}

/** 본 글(티저 + CTA 링크)과 첫 답글(12띠 한 줄씩)을 돌려준다. */
export function format(facts, copy, url) {
  const listed = (names) => names.join("·");
  const head = [
    copy.hook,
    "",
    `🐷 ${facts.dateLabel} 띠별 운세`,
    `오늘 일진 ${facts.dayPillar.ko}일(${facts.dayPillar.animal}날)`,
  ];
  if (facts.good.length) head.push(`😎 잘 풀림: ${listed(facts.good)}`);
  const careful = [...facts.clash.map((name) => `${name}(충)`), ...facts.rough];
  if (careful.length) head.push(`😬 조심: ${listed(careful)}`);
  head.push(copy.tip, SCOPE_LINE, "12띠 한 줄 운세는 답글에 👇");
  const root = renderPost({ head: head.join("\n"), cta: CTA, url, hashtag: HASHTAG });
  const reply = facts.animals.map((animal, index) => `${animal.emoji} ${animal.name} — ${copy.lines[index]}`).join("\n");
  return [root, reply];
}
