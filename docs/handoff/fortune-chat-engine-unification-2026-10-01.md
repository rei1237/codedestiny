---
status: active
implementationStatus: shipped-to-main (플래그 OFF, 사용자 노출 없음)
updated: 2026-10-01
next: 2단계 — 연이 상담 UI를 새 API(/api/fortune-chat/consultations)에 연결하고 스테이징에서 플래그를 켠다.
---

# 연이·네오 대화형 상담 → 영냥이 질문형 엔진 공유 (1단계: 공통 엔진·결제 연결)

계획 원본: `C:\Users\user\.claude\plans\pasted-content-id-d7b8-code-humming-tower.md`
사용자 결정(2026-10-01):
- 영냥이 파이프라인에 persona 축을 추가한다.
- 깊이는 고등어(5장, v6)로 한다.
- 가격은 1회 3,000원과 계정 무료 1회를 유지한다.
- 이번 세션은 1단계만 진행한다.

## 결과 (커밋)

| 커밋 | 내용 |
|---|---|
| a586d5ed4 | 연이·네오 말투 프롬프트(`worker/yeongnyangi/prompts/persona/`)와 장 생성기 persona 선택. 결론은 persona 로 바꾸지 않는다 |
| aee618eb7 | 접근 수단 목록을 공유 상수로 만듦(`access-methods.js`): `PER_USE`·`ACCOUNT_FREE_TRIAL` 추가, 상담 필드(persona 등) 추가 |
| eddb61ae5 | `getChatProduct`(chat_<도메인>, 고등어 깊이, 3,000원)와 `prepareFortune(..., {persona})`. 영냥이 fingerprint·상품·가격은 그대로다 |
| 40a45857e | PER_USE 접근: `fc-<요청 id>` 결제·코인·월정석·이용권 증빙을 고정하고 매 claim 마다 재확인한다 |
| ddc5cd0cd | 무료 1회(guardian 계정 사용량 문서 공유)와 사용자의 명시적 선택(`access`: free_trial·pass·checkout). 이용권은 `pass` 선택 때만 차감한다. 열린 카드 결제창이 있으면 409 |
| e28bc7247 | `/api/fortune-chat/consultations` 라우트(`ENABLE_FORTUNE_CHAT_CONSULTATIONS==='true'` 일 때만 생성·활성화). 영냥이 기록에서 persona 행 제외 |
| f84d72fe8 | 10분 크론: 결제된 `fc-` 주문 자동 활성화, 다른 방식으로 이미 열린 상담에 결제가 들어오면 중복 결제로 보고 운영 알림 후 표시. 멈춘 PER_USE·무료 상담도 재개 |

## API (2단계 UI 가 쓸 계약)

| 메서드·경로 (`/api/fortune-chat` 기준) | 동작 |
|---|---|
| `POST /consultations {persona, domain, profileId, question, consultationAttemptId, locale, timezone}` | 201. 응답에 `paymentRequestId`(`fc-<id>`)·`paidFeatureKey`·`freeTrialAvailable` |
| `POST /consultations/:id/activate {access}` | `access` 는 `free_trial`·`pass`·`checkout`. 없으면 402 `PAYMENT_REQUIRED`(결제창을 열 정보 포함). `checkout` 인데 결제 기록이 아직 없으면 503 |
| `GET /consultations/:id` | 읽기와 이어서 생성. 플래그 OFF 여도 열려 있다 |
| `POST /consultations/:id/generate` | 같은 상담 재시도 |
| `GET /consultations?persona=yeoni\|neo` | 기록 최대 30개 |

- 도메인: saju·ziwei·sukuyo·vedic·astrology.
- 타로는 기존 guardian 경로를 유지한다. 영냥이 타로는 계약이 달라 6단계에서 다룬다.
- 카드 결제는 기존 per-use 결제창을 `featureKey: fortune-chat-consultation`, `requestId: fc-<id>` 로 열고, 돌아오면 `access: 'checkout'` 으로 활성화한다.

## 검증 (전부 mock — 실 LLM·실결제 없음)

- jest:
  - 관련 27개 스위트 560/560(커밋 5 시점)
  - `yeongnyangi-repository` 69
  - `fortune-chat-consultations-route` 12
  - `yeongnyangi-recovery` 18
- 변이 검사 14개를 모두 잡았다:
  - 선택 게이트, 열린 결제창, 복원 분기, 무료 가드
  - 플래그, 상담 판별, access 화이트리스트, 기록 필터, 영냥이 목록 분리
  - 크론 필터, 표시 조건, 증빙 일치, 알림 선행, fc 분기
