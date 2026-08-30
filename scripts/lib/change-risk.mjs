/**
 * 변경 파일의 위험도 분류. 두 가지를 서로 독립적으로 판정한다.
 *
 *   level          — 평소 얼마나 깊게 검사할지 (low / medium / high)
 *   deepRequired   — preview 스모크가 못 잡는 영역이라 무조건 전체 회귀를 돌릴지
 *
 * 두 축을 섞으면 안 된다. worker/** 는 계속 level=high 라서 배포 파이프라인이
 * deploy:critical 을 계속 돌리지만, 사주·타로 라우트는 deepRequired=false 라
 * 위험도 기반 검사만 받는다. "깊게 검사한다"와 "무조건 전부 검사한다"는 다른 질문이다.
 *
 * 2026-08-08 이전에는 두 번째 축이 prRequired 였고 PR 을 강제했다. PR 정책을 폐기하면서
 * 경로 목록은 그대로 두고 의미만 "사람이 리뷰한다" → "기계가 전부 검사한다" 로 바꿨다.
 * 경로 자체는 여전히 사고가 나던 곳이라 지식으로서 가치가 있다.
 *
 * 이 파일이 생기기 전에는 분류기가 두 벌이었다 — check-changed.mjs 와 deploy-safe.mjs 의
 * 패턴이 서로 달라 같은 커밋을 다르게 판정할 수 있었다. level 패턴은 배포를 좌우하는
 * deploy-safe.mjs 쪽을 정본으로 그대로 가져왔다.
 */

const highPatterns = [
  // 🔴 2026-08-27 — 테스트 파일 자체가 미분류라 medium 으로 떨어지고 있었다. medium 은
  //    resolve-ci-tier 에서 standard 가 되고 standard 는 npm test 를 건너뛴다. 결과:
  //    **테스트만 고친 PR 은 그 테스트가 CI 에서 한 번도 안 돈 채 머지된다.**
  //    PR #1174(회당결제 증빙 왕복 가드)가 정확히 그렇게 초록불이었다 —
  //    Critical checks 가 "tier=standard … 전체 테스트를 건너뜁니다" 를 찍고 통과했다.
  //    아래 두 사고(#940·#924)와 같은 계열이다: 목록에 없어서 조용히 안 돈다.
  /^__tests__\//i,
  /^worker\//i, /(^|\/)(payment|billing|auth|login|signup|access|unlock|entitlement|mongo|database|migration|migrate|kv|d1|r2|durable)/i,
  /(^|\/)wrangler\.(toml|jsonc?)$/i, /(^|\/)\.env/i, /^\.github\/workflows\//i,
  /(^|\/)package-lock\.json$/i, /(^|\/)scripts\/deploy/i,
];
const mediumPatterns = [
  /(^|\/)(app|components|src|lib|js)\//i, /(^|\/)(route|cache|profile|session)/i,
  /(^|\/)(package\.json|next\.config\.|tsconfig\.)/i,
];
const lowPatterns = [
  /(^|\/)(docs?|reports?)\//i, /(^|\/)(styles?|css)\//i,
  /\.(css|scss|sass|less|svg|png|jpg|jpeg|webp|gif|ico|avif)$/i,
  /(^|\/)(index\.html|public\/i18n\/|sitemap|robots|ads\.txt)/i,
];

/**
 * 전체 회귀(deploy:critical)를 무조건 돌려야 하는 경로.
 *
 * 기준은 "릴리스 파이프라인의 preview 스모크가 이 실수를 잡아낼 수 있는가"다. 잡아낼 수
 * 있으면 preview 에서 멈추고 프로덕션에 도달하지 못한다. 못 잡는 것만 여기 넣는다:
 *
 *   인증·결제  — 200 을 반환하면서도 틀릴 수 있다. 스모크는 게스트 경로만 두드린다.
 *   DB 스키마  — 되돌릴 수 없다. 롤백해도 데이터는 이미 바뀐 뒤다.
 *   배포 인프라 — 깨지면 복구 수단 자체가 사라진다.
 *
 * 여기 걸리면 deploy-safe 가 (1) risk level 과 무관하게 deploy:critical 전체를 돌리고
 * (2) 프로덕션 승격 직전에 어떤 경로가 왜 위험한지 나열한 뒤 확인을 받는다.
 */
