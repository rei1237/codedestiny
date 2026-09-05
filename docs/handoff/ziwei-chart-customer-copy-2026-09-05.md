---
status: active
updated: 2026-09-05
next: PR #1590 이 머지되면 스테이징 `/ziwei/chart` 결과 화면을 375px 로 재확인하고(아래 3가지), 이상 없으면 이 문서를 지운다
---

# 심화 자미두수(`/ziwei/chart`) 고객 문구·모바일 UX 개편

## 왜

"심화 자미두수가 고객 대상이 아니라 개발 문서처럼 보이고 모바일 UI/UX 도 부족하다." (2026-09-05)
결정: 카피 먼저 → 모바일은 목업 승인 후 / 해석 문장은 한국어 유지, 라벨만 5로케일 / 궁별 장문은 접이식 / 유료 PDF 패널은 범위 밖.

## 지금 상태

- PR1 **#1579** · PR2 **#1583** · PR3(모바일 IA) **#1587** 전부 머지. PR3 목업 승인본: https://claude.ai/code/artifact/6095584d-4581-4e0d-a8ea-e6cb9fc1be7f
- 스테이징 375×812 실측 **완료** — 핸드오프 판정 두 축 통과: 가로 오버플로 0(컨테이너 `scrollWidth 375 == clientWidth`), 격자 글자 57개 노드 최소 12px. 덤으로 탭 타깃 13개 모두 ≥44px.
- 그 측정에서 나온 결함 3건은 **PR #1590 열림, 사용자 머지 대기**(원칙 3·14: 범위 안이라 같은 변경에서 수정 + 가드).

## 남은 작업

- [ ] #1590 머지 후 스테이징 375px 재확인 — ① 구역 칩 1·2번 탭 가능(`elementFromPoint` 가 칩을 돌려주는지) ② 2줄 주성 궁(천이·복덕) 안 잘림 ③ 아래로 스크롤해도 뒤 페이지 안 비침. 이상 없으면 이 문서 삭제.
- 🔴 **로컬에서 못 잰다** — `measure:mobile-routes` 는 입력 화면까지만 닿는다. 결과 화면은 폼을 실제로 채워 제출해야 나오고(무료 열람, LLM·결제 호출 0회), `reducedMotion: "reduce"` 로 스무스 스크롤·framer-motion 을 죽인 뒤 재야 정지 프레임이 나온다.

## 결과 화면 구조 (다음에 손댈 때 딛는 지점)

- 루트 `<section>` = `fixed inset-0 overflow-y-auto` + **불투명 `bg-[#02030a]`**. 🔴 이 배경은 장식이 아니라 차폐다 — `GalaxyBackdrop` 은 `absolute inset-0` 이라 첫 화면 812px 만 덮고 내용과 함께 스크롤되어 사라진다. 지우면 오버레이 뒤 페이지의 "이어서 볼 만한 운세" 내비가 비친다.
- sticky 네비는 루트의 **직계 자식**. 🔴 `<m.div>` 안에 넣지 말 것(transform 조상이 sticky 를 죽인다). safe-area 상단 패딩은 루트가 아니라 네비가 든다.
- 🔴 네비는 `pl-36` 으로 왼쪽을 비운다 — `AppChrome` 의 `.cd-feature-nav`(뒤로·홈, `z-index 2147481200`, rect `12,12,124×44`)가 칩 1·2번을 덮기 때문. 이 라우트는 `.cd-mnav` 를 안 띄워서(`mnav: null`) `body.cd-mnav-mounted .cd-feature-nav{display:none}` 이 안 걸린다. **그 나브를 숨기지 말 것 — 결과 화면에 자체 닫기 버튼이 없어 유일한 탈출구다**(절대 규칙 6).
- 12궁 격자는 `sm:aspect-square` + 행 `minmax(min-content, 1fr)`. 🔴 무조건 `aspect-square` 로 되돌리지 말 것 — 375px 에서 주성 2줄 궁이 잘렸다(`clientHeight 71 vs scrollHeight 77`). 높이 미지정 그리드의 `1fr` 행은 최대 행의 min-content 로 정렬돼 네 행 높이가 유지된다.
- 구역 앵커 정본은 모듈 상수 `ZIWEI_RESULT_NAV`(배열 순서 = DOM = 칩 = 스크롤 스파이). 🔴 관찰 대상 5개는 중첩 금지. 전체폭은 `-mx-4 px-4`(+sm/lg) 대칭 음수 마진 — 🔴 `100vw`/`w-screen` 금지(가로 스크롤이 생긴다).
- 12궁 요약은 `<dl>` 카드 + 힘 미터. 보조성·대한·사화는 선택 궁 패널로 **이동**(삭제 아님).
- 가드 `scripts/verify-ziwei-chart-customer-copy.mjs` 검사 3(격자 폰트)·**검사 4(모바일 겹침: `pl-36`·행 min-content·`sm:aspect-square`·오버레이 배경)** 가동 중. 둘 다 블록 못 찾으면 fail-closed, 변이로 무는 것 확인.

## 정본 예시

- 문장 빌더 `app/components/ziwei/_lib/advanced-ziwei-reading.ts`, 라벨 `advanced-ziwei-copy.ts`(새 키는 EN 상수 + ko/ja/zh-CN/zh-TW 5블록 전부)
- 절 분리 정본 `app/_lib/ziwei-deep-reading.ts` `splitZiweiDeepCategories` — 화면이 `### N.` 정규식을 따로 들지 말 것.

## 함정

- 가드 검사 1은 빌더 출력만 본다. 챕터 산문은 `validateZiweiDeepReading` 담당.
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

- #1590 수정본의 375px 실렌더(위 §남은 작업). `pl-36` 은 모든 폭에 걸려 데스크톱에서도 칩 줄만 112px 들여쓰인다 — 눈으로 볼 때 같이 판단할 것.
- 셸 타일 액션이 `paid-feature-registry.js` 의 `premium-ziwei` 별칭으로 남아 있는데 타일은 "명반 무료" 표기 — 정리 여부는 사용자 판단.
