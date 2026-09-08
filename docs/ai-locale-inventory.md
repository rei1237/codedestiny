# LLM locale 호출 조사 및 검증 기록

기준: origin/main 48fc1ea17. 실제 provider 호출 0회.

## 집계 기준

39개 소스 파일에서 100개 호출·직접 REST·래퍼 import 근거를 기록했다. 이 수치는 기능 수가 아니다. 주입형 호출(dreamGeminiCaller, providerCall, generate)을 별도로 포함한다. 동일 내용의 public 미러만 제외한다. 인벤토리 검사는 새로운 호출을 발견하는 보조 수단이며 전체 사용자 흐름의 정상 판정을 대신하지 않는다.

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

- P0: 한국어 명시 지시 추가, zh-SG 등 지역 별칭, /ko 경로 우선, 휴먼디자인 생성 언어 고정 제거.
- P1: body-only Worker 요청, 정적 fetch, React 타로 직접 fetch, 관리자 prompt lab 언어 전달.
- P2: 공통 provider cache의 12개 언어 분리 mock 검증 통과. 개별 저장 결과·브라우저 캐시의 전수 검증은 남아 있다.
- P3: 공통 결제 복귀 descriptor 언어 보존 및 기존 handler 실행 전 복원. 기존 증빙·가격·요청 ID 생성 알고리즘 유지.
- P4: 휴먼디자인 장 제목 12개 언어. 기타 조립 문구·PDF 폰트·오류·결정론 fallback은 전수 완료되지 않았다.

## 검증의 한계와 남은 작업

- 39개 소스와 실제 기능별 URL·입력·저장·UI를 연결하는 전수 인벤토리는 아직 완료되지 않았다. 미사용/관리자/예약 경로도 기능별로 최종 판정해야 한다.
- 기능별 저장 locale, 과거 결과 재사용, stream 후처리, 언어 변경 도중 늦게 도착하는 응답, 후속 질문·재생성의 전체 렌더러 검증이 남아 있다.
- 휴먼디자인의 도표 용어는 기존 5개 언어이며 나머지는 영어 원어를 쓴다. 리포트 부가 라벨과 PDF 표지·폰트의 12개 언어 검증이 남아 있다.
- 실제 모델의 출력 언어 준수·문체 품질은 mock 통과만으로 입증되지 않는다. 실제 LLM 호출 검증 필요(실행하지 않음).
- 전체 Acceptance Criteria를 충족했다는 완료 보고로 사용하지 않는다.
