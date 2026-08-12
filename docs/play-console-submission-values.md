# Play Console 제출값 모음

> 앱 출시 시 Play Console·Google Cloud·Cloudflare에 입력할 값 전부.
> 구현·정책 배경은 [play-billing-app.md](play-billing-app.md) 참고.
>
> ⚠️ **비밀값(키스토어 비밀번호·서비스 계정 JSON·RTDN 토큰)은 이 문서에 적지 않는다.** 어디서 발급해 어디에 넣는지만 적는다.

---

## 1. 앱 정보 (Play Console → 앱 설정)

| 항목 | 값 | 출처 |
|---|---|---|
| 패키지명 (applicationId) | `com.codedestiny.app` | `apps/mobile/android/app/build.gradle:68` — **변경 불가** |
| 앱 이름 | `Code Destiny` | `apps/mobile/capacitor.config.ts` |
| versionCode | `CODE_DESTINY_ANDROID_VERSION_CODE` 로 주입 (업로드마다 **+1 필수**) | `build.gradle:71`, 기본값 1 |
| versionName | `CODE_DESTINY_ANDROID_VERSION_NAME` 로 주입 (예 `1.0.0`) | `build.gradle:72`, 기본값 `1.0` |
| minSdkVersion | `24` (Android 7.0) | `apps/mobile/android/variables.gradle` |
| targetSdkVersion | `36` | 동일 — Play 최신 요구 충족 |
| compileSdkVersion | `36` | 동일 |
| 앱 카테고리 | 라이프스타일 (또는 엔터테인먼트) | 심사 시 선택 |
| 앱/게임 구분 | 앱 | |
| 무료/유료 | 무료 (인앱 상품 있음) | |

**선언되는 권한** (매니페스트 병합 결과 실측)
- `android.permission.INTERNET`
- `android.permission.ACCESS_NETWORK_STATE`
- `com.android.vending.BILLING` ← Billing Library가 자동 병합. 수동 추가 불필요
- `com.codedestiny.app.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION` ← AndroidX 자동

**딥링크 스킴**: `com.codedestiny.app://auth` (소셜 로그인 콜백). App Links/assetlinks.json 불필요.

---

## 2. 인앱 상품 17개 (Play Console → 수익 창출 → 인앱 상품)

**전부 유형 = 인앱 상품(one-time).** 이용권도 자동갱신이 없어 정기 결제(subs)가 **아니다**.
**상품 ID는 등록 후 변경 불가** — 아래 그대로 입력할 것.

소모성/비소모성은 Play Console에서 고르는 항목이 아니다. 앱이 `consume()` 호출 여부로 결정한다(회당 결제만 소비).

### 2-1. 콘텐츠 티어 13개 — **단건 결제**의 가격대 그릇

> **새로운 재화가 아니다.** 이 서비스의 결제 수단은 **이용권 / 단건 결제 / 월정석** 셋뿐이고,
> 이 상품들은 그중 **단건 결제**를 Play에서 받기 위한 가격대별 그릇이다. "열람권" 같은 4번째
> 상품 개념은 만들지 않는다.
>
> 앱 게이팅도 웹과 같다: **이용권이 커버하면 결제창 없이 무료 통과** → 미커버 시에만 결제창에
> **단건 결제(이 SKU)와 월정석이 동등하게** 뜬다.

