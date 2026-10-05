---
status: done
---
# 달빛 예화 기록 읽기 구현

## 요청·범위
사용자 승인 계획: 달빛 예화 보관함·상담 허브, 전체 25개 저장 어댑터 및 공통 상품 25종의 원래 결과 경험. 기존 소유권·페이지네이션·부분 실패·가격·환불 계약을 보존한다. 완료 재열람의 생성/결제/차감/복구 요청은 0회다.

## 작업 위치
- 워크트리: D:/Development/codedestiny-worktrees/records-yehwa-ui-20261005-153406
- 기준: 05255b33364d8f002448d23510705d2d3cdc7c1c
- 문서 63a5303 및 선행 b9ec1a57f: 워크트리에 통합. 공유 main의 변경과 index.lock은 보존.
- primary의 HTML/CSS/RSS/marketing 및 staged 변경은 이 작업 소유가 아니다.

## 표면 브리프
Operate: 목록 검색과 재열람. Read: 서비스 고유의 전체 결과.
목록은 한 열의 서가 기록, 작은 표지와 제목·상태·날짜·다시 보기 순서. 허브는 4개 대표 상담을 모바일 한 열·데스크탑 두 열로 비교한다. 이후 대표 상담과 캐릭터 대화. 예화 모티프는 기존 생성 SVG, 폰트·색은 현재 토큰. 상세 본문은 각 서비스 표시 컴포넌트와 폭·명반·카드·목차를 사용한다. 모든 객체를 카드로 중첩하는 범용 출력은 제거한다.

## 진행
- [x] Git/잠금/원격 기준 확인 및 격리
- [x] 문서 커밋 통합
- [x] 서비스별 표시 분기 정본 추가
- [x] 서비스별 원본 표시부 연결·호환 처리
- [x] mock 자동 검사·실제 화면 및 독립 검토
- [x] main 통합·push·정확한 SHA CI
- [x] 자기 검증 자료 보존·배수 준비 (문서 전달 후 자기 워크트리만 제거)

## 증거 경계
현재 구현·검증 진행 중. 기존 문서의 CI·18개 브라우저 사례를 이번 결과로 인용하지 않는다. 원래 결과 컴포넌트에 부수효과가 있으면 표시부만 사용한다. 저장되지 않은 차트·사진·TTL 삭제 결과는 복원하지 않는다.

## 서비스 대응표

입력 계약은 source/serviceId/content를 유지한다. 분기 정본은 `lib/records/reading-registry.js`, 순수 본문 변환은 `reading-content.js`. 원본 표시부에 재생성 훅이 있는 경우 페이지 전체를 렌더하지 않는다. 저장 상태 판단은 기존 API가 담당한다. HTML은 기존 sanitizer를 거친다.

