# 글로벌 다국어 현지화 — 남은 작업 (갱신: 2026-08-22, 4차 세션)

## 배경

사용자가 "Code Destiny 전체를 실제 글로벌 서비스 수준으로 다국어 완성"을 요청했다(원 요청서 29개 섹션, 이후 28개 섹션짜리 상세 스펙으로 재요청). 규모가 멀티세션급이라는 게 1차 세션에서 이미 확인됐고, 2차 세션에서 Wave 0~5를 완료했다. 이 문서는 2차 세션 종료 시점 기준으로 완전히 다시 썼다 — 예전 버전(1차 세션 말미)의 "다음 순서 제안"은 이번 세션에서 대부분 처리했거나 아래에서 정정됐다.

## 🔴 2026-08-22 머지 순서·CI/릴리스 상태 점검 (사용자 요청으로 수행)

사용자가 "PR들이 CI 게이트를 통과 못하는 것도 있고 통과해도 릴리스가 실패하는 부분도 있다"며 점검을 요청해 24개 열린 PR 전체를 조사했다.

- **파일 겹침 0건**: 24개 PR의 변경 파일을 전수 교차 비교한 결과 어떤 두 PR도 같은 파일을 건드리지 않는다. `Landing order` 가드(부모 PR을 자식보다 먼저 머지하면 실패시키는 체크)도 전부 통과 — 스택(부모-자식) 관계도 없다. **즉 머지 순서 자체는 결과에 영향을 주지 않는다.**
- **CI는 전부 통과**: 24개 브랜치를 전부 `origin/main` 기준으로 업데이트(`PUT /pulls/{n}/update-branch`)해 재검사시킨 결과, 재확인 시점 기준 실패한 PR은 0개였다. 유일하게 실패 흔적이 남아 있던 PR #938은 재확인 시 통과로 바뀌었다 — 당시 낡은 실행 결과가 **PR 자체 문제가 아니라 그 시점의 `main`에 있던 다른 PR(#940 fusion-fortune)발 테스트 깨짐**을 반영한 것이었다(그 사이 main에서 수정됨).
- 🔴 **"CI 통과 후 릴리스 실패"는 실제로 재현됐다** — 같은 날 커밋 `f657a777`에서 "Release Cloudflare Pages and Worker" 배포 워크플로가 2번 연속 실패했다. 로그 원인: **연속 머지 경합** — 릴리스 워크플로의 concurrency 그룹은 실행 1 + 대기 1만 유지하는데, 머지가 너무 빨리 이어지면 이전 배포가 끝나기 전에 더 최신 커밋이 스테이징에 먼저 배포돼, `verify-deployed-sha`가 "이 커밋을 배포했는지" 검증할 때 이미 더 최신 SHA가 배포돼 있어 실패로 판정한다(`landing-watchdog.yml`에 "조용한 실패 ②"로 이미 문서화된 패턴). **PR 코드 결함이 아니라 머지 속도 문제.**
- **사용자에게 안내한 결론**: 순서는 무엇이든 상관없으나(충돌·의존성 없음), **한 번에 하나씩, 이전 PR의 "Release Cloudflare Pages and Worker" 워크플로가 초록불로 끝난 뒤 다음 PR을 머지**할 것을 권고했다 — 빠르게 연속 머지하면 같은 배포 SHA 불일치 실패가 재현될 수 있다.

## 🔴🔴 2026-08-22 `Paid Flow Gates`가 "번역만 한 PR"에서도 실패하는 이유 — 가드가 소스를 실행이 아니라 리터럴 grep으로 검사한다 (PR #977로 수정)

사용자가 "번역 작업인데 왜 결제 게이트가 걸리냐"고 질문해 push:main 건강신호(2026-08-22 14:36 run)를 실제로 열어 확인했다. `scripts/verify-nakshatra-premium.mjs`는 코드를 실행하지 않고 **소스 텍스트를 정규식으로 grep**해 `featureKey: "…"`, `coinPrice: 100` 같은 리터럴이 그대로 박혀 있는지, 혹은 특정 한국어 문자열이 그대로 있는지를 본다. PR #937(`chore/nakshatra-i18n-12-locales`, 병렬 세션 작업)이 머지되며 이 전제가 깨졌다:

1. `LordReportClient.tsx`/`DashaMapClient.tsx` — `reason` 필드를 `copy.lordReason`(로케일 대응)으로 바꾸며 상품 객체 전체를 컴포넌트 내부로 옮겼고, 그 김에 `featureKey: "nakshatra-lord-report"`도 같은 값의 `FEATURE_KEY` 상수 참조로 바뀌었다. 값은 동일한데 가드가 리터럴만 찾아 FAIL.
2. 택일/VVIP/궁합 3개 화면의 재시도 버튼이 `copy.retryWithoutPaymentButton`(정상적인 12로케일 번역, ko 값은 원래 리터럴과 동일)으로 바뀌며 가드의 `src.includes("결제 없이 다시 받기")` 단언이 깨짐.

**교훈**: 이 레포의 verify 스크립트 중 다수가 "코드가 이 정확한 문자열/구조를 갖고 있는가"를 실행이 아니라 텍스트 매칭으로 본다(`config/payment-freeze.json` 매니페스트와 같은 발상). i18n 작업으로 한국어 리터럴을 `copy.*` 참조로 옮길 때 **그 리터럴을 직접 grep하는 verify 스크립트가 있는지 3면 grep 전에 반드시 확인**해야 한다 — 안 그러면 번역 자체는 맞는데 push:main 건강신호가 빨간불이 된다. `paid-flow-gates.yml`의 `pull_request.paths`에 `app/nakshatra/**`가 없어서 PR CI에서는 안 걸렸고 머지 후 push:main에서만 드러났다(트리거 공백은 그대로 — 이번 세션 범위 밖).

