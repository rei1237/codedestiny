#!/usr/bin/env node
// 휴먼 디자인 AI 해석 — 러너블 검증 하네스
//
// 🔴🔴 **과금 LLM 실호출 없음.** 이 스크립트는 네트워크를 쓰지 않는다. Gemini 키를 지우고
//    (`GEMINIF_API_KEY` 등 3종) 프롬프트 조립·확정표·사후 검산·폴백 문턱을 순수 함수로만
//    검사한다. CLAUDE.md 절대 규칙 1번을 그대로 따른다 — mock 이 기본이고 실호출은 없다.
//
// 검사하는 계약
//   ① 프롬프트에 출생 데이터가 들어가지 않는다 (요구사항 23의 핵심)
//   ② 확정값(타입·전략·권위·프로파일·정의·크로스·센터·채널·26활성)이 전부 실린다
//   ③ 재계산 금지 지시가 프롬프트에 있다
//   ④ 계산 결과가 온전하지 않으면 프롬프트를 만들지 않고 던진다 (fail-closed)
//   ⑤ 사후 검산이 "모델이 자기가 계산한" 흔적을 잡는다
//   ⑥ 폴백 수용 문턱(fallbackMinChars)이 최소 분량의 40%로 선언돼 있다
//   ⑦ 라우트가 그 문턱과 사후 검산을 실제로 호출한다
//
//   실행: node scripts/verify-human-design-ai.mjs

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// 🔴 실호출 경로를 확실히 죽인다. 이 스크립트는 어떤 경우에도 LLM 을 부르지 않는다.
for (const key of ["GEMINIF_API_KEY", "GEMINI_API_KEY", "GOOGLE_GEMINI_API_KEY"]) {
  delete process.env[key];
}

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const failures = [];
function check(label, condition, detail = "") {
  if (condition) {
    console.log(`✅ ${label}`);
    return true;
  }
  console.log(`❌ ${label}${detail ? ` — ${detail}` : ""}`);
  failures.push(detail ? `${label} (${detail})` : label);
  return false;
}

const prompt = await import(new URL("../worker/lib/human-design-ai-prompt.js", import.meta.url).href);
const { assembleChart } = await import(new URL("../lib/human-design/chart.js", import.meta.url).href);

// ── 고정 입력: fixture 스냅샷의 검증된 차트 하나를 그대로 쓴다 ───────────────
//
// 새로 지어낸 황경이 아니라 외부 계산기와 520셀 대조가 끝난 케이스라, 여기서 만든
// 확정표는 실제 상품이 모델에게 보내는 것과 같은 모양이다.
const snapshotDoc = JSON.parse(readFileSync(
  path.join(repoRoot, "__tests__", "fixtures", "human-design", "ephemeris-snapshot.json"),
  "utf8",
));
const FIXTURE_ID = "kr-jeonju-1991-02-20-0830";
const row = snapshotDoc.rows.find((entry) => entry.id === FIXTURE_ID);
check(`검증된 fixture(${FIXTURE_ID}) 스냅샷을 찾았다`, Boolean(row));

const chart = assembleChart({
  personalityLongitudes: row.personality,
  designLongitudes: row.design,
  birthInput: {
    birthDate: "1991-02-20",
    birthTime: "08:30",
    timezone: "Asia/Seoul",
    solarDate: { year: 1991, month: 2, day: 20 },
    utcOffsetHours: 9,
  },
  moments: { birthUtc: row.birthUtc, designUtc: row.designUtc },
  calculatedAt: "2026-08-23T00:00:00.000Z",
});

// ── ① 출생 데이터 미포함 ────────────────────────────────────────────────────

const built = prompt.buildHumanDesignAIPrompt({ calculation: chart });
const promptText = `${built.systemPrompt}\n${built.prompt}`;

