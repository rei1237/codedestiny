# 개인정보 보안 개선 초안·설계안 — 2026-11-26

상태: **초안. 적용하지 않았다.** 이 문서의 문구·표·diff 는 모두 사용자(및 필요한 경우 법률) 검토 전이다. 서비스 코드·UI·개인정보처리방침 페이지·결제 파일·스키마는 바꾸지 않았다.
기준: 워크트리 `wt/privacy-hardening-20261126-052931`, 기준 커밋 c0032c8670. 진단 근거는 Phase 1 감사 보고서(루트 체크아웃의 미추적 파일, 커밋하지 않음)의 PRIV 번호를 따른다.
승인 범위(2026-11-26): PRIV-005·004 문구, PRIV-001 탈퇴 파기 설계, PRIV-007/010/011/012/015/021 설계, PRIV-002 결제·선물과 PRIV-018 은 **diff 초안만**. 적용·운영 반영은 별도 승인.

---

## 단계 8-A. PRIV-005 상대방(제3자) 정보 입력 고지 — 사용자·법률 검토 필요

### 문제
궁합·연애 상담은 상대방의 이름·생년월일·출생시간·성별(일부는 관계 설명)을 이용자가 대신 입력한다. 정보주체(상대방)의 동의를 받을 수 없는 구조이므로, 입력자에게 "제공 권한이 있는 정보만 입력"하도록 고지하고 처리 목적·보관을 밝히는 것이 최소 조치다. 현재 네오 상담(`app/neo-consultation/NeoConsultationClient.tsx:252`)만 유사 고지가 있다: "제공할 권한이 있는 정보만 입력해 주세요. 출생시간을 모르면 그에 따라 달라지는 해석은 제한됩니다."

### 문구 초안(한국어 원문)
- 제목(`privacyNotice.partner.title`): **상대방 정보 입력 전 확인해 주세요**
- 본문(`privacyNotice.partner.body`): 상대방의 이름·생년월일 등은 본인이 알려 주었거나 제공해도 된다고 동의한 범위에서만 입력해 주세요. 실명 대신 별칭을 써도 풀이에는 차이가 없습니다.
- 처리(`privacyNotice.partner.processing`): 입력한 정보는 이번 풀이를 만드는 데만 사용하며, 풀이 생성을 위해 AI 처리 위탁사(Google Gemini, 국외)에 전달될 수 있습니다.
- 보관(`privacyNotice.partner.retention`): 결과와 함께 내 보관함에 저장되며, 회원 탈퇴 시 처리방침에 따라 파기됩니다.
- 짧은 형(공간이 좁은 폼, `privacyNotice.partner.short`): 상대방이 동의한 정보만 입력해 주세요. 별칭을 써도 괜찮아요.

검토 포인트: (1) "별칭 사용 가능"이 실제 풀이 품질에 영향 없는지 — 프롬프트가 이름을 호칭으로만 쓰는지 확인 필요(PRIV-011 과 연결). (2) "회원 탈퇴 시 파기"는 PRIV-001 설계가 적용된 뒤에만 사실이 된다. 적용 전에는 이 문장을 넣지 않거나 "처리방침에 따라 보관·파기"로 완화한다. (3) 국외 이전 명시는 PRIV-004 처리방침 개정과 같은 시점에 반영한다.

### i18n 키·구현 방식
- 기존 장치: `lib/i18n/useT.ts` 의 `useTPick(namespace, sourceLocale)`(ko 는 원문을 쓰고 사전 조회를 건너뜀). 새 네임스페이스 `privacyNotice` 를 `i18n/authored/privacyNotice-NN.json` 으로 저작한다. 저작 로케일 en·ja·zh-CN·zh-TW, 나머지 7개 로케일은 영어 복사(기존 규칙).
- 공용 컴포넌트 1개(제안 위치 `app/components/PartnerInfoNotice.tsx`, `variant: "full" | "short"`)를 만들어 아래 폼에 넣는다. 새 UI 계층이 아니라 각 폼의 상대방 필드 묶음 바로 위 안내 문단 1개.
- 낙샤트라는 자체 copy 객체(`app/nakshatra/_lib/copy.ts`, 예: `compatPartnerLabel`)를 쓰므로 같은 키 이름으로 copy 항목을 추가하거나 공용 컴포넌트를 그대로 쓴다(구현 시 결정).

### 적용 대상 UI(실측 위치)
| 화면 | 파일 | 상대방 입력 위치 |
| --- | --- | --- |
| 프리미엄 사주 궁합 | `app/saju/compatibility/premium/PremiumPersonFields.tsx` (`SajuCompatPremiumClient.tsx:245` legend "상대") | full |
| 연애 비책 AI | `app/love-secret-ai/LoveSecretAiClient.tsx` PersonFields(2489/2501, 정의 2688) | full |
| 숙요 궁합 AI | `app/sukuyo-compatibility-ai/SukuyoCompatibilityAiClient.tsx` `renderPersonFields("b")`(2049) | full |
| 낙샤트라 궁합 | `app/nakshatra/compat/NakshatraCompatClient.tsx` Person b(214) | full |
| 마스터 러브 코덱스 | `src/features/master-love-codex/components/CodexConsultationForm.tsx` (모델 `partnerInfo`) | full |
| 영냥이 상담 상대 프로필 | `app/yeongnyangi/_components/Consultation.tsx` | short |
| 연애 시뮬레이션 | `app/saju/love-simulation/_components/LoveSimulationEngine.tsx` | short |
| 네오 상담 | `app/neo-consultation/NeoConsultationClient.tsx:252` | 기존 문구를 공용 컴포넌트로 교체할지 결정 |

