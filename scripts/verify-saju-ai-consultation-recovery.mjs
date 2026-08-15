/**
 * 사주 AI 상담: 결제 후 결과 미표시 회귀 가드
 *
 * 실사고: 생성이 동기(80초 예산, waitUntil 의도적 미사용)라 요청이 끊기면 PaidExecutionRecord 가
 * generating 으로 남는데, 회수 함수 markSajuAIPromptStaleExecutionFailed 의 호출부가 하나도 없어
 * /status 가 영원히 202 를 답했다. 사용자는 결제만 하고 3분 폴링 뒤 타임아웃을 봤고, 다시 열어도
 * 같은 레코드라 영영 같은 화면이었다. 여기에 (1) 검증 실패한 응답까지 저장하는 결정적 LLM 캐시가
 * 무료 재생성을 30일간 같은 실패로 고정했고 (2) 카드 경로의 requestId 접미사 때문에 폴링이 404 로 샜다.
 *
 * 실제 LLM 은 부르지 않는다 — 배선이 살아 있는지 소스에서 확인한다.
 * 실행: npm run verify:saju-ai-consultation-recovery
 */

import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(path, "utf8");
}

function assert(condition, message) {
  if (!condition) throw new Error(`[verify:saju-ai-consultation-recovery] ${message}`);
}

const route = read("worker/routes/fortune.js");
const client = read("js/saju-engine.js");
const mirror = read("public/js/saju-engine.js");
const cache = read("lib/llm-cache.ts");

