# 결제 정책 — 콘텐츠 접근 유형 (2026-07-04)

> [1부. 개요](payment-policy-overview.md) · **2부. 콘텐츠 접근 유형 (이 문서)** · [3부. 결제 플로우 & 변경 이력](payment-policy-flow.md)

세 가지 접근 유형은 코드·문서·UI 어디에서도 혼용하지 말 것.

## A. 잠금 콘텐츠 (Lock / Unlock)

- **정의**: 기본적으로 숨겨져 있다가 조건 충족 시 해제되는 콘텐츠. 1회 결제 후 `ContentEntitlement` DB에 영구 저장되어 이후 재결제 없이 반복 이용 가능
- **해제 방법**: 이용권 보유 시 무료 해제 (가격 상한 이내) 또는 단건 PG 결제
- **식별 마커**: `worker/lib/paid-feature-registry.js`의 `RAW_PIG_COIN_UNLOCK_PRODUCTS`(`unlock.` 접두; `forceDeduct`는 신규 정책 결정값으로 사용하지 않음), `worker/routes/fortune.js`의 `PERSISTENT_UNLOCK_KEY_SET` 등록, 결제 후 `upsertPaidContentUnlock()`(`worker/lib/content-unlocks.js`) 호출
- **현재 예시**:
  - 사주 분석 화면: 대운(`section_daewun`), 총평/1년 운(`section_summary`), 궁합 미리보기(`section_compat`)
    - **대운 가격 개정(2026-09-30)**: 신규 해금은 단건 5,000원·월정석 500이며, 이용권 월 이용 한도도 5,000원 상당을 소비한다. 기존 구매권과 구매 당시 금액은 유지하고 재열람에 추가 결제를 요구하지 않는다. 이용권 판매가격·기간·한도, 종합 풀이와 다른 상품 가격은 변경하지 않는다.
    - **무료 진입 후크 예외(2026-07-16)**: "지금 내 시기 · 올해의 나" 카드(`#currentSeasonCard`, 클라 `renderCurrentSeasonSummary`)는 **현재 소속 대운 1칸 + 올해 세운 요약만** 무료(C유형)로 노출한다. 게이트(`cd-section-gate`) 없이 렌더되며 서버 entitlement와 무관. **전체 10년 대운표·연도별 세운 상세·종합 풀이는 계속 `section_daewun`/`section_summary`로 유료 잠금**이며, 무료 카드는 이 잠긴 콘텐츠를 렌더하지 않는다(범위 초과 시 정책 위반).
  - 자미두수 심화: `ziwei_decade_luck`(대한 흐름), `ziwei_love_deep`(부부궁 심화), `ziwei_twelve_palaces`(12궁 정밀), `ziwei_symbolic_layer`, `ziwei_life_yearly_flow`
  - 숙요점 1년운 전체 해석: `sukyo_yearly_fortune_unlock`
  - **서양 점성술 앞으로 12개월 흐름(`astro_yearly_transit`, 30코인=3,000원, 2026-10-04)** — 출생 차트와 실제 천체력으로 결정론 산출(LLM 미사용, `js/core/astro/transits.js`·`transit-reading.js`). 큰 사건의 날짜·달마다 볼 날·분야별 좋은 때/조심할 때를 잠그고, 무료 머리에는 "가장 큰 변화가 오는 달"만 보인다. **해금 단위는 키 하나 영구** — 연 결제가 아니라 볼 때마다 오늘부터 12개월이 다시 계산되는 롤링 창을 계정에 영구로 연다(서버 결제 라우트 무변경). 회당 결제 목록에서 2026-10-04 A유형으로 옮겼다. 계정 스코프(`PROFILE_UNLOCK_CONTENT_BY_FEATURE_KEY` 미등록)
  - 숙요 인연 도감(`sukuyo-relationship-encyclopedia`, 50코인=5,000원), **극T 관계 회로 확장(`sukuyo-extreme-t-relationship`, 50코인=5,000원)** — 둘 다 내 명식에서 결정론으로 산출되는 고정 콘텐츠(LLM 미사용)라 재열람이 전제다. 극T는 2026-08-01까지 회당 결제로 잘못 등록돼 있었고(클라는 영구 해금으로 동작 → 서버가 `unlockedFeatures`를 안 남겨 **새로고침하면 결제한 잠금이 다시 닫혔다**), A유형으로 옮겨 정정했다. 계정 스코프(`PROFILE_UNLOCK_CONTENT_BY_FEATURE_KEY` 미등록)
  - **본성 심화 해석(`sukuyo-nature-deep-dive`, 50코인=5,000원, 2026-08-12)** — 기본 숙요점 화면의 "본성 심화 해석"(6탭: 천성의 빛/달의 이면/인연의 궤도/수호의 문장/일상 적용/기운·성장)과 달빛 성향 카드·관계 해석·연애 성향 프로필·돈 습관 및 일 성향·나의 감정 리듬 카드를 하나로 묶은 번들. 내 명식에서 결정론으로 산출되는 고정 콘텐츠(LLM 미사용)라 재열람이 전제다. **클릭 리빌**(결제 전 실제 해석 문구는 DOM에 렌더하지 않고 잠금 미리보기+CTA만 노출, 결제 완료 시 그 자리에 콘텐츠를 그려 넣음) + `syMarkPaidSukuyoFeatureUnlocked` 영구 해금. 계정 스코프(`PROFILE_UNLOCK_CONTENT_BY_FEATURE_KEY` 미등록)
  - **운명의 섬 12궁 전체 심층 리포트: `ziwei-island-deep-report`(50코인=5,000원)** — 명반에서 결정론으로 산출되는 고정 콘텐츠(LLM 미사용, `worker/lib/island/island-report.js`)라 재열람이 전제다. **계정 스코프 영구 해금**(`PROFILE_UNLOCK_CONTENT_BY_FEATURE_KEY`에 등록하지 않아 `User.unlockedFeatures`로 관리). 배달은 `worker/routes/ziwei-island-report.js`, 화면은 `/island-consult`. ⚠️ 같은 화면의 `ziwei-island-palace-consult`(20,000원)와 **별개 상품**이다 — 그쪽은 고른 궁 하나를 LLM이 매번 새로 쓰는 B유형.
