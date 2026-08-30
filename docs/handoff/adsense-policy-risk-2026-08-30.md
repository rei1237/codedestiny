---
status: active
updated: 2026-08-30
next: PR1·PR2 머지 확인 후 PR3(`/high-value/` → `/guides/` 리네임)을 단일 커밋으로 진행한다
---

# AdSense "가치 없는 콘텐츠" 재거절 — 정책 위험 제거 + 신뢰 구조

## 왜

code-destiny.com 이 AdSense 에서 "가치가 별로 없는 콘텐츠"로 반복 거절된다. 2026-08-17 거절 → 대응 PR 6건 머지 → **재신청했으나 또 거절**.
전수 진단 결과 **분량·중복·기술 SEO 는 원인이 아니다**(sitemap 439/439=200, prose-depth 위반 0, 4-gram Jaccard 1.3~18%, 로케일 혼입 0~2%). 사용자와 합의한 범위는 **정책 위험 제거 + 신뢰 구조** 2건이다.

## 지금 상태

- PR1 `/reviews` 정책 위험 제거 — **PR #1301, CI 8개 pass, 머지 대기**
- PR2 신뢰 구조(`/about`·`/editorial-policy` 편집 책임 + 조직 JSON-LD) — **PR #1303, PR #1301 위에 스택, 머지 대기**
- PR3 `/high-value/` → `/guides/` — **미착수**

🔴 머지 순서는 **자식부터 — #1303 → #1301** 이다.
`pr-ci.yml` 의 `Landing order` 잡이 자기 head 를 base 로 삼는 열린 PR 이 있으면 부모(#1301)를 막는다.
그리고 `pull_request: branches: [main]` 필터 때문에 **자식 PR(#1303)은 체크가 0개인 게 정상**이다 — 검증은
#1303 을 부모 브랜치에 머지했을 때 #1301 에 뜨는 `synchronize` 로 합쳐진 변경 전체에 대해 수행된다.
🔴 부모를 먼저 머지하면 자동 재타게팅이 `edited` 이벤트라 CI 가 영영 안 돌아 **체크 0개 + 영구 BLOCKED** 가 된다
(2026-08-16 #706→#707, 2026-08-28 #1244→#1247 실사고). 해소는 자식 브랜치에 `origin/main` 을 머지해 푸시.

## 남은 작업

- [ ] 사용자가 **#1303 → #1301** 순서로 머지 (#1303 은 부모 브랜치로, #1301 이 main 으로 전부 싣고 간다)
- [ ] **PR3 리네임** — 치환 지점 약 30곳. 정본은 `app/high-value/content.js`(`adsense-ready-articles.js` 아님). `_redirects` 는 `/high-value` 와 `/high-value/*` **두 줄**이 필요하다(splat 은 `X` 를 못 먹는다). 🔴 sitemap 재생성을 `_redirects` 편집과 **같은 커밋에** 담는다 — 삼킴 검사가 루트 `sitemap.xml` 을 읽는다.
- [ ] 판정: `/guides/` 13개 200 · `/high-value/*` 301 · `verify:redirects:live` 통과 · `git grep high-value` 잔여 0(docs 제외)
- [ ] 사용자에게 요청한 GSC 자료 도착 시 색인 원인 판정 (항목 목록은 계획 파일 말미)

## 정본 예시

- 치환 지점 전량 목록: `C:\Users\user\.claude\plans\cryptic-swinging-cookie.md` 의 PR3 절
- 광고 허용 목록 ↔ sitemap 정합: `app/components/adsense-route-policy.js:117` · `:135`
- 리다이렉트 예산: `scripts/verify-redirects-budget.mjs` (상한 102, 예산 95, 현재 92)

## 함정

- 🔴 **소스 한 줄이 sitemap 원장 서명 수백 건을 민다.** 이번에 `lib/structured-data.ts` 한 곳 수정이 146건을 밀어 `test:node` 가 1건 실패했다. 라우트·공유 lib 를 고쳤으면 **`sitemap:generate` 를 같은 커밋에** 담는다.
- 🔴 광고 허용 목록에서 라우트를 빼면 `adsense-route-policy.js` 와 sitemap 을 **한 PR 에서 같이** 고쳐야 한다. 하나만 빠지면 postbuild `verifyAdsenseEligibleRouteSitemapAlignment` 가 배포를 막는다.
- `verify:public-mirror-fresh` 는 `.ignore` 1건만 나오면 윈도우 개행 위양성이다(내용 diff 0). `git checkout -- .ignore` 후 커밋.
- `index.html`·CRLF 파일은 Edit 대신 node 패치 스크립트로 고친다(한글 `\uXXXX` 이스케이프·CRLF 유실).

## 검증

```
npm run verify:adsense-route-policy && npm run sitemap:generate && npm run verify:sitemap
npm run verify:sitemap-drift && npm run sync:public && npm run verify:public-parity
npm run test:node && npm run verify:guard-wiring && npm run build:cf   # postbuild = adsense-readiness
npm run verify:indexable-prose-depth && npm run verify:editor-notes
```

## 모르는 것

- **재거절이 리뷰 보상 배너(`v20260829`) 때문인지는 미검증** — 시점이 겹치는 정황뿐이다.
- `/fortune/**` 등 규칙 조립 페이지가 색인돼 있는데 이번에 문서 문장을 실제에 맞춰 고쳤다. **반대로 그 페이지들을 색인에서 빼는 선택지는 사용자에게 묻지 않았다** — 200여 개 색인이 걸린 판단이라 임의로 정하지 않았다.
- `ContactForm.jsx` 는 `mailto:` 조립뿐이라 메일 앱이 없는 심사자에겐 아무 일도 안 난다. `/api/feedback` 의 비로그인 접수 가능 여부 **미검증**.
- 🔴 **이 작업이 AdSense 승인을 보장하지 않는다.**
