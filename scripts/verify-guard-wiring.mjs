#!/usr/bin/env node
/**
 * 가드 배선 메타 가드 — "어느 게이트가 이 검증기를 부르는가"를 계산한다.
 *
 * 왜 필요한가 (docs/guard-integrity-2026-08-13.md G-5·G-6):
 *   `verify:*` 가 177개인데 그중 다수가 **어디서도 실행되지 않는다.** 가드가 실패하면 누구나
 *   안다. 가드가 아예 안 돌면 아무도 모른다 — 이름이 목록에 있다는 사실만으로 지켜지고 있다고
 *   믿게 된다. 실제로 `verify:auth-session-stability` 는 하네스가 깨진 채 방치돼 있었고(G-1),
 *   그걸 부르는 워크플로가 없어서 신호가 0이었다.
 *
 *   `deploy:critical` 목록과 `paid-flow-gates.yml` 목록은 손으로 관리되고 서로 포함 관계도
 *   아니다. 그 둘 사이로 검증기가 조용히 빠져나가는 것을 막을 방법이 없었다.
 *
 * 무엇을 강제하는가:
 *   모든 `verify:*` 는 **게이트에서 도달 가능하거나**, 아니면 **왜 아닌지 사유와 함께 아래
 *   UNWIRED_BY_DESIGN 에 선언돼 있어야** 한다. 둘 다 아니면 실패한다.
 *
 * fail-closed 3방향 (G-2 의 교훈: 대상이 없을 때 통과시키는 가드는 가드가 아니다):
 *   ① 배선도 없고 선언도 없는 검증기      → 실패 (새 가드가 조용히 안 도는 것을 막는다)
 *   ② 선언돼 있는데 실제로는 배선된 것    → 실패 (낡은 선언이 쌓여 목록이 거짓말이 되는 것을 막는다)
 *   ③ 존재하지 않는 스크립트를 가리키는 선언 → 실패 (이름이 바뀌면 선언이 죽은 채 남는다)
 *
 * 알려진 한계:
 *   ① "배선됨"은 **호출된다**는 뜻이지 **실패가 머지를 막는다**는 뜻은 아니다. build-cf-main.mjs 의
 *   `i18n:check` 스텝은 `optional: true` 라 실패해도 빌드를 세우지 않는다 — 그 아래 i18n 검증기
 *   4개는 "배선됐지만 비차단"이다. 이 가드는 그 구분을 하지 않는다.
 *
 *   ② 🔴 워크플로의 **트리거 `paths:` 에 적힌 스크립트 경로도 간선으로 읽힌다**(2026-08-25 발견).
 *   readWorkflowRoots 가 YAML 전체에 edgesFrom 을 돌리기 때문이다. 그래서 `scripts/verify-x.mjs`
 *   를 `paths:` 에만 올려 두고 정작 스위트 목록에서 빼면, 이 가드는 여전히 "배선됨"으로 센다 —
 *   워크플로는 깨어나지만 그 검증기는 아무도 부르지 않는데도. paths 는 **깨어날 조건**이고 스위트
 *   목록이 **실행**이라, 둘을 함께 넣어야 한다(기존 human-design·oracle-consultation 도 그렇다).
 *   검증기를 스위트에서 뺄 때는 `paths:` 항목도 같이 뺄 것.
 *
 * 실행: npm run verify:guard-wiring [--report] [--self-test]
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const WORKFLOW_DIR = join(root, ".github", "workflows");
const SELF = "scripts/verify-guard-wiring.mjs";

/**
 * CI·배포 어디에서도 부르지 않는 검증기. 각 항목에 **왜** 를 적는다.
 *
 * 🔴 새 `verify:*` 를 여기에 넣기 전에 먼저 물을 것: "그럼 이건 언제 도는가?" 답이 "아무도 안
 * 부른다" 뿐이면 그건 가드가 아니라 죽은 스크립트다. 배선하거나 지우는 쪽이 대개 정답이다.
 * 게이트 추가는 사용자 승인 사항이므로(CLAUDE.md CI gate scope) 임의로 넣지 말 것.
 */
