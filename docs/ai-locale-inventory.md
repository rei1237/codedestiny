# LLM locale 호출 조사 및 검증 기록

기준: origin/main 495afa4b7. 실제 provider 호출 0회.

## 집계 기준

43개 소스 파일에서 105개 호출·직접 REST·래퍼 import 근거를 기록했다. 이 수치는 기능 수가 아니다. 주입형 호출(dreamGeminiCaller, providerCall, generate)을 별도로 포함한다. 동일 내용의 public 미러만 제외한다. 인벤토리 검사는 새로운 호출을 발견하는 보조 수단이며 전체 사용자 흐름의 정상 판정을 대신하지 않는다.

## 소스별 연결 근거

프론트 목록은 실제 API 문자열 참조다. 동적 URL·중간 어댑터는 추가 추적 대상이다. 상태는 사용자 흐름 전체에 대해 보수적으로 표시한다.

| Worker/서버 | 호출 근거 줄 | 프론트 API 참조 | Prompt import | 저장 모델 참조 | 상태 |
|---|---|---|---|---|---|
| `lib/llm-cache.ts` | 1 | 중간 모듈/호출자 추적 필요 | 인라인/중간 생성기 | 중간 저장소/없음 추가 확인 | 🔍 전체 흐름 추가 확인 |
| `lib/llm-client.ts` | 118, 705, 822 | 중간 모듈/호출자 추적 필요 | 인라인/중간 생성기 | 중간 저장소/없음 추가 확인 | 🔍 전체 흐름 추가 확인 |
| `lib/tarot/love-reading-llm.mjs` | 158 | 중간 모듈/호출자 추적 필요 | 인라인/중간 생성기 | 중간 저장소/없음 추가 확인 | 🔍 전체 흐름 추가 확인 |
| `lib/tarot/mindscan-reading.mjs` | 832 | 중간 모듈/호출자 추적 필요 | 인라인/중간 생성기 | 중간 저장소/없음 추가 확인 | 🔍 전체 흐름 추가 확인 |
| `lib/tarot/oracle-consultation.mjs` | 299 | 중간 모듈/호출자 추적 필요 | 인라인/중간 생성기 | 중간 저장소/없음 추가 확인 | 🔍 전체 흐름 추가 확인 |
| `worker/lib/fusion-fortune.js` | 20, 21, 784 | `app/_lib/auth-client.ts`<br>`app/fusion-fortune/FusionFortuneClient.tsx` | ./fusion-fortune-prompt.js | 중간 저장소/없음 추가 확인 | 🔍 전체 흐름 추가 확인 |
| `worker/lib/gemini-client.js` | 1, 16 | 중간 모듈/호출자 추적 필요 | 인라인/중간 생성기 | 중간 저장소/없음 추가 확인 | 🔍 전체 흐름 추가 확인 |
| `worker/lib/gemini.js` | 1, 116 | 중간 모듈/호출자 추적 필요 | 인라인/중간 생성기 | 중간 저장소/없음 추가 확인 | 🔍 전체 흐름 추가 확인 |
| `worker/lib/guardian-fortune-llm.js` | 1, 72 | 중간 모듈/호출자 추적 필요 | ./guardian-fortune-prompt.js | 중간 저장소/없음 추가 확인 | 🔍 전체 흐름 추가 확인 |
| `worker/lib/palm-vision.js` | 17, 18, 469, 634 | 중간 모듈/호출자 추적 필요 | 인라인/중간 생성기 | 중간 저장소/없음 추가 확인 | 🔍 전체 흐름 추가 확인 |
| `worker/lib/structured-consultation.js` | 10, 77 | 중간 모듈/호출자 추적 필요 | 인라인/중간 생성기 | 중간 저장소/없음 추가 확인 | 🔍 전체 흐름 추가 확인 |
| `worker/lib/tarot-oracle-llm.js` | 14, 37 | 중간 모듈/호출자 추적 필요 | 인라인/중간 생성기 | 중간 저장소/없음 추가 확인 | 🔍 전체 흐름 추가 확인 |
| `worker/lib/threads-ai-writer.js` | 18, 163 | 중간 모듈/호출자 추적 필요 | 인라인/중간 생성기 | 중간 저장소/없음 추가 확인 | 🔍 전체 흐름 추가 확인 |
| `worker/routes/admin.js` | 9, 4304 | `app/admin/cms/_lib/base-values.ts`<br>`app/admin/cms/page.tsx`<br>`app/admin/content/page.tsx`<br>`app/admin/feedback/page.tsx`<br>`app/admin/insights/_lib/imageUpload.ts`<br>`app/admin/insights/page.tsx`<br>`app/admin/login/page.tsx`<br>`app/admin/monthly-credits/page.tsx`<br>`app/admin/orders/page.tsx`<br>`app/admin/prompts/page.tsx`<br>`app/admin/reviews/page.tsx` | ../lib/fortune-question-prompt.js<br>../lib/saju-ai-prompt.js<br>../lib/sukuyo-ai-prompt.js<br>../lib/astrology-ai-prompt.js<br>../lib/ziwei-ai-prompt.js<br>../lib/vedic-ai-prompt.js<br>../lib/cms-prompts.js<br>../lib/admin-prompt-lab-loaders.js<br>../../lib/admin/prompt-lab-registry.mjs | 중간 저장소/없음 추가 확인 | 🔍 전체 흐름 추가 확인 |
| `worker/routes/animal-totem.js` | 28, 619 | `js/animal-totem-experience.js`<br>`js/services/animal-totem-content-engine.js` | ../lib/cms-prompts.js | 중간 저장소/없음 추가 확인 | 🔍 전체 흐름 추가 확인 |
| `worker/routes/astrology-ai.js` | 17, 1142, 1243, 1272, 1301 | `app/astrology-ai/AstrologyAiClient.tsx`<br>`app/astrology-ai/result/AstrologyAiResultClient.tsx` | ../lib/cms-prompts.js | AstrologyAiConsultation, PaidExecutionRecord | 🔍 전체 흐름 추가 확인 |
| `worker/routes/celestial-harmony.js` | 4, 653 | 중간 모듈/호출자 추적 필요 | 인라인/중간 생성기 | 중간 저장소/없음 추가 확인 | 🔍 전체 흐름 추가 확인 |
| `worker/routes/destiny-compass-ai.js` | 23, 419 | `app/destiny-compass/_hooks/useCompassReport.ts` | ../lib/cms-prompts.js | DestinyCompassReport | 🔍 전체 흐름 추가 확인 |
| `worker/routes/destiny-compass.js` | 10, 225 | `app/destiny-compass/_components/CompassReport.tsx`<br>`app/destiny-compass/_hooks/useCompassReport.ts` | ../lib/cms-prompts.js | 중간 저장소/없음 추가 확인 | 🔍 전체 흐름 추가 확인 |
| `worker/routes/dream.js` | 3, 1289 | `js/dream-ledger.js`<br>`js/psycho-dream-analyzer-freuds-study.js` | 인라인/중간 생성기 | 중간 저장소/없음 추가 확인 | 🔍 전체 흐름 추가 확인 |
| `worker/routes/fortune-tea-house.js` | 2, 4024, 4870 | `src/features/fortune-tea-house/FortuneTeaHousePage.tsx`<br>`src/features/fortune-tea-house/components/DestinyCafeTarotAlbum.tsx`<br>`src/features/fortune-tea-house/components/TeaHouseHistoryPanel.tsx`<br>`src/features/fortune-tea-house/components/TeaHouseResultSheet.tsx` | ../lib/saju-ai-prompt.js | 중간 저장소/없음 추가 확인 | 🔍 전체 흐름 추가 확인 |
| `worker/routes/fortune.js` | 98, 477, 5159, 5184 | `app/_lib/auth-client.ts`<br>`app/_lib/auth-store.ts`<br>`app/_lib/user-session-cache.ts`<br>`app/fortune-chat/FortuneChatClient.tsx`<br>`app/fortune/share/GuardianFortuneShareClient.tsx`<br>`app/fusion-fortune/FusionFortuneClient.tsx`<br>`app/points/PointsClient.tsx`<br>`app/today/TodayHubClient.tsx`<br>`js/core/index-inline-runtime.js`<br>`js/destiny-profile.js`<br>`js/saju-engine-tarot-sukuyo-quantum.js`<br>`js/saju-engine.js`<br>`js/tarot-love-experience.js`<br>`js/tarot-reunion-experience.js`<br>`src/features/fortune-tea-house/FortuneTeaHousePage.tsx`<br>`src/features/fortune-tea-house/components/DestinyCafeTarotAlbum.tsx`<br>`src/features/fortune-tea-house/components/TeaHouseHistoryPanel.tsx`<br>`src/features/fortune-tea-house/components/TeaHouseResultSheet.tsx` | ../lib/ziwei-ai-prompt.js<br>../lib/sukuyo-ai-prompt.js<br>../lib/saju-ai-prompt.js<br>../lib/astrology-ai-prompt.js<br>../lib/vedic-ai-prompt.js<br>../lib/vedic-prashna-prompt.js<br>../lib/cms-prompts.js | PaidExecutionRecord | 🔍 전체 흐름 추가 확인 |
| `worker/routes/human-design-report.js` | 30, 311 | `app/human-design/report/_lib/types.ts`<br>`app/human-design/report/_lib/useReportGeneration.ts` | ../lib/human-design-report-prompt.js | HumanDesignReport | 🔍 전체 흐름 추가 확인 |
| `worker/routes/karma-destiny-ai.js` | 12, 1497, 1524, 1612, 1648, 1975 | `app/karma-destiny-ai/KarmaDestinyAiClient.tsx`<br>`app/karma-destiny-ai/result/KarmaDestinyAiResultClient.tsx` | 인라인/중간 생성기 | PaidExecutionRecord, KarmaDestinyAiConsultation | 🔍 전체 흐름 추가 확인 |
| `worker/routes/life-book-ai.js` | 14, 1424 | `app/life-book-ai/lifeBookApi.ts`<br>`app/life-book-ai/result/LifeBookAiResultClient.tsx`<br>`app/premium-unlock/PremiumSalesContent.tsx` | 인라인/중간 생성기 | PaidExecutionRecord, LifeBookAiConsultation | 🔍 전체 흐름 추가 확인 |
| `worker/routes/love-secret-ai.js` | 13, 14, 783, 930 | `app/love-secret-ai/LoveSecretAiClient.tsx`<br>`app/love-secret-ai/result/LoveSecretAiResultClient.tsx` | ../lib/cms-prompts.js<br>../lib/love-secret-ai-prompt.js | PaidExecutionRecord, LoveSecretAiConsultation | 🔍 전체 흐름 추가 확인 |
| `worker/routes/master-love-codex.js` | 39, 40, 658, 685 | `app/master-love-codex/result/MasterLoveCodexResultClient.tsx`<br>`src/features/master-love-codex/MasterLoveCodexPage.tsx` | ../lib/master-love-codex-prompt.mjs<br>../lib/master-love-codex-compat-prompt.mjs | 중간 저장소/없음 추가 확인 | 🔍 전체 흐름 추가 확인 |
| `worker/routes/nakshatra-ai.js` | 37, 693 | `app/nakshatra/ai/NakshatraAiClient.tsx` | ../lib/nakshatra-ai-prompt.js | NakshatraAiConsultation, PaidExecutionRecord | 🔍 전체 흐름 추가 확인 |
| `worker/routes/naming-prompt.js` | 9, 1360 | `app/naming-ai/NamingAiClient.tsx`<br>`app/naming-ai/result/NamingAiResultClient.tsx` | 인라인/중간 생성기 | PaidExecutionRecord | 🔍 전체 흐름 추가 확인 |
| `worker/routes/neo-operation-room.js` | 16, 1005 | `src/features/neo-war-room/NeoOperationRoomPage.tsx`<br>`src/features/neo-war-room/NeoOperationRoomResultPage.tsx`<br>`src/features/neo-war-room/data/input-flow.ts` | ../lib/neo-operation-room-prompt.js | NeoOperationRoomConsultation, PaidExecutionRecord | 🔍 전체 흐름 추가 확인 |
| `worker/routes/new-year-ai.js` | 13, 1842, 1980 | `app/new-year-ai-consultation/NewYearAiClient.tsx` | 인라인/중간 생성기 | PaidExecutionRecord, NewYearAiConsultation | 🔍 전체 흐름 추가 확인 |
| `worker/routes/oracle.js` | 1, 164 | 중간 모듈/호출자 추적 필요 | 인라인/중간 생성기 | 중간 저장소/없음 추가 확인 | 🔍 전체 흐름 추가 확인 |
| `worker/routes/pet-saju-ai.js` | 11, 306 | 중간 모듈/호출자 추적 필요 | 인라인/중간 생성기 | 중간 저장소/없음 추가 확인 | 🔍 전체 흐름 추가 확인 |
| `worker/routes/sukuyo-compatibility-ai.js` | 14, 16, 1431, 1480, 1568, 2102 | `app/hooks/useAiProfileSeed.ts`<br>`app/sukuyo-compatibility-ai/SukuyoCompatibilityAiClient.tsx` | ../lib/cms-prompts.js | PaidExecutionRecord, SukuyoCompatibilityAiConsultation | 🔍 전체 흐름 추가 확인 |
| `worker/routes/vedic-ai.js` | 15, 1312 | `app/vedic-ai/VedicAiClient.tsx`<br>`app/vedic-ai/result/VedicAiResultClient.tsx` | ../lib/cms-prompts.js | VedicAiConsultation | 🔍 전체 흐름 추가 확인 |
| `worker/routes/yoga-guru.js` | 2, 354 | 중간 모듈/호출자 추적 필요 | 인라인/중간 생성기 | 중간 저장소/없음 추가 확인 | 🔍 전체 흐름 추가 확인 |
| `worker/routes/ziwei-ai.js` | 19, 20, 1647, 1657, 1691 | `app/ziwei-ai/ZiweiAiClient.tsx` | ../lib/cms-prompts.js<br>../lib/ziwei-ai-prompt-templates.mjs | ZiweiAiConsultation | 🔍 전체 흐름 추가 확인 |
| `worker/routes/ziwei-deep-report.js` | 33, 246 | `app/components/ziwei/ZiweiDeepPdfPanel.tsx` | ../lib/ziwei-deep-report-prompt.mjs | ZiweiDeepReport | 🔍 전체 흐름 추가 확인 |
| `worker/routes/ziwei-island-ai.js` | 19, 536 | `app/island-consult/IslandConsultClient.tsx` | ../lib/island/consult/palace-prompts.js | ZiweiAiConsultation | 🔍 전체 흐름 추가 확인 |

