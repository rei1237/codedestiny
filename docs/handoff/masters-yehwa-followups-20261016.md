---
status: done
updated: 2026-10-16
next: "없음. 남은 것은 사용자 동의 대기인 유료 LLM 생성(상품당 1회)과 '후속 과제' 목록뿐이다."
---

# 대표 상담 마스터·예화 상세: 후속 과제

## 왜

`wt/masters-yehwa-20261016`의 커밋 `98fe8adcc` "feat(masters): assign signature-consultation masters and restyle detail pages"에서 바뀐 것:
- 대표 상담 3종에 마스터를 지정했다. 연애 비책은 연이+서한비, 신년운세는 네오, 인생의 책은 윤달이다.
- 상품 전용 마스터 이미지를 만들고, 권위 있는 소개장(dossier)을 붙였다.
- 전문가·대표 상담 상세 페이지를 달빛 예화 스타일로 다시 썼다.

작업과 검증 중에 **원래부터 있던 문제**들을 찾았지만, 범위를 지키려고 손대지 않았다. 이 문서는 그 목록이다. 항목은 서로 독립적이므로 하나씩 PR로 뺀다.

🔴 **권위 원칙은 유지한다.** 마스터 소개에 연수, 상담 건수, 수상, 실존 직함을 넣지 않는다. 권위는 읽는 근거, 맡는 부분, 상담 원칙에서 나온다(`components/fortune/master-profiles.ts`).

## 지금 상태

- 워크트리: `D:\Development\codedestiny-worktrees\masters-yehwa-20261016`
- 브랜치: `wt/masters-yehwa-20261016`
- 커밋 `98fe8adcc`와 아래 후속 처리는 main에 병합·push됐다(main `04d61def4`). 스테이징까지만 나갔고 프로덕션 승격은 하지 않았다.
- 검증 결과:
  - jest 6144/6144, node 3286/0 fail, tsc/eslint OK.
  - `verify-feature-popup-journey` 74상품 × 4폭 PASS.
  - `npm run build` 통과.
- 계획 정본: `C:\Users\user\.claude\plans\unified-mapping-hejlsberg.md`

### 🔴 병합 전에 알아야 할 것

- **본 저장소 `D:\Development\code-destiny`에 사용자의 미커밋 변경이 있다.** 대상: `index.html`, `public/*/index.html`, `templates/home-funnel.html`, `__tests__/ui/home-mv.static.test.mjs`.
  - 이 브랜치도 `index.html`과 `public/*/index.html`을 다시 생성했으므로 병합하면 충돌한다.
  - 해소 방법: 충돌난 HTML은 손으로 고치지 말고 둘 다 반영한 뒤 다시 생성한다. `node scripts/design/build-home-funnel.mjs`를 실행하고 이어서 `npm run sync:public`을 실행한다.
  - 사용자의 미커밋 파일은 **사용자 확인 없이 커밋하거나 되돌리지 않는다.**
- 본 저장소의 다음 미추적 파일도 이 작업과 무관하다. 건드리지 않는다.
  - `docs/handoff/fortune-tea-pass-billing-holes-20261016.md`
  - `scripts/revoke-pass-and-block-account.mjs`
  - `scripts/grant-family-pass.mjs`
  - `.claude/skills/fire-your-seo-agency/`

### 사용자 동의 대기

- **실제 유료 LLM 생성은 아직 하지 않았다.** 대상은 연애 비책, 신년운세, 인생의 책이다.
  - 페르소나 프롬프트는 테스트로만 검증했다. 실제 결과의 말투가 캐릭터를 따르는지 확인하려면 상품별 1회 생성이 필요하다.
  - 🔴 반드시 사용자 동의를 받은 뒤 상품당 1회만 실행한다.
  - 분량 기준은 목표일 뿐이다. 결제 후 결과 전달 성공이 최우선이다.

## 처리 결과 (2026-10-16)

