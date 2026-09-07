#!/usr/bin/env node

import { execFileSync } from "node:child_process";

function git(args, fallback = "확인 필요") {
  try {
    return execFileSync("git", args, { encoding: "utf8", windowsHide: true }).trim() || fallback;
  } catch {
    return fallback;
  }
}

const branch = git(["branch", "--show-current"]);
const recentCommit = git(["log", "-1", "--format=%h %s"]);
const diffStat = git(["diff", "--stat", "origin/main...HEAD"], "origin/main 대비 커밋 변경 없음");
const committedFiles = git(["diff", "--name-status", "--no-renames", "origin/main...HEAD"], "");
const workingFiles = git(["status", "--short"], "");
const changedFiles = [committedFiles, workingFiles].filter(Boolean).join("\n") || "변경 파일 없음";
const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());

console.log(`---
status: active
updated: ${today}
next: "TODO 입력"
---

# Session Handoff

## 1. 작업 목적

- 해결하려던 문제:
- 관련 PR/브랜치/이슈: ${branch}
- 사용자가 가장 중요하게 본 요구사항:

## 2. 현재 상태

- 완료:
- 미완료:
- 최근 커밋: ${recentCommit}
- 마지막 검증 명령과 결과:

## 3. origin/main 대비 diff stat

\`\`\`text
${diffStat}
\`\`\`

## 4. 변경 파일

\`\`\`text
${changedFiles}
\`\`\`

## 5. 핵심 설계 결정과 위험 구간

- 결정:
- 대안 제외 이유:
- 결제/권한/이용권/월정석/로그인/배포 회귀 위험:
- 되돌릴 때 확인할 지점:

## 6. 다음 세션에서 바로 할 일

1.
2.
3.

## 7. 검증 명령어

\`\`\`bash
# 실제로 실행한 명령과 결과를 적는다.
npm run lint
npm run typecheck
npm run check:quick -- --skip-build
\`\`\`

- 실제 배포 필요 여부: 아니오 / 확인 필요
- secret 필요 여부: 아니오 / 확인 필요
- 외부 API/LLM/결제 실호출 필요 여부: 아니오
- 사용자 승인 필요한 항목:

## 다음 세션 시작 프롬프트

이 인수인계 문서와 docs/dev/SESSION_WORKFLOW.md를 먼저 읽고, “다음 세션에서 바로 할 일” 1번부터 진행해줘. main 직접 push, LLM·결제 실호출, 승인 없는 production deploy와 secret 변경은 하지 마.
`);
