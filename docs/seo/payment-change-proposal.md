# 결제·로그인 경로 변경 제안서 (F3 · A1)

작성 2026-11-14 · 근거 브랜치 `wt/naver-seo-geo-20261113-234756` · **코드는 바꾸지 않았다**

검색 유입 작업 범위 밖이라 손대지 않은 두 가지를 제안으로만 적는다. 둘 다 결제 실행 파일을 고쳐야 해서 사용자 승인이 필요하다.

표기: 「확인」은 코드에서 직접 읽은 것, 「추정」은 실제 기기에서 재현하지 않아 확정하지 못한 것이다. **이번에 실제 인앱 브라우저(카카오톡·네이버 앱·인스타그램)에서 결제·로그인을 해 보지 않았다.** 실패가 실제로 얼마나 일어나는지는 모른다.

---

## F3. 인앱 브라우저에서 결제·로그인 복귀가 끊길 수 있음

### 지금 동작 (확인)

- 결제·로그인 경로에는 인앱 브라우저를 알아보는 코드가 없다. `js/core/checkout-entry.js`, `js/core/payment-service.js`, `lib/payment/portone.ts`, `app/_lib/billing-client.ts`, `app/components/auth/AuthShell.tsx`에서 `navigator.userAgent`를 읽는 곳이 0건이다.
- 인앱 감지 자체는 사이트에 이미 한 곳 있다. 홈 화면 추가 안내가 카카오톡·인스타그램·페이스북을 알아보고 "외부 브라우저로 열어 주세요"라고 안내한다(`js/pwa-lifecycle.js:54-55`, 정규식 `KAKAOTALK|Instagram|FBAN|FBAV`). 네이버 앱은 이 목록에 없다.
- 결제 복귀 티켓은 **localStorage가 정본**이다(`js/core/checkout-entry.js:1514-1528`). 카카오페이처럼 다른 앱에 다녀오면 새 탭으로 돌아오는 일이 많아 예전 sessionStorage 방식에서 이미 옮겼다. sessionStorage는 결제 모듈이 아직 안 붙었을 때의 예비 경로로만 남아 있다(`js/destiny-profile.js:4324-4334`).
  - 0단계 보고서의 "복귀 티켓이 sessionStorage"는 **결제 티켓에 대해서는 맞지 않는다.** 아래 두 가지에만 해당한다.
- 로그인 복귀용 임시 저장은 sessionStorage다.
  - 사주 입력값 임시 보관: `js/saju-engine.js:4443`(로그인 창을 띄우기 직전), 복귀 뒤 읽기 `:4473`.
  - 랜딩 입력 폼에서 셸로 넘기는 값: `app/components/SeoLandingBirthForm.tsx:214`.

### 문제

1. (추정) 인앱 브라우저에서 구글 로그인은 구글 정책상 막히는 경우가 있다. 지금은 사전 안내 없이 로그인 버튼을 그대로 보여 준다.
2. (추정) 인앱 브라우저에서 소셜 로그인이나 간편결제 앱으로 나갔다가 **다른 브라우저나 새 탭**으로 돌아오면 sessionStorage가 비어 있다. 결제 티켓은 localStorage라 같은 브라우저 안에서는 살아남지만, 로그인 직전에 넣은 생년월일은 사라져 처음부터 다시 입력해야 한다.
3. (추정) 인앱 브라우저와 기본 브라우저는 저장소가 서로 다르다. 결제 승인 뒤 기본 브라우저로 복귀하면 localStorage 티켓도 보이지 않는다. 이 경우 서버 재조정 작업이 나중에 정산한다고 주석에 적혀 있다(`js/core/checkout-entry.js:1521`, "최대 20분 뒤").

### 바꿀 파일과 요지