- verify: payment-freeze, billing-pass-policy, paid-feature-billing-policy, per-use-never-unlocks, no-nested-retry, worker-no-undef, payment-concurrency-guards, guardian-fortune-failure-contract, fortune-chat-reading, guard-wiring. typecheck 통과.
- paid-gate-auditor 재감사: PASS(N1 해소).
- **미검증:**
  - 실제 Mongo 트랜잭션 쓰기 충돌
  - 실 LLM 상담 품질(별도 1회 승인 필요)
  - 스테이징 화면

## 남은 위험·후속 (우선순위순)

1. 🔴 **카드 결제 prepare 측 가드가 없다.**
   - 무료/이용권으로 연 상담에 낡은 탭이 `fc-` 카드 결제를 또 할 수 있다.
   - 지금은 크론이 사후에 중복 결제로 감지하고 운영 알림만 보낸다(자동 환불 없음).
   - 2단계 UI 는 연 상담에 결제 버튼을 내지 않아야 하고, 6단계에서 prepare 가 `fc-` 요청의 접근 여부를 확인해야 한다.
2. `assertNoOpenCheckout` 는 트랜잭션 밖에서 한 번만 읽는다(TOCTOU). 영냥이 `paymentClaimOrderId` 같은 점유 표시가 없다.
3. 유료 PER_USE 가 0장 실패하면 자동 환불 없이 `GENERATION_REVIEW_REQUIRED` 로 남는다(영냥이 DIRECT_KRW 와 같다). 이용권 환불 정보(`perUsePassRefund`)는 재시도 때 잃을 수 있다(N2). 6단계 과제.
4. `fc-` 활성화가 영구 오류(예: 무료 복원으로 REFUNDED 된 상담에 결제)를 내면 24시간마다 재시도할 뿐 알림이 없다.
5. 익명 병합이 `freeUsed` 를 절대값으로 `$set` 해서, 복원과 겹치면 무료 1회가 하나 더 생길 수 있다(영향 작음).
6. `unattachedChat` 이 `state:'CREATED'` 를 고정하지 않는다(기존 PER_USE 동작).
7. CI: `paid-flow-gates.yml` 이 `worker/yeongnyangi/**` 변경에 걸리지 않는다. `change-risk` 가 이 파일들을 deep 대상으로 올리지 않는다(N4).

## 범위 밖 결함 (보고만)

- guardian 서버 문구 "1회 5,000원"(`guardian-fortune-usage.js`, `guardian-fortune-generate.js`)이 실제 3,000원과 다르다.
- 계정 usage 스키마 기본값·최대값이 3이다(가드는 min(…,1)로 막는다).
- paid attempt 에 `source` 가 표기되지 않는다.
- `/guardian/chat` SSE 를 쓰지 않는다.
- 영냥이 팩이 부분 전달 뒤 복원되지 않는다.
- `retry.js` `hasRequestAccess` 공백이 있다.
- `MAX_FIX_RESUMES=0` 이라 죽은 경로가 남는다.
- `content-assets.md:9` 가 낡았다.

## 로드맵

2. 연이 상담 UI:
   - 프로필 카드 생성
   - 질문 입력
   - 결과(핵심 답변 → 요약 카드 → 근거 → 흐름 → 시기 → 행동 → 마무리)
   - 기록과 새로고침 복구
   - 스테이징에서 플래그 ON(vars 는 참조 문서 예외 절차)
3. 네오 상담 세계(별빛 전략실): 정보 위계와 모드 전환 때 결과 보존.
4. 운세별 에셋, 포즈, 로딩·빈 기록·오류 에셋.
5. 메인 히어로 보조 진입점("연이와 네오에게, 지금 가장 궁금한 한 가지" / "내 고민 상담하기")과 sitemap.
6. 결제 복귀·중복·복구 E2E(mock), 위 후속 1·3, 타로 통합, 구 guardian 경로 은퇴 판단, 실 LLM 품질 1회 검증(별도 승인).

## 다음 세션 첫 문장

> docs/handoff/fortune-chat-engine-unification-2026-10-01.md 를 읽고 2단계(연이 상담 UI를 /api/fortune-chat/consultations 에 연결)를 시작해 줘. 카드 결제 prepare 가드(후속 1)는 UI 에서 연 상담에 결제 버튼을 내지 않는 것으로 먼저 막아.
