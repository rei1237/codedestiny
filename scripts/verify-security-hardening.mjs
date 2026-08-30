/**
 * 2026-07-31 보안 감사에서 닫은 구멍이 조용히 되돌아오는 것을 막는 가드.
 *
 * 왜 필요한가: 이 레포에는 워크트리가 30개 넘게 살아 있고, 머지된 브랜치를 재사용하다 남의 수정이
 * 통째로 되돌아간 전례가 있다. 그리고 CI 의 Gitleaks 전체 히스토리 스캔은 문제의 관리자 비밀번호를
 * 끝내 잡지 못했다(룰에 매칭되지 않음). 즉 "다음에 또 들어와도 아무도 모른다"가 기본값이었다.
 *
 * 설계 원칙:
 *  - 오탐을 만들지 않는다. 오탐이 한 번 나면 가드는 곧 꺼지고, 꺼진 가드는 없는 것만 못하다.
 *    그래서 규칙마다 "지금 코드에서 통과함"을 전제로 좁게 고정하고, 근거를 함께 남긴다.
 *  - 이름 grep 으로 끝내지 않는다. 순서/포함관계가 중요한 곳은 함수 본문을 중괄호 균형으로
 *    잘라 내부를 실제로 확인한다(CLAUDE.md 원칙 6 과 같은 이유).
 *  - 한계를 숨기지 않는다. 리터럴 고정은 변수로 우회하면 못 잡는다. 이 스크립트는 "같은 실수의
 *    재발"을 막는 것이지 "모든 우회"를 막지 못한다.
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";

import { BUILD_ARTIFACT_DIRS } from "./lib/source-scan-ignore.mjs";
// 🔴 stripComments 사본을 들고 있다가 정규식 리터럴에서 따옴표 모드가 어긋났다 —
//    worker/routes/admin.js 의 /content=[\"'](...)/ 한 줄이 뒤따르는 14,482자를 문자열로
//    삼켜 그 구간의 주석이 코드로 읽혔고, R1 검사들이 조용히 오통과했다(2026-08-30 실측).
//    공용 스캐너는 정규식 리터럴을 실제로 건너뛴다 — 사본을 만들지 말 것.
import { stripComments } from "./lib/js-source-slice.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const failures = [];

function source(path) {
  return readFileSync(resolve(root, path), "utf8");
}

function check(label, fn) {
  try {
    fn();
  } catch (error) {
    failures.push(`${label}: ${error?.message || error}`);
  }
}

/** 함수 본문을 중괄호 균형으로 잘라낸다 — 이름만 보고 판단하지 않기 위해. */
function functionBody(text, signature) {
  const start = text.indexOf(signature);
  assert.ok(start >= 0, `함수를 찾지 못했습니다 -> ${signature}`);
  const open = text.indexOf("{", start);
  assert.ok(open > 0, `함수 본문 시작을 찾지 못했습니다 -> ${signature}`);
  let depth = 0;
  for (let i = open; i < text.length; i += 1) {
    if (text[i] === "{") depth += 1;
    else if (text[i] === "}") {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  throw new Error(`함수 본문이 닫히지 않았습니다 -> ${signature}`);
}

/** worker/ 의 .js 파일을 훑는다(빌드 산출물·의존성 제외). */
function listSourceFiles(dirs) {
  const out = [];
  const skip = new Set(BUILD_ARTIFACT_DIRS);
  const walk = (dir) => {
    let entries = [];
    try {
      entries = readdirSync(dir);
    } catch (_) {
      return;
    }
    for (const entry of entries) {
      if (skip.has(entry)) continue;
      const full = join(dir, entry);
      let info = null;
      try {
        info = statSync(full);
      } catch (_) {
        continue;
      }
      if (info.isDirectory()) walk(full);
      else if (entry.endsWith(".js")) out.push(full);
    }
  };
  for (const dir of dirs) walk(resolve(root, dir));
  return out;
}

// JS 규칙은 전부 "주석을 지운 코드"를 본다.
// 주석을 그대로 두면 두 방향으로 틀린다: 금지 패턴을 설명한 주석이 위반으로 잡히고(오탐),
// 필수 호출을 언급한 주석이 존재 검사를 통과시킨다(오통과). 둘 다 실제로 일어날 수 있다.
const adminWorker = stripComments(source("worker/routes/admin.js"));
const http = stripComments(source("worker/lib/http.js"));
const workerIndex = stripComments(source("worker/index.js"));
const payments = stripComments(source("worker/routes/payments.js"));
const workerSources = listSourceFiles(["worker"]);

/* ── R1. 관리자 진입 비밀번호가 소스로 돌아오지 않는다 ───────────────────────────
   사고 내용: 평문 주석 + salt 없는 SHA-256 이 공개 레포에 커밋돼 있었고, 그 값 하나로
   8시간 관리자 토큰 → 전 유료기능 무료 통과 + 임의 고객 결제 취소까지 이어졌다. */
check("R1a 관리자 비밀번호 상수 배열 재도입", () => {
  assert.ok(
    !adminWorker.includes("ADMIN_ENTRY_PASSWORD_SHA256_LIST"),
    "worker/routes/admin.js: 하드코딩 비밀번호 해시 배열이 되살아났습니다. 정본은 env ADMIN_ENTRY_PASSWORD_HASH 입니다.",
  );
});

check("R1b 관리자 파일의 64자 hex 문자열 리터럴", () => {
  // 변수명을 바꿔 우회해도 걸리도록, 이름이 아니라 "형태"를 본다.
  // 정규식 리터럴(/^[a-f0-9]{64}$/)은 문자열이 아니므로 걸리지 않는다.
  const hexLiteral = /["'`][a-f0-9]{64}["'`]/;
  const hit = adminWorker.match(hexLiteral);
  assert.ok(!hit, `worker/routes/admin.js: 64자 hex 문자열 리터럴이 있습니다(${String(hit?.[0]).slice(0, 12)}…). 비밀번호 해시를 소스에 두지 마세요.`);
});

check("R1c 관리자 진입 비밀번호 env 배선 + fail-closed", () => {
  const body = functionBody(adminWorker, "async function verifyAdminEntryPassword(");
  assert.ok(body.includes("ADMIN_ENTRY_PASSWORD_HASH_KEY"), "worker: env 키를 읽지 않습니다.");
  assert.ok(body.includes("verifyPassword("), "worker: 공용 verifyPassword 를 쓰지 않습니다.");
  assert.ok(body.includes("return false"), "worker: 시크릿 미설정 시 fail-closed 경로가 없습니다.");
});

check("R1d 관리자 해시 포맷 경고 유지", () => {
  // 주석이 사라지면 다음 사람이 bcrypt 해시를 넣고, 로그인이 '가끔' 죽는 상태로 돌아간다.
  const raw = source("worker/routes/admin.js");
  assert.ok(
    raw.includes("1102") && /PBKDF2/i.test(raw),
    "worker/routes/admin.js: ADMIN_ENTRY_PASSWORD_HASH 는 PBKDF2 여야 한다는 경고(1102 사유 포함)가 사라졌습니다.",
  );
});

check("R1e 설정 오류를 비밀번호 오류로 표시하지 않는다", () => {
  // 스테이징 워커에는 ADMIN_ENTRY_PASSWORD_HASH 를 정책상 넣지 않는다
  // (scripts/lib/staging-secret-policy.mjs). 그때도 404 "Not found" 로만 응답하면 로그인 화면이
  // "비밀번호가 올바르지 않습니다"로 표시해서, 맞는 비밀번호를 넣은 관리자가 원인을 알 수 없다.
  // 2026-08-30 실사고 — 스테이징에서 관리자 진입이 막힌 채로 비밀번호 문제로 오진됐다.
  const body = functionBody(adminWorker, "async function handleEntryPassword(");
  assert.ok(
    body.includes("describeAdminEntryHashProblem("),
    "handleEntryPassword: 설정 오류 분류가 없습니다 — 시크릿 미설정이 '비밀번호 오류'로 표시됩니다.",
  );
  assert.ok(
    body.includes("buildConfigErrorBody("),
    "handleEntryPassword: config_key_mismatch 응답을 만들지 않습니다 — 로그인 화면이 원인을 표시할 수 없습니다.",
  );

  const classify = functionBody(adminWorker, "function describeAdminEntryHashProblem(");
  assert.ok(
    classify.includes("ADMIN_ENTRY_PASSWORD_HASH_KEY"),
    "describeAdminEntryHashProblem: env 키를 읽지 않습니다.",
  );
  assert.ok(
    classify.includes("PBKDF2_MAX_ITERATIONS"),
    "describeAdminEntryHashProblem: 반복수 상한 검사가 없습니다 — 워커가 복원하지 못하는 해시도 '비밀번호 오류'가 됩니다.",
  );
});

/* ── R2. /entry/password 무차별 대입 상한 유지 ─────────────────────────────────
   이 라우트는 인증 앞단에서 자격증명을 발급한다. 예전엔 상한이 아예 없었다. */
check("R2 /entry/password 레이트리밋", () => {
  assert.ok(
    adminWorker.includes("enforceSensitiveEndpointSecurity"),
    "worker/routes/admin.js: 보안 게이트 import/호출이 사라졌습니다.",
  );
  const body = functionBody(adminWorker, "async function handleEntryPassword(");
  const gateIdx = body.indexOf("enforceEntryPasswordSecurity(");
  const verifyIdx = body.indexOf("verifyAdminEntryPassword(");
  assert.ok(gateIdx >= 0, "handleEntryPassword: 레이트리밋 게이트 호출이 없습니다.");
  assert.ok(verifyIdx >= 0, "handleEntryPassword: 비밀번호 검증 호출이 없습니다.");
  assert.ok(gateIdx < verifyIdx, "handleEntryPassword: 게이트가 비밀번호 검증보다 뒤에 있습니다(상한이 무의미해집니다).");

  const gateBody = functionBody(adminWorker, "async function enforceEntryPasswordSecurity(");
  assert.ok(/rateLimit:\s*\{/.test(gateBody), "enforceEntryPasswordSecurity: rateLimit 설정이 없습니다.");
});

/* ── R3. /api/admin/keys 인가 유지 ────────────────────────────────────────────
   키 매트릭스는 어떤 시크릿이 비었는지·placeholder 인지를 그대로 알려준다. */
check("R3 /api/admin/keys 인가", () => {
  const body = functionBody(adminWorker, "async function handleKeyHealth(");
  assert.ok(
    body.includes("authorizeAdminRequest("),
    "handleKeyHealth: authorizeAdminRequest 가 없습니다 — 무인증으로 시크릿 설정 현황이 노출됩니다.",
  );
});

/* ── R4. 에러 원문이 응답 본문으로 새지 않는다 ────────────────────────────────
   Mongo/Atlas 타임아웃 메시지에는 샤드 호스트명·IP·TLS 실패 사유가 들어 있다. */
check("R4a http.js 의 isConfigError 노출 결합", () => {
  assert.ok(
    !/exposeMessage\s*\|\|\s*isConfigError/.test(http),
    "worker/lib/http.js: (exposeMessage || isConfigError) 가 되살아났습니다. isConfigError 는 503/500 갈림과 reason 라벨에만 씁니다.",
  );
});

check("R4b 라우트의 exposeMessage:true", () => {
  const offenders = workerSources
    .filter((file) => /exposeMessage:\s*true/.test(stripComments(readFileSync(file, "utf8"))))
    .map((file) => file.slice(root.length + 1).replace(/\\/g, "/"));
  assert.equal(
    offenders.length,
    0,
    `프로덕션 응답에 원본 에러문을 여는 exposeMessage:true 가 있습니다 -> ${offenders.join(", ")}`,
  );
});

check("R4c 응답 본문의 원본 드라이버 메시지", () => {
  // 저자가 쓴 문자열을 담는 debugMessage(예: billing.js 의 상류 응답 문구)는 대상이 아니다.
  // 오직 "에러 객체의 message 를 그대로 싣는" 형태만 막는다.
  const pattern = /debugMessage:\s*String\(\s*(error|err)\??\.\s*message/;
  const offenders = workerSources
    .filter((file) => pattern.test(stripComments(readFileSync(file, "utf8"))))
    .map((file) => file.slice(root.length + 1).replace(/\\/g, "/"));
  assert.equal(
    offenders.length,
    0,
    `응답에 원본 에러 메시지를 싣는 debugMessage 가 있습니다 -> ${offenders.join(", ")}`,
  );
});

/* ── R5. credentialed CORS 의 localhost 허용 범위 ──────────────────────────────
   예전엔 hostname 만 봐서 임의 포트·http 까지 열렸고, 피해자 기기 로컬호스트에서
   페이지를 띄울 수 있는 공격자가 인증된 결제·프로필 응답을 읽을 수 있었다. */
check("R5 CORS localhost 정확 매칭", () => {
  const body = functionBody(workerIndex, "function isAllowedOrigin(");
  assert.ok(
    body.includes('origin === "https://localhost"'),
    "isAllowedOrigin: Capacitor 앱 셸(https://localhost) 정확 매칭이 사라졌습니다.",
  );
  const loose = body
    .split("\n")
    .filter((line) => /hostname === "localhost"|hostname === "127\.0\.0\.1"/.test(line))
    .filter((line) => !line.includes("isProductionRuntime"));
  assert.equal(
    loose.length,
    0,
    `isAllowedOrigin: 프로덕션 게이트 없는 localhost 허용이 있습니다 -> ${loose.map((l) => l.trim()).join(" | ")}`,
  );
});

/* ── R7. 결제 취소·환불 경로의 불변식 ────────────────────────────────────────
   전부 "돈이 나가는데 서버가 근거를 갖고 있는가"에 대한 규칙이다. */
check("R7a 셀프 취소가 잠금 콘텐츠를 회수한다", () => {
  const body = functionBody(payments, "async function handleCancel(");
  assert.ok(
    body.includes("revokeSinglePaymentContentAccess("),
    "handleCancel: 환불하면서 잠금 해제를 회수하지 않습니다 — 콘텐츠 열람 후 셀프 취소로 '환불받고 콘텐츠 유지'가 됩니다.",
  );
  assert.ok(
    body.includes("revocationFields:"),
    "handleCancel: 회수 결과를 결제 문서에 기록하지 않습니다(관리자 경로와 같은 필드를 써야 대조가 됩니다).",
  );
});

check("R7a-2 셀프 취소 회수의 범위·우회 방지", () => {
  const body = functionBody(payments, "async function handleCancel(");
  // 부분취소 여부는 결국 클라이언트가 보낸 cancelAmount 로 결정된다. 잠금 상품에서 부분취소를
  // 허용하면 `cancelAmount: paidAmount - 1` 한 줄로 회수를 건너뛸 수 있다.
  assert.ok(
    body.includes("PARTIAL_CANCEL_NOT_SUPPORTED"),
    "handleCancel: 디지털 단건 상품의 부분취소 거절이 사라졌습니다 — 회수를 우회할 수 있습니다.",
  );
  // 회수는 단건 디지털에만. revokePaymentContentAccess 뒷부분이 User 문서를 전역 $pull 하므로
  // 포인트충전·구독 결제까지 회수하면 무관한 해금이 날아간다.
  assert.ok(
    body.includes("isSinglePurchaseDigitalPayment("),
    "handleCancel: 회수 대상이 단건 디지털 결제로 한정되지 않았습니다.",
  );
});

check("R7b 자동 환불이 서버 관측 기록으로 게이팅된다", () => {
  const body = functionBody(payments, "async function handleReportFailure(");
  assert.ok(
    body.includes("resolvePaidResultDelivery("),
    "handleReportFailure: 자동 환불이 클라이언트 주장(autoRefund/reasonCode)만으로 실행됩니다.",
  );
  const gateIdx = body.indexOf("resolvePaidResultDelivery(");
  const cancelIdx = body.indexOf("cancelReportedResultFailurePayment(");
  assert.ok(cancelIdx >= 0, "handleReportFailure: 환불 실행 호출을 찾지 못했습니다.");
  assert.ok(gateIdx < cancelIdx, "handleReportFailure: 전달 여부 확인이 환불 실행보다 뒤에 있습니다.");

  const gate = functionBody(payments, "async function resolvePaidResultDelivery(");
  assert.ok(gate.includes('"completed"'), "resolvePaidResultDelivery: 완료 판정이 사라졌습니다.");
  assert.ok(gate.includes("PaidExecutionRecord"), "resolvePaidResultDelivery: 서버 실행 기록을 보지 않습니다.");
  // 잠금 콘텐츠 구매는 실행 기록을 남기지 않는다 — 엔타이틀먼트를 안 보면 그 상품군에서 게이트가 항상 통과한다.
  assert.ok(
    gate.includes("ContentEntitlement"),
    "resolvePaidResultDelivery: 잠금 콘텐츠 증거(ContentEntitlement)를 보지 않아 그 상품군에서 게이트가 무효가 됩니다.",
  );
  assert.ok(gate.includes("userId: ownerId"), "resolvePaidResultDelivery: 결제 소유자로 좁히지 않았습니다.");
});

check("R7c 웹훅 다중서명 파싱", () => {
  const body = functionBody(payments, "function parseStandardWebhookSignatures(");
  assert.ok(
    !/\.split\(\s*","\s*\)/.test(body),
    "parseStandardWebhookSignatures: 쉼표로 자르면 `v1,A v1,B` 가 부서집니다 — 키 로테이션 창에서 웹훅이 전량 거부됩니다.",
  );
  assert.ok(
    /\.split\(\s*\/\\s\+\//.test(body),
    "parseStandardWebhookSignatures: 공백 구분으로 잘라야 합니다(Standard Webhooks 규격).",
  );
});

/* ── R6. 보안 헤더 유지 + 미러 동기화 ─────────────────────────────────────────
   _headers 는 루트와 public 두 벌이며 어긋나면 배포본만 조용히 약해진다. */
check("R6 Permissions-Policy 와 _headers 미러", () => {
  const rootHeaders = source("_headers");
  const publicHeaders = source("public/_headers");
  assert.equal(rootHeaders, publicHeaders, "_headers 와 public/_headers 가 어긋났습니다.");
  assert.ok(/Permissions-Policy:/.test(rootHeaders), "_headers: Permissions-Policy 가 사라졌습니다.");
  // 관상 라이브 카메라·베다 현재위치가 실제로 쓰므로 self 로 살아 있어야 한다(차단하면 기능이 죽는다).
  assert.ok(/camera=\(self\)/.test(rootHeaders), "_headers: camera=(self) 가 아닙니다 — 관상 카메라가 막히거나 서드파티에 열립니다.");
  assert.ok(/geolocation=\(self\)/.test(rootHeaders), "_headers: geolocation=(self) 가 아닙니다 — 베다 현재위치가 막히거나 서드파티에 열립니다.");
  assert.ok(/microphone=\(\)/.test(rootHeaders), "_headers: microphone 차단이 사라졌습니다.");
});

if (failures.length) {
  console.error("[verify-security-hardening] 실패\n" + failures.map((f) => `  - ${f}`).join("\n"));
  process.exit(1);
}

console.log(`[verify-security-hardening] ok (${workerSources.length}개 워커 소스 검사)`);