## 현재 확인한 수정과 검사

추가로 추적한 운영/개발 경로:

| 경로 | 호출 연결 | locale·저장 근거 | 분류 |
|---|---|---|---|
| `scripts/i18n-translate-pending.mjs` | buildPrompt → callModel → Gemini REST / Workers AI | target.name 지시, target.code별 캐시·사전 파일 | UI 사전 유지보수 작업. 사용자 분석 기능 수에서 제외, 호출 인벤토리에는 포함. 실행하지 않음 |
| `scripts/lib/workers-ai-rest.mjs` | REST runner → Cloudflare accounts/.../ai/run | caller의 messages를 그대로 전달 | provider transport. 독립 기능 아님 |
| `scripts/local-dev-auth-api.mjs` | Node HTTP → worker/index.js, env.AI에 REST runner 주입 | Worker 요청 locale context를 재사용 | 개발 어댑터. 실행하지 않음 |
| `worker/lib/threads-ai-writer.js` | 예약 게시 작업 → generateImpl/callGeminiText | locale: ko 명시, SNS 한국어 문안 작업 | 서비스 화면 locale과 독립인 한국어 발행 작업. 기존 정책 유지 |

HTML은 script 본문만 AST로 읽고 원본 줄 위치를 유지한다. 테스트/검증 스크립트는 운영 호출 수에서 제외한다. 인벤토리의 import 근거는 실제 호출 수로 세지 않는다.

