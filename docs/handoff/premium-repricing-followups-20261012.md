---
status: active
updated: 2026-10-12
next: "F1~F7 완료(2026-10-12). 남은 일은 아래 '사람이 할 체크리스트'뿐입니다(Play Console 티어 등록, staging 실계정 확인)."
---

# 프리미엄 개편 후속 과제

## 왜

사용자 요청(2026-10-12): "후속 과제 진행할 인수인계 문서를 만들고 작업해줄 프롬프트를 작성해"

프리미엄 개편(`docs/handoff/premium-repricing-20261011.md`)의 P0-2, B 승격, ③, ④(a), ④(b)는 운영에 나가 있습니다. 운영 SHA는 `bacf141bd`이고, 운영 release `38196531526`에서 Pages와 Worker가 같은 SHA인지 확인했습니다. 이 문서는 그 작업에서 남은 과제를 모읍니다.

## 공통 규칙

- 워크트리를 새로 만들고, node_modules는 `mklink /J`로 연결합니다. Git Bash `ln -s`는 쓰지 않습니다. 실제로 복사본이 생깁니다.
  - 지울 때는 먼저 `cmd /c rmdir <wt>\node_modules`로 링크만 끊고 `git worktree remove`를 실행합니다.
- 브랜치와 PR은 만들지 않습니다. 검증 단위로 커밋하고 `git push origin HEAD:main`합니다.
  - push 전에 `git fetch origin main`을 하고, main이 움직였으면 rebase합니다.
  - main CI가 red이면 push하지 않습니다.
- 실결제, 실제 LLM 호출, 운영 DB 임의 조회, 자격 증명 값 출력은 하지 않습니다.
- 기존 SKU의 가격을 바꾸거나 비활성화하지 않고, retired ID도 다시 쓰지 않습니다. 기존 ContentEntitlement는 유지합니다.
- 생성물이 바뀌었으면 `npm run sync:public` 다음에 `npm run sitemap:generate`를 실행하고 함께 커밋합니다. pre-push 검사는 tree가 깨끗해야 통과합니다.
- 검증 순서:
  1. 관련 테스트
  2. `npm run check:fast -- --base=origin/main` (약 15분이므로 백그라운드로 돌립니다)
  3. `npm run check:pre-push`
  4. push
  5. main CI(`pr-ci.yml`) 성공 확인
- 운영 승격:
  - `gh workflow run cloudflare-pages-deploy.yml --repo rei1237/codedestiny --ref main -f mode=production`
  - 정기 실행이 production dispatch를 밀어내 `cancelled`가 되면 다시 dispatch합니다.
  - 로그의 `[verify-deployed-sha] PASS: Pages 와 Worker 모두 <sha>`와 `https://code-destiny.com/version.json`의 gitSha를 확인합니다.
- 문서만 바꾼 커밋은 운영 승격이 필요 없습니다.
- 결과는 이 문서의 각 과제 아래에 `✅ 완료 YYYY-MM-DD`와 커밋, run 번호로 남기고, frontmatter의 `next`를 갱신합니다.

## 진행 순서

| 순서 | 과제 | 위험 | 크기 | 운영 승격 |
|---|---|---|---|---|
| 1 | F1 별자리 심층 해설 `profileId` 누락 의심 | 🟠 결제 고객 영향 가능 | S | 필요 |
| 2 | F4 찻집 사주 general 카테고리 필수 섹션 제목 | 🟡 | S | 필요할 수 있음 |
| 3 | F3 찻집 상품 상세 manifest 새 섹션 반영 | 🟢 | S | 필요 |
| 4 | F2 Play 문서 티어 표 갱신 | 🟢 문서 | XS | 불필요 |
| 5 | F6 이용권 경제성 보고서 참치 pro 요율 반영 | 🟢 보고용 | XS | 불필요 |
| 6 | F5 `verify-detail-first-entry.mjs` CI 편입 | 🟢 | S | 불필요 |
| 7 | F7 사주 대운·종합 서버 이전 (④(c)) | 🔴 | L | 필요 |

F1~F6은 서로 관계가 없어서 순서를 바꿔도 됩니다. F7은 아래 결정 3개를 사용자가 정한 뒤에 시작합니다.

---

## F1. 별자리 심층 해설이 `profileId`를 보내지 않는 것으로 보임