| # | 결과 | 커밋 |
|---|---|---|
| 1 | `<html suppressHydrationWarning>`. dev에서 localStorage를 neo로 두고 전후 실측: 수정 전 hydration mismatch와 "1 Issue", 수정 후 0 | `18fa224a9` |
| 2 | `scripts/design/build-hero-variants.mjs`로 변형 생성(원본 유지). 인생의 책 표지는 CSS `image-set` 600w(66KB)/800w(129KB). 원본 폭 재압축은 410→354KB로 이득이 작아 800w를 상한으로 했다. 상담 샘플은 신년운세 600/1200w, 연애 비책 600w `visualSrcset`. 실측: 모바일 LCP 66KB(목표 ≤80KB), 데스크톱 1x 샘플 38/36KB | `84fc8b1ac` |
| 3 | 판정: 중복이 아니라 생성물이다. `index.html`이 정본이고 JSON은 `sync:public`(`scripts/lib/build-visual-details.mjs`)이 만든다. 코드 변경 없음 | — |
| 4 | 원본 1355장 q93→q76(125→65MB, 평균 93→49KB, 크기 동일, 글자 크롭 비교 차이 없음). `sync:visual-details`가 모든 crafted 공개 매니페스트에 540w `variants`를 기록(신규 1190장, 평균 25KB). `render-crafted-detail`도 q76. 실측: 1x 화면은 540w, 2x 이상은 원본. dist 11244파일(<20k). 렌더러는 이미 `panelSources`로 srcset을 만들므로 TSX 변경 불필요 | `981b3ce51` |
| 5 | 판정: CI는 `build:cf`(→`prebuild:cf`가 운세 데이터 생성)를 쓴다. `lib/fortune/daily-data.ts`의 실패 메시지가 이미 우회를 안내한다. 코드 변경 없음 | — |
| 6 | 판정: `sitemap-lastmod.json`은 서명 기반 원장(테스트·indexnow가 읽음)이라 gitignore할 수 없다. rss·aliases 노이즈는 후속 과제 | — |
| 7 | 판정: 대표 카드 섹션 전체(제목·설명·CTA)가 `lang="ko"` 한국어다. alt만 번역하면 섹션 언어와 어긋나므로 섹션 현지화 별도 과제로 넘긴다 | — |
| 8 | jest 열린 핸들 경고는 전체 jest 2회에서 재현되지 않았다. 폰트 CORS는 localhost 전용으로 확인하고 닫았다. 윤달 책 색과 이미지 예산은 재생성 없이 보고만 | — |

- 병합: `a84b424a6`, `842672689`, `47617d0c0`. 충돌은 `config/sitemap-lastmod.json`뿐이었고 재생성으로 풀었다. 미러 캐시 해시: `d0c0e2b9a`, `91e7a78d1`, `04d61def4`.
- 검증: check:fast(critical) — 게이트 88/88, lint, sitemap, typecheck, test:node, npm test(jest 포함) 통과. 두 번째 jest 실행에서 `db.payment-admission-separation` 시간 단언(<100ms인데 165ms)이 부하로 1회 실패했고 단독 재실행은 PASS. `build:cf`·`build:worker`, `verify-feature-popup-journey` 74×4, `check:pre-push` 통과.

### 후속 과제 (이 문서 범위 밖)
- 홈 인라인 `FEATURE_VISUAL_DETAILS`(148KB, gzip 33KB)를 지연 로드하면 첫 화면 바이트가 준다.
- `lib/marketing/result-samples.json`의 `fusion-fortune-hero-v2`·`master-love-codex-hero-v3`에도 srcset이 없다.
- en/ja/zh 홈 대표 카드 섹션 현지화(7번).
- 빌드 노이즈(6번): rss·aliases를 내용 비교 후에만 쓰게 하기.
- 윤달 초상 책 색 불일치(8번). 재생성할 때 원본 에셋을 참조로 첨부한다.

## 남은 작업 (원래 목록 — 위 결과로 처리됨)