| 단계 | 파일 | 요지 | 결제 동결과의 관계 |
|---|---|---|---|
| 1 | 새 파일 `js/core/inapp-browser.js` (가칭) | UA로 카카오톡·네이버 앱·인스타그램·페이스북을 판정하는 함수 하나. `js/pwa-lifecycle.js`의 정규식을 여기로 모으고 `NAVER\(inapp` 추가 | 동결 밖 |
| 2 | `app/components/auth/AuthShell.tsx`, 셸 로그인 모달 | 인앱이면 로그인 버튼 위에 "외부 브라우저에서 열기" 안내와 버튼을 보인다. 안드로이드는 `intent://` 링크(서버에 같은 방식이 이미 있다, `worker/routes/auth.js:1277-1287`), 카카오톡은 `kakaotalk://web/openExternal`. **로그인 게이트 판정은 바꾸지 않는다** | 동결 밖. 다만 로그인 화면이라 승인 필요 |
| 3 | `js/saju-engine.js:4443`, `app/components/SeoLandingBirthForm.tsx:214` | 로그인 직전 입력값 보관을 localStorage + 1시간 만료로 옮긴다(결제 티켓과 같은 방식). 읽을 때는 localStorage → sessionStorage 순 | `js/saju-engine.js`는 사주 엔진 파일이라 이번 작업의 금지 대상 |
| 4 | `js/core/checkout-entry.js` (결제창을 열기 직전) | 인앱이면 결제 수단 선택 화면에 "결제가 끝나면 이 화면으로 돌아와 주세요" 한 줄 또는 외부 브라우저 유도 | **결제 실행 파일.** `config/payment-freeze.json`의 통째 동결 목록(`app/_lib/billing-client.ts`, `app/hooks/useCoinGate.ts`, `lib/payment/portone.ts`)에는 없지만, 작업 지시의 변경 금지 파일이다. 셸 쪽 정본 렌더러 `_cdChooseServicePaymentMode`(`index.html`)는 동결 구역이라 문구를 넣으려면 `node scripts/verify-payment-freeze.mjs --update`가 필요하다 |

권장 순서는 1 → 2 → 3이다. 4는 실제 실패 건수를 본 뒤 결정하는 편이 낫다.

### 위험

- UA 판정이 틀리면 일반 브라우저 사용자에게 불필요한 안내가 뜬다. 안내만 띄우고 진행은 막지 않으면 피해가 작다.
- 3번은 생년월일을 localStorage에 잠시 두게 된다. 지금 로그인 모달 문구는 "이 탭에 1시간 동안 임시 보관"이라고 안내하므로, 저장 위치가 바뀌면 이 문구와 개인정보 안내도 함께 맞춰야 한다.
- 4번은 결제 선택 화면 3벌(셸·독립 폴백·React)이 같은 문구를 유지해야 한다는 기존 규칙(`verify:payment-choice-parity`)에 걸린다.

### 검증

- 실제 기기: 카카오톡·네이버 앱·인스타그램 인앱에서 ① 사주 입력 → 로그인 → 입력값 유지, ② 테스트 결제 → 복귀 → 결과 표시. **실제 결제가 일어나므로 사용자 승인과 테스트 계정이 필요하다.**
- 자동: UA 문자열별 판정 단위 테스트, `npm run verify:payment-freeze`, `npm run verify:payment-choice-parity`, `node scripts/verify-analytics-events.mjs`.

### 되돌리기

단계마다 커밋을 나누면 커밋 단위로 되돌릴 수 있다. 3번은 읽기 쪽을 "localStorage → sessionStorage" 순으로 두면 되돌린 뒤에도 진행 중이던 방문자의 입력값이 남는다.

---

## A1. 일반 UTM이 주문에 실리지 않음

### 지금 동작 (확인)

- 브라우저는 **허용 목록에 든 캠페인만** 30분 동안 기억한다(`js/core/analytics.js:264-318`): Threads 코드, 2026-10 성장 캠페인, 네이버 검색광고 3개.
- 그중 주문까지 가는 길은 둘이다.
  - 네이버 검색광고: 쿠키 `cd_paid_campaign`에 담아 서버가 읽는다(`js/core/analytics.js:258-263`, `lib/marketing/growth-attribution.mjs` `readCheckoutAttribution`).
  - 영냥이: 요청 본문 `growthAttribution`으로 보낸다(`app/yeongnyangi/_lib/api.ts:40`).
- 서버는 받은 값을 허용 목록으로 다시 거른 뒤 주문에 `growthAttribution`으로 저장한다(`worker/payments/index.js:1402`, `:1547`, `worker/payments/orders.js:189`).
- 꿀꿀 운세 셸의 결제 요청 본문에는 귀속 값이 없다. `js/`와 `index.html`에서 `growthAttribution`을 본문에 넣는 곳이 0건이다. 셸 결제는 쿠키 경로(네이버 검색광고 3개)만 탄다.
- 결제창 단계 수집구(`POST /api/billing/funnel-event`)에는 유입 필드가 없다(`worker/routes/billing.js` `handleCheckoutFunnelEvent`).

### 문제

- 네이버·구글 **자연 검색**, 일반 소셜 UTM, 이메일 UTM으로 들어온 결제는 주문 원장에 유입 흔적이 없다. "검색 유입이 매출로 이어졌는가"를 서버 숫자로 답할 수 없고, 동의한 방문자의 GA4 `purchase`(하한)로만 볼 수 있다.
- 자연 검색은 UTM이 아예 없어서, UTM만 넘겨서는 해결되지 않는다. 리퍼러 기반 분류가 따로 필요하다.

