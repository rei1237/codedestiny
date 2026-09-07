---
status: active
updated: 2026-09-07
next: PR #1738(/points) 머지 → 아래 "남은 작업" 1번(#iljuCard). 다음 세션 첫 문장: "docs/handoff/home-perf-cwv-2026-09-07.md 를 읽고 #iljuCard CLS 구조 수정을 진행해".
---

# 프로덕션 CWV 개선 — 홈·`/points`·결과 카드

## 왜

프로덕션 `code-destiny.com`(스테이징 아님) 의 CWV. Before(2026-09-06~07 Cloudflare Web Analytics): **LCP P75 1,340 · P90 1,967 · P99 5,252ms · INP Poor 12% · CLS Poor 5%**. 🔴 **필드 수치는 배포 후 24시간 창을 채운 뒤에만 인용한다.**

## 지금 상태

- **PR #1734 머지 완료**(홈 히어로 srcset — 전송량 −69,015 B / −39.8%, 프로덕션 CDN 실측). 프로덕션 승격·재측정은 아직.
- **PR #1738 열림** (`perf/points-lcp-cls`) — `/points` LCP 5,364ms · CLS 0.524 수정. `app/points/MoonShopFrame.tsx` 를 신설해 로딩 폴백(`ssr:false`)·부팅 화면·본 렌더가 **같은 껍데기**를 쓰게 했다. 원인 3개(HTML 에 이미지·h1 없음 / 스켈레톤 기하 불일치 / `body:has(main.moon-shop)` 의 늦은 header·footer 제거)를 한 번에 없앤다. CI 감시 중.

## 남은 작업

- [ ] **`#iljuCard` CLS 1.517** (1순위, 구조 변경 RED). 실측: `#iljuCard` 0→721px @ click+4,396ms · `#tenshinCard` 0→683px · `#resultPage` 0→844px @ +7,862ms · `#aiPromptCard` 이동 @ +5,102ms. 코드 좌표(2026-09-07 조회): 마크업 `index.html:19719`(`display:none` 로 시작) · CSS `index.html:3305-3308`(데스크톱 `min-height:clamp(420px,60vw,560px)`, `contain:layout`) · `:3393-3395`(모바일 520px) · 렌더 `js/saju-engine.js:9419` `renderIlju(p)`, `:9444` 에서 `display='block'` · 호출 `js/saju-engine.js:5478`(`calculate()` 안, **동기 호출이지만 calculate 자체가 4~8초 걸린다**) · 레이아웃 원장 `index.html:35997`(`start: '#profileCard,.manse-grid,#iljuCard'`). 🔴 `min-height` 는 있지만 `display:none` 이라 **표시 전 높이가 0** 이고, 실제 721px 이라 520px 예약으로도 모자란다. 수정 후보: ① 결과 페이지 진입 시점에 카드를 `visibility:hidden` + 실측 높이 예약으로 바꾸고 렌더 완료 시 공개 ② 오프스크린 렌더 후 일괄 공개 ③ 라우트 전환. **국소 패치로는 안 된다.**
- [ ] **PR #1734·#1738 프로덕션 승격 후 24시간 뒤 Web Analytics 재측정** — 판정 기준은 LCP P90/P99 하락.
- [ ] `/points` 죽은 블록 정리(별도 PR) — `app/points/PointsClient.tsx:4916-5097` 이 `{false &&}` 로 죽어 있다. 3면 grep 판정 **조건부 안전**: 지우면 `scripts/verify-billing-pass-policy.mjs:646` 의 리터럴 단언(`<SubscriptionStatusCard subscription={subscription} />`, 유일 출처가 4980)을 살아있는 `<MoonlightActivePassCard`(`:4860`)로 **재조준**해야 하고, `SubscriptionSection`·`WalletCard`·`MonthlyCreditBonusCard`·`app/points/SubscriptionStatusCard.tsx` 가 미사용이 된다. 🔴 `verify-billing-pass-policy.mjs:48`·`:655-656` 이 `SubscriptionStatusCard.tsx` 를 **파일로 읽으므로** 그 파일을 지우면 가드가 ENOENT 로 죽는다.
- [ ] `contain-intrinsic-size` 드리프트 2건 — `#cdSignatureConsult` 827 vs 792(모바일)·999 vs 965(데스크톱, 과소) · `#fortuneGatewayEntry` 539 vs 561(과대)·613 vs 603(과소).
- [ ] `h1.moon-hero__title` 107 ↔ 54px 리플로우 — 홈 로컬 CLS 0.08 의 **실제** 구동원(`#dpMasterCard` 아님).
- [ ] `.moon-hero__cta--primary` INP 360ms — 205요소·1,173px 폼 일괄 노출(`index.html:15024-15031`).
- [ ] 홈 문서 2.94MB 인라인 외부화(script 1.48MB / style 1.59MB) — 대공사, 단독 과제.
- [ ] `.cd-hero-island` 스타일 블록 중복 — `index.html:1490-1495` 와 `:10662-10669` 바이트 동일.
- [ ] `PointsClient.tsx` 결제 성공 StarBurst 의 `animate-bounce`(impeccable `bounce-easing`).

