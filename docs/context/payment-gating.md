# 결제 시스템 & 잠금 콘텐츠 — 상세 규칙

## 2026-10-10 시행: 영구 해금은 "계정 + 생년월일" 단위

이 절이 아래의 프로필·계정 단위 해금 서술보다 우선한다.

- 🔴 **출생 기반 영구 해금의 신원은 `userId + birthKey + contentKey`다.** `birthKey`는 이 계정에 **저장된 프로필 카드**의 출생 정보(년·월·일·시·분·시간 모름·양력/음력/윤달·성별)의 sha256이다. 이름·출생지·profileId는 넣지 않는다. 서버만 계산한다(정본 `worker/lib/birth-key.js`, 신원 해석기 `worker/lib/birth-scoped-unlock-identity.js`). 요청 본문의 생년월일은 신원에 쓰지 않는다.
- 대상 키는 `paid-feature-registry.js`의 `BIRTH_SCOPED_UNLOCK_FEATURE_KEYS`(사주 전체 풀이·대운·궁합, `rpt_*`, 자미두수 5종, 숙요 연운·숙요 해금, 낙샤트라 2종, 베딕 기본, 점성 해금, 운명의 섬 심층, 동물 운명, 사주 수호신, 시빌, FPTI, 여행·건강 리포트)다. 음악·테토겐·꽃/올림포스 운세 카드·RPG·사주 일기·비밀의 집·점술 팩은 `ACCOUNT_SCOPED_UNLOCK_FEATURE_KEYS`로 계정 단위를 유지한다. 둘 중 어디에도 없거나 둘 다에 있는 해금 키는 `assertUnlockScopeClassification()`이 막는다(새 해금 키를 추가하면 반드시 분류할 것). 회당 결제 키는 이 정책과 무관하다.
- 같은 계정에서 생년월일·시각·성별이 같은 카드는 해금을 공유한다. 다른 계정은 같은 출생 정보라도 따로 산다. 카드의 생년월일을 고치면 다시 잠기고, 되돌리면 다시 열린다. 궁합은 본인 → 상대 순서의 두 birthKey 쌍이다(상대도 저장 프로필이어야 한다).
- **구매는 이 계정 소유의 저장 프로필로만 한다.** profileId가 없으면 `400 MISSING_PROFILE_ID`, 남의 프로필·삭제된 프로필·합성 id면 `403 INVALID_PROFILE`이며 둘 다 `requiresProfile:true`를 싣는다. 이 확인은 어떤 차감·결제창보다 먼저다(웹 coin-gate, 단건 결제, V2 결제, Google Play intent 공통). 클라이언트는 직접 입력(저장하지 않은) 생년월일에서 서버를 부르지 않고 "프로필을 저장한 뒤 구매해 주세요"를 보여 준다.
- 저장: `ContentEntitlement` 행을 `scope:"BIRTH"`, `profileId:"birth:<birthKey>"`로 쓰고 `birthKey`·`purchaseProfileId`(감사용)·궁합이면 `partnerBirthKey`·`purchasePartnerProfileId`를 남긴다. 기존 유니크 인덱스가 출생 정보 단위로 걸리고, 보조 유니크 인덱스 `{userId, birthKey, serviceKey, contentKey}`(BIRTH 한정)를 선언한다. 합성 profileId는 응답으로 내보내지 않는다.
- 🔴 **USER 스코프 행, `__user__`, `User.unlockedFeatures/paidFeatures` 배열은 출생 기반 키의 근거가 아니다.** 배열은 되돌리기용으로 계속 쓰지만 읽지 않고, 응답에서도 뺀다.
- 이용권: 새 birthKey면 차감하고, 같은 birthKey면 차감 없이 열린다(보유 확인이 한도 확인보다 먼저). 단건 결제 중복 판정도 `userId + birthKey + contentKey`이며, 주문 `pricingSnapshot.birthKey`로 지급해 결제 도중 생년월일을 고쳐도 지급 대상이 바뀌지 않는다.
- 브라우저: 출생 기반 키는 localStorage(`cd_tile_locks` 등 계정 키·프로필 키 모두)에 저장하지도 읽지도 않는다. 서버가 **현재 profileId**에 대해 돌려준 응답만 해금 근거이며, 프로필 전환·생년월일 수정 때 해금 상태와 렌더 래치를 비우고 다시 조회한다. 잠금 문구는 "이 생년월일은 별도 구매가 필요합니다".
- 저장된 결과(`/records/`) 재열람은 이 정책과 무관하게 무료다.
- 기존 구매 이관: `scripts/migrations/20261010-birth-scope-unlocks.mjs`(기본 dry-run, `--apply`, `--create-index`). 구매 프로필의 **현재** 출생 정보로 BIRTH 행을 복사 생성하고 원본은 고치지 않는다. 구매 프로필을 알 수 없는 USER 행·삭제된 프로필·상대를 모르는 궁합 행은 `birthScopeExcludedAt`으로 표시만 한다. 🔴 운영 승격 전에 운영 DB `--apply`가 먼저다.

## 2026-10-09 가격·과금 유형 확정

이 절이 아래 과거 가격 기록보다 우선한다. 신규 결제 가격은 `worker/lib/paid-feature-registry.js`가 정본이며, 기존 구매로 기록된 영구 해금 권한은 유지한다.

- 종합 사주 풀이(`section_summary`): 5,000원, 영구 해금.
- 그 사람의 바람끼는?(`relationship-boundary-test`): 회당 5,000원.
- 퀀텀 명리 엔진(`rpt_quantumCard`): 10,000원, 영구 해금.
- 사주로 보는 여행지(`rpt_energyCoordCard`): 5,000원, 영구 해금.
- 퀀텀 로또 리포트(`fun.quantumLotto.ritualReport`): 회당 1,000원. 로또 번호 뽑기는 무료다.
- 인연의 장소(`destiny_meeting_place`): 회당 5,000원.
- 사주 동물 테스트(`animal-destiny-unlock`): 5,000원, 잠금 콘텐츠.
- LOVE CODE(`love-code`): 회당 5,000원. 과거 영구 해금 권한은 기존 계정에서 계속 인정한다.

천원 운세 허브의 재미 사주 콘텐츠는 여행지 리포트를 제외한 5종으로 유지한다. 퀀텀 로또 리포트는 번호 생성 무료/리포트 회당 결제를 분리해 표시한다. 이 가격 변경에는 실결제·운영 DB 쓰기·배포가 포함되지 않는다.

## 2026-10-08 승인: 상담 중심 구매와 5회권 판매

이 절이 아래 과거 판매 기록보다 우선한다. 상세 구현·검증은 [상담 구매 흐름 정리](../design/simple-packs.md)를 따른다.

