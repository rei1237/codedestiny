# 무료→유료 경계 재설계 (핸드오프)

작성: 2026-08-17 · 상태: **계획만 있음, 구현 안 됨**

이 문서만 읽고 시작할 수 있게 쓴다. 실제로 착수한 것은 **누수 봉인뿐**이고(아래 §0),
무료 축소·상품 재편·GA4 퍼널은 전부 미착수다.

---

## 0. 이미 끝난 것 — 누수 봉인 (구현 완료)

무료 축소와 무관하게 **이미 유료로 팔던 콘텐츠가 결제 없이 읽히던** 문제를 먼저 막았다.
전부 "계산된 본문을 게이트 컨테이너에 넣고 CSS `filter: blur(6px)` 만 씌운다" 는 같은 형태였고
(`index.html:1471`), 개발자도구로 클래스 하나만 지우면 전문이 보였다.

| 콘텐츠 | 가격 | 봉인 방식 |
|---|---|---|
| 사주 종합 풀이 `section_summary` | 5,000원 | `renderSummary` 를 `_cdSajuGateUnlocked` 뒤에서만 호출 |
| 사주 대운 `section_daewun` | 5,000원 | `G_DAEWUN` 은 게이트 밖에서 채우고 DOM 기록만 안으로 |
| 관상 오관·점 `physiognomy-ogwan-mole-deep` | 5,000원 | `buildLockedSectionHtml` 이 인자를 안 받게 |
| 자미두수 기본 심화 6종 (`zwBasicPaidGateHtml`) | 각 10,000원 | `_cdGateBody(key, html)` 경유 |
| 자미두수 대한 10년운 `ziwei_decade_luck` | 10,000원 | 〃 |
| 점성술 심화 9종 (`_astroCounselPaidGate`) | 각 5,000원 | 〃 |

기전: `js/saju-engine.js` 의 `_cdGateBody()` 가 잠긴 동안 본문을 **보류 레지스트리에 담고 빈
컨테이너를 낸다**. 해금 시 `_cdFillGateBodyIfPending()` 이 그 자리에 채운다 — 호출 지점은
`zwSetBasicPaidGateUnlocked` · 점성술 재바인딩 · `index.html` 의 `applyDynamicPaidContentGates`
셋이다.

🔴 **남은 한계**: 사주·자미두수·점성술·관상은 전량 클라이언트 계산이라 클라이언트만으로
완전히 막을 수 없다. 이 작업이 닫은 것은 "CSS 클래스 하나 지우면 보인다" 는 경로이고,
콘솔에서 보류 레지스트리를 직접 읽는 것은 여전히 가능하다. 완전한 집행은 서버 생성으로
옮겨야 한다. ~~워커 번들이 무료 플랜 78.7% 라 별도 판단이 필요하다.~~ — **2026-08-23 정정: 번들
예산은 유료 플랜 10 MiB 이고 현재 사용률은 23.9%(gzip 2.39 MiB) 다. 크기는 더 이상 이 판단의
제약이 아니다** (판정 정본 `npm run verify:worker-size`).

### 아직 안 막은 누수 1건 — 연애/재회 타로
`worker/routes/tarot.js` 의 `/reading` 은 **무료 리딩(힐링·자존감·명리)과 유료 재회 타로가
같은 엔드포인트를 공유**하는데 서버에 spreadType→featureKey 매핑이 없다
(`normalizeSpreadType` 은 `lib/tarot/spreads.mjs:239` 의 범용 정규화일 뿐). 무차별
`verifyPerUsePayment` 를 넣으면 무료 리딩이 죽는다.

필요한 작업: ① 재회/연애 타로가 실제로 보내는 spreadType·category 실측 ② 매핑 테이블 신설
③ 그 조합에만 `verifyPerUsePayment` 적용 ④ 무료 3종 회귀 테스트.
🔴 `payments.js`·`billing.js` 는 줄 수 상한 여유 0이므로 **`tarot.js` 안에서만** 끝낸다.