| 상품 ID | 가격(KRW) | 이름 (≤55자) | 설명 (≤200자) |
|---|---|---|---|
| `cd_content_tier_01` | `3900` | 운세 콘텐츠 3,900원 | 선택하신 운세·타로·사주 기능 1건의 단건 결제입니다. 이용권으로 열리는 기능은 결제 없이 이용됩니다. |
| `cd_content_tier_02` | `6000` | 운세 콘텐츠 6,000원 | 선택하신 운세·타로·관상 기능 1건의 단건 결제입니다. 이용권으로 열리는 기능은 결제 없이 이용됩니다. |
| `cd_content_tier_03` | `7500` | 운세 콘텐츠 7,500원 | 선택하신 심화 운세 기능 1건의 단건 결제입니다. 이용권으로 열리는 기능은 결제 없이 이용됩니다. |
| `cd_content_tier_04` | `8900` | 운세 콘텐츠 8,900원 | 선택하신 심화 운세 기능 1건의 단건 결제입니다. 이용권으로 열리는 기능은 결제 없이 이용됩니다. |
| `cd_content_tier_05` | `10900` | 운세 콘텐츠 10,900원 | 선택하신 심화 분석 기능 1건의 단건 결제입니다. 이용권으로 열리는 기능은 결제 없이 이용됩니다. |
| `cd_content_tier_06` | `13000` | 운세 콘텐츠 13,000원 | 선택하신 운세·상담 기능 1건의 단건 결제입니다. 이용권으로 열리는 기능은 결제 없이 이용됩니다. |
| `cd_content_tier_07` | `15000` | 운세 콘텐츠 15,000원 | 선택하신 심화 분석 기능 1건의 단건 결제입니다. 이용권으로 열리는 기능은 결제 없이 이용됩니다. |
| `cd_content_tier_08` | `19000` | 운세 콘텐츠 19,000원 | 선택하신 심화 분석 기능 1건의 단건 결제입니다. 이용권으로 열리는 기능은 결제 없이 이용됩니다. |
| `cd_content_tier_09` | `25000` | 운세 콘텐츠 25,000원 | 선택하신 궁합·심화 상담 1건의 단건 결제입니다. 이용권으로 열리는 기능은 결제 없이 이용됩니다. |
| `cd_content_tier_10` | `39000` | AI 상담 39,000원 | 선택하신 AI 운세 상담 1건의 단건 결제입니다. 이용권으로 열리는 기능은 결제 없이 이용됩니다. |
| `cd_content_tier_11` | `49000` | 프리미엄 해금 49,000원 | 선택하신 프리미엄 운세 묶음을 영구 해금하는 단건 결제입니다. |
| `cd_content_tier_12` | `65000` | AI 상담 65,000원 | 선택하신 심층 AI 운세 상담 1건의 단건 결제입니다. 이용권으로 열리는 기능은 결제 없이 이용됩니다. |
| `cd_content_tier_13` | `89000` | 프리미엄 전체 해금 89,000원 | 선택하신 프리미엄 전체 묶음을 영구 해금하는 단건 결제입니다. |

**각 티어가 실제로 커버하는 기능** (레지스트리 실측 — 참고용, Play Console 입력 불필요)

| 상품 ID | 웹가 | 인상률 | 대상 기능 수 | 구성 | 대표 기능 |
|---|---|---|---|---|---|
| `cd_content_tier_01` | 3,000 | +30.0% | 19 | 회당 16 / 해금 3 | tarot-year-fortune |
| `cd_content_tier_02` | 5,000 | +20.0% | 51 | 회당 31 / 해금 20 | tarot-love-relationship, royal-tea-oracle, physiognomy-* |
| `cd_content_tier_03` | 6,000 | +25.0% | 1 | 회당 1 | animal-totem-deep |
| `cd_content_tier_04` | 7,000 | +27.1% | 1 | 회당 1 | stonehenge-runes-deep |
| `cd_content_tier_05` | 9,000 | +21.1% | 2 | 해금 2 | destiny-bias-deep-profile |
| `cd_content_tier_06` | 10,000 | +30.0% | 31 | 회당 10 / 해금 21 | tarot-celestial-harmony, fortune-tea-house-saju-consultation |
| `cd_content_tier_07` | 12,000 | +25.0% | 3 | 회당 1 / 해금 2 | premium-sukuyo-compat-extra |
| `cd_content_tier_08` | 15,000 | +26.7% | 4 | 해금 4 | ziwei_love_deep |
| `cd_content_tier_09` | 20,000 | +25.0% | 7 | 회당 4 / 해금 3 | cosmic-soul-meditation, saju_ai_question_prompt |
| `cd_content_tier_10` | 30,000 | +30.0% | 12 | 회당 11 / 해금 1 | vedic-ai-consultation, life-book-ai-consultation |
| `cd_content_tier_11` | 39,000 | +25.6% | 3 | 해금 3 | unlock.premium_astrology / _sukuyo / _veda |
| `cd_content_tier_12` | 50,000 | +30.0% | 1 | 회당 1 | karma-destiny-ai-consultation |
| `cd_content_tier_13` | 69,000·70,000 | +27.1~29.0% | 2 | 해금 2 | unlock.all_paid_saju, unlock.premium_naming |

