---
status: active
updated: 2026-09-14
next: "사주 저장/재개 및 2만 자 계약 구현·mock 검증 이후, 승인된 나머지 P1 저장 경로와 상세 리포트 품질/복구를 순차 적용한다."
---

# 다른 유료 LLM 기능 조사 근거

## 2026-09-14 인생의 책·인생 총운 전달 개선

- 실제 장애 원인: 첫 네 섹션 저장 뒤 상태가 generating인 요청을 전부 작업 중으로 간주하여 다음 웨이브가 실행되지 않았다. 실제 DB 잠금이 살아 있는 경우만 대기하고, partial에서는 다음 미완료 섹션을 진행한다.
- 한 요청은 최대 네 섹션, 섹션 호출은 최대 45초. 시도 횟수를 호출 전에 예약하고 각 섹션 종료 직후 저장·재조회한다. 서버에 최초 계산 근거와 원래 요청/증빙을 보존한다.
- 최종 본문을 delivery_pending으로 저장·재조회한 뒤 기존 deferred apply를 실행한다. 완료 저장 및 재조회 뒤에만 completed/saved:true를 응답한다. 저장 예외/null과 apply 응답 유실은 환불 경로에서 분리한다. 완료 문서와 정상 섹션은 재사용한다.
- 재개 ID는 계정 소유권을 검사한다. 원래 증빙의 취소/환불 상태를 다시 읽고 토큰만으로 접근을 허용하지 않는다. 실패 확정도 생성 잠금을 소유한 요청만 수행한다.
- 인생 총운의 기존 3만~6만 자 생성 목표는 유지한다. 인생의 책은 전체 본문 2만 자 하한에 맞춰 섹션 목표를 보강했다. 충분히 긴 내용은 자동으로 잘라내지 않으며, 과거 completed 결과는 새 품질 기준으로 차단하지 않는다.
- 모바일 결과 화면은 저장된 본문을 표시하면서 다음 웨이브를 요청하고, 화면 복귀/온라인 복귀 때 같은 세션을 이어받는다. 계정 전환 이후 도착한 결과는 폐기한다. 생성 화면은 재개 ID와 같은 멱등키를 쓰고 완료 전 복구 정보를 보존한다.
- 실제 라우트/클라이언트 함수 mock 15개, 섹션 검사 13개, UI 계약 검사 9개 통과. verify:life-book-ai-flow, typecheck, worker-no-undef, mongo-query-index-shapes 통과. check:fast -- --plan 확인. 별도 실브라우저 시각/실기기/실 LLM/실결제/운영 DB 검증은 미실행.
- 연애 비책 커밋 b908e655c main CI는 빌드·critical 검사를 통과했으나 sitemap 기록 누락으로 실패했다. fd1c56725의 사이트맵 생성에는 진행 중 인생의 책 소스가 포함되어 원장 서명만 다시 불일치했다. 인생의 책 소스와 최종 사이트맵 원장을 함께 전달한 뒤 main CI를 확인한다.
- 다음 작업: 신년운세의 긴 생성/차감 후 저장 실패 경로, 이어 나머지 LLM 상품의 중단 예방과 복구 계약. 전체 상품 개선은 아직 완료되지 않았다.


## 2026-09-14 연애 비책 생성·전달 개선

