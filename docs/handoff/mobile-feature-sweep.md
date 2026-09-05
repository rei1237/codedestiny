---
status: active
updated: 2026-09-05
next: "낙샤트라를 09-05 에 닫았다(#1589, 아래 §낙샤트라 — keep-all 31/31 짝맞춤, 문서폭 900→620px). §다른 전문가 상담 감사 의 'AI 본문 keep-all 단독' 잔여는 **섬 상담 6곳(`app/island-consult/IslandConsultClient.tsx:952,955,965,990`)** 과 **베다 1곳(`app/vedic-ai/VedicAiClient.module.css:735`)** — 기능당 1PR. 🔴 섬 상담은 픽스처가 없어(`lib/dev-preview/fixtures/` 8종에 없음) 낙샤트라식으로 화면 여는 법부터 찾거나 '측정 불가'를 명기해야 하고, 베다는 픽스처가 있다 — **베다부터가 싸다**. 숙요궁합(34)은 사용자가 '정상'으로 판정해 제외됐다. 🔴 스캐너 맹점 2종(전역 clip · 진입 애니메이션 opacity)은 그대로라 스캐너 수치로 전/후를 판정하지 말 것. CI 게이트 2종(`verify:mobile-cdp-smoke`·`verify:mobile-detail-render`)의 OF 맹점은 여전히 별도 PR 이 필요하다"
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
| 콘텐츠·정책 32종 | /about /faq /methodology /terms /refund-policy /contact /privacy /advertising-policy /editorial-policy /disclaimer /reviews /ziwei/chart /fortune/prompt-hub /tarot/healing /tarot/prompt-maker /palm-reading + FeatureLandingPage 16종 + /oracle/rune /saju-guardian | 6 | 09-03 | 고유 TT<44 95→29 · IN<16 14→0 · OF 0 (잔여 29 = 인라인 예외 20 · sr-only 파일입력 4 · 체크박스 라벨 5) | #1501 | 완료 |
| 루트 셸 index.html | / | 5 | 09-03 | TT<44 36→27(360×800)·37→28(412×823) · 푸터 AA 위반 2→0 · IN<16 0 · OF 0 (잔여는 푸터 링크 = 아래 행) | #1504 | 완료 |
| 공용 푸터(SiteFooterHub) | 크롬리스 아닌 전 라우트 | — | 09-03 | TT<44 75건이나 **WCAG 2.5.8 AA 위반 0**(Spacing 예외) — 코드 변경 없이 종결 | — | 완료 — 수정 불요 |
| 공용 하단 탭바(nav.cd-mnav) | App Router 전 라우트 | — | 09-03 | SA 내용물 여유 8→12px · 인접결함 `--cd-mnav-bar-h` 56→68px(실측 64.1→68.1) | #1504 | 완료 |

배치 1~6 + 대기 3행 완료 — 시드 55종을 09-03 에 실측 대조해 소진을 확인했다(배치 6 이 남은 26종을 덮었다). 순회는 여기서 끝이고, 새 라우트가 생기면 아래 레시피로 이어간다. 배치 5 미측정 4종은 아래 비고.

## 🔴 OF 열 정정 — "0" 은 깨끗하다는 증거가 아니었다 (09-05)

위 표의 **OF 열이 55개 기능 전 배치에서 예외 없이 0** 인 것은 결함이 없어서가 아니라 **지표가 0 밖에 낼 수 없었기 때문**이다. 낡은 수치는 덮지 않고 정정만 붙인다(원칙 8).

- `styles/globals.css:80-81,111-112` 이 `html`·`body` 에 `overflow-x:hidden` + `overflow-x:clip` 을 전역으로 건다 → `document.documentElement.scrollWidth` 는 **정의상 `clientWidth` 를 넘을 수 없다.**
- 세 검사기가 전부 그 값 하나로 판정했다 — `measure-mobile-routes.mjs`·`verify-mobile-cdp-smoke.mjs`·`verify-mobile-detail-render.mjs`. `measure-*` 는 요소 단위 수집 블록을 갖고 있었지만 `if (docOverflow)` 안에 갇혀 한 번도 실행되지 않았다(원칙 10 의 fail-open 형태).
- 그래서 넘친 내용은 가로 스크롤바 없이 **잘려서 사라진다**. 사용자 신고 "모바일 화면에 안 맞게 넓게 나와 짤린다"가 정확히 이 현상이다.

09-05 에 `measure-mobile-routes.mjs` **만** 고쳤다 — 문서 게이트를 없애고 두 축을 상시 수집한다. 🔴 **CI 게이트 2종(`verify:mobile-cdp-smoke`·`verify:mobile-detail-render`)은 같은 맹점을 그대로 갖고 있다**(사용자가 범위를 그렇게 확정했다). 후속 PR 이 필요하다.

| 축 | 판정 | 잡는 것 |
|---|---|---|
| OF-A | `rect.right > innerWidth+1` 또는 `rect.left < -1` | 자기 박스가 화면 밖으로 나간 요소 |
| OF-B | `el.scrollWidth > el.clientWidth+1` **이고** computed `overflow-x` 가 `auto`/`scroll` 이 **아님** | 트랙 안에서 내용만 새어 잘리는 경우 |

🔴 **두 축 다 무해한 상시 초과를 낸다 — 건수만 보고 결함으로 읽지 말 것.** 자미두수는 수정 후에도 OF-A=10·OF-B=2 인데 전부 의도된 장식이다(바로 아래).
🔴 **맹점은 하나가 아니다 — 표본 자체가 비어 있을 수 있다(09-05, 신년운세에서 발견).** 스캐너 `visible()`(`scripts/measure-mobile-routes.mjs:234-241`)이 `checkVisibility({checkOpacity:true})` 를 쓰기 때문에, **스크롤 진입 애니메이션으로 `opacity:0` 에서 시작하는 본문은 통째로 안 세어진다.** 신년운세 결과 화면은 레이아웃된 517개 중 **311개가 `.nyai-reveal` 하위라 표본에서 빠졌다**(360×800 실측). 출력의 `scanned=27/55` 가 그 흔적이다. framer-motion `initial={{opacity:0}}` 을 쓰는 기능은 스캐너 OF 수치를 전/후 근거로 쓰지 말 것.