- 영냥이는 질문 → 추천 범위 → 이번 상담 1회(기본) 또는 같은 범위 5회권으로 안내한다. 단건은 기존 공통 결제창에서 환불 동의와 결제 수단을 확인한다. 이용권·Family·월정석은 보유 혜택에서 사용자가 선택하며 사전 조회로 차감하지 않는다.
- 신규 10·20회권 판매는 종료한다. 서버 정본의 SERVICE_PACK_PLANS는 과거 상품 해석용으로 보존하고 SERVICE_PACK_SALE_IDS만 판매 가능 목록으로 쓴다. 새 주문은 409 PRODUCT_SALE_ENDED로 막되, 판매 종료 전에 생성된 유효한 동일 주문·스냅샷의 복구, 결제 확인·웹훅 지급·선물 수령은 보존한다. 새 주문 ID로 재생성하는 우회는 허용하지 않는다.
- 남기는 5회권은 현재 서버 등록소의 가격·30일·같은 등급 지원 상담 조건을 그대로 쓴다. 기존 10·20회권의 남은 횟수·만료일·범위·환불과 과거 결과 재열람 권리는 소급 변경하지 않는다.
- 월간 4등급 판매는 영냥이 구매 화면에서만 제외하며 꿀꿀 사주에서는 유지한다. 앱 판매 가능 여부·PG 경계도 유지하며 미지원 이용권을 웹 결제로 우회하지 않는다.
- 재미있는 사주 콘텐츠의 기존 1,000원 목록, 종합 사주 가격, 기타 기능 가격은 2026-10-09 가격·과금 유형 확정 절에서 일부 갱신했다.
- 운명의 꽃은 로그인 후 무료다. 서버 인증·네 체계 계산은 유지하며 신규 결제·월정석 청구는 FEATURE_NOW_FREE로 차단한다. 과거 상품 정의·주문·원장을 삭제하지 않는다. 실결제·유료 LLM·운영 DB 쓰기·운영 승격은 이번 승인에 포함하지 않는다.

## 2026-10-05 가격 정정: 원래 생선 비율 1:3:5:10

사용자가 고등어 3,000 · 연어 9,000 · 광어 15,000 · 참치 30,000원을 재확인했다. 모둠은 50,000원, 오마카세는 80,000원으로 별도 확정했다. 아래 0.302 환산표는 잘못된 기준이므로 이 절로 대체한다.

- 단건 가격 정본은 `worker/lib/paid-feature-registry.js`. 6체계 24종과 융합 4종 모두 동일한 정본을 사용한다.
- 생선 팩은 기존 5·10·20회, 20%·30%·40% 할인 유지. 고등어 12,000/21,000/36,000 · 연어 36,000/63,000/108,000 · 광어 60,000/105,000/180,000 · 참치 120,000/210,000/360,000원.
- 새 팩 정책 버전은 `yeongnyangi-pack-20261005-ratio-corrected`. 30일·자동갱신 없음·단건 PG 구매·같은 생선 전용을 유지하며 기존 구매의 `packSnapshot`과 남은 횟수는 수정하지 않는다.
- 월정석 1개=10원과 Family 권리·한도, 천원 콘텐츠 6종, 종료된 체험 이벤트는 그대로다.
- Play 등록이 확인되지 않은 9,000/15,000/50,000/80,000원 구간은 `APP_SKU_NOT_VERIFIED`로 닫는다. 기존 Play SKU 가격·ID를 변경하지 않는다.

## 2026-10-05 시행: 영냥이 정식가(고등어 3,000원)와 천원 사주 콘텐츠

2026-10-04 사용자 결정으로 10-02에 준비한 9,900원 체계(고등어 9,900·연어 17,900 …)는 폐기하고 그 표에 0.302를 곱해 100원 단위로 맞춘 값을 시행한다. 이 절이 아래 2026-10-02 체험가 절의 예정가 숫자와 2026-10-01 절의 팩 가격보다 우선한다.

- 영냥이 단건(`worker/lib/paid-feature-registry.js`): 고등어 3,000 · 연어 5,400 · 광어 7,200 · 참치 10,500 · 모둠(3종 각) 14,800 · 오마카세 30,000원. 코인=원÷100, 월정석 배수 1(1개=10원, 2026-10-03 절의 혼합 결제 그대로).
- 생선 팩(`worker/payments/service-pack-policy.js`, `yeongnyangi-pack-*-v3`, policy `yeongnyangi-pack-20261005`): 같은 생선 단건 합계에서 5·10·20회 20%·30%·40% 할인. 고등어 12,000/21,000/36,000 · 연어 21,600/37,800/64,800 · 광어 28,800/50,400/86,400 · 참치 42,000/73,500/126,000원. 30일·자동갱신 없음·웹 단건 PG 전용은 그대로다. 이미 팔린 팩은 `packSnapshot`으로 판정하고, `servicePackCoverage`는 `0 < 스냅샷 단가 ≤ 현재 단가`인 같은 생선 상담에 적용한다.
- 체험가 종료: `lib/brand/launch-offer.ts` `active:false`. 예정가 숫자는 실결제가와 같게 두었다.
- 천원 사주 콘텐츠 6종(cost 10, amountKRW 1,000, billingType `unlock` 영구 해금, LLM 없음): `rpt_specialCharmCard`·`rpt_skillTreeCard`·`rpt_energyCoordCard`·`rpt_villainCard`·`rpt_secretHouseEntryCard`·`fun.quantumLotto.ritualReport`. 표시는 `js/core/saju/reportDashboard.js`와 `js/saju-engine-tarot-sukuyo-quantum.js`가 하드코딩하므로 레지스트리와 함께 바꾼다. `/yeongnyangi/1000-won-fortune/`(URL·"천원 운세" 이름 유지)는 이 6종의 허브이며 빌드 가드가 6개 키의 amountKRW===1000을 요구한다.
- 이용권 하한: `MIN_PASS_COVERABLE_COIN`·`FAMILY_MIN_PASS_COVERABLE_COIN` 30→10(`worker/lib/profile-limits.js`, verify:pass-tier-policy가 레지스트리 최저가와 같기를 요구). 천원 콘텐츠를 되돌리면 이 값도 함께 되돌린다.
- 앱(Google Play): 30코인(tier ₩3,000)·300코인(₩30,000)은 기존 SKU로 판매. 54·72·105·148코인은 `APP_UNVERIFIED_CONTENT_COIN_PRICES`로 실패 폐쇄. 천원 콘텐츠 6종은 무료 구간(≤10코인)이어도 `isAppFreeFeature`가 무료 통과를 거부해 SKU 등록 전까지 `APP_SKU_NOT_VERIFIED`(503)로 닫힌다(사용자 결정 "앱에서도 천원이더라도 돈은 받도록"). 음악 10코인 무료 통과는 유지.

## 2026-10-03 승인: 10월 5일 영냥이 월정석 할인

