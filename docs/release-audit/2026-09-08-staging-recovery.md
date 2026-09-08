# 2026-09-08 staging recovery audit

기준 시각은 `2026-09-08 00:00:00 Asia/Seoul`이다. 커밋 시각만으로 판정하지 않고 worktree 상태, reflog, local/remote ref, merge-base, 실제 diff, PR 이력과 staging의 Pages·Worker version 응답을 함께 대조했다. 이 문서는 복구 중 삭제 판단에 쓰는 원장이다. 기존 branch와 worktree는 최종 staging 검증 전까지 삭제하지 않았다.

## Repository snapshot

| 항목 | 값 |
| --- | --- |
| origin | `https://github.com/rei1237/codedestiny.git` |
| default branch | `origin/main` |
| local `main` | `8bf68a0b6e2b50d441b47fca67d925ef8c9cfc78` (origin보다 87 behind, 별도 stale worktree에 있어 이동하지 않음) |
| audit 시점 `origin/main` | `958cc302fa81604caeabe4c10a2d59d9252a9895` |
| canonical staging source | `main`의 순차 merge SHA 하나 |
| 별도 staging branch | 없음. `codex/staging-recovery-20260908`은 감사용이며 배포 source가 아님 |
| branch inventory | local 85, origin remote 68; main 미포함 local 62, remote 55는 자동 삭제하지 않고 격리 |
| open PR | 0 (아래 복구 PR은 모두 순차 merge 완료) |

## Worktree inventory

`변경`은 `staged/unstaged/untracked` 개수다. `0/0/0`은 clean이다. 시간은 해당 worktree에서 확인한 마지막 커밋 KST이며 실제 작업 시각 판정은 reflog와 diff를 함께 사용했다. `가능성`은 9월 8일 변경 후보 포함 가능성이다.