- **증상(코드 읽기로만 확인, 실행으로는 확인 안 함):**
  - 클라이언트 `js/core/astro/basic-deep-client.js`의 `inputOf()`(7-16행)는 date, time, timeKnown, timezone, latitude, longitude만 만듭니다.
  - 요청은 `root._cdAIPromptRequestJson`(`js/saju-engine.js:6064`)을 거쳐 `fetchJsonWithAuth`로 가는데, 이 경로도 `profileId`를 붙이지 않는 것으로 보입니다.
  - 그런데 서버 `worker/routes/astro-basic-deep.js`는 `readProfileBirthUnlock(env,{profileId: body.profileId,...})`를 호출하고, `profileId`가 없으면 400 `MISSING_PROFILE_ID`를 돌려줍니다.
  - 워커 테스트 `__tests__/worker/astro-basic-deep.test.js:50`은 `INPUT`에 `profileId:"p1"`을 직접 넣기 때문에 통과합니다.
- **먼저 할 일:**
  1. `_cdAIPromptRequestJson`과 `fetchJsonWithAuth`(`index.html:31126` 근처)가 본문에 `profileId`를 넣는지 끝까지 따라가 확인합니다.
  2. 넣지 않는다면, 정적 하네스나 mock 브라우저 검증으로 400을 재현합니다.
- **수정 방향:**
  - `inputOf` 또는 `currentInput`에 `profileId: root.cdBirthScopeCurrentProfileId && root.cdBirthScopeCurrentProfileId()`를 넣습니다. 사주 압축 요청의 `_sajuPromptResolveProfileId()`(`js/saju-engine.js:6242`)와 같은 방식입니다.
  - 프로필이 없을 때 400 응답이 화면에서 어떻게 보이는지도 확인합니다. 로그인이나 프로필 선택 안내가 떠야 합니다.
- **완료 기준:**
  - 클라이언트가 보내는 요청 본문에 `profileId`가 들어가는 것을 정적 테스트 하나로 고정합니다. `__tests__/ui/astro-basic-delivery.test.mjs` 옆에 둡니다.
  - 해금된 프로필에서 본문이 열리는 흐름을 mock 브라우저로 확인합니다.
- 재현되지 않으면 근거만 이 문서에 적고 닫습니다.

- ✅ 완료 2026-10-12 — 커밋 `f235630e2`, pr-ci 38207157290, 운영 release 38211010905(`d6631a6f5`까지, `[verify-deployed-sha] PASS`, version.json gitSha 일치).
  - **재현됨:** 실제 서버 라우트(DB만 mock)와 실제 클라이언트(JSDOM)를 잇는 임시 테스트(커밋 안 함)에서 생년월일 구매와 프로필 p1 선택 상태로도 본문에 `profileId`가 없어 400 `MISSING_PROFILE_ID`가 났습니다. 400 검사가 402보다 먼저라 본문도 구매 버튼도 뜨지 않았습니다. 원인은 서버만 전환한 `f1c8ae8d0`입니다.
  - **수정:** 요청 본문에 `profileId`(`cdBirthScopeCurrentProfileId` → `_sajuPromptResolveProfileId`)를 넣고, 400 `MISSING_PROFILE_ID`/`INVALID_PROFILE`이면 프로필 저장·선택 안내를 보여 줍니다. 정적 테스트와 mock 브라우저(`verify-astro-basic-delivery`)로 해금 프로필 열람을 확인했습니다.

## F2. Play 문서 티어 표가 현재 가격과 다름

- **파일:** `docs/play-console-submission-values.md`의 "각 티어가 실제로 커버하는 기능" 표(92-99행 근처)
- **현재 문제:**
  - 표에 `cd_content_tier_15`~`tier_18` 행이 없습니다. 위쪽 입력값 표(68-71행)에는 이미 있습니다.
  - 마스터 인연의 서 궁합판(₩50,000)은 `cd_content_tier_17`(`worker/lib/app-store-pricing.js:57`)로 가는데, 표에는 `tier_10` 행에 "master-love-codex"로 함께 적혀 있습니다.
  - 대운·종합(₩30,000)으로 바뀐 기능 수가 반영되지 않았습니다.
- **할 일:**
  - `worker/lib/paid-feature-registry.js`와 `app-store-pricing.js`를 기준으로 티어별 기능 수와 대표 기능을 다시 셉니다. 일회성 스크립트로 세고, 그 스크립트는 커밋하지 않습니다.
  - 표를 고칩니다. `docs/pricing/PLAY_CONSOLE_TASKS.md`의 tier_15~18 체크리스트와 맞는지도 확인합니다.