`app/fortune-chat/FortuneChatCompatibility.tsx` 는 `FortuneTeaHouseClient legacyChat` 렌더만 하므로 찻집 쪽 입력부를 별도 확인한다(미조사). 관계 경계 테스트(`relationshipBoundaryTests.targetInfo`) 입력 화면도 대상 후보(미조사).

SEO: 폼 내부 안내 문단만 추가 → title/description/H1/canonical/sitemap 영향 없음.

---

## 단계 8-B. PRIV-004 처리위탁·국외 이전 표 초안 — 사용자·법률 검토 필요

### 현재 처리방침(`app/privacy-policy/PrivacyPolicyContent.jsx`) 대비
- 5절 `third-party` 수탁자: 포트원(이름·전화·이메일·결제정보), KG이니시스, Cloudflare, MongoDB 만 기재.
- 국외 이전 h3 는 제목이 "앱인토스 이용자의 개인정보 국외 이전"이고 Cloudflare·MongoDB 만 기재 → 앱인토스 외 이용자의 국외 이전이 누락된 것처럼 읽힌다.
- 4절 GA4·AdSense 는 이미 있음.
- 시행일 `PRIVACY_POLICY_EFFECTIVE_DATE = "2026-11-15"` 는 `worker/routes/auth.js` 의 `AUTH_PRIVACY_VERSION` 과 같아야 하고, 수집 항목이 바뀌면 AuthShell `privacySummary` 도 함께 바꿔야 한다(`scripts/verify-signup-phone-required.mjs` 가 강제). 개정 시 세 곳을 한 커밋으로 바꾼다.

### 추가 기재가 필요한 수탁자·이전 대상(코드 실측)
| 수탁자(국가) | 위탁 업무 | 이전 항목 | 근거 코드 | 현 방침 |
| --- | --- | --- | --- | --- |
| Google LLC — Gemini API(미국) | AI 상담·풀이 생성 | 이용자·상대방 이름(또는 별칭), 생년월일시, 성별, 상담 질문, 손금 사진 | `lib/llm-client.ts`(generativelanguage.googleapis.com) | 누락 |
| Cloudflare — Workers AI(미국 등) | 생성 실패 시 대체 생성 | 위와 같음 | `lib/llm-client.ts` AI 바인딩 대체 경로 | Cloudflare 는 있으나 업무 범위에 AI 생성 없음 |
| Resend(미국) | 결과·영수증·알림 메일 발송 | 이메일, 이름, 메일 본문(상담 결과 일부 포함) | `worker/lib/resend.js` ← neo-consultation/mail.js, payments/receipt-email.js, yeongnyangi/completion-mail.js, daily-fortune-task, email-marketing-task, snu-campus, feedback-notify | 누락 |
| OpenStreetMap Foundation — Nominatim(영국/EU) | 출생지 좌표 변환 | 출생지 텍스트(식별자 없음) | `worker/lib/geocode.js`, admin-geocode.js, vedic-ai-chart.js | 누락(제공이 아니라 조회이나 국외 전송이므로 고지 권장) |
| Discord / Slack(미국) | 운영 알림 | PRIV-006 이후 문의 ID·분류 등 최소 메타, 결제 이행 장애 알림 | `worker/lib/feedback-notify.js`, `worker/payments/fulfillment-alert.js` | 누락(개인정보 미포함으로 유지되면 기재 생략 가능 — 법률 판단) |
| Google LLC — Google Play(미국) | 앱 인앱결제 검증·환불 통지 | 구매 토큰, 주문 ID, 상품 ID | `worker/routes/app-store.js`(androidpublisher) | 누락 |
| Apple Inc.(미국) | Apple 로그인·탈퇴 시 토큰 철회 | Apple 계정 식별자, 이메일(릴레이 포함) | `worker/lib/apple-signin.js` | 누락 |
| Google·네이버·카카오 | 소셜 로그인 | 계정 식별자, 이메일, 이름, (Google) 생일 `user.birthday.read` | `worker/routes/auth.js` | 수집 항목은 있을 수 있으나 수탁/제3자 구분 확인 필요 |
| Cloudflare — Turnstile | 봇 방지 | IP, 브라우저 신호 | Turnstile 검증 호출 | Cloudflare 업무 범위에 추가 |
| 토스(비바리퍼블리카) | 앱인토스 연동 | 토스 사용자 식별자 | `apps-in-toss-api.toss.im` 호출(worker/toss) | 앱인토스 절에 일부 존재 — 대조 필요 |

### 표 문안 초안(처리방침 5절 추가용)
> **개인정보 처리 위탁 및 국외 이전**
> 회사는 서비스 제공을 위해 다음과 같이 개인정보 처리를 위탁하며, 일부는 국외로 이전됩니다. 이전 일시·방법: 서비스 이용 시점에 네트워크를 통해 전송. 보유 기간: 위탁 업무 처리 후 지체 없이 파기하거나 수탁자의 정책에 따름. 국외 이전을 원하지 않으시면 해당 기능(AI 상담, 메일 수신 등)을 이용하지 않거나 고객센터에 거부를 요청할 수 있으며, 이 경우 해당 기능 제공이 제한됩니다.
> | 이전받는 자(연락처) | 국가 | 항목 | 목적 |
> | Google LLC (Gemini API) | 미국 | … | AI 풀이 생성 |
> | Resend, Inc. | 미국 | … | 메일 발송 |
> | … | | | |