---

## 1. 확정된 정책 (사용자 결정, 2026-08-17)

| 항목 | 결정 |
|---|---|
| 오늘의 운세 `/today` | **잠그지 않는다** (전문 포함 현행 유지) |
| 기본 계산 결과·차트 | **무료 유지** — 만세력 표, 명반 12궁 배치, 점성술 차트 도형, 베다 차트, 본명숙 판정, 타로 드로우 |
| 그 위의 **해석 텍스트** | 전부 잠금 |
| 종합 프롬프트 허브 | **무료 유지** (유일한 대표 무료 기능) |
| 가격 | 신규 티어 없이 **기존 30코인 = 3,000원** 재사용 |
| 무료 맛보기 횟수 | 비로그인 1회 → 로그인 시 추가 1~3회 (서버 카운터) |
| **원래 횟수 제한이 있던 무료 기능** | **그대로 무료 유지** |

**"원래 제한 있던 무료" 실측** (`DailyLimit|dailyLimit|하루에 한 번|alreadyPlayed` 전수):

| 기능 | 기존 제한 | 판정 |
|---|---|---|
| 데스티니 포커 | ✅ 하루 1회 `checkPokerDailyLimit` (`destiny-poker.html:1925`) | 무료 유지 |
| 화투점 | ✅ 일일 제한 `checkDailyLimit` (`HwatuFortune.js:799`) | 무료 유지 |
| MBTI 동물궁합 · 힐링 타로 · 자존감 타로 · 드림타로 · 운명의 꽃 기본 | ❌ 없음 | 잠금 대상 |

> `js/entertain-engine.js`·`js/destiny-profile.js` 의 `dailyLimit` 은 RPG 퀘스트 EXP 한도라 무관(오탐).

### 하지 않는 것
가격 인상 · 기존 구매자 권한 회수 · 결제 로직 대규모 재작성 · URL 변경 · SEO 페이지 삭제 ·
라우트/기능 삭제 · 공포 마케팅 문구.

---

## 2. 신규 잠금 대상 (미구현)

전부 **30코인 = 3,000원**. unlock 키는 `RAW_PIG_COIN_UNLOCK_PRODUCTS`
(`worker/lib/paid-feature-registry.js:324`) 한 곳, per_use 키는 `RAW_FEATURE_KEY_PRICE_TABLE`(`:176`)
\+ `PER_USE_PAID_FEATURE_KEY_LIST`(`:392`) 두 곳에 넣는다. `PERSISTENT_UNLOCK_KEY_SET` 등재는 불필요.

### Tier A — 진입 게이트 5종 (셸 로직 변경 0)
타일에 `data-feature-key` + `data-coin-cost="30"` 만 붙이면 `index.html:33206`
`_cdRunPerUseCoinGate` 가 이미 전부 처리한다. 모달이 안 열리므로 본문이 애초에 계산되지 않는다.

| featureKey | 대상 | 유형 |
|---|---|---|
| `animal-mbti-compatibility` | MBTI 동물궁합 — 🔴 신설이 아니라 **표기/코드 불일치 수정**. `index.html:18316` 타일이 이미 "1회 3,000원" 배지를 달고 있는데 게이트가 없다 | per_use |
| `tarot-healing-reading` | 힐링 타로 | per_use |
| `tarot-self-esteem-reading` | 자존감 타로 | per_use |
| `dream-tarot-reading` | 드림타로 + 드림프롬프트 + 꿈 타로상담 (출력이 하나라 SKU 1개) | per_use |
| `flower-destiny-basic` | 운명의 꽃 기본 | per_use |

### Tier B — 섹션 게이트 8종 (렌더러 수술 필요)

