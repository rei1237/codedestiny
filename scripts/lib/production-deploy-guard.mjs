/**
 * 프로덕션 배포는 GitHub Actions 에서만 일어난다.
 *
 * 배포 경로가 로컬이던 시절에는 `wrangler` 가 커밋이 아니라 **워킹트리**를 밀었다. 그래서
 * 무엇이 프로덕션에 떠 있는지 물을 방법이 커밋 메타데이터뿐이었고, 검증되지 않은 트리가
 * 그대로 나가는 사고가 반복됐다. 이제 프로덕션에 도달하는 유일한 길은 main 에 머지된
 * 커밋이며, 그 커밋 SHA 하나로 Pages 와 Worker 가 함께 나간다.
 *
 * 이 가드는 "CI 밖에서 프로덕션에 쓰는 명령"을 실행 직전에 세운다. preview·check·status·
 * rollback 조회처럼 프로덕션을 바꾸지 않는 단계는 대상이 아니다.
 *
 * 비상 탈출구는 남긴다 — GitHub Actions 자체가 죽으면 서비스를 되살릴 수단이 없어지기
 * 때문이다. 다만 실수로 눌리지 않도록 **환경변수와 플래그 둘 다** 요구한다.
 */

const BREAK_GLASS_FLAG = "--break-glass";

/**
 * 순수 판정 함수. 테스트가 process 전역을 건드리지 않고 이 계약을 확인할 수 있어야 한다.
 * @returns {{allowed: boolean, reason: "ci" | "break-glass" | "blocked"}}
 */
export function resolveProductionDeployPermission({ env = {}, argv = [] } = {}) {
  if (String(env.GITHUB_ACTIONS || "").toLowerCase() === "true") {
    return { allowed: true, reason: "ci" };
  }
  const armed = String(env.CD_BREAK_GLASS || "").trim() === "1";
  const flagged = argv.includes(BREAK_GLASS_FLAG);
  if (armed && flagged) return { allowed: true, reason: "break-glass" };
  return { allowed: false, reason: "blocked" };
}

/**
 * 프로덕션을 바꾸는 명령 직전에 부른다. 차단이면 프로세스를 끝낸다.
 * @param {string} label 무엇을 막았는지 사용자에게 보여 줄 이름 (예: "Worker production deploy")
 */
export function assertProductionDeployIsCi(label, argv = process.argv) {
  const verdict = resolveProductionDeployPermission({ env: process.env, argv });
  if (verdict.reason === "ci") return;

  if (verdict.reason === "break-glass") {
    console.warn(`[production-deploy-guard] ⚠ BREAK GLASS: ${label} 을(를) CI 밖에서 실행합니다.`);
    console.warn("[production-deploy-guard] ⚠ 이 배포는 어떤 PR·CI 검증도 거치지 않았습니다. 끝난 뒤 반드시 같은 내용을 PR 로 main 에 반영하세요.");
    console.warn("[production-deploy-guard] ⚠ 그렇게 하지 않으면 다음 정식 배포가 이 변경을 조용히 되돌립니다.");
    return;
  }

  console.error(`[production-deploy-guard] BLOCKED: ${label} 은(는) 로컬에서 실행할 수 없습니다.`);
  console.error("[production-deploy-guard] 프로덕션 배포 경로는 하나뿐입니다: feature 브랜치 → PR → CI 통과 → main 머지 → GitHub Actions 자동 배포.");
  console.error("[production-deploy-guard] 로컬에서 할 수 있는 것: npm run deploy:check (업로드 없음) · PR 에 `preview` 라벨을 붙여 Preview 배포.");
  console.error(`[production-deploy-guard] GitHub Actions 가 사용 불가한 비상 상황이면: CD_BREAK_GLASS=1 <명령> ${BREAK_GLASS_FLAG}`);
  process.exit(1);
}

export function runProductionDeployGuardSelfTest() {
  const cases = [
    [{ env: { GITHUB_ACTIONS: "true" }, argv: [] }, "ci"],
    [{ env: { GITHUB_ACTIONS: "TRUE" }, argv: [] }, "ci"],
    [{ env: {}, argv: [] }, "blocked"],
    [{ env: { CD_BREAK_GLASS: "1" }, argv: [] }, "blocked"],
    [{ env: {}, argv: [BREAK_GLASS_FLAG] }, "blocked"],
    [{ env: { CD_BREAK_GLASS: "1" }, argv: [BREAK_GLASS_FLAG] }, "break-glass"],
    [{ env: { CD_BREAK_GLASS: "true" }, argv: [BREAK_GLASS_FLAG] }, "blocked"],
  ];
  for (const [input, expected] of cases) {
    const actual = resolveProductionDeployPermission(input).reason;
    if (actual !== expected) {
      throw new Error(`production deploy guard: expected ${expected}, received ${actual} for ${JSON.stringify(input)}`);
    }
  }
}
