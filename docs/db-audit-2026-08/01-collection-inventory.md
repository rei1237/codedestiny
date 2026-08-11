# ① 현재 MongoDB collection 구조

> 실측: `code_destiny`, 컬렉션 67개 / 문서 26,128건 / 등록 모델 48개 (2026-08-12)
> 원자료: [raw/collections.json](raw/collections.json)

"최근생성" 열은 `_id` 역순 1건의 ObjectId 타임스탬프다. **최근 수정 시각이 아니다** — 기존 문서만 갱신되는 컬렉션(`users` 등)은 실제보다 오래돼 보인다.

## A. ACTIVE — 현재 서비스가 읽고 쓴다

| 컬렉션 | 문서 | idx | TTL | 모델 | 최근생성 | 비고 |
|---|---:|---:|:--:|---|---|---|
| `users` | 245 | 9 | | User | 2026-08-08 | 회원 정본. [02](02-users-fields.md) 참조 |
| `pointhistories` | **19,524** | 9 | | PointHistory | 2026-08-11 | 최대 컬렉션. 현재는 잔액이 아니라 **증빙·멱등 원장**으로 쓰인다 |
| `content_entitlements` | 1,384 | 18 | | ContentEntitlement | 2026-08-09 | 영구해금/프로필 스코프 권한 |
| `security_events` | 3,301 | 10 | | SecurityEvent | 2026-08-10 | |
| `checkout_funnel_events` | 545 | 1 | | CheckoutFunnelEvent | 2026-08-11 | 스키마상 90일 TTL 선언, **실제 TTL 인덱스 없음** |
| `monthly_credit_ledger` | 368 | 8 | | MonthlyCreditLedger | 2026-08-11 | 월정석 원장 |
| `payments` | 233 | 16 | | Payment | 2026-08-11 | PG 결제 정본 |
| `payment_webhook_events` | 96 | 7 | | PaymentWebhookEvent | 2026-08-11 | |
| `refresh_tokens` | 78 | 6 | ✅ | RefreshTokenSession | 2026-08-11 | 토큰 해시만 저장 |
| `profilecards` | 67 | 4 | | ProfileCard | 2026-08-10 | |
| `paid_execution_records` | 30 | 14 | | PaidExecutionRecord | 2026-08-10 | 회당결제 영수증 |
| `neoOperationRoomConsultations` | 25 | 11 | | NeoOperationRoomConsultation | 2026-07-12 | |
| `paymentfailurelogs` | 24 | 7 | | PaymentFailureLog | 2026-08-11 | 관리자 환불 감사 흔적이 여기 섞여 있다 |
| `user_daily_quest_logs` | 18 | 8 | | UserDailyQuestLog | 2026-08-10 | |
| `user_rpg_progresses` | 18 | 7 | | UserRpgProgress | 2026-08-10 | |
| `llm_response_cache` | 11 | 3 | ✅ | LlmResponseCache | 2026-08-09 | |
| `astrologyAiConsultations` | 9 | 7 | | AstrologyAiConsultation | 2026-07-08 | |
| `fortuneChatSessions` | 9 | 3 | | FortuneChatSession | 2026-08-09 | |
| `guardianFortuneAnonymousMerges` | 7 | 2 | | GuardianFortuneAnonymousMerge | 2026-08-09 | |
| `user_rpg_reward_logs` | 7 | 7 | | UserRpgRewardLog | 2026-08-10 | |
| `lifeBookAiConsultations` | 4 | 10 | | LifeBookAiConsultation | 2026-07-07 | |
| `serviceexecutiontransactions` | 4 | 29 | ✅ | ServiceExecutionTransaction | 2026-07-19 | |
| `sukuyoCompatibilityAiConsultations` | 4 | 5 | | SukuyoCompatibilityAiConsultation | 2026-07-11 | |
| `ziweiAiConsultations` | 4 | 10 | | ZiweiAiConsultation | 2026-07-31 | |
| `guardianFortuneGuestUsages` | 3 | 2 | | GuardianFortuneGuestUsage | 2026-08-09 | 비로그인 무료 1회 |
| `guardianFortuneAccountUsages` | 2 | 2 | | GuardianFortuneAccountUsage | 2026-08-09 | 로그인 무료 3회(평생) |
| `karmaDestinyAiConsultations` | 2 | 13 | | KarmaDestinyAiConsultation | 2026-07-07 | |
| `dailyfortunesubscriptions` | 2 | 4 | | DailyFortuneSubscription | 2026-07-25 | |
| `cmsentries` / `cmsrevisions` | 1 / 1 | 1 / 1 | | CmsEntry / CmsRevision | 2026-07-30 | |
| `feedbacks` | 1 | 7 | | Feedback | 2026-07-31 | |
| `insights` | 1 | 7 | | Insight | 2026-05-09 | |
| `masterLoveCodexSessions` | 1 | 1 | | MasterLoveCodexSession | 2026-08-01 | |
| `nakshatraAiConsultations` | 1 | 1 | | NakshatraAiConsultation | 2026-08-01 | |
| `newYearAiConsultations` | 1 | 11 | | NewYearAiConsultation | 2026-06-27 | |
| `vedicAiConsultations` | 1 | 11 | | VedicAiConsultation | 2026-06-27 | |

