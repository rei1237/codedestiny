#!/usr/bin/env node
/**
 * 네오 팩폭 작전실 품질 가드(정적).
 * LLM 호출 없이 챕터 레지스트리 불변식만 검사한다:
 *  - 1차/2차 각각 minChars 합계가 목표 분량(1만 자) 이상
 *  - 타고난 성향은 1차에만, 30일 전략은 2차에만
 *  - 주제 카테고리 챕터가 1차에 존재
 *  - 자미두수 별 세기 가중 지시가 프롬프트에 주입됨
 * 사용: node scripts/verify-neo-operation-room-quality.mjs
 */
import {
  NEO_INITIAL_SECTIONS,
  NEO_REFINED_SECTIONS,
  buildNeoInitialSectionPrompt,
} from "../worker/lib/neo-operation-room-prompt.js";

const TARGET_CHARS = 10000;
const failures = [];
const ok = (cond, msg) => { if (!cond) failures.push(msg); };

const initTotal = NEO_INITIAL_SECTIONS.reduce((s, c) => s + c.minChars, 0);
const refinedTotal = NEO_REFINED_SECTIONS.reduce((s, c) => s + c.minChars, 0);
ok(initTotal >= TARGET_CHARS, `1차 minChars 합계 ${initTotal} < ${TARGET_CHARS}`);
ok(refinedTotal >= TARGET_CHARS * 0.8, `2차 minChars 합계 ${refinedTotal} < ${TARGET_CHARS * 0.8}`);

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

if (failures.length) {
  console.error("[verify-neo] 실패:");
  failures.forEach((f) => console.error("  - " + f));
  process.exit(1);
}
console.log(`[verify-neo] OK — 1차 ${NEO_INITIAL_SECTIONS.length}챕터/${initTotal}자, 2차 ${NEO_REFINED_SECTIONS.length}챕터/${refinedTotal}자 (목표 ${TARGET_CHARS}자)`);
