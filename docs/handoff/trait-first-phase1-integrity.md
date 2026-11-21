---
status: done
updated: 2026-11-22
next: 이 문서는 종료. 이어지는 결정(게이트 C)은 trait-first-upgrade.md
---

# Trait-First Phase 1 — 결제→생성→전달 무결성 감사

- 앞 문서: [작업 지시서](trait-first-upgrade.md), [Phase 0](trait-first-phase0-report.md).
- 기준: 2026-11-22 main. 감사는 읽기 전용이었고 코드는 수정하지 않았다.
- 판정 표기: **실측**은 코드나 명령 출력으로 확인한 것, **추정**은 계산이나 판독만으로 판단한 것이다.
- 감사 방법:
  - paid-gate-auditor: 항목 1·2·7·9(결제)·11
  - regression-scout: 항목 3·4·5·6·10
  - Explore: 항목 8·9(앱)와 Phase 0에서 미확인으로 남은 서비스
  - F1(카르마 환불)과 P0 두 건(어조 충돌, 계획 버전 비교)은 메인 세션에서 코드로 다시 확인했다.

## 결론

1. **Trait-First 1차는 결제 실행 파일을 고치지 않아도 된다**(PortOne·이니시스·`payments.js`·`worker/payments/*`). 결제 동결 매니페스트에는 6종 라우트와 프롬프트가 하나도 없다(키워드로 실측). 커밋 전에 `verify-payment-freeze`를 검사 모드로 돌려 확정한다.
2. 단, **"블록 하나 덧붙이기"로는 안전하지 않다.** 다음 P0 두 건을 설계에 반영해야 한다.
   - **P0-1 어조 충돌.** 지시서 6-2의 해요체·단정체 규칙이 각 서비스에 이미 있는 어조 검증기와 부딪친다.

     | 서비스 | 기존 규칙·검증기 |
     |---|---|
     | 카르마 | 격식체. REGISTER_DRIFT(`karma-destiny-ai.js:1403-1423`) |
     | 흑월 | 세 화자 레지스터 검증(`heukwol-report.js:199-232`) |
     | 마스터 인연의 서 | "존댓말·차분·**단정 금지**"(`master-love-codex-prompt.mjs:15`, 실측) + REGISTER_DRIFT(`master-love-codex-quality.js:451-460`). 장당 시도가 4회를 넘으면 책 전체가 실패하고 자동 환불된다 |

     이대로 넣으면 재시도, 문장 삭제, 환불이 늘어난다.
   - **P0-2 계획 버전 동등 비교.** 장 계획 버전을 3으로 올리면 진행 중인 V2 문서가 V1(옛 장 목록)으로 해석되고, 재개할 때 완성 판정이 깨진다.

     | 서비스 | 비교 코드(실측) |
     |---|---|
     | 카르마 | `karmaPlanVersion`·`karmaChaptersForPlan`(`karma-destiny-ai.js:449-455`) |
     | 마스터 인연의 서 | `master-love-codex.js:1030` `=== 2` |
     | 흑월 | `heukwol.js:24` `isV2` |
3. 프롬프트·검증 verify는 전부 통과했다(실측).

   | 명령 | 결과 |
   |---|---|
   | `npm run verify:billing-pass-policy` | PASS |
   | `npm run verify:checkout-pass-card` | PASS |
   | `node scripts/verify-paid-llm-delivery-contract.mjs` | exit 0. 계약 37, LLM 판매 키 82, 변이 탐지 37/37, 다시 시도 우선 25·대기 12 |
4. 이번 변경과 무관하게 **이미 있는 결함 F1**을 확인했다(아래). 카르마를 카드나 월정석으로 결제한 사용자는 최종 실패 시 환불받지 못할 가능성이 있다.

## 1차 6종 × 항목 매트릭스

