#!/usr/bin/env node
/**
 * PreToolUse 가드 — 돈·프로덕션이 걸린 명령만 승인창을 띄운다.
 *
 * 배경: CLAUDE.md 코딩 원칙 8번이 "허용목록에 verify 와일드카드를 넣지 말라"고 막고 있었다.
 * 이유는 일부 검증기가 `--live`(실제 Gemini/Workers AI 호출)를 받기 때문인데, 그 대가로
 * 검증기 193개 전부가 매번 승인창을 띄웠다. 10개를 지키려고 193개를 막는 구조였다.
 *
 * 이 훅이 그 10개를 명령 문자열에서 직접 잡으므로, 허용목록은 넓혀도 안전하다.
 * 판정은 fail-closed 다 — 입력을 못 읽거나 규칙 평가가 실패하면 통과가 아니라 `ask` 로 간다.
 *
 * `deny` 가 아니라 `ask` 인 이유: 원칙 8이 요구하는 것은 금지가 아니라 "사용자의 명시적
 * 허락(그 1회 한정)"이고, 명령 전문을 보여주는 승인창이 정확히 그 절차다.
 */

const ASK = (reason) => {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "ask",
        permissionDecisionReason: reason,
      },
    })
  );
  process.exit(0);
};

const PASS = () => process.exit(0);

/**
 * 규칙은 "이 성질을 가진 명령"에 걸린다 — 스크립트 이름을 나열하지 않는다(원칙 11).
 * npm 별칭(`npm run deploy:cf:worker`)과 그 별칭이 실제로 부르는 스크립트 경로
 * (`node scripts/deploy-worker.mjs`)를 **함께** 본다. 한쪽만 보면 우회로가 남는다.
 *
 * `unless` 는 같은 성질의 무해한 변형을 빼는 칸이다. 이게 없으면 `build:worker`
 * (`wrangler deploy --dry-run --outdir`, 번들 크기 측정용)와 `deploy:critical`
 * (이름만 deploy 이고 실제로는 검증 체인)이 매번 걸린다 — 실측으로 확인한 오탐이다.
 */
const RULES = [
  {
    id: "llm-live-flag",
    re: /(^|\s)--live(\s|=|$)/,
    why: "실제 모델/외부 실호출 플래그(--live) — 과금·쿼터가 소모됩니다",
  },
  {
    id: "llm-live-script",
    re: /\baudit:content-headroom:live\b/,
    why: "실호출이 내장된 스크립트 — 과금·쿼터가 소모됩니다",
  },
  {
    id: "llm-endpoint",
    re: /generativelanguage\.googleapis\.com|\bwrangler\s+dev\b/i,
    why: "과금 모델 엔드포인트 직접 호출",
  },
  {
    id: "deploy",
    re: /\bwrangler\s+(deploy|publish|versions\s+(upload|deploy)|pages\s+deploy)\b|\bnpm\s+run\s+deploy:(?!check\b|critical\b)|\bdeploy:cf:|\bdeploy:safe\b|\bdeploy:rollback\b|\bdeploy:production\b|\bnode\s+scripts[/\\](deploy-|opennext-deploy)/i,
    // --dry-run/--outdir 은 업로드가 없는 번들 빌드다(build:worker).
    unless: /--dry-run|--outdir/i,
    why: "프로덕션 배포 또는 Cloudflare 아티팩트 생성",
  },
  {
    id: "break-glass",
    re: /CD_BREAK_GLASS|--break-glass/i,
    why: "배포 가드 우회(break-glass)",
  },
  {
    id: "secrets",
    re: /\bwrangler\s+secret\b|\bnpm\s+run\s+secrets:|\bnode\s+scripts[/\\]sync-cloudflare-\S*secrets/i,
    // `secrets:cf:worker:dry` 는 npm 별칭 안에 --dry-run 이 들어 있어 명령 문자열에는 안 보인다.
    unless: /--dry-run|:dry\b/i,
    why: "프로덕션 시크릿 쓰기 — --only-key 없으면 27개를 덮어씁니다",
  },
  {
    id: "db-write",
    re: /\bnpm\s+run\s+(migrate|seed|backfill):|\bnode\s+scripts[/\\](migrat|seed-|backfill-)|\bnode\s+scripts[/\\]migrations[/\\]/i,
    unless: /--dry-run/i,
    why: "DB 마이그레이션·시드·백필 실행",
  },
  {
    id: "pr-merge",
    re: /\bgh\s+pr\s+merge\b/i,
    why: "PR 머지는 사용자 결정 사항이며, 머지가 곧 프로덕션 배포입니다",
  },
  {
    id: "workflow-dispatch",
    re: /\bgh\s+workflow\s+run\b/i,
    why: "GitHub Actions 수동 실행 — 배포·롤백이 트리거될 수 있습니다",
  },
  {
    id: "git-danger",
    re: /\bgit\s+push\b[^|;&]*(?:--force|--force-with-lease|\s-f\b)|\bgit\s+push\b[^|;&]*\bmain\b/i,
    why: "main 직접 push 또는 강제 push",
  },
];

let raw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  raw += chunk;
});
process.stdin.on("error", () => ASK("가드가 훅 입력을 읽지 못했습니다 (fail-closed)"));
process.stdin.on("end", () => {
  let command;
  try {
    const payload = JSON.parse(raw);
    const tool = payload?.tool_name;
    // 이 훅은 Bash|PowerShell 매처에만 붙지만, 매처가 바뀌어도 안전하도록 여기서도 확인한다.
    if (tool !== "Bash" && tool !== "PowerShell") PASS();
    command = payload?.tool_input?.command;
    if (typeof command !== "string") {
      ASK(`가드가 ${tool} 명령 문자열을 찾지 못했습니다 (fail-closed)`);
    }
  } catch {
    ASK("가드가 훅 입력을 해석하지 못했습니다 (fail-closed)");
  }

  try {
    const hit = RULES.find(
      (rule) => rule.re.test(command) && !(rule.unless && rule.unless.test(command))
    );
    if (hit) ASK(`[${hit.id}] ${hit.why}. 명령 전문을 확인하고 승인하세요.`);
  } catch {
    ASK("가드 규칙 평가가 실패했습니다 (fail-closed)");
  }

  PASS();
});