검토 포인트: (1) 각 수탁자의 개인정보 담당 연락처는 공식 문서에서 확인해 채운다(이 문서는 추정 연락처를 넣지 않았다). (2) Gemini API 의 학습 미사용·보관 기간은 사용 중인 요금제 약관 기준으로 법률 검토. (3) 앱인토스 h3 를 "국외 이전" 일반 절로 승격할지, 별도 유지할지. (4) 개정 시 시행일·`AUTH_PRIVACY_VERSION`·`privacySummary` 동시 갱신 및 재동의 필요 여부.

---

## 단계 9. PRIV-001 회원 탈퇴 파기 설계 — 설계만, 파기 범위 변경은 미승인

### 정책 경계(정본)
- CLAUDE.md·`docs/context/library-preservation.md`: 서비스 유지 중 구매 결과는 기간·단종·가격·이용권 만료로 삭제·숨김하지 않는다. **정상 회원 탈퇴와 환불에 따른 접근 회수는 유지**한다. TTL 은 미결제 의도·임시 공유 링크·캐시에만.
- 해석: "구매 결과 보존"은 *계정이 살아 있는 동안*의 보존이다. 탈퇴는 접근 회수 사유이므로, 탈퇴 후 결과 본문(특히 상대방 정보 포함)을 식별 가능한 상태로 남길 근거는 없다. 단, 결제·환불·분쟁 대응 증빙은 전자상거래법상 보관(계약·결제 기록 5년)이 필요하다.

### 현재 `handleWithdraw`(`worker/routes/auth.js` 4131–4373) 동작
User 익명화($set), payments `$unset userId`+`userEmailHash`, pointhistories·profilecards·profile_pets·profile_pet_actions·영냥이 4종 삭제, snu_campus_members·activation_rewards 일부 `$unset`, deleted_account_logs 기록, Soul Cat·Apple 토큰 철회, 리프레시 세션 폐기, `partialFailure` 플래그. 그 외 컬렉션은 처리하지 않는다.

### 컬렉션별 결정안
`userId` 타입이 컬렉션마다 ObjectId/String 으로 섞여 있으므로 조건은 `{ userId: { $in: [oid, String(oid)] } }` 로 통일한다.

| 컬렉션 | 결정 | 이유 |
| --- | --- | --- |
| newYear/karmaDestiny/ziwei/loveSecret/sajuCompatPremium/lifeBook/sukuyoCompatibility/vedic/astrology/neoOperationRoom/nakshatra AiConsultations | **삭제** | 생년월일시·상대방 정보·상담 본문. 탈퇴로 접근 회수, 결제 증빙은 payments 에 남음 |
| masterLoveCodexSessions(partnerInfo), relationshipBoundaryTests(targetInfo) | **삭제** | 제3자 정보 |
| ziweiCalculationPreparations, ziweiDeepReports, destinyCompassReports | **삭제** | 출생정보 기반 결과 |
| humanDesign Calculations/Interpretations/Reports | **삭제** | 같음 |
| fusionFortune Consultations/GenerationAttempts | **삭제** | 같음 |
| fortuneChatSessions, fortune_tea_house_tarot_drafts/results | **삭제** | 대화 본문 |
| neo_email_consultations(String userId, `data`) | **삭제** | 상담 본문·이메일 |
| guardianFortune usages/attempts | **삭제** | 사용 기록 |
| resultSharedSnapshots, destinyBiasShares, yeongnyangiReportShares, guardianFortune sharedSnapshots | **삭제** | 공유 링크가 탈퇴 후에도 열리면 안 됨 |
| profile_spirits, profile_pet_appearances, user_rpg_* | **삭제** | 부가 프로필 |
| feedbacks | **익명화**: `$unset authorEmail, authorName, userAgent`, `userId`→해시, 첨부는 아래 R2 처리 후 `attachments` 비움 | 문의 기록 3년 보관(방침 6절) — 본문은 보관하되 식별자 제거 |
| reviews | **익명화**: 작성자 식별자 `$unset`, 공개 표시명 "[탈퇴한 회원]" | 공개 리뷰는 서비스 신뢰 기록. 삭제 요청 시 삭제로 바꿀 수 있게 결정 필요 |
| serviceexecutiontransactions, paid_execution_records | **익명화**: userId·입력 스냅샷(출생정보) `$unset`, 결제 연결 키·금액·상태 유지 | 결제 이행 증빙 |
| content_entitlements, payment_entitlements, monthly_credit_ledger, daehan_purchases, paid_tarot_draws | **익명화**: userId→`userIdHash`, 결과 본문 필드가 있으면 `$unset` | 정산·환불 증빙 5년 |
| gifts | **익명화**: 보낸/받은 userId→해시, 메시지·수신자 연락처 `$unset` | 상대방(수신자) 기록·결제 증빙 공존 |
| app_purchase_intents | 미결제 → **삭제**, 결제 연결분 → 익명화 | 미결제 의도는 원래 TTL 대상 |
| fortune_tea_house honey wallets/ledgers, neo_operation_room badge wallets/ledgers | **익명화**(잔액 0 처리는 정책 결정) | 유상 재화 원장 증빙 |
| neo_operation_room_strategy_books | **삭제** | 상담 결과 본문 |
| llm_response_cache | **유지**(30일 TTL) — 단, 키에 userId 가 들어가면 삭제 | TTL 이 이미 짧음. 키 구조 확인 필요(미조사) |
| security_events, idempotency_keys, abuse_scores | **유지** 후 기존 TTL | 부정 이용 방지 3개월(방침 6절 로그) |
| Insight, DailyFortuneSubscription, Crm*, EmailMarketing*, Recommendation*, LlmUsage | 구독·마케팅 → **삭제**, LlmUsage → **익명화**(비용 집계) | 마케팅 수신 철회는 즉시 |
| toss_*(ownerId) | 별도 토스 연결 해제 흐름 유지, 탈퇴 시 연결 해제 호출 여부 확인 | 앱인토스 별도 절 |
| deleted_account_logs | **유지** | 재가입 악용 방지·분쟁 대응(이미 해시 기록) |