| 서비스 | 1 권한→생성 1회 | 2 차감↔실패 | 3 토큰·시간(추정) | 4 파싱·거부 | 5 저장 호환 | 6 진행 중 문서 | 7 LLM 장애 | 10 후속 |
|---|---|---|---|---|---|---|---|---|
| 신년운세 `nature` | PASS: (userId, idempotencyKey) 유니크 `new-year-ai.js:2965-2975`, lockToken CAS `:2977-2992` | PASS: `settleFailedConsultationRefund` `:3050-3061` | PASS: 최악 13050/14250tok, 약 33s/52s | PASS(낮음). 텍스트, 잘림은 재작성 `:2040-2062` | PASS: 캐시는 해시로 분리, 재열람은 원본 | PASS: `>=2` 판정 `:284` | PASS: partial+503 `:3032` | 해당 없음 |
| 연애 비책 `nature` | PASS: 전달 lease | PASS: `restoreBillingGateAccessOnFailure` `love-secret-ai.js:1285-1340` | **위험**: 최악 15750 > 15000tok, 54s+4s 하드 레이스 | **위험**: JSON, 완성 판정 `item.title === section.title`(`:797`). 소제목을 바꾸면 FAIL | PASS(조건부): V1 sha256 고정 테스트 | PASS: `>=2` `:368` | PASS | 성향이 이어지지 않음(근거 블록 미저장, 메시지당 2400자 `:563`) |
| 카르마 `chapter-00` | PASS: lockToken `:2990` | **FAIL(F1)** | PASS: 최악 약 6900/8438tok | **위험(높음)**: P0-1 격식체 | PASS | **P0-2** | 위험: 정체 시 경보만(STUCK_SETTLE_GAP) | 이어지지 않음(메시지당 1400자 `:1248`) |
| 흑월 `temperament` | PASS: executionKey + lock CAS `heukwol.js:104-158`, `:318-353` | PASS: `forceRefundOnClose` | PASS: 입력 상한은 `heukwol-basis-quality.test.js:39-56` | **위험(높음)**: P0-1 세 화자 | **위험**: 캐시 키에 버전 없음. PREFIX(`heukwol-report.js:124-141`) 바이트가 접두사 캐시와 27장 공용 | **P0-2** | PASS: 일시 오류 따로 집계 | 해당 없음 |
| 인생의 책 1장 | PASS: 락 `life-book-ai.js:2803-2854` | PASS: `:2912` | **위험**: 최악 약 10.7k > 10000tok | **위험**: FORBIDDEN(`:102`)에 "시스템"·"AI" → 블록 설명이 반향되면 문장 삭제 | **위험**: `buildSectionPrompt`(`:1477`)를 인생 총운과 공유. sha256 고정(sections.test `:601-611`) | 위험(낮음): 계획은 `llmMeta.plan`에 저장, 장 사이 어조가 섞여도 완성 판정 통과 | PASS | 해당 없음 |
| 마스터 인연의 서 `gate` | PASS: `acquireBatchLock` `master-love-codex.js:1364`, 서버 bootstrap | PASS: 환불 5종 | PASS: 최악 약 6.7k/8000tok | **위험(높음)**: P0-1 "단정 금지" + 시도 4회 상한 | **위험**: snapshotKey(`:1719`)에 `CODEX_EVIDENCE_VERSION`. 올리면 진행 중 스냅샷이 버려짐 | **P0-2** | PASS: `withDeadline` `:591` | 해당 없음 |

- 항목 9(앱): Google Play는 `app-store.js:974`에서 Payment를 만들고, 웹과 같은 `resolveBillingGateAccess` 증빙으로 합류한다. 토스 IAP는 `purchases.js:30-33`에서 PaidExecutionRecord로 합류한다. Android는 `dist`와 같은 `/api`를 쓴다. 토스 상담 결과는 서버 manifest 순서를 따른다(`apps/toss/src/App.tsx:71`, `:298`).
  - **예외**: 토스 사주 원국 풀이는 앱 전용 고정 순서를 쓴다(`apps/toss/src/natal-report.ts:1`). 2차 변경 때 함께 고쳐야 한다.
- 항목 6: 큐는 없다. "진행 중인 실행 문서의 장 계획 호환"으로 읽었다.
- 후속 질문: `expert-follow-up-delivery` 사용처는 카르마(`:3224`)와 연애 비책(`:2130`) 둘뿐이다. Phase 0 보고서의 "네오 포함"은 정정한다.

