---
status: active
updated: 2026-09-12
next: "배치 5+ PR #1946 의 머지를 확인한 뒤, nakshatra-compat-ai · premium-veda-compatibility-addon 2종을 구현할지 가격표에서 내릴지 사용자에게 확인하고 처리한다."
---

# 상세창 카피 배치 5+ (남은 전량) 인수인계

- 날짜: 2026-09-12
- 브랜치: `feat/detail-copy-batch5-plus` (base: `origin/main` 99a0e1e27 = 배치 4 PR #1943 머지 커밋)
- 워크트리: `D:/Development/code-destiny-wt/detail-copy-rest`
- 앞 세션: `docs/handoff/2026-09-12-detail-copy-batch4-ziwei-astro.md`

## 무엇을 했나

배치 4까지 쓰던 `receives`·`outline` 형식으로 **남은 유료 상품 전량**을 옮겼다.
요청은 "배치 5 = ₩30,000 AI 상담 6종 + 가능하면 나머지도 한 번에" 였고, 배치 5를 포함해 한 번에 처리했다.

실측 기준선(작업 전):

- 가격표(`FEATURE_KEY_PRICE_TABLE`)에 걸리는 COPY 키 109개
- 그 중 `receives` 보유 50개 / 미보유 59개 → featureId 기준 **34종**
- 34종 → `inherit` 별칭을 따라간 본체 키 34개, 사전 네임스페이스 34개 전부 `public/i18n/en.json` 에 이미 존재(사전 신규 생성 없음)

실제 이관: **32종**. 2종은 의도적으로 제외했다(아래 "만들거나 지워야 할 2종").

## 결과 (검증 완료)

`npm run check:fast` → **EXIT 0**. jest 226 suite / 2669 tests 전부 통과.

개별 검증기:

- `verify:feature-marketing-schema` OK — 카피 162개 / 템플릿 9개 / 실측 reportScale 17개 / 고가 상품 17종 카피 보유 / 가짜 결과 예시 0
- `verify:feature-marketing-dictionary` OK — 로케일 11개 / 네임스페이스 108개 / 경로 47047건 / 사전 없는 COPY 키 0개
- `verify:public-parity` OK, `verify:payment-legal-copy` PASS(게이트 14경로), `verify:rpt-preview-cta` OK,
  `verify:payment-freeze` 통과, `verify:sitemap-drift` OK(URL 860)
- `verify:mobile-detail-render` OK(2테마 × 4기능 @390x844), `verify:mobile-detail-nonintrusive` OK

🔴 배치 4 문서가 적어 둔 `npm run verify-feature-popup-journey` 는 **package.json 에 존재하지 않는 이름**이다.
실재하는 것은 `verify:mobile-detail-render`, `verify:mobile-detail-nonintrusive`, `verify:mobile-journeys`,
`verify:ziwei-chart-detail-view` 다. 다음 세션은 이 이름을 쓸 것.

## 미검증으로 남은 것

Playwright/실제 화면 캡처로 상세 시트를 **눈으로** 확인하지 않았다. 배치 1~5 전부 동일하다.
정적 검증기만으로는 줄바꿈·넘침 같은 렌더 문제를 못 잡는다 — 별도 과제로 남긴다.

## 패처를 새로 만든 이유 (다음 배치도 이걸 쓸 것)

배치 3에서 `after` 삽입형 패처가 뒤따르는 기존 필드를 옛 값으로 되살린 사고가 있었다.
34종을 손으로 한 줄씩 갈아끼우면 그 사고가 재발할 확률이 너무 높아, 도구를 바꿨다.

- `tmp/rest/patch-copy.cjs` — 항목 리터럴을 **파싱 → 병합 → 재직렬화**한다. 쓰기 전에 새 줄을 다시 파싱해
  기대 병합값과 깊은 비교(왕복 검증)하고, 하나라도 어긋나면 **아무것도 쓰지 않고** 종료한다.
- `tmp/rest/selftest-serializer.cjs` — 기존 항목 162개 전부를 왕복시켜 직렬화기가 값을 안 바꾸는지 실증했다
  (통과 162 / 실패 0).
- `tmp/rest/apply-dict.cjs` — 축별 사전 조각을 로케일별로 합쳐 `public/i18n/*.json` 에 병합. ko 는 건너뛰고,
  저작 4개(en·ja·zh-cn·zh-tw) 외 7개는 en 복사.

패처가 실제로 막아 준 사고 2건:

1. `'/neo-operation-room'` 앵커가 2곳에서 잡혔다 — 하나는 COPY 가 아니라 **타일 프리뷰 `var D={`**(line 33809) 였다.
   탐색 범위를 `FEATURE_MARKETING_COPY` 블록 안으로 제한해 해결. 🔴 같은 키가 두 객체에 산다는 것을 잊지 말 것.
2. 하이픈 키는 `keyLit()` 이 이미 따옴표를 씌워 두 후보 리터럴이 같아지며 "두 표기로 모두 존재" 오탐이 났다.

## 실측으로 바로잡은 거짓 문구 (이 작업의 최대 산출)

카피를 옮기면서 코드를 실제로 읽고, 증명되지 않는 약속은 쓰지 않거나 고쳤다.

- `/fortune-chat/` — 처음 쓴 초안이 "하루 1회 무료" 라고 했는데 **틀렸다**.
  `worker/lib/guardian-fortune-usage.js` 의 `GUARDIAN_FORTUNE_ACCOUNT_FREE_LIMIT = 1`, `GUEST_LIMIT = 0` 이며
  2026-08-17 정책 변경으로 **계정당 총 1회**(비로그인 0회)다. 하루치가 아니다.
  `__tests__/ui/guardian-fortune.static.test.js:92` 가 index.html 전체에 `매일 무료|하루 무료` 를 금지하는 이유가 이것이다.
  ko + en·ja·zh-cn·zh-tw 5개 파일을 "계정당 1회" 로 고쳐 통과시켰다. 회당 5,000원은 정본과 일치(`fortune-chat-consultation`).
- `openYogaGuru` — "사주·별자리 기반 에너지 타입" 이라 주장했으나 워커는 **자유 입력 기분 글만** 읽는다. 문구를 실제 동작으로 교체.
- `/saju/destiny-meeting-place` — "이미지 생성 프롬프트" 를 준다고 했으나 실제 산출은 **다른 AI 에게 물어볼 텍스트 카드 7장**.
- `openNevilleMeditationPage` · `openYogaGuru` — `cost` 에 60분 5,000원 구간이 빠져 있었다. 두 구간 모두 표기.
- `/fortune-tea-house/` — 고정 3카드가 아니라 **3카드(5,000원)/5카드(7,000원) 선택식**.
- "다시 보기" 류 약속은 코드가 증명하는 곳에만 남겼다. `neo-operation-room` 은 코드 주석이
  "재사용 = 무료 재열람 오해" 라고 명시적으로 경고하고 있어 쓰지 않았다.
- 기존 필드에 박혀 있던 금지어(`기능`·`데이터`·`프롬프트`)를 다수 걷어냈다.
  🔴 금지어 검사는 `receives` 가 생긴 항목의 **JSON 전체**에 걸린다 — 새로 쓴 문장만 깨끗해선 통과 못 한다.

## 만들거나 지워야 할 2종 (사용자 결정 필요)

`nakshatra-compat-ai`, `premium-veda-compatibility-addon` 은 **구현이 아예 없다**.
워커 라우트도, 앱 페이지도, 클라이언트 fetch 도 없다(배치 2 인수인계의 결론과 동일).
가격표에만 존재한다. 없는 상품의 상세 카피를 쓰는 것은 거짓말이므로 저작하지 않았다.

→ 다음 판단: **구현하거나, 가격표에서 내리거나** 둘 중 하나. 방치하면 결제 가능한 유령 상품으로 남는다.

## 범위 밖 후속 과제 (보고만, 손대지 않음)

1. 타일 프리뷰 `var D={}` 의 `openJuyukModal` 이 "한자 원문 제공" 을 주장하는데 근거를 못 찾았다.
2. `nakshatra-vvip-codex.js` 의 가격 주석이 ₩10,000/₩15,000 인데 레지스트리는 각각 100코인이다(주석이 낡음).
3. `premium-ziwei`(200코인 해금) 는 **어디에도 게이트가 없다** — 배치 4에서 보고된 그대로 미해결.
4. `/api/astrology-ai/message`, `/api/ziwei-ai/message` 는 **호출자 0** 이다 — 배치 4 보고 그대로 미해결.
5. 상세 시트의 실제 화면 검증(배치 1~5 전부 미실시).

## 다음 세션 첫 문장

> `docs/handoff/2026-09-12-detail-copy-batch5-plus.md` 를 읽고, 배치 5+ PR 의 머지를 확인한 뒤
> `nakshatra-compat-ai` · `premium-veda-compatibility-addon` 2종을 **구현할지 가격표에서 내릴지** 사용자에게 확인하고 처리한다.