| 키 | 원본 소스 | 저장 표시 필드 | 연결 표시부 | 과거/부분 처리 · 검증 사례 |
|---|---|---|---|---|
| `tea` | `app/fortune-tea-house/SavedTeaReading.tsx` | `sections`, `result`, `honeyLetter` | SavedTeaReading → TeaHouseResultSheet(readOnly) | 저장 본문만 표시, 없는 차트/장 생성 없음. `reading-tea` direct/refresh mock 및 마지막 본문 검사 |
| `neo` | `src/features/neo-war-room/NeoOperationRoomResultPage.tsx` | `initialBriefing`, `realityCheck`, `refinedOrder`, `versionHistory`, `messages` | SavedNeoDocuments | 저장 본문만 표시, 없는 차트/장 생성 없음. `reading-neo` direct/refresh mock 및 마지막 본문 검사 |
| `fusion` | `app/fusion-fortune/FusionResultThread.tsx` | `result`, `chapters` | FusionResultThread(exporting) | 저장 본문만 표시, 없는 차트/장 생성 없음. `reading-fusion` direct/refresh mock 및 마지막 본문 검사 |
| `codex` | `src/features/master-love-codex/components/CodexReader.tsx` | `chapters`, `loveDna`, `compatibility`, `messages` | CodexReader | 저장 본문만 표시, 없는 차트/장 생성 없음. `reading-codex` direct/refresh mock 및 마지막 본문 검사 |
| `new-year` | `app/new-year-ai-consultation/NewYearAiClient.tsx` | `parts`, `sections`, `messages` | SavedServiceReading → timeline/SavedChapters | 저장 본문만 표시, 없는 차트/장 생성 없음. `reading-new-year` direct/refresh mock 및 마지막 본문 검사 |
| `karma` | `app/karma-destiny-ai/result/KarmaDestinyAiResultClient.tsx` | `summaryCards`, `chapters`, `integratedResult`, `finalLetter` | LensRadar + EvidenceDisclosure + SavedChapters | 저장 본문만 표시, 없는 차트/장 생성 없음. `reading-karma` direct/refresh mock 및 마지막 본문 검사 |
| `ziwei` | `app/ziwei-ai/ZiweiAiClient.tsx` | `ziweiChart`, `groups`, `messages`, `sections` | SavedZiwei → ZiweiPalaceGrid | 저장 본문만 표시, 없는 차트/장 생성 없음. `reading-ziwei` direct/refresh mock 및 마지막 본문 검사 |
| `ziwei-deep` | `app/components/ziwei/ZiweiDeepPdfPanel.tsx` | `ziweiChart`, `chapters`, `sections` | SavedZiwei → ZiweiPalaceGrid | 저장 본문만 표시, 없는 차트/장 생성 없음. `reading-ziwei-deep` direct/refresh mock 및 마지막 본문 검사 |
| `love-secret` | `app/love-secret-ai/result/LoveSecretAiResultClient.tsx` | `sajuResult`, `sections`, `messages` | LoveSecretChecklist + 기존 resultDocument | 저장 본문만 표시, 없는 차트/장 생성 없음. `reading-love-secret` direct/refresh mock 및 마지막 본문 검사 |
| `life-book` | `app/life-book-ai/result/LifeBookAiResultClient.tsx` | `sajuResult`, `sections`, `chapters`, `messages` | 기존 readingRoom/paperPage + SavedSaju | 저장 본문만 표시, 없는 차트/장 생성 없음. `reading-life-book` direct/refresh mock 및 마지막 본문 검사 |
| `sukuyo-compat` | `app/sukuyo-compatibility-ai/SukuyoCompatibilityAiClient.tsx` | `sukuyoResult`, `sections`, `messages` | SavedSukuyoSummary → CompatSummaryHeader/AxisStarSection/TraitCompareTable | 저장 본문만 표시, 없는 차트/장 생성 없음. `reading-sukuyo-compat` direct/refresh mock 및 마지막 본문 검사 |
| `vedic` | `app/vedic-ai/result/VedicAiResultClient.tsx` | `vedicChart`, `sections`, `messages` | StructuredReadingResult / SavedVedic | 저장 본문만 표시, 없는 차트/장 생성 없음. `reading-vedic` direct/refresh mock 및 마지막 본문 검사 |
| `astrology` | `app/astrology-ai/result/AstrologyAiResultClient.tsx` | `astrologyChart`, `chapters`, `messages` | SavedAstrology → AstrologyChartWheel | 저장 본문만 표시, 없는 차트/장 생성 없음. `reading-astrology` direct/refresh mock 및 마지막 본문 검사 |
| `nakshatra` | `app/nakshatra/ai/AiConsultDecks.tsx` | `decks`, `sections`, `factSummary` | AiConsultDecks | 저장 본문만 표시, 없는 차트/장 생성 없음. `reading-nakshatra` direct/refresh mock 및 마지막 본문 검사 |
| `compass` | `app/destiny-compass/_components/SavedCompassReport.tsx` | `sections`, `summary`, `evidencePack` | CompassSavedChapters | 저장 본문만 표시, 없는 차트/장 생성 없음. `reading-compass` direct/refresh mock 및 마지막 본문 검사 |
| `human-design` | `app/human-design/report/HumanDesignReportClient.tsx` | `sections`, `summary`, `basis` | SavedHumanDesign → BodyGraph(staticRender) | 저장 본문만 표시, 없는 차트/장 생성 없음. `reading-human-design` direct/refresh mock 및 마지막 본문 검사 |
| `human-design-chart` | `app/human-design/HumanDesignClient.tsx` | `calculation` | SavedHumanDesign → BodyGraph(staticRender) | 저장 본문만 표시, 없는 차트/장 생성 없음. `reading-human-design-chart` direct/refresh mock 및 마지막 본문 검사 |
| `human-design-reading` | `app/human-design/HumanDesignClient.tsx` | `sections`, `summary`, `calculation` | SavedHumanDesign → BodyGraph(staticRender) | 저장 본문만 표시, 없는 차트/장 생성 없음. `reading-human-design-reading` direct/refresh mock 및 마지막 본문 검사 |
| `relationship` | `app/relationship-boundary-test/RelationshipBoundaryTestClient.tsx` | `summary`, `scoreFactors`, `sections`, `finalMessage`, `sajuFacts` | RelationshipReportHero/Chapters | 저장 본문만 표시, 없는 차트/장 생성 없음. `reading-relationship` direct/refresh mock 및 마지막 본문 검사 |
| `destiny-bias` | `app/saju/destiny-bias/DestinyBiasClient.tsx` | `canonical`, `reportText`, `summary` | ChemiCoreCard/ReportTabs/EvidencePanel 또는 구 BiasDestiny 컴포넌트 | 저장 본문만 표시, 없는 차트/장 생성 없음. `reading-destiny-bias` direct/refresh mock 및 마지막 본문 검사 |
| `chat` | `app/fortune-chat/FortuneChatClient.tsx` | `messages` | 화자별 dialogue 또는 ConsultationResult(readOnly) | 저장 본문만 표시, 없는 차트/장 생성 없음. `reading-chat` direct/refresh mock 및 마지막 본문 검사 |
| `chat-consultation` | `app/fortune-chat/ConsultationResult.tsx` | `manifest`, `chapters` | 화자별 dialogue 또는 ConsultationResult(readOnly) | 저장 본문만 표시, 없는 차트/장 생성 없음. `reading-chat-consultation` direct/refresh mock 및 마지막 본문 검사 |
| `executions` | `worker/lib/record-library.js` | `chapters`, `result`, `reading` | serviceId로 아래 상품 선택 | 저장 본문만 표시, 없는 차트/장 생성 없음. `reading-executions` direct/refresh mock 및 마지막 본문 검사 |
| `paid-results` | `worker/lib/record-library.js` | `chapters`, `result`, `reading` | serviceId로 아래 상품 선택 | 저장 본문만 표시, 없는 차트/장 생성 없음. `reading-paid-results` direct/refresh mock 및 마지막 본문 검사 |
| `legacy-naming` | `app/naming-ai/result/NamingAiResultClient.tsx` | `generatedResult`, `generatedPrompt`, `namingPrompt` | NamingV2Report 또는 SavedNaming | 저장 본문만 표시, 없는 차트/장 생성 없음. `reading-legacy-naming` direct/refresh mock 및 마지막 본문 검사 |