- 사용자 우선순위 재확인: 모든 LLM 기능에서 긴 호출이 실행 제한으로 끊기지 않게 하는 것이 우선이다. 결제 후 정상 생성·저장·전달을 먼저 고치며 충분히 긴 기존 본문은 불필요하게 늘리지 않는다.
- 연애 비책은 기존 6그룹·28절·3만~3만6천 자 생성 목표를 유지한다. 요청당 한 그룹(최대 기본 생성+보완 2회), 그룹별 누적 4회 한도. 정상 그룹과 최초 계산 근거를 서버에 보존하고 다음 요청은 미완료/품질 미달 그룹만 생성한다.
- 최종 저장 대기와 부분 생성을 분리했다. 완료는 필수 절/공백 제외 2만 자/기존 근거 품질 검사를 거쳐 저장 및 재조회 뒤에만 반환한다. 저장 장애는 환불 경로와 분리하고 최종 본문을 재사용한다.
- 같은 결과 ID의 서버 재개, 원래 멱등키/증빙 유지, 만료된 접근 토큰 대신 원래 증빙 재확인, 취소·환불 거부, 생성 claim CAS를 추가했다. 새로고침·계정 재로그인 시 서버의 최근 상담으로 접근할 수 있다.
- 모바일 화면은 부분 본문으로 완료 처리하지 않고 자동 이어받는다. 결과 화면은 저장된 절을 보여주며 이어받고 화면 복귀 시 다시 확인한다. 저장 장애/재시도는 결제창을 다시 열지 않는다. 계정 전환 뒤 응답은 폐기한다. 90초 완료 안내는 단계별 저장 안내로 12개 언어에서 수정했다.
- mock: 실제 라우트·클라이언트 함수·생성기 호출 범위·취소 증빙 결정 18개 통과. love-secret flow(28절/본문 23,835자 fixture), typecheck, worker-no-undef, Mongo 쿼리 모양, generation-resilience 884개 통과. 대상 ESLint 오류 0, 기존 경고 15개. 실제 LLM 출력·운영 DB/PG·물리 모바일 결제 복귀는 미검증이다.
- 앞선 a7d9f6b8095f7653a66eb16729a7ab69e6b6e09f main CI 34832408776은 success. 이 연애 비책 작업의 CI는 push 후 별도로 확인한다.
- 다음 우선 작업은 인생의 책/인생 총운과 신년운세의 생성 중단 예방·체크포인트·최종 저장 계약이다. 다른 LLM 서비스 전체 목록 대조 및 남은 품질/결제 조합 검증도 계속 필요하다.
## 2026-09-14 저장 장애 확대 중간 검증

- 추가 지시: 사주 기반 연애 비책·인생의 책/인생 총운·신년운세 등 모든 개별 LLM 서비스를 포함한다. 이미 충분히 긴 리포트의 생성 목표를 불필요하게 늘리지 않는다.
- 심화 자미두수 PDF 배치 저장 throw/null/재조회 실패를 503 RESULT_STORAGE_UNAVAILABLE로 분리했다. 저장 장애에 생성 실패 환불을 실행하지 않으며 완료 문서를 덮지 않는다.
- 초융합은 저장 ID가 없거나 저장 예외가 나면 성공 SSE/HTTP 결과를 보내지 않는다. 기존 3만 자 이상 생성 목표는 유지한다.
- 숙요 궁합은 delivery_pending 본문을 재사용해 최종 저장을 확인한다. claim 토큰과 입력 해시로 중복 생성/오래된 실패 쓰기를 제한한다. 아직 전체 장별 재개와 모든 결제 증빙 취소 조합의 검증은 완료하지 않았다.
- mock 검증: 숙요 실제 라우트 12개, 초융합 실제 스트림 라우트 7개, 자미두수 실제 저장 함수 8개 통과. 외부 네트워크는 차단했고 천문 좌표 입력은 mock이다. 자미두수 flow, 초융합 stage/reopen, Mongo 쿼리 모양 통과. 관련 ESLint 오류 0/미사용 경고 10.
- 사주 CI의 구형 mock 의존성은 2627b0da781e460bf02ff70c4867057fb02b7981에서 수정(39개 통과). 이어 public cache key 미러 불일치를 d995ea5b1에서 수정했다. 최신 CI 통과는 별도 확인 중이다.
- 남은 작업: 연애 비책·인생의 책·신년운세를 우선하여 다른 상세 리포트의 2만 자/근거/필수 장 완료, 체크포인트, 모바일 재개, 결제 취소·환불 재확인을 적용한다. 현재 저장 장애 수정만으로 전체 계획 완료를 의미하지 않는다.
- 실 LLM 품질·실결제·운영 DB·실기기 결제 복귀·배포는 미검증이다.
## 사주 개선 확인 (2026-09-14)