- **완료 기준:** 표의 각 행이 레지스트리에서 다시 센 값과 같습니다.

- ✅ 완료 2026-10-12 — 커밋 `5a8e05e1d`, pr-ci 38209571020(F3·F6·F5와 함께 push). 문서 전용이라 승격하지 않았습니다.
  - 집계 기준: `FEATURE_KEY_PRICE_TABLE` ∪ `UNLOCK_PRODUCT_BY_FEATURE_KEY`의 각 키를 `isAppFreeFeature` → `resolveAppContentTier` 순서로 거친 값입니다(표에 한 줄로 적음).
  - `master-love-codex-compat`를 tier_17 행으로 옮겼습니다. `PLAY_CONSOLE_TASKS.md`의 tier_17에 `fusion-fortune-consultation`이 빠져 있어 함께 넣었습니다.

## F3. 찻집 상품 상세 manifest가 새 필수 섹션을 반영하지 않음

- **배경:** ④(a)에서 찻집 카테고리마다 필수 섹션 3개를 넣었습니다(월별 흐름, 관계 처방, 실행 체크리스트). 숙요에는 `chapters` 3장도 넣었습니다(`worker/routes/fortune-tea-house.js`, `SAJU_REQUIRED_SECTION_TITLES` 88행).
- **파일:** `content/product-details/{tea-saju,tea-saju-compat,tea-sukuyo,tea-tarot-three,tea-tarot-five}/manifest.json`과 `한글-원고.md`. 상세 페이지 생성기와 12개 로케일 사본이 이 파일을 따라갑니다.
- **할 일:**
  - 상세 페이지의 "받게 되는 내용" 섹션 목록과 분량 표기를 새 구성으로 맞춥니다. 사주 18,000자, 타로 10,000자, 숙요 14,000자입니다.
  - 생성기와 검증기를 돌립니다. `verify:home-service-registry`가 상세 문안 57/57을 대조합니다.
  - 로케일 사본이 있으면 같이 갱신합니다.
- **완료 기준:**
  - 상세 페이지의 섹션 목록이 서버 필수 섹션과 맞습니다.
  - `npm run check:pre-push`가 통과합니다.
  - 운영 승격 뒤 라이브 상세 페이지에 새 섹션명이 보입니다.

- ✅ 완료 2026-10-12 — 커밋 `917fb8a34`, pr-ci 38209571020, 운영 release 38211010905. 라이브 `/feature-details/crafted/tea-saju/manifest.json`에서 "월별 흐름 · 관계 처방 · 실행 체크리스트" 섹션명을 확인했습니다.
  - **전제 정정:** 12개 로케일 사본은 없습니다(ko 전용). `verify:home-service-registry`는 tea 상세를 대조하지 않습니다. 원본은 `content/product-details/<id>/panels.cjs`이고 `node scripts/render-crafted-detail.cjs <id>`로 생성합니다.
  - 분량 표기는 서버 최소값에 맞춰 "이상"으로 적었습니다(사주 18,000자, 타로 10,000자·5카드 11,200자, 숙요 14,000자).

## F4. 찻집 사주 general 카테고리의 폴백 제목이 필수 제목과 다를 수 있음

- **위치:** `worker/routes/fortune-tea-house.js`
  - `SAJU_REQUIRED_SECTION_TITLES`(88행), general 규칙(1710행)
  - `buildFallbackSajuDeepSections`(2422행: general이 아니면 카테고리 빌더로 갑니다)
  - 병합 `mergeDeepSections`(3023행)
- **문제:** general일 때 폴백 deepSections 제목이 필수 제목 11개와 글자 그대로 같지 않으면, 모델 출력이 모자랄 때 필수 섹션 검사와 폴백 병합이 엇갈릴 수 있습니다. ④(a) 이전부터 있던 문제일 수 있고, 확인하지 않았습니다.
- **할 일:**
  1. general 폴백이 만드는 제목 목록과 필수 제목을 비교하는 단위 테스트를 먼저 씁니다.
  2. 다르면 폴백 제목을 필수 제목에 맞춥니다.
- **완료 기준:** general과 다른 카테고리 모두에서 폴백 제목이 필수 제목을 빠짐없이 덮는다는 테스트가 통과합니다. 이미 같으면 테스트만 남기고 닫습니다.

