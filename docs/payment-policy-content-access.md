# 결제 정책 — 콘텐츠 접근 유형 (2026-07-04)

> [1부. 개요](payment-policy-overview.md) · **2부. 콘텐츠 접근 유형 (이 문서)** · [3부. 결제 플로우 & 변경 이력](payment-policy-flow.md)

세 가지 접근 유형은 코드·문서·UI 어디에서도 혼용하지 말 것.

## A. 잠금 콘텐츠 (Lock / Unlock)

- **정의**: 기본적으로 숨겨져 있다가 조건 충족 시 해제되는 콘텐츠. 1회 결제 후 `ContentEntitlement` DB에 영구 저장되어 이후 재결제 없이 반복 이용 가능
- **해제 방법**: 이용권 보유 시 무료 해제 (가격 상한 이내) 또는 단건 PG 결제
- **식별 마커**: `worker/lib/paid-feature-registry.js`의 `RAW_PIG_COIN_UNLOCK_PRODUCTS`(`unlock.` 접두 + `forceDeduct: true`), `worker/routes/fortune.js`의 `PERSISTENT_UNLOCK_KEY_SET` 등록, 결제 후 `upsertPaidContentUnlock()`(`worker/lib/content-unlocks.js`) 호출
- **현재 예시**:
  - 사주 분석 화면: 대운(`section_daewun`), 총평/1년 운(`section_summary`), 궁합 미리보기(`section_compat`)
    - **무료 진입 후크 예외(2026-07-16)**: "지금 내 시기 · 올해의 나" 카드(`#currentSeasonCard`, 클라 `renderCurrentSeasonSummary`)는 **현재 소속 대운 1칸 + 올해 세운 요약만** 무료(C유형)로 노출한다. 게이트(`cd-section-gate`) 없이 렌더되며 서버 entitlement와 무관. **전체 10년 대운표·연도별 세운 상세·종합 풀이는 계속 `section_daewun`/`section_summary`로 유료 잠금**이며, 무료 카드는 이 잠긴 콘텐츠를 렌더하지 않는다(범위 초과 시 정책 위반).
  - 자미두수 심화: `ziwei_decade_luck`(대한 흐름), `ziwei_love_deep`(부부궁 심화), `ziwei_twelve_palaces`(12궁 정밀), `ziwei_symbolic_layer`, `ziwei_life_yearly_flow`
  - 숙요점 1년운 전체 해석: `sukyo_yearly_fortune_unlock`
- **UI**: 잠금 아이콘 + 해제 유도 CTA (`PremiumBlurGate.tsx`)

## B. 이용할 때마다 구매 (Per-Use Payment / 회당 결제)

- **정의**: 사용할 때마다 매번 단건 결제(코인/원화)하는 것이 기본이나, **이용권(구독 패스)이 있고 그 가격이 이용권의 커버 한도 이내이면 이용권으로 무료 처리**한다(2026-07-04 재확정). 즉 이용권 보유·티어(standard/premium/vvip/family)에 따라 무료 커버 여부가 달라진다 — family는 무제한 커버. 이용권이 없거나 가격이 한도를 초과하면 단건 결제로 진행. 결과를 저장하지 않으므로 매 사용마다 이 판정을 다시 거친다.
- **식별 마커**: `PER_USE_PAID_FEATURE_KEY_LIST`/`RAW_FEATURE_KEY_PRICE_TABLE`에 등록(`unlock.` 접두 없음, `forceDeduct` 플래그 없음), `PERSISTENT_UNLOCK_KEY_SET` 미포함. 이용권 커버 판정은 `worker/lib/profile-limits.js`의 `canUseByPass()`/`normalizeHoneyPassEntitlement()`를 각 라우트(`worker/routes/*-ai.js`)와 `worker/lib/paid-feature-access.js`의 `canAccessPaidFeature()`가 호출하여 수행
- **현재 예시**:
  - 궁합 분석 전체: `compat-saju-compatibility`, `compat-ziwei-compatibility`, `compat-sukuyo-compatibility`, `vedic-compatibility-per-use`, `compat-astro-synastry` 등
  - 관상 심화: **오관·점 정밀 분석(`physiognomy-ogwan-mole-deep`, 50코인=5,000원)** — 기본 관상 리포트는 무료로 노출하되, 오관(五官) 5부위 정밀 확률·경합 분석과 피부·점(痣) 해석 섹션만 **블러+잠금 CTA**로 가려 회당 결제 시 열람. 관상 궁합(`physiognomy-compatibility`)·전생 관상 궁합(`physiognomy-pastlife-compatibility`, 각 50코인=5,000원)도 회당 결제. ⚠️ **오관·점 프리미엄과 전생 관상(궁합)은 가격이 같아도 `featureKey`가 다른 완전히 별개의 상품** — 하나의 결제로 묶이지 않음
  - 타로 전체: `tarot-year-fortune`, `tarot-love-relationship`, `tarot-reunion-reading` 등 `tarot-*`
  - AI 상담 전반: 인생의 책, 연애 비책, 신년운세, 운명 찻집, 팩폭 전략실(`life-book-ai`, `love-secret-ai`, `new-year-ai`, `fortune-tea-house`, `neo-operation-room` 등), 숙요점 궁합 AI 상담(`sukuyo-compatibility-ai`) — 위 이용권 커버 규칙 동일 적용
  - 숙요점 기본 궁합(`compat-sukuyo-compatibility`, 100코인=10,000원): **콘텐츠는 잠금 UI 없이 노출**되지만 궁합 계산 실행 시마다 회당 결제(위 이용권 커버 규칙 적용). "비잠금"이 "무료"를 뜻하지 않음에 주의