`worker/routes/fortune.js`에서 400자 후보를 완료로 넘기던 경로 및 저장 null을 성공으로 표시하던 경로를 수정했다. 12챕터/본문 20,000자/십성 근거/저장 재확인 완료 기준과 묶음별 서버 체크포인트를 적용했다. 신규 실제 라우트 mock 22개, 기존 근거 검사 포함 61개, UI·기본 사주·캐시 16개 통과. 자세한 결과와 미검증 범위는 연결된 인수인계 문서의 ‘사주 우선 확대’ 절을 따른다. 아래 타 기능 조사는 아직 구현 완료를 의미하지 않는다.

기준 `0e2dff85192f077ab62bb58795937b1515a50fd5`. 운영 로그·주문·실 LLM은 조회/호출하지 않았다. 코드에서 확인한 경로와 위험 가설을 구분한다. 가격/상품 정본은 `worker/lib/paid-feature-registry.js`의 `FEATURE_KEY_PRICE_TABLE`, `PER_USE_PAID_FEATURE_KEYS`, aliases이다. 이름에 AI가 있다는 이유로 모두 실 LLM 상품이라 판단하지 않는다. 정적 해금·판매 중단 키·프롬프트 상품을 보존한다.

## 2026-09-14 찻집 후속 적용

찻집 구현 커밋 `dd01ead6fc290d2a320bd8a82681aeb9ea87f4a2`: pending 결과 저장/재조회 → 기존 증빙 apply → 완료 저장/재조회 → 리워드를 분리했다. 동일 요청·원문·증빙과 잠금 토큰을 유지하여 저장 실패/응답 유실을 복구하고, 화면의 계정별 재개 기록은 24시간 보존한다. 찻집 Jest 85/85, 화면 Node 14/14 통과. billing/DB/LLM은 mock이며 실서비스 E2E 증명이 아니다. 전달 확인 명령·검증 한계·기존 사주 보조 검사 실패는 [인수인계](paid-llm-delivery-20260914.md)에 기록했다. 나머지 항목은 미수정이다.

## 우선순위 P1: 코드에서 확인한 저장/완료 문제

저장 예외 삼킴은 로컬 mock으로도 재현했다. TypeScript AST로 현재 파일의 실제 함수 선언을 읽어 VM에서 DB 함수만 `MOCK_STORAGE_UNAVAILABLE` throw로 대체했다. `persistFusionDelivery`는 `""`, `persistNextBatch`는 `undefined`로 정상 resolve했다. 실제 DB 호출은 없으며, 전체 결제/HTTP 흐름 재현은 다음 단계다.

| 기능 | 정본 위치 | 확인된 경로와 다음 재현 |
|---|---|---|
| 운명의 찻집 5상품 | `worker/routes/fortune-tea-house.js` handleConsult / saveFortuneTeaHouseResult / completeFortuneTeaHouseDelivery | 위 후속 커밋에서 저장·리워드 분리 및 pending 복구 적용. 저장 실패는 503이며 완료 확인 전 성공/리워드 금지. 이용권·월정석·단건 증빙의 장애 검사는 타로 요청을 공통 fixture로 사용했고 기존 사주/3·5카드 콘텐츠 검사도 통과했다. 모든 SKU의 실 E2E 완료 판정은 아니다. |
| 심화 자미두수 PDF | `worker/routes/ziwei-deep-report.js:400`, `:446` persistNextBatch | 첫/후속 저장의 catch가 예외를 삼키고, 후속 문서 미존재도 return. 토큰의 누적 장수·분량은 저장 실패와 무관하게 진행할 수 있다. 두 저장점 실패를 각각 주입하고 마지막 배치 done 및 재열람을 확인. |
| 초융합 | `worker/routes/fusion-fortune.js:106`, `:400` | persistFusionDelivery는 실패를 빈 ID로 반환. checkpoint는 빈 ID를 거부하지만 마지막 저장 뒤 일반 응답/스트림 complete 경로는 빈 ID를 전달할 수 있다. checkpoint 성공 후 최종 저장만 실패시키고 검증. |
| 숙요 궁합 | `worker/routes/sukuyo-compatibility-ai.js:2029` | 저장 findOneAndUpdate가 null이면 임시 completed 객체로 결과를 반환하고 usage 성공 기록. throw와 null 반환을 각각 검사. null도 재열람 가능한 저장으로 간주해서는 안 됨. |

