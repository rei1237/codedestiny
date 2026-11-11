# 사주 원석 추천 — 연이의 원석 큐레이션 구현 계획

## Context
꿀꿀운세에 무료 기능 "사주 원석 추천"을 더한다. 기존 사주 분석이 정한 구조적 후보 오행(억부·조후·통관·특수격)을 사용자의 좋았던 해·힘들었던 해와 대조해 우선순위를 정리하고, 그 오행에 대응하는 원석을 추천한다. 공개 랜딩 `/saju/crystals/`(SSG), 질문·결과 흐름, 사주 결과 화면 진입 카드, 연이·영냥이 설명 웹툰 10컷을 만든다.

확정된 결정 (2026-11-11 사용자 답변)
- 웹툰 10컷은 이번에 생성한다. "웹툰은 사용자가 만든다"는 규칙은 코드데스티니 **스토리 웹툰**에만 적용된다. 메모 `webtoon-art-user-made.md`의 범위를 이렇게 고친다.
- 무료 기능이다. 결과는 프로필별로 저장하며, 로그인 사용자는 프로필 카드 필드에, 비로그인 사용자는 프로필 범위 localStorage에 둔다. `/records/` 보관함 정책은 건드리지 않는다.
- 캐릭터 기준 이미지: 연이는 `docs/design/character-references/yeoni-profile-v1.png`, 영냥이는 `D:\CodeDestiny-Build\양냥이 프로필 시트.webp`. 요청에 있던 C01·C02 파일은 디스크 어디에도 없어서 보고서에 그렇게 적는다.

탐색으로 확인한 사실
- 사이트 구조: Next.js 정적 export와 Cloudflare Pages. 사주 결과 화면은 레거시 셸 `index.html`(`/ggulggul/`)과 `js/saju-engine.js`에 있다.
- 로컬 체크아웃은 `feat/world-cast-page` 브랜치이고, 다른 세션의 미커밋 변경이 있으며 main보다 2084커밋 뒤처져 있다. 그래서 **origin/main 기준 새 워크트리**에서 작업한다: `scripts/create-safe-worktree.ps1 -Slug saju-crystals`.
- 원국 판정의 기준 모듈은 `lib/saju/natal-core/`(`analyzeNatalCore`, 동결 객체, `NATAL_CORE_VERSION`)다. 경험 보정 모듈 `lib/saju/experience-calibration.mjs`의 `analyzePeriods`·`calibrateExperience`는 원국을 읽기만 한다. 설문이 종격·강약을 뒤집던 버그는 2026-10-26 커밋(0ce81919a 외)에서 제거됐다.
- 경로 충돌은 없다. 원석 소울 타로는 `/tarot/crystal-soul/`(id `tarot-crystal-soul`)를 쓴다. 이번 기능의 id는 `saju-crystals`로 하고, 코드에서는 moonstone(월정석)이라는 이름을 피한다.

## 설계