| featureKey | 대상 | 유형 |
|---|---|---|
| `saju_five_elements_reading` | 오행 해설 | unlock |
| `saju_ten_gods_reading` | 십성 해설 (`renderTenshin`) | unlock |
| `saju_johu_ukbu_reading` | 조후+억부 (`renderJohu`+`renderUkbu`) | unlock |
| `ziwei_palace_reading` | 자미두수 궁 해석(기본) | unlock |
| `astro_chart_reading` | 점성술 차트 해석(기본) | unlock |
| `vedic_basic_reading` | 베다 기본 해석 | unlock |
| `sukuyo_natal_reading` | 본명숙 해설 | unlock |
| `physiognomy_basic_reading` | 관상 기본 해설 | **per_use** — 형제 키가 per_use 이고, unlock 이면 사진 1장 결제로 모든 사진이 무료가 된다 |

**신설 금지 — 재사용할 기존 키**: 꿈 프롬프트메이커는 `tarot-prompt-maker`를 참고했으나,
🔴 2026-08-21 "타로 오라클 상담" 전환으로 그 전제가 깨졌다 — 이제 실제 Gemini 호출이 붙은
회당결제(50코인, per-use)이고 더 이상 LLM 미사용 unlock 키가 아니다. 이 키를 그대로 재사용하면
꿈 프롬프트메이커가 타로 상담과 결제를 공유하게 되므로, 착수 전 재검토할 것. 정신분석 해몽
`dream-psycho-analysis` 는 이미 유료.

**구현 방식**: §0 에서 만든 `_cdGateBody()` / `_cdFillGateBodyIfPending()` 을 그대로 쓴다.
잠긴 섹션의 본문을 보류하고 해금 시 채우는 계약이 이미 서 있으므로 새 유틸을 만들지 말 것.
숙요는 예외 — `js/saju-engine-tarot-sukuyo-quantum.js:10303` 에 이미 같은 계약의
`unlocked ? build(...) : renderLockCard(...)` 가 있으므로 그 패턴을 복제한다(지연로드 순서 위험 회피).

**경계선 긋기가 이 작업 비용의 대부분**: `_astroCounselSection`(`js/saju-engine.js:31627`)의
`bodyHtml` 이 차트 도형(무료)과 해설(유료)을 섞어 담고 있어 분리해야 한다.

---

## 3. 무료 횟수 서버 카운터 (미구현)

🔴 **가디언 모듈을 재사용하지 말 것.** `GuardianFortuneGuestUsage.guestIdHash` 와
`GuardianFortuneAccountUsage.userId` 가 `unique: true` 라 키에 featureKey 차원이 없고
`max: 3`/`max: 1` 검증기가 스키마에 박혀 있다(`worker/lib/models.js:1459`, `:1480`).
일반화하려면 라이브 컬렉션 인덱스 교체 + 마이그레이션이 필요하다.

대신 얇은 신규 모듈 `worker/lib/free-quota.js`(~140줄) + 컬렉션 2개
(`FreeQuotaGuestUsage`/`FreeQuotaAccountUsage`, 복합 유니크 `{featureKey, guestIdHash|userId}`).
`models.js` 는 payment-freeze `notFrozen` 이고 "스키마 추가는 허용"으로 명시돼 있다.
새 정책은 게스트분을 계정에 합산하지 않으므로 **가디언 복잡도의 절반인 병합 트랜잭션이 불필요**하다.

게스트 식별자는 **기존 `guardian_fortune_guest_id` 쿠키를 재사용**한다 — 개명하면 기존 게스트
전원의 카운터가 리셋돼 무료 1회를 더 받는다.

🔴 `timestamps: true` × `$setOnInsert: {createdAt}` 충돌 금지 — 가디언에서 실제로 문서가 하나도
안 생기고 100% 조용히 실패한 사고가 있다. `verify:no-timestamp-conflict` 를 새 모듈에도 건다.
DB 장애 시 **fail-open**(무료 카운터는 결제 게이트가 아니다).

---

## 4. 무인증 과금 LLM 구멍 (미조치)