## 우선순위 P1: 품질 미달인데 완료가 되는 경로

| 기능 / registry 키 | 생성 → 저장 경로 | 후속 조치 |
|---|---|---|
| 점성술 / astrology-ai-consultation | `astrology-ai.js:1197`, `:1329` degraded → `:1721` completed | quality를 저장하지만 완료에 반영하지 않음. 부족 섹션 유지·재시도와 결과 필터 함께 변경. |
| 베다 / vedic-ai-consultation | `vedic-ai.js:1443` quality 실패도 400자면 degraded → `:1526` completed | 기존 messages를 재시도 시작 시 비우는 경로도 확인. 정상 본문을 먼저 보존하고 다샤·하우스 근거 검증. |
| 자미두수 / ziwei-ai-consultation | `ziwei-ai.js:1995` degraded → `:2460` completed | 저장 llmMeta에서 degraded 정보도 누락. 그룹별 실패·누락 궁·사화 검증과 상태 보존. |
| 신년운세 / new-year-ai-consultation | `new-year-ai.js:2030` degraded → `:2426` completed | 살아남은 일부 섹션만으로 완료 가능. 4개 분야 식별자로 완료 판정, 해당 연도 외 시기 주장 검사. |
| 연애 비책 / love-secret-ai-consultation | `love-secret-ai.js:922` degraded → `:1440` completed | degraded/groupStatus는 저장하지만 완료 여부와 분리되지 않음. 정상 그룹 재사용. |
| 인생의 책·인생 총운 | `life-book-ai.js:2807`, `:2838` | 400자 렌더 가능 fallback 뒤 완료 경로. 상품별 서로 다른 분량/챕터 기준을 유지하고 실제 최종 계약이 누락을 막는지 mock 확인. |
| 운명의 업 | `karma-destiny-ai.js:1554`, `:2776` | 품질 미달 후보 허용과 최종 완료 사이 모든 장 검증 여부를 추가 추적. 조기 return의 quality 보존 검사 필요. |
| 네오 | `neo-operation-room.js:1102`, `:1665` | 최종 briefing 200자 미만만 거부하는 보조 문턱 확인. 섹션 생성기에서 14챕터 누락을 충분히 막는지는 미검증. 기준 충족 fixture와 섹션 누락 fixture 비교. |

위 항목은 실제 고객 피해가 있었다는 판정이 아니다. 일부 fallback은 기존 서비스 계약상 의도된 구현이지만, 이번 사용자 요구인 “정상 부분 보존, 품질 미달을 완료로 처리하지 않음”과 충돌한다. 단순 throw로 본문을 버리거나 status만 partial로 바꾸지 않는다. DB enum·목록/result 필터·모바일 복귀·재시도 UI·결제 실행 상태를 함께 확인한다.

공통 원인은 `worker/lib/llm-result-delivery.js:1`의 기존 경량 전달 계약과 각 라우트의 완료 처리 연결이다. `hasRenderableLlmText`는 읽을 텍스트가 있는지만 확인하며 상품 품질 통과 검사가 아니다. 이 함수를 일괄 엄격화하면 보존해야 할 부분 결과까지 사라진다. 표시 가능 여부와 완료 가능 여부를 분리해 이행한다.

## 다음 조사 대상과 정확한 진입점

