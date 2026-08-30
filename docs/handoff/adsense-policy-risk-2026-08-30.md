---
status: active
updated: 2026-08-30
next: PR #1305 → PR #1301 순서로 머지한 뒤, 배포 후 `verify:redirects:live`·`seo:check` 로 /guides/ 착지를 실측한다
---

# AdSense "가치 없는 콘텐츠" 재거절 — 정책 위험 제거 + 신뢰 구조

## 왜

code-destiny.com 이 AdSense 에서 "가치가 별로 없는 콘텐츠"로 반복 거절된다. 2026-08-17 거절 → 대응 PR 6건 머지 → **재신청했으나 또 거절**.
전수 진단 결과 **분량·중복·기술 SEO 는 원인이 아니다**(sitemap 439/439=200, prose-depth 위반 0, 4-gram Jaccard 1.3~18%, 로케일 혼입 0~2%). 사용자와 합의한 범위는 **정책 위험 제거 + 신뢰 구조** 2건이다.

## 지금 상태

- PR1 `/reviews` 정책 위험 제거 — **PR #1301, 열림.** `MERGEABLE`(2026-08-30 origin/main 병합·사이트맵 원장 충돌 해소 후 재푸시). `mergeStateStatus=BLOCKED` 는 자식 PR 때문이며 정상이다
- PR2 신뢰 구조(`/about`·`/editorial-policy`) — **PR #1303 머지 완료**(#1301 브랜치로)
- PR3 `/high-value/` → `/guides/` — **PR #1305, 열림.** #1301 위에 스택

