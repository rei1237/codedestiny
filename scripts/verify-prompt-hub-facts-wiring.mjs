#!/usr/bin/env node
// 프롬프트 허브 "산출 데이터" 배선 가드.
//
// 🔴 이 가드가 막는 사고: 계산 모듈(`<도구>-calc.ts`)과 산출 블록 빌더(`*-prompt-facts.ts`)를
//    만들어 두고 `buildComputedFactsFor` 에 case 를 안 붙이면, 화면은 멀쩡하고 프롬프트만 조용히
//    골격으로 떨어진다. 실제로 dangsaju·kusei·meihua 세 모듈이 그 상태로 남아 있었다(PR #1553 후속 #5).
//
// 🔴 fail-closed 규칙(원칙 10): 검사 대상 목록을 손으로 적지 않고 소스에서 전수 발견한다.
//    - 도구 레지스트리 id, `*-calc.ts`, `*-prompt-facts.ts`, 각 모듈의 export 를 파일에서 찾는다.
//    - 발견 결과가 비면 통과가 아니라 실패다.
//    - 동기 빌더는 전부 실행 스모크 샘플이 있어야 한다(없으면 실패). 비동기 빌더는 네트워크
//      왕복(지오코딩·차트 API)이 있어 실행을 건너뛰되, 그 사유를 여기서 자동 판별한다.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadTsModule } from "./lib/load-ts-module.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HUB_DIR = "app/fortune/prompt-hub";
const CLIENT_PATH = `${HUB_DIR}/PromptHubClient.tsx`;

const failures = [];
function check(condition, message) {
  if (!condition) failures.push(message);
}

const clientSource = fs.readFileSync(path.join(root, CLIENT_PATH), "utf8");

// ── 1. 도구 레지스트리 id 전수 발견 ─────────────────────────────────────────────
const toolIds = [...clientSource.matchAll(/^ {4}id: "([a-z][a-z0-9]*)",$/gm)].map((m) => m[1]);
check(toolIds.length >= 10, `도구 레지스트리 id 를 ${toolIds.length}개만 찾았다 — 파싱이 깨졌다(fail-closed).`);

// ── 2. buildComputedFactsFor 본문 추출 ──────────────────────────────────────────
const fnStart = clientSource.indexOf("async function buildComputedFactsFor");
check(fnStart >= 0, "buildComputedFactsFor 를 찾지 못했다 — 이름이 바뀌었다면 이 가드를 함께 고칠 것.");
const rest = fnStart >= 0 ? clientSource.slice(fnStart) : "";
const bodyEnd = rest.search(/\r?\n\}\r?\n/);
check(bodyEnd > 0, "buildComputedFactsFor 본문의 끝을 찾지 못했다(fail-closed).");
const body = bodyEnd > 0 ? rest.slice(0, bodyEnd) : "";

const caseIds = [...body.matchAll(/case "([a-z][a-z0-9]*)"/g)].map((m) => m[1]);
check(caseIds.length >= 6, `buildComputedFactsFor 의 case 를 ${caseIds.length}개만 찾았다 — 파싱이 깨졌다(fail-closed).`);

// ── 3. `<도구>-calc.ts` 는 같은 id 의 case 가 있어야 한다 ──────────────────────
const hubFiles = fs.readdirSync(path.join(root, HUB_DIR));
const calcModules = hubFiles.filter((name) => name.endsWith("-calc.ts")).map((name) => name.replace(/\.ts$/, ""));
check(calcModules.length > 0, `${HUB_DIR} 에서 *-calc.ts 를 하나도 찾지 못했다(fail-closed).`);
for (const moduleName of calcModules) {
  const toolId = moduleName.replace(/-calc$/, "");
  if (!toolIds.includes(toolId)) continue; // 허브 도구가 아닌 계산 모듈은 이 규칙의 대상이 아니다.
  check(
    caseIds.includes(toolId),
    `${HUB_DIR}/${moduleName}.ts 는 도구 "${toolId}" 의 계산기인데 buildComputedFactsFor 에 case "${toolId}" 가 없다 — 프롬프트에 산출값이 실리지 않는다.`,
  );
}

// ── 4. `*-prompt-facts.ts` 는 허브 클라이언트가 반드시 참조해야 한다 ───────────
const factsModules = hubFiles
  .filter((name) => name.endsWith("-prompt-facts.ts"))
  .map((name) => name.replace(/\.ts$/, ""));
check(factsModules.length > 0, `${HUB_DIR} 에서 *-prompt-facts.ts 를 하나도 찾지 못했다(fail-closed).`);
for (const moduleName of factsModules) {
  check(
    clientSource.includes(`"./${moduleName}"`),
    `${HUB_DIR}/${moduleName}.ts 를 PromptHubClient.tsx 가 참조하지 않는다 — 만들어만 두고 배선을 빠뜨린 상태다.`,
  );
}

// ── 5. 동기 빌더 실행 스모크 ────────────────────────────────────────────────────
const BIRTH = {
  birthDate: "1990-11-02",
  calendarType: "양력",
  leapMonth: false,
  birthTime: "12:00",
  birthTimeUnknown: false,
  birthPlace: "서울",
  gender: "남성",
  birthTimezone: "Asia/Seoul",
};

