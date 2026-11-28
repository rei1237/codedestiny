# AI 고객지원 설계 (AI_SUPPORT_ARCHITECTURE)

상태: **S9 구현(2026-11-28, mock 검증까지).** Workers AI·Gemini 실호출은 **NOT_TESTED**(정확한 1회 승인 전 금지). 2026-11-28 사용자 결정: Workers AI 우선, Gemini flash 대체.

## 원칙

- LLM 은 MongoDB 와 관리자 API에 직접 닿지 않는다. **도구를 주지 않는다.** 서버가 로그인한 본인 userId 로만 읽은 요약을 프롬프트에 넣는다.
- 결제 복구·환불은 LLM 판단으로 실행하지 않는다. 답은 기존 사용자 경로(결과 화면의 재시도·대기, 문의하기)로 안내만 한다.
- 규칙·FAQ 로 답할 수 있으면 LLM 을 부르지 않는다.

## 구성 (구현 위치)

1. 입구: `app/yeongnyangi/_components/SupportDesk.tsx`(+ `support-desk.module.css`). `/yeongnyangi/faq/` 본문 아래(KoreanOnly 안)와 `/yeongnyangi/library/` 상단(ko 화면만)에 둔다. 기존 `HelpDesk.jsx` 는 영냥이 화면에서 쓰지 않아 확장하지 않았다.
   - 1층(LLM 없음) "결제했는데 결과가 없어요": 펼칠 때 기존 `GET /api/yeongnyangi/requests` 를 한 번 읽어 `paid && state∉{COMPLETED,REFUNDED}` 만 보여 주고 결과 화면(`resultPath`)으로 보낸다. 비로그인은 로그인 버튼 + `OrderLookup`(내 상담 화면은 이미 OrderLookup 이 있어 중복 id 를 피하려고 끈다).
   - 2층 "영냥이에게 물어보기": `POST /api/yeongnyangi/support`. 401 이면 로그인 안내, 429 면 횟수 소진 안내, 그 밖 실패는 재시도 안내.
2. 지식: `worker/yeongnyangi/support-knowledge.ts`. FAQ 문구(`YEONGNYANGI_FAQS`, FAQ 페이지·FAQPage JSON-LD 와 같은 배열 — YeongnyangiGuide 가 여기서 다시 내보낸다), 가격(카탈로그 `products`/`packages`), 브랜드(`lib/brand/brand-facts.mjs`)를 import 해 요청 때 JSON 으로 만든다. 별도 빌드 산출물은 없다(같은 모듈 import 가 단일 정본).
3. API: `worker/yeongnyangi/support.ts`, `worker/routes/yeongnyangi.js` 의 인증·쓰기 보안(30회/60초) 뒤.
   - 질문 2~300자(밖이면 400). 응답 `Cache-Control: private, no-store`, 모든 응답에 `contactHref`.
   - 순서: FAQ 키워드 일치(`matchFaq`, LLM·상한 안 씀) → 상한 → 본인 요약 → LLM → 고정 폴백.
   - 본인 요약(`ownOrderSummary`): `find({userId: ownerId(userId), persona: null})` 최근 10건, 상품명·상태·결제 여부·장 진행·재시도 가능·날짜·ref(sha256 앞 12자)만. 이름·생년월일·질문·상담 본문은 넣지 않는다.
4. LLM: `callGeminiText(..., {primaryProvider:'cloudflare', maxProviderAttempts:1, maxOutputTokens:1024, thinkingBudget:0, timeoutMs:20000})`. `lib/llm-client.ts` 에 `primaryProvider` 를 추가했다: Workers AI 를 먼저 한 번(전체 시간의 절반 안) 시도하고, 콘텐츠 차단이 아닌 실패면 Gemini 를 한 번(Workers AI 재폴백 없음). 그래도 실패·빈 답·mock 이면 고정 문구(내 상담·문의하기 경로) 200.
   - 답 형식은 거부하지 않고 결정적으로 교정한다(`clampSupportAnswer`: 마크업 제거, 800자 안 문장 끝에서 자름).
5. 제한(`worker/lib/security` `enforceRateLimit` 재사용): 사용자 하루 10, 전체 하루 300, 전체 30일 3,000. **fail-closed** — 한도 초과, 카운터 없음(가드 off·DB 오류), 예외 모두 LLM 을 부르지 않고 429 + 폴백 + Retry-After. 모니터 모드에서도 count 로 막는다.
6. 넘김: `/contact/?ref=<sha256 앞 12>&feature=<cdFeatureKey>` 와 화면의 복사 가능한 문의 번호만. 문의 페이지는 아직 쿼리를 읽지 않으므로 사용자가 번호를 적어 보내는 방식이다.

## 알려진 한계·결정

- `applyOutputLocale` 가 모든 systemPrompt 에 상담 가이드(약 3.6KB)를 덧붙여 호출당 입력 토큰이 그만큼 늘어난다. 고객센터만 빼는 옵션은 만들지 않았다.
- FAQ 일치가 주문 질문보다 먼저다. "결제했는데 결과가 없어요" 류는 FAQ(멈춤·환불 안내)로 답하고 LLM 을 부르지 않는다 — 1층 카드가 본인 주문을 직접 보여 주므로 비용을 아끼는 쪽을 택했다.
- 비로그인 2층 질문은 받지 않는다(로그인 안내만).

## 검증 (2026-11-28 실측, 전부 mock)

- `node --test __tests__/ui/yeongnyangi-support.test.mjs` 7/7: FAQ 는 LLM·상한 미사용, 400, 본인만 조회·다른 계정·생년월일·질문 원문 프롬프트 0, 상한 초과 429+폴백, 카운터 없음·예외 fail-closed, LLM 실패·빈 답·mock·throw 폴백, 긴 답 교정.
- `node --test __tests__/ui/llm-gemini-first.test.mjs` 11/11(primaryProvider 2건 추가). jest `__tests__/worker/yeongnyangi-route.test.js` 46/46(인증 userId 위임·보안 엔드포인트·401).
- 변이: 상한 fail-open 으로 바꾸면 2건 실패, 소유자 조건 제거하면 1건 실패(둘 다 잡힘).
- 390px headed Chrome(API 401 mock, 비로그인) 캡처: FAQ·내 상담 각 접힘/펼침. 가로 넘침 없음, 44px 미만 탭 대상 없음.
- SEO: `/yeongnyangi/faq/` title·description·H1·robots 가 소스 상수 그대로, FAQPage JSON-LD 원본 배열은 이동 전후 바이트 동일. API 는 색인 대상 아님(no-store, 인증).
- **NOT_TESTED**: Workers AI·Gemini 실호출, 운영 카운터 동작, 실제 비용.
