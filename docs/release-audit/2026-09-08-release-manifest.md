# 2026-09-08 release manifest

## Intentionally integrated

| ID | 논리 변경 | source branch / SHA | PR | main merge SHA | 주요 범위 | staging |
| --- | --- | --- | --- | --- | --- | --- |
| T01 | Neo 결과 UI 복구 | `codex/neo-result-ui-pr` / `1cc700108617` | #1812 | `6cebe6c3ec3389445646b96627f3194e01de1359` | Neo 결과 레이아웃·품질 UI | 포함·검증 |
| T02 | SEO/AdSense/i18n 정합 | `codex/seo-adsense-i18n-20260908` / `5ad76654ac4b` | #1809 | `929a25eabb7d84b1b103871af8cdfc073b9e4bfc` | SEO 구조·정적 콘텐츠·로케일 | 포함·검증 |
| T03 | Worker CPU 최적화 | `wt/worker-cpu-optimization-20260908-064412` / `bcad57507daf` | #1810 | `7e221cdfa7662623a995e7acb45346a5d716247f` | Worker 실행 비용·회귀 가드 | 포함·검증 |
| T04 | 결제 후 resume 복구 | `codex/payment-resume-contract` / `12a6d2431335` | #1811 | `f8549ea9667e4d755624b9e554eb869aca3bd1f3` | 결제 context·402 lock·모바일 resume | 포함·검증 |
| T05 | Love Code 영구 unlock | `codex/love-code-permanent-unlock-release` / `f064962ce18c` | #1808 | `b4d162b099b323817d4b28be572195641acc4ff9` | entitlement·결제 freeze·mock 회귀 | 포함·검증 |
| T06 | 메인 화면 UI/UX 복구 | `codex/home-ui-recovery-20260908` / `5fb3e6246e48` | #1813 | `8e860dc042656291860c60385bb3d0b2c03f3c57` | 모바일 퍼널·홈 셸·12 locale·검색/프로필 | 포함·검증 |
| T07 | 전문가 상담 UI 통합 | `codex/expert-consulting-recovery-20260908` / `ace6522b65fd` | #1814 | `958cc302fa81604caeabe4c10a2d59d9252a9895` | 공통 상담 frame·Karma/Vedic/Nakshatra·crawl link | 포함·검증 |
| T08 | 세션 PR 적층·release audit·환경 metadata | `codex/session-delivery-guard` / PR head | 생성 예정 | 배포 후 최종 보고 | session start/close, handoff, staging environment, 감사 문서 | PR 배포 후 확정 |

각 merge 직전 `delivery:admit`으로 최신 main, clean worktree, 파일 중첩, 필수 CI, 직전 Pages/Worker staging SHA를 검사했다. 각 merge 뒤 다음 PR을 머지하기 전에 `/version.json`과 `/api/version`이 동일 SHA인지 독립 확인했다.

## Intentionally excluded or superseded

| ID | 변경/위치 | 분류 | 제외 이유 | 보존 |
| --- | --- | --- | --- | --- |
| X01 | `fusion-live-5th` `567de0d59d58` | B | main의 더 최신 60k 상한·공백·반복 품질 구현이 기능을 대체 | branch/worktree 유지 |
| X02 | `chore/ci-scope` `73231d2a9a5a` | D | CSS/asset 변경에서 typecheck·lint·build를 생략할 수 있어 불완전하고 위험 | branch/worktree 유지 |
| X03 | `codex/사주분석화면css문제` `b7c8b81d5a90` | D/UNKNOWN | 113파일 대량 삭제 checkpoint, 오늘 유효 변경과 무관한 혼합 제거 | root checkout과 remote branch 유지 |
| X04 | mobile/moonlight checkpoint `30c6927`, `16877b8`, `6d06671`, `f03cee0` | B/D | #1813에서 목적·회귀·검증을 비교해 최신 home UI만 선택. 혼합 checkpoint는 제외 | 모든 원 branch/worktree 유지 |
| X05 | Neo `c331aaebc444`, Love `4787ca851cdc`, payment resume `d7c9d13f`, `52803fcd` | B | 각각 #1812/#1808/#1811의 검증된 통합본이 대체 | 원 branch/worktree 유지 |
| X06 | `68409a1f2373` 등 handoff/checkpoint 전용 commit | D | 기능 변경이 없거나 더 최신 handoff가 통합됨 | remote branch 유지 |
| X07 | PR #1769~#1791 및 #1806의 과거 독립 변경 | D/ARCHIVE | 9월 8일 staging 복구 범위에 섞으면 결제·diary·Vedic 등 독립 정책 변경이 유입됨. patch-equivalent main 포함분은 별도 재통합 불필요 | clean/pushed branch와 worktree 유지, 자동 삭제 금지 |
| X08 | 첨부 화면의 별도 색상 contrast 추가 수정 | 보류 | 사용자가 우선 기존 UI/UX 복구본을 배포하고 실제 결과를 본 뒤 판단하도록 지시. 임시 contrast 테스트 commit은 revert되어 PR에 없음 | 스크린샷을 후속 참고자료로 유지 |

## Reconciliation equation

```text
2026-09-08 discovered logical changes
= T01..T08 intentionally integrated
+ X01..X08 intentionally excluded, superseded, or deferred
```

설명할 수 없는 누락은 0건이다. 실제 final SHA, Cloudflare deployment와 smoke 결과는 이 PR의 staging 배포가 끝난 뒤 최종 보고에 기록한다.