const BIRTH_LEAKS = [
  ["생년월일", "1991-02-20"],
  ["출생 시각", "08:30"],
  ["타임존", "Asia/Seoul"],
  ["출생 UTC", row.birthUtc],
  ["디자인 순간 UTC", row.designUtc],
  ["출생 연도", "1991년"],
];
const leaked = BIRTH_LEAKS.filter(([, needle]) => promptText.includes(needle)).map(([label]) => label);
check(
  "🔴 프롬프트에 출생 데이터가 들어가지 않는다 (모델이 재계산하지 못하게 하는 핵심 계약)",
  leaked.length === 0,
  leaked.join(", "),
);
check(
  "확정표에도 출생 데이터가 없다",
  !JSON.stringify(built.factSnapshot).includes("1991") && !JSON.stringify(built.factSnapshot).includes("Asia/Seoul"),
);

// ── ② 확정값이 전부 실린다 ─────────────────────────────────────────────────

const snapshot = built.factSnapshot;
check("확정표에 타입이 있다", snapshot.type === "Manifesting Generator", snapshot.type);
check("확정표에 권위가 있다", snapshot.authority === "Sacral", snapshot.authority);
check("확정표에 프로파일이 있다", snapshot.profile === "1/3", snapshot.profile);
check("확정표에 정의가 있다", snapshot.definition === "Single", snapshot.definition);
check("확정표에 26 활성이 전부 있다", snapshot.activations.length === 26, String(snapshot.activations.length));
check(
  "확정표의 센터가 9개로 갈린다",
  snapshot.definedCenters.length + snapshot.undefinedCenters.length === 9,
);
check("확정표에 인카네이션 크로스가 있다", snapshot.incarnationCross.notation === "55/59 | 34/20", snapshot.incarnationCross.notation);

const REQUIRED_IN_PROMPT = [
  ["타입", snapshot.type],
  ["전략", snapshot.strategy],
  ["권위", snapshot.authority],
  ["프로파일", snapshot.profile],
  ["정의", snapshot.definition],
  ["시그니처", snapshot.signature],
  ["낫셀프", snapshot.notSelfTheme],
  ["크로스 표기", snapshot.incarnationCross.notation],
];
const missingInPrompt = REQUIRED_IN_PROMPT.filter(([, value]) => !built.prompt.includes(value)).map(([label]) => label);
check("프롬프트에 확정값이 전부 실린다", missingInPrompt.length === 0, missingInPrompt.join(", "));

check(
  "프롬프트에 26 활성이 모두 실린다",
  snapshot.activations.every((activation) => built.prompt.includes(`${activation.planet} ${activation.gate}.${activation.line}`)),
);
check(
  "프롬프트에 완성 채널이 모두 실린다",
  snapshot.channels.every((channel) => built.prompt.includes(channel.channelId)),
  `${snapshot.channels.length}개`,
);
check("섹션이 10개 지정된다", prompt.HD_AI_SECTIONS.length === 10, String(prompt.HD_AI_SECTIONS.length));
check(
  "프롬프트에 섹션 키가 전부 지정된다",
  prompt.HD_AI_SECTIONS.every((section) => built.prompt.includes(`"${section.key}"`)),
);

// ── ③ 재계산 금지 지시 ─────────────────────────────────────────────────────

check("재계산 금지가 프롬프트에 못박혀 있다", /다시 계산하거나 다른 값으로 바꾸지 마세요/.test(built.prompt));
check("출생 데이터 추측 금지가 못박혀 있다", /출생 날짜·시각·장소는 제공되지 않습니다/.test(built.prompt));
check("확정값 변경 금지가 못박혀 있다", /위 값과 다르게 쓰면 안 됩니다/.test(built.prompt));
check("없는 채널·센터 날조 금지가 못박혀 있다", /없는 채널이나 정의된 센터를 있다고 쓰지 마세요/.test(built.prompt));

// ── ④ fail-closed ──────────────────────────────────────────────────────────

