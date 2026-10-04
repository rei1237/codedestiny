# 꿀꿀 운세 서버 기록 연결 조사

2026-10-04~05 코드 조사와 구현 연결표다. 운영 DB의 실제 문서 수, 인덱스 존재 여부, 실결제 및 실 LLM은 확인하지 않았다. 아래 표는 기존 저장·조회 계약이며 이번 통합 조회와 렌더러의 구현 내용은 마지막 절에 적었다.

## 확인된 누락 원인

- `index.html:9012`, `index.html:9037`의 나의 기록 링크가 `/fortune-chat/`만 가리킨다. 대표 보고서의 별도 저장소를 합쳐 조회하는 개인 보관함이 기존 화면에 연결되지 않았다.
- 하단 상담 탭은 `index.html:13083`에서 `/fortune-chat/`로 직접 이동한다. 대표 상담 비교 화면을 거치지 않는다.
- 기존 전문 서비스별 목록은 보통 `completed`만 조회하고 10~30개로 제한한다. 페이지네이션 없이 서비스별 완료 목록만 합치면 과거 기록과 생성 중·부분·실패 기록을 놓친다. 예: `worker/routes/fortune-tea-house.js:4811`, `worker/routes/master-love-codex.js:1613`, `worker/lib/fusion-fortune-consultation.js:224`.
- 일부 서비스는 목록 API 없이 결과 ID 조회 또는 최근 미완료 조회만 있다. 예: `worker/routes/nakshatra-ai.js:1032`, `worker/routes/neo-operation-room.js:1783`.
- 서로 다른 저장소의 사용자 ID 타입이 String/ObjectId로 다르다. Mongoose 모델 경로는 스키마 캐스팅을 하지만 native collection 통합 조회는 이를 직접 처리해야 한다.
- 찻집과 일부 결과 화면은 모달 또는 브라우저 저장 상태로만 재열람한다. 기존 화면 경로만 연결하면 직접 URL·새로고침 복원이 성립하지 않는 서비스가 있다.
- 오래된 점성술 기록은 `id`가 비어 있을 수 있다. 기존 상세 API는 `id`만 찾으므로 `_id` 보조 식별자를 사용하는 통합 조회가 필요하다. `worker/lib/models.js:1429`, `worker/routes/astrology-ai.js:1857`.
- 최애운명은 결과 저장 API와 모델이 있지만 현재 클라이언트가 API를 호출하지 않았다. 기존 저장된 문서는 조회할 수 있지만, 서버에 저장되지 않았던 과거 로컬 결과는 복원할 수 없다.

## 이름과 상품 식별

‘마스터 인연 코덱스’와 ‘마스터 인연의 서’는 `master-love-codex` 계열을 가리킨다. 현재 사용자 노출 정본은 ‘마스터 인연의 서’다(`js/core/service-registry.js:55`). 개인판 `master-love-codex`와 궁합판 `master-love-codex-compat`은 다른 상품이지만 같은 저장 컬렉션과 읽기 화면을 사용한다. `mode` 없는 과거 문서는 개인판으로 처리한다(`worker/lib/models.js:1205`). 별개의 중복 서비스로 등록하면 안 된다.

인생의 책/인생 총운도 `lifeBookAiConsultations`를 공유하지만 `consultationType`, `featureKey`에 따라 구분한다(`worker/lib/models.js:1283`, `worker/routes/life-book-ai.js:481`). 자미두수 전문가 상담/운명의 섬 12궁 상담은 `ziweiAiConsultations`를 공유하며 `serviceType`으로 구분한다(`worker/routes/ziwei-island-ai.js:34`, `worker/routes/ziwei-island-ai.js:838`).

## 서버 저장 서비스 연결표

‘기존 보관’은 서비스 내부에 재열람 연결이 있다는 뜻이다. 통합 나의 기록 화면에는 아래 저장소가 연결되지 않았다. `String`/`ObjectId`는 `userId`의 스키마 타입이다. 전문 상담의 기본 상태는 `generating / partial / delivery_pending / completed / generation_failed`이며 예외는 아래 표에 적었다. 저장소 이름은 `worker/lib/models.js`의 명시 collection 설정에서 확인했다. `ServiceExecutionTransaction`, `Payment`는 모델의 `collection.name`을 사용하는 것이 안전하다.