`POST /api/destiny-compass/narrate`(`worker/routes/destiny-compass.js:2`)는 인증·결제 없이
Gemini 를 부르고 `fallbackToWorkersAI: true`(`:195`)로 `env.AI.run` 까지 간다. 레이트리밋이
모듈 스코프 `Map`(`:13`)이라 Workers 아이솔레이트마다 따로 세므로 전역 방어가 아니다.

- 1단계(즉시, UX 변화 0): `Map` → `incrementRateLimit`(Mongo `abuse_scores`,
  `worker/lib/rate-limit.js:18`). IP 는 SHA-256 으로만 저장. 이 파일은 이미 `createLlmCacheStore`
  로 Mongo 를 쓰므로 새 의존이 아니다(헤더 주석의 "무DB" 는 낡았다).
- 2단계: `free-quota` 배선. 소진 시 **status 200 + `{ok:false, error:"FREE_QUOTA_EXCEEDED"}`** —
  클라(`app/destiny-compass/_components/CompassReport.tsx:144`)가 상태코드를 안 보므로 402/429 를
  내면 분기가 죽는다.
- **화면은 안 깨진다**: `app/destiny-compass/_stage/narration.ts:83` 의 결정론 템플릿이 먼저
  렌더되고 LLM 결과는 교체일 뿐이다.
- 🔴 30코인 판매는 하지 말 것 — 같은 화면 바로 아래가 10,000원 심층 리포트라 앵커를 깎는다.

---

## 5. GA4 퍼널 (미구현)

기존 14개 이벤트 이름은 **한 글자도 바꾸지 않는다**(개명하면 과거 데이터가 끊긴다).
부족한 단계만 추가하고 모든 결제 이벤트에 `funnel_step` 파라미터를 실어 Exploration 에서 그린다.

| 요청 단계 | 실현 |
|---|---|
| `landing_view` | `page_view` (기존) |
| `free_start` / `free_result_view` | 신규 (`free_saju_started`/`_completed` 병행 유지) |
| `paid_product_view` / `purchase_cta_click` | 신규 |
| `checkout_start` | `checkout_opened` (기존) |
| `pg_open` | `checkout_pg_opened` (기존, **React 배선만 추가**) |
| `purchase_success` | `purchase_complete` (기존) |
| 실패/취소 | 신규 `purchase_failed` / `purchase_cancelled` |

결손 메우는 지점:
- 유료 CTA 클릭 → `app/hooks/useCoinGate.ts:319` `ensurePaidAccess` 진입부 **1곳이 React 16개 파일
  전부를 커버** + 셸 `_cdOpenPaidServiceGate`
- React `pg_open` → `app/points/PointsClient.tsx` `requestPayment` 직전
- `/points` 이용권 매출이 **GA4 에 0원** — `handleSubscribe` 안에서 4개 발화
- 실패/취소 → `app/components/PaymentProcessingContext.tsx:766` (payment-freeze 미등재)
- 상품 노출 → `js/core/analytics.js` 에 IntersectionObserver + `[data-cd-product]` 마커
  (기존 `data-cd-cross-sell` 위임과 같은 패턴, 셸·React 양쪽 커버)

🔴 **매출 2배 집계 방지**: `value`/`currency`/`items`/`transaction_id` 는 GA4 표준 이벤트
(`view_item`/`begin_checkout`/`purchase`)에만 싣고 `purchase_complete` 파라미터는 그대로 둔다.
이걸 `verify-analytics-events.mjs` 단언으로 **기계 강제**할 것 — 사람 규율에 맡기면 다음 세션이
`value` 를 넣어 매출이 2배가 된다.

🔴 **1st-party 화이트리스트는 건드리지 말 것**: `worker/routes/billing.js:7168`
`CHECKOUT_FUNNEL_EVENT_NAMES` 에 이름을 추가하면 +1줄인데, `config/payment-freeze.json` 의
growthCeilings 여유가 **0줄**(7258/7258)이고 매니페스트 `why` 가 "고치는 것은 되고 키우는 것은
안 된다"이다. 신규 퍼널 이벤트는 **GA4 전용**으로 보낸다.