기존 10월 5일 정식 가격 전환과 함께 영냥이의 월정석 배수를 5에서 1로 복원한다(1개=10원). 가입 보상 500개·지급분별 30일 만료는 그대로다. 사용자가 직접 선택한 수량을 상담 단건 결제에서 할인하고 남은 금액을 PG로 결제한다. Family·전액 월정석 선택은 유지하며 횟수권 구매에는 적용하지 않는다. 결제 미확정 상태에서 선택 수량을 바꾸거나 예약된 월정석을 재사용하지 않는다. 주문·차감·원장은 원자적으로 예약하고, PG 실패/전액 취소가 서버에서 확정되었을 때만 멱등 복원한다. 클라이언트가 창을 닫았다는 사실만으로는 복원하지 않는다. 혼합 결제는 웹 원화 상담에만 적용하며 PG 최소 잔여 금액을 지킨다. 가격 전환 전에는 이 할인을 활성화하지 않는다. 실결제·운영 DB·운영 승격은 개발 검증에 포함하지 않는다.

> 이 파일은 필요할 때만 읽는 참조 문서입니다. 항상 로드되는 규약 요약은 루트 [CLAUDE.md](../../CLAUDE.md)에 있습니다.

## 결제 시스템 & 잠금 콘텐츠 규칙

본 서비스는 3가지 재화(이용권/월정석/코인)와 2가지 과금 방식(회당 결제/영구 해금)으로 유료 기능을 관리한다. 상세 정책은 문서로 분리되어 있으니 신규 기능 추가 전 반드시 참고할 것:

- [docs/payment-policy-overview.md](../payment-policy-overview.md) — 재화 정의(이용권/월정석/코인), 코인 표시 규칙
- [docs/payment-policy-content-access.md](../payment-policy-content-access.md) — 잠금 콘텐츠 vs 회당 결제 vs 무료 판별 기준 및 현재 목록
- [docs/payment-policy-flow.md](../payment-policy-flow.md) — 게이팅 우선순위, 결제 플로우, 변경 이력