- ✅ 완료 2026-10-12 — 커밋 `95b57da2f`, pr-ci 38208429841, 운영 release 38211010905.
  - 문제가 맞았습니다. general 폴백 제목 11개가 필수 제목과 0/11 일치했습니다. 폴백 제목을 필수 제목에 맞췄습니다.
  - 검증기가 `questionCategory`/`question` 없는 폴백 객체로 카테고리를 골라 생성기와 다르게 검사할 수 있어, 폴백 객체에 두 값을 실었습니다. general·각 카테고리·궁합 테스트가 통과합니다.

## F5. `scripts/verify-detail-first-entry.mjs`가 CI에 없음

- **현재:**
  - Playwright로 상세 페이지를 거친 뒤 서비스에 들어가는 흐름을 360/390/430/1280 폭에서 검사합니다. 기본 base는 `127.0.0.1:25592`이고 mock localhost에서만 돕니다.
  - 커밋 `66e14ae7a`에서 추가했지만 `package.json` 스크립트와 `.github/workflows`, `scripts/lib/verification-plan.mjs` 어디에도 연결되어 있지 않습니다.
- **할 일:**
  - 같은 계열 스크립트를 띄우는 방식을 따라 `npm run verify:detail-first-entry`를 추가합니다. 참고할 스크립트는 `verify-premium-detail.mjs`(14125)와 `verify-premium-consultation-entry.mjs`(14124)입니다.
  - 그 스크립트들이 돌아가는 CI 단계에 넣습니다.
  - 로컬에서 한 번 통과시킵니다.
- **완료 기준:** main CI에서 이 단계가 돌고 성공합니다.

- ✅ 완료 2026-10-12 — 커밋 `d6631a6f5`, pr-ci 38209571020의 Static guards job에서 `npm run verify:detail-first-entry`가 돌고 PASS했습니다.
  - 형제 스크립트도 CI에 연결되어 있지 않아, `CONSULTATION_TEST_BASE`가 없으면 `public/` 정적 서버를 직접 띄우는 방식(`verify-saju-summary-browser.mjs` 패턴)으로 바꿨습니다.

## F6. 이용권 경제성 보고서가 참치를 flash 요율로 계산함

- **파일:** `scripts/report-yeongnyangi-pass-economics.mjs:29`, `:155` (`gemini/gemini-2.5-flash` 고정)
- **배경:** ④(b) 뒤로 새 참치 주문은 `tunaQualityPolicy`가 있으면 모든 장을 `gemini-2.5-pro`로 씁니다(`worker/yeongnyangi/fortune/tuna-quality.ts`). pro 요율은 `config/llm-tariffs-20260921.json`에 있습니다.
- **할 일:**
  - 참치 행만 pro 요율, 자기 검토 재작성 최대 8장, 추가 질문 6회로 계산합니다.
  - 근거는 `worker/yeongnyangi/fortune/reading-v7-cost.ts`의 `tunaBookCostRatio`입니다. 숫자를 다시 쓰지 말고 이 함수를 불러 씁니다.
  - 다른 등급은 flash를 유지합니다.
- **완료 기준:** 보고서의 참치 원가율이 단위 테스트의 추정(약 17%)과 같은 규칙으로 나옵니다. 보고용이라 게이트는 아닙니다.

- ✅ 완료 2026-10-12 — 커밋 `9359ccda9`, pr-ci 38209571020. 보고용이라 승격하지 않았습니다.
  - 참치 행만 `tunaBookCostRatio`와 `gemini/${TUNA_DEFAULT_MODEL}` 요율로 계산합니다. 원가율은 6개 참치 상품 모두 0.1723(운영비 포함 17.4%)이고, 출력의 `basis` 필드에 계산 기준을 적었습니다.

## F7. 사주 대운·종합(₩30,000) 서버 이전 (④(c))

`docs/handoff/2026-10-10-birth-scope-unlock-followups.md` P2-1(173-186행)과 같은 과제입니다. 완료하면 두 문서 모두에 표시합니다.

### 먼저 사용자에게 물을 결정 3개 (AskUserQuestion)

1. **무료 화면과 같이 쓰는 표:** `TS_DB`, `TS_DEEP`, `GAEUN_DB`/`NEO_GAEUN_DB`, `evalDaewun`, `reading-depth.generated.js`는 무료 화면에도 쓰입니다.
   - 권장: 유료 전용(`renderSummary`, `generateDetailedAdvice`/`generateNeoFactPunch`, `HEALTH_DATA`, `GAEUN_TIPS`, `_buildMonthCommandFromEngine`, `showDwDetail`의 세운 문구, `buildCycle`/`cycleMarkup`)만 서버로 옮깁니다. 공유 표는 이번에는 그대로 둡니다.
   - 대안: 공유 표도 무료용 짧은 문구와 유료용 긴 문구로 나눕니다.
