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
  ["verify:point-history-feature-lookup-index", "실 DB 인덱스 점검 — MONGO_URI 필요"],
  ["verify:admin-audit-log-indexes", "실 DB 인덱스 점검 — MONGO_URI 필요"],
  ["verify:mongo-launch-indexes", "실 DB 인덱스 점검 — MONGO_URI 필요"],
  ["verify:checkout-funnel-ttl", "실 DB TTL 인덱스 점검 — MONGO_URI 필요"],
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
  ["verify:r2-fonts", "R2 실요청 — 네트워크 필요"],
  ["verify:r2-public-cache", "R2 실요청 — 네트워크 필요"],
  ["verify:www-canonical", "프로덕션 도메인 실요청 — 배포 후 수동 확인"],
  ["verify:redirects:live", "프로덕션 실요청 — _redirects 마지막 규칙이 상한에 잘렸는지는 배포 후에만 알 수 있다"],
  ["verify:i18n-rendered-korean", "실브라우저(playwright)로 언어 전환 후 한국어 계수 — 모든 PR 에 브라우저 기동 비용을 얹지 않는다. 게이트 승격은 사용자 승인 사항"],
  ["verify:test-account-payment-flow", "테스트 계정 실결제 — 사용자 승인 후 수동"],
  ["verify:test-account-all-paid-services", "테스트 계정 실결제 — 사용자 승인 후 수동"],
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
  ["verify:doc-freshness", "문서 신선도 리포트 — 판정이 아니라 참고 지표"],
  ["verify:mobile-final-audit", "감사 리포트가 갱신됐는지만 본다 — 코드 계약이 아니다"],
  ["verify:mobile-feature-coverage", "모바일 기능 커버리지 리포트 — 수동"],
  ["verify:mobile-runtime-readiness", "모바일 런타임 준비도 리포트 — 수동"],
  ["verify:insights-famous-coverage", "콘텐츠 커버리지 리포트 — 수동"],
  ["verify:seo-entity-registry", "SEO 엔티티 리포트 — 수동"],
  ["verify:style-sync", "스타일 미러 수동 점검 도구"],
  ["verify:cachebust-merge", "캐시버스트 병합 수동 점검 도구"],

  // ── 배선 후보이나 미승인. 게이트 추가는 사용자 승인 사항이라 임의로 넣지 않는다.
  //    🔴 이 버킷은 "지금은 아무것도 지키지 않는다"는 뜻이다. 문서가 이들을 "차단한다"고
  //    적고 있으면 그 문서가 틀린 것이다(2026-08-13 에 SERVICE_STRUCTURE·PAYMENT_AND_ACCESS 정정).
  ["verify:payment-service-boundary", "배선 후보(미승인) — 결제 경계 정적 검사"],
  ["verify:payment-choice-single-instance", "배선 후보(미승인) — 결제창 단일 인스턴스"],
  ["verify:pass-check-retry", "배선 후보(미승인) — 이용권 재검사 재시도 계약"],
  ["verify:auth-public-origin", "배선 후보(미승인) — OAuth 콜백 origin 고정"],
  ["verify:static-asset-cache-keys", "배선 후보(미승인) — 정적 자산 캐시 키"],
  ["verify:route-await-dispatch", "배선 후보(미승인) — 라우트 await 디스패치"],
  ["verify:auth-card-theme", "배선 후보(미승인) — 로그인 카드 테마 대비"],
  ["verify:hero-contrast", "배선 후보(미승인) — 히어로 대비 3:1 게이트"],
  ["verify:profile-client-first", "배선 후보(미승인) — 프로필 클라이언트 우선 로드"],
  ["verify:profile-new-user", "배선 후보(미승인) — 신규 사용자 프로필 초기화"],
  ["verify:profile-card-level", "배선 후보(미승인) — 프로필 카드 등급 표시"],
  ["verify:rpt-preview-cta", "배선 후보(미승인) — 리포트 프리뷰 CTA"],
  ["verify:sun-recovery-copy", "배선 후보(미승인) — 복구 안내 문구"],
  ["verify:admin-feedback-bug-reward", "배선 후보(미승인) — 관리자 피드백 보상"],
  ["verify:password-policy", "배선 후보(미승인) — 비밀번호 정책"],
  ["verify:llm-client-timeout-budget", "배선 후보(미승인) — LLM 타임아웃 예산(정적)"],
  ["verify:guardian-fortune-failure", "배선 후보(미승인) — 실패 계약(정적)"],
  ["verify:feature-marketing-schema", "배선 후보(미승인) — 기능 마케팅 스키마"],
  ["verify:market-policy-registry", "배선 후보(미승인) — 시장 정책 레지스트리"],
  ["verify:payment-policy-md", "배선 후보(미승인) — 결제 정책 문서 정합"],
  ["verify:physiognomy-report", "배선 후보(미승인) — 관상 리포트 섹션 파서"],
  ["verify:physiognomy-scoring", "배선 후보(미승인) — 관상 점수 결정성"],
  ["verify:animal-totem-reading", "배선 후보(미승인) — 동물 토템 판정"],
  ["verify:animal-totem-render", "배선 후보(미승인) — 동물 토템 렌더"],
  ["verify:past-life-face", "배선 후보(미승인) — 전생 얼굴 결정성"],
  ["verify:numerology-tarot-flow", "배선 후보(미승인) — 수비학 타로 플로우"],
  ["verify:tarot-love-flow", "배선 후보(미승인) — 타로 연애 플로우"],
  ["verify:tarot-topic-lock", "배선 후보(미승인) — 타로 주제 고정"],
  ["verify:love-compat", "배선 후보(미승인) — 궁합 결정성"],
  ["verify:ziwei-island", "배선 후보(미승인) — 자미두수 아일랜드 청사진"],
  ["verify:destiny-compass", "배선 후보(미승인) — 운명 나침반 결정성"],
  ["verify:pet-saju", "배선 후보(미승인) — 반려동물 사주 결정성"],
  ["verify:rpg-phase9", "배선 후보(미승인) — RPG 페이즈9 계약"],
  ["verify:fusion-fortune-reopen", "배선 후보(미승인) — 융합 운세 재열람"],
  ["verify:fusion-fortune-delivery-floor", "배선 후보(미승인) — 초융합 배달 바닥(품질 미달은 강등 배달, 안전 위반은 반려)"],
  ["verify:fusion-fortune-pdf", "배선 후보(미승인) — 초융합 텍스트 PDF 문서 구성(본문 누락·빈 장·개인정보)"],
  ["verify:no-timestamp-conflict", "배선 후보(미승인) — 현재 worker/payments 3건 오탐 상태라 배선 전 수정 필요"],
  ["verify:vn-override-safety", "배선 후보(미승인) — VN 오버라이드 안전성"],
  ["verify:cms-registry", "배선 후보(미승인) — CMS 레지스트리"],
  ["verify:today-hub-gate", "배선 후보(미승인) — 오늘 허브 게이트"],
  ["verify:app-no-portone", "배선 후보(미승인) — build:mobile:app 이 파일 경로로 직접 부른다"],
  ["verify:i18n-no-hardcoded-korean", "배선 후보(미승인) — 하드코딩 한국어 스캔"],
  ["verify:cf:migration", "배선 후보(미승인) — Cloudflare 이전 준비도(이전 완료로 사실상 역할 종료)"],
  ["verify:mobile-entry-actions", "배선 후보(미승인) — 모바일 진입 액션 배선"],
  ["verify:mobile-pricing-parity", "배선 후보(미승인) — 모바일 가격 표기 정합"],
  ["verify:mobile-bottom-nav-sync", "배선 후보(미승인) — 모바일 하단 내비 동기화"],
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