- P0: 한국어 명시 지시 추가, zh-SG 등 지역 별칭, /ko 경로 우선, 휴먼디자인 생성 언어 고정 제거.
- P1: body-only Worker 요청, 정적 fetch, React 타로 직접 fetch, 관리자 prompt lab 언어 전달.
- P2: 공통 provider cache의 12개 언어 분리 mock 검증 통과. 개별 저장 결과·브라우저 캐시의 전수 검증은 남아 있다.
- P3: 공통 결제 복귀 descriptor 언어 보존 및 기존 handler 실행 전 복원. 기존 증빙·가격·요청 ID 생성 알고리즘 유지.
- P0/P3: 휴먼디자인의 저장된 locale을 후속 웨이브의 provider 옵션에 명시했다. 현재 HTTP locale과 다른 저장 locale의 retry/repair도 12개 언어 mock으로 검증했다.
- P1: 오늘의 귀인 운세의 컨텍스트 입력·LLM 옵션·공유 메타데이터를 동일한 정규화 locale로 맞췄다. 헤더 locale과 ko-KR 본문이 다른 12개 경우를 포함해 관련 Jest 30개 통과.
- P4: 휴먼디자인 장 제목 12개 언어. 기타 조립 문구·PDF 폰트·오류·결정론 fallback은 전수 완료되지 않았다.