### 공통 저장소 상품 25종

상품 키는 기존 SAVED_FEATURES와 일대일 대조하며 별칭을 추가하지 않는다. 공통 저장소 두 개가 아래 상품을 공유한다.

| 키 | 원본 소스 | 저장 표시 필드 | 연결 표시부 | 과거/부분 처리 · 검증 사례 |
|---|---|---|---|---|
| `saju_ai_prompt_generator` | `js/saju-engine.js` | `sajuResult`, `saju`, `sections`, `chapters` | SavedSaju → SajuPillarTable | 저장 본문만 표시, 없는 차트/장 생성 없음. `reading-saju_ai_prompt_generator` direct/refresh mock 및 마지막 본문 검사 |
| `vedic_prashna_prompt` | `js/saju-engine.js` | `prashnaResult`, `reading`, `chapters` | SavedVedic + 저장된 프라슈나 해석 | 저장 본문만 표시, 없는 차트/장 생성 없음. `reading-vedic_prashna_prompt` direct/refresh mock 및 마지막 본문 검사 |
| `premium-naming-prompt` | `app/naming-ai/result/NamingAiResultClient.tsx` | `generatedResult`, `generatedPrompt`, `namingPrompt` | NamingV2Report 또는 SavedNaming | 저장 본문만 표시, 없는 차트/장 생성 없음. `reading-premium-naming-prompt` direct/refresh mock 및 마지막 본문 검사 |
| `tarot-year-fortune` | `js/tarot-year-fortune-experience.js` | `cards`, `reading`, `consultingHighlights` | SavedCards + 천운 리딩 | 저장 본문만 표시, 없는 차트/장 생성 없음. `reading-tarot-year-fortune` direct/refresh mock 및 마지막 본문 검사 |
| `ziwei_ai_prompt_generator` | `app/ziwei-ai/ZiweiAiClient.tsx` | `ziweiChart`, `groups`, `messages`, `sections` | SavedZiwei → ZiweiPalaceGrid | 저장 본문만 표시, 없는 차트/장 생성 없음. `reading-ziwei_ai_prompt_generator` direct/refresh mock 및 마지막 본문 검사 |
| `sukuyo_ai_prompt_generator` | `js/saju-engine.js` | `sukuyoResult`, `parts`, `chapters` | SavedSukuyoSummary → CompatSummaryHeader/AxisStarSection/TraitCompareTable | 저장 본문만 표시, 없는 차트/장 생성 없음. `reading-sukuyo_ai_prompt_generator` direct/refresh mock 및 마지막 본문 검사 |
| `astrology_ai_prompt_generator` | `app/astrology-ai/result/AstrologyAiResultClient.tsx` | `astrologyChart`, `chapters`, `messages` | SavedAstrology → AstrologyChartWheel | 저장 본문만 표시, 없는 차트/장 생성 없음. `reading-astrology_ai_prompt_generator` direct/refresh mock 및 마지막 본문 검사 |
| `vedic_ai_prompt_generator` | `app/vedic-ai/result/VedicAiResultClient.tsx` | `vedicChart`, `sections`, `messages` | StructuredReadingResult / SavedVedic | 저장 본문만 표시, 없는 차트/장 생성 없음. `reading-vedic_ai_prompt_generator` direct/refresh mock 및 마지막 본문 검사 |
| `tarot-love-relationship` | `js/tarot-love-experience.js` | `cards`, `reading`, `chapters` | SavedCards + 관계 리딩 | 저장 본문만 표시, 없는 차트/장 생성 없음. `reading-tarot-love-relationship` direct/refresh mock 및 마지막 본문 검사 |
| `tarot-mindscan` | `app/tarot/mindscan/MindScanTarotRouteClient.tsx` | `cards`, `reading`, `chapters` | SavedCards + 심리 섹션 | 저장 본문만 표시, 없는 차트/장 생성 없음. `reading-tarot-mindscan` direct/refresh mock 및 마지막 본문 검사 |
| `tarot-prompt-maker` | `app/tarot/prompt-maker/TarotPromptMakerClient.tsx` | `cards`, `positionReadings`, `cardSynergies`, `timeline`, `actions` | SavedCards + 자리/연결/시기/행동 | 저장 본문만 표시, 없는 차트/장 생성 없음. `reading-tarot-prompt-maker` direct/refresh mock 및 마지막 본문 검사 |
| `tarot-prompt-maker-standard` | `app/tarot/prompt-maker/TarotPromptMakerClient.tsx` | `cards`, `positionReadings`, `cardSynergies`, `timeline`, `actions` | SavedCards + 자리/연결/시기/행동 | 저장 본문만 표시, 없는 차트/장 생성 없음. `reading-tarot-prompt-maker-standard` direct/refresh mock 및 마지막 본문 검사 |
| `tarot-prompt-maker-deep` | `app/tarot/prompt-maker/TarotPromptMakerClient.tsx` | `cards`, `positionReadings`, `cardSynergies`, `timeline`, `actions` | SavedCards + 자리/연결/시기/행동 | 저장 본문만 표시, 없는 차트/장 생성 없음. `reading-tarot-prompt-maker-deep` direct/refresh mock 및 마지막 본문 검사 |
| `tarot-prompt-maker-master` | `app/tarot/prompt-maker/TarotPromptMakerClient.tsx` | `cards`, `positionReadings`, `cardSynergies`, `timeline`, `actions` | SavedCards + 자리/연결/시기/행동 | 저장 본문만 표시, 없는 차트/장 생성 없음. `reading-tarot-prompt-maker-master` direct/refresh mock 및 마지막 본문 검사 |
| `dream-psycho-analysis` | `js/psycho-dream-analyzer-freuds-study.js` | `analysis`, `dreamAnalysis`, `sections`, `chapters` | 저장 markdown/분석 섹션 | 저장 본문만 표시, 없는 차트/장 생성 없음. `reading-dream-psycho-analysis` direct/refresh mock 및 마지막 본문 검사 |
| `animal-totem-basic` | `js/animal-totem-experience.js` | `cards`, `animals`, `reading`, `sections` | SavedTotem → AnimalSymbol + narrative | 저장 본문만 표시, 없는 차트/장 생성 없음. `reading-animal-totem-basic` direct/refresh mock 및 마지막 본문 검사 |
| `animal-totem-deep` | `js/animal-totem-experience.js` | `cards`, `animals`, `reading`, `sections`, `chapters` | SavedTotem → AnimalSymbol + narrative | 저장 본문만 표시, 없는 차트/장 생성 없음. `reading-animal-totem-deep` direct/refresh mock 및 마지막 본문 검사 |
| `geomancy` | `geomancy-oracle-v4.html` | `figures`, `shield`, `reading`, `chapters` | SavedGeomancy → 도형/원인/흐름/신탁 | 저장 본문만 표시, 없는 차트/장 생성 없음. `reading-geomancy` direct/refresh mock 및 마지막 본문 검사 |
| `yoga-guru-per-use` | `yoga-guru.html` | `course`, `poses`, `routine`, `sections`, `chapters` | SavedYoga → metadata/sequence/만트라 | 저장 본문만 표시, 없는 차트/장 생성 없음. `reading-yoga-guru-per-use` direct/refresh mock 및 마지막 본문 검사 |
| `pet-saju-ai-consultation` | `pet-saju.html` | `facts`, `parts`, `sections`, `chapters` | SavedSaju + 반려동물 파트 | 저장 본문만 표시, 없는 차트/장 생성 없음. `reading-pet-saju-ai-consultation` direct/refresh mock 및 마지막 본문 검사 |
| `pet-compatibility-ai` | `pet-saju.html` | `facts`, `compatibility`, `parts`, `sections`, `chapters` | SavedSaju + 반려동물 파트 | 저장 본문만 표시, 없는 차트/장 생성 없음. `reading-pet-compatibility-ai` direct/refresh mock 및 마지막 본문 검사 |
| `fortune-chat-consultation` | `app/fortune-chat/FortuneChatClient.tsx` | `messages` | 화자별 dialogue 또는 ConsultationResult(readOnly) | 저장 본문만 표시, 없는 차트/장 생성 없음. `reading-fortune-chat-consultation` direct/refresh mock 및 마지막 본문 검사 |
| `palm-reading-general` | `app/palm-reading/PalmDestinyMain.tsx` | `lines`, `palmResult`, `reading`, `sections` | 손금 항목별 SavedChapters | 저장 본문만 표시, 없는 차트/장 생성 없음. `reading-palm-reading-general` direct/refresh mock 및 마지막 본문 검사 |
| `tarot-celestial-harmony` | `celestial-harmony.html` | `cards`, `reading`, `sections`, `chapters` | SavedCards + 천체 리딩 | 저장 본문만 표시, 없는 차트/장 생성 없음. `reading-tarot-celestial-harmony` direct/refresh mock 및 마지막 본문 검사 |
| `premium-fpti-report` | `components/fpti/FptiExperience.tsx` | `report`, `sections`, `chapters` | SavedFptiReading → 7챕터/강점·주의·행동 | 저장 본문만 표시, 없는 차트/장 생성 없음. `reading-premium-fpti-report` direct/refresh mock 및 마지막 본문 검사 |

