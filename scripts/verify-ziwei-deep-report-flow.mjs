/**
 * 심화 자미두수 심층 리포트(ziwei-deep-pdf) 흐름 검증
 *
 * 🔴 LLM 실호출은 하지 않는다(CLAUDE.md 코딩 원칙 8). 순수 함수는 실제로 돌려서 확인하고,
 *    DB·결제가 얽힌 흐름은 소스 계약으로 단언한다. 네트워크 요청은 0회다.
 *
 * 검증 범위:
 *   1. 통합 — 관심분야·자유질문이 15챕터 프롬프트에 주입되고, 없으면 기존 프롬프트와 동일
 *   2. 전달 게이트 — 폴백이 다수면 실패로 돌리고 환불 경로를 탄다
 *   3. 누적 저장 — 배치 재시도가 챕터를 중복 적재하지 않는다
 *   4. 멱등 — 같은 idempotencyKey 재요청이 재생성·재과금 없이 저장본을 돌려준다
 *   5. 재열람 — GET /result 가 라우팅되고 프론트가 실제로 호출한다
 *   6. 폐기 — 흡수된 인라인 상담 패널이 남아 있지 않다
 */

import { existsSync, readFileSync } from "node:fs";

const LABEL = "[verify:ziwei-deep-report-flow]";
let failures = 0;

function read(path) {
  return readFileSync(path, "utf8");
}
function assert(condition, message) {
  if (condition) return;
  failures += 1;
  console.error(`${LABEL} FAIL: ${message}`);
}
function pass(message) {
  console.log(`${LABEL} ok: ${message}`);
}

const ROUTE_PATH = "worker/routes/ziwei-deep-report.js";
const PROMPT_PATH = "worker/lib/ziwei-deep-report-prompt.mjs";
const PANEL_PATH = "app/components/ziwei/ZiweiDeepPdfPanel.tsx";
const SECTION_PATH = "app/components/AdvancedZiweiSectionV2.tsx";
const MODELS_PATH = "worker/lib/models.js";

const route = read(ROUTE_PATH);
const promptSource = read(PROMPT_PATH);
const panel = read(PANEL_PATH);
const section = read(SECTION_PATH);
const models = read(MODELS_PATH);

const { buildZiweiDeepChapterPrompt, ZIWEI_DEEP_CHAPTERS, ZIWEI_DEEP_PDF_META } = await import("../worker/lib/ziwei-deep-report-prompt.mjs");
const { __ziweiDeepReportTestUtils: utils } = await import("../worker/routes/ziwei-deep-report.js");

// ─── 1. 통합: 질문 주입 ──────────────────────────────────────────

{
  const chart = {
    lifePalace: "명궁",
    bodyPalace: "신궁",
    palaces: [{ name: "명궁", earthlyBranch: "子", mainStars: ["자미"] }],
    fourTransformations: { 화록: "천기" },
  };
  const birth = { name: "홍길동", gender: "남성", birthDate: "1990-01-01", birthTime: "12:00", calendarType: "solar" };
  const chapter = ZIWEI_DEEP_CHAPTERS[0];

  const plain = buildZiweiDeepChapterPrompt(chart, birth, chapter);
  const blank = buildZiweiDeepChapterPrompt(chart, birth, chapter, { topic: "", question: "   " });
  const asked = buildZiweiDeepChapterPrompt(chart, birth, chapter, { topic: "재물운", question: "올해 이직해도 될까요" });

  assert(plain === blank, "빈 상담 입력은 기존 프롬프트와 완전히 동일해야 한다(회귀 방지)");
  assert(!plain.includes("[내담자의 상담 요청]"), "질문이 없으면 상담 블록이 붙지 않아야 한다");
  assert(asked.includes("[내담자의 상담 요청]"), "질문이 있으면 상담 블록이 붙어야 한다");
  assert(asked.includes("재물운") && asked.includes("올해 이직해도 될까요"), "관심분야와 질문 원문이 프롬프트에 실려야 한다");
  assert(asked.includes("이 장에서 실제로 말할 수 있는 만큼만"), "무관한 장에 질문을 억지로 끌어오지 말라는 지시가 있어야 한다");
  assert(asked.length > plain.length, "상담 블록이 프롬프트를 실제로 늘려야 한다");

  // 모든 장이 같은 상담 입력을 받는다(특정 장만 개인화되면 통합의 의미가 없다).
  const everyChapterCarriesQuestion = ZIWEI_DEEP_CHAPTERS.every((ch) => (
    buildZiweiDeepChapterPrompt(chart, birth, ch, { topic: "재물운", question: "질문" }).includes("[내담자의 상담 요청]")
  ));
  assert(everyChapterCarriesQuestion, "15챕터 전부가 상담 입력을 받아야 한다");
  pass("질문 주입: 없으면 기존과 동일, 있으면 15챕터 전부에 실린다");
}