### R2 `bugs` 문의 첨부
- 키는 `feedback 접두 + yyyy/mm/<ts>-<hex>-파일명` 이라 userId 로 찾을 수 없다. 소유자는 `customMetadata.uploaderId` 에만 있다.
- 1안(권장): feedbacks 익명화 직전에 그 사용자 문서의 `attachments[].key` 를 모아 `env.<R2 바인딩>.delete(keys)` (1회 최대 1000개). Mongo 문서가 정본이므로 스캔 비용이 없다.
- 2안(보완): 첨부만 올리고 문의 제출 전 이탈한 고아 객체는 Mongo 에 키가 없다. 주기 작업이 `list({prefix})` + `head` 로 `uploaderId` 가 탈퇴 계정 해시 목록과 일치하거나 30일 이상 미참조인 객체를 지운다. 비용이 크므로 탈퇴 경로에 넣지 않는다.
- 순서: R2 삭제 성공 → feedbacks `attachments` 비움. R2 실패 시 `partialFailure` 에 기록하고 키 목록을 `deleted_account_logs` 의 재시도 큐 필드에 남긴다(본문 없이 키만).

### 구현 형태(제안)
- `handleWithdraw` 안의 개별 deleteMany 나열 대신 `worker/lib/account-erasure-plan.js`(가칭)에 `{ model, filter, action: "delete" | "unset" | "anonymize", fields }` 표를 두고 순회. 새 컬렉션이 표에 없으면 테스트가 실패하도록(fail-closed) 모델 인벤토리 대조 테스트를 함께 둔다 — 단, 새 CI 필수 게이트 등록은 미승인이므로 기존 jest 스위트 안의 테스트로만.
- 각 단계는 독립 try/catch 로 `partialFailure` 를 누적하고, 사용자 응답은 기존처럼 성공 처리 + 운영 알림(최소 메타).

### 위험
- 되돌릴 수 없음: 운영 반영 후 삭제된 상담 원본은 백업 외 복구 불가. 오탐(다른 사용자 문서) 시 피해가 크다 → 필터는 반드시 해당 userId 단일 값, `$in` 은 같은 id 의 두 타입만.
- 구매 결과 보존 정책과의 충돌 오해: "탈퇴=접근 회수" 해석을 사용자가 확정해야 한다.
- 환불 분쟁: 결과 본문 삭제 후 "결과를 못 받았다" 분쟁 시 증빙은 payments·실행 기록 상태값뿐. 본문 해시를 익명화 레코드에 남기는 방안 검토.
- 탈퇴 처리 시간 증가: 컬렉션 30여 개 순회 → Worker CPU/시간 한도. 대량 사용자는 큐(백그라운드) 처리 필요.
- 공유 링크 캐시: 엣지 캐시에 남은 공유 결과 페이지는 DB 삭제 후에도 캐시 TTL 동안 열릴 수 있음 → 캐시 퍼지 경로 확인.

### 검증(전부 mock)
- 계정 A·B 를 각 컬렉션에 심고 A 탈퇴 → A 문서 삭제/익명화, B 문서 불변(해시 비교).
- ObjectId·String userId 두 형식 모두 처리.
- R2 mock: 첨부 키 삭제 호출, 실패 시 partialFailure·재시도 키 기록.
- payments·entitlements 의 금액·상태·결제 연결 키 불변.
- 모델 인벤토리 대조: `worker/lib/*models*.js` 의 모든 모델이 erasure plan 에 결정(삭제/익명화/유지+이유)을 가짐.
- 기존 `__tests__/worker` 의 탈퇴 테스트 회귀 없음.

### 롤백
- 코드: 해당 커밋 `git revert` → 기존(부분) 탈퇴 동작으로 복귀. 이미 탈퇴 처리된 계정의 삭제분은 복구되지 않는다(롤백 범위 밖).
- 운영 반영 전 스테이징 DB 에서 표본 계정으로 1회 실측.

---

## 단계 10-A. PRIV-002 결제·선물 라우트 탈퇴 계정 차단 — 적용됨(2026-11-26, f450461ce0)