### 호환성 사례
- plain/HTML/JSON 메시지, sections/chapters/parts의 전량 본문
- 최애운명 정상 신/구 VM과 손상된 VM의 남은 본문
- 찻집 native 경로는 readOnly=1로 진입
- 원본 근거가 없는 기록에는 차트나 사진을 생성하지 않음
- 자료: `__tests__/fixtures/records-reading-fixtures.mjs`, `__tests__/ui/records-reading-content.test.mjs`, `scripts/design/verify-records-hub.mjs`


## 저장 형식과 읽기 경계
- 공통 저장소의 `result` / `report` / `sajuAi` 객체 포장만 순수 변환으로 해제하며, 나란히 저장된 카드와 본문을 보존한다.
- `ziwei`의 `serviceType=ziwei-island-palace-consult` 또는 저장 `palaceKey`는 운명의 섬의 기존 이미지·밤색 결과 표면을 사용한다. `result.sections`는 저장된 제목과 본문을 표시한다.
- 베다 구조화 리딩은 저장된 숫자 점수만 표시한다. 점성 차트의 12하우스 근거가 없으면 휠을 만들지 않고 저장 행성 표와 본문을 사용한다.
- 동적 데이터의 제목은 저장된 사용자용 제목 또는 명시적 표시 사전을 사용한다. 알 수 없는 내부 필드명이나 계산 객체를 뒤에 출력하지 않는다.
- 기존 읽기 컴포넌트의 export/readOnly 표시 모드를 사용하며, 새 생성 페이지를 마운트하지 않는다.