| 서비스 / 내부 ID | 신규 진입 | 저장소 · 소유권 · 기록 ID | 저장 API / 목록·상세 조회 API | 저장 형식 / 기존 렌더러 / 상세 URL | 기존 보관 · 과거 복원 · 상태 특이점 | 근거 |
| --- | --- | --- | --- | --- | --- | --- |
| 신년운세 / `new-year-ai-consultation` | `/new-year-ai-consultation/` | `newYearAiConsultations`, String, `id` | POST `/api/new-year-ai/start`; GET `/api/new-year-ai/result`(완료 목록), `?sessionId=`(상세) | `topic`, `messages`, 생성 파트; `NewYearAiClient`; `/new-year-ai-consultation/?sid=` | 내부 목록·복원 있음. 미완료 loadSession은 재개 생성으로 이어질 수 있음 | models:861; routes/new-year-ai:2553; app/new-year-ai-consultation/NewYearAiClient:1724 |
| 운명의 업 / `karma-destiny-ai-consultation` | `/karma-destiny-ai/` | `karmaDestinyAiConsultations`, String, `id` | POST `/api/karma-destiny-ai/start`, `/generate-batch`; GET `/api/karma-destiny-ai/result?sessionId=` | `topic`, `chapters`, `integratedResult`, 근거·레이더; `KarmaDestinyAiResultClient`; `/karma-destiny-ai/result/?sessionId=` | 내부 결과 조회 있음. 모든 챕터와 통합 해석 보존 필요 | models:913; routes/karma-destiny-ai:2822; app/karma-destiny-ai/result/KarmaDestinyAiResultClient:919 |
| 자미두수 전문가 상담 / `ziwei-ai-consultation` | `/ziwei-ai/` | `ziweiAiConsultations`, String, `id`, 일반 serviceType | POST `/api/ziwei-ai/generate`; GET `/api/ziwei-ai/result` 및 `?id=` | `topic`, `userQuestion`, `ziweiChart`, `messages`, groups; `ZiweiAiClient`; `/ziwei-ai/?cid=` | 내부 완료 목록 있음. 202 수신 시 기존 클라이언트가 generate를 호출할 수 있음 | models:1003; routes/ziwei-ai:2641; app/ziwei-ai/ZiweiAiClient:569,883 |
| 운명의 섬 12궁 심층 상담 / `ziwei-island-palace-consult` | `/island-consult/` | `ziweiAiConsultations`, String, `id`, `serviceType=ziwei-island-palace-consult` | POST `/api/ziwei-island-ai/start` 또는 `/generate`; GET `/api/ziwei-island-ai/result?sessionId=` | 궁·주제·명반·messages; `IslandConsultClient`; `/island-consult/?sessionId=` | 일반 자미 상담과 중복 등록 금지. 같은 컬렉션 다른 서비스 | routes/ziwei-island-ai:34,832,838; app/island-consult/IslandConsultClient:729 |
| 심화 자미두수 PDF / `ziwei-deep-pdf` | `/ziwei-ai/` 내 심층 보고서 영역 | `ziweiDeepReports`, String, `id` | POST `/api/ziwei-deep-report/generate`; GET `/api/ziwei-deep-report/result`, `?id=` | `ziweiChart`, `chapters`, `userQuestion`; `ZiweiDeepPdfPanel` | 내부 목록 선택 복원 있음. 독립 direct URL 연결은 추가 필요. 과거 별궁 상담 통합 안내가 있으나 기존 저장소는 별도 | models:1091; routes/ziwei-deep-report:16,795; app/components/ziwei/ZiweiDeepPdfPanel:311,322 |
| 운명의 나침반 / `destiny-compass-life-voyage` | `/destiny-compass/` | `destinyCompassReports`, String, `id` | POST `/api/destiny-compass-ai/report`, `/report/continue`; GET `/api/destiny-compass-ai/result?id=` | `question`, sections, field, basis, evidencePack; `SavedCompassReport`; `/destiny-compass/?reportId=` | 전용 저장결과 화면 있음. 일반 생성 훅과 분리되어 있다 | models:1051; routes/destiny-compass-ai:631,637; app/destiny-compass/_components/CompassApp:28,104 |
| 연애 비책 / `love-secret-ai-consultation` | `/love-secret-ai/` | `loveSecretAiConsultations`, String, `id` | POST `/api/love-secret-ai/start` 또는 `/generate`; GET `/api/love-secret-ai/result/:id` | `topic`, `userQuestion`, `sajuResult`, `messages`, 섹션; `LoveSecretAiResultClient`; `/love-secret-ai/result/?sessionId=` | 구 메시지 기반·신규 섹션 기반 형식 모두 필요 | models:1139; routes/love-secret-ai:1785; app/love-secret-ai/result/LoveSecretAiResultClient:821 |
| 마스터 인연의 서 개인/궁합 / `master-love-codex`, `master-love-codex-compat` | `/master-love-codex/` | `masterLoveCodexSessions`, String, `id` | POST `/api/master-love-codex/start`, `/generate`; GET `/api/master-love-codex/sessions`, `/session?sessionId=` | 양측 사주·자미 명반, compatibility, 20 chapters, loveDna; `MasterLoveCodexResultClient`; `/master-love-codex/result/?sessionId=` | 내부 서재 있음. mode 누락=solo. completed만 믿지 말고 manifest와 전체장 완료 검사 필요 | models:1202; routes/master-love-codex:1609,1630; app/master-love-codex/result/MasterLoveCodexResultClient:130 |
| 인생의 책 / 인생 총운 | `/life-book-ai/`, 총운 진입은 기존 subtype | `lifeBookAiConsultations`, String, `id`, `featureKey`/`consultationType` 분기 | POST `/api/life-book-ai/start`; GET `/api/life-book-ai/result?attemptId=` 및 기존 상세 경로 | `title`, `topic`, 사주, messages·섹션; `LifeBookAiResultClient`; `/life-book-ai/result/?attemptId=` | 기존 상품 스냅샷 유지. 두 SKU 임의 병합 금지 | models:1256,1283; routes/life-book-ai:481; app/life-book-ai/result/LifeBookAiResultClient:1410 |
| 숙요점 궁합 전문가 상담 / `sukuyo-compatibility-ai-consultation` | `/sukuyo-compatibility-ai/` | `sukuyoCompatibilityAiConsultations`, ObjectId, `_id` | POST `/api/sukuyo-compatibility-ai/generate`; GET `/api/sukuyo-compatibility-ai/result`, `?id=` | `topic`, `sukuyoResult`, 메시지 및 생성 파트; `SukuyoCompatibilityAiClient`; `/sukuyo-compatibility-ai/?cid=` | 내부 완료 목록·복원 있음. 구 빈 시드/유료 결과 덮어쓰기 방지 규칙 유지 | models:1320,1344; routes/sukuyo-compatibility-ai:2215,2252; app/sukuyo-compatibility-ai/SukuyoCompatibilityAiClient:1303 |
| 베다점 전문가 상담 / `vedic-ai-consultation` | `/vedic-ai/` | `vedicAiConsultations`, String, `id` | POST `/api/vedic-ai/start`; GET `/api/vedic-ai/result`, `?id=` | `topic`, `userQuestion`, planets/houses/dasha/차트, messages; `VedicAiResultClient`; `/vedic-ai/result/?id=` | 내부 완료 목록·전용 읽기 화면 있음 | models:1364; routes/vedic-ai:1687; app/vedic-ai/result/VedicAiResultClient:89 |
| 점성술 전문가 상담 / `astrology-ai-consultation` | `/astrology-ai/` | `astrologyAiConsultations`, ObjectId, `id` 또는 레거시 `_id` | POST `/api/astrology-ai/start`; GET `/api/astrology-ai/result/:id` | `topic`, `userQuestion`, astrologyChart, messages; `AstrologyAiResultClient`; `/astrology-ai/result/?id=` | 기존 API는 id 조회만. 빈 id 구문서는 새 통합 `_id` 상세로 복원해야 함 | models:1425,1470; routes/astrology-ai:1830,1857; app/astrology-ai/result/AstrologyAiResultClient:494 |
| 네오 팩폭 전략소/전략실 / `neo-operation-room-consultation` | `/neo-operation-room/` | `neoOperationRoomConsultations`, String, `id` | POST `/api/neo-operation-room/start`, `/refine`; GET `/api/neo-operation-room/result?attemptId=` | `topic`, `question`, methodSummary, initialBriefing, realityCheck, refinedOrder, versionHistory, messages; `NeoOperationRoomResultPage`; `/neo-operation-room/result/?attemptId=` | 최종 명령서·이전 버전 및 미완료 상태를 구분해야 함 | models:1489; routes/neo-operation-room:1757; src/features/neo-war-room/NeoOperationRoomResultPage:419 |
| 나크샤트라 전문가 상담 / `nakshatra-ai-consultation` | `/nakshatra/ai/` | `nakshatraAiConsultations`, String, `id` | POST `/api/nakshatra-ai/start`, `/generate`; GET `/api/nakshatra-ai/result?attemptId=` | `question`, decks, sections, factSummary; `NakshatraAiClient` | 완료 목록 없음. 기존 클라이언트 직접 URL 결과 식별자 로딩 추가 필요. enum에는 partial 없음 | models:1543; routes/nakshatra-ai:1007,1032; app/nakshatra/ai/NakshatraAiClient:207 |
| 초융합 심층 리딩 / `fusion-fortune-consultation` | `/fusion-fortune/` | `fusionFortuneConsultations`, String, `id` | POST `/api/fusion-fortune/generate` 및 `/generate/stream`; GET `/api/fusion-fortune/result`, `?id=` | `title`, `inputSummary.topic`, 구조화 result, stage, qualityTier; `FusionFortuneClient` 및 FusionResultThread/Visualization; `/fusion-fortune/?cid=` | 기존 내부 최근 목록 있음. URL은 id가 아니라 cid. 구 stage 누락=2, 기본 full이지만 실제 저장 상태 검사 필요 | models:1861; routes/fusion-fortune:477; app/fusion-fortune/FusionFortuneClient:2364,3154 |
| 연이 운명의 찻집 사주·타로·사주궁합·숙요궁합 | `/fortune-tea-house/` | raw `fortune_tea_house_results`, String, `resultId`, serviceScope | POST `/api/fortune-tea-house/consult`; GET `/api/fortune-tea-house/results`, `/results/:id`, `/pending` | `questionSummary`, mode, result(카드·명식·관계·텍스트), honeyLetter; `TeaHouseResultSheet` 및 mode별 ResultPanel | 기존 모달 보관함 20개. 직접 resultId URL 로딩 추가 필요. 기존 상세는 completed만. generating/delivery_pending 별도 checkpoint | routes/fortune-tea-house:4486,4737,4811,4861; src/features/fortune-tea-house/components/TeaHouseHistoryPanel:90,119 |
| 휴먼 디자인 리포트 / `human-design-report` | `/human-design/report/` | `humanDesignReports`, String, `id` | POST `/api/human-design-report/start`, `/generate`; GET `/api/human-design-report/result?reportId=` | `basis.chart`, sections, summary, generationProgress; `HumanDesignReportClient`; `/human-design/report/?reportId=` | URL 재열람 계약 있음. 저장 근거 차트가 누락되면 기존 계산 archive 조회로 보완 | models:1663; routes/human-design-report:650; app/human-design/report/_lib/useReportGeneration:365 |
| 휴먼 디자인 차트 / `human-design-chart` | `/human-design/` | `humanDesignCalculations`, String, `id` | POST `/api/human-design/chart`; 기존 GET 목록 없음 | `calculation`, birthInput; `HumanDesignClient`의 바디그래프 | 실제 서버 archive 있음. 새 조회는 입력 재계산 없이 저장 calculation 제공 필요 | models:1582; routes/human-design:90,105,208 |
| 휴먼 디자인 과거 해석 | 신규 생성 중단, 후속은 리포트 | `humanDesignInterpretations`, String, `id` | POST `/api/human-design/interpretation`은 기존 completed만 반환, 없으면 410 | `userQuestion`, sections, summary, calculationId | 과거 paid 결과 계속 읽게 하는 코드 존재. 새 native GET 상세·저장 차트 조인 필요 | models:1624; routes/human-design:256,278 |
| 최애운명 카드 / `destiny-bias` | `/saju/destiny-bias/` | `DestinyBiasCard`의 model.collection.name, ObjectId userId, `_id` | POST `/api/destiny-bias/cards`; GET 같은 경로(page/limit 목록); DELETE `/cards/:id`. 기존 단일 GET 상세는 없음 | `title`, `headline`, `summary`, `reportText`, `canonical`, `sharePayload`, score/grade/themeKey. `canonical`은 Mixed이며 현재 VM과 동일 형식이라는 계약 없음. 새 소유권 검증 상세 필요 | 상태 필드 없음. reportText 또는 summary가 있어야 저장 가능하므로 ‘저장됨’으로 표시. 현재 프론트는 입력 draft만 복원하며 cards API 호출이 없다. 서버에 남은 과거 결과를 먼저 연결하고 현재 신규 저장 연결도 필요 | models:2272,2288; routes/destiny-bias:159,173,191,195,229,248; worker/index:1318; app/saju/destiny-bias/DestinyBiasClient:364,382,744 |
| 그 사람의 바람끼 테스트 / `relationship-boundary-test` | `/relationship-boundary-test/` | `relationshipBoundaryTests`, String, `id` | POST `/api/relationship-boundary-test/generate`; GET `/api/relationship-boundary-test/result?sessionId=` | score, grade, character, summary, sections, finalMessage, sajuFacts; `RelationshipBoundaryTestClient` | 실제 저장 있음. 과거 직접 URL 지원 여부와 재개 정책은 구현 변경 전 확인해야 함 | models:1961; routes/relationship-boundary-test:16,231,241 |
| 연이·네오 기존 대화 / `fortune-chat` | `/fortune-chat/?character=yeoni` 또는 neo | `fortuneChatSessions`, ObjectId, `sessionId` | POST `/api/fortune-chat/sessions/:id`; GET 동일 상세. bootstrap는 새 세션·익명 merge 쓰기 수행 | ordered `messages`, characterId, selectedTopic, generationStatus; `FortuneChatClient`; `/fortune-chat/?session=` | 완료 목록 없음. 80개 메시지 저장 한도는 기존 정책. empty bootstrap 세션 제외 필요 | models:1745; routes/fortune-chat:29,39,94,99; app/fortune-chat/FortuneChatClient:335 |
| 연이·네오 신규 챕터 상담 / `fortune-chat-consultation` | `/fortune-chat/`의 ConsultationRoom | `yeongnyangi_requests`, ObjectId, `_id` String 64hex. featureKey와 persona 둘 다 제한 | POST `/api/fortune-chat/consultations`, `/:id/activate`, `/:id/generate`; GET `/consultations?persona=`, `/:id` | `snapshot.analysis.consultation.question`, product/systems, `chapters`; `ConsultationRoom`; `/fortune-chat/?consultation=` | 반드시 포함. state=CREATED/PAID/GENERATING/AWAITING_FOLLOWUP/COMPLETED/FORTUNE_FAILED/REFUNDED 등. 기존 GET은 readAndContinue 호출 | lib/yeongnyangi-models:7,15,61; routes/fortune-chat-consultations:76,120; app/fortune-chat/FortuneChatEntry:15 |