## 이미 있는 결함·위험 (Trait-First와 별개의 RED 후속)

| ID | 등급 | 내용 | 근거 | 수정안 |
|---|---|---|---|---|
| **F1** | P1 FAIL(코드 판독, 메인 재확인) | 카르마 정산 `settleKarmaRetryRefund`가 하는 일은 이용권 환불·사용 확정 전 차감분 취소·`releaseRequestBillingEvidence`뿐이다. **PG 카드 취소와 월정석 복원 호출이 없는데** `refundStatus: "not_required"`로 정산을 닫는다. 계약 refunds도 `refundPassUseEvidence` 하나다. 증빙 해제가 재사용 권리로 이어지는지는 재현하지 않았다 | `worker/routes/karma-destiny-ai.js:3312-3339`, `consultation-recovery-registry.js:53`, `__tests__/worker/karma-paid-delivery.test.js:267-291`(pass·deferred만) | 먼저 카드·월정석 모드 재현 테스트를 만든다. FAIL이 확정되면 공통 `settleFailedConsultationRefund`로 합류한다. 결제 정산 변경이라 RED |
| R1 | P1 위험(추정) | 결제 후 `/start`를 한 번도 부르지 않은 단건(창 닫힘, resume 7일 경과)은 경보도 환불도 없다. 대사는 `purchaseGrantVersion=1`이면 fulfilled로 본다 | `worker/payments/reconcile.js` | 권한은 있는데 실행 기록이나 결과가 없는 상태로 N일이 지나면 경보를 띄운다. **결제 실행 파일**이라 별도 결제 게이트 |
| R2 | P2 위험(추정) | 결과 실패 보고 시 자동 취소의 status 허용 목록에 V2 "paid"가 없을 수 있다 | `worker/routes/payments.js:2786-2850` | 실제 status로 재현한 뒤 판단한다. **결제 실행 파일, 동결 대상** |
| S3·S4 | P2(정책·코드 충돌, 기존) | 진입 `/ensure-access` 서버 선검사(신년운세·카르마·점성술·베다·낙샤트라). codex는 진입 때 이용권을 차감하고, 증빙 없는 `/start`도 묵시적으로 이용권을 차감한다 | `new-year-ai.js:2536-2600`, `master-love-codex.js:1127-1259` | 허용된 예외인지 정책 확인이 먼저다. 보고만 한다 |
| C1 | P1(CI 배선, 실측) | `paid-flow-gates.yml` 트리거 `worker/routes/*-ai.js`가 `heukwol.js`와 `master-love-codex.js`를 잡지 못한다 | `.github/workflows/paid-flow-gates.yml:14`, `:220` | 두 라우트를 트리거에 명시한다(CI 변경, RED) |
| C2 | 위험(실측) | `change-risk`가 6종 라우트를 high로만 분류한다. deep 아님 | `scripts/lib/change-risk.mjs` | 정산 함수가 있는 라우트는 deep 승격을 검토한다 |
| G | 기존 갭 | 자동 환불 구멍 13종(운세 채팅 질문, 서술형 10종, 토스 네이티브, 손금), 정체 시 경보만 하는 12종 | `scripts/verify-paid-llm-delivery-contract.mjs:59-71` | 검증기가 목록으로 관리 중이다. 이번 범위 밖 |

## 항목 8 — 고아 주문 탐지

**"결제 완료인데 결과 문서가 없는" 주문을 전 서비스에 걸쳐 잡는 장치는 없다**(실측). 기존 장치는 셋 중 하나에 머문다.
- 이미 만들어진 문서만 본다: `paid-delivery-stuck.js`, `report-consultation-delivery-health.mjs`
- 권한 지급만 본다: `reconcile.js`, ops-hq `?queue=undelivered`. 0원 주문(이용권·월정석)은 제외한다
- 서비스 1~2종만 본다: `audit-paid-consultation-delivery.mjs`는 신년운세·인생의 책만, `audit-yeongnyangi-paid-without-result.mjs`는 영냥이만