**조치(PR #977)**: (1) `featureKey`는 로케일과 무관한 내부 키라 상수 추출을 되돌려 리터럴 인라인 복원. (2) `retryWithoutPaymentButton`은 진짜 번역이라 되돌리면 안 되므로, 가드에 `hasKoTextOrCopyRef()`를 추가해 `copy.<key>` 참조를 발견하면 `app/nakshatra/_lib/copy.ts`의 ko 블록에서 그 키 값이 정확히 기대 문자열인지 확인하도록 확장(리터럴이 남아있는 경우도 하위호환으로 계속 통과). 검증: `node scripts/verify-nakshatra-premium.mjs` PASS, `node scripts/run-paid-gate-suite.mjs --only nakshatra` 3/3 통과, `tsc`/`eslint` 클린.

**사용자가 같은 날 재확인한 스코프**: "en/ja/zh-CN/zh-TW만 확실하게, 나머지는 번역 없으면 영어로" — 이는 PR #956(위 참고)부터 이미 표준 관례였다(`getXCopy(locale) { return { ...EN, ...(MAP[locale] || {}) } }` 스프레드 병합 패턴). PR #974/#975/#976(master-love-codex·maya·tarot-healing-core)도 전부 이 패턴으로 확인됨 — 새로 만드는 `_lib/copy.ts` 모듈은 반드시 이 형태를 따를 것, `?? "..."` 개별 폴백 반복 금지.

## 🔴🔴 2026-08-22 "PR #977 머지하면 릴리즈 실패가 끝나냐" — 아니다, 릴리즈 실패는 서로 무관한 원인 3+건이 섞여 있다 (세 번째 원인 PR #979로 수정)

사용자가 이 질문을 던져 최신 push:main/릴리스 런을 다시 열어 확인한 결과, **PR #977은 그중 딱 하나만 고친다**는 게 실측으로 확인됐다. 최근 30개 릴리스 런 중 실패 4건을 전부 열어 원인을 각각 확인:

1. **나크샤트라 featureKey/재시도버튼 가드 오탐** — PR #977이 고치는 것. `Paid Flow Gates` 건강신호에만 영향(배포 자체를 막지 않음).
2. **fusion-fortune 리터럴-정규식 가드**(`/앞으로 12개월의 시기 라인/`) — run 32576843442(13:48 UTC)에서 "Node regression tests failed"로 실제 배포가 BLOCKED됐던 것을 확인. **이미 현재 main에서 해결돼 있다**(`node --test __tests__/ui/fusion-fortune.static.test.js` 19/19 통과 재확인, 아마 PR #973 `fix/fusion-fortune-i18n-gate`가 고쳤을 것으로 추정 — 정확한 커밋은 미추적). 조치 불필요.
3. 🔴 **신규 발견 + 수정(PR #979)**: `/fortune/tomorrow/*` 페이지 프리렌더가 `fortune/data/daily-2026-08-24.json` ENOENT로 실제 배포를 BLOCKED시킨 사례(run 32579994858, 14:52 UTC, KST 자정 10분 전). 원인은 `scripts/fortune-build-data.mjs`(prebuild, 시계 1회 읽음)와 `lib/fortune/daily-data.ts`의 `resolvePeriodDate()`(Next.js 정적 익스포트 단계, **별도로 다시** 시계를 읽음)가 서로 다른 시점에 각자 KST 날짜를 계산해, 빌드가 자정을 넘겨 진행되면 prebuild가 만든 파일과 render가 찾는 파일이 어긋나는 것 — `fortune-build-data.mjs` 자체의 "시계는 한 번만 읽는다" 주석이 경고하던 클래스의 버그인데, 그 경고가 스크립트 내부만 커버하고 render 단계와의 경계는 못 봤다. **조치**: `fortune-build-data.mjs`가 실제로 만든 오늘/내일 날짜를 `fortune/data/run-manifest.json`에 기록하고, `resolvePeriodDate()`가 시계 재계산 대신 이 매니페스트를 그대로 따르도록(매니페스트 없으면 기존처럼 폴백) 변경. 레이스 재현 테스트로 확인 완료(매니페스트를 "어제 값"으로 수동 설정해도 `resolvePeriodDate()`가 매니페스트를 그대로 따라 불일치가 안 생김을 확인).
4. **연속 머지 SHA 경합**(이 문서 위쪽 절 참고, 여전히 미해결·구조적 — 배포 concurrency 그룹 자체를 손봐야 하는 별도 과제).

**결론**: PR #977·#979 둘 다 머지해도 4번(연속 머지 경합)은 여전히 남는다 — "한 번에 하나씩, 이전 릴리스가 끝난 뒤 다음 PR 머지" 권고는 그대로 유효하다.

## 🔴 3차 세션(2026-08-22) 완료 목록 — "UI 크롬만" 스코프로 8개 PR

2차 세션 종료 시점의 "3건 이하 그룹 62개 파일"에서 이어받아, 사용자가 이전 세션에 확정한 **"UI 크롬만(추천)"** 스코프(SEO 콘텐츠 페이지·서사형 콘텐츠 데이터 파일은 제외)로 계속 진행했다. 이번 세션은 새 브랜치+PR마다 `EnterWorktree` 격리 없이 하나의 워크트리 안에서 origin/main 기준 새 브랜치를 매번 새로 분기하는 방식으로 처리했다(`git fetch origin main -q && git checkout -b <branch> origin/main`).

1. **PR #940** `chore/fusion-fortune-subcomponents-i18n` — `app/fusion-fortune/`의 `fusion-thread.tsx`(`FUSION_STAGES` → `FUSION_STAGE_KEYS`+`buildFusionStages(copy)`로 구조 분리)·`FusionResultThread.tsx`·`FusionVisualization.tsx`(레이더/월별 라인/교차검증 게이지/시스템 칩 전부 `copy` prop)·`FusionRecentList.tsx` — 새 공유 모듈 `app/fusion-fortune/_lib/copy.ts`(`FusionSharedCopy`, 12로케일, `useFusionSharedCopy()`)로 순환참조 회피. `formatDay()`의 로케일 미대응은 항목 7 계열로 이관(미수정).
2. **PR #941** `chore/destiny-bias-promo-i18n` — `app/psychotest/_components/DestinyBiasPromoSection.tsx`를 4로케일 임시방편 체계에서 정식 `LoadingLocale` 패턴 12로케일로 전면 재작성.
3. **PR #942** `chore/destiny-bias-progress-modal-i18n` — `DestinyBiasProgress.tsx`(스텝 라벨)·`DestinyBiasCoinModal.tsx`(다이얼로그) 12로케일. `toLocaleString("ko-KR")` 숫자 포맷은 미수정(항목 7 계열).
4. **PR #943** `chore/ai-result-companions-i18n`(8개 파일) — `LoveSecretChecklist.tsx`, `life-book-ai`의 `BookOpenCover.tsx`·`LifeBookAiResultClient.tsx`(~50필드, 십성/오행 용어는 의미 기반 번역), `karma-destiny-ai`의 `KarmaDestinyAiResultClient.tsx`(~55필드)·`SectionTabs.tsx`·`EvidenceDisclosure.tsx`(`EVIDENCE_LABELS` ~45개 전문용어는 제외, 후속 과제로 명시)·`ObservatoryLoader.tsx`·`LensRadar.tsx`(`LENS_LABELS` 미번역 유지). **결과 페이지들은 PR #910/#914가 이미 처리한 줄 알았으나 실제로는 미착수 상태였음을 `gh pr view`로 직접 확인 후 진행** — 핸드오프 문서를 맹신하지 말고 실측할 것의 근거 사례.
5. **PR #944** `chore/love-simulation-ui-i18n`(4개 파일) — `LoveSimulationClient.tsx`(로딩 컴포넌트 추출), `CustomSajuForm.tsx`(`.fallback-gaps.json` 추적 갭 9개 로케일 보강), `LoveCharacterStorySection.tsx`(로케일 무관하게 항상 `.ko`만 반환하던 안티패턴 전면 재작성), `LoveSimulationEngine.tsx`(격리된 UI 섹션만, 서사 생성 로직은 제외).
6. **PR #945** `chore/naming-ai-i18n` — `NamingAiClient.tsx`(~90필드) 완전 재작성. `TONE_OPTIONS`(namingRecommendations.ts 파생)는 제외. `INITIAL_FORM.birthPlace` 로케일별 기본값을 `useRef` 캡처로 안전하게 처리(자체 발견·수정한 비교 버그).
7. **PR #946** `chore/yeon-star-hug-i18n` — `YeonStarHugClient.tsx`(2380줄, 클라이언트 콘텐츠 생성 엔진). 생성 로직과 얽힌 데이터(감정/요일행성/달위상/각도/원소 라벨, 한국어 키워드 매칭 사전, SVG 카드 생성기, 조사 결합된 동적 상태 메시지)는 전부 제외 — 번역하면 "번역된 라벨 + 한국어 생성 문장"이 뒤섞여 지금보다 더 나쁜 결과가 됨. 독립적인 정적 UI 문구(히어로/입력 패널/FAQ/네비 배지 등 ~55필드)만 12로케일 배선.
8. **PR #947** `chore/prompt-hub-i18n` — `PromptHubClient.tsx`(2815줄, 이 감사 전체에서 최대 파일). 🔴 **다른 파일과 달리 이미 로케일 인프라가 있었다**(`PROMPT_HUB_COPY_KO/_EN` + 11개 로케일 EN 폴백 + `missingTranslation` 플레이스홀더 안전장치) — 그래서 "한국어 누출" 결함은 없었음. 실제 문제 2건만 수정: (a) `tx()`를 안 거치는 순수 하드코딩 alt 텍스트 1건, (b) 16개 도구 각각의 `detail`/`motif`/`keywords`/일부 `help`/도구별 드롭다운 `options[]`/`generateLabel`/`resultLabel`/`emptyState`가 `text{}` 사전에 항목이 없어 11개 비한국어 로케일에서 "Translation unavailable" 플레이스홀더가 뜨던 것(스크립트로 434개 고유 문자열 전수 대조, 최종 0건 누락 확인). `role`/`principles[]`/`answerSections[]`는 `buildStructuredFortunePrompt()`(생성된 프롬프트 자체, 로케일 무관 항상 한국어)에만 쓰이고 UI에 안 보여 의도적으로 제외.
9. **PR #949**(❌ 닫힘, 중복) `chore/feedback-page-i18n` — `/feedback` 전체를 처음부터 다시 번역했으나, 동시 세션이 같은 범위를 먼저 PR #938로 올려 뒀다는 것을 뒤늦게 발견했다. 비교 결과 #938 이 categories 포함 전체를 **12로케일 완전 네이티브 번역**(이쪽은 ko+en 정본에 나머지 10개 en 폴백)으로 처리해 더 완결적이라 **#938을 채택하고 이 PR은 닫았다**. 남기는 이유: `formatSavedAt()`의 `"ko-KR"` 하드코딩 버그 발견, 관리자 화면이 `details[].label`을 그대로 렌더한다는 위험 패턴 등은 두 PR 모두 동일하게 대응했다는 게 확인됨 — 접근 자체는 유효했다.
10. **PR #950**(❌ 닫힘, 중복) `chore/native-app-i18n` — 마찬가지로 동시 세션의 PR #939과 겹쳤다. #939이 이 PR에서 명시적으로 범위 밖으로 뒀던 `AppShell.tsx`/`PurchaseRecoveryBoot.tsx`(공유 앱 셸)까지 포함해 더 넓은 범위를 다뤄 **#939을 채택하고 이 PR은 닫았다**. `listServiceFeatures("ko")` 하드코딩 버그·`toLocaleString("ko-KR")` 버그는 두 PR 모두 발견·수정했음을 확인.
11. **PR #951** `chore/standalone-components-i18n` — `SeoLandingBirthForm.tsx`(SEO 랜딩 생년 입력 폼, 파일 로컬 카피) + `MobileBottomNav.tsx`의 자체 `aria-label`만. `app/_lib/mobile-tabs.ts`의 `MOBILE_TABS`(탭 label/ariaLabel)는 **정적 셸 `index.html`의 `#cdMobileBottomNav`와 `scripts/verify-mobile-bottom-nav-sync.mjs`로 1:1 동기화**돼 있어, 로케일화하려면 정적 미러와 동기화 스크립트까지 함께 손봐야 하는 별개 규모의 작업이라 이번 PR 범위 밖으로 명시적으로 남김.
12. **PR #952/#953**(❌ 둘 다 닫힘, 중복) `chore/nakshatra-i18n` 1/2·2/2 — `app/nakshatra/` 전체를 처음부터 번역했으나, 동시 세션의 PR #937과 겹쳤다. #937이 이 두 PR에서 다루지 않은 `MuhurtaClient.tsx`(택일, 이번 세션이 존재 자체를 놓친 기능)·`nakshatra-birth.ts`·여러 `page.tsx`까지 포함해 더 넓은 범위를 다뤄 **#937을 채택하고 두 PR은 닫았다**. `dasha-map`의 `PeriodRow` 라벨 등 데이터 인접 라벨 판단, `PRODUCT.reason` 유지 판단은 #937도 동일한 접근이었음을 diff 대조로 확인.

🔴 **중복 발생 원인·교훈**: #937/#938/#939(20:06~21:31 생성)과 이 세션의 #940 이후(22:01~) 사이에 **동시에 다른 세션이 같은 백로그를 병행 처리**했다 — 리포 자체 위험(concurrent-sessions-share-worktree 메모리 참고)이 PR 단위에서도 재현된 사례. 자동 점검(autonomous loop) 중에 `gh pr list`로 뒤늦게 발견했고, 사용자 확인 후 diff 대조로 객관적으로 더 넓은/완결적인 쪽을 채택해 닫았다. **다음 세션 교훈**: 새 클러스터에 착수하기 전에 `gh pr list --state open`으로 겹치는 열린 PR이 없는지 먼저 확인할 것.

**이번 세션에서 확립한 반복 패턴**: (1) 파일이 "폼"인지 "콘텐츠 생성 엔진"인지부터 판별 — 후자면 생성에 얽힌 데이터/템플릿은 전부 제외하고 진짜 독립적인 정적 UI만 골라낸다. (2) 라벨 옆에 한국어 데이터 값이 같은 줄/문장에 붙는 곳(조사 결합 포함)은 라벨만 번역하면 "번역된 라벨 + 한국어 값" 혼종이 되므로 제외. (3) 이미 부분적으로 로케일 인프라가 있는 파일은 처음부터 새로 만들지 말고 기존 사전의 빈 칸만 채운다(사전 조사 없이 전면 재작성하면 중복 인프라가 생긴다). (4) 핸드오프 문서·PR 히스토리의 "이미 처리됨" 주장은 `gh pr view`로 실제 diff를 확인한 뒤에만 신뢰한다.

**아직 안 한 것**: PR #940~953(문서 PR #948 제외 12개 코드 PR) 전부 push·PR 생성까지만 완료, **머지는 사용자 몫**(정책상 자동 머지 안 함). **#953은 #952 위에 스택돼 있으므로 #952를 먼저 머지할 것.** 62개 "3건 이하" 그룹 중 이번 세션이 처리한 파일들을 뺀 나머지는 여전히 미착수다. `docs/handoff/global-i18n-audit-remaining.md`(이 문서) 자체의 "남은 것" 우선순위 표는 2차 세션 기준 그대로라 다음 세션은 이번 세션 완료분(PR #940~947, #949~953 대상 파일)을 표에서 먼저 빼고 재개할 것.

**PR #954**(완료) `chore/app-chrome-i18n` — `app/components/AppChrome.tsx`의 `FeatureBackHomeNav`(전역 셸이 모든 라우트에서 렌더하는 좌상단 뒤로가기/홈 버튼) 2건("이전 페이지로 이동" aria-label, "홈" 버튼 라벨) — 같은 디렉터리의 `GlobalHeader.tsx`가 이미 쓰던 `useLocale()`(`lib/i18n/useT`) 관례를 그대로 재사용해 12로케일 완전 번역. 착수 전 `gh pr list --state open`으로 겹치는 PR 없음을 먼저 확인함(중복 재발 방지 조치). `SeoLandingBirthForm.tsx`·`MobileBottomNav.tsx`는 완료(PR #951), nakshatra 클러스터는 완료(#937). 같은 조사에서 `FeatureMarketingDetailModal.tsx`(수백 개 한국어 마케팅 카피 + 한국어 키워드로 카테고리/가격 정책을 분류하는 정규식 로직)와 `SunHealingTarot.tsx`(913줄, `lib/tarot/tarot-cards.mjs`의 `nameKo`/`nameEn`과 반드시 일치해야 하는 카드명 사전 내장)도 확인했으나 **둘 다 "콘텐츠 생성/데이터 결합 엔진" 범주라 단순 UI 문구 치환이 아니다** — 착수 시 훨씬 신중한 스코핑이 필요하고, 이번 세션의 "UI 크롬만" 기준으로는 후순위로 밀어도 된다.

## 🔴🔴 2026-08-22(4차 세션) 핵심 발견 — 속성 전용 grep 기준 완료 ≠ 실제 완료, 409개 파일 신규 발견

`app/components/AppChrome.tsx`(PR #954)까지 마치고 나서, "3건 이하" 그룹 62개 파일을 재조사하려고 기존 grep(`(alt|aria-label|title)=...[가-힣]`, 60개 파일 검출)을 돌렸는데, 검출된 60개 중 admin·이미 완료(#937~#951)·의도적 제외(SEO 콘텐츠 페이지·SunHealingTarot·FeatureMarketingDetailModal)를 빼고 나니 **남는 게 전부 서버 컴포넌트 SEO 랜딩 페이지의 sr-only 접근성 라벨뿐**이었다(예: `compare/*`, `oracle/rune`, `saju/animal-destiny/page.tsx` 등 — 로케일 라우팅 자체가 없는 한국어 전용 정적 페이지라 "12로케일화"가 성립하지 않는 범주). 즉 **속성 전용 grep 기준 Wave 7은 사실상 끝났다**(#937~#947·#951·#954 머지 시).

그런데 destiny-compass(PR #933) 사례가 "속성만 보면 놓친다"는 경고였다는 걸 상기하고 `git grep -lP '[가-힣]'` 로 `app/**/*.tsx` 전체를 다시 훑으니(코드 주석·admin·디버그 페이지 포함) **409개 파일**이 걸렸다. 그중 다수가 이번 세션은 물론 이전 세션들도 전혀 몰랐던 대형 미착수 기능 클러스터였다:

- `app/saju/destiny-bias/`(최애운명, ~53개 파일·3,732줄) — K팝 팬덤 사주 궁합 게임. `DestinyBiasClient.tsx`(1,527줄) 포함.
- `app/saju/animal-destiny/components/`(열두 띠 동물운세, ~20개 파일)
- `app/oracle/sikojen-povailu/`(돼지 오라클, ~12개 파일)
- `app/palm-reading/`, `app/tarot/healing`·`self-esteem`·`prompt-maker`, `app/music/`, `app/flower/*`(4개 페이지) 등 다수

**원인은 동일**: 지금까지 우선순위를 매겨 온 grep이 `alt`/`aria-label`/`title` **속성값**만 잡는데, 이 클러스터들의 한국어는 거의 전부 `<p>`/`<h3>`/버튼 라벨 같은 **본문 텍스트 노드**에 있어 grep에 안 걸렸다. "1차 감사 상위 N건" 같은 속성 카운트 기반 우선순위 표는 본문 텍스트 위주 기능(게임형 인터랙티브 화면)을 체계적으로 놓친다는 게 destiny-compass 때보다 훨씬 큰 규모로 재확인됐다.

**사용자 확인 및 지시(2026-08-22)**:
1. 이 신규 발견분도 **"지금 전부 진행(추천)"** — 계속 작업한다.
2. 🔴 **번역 언어 축소**: 지금까지는 12로케일(ko 정본 + en/ja/zh-CN/zh-TW/vi/hi/es/fr/de/nl/ms) 전부를 채웠지만, **분량이 너무 방대하므로 앞으로는 영어·일본어·중국어(zh-CN·zh-TW)만** 실번역하고 **나머지 7개 로케일(vi/hi/es/fr/de/nl/ms)은 기존 `Partial<Record<LoadingLocale, X>>` + en 폴백 패턴으로 영어를 그대로 보여준다**(신규 코드 작성 없이 이미 있는 폴백 메커니즘 재사용 — 타입 에러 없음, `getXCopy()`가 `X_COPY[locale] || X_COPY_EN` 형태라 해당 로케일 키를 안 채우면 자동으로 영어를 받는다). **이미 12로케일로 작성된 기존 파일(destiny-bias 등)은 되돌리지 않는다** — "이번 지시 이후 신규 작업"에만 적용.
3. "로케일에 맞게 해서 SEO 문제 없도록" — 아래 SEO 답변 참고: **이 작업은 UI 크롬(클라이언트 컴포넌트 표시 문구) 번역이라 sitemap·hreflang·SSR 메타데이터를 건드리지 않으므로 sitemap 재제출은 필요 없다.** sitemap(`scripts/generate-sitemap.mjs`)은 라우트 목록 기반으로 빌드 시 자동 생성되고, 이번 작업은 신규 라우트 추가도 hreflang 태그 추가도 아니다. 재제출이 실제로 필요해지는 경우는 (a) Wave 9(hreflang 확장, 사용자 명시 요청 시에만 별도 착수)나 (b) 신규 페이지·언어별 URL 추가뿐 — 둘 다 이번 스코프 밖.

**PR #955**(완료) `chore/destiny-bias-cards-i18n` — destiny-bias 결과 화면 보조 컴포넌트 ~20개(팬덤 프로필 카드·오행 차트·점수 게이지·히어로/액션바·포토카드·로딩화면) 12로케일(이 PR은 신규 지시 이전에 작성 시작해 12로케일 그대로 완료) — `app/saju/destiny-bias/_lib/copy.ts` 신규(`useDestinyBiasCopy()`, `app/nakshatra/_lib/copy.ts`와 동일 패턴). `vm.fandomProfile`/`vm.*`(엔진 생성 리딩 문장)은 제외. `lib/destinyBiasCopy.ts`의 `destinyBiasLoadingMessages`/`destinyBiasIntroCopy`가 로케일 무관하게 항상 `.ko`만 반환하는 기존 버그도 발견(이 PR에서는 미수정, 범위만 기록).

**PR #956**(완료, #955 위에 스택 — **#955를 먼저 머지할 것**) `chore/destiny-bias-client-i18n` — `DestinyBiasClient.tsx`(1,527줄, 입력 마법사 3단계 + 토스트/에러 + 다운로드·공유 핸들러 + 결과 화면 오케스트레이터). 기존 `DESTINY_BIAS_CLIENT_TEXT_TRANSLATIONS` 스캐폴드가 `ko` 키만 있고 로케일 무관하게 항상 한국어를 반환하던 버그(#955가 발견한 `destinyBiasCopy.ts`와 같은 클래스)를 `useDestinyBiasCopy()`로 교체하며 해결. `_lib/copy.ts`에 ~110개 필드 추가(마법사 단계·검증 메시지·토스트·공유 텍스트 템플릿·드롭다운 옵션 라벨 — 성별/무드/관계감성의 state 값 자체는 엔진 계산용이라 한국어 그대로 두고 렌더링 라벨만 번역). 🔴 **이 PR부터 신규 필드는 en/ja/zh-CN/zh-TW만 채운다** — 나머지 7개 로케일은 `getDestinyBiasCopy()`가 로케일 객체를 EN 객체 위에 스프레드 병합하도록 바꿔(`{ ...EN, ...(MAP[locale] || {}) }`) 자동으로 영어 폴백을 받는다(호출부에 `?? "..."` 반복 불필요). `destinyBiasThemeChoices`(테마 이름/설명)·`destinyBiasCelebCategories`/유명인 프리셋(데이터 파일 고유명사)은 제외. 🔴 **발견(미수정)**: "결제하기"/"결제 진행 중..." 버튼 — `verify-paid-gate-ui-regression.mjs`에 따르면 destiny-bias가 2026-08-21부로 전면 무료 전환됐는데 이 버튼 문구는 그대로 남아있다(한국어도 동일하게 이상함 — i18n과 무관한 기존 버그라 문구만 그대로 번역하고 로직은 안 건드림). `NODE_OPTIONS=--experimental-vm-modules npx jest --runInBand --testEnvironment node` 형태로 돌려야 하는 워커 테스트가 있다는 것도 이번에 재확인(`node --test` 로 직접 돌리면 `describe is not defined`로 오진하기 쉬움).

**이로써 destiny-bias 클러스터(53개 파일) 전체 완료**(#955+#956).

**PR #957**(완료) `chore/animal-destiny-i18n` — `app/saju/animal-destiny/` 착수. 🔴 **핵심 발견**: 이 디렉터리 27개 파일 중 실제 라이브 라우트(`page.tsx`→`AnimalDestinyRouteClient`→`AnimalDestinyPage`→`TwelveAnimal*`)가 임포트하는 건 절반뿐이고, 나머지 절반(`AnimalDestinyHero.tsx`·`AnimalDestinyInputForm.tsx`·`AnimalCompatibilityGrid.tsx`·`AnimalCareerPanel`/`LovePanel`/`LuckItems`/`PersonalityPanel`/`GameStats`/`CharacterHero`/`SummaryCard`/`ShareCard.tsx`·`AnimalDestinyIntro.tsx`·`AnimalRevealAnimation.tsx`+`CrackingEggAnimation`/`FlipCardReveal`/`TamagotchiDeviceFrame`, 총 16개)는 `git grep`으로 확인한 결과 **어디서도 임포트되지 않는 고아 병렬 구현**이다(자기 자신 참조뿐). 번역 노력을 안 들였고(도달 불가 코드라 낭비) 삭제도 안 했다(16개 파일 삭제는 별도의 큰 결정) — 사용자 판단 필요.
- 라이브 파일 9개(`CosmicSigil`·`TwelveAnimalHero`·`TwelveAnimalLoading`·`TwelveAnimalTabs`·`TwelveAnimalAdviceCard`·`TwelveAnimalDexGrid`·`TwelveAnimalResultCard`·`TwelveAnimalShareCard`·`AnimalDestinyPage` 셸)를 새 `app/saju/animal-destiny/_lib/copy.ts`(`useAnimalDestinyCopy()`, destiny-bias와 동일 패턴)로 en/ja/zh-CN/zh-TW 번역. 이 중 일부(`TwelveAnimalResultCard`, `AnimalDestinyPage`)도 always-returns-.ko 스캐폴드 버그가 있었다(같은 클래스 재발견).
- 반대로 `AnimalCompatibilityGrid.tsx`·`AnimalDestinyInputForm.tsx`·`TwelveAnimalInputCard.tsx`는 **이미 완벽하게 5로케일(ko/en/ja/zh-CN/zh-TW) 구현이 돼 있어 손대지 않았다** — 이 디렉터리에 최소 두 세대의 구현 스타일(구버전 always-ko, 최신 완전판)이 섞여 있다는 신호.
- 🔴 **미수정 플래그**: `TwelveAnimalResultCard.tsx`의 `STAGE_TONE_ACTION`(12개 스테이지별 조언 문장)은 이번 PR에서 번역하지 않고 후속 과제로 남김.
**PR #958**(완료, #957 위에 스택 — **#957을 먼저 머지할 것**) `chore/animal-destiny-result-screen-i18n` — `AnimalResultScreen.tsx`(~380줄, 라이브 최대 오케스트레이터). `ANIMAL_RESULT_SCREEN_TEXT_TRANSLATIONS` always-returns-.ko 스캐폴드를 공용 `_lib/copy.ts`로 교체, section titles·pillar meta(연/월/일/시주 라벨+제목+의미+포커스)·stage rhythm meta·`dominantRhythmSummary()`/`stageGuide()` 템플릿 함수 추가. 🔴 **의도적으로 한국어 유지**: "왜 {animal_ko}인가요?" 제목과 그 설명 문장은 `representativeMeta.label`·원시 스테이지명·`animal.animal_ko` 3개 데이터값이 한국어 조사와 한 문장에 얽혀 있어(nakshatra dasha-map의 PeriodRow와 같은 유형) 그대로 뒀다. 🔴 **테스트 마커 보존**: 파일에 있던 "Legacy static-test markers" 주석을 그대로 남겨야 `__tests__/ui/animal-destiny-narrative.static.test.js`가 통과한다(문자열 리터럴을 직접 grep하는 테스트) — 확인 후 보존.

**이로써 animal-destiny 라이브 경로 전체 완료**(#957+#958). 고아 파일 16개는 위 #957 항목에 기록된 대로 미착수·미삭제 상태로 사용자 판단 대기.

**PR #959**(완료) `chore/sikojen-povailu-i18n` — `app/oracle/sikojen-povailu/`(핀란드 주석점, 13개 파일·~2,300줄) 전체 착수. 이 클러스터도 "세대 혼재" 패턴 재확인: `PhaseRitualPrep.tsx`는 이미 5로케일 완전 구현, `PhaseSharing.tsx`/`PhaseReveal.tsx`는 ko/en/ja 3로케일까지는 이미 완성돼 있었고(zh-CN/zh-TW만 이번에 추가), 나머지(`PigCounselBubble`·`YeonSpriteAvatar`·`SikojenpovailuApp`·`PhaseCasting`·`ShadowReading`·`PhaseWelcoming`)는 always-returns-.ko 기본값 버그이거나 로케일 인프라 자체가 없었다. 새 `app/oracle/sikojen-povailu/_lib/copy.ts`(`useSikojenPovailuCopy()`)로 후자만 커버하고, 이미 잘 작동하던 `PhaseSharing`/`PhaseReveal`의 로컬 테이블은 공용 모듈로 옮기지 않고 그 자리에서 zh-CN/zh-TW만 추가(diff 최소화). 🔴 **버그 발견·수정**: `PhaseSharing.tsx`의 축복 메시지 로케일 조회가 en/ja 외 전부(zh-CN/zh-TW/es/fr 등) 한국어로 조용히 폴백하던 것을 영어 폴백으로 수정("절대 조용히 ko로 안 새게 한다" 원칙 적용). `app/oracle/sikojen-povailu/data/shapes`(형태 20종 데이터)와 `page.tsx`/`layout.tsx`/`play/page.tsx`의 SEO 메타데이터(이 URL은 로케일 라우팅이 없어 항상 같은 걸 서빙 — 이전 animal-destiny page.tsx와 동일 판단)는 제외.

**PR #960**(완료) `chore/palm-reading-i18n` — `app/palm-reading/` 착수, 다만 **클러스터 완료가 아니라 "작은 파일 먼저" 부분 처리**다. `error.tsx`(로케일 인프라 전무 → 5로케일 신규 배선)와 `PalmLineOverlay.tsx`(기존 ko/en/ja 테이블에 zh-CN/zh-TW 추가 + 초기 `useState<LoadingLocale>("ko")` 하드코딩을 `getCurrentLoadingLocale()`로 교체하는 flash-of-Korean 버그 수정)만 처리. 🔴 **`PalmDestinyMain.tsx`(3,839줄, 한국어 매칭 417줄 — 이 세션에서 다룬 어떤 파일보다 큼, `DestinyBiasClient.tsx` 1,527줄·`VedicAiClient.tsx` 약 210건보다도 위)는 헤더의 `PALM_DESTINY_TEXT_TRANSLATIONS`/`palmDestinyText()` always-returns-ko 스캐폴드만 확인했을 뿐 본문은 전혀 안 읽었고 번역도 안 했다** — 다음 세션이 이 파일 하나만으로 별도 PR(또는 여러 개로 쪼개서)을 잡을 것을 강력 권장, "palm-reading 완료"로 오인하지 말 것. `page.tsx`는 다른 클러스터와 동일 근거(로케일 라우팅 없는 URL)로 제외. `__tests__/palm/palm-map-engine-requirements.test.js`·`palm-ui-requirements.test.js`·`scripts/verify-palm-flow.mjs` 등 관련 테스트/verify 스크립트를 git grep으로 확인했으나 이번에 바꾼 두 파일의 문자열/함수를 참조하지 않음을 확인(수정 불필요).

**PR #962**(완료, #960 위에 올릴 필요 없음 — `origin/main`에서 독립 분기, 파일 겹침 없음) `chore/palm-destiny-main-i18n` — `PalmDestinyMain.tsx`(3,839줄, 한국어 매칭 417줄) 전체 완료. `error.tsx`/`PalmLineOverlay.tsx`(#960)와 달리 이 파일은 always-returns-ko 스캐폴드(`PALM_DESTINY_TEXT_TRANSLATIONS`/`palmDestinyText()`)뿐 아니라 모듈 레벨 상수 12개(`HAND_ROLE_META`/`DOMINANT_HAND_OPTIONS`/`CARD_KEY_TO_LABEL`/`SHOOTING_GUIDES`/`LOADING_PHASES` 등)와 엔진 enum 값을 문구로 바꾸는 `formatX()` 순수 함수 ~12개(`formatLineLength`/`formatHeadDirection`/`formatFateStart` 등, 예: `"long"→"길게 이어지는 흐름"`)까지 전부 `copy` 파라미터를 스레딩해야 했다 — 이 규모의 "화면 상태 → 한국어 문구" 순수 함수 세트는 이번 세션 다른 파일에는 없었던 패턴. 새 `app/palm-reading/_lib/copy.ts`(328필드)를 만들어 커버.
- 🔴 **버그 발견(미수정, 별도 파일)**: `lib/palm/palm-ui-state.js`의 `mapPalmAnalyzeError()`가 API 에러 코드별로 약 15개 하드코딩 한국어 문구를 반환한다(로케일 인자 자체가 없음) — sikojen-povailu의 `PhaseSharing.tsx` 축복 메시지 폴백 버그와 같은 클래스지만 이번엔 **완전히 별개 파일**이라 이 PR 범위에서 고치지 않고 발견만 기록. 다음 세션이 `lib/palm/` 디렉터리를 다룰 일이 있으면 같이 처리할 것.
- `QualityConfidence` 타입("높음"|"보통"|"낮음")은 내부 비교 리터럴로 그대로 두고(다른 파일이 참조하지 않는 순수 클라이언트 상태, 서버로도 전송 안 됨— `toApiImageQuality()` 확인함), 화면 표시 지점만 `copy.qualityConfidenceBadgeHigh/Medium/Low` 조회로 분리.
- `scripts/verify-palm-flow.mjs`·`__tests__/palm/palm-ui-requirements.test.js`의 소스 리터럴 단언 3개("한 손만 등록해도 분석됩니다", "전체화면"/"기본 화면", "특수 손금 감지")가 `_lib/copy.ts`로 이동한 것을 반영해 같은 PR에서 갱신 — `git grep`으로 3면 확인 없이 진행했으면 이 3개 단언이 조용히 깨질 뻔했다(실제로 처음엔 놓쳤다가 `node scripts/verify-palm-flow.mjs` 실행 후 발견·수정).
- 검증: `npx tsc --noEmit`(clean) · `npx eslint`(0 errors, 기존 무관 warning만) · `node scripts/verify-palm-flow.mjs`/`verify-paid-gate-ui-regression.mjs`(PASS) · `NODE_OPTIONS=--experimental-vm-modules npx jest --runInBand --testEnvironment node __tests__/palm/palm-ui-requirements.test.js __tests__/palm/palm-map-engine-requirements.test.js`(43/43) · `config/payment-freeze.json` 미등재 확인.

**이로써 palm-reading 클러스터(#960+#962) 전체 완료.**

## 🔴 2026-08-22 `tarot/*` 3개 클러스터 — "이미 다 되어 있었다"는 이번 세션 처음 만난 패턴

`tarot/healing`·`tarot/self-esteem`·`tarot/prompt-maker` 세 클러스터를 순서대로 착수했는데, 지금까지와 반대되는 발견이 반복됐다: **한국어 매칭 건수만 보고 "번역 안 됨"으로 가정하면 안 된다.** 세 곳 다 실제로 열어 보니 이미 상당 부분(또는 전부) 12로케일 완전 구현이 돼 있었고, 남은 건 아주 좁은 실제 공백뿐이었다. 다음 세션이 "3건 이하"·미조사 클러스터를 마저 훑을 때도 이 순서(① 파일을 열어 기존 로케일 인프라 유무 확인 → ② 실제 렌더 지점까지 추적해 그 인프라가 진짜 그 지점을 커버하는지 확인 → ③ 커버 안 되는 지점만 고친다)를 지킬 것 — 겉보기 Korean-매칭 건수는 착수 우선순위 판단용일 뿐 작업량의 근거가 아니다.

**PR #963**(완료) `chore/tarot-healing-i18n` — `app/tarot/healing/`(`page.tsx`·`start/page.tsx`·`TarotHealingLandingContent.tsx`·`TarotHealingClient.tsx`)은 **조사 결과 이미 12로케일 완전 번역**돼 있었다. 유일한 공백은 `TarotHealingRouteClient.tsx`의 동적 임포트 로딩 폴백 문구 하나("치유의 카드를 여는 중입니다.") — 형제 파일들이 쓰던 로케일 감지 패턴을 그대로 복제(이 클러스터 기존 관례가 파일마다 중복 구현이라 따름)해 12로케일 배선. `page.tsx`/`start/page.tsx`의 SEO 메타데이터는 로케일 라우팅 없는 URL이라 제외.

**PR #964**(완료, 코드 변경은 위와 동일한 로딩 폴백 하나뿐) `chore/tarot-self-esteem-i18n` — `TarotSelfEsteemLandingContent.tsx`도 이미 12로케일 `SELF_ESTEEM_COPY` 완전 배선 상태. `TarotSelfEsteemRouteClient.tsx`의 동일 패턴 로딩 폴백만 배선. 🔴 **코드가 아니라 콘텐츠 문제라 사용자에게 보고만 하고 손대지 않은 발견**: `SELF_ESTEEM_COPY.ko`는 "자기 기준 회복 타로"(타인 시선·거절 불안·자기검열을 다루는 톤)인데 **나머지 11개 로케일 전부**가 예전 "Self-Esteem Level Up RPG Quest" 컨셉(디버프→몬스터→데미지→쉴드→레벨업)에 머물러 있다. 12개 로케일 키가 전부 채워져 있어 번역 누락이 아니라 **한국어판만 개편되고 나머지 11개가 못 따라간 콘텐츠 드리프트**로 보인다. 11개 로케일 퀘스트 스텝 문구를 새 컨셉으로 다시 쓰는 건 번역이 아니라 제품 결정이라 범위 밖에 남김 — 다음 세션(또는 사용자)이 어느 쪽 컨셉이 맞는지 정한 뒤 처리할 것.

**PR #966**(완료) `chore/tarot-prompt-maker-i18n` — `TarotPromptMakerClient.tsx`(3,676줄)는 **이 세션에서 만난 가장 정교한 기존 i18n 아키텍처**를 갖고 있었다: `Record<LoadingLocale,...>` 카피 테이블 9개, `buildOraclePrompt()`가 로케일별로 아예 별도 함수(`buildLocalizedTarotPrompt()`)로 분기, 레노먼드 카드 키워드가 번역이 없으면 한국어 대신 로케일 중립 카드 코드로 폴백하는 안전장치까지. `PROMPT_MAKER_PAGE_TEXT_TRANSLATIONS`/`promptMakerPageText()`(always-ko 스캐폴드처럼 보였음)와 `LENORMAND_SPREAD`는 실제 렌더 지점(`ORACLE_MODE_META_COPY`/`localizedLenormandSpread`)에서 완전히 재정의돼 안전하다는 것을 하나하나 추적 확인한 뒤 손대지 않았다 — **겉보기 스캐폴드 패턴만 보고 자동으로 "버그"라고 단정하지 말 것**의 실사례.
- 🔴 **실제로 발견·수정한 버그 1건**: `LENORMAND_INFO_ITEMS`(레노먼드 모드 설명 카드 6개)는 로케일 래핑이 전혀 없는 순수 하드코딩 배열로 모든 방문자에게 한국어로 노출되고 있었다. `LENORMAND_INFO_ITEMS_COPY`(ko/en/ja/zh-CN/zh-TW + 나머지 en 폴백) 추가해 수정.
- `TarotPromptMakerRouteClient.tsx`도 동일 패턴 로딩 폴백 배선.
- `data/tarotSpreadLibrary.ts`·`utils/buildOraclePrompt.ts`는 읽고 대조만 했고 수정 안 함 — 둘 다 이미 독자적인 완전한 로케일 아키텍처(`LOCALIZED_SPREAD_COPY`/`localizeSpread()`, `LOCALIZED_PROMPT_BUILDER_COPY`)를 갖춤.

**이로써 `tarot/healing`·`tarot/self-esteem`·`tarot/prompt-maker` 3개 클러스터 완료**(self-esteem은 콘텐츠 드리프트 이슈만 보고 상태로 남음).

**PR #967**(완료) `chore/music-i18n` — `app/music/`. `MusicRouteClient.tsx`는 동일 패턴 로딩 폴백. `MusicPlaylistPanel.tsx`는 ko/en/ja + en 폴백이 이미 정상이라 zh-CN/zh-TW만 추가. 🔴 **`MusicPlayerExample.tsx`에서 진짜 버그 2건**: (1) `getMusicPlayerCopy()`가 로케일이 정확히 `"ko"|"en"|"ja"`가 아니면 **`.ko`로 폴백**하고 있어 zh-CN/zh-TW/vi/hi/es/fr/de/nl/ms 방문자 전원이 **유료 트랙 결제 플로우(가격·다운로드 구매·결제 실패/가격변경 메시지 포함)를 통째로 한국어로** 보고 있었다 — `.en` 폴백으로 수정 + zh-CN/zh-TW 네이티브 추가, 겸사겸사 `ja` 블록의 결제 관련 필드 여러 개가 번역 안 되고 영어 그대로 방치돼 있던 것도 발견해 일본어로 채움. (2) `MusicPlaylistFallback()`(플레이리스트 패널 자체의 로딩 스켈레톤, 라우트 레벨 폴백과 별개 컴포넌트)에 로케일 래핑이 전혀 없는 하드코딩 한국어 4개 — 새 `PLAYLIST_FALLBACK_COPY`로 수정. `app/music/guide/page.js`(SEO 가이드)·`_data/musicManifest.ts`(곡 제목/무드, 데이터)·`_data/musicLyrics.ts`(실제 가사)는 제외.

**PR #968**(완료) `chore/flower-i18n` — `app/flower/{destiny,astrology,jamidusu,sukuyo}/page.tsx` 4개. 공용 `FeatureLandingPage` 컴포넌트가 이미 견고한 안전장치(non-ko 로케일에서 한국어 잔존 텍스트 자동 감지→일반 폴백 대체, `service.localized.en` 폴백)를 갖추고 있어 **한국어 누출 자체는 없었다.** 다만 4개 페이지 모두 `SERVICE.localized`에 `en` 블록만 있어 ja/zh-CN/zh-TW 방문자는 페이지 고유 메시지 대신 컴포넌트의 일반 폴백 문구를 보고 있었다 — 4개 페이지 전부에 ja/zh-CN/zh-TW 블록 추가(컴포넌트 코드는 안 건드림).

**이로써 이번 세션 시작 시점의 우선순위 목록(`tarot/*` 3개·`music`·`flower/*`) 전부 완료.**

**다음(미착수)**: 409개 전체 백로그 중 아직 안 훑은 나머지(위 "3건 이하" 그룹 62개 파일 + `destiny-compass`류로 이번 세션에서 새로 발견된 것과 같이 속성 전용 grep이 놓쳤을 수 있는 미조사 클러스터). **매 신규 클러스터 착수 전 `gh pr list --state open` 로 겹치는 PR 없는지 먼저 확인**(2026-08-22 초 중복 PR 4건 발생 후 확립된 절차 — 위 "중복 발생 원인·교훈" 참고). 409개 전체를 한 세션에서 끝낼 수 있다고 가정하지 말 것 — 이번 세션만 해도 destiny-bias·animal-destiny·sikojen-povailu·palm-reading·tarot×3·music·flower 총 9개 클러스터에 PR 12건이 들었다.

### 2026-08-22 세션 종료 시점 재산출 — 다음 착수 후보와 확인된 제외 대상

세션 종료 직전 속성 전용 grep(`(alt|aria-label|title)=...[가-힣]`, `app/**/*.tsx`)을 `origin/main` 기준으로 다시 돌렸다(이번 세션 PR들은 아직 main에 안 머지됐으므로 그 파일들이 다시 잡히는 건 정상 — 실제 미착수 여부는 이 문서의 PR 목록과 대조해서 판단할 것).

**확인 후 제외로 분류(Wave 9, 콘텐츠 작성 프로젝트)**: `app/compare/fortune-apps/page.tsx`(직접 읽어 확인) — 서버 컴포넌트, 로케일 라우팅 없음, `verify-adsense-readiness` 1,800자 기준을 타는 SEO 장문 아티클(운세 앱 비교 콘텐츠, 사이트맵 등록·구조화 데이터 포함). `app/compare/saju-vs-ziwei/page.tsx`·`app/compare/sukuyo-vs-vedic/page.tsx`도 같은 `/compare/*` 패밀리라 동일 판단으로 추정(직접 열어보진 않음, **미검증** — 다음 세션이 열어서 확인할 것). `music/guide/page.js`·`nakshatra/codex/[index]/page.tsx`와 동일 범주.

**다음 세션 확인 후보 — 전부 소진됨.** ~~`app/oracle/rune/page.tsx`→`RuneRouteClient`~~ **완료(PR #969)**, ~~`app/saju-fpti/page.tsx`→`SajuFptiRouteClient`~~ **완료(PR #970)**, ~~`app/ziwei/chart/page.tsx`→`ZiweiChartClientLoader`~~ **완료(PR #971)**, ~~`app/tarot/mindscan/page.tsx`→`MindScanTarotRouteClient`~~ **완료(PR #972)**, ~~`app/fortune/[period]/page.tsx`+`SignFortuneView.tsx`+`YeoniPortrait.tsx`~~ **Wave 9로 확인·제외(코드 변경 없음)**, ~~`app/stories/[episode]/page.tsx`~~ **Wave 9로 확인·제외**, ~~`app/insights/famous-saju/[slug]/page.tsx`~~ **Wave 9로 확인·제외**. 다음 세션은 이 목록에서 더 뽑을 게 없으니 "3건 이하" 그룹 62개 파일 재산출 또는 `git grep -lP '[가-힣]' -- 'app/**/*.tsx' 'app/**/*.ts'` 전수 재스윕으로 새 클러스터를 다시 발굴해야 한다(destiny-compass·StonehengeRune 사례처럼 속성 전용 grep이 놓친 게 더 있을 수 있음).

## 2026-08-22 `fortune/[period]` — Wave 9(SEO 콘텐츠)로 확인, 코드 변경 없음

조사 결과 `app/fortune/[period]/page.tsx`(허브, 255줄)·`YeoniPortrait.tsx`(67줄)·`app/fortune/[period]/[sign]/page.tsx`(상세, 118줄)·`SignFortuneView.tsx`(447줄) 전부 **서버 컴포넌트**이고 `"use client"`가 없다. `generateStaticParams`(4개 period × 24개 sign = 96페이지 정적 생성)·`generateMetadata`·Article/WebPage/Breadcrumb/FAQ JSON-LD를 갖춘 순수 SEO 아티클 허브다.

- `YeoniPortrait.tsx` 자체 주석이 명시: 이 저장소의 마스코트 컴포넌트 4종(`components/yeon/YeonSpriteFrame` 등)은 전부 `"use client"`인데, 여기서 그중 하나라도 import하면 클라이언트 경계가 생겨 `scripts/verify-adsense-readiness.mjs`(서버 렌더 텍스트만 세어 최소 글자수 미달 시 빌드 실패)가 깨진다 — **의도적으로 `<Image>` 래퍼만 두고 클라이언트 컴포넌트를 피한 설계.**
- `SignFortuneView.tsx`도 "서버 컴포넌트, `\"use client\"` 추가 금지" 경고 주석이 있음(같은 AdSense 최소 글자수 이유, 이 라우트는 광고 수익화 라우트). `SignViewModel` 데이터를 연애/재물/건강/일 리딩·행운의 색/숫자·FAQ 등 한국어 서술 문장으로 결합하는 콘텐츠 생성 엔진이지 UI 크롬이 아니다.
- 로케일 카피 테이블·`getCurrentLoadingLocale()`·`cd:locale-*` 리스너 전혀 없음 — 클라이언트 하이드레이션 자체가 없으므로 당연한 결과. 사전 감사 문서의 "Wave 9(hreflang 확장, SEO 콘텐츠, 사용자 명시 요청 시에만 착수)" 원칙 그대로 적용해 **이번 UI 크롬 패스에서는 손대지 않음** — PR 없음, 코드 변경 없음.

## 2026-08-22 `stories/[episode]`·`insights/famous-saju/[slug]` — 둘 다 Wave 9(SEO 콘텐츠)로 확인, 코드 변경 없음

핸드오프 목록의 마지막 두 후보도 조사 완료 — 둘 다 서버 컴포넌트, `"use client"` 전혀 없음.

- **`app/stories/[episode]/page.tsx`**(142줄) — "연이의 운명 노벨" 연재 소설(프롤로그+31화, `dynamicParams = false`로 전편 정적 생성). 데이터는 `lib/stories/vn/index.ts`가 `scripts/build-story-text.mjs`로 미리 만든 `episodes.generated.json`을 읽기만 한다. 유일한 임포트 `app/components/StoryIntegrityNote.tsx`도 훅 없는 정적 서버 컴포넌트(창작물 안내 문구). 이전·다음 화 내비게이션 링크 외에는 상호작용이 전혀 없다.
- **`app/insights/famous-saju/[slug]/page.tsx`**(762줄) — 유명인 사주 매거진 아티클. **명시적으로 noindex**(`withNoindexFollow`)이고 `scripts/verify-adsense-readiness.mjs`가 이 상세 페이지들을 AdSense 검사 대상에서 아예 제외하도록 명시(광고를 절대 태우지 않는 페이지로 취급). `ContentIntegrityNote.jsx`·`FusionCrossSell.tsx` 임포트 둘 다 훅 없는 정적 서버 컴포넌트("두 호스트 모두 서버 컴포넌트라 onClick 을 달 수 없어"라는 자체 주석 있음, 클릭 분석은 `js/core/analytics.js`의 전역 위임 리스너가 처리). 상호작용처럼 보이는 유일한 요소(`<details>` FAQ 접기)는 네이티브 HTML이라 JS 불필요. `FAMOUS_SAJU_INSIGHT_TEXT_TRANSLATIONS`(~19키, ko 전용, "십성 분석"/"신살"/"문답" 같은 아티클 섹션 라벨)가 있지만 로케일 반응형 클라이언트 UI가 아니라 방문자 무관 서버 렌더 SEO 콘텐츠라 이번 클라이언트 i18n 패스 범위 밖(향후 SEO 콘텐츠 자체를 다국어화할 계획이 서면 별도로 볼 것).
- 둘 다 사전 감사의 "Wave 9(hreflang 확장, SEO 콘텐츠, 사용자 명시 요청 시에만 착수)" 원칙 적용 — **손대지 않음, PR 없음.**

**이로써 핸드오프 문서의 "다음 세션 확인 후보" 목록 7개(오라클룬·사주FPTI·자미두수·마인드스캔·fortune/period·stories·famous-saju) 전부 처리 완료** — 4개는 실제 UI 크롬 버그가 있어 PR로 고쳤고(#969~#972), 3개는 조사 결과 Wave 9 SEO 콘텐츠로 확인되어 제외했다. 다음 세션은 이 목록에 더 없으므로 "3건 이하" 그룹 62개 파일 재산출이나 `git grep -lP '[가-힣]'` 전수 재스윕으로 새 클러스터를 발굴해야 한다.

## 2026-08-22 `tarot/mindscan` — 로케일 인프라 전무, AI 리딩 경로는 이미 안전(재확인만) (완료)

**PR #972** `chore/tarot-mindscan-i18n` — `app/tarot/mindscan/page.tsx`→`MindScanTarotRouteClient.tsx`(dynamic wrapper)→실제 구현 `app/components/MindScanTarot.tsx`(1,691줄). 컴포넌트가 `app/` 안에 있지만 라우트 자신의 디렉터리 밖(`app/components/`)에 있다는 점에서 `ziwei/chart`(#971)와 같은 변형.

- `MIND_SCAN_TAROT_TEXT_TRANSLATIONS`가 `ko` 블록 하나뿐이고, `getCurrentLoadingLocale()`/`cd:locale-*` 리스너가 파일 전체에 단 한 곳도 없던 사례 — `saju-fpti`(#970)·`ziwei/chart`(#971)와 같은 "로케일 분기 자체가 없음" 최악 패턴이 세 번째로 재확인됨.
- 신규 `app/components/_lib/mind-scan-tarot-copy.ts`(en/ja/zh-CN/zh-TW+나머지 EN 폴백)로 인트로/카드 선택/스프레드/결과 4단계 UI 크롬 ~112개 문자열 배선(버튼·토스트·결제 게이트 문구·포지션 라벨).
- **AI 리딩 생성 경로는 이미 로케일 안전함을 확인**(신규 작업 아님) — `worker/routes/tarot.js`가 `worker/lib/ai-locale-context.js`의 ambient locale을 읽어 Gemini 프롬프트에 출력 언어 지시문을 이미 주입 중(PR #881 적용 범위). 이번 PR은 순수 UI 크롬 작업.
- **제외(AI 프롬프트 본문)**: `buildMindscanAiPromptText()`/`buildText()`의 공유 텍스트 템플릿 — 룬/prompt-hub 전례와 동일. 이 함수 안의 포지션 라벨은 UI용 `copy`가 아니라 별도로 새로 만든 고정 `AI_PROMPT_POSITION_META`를 참조하게 해 기존 100% 한국어 프롬프트 동작을 그대로 보존(로케일 분리가 필요했던 유일한 지점 — `TarotPos`의 `label`/`meaning` 필드 자체를 없애고 `positionLabel(id, copy)`/`positionMeaning(id, copy)` 헬퍼로 교체했기 때문).
- **제외(AI 응답 enum 토큰)**: `LOVE_SIGNAL_CLASS`/`RISK_LEVEL_CLASS`의 한국어 키("긍정"/"낮음" 등) — AI가 반환하는 고정 토큰이라 변경하면 스타일 매핑이 깨진다.
- 검증: `npx tsc --noEmit` clean · `npx eslint` 0 errors(경고 16개 전부 기존, `catch (e)` 미사용 변수·기존 훅 의존성 경고) · `node --test __tests__/ui/mindscan-immersive.static.test.js` 3/3 pass · `node scripts/verify-mindscan-reading.mjs`/`verify-tarot-topic-lock.mjs` 전부 통과(mock 기반, LLM 실호출 0회) · `verify-mobile-feature-coverage.mjs`/`verify-adsense-route-policy.mjs` OK · `config/payment-freeze.json` 미등재. 이번엔 literal-string 단언이 깨지는 verify 스크립트가 없었음(3면 grep으로 확인).

## 2026-08-22 `ziwei/chart` — 로케일 인프라 자체가 없던 가장 심한 사례, LLM 요청 locale 하드코딩 버그 발견 (완료)

**PR #971** `chore/ziwei-chart-i18n` — `app/ziwei/chart/page.tsx`→`ZiweiChartClientLoader.tsx`(순수 dynamic import 래퍼)→실제 구현 `app/components/AdvancedZiweiSectionV2.tsx`(2,671줄)+`app/components/ziwei/ZiweiDeepPdfPanel.tsx`(565줄). 이전 두 클러스터(`oracle/rune`·`saju-fpti`, 컴포넌트가 `app/` 밖)와 달리 이번엔 컴포넌트가 `app/` 안에 있다 — "app/ 밖" 패턴은 이번엔 아니었고, 대신 **로케일 분기 자체가 아예 없는** 이번 세션 최악의 사례(`ADVANCED_ZIWEI_TEXT_TRANSLATIONS`가 `ko` 블록 하나뿐이라 `advancedZiweiText()`가 로케일 인자조차 안 받고 무조건 한국어 반환).

- 신규 `app/components/ziwei/_lib/advanced-ziwei-copy.ts`+`ziwei-deep-pdf-copy.ts`(en/ja/zh-CN/zh-TW+나머지 EN 폴백)로 두 파일의 UI 크롬(폼·인트로/컴퓨팅/결과 헤더·상담 트랙 8종·12궁 표 헤더·상세 카드 라벨·타이밍/마무리 섹션·결제 게이트 문구·에러 메시지 등) 전면 배선.
- 🔴 **버그 발견·수정**: `ZiweiDeepPdfPanel.tsx`의 15챕터 심층 리포트 생성 요청이 `payload.locale: "ko"` 하드코딩 — 뷰어 로케일과 무관하게 항상 한국어로 리포트를 요청하고 있었다. 감지된 로케일을 전달하도록 수정(기존에도 나가던 유료 LLM 호출의 요청 필드 하나를 바로잡은 것이지, 신규 실호출을 추가한 게 아니다 — 원칙 1 저촉 없음).
- **제외(도메인 고유명사)**: 12궁 이름(명궁/형제궁 등)·별 이름(자미/천기 등)·사화 4종 이름(화록/화권/화과/화기)·밝기 등급명(묘/득/리/평/함) — `transformationTypeToLabel()`(외부 미로케일 모듈)이 이 이름들을 항상 한국어로 반환하므로 일부만 번역하면 배지 하나는 영어·바로 옆은 한국어인 불일치가 생겨 더 나쁜 결과가 된다. 나크샤트라/Vedic 클러스터가 세운 "도메인 고유명사는 원어 유지" 전례와 동일.
- **제외(콘텐츠 생성 엔진)**: `PALACE_DEFINITION_MAP`/`STAR_MEANING_MAP`/`BRIGHTNESS_RULES`/`TRANSFORMATION_RULES`(궁·별·밝기·사화 의미/성향 서술)와 `buildPalaceReading()`/`buildTrackAnalysis()` 등이 만드는 모든 해석 문장, `ZIWEI_COUNSELING_TRACKS`의 `shortTitle`/`keyQuestions`/`interpretationPriorities`/`timingFocus`/`actionGuideType`/`cautionRules`(단 `title`·`purpose`는 직접 노출되는 고정 UI 텍스트라 번역함) — 로케일 인자 없이 항상 한국어 문장을 생성, `lib/fpti/premium-report.ts`(#970)와 동일 판단.
- **테스트 갱신 필요 사례 재발**(#962 palm-reading·#970 saju-fpti와 동일 교훈): `scripts/verify-ziwei-deep-report-flow.mjs`가 `"지난 리포트 다시 보기"` 리터럴을 `ZiweiDeepPdfPanel.tsx` 소스에서 직접 단언하고 있었는데, 이 문자열이 `_lib/ziwei-deep-pdf-copy.ts`로 이동하며 깨질 뻔했다 — `git grep` 3면 확인으로 미리 발견해 같은 커밋에서 단언 대상을 카피 모듈로 갱신.
- 검증: `npx tsc --noEmit` clean · `npx eslint` 0 errors/0 warnings · `node scripts/verify-ziwei-deep-report-flow.mjs` 13/13 pass(LLM 실호출 0회) · `node --test __tests__/ui/mobile-pricing-source.static.test.js __tests__/ui/ziwei-advanced-entry.static.test.js` 6/6 pass · `node scripts/verify-adsense-route-policy.mjs`/`verify-mobile-feature-coverage.mjs` OK · `verify-adsense-readiness.mjs`는 `dist/index.html` 빌드 산출물이 이 워크트리에 없어 미검증(이번 변경과 무관한 환경 제약) · `config/payment-freeze.json` 미등재 확인.

## 2026-08-22 `saju-fpti` — 실제 구현도 레포 루트에 있었다, "세대 혼재" 패턴도 재확인 (완료)

**PR #970** `chore/saju-fpti-i18n` — `app/saju-fpti/page.tsx`→`SajuFptiRouteClient.tsx`도 `oracle/rune`와 같은 패턴: 실제 구현은 `app/` 밖 레포 루트 **`components/fpti/`**(11개 파일, 3,040줄)에 있다(`@/components/fpti/*` alias import). 새 후보를 넣기 전에 `page.tsx`의 import 경로가 `app/` 밖을 가리키는지도 확인할 것 — grep 스코프 누락의 세 번째 원인(①속성만 잡는 패턴 ②본문 텍스트 위주 기능 ③파일 위치가 app/ 밖)으로 문서화.

- 신규 `components/fpti/_lib/copy.ts`(en/ja/zh-CN/zh-TW 실번역 + 나머지 EN 폴백)로 `FptiResultCard`/`FptiDictionarySection`/`FptiElementChart`/`FptiRelationshipCard`/`FptiShareCard`/`FptiStrategyCard`/`FptiLoading`의 UI 크롬 커버.
- 🔴 **"세대 혼재" 패턴 재확인**(animal-destiny·sikojen-povailu 이후 세 번째 사례): `FptiInputForm.tsx`는 이미 완벽한 12로케일(ko/en/ja/zh-CN/zh-TW+나머지 EN폴백) 구현, `FptiHero.tsx`는 겨우 `aria-label` 하나만 로케일화돼 있고 h1·태그라인·CTA 버튼·우측 패널 전체가 하드코딩 한국어였다 — **로컬 카피 테이블이 존재한다는 사실 자체가 "완료"의 증거가 아니다**, 그 테이블이 실제로 렌더 트리 전체를 커버하는지 파일을 끝까지 읽어야 한다(이번 세션 tarot/* 클러스터가 세운 "①인프라 유무 확인 → ②실제 렌더 지점까지 추적 → ③커버 안 되는 지점만 고친다" 절차와 동일선상, 다만 이번엔 반대 방향 실패 사례).
- 🔴 **버그 발견·수정 2건**: `FptiExperience.tsx`의 `FPTI_EXPERIENCE_TEXT_TRANSLATIONS`가 ko/en/ja만 있고 그 외 로케일(zh-CN/zh-TW 포함) 전부 `.ko`로 폴백 — music 클러스터(PR #967) `MusicPlayerExample.tsx`와 동일 클래스의 버그. `FptiTenGodsPanel.tsx`는 `useState<LoadingLocale>("ko")` 하드코딩 초기값(flash-of-Korean, PalmLineOverlay #960과 동일 클래스)과 `cd:locale-change` 리스너 누락(`cd:locale-ready`/`storage`만 있었음).
- **제외(콘텐츠 생성 엔진/데이터, 이 감사 전반의 판단 기준과 동일)**: `lib/fpti/premium-report.ts`(1,336줄, `buildFptiDeepReport()` — `locale` 참조 0건 확인, 심층 리포트 챕터/섹션 본문을 로케일 무관 한국어로 생성)와 `lib/fpti/fpti-dictionary.ts`(454줄, 16유형 데이터). `FptiResultCard.tsx` 안의 `CHAPTER_TITLE_SCHEMA`/`CATEGORY_SCHEMA`/`CHAPTER_LENS_LABELS`/`SECTION_LENS_SCHEMA`/`resolveTriadLabels()` 기본값과 `sanitizeUserText()`의 모든 장문 기본 문장은 이 엔진의 스키마·폴백이라 같은 범주로 제외 — 라벨만 번역하면 "번역된 라벨 + 여전히 한국어인 생성 본문"이 섞이는, `YeonStarHugClient`(#946)·`destiny-bias`·`LoveSimulationEngine`이 이미 확립한 것과 동일한 나쁜 결과가 되기 때문. `result.*`(`FptiAnalysisResult`) 생성 값과 그 기본 대체 문구도 동일 이유로 제외, 감싸는 라벨(예: "핵심 성향")만 번역.
- 심층 리포트 뷰의 "잠금"/"열기"/"접기" 배지·챕터 잠금 안내 2종·"제목 없음" 폴백·현재 챕터 진행률 카운터는 결제 게이트/네비게이션 크롬으로 판단해 포함, "읽는 순서" 줄과 "챕터 요약" 제목은 바로 옆 생성 콘텐츠와 붙어 있어 제외 — 이 경계 판단 기준도 기록해 다음 세션이 유사 파일에서 참고하게 함.
- **테스트 갱신 필요 사례 재발**(#962 palm-reading과 동일 교훈): `__tests__/worker/fpti-deep-report.quality.test.js`가 `FptiResultCard.tsx` 소스에서 `"심층 리포트 잠금 해제"` 리터럴을 직접 단언하고 있었는데, 이 문자열이 `_lib/copy.ts`로 이동하면서 깨질 뻔했다 — `git grep` 3면 확인으로 미리 발견해 같은 커밋에서 단언 대상을 `_lib/copy.ts`로 갱신.
- 검증: `npx tsc --noEmit` clean · `npx eslint components/fpti/` 0 errors(경고 3개 전부 기존 `catch (e)` 패턴) · `jest __tests__/worker/fpti-deep-report.quality.test.js` 4/4 pass · `node scripts/verify-profile-card-action-policy.mjs` 23/23 pass(`FptiExperience.tsx`의 생년월일 파싱 함수를 참조하는 가드) · `node scripts/verify-payment-freeze.mjs` 통과, 미등재 확인.

## 2026-08-22 `oracle/rune` — 실제 라이브 컴포넌트가 레포 루트에 있었다 (완료)

**PR #969** `chore/oracle-rune-i18n` — `app/oracle/rune/page.tsx`→`RuneRouteClient.tsx`를 열어 보니 실제 렌더 컴포넌트는 `app/` 트리 밖, **레포 루트의 `StonehengeRune.jsx`**였다(`dynamic(() => import("../../../StonehengeRune"))`). 이번 세션의 다른 "속성 전용 grep이 놓친다" 사례들이 전부 **grep 패턴**(속성 vs 본문 텍스트) 문제였던 것과 달리, 이번은 **파일 위치** 자체가 `app/**/*.tsx` 스코프 밖이라 어떤 grep으로도 안 걸렸다 — 새 클러스터를 후보로 올릴 때 `page.tsx`의 import 경로가 `app/` 밖을 가리키는지도 확인할 것.

- 신규 `lib/stonehenge-rune-copy.ts`(49필드, en/ja/zh-CN/zh-TW — 이번 지시 이후 신규 작업이라 나머지 7개 로케일은 EN 스프레드 폴백)로 헤더·컬렉션·스프레드 선택·뽑기 버튼·방향 배지·상세 모달·AI 프롬프트 섹션·CTA·공유 관련 alert 등 ~35개 UI 문구 배선.
- **제외(콘텐츠 데이터, `lib/tarot/rich-card-meanings.mjs`와 동일 취급)**: `RUNES_DATA`(24룬 정/역방향 의미)·`RUNE_GUIDE`/`DEFAULT_RUNE_GUIDE`(24룬×~13필드 다문장 산문)·`getDetailedReading()`의 생성 문장(`intro`/`positionNote`)·`getSpreadInsight()`의 생성 결과물·`buildRuneAiQuestionPrompt()`의 AI 프롬프트 템플릿·`SPREAD_LABELS`(생성 함수 내부 전용).
- 검증: `npx tsc --noEmit` clean · `npx eslint StonehengeRune.jsx lib/stonehenge-rune-copy.ts` 0 errors(경고 7개 전부 변경 범위 밖 기존 코드) · `NODE_OPTIONS=--experimental-vm-modules npx jest __tests__/worker/legacy-coin-disabled.static.test.js --runInBand --testEnvironment node` 20/20 pass(이 파일을 배포 클라이언트 표면으로 참조) · `node --test __tests__/ui/locale-prefix-map.static.test.js` 3/3 pass · `config/payment-freeze.json` 미등재.
- 🔴 **작업 중 실수(이미 복구됨)**: 이 클러스터 작업 시작 전 후보 조사용으로 `git checkout main`을 했다가 새 브랜치를 만들지 않고 그대로 커밋해버려, `StonehengeRune.jsx` 변경이 로컬 `main`에 직접 올라간 적이 있다(원격에는 push 안 됨 — 당시 `git push`는 별개의 기존 `chore/music-i18n` 브랜치를 가리켜 "Everything up-to-date"로 끝났을 뿐 이 커밋을 올리지 않았음, 사고 확인됨). 새 브랜치(`chore/oracle-rune-i18n`)를 그 커밋 위에 만들어 `origin/main` 위로 rebase하고, 로컬 `main`은 `origin/main`으로 리셋해 복구했다. **다음 세션 유의**: 후보 클러스터 조사 목적으로 `git checkout main`을 하더라도, 실제 파일 수정을 시작하기 전에 반드시 새 feature 브랜치부터 체크아웃할 것.

**계속 제외(admin)**: `app/admin/**`(feedback·content·reviews·prompts·cms·monthly-credits·_components 등) — 1차 세션부터 "admin 10파일 제외"로 일관 유지된 정책. 내부 도구, 비색인, 다국어 대상 아님.

## 2026-08-22 `master-love-codex` — `app/` 밖 `src/features/` 트리 전체(30개 파일), 로케일 인프라 전무 (완료)

**PR #974** `chore/master-love-codex-i18n` — 원래 핸드오프 문서의 7개 후보 목록이 전부 소진된 뒤, `git grep -lP '[가-힣]'` 전수 재스윕으로 새로 발굴한 클러스터. `app/master-love-codex/page.tsx`→`MasterLoveCodexRouteClient.tsx`(dynamic import)의 실제 구현이 `app/` 밖 완전히 별도인 최상위 디렉터리 `src/features/master-love-codex/`(30개 파일, 4,174줄)에 있었다 — 지금까지 세션이 만난 "실제 컴포넌트가 라우트 디렉터리 밖" 패턴 중 가장 먼 사례(레포 루트도 아니고 `app/` 형제도 아닌 완전히 다른 최상위 트리). `src/components/maya/`(MayaCalendarView 등, 3파일)도 같은 디렉터리 발견 과정에서 함께 확인된 소규모 자매 클러스터 — **완료(PR #975)**, 아래 참고.

- 로케일 인프라 완전 전무: `getCurrentLoadingLocale()`/`cd:locale-ready`/`cd:locale-change` 리스너가 30개 파일 전체에 단 한 곳도 없었다.
- 신규 `src/features/master-love-codex/_lib/copy.ts`로 22개 파일(메인 오케스트레이터 + 21개 컴포넌트)의 JSX 임베디드 UI 문자열(버튼·폼 라벨·에러 12종·결제 게이트 문구·aria-label·진행 상태·리더 화면 문구)을 배선. 각 컴포넌트는 개별 훅 인스턴스 대신 공유 모듈의 `useMasterLoveCodexCopy()`/`useMasterLoveCodexLocale()`을 각자 import(destiny-compass 클러스터가 세운 "공유 `_lib/copy.ts` + 컴포넌트별 훅 호출" 패턴과 동일 — 23개 개별 로컬 훅 복제를 피함).
- **버그 수정**: `constants.ts`의 `masterLoveCodexBilling(mode)`가 로케일 무관하게 항상 한국어 제목("마스터 인연의 서")을 반환했다 — 이 제목은 결제 게이트 `reason`·PDF 표지 제목·리더 본문 제목으로 8개 파일(`CodexReader`/`CodexReportOutro`/`CodexReportStamp`/`CodexGenerating`/`CodexPremiumCard`/`CodexLanding`/`MasterLoveCodexPage` 등)에서 쓰이는 핵심 값이다. `masterLoveCodexBilling(mode, locale)`로 확장하고, 비-ko 로케일은 화면에 이미 함께 노출되는 영문 브랜드명 "Master Love Codex"를 그대로 쓰도록 처리(별도 의역 없음 — ko 화면조차 브랜드 헤딩은 영문이라는 전례 기반).
- **이번에 새로 적용한 스코프 판단 기준(향후 재사용 가능)**: 이 기능은 프롤로그 비주얼노벨 대사·마케팅 카피가 코드 전반에 산재해 있어 "콘텐츠 vs UI 크롬" 경계가 이전 클러스터보다 훨씬 모호했다. **JSX에 직접 박힌 문자열은 길이 불문 번역, 데이터 파일(배열/객체 테이블 형태)은 길이 불문 제외**라는 기계적 기준으로 정리 — `data/prologue.ts`(9씬 대사 스크립트)·`data/premium.ts`(히어로 스펙·플랜 혜택·Why Premium 4문단·신뢰 요소)·`data/value.ts`(가치 축·정직한 한계)·`data/acts.ts`(5막 제목·소개)는 전부 데이터 테이블이라 제외, 반면 `CodexBirthGate.tsx`/`CodexLanding.tsx`에 직접 쓰인 서술형 문장(예: "혼자 읽으면 당신의 연애 방식을...")은 분량이 많아도 번역함. 이 4개 데이터 파일은 별도의 문학적 번역 작업이 필요한 콘텐츠로 명시적으로 남겨둠(후속 세션 과제).
- 화자 이름 "연애 고수"는 `CodexDialogueBox.tsx`의 `speaker: "narration" | "연애 고수"` 타입 리터럴로 제외 대상 프롤로그 데이터와 얽혀 있어 미번역 유지 — 다만 순수 서술형 alt 텍스트(예: "책을 읽고 있는 연애 고수")는 캐릭터 이름은 유지한 채 나머지 설명부만 로케일화.
- **알려진 잔여 이슈**: `CodexReportOutro.tsx`의 `codexAccessOutroLine(accessType, billing.title)`은 제외 대상 `data/premium.ts`의 함수라 로케일 불문 한국어 문장을 반환한다 — 뒤따르는 JSX 리터럴 문장은 이번에 로케일화했으므로, 비-한국어 사용자는 한 문단 안에서 "한국어 + 로케일화된 문장" 혼합을 보게 된다. `data/premium.ts` 콘텐츠 번역이 선행돼야 완전히 해소됨.
- 검증: `npx tsc --noEmit`(클린) · `npx eslint`(22개 변경 파일, 에러/경고 0) · `node scripts/verify-master-love-codex-flow.mjs`(통과 — 문자열 이동으로 깨진 4개 단언: 리터럴 "결과 보기"/"이어서 읽기", `masterLoveCodexBilling(...)` 정규식, `ERROR_TEXT`→`errorText` 리네임을 같은 커밋에서 수정) · `node scripts/verify-master-love-codex-batch-budget.mjs`/`verify-master-love-codex-compat-determinism.mjs`(통과) · `NODE_OPTIONS=--experimental-vm-modules npx jest __tests__/worker/payments-v2.foundation.test.js __tests__/worker/payments-v2.entitlements.test.js __tests__/worker/per-use-proof-roundtrip.test.js`(80/80 pass, 워커 쪽 featureKey 문자열만 참조) · `config/payment-freeze.json` 미등재 · `git grep -n "master-love-codex" -- '__tests__/' 'scripts/verify-*'` 3면 확인으로 위 4개 단언 파손을 미리 발견·수정.

## 🔴🔴 2026-08-22 핵심 발견 — "route fallback" 제목의 PR이 실제 구현을 건드리지 않은 사례가 더 있다 (+ 판정 오탐 주의)

CI/머지 순서 점검 중 열린 PR 24개의 파일 목록을 실제로 대조해 보니, `oracle/rune`·`saju-fpti`·`ziwei/chart`·`tarot/mindscan`(이번 세션에서 이미 처리)과 같은 패턴으로 **PR #963 `chore/tarot-healing-i18n`도 제목이 "route fallback"인 그대로 `TarotHealingRouteClient.tsx`(로딩 폴백)만 건드리고 실제 라이브 컴포넌트 `app/components/SunHealingTarot.tsx`(913줄)는 로케일 인프라가 전무한 채 방치돼 있었다.** 별도 브랜치(PR #976)로 처리 완료 — 상세는 아래 절 참고.

**반면 같은 방식으로 의심했던 PR #964 `chore/tarot-self-esteem-i18n`(제목도 "route fallback")은 실제로 열어 보니 `TarotSelfEsteemLandingContent.tsx`(379줄)가 **이미 12개 로케일 전체에 대해 진짜 번역이 채워진 `SELF_ESTEEM_COPY` 테이블로 완전히 배선돼 있었다** — 즉 이 파일은 Wave 7과 무관하게 이미 다른 경로로(또는 이 프로젝트 시작 전부터) 완성돼 있었다. **손대지 않고 그대로 확인만 하고 넘어감.**

🔴 **이번에 얻은 교훈 — grep 한국어 줄수만으로 "미번역"을 단정하지 말 것.** `app/components/FeatureLandingPage.tsx`(551줄 Korean 매치, 18개 이상의 랜딩 라우트가 공유하는 셸)와 `app/components/MainLandingPage.tsx`(173줄)도 처음엔 새 클러스터 후보로 보였으나, 실제로 열어 보니 **자체 `FEATURE_LANDING_COPY`/`MAIN_LANDING_COPY`(둘 다 `Record<LoadingLocale, ...>`, 12로케일)와 자체 로케일 감지 함수(`getCurrentFeatureLocale()`/`getCurrentMainLandingLocale()`, `constants/loadingMessages.ts`의 `getCurrentLoadingLocale()`과는 다른 이름)로 이미 완전히 로케일화돼 있었다.** 한국어가 많이 잡히는 이유는 `SLUG_CFG` 같은 **정본이 한국어인 데이터 테이블**(비-ko는 별도 lazy-load 모듈 `FeatureLandingPage.slugTags.ts`로 오버라이드)과 코드 주석 때문. **`getCurrentLoadingLocale` 문자열 유무로 "로케일 인프라 있음/없음"을 판정하는 것도 오탐 소지가 있다** — 파일마다 자체 이름의 로케일 감지 함수를 따로 구현해 둔 경우가 있다(예: `FeatureLandingPage.tsx`). **판정은 반드시 파일을 열어 실제 JSX 리터럴이 `copy.*`로 배선돼 있는지, 그 `copy` 테이블이 로케일별로 진짜 다른 값을 담고 있는지(단순 `null` 폴백이 아니라)까지 확인한 뒤에만 내릴 것.**

## 2026-08-22 `tarot/healing`(실제 구현) — `SunHealingTarot.tsx`, PR #963이 놓친 라이브 컴포넌트 (완료)

**PR #976** `chore/tarot-healing-core-i18n` — 신규 `app/components/_lib/sun-healing-tarot-copy.ts`(en/ja/zh-CN/zh-TW 실번역)로 인트로/스프레드/결과 3단계 UI 크롬 전체 배선. `MAJOR_CARD_NAMES`/`SUIT_NAMES`/`RANK_NAMES`(`lib/tarot/tarot-cards.mjs`와 동일해야 하는 카드 고유명사)와 `buildSunHealingAiPromptText()`의 AI 프롬프트 본문은 제외. **재사용 기법**: `ResultCardSummary`/`ResultDetailCard`가 화면에 보여주는 자리/방향 라벨은 `item.positionLabel`/`item.orientationLabel`(AI 프롬프트에도 그대로 들어가는 한국어 고정값)을 직접 렌더하지 않고, 원시 인덱스/enum 값에서 `copy.positionLabels[idx]`/`copy.orientationLabel(orientation)`로 새로 로케일화된 값을 계산해 렌더(mindscan 클러스터의 `AI_PROMPT_POSITION_META` 분리 전례와 동일 발상) — 프롬프트 입력 경로는 전혀 안 건드림. 검증: `tsc`/`eslint` 클린, 3면 grep으로 참조 테스트 없음 확인, payment-freeze 미등재(결제 게이트 없는 무료 기능).

## 2026-08-22 `maya` — master-love-codex 발견 과정에서 확인된 소규모 자매 클러스터 (완료)

**PR #975** `chore/maya-i18n` — `app/maya/page.tsx`→`MayaRouteClient.tsx`(dynamic import) → 실제 구현 `src/components/maya/`(3개 파일: `MayaCalendarView.tsx`/`MayaDateSummaryCard.tsx`/`MayaPromptGeneratorCard.tsx`). 로케일 인프라 완전 전무(3개 파일 전체에 `getCurrentLoadingLocale()` 없음). 신규 `_lib/copy.ts`로 히어로/날짜 선택기/월간 그리드/요약 카드/AI 프롬프트 생성기(결제 게이트·에러 6종 포함) 배선. `MAYA_PROMPT_TOPICS`(AI 프롬프트 페이로드 값)와 `src/data/maya-calendar-symbols.ts`의 Tzolk'in/Haab 고유명사·`maya-calendar.ts`의 `labelKo`(계산된 한국어 날짜 표기, 항목 7과 같은 범주)는 제외. 검증: `tsc`/`eslint` 클린, `node --test __tests__/fortune/maya-calendar.test.js` 5/5 pass(라이브러리 파일 미변경 확인용), 3면 grep으로 참조 테스트 없음 확인, payment-freeze 미등재.

## 🔴🔴 2026-08-22 핵심 발견 — Wave 7의 속성 전용 grep이 26개 파일짜리 기능 전체를 놓쳤다

`nakshatra/codex`류 파일을 확인하던 중 `app/destiny-compass/`(운명의 나침반, `/destiny-compass`)를 열어 보니 **23개 클라이언트 컴포넌트 + 엔진/무대/훅 3개 디렉터리, 총 3,372줄에 540줄 이상이 한국어**인 통짜 기능이 Wave 7 우선순위 표에 전혀 안 잡혀 있었다. 원인: 지금까지 재산출해 온 Grep 패턴(`(alt|aria-label|title)=["'\`][^"'\`]*[가-힣]`)이 **속성값만** 찾는데, 이 기능은 대부분의 한국어가 일반 텍스트 노드(`<p>`, `<span>`, 버튼 라벨)에 있어서 그 패턴에 아예 안 걸렸다. **"alt/aria/title 건수"로 우선순위를 매기는 방식 자체가, 속성이 적고 본문 텍스트가 많은 기능(게임형 인터랙티브 화면 등)을 체계적으로 놓친다** — 다음 세션이 "3건 이하" 그룹을 마저 훑을 때, 이 grep 결과에 없다고 그 파일에 번역할 게 없다고 가정하지 말고 파일을 직접 열어 볼 것. (특히 `_stage/`, `_engine/`, `_hooks/`처럼 컴포넌트가 아닌 하위 디렉터리를 가진 기능 — 이런 폴더 자체가 "그 파일 하나"보다 큰 클러스터라는 신호다.)

사용자에게 "지금 전부 진행할지, 인수인계만 남길지, UI만 하고 조사(을/를) 엔진은 남길지" 3가지 옵션을 물었고, 사용자가 **"지금 전부 진행(추천)"**을 선택해 같은 세션에서 전체를 완료했다.

1. **PR #933** `fix/destiny-compass-i18n-locale` — `app/destiny-compass/` 전체(23개 컴포넌트 + `_engine/directionScore.ts`·`_stage/mapDialogue.ts`·`_stage/narration.ts`·`_hooks/useCompassSession.ts`·`_hooks/useCompassReport.ts`) 12로케일 완전 번역. 세션 전체가 써 온 "파일 하나 = 훅 하나" 패턴 대신 **23개 컴포넌트가 공유하는 단일 모듈 `_lib/copy.ts`**(`useDestinyCompassCopy()`)를 새로 도입 — 훅 보일러플레이트 23배 복제를 피하기 위한 의도적 이탈이다(향후 유사한 다중 컴포넌트 기능은 이 패턴을 우선 검토할 것).
   - **한국어 조사 엔진 교체**: `CompassHero.tsx`의 `josa()`/`hasFinalConsonant()`(을/를·으로/로 자동 선택)는 한글 종성 유무 판정이라 다른 언어로 이식 불가 — 로케일별로 문장 전체를 조립하는 `copy.coordinateSentence(band, area)` 함수로 대체(각 언어가 자기 문법으로 직접 작성). **이 클래스의 "한국어 문법 특화 로직"이 다른 파일에도 있는지는 이번에 처음 발견된 것이라 전수 확인이 안 됐다** — 새 파일에서 조사/어미 활용 패턴을 보면 같은 방식(로케일별 완성 문장 반환 함수)을 적용할 것.
   - `_engine/directionScore.ts`의 `LUCKY` 템플릿을 원시 한국어 문자열 대신 안정 슬러그 키(예: `"near_water"`)로 바꾸고, 화면은 `copy.luckyPlace[key]` 등으로 표시 문구를 조회하도록 변경. 7개 카테고리 중 실제로 렌더링되는 건 4개(장소·시간·색·사람)뿐이라는 것도 이번에 확인됨(나머지 3개는 계산만 되고 화면에 안 나가는 상태가 이 PR 전부터 그대로).
   - `formatKrwFromCoins()` 호출 4곳(CompassReport/Crossroads/FutureSim/LifeVoyage)이 로케일 인자를 안 넘겨 뷰어 언어와 무관하게 항상 "원"으로 나가던 버그 발견·수정(`detectLocale()` 전달) — **이 헬퍼를 호출하는 다른 파일도 같은 버그가 있을 수 있다(전수 확인 안 됨)**.
   - `_engine/constants.ts`의 `DIRECTION_LABEL_KO`가 이 PR로 마지막 소비처까지 이관되며 완전한 죽은 코드가 되어 제거함(3면 grep 확인). `EMOTION_LABEL_KO`는 이 PR 이전부터 이미 죽어 있던 코드라 범위 밖으로 두고 그대로 둠.
   - 의도적으로 그대로 둔 것(문서화): `_engine/adapters/*.ts`·`_engine/evidence/*.ts`(원 용어 반환 계산 엔진, 앞선 PR들의 Vedic/Graha 용어 제외와 동일 판단), `app/destiny-compass/page.tsx`(AdSense 저가치 인벤토리 게이트용 FAQ 서버 콘텐츠 — `nakshatra/codex`와 같은 Wave 9 버킷), `CHIP_AXES[].seed`(직접 코드 확인 결과 순수 해시 채점 입력이라 화면 비노출, 안전), `NARRATION_RISKY` 한국어 정규식(이미 `koGuard`로 ko 전용 스코프).
   - 검증: `npx tsc --noEmit`(클린), `npx eslint`(이 PR 무관 기존 경고 1건만), `node scripts/verify-destiny-compass-determinism.mjs`(OK), `node scripts/verify-guard-wiring.mjs`(OK). `config/payment-freeze.json`에 destiny-compass 미등재 확인(결제 게이트 4개 있는 기능인데도 매니페스트 갱신 불필요). 이 기능을 참조하는 jest/UI 테스트 없음. **브라우저 수동 확인은 미검증** — 다음 세션(또는 스테이징 배포 후)이 12로케일 전체 플로우(입력→처리→결과→갈림길/미래시뮬/삶의항로→오늘의퀘스트→도착)를 한 번씩 훑어볼 것.

## 2026-08-22 `destiny-meeting-place` — route-fallback 패턴 재확인 + "형제 필드 혼재" 판단 기준 정립 (완료)

**PR #978** `chore/destiny-meeting-place-i18n` — `app/saju/destiny-meeting-place/page.tsx`→`DestinyMeetingPlaceRouteClient.tsx`(dynamic wrapper)→실제 구현 `components/DestinyMeetingPlacePage.tsx`(515줄, 유료 1회 분석 `destiny_meeting_place` featureKey). 로케일 인프라 전무(스캐폴드가 `ko` 블록 하나뿐이었고, 심지어 `destinyMeetingPage.006` 키는 `ko` 값 자체가 영어 문자열 "Reset form"이었다). 신규 `_lib/copy.ts`로 헤더·히어로(장소/시간/분위기 하이라이트 3곳을 span으로 감싼 문장은 언어마다 어순이 달라 `heroDescriptionParts: {text, highlight?}[]` 배열로 분리해 각 로케일이 자기 어순대로 작성)·배지·입력 폼·제출 버튼·에러 토스트·통화 표시(`copy.currency`, 로케일별 포맷)까지 전부 배선. `DestinyMeetingPlaceLoading.tsx`(28줄)도 로케일 인프라가 없어 자체 5로케일 테이블 신설.

🔴 **새로 정립한 판단 기준 — "형제 필드 혼재" 체크**: `DestinyMeetingPlaceResult.tsx`는 착수 전 열어보니 이미 ko/en/ja/zh-CN/zh-TW 5개 로케일이 전부 완비돼 있었다(따옴표 있는 `"zh-CN":` 키를 놓친 첫 grep 패턴 탓에 "미완성"으로 오판할 뻔함 — `hub-cards-are-the-hub-unique-body` 류 오탐 방지 원칙의 연장). 반면 형제 파일 `destinyMeetingPlaceMappings.ts`·`destinyMeetingPlacePremiumDemo.ts`는 title/description 8~10개는 5로케일 표가 이미 있는데 **조회 함수가 로케일 무관하게 항상 `.ko`만 반환하거나(Mappings) 미지원 로케일에서 `.ko`로 새는(PremiumDemo)** 버그가 있어 처음엔 "데이터는 있으니 배선만 고치면 된다"고 판단해 고쳤다. 그런데 **같은 객체 안에서 title/description 바로 옆에 있는 `reason`/`actionTip`/`whyItFits`/`examplePlaces`/`caution` 필드는 전부 하드코딩 한국어 산문**이라는 걸 뒤늦게 발견 — title만 로케일화하면 카드 하나가 "영어 제목 + 한국어 본문"으로 쪼개져 지금(전체 한국어)보다 더 나쁜 결과가 된다는 걸 깨닫고 **되돌렸다**(YeonStarHugClient #946 전례와 동일 판단 축, 이번엔 사후 발견). `destinyMeetingPlaceEngine.ts`(849줄, 자체 스캐폴드 18키가 `ko` 전용)도 같은 이유로 제외.

**교훈**: 필드 하나를 로케일화하기 전에 **같은 객체 리터럴 안의 형제 필드를 반드시 함께 확인**할 것 — "이 필드는 이미 로케일 테이블이 있다"가 "이 카드/섹션 전체를 로케일화해도 안전하다"를 의미하지 않는다. 검증: `tsc`/`eslint` 클린(경고 3건은 무관한 기존 것), `node scripts/verify-paid-gate-ui-regression.mjs`(이 파일을 소스로 읽어 게이트 순서를 단언하는 가드 — PASS), 3면 grep으로 위 가드 외 참조 없음 확인, `config/payment-freeze.json` 미등재.

## 완료된 것 (PR 목록, 전부 `main` 미머지)

1. **PR #879** `fix/website-jsonld-description-scope` — 전 라우트 JSON-LD `WebSite.description` 한국어 고정 제거.
2. **PR #881** `fix/tarot-llm-response-locale` — 러브리딩·마인드스캔 타로 LLM 로케일 플러밍.
3. **PR #882** `fix/payment-gate-status-i18n` — 결제 게이트 오버레이 12로케일화(누락 10개 상태 + 지연로딩 폴백).
4. **PR #888** `fix/withdraw-modal-crash` — **P0**. `WithdrawModal.jsx`가 정의되지 않은 `withdrawModalText()`를 호출해 회원탈퇴 모달이 크래시하던 것(2026-06-26 커밋 `53fd3acfa`의 미완성 이관) 긴급 수정.
5. **PR #889** `fix/locale-html-lang-attribute` — `/en·/ja·/zh·/zh-tw` 라우트에서도 `<html lang="ko">`로 고정되던 것을, 테마 FOUC 방지와 같은 동기 인라인 스크립트 패턴으로 파싱 중 조기 교정(SSR 원본 자체는 여전히 ko — 근본 해결은 middleware 필요, 이 레포는 재도입을 고위험으로 다룸).
6. **PR #890** `fix/i18n-tooling-worktree-scan-and-herotrust` — `i18n:check` 체인을 막던 `home.heroTrust.*` ko.json 누락 6키 보강 + `verify-i18n-no-fallback.mjs`가 `.claude/worktrees/`(병렬 워크트리)를 스캔 제외하지 않아 로컬에서 30배 부풀려진 거짓 회귀를 내던 도구 결함 수정.
7. **PR #891** `fix/authshell-full-locale-coverage` — 로그인/회원가입(`AuthShell.tsx`)이 실제로는 ja/zh-CN/zh-TW도 44개 필드 중 약 10개만 자체 번역이고 나머지는 `...EN` 스프레드로 영어가 새던 것 포함, 12개 로케일 전부 완전 번역.
8. **PR #892** `fix/account-password-phone-locale` — 비밀번호·전화번호 변경 화면(로케일 개념 전무) `useT()`류 패턴 배선 + 12로케일 번역.
9. **PR #893** `fix/account-delete-locale`(#888 위에 체이닝) — 계정 삭제 액션 화면 12로케일화 + `WithdrawModal.jsx`를 `useT()` 정식 배선으로 전환(31키, 기계적 치환이 원래 놓쳤던 헤더/성공화면/버튼 등도 포함). **탈퇴 확인 문구 "회원탈퇴" 자체는 서버(`worker/routes/auth.js`)가 리터럴로 검증하므로 모든 로케일에서 의도적으로 한국어 그대로 유지**(아래 "남은 것 1" 참고).
10. **PR #894** `fix/error-boundary-locale` — `error.tsx`/`global-error.tsx`(완전 하드코딩) `useT()` 배선 + `errorBoundary` 네임스페이스 12로케일. `not-found.js`는 본문이 이미 `data-cd-trans`로 로케일 대응돼 있어 손대지 않음.
11. **PR #896** `fix/points-client-alt-aria-locale` — Wave 7 착수: `PointsClient.tsx` alt/aria-label 6건 현지화(기존 `PointsPageCopy` 타입 확장).
12. **PR #897** `fix/sukuyo-compat-alt-aria-locale` — Wave 7: `SukuyoCompatibilityAiClient.tsx` aria-label 17건 — 파일 로컬 `useSukuyoCompatCopy()` 훅 신규 도입(10개 하위 컴포넌트에 배선).
13. **PR #899** `fix/newyear-ai-alt-aria-locale` — Wave 7: `NewYearAiClient.tsx` aria-label 15건 — 동일 패턴의 `useNewYearAiCopy()` 훅(6개 하위 컴포넌트 + 메인 컴포넌트 배선).
14. **PR #900** `fix/sukuyo-calendar-alt-aria-locale` — Wave 7: `SukuyoCalendarClient.tsx` aria-label/title 13건(사전 감사가 놓친 템플릿 리터럴 title 1건 포함) — `useSukuyoCalendarCopy()` 훅.
15. **PR #901** `fix/island-consult-alt-aria-locale` — Wave 7: `IslandConsultClient.tsx` alt/aria-label 12건 — `useIslandConsultCopy()` 훅(궁 카드 라벨은 `palaceCardAria(name, title)` 템플릿 함수).
16. **PR #902** `fix/astrology-ai-result-alt-aria-locale` — Wave 7: `AstrologyAiResultClient.tsx` 커스텀 컴포넌트 title prop 14건(사전 감사 추산 10건보다 많음 — `coreCards` 배열 경유 라벨 4건을 속성 패턴 grep이 놓쳤었다) — `useAstrologyResultCopy()` 훅.
17. **PR #904** `fix/fortune-chat-alt-aria-locale` — Wave 7: `FortuneChatClient.tsx` aria-label 8건 — `useFortuneChatCopy()` 훅.
18. **PR #906** `fix/numerology-tarot-alt-aria-locale` — Wave 7: `NumerologyTarotClient.tsx` alt/aria-label 9건(사전 감사 추산 7건보다 많음 — 카드 슬롯 라벨이 뽑기 전/후 2가지 템플릿으로 갈라짐) — `useNumerologyTarotCopy()` 훅(`cardPickedAria(order)`/`cardSlotAria(slot)` 템플릿 함수).
19. **PR #907** `fix/guardian-fortune-share-alt-aria-locale` — Wave 7: `GuardianFortuneShareClient.tsx` alt/aria/title 8건(사전 감사 추산 6건보다 많음 — 캐릭터 alt 2건이 `MODE_COPY` 객체 리터럴 안에 있었다) — `useGuardianShareCopy()` 훅. `MODE_COPY.alt` 필드는 제거하고 렌더 지점에서 로케일 카피로 대체.
20. **PR #908** `fix/ziwei-ai-alt-aria-locale` — Wave 7: `ZiweiAiClient.tsx` aria-label 6건 — `useZiweiAiCopy()` 훅(`cycleAria(range, palaceName, isCurrent)` 템플릿 함수, `MajorLuckTimeline` 서브컴포넌트의 조기 반환보다 앞에 훅 배치).
21. **PR #909** `fix/result-action-dock-alt-aria-locale` — 🔴 **스코프 확대 첫 사례**: `ResultActionDock.tsx` 18건 — aria-label 7건뿐 아니라 버튼 라벨·토스트 메시지·`navigator.share()` title/text 까지 화면에 보이는 모든 문자열 포함(사용자의 "한국어 완전 무혼입" 요구에 따름). 이후 Wave 7 파일은 전부 이 확대된 스코프로 처리한다.
22. **PR #911** `fix/life-book-client-locale` — `LifeBookAiClient.tsx`(입력 폼) 약 50건 전체 시각적 문구 — `payload.locale` 하드코딩 "ko" 도 `detectLocale()`로 교체(라이브 버그는 아니었으나 부정확했음). `lifeBookCopy.ts` 공유 상수는 별도 파일이라 제외.
23. **PR #912** `fix/love-secret-client-locale` — `LoveSecretAiClient.tsx`(입력 마법사 폼) 약 65건 — 같은 `locale: "ko"` 하드코딩 패턴 발견·수정. `PersonFields`는 문자열 이어붙이기 라벨을 `variant: "me"|"partner"` + 완전 조합 문자열로 재설계(어순이 다른 언어 대응). 🔴 이 파일 하나에 세션 예산의 상당 부분이 소모됨 — 입력 폼/마법사류 파일은 계속 이 정도 규모로 예상할 것.
24. **PR #913** `fix/astrology-ai-client-locale` — `AstrologyAiClient.tsx`(점성술 전문가 상담 입력 폼) 122건 — 히어로/4개 폼 섹션/제출·초기화/사이드바 진행상황·대기실/`SummaryCard`/에러·재시도까지 전부. `TOPICS`(14개 주제)·`PLACE_PRESETS`(9개 도시)는 `form.topic`/`form.city` 등 서버 페이로드 값이라 한국어 그대로 유지하고 표시만 `copy.topicLabel`/`copy.placePresetLabel` 조회로 분리(회귀 위험 없음). 별자리 사인 이름(`point.signKo`)은 서버 응답값이라 범위 밖.
27. **PR #916** `fix/fusion-fortune-client-locale` — `FusionFortuneClient.tsx`(초융합 운세, 여섯 체계 교차 판정) 181건 — 이번 세션 최대 규모 + 결제/SSE 스트리밍 민감 파일. 히어로/여섯 체계 순서 스트립/입력 폼/SSE 진행 대화(단계 말풍선·묶음 진행률·무음 감시)/PDF 저장/Fusion Core 다이얼로그까지 전부. **모든 수정은 문자열 리터럴 치환뿐 — 멱등 결제(`sessionStorage`의 `requestId`)·재시도·SSE 제어 흐름은 전혀 안 건드림.** `DEFAULT_BIRTH_PLACES.label`(그대로 `birthPlace.city` 페이로드)과 `form.topic`의 4개 값(오늘의 귀인 핸드오프 매칭 기준이기도 함)은 유지, `<select>`에 명시적 `value=`를 붙여 표시만 분리. 번역 중 "오늘의 귀인이 남긴 **{topic}** 주제만..." 문장에서 실제 topic 보간을 놓칠 뻔한 걸 prefix/suffix 필드 분리로 바로잡음(자체 발견·자체 수정). `__tests__/ui/fusion-fortune.static.test.js`의 리터럴 `aria-label="..."` 소스 패턴 assertion 1개를 `copy.threadAriaLabel` 구조에 맞게 갱신(18/18 통과). 🔴 **부수 발견(미수정)**: `guardianHandoff.topic` 상태가 사람이 읽는 라벨이 아니라 원시 카테고리 키("love"/"money_work"/"decision" 등)를 담고 있어, 인계 안내 문구의 굵은 글씨 부분이 실제로는 영문 내부 키를 그대로 노출한다("연이가 남긴 **money_work** 주제만..." 처럼 보일 수 있음) — 한국어 사용자에게도 동일하게 나타나는 i18n과 무관한 기존 버그라 이번 PR 범위에서 고치지 않음(별도 이슈로 남김).
28. **PR #914** `fix/karma-destiny-client-locale` — `KarmaDestinyAiClient.tsx`(운명의 업 전문가 상담) 164건 — 히어로·오라클/Premium Karma Report 카드 7종/입력 폼/12종 에러 메시지/상담 카드·렌즈 요약/로딩 화면 6단계/PDF 결과 모달까지 전부. `FOCUS_AREA_OPTIONS`·`PLACE_PRESETS`(city/country 이미 영문)는 페이로드 값이라 유지, 표시만 `copy.focusAreaLabel`/`copy.placePresetLabel` 분리. 같은 `locale: "ko"` 하드코딩 버그 발견·수정(`detectLocale()`). `KARMA_SECTION_SYMBOLS`(業源流課... 한자 심볼)는 로케일 무관 디자인 모티프로 유지, **폴백 제목**(원시 LLM 텍스트 헤딩 파싱 실패 시에만 쓰는 대체 문구)만 12로케일 번역 — 파싱 로직은 손대지 않음. PDF 파일명·푸터의 `ko-KR` 날짜 포맷 2곳은 핸드오프 항목 7로 이관.
33. **PR #925** `fix/today-hub-client-locale` — `TodayHubClient.tsx`(`/today` 오늘의 운세 허브, 탭 전환·판정 배지·카드 패널·공유 시트·프로필 유도·더 깊게 보기) 약 30건. `TABS`/`DEEPER_LINKS`의 하드코딩 `label`/`blurb`/`title`/`desc`를 `TAB_KEYS`(key+emoji만) + `copy.tabLabel`/`tabBlurb`/`deeperLinkTitle`/`deeperLinkDesc`로 분리(서버 응답 인덱싱용 `TodaySystem` 키는 불변). `SystemCard`의 `headline`/`body`/`detail`/`highlights` 등은 `/api/fortune/today-hub` 서버 응답값이라 AI/엔진 콘텐츠와 같은 범주로 손대지 않음. `formatKstDate()`의 하드코딩 요일명·"년/월/일/요일"(Intl 없이 손으로 짠 날짜 포맷)은 항목 7로 이관. 🔴 **배포 게이트 확인**: 이 파일 최상단 주석이 "/today AdSense 텍스트-하한 게이트는 `children`으로 들어오는 서버 렌더 콘텐츠가 지탱하고 카드는 한 글자도 안 센다"고 명시 — `app/page.js`와 달리 이 파일의 UI 텍스트 번역은 그 게이트와 무관함을 직접 확인 후 진행. 이 파일 소스를 직접 참조하는 테스트 없어 lint+typecheck로만 검증.
32. **PR #924** `fix/vedic-ai-client-locale` — `VedicAiClient.tsx`(베다 점성술 전문가 상담, 입력 폼+결과 화면) 약 210건 — 이번 세션 최대 규모(FusionFortuneClient #916 181건을 넘어섬). 히어로/폼 패널/코스모스 로딩 화면 6단계/에러 14종·알림·결제 게이트 메시지/차트 상세 테이블(라그나·라시·그라하·바바·나크샤트라·다샤·빈쇼타리)/구조화 결과(메달리온·점수판·PDF)/빈 상태/채팅 목록까지 전부. `FOCUS_OPTIONS`/`TIMEZONE_OPTIONS`는 `FOCUS_VALUES`/`TIMEZONE_VALUES` + `copy.*Label[value]`로 분리(상태값 불변). 4번째로 발견된 같은 `locale: "ko"` 하드코딩 버그 수정. `planetRows()`의 `PLANET_LABELS` 한국어 폴백(서버 `nameKo` 없을 때 그라하 테이블에 노출)도 `copy.grahaLabel` 우선으로 고쳐 헤더-셀 불일치를 막음. `splitAssistantSections(content, copy?)`는 `copy` 옵셔널 유지 — 유일한 외부 호출부 `VedicAiResultClient.tsx`(별도 파일, 미착수) 는 기존 무인자 호출 그대로 한국어 폴백을 받음(동작 변화 없음). `getGrahaMeta()`/`GrahaNatureDot()`(PR #923 이 옵셔널 `copy` 로 확장한 `VedicChartVisuals.tsx` 소유 함수)는 이 파일의 `copy`(다른 타입)를 넘기지 않아 다샤 배너의 그라하명은 당분간 한국어로 남음(문서화됨, `VedicAiClient.tsx` 자체 정리 시 통합 가능). `PLACE_PRESETS`(datalist value 겸용이라 표시/값 분리 불가)와 `SECTION_TITLES`/`ORDERED_SECTION_KEYS`(구조화 실패 옛 상담문 한국어 헤딩 파싱 앵커, PR #914/#915 전례와 동일 판단)는 의도적으로 유지. 이 파일을 참조하는 정적 테스트 2개(`mobile-pricing-source`, `internal-link-trailing-slash`) 8/8 통과. `config/payment-freeze.json` 미등재 확인.
    - 🔴 **이로써 "4건" 그룹(우선순위 표) 전체 완료** — `LifeBookAiClient`(#911)·`LoveSecretAiClient`(#912)·`AstrologyAiClient`(#913)·`LockScreenFortuneClient`(#921)·`VedicChartVisuals`(#923)·`VedicAiClient`(#924) 모두 처리, `nakshatra/codex/[index]/page.tsx`는 Wave 9 재분류, `app/page.js`는 영구 제외.
31. **PR #923** `fix/vedic-chart-visuals-locale` — `VedicChartVisuals.tsx`(북인도식 라시 차트/다샤 타임라인/다샤 진행률 링, `app/vedic-ai`) — 섹션 헤더·힌트·aria-label·폴백 문구 전부. `getGrahaMeta()`/`GrahaNatureDot()`는 아직 미착수인 `VedicAiClient.tsx`가 직접 import 해 쓰므로, `copy`를 **옵셔널 파라미터**로만 추가해 그 파일의 기존 무인자 호출은 그대로 한국어 `GRAHA_KO`/`NATURE_LABEL` 로 폴백(동작 변화 없음) — `getGrahaMeta()` 반환 타입에 로케일 인지형 `label` 필드를 새로 얹고 기존 `ko` 필드(항상 한국어)는 유지. `GRAHA_SHORT`(하우스 내 1글자 약어)는 서버가 이미 한국어로 내려준 그라하명을 위한 데이터 기반 폴백으로 그대로 두고, 9개 영문 행성 키만 `copy.grahaShortLabel`이 우선하도록 함. 사소한 변화: 다샤 타임라인 선택 구간 문구의 부분 굵게(`<strong>`)를 12로케일 어순 차이 때문에 통합 문자열로 평탄화(스타일만, 정보 손실 없음). 이 컴포넌트를 검증하는 기존 테스트 없어 lint+typecheck(프로젝트 전체, `VedicAiClient.tsx` 기존 호출부 컴파일 확인 포함)로만 검증(미검증으로 명시).
30. **PR #921** `fix/lock-screen-fortune-client-locale` — `LockScreenFortuneClient.tsx`(네이티브 앱 잠금화면 위젯, `isMobileAppRuntime()` 가드) 약 50건 — 설정 시트/알림/테마 선택(캐릭터·버튼 질감·글자색·배경)/오늘의 운세 카드/시퀀스 카드/밀어서 잠금 해제까지 전부. `PIG_POSES`/`FONT_COLORS`/`BACKGROUNDS`/`BUTTON_STYLES` 옵션 상수의 `label` 필드를 제거하고 기존 `key`로 조회하는 `copy.*Label[key]`로 분리(상태 변경 없음). `DEFAULT_STATE`를 `buildDefaultState(copy)`로 바꿔 신규 설치 시 기본 알림 2건의 라벨이 로케일을 따라가도록 함(`mergeState`/`loadState`에 `copy` 파라미터 추가) — 한 번 저장된 라벨은 이후 언어 전환에 재번역 안 됨(신규 회귀 아님, 이 앱의 다른 1회성 기본 상태와 동일 성격). `toLocaleDateString`/`toLocaleTimeString` 의 `ko-KR`은 항목 7로 이관. `lib/lock-screen-content`·`lib/lock-screen-daily-fortune`발 라벨(운세 시스템·확언 분야명)은 공유 데이터 모듈이라 범위 밖. 이 파일을 검증하는 기존 테스트 없어 lint+typecheck로만 검증(미검증으로 명시).
    - 🔴 **착수 전 발견·의도적 스킵**: 같은 4건 그룹의 `nakshatra/codex/[index]/page.tsx`는 서버 컴포넌트(SSG, `generateStaticParams` 27페이지)이고 "4건" 카운트가 잡은 건 커스텀 `<Section title="...">` 4곳뿐 — 실제로는 본문 전체(각 나크샤트라·숙요 조합별 고유 해설 산문)가 한국어 장문 콘텐츠라 UI 문자열 배선이 아니라 진짜 신규 번역 콘텐츠 작성이 필요하다. 클라이언트 로케일 훅이 아예 없고, 사이트 공용 자동 복구 패스(`LocaleRuntimeBridge.tsx`→`repairUnmarkedKoreanText`)도 `ko.json` 역인덱스 완전일치 기반이라 이 페이지의 매 인덱스마다 달라지는 산문은 복구 못 한다(확인 완료). 4건짜리 title만 번역하면 사실상 화면은 여전히 100% 한국어라 "완료"로 보고하는 게 오히려 오도. 이미 핸드오프 문서 Wave 9(hreflang/장문 콘텐츠 확장, 사용자 명시 요청 시에만 착수)가 정확히 이 범주를 커버하고 있어 같은 원칙을 적용해 스킵했다 — Wave 7 완료 목록에 넣지 않음, 별도 트랙(Wave 9)에 남겨둠.
29. **PR #919** `fix/reviews-client-locale` — `ReviewsClient.tsx`(`/reviews`, 실시간 사용자 리뷰 목록 + 작성 다이얼로그) 약 45건 — 헤더/평점 요약/필터/리뷰 카드/빈 상태·에러/작성 다이얼로그(자격 확인 상태·별점 선택·폼 필드·검증 및 제출 메시지) 전부. `SORT_OPTIONS`(정렬 라벨)를 `SORT_KEYS` + `copy.sortLabels`로 분리 — API 정렬 파라미터로 쓰이는 `SortKey` 값 자체는 변경 없음. `locale: "ko"` 하드코딩 페이로드 버그는 이 파일에 없음(이 컴포넌트는 AI 상담 입력 폼이 아니라 순수 CRUD 리뷰 페이지라 그런 필드 자체가 없음). `summary.total.toLocaleString("ko-KR")` 숫자 포맷은 항목 7로 이관, 손대지 않음. 이 파일을 검증하는 기존 테스트가 없어 lint+typecheck로만 검증(미검증으로 명시).
26. **PR #915** `fix/premium-sales-content-locale` — `PremiumSalesContent.tsx`(인생 총운 전문가 상담, `/premium-unlock`) 101건 — 히어로·폼/결제 게이트 문구/5종 검증 메시지/로딩 6단계/결과 문서(핵심요약·장·전문가 판독)/PDF 저장까지 전부. `TOPIC`("전체 인생 총운")은 화면에 노출되지 않는 페이로드 값이라 유지. 세 번째로 발견된 같은 `locale: "ko"` 하드코딩 버그 수정. `splitMarkdownChapters`의 `제N장` 헤딩 감지 정규식(한국어 전용 파싱 로직)은 그대로 두고 **폴백 장 제목**만 12로케일 번역(카르마 목적지 PR #914의 `KARMA_SECTION_SYMBOLS` 처리와 동일 판단). 이 파일을 직접 참조하는 기존 테스트가 없어 lint+typecheck로만 검증(미검증으로 명시).
34. **PR #974** `chore/master-love-codex-i18n` — `src/features/master-love-codex/`(`app/` 밖 별도 최상위 트리, 30개 파일) 22개 파일 UI 크롬 배선 + `masterLoveCodexBilling()` 로케일 무관 한국어 제목 고정 버그 수정. 상세는 위 "`master-love-codex`" 절 참고.
35. **PR #975** `chore/maya-i18n` — `src/components/maya/`(3개 파일) 히어로/날짜 선택기/월간 그리드/요약 카드/AI 프롬프트 생성기 UI 크롬 배선. 상세는 위 "`maya`" 절 참고.
36. **PR #976** `chore/tarot-healing-core-i18n` — `app/components/SunHealingTarot.tsx`(913줄, PR #963이 놓친 실제 라이브 컴포넌트) UI 크롬 배선. 상세는 위 "`tarot/healing`(실제 구현)" 절 참고.
37. **PR #977** `fix/nakshatra-premium-gate-featurekey` — i18n 작업이 아니라 **`Paid Flow Gates` 오탐 수정**. PR #937이 `verify-nakshatra-premium.mjs`의 리터럴-grep 단언 2건을 깨뜨린 것을 복구. 상세는 위 "`Paid Flow Gates`가 '번역만 한 PR'에서도 실패하는 이유" 절 참고.
38. **PR #978** `chore/destiny-meeting-place-i18n` — `app/saju/destiny-meeting-place/`(유료 1회 분석 기능, route-fallback 패턴) 실제 구현 `DestinyMeetingPlacePage.tsx`+`DestinyMeetingPlaceLoading.tsx`. 상세는 아래 "`destiny-meeting-place`" 절 참고.
39. **PR #979** `fix/fortune-tomorrow-date-manifest-race` — i18n 아님, **릴리즈 실패 원인 3번째 발견·수정**. `fortune-build-data.mjs`(prebuild)와 `lib/fortune/daily-data.ts`(render)가 KST 날짜를 각자 다시 계산해 자정 경계에서 어긋나던 것을 매니페스트 공유로 수정. 상세는 위 "PR #977 머지하면 릴리즈 실패가 끝나냐" 절 참고.
40. **PR #981** `chore/neo-operation-room-dialogue-i18n` — `src/features/neo-war-room/`(4,600줄+, `app/` 밖 최상위 트리) 캐릭터 "네오"의 대사 시스템 전체(69키 대사 표+랜딩+VN 프롤로그+히어로 헤더) 완결. 폼/버튼/결과 화면은 후속 PR로 남김. 상세는 위 "`neo-operation-room`" 절 참고.
41. **PR #982** `chore/neo-operation-room-method-registry-i18n`(🔴 **#981 위에 스택 — #981을 먼저 머지할 것**, 같은 파일을 건드림) — "01 분석 방식 선택" 섹션(4개 방식 카드) 완결. `method-registry.ts`의 화면 렌더 필드 5개(죽은 필드 6개는 제외, `git grep`으로 확인) + `methodCardCopy`+섹션 제목+이미지 alt까지 카드 하나 안에서 형제 필드가 섞이지 않게 함께 번역.
42. **PR #983** `fix/ko-kr-date-number-format-hardcodes` — 핸드오프 항목 7("날짜/숫자 포맷 ko-KR 하드코딩") 12개 파일 처리 + `LoveRelationshipTarot.tsx`의 미지원 로케일 ko 폴백 버그 발견·수정. 상세는 위 항목 7 참고.
43. **PR #986** `chore/neo-operation-room-input-flow-i18n`(🔴 **#982 위에 스택**, 같은 파일을 건드림) — 입력 마법사(02~05 섹션+발사확인+상태/에러/준비완료 패널)와 `NeoOperationRoomPage.tsx` 안의 결과 패널 3종(브리핑/현실점검/수정명령서의 정적 라벨) 완결 + `input-flow.ts` 검증 메시지 + 결제 게이트 오버레이가 이 기능에서만 한국어로 덮어써지던 실버그 수정. 상세는 위 "`neo-operation-room`" 절 참고.
44. **PR #987** `chore/neo-operation-room-result-page-i18n`(🔴 **#986 위에 스택**) — 별도 파일 `NeoOperationRoomResultPage.tsx`(1,512줄, `/neo-operation-room/result` 라우트) 완결. `neo-operation-room` 클러스터 전체(입력+결과 화면 양쪽) 완료. **🔴 머지 순서는 #987 → #986 → #982 → #981**(자식 먼저 — 아래 "이전 세션이 놓친 것" 참고, #981만 먼저 머지하면 `Landing order` CI가 막는다). 상세는 위 "`neo-operation-room`" 절 참고.

🔴 **비용 재평가(2026-08-21, PR #911/#912 이후)**: "AI 상담 입력 폼" 유형 파일(life-book-ai, love-secret-ai 등)은 한 파일에 60~90개 문구 × 12개 언어가 들어 있어, 파일 하나당 세션 토큰 예산의 상당 비율을 쓴다. `astrology-ai/AstrologyAiClient.tsx`(918줄, 실측 122건)를 포함해 남은 70개 파일 중 다수가 같은 "입력 폼" 계열로 보인다 — 전부 이 수준으로 처리하면 이번 세션 예산을 크게 넘어설 수 있다. 사용자가 이미 "현재 수준 그대로 계속"을 확정했으므로 계속 진행하되, 만약 세션이 여기서 중단되면 다음 세션은 **이 문서를 그대로 이어받아 재개**할 것(모든 파일이 이미 검증된 동일 패턴 — 파일 로컬 Copy 타입 + `getCurrentLoadingLocale()`/`languagechange` 훅 + 12로케일 번역 + 모듈 레벨 함수는 `copy` 파라미터로 스레딩).

## 🔴 2026-08-21 규모 재평가 — 확대된 스코프의 실제 비용

PR #909부터 스코프를 "접근성 속성"에서 "화면에 보이는 모든 하드코딩 한국어"로 넓힌 뒤 처리한 3개 파일(#909 18건, #910 37건, #911 약 50건)의 실측 결과: **파일 하나당 번역 대상이 아리아 전용 스코프의 3~10배로 늘었다.** `LifeBookAiClient.tsx` 한 파일에 큰 작업량이 들었다 — 모듈 레벨 상수 재구조화(FOCUS_OPTIONS/MODE_OPTIONS 등을 훅 기반 카피로 전환), 훅 없는 헬퍼 함수에 `copy` 파라미터 threading, 결제 게이트 title/message 발견 등 부수 작업이 매번 새로 생겼다.

**남은 71개 파일 중 상당수가 비슷한 "입력 폼" 또는 "결과 페이지" 유형이라 유사한 규모가 예상된다.** 사전 감사가 셌던 "N건"은 alt/aria/title만 카운트한 것이라, 확대된 스코프에서는 실제 작업량을 과소 추정한다(이 3개 파일 모두 실측이 사전 추산보다 3배 이상 많았다). 이 페이스로는 71개 파일 전부를 한 세션에서 끝내는 것은 현실적이지 않다 — 다음 세션은 반드시 이 문서에서 이어받아야 하고, "전부 끝났다"고 보고하지 않는다.
22. **PR #910** `fix/love-secret-result-alt-aria-locale` — `LoveSecretAiResultClient.tsx` UI 문구 37건(로딩/에러·버튼·헤딩·이름 폴백·접기/펼치기 등) — AI 콘텐츠 결합 파싱 로직·사주 전문용어·날짜 포맷·`group.spec.label`은 의도적으로 제외(아래 "AI 로케일" 섹션과 항목 7 참고).

## 🔴🔴 2026-08-21 핵심 발견 — AI 응답 언어 파이프는 이미 완성·머지돼 있다

Wave 7 도중 `LoveSecretAiResultClient.tsx`를 열다가 "AI가 생성한 상담 본문 자체가 로케일 무관하게 한국어로 나오는 것 아닌가" 하는 의심이 들어 조사했다. **결론: 이미 해결돼 있다.**

- 어제(2026-08-20) 커밋 `4ed86ca7a` `"feat(ai): write the reading in the language the reader chose, all twelve"`(작성자 네오, `main`에 머지됨)가 `AI_OUTPUT_LOCALES`를 5개(ko/en/ja/zh-CN/zh-TW)에서 **12개 전부**로 확장하고, 각 로케일의 프롬프트 지시문·리크가드 오탐(예: `/\bAI\b/i`가 프랑스어 "J'ai"·베트남어 "Ai"를 반려하던 문제)까지 함께 고쳤다.
- 구조: `worker/index.js`의 `createLazyRouteHandler`가 **모든** 라우트 핸들러를 `runWithAiLocale(resolveAiLocaleFromRequest(...))`로 감싸 앰비언트 로케일을 세팅하고, `lib/llm-client.ts`의 `applyOutputLocale()`이 **모든** `callGeminiText`/`callLLM`/`callGeminiJson` 호출에 자동으로 응답-언어 지시문을 주입한다. **라우트별 배선이 필요 없는 파이프 레벨 해결책**이라, 이 커밋 자체는 `worker/routes/*.js` 개별 파일을 전혀 건드리지 않았다(공유 인프라만 고쳤는데 전 라우트가 혜택을 받는 구조).
- `node scripts/verify-ai-locale-pipeline.mjs` — 14개 불변식, `callGeminiText\|callLLM\|callGeminiJson`을 쓰는 워커 파일을 git grep으로 전수 발견(20개 이상)해 검사 — **통과 확인(2026-08-21)**.
- `love-secret-ai.js`가 `callGeminiText`/`callGeminiJsonWithRetry`를 통해 이 파이프를 그대로 타는 것도 직접 확인했다.
- **유일한 미검증 항목은 커밋 메시지가 스스로 명시**: "모델이 실제로 지시를 따르는지"는 과금 실호출 없이는 잴 수 없다 — 문서화된 한계이지 빠뜨린 작업이 아니다.

**남은 것은 훨씬 좁다** — "한국어가 새는" 문제가 아니라, 일부 클라이언트 컴포넌트(`LoveSecretAiResultClient.tsx` 등)가 **원시 LLM 텍스트를 한국어 키워드 정규식으로 파싱**해 섹션 제목·난이도 라벨을 추출하는 로직을 갖고 있어, 비-ko 응답에서 이 파싱이 실패하면 **포맷이 깨질 수 있다**(한국어가 보이는 게 아니라 헤딩·배지가 빠지는 식). 이건 "Korean 누출"과는 다른 종류의 결함이고, Wave 7과 별개로 각 AI 결과 페이지를 열 때마다 가볍게 확인하며 넘어가면 된다 — 전수 감사가 필요하면 별도로 판단할 것.

**다음 세션 시사점**: 새 AI 상담 라우트를 추가할 때 표준 `callGeminiText`/`callLLM`/`callGeminiJson` 래퍼를 쓰기만 하면 로케일 배선은 자동이다. 라우트 안에서 직접 `fetch`로 Gemini/Workers AI를 부르는 우회 경로가 있다면 그건 이 파이프를 안 타므로 별도 확인이 필요하다(전수 확인은 안 함 — `verify:ai-locale-pipeline`의 (10)이 이걸 이미 자동으로 잡아준다).

## 🔴 중요한 궤도 수정 — "ko.json 미번역 2053개 키"는 대부분 실제 버그가 아니다

1차 세션 조사에서 "`verify-i18n-ko-coverage.mjs` 기준 ko.json이 2053개 키 누락(65% 커버리지)"을 "번역 완결성 갭"으로 분류했었다. **2차 세션에서 실측으로 확인한 결과 이 판단은 틀렸다.** 표본 검증:

- `payment.*` 98개 중 예시로 `payment.overlay.clean.pass.title`을 실제 호출부(`index.html:27388` 근처 `_cdPaymentI18n(prefix + '.payment.title', '한국어 폴백')`)에서 확인한 결과, **호출부 자체가 한국어 리터럴 폴백을 인자로 갖고 있다** — ko 사용자는 애초에 사전을 안 거치고 이 폴백을 그대로 본다. `ja.json`/`zh-cn.json` 등 11개 비-ko 파일은 `verify-i18n-public-parity.mjs`가 이미 en.json과 키 집합 100% 일치를 보장하므로 이 키들의 번역은 **이미 존재하고 정상 작동 중**이다.
- `terms.*`(34)/`branches.*`(36)는 애초에 **키 자체가 한글**이다(`terms.사주`, `branches.자수.label` 등 — 사주 용어 용어집). ko는 자기 용어를 자기 언어로 찾아볼 필요가 없어 구조적으로 빠지는 게 정상이다.
- `node scripts/i18n-key-usage.mjs` 실행 결과 사전 키 5862개 중 **1052개(17.9%)가 어디서도 참조되지 않는 orphan**이다(`payment.overlay` 87개, `premiumPdf.*` 합계 300개 이상, `home.tiles` 53개 등). "missing" 목록에 이 orphan들이 다수 섞여 있어, 채워 넣어도 아무 화면에도 안 나오는 죽은 번역을 쓰는 낭비가 된다.

**결론**: `verify-i18n-ko-coverage.mjs`의 기준선(3508/5862, ratchet)은 "ko.json이 이 정도는 채워져 있어야 한다"는 목표가 아니라 "이 아래로 떨어지면 안 된다"는 하한선일 뿐이고, 실제로 코드가 요구하는 완성도는 이미 충족돼 있다(fallback-argument 패턴 덕분). **이 숫자를 근거로 "번역이 65%만 됐다"고 사용자에게 보고하거나 그걸 메우려고 대량 번역 작업을 벌이지 말 것.**

### 그럼 진짜 갭은 어디에 있나

`useT()` 기반 컴포넌트(이번 세션에 새로 배선한 것들 포함: `WithdrawModal.jsx`, `AccountDeleteActions.tsx`, `PasswordChangeClient.tsx`, `PhoneChangeClient.tsx`, `error.tsx`, `global-error.tsx`, 그리고 기존 `AuthShell.tsx` 등)는 **인라인 한국어 폴백이 없다** — `ko.json`에 키가 없으면 ko 사용자도 `MISSING_TEXT.ko`("번역 준비 중"류 플레이스홀더)를 본다. 즉 **"missing ko key"가 진짜 버그가 되는 유일한 경우는 `useT()`를 직접 쓰는 컴포넌트뿐이다.**

다음 세션이 Wave 6을 재개한다면:
1. `node scripts/i18n-key-usage.mjs`로 orphan 키부터 걸러낸다(번역 대상에서 제외).
2. 남은 키 중 `git grep -n "useT(" app/`로 `useT()`를 실제로 쓰는 컴포넌트를 전수 찾고, 그 컴포넌트가 참조하는 키 중 `ko.json`에 없는 것만 진짜 버그로 취급한다.
3. `cdTranslate`/`_cdPaymentI18n`(인라인 폴백 패턴) 경유 키는 "이미 작동 중"으로 분류하고, 폴백 제거(=완전한 사전 이전)는 **번역 완결성이 아니라 `no-fallback` 기술부채 상환** 작업으로 별도 트래킹한다(`verify-i18n-no-fallback.mjs`의 B수치, 현재 기준선 대비 +11 초과 상태 — 원인 미추적, 아래 "남은 것 4" 참고).

## ✅ 2026-08-23 `neo-operation-room`(`src/features/neo-war-room/`) — 클러스터 전체 완료(4개 PR: #981/#982/#986/#987)

`app/neo-operation-room` 라이브 라우트(+ `/neo-operation-room/result`)의 실제 구현이 `app/` 밖 `src/features/neo-war-room/`에 있다(master-love-codex/maya 와 같은 "app/ 밖 별도 최상위 트리" 패턴). 로케일 인프라 전무 상태에서 시작.

- **규모**: `NeoOperationRoomPage.tsx` 3,127줄(한국어 매칭 410줄) + `NeoOperationRoomResultPage.tsx` 1,512줄(243줄) — 이번 세션에서 만난 어떤 파일보다 크다(`PalmDestinyMain.tsx` 3,839줄에 근접).
- `data/dialogues.ts`가 `@/lib/cms/build-text`의 `cmsText()`를 쓴다 — 이 세션 다른 클러스터가 쓰던 `getCurrentLoadingLocale()`+로컬 `copy` 테이블과 **다른 아키텍처**(관리자 CMS 오버라이드 가능한 캐릭터 대사 시스템). **판정: cmsText는 로케일을 전혀 모르는 build-time 전용 함수**(`app/_content/cms.generated.json`에서 값을 읽어 로케일 무관 단일 문자열 반환) — CMS 오버라이드(ko 전용)와 다국어 번역은 별개 레이어라, `dialogue()`가 반환한 `text`(=cmsText 결과)를 **밖에서 한 겹 더 감싸** 로케일별 표를 조회하는 방식(ko 이거나 표에 없으면 원래 text 그대로)으로 안전하게 합성했다 — `dialogue()`/`cmsText()` 자체는 전혀 안 건드림.
- **PR #981로 완료**: `dialogues.ts`의 `dialogue()` 스캐폴드 56키 + 컴포넌트 로컬 `methodIntroDialogues` 13키(총 69) 전부 en/ja/zh-CN/zh-TW 실번역 + EN 폴백. 여기에 더해, "네오 대사 위젯"이라는 하나의 완결된 화면 단위 전체(랜딩 히어로 대사 8줄·VN 프롤로그 컷신 20항목[중첩 notification/cta 포함]·히어로 타이틀/서브타이틀/엔트리 브리핑·캐릭터 초상 aria-label 7종·스킵/다음/프롤로그 버튼)까지 확장해서 마무리했다 — "대사만 번역하고 주변 라벨은 한국어"로 두면 오히려 뒤섞인 경험이 되므로, 위젯 하나를 완결 단위로 잡았다(경계 판단 상세는 PR #981 본문 참고).
- 🔴 **자체 발견·수정한 버그**: 위 로케일-폴백 헬퍼 6개를 처음 짤 때 "표에 없는 로케일 → 한국어 원문"으로 새고 있었다(vi/hi/es/fr/de/nl/ms 방문자가 대사만 한국어를 받는 상황) — 이 세션에서 사용자가 재확인한 "번역 없으면 영어로" 원칙 위반이라 전부 "표에 없으면 en, en도 없으면만 ko" 순서로 고쳐서 커밋했다. 이런 새 로케일-폴백 헬퍼를 만들 때는 매번 **vi/hi 같은 미지원 로케일로 직접 호출해 en이 나오는지 확인**할 것 — ko로 새는 게 기본값이 되기 쉽다(원본 텍스트가 ko라서).
- **PR #982로 완료(#981 위에 스택)**: "01 분석 방식 선택" 섹션(방식 레지스트리 5개 렌더 필드 + `methodCardCopy` + 섹션 제목 + alt) 완결. `data/method-registry.ts`에 `getLocalizedNeoWarRoomMethodRegistry(locale)` 신규.
- **PR #986으로 완료(#982 위에 스택)** — 나머지 전부를 하나의 PR로 통째 처리(아래 이유대로 실제로 쪼갤 수 없었다):
  - 입력 마법사: "02 상담 주제 선택"~"05 질문 입력" 4개 섹션 + 출생정보 폼(라벨 7개·플레이스홀더·select 옵션 8개·체크박스) + 발사확인 블록(요약 3필드+CTA 4상태+힌트) + 검증/에러/상태/준비완료 패널 + "사자 휘장 특전" 마케팅 블록 + `commandFlowSteps`(진행 레일 6라벨)/`commandStepHint`(7분기 안내문, 새로 발견됨 — 이전 조사에서 놓쳤던 부분).
  - 결과 화면: 브리핑 패널(약 215줄, AI 생성 콘텐츠의 정적 폴백 라벨만), 현실 점검 패널(제목/부제/프리셋 답변 7개/자유서술 라벨), 2차 수정 작전 명령서 패널(구체적 실행 대안/만나야 할 사람/30일 전략 등) — **AI가 실제로 생성하는 본문(`displayBriefing.*`)은 서버 산출물이라 손대지 않았고, 그 주변의 정적 라벨/폴백 타이틀만 로케일화**했다(다른 클러스터의 "엔진 출력은 유지, 라벨만 로케일화" 전례와 동일 방향 — AI 콘텐츠 옆 정적 라벨을 번역하는 건 "형제 필드 뒤섞임"이 아니라 이 프로젝트 전역에서 반복돼 온 안전한 패턴이라는 걸 재확인함).
  - `input-flow.ts`의 `validateNeoWarRoomInput()`에 `locale` 파라미터(기본값 `"ko"`, 하위호환) 추가 + 9개 검증 메시지 실번역.
  - `errorCopy`/`realityCheckOptions`/`intensityOptions`/`operationMapStages` 전부 `src/features/neo-war-room/data/form-copy.ts`(신규)의 `getX(locale)` 함수로 이전 — 기존 `dialogues.ts`/`method-registry.ts`와 같은 EN-폴백 패턴.
  - `topic`(주제) 값은 여전히 내부 식별자(한국어 리터럴)로 유지 — 표시는 `getNeoTopicLabel(topic, locale)`로 분리(6곳 전부 일괄 적용). `realityCheckOptions`도 같은 이유로 값은 유지, 표시만 `getNeoRealityCheckLabel()`.
  - 🔴 **실제 버그 발견·수정**: `beginPaidFeatureGateCheck`/`completePaidFeatureGateCheck`/`failPaidFeatureGateCheck`에 하드코딩 한국어 `title`/`message`를 넘기고 있었는데, `PaymentProcessingContext.tsx`의 오버레이 렌더가 `detail.title || copy.title`(호출자 값 우선)이라 **이미 12로케일로 완결돼 있던 오버레이의 폴백 문구를 매번 무시하고 한국어로 덮어쓰고 있었다** — 전 로케일 사용자가 이 기능 결제 게이트에서만 한국어 문구를 봤다는 뜻. `getNeoPaidGateCopy(locale)`로 교체해 수정.
  - `FEATURE_TITLE`("네오의 팩폭 작전실")은 `reason:` 필드(게이트 콜백 4곳)와 발사확인 요약(렌더 1곳)에 쓰이는데, **`reason`은 오버레이 컴포넌트가 전혀 안 읽는 필드**(grep 0건 확인)라 분석/로깅용으로 판단 — 렌더되는 발사확인 요약 1곳만 `getNeoFeatureTitle(locale)`로 교체하고, 4곳의 `reason:`은 원래 한국어 상수 그대로 뒀다(이전 세션이 "얽혀서 못 고친다"고 판단했던 부분이 실은 렌더 여부 확인 부족이었음).
  - `NeoTopicBadge` 컴포넌트: 이미지 셀 위치만 계산(`getNeoTopicBadge(topic).cell`)하고 텍스트는 렌더하지 않아 번역 불필요 확인. 배지 *이름*(`getNeoTopicBadge(topic).name`)은 두 곳(브리핑/수정명령서 패널)에서 문자열로 노출돼 `getNeoTopicBadgeName(topic, locale)`로 교체.
- `data/method-registry.ts`의 `cardBody`/`requiredInputs`/`calculableData`/`llmSummaryFields`/`realityCheckStrategy`/`qualityNote`는 죽은 필드로 확인돼 번역 제외(PR #982 참고). `resultEvidenceLabel`은 PR #987에서 결과 화면 사이드패널에 실제로 렌더되는 것까지 확인됨.
- **PR #987로 완료(#986 위에 스택)** — `NeoOperationRoomResultPage.tsx`(1,512줄, 한국어 매칭 182건→81건, 남은 건 전부 dev 전용 미리보기 mock·`realityCheckOptions` 내부 식별자 배열·주석): 히어로/생성중·실패 상태 카드/사이드패널/액션바/배지 보관함, "네오의 진심 편지"(사자 휘장 5개 보상 — 조건 분기 6문단 템플릿, 클라이언트에서 조립하는 고정 산문이라 AI 호출이 아니므로 전문 번역), 현실 점검 폼, 브리핑/수정명령서 페이지드 뷰어의 탭 라벨과 정적 폴백 타이틀. AI 생성 본문(`displayBriefing.*`)은 이번에도 손대지 않음. 원래 쓰던 raw `getNeoWarRoomMethodDefinition`/`neoWarRoomMethodRegistry` 대신 로케일화된 버전으로 교체. 신규 `data/result-copy.ts`.
- **🔴 이전 세션(2026-08-22 작성)이 놓친 것 — 스택 PR 머지 순서는 자식이 먼저다**: `Landing order` CI 가드가 "부모(#981, base=main)를 먼저 머지하면 안 된다"고 명시적으로 실패시킨다(`gh pr checks 981` 확인, 2026-08-23). **올바른 순서는 #987 → #986 → #982 → #981**(가장 안쪽 자식부터 각자의 base 브랜치에 먼저 머지해 올라가고, #981 이 main 에 마지막으로 착지한다) — 이전 세션이 "머지 순서: #981 → #982 → #986"이라고 안내한 것은 틀렸다(정정 기록, 원칙 8 위반 사례). 사용자에게 안내할 때는 항상 `gh pr checks <가장 상위 PR 번호>` 로 `Landing order` 잡을 먼저 확인할 것.
- **검증(PR #987)**: `tsc`/`eslint` 클린(경고 2건 자체 수정 — 미사용 변수, `useEffect` 안에서 리액티브하지 않아야 할 클로저를 `getCurrentLoadingLocale()` 즉시 호출로 교체), `NODE_OPTIONS=--experimental-vm-modules jest __tests__/worker/neo-operation-room.{sections,payment-flow}.test.js`(16/16 통과), `node scripts/verify-neo-operation-room-{quality,output-safety}.mjs` OK, `node scripts/verify-payment-freeze.mjs`(등재 안 됨).
- **검증(PR #986)**: `tsc`/`eslint` 클린, `NODE_OPTIONS=--experimental-vm-modules jest __tests__/worker/neo-operation-room.{sections,payment-flow}.test.js`(16/16 통과, 백엔드 로직 무변경 확인), `node scripts/verify-neo-operation-room-{quality,output-safety}.mjs` OK, `node scripts/verify-paid-gate-ui-regression.mjs` PASS, `node scripts/verify-payment-freeze.mjs`(등재 안 됨, `--update` 불필요), 205건 한국어 매칭 전수 재확인(남은 건 전부 대사표 원본/dev 전용 미리보기 mock/내부 식별자 키/주석으로 확인 — 사용자 노출 누락 없음).
- **참고로 확인한 것(false positive, 손 안 댐)**: `app/tarot/crystal-soul/CrystalSoulTarotClient.jsx`(2,128줄)는 이미 완전히 5로케일 배선돼 있었다(`GEM_DISPLAY_COPY` 별도 테이블로 `src/components/crystal/CrystalGem.tsx`의 `GEM_META`를 오버라이드) — `CrystalGem.tsx` 자체의 한국어 48줄(`GEM_META.energy` 등)은 화면에 전혀 렌더링되지 않는 죽은 폴백 필드임을 확인.

## 남은 것 (우선순위 제안)

### 1. ~~계정 삭제 확인 문구~~ — 🔴 2026-08-23 재확인 결과 **이미 해결돼 있었다(이 문서가 낡아 있었음)**

`WithdrawModal.jsx`의 `WITHDRAWAL_CONFIRM_TEXT = "회원탈퇴"`는 `worker/routes/auth.js`(`confirmText !== "회원탈퇴"`)와 짝을 이루는 의도적 불변 상수라 확인 문구 자체는 여전히 한국어 고정이 맞다. 그런데 이 문서가 "그래서 서버·클라이언트를 함께 바꿔야 한다"고 적어 둔 건 틀렸다 — **의도적으로 단어를 안 바꾸는 대신, 그 단어가 한국어라는 사실과 뜻을 설명하는 안내 문구를 12개 로케일 전부에 이미 번역해 뒀다**(`public/i18n/{ko,en,ja,zh-CN,zh-TW,vi,hi,es,fr,de,nl,ms}.json`의 `withdrawModal.confirmHintPrefix`/`confirmHintSuffix`/`confirmMismatch` 실측 확인 — 예: en `Type "회원탈퇴" (Korean for "member withdrawal") in the field below.`, vi/hi/es/fr/de/nl/ms도 전부 같은 패턴으로 실번역돼 있음, 자동 폴백이 아니라 12개 파일에 각각 실제로 쓰여 있다). 서버는 항상 같은 한국어 문자열 하나만 검증하면 되므로 로케일별 단어 표를 만들 필요도 없다 — **이게 오히려 더 안전한 설계**(서버-클라이언트가 검증하는 값이 로케일 무관하게 항상 하나로 고정되므로 불일치 위험이 없음). **조치 불필요, 코드 변경 없음** — 이 항목이 "미해결"로 남아 있던 건 실측 없이 옛 관찰을 그대로 베껴 온 탓이다(원칙 8 위반 사례로 기록).

### 2. Wave 6 재정의 — `useT()` 미해결 키만 정밀 타격 (위 궤도 수정 참고)

이번 세션에서 새로 `useT()`를 배선한 컴포넌트들은 스스로 필요한 키를 전부 채웠으므로(WithdrawModal 31키, 계정 화면들, 에러 바운더리) **현재 시점에 `useT()`를 쓰면서 `ko.json`에 키가 없는 컴포넌트는 없는 것으로 보인다(전수 재확인은 안 함 — 다음 세션이 위 순서대로 확인).** 새로 `useT()`를 도입하는 모든 향후 작업은 **반드시 그 자리에서 ko.json에도 키를 채워야 한다**(다른 11개 로케일만 채우고 ko.json을 빼먹으면 정확히 이번 세션이 발견한 것과 같은 클래스의 버그가 재발한다).

### 3. Wave 7 — alt/aria-label/title 하드코딩 한국어(+ 확대 스코프) — 재실측 완료, 23개 파일 처리(PR #896/#897/#899/#900/#901/#902/#904/#906/#907/#908/#909/#910/#911/#912/#913/#914/#915/#916/#919/#921/#923/#924/#925), 61개 남음(`nakshatra/codex/[index]/page.tsx`·`app/page.js` 2개는 Wave 9/영구 제외로 재분류, 아래 참고) — **"4건" 이상 우선순위 그룹 전부 완료, 3건 이하만 남음**

🔴 **파일별 실제 건수가 사전 감사 추산과 다를 수 있다**(위 PR #902 사례) — `title`/`aria-label` 값이 중간 배열·변수를 거쳐 JSX에 전달되면 속성 패턴 grep이 놓친다. 각 파일 작업 시작 전 반드시 그 파일을 직접 열어 재확인할 것(표의 숫자는 착수 우선순위 판단용이지, 완결 건수의 확정치가 아니다).

2차 세션에서 정밀 재조사(git grep + ripgrep 교차검증) 결과 **정확한 현재 수치는 100개 파일 / 275건**(admin 10파일·28건 제외 시 **공개 라우트 90개 파일 / 247건** — 1차 세션의 337건/115개 파일은 집계 방식이 달랐거나 그 사이 변경분이 있었을 가능성, 이 275건이 2026-08-21 기준 정확한 값이다).

**핵심 발견**: `useT()` 훅은 앱 전체에서 **`app/components/DeliverableSpec.tsx` 단 1곳에서만** 쓰인다. `getCurrentLoadingLocale()`+`COPY` 객체 패턴도 상위 10개 공개 파일 중 `PointsClient.tsx` 한 곳뿐이었다(이번 세션에 6건 전부 처리 — PR #896). **나머지 파일은 로케일 인프라 자체가 전무해서, "문자열을 t()로 바꾸는" 수준이 아니라 파일마다 로케일 감지+사전 배선을 처음부터 만들어야 한다.** `en.json`에도 이 파일들과 겹치는 재사용 가능 네임스페이스가 없다(존재하는 4개 네임스페이스 `loveSecretAi`/`premiumUnlock`/`karmaDestiny`/`numerologyTarot`는 alt/aria와 무관한 마케팅/항목 라벨용). 3개 파일 모두 파일 로컬 `Copy` 타입 + `getCurrentLoadingLocale()` 초기값 + `languagechange`/`cd:language-change` 리스너 훅 패턴을 그대로 재사용했다 — 다음 파일들도 이 패턴을 복제하면 된다.

공개 라우트 건수 상위(2026-08-21 실측):
| 파일 | 건수 |
|---|---|
| ~~SukuyoCompatibilityAiClient.tsx~~ | ~~17~~ **완료(PR #897)** |
| ~~NewYearAiClient.tsx~~ | ~~15~~ **완료(PR #899)** |
| ~~SukuyoCalendarClient.tsx~~ | ~~12~~ **완료(PR #900)** |
| ~~IslandConsultClient.tsx~~ | ~~11~~ **완료(PR #901)** |
| ~~AstrologyAiResultClient.tsx~~ | ~~10(실측 14)~~ **완료(PR #902)** |
| ~~FortuneChatClient.tsx~~ | ~~8~~ **완료(PR #904)** |
| ~~NumerologyTarotClient.tsx~~ | ~~7(실측 9)~~ **완료(PR #906)** |
| ~~PointsClient.tsx~~ | ~~6~~ **완료(PR #896)** |
| ~~GuardianFortuneShareClient.tsx~~ | ~~6(실측 8)~~ **완료(PR #907)** |
| ~~ZiweiAiClient.tsx~~ | ~~5~~ **완료(PR #908)** |

**사전 감사 "상위 10개" 목록이 모두 소진됐다.** 2026-08-21 재산출 결과(아래 명령, Grep 도구로 재확인 — 근거 있음) **공개 라우트 71개 파일이 남아 있었다**(admin 10개 파일 제외, 이번 세션 완료 14개 제외 — PR #913 `AstrologyAiClient.tsx`, PR #914 `KarmaDestinyAiClient.tsx`, PR #915 `PremiumSalesContent.tsx`, PR #916 `FusionFortuneClient.tsx` 포함). 2026-08-22 PR #919 `ReviewsClient.tsx`, PR #921 `LockScreenFortuneClient.tsx`, PR #923 `VedicChartVisuals.tsx`, PR #924 `VedicAiClient.tsx` 완료 + `nakshatra/codex/[index]/page.tsx`(Wave 9 재분류) · `app/page.js`(영구 제외) 로 **"4건" 이상 그룹 전부 완료, 62개 남음**(전부 3건 이하):

```
Grep pattern: (alt|aria-label|title)=["'`][^"'`]*[가-힣]  path: app  glob: *.tsx
```

🔴 **실제 파일별 건수는 이 grep 추산보다 더 많을 수 있다** — 이번 세션 10개 파일 중 5개(AstrologyAiResultClient #902, NumerologyTarotClient #906, GuardianFortuneShareClient #907, SukuyoCalendarClient #900, NewYearAiClient #899 일부)에서 실측 건수가 추산보다 많았다. 원인은 항상 같다: `title`/`aria-label`/`alt` 값이 (1) 중간 배열이나 객체 리터럴을 거쳐 전달되거나 (2) 뽑기 전/후처럼 로케일 의존 조건부 템플릿으로 갈라지는 경우, 속성 패턴 grep이 놓친다. **각 파일 착수 전 반드시 그 파일을 열어 커스텀 컴포넌트로 전달되는 `title`/`alt` prop과 중간 변수를 직접 확인할 것.**

🔴 **Bash 도구의 `grep -P '[가-힣]'` 는 이 환경에서 고장나 있다** — 한글 범위를 지정해도 일본어/중국어 CJK 문자까지 오탐으로 잡는다(2026-08-21 확인, `app/[locale]/insights/page.js` 재현). **한글 탐지는 반드시 Grep 도구(ripgrep 기반)를 쓸 것 — Bash의 grep -P 결과를 신뢰하지 말 것.**

**남은 65개 파일 건수 순위(2026-08-21 Grep 도구 재확인, admin 제외, 2026-08-22 갱신):**
5건: ResultActionDock.tsx(완료, PR #909 — grep 재산출 후 갱신 필요), LoveSecretAiResultClient.tsx(완료, PR #910 — 상동), ~~KarmaDestinyAiClient.tsx~~ **완료(PR #914, 실측 164)**, ~~PremiumSalesContent.tsx~~ **완료(PR #915, 실측 101)**, ~~FusionFortuneClient.tsx~~ **완료(PR #916, 실측 181 — 이번 세션 최대 규모)**, ~~ReviewsClient.tsx~~ **완료(PR #919, 실측 약 45)**
4건: LifeBookAiClient.tsx(완료, PR #911 — 상동), LoveSecretAiClient.tsx(완료, PR #912 — 상동), ~~AstrologyAiClient.tsx~~ **완료(PR #913)**, **`nakshatra/codex/[index]/page.tsx` → Wave 9로 재분류(아래 참고, Wave 7 완료 카운트에서 제외)**, ~~LockScreenFortuneClient.tsx~~ **완료(PR #921, 실측 약 50)**, **`app/page.js` → 영구 제외(아래 참고)**, ~~VedicChartVisuals.tsx~~ **완료(PR #923)**, ~~VedicAiClient.tsx~~ **완료(PR #924, 실측 약 210 — 이번 세션 최대 규모)**
3건 이하: 나머지 62개 파일(전체 목록은 위 Grep 명령 재실행으로 즉시 재산출 가능 — count 모드 사용).

**"4건" 이상 우선순위 그룹은 전부 완료됐다.** 다음 세션은 "3건 이하" 그룹 63개 파일에서 시작한다 — 위 Grep 명령을 count 모드로 재실행해 정확한 순위를 다시 뽑을 것(사전 추산이 실측보다 낮았던 사례가 이번 세션에서도 반복됐다). **각 파일 착수 전에 서버 컴포넌트인지 먼저 확인할 것** — `nakshatra/codex/[index]/page.tsx`처럼 "use client" 가 없고 `generateStaticParams`/장문 콘텐츠 위주면 Wave 7이 아니라 Wave 9 대상이고, `app/page.js`처럼 실사용자에게 안 보이면서 배포 게이트(텍스트 하한)가 걸린 파일은 영구 제외 후보다.

**Wave 9로 재분류된 항목**: `nakshatra/codex/[index]/page.tsx` — 서버 컴포넌트(SSG, 27페이지 정적 생성), 사전 감사 "4건"은 `<Section title="...">` prop 4곳만 잡은 것이고 실제로는 본문 전체(나크샤트라·숙요 조합별 고유 산문 해설)가 한국어 장문 콘텐츠. 클라이언트 로케일 훅이 없고, 사이트 공용 자동 복구 패스(`LocaleRuntimeBridge.tsx`→`repairUnmarkedKoreanText`, ko.json 역인덱스 완전일치 기반)도 인덱스마다 달라지는 이 산문은 복구 못 함(2026-08-22 확인). 4건만 번역하면 화면은 여전히 100% 한국어라 "완료" 보고가 오도된다 — Wave 9(hreflang/장문 콘텐츠, 사용자 명시 요청 시에만 착수) 원칙 그대로 적용해 스킵.

**영구 제외된 항목**: `app/page.js` — 서버 컴포넌트(`export const metadata`, "use client" 없음)이자 실사용자에게는 절대 보이지 않는 페이지다(`HomeRedirectToStatic`이 즉시 정적 홈으로 되돌림 — 파일 자체 주석이 이를 명시). 파일 내 주석이 명확히 경고: 배포 게이트 `scripts/verify-adsense-readiness.mjs`가 이 라우트의 렌더 텍스트 하한(1,800자, 현재 3,145자)을 검사하므로 **문구를 줄이면 빌드/배포가 막힌다**(주석 원문: "이 섹션들을 줄이면 빌드가 실패해 배포 자체가 막힌다"). 로케일 훅도 없다. 번역 시도 자체가 이 build gate를 건드리는 고위험 작업이고 실사용자 혜택은 0(보이지 않으므로) — Wave 7/9 어느 쪽으로도 착수하지 않고 영구 제외로 기록.

## 🔴 2026-08-21 사용자 지시로 범위 확대 — "한국어 완전 무혼입" 목표

사용자가 "모든 언어가 현지화되어서 SEO에 불이익이 없도록, 한국어가 섞여있으면 절대 안 된다"고 명시적으로 재요청했다. 이에 따라:

1. **SSR·hreflang 크롤링 대상 페이지 전수 확인 완료(2026-08-21)** — `app/[locale]/**`(insights, privacy-policy, refund-policy, terms-of-service, sukuyo, today, ziwei, layout, page), `app/en-us/page.js`, `app/ja-jp/page.js`, `app/zh-cn/page.js`, `app/ja/tokushoho/page.js` 를 Grep 도구로 재확인 — **렌더링되는 한국어 누출 없음**(주석 또는 정상적인 `ko:` 엔트리만 존재). Google이 실제로 크롤링·색인하는 표면은 현재 깨끗하다 — 이것이 SEO상 가장 치명적인 영역이었는데 안전하다는 게 확인됐다.
2. **남은 위험은 클라이언트 렌더 화면**(Wave 7 대상) — 사용자가 UI에서 로케일을 바꿨을 때 alt/aria/title 이 한국어로 남는 경우. 이게 실사용자·Googlebot 렌더링 모두에 실제 혼합언어로 보이는 유일한 남은 경로다.
3. Wave 7 은 계속하되, 다음 세션은 **alt/aria/title 을 넘어 그 파일이 보여주는 다른 시각적 하드코딩 한국어**(버튼·헤딩·본문)도 같은 PR 안에서 같이 잡을지 판단 — 지금까지는 "접근성 속성만" 으로 스코프를 좁혀 왔으나, 사용자의 "절대 혼입 금지" 요구는 이보다 넓다. 파일을 열 때마다 그 파일 전체의 시각적 한국어 잔존 여부를 먼저 확인하고, 있으면 같은 PR에 포함시키는 것을 권장(단, 액자 데이터·전문용어 예외는 원칙 그대로 유지).

**다음 세션 유의점**:
- `AstrologyAiResultClient.tsx`·`GuardianFortuneShareClient.tsx`는 다수가 네이티브 속성이 아니라 커스텀 컴포넌트(`InfoCard`, `ResultSection`, `AnalysisBasisPanel`)의 `title` prop이다 — 접근성 속성이 아니라 "표시 텍스트"로 취급해서 번역할 것.
- 새로 로케일 인프라를 놓는 파일마다 **ko.json도 반드시 함께 채울 것**(useT() 패턴은 인라인 폴백이 없어 누락 시 ko 사용자도 깨진다 — 위 "중요한 궤도 수정" 섹션 참고).
- 도메인 전문용어(자미두수 궁 이름, 숙요 27수, 베다 점성술 용어 등)가 다수라 기계적 일괄 처리보다 파일별 문맥 확인이 필요하다 — 배치 크기를 작게(파일 1~3개 단위 PR) 유지 권장.
- 이 90개 파일을 전부 마치려면 이번 세션 Wave 0~7 전체와 비슷하거나 더 큰 규모의 작업이 남아 있다(각 파일이 PasswordChangeClient.tsx 규모의 신규 인프라 구축 + 도메인 번역을 요구). **한 세션에 다 끝낼 수 있다고 가정하지 말 것.**

### 4. `verify-i18n-no-fallback.mjs` B수치 원인 미추적

기준선(181) 대비 +11 초과 상태가 1차 세션부터 계속됨(이번 세션 변경과 무관, `git stash` 대조로 확인됨 — PR #882/#890 커밋 메시지 참고). `git log -p i18n/no-fallback-baseline.json`으로 마지막 갱신 이후 diff를 훑어 어느 PR이 fallback-인자를 늘렸는지 추적 필요.

### 5. SEO — hreflang이 9~10개 라우트 그룹 밖에는 없음 (미착수, 대형 과제)

1차 세션에서 확인: sitemap 362개 URL 중 50개(13.8%)만 hreflang 보유. `saju/*`, `tarot/*`, `fortune/*`, `insights/[slug]`, `high-value/*` 등 수백 라우트는 ko 전용 SSR + 클라이언트 사후 번역이라 크롤러·JS 느린 사용자에게는 한국어만 보인다. **진짜 확장은 신규 번역 콘텐츠 작성이 선행돼야 하는 별도 프로젝트 규모** — 사용자가 명시적으로 요청하지 않는 한 손대지 않기로 확정.

### 6. 하드코딩 한국어 전수 스윕 — `verify-i18n-no-hardcoded-korean.mjs`

리포지토리 전체 실측 116,656건(2026-08-21, 이번 세션 확인) — **단 상위 파일 대부분(`js/saju-engine.js` 14,414건, `js/saju-engine-tarot-sukuyo-quantum.js` 7,650건, `lib/tarot/rich-card-meanings.mjs` 2,736건 등)은 UI가 아니라 사주/타로 해석 엔진의 원본 콘텐츠 데이터/알고리즘 입력이다.** 이번 세션에서 alt/aria(337건, 순수 UI)처럼 실제 화면에 노출되는 것만 골라내는 감사가 필요하며, 파일 상위 랭킹을 그대로 "고칠 순서"로 오인하지 말 것(대부분 번역 대상이 아니다). 이 스크립트는 2026-07-29부로 자동 게이트 아님(수동 실행 전용).

### 7. 날짜/숫자 포맷 — `ko-KR` 하드코딩 — 🔴 2026-08-23 대부분 완료(PR #983), 남은 것만 아래 기록

**PR #983**으로 `constants/loadingMessages.ts`에 `INTL_LOCALE_BY_LOADING_LOCALE`(BCP-47 12개, `PaymentProcessingContext.tsx`/`PointsClient.tsx`/`PointHistoryClient.tsx`/`SubscriptionStatusCard.tsx`가 각자 복제해 갖고 있던 표를 공용화) 신규 export 후 12개 파일을 고쳤다: `ReportActions.tsx`(destiny-compass)·`FusionFortuneClient.tsx`·`KarmaDestinyAiClient.tsx`·`LockScreenFortuneClient.tsx`·`LoveSecretAiResultClient.tsx`(`formatDate()`)·`NamingAiResultClient.tsx`·`PointsClient.tsx`(`getMoonlightProfileLabel`)·`PremiumSalesContent.tsx`·`ReviewsClient.tsx`·`SukuyoCompatibilityAiClient.tsx`·`ZiweiAiClient.tsx`. 부수 발견·수정: `LoveRelationshipTarot.tsx`의 로케일 조회가 미지원 로케일에서 `.ko`로 새고 있던 진짜 버그(→ `.en` 폴백으로 수정).

🔴 **이번에 의도적으로 제외 — 다른 열린 PR과 충돌 위험**: `ZiweiDeepPdfPanel.tsx`(PR #971이 이미 손대는 중), `MindScanTarot.tsx`(PR #972), `KarmaDestinyAiResultClient.tsx`(PR #943), `MusicPlayerExample.tsx`(PR #967) — 4개 전부 다른 세션의 미머지 PR이 같은 파일을 건드리고 있어 여기서 고치면 충돌만 난다. **다만 그 PR들의 diff를 직접 열어 확인한 결과, `MindScanTarot.tsx`(#972)와 `MusicPlayerExample.tsx`(#967)는 UI 문구는 로케일화했지만 `toLocaleString("ko-KR")`/`MUSIC_TRACK_PRICE_LABEL` 자체는 그대로 남아 있다** — 두 PR이 머지된 뒤 이 두 파일만 별도로 다시 짚을 것(`ZiweiDeepPdfPanel.tsx`/`KarmaDestinyAiResultClient.tsx`는 diff를 다 못 봐서 미확인).
🔴 **여전히 미착수(별도 성격이라 이번 PR 범위 밖으로 명시)**: `public/js/fortune-engine.js`·`js/entertain-engine.js`·`js/saju-engine-tarot-sukuyo-quantum.js`·`js/destiny-profile.js`·`js/saju-engine.js`·`js/core/checkout-entry.js`·`js/core/feature-pricing-store.js`(레거시 vanilla 결제 코어 — 숫자 포맷뿐 아니라 완전한 한국어 문장이 통째로 섞여 있어 별도 대형 과제), `OlympusVIPLounge.jsx:1757,2809`(미확인), `app/today/TodayHubClient.tsx`의 `formatKstDate()`(PR #925이 의도적으로 남긴 것, 손으로 짠 요일명 배열이라 위 공용 표로 안 풀림 — 별도 처리 필요), `app/insights/famous-saju/[slug]/page.tsx`의 `inLanguage: "ko-KR"`(JSON-LD 메타필드, 화면 텍스트와 무관한 별개 SEO 항목).
🔴 **확인 결과 버그 아님(손 안 댐)**: `app/points/history/OrderDetailModal.tsx`(호출부가 명시적으로 로케일을 넘김, ko/en 2단계 티어와 일관), `PointHistoryClient.tsx`의 `formatDateTime` 기본값(항상 명시적 인자로 덮어써져 실제로 안 쓰임), `SubscriptionStatusCard.tsx`(`FORMAT_LOCALE_BY_LANG` 이미 정상 구현), `LoveRelationshipTarot.tsx`의 `ko` 블록 안 `"ko-KR"`(ko 전용 문구라 맞는 값 — en/ja/zh-CN/zh-TW 블록은 이미 각자 올바른 로케일을 씀).

### 9. `FusionFortuneClient.tsx`의 `guardianHandoff.topic` — i18n과 무관한 기존 표시 버그 (2026-08-21 PR #916 작업 중 발견, 미수정)

오늘의 귀인 → 초융합 인계 시 `guardianHandoff.topic`에 사람이 읽는 라벨이 아니라 원시 카테고리 키(`"love"`/`"money_work"`/`"relationship"`/`"mind"`/`"decision"`/`"daily"`)가 그대로 저장된다(`FusionFortuneClient.tsx` 핸드오프 `useEffect`, `setGuardianHandoff({ topic: String(handoff.topic || "daily"), ... })`). 반면 `form.topic`은 같은 자리에서 `topics[handoff.topic]` 조회를 거쳐 한국어 문구로 정상 세팅된다. 화면의 굵은 글씨 안내(`연이가 남긴 **{guardianHandoff.topic}**...`)는 이 원시 키를 그대로 보여줘, 실제로는 "연이가 남긴 **money_work** 주제만 이어받았어요"처럼 영문 내부 키가 사용자에게 노출될 수 있다. **한국어 사용자에게도 동일하게 나타나는 i18n 무관 기존 버그**라 이번 Wave 7 PR(#916, 문구만 12로케일화)에서는 고치지 않았다 — 고치려면 `guardianHandoff` state에 `topics[handoff.topic]` 조회 결과(또는 그 조회에 대응하는 `copy.topicOption*` 값)를 같이 저장해야 한다.

### 10. 사용자가 명시적으로 범위 제외한 것 (재검토 시점에 다시 물을 것)

- **LLM 응답 언어 자동검증/재생성**: 비용 문제로 안 만듦. 74곳 이상 다른 LLM 콜사이트는 정본 경로(`callGeminiText`)로 로케일이 자동 전달되지만 **실제 응답 언어 준수는 실호출 없이 검증 불가**.
- **12개 로케일 전체 SSR 확장**: 4개(en/ja/zh-CN/zh-TW) 유지 확정. 8개 언어분 법률 콘텐츠 신규 번역이 선행돼야 하는 대형 과제.
- **RTL**: 현재 지원 로케일에 해당 언어 없음, 해당 없음.
- **번역 키 네임스페이스 재정리**(premium/premiumPdf/premiumUnlock, palm/palmMap, sajuEngine/sajuQuantum/famousSaju 등 혼재): 기존 구조 유지로 확정, 재정리 안 함.

## 다음 세션 시작 순서 제안

0. **속성 전용 grep이 놓친 다른 "기능 클러스터"가 더 있는지 먼저 확인** — `destiny-compass`(PR #933)가 `(alt|aria-label|title)=...[가-힣]` 패턴에 안 걸려 Wave 7 우선순위 표에서 완전히 빠져 있었다(본문이 대부분 일반 텍스트 노드였기 때문). `git grep -lP '[\x{AC00}-\x{D7A3}]' -- 'app/**/*.tsx' 'app/**/*.ts'` 로 한글이 있는 전체 파일 목록을 뽑고, 그중 `_stage/`·`_engine/`·`_hooks/`·`_components/` 같은 하위 디렉터리를 가진 라우트(= 컴포넌트 1개가 아니라 클러스터)를 우선 걸러내 이번처럼 놓친 게 없는지 한 번은 확인할 것.
1. **Wave 7 계속(확대된 스코프로)** — PR #909부터 스코프가 "접근성 속성만"에서 "그 파일이 보여주는 모든 시각적 하드코딩 한국어"로 넓어졌다(사용자의 "한국어 완전 무혼입" 요구). "4건" 이상 우선순위 그룹은 2026-08-22 PR #924(`VedicAiClient.tsx`)로 전부 완료됐다. 남은 62개 공개 파일은 전부 "3건 이하" 그룹 — 위 "3. Wave 7" 섹션의 재산출 grep(count 모드)으로 정확한 순위를 다시 뽑고 시작할 것. **각 파일 열 때 "use client" 여부와 `generateStaticParams` 존재를 먼저 확인** — `nakshatra/codex/[index]/page.tsx`(서버 컴포넌트, SSG 장문 콘텐츠, Wave 9 재분류)와 `app/page.js`(서버 컴포넌트, 실사용자 비노출 + AdSense 텍스트-하한 배포 게이트로 영구 제외)처럼 실제로는 Wave 7 대상이 아닌 파일을 잘못 착수하지 않는다. 단, AI 콘텐츠 결합 파싱 로직·전문용어 글로서리·날짜 포맷·다른 파일에 있는 공유 라벨(`spec.label`류)은 PR #910 이 세운 전례대로 명시적으로 제외하고 그 이유를 PR 설명에 남긴다. `VedicAiClient.tsx`(PR #924)가 세운 새 전례: 같은 화면의 다른 컴포넌트(`VedicChartVisuals.tsx`)가 이미 옵셔널 `copy` 파라미터를 열어 둔 공유 함수(`getGrahaMeta`/`GrahaNatureDot`)를 만나면, 그 함수의 `copy` 타입이 자신의 파일과 다르면(별도 Copy 타입) 억지로 맞추지 말고 넘기지 않아도 된다(기존 한국어 폴백 유지, 문서화만 하면 충분) — 강제로 타입을 통일하려다 범위가 부풀지 않게 한다.
2. **AI 결과 페이지의 클라이언트 파싱 견고성**(신규, 낮은 우선순위) — "AI 로케일" 섹션에서 확인했듯 응답 언어 자체는 이미 해결돼 있다. 다만 `LoveSecretAiResultClient.tsx`류의 한국어 키워드 정규식 파싱이 비-ko 응답에서 헤딩·배지를 제대로 뽑아내는지는 미검증(과금 실호출 필요) — Wave 7 파일을 열 때 곁다리로 확인하되, 전수 감사는 사용자가 요청하면 별도로.
3. 계정 삭제 확인 문구 로케일화 — 서버(`worker/routes/auth.js`) 변경 범위·승인 먼저 확인.
4. `verify-i18n-no-fallback.mjs` B수치 원인 추적(작지만 방치하면 계속 헷갈림).
5. 날짜 포맷 `ko-KR` 하드코딩(항목 7) — 여러 파일에 걸쳐 있고 사용자가 아직 명시적으로 우선순위를 안 매김, Wave 7 완료 후 검토.
6. SEO hreflang 확장은 사용자가 신규 콘텐츠 작성을 명시적으로 요청할 때만.