**핵심 요약**:
- **이용권**(30일, 구독형이나 자동갱신 없음) → **월정석**(이벤트 지급, 구매 불가, 구독 아님) → **코인**(레거시 내부 단위) 순으로 게이팅
- 🔴 **이용권은 30일 만료와 월 한도 소진 중 먼저 오는 쪽에서 끝난다**(2026-09-04). 한도 사이클 키가 이용권 자신의 만료일이라 기간 안에서 리셋되는 일이 없어, 다 쓴 이용권의 남은 기간은 가치가 0이었다 — 그래서 소진 시점에 `expiresAt` 을 `now` 로 당기고 등급을 free 로 내려 **즉시 종료**시킨다(정본 `worker/payments/passes.js` `terminatePassOnBudgetExhaustion`, 임계 `worker/lib/profile-limits.js` `MIN_PASS_COVERABLE_COIN`). 판정은 "잔여로 열 수 있는 유료 항목이 하나도 없을 때"이고, 남은 기간은 소멸하며 재구매는 그날부터 30일을 새로 준다. 🔴 **새 "소진 플래그"를 만들어 곳곳에서 검사하지 말 것** — 활성 판정이 전부 `expiresAt` 을 보므로 만료일을 당기는 것만으로 하위 판정이 전부 뒤집힌다(원칙 6). 🔴 문구에 "다음 달에 다시 열림"·"기간 내 리셋"을 쓰지 않는다(`scripts/verify-pass-tier-policy.mjs` 가 12개 로케일 + 셸 + React 를 전수로 막는다).
- 🔒 **[필수·예외없음] 모든 유료 결제 게이팅 순서** (2026-08-01 개정 — 축이 "언제 검사하는가"에서 "이용권 보유자가 어떤 경로로도 돈을 내지 않는가"로 바뀌었다). 신규/수정 불문 모든 유료 기능은 아래를 그대로 따른다. 벗어나는 결제 구현은 금지이며, 발견 시 즉시 사용자에게 보고한다(작업 중 우연히 마주쳐도 그냥 지나치지 말 것):
  1. **진입 판정은 로컬 스냅샷만** — 구독 스냅샷(`cd_subscription_snapshot_v2`, 판정 정본 `js/core/pass-verdict.js`)이 커버를 확답하면 서버 왕복 없이 **즉시 무료 통과**(낙관 grant, 서버 기록은 백그라운드). 확답하지 못하면 **기다리지 말고 결제창**을 연다. 🔴 **진입 시 서버 이용권 선검사를 되살리지 말 것** — 그 왕복(구 셸 6초 예산+재시도 2회, React 15초 프로브)이 결제창 앞 지연의 본체였다.
  2. **결제창이 이용권 검사 지점** — 결제창 첫 카드는 **[이용권으로 구매]**(`data-mode="pass-store"`)이고, 누르면 그 자리에서 서버에 물어 커버되면 결제 없이 무료로 열고, 아니면 이용권 상점으로 인계한다(`/points?plan=…` → 상점 화면에서 해당 플랜 강조, 결제 확인 모달은 사용자가 연다 — cdco=1 자동 오픈은 2026-09-03 제거 → 결제 후 원래 화면 복귀). 결제창에는 **[이용권으로 구매] · 단건결제(KRW, PortOne) · 월정석 3옵션이 항상 함께** 보이고, 단건/월정석은 동등 우선순위다(`equalPriorityMethods: ["DIRECT_KRW","MOONLIGHT_STONE"]`).
  3. **스냅샷 없는 이용권 보유자의 구제 지점은 2번(결제창 이용권 카드) 하나다** (2026-08-08 정정). 새 기기·시크릿창·저장소 삭제로 스냅샷이 없는 보유자는 진입에서 커버를 확답받지 못해 결제창을 보게 되는데, 거기서 **[이용권으로 구매]를 누르면 그 자리에서 서버가 판정**해 무료로 열어 준다. 🔴 **카드 주문 직전에 서버 이용권 재검사를 넣지 말 것** — `worker/routes/billing.js`의 호출자 없는 `grantPassFreeAccessBeforeCardIfAvailable`는 제거했고, `scripts/verify-billing-pass-policy.mjs`·`verify-paid-gate-ui-regression.mjs`가 checkout/confirm 경로에서 이 함수를 쓰면 **실패시킨다**("DIRECT_KRW prepare performs zero pass lookups"). 사용자가 단건을 명시적으로 고른 뒤의 왕복은 결제 임계경로를 늘리는 비용일 뿐이라 의도적으로 제거됐다. 죽은 함수를 되살리려면 그 verify 단언 4곳을 함께 뒤집어야 하며, 그건 정책 변경이므로 임의로 하지 말 것.
  4. **단건 결제(PortOne)는 사용자가 결제창에서 '단건'을 고른 이후에만** 실행(`_cdRunDirectKrwCheckout`/`_dpRunDirectKrwCheckout`에 도달). 🔴 2026-08-24부터 그 사이에 **결제수단 2단계**가 하나 더 있다 — 단건 카드를 누르면 같은 창에서 신용카드·간편결제 / 실시간 계좌이체 / 휴대폰 소액결제(**유일한 준비 중**) / 컬쳐랜드·도서문화·스마트문상 상품권 6종 + `[뒤로]` 로 바뀐다(계좌이체·상품권은 2026-08-29 개방). 정본은 `js/core/checkout-entry.js`의 `DIRECT_PAY_METHODS` 표 + `buildDirectPayMethodStepHtml` 하나이며, 세 렌더러는 그것을 호출만 한다. 🔴 **표의 키는 카드 id 이고 PortOne `payMethod` 는 항목 안에 있다** — 상품권 3종이 `GIFT_CERTIFICATE` 를 공유하고 `giftCertificateType` 이 필수라서다. 🔴 **2단계 노드에 `data-mode`를 붙이지 말 것**(선택 `data-pay-method`, 복귀 `data-pay-step="back"`) — `[data-mode]`는 "고르면 모달을 닫는" 노드라 붙이면 수단을 고르는 대신 창이 닫힌다. 🔴 **1단계 그리드를 innerHTML로 교체하거나 2단계 진입에서 카드를 잠그지 말 것** — `[뒤로]`로 돌아온 카드가 죽는다(둘 다 `verify:checkout-pass-card` ⑬이 실행으로 잡는다). 앱(Play Billing)에서는 2단계를 만들지 않는다. 반환 계약은 그대로 `'direct'`이고, 고른 값은 `resolveDirectPayFields()`를 거쳐 PortOne 요청의 `payMethod`(+ 상품권이면 `giftCertificate`)가 된다(서버 `getPortOnePublicConfig`의 `payMethod:"CARD"`는 폴백). 🔴 **2026-09-02 부터 `/points` 이용권(30일) 결제도 같은 표를 쓴다** — 결제 확인 모달의 옛 `[원화 결제]` 버튼 하나가 이 표를 map 한 타일 그리드로 바뀌었다(`app/points/PointsClient.tsx`). 다만 그 화면은 Tailwind 라 `buildDirectPayMethodStepHtml` 대신 마크업만 자기 어휘로 그리고 표는 접근자(`directPayMethodLabel`·`directPayMethodMeta`·`isDirectPayMethodEnabled`)로 읽는다 — `cd-direct-payment-*` CSS 를 `/points` 로 끌어오지 말 것(정본 CSS 배열의 4번째 소비자가 되면 parity 가드가 지키는 3렌더러 구도가 흐려진다). 고른 값은 결제창과 **같은 window 슬롯**(`setSelectedDirectPayMethod`, TTL 120초)으로 넘기고 `handleSubscribe` 진입에서 한 번만 푼다. 🔴 서버도 함께 열려 있어야 한다 — `worker/lib/entitlement-policy.js` 의 `PG_PAYMENT_METHODS` 가 표의 `orderMethod` 를 전부 `"pg"` 로 정규화하지 못하면 결제창은 뜨는데 prepare 가 `INVALID_PAYMENT_METHOD_FOR_PASS_PRODUCT` 로 죽는다(`verify:checkout-pass-card` ⑭ 가 표를 전수로 넣어 양끝을 대조하고, 월정석 계열이 그 목록에 새면 같은 블록이 실패시킨다). **앱 이용권 상점(Play Billing)은 여전히 별개다.** 상세: [payment-policy-flow.md](../payment-policy-flow.md).
  - **금지 패턴(=위반, 발견 시 보고 대상)**: ① 결제창에서 **[이용권으로 구매] 카드를 없애거나 단순 상점 링크로 되돌리기**(스냅샷 없는 보유자가 확인할 방법을 잃는다) ② 진입 경로에 서버 이용권 선검사 부활(`CD_PASS_FIRST_BUDGET_MS`·`CD_PASS_SLOW_NOTE` 부활 금지, `snapshotVerdictOnly` 제거 금지) ③ 카드 주문(checkout/confirm) 경로에 서버 이용권 조회 재삽입(`grantPassFreeAccessBeforeCardIfAvailable` 되살리기 포함 — verify 가드 4곳이 막는다) ④ 결제창에 단건 또는 월정석 한쪽만 노출 ⑤ 서버 runtimeGate/paymentPayload에 `paymentMode:"DIRECT_KRW"` 하드코딩(월정석 옵션 소거 — 과거 ziwei-ai에서 제거된 결함) ⑥ 공유 게이트(`useCoinGate`/`_cdOpenPaidServiceGate`/정적 결제 모달) 우회하는 커스텀 체크아웃 ⑦ 🔴 **앱에서 `/points`로 프로그래매틱 이동**(앱 번들에 없고 `app-payment-guard`는 앵커 클릭만 가로챈다 → 빈 화면). 반드시 `window.__cdOpenChargeModal`(가드가 `/app/store/`로 고정)을 먼저 타며, 판정 정본은 `js/core/checkout-entry.js`의 `shouldUseAppStoreEntry()`(애매하면 앱 경로로 폴백).
  - **예외**: 프로필 카드 추가·삭제(D유형, `passExcluded`) **모두** 이용권 결제 불가라 이용권 옵션 없이 곧바로 결제창(단건/월정석)을 연다 — 그래도 두 결제수단은 동등 노출. **family 포함 모든 등급**이 이용권 커버 대상이 아니며(서버 정본은 `isPassExcludedPricing` 하나 — featureKey별 예외 분기 금지), family 무료는 이용권 결제가 아니라 정책 계층(`profile-card-mutation-policy.js`)의 0원 바이패스로 처리된다. 계정당 첫 카드도 등급 무관 무조건 무료. 금액은 건당 1,000원 / 월정석 100(코인 10) — 2026-10-10 인하: 5,000원(코인 50 · 월정석 500) → 1,000원(코인 10 · 월정석 100). 해금이 출생정보(birth) 단위로 묶여 프로필을 수정·재생성해도 기존 구매를 우회할 수 없게 되었기 때문이다. 인하 전 결제 증빙(5,000원 주문·월정석 500)은 `LEGACY_PROFILE_CARD_COSTS`로 계속 인정한다. 앱에서는 무료 구간 가격이지만 `APP_PAID_LOW_PRICE_FEATURE_KEYS`로 무료 통과를 막아 ₩1,000 SKU 등록 전까지 `APP_SKU_NOT_VERIFIED`. 상세는 [content-access D유형](../payment-policy-content-access.md#d-프로필-카드-추가삭제-고정-관리-수수료).
  - **영냥이 제휴 결제(2026-09-30 승인 반영)**: 영냥이 유료 상품28개는 **Family 이용권·월정석·단건 결제**를 받는다. Standard·Premium·VVIP의 적용 범위는 늘리지 않는다. 등록소의 기존 `paymentScope:"direct_or_family"`는 유지하되 `membershipCreditAllowed:true`, `membershipCreditMultiplier:5`와 `getPaidFeaturePaymentPolicy`가 실제 허용 수단을 결정한다. 월정석 차감은 `calculatePaidFeatureMembershipCreditCost` 정본을 사용하며 1,000원 상담은500개, 다른 가격도 같은 비율이다. Family는 기존 공용 한도와 `(featureKey, requestId)`당1회 차감 조건을 유지한다. 결제창은 세 선택지를 함께 표시하고 월정석이 영냥이 세계에서1/5 가치라는 제휴 안내를 제공한다. 같은 상담의 현금·Family·월정석 결제는 공용 funding claim으로 중복 차감을 막고, 저장 결과 재열람은 다시 차감하지 않는다. 결과가 전혀 없는 확정 생성 실패의 월정석 복원은 요청·사용 증거·잔액·복원 영수증을 한 트랜잭션으로 처리한다. 저장 장·초안·활성 생성 lease가 있으면 자동 복원하지 않는다. `verify:billing-pass-policy`와 월정석 회귀 검사가 이 경계를 검증한다. 전용 횟수권 판매 조건은 별도이며 이 조항으로 활성화되지 않는다.
  - **검증**: 결제 관련 수정 시 `npm run verify:billing-pass-policy`·`verify:portone-single-payment`·`verify:paid-gate-ui`·`verify:payment-choice-parity`·`verify:checkout-pass-card`·`verify:paid-feature-billing-policy`·`verify:ai-prompt-billing-policy`를 먼저 실행. `verify:checkout-pass-card`는 문자열이 아니라 **jsdom에서 이용권 카드를 실제로 눌러** 두 갈래(커버→무료 통과 / 미커버→상점 인계)와 앱 분기를 확인한다. 뒤 두 개는 가격/과금유형 정본(`paid-feature-registry.js`)과 프론트 게이트·워커 라우트의 정합성을 보는 가드로, GitHub Actions "Paid Flow Gates"에서도 차단한다. 상세 규칙은 [flow 문서 결제창 노출 규칙](../payment-policy-flow.md) 참고.
  - 🔴 **결제수단 선택창 UI는 단일 규격이다** — 렌더러가 3종(정적 셸 `index.html` `_cdChooseServicePaymentMode` + 5미러 / React `app/_lib/billing-client.ts` `openReactPaymentChoiceModalInner` / 독립 정적 폴백 `js/destiny-profile.js` `_dpRenderStandalonePaymentChoice` + `public/js` 사본)이지만 **정본은 셸 인라인 하나**다. CSS 정본은 `_cdEnsureDirectPaymentStyles`의 규칙 배열이고 클래스 프리픽스는 `cd-direct-payment-*`로 고정. 세 곳 모두 "달빛 결제 방식 선택" 제목 + 달 헤더 + **[이용권으로 구매]/단건 결제/월정석 3옵션**(이용권 카드가 맨 위 + `추천` 배지, 클릭 시 그 자리에서 서버 이용권 검사)를 렌더해야 하며, `npm run verify:payment-choice-parity`가 CSS 텍스트 동일성·구조 마커·**3옵션 설명 문구 동일성**을 강제한다(예전에는 문구가 렌더러마다 달라도 통과했다). 🔴 **결제창은 열릴 때 월정석 잔량을 조회하지 않는다**(2026-08-12, 자동 조회·잔여바·`월정석 재조회` 버튼 제거). 그 `/api/billing/balance` 왕복(22초 예산·재시도 없음)이 간헐 503과 "잔량 확인 중" 고착의 원인이었고, 월정석을 고르면 서버 `coin-gate`가 같은 1왕복 안에서 확인+차감하므로 열 때의 표시용 조회는 순수 부가 비용이었다. 세 렌더러 모두 **열 때는 호출부가 넘긴 잔량만** 쓴다 — 402 부족 후 재노출 경로가 lot 정본 잔량을 실어 보내면 그때만 월정석 카드가 회색이 된다. 🔴 **단, 잔량 표시 자체는 온디맨드로 돌아왔다**(2026-08-13): 월정석 카드 **아래 형제**로 `[보유 월정석 확인]` 버튼(`.cd-direct-payment-balance-check` + `data-monthly-balance-check`, 결과 줄 `data-monthly-balance-text`)이 항상 있고, **눌렀을 때만** 조회한다. 첫 클릭은 기존 캐시(셸 15초 memo + access-state 60초 스냅샷 / React `fetchBillingBalance` recent)를 그대로 허용해 값이 신선하면 네트워크 0회로 끝나고, 두 번째부터만 `fresh`로 서버 캐시를 우회한다. 조회 실패는 문구로만 알리고 **월정석 카드의 활성 상태를 절대 건드리지 않는다**(미확정 ≠ 부족). 🔴 **`data-mode`를 붙이지 말 것** — 세 렌더러가 `[data-mode]`를 "고르면 모달을 닫는" 노드로 일괄 처리하므로 붙이면 확인 버튼이 결제창을 닫는다. 옛 자동 조회 잔여바 마커(`cd-direct-payment-moonbal-current`·`data-mode="monthly-refresh"`·`data-monthly-current`)는 **계속 금지**이며 되살아나면 parity 가드가 실패시킨다. `verify:paid-gate-ui`는 각 렌더러의 잔량 조회 호출이 **정확히 1곳**이고 그 위치가 확인 버튼 마크업보다 뒤(=핸들러 안)인지까지 본다. 진입·복귀·계측 배관은 `js/core/checkout-entry.js` 하나를 공유한다. 페이지 전용 결제창을 새로 만들지 말 것(과거 `celestial-harmony.html`의 `.celestial-pay-*`는 이용권 상점 카드가 없어 제거됨 — 독립 정적 페이지는 `/js/destiny-profile.js`를 로드하면 정본 폴백이 자동 인계된다).
- **코인은 폐지된 개념** — 서버 내부 계산에만 남아있고, 사용자에게는 항상 통화(현재 KRW, `1코인=100원` 고정 — `worker/lib/billing-policy.js`, 프론트는 `lib/payment/coin-pricing.ts`)로 환산해 표시. 신규 UI 작성 시 `coinPrice`/`cost`를 그대로 렌더링하지 말 것
- 신규 유료 기능은 "재열람 가능한 고정 콘텐츠"인지 "매번 생성되는 개인화 결과"인지에 따라 잠금 콘텐츠(`unlock.*`, `forceDeduct: true`) 또는 회당 결제(`PER_USE_PAID_FEATURE_KEY_LIST`)로 등록 — 판별 기준은 [content-access 문서](../payment-policy-content-access.md) 참고

### 관련 핵심 파일 레퍼런스

| 파일 | 역할 |
|------|------|
| `worker/lib/paid-feature-registry.js` | 모든 유료 기능 가격/유형 정의 |
| `worker/lib/content-unlocks.js` | 콘텐츠 잠금 해제 관리 (`ContentEntitlement`, `getUnlockedContentSnapshot`) |
| `worker/lib/billing-policy.js` | 코인↔KRW 환산 상수/함수 (`KRW_PER_COIN = 100`) |
| `lib/payment/coin-pricing.ts` | 프론트용 코인→KRW 표시 유틸(`formatKrwFromCoins`) |
| `worker/lib/models.js` | DB 스키마 (`profileSubscription`, `MonthlyCreditLedger`, `pointHistorySchema`) |
| `worker/routes/fortune.js` | 사주/자미두수 접근 게이팅 (`accessSource` 분기) · `PERSISTENT_UNLOCK_KEY_SET` |
| `worker/lib/nakshatra-paid-access.js` | 회당결제 라우트의 서버측 결제 증빙 확인 (`verifyPerUsePayment`) |
| `worker/lib/moonstone-spend-proof.js` | 🔴 **월정석 차감 증빙 조회의 유일한 정본** (`findMoonstoneSpendEvidence`) — 새 사본을 만들지 말 것 |
| `app/hooks/useCoinGate.ts` | 프론트 단건 결제 훅 |

🔴 **월정석 증빙 쿼리를 라우트에 복제하지 말 것** (2026-08-16) — 월정석의 회계 정본은 `MonthlyCreditLedger` 하나이고 쓰는 곳도 `worker/payments/moonstone.js` 하나인데, **읽는 곳이 15곳에 각자 손으로 적힌 쿼리로** 흩어져 있었다. writer 가 바뀔 때마다 그중 몇 곳이 조용히 죽고, 죽은 자리에서 **월정석이 차감된 사용자가 402(미결제)** 를 받았다(초융합 ₩30,000 · 네오 팩폭 전략실, 두 번 재발). 이제 조회는 `worker/lib/moonstone-spend-proof.js` 하나이며, 정산 판정은 `settledAt` 단독이 아니라 **① `settledAt` ② 구 billing.js 행의 `afterBalance` ③ 미정산이면 `User.recentConsumeRequestIds`(차감의 정본 증거)** 3갈래다 — ③ 이 없으면 "차감은 끝났는데 정산 write 가 아직 안 내려앉은 창"에서 돈 낸 사용자가 402 를 맞는다(크론 sweep 은 5~10분 뒤). writer↔reader 왕복 계약은 `__tests__/worker/per-use-proof-roundtrip.test.js` 가 **소비 라우트 전수**로 고정한다.

🔴 **`PERSISTENT_UNLOCK_KEY_SET`은 영구 해금의 기록 주체가 아니다** — 위치도 `content-unlocks.js`가 아니라 `worker/routes/fortune.js`다. 해금을 실제로 기록하는 곳은 `User.unlockedFeatures`이고, coin-gate(`billing.js`)와 카드 단건결제(`payments.js` `recordUserPaidFeature`)가 `isUnlockPaidFeatureKey` 기준으로 함께 쓴다. 저 상수는 `/api/fortune/*` 응답의 `unlockedFeatures`/`unlockMap` 필터와 PointHistory 복구 경로 전용이라, **신규 잠금 기능을 추가할 때 여기 등록하지 않아도 결제·재열람은 정상 동작한다**(같은 계약의 `ziwei-island-deep-report`·`nakshatra-lord-report`·`nakshatra-dasha-map`이 모두 미등록 상태로 동작 중). 등록이 필요한 경우는 그 키를 `/api/fortune/*` 응답으로 내보내야 할 때뿐이다.

## 스테이징 1,000원 테스트 모드 (2026-09-06)

실결제 테스트가 불가능해 **PG 결제창 → 승인 → 서버 검증 → 웹훅 → 지급**의 실제 왕복이 한 번도 실행되지 않았다. 스테이징에서만 **청구가**를 1,000원(KG이니시스 최소 승인금액)으로 낮춰 그 왕복을 끝까지 돌려 보는 장치다. **상품 가격 정본(`paid-feature-registry.js` · `PASS_MONTHLY_WON`)은 그대로다** — 낮아지는 것은 주문 문서에 실리는 금액 하나뿐이다.

**켜지는 조건은 서버 env 두 개의 AND 하나뿐이다.**

```
청구가 = (APP_ENV === "staging" && PAYMENT_TEST_AMOUNT_KRW >= 1000)
       ? min(PAYMENT_TEST_AMOUNT_KRW, 정가)
       : 정가
```

- 🔴 **요청 본문·헤더·쿼리를 보지 않는다** — 클라이언트가 `staging=true` 류 값을 보내 프로덕션에서 소액 결제를 만들 수 없다. 이 성질을 깨는 수정(바디에서 플래그를 읽는 것)은 금지다.
- 🔴 두 조건 중 하나라도 없으면 **정가**다(fail-safe). 프로덕션 워커에는 `APP_ENV` 자체가 없고, 프로덕션 `worker/wrangler.toml` 로 `PAYMENT_TEST_AMOUNT_KRW` 가 새어 들어가는 것은 `verify:worker-config-parity` 의 `STAGING_ONLY_KEYS` 가 막는다(가드가 실제로 무는 것을 변이로 확인함).
- 판정 정본은 `worker/lib/portone.js` 의 `resolveTestChargeAmountKRW` · `resolveChargeAmountKRW` 두 함수뿐이고, 금액 계산은 순수 모듈 `worker/lib/billing-policy.js` 의 `applyTestChargeAmount` 가 한다. 🔴 `billing-policy.js` 에서 env 를 읽지 말 것 — `lib/payment/server-feature-pricing.ts` 가 이 모듈을 클라이언트 번들에 넣는다.

**적용되는 곳(PG 로 실제 돈이 나가는 경로만):** `POST /orders` · `POST /prepare`(셸·PointsClient 컷오버 어댑터) · `POST /subscription/prepare`. 셋 다 **상품/플랜 객체 단계**에서 덮어쓴다 — 주문 문서에 직접 쓰면 `hasPriceDrift`/`hasPassDrift` 가 재가격 신호로 읽어 다음 요청에서 정가로 되돌린다.

**적용되지 않는 곳(의도적):** 월정석·코인 게이트(KRW 청구가 아니라 원장이다) · `grantOrderEntitlement` 의 상품 조회(지급은 언제나 정가 상품 정보를 본다) · `enforcePassPurchasePolicy`(패밀리 등급의 상위상품 차단 같은 구매 정책은 상품 가치 기준이어야 한다) · Google Play 인앱결제(SKU 가격은 콘솔이 정하고 PortOne 을 타지 않는다).

**검증·웹훅·지급 코드는 한 줄도 고치지 않았다.** `verifyPgPayment` 는 클라이언트 값이 아니라 **주문 문서의 금액**과 대고, 지급은 `featureKey`/`subscriptionTier` 만 읽는다 — 1,000원을 내도 혜택·기간·권한이 정가 구매와 동일하다.

**프론트엔드는 무변경이다.** 화면 표시가는 정가로 남고(응답의 `pricing` 은 정가 상품에서 조립된다) PG 창에서만 1,000원이 청구된다. 스테이징에서 "결제창 10,000원 / PG창 1,000원"은 **의도된 차이**다.

계약 고정: `__tests__/worker/payments-v2.staging-test-amount.test.js`.

## 결제 안전 규칙 (2026-08-28 `AGENTS.md` 에서 이관)

- 결제 작업 전 [docs/PAYMENT_AND_ACCESS.md](../PAYMENT_AND_ACCESS.md) 와 결제 정책 3부작([overview](../payment-policy-overview.md) · [content-access](../payment-policy-content-access.md) · [flow](../payment-policy-flow.md))을 먼저 읽는다.
- **결제 정본 파일 6종** — 이 목록 밖에서 결제 판정 로직을 새로 만들지 않는다.

  | 파일 | 역할 |
  |---|---|
  | `worker/routes/billing.js` | coin-gate 경로 |
  | `worker/routes/payments.js` | 카드 단건 결제 경로 |
  | `worker/lib/paid-feature-registry.js` | 유료 기능 가격·유형 정의 |
  | `worker/lib/billing-policy.js` | 환산·정책 상수 |
  | `worker/lib/profile-limits.js` | 프로필 한도 |
  | `worker/lib/payment-refund.js` | 환불 경로 |

- 🔴 **결제 문구는 제품 용어 3종을 유지한다**: `이용권` · `월정석` · `단건 결제`. 사용자에게 보이는 새 문구에 **코인 중심 표현을 도입하지 않는다** — 코인은 레거시 내부 계산 단위다.
- 모든 유료 흐름은 등록소가 허용하는 접근 옵션(이용권 · 단건 결제 · 월정석)을 보존한다. 영냥이도 승인된 제휴 정책에 따라 세 옵션을 표시하며 이용권 적용은 Family의 기존 조건을 따른다.
- **클라이언트는 최종 과금 판정을 하드코딩하지 않는다.** 서버의 registry/policy 가 결정한다.
- 서버는 **명시적 `MEMBERSHIP_PASS` 커맨드에서만** 이용권 커버리지를 조회한다. `DIRECT_KRW` 와 `MONTHLY` 는 이용권 상태를 묻지 않는다 — 서버 권위의 가격·잔액·결제·엔타이틀먼트 검사는 그대로 적용된다.
- 결제는 됐는데 서비스가 전달되지 않았으면 엔타이틀먼트 복구 · 월정석 크레딧 복원 · 환불 경로를 검토한다.
- 🔴 프로덕션 대상 실제 취소·환불·정산은 **명시적 승인 없이 실행하지 않는다.**
- 결제 정책 · 가격 · 접근 순서 · 환불 동작 · 인증 · DB 스키마 · Worker 바인딩 · 배포 설정을 가볍게 바꾸지 않는다.

## 2026-09-08 렌더러 정본 경로 정정
결제 카드 CSS와 공통 마크업은 js/core/checkout-entry.js의 PAYMENT_CHOICE_CSS_RULES 및 buildPaymentChoiceCardsHtml이 정본이다. 위의 셸 인라인 CSS 정본 서술은 이전 위치이며 현재 위치로 해석한다. DOM 부착과 세 렌더러 우선순위는 별도 책임으로 유지한다. 가격·지급·진입 순서는 바꾸지 않았다.

## 영냥이 전용 횟수 이용권·선물 (2026-09-30 승인)

- 전용 세트는 일반 profileSubscription과 독립된 PurchaseEntitlement(type=service_pack)다. 해당 생선 등급의 6개 상담 체계에서 상담 한 건당 1회를 차감하며, 다른 생선·융합 상담은 포함하지 않는다. 가격·회수·기간 정본은 worker/payments/service-pack-policy.js의 SERVICE_PACK_PLANS 하나다. 현재는 **빈 판매목록**이며 판매 정책 확정 전 임의 값을 넣지 않는다.
- **이용권 구매는 단건 PG 결제만 가능하다.** SELF/GIFT prepare와 내부 주문 생성 모두 기존 normalizePurchasePaymentMethod의 pg 판정만 허용한다. 월정석·기존 이용권·가족 권리·잔액으로 새 이용권을 구매하지 않는다. 이는 구매 규칙이며, 기존 상담의 월정석 결제(영냥이 500개 = 1,000원 상담)와 Family 적용 권리는 유지한다. 선물 수락에는 새 결제나 잔액 차감을 요구하지 않는다.
- 기존 Gift/GiftGrant/선물 링크·선물함·수락 흐름을 재사용한다. 구매자에게 즉시 권리를 주지 않고 수락자에게 한 번 지급한다. 기존 수락기한 1년·본인 수락 허용은 유지하며, 이용기간은 수락 시 시작한다. CLAIMED 후 PG 취소는 기존 정책대로 수락자 권리를 자동 회수하지 않고 운영 검토로 남긴다. 구매자 주문과 Gift/GiftGrant/수락자 권리 연결 검증은 생략하지 않는다.
- 상담 소비·공유 결제 예약·증빙·PAID 연결과 결과 0건 실패 시 1회 복원은 각각 기존 트랜잭션 경계 안에서 처리한다. 조회·재개는 무차감이고, 복원은 현금 환급이나 만료 연장이 아니다.
- PENDING 주문에서 결제창을 닫거나 확인 응답이 유실됐다고 새 주문을 자동 생성하지 않는다. 같은 멱등키와 주문을 서버에서 재확인한다. 미승인·취소가 확정되지 않은 상태를 클라이언트만으로 결제 실패로 단정하지 않는다.
- 구현·검증·남은 판매 정책은 [전용 세트 인수인계](../handoff/yeongnyangi-service-packs-2026-09-30.md)를 따른다. 이 기술 구현 승인은 실제 PG·운영 DB·환불 실행·배포 승인이 아니다.

## 2026-09-30 승인: 꽃돼지 v4 및 영냥이 전용 횟수권 판매

신규 웹 구매부터 flower-20260930 / *_1m_v4를 적용한다. Standard 9,900원 / 30일 한도 20,000원, Premium 29,900원 / 60,000원, VVIP 59,900원 / 120,000원, Family 149,000원 / 350,000원이다. 건당 적용 상한은 5,000원 / 10,000원 / 30,000원 / Family 기존 범위다. 기존 legacy·v2·v3의 구매 및 진행 중 주문은 원래 정책으로 판정하며, 기존 Family 500,000원 한도를 소급 축소하지 않는다. 활성 이용권에 다른 버전을 혼합하지 않는다. Play SKU 검증 전 앱 판매 제한은 유지한다.

영냥이 SERVICE_PACK_PLANS는 승인된 12개 상품을 판매한다. 가격은 각 생선 공통 14,900원 / 39,900원 / 79,900원이며 횟수는 고등어 19/50/100회, 연어 6/17/33회, 광어 4/10/20회, 참치 2/5/10회다. 해당 생선의 6개 상담 체계에만 1회씩 적용하고 다른 생선·융합 상담은 제외한다. 본인 지급 또는 선물 수락부터 30일이며 자동 갱신은 없다. 구매는 웹 단건 PG 전용이며 월정석·기존 이용권으로 구매하지 않는다.

상담의 월정석은 1,000원당 500개를 유지한다. Family 상담 권리와 중복 차감 방지·결과 없는 확정 실패의 기존 복원 규칙을 유지한다. API/DB 스키마는 변경하지 않으며 실제 PG·운영 DB 쓰기·운영 승격은 기술 구현 승인에 포함되지 않는다. 이 절이 과거 가격표 및 빈 판매목록 안내보다 우선한다.

## 2026-10-01 승인: 영냥이 전용 세트 회수·가격 교체

신규 구매부터 `yeongnyangi-pack-20261001` / `yeongnyangi-pack-*-v2`를 적용한다. 전 생선 공통 5·10·20회이며 같은 생선 단건 합계에서 10%·15%·20% 할인한다. 고등어 4,500 / 8,500 / 16,000원, 연어 13,500 / 25,500 / 48,000원, 광어 22,500 / 42,500 / 80,000원, 참치 45,000 / 85,000 / 160,000원이다. 가격은 SERVICE_PACK_PLANS에 승인값 그대로 적고 단가에서 계산하지 않는다(테스트가 할인 사다리와 단가표의 일치를 확인한다). 30일·자동갱신 없음·웹 단건 PG 전용·대상 상담 범위·월정석 1,000원당 500개는 2026-09-30 절과 같다. 이미 결제·지급된 -v1 주문과 권리, 미수락 선물은 저장된 packSnapshot으로 판정하며 소급 변경하지 않는다. 진행 중이던 -v1 미결제 주문은 판매목록과 스냅샷이 달라 "이어가기"가 막히고 주문 ID 재확인만 가능하다. 이 절이 2026-09-30 절의 영냥이 가격·회수보다 우선한다.

## 2026-10-02 영냥이 체험가 표기 (표시 전용)

'정식 오픈 예정가'의 표시 정본은 `lib/brand/launch-offer.ts`다. 단건 기준 고등어 9,900, 연어 17,900, 광어 23,900, 참치 34,900, 모둠 49,000, 오마카세 99,900원이다(같은 날 처음 정한 27,900·43,900·79,000·139,000·290,000원은 단계 간 격차가 너무 크다는 사용자 요청으로 낮췄다). 생선 팩은 팩가에 같은 생선의 단건 배율을 곱한 뒤 100원 단위로 반올림한다. 실결제가(`worker/lib/paid-feature-registry.js`, SERVICE_PACK_PLANS)와 결제창은 바꾸지 않는다. 예정가는 결제창에 띄우지 않는다. '정가'라는 표현은 금지한다. 선착순 1,000명이 차면 `active:false`로 수동 종료한다.

## 2026-10-02 승인: 운명의 섬 12궁 심층 상담 5,000원

`ziwei-island-palace-consult`(운명의 섬 12궁 심층 상담)를 10,000원(cost 100)에서 5,000원(cost 50)으로 내린다. 사용자 결정(2026-10-02)이다. 정본은 `worker/lib/paid-feature-registry.js` 한 줄이고, 섬 라우트·결제창·`/island-consult` 화면은 레지스트리만 읽는다. 결제 순서와 수단은 그대로다. 달빛 이용권이 있으면 먼저 쓰고, 그다음 월정석 500개(이전 1,000개), 그다음 단건 결제 5,000원 순이다. 건당 한도 50코인과 같아져 Standard 이용권도 이 상담을 덮게 된다(한도 비교가 ≤). 이는 가격으로 정해지는 일반 규칙의 결과이며, 같은 가격의 `relationship-boundary-test`와 같다. 앱 결제 SKU는 코인 기준이라 `cd_content_tier_06`에서 `cd_content_tier_02`로 바뀐다. 자미두수 전문가 상담(30,000원)과 섬 12궁 심층 리포트(3,000원)는 바꾸지 않는다. 이미 결제된 주문은 저장된 결제 금액으로 인정한다. 다만 변경 전에 만든 10,000원 미결제 주문을 이어서 결제하면 금액 대조에서 막힐 수 있다(2026-09 인하 때와 같은 조건). 같은 날 카드 단건으로 연 섬 상담이 품질 실패(`generation_failed`)로 끝나면 자동 환불하도록 `ziwei-ai.js`의 `refundCardPaymentOnFailure`를 이식한다.

## 2026-10-04 승인: 기본 사주 궁합 LLM 서비스화 + 5,000원

`compat-saju-compatibility`(꿀꿀 운세 기본 사주 궁합)를 3,000원(cost 30)에서 5,000원(cost 50)으로 올린다. 사용자 결정(2026-10-04)이며, 같은 결정으로 이 상품은 브라우저 계산 결과에서 LLM 서술 결과로 바뀐다. 정본은 `worker/lib/paid-feature-registry.js`의 한 줄이고 화면·검증기·`PAYMENT_POLICY.md`는 이 값을 따른다. 결제 순서와 수단은 그대로다. 달빛 이용권이 있으면 먼저 쓰고, 그다음 월정석 500개, 그다음 단건 결제 5,000원 순이며, 단건은 사용자가 선택한 뒤에만 결제한다. 선결제이고 환불·정산 규칙은 바꾸지 않는다. 앱 결제 SKU는 코인 기준이라 `cd_content_tier_01`에서 `cd_content_tier_02`로 바뀐다(`worker/lib/app-store-pricing.js`의 coinPrices 대조). 레거시 숙요점 궁합(3,000원)과 숙요점 궁합 전문가 상담(30,000원)은 바꾸지 않는다. 이미 결제된 주문은 저장된 결제 금액으로 인정한다. 변경 전에 만든 3,000원 미결제 주문을 이어서 결제하는 경우의 금액 대조는 검증하지 않았다.