const UNWIRED_BY_DESIGN = [
  // ── 스테이징·릴리스 확인은 선택 절차다(CLAUDE.md 2026-09-12). 사용자 요청·릴리스 때만 수동 실행한다.
  ["verify:staging", "스테이징 실요청 — 사용자 요청·배포 인프라 변경·릴리스 때만 수동(--sha 필요)"],
  ["verify:release", "deploy:critical 수동 별칭 — 운영 릴리스 전 수동"],
  // ── MongoDB 자격증명이 필요하다. CI 러너에는 프로덕션 DB 접근이 없고, 있어서도 안 된다.
  ["verify:rpg-indexes", "실 DB 인덱스 점검 — MONGO_URI 필요"],
  ["verify:compass-report-indexes", "실 DB 인덱스 점검 — MONGO_URI 필요"],
  ["verify:access-unlock-indexes", "실 DB 인덱스 점검 — MONGO_URI 필요"],
  ["verify:permanent-unlock-index", "실 DB 인덱스 점검 — MONGO_URI 필요"],
  ["verify:v2-entitlement-service-keys", "실 DB 권한 행 점검(V2 serviceKey 백필) — MONGO_URI 필요"],
  ["verify:fusion-fortune-indexes", "실 DB 인덱스 점검 — MONGO_URI 필요"],
  ["verify:fusion-consultation-indexes", "실 DB 인덱스 점검 — MONGO_URI 필요"],
  ["verify:fortune-chat-indexes", "실 DB 인덱스 점검 — MONGO_URI 필요"],
  ["verify:guardian-fortune-indexes", "실 DB 인덱스 점검 — MONGO_URI 필요"],
  ["verify:human-design-indexes", "실 DB 인덱스 점검 — MONGO_URI 필요"],
  // 🔴 이 사유는 사실이어야 한다. verify:payment-reconcile 이 "자격증명 필요"로 선언돼 있었지만
  //    실제로는 readFileSync 만 하는 정적 검사기였고, 그 거짓 때문에 그 안의 단언 전부가 CI 에서
  //    아무것도 가르지 않았다(2026-08-24 발견·배선). 이 스크립트는 connectDb 를 실제로 부른다.
  ["verify:integrity-unique-indexes", "실 DB 인덱스 점검 — MONGO_URI 필요"],
  ["verify:drop-unused-secondary-indexes", "실 DB 인덱스 점검 — MONGO_URI 필요($indexStats 를 읽는다)"],
  ["verify:human-design-report-indexes", "실 DB 인덱스 점검 — MONGO_URI 필요"],
  ["verify:request-path-indexes", "실 DB 인덱스 점검 — MONGO_URI 필요"],
  ["verify:insight-public-read-indexes", "실 DB 인덱스 점검 — MONGO_URI 필요"],
  ["verify:reconcile-index-drift", "실 DB 인덱스 드리프트 점검 — MONGO_URI 필요(listIndexes·explain 읽기 전용)"],
  ["verify:purge-test-reports", "마이그레이션 --check — MONGO_URI·CD_PREVIEW_TEST_EMAIL 필요, 수동 실행이 본래 용도"],
  ["verify:point-history-feature-lookup-index", "실 DB 인덱스 점검 — MONGO_URI 필요"],
  ["verify:admin-audit-log-indexes", "실 DB 인덱스 점검 — MONGO_URI 필요"],
  ["verify:mongo-launch-indexes", "실 DB 인덱스 점검 — MONGO_URI 필요"],
  ["verify:checkout-funnel-ttl", "실 DB TTL 인덱스 점검 — MONGO_URI 필요"],
  ["verify:security-events-ttl", "실 DB TTL 인덱스 점검 — MONGO_URI 필요"],
  ["verify:guardian-fusion-ttl-indexes", "실 DB TTL·인덱스 점검 — MONGO_URI 필요"],
  ["verify:daehan-purchase-index", "실 DB 인덱스 점검 — MONGO_URI 필요"],
  ["verify:drop-redundant-prefix-indexes", "실 DB 인덱스 점검 — MONGO_URI 필요"],
  ["verify:monthly-credit-expiry", "실 DB 원장 점검 — MONGO_URI 필요"],
  ["verify:legacy-points", "실 DB 잔여 레거시 포인트 조회 — MONGO_URI 필요"],
  ["verify:user-status-backfill", "마이그레이션 --check — 수동 실행이 본래 용도"],
  ["verify:ghost-user-fields", "마이그레이션 --check — 수동 실행이 본래 용도"],
  ["verify:truncate-consume-ids", "마이그레이션 --check — 수동 실행이 본래 용도"],
  ["verify:phone-encryption-key", "실 DB 암호화 키 회전 점검 — MONGO_URI 필요"],

  // ── 실네트워크·실브라우저. CI 러너에서 못 돌거나, 돌면 외부 과금·쿼터를 태운다.
  ["verify:mobile-cdp-smoke", "실브라우저 CDP — 로컬 개발 서버 필요"],
  ["verify:desktop-cdp-smoke", "실브라우저 CDP — 로컬 개발 서버 필요"],
  ["verify:hybrid-desktop-cdp-smoke", "실브라우저 CDP — 로컬 개발 서버 필요"],
  ["verify:mobile-detail-render", "jsdom 실렌더 — 무거워 수동 실행(정적 짝은 CI 배선됨)"],
  [
    "verify:mobile-bottom-nav-clearance",
    "playwright 실렌더 + safe-area 에뮬레이션 — 브라우저 기동 비용. 하단 탭바 주변 fixed UI 를 고쳤으면 손으로 돌린다",
  ],
  [
    "verify:app-bottom-clearance",
    "playwright 실렌더 + safe-area 에뮬레이션, 최신 dist/ 필요(빌드 3분) — 찻집·네오 등 App Router 화면의 하단 여백을 고쳤으면 손으로 돌린다",
  ],
  [
    "verify:relationship-inline-browser",
    "playwright 실렌더 + 로컬 dev 서버 필요 — 「그 사람의 바람끼는?」 인라인 임베드 높이 계약과 결과 화면 장면 배치를 본다. 그 결과 화면이나 reportDashboard 의 iframe 높이 계약을 고쳤으면 손으로 돌린다. 게이트 승격은 사용자 승인 사항",
  ],
  ["verify:r2-fonts", "R2 실요청 — 네트워크 필요"],
  ["verify:r2-public-cache", "R2 실요청 — 네트워크 필요"],
  ["verify:www-canonical", "프로덕션 도메인 실요청 — 배포 후 수동 확인"],
  ["verify:redirects:live", "프로덕션 실요청 — _redirects 마지막 규칙이 상한에 잘렸는지는 배포 후에만 알 수 있다"],
  ["verify:i18n-no-fallback", "fallback 증가 ratchet 진단 — 배포 readiness와 분리해 명시적 i18n:check에서 실행"],
  ["verify:i18n-rendered-korean", "실브라우저(playwright)로 언어 전환 후 한국어 계수 — 모든 PR 에 브라우저 기동 비용을 얹지 않는다. 게이트 승격은 사용자 승인 사항"],
  ["verify:test-account-payment-flow", "테스트 계정 실결제 — 사용자 승인 후 수동"],
  ["verify:test-account-all-paid-services", "테스트 계정 실결제 — 사용자 승인 후 수동"],
  ["verify:fusion-fortune-live", "🔴 초융합 Gemini 실호출(--live) — 사용자 1회 한정 승인 후 수동. 플래그 없이 돌리면 계획만 찍는다"],
  ["verify:inicis-local-auth", "로컬 인증 서버 필요"],
  ["verify:play-console-products", "Google Play API 실요청 — 자격증명 필요"],
  ["verify:app-store-pricing", "스토어 가격표 대조 — 릴리스 전 수동"],

  // ── 🔴 "유료 LLM 실호출 계열" 버킷은 2026-08-25 에 통째로 없어졌다. 사유가 넷 다 거짓이었다.
  //    verify:vedic-basic-quality(jsdom 로컬 렌더) · verify:fusion-fortune-quality(기본이 mock,
  //    실호출은 --live 뒤) · verify:fortune-chat-reading(providerCall 주입, 출력에 "mock only —
  //    실제 모델 호출 없음"을 찍는다) · verify:naming-prompt(순수 정적 — 스크립트 헤더가 그렇게
  //    적고 있다). 넷 다 실호출 히트 0이고 합쳐 2.1초에 통과한다.
  //    바로 위 verify:payment-reconcile 과 **같은 형태의 거짓말**이었고, 같은 방식으로 고쳤다:
  //    scripts/run-paid-gate-suite.mjs 에 배선했다. 이 자리에 다시 넣지 말 것.

  // ── 리포트·감사 도구. 사람이 읽으라고 만든 것이지 통과/실패를 가르지 않는다.
  ["verify:mobile-final-audit", "감사 리포트가 갱신됐는지만 본다 — 코드 계약이 아니다"],
  ["verify:mobile-feature-coverage", "모바일 기능 커버리지 리포트 — 수동"],
  ["verify:mobile-runtime-readiness", "모바일 런타임 준비도 리포트 — 수동"],
  ["verify:insights-famous-coverage", "콘텐츠 커버리지 리포트 — 수동"],
  ["verify:seo-entity-registry", "SEO 엔티티 리포트 — 수동"],
  ["verify:style-sync", "스타일 미러 수동 점검 도구"],
  ["verify:cachebust-merge", "캐시버스트 병합 수동 점검 도구"],

  // ── 배선 후보이나 미승인. 게이트 추가는 사용자 승인 사항이라 임의로 넣지 않는다.
  //    2026-09-13 에 이 그룹의 실측 통과분 41개는 SHADOW_OBSERVING 으로 갔다. 여기 남은 것은
  //    **지금 실패하는** 검사다 — 배선 전에 원인을 고쳐야 한다(범위 밖 결함이므로 보고만 한 상태).
  //    🔴 이 버킷은 "지금은 아무것도 지키지 않는다"는 뜻이다. 문서가 이들을 "차단한다"고
  //    적고 있으면 그 문서가 틀린 것이다(2026-08-13 에 SERVICE_STRUCTURE·PAYMENT_AND_ACCESS 정정).
  ["verify:animal-totem-reading", "배선 후보(미승인) — 동물 토템 판정"],
  ["verify:no-timestamp-conflict", "배선 후보(미승인) — 현재 worker/payments 3건 오탐 상태라 배선 전 수정 필요"],
  ["verify:today-hub-gate", "배선 후보(미승인) — 오늘 허브 게이트"],
];

