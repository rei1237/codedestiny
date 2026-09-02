---
status: active
updated: 2026-09-02
next: PR #1453 머지 여부를 확인한다. 원 요청(축 1·2)은 전부 닫혔고, 남은 것은 초융합 히어로 제목 대비 2.85:1 하나다
---

# 초융합 홈 노출 + 진입/결과 모바일 개선

## 왜

> "메인 화면의 대표 운명 상담에는 초융합 운세를 추가해주고 초융합 운세의 메인 화면이나 결과 ui/ux를 폰트, 모바일 최적화 등을 고려해서 더 개선해줘"

계획: `.claude/plans/bubbly-painting-bumblebee.md` (축 1 = 홈 배너, 축 2 = 초융합 자체 UI).

## 지금 상태

- **머지됨** — #1431(축 1 홈 와이드 배너) · #1435(축 2 폰트·모바일) · #1437 · #1438(히어로→폼 CTA) · #1448(360폭 CTA 여유 7 → 39px).
- **열려 있음(사용자 머지 대기)** — **#1453** `fix/home-signature-consult-unfold`. 홈 `대표 운명 상담`의 `<details>` 접기를 그 섹션 하나만 풀고 `content-visibility` 두 줄을 재측정값(모바일 792px · 데스크탑 965px)으로 되살렸다.
  - 🔴 **캐시버스트(build-id) 파일 집합을 다른 셸 PR 들과 공유한다** — #1444·#1446·#1449 등 셸을 건드리는 PR 과 텍스트 충돌은 없지만 **나중에 머지되는 쪽이 rebase + `npm run sync:public` + force-push** 를 해야 한다.
- 계획의 인수 조건은 모두 닫혔고, 인수인계 이전 판의 "남은 작업" 2건도 닫혔다.

## 남은 작업

- [ ] **초융합 히어로 제목 대비 2.85:1** (360폭, 대형 텍스트 기준 3:1 미달). 배경 아트의 발광체가 제목 뒤로 비치는 자리다. #1448 이 만든 것이 아니고(그 전 2.84:1), **`verify:hero-contrast` 는 CSS 모듈 화면을 건너뛰므로 초록불이어도 이 화면을 안 본다**(메모리 `hero-contrast-guard-skips-css-module-files`). 고치려면 히어로 베일 그라디언트나 제목 그림자를 손대야 하고 **아트워크 인상이 함께 바뀐다** — 사용자 확인이 필요하다.
- [ ] (선택) 초융합 배너 카드의 가격칩 대비 5.37:1 — AA 는 통과, AAA 미달. 지금 손댈 이유는 없다.

## 정본 예시

- 초융합 진입/결과 클라이언트: `app/fusion-fortune/FusionFortuneClient.tsx` (CRLF 파일)
- 그 화면의 CSS: `app/fusion-fortune/fusion-fortune.module.css` (LF)
- 전용 가드: `__tests__/ui/fusion-fortune.static.test.js`
- 홈 접기 정본: `index.html` 의 `cd-home-fold-v20260902` 스타일·스크립트 블록. 접기 부트 스크립트는 **앵커 클릭과 `hashchange` 에서만** 펼치고 뷰포트 진입·데스크탑에서 자동으로 열지 않는다.
- 홈 섹션 예약 높이 목록: `index.html` 의 `content-visibility` 블록 2개(모바일 `html.cd-mobile-runtime` · 데스크탑 `html:not(.cd-mobile-runtime)`)와 그 위 842행 주석.

## 함정

- 🔴 `__tests__/ui/**` 는 **jest 가 건너뛴다** — `node --test` 로 돌린다(메모리 `jest-skips-the-static-source-guards`).
- 🔴 `content-visibility: auto` 가 걸린 섹션은 **Playwright 요소 스크린샷이 백지로 나온다** — 캡처 중 스크롤·이어붙이기를 하는 동안 렌더를 건너뛰기 때문이다. 섹션이 통째로 들어가는 높이로 뷰포트를 키워 찍을 것(실측: 1350x940 백지 → 1350x1200 정상).
- 🔴 `content-visibility` 가 걸린 섹션의 **높이를 그 상태로 재면 `contain-intrinsic-size` 를 되읽는 순환**이다. `content-visibility: visible` 로 풀고 잰다.
- 🔴 셸(`index.html`)을 고치면 `config/sitemap-lastmod.json` 의 `/`·`/en/`·`/ja/`·`/zh/`·`/zh-tw/` 5개 서명이 바뀐다. `npm run sitemap:generate` 산출물까지 같은 커밋에 담지 않으면 CI 가 "Typecheck and lint" 이름으로 실패한다.
- 🔴 결과 화면 실렌더는 **LLM 실호출 없이** 된다 — `worker/lib/fusion-fortune.js` 의 `generateFusionFortuneWithMockLLM` 산출물을 `/api/fusion-fortune/result` 스텁으로 주입하고 `?cid=` 로 진입한다.
- 🔴 기본 PDF 경로 `exportFusionReportPdf` 는 **DOM 캡처가 아니라 jsPDF 텍스트 조판**이다. `data-fusion-pdf-section` 캡처는 R2 한글 폰트 실패 시의 폴백이므로, 타이포·폭 변경은 기본 경로 PDF 본문을 바꾸지 않는다.
- `npm run build` 전에 `npm run fortune:build-data` 를 돌리지 않으면 `fortune/data/daily-<내일>.json` 에서 프리렌더가 죽는다. 빌드는 `.ignore`·`rss.xml` 4벌을 부수효과로 더럽히므로 커밋 전에 되돌린다.
- Playwright 라우트 핸들러는 **등록 역순**으로 매칭된다 — catch-all 을 먼저 등록할 것.

## 검증

```
npm run test:node                             # 620 pass
npm run lint && npm run typecheck
npm run verify:home-service-registry          # recommended 5개 · 상세 문안 44/44
node scripts/verify-master-love-codex-flow.mjs
npm run verify:hero-firstpaint-lock
npm run verify:adsense-readiness
npm run verify:fusion-fortune-pdf             # 12개 장 · 22,810자 계약
npm run verify:hero-contrast                  # 🔴 CSS 모듈 화면은 안 본다
npm run verify:mobile-detail-nonintrusive
npm run verify:public-mirror-fresh            # 🔴 로컬 Windows 는 .ignore 개행 1건으로 위양성
```