### 바꿀 파일과 요지

| 단계 | 파일 | 요지 | 결제 동결과의 관계 |
|---|---|---|---|
| 1 | `js/core/analytics.js` | 첫 진입 때 "유입 분류" 한 개를 정한다: `organic_naver`·`organic_google`·`social`·`email`·`ai`·`direct` 같은 **고정 코드**. 리퍼러 호스트와 이미 있는 `utm_*` 허용 목록(`:178-183`)만 쓴다. 자유 문자열은 저장하지 않는다. 분석 동의가 있을 때만 30분 보관 | 동결 밖 |
| 2 | `lib/marketing/growth-attribution.mjs` | 새 버전(예: `entry-20261114-v1`)과 위 고정 코드만 통과시키는 검사 추가 | 동결 밖. 서버가 거르는 정본 |
| 3 | 쿠키 경로 재사용 | 지금의 `cd_paid_campaign` 쿠키 방식을 그대로 써서 새 분류도 쿠키로 보낸다. 이렇게 하면 **결제 실행 파일(`js/core/checkout-entry.js`, `worker/payments/`)을 고치지 않아도** 서버의 `readCheckoutAttribution`이 읽는다 | `worker/payments/index.js`는 이미 이 함수를 부르므로 변경 없음(확인 필요: 쿠키 이름을 새로 만들면 `readCheckoutAttribution`만 고치면 된다) |
| 4 (선택) | `worker/routes/billing.js` `handleCheckoutFunnelEvent`, 모델 | 결제창 단계 이벤트에도 같은 고정 코드를 한 칸 추가 | `worker/routes/billing.js`는 줄 수 상한이 걸린 동결 파일(`config/payment-freeze.json` `growthCeilings`, 상한 6488줄). 늘리려면 `--update`가 필요하다. 필수는 아니다 |

핵심은 3번이다. 쿠키로 넘기면 결제 실행 파일을 건드리지 않는다.

### 위험

- 귀속 라벨은 결제 증거가 아니다. 지금 코드도 "신뢰하지 않는 라벨"로 취급한다. 이 원칙을 유지하고 가격·권한 판정에 쓰지 않는다.
- 쿠키가 하나 늘어난다. 분석 동의가 있을 때만 쓰고, 동의를 거두면 지우는 기존 규칙(`js/core/analytics.js:268`)을 그대로 따라야 한다. 쿠키 안내 문서에 항목 추가가 필요할 수 있다.
- 한 사람이 광고와 자연 검색으로 번갈아 들어오면 어느 쪽을 남길지 정해야 한다. 지금 규칙은 "나중에 명시적으로 태그된 유입이 이긴다"(`:279-285`)이다. 자연 검색이 광고 라벨을 덮지 않도록 우선순위를 정해야 한다(사용자 결정).
- 과거 주문에는 값이 없으므로 도입 전후를 한 표에 섞어 비교하면 안 된다.

### 검증

- 단위 테스트: 허용 코드만 통과하고 그 밖의 값은 버려지는지(`lib/marketing/growth-attribution.mjs`).
- `node scripts/verify-analytics-events.mjs`, `node --test __tests__/ui/purchase-analytics.test.mjs`.
- 로컬에서 쿠키를 넣은 주문 생성 요청을 **모의 서버로** 보내 주문 문서에 라벨이 실리는지 확인. 실제 결제와 운영 DB 쓰기는 하지 않는다.
- 배포 뒤: 읽기 전용 리포트(`scripts/report-revenue-funnel.mjs`)에 유입 분류별 건수를 추가해 대조.

### 되돌리기

1~3번은 각각 독립 커밋으로 되돌릴 수 있다. 되돌려도 이미 저장된 주문의 라벨은 남으며 해가 없다(읽는 쪽이 모르는 버전은 무시).

---

## 사용자 결정이 필요한 것

1. F3: 1~3단계(감지 함수, 로그인 화면 안내, 입력값 보관 위치)를 진행할지. 3단계는 사주 엔진 파일을 고친다.
2. F3: 실제 기기 테스트 결제를 승인할지. 승인이 없으면 로그인 복귀까지만 확인할 수 있다.
3. A1: 유입 분류 고정 코드 목록과, 광고 라벨과 자연 검색이 겹칠 때의 우선순위.
4. A1: 결제창 단계 수집구에도 유입 칸을 넣을지(동결 파일 상한 갱신 필요).