/** 동기 빌더 이름 → 호출 인자. 새 동기 빌더가 생기면 여기 없다는 이유로 아래에서 실패한다. */
const SAMPLES = {
  buildSajuPromptFacts: [BIRTH],
  buildZiweiPromptFacts: [{ ...BIRTH, palace: "명궁" }, { scope: "full" }],
  buildSukuyoPromptFacts: [{ birthDate: BIRTH.birthDate, calendarType: BIRTH.calendarType }],
  buildDangsajuPromptFacts: [{ ...BIRTH, question: "올해 협업의 방향이 궁금합니다.", lifeArea: "관계" }],
  buildKuseiPromptFacts: [{ ...BIRTH, baseDate: "2026-07-01", focusTopic: "이사 방향", question: "동쪽 이동을 고민 중입니다." }],
  buildMeihuaPromptFacts: [{ eventDateTime: "2026-07-08T13:44", question: "제안이 어떤 변화를 열까요?", numberOrSign: "37" }],
};

// 🔴 오행 이름 뒤 조사 검사. 산출 블록은 오행 한 글자를 문장에 그대로 박아서, 조사를 고정
//    문자열로 붙이면 "금가"·"목를" 이 그대로 프롬프트에 나간다(2026-09-04 실제 발생).
//    오탐을 막으려고 (1) 오행 5글자만 보고 (2) 조사 뒤가 공백·문장부호·끝일 때만 센다
//    ("황금가루" 같은 합성어가 걸리지 않는다). 받침 없는 오행의 계사 "이-" 는 활용이 너무
//    넓어 검사 대상에서 뺀다. 받침 없는 쪽의 "과" 도 뺀다 — 자미두수 사화(化科)의 "화과" 가
//    그대로 걸려 오탐이 난다(실측: buildZiweiPromptFacts).
const BAD_ELEMENT_JOSA = [
  ...["목", "금"].flatMap((element) => ["가", "를", "는", "와", "로"].map((josa) => `${element}${josa}`)),
  ...["화", "토", "수"].flatMap((element) => ["을", "은", "으로"].map((josa) => `${element}${josa}`)),
];
const BAD_JOSA_PATTERN = new RegExp(`(${BAD_ELEMENT_JOSA.join("|")})(?=[\\s.,·)\\]]|$)`, "g");

const usedSamples = new Set();
let smokeRan = 0;
let asyncSkipped = 0;

for (const moduleName of factsModules) {
  const relativePath = `${HUB_DIR}/${moduleName}.ts`;
  const source = fs.readFileSync(path.join(root, relativePath), "utf8");
  const builders = [...source.matchAll(/export (async )?function (build\w*PromptFacts)/g)].map((m) => ({
    isAsync: Boolean(m[1]),
    name: m[2],
  }));
  check(builders.length > 0, `${relativePath} 에 build*PromptFacts export 가 없다 — 빌더 이름 규칙이 깨졌다.`);

  for (const builder of builders) {
    if (builder.isAsync) {
      // 비동기 빌더는 지오코딩·차트 API 왕복이 들어 있어 가드에서 실행하지 않는다(과금·네트워크).
      asyncSkipped += 1;
      continue;
    }
    const args = SAMPLES[builder.name];
    if (!args) {
      failures.push(
        `${relativePath} 의 동기 빌더 ${builder.name} 에 실행 스모크 샘플이 없다 — verify-prompt-hub-facts-wiring.mjs 의 SAMPLES 에 추가할 것.`,
      );
      continue;
    }
    usedSamples.add(builder.name);
    let output = "";
    try {
      output = loadTsModule(relativePath)[builder.name](...args);
    } catch (error) {
      failures.push(`${relativePath} 의 ${builder.name} 실행이 예외로 끝났다: ${error?.message || error}`);
      continue;
    }
    smokeRan += 1;
    const lines = String(output || "").split("\n");
    check(String(output || "").trim().length > 0, `${builder.name} 가 빈 산출 블록을 돌려줬다 — 샘플 입력으로도 계산이 실패한다.`);
    check(
      /^\[.+산출 데이터\]$/.test(lines[0] || ""),
      `${builder.name} 의 첫 줄이 "[... 산출 데이터]" 헤더가 아니다: ${JSON.stringify(lines[0] || "")}`,
    );
    check(lines.length >= 5, `${builder.name} 산출 블록이 ${lines.length}줄뿐이다 — 확정값이 거의 실리지 않았다.`);
    const badJosa = [...new Set(String(output || "").match(BAD_JOSA_PATTERN) || [])];
    check(
      badJosa.length === 0,
      `${builder.name} 산출 블록에 오행 조사 오류가 있다: ${badJosa.join(", ")} — 조사를 고정 문자열로 붙이지 말고 받침 판정 헬퍼를 쓸 것.`,
    );
  }
}

for (const name of Object.keys(SAMPLES)) {
  check(usedSamples.has(name), `SAMPLES 의 ${name} 이 어느 모듈에서도 발견되지 않았다 — 낡은 항목이니 지우거나 이름을 맞출 것.`);
}
check(smokeRan > 0, "실행 스모크가 한 건도 돌지 않았다(fail-closed).");

if (failures.length) {
  console.error("❌ 프롬프트 허브 산출 데이터 배선 검증 실패");
  for (const message of failures) console.error(`  - ${message}`);
  process.exit(1);
}

console.log(
  `✅ 프롬프트 허브 산출 데이터 배선 정상 — 도구 ${toolIds.length}개 / case ${caseIds.length}개 / 계산 모듈 ${calcModules.length}개 / 빌더 모듈 ${factsModules.length}개 (동기 스모크 ${smokeRan}건, 비동기 건너뜀 ${asyncSkipped}건)`,
);