## 독립 소스 검토
visual_checker: 바디그래프 저장 전용 highContrast의 비활성 선은 흰 바탕 대비 소스 계산 6.15:1, 점성 선은 지정 밤색 바탕 합성 가정 7.29:1. 브라우저 실측과 구분한다. 차트 키보드 스크롤, 본문 높이, 손금 항목명, 반려동물 돌봄 문구 교정을 확인했으며 추가 P1/P2 소스 결함은 발견하지 못했다. 최종 캡처 검토는 별도 기록한다.


## 검증 결과 (2026-10-05)
- `node --test __tests__/ui/records-reading-content.test.mjs`: 6/6. 저장 어댑터25·공통상품25 정본 대조, 전체 본문, 과거 JSON/HTML, transport wrapper 보존.
- 기록 조회 Worker targeted 테스트: 20/20. 소유권·정렬·중복·커서·부분 실패·취소 결과·공통상품 최종 장 보존.
- `npm run check:fast -- --plan` → `npm run check:fast`: exit0. 자동 critical 승격; paid-gate-suite 88/88, lint, sitemap drift, Worker dry-run, Jest341 suites/5105 tests 통과. 최초 sitemap 원장 drift는 생성기로 교정했다.
- 마지막 표시 수정 뒤 `npx tsc --noEmit --incremental false`, 변경 범위 ESLint, 본문 변환6개, `verify:vedic-basic-quality`, `verify:fusion-fortune-stage-flow` 통과. 전체 gate 반복 대신 최종 원격 CI를 전달 기준으로 사용한다.
- 브라우저229개: 360/390/430/1280px, 최초 진입·새로고침·검색/필터/더보기·뒤로가기 스크롤, 최애 카드 앞뒤/탭, 목차/차트 펼침, 작명 후보/비교 선택, 마지막 본문 및 하단 CTA 계측. 전체 실행 후 영향 화면20+8 및 허브4를 재검증했다. mock 생성·차감·결제·LLM·복구 POST 0회.
- 접근성: 최종 병합 결과229개 표면의 axe 검사 위반0, 44px 미만 일반 컨트롤0, 16px 미만 입력0, 수평 문서 넘침0. reduced-motion 환경. 이미지/합성 배경93개 표면은 axe 대비 자동 확정이 불가능하여 독립 시각 및 색 토큰 검토로 보완했으며 모든 픽셀의 수치 대비를 실측했다는 뜻은 아니다.
- impeccable detect: `[]`. visual_checker는 모든 고유 레이아웃의 모바일/데스크톱 표본과 허브·보관함4폭을 직접 검토했다. 마지막18:09 네오 상담/베다 캡처 재확인에서 잔여 P1/P2 없음.
- 교정: 찻집 float/CTA, 네오 제목, 불완전 최애 대비, 인연의 서 링크 대비, 초융합 비활성 접기, 네오 상담 wrapper, 베다 내부 타입명·저장완료 PDF·44px 버튼·보조 라벨, 타로 이미지 크기, 제목 단어 줄바꿈.