**빈 상태이지만 ACTIVE (코드가 쓰기 경로를 갖고 있음, 아직 데이터가 없을 뿐)**
`abuse_scores`(TTL) · `app_purchase_intents`(TTL) · `idempotency_keys`(TTL) · `contentoverrides` · `destinybiascards` · `destinyCompassReports` · `fusionFortuneGenerationAttempts`(TTL) · `guardianFortuneDailyUsages` · `guardianFortuneGenerationAttempts`(TTL) · `guardianFortuneSharedSnapshots` · `loveSecretAiConsultations` · `reviews` · `daehan_purchases`(모델 없음, `worker/routes/ziwei-daehan.js:32,52`) · `debug_runtime_checks`(모델 없음, `worker/routes/debug.js:75`)

## B. DO_NOT_DELETE — 결제·권리·법적 보존

다른 분류보다 우선한다. **감사 결과와 무관하게 이번·차기 정리 대상에서 전부 제외한다.**

| 컬렉션 | 문서 | 사유 |
|---|---:|---|
| `payments` | 233 | 결제·환불 원본(`rawPortOne` 포함). 전자상거래법상 거래기록 보존 |
| `pointhistories` | 19,524 | 결제 증빙 겸 멱등 원장. `worker/routes/fortune.js:2042-2074` 가 여기서 영구해금을 역추론한다 |
| `monthly_credit_ledger` | 368 | 월정석 지급/차감 원장. `{userId,type,sourceId}` unique 가 곧 멱등키 |
| `content_entitlements` | 1,384 | 사용자가 구매한 해금 권한 그 자체 |
| `paid_execution_records` | 30 | 회당결제 영수증 |
| `payment_webhook_events` | 96 | PG 웹훅 원본(재처리·분쟁 대응) |
| `paymentfailurelogs` | 24 | 실패·관리자 환불 감사 흔적 |
| `serviceexecutiontransactions` | 4 | 보상(환불) 상태 기계 |
| `deleted_account_logs` | 1 | 탈퇴 감사 로그 |
| `users` | 245 | 회원 식별 정본 |

## C. LEGACY / POTENTIALLY_UNUSED — 모델 없는 19개

`git grep` 으로 `worker/ app/ lib/ js/ src/ components/ server/ scripts/` 전체를 확인한 결과다.

### C-1. 코드 참조 **0건** + 데이터 잔존 → `POTENTIALLY_UNUSED`

| 컬렉션 | 문서 | 최근생성 | 판단 |
|---|---:|---|---|
| `premium_report_jobs` | 27 | 2026-06-02 | 구 프리미엄 리포트 잡 큐. 참조 0건 |
| `fortune_tea_house_honey_ledgers` | 19 | - | ⚠️ **이름이 다른 활성 컬렉션과 헷갈린다** — `worker/routes/fortune-tea-house.js:3757` 가 쓰는 이름과 동일하다. 아래 주의 참조 |
| `premiumpdfreports` | 7 | 2026-05-28 | 구 PDF 리포트 저장소. 참조 0건 |
| `fortune_tea_honey_reward_logs` | 2 | - | `fortune_tea_house_*` 와 **다른 이름**. 참조 0건 |
| `honeysubscriptions` | 2 | 2026-05-15 | 구 허니 구독. 참조 0건 |
| `fortune_tea_honey_states` | 1 | 2026-06-29 | 참조 0건 |
| `translationusages` | 1 | 2026-03-18 | 참조 0건. 최근생성이 5개월 전으로 전체 최고령 |
| `oauthHandoffCache` | 1 | - | 참조 0건 |

> ⚠️ **주의 — `fortune_tea_house_honey_ledgers` / `_wallets` / `_results` 는 "모델 없음"이지 "미사용"이 아니다.** `worker/routes/fortune-tea-house.js:3756-3758` 이 raw 드라이버로 직접 쓴다. 모델 레지스트리 대조만으로 고아 판정하면 안 되는 대표 사례다. 위 표에서 `_ledgers` 만 문서가 있고 나머지(`_wallets` 2건, `_results` 33건)는 ACTIVE 로 분류했다. **셋 다 `ACTIVE`로 취급한다.**

### C-2. 코드 참조 0건 + 문서 0건 → `POTENTIALLY_UNUSED` (제거 비용 최소)

`translationcaches` · `honeysubscriptiontransactions` · `membershipcontentaccessconsents` · `fusionFortuneDailyLimits` · `premium_runtime_store`(TTL 인덱스만 존재)

### C-3. `adminauditlogs` — 0건 → `LEGACY`

