---
status: active
updated: 2026-08-30
next: "배포 4주 뒤 §4 베이스라인 표를 실측으로 채운다 — 그전에는 목표치를 정하지 않는다"
---

# 애널리틱스 KPI 정의

작성 2026-08-30 · 근거 브랜치 `worktree-analytics-kpi-0830`

감사 [code-destiny-audit.md](code-destiny-audit.md) 요청 18 의 나머지 절반이다. **이벤트는 갖춰져 있었는데
"무엇을 성공으로 볼지"가 어디에도 없었다** — 그래서 계측은 늘어나는데 판정은 매번 직관으로 했다.

이 문서가 담는 것은 **정의와 그것을 볼 수 있는 화면 구성까지**다. 수치는 없다 — 홈 섹션 귀속이
2026-08-30 에야 나갔고(PR #1307), 그전 데이터로는 §3 의 분모·분자가 성립하지 않는다.
🔴 **목표치를 지금 정하지 않는다.** 베이스라인 없이 정한 목표는 나중에 "달성"의 근거가 못 된다.

## 1. 이벤트 인벤토리 (2026-08-30 `git grep` 실측)

범위: `js/ app/ lib/ index.html worker/`, 미러(`public/**`)·`dist/`·`out/` 제외.

| 이벤트 | 발화 지점 | 채널 | 분해에 쓸 파라미터 |
|---|---|---|---|
| `page_view` | `gtag("config")` 자동 (`js/core/analytics.js:90`) + 라우트 전환 (`app/providers/NavigationProvider.tsx:156`) | GA4 | `page_path` |
| `home_section_click` | `js/core/analytics.js:166` (앵커 위임) | GA4 | `section`(10종) · `destination` |
| `cross_sell_click` | `js/core/analytics.js:145` | GA4 | `from_service` · `to_service` |
| `share_receive` | `js/core/analytics.js:184` | GA4 | `referral_channel` |
| `retention_visit` | `js/core/analytics.js:202` | GA4 | `days_since_last_visit` |
| `free_saju_started` / `free_saju_completed` | `js/saju-engine.js:4881` / `:5413` | GA4 | `signed_in` |
| `checkout_opened` · `checkout_option_click` · `pass_verified_free` · `pass_store_entered` · `checkout_dismissed` · `checkout_pg_opened` | `js/core/checkout-entry.js:131` 의 `FUNNEL_EVENTS` | GA4 **+** 1st-party | GA4: `feature_key` · `option` · `coin_price` **뿐** (`:928`) / 1st-party: 여기에 `renderer` · `runtime` · `hasPassHint` · `dwellMs` · `steps` 추가 (`:911`) |
| `purchase_complete` | 셸 `index.html:25447` / React `app/components/PaymentProcessingContext.tsx:886` | GA4 | `feature_key` · `payment_mode` · `coin_price` |
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
| 동의 영향 | 거부 시 쿠키 없는 익명 집계로 하향 | 없음 (익명 이벤트라 동의와 무관) |
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