### 2-2. 이용권 4개

**이용권은 30일 기간만 있고 사용 횟수 제한이 없다.** 커버 범위 안이면 30일간 몇 번이든 무료다
(`canUseByPass`에 횟수 개념 자체가 없다 — 금액 상한만 본다). 자동 갱신도 없다.

**커버 금액은 앱 기준으로 표기한다.** 같은 기능이 앱에서 더 비싸므로 웹 표기(3,000원)를 쓰면
결제창 금액과 어긋난다. 커버하는 기능 집합 자체는 앱·웹이 동일하다(코인으로 판정하므로).

| 상품 ID | 가격(KRW) | 이름 | 설명 |
|---|---|---|---|
| `cd_pass_standard_30d` | `13000` | 스탠다드 이용권 (30일) | 30일간 3,900원 이하 유료 기능을 횟수 제한 없이 이용합니다. 프로필 3개. 자동 갱신되지 않습니다. |
| `cd_pass_premium_30d` | `36000` | 프리미엄 이용권 (30일) | 30일간 6,000원 이하 유료 기능을 횟수 제한 없이 이용합니다. 프로필 7개. 자동 갱신되지 않습니다. |
| `cd_pass_vvip_30d` | `75900` | VVIP 이용권 (30일) | 30일간 13,000원 이하 유료 기능을 횟수 제한 없이 이용합니다. 프로필 15개. 자동 갱신되지 않습니다. |
| `cd_pass_family_30d` | `185000` | 패밀리 이용권 (30일) | 30일간 모든 유료 기능을 횟수 제한 없이 이용합니다. 프로필 무제한. 자동 갱신되지 않습니다. |

**가격 근거 — 커버 금액이 오른 비율만큼 이용권도 올린다**(값과 혜택이 비례해야 앱이 더 비싼 이유가 성립):

| 등급 | 커버(웹→앱) | 커버 상승률 | 이용권(웹→앱) | 인상률 |
|---|---|---|---|---|
| standard | 3,000 → 3,900 | +30.0% | 9,900 → 13,000 | +31.3% |
| premium | 5,000 → 6,000 | +20.0% | 29,900 → 36,000 | +20.4% |
| vvip | 10,000 → 13,000 | +30.0% | 59,000 → 75,900 | +28.6% |
| family | 전체 | — | 149,000 → 185,000 | +24.2% |

> 커버 금액은 상수가 아니라 웹 정본(`PASS_LIMITS` 코인)에서 앱 티어가로 파생된다
> (`resolveAppPassCoverageKRW`) — 웹 한도가 바뀌면 앱 표기도 자동으로 따라간다.
> `cd_pass_family_30d`은 고액 상품이라 심사에서 환불 정책 고지를 엄격히 본다.

### 2-3. 등록 절차 (17개)

#### 0) AAB 업로드가 **먼저** — 이걸 안 하면 인앱 상품 메뉴가 잠긴다

Play는 **BILLING 권한이 든 AAB가 트랙에 올라와 있어야** 인앱 상품 생성을 허용한다.
우리 앱은 `com.android.vending.BILLING`이 Billing 라이브러리에서 자동 병합되므로 매니페스트 손댈 것은 없다.