🔴 머지 순서는 **자식부터 — #1305 → #1301** 이다.
`pr-ci.yml` 의 `Landing order` 잡이 자기 head 를 base 로 삼는 열린 PR 이 있으면 부모(#1301)를 막는다.
그리고 `pull_request: branches: [main]` 필터 때문에 **자식 PR(#1305)은 체크가 0개인 게 정상**이다 — 검증은
#1305 를 부모 브랜치에 머지했을 때 #1301 에 뜨는 `synchronize` 로 합쳐진 변경 전체에 대해 수행된다.
🔴 부모를 먼저 머지하면 자동 재타게팅이 `edited` 이벤트라 CI 가 영영 안 돌아 **체크 0개 + 영구 BLOCKED** 가 된다
(2026-08-16 #706→#707, 2026-08-28 #1244→#1247 실사고). 해소는 자식 브랜치에 `origin/main` 을 머지해 푸시.

## 남은 작업

- [ ] 사용자가 **#1305 → #1301** 순서로 머지
- [ ] 머지·배포 후 실측: `/guides/` 13개 200 · `/high-value/*` 301 · `npm run verify:redirects:live` · `npm run seo:check`
- [ ] Search Console 에서 `/high-value/*` 13개의 색인이 `/guides/*` 로 승계되는지 4~6주 추적
- [ ] 사용자에게 요청한 GSC 자료 도착 시 색인 원인 판정 (항목 목록은 계획 파일 말미 + 아래 "GSC 요청 항목")

## PR3 에서 실제로 한 것 (커밋 09e7b075b)

- `app/high-value/**` → `app/guides/**` (git mv). 경로 문자열 **145건** 치환
- `public/_redirects` 두 줄 추가 → 규칙 **92 → 94**. 🔴 예산 95 라 **여유가 1칸뿐**이다. 다음 규칙 추가 전에 `scripts/verify-redirects-budget.mjs` 의 예산을 올리거나 죽은 규칙을 걷어내야 한다
- 🔴 **내부 식별자는 일부러 남겼다** — `HIGH_VALUE_PAGES`·`highValueDetailText`·i18n 키 `highValueContent.*`. 노출면이 아니고, i18n 키 리네임은 `public/i18n/*.json` 12벌 + `i18n/authored/**` 를 건드린다. `git grep highValue` 로 나오는 것들은 **잔재가 아니라 결정**이다
- sitemap 원장 서명 **209건 갱신** — 라우트 경로가 서명 입력이라 그렇다. 회귀 아님

## 정본 예시

- 광고 허용 목록 ↔ sitemap 정합: `app/components/adsense-route-policy.js:117` · `:135`
- 리다이렉트 예산: `scripts/verify-redirects-budget.mjs` (상한 102, 예산 95, 현재 94)
- 사이트맵 소스: `scripts/generate-sitemap.mjs` (`lib/seo-site-urls.ts` 는 부차 목록이다)

## 함정

- 🔴 **소스 한 줄이 sitemap 원장 서명 수백 건을 민다.** 라우트·공유 lib 를 고쳤으면 **`sitemap:generate` 를 같은 커밋에** 담는다.
- 🔴 광고 허용 목록에서 라우트를 빼면 `adsense-route-policy.js` 와 sitemap 을 **한 PR 에서 같이** 고쳐야 한다. 하나만 빠지면 postbuild `verifyAdsenseEligibleRouteSitemapAlignment` 가 배포를 막는다.
- 🔴 `verify:editor-notes` 는 `out/` 산출물을 읽는다 — **`build:cf` 를 먼저 돌리지 않으면 낡은 경로로 없는 회귀를 만든다**(이번에 실제로 겪었다).
- `build:cf` 는 `rss.xml`·`public/rss.xml`·`insights/rss.xml`·`public/insights/rss.xml` 의 `lastBuildDate` 만 흔든다 → **커밋하지 말고 되돌린다**. 반대로 `sync:public` 산출물은 담는다.
- `verify:public-mirror-fresh` 는 `.ignore` 1건만 나오면 윈도우 개행 위양성이다(내용 diff 0). `git checkout -- .ignore` 후 커밋.
- `index.html`·`public/_redirects` 는 CRLF 라 Edit/sed 대신 node 패치 스크립트로 고친다(개행 개수 검산 포함).

## 검증 (PR3 로컬 실측 2026-08-30)

```
lint 통과 · typecheck 통과 · test:node 585 pass/0 fail
verify:sitemap 438 URL(/guides/ 13개) · verify:sitemap-drift OK
verify:redirects-budget OK 94/95 · verify:adsense-route-policy OK
build:cf → [adsense-readiness] OK
verify:editor-notes OK(광고 라우트 205) · verify:indexable-prose-depth OK(438개)
verify:seo-heading-integrity OK · verify:og-route-contract 통과 · verify:guard-wiring OK(게이트 25/25)
git grep high-value (docs 제외) → public/_redirects 의 301 규칙 2줄만 남음
```

## GSC 요청 항목 (사용자 제공 대기)

Search Console 좌측 메뉴 기준 경로와 파일 이름을 그대로 적는다. **CSV 는 "내보내기 → 쉼표로 구분된 값(.csv)" 또는 Google Sheets 링크**면 된다.

1. **색인 생성 → 페이지** → 하단 "페이지가 색인되지 않는 이유" 표 → 우상단 **내보내기**
2. 그 표에서 아래 항목을 하나씩 눌러 들어간 뒤 각각 **내보내기**(항목당 예시 URL 최대 1,000개)
   - 크롤링됨 - 현재 색인이 생성되지 않음
   - 검색됨 - 현재 색인이 생성되지 않음
   - 사용자가 선택한 표준 없이 중복됨
   - Google 에서 선택한 표준이 사용자가 지정한 표준과 다름
   - 소프트 404
3. **실적 → 검색 결과** → 기간 **최근 3개월** → `페이지` 탭과 `쿼리` 탭 각각 **내보내기** (평균 CTR·평균 게재순위 체크박스를 켠 상태로)
4. **설정 → 크롤링 통계 → 보고서 열기** → 화면 캡처 또는 수치 4개(총 크롤링 요청 / 총 다운로드 크기 / 평균 응답 시간 / 호스트 상태)와 "응답별·파일 형식별·목적별·Googlebot 유형별" 분류표
5. **AdSense 거절 알림 원문** — 사유 카테고리의 정확한 문구와 **날짜**(레포에 8/17 이후 기록이 없어 공백)

## 모르는 것

- **재거절이 리뷰 보상 배너(`v20260829`) 때문인지는 미검증** — 시점이 겹치는 정황뿐이다.
- `/fortune/**` 등 규칙 조립 페이지를 색인에서 빼는 선택지는 **사용자에게 묻지 않았다** — 200여 개 색인이 걸린 판단이다.
- `/api/feedback` 의 비로그인 접수 가능 여부 **미검증**.
- **사이트링크(브랜드 검색 시 하위 링크 6~8개)는 마크업으로 만들 수 없다** — 구글 자동 생성이다. 관련해 이 레포에서 확인된 실제 결함은 **사이트 이름 표기가 5갈래**라는 것이고(메모리 `fortune-publish-is-healthy-indexing-is-not`), 그 통일은 아직 **미착수**다.
- 🔴 **이 작업이 AdSense 승인을 보장하지 않는다.**
