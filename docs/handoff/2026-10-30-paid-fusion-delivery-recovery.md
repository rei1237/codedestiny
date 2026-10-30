---
status: done
updated: 2026-10-30
next: "후속 과제 절만 남음(별도 승인 항목 포함)"
---

# 2026-10-30 초융합 유료 결과 미지급 복구 · 자동 환불 · Pro 대체

## 요약

- 결제됐는데 결과를 받지 못한 초융합 주문 1건(PortOne `cd4973…e518`, 주문 해시 `d95aa2d5a6`)을 같은 주문으로 이어 생성했다.
  - 결과: `completed`, 품질 등급 `degraded`, 본문 36,403자.
  - 추가 결제 0. 소유자 보관함에만 보인다.
  - 감사 기록: 문서의 `recoveryAudit`에 남겼다.
- 이 주문이 멈춘 원인을 고쳤다.
  - 미전달 카드 주문은 자동 환불하게 했다.
  - Gemini Pro를 쓰는 모든 기능이 Pro 거절 시 Flash로 전달하게 했다.

## 원인

1. 프리미엄 1단계의 계획 게이트가 잘못된 범위를 잘라 그룹이 계속 대기했다. 그 사이 countTokens 일시 실패도 시도를 소모했다(`4d8b6a36e`).
2. `gemini-2.5-pro`가 이 프로젝트에서 404로 은퇴했다. integration·verdict 호출이 모두 실패했다(`4c5b8dc2a`).
3. 분량 0.8 미달과 길이 보정이 유료 시도를 추가로 샀다(`51f2df0fa`). 메모리 원칙 "분량은 목표, 전달 우선"에 따라 끊었다.
4. 예전 코드를 띄워 둔 브라우저가 이어 생성을 요청해 시도를 소모했다.
5. 응답 스키마가 "too many states" 400을 내는 그룹이 있다. **미해결**, 후속 과제로 넘긴다.
6. 운영 워커 배치(Smart Placement)가 홍콩으로 옮겨졌다(`cf-placement: remote-HKG`). 홍콩은 Gemini API 지원 지역이 아니라 countTokens가 400 FAILED_PRECONDITION을 냈다. 10-29 17:31Z 이후 요청 경로 Gemini 성공은 0건이다. 초융합 이어 생성이 막힌 시점의 원인도 이것이다.

## 네오 팩폭 작전실 환불 건 (PortOne `cdeae880…aff`)

- 판정: 고객 취소가 아니다. 서버 자동 환불이다.
- 경위:
  1. 위 6번 때문에 챕터 호출이 모두 countTokens에서 거절됐다. 생성 요청은 한 번도 나가지 않았다.
  2. 그런데도 챕터당 시도 2회가 호출 전에 소모됐다. 세 번째 /start에서 `LLM_FAILED`가 났다.
  3. `refundCardPaymentOnFailure`가 30,000원을 전액 환불했다(2026-10-29T23:52Z).
- 실패 원인은 어디에도 기록되지 않았다. 환불 사유에는 "결제 권한은 보존"이라는 반대 문구가 남았다.
- 고객 연락은 운영자 몫이다.

## 배치 고정 (`worker/wrangler.toml`)

- `[placement] mode = "targeted"`, `region = "aws:ap-northeast-2"`로 바꿨다. Atlas 서울 근처이고, 스테이징 실측값은 `remote-ICN`이다.
- `scripts/verify-worker-config-parity.mjs`의 `PINNED_PLACEMENT`가 프로덕션·스테이징 두 설정의 값을 고정한다. smart로 되돌리면 CI가 실패한다.
- 배치는 fetch 핸들러에만 적용된다. 큐 컨슈머·크론·RPC는 이 설정 밖이다.
- 확인 방법: `curl -s -o /dev/null -D - https://code-destiny.com/api/health | grep -i cf-placement`의 값이 `remote-ICN`이어야 한다.

## 비과금 실패 판정 (`lib/gemini-provider-errors.mjs` `isUnbilledGeminiFailure`)

- Gemini가 생성을 시작하지 않은 실패에는 유료 시도를 돌려준다. 초융합과 네오가 같은 판정을 쓴다.
  - 해당: 토큰 계수 장애, 429, 5xx, 은퇴 모델 404, countTokens 지역 거절(400 FAILED_PRECONDITION).
  - 제외: 시간 초과(이미 과금됐을 수 있음), 지출 한도, 잘못된 요청 400.
- 네오는 챕터당 3회까지 생성 잠금 안에서 돌려준다. 실패는 `[neo-operation-room] section provider failed` 로그에 `error:providerCode:status`로만 남긴다.
- 네오의 PortOne 취소 사유는 "네오의 팩폭 작전실 브리핑을 생성하지 못해 자동 환불"이다.

## 커밋과 운영 반영

