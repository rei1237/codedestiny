---
status: active
updated: 2026-09-05
next: PR #1587 이 머지되면 스테이징 `/ziwei/chart` 결과 화면을 375px 로 눈으로 확인하고, 이상 없으면 이 문서를 지운다
---

# 심화 자미두수(`/ziwei/chart`) 고객 문구·모바일 UX 개편

## 왜

"심화 자미두수가 고객 대상이 아니라 개발 문서처럼 보이고 모바일 UI/UX 도 부족하다. 급선무는 문구·내용을 고객 대상 심화 설명으로 바꾸는 것." (2026-09-05)
결정: 카피 PR 먼저 → 모바일은 목업 승인 후 / 해석 문장은 한국어 유지, 라벨만 5로케일 / 궁별 장문은 접이식 / 유료 PDF 패널은 범위 밖.

## 지금 상태

- PR1(문장·라벨 고객화) **#1579 머지** · PR2(챕터 아코디언) **#1583 머지** · PR3(모바일 IA) **#1587 열림, 사용자 머지 대기**.
- PR3 목업 승인본: https://claude.ai/code/artifact/6095584d-4581-4e0d-a8ea-e6cb9fc1be7f (원칙 16 절차 완료).
- PR3 로컬 게이트 전부 통과(아래 §검증 목록 그대로).
- 원칙 9 의 `check:critical`(#1569 삭제 + PR2 가 다른 PR 로 나뉜 건) **완료**.

## 남은 작업

- [ ] #1587 머지 후 스테이징에서 `/ziwei/chart` **결과** 화면을 375px 로 확인. 판정: 가로 오버플로 0, 격자 글자 12px 이상. 🔴 **로컬에서 못 쟀다** — `measure:mobile-routes` 는 입력 화면까지만 닿고 결과 화면은 실제 명반 + 결제 게이트를 지나야 나온다.

## PR3 가 만든 구조 (다음에 손댈 때 딛는 지점)

- 결과 루트 `<section>` = `fixed inset-0 overflow-y-auto`, sticky 네비는 그 **직계 자식**. 🔴 `<m.div>` 안에 넣지 말 것 — transform 조상이 생겨 sticky 가 죽는다. safe-area 상단 패딩은 루트가 아니라 네비가 든다(sticky 기준 사각형은 스크롤 컨테이너의 padding box).
- 구역 앵커 정본은 모듈 상수 `ZIWEI_RESULT_NAV` — 배열 순서 = DOM 순서 = 칩 순서 = 스크롤 스파이 관찰 대상. 🔴 관찰 대상 5개는 서로 **중첩되면 안 된다**(최상단 교차 선택이 오작동).
- 전체폭은 `-mx-4 px-4`(+sm/lg) 대칭 음수 마진. 🔴 `100vw`/`w-screen` 금지 — `overflow-y:auto` 가 `overflow-x` 를 `auto` 로 계산해 가로 스크롤이 생긴다.
- 12궁 격자는 `aspect-square` 4×4(가로 스크롤 래퍼 제거). 칸에는 궁명·지지·주성만 남기고 보조성·대한·사화는 선택 궁 패널의 "이 궁에 앉은 별" 카드로 **이동**(삭제 아님).
- 12궁 요약은 6열 표 → `<dl>` 카드 + 힘 미터. 표 전용이던 `tableColPalace`·`tableColDefinition` 만 삭제(3면 grep 0건), 나머지 4개 라벨은 카드에서 계속 쓴다.
- 가드 검사 3(격자 폰트) **가동 중** — `scripts/verify-ziwei-chart-customer-copy.mjs`. 격자 블록만 잘라 12px 미만 클래스를 잡고 블록을 못 찾으면 fail-closed. 변이 2종(작은 폰트 주입·마커 제거)으로 무는 것 확인.

## 정본 예시

- 문장 빌더 `app/components/ziwei/_lib/advanced-ziwei-reading.ts`, 라벨 `advanced-ziwei-copy.ts`(새 키는 EN 상수 + ko/ja/zh-CN/zh-TW 5블록 전부)
- 절 분리 정본 `app/_lib/ziwei-deep-reading.ts` `splitZiweiDeepCategories` — 화면이 `### N.` 정규식을 따로 들지 말 것.

## 함정

- 가드 검사 1은 빌더 출력만 본다. 챕터 산문은 `validateZiweiDeepReading` 담당이라 가드에 다시 넣지 않는다.
- `__tests__/ui/paid-result-locale-copy.test.js` 는 jest 가 무시한다 → `node --test`.
- `check:quick` 이 `rss.xml` 4벌의 `lastBuildDate` 와 `.ignore` 줄끝을 건드린다 — 범위 밖이므로 커밋 전에 `git checkout --` 로 되돌린다.
- `app/**` 을 고쳤으면 `sitemap:generate` 산출물이 같은 커밋에 있어야 한다.
- CRLF 패치·workers-og 로컬 빌드 실패는 메모리 `patch-crlf-files-with-a-node-script`·`local-build-worker-fails-workers-og-missing`.
- `normalize-ziwei-input.ts:185-254` ko 경고 문장에 "계산/데이터" 가 남아 있다(범위 밖, 미수정).

## 검증

```
npm run verify:ziwei-chart-customer-copy
npm run verify:ziwei-deep-report-flow
npm run verify:ziwei-deep-counseling-quality
npm run verify:mobile-detail-nonintrusive
npm run verify:guard-wiring
npm run verify:hero-contrast
npm run typecheck && npm run lint
npm run sitemap:generate && npm run verify:sitemap-drift
node --test __tests__/ui/paid-result-locale-copy.test.js
npm run check:quick
```

## 모르는 것

- 375px 실렌더(위 §남은 작업).
- 셸 타일 액션이 `paid-feature-registry.js` 의 `premium-ziwei` 별칭으로 남아 있는데 타일은 "명반 무료" 표기 — 정리 여부는 사용자 판단.
