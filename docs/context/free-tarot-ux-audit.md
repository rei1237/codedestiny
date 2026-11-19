# 무료 운세·타로·결과 화면 UX 감사 (1단계)

| 항목 | 값 |
|---|---|
| 작성일 | 2026-11-20 |
| 기준 HEAD | `68ce5bf67` (로컬 화면 실측은 `341e1afb2`에서 시작. 두 커밋 사이 변경은 iOS·문서뿐이라 측정 대상과 무관하다고 추정) |
| 상태 | **초안 — 사용자 승인 대기** (코드 변경 없음, 권장 방향은 구현하지 않음) |
| 측정 조건 | 로컬 `npm run dev` + `scripts/mock-dev-api.mjs`, Playwright chromium headless(iPhone UA, isMobile, ko-KR, 매번 새 프로필), 390×844 기본·360×780 보조. 레퍼런스는 ego-browser 390×844. **과금 LLM 0회, 실결제 0회, 실계정 로그인 0회** |
| 근거 | 코드 정적 감사, 로컬 화면 실측, 레퍼런스 실측(세 원자료는 `.tmp/free-tarot-audit/`의 스크래치 파일) |

표기 규칙
- `path:line` = 코드 근거(다시 확인 가능). **실측** = 로컬·레퍼런스 브라우저에서 잰 값. **코드 추정** = 소스를 읽고 추론한 화면 동작. **미확인(사유)** = 닿지 못한 것.
- 코드 추정과 실측이 다르면 실측을 따르고 `⚠충돌`로 표시한다.
- 스크린샷 파일명(`shots/…`, `ref-shots/…`)은 `.tmp/free-tarot-audit/` 아래 스크래치로, 작업 정리 때 지운다. **영구 근거가 아니다.** 스크린샷에만 기대는 주장은 두지 않았고, 다시 확인하려면 위 측정 조건으로 재측정한다.
- 로컬은 운영 워커가 없다: 운영 `/?action=…` 302·`/index.html` 301이 로컬에서는 200 + 클라이언트 `LegacyHomeEntry`의 `location.replace`로 대신된다. mock `/api/auth/me`에 `authenticated` 필드가 없고, 없는 경로는 501(`MOCK_ROUTE_NOT_IMPLEMENTED`)을 준다.

---

## 1. 요약