> **적용 결과(2026-11-26, 사용자 승인 "권장대로 PRIV-002 결제·선물 라우트 진행해")** — 커밋 `f450461ce0`. 아래 초안과 달리 변환 로직은 `worker/payments/index.js` 의 `resolveActiveUserId(request, env)` 하나로 모았고(게스트·무효·탈퇴 → `""` → 기존 401 `UNAUTHORIZED`, 인증 인프라 503 → `paymentError("DB_UNAVAILABLE")`), 라우트 표에는 `activeUser: true` 플래그를 단다. 선물 라우트는 같은 함수를 import 한다.
> - 적용(`resolvePaidRouteAuth`): `POST /orders`, `POST /prepare`, `POST /coin-gate/moonstone`, `POST /coin-gate/pass-check`, `POST /subscription/prepare`, `POST /moonstone/spend`, `POST /birth-profile-pending/:id/claim`, `POST /service-packs/prepare`, `POST /service-packs/consume`(service-pack 라우트는 같은 ROUTES 표·디스패처를 탄다), 선물 `POST /gifts/claim`.
> - 유지(peek, Mongo 읽기 0회): `POST /orders/:id/confirm`, `POST /confirm`, `POST /subscription/confirm`, `POST /service-packs/orders/:id/confirm`, `POST /webhook`(auth none), 모든 GET(`/recoveries`, `/birth-profile-pending`, `/orders/:id`·`/status`·`/resume`, `/service-packs/wallet`·`/orders/:id/status`, 선물 GET), `POST /service-packs/quote`(조회 전용 — 쓰기·차감 없음), 선물 공개 `/preview`·`/context`, 선물 소유자 `/:id/link`·`/:id/refund-request`.
> - 검증: `__tests__/worker/payments-withdrawn-auth.test.js` 24건(수정 전 14 실패 → 수정 후 전부 통과). `payments-v2.staging-test-amount.test.js` 는 env 가 NODE_ENV=production 이라 로컬 폴백이 없어 auth.js mock 을 추가(단언 변경 없음). paid-gate-auditor PASS. `npm run check:fast`(critical) 통과: test:node 5860/5860, jest 498 스위트 8685 통과·1 skip.
> - 남은 위험: 활성 확인은 refresh 쿠키 폴백까지 인정하므로, access 만료 + refresh 쿠키 상태에서 prepare 는 통과하고 confirm(peek)은 401 이 될 수 있다(클라이언트의 401 갱신 재시도에 기댐, 미실측). 탈퇴 계정의 confirm 은 별도 설계(이행 후 환불 알림) 과제로 남는다.


neo 라우트 수정(c87f7fe4ac)과 같은 방식: JWT 만 보는 `peekAccessTokenUserId` 대신 활성 사용자 확인이 포함된 `resolvePaidRouteAuth` 를 쓴다. 차이점: 결제 디스패처의 `classify()` 는 PaymentError 가 아닌 오류를 `INTERNAL_ERROR`(500)로 바꾸므로, 인증 인프라 503(`AUTH_STATUS_TEMPORARILY_UNAVAILABLE`)을 `paymentError("DB_UNAVAILABLE")`(503, retryable, retryAfterSec 2, `errors.js:137`, `ALLOWED_503_CODES` 에 포함)로 변환해야 한다.

### 범위 결정(사용자 결정 필요)
라우트 표 주석(`worker/payments/index.js:1221`)의 "Mongo 읽기 0회" 성능 설계가 있다. 제안은 **주문 생성·차감 POST 에만** 활성 확인을 적용하는 것:
- 적용: `POST /orders`, `/prepare`, `/coin-gate/moonstone`, `/coin-gate/pass-check`, `/subscription/prepare`, `/moonstone/spend`, `/birth-profile-pending/:id/claim`, service-pack `prepare`·`consume`, 선물 `POST /claim`.
- 유지(peek): GET 상태 조회류(`/recoveries`, `/orders/:id/status|resume`, `/orders/:id`, 선물 GET), 그리고 **`/orders/:id/confirm`·`/confirm`·`/subscription/confirm`**. confirm 은 PG 에서 돈이 이미 이동한 뒤라 여기서 막으면 결제는 됐는데 이행이 안 되는 상태가 생기고, 웹훅이 결국 정산한다. 탈퇴 계정의 confirm 은 이행 후 환불 대상으로 운영 알림을 띄우는 쪽이 안전하다(별도 설계).

### `worker/payments/index.js` (2190–2192 부근)
```diff
@@ import 부 (36)
-import { peekAccessTokenUserId } from "../lib/auth.js";
+import { peekAccessTokenUserId, resolvePaidRouteAuth } from "../lib/auth.js";
@@ ROUTES 정의: 활성 확인이 필요한 라우트에 플래그 추가 (예시)
   "POST /orders": {
     auth: "required",
+    activeUser: true, // 탈퇴·정지 계정 차단 — Mongo 읽기 1회
     async handle(...) {
@@ 디스패처 (2190)
-    const userId = matched.route.auth === "required"
-      ? requireUser(await peekAccessTokenUserId(request, env)) // JWT 만 본다 — Mongo 읽기 0회
-      : "";
+    let userId = "";
+    if (matched.route.auth === "required") {
+      if (matched.route.activeUser) {
+        let auth = null;
+        try {
+          auth = await resolvePaidRouteAuth(request, env);
+        } catch (error) {
+          // 인증 상태 확인 인프라 장애: classify() 가 500 으로 바꾸지 않도록 결제 계약 코드로 변환
+          if (error?.status === 503) throw paymentError("DB_UNAVAILABLE", "인증 상태를 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.");
+          throw error;
+        }
+        userId = requireUser(auth?.userId ? String(auth.userId) : "");
+      } else {
+        userId = requireUser(await peekAccessTokenUserId(request, env)); // JWT 만 본다 — Mongo 읽기 0회
+      }
+    }
     ctx.userId = userId;
```
service-pack-routes.js 의 `prepare`·`consume` 은 같은 디스패처를 타는지, 자체 인증을 하는지 구현 시 확인(미조사)하고 같은 플래그를 단다.

