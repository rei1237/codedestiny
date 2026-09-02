---
status: active
updated: 2026-09-03
next: "배치 6 콘텐츠·정책 라우트. 시드는 app/_lib/serviceSections.js 의 href 55종 중 배치 1~4 에서 안 훑은 나머지(/reviews/ 포함). 아래 레시피 절차. 배치 5 잔여는 원장 표의 index.html 행(공용 푸터 결정 대기)과 미측정 4종"
---

# 기능별 모바일 순회 원장

홈 셸(4축 캠페인)·초융합(#1435) 이후 나머지 기능 라우트를 배치 순서로 스캔→수정한다. 축은 인체공학만 — 가로 오버플로(OF)·44px 탭 타깃(TT)·16px 입력(IN)·safe-area 여유(SA)·읽는 열폭·이탈 컨트롤. 재디자인·재도색 금지(docs/context/design-and-ui.md).

## 스캔 방법

`npm run build:cf` 후 `npm run measure:mobile-routes -- --routes=/라우트/` (루트 정적 셸은 `--target=source`). 매트릭스 412×823·360×800 × inset 0/47. exit 1 은 측정 무효(INVALID)이지 발견이 아니다. 상세 JSON 은 임시 디렉터리에 남는다(커밋 금지).

## 원장 — 완료 행은 상세를 지우고 PR#·날짜만 남긴다

발견 표기 = OF/TT/IN/SA최소여유/열폭@360/이탈. 열폭 참고선: 360px 에서 254px 문제·274px 수용(#1435 실측). SA최소여유는 #1447(09-02)부터 내용물 기준(contentGap = 박스 gap + 하단패딩) — 그 전에 적힌 SA 값은 박스 기준이라 실제 여유는 그 이상이다.

| 기능 | 라우트 | 배치 | 스캔일 | 발견 | 수정PR | 상태 |
|---|---|---|---|---|---|---|
| 초융합 심층 리딩 | /fusion-fortune/ | 1 | 09-02 | — | #1435 | 완료 |
| 러브 코덱스 | /master-love-codex/ | 1 | 09-02 | — | #1465 | 완료 |
| 운세 찻집 | /fortune-tea-house/ | 1 | 09-02 | — | #1471 | 완료 |
| 네오 작전실 | /neo-operation-room/ | 1 | 09-02 | — | #1462 | 완료 |
| 운세 챗 | /fortune-chat/ | 1 | 09-02 | — | #1447 | 완료 |
| 낙샤트라 | /nakshatra/ | 1 | 09-02 | — | #1452 | 완료 |
| 무료 허브 8종 | /saju /tarot /ziwei /sukuyo /astrology /today /compatibility /fortune/기간 | 2 | 09-02 | — | #1481 | 완료 |
| 결제 화면 | /points /points/history /premium-unlock | 3 | 09-02 | — | #1486 | 완료 |
| 유료 AI 단독 18종 | /life-book-ai /love-secret-ai /naming-ai /ziwei-ai /astrology-ai /vedic-ai /sukuyo-compatibility-ai /island-consult /destiny-compass /saju/{love-simulation,destiny-bias,animal-destiny,destiny-meeting-place} /tarot/{love,reunion,year,crystal-soul,mindscan} | 4 | 09-03 | — | #1493 | 완료 |
| 루트 정적 셸 20종 | 리포 루트 *.html (index.html 제외) | 5 | 09-03 | TT<44 46→1 · IN<16 18→0 · OF 0 | #1497 | 완료 |
| 루트 셸 index.html | / | 5 | 09-03 | TT<44 36건 — 공용 푸터 링크·언어칩·소셜 30건 + input#subDailyHome 13x13 + a.cd-mobile-header__brand 34x34 | — | 대기 — 아래 공용 푸터 행에 종속 |
| 공용 푸터(SiteFooterHub) | 크롬리스 아닌 전 라우트 | — | 09-02 | TT<44 75건(링크 16px) | — | 대기 — 사용자 결정 |
| 공용 하단 탭바(nav.cd-mnav) | App Router 전 라우트 | — | 09-02 | SA 내용물 여유 8px | — | 대기 — 사용자 결정 |

배치 1~5 완료. 다음은 배치 6(콘텐츠·정책). 배치 5 잔여는 위 표의 index.html 행과 미측정 4종(아래 비고).

## 배치 (사용자 확정: 유료 대표부터)

1 유료 대표상담 5종(위 표) · 2 무료 허브(/saju /tarot /ziwei /sukuyo /astrology /today /compatibility /fortune/기간) · 3 결제 화면(/points /premium-unlock — 🔴 payment-freeze 매니페스트 + paid-gate-auditor 선행) · 4 유료 AI 단독 ~15종 · 5 루트 정적 셸 21종(`--target=source`) · 6 콘텐츠·정책. 시드: app/_lib/serviceSections.js 의 href 55종 + 루트 *.html 21종. `/…/result/` 류는 dist 에서 못 열어 스캔 제외.

## 기능당 수정 레시피 (세션당 1기능 1PR)

① 전 스캔 → ② 그 기능의 CSS/컴포넌트만 수술적 수정(#1435 패턴: 글자 축소 대신 열 확장, Tailwind 임의값→CSS 모듈; 공용 래퍼 mobile-lite.css 금지) → ③ 재빌드·재스캔으로 전/후 수치 → ④ 그 기능 verify:* (package.json 에서 verify:슬러그 grep, 없으면 "기능 가드 없음" 명기) + verify:hero-contrast + verify:mobile-detail-nonintrusive + lint/typecheck → ⑤ 이 원장 갱신 → PR.

## 비고

- 로컬 dist 서버엔 API 가 없다 → usage/가격 fetch 실패·부분 렌더는 정상. 빈 화면은 scanned=0 INVALID 가 잡는다.
- 이탈=수동 인 몰입형은 수정 세션에서 손으로 확인. 09-02(#1452)부터 스캐너가 공용 크롬리스 나브(.cd-feature-nav)를 이탈로 인식한다 — 작전실의 '수동'도 같은 감지 구멍이었고 재스캔에서 '유' 로 확정됐다(#1462). 남은 '수동'은 초융합 하나뿐. 🔴 반대 방향 오탐도 있다 — `/today/` 이탈=0 은 크롬리스 설계에 `hardNavigateToShellHome()` 을 부르는 `<button>` 이 있는데 이탈 셀렉터가 `a[href]` 만 봐서 나온 값이다.
- 🔴 **스캐너는 첫 화면만 본다** — 인터랙션 뒤에 나오는 폼은 IN/TT 가 0 으로 보인다. 작전실 좌표 입력 폼(방식·주제 선택 두 단계 뒤)은 실제로 input/select 7개가 전부 15.2px 였는데 원장에는 IN 0 으로 적혀 있었다(#1462 에서 손으로 진입해 발견). 단계형 기능은 수정 세션에서 반드시 손으로 진입해 다시 잰다. 진입 레시피는 메모리 `driving-neo-war-room-in-a-browser`.
- 탭 타깃은 요소가 아니라 **감싸는 라벨**로 판정한다 — 작전실 `.checkField input` 은 18x18px 이지만 `<label>` 이 300x44 라 실효 44px 을 만족해 손대지 않았다. #1452(낙샤트라)는 라벨이 없어 수정 대상이었다. 🔴 **스캐너는 이 규칙을 모른다** — `scripts/measure-mobile-routes.mjs:312` 는 요소 자기 rect 만 잰다. 배치 2 의 `input.h-4.w-4` 4건은 라벨을 44px 로 올려 실효 해결했지만 스캐너 수치에는 라우트당 +1 로 남는다.
- 🔴 **전역 44px 바닥이 `<a>` 를 안 덮는다** — `styles/globals.css:128-133` 의 규칙은 `button, [role=button], input[type=button|submit|reset], label[for]` 만 겨눈다. 러브코덱스 나브에서 나란히 놓인 `<button>` '돌아가기'(71x44)와 `<Link>` '홈으로'(57.8x**21**)가 눈에는 같은데 실측이 갈렸다(#1465). 링크형 컨트롤이 있는 라우트는 이 구멍을 먼저 의심한다. 처방은 `min-h-11`(같은 페이지 연관 링크가 이미 쓰는 값). 배치 2 의 수정 6곳도 전부 이 구멍이었다(헤더 로고·브레드크럼 2종·기간 칩·별자리 카드·FAQ `summary`). 한 글자 링크는 `min-w-11 justify-center` 까지 필요하다 — 높이만 올리면 12x44 로 여전히 위반이다.
- 🔴 **Tailwind `min-h-*` 유틸은 그 전역 바닥을 이긴다 — `<button>` 도 44px 이 아닐 수 있다.** `@tailwind base/components/utilities` 는 CSS 캐스케이드 레이어가 아니라 순서 치환이라, `.min-h-9`(0,1,0)가 `button`(0,0,1)을 이긴다. 09-02 주입 실측(같은 스타일시트·360px): `button.min-h-9` 36px · `button.min-h-10` 40px · 유틸 없는 `button` 44px. 배치 3 수정 12곳 중 6곳이 이 구멍이었고 전부 `<button>` 이었다. 전수는 `git grep "min-h-\(0\|px\|1\|1\.5\|2\|2\.5\|3\|3\.5\|4\|5\|6\|7\|8\|9\|10\)\b"` 로 뽑는다(`min-h-11` 이상만 안전).
- 체크박스 44px 처방은 #1452 와 #1465 가 같은 코드다 — `appearance:none` 44x44 히트박스 + 16px `::before` 글리프 + 가로 `-14px` 마진 + 줄 `margin-top` 축소(글리프 중심 고정). 다음 기능도 이 블록을 그대로 옮겨 쓰면 된다: `src/features/master-love-codex/styles/codex.module.css` 의 `.checkLine`.
- 🔴 **몰입형 기능의 오버레이는 라우트 스캔이 못 잡는다** — 찻집 꿀방울 도크·안내 패널·앨범은 첫 화면에 있지만 스캐너가 본 TT<44 는 2건, 손으로 열어 잰 것은 5건이었다(#1471). 오버레이·패널이 있는 기능은 `data-*` 를 강제해서라도 열어 재고, 안 열리면 미검증으로 적는다.
- 🔴 **`/points/` 는 API 없이 106개 중 14개만 렌더된다** — 라우트 스캔만 믿으면 결제 확인 모달 전체를 놓친다(09-02). 모달은 Playwright 로 `button:has-text("구매하기")` 를 클릭하면 열리고 보임 요소가 24개로 는다. 결제 데이터가 있어야 나오는 주문내역 링크 2건은 끝내 못 열어, **같은 스타일시트에 소스 마크업을 그대로 주입해** 쟀다(107.8x20 · 90.2x36). 배치 4 의 유료 라우트도 이 두 수단이 필요하다.
- 찻집에서 끝내 도달 못 한 표면(#1471 미검증): 달빛 앨범 내부 탭·검색(앨범 잠김), 꿀돼지 QnA(5,000원 결과 화면 뒤), `.honeyModeToggle`. 유료 경로가 열리는 환경이 생기면 이 셋부터 잰다.
- 🔴 **배치 2 이후 남은 위반은 전부 공용 푸터다** — 라우트당 TT<44 75건이 모두 `SiteFooterHub` 링크(16px)이고, 사용자 결정으로 **별도 안건**(위 표 대기 행). 09-02 시뮬레이션(360×800·/saju/): 44px 처방 = 푸터 +742px·문서 +10.5%, 24px(WCAG 2.5.8 AA) = +226px·+3.2%. 대상은 `.sfhLink` 65개 + `.sfhPolicyLink` 10개이고 크롤러용 내부 링크 51개를 진다.
- **공용 컴포넌트 처방은 배치 밖으로 번진다** — 배치 2 의 브레드크럼 수정은 `SeoLandingTemplate`(app 소비자 21곳)이라 배치 밖 11개 라우트(dream·love·manse·physiognomy·vedic·premium 등)도 함께 44px 이 됐다. 표본 4개(dream·love·vedic·tarot/reunion) 재스캔에서 OF=0·열폭 328px·IN<16 0 으로 회귀 없음(09-02).
- 공용 `ServiceIntroSection`(라우트 17종)의 읽는 열폭은 #1462 로 286→302px 이 됐다. 배치 6 에서 만날 `/reviews/` 는 09-02 관찰에서 302px·TT<44 2건·IN<16 1건이었다.
- 🔴 **열폭 1px 은 결함이 아니라 `sr-only` 를 읽은 산출물이다** — `/saju/animal-destiny/`·`/saju/destiny-meeting-place/` 가 그렇고, 실체는 `<section className="sr-only">` SEO 블록이다(`app/saju/animal-destiny/page.tsx:40`, `app/saju/destiny-meeting-place/page.tsx:51`). 배치 5/6 에서 1px·한 자릿수 열폭이 나오면 먼저 `sr-only` 를 의심한다.
- 🔴 **`<summary>` 에 `flex min-h-11` 을 반사적으로 주지 말 것** — 배치 2 의 그 처방은 대상이 **이미 `list-none marker:content-none` 을 달고 있었기 때문에** 안전했다. 안 달린 summary 에 `display:flex` 를 주면 디스클로저 삼각형이 조용히 사라진다(인체공학 축 밖의 재디자인). `/tarot/mindscan/`(#1493)은 그래서 `py-2.5` 로 25.9→45.9px 을 만들어 `display:list-item` 을 유지했다. 먼저 마커 유무를 확인하고 고른다.
- 🔴 **`/…/result/` 는 스캔이 못 열어도 Gap B 위반이 산다** — 배치 4 의 `min-h-*` 전수 grep 에서 `love-secret-ai/result`(칩 36px·초기화 36px)·`naming-ai/result`(복사 40px)가 나왔고, `astrology-ai` 의 재시도·초기화 2건은 `error` 상태에서만 렌더돼 첫 화면 스캔에 안 잡혔다(#1493 에서 소스 기준 수정, 렌더 실측 없음). **라우트 스캔을 마쳤어도 그 배치 디렉터리에 `min-h-*` 전수 grep 을 한 번 더 돌린다.**
- 🔴 `/destiny-compass/` 는 hub 단계만 실측했다(0건). `map`→`processing`→`reveal`→`result` 이후 단계는 AI 실호출이 필요해 **미검증**이다 — 유료 경로가 열리는 환경이 생기면 `app/destiny-compass/_components/CompassApp.tsx:31-108` 의 단계 9개를 재측정한다.
- 🔴 **App Router `page.tsx` 를 건드리면 sitemap 원장 서명이 깨진다** — `npm run sitemap:generate` 를 같은 커밋에 담아야 한다(#1493 은 서명 9건). 이때 `/fortune/*` 72건의 lastmod 가 오늘 날짜로 함께 밀리는데 그건 휘발성 라우트의 의도된 롤오버다(`scripts/generate-sitemap.mjs:812-821` 이 `--check` 에서 마스킹). 배치 5 는 루트 정적 셸이라 해당 없고, 배치 6 은 다시 걸린다.
- 🔴 **`/premium-unlock/**` 편집은 결제 게이트를 하나도 안 깨운다**(09-02 paid-gate-auditor) — `paid-flow-gates.yml` 의 `paths` 에 없고 `node scripts/lib/change-risk.mjs app/premium-unlock/PremiumSalesContent.tsx` 가 `level=medium deepRequired=false` 를 낸다. 유일한 가드 `verify:life-book-ai-flow` 가 PR CI 에서 안 도니 그 파일을 만졌으면 손으로 돌리고 출력을 보고에 남긴다. 배선 자체(paths 추가 또는 deepVerificationRules 등재)는 별도 PR 로 사용자 판단이 필요하다. 반대로 `app/points/**` 는 게이트 전체가 돈다.
- `app/points/PointsClient.tsx` 의 `{false && (` 죽은 블록(09-02 기준 4870 근처) 안에 구 헤더·`WalletCard`·`SubscriptionStatusCard` 가 통째로 들어 있다 — `app/points/SubscriptionStatusCard.tsx` 의 유일한 참조도 여기라 그 파일 전체가 도달 불가다. 인체공학 축 밖이라 배치 3 은 손대지 않았다. 삭제하려면 `deletion-auditor` 선행(`verify:billing-pass-policy` 가 그 JSX 리터럴을 단언한다).
- index.html 의 /services/ 링크 7종(tarot·face-reading·palm-reading·animal-totem·omikuji·bias-destiny·stonehenge-rune)은 dist 에 산출물이 없어 404 다(09-02 실측). 링크 정리/페이지 신설은 별도 결정 필요.
- 🔴 **투명 테두리 히트박스 확장은 네이티브 체크박스에 안 통한다** — 크롬이 `input[type=checkbox]` 위젯에는 저자 `border` 를 무시한다. 09-03 실측: `<button>` 에 준 `border-top/bottom:7px solid transparent` + `margin -7px` + `background-clip:padding-box` 는 의도대로 rect 52x44 · 페인트 52x30 이 됐지만(destiny-island `.toggle`), 같은 처방을 체크박스에 주니 `clientWidth` 가 44 로 나와 **위젯 자체가 44x44 로 커졌다**(시각 회귀). 체크박스는 감싸는 `<label>` 을 44px 로 올려 실효 해결하고 스캐너 수치에 +1 이 남는 것을 받아들인다(위 라벨 항목과 같은 규칙). 🔴 그리고 `background` 단축 속성은 `background-clip` 을 `border-box` 로 되돌리므로, 이 처방을 쓴 요소의 상태 규칙에서는 `background-color` 롱핸드만 쓴다.
- 🔴 **낡은 `type=` 셀렉터가 폼 하나를 통째로 무스타일로 남긴다** — destiny-island 의 `.field input[type=date],.field input[type=time]` 이 실제 마크업 `type="text" inputmode="numeric"`(`destiny-island.html:565-566`)과 안 맞아 생년월일·시각 입력이 173x19 · 글꼴 13.3px 로 렌더됐다. **둘째 화면이라 스캐너는 0 으로 보고했고**, 강제 진입 하네스로만 발견됐다. 배치 6 에서는 CSS 셀렉터의 `type=` 과 마크업의 실제 `type` 을 먼저 대조한다.
- 🔴 **루트 셸은 `public/` 과 세 가지 관계를 가진다 — 하나만 고치면 배포에 안 나간다.** ① `sync:public` staticTargets 17종은 자동 미러 ② `ifa-oracle-about.html` 은 미러 대상이 아니고 루트 사본과 **바이트 동일**해야 한다(파일 머리 주석) ③ `ifa_oracle_v2_full.html` 의 실제 배포본은 **다른 파일인 `public/ifa-oracle.html`** 로, head 4줄만 다르고 나머지는 같다. 배치 5 에서 ②③은 손으로 같이 고쳤다. 루트 셸을 고치기 전에 `git grep -n "<파일 이름>" scripts/sync-public.mjs` 와 `diff -u <루트 파일 경로> <public 후보 경로>` 를 먼저 돌린다.
- 배치 5 미측정 4종 — `blood-type-app`·`geomancy-oracle-v4` 는 첫 화면 컨트롤이 스캐너의 INTERACTIVE_SELECTOR 밖이라 scanned=0 INVALID, `neville-meditation` 은 인증 우회를 심어도 보임 요소 0, `prompt-hub-3004` 는 소스 루트에 `_next` 청크가 없어 못 뜬다(정본은 App Router `/fortune/prompt-hub` 라 배치 6 대상). 넷 다 결함이 아니라 **측정 불가**로 남긴다.
- `destiny-poker` 의 TT<44 1건(115.9x20 `a "코드 데스티니 홈"`)은 문장 안 인라인 링크라 WCAG 2.5.8 Inline 예외 — 의도적으로 안 고쳤다. 🔴 인증 게이트가 있는 루트 셸(myungwun_final·yoga-guru·cosmic-soul-meditation 등)은 로컬에서 `/api/auth/me` 가 실패해 `window.history.back()` 으로 튕긴다. Playwright `addInitScript` 로 `sessionStorage.flower_admin_token` 에 `^[A-Za-z0-9_-]{20,}[.][0-9a-f]{64}$` 를 만족하는 더미 문자열을 심으면 통과한다(셸이 형식만 검사).