| 기능군 | 파일/심볼 | 현재 확인 수준 |
|---|---|---|
| 반려동물 사주·궁합 | `pet-saju-ai.js` handleReport/handleCompat | resolveAccess 이후 생성 실패 시 한국어 결정론 fallback을 ok:true로 반환. 상품 설명과 일치하는지, 서버 보관/새로고침 복구 및 소비 시점은 추가 추적. |
| 운명의 섬 상담 | `ziwei-island-ai.js:544`, `:661` | 최소 렌더 문턱→완료 흐름. 차감/저장 실패·12궁 충족은 미검증. 정적 `ziwei-island-deep-report`와 혼동 금지. |
| 작명 | `naming-prompt.js` claim 및 `:1553` 결과 저장 | 기존 PaidExecutionRecord 멱등 claim/완료 구조 존재. 실 결과와 프롬프트 상품 구분, 언어별 필수 항목·저장 실패 재시도 추가 검증. |
| 나크샤트라 | `nakshatra-ai.js:994`, `:1038` | 진행 기록·저장 재시도 존재. consultation 외 compat/muhurta/vvip-codex SKU의 실제 호출부까지 registry에서 추적해야 함. |
| 관계 경계 검사 | `relationship-boundary-test.js:246`, `:424` | 잘린 응답 마지막 문장 절삭 경로 존재. 필수 필드/근거 충족 없이 완료 가능한지 추가 검증. |
| 사주 상담·연이 대화 | `fortune.js:4751`, `:5159`, `:6333`; `fortune-chat.js` | 최소 렌더 fallback 및 generateGuardianFortuneRequest 호출부 확인. 대화 저장 API와 생성 API가 분리되어 있어 응답 유실·저장 실패를 함께 검사. |
| 타로 상품군 | `tarot.js`, `lib/tarot/love-reading-llm.mjs` | 연운 PaidExecutionRecord 원자 저장 보강은 기존 구현. 연애/재회/속마음 등 registry 상품별 카드 근거·정역방향·LLM 사용 여부 분류 필요. |
| 오라클 상품군 | `oracle.js:122`, `:126` | Gemini/결정론 fallback 구분 존재. 주역·이집트·지오맨시의 필수 필드와 언어·결제 소비 분기 추가 추적. |
| 손금 | `palm.js:298`, `:472` | vision 결과 source 분기 확인. 유료 기본 판독과 판매 중단된 별도 상담 키 혼동 금지. 사진 실패·서버 재열람 미검증. |
| 운명의 지도·휴먼 디자인 | `destiny-compass-ai.js`, `human-design-report.js` | 이번 partial/save 보강 적용. HD releaseLock(:643)→saveWave(:653) 순서의 동시성 위험은 남음. 지도 재개 요청의 원래 계산 context/환불 재검증도 추가 필요. |

## 이어받을 검증 방식

1. registry의 canonical 키를 상품별 행으로 확장하고 활성 판매/과거 구매/정적 해금을 구분한다. 위 표는 기능군 조사이며 모든 SKU의 E2E 완료표가 아니다.
2. 서비스 함수의 LLM·DB·결제 호출을 mock으로 주입한다. 저장 throw/null, 응답 유실, 동일 키 동시 요청, 취소·환불, 언어 오류, 잘린 JSON, 없는 근거, 상충 판정 뒤집기 fixture를 각각 분리한다.
3. 실제 API와 화면으로 원래 inputHash/requestId/결제 증빙을 유지한 재로그인·새로고침을 검사한다. 서버 저장 성공+필수 부분의 품질 통과만 완료. partial은 재열람 가능해야 한다.
4. `npm run check:fast -- --plan`으로 선택 검사를 보고 관련 검사 후 commit/push/main CI 확인. 기존 `verify:ai-consultation-flows`와 Paid Flow Gates 성공은 위 저장/의미 품질 시나리오의 전수 증명이 아니다.

실 LLM 문장 품질, 실 PG, 운영 주문 복구는 별도 승인 및 결과로 남긴다. 현재 감사에서는 외부 호출 0건이다.
