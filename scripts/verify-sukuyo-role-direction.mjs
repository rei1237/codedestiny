#!/usr/bin/env node
/**
 * 숙요점 궁합 · 자리(役) 방향성 가드.
 *
 * 지키는 것 — "누가 누구에게 어느 자리인지"가 기능 자체에서 서로 다르게 나올 것.
 *  1. 자리 매핑 파리티 — 클라 휠(js/…quantum.js)과 정본(worker/lib/sukuyo-relation-core.js)이
 *     27거리 전부에서 같은 자리·같은 관계명을 낸다. 예전에 성/위 두 줄이 뒤집혀 있었다.
 *  2. 자리 저작 완결성 — 11개 자리 전부 meaning/experience/advice 를 갖고, 짝(안↔괴 등)의
 *     서술이 서로 다르며, 클라 SY_ROLE_PROFILE 이 정본과 글자까지 같다.
 *  3. 조언 비대칭 실행 — 순행 D 와 그 반대 극이 실제로 서로 다른 문장을 낸다.
 *  4. 상담 프롬프트 규칙 — '서로·둘 다'로 자리 서술을 대체하지 말라는 규칙이 코드 쪽에 있다
 *     (CMS 프롬프트가 시스템 프롬프트를 통째로 갈아치워도 살아남는 자리여야 한다).
 *  5. 생성기 회귀 — 자리 별칭이 없는 구버전 payload 에서도 역할 흐름이 '미상'으로 죽지 않는다.
 *  6. 화면 표시 — '공진자' 뭉개기가 사라졌고, 자리 방향 섹션 마커가 남아 있다.
 *  7. React 휠 파리티 — components/fortune/SukuyoWheel.tsx 의 relationFromDistance 도
 *     27거리 전부에서 정본 aRole 과 같은 자리를 낸다.
 *  9. 관계 해설 14장 — 27거리 전부에서 본문이 채워지고, 나 중심/상대 중심이 자리 짝대로
 *     갈리며, 단정 어조가 섞여 있지 않은지. 화면 마커까지 함께 본다.
 * 10. 전생 서사 — 자리별 장면·흔적·과제가 27거리 전부에서 조립되고, 나/상대가 자리 짝대로
 *     갈리며, 화면에 실제로 실리는지. 되살린 archiveStory·mission 의 어조까지 함께 본다.
 *  8. 관계 판정 단일 payload — syBuildRelationDirection 이 27거리 전부에서 정본 자리·거리·
 *     방향·해설 키를 내고, A/B 를 바꾸면 자리와 방향이 함께 뒤집힌다. 화면이 이 payload 를
 *     실제로 싣고 있는지(상단 배지·판정 요약 마커)도 함께 본다.
 *
 *   node scripts/verify-sukuyo-role-direction.mjs
 */

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {
  SUKUYO_ROLE_PROFILES,
  relationFromForwardDistance,
} from "../worker/lib/sukuyo-relation-core.js";
import { buildSukuyoAiCompatibility } from "../worker/lib/sukuyo-ai-calculation.js";
import { buildSukuyoAIPrompt } from "../worker/lib/sukuyo-ai-prompt.js";

const ROOT = process.cwd();
const read = (relPath) => fs.readFileSync(path.join(ROOT, relPath), "utf8");

const failures = [];
const check = (condition, message) => {
  if (!condition) failures.push(message);
};

const CLIENT = "js/saju-engine-tarot-sukuyo-quantum.js";
const ROUTE = "worker/routes/sukuyo-compatibility-ai.js";
const REACT_WHEEL = "components/fortune/SukuyoWheel.tsx";

const clientSource = read(CLIENT);
const routeSource = read(ROUTE);

// ── 1. 클라 자리 휠을 vm 으로 꺼내 정본과 27거리 대조 ────────────────────────
const BLOCK_START = "function syWheelRelationFromDistance(";
const BLOCK_END = "function syWheelRelationByIndex(";

