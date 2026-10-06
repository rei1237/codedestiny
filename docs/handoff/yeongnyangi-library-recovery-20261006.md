---
status: blocked
updated: 2026-10-06
next: 운영 반영·TTL 수선 승인을 확인하고 피해 계정 이메일 또는 주문번호로 원본을 읽기 전용 대조한다.
---

# 영냥이 보관함 복구와 구매 결과 보존

요구: 영냥이와 꿀꿀운세 보관함 분리를 계속 유지하고, 서비스가 유지되는 동안 구매 결과를 남긴다. 최근 업데이트 영향과 사라진 내역을 확인·복구한다.

## 현재

- 코드 `4e19c6338b39d45021e0c27922849eb9f34d0706`은 원격 main에 push했다. PR 없음. CI 실행 `37443910113`의 `CI required`를 확인한다.
- 격리 작업 경로: `D:\Development\code-destiny\.codex-worktrees\yn-library-recovery-20261006-174128`, 작업 브랜치 `wt/yn-library-recovery-20261006-174128`. 공유 main은 기존 `.git/index.lock` 때문에 반영이 막혔다. 다른 세션의 잠금·미커밋 파일은 보존했다.
- 로컬 lint/typecheck, Node 2,804, Jest 5,159, 결제 게이트 88, Worker dry-run 통과. `check:fast` 린트 실패를 수정한 후 같은 계획의 나머지 검사를 완료했다. 원본 복원 0건, 운영 반영·고객 검수 미완료.

## 남은 작업

- [ ] 코드 SHA의 CI required 성공을 확인한다. 문서 커밋 이후에도 코드 검증 결과와 구분한다.
- [ ] 사용자 별도 승인 후 Pages·Worker 운영 반영 및 공용 TTL 수선. 광범위 `retentionUntil_1`을 미결제 의도만 대상으로 하는 부분 TTL로 교체한다. 보호 대상은 진단 시점 3건이다.
- [ ] 피해 계정 이메일/주문번호 1개로 실제 목록·원본·구매 증거·본문을 대조한다. 현재 Chrome의 완료 고등어 1건이 피해 계정인지 미확인이다.
- [ ] 승인 후 동일 SHA의 운영 버전과 원본 본문을 확인한다. 추가 결제·차감·LLM 없이 완료 결과가 열리는지 확인해야 고객 복구 완료다.
- [ ] 공유 main 반영이 가능해진 뒤 자신의 워크트리와 작업 파일만 정리하고 이 문서를 `status: done`으로 닫는다. 기존 잠금을 임의 삭제하지 않는다.

정본: [library-preservation](../context/library-preservation.md). 운영 변경 검토 파일: `D:\Development\code-destiny\.tmp\yn-library-retention-20261006-plan.json` (원본 ID·소유자 해시·기존 삭제 기한; 원문·이메일·비밀값 없음).

18:30 KST 원본 77건 중 완료 38건·285챕터가 존재하며, 활성 직접 결제 33건의 원본 없음·소유자 불일치는 0건이다. 이것이 피해 사례 복구를 증명하지 않는다. 최근 업데이트가 실제 누락의 직접 원인이라는 근거는 아직 없다.

```powershell
Set-Location 'D:\Development\code-destiny\.codex-worktrees\yn-library-recovery-20261006-174128'
node scripts/audit-library-retention.mjs --env-file=.env.local --db=code_destiny
```

위 명령은 읽기 전용이다. 운영 쓰기·백업 복원·승격은 [CLAUDE.md](../../CLAUDE.md)의 별도 승인 경계를 따른다. 승인 없이 상세 GET으로 자동 복구를 실행하거나 생성 POST·유료 LLM을 호출하지 않는다.