### `worker/payments/gift-routes.js` (52–54)
```diff
-import { peekAccessTokenUserId } from "../lib/auth.js";
+import { peekAccessTokenUserId, resolvePaidRouteAuth } from "../lib/auth.js";
@@ handleGiftRoute
     const publicRoute = path === "/preview" || path === "/context";
-    const userId = await peekAccessTokenUserId(request, env) || "";
+    const needsActiveUser = method === "POST" && path === "/claim";
+    let userId = "";
+    if (needsActiveUser) {
+      try {
+        const auth = await resolvePaidRouteAuth(request, env);
+        userId = auth?.userId ? String(auth.userId) : "";
+      } catch (error) {
+        if (error?.status === 503) throw paymentError("DB_UNAVAILABLE", "인증 상태를 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.");
+        throw error;
+      }
+    } else {
+      userId = await peekAccessTokenUserId(request, env) || "";
+    }
     if (!publicRoute && !userId) throw paymentError("UNAUTHORIZED", "로그인이 필요합니다.");
```
선물 응답의 catch 는 `contract.status >= 500` 일 때 일반 문구로 바꾸므로 503 도 같은 문구로 나간다(재시도 가능 여부는 `contract.retryable` 로 전달되는지 구현 시 확인).

### 검증(mock)
- `__tests__/worker/neo-consultations.withdrawn-auth.test.js` 패턴으로 `payments-withdrawn-auth.test.js`: 탈퇴 계정 토큰 → `POST /orders` 401, 인증 인프라 503 → 503 `DB_UNAVAILABLE`, 정상 → 통과, GET 상태 조회·confirm 은 peek 유지(Mongo 호출 0 단언).
- peek 을 mock 하는 기존 테스트(`payments-v2.context.test.js`, `card-single-payment-auto-refund.test.js` 등)가 `resolvePaidRouteAuth` mock 을 추가로 요구하는지 확인.
- 결제 게이트(`npm run check:fast` critical 승격)와 paid-gate-auditor 감사.
- 롤백: 커밋 단위 `git revert`. 데이터 변경 없음.

---

## 단계 10-B. PRIV-018 Google Play 경로 강화 — diff 초안(미적용)

실측: 구매 검증의 `packageName` 은 body 값을 받지만 1168 에서 기대값과 비교해 불일치면 400 이므로 **이미 검증됨**. 남은 약점은 RTDN 쪽이다.

```diff
@@ worker/routes/app-store.js — 구매 검증(1166–1168): body 값을 쓰지 않고 설정값만 사용(의미 동일, 혼동 제거)
-  const packageName = cleanText(body.packageName || getEnv(env, "GOOGLE_PLAY_PACKAGE_NAME") || getEnv(env, "CODE_DESTINY_ANDROID_PACKAGE_ID") || "com.codedestiny.app");
-  const expectedPackage = cleanText(getEnv(env, "GOOGLE_PLAY_PACKAGE_NAME") || getEnv(env, "CODE_DESTINY_ANDROID_PACKAGE_ID") || "com.codedestiny.app");
-  if (packageName !== expectedPackage) return json({ ok: false, code: "GOOGLE_PLAY_PACKAGE_MISMATCH" }, { status: 400 });
+  const expectedPackage = cleanText(getEnv(env, "GOOGLE_PLAY_PACKAGE_NAME") || getEnv(env, "CODE_DESTINY_ANDROID_PACKAGE_ID") || "com.codedestiny.app");
+  if (body.packageName && cleanText(body.packageName) !== expectedPackage) return json({ ok: false, code: "GOOGLE_PLAY_PACKAGE_MISMATCH" }, { status: 400 });
+  const packageName = expectedPackage;
@@ requireGoogleRtdnToken(1447–1467): 상수 시간 비교
+async function constantTimeEqual(a, b) {
+  const enc = new TextEncoder();
+  const [ha, hb] = await Promise.all([
+    crypto.subtle.digest("SHA-256", enc.encode(String(a))),
+    crypto.subtle.digest("SHA-256", enc.encode(String(b))),
+  ]);
+  const x = new Uint8Array(ha), y = new Uint8Array(hb);
+  let diff = 0;
+  for (let i = 0; i < x.length; i += 1) diff |= x[i] ^ y[i];
+  return diff === 0;
+}
-function requireGoogleRtdnToken(request, env) {
+async function requireGoogleRtdnToken(request, env) {
@@
-  if (authHeader === expected || channelToken === expected || queryToken === expected) return;
+  const candidates = [authHeader, channelToken, queryToken].filter(Boolean);
+  for (const candidate of candidates) {
+    if (await constantTimeEqual(candidate, expected)) return;
+  }
@@ 호출부
-  requireGoogleRtdnToken(request, env);
+  await requireGoogleRtdnToken(request, env);
@@ handleGoogleRtdn(1608–1616): 패키지 검증 + voided 재확인
-  const packageName = notification.packageName
-    || cleanText(getEnv(env, "GOOGLE_PLAY_PACKAGE_NAME") || getEnv(env, "CODE_DESTINY_ANDROID_PACKAGE_ID") || "com.codedestiny.app");
+  const expectedPackage = cleanText(getEnv(env, "GOOGLE_PLAY_PACKAGE_NAME") || getEnv(env, "CODE_DESTINY_ANDROID_PACKAGE_ID") || "com.codedestiny.app");
+  if (notification.packageName && notification.packageName !== expectedPackage) {
+    return json({ ok: true, ignored: "PACKAGE_MISMATCH" }); // 2xx 로 응답해 Pub/Sub 재전송을 멈춘다
+  }
+  const packageName = expectedPackage;
@@
   if (notification.voided) {
+    // 위조 통지로 정상 구매가 회수되지 않도록 Google 의 voidedpurchases 목록으로 확인한다.
+    // products.get 은 소비된 구매에서 실패할 수 있으므로(기존 주석) 쓰지 않는다.
+    const confirmed = await isPurchaseVoidedOnGoogle({ env, packageName, purchaseToken: notification.purchaseToken, orderId: notification.orderId });
+    if (confirmed === null) throw Object.assign(new Error("voided check unavailable"), { status: 503, code: "GOOGLE_PLAY_VOIDED_CHECK_UNAVAILABLE" }); // 5xx → Pub/Sub 재시도
+    if (!confirmed) return json({ ok: true, ignored: "VOIDED_NOT_CONFIRMED" });
     await revokeGoogleEntitlement({ payment, googlePurchase: null, notification });
```
`isPurchaseVoidedOnGoogle` 은 기존 `getGoogleAccessToken`·`fetchGooglePurchase`(651) 와 같은 방식으로 `GET androidpublisher/v3/applications/{pkg}/purchases/voidedpurchases?startTime=<통지 시각-7일>` 를 호출해 token/orderId 일치 여부를 반환(오류 시 null).