/**
 * 게이트(워크플로)의 출발점을 모은다.
 *
 * `pullRequestOnly` 를 주면 **pull_request 로 트리거되는 워크플로만** 본다 — "이 검사가
 * 머지 전에도 도는가" 를 묻는 축이 쓴다. push:main·schedule 로만 도는 워크플로(릴리스·워치독)는
 * 이미 머지된 뒤이므로 그 축에서는 출발점이 될 수 없다.
 */
function readWorkflowRoots(options) {
  const pullRequestOnly = Boolean(options?.pullRequestOnly);
  const roots = { names: new Set(), files: new Set() };
  for (const entry of readdirSync(WORKFLOW_DIR)) {
    if (!/\.ya?ml$/.test(entry)) continue;
    const source = stripYamlComments(readFileSync(join(WORKFLOW_DIR, entry), "utf8"));
    if (pullRequestOnly && !/^\s{2}pull_request:/m.test(source)) continue;
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

export function auditGuardWiring({ scripts, roots, readFile, declared }) {
  const reachable = computeReachable(scripts, roots, readFile);
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
    undeclared: unwired.filter((name) => !declaredNames.has(name)),
    // ② 선언돼 있는데 실제로는 배선됐다 — 낡은 선언이 쌓여 목록이 거짓말이 되는 것을 막는다.
    staleDeclared: wired.filter((name) => declaredNames.has(name)),
    // ③ 존재하지 않는 스크립트를 가리키는 선언 — 이름이 바뀌면 선언이 죽은 채 남는다.
    danglingDeclared: [...declaredNames].filter((name) => !Object.hasOwn(scripts, name)),
  };
}

/**
 * `deploy:critical` 이 부르는데 **머지 전에는 돌지 않아도 되는** 게이트. 각 항목에 **왜** 를 적는다.
 *
 * 🔴 여기에 넣기 전에 먼저 물을 것: "그럼 이건 언제 처음 도는가?" 답이 "머지된 뒤 배포" 뿐이면
 * 그 게이트가 잡는 결함은 **PR 이 초록불로 머지된 뒤에** 드러난다. 그동안 배포는 막혀 있고,
 * 머지한 내용은 스테이징에 도달하지 못한다 — 최근 릴리스 실패 6건 중 5건이 그 형태였다.
 * 실 자격증명이 필요하거나 배포된 오리진이 있어야만 의미가 있는 것만 여기 온다.
 */
const POST_MERGE_BY_DESIGN = [
  // 지금은 비어 있다. 비어 있는 것이 정상 상태다 — 채워야 할 이유가 생기면 사유를 함께 적는다.
];

/**
 * 머지 전 도달성을 계산할 때만 간선을 끊는 파일.
 *
 * 🔴 왜 필요한가 (2026-08-24 실측): `pr-ci.yml` 은 `npm run verify:deploy-safe` 를 돌리고,
 * 그 검증기는 `scripts/deploy-safe.mjs` 를 **텍스트로 읽어** 계약을 확인한다 — 실행하지 않는다.
 * 그런데 그 파일 안에 `deploy:critical` 이라는 문자열이 있으므로, 간선을 그대로 따라가면
 * 배포 전용 게이트 **23개 중 23개가** "머지 전에도 돈다"로 계산된다. 그 상태의 축은 아무것도
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
 * 배포가 부르는 게이트가 머지 전에도 도는가.
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
    // ① 배포에서만 도는데 사유 선언도 없다 — 머지 후에야 터지는 게이트가 조용히 늘어나는 것을 막는다.
    undeclared: postMergeOnly.filter((name) => !declaredNames.has(name)),
    // ② 선언돼 있는데 실제로는 머지 전에도 돈다 — 낡은 선언이 쌓여 목록이 거짓말이 되는 것을 막는다.
    staleDeclared: preMerge.filter((name) => declaredNames.has(name)),
    // ③ deploy:critical 이 더 이상 부르지 않는 것을 가리키는 선언.
    danglingDeclared: [...declaredNames].filter((name) => !gates.includes(name)),
  };
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


  // ── 머지 전 축 — 배포가 부르는 게이트가 PR 에서도 도는가.
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
  assertSelf(preOk.undeclared.length === 0, "PR 에서 다 도는데 미선언으로 신고했다");

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
  //    검증기 하나만 PR 에 있어도 배포 게이트 전부가 "머지 전에도 돈다"로 계산됐다(실측 23/23).
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
  console.log("[verify-guard-wiring] self-test OK — 13개 케이스 통과");
}

function assertSelf(condition, message) {
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

const result = auditGuardWiring({
  scripts,
  roots: readWorkflowRoots(),
  readFile: (relPath) => (relPath === SELF ? null : readRepoFile(relPath)),
  declared: UNWIRED_BY_DESIGN,
});

if (args.has("--report")) {
  console.log(`\n== 배선됨 (${result.wired.length}) ==`);
  for (const name of result.wired.sort()) console.log(`  ${name}`);
  console.log(`\n== 미배선 (${result.unwired.length}) ==`);
  for (const name of result.unwired.sort()) console.log(`  ${name}`);
}

const problems = [];
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
  roots: readWorkflowRoots({ pullRequestOnly: true }),
  readFile: (relPath) => (relPath === SELF ? null : readRepoFile(relPath)),
  declared: POST_MERGE_BY_DESIGN,
});

if (preMergeResult.undeclared.length) {
  problems.push(
    `배포(deploy:critical)만 부르고 PR 에서는 돌지 않는 게이트 ${preMergeResult.undeclared.length}개:\n` +
      preMergeResult.undeclared.map((name) => `    - ${name}`).join("\n") +
      "\n  → 이것들이 잡는 결함은 PR 이 초록불로 머지된 뒤 배포에서 처음 드러납니다. 그동안" +
      "\n    배포는 막히고 머지한 내용은 스테이징에 도달하지 못합니다." +
      "\n  → pull_request 워크플로에 배선하거나(사용자 승인 필요), POST_MERGE_BY_DESIGN 에 사유와 함께 선언하세요.",
  );
}
if (preMergeResult.staleDeclared.length) {
  problems.push(
    `POST_MERGE_BY_DESIGN 에 있지만 실제로는 머지 전에도 도는 게이트 ${preMergeResult.staleDeclared.length}개:\n` +
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
if (problems.length) {
  console.error("\n[verify-guard-wiring] FAIL\n");
  for (const problem of problems) console.error(`  ${problem}\n`);
  process.exit(1);
}

console.log(
  `[verify-guard-wiring] OK — verify:* ${result.wired.length + result.unwired.length}개 중 ` +
    `${result.wired.length}개 배선, ${result.unwired.length}개는 사유와 함께 미배선으로 선언됨. ` +
    `배포 게이트 ${preMergeResult.gates.length}개 중 ${preMergeResult.preMerge.length}개가 머지 전에도 돈다.`,
);
