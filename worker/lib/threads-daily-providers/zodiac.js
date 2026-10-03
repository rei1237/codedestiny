// Threads 🐷 오늘의 띠별 운세 — 08:30 KST. 2026-10-02 추가(자미두수 12:00 슬롯을 대신한다).
//
// 근거는 하나다: 오늘 일진의 지지와 각 띠 지지의 관계(saju-shinsal.js getBranchPairRelations 정본).
//   충 → clash, 육합·삼합 → good, 원진·형·파·해 → rough, 같은 지지 → same, 그 외 → plain.
// 🔴 "조심할 띠"를 모델이 고르지 않는다. 띠마다 kind 가 계산으로 정해지고, 모델 문장이 kind 와
//    반대 방향(clash 띠에 대박, good 띠에 조심)이면 그 문장을 버리고 kind 별 결정론 문장으로 간다.
// 원글의 대상 띠·대표 연도에서 시작해 3띠씩 4개 답글로 근거와 실천을 전한다.

import { BRANCH_HANGUL, BRANCH_HANJA, STEM_HANGUL, ganji } from "../../../lib/korean-calendar/index.js";
import { getKstDateParts } from "../daily-fortune-task.js";
import { getBranchPairRelations } from "../saju-shinsal.js";
import {
  CASUAL_RULES,
  SCOPE_LINE,
  acceptCopyField,
  generateJsonCopy,
  kstDateLabel,
} from "./shared.js";

export const TYPE = "zodiac";
export const PATH = "/fortune/today/";
export const HASHTAG = "띠별운세";
export const CTA = "내 띠 오늘 운세 자세히 보기";

const ANIMALS = ["쥐", "소", "호랑이", "토끼", "용", "뱀", "말", "양", "원숭이", "닭", "개", "돼지"];
const ANIMAL_EMOJI = ["🐭", "🐮", "🐯", "🐰", "🐲", "🐍", "🐴", "🐑", "🐵", "🐔", "🐶", "🐷"];
const BAD_RELATIONS = ["원진", "형", "파", "해"];
const LINE_MAX = 55;