### 1. neo 모드 하이드레이션 경고
- 위치: `app/layout.js:179` `<html lang="ko" dir="ltr" className={notoSansKRVariable}>`
- 원인:
  - 인라인 프리페인트 스크립트가 하이드레이션 전에 `data-cd-theme="neo"`를 찍는다(localStorage `fortuneThemeModeStateV1='neo'`일 때).
  - 그러면 서버 HTML과 속성이 달라진다.
  - 결과로 콘솔에 hydration mismatch가 찍히고 dev 오버레이에 "1 Issue" 배지가 뜬다.
- 수정: `<html>`에 `suppressHydrationWarning`을 단다. 이 속성은 그 요소 하나의 속성에만 적용되고 자식에는 번지지 않는다.
- 검증:
  - dev 서버에서 localStorage를 `neo`로 두고 새로고침한다. 콘솔에 에러가 없고 배지가 없어야 한다.
  - `npm run test:jest`를 실행한다. layout 정적 테스트가 `<html>` 문자열을 단언하는지 먼저 grep으로 확인한다.

### 2. 무거운 기존 히어로 이미지 (LCP)
| 파일 | 크기 | 쓰이는 곳 |
|---|---|---|
| `public/images/expert-consulting/life-book-cover-20260923.webp` | 410KB | `/life-book-ai/`의 **LCP 이미지** |
| `public/images/feature-details/new-year-ai-hero-v3.webp` | 241KB | 신년운세 상세 히어로 |
| `public/images/feature-details/love-secret-ai-hero-v2.webp` | 116KB | 연애 비책 상세 히어로 |
- 배경: `next.config`가 `images.unoptimized: true`라서 next/image가 srcset을 만들지 않는다. 변형은 직접 만들어야 한다.
- 방법: 이번에 만든 `scripts/design/build-master-dedicated.mjs`의 sharp 패턴을 따른다.
  - 600w와 1200w(또는 원본 폭)를 q70~76으로 재인코딩한다.
  - 사용처에 `srcset`과 `sizes`를 단다.
  - LCP 이미지는 `fetchpriority="high"`와 `loading="eager"`를 유지한다. 단, 닫힌 `<details>` 안의 이미지에는 fetchpriority를 주지 않는다.
- 목표: 모바일 LCP 이미지 ≤80KB.
- 측정 주의:
  - 로컬 dist 서버는 압축 없이 보내므로 Lighthouse Perf(54~56)와 LCP(13~18s) 수치가 왜곡된다.
  - 전후 비교는 같은 조건에서 바이트 수와 LCP 요소 기준으로 한다.

### 3. 인라인 `FEATURE_VISUAL_DETAILS` 중복
- `index.html:34193` `var FEATURE_VISUAL_DETAILS={…}`는 `lib/marketing/feature-visual-details.generated.json`과 같은 데이터다.
- 한쪽만 고치면 홈 팝업과 `/features/*`가 어긋난다. 이번에도 두 곳을 맞춰야 했다.
- 방향: 생성 스크립트 하나에서 둘 다 찍어 내거나, 팝업이 JSON을 지연 로드하게 한다.
  - 먼저 `js/feature-detail-preview.mjs`가 어느 쪽을 읽는지 확인한다.
  - 홈 첫 화면 바이트가 늘지 않게 한다.
- 검증: `node scripts/verify-feature-popup-journey.mjs`(74상품 × 4폭)와 관련 정적 테스트.

### 4. 크래프티드 상세 이미지 마무리 (C3 후속)
- 현황: `public/feature-details/crafted/**`의 webp는 1528개인데, 540w 변형이 있는 것은 162개뿐이다.
  - 이번에는 소개(intro) 편만 540w와 144w를 만들었다.
  - disclosure 매니페스트 이미지와 q93 원본은 그대로다.
- 할 일: 나머지에 540w를 만들고 원본을 재압축한다(q93 → q76 수준). 매니페스트와 렌더러(`CraftedProductDetail.tsx`)의 srcset을 그 파일들에 연결한다.
- 주의:
  - 그림 비율 규칙(aspect-ratio·object-fit 금지 테스트)을 깨지 않는다.
  - 파일 수가 많으므로 커밋 크기를 확인하고, 필요하면 상품군별로 나눈다.