### 1. 추천 엔진 — `lib/saju/crystal-recommendation.mjs` (순수 함수, 결정적)
흐름: `analyzeNatalCore(pillars)` → `analyzePeriods({natal, applied, timeline})` → `recommendCrystals({natal, periods, answers, catalog})`
- **원국 불변**: natal·periods는 동결된 입력으로 읽기만 하고, 반환값에는 원국 필드를 복사하지 않는다(`natalAnalysisId`만 참조). 원국 구조 판정과 경험 대조 결과는 각각 `structure`, `experience` 블록으로 나눠 반환한다.
- **구조 후보** = `periods.hypotheses` 중 evaluable인 것(reading·eokbu·johu.hanNan·johu.joSeup·tonggwan·special). 기본 순서는 `natal.yongshin.priority`를 따른다. 오행 개수(`counts`)는 입력으로 쓰지 않는다. 그래서 "없는 오행이라서 추천"되는 경로가 구조적으로 없다.
- **경험 대조**: `experience-calibration.mjs`에서 `toneOf`, `resolveTones`, `sewoonCandidates`, `cycleCandidates`를 **export만 추가**한다(동작 변경 없음). 이 함수들로 가설별·영역별 agree/disagree를 따로 센다. 영역은 work·money·relationship·life 네 가지이고, 한 해의 영역별 답을 합산하지 않는다. "여러 일이 섞임"과 "기억 안 남"은 신호에서 뺀다. 입춘 경계와 교운 연도가 모호하면 'ambiguous'로 남기고 결과의 한계 문구에 반영한다. 최소 근거 기준은 `CALIBRATION_POLICY`의 minSignals 3, minYears 2를 재사용한다.
- **순위 규칙**: 근거가 기준을 넘고 한 가설이 다른 가설보다 2건 이상 더 맞을 때만 그 가설을 "우선 후보"로 올린다. 이때도 구조 후보 목록 바깥의 오행은 추가하지 않는다. 그렇지 않으면 상태를 `base`(경험 없음) 또는 `multiple`(엇갈림)로 두고 후보를 여럿 유지한다.
- **추가 질문(최대 2개)**: 가설끼리 운 판단이 갈리는 과거 연도 중 사용자가 아직 답하지 않은 해를 고른다. 출생 이후부터 작년까지가 대상이다. 질문에는 예상 길흉을 노출하지 않는다.
- **원석 선택**: 우선·보조 오행마다 카탈로그의 `recommendable:true` 항목을 고정 순서(카탈로그 내 rank, 가격 필드 없음)로 골라 총 2~3개를 만든다. 후보가 적으면 억지로 채우지 않는다.
- **재현성**: `resultKey = hash(natalAnalysisId, periodsKey, answersKey, CRYSTAL_ENGINE_VERSION, CATALOG_VERSION)`. 버전이 하나라도 다르면 저장된 결과를 버리고 다시 계산한다.
- **설명문**: 템플릿 문장만 쓰고 LLM은 쓰지 않는다. 이유는 "사주 전체에서 본 이유"와 "알려주신 시기를 참고한 이유"로 나눠 보여 준다.
- **용신(applied) 산출**: 셸의 `applyRuntimeYongshinPolicy`와 같은 규칙으로 맞춘다. 구현 시 `lib/saju/gyeokguk-authority.mjs`의 `buildApprovedNatalAnalysis`에 재사용할 수 있는 투영이 있는지 먼저 확인한다. 골든 차트 몇 개로 셸 결과와 같은지 테스트한다.
- **시간 미상**: 대운 cycles를 비운다. 세운만으로 대조하고 그 한계를 결과에 표시한다. 시간에 따라 갈리는 판정은 natal-core의 보류 결과를 그대로 따른다.

### 2. 원석 카탈로그 — `lib/saju/crystal-catalog.mjs` (`CATALOG_VERSION='crystal-catalog-v1'`)
- 필드: `id, nameKo, nameEn, aliases, variant, color, element, elementBasis, symbolicMeanings, description, sourceUrls, image, reviewedAt, recommendable, rank`.
- 기본 10종에 qiyicrystal 오행표·가이드·도감에서 확인한 항목을 더한다. 문장은 독자적으로 다시 쓰고 출처 URL을 기록한다.
- 타이거아이는 금갈·붉은·푸른 변종을 별도 항목으로 둔다. 골드 루틸 중복은 하나로 정리한다. 문스톤·라브라도라이트는 품종을 확인한 뒤 넣는다. 근거가 불분명한 유통명은 `recommendable:false`로 둔다.
- 출처와 검토 기록은 `docs/design/saju-crystal-catalog-sources.md`에 남긴다.