// 캐시 키가 질문에 따라 갈라지는지 — 다른 사람 질문의 답이 재사용되면 안 된다.
{
  const { buildCacheKey } = await import("../lib/llm-cache.ts").catch(() => ({ buildCacheKey: null }));
  if (typeof buildCacheKey === "function") {
    const a = await buildCacheKey({ prompt: "질문 A 가 들어간 프롬프트" }, "ziwei-deep-report-v1");
    const b = await buildCacheKey({ prompt: "질문 B 가 들어간 프롬프트" }, "ziwei-deep-report-v1");
    assert(a !== b, "프롬프트가 다르면 캐시 키도 달라야 한다");
    pass("캐시 키가 질문에 따라 갈라진다");
  } else {
    // lib/llm-cache.ts 는 TS 라 런타임 import 가 안 될 수 있다 — 계약으로 대체 단언한다.
    const cacheSource = read("lib/llm-cache.ts");
    assert(/prompt:\s*String\(request\.prompt/.test(cacheSource), "캐시 키가 프롬프트 전문을 해시해야 한다(질문별 분리의 근거)");
    pass("캐시 키가 프롬프트 전문 기반임을 소스로 확인");
  }
}

// inputHash 가 상담 입력에 반응해야 배치 도중 질문이 바뀐 요청을 걸러낸다.
{
  const base = { birthInfo: { birthDate: "1990-01-01", birthTime: "12:00", gender: "male" } };
  const noQuestion = utils.normalizeInput(base);
  const withQuestion = utils.normalizeInput({ ...base, topic: "재물운", question: "올해 이직해도 될까요" });
  const otherQuestion = utils.normalizeInput({ ...base, topic: "재물운", question: "다른 질문" });

  assert(noQuestion.ok && withQuestion.ok, "정상 입력은 통과해야 한다");
  assert(noQuestion.inputHash !== withQuestion.inputHash, "질문이 붙으면 inputHash 가 달라져야 한다");
  assert(withQuestion.inputHash !== otherQuestion.inputHash, "질문이 바뀌면 inputHash 가 달라져야 한다");
  assert(withQuestion.consultation.question === "올해 이직해도 될까요", "질문 원문이 정규화 결과에 실려야 한다");
  pass("inputHash 가 상담 입력에 반응한다");
}

// ─── 2. 전달 게이트 ──────────────────────────────────────────────

{
  const minChars = utils.MIN_DELIVERABLE_CHARS;
  const minChapters = utils.MIN_DELIVERABLE_CHAPTERS;

  assert(minChars === Math.round(ZIWEI_DEEP_PDF_META.minTotalChars * 0.55), "전달 하한은 목표 분량의 55% 여야 한다(자매 라우트와 동일 비율)");
  assert(minChapters === Math.ceil(ZIWEI_DEEP_CHAPTERS.length * 0.6), "살아남은 장 하한은 전체의 60% 여야 한다");

  assert(utils.judgeDeliverable(minChars, minChapters).ok, "하한을 정확히 채우면 통과해야 한다");
  assert(!utils.judgeDeliverable(minChars - 1, 15).ok, "글자수가 하한 미만이면 실패해야 한다");
  assert(!utils.judgeDeliverable(999999, minChapters - 1).ok, "글자수가 충분해도 살아남은 장이 모자라면 실패해야 한다");

  // 실제 사고 시나리오: 15장 중 12장이 2줄짜리 폴백 문단인 리포트.
  const fallbackChars = 120;
  const realChars = 2500;
  const okCount = 3;
  const total = okCount * realChars + (15 - okCount) * fallbackChars;
  assert(!utils.judgeDeliverable(total, okCount).ok, "폴백이 12장인 리포트는 배달되면 안 된다");

  // 반대로 한 장만 폴백인 리포트는 통과해야 한다(한 장 때문에 열네 장을 버리지 않는다).
  const nearlyFull = 14 * realChars + fallbackChars;
  assert(utils.judgeDeliverable(nearlyFull, 14).ok, "한 장만 폴백인 리포트는 정상 배달되어야 한다");
  pass(`전달 게이트: ${minChars}자·${minChapters}장 하한이 폴백 다수만 걸러낸다`);
}

// 게이트 실패가 환불로 이어지는지 — 게이트만 있고 환불이 없으면 사용자는 돈만 잃는다.
{
  assert(route.includes("failServiceExecution"), "환불에 공용 execution-guard 를 써야 한다");
  assert(route.includes("startServiceExecution"), "선차감을 되돌릴 수 있는 상태를 열어야 한다");
  assert(route.includes("completeServiceExecution"), "전달 확정 시 선차감을 확정해야 한다");
  assert(/forceRefundOnClose:\s*true/.test(route), "forceRefundOnClose 가 없으면 soft-abandon 유예로 빠져 즉시 환불되지 않는다");

  const gateIndex = route.indexOf("const verdict = judgeDeliverable(");
  const refundIndex = route.indexOf("await refundExecution(", gateIndex);
  const markIndex = route.indexOf("await markReportFailed(", gateIndex);
  assert(gateIndex > 0, "전달 게이트 판정부가 있어야 한다");
  assert(refundIndex > gateIndex, "게이트 실패 직후 환불이 호출되어야 한다");
  assert(markIndex > gateIndex, "게이트 실패 시 저장본을 generation_failed 로 표시해야 한다");

  // 게이트는 마지막 배치에서만 돌아야 한다(중간 배치에서 걸면 정상 리포트가 환불된다).
  assert(/if \(batch\.done\) \{\s*\n\s*const verdict = judgeDeliverable\(/.test(route), "전달 게이트는 batch.done 안에서만 판정해야 한다");
  pass("전달 게이트 실패가 환불·실패표시로 이어진다");
}

// ─── 3. 누적 저장 ────────────────────────────────────────────────

{
  const first = [
    { id: "overview", order: 0, title: "1장", body: "a", chars: 2600, ok: true },
    { id: "ming", order: 1, title: "2장", body: "b", chars: 2400, ok: true },
  ];
  const retryOfFirst = [
    { id: "overview", order: 0, title: "1장", body: "a2", chars: 2700, ok: true },
  ];
  const second = [
    { id: "siblings", order: 2, title: "3장", body: "c", chars: 2200, ok: true },
  ];

  const afterRetry = utils.mergeChapters(first, retryOfFirst);
  assert(afterRetry.length === 2, `배치 재시도가 챕터를 중복 적재하면 안 된다 (got ${afterRetry.length})`);
  assert(afterRetry[0].body === "a2", "같은 id 는 새 내용으로 덮어써야 한다");

  const afterSecond = utils.mergeChapters(afterRetry, second);
  assert(afterSecond.length === 3, "다음 배치는 이어붙어야 한다");
  assert(afterSecond.map((ch) => ch.order).join(",") === "0,1,2", "order 순으로 정렬되어야 한다");

  // 주석의 `$push` 언급은 잡지 않는다 — 실제 연산자 사용(`$push:`)만 본다.
  assert(!/\$push\s*:/.test(route), "$push 를 쓰면 배치 재시도 시 챕터가 중복 적재된다");
  pass("누적 저장: 재시도해도 중복 없이 머지된다");
}

// 저장은 best-effort — DB 가 흔들려도 결제한 결과를 버리면 안 된다.
{
  for (const fn of ["persistFirstBatch", "persistNextBatch", "markReportFailed", "loadStoredReport"]) {
    const start = route.indexOf(`function ${fn}(`);
    assert(start > 0, `${fn} 이 있어야 한다`);
    const body = route.slice(start, start + 1400);
    assert(body.includes("try {") && body.includes("catch"), `${fn} 은 try-catch 로 감싸 저장 실패가 전달을 막지 않아야 한다`);
  }
  // 읽기 경로(/result)는 반대로 실패를 삼키지 않고 503 으로 올려야 한다.
  const resultStart = route.indexOf("async function handleResult(");
  const resultBody = route.slice(resultStart, resultStart + 3000);
  assert(resultBody.includes("DB_DEGRADED") && resultBody.includes("retryable: true"), "/result 의 DB 실패는 재시도 가능한 503 이어야 한다(조용한 '없음' 금지)");
  pass("쓰기는 best-effort, 읽기는 transient 503");
}

// 누적 집계는 서명된 토큰이 1차 소스여야 한다(DB 저장 실패와 무관해야 하므로).
{
  assert(/charsSoFar/.test(route) && /okChaptersSoFar/.test(route), "누적 분량·장수를 액세스 토큰에 실어야 한다");
  const stored = { chapters: [{ chars: 100, ok: true }, { chars: 200, ok: false }, { chars: 300, ok: true }] };
  const accumulated = utils.accumulatedFromStored(stored);
  assert(accumulated.chars === 600, `저장본 글자수 합계가 틀렸다 (got ${accumulated.chars})`);
  assert(accumulated.okChapters === 2, `저장본 정상 장수가 틀렸다 (got ${accumulated.okChapters})`);
  assert(utils.accumulatedFromStored(null).chars === 0, "저장본이 없으면 0 이어야 한다");
  pass("누적 집계 보조 소스(저장본)가 정확하다");
}

// ─── 4. 멱등 ────────────────────────────────────────────────────

{
  const idempotentIndex = route.indexOf("if (stored && stored.chapters?.length && stored.status !== \"generation_failed\")");
  const startExecIndex = route.indexOf("await startRefundableExecution(");
  assert(idempotentIndex > 0, "멱등 조기반환 블록이 있어야 한다");
  assert(startExecIndex > idempotentIndex, "멱등 조기반환은 선차감 오픈보다 앞에 있어야 재과금이 없다");

  // 저장본 응답 모양 — 미완성이면 이어받을 위치를 알려줘야 한다.
  const doc = {
    id: "zwdr_x",
    status: "partial",
    chapters: [
      { id: "ming", order: 1, chars: 2400, ok: true },
      { id: "overview", order: 0, chars: 2600, ok: true },
    ],
  };
  const envelope = utils.publicStoredReport(doc);
  assert(envelope.restored === true, "저장본 응답은 restored 플래그를 달아야 한다");
  assert(envelope.done === false, "partial 저장본은 done 이 아니어야 한다");
  assert(envelope.nextIndex === 2, `미완성 저장본은 이어받을 위치를 줘야 한다 (got ${envelope.nextIndex})`);
  assert(envelope.chapters[0].order === 0, "저장본 챕터는 order 순으로 나가야 한다");
  assert(envelope.totalChars === 5000, `저장본 총 글자수가 틀렸다 (got ${envelope.totalChars})`);
  assert(utils.publicStoredReport({ ...doc, status: "completed" }).done === true, "completed 저장본은 done 이어야 한다");
  pass("멱등 재요청이 재과금 없이 저장본을 돌려주고, 미완성이면 이어받는다");
}

// 차감 증거는 클라이언트 결제 게이트 응답에서 온다(canAccessPaidFeature 는 주지 않는다).
{
  assert(utils.resolveSourceTransactionId({ transactionId: "tx1" }) === "tx1", "transactionId 를 읽어야 한다");
  assert(utils.resolveSourceTransactionId({ consume: { transactionId: "tx2" } }) === "tx2", "consume.transactionId 폴백이 있어야 한다");
  assert(utils.resolveSourceTransactionId({ ledgerId: "lg1" }) === "lg1", "ledgerId 폴백이 있어야 한다");
  assert(utils.resolveSourceTransactionId({}) === "", "증거가 없으면 빈 문자열(이용권·관리자 경로 → 환불 대상 아님)");
  pass("차감 증거 해석이 결제 게이트 응답 모양을 따른다");
}

// ─── 5. 재열람 배선 ──────────────────────────────────────────────

{
  assert(/method === "GET" && path === "\/result"/.test(route), "GET /result 가 라우팅되어야 한다");
  assert(route.includes("ZiweiDeepReport"), "리포트 모델을 써야 한다");
  assert(models.includes("ziweiDeepReportSchema"), "ziweiDeepReportSchema 가 정의되어야 한다");
  assert(models.includes("ziweiDeepReports"), "ziweiDeepReports 컬렉션이 지정되어야 한다");
  assert(/ziweiDeepReportSchema\.index\(\{ userId: 1, idempotencyKey: 1 \}, \{ unique: true \}\)/.test(models), "멱등 판별용 unique 인덱스가 선언되어야 한다");
  assert(existsSync("scripts/migrations/20260813-add-ziwei-deep-report-indexes.mjs"), "인덱스 마이그레이션이 있어야 한다(db.js 가 autoIndex:false 다)");

  // 🔴 자매 구현(destiny-compass-ai)은 /result 를 만들어 놓고 프론트가 쓰지 않는다. 같은 실수 방지.
  assert(panel.includes("/api/ziwei-deep-report/result"), "프론트가 /result 를 실제로 호출해야 한다(만들어 놓고 안 쓰면 재열람이 없는 것과 같다)");
  assert(panel.includes("지난 리포트 다시 보기"), "재열람 진입점이 UI 에 있어야 한다");
  assert(panel.includes("openStoredReport"), "저장본 단건 열기 핸들러가 있어야 한다");
  assert(panel.includes("restored"), "저장본임을 사용자에게 구분해 보여줘야 한다");

  // 목록 조회는 눌렀을 때만 — 마운트 시 자동 조회는 결제창 잔량 조회와 같은 실수다.
  assert(!/useEffect\([^)]*loadHistory/.test(panel), "재열람 목록을 마운트 시 자동 조회하면 안 된다(온디맨드)");
  pass("재열람이 서버·프론트 양쪽에 실제로 배선되었다");
}

// ─── 6. 통합 정리 ────────────────────────────────────────────────

{
  assert(!existsSync("app/components/ziwei/ZiweiAiConsultPanel.tsx"), "흡수된 인라인 상담 패널은 삭제되어야 한다");
  assert(!section.includes("ZiweiAiConsultPanel"), "심화 화면이 삭제된 패널을 참조하면 안 된다");
  assert(section.includes("ZiweiDeepPdfPanel"), "통합 패널은 계속 마운트되어야 한다");

  // 통합 패널이 상담 입력을 실제로 보내는지.
  assert(panel.includes("FOCUS_OPTIONS"), "관심분야 선택지가 통합 패널로 옮겨와야 한다");
  assert(/focusArea,\s*\n\s*topic,\s*\n\s*question:/.test(panel), "payload 에 상담 입력이 실려야 한다");
  assert(panel.includes("CUSTOM_QUESTION_REQUIRED"), "'현재 고민 상담' 선택 시 질문 필수 검증이 있어야 한다");

  // 🔴 독립 페이지 /ziwei-ai 는 별도 상품이라 그대로 살아 있어야 한다.
  assert(existsSync("app/ziwei-ai/ZiweiAiClient.tsx"), "독립 상담 페이지는 삭제되면 안 된다");
  assert(existsSync("worker/routes/ziwei-ai.js"), "독립 상담 라우트는 삭제되면 안 된다");
  const registry = read("worker/lib/paid-feature-registry.js");
  assert(registry.includes("\"ziwei-ai-consultation\": { cost: 300, amountKRW: 30000"), "ziwei-ai-consultation 가격 정의는 유지되어야 한다");
  assert(registry.includes("\"ziwei-deep-pdf\": { cost: 300, amountKRW: 30000"), "ziwei-deep-pdf 가격 정의는 유지되어야 한다");
  pass("인라인 상담 패널만 흡수되고 독립 상품은 온전하다");
}

// 프롬프트 모듈의 관리자 랩 진입점이 깨지지 않았는지(챕터 배열을 바꾸면 함께 흔들린다).
{
  assert(promptSource.includes("buildAdminLabPrompt"), "관리자 프롬프트 랩 진입점이 남아 있어야 한다");
  assert(ZIWEI_DEEP_CHAPTERS.length === 15, `챕터 수는 15 여야 한다 (got ${ZIWEI_DEEP_CHAPTERS.length})`);
  pass("챕터 구성과 관리자 랩 진입점이 그대로다");
}

if (failures) {
  console.error(`\n${LABEL} ${failures}건 실패\n`);
  process.exit(1);
}
console.log(`\n${LABEL} 전부 통과 (LLM 실호출 0회)\n`);