## 함정

1. 🔴 **`main` 재병합 시 `config/sitemap-lastmod.json` 이 충돌한다.** `git checkout --theirs` → `npm run sitemap:generate` → `npm run sync:public` 순. 순서를 바꾸면 핀이 낡는다.
2. 🔴 **병합 뒤 `index.html` 90줄 변경은 정상**(전부 `?v=build-…` 핀). 살아있는지는 내용으로 본다 — `grep -c 'width=960,quality=72' index.html` = **3**, `grep -c 'savedOverviewScroll' index.html` = **2**.
3. 🔴 **`verify:hydrated-h1-integrity` 는 `dist/` 가 필요해 로컬에서 항상 실패한다** — CI 가 정본. 가드는 **파일을 정적으로 읽으므로 죽은 코드(`{false &&}`)의 h1 도 센다.** 서버 패스에서 이미 걸어간 파일은 클라이언트 패스에서 제외된다(`scripts/verify-hydrated-h1-integrity.mjs:241`).
4. 🔴 **부팅 게이트 로고를 176px 로 줄이지 말 것**(`index.html:608-616`). 같은 맨 URL 을 네 소비자가 공유하고 `verify-portone-single-payment-regression.mjs` 가 리터럴로 검사한다. **결제 경로 정책 변경이다.**
5. 🔴 **`#dpMasterCard` 의 `min-height:0!important`(`index.html:2844`) 를 되돌리지 말 것** — 성장(420→634px)이 **어떤 시프트도 만들지 않았다.**
6. 오버레이 `scrollTop` 대입을 `classList.add('is-open')` 앞으로 옮기는 것은 오답 — 그 전까지 `display:none` 이라 조용히 무시된다(`index.html:37125`).
7. 🔴 **워크트리 push 는 refspec 을 명시한다** — `git push origin <로컬>:<원격>`. 브랜치명이 달라 `git push` 만으로는 거부된다. 원격에 머지 드라이버가 `main` 을 자동 병합해 두므로 push 전 `git fetch` → `git merge origin/<원격브랜치>`.
8. 이미 기록된 것(perf:home 은 dist 를 잰다 · CLS 는 CPU 4x + Slow 4G 필수 · `.ignore` 윈도우 헛실패)은 메모리 `perf-and-visual-measurement-pitfalls` · `static-shell-pitfalls` 참조.

## 검증

```
npm run lint && npm run typecheck && npm run check:quick -- --skip-build
npm run verify:payment-choice-parity && npm run verify:payment-freeze
npm run verify:paid-gate-ui && npm run verify:billing-pass-policy && npm run verify:checkout-pass-card
node scripts/measure-home-section-heights.mjs      # contain-intrinsic-size 드리프트 판정
```
- 🔴 이미지 바이트는 **프로덕션에서만** 판정한다 — 로컬은 `/cdn-cgi/` 가 404 라 원본 폴백으로 낭비를 부풀린다.
- 🔴 `paid-flow-gates` 잡이 경로 필터로 자가 스킵될 수 있다 — 스킵되면 결제 검증기를 로컬에서 손으로 채운다.

## 모르는 것

- **필드 효과 전부 미측정.** 확정된 것은 히어로 전송량 −69,015 B 뿐. 🔴 수치 확인 전까지 성공으로 간주하지 않는다(사용자 지시).
- `#cdSigGrid` INP 832ms(n=2): 핸들러가 사실상 없다(순수 `<a href>`, 캡처 리스너 3개 전부 조기 return). 하드 내비게이션 비용으로 `추정`하며 **코드 레버를 못 찾았다.**
