---
status: active
updated: 2026-08-29
next: PR #1288 머지 → 프로덕션 승격 → 2~3일 뒤 Cloudflare Web Analytics 로 홈 CLS 재측정, 그 결과로 남은 축의 우선순위를 정한다
---

# 홈 CLS 회귀 + 브랜드 색인 회복

## 다음 행동

1. **사용자가 PR #1288 을 머지**(CI 전부 초록) → 스테이징 자동 배포. 근거·실측은 그 PR 본문.
2. 프로덕션 승격은 사용자가 명시적으로 요청할 때만.
3. 🔴 **승격 2~3일 뒤 Cloudflare Web Analytics 에서 홈 CLS 분포를 재측정한다.** 랩 초록불은 해소
   근거가 아니고, 스테이징은 `noindex` 라 광고 경로가 막혀 CLS 가 구조적으로 0에 가깝다
   ([[staging-cwv-hides-ad-driven-cls]]). **남은 CLS 작업의 우선순위는 이 재측정 뒤에 정한다** —
   최대 원인(RUM 35건 중 14건)이 빠지면 나머지 9건의 상대 비중이 달라진다.

## 남은 CLS 작업 (미착수)

| 대상 | RUM | 고칠 것 |
|---|---|---|
| GlobalHeader 메뉴 버튼 | 4 | `ml-auto` 라 형제 폭 변화 = 자기 이동. 축은 **로케일 라벨 폭** — `md:hidden`/`md:flex` 컨테이너는 공존하지 않는다(확인함) |
| human-design | 3+2 | `useHumanDesignLocale` 첫 렌더 `"ko"` → effect 재설정, `#hd-hero-heading` 줄 수 변동 |
| `#sySoloAiConsultCard` | 2 | `area.innerHTML=` 통째 교체 + `display:none→block` |
| `div.mt-5` | 2 | `SeoLandingBirthForm.tsx:296-304` 조건부 버튼을 `visibility:hidden` 으로 상시 렌더. **17개 라우트 공유 — `regression-scout` 선행** |
| tea-house 배지 | 1 | `FortuneTeaHouseLanding.tsx:170-175` 동일 처리 |
| `.wrap` 가로 패딩 | — | 크리티컬 CSS 와 정본이 768px 초과에서 8px 어긋남. **CLS 레버가 아니라 정합성 수정** |
| `CodeDestinyDisplay` | — | `font-display: swap → optional` + crossorigin preload. 🔴 채택 전 `curl -sI` 로 크기 재고 LCP A/B |

🔴 다시 파지 말 것 — 계획 단계의 전제 3개가 실측으로 뒤집혔다:
`build-fortune-ui-critical.mjs:215-217` 은 `index.html` 을 건드리지 않아 **크리티컬 CSS 회귀는 없다**(빠진
`padding-top` 은 정본에서도 `0px`) · `fortune-ui.css` 히어로 줄바꿈 축은 닫혀 있다 · `ec160efee` 가 옮긴
스타일 블록은 히어로 시프트 원인이 아니다.

## 다음 세션 — 브랜드 SEO (범위 확정, 미착수)

사용자 결정: 홈 `<title>` 접미사 + 구명 5건 + `/kkul-kkul-unse` 내부 링크만.
**H1 문구 변경·`potentialAction` 추가는 하지 않는다**(후자는 2024-11-29 폐기 + 검색 엔드포인트 없음).
`| Code Destiny` 320여 건도 손대지 않는다.

🔴 **착수 전 사용자에게 먼저 말할 것: 브랜드 통일이 프로덕션에 도달한 지 24시간이 안 됐다**
(`88773a108`·`7ba9dfc52`, 프로덕션 `16b294592`). 구글 재크롤은 수일~수주라 **"안 나온다"의 상당 부분은
아직 시간이 안 지난 것**이다.

손댈 축(전부 `index.html`, 미러 6개 + `sitemap:generate` 를 같은 커밋에):
`:837` `<title>` · `:876` og:title · `:887` twitter:title · `:978` WebPage.name · `:861/877/888`
description · `:506` apple-mobile-web-app-title · **신규** `<meta name="application-name" content="꿀꿀 운세">`
(셸에 아예 없다) · `:19756~` 홈 가이드 내비에 `/kkul-kkul-unse/` 링크(기존 `home.nav.brandAlias` 키 재사용 —
신규 i18n 키 0개).

구명 접미사 5건: `app/oracle/sikojen-povailu/layout.tsx:5`, 같은 폴더 `play/page.tsx:6,20,27`,
`app/saju-guardian/layout.js:5`, `app/saju-picture/layout.js:5`.
🔴 브랜드 연혁·`alternateName`·푸터 저작권의 `꿀꿀 만세력` 은 **의도된 구명 표기라 건드리지 않는다.**

가드: `__tests__/ui/site-name-signals.static.test.js` 가 4축을 스스로 문서화해 두고 **title 접미사 축과
application-name 축은 검사하지 않는다**(`:11`). 그 두 축을 fail-closed 로 추가한다.

다시 파지 말 것: robots.txt · canonical · hreflang · sitemap 구조 · GSC 소유권 — 전부 정상
(`docs/handoff/seo-indexing-2026-08-15.md`).

## 측정 함정 (이번에 걸린 것)

- 기존 홈 랩 측정이 **전부 비로그인**이라 인증바 경로를 통째로 놓치고 있었다. 게스트/로그인 두 상태를
  각각 재야 한다. **CPU 4x 스로틀 없이는 재현되지 않는다.**
- A/B 는 문서만 `route.fulfill` 로 갈아끼우고 나머지 요청은 프로덕션에 흘려야 오리진·`localStorage` 가
  양팔에서 같아진다.
