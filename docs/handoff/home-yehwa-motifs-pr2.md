---
status: active
updated: 2026-09-03
next: PR-1 머지 확인(`gh pr list --search "달빛 예화" --state all`) 후 origin/main 에서 분기해 카드 3종에 `.cd-yehwa-seal`(+연이 카드에만 `.cd-yehwa-sparkle`) 을 붙인다.
---

# 달빛 예화(月花) 모티프 — PR-2 카드 인장·스파클

## 왜

사용자 브리프: "운명의 문" 한 곳의 로즈골드 라인아트를 홈 전체 디자인 시스템으로 — 그중 **카드의 원형 꽃 인장(스탬프) + 캐릭터 곁 스파클 2~3** 이 PR-2 몫. 새 이미지 자산 없음, 스파클은 **기존 캐릭터가 있는 카드에만**.

## 지금 상태

- PR-1 이 토큰·생성기·히어로·구분선 6곳을 넣었다. `--cd-yehwa-mask-seal` · `--cd-yehwa-mask-sparkle` 과 `.cd-yehwa-seal` · `.cd-yehwa-sparkle`(네오 재도색 포함)은 **정의만 있고 홈 마크업 소비처 0** — PR-2 가 쓴다.
- 정본: `scripts/design/gen-yehwa-motifs.mjs` → `styles/yehwa-motifs.css`(생성물). 시트를 직접 고치면 `--check`(정적 테스트가 돌림)가 실패한다 — 배치 규칙도 생성기 템플릿에 넣고 재생성.

## 남은 작업

- [ ] 인장(`<span class="cd-yehwa-seal" aria-hidden="true"></span>`, 카드 모서리 안쪽 64~88px, 텍스트와 안 겹치게) 3곳:
  1. `#fortuneGatewayEntry` — 인장 + 연이(`.fortune-gateway__door-art-yeon`) 주변 스파클 2~3(12~18px, 크기 다르게).
  2. `#cdSignatureConsult .cd-sig-card` — 인장만.
  3. `#cdQuickServices .cd-quick-card` — 인장만.
- [ ] 판정: 1350/390 × 연이/네오를 `visual-checker` 로 — (a) 글자 위를 안 지남 (b) 선 대비 1.3~1.7:1(PR-1 기준) (c) 네오 골드 재도색 (d) hover/active transform 에서 안 튐.
- [ ] `npm run sync:public` 산출물(index.html 미러 6 + styles 미러) · `npm run sitemap:generate` 커밋.

## 함정

- 🔴 **불투명도는 브리프의 "15~25%" 가 아니라 실측으로** — PR-1 에서 원색 .22 는 연이 히어로 위 1.07:1 로 보이지 않았고, 딥 로즈골드(`--cd-yehwa-line-deep`) .5 가 1.31:1 이었다. `.cd-yehwa-seal` 기본 .22 는 흰 카드 위라 다를 수 있으니 스크린샷으로 정한다.
- `.cd-quick-card`(`styles/fortune-gateway.css` 1006~) 에 `position:relative` 가 **없다** — `position:relative;isolation:isolate;overflow:hidden` 부터. `.cd-sig-card`(index.html 인라인 style, relative+overflow:hidden)와 운명의 문 카드는 이미 있다.
- `.cd-sig-card` 는 `cdSigRise` 등장 애니메이션(`backwards`)을 탄다 — 인장은 `::before/::after` 말고 **자식 span** 으로.
- 운명의 문 카드에는 `.fortune-gateway__flora::before`(우상 벚가지)·`.door--chat::before`(작약)가 이미 있다 — 인장은 좌상단 등 빈 자리로, 그 옛 그라데이션은 건드리지 않는다(PR #1489 결과 보존).
- 스파클 마스크는 stroke 0.8 — 12px 아래로 줄이면 사라진다. 작게 쓰려면 `MASKS.sparkle.sw` 를 올려 재생성.
- `?v=build-` 핀은 손대지 말고 `sync:public` 이 회전시키게 둔다.

## 검증

`npm run test:node` → `verify:hero-firstpaint-lock` → `verify:home-service-registry` → `verify:mobile-detail-nonintrusive` → `sync:public` → `verify:public-mirror-fresh` → `sitemap:generate` → `verify:sitemap-drift`. 렌더는 워크트리를 정적 서빙(playwright 는 루트 node_modules 에서 `createRequire` 로) 해 visual-checker 로.

## 모르는 것

- `.cd-quick-card` 6장 **전부**에 인장을 찍을지 첫 장만인지 — 사용자는 "스탬프만" 이라고 했지 개수는 안 정했다. 두 안을 스크린샷으로 함께 보여 고르게 한다.