let clientRoles = null;
{
  const start = clientSource.indexOf(BLOCK_START);
  const end = clientSource.indexOf(BLOCK_END);
  // 앵커가 사라지면 통과시키지 않는다 — 대조할 대상이 없는 가드는 가드가 아니다.
  check(start >= 0, `${CLIENT} 에서 '${BLOCK_START}' 를 찾지 못했습니다 — 자리 휠 대조를 못 합니다`);
  check(end > start, `${CLIENT} 에서 '${BLOCK_END}' 를 찾지 못했습니다 — 자리 휠 대조를 못 합니다`);

  if (start >= 0 && end > start) {
    const block = clientSource.slice(start, end);
    const sandbox = { _sajuQuantumText: (key) => String(key) };
    vm.createContext(sandbox);
    try {
      vm.runInContext(block, sandbox, { filename: CLIENT });
    } catch (error) {
      check(false, `${CLIENT} 자리 휠 블록 평가 실패: ${error.message}`);
    }
    const missing = [
      "SY_ROLE_PROFILE",
      "SY_ROLE_RELATION",
      "syRoleFromForwardDistance",
      "syBuildRelationDirection",
      "SY_SEAT_CHAPTERS",
      "SY_TIER_MODIFIER",
      "SY_RELATION_SYNTHESIS",
      "syBuildRelationChapters",
      "SY_SEAT_PASTLIFE",
      "syBuildPastLifeChapter",
    ].filter(
      (name) => sandbox[name] == null,
    );
    check(
      missing.length === 0,
      `${CLIENT} 자리 휠 블록에 ${missing.join(", ")} 가 없습니다 — 정본 대조 불가`,
    );
    if (missing.length === 0) clientRoles = sandbox;
  }
}

if (clientRoles) {
  const mismatches = [];
  for (let d = 0; d < 27; d += 1) {
    const canon = relationFromForwardDistance(d);
    const client = clientRoles.syRoleFromForwardDistance(d);
    if (!client) {
      mismatches.push(`D=${d} 클라가 자리를 못 냅니다(null)`);
      continue;
    }
    if (client.meShort !== canon.aRole || client.otherShort !== canon.bRole) {
      mismatches.push(
        `D=${d} 자리 불일치 — 정본 ${canon.aRole}/${canon.bRole} vs 클라 ${client.meShort}/${client.otherShort}`,
      );
    }
    if (client.relationType !== canon.relationType || client.relationTypeHan !== canon.relationTypeHan) {
      mismatches.push(
        `D=${d} 관계명 불일치 — 정본 ${canon.relationType}(${canon.relationTypeHan}) vs 클라 ${client.relationType}(${client.relationTypeHan})`,
      );
    }
  }
  for (const message of mismatches.slice(0, 8)) check(false, message);
  if (mismatches.length > 8) check(false, `그 밖에 ${mismatches.length - 8}건 더 불일치`);
  if (!mismatches.length) console.log("[sukuyo-role-direction] 27거리 자리·관계명 정본 일치");
}

// ── 2. 자리 저작 완결성 + 클라/정본 글자 일치 ────────────────────────────────
const ROLE_PAIRS = [
  ["안", "괴"],
  ["영", "친"],
  ["우", "쇠"],
  ["성", "위"],
  ["업", "태"],
];
const ALL_ROLES = ["명", ...ROLE_PAIRS.flat()];
const AUTHORED_FIELDS = ["han", "meaning", "experience", "advice"];

check(
  Object.keys(SUKUYO_ROLE_PROFILES).length === ALL_ROLES.length,
  `정본 SUKUYO_ROLE_PROFILES 가 ${Object.keys(SUKUYO_ROLE_PROFILES).length}개입니다 — 자리는 ${ALL_ROLES.length}개여야 합니다`,
);
for (const role of ALL_ROLES) {
  const profile = SUKUYO_ROLE_PROFILES[role];
  if (!profile) {
    check(false, `정본에 자리 '${role}' 가 없습니다`);
    continue;
  }
  for (const field of AUTHORED_FIELDS) {
    check(
      typeof profile[field] === "string" && profile[field].trim().length > 0,
      `정본 자리 '${role}' 의 ${field} 가 비어 있습니다 — 자리별 서술이 없으면 방향이 뭉개집니다`,
    );
  }
}
for (const [a, b] of ROLE_PAIRS) {
  for (const field of ["meaning", "experience", "advice"]) {
    check(
      SUKUYO_ROLE_PROFILES[a]?.[field] !== SUKUYO_ROLE_PROFILES[b]?.[field],
      `자리 '${a}' 와 '${b}' 의 ${field} 가 같습니다 — 같은 관계의 두 자리는 서로 다르게 말해야 합니다`,
    );
  }
}
if (clientRoles) {
  for (const role of ALL_ROLES) {
    const canon = SUKUYO_ROLE_PROFILES[role];
    const client = clientRoles.SY_ROLE_PROFILE[role];
    if (!client) {
      check(false, `클라 SY_ROLE_PROFILE 에 자리 '${role}' 가 없습니다`);
      continue;
    }
    for (const field of AUTHORED_FIELDS) {
      check(
        client[field] === canon?.[field],
        `자리 '${role}' 의 ${field} 가 클라와 정본에서 다릅니다 — 화면과 상담이 다른 말을 하게 됩니다`,
      );
    }
  }
}

