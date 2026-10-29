---
status: done
updated: 2026-10-29
next: 후속 진행은 docs/toss/2026-10-28-launch-plan.md를 따른다. 이 문서는 당시 기록으로 보존한다.
---

# 앱인토스 전체 이식 진행 상태

이전 인수인계는 후속 실행 계획으로 이관했다. 아래는 2026-10-08 당시 기록이며 전체 이식이나 출시 완료를 뜻하지 않는다.

- 작업 디렉터리: `D:\Development\code-destiny\.codex-worktrees\toss-miniapp-20261007-223959`
- 브랜치: `wt/toss-miniapp-20261007-223959`, PR 없음. 루트 main은 다른 세션이 사용하므로 수정 금지.
- 마지막 기능 커밋: `a9fdcc6f8` (`feat(toss): restore and share tarot readings`).
- 원격 push/운영 배포/토스 신규 업로드/검수 제출: **이번 실행에서는 없음**.
- 자동 승인 검토가 `git push origin HEAD:main`을 거절했다. 사유: 사용자 계획의 전체 이식 완료보다 이른 부분 구현 푸시이며 판매 비활성·승인 SKU 없음. 다른 경로로 우회하지 않았다. 코드 이식은 외부 사업자 심사와 독립적으로 계속할 수 있다.
- 전체 이전 미완료. 새 로컬 기능을 기존 콘솔 업로드에 들어 있다고 설명하지 않는다.

정본 실행 문서: `D:\Development\code-destiny\.codex-worktrees\toss-miniapp-20261007-223959\docs\toss\2026-10-08-full-service-plan.md`

검증: `npm.cmd run typecheck --prefix apps/toss` 통과. 타로 라이브러리 계약·grant/library/routes 대상 21/21 통과. 앱 전체 `npm.cmd run test --prefix apps/toss`는 76 통과·1 실패로 끝났으며, 실패는 변경과 무관한 꽃 점성술 에페머리스가 격리 환경에서 `127.0.0.1` 연결 `EACCES`를 받아 `FLOWER_CHART_UNAVAILABLE`가 된 것이다. `npm run check:fast -- --plan`과 `npm run check:fast`는 실행했다. 후자는 같은 임시 디렉터리 EPERM/로컬 루프백 차단과 기존 Ziwei mock의 `runTossOrderReconciliation is not a function` 때문에 83 통과·5 실패였다. GitHub CI와 실기기 검증은 미실행이다.

최근 로컬 AIT: `01a11b57-35bc-7f8e-a12b-e24caf4ead41`, 1,348,706 bytes, SHA256 `fc48c066043d348544bb3738545c5d2f700bbff7bb2cd102975f345a79316ac5`. 마지막 환불 동기화는 백엔드 전용 변경. 이 파일은 업로드되지 않았다.

2026-10-08 타로 네이티브 첫 이식: 일반·천체의 선율·원석 소울·태양 회복·이직·관계·마인드스캔·수비학·오라클·재회·자기 기준 회복·연간 타로의 12개 흐름을 `lib/tarot/toss-library-flows.mjs` 한 곳에 고정하고, Toss 홈의 `타로 리딩`에서 질문 입력·자리별 카드 선택·결과 조회를 연결했다. 일반/회복/자기 기준 회복은 무료 로컬 리딩이고 IAP 대상에서 제외했다. 자기 기준 회복의 카드 자리/요약은 DOM 없는 `lib/tarot/self-esteem-local-reading.mjs`를 사용한다. 유료 흐름은 서버가 질문·카드 수·중복·자리·정/역방향을 검증해 주문 실행 기록에 입력을 저장하고, `claimTarotLibraryDelivery`→`completeTarotLibraryDelivery`로 저장 결과만 다시 읽는다. 승인 SKU 배열은 여전히 비어 있어 결제를 시작하지 않는다.

2026-10-08 유료 타로 생성기 이식: `worker/toss/tarot-library-generator.js`가 9개 IAP 흐름을 각 기존 정본 생성기(천체·원석·이직·관계·마인드스캔·수비학·오라클·재회·연간)에 연결한다. 결과는 공통 카드 목록에 더해 서비스별 `presentation`(도입·요약·섹션·행동)을 저장하고 Toss 화면은 천체/원석/오라클/연간의 고유 섹션 제목을 포함해 이를 렌더한다. 수비학은 생년월일, 원석 소울은 원석 선택을 주문 입력에 포함한다. 오라클만 기존 유료 생성기를 호출하며, 실 LLM 호출은 이 개발 검증에서 하지 않았다. 생성 오류는 내부 예외를 노출하지 않고 `generation_failed`로 저장하며 같은 주문의 명시적 POST 재시도로만 다시 claim한다. 9개 생성기 결과와 실패→재시도는 모의 테스트로 검증했다.

2026-10-08 타로 결과·재열람·저장/공유 보완: Toss 결과 화면은 12개 흐름의 `renderer`별 제목·카드 묶음·서비스 섹션을 구분해 렌더하며, 유료 타로 구매는 기록 보관함에서 같은 주문의 저장 결과를 다시 연다. 결과 카드 이미지는 `File.saveBase64`로만 저장하고, 공유는 질문·주문 ID·결과 ID를 경로에 넣지 않은 `/tarot-library?source=share` 공개 진입 링크와 사용자가 확인한 요약만 사용한다. SDK mock 18건·토스 타입 검사·번들 빌드는 통과했다. 공식 전체 mock 검사는 격리 환경 `EPERM` 후 권한 재실행에서 기존 `fusion-paid-delivery-route.test.js`의 `runTossOrderReconciliation is not a function`으로 실패해 이번 변경의 통과 증거는 아니다. CUA의 토스 기기 표면 조회와 로컬 브라우저 접속은 각각 시간 초과·loopback 시간 초과라 실기기/화면 검수는 미완료다.

바로 다음 작업:

1. 9개 유료 흐름은 기존 생성기와 `claimTarotLibraryDelivery`/`completeTarotLibraryDelivery` 경계에 연결했다. 실제 토스 기기·결제·유료 LLM·운영 DB 증거는 없다. 오라클의 실 생성 품질은 별도 승인 후에만 확인한다.
2. 12개 결과 화면을 서비스별 기존 결과 구조와 톤에 더 가깝게 완성한다. 현재는 서비스별 저장 섹션을 렌더하지만, 원본 웹의 모든 전용 시각 구성과 저장/공유 조작을 동등하게 이식하지 않았다. 카드 수/진입 수를 서비스 완료 개수로 세지 않는다.
3. 자기 기준 회복 레거시 경험도 새 DOM 없는 core를 소비하도록 호환 테스트를 추가한다. 토스에 레거시 스크립트 전체(외부 공유 포함)를 넣지 않는다.
4. 기본 운세/전체 상담/개인화/기타/서재의 실제 끝 흐름을 계속 구현. 개인정보 삭제·민감 거래 보호·전체 SKU 권리 계약은 여전히 미완료.
5. 가격 확정·사업자·mTLS·약관·실기기·이미지·업로드·검수·출시는 각각 증거를 확보한다. 실결제·유료 LLM·운영 DB 쓰기 없이 개발 검사한다.

재개 시 첫 명령:

```powershell
Set-Location 'D:\Development\code-destiny\.codex-worktrees\toss-miniapp-20261007-223959'
git status --short
Get-Content 'D:\Development\code-destiny\.codex-worktrees\toss-miniapp-20261007-223959\docs\toss\2026-10-08-full-service-plan.md'
```
