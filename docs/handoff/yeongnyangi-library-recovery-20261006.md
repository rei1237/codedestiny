---
status: blocked
updated: 2026-10-06
next: 고객이 구매 당시 카카오 계정으로 영냥이 보관함에 로그인해 완료 4건을 재열람하는지 확인한다. 운영 승격은 승인된 1회가 이미 실행됐으므로 재실행하지 않는다.
---

# 영냥이 보관함 복구와 구매 결과 보존

요구: 영냥이와 꿀꿀운세 보관함 분리를 계속 유지하고, 서비스가 유지되는 동안 구매 결과를 남긴다. 최근 업데이트 영향과 사라진 내역을 확인·복구한다.

## 현재

- 코드 `4e19c6338b39d45021e0c27922849eb9f34d0706`은 원격 main에 push했다. PR 없음. CI 실행 `37443910113`의 정확한 headSha와 `CI required:success`를 확인했다.
- 격리 작업 경로: `D:\Development\code-destiny\.codex-worktrees\yn-library-recovery-20261006-174128`, 작업 브랜치 `wt/yn-library-recovery-20261006-174128`. 공유 main은 기존 `.git/index.lock` 때문에 반영이 막혔다. 다른 세션의 잠금·미커밋 파일은 보존했다.
- 로컬 lint/typecheck, Node 2,804, Jest 5,159, 결제 게이트 88, Worker dry-run 통과. `check:fast` 린트 실패를 수정한 후 같은 계획의 나머지 검사를 완료했다. 후속 `npm run verify:release`도 종료 코드 0. 원본 복원 0건, 고객 검수 미완료.
- 사용자 후속 승인: Pages·Worker 운영 반영 1회와 공용 TTL 수선 모두 승인. 포트원에서 지정 이메일의 주문번호 조회도 요청했다. 이메일·회원 ID·상담 본문은 저장·커밋하지 않는다.
- 18:59 KST 공용 TTL 수선 완료: `unpaid_intent_retention_v1` 생성 성공 후 조건 없는 `retentionUntil_1` 제거. 보호 대상 3건의 ID·소유자·삭제 기한·전체 문서 해시가 불변이다. 변경 후 `indexPlan={create:null,drop:[]}`. 전체 문서 집합 해시 `efa3169d1168fe4e3af5adac4cc1fbcedec8fb01eadf6646c37e688b8fc68380`. 수선 전 인덱스 정의 백업: `library-retention-index-backup-20261006.json`(동일 디렉터리).
- 지정 이메일 회원은 존재(active, 2026-09-23 가입). 해당 ID를 ObjectId·문자열 모두 조회해 영냥이 원본 0건·결제 0건·공용 결과 0건·권한 0건. 포트원 GET `/payments` 통합검색(2025-01-01~2026-10-06 19:01 KST, 이메일, 모든 상태)은 totalCount 0. 이 결과는 과거 삭제나 다른 계정으로 한 구매가 없다는 증명이 아니다.
- 사용자 추가 제공 주문번호로 포트원 GET 단건 조회 성공: `PAID`, 사주 · 참치 10,000원, 2026-09-30 23:11 KST 결제. 서비스 결제 문서 금액·원본 연결도 일치. 실제 구매자는 **카카오 전용 계정**(연결 공급자 kakao, localAuth.enabled:false)이며 문의 발신 이메일 계정과 다르다. 상담 소유권을 변경하거나 계정을 병합하지 않았다.
- 구매 계정의 원본은 완료 4건(참치 사주 16장, 고등어 사주·점성술·자미두수 각 5장), 미결제 CREATED 1건이다. 완료 31장 모두 본문 존재. 실제 목록 조회 조건을 native Mongo 읽기로 재현해 완료 4건이 반환되는 것을 확인했다(인증된 운영 API·고객 화면 확인과 구분). 해당 참치 16장 본문 해시 `c6499431471a314550eccbd451312d511e3767c413ed8a86d34acee0e6c17dcd`. 삭제·원본 복원·추가 결제·차감·LLM 호출 0건. 다른 로그인 계정 사용 가능성은 관측된 계정 분리로 뒷받침되지만 고객의 현재 로그인은 아직 미확인이다.
- 운영 승격 1회 실행: main `1d1b1a1ef223f9e4634253bc53a547f7deae162c`, [실행 37447156070](https://github.com/rei1237/codedestiny/actions/runs/37447156070). 해당 SHA의 CI required도 success. `delivery-and-ci.md`의 실행 후 런 폴링 금지에 따라 배포 완료·운영 동일 SHA·고객 재열람은 미검증. 추가 승격 권한은 없다.

## 남은 작업

- [x] 코드 SHA의 CI required 성공을 확인했다. 문서 커밋 이후에도 코드 검증 결과와 구분한다.
- [x] 공용 TTL 수선과 보호 대상 3건 불변 검증 완료.
- [x] 승인된 Pages·Worker 승격 1회 실행(완료와 구분).
- [x] 제공 주문번호로 원본·구매 증거·본문과 카카오 전용 구매 계정을 대조했다. 고객에게 메일을 보내지는 않았다.
- [ ] 고객이 구매 당시 카카오 계정으로 로그인해 `/yeongnyangi/library/`의 완료 4건을 추가 결제 없이 재열람하는지 확인한다.
- [ ] 별도 최종 릴리스 확인 시 Pages·Worker 동일 SHA와 원본 본문을 확인한다. 추가 결제·차감·LLM 없이 완료 결과가 열리는지 확인해야 고객 복구 완료다.
- [ ] 공유 main 반영이 가능해진 뒤 자신의 워크트리와 작업 파일만 정리하고 이 문서를 `status: done`으로 닫는다. 기존 잠금을 임의 삭제하지 않는다.

정본: [library-preservation](../context/library-preservation.md). 운영 수선 전 인덱스 백업: `library-retention-index-backup-20261006.json`(동일 디렉터리, 인덱스 정의·보호 문서 집합 해시만 보존). 개인 이메일·주문번호·원문·비밀값은 문서에 보존하지 않는다.

18:30 KST 원본 77건 중 완료 38건·285챕터가 존재하며, 활성 직접 결제 33건의 원본 없음·소유자 불일치는 0건이다. 이것이 피해 사례 복구를 증명하지 않는다. 최근 업데이트가 실제 누락의 직접 원인이라는 근거는 아직 없다.

```powershell
Set-Location 'D:\Development\code-destiny\.codex-worktrees\yn-library-recovery-20261006-174128'
node scripts/audit-library-retention.mjs --env-file=.env.local --db=code_destiny
```

위 명령은 읽기 전용이다. 운영 쓰기·백업 복원·승격은 [CLAUDE.md](../../CLAUDE.md)의 별도 승인 경계를 따른다. 승인 없이 상세 GET으로 자동 복구를 실행하거나 생성 POST·유료 LLM을 호출하지 않는다.
