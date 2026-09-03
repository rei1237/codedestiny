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
    const missing = ["SY_ROLE_PROFILE", "SY_ROLE_RELATION", "syRoleFromForwardDistance"].filter(
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

if (failures.length) {
  console.error("[verify-sukuyo-role-direction] FAILED");
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log("[verify-sukuyo-role-direction] OK");