```bash
npm run mobile:android:sync      # 가드 주입·/points 제거·PortOne 부재 검증 → cap sync
npm run mobile:android:open      # Android Studio → Build > Generate Signed Bundle (release)
```
→ Play Console → 테스트 → **내부 테스트** 트랙에 `.aab` 업로드.

> 서명 키가 없으면 `bundleRelease`가 실패한다 → [4절](#4-앱-서명-키-로컬--커밋-금지) 참고.

#### 1) CSV 일괄 등록은 폐지됐다

Play Console의 인앱 상품 **Import/Export(CSV)는 2025-05-19부로 없어졌다**
([공식 문서](https://support.google.com/googleplay/android-developer/answer/1153481)).
남은 길은 **API 등록**(권장) 또는 **수동 17회 입력**뿐이다.

#### 2) 권장 — API 일괄 등록

가격을 손으로 옮기면 Play 등록가와 서버 정산 기준(`worker/lib/app-store-pricing.js`)이 조용히 어긋난다.
`purchases.products.get`은 가격을 돌려주지 않아 **런타임에 불일치를 잡을 방법이 없다.**
아래 스크립트는 정본에서 바로 등록하므로 애초에 어긋날 수 없다.

```bash
# 서비스 계정 없이도 등록 예정 목록을 볼 수 있다
npm run play:products:dry

# 서비스 계정 JSON을 .env.local 에 넣은 뒤 (GOOGLE_PLAY_SERVICE_ACCOUNT_JSON='{...}')
npm run play:products:dry        # 기존 상품과 대조 — 무엇이 생성/변경되는지 표시
npm run play:products:apply      # 실제 등록
npm run play:products:dry        # 재실행 → '변경 없음'만 나오면 Play ↔ 코드 일치 증명
```

- 서비스 계정에 **'상품 관리' 권한**이 필요하다. 결제 검증용 '재무 데이터 보기'만으로는 403이 난다
  (Play Console → 사용자 및 권한 → 해당 서비스 계정 → 권한 편집).
- 재실행해도 안전하다(upsert). 가격을 바꾸면 다시 돌려 동기화한다.
- **주의**: 이미 수동으로 만든 상품이 있으면 스크립트 값으로 덮어쓴다.

#### 3) 대안 — 수동 등록

Play Console → **수익 창출 → 제품 → 인앱 상품 → 상품 만들기**, [2-1](#2-1-콘텐츠-티어-13개--단건-결제의-가격대-그릇)·[2-2](#2-2-이용권-4개)의 표를 그대로 17회 입력.

| 입력란 | 값 |
|---|---|
| 상품 ID | 표의 `cd_*` — **생성 후 변경 불가**. 오타 시 삭제 후 재생성 |
| 이름 | 표의 이름 (≤55자) |
| 설명 | 표의 설명 (≤200자) |
| 가격 | 표의 KRW. 기본 통화 KRW, 나머지 국가는 자동 환산 허용 |
| 상태 | **활성** (활성화하지 않으면 앱에서 조회되지 않는다) |

전부 **인앱 상품(one-time)** 이다 — 이용권도 자동 갱신이 없어 정기 결제가 아니다.
소모성/비소모성은 Console 선택 항목이 아니며 앱이 `consume()` 호출로 정한다.

> 수동으로 넣었다면 마지막에 `npm run play:products:dry`를 돌려 **'변경 없음'**만 나오는지 확인할 것.
> 하나라도 다르면 오타이거나 가격이 어긋난 것이다.

### 2-4. SKU를 만들지 않는 것

| 대상 | 처리 | 이유 |
|---|---|---|
| `fortune-fish-gacha` (웹 ₩500) | **앱에서만 무료** | 인상해도 ₩625라 Play KRW 최저 판매가를 밑돌 수 있음. 웹은 ₩500 유료 유지 |
| 월정석 | 상품 없음 | 이벤트 지급 재화라 구매 불가. 앱에서의 차감은 결제가 아니라 Play Billing 대상 아님 |

> 등록 후 **Play Console 가격 ↔ `worker/lib/app-store-pricing.js` 상수를 육안 대조할 것.**
> `purchases.products.get`은 가격을 돌려주지 않아 서버는 이 상수를 정산 기준으로 쓴다. 어긋나면 조용히 틀어진다.

---

## 3. Google Cloud — 서비스 계정 & RTDN

### 3-1. Play Developer API 서비스 계정

1. Play Console → 설정 → API 액세스 → Google Cloud 프로젝트 연결
2. 서비스 계정 생성 → JSON 키 발급
3. Play Console에서 해당 서비스 계정에 **재무 데이터 보기 / 주문 관리** 권한 부여
4. 필요한 OAuth 스코프: `https://www.googleapis.com/auth/androidpublisher` (코드가 자동 요청)

발급한 JSON → 워커 시크릿 `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` (5절)

### 3-2. RTDN (실시간 개발자 알림)

| 항목 | 값 |
|---|---|
| Pub/Sub 토픽 | 새로 생성 (예: `projects/<PROJECT_ID>/topics/play-rtdn`) |
| 구독 유형 | **푸시(Push)** |
| 푸시 엔드포인트 | `https://code-destiny.com/api/app-store/google/rtdn` |
| 인증 | 엔드포인트 URL에 `?token=...`가 아니라 **`Authorization: Bearer <토큰>`** 또는 `X-Goog-Channel-Token` 헤더 |
| 토큰 값 | 임의 난수 생성 → 워커 시크릿 `GOOGLE_PLAY_RTDN_TOKEN`과 동일하게 |
| 토픽 권한 | `google-play-developer-notifications@system.gserviceaccount.com`에 **Pub/Sub 게시자** 역할 부여 |
| Play Console 연결 | 수익 창출 설정 → 실시간 개발자 알림 → 토픽 이름 입력 → **테스트 알림 보내기**로 200 확인 |

> ⚠️ `GOOGLE_PLAY_RTDN_TOKEN` 미설정 시 엔드포인트가 503으로 비활성 → **환불 시 콘텐츠 회수가 동작하지 않는다.**
> 워커 라우트 실측: `code-destiny.com/api/*` → `worker/wrangler.toml:13`. 대체 도메인 `api.code-destiny.com`도 가능.

---

## 4. 앱 서명 키 (로컬 — 커밋 금지)

`apps/mobile/android/release-signing.properties`에 작성 (`release-signing.example.properties` 복사).

| 키 | 값 |
|---|---|
| `CODE_DESTINY_ANDROID_KEYSTORE_FILE` | keystore `.jks` 절대경로 (레포 밖 권장) |
| `CODE_DESTINY_ANDROID_KEYSTORE_PASSWORD` | keytool로 만든 스토어 비밀번호 |
| `CODE_DESTINY_ANDROID_KEY_ALIAS` | 예: `upload` |
| `CODE_DESTINY_ANDROID_KEY_PASSWORD` | 키 비밀번호 |
| `CODE_DESTINY_ANDROID_VERSION_CODE` | 업로드마다 +1 |
| `CODE_DESTINY_ANDROID_VERSION_NAME` | 예: `1.0.0` |

없으면 `bundleRelease`가 실패한다(디버그 빌드는 무관). 발급 절차는 [android-release.md](android-release.md).

---

## 5. Cloudflare 워커 시크릿

주입: `npm run secrets:cf:worker` (dry-run: `npm run secrets:cf:worker:dry`)

| 키 | 필수 | 값 |
|---|---|---|
| `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` | **필수** | 3-1에서 발급한 JSON 전문 |
| `GOOGLE_PLAY_RTDN_TOKEN` | **필수** | 3-2의 토큰과 동일 문자열 |
| `GOOGLE_PLAY_PACKAGE_NAME` | 선택 | `com.codedestiny.app` (미설정 시 기본값 동일) |
| `GOOGLE_PLAY_PRODUCT_MAP` | 불필요 | 티어 표를 덮어쓰는 오버라이드. 비워둘 것 |
| `GOOGLE_PLAY_PRODUCT_PREFIX` | 불필요 | 동일 |

> `GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL` + `GOOGLE_PLAY_PRIVATE_KEY` 조합도 지원하지만, JSON 하나가 단순하다.

---

## 6. Data Safety (데이터 보안) 신고

**수집 항목** (`worker/lib/models.js` userSchema 실측)

| 카테고리 | 항목 | 필수 여부 | 목적 |
|---|---|---|---|
| 개인 정보 | 이름 | 필수 | 계정 관리 |
| 개인 정보 | 이메일 주소 | 필수 | 계정 관리, 로그인 |
| 개인 정보 | 전화번호 | 선택 | 결제·본인확인 |
| 개인 정보 | 생년월일·출생시각 | 필수 | **앱 기능(사주·운세 계산의 입력값)** |
| 개인 정보 | 성별 | 필수 | 앱 기능 |
| 사진 | 프로필 이미지 | 선택 | 계정 관리 |
| 사진 | 얼굴 사진(관상) | 선택 | 앱 기능 — **기기 내 처리, 서버 미전송** (`AnalysisEngine.js` 로컬 규칙 엔진) |
| 금융 정보 | 구매 내역 | 필수 | 앱 기능(이용권·콘텐츠 권한) |

**답변 가이드**
- 데이터 전송 중 암호화: **예** (HTTPS)
- 데이터 삭제 요청 가능: **예** → URL `https://code-destiny.com/account/delete/`
- 데이터가 제3자와 공유됨: **아니오**
- **광고 ID / 광고 목적 수집: 아니오** ← 앱에서는 AdSense가 로드되지 않는다. `canLoadAdsenseForCanonicalUrl`이 오리진을 `https://code-destiny.com`으로 못박아 두어, WebView 오리진(`https://localhost`)에서는 무조건 차단된다(실측 확인).
- 위치 정보: **아니오** (출생지는 사용자가 직접 입력하는 텍스트이지 기기 위치가 아님)

---

## 7. 스토어 등재 URL

`next.config.mjs`에 `trailingSlash: true`라 **끝 슬래시 포함**.

| 항목 | URL |
|---|---|
| 개인정보처리방침 | `https://code-destiny.com/privacy-policy/` |
| 이용약관 | `https://code-destiny.com/terms-of-service/` |
| 지원/문의 | `https://code-destiny.com/contact-us/` |
| 계정 삭제 요청 | `https://code-destiny.com/account/delete/` |
| 웹사이트 | `https://code-destiny.com/` |

---

## 8. 콘텐츠 등급 설문 유의

- 사주·타로·운세 = **점술/오컬트 소재**. 설문에서 관련 항목을 정직하게 답할 것.
- 실제 도박 요소 없음(`fortune-fish-gacha`는 무료 가챠 연출이며 현금 보상 없음) → 도박 항목 "아니오".
- 앱 내 구매 있음 → **예**.
- 사용자 간 상호작용/UGC 없음 → 해당 없음.

---

## 9. 제출 전 실행 (코드 쪽)

```bash
npm run typecheck
npm run verify:app-store-pricing            # 티어 ↔ 레지스트리 전수 일치
npm run verify:app-store-billing-policy     # PER_USE 재구매·이용권·앱가·환불 해석
npm run verify:billing-pass-policy          # 웹 결제 무회귀
npm run verify:portone-single-payment
npm run verify:paid-gate-ui

npm run migrate:app-purchase-intent-indexes # DB 1회 (autoIndex:false라 필수)
npm run deploy:cf:worker                    # app-store.js 배포

npm run mobile:android:sync                 # 가드 주입·/points 제거·검증 → cap sync
npm run mobile:android:open                 # Android Studio → bundleRelease → .aab 업로드
```

테스트 시나리오 12종은 [play-billing-app.md](play-billing-app.md#테스트-시나리오-라이선스-테스터-internal-testing-트랙).