const deepVerificationRules = [
  // ── 인증·세션
  [/^worker\/routes\/auth\.js$/i, "인증 라우트"],
  [/^worker\/lib\/(auth|jwt|session|token)[^/]*\.(js|mjs|ts)$/i, "인증 라이브러리"],
  [/(^|\/)(login|oauth|signup|withdraw)[^/]*\.(js|mjs|jsx|ts|tsx)$/i, "로그인·가입·탈퇴 경로"],
  [/^js\/core\/access-store\.js$/i, "접근 상태 저장소"],

  // ── 결제·권한
  // access-state 는 정확일치가 아니라 접두 일치가 필요하다 — `access.js` 만 적혀 있어서
  // `access-state.js`(유료 판정 스냅샷 배달 경로)가 deepRequired 에서 빠져 있었다(2026-08-31).
  [/^worker\/routes\/(payments|billing|access|access-state|app-store)\.js$/i, "결제·권한 라우트"],
  // billing-feature-registry 는 (categoryKey, subFeatureKey) → featureKey 매핑과 reason 해석 체인을
  // 소유한다 — 서버 coin-gate 와 React 결제창이 같은 함수(getBillingFeaturePricing)로 가격을 푸는 지점이라
  // 여기가 바뀌면 표시가와 청구액이 동시에 움직인다. 목록에 없어서 deepRequired 가 아니었다.
  [/^worker\/lib\/(portone|billing-policy|paid-feature-registry|billing-feature-registry|content-unlocks|nakshatra-paid-access|profile-card-mutation-policy)\.js$/i, "결제 정책 정본"],
  [/^lib\/payment\//i, "결제 클라이언트"],
  [/^app\/_lib\/billing-client\.ts$/i, "React 결제 게이트"],
  [/^app\/hooks\/useCoinGate\.ts$/i, "단건 결제 훅"],
  // 🔴 worker/payments/** 는 paid-flow-gates.yml 트리거에는 처음부터 있었는데 여기에는 없었다
  //    (2026-08-31 실측). PortOne 확정·PG 웹훅·크론 정산의 캐시 무효화 청크포인트가 전부 이 아래인데
  //    그것만 고친 PR 은 deepRequired 가 아니었다 — paid-flow-gates 는 깨어나고 deploy:critical 은 안
  //    도는 어긋난 상태였다.
  [/^worker\/payments\//i, "결제 확정·정산 청크포인트"],
  // 결제 직후 잠금 판정은 이 세 저장소의 무효화에 걸린다: 이용권 스냅샷 빌더 · 그 TTL 저장소(leaf) ·
  //    월정석 잔량. 셋 다 목록에 없어서 access-state.js 조차 deepRequired 가 아니었다.
  [/^worker\/lib\/(access-state|access-state-cache|monthly-credit-store)\.js$/i, "이용권 스냅샷·월정석 잔량 저장소"],
  [/^js\/core\/(pass-verdict|checkout-entry)\.js$/i, "이용권 판정·결제 진입 정본"],

  // ── 유료 기능 UI (정적 계약 테스트가 지키는 곳, preview 스모크는 게스트 경로만 두드린다)
  // 🔴 2026-08-22 실측: app/fusion-fortune/** 가 이 목록에도 paid-flow-gates.yml 트리거에도
  //    없어 i18n PR(#940)이 npm test 를 건너뛴 채 머지됐고, __tests__/ui/fusion-fortune.static.test.js
  //    가 깨진 채로 배포 파이프라인(deploy-safe.mjs)까지 막았다. 하루 전 app/vedic-ai/**(PR #924)도
  //    같은 모양으로 한 번 났었는데 그때는 paid-flow-gates.yml 만 고치고 여기는 놓쳤다 — 그래서
  //    vedic-ai 단독 PR 은 지금도 critical 티어가 아니다. 같은 구멍이라 함께 막는다.
  [/^app\/fusion-fortune\//i, "융합운세 유료 기능 UI(30,000원, 정적 계약 테스트)"],
  [/^worker\/lib\/fusion-fortune[^/]*\.js$/i, "융합운세 서버 로직"],
  [/^worker\/routes\/fusion-fortune\.js$/i, "융합운세 라우트"],
  [/^app\/vedic-ai\//i, "베다 AI 유료 기능 UI(정적 계약 테스트, PR #924 재발 방지)"],

  // ── DB 스키마 (되돌릴 수 없다)
  [/^scripts\/migrations\//i, "DB 마이그레이션"],
  [/^worker\/lib\/models\.js$/i, "DB 스키마"],

  // ── 배포 파이프라인 자체 (깨지면 복구 수단이 사라진다)
  [/^\.github\/workflows\//i, "CI 워크플로"],
  [/(^|\/)wrangler\.(toml|jsonc?)$/i, "Cloudflare 배포 설정"],
  [/(^|\/)\.env/i, "환경 변수 파일"],
  [/^config\/env\.contract\.json$/i, "환경 키 계약"],
  [/^scripts\/(deploy|release|rollback)/i, "배포·릴리스 스크립트"],
  [/^scripts\/lib\/(worker-deploy-base-guard|change-risk)\.mjs$/i, "배포 가드"],
  [/^scripts\/check-changed\.mjs$/i, "변경 검사 판정기"],
  [/(^|\/)package-lock\.json$/i, "의존성 잠금"],
];

export function classifyFile(file) {
  const value = String(file || "").replace(/\\/g, "/");
  if (highPatterns.some((p) => p.test(value))) return { level: "high", reason: "runtime/payment/auth/infra boundary" };
  if (mediumPatterns.some((p) => p.test(value))) return { level: "medium", reason: "shared UI/state/API/routing code" };
  if (lowPatterns.some((p) => p.test(value))) return { level: "low", reason: "static/content/presentation change" };
  return { level: "medium", reason: "unclassified source/config change" };
}

export function riskOf(files) {
  const rows = files.map((file) => ({ file, ...classifyFile(file) }));
  const rank = { low: 1, medium: 2, high: 3 };
  const level = rows.reduce((current, row) => (rank[row.level] > rank[current] ? row.level : current), "low");
  return { level, rows };
}

/** 한 파일이 전체 회귀를 요구하는 이유. 해당 없으면 빈 문자열. */
export function deepVerificationReason(file) {
  const value = String(file || "").replace(/\\/g, "/");
  for (const [pattern, reason] of deepVerificationRules) {
    if (pattern.test(value)) return reason;
  }
  return "";
}

export function requiresDeepVerification(files) {
  const matches = [];
  for (const file of files) {
    const reason = deepVerificationReason(file);
    if (reason) matches.push({ file, reason });
  }
  return { required: matches.length > 0, matches };
}

export function selfTest() {
  const levelCases = [
    // deploy-safe.mjs 와 check-changed.mjs 가 각각 고정해 두었던 케이스를 모두 옮겼다.
    ["styles/site.css", "low"],
    ["docs/guide.md", "low"],
    ["components/Button.tsx", "medium"],
    ["app/page.tsx", "medium"],
    ["worker/routes/payments.js", "high"],
    ["wrangler.toml", "high"],
    [".github/workflows/release.yml", "high"],
    // 테스트를 고쳤으면 테스트가 돌아야 한다. 이 두 줄이 없으면 규칙이 조용히 사라진다.
    ["__tests__/worker/per-use-proof-roundtrip.test.js", "high"],
    ["__tests__/ui/fusion-fortune.static.test.js", "high"],
  ];
  for (const [file, expected] of levelCases) {
    const actual = classifyFile(file).level;
    if (actual !== expected) throw new Error(`level(${file}) = ${actual}, expected ${expected}`);
  }

  const deepCases = [
    ["worker/routes/payments.js", true],
    ["worker/routes/auth.js", true],
    ["lib/payment/portone.ts", true],
    ["app/hooks/useCoinGate.ts", true],
    ["js/core/pass-verdict.js", true],
    ["worker/lib/models.js", true],
    ["scripts/migrations/20260805-add-fortune-chat-indexes.mjs", true],
    [".github/workflows/cloudflare-pages-deploy.yml", true],
    ["wrangler.toml", true],
    ["config/env.contract.json", true],
    ["scripts/deploy-safe.mjs", true],
    ["package-lock.json", true],
    ["app/fusion-fortune/FusionResultThread.tsx", true],
    ["worker/lib/fusion-fortune.js", true],
    ["worker/routes/fusion-fortune.js", true],
    ["app/vedic-ai/page.tsx", true],
    // 아래는 level=high 여도 전체 회귀까지는 필요 없다. 이 구분이 두 축의 요점이다.
    ["worker/routes/fortune-tea-house.js", false],
    ["worker/routes/ziwei-ai.js", false],
    ["worker/lib/gemini.js", false],
    ["app/page.tsx", false],
    ["components/Button.tsx", false],
    ["styles/site.css", false],
    ["docs/guide.md", false],
    ["package.json", false],
  ];
  for (const [file, expected] of deepCases) {
    const actual = Boolean(deepVerificationReason(file));
    if (actual !== expected) throw new Error(`deepRequired(${file}) = ${actual}, expected ${expected}`);
  }

  // level 과 deepRequired 가 실제로 독립인지 고정한다.
  if (classifyFile("worker/routes/ziwei-ai.js").level !== "high") throw new Error("non-deep worker route must still be level=high");

  const combined = requiresDeepVerification(["docs/a.md", "worker/routes/payments.js"]);
  if (!combined.required || combined.matches.length !== 1) throw new Error("requiresDeepVerification must report only the matching file");

  console.log(`[change-risk] self-test passed (${levelCases.length + deepCases.length} cases)`);
}

if (process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("scripts/lib/change-risk.mjs")) {
  if (process.argv.includes("--self-test")) {
    try {
      selfTest();
    } catch (error) {
      console.error(`[change-risk] FAIL: ${error.message}`);
      process.exitCode = 1;
    }
  } else {
    const files = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
    if (!files.length) {
      console.error("Usage: node scripts/lib/change-risk.mjs <file...>  |  --self-test");
      process.exitCode = 1;
    } else {
      const risk = riskOf(files);
      const deep = requiresDeepVerification(files);
      console.log(`level=${risk.level} deepRequired=${deep.required}`);
      for (const row of risk.rows) console.log(`  ${row.level.padEnd(6)} ${row.file}`);
      for (const match of deep.matches) console.log(`  DEEP   ${match.file} (${match.reason})`);
    }
  }
}
