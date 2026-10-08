# 앱인토스 전체 이식 진행 상태

status: in-progress

- 작업 디렉터리: `D:\Development\code-destiny\.codex-worktrees\toss-miniapp-20261007-223959`
- 브랜치: `wt/toss-miniapp-20261007-223959`, PR 없음. 루트 main은 다른 세션이 사용하므로 수정 금지.
- 마지막 기능 커밋: `22abf6e146d9f0d64cee2f7a9462d9ae59e176fa`.
- 원격 push/운영 배포/토스 신규 업로드/검수 제출: **이번 실행에서는 없음**.
- 자동 승인 검토가 `git push origin HEAD:main`을 거절했다. 사유: 사용자 계획의 전체 이식 완료보다 이른 부분 구현 푸시이며 판매 비활성·승인 SKU 없음. 다른 경로로 우회하지 않았다. 코드 이식은 외부 사업자 심사와 독립적으로 계속할 수 있다.
- 전체 이전 미완료. 새 로컬 기능을 기존 콘솔 업로드에 들어 있다고 설명하지 않는다.

정본 실행 문서: `D:\Development\code-destiny\.codex-worktrees\toss-miniapp-20261007-223959\docs\toss\2026-10-08-full-service-plan.md`

검증: 토스 전체 66/66 모의 테스트 이후 정기 주문 동기화 4/4 별도 통과. Toss 타입/빌드, worker no-undef, cron Mongo coverage, Mongo query shape, Worker dry-run 통과. dry-run Wrangler 로그 쓰기 EPERM 경고. GitHub CI 미실행. 앞선 check:fast는 sitemap drift에서 실패 후 해당 drift만 수정·재검증, 전체 성공 아님.

최근 로컬 AIT: `01a11b57-35bc-7f8e-a12b-e24caf4ead41`, 1,348,706 bytes, SHA256 `fc48c066043d348544bb3738545c5d2f700bbff7bb2cd102975f345a79316ac5`. 마지막 환불 동기화는 백엔드 전용 변경. 이 파일은 업로드되지 않았다.

바로 다음 작업:

1. `docs/toss/full-service-inventory.json`의 87개 후보에서 타로 라이브러리 12개 계약을 확정. 카드 수/진입 수를 서비스 완료 개수로 세지 않는다.
2. `worker/lib/love-tarot-delivery.js`, `mindscan-delivery.js`, `paid-narrative-delivery.js`를 기준으로 `PaidExecutionRecord` 계열에 맞는 토스 소유권·IAP 권한·생성/복구 어댑터 구현. 현재 grant는 YeongnyangiRequest 전용이다.
3. 자기 기준 회복은 `js/tarot-self-esteem-experience.js`의 무료 로컬 draw/completeSelfEsteemReadingPayload가 정본. DOM 화면과 순수 엔진을 분리해야 하며 토스에 레거시 스크립트 전체(외부 공유 포함)를 그대로 넣지 않는다. 회복 타로도 세 레지스트리에서 누락돼 inventory에 별도 추가했다.
4. 기본 운세/전체 상담/개인화/기타/서재의 실제 끝 흐름을 계속 구현. 개인정보 삭제·민감 거래 보호·전체 SKU 권리 계약은 여전히 미완료.
5. 가격 확정·사업자·mTLS·약관·실기기·이미지·업로드·검수·출시는 각각 증거를 확보한다. 실결제·유료 LLM·운영 DB 쓰기 없이 개발 검사한다.

재개 시 첫 명령:

```powershell
Set-Location 'D:\Development\code-destiny\.codex-worktrees\toss-miniapp-20261007-223959'
git status --short
Get-Content 'D:\Development\code-destiny\.codex-worktrees\toss-miniapp-20261007-223959\docs\toss\2026-10-08-full-service-plan.md'
```