## 자료와 한계
자료 폴더: `C:/Users/user/.codex/visualizations/2026/10/05/01a10ab4-478f-7db1-b858-c904de59e500/records-yehwa-ui`.
`verification-final.json`은 전체229 실행과 마지막 영향 범위 재검증을 합친 자료다. `before-*`는 오늘05시 기존 캡처의 보존 사본이며 이번 실행에서 과거 코드를 다시 실행한 것은 아니다.
Next dev는 작업트리 안 build-cache 캡처/로그 쓰기에도 재컴파일되어 manifest 오류가 났다. 검증 출력만 `RECORDS_TEST_OUTPUT`으로 작업트리 밖에 옮겨 해결했으며 임시 next.config 변경은 남기지 않았다. 실패 실행은 통과 사례에 포함하지 않았다.
실결제·실LLM·운영 DB 쓰기·운영 승격·실기기 및 외부 R2 가용성은 검증하지 않았다. 인연의 서 원격 초상화는 같은 캐릭터의 로컬 에셋 mock으로 대체했다. 저장되어 있지 않은 자료의 복원이나 임의 계산은 하지 않는다.


## 수정 파일
- `__tests__/fixtures/records-reading-fixtures.mjs`
- `__tests__/ui/records-reading-content.test.mjs`
- `__tests__/worker/record-library.test.js`
- `app/consultations/ConsultationHub.tsx`
- `app/destiny-compass/_components/SavedCompassReport.tsx`
- `app/destiny-compass/_components/saved-report.module.css`
- `app/fortune-chat/consultation.module.css`
- `app/fortune-tea-house/SavedTeaReading.tsx`
- `app/fusion-fortune/FusionResultThread.tsx`
- `app/human-design/_components/BodyGraph.tsx`
- `app/human-design/_components/bodygraph.module.css`
- `app/records/RecordFrame.tsx`
- `app/records/RecordsClient.tsx`
- `app/records/records.module.css`
- `app/records/view/SavedCharts.tsx`
- `app/records/view/SavedFptiReading.tsx`
- `app/records/view/SavedReadingParts.tsx`
- `app/records/view/SavedRecordClient.tsx`
- `app/records/view/SavedServiceReading.tsx`
- `app/records/view/SavedSupplementalReadings.tsx`
- `app/records/view/StoredReading.tsx`
- `app/records/view/saved-reading.module.css`
- `app/relationship-boundary-test/RelationshipBoundaryTestClient.tsx`
- `app/relationship-boundary-test/RelationshipReportParts.tsx`
- `app/sukuyo-compatibility-ai/SukuyoCompatibilityAiClient.tsx`
- `app/vedic-ai/VedicAiClient.module.css`
- `app/vedic-ai/VedicAiClient.tsx`
- `components/fortune/AstrologyChartWheel.tsx`
- `config/sitemap-lastmod.json`
- `docs/records-yehwa-ui-work.md`
- `lib/records/reading-content.d.ts`
- `lib/records/reading-content.js`
- `lib/records/reading-registry.d.ts`
- `lib/records/reading-registry.js`
- `scripts/design/verify-records-hub.mjs`
- `src/features/fortune-tea-house/styles/tea-report.module.css`
- `src/features/neo-war-room/NeoOperationRoomResultPage.tsx`

