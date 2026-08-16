#!/usr/bin/env node
/**
 * 네오 팩폭 작전실 품질 가드(정적).
 * LLM 호출 없이 챕터 레지스트리 불변식만 검사한다:
 *  - 1차 브리핑 2만 자, 2차 정예 명령 8천 자 이상(각각 별도 목표)
 *  - 타고난 성향은 1차에만, 30일 전략은 2차에만
 *  - 주제 카테고리 챕터가 1차에 존재
 *  - 자미두수 별 세기 가중 지시가 프롬프트에 주입됨
 *  - 유료 상담 공통 출력 계약(근거 먼저·사고과정 비노출·경향 표현)이 프롬프트에 실림
 * 사용: node scripts/verify-neo-operation-room-quality.mjs
 */
import {
  NEO_INITIAL_SECTIONS,
  NEO_REFINED_SECTIONS,
  buildNeoInitialSectionPrompt,
} from "../worker/lib/neo-operation-room-prompt.js";
import { REASONING_OUTPUT_RULE_LINES } from "../worker/lib/fortune-reasoning-contract.js";

// 1차 브리핑이 상품 본편이라 홈 카드가 광고하는 분량(2만 자)을 그대로 계약값으로 박는다.
// 2차 정예 명령은 후속 대화라 목표가 다르다 — 한 상수로 묶으면 1차를 올릴 때 2차 문턱까지
// 같이 끌려 올라가 통과할 수 없는 가드가 된다.
const INITIAL_TARGET_CHARS = 20000;
const REFINED_TARGET_CHARS = 8000;
const failures = [];
const ok = (cond, msg) => { if (!cond) failures.push(msg); };

const initTotal = NEO_INITIAL_SECTIONS.reduce((s, c) => s + c.minChars, 0);
const refinedTotal = NEO_REFINED_SECTIONS.reduce((s, c) => s + c.minChars, 0);
ok(initTotal >= INITIAL_TARGET_CHARS, `1차 minChars 합계 ${initTotal} < ${INITIAL_TARGET_CHARS}`);
ok(refinedTotal >= REFINED_TARGET_CHARS, `2차 minChars 합계 ${refinedTotal} < ${REFINED_TARGET_CHARS}`);

const initIds = NEO_INITIAL_SECTIONS.map((c) => c.id);
const refinedIds = NEO_REFINED_SECTIONS.map((c) => c.id);
ok(initIds.includes("innateCore") && initIds.includes("innateStrength"), "1차에 타고난 성향 챕터 누락");
ok(!refinedIds.includes("innateRecheck"), "2차에 타고난 성향 재확인이 남아있음(제거 대상)");
ok(["topicStyle", "topicAreaBreakdown", "topicTiming"].every((id) => initIds.includes(id)), "1차에 주제 카테고리 챕터 누락");
ok(refinedIds.includes("thirtyDayWeek12") && refinedIds.includes("thirtyDayWeek34"), "2차에 30일 전략 챕터 누락");
ok(!initIds.some((id) => /thirtyDay/.test(id)), "1차에 30일 전략이 남아있음(2차로 이동해야 함)");

// 타고난 성향(innateCore)이 주제/작전 챕터보다 앞선다(신뢰 우선).
const innateIdx = initIds.indexOf("innateCore");
const topicIdx = initIds.indexOf("topicStyle");
ok(innateIdx >= 0 && innateIdx < topicIdx, "타고난 성향이 주제 카테고리보다 앞서야 함");

// 자미두수 별 세기 지시 주입 확인.
const ziweiCtx = { selectedMethod: "ziwei", topic: "돈/재물", intensity: "roar", question: "q", methodSummary: {} };
const areaSection = NEO_INITIAL_SECTIONS.find((c) => c.id === "topicAreaBreakdown");
const prompt = buildNeoInitialSectionPrompt(areaSection, ziweiCtx);
ok(prompt.includes("별 세기"), "자미두수 별 세기 가중 지시가 프롬프트에 없음");
ok(prompt.includes("자미두수 명반 대가"), "자미두수 전문가 페르소나가 프롬프트에 없음");

// 유료 상담 공통 출력 계약(fortune-reasoning-contract.js)이 실제로 프롬프트에 실려야 한다.
// 상수만 import 해 두고 프롬프트에 안 붙는 실수를 여기서 잡는다.
for (const line of REASONING_OUTPUT_RULE_LINES) {
  ok(prompt.includes(line), `공통 출력 계약 라인이 프롬프트에 없음: ${line.slice(0, 24)}…`);
}
// 🔴 이 지시는 반드시 한글 라벨 표([계산 확정값])를 가리켜야 한다. 예전에는 계산 객체를 JSON 으로
// 통째로 실은 [계산 요약 데이터] 를 가리켜서, "이름 그대로 인용"이 camelCase 키를 인용하라는 뜻이
// 됐고 상담문에 "sanFangSiZheng.lifePalace.mainStars" 가 노출됐다.
ok(prompt.includes("[계산 확정값]에 실제로 있는 항목명"), "근거 인용 지시가 프롬프트에 없음");
ok(!prompt.includes("[계산 요약 데이터]"), "raw JSON 덤프 블록이 되살아났다 — 내부 키가 다시 샌다");
// 어조는 여전히 팩폭 강도 지침이 결정한다 — 공통 계약이 페르소나를 덮으면 안 된다.
ok(prompt.includes("[팩폭 강도 지침]"), "팩폭 강도 지침이 프롬프트에서 사라짐");

if (failures.length) {
  console.error("[verify-neo] 실패:");
  failures.forEach((f) => console.error("  - " + f));
  process.exit(1);
}
console.log(`[verify-neo] OK — 1차 ${NEO_INITIAL_SECTIONS.length}챕터/${initTotal}자(목표 ${INITIAL_TARGET_CHARS}), 2차 ${NEO_REFINED_SECTIONS.length}챕터/${refinedTotal}자(목표 ${REFINED_TARGET_CHARS})`);