스테이징 크론은 `crons = []`이다(`wrangler.staging.toml:365`).

기존 읽기 전용 스크립트(`--db code_destiny|code_destiny_staging`, `MONGO_URI`, fetch 차단):
- `node scripts/report-consultation-delivery-health.mjs --db <db> --days 30`
- `node scripts/report-paid-delivery-health.mjs --db <db> --days 30`
- `node scripts/audit-paid-consultation-delivery.mjs --db <db>`
- `node scripts/audit-yeongnyangi-paid-without-result.mjs --db <db> --json --stuck-hours 24`

쓰지 않을 스크립트:
- `audit-paid-order-delivery.mjs`: PortOne GET을 호출하고 비밀값이 필요하다.
- `recover-paid-consultation.mjs`: `--apply` 옵션이 있다.

**새 읽기 전용 스크립트 제안**(`scripts/audit-paid-orphans.mjs`, Phase 4 대상):
- payments에서 paid·success·fulfilled이면서 미환불인 주문을 featureKey별 결과 컬렉션과 대조한다(userId + idempotencyKey·requestId·paymentId).
- PaidExecutionRecord `paid_pending_generation`, ServiceExecutionTransaction `pending`·`adminReviewRequired`를 이용권·월정석 원장과 대조한다.
- TossPurchase가 PURCHASED인데 결과가 없는 건을 찾는다.
- 손금 `palm-reading-general` 건을 따로 본다.

**운영 실행 여부는 아래 결정 요청 4번이다.**

**스테이징 실행 결과**(2026-11-22, `--db code_destiny_staging`, 읽기 전용). 스테이징 행은 대부분 테스트 데이터다.

| 스크립트 | 범위 | 결과 |
|---|---|---|
| report-paid-delivery-health | 30일 | 전부 0 |
| report-consultation-delivery-health | 90일 | 네오 generation_failed 1 · PaidExecutionRecord paid_pending_generation 2 · FortuneTeaHouseResult generation_failed 3 |
| audit-paid-consultation-delivery | 전체 | 0 |
| audit-yeongnyangi-paid-without-result | 24시간 초과 | 1건(가장 오래된 것 2026-09-23T23:01:54Z) |
| audit-paid-orphans(신규) | 365일 | 단건 결제 17건 중 전달 확인 3, 근거 못 찾음 14(궁합 숙요 5·찻집 4·영냥이 3·인연의 서 2) · PaidExecutionRecord paid_pending_generation 2(vedic_prashna_prompt, 2026-09-07) · 거래 대기 0 · 토스 0 · 손금 0 |

### 운영 DB 읽기 전용 집계 (2026-11-22, 네오 "승인할께" 1회 승인)

쓰기 0, HTTP 차단, 해시 참조만. `node scripts/audit-paid-orphans.mjs --db code_destiny --days 365`, `node scripts/audit-yeongnyangi-paid-without-result.mjs --db code_destiny --json`.

| 항목 | 결과 |
|---|---|
| 스캔 | payments 143 · executions 49 · transactions 22 · 결과 93 · 토스 0 |
| 미전달(결과 문서 partial 등) — 수동 확인 대상 | fusion-fortune-consultation 2(756a1430e24c·291a1da67f47, 10-14) · destiny-compass-future-sim 1(7c986fced41e, 거래 generating, 10-14) · human-design-report 2(42c29352eafd 10-17, 15d7a355b006 10-29) · new-year-ai-consultation 1(70ddbcfa109e partial, 11-05) |
| 근거 못 찾음(영냥이 제외) | 궁합 2 · 찻집 사주 1 · 찻집 joint 1 · 운세 채팅 1 · 타로 연애 1 |
| 영냥이 근거 못 찾음 99 | 이 스크립트 조인 범위 밖(`yeongnyangi_requests`). 전용 스크립트: 결제 114 · 완료 101 · 정체 후보 0 · 지금 검토 필요 0 · review_required 8(SYSTEM_RECOVERY_EXHAUSTED 등, 최신 11-18) |
| 정체 실행 원장 | paid_pending_generation 1(vedic_prashna_prompt, 09-06) |
| 정체 거래 | 3 — human-design-report generating 2(10-17·10-29), vedic_ai_prompt_generator generating 1(11-10) |
| 토스·손금 | 0 · 0 |

