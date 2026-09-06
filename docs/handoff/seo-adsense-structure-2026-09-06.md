---
status: active
updated: 2026-09-06
next: PR 머지(사용자) → 스테이징에서 /saju/guide · /nakshatra/codex/0 · /ziwei-ai 하단 검수 노트 육안 확인 → 인사이트 8편 보강 문단 사실 검토(사용자) → 프로덕션 승격(사용자) → 2026-09-20 GSC 재측정 → AdSense 재신청 → MongoDB M10 After 캡처(docs/handoff/mongo-m10-phase2-2026-09-06.md)
---

# SEO·AdSense "가치 낮은 콘텐츠" 구조 보강 (콘텐츠 신설 없음)

## 왜

사용자 지시(2026-09-06): M10 After 캡처 전에 코드·설정만으로 기존 페이지가 AdSense "가치 낮은 콘텐츠"로 판정되지 않게 최적화. 새 URL 은 만들지 않는다(사이트맵 451 동결). 선행 문서 [seo-adsense-phase2-2026-09-05.md](seo-adsense-phase2-2026-09-05.md) 의 후속이다.

## 지금 상태

- 브랜치 `worktree-seo-adsense-structure-2026-09-06`, PR 은 `gh pr list --search seo-adsense-structure` 로 확인. 머지는 사용자 몫.
- 한 PR 에 4축이 들어 있다: ① `/x/guide` 10개 검수 노트 + @graph(Breadcrumb·Article·FAQPage) ② 몰입형 19개 라우트 검수 노트(`ImmersiveRelatedLinks` 한 곳) + `/saju/love-simulation` 로딩 문구 + `/tarot/mindscan` ko H1 ③ 나크샤트라 도감 27개 Article + 검수 노트 ④ 얇은 인사이트 8편 사례·체크리스트·FAQ 보강(각 550~650자).
- 계획의 "9편"은 실측 8편이었다 — 9번째 후보(`annual-fortune-reading-checklist-no-fear`)는 스캔 산물이라 제외했다.

## 남은 작업

- [ ] 사용자: 인사이트 8편 보강 문단의 사실 검토(`git diff main -- app/insights`). 새 점술 사실은 넣지 않았고 각 글의 기존 용어만 재사용했지만, 사례 서술은 편집자 창작이다.
- [ ] 사용자: 스테이징에서 `/tarot/guide` 하단 검수 노트가 **한국어 지면에서만** 보이는지(다른 로케일 버튼 전환 시 사라지는지) 한 번 확인.
- [ ] 후속 과제(이번 범위 밖, 고치지 않음): 다른 몰입형 라우트의 클라이언트 로딩 대체 문구 ~26건("준비 중" 계열) · `SITE_AUTHOR.sameAs` 비어 있음(URL 사용자 제공 대기) · fortune 96 생성 페이지의 공유 비율 · 홈 런처 인상(F-11) · contact mailto 폼(F-13) · 법무·로케일 허브·`/saju/basic` 류 페이지 JSON-LD 부재 · `/tarot/mindscan` 비한국어 로케일 H1 은 그대로(제목 키워드는 ko 만 맞췄다).

## 정본 예시

- 가이드 @graph + 노트: `app/astrology/guide/page.js:118-164` (다른 8개도 같은 모양, `app/guides/[slug]/page.js:98-118` 이 원형)
- 타로 가이드는 본문이 클라이언트라 노트를 서버에서 만들어 prop 으로 넘긴다: `app/tarot/guide/page.js` → `TarotGuideRouteClient` → `TarotGuideContent`(`isKoreanCopy` 일 때만 렌더). ko FAQ 정본은 `app/tarot/guide/tarot-guide-faq.js`.
- 몰입형 날짜표: `app/components/ImmersiveRelatedLinks.tsx` `ROUTE_DATES`(fromPath 없으면 빌드 실패, fail-closed).
- 도감: `app/nakshatra/codex/[index]/page.tsx` `codexSeoText()` 가 메타와 Article 제목·설명을 한 곳에서 만든다.

## 함정

- 발행일은 `git log --diff-filter=A --format=%as -- <page>` 첫 커밋일을 **상수**로 박았다(원장 자동 연동 없음, 원칙 2). 페이지를 크게 고치면 `dateModified` 상수를 손으로 올린다.
- `ImmersiveRelatedLinks` 의 최상위가 `<nav>` 에서 `<div>` 로 바뀌었다(노트는 nav 안에 두지 않는다). `data-cd-cross-sell` 표식은 그대로라 `verify:analytics-events` 영향 없음.
- `ContentIntegrityNote` 에 `className` 으로 여백을 덮지 말 것 — Tailwind 유틸리티 순서에 좌우돼 반쪽 오버라이드가 된다(컴포넌트 주석).
- 나머지(정션·CRLF·사이트맵 원장·dist 기반 가드 순서)는 [seo-adsense-phase2-2026-09-05.md](seo-adsense-phase2-2026-09-05.md) §함정.

## 검증

```
npm run typecheck && npm run lint                      # lint 는 기존 <a> 경고만
npm run sitemap:generate && npm run verify:sitemap && npm run verify:sitemap-drift   # 451 / 원장 갱신 66 = 10+19+27+8+2
npm run verify:i18n-no-hardcoded-korean && npm run verify:i18n-runtime && node scripts/verify-i18n-public-parity.mjs --all
npm run build:cf                                       # [adsense-readiness] OK
SEO_AUDIT_OUT_DIR=dist node scripts/seo-audit.mjs --source=out --crawl-sitemap
npm run verify:seo-heading-integrity && npm run verify:hydrated-h1-integrity
npm run verify:editor-notes && npm run verify:indexable-prose-depth && npm run verify:internal-link-depth
npm run verify:i18n-rendered-korean && npm run verify:hero-contrast && npm run verify:mobile-detail-nonintrusive && npm run verify:public-parity
npm run check:quick                                    # 로컬 build:worker workers-og 헛실패는 기지
```

## 모르는 것

- 인사이트 보강 문단의 사례(예: "결혼 3년 차 부부")는 편집자 창작 예시다 — 실제 상담 사례처럼 읽히는 것이 싫다면 문두에 "가상의 예"를 붙일지 사용자가 정한다.