위 표에서 `models`, `routes`, `lib`로 적은 locator는 각각 `worker/lib/models.js`, `worker/routes/`, `worker/lib/` 기준이다. User 정보의 이름·생년월일을 제목 대체로 노출하지 않는다. topic이 실제 저장값인 경우만 제목/검색에 사용하고, 질문이 없는 상품에는 빈 질문을 허용한다.

## 공통 결과 저장소에 들어가는 추가 서비스

아래 결과는 별도 전문 모델 대신 기존 실행 저장소에 저장된다. 모두 통합 기록의 대상이다. 공통 실행 레코드 전체를 결제 기록으로 간주하지 말고 실제 result-bearing 필드를 검사해야 한다. 동일 대표 상담의 `reportType=expertFollowUp`은 독립 카드로 중복 노출하지 않고 원래 messages에 병합한다(`worker/lib/expert-follow-up-delivery.js:29`).

| 서비스 / featureKey | 저장 위치 · 식별자 · 실제 결과 | 생성 API / 기존 읽기 API | 렌더러 연결점과 과거 지원 | 근거 |
| --- | --- | --- | --- | --- |
| 사주 전문가 질문 / `saju_ai_prompt_generator` | `paid_execution_records`, String userId, executionId/resultId; `result`에 본문·섹션·계산 근거 | POST `/api/fortune/saju-ai-consultation/create`; GET `/api/fortune/saju-ai-consultation/result?resultId=` | 정적 사주 상담 UI. 저장 결과를 기존 payload로 복원해야 하며 계산 함수 재실행 금지 | worker/lib/saju-ai-prompt.js:23; worker/routes/fortune.js:1201,5204,6947 |
| 베다 프라슈나 / `vedic_prashna_prompt` | `paid_execution_records`; executionId, orderId; `result.prashnaResult`, `result.order` | POST `/api/fortune/vedic/prashna/generate`; GET `/api/fortune/vedic/prashna/result?orderId=` | 기존 결과 조회는 lastViewedAt만 갱신. archive native GET은 쓰기 없이 저장값 반환 가능 | worker/routes/fortune.js:3611,3976,6992 |
| 작명 / `premium-naming-prompt` | `paid_execution_records`, String, executionId; `result.namingPrompt`. 과거 Payment.namingPrompt도 존재 | POST `/api/naming-prompt/generate`; GET `/api/naming-prompt/result/:id` | `NamingAiResultClient`. generatedResult 없던 과거 문서는 completed generatedPrompt 폴백. 같은 결과의 Payment mirror와 execution 중복 제거 필요 | worker/routes/naming-prompt.js:1193,1223,1250,1631; app/naming-ai/result/NamingAiResultClient:155 |
| 십이지신 천운 타로 / `tarot-year-fortune` | `paid_execution_records`; executionId/resultId; result.cards/reading/consultingHighlights/engineMeta | POST `/api/tarot/reading`; GET `/api/tarot/year/result?resultId=` | 정적 천운 타로 기존 카드·reading 표현 유지 | worker/routes/tarot.js:106,166,1743,1907 |
| 자미·숙요·점성·베다 전문가 질문 / `ziwei_ai_prompt_generator`, `sukuyo_ai_prompt_generator`, `astrology_ai_prompt_generator`, `vedic_ai_prompt_generator` | ServiceExecutionTransaction(userId ObjectId), executionKey; `metadata.paidNarrative`, `metadata.result` | POST `/api/fortune/{ziwei,sukuyo,astrology,vedic}/ai-prompt`; GET `/api/fortune/{...}/ai-result?resultId=` | 기존 질문 생성 UI. parts/tasks/원본 계산 근거를 해당 체계별로 복원 | worker/lib/feature-question-delivery.js:30; worker/routes/fortune.js:4417,4581,5565,5819,6920 |
| 우리는 무슨 사이 타로 / `tarot-love-relationship` | 동일 실행 저장소; `metadata.paidNarrative`와 result | POST `/api/tarot/love-reading`; GET `/api/tarot/love-result?resultId=` | 카드 및 관계 reading 구조 보존 | worker/lib/love-tarot-delivery.js:53; worker/routes/tarot.js:1759,1844 |
| 말과 행동 사이 타로 / `tarot-mindscan` | 동일 실행 저장소 | POST `/api/tarot/mindscan`; GET `/api/tarot/mindscan-result?resultId=` | mindscan 전용 구조 보존 | worker/lib/mindscan-delivery.js:59; worker/routes/tarot.js:1761,2007 |
| 타로 상담 제작 / `tarot-prompt-maker[-standard,-deep,-master]` | 동일 실행 저장소 | POST `/api/tarot/oracle-consultation`; GET `/api/tarot/oracle-result?resultId=` | `TarotPromptMakerClient`: positionReadings/cardSynergies/timeline/actions 및 cards를 복원. 원본 resumeInputs는 읽기 전용 입력복원 용도 | lib/tarot/oracle-consultation-pricing.mjs:18; worker/lib/tarot-oracle-delivery.js:68; app/tarot/prompt-maker/TarotPromptMakerClient:2949 |
| 정신분석 해몽 / `dream-psycho-analysis` | 동일 실행 저장소 | POST `/api/dream/psycho-analysis`; GET `/api/dream/psycho-result?resultId=` | `/dream/psycho/` 기존 꿈 분석 결과 UI | worker/routes/dream.js:14,1203,1225 |
| 애니멀 토템 / `animal-totem-basic`, `animal-totem-deep` | 동일 실행 저장소 | POST `/api/animal-totem/reading`; GET `/api/animal-totem/result?resultId=` | 기본/심층 상품 구분, 토템과 structured 결과 보존 | worker/routes/animal-totem.js:32,33,640,666 |
| 지오맨시 / `geomancy` | 동일 실행 저장소 | POST `/api/oracle/geomancy`; GET `/api/oracle/result?resultId=` | 기존 지오맨시 도형/해석 보존 | worker/routes/oracle.js:140,161,177 |
| Divya Yoga / `yoga-guru-per-use` | 동일 실행 저장소 | POST `/api/yoga-guru/`; GET `/api/yoga-guru/result?resultId=` | 기존 코스 structured 표현 보존 | worker/routes/yoga-guru.js:59,80,97 |
| 반려동물 사주·궁합 / `pet-saju-ai-consultation`, `pet-compatibility-ai` | 동일 실행 저장소 | POST `/api/pet-saju-ai/report`, `/compat`; GET `/api/pet-saju-ai/result?resultId=` | 반려동물 두 종류 구분. 저장된 facts·파트 보존 | worker/routes/pet-saju-ai.js:20,24,210,233 |
| 기존 유료 대화 답변 / `fortune-chat-consultation` | 동일 실행 저장소; `metadata.paidNarrative.parts.answer`, result | 기존 guardian 생성; GET `/api/fortune/guardian/result` | fortuneChatSessions에 병합된 답변과 중복되지 않게 연결. legacy 단독 저장답변의 존재를 결과-bearing 검사로 확인 | worker/lib/guardian-paid-delivery.js:17,23; worker/lib/guardian-fortune-usage.js:23 |
| 손금 / `palm-reading-general` | 동일 실행 저장소; `metadata.palmResult`, 선택적 palmRaw; executionKey | POST 손금 판독; GET `/api/palm/result?requestId=` | 업로드 사진 저장 안 함. 저장 판독 구조만 복원. 기존 읽기 API는 requireExisting 결제 근거 검사 | worker/lib/palm-result-delivery.js:9,21,31; worker/routes/palm.js:215 |
| 천체의 선율 / `tarot-celestial-harmony` | 동일 실행 저장소; `metadata.celestialDelivery`, `metadata.result` 또는 과거 `metadata.archive` | POST/GET `/api/celestial-harmony/`; reportId/transactionId/requestId/sessionId/resumeResultId로 상세 조회 | `celestial-harmony.html` 기존 결과 UI. 90일 retention으로 과거 삭제 가능 | worker/lib/celestial-delivery-store.js:60,104; worker/routes/celestial-harmony.js:207,218 |
| FPTI 심층 / `premium-fpti-report` | 동일 실행 저장소; `metadata.archive`, executionKey/reportId | POST/GET `/api/fpti/deep-report?reportSignature=` | 기존 FPTI 7챕터 전체 표시 필요. 180일 retention | worker/routes/fpti.js:12,803,849,860,1173,1220 |