// ── 3. 조언 비대칭 — 같은 관계의 양극이 실제로 다른 문장을 낸다 ──────────────
for (const [forward, reverse] of [
  [3, 6],
  [1, 8],
  [2, 7],
  [4, 5],
  [9, 18],
]) {
  const a = buildSukuyoAiCompatibility({ index: 0 }, { index: forward });
  const b = buildSukuyoAiCompatibility({ index: 0 }, { index: reverse });
  const ga = a?.roleActionGuide || {};
  const gb = b?.roleActionGuide || {};
  check(
    Boolean(ga.meAction && ga.otherAction),
    `순행 +${forward} 의 roleActionGuide 가 비었습니다`,
  );
  check(
    ga.meAction !== ga.otherAction,
    `순행 +${forward} 에서 나와 상대의 조언이 같습니다 — 방향이 뭉개졌습니다`,
  );
  check(
    ga.meAction !== gb.meAction,
    `순행 +${forward} 와 +${reverse} 의 '나' 조언이 같습니다 — 같은 관계의 반대 자리인데 구분이 없습니다`,
  );
}

// ── 4. 상담 프롬프트 규칙이 코드 쪽에 살아 있는가 ────────────────────────────
// CMS 프롬프트(cmsPromptText)가 시스템 프롬프트를 통째로 갈아치우므로, 이 규칙들은
// 그 바깥의 buildSectionGroupPrompt 공통 규칙에 있어야 항상 적용된다.
for (const marker of [
  "'서로·둘 다·함께'로 자리 서술을 대체하지 마십시오.",
  "관계 이름과 자리 이름의 한자는 처음 나올 때 한 줄로 풀어 줍니다",
  "무거운 자리도 그 사람을 단정하거나 겁주지 말고",
]) {
  check(routeSource.includes(marker), `${ROUTE} 에 자리 방향 규칙이 없습니다: ${marker}`);
}
check(
  routeSource.includes("이(가) 선 자리"),
  `${ROUTE} 의 근거 화이트리스트에 '선 자리' 항목이 없습니다 — 모델이 자리를 인용할 수 없습니다`,
);

// ── 5. 생성기 회귀 — 자리 별칭 없는 payload 에서도 역할 흐름이 살아난다 ──────
{
  const prompt = buildSukuyoAIPrompt({
    question: "우리는 서로 어떤 자리에 서 있나요?",
    basicResult: { mansionIdx: 0, mansion: "각수", displayIndex: 1 },
    compatibilityResult: { myIdx: 0, partnerIdx: 3, partnerMansion: "저수", relationType: "안괴" },
  });
  const text = String(prompt?.prompt || prompt || "");
  const roleLine = text.split("\n").find((line) => line.includes("역할 흐름")) || "";
  check(Boolean(roleLine), "buildSukuyoAIPrompt 결과에 '역할 흐름' 줄이 없습니다");
  check(
    !roleLine.includes("미상"),
    `자리 별칭 없는 payload 에서 역할 흐름이 '미상' 으로 죽습니다: ${roleLine.trim()}`,
  );
  const canon = relationFromForwardDistance(3);
  check(
    roleLine.includes(canon.aRole) && roleLine.includes(canon.bRole),
    `역할 흐름 줄에 정본 자리(${canon.aRole}/${canon.bRole})가 없습니다: ${roleLine.trim()}`,
  );
  const directionLine = text.split("\n").find((line) => line.includes("방향 흐름")) || "";
  check(
    directionLine.includes("순행") && directionLine.includes("역행"),
    `방향 흐름 줄에 순행·역행이 없습니다: ${directionLine.trim()}`,
  );
}