| path | branch @ HEAD | 변경 | upstream (ahead/behind) | PR | 마지막 추정 | 가능성/분류 |
| --- | --- | --- | --- | --- | --- | --- |
| `D:/Development/code-destiny` | `codex/사주분석화면css문제` @ `b7c8b81d5a90` | 0/0/0 | same 0/0 | #1802 closed | 09-08 06:38 | 높음, 대량 삭제 checkpoint라 D/UNKNOWN 보존 |
| `.claude/worktrees/ci-scope` | `chore/ci-scope` @ `73231d2a9a5a` | 0/0/0 | same 0/0 | #1794 closed | 09-08 06:37 | 높음, 불완전 CI 축소라 D 보존 |
| `.claude/worktrees/diary-pr-i` | `worktree-diary-pr-i` @ `1660b66c9840` | 0/0/0 | same 0/0 | merged ancestry | 09-08 06:26 | 낮음, main 포함 |
| `.claude/worktrees/diary-pr-k` | `worktree-diary-pr-k` @ `394921e4721f` | 0/0/0 | same 0/0 | #1771 closed | 09-07 17:43 | 낮음, 과거 D 보존 |
| `.claude/worktrees/feat-home-diary-entry` | `fix/diary-compat-and-legacy-entry` @ `66d32164b741` | 0/0/0 | same 0/0 | #1775 closed | 09-07 18:31 | 낮음, 과거 D 보존 |
| `.claude/worktrees/fix-card-refund-f2` | `fix/card-single-payment-auto-refund` @ `24c775c51d25` | 0/0/0 | same 0/0 | #1774 closed | 09-07 18:13 | 낮음, 과거 D 보존 |
| `.claude/worktrees/fix-deferred-register-evidence` | `worktree-fix-deferred-register-evidence` @ `68409a1f2373` | 0/0/0 | same 0/0 | #1792 closed | 09-08 06:37 | 중간, handoff checkpoint만 D 보존 |
| `.claude/worktrees/fix-moonstone-autorefund` | `worktree-fix-moonstone-autorefund` @ `d1d713595744` | 0/0/0 | same 0/0 | #1770 closed | 09-07 17:30 | 낮음, 과거 D 보존 |
| `.claude/worktrees/fix-pass-grant-consume` | `fix/pass-grant-and-spend` @ `040f7f1767be` | 0/0/0 | same 0/0 | #1783 closed | 09-08 02:26 | 중간, patch-equivalent main 포함 |
| `.claude/worktrees/fix-pass-monthly-seed` | `fix/pass-monthly-quota-enforcement` @ `58106e96f68b` | 0/0/0 | same 0/0 | #1769 closed | 09-07 16:42 | 낮음, 과거 D 보존 |
| `.claude/worktrees/fix-vedic-entry-to-basic-tool` | `worktree-fix-vedic-entry-to-basic-tool` @ `746d7a6782da` | 0/0/0 | same 0/0 | #1778 closed | 09-07 19:44 | 낮음, patch-equivalent main 포함 |
| `.claude/worktrees/fix-vedic-prashna-pass-gate` | `worktree-fix-vedic-prashna-pass-gate` @ `4e5786211031` | 0/0/0 | same 0/0 | #1776 closed | 09-07 19:01 | 낮음, 과거 D 보존 |
| `.claude/worktrees/fusion-length-cap-and-repeat-guard` | `worktree-fusion-cache-and-naming` @ `1660b66c9840` | 0/0/0 | same 0/0 | merged ancestry | 09-08 06:26 | 낮음, main 포함 |
| `.claude/worktrees/fusion-phase3-mobile` | `fusion-live-5th` @ `567de0d59d58` | 0/0/0 | same 0/0 | #1795 closed | 09-08 06:37 | 높음, 최신 main 품질 구현으로 B 대체 |
| `.claude/worktrees/mingri-tarot-card-topic-readings` | `worktree-mingri-tarot-card-topic-readings` @ `529b28b3d951` | 0/0/0 | same 0/0 | #1791 closed | 09-07 16:53 | 낮음, 과거 D 보존 |
| `.claude/worktrees/mobile-tea-payment-resume` | `codex/mobile-tea-payment-resume` @ `d7c9d13fdf90` | 0/0/0 | same 0/0 | #1780 closed | 09-08 00:59 | 중간, #1811 통합본으로 B 대체 |
| `.claude/worktrees/paid-resume-kakaopay` | `feat-paid-resume-static5` @ `52803fcd8287` | 0/0/0 | same 0/0 | #1790 closed | 09-08 06:36 | 높음, handoff/구 구현을 #1811로 B 대체 |
| `.claude/worktrees/paid-resume-static-remaining` | `feat/paid-resume-react-remaining` @ `760279b20b44` | 0/0/0 | same 0/0 | #1773 closed | 09-07 18:06 | 낮음, 과거 D 보존 |
| `.claude/worktrees/pass-limit-notice` | `fix/paid-resume-physiognomy` @ `23c116e8cc08` | 0/0/0 | same 0/0 | #1779 closed | 09-07 19:46 | 낮음, #1811 범위 대조 후 D 보존 |
| `.claude/worktrees/perf-points-cls` | `worktree-perf-points-cls` @ `961fdd52495d` | 0/0/0 | same 0/0 | #1772 closed | 09-07 17:51 | 낮음, 과거 D 보존 |
| `.claude/worktrees/pr1746-conflict` | `fix/pass-limit-notice` @ `98a14ac3e61e` | 0/0/0 | same 0/0 | #1777 closed | 09-07 19:24 | 낮음, 과거 D 보존 |
| `.claude/worktrees/saju-seasonal-rhythm-pr` | `codex/saju-seasonal-rhythm-pr` @ `587f9bd6a68b` | 0/0/0 | same 0/0 | #1781 closed | 09-08 01:15 | 중간, 독립 과거 작업 D 보존 |
| `.claude/worktrees/tea-house-saju-data-and-fallback` | `main` @ `8bf68a0b6e2b` | 0/0/0 | origin/main 0/87 | merged history | 09-07 20:36 | 낮음, stale main worktree |
| `.codex-worktrees/ci-merge-queue-handoff` | `codex/ci-merge-queue-handoff` @ `c6352091cf44` | 0/0/0 | same 0/0 | #1785 closed | 09-08 02:48 | 중간, 현 session guard가 대체 |
| `.codex-worktrees/neo-result-ui-pr` | `codex/neo-result-ui-pr` @ `1cc700108617` | 0/0/0 | same 0/0 | #1812 merged | 09-08 07:03 | 높음, A 통합 완료 |
| `.codex-worktrees/neo-result-ui-redesign` | `codex/neo-result-ui-redesign` @ `c331aaebc444` | 0/0/0 | same 0/0 | #1793 closed | 09-08 06:37 | 높음, #1812로 B 대체 |
| `../code-destiny-expert-consulting` | `codex/expert-consulting-premium` @ `090f78d1f48a` | 0/0/0 | same 0/0 | #1796 closed | 09-08 06:37 | 높음, #1814로 A 회수 |
| `../code-destiny-expert-recovery-20260908` | `codex/expert-consulting-recovery-20260908` @ `ace6522b65fd` | 0/0/0 | same 0/0 | #1814 merged | 09-08 09:19 | 높음, A 통합 완료 |
| `../code-destiny-fusion-recovery-20260908` | `codex/fusion-quality-recovery-20260908` @ `7e221cdfa766` | 0/0/0 | origin/main 0/36 | 없음 | 09-08 08:01 | 감사용, B 판정 |
| `../code-destiny-home-ui-recovery-20260908` | `codex/home-ui-recovery-20260908` @ `5fb3e6246e48` | 0/0/0 | same 0/0 | #1813 merged | 09-08 08:57 | 높음, A 통합 완료 |
| `../code-destiny-love-code-unlock` | `codex/love-code-permanent-unlock` @ `4787ca851cdc` | 0/0/0 | same 0/0 | #1807 closed | 09-08 06:37 | 높음, #1808로 B 대체 |
| `../code-destiny-love-code-unlock-release` | `codex/love-code-permanent-unlock-release` @ `f064962ce18c` | 0/0/0 | same 0/0 | #1808 merged | 09-08 08:51 | 높음, A 통합 완료 |
| `../code-destiny-mobile-build` | `codex/checkpoint-mobile-build-20260908` @ `30c6927247f4` | 0/0/0 | same 0/0 | #1803 closed | 09-08 06:38 | 높음, 오래된 혼합 checkpoint D 보존 |
| `../code-destiny-mobile-design` | `codex/mobile-home-policy-design` @ `6d06671ebd39` | 0/0/0 | same 0/0 | #1798 closed | 09-08 06:37 | 높음, #1813 최신 UI로 B 대체 |
| `../code-destiny-moonlight-build` | `codex/checkpoint-moonlight-build-20260908` @ `16877b8cfa0b` | 0/0/0 | same 0/0 | #1804 closed | 09-08 06:38 | 높음, 혼합 checkpoint D 보존 |
| `../code-destiny-moonlight-performance` | `codex/home-moonlight-performance` @ `f03cee0a9e46` | 0/0/0 | same 0/0 | #1800 closed | 09-08 06:37 | 높음, #1813의 선택 원본 |
| `../code-destiny-payment-resume` | `codex/payment-resume-contract` @ `12a6d2431335` | 0/0/0 | same 0/0 | #1811 merged | 09-08 08:22 | 높음, A 통합 완료 |
| `../code-destiny-png-webp-preview` | `codex/png-webp-preview` @ `b2244641d97e` | 0/0/0 | same 0/0 | #1789 closed | 09-08 02:12 | 중간, main ancestry 포함 |
| `../code-destiny-pr-tarot-zero-gauge-pr` | `codex/fortune-tea-house-zero-gauge-fix` @ `b066ea953f9f` | 0/0/0 | same 0/0 | #1782 closed | 09-08 01:27 | 중간, patch-equivalent main 포함 |
| `../code-destiny-pr1751-fix` | `codex/recover-pr1751-fix` @ `36ab7500a9cf` | 0/0/0 | same 0/0 | #1805 closed | 09-08 01:49 | 중간, main ancestry 포함 |
| `../code-destiny-pr1753-fix` | `codex/quantum-card-cascade-fix` @ `9a016b6863e2` | 0/0/0 | same 0/0 | #1784 closed | 09-08 02:32 | 중간, 실질 diff 0/과거 merge 잔재 |
| `../code-destiny-pr1755-fix` | `codex/recover-pr1755-fix` @ `acf32bc94ef0` | 0/0/0 | same 0/0 | #1806 closed | 09-08 02:48 | 중간, 과거 혼합 복구 D 보존 |
| `../code-destiny-seo-20260908` | `codex/seo-adsense-i18n-20260908` @ `5ad76654ac4b` | 0/0/0 | same 0/0 | #1809 merged | 09-08 07:27 | 높음, A 통합 완료 |
| `../code-destiny-sequential-delivery` | `codex/sequential-pr-staging-delivery` @ `b21509a4d847` | 0/0/0 | upstream 없음 | 기존 통합 PR | 09-08 06:21 | 기반 C, delivery:admit로 main 포함 |
| `../code-destiny-session-delivery-20260908` | `codex/session-delivery-guard` @ `958cc302fa81` | 0/현재 변경/신규 | origin/main 0/0 | 이번 프로세스 PR | 09-08 09:29 | ACTIVE, 세션 PR 규칙·감사·관측성 |
| `../code-destiny-staging-recovery-20260908` | `codex/staging-recovery-20260908` @ `fe4eb3b74885` | 0/0/0 | origin/main 0/67 | 없음 | 09-08 06:48 | 감사용 ACTIVE, 제거 보류 |
| `../code-destiny-telegram-cron-recovery` | `codex/telegram-daily-cron-recovery` @ `fae64061f5dd` | 0/0/0 | same 0/0 | #1787 closed | 09-08 03:33 | 중간, patch-equivalent main 포함 |
| `../code-destiny-vedic-seo` | `codex/vedic-seo-landing` @ `418ef1388bfa` | 0/0/0 | same 0/0 | #1786 closed | 09-08 02:56 | 중간, 독립 과거 작업 D 보존 |
| `../codedestiny-worktrees/worker-cpu-optimization-20260908-064412` | `wt/worker-cpu-optimization-20260908-064412` @ `bcad57507daf` | 0/0/0 | same 0/0 | #1810 merged | 09-08 07:54 | 높음, A 통합 완료 |