- **UI**: 잠금 아이콘 + 해제 유도 CTA (`PremiumBlurGate.tsx`)

## B. 이용할 때마다 구매 (Per-Use Payment / 회당 결제)

- **정의**: 사용할 때마다 매번 단건 결제(코인/원화)하는 것이 기본이나, **이용권이 있고 그 가격이 등급의 적용 가격 범위 안이면 이용권으로 결제 없이 처리**한다(2026-07-04 재확정, 2026-08-24 범위 상향). 판정 규칙은 둘뿐이다 — ①등급별 적용 가격 범위(스탠다드 5,000원·프리미엄 10,000원·VVIP 20,000원 이하, family 상한 없음) ②등급별 월 이용 한도(3만·10만·20만·50만원, `MONTHLY_PASS_LIMITS`). 둘 중 하나라도 걸리면 단건 결제로 진행한다. 결과를 저장하지 않으므로 매 사용마다 이 판정을 다시 거친다. 월 한도 차감은 **정상 판매가** 기준이다(할인가·PG 실결제액 아님).
- **식별 마커**: `PER_USE_PAID_FEATURE_KEY_LIST`/`RAW_FEATURE_KEY_PRICE_TABLE`에 등록(`unlock.` 접두 없음, `forceDeduct` 플래그 없음), `PERSISTENT_UNLOCK_KEY_SET` 미포함. 결제/이용권/월정석 판정과 차감은 `worker/lib/payment-service.js` 경계와 `worker/routes/billing.js` 어댑터에서 수행하고, 각 `worker/routes/*-ai.js`는 검증된 access grant만 소비한다.
- **현재 예시**:
  - 궁합 분석 전체: `compat-saju-compatibility`, `compat-ziwei-compatibility`, `compat-sukuyo-compatibility`, `vedic-compatibility-per-use`, `compat-astro-synastry` 등
  - 관상 심화: **오관·점 정밀 분석(`physiognomy-ogwan-mole-deep`, 50코인=5,000원)** — 기본 관상 리포트는 무료로 노출하되, 오관(五官) 5부위 정밀 확률·경합 분석과 피부·점(痣) 해석 섹션만 **블러+잠금 CTA**로 가려 회당 결제 시 열람. 관상 궁합(`physiognomy-compatibility`)·전생 관상 궁합(`physiognomy-pastlife-compatibility`, 각 50코인=5,000원)도 회당 결제. ⚠️ **오관·점 프리미엄과 전생 관상(궁합)은 가격이 같아도 `featureKey`가 다른 완전히 별개의 상품** — 하나의 결제로 묶이지 않음
  - 타로 전체: `tarot-year-fortune`, `tarot-love-relationship`, `tarot-reunion-reading` 등 `tarot-*`
  - AI 상담 전반: 인생의 책, 연애 비책, 신년운세, 운명 찻집, 팩폭 전략실(`life-book-ai`, `love-secret-ai`, `new-year-ai`, `fortune-tea-house`, `neo-operation-room` 등), 숙요점 궁합 AI 상담(`sukuyo-compatibility-ai`) — 위 이용권 커버 규칙 동일 적용
  - **연이 운명 상담(`fortune-chat-consultation`, 30코인=3,000원)** — `/fortune-chat`. 하루 무료 3회를 소진한 뒤부터 회당 결제. 매 턴이 새로 생성되는 개인화 상담이라 B유형이다
  - **초융합 심층 리딩(`fusion-fortune-consultation`, 500코인=50,000원)** — `/fusion-fortune`. 여섯 체계를 한 번에 엮어 20,000자 이상을 새로 쓴다. 🔴 `direct_or_family` 상품이라 **Family 이용권 또는 단건 결제만 허용**하며 Standard/Premium/VVIP와 월정석은 제외한다. Family도 30일 누적 한도 500,000원 안에서만 커버된다. 선착순 하루 100자리는 결제와 별개 장치이며, **마감 검사가 결제보다 먼저** 돌아야 한다(결제 후 마감은 자동 환불 경로가 없다)
  - ⚠️ 위 두 기능은 2026-08-08까지 전용 재화(대화권 / 초융합 상담권)로 굴러갔다. 그 재화는 폐지됐으니 되살리지 말 것 — 판매 라우트·잔액 컬렉션·전용 상점을 모두 제거했고 컬렉션 드롭 마이그레이션(`scripts/migrations/20260808-drop-legacy-consultation-currencies.mjs`)까지 준비돼 있다
  - 숙요점 기본 궁합(`compat-sukuyo-compatibility`, 50코인=5,000원, 2026-08-12 100코인=10,000원에서 인하): **콘텐츠는 잠금 UI 없이 노출**되지만 궁합 계산 실행 시마다 회당 결제(위 이용권 커버 규칙 적용). "비잠금"이 "무료"를 뜻하지 않음에 주의
  - **숙요 인연 레이더(`sukuyo-past-life-reading`, 100코인=10,000원)** — 상대의 생년월일을 넣을 때마다 새로 산출되는 관계 리포트라 **상대 1명당 1결제**다. 같은 상대·같은 관계목적은 서버 아카이브(`readSukuyoPastLifeArchive`)가 영수증 역할을 해 재결제 없이 다시 열린다. ⚠️ 이 키를 `PREMIUM_UNLOCK_POLICY`(영구 해금 후보)나 클라 `syMarkPaidSukuyoFeatureUnlocked` 에 되살리지 말 것 — 그러면 1회 결제로 모든 상대가 무료가 된다(2026-08-01 정정). 구 `sukuyo-symbolic-comparison`(인연 레이더 5,000원)은 이 기능에 통합돼 UI 미사용, 과거 결제 이력 보존용으로 레지스트리에만 남는다
  - **휴먼 디자인 프리미엄 리포트(`human-design-report`, 100코인=10,000원, 2026-09)** — 무료 바디그래프 위에서 여는 25,000자 개인 분석 + PDF. 18유닛을 여러 요청에 걸쳐 생성하며(엣지 데드라인 100초라 한 요청에 못 담는다) 클라이언트가 반복 호출한다. 같은 출생 데이터·같은 로케일·같은 계약이면 `humanDesignReports` 의 `reportKey` 문서가 영수증 역할을 해 **재결제 없이** 다시 열리고 Gemini 도 다시 부르지 않는다.
    - 🔴 **회당 결제다.** LLM 생성물이고 출생 데이터마다 별개 상품이라 `unlock` 으로 옮기면 1회 결제로 모든 프로필의 리포트가 열린다(`sukuyo-past-life-reading` 과 같은 이유).
    - 🔴 **200코인을 넘기지 말 것** — `PASS_LIMITS.vvip = 200`(2026-08-24 100 → 200) 이라 넘는 순간 VVIP 이용권 커버를 잃고 family 등급만 남는다. 현재 100코인이라 여유가 있다.
    - 결제와 생성을 한 트랜잭션으로 묶지 않는다. `/start` 가 결제를 확인하고 환불 가능 상태를 열며, 생성 실패는 `ServiceExecutionTransaction` 으로 되돌린다. 다만 **전달 하한**(18유닛 중 14개 이상 + 20,000자 이상 + 렌더 가능)을 넘으면 일부 섹션이 degraded 여도 결제를 유지하고 전달한다(경량 보장 계약).
    - `/generate` 는 결제를 재검증하지 않는다 — 문서 자체가 증빙이다. 재검증을 넣으면 생성 중간에 결제한 사용자가 막힌다.