// ── 6. 화면 표시 ─────────────────────────────────────────────────────────────
// 사고 이력을 적어 둔 주석은 남겨 두고, 실제로 렌더되는 코드에서만 금지한다.
const clientCode = clientSource
  .split("\n")
  .filter((line) => !line.trim().startsWith("//"))
  .join("\n");
check(
  !clientCode.includes("공진자"),
  `${CLIENT} 에 '공진자' 가 남아 있습니다 — 21개 거리의 자리를 하나로 뭉개던 표기입니다`,
);
check(
  clientSource.includes("data-sy-role-direction"),
  `${CLIENT} 에 자리 방향 섹션 마커(data-sy-role-direction)가 없습니다 — 결과 화면이 자리를 안 보여 줍니다`,
);

// ── 7. React 휠(SukuyoWheel.tsx) 자리 파리티 ─────────────────────────────────
{
  const wheelSource = read(REACT_WHEEL);
  const WHEEL_START = "function relationFromDistance(distance: number)";
  const WHEEL_END = "function indexOfHanja(";
  const start = wheelSource.indexOf(WHEEL_START);
  const end = wheelSource.indexOf(WHEEL_END);
  // 앵커가 사라지면 통과시키지 않는다(fail-closed).
  check(start >= 0, `${REACT_WHEEL} 에서 '${WHEEL_START}' 를 찾지 못했습니다 — 자리 대조를 못 합니다`);
  check(end > start, `${REACT_WHEEL} 에서 '${WHEEL_END}' 를 찾지 못했습니다 — 자리 대조를 못 합니다`);
  if (start >= 0 && end > start) {
    // TS 타입 주석만 걷어내면 그대로 평가 가능한 순수 함수다.
    const block = wheelSource
      .slice(start, end)
      .replace("(distance: number): { short: string; color: string }", "(distance)");
    const sandbox = {};
    vm.createContext(sandbox);
    let ok = true;
    try {
      vm.runInContext(`${block}
this.relationFromDistance = relationFromDistance;`, sandbox, {
        filename: REACT_WHEEL,
      });
    } catch (error) {
      ok = false;
      check(false, `${REACT_WHEEL} 자리 블록 평가 실패: ${error.message}`);
    }
    check(
      !ok || typeof sandbox.relationFromDistance === "function",
      `${REACT_WHEEL} 에서 relationFromDistance 를 꺼내지 못했습니다 — 정본 대조 불가`,
    );
    if (ok && typeof sandbox.relationFromDistance === "function") {
      const mismatches = [];
      for (let d = 0; d < 27; d += 1) {
        const canon = relationFromForwardDistance(d);
        const got = sandbox.relationFromDistance(d);
        if (!got || got.short !== canon.aRole) {
          mismatches.push(`D=${d} 정본 ${canon.aRole} vs 휠 ${got && got.short}`);
        }
      }
      check(
        mismatches.length === 0,
        `${REACT_WHEEL} 자리가 정본과 어긋납니다: ${mismatches.join(" / ")}`,
      );
    }
  }
}

