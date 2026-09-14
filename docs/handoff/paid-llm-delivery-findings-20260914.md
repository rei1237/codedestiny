---
status: active
updated: 2026-09-14
next: "P1 저장 실패 경로를 mock 재현하고 상품별 완료 조건을 통합 검증한다."
---

# 다른 유료 LLM 기능 조사 근거

기준 `0e2dff85192f077ab62bb58795937b1515a50fd5`. 운영 로그·주문·실 LLM은 조회/호출하지 않았다. 코드에서 확인한 경로와 위험 가설을 구분한다. 가격/상품 정본은 `worker/lib/paid-feature-registry.js`의 `FEATURE_KEY_PRICE_TABLE`, `PER_USE_PAID_FEATURE_KEYS`, aliases이다. 이름에 AI가 있다는 이유로 모두 실 LLM 상품이라 판단하지 않는다. 정적 해금·판매 중단 키·프롬프트 상품을 보존한다.

## 우선순위 P1: 코드에서 확인한 저장/완료 문제

저장 예외 삼킴은 로컬 mock으로도 재현했다. TypeScript AST로 현재 파일의 실제 함수 선언을 읽어 VM에서 DB 함수만 `MOCK_STORAGE_UNAVAILABLE` throw로 대체했다. `persistFusionDelivery`는 `""`, `persistNextBatch`는 `undefined`로 정상 resolve했다. 실제 DB 호출은 없으며, 전체 결제/HTTP 흐름 재현은 다음 단계다.

| 기능 | 정본 위치 | 확인된 경로와 다음 재현 |
|---|---|---|
| 운명의 찻집 5상품 | `worker/routes/fortune-tea-house.js:5253`, `:5315` handleConsult | deferred apply 후 `saveFortuneTeaHouseResult`와 리워드 지급을 같은 try로 감싼다. 저장 throw도 honey_reward_unavailable로 처리하고 ok:true 반환 가능. DB 저장 throw mock으로 성공 응답/차감 여부 확인. 저장 성공 전 완료 금지, 리워드 장애와 분리. |
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
