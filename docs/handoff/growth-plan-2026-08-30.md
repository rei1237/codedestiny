---
status: active
updated: 2026-08-30
next: 2단계 PR #1340 머지 → 프로덕션 승격 → 사용자 검수 후 reviewedAt 켜기 → T1 인물 확장 또는 3단계 홈 히어로
---

# 성장 계획 2026-08-30 — 검색 유입·AdSense·첫인상

## 왜

"꿀꿀운세"로 검색해도 안 나오고, AdSense 는 계속 거절(2026-08-17 "가치 없는 콘텐츠"), 진입 화면이 기대감을 못 만든다.
예산·시간 제한 없이 전부 고친다. 승인된 계획 원문: `C:\Users\user\.claude\plans\zazzy-growing-whale.md`(5단계).

## 사용자 결정 (2026-08-30, 다시 묻지 말 것)

- 유명인 콘텐츠에서 **자미두수 제외**(생시 의존). 사주 + 숙요 + 베다 달 낙샤트라 근사만.
- 유명인 고유 서술은 **Claude 가 세션 안에서 초안**, 유료 LLM 호출 0. 사용자(박병하) 검수 후 `reviewedAt`. **검수 전 인물은 색인되지 않는다**(가드).
- 이 작업 기간에는 **PR 머지 때마다 프로덕션 승격 위임** —
  `gh workflow run "Release Cloudflare Pages and Worker" --ref main -f mode=production` + 스모크(홈·/sitemap.xml 200, `npm run seo:check`).
- 저자 실명 **박병하, 명리학자 10년**. "대통령 운세 적중" 은 **공개 출처 링크를 받기 전엔 쓰지 않는다**(현재 미수령 → 미기재).
- 범위 A(브랜드·AdSense) + B(유명인) + C(홈 히어로) + D(MBTI 온사이트) 전부. 한 세션 = 한 단계.

## 지금 상태

