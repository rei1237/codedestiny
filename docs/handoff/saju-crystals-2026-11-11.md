---
status: done
updated: 2026-11-12
next: 사용자 요청 시 origin/main push·워커 배포·worktree:remove
---

# 사주 원석 추천 — 연이의 원석 큐레이션 인수인계

## 첫 행동
1. `cd D:\Development\codedestiny-worktrees\saju-crystals-20261111-215428` (워크트리 밖 주 체크아웃 `D:\Development\code-destiny`는 다른 세션의 `feat/world-cast-page` 미커밋 작업이 있으니 절대 건드리지 않는다)
2. `git status`, `git log -3 --oneline`, 이 문서의 단계 체크박스에서 첫 미완료 단계를 실행한다.
3. 원 요구사항 전문: 이 문서 맨 아래 "원 요청 요약"과 계획 파일 `C:\Users\user\.claude\plans\pasted-content-id-6cab-typed-feather.md`.

## 지금 상태
- 워크트리: `D:\Development\codedestiny-worktrees\saju-crystals-20261111-215428`, 브랜치 `wt/saju-crystals-20261111-215428`, 기반 origin/main `bae74a4c1`.
- node_modules는 주 체크아웃에 정션으로 공유. 제거 시 정션을 먼저 끊는다(`npm run worktree:remove` 사용).

## 승인 상태 (2026-11-11 사용자 답변 원문 요약)
- 웹툰 10컷 그림: "이번엔 생성하는게 맞고 그 웹툰 컷은 코드데스티니 스토리 웹툰 한정이야" → 이번 기능 설명 웹툰은 codex image_gen으로 생성한다.
- 과금·보관: "무료 + 프로필 저장" → 무료 기능, 결과는 프로필별(로그인: 프로필 카드 필드 `sajuCrystal`, 비로그인: 프로필 범위 localStorage). `/records/` 정책은 건드리지 않는다.
- 캐릭터 원본: "저장소 공식 시트" → 연이 `docs/design/character-references/yeoni-profile-v1.png`, 영냥이 `D:\CodeDestiny-Build\양냥이 프로필 시트.webp`. C01/C02 파일은 디스크에 없음(보고서에 명시).
- 커밋은 자동. **push·배포는 사용자 요청 시에만.** 끝나면 main에 merge(로컬)까지.

## 작업 규칙과 함정
- 원국 판정 기준은 `lib/saju/natal-core/`(analyzeNatalCore, 동결 객체). 원석 기능은 **읽기만** 한다. 설문으로 격국·종격·가종·강약·조후·구조 용신을 바꾸는 코드 경로를 만들지 않는다(2026-10-26 0ce81919a 등에서 제거된 버그: 설문 no/no로 종격→억부, flipStrength).
- 경험 대조는 `lib/saju/experience-calibration.mjs`의 기존 함수(toneOf/resolveTones/sewoonCandidates/cycleCandidates)를 **export만 추가**해 재사용. 동작 변경 금지. 세운은 입춘 기준(1월=전년, 2월=양쪽 후보).
- `counts`(오행 개수)를 추천 입력으로 쓰지 않는다 → "없는 오행이라 추천" 경로 원천 차단.
- 실제 LLM 호출·결제·운영 DB 쓰기 금지. `.env*`, `package-lock.json`, `dist/`, `out/` 편집 금지.
- `index.html`·루트 JS를 고치고 `public/` 미러는 `npm run sync:public`으로 재생성.
- noindex는 5곳 동기화(`docs/context/seo-and-adsense.md:66-80`). `/saju/crystals/start/`만 noindex, `/saju/crystals/`는 공개·사이트맵.
- `_redirects`/`_headers` 규칙 예산 한도(각 ~100) 주의.
- 원석 소울 타로(`/tarot/crystal-soul/`, id `tarot-crystal-soul`)와 이름 충돌 금지. 새 id는 `saju-crystals`. `moonstone`은 월정석 코드명이므로 원석 id는 `moon-stone-*`처럼 구분하거나 `adularia` 등 품종명 사용.
- 참고 사이트(qiyicrystal.com/kr/wuxing, /kr/guide, /kr/crystals) 문장·이미지 복제 금지, 출처 URL만 기록.
- 이미지 생성: `D:\CodeDestiny-Build\saju-crystals-20261111\`에서 `D:\CodeDestiny-Build\webtoon-revamp-20261107\`의 gen.mjs/jobs/chars.mjs/export.mjs 패턴 복사. 원본 PNG는 D:에, 레포엔 avif/webp만. 영냥이 귀 2개를 원본 크기로 세고 통과. 이미지 안에 글자 금지(문구는 HTML).
- 웹툰 렌더는 `app/components/webtoon/CutReader.tsx` 재사용(필요 시 line에 선택 필드 `note` 추가).
- 분석 이벤트 이름: crystal_entry_click, crystal_questionnaire_start, crystal_questionnaire_complete, crystal_result_view, crystal_result_save. 개인정보(연도·오행·원석) 넣지 않음. `npm run verify:analytics-events`.
- 검증: `npm run check:fast -- --plan` → `npm run check:fast`; 단일 테스트 `node scripts/run-mock-tests.mjs node __tests__/ui/<file>.test.mjs`.

## 설계
계획 파일(`C:\Users\user\.claude\plans\pasted-content-id-6cab-typed-feather.md`)의 "설계" 절이 정본. 요점:
- 엔진 `lib/saju/crystal-recommendation.mjs`: analyzeNatalCore → analyzePeriods → recommendCrystals. 구조 후보 = periods.hypotheses(evaluable), 기본 순서 natal.yongshin.priority. 경험은 가설별·영역별(work/money/relationship/life) agree/disagree 분리 집계, 최소 근거 minSignals 3·minYears 2, 한 가설이 2건 이상 앞설 때만 우선 후보로. 아니면 status base/multiple + 추가 질문 ≤2(예상 길흉 비노출). 원석 2~3개, 억지로 채우지 않음. resultKey에 natalAnalysisId·periodsKey·answersKey·CRYSTAL_ENGINE_VERSION·CATALOG_VERSION. 설명은 템플릿(LLM 없음). applied 용신은 셸 applyRuntimeYongshinPolicy와 동일 규칙(gyeokguk-authority 투영 재사용 가능한지 먼저 확인).
- 카탈로그 `lib/saju/crystal-catalog.mjs`(crystal-catalog-v1), 출처 기록 `docs/design/saju-crystal-catalog-sources.md`.
- 화면: 공개 SSG `app/saju/crystals/page.js`, 클라이언트 흐름 `app/saju/crystals/start/`(noindex). 진입 카드: index.html `#ukbuCard` 뒤, /saju/ 랜딩·guide·five-elements·푸터 링크. 사이트맵·entity-registry·siteSeo 등록.

