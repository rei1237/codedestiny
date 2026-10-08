# 앱인토스 전체 이식 진행 상태

status: in-progress

- 작업 디렉터리: `D:\Development\code-destiny\.codex-worktrees\toss-miniapp-20261007-223959`
- 브랜치: `wt/toss-miniapp-20261007-223959`, PR 없음. 루트 main은 다른 세션이 사용하므로 수정 금지.
- 마지막 기능 커밋: `e6d64f969` (`feat(toss): add native tarot library flows`).
- 원격 push/운영 배포/토스 신규 업로드/검수 제출: **이번 실행에서는 없음**.
- 자동 승인 검토가 `git push origin HEAD:main`을 거절했다. 사유: 사용자 계획의 전체 이식 완료보다 이른 부분 구현 푸시이며 판매 비활성·승인 SKU 없음. 다른 경로로 우회하지 않았다. 코드 이식은 외부 사업자 심사와 독립적으로 계속할 수 있다.
- 전체 이전 미완료. 새 로컬 기능을 기존 콘솔 업로드에 들어 있다고 설명하지 않는다.

정본 실행 문서: `D:\Development\code-destiny\.codex-worktrees\toss-miniapp-20261007-223959\docs\toss\2026-10-08-full-service-plan.md`

검증: `npm.cmd run typecheck --prefix apps/toss` 통과. 타로 라이브러리 계약·grant/library/routes 대상 21/21 통과. 앱 전체 `npm.cmd run test --prefix apps/toss`는 76 통과·1 실패로 끝났으며, 실패는 변경과 무관한 꽃 점성술 에페머리스가 격리 환경에서 `127.0.0.1` 연결 `EACCES`를 받아 `FLOWER_CHART_UNAVAILABLE`가 된 것이다. `npm run check:fast -- --plan`과 `npm run check:fast`는 실행했다. 후자는 같은 임시 디렉터리 EPERM/로컬 루프백 차단과 기존 Ziwei mock의 `runTossOrderReconciliation is not a function` 때문에 83 통과·5 실패였다. GitHub CI와 실기기 검증은 미실행이다.

최근 로컬 AIT: `01a11b57-35bc-7f8e-a12b-e24caf4ead41`, 1,348,706 bytes, SHA256 `fc48c066043d348544bb3738545c5d2f700bbff7bb2cd102975f345a79316ac5`. 마지막 환불 동기화는 백엔드 전용 변경. 이 파일은 업로드되지 않았다.

2026-10-08 타로 네이티브 첫 이식: 일반·천체의 선율·원석 소울·태양 회복·이직·관계·마인드스캔·수비학·오라클·재회·자기 기준 회복·연간 타로의 12개 흐름을 `lib/tarot/toss-library-flows.mjs` 한 곳에 고정하고, Toss 홈의 `타로 리딩`에서 질문 입력·자리별 카드 선택·결과 조회를 연결했다. 일반/회복/자기 기준 회복은 무료 로컬 리딩이고 IAP 대상에서 제외했다. 자기 기준 회복의 카드 자리/요약은 DOM 없는 `lib/tarot/self-esteem-local-reading.mjs`를 사용한다. 유료 흐름은 서버가 질문·카드 수·중복·자리·정/역방향을 검증해 주문 실행 기록에 입력을 저장하고, `claimTarotLibraryDelivery`→`completeTarotLibraryDelivery`로 저장 결과만 다시 읽는다. 현재 반환하는 카드/자리 baseline은 유료 LLM 결과를 흉내 내지 않는 임시 저장형 결과이며, 기존 서비스별 생성기와 고유 결과 레이아웃으로 아직 대체되지 않았다. 승인 SKU 배열은 여전히 비어 있어 결제를 시작하지 않는다.

바로 다음 작업:

1. 각 유료 흐름을 기존의 검증된 서비스별 생성기에 연결하고, `claimTarotLibraryDelivery`/`completeTarotLibraryDelivery` 경계 안에서 실패·재시도·저장 결과를 검증한다. 현재 baseline을 유료 결과로 출시하지 않는다.
2. 12개 결과 화면을 서비스별 기존 결과 구조와 톤에 맞게 완성한다. 현재는 카드/자리 공통 렌더러이며, 연간 타로만 월별 격자를 먼저 제공한다. 카드 수/진입 수를 서비스 완료 개수로 세지 않는다.
3. 자기 기준 회복 레거시 경험도 새 DOM 없는 core를 소비하도록 호환 테스트를 추가한다. 토스에 레거시 스크립트 전체(외부 공유 포함)를 넣지 않는다.
4. 기본 운세/전체 상담/개인화/기타/서재의 실제 끝 흐름을 계속 구현. 개인정보 삭제·민감 거래 보호·전체 SKU 권리 계약은 여전히 미완료.
5. 가격 확정·사업자·mTLS·약관·실기기·이미지·업로드·검수·출시는 각각 증거를 확보한다. 실결제·유료 LLM·운영 DB 쓰기 없이 개발 검사한다.

재개 시 첫 명령:

```powershell
Set-Location 'D:\Development\code-destiny\.codex-worktrees\toss-miniapp-20261007-223959'
git status --short
Get-Content 'D:\Development\code-destiny\.codex-worktrees\toss-miniapp-20261007-223959\docs\toss\2026-10-08-full-service-plan.md'
```