- 1단계(1-A~1-E) 전부 main 머지·프로덕션 승격 완료. 마지막 승격 run 33314844807(2026-08-30, main 9de4ccfe5 = #1334 포함).
- 2단계 1차: **PR #1340 머지 대기**(브랜치 `worktree-growth-stage2-celebrity-t0`). 내용은 PR 본문이 정본. 요지:
  - `lib/famous-saju/celebrity-editorial.js` — T0 6명 원고, **전부 `reviewedAt: null`(초안) → 아직 아무 상세 페이지도 색인되지 않는다.**
  - `lib/famous-saju/celebrity-multi-system.ts` — 사주·숙요·베다 3줄 표(자미두수 없음).
  - 색인 분기 3곳(`[slug]/page.tsx` robots · `generate-sitemap.mjs` · `verify-adsense-readiness.mjs`) + `lib/seo-site-urls.ts` 가 전부 `reviewedAt` 하나를 본다. 1-C 잔여(134 URL 열거)도 이걸로 해소.
  - 가드 `verify:famous-saju-editorial` · `verify:famous-saju-multisystem` — PR CI fast 잡 배선 완료.
- 3~5단계 미착수.

## 검수 대기 인물 (사용자 = 박병하)

`lib/famous-saju/celebrity-editorial.js` 에서 원고를 읽고 문제 없으면 **그 인물의 `reviewedAt: null` → `"YYYY-MM-DD"`(검수한 날)** 로 바꾼다. 그게 발행 스위치다 — robots index · 사이트맵 등재(lastmod=그 날짜) · Article.author=박병하 Person · citation 이 한꺼번에 켜진다.

| slug | 인물 | 일주/일간 | 숙요 | 베다 달 |
|---|---|---|---|---|
| yi-sun-sin | 이순신 | 경오/금 | 산출 안 함(1545) | 산출 안 함(1582 이전) |
| king-sejong | 세종대왕 | 임진/수 | 산출 안 함 | 산출 안 함 |
| yu-gwan-sun | 유관순 | 계유/수 | 정(井) 확정 | 아르드라 또는 푸나르바수 |
| an-jung-geun | 안중근 | 무자/토 | 산출 안 함(1879) | 푸르바바드라 또는 우타라바드라 |
| kim-gu | 김구 | 기사/토 | 산출 안 함(1876) | 물라 또는 푸르바샤다 |
| jeong-yak-yong | 정약용 | 정미/화 | 산출 안 함(1762) | 스라바나 또는 다니스타 |

- 검수 절차(에이전트가 대신 켜도 된다 — 단, 사용자가 "검수했다"고 말한 인물만): 브랜치에서 `reviewedAt` 수정 → `npm run verify:famous-saju-editorial` → `npm run sitemap:generate`(사이트맵·원장 변경분 커밋) → PR. 원고 문장을 고치면 `chart` 앵커·분량·중복도 가드가 다시 돈다.
- 🔴 `reviewedAt` 은 미래 날짜 불가, 원고 문장이 엔진 값과 어긋나면 가드가 막는다(엔진이 바뀌어도 잡힌다).

## 남은 작업

- [ ] 사용자: #1340 머지 → 에이전트: 프로덕션 승격 + 스모크(위 명령) — 승격 후 `/insights/famous-saju/yu-gwan-sun/` 에서 다체계 표·"검수 전 초안" 문구 눈으로 1회 확인
- [ ] 사용자: T0 6명 원고 검수 → `reviewedAt` 켜기(위 절차). **AdSense 재신청은 검수된 인물이 실제로 색인에 오른 승격 + 2주 뒤.**
- [ ] 2단계 2차: T1 인물 확장(계획 파일 §2 의 T1 목록). 같은 파일에 항목만 추가하면 나머지는 자동. 한 세션에 6명 내외가 한계(원고 1건 ≈ 900자 × 3 + 교차 해설).
- [ ] 1-D·1-E 잔여: 프로덕션에서 6개 랜딩 가시 섹션과 `/insights` 하단 아카이브 그리드 **눈으로 1회 확인**(`visual-checker`)
- [ ] 3단계 홈 히어로(3-A) → 폴드 아래 `<template>` 지연(3-B, 가시 텍스트 1,800자 실측이 선행)
- [ ] 4단계 의도 랜딩 · 5단계 MBTI 는 별도 Plan 세션
- [ ] 사용자: GSC 쿼리 CSV · 저자 공개 프로필 링크(→ `SITE_AUTHOR.sameAs`) · 네이버/Bing 재제출

판정 기준: 각 단계는 계획 파일의 "검증" 명령이 전부 초록 + 프로덕션 승격 스모크 200.

## 정본

- 색인 스위치: `lib/famous-saju/celebrity-editorial.js` `reviewedAt` (읽는 곳 4: page robots · sitemap · readiness · seo-site-urls)
- 저자 노드: `lib/structured-data.ts` `SITE_AUTHOR` · `buildAuthorPersonJsonLd()`
- 브랜드 가드: `__tests__/ui/site-name-signals.static.test.js`
- 원고 중복도 도구: `scripts/lib/text-shingles.mjs`(editor-notes 와 공유, 8-gram Jaccard)

## 함정

- `sitemap:generate` 와 `test:node` 를 **동시에** 돌리면 test:node 가 1건 헛실패한다(순차 재실행 정상).
- `[slug]/page.tsx` 나 `lib/seo-site-urls.ts` 를 고치면 `config/sitemap-lastmod.json` 서명 68건이 바뀐다 — `sitemap:generate` 후 원장을 같이 커밋해야 `verify:sitemap-drift` 가 산다.
- Write 툴로 만든 `.mjs` 에 NUL 바이트가 한 번 들어갔다(`git diff --numstat` 의 `- -` 로 발견). 새 파일은 numstat 을 본다.
- 워크트리엔 node_modules 정션을 손으로 걸어야 한다(`cmd /c mklink /J` 는 PowerShell 에서).
- `sync:public` 이 로케일 미러의 `apple-mobile-web-app-title` 을 번역한다 — 가드는 ko 셸만 본다.

## 검증

```
npm run verify:famous-saju-editorial && npm run verify:famous-saju-multisystem
npm run typecheck && npm run test:node && npm run build:cf
npm run verify:editor-notes && npm run verify:seo-heading-integrity && npm run verify:sitemap-drift
```

## 모르는 것

- 저자 `sameAs` 에 넣을 공개 프로필 URL, "대통령 운세 적중" 의 출처 링크 — 사용자에게 받아야 한다.
- 검수에서 원고가 크게 바뀌면 분량 700자·중복도 0.3 임계가 맞는지 — 첫 검수 결과를 보고 조정.