// ── 8. 관계 판정 단일 payload — 자리·거리·방향·해설 키가 정본에서 파생되는가 ──────
// 화면이 payload 하나만 보도록 바꾼 뒤이므로, 이 객체가 틀리면 상단 배지·요약·방향
// 문구가 한꺼번에 틀린다. 27거리 전부를 정본과 대조하고 A/B 역전까지 확인한다.
if (clientRoles) {
  const ACTING_ROLES = new Set(["영", "우", "괴", "성", "업"]);
  const RECEIVING_ROLES = new Set(["친", "쇠", "안", "위", "태"]);
  const expectedDistanceLabel = (shortest, relationType) => {
    if (relationType === "명" && shortest === 0) return "동숙";
    if (relationType === "업태") return "특수관계";
    if (shortest <= 4) return "근거리";
    if (shortest <= 10) return "중거리";
    return "원거리";
  };
  const expectedTier = (shortest) => {
    if (shortest === 0) return "same";
    if (shortest <= 4) return "near";
    if (shortest <= 10) return "middle";
    return "far";
  };
  const problems = [];
  for (let d = 0; d < 27; d += 1) {
    const canon = relationFromForwardDistance(d);
    const payload = clientRoles.syBuildRelationDirection(d);
    if (!payload) {
      problems.push(`D=${d} payload 가 null 입니다`);
      continue;
    }
    if (payload.personARole !== canon.aRole || payload.personBRole !== canon.bRole) {
      problems.push(
        `D=${d} 자리 불일치 — 정본 ${canon.aRole}/${canon.bRole} vs payload ${payload.personARole}/${payload.personBRole}`,
      );
    }
    if (payload.relationType !== canon.relationType) {
      problems.push(`D=${d} 관계명 불일치 — 정본 ${canon.relationType} vs payload ${payload.relationType}`);
    }
    const shortest = Math.min(d, (27 - d) % 27);
    if (payload.distance.shortest !== shortest) {
      problems.push(`D=${d} 최단거리 불일치 — ${shortest} vs ${payload.distance.shortest}`);
    }
    if (payload.distance.tier !== expectedTier(shortest)) {
      problems.push(`D=${d} 거리 구간 불일치 — ${expectedTier(shortest)} vs ${payload.distance.tier}`);
    }
    if (payload.distance.label !== expectedDistanceLabel(shortest, canon.relationType)) {
      problems.push(
        `D=${d} 거리 라벨 불일치 — ${expectedDistanceLabel(shortest, canon.relationType)} vs ${payload.distance.label}`,
      );
    }
    const expectedCode = ACTING_ROLES.has(canon.aRole)
      ? "a-to-b"
      : (RECEIVING_ROLES.has(canon.aRole) ? "b-to-a" : "mutual");
    if (payload.direction.code !== expectedCode) {
      problems.push(`D=${d} 방향 불일치 — ${expectedCode} vs ${payload.direction.code}`);
    }
    const expectedKey = `${canon.relationType}:${canon.aRole}:${expectedTier(shortest)}`;
    if (payload.interpretationKey !== expectedKey) {
      problems.push(`D=${d} 해설 키 불일치 — ${expectedKey} vs ${payload.interpretationKey}`);
    }
    // A/B 를 바꾸면 두 자리가 정확히 뒤집혀야 한다.
    const mirrored = clientRoles.syBuildRelationDirection((27 - d) % 27);
    if (!mirrored || mirrored.personARole !== payload.personBRole || mirrored.personBRole !== payload.personARole) {
      problems.push(`D=${d} A/B 역전 실패 — ${payload.personARole}/${payload.personBRole} 의 반대가 아닙니다`);
    }
    if (mirrored && payload.direction.code !== "mutual" && mirrored.direction.code === payload.direction.code) {
      problems.push(`D=${d} A/B 를 바꿔도 방향이 그대로입니다(${payload.direction.code})`);
    }
  }
  check(problems.length === 0, `관계 판정 payload 가 정본과 어긋납니다: ${problems.join(" / ")}`);
}

// 화면이 payload 를 실제로 쓰는지 — 마커가 사라지면 상단 배지·요약이 죽은 것이다.
check(
  clientSource.includes("data-sy-relation-summary="),
  `${CLIENT} 에 판정 요약 섹션 마커(data-sy-relation-summary)가 없습니다`,
);
check(
  clientSource.includes("data-sy-role-badge="),
  `${CLIENT} 에 상단 자리 배지 마커(data-sy-role-badge)가 없습니다`,
);
check(
  clientSource.includes("resolved.relationDirection = syBuildRelationDirection(D)"),
  `${CLIENT} 의 SukuyoCompatEngine.resolve 가 관계 판정 payload 를 싣지 않습니다`,
);


