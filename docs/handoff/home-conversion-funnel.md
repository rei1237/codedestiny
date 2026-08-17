# 홈 전환 퍼널 개선 3건 (핸드오프)

작성: 2026-08-17 · 상태: **1·2번 구현됨 (PR #775) · 3번 부분**

이 문서만 읽고 시작할 수 있게 쓴다. 배경 전체는 [monetization-free-paid-boundary.md](monetization-free-paid-boundary.md) 에 있고,
여기는 사용자가 지목한 **3건만** 다룬다.

## 진행 상황 (2026-08-17, PR #775)

| 항목 | 상태 |
|---|---|
| 1. 히어로 1차 CTA | ✅ 완료 — 1차는 `#cdConcernPick`, 2차는 `/fusion-fortune/`. 노벨은 nav·세계관 존·푸터·검색에 유지 |
| 2. 고민 선택 → 상품 추천 | ✅ 마크업 완료 — `#cdConcernPick` 칩 6개, 고민당 상담 1개. **무료 AI 상담 `premiumCta` 연결은 미착수** |
| 3. 브랜드 분산 | 🔶 부분 — Moonlight Pass 노출 2곳(`membership-recap-cta`·`honeyMembershipMini`)은 홈에서 접었다. **캐릭터·상품명 정리는 미착수** |
| (추가 지시) 홈 IA 축약 | ✅ 완료 — 초기 노출 5개, 나머지 9개는 `data-cd-home-secondary` 로 감춤 + "모두 펼치기" 토글 |

이 작업에서 새로 확인한 것 — 다음 세션이 다시 재지 않도록:

- 🔴 `verify-adsense-readiness` 의 `getVisibleText`(`scripts/verify-adsense-readiness.mjs:618`)는 **태그만 벗기고 `hidden`·CSS 를 보지 않는다.** DOM 에 두고 감추면 광고·색인 글자수가 그대로 유지된다. 실제로 감춘 뒤 빌드해 `[adsense-readiness] OK` 를 확인했다.
- 🔴 전체 서비스 검색은 **가시성을 보지 않고** 인덱스를 만들고, 결과를 새 `a[href]`/`button[data-action]` 노드로 다시 만든다. 그래서 섹션을 감춰도 검색은 안 깨진다. 다만 `.moon-preview-card, .tarot-tile, .cd-pick-card, .moon-start-card, .prem-card, .feature-card` 에 안 걸리는 진입점(예: `fortune-gateway__door`)은 인덱스에 안 들어가니 EXTRA 목록에 손으로 넣어야 한다.
- 🔴 검색 EXTRA 목록은 `cd-service-search-extra-v20260817` **별도 블록**에 있다. 배선 블록(`cd-service-index-search-v20260723`)으로 되돌리지 말 것 — 8KB 를 넘으면 externalize 가 `data-marker` 를 버리고 `split-dist-boot-tasks` 허용목록이 죽어 **빌드가 실패한다**.
- 🔴 `i18n:translate-pending` 은 **Gemini 유료 실호출**이다(절대 규칙 1). 이 PR 의 신규 키 19개 × 12로케일은 전부 손으로 썼다.
- 인라인 스크립트는 파싱 중 실행된다 — 토글 핸들러를 히어로 근처에 두면 아래쪽 버튼을 못 찾아 **조용히 아무 일도 안 한다**(실제로 겪음). 대상 섹션 뒤에 둘 것.
- 기존 결함(이 PR 과 무관): `verify:mobile-bottom-nav-sync` 는 `/points/` vs `/points` 로 `origin/main`(bfb6dfa96)에서도 실패한다.

## 왜 하는가 — 진단

문제는 "무료 기능이 많다"가 아니라 **"무료에서 유료로 넘어갈 동기가 없다"** 다.
실제 첫 방문자 동선은 이렇게 끝난다.

```
유입 → "오 운세 사이트네" → 무료 운세 클릭 → 무료 콘텐츠 구경 → AI 상담도 해봄
→ "재밌네" → 다른 무료 기능 발견 → 또 해봄 → 이탈
```

목표 동선:

```
유입 → 고민 선택 → 무료 미니 분석 → "여기까지만 무료" → 맞춤 상품 추천
→ 왜 필요한지 설명 → 결제
```

상품 자체는 강하다(초융합은 "여러 체계가 같은 결론을 내리는지 검증한다" 는 진짜 차별점이다).
**상품이 아니라 판매 구조가 약하다.** 그래서 새 기능을 만들지 말고 노출 순서와 연결만 고친다.

---

## 1. 히어로 1차 CTA 가 색인도 안 되는 페이지로 간다 🔴 가장 급함

**실측**: `index.html:12101` 의 `moon-hero__cta--primary`("✦ 운명 여정 시작하기")가
`/codedestiny-novel.html` 로 간다.

- 그 파일의 실체는 `public/codedestiny-novel.html` 뿐이고 **루트 원본이 없다**
- `sitemap.xml` 411건 중 **0건** — 색인 대상이 아니다
- 반면 색인되는 노벨 리더 `/stories` + 44화가 **따로 있다**(sitemap 45건)
- i18n 키가 어긋나 있다: `home.hero2.primaryCta`("무료 운세 시작하기")는 **2번째 버튼**에 붙어 있는데
  시각적 primary 는 노벨 쪽이다
- 모바일 스티키 CTA(`index.html:15423`)만 "무료 운세 시작하기" → `/saju/basic/#destinyCardForm`

**할 일**: 1차 CTA 를 무료 경험(고민 선택 진입 또는 프롬프트 허브)으로 교체하고,
노벨은 `/stories` 로 보내되 우선순위를 낮춘다. i18n 키와 시각적 위계를 일치시킨다.

**주의**: 셸을 고치면 `npm run sync:public` 필수(미러 6벌). `verify:entry-encoding -- --strict-core` 로
한글 이스케이프 유입을 확인할 것(이 레포의 알려진 함정).

---

## 2. 고민 선택 진입 → 상품 추천 (신규)

히어로 바로 아래에 넣는다. 운세 체계가 아니라 **고민**으로 묻는다.

```
오늘 가장 궁금한 것은 무엇인가요?
❤️ 연애   💰 돈   💼 직업   🌙 올해 운   👤 특정 사람   🔮 전체 운
```

선택하면 **그 고민에 맞는 상품 1개를 지목**한다. 상품 목록을 다시 보여주지 않는다.

| 선택 | 추천 상품 | 근거 |
|---|---|---|
| ❤️ 연애 · 👤 특정 사람 | 인연의 서 (`master-love-codex`, 20,000원) | 관계 구조 + 시기 |
| 💰 돈 · 💼 직업 | 팩폭 전략실 (`neo-operation-room-consultation`, 30,000원) 또는 운명의 찻집(5,000원) | 저가 진입은 찻집 |
| 🌙 올해 운 | 신년운세 (`new-year-ai-consultation`, 30,000원) | |
| 🔮 전체 운 | 초융합 (`fusion-fortune-consultation`, 30,000원) | |

그리고 **모든 갈래의 아래**에 한 줄로: "6개 체계를 모두 교차검증하고 싶다면 → 초융합 리딩".

🔴 **가격을 클라이언트에 하드코딩하지 말 것.** 정본은 `worker/lib/paid-feature-registry.js:176`
(per_use) / `:324`(unlock) 이고, 프론트 해석기는 `lib/payment/server-feature-pricing.ts:52`
`resolveServerFeaturePricing` 이다. `verify:paid-gate-price-coverage` 가 `app`/`src`/`components`
스캔 루트에서 미해결 가격을 실패시킨다.

🔴 **결제는 반드시 공용 게이트를 탄다.** 셸이면 `_cdOpenPaidServiceGate`(`index.html:25310`),
React 면 `useCoinGate().ensurePaidAccess`. 커스텀 체크아웃은 금지 패턴이다
([payment-gating.md](../context/payment-gating.md) 참조).

### 무료 AI 상담을 상품 추천 엔진으로

무료 상담 답변 끝에 맞춤 상품을 연결한다. 서버가 이미 `premiumCta` 필드를 내려보내고 있다
(`worker/lib/guardian-fortune-runtime-contract.js:36`, 문구 지정은 `guardian-fortune-usage.js:702~`).
**새 배관을 만들지 말고 그 필드의 내용을 고민별 상품으로 바꾸는 것부터** 한다.

> 참고: 무료 상담은 2026-08-17 부터 **로그인 후 1회**다(비로그인 0회). PR #773.

### 상품 카피 역전 (같이 하면 효과가 크다)

지금은 생산량을 판다("20장 · 4.6만자 · 20,000원"). 고객이 사는 것은 결론이다.

**순서를 뒤집는다**: ①고객의 질문("이 사람과 나는 결국 어떻게 될까?") → ②확인하는 것 목록
(관계 구조 / 끌리는 이유 / 충돌 지점 / 움직이는 시기 / 먼저 움직여야 하는 쪽 / 행동 전략)
→ ③**마지막에** 분량과 가격.

---

## 3. 브랜드 분산

첫 방문자에게 이름이 6개 보인다: **연이 · 네오 · CODE DESTINY · 꿀꿀 운세 ·
Destiny Flower Atelier · Moonlight Pass**. "이게 하나의 서비스인가?" 가 된다.

특히 **Moonlight Pass(달빛 이용권)** 는 콘텐츠 가격표(3,000~30,000원) 위에 **가격표를 하나 더**
얹는다(9,900 / 29,900 / 59,000 / 149,000원 — 정본 `lib/payment/pass-pricing.js:16`).
첫 구매 결정을 방해한다.

**할 일**: 캐릭터(연이·네오)는 **말투/페르소나**로만 남기고 상품명에서 빼며,
Moonlight Pass 는 첫 방문 동선에서 내리고 **첫 구매 이후**에 노출한다.

🔴 **삭제하지 말 것** — CLAUDE.md 절대 규칙 6(기존 기능·라우트·배지·콘텐츠를 요청 없이 삭제 금지).
노출 위치와 우선순위만 바꾼다. 이용권 상점 라우트(`/points`)와 결제창의
**[이용권으로 구매] 카드는 반드시 유지**한다(결제창 3옵션 동등 노출이 강제 규칙이고
`verify:payment-choice-parity`·`verify:checkout-pass-card` 가 막는다).

---

## 함께 보이는 정리 대상 (범위 내)

- 모바일 하단 nav 칩 스트립 9개(`index.html:15427`) — CSS `display:none!important` + `hidden` 으로
  완전 비활성인 **죽은 UI**
- `data-service-detail-href="/services/…"` 19건 중 **7경로가 존재하지 않는 라우트**
  (유일한 소비자 `_cdNavigateToServiceDetail`(`index.html:33118`)이 즉시 `return false` 해서 불발)
- 셸 `/points/` vs 정본 `/points` 슬래시 불일치
- SEO 랜딩 CTA 8개가 `/` 로 낙하(`/manse`·`/today`·`/saju/compatibility`·`/tarot/reunion`·
  `/tarot/mindscan`·`/astrology`·`/dream`·`/physiognomy`·`/love`), 유료 랜딩 5개는
  `noindexPathPrefixes` 로 **색인 자체가 안 되고** `/premium` ↔ `/premium-reports` 순환

---

## 착수 순서 (권장)

1. **1번(히어로 CTA)** — 가장 작고 효과가 즉시 난다. 단독 PR.
2. **3번(브랜드 분산)** — 노출 순서만 바꾸는 것이라 위험이 낮다.
3. **2번(고민 선택)** — 신규 마크업 + 상품 매핑이라 가장 크다. 마지막.

## 검증

```bash
npm run sync:public                      # 셸 변경 시 필수 (미러 6벌)
npm run verify:public-parity
npm run verify:entry-encoding -- --strict-core
npm run verify:paid-gate-ui
npm run verify:payment-choice-parity
npm run verify:checkout-pass-card
npm run verify:paid-gate-price-coverage
npm run verify:mobile-bottom-nav-sync    # 하단 nav 를 건드리면
npm test
npm run build && node scripts/verify-adsense-readiness.mjs   # 정적 카피를 줄이면 필수
```

🔴 `verify-adsense-readiness` 는 라우트별 최소 렌더 텍스트(광고 1,200자 / 색인 1,800자) 미달 시
**빌드를 실패시킨다.** 홈 카피를 덜어낼 때 반드시 재측정할 것.
사전경보 도구 `scripts/audit-content-headroom.mjs` 는 **플랫 `.html` 라우트를 못 본다**(디렉터리
형태만 스캔) — 그래서 침묵한 채 postbuild 가 죽는다.

🔴 과금 LLM 실호출 금지. `--live` 계열은 돌리지 않고 "미검증"으로 남긴다.