/**
 * shadow 관측 중인 검증기 — `[이름, 사유, 관측시작일]`.
 *
 * 왜 세 번째 버킷이 필요한가:
 *   `UNWIRED_BY_DESIGN` 의 "배선 후보(미승인)" 항목 다수는 **지금 그냥 통과한다.** 안 돌리는 것은
 *   순수한 손실이다. 그렇다고 차단 게이트에 바로 넣으면 오탐 하나가 main 을 세운다. 그래서
 *   비차단(`continue-on-error`) 워크플로에서 먼저 관측한다(CLAUDE.md "CI 선택 실행은 10회 push
 *   비교 전까지 shadow").
 *
 * 🔴 그런데 `isWired()` 는 **도달 가능성만** 본다 — 스텝이 무는지 여부를 모른다. 그래서 shadow 에
 * 올린 검증기를 `UNWIRED_BY_DESIGN` 에서 지우는 순간, 기존 축은 그걸 "배선됨"으로 집계하고
 * 감사 전체가 **없는 보호를 있다고 단언**한다 — 이 파일 헤더의 payment-reconcile·유료 LLM 사고
 * 두 건과 정확히 같은 모양이다. 그래서 이 버킷은 축이 하나 더 있다:
 *
 *   shadow 항목은 (a) 전체 워크플로 기준으로 **배선돼 있어야** 하고,
 *                 (b) shadow 워크플로를 제외한 기준으로는 **배선돼 있지 않아야** 한다.
 *   (a) 위반 = 안 도는 shadow(적어 놓고 아무도 안 부름). (b) 위반 = 차단하는 척하는 shadow
 *   (이미 무는 게이트에 있으니 관측 단계가 아니다 — 이 목록에서 내려야 한다).
 *
 * 🔴 여기 있는 동안은 **실패해도 아무것도 막지 않는다.** 문서가 이들을 "차단한다"고 적으면 그
 * 문서가 틀린 것이다. 차단 승격은 사용자 승인 사항이다(CLAUDE.md CI gate scope).
 */
const SHADOW_OBSERVING = [
  // 🔴 지금 비어 있는 것이 정상 상태다. 관측 중인 검증기가 없다는 뜻이며, 이 버킷의 기계
  //    (auditShadowObservation 의 양방향 축)는 그대로 둔다 — 다음 관측 때 다시 쓴다.
  //
  //    2026-09-13: 여기 있던 41개를 차단 게이트로 승격했다. main push 15런 × 41스텝 = 615건
  //    전부 success · 오탐 0(gh run 의 steps[].conclusion 집계)으로 phase-plan.md 의 승격 조건
  //    (10회 이상 관측 + 오탐 0 + 사용자 승인)을 충족했고 사용자 승인을 받았다. 41개는
  //    .github/workflows/pr-ci.yml 의 guards lane 으로 옮겼고 guards-shadow.yml 은 삭제했다.
  //    그래서 이들은 이제 UNWIRED_BY_DESIGN 도 SHADOW_OBSERVING 도 아닌 일반 배선 축이 센다.
];

// ─────────────────────────────────────────────────────────────── 그래프

/** 문자열·URL 은 건드리지 않고 주석만 지운다. 헤더 주석의 "실행: npm run verify:X" 가 배선으로 세어지면 안 된다. */
function stripJsComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

