# 인수인계 — 서버·MongoDB 종합 최적화 (2026-10-31)

계획: [docs/superpowers/plans/2026-10-31-infra-db-optimization.md](../superpowers/plans/2026-10-31-infra-db-optimization.md)
작업 트리: `D:\Development\codedestiny-worktrees\infra-optimization-20261031-150228` (브랜치 `wt/infra-optimization-20261031-150228`, 기준 origin/main `f4c5458a0`)
실행 방식: superpowers:subagent-driven-development. 진행 원장은 작업 트리의 `.superpowers/sdd/2026-10-31-infra-db-optimization/progress.md`(git 무시)다. 원장과 `git log`를 기억보다 먼저 믿는다.

## 사용자 결정 (2026-10-31)

- 운영 측정은 읽기 전용 전부 허용: tail(D 드라이브 보관), 공개 GET, Atlas Admin GET, 운영 DB 인덱스 dry-run, 소수 explain. 운영 DB 쓰기·실결제·유료 LLM 0회.
- Atlas 접근망은 0.0.0.0/0 유지 + 보완 통제(런북만 작성, 실행은 사용자가 Atlas UI에서).
- 보안 브랜치는 코드 4건(W-1 `32bffac56`, W-6 `33caf2935`, W-10 `362459e30`, E-1 `b88008c24`)만 반영. N-01·N-02는 이번 범위 밖.
- RED 결제 변경 Task 3·Task 7은 스테이징까지 승인. 비카드 자동 복원은 채택하지 않음(Task 6B 알림만).

## 진행 상태

| Task | 상태 | 커밋 | 비고 |
|---|---|---|---|
| 0 작업 트리 | 완료 | (이 문서 커밋) | `npm ci` 생략: 스크립트가 node_modules를 공유 체크아웃으로 정션 연결함. 기준 `check:fast` EXIT=0 |
| 1 Atlas 스냅샷 도구 | 대기 | | 실측은 사용자 API 키 필요 |
| 2 tail DB 연결 집계 | 대기 | | |
| 3 R3·F3 | 대기 | | RED 승인됨 |
| 4 L1 | 대기 | | |
| 5 C5 | 대기 | | |
| 6 R1·R2 | 대기 | | |
| 7 P4 | 대기 | | RED 승인됨 |
| 8 쿼리 핫스팟 | 대기 | | Step 3 인덱스 생성은 승인 전 금지 |
| 9 측정 판정 | 대기 | | |
| 10 보안 | 대기 | | |
| 11 DR | 대기 | | |
| 12 문서 7종 | 대기 | | |
| 13 검증·스테이징 | 대기 | | push는 origin/main 위 cherry-pick, 운영은 요청 시에만 |

## 실측 파일 위치 (리포 밖, 커밋 금지)

- Atlas 스냅샷: `D:\Development\code-destiny-backups\atlas-snapshots\<stamp>\`
- wrangler tail: `D:\Development\code-destiny-backups\tail\<stamp>.jsonl`
- Mongo 덤프: `D:\Development\code-destiny-backups\mongodb\<stamp>\`

## 다음 세션이 할 일

1. 위 표에서 첫 "대기" Task부터 이어 간다. 원장의 Rulings를 먼저 읽는다.
2. 승인 필요 항목(계획 하단)은 자동 실행하지 않는다.
