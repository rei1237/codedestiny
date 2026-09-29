---
status: mock-verified-live-validation-pending
updated: 2026-09-30
next: Confirm final main CI, then verify a dedicated PG test channel before physical-device tests.
---

# 영냥이 결제 조사·검증 재개

- 작업 디렉터리: `D:\Development\code-destiny`
- 기능 수정 커밋: `048bdd359`, `09c5ecb2a`, `72ee4d30b`.
- 최신 통합 코드: `2ea82d3b212062f05436b1de2db6a8aa0266a69c`, main push 완료. 가격/채널 설정/운영 배포는 변경하지 않았다.
- 조사 정본: `D:\Development\code-destiny\docs\qa\yeongnyangi-payment-investigation-20260930.md`
- 모의 검사 증거: `docs/qa/yeongnyangi-payment-mock-20260930.json` — 선택한 68개 시나리오의 마지막 실행 PASS. 로컬 선별 검사다. 추가로 [CI 전체 브라우저 매트릭스](https://github.com/rei1237/codedestiny/actions/runs/36640630089)는 72ee4d30b에서 108/108 PASS. 실기기·PG 실거래 검증은 아니다.
- [결제 전용 CI](https://github.com/rei1237/codedestiny/actions/runs/36640713719): 72ee4d30b PASS.
- [최종 통합 main CI](https://github.com/rei1237/codedestiny/actions/runs/36642213832): 커밋 2ea82d3b2의 공식 통합 검사 기록. 재개 시 최종 필수 lane 결과를 확인한다.

## 결론

실패 …53e58eb6은 LIVE PortOne V2 직접 카카오페이의 PG `CANCEL`(사용자 프로세스 중단). 의도적 취소인지 앱 전환 문제인지는 확인되지 않았다. 같은 userId/requestId의 카드 재시도 …00c0054c은 PAID이고 상담 챕터 5개가 저장 완료되어 해당 소유자의 보관함 조회에 포함된다. 고객 실제 열람은 미확인. 표시 시각과 UTC+9 대응은 확인했지만 콘솔 시간대 설정 메뉴 값과 과거 redirectUrl 전문은 미확인이다.

READY를 실패로 닫는 처리, 승인 미확정 재결제, 이중 승인 권한 중복, 오류 코드 유실을 수정했다. WebKit에서 별도로 재현한 취소 뒤 history.back()의 결제 화면 재진입은 PG 복귀 신원 보존으로 수정했고 양 엔진의 취소/실패/일반 뒤로가기 10건이 통과했다. 이를 최초 거래 CANCEL의 원인이라고 소급하지 않는다.

## 다음 순서

1. 위 main CI의 모든 필수 lane 통과를 확인한다. 다른 세션의 미커밋 marketing/TypeScript 환경 변경을 reset/stash/commit에 섞지 않는다.
2. 테스트 전용 PortOne V2 카카오페이 채널·CID가 있는지 확인한다. LIVE 채널을 테스트로 간주하지 않는다. 당시 요청/인증 중간 시점·redirectUrl·웹훅 HTTP 응답 전문은 확보 가능한 PG 보존 자료에서만 보완한다.
3. Android Chrome, iOS Safari, iOS/Android 카카오 인앱, 제공 중인 앱 WebView에서 앱 실행→승인/취소→원래 화면 복귀, 새로고침/세션 소실, 보관함 재열기, 취소 뒤 카드 선택을 검증한다. 앱의 Play Billing/외부 링크 경계를 유지한다.
4. 운영 반영과 실제 과금·유료 LLM 호출은 정확한 SHA·호출/결제 횟수·비용 상한을 별도 승인받은 뒤 수행한다. 이번 작업에서 운영 DB 쓰기, 새 실결제, 환불, 유료 LLM 호출은 하지 않았다.
5. 승인된 배포 뒤 Pages/Worker 동일 SHA 및 승인된 거래의 결과 저장·보관함 재열기까지 확인한다. 재결제로 전달 장애를 복구하지 않는다.

중복 승인은 `metadata.duplicatePaymentReviewRequired`와 같은 requestId의 복수 PAID를 조사한다. 결과 제공은 유지하고, 원본 PG 확인 및 고객 안내 후 별도 승인된 취소/환불 절차를 따른다. 자동 환불은 없다.

## 되돌리기

검토 후 기능 수정만 최신순으로 `git revert 72ee4d30b 09c5ecb2a 048bdd359` 한다. 다른 세션의 병합·메인 진입점·상담 변경을 되돌리지 않는다. 동결 매니페스트/캐시 핀/미러가 충돌하면 현재 정본에서 재생성하고 main CI로 확인한다. claim/검토 메타데이터는 삭제하지 않는다. 운영 롤백은 별도 승인 범위다.

## 복사할 재개 지시

```text
D:\Development\code-destiny에서 D:\Development\code-destiny\docs\handoff\yeongnyangi-payment-validation-20260930.md를 읽고, main에 2ea82d3b212062f05436b1de2db6a8aa0266a69c가 포함됐는지와 미커밋 변경을 확인하라. 최종 CI 확인 뒤 테스트 전용 PG 채널 확인 및 실기기 복귀 검증부터 이어가라. 실과금·유료 LLM·운영 변경·환불은 별도 승인 전 실행하지 마라.
```