function stripYamlComments(source) {
  return source.replace(/^[ \t]*#.*$/gm, "");
}

/**
 * 텍스트에서 "무엇을 실행하는가"를 뽑는다.
 *   `npm run <name>`            — 워크플로·npm 스크립트 체인의 기본형
 *   `"run", "<name>"`           — deploy-safe.mjs·check-changed.mjs·build-cf-main.mjs 의 배열형
 *   `scripts/<file>.mjs`        — 이름을 거치지 않고 파일을 직접 실행하는 형태
 */
function edgesFrom(text) {
  const names = new Set();
  const files = new Set();
  for (const m of text.matchAll(/npm run ([A-Za-z0-9:_-]+)/g)) names.add(m[1]);
  for (const m of text.matchAll(/["']run["']\s*,\s*["']([A-Za-z0-9:_-]+)["']/g)) names.add(m[1]);
  for (const m of text.matchAll(/scripts\/[A-Za-z0-9/._-]+\.mjs/g)) files.add(m[0]);
  // deploy-safe.mjs 는 `path.join(scriptDir, "verify-deployed-assets.mjs")` 처럼 디렉터리를
  // 런타임에 붙인다. 경로 문자열만 찾으면 이런 실제 호출을 미배선으로 잘못 신고한다.
  for (const m of text.matchAll(/["']([A-Za-z0-9._-]+\.mjs)["']/g)) files.add(`scripts/${m[1]}`);
  return { names, files };
}

/**
 * 간선을 따라가지 않을 스크립트 — 파일 경로를 **실행 대상이 아니라 데이터로** 담고 있다.
 *
 * change-risk.mjs 와 resolve-ci-tier.mjs 는 self-test 픽스처로 "변경된 파일" 경로 목록을 갖는다
 * (예: `[["scripts/migrations/20260805-add-fortune-chat-indexes.mjs"], "critical"]`). 이걸 실행으로
 * 세면 마이그레이션 --check 검증기들이 통째로 가짜 초록불이 된다 — 실제로 그렇게 오탐했다.
 *
 * 여기 넣는 것은 **배선 집합을 줄이기만** 한다(더 많은 것을 선언하게 만든다). 거짓 통과를 만들
 * 수 없는 방향이라 안전한 예외다.
 */
const EDGE_BLIND_SCRIPTS = new Set(["scripts/lib/change-risk.mjs", "scripts/resolve-ci-tier.mjs"]);

/** `verify:foo` 가 실행하는 스크립트 파일 경로(있으면). 이름이 아니라 이 경로로 동일성을 본다. */
function targetFileOf(command) {
  const match = String(command || "").match(/scripts\/[A-Za-z0-9/._-]+\.mjs/);
  return match ? match[0] : null;
}

/** 배포 파이프라인 정본. 배포보다 먼저 도는 축에서는 출발점이 될 수 없다. */
const RELEASE_WORKFLOW = "cloudflare-pages-deploy.yml";

/** shadow 관측 전용 워크플로. 전부 `continue-on-error` 라 아무것도 막지 않는다. */
const SHADOW_WORKFLOW = "guards-shadow.yml";

/**
 * 게이트(워크플로)의 출발점을 모은다.
 *
 * `preDeployOnly` 를 주면 **배포보다 먼저 도는 워크플로만** 본다 — "이 검사가 배포 전에도
 * 도는가" 를 묻는 축이 쓴다. 이 레포는 PR 을 쓰지 않으므로(2026-09-12) 그 기준은
 * `pull_request` 가 아니라 **main push 로 도는가 + 릴리스 워크플로가 아닌가** 다.
 *
 * 🔴 릴리스 워크플로를 출발점에 넣으면 배포에서만 도는 게이트가 전부 "먼저 돈다"로 계산돼
 * 이 축이 통째로 공허해진다 — PRE_MERGE_EDGE_BLIND 가 막는 것과 같은 모양의 사고다.
 *
 * 🔴 같은 이유로 `preDeployOnly` 는 **shadow 워크플로도 항상 제외한다.** shadow 는 main push 로
 * 돌지만 비차단이라, 출발점에 넣으면 "배포 전에도 돈다"가 "배포 전에 막는다"로 읽힌다. 호출부가
 * 잊을 수 있는 일을 여기서 고정한다.
 *
 * `excludeWorkflows` 는 shadow 축이 쓴다 — "shadow 를 뺐을 때도 여전히 배선돼 있는가" 를 계산한다.
 * `entries`·`read` 는 self-test 주입구다(없으면 실제 .github/workflows 를 읽는다).
 */
export function readWorkflowRoots(options) {
  const preDeployOnly = Boolean(options?.preDeployOnly);
  const exclude = new Set([...(options?.excludeWorkflows || []), ...(preDeployOnly ? [SHADOW_WORKFLOW] : [])]);
  const entries = options?.entries || readdirSync(WORKFLOW_DIR);
  const read = options?.read || ((entry) => readFileSync(join(WORKFLOW_DIR, entry), "utf8"));
  const roots = { names: new Set(), files: new Set() };
  for (const entry of entries) {
    if (!/\.ya?ml$/.test(entry)) continue;
    if (exclude.has(entry)) continue;
    const source = stripYamlComments(read(entry));
    if (preDeployOnly && (entry === RELEASE_WORKFLOW || !/^\s{2}push:/m.test(source))) continue;
    const { names, files } = edgesFrom(source);
    for (const name of names) roots.names.add(name);
    for (const file of files) roots.files.add(file);
  }
  return roots;
}

/**
 * 게이트(워크플로)에서 출발해 도달 가능한 npm 스크립트 이름과 파일 경로를 모은다.
 *
 * 🔴 **도달 가능한 노드의 간선만 따라간다.** 이게 핵심이다. scripts/verify-mobile-final-audit.mjs
 * 는 다른 검증기 이름 10여 개를 문자열 배열로 갖고 있지만 실행하지는 않는다(마크다운에 그 문구가
 * 있는지만 본다). 아무 파일의 간선이나 따라가면 그 클러스터 전체가 가짜로 초록불이 된다.
 */
export function computeReachable(scripts, roots, readFile, edgeBlind = EDGE_BLIND_SCRIPTS) {
  const reachedNames = new Set();
  const reachedFiles = new Set();
  const queue = [...[...roots.names].map((n) => ["name", n]), ...[...roots.files].map((f) => ["file", f])];

  while (queue.length) {
    const [kind, value] = queue.pop();
    if (kind === "name") {
      if (reachedNames.has(value)) continue;
      if (!Object.hasOwn(scripts, value)) continue;
      reachedNames.add(value);
      const { names, files } = edgesFrom(scripts[value]);
      for (const name of names) queue.push(["name", name]);
      for (const file of files) queue.push(["file", file]);
      // npm 생명주기 훅. `postbuild` 가 run-postbuild.mjs 를 거쳐 verify:adsense-readiness 를
      // 부르는데, 어느 워크플로도 `npm run postbuild` 라고 적지 않는다 — npm 이 알아서 부른다.
      queue.push(["name", `pre${value}`], ["name", `post${value}`]);
      continue;
    }
    if (reachedFiles.has(value)) continue;
    reachedFiles.add(value);
    if (edgeBlind.has(value)) continue;
    const source = readFile(value);
    if (source == null) continue;
    const { names, files } = edgesFrom(stripJsComments(source));
    for (const name of names) if (name !== value) queue.push(["name", name]);
    for (const file of files) if (file !== value) queue.push(["file", file]);
  }
  return { reachedNames, reachedFiles };
}

/** 검증기 하나가 게이트에서 도달 가능한가 — 이름으로든, 대상 파일 경로로든. */
export function isWired(name, command, reachable) {
  if (reachable.reachedNames.has(name)) return true;
  const target = targetFileOf(command);
  return Boolean(target && reachable.reachedFiles.has(target));
}

/**
 * `ownedElsewhere` 는 **다른 버킷이 전수 책임지는** 이름들이다(현재: SHADOW_OBSERVING).
 *
 * 🔴 왜 양쪽 축에서 모두 빼는가: shadow 항목은 정상 상태에서 "배선됨"으로 계산되므로 ②에
 * 걸리고, shadow 워크플로가 사라지면 "미배선 + 미선언"이 되어 ①에 걸린다. 둘 중 어느 쪽도
 * 정확한 진단이 아니다(전자는 오탐, 후자는 원인을 가린다). 이름 하나는 축 하나가 소유한다.
 * 이 제외가 구멍이 되지 않는 이유는 auditShadowObservation 이 **양방향을 모두** 단언하고,
 * findBucketOverlap 이 한 이름의 두 버킷 동시 등재를 실패시키기 때문이다.
 */
export function auditGuardWiring({ scripts, roots, readFile, declared, ownedElsewhere = [] }) {
  const reachable = computeReachable(scripts, roots, readFile);
  const owned = new Set(ownedElsewhere);
  const verifyNames = Object.keys(scripts).filter((name) => name.startsWith("verify:"));

  const wired = [];
  const unwired = [];
  for (const name of verifyNames) {
    (isWired(name, scripts[name], reachable) ? wired : unwired).push(name);
  }

  const declaredNames = new Set(declared.map(([name]) => name));
  return {
    wired,
    unwired,
    // ① 배선도 선언도 없다 — 새 가드가 조용히 안 도는 것을 막는다.
    undeclared: unwired.filter((name) => !declaredNames.has(name) && !owned.has(name)),
    // ② 선언돼 있는데 실제로는 배선됐다 — 낡은 선언이 쌓여 목록이 거짓말이 되는 것을 막는다.
    staleDeclared: wired.filter((name) => declaredNames.has(name)),
    // ③ 존재하지 않는 스크립트를 가리키는 선언 — 이름이 바뀌면 선언이 죽은 채 남는다.
    danglingDeclared: [...declaredNames].filter((name) => !Object.hasOwn(scripts, name)),
  };
}

/**
 * `deploy:critical` 이 부르는데 **배포 전에는 돌지 않아도 되는** 게이트. 각 항목에 **왜** 를 적는다.
 *
 * 🔴 여기에 넣기 전에 먼저 물을 것: "그럼 이건 언제 처음 도는가?" 답이 "배포" 뿐이면
 * 그 게이트가 잡는 결함은 **커밋이 main 에 올라간 뒤에** 드러난다. 그동안 배포는 막혀 있고,
 * 올린 내용은 스테이징에 도달하지 못한다 — 최근 릴리스 실패 6건 중 5건이 그 형태였다.
 * 실 자격증명이 필요하거나 배포된 오리진이 있어야만 의미가 있는 것만 여기 온다.
 */
const POST_MERGE_BY_DESIGN = [
  // 지금은 비어 있다. 비어 있는 것이 정상 상태다 — 채워야 할 이유가 생기면 사유를 함께 적는다.
];

/**
 * 배포 전 도달성을 계산할 때만 간선을 끊는 파일.
 *
 * 🔴 왜 필요한가 (2026-08-24 실측): `pr-ci.yml` 은 `npm run verify:deploy-safe` 를 돌리고,
 * 그 검증기는 `scripts/deploy-safe.mjs` 를 **텍스트로 읽어** 계약을 확인한다 — 실행하지 않는다.
 * 그런데 그 파일 안에 `deploy:critical` 이라는 문자열이 있으므로, 간선을 그대로 따라가면
 * 배포 전용 게이트 **23개 중 23개가** "배포 전에도 돈다"로 계산된다. 그 상태의 축은 아무것도
 * 지키지 않는다 — 통과만 할 줄 아는 가드다.
 *
 * 🔴 이 목록은 도달 집합을 **줄이기만** 한다. 거짓 통과를 만들 수 없는 방향이라 안전한 예외다
 * (EDGE_BLIND_SCRIPTS 와 같은 논리).
 */
const PRE_MERGE_EDGE_BLIND = new Set([...EDGE_BLIND_SCRIPTS, "scripts/deploy-safe.mjs"]);

/**
 * `deploy:critical` 이 부르는 게이트를 **소스에서 전수 발견**한다.
 * 손으로 목록을 유지하지 않는다 — 배포 스크립트에 게이트가 하나 늘면 여기도 자동으로 는다.
 */
export function deployCriticalGates(scripts) {
  return [...edgesFrom(String(scripts?.["deploy:critical"] || "")).names];
}

/**
 * 배포가 부르는 게이트가 배포보다 먼저(main push CI 에서) 도는가.
 *
 * 기존 축("어느 게이트가 이 검증기를 부르는가")은 **언제** 부르는지를 보지 않는다. 배포에서만
 * 부르는 것도 "배선됨"이라 초록불이었고, 그 사이로 세 번 샜다(7e7f05a9 · 72e5c0d4 · ddf032d2 —
 * 전부 verify:worker-no-undef 가 worker/lib 의 미선언 식별자를 배포에서 처음 잡았다).
 */
export function auditPreMergeGates({ scripts, roots, readFile, declared }) {
  const reachable = computeReachable(scripts, roots, readFile, PRE_MERGE_EDGE_BLIND);
  const gates = deployCriticalGates(scripts);

  const preMerge = [];
  const postMergeOnly = [];
  for (const name of gates) {
    (isWired(name, scripts[name], reachable) ? preMerge : postMergeOnly).push(name);
  }

  const declaredNames = new Set((declared || []).map(([name]) => name));
  return {
    gates,
    preMerge,
    postMergeOnly,
    // ① 배포에서만 도는데 사유 선언도 없다 — 배포에서야 터지는 게이트가 조용히 늘어나는 것을 막는다.
    undeclared: postMergeOnly.filter((name) => !declaredNames.has(name)),
    // ② 선언돼 있는데 실제로는 배포 전에도 돈다 — 낡은 선언이 쌓여 목록이 거짓말이 되는 것을 막는다.
    staleDeclared: preMerge.filter((name) => declaredNames.has(name)),
    // ③ deploy:critical 이 더 이상 부르지 않는 것을 가리키는 선언.
    danglingDeclared: [...declaredNames].filter((name) => !gates.includes(name)),
  };
}

/**
 * shadow 축 — 관측 중이라고 적힌 것이 **정말 관측 중인가**, 그리고 **아직 차단은 아닌가**.
 *
 * `rootsAll` = 모든 워크플로, `rootsWithoutShadow` = shadow 워크플로만 제외한 나머지.
 * 두 도달 집합의 차이가 곧 "shadow 가 기여하는 실행"이다. 같은 이름이 양쪽에 다 있으면 그건
 * shadow 가 아니라 이미 차단 게이트다.
 */
export function auditShadowObservation({ scripts, rootsAll, rootsWithoutShadow, readFile, declared }) {
  const withShadow = computeReachable(scripts, rootsAll, readFile);
  const withoutShadow = computeReachable(scripts, rootsWithoutShadow, readFile);

  const observing = [];
  const notRunning = [];
  const alreadyBlocking = [];
  const missingScript = [];
  const malformed = [];

  for (const [name, reason, observedSince] of declared) {
    if (!String(reason || "").trim()) malformed.push([name, "사유가 비었다"]);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(observedSince || ""))) {
      malformed.push([name, `관측시작일이 YYYY-MM-DD 가 아니다(${observedSince ?? "없음"})`]);
    }
    if (!Object.hasOwn(scripts, name)) {
      missingScript.push(name);
      continue;
    }
    const inAll = isWired(name, scripts[name], withShadow);
    const inBlocking = isWired(name, scripts[name], withoutShadow);
    // ① 적어 놓고 아무도 안 부른다 — 이 버킷이 가장 위험하게 거짓말하는 형태다.
    if (!inAll) notRunning.push(name);
    // ② shadow 를 빼도 여전히 불린다 = 차단 축에 이미 있다. 관측 단계가 아니다.
    if (inBlocking) alreadyBlocking.push(name);
    if (inAll && !inBlocking) observing.push(name);
  }

  return { observing, notRunning, alreadyBlocking, missingScript, malformed };
}

/**
 * 한 검증기가 두 버킷에 동시에 등재되는 것을 막는다.
 *
 * 버킷이 셋이 되면서 생긴 위험이다. `UNWIRED_BY_DESIGN` 에 남겨 둔 채 `SHADOW_OBSERVING` 에도
 * 넣으면, 앞의 축은 "선언됐으니 괜찮다"로 조용해지고 뒤의 축은 ownedElsewhere 로 제외를
 * 얻는다 — 아무 축도 책임지지 않는 상태가 된다. 입력을 받는 순수 함수라 self-test 가 쉽다.
 */
export function findBucketOverlap(buckets) {
  const owner = new Map();
  const overlaps = [];
  for (const [bucketName, entries] of buckets) {
    for (const [name] of entries) {
      if (owner.has(name)) overlaps.push([name, owner.get(name), bucketName]);
      else owner.set(name, bucketName);
    }
  }
  return overlaps;
}

// ─────────────────────────────────────────────────────────────── 자기 검사

/** 세 가지 실패를 실제로 실패시키는지 본다. 통과만 할 줄 아는 가드는 G-2 가 된다. */
function selfTest() {
  const readNothing = () => null;
  const base = {
    scripts: {
      "verify:wired": "node scripts/verify-wired.mjs",
      "verify:orphan": "node scripts/verify-orphan.mjs",
      test: "npm run verify:wired",
    },
    roots: { names: new Set(["test"]), files: new Set() },
    readFile: readNothing,
  };

  const ok = auditGuardWiring({ ...base, declared: [["verify:orphan", "사유"]] });
  assertSelf(ok.undeclared.length === 0 && ok.staleDeclared.length === 0 && ok.danglingDeclared.length === 0,
    "정상 구성은 통과해야 한다");
  assertSelf(ok.wired.includes("verify:wired"), "npm run 체인을 따라 배선을 인식해야 한다");

  const undeclared = auditGuardWiring({ ...base, declared: [] });
  assertSelf(undeclared.undeclared.includes("verify:orphan"), "① 선언 없는 미배선 검증기를 잡아야 한다");

  const stale = auditGuardWiring({ ...base, declared: [["verify:wired", "사유"], ["verify:orphan", "사유"]] });
  assertSelf(stale.staleDeclared.includes("verify:wired"), "② 배선됐는데 남아 있는 선언을 잡아야 한다");

  const dangling = auditGuardWiring({ ...base, declared: [["verify:orphan", "사유"], ["verify:gone", "사유"]] });
  assertSelf(dangling.danglingDeclared.includes("verify:gone"), "③ 없는 스크립트를 가리키는 선언을 잡아야 한다");

  // 파일 경로로만 불리는 검증기(예: run-postbuild.mjs 가 부르는 adsense-readiness)도 배선이다.
  const byPath = auditGuardWiring({
    scripts: { "verify:byfile": "node scripts/verify-byfile.mjs", build: "node scripts/runner.mjs" },
    roots: { names: new Set(["build"]), files: new Set() },
    readFile: (file) => (file === "scripts/runner.mjs" ? 'run("scripts/verify-byfile.mjs")' : null),
    declared: [],
  });
  assertSelf(byPath.undeclared.length === 0, "파일 경로 호출도 배선으로 인정해야 한다");

  // 도달 불가능한 스크립트의 간선은 따라가지 않는다(verify-mobile-final-audit 형 미끼).
  const decoy = auditGuardWiring({
    scripts: { "verify:bait": "node scripts/verify-bait.mjs", "verify:decoy": "node scripts/verify-decoy.mjs" },
    roots: { names: new Set(), files: new Set() },
    readFile: (file) => (file === "scripts/verify-decoy.mjs" ? '["npm run verify:bait"]' : null),
    declared: [],
  });
  assertSelf(decoy.undeclared.includes("verify:bait"), "도달 불가 스크립트의 언급은 배선이 아니다");


  // ── 배포 전 축 — 배포가 부르는 게이트가 main push CI 에서도 도는가.
  const preBase = {
    scripts: {
      "deploy:critical": "npm run verify:early && npm run verify:late",
      "verify:early": "node scripts/verify-early.mjs",
      "verify:late": "node scripts/verify-late.mjs",
    },
    readFile: () => null,
  };
  const prRoots = (names) => ({ names: new Set(names), files: new Set() });

  assertSelf(
    deployCriticalGates(preBase.scripts).sort().join(",") === "verify:early,verify:late",
    "deploy:critical 의 게이트를 소스에서 전수 발견하지 못했다",
  );

  const preOk = auditPreMergeGates({
    ...preBase,
    roots: prRoots(["verify:early", "verify:late"]),
    declared: [],
  });
  assertSelf(preOk.undeclared.length === 0, "main push CI 에서 다 도는데 미선언으로 신고했다");

  const preGap = auditPreMergeGates({
    ...preBase,
    roots: prRoots(["verify:early"]),
    declared: [],
  });
  assertSelf(
    preGap.undeclared.join(",") === "verify:late",
    "배포에서만 도는 게이트를 잡지 못했다 — 이 축이 통과만 할 줄 알면 아무것도 지키지 않는다",
  );

  const preDeclared = auditPreMergeGates({
    ...preBase,
    roots: prRoots(["verify:early"]),
    declared: [["verify:late", "실 자격증명이 필요하다"]],
  });
  assertSelf(preDeclared.undeclared.length === 0, "사유가 선언된 게이트를 여전히 신고했다");

  const preStale = auditPreMergeGates({
    ...preBase,
    roots: prRoots(["verify:early", "verify:late"]),
    declared: [["verify:late", "낡은 선언"]],
  });
  assertSelf(preStale.staleDeclared.join(",") === "verify:late", "낡은 선언을 잡지 못했다");

  const preDangling = auditPreMergeGates({
    ...preBase,
    roots: prRoots(["verify:early", "verify:late"]),
    declared: [["verify:gone", "더 이상 없는 게이트"]],
  });
  assertSelf(preDangling.danglingDeclared.join(",") === "verify:gone", "죽은 선언을 잡지 못했다");

  // 🔴 읽기 전용 간선을 끊지 않으면 이 축은 공허해진다. deploy-safe.mjs 를 텍스트로 읽는
  //    검증기 하나만 main push CI 에 있어도 배포 게이트 전부가 "먼저 돈다"로 계산됐다(실측 23/23).
  const preLeak = auditPreMergeGates({
    scripts: {
      "deploy:critical": "npm run verify:late",
      "verify:late": "node scripts/verify-late.mjs",
      "verify:deploy-safe": "node scripts/verify-deploy-safe.mjs",
    },
    roots: prRoots(["verify:deploy-safe"]),
    readFile: (relPath) =>
      relPath === "scripts/verify-deploy-safe.mjs"
        ? 'readFileSync("scripts/deploy-safe.mjs")'
        : relPath === "scripts/deploy-safe.mjs"
          ? 'run("gates", npm, ["run", "deploy:critical"])'
          : null,
    declared: [],
  });
  assertSelf(
    preLeak.undeclared.join(",") === "verify:late",
    "deploy-safe.mjs 를 읽기만 하는 검증기를 통해 배포 게이트가 새어 들어왔다",
  );

  // ── shadow 축 — 관측 중이라고 적힌 것이 정말 도는가, 그리고 아직 차단은 아닌가.
  const wfEntries = ["pr-ci.yml", SHADOW_WORKFLOW, "notes.txt"];
  const wfRead = (entry) =>
    entry === SHADOW_WORKFLOW
      ? "on:\n  push:\n    branches: [main]\njobs:\n  shadow:\n    steps:\n      - run: npm run verify:shadowed\n"
      : "on:\n  push:\n    branches: [main]\njobs:\n  ci:\n    steps:\n      - run: npm run verify:blocking\n";

  const allRoots = readWorkflowRoots({ entries: wfEntries, read: wfRead });
  assertSelf(
    allRoots.names.has("verify:shadowed") && allRoots.names.has("verify:blocking"),
    "전체 기준 출발점에는 shadow 워크플로도 포함돼야 한다",
  );
  const noShadowRoots = readWorkflowRoots({ entries: wfEntries, read: wfRead, excludeWorkflows: [SHADOW_WORKFLOW] });
  assertSelf(
    !noShadowRoots.names.has("verify:shadowed") && noShadowRoots.names.has("verify:blocking"),
    "excludeWorkflows 가 shadow 워크플로를 제외하지 못했다 — 제외가 무효면 shadow 축 전체가 공허해진다",
  );
  // 🔴 shadow 는 main push 로 돌지만 비차단이다. 배포 전 축의 출발점이 되면 "배포 전에도 돈다"가
  //    "배포 전에 막는다"로 읽혀 RELEASE_WORKFLOW 를 넣었을 때와 같은 공허함이 생긴다.
  const preDeployRoots = readWorkflowRoots({ entries: wfEntries, read: wfRead, preDeployOnly: true });
  assertSelf(
    !preDeployRoots.names.has("verify:shadowed") && preDeployRoots.names.has("verify:blocking"),
    "배포 전 축이 비차단 shadow 워크플로를 출발점으로 삼았다",
  );

  const shadowBase = {
    scripts: {
      "verify:shadowed": "node scripts/verify-shadowed.mjs",
      "verify:blocking": "node scripts/verify-blocking.mjs",
    },
    readFile: readNothing,
    rootsAll: allRoots,
    rootsWithoutShadow: noShadowRoots,
  };

  const shadowOk = auditShadowObservation({ ...shadowBase, declared: [["verify:shadowed", "사유", "2026-09-12"]] });
  assertSelf(
    shadowOk.observing.join(",") === "verify:shadowed" &&
      !shadowOk.notRunning.length &&
      !shadowOk.alreadyBlocking.length &&
      !shadowOk.malformed.length &&
      !shadowOk.missingScript.length,
    "정상 shadow 구성(전체에선 배선·shadow 제외 시 미배선)을 통과시키지 못했다",
  );

  const shadowDead = auditShadowObservation({
    ...shadowBase,
    rootsAll: noShadowRoots, // shadow 워크플로가 사라진 상태
    declared: [["verify:shadowed", "사유", "2026-09-12"]],
  });
  assertSelf(
    shadowDead.notRunning.join(",") === "verify:shadowed",
    "① 적어만 놓고 아무도 부르지 않는 shadow 를 잡지 못했다",
  );

  const shadowBlocking = auditShadowObservation({ ...shadowBase, declared: [["verify:blocking", "사유", "2026-09-12"]] });
  assertSelf(
    shadowBlocking.alreadyBlocking.join(",") === "verify:blocking",
    "② 차단 게이트에 이미 있는데 shadow 라고 적힌 항목을 잡지 못했다",
  );

  const shadowGone = auditShadowObservation({ ...shadowBase, declared: [["verify:gone", "사유", "2026-09-12"]] });
  assertSelf(shadowGone.missingScript.join(",") === "verify:gone", "③ 없는 스크립트를 가리키는 shadow 선언을 잡지 못했다");

  const shadowSloppy = auditShadowObservation({
    ...shadowBase,
    declared: [["verify:shadowed", "", "2026/09/12"]],
  });
  assertSelf(shadowSloppy.malformed.length === 2, "사유 누락·관측시작일 형식 오류를 잡지 못했다");

  const overlap = findBucketOverlap([
    ["UNWIRED_BY_DESIGN", [["verify:both", "사유"]]],
    ["SHADOW_OBSERVING", [["verify:both", "사유", "2026-09-12"]]],
  ]);
  assertSelf(
    overlap.length === 1 && overlap[0][0] === "verify:both",
    "한 검증기가 두 버킷에 동시에 등재된 것을 잡지 못했다 — 그 상태에선 아무 축도 책임지지 않는다",
  );
  assertSelf(
    findBucketOverlap([
      ["UNWIRED_BY_DESIGN", [["verify:a", "사유"]]],
      ["SHADOW_OBSERVING", [["verify:b", "사유", "2026-09-12"]]],
    ]).length === 0,
    "서로 다른 버킷의 서로 다른 이름을 중복으로 신고했다",
  );

  // 🔴 개수를 손으로 적지 않는다. 직전에는 14개를 "13개 케이스"로 적고 있었다.
  console.log(`[verify-guard-wiring] self-test OK — ${selfTestCases}개 케이스 통과`);
}

let selfTestCases = 0;

function assertSelf(condition, message) {
  selfTestCases += 1;
  if (!condition) {
    console.error(`[verify-guard-wiring] self-test FAIL: ${message}`);
    process.exit(1);
  }
}

// ─────────────────────────────────────────────────────────────── 실행

const args = new Set(process.argv.slice(2));

if (args.has("--self-test")) {
  selfTest();
  process.exit(0);
}

const scripts = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).scripts || {};
const readRepoFile = (relPath) => {
  const abs = join(root, relPath);
  return existsSync(abs) ? readFileSync(abs, "utf8") : null;
};

const readForGraph = (relPath) => (relPath === SELF ? null : readRepoFile(relPath));

const result = auditGuardWiring({
  scripts,
  roots: readWorkflowRoots(),
  readFile: readForGraph,
  declared: UNWIRED_BY_DESIGN,
  ownedElsewhere: SHADOW_OBSERVING.map(([name]) => name),
});

if (args.has("--report")) {
  console.log(`\n== 배선됨 (${result.wired.length}) ==`);
  for (const name of result.wired.sort()) console.log(`  ${name}`);
  console.log(`\n== 미배선 (${result.unwired.length}) ==`);
  for (const name of result.unwired.sort()) console.log(`  ${name}`);
}

const problems = [];
let shadowObserving = 0;
if (result.undeclared.length) {
  problems.push(
    `아무 게이트도 부르지 않는데 사유 선언도 없는 검증기 ${result.undeclared.length}개:\n` +
      result.undeclared.map((name) => `    - ${name}`).join("\n") +
      "\n  → 게이트에 배선하거나(사용자 승인 필요), 지우거나, UNWIRED_BY_DESIGN 에 사유와 함께 선언하세요.",
  );
}
if (result.staleDeclared.length) {
  problems.push(
    `UNWIRED_BY_DESIGN 에 있지만 실제로는 배선된 검증기 ${result.staleDeclared.length}개:\n` +
      result.staleDeclared.map((name) => `    - ${name}`).join("\n") +
      "\n  → 목록에서 지우세요. 낡은 선언을 두면 이 목록 자체가 거짓말이 됩니다.",
  );
}
if (result.danglingDeclared.length) {
  problems.push(
    `UNWIRED_BY_DESIGN 이 존재하지 않는 스크립트를 가리킵니다 (${result.danglingDeclared.length}개):\n` +
      result.danglingDeclared.map((name) => `    - ${name}`).join("\n") +
      "\n  → 이름이 바뀌었거나 삭제됐습니다. 선언도 함께 정리하세요.",
  );
}


const preMergeResult = auditPreMergeGates({
  scripts,
  roots: readWorkflowRoots({ preDeployOnly: true }),
  readFile: readForGraph,
  declared: POST_MERGE_BY_DESIGN,
});

if (preMergeResult.undeclared.length) {
  problems.push(
    `배포(deploy:critical)만 부르고 main push CI 에서는 돌지 않는 게이트 ${preMergeResult.undeclared.length}개:\n` +
      preMergeResult.undeclared.map((name) => `    - ${name}`).join("\n") +
      "\n  → 이것들이 잡는 결함은 커밋이 main 에 올라간 뒤 배포에서 처음 드러납니다. 그동안" +
      "\n    배포는 막히고 올린 내용은 스테이징에 도달하지 못합니다." +
      "\n  → main push CI 워크플로에 배선하거나(사용자 승인 필요), POST_MERGE_BY_DESIGN 에 사유와 함께 선언하세요.",
  );
}
if (preMergeResult.staleDeclared.length) {
  problems.push(
    `POST_MERGE_BY_DESIGN 에 있지만 실제로는 배포 전에도 도는 게이트 ${preMergeResult.staleDeclared.length}개:\n` +
      preMergeResult.staleDeclared.map((name) => `    - ${name}`).join("\n") +
      "\n  → 목록에서 지우세요. 낡은 선언을 두면 이 목록 자체가 거짓말이 됩니다.",
  );
}
if (preMergeResult.danglingDeclared.length) {
  problems.push(
    `POST_MERGE_BY_DESIGN 이 deploy:critical 에 없는 게이트를 가리킵니다 (${preMergeResult.danglingDeclared.length}개):\n` +
      preMergeResult.danglingDeclared.map((name) => `    - ${name}`).join("\n") +
      "\n  → 배포 게이트 목록이 바뀌었습니다. 선언도 함께 정리하세요.",
  );
}

// ── 버킷 중복. 한 이름은 축 하나가 소유한다(ownedElsewhere 가 구멍이 되지 않게 하는 전제).
const overlaps = findBucketOverlap([
  ["UNWIRED_BY_DESIGN", UNWIRED_BY_DESIGN],
  ["POST_MERGE_BY_DESIGN", POST_MERGE_BY_DESIGN],
  ["SHADOW_OBSERVING", SHADOW_OBSERVING],
]);
if (overlaps.length) {
  problems.push(
    `한 검증기가 두 버킷에 동시에 등재됐습니다 (${overlaps.length}개):\n` +
      overlaps.map(([name, first, second]) => `    - ${name} (${first} + ${second})`).join("\n") +
      "\n  → 이 상태에서는 어느 축도 그 이름을 책임지지 않습니다. 한 버킷만 남기세요.",
  );
}

// ── shadow 축. 선언이 있는데 워크플로 파일이 없으면 제외가 무효가 되어 축 전체가 뒤집힌다.
const shadowWorkflowExists = existsSync(join(WORKFLOW_DIR, SHADOW_WORKFLOW));
if (SHADOW_OBSERVING.length && !shadowWorkflowExists) {
  problems.push(
    `SHADOW_OBSERVING 에 ${SHADOW_OBSERVING.length}개가 선언됐는데 .github/workflows/${SHADOW_WORKFLOW} 가 없습니다.` +
      "\n  → 그 항목들은 아무 데서도 돌지 않습니다. 워크플로를 복원하거나 선언을 UNWIRED_BY_DESIGN 으로 되돌리세요.",
  );
} else if (SHADOW_OBSERVING.length) {
  const shadowResult = auditShadowObservation({
    scripts,
    rootsAll: readWorkflowRoots(),
    rootsWithoutShadow: readWorkflowRoots({ excludeWorkflows: [SHADOW_WORKFLOW] }),
    readFile: readForGraph,
    declared: SHADOW_OBSERVING,
  });
  if (shadowResult.notRunning.length) {
    problems.push(
      `SHADOW_OBSERVING 에 있지만 어느 워크플로도 부르지 않는 검증기 ${shadowResult.notRunning.length}개:\n` +
        shadowResult.notRunning.map((name) => `    - ${name}`).join("\n") +
        `\n  → "관측 중"이라고 적혀 있으나 신호가 0입니다. ${SHADOW_WORKFLOW} 에 해당 이름을 부르는 스텝을 추가하세요(continue-on-error 유지).`,
    );
  }
  if (shadowResult.alreadyBlocking.length) {
    problems.push(
      `SHADOW_OBSERVING 에 있지만 shadow 를 제외해도 여전히 배선된 검증기 ${shadowResult.alreadyBlocking.length}개:\n` +
        shadowResult.alreadyBlocking.map((name) => `    - ${name}`).join("\n") +
        "\n  → 이미 차단 게이트에 있습니다. 관측 단계가 아니므로 SHADOW_OBSERVING 에서 내리세요." +
        "\n    이 목록을 그대로 두면 '차단하는 척하는 shadow' 가 됩니다.",
    );
  }
  if (shadowResult.missingScript.length) {
    problems.push(
      `SHADOW_OBSERVING 이 존재하지 않는 스크립트를 가리킵니다 (${shadowResult.missingScript.length}개):\n` +
        shadowResult.missingScript.map((name) => `    - ${name}`).join("\n") +
        "\n  → 이름이 바뀌었거나 삭제됐습니다. 선언도 함께 정리하세요.",
    );
  }
  if (shadowResult.malformed.length) {
    problems.push(
      `SHADOW_OBSERVING 선언 형식 오류 (${shadowResult.malformed.length}개):\n` +
        shadowResult.malformed.map(([name, why]) => `    - ${name}: ${why}`).join("\n") +
        "\n  → 각 항목은 [이름, 사유, 관측시작일(YYYY-MM-DD)] 입니다. 관측시작일이 없으면 승격 판단을 할 수 없습니다.",
    );
  }
  shadowObserving = shadowResult.observing.length;
}

if (problems.length) {
  console.error("\n[verify-guard-wiring] FAIL\n");
  for (const problem of problems) console.error(`  ${problem}\n`);
  process.exit(1);
}

console.log(
  `[verify-guard-wiring] OK — verify:* ${result.wired.length + result.unwired.length}개 중 ` +
    `${result.wired.length}개 배선(그중 ${shadowObserving}개는 비차단 shadow 관측), ` +
    `${result.unwired.length}개는 사유와 함께 미배선으로 선언됨. ` +
    `배포 게이트 ${preMergeResult.gates.length}개 중 ${preMergeResult.preMerge.length}개가 배포 전에도 돈다.`,
);
