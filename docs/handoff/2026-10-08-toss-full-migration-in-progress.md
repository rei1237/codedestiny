# 앱인토스 전체 이식 진행 상태

status: in-progress

- 작업 디렉터리: `D:\Development\code-destiny\.codex-worktrees\toss-miniapp-20261007-223959`
- 브랜치: `wt/toss-miniapp-20261007-223959`, PR 없음. 루트 main은 다른 세션이 사용하므로 수정 금지.
- 마지막 기능 커밋: `23befce87` (`feat(toss): add tarot library purchase adapter`).
- 원격 push/운영 배포/토스 신규 업로드/검수 제출: **이번 실행에서는 없음**.
- 자동 승인 검토가 `git push origin HEAD:main`을 거절했다. 사유: 사용자 계획의 전체 이식 완료보다 이른 부분 구현 푸시이며 판매 비활성·승인 SKU 없음. 다른 경로로 우회하지 않았다. 코드 이식은 외부 사업자 심사와 독립적으로 계속할 수 있다.
- 전체 이전 미완료. 새 로컬 기능을 기존 콘솔 업로드에 들어 있다고 설명하지 않는다.

정본 실행 문서: `D:\Development\code-destiny\.codex-worktrees\toss-miniapp-20261007-223959\docs\toss\2026-10-08-full-service-plan.md`

검증: 토스 전체 76/76 모의 테스트 통과. 타로 라이브러리 계약·grant/library/routes 대상 20/20, Toss 타입/빌드, worker no-undef 통과. GitHub CI 미실행. 이번 `check:fast`는 실행했으며 결과는 이 문서의 다음 갱신에서 정확히 기록한다. dry-run Wrangler 로그 쓰기 EPERM 경고는 기존 상태다.

최근 로컬 AIT: `01a11b57-35bc-7f8e-a12b-e24caf4ead41`, 1,348,706 bytes, SHA256 `fc48c066043d348544bb3738545c5d2f700bbff7bb2cd102975f345a79316ac5`. 마지막 환불 동기화는 백엔드 전용 변경. 이 파일은 업로드되지 않았다.

2026-10-08 타로 라이브러리 어댑터: 일반·천체의 선율·원석 소울·회복·이직·관계·마인드스캔·수비학·오라클·재회·자기 기준 회복·연간 타로의 12개 계약을 `worker/toss/tarot-library.js`에 고정했다. 일반/회복/자기 기준 회복은 무료 로컬 흐름으로 IAP 대상에서 제외했고, 나머지는 승인된 토스 SKU의 `flowId`·`featureKey`가 모두 일치할 때만 `TossPurchase`와 `PaidExecutionRecord`를 한 트랜잭션으로 만든다. 지급은 생성과 분리되고, 생성기는 claim→complete로 저장본만 완료할 수 있다. 읽기·보관함·환불도 같은 주문/소유자를 재확인한다. 현재 승인 SKU 배열은 여전히 비어 있고, 실제 생성기·토스 화면·실기기·업로드는 미구현이다.

바로 다음 작업:

1. 12개 타로 흐름별 토스 입력·카드 선택·네이티브 결과 렌더러를 구현하고, 유료 생성기는 `claimTarotLibraryDelivery`/`completeTarotLibraryDelivery`만 통해 저장한다. 카드 수/진입 수를 서비스 완료 개수로 세지 않는다.
2. 자기 기준 회복은 `js/tarot-self-esteem-experience.js`의 무료 로컬 draw/completeSelfEsteemReadingPayload를 DOM에서 분리해 재사용한다. 토스에 레거시 스크립트 전체(외부 공유 포함)를 넣지 않는다.
3. 기본 운세/전체 상담/개인화/기타/서재의 실제 끝 흐름을 계속 구현. 개인정보 삭제·민감 거래 보호·전체 SKU 권리 계약은 여전히 미완료.
5. 가격 확정·사업자·mTLS·약관·실기기·이미지·업로드·검수·출시는 각각 증거를 확보한다. 실결제·유료 LLM·운영 DB 쓰기 없이 개발 검사한다.

재개 시 첫 명령:

```powershell
Set-Location 'D:\Development\code-destiny\.codex-worktrees\toss-miniapp-20261007-223959'
git status --short
Get-Content 'D:\Development\code-destiny\.codex-worktrees\toss-miniapp-20261007-223959\docs\toss\2026-10-08-full-service-plan.md'
```
