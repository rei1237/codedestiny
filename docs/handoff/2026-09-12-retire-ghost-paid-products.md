---
status: active
updated: 2026-09-12
next: "PR #1948(유령 유료 상품 2종 철거)의 필수 CI 통과와 머지를 확인한다. 그다음 과제는 아래 '남은 후속' 에서 사용자와 하나만 고른다."
---

# 유령 유료 상품 2종 철거 인수인계

- 날짜: 2026-09-12
- 브랜치: `chore/retire-ghost-veda-nakshatra-products` (base: `origin/main` d3fe1881f = 배치 5+ PR #1946 머지 커밋)
- PR: https://github.com/rei1237/codedestiny/pull/1948
- 워크트리: `D:/Development/code-destiny-wt/retire-ghost-products`
- 앞 세션: `docs/handoff/2026-09-12-detail-copy-batch5-plus.md`

## 무엇을 했나

앞 세션이 사용자 결정으로 남긴 2종 — `nakshatra-compat-ai`, `premium-veda-compatibility-addon` —
을 **가격표에서 철거**하기로 결정하고(사용자 선택) 전량 제거했다.

판단 근거(실측):

- 두 키 모두 `app/`·`js/`·`worker/routes/`·`functions/` 에 문자열 0건 → 클라이언트가 이 featureKey 를
  서버로 보낼 경로가 없다 → 주문 행이 생길 수 없다.
- 따라서 `human-design-chart`(`worker/lib/paid-feature-registry.js`)의 "판매 중단이어도 과거 주문·환불·
  리뷰 자격 조회 때문에 키는 남긴다" 선례는 **실제로 팔린 키**에 대한 계약이므로 적용 대상이 아니다.
- 대조군: 같은 축 `nakshatra-compat` 은 `app/nakshatra/compat/NakshatraCompatClient.tsx` +
  `worker/routes/nakshatra.js:56` 로 완결. 형제 애드온 `premium-sukuyo-compat-extra` 도
  `js/saju-engine-tarot-sukuyo-quantum.js:7844` 에 구현이 있다.

🔴 앞 세션 문서는 "카피를 저작하지 않았다" 고 적었지만 **실제로는 index.html 에 두 키의 카피가 이미 있었다**
(`receives`/`outline` 만 없는 상태). 존재하지 않는 상품의 홍보 문구가 이미 나가 있었다는 뜻이다.

## 지운 곳 (전부 한 커밋)

- `worker/lib/paid-feature-registry.js` — 가격표 2줄, `PER_USE_PAID_FEATURE_KEY_LIST` 2줄,
  `INTERNAL_FRONTEND_FEATURE_KEYS` 1줄
- `worker/lib/review-product-catalog.js` — 리뷰 자격 featureKey 2줄
- `index.html` — `FEATURE_MARKETING_COPY` 항목 2개 (162 → 160)
- `public/i18n/*.json` — `featureMarketing.nakshatra_compat_ai`,
  `featureMarketing.premium_veda_compatibility_addon` 을 11개 로케일에서
- `__tests__/worker/coin-access.guard.test.js` — 사라진 키의 서버 가격 300 단언 블록
- 생성물: `npm run sync:public`(미러 6벌 · generated JSON · 캐시버스터), `npm run sitemap:generate`

🔴 **한 커밋이어야 하는 이유**(다음에 비슷한 철거를 할 때 그대로 적용된다):

1. 레지스트리 ↔ 리뷰 카탈로그가 **양방향 결합**이다. 카탈로그만 지우면
   `__tests__/worker/review-catalog-moderation.test.js:33-48`(카탈로그→레지스트리)이,
   레지스트리만 지우면 같은 파일 `:88-119`(레지스트리→카탈로그)가 깨진다.
2. 셸 카피를 레지스트리보다 **먼저** 지우면 `scripts/verify-feature-marketing-schema.mjs:263-277`
   (₩30,000 이상 상품 = 마케팅 카피 필수)이 깨진다.
3. `INTERNAL_FRONTEND_FEATURE_KEYS` 를 남기면
   `__tests__/worker/paid-feature-registry.integrity.test.js:12`(프론트 키 ⊆ 서버 가격표)가 깨진다.

## 검증 (실행함)

- `npm run check:fast` → **EXIT 0** / jest **226 suite · 2666 tests** 전부 통과
- `verify:feature-marketing-schema` OK — 카피 160개 / 고가 상품 15종 카피 보유
- `verify:feature-marketing-dictionary` OK — 사전 없는 COPY 키 0개
- `verify:public-mirror-fresh` OK · `verify:public-parity` OK · `verify:payment-freeze` 통과(region 4·file 3)
- `verify:home-service-registry` OK(레지스트리 57개 · 셸 결제 타일 31개)
- `node scripts/i18n-check.mjs` OK(12 로케일 12604 키) · `node scripts/verify-i18n-public-parity.mjs --all` OK
- `node --test` UI 정적 3스위트 25/25

## 이 세션에서 배운 함정

- `verify:public-mirror-fresh` 는 **작업 트리가 더러우면 FAIL** 한다("판정 불가는 통과가 아니다").
  커밋한 뒤에 돌려야 OK 가 나온다.
- `index.html`·`public/i18n/*.json` 을 건드리면 사이트맵 **서명**이 바뀌어 `verify:sitemap-drift` 가 문다
  (URL 집합은 그대로, lastmod·priority 만 어긋남). `npm run sitemap:generate` 산출물을 같은 커밋에 담아야 한다.
  이번엔 52개 라우트가 갱신됐다.
- 새 워크트리에는 `node_modules` 가 없다. 기존 워크트리와 같은 방식으로
  루트 `D:\Development\code-destiny\node_modules` 로의 **junction** 을 만든다
  (`New-Item -ItemType Junction`). 없으면 `npm run sync:public` 이 parse5 missing 으로 죽고
  `npx --no-install jest` 는 "missing packages" 로 죽는다.
- jest 는 `npx jest` 가 아니라 `node scripts/run-mock-tests.mjs jest <경로>` 로 돌린다.
  직접 부르면 `--experimental-vm-modules` 가 없어 전 스위트가 동적 import 에서 죽는다.
- `ci:preflight` 는 **이 베이스(d3fe1881f)의 package.json 에 없다**. 루트 작업트리의 미커밋 변경에만 있다.

## 남은 후속 (보고만, 손대지 않음 — 다음 세션은 이 중 하나만 고른다)

1. `premium-ziwei`(200코인 해금)에 **게이트가 어디에도 없다** — 배치 4부터 계속 미해결.
2. `/api/astrology-ai/message`, `/api/ziwei-ai/message` 는 **호출자 0** — 배치 4부터 미해결.
3. `nakshatra-vvip-codex.js` 의 가격 주석(₩10,000/₩15,000)이 레지스트리(각 100코인)와 어긋남(주석이 낡음).
4. 타일 프리뷰 `var D={}` 의 `openJuyukModal` 이 "한자 원문 제공" 을 주장하는데 근거 미확인.
5. 상세 시트의 **실제 화면 검증**(배치 1~5 전부 미실시) — 정적 검증기는 줄바꿈·넘침을 못 잡는다.
6. `vedic-compatibility-per-use`(50코인)도 `js/`·`app/`·`worker/routes/` 에 호출부가 안 잡혔다.
   이번 철거 2종과 같은 유령일 가능성이 있으나 **이번 범위 밖이라 확인만 하고 손대지 않았다**.

## 다음 세션 첫 문장

> `docs/handoff/2026-09-12-retire-ghost-paid-products.md` 를 읽고, PR #1948 의 필수 CI 통과와 머지를
> 확인한 뒤 "남은 후속" 6개 중 어느 것을 할지 사용자에게 물어 하나만 진행한다.