판단: partial 은 "미완성 본문 보존 + 다시 시도 가능" 상태라 결과가 사라진 것은 아니지만, 고객이 완성본을 못 받은 단서다. 처리(재생성·환불)는 운영 DB 쓰기라 별도 RED 승인 대상이다. 후속: audit-paid-orphans 에 영냥이 요청 조인 추가, 찻집·궁합·운세 채팅·타로 연결 키 확인.

"근거 못 찾음"은 미제공의 증거가 아니다. 숙요 궁합·찻집·영냥이는 결과 연결 키가 달라 이 스크립트의 조인 범위 밖일 수 있다(영냥이는 전용 스크립트가 맡는다). 운영 실행 시 이 14건 유형부터 서비스별 연결 키를 확인한다.

## 미확인 서비스 확정 (Phase 0 보완)

| 서비스 | 판정 | 근거 |
|---|---|---|
| 운명의 섬 | 판매 종료, LLM 없음(410 ISLAND_NOW_FREE) | `paid-feature-registry.js:382-384`, `ziwei-island-ai.js:128` |
| Love Code | 판매 중, **LLM 없음** | `paid-feature-registry.js:370`, `light-fortune-catalog.js:89` |
| Secret House | 29,000원 묶음, **LLM 없음**(결정적) | `worker/lib/saju-section/secret-house.js:1-6` |
| 운세 채팅 질문(물고기 4종) | 판매 중, 영냥이 파이프라인. 첫 섹션은 이미 `nature` "나를 움직이는 기질"(v5) | `reading-manifest.ts:83-84`, 갭 `registry:60` |
| 영냥이 유료 | 첫 섹션이 이미 기질 계열: `nature`, single은 `self` "타고난 기질과 오행의 균형" | `reading-manifest.ts:16`, `:145`, `:151` |
| 손금 | 판매 중, Gemini Vision. 이미 "■ 타고난 성향"이 둘째 블록. 결제 전에 생성하고, 자동 환불 없음 | `palm-vision.js:699-700`, `palm.js:572` |
| 토스 네이티브 | 웹 라우트를 그대로 import, 환불 API 없음 | `native-palm.js:4`, `registry:73-75` |
| 천상의 조화 | 첫 파트는 카드 1번 해설 | `celestial-report-delivery.js:7-14` |

## 설계 반영 (Phase 2·3 제약, 게이트 B 승인 대상)

1. **근거 블록과 어조를 분리한다.**
   - 공통 조각: 한국어 라벨의 근거 블록만 둔다(태그·키를 인용하지 말라는 규칙 포함).
   - 어조: 서비스별 기존 화자 규칙을 따른다.
   - 지시서 6-2의 해요체 예시와 "금지 표현" 목록은 서비스 어조로 번역해 넣고, 기존 어조 검증기는 건드리지 않는다.
2. **계획 버전·장 키·`REPORT_SCHEMA_VERSION`·`CODEX_EVIDENCE_VERSION`·keyExtra를 올리지 않는다.** 프롬프트만 바꾼다.
   - 캐시는 프롬프트 해시로 자동 분리된다(`lib/llm-cache.ts:66-82`).
   - 결과 메타에 `traitFirst: 'v1'`만 기록한다(지시서 6-3의 "캐시 키에 버전 기록"은 하지 않는다).
