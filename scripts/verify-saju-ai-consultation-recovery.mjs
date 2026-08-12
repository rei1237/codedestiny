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
assert(
  cache.includes("if (deterministic && store && result?.text && !result.truncated)"),
  "캐시 쓰기 조건이 바뀌었다 — skipRead 는 읽기만 막아야 자가 치유가 된다",
);
assert(
  /const retryAfterFailure = existingExecution\?\.status === "generation_failed"/.test(route),
  "재시도 판정(retryAfterFailure)이 없다",
);
assert(
  /skipRead: retryAfterFailure \|\| undefined/.test(route),
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

// 5) 대기 화면의 명식 근거 미리보기는 실제 응답 형태를 읽어야 한다.
assert(
  /var data = result && result\.payload;/.test(client),
  "loadLiveBasis 가 result.payload 를 읽지 않는다(result.data 는 항상 undefined 다)",
);

// 6) 미러 동일성 — 정적 셸은 public/js 사본을 로드한다.
assert(client === mirror, "js/saju-engine.js 와 public/js/saju-engine.js 가 다르다 (cp 로 동기화할 것)");

console.log("[verify:saju-ai-consultation-recovery] PASS");