변경 의미: 보관함/허브의 정보 위계와 서비스별 저장 결과 표시만 개선했다. 원본 페이지에서는 표시부 추출·저장용 옵션만 추가했다. 공개 API·DB 스키마·결제/가격·인증·환불 로직 변경은 없다. main 통합 커밋에 포함된 다른 세션의 가격/공통 안내 변경은 이 구현 커밋의 수정 파일이 아니다.


## 전달 완료
- 구현: `a7513f5f9` (37개 파일).
- 원격 main 통합: `6e54208d3630c4eda0153d64fcca0b1fa8c47f60`. 지정 문서 커밋 `63a530328865a7bd7e4185c705493c13ab6f5f81`의 조상 포함도 확인했다.
- 정확한 통합 SHA의 CI required: **success**. https://github.com/rei1237/codedestiny/actions/runs/37288763278 — Critical checks / Build Pages and Worker / Static guards / Typecheck and lint 모두 success.
- 최신 main 통합 후 찻집4폭 및 허브/보관함4폭 재검증도 PASS. 생성 원장 충돌은 최신 main 원장을 기준으로 합쳐진 소스에서 재생성했고 `verify:sitemap-drift`가 통과했다.
- 공유 로컬 main은 다른 세션의 staged/미커밋 파일과 `.git/index.lock` 때문에 이동하지 않았다. 원격 main에 비강제 push했으며 다른 세션의 파일·잠금·워크트리는 보존했다.
- 작업 자료는 위 외부 evidence 폴더에 유지한다. 이 완료 문서의 전달 확인 후 node_modules 정션을 먼저 해제하고 자기 워크트리/머지된 브랜치만 배수한다. 최종 실행 결과는 같은 폴더의 `delivery.json`에 남긴다.
