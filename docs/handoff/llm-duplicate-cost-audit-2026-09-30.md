---
status: active
updated: 2026-09-30
next: 대상 변경만 커밋하고 main CI에서 검증한다. 실 LLM 및 운영 결제는 실행하지 않는다.
---

# LLM 중복 전송과 타임아웃 후 추가 호출 점검

이번 범위는 실제 공급자 생성 경계와 그 호출부를 좁게 추적한 코드·mock 검증이다. 실사용 토큰, 실제 청구액, 출력 품질의 공급자 실측은 아니다. 별도 영냥이 이용권/월정석 금융 검토 패치는 그대로 보존했으며 이 작업에서 금융 소스나 DB 스키마를 변경하지 않았다.

## 공용 생성 경계

- worker/lib/gemini.js의 callGeminiText → lib/llm-client.ts의 callLLM → Gemini fetch 또는 허용된 Workers AI env.AI.run이 공용 경계다.
- worker/lib/structured-consultation.js는 callGeminiText를 호출한다. 상위 JSON helper는 전체 deadline을 공유하고 1회 전송씩 요청한다. paid-generation-context 안에서는 helper도 1회다.
- worker/lib/gemini-client.js의 generateWithGemini는 callLLM에 바로 연결된다.
- Gemini countTokens, cachedContents 생성/삭제는 생성 호출이 아니다. 입력 상한 확인을 위한 전체 본문 전송과 캐시 CRUD를 임의로 생략하지 않았다.
- 응답 캐시와 in-flight dedup은 lib/llm-cache.ts가 담당한다. 이 파일과 키 생성 방식은 변경하지 않았다. 이미 저장된 응답은 timeout 뒤에도 새 생성 없이 읽을 수 있다.
- 조사 범위 worker/, lib/의 실제 generateContent 및 AI.run 경계는 lib/llm-client.ts에 모인다. 브라우저 상담 요청/관리자 프롬프트 미리보기는 공급자 직접 생성 경계가 아니다.

## 적용 서비스군과 예외

| 서비스군 | 확인한 호출 경로 |
|---|---|
| 사주·점성술·베다·자미두수·숙요 | worker/routes/fortune.js, astrology-ai.js, vedic-ai.js, ziwei-ai.js, ziwei-deep-report.js, ziwei-island-ai.js, sukuyo-compatibility-ai.js, nakshatra-ai.js → 공용 Gemini helper |
| 인생책·새해·카르마·나침반 | life-book-ai.js, new-year-ai.js, karma-destiny-ai.js, destiny-compass.js, destiny-compass-ai.js → 공용 helper |
| 찻집·네오·연애·해몽·신탁 | fortune-tea-house.js, neo-operation-room.js, love-secret-ai.js, master-love-codex.js, dream.js, oracle.js, yoga-guru.js → 공용 helper |
| 동물·휴먼디자인·수호령 | animal-totem.js, human-design-report.js, worker/lib/guardian-fortune-llm.js → 공용 helper |
| 유료 장문·타로·관계·작명·손금 등 | paid-narrative-delivery.js, feature-question-delivery.js, celestial-report-delivery.js, love-tarot-delivery.js, mindscan-delivery.js, naming-report-delivery.js, relationship-report-delivery.js, tarot-oracle-delivery.js, tarot-oracle-llm.js, palm-vision.js → 공용 helper |
| 초융합 | worker/lib/fusion-fortune.js → structured-consultation.js → 공용 helper |
| 영냥이 질문 분석·본문 생성 | CodeDestinyProvider.analyzeQuestion 및 generate 모두 worker/lib/gemini.js. 별도 직접 Gemini 호출 예외가 아니다. 각각 maxProviderAttempts:1, fallback:false이며 durable chapter/analysis 복구는 별도 서비스 책임이다. |
| Threads 글 생성 | threads-ai-writer.js, threads-daily-providers/shared.js → 공용 helper. 일반 상담과 별도 상위 업무 흐름이지만 공급자 timeout 차단은 동일 적용된다. |

상위 기능마다 저장, 검증, 복구 계약은 다르다. 공용 helper의 한 호출 안에서 추가 생성을 차단한 것을 모든 상품의 상위 재시도 또는 다른 HTTP 요청까지 모두 제거했다고 해석하면 안 된다. Neo의 직접 helper 루프는 실패 응답에 재시도하지 않고, structured helper는 timeout 코드로 반복을 중단하는 것을 확인했다. durable 저장 계층의 회계/복구 정책은 유지했다.

## 수정과 보존

1. 생성이 시작된 뒤 HTTP 408/504, AbortError/TimeoutError, 명시적 timeout/deadline이 발생하면 LLM_GENERATION_TIMEOUT으로 중단한다. 로컬 시간이 남아 있어도 같은 호출의 캐시 없는 재생성/다른 공급자/다음 Workers AI 모델로 넘어가지 않는다. 생성 전에 countTokens가 실패한 경우의 기존 폴백과 429/503의 제한된 재시도는 유지한다.
2. 초융합 9그룹은 동일 스키마가 본문 JSON 및 generationConfig.responseSchema에 함께 실렸다. 실제 전송에서 본문 사본만 제거한다. API 스키마의 필수 키·순서·배열 최소 개수·모든 설명문은 동일하다. 관리자 미리보기의 본문 스키마는 그대로 보인다.
3. 한국어 9그룹 1회씩의 정적 본문 길이 감소는 legacy 5,766자, fusion-expert.v2 6,602자다. 입력 토큰이나 요금 실측값이 아니다.
4. system/user 양쪽의 출력 언어 지시는 기존의 우선순위 안전 요구이므로 유지한다. 점술 근거, 질문, 보정 지침, locale, 모델, 출력 토큰 한도, 가격, 결제 권리에는 이번 변경이 없다.

## 검증

- node --test __tests__/ui/llm-total-generation-budget.test.mjs __tests__/ui/fusion-schema-transmission.test.mjs __tests__/ui/gemini-input-token-limit.test.mjs __tests__/ui/llm-cache-quality.behavior.test.js: 31/31.
- npm run test:jest -- --runInBand __tests__/worker/fusion-fortune.test.js: 64/64.
- 추가 timeout/fallback 가드는 기존 호출 수·시간 제한을 유지하고, 새 명시적 timeout 코드로 기대값을 갱신했다.
- 모든 공급자 함수는 fixture/stub이다. 실 LLM·실결제·운영 DB·배포 실행 0.
