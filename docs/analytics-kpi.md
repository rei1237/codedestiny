---
status: active
updated: 2026-09-24
next: "S1 운영 승격 뒤 셸 경로 UTM 링크 1회(쿠키 동의 후 — React 경로는 캐시로 최대 7일 옛 analytics.js)로 GA4 실시간 출처를 확인하고, 그 뒤 주간 GA4 purchase ↔ 서버 원장을 아래 S1 대조 규칙으로 맞춘다. §4 베이스라인 전에는 목표치를 정하지 않는다"
---

# 애널리틱스 KPI 정의

## 2026-09-24 측정 정합(S1) (아래 절들보다 우선)

**GA4 구매 0 vs DB paid 5(8/24~9/20)의 원인은 전송 부재다.** 그 기간 운영에는 표준 `purchase`·`view_item` 이벤트가 없었다 — `purchase`는 2026-09-21 00:46 KST 운영 승격(`f0ffba34e`, release run 35520552743), `view_item`은 09-22 23:54 KST 승격(`209816684`)부터 나간다. 시간대·내부 필터·테스트 주문으로는 0↔5를 설명할 수 없고, 아래 대조에서만 쓴다.

- **UTM 손실(09-21 00:46 KST ~ S1 운영 승격 전):** config·page_view 가 `page_location` 의 쿼리를 통째로 떼어 모든 캠페인 유입이 귀속을 잃었다(로컬 프로브에서 실제 gtag.js 요청의 `dl` 에 쿼리 없음 실측). S1부터 경로 + `utm_*` 만 보낸다(`js/core/analytics.js` `pageLocation()`). 이 기간의 캠페인·소셜 유입 보고는 쓰지 않는다.
- **`item_id` 보정:** 지급 완료 봉투(`worker/payments/compat.js` `legacyConfirmEnvelope`)는 featureKey 를 `accessGrant` 안에만 실어 `item_id` 가 `fortune` 으로 떨어졌다. S1부터 `accessGrant.featureKey` 를 읽는다. 그 전의 `item_id=fortune` 구매는 상품 미상으로 본다.
- **GA4 `purchase` 는 하한이다.** 동의하지 않은 방문(`analytics_storage=denied`, 배너 미선택 포함)은 쿠키 없는 핑만 보내고, 블렌디드 보고 ID가 아니면 보고서에는 식별자 사용에 동의한 사용자의 데이터만 들어간다. 모델링 자격(거부 이벤트 하루 1,000건 7일 + 동의 사용자 하루 1,000명)도 현재 규모로는 멀다([GA4 도움말](https://support.google.com/analytics/answer/11161109)). 건수·매출 정본은 서버 원장이고, GA4 `purchase` 는 동의 구매자의 유입 귀속에만 쓴다.
- **대조 규칙(GA4 ↔ DB):** 기간은 09-21 00:46 KST 이후만. DB 쪽은 승인 시각(`paidAt`) 기준 KST 일 단위의 웹 PG 결제 완료 주문(이용권·단건)에서 선물·Play 결제·테스트 주문을 뺀다(월정석 사용은 결제가 아니다). GA4 쪽은 보고 시간대가 Asia/Seoul 인지 먼저 확인하고 `purchase` 거래 수를 센다. GA4 ≤ DB 가 정상(동의·광고 차단·gtag 로드 전 이탈)이고, GA4 > DB 면 중복 전송을 먼저 의심한다.
- **중복 제거의 한계(정책 유지):** 같은 문서에서는 메모리로, 동의 사용자는 `localStorage` 로 거래당 1회다. 미동의 사용자의 새로고침·결제 복귀 재전송은 막지 않는다(동의 없이 저장하지 않는 기존 정책). 같은 `transaction_id` 의 웹 구매는 GA4가 중복 제거한다([GA4 도움말](https://support.google.com/analytics/answer/12313109)).
- **아직 `purchase` 가 없는 경로:** Play 결제(앱 내부 테스트 단계), 선물(`/gift` 계측 제외·응답에 금액 없음), 마스터 연애·영냥이 활성화 복구 경로, `analytics.js` 를 싣지 않는 독립 정적 페이지 12개(유료 게이트가 있는 `vedic-astrology`·`pet-saju`·`celestial-harmony` 포함). DB 와 어긋나면 이 목록부터 본다.
- **반영 지연:** 셸 8벌은 `?v=build-<내용 해시>` 라 승격 즉시 새 파일을 받는다. React 경로는 `app/layout.js:198` 의 고정 `?v=20260814-ga4-v1` 이고 `/js/*.js` 가 브라우저·엣지 7일 캐시다(2026-09-24 운영 헤더 실측: `max-age=604800`·`cdn-cache-control` 7일·`cf-cache-status: HIT`). 그래서 React 경로의 analytics.js 변경은 최대 7일 늦게 닿는다(엣지가 배포 때 비워지는지는 미확인). 09-21 `purchase` 도입도 같은 조건이었다.
- **검증:** `node --test __tests__/ui/purchase-analytics.test.mjs` — 실제 `legacyConfirmEnvelope` 봉투로 대기→지급→재응답 = `purchase` 1·`entitlement_granted` 1·`item_id`=featureKey, `utm_*` 유지·그 외 쿼리 제거.

### 소셜 링크 UTM 규칙

- 값은 소문자 snake_case(`[a-z0-9_]`)만 쓴다. 개인정보·토큰·사용자 ID는 넣지 않는다.
- `utm_source` = 플랫폼: `instagram` · `threads` · `kakao` · `youtube` · `naver_blog` · `x`.
- `utm_medium` = 오가닉(게시물·프로필 링크·채널 메뉴)은 `social` — GA4 Organic Social 은 이 매체 값만으로 판정된다. 광고는 `paid_social`(출처가 GA4 소셜 목록에 있으면 Paid Social, 없으면 Paid Other). `channel`·`share`·`post` 는 어떤 기본 채널 규칙에도 맞지 않아 출처에 따라 Unassigned 가 된다([GA4 기본 채널 그룹](https://support.google.com/analytics/answer/9756891)).
- `utm_campaign` = 시리즈·장치(예: `fortune_month01`, `channel_menu`, `profile_link`), `utm_content` = 게시물·소재(예: `f01_20260924`).
- 사이트 내부 링크에는 UTM을 달지 않는다(세션 출처를 덮는다). 내부 이동은 `cross_sell_click`·`home_section_click` 으로 본다. 현재 예외 1곳: 셸의 영냥이 진입 버튼 2개(`index.html:20333`, `utm_source=code_destiny&utm_medium=referral`, 테스트가 href 를 고정)는 S1 승격부터 다시 귀속을 덮는다 — 후속 과제.
- 공개 공유 링크의 `utm_medium=share&utm_campaign=public_share` 는 `share_receive` 계약이라 이 규칙으로 바꾸지 않는다.
- 예: `https://code-destiny.com/today/?utm_source=instagram&utm_medium=social&utm_campaign=fortune_month01&utm_content=f01_20260924`

## 2026-09-21 사업 리팩토링 기준 (아래 과거 정의보다 우선)

- 구매 원장은 서버 주문이다. 브라우저 `purchase`는 승인 응답 관찰이며 PG 콜백만으로 전송하지 않는다. `purchase_complete` 과거 건수와 더하지 않는다.
- 영냥이 상품 선택 확정 `view_item`, 버튼 클릭 `purchase_attempt`, 요청 생성 성공 `consultation_start`를 구분한다. item_id는 canonical 구매 키다.
- `fortune_completed`와 `fortune_first_open`은 호환용 **브라우저 최초 관찰**이다. 계정 전체의 최초 열람이나 실제 저장 완료의 원장이 아니다. v2부터 `metric_version:2`로 분리한다.
- `fortune_result_view`: 실제 렌더된 paid 챕터에만 발생. result_state=partial/complete, entry_source=direct/library, observation=browser_render. 각 상태를 문서 생명주기 내 중복 제거한다. 보관함 링크 클릭 자체를 열람으로 세지 않는다.
- 실제 전달률은 동일 승인 코호트의 주문→요청 연결, COMPLETED·manifest 전체 저장·completedAt을 대조한다. 미연결·부분·환불·테스트·미분류를 별도 집계한다. 0개 분모는 0%가 아니라 N/A다.
- 공개 이벤트에는 프로필·생년월일·질문·결과 본문·상담 ID를 보내지 않는다. 인증 토큰을 URL/이벤트에 넣지 않는다. 기존 동의 정책과 브라우저 중복 제거의 기기별 한계를 유지한다.
- 8/24~9/20 생성 주문 중 현재 paid 5건과 GA4 구매 0은 승인일 코호트나 적격 고객 매출이 아니다. 테스트 제외·PG 대조·보고 시간대 대조 전 숫자를 전환율로 만들지 않는다.

실측과 미확인 항목은 [사업 마스터](business-refactor.md)에 기록한다.

작성 2026-08-30 · 근거 브랜치 `worktree-analytics-kpi-0830`

감사 [code-destiny-audit.md](code-destiny-audit.md) 요청 18 의 나머지 절반이다. **이벤트는 갖춰져 있었는데
"무엇을 성공으로 볼지"가 어디에도 없었다** — 그래서 계측은 늘어나는데 판정은 매번 직관으로 했다.

이 문서가 담는 것은 **정의와 그것을 볼 수 있는 화면 구성까지**다. 수치는 없다 — 홈 섹션 귀속이
2026-08-30 에야 나갔고(PR #1307), 그전 데이터로는 §3 의 분모·분자가 성립하지 않는다.
🔴 **목표치를 지금 정하지 않는다.** 베이스라인 없이 정한 목표는 나중에 "달성"의 근거가 못 된다.

## 1. 이벤트 인벤토리 (2026-08-30 `git grep` 실측 · `analytics.js`·결제 행은 2026-09-24 재실측)

범위: `js/ app/ lib/ index.html worker/`, 미러(`public/**`)·`dist/`·`out/` 제외.

| 이벤트 | 발화 지점 | 채널 | 분해에 쓸 파라미터 |
|---|---|---|---|
| `page_view` | `gtag("config")` 자동 (`js/core/analytics.js:125`) + 라우트 전환 (`app/providers/NavigationProvider.tsx:175`) | GA4 | `page_path` · `page_location`(경로 + `utm_*` 만) |
| `home_section_click` | `js/core/analytics.js:272` (앵커 위임) | GA4 | `section`(10종) · `destination` |
| `cross_sell_click` | `js/core/analytics.js:251` | GA4 | `from_service` · `to_service` |
| `share_receive` | `js/core/analytics.js:294` | GA4 | `referral_channel` |
| `retention_visit` | `js/core/analytics.js:315` | GA4 | `days_since_last_visit` |
| `free_saju_started` / `free_saju_completed` | `js/saju-engine.js:4881` / `:5413` | GA4 | `signed_in` |
| `checkout_opened` · `checkout_option_click` · `pass_verified_free` · `pass_store_entered` · `checkout_dismissed` · `checkout_pg_opened` | `js/core/checkout-entry.js:131` 의 `FUNNEL_EVENTS` | GA4 **+** 1st-party | GA4: `feature_key` · `option` · `coin_price` **뿐** (`:928`) / 1st-party: 여기에 `renderer` · `runtime` · `hasPassHint` · `dwellMs` · `steps` 추가 (`:911`) |
| `purchase_complete` | 셸 `index.html:26293` / React `app/components/PaymentProcessingContext.tsx:893` | GA4 | `feature_key` · `payment_mode` · `coin_price` |
| `purchase` · `entitlement_granted` | `js/core/analytics.js:192` `cdTrackConfirmedPurchase` ← 셸 `index.html:23672` · dp `js/destiny-profile.js:5803`(결제)·`:4666`(복귀) · 이용권 `app/points/PointsClient.tsx:3885` | GA4 | `transaction_id` · `value` · `items[0].item_id` |
| `login` · `signup` | `app/components/auth/AuthShell.tsx:520,536,563` | GA4 | `method` |
| `share_clicked` · `copy_link_clicked` · `native_share_opened` · `social_share_clicked` · `share_completed` · `share_failed` | `app/components/ShareWidget.tsx:128~158` (`lib/share.v2.ts:52`) | GA4 | `shareChannel` |

`section` 10종(`index.html` 의 `data-cd-funnel-section`): `hero` · `concern_pick` · `today_hub` ·
`today_pick` · `quick_services` · `signature_consult` · `service_index` · `finder` · `why_us` ·
`secondary_panel`.

## 2. 채널이 둘이고, 담는 것이 다르다

| | GA4 (`G-FMHV4ZHY3G`) | `checkout_funnel_events` (MongoDB) |
|---|---|---|
| 범위 | 위 표 전부 | 결제 퍼널 6종만 |
| 보존 | GA4 기본 보존 | **90일 TTL** (`worker/lib/models.js:563`) |
| 고유값 | 사용자·세션 단위 결합, 획득 채널 | `renderer` · `runtime` · `hasPassHint` · `dwellMs` · `steps` — **GA4 에는 안 실린다**(`js/core/checkout-entry.js:928` 이 3개만 싣는다) |
| 동의 영향 | 거부 시 쿠키 없는 핑만 — 보고서에는 동의 사용자만 잡힌다(위 S1 절) | 없음 (익명 이벤트라 동의와 무관) |
| 읽는 법 | GA4 UI | `node scripts/report-pg-window-latency.mjs --days 7` |

적재 경로는 `worker/routes/billing.js:7140` (`POST /api/billing/funnel-event`), 스키마는
`worker/lib/models.js:548`. 🔴 개인식별자를 담지 않는 컬렉션이므로 사용자 단위 퍼널은 GA4 에서만 된다.

## 3. KPI 정의

### 3-1. 북극성 — 주간 `purchase_complete` **건수**

비율이 아니라 건수다. 이 레포의 병목은 전환율이 아니라 모수라는 것이 기록된 판단이고
([code-destiny-audit.md](code-destiny-audit.md) §3-1), 건수는 모수 × 전환율이라 어느 쪽이 움직여도 잡힌다.
전환율만 북극성으로 두면 트래픽이 줄어도 지표가 좋아지는 함정이 생긴다.

### 3-2. 단계 KPI

| KPI | 계산식 | 분해축 | 무엇을 판정하나 |
|---|---|---|---|
| 홈 섹션 클릭률 | `home_section_click` ÷ 홈 `page_view` | `section` 10종 | 어느 면이 실제로 이동을 만드는가 — A/B 의 판정 지표 |
| 섹션 점유 | 섹션별 `home_section_click` ÷ 전체 `home_section_click` | `section` | 홈 구조를 바꿨을 때 클릭이 어디로 옮겨갔나 |
| 무료 체험 완주율 | `free_saju_completed` ÷ `free_saju_started` | `signed_in` | 무료 경로에서 이탈이 나는지 |
| 결제창 도달률 | `checkout_opened` ÷ `free_saju_completed` | `feature_key` | 무료→유료 다리가 작동하는지 |
| 결제창 전환율 | `purchase_complete` ÷ `checkout_opened` | `feature_key` · `payment_mode` | 결제창 자체의 설득력 |
| 결제창 이탈률 | `checkout_dismissed` ÷ `checkout_opened` | `feature_key` / `dwellMs`(1st-party) | 위 지표의 반대편 — 얼마나 보고 나가나 |
| 이용권 경로 비중 | (`pass_verified_free` + `pass_store_entered`) ÷ `checkout_opened` | `hasPassHint`(1st-party) | 이용권이 단건을 잠식하는지 / 스냅샷 없는 보유자 구제가 작동하는지 |
| 재방문 | `retention_visit` ÷ 전체 세션 | `days_since_last_visit` | 리텐션 |
| 공유 유입 | `share_receive` ÷ `share_completed` | `referral_channel` | 공유가 실제 방문을 데려오는지 |

### 3-3. 품질 KPI (위 지표의 원인 변수)

| KPI | 출처 | 왜 |
|---|---|---|
| 클릭→PG창 소요 p50/p95 | `checkout_pg_opened.steps` — **1st-party 에만 있다** | "결제창이 느리다"를 추측 없이 판정. 결제창 전환율이 떨어졌을 때 첫 용의자 |
| 결제창 체류 시간 | `checkout_dismissed.dwellMs` | 즉시 이탈(=오폭)과 고민 후 이탈을 가른다 |

## 4. 베이스라인 — 미측정 (채울 자리)

배포 4주 뒤 GA4 에서 채운다. **빈칸을 추정으로 메우지 않는다.**

| KPI | 4주 베이스라인 | 측정일 |
|---|---|---|
| 주간 `purchase_complete` 건수 | — | — |
| 홈 섹션 클릭률(전체) | — | — |
| 무료 체험 완주율 | — | — |
| 결제창 전환율 | — | — |
| 클릭→PG창 p95 | — | — |

## 5. 이 위에 KPI 를 세우면 안 되는 것 (함정)

- 🔴 **`app/hooks/useAnalytics.ts` 의 이벤트는 존재하지 않는다.** `cta_click` · `payment_attempt` ·
  `share_click` · `funnel_step` 은 호출자가 0이라(2026-08-30 `git grep` 실측: `useAnalytics` 참조는 정의부
  1건뿐) GA4 에 한 건도 없다. 이름만 보고 KPI 를 세우면 영원히 0 인 지표가 된다.
- 🔴 **홈 `page_view` 는 셸 내부 전환을 세지 않는다.** 홈은 정적 셸 하나라 탭 전환·펼치기는 새 `page_view`
  를 만들지 않는다. 그래서 "홈 `page_view`"는 **홈 로드 수**이지 화면 조회 수가 아니다.
- 🔴 **`home_section_click` 은 앵커만 센다.** 탭 전환·펼치기 버튼은 화면을 떠나지 않아 제외돼 있다
  (`js/core/analytics.js:158` 주석, 가드가 음성 테스트로 고정). 섹션 클릭률의 분자는 "이 섹션이 만든 이탈"이다.
- 🔴 **`purchase_complete` 을 결제 시도와 섞지 말 것.** 시도 축은 `checkout_option_click` 하나이고,
  같은 행동에 두 번째 발화를 붙이면 분해가 불가능해진다.
- **동의 거부분은 사라지지 않지만 얇아진다.** `analytics_storage: denied` 에서도 익명 집계는 되므로
  총량은 남고, 사용자·세션 단위 결합이 성기어진다. 섹션별 분해가 얼마나 성길지는 실데이터를 봐야 안다.

## 6. 볼 수 있게 만드는 법

GA4 UI 작업이라 레포에서 커밋할 것이 없다. 탐색(자유 형식) 3개면 §3 이 다 덮인다.

1. **홈 귀속** — 측정기준 `section`, 측정항목 이벤트 수. 비교: 이벤트 이름 = `home_section_click`.
2. **결제 퍼널** — 유입경로 탐색. 단계: `checkout_opened` → `checkout_option_click` → `purchase_complete`.
   분류: `feature_key`.
3. **무료→유료** — 단계: `free_saju_started` → `free_saju_completed` → `checkout_opened`.

품질 KPI(§3-3)는 GA4 에 없다. `node scripts/report-pg-window-latency.mjs --days 7` 로 본다 —
읽기 전용이고 `.env.local` 의 MongoDB URI 를 쓴다.

### 아직 읽는 경로가 없는 것

`checkout_funnel_events` 중 **`hasPassHint` · `renderer` · `runtime` 별 집계는 어디서도 볼 수 없다.**
GA4 에 안 실리고(위 §2), 유일한 조회기인 `report-pg-window-latency.mjs` 는 `checkout_pg_opened` 의
`steps`·`dwellMs` 만 본다. §3-2 의 "이용권 경로 비중"을 실제로 재려면 그 조회기를 하나 더 만들어야 한다
— 이 문서를 쓴 시점에 **미착수**다.