2. **프로필 카드 없이 계정에만 남은 옛 해금(`cdIsLegacyAccountUnlockKey`):** 서버 경로는 `profileId`를 요구합니다.
   - 권장: 서버가 계정 단위 레거시 해금도 인정하게 합니다. 해금을 열 때 "프로필 저장"을 안내하고, 현재 입력한 생년월일로 계산합니다.
   - 대안: 프로필 저장을 강제합니다.
3. **이용권으로 연 경우:** `worker/routes/billing.js:3724` 근처 `persistProfileUnlockEntitlement`가 `section_daewun`/`section_summary`에도 해금 기록을 남기는지 확인합니다.
   - 남기지 않으면 권장안은 서버 경로에서 이용권 커버 여부를 직접 판정하는 것입니다.

### 현재 구조 (조사 결과)

- **종합:** `js/saju-engine.js`
  - 5790행 근처: `_cdSajuGateUnlocked('section_summary')` 다음 `renderSummary(p,johu,natal)`
  - `renderSummary` 27116-28101행: 약 986줄, 125KB
  - 조언 생성기 30055-30216행
  - 월령·절기 `_buildMonthCommandFromEngine` 26934-27067행
- **대운:**
  - `renderDaewun` 30296-30385행. `G_DAEWUN` 계산은 무료 소비자 6곳 이상이 쓰므로 클라이언트에 남깁니다.
  - `showDwDetail` 30512-30598행
  - `buildDaewunReadingGuide` 30483행
  - `js/core/saju/reading-personas.js:177-231`의 `buildCycle`
- **클라이언트 게이트:**
  - `_cdSajuGateUnlocked`(27071행)
  - `index.html`의 `applySectionGates`(29610-29670행), `renderUnlockedSajuSummaryIfReady`(29547행)
  - 모두 콘솔에서 우회할 수 있습니다.
- **따라 할 서버 패턴:**
  - `worker/routes/astro-basic-deep.js`: 로그인, 그다음 `readProfileBirthUnlock`(`worker/lib/paid-content-read-access.js:90`). 해금이 없으면 402와 가격을 돌려줍니다. 계산은 `access.birth`로만 하고, 응답은 `{ok, unlocked, featureKey, html}`입니다.
  - 클라이언트는 `js/core/astro/basic-deep-client.js` 패턴을 따릅니다. 본문은 캐시하지 않고 `cd:unlocks-changed`가 오면 다시 읽습니다. F1의 `profileId` 누락은 따라 하지 않습니다.
- **서버에서 이미 할 수 있는 계산:**
  - `worker/lib/life-book-ai-saju.js:701` `calculateLifeBookAiSaju`: 원국, 십성, 대운, 세운
  - `worker/lib/saju-snapshot-from-birth.js:47`
  - `worker/yeongnyangi/fortune/saju-runtime.mjs`: `scripts/extract-saju-runtime.mjs`가 엔진에서 그대로 추출하고 drift를 검사합니다.
  - `worker/lib/saju-quantum-myeongri.js` `evaluateDaewun`
  - `worker/lib/saju-shinsal.js`
- **서버에 없는 것:** `_buildMonthCommandFromEngine`, 종합 안의 신살 도출, `getDetailedGaeun`/`GAEUN_DB`, `buildCycle` 문구. `extract-saju-runtime.mjs`처럼 AST로 추출하거나 그대로 옮깁니다.

### 구현 방향

- 새 라우트 `POST /api/saju/section {profileId, featureKey, mode: 'pig'|'neo'}`를 `worker/index.js`에 등록합니다. `section_daewun`과 `section_summary`만 받습니다.
  - 성별은 `card.gender`에서 가져옵니다.
  - 본문의 생년월일 값은 무시합니다.
- 렌더 모듈은 `worker/lib/saju-section-report.*` 하나로 둡니다.
  - **계산식은 한 글자도 바꾸지 않습니다.** 그러면 `extract-saju-runtime` drift 검사와 영냥이 불변 지문이 그대로 유지됩니다.
  - 계산식을 바꿔야 하면 멈추고 설계 문서와 승인을 받습니다(🔴).