const BROKEN_CASES = [
  ["계산 결과 자체가 없음", null],
  ["타입 누락", { ...chart, type: "" }],
  ["권위 누락", { ...chart, authority: "" }],
  ["활성이 26개가 아님", { ...chart, activations: chart.activations.slice(0, 12) }],
  ["채널 배열 누락", { ...chart, channels: undefined }],
  ["크로스 누락", { ...chart, incarnationCross: {} }],
];
for (const [label, broken] of BROKEN_CASES) {
  let threw = false;
  try {
    prompt.buildHumanDesignAIPrompt({ calculation: broken });
  } catch {
    threw = true;
  }
  check(`fail-closed: ${label} 이면 프롬프트를 만들지 않고 던진다`, threw);
}

// ── ⑤ 사후 검산 ────────────────────────────────────────────────────────────

const goodText = [
  `이 차트는 ${snapshot.type} 입니다.`,
  `내적 권위는 ${snapshot.authority} 이고, 프로파일은 ${snapshot.profile} 입니다.`,
  "게이트 34와 20이 이루는 채널 20-34 가 목과 천골을 잇습니다.",
].join(" ");
const goodVerdict = prompt.validateHumanDesignInterpretation(goodText, snapshot);
check("정상 출력은 사후 검산을 통과한다", goodVerdict.ok, goodVerdict.violations.join(" / "));

const BAD_CASES = [
  ["타입이 본문에 없음", `권위는 ${snapshot.authority}, 프로파일은 ${snapshot.profile} 입니다.`],
  ["권위가 본문에 없음", `${snapshot.type} 이고 프로파일은 ${snapshot.profile} 입니다.`],
  ["프로파일이 본문에 없음", `${snapshot.type} 이고 권위는 ${snapshot.authority} 입니다.`],
  [
    "남의 프로파일을 이 사람 것처럼 씀",
    `${snapshot.type} · ${snapshot.authority} · ${snapshot.profile} 인데 당신은 2/4 의 삶을 삽니다.`,
  ],
];
for (const [label, text] of BAD_CASES) {
  const verdict = prompt.validateHumanDesignInterpretation(text, snapshot);
  check(`사후 검산이 잡는다: ${label}`, verdict.ok === false, verdict.violations.join(" / "));
}

// ── ⑥ 폴백 문턱 ────────────────────────────────────────────────────────────

check(
  "최소 분량이 선언돼 있다",
  Number.isInteger(prompt.HD_AI_MIN_RESULT_CHARS) && prompt.HD_AI_MIN_RESULT_CHARS >= 1000,
  String(prompt.HD_AI_MIN_RESULT_CHARS),
);
check(
  "🔴 폴백 수용 문턱이 최소 분량의 40% 다 (안 주면 8% 분량이 정상 결제 결과가 된다)",
  prompt.HD_AI_FALLBACK_MIN_CHARS === Math.round(prompt.HD_AI_MIN_RESULT_CHARS * 0.4),
  `${prompt.HD_AI_FALLBACK_MIN_CHARS} vs ${Math.round(prompt.HD_AI_MIN_RESULT_CHARS * 0.4)}`,
);

// ── ⑦ 라우트 배선 ──────────────────────────────────────────────────────────

const routeSource = readFileSync(path.join(repoRoot, "worker", "routes", "human-design.js"), "utf8");
function codeLines(text) {
  return text.split(/\r?\n/).filter((line) => {
    const trimmed = line.trim();
    return trimmed && !trimmed.startsWith("//") && !trimmed.startsWith("*") && !trimmed.startsWith("/*");
  }).join("\n");
}
const routeCode = codeLines(routeSource);