🔴 **텍스트 런의 넘침은 이 두 축으로도 안 잡힌다** — 크로미엄의 `scrollWidth` 가 인라인 텍스트 넘침을 신뢰성 있게 포함하지 않는다. 09-05 에는 `Range.getClientRects()` 로 텍스트 픽셀 범위를 따로 쟀고, 그 축에서만 42건이 보였다. 스캐너에는 아직 없다.

🔴 **거꾸로, 프로브가 세는 것이 전부 결함인 것도 아니다 — 표본에서 빼야 할 위양성 3부류가 있다(09-05, 카르마·낙샤트라에서 확인).** ① 스크린리더 전용 노드(1px 상자 + `clip-path:inset(50%)` + `white-space:nowrap` — 표의 대체본에 흔하다), ② `overflow-x:auto|scroll` **조상** 안의 의도된 가로 레일(모바일 탭 레일 등), ③ **마퀴 트랙 — `white-space:nowrap` + `width:max-content` 를 `overflow:hidden` 부모가 자르는 무한 레일**(`app/nakshatra/nakshatra.module.css:160-166` `.marquee > .mqRow`). 🔴 위 OF-B 는 **자기 자신의** `overflow-x` 만 보므로 조상까지 거슬러 확인해야 한다. 안 빼면 손댈 것이 없는 화면에서도 이탈 23건·런 6건이 나온다.

🔴 **③ 은 선언값으로 못 거른다** — `getComputedStyle(el).width` 는 `max-content` 가 아니라 **사용값(px)** 을 돌려준다. 구조로 판정해야 한다: *조상이 `nowrap` 이고, 그 부모의 `overflow-x` 가 `visible` 이 아니며, 조상 폭이 부모 `clientWidth` 를 넘는다.* 이 필터가 없으면 `/nakshatra/` 는 **문서폭 5057px · 이탈 150건 · 런 99건**(360×800 실측)으로 나오는데, 걸러내면 **문서폭 360px · 이탈 0 · 런 0** 이다. 같은 화면의 같은 순간이고 차이는 필터뿐이다.

## 자미두수 결과 화면 (`/ziwei-ai/`) — 09-05 수정