관리자 조회는 새 대시보드를 만들지 말고 `worker/routes/admin.js:4294`
`handleAdminPaymentDiagnostics` 에 `funnel` 블록 + `?funnelDays=` 만 추가한다(`admin.js` 는 상한 없음).

---

## 6. 홈 IA · SEO 동선 (미구현)

- 🔴 **히어로 1차 CTA 가 잘못 걸려 있다** — `index.html:12101` `moon-hero__cta--primary` 가
  `/codedestiny-novel.html`(sitemap 411건 중 0건, 색인 대상 아님)로 간다. i18n 키
  `home.hero2.primaryCta` 는 "무료 운세 시작하기" 쪽에 붙어 있어 키와 스타일이 어긋난다.
- 메인 핵심 CTA 3개로 정리: 무료 경험 → 3,000원 입문 → 초융합. 기능 64타일 아코디언 8개는
  **유지하되** 노출 우선순위만 낮춘다(삭제 금지).
- 무료 결과 하단 유료 CTA 신설: `/today` 결과(현재 CTA 0건) · 기본 차트 결과.
- SEO 랜딩 CTA 8개가 `/` 로 낙하 중(`/manse`·`/today`·`/saju/compatibility`·`/tarot/reunion`·
  `/tarot/mindscan`·`/astrology`·`/dream`·`/physiognomy`·`/love`). 유료 랜딩 5개는
  `noindexPathPrefixes` 에 걸려 **색인 자체가 안 되고** `/premium` ↔ `/premium-reports` 가 서로를
  가리키는 순환이다.
- **[Cleanup] 범위 내 죽은 코드**: 모바일 하단 nav 칩 스트립 9개(`index.html:15427`, CSS
  `display:none!important` + `hidden` 으로 완전 비활성) · `data-service-detail-href="/services/…"`
  중 존재하지 않는 7경로 · `lib/seo-landing-pages.js` 의 `pdfLifeBook`(렌더하는 페이지 없음) ·
  셸 `/points/` vs 정본 `/points` 슬래시 불일치.
- **[삭제 금지]** `lib/payment/portone.ts`(importer 0이지만 verify 가 파일로 읽어 단언) ·
  `grantPassFreeAccessBeforeCardIfAvailable`(죽은 함수지만 verify 가드 4곳이 부활을 막는 형태로 참조).

---

## 7. 착수 전 판단이 필요한 것

**스탠다드 이용권(9,900원)의 월 예산 300코인 = 30코인 기능 10건.** 잠금 대상이 13종이 되면
스탠다드 보유자가 한 사이클에 전부 열 수 없다(`worker/lib/profile-limits.js:96`).
①30코인 유지 ②이용권 월 예산 상향 ③일부 기능을 이용권 커버 밖으로 중 하나를 정해야 한다.
Tier A 머지 후 실사용 데이터를 보고 결정할 것.

---

## 8. 검증

```bash
npm run lint && npm run typecheck
npm run verify:saju-unlock-entitlement-regression   # 누수 봉인 계약
npm run verify:paid-gate-ui
npm run verify:payment-choice-parity
npm run verify:checkout-pass-card
npm run verify:paid-feature-billing-policy
npm run verify:paid-gate-price-coverage
npm run verify:public-parity && npm run sync:public   # 셸 변경 시 필수
npm run verify:entry-encoding -- --strict-core
npm run verify:payment-freeze                        # 필요 시 --update 를 같은 커밋에
npm run build && node scripts/verify-adsense-readiness.mjs   # 정적 카피를 고칠 때만
```

🔴 **과금 LLM 실호출 금지.** `--live` 계열은 돌리지 않고 "미검증"으로 남긴다. 결제 검증은
`verify:checkout-pass-card`(jsdom 실클릭)로 대체하고 실결제는 하지 않는다.