## 소유권·상태·읽기 전용 상세 원칙

1. 모든 어댑터는 서버에서 인증된 사용자 ID와 저장소 소유자 필드를 함께 쿼리한다. String/ObjectId 혼용 레거시 지원은 같은 인증 사용자 ID의 두 타입만 허용한다. arbitrary ownerId를 클라이언트에서 받지 않는다.
2. native 조회 시 `scopeConnection()`의 DB를 사용하고 model.collection.name으로 실제 컬렉션명을 취득한다. 런타임 DB scope와 Mongoose cast를 잃지 않는다.
3. 완료 상세 경로는 저장 본문 반환만 한다. 기존 클라이언트의 poll·POST generate·ensureAccess·activate·recovery 훅을 시작하지 않도록 readOnly 입력을 분리한다. 환불/취소 차단은 기존 `isStoredPaidResultRevoked` 등 저장결과 정책을 재사용한다.
4. 완료 판정은 상태 태그와 저장 콘텐츠를 함께 확인한다. 특히 마스터는 `isCodexArchiveComplete`, 초융합은 stage/qualityTier, 신규 대화는 manifest/completedChapters/chapters를 대조한다. 일부 챕터만 있으면 부분 기록으로 표시한다.
5. 목록은 질문/제목/날짜/상태/식별자만 내려준다. messages와 대형 result/chapters 전체를 목록 projection에 넣지 않는다. 메시지 질문이 필요하면 서버 aggregation으로 user 역할 첫 질문만 제한적으로 추출한다.
6. 서비스별 생성 중 복구와 완료 재열람을 다른 행동으로 제공한다. `readAndContinueFortune`은 새 기록 조회 전용 API에서 호출하지 않는다.