## 검증의 한계와 남은 작업

- 43개 소스와 실제 기능별 URL·입력·저장·UI를 연결하는 전수 인벤토리는 아직 완료되지 않았다. 미사용/관리자/예약 경로도 기능별로 최종 판정해야 한다.
- 기능별 저장 locale, 과거 결과 재사용, stream 후처리, 언어 변경 도중 늦게 도착하는 응답, 후속 질문·재생성의 전체 렌더러 검증이 남아 있다.
- 휴먼디자인의 도표 용어는 기존 5개 언어이며 나머지는 영어 원어를 쓴다. 리포트 부가 라벨과 PDF 표지·폰트의 12개 언어 검증이 남아 있다.
- 실제 모델의 출력 언어 준수·문체 품질은 mock 통과만으로 입증되지 않는다. 실제 LLM 호출 검증 필요(실행하지 않음).
- 전체 Acceptance Criteria를 충족했다는 완료 보고로 사용하지 않는다.

## 추가 확인된 미해결 경로

- `worker/routes/ziwei-deep-report.js`: 저장 레코드와 배치 이어가기 토큰에 locale이 없고, 저장본은 idempotencyKey로 재사용한다. 결제 키를 언어별로 임의 변경하면 중복 차감 경계에 영향을 줄 수 있어, locale 메타데이터와 기존 증빙을 분리한 수정·mock이 필요하다.
- `worker/routes/vedic-ai.js`: startLocks가 userId + idempotencyKey로 묶이고 저장 조회도 같은 결제 요청 기준이다. 새 언어 생성과 기존 결제 결과 재열람의 구분을 추가 검증해야 한다.
- `worker/routes/oracle.js`: 성공 JSON의 짧은 필드에 buildFallbackOracle의 한국어 문장이 붙을 수 있다. language instruction만으로 해결되지 않는 후처리 P0/P4 경로다.
- 전체 사전검사 1차에서 lint/TypeScript/Next build와 주요 mock은 통과했지만, 정적 캐시 핀 2개와 기존 systemInstruction 정확 일치 검사·휴먼디자인 report 모듈 import 검사에서 실패했다. 해당 실패는 수정했고 최종 전체 재검사가 필요하다.
