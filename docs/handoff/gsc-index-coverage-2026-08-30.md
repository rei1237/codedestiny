---
status: active
updated: 2026-08-30
next: 사용자에게 GSC "발견됨 - 현재 색인이 생성되지 않음"(173) per-URL 내보내기를 받아 미크롤 클러스터를 확정한다
---

# GSC 색인 커버리지 — 크롤 도달 거리

## 왜

"GSC 색인 데이터로 SEO 최적화를 꼼꼼하고 정확하게 진행해줘". 사용자가 "페이지 색인 생성" 4종 CSV 를 주면서 `gsc-performance-2026-08-30.md` §4-2 의 보류가 풀렸다.

## 지금 상태

- PR #1338 (`worktree-seo-crawl-depth`) — 도달 거리 단축 3건 + `verify:internal-link-depth` 신설. 사용자 머지 대기.
- 이 문서 이전의 판정은 `gsc-coverage-drilldown-2026-08-30.md`(404·크롤됨-미색인 종결)와 겹치지 않는다.

## 확정된 판정 (다시 재지 말 것)

- **기술적 색인성은 깨끗하다.** 사이트맵 439 전수 라이브 스윕: 200 × 439 · noindex 0 · canonical 불일치 0 · canonical 누락 0 · `h1 ≠ 1` 0 · 중복 title 0 · X-Robots-Tag 0.
- **병목은 크롤 도달이다.** 색인 생성됨 285 < 439 → 미색인 ≥ 154. 그중 404 목록 2개·크롤됨-미색인 목록 7개만 매칭 → **≥145 가 "구글이 한 번도 가 보지 않은" 사이트맵 URL**. 같은 날 링크 실측에서 3홉 `/fortune/{기간}/{sign}` 96개 중 92개, 4홉 `/stories/*` 45개 전부가 노출 0 이었다(141 vs 145).
- **홉 수 상한은 2다.** 3홉을 상한으로 두면 위 결함을 그대로 통과시킨다 — 실측으로 정한 값이라 완화하지 말 것.

## 남은 작업

- [ ] **사용자 요청**: GSC "발견됨 - 현재 색인이 생성되지 않음"(173) per-URL 내보내기. 지금은 ≥145 라는 **산술 하한**까지만 증명돼 있다. 그 파일이 있으면 어느 클러스터가 미크롤인지 갈린다.
- [ ] **사이트맵 `lastmod` 신호 오염** — 라이브 439개 중 318개가 배포일. 원인은 `scripts/lib/sitemap-lastmod.mjs` 가 서명에 **전이 import 클로저**를 넣는 설계라 공유 크롬 한 줄이 수백 라우트를 "오늘 바뀜"으로 만드는 것. 이번 PR 은 서명 6개만 갱신·날짜 변경 0건이었는데, 그건 원장 315개 중 311개가 #1301 로 이미 오늘 날짜였기 때문이다(**가려진 것이지 고쳐진 게 아니다**). 고칠 때 서명 스킴 버전을 올리되 기존 날짜를 보존해야 하고(안 그러면 315개가 한 번에 튄다) `verify:sitemap-drift` 와 정면으로 맞물린다.
- [ ] **`/saju-fpti` 정책 드리프트** — `lib/seo/siteSeo.ts:401` 의 `noindexPathPrefixes` 에 있는데 `scripts/generate-sitemap.mjs:222` 가 사이트맵에 싣고, `public/_headers` 에 규칙이 없으며 `app/saju-fpti/page.tsx:31` 은 `generatePageMetadata` 를 안 쓴다. 어느 쪽으로 맞출지는 **사용자 판단**.
- [ ] **`/destiny-poker` 링크 형태 불일치** — 내부 링크는 `/destiny-poker.html`, canonical·사이트맵은 `/destiny-poker`. 새 가드는 둘을 같은 노드로 보고 넘어가지만 크롤러 관점에서는 낭비다.

## 정본 예시

`scripts/verify-internal-link-depth.mjs` 헤더 — 무엇을 간선으로 세는지(①~④)와 상한 근거가 거기 있다. `DECLARED_EXCEPTIONS` 가 유일한 예외 통로다.

## 함정

- **hreflang 을 간선에서 빼면 로케일 라우트 21개가 헛실패한다.** 구글은 `rel="alternate"` 를 발견 경로로 쓴다 — 이건 임계 완화가 아니라 그래프 정정이다.
- 홈 셸 링크를 만지면 `public/i18n/*.json` **12개 전부**에 키가 필요하다(저작은 5개, 나머지는 영어 사본).
- 푸터 링크는 `SiteFooterHub.jsx` 와 `lib/i18n/siteFooterHubCopy.ts` **양쪽**에 넣어야 한다. 후자를 빼면 `locale-footer.static.test.js` 가 실패한다.

## 검증

```
npm run build:cf && npm run verify:internal-link-depth
npm run verify:internal-link-depth -- --report   # 임계 없이 분포만
npm run seo:check                                # 🔴 growth-plan 의 check:seo-health 는 오기다
```

## 모르는 것

- 도달 거리를 줄이면 실제로 크롤이 붙는지 — GSC 반영에 2~4주가 걸린다. 다음 확인 시점에 "발견됨-미색인" 173 이 줄었는지로 판정한다.