### 3. 화면·라우트
- `app/saju/crystals/page.js`: 공개 SSG 랜딩. 일곱 개 절(핵심 문구와 CTA, 3단계 요약, 웹툰, 오행별 원석, "설명용 예시" 결과 미리보기, FAQ 7개, 마지막 CTA)을 서버 컴포넌트로 렌더해 최초 HTML에 담는다. 메타데이터는 `generatePageMetadata()`로 만든다(title·description·canonical·OG). JSON-LD는 `lib/structured-data.ts`의 WebPage·BreadcrumbList를 쓰고 Organization은 layout의 것을 참조한다. FAQPage·Product 스키마는 넣지 않는다.
- `app/saju/crystals/start/page.js` + `CrystalFlowClient.jsx`: 질문과 결과를 보여 주는 클라이언트 전용 화면이며 메타데이터 noindex다. 개인 데이터는 서버로 보내지 않으므로 공개 HTML·캐시에 섞일 수 없다. 쿼리에는 `from=`(진입 위치)만 허용한다.
  - 프로필 로드는 `js/destiny-profile.js`의 `DestinyProfileManager.storage.current()`를 쓴다. 프로필이 없으면 기존 출생정보 입력으로 안내한다. 사주 계산은 `lib/korean-calendar/natal.js`의 `calculateNatalSaju`와 `daeun.js`의 `daeun()`을 쓴다.
  - 질문 순서: ① 좋았던 해(0~3개, 연도와 선택적으로 월) → ② 힘들었던 해 → ③ 연도별 영역(영역마다 좋음/힘듦을 따로 고르는 칩) → 필요할 때만 추가 질문. 연도 범위는 출생연도부터 올해까지이고, 올해에는 "지금까지" 표시를 붙인다. 각 단계에서 "떠오르지 않아요"와 "건너뛰기"를 고를 수 있다.
  - 재진입: 저장된 답이나 셸의 `sajuCalibration`(`codeDestiny:sajuCalibration:<profileId>`)이 있으면 "이전에 알려주신 시기로 살펴볼까요?"와 "수정하기"를 띄운다.
  - 저장 키는 `codeDestiny:sajuCrystal:<scope>:<profileId>`이고 값은 `{v, answers, answersKey, resultKey, versions, updatedAt}`다. 로그인 사용자는 `storage.update(id,{sajuCrystal})`도 호출한다. `worker/routes/profile.js`가 이 필드를 버리는지 확인하고, 버리면 `sajuCalibration`과 같은 방식으로 허용 목록에 추가한다. 상태는 프로필마다 분리하며, 프로필을 바꾸면 상태를 초기화한다.
  - 결과 화면: 함께 살펴볼 기운(오행 글자와 색 칩) → 원석 카드 2~3개 → 추천 이유 두 갈래 → 원석 의미 → `<details>` 상세 명리 근거 → 답변 수정과 저장 → 고지 문구. 로딩·실패·정보 부족 상태에서도 "수정/다시 하기"로 이어지게 한다.
- 웹툰: 기존 `app/components/webtoon/CutReader.tsx`를 재사용한다. 6컷의 "그 시기의 운 흐름" 보조 설명을 위해 line에 선택 필드 `note`를 하나 추가한다. 데이터는 `lib/brand/saju-crystal-webtoon.mjs`에 두고, 웹툰 위와 마지막 컷 바로 아래에 실제 버튼을 둔다.
- 진입 카드
  - 셸: `index.html`의 `#ukbuCard` 바로 뒤(무료 영역)에 정적 `section.saju-crystal-entry`를 넣는다. picture(640/1280, 모바일 16:10), HTML 제목·설명, `<a href="/saju/crystals/start/?from=saju_result">`로 구성한다. 패턴은 `js/core/saju/tea-entry.mjs`를 참고하고, 수정 뒤 `npm run sync:public`을 실행한다.
  - `/saju/` 랜딩(`lib/seo-landing-pages.js` saju 항목), `app/saju/guide/page.js`, `app/saju/five-elements/page.js`에 `<a href>` 링크를 추가한다.
  - 푸터 `SiteFooterHub.jsx` `SEO_LINK_GROUPS`의 saju 그룹과 `lib/i18n/siteFooterHubCopy.ts`(12개 언어 라벨)에 추가한다.
- SEO 등록: `scripts/generate-sitemap.mjs`의 `coreRoutes`에 `/saju/crystals`, `lib/seo/entity-registry.mjs`, `lib/seo/siteSeo.ts`의 `publicSeoPages`에 넣는다. `/saju/crystals/start`는 noindex 5곳 동기화 규칙(`docs/context/seo-and-adsense.md:66-80`)을 따르되, ShareWidget이 숨겨져도 되므로 경로 접두로 처리한다. hreflang은 ko만 둔다.
- 분석: `lib/analytics.ts`의 `trackEvent`(셸은 `cdTrack`)로 `crystal_entry_click{from}`, `crystal_questionnaire_start{from}`, `crystal_questionnaire_complete{steps, followups}`, `crystal_result_view{status}`, `crystal_result_save`를 보낸다. 연도·오행·원석은 이벤트에 넣지 않는다. `npm run verify:analytics-events`를 통과시킨다.