// ── 9. 관계 해설 14장 — 본문·시점 분리·어조 ────────────────────────────────
if (clientRoles) {
  const seats = clientRoles.SY_SEAT_CHAPTERS;
  const CHAPTER_IDS = [
    "essence", "role", "attraction", "emotionFlow", "overTime", "romance",
    "longTerm", "conflict", "repair", "friendship", "work", "caution", "usage",
  ];
  const SEATS = ["명", "영", "친", "우", "쇠", "안", "괴", "성", "위", "업", "태"];
  const BANNED = ["최악", "무조건", "반드시", "절대", "틀림없", "100%"];
  const textProblems = [];

  for (const seat of SEATS) {
    const entry = seats && seats[seat];
    if (!entry) {
      textProblems.push(`자리 ${seat} 의 해설이 없습니다`);
      continue;
    }
    for (const id of CHAPTER_IDS) {
      const body = entry[id];
      if (typeof body !== "string" || body.trim().length < 30) {
        textProblems.push(`${seat}.${id} 본문이 비었거나 너무 짧습니다`);
        continue;
      }
      for (const word of BANNED) {
        if (body.includes(word)) textProblems.push(`${seat}.${id} 에 단정 어조 '${word}' 가 있습니다`);
      }
    }
  }
  check(textProblems.length === 0, `관계 해설 본문이 규칙을 벗어났습니다: ${textProblems.join(" / ")}`);

  const buildProblems = [];
  const seenKeys = new Set();
  for (let d = 0; d < 27; d += 1) {
    const payload = clientRoles.syBuildRelationDirection(d);
    const built = payload ? clientRoles.syBuildRelationChapters(payload) : null;
    if (!built) {
      buildProblems.push(`D=${d} 챕터 조립 실패`);
      continue;
    }
    seenKeys.add(built.interpretationKey);
    if (built.interpretationKey !== payload.interpretationKey) {
      buildProblems.push(`D=${d} 해설 키가 payload 와 다릅니다`);
    }
    if (built.chapters.length !== 14) {
      buildProblems.push(`D=${d} 챕터가 14장이 아닙니다(${built.chapters.length})`);
    }
    for (const ch of built.chapters) {
      const filled = ch.single ? ch.single : (ch.me && ch.other);
      if (!filled) buildProblems.push(`D=${d} '${ch.title}' 본문이 비었습니다`);
    }
    // 나 중심 = 내 자리 본문, 상대 중심 = 상대 자리 본문. 자리가 다르면 두 본문도 달라야 한다.
    const essence = built.chapters.find((c) => c.id === "essence");
    if (essence) {
      if (essence.me !== seats[payload.personARole].essence) {
        buildProblems.push(`D=${d} 나 중심 본문이 내 자리(${payload.personARole}) 것이 아닙니다`);
      }
      if (essence.other !== seats[payload.personBRole].essence) {
        buildProblems.push(`D=${d} 상대 중심 본문이 상대 자리(${payload.personBRole}) 것이 아닙니다`);
      }
      if (payload.personARole !== payload.personBRole && essence.me === essence.other) {
        buildProblems.push(`D=${d} 자리가 다른데 나/상대 본문이 같습니다`);
      }
    }
    if (built.tier.key !== payload.distance.tier) {
      buildProblems.push(`D=${d} 거리 수식자가 payload 구간과 다릅니다`);
    }
    if (!built.tier.axes || built.tier.axes.length !== 5) {
      buildProblems.push(`D=${d} 거리 수식자 축이 5개가 아닙니다`);
    }
    if (!built.synthesis || built.synthesis.length < 40) {
      buildProblems.push(`D=${d} 종합 문단이 비었습니다`);
    }
  }
  check(buildProblems.length === 0, `관계 해설 조립이 어긋납니다: ${buildProblems.join(" / ")}`);
  // 27거리에서 실제로 나오는 해설 키는 25종이다(영친은 원거리가, 업태·명은 한 구간만 존재).
  check(
    seenKeys.size === 25,
    `27거리에서 나온 해설 키가 25종이 아닙니다(${seenKeys.size}종) — 거리 구간 규칙이 바뀌었는지 확인하세요`,
  );
}

check(
  clientSource.includes("data-sy-relation-chapters="),
  `${CLIENT} 에 관계 해설 14장 섹션 마커(data-sy-relation-chapters)가 없습니다`,
);
check(
  clientSource.includes("syBuildRelationChapters(dirPayload)"),
  `${CLIENT} 의 결과 렌더러가 관계 해설 챕터를 조립하지 않습니다`,
);


