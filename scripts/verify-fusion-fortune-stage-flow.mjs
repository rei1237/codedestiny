#!/usr/bin/env node
/**
 * 초융합 운세 **2단계 생성 흐름** 검증 — mock 전용.
 *
 * 분량 계약이 30,000자로 오르면서 생성을 두 요청으로 나눴다(1단계 체계별 6그룹 → 2단계
 * 통합·행동·판정 3그룹). 이 스크립트는 그 흐름의 계약을 인메모리 저장소 + mock 생성기로 밟는다:
 *   - 1단계는 partial 이고 여섯 체계 섹션만 있다(요약·종합·총평 없음).
 *   - 2단계를 앞 결과 없이 부르면 409 STAGE_ONE_MISSING 이고 예약이 소모되지 않는다.
 *   - 2단계 예약 키는 `#s2` 로 분리되며 모델 maxlength(120) 안이다.
 *   - 2단계는 1단계와 병합된 completed 결과이고 가시 텍스트가 30,000자 이상이다.
 *   - 보관본 빌더는 stage 1 → partial, stage 2 → completed 로 같은 멱등 키를 쓴다.
 *   - 옛 보관본(status/stage 없음)은 라우트 응답 기본값으로 completed/2 로 읽힌다.
 *   - 렌더러는 1단계 결과(요약·종합·시기·총평 없음)를 그릴 수 있다.
 *   - 클라이언트는 stage 를 보내고 partial 을 받으면 2단계를 잇는다.
 *
 * 🔴 실제 모델 호출은 하지 않는다. --live 는 거부한다.
 * 사용: node scripts/verify-fusion-fortune-stage-flow.mjs
 */
import fs from "node:fs";
import {
  countFusionFortuneVisibleText,
  createMemoryFusionFortuneStore,
  fusionStageReservationId,
  generateFusionFortuneRequest,
  generateFusionFortuneWithConfiguredLLM,
  hasFusionStageOneResult,
} from "../worker/lib/fusion-fortune.js";
import { FUSION_FORTUNE_LENGTH, FUSION_STAGE_COUNT, fusionGroupsForStage } from "../worker/lib/fusion-fortune-prompt.js";
import { buildFusionConsultationDoc } from "../worker/lib/fusion-fortune-consultation.js";

if (process.argv.includes("--live")) {
  console.error("실호출 경로는 이 스크립트에 없습니다. 필요하면 사용자 허락을 먼저 받고 별도 플래그를 만드세요.");
  process.exit(2);
}