| 커밋 | 내용 | 운영 |
|---|---|---|
| `4d8b6a36e` `72bfd0fe9` `51f2df0fa` `4c5b8dc2a` `6668dc524` `79d696fd2` `334116676` | 1단계 정체·비과금 실패 반환, 단건 감사 스크립트, 길이 보정 중단, 초융합 Pro→Flash, 단건 복구 스크립트, inventory | 릴리스 run 41022693205, verify-deployed-sha PASS `334116676489` |
| `6dc32baa4` | 초융합 카드 주문 미전달 자동 환불(B-R) | PR CI 41022943553 실패. toss 오프라인 stub에 `fusionBudgetProfile`이 없었다(`4d8b6a36e`부터 있던 문제가 toss 단계가 돌면서 드러남) |
| `8de975f78` | toss native fusion 경계 테스트 stub 보강 | B-R와 함께 운영 반영 |
| `ec6536650` | 초융합 미전달 환불 스윕의 Mongo 조회 모양 allowlist | B-R와 함께 운영 반영 |
| `edcb396e3` | 운영 워커 배치를 서울(`aws:ap-northeast-2`)로 고정, CI 패리티 가드 | PR CI 41033071449 통과, 릴리스 run 41035801904 |
| `b53994f3b` | Pro 작업 공통 대체 정책, 참치 사주 같은 시도 안 Flash 대체(Phase E). rebase 전 해시는 `aea7ed8fa`·`6795399c9` | PR CI 41035892563, 릴리스 run 41041040981 |
| `4135d0e44` | 네오 작전실 비과금 실패 시도 반환, 환불 사유 정정, 초융합과 판정 공유 | 릴리스 run 41041040981, verify-deployed-sha PASS `4135d0e44292`, `cf-placement: remote-ICN` |

## 자동 환불 규칙 (B-R, `worker/lib/fusion-fortune-recovery-task.js`)

- 대상: `FUSION_AUTO_REFUND_SINCE`(2026-10-30T10:00Z, 19:00 KST) 이후 생성된 **카드 결제** 주문.
  - 그 이전 주문(legacy)은 자동 환불하지 않는다. 운영자가 판단한다.
  - 월정석·이용권·선물·네이티브 주문은 `llmMeta.refundSkipped`를 기록하고 검토 경로에 남긴다.
- 발동 조건:
  - 수동 이어 생성까지 다 쓴 경우: `reviewRequired`와 `manualGranted`가 모두 참이면 `BUDGET_EXHAUSTED`.
  - 입력이 있는데 24시간 동안 미전달: `UNDELIVERED_24H`.
  - 입력 없이 7일: `INPUT_MISSING_7D`.
- 실행:
  - 10분 cron이 `generation_failed`와 `refundEligibleAt`을 표시한다. 기존 `consultation-delivery-refund.js`가 전액 환불하고 열람을 회수한다.
  - 살아 있는 생성 lease는 표시와 환불 예약을 모두 막는다.
- UI: 결과 조회·스트림·생성 응답이 `refunded`나 `refund_pending`을 돌려준다. 문구는 ko/en/ja/zh-CN/zh-TW 다섯 언어다.

## Pro 대체 계약 (Phase E, `lib/gemini-model-policy.js`)

- `PRO_TASK_POLICY`: Pro 작업마다 대체 모델과 최소 호출 시간을 둔다. 여기에 없는 작업은 Pro에 닿지 않는다.
- `proFallbackCause`: Pro가 404·429·5xx로 거절했거나 시간 초과가 났는지 판정한다. 초융합과 참치 사주가 함께 쓴다.
- 참치 사주:
  - Pro가 거절하면 60초 이상 남았을 때 같은 시도 안에서 Flash로 다시 보낸다. 영수증에 `modelFallback`을 남긴다.
  - Pro 429·5xx·시간 초과 영수증이 있으면 다음 시도는 처음부터 Flash로 간다.
  - 자기검토 재작성은 Pro 최소 시간(120초)이 남지 않으면 건너뛰고 초안을 전달한다.
- 계약 테스트 `__tests__/ui/gemini-model-routing.test.mjs`가 두 경우에 실패한다.
  - 정책 없는 Pro 작업이 있을 때.
  - `reasoningTask`를 넘기는 코드가 `proFallbackCause`를 쓰지 않을 때.

## 운영 반영 상태 (2026-10-30 19:57 KST)

- 위 커밋은 모두 운영에 반영됐다. 마지막 확인은 `4135d0e44292`이고, Pages·Worker 모두 PASS다.
- 운영 워커 배치는 `remote-ICN`이다.
- 요청 경로 Gemini 성공은 아직 실요청으로 관찰하지 못했다. 다음 실요청 뒤 `[llm` 로그로 확인한다.

## 후속 과제 (별도 승인 필요한 것 포함)

- Pro를 대신할 모델을 정해야 한다. 지금은 Pro 작업이 사실상 Flash로 간다.
- 응답 스키마 "too many states" 400을 해결해야 한다.
- 월정석·이용권·네이티브 결제 초융합 주문의 자동 환불을 붙여야 한다.
- 배포 이전 미전달 주문은 감사해서 환불 여부를 정해야 한다. **별도 승인**이 필요하다.
- P0 주문에서 남은 6개 챕터를 보강할지 정해야 한다. **별도 승인**이 필요하다.
- 참치 사주에서 일시 실패의 챕터 시도를 돌려주고, 큐 재시도에 Retry-After를 반영해야 한다.
- 로컬에 Playwright 브라우저가 없어 browser 테스트 2개가 로컬에서 실패한다. 환경 문제이고 CI는 별도다.
