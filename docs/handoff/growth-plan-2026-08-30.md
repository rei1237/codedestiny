---
status: active
updated: 2026-08-30
next: 1-D PR 머지 → 프로덕션 승격 → 1-E 고아 페이지 가드를 새 세션에서(계획 파일 §1-E)
---

# 성장 계획 2026-08-30 — 검색 유입·AdSense·첫인상

## 왜

"꿀꿀운세"로 검색해도 안 나오고, AdSense 는 계속 거절(2026-08-17 "가치 없는 콘텐츠"), 진입 화면이 기대감을 못 만든다.
예산·시간 제한 없이 전부 고친다. 승인된 계획 원문: `C:\Users\user\.claude\plans\zazzy-growing-whale.md`(5단계).

## 사용자 결정 (2026-08-30, 다시 묻지 말 것)

- 유명인 콘텐츠에서 **자미두수 제외**(생시 의존). 사주 + 숙요 + 베다 달 낙샤트라 근사만.
- 유명인 고유 서술은 **Claude 가 세션 안에서 초안**, 유료 LLM 호출 0. 사용자(박병하) 검수 후 `reviewedAt`.
- 이 작업 기간에는 **PR 머지 때마다 프로덕션 승격 위임** —
  `gh workflow run "Release Cloudflare Pages and Worker" --ref main -f mode=production` + 스모크(홈·/sitemap.xml 200, `npm run seo:check`).
- 저자 실명 **박병하, 명리학자 10년**. "대통령 운세 적중" 은 **공개 출처 링크를 받기 전엔 쓰지 않는다**(현재 미수령 → 미기재).
- 범위 A(브랜드·AdSense) + B(유명인) + C(홈 히어로) + D(MBTI 온사이트) 전부. 한 세션 = 한 단계.

## 지금 상태

- 1단계 PR 1(1-A+1-B): #1327 머지·프로덕션 승격 완료(2026-08-30, run 33308525595, 홈·sitemap 200, `seo:check` PASS).
- 1-C: #1328 머지·프로덕션 승격 완료(2026-08-30, run 33310144659, 홈·sitemap 200, `seo:check` PASS, 허브 산문 라이브 확인). sr-only 134 링크 제거와 편집자 노트는 **이미 main 에 있었다**(#1197) — 계획 파일 §1-C 의 그 두 줄은 낡은 서술.
- 1-D: PR 머지 대기(브랜치 `growth-stage1-thin-landings`). 계획 파일 §1-D 의 "23~1,092자" 도 낡은 수치였다 — #1193·#1195·#1230 이 7개 전부에 1,000자+ 를 이미 넣어 두었고, 남은 차이는 **sr-only 숨김**뿐이라 6개를 `ServiceIntroSection`(가시, 앱 아래)으로 옮겼다. `/oracle/ifa` 는 원래 가시(valueSections). `/saju-fpti` 사이트맵·`/tarot/healing/start` H1 은 각각 08-28·#1230 에서 해소.
- 2~5단계 미착수.

## 남은 작업

- [ ] 1-C 잔여: `lib/seo-site-urls.ts:41-45` 134 URL 열거 → 2단계 editorial 플래그로 대체(2단계에서 같이)
- [ ] 1-D 잔여: 프로덕션에서 6개 라우트 가시 섹션 **눈으로 1회 확인**(빌드 실측만 했고 스크린샷은 안 찍었다 — `visual-checker` 로)
- [ ] 1-E 고아 페이지 가드(`scripts/verify-adsense-readiness.mjs` 안, fail-closed)
- [ ] 2단계 유명인: `lib/famous-saju/celebrity-editorial.js` + `celebrity-multi-system.ts` + 가드 2개 + 색인 분기 3곳. T0 6명부터.
- [ ] 3단계 홈 히어로(3-A) → 폴드 아래 `<template>` 지연(3-B, 가시 텍스트 1,800자 실측이 선행)
- [ ] 4단계 의도 랜딩 · 5단계 MBTI 는 별도 Plan 세션
- [ ] 사용자: GSC 쿼리 CSV · 저자 공개 프로필 링크(→ `SITE_AUTHOR.sameAs`) · 네이버/Bing 재제출 · AdSense 재신청은 2단계 1차 승격 + 2주 뒤

판정 기준: 각 단계는 계획 파일의 "검증" 명령이 전부 초록 + 프로덕션 승격 스모크 200.

## 정본

- 저자 노드: `lib/structured-data.ts` `SITE_AUTHOR` · `buildAuthorPersonJsonLd()` (Article.author · /about · /methodology 가 같은 `#author`)
- 브랜드 가드: `__tests__/ui/site-name-signals.static.test.js` (application-name 축 · title 접미사 축 추가)

## 함정

- `sync:public` 이 로케일 미러의 `apple-mobile-web-app-title` 을 번역한다(`seo.appTitle`) — 가드는 ko 셸만 본다. `application-name` 은 전 미러 브랜드명.
- `sitemap:generate` 와 `test:node` 를 **동시에** 돌리면 test:node 가 1건 헛실패한다(2026-08-30 실측, 순차 재실행 605/605).
- 워크트리엔 node_modules 정션을 손으로 걸어야 한다(`cmd /c mklink /J` 는 PowerShell 에서).

## 검증

```
npm run typecheck && npm run test:node && npm run build:cf
npm run verify:editor-notes && npm run verify:seo-heading-integrity && npm run verify:sitemap-drift
```

## 모르는 것

- 저자 `sameAs` 에 넣을 공개 프로필 URL, "대통령 운세 적중" 의 출처 링크 — 사용자에게 받아야 한다.
