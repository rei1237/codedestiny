---
status: active
updated: 2026-08-30
next: "docs/code-destiny-audit.md §5 P3(얇은 라우트 7개 본문). P1·P2 는 끝났다. 홈 '고르는 면' 추가 축소는 아래 '기각' 절을 먼저 읽을 것"
---

# 홈 포지셔닝 · 단순화

## 왜

사용자 요구: 기능을 늘리지 말고 기존 자산으로 이해도·전환을 올릴 것. **첫 방문자가 5초 안에 차별점을 이해**해야 한다.
이어서 지적: *"실제 교차검증을 안 하는 기능이 많아 문구 교정만으로는 안 된다. 메인 화면을 직관적으로 단순하게."*

## 지금 상태

PR **#1298 머지됨**(2026-08-30 00:50Z). 이어서 P2 를 브랜치 `worktree-home-whyus-before-signature`(origin/main 분기)에서 작업했다. 삭제 0건 · 라우트/결제 경로 변경 0건.

1. H1·lead — 교차검증 주장을 사이트 전체가 아니라 `/fusion-fortune/` 한 상품으로 좁히고, 무료 경계를 같은 줄에서 밝혔다.
2. `#cdTodayPick` 접기(`data-cd-home-secondary`).
3. `#cdWhyUs` 에 교차검증 결과 형태(`.cd-why-us__proof`) 추가.
4. (P2) `#cdWhyUs` 를 자기 `<style id="cd-why-us-v20260824">`·주석과 함께 `#cdSignatureConsult` **앞으로** 이동. 82줄 순수 이동, 문구 변경 0건.

감사·로드맵은 [docs/code-destiny-audit.md](../code-destiny-audit.md) §5(P1~P6).

## 🔴 기각한 단순화 — 다시 시도하기 전에 읽을 것

"홈에 고르는 면이 9개다"는 계획을 세웠다가, 착수 전 실측에서 **4개 중 3개가 틀린 전제**로 드러났다. 같은 함정을 반복하지 않게 근거를 남긴다.

| 하려던 것 | 왜 안 되는가 |
|---|---|
| `#cdServiceIndex` 접기 | 이 섹션이 `#cdHomeExpandToggle` 의 **유일한 호스트**다. 접으면 `#cdHomeSecondaryPanel`(`index.html:14415`, 목적지 11개)이 영구히 안 열린다. |
| `#cdSignatureConsult` 접기 | 첫 화면에서 **가격을 보여 주는 유일한 면**이다(20,000원~ / 5,000원~ / 30,000원). `#cdConcernPick` 의 유료 CTA 는 "추천 상담 열기"뿐이고 가격이 없다. 옮기려면 가격 이관이 선행이다. |
| "`#cdSignatureConsult` 4개 중 3개가 `#cdConcernPick` 과 중복" | **첫 화면 중복이 아니다.** concern 패널 6개 중 5개가 `hidden` 이라 첫 페인트에 보이는 유료 상품은 `/master-love-codex/` 1개뿐이다. href 를 통째로 세면 중복이 부풀려진다. |
| `#cdQuickServices` 를 `#cdFinder` 로 통합 | `js/core/home-service-finder.js:287` 이 입력·칩 선택 전에는 `panel.hidden = true` 로 **아무것도 렌더하지 않는다.** 접으면 무료 진입 6개가 대체 없이 사라진다. 기본 `roles:quick` 렌더를 새로 만들어야 하는데, 같은 파일 주석이 지연 렌더가 CLS 0.3185 를 만든 실측을 경고한다. |
| "보이는 fg-group 3개"(`index.html:19374`·`19420`·`19461`) 접기 | 홈이 아니다. `<main id="inputPage">` 는 **9086..18777** 이고, 그 3개는 `<article id="resultPage" style="display:none">` 안 = 사주 결과 페이지다. 접으면 결과 페이지가 깨진다. |

**실제로 접을 수 있었던 것은 `#cdTodayPick` 하나뿐**이었다(목적지 1개 `/nakshatra/`, 13줄 아래 `#cdSignatureConsult` 카드에 "무료 공개" 배지로 그대로 있음, 구동 JS 0건).

결론: **접기 장치는 이미 쓸 수 있는 곳에 다 쓰여 있다.** 홈 밀도를 더 줄이려면 접기가 아니라 (a) `#cdFinder` 기본 렌더 신설 또는 (b) 가격 이관 후 대표 상담 통합이 선행이어야 하고, 둘 다 새 동작이라 별도 PR·별도 CLS 실측이 필요하다.

## P1 실측 (2026-08-30, 로컬 dist + Chrome headless CDP)

| 프로필 | 히어로 높이 | 12초간 높이 변화 | CLS | H1 줄 |
|---|---|---|---|---|
| 390x844 DPR3 | 618px | **0px** | 0.00082 | 3 |
| 412x823 DPR1.75 | 605px | **0px** | 0.00082 | 3 |