/** 띠 한 줄 결정론 문장. kind 마다 10개 — 같은 날 같은 kind 띠끼리는 겹치지 않게 고른다. */
const LINE_POOL = Object.freeze({
  good: ["혼자 풀던 일을 함께 살펴봐. 부탁할 때 필요한 도움을 한 가지로 좁혀 봐.", "안부가 떠오른 사람에게 짧게 연락해 봐. 답을 재촉하지 않는 여유도 남겨 둬.", "새로운 약속보다 이미 나눈 이야기를 이어가 봐. 작은 관심부터 표현해 봐.", "의견을 모을 때 공통점부터 찾아봐. 서로 원하는 조건을 하나씩 말해 봐.", "고마웠던 일을 구체적으로 전해 봐. 막연한 칭찬보다 그 장면을 말해 봐."],
  clash: ["답장이 거슬리면 바로 결론 내리지 말고 다시 읽어 봐. 말투와 사실을 나눠 봐.", "일정이 바뀔 여유를 조금 남겨 둬. 이동 전에 시간과 장소부터 확인해 봐.", "서로 속도가 다르면 합의할 부분부터 정해 봐. 오늘 끝낼 범위를 줄여도 돼.", "하고 싶은 말은 메모에 먼저 써 봐. 감정이 가라앉은 뒤 필요한 말만 골라 봐.", "큰 결정을 서두르기보다 빠진 조건을 찾아봐. 확인할 질문 하나를 남겨 둬."],
  rough: ["서운한 마음이 들면 의도를 추측하기보다 물어봐. 무슨 뜻인지 한 번 확인해 봐.", "작은 약속일수록 시간을 분명히 정해 봐. 서로 다르게 이해한 부분을 맞춰 봐.", "부탁을 받으면 내 일정부터 살펴봐. 할 수 있는 범위를 짧게 전해 봐.", "대화가 꼬이면 설명을 더하기보다 한 번 들어봐. 상대의 말을 요약해 봐.", "기억에 기대기보다 약속을 적어 둬. 날짜와 준비물을 함께 확인해 봐."],
  same: ["익숙한 방식의 장점부터 써 봐. 다만 다른 의견을 들을 자리도 남겨 둬.", "내가 잘하는 일 하나에 집중해 봐. 모든 일을 내 방식으로 맞출 필요는 없어.", "반복되는 습관을 하나 살펴봐. 편해서 하는 일과 필요한 일을 나눠 봐.", "확신이 들 때 이유를 한 줄 적어 봐. 다른 선택의 장점도 하나 찾아봐.", "평소 맡던 역할을 돌아봐. 오늘은 도움받고 싶은 부분도 말해 봐."],
  plain: ["큰 신호를 찾기보다 밀린 일 하나를 마쳐 봐. 작은 완료도 충분히 의미 있어.", "늘 하던 일의 순서를 바꿔 봐. 가장 부담이 적은 일부터 시작해 봐.", "오늘 쓸 수 있는 시간부터 세어 봐. 그 안에 끝낼 만큼만 계획해 봐.", "관계의 답을 급하게 정하지 않아도 돼. 오늘 주고받은 말부터 살펴봐.", "하루 끝에 해낸 일 하나를 적어 둬. 비교보다 내 속도를 확인해 봐."],
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
    const years = Array.from({ length: 5 }, (_, offset) => 1960 + index + offset * 12).filter((year) => year <= y - 18);
    return { name, emoji: ANIMAL_EMOJI[index], branch: BRANCH_HANGUL[index], years, relations, kind: classify(relations, index === branchIndex) };
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
  const good = facts.good.slice(0, 3).map((name) => `${name}띠`).join("·");
  return [
    good && `${good}, 오늘은 먼저 안부를 건네 봐.`,
    good && `${good}, 혼자보다 함께 풀 일을 찾아봐.`,
    good && `${good}, 미뤄 둔 한마디가 있다면.`,
    good && `${good}, 작은 관심부터 표현해 봐.`,
  ].filter(Boolean);
}

function fallbackHook(facts, recent = []) {
  const options = hookOptions(facts);
  const seen = new Set(recent.map((row) => row.hook));
  const start = hashText(facts.dateLabel) % options.length;
  return Array.from({ length: options.length }, (_, i) => options[(start + i) % options.length]).find((hook) => !seen.has(hook)) || options[start];
}

function fallbackTip(facts) {
  return "오늘은 먼저 연락하기, 내 페이스 지키기 중 어느 쪽이 필요해?";
}

function fallbackCopy(facts, recent = []) {
  const lines = fallbackLines(facts);
  return { hook: fallbackHook(facts, recent), body: lines.join(" / "), tip: fallbackTip(facts), lines };
}

const SYSTEM_PROMPT = [
  "당신은 띠별 운세를 다정한 친구처럼 쓰는 에디터다. 대상 띠를 먼저 부르고 구체적인 행동을 제안한다. 자극적인 호통·모욕·길흉 확정은 금지다.",
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
    `원글에서 부를 대상 띠는 ${facts.good.slice(0, 3).map((name) => `${name}띠`).join("·")}다. hook에는 이 중 한 띠 이상을 넣고 다른 띠는 넣지 않는다.`,
    "",
    "다음 JSON 하나만 출력하라. 설명·코드펜스를 붙이지 마라.",
    "{",
    '  "hook": "대상 띠와 오늘 해 볼 행동을 연결한 다정한 반말 한 줄. 행운이나 연락 결과는 확정하지 않는다. 40자 이내.",',
    `  "lines": { "쥐": "그 띠 kind 에 맞는 일상 장면과 작은 실천 두 문장. 반말, ${LINE_MAX}자 이내", "소": "…", …12띠 모두 },`,
    '  "tip": "본문의 실천과 이어지는 답하기 쉬운 선택 질문 하나. 생년월일·사연 공개 요구 금지. 반말, 40자 이내."',
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
  const base = { vocabulary: VOCABULARY, allowed, casual: true, forbidden: ["입 닫", "대박", "답 빨리", "인연이 온", "망한", "재수 없"] };
  const rejected = [];
  let used = 0;
  const take = (key, value, rule) => {
    const text = acceptCopyField(value, { ...base, ...rule });
    if (text) used += 1;
    else rejected.push(key);
    return text;
  };

  const featured = facts.good.slice(0, 3);
  const hook = take("hook", generated.fields?.hook, { min: 8, max: 40, validate: (text) => matchesKinds(text, facts)
    && featured.some((name) => text.includes(`${name}띠`))
    && facts.animals.every(({ name }) => !text.includes(`${name}띠`) || featured.includes(name)) });
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

const RELATION_NOTE = {
  good: "합: 서로 연결점을 찾아가는 관계로 읽어.",
  clash: "충: 다른 방향의 힘. 속도와 표현을 맞춰 보는 힌트야.",
  rough: "엇갈림의 관계: 오해가 없는지 살펴보는 힌트야.",
  same: "같은 지지: 익숙한 방식의 장점과 고집을 함께 살펴봐.",
  plain: "두 지지의 뚜렷한 관계 없음. 생활 리듬에 초점을 둬.",
};

/** 원글 1개 + 3띠씩 4개 답글. 출생연도는 찾기용이며 개인 명식으로 해석하지 않는다. */
export function format(facts, copy, _url) {
  const featured = facts.animals.filter((animal) => facts.good.includes(animal.name)).slice(0, 3);
  const label = (animal) => `${animal.name}띠 ${animal.years.join("·")}`;
  const root = [copy.hook, "", `🐷 ${facts.dateLabel} · ${facts.dayPillar.ko}일 띠별 운세`,
    ...featured.map((animal, index) => `${index + 1}. ${label(animal)}`),
    "", "오늘 일진과 합의 관계를 이루는 띠들이야. 미뤄 둔 안부나 같이 풀 일을 떠올려 봐.",
    "12띠의 이유와 실천은 아래에 이어 둘게.", copy.tip, SCOPE_LINE,
    "연도는 찾기용 · 연초 출생은 입춘 기준 확인", "#꿀꿀운세"].join("\n");
  const replies = [];
  for (let start = 0; start < facts.animals.length; start += 3) {
    replies.push(facts.animals.slice(start, start + 3).map((animal, offset) =>
      `[${label(animal)}]\n${RELATION_NOTE[animal.kind]}\n→ ${copy.lines[start + offset]}`
    ).join("\n\n"));
  }
  return [root, ...replies];
}
