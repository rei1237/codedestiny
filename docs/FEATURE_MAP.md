# Feature Map

## 초융합 운세

- 주요 라우트: `/fusion-fortune`
- 주요 API: `GET /api/fusion-fortune/status`, `POST /api/fusion-fortune/generate`
- 주요 lib: `worker/lib/fusion-fortune.js`, `worker/lib/fusion-fortune-prompt.js`, `worker/lib/fusion-fortune-purchase.js`, `worker/routes/fusion-fortune.js`
- 데이터: `FusionFortuneTicketBalance`, `FusionFortuneTicketTransaction`, `FusionFortuneDailyLimit`, `FusionFortuneGenerationAttempt`
- 권한: 별도 초융합 상담권 1회만 가능하며 일반 이용권, family 이용권, 오늘의 귀인 대화권, entitlement, price coverage와 분리한다.
- 접수: Asia/Seoul 기준 성공 결과 완성 순서로 선착순 하루 100자리만 확정한다. 실패·검증 실패·결제 미완료는 자리를 소진하지 않는다.
- UI: 오늘의 귀인에서 이어지는 프리미엄 화면으로, repo-local WebP 히어로와 CSS/SVG 오브를 사용하고 390px 이하까지 반응형으로 제공한다.

## 사주

- 주요 라우트: `/saju`, `/saju/basic`, `/saju/basic/play`, `/manse`, `/daily-fortune`, `/saju/compatibility`, `/saju/five-elements`, `/saju/ten-gods`, `/saju/sibyl`
- 주요 컴포넌트: `app/components/SajuBasicPage.tsx`, `components/fortune/SajuPillarTable.tsx`, `app/components/MainHeroFortuneForm.tsx`
- 주요 API: `/api/fortune/*`, `/api/saju-new-year/*`, `/api/new-year-ai/*`
- 주요 lib: `worker/lib/saju-*.js`, `lib/fortune/analysis-basis.ts`, `AnalysisEngine.js`
- 데이터: `User`, `ProfileCard`, `ContentEntitlement`, `PaidExecutionRecord`, AI consultation collections
- 결제/권한: `section_daewun`, `section_summary`, `section_compat`, `saju-new-year`, `life-book-ai`, `love-secret-ai` 등은 registry 확인 필요
- 주의점: 로컬 계산 엔진과 LLM 결과를 섞을 때 용어/오행/십성 해석을 단정하지 않는다. PDF는 결제/권한 확인 후 로컬 계산 JSON 정합성을 먼저 확보한다.

## 자미두수

- 주요 라우트: `/ziwei`, `/ziwei/chart`, `/ziwei/guide`, `/ziwei-ai`, `/island-consult`, `/flower/jamidusu`
- 주요 컴포넌트: `app/components/ziwei/**`, `app/_lib/ziwei-*.ts`
- 주요 API: `/api/ziwei-ai/*`, `/api/ziwei/daehan/*`, `/api/ziwei-island/*`, `/api/ziwei-island-ai/*`, `/api/ziwei-island-report/*`, `/api/ziwei-deep-report/*`
- 주요 lib: `worker/lib/ziwei-*.js`, `worker/lib/island/**`, `app/_lib/ziwei-*.ts`
- 데이터: `ZiweiAiConsultation`, `ContentEntitlement`, `PaidExecutionRecord`
- 결제/권한: 자미두수 심화 잠금, 자미 AI 상담, 운명의 섬 궁 상담/심층 리포트는 서로 다른 featureKey일 수 있다.
- 주의점: `/api/ziwei-island-report`는 `/api/ziwei-island`보다 먼저 매칭되어야 한다.

## 숙요점

- 주요 라우트: `/sukuyo`, `/sukyo`, `/sukuyo/compatibility`, `/sukuyo/calendar`, `/oracle/sukuyo`, `/flower/sukuyo`, `/sukuyo-compatibility-ai`
- 주요 컴포넌트: `components/fortune/SukuyoWheel.tsx`
- 주요 API: `/api/sukuyo/*`, `/api/sukyo/*` alias, `/api/sukuyo-compatibility-ai/*`, `/api/sukuyo/calendar`
- 주요 lib: `lib/sukuyo-engine-server.ts`, `lib/sukuyo-calendar.ts`, `worker/lib/sukuyo-*.js`
- 데이터: `SukuyoCompatibilityAiConsultation`, archive/entitlement 기록 확인 필요
- 결제/권한: 기본 화면은 무료일 수 있으나 궁합 실행/인연 레이더/AI 상담은 회당 결제 또는 unlock 정책을 registry에서 확인한다.
- 주의점: `sukyo`와 `sukuyo` 표기가 함께 존재한다. 새 라우트는 정본 표기 `sukuyo` 우선.