// ── 10. 전생 서사 — 자리별 조립·시점 분리·어조 ─────────────────────────────
if (clientRoles) {
  const pastSeats = clientRoles.SY_SEAT_PASTLIFE;
  const PAST_FIELDS = ["scene", "trace", "task"];
  const PAST_SEATS = ["명", "영", "친", "우", "쇠", "안", "괴", "성", "위", "업", "태"];
  const PAST_BANNED = ["최악", "무조건", "반드시", "절대", "틀림없", "100%"];
  const pastProblems = [];

  for (const seat of PAST_SEATS) {
    const entry = pastSeats && pastSeats[seat];
    if (!entry) {
      pastProblems.push(`자리 ${seat} 의 전생 서사가 없습니다`);
      continue;
    }
    for (const field of PAST_FIELDS) {
      const body = entry[field];
      if (typeof body !== "string" || body.trim().length < 30) {
        pastProblems.push(`${seat}.${field} 전생 본문이 비었거나 너무 짧습니다`);
        continue;
      }
      for (const word of PAST_BANNED) {
        if (body.includes(word)) pastProblems.push(`${seat}.${field} 에 단정 어조 '${word}' 가 있습니다`);
      }
    }
  }

  for (let d = 0; d < 27; d += 1) {
    const payload = clientRoles.syBuildRelationDirection(d);
    const built = payload ? clientRoles.syBuildPastLifeChapter(payload) : null;
    if (!built) {
      pastProblems.push(`D=${d} 전생 서사 조립 실패`);
      continue;
    }
    if (built.interpretationKey !== payload.interpretationKey) {
      pastProblems.push(`D=${d} 전생 서사 키가 payload 와 다릅니다`);
    }
    for (const field of PAST_FIELDS) {
      const pair = built[field];
      if (!pair || !pair.me || !pair.other) {
        pastProblems.push(`D=${d} 전생 ${field} 본문이 비었습니다`);
        continue;
      }
      // 나 = 내 자리 본문, 상대 = 상대 자리 본문. 자리가 다르면 두 본문도 달라야 한다.
      if (pair.me !== pastSeats[payload.personARole][field]) {
        pastProblems.push(`D=${d} 전생 ${field} 의 나 본문이 내 자리(${payload.personARole}) 것이 아닙니다`);
      }
      if (pair.other !== pastSeats[payload.personBRole][field]) {
        pastProblems.push(`D=${d} 전생 ${field} 의 상대 본문이 상대 자리(${payload.personBRole}) 것이 아닙니다`);
      }
      if (payload.personARole !== payload.personBRole && pair.me === pair.other) {
        pastProblems.push(`D=${d} 전생 ${field} 에서 자리가 다른데 나/상대 본문이 같습니다`);
      }
    }
  }
  check(pastProblems.length === 0, `전생 서사가 규칙을 벗어났습니다: ${pastProblems.join(" / ")}`);
}

// 되살린 전생 원문(archiveStory·mission·archive 변주)도 같은 어조 규칙을 받는다.
{
  const surfaced = clientSource.match(/^\s*(?:archiveStory|mission|archive)\s*:\s*'[^']*'/gm) || [];
  check(
    surfaced.length >= 12,
    `${CLIENT} 에서 전생 원문(archiveStory/mission) 을 ${surfaced.length}줄밖에 찾지 못했습니다 — 키 이름이 바뀌었는지 확인하세요`,
  );
  const harsh = surfaced.filter((line) =>
    ["최악", "무조건", "틀림없", "100%"].some((word) => line.includes(word)),
  );
  check(
    harsh.length === 0,
    `화면에 실리는 전생 원문에 단정 어조가 있습니다: ${harsh.map((l) => l.trim().slice(0, 40)).join(" / ")}`,
  );
}

check(
  clientSource.includes('data-sy-past-life="20260916-sukuyo-past-life-chapter"'),
  `${CLIENT} 에 전생 서사 섹션 마커(data-sy-past-life)가 없습니다`,
);
check(
  clientSource.includes("syBuildPastLifeChapter(dirPayload)"),
  `${CLIENT} 의 결과 렌더러가 전생 서사를 조립하지 않습니다`,
);

if (failures.length) {
  console.error("[verify-sukuyo-role-direction] FAILED");
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log("[verify-sukuyo-role-direction] OK");