// 1) 끊긴 generating 레코드는 읽기 시점에 회수돼야 한다.
assert(route.includes("async function reapStaleSajuAIExecution"), "stale 회수 헬퍼가 없다");
assert(
  /reapStaleSajuAIExecution\(found, \{[^}]*route: "status"/s.test(route),
  "status 핸들러가 stale 회수를 거치지 않는다 — /status 가 영원히 202 를 답하게 된다",
);
assert(
  /reapStaleSajuAIExecution\(found, \{[^}]*route: "result"/s.test(route),
  "result 핸들러가 stale 회수를 거치지 않는다",
);
assert(
  /markSajuAIPromptStaleExecutionFailed\(execution, details\)/.test(route),
  "회수 헬퍼가 마커 함수를 호출하지 않는다",
);
// 완료 저장과의 경합에서 방금 끝난 생성을 덮어쓰지 않게 하는 필터.
assert(
  /\{ executionId: execution\.executionId, status: "generating" \}/.test(route),
  "회수 update 가 status:'generating' 으로 좁혀지지 않았다(완료 레코드를 덮어쓸 수 있다)",
);
// 회수 사유는 사용자에게 그대로 노출된다(buildSajuAIStatusPayload 의 errorCode/errorMessage).
assert(route.includes('code: "STALE_GENERATION_RECOVERED"'), "회수 사유 코드가 없다");
assert(
  /message: "상담 생성이 중간에 끊겨/.test(route),
  "회수 안내가 한국어가 아니다(영문이 그대로 사용자에게 나간다)",
);

// 2) 실패한 requestId 는 캐시를 다시 읽지 않는다(쓰기는 유지 — 성공 재생성이 덮어써 자가 치유).
assert(cache.includes("skipRead?: boolean"), "llm-cache 에 skipRead 옵션이 없다");
assert(
  cache.includes('if (deterministic && store && config?.skipRead !== true)'),
  "캐시 조회 게이트가 skipRead 를 보지 않는다",
);
// 🔴 이 단언이 지키는 것은 "쓰기 조건에 skipRead 가 없다" 하나다. 예전에는 조건 줄을 문자열
// 완전일치로 박아 두었는데, 그러면 무관한 가드가 하나 늘 때마다(예: 분량 미달 응답을 저장하지
// 않는 minChars) 의도가 멀쩡한데도 깨진다. 조건 줄을 잘라내 성질만 본다.
const cacheWriteGate = cache.match(/if \(deterministic && store && result\?\.text[^)]*\)/);
assert(cacheWriteGate, "캐시 쓰기 게이트를 찾지 못했다(조건 형태가 통째로 바뀌었다)");
assert(
  !/skipRead/.test(cacheWriteGate[0]),
  "캐시 쓰기 조건이 skipRead 를 본다 — skipRead 는 읽기만 막아야 성공 재생성이 덮어써 자가 치유가 된다",
);
assert(
  /!result\.truncated/.test(cacheWriteGate[0]),
  "잘린 응답을 저장하지 않는 가드가 사라졌다 — TTL 동안 잘린 텍스트가 고정된다",
);
assert(
  /function resolveSajuAIPromptFailureBilling\(execution/.test(route),
  "실패 시 과금 판정(resolveSajuAIPromptFailureBilling)이 없다",
);
assert(
  /skipRead: skipCacheRead \|\| undefined/.test(route),
  "사주 상담 캐시가 skipRead 를 넘기지 않는다 — 불량 응답이 30일간 고정된다",
);

// 3) 폴링 키 정합. 쓰기 키(readAIPromptRequestId)는 6개 핸들러 공유라 바꾸지 않고 읽기만 넓힌다.
assert(
  /clauses\.push\(\{ requestId: \{ \$regex: `\^\$\{normalizedRequestId\.replace\(/.test(route),
  "실행 레코드 조회에 requestId 접두 절이 없다 — 카드 경로 폴링이 404 로 샌다",
);
assert(
  /body\?\.idempotencyKey\s*\|\|\s*paymentContext\.idempotencyKey\s*\|\|\s*body\?\.requestId/.test(route),
  "readAIPromptRequestId 의 우선순위가 바뀌었다 — 쓰기 키가 바뀌면 재접속이 이중 차감된다",
);
assert(
  /requestId: String\(\(body\.idempotencyKey \|\| body\.requestId\) \|\| ''\)/.test(client),
  "클라이언트 폴링 키가 서버 우선순위(idempotencyKey 우선)를 따르지 않는다",
);

// 4) 결제 후 실패는 결제창 재오픈이 아니라 무료 재생성으로 인계한다.
assert(
  /status === 524/.test(client),
  "엣지 절단(524)이 재시도 대상에서 빠졌다",
);
assert(
  /result\._sajuPaidEvidence && \(!Number\(result\.status\) \|\| Number\(result\.status\) >= 500\)/.test(client),
  "결제 후 5xx 에서 결제 증거를 보존하지 않는다 — 다음 클릭이 결제창을 다시 연다",
);
assert(
  /activePendingJob\.paidEvidence[\s\S]{0,200}'NETWORK_ERROR'/.test(client),
  "네트워크 오류 경로가 무료 재생성으로 인계되지 않는다",
);
assert(
  /pollNotFoundStreak >= 4/.test(client),
  "폴링 404 연속 상한이 없다 — 기록을 못 찾아도 3분간 조용히 폴링만 돈다",
);

// 4-1) 2-스트라이크 환불 계약.
// 실패 즉시 환불하면 환불된 차감이 결제 증빙 조회에서 제외돼(findAIPrompt*Evidence) 자동 재시도와
// "추가 결제 없이 다시 생성"이 전부 402 로 떨어진다 — 결제 후 생성 실패 루프의 정체다.
// 1차 실패는 결제 보존(무료 재시도 실동작), 재시도까지 실패하면 그때 환불하고 그 사실을 정직하게 알린다.
// 한 번의 사용자 클릭이 두 스트라이크를 다 쓸 수 있다(클라이언트 자동 재시도가 2차 POST) — 의도된 동작이다.
assert(
  /const monthlyRefund = refundOnFailure\s*\n\s*\? await refundSajuAIPromptMonthlyCredit/.test(route),
  "월정석 환불이 refundOnFailure 로 게이트되지 않았다 — 1차 실패에서 환불되면 무료 재시도가 402 가 된다",
);
assert(
  /if \(!refundOnFailure\) \{[\s\S]{0,160}\} else if \(pointRefundContext\.isPointSpend/.test(route),
  "코인·카드 환불이 refundOnFailure 로 게이트되지 않았다",
);
assert(
  /const refunded = refundOnFailure && Boolean\(monthlyRefund\.refundOk \|\| pointRefund\.refundOk\)/.test(route),
  "환불 '시도'와 '성공'을 구분하지 않는다 — 실패한 환불을 환불됐다고 답하면 살아 있는 결제가 미아가 된다",
);
assert(
  /code: refunded \? "GENERATION_FAILED_REFUNDED" : "LLM_GENERATION_RETRYABLE"/.test(route),
  "실행 레코드가 환불 여부를 코드로 구분하지 않는다 — /status 폴링이 거짓 재생성 안내를 내보낸다",
);
assert(
  /\.\.\.\(refunded \? \{ "result\.order\.paymentStatus": "REFUNDED" \} : \{\}\)/.test(route),
  "환불 시 paymentStatus 가 REFUNDED 로 갱신되지 않는다 — buildSajuAIStatusPayload 가 retryable:true 를 유지한다",
);
assert(
  /paymentRetainedForRetry: !refunded/.test(route),
  "환불한 응답이 결제 보존이라고 답한다 — 클라이언트가 죽은 증거로 재시도해 402 를 맞는다",
);
assert(
  /if \(payload\.refundOk === true \|\| details\.refundOk === true\) return false;/.test(client),
  "클라이언트 자동 재시도가 환불된 실패를 걸러 내지 않는다",
);
assert(
  /function finishAfterAutoRefund\(message\)[\s\S]{0,400}_sajuPromptClearPendingJob/.test(client),
  "환불 종결 처리가 없거나 pending job(=저장된 결제 증거)을 지우지 않는다",
);
assert(
  /if \(payload\.refundOk === true\) \{\s*\n\s*finishAfterAutoRefund\(message\);/.test(client),
  "환불 확정 분기가 결제 보존 분기보다 먼저 걸러지지 않는다",
);
assert(
  /=== 'GENERATION_FAILED_REFUNDED'\) \{[\s\S]{0,120}finishAfterAutoRefund/.test(client),
  "폴링 실패 경로가 환불된 실패를 무료 재생성으로 잘못 인계한다",
);

// 5) 대기 화면의 명식 근거 미리보기는 실제 응답 형태를 읽어야 한다.
assert(
  /var data = result && result\.payload;/.test(client),
  "loadLiveBasis 가 result.payload 를 읽지 않는다(result.data 는 항상 undefined 다)",
);

// 6) 미러 동일성 — 정적 셸은 public/js 사본을 로드한다.
assert(client === mirror, "js/saju-engine.js 와 public/js/saju-engine.js 가 다르다 (cp 로 동기화할 것)");

console.log("[verify:saju-ai-consultation-recovery] PASS");