### 추가 설계
- 쿼리 토큰(`?token=`, 1444 문서화)은 Cloudflare·Pub/Sub 요청 로그에 URL 째 남는다. 1단계: Pub/Sub 푸시 구독을 **OIDC 인증(서비스 계정 JWT, `Authorization: Bearer`)** 으로 전환하고 Worker 가 Google 공개키로 서명·`aud`·`email` 을 검증. 2단계: 전환 확인 후 쿼리 토큰 경로 제거 및 `GOOGLE_PLAY_RTDN_TOKEN` 교체(rotate).
- 위험: voided 재확인 API 장애 시 회수 지연(재시도로 흡수, Pub/Sub 보존 7일). 재확인 실패 정책(지연 vs 즉시 회수)은 사용자 결정.
- 검증(mock): 패키지 불일치 무시, 토큰 비교 성공/실패, voided 확인됨/미확인/API 오류 3분기, 기존 app-store 테스트 회귀.
- 롤백: `git revert`. 구독 OIDC 전환은 콘솔 설정이므로 별도 운영 절차(기존 토큰 경로를 남겨 두면 즉시 되돌릴 수 있음).

---

## 단계 10-C. 짧은 설계안

### PRIV-007 앱 토큰 저장(Android WebView localStorage)
- 현황: `app/_lib/auth-client.ts`(약 164–195) 가 `fortune_auth_token` 과 리프레시 토큰을 localStorage 에 저장. `apps/mobile/package.json` 에 보안 저장소 플러그인 없음(@capacitor/android·app·browser·core·ios 뿐).
- 추가 관측: `signAuthToken` 의 액세스 JWT 페이로드에 이메일·이름·이미지·생년월일·출생시간·성별·포인트·가입일이 들어 있다 → 저장소 노출 시 영향이 토큰 탈취보다 크다.
- 설계: (1) 리프레시 토큰을 네이티브 Keystore 기반 저장소(예: Capacitor secure storage 계열 플러그인)로 옮기고 WebView 에는 짧은 액세스 토큰만 메모리 보관. (2) 액세스 JWT 페이로드를 `userId`·`role`·`typ` 등 최소로 줄이고 프로필은 `/me` 조회로(별도 RED — 클라이언트 다수가 페이로드를 읽는지 전수 조사 필요). (3) CSP `script-src` 강화로 XSS 표면 축소.
- 앱 릴리스(AAB 재빌드·심사) 필요. 웹은 HttpOnly 쿠키 경로 유지.

### PRIV-010 오늘의 운세 GET 쿼리의 생년월일
- 현황: `app/today/TodayHubClient.tsx:1176`(및 1100) 이 `birth` 를 GET 쿼리로 전송, 서버 `worker/routes/fortune-today.js:158` parseBirthQuery. 응답 캐시는 birth 있음 `private, max-age=1800`(485), 없음 `public`(507).
- 문제: 쿼리는 엣지·분석 로그·브라우저 기록에 남는다.
- 설계 A(권장): POST 본문으로 이동, 응답은 `private, no-store` 또는 클라이언트 메모리 캐시. 엣지 캐시 이점은 원래 private 라 손실 없음. 설계 B: 클라이언트가 생년월일로 만든 시드(해시)만 보내고 서버가 시드로 결정적 생성 — 계산에 실제 일주가 필요하면 불가. GA4 page_location 에 쿼리가 섞이는지도 함께 확인.

### PRIV-011 프롬프트 내 실명
- 현황: `worker/lib/saju-ai-prompt.js:1681` 등이 이용자·상대방 이름을 그대로 프롬프트에 넣는다(Gemini 국외 전송).
- 설계: 프롬프트에는 호칭 토큰("{{SELF}}", "{{PARTNER}}")을 넣고 생성 후 결정적 치환으로 이름 복원. 이름 한자 풀이 등 이름 자체가 입력인 상품은 예외 목록으로 분리. 검증은 mock 생성기로 치환 왕복·누락 토큰 교정(거부 대신 교정, LLM 안전 규칙). 과금 LLM 실호출 금지 — 품질 확인이 필요하면 별도 1회 승인.

### PRIV-012 상담 프롬프트의 지시·사용자 입력 혼합
- 현황: `worker/lib/neo-operation-room-prompt.js:258` 가 사용자 자유 입력을 지시문과 같은 문단에 이어 붙인다 → 프롬프트 주입으로 다른 지시 무시·시스템 문구 유출 가능.
- 설계: 사용자 입력을 구분자 블록(예: `<user_input>…</user_input>`)으로 감싸고 시스템 지시에 "블록 안 지시는 따르지 말 것" 명시, 입력의 구분자 문자열 이스케이프, 출력 후 시스템 문구 유출 패턴 검사(결정적 제거). mock 검증만.