- **무료 사주는 결과 직전에 로그인 벽이 있다.** 비로그인 4번째 탭(동의하고 결과 보기)에서 `#cdLoginRequiredModal`이 뜨고 결과를 볼 수 없다(실측, `js/saju-engine.js:4464-4465`). "무료" 표기와 기대가 어긋난다.
- **자존감 타로는 무료인데 들어갈 수 없다.** `/tarot/self-esteem/` → `/ggulggul/?action=openTarotSelfEsteemModal`에서 16초 기다려도 열리지 않고, 「모든 운세」 카드는 다시 랜딩으로 돌아온다(실측 루프).
- **`/today/` 오늘의 운세도 비로그인이면 막히고**, 안내 문구가 버튼(y=626)보다 위(y=427)에 생겨 눌러도 반응이 없는 것처럼 보인다(실측). 코드 감사의 "로그인 없음"과 ⚠충돌.
- **로그인 없이 끝까지 가는 무료 타로는 꿀꿀 3장(7탭)과 힐링 타로(7탭) 두 개뿐**이다(실측). 영냥이 오늘의 타로는 출석 3일 뒤에 열린다(실측).
- **타로 구현은 14갈래 이상**이다(셸 의식·DailyTarot·연애·재회·자존감·연간·힐링·크리스털·수비학·꿈·영냥이 3종·마인드스캔 등). 덱 크기(78/22), 뒤집기 시간(0.6~1.5s), 저장 방식(없음/localStorage/sessionStorage/서버)이 모두 다르다.
- **꿀꿀 3장 타로는 셔플 연출이 없고**, 탭→공개 ≈2.4s, 3번째 공개→결과 ≈1.5s, 진행 바 없이 안내 한 줄뿐이다(실측).
- **같은 기능의 링크가 3~4갈래**로 갈리고, 랜딩의 `/index.html?action=`은 운영에서 301→302 이중 리다이렉트다(코드, `FeatureLandingPage.tsx:631-645`).
- **유료/무료 표기 불일치 2건**: 라이트 사주(유료) CTA가 무료 사주 action을 쓰고(`lib/marketing/yehwa-home.mjs:52`), 랜딩 메타가 무료인 재회·연간 타로를 유료로 다룬다(`FeatureLandingPage.tsx:292-302` vs `lib/payment/free-fortune-policy.mjs:66-67`).
- **"판정 대기"·"분석 대기" 플레이스홀더는 실측에서 화면에 0건**이었다. 보이는 "0%"는 1곳(#iljuEarthVal)이며 데이터 값으로 추정한다.
- **통합 기준 후보: ③ DailyTarot(React) 골격 + ⑬ 영냥이 TarotDrawRitual의 단계·접근성 + ① 셸의 78장 덱.** 단, ③은 로컬에서 로그인 게이트 때문에 한 번도 화면 실측하지 못했다.
- 결과를 캐릭터 웹툰으로 보여 주는 타로·무료 운세는 현재 없다. 리더 컴포넌트(CutReader)는 이미 있고 일일 운세가 쓰고 있다(§4).

---

## 2. A 무료 운세 감사

### A0. 무료 판정의 정본

- 표시 목록: `lib/marketing/free-promo.mjs:38-67`(groups), `:96-103`(featured). 종료일 2027-02-12는 **표시 전용**이다(`:2-3`).
- 실제 무료 여부: `lib/payment/free-fortune-policy.mjs:3-85` 허용목록(`:2` "price나 prefix로 LLM 상품이 무료가 되지 않는다").
- 클라이언트 단락: `js/destiny-profile.js:12916-12921`. 서버: `worker/routes/tarot.js:9`.
- freeStart(만세력 등)는 레지스트리 `price:"무료 시작"`이다(`js/core/service-registry.js:396-409`).

### A1. 진입점

"3개월 한정 무료 정원"이라는 정확한 문구는 없다(실측). 가장 가까운 것은 배지 "3개월 한정 · 기본 운세 무료"와 제목 "연이가 열어 둔 무료 운세 정원"(D-84)이다. 아래 표에서는 이 블록을 그 이름으로 부른다.

| 위치 | 라벨 | URL / action | 도착 화면 | 무료/유료/부분유료 |
|---|---|---|---|---|
| 홈 `/` 무료 운세 정원(y≈1330, 실측) | 무료 기본 사주 바로 보기 | `/ggulggul/?action=cdOneStepFreeSajuEntry` (`free-promo.mjs:9`, `app/components/FreePromoBanner.tsx:37`) | 동의 → 로그인 모달 → 사주 결과(실측) | 무료, **로그인 필요** |
| 홈 `/` 같은 블록 | 무료 운세 전체 보기 | details 펼침 22항목(실측) | — | — |
| 펼침 10항목 | 사주 네컷·도파민·테토에겐·극T·로또·AI 프롬프트·스킬트리·명식·절기·궁합 | `?action=cdOneStepFreeSajuEntry&section=…` | 무료 사주 결과의 해당 섹션 | 무료(`saju_fun_shared` 등, 정책 `:14,16,22,26`), 로그인 필요 |
| 펼침 | 최애운명 / 동물점 / 일 스타일 | `/saju/destiny-bias/`, `/saju/animal-destiny/`, `/saju/career-style/` | 각 랜딩 | 무료(정책 `:6,24,4`) |
| 펼침 | 만세력 / 오늘의 운세 | `/manse/`, `/today/` | 만세력 → 셸 사주 결과로 합류 / 오늘 페이지 | 무료, **둘 다 로그인 필요(실측)** |
| 펼침 | 타로 | `?action=cdHomeTarotEntry` | 셸 타로 모달 3장 | 부분유료(결과 뒤 5,000원 CTA) |
| 펼침 | 자미·숙요·베다·점성 | `?action=cdHome{Ziwei,Sukuyo,Vedic,Astro}Entry` | 공통 프로필 폼 "종합 운세의 꽃문 열기"(실측) | 무료, 프로필 저장에 로그인 필요(코드) |
| 펼침 | 휴먼 디자인 / 프롬프트 | `/human-design/`, `/fortune/prompt-hub/` | 각 페이지 | 무료 |
| `/ggulggul/` "지금 무료로 시작"(y=719) | ① 무료로 내 만세력 보기 | `?action=cdOneStepFreeSajuEntry&section=sajuCard` | 사주 명식 | 무료(로그인 필요) |
| 〃 | ② 카드 3장 뽑고 해석 받기 | `?action=cdHomeTarotEntry` | 타로 모달 | 부분유료 |
| 〃 | ③ 주의할 시기 확인하기 50,000원 | `/heukwol/` | 흑월 결제 흐름 | **유료** (무료 블록 안 유료 카드) |
| `/ggulggul/` 히어로 | 무료로 내 만세력 확인하기 | `/?action=cdOneStepFreeSajuEntry` (`yehwa-home.mjs:58-62`) | 운영 302 → `/ggulggul/?action=`(코드) | 무료 |
| `/ggulggul/` "나의 운명 지도 — 엔진별 기본 풀이 (무료)"(y=2310) | 자미·숙요·베다·점성 4카드 | `cdHome*Entry` (`yehwa-home.mjs:50,53`) | 공통 프로필 폼(실측) | 무료(프로필+로그인) |
| `/ggulggul/` 라이트 사주 | 라이트 사주 CTA | `?action=cdOneStepFreeSajuEntry&section=summaryCard` (`yehwa-home.mjs:52`) | 무료 사주 진입과 같은 action | **유료 상품이 무료 action 공유** |
| `/ggulggul/` 무료 정원(#cdQuickServices, y=4064) | 명식·타로·자미·숙요·베다·점성 6카드 | 위와 같은 action | — | 무료/부분유료 |
| `/ggulggul/` 하단 | 모든 운세 보기 | `/?action=cdOpenAllFortunes` (`yehwa-home.mjs:69`) | 전체 운세 시트 | — |
| 홈 footer "운세 바로가기" | 무료 만세력·사주 풀이 안내·궁합·오늘의 운세·타로·자미두수·숙요점·2027 띠별 | `/manse/` `/saju/` `/saju/compatibility/` `/today/` `/tarot/` `/ziwei/` `/sukuyo/` `/fortune/2027/` (`lib/seo/home-discovery.mjs:15-24`) | 직접 링크, 리다이렉트 없음(실측) | 무료 진입. `/fortune/2027/`은 미확인 |
| 홈 고민 링크 | 재회 | `/tarot/reunion/` (`home-discovery.mjs:26-31`) | 재회 타로 랜딩 | 정책상 무료, 랜딩 메타는 유료(A2) |

### A2. 중복 경로

| 기능 | URL 갈래 | 근거 | 영향 |
|---|---|---|---|
| 셸 3장 타로 | `/tarot/mingri` · `?action=openTarotModal` · `?action=cdHomeTarotEntry` · `/tarot/mingri/play` | `js/core/index-inline-runtime.js:3377-3388`, 레지스트리 `:411-423` | canonical 하나로 수렴. 위험 낮음 |
| 연애·재회·자존감·연간·힐링 타로 | `/tarot/<slug>` · `/index.html?action=openTarot*Modal` | `app/components/FeatureLandingPage.tsx:268-276, 631-645` | 운영 301→302 이중 리다이렉트(코드). 로컬은 `/tarot/love`→308→`/tarot/love/`(실측) |
| 무료 사주 | `/saju/` · `/?action=cdOneStepFreeSajuEntry` · `/ggulggul/?action=…[&section=…]` | `free-promo.mjs:9`, 레지스트리 `:396-409` | 출처마다 형식이 셋 |
| 궁합 | `/compatibility`→`/index.html?action=runCompat` · `?section=compatCard` · `/saju/compatibility/` | `HomeServiceSections.tsx:~40`, `home-discovery.mjs` | 내부 링크 3분산 |
| 오늘 타로 | `/today/` DailyTarot · `/yeongnyangi/room/#daily-tarot` | `app/today/DailyTarot.tsx`, `DailyTarotCard.tsx` | 브랜드가 달라 위험 낮음. SERP 미측정 |

로컬 vs 운영 리다이렉트
- 운영: `/?action=` → 워커 302 + `X-Robots-Tag: noindex, follow` (`public/_worker.js:183-209`). `/index.html` → 301.
- 로컬: 둘 다 200. `/?action=`은 `LegacyHomeEntry`가 클라이언트에서 `/ggulggul/?action=`으로 교체(실측). `/?utm_source=x`는 200 그대로(실측).
- 따라서 이중 리다이렉트 비용과 noindex 헤더는 **로컬에서 재현되지 않는다**. 운영 확인은 미확인(스테이징 미측정).

정책 불일치(렌더 미확인): `FeatureLandingPage.tsx:292-302` PAID_SLUG_META가 `/tarot/reunion`·`/tarot/year`를 유료로 다루지만, `free-fortune-policy.mjs:66-67`은 둘을 무료로 둔다. 랜딩 가격·배지(`FeatureLandingPage.tsx:91-106`)의 실제 화면 표기는 미확인(이번 실측에서 두 랜딩을 열지 않음).

### A3. 기능별 탭 수·모달·로그인

탭 수 = 진입 카드 탭부터 첫 결과까지의 버튼·선택 탭(타이핑 제외).

| 기능 | 탭 수 | 모달 순서 | 로그인 | 출처 |
|---|---|---|---|---|
| 무료 사주 | **4** (진입→성별→사주 보기→동의하고 결과 보기). ⚠충돌: 코드 추정 8~11 | 쿠키 모달(첫 방문) → 개인정보 동의 `#privacy-modal-overlay` → 로그인 `#cdLoginRequiredModal` | **필수**. 비로그인은 결과 0 | 실측 / `saju-engine.js:4464-4465(로그인),4594-4601(개인정보)` |
| 만세력 `/manse/` | 2 + 입력 3 | 셸로 이동 → 동의 모달 자동 → 결과(무료 사주와 같은 화면) | 필수 | 실측 |
| 오늘의 운세 `/today/` | 「무료로 시작」 1탭 → 화면 전환 없이 안내 문구만 | 없음 | **필수**(`app/_lib/free-reading-access.ts` hasFreeReadingSession). ⚠충돌: 코드 감사 "없음" | 실측. 로그인 뒤 화면은 mock 한계로 미확인 |
| 꿀꿀 3장 타로 | **7** (진입 1 + 카드 3 + 펼치기 3). 코드 추정 약 7과 일치 | 타로 모달 1개. 쿠키 배너는 화면 밖(y≈7971) | 없음 | 실측 |
| 자미·숙요·베다·점성 | 미확인. 자미 「프로필 저장하고 자미두수 보기」 탭 뒤 10초간 변화·모달·API 0 | 동의 모달 안 뜸(자동화 기준) | 코드상 프로필 저장에 필수(`destiny-profile.js:9830, 9919-9923`) | 실측(무반응) + 코드. 실기 미확인 |
| 최애운명 | 2탭까지 확인(그룹→멤버), 이후 미측정 | 없음 | 미확인(여기까지 API 0) | 실측 |
| 휴먼 디자인 | 미확인. mock geocode 실패로 「내 바디그래프 만들기」 비활성 | 없음 | 계산은 비로그인 가능(코드 추정) | 실측 |
| 힐링 타로 | **7** (시작→태양 리딩 시작→빛을 열기×4→회복 리딩 열기) | 없음 | 없음(API 0) | 실측 |
| 마인드스캔 | 11탭 뒤 `POST /api/tarot/paid-draw` mock 501 → 메인 선택으로 복귀 | 풀스크린 오버레이 | 운영은 authFetch라 필요(추정) | 실측 + 코드 추정 |
| 연애 타로 | 진입 CTA 자체가 "유료 기능 실행 · 5,000원" | 유료 프리뷰 `#tilePvwOverlay` | 결제 시 | 실측. 로컬은 `/index.html?action=openTarotLoveModal`이 아무것도 안 엶 |
| 자존감 타로 | 도달 불가 | — | — | 실측(§6-1) |
| 영냥이 오늘의 타로 | 0장 열람. "사흘 출석 멸치 3마리" 잠김 | 없음 | 필수 + 출석 3일 | 실측 |
| 재회·연간 타로 | 미확인(이번 실측에서 열지 않음) | 미확인 | 연간은 비로그인 localStorage 결과(`js/tarot-year-fortune-experience.js:403-425`) | 코드 |

쿠키: 코드 감사는 `#cdCookieConsent`를 role=region 배너로 봤지만(`index.html:8691`), `/ggulggul/` 첫 방문에는 "달빛처럼 조용한 쿠키 안내" 모달로 떴다(실측). 홈 `/`에서는 "방문 분석 쿠키 안내" 배너. ⚠충돌, 실측 우선.

### A4. 플레이스홀더와 유료 경계

| 문구 | 마크업 위치 | 실측 노출 |
|---|---|---|
| "판정 대기" | `index.html:8366, 8382, 8390, 8398, 8406` | **0건**(무료 사주·타로 흐름) |
| "분석 대기" | `index.html:8457-8459` | **0건** |
| "0%" | `#tarotSelfEsteemExpPercent` `index.html:8547` | 자존감 타로에 도달 못 해 미확인 |
| "0%" | `#iljuEarthVal` (무료 사주 결과 y=3663) | **1건 보임**. 데이터 값일 가능성이 큼(추정). 숨은 `sbBar*Pct` 기본값은 안 보임 |
| 결과 스켈레톤 | `index.html:17308~`, `js/tarot-reunion-experience.js:106` | 미측정 |

| 기능 | 무료 범위 | 유료 경계 | 근거 |
|---|---|---|---|
| 꿀꿀 3장 타로 | 세 장 리딩 전부 | 결과 끝 "내 질문으로 이어서 보기 · 5,000원(단건)" → `/fortune-tea-house/` | 실측, `index.html:17416` |
| 셸 레거시 3장·AI 프롬프트 | 없음 | tarot-myeongri-three-card 50코인/5,000원 | `js/saju-engine-tarot-sukuyo-quantum.js:818-821, 883, 3038` |
| 무료 사주 결과 | fun/classic 섹션 | 결과 안 잠금 표지 6곳, y≈8200 유료 상담 안내 | 실측, `free-promo.mjs:17` |
| 힐링 타로 | 전부 | 유료 CTA 없음(공유/다시/다른 운세) | 실측 |
| 연애 타로 | 없음 | 진입부터 5,000원 | 실측, `js/tarot-love-experience.js:24,26` |
| 라이트 사주 | — | 유료인데 무료 action으로 진입 | `yehwa-home.mjs:52` |
| 셸 "한 장 리딩" 토글 | 미확인 | 미확인 | `index.html:17324` |

---

## 3. B 타로 전수

### B1. 구현 표

①~⑭ 번호는 코드 감사 순서, ⑮는 실측에서 추가.

| # | 기능명 | 브랜드 | 진입 경로 | 셔플 | 카드 선택 | 뒤집기 연출 | 결과 레이아웃 | 어댑터 | 저장 포맷 | 360px 문제점 |
|---|---|---|---|---|---|---|---|---|---|---|
| ① | 셸 무료 의식 3장 (`quantum.js:3118-3530`, `styles/tarot-ritual.css`) | 꿀꿀(연이) | `cdHomeTarotEntry`, `openTarotModal`, `/tarot/mingri` | 78장 Fisher-Yates, **시각 연출 없음**(실측, `:3235`) | 가로 스크롤 부채(폭 390에서 300px·360에서 270px, scrollWidth≈3688)에서 3장, 슬롯 도착 0.9s | 모으기 1s → `.inner` 1.5s rotateY. 탭→공개 ≈2.4s(실측). reduced-motion 0ms(`:3127-3137`) | slots 3열 max 270px, 결과 fadeIn 0.8s + Rise 1.2s, ≈550ms 간격(실측) | 규칙 엔진 `js/core/tarot/master-reading.mjs` + 십신 노트 | **없음** | 문서 넘침 없음. 부채 하단 788 > 뷰포트 780(8px 접힘). 테마 스위치 잘림(실측). 카테고리 12px·4열(코드) |
| ② | 셸 레거시 3장 (`quantum.js:3000-3038`) | 꿀꿀 | 결제 재개 | 미확인 | 미확인 | is-revealing 800ms | `#tarotSceneThree` | 유료 LLM | 결제 재개 | 미확인 |
| ③ | `/today/` DailyTarot (`app/today/DailyTarot.tsx`, 322줄) | 꿀꿀(연이) | `/today/` | 미확인(로그인 게이트) | 22장 부채에서 3장(코드 `:264,278`) | 1.5s rotateY, GATHER 1000·TURN 1300(코드 `daily-tarot.module.css:36-37`, `:26`) | 위치 3개 목록, welcome 600px 이하 1열(코드) | `master-reading.mjs` (`:116`) | localStorage `cd:yeoni:daily-three:v1` (`lib/tarot/daily-three.mjs:3`) | 게이트 화면 넘침 없음(실측). fanBox margin-inline -32px 넘침 위험은 미확인 |
| ④ | 연애 타로 (`js/tarot-love-experience.js` 2013줄 + `LoveRelationshipTarot.tsx` 878줄) | 꿀꿀 | `/tarot/love/` → `/index.html?action=openTarotLoveModal` | Math.random(`:762`) / 서버 paid-draw | 6장 | 미확인 | 미확인 | `/api/tarot/love-reading` LLM | 서버 + localStorage 복구 키 | 미측정. 패널 카드 탭이 html 레이어에 막힘(추정) |
| ⑤ | 재회 (`js/tarot-reunion-experience.js` 1996줄) | 꿀꿀 | `/tarot/reunion/` | 서버 `/api/tarot/draw` | 5장 | 미확인 | 미확인 | `/api/tarot/reading` | 미확인 | 미확인 |
| ⑥ | 자존감 (`js/tarot-self-esteem-experience.js` 1719줄) | 꿀꿀 | `/tarot/self-esteem/` → **열리지 않음** | 로컬(`:737`), 역방향 0.35 | 미확인 | reduced-motion(`:718`) | 미확인 | 완전 로컬 | 경험치 % (`index.html:8547`) | 도달 불가 |
| ⑦ | 연간 (`js/tarot-year-fortune-experience.js` 1912줄) | 꿀꿀 | `/tarot/year/` | 결정적 해시(`:871-878`) | 12장 | 미확인 | 미확인 | `/api/tarot/reading`, stored:false | localStorage `cd:tarot-year:public-result:<owner>:<year>` | 12장 배치 미확인 |
| ⑧ | 힐링 (`app/components/SunHealingTarot.tsx` 843줄) | 꿀꿀(태양) | `/tarot/healing/` | **없음**. 4장 자동 배분(실측) | 고르기 없음. 「빛을 열기」 1→4 순서 강제(실측) | framer rotateY 0.72s + glow 1000ms(코드·실측 일치) | 카드 번호 1~4, 결과 정상 | `/api/tarot/reading` (`:486`). 로컬 API 0회(실측) | 미확인 | 넘침 없음(실측). **뒤집기 전 버튼 innerText에 카드명 노출**(DOM 실측) |
| ⑨ | 크리스털 소울 (`CrystalSoulTarotClient.jsx` 2158줄) | 꿀꿀 | `/tarot/crystal-soul/` | 미확인 | 미확인 | rotateY, onRevealed 820ms(`:736`) | 미확인 | `/api/tarot/crystal-soul` | 미확인 | 미확인 |
| ⑩ | 수비학 (`NumerologyTarotClient.tsx` 2079줄) | 꿀꿀 | `/tarot/numerology/` | shuffleDeck + 셔플 UI(`:954,1186`) | 미확인 | 미확인 | 미확인 | `/api/tarot/numerology-reading` | localStorage(`:862`) | 미확인 |
| ⑪ | 꿈 타로·프롬프트 메이커 등 (`app/dream/tarot` 568줄 외) | 꿀꿀 | `/dream/tarot` 등 | 미확인 | 미확인 | 미확인 | 미확인 | 미확인 | 미확인 | 미확인(줄 수만 확인) |
| ⑫ | 영냥이 오늘의 타로 (`DailyTarotCard.tsx` 77줄, `room.css:59-67`) | 영냥이 | `/yeongnyangi/room/#daily-tarot` | 결정적 `dailyTarotSpread(dateKey, device)` | 3장 고정 배분, 순서 자유 | perspective 1000px rotateY, 시간 미확인 | 카드 max 200px 2/3 비율 | 규칙 합성 synthesizeDailyTarot | 서버 출석(멸치 3) | 잠김 화면 넘침 없음(실측). 3장 줄바꿈은 미확인 |
| ⑬ | 영냥이 TarotDrawRitual (95줄, `yeongnyangi.module.css:777-789`) | 영냥이 | 영냥이 상담 흐름 | 호흡 3초 → 셔플 1.05s 무한 + 멈춤 버튼 | 부채 110px 절대배치, 600px 이하 flex-wrap | `.flipCard` transition, reduced-motion none | 3열, 4장 이상 760px+ 6열 | 서버 리딩, 1200ms 뒤 onComplete | tarot-presentation-state(requestId별) | 600px 이하 분기 있음(코드). 상담 흐름이라 실측 안 함 |
| ⑭ | 영냥이 TarotCardPick(90줄)/TarotSpreadReveal(82줄) | 영냥이 | 영냥이 상담 | sessionStorage, 셔플 900ms(`:30`) | aria-live 진행(`:64`) | 미확인 | 미확인 | 미확인 | sessionStorage | 미확인 |
| ⑮ | 마인드스캔 "BETWEEN WORDS TAROT" | 꿀꿀 | `/tarot/mindscan/` | 없음(실측) | 그리드 탭, 메인 5 → 보조 5 | 앞면 0.6s(코드) | 단계 전환 1350ms(실측) | `POST /api/tarot/paid-draw` → 질문 → 리딩(유료 추정) | 미확인 | 넘침 없음(실측). 드로우 실패 시 선택이 초기화됨(실측) |

비타로 카드형: `app/mini-games/page.tsx` 9종은 타로가 아니어서 제외.

### B2. 7축 평가 (1~5)

실측이 있는 흐름을 우선 평가했다. ④⑤⑥⑦⑨⑩⑪⑭는 화면 근거가 없어 제외(미확인).

| 축 | ① 셸 3장 | ③ DailyTarot | ⑫ 영냥 오늘 | ⑬ 영냥 Ritual | ⑧ 힐링 | ⑮ 마인드스캔 |
|---|---|---|---|---|---|---|
| 한 손 조작성 | 3 — 78장 가로 스크롤(scrollWidth≈3688), 360에서 부채 8px 접힘, 닫기는 상단 ×뿐(실측) | 3 — ①과 같은 부채(코드 추정) | 4 — 3장 아무 순서 탭, sticky nav(실측·코드) | 4 — 600px 이하 wrap(코드) | 4 — 버튼 하나씩 순서대로, 넘침 없음(실측) | 3 — 10장 선택, 실패하면 처음부터(실측) |
| 진행 인지 | 2 — 진행 바 없음, 안내 한 줄(실측) | 3 — 위치 3개 목록(코드) | 4 — "n / 3장 펼쳤어" role=status(코드) | 4 — 단계별 aria-live(코드) | 3 — 번호 1~4, 다음 버튼만 활성(실측) | 3 — 헤더로 단계 표시, 숫자 카운터 미확인(실측) |
| 몰입감 | 3 — 모으기·뒤집기·엮기는 있으나 셔플 없음(실측) | 3 — ①과 같은 계열(코드) | 2 — 탭해서 뒤집기만(코드) | 5 — 호흡·셔플·멈춤·선택·공개(코드) | 3 — 고르는 단계 없음(실측) | 3 — 두 단계 선택, 셔플 없음(실측) |
| 결과 가독성 | 3 — 실폭 약 320px에 .pos 56px·.energy 76px 열(코드), 넘침은 없음(실측) | 미확인(렌더 못 봄) | 3 — 규칙 합성 짧은 문장(코드) | 미확인 | 4 — 390·360 결과 정상(실측) | 미확인(드로우 실패) |
| 로딩/성능 | 3 — LLM 없음. 탭→공개 2.4s, 마지막 공개→결과 1.5s(실측). 레퍼런스 800ms보다 김 | 3 — 같은 상수(코드) | 4 — 로컬 합성(코드) | 3 — 호흡 3s + 서버 리딩 + 1.2s(코드) | 4 — API 0, 0.72s + 1s(실측) | 2 — 서버 드로우 필수, 단계 전환 1.35s(실측) |
| 접근성 | 3 — role=group, reduced-motion. aria-live 미확인 | 4 — aria-label, 비활성 슬롯, reduced-motion(코드) | 4 — aria-expanded/controls, role=status | 5 — aria-pressed, aria-live, srOnly | 2 — aria-live는 있으나 뒤집기 전 카드명 노출(실측) | 미확인 |
| 코드 재사용성 | 2 — 14,650줄 레거시 파일, 전역 DOM | 4 — React 모듈, 공유 엔진 | 4 — 작은 컴포넌트 | 4 — 단계 컴포넌트 | 3 — 843줄 단독 | 미확인 |
| **합계(평가된 축)** | 19/35 | 20/30 (+미확인 1) | 25/35 | 25/30 (+미확인 1) | 23/35 | 11/20 (+미확인 3) |

### B3. 통합 기준 후보

**추천: ③ DailyTarot(React) 골격 + ⑬ TarotDrawRitual의 단계·접근성 패턴 + ①의 78장 덱.**

이유
- ①과 ③은 같은 설계 문서(`docs/superpowers/specs/2026-11-05-free-tarot-premium-design.md`)와 같은 규칙 엔진(`js/core/tarot/master-reading.mjs`)을 이미 공유한다. LLM 없이 결과가 나와 "결과가 안 나오는" 위험이 없다.
- ③은 React 모듈이라 재사용성이 높다(4).
- ⑬은 진행 인지·몰입감·접근성이 가장 높다(4/5/5).
- ⑫는 점수는 높지만 3장 고정 배분이고 출석 게이트에 묶여 있어 무료 기본 흐름의 골격으로는 부적합하다.

빈칸(통합 전에 메울 것)
1. **③은 화면 실측 0회다.** 로그인 게이트 + mock `authenticated` 누락 때문이다. 기준으로 정하기 전에 실측이 필요하다.
2. 셔플 시각화와 멈춤 조작이 없다(⑬에서 가져올 것).
3. 덱이 22장이다(①은 78장).
4. 360px fanBox 음수 여백 넘침은 미확인(`daily-tarot.module.css:60`).
5. 결과 뒤 유료 CTA(①의 `#tarotFreeCta`)를 붙일지는 정책 결정이 필요하다.
6. 셸 진입점(`index-inline-runtime.js:3377-3388`, `destiny-profile.js:10996`)을 옮기는 일은 라우팅 RED다.
7. ①은 결과 저장이 없다. 레퍼런스처럼 결과 URL 키로 복원할지(§5 패턴 8) 정해야 한다.

---

## 4. C 웹툰·캐릭터 자산

요청 정정: "영냥이 상담 웹툰 연재형 결과 화면"은 **없다**. 영냥이 season-1은 연이가 주인공인 주간 연재(PageReader)이고 상담 결과가 아니다. **지금 타로·무료 운세 결과 중 캐릭터 웹툰으로 렌더되는 것은 없다.**

### C1. 리더 컴포넌트

| 컴포넌트 | 경로 | 데이터 형태 | 특징 | 사용처 |
|---|---|---|---|---|
| CutReader | `app/components/webtoon/CutReader.tsx` | `WebtoonLine{speaker,text,note?}`, `WebtoonCut{src,widths,fallback,w,h,alt,kind,cover?,lines[]}` | 톤 paper/night/yehwa/lantern. 대사는 그림 아래 선택 가능한 HTML. `src`가 비면 텍스트 컷 | 상담 웹툰, 일일 운세(`app/fortune/[period]/DailyFortuneWebtoon.tsx`), 토스 웹툰 서가(`apps/toss/src/StoryLibrary.tsx`) |
| PageReader | `app/components/webtoon/PageReader.tsx` | `WebtoonPage{n,alt}`, id `p-NN` | 대사가 그림에 박혀 있음 | 영냥이 season-1 |
| PageReaderChrome | `app/components/webtoon/PageReaderChrome.tsx` | — | 상단 바(뒤로·제목·쪽수), 진행 바, 스크롤 시 숨는 메뉴, 3쪽부터 localStorage "이어 보기" | PageReader |
| SerialEndCard | `app/components/webtoon/SerialEndCard.tsx` | — | 연재 끝 카드 | 연재 |

없는 것: 글자 크기 조절, 리더 안 목차(목차는 별도 페이지 `app/yeongnyangi/season-1/page.tsx`).

### C2. 컷 데이터와 이미지 경로

| 데이터 | 경로 | 형태 | 사용처 |
|---|---|---|---|
| 상담 웹툰 | `lib/brand/consultation-webtoons.mjs` | `consultationWebtoons[story] = {title, ending{action,href}, cuts[]}` | `app/consultations/[slug]/page.tsx:34` |
| 일일 운세 웹툰 | `lib/fortune/daily-webtoon.ts` | `DailyWebtoon={heading,lead,note,cuts:WebtoonCut[]}` | `DailyFortuneWebtoon.tsx` (이미 CutReader 사용) |
| 진입 웹툰 | `lib/brand/entry-webtoon.mjs` | `EntryLine` speaker `yeoni|neo|pig|caption` | 진입 화면 |
| 영냥이 연재 | `lib/yeongnyangi/season-1*.mjs`, `serial.mjs` | 12~24쪽, widths 720/1122 | season-1 |
| 달빛 연화당 | `app/moonlit-lotus/story/story.ts` | 15 CUTS `{alt,narration,lines[]}` — **고유 형태**, 일반 figure 렌더 | `/assets/moonlit-lotus/story-v1/cut-NN-1024.webp` |

이미지 규칙: `{src}-{width}.avif` + `{src}-{fallback}.webp`. 예: `public/images/consultation-webtoons/<story>/NN-{640,1080}.avif`, `NN-720.webp`. 현재 story 폴더 15개(astrology, codex, covers, fusion, heukwol, karma, legacy-naming, life-book, love-secret, neo, new-year, sukuyo-compat, tea, vedic, ziwei — `git ls-files` 실측). 타로 전용 story는 없다.

### C3. 캐릭터 자산 목록

| 캐릭터 | 형태 | 경로 | 수 | 표정·포즈 | 결과 웹툰 재사용 |
|---|---|---|---|---|---|
| 연이 | 꽃돼지, 투명 배경 전신 소설 그림 | `public/images/novel/remaster/v2/yeoni/` (`SAJU_SERIES_BIBLE.md:226`) | 20 | angry cheer cry determined fear flustered hug laugh neutral run sad shy sleep soft-smile surprise talk think vine-magic wave wedding | 가능(표정 범위 넓음). 단 소설 화풍이 컷 화풍과 맞는지 미확인 |
| 연이 | 꽃돼지 상담 동작 | `public/images/fortune-chat/persona/yeoni-{cheer,greet,listen,read,think}.webp` | 5 | 응원·인사·경청·읽기·생각 | 가능(상담 문맥) |
| 연이 | 상담 상태 | `public/images/fortune-chat/moments/yeoni-{empty,error,loading}.webp` | 3 | 빈 상태·오류·로딩 | 로딩 컷 후보 |
| 연이 | 타로 | `public/images/fortune-chat/yeoni/tarot-640.webp` | 1 | 타로 장면 1장 | 표지·도입 컷 후보 |
| 연이 | 인간형(손금 상담 캐주얼) | `public/images/expert-characters/yeoni/` | 11 + provenance | base, hero, hero-portrait, left, right, sideL, sideR, smile, shooting-guide 등 | **꽃돼지 컷과 섞으면 안 됨**(`docs/context/content-assets.md:7-29,44-46`) |
| 네오 | 상담 동작 | `fortune-chat/persona/neo-*.webp`, `fortune-chat/neo/*-640.webp` | 6 + 4 | cheer greet listen read think world-greet / astrology saju sukuyo tarot | 네오 상담실용 |
| 영냥이 | moods | `public/assets/yeongnyangi/moods/` | 22 | abacus beam blanket bubble-bath coffee-{savor,sigh,smile,sulky} drum heart laptop lounge ponder shy side-sit sparkle startled stretch wave weary wink (README: 360×300 흰 바탕, 글자 없음, multiply 합성) | 가능. 흰 바탕이라 어두운 톤(night) 컷에서는 합성 한계 |
| 영냥이 | expressions | `public/assets/yeongnyangi/expressions/` | 9 | calm chic cool curious grumpy smug surprised tear welcome | 가능 |
| 영냥이 | original | `public/assets/yeongnyangi/original/expression-{calm,happy,wink}.webp`, `surprised.webp` | 4 | 평온·기쁨·윙크·놀람 | 가능. 원화는 편집 금지(design-canon) |

### C4. 말투·캐릭터 정본

| 정본 | 경로 | 핵심 |
|---|---|---|
| 연이 페르소나 | `worker/yeongnyangi/prompts/persona/yeoni.ts` | 부드러운 존댓말·편지체, 호칭 '당신', 이모지·아기말투 금지 |
| 영냥이 페르소나 | `worker/yeongnyangi/prompts/persona/yeongnyangi.ts` | 반말, 직설적이지만 다정, '~냥'은 짧은 한마디에만 |
| 목소리 표 | `docs/context/design-canon.md` §2 (`:20`) | 서비스별 목소리 |
| 캐릭터 시트·사용 규칙 | `docs/context/content-assets.md:7-29, 44-46` | 연이 이미지는 화면별 고정, 인간형과 꽃돼지 혼용 금지 |
| 색·원화 | `docs/context/design-canon.md` | 영냥이는 분홍 금지, 원화 편집 금지 |

새 말투 초안은 필요 없다. 위 정본을 따른다.

### C5. 부족한 에셋

결과 웹툰에 필요한 표정 9종 기준. 매핑은 파일명으로 짐작한 것이라 전부 **추정**이며, 그림을 눈으로 확인하지 않았다.

| 필요 표정 | 연이(꽃돼지 v2 / persona) | 영냥이(moods / expressions / original) |
|---|---|---|
| 기본(neutral) | neutral | calm, expression-calm |
| 인사 | wave, persona greet | wave, welcome |
| 미소 | soft-smile, laugh | expression-happy, beam |
| 진지 | determined | ponder(추정) — **전용 없음** |
| 걱정 | sad, fear(추정) | weary(추정), tear(추정) — **전용 없음** |
| 응원 | cheer, persona cheer | heart, sparkle(추정) — **전용 없음** |
| 놀람 | surprise | surprised, startled |
| 생각 | think, persona think | ponder, curious |
| 설명(카드 들고 가리킴) | **없음**. persona read·tarot-640 1장이 가장 가까움 | **없음** |

부족 목록
1. 두 캐릭터 모두 **"카드를 들고 설명하는" 포즈와 타로 전용 포즈**가 없다(연이 `tarot-640.webp` 1장뿐).
2. 영냥이는 **진지·걱정·응원 전용 표정**이 없다.
3. 연이 v2는 투명 전신 소설 그림이라 컷 배경 위 합성·화풍 일치를 확인해야 한다(미확인).
4. 영냥이 moods는 흰 바탕이라 night·lantern 톤 컷에서는 쓰기 어렵다(추정).

---

## 5. D 레퍼런스 실측 (dohwasewon.com, 구조·시간만)

상대 문구·이미지는 옮기지 않았다. 측정: 390×844 dpr2, 해당 origin 저장소만 초기화, 결제 화면에서 멈춤.

### D1. 흐름별 요약

| 흐름 | 단계 | 핵심 실측 |
|---|---|---|
| 연애 타로 | 랜딩 → 입력 시트 4단계 → 카드 선택 → 로딩 → 무료 결과 → 결제 | 시트 1개 안 4단계(`#input` 한 번만 pushState), "n / 4" 카운터. 22장 부채, 3장 선택 후 **자동진행 없음**(4s 관찰). 로딩 ≈5.08s. 결과 `?reading=<hash>#preview`(새로고침·앞으로 가기 복원). 결과는 웹툰형 세로 스크롤 27블록, 카드마다 잠금 티저 |
| 오늘의 무료 운세 | 랜딩 → 상자 고르기 → 열기 연출 → 결과 | 연출 중 버튼 잠금 ≈4.3s, 활성 후 ≈1.0s 뒤 **자동 이동**(유일한 자동진행). 하루 1회는 서버 상태(새로고침·재진입 같은 결과) |
| 탄생 타로 | 랜딩 → 시트 2단계(설명·날짜) → 공개 연출 → 결과 | 날짜는 숫자 입력 1개 + 자동 포맷. 공개 600ms ease-out, 220ms 간격, '연출 건너뛰기' 버튼. 결과에 하단 고정 액션 바(81px) |
| 띠별 운세 | 랜딩 → 전체 목록 → 띠 상세 | 생년월일 입력 없음. GET form + 날짜 쿼리, 전체 페이지 이동. 뒤로가기가 한 단계씩 |

### D2. 가져올 패턴 (수치는 실측)

| # | 패턴 | 수치 |
|---|---|---|
| 1 | 입력은 하단 시트 하나 안에서 다단계, URL은 열 때 한 번만, 뒤로가기 = 시트 닫기·입력 유지 | 상승 400ms cubic-bezier(0.2,0.8,0.2,1), 딤 240ms |
| 2 | 진행 표시 = 단계 목록 ✓ + n / N, 단계 전환 애니메이션 없음 | — |
| 3 | **선택 단계에서는 자동진행하지 않는다.** 자동진행은 '연출 종료 → 결과' 한 곳만 | 주제 선택 2s·카드 3장 4s 관찰 무진행, 연출 뒤 ≈1.0s |
| 4 | CTA 문구가 남은 행동을 말하다가 조건이 차면 결과 보기로 바뀜 | — |
| 5 | 셔플은 선택 기능, 한 번, 전 카드 동시 | 380ms ease, translateY 17px |
| 6 | 카드를 고르면 슬롯이 즉시 차고, 슬롯 재탭으로 취소 | 채움 ≈4ms, 이동·그림자 200ms |
| 7 | 결과 진입 때 순차 뒤집기 | 800ms cubic-bezier(0.2,0.7,0.2,1), 지연 0.5/0.85/1.2s(350ms 간격), perspective 700px |
| 8 | 결과 URL에 고유 키, 새로고침·앞으로 가기 복원, 뒤로가기 시 고른 카드 유지 | — |
| 9 | 긴 결과에 상단 3px 읽기 진행 바, 스크롤 등장 | 블록 550ms/18px, 말풍선 0.3s + i×0.28s |
| 10 | 유료 영역은 흐린 막대 + 자물쇠 팝, 카드마다 끼움 | blur 3px, opacity 0.75, 팝 600ms(지연 500ms) |
| 11 | 무료 결과 끝 순서: 한 줄 결론 → 오늘의 한 걸음 → 3줄 요약 → 상세 안내 → 비교표 → 면책 → 저장/공유 → 보관함 → 후기 | — |
| 12 | 리더는 한 번에 한 장, sticky 바에 장 라벨·목차, 목차는 하단 시트, `#ch-N` pushState | 목차 열기 280ms·닫기 240ms, 장 등장 650ms |
| 13 | 글자 크기 토글 기본/크게, **기본값 '기본'** | 본문 15.5px |
| 14 | 하루 1회 무료는 서버 상태로 | — |
| 15 | 연출 길이는 버튼 잠금으로 보장하고 건너뛰기 제공 | 상자 ≈4.3s 잠금 / 카드 600ms·220ms 간격 |
| 16 | 생년월일 = 숫자 입력 1개 + 자동 포맷 + "브라우저에서만 계산" 안내 | `0000.00.00`, inputmode numeric |
| 17 | 신뢰 라인은 랜딩 CTA 바로 아래 | — |
| 18 | 짧은 결과는 하단 고정 저장/공유 바, 긴 결과는 본문 끝에 액션 | 81px |
| 19 | SEO형 무료 운세는 전체 페이지 이동 + 날짜 쿼리 URL | — |

### D3. 2단계 가정과 어긋나는 실측

| 2단계 가정 | 레퍼런스 실측 | 우리 현재 값 | 판단 재료 |
|---|---|---|---|
| (a) 한 장·한 항목 선택 후 자동 진행 | **선택 뒤 자동진행 없음**(2s·4s 관찰). 자동진행은 연출 종료 뒤 1회 | ① 셸: 3번째 선택 뒤 ≈900ms 자동 ready, 공개마다 다음 슬롯 ≈800ms 자동 무장(실측) | 선택 단계 자동진행은 레퍼런스와 반대. 2단계 스펙은 실측을 우선한다 |
| (b) 뒤집기 연출 길이 | 800ms, 350ms 간격(첫 장 지연 500ms) | ① 탭→공개 ≈2.4s(모으기 1s + 1.5s), ⑧ 0.72s + glow 1s | ① 은 레퍼런스의 약 3배 |
| (c) 글자 크기 | 기본값 '기본', 본문 15.5px | `docs/context/design-canon.md:86` 긴 결과 모바일 17px·데스크톱 18px, 행간 1.8 | design-canon이 정본. 레퍼런스 값으로 바꾸지 않는다(충돌 기록용) |

---

## 6. 문제점 상위 10개

| # | 심각도 | 문제 | 영향 | 근거 | 권장 방향(구현 안 함) |
|---|---|---|---|---|---|
| 1 | 치명 | 자존감 타로 무료 진입 불가·루프 | 무료 기능 하나가 아예 쓰이지 않음 | 실측: 16초 대기 무반응, 「모든 운세」 카드가 랜딩으로 순환. 코드: `__CD_ENTRY_ONLY_SELF_GATED_ACTIONS`(index.html:31650)에 openTarotSelfEsteemModal 없음(연애·재회·연간은 있음). 라우터 허용목록 js/core/index-inline-runtime.js:3325·경로 매핑 :3386·로더 :1925 에는 있음, 모바일 lazy-mount(index.html:38955+). 운영 302 경로 동일 여부 미확인 | self-gated 목록 누락과 lazy-mount 재부착을 점검한다 |
| 2 | 치명 | 무료 사주 결과가 비로그인에게 막힘 | 대표 무료 CTA(홈·꿀꿀·만세력)가 4탭째 로그인 벽에서 끝남 | 실측: 동의 다음 `#cdLoginRequiredModal`. 코드: `js/saju-engine.js:4464-4465` | 정책 결정 필요: 비로그인 미리보기를 줄지, 진입 전에 "로그인 필요"를 밝힐지 |
| 3 | 높음 | `/today/` 오늘의 운세가 비로그인에 막히고 안내가 탭 위치 밖에 뜸 | 눌러도 반응 없는 것처럼 보임 | 실측: 버튼 y=626, 문구 y=427. `app/_lib/free-reading-access.ts`. 코드 감사 "로그인 없음"과 ⚠충돌 | 안내를 버튼 근처에 두고, 로그인 필요를 진입 전에 밝힌다 |
| 4 | 높음 | 엔진 풀이(자미·숙요·베다·점성)는 프로필 저장에 로그인 필수, 자미 저장 버튼 무반응 | "엔진별 기본 풀이 (무료)" 블록 4카드가 막힐 수 있음 | 코드: `destiny-profile.js:9830, 9919-9923`. 실측: 10초 무반응·API 0, 다른 저장 버튼은 force 클릭만. 실기 미확인 | 실기 재현 뒤, 무반응이면 오류 표시부터 확인 |
| 5 | 높음 | 라이트 사주(유료) CTA가 무료 사주 action을 공유 | 유료 상품 클릭이 무료 흐름으로 들어가 혼동·결제 경계 흐림 | `lib/marketing/yehwa-home.mjs:52` | 유료 상품 전용 진입 action으로 분리(결제 RED 절차) |
| 6 | 높음 | 랜딩 메타가 무료인 재회·연간 타로를 유료로 표시 | 무료 기능에 가격·유료 배지가 붙어 이탈 가능 | `FeatureLandingPage.tsx:292-302` vs `free-fortune-policy.mjs:66-67`. 화면 표기 미확인 | 랜딩 메타를 정책 허용목록에서 파생 |
| 7 | 중간 | 같은 기능 링크 3~4갈래, `/index.html?action=` 이중 리다이렉트 | 크롤 낭비, 내부 링크 분산, 측정 분산 | `FeatureLandingPage.tsx:268-276, 631-645`, `public/_worker.js:183-209`. 운영 확인은 미확인 | 기능별 정규 진입 URL 하나로 모은다(라우팅 RED) |
| 8 | 중간 | 타로 14갈래 이상 분산, 셸 무료 결과 저장 없음 | 개선이 한 곳에 반영되지 않음, 새로고침 시 결과 소실 | §3 B1. ① 저장 없음(`quantum.js:3118` 주석) | §3 B3 통합 기준으로 수렴 |
| 9 | 중간 | 셔플 연출 없음, 뒤집기 ≈2.4s로 길고 진행 안내가 한 줄뿐 | 몰입감·진행 인지 저하(① 진행 인지 2점) | 실측: 탭 15872 → turn 16947 → revealed 18258, 결과까지 +1.5s. 레퍼런스 800ms | 셔플 1회·n/3 카운터·짧은 뒤집기(§5 D3) |
| 10 | 중간 | 결과 화면에 캐릭터 웹툰 연출이 없음 | 브랜드 캐릭터 자산이 결과에서 쓰이지 않음 | §4: CutReader·일일 운세 웹툰은 있으나 타로·무료 결과 적용 0. 설명 포즈 에셋 없음 | 2단계 스펙에서 CutReader 재사용 + 부족 에셋 목록부터 |

차순위(근거가 추정이거나 영향이 국소)

| 심각도 | 문제 | 근거 |
|---|---|---|
| 중간 | 연애 타로 「모든 운세」 패널 카드 탭이 html 레이어에 막힘 | Playwright "html intercepts pointer events"(실측). 실기 미확인(추정 결함) |
| 중간 | 힐링 타로 뒤집기 전 버튼 innerText에 카드명 노출 | DOM 실측. 스크린리더에 결과가 미리 읽힘 |
| 낮음 | 무료 사주 결과 360px에서 `.rpt-v2-filter`(409px)·`.ent-rpg-card`(375px)가 잘림 | 실측. 의미 손실은 육안 미확인 |
| 낮음 | `/ggulggul/` "지금 무료로 시작" 블록 안에 50,000원 흑월 카드 | 실측 |
| 낮음 | 휴먼 디자인이 mock 로그인 상태에서도 "로그인하면…" 문구 표시 | 실측. mock 영향일 수 있음(추정) |

---

## 7. 미확인 항목

| # | 항목 | 사유 |
|---|---|---|
| 1 | ③ DailyTarot 화면 전체(셔플·부채·360px fanBox 넘침·결과) | 로그인 게이트 + mock `/api/auth/me`에 `authenticated` 없음 |
| 2 | 자미·숙요·베다·점성 결과까지의 탭 수와 저장 무반응의 실기 재현 | 자동화 탭에서만 무반응 확인 |
| 3 | 자존감 타로가 운영 302 경로에서도 열리지 않는지 | 로컬에 워커 리다이렉트 없음, 스테이징 미측정 |
| 4 | `/index.html?action=` 이중 리다이렉트와 noindex 헤더의 운영 동작 | 로컬 200, 운영 미측정 |
| 5 | 재회·연간 타로 랜딩의 가격·배지 실제 표기 | 이번 실측에서 열지 않음 |
| 6 | 재회·연간·크리스털·수비학·꿈 타로의 셔플·선택·뒤집기·360px | 실측 범위 밖(코드도 일부만 읽음) |
| 7 | 연애 타로 패널 카드 탭 차단 | Playwright에서만 재현, 실기 미확인 |
| 8 | 마인드스캔 드로우 이후(질문·리딩·과금) | mock paid-draw 501 |
| 9 | 휴먼 디자인 차트 생성과 로그인 문구 | mock geocode 실패 |
| 10 | 최애운명 생년 입력 이후 단계 | 미측정 |
| 11 | 영냥이 오늘의 타로 펼친 뒤 화면·뒤집기 시간 | 출석 3일 게이트 |
| 12 | 셸 "한 장 리딩" 토글과 `/fortune/2027/`의 과금 분기 | 코드 미추적 |
| 13 | 무료 사주 결과 360px 잘림의 의미 손실 | 스크린샷 육안 미확인 |
| 14 | 연이 v2·영냥이 moods의 컷 화풍 적합성과 표정 매핑(C5) | 파일명 기준 추정, 그림 미확인 |
| 15 | `worker/lib/tarot-oracle-llm.js`, `worker/yeongnyangi/fortune/tarot/*` 어댑터 내부 | 읽지 않음 |
| 16 | `profile-honey-manager` 꿀방울 차감 경로, React AnalyticsConsent 동작 | 읽지 않음 |
| 17 | 레퍼런스 실제 리더의 표지·글자 크기 토글 동작 | 0원 결제와 로그인이 필요해 범위 밖 |
| 18 | 오늘 타로 두 브랜드(`/today/`·영냥이)의 검색 카니벌 여부 | SERP 미측정 |