- 내용을 30,000원에 맞게 넓힙니다.
  - 종합: 십성, 조후, 억부, 절기, 일진·월운을 흡수하고 연애, 돈, 일, 관계, 건강 습관, 올해 처방 장을 둡니다.
  - 대운: 10년 단위 전체 대운, 현재 대운의 연도별 세운, 전환기 체크리스트를 둡니다.
  - 분량이 모자라도 전달 실패로 처리하지 않습니다.
- 클라이언트에서는 유료 전용 렌더러를 지우고 fetch 클라이언트로 바꿉니다. `applySectionGates`의 재렌더 호출도 새 클라이언트로 바꿉니다.
- **테스트:**
  - 워커 라우트 테스트: `__tests__/worker/astro-basic-deep.test.js`를 복제합니다(401/400/403/402/200, 본문의 생년월일 무시, 레거시 해금, 이용권).
  - 번들에 템플릿이 없는지 보는 정적 테스트: `__tests__/ui/destiny-flower-server-gate.static.test.js`의 `browserServedJsFiles()`를 써서 `js/`와 `public/`을 모두 봅니다. 금지 목록은 서버 모듈이 export하는 문장으로 만듭니다.
  - 고칠 기존 검사: `__tests__/ui/saju-summary-runtime.test.js`, `scripts/verify-saju-summary-browser.mjs`, `scripts/verify-saju-daewun-quality-browser.mjs`, `scripts/verify-saju-unlock-entitlement-regression.mjs`, `scripts/verify-saju-reading-personas.mjs`
- **완료 기준:**
  - 콘솔에서 `isTileKeyUnlocked`를 덮어써도 본문이 보이지 않습니다.
  - 공개 JS에서 유료 전용 템플릿 grep 결과가 0건입니다.
  - 기존 5,000원 해금자, 계정 레거시 해금자, 이용권 사용자가 모두 계속 열람합니다(mock).
  - `npm run verify:saju-unlock-entitlement-regression`과 `npm run verify:saju-summary-browser`가 통과합니다.
  - 운영 승격 뒤 라이브 번들 grep 결과가 0건입니다.
- ✅ 완료 2026-10-12 — 커밋 다섯 개, 운영 release 38224537073(`60630b42b`, `[verify-deployed-sha] PASS`, version.json gitSha 일치).
  - `4e7ca939d` 서버 렌더러·`POST /api/saju/section`(pr-ci 38215080665 실패: `verify:myeongri-tables`가 생성 사본의 CD_JANGGAN을 잡음) → `a40da9269` 분류 수정(pr-ci 38216720532 성공).
  - `ce0310156` 클라이언트 로더 전환·브라우저 사본 삭제(pr-ci 38218703726 실패: `verify:saju-summary-browser` mobile-restored 게이트 클릭 시간 초과, 재실행도 실패).
  - `c14ea828b` 분량 확장(종합 ⑭ 올해·내년 처방, 대운 전체 지도·전환기 체크리스트) + `60630b42b` 검증기 클릭 내성·실패 진단 → pr-ci 38222908900 성공.
  - 라이브: `js/saju-engine.js`, `js/core/saju/section-client.js`, `js/core/saju/reading-personas.js`, `/`에서 유료 함수명·장 제목 19개 grep 0건. 비로그인 `POST /api/saju/section` → 401.
  - 계산식은 바꾸지 않았습니다. 서버는 클라이언트 함수를 글자 그대로 추출해 쓰고, 패리티 테스트가 확장 장(`<!--saju-ext-->`)을 뺀 HTML을 HEAD 클라이언트 해시와 대조합니다.
  - 범위: 공유 표(TS_DB·TS_DEEP 등)는 결정대로 클라이언트에 남았습니다. 대운 표·인생 그래프도 아직 브라우저가 그립니다.

---

## 사람이 할 체크리스트 (에이전트가 할 수 없음)

- [ ] Play Console에 `cd_content_tier_15`~`tier_18`을 등록합니다(`docs/pricing/PLAY_CONSOLE_TASKS.md`). `tier_17`을 등록하기 전까지 앱의 인연의 서 궁합판(₩50,000)은 `APP_SKU_NOT_VERIFIED`로 닫혀 있습니다.
- [ ] 꿀방울 출석 → 프롬프트 생성 → 다음 날 다시 출석
- [ ] 꿀방울이 0개일 때 3,000원 결제
- [ ] staging에서 기존 구매 계정으로 종합풀이가 열리는지 확인
- [ ] P0-2 롤백용 백업 `D:\Development\codedestiny-backups\20261012-p0-2\{staging,production}`(개인정보 포함)은 보관 기간을 정한 뒤 삭제합니다.