// 🔴 2026-09: 해석 생성은 은퇴했다. 차트가 무료가 되면 이 라우트의 유일한 관문이었던
//    "계산 문서가 존재한다" 를 누구나 만들 수 있어 관문이 아니게 되기 때문이다.
//    남은 계약은 "이미 결제해 저장된 해석의 읽기" 하나이며, 새 분석은 프리미엄 리포트가 맡는다.
check("라우트에 /interpretation 이 배선돼 있다", /path === "\/interpretation"/.test(routeCode));
check("은퇴 응답(410)을 준다", /INTERPRETATION_RETIRED/.test(routeCode));
check("대체 경로를 함께 알려 준다", /human-design-report/.test(routeCode));
check("🔴 라우트에서 LLM 을 부르지 않는다", !/callGemini/.test(routeCode));
check("🔴 라우트가 해석을 새로 저장하지 않는다", !/archiveInterpretation/.test(routeCode));
check("이미 결제한 해석의 읽기 경로는 남아 있다", /findArchivedInterpretation\s*\(/.test(routeCode));
// 🔴 이름 grep 이 아니라 **함수 본문**을 잘라 본다. 차트 조회는 실패를 null 로 접어도 되지만
//    (다시 계산하면 그만) 해석 조회는 그러면 안 된다 — 접는 순간 DB 장애가 410("해석 없음")으로
//    세탁돼 이미 결제한 사용자가 자기 결과를 영영 못 본다.
const interpLookupStart = routeSource.indexOf("async function findArchivedInterpretation");
const interpLookupEnd = routeSource.indexOf("async function handleInterpretation", interpLookupStart + 1);
const interpLookupBody = interpLookupStart < 0 || interpLookupEnd < 0
  ? ""
  : routeSource.slice(interpLookupStart, interpLookupEnd);
check(
  "🔴 해석 읽기 실패를 null 로 접지 않는다 (DB 장애가 '해석 없음'으로 세탁되면 결제자가 못 본다)",
  interpLookupBody.length > 0 && !/catch/.test(interpLookupBody),
  interpLookupBody ? "catch 로 접고 있다" : "함수를 찾지 못했다",
);

const featureKeyUsages = [...routeCode.matchAll(/featureKey\s*:\s*([A-Za-z_$][\w$]*|"[^"]*")/g)]
  .map((match) => match[1]);
check(
  "🔴 무료 라우트에 featureKey 사용처가 없다",
  featureKeyUsages.length === 0,
  `featureKey 사용처: ${featureKeyUsages.join(", ") || "없음"}`,
);
const featureKeyConstants = [...routeCode.matchAll(/const\s+[\w$]*FEATURE_KEY[\w$]*\s*=\s*"([^"]+)"/g)]
  .map((match) => match[1]);
check(
  "🔴 무료 라우트에 결제 키 상수가 없다",
  featureKeyConstants.length === 0,
  featureKeyConstants.join(", "),
);
check(
  "🔴 클라이언트가 보낸 차트를 믿지 않는다",
  !/body\??\.\s*chart/.test(routeCode),
);

// 프롬프트 모듈 자체가 출생 데이터를 읽지 않는지 소스로 확인한다.
const promptSource = codeLines(readFileSync(path.join(repoRoot, "worker", "lib", "human-design-ai-prompt.js"), "utf8"));
check(
  "🔴 프롬프트 모듈이 birthInput 을 읽지 않는다",
  !/birthInput/.test(promptSource),
);
check(
  "🔴 프롬프트 모듈이 moments(출생·디자인 시각)를 읽지 않는다",
  !/\.moments/.test(promptSource),
);
check(
  "🔴 프롬프트 모듈이 LLM 을 직접 부르지 않는다 (조립만 한다)",
  !/callGemini|callLLM|env\.AI\.run|fetch\s*\(/.test(promptSource),
);

// ── 결과 ───────────────────────────────────────────────────────────────────

if (failures.length) {
  console.error(`\n검증 실패 ${failures.length}건:`);
  failures.forEach((line) => console.error(`   - ${line}`));
  process.exit(1);
}
console.log(`\n모든 휴먼 디자인 AI 검증 통과 ✅ (프롬프트 ${built.promptLength}자 · LLM 실호출 0회)`);