## 단계
- [x] 0. 메모 범위 수정(완료)·워크트리·이 문서 커밋
- [x] 1. 엔진·카탈로그·테스트 (TDD), 커밋
- [x] 2. 랜딩·질문/결과 흐름·저장·분석 이벤트, 커밋
- [x] 3. 진입 카드·링크·푸터·사이트맵/SEO 등록, 커밋
- [x] 4. (사용자 이미지 수령 후) 웹툰·원석 이미지 QC·내보내기·연결 — 진입 이미지는 3단계에서 연결, 커밋
- [x] 5. 검증(테스트·빌드 HTML grep·브라우저 390/1280 캡처 → `D:\CodeDestiny-Build\saju-crystals-20261111\qa\`)·check:fast·main 로컬 merge·워크트리 정리 — 검증 완료(2026-11-12). merge·정리는 상위 세션이 사용자와 처리
- [x] 6. (2026-11-12 사용자 결정) 다른 기기 동기화·프로필 필수·그림 다듬기 — 아래 "2026-11-12 후속" 절. merge는 상위 세션

## 결과 기록
(각 단계 에이전트가 수정 파일·검증 명령 출력 요약·남은 문제를 여기에 적는다)

### 1단계 (2026-11-11)
- 커밋은 모두 1단계 에이전트가 했다.
  - `f333d47bc`: 엔진·카탈로그
  - `a1c67bf69`: 출처 문서 공백
  - `04284f90f`: sitemap lastmod 원장
- 추천 가능한 원석은 16종이다.
  - 목: amazonite, green-phantom-quartz, green-aventurine
  - 화: amethyst, rose-quartz, tiger-eye-red
  - 토: citrine, tiger-eye-gold, smoky-quartz
  - 금: clear-quartz, gold-rutilated-quartz, white-chalcedony
  - 수: obsidian, aquamarine, tiger-eye-blue, labradorite
- 추천하지 않는 원석: moon-stone-blue, moon-stone-peach, money-stone.
- 프롬프트 파일에 16종 프롬프트가 모두 있다.
- 지금은 기본값을 유지한다.
  - 구조 우선순위에서 독해 가설은 마지막이다.
  - 영역을 고르지 않은 해는 '생활 전반' 신호 하나로 센다(areaAssumed).
- 검증
  - 원석·카탈로그·경험 대조·골든마스터 테스트 통과.
  - check:fast(`--base=f50e72623`) exit 0.

### 2단계 (2026-11-11)
- 새 파일
  - `lib/saju/crystal-flow.mjs`: 프로필→출생 입력, 저장 키·기록, 셸 경험 입력 변환, from 허용 목록.
  - `lib/brand/saju-crystal-webtoon.mjs`: 웹툰 10컷 대사·비율.
  - `app/saju/crystals/` 아래
    - `page.js`: 공개 랜딩. JSON-LD는 WebPage와 Breadcrumb뿐이고 FAQ 7개는 `<details>`.
    - `start/page.js`: noindex 메타데이터.
    - `start/CrystalFlowClient.jsx`: 질문, 후속 질문, 결과, 저장.
    - `crystal-assets.js`: 이미지 파일이 있을 때만 경로를 넘긴다.
    - `StoneCard.jsx`: 이미지가 없으면 오행 색 칩을 보여 준다.
    - `CrystalCta.jsx`
    - `crystals.module.css`
  - `__tests__/ui/saju-crystal-flow.test.mjs`
- 수정 파일
  - `app/components/webtoon/CutReader.tsx`와 `cut-reader.module.css`: `src`가 비면 그림 없이 대사만 보여 주고, 대사에 `note` 보조설명을 붙일 수 있다.
  - `config/sitemap-lastmod.json`: CutReader를 import하는 /fortune/**·/heukwol의 서명이 바뀌어 재생성했다. 정당한 변경이다.
- 저장
  - localStorage 키는 `codeDestiny:sajuCrystal:<계정id|guest>:<profileId>`이고 값은 `{v, answers, answersKey, resultKey, versions, updatedAt}`이다.
  - 로그인 상태면 `DestinyProfileManager.storage.update(profileId, {sajuCrystal})`도 부른다.
- 분석 이벤트
  - `crystal_entry_click{from}`
  - `crystal_questionnaire_start{from}`
  - `crystal_questionnaire_complete{steps, followups}`
  - `crystal_result_view{status}`
  - `crystal_result_save`
  - 연도·오행·원석 값은 싣지 않는다.
- 검증
  - 원석·경험 대조·골든마스터 테스트 5파일: tests 37, pass 37, fail 0.
  - esbuild 번들 OK.
  - `verify:analytics-events`, `verify:sitemap-drift`, eslint 모두 OK.
  - 2단계 커밋은 `7df7980c7`이다.
  - check:fast exit 0: jest 474 suites 통과(1 skipped), 7897 tests 통과, BLOCKED 없음.
- 남은 문제
  - 워커 프로필 라우트가 모르는 필드를 버려서 `sajuCrystal`은 서버에 동기화되지 않는다. 지금은 기기별 localStorage에만 남는다. `sajuCalibration`도 같은 상태다. 워커 허용 목록을 바꿀지는 사용자 결정이 필요하다.
  - `/saju/crystals/start/`는 메타데이터 noindex만 있다. noindex 5곳 동기화와 사이트맵 등록은 3단계 일이다. 지금 원장에는 `/saju/crystals/`가 없다.
  - 이미지 규격
    - 웹툰: `public/images/saju-crystals/webtoon/NN-{640,1080}.avif`와 `NN-720.webp`
    - 원석: `public/images/saju-crystals/stones/<image>-{240,480}.avif`와 `-360.webp`
    - OG: `og-1200x630.jpg`
    - 파일이 있으면 빌드 때 자동으로 연결된다.
  - 음력 프로필은 프로필의 birthYear가 엔진의 양력 연도와 다를 수 있다. 그러면 가장 이른 연도를 고를 때 답변 오류 문구가 뜰 수 있다. 3단계나 5단계의 브라우저 확인 때 본다.
  - 브라우저 실화면 확인은 아직 하지 않았다(5단계).

### 3단계 (2026-11-11)
- 커밋 `d501a62d4`
- 진입 카드
  - `index.html`의 `#ukbuCard` 바로 뒤에 `#sajuCrystalEntry`를 넣었다.
  - 사용자 그림을 `<a>`로 감싸고, alt에 그림 속 문구를 옮겼다.
  - 그림 아래에 실제 버튼 "나에게 맞는 원석 찾기"를 두었다. 링크는 `/saju/crystals/start/?from=saju_result`이다.
  - PC에서 최대 420px. 스타일은 `styles/saju-tea-entry.css`에 있다.
  - `sync:public`을 돌렸다. 이때 생긴 free-fortune-policy 줄끝 변경은 되돌렸다.
- 이미지(사용자 원본 `entry-yeoni-crystal-portrait.webp`에서 만들었고, 새로 생성한 그림은 없다)
  - `public/images/saju-crystals/entry-portrait-{496,992}.{avif,webp}`
  - `public/images/saju-crystals/og-1200x630.jpg`
    - 원본에서 (41,279) 위치의 910x478을 잘라 늘렸다.
    - 글자는 빠지고 연이가 가운데 온다. 연꽃 윗부분이 살짝 잘린다.
  - `/saju/crystals/` 히어로에도 같은 그림을 쓴다(`CrystalCta variant="portrait"`).
  - 내보내기 스크립트: `D:\CodeDestiny-Build\saju-crystals-20261111\src\export-entry.mjs`
- 계측
  - `js/core/analytics.js`의 위임 클릭이 `data-cd-crystal-entry`를 읽어 `crystal_entry_click {from}`을 보낸다.
  - `from`은 `[a-z_]`만 받는다.
  - `verify-analytics-events`에 세 가지 검사를 더했다: 한 번만 발화하는지, 잘못된 값을 무시하는지, 셸 표식이 있는지.
- 링크
  - `/saju/` 카탈로그(saju-service-catalog의 무료 묶음)
  - `/saju/guide/`와 `/saju/five-elements/`의 카드·칩(`from=guide`, `from=five_elements`)
  - 푸터 core 그룹
  - 푸터 라벨 파일 `siteFooterHubCopy.ts`의 로케일은 ko·ja·zh·zh-TW·en 5개다. 계획의 12개는 잘못 적힌 것이다.
- SEO
  - 사이트맵: `/saju/crystals`, priority 0.78.
  - entity-registry 항목을 추가했다. five-elements의 relatedPaths에도 `/saju/crystals`를 넣었다.
  - `publicSeoPages.sajuCrystals`를 추가했다. 제목 키는 `siteSeo.028`이다(025는 이미 쓰고 있었다).
  - sitemap, lastmod 원장, llms-full.txt를 다시 생성했다.
- noindex(`/saju/crystals/start`)
  - 색인 원장 `hidden()`: 메타 noindex와 사이트맵 제외.
  - `_headers` X-Robots-Tag: 규칙 89개로, 예산 100 안이다.
  - `verify-adsense-readiness` 패턴과 `index-policy.test` 고정 목록에도 넣었다.
  - `static-canonical-route-map`은 앱 라우트라 손대지 않았다.
- 음력 수정
  - `crystal-flow.mjs`에 `crystalYearWindow()`를 추가했다.
  - `CrystalFlowClient`의 init이 엔진 입력을 먼저 만든다. 연도 범위와 셸 경험 필터는 `periods.window`로 정한다. 경합은 토큰으로 막는다.
  - 테스트: 음력 1990-12-20 → 양력 1991.
- 덤으로 고친 것: 2단계 문구 "무료 사주에서"가 `saju-bundle-copy` 가드에 걸려 "무료 만세력에서"로 바꿨다.
- 검증
  - crystal-flow·bundle-copy·index-policy 테스트: 41 pass.
  - analytics-events, sitemap-drift, seo-entity-registry, home-service-registry, llms 검사, tsc: 모두 OK.
  - check:fast: exit 0. jest 474 suites 통과(1 skipped), 7897 tests 통과, BLOCKED 없음.
  - `verify-adsense-readiness`는 `dist/index.html`이 있어야 돌아가서, 5단계 빌드 때 확인한다.
- 남은 일
  - 브라우저 실화면 확인(5단계)
  - 워커 프로필 `sajuCrystal` 동기화(사용자 결정)

### 4단계 (2026-11-11)
- 사용자 그림은 QC를 통과했고 `D:\CodeDestiny-Build\saju-crystals-20261111\export\`로 내보냈다(`manifest.json`).
- `export\public\images\saju-crystals\{webtoon,stones}`를 워크트리 `public/images/saju-crystals/`에 그대로 복사했다.
  - 웹툰: 10컷 × 3파일 = 30개. 3·7·9컷은 1:1(원본 1254), 나머지는 3:2. `SQUARE`(1280×1280)는 비율만 쓰므로 그대로 두었다.
  - 원석: 12종 × 3파일 = 36개(amazonite, amethyst, aquamarine, citrine, clear-quartz, gold-rutilated-quartz, green-phantom-quartz, obsidian, rose-quartz, tiger-eye-blue, tiger-eye-gold, tiger-eye-red).
  - `crystal-assets.js`가 빌드 때 파일을 찾아 연결하므로 별도 매니페스트는 필요 없다.
- 웹툰 alt 10개를 `manifest.json`의 `codeChanges.altSuggestions`(실제 그림 묘사)로 바꿨다(`lib/brand/saju-crystal-webtoon.mjs`).
- **사용자 결정(2026-11-11 원문)**: "그린 어벤추린, 스모키쿼츠, 화이트 칼세도니, 라브라도라이트는 일단 생략하거나 svg로 만들어" → **생략**을 택했다. 이 4종(green-aventurine, smoky-quartz, white-chalcedony, labradorite)은 그림 없이 오행 색 칩으로 대체한다. SVG는 만들지 않는다. 추천 제외 3종(moon-stone-blue, moon-stone-peach, money-stone)도 그림이 없다.
- 5단계 캡처에서 볼 QC 메모
  - 위쪽 말풍선 여백이 밋밋하다. 여러 컷에서 아치·선반이 그 가장자리에서 가로로 잘린다.
  - OG 이미지에서 연꽃 윗부분이 살짝 잘린다.

### 5단계 (2026-11-12)
- 빌드
  - 다른 체크아웃의 `next dev -p 3217`이 떠 있어 빌드 가드가 막는다. 이 워크트리는 `.next`를 공유하지 않으므로 `ALLOW_DEV_SERVER_DURING_BUILD=1 npm run build`로 돌렸다. EXIT 0, `[adsense-readiness] OK`.
  - 첫 빌드는 기존 문제로 실패했다. `out/saju/free` 제목 폭이 63으로 60을 넘었다. origin/main이 이미 `542fb9b42`로 고쳤으므로 `-x`로 cherry-pick했다(`70deca29d`, lastmod 충돌은 ours 뒤 `sitemap:generate`로 다시 만듦). main에 합칠 때 같은 변경이라 충돌이 나지 않는다.
  - 빌드는 `js/core/free-fortune-policy.{js,mjs}`와 `public/` 사본의 줄끝을 바꾼다. 내용은 같으니 빌드 뒤 `git checkout --`로 되돌린다.
- HTML grep (`dist/saju/crystals/index.html`)
  - H1 "나에게 좋은 기운을 살펴보고, 어울리는 원석을 찾아보세요", canonical `https://code-destiny.com/saju/crystals/`, robots index, og 1200×630.
  - 웹툰 첫·끝 대사와 6컷 주석이 있다. 웹툰 webp 참조 20개, 새 alt, 원석 그림 12종.
  - FAQ 7문항이 모두 있다. JSON-LD는 WebPage·BreadcrumbList와 사이트 공통 Organization뿐이다. FAQPage·Product·퍼센트는 없다.
  - sitemap에 `/saju/crystals/`가 있고 `/start`는 없다. start는 `noindex, nofollow` 메타와 `_headers` `X-Robots-Tag: noindex, follow`가 있다.
  - `verify-adsense-readiness` OK, `sitemap:check` OK(1070 URL).
- 브라우저 390/1280 (dist 정적 서버, Playwright, 캡처는 `D:\CodeDestiny-Build\saju-crystals-20261111\qa\`)
  - 랜딩: 웹툰 10장, 원석 그림 14개(카드·결과 예시 합산), 색 칩 4개(생략한 4종)가 보인다. 깨진 이미지와 가로 넘침은 없다. `landing-*`, `landing-*-cutNN-clean.png`.
  - 시작 흐름: 프로필 없음 → 좋았던 해·힘들었던 해 → 후속 질문 → 결과(백수정·황수정, 면책 문구, 퍼센트 없음) → 저장(`codeDestiny:sajuCrystal:guest:qa-profile-a`, 결과 본문은 저장하지 않음) → 새로고침하면 이어보기 → 수정하면 값이 미리 채워짐 → 결과. `start-*`.
  - 프로필 전환: B는 A의 기록을 보지 않고 출생시간 모름 안내가 나온다. A로 돌아오면 이어보기가 다시 뜬다.
  - `/ggulggul/` 사주 결과: `#sajuCrystalEntry`가 `#ukbuCard` 바로 뒤에 보인다. 그림 로드, 넘침 없음. CTA는 `/saju/crystals/start/?from=saju_result`로 간다. `ggulggul-*-entry-card.png`.
    - 저장된 프로필이 있으면 start에 그 프로필 이름이 나온다(`ggulggul-*-entry-to-start-profile.png`).
    - 프로필을 저장하지 않고 입력만으로 계산한 결과에서 들어오면 "먼저 출생 정보가 필요해요" 안내가 나온다(`ggulggul-*-entry-to-start.png`). 결과를 프로필별로 보관하는 설계대로다. 셸 입력값을 그대로 넘길지는 사용자 결정 거리다.
    - 셸 계산에는 `/api/auth/me` 로그인 응답과 honey catalog 스텁이 필요하다(`scripts/verify-saju-summary-browser.mjs`와 같은 방식).
  - 원석 기능의 버그는 찾지 못했다.
- QC 메모 확인
  - 1:1 컷(3·7·9)은 위쪽 빈 여백이 넓고(1280에서 약 150px), 아치·선반이 위 가장자리에서 잘린다. 사용자 그림이라 코드로 고치지 않았다.
  - OG는 연꽃 윗부분이 가장자리에 닿는 정도다.
- 검사
  - check:fast(`--base=bae74a4c1`): exit 0. jest 474 suites 통과(1 skipped), 7897 tests 통과. 로그는 `D:\CodeDestiny-Build\saju-crystals-20261111\qa\check-fast.log`. (`timeout 590`을 걸면 jest 도중 끊겨 가짜 FAIL이 난다. 6분쯤 걸린다.)
  - check:pre-push: verify:public-mirror-fresh만 FAIL이다. `free-fortune-policy.{js,mjs}` 4개 파일을 sync가 바꾼다고 하지만 git diff는 비어 있고 줄끝(CRLF/LF)만 다르다. 이 브랜치는 그 파일을 건드리지 않았다(기존 Windows 줄끝 문제). 나머지 home-service-registry·sitemap-drift·llms --check·seo-entity-registry·repo-hygiene는 모두 OK다.
- 1280 요소 캡처가 뷰포트(900)보다 크면 그림이 빈 색으로 찍힌다. 캡처 쪽 문제이므로 뷰포트를 1400으로 키워 다시 찍었다.

## 원 요청 요약 (요구사항 체크리스트)
- 진입 카드 문구: 기능명 "사주 원석 추천", 보조 "연이의 원석 큐레이션", 제목 "내게 좋은 기운, 어떤 원석에 담겨 있을까?", 설명 "좋았던 해와 힘들었던 해를 돌아보고, 나에게 어울리는 원석을 찾아보세요", 버튼 "나에게 맞는 원석 찾기".
- 핵심 설명: "사주에 없는 오행이 반드시 필요한 오행은 아니에요 / 꿀꿀운세는 사주 전체의 흐름과 실제로 좋았던 시기, 힘들었던 시기를 함께 살펴 나에게 도움이 되는 기운과 어울리는 원석을 제안해요"
- 질문: ① "돌이켜보면 유난히 잘 풀렸던 해가 있었나요?" (좋았던 해가 떠올라요/특별히 떠오르는 해가 없어요/잘 기억나지 않아요) ② "반대로 유난히 버겁거나 일이 잘 풀리지 않았던 해는요?" (동일+건너뛰기) ③ 영역: 일·사업·학업 / 돈·생활 여건 / 연애·대인관계 / 생활 전반 / 여러 일이 섞여 있었어요. 각 1~3개, 한쪽만으로 진행 가능, 추가 질문 ≤2, 기억 안 남은 신호 아님, 출생 전·미래 연도 제외, 올해는 "지금까지" 표시, 월은 선택.
- 재진입: "이전에 알려주신 시기로 살펴볼까요?" + "수정하기".
- 결과: 함께 살펴볼 기운(우선·보조) / 원석 2~3 / 이유(사주 전체·알려주신 시기 구분) / 원석 의미 / 수정·보관, 상세 근거 펼쳐보기, 고지 "원석의 오행과 의미는 전통적 해석과 문화적 상징을 바탕으로 하며, 건강이나 운세의 변화를 보장하지 않습니다". 정확도·적중률 % 금지.
- 원석 기본 10종: 목 아마조나이트(소통,용기)·그린 팬텀 쿼츠(꾸준한 성장,안정적인 축적) / 화 자수정(차분함,집중)·로즈쿼츠(사랑,관계) / 토 황수정·시트린(풍요,자신감)·타이거아이 금갈색(결단,축적) / 금 백수정(맑음,정돈)·골드 루틸 쿼츠(풍요,자신감) / 수 흑요석(수호,보호)·아쿠아마린(소통,용기). 필드: id,nameKo,nameEn,aliases,variant,color,element,elementBasis,symbolicMeanings,description,sourceUrls,image,reviewedAt.
- 랜딩 `/saju/crystals/`: Title "사주 원석 추천 | 나에게 좋은 오행 찾기 - 꿀꿀운세", H1 "나에게 좋은 기운을 살펴보고, 어울리는 원석을 찾아보세요", Description "좋았던 해와 힘들었던 해를 사주 흐름과 함께 살펴보세요. 꿀꿀운세가 도움이 되는 오행 후보와 그에 어울리는 원석, 추천 이유를 안내합니다". 구성: 핵심문구+시작버튼 / 3단계 요약 / 웹툰 / 오행별 원석 / 결과 미리보기(예시 표시) / FAQ 7개 / 마지막 버튼. 키워드 자연 포함: 사주 원석 추천, 오행 원석, 나에게 맞는 원석, 용신 원석. WebPage·BreadcrumbList, Product/가격/별점/FAQPage 스키마 금지. OG 이미지.
- FAQ: 사주에 없는 오행의 원석을 고르면 되나요? / 좋았던 해와 힘들었던 해는 왜 물어보나요? / 같은 해에 좋은 일과 나쁜 일이 함께 있었다면요? / 기억나는 연도가 적어도 추천받을 수 있나요? / 출생시간을 몰라도 이용할 수 있나요? / 원석의 오행과 효능은 어떤 기준으로 설명하나요? / 답변을 수정하면 추천도 달라지나요?
- 진입 이미지 연출: 따뜻한 작은 원석 공방, 꽃돼지 연이가 여러 색 원석 트레이를 들고 반갑게 맞이, 기대·자신감 표정, 정돈된 원석과 작은 꽃, 크림·연분홍·연보라, 과장 광선 없음, 모바일에서 얼굴·원석 선명, 제목·버튼 여백(왼쪽 1/3), 글자 없음.
- 웹툰 10컷 대본: 원 요청 6절 그대로(1 고르는 재미 ~ 10 자연스러운 시작). 대사는 HTML 말풍선, 2컷 카드에 "설명용 예시", 6컷 대운·세운에 "그 시기의 운 흐름" 보조설명, 7컷 정답 도장·적중률 금지, 8컷 원석 카드 "예시" 표시, 웹툰 상단과 10컷 아래 실제 버튼 "나에게 맞는 원석 찾기". 네오는 등장하지 않는다.
- 최종 보고: 수정 파일, 엔진 연결 방식, 원석 데이터 출처, 생성 이미지 경로, 모바일·PC 캡처, 검증 결과, 남은 미완료 항목.

## 이미지 결정 변경 (2026-11-11, 계획 §4 대체)
- Codex 이미지 생성은 사용 한도에 걸려 실패했다("try again at Nov 13th, 2026 9:51 AM"). OPENAI_API_KEY는 없고, 다른 생성기로 바꾸는 것은 승인받지 않았다. **이미지는 생성하지 않는다.**
- 진입 이미지: 사용자가 직접 주었다. "이미지는 지금 첨부한 이미지로 진입점을 꾸며주도록해줘" → `D:\CodeDestiny-Build\saju-crystals-20261111\user-supplied\entry-yeoni-crystal-portrait.webp`(992x1586, 세로, 글자와 버튼이 그림에 박혀 있음).
  - 이미지를 `<a>`로 감싸고 alt에 이미지 속 문구를 넣는다. 그 아래에 실제 HTML 버튼 "나에게 맞는 원석 찾기"를 둔다.
  - PC에서는 폭을 약 420px로 제한한다. 496/992 크기의 avif/webp로 `public/images/saju-crystals/entry-portrait-{496,992}.{avif,webp}`에 내보낸다.
  - OG 이미지는 이 그림 상단을 1200x630으로 잘라 만들거나, 기존 사주 OG를 임시로 쓴다.
- 웹툰 10컷과 원석 일러스트: 사용자가 프롬프트(`D:\CodeDestiny-Build\saju-crystals-20261111\PROMPTS-webtoon-stones.md`)로 직접 만들어 `user-supplied\`에 `webtoon-01..10.png`, `stone-<id>.png`로 넘겨준다.
  - 받기 전까지 2·3단계는 웹툰 데이터(대사·alt)와 이미지 경로만 연결한다. 이미지가 없으면 웹툰 섹션은 대사 텍스트로 대체하거나 숨기고, 원석 카드는 오행 색 칩으로 대체해 빌드가 깨지지 않게 한다.
  - 4단계는 사용자 이미지를 받은 뒤 `src/export.mjs`로 내보내고 QC(영냥이 귀 2개, 연이 연꽃·스카프·코·귀)를 하는 일로 바뀐다.

## 2026-11-12 후속 — 다른 기기 동기화·프로필 필수·그림 다듬기

### 사용자 결정 원문 (2026-11-12)
> 다른 기기에서도 보이게 하는게 좋겠고 프로필 없이는 불가능하도록해줘 그림 다듬기도 진행해주고 일단 안전하게 병합해주면 좋겠다

- 병합은 상위 세션이 처리한다(이 워크트리 에이전트는 merge·push·배포하지 않음).

### 승인 범위와 남은 승인
- **워커 배포가 필요하다. 사용자는 아직 워커 배포를 요청하지 않았다.** 워커 배포 전에는 클라이언트가 서버 지원 여부(상세 GET 응답의 `sajuCrystal` 키 유무)를 보고 브라우저 저장만 쓴다. 배포 뒤 자동으로 동기화가 켜진다.
- Next 페이지 배포·워커 배포·push는 모두 사용자 요청 시에만.

### 1) 다른 기기 동기화 (커밋 de32d6db0)
- 워커 허용 목록: `worker/lib/models.js` `profileCardSchema.sajuCrystal`(Mixed, 기본 undefined — 엄격 스키마라 선언 없으면 조용히 버려진다).
- `worker/routes/profile.js`
  - `PATCH /api/profile/:id`에 body가 `{ profile: { sajuCrystal } }` **하나뿐**일 때만 전용 분기(`handleUpdateSajuCrystal`). 출생정보·이름·현재 카드는 건드리지 않고, 프로필 수정 내역(PointHistory)도 남기지 않는다.
  - 검사: `lib/saju/crystal-flow.mjs` `sanitizeCrystalRecord` — 모양 `{v, answers, answersKey, resultKey, versions, updatedAt}`만, 결과 본문 없음, 답변·항목 키 허용 목록, 키 형식 `ca1-/cr1-<16hex>`, 버전 토큰, 항목 ≤8·추가질문 ≤2, 크기 상한 `CRYSTAL_RECORD_MAX_BYTES`=2048(넘으면 413), 미래 `updatedAt`은 서버 시각으로 당김.
  - `updatedAt`이 더 늦을 때만 덮어쓴다(같거나 이르면 `applied:false`와 서버 기록 반환). 소유자 조건(userId+profileId)으로만 찾고 없으면 404.
  - `GET /api/profile/:id` 상세 응답에만 `sajuCrystal`(없으면 null)을 싣는다. 목록 응답·`toClientProfile`은 그대로.
  - 다른 필드와 섞여 오면 기존 일반 수정 경로이고, 일반 수정은 `sajuCrystal`을 쓰지 않는다.
- 클라이언트 `app/saju/crystals/start/CrystalFlowClient.jsx`: 로그인 사용자는 서버 기록을 읽어 로컬과 비교(`resolveCrystalRecords`, 늦은 `updatedAt` 우선), 서버가 더 늦으면 로컬 캐시 갱신, 로컬이 더 늦고 서버가 지원하면 서버에 올린다. 저장은 로컬 먼저 → 서버. 비로그인은 localStorage만(게스트 저장소·오프라인 캐시 그대로).
- **`DestinyProfileManager.storage.update`는 워커에 닿지 않는다**(로컬 전용이고 Next 페이지에는 로드되지 않음). 그래서 이전 코드의 그 호출을 지우고 `authFetch`로 직접 PATCH한다.
- `sajuCalibration`(셸 경험 입력)은 워커 허용 목록에 없고 이번에 바꾸지 않았다.
- 테스트: `__tests__/worker/profile.saju-crystal.test.js`(DB·인증 모두 목), `__tests__/ui/saju-crystal-flow.test.mjs`(가짜 fetch). 운영 DB·실제 네트워크 없음.

### 2) 프로필 필수 (커밋 19e0976c3)
- 저장된 프로필 카드(`FORTUNE_APP_USER_PROFILES.list::<scope>`, `.current::<scope>`)에서 id가 있고 생년월일이 맞는 카드만 쓴다(`readSavedCrystalProfile`). 셸 입력 폼이 남기는 브리지 키(`FORTUNE_APP_USER_PROFILE`, `FORTUNE_APP_VEDIC_PAYLOAD`, `OLYMPUS_ORACLE_PROFILE`)·쿼리·화면 입력으로는 계산하지 않는다. 화면이 고른 카드는 저장 목록에 같은 id가 있을 때만 따른다.
- 로그인 직후 로컬 목록이 비어 있으면 `fetchCurrentDestinyProfile()`로 서버 목록을 한 번 받아 다시 읽는다.
- 프로필 없음 화면: "저장된 프로필이 필요해요" + CTA 하나 `프로필 만들기·고르기` → `/#dpMasterCard`(셸의 프로필 카드 만들기·고르기). 쿼리는 유입 출처 `from`만 읽는다.
- 셸 진입 카드(`#sajuCrystalEntry`)는 그대로 `/saju/crystals/start/?from=saju_result`로 간다(출생정보를 넘기지 않음).

### 3) 그림 다듬기 (커밋 f1c8a1197) — 사용자 그림만, 새로 생성 없음
- 웹툰 10컷: 위쪽의 평평한 빈 띠(17~24%, 대사는 HTML로 그림 아래에 나오므로 겹침 없음)를 잘랐다. 띠 아래끝 = 줄별 밝기 표준편차가 처음 6을 넘는 줄(01:175, 02·04·05·06·08:174, 10:176, 03:253, 07:274, 09:301). 그보다 20px 위에서 자른다(5컷 회상 원 등 장면이 가장자리에 닿지 않게). 가로 컷은 모두 top=154 → 1536x870, 03=1254x1021, 07=1254x1000, 09=1254x973. 같은 형식·품질(avif q55 e6 640/1080, webp q80 e6 720), 확대 없음. 스크립트 `D:\CodeDestiny-Build\saju-crystals-20261111\src\export-webtoon-crop.mjs`, 기록 `export\manifest.json`의 `webtoonTopBandCrop`. `lib/brand/saju-crystal-webtoon.mjs` 컷별 w/h 갱신, 테스트가 실제 파일 비율과 선언을 대조한다.
- OG `public/images/saju-crystals/og-1200x630.jpg`: 연꽃 끝(원본 y≈256)이 그림 속 제목 아래끝(y≈254~264)과 거의 붙어 있어 위로 옮겨 자를 수 없다. 원본 전체 폭으로 y=256~735를 1200x579로 줄여 아래에 두고, 위 51px은 같은 줄 색(연꽃·제목 픽셀 제외 열 평균, 가로 흐림)으로 채우고 경계는 연꽃만 남기고 부드럽게 섞었다. 제목 획 끝 몇 픽셀은 투명 처리. 스크립트 `src\og-pad.cjs`(export-entry.mjs에서 호출). 진입 세로 그림 파일은 바이트 동일.
- 셸 진입 카드: 그림 안에 "나의 원석 찾기" 버튼이 그려져 있어 HTML 링크 "나에게 맞는 원석 찾기 →"를 채운 큰 버튼에서 테두리만 있는 조용한 보조 링크로 바꿨다(`styles/saju-tea-entry.css`, 최소 높이 44px, 포커스 윤곽 유지). `npm run sync:public`.
- 전후 캡처: `D:\CodeDestiny-Build\saju-crystals-20261111\qa\polish\` (`before-*`, `after-*`; 컷 03·05·07·09, 진입 카드, OG, 390/1280). 진입 카드는 `probe.mjs` SRC 모드(저장소 index.html·public을 직접 서빙)로 찍었다. 기존 dist는 셸 무료 사주 진입 함수가 뜨지 않아 진입 카드까지 가지 못했다.

### 함정
- `node -e "..."` 안의 백틱은 bash가 해석한다. 스크립트 파일(`cat > f <<'EOF'`)로 쓰고, 정규식 줄은 Edit 도구로 고친다(템플릿 리터럴 안 백슬래시 유실).
- `node scripts/run-mock-tests.mjs node <file>`은 모든 node 테스트 패턴을 돌려 수 분 걸린다. 단일 파일은 `NODE_OPTIONS="--require=./scripts/lib/mock-network-guard.cjs" node --test __tests__/ui/<file>.test.mjs`.
- `npm run sync:public`·빌드 뒤 `js/core/free-fortune-policy.*`·`public/js/core/free-fortune-policy.*`의 줄끝(CRLF)만 바뀐 변경은 `git checkout --`으로 되돌린다.

### 검증 (2026-11-12)
- `__tests__/ui/saju-crystal-flow.test.mjs` 16/16 통과, 워커 프로필 jest 14개 묶음 148개 통과.
- `npm run check:fast -- --base=bae74a4c1` 통과(77단계 ok, jest 475 suites/7913 tests 통과·1 skip). 첫 실행은 `verify:sitemap-drift`에서 막혔다 — `/saju/crystals/` 서명 변경(컷 크기)과 날짜 롤링 페이지(fortune/monthly·today·tomorrow, /today/) lastmod. `npm run sitemap:generate` 결과를 별도 커밋 adbadf7eb로 담았다. main에서 merge 충돌이 나면 사이트맵 파일은 손으로 고치지 말고 merge 뒤 `npm run sitemap:generate`를 다시 돌려 담는다.
- 전후 캡처 확인: 컷 03·05·07·09(390/1280) 얼굴·모자·연꽃·회상 원 온전, 그림 비율과 상자 비율 일치(1px 반올림), OG 연꽃 위 여백 자연스러움, 진입 카드 보조 링크 확인.

## 2026-11-12 병합
- `f9abb37c7`에서 origin/main(37258e3e9 이후 14커밋)을 원석 브랜치에 병합했다. 충돌은 `config/sitemap-lastmod.json` 하나였고, origin/main 쪽을 받은 뒤 `npm run sitemap:generate`로 다시 만들었다.
- 병합 결과로 `npm run check:fast -- --base=bae74a4c1`를 돌려 exit 0이었다(475 suites, 7916 tests 통과, 1 skip).
- 브랜치는 origin/main보다 뒤처진 커밋이 0개다. 그래서 main으로 fast-forward push가 가능하다.
- 남은 일(사용자 요청 시에만): origin/main push(Pages 배포), 워커 배포(`sajuCrystal` 동기화 켜기), `npm run worktree:remove`로 워크트리 정리.
- 로컬 main은 다른 워크트리(`C:/Users/user/Documents/Codex/worktrees/yeongnyangi-blue-passes-20261024-050530`)에 체크아웃되어 있어 건드리지 않았다.

## 2026-11-12 운영 반영 승인 (1회)
- 사용자 원문: "오케이 그 세션 승격 결과 추적해서 되는대로 이 변경도 운영에 반영시켜"
- 범위: 이 브랜치의 변경을 origin/main에 push하고, `gh workflow run "Release Cloudflare Pages and Worker" --ref main -f mode=production`으로 1회 승격한다(Pages와 워커가 함께 배포되므로 `sajuCrystal` 동기화도 켜진다).
- 순서: 다른 세션(user-9d)이 가디언 두 번째 승격을 하고 있다(146e2e24b 수정, 릴리스 A 포함). 그 승격이 끝나 운영 SHA가 확정될 때까지 push하지 않는다. 승격은 main HEAD 기준이므로, 먼저 push하면 그 승격에 이 변경이 섞인다.
- 그다음: origin/main 재병합 → check:fast → push → main CI·스테이징 통과 확인 → production 승격 → `verify:deployed-sha`와 `/saju/crystals/` 실화면 확인 → `npm run worktree:remove`.
