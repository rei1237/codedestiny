---
status: active
updated: 2026-09-06
next: Phase 2-1 PR 머지(사용자) → 2-2/2-3 범위·AdSense 재신청 시점 판단(사용자) → 결정된 다음 Phase 를 새 워크트리에서 시작
---

# SEO 진단 + AdSense 승인 최적화 — Phase 2 인수인계

## 왜

사용자 지시 "[Code Destiny] SEO 현황 진단 + 애드센스 승인 최적화". Phase 0 진단 완료, Phase 1 리포트 승인됨(2026-09-05). 리포트 전문·발견 사항 F-01~F-17·실행 계획은 `C:\Users\user\.claude\plans\code-destiny-seo-piped-bentley.md` 가 정본이다 — 다시 조사하지 말고 그 파일을 읽는다.

## 지금 상태

- Phase 2-1 구현 완료, PR 로 올라가 있다(`gh pr list --search seo-phase2-1`). 머지는 사용자 몫.
- 미확정(사용자 판단 대기): ① 2-2(허브 증보)를 "신규 URL 0" 으로 재정의할지, 2-3(콘텐츠 15편)을 09-20 GSC 재측정 뒤로 미룰지 ② AdSense 재신청 시점(기존 09-14 이후 → 2-4 승격+1주 추천). 2-1 은 이 판단과 무관하다.

## Phase 2-1 결과 (색인 수 451 불변)

- [x] a. `verify-adsense-readiness` 마커에 `if (isMobileAppRuntime()) return false;` 줄 추가. 변이 검증 실측: 줄 삭제 시 `missing conditional AdSense rendering marker` 로 exit 1, 복원 후 OK.
- [x] b. `/insights` sr-only 목차 → 클라이언트 위 가시 섹션(H1 1개, `.cd-guide-index__title--hero`). 빌드 산출물 h1 1개·sr-only 0개 실측.
- [x] c. `/saju-fpti` — `siteSeo.ts` noindex 목록에서 제거, 산출물 robots `index, follow`. 원장 재생성 결과 **187개 라우트 lastmod 가 당일로 밀렸다** — 원장 서명이 페이지 import 클로저 해시라 `siteSeo.ts` 주석 한 줄 변경도 임포터 전부를 "바뀜"으로 본다. 설계대로이고 lastmod 정직화는 범위 밖이라 그대로 뒀다(후속 후보: `readNormalized` 에서 주석 제거).
- [x] d. `/tarot/numerology` 계산법 섹션 추가 — 가시 텍스트 1,757 → 2,290자(빌드 산출물 실측, 가드 임계 불변).
- [x] e. `seo-audit` 4번 검사 재작성. 실측이 인수인계 가정과 달랐다: hreflang 이 어디에도 없는 사이트맵 라우트가 **401/451** 이고 전부 접두 없는 한국어 단독 라우트라 "0줄 = 이슈" 는 400건 오탐. 최종 규칙: HTML 태그 + 사이트맵 alternate 를 한 그래프로 합쳐 목적지 실존·역방향·x-default 1개를 검사하고, 양쪽 모두 0줄이면 **로케일 접두 아래 색인 대상만** 이슈(접두 집합은 사이트맵 alternate 에서 도출, `/ja/` 는 허용). 변이 2종(사이트맵 목적지 깨기, `/en/today` hreflang 전부 제거) 모두 exit 1 확인. 주의: Next 는 `hrefLang` 대소문자로 내보내므로 grep 은 `-i` 로.
- [ ] f. `SearchAction` — **하지 않음**. `app/search` 계열 라우트가 없고(`ls app/search`·`app/*/search` 없음) `scripts/verify-seo-entity-registry.mjs:85-87,114` 가 SearchAction 을 4곳에서 금지한다. 검색 라우트가 생기면 그 가드부터 풀어야 한다.
- 하지 않은 것: `/pdf/new-year` 301(`_redirects` 94/95), lastmod 정직화, robots Disallow.

## 검증 (2026-09-06 실측, 전부 exit 0)

```
npm run build:cf                                   # [adsense-readiness] OK
SEO_AUDIT_OUT_DIR=dist node scripts/seo-audit.mjs --source=out --crawl-sitemap   # Issues: 0
npm run verify:sitemap && npm run verify:sitemap-drift   # 451 URLs OK / 추적본 일치
npm run verify:seo-heading-integrity && npm run verify:hydrated-h1-integrity   # 451 OK / 202 OK
npm run verify:editor-notes && npm run verify:indexable-prose-depth && npm run verify:internal-link-depth
npm run lint && npm run typecheck && npm run check:quick   # lint 경고 1건은 기존(src/features/fortune-tea-house)
```

## 함정

- 워크트리엔 node_modules 정션을 손으로 건다(PowerShell `New-Item -ItemType Junction`; `cmd /c mklink` 는 가드가 막는다). `git add .` 금지.
- `build:cf`·`check:quick` 가 `index.html`·`js/**`·`public/**`·rss·사이트맵의 캐시버스트 해시를 다시 쓴다 — 커밋 전에 `git checkout --` 로 되돌리고 깨끗한 소스에서 `npm run sitemap:generate` 를 다시 돌린다.
- 원장은 UTC `today` 와 KST 휘발성 날짜를 섞어 쓴다. 자정(KST) 을 넘기면 운세 100개 라우트 lastmod 가 하루 앞선다.
- 새 `verify:*` npm 스크립트 추가는 CI 게이트 추가 = 사용자 승인 사항. 판정은 `verify-adsense-readiness` 안에 넣는다.

## 모르는 것

- 저자 `sameAs` 공개 프로필 URL(2-4 에서 필요) — 사용자 제공 대기.