## 점성술

- 주요 라우트: `/astrology`, `/astrology/cosmic`, `/astrology/guide`, `/astrology-ai`, `/astrology-ai/result`, `/flower/astrology`
- 주요 컴포넌트: `app/components/AstrologyCosmicPage.tsx`, `components/fortune/AstrologyChartWheel.tsx`
- 주요 API: `/api/astro/*`, `/api/astrology/*`, `/api/astrology-ai/*`
- 주요 lib: `worker/lib/astrology-ai-prompt*`, `worker/lib/astro-premium-*`, `lib/seo/**`
- 데이터: `AstrologyAiConsultation`
- 결제/권한: 점성술 AI/프리미엄 리포트는 `worker/lib/paid-feature-registry.js`와 route access guard 확인
- 주의점: 서양 점성술과 베다 점성술 용어/체계를 섞지 않는다.

## 베다점 / 나크샤트라

- 주요 라우트: `/vedic`, `/vedic/guide`, `/vedic/jyotish`, `/vedic-ai`, `/vedic-ai/result`, `/nakshatra`, `/nakshatra/ai`, `/nakshatra/compat`, `/nakshatra/vvip`
- 주요 컴포넌트: `app/vedic-ai/**`, `app/nakshatra/**`
- 주요 API: `/api/vedic/*`, `/api/vedic-ai/*`, `/api/nakshatra/*`, `/api/nakshatra-ai/*`, `/api/nakshatra-premium/*`
- 주요 lib: `lib/vedicCalculator.js`, `worker/lib/vedic-*.js`, `constants/nakshatra-*.js`, `worker/lib/nakshatra-*.js`
- 데이터: `VedicAiConsultation`, `NakshatraAiConsultation`
- 결제/권한: 베다 AI, 나크샤트라 premium/VVIP는 registry와 route guard 확인
- 주의점: 라그나, 라시, 나크샤트라, 다샤는 쉬운 설명과 함께 쓴다.

## 타로

- 주요 라우트: `/tarot`, `/tarot/mingri`, `/tarot/mingri/play`, `/tarot/love`, `/tarot/reunion`, `/tarot/mindscan`, `/tarot/healing`, `/tarot/prompt-maker`, `/tarot/year`
- 주요 컴포넌트: `app/components/MindScanTarot.tsx`, `app/components/LoveRelationshipTarot.tsx`, `app/tarot/**`
- 주요 API: `/api/tarot/*`, App API `app/api/tarot/**`
- 주요 lib: `lib/tarot/**`, `server/data/tarot-cards.*`
- 데이터: 결제형 타로는 `Payment`, `PaidExecutionRecord`; 일반 타로는 로컬 결과 중심
- 결제/권한: tarot featureKey는 `worker/lib/paid-feature-registry.js` 확인
- 십이지신 천운 타로: `lib/tarot/tarot-year-data.mjs`의 메이저 연간 정적 데이터와 `lib/tarot/tarot-year-premium.mjs`의 `tarot-year-v3` 스키마를 사용하며, `tarot-year-v2` 저장 결과도 하위 호환한다. 연도별 저장 결과는 `PaidExecutionRecord`의 `profileId=year:YYYY`로 관리
- 정적 UI 정본: `index.html`, `js/tarot-year-fortune-experience.js`, `styles/tarot-year-fortune.css`; 결과는 핵심 카드·총운·12개월·분야별 리딩·전환점·행운 행동·마지막 메시지 순서
- 주의점: 상대 마음을 100% 단정하지 말고 가능성/흐름/선택지로 쓴다.

## AI 상담

