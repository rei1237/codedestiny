---
status: active
updated: 2026-10-16
next: "1번(neo 모드 하이드레이션 경고)부터 처리한다. 한 줄 수정이고 dev 콘솔의 '1 Issue' 배지를 없앤다."
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
- 커밋 `98fe8adcc`는 아직 main에 병합되지 않았다.
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

## 남은 작업 (우선순위 순)

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