const failures = [];
function check(label, condition, detail = "") {
  if (condition) return;
  failures.push(detail ? `${label} — ${detail}` : label);
}
function read(path) {
  return fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const INPUT = {
  birthDate: "1995-04-18",
  birthTime: "08:30",
  calendarType: "solar",
  gender: "female",
  birthPlace: "Seoul",
  question: "올해 이직을 해도 될까요?",
  locale: "ko",
};
const STAGE_ONE_KEYS = ["sajuSection", "ziweiSection", "vedicSection", "sukuyoSection", "astrologySection", "tarotSection"];
const STAGE_TWO_KEYS = ["integratedReading", "timingAndAction", "executiveSummary", "finalVerdict", "closingMessage"];
const REQUEST_ID = "verify-stage-flow-2026-09-06";
const LONG_REQUEST_ID = "verify-stage-flow-" + "x".repeat(140);
// 🔴 실호출 게이트(ENABLE_FUSION_FORTUNE_REAL_LLM·키)는 넣지 않는다 — mock 흐름만 켠다.
const ENV = { ENABLE_FUSION_FORTUNE_MOCK_FLOW: "true" };
const contextBuilder = async () => ({ ok: true, context: { birthTimeKnown: true } });
const resolvePaidAccess = async () => ({ ok: true });

check("단계 수는 2", FUSION_STAGE_COUNT === 2, String(FUSION_STAGE_COUNT));
check("1단계 그룹 6개", fusionGroupsForStage(1).length === 6, String(fusionGroupsForStage(1).length));
check("2단계 그룹 3개", fusionGroupsForStage(2).length === 3, String(fusionGroupsForStage(2).length));
check("총 분량 계약 하한 30,000", FUSION_FORTUNE_LENGTH.total.min >= 30000, String(FUSION_FORTUNE_LENGTH.total.min));

// 예약 키 — requestId 는 160자 이상이어도 `#s2` 키가 120자 안이어야 한다(모델 maxlength).
{
  const stageOneKey = fusionStageReservationId(LONG_REQUEST_ID, 1);
  const stageTwoKey = fusionStageReservationId(LONG_REQUEST_ID, 2);
  check("1단계 예약 키는 requestId(120자 절단) 그대로", stageOneKey === LONG_REQUEST_ID.slice(0, 120), stageOneKey);
  check("2단계 예약 키는 #s2 접미", stageTwoKey.endsWith("#s2"), stageTwoKey);
  check("2단계 예약 키 길이 ≤ 120", stageTwoKey.length <= 120, String(stageTwoKey.length));
  check("두 예약 키는 다르다", stageOneKey !== stageTwoKey);
}

const store = createMemoryFusionFortuneStore();
const base = { input: INPUT, userId: "verify-user", requestId: REQUEST_ID, dateKey: "2026-09-06", store, resolvePaidAccess, contextBuilder, generator: generateFusionFortuneWithConfiguredLLM, env: ENV };
const deliveries = [];
const onDelivery = async (delivery) => { deliveries.push(delivery); };

// 2단계를 앞 결과 없이 부르면 409 이고, 예약이 남지 않는다.
{
  const early = await generateFusionFortuneRequest({ ...base, stage: 2, priorResult: null, onDelivery });
  check("앞 결과 없는 2단계는 실패", early?.ok === false);
  check("앞 결과 없는 2단계는 409", early?.status === 409, String(early?.status));
  check("앞 결과 없는 2단계 코드", early?.error === "FUSION_FORTUNE_STAGE_ONE_MISSING", String(early?.error));
  check("앞 결과 없는 2단계는 retryable", early?.retryable === true);
  check("앞 결과 없는 2단계는 1단계부터 다시", early?.stage === 1, String(early?.stage));
  check("앞 결과 없는 2단계는 예약을 남기지 않는다", store.attempts.size === 0, `attempts=${store.attempts.size}`);
  check("앞 결과 없는 2단계는 배달하지 않는다", deliveries.length === 0);
}

// 1단계 — partial, 여섯 체계 섹션만.
const stageOne = await generateFusionFortuneRequest({ ...base, stage: 1, onDelivery });
check("1단계 성공", stageOne?.ok === true, JSON.stringify({ status: stageOne?.status, error: stageOne?.error, issues: stageOne?.issues }).slice(0, 300));
check("1단계 stage=1", stageOne?.stage === 1, String(stageOne?.stage));
check("1단계 상태 partial", stageOne?.stageStatus === "partial", String(stageOne?.stageStatus));
check("1단계 배달 1회", deliveries.length === 1, String(deliveries.length));
check("1단계 배달 status partial", deliveries[0]?.status === "partial" && deliveries[0]?.stage === 1, JSON.stringify({ status: deliveries[0]?.status, stage: deliveries[0]?.stage }));
const partial = stageOne?.result || {};
for (const key of STAGE_ONE_KEYS) check(`1단계 결과에 ${key} 본문`, typeof partial[key]?.content === "string" && partial[key].content.length > 0);
for (const key of STAGE_TWO_KEYS) check(`1단계 결과에 ${key} 없음`, partial[key] === undefined || partial[key] === null || partial[key] === "", typeof partial[key]);
check("1단계 결과는 hasFusionStageOneResult 통과", hasFusionStageOneResult(partial) === true);
check("1단계 예약 commit", store.attempts.get(fusionStageReservationId(REQUEST_ID, 1))?.status === "completed", JSON.stringify([...store.attempts.entries()].map(([k, v]) => [k.slice(-12), v.status])));

// 같은 requestId 로 1단계를 다시 부르면 예약 충돌(완료된 시도)이다 — 결제 1건에 생성 1회.
{
  const again = await generateFusionFortuneRequest({ ...base, stage: 1, onDelivery });
  check("1단계 재호출은 409", again?.ok === false && again?.status === 409, JSON.stringify({ ok: again?.ok, status: again?.status, error: again?.error }));
}

// 2단계 — 1단계 결과를 앞 결과로. completed 병합본.
const stageTwo = await generateFusionFortuneRequest({ ...base, stage: 2, priorResult: partial, priorGenerationSource: stageOne?.generationSource || "mock", onDelivery });
check("2단계 성공", stageTwo?.ok === true, JSON.stringify({ status: stageTwo?.status, error: stageTwo?.error, issues: stageTwo?.issues }).slice(0, 300));
check("2단계 stage=2", stageTwo?.stage === 2, String(stageTwo?.stage));
check("2단계 상태 completed", stageTwo?.stageStatus === "completed", String(stageTwo?.stageStatus));
check("2단계 배달 status completed", deliveries[1]?.status === "completed" && deliveries[1]?.stage === 2, JSON.stringify({ status: deliveries[1]?.status, stage: deliveries[1]?.stage }));
check("2단계 예약 키 #s2 commit", store.attempts.get(fusionStageReservationId(REQUEST_ID, 2))?.status === "completed");
const merged = stageTwo?.result || {};
for (const key of [...STAGE_ONE_KEYS, "integratedReading", "timingAndAction"]) check(`병합 결과에 ${key} 본문`, typeof merged[key]?.content === "string" && merged[key].content.length > 0);
for (const key of ["executiveSummary", "closingMessage"]) check(`병합 결과에 ${key}`, typeof merged[key] === "string" && merged[key].length > 0);
check("병합 결과에 finalVerdict", merged.finalVerdict && typeof merged.finalVerdict === "object");
check("병합은 1단계 섹션을 그대로 보존", STAGE_ONE_KEYS.every((key) => merged[key]?.content === partial[key]?.content));
const visible = countFusionFortuneVisibleText(merged);
check("병합 가시 텍스트 ≥ 30,000", visible >= FUSION_FORTUNE_LENGTH.total.min, `${visible} < ${FUSION_FORTUNE_LENGTH.total.min}`);
check("병합 가시 텍스트 ≤ 상한", visible <= FUSION_FORTUNE_LENGTH.total.max, `${visible} > ${FUSION_FORTUNE_LENGTH.total.max}`);

// 보관본 — 같은 멱등 키, stage 에 따라 partial/completed. 옛 호출(인자 없음)은 completed.
{
  const one = buildFusionConsultationDoc({ requestId: REQUEST_ID, userId: "verify-user", input: INPUT, result: partial, stage: 1 });
  const two = buildFusionConsultationDoc({ requestId: REQUEST_ID, userId: "verify-user", input: INPUT, result: merged, stage: 2 });
  const legacy = buildFusionConsultationDoc({ requestId: REQUEST_ID, userId: "verify-user", input: INPUT, result: merged });
  check("보관본 빌더 ok", one.ok === true && two.ok === true && legacy.ok === true, JSON.stringify([one.reason, two.reason, legacy.reason]));
  check("1단계 보관본 partial/1", one.doc?.status === "partial" && one.doc?.stage === 1, JSON.stringify({ status: one.doc?.status, stage: one.doc?.stage }));
  check("2단계 보관본 completed/2", two.doc?.status === "completed" && two.doc?.stage === 2, JSON.stringify({ status: two.doc?.status, stage: two.doc?.stage }));
  check("stage 없는 보관본은 completed/2", legacy.doc?.status === "completed" && legacy.doc?.stage === 2);
  check("두 단계 보관본은 같은 멱등 키", one.doc?.idempotencyKey && one.doc.idempotencyKey === two.doc?.idempotencyKey, `${one.doc?.idempotencyKey} / ${two.doc?.idempotencyKey}`);
}

// 라우트·렌더러·클라이언트 — 소스 단언(구 보관본 기본값, stage 배선, partial 이어가기).
{
  const route = read("worker/routes/fusion-fortune.js");
  check("응답: 옛 보관본 status 기본값 completed", /status:\s*consultation\.status\s*\|\|\s*"completed"/.test(route));
  check("응답: 옛 보관본 stage 기본값 2", /stage:\s*Number\(consultation\.stage\)\s*\|\|\s*2/.test(route));
  check("스트림: body.stage 를 읽는다", /Number\(body\?\.stage\)\s*===\s*2\s*\?\s*2\s*:\s*1/.test(route));
  check("스트림: 2단계면 앞 보관본을 읽는다", /loadFusionPriorConsultation\(/.test(route));
  check("스트림: complete 이벤트에 status", /status:\s*result\.stageStatus\s*\|\|\s*"completed"/.test(route));
  check("보관: persist 에 stage 전달", /stage:\s*delivery\?\.stage/.test(route));
  check("목록은 completed 만", /status:\s*"completed"/.test(read("worker/lib/fusion-fortune-consultation.js")));

  const model = read("worker/lib/models.js");
  check("모델 status enum 에 partial", /enum:\s*\["generating",\s*"partial",\s*"completed",\s*"generation_failed"\]/.test(model));
  check("모델 stage 기본값 2", /stage:\s*\{\s*type:\s*Number,\s*default:\s*2\s*\}/.test(model));

  const renderer = read("app/fusion-fortune/FusionResultThread.tsx");
  check("렌더러: 요약은 있을 때만", /result\.executiveSummary\s*&&\s*<ThreadRow/.test(renderer));
  check("렌더러: 섹션은 본문 있는 것만", /SECTION_KEYS\.filter\(\(key\)\s*=>\s*result\[key\]\?\.content\)/.test(renderer));
  check("렌더러: 시기는 있을 때만", /result\.timingAndAction\?\.content\s*&&/.test(renderer));
  check("렌더러: 총평은 있을 때만", /result\.closingMessage\s*&&\s*<ThreadRow/.test(renderer));

  const client = read("app/fusion-fortune/FusionFortuneClient.tsx");
  check("클라이언트: stage 를 보낸다", /\{\s*\.\.\.requestBody,\s*requestId,\s*stage\s*\}/.test(client));
  check("클라이언트: partial 을 받으면 이어간다", /payload\.status\s*===\s*"partial"/.test(client));
  check("클라이언트: 2단계 실패는 이어서 생성 카드", /stageTwoFailed/.test(client) && /continueGenerationButton/.test(client));
  check("클라이언트: 복구 결과 partial/completed 구분", /Promise<false \| "partial" \| "completed">/.test(client));
  for (const key of ["stageOnePartialNotice", "continueGenerationButton", "stageTwoFailedMessage"]) {
    const n = (client.match(new RegExp(`\\b${key}:\\s*"`, "g")) || []).length;
    check(`클라이언트 카피 ${key} 12개 로케일`, n === 12, `${n}개`);
  }
}

if (failures.length) {
  console.error("FAIL verify:fusion-fortune-stage-flow");
  for (const failure of failures) console.error(" - " + failure);
  process.exit(1);
}
console.log(`PASS verify:fusion-fortune-stage-flow — 1단계 partial → 2단계 completed 병합 ${visible}자 · #s2 예약 · STAGE_ONE_MISSING 409 · 옛 보관본 completed/2`);