- **UI**: 이용권으로 커버되면 무료 처리 안내(결제창 미노출), 그렇지 않으면 결제창에 **단건결제(KRW)/월정석 2옵션**을 동등 제시(월정석은 잔액이 비용 이상일 때만 활성) — [3부 결제창 노출 규칙(공통)](payment-policy-flow.md#결제창-노출-규칙-공통) 참고

## C. 비잠금·무료 (Free Access)

- **정의**: 유료 기능 레지스트리(`paid-feature-registry.js`)에 전혀 등록되지 않은 기본 기능. 별도 결제 없이 즉시 이용 가능
- **예시**: 기본 사주팔자/자미두수/숙요점 조회 화면 자체(그 안의 대운/총평/심화 콘텐츠 등 일부 섹션만 A유형으로 잠김). ※ 숙요점 "기본 궁합 계산"은 여기(무료)가 아니라 B유형(회당결제)임 — 화면 노출은 자유롭지만 실행 시 과금
- **UI**: 잠금 UI 없이 바로 노출

## D. 프로필 카드 추가/삭제 (고정 관리 수수료)

- **정의**: 운세 대상 인물(프로필 카드)의 추가·삭제에 부과되는 **건당 고정 수수료**. 잠금 콘텐츠(A)도 회당 결제(B)도 아닌 별도 유형이다.
- **금액**: **건당 5,000원 단건결제** 또는 **월정석 500**(코인 50 상당). 서버 상수 `PROFILE_CARD_DELETE_COST_KRW = 5000`(`worker/lib/profile-card-mutation-policy.js`). 클라이언트가 보낸 금액은 신뢰하지 않고 서버 상수와 일치 검증(`worker/routes/payments.js`의 `CLIENT_AMOUNT_MISMATCH`).
- **첫 프로필 무료**: 계정당 최초 1개는 무료 생성(`FREE_INITIAL_PROFILE_CARD_COUNT = 1`).
- **개수 상한은 하드 상한 아님**: 이용권 등급별 개수(standard 3 / premium 7 / vvip 15)는 기준값일 뿐, **초과해도 건당 5,000원 결제로 무제한 추가 가능**. 상한을 이유로 생성을 막지 않는다(`resolveProfileCardActionAccess`가 초과 시에도 `requiresPayment: true` 반환).
- **삭제**: 건당 5,000원(또는 월정석). **보유 개수 하한 없음 — 프로필이 1개여도 삭제 가능**(결제는 필수). 삭제 후 최초 무료 슬롯이 다시 열린다.
- **family 이용권만 무료**: family 등급은 추가·삭제 모두 무료·무제한(`isFamilyOrAbove`). 그 외 등급은 이용권 보유와 무관하게 결제 필요. **이 무료는 "이용권으로 결제"가 아니라 가격 자체가 0원인 정책 바이패스**이며, 판정은 결제 게이트(`billing.js`/coin-gate)가 아니라 **정책 계층(`worker/lib/profile-card-mutation-policy.js` → `worker/routes/profile.js`)에서만** 이뤄진다. coin-gate는 `profile.js`가 402(결제 필요)를 준 뒤에만 열리므로 무료 카드는 이용권 경로에 아예 도달하지 않는다.
- **⚠️ 이용권(pass)으로는 결제 불가 (family 포함 전 등급)**: 프로필 추가/삭제는 **오직 단건결제(`single_purchase`) 또는 월정석(`membership_credit`)** 으로만 정산된다. 이용권 잔여/커버 한도로 대체 결제되지 않으며(`evidenceCostMatches`가 두 방식만 인정), 프론트에도 이용권 결제 옵션을 노출하지 않는다(`ProfileActionPaymentMethod = "card" | "monthly_stones"`).
- **🔒 서버 강제 정본**: 이용권 제외 판정의 서버 정본은 `worker/routes/billing.js`의 `PASS_EXCLUDED_FEATURE_KEYS`(→ `isPassExcludedPricing`) **하나**다. `buildPassPaymentDecision`·`processCoinGateFromPricing`에서 featureKey별 예외 분기(`&& !isProfileCardManage` 류)로 제외를 되푸는 것을 **금지**한다 — 과거 이 우회가 premium/vvip에게 `PASS_COVERED` + 결제수단 전부 숨김을 내준 뒤 소비 단계에서 거부하는 막다른 길을 만들었다. 회귀 가드: `scripts/verify-billing-pass-policy.mjs`(제외 기능은 전 tier 미커버·숨김없음) + `scripts/verify-profile-card-action-policy.mjs`.
- **결제 계층 위치**: PortOne 서명·멱등·환불을 포함한 결제 검증은 **Cloudflare Worker(`worker/routes/profile.js`)에만 존재**. 레거시 Express(`server/routes/profile.routes.js`)의 프로필 추가/삭제 라우트는 결제 계층이 없어 **위임 응답(410 `USE_WORKER_PROFILE_ENDPOINT`)으로 차단**되어 있다.
- **UI**: 추가/삭제 모달에 "5,000원 단건결제 / 월정석" 2개 결제수단만 노출(`app/me/MeClient.tsx`).

## E. 음악 트랙 — 전곡 무료 (재생·다운로드 모두 결제 없음) — 2026-07-25 개정

- **정책 전환**: 달빛 음악실(`/music`)의 **전곡을 재생·다운로드 모두 무료**로 연다. 곡당 3코인(300원) 잠금/40초 미리듣기 구조는 폐지됐다. 원인: 미리듣기 프록시(`/api/music/audio?...&mode=preview`)가 같은 공개 바이트를 워커로 흘려보내 트래픽을 아끼지 못하면서 재생 첫 바이트 지연만 유발했고(직접 CDN 대비 워커 홉 1개 추가), 원본 MP3는 이미 공개 R2 버킷(`music.code-destiny.com`)에 있어 유출 방어 효과도 미미했다.
- **정본 1곳**: `lib/music-access-policy.js`의 `getMusicTrackAccessPolicy`가 **유효한 모든 음악 키를 `free_full`로 반환**한다(`isFreeFull = isValidMusicAudioSourceKey(...) || isFreeFullMusicTrack(...)`). 이 한 곳이 프론트 매니페스트·워커·UI로 자동 연쇄된다.
  - **재생**: 전곡 `audioUrl = buildMusicPublicUrl(...)` **직접 CDN URL** → 워커 프록시 없이 즉시 재생. `previewLimitSeconds`/`purchaseFeatureKey`는 free_full이라 `undefined`.
  - **다운로드**: `worker/routes/music.js`의 `resolveTrackPlan` free_full 분기로 `canDownload: true` → `/api/music/download`가 로그인 없이 파일명(`Content-Disposition`)을 붙여 통과.
  - **마운트 접근조회 소멸**: 프론트 `refreshMusicAccess`가 `locked_preview` 트랙만 필터하는데 대상이 0개가 되어 `/api/music/access` 호출 자체가 사라진다. purchase/미리듣기 UI는 렌더되지 않는다(휴면).
- **휴면 코드(제거 안 함)**: `MUSIC_FREE_FULL_AUDIO_SOURCE_KEYS`·`buildMusicTrackFeatureKey`·`resolveMusicTrackUnlockPricing`, 워커의 미리듣기/다운로드 게이트, 프론트 purchase 핸들러는 import·가드 유지를 위해 남겨뒀다(호출·렌더되지 않음, 최소 변경 원칙).
- **과거 구매/이용권**: 전곡이 열리므로 상위집합 — 기존 접근을 제거하지 않는다. 환불·마이그레이션 불필요, `Payment`/`PointHistory` 기록은 무해하게 잔존.
- **회귀 가드**: `__tests__/worker/music.pass-access-policy.test.js`(전곡 free_full·접근 배치 미호출·다운로드 무로그인 통과). `scripts/verify-billing-pass-policy.mjs`의 음악 섹션은 결정함수(`buildPassPaymentDecision`)를 합성 키로 검사하는 휴면 가드로 남는다.

## 신규 기능 추가 시 체크리스트

1. 결과가 저장되어 재열람 가능한 고정 콘텐츠인가? → **A. 잠금 콘텐츠**
2. 매번 새로 생성되는 개인화 리딩/AI 상담인가? → **B. 회당 결제**
3. 유료 레지스트리에 등록하지 않아도 되는 기본 기능인가? → **C. 무료**
4. 프로필 카드 추가/삭제처럼 건당 고정 관리 수수료(이용권 결제 불가)인가? → **D. 프로필 카드 추가/삭제**
5. 음악실(`/music`) 트랙인가? → **E. 음악 트랙 (전곡 무료 — 재생·다운로드 결제 없음)**
6. 가격 표시는 항상 원화(추후 현지 통화)로 — [1부 코인 표시 규칙](payment-policy-overview.md#2-코인레거시-내부-단위-표시-규칙) 참고