원장의 유료 AI 18종 행(#1493)은 **입력 폼 첫 화면만** 쟀다(배치 정의: "`/…/result/` 류는 dist 에서 못 열어 스캔 제외"). 결과 화면 실측은 09-05 가 처음이다.

### 결과 화면을 결제·LLM 없이 여는 하네스

🔴 `?preview=success` dev-preview 는 `NODE_ENV==="production"` 에서 `null` 이라 **dist 에서는 안 된다.** 대신 `?cid=` 재열람 경로(`ZiweiAiClient.tsx:866-878`)를 쓴다 — 결제도 LLM 도 안 탄다.

1. `npm run build:cf`
2. 1회용 스텁 서버(약 90줄, 커밋 안 함): `dist/` 를 정적 서빙하면서 `/api/ziwei-ai/result` 만 `lib/dev-preview/fixtures/ziwei.ts` 의 `buildZiweiPreviewPayload("success")` 로 응답한다(픽스처가 TS 라 `esbuild.transform` 으로 타입만 벗겨 import). `id` 쿼리가 있으면 단건, 없으면 빈 목록 — 클라이언트가 두 요청을 다 보낸다. 나머지 `/api/*` 는 404 로 두면 클라이언트가 흡수한다. 🔴 **127.0.0.1 로 띄우는 것이 핵심** — `app/_lib/api-config.ts:92-99` 의 `LOCAL_HOSTS` 가 API 를 same-origin 으로 돌려 **프로덕션 트래픽이 0** 이 된다.
3. 🔴 PowerShell 로 (Git Bash 는 선두 라우트를 재작성한다):
   `npm run measure:mobile-routes -- --target=http://127.0.0.1:3070 --routes="/ziwei-ai/?cid=dev-preview-ziwei&x=/" --expect="[data-ziwei-complete-result]" --viewports=412x823,360x800`
   - 끝의 `&x=/` 는 `parseArgs` 가 쿼리 끝에 `/` 를 붙여 망가뜨리는 것을 피하는 우회다(그 부분은 안 고쳤다).
   - `--expect` 는 09-05 에 추가한 인자다. 셀렉터가 안 뜨면 INVALID 로 죽는다(fail-closed) — 결과가 안 붙은 채 "위반 0" 이 나오는 위양성을 막는다. `--click` 도 함께 추가했다.

🔴 **이 하네스에는 함정이 하나 있다** — 대한 타임라인 캡션이 `34-43세세 · 관록궁 대한` 으로 `세` 가 겹쳐 보이는데 **프로덕션 결함이 아니다.** 실제 생산자 `worker/lib/ziwei-ai-chart.js:361` 은 `range: \`${startAge}-${startAge + 9}\`` 로 `세` 를 안 붙이고 컴포넌트(`ZiweiAiClient.tsx:400`)가 붙인다. 세를 두 번 넣은 쪽은 픽스처(`lib/dev-preview/fixtures/ziwei.ts:92-95` `range: "4-13세"`)다. 09-05 스크린샷 판정에서 실제로 한 번 오탐을 냈다 — 픽스처를 정본으로 읽지 말 것.

### 전 / 후

| 뷰포트 | 전 | 후 |
|---|---|---|
| 412×823 | OF-A=10 OF-B=2 TT<44=2 IN<16=0/7 열폭 354px | OF-A=10 OF-B=2 TT<44=**1** 열폭 354px |
| 360×800 | OF-A=10 OF-B=2 TT<44=2 열폭 302px | OF-A=10 OF-B=2 TT<44=**1** 열폭 302px |
| 1280×900 | (미측정) | OF-A=**0** OF-B=1 TT<44=1 열폭 654px — 데스크탑 회귀 없음 |

**OF 건수가 안 줄어든 것이 정상이다** — 픽스처 문안이 짧아 애초에 안 넘쳤고, 남은 건수는 전부 의도된 장식이다.

- OF-A 10건 = `div.heroConstellation` · `span.heroOrbit--outer/middle/inner` · 별 `<i>` 6개. 히어로 `overflow:hidden` 안에서 의도적으로 잘리는 궤도 장식.
- OF-B 2건 = `section.ziweiHero` 86px + `main.ziweiAiShell` 597/604px. 후자는 `.ziweiAiShell::after`(`inset:-15% -10%` + `rotate(-7°)`)의 회전 바운딩박스다. 검산 — 412px: `494.375·cos7° + 9143.53·sin7° = 1604.8`, 중앙정렬이라 우측 초과 `(1604.8−412)/2 = 596.4 ≈ 597`. 360px 도 `603.6 ≈ 604`. 🔴 **수정 전 594/601 → 후 597/604 의 +3px 은 회귀가 아니라 히어로 여백 +30px 이 페이지를 높인 산술적 귀결이다** — 회전 장식은 페이지가 높아지면 옆으로 자란다.
- TT<44 잔여 1건 = `input[type=checkbox]` 17×17. 감싸는 `label.check` 가 **131×44** 이고 라벨 클릭이 실제로 토글한다(checked false→true 실측). 위 비고에 적힌 스캐너 위양성 그대로다.

### 실제 잘림은 스트레스 주입으로만 재현된다

🔴 **픽스처 문안으로는 안 넘친다.** 줄바꿈 불가한 긴 런(AI 본문의 URL·연속 영숫자, 사용자 입력 이름)을 주입해야 재현되고, 사용자가 본 화면이 이쪽이다.

| 360px | 문서폭 | 뷰포트 이탈 | 잘린 텍스트 런 |
|---|---|---|---|
| 스트레스 · 수정 전 | 477px | 155건 (최대 +140px) | 42건 (최악 `small` +125px) |
| 스트레스 · 수정 후 | **314px** | **0** | **0** |

412px 도 같다(477 / 153건 / 38건 → 366 / 0 / 0). 수정 후 수치는 **주입 CSS 없이 배포 빌드의 CSS 만으로** 나온 값이다.

### 처방 (`ZiweiAiClient.tsx` 인라인 `<style>` 만, +10/−2줄)

기여도를 A/B/C 로 분리 측정해 골랐다 — A 단독과 C 단독이 각각 0 을 만들고, B 단독은 4건이 남는다. A·C 만으로 충분하지만 B 는 아이템 자동 최소폭이라는 다른 원인을 막아 함께 넣었다.

- **A** `.resultDocument,.resultCover,.chartDataPanel,.chartDataHeader,.dayunBanner,.chatList,.chatCard{grid-template-columns:minmax(0,1fr)}` — 7개 전부 `grid-template-columns` 선언이 없는 **암시적 1열**이라 트랙 바닥이 `auto` 였다. `minmax(0,1fr)` 은 바닥만 내리므로 **레이아웃 인상 변화 0**.
- **B** 그리드 아이템 7종에 `min-width:0`.
- **C** AI 본문·요약값 9종에 `overflow-wrap:anywhere`. 🔴 `word-break:keep-all` 단독은 긴 런을 못 끊고, `break-word` 는 min-content 를 안 줄여 **효과가 없다** — `anywhere` 여야 한다.
- 부수 수정 둘: `.resultToolbar button` `min-height:42→44px`. 그리고 620px 쿼리의 `.heroCopy` 상단 패딩을 `24px → calc(env(safe-area-inset-top,0px) + 54px)` — 좌상단 고정 `nav.cd-feature-nav`(12,12 124×44)가 눈썹 텍스트(31,**35**)를 덮고 있었고, 수정 후 31,**65** 로 9px 여유가 생긴다. 🔴 **나브를 숨기는 것은 오답이다** — `/ziwei-ai` 는 `CHROMELESS_ROUTES`(`app/components/AppChrome.tsx`)라 하단 탭바가 없고 `body.cd-mnav-mounted` 도 안 붙어(`styles/mobile-bottom-nav.css:69`) 이 나브가 **유일한 탈출구**다. 자리를 비우는 쪽으로 고쳤다. 데스크탑은 원래 패딩 42px 이라 이미 안 겹쳤다.

클래스명 충돌 확인: 이 14개 클래스는 `components/`·`src/` 전체에서 사용처 0(`git grep`) — 파급은 `/ziwei-ai/` 안에서 닫힌다.

### 안 고친 것

- `.scoreGrid` 는 620px 쿼리에 빠져 있어 360px 까지 2열로 남지만, 트랙이 이미 `repeat(2,minmax(0,1fr))` 라 **잘림의 원인이 아니다.** 열 수 변경은 인체공학이 아니라 디자인 변경이라 남겼다.
- `.ziweiAiShell{overflow:hidden}` 도 그대로 뒀다 — 위 장식 잘림이 이 선언에 의존한다.

## 신년운세 결과 화면 (`/new-year-ai-consultation/`) — 09-05 수정 (#1585)

하네스는 자미두수와 같은 형태다 — `?sid=` 재열람 경로(`NewYearAiClient.tsx:1616-1655`)에 `lib/dev-preview/fixtures/new-year.ts` 를 `/api/new-year-ai/result` 로 물린 1회용 스텁(127.0.0.1). `sessionId` 가 있으면 단건, 없으면 빈 목록을 준다. `--expect="[data-pdf-section]"`.

### 🔴 이 화면은 스캐너로 전/후를 못 잰다

`measure:mobile-routes` 는 수정 전후가 **똑같이 `OF-A=1 OF-B=1`** 이다. 두 건 다 의도된 장식이고, 진짜 잘림은 위 §OF 열 정정 의 맹점 2번(진입 애니메이션 opacity) 때문에 표본에 아예 없었다. 그래서 `Range.getClientRects()` 기반 1회용 프로브로 쟀다(자미두수 세션과 같은 축).

| 360px | 문서폭 | 뷰포트 이탈 | 잘린 텍스트 런 |
|---|---|---|---|
| 스트레스 · 수정 전 | 745px | 11건 (최악 `span.nyai-eyebrow` +384px) | 7건 (최악 `blockquote.nyai-qa-question` +385px) |
| 스트레스 · 수정 후 | **360px** | **1건 (장식)** | **0** |

412px 도 같다(745 / 11 / 7 → 412 / 1 / 0). 무스트레스는 전후 모두 이탈 1건(장식)·런 0 이다 — 자미두수와 마찬가지로 **픽스처 문안으로는 안 넘친다.**

잔여 2건은 전부 의도된 장식이다 — `div.nyai-orbit`(절대배치 회전 장식, 좌측 음수)과 `.nyai-intro::after{right:-46px}`(코너 원형 장식). 후자가 OF-B 46px `"상담 대상자 요약상담 연도"` 의 정체이고 `.nyai-intro{overflow:hidden}` 이 의도적으로 자른다. 🔴 **데스크탑 1280×900 에서도 같은 46px 이 나온다** — 모바일 결함이 아니라는 증거다(그 뷰포트 OF-A=0, 회귀 없음).

### 처방 (`NewYearAiClient.tsx` 만, +51/−2줄)

자미두수의 A·B·C 를 그대로 옮겼다.

- **A** 암시적 1열 그리드 **14종**에 `grid-template-columns:minmax(0,1fr)`. 감사표의 "암시적 16" 중 `.nyai-empty`(`place-content:center`)·`.nyai-pillar`(`place-items:center`)는 뺐다 — 트랙을 늘리면 중앙 정렬의 의미가 바뀐다.
- **A′** 860px 쿼리의 `.nyai-intro,.nyai-workspace` 와 `.nyai-grid` 는 선언을 직접 `1fr → minmax(0,1fr)` 로 고쳤다. 🔴 미디어쿼리 안이라 **뒤에 블록을 붙이는 방식으로는 안 이긴다**(같은 특이도에서 나중 규칙이 이기는데, 미디어쿼리 쪽이 더 뒤에 있다).
- **B** 아이템 7종에 `min-width:0`. 실측으로 실제 밀린 것은 `.nyai-messages`·`.nyai-result-bundle` 2종(각 +414 / +418px)이고 나머지 5종은 같은 컨테이너의 형제라 함께 눌렀다. 감사표의 "안눌린 10" 은 정적 집계라 실측치와 다르다.
- **C** `word-break:keep-all` **8곳 전부**에 `overflow-wrap:anywhere` 를 짝지었다(감사표 8건과 일치). 여기에 측정으로 잡힌 범인 `.nyai-eyebrow`·`.nyai-qa-question`·`.nyai-qa-answer`(+` p`)·`.nyai-saju-birth`·`.nyai-message p`·`.nyai-report-heading strong` 을 더했다.

🔴 **이 파일은 CRLF 다** — Edit/sed 로 고치면 3줄 수정이 3244줄 diff 가 된다. node 패치 스크립트 + 개행 개수 검산으로 고쳤다(메모리 `patch-crlf-files-with-a-node-script`).

### 비회귀 근거 — 같은 빌드 위 런타임 A/B

재빌드 없이 **이번 규칙만 `!important` 로 되돌린 화면(A)** 과 현재(B)를 360 폭 전체 페이지로 촬영해 픽셀 대조했다 — `360×10221`, **불일치 0 / 3,679,560px (0.000%)**. 진입 애니메이션은 양쪽 다 강제 노출해 결과 본문까지 비교 대상에 넣었다.

🔴 **계측기 유효성을 먼저 확인하고 읽을 것** — 같은 대조를 스트레스 문안으로 돌리면 높이가 `10566 ↔ 11213` 으로 갈린다. 대조군 없는 픽셀 A/B 가 전부 "차이 0" 을 내는 함정(메모리 `paused-animations-still-beat-inline-styles`)을 이렇게 배제했다.

### 안 고친 것

- `TT<44=11` · `IN<16=6/6` 은 전후 동일하게 남았다. 이번 PR 의 축이 아니고(원장 다음 단계는 keep-all 단독), 위 맹점 2번 때문에 이 수치도 결과 본문을 못 본 값이라 **먼저 표본부터 고쳐야 의미가 있다.**
- 시즌 CSS 의 `repeat(N, 1fr)` 다열 그리드(`.nyai-quarter-row`·`.nyai-month-grid`·`.nyai-year-chips`·`.nyai-letter-grid` 등)는 같은 min-content 바닥을 갖지만 **이번 측정에서 넘치지 않았고** 감사표의 "암시적" 집계에도 안 들어간다. 잠재 결함으로만 남긴다.

## 카르마 데스티니 결과 화면 (`/karma-destiny-ai/result/`) — 09-05 수정 (#1586)

하네스는 신년운세와 같은 형태다 — `?sessionId=` 재열람 경로(`KarmaDestinyAiResultClient.tsx:899`)에 `lib/dev-preview/fixtures/karma-destiny.ts` 를 `/api/karma-destiny-ai/result` 로 물린 1회용 스텁(127.0.0.1, `dist/` 정적 서빙). 나머지 `/api/*` 는 404 로 막아 프로덕션 트래픽 0. `--expect="[data-kdai-pdf-page]"`.

🔴 **챕터는 기본이 펼침이다** — `KarmaDestinyAiResultClient.tsx:952-954` 의 `useEffect` 가 전부 연다. 하네스가 `.kdai-chapter__head` 를 무조건 클릭하면 오히려 **닫혀서 본문이 언마운트되고 표본이 통째로 빈다**(실측: 12건 클릭 → `bodies=0`). 접힌 것(`[aria-expanded="false"]`)만 클릭해 멱등하게 만들어야 한다.

### 전/후 실측 (프로브 · 스트레스 문안)

스캐너는 여기서도 못 쓴다 — 위 §OF 열 정정 의 맹점 2번(진입 애니메이션 opacity)이 그대로 걸린다(`ResultStyles.tsx:577` `[data-kdo-reveal]{opacity:0}` → `:582` `.is-revealed{opacity:1}`). `Range.getClientRects()` 프로브로 쟀다.

| 360×800 | 문서폭 | 뷰포트 이탈 | 잘린 텍스트 런 |
|---|---|---|---|
| 스트레스 · 수정 전 | 948px | 66건 (최악 `li` +237px) | 145건 (최악 `h1` +588px) |
| 스트레스 · 수정 후 | **510px** | **2건 (푸터 장식)** | **0** |

412×823 도 같다(948 / 66 / 144 → 562 / 2 / 0). 무스트레스는 전후 모두 이탈 2(장식)·런 0 — 자미두수·신년운세와 마찬가지로 **픽스처 문안으로는 안 넘친다. 결함은 잠복 상태였다**(긴 URL·연속 영숫자가 들어오면 터진다).

최악 범인: `h1` +588 · `.kdai-chapter__head h2` +363 ×12 · `.kdo-synthesis > h2` +344 · `.kdo-evidence__row dt` +277 ×39 · `.kdo-letter .kdo-kicker` +243 · `.kdo-deck__toc li` +239 ×15 · `.kdai-core-box span` +228 ×36. 터진 트랙: `.kdo-today__more ul` 트랙 562px / 상자 290px · `.kdai-core-box` 548px / 298px ×12.

🔴 위양성 2부류는 표본에서 빼야 한다(위 §OF 열 정정 에 일반화해 적었다) — 여기 해당 노드는 `table.kdo-radar__table.kdo-visually-hidden`(`ResultStyles.tsx:316-322`)과 `.kdo-tabs--mobile .kdo-tabs__list`(`overflow-x:auto` 가로 탭 레일)다. 안 빼면 **깨끗한 화면에서도 이탈 23·런 6** 이 나온다.

### 처방 (`ResultStyles.tsx` +18줄 · `KarmaDestinyAiClient.tsx` +2줄)

자미두수·신년운세의 A·B·C 를 그대로 옮겼다. 블록은 `<style>` 템플릿 리터럴 **맨 끝**(`prefers-reduced-motion` 블록 뒤)에 붙였다 — 같은 특이도에서 미디어쿼리를 이기려면 뒤여야 한다(신년운세 A′ 함정).

- **A** 암시적 1열 그리드 7종에 `grid-template-columns:minmax(0,1fr)`. 🔴 `.kdo-synthesis__body` 는 뺐다 — 이미 `minmax(0,1fr) 330px` 이고 미디어쿼리 안에도 `minmax(0,1fr)` 을 따로 갖고 있다.
- **B** 아이템 8종에 `min-width:0`. 라이브 그리드 조사에서 실제로 부모를 민 것은 5종이었고(감사표 "안눌린 5" 와 정확히 일치) 같은 컨테이너의 형제 3종을 함께 눌렀다.
- **C** 결과 화면 텍스트 20종에 `overflow-wrap:anywhere`. 감사표의 `keep-all 단독 13` 의 정체는 `ResultStyles.tsx` 11곳 + `KarmaDestinyAiClient.tsx` 2곳으로 라이브 집계와 맞았다.
- 상담 화면(`KarmaDestinyAiClient.tsx`)의 남은 2곳 — `.kdai-result-section p`(:3601) · `.kdai-chart-data dt`(:3905) — 에 짝을 붙여 13건을 소진했다. 🔴 **이 두 줄은 상담 화면이라 렌더 미검증이다**(픽스처 하네스가 결과 화면에만 있다). 다만 전자는 평범한 블록 산문이고 후자의 트랙은 `minmax(120px, .34fr)` 라 최소폭이 고정 120px — `overflow-wrap` 이 트랙 크기를 못 바꾼다(구조상 레이아웃 중립).

🔴 **두 파일 다 CRLF 다** — Edit/sed 로 고치면 전체 줄 diff 가 된다. node 패치 스크립트 + 개행 개수 검산으로 고쳤다(신년운세와 같은 함정, 메모리 `patch-crlf-files-with-a-node-script`).

### 비회귀 근거 — 같은 빌드 위 런타임 A/B

재빌드 없이 **이번 규칙만 `!important` 로 되돌린 화면(A)** 과 현재(B)를 전체 페이지로 촬영해 픽셀 대조했다. 진입 애니메이션은 양쪽 다 강제 노출하고 챕터·더보기를 모두 펼친 뒤 찍었다.

- 모바일 360: 양쪽 `360×35516` · **불일치 0 / 12,785,760px (0.000%)**
- 데스크탑 1280×900: 양쪽 `1280×26427` · **불일치 0 / 33,826,560px (0.000%)**

🔴 **계측기 유효성을 먼저 확인하고 읽을 것** — 같은 대조를 스트레스 문안으로 돌리면 `A 758×49265 ↔ B 360×60117` 로 크게 갈린다. 대조군 없는 픽셀 A/B 가 전부 "차이 0" 을 내는 함정을 이렇게 배제했다.

### 안 고친 것

- 잔여 이탈 2건은 공용 푸터의 절대배치 장식(`.sfhNebula`)이고 `overflow:hidden` 부모가 의도적으로 자른다 — 카르마 전용이 아니라 범위 밖이다.
- TT/IN/SA 축은 이번 PR 에서 안 봤다(원장 현재 단계는 keep-all 단독).

## 낙샤트라 (`/nakshatra/` · `/nakshatra/lord-report/` · `/nakshatra/dasha-map/`) — 09-05 수정 (#1589)

### 화면을 여는 법 — 픽스처가 없어 원장 시드로 열었다

낙샤트라는 dev-preview 픽스처가 없다. 대신 **해금 원장(localStorage)** 을 시드해 열었다 — `usePremiumReport`(`app/nakshatra/_premium/use-premium-report.ts`)가 `hasLedgerUnlock(featureKey)` 만 보고 본문을 자동 요청하기 때문이다. `app/_lib/optimistic-unlock-ledger.ts` 의 `cd_verified_unlock_grants_v1` 에 `nakshatra-lord-report::` · `nakshatra-dasha-map::` 을 `mode:"confirmed"` 로 넣고, 생년은 `sessionStorage["nakshatra:result:v1"]`(`NakshatraFormClient.tsx:17`)로 준다. 🔴 **결제 경로는 안 탄다** — `unlock()` 은 버튼 클릭에서만 불린다.

🔴 **5개 화면 중 3개는 이 방법으로도 못 연다.** `/nakshatra/muhurta/` · `/nakshatra/vvip/` · `/nakshatra/compat/` 는 본문 fetch 전에 `ensurePaidAccess`(useCoinGate)를 부른다. 그래서 `muhurta.module.css` 4곳 + `vvip.module.css` 4곳 = **keep-all 8건은 짝만 붙이고 렌더 미측정**이다(결함 없음이 아니다).

### 감사표의 "31" 재검 — 트리 전수, 정확히 일치

`git grep` 으로 `app/nakshatra` 전체를 셌다: `word-break: keep-all` **31** · `overflow-wrap` **0**. 즉 31건 전부 안 눌린 상태였고 감사표와 맞았다. 감사표가 짚은 6곳은 그중 일부일 뿐이다.

| 파일 | keep-all | 렌더 측정 |
|---|---|---|
| `_premium/premium.module.css` | 14 | 가능 (두 화면 공용) |
| `nakshatra.module.css` | 5 | 가능 |
| `dasha-map/dasha-timeline.module.css` | 4 | 가능 |
| `muhurta/muhurta.module.css` | 4 | **불가** (ensurePaidAccess) |
| `vvip/vvip.module.css` | 4 | **불가** (ensurePaidAccess) |

### 전/후 실측 (프로브 · 360×800, 412×823 도 같은 방향)

| 라우트 | 스트레스 · 전 | 스트레스 · 후 | 정상 문안 (전=후) |
|---|---|---|---|
| `/nakshatra/` | 360px / 0 / 0 | 360px / 0 / 0 | 360px / 0 / 0 |
| `/nakshatra/lord-report/` | 900px / 24 / 37 | **620px / 24 / 24** | 360px / 0 / 0 |
| `/nakshatra/dasha-map/` | 900px / 69 / 111 | **620px / 60 / 60** | 360px / 0 / 0 |

(문서폭 / 뷰포트 이탈 / 잘린 텍스트 런. 최악 이탈 +540px → **+260px**.)

🔴 **잔여 이탈은 결함이 아니라 스트레스 산물이다 — 근거를 남긴다.** 남은 것은 전부 `flex:none` 라벨 두 곳(`premium.module.css:298 .practiceLabel` ×12, `dasha-timeline.module.css:111 .subLord` ×36)이고, 뒤따르는 맨 `span` 12건은 그 라벨이 민 결과다(문서폭 620px = 라벨 max-content 폭). **프로덕션 값이 구조적으로 짧다** — 라벨은 `worker/lib/nakshatra-lord-report.js:444` 가 `실천 ${index+1}` 로 **기계 생성**하고, 로드명은 9그라하 고정표(`worker/lib/nakshatra-dasha-map.js:139` `ko(lord)` → 케투·라후 등 ≤3자)에서 나온다. dasha-map 은 애초에 bullets 자체가 없다. `flex:none` 을 풀면 정상 문안에서 짧은 라벨까지 줄바꿈될 수 있어 **일어날 수 없는 경우를 위해 흔한 경우를 망가뜨리는 교환**이라 안 건드렸다.

### 처방 (CSS 5개 파일 · +34/−13)

- **C** `word-break:keep-all` **31곳 전부**에 `overflow-wrap:anywhere` 를 짝지었다(31/31). 이것이 원장이 세던 축이다.
- **B** 측정에서 실제로 이탈한 `dasha-timeline.module.css .lord` 에 `min-width:0`, 런으로 새던 `.eastern` 에 `overflow-wrap:anywhere`. 이 둘은 keep-all 이 없어 C 에 안 잡혔지만 범위 안 결함이라 같은 커밋에서 고쳤다(원칙 3 폐기·14).
- **A 는 안 넣었다** — 허브의 암시적 1열 그리드(`.heroGrid`·`.trio`·`.steps`·`.relatedGrid`)와 `.grid3`/`.grid2` 는 360·412 양쪽에서 **이탈 0** 으로 측정됐다. 자미두수·카르마와 달리 여기선 근거가 없어 넣지 않았다(원칙 8).

### 비회귀 근거 — 같은 빌드 위 런타임 A/B

이번 커밋의 선언만 `!important` 로 되돌린 화면과 현재를 전체 페이지로 찍어 **원본 버퍼**를 비교했다(3라우트 × 모바일 360 / 데스크톱 1280×900).

- 정상 문안: 6/6 조합 **바이트 동일**(예: dasha-map 360 양쪽 `adcffd39d8a0` / 1,125,410B).
- 계측기 유효성: 같은 대조를 스트레스 문안으로 돌리면 프리미엄 2화면이 4/4 조합에서 **갈린다**(dasha-map 360: `a4ae28c1962f` 5.7MB ↔ `ec4ed5adfe5b` 2.7MB). 허브는 스텁 콘텐츠가 안 닿아 양쪽 다 동일한 것이 정상이다.

## 다른 전문가 상담 감사 — 소스 기준, **렌더 미측정** (09-05)

사용자 요청의 "다른 상담에도 이런 문제가 있는지"에 대한 답이다. 🔴 **아래는 정적 grep 집계이지 실측이 아니다** — 자미두수처럼 하네스를 붙여 재기 전에는 건수를 결함 수로 읽지 말 것. 실제로 유일한 "고정 최소폭" 적중(`app/vedic-ai/VedicAiClient.module.css:1693` `.dashaTrack{min-width:560px}`)은 바로 위 `.dashaTrackWrap{overflow-x:auto}`(:1690)가 감싼 **의도된 가로 레일**이라 위양성이었다.

축 4개 — **암시적 트랙**(`grid-template-columns` 없는 grid) · **안 눌린 트랙**(`1fr`/`auto` 라 min-content 바닥이 열린 트랙) · **keep-all 단독**(`overflow-wrap` 짝이 없음) · **고정 최소폭**(`min-width ≥280px`).

| 기능 | 합계 | 암시적 | 안눌린 | keep-all단독 | 고정최소폭 |
|---|---|---|---|---|---|
| 운명나침반 | 89 | 76 | 13 | 0 | 0 |
| 숙요 궁합 (제외 — 사용자 판정 "정상") | 73 | 28 | 11 | 34 | 0 |
| 낙샤트라 (수정 전) | 51 | 5 | 15 | 31 | 0 |
| 카르마 데스티니 (수정 전) | 41 | 23 | 5 | 13 | 0 |
| 신년운세 (수정 전) | 34 | 16 | 10 | 8 | 0 |
| 베다 점성 | 26 | 19 | 5 | 1 | 1 (위양성) |
| 자미두수 (수정 전) | 21 | 13 | 5 | 3 | 0 |
| 섬 상담 | 7 | 1 | 0 | 6 | 0 |
| 공용 결과 컴포넌트 | 4 | 4 | 0 | 0 | 0 |
| 인생책 | 2 | 1 | 1 | 0 | 0 |
| 연애비밀 | 1 | 1 | 0 | 0 | 0 |
| 서양 점성 · 작명 | 0 | — | — | — | — |

**가장 먼저 볼 것은 keep-all 단독 중 AI 본문에 걸린 것** — 자미두수에서 실제로 잘린 것이 정확히 이 형태였다(`.chatCard p{word-break:keep-all}`). 해당 위치:

- `app/island-consult/IslandConsultClient.tsx:952,955,965,990`
- ~~`app/karma-destiny-ai/KarmaDestinyAiClient.tsx:3599,3903` · `app/karma-destiny-ai/result/_components/ResultStyles.tsx:260,292,307,399`~~ → 09-05 완료 (위 §카르마 데스티니)
- ~~`app/new-year-ai-consultation/NewYearAiClient.tsx:1268,1341,1449,2280,2485,2657`~~ → 09-05 완료 (위 §신년운세)
- ~~`app/sukuyo-compatibility-ai/SukuyoCompatibilityAiClient.module.css:277,339,350,429,521,532`~~ → 09-05 제외: 사용자가 화면을 확인해 "정상" 으로 판정했다(수정 불요). 🔴 다시 감사하지 말 것
- `app/vedic-ai/VedicAiClient.module.css:735`
- ~~`app/nakshatra/dasha-map/dasha-timeline.module.css:10,53,70,112` · `app/nakshatra/muhurta/muhurta.module.css:44,93`~~ → 09-05 완료, 트리 전체 31곳으로 확장해 처리 (위 §낙샤트라). muhurta·vvip 8곳은 짝만 붙이고 **렌더 미측정**

기능별 결과 화면을 여는 수단은 제각각이다 — dev-preview 픽스처는 `lib/dev-preview/fixtures/` 8종뿐(astrology · karma-destiny · life-book · love-secret · new-year · sukuyo-compatibility · vedic · ziwei). `destiny-compass` · `island-consult` · `nakshatra/ai` · `naming-ai` 는 픽스처가 없어 **현재 측정 수단이 없다**(결함 없음이 아니라 미측정).

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
- 🔴 **공용 푸터 75건은 결함이 아니었다 — WCAG 2.5.8 AA 위반 0건(09-03 실측)이라 코드 변경 없이 종결했다.** 라우트당 TT<44 75건(`.sfhLink` 65 + `.sfhPolicyLink` 10, 16px)은 전부 **Spacing 예외**를 만족한다 — 각 타깃 박스 중심의 24px 지름 원이 다른 타깃의 박스와도, 다른 미달 타깃의 원과도 안 겹친다. 44px 은 AAA(2.5.5)일 뿐이고, 09-02 시뮬레이션(360×800·/saju/)대로 그 처방은 푸터 +742px·문서 +10.5%(24px 처방도 +226px·+3.2%)를 **전 라우트에** 물린다 — 적합성 이득 0 에 문서 무게만 늘어 기각했다. 🔴 **스캐너는 44px(AAA) 기준이라 앞으로도 라우트마다 이 75건을 계속 보고한다** — 다음 세션이 미해결로 다시 읽지 말 것.
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
- 🔴 **위 52번의 `min-h-*` 전수 grep 이 임의값과 고정높이를 놓친다** — `min-h-[36px]`·`min-h-[40px]`·`min-h-[24px]` 와 `h-10 w-10` 류가 그 패턴 밖이다. 배치 6 실제 위반의 대부분이 여기서 나왔고(리뷰 필터칩·정렬 select·작성모달 닫기·손금 결과 버튼·수호신 리포트 탭), **배치 2 범위였던 `SignFortuneView.tsx` 기간 칩 2건도 이 구멍으로 살아남아 있었다**(같은 PR 에서 인접 결함으로 함께 고쳤다). 다음부터는 `git grep -n "min-h-\[" ` 와 `git grep -nE "\bh-(8|9|10)\b"` 를 함께 돌린다.
- 🔴 **스캐너 호출은 PowerShell 로 한다** — Git Bash 로 `--routes=/about/,…` 을 넘기면 MSYS 가 선두 라우트를 `/C:/Program Files/Git/…` 로 재작성해 MISSING 이 된다. 그리고 `--help` 는 없어서 exit 1 을 낸다 — 인자는 `--routes --target --viewports --insets --settle --out --label --allow-stale` 뿐이다. 없는 라우트를 하나만 섞어도 전체 exit 이 1 이 되므로(`/fortune/daily/…` 는 없는 경로다 — SignFortuneView 표본은 `/fortune/today/aries/`) 목록을 dist 로 먼저 대조한다.
- 시드에 있으나 스캔 대상이 아닌 것 넷 — `/animal/totem/`·`/oracle/kemet/` 은 dist 에 페이지가 없어 404 다(위 index.html /services/ 7종과 같은 부류). `/oracle/hwatu/`·`/oracle/juyuk/` 은 App Router 가 아니라 **루트 정적 셸 승격본**이라(`scripts/static-canonical-route-map.mjs` 의 `source: "static-shell"`) 거기서 나온 위반(`input#subDailyHome` 13x13 · `cd-footer-legal__link` 15.1px · `cd-footer-langpick__btn` 32px · `a.cd-mobile-header__brand` 34x34)은 전부 위 표의 index.html 행 소관이다.
- 🔴 **배치 6 의 처방 3개는 공용 CSS 라 배치 밖으로 번진다** — `.cd-chip`(app 소비자 20파일) 36.8→44px, `.policy-doc__toc-link` `display:block`→`flex`+44px(≥1024px 은 `min-height:0` 으로 기존 높이 유지), `.policy-input` 15→16px(가입 동의 임베드 `policy-embed-*` 와 공유). 표본 `/astrology/guide/` 재계측에서 고유 TT<44=0·IN<16=0 으로 회귀 없음(09-03).
- 정책 문서 본문의 인라인 링크는 `destiny-poker` 선례대로 WCAG 2.5.8 Inline 예외로 두었다 — `/contact/` 4 · `/privacy/` 3 · `/advertising-policy/` 3 · `/editorial-policy/` 2 · `/disclaimer/` 1 · `/fortune/prompt-hub/` 의 `<li>` 업셀 7. `/palm-reading/` 의 4건은 보이지 않는 `1x1 input.sr-only` 파일 입력이고 방아쇠는 44px 이상 버튼이다.
- `destiny-poker` 의 TT<44 1건(115.9x20 `a "코드 데스티니 홈"`)은 문장 안 인라인 링크라 WCAG 2.5.8 Inline 예외 — 의도적으로 안 고쳤다. 🔴 인증 게이트가 있는 루트 셸(myungwun_final·yoga-guru·cosmic-soul-meditation 등)은 로컬에서 `/api/auth/me` 가 실패해 `window.history.back()` 으로 튕긴다. Playwright `addInitScript` 로 `sessionStorage.flower_admin_token` 에 `^[A-Za-z0-9_-]{20,}[.][0-9a-f]{64}$` 를 만족하는 더미 문자열을 심으면 통과한다(셸이 형식만 검사).
- 🔴 **`--cd-mnav-bar-h` 는 토큰이 아니라 실측값이다** — 56px 은 바 자신의 세로 패딩(위 6 + 아래 8)을 빼먹은 값이었고 실제 바깥 높이는 64.1px 이었다(09-03 실측 360×800·412×823/DPR 1.75). 그래서 ① `body.cd-mnav-mounted` 의 '여유 8px' 이 실제로는 **0px** 이라 본문 마지막 줄이 바에 붙었고 ② `--cd-mnav-offset`(= bar-h + safe-area)을 쓰는 **14곳**의 플로팅 UI 가 전부 8.1px 씩 바에 걸쳐 있었다(app-shell·destiny-compass·island-consult·prompt-hub·destiny-bias·master-love-codex·neo-war-room). 하단 패딩 8→12px 과 함께 토큰을 68px 로 고쳤고 수정 후 바는 정확히 68.1px 이다. 소비자 14곳은 전부 **바에서 멀어지는** 쪽으로 12px 움직이므로 교정 방향이고, `scripts/verify-master-love-codex-flow.mjs:601` 은 문자열 존재만 단언해 수치 가드가 안 깨진다.
- 🔴 **그 사고 형태를 무는 가드는 `__tests__/ui/mobile-bottom-nav-geometry.static.test.js`** (`test:node` 가 `__tests__/ui/*.test.js` 를 통째로 잡으므로 별도 배선 불필요). 토큰 < 상단패딩 + 링크 min-height + 하단여유 이면 실패한다 — 변이 5종(하단여유 12→8 · 본문여유 12→8 · bar-h 68→56 · bar-h 선언 삭제 · link min-height 선언 삭제)으로 실제로 무는 것을 확인했다. 🔴 **CSS 만 읽으므로 링크 내용물이 min-height 를 넘겨 자라는 것(실측 49~50px vs 선언 48px)은 못 본다** — 렌더 실측은 `measure-mobile-routes.mjs` 가 정본이다.
- 🔴 **앱 웹뷰의 탭바는 다른 파일이라 이번 수정이 안 간다** — `styles/mobile-lite.css:462-478` 의 `html.cd-mobile-runtime body #cdMobileBottomNav` 가 별도 표면이고 하단 여유 기본값이 아직 8px 이다. 이번 행의 범위(App Router `.cd-mnav`) 밖이라 손대지 않았다 — 앱 표면을 재는 세션이 생기면 같은 12px 로 맞춘다.
- **루트 셸 index.html 처방 4개**(09-03, 전부 인라인 `<style>` 안): 소셜 링크 34→44px · 언어칩 `min-height` 32→44px · `.cd-footer-legal__link` 에 `padding:5px 0`(15.1→25.1px — 줄바꿈으로 세로 인접했던 `이용약관`↔`Advertising Policy` 의 24px 원 교차 2건이 사라진다) · `.sub-daily-option` 신규 규칙(종전 CSS 0줄이라 체크박스가 13x13 이었다 → 44px `inline-flex` 행 + 18x18 체크박스, `#subDailyHome`·`#subDaily` 둘 다 덮는다). `a.cd-mobile-header__brand` 34x34 는 AA 통과라 뒀다 — 키우면 고정 헤더 높이가 바뀐다. 문서 높이 영향은 `/` 16344→16371(+0.17%) · `/about/` 8730→8746(+0.18%).
- 🔴 **index.html 또는 `styles/**/*.css` 를 건드리면 캐시버스트 키가 움직인다** — `sync:public` 의 `resolveDeterministicCacheKey()` 가 그 둘을 해시 재료로 쓰므로 `js/**` 의 `?v=build-…` 참조와 `public/**` 미러를 **같은 커밋에** 다시 만들어 담아야 한다. 이번 행에서 재생성된 것은 `js/` 6개 + `public/` 13개다. `build:cf` 부산물(`rss.xml`·`insights/rss.xml` 과 그 public 사본)은 되돌린다.