## 기존 렌더러에 readOnly payload를 공급할 위치

- 전문 ResultClient 컴포넌트: URL에 archive 식별자가 있을 때 인증된 `/api/records/:source/:id`류의 조회만 실행하고 해당 서비스 payload를 기존 state에 넣는다. 생성 useEffect보다 먼저 분기한다. `AstrologyAiResultClient:494`, `KarmaDestinyAiResultClient:919`, `LifeBookAiResultClient:1410`, `LoveSecretAiResultClient:821`, `MasterLoveCodexResultClient:130`이 로더 위치다.
- 찻집: `TeaHouseHistoryPanel`의 `onSelectResult`가 기존 결과를 `FortuneTeaHousePage`에 전달하는 흐름을 재사용한다. 서버 상세 URL 쿼리를 읽어 같은 callback/state 경로로 넣으면 명식·카드·모드별 panel을 그대로 쓸 수 있다.
- 초융합: `FusionFortuneClient:2340`의 저장 ID 로더와 `cid` useEffect 경로를 재사용한다. 신규 생성/복구와 읽기 상태를 구분한다.
- 나크샤트라: `NakshatraAiClient:207`의 pollResult 내부에서 completed payload를 보여주는 부분을 순수 적용 함수로 분리하고, archive 로더는 GET 한 번 후 그 함수만 실행한다. 기존 generate 재개 루프를 호출하지 않는다.
- 신규 대화: `worker/yeongnyangi/service.ts`의 `presentFortune`으로 native owned row를 변환하고 `ConsultationRoom`의 `show(next)` 경로에 넣는다. 기존 `consultationApi.read`는 서버 readAndContinue를 호출하므로 조회 전용 대체가 필요하다. 결과 화면은 이미 chapters를 기존 화자 세계관에 따라 표시한다.
- 레거시 휴먼디자인: 저장 calculation과 interpretation을 userId+calculationId로 조인해 기존 바디그래프 및 sections를 제공한다. birthInput으로 새 calculate/post를 하지 않는다.
- 일반 structured 결과는 서비스별로 카드·명식·도형·표의 컴포넌트를 유지한다. 임의 JSON 통째 렌더링이나 모든 데이터를 일반 텍스트 보고서 하나로 대체하는 것은 요구사항 충족이 아니다.