### 5. 로컬 `npm run build`가 운세 데이터를 만들지 않음
- 증상:
  - `npm run build`(→ `build-cf-main.mjs`)가 `daily-YYYY-MM-DD.json`이 없다며 실패한다. 오늘 날짜와 내일 날짜 둘 다 해당한다.
  - `fortune/data`와 `public/fortune/data`는 gitignore 대상이고, `prebuild:cf` 단계에서만 만들어진다.
- 우회: `node scripts/gen-daily.mjs --date=YYYY-MM-DD`를 실행하고 이어서 `node scripts/fortune-build-data.mjs`를 실행한다.
- 결정할 것: 둘 중 하나를 고른다.
  - (a) `build-cf-main.mjs` 체인에 `fortune:build-data`를 넣는다.
  - (b) 실패 메시지에 우회 명령을 출력한다.
  - CI 배포 체인과 중복 실행되지 않는지 먼저 확인한다.

### 6. 빌드가 추적 파일을 덮어씀
- 빌드 후 diff에 다음 파일이 노이즈로 남는다.
  - `config/sitemap-lastmod.json`
  - `rss.xml`, `insights/rss.xml`, `public/rss.xml`, `public/insights/rss.xml`
  - `public/famous-saju-aliases.json`
- 지금은 빌드할 때마다 `git checkout -- <위 파일들>`로 되돌린다.
- 방향: 날짜만 바뀌는 경우 쓰지 않게 하거나(내용 해시 비교), 생성물을 gitignore로 옮긴다. 후자는 배포 체인이 생성하는지 확인한 뒤에만 한다.

### 7. en/ja/zh 홈 대표 카드 alt가 한국어
- `scripts/design/build-home-funnel.mjs`의 `signatureProducts[].imageAlt`(L89·103·117·133·148·163)가 한국어 한 벌뿐이다. 그래서 `public/en|ja|zh*/index.html`에도 한국어 alt가 그대로 들어간다.
- 6개 카드 모두 원래부터 이렇다. 이번 작업은 3개의 문구만 바꿨다.
- 수정: 로케일별 alt 표를 두고 생성할 때 고른다. 이어서 `build-home-funnel`과 `sync:public`을 실행한다.

### 8. 사소한 것 (묶어서 처리 가능)
- 윤달 초상(`yun-life-book-portrait*.webp`)의 책은 어두운 색인데, 홈 키 아트(`life-book-yun-v2`)의 책은 녹색이다.
  - 재생성할 때는 **원본 에셋 이미지를 참조로 첨부하고 나란히 비교**한다.
- 이미지 예산 초과(허용하고 넘어감):
  - `neo-new-year-portrait` 89KB / 360w 38KB (예산 70/30KB)
  - `yeoni-love-portrait` 72KB / 360w 32KB
- jest가 끝날 때 "did not exit one second after the test run" 경고를 낸다(열린 핸들). `--detectOpenHandles`로 원인 테스트를 찾는다.
- localhost에서 폰트 CORS 경고가 뜬다. 배포 도메인에서는 재현되지 않는다. 확인만 하고 닫아도 된다.

## 참고 명령
```bash
cd /d/Development/codedestiny-worktrees/masters-yehwa-20261016   # 셸 cwd가 매번 초기화된다
npm run test:node && npm run test:jest
node scripts/verify-feature-popup-journey.mjs
node scripts/design/build-home-funnel.mjs && npm run sync:public
```
- Git Bash는 맨 앞이 `/`인 인자를 Windows 경로로 바꾼다. URL 경로 인자는 `/` 없이 넘긴다.
- 홈 팝업을 자동화로 열 때는 클릭 대신 `window._cdOpenTilePreview(tileEl)`를 쓴다. 타일에 `data-pvw-paid`가 있어야 한다.