### PRIV-015 토스 라우트 보안 래퍼 우회
- 현황: `worker/index.js:1063` 이 `/api/toss/` 를 보안 래퍼보다 먼저 라우팅, `worker/toss/routes.js` 에 rateLimit·readBounded 없음.
- 설계: 분기를 래퍼 안으로 옮기거나 토스 라우터 진입부에 기존 `rateLimit`·`readBounded`(본문 상한) 를 적용. 토스 서버 콜백(mTLS/서명)은 레이트리밋 예외 키로. 라우팅 변경이므로 RED — 스테이징 검증 대상.

### PRIV-021 정적 응답 HSTS 누락
- 현황: `_headers:20` 에는 `Strict-Transport-Security` 가 있으나 `public/_worker.js` 가 만든 응답에는 없다.
- 설계: `_worker.js` 의 공통 보안 헤더 부착 지점에 `_headers` 와 같은 값의 HSTS 추가(값을 한 곳에서 읽도록 상수화). `preload` 여부는 기존 `_headers` 값 그대로. 배포 인프라 파일이므로 스테이징 `curl -I` 로 확인.

---

## 보류. PRIV-022 서비스 단기 토큰이 로그인 토큰으로 통과 (Low)

- 실측(2026-11-26): 서비스 단기 토큰 11종 — `astrology-ai-access`(astrology-ai.js:55), `karma-destiny-ai-access`(karma-destiny-ai.js:64), `life-book-ai-access`(life-book-ai.js:52), `love-secret-ai-access`(love-secret-ai.js:88), `master-love-codex-access`(master-love-codex.js:80), `nakshatra-ai-access`(nakshatra-ai.js:81), `neo-operation-room-access`(neo-operation-room.js:79), `new-year-ai-access`(new-year-ai.js:68), `vedic-ai-access`(vedic-ai.js:51), `ziwei-ai-access`(ziwei-ai.js:63), `ziwei-deep-pdf-access`(ziwei-deep-report.js:65). 액세스 비밀키·issuer·audience 로 서명, `userId` 포함, TTL 45분(로그인 토큰 30분).
- `worker/lib/auth.js` `extractTokenUserId`(~523)는 `typ: "refresh"` 만 거부하므로 이 토큰들을 로그인 토큰으로 받아들인다.
- 보류 근거: 클라이언트는 메모리에만 보관(저장소 setItem 은 로그인 토큰 `fortune_auth_token` 2곳뿐), URL·로그 노출 없음, 본인에게만 발급. 실질 영향은 유효시간 15분 연장 수준.
- 수정안: `extractTokenUserId` 에 typ 허용목록(없음 또는 `"access"`)을 두고, 서비스 토큰 검증부 11곳이 자체 검증 함수로 typ 를 확인하는지 전수 조사 후 적용. 회귀 위험: 서비스 토큰을 로그인 토큰 자리에 보내는 클라이언트 경로가 있으면 401 — 조사로 배제한 뒤 적용.

---

## 단계 3~7 후속 과제(핸드오프 후속 절 이관)

- PRIV-003 확장: 서비스 단기 토큰 → 위 PRIV-022 로 분리, 보류.
- 측정: `check:fast` 가 critical 로 승격되면 1회 약 30~35분. 단계별로 대상 테스트를 돌리고 `check:fast` 는 끝에 1회.
- PRIV-016 확장: `fortune_api_base_url` 을 읽는 다른 지점(이번 수정 범위 밖)도 같은 허용 출처 검사를 적용할지 확인.
- PRIV-016: Capacitor `isLocalDevHost` 분기가 앱 빌드에서 로컬 API 로 향할 수 있는 조건 재점검.
- PRIV-009: 로그아웃 시 브리지 키와 `::guest` 접미 키는 지우지 않는다 — 공용 기기 잔존 여부 판단 필요.
- PRIV-006: 웹훅 최소화 후 관리자 페이지에 문의 ID 딥링크가 없어 운영자가 ID 로 찾기 불편 — 관리 화면 개선 과제.
- 신규 관측(이 문서): 액세스 JWT 페이로드의 개인정보 과다 — PRIV-007 설계에 포함.

## 사용자 결정 목록
1. PRIV-005 상대방 고지 문구 승인(특히 "별칭 가능"·"탈퇴 시 파기" 문장 포함 시점).
2. PRIV-004 처리위탁·국외 이전 표 법률 검토, 시행일·재동의 여부.
3. PRIV-001 "탈퇴=접근 회수 → 결과 본문 삭제" 해석 확정, 리뷰·문의의 삭제 vs 익명화, 유상 재화 잔액 처리.
4. PRIV-002 활성 확인 적용 라우트 범위(Mongo 읽기 비용)와 confirm 계열 예외 처리.
5. PRIV-018 voided 재확인 실패 시 정책(지연 vs 즉시 회수), Pub/Sub OIDC 전환 일정.
6. PRIV-022 typ 허용목록 진행 여부(현재 보류).
7. PRIV-007 앱 보안 저장소 도입과 앱 릴리스 일정, JWT 페이로드 축소 착수 여부.
8. PRIV-010 POST 전환, PRIV-011 호칭 토큰화(예외 상품), PRIV-012 입력 격리, PRIV-015 라우팅 변경, PRIV-021 HSTS 의 착수 순서.