## 제외 범위와 데이터 보존 제한

| 저장소/후보 | 판단 | 근거 |
| --- | --- | --- |
| `guardianFortuneGenerationAttempts`, `fusionFortuneGenerationAttempts` | 예약·중복요청 잠금이며 본문 없음. 독립 결과에서 제외 | models:1761,1841 |
| `guardianFortuneSharedSnapshots`, `resultSharedSnapshots` | 공개 공유용 요약, owner userId 없음, TTL. 개인 소유권을 추정해 보관함에 넣지 않음 | models:1778,1813 |
| `destinyBiasShares` / DestinyBiasShare | 원격 K-pop 개편의 공개 공유 요약·90일 TTL. owner userId 연결이 없으므로 개인 보관함 원본으로 사용하지 않음. 개인 전체 결과는 별도 DestinyBiasCard에 저장 | worker/lib/models.js의 destinyBiasShareSchema; worker/lib/destiny-bias-share.js |
| `PointHistory`, `Payment` 일반 문서, `MonthlyCreditLedger`, entitlements | 결제/이용권 증거. 결과 본문 없으면 운세 결과로 노출하지 않음. Payment.namingPrompt는 본문 있는 예외 | models:298,384,419; routes/naming-prompt:1223 |
| 일반 사주·자미·숙요·베다·점성·타로 무료 계산 | 조사한 worker 모델·routes 범위에서 별도 소유자 연결 private 영속 결과 모델은 확인되지 않음. 공유 snapshot과 계산 cache를 private 기록으로 간주하지 않음 | models:1815; worker/routes/astro.js, worker/routes/fortune.js의 계산/프롬프트 경로 |
| `yeongnyangi_requests` 일반 영냥이, `yeongnyangi_free_readings` | 별도 영냥이 서비스 영역. 꿀꿀 대화 persona+featureKey 레코드만 이번 공통 저장 어댑터의 꿀꿀 대상으로 분류 | worker/lib/yeongnyangi-models.js:18,61,88; routes/fortune-chat-consultations:68 |
| KV | 좁힌 worker/routes 및 결과 저장 관련 worker/lib 검색에서 운세 본문 KV 영속 저장은 확인되지 않음. cache/lock/usage를 운세 archive로 간주하지 않음 | 코드 검색 실측이며 운영 KV 내용은 미조회 |
| `user_rpg_progresses` / UserRpgProgress | 계정 경험치·레벨·연속 출석·해금 키만 저장한다. unlockedSecretFortunes는 운세 본문이 아닌 해금 식별자 배열. 독립 운세 기록에서 제외 | models:2030,2044; routes/rpg:829,875,1090,1368,1374; GET `/api/rpg/progress`:1930 |
| `user_rpg_reward_logs` / UserRpgRewardLog | 레벨/출석 보상·월정석 지급·도감 수집 소유권 로그. collectible 저장에는 rewardKey와 level만 있고 GET은 `{key,at}`만 반환. meta.title/description도 보상 안내문이며 상담 결과 본문이 아니다 | models:2080,2094; routes/rpg:35,847,1315,1782,1802,1810,1835; GET `/api/rpg/collectibles`:1954; app/destiny-compass/_lib/rpg-bridge:88,95 |
| `user_daily_quest_logs` / UserDailyQuestLog | 미션 완료 증거·EXP·missionSnapshot을 저장한다. 상담을 받았던 결과가 아닌 생활 미션 안내/완료 내역이므로 제외 | models:2053,2071; routes/rpg:1334,1346; GET `/api/rpg/daily/status`:1922 |
| DailyFortuneSubscription | 이메일 구독 설정·운세 발송용 sajuSnapshot과 발송 시각/오류다. userId 소유권 연결 및 발송된 운세 본문 archive가 없다. 이메일만으로 현재 로그인 사용자 소유를 추정하지 않는다 | models:2103,2113,2124; routes/subscriptions:108,135,142; lib/daily-fortune-task:166,499,544,567 |
| `daehan_purchases` | 자미두수 대한 접근권의 기존 구매 여부 fallback이다. status는 권한과 profileId를 반환하며 운세 결과 본문을 저장/조회하지 않는다 | routes/ziwei-daehan:34,54,63,76,109,151 |
| `ProfileCard`, User.destinyProfiles / tamagotchi | 프로필 생년월일·위치 입력과 계정/육성 상태다. 제공된 상담 결과 archive가 아니며 프로필 개인정보를 임의 기록 제목·요약으로 노출하지 않는다 | models:117,122,268,290; routes/profile:1395 |
| `llm_response_cache` | cacheKey/text/provider/expiry만 가진 결정적 응답 캐시이며 사용자 소유자 필드가 없다. TTL 캐시를 개인 상담 원본 저장소로 사용하지 않는다 | models:691,693,703 |
| fortune_tea_house_honey_wallets/ledgers, neo_operation_room_badge_wallets/ledgers | 서비스별 포인트·지갑 원장. 같은 모듈의 실제 결과 저장은 별도 fortune_tea_house_results 및 NeoOperationRoomConsultation으로 이미 분리되어 있다 | routes/fortune-tea-house:4484,4485,4486; routes/neo-operation-room:1390,1391 |
| 추가 모델 modules: app-store, gift, kakao-crm, review, feedback | 구매 의도·선물 권한·마케팅 동의·후기·버그 제보다. 사용자 본문이 있어도 제공받은 운세/상담 결과 본문은 아니므로 제외 | lib/app-store-models:15; lib/gift-models:6,32,41; lib/kakao-crm-models:5,11,15; lib/review-models:22; lib/feedback-models:99 |