3. **첫 섹션 분량을 늘리지 않는다**(연애 비책·인생의 책은 토큰 여유가 부족하다). 성향은 기존 분량 안에서 밀도로 올린다.
4. **새 거부 조건을 만들지 않는다.** 지시서 6-4의 검증기는 shadow(기록만)로 시작하고, 실패하면 기존 정리 단계에 결정적 교정만 더한다. "성향 섹션만 재생성"(6-4 a)은 1차에서 만들지 않는다.
5. 서비스별 주입 위치:
   - 흑월: PREFIX가 아니라 `temperament` 장 접미부
   - 인생의 책: `lifeFortune` 분기로 인생 총운을 제외
   - 연애 비책: 소제목 고정
   - 공통: sha256 고정 테스트(V1)는 바뀌지 않아야 한다. 새 세션의 현행 계획과 플래그가 켜진 경우에만 주입한다.
6. 플래그: `withEngineRollout` 코드 기본값 off(`TRAIT_FIRST_SAJU`). 6종은 모두 사주 기반이다.
7. 후속 질문(카르마·연애 비책) 성향 연결은 2차로 미룬다(약 300~500자 요약, 상한 여유 있음, 추정).

## 결정 요청 (게이트 B)

1. **1차 설계 제약 1~7을 승인할지.** 추천: 승인. P0 두 건을 피하면서 결제·완성 판정을 건드리지 않는 유일한 경로다.
2. **마스터 인연의 서**: 화자 규칙 "단정 금지"와 Trait-First "확신 어조"가 정면으로 충돌한다. 추천: 1차에서는 이 서비스만 **근거 주입만** 하고 어조는 기존 규칙을 유지한다. "사실 근거 단정 허용, 미래 예언 금지"로 규칙을 바꾸는 것은 별도로 결정한다.
3. **F1(카르마 카드·월정석 환불)**: 추천: Trait-First와 분리한 RED 후속으로 바로 다룬다. 순서는 재현 테스트 → 공통 환불 함수 합류다. 결제 정산 코드이므로 시작 전에 승인을 받는다.
4. **운영 DB 읽기 전용 고아 주문 집계**: 추천: 먼저 스테이징 DB에서 기존 스크립트 4종을 돌린다. 운영은 새 스크립트(`audit-paid-orphans.mjs`)를 만든 뒤 1회 승인을 받고 실행한다.
5. **R1·R2·C1**: 추천: 결제 실행 파일과 CI 변경이므로 각각 별도 RED로 보고만 하고 이번 작업에서는 수정하지 않는다. C1(트리거 2줄)은 위험이 낮으니 F1과 함께 처리해도 된다.

## 단계

- [x] 감사 3갈래 + 메인 재확인
- [x] 이 문서
- [x] 승인 게이트 B — 2026-11-22 네오 원문 "권장안으로 진행해주고 결제 이후에는 반드시 제공되어야하므로 이 부분에서 회귀가 없도록 작업을 진행해줘". 결정 요청 5건 모두 추천안 확정: (1) 설계 제약 1~7 승인 (2) 마스터 인연의 서는 근거 주입만, 어조 기존 유지 (3) F1 은 별도 RED 로 재현 테스트 → 공용 환불 합류(결제 정산 승인 포함) (4) 스테이징 DB 기존 스크립트 4종 먼저, 운영은 audit-paid-orphans.mjs 작성 뒤 1회 승인 (5) R1·R2 보고만, C1 은 F1 과 함께
- [x] Phase 2: `worker/lib/trait-profile/` 추출기(순수 함수) + KB(기존 자산 우선) + 단위 테스트(지시서 5-4)
- [x] F1(카르마 현금·월정석 다시 시도 환불) · C1(paid-flow-gates 트리거) · 스테이징 DB 읽기 전용 5종
- [x] Phase 3: 6종 주입(카르마·신년운세·인생의 책·연애 비책·흑월·마스터 인연의 서), 플래그 TRAIT_FIRST_SAJU 기본 off
- [x] Phase 4: `scripts/audit-paid-orphans.mjs` + `__tests__/ui/paid-orphans-audit.test.mjs`, 스테이징 실행
- [x] Phase 5: 골든셋 — 2026-11-22 네오 "승인할께"(1회, 12호출), 결과 `docs/handoff/trait-first-phase5-verification.md`
- [x] 운영 DB 고아 집계 — 2026-11-22 네오 "승인할께"(1회), 결과는 항목 8 표