## Branch and PR reconciliation

- 모든 local ref 85개와 origin ref 68개를 열거했다. merge-base와 `git cherry`로 patch-equivalent 포함 여부를 대조했다.
- main 미포함 ref는 오래된 backup/tmp/닫힌 PR ref까지 포함하므로 개수만으로 오늘 변경으로 간주하지 않았다.
- 2026-09-08 복구 대상으로 선택한 논리 변경 7개는 모두 별도 PR로 순차 merge했다. 상세는 [release manifest](2026-09-08-release-manifest.md)에 있다.
- 이전 PR #1769~#1807의 미통합 branch는 clean/pushed 상태를 유지했다. patch-equivalent 또는 최신 통합본으로 대체된 것을 제외한 과거 독립 작업은 이번 staging에 섞지 않고 `ARCHIVE/UNKNOWN`으로 보존했다.
- #1794/#1795/#1796/#1798/#1800/#1804 등 임시 checkpoint PR은 중복 통합을 막기 위해 닫았지만 branch/worktree는 삭제하지 않았다.

## Cleanup disposition

| 분류 | 대상 |
| --- | --- |
| SAFE REMOVE | 최종 SHA 검증 뒤 이번에 만든 clean recovery worktree만 가능. 실제 제거는 마지막 manifest PR 배포 확인 뒤 수행 |
| ARCHIVE | #1769~#1807의 main 미포함 clean/pushed branch와 backup ref. 목적별 재감사 전 삭제 금지 |
| ACTIVE | session delivery guard, staging recovery audit |
| UNKNOWN | `codex/사주분석화면css문제` 대량 삭제 checkpoint, 혼합 checkpoint 1803/1804/1806 |

강제 branch 삭제, force push, hard reset, clean은 사용하지 않았다.