- **UI**: 이용권으로 커버되면 무료 처리 안내(결제창 미노출), 그렇지 않으면 결제창에 **단건결제(KRW)/월정석 2옵션**을 동등 제시(월정석은 잔액이 비용 이상일 때만 활성) — [3부 결제창 노출 규칙(공통)](payment-policy-flow.md#결제창-노출-규칙-공통) 참고

## C. 비잠금·무료 (Free Access)

- **정의**: 유료 기능 레지스트리(`paid-feature-registry.js`)에 전혀 등록되지 않은 기본 기능. 별도 결제 없이 즉시 이용 가능
- **예시**: 기본 사주팔자/자미두수/숙요점 조회 화면 자체(그 안의 대운/총평/심화 콘텐츠 등 일부 섹션만 A유형으로 잠김). ※ 숙요점 "기본 궁합 계산"은 여기(무료)가 아니라 B유형(회당결제)임 — 화면 노출은 자유롭지만 실행 시 과금
- **휴먼 디자인 바디그래프(`/human-design`, 2026-09 무료화)** — 출생 데이터로 계산하는 26 활성·64 게이트·36 채널·9 센터 차트와 타입/전략/권위/프로파일이 전부 무료다. **로그인은 필요**하다(아카이브 키가 userId 이고 재열람·리포트 연결에 계정이 필요하다). 무과금 Swiss Ephemeris 계산을 지키려고 라우트에 사용자당 레이트리밋(10분 20회)이 있다.
  - 🔴 옛 결제 키 `human-design-chart`(100코인=10,000원)는 **레지스트리에 남아 있지만 판매하지 않는다.** 과거 주문·환불·리뷰 자격 조회가 그 항목을 읽기 때문이며, 같은 계약의 선례가 `palm-reading-ai-consult` 다. 지우지 말 것.
  - 🔴 같은 결제로 열리던 AI 해석(`/api/human-design/interpretation`)은 **같은 배포에서 생성을 은퇴**시켰다. 그 라우트의 유일한 관문이 "계산 문서가 존재한다" 였는데 차트가 무료가 되면 누구나 그 문서를 만들 수 있어 관문이 사라지기 때문이다. 이미 결제해 저장된 해석은 계속 읽히고(200), 없으면 410 `INTERPRETATION_RETIRED` 를 준다.
  - 유료 심화는 **프리미엄 리포트**(`human-design-report`)가 맡는다 — 위 B유형 항목 참고.
- **UI**: 잠금 UI 없이 바로 노출

## D. 프로필 카드 추가/수정/삭제 — 무료 · 개수 상한 없음 (2026-10-11 개정)

- **정책**: 프로필 카드(운세 대상 인물)의 추가·수정·삭제는 **모두 무료이고 개수 상한이 없다**. 이용권 등급(none/standard/premium/vvip/family)과 무관하며 결제 게이트를 띄우지 않는다.
- **서버 판정**: `worker/lib/profile-card-mutation-policy.js`의 `getProfileCardMutationPolicy`·`resolveProfileCardActionAccess`·`canAddProfile`이 항상 무료 허용(`PROFILE_CARD_MUTATION_FREE`)을 돌려준다. `worker/routes/profile.js`(`POST/PATCH/DELETE /api/profile`)와 레거시 일괄 동기화(`worker/routes/user.js`의 `/api/user/destiny-profiles`)는 402를 내지 않는다. 서버는 birth/ownership/duplicate 검증만 한다.
- **클라이언트 기준값**: `profilePolicySnapshot.maxProfileCount`·`resolveProfileLimitForClient()`는 0(=무제한)을 보낸다. `HONEY_PASS_POLICY`·`PROFILE_LIMIT_BY_TIER`의 `maxProfiles` 숫자는 하위호환 데이터로만 남아 있고 판정에 쓰이지 않는다. `User.profileSubscription.profileLimit`도 같다.
- **이용권 문구**: 이용권 카드·상품 설명에 "프로필 최대 N개"를 표기하지 않는다(`scripts/verify-pass-tier-policy.mjs` ⑤가 설명 문구를 '기간 · 가격대 · 월 한도' 3토막으로 고정).
- **결제 결과와의 관계**: 카드 수정이 무료가 되었어도 남의 출생정보로 고쳐 유료 결과를 공짜로 볼 수는 없다. 잠금 해제는 **계정 + 출생정보(birthKey)** 단위(`hasPaidUnlockForProfile`)라, 카드의 출생정보를 바꾸면 그 카드에서 다시 잠기고 되돌리면 다시 열린다(`__tests__/worker/birth-scope-unlock-policy.test.js` D). 카드를 삭제해도 그 카드로 결제한 보관함 기록은 계정 단위라 계속 열린다.
- **과거 결제**: 2026-10-10까지 카드 관리 수수료(1,000원/월정석 100, 그 전 5,000원)를 받았다. 이미 낸 수수료의 소급 처리 여부는 이 변경의 범위가 아니며 운영 결정이 필요하다. 가격 상수(`PROFILE_CARD_DELETE_COST_KRW`, `LEGACY_PROFILE_CARD_COSTS`)와 `profile-card-manage` 레지스트리 항목은 과거 주문·환불 조회용으로 남아 있다. 신규 결제에 쓰지 말 것.
- **결제 계층**: 레거시 Express(`server/routes/profile.routes.js`)의 프로필 추가/삭제 라우트는 계속 410 `USE_WORKER_PROFILE_ENDPOINT`로 차단된다. 관리 UI 정본은 정적 셸(`js/destiny-profile.js`, `public/js/`에 사본) 하나다.
- 회귀 가드: `scripts/verify-profile-card-action-policy.mjs`, `scripts/verify-profile-card-add-entry.mjs`, `scripts/verify-portone-single-payment-regression.mjs`(카드 관리 결제 게이트 0건), `__tests__/worker/profile.create-first-card.test.js`, `__tests__/worker/user.destiny-profiles-sync-free.test.js`.

## E. 음악 트랙 — 재생 무료 · 다운로드 유료 (UX 게이트) — 2026-07 개정

- **정책**: 달빛 음악실(`/music`)의 **전곡 재생은 무료**(free_full, 직접 CDN 스트리밍)로 열되, **MP3 다운로드는 곡당 1,000원(10코인) UNLOCK 구매**를 요구한다(2026-07-31 300원→1,000원 인상 — KG이니시스 일반 카드결제가 1,000원 미만을 거부해 PG창이 뜨기 전에 실패했다. 이 하한은 `verify:billing-pass-policy`가 강제한다). 이용권/월정구독 커버는 재생권일 뿐 다운로드를 열지 않는다(실제 구매=단건결제·월정석만). 원본 MP3가 공개 R2 버킷(`music.code-destiny.com`)에 있어 다운로드 게이트는 하드 DRM이 아닌 **결제 UX 게이트**다(고급 사용자는 공개 URL 우회 가능 — 종전과 동일).
- **재생 지연 수정(핵심)**: 과거 `free_full`이어도 `MusicPlayerExample.tsx`의 `buildPlaybackTrack`이 재생 URL을 워커 프록시(`/api/music/audio`)로 재작성해 `클라→워커→R2→워커` 왕복이 배가됐다. `buildPlaybackTrack`이 `free_full` 트랙을 **매니페스트 CDN 직결 URL 그대로 반환**하도록 고쳐(조기 반환) 프록시 홉을 제거했다.
- **정본 레버**: `lib/music-access-policy.js`의 `MUSIC_DOWNLOAD_REQUIRES_PURCHASE`(단일 스위치). `true`면 `getMusicTrackAccessPolicy`가 `free_full` 트랙에도 다운로드 구매 필드(`downloadRequiresPurchase`/`purchaseFeatureKey`/`priceKRW`/`coinCost`)를 노출한다. `false`로 두면 재생·다운로드 모두 무료(2026-07-25 전곡 무료 정책)로 복귀 — 되돌리기 1줄.
  - **재생**: `audioUrl = buildMusicPublicUrl(...)` **직접 CDN URL**(hasFreeFullAccess=true), 미리듣기 컷 없음.
  - **다운로드**: `worker/routes/music.js`의 `resolveTrackPlan`이 다운로드 게이트 트랙을 `freeFullPlayback` 플랜으로 판정 경로에 태워, `buildLockedTrackEntry`에서 **재생(hasFullAccess=항상 true)과 다운로드(canDownload=실제 구매만)를 분리**한다. 미구매 다운로드는 `/api/music/download`에서 402(`DOWNLOAD_PURCHASE_REQUIRED`).
  - **프론트 게이트**: `canDownloadTrack`이 `downloadRequiresPurchase` 트랙은 서버 확인 `canDownload`에만 허용. `refreshMusicAccess`가 잠금곡 + 다운로드 게이트 트랙을 배치 조회(로그인 사용자, Mongo 왕복 2회)해 곡별 다운로드 권한을 복원한다. 구매는 기존 `handlePurchaseCurrentTrack`(다운로드 전용 = `direct`+`monthly`, 이용권 선검사 스킵) 재사용.
- **과거 구매/이용권**: 구매한 곡은 `canDownload`로 다운로드 유지, 이용권은 재생만 커버. 환불·마이그레이션 불필요.
- **회귀 가드**: `__tests__/worker/music.pass-access-policy.test.js`(재생 무료 / 미구매·이용권=다운로드 잠금·402 / 구매=다운로드 통과 / 다운로드 게이트 트랙은 배치 호출).

## Legacy COIN 차감 호환성

- 레거시 COIN 이름과 과거 원장 데이터는 읽기 호환을 위해 보존하지만, 신규 `User.points` 차감·신규 COIN 해금·COIN 자동 갱신은 금지한다.
- 과거 `PointHistory`·`Payment` 증거는 entitlement backfill과 환불/보상 복구에서만 사용한다. 증거가 없는 구형 소비 요청은 `PAYMENT_REQUIRED`로 결제 선택창을 안내한다.
- 모든 클라이언트 표면(React, 루트 정적 셸, 독립 정적 HTML)은 중립 공통 게이트를 사용한다. 결제 게이트가 로드되지 않은 정적 페이지는 직접 레거시 API를 호출하지 않고 안전한 재시도 안내를 표시한다.
- 최종 접근 권한은 서버 entitlement와 결제 검증이 결정하며, 로컬 unlock map은 화면 표시 최적화에만 사용한다.

## 신규 기능 추가 시 체크리스트

1. 결과가 저장되어 재열람 가능한 고정 콘텐츠인가? → **A. 잠금 콘텐츠**
2. 매번 새로 생성되는 개인화 리딩/AI 상담인가? → **B. 회당 결제**
3. 유료 레지스트리에 등록하지 않아도 되는 기본 기능인가? → **C. 무료**
4. 프로필 카드 추가·수정·삭제인가? → **D. 프로필 카드 (무료 · 상한 없음)**
5. 음악실(`/music`) 트랙인가? → **E. 음악 트랙 (재생 무료 · 다운로드 유료 UNLOCK)**
6. 가격 표시는 항상 원화(추후 현지 통화)로 — [1부 코인 표시 규칙](payment-policy-overview.md#2-코인레거시-내부-단위-표시-규칙) 참고

## 2026-10-03 승인 — 10월 5일 가격 전환과 함께 적용할 월정석 할인

정식 가격 전환 시 영냥이 상담의 월정석 환산 배수를 5에서 1로 복원한다. 월정석 1개=10원이며, 가입 보상 500개와 지급분별 30일 유효기간은 유지한다. 사용자가 선택한 정수 수량을 웹 원화 단건 상담에서 할인하고 나머지를 결제한다. 예: 고등어 9,900원 − 500개(5,000원) = 4,900원. PG 잔여 결제액은 기존 최소 승인금액 1,000원 이상으로 제한하며 전액 월정석 결제는 기존 수단을 사용한다. Family·횟수권 권리와 기존 가격 스냅샷은 유지하고, 횟수권 구매·앱 결제·해외 통화 결제에는 혼합 할인을 적용하지 않는다.

서버 정본으로 할인액을 계산한다. 주문 생성·월정석 차감·원장을 같은 트랜잭션으로 예약하고 PG 검증 후에만 상담을 연다. 불확실한 결제는 같은 주문으로 확인하며 수량 변경이나 월정석 재사용을 허용하지 않는다. PG가 실패 또는 전액 취소를 확정한 경우에만 기존 복원 방식으로 한 번 복원한다. 브라우저 종료·조회 오류·부분 환불은 복원 근거가 아니다. 가격 전환 전에는 신규 할인과 복원된 환산값을 활성화하지 않는다. 개발 검증은 mock이며 운영 승격은 별도 승인이다.