- 잡힌 시프트는 1건이고 히어로가 아니다 — `div.theme-switch-pill`(1.2~1.9초).
- 390px 에서 lead 는 3줄인데 **잘리지 않는다**: 활성 런타임에서 `-webkit-line-clamp` 가 `none` 으로 풀리고 `clientHeight == scrollHeight`(75px).
- 🔴 **광고발 CLS 는 안 들어 있다**(로컬 dist). 이 수치는 히어로가 첫 페인트 뒤 안 움직인다는 근거이지 홈 전체 CLS 가 아니다 — 그건 프로덕션에서만 유효하다.
- 재현: dist 를 정적 서빙하고 CDP 로 `Emulation.setDeviceMetricsOverride` + `layout-shift` PerformanceObserver + `.normal-logo.moon-hero` rAF 샘플링. 일회용 스크립트라 커밋하지 않았다.

## P2 실측 (같은 조건, 이동 전/후)

`#cdWhyUs` 3771 → **2959**, `#cdSignatureConsult` 2947 → **3640**(390x844 기준 문서 좌표).
CLS·히어로·`docHeight`(12121)는 이동 전과 같다. `#cdWhyUs` 에는 `content-visibility` 가 안 걸려 있고, `#cdSignatureConsult` 의 `contain-intrinsic-size: auto 792px` 는 실측 높이 792px 과 일치해 이동으로 어긋나지 않는다.

## 남은 작업

- [ ] **비색인 7개 로케일**(vi·hi·es·fr·de·nl·ms)의 히어로 lead·2차 CTA 는 옛 문구. 의도된 보류. `home.whyUs.proof.*` 는 영어 복사본이 들어가 있다.
- [ ] 로드맵 P3 이후 — 감사 문서 §5.

## 정본 위치

`index.html:9257`(H1) · `index.html:11180`(`#cdTodayPick`) · `index.html:11329`(`#cdWhyUs`) ·
`scripts/verify-hero-firstpaint-lock.mjs:43`(`TRUST_TARGETS`) ·
`worker/lib/fusion-fortune.js:341`(`systemVerdicts`) · `app/fusion-fortune/_lib/copy.ts:113`(`stanceLabels`)

## 함정

- 🔴 **`.cd-why-us__proof` 의 수치(겹침 4 · 엇갈림 2)는 예시다.** 어휘는 지어내지 않고 `copy.ts` 의 `stanceLabels`·`crossCheckGaugeCaption` 을 그대로 옮겼다. 실제 판정 어휘가 바뀌면 홈 문구도 함께 고친다 — 잇는 가드는 **없다**.
- 🔴 **배지 3번의 목적지를 바꾸면 `TRUST_TARGETS` 도 같이 고쳐야 한다.** 배지 3은 `#honeyMembershipMini` → `#cdWhyUs` 로 재조준했고, 되돌리려면 마크업·JS 폴백 배열·`TRUST_TARGETS` 세 곳을 함께 되돌린다. 옛 키 `home.heroTrust.membership{,Aria}` 와 `data-cd-hero-trust-kind === 'membership'` 분기는 **남겨 뒀다.**
- 히어로 lead 는 자동해시 키 `shell.normalLogo.moonHeroCopy.kbm4p3d`. 명명 키 `home.hero2.lead` 는 마크업이 안 쓰는 **죽은 키**다.
- 🔴 `i18n/authored/*.json` 은 빈 줄이 있는 사람 대조표다. `JSON.stringify` 왕복이면 빈 줄 39개가 사라진다 — **값 문자열만 텍스트 치환**. `public/i18n/*.json` 은 2-space stringify 로 왕복 일치(12/12).
- 🔴 `index.html` 을 고치면 lastmod 가 움직여 **매번 `npm run sitemap:generate`** 가 필요하다. 안 하면 CI 가 "Typecheck and lint" 이름으로 빨개진다(#1298 에서 두 번 겪음).
- `data-cd-home-secondary` 는 `display:none!important` 를 즉시 적용한다. `#cdHomeSecondaryPanel` 안의 4개 섹션에는 쓰지 말 것 — 그 패널은 `grid-template-rows` 애니메이션이다.

## 검증 (2026-08-30 전부 통과 — P1·P2 두 라운드)

```
npm run sync:public && npm run verify:public-parity && npm run sitemap:generate
npm run verify:entry-encoding -- --strict-core
npm run verify:hero-firstpaint-lock && npm run verify:hero-contrast
npm run verify:mobile-detail-nonintrusive && npm run verify:sitemap-drift
npm run verify:home-service-registry && npm run verify:paid-gate-price-coverage
npm run verify:payment-freeze && npm run verify:adsense-readiness
npm run i18n:check && npm run verify:locale-main-sync
npm run lint && npm run typecheck && npm test && npm run test:node
npm run verify:master-love-codex-flow   # 이 가드가 셸을 id=cdSignatureConsult 부터 잘라 읽는다
npm run build:cf                       # postbuild 의 [adsense-readiness] OK 까지 확인
```

## 모르는 것

- 새 문구·증거 스트립이 실제로 이해도를 올리는지는 **계측이 없어 알 수 없다**. `useAnalytics` 훅은 호출자 0(2026-08-30 `git grep`). 감사 문서 §5 P4 가 선행 작업이다.
- 시각 확인 미실시 — `.cd-why-us__proof` 의 두 테마 대비는 `추정`(토큰만 사용). `visual-checker` 위임이 남았다.