- 주요 라우트: `/life-book-ai`, `/love-secret-ai`, `/karma-destiny-ai`, `/master-love-codex`, `/neo-operation-room`, `/fortune-tea-house`, `/destiny-compass`, `/naming-ai`
- 주요 컴포넌트: 각 route client under `app/**`
- 주요 API: `/api/life-book-ai/*`, `/api/love-secret-ai/*`, `/api/karma-destiny-ai/*`, `/api/master-love-codex/*`, `/api/neo-operation-room/*`, `/api/fortune-tea-house/*`, `/api/destiny-compass-ai/*`, `/api/naming-prompt/*`
- 주요 lib: `lib/llm-client.ts`, `worker/lib/gemini.js`, `worker/lib/structured-consultation.js`, `worker/lib/llm-cache-store.js`, `worker/lib/sync-llm-timeout.js`
- 데이터: AI 상담별 `*Consultation`, `DestinyCompassReport`, `PaidExecutionRecord`, `LlmResponseCache`, `ServiceExecutionTransaction`
- 결제/권한: 모든 유료 AI는 LLM 호출 전 결제/접근 확인이 선행되어야 한다.
- 주의점: 실제 LLM 호출 금지. mock/fake/stub으로만 테스트한다.

## 오늘의 귀인 운세

- 결과 범위: `saju | ziwei | vedic | sukuyo | astrology | tarot` 중 사용자가 명시적으로 고른 카테고리 정확히 하나만 계산하고 상담한다. `fusion`과 카테고리 누락 요청은 사용 횟수 예약 전에 거부한다.
- 로그인 무료 상담은 하루에 3회를 보장 지급하는 문구가 아니라, 이용 상태에 따라 **하루 최대 3회**로 표시한다.
- 모든 상담에서 생시를 요청하되 `생시를 모름`을 허용한다. 베다점·점성술은 기존 출생지 데이터 소스를 조건부로 표시하며, 생시·출생지 미상일 때 자미 명반·라그나·상승궁·하우스를 단정하지 않는다.
- 주요 Worker 라우트: `/api/fortune/guardian/usage`, `/api/fortune/guardian/generate`, `/api/fortune/guardian/share`
- 주요 lib: `worker/lib/guardian-fortune-context.js`, `worker/lib/guardian-fortune-prompt.js`, `worker/lib/guardian-fortune-result.js`, `worker/lib/guardian-fortune-fallback.js`, `worker/lib/guardian-fortune-llm-policy.js`, `worker/lib/guardian-fortune-llm.js`
- 결과 흐름: 선택한 운세 adapter 하나 → 단일 `GuardianFortuneContext` → 해당 체계만 포함한 allowlist prompt → mock 또는 guarded Gemini → 교차 체계 validator → context-driven fallback → usage commit
- 기본 상태: mock LLM. 실제 provider는 staging + 로그인 allowlist + 두 개의 명시적 real flag가 모두 켜진 경우에만 선택된다. test와 production은 fail-closed mock이다.
- prompt 품질: 카테고리는 사용할 운세 체계를, 관심 주제는 상담 초점을 결정한다. 서버 `GuardianFortuneContext`에 없는 계산·카드·상대 마음·생시 의존 영역을 지어내지 않으며 선택하지 않은 다섯 체계의 전문용어와 근거가 섞이면 결과를 거부한다.
- fallback: provider 실패·malformed JSON·unsafe/품질 미달 결과에서 계산된 insight와 topic 우선순위 adapter 근거를 조합해 800~1500자 결과를 만든다. 계산되지 않은 영역은 주장하지 않으며, 사주/숙요/타로 등 체계명을 병렬 나열하기보다 반복 패턴을 하나의 상담 흐름으로 통합한다.
- validator: 생시·출생지가 없을 때 시주·라그나·상승궁·하우스·신궁을 단정하지 않도록 보정하고, 상대 마음 확정·의료/법률/투자 단정·공포/결제 압박 표현을 완화한다.
- 개인정보: raw input, raw prompt/response/context, user/guest/payment/usage 정보는 prompt·metric·share snapshot에 포함하지 않는다.
- 검증: `__tests__/worker/guardian-fortune-llm.test.js`, `__tests__/worker/guardian-fortune-fallback.test.js`는 provider injection만 사용하며 실제 네트워크를 호출하지 않는다.
- 결제/대화권: 3회권 10,000원, 10회권 30,000원 정책과 PG 단건 결제 중심 구매 guard를 유지한다. 일반 이용권, family 이용권, credit, conversation credit, entitlement, price coverage로 대화권을 구매할 수 없다.

## 운명의 찻집