모델의 선언만으로 운영 인덱스가 존재한다고 말할 수 없다. `db.js` autoIndex=false 계약과 `models.js:1894` 주석을 확인했다. 기존 기록을 옮기는 데이터 마이그레이션은 필요하지 않지만, 새 목록 쿼리에 필요한 인덱스는 반복 실행 가능한 선언 스크립트로 검토할 수 있다. 운영 인덱스 실행은 이 조사에서 하지 않았다.

실행 저장소는 `retentionUntil` TTL이 있다(`models.js:810`). 이미 TTL로 삭제된 90일/180일 결과를 UI 연결이나 데이터 마이그레이션으로 복구할 수는 없다. 남은 과거 문서는 원본 저장소의 안전한 조회로 복원한다.

2026-10-05 추가 조사에서 `DestinyBiasCard`가 기존 통합 레지스트리의 누락 결과 저장소로 확인됐다. `reportText`는 최대 30,000자로 저장하고 `summary` 또는 `reportText` 중 하나가 있어야 POST가 성공한다(`routes/destiny-bias:181,187`). API는 인증 사용자 ID를 서버에서 지정하며 목록/삭제도 userId를 함께 조건으로 사용한다. 상태가 없는 이 레거시 저장소에서 ‘완료된 상담 전체’ 여부를 새로 지어내면 안 된다. 현재 신규 최애운명 UI의 입력 draft는 보관된 결과와 구분해야 한다. 새 조회는 원본 `_id`를 사용하면 되며 데이터 이동 마이그레이션은 필요하지 않다. `canonical`을 기존 컴포넌트에 공급할 때는 `DestinyBiasResultViewModel` 형식 여부를 검사하고, 다른 구형 객체는 누락을 숨기지 않는 서비스 전용 호환 표시가 필요하다. 순수 카드 컴포넌트는 `app/saju/destiny-bias/components/BiasDestinyMainCard.tsx:18`(vm props), 전체 VM 타입은 `app/saju/destiny-bias/lib/types.ts:22`이다.

## 추가 구현·검증 체크리스트

- 모든 result-bearing source와 서비스별 분기값을 통합 registry에 등록하고 coverage 테스트로 새 누락을 막는다.
- keyset cursor를 `(createdAt, source, _id)` 안정 순서로 구성하고, 서비스별 실패 시 실패 범위와 retry 커서를 유지한다. 서비스 하나가 장애라고 성공 페이지의 과거 기록을 건너뛰지 않는다.
- 검색·카테고리 필터는 페이지를 받은 뒤 client 필터만 하지 않고 서버 쿼리와 모든 source에 동일하게 적용한다.
- 조회 실패를 빈 목록과 구분하고 일부 성공·모두 실패를 각각 테스트한다.
- 완료 결과 readOnly 렌더 경로와 부분 결과 복구 경로를 구분하며 POST 결제/생성 API 호출이 0인지 mock network 검증한다.
- 타 사용자 목록·상세 접근 차단, native `_id` fallback, malformed source/id/cursor를 테스트한다.
- 기존 renderer의 전체 chapters, 구조화 차트·카드·표, messages 순서·역할, HTML sanitizer 정책을 확인한다.
- 대표 상담 hub 가격은 기존 billing/product registry에서 읽으며 flag·운영 상태를 실제 API status로 판정한다.
- 목록 검색어·필터·scroll 복원, 안전 영역, 하단 카드 가림, 브라우저/웹뷰 뒤로·새로고침은 비식별 mock으로 360/390/430px에서 검증한다.

이 문서는 조사 인벤토리다. 구현·테스트 통과 여부는 별도 최종 작업 보고와 실제 테스트 결과에서 확인해야 한다.

원격 K-pop 개편을 병합한 뒤 최애운명 저장 연결을 해당 새 화면에 맞춰 보완했다. 기존 수동 저장은 일부 요약만 저장했으므로 과거 그 요약에서 전체 새 포토카드를 추정해 복원하지 않는다. 남아 있는 본문을 그대로 표시한다. 새 로그인 결과는 `canonical.chemiReport`와 생일이 제거된 `viewModel`을 저장하고 포토카드·전체 탭·근거 표를 다시 연다. 불완전한 과거 canonical은 순수 형식 검사 후 형식 안내와 읽을 수 있는 저장 문장만 표시하며 내부 구조명·빈 항목을 노출하지 않는다. 저장소 개수와 데이터 이동 없는 조회 방식은 같다.

