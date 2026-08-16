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
 *   "배선됨"은 **호출된다**는 뜻이지 **실패가 머지를 막는다**는 뜻은 아니다. build-cf-main.mjs 의
 *   `i18n:check` 스텝은 `optional: true` 라 실패해도 빌드를 세우지 않는다 — 그 아래 i18n 검증기
 *   4개는 "배선됐지만 비차단"이다. 이 가드는 그 구분을 하지 않는다.
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
  ["verify:point-history-feature-lookup-index", "실 DB 인덱스 점검 — MONGO_URI 필요"],
  ["verify:admin-audit-log-indexes", "실 DB 인덱스 점검 — MONGO_URI 필요"],
  ["verify:mongo-launch-indexes", "실 DB 인덱스 점검 — MONGO_URI 필요"],
  ["verify:checkout-funnel-ttl", "실 DB TTL 인덱스 점검 — MONGO_URI 필요"],
  ["verify:monthly-credit-expiry", "실 DB 원장 점검 — MONGO_URI 필요"],
  ["verify:legacy-points", "실 DB 잔여 레거시 포인트 조회 — MONGO_URI 필요"],
  ["verify:user-status-backfill", "마이그레이션 --check — 수동 실행이 본래 용도"],
  ["verify:ghost-user-fields", "마이그레이션 --check — 수동 실행이 본래 용도"],
  ["verify:truncate-consume-ids", "마이그레이션 --check — 수동 실행이 본래 용도"],
  ["verify:phone-encryption-key", "실 DB 암호화 키 회전 점검 — MONGO_URI 필요"],
  ["verify:payment-reconcile", "실 PG·DB 대사 — 프로덕션 자격증명 필요, 사용자 승인 후 수동"],

  // ── 실네트워크·실브라우저. CI 러너에서 못 돌거나, 돌면 외부 과금·쿼터를 태운다.
  ["verify:mobile-cdp-smoke", "실브라우저 CDP — 로컬 개발 서버 필요"],
  ["verify:desktop-cdp-smoke", "실브라우저 CDP — 로컬 개발 서버 필요"],
  ["verify:hybrid-desktop-cdp-smoke", "실브라우저 CDP — 로컬 개발 서버 필요"],
  ["verify:mobile-detail-render", "jsdom 실렌더 — 무거워 수동 실행(정적 짝은 CI 배선됨)"],
  ["verify:r2-fonts", "R2 실요청 — 네트워크 필요"],
  ["verify:r2-public-cache", "R2 실요청 — 네트워크 필요"],
  ["verify:www-canonical", "프로덕션 도메인 실요청 — 배포 후 수동 확인"],
  ["verify:redirects:live", "프로덕션 실요청 — _redirects 마지막 규칙이 상한에 잘렸는지는 배포 후에만 알 수 있다"],
  ["verify:i18n-rendered-korean", "실브라우저(playwright)로 언어 전환 후 한국어 계수 — 모든 PR 에 브라우저 기동 비용을 얹지 않는다. 게이트 승격은 사용자 승인 사항"],
  ["verify:novel-runtime", "실브라우저 필요"],
  ["verify:novel-player-start", "실브라우저 필요"],
  ["verify:test-account-payment-flow", "테스트 계정 실결제 — 사용자 승인 후 수동"],
  ["verify:test-account-all-paid-services", "테스트 계정 실결제 — 사용자 승인 후 수동"],
  ["verify:inicis-local-auth", "로컬 인증 서버 필요"],
  ["verify:play-console-products", "Google Play API 실요청 — 자격증명 필요"],
  ["verify:app-store-pricing", "스토어 가격표 대조 — 릴리스 전 수동"],

  // ── 유료 LLM 실호출 계열. CLAUDE.md 코딩 원칙 8: 사용자 허락 없이 절대 실행 금지.
  ["verify:vedic-basic-quality", "LLM 실호출 — 원칙 8, 사용자 허락 후 수동"],
  ["verify:fusion-fortune-quality", "LLM 실호출 — 원칙 8, 사용자 허락 후 수동"],
  ["verify:fortune-chat-reading", "LLM 실호출 — 원칙 8, 사용자 허락 후 수동"],
  ["verify:naming-prompt", "LLM 실호출 — 원칙 8, 사용자 허락 후 수동"],

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

function readWorkflowRoots() {
  const roots = { names: new Set(), files: new Set() };
  for (const entry of readdirSync(WORKFLOW_DIR)) {
    if (!/\.ya?ml$/.test(entry)) continue;
    const { names, files } = edgesFrom(stripYamlComments(readFileSync(join(WORKFLOW_DIR, entry), "utf8")));
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
export function computeReachable(scripts, roots, readFile) {
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
    if (EDGE_BLIND_SCRIPTS.has(value)) continue;
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

  console.log("[verify-guard-wiring] self-test OK — 6개 케이스 통과");
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

if (problems.length) {
  console.error("\n[verify-guard-wiring] FAIL\n");
  for (const problem of problems) console.error(`  ${problem}\n`);
  process.exit(1);
}

console.log(
  `[verify-guard-wiring] OK — verify:* ${result.wired.length + result.unwired.length}개 중 ` +
    `${result.wired.length}개 배선, ${result.unwired.length}개는 사유와 함께 미배선으로 선언됨.`,
);