### 4. 이미지 (codex image_gen, 기준 시트 2장을 매번 첨부)
- 작업 폴더는 `D:\CodeDestiny-Build\saju-crystals-20261111\`이다. `webtoon-revamp-20261107`의 `gen.mjs`, `jobs/*.json`, `chars.mjs`, `export.mjs` 패턴을 복사해 쓴다. 원본 PNG는 D: `out/`에 둔다.
- 진입 이미지: 3:2 1장과 모바일 16:10 1장. 왼쪽 1/3을 비워 HTML 문구를 놓고, 이미지 안에는 글자를 넣지 않는다. 결과는 `public/images/saju-crystals/entry-{640,1280}.{avif,webp}`와 OG `og-1200x630.jpg`다.
- 웹툰: 10컷을 컷당 후보 2장씩 만들고 QC로 고른다. QC 항목은 연이의 얼굴·코·귀·꽃 장식·스카프, 영냥이 귀 2개(원본 크기로 확인), 털색·모자·망토다. 결과는 `public/images/saju-crystals/webtoon/NN-{640,1080}.avif` + `NN-720.webp`다. 기록 장부는 `docs/design/saju-crystal-webtoon-assets.json`(prompt, references, model, generatedAt, approvedBy:"pending-user")에 둔다.
- 원석 일러스트: 카탈로그의 추천 가능 항목만 정사각 일러스트로 만들고 `public/images/saju-crystals/stones/<id>-{320,640}.webp`에 둔다.
- 모든 이미지에 width/height(aspect-ratio)를 지정한다. 첫 화면 이미지는 `fetchpriority=high`, 웹툰은 `loading=lazy`로 둔다.

## 실행 순서 (전역 규칙: 인수인계 문서 + 단계별 에이전트)
0. 메모 `webtoon-art-user-made.md`의 범위를 수정한다. 워크트리를 만들고 `docs/handoff/saju-crystals-2026-11-11.md`(결정·함정·단계 체크박스)를 작성해 커밋한다.
1. 엔진과 카탈로그를 만들고 테스트를 작성한다(TDD). 커밋한다.
2. 랜딩, 질문·결과 흐름, 저장, 분석 이벤트를 만든다. 커밋한다.
3. 진입 카드, 링크, 푸터, 사이트맵·SEO 등록을 한다. 커밋한다.
4. 이미지(진입·OG·원석·웹툰)를 생성하고 QC·내보내기를 한 뒤 연결한다. 커밋한다.
5. 검증과 캡처를 마치고 main에 병합한다. 커밋만 하고 push·배포는 요청이 있을 때 한다. `npm run worktree:remove`로 워크트리를 정리한다.

## 검증
- `__tests__/ui/saju-crystal-recommendation.test.mjs`
  - 여러 차트(과거에 정격이 가종으로 뒤집혔던 유형 포함)에 대해 답변을 다양하게 바꿔도 `analyzeNatalCore` 결과의 gyeokguk·special.decision·strength가 deep-equal인지
  - 없는 오행이 구조 후보가 아니면 추천되지 않는지
  - 같은 해에 일은 좋음, 관계는 힘듦이 함께 보존되는지
  - 답이 없으면 status `base`, 엇갈리면 `multiple`과 추가 질문 2개 이하가 나오는지
  - 같은 입력이면 같은 resultKey가 나오는지
  - 시간 미상일 때 대운이 빠지는지
  - 미래 연도와 출생 전 연도를 거부하는지
- `__tests__/ui/saju-crystal-catalog.test.mjs`: 필수 필드, 변종 분리, 중복 없음, 추천 불가 항목 제외, 가격 필드 없음.
- 테스트 실행: `node scripts/run-mock-tests.mjs node __tests__/ui/saju-crystal-*.test.mjs`. 기존 `saju-compat-golden-master`와 `experience-calibration` 테스트도 통과해야 한다.
- 빌드 확인: `npm run build` 뒤 `dist/saju/crystals/index.html`에 H1·웹툰 대사·FAQ·canonical이 있는지 grep한다. 사이트맵에 `/saju/crystals/`가 있고 `/start/`가 없는지, start 페이지 robots가 noindex인지 본다. `npm run sitemap:check`, `verify:sitemap-canonical`, `verify:analytics-events`를 돌린다.
- 실제 흐름(브라우저, 390px과 1280px)
  1. 사주 결과에서 카드를 눌러 진입한다.
  2. 저장 프로필을 불러오고 이전 답변 재사용을 확인한다.
  3. 답변 → 결과 → 수정 → 저장 → 재진입을 거친다.
  4. 프로필을 전환해 결과가 섞이지 않는지 본다.
  5. 가로 넘침과 말풍선 가림이 없는지 본다.
  6. 캡처를 `D:\CodeDestiny-Build\saju-crystals-20261111\qa\`에 저장한다.
- `npm run check:fast`, `npm run check:pre-push`.
- 최종 보고에 담을 것: 수정 파일, 엔진 연결 방식, 원석 출처, 이미지 경로, 캡처, 검증 결과, 남은 항목(웹툰 컷 사용자 승인, C01·C02 원본 부재).