## 이번 구현의 연결 계약

- 공통 정본 `lib/records/service-registry.js`: 25개 저장 어댑터(23개 모델과 2개 raw collection), 공유 실행 저장소의 25개 상품 변형. 한 컬렉션을 공유하는 인생 총운/인생의 책, 자미두수/운명의 섬, 코덱스 개인/궁합은 문서 식별자로 구분한다.
- 모든 표의 보관 결과는 `GET /api/records` → `/records/` 카드 → `GET /api/records/detail?source=<adapter>&id=<saved-id>`로 연결했다. 클라이언트에서 받은 userId를 신뢰하지 않고 인증 소유자 String/ObjectId만 서버 조건에 넣는다. 환불·취소 차단도 기존 정책을 사용한다.
- 완료 찻집은 `/fortune-tea-house/?resultId=<saved-id>&readOnly=1`에서 기존 결과 패널을 사용한다. readOnly는 꿀편지 자동 생성·재개를 중지한다. Neo 문서, Fusion 전체 펼침, Codex 전체 챕터, 나크샤트라 덱, HD 바디그래프, 신규 최애운명 VM, 연이·네오 새 상담의 원래 결과 컴포넌트는 저장된 데이터만 공급한다. 나머지 과거 형식은 챕터·카드·표·HTML·명식의 구조를 보존하는 호환 표시를 사용한다. 기본 결과 ID URL과 공유 기능은 유지했다.
- 목록은 메타데이터 projection과 저장소별 `limit+1`만 읽고 본문 전체를 보내지 않는다. createdAt/_id keyset, 사용자/조건에 묶인 스냅샷 커서, 저장소별 위치를 사용한다. 작명 Payment 미러와 기존 대화에 병합된 실행 결과는 페이지 제한 전에 소유권으로 중복 제거한다. 실패한 저장소의 커서를 전진시키지 않는다.
- 저장된 제목·질문·요약만 카드에 사용한다. 개인정보 입력이나 생년 정보는 목록에 넣지 않는다. 생성·부분·실패·대화·레거시 저장 상태를 구분하고 Codex의 전체 장·분량 검사로 부분본을 완료처럼 봉인하지 않는다.
- 신규 최애운명은 기존 cards POST에 완성된 VM을 저장한다. 동일 사용자·동일 저장 요청의 `_id`를 결정적으로 만들어 재시도 시 중복되지 않는다. 저장 실패는 결과를 폐기하지 않고 별도 재시도 버튼을 제공한다. 과금·재계산·LLM 재호출은 없다.
- 대표 허브 `/consultations/`는 찻집/Neo/Fusion/Codex를 먼저, 신년/업/연애 비책/인생의 책을 다음에 배치한다. 캐릭터 대화는 별도 영역이다. 가격은 기존 PriceBadge 상품 정본에서 읽는다. 대표 상담의 완료 화면에 공통 저장 결과/전체 보관함 링크를 추가했다.
- 데이터 이동 마이그레이션은 불필요하다. `node scripts/records-index-plan.mjs`는 25개 저장소의 읽기 전용 인덱스 계획만 출력한다. `ensureRecordIndexes(db)`는 운영자가 승인된 점검 환경에서 필요할 때 호출하는 반복 가능한 createIndex 계약이며 API/Worker 시작에서 호출하지 않는다. 운영 인덱스 생성·explain과 TTL 삭제 결과의 백업 복구는 이번에 실행하지 않았다.

## 검증 경계

22개 신규 Worker mock 테스트와 기존 영향 범위 Node 54개가 통과했다. 첫 전체 실행은 Jest 335개 suite/5,009개 통과 후 Node 2,424개 중 9개가 실패했다. 새 동작에 맞는 테스트 브라우저 모형(검색 URL, readOnly)을 보완하고, 로그인 링크의 후행 슬래시와 코어 번역 사전 생성 누락을 수정했다. 관련 54개 재검증은 모두 통과했다. 최신 main 병합 후 공식 check:fast와 main CI를 다시 확인한다.

비식별 browser 16개 서로 다른 시나리오는 360/390/430/1280px, 목록 추가 조회·검색·뒤로 가기 상태 복원, 게스트·빈 기록·전체/부분 오류, 대표 4개+구·신 대화+구형 점성술+부분 결과의 직접 URL·새로고침을 통과했다. 생성/소비/결제/쓰기 요청은 0회였다. 연속 실행에서 발생한 dev manifest 오류 때문에 마지막 3개는 분리 실행했고, 최종 Neo 대비 수정 후 해당 상세를 다시 실행했다. 자료는 실행별 근거를 포함한 `build-cache/records-hub/verification.json`과 같은 폴더 PNG이며 실제 사용자 정보는 없다. Codex의 외부 R2 이미지는 동일 캐릭터의 로컬 fixture로 대체했으므로 운영 이미지 가용성 증거는 아니다.

독립 Assessment A/B와 impeccable detector(0 findings)로 화면과 소스를 점검했다. 검색 포커스·Neo 중복 필드·캡처의 활성 탭 대기를 수정했다. 실기기/네이티브 웹뷰/정량 대비/운영 DB 데이터·인덱스/운영 이미지/실결제·실 LLM은 미검증이다. 일반 구조화 레거시 결과의 일부 필드 라벨은 한국어이며 비한국어 결과는 추가 문체 검토가 필요하다.

원격 병합 후 전체·부분 최애 읽기 2개를 추가해 총 18개 서로 다른 browser 시나리오를 검증했다. 최신 4개 화면 폭 검사는 마지막 버튼의 실제 좌표가 하단 내비게이션보다 위인지도 확인한다. 최종 main SHA의 CI 및 자동환불 브라우저 fixture 결과는 `docs/records-consultation-work.md`와 종료 보고를 기준으로 한다.