- 주요 라우트: `/fortune-tea-house`, debug routes under `/fortune-tea-house/*-debug`
- 주요 컴포넌트: `app/fortune-tea-house/**`, `components/yeon/**`
- 주요 API: `/api/fortune-tea-house/*`, `app/api/fortune-tea-house/**`
- 주요 lib: `worker/routes/fortune-tea-house.js`, `lib/fortune-tea-house/**`, `lib/yeon/**`
- 데이터: 상담 결과/꿀방울/앨범 unlock 관련 기록 확인 필요
- 결제/권한: 찻집 상담 featureKey와 가격은 `PAYMENT_POLICY.md`, `worker/lib/paid-feature-registry.js` 확인
- 주의점: 연이 문체는 따뜻하고 다정하지만 유치하지 않게 유지한다.

## 네오 운명 전략실

- 주요 라우트: `/neo-operation-room`, `/neo-operation-room/result`, `/neo-war-room/asset-demo`
- 주요 컴포넌트: `app/neo-operation-room/**`
- 주요 API: `/api/neo-operation-room/*`, `app/api/neo-operation-room/[...path]/route.ts`
- 주요 lib: `worker/routes/neo-operation-room.js`, `worker/lib/neo-operation-room-prompt.js`
- 데이터: `NeoOperationRoomConsultation`
- 결제/권한: `neo-operation-room` featureKey 확인 필요
- 주의점: 직설적 전략가 톤은 허용하되 모욕/공포 마케팅 금지.

## 음악 감상실

- 주요 라우트: `/music`, `/music/guide`
- 주요 컴포넌트: `app/music/**`
- 주요 API: `/api/music/*`
- 주요 lib: `lib/music-access-policy.js`, `worker/routes/music.js`, `scripts/generate-music-manifest.ts`
- 데이터: 다운로드 권한은 결제/해금 기록 사용
- 결제/권한: 재생은 무료, MP3 다운로드는 구매 UX gate로 문서화되어 있다.
- 주의점: R2 공개 URL 우회 가능성을 알고 UX gate로 다룬다. 대용량 오디오 자동 로딩 금지.

## 결제 / 이용권 / 권한

- 주요 라우트: `/points`, `/points/history`, `/premium`, `/premium-unlock`, `/app/store`
- 주요 컴포넌트: `app/_lib/billing-client.ts`, `app/hooks/usePayment.ts`, `app/hooks/useCoinGate.ts`, `app/components/PaymentProcessingOverlay.tsx`
- 주요 API: `/api/billing/*`, `/api/payments/*`, `/api/access/*`, `/api/points/me`
- 주요 lib: `worker/lib/paid-feature-registry.js`, `worker/lib/billing-policy.js`, `worker/lib/profile-limits.js`, `worker/lib/monthly-credit-*.js`, `worker/lib/payment-refund.js`
- 데이터: `Payment`, `PointHistory`, `MonthlyCreditLedger`, `ContentEntitlement`, `CheckoutFunnelEvent`
- 주의점: 실결제 금지. sandbox/mock만 사용.

## PDF / 결과 저장 / 다운로드

- 주요 라우트: `/pdf/life-book`, `/pdf/love-report`, result routes under AI features
- 주요 API: `/api/premium/pdf-archive/*`, `/api/billing/pdf-archive/*`, feature-specific AI routes
- 주요 lib: `lib/pdf/export-result-pdf.ts`, `worker/lib/pdf-runtime.js`, `worker/lib/premium-chapter-json-contract.js`
- 데이터: 상담별 result collection, `PaidExecutionRecord`, pdf archive 확인 필요
- 주의점: 인생의 책 PDF는 결제/권한 → 로컬 계산 JSON → LLM 보강 → PDF 렌더 순서 유지.

## 관리자 / 리뷰 / 버그 제보

- 주요 라우트: `/admin`, `/admin/orders`, `/admin/reviews`, `/admin/cms`, `/admin/insights`, `/admin/monthly-credits`, `/feedback`, `/reviews`
- 주요 API: `/api/admin/*`, `/api/reviews/*`, `/api/feedback/*`, `/api/cms/*`, `/api/content/*`
- 주요 lib: `worker/routes/admin.js`, `worker/routes/reviews.js`, `worker/routes/feedback.js`, `worker/lib/review-*.js`, `worker/lib/feedback-*.js`
- 데이터: `Insight`, `CmsEntry`, `CmsRevision`, review/feedback models, `SecurityEvent`, `AdminAuditLog`
- 권한: 관리자 인증/감사 로그/보안 가드 확인 필수
- 주의점: R2 feedback image bucket과 insight image bucket 경로를 혼동하지 않는다.