모델은 `server/models/AdminAuditLog.js` 에만 있고, 쓰는 코드는 배포되지 않는 레거시 Express(`server/routes/admin.routes.js`)뿐이다. **문서가 0건이라는 것은 프로덕션에서 관리자 감사 로그가 단 한 번도 기록된 적이 없다는 뜻이다.** 컬렉션을 지울 게 아니라 **라이브 Worker 가 여기에 쓰도록 만들어야 한다** → [03](03-target-model-and-admin.md#감사-로그).

## D. 코드 ↔ DB 이름 드리프트 (실측 판정)

코드 분석 단계에서 의심했던 컬렉션명 드리프트를 실측으로 판정했다.

| 의심 | 실측 | 판정 |
|---|---|---|
| `pointhistories` (런타임) vs `point_histories` (`scripts/migrate-withdraw-indexes.mjs:148`) | `pointhistories` 만 존재. `point_histories` **없음** | ✅ 드리프트는 실재하지만 **아직 발현 안 됨** — 해당 마이그레이션이 프로덕션에서 실행된 적이 없다 |
| `fortuneviewlogs` (`worker/routes/auth.js:3725`) vs `fortune_view_logs` (마이그레이션) | **둘 다 없음** | ✅ 탈퇴 시 `fortuneviewlogs` 익명화는 존재하지 않는 컬렉션에 대한 no-op |
| `refresh_tokens` (worker) vs `refreshtokensessions` (`server/models/`) | `refresh_tokens` 만 존재 | ✅ 레거시 Express 가 프로덕션에서 안 돈다는 방증 |
| `deleted_account_logs` 인덱스 | 인덱스 **1개**(`_id` 뿐) | 🔴 `migrate-withdraw-indexes.mjs` 의 5년 TTL(`ttl_withdrawn_5yr`)·`idx_email_hash_withdrawn` **미생성** |

> **결론**: `scripts/migrate-withdraw-indexes.mjs` 는 **프로덕션에서 한 번도 실행되지 않았다.** 실행하면 존재하지 않는 `point_histories`·`fortune_view_logs` 두 컬렉션을 새로 만들어 버리므로, 실행 전에 컬렉션명을 런타임 코드(`pointhistories`, 그리고 `fortuneviewlogs` 는 아예 삭제)와 맞춰야 한다. **지금 상태로 실행하지 말 것.**

## E. 인덱스 — 선언 72개가 실재하지 않는다

`worker/lib/db.js:507` 이 `autoIndex: false` 로 연결하므로 스키마의 `.index()` 선언은 프로덕션에 자동 반영되지 않는다. `scripts/migrations/*.mjs` 를 실행해야만 생긴다.

**의미 있는 결손 (성능·정합성에 실제 영향)**

| 컬렉션 | 인덱스 | 영향 |
|---|---|---|
| `content_entitlements` | `permanent_unlock_identity` (unique, partial) | 영구해금 중복 방지 장치 부재. `worker/payments/entitlements.js:8-16` 이 이미 이 부재를 전제로 우회 구현 중 |
| `pointhistories` | `user_kind_feature_lookup` (19,524건 대상) | 영구해금 역추론 조회가 매번 스캔. **최대 컬렉션이라 체감 영향이 가장 크다** |
| `checkout_funnel_events` | `createdAt` TTL 90일 | 자동 삭제가 안 돌아 545건이 무기한 누적 중 |
| `guardianFortuneSharedSnapshots` | `expiresAt` TTL | 현재 0건이라 무해하나, 쓰기 시작하면 누적 |
| `cmsentries` | `{namespace,key,locale}` unique | 중복 CMS 레코드 방지 부재 |
| `reviews` | `user_product_unique_nonadmin` 외 9개 | 현재 0건 |

**노이즈 (스키마 필드의 `index:true` 선언이 미생성된 것)** — `masterLoveCodexSessions` 12개, `nakshatraAiConsultations` 8개, `guardianFortune*` 다수 등. 대부분 문서 0~1건 컬렉션이라 실질 영향이 없다. 전체 72개 목록은 [raw/collections.json](raw/collections.json) `summary.missingIndexes` 참조.

> 이번 감사에서는 **인덱스를 생성하지 않았다.** 어떤 인덱스를 실제로 만들지는 [03 ⑨ 필요한 index](03-target-model-and-admin.md#-필요한-index) 에서 쿼리 패턴 기준으로 좁혔다.

## F. TTL 인덱스 실재 현황

실제로 존재하는 TTL: `refresh_tokens` · `idempotency_keys` · `abuse_scores` · `llm_response_cache` · `serviceexecutiontransactions` · `app_purchase_intents` · `fusionFortuneGenerationAttempts` · `guardianFortuneGenerationAttempts` · `premium_runtime_store`(모델 없는 컬렉션인데 TTL만 남음)

**선언됐지만 없는 TTL**: `checkout_funnel_events`(90일) · `guardianFortuneSharedSnapshots` · `deleted_account_logs`(5년) · `payments._anonymizedAt`(5년)
