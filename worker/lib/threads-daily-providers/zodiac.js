// Threads 🐷 오늘의 띠별 운세 — 08:30 KST. 2026-10-02 추가(자미두수 12:00 슬롯을 대신한다).
//
// 근거는 하나다: 오늘 일진의 지지와 각 띠 지지의 관계(saju-shinsal.js getBranchPairRelations 정본).
//   충 → clash, 육합·삼합 → good, 원진·형·파·해 → rough, 같은 지지 → same, 그 외 → plain.
// 띠마다 kind는 계산으로 정해진다. 분야별 본문은 검수 문안을 사용하고,
// 모델 훅이 관계 해석과 반대 방향이면 결정론 훅으로 대체한다.
// 원글의 대상 띠·대표 연도에서 시작해 2띠씩 6개 답글로 재물·연애·일/직장운을 전한다.

import { BRANCH_HANGUL, BRANCH_HANJA, STEM_HANGUL, ganji } from "../../../lib/korean-calendar/index.js";
import { getKstDateParts } from "../daily-fortune-task.js";
import { getBranchPairRelations } from "../saju-shinsal.js";
import {
  CASUAL_RULES,
  SCOPE_LINE,
  THREADS_PROFILE_LINK_CTA,
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

// 일진↔띠 관계를 분야별 생활 장면으로 풀어낸 편집 문안이다.
// 재성·관성·배우자궁 등을 새로 계산한 사실이나 개인별 예측으로 사용하지 않는다.
// 세 분야는 모델 성공 여부와 무관하게 항상 제공한다. 모델은 원글 훅·질문만 다듬는다.
const DOMAIN_FLOW = Object.freeze({
  good: {
    money: "함께 쓰는 돈의 조건을 맞추기 좋은 흐름이야.",
    love: "작은 표현으로 관계를 가까이하기 좋은 날이야.",
    work: "협업에서 막힌 일을 풀 실마리를 찾기 좋아.",
  },
  clash: {
    money: "갑작스러운 지출로 예산이 흔들리기 쉬워.",
    love: "마음보다 말이 앞서 서로 엇갈리기 쉬워.",
    work: "일정이나 의견이 부딪히기 쉬운 흐름이야.",
  },
  rough: {
    money: "작은 비용 차이가 부담으로 느껴지기 쉬워.",
    love: "사소한 표현이 서운함으로 번지기 쉬운 날이야.",
    work: "전달이 빠진 부분에서 일이 꼬이기 쉬워.",
  },
  same: {
    money: "익숙한 소비가 반복되기 쉬운 흐름이야.",
    love: "편안함은 커져도 표현이 익숙해지기 쉬워.",
    work: "익숙한 업무에 강점이 살아나는 흐름이야.",
  },
  plain: {
    money: "큰 변화보다 지출 관리가 중심인 흐름이야.",
    love: "급한 진전보다 편안한 대화에 어울리는 날이야.",
    work: "새 일을 벌이기보다 하던 일의 완성도가 중요해.",
  },
});

// 같은 날짜에도 띠마다 구체적인 장면이 달라지도록 겹치지 않는 편집 초점을 순환한다.
// 날짜별 순환은 장면 선택이며 새 점수·길흉 계산이 아니다.
const DOMAIN_ACTIONS = Object.freeze({
  money: [
    "정기결제 중 안 쓰는 항목을 살펴봐.", "함께 쓴 비용의 정산 기준을 맞춰 봐.",
    "구매 전 배송비까지 합쳐 비교해 봐.", "이번 주 꼭 나갈 돈부터 따로 남겨 둬.",
    "할인보다 실제 쓸 물건인지 살펴봐.", "빌리거나 빌려줄 돈은 조건부터 정해.",
    "소액 결제가 쌓인 항목을 확인해 봐.", "반품·환불 가능 기간을 확인해 봐.",
    "모임 비용은 참석 전에 맞춰 봐.", "수입보다 먼저 지출 한도를 정해 봐.",
    "견적은 추가 비용까지 확인해 봐.", "남아 있는 정산 금액을 확인해 봐.",
  ],
  love: [
    "연락은 가벼운 안부부터 건네 봐.", "둘만의 약속은 시간까지 정해 봐.",
    "고마웠던 장면을 하나 말해 봐.", "답장 속도보다 대화 내용을 살펴봐.",
    "마음에 남은 장면부터 이야기해 봐.", "혼자 짐작한 마음은 직접 물어봐.",
    "만나고 싶은 마음을 짧게 전해 봐.", "소개 자리에서는 공통 관심사를 찾아봐.",
    "상대가 말한 작은 취향을 기억해 봐.", "연인과 각자 필요한 시간을 맞춰 봐.",
    "다음 만남은 서로 편한 날을 골라 봐.", "확답을 재촉하기보다 내 뜻을 전해 봐.",
  ],
  work: [
    "요청받은 일의 마감부터 확인해 봐.", "협업할 때 각자 맡을 범위를 정해 봐.",
    "보낼 문서의 숫자를 다시 확인해 봐.", "밀린 회신 하나부터 마무리해 봐.",
    "회의에서는 핵심 의견부터 말해 봐.", "새 업무는 완료 기준부터 맞춰 봐.",
    "도움이 필요한 부분을 구체적으로 말해 봐.", "구직 연락은 지원한 역할을 다시 확인해 봐.",
    "약속한 진행 상황을 먼저 공유해 봐.", "동시에 할 일보다 우선순위를 정해 봐.",
    "수정 요청은 항목별로 적어 확인해 봐.", "끝낸 일의 결과를 짧게 정리해 둬.",
  ],
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
  return facts.animals.map((animal, index) => [
    ["money", "재물운"], ["love", "연애운"], ["work", "일/직장운"],
  ].map(([domain, label]) => {
    const actions = DOMAIN_ACTIONS[domain];
    const action = actions[(hashText(`${facts.dateLabel}:${domain}`) + index) % actions.length];
    return `${label}: ${DOMAIN_FLOW[animal.kind][domain]} ${action}`;
  }).join("\n"));
}

function hookOptions(facts) {
  const good = facts.good.slice(0, 3).map((name) => `${name}띠`).join("·");
  return [
    good && `${good}, 돈과 관계 모두 조건을 맞춰 봐.`,
    good && `${good}, 오늘 재물운·연애운의 포인트.`,
    good && `${good}, 돈 이야기와 마음 표현을 살펴봐.`,
    good && `${good}, 재물·연애·일운을 같이 읽어 봐.`,
  ].filter(Boolean);
}

function fallbackHook(facts, recent = []) {
  const options = hookOptions(facts);
  const seen = new Set(recent.map((row) => row.hook));
  const start = hashText(facts.dateLabel) % options.length;
  return Array.from({ length: options.length }, (_, i) => options[(start + i) % options.length]).find((hook) => !seen.has(hook)) || options[start];
}

function fallbackTip() {
  return "오늘 더 궁금한 건 재물운, 연애운, 일운 중 뭐야?";
}

function fallbackCopy(facts, recent = []) {
  const lines = fallbackLines(facts);
  return { hook: fallbackHook(facts, recent), body: lines.join(" / "), tip: fallbackTip(facts), lines };
}

const SYSTEM_PROMPT = [
  "당신은 띠별 재물운·연애운·일/직장운 연속글의 원글 훅과 질문을 다듬는 에디터다. 대상 띠와 읽을 분야를 선명하게 보여 준다. 자극적인 호통·모욕·길흉 확정은 금지다.",
  "12띠의 분야별 본문은 검수 문안으로 이미 제공된다. 본문·분야별 점수·금액·발생 사건을 새로 만들지 않는다.",
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
    '  "hook": "대상 띠와 재물운·연애운 중 한 분야 이상을 연결한 다정한 반말 한 줄. 수입·재회·연락 결과는 확정하지 않는다. 40자 이내.",',
    '  "tip": "재물운·연애운·일운 중 독자가 궁금한 분야를 묻는 질문 하나. 생년월일·사연 공개 요구 금지. 반말, 40자 이내."',
    "}",
  ].join("\n");
}

const VOCABULARY = ["육합", "삼합", "원진", "상충", "형살", "도화", "역마", "화개", "천을귀인", "백호", "괴강", "공망"];

/** @returns {Promise<{copy: Object, model: string|null, rejected: string[]}>} */
export async function writeCopy(env, facts, { generateImpl, recent = [] } = {}) {
  const fallback = fallbackCopy(facts, recent);
  const generated = await generateJsonCopy(env, { type: TYPE, systemPrompt: SYSTEM_PROMPT, prompt: buildPrompt(facts), generateImpl, recent, maxOutputTokens: 512 });
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
  const copy = { ...fallback, hook: hook || fallback.hook, tip: tip || fallback.tip };
  return { copy, model: used ? generated.model || null : null, rejected };
}

const RELATION_NOTE = {
  good: "합: 서로 연결점을 찾아가는 관계로 읽어.",
  clash: "충: 다른 방향의 힘. 속도와 표현을 맞춰 보는 힌트야.",
  rough: "엇갈림의 관계: 오해가 없는지 살펴보는 힌트야.",
  same: "같은 지지: 익숙한 방식의 장점과 고집을 함께 살펴봐.",
  plain: "두 지지의 뚜렷한 관계 없음. 생활 리듬에 초점을 둬.",
};

/** 원글 1개 + 2띠씩 6개 답글. 각 띠는 재물·연애·일/직장운 세 분야를 빠짐없이 제공한다. */
export function format(facts, copy, _url) {
  const featured = facts.animals.filter((animal) => facts.good.includes(animal.name)).slice(0, 3);
  const label = (animal) => `${animal.name}띠 ${animal.years.join("·")}`;
  const root = [copy.hook, "", `🐷 ${facts.dateLabel} · ${facts.dayPillar.ko}일 띠별 운세`,
    ...featured.map((animal, index) => `${index + 1}. ${label(animal)}`),
    "", "오늘 일진과 합의 관계를 이루는 띠들이야. 돈의 조건과 마음의 표현을 맞춰 봐.",
    "12띠 각각의 재물운·연애운·일/직장운을 아래에 이어 둘게.", copy.tip, SCOPE_LINE,
    "연도는 찾기용 · 연초 출생은 입춘 기준 확인", THREADS_PROFILE_LINK_CTA, "#꿀꿀사주"].join("\n");
  const replies = [];
  for (let start = 0; start < facts.animals.length; start += 2) {
    replies.push(facts.animals.slice(start, start + 2).map((animal, offset) =>
      `[${label(animal)}]\n${copy.lines[start + offset]}\n풀이: ${RELATION_NOTE[animal.kind]}`
    ).join("\n\n"));
  }
  return [root, ...replies];
}
