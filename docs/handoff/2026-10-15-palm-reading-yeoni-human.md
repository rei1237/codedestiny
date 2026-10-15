---
status: done
updated: 2026-10-16
next: "완료(2026-10-16). 0~11 모두 커밋·main 병합. 남은 일은 '결과 → 후속' 절만 본다."
---

# 손금 × 연이(인간 버전) — 라이트 UI·꾸밈 아트·판독 로직 개선

## 결과 (2026-10-16)

- 0~11을 항목당 커밋으로 마쳤다. 워크트리 `wt/palm-yeoni-20261015-214204`(시작 `9aca927da`)에서 작업하고 main에 일반 병합했다. 항목별 SHA는 아래 체크리스트에 있다.
- 항목마다 `check:fast`를 돌렸다. 과금 LLM 실호출은 하지 않았다(mock만).
- 화면: 손금 화면 전체가 연이 정원 라이트 팔레트다. 업로드·촬영 가이드·로딩(실제 단계만)·오류·결과 표지·끝맺음에 소설 캐주얼 연이 무대가 붙는다. 마스터 프로필 키는 `yeoniPalm`이다. 롤백은 `src/features/expert-characters/yeoni.ts`의 `enabled`다.
- 표정 매핑: idle=base, greet=smile, thinking=sideL, reveal=right, caution=left, comfort=smile, error=sideR, empty=sideR. angry·cry·fear·sleep·onigiri는 상담 화면에 맞지 않아 뺐다. disappoint는 팔짱 낀 반신 컷이라 캔버스가 달라 뺐다.
- 상세·노출: 상세 1·9번 패널이 `palm-reading-hero-v3-yeoni.webp`를 쓴다. 첫 패널은 연이 훅이고 layout.css는 라이트다. 시각 상세·카드·OG(`/feature-details/assets/palm-reading-og.webp`)도 연이다. 홈 손금 타일의 초록 무료 배지 스타일은 뗐다.
- 검증 하네스: `verify-palm-mobile-payment-recovery.mjs`가 next/image default와 CSS 모듈(app.css)을 Next처럼 묶는다. `app/package.json`이 `"type":"module"`이라 esbuild가 CJS default를 모듈 객체째 넘기던 문제다.

### 후속 (이번 범위 밖, 손대지 않음)

- 클라이언트 "손이 아님" 판정은 경고만 한다. 최종 판정은 서버 비전이 한다.
- 클라이언트 폴백 해석 문구는 고정 문구다.
- `handShape`의 `labelKo` 기본값이 남아 있다.
- 429 등 일부 서버 메시지는 한국어가 아닌 로케일에서도 한국어로 남을 수 있다.
- 오버레이 신뢰도 하한 `Math.max(0.2, …)`는 그대로다. 대신 `detected:false`인 선은 점선으로 구분한다.
- 로딩 단계 문구의 1300ms 순환(`loadingPhases`)은 원래 있던 시간 기반 연출이다. 연이 대사는 실제 단계에만 붙였다.
- 손금 라우트는 next/dynamic으로 붙는다. 그래서 SSR과 하이드레이션의 useId 경로가 어긋나고, 이를 피하려고 MasterProfile을 마운트 뒤에 그린다. 근본 원인은 라우트 로딩 방식이다.
- 390px에서 흐름 칩 "1. 업로드"가 줄바꿈된다. 원래 있던 문제로 보인다.
- `docs/purchase-journey/inventory.json`은 아직 v2 히어로를 가리킨다. 검토용 산출물이라 `build-purchase-journey-review.mjs`를 다시 돌릴 때 갱신된다.

## 왜

사용자 원문: "추가로 손금 기능은 연이 인간 버전으로 해주고 ui/ux와 꾸미는 이미지도 연이 인간 버전으로 깔끔하고 라이트한 느낌으로 만들어주면 좋겠고 현재 손금 로직도 개선해주면 좋겠어. 이 세션에서 어려우면 인수인계로 넘겨"

2026-10-15 전문가 상담 캐릭터 작업(윤달·무성·서한비, 브랜치 `wt/expert-characters-20261015-180951`) 중에 들어온 요청이다. 범위가 세 겹이라 그 브랜치와 섞지 않고 넘긴다.

- **UI**: `app/palm-reading/PalmDestinyMain.tsx`(3,895줄)는 다크 동양풍이다. 라이트 테마로 바꾸려면 화면 전체를 다시 스타일해야 한다.
- **로직**: 유료(100코인) 워커 로직을 바꾸면 critical 티어 CI가 붙는다.
- **아트**: 새로 그려야 한다.

## 시작 방법 (`/clear` 뒤 이 문서만으로 시작한다)

1. **읽을 것**
   - 저장소 `CLAUDE.md`(절대 규칙, 전달 흐름)
   - 이 문서
   - [2026-10-02 인수인계](2026-10-02-palm-reading-logic-and-token-cap.md)(아래 함정의 원본)
   - `DESIGN.md:144` 「연이 정원 홈」
2. **작업 위치 정하기**
   - `git -C D:\Development\code-destiny status -sb`와 `git worktree list`로 다른 세션이 main 체크아웃에서 쓰고 있는지 본다.
   - 혼자면 main에서 직접 고친다. CLAUDE.md 기본 흐름이고, 브랜치·PR은 만들지 않는다.
   - 다른 세션이 쓰고 있으면 워크트리를 만든다: `powershell -File D:\Development\code-destiny\scripts\create-safe-worktree.ps1 -Slug palm-yeoni`
     - 기본 base는 `origin/main`이다.
     - `D:\Development\codedestiny-worktrees\` 아래에 만들고, `node_modules`를 본 저장소로 정션 연결한다.
   - main 체크아웃에 있는 남의 미추적 파일은 건드리지 않는다. 2026-10-15 기준 `.claude/skills/fire-your-seo-agency/`, `scripts/grant-family-pass.mjs`다.
   - 공유 체크아웃에서 `reset --hard`·`stash`·`checkout --`를 쓰지 않는다.
3. **상태 파일**: 시작 훅이 알려 주는 `.claude/state/<세션>.md`에 아래를 적고 단계마다 갱신한다.
   - 요청 원문: 위 "왜"와 0번의 사용자 결정
   - 시작 SHA: `git rev-parse HEAD`. `check:fast --base`에 쓴다.
   - 체크리스트: 아래 0~11
   - 실측 수치와 실패한 시도
4. **줄 번호 다시 재기**: 이 문서의 줄 번호는 2026-10-15 main `7160fc43a` 기준이다. 고치기 전에 `grep -n`으로 다시 확인한다.

### 작업 규칙

- **커밋**
  - 항목당 커밋 하나.
  - 검증한 파일만 경로를 적어 `git add`한다. 그 전에 `git status`와 `git diff --stat`을 본다.
  - 메시지 끝줄: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
- **push·배포**
  - 안정 시점에 `git push origin main`. push는 스테이징 배포까지다.
  - 프로덕션은 `.github/workflows/cloudflare-pages-deploy.yml`을 `mode=production`으로 수동 실행해야 한다. 사용자의 명시적 1회 승인 때만 한다.
  - push 뒤 CI를 기다리지 않는다. 다음 push나 최종 보고 직전에 main CI를 한 번 확인한다.
- **워크트리를 썼다면 마무리** (아래 순서대로)
  1. main 체크아웃에서 일반 `git merge <브랜치>`를 하고 `git push origin main`. squash·PR은 쓰지 않는다.
  2. 정션부터 끊는다: `(Get-Item -LiteralPath '<워크트리>\node_modules' -Force).Delete()`. 본 저장소 `node_modules`를 지키기 위해서다.
  3. `git worktree remove --force <워크트리>`, 이어서 `git branch -d <브랜치>`
- **사이트맵 원장**
  - 페이지가 import하는 컴포넌트를 바꾸면 `config/sitemap-lastmod.json`의 서명이 바뀐다. 그러면 `verify:sitemap-drift`가 실패한다.
  - `npm run sitemap:generate`, 이어서 `node scripts/generate-sitemap.mjs --check`를 돌리고, 원장 변경을 같은 커밋에 담는다.
  - 병합 충돌이 나면 `git checkout --theirs config/sitemap-lastmod.json`으로 받은 뒤 다시 생성한다.
- **실행 환경 (Windows)**
  - **개발 서버와 테스트**
    - mock 개발 서버: PowerShell에서 `$env:MOCK_DEV_PORT='14330'; npm run dev`를 백그라운드로 띄운다.
      - 끝나면 포트를 쥔 프로세스가 내 것인지 확인한다.
      - 내 것이면 그 트리만 `taskkill /T /F /PID <pid>`로 끈다.
    - `__tests__/ui/*`는 jest가 무시한다. `node --test <파일>`로 돌린다.
    - jest 일부만 돌릴 때는 `node scripts/run-mock-tests.mjs jest <파일...>`. `npx jest`는 테스트를 0개 찾은 적이 있다.
    - 변경 기반 검사: `npm run check:fast -- --base=<시작 SHA>`. paid-gate-suite를 포함하고 6~9분 걸린다.
    - `npm run verify:public-mirror-fresh`는 깨끗한 트리가 필요하다. 커밋한 뒤에 돌린다.
  - **셸과 스크립트**
    - python이 없다. 스크립트는 `node -e`로 쓴다.
    - Bash 도구는 호출마다 cwd가 초기화된다. `cd /d/Development/code-destiny && ...`로 시작한다.
    - scratchpad에서 playwright를 쓰면 `NODE_PATH=D:/Development/code-destiny/node_modules`를 준다.

### 지켜야 할 제약 (CLAUDE.md와 사용자 지시 요약)

- **과금·결제**
  - 과금 LLM 검증 금지. mock이 기본이고, 실호출은 정확한 1회 승인이 필요하다.
  - 실결제·운영 DB 쓰기·환불·정산 금지.
  - 가격(`worker/lib/paid-feature-registry.js`), 결제·권한 흐름, 결과 JSON 스키마를 바꾸지 않는다.
- **파일·비밀정보**
  - 수정 금지: `.env*`, `package-lock.json`, `.wrangler/`, `dist/`, `out/`, 마이그레이션 결과물, `worker/wrangler.toml` 구조.
  - 비밀정보 출력·저장·커밋 금지.
- **삭제 범위**
  - 요청 밖 기능·라우트·콘텐츠를 지우지 않는다.
  - 다른 세션의 워크트리·문서·파일은 지우지 않고 보고만 한다.
- **아트와 분량**
  - 캐릭터 아트는 실제 에셋(`yeon/base.webp`)을 첨부해 그리고, 원본과 나란히 놓고 비교한다.
  - 유료 LLM 분량 기준은 목표로만 쓴다. 결제 뒤 전달 성공이 최우선이다.
- **보고**
  - 사용자에게는 한국어로 짧게 진행 상황을 알린다.
  - 끝나면 한국어로 최종 보고한다: 한 일, 검증, 남은 일, 후속 항목.

### 따라 할 패턴 (전문가 캐릭터 작업, main `32a977224`)

- 캐릭터 데이터: `src/features/expert-characters/{types,index,lines,yun,musung,hanbi}.ts`
- 무대: `app/components/expert-consulting/ExpertCharacterStage.tsx`와 `.module.css`
- 프레임 테마: `ExpertConsultationFrame.tsx`와 `.module.css`
- 워커 페르소나
  - `worker/lib/expert-character-personas.js`
  - `worker/lib/expert-character-persona-text.js`
  - CMS 키는 `worker/lib/cms-prompt-defaults.js`에 등록한다.
- 마스터 프로필: `components/fortune/{MasterProfile.tsx,master-profiles.ts,master-profile.module.css}`, `public/images/master-profiles/provenance.json`
- 테스트
  - `__tests__/ui/expert-characters-data.test.js` (node --test)
  - `__tests__/worker/expert-character-personas.test.js` (jest)
- 상세 히어로와 아트 원장
  - `content/product-details/<id>/panels.cjs`를 고친 뒤 `node scripts/render-crafted-detail.cjs <id>`로 렌더한다.
  - 원장: `docs/design/fortune-detail-art.jsonl`

## 확정된 결정

- **상세 카피는 실제 동작에 맞춘다.** 사용자 결정(2026-10-15): "문구를 실제 동작에 맞추는 쪽".
  - 목적 선택 UI는 새로 만들지 않는다.
  - 작업은 아래 0번이다.

- 기준 연이는 **소설 캐주얼 연이**(사용자 선택 "소설 캐주얼 연이 (추천)")다.
  - 정체성 참조: `public/images/novel/remaster/yeon/base.webp`. 꽃무늬 블라우스, 분홍 웨이브 머리, 꽃 장식이 특징이다.
  - 찻집 한복 연이(`public/images/master-profiles/yeoni-teahouse-*`)와 돼지 폼은 쓰지 않는다.
  - 기존 `masterProfiles.yeoni`(`components/fortune/master-profiles.ts`)는 찻집 한복 버전이다. 그래서 손금용 항목은 새 키로 따로 만든다.
- 새 아트는 실제 에셋(`yeon/base.webp`)을 첨부해 그리고, 원본과 나란히 놓고 비교한다.
- 표정 스프라이트는 `public/images/novel/remaster/yeon/`에 있는 것을 재사용한다.
  - 있는 파일: angry, base, cry, disappoint, fear, left, onigiri, right, sideL, sideR, sleep, smile
  - mood 매핑 제안(파일을 실제로 보고 확정할 것):
    - idle → base
    - greet → smile
    - thinking → sideL
    - reveal → right
    - caution → left
    - comfort → smile
    - error → disappoint
    - empty → sideR
  - 쓰지 않을 것: angry, cry, fear, sleep, onigiri. 상담 화면 톤과 맞지 않는다.
- 가격·결제·권한 흐름·결과 JSON 스키마는 바꾸지 않는다.

## 지금 상태 (2026-10-15 실측, 줄 번호는 이 날짜 기준)

- **라우트·클라이언트**: `app/palm-reading/`에 다음 파일이 있다.
  - `page.tsx`
  - `PalmReadingRouteClient.tsx`
  - `PalmDestinyMain.tsx`
  - `PalmLineOverlay.tsx`
  - `palm-hand-landmarks.ts`
  - `paid-result-recovery.ts`
  - `error.tsx`
- **엔진**: `lib/palm/`에 다음 파일이 있다.
  - `palm-map-engine.js`
  - `both-hands-comparison.js`
  - `palm-ui-state.js`
  - `interpretation-engine.ts`
  - `palm-narrative-mapper.ts`
  - 기타
- **워커**
  - `worker/routes/palm.js`
  - `worker/lib/palm-vision.js`: 비전 판독과 심층 상담 프롬프트
  - `palm-result-delivery.js`
- **가격**: 정본은 `worker/lib/paid-feature-registry.js:326`의 `palm-reading-general`이다. 100코인, 10,000원이다.
  - [2026-10-02 인수인계](2026-10-02-palm-reading-logic-and-token-cap.md)의 "50코인"은 지금 기준과 다르다.
  - 가격은 바꾸지 않는다.
- **결제 흐름**: `POST /api/palm/analyze` → `runBillingCoinGate` → `GET /api/palm/result`
  - 생성·저장은 결제 전에 끝난다. 의도된 설계다.
  - POST는 메타 정보만 돌려준다. 2026-10-03 0번 항목에서 이렇게 정했다.
- **테스트**
  - `__tests__/palm/{both-hands-comparison,palm-map-engine-requirements,palm-ui-requirements}.test.js`
  - `__tests__/worker/palm-paid-delivery.test.js`
  - `__tests__/ui/palm-paid-result-recovery.test.js`
- **verify 스크립트**
  - `scripts/verify-palm-flow.mjs`
  - `verify-palm-mobile-payment-recovery.mjs`
  - `verify-palm-dev-module-boundary.mjs`
  - `verify-crafted-palm.cjs`
- **상세 페이지**
  - 원고: `content/product-details/palm-reading/panels.cjs`
  - 히어로: `public/images/feature-details/palm-reading-hero-v2.webp`
  - 상세 카피: `index.html` `FEATURE_MARKETING_COPY['palm-reading']`(L37991)와 `FEATURE_VISUAL_DETAILS['palm-reading']`(L35871), 로케일 사전 `public/i18n/*.json` `featureMarketing.palm_reading`

## 남은 작업 (순서대로, 항목당 커밋 하나)

### 카피 — 가장 먼저 (독립·저위험, 워커 변경 없음)

- [x] **0. 상세 카피를 실제 동작에 맞춘다.** — 완료 `ff0d0068e`
  - 사용자 결정(2026-10-15): "문구를 실제 동작에 맞추는 쪽"
  - 목적 선택 UI는 만들지 않는다.
  - 연이 훅과 아트 교체는 11번에서 한다. 0번은 사실 정정만 한다.
  - **사실** (2026-10-15 실측, main `7160fc43a`)
    - 목적 선택 UI가 없다.
      - `PalmDestinyMain.tsx:1621`의 `setAnalysisPurpose`는 `:1830`에서 기본값 `general`로 되돌릴 때만 쓰인다.
      - 결제 하위키도 `general` 하나다(`:232-236` 주석).
    - 한 손만 올려도 분석된다.
      - 근거: `:2988-2993`, `app/palm-reading/_lib/copy.ts:987` "한 손만 등록해도 분석됩니다."
      - 왼손·오른손 비교(`bothHandsComparison`, `:3489`)는 양손을 올렸을 때만 나온다.
    - 분량이 다르다.
      - 카피는 "1,200자를 목표로"라고 말하고, 영어 사전은 "at least 1,200 characters"라고 보장한다.
      - 실제 워커 목표는 3,000~4,000자다(`worker/lib/palm-vision.js:25-26`).
      - 전달 하한은 120자다(`:30`).
    - 고민을 받는 입력란이 없다. 그런데 카피 일부가 "지금 고민"을 축으로 읽어 준다고 읽힌다.
    - 맞는 주장은 그대로 둔다.
      - 주장: 주요선 4개, 보조선 9종, 손바닥 언덕 7구, 특수 문양 6종
      - `palm-vision.js`의 `majorLines`·`minorLines`·`mounts`·`specialMarks`와 일치한다.
  - **고칠 곳**
    1. `index.html` `FEATURE_MARKETING_COPY`(L37874 시작)의 `'palm-reading'` 항목. 한 줄짜리이고 L37991에 있다. 고칠 필드 경로는 아래와 같다.
       - 목적 선택 주장
         - `feats[4]`
         - `unlockBenefits[2]`
         - `recommendedFor[2]`
         - `analysisSteps[0].detail`, `analysisSteps[3].detail`
         - `valueCompare.rows[2]`: axis "목적 반영"과 premium
         - `receives[3]`: 🎯 "목적 맞춤 해석"
         - `outline[0]`: title "사진 업로드와 목적 선택"과 detail
         - `outline[3].detail`
       - "양손 사진을 올리고": `analysisSteps[0].detail`, `outline[0].detail`
       - 분량: `subheadline`, `feats[5]`, `unlockBenefits[3]`, `valueCompare.rows[1].premium`, `receives[4]`, `analysisSteps[3].detail`, `outline[3].detail`
       - 고민 축 암시
         - `painPoints[2]` "내 손금이 지금 고민과 어떻게 닿는지 알고 싶을 때"
         - `answersQuestions[2]` "지금 고민과 닿는 선은 어디인가요?"
    2. `index.html` `FEATURE_VISUAL_DETAILS`(L34198 시작)의 `"palm-reading"`(L35871). 고칠 곳은 `contents[0].title` "사진 업로드와 목적 선택"(L35883)이다.
    3. 11개 로케일 사전 `public/i18n/{de,en,es,fr,hi,ja,ms,nl,vi,zh-cn,zh-tw}.json`의 `featureMarketing.palm_reading`
       - 1번과 같은 경로를 같은 뜻으로 고친다.
       - `ko.json`에는 이 네임스페이스가 없다. 한국어 정본은 셸이다.
       - 사전을 빠뜨리면 셸 `_pvwTrKeep`이 옛 번역을 그대로 내보낸다.
    4. 생성물은 손으로 고치지 않는다. `npm run sync:public`이 다시 만든다.
       - `lib/marketing/feature-marketing-copy.generated.json`
       - `public/feature-details/palm-reading.json`
       - 미러 `public/index.html`과 `public/{en,ja,zh,zh-tw,ggulggul,static}/index.html`
    5. 확인만 했다. 목적·분량 주장이 없다(2026-10-15 grep).
       - `content/product-details/palm-reading/{panels.cjs,한글-원고.md}`
       - `app/palm-reading/page.tsx`의 `PALM_READING_METADATA_COPY`
  - **고쳐 쓰는 방향** (예시다. 최종 문장은 실행 세션이 다듬는다)
    - 목적 맞춤을 "한 번에 받는 종합 해석"으로 바꾼다.
      - 예: `feats[4]` "선·언덕·문양을 함께 묶어 하나의 종합 상담문으로 풀이합니다"
    - `receives[3]`은 실제로 있는 결과로 바꾼다.
      - 예: "양손 비교" — "양손을 올리면 타고난 손과 살아온 손의 차이를 함께 풀이합니다"
      - `valueCompare.rows[2]`도 같은 축으로 바꾼다.
      - 양손일 때만 나온다는 조건을 문장에 남긴다.
    - 업로드 단계 예: "한 손 또는 양손 사진을 올립니다. 양손이면 두 손의 차이까지 봅니다."
    - 분량
      - 보장형 표현("이상", "at least")을 쓰지 않는다.
      - 숫자를 쓰면 워커 목표 `PALM_CONSULT_MIN_CHARS`(3,000)에 맞춰 "3,000자 안팎을 목표로"처럼 쓴다. 숫자를 빼도 된다.
    - 고민 축 두 줄은 고민을 입력받는다고 읽히지 않게 다듬는다.
      - 예: "내 손금이 어떤 성향과 흐름을 보여 주는지 알고 싶을 때"
  - **바꾸지 않는 것**
    - `PALM_BILLING_SUB_FEATURE_KEY = "general"`
    - `AnalysisPurpose` 타입과 `purposeLabel*` 문구. 결과 화면 `:1724`가 "종합" 라벨로 쓴다.
    - 워커, 가격
  - **검증**
    ```
    npm run sync:public
    npm run verify:feature-marketing-dictionary
    npm run verify:feature-marketing-schema
    node scripts/verify-home-service-registry.mjs
    node --test __tests__/ui/feature-marketing-copy-generated.static.test.js
    grep "'palm-reading':{featureId" index.html | grep -c -E "목적|고른|1,200"     # 0
    git grep -n "사진 업로드와 목적 선택" -- index.html lib/marketing public/feature-details   # 0건
    node -e "for(const l of ['de','en','es','fr','hi','ja','ms','nl','vi','zh-cn','zh-tw']){const s=JSON.stringify(require('./public/i18n/'+l+'.json').featureMarketing.palm_reading);if(/1,200|1200|1.200/.test(s))console.log(l)}"   # 출력 없음
    git grep -n -i -E "consultation purpose|at least 1,200" -- public/i18n/en.json   # 0건
    # 커밋 뒤(깨끗한 트리 필요)
    npm run verify:public-mirror-fresh
    ```
    - 생성 미러 diff가 크다(미러 7개). 생성 미러 때문에 위험 등급을 올리지 않는다(CLAUDE.md).
    - 화면 확인: mock 개발 서버에서 손금 상세 팝업을 한국어와 영어로 열어 본다.

### 로직 — 카피 다음, 워커 테스트와 함께

- [x] **1. 점수 예시값 앵커링 제거 + 채점 루브릭.** — 완료 `83556bff1`
  - `palm-vision.js:117`의 JSON 예시 `"scores": { "love": 75, "career": 80, ... }`와 `:131`의 `"palmCoverage": 0.85`가 실제 값처럼 복사될 수 있다.
  - 예시는 자리표시(`0-100`)로 바꾸고, 점수 구간별 판정 기준을 프롬프트에 둔다.
  - 판정 기준: mock 응답 고정 테스트가 예시값과 같은 점수를 "정상"으로 보지 않는다.
- [x] **2. 과단정 규칙을 연이 캐논에 맞춘다.** — 완료 `6abfa49a2`
  - 원인 위치
    - `:55` 비전 시스템 프롬프트("최고 수준의 손금 판독 전문가")
    - `:606` 심층 상담 프롬프트("30년 경력의 손금 상담 전문가")
    - `:611` "~할 수도 있습니다 같은 애매한 표현 대신 ~하세요로 쓰세요"
  - 고치는 방향
    - 연이 캐논을 따른다(`worker/yeongnyangi/prompts/persona/yeoni.ts:5`: 공포 조장, 금전·건강 확정 예언 금지).
    - 관찰한 선은 분명하게 말하고, 결혼·인연(`:624`), 건강·활력(`:627`), 향후 변화(`:630`)는 가능성과 행동 제안으로 쓴다.
    - 18개 ■ 섹션 형식과 분량 계약은 그대로 둔다(10-02 5번).
  - 페르소나 블록은 `worker/lib/expert-character-personas.js` 방식으로 덧붙인다.
    - "30년 경력"과 `:611` 규칙이 페르소나와 충돌하니 함께 고친다.
    - 덧붙이는 방식: `resolveSystemPrompt` 결과 **뒤에** 붙이고, CMS 키를 `cms-prompt-defaults.js`에 등록한다.
- [x] **3. 종결 부호 하나 때문에 심층 상담이 통째로 실패한다.** — 완료 `49480252b`
  - 실패 경로
    - `palm-vision.js:693`은 본문이 `[.!?。？！]`로 끝나지 않으면 `null`을 돌려준다.
    - 그러면 `palm.js:546-547`이 `PALM_INTERPRETATION_INCOMPLETE`(503)를 낸다.
    - 결제 전 단계라 과금은 없지만, 사용자는 다시 시도해야 한다.
  - 고치는 방향: 전달 우선 원칙(CLAUDE.md 원칙 17)에 따라, 120자 이상이면 마지막 완결 문장까지 잘라 전달한다.
  - `PALM_CONSULT_FALLBACK_MIN_CHARS = 120` 리터럴은 유지한다(아래 함정).
- [x] **4. 좌우 손 판정 3중 모순.** — 완료 `ebf9e64bc`
  - 서로 다른 세 출처
    - 프롬프트는 "이 사진은 {왼손|오른손} 바닥입니다"라고 단정한다(`:159`).
    - 정규화는 모델의 `imageQuality.handSide`를 사용자 입력보다 우선한다(`:579`).
    - 클라이언트에는 MediaPipe `handedness`(`palm-hand-landmarks.ts:39`, `PalmDestinyMain.tsx:731`)가 따로 있다. 셀피 카메라는 좌우가 뒤집힌다는 점도 고려한다.
  - 고치는 방향: 셋을 비교해 불일치를 표시하고, 조용히 덮어쓰지 않는다.
- [x] **5. 손바닥 판정 강화.** — 완료 `4171becfc`
  - 약한 지점
    - `:541`: 모델이 `palmDetected`를 빼도 선 키가 하나라도 있으면 `true`로 추론한다.
    - `palm.js:197`: 품질 게이트가 `qualityByImage || hasMajorLines`, 즉 OR다.
    - `PalmDestinyMain.tsx:520`: 클라이언트 `palmLikely`는 가로세로 비율(0.55–1.75)만 본다.
  - 판정 기준: 손이 아닌 사진 mock이 판독 결과로 이어지지 않는다.
- [x] **6. 기본 문구가 유료 본문에 섞인다.** — 완료 `efea3268c`
  - `palm-vision.js:239` `minorLine`의 기본 요약(`:355` "결혼선을 분석했습니다.", `:357` "건강선을 분석했습니다." 등)이, 모델이 필드를 뺀 경우에도 본문에 들어갈 수 있다.
  - 기본값으로 채운 필드는 본문에서 빼고, "선별 불확실성"으로 심층 상담 입력에 넘긴다.
- [x] **7. 서버가 locale을 무시한다.** — 완료 `ba1ffba50`
  - `worker/routes/palm.js`에는 `locale` 참조가 하나도 없다.
  - 오류 문구(`:58` 413, `:252` 400 외)와 두 프롬프트가 한국어로 고정돼 있다. 클라이언트 문구는 로케일별로 있다.
  - 한국어 기본값은 그대로 두고, 클라이언트가 보낸 locale을 받아 오류 코드별 문구와 출력 언어 메모를 정한다.
- [x] **8. 오버레이 선과 판독이 어긋난다.** — 완료 `ce163b5fe + 819280185`
  - 원인
    - 오버레이는 고정 비율 가이드(`PalmDestinyMain.tsx:606-614` `fromPalm(...)`) 주변을 샘플링해서 그린다.
    - 신뢰도 하한이 0.2로 묶여 있다(`:943` `Math.max(0.2, ...)`). 그래서 판독에서 "확인 안 됨"인 선도 화면에 그려질 수 있다.
  - 고치는 방향: 판독 결과에서 `detected:false`인 선은 그리지 않거나, 점선으로 구분한다.

### 아트 — 로직 다음

- [x] **9. 새 아트.** 모두 `yeon/base.webp`를 첨부해 그리고, 원본과 나란히 비교한다. WebP q87–90. — 완료 `542e43172`
  - 키아트 16:9·4:5: 밝은 정원이나 창가에서 손바닥을 들여다보는 장면
  - 촬영 가이드 스팟 일러스트
  - 상세 히어로 `public/images/feature-details/palm-reading-hero-v3-yeoni.webp`
    - v2는 덮어쓰지 않는다.
    - `docs/design/fortune-detail-art.jsonl`에 줄을 추가한다.
  - 마스터 초상 600x720(q87)·시트 1536x1024(q90)
    - `public/images/master-profiles/provenance.json`에 기록한다.
  - 말하기 프레임: base와 같은 캔버스·머리 위치

### 라이트 UI

- [x] **10. 연이 정원 라이트 팔레트로 재스타일.** — 완료 `ef45e71c1`
  - 팔레트(`DESIGN.md` 「연이 정원 홈」 절)
    - 아이보리 `#fff9f4`
    - 분홍 표면 `#f8e4ea`
    - 주색 `#b53660`
    - 글자 금색 `#7e6028`
  - 글자 대비 4.5:1 이상. 가드는 `__tests__/ui/yeoni-garden-tokens.static.test.js`다.
  - 캐릭터 무대: `ExpertCharacterStage`를 재사용한다.
    - `src/features/expert-characters/types.ts`의 `ExpertCharacterKey`에 연이 키를 추가한다.
    - `yeoni.ts` 데이터 모듈을 둔다. `yun.ts` 패턴을 따르고, `enabled` 롤백 스위치를 둔다.
  - 무대 배치 위치
    - 업로드 안내
    - 촬영 가이드
    - 로딩: 실제 단계에만 연결하고, 시간 기반 가짜 진행은 만들지 않는다.
    - 오류: 기존 사실 문구 **앞에** 한 줄을 넣는다.
    - 결과 표지·끝맺음
  - `PalmLineOverlay.tsx`의 선 색을 라이트 배경에 맞춰 다시 잡는다.
  - 소설 말투 표지("꿀악!", 별점)는 UI 대사에서만 아껴 쓴다. 상담 본문에는 쓰지 않는다.
  - 공통 완료 기준([전문가 UX](expert-consulting-premium-ux-2026-09-08.md))을 지킨다: 44px 컨트롤, safe-area, 가로 넘침 없음.

### 마케팅·노출

- [x] **11. 상세·허브·OG.** — 완료 `90e4e36e0`
  - 상세 원고(`panels.cjs`)의 히어로를 v3로 바꾸고 첫 패널 카피를 연이 훅으로 쓴다.
    - 렌더: `node scripts/render-crafted-detail.cjs palm-reading`
    - `FEATURE_VISUAL_DETAILS['palm-reading']`를 바꾼 뒤 `npm run sync:public`을 돌린다.
  - OG 이미지 교체: `app/palm-reading/page.tsx:39`가 동물상 이미지(`fuctionassets/ai%20animal.webp`)를 쓰고 있다.
  - 홈 타일 `index.html:16186`(`home.tiles.palmMapMeta`): 유료 상품인데 무료 배지 스타일 `tarot-tile__coin-badge--free`(초록)가 붙어 있다.
  - 목적 선택·한 손·분량 카피 정정은 0번에서 끝낸다(사용자 결정). 여기서는 0번에서 바로잡은 사실 위에 연이 훅만 얹는다.

## 함정 ([2026-10-02 인수인계](2026-10-02-palm-reading-logic-and-token-cap.md)에서 이어짐)

- `scripts/verify-palm-flow.mjs`는 소스 리터럴을 단언한다.
  - 비전 호출 블록의 `geminiParts: parts`, `fallbackToWorkersAI: false`
  - `PALM_CONSULT_FALLBACK_MIN_CHARS = 120`
- `verify-llm-generation-resilience.mjs`는 `palm-vision.js`의 LLM 호출부가 정확히 2개라고 센다. 페르소나를 붙여도 호출 수는 늘리지 않는다.
- `__tests__/fixtures/paid-non-llm-delivery-fixtures.mjs`는 `palm.js`의 주석 "구 palm-reading-ai-consult(별도 5,000원 과금)가 하던 일을 기본 분석에 통합했다"를 마커로 쓴다. 이 주석은 지우지 않는다.
- 비전은 `fallbackToWorkersAI:false`를 유지한다.
- `normalizeNarrativeBody`는 문장부호 없는 문단을 버린다. ■ 제목 줄 형식을 바꾸면 mock으로 확인한다.
- `worker/`를 고치면 CI가 critical 티어로 돈다.
- 과금 LLM 검증은 금지다. mock이 기본이고, 실호출은 정확한 1회 승인을 받은 뒤에만 한다.

## 검증

```
npm run verify:palm-flow
npm run verify:palm-mobile-payment-recovery
node scripts/verify-llm-generation-resilience.mjs
node scripts/verify-palm-dev-module-boundary.mjs
node scripts/run-mock-tests.mjs jest __tests__/palm __tests__/worker/palm-paid-delivery.test.js
node --test __tests__/ui/palm-paid-result-recovery.test.js __tests__/ui/yeoni-garden-tokens.static.test.js
node scripts/verify-crafted-palm.cjs   # 개발 서버 127.0.0.1:14330 필요
npm run check:fast -- --base=<시작 SHA>
```

- 수동 확인
  - mock 개발 서버에서 360/390/430/1440 폭을 본다.
  - 업로드·촬영 가이드·로딩·오류·결과·재열람 화면에서 무대 흔들림, 오버레이 대비, 44px CTA를 확인한다.

## 모르는 것

- 실제 운영에서 `:693` 종결 부호 때문에 실패하는 비율. `PALM_INTERPRETATION_INCOMPLETE` 로그로 확인한다.
- MediaPipe `handedness`가 셀피 미러링을 거친 뒤 얼마나 맞는지. 실기기 표본이 필요하다.
- 손금 심층 상담 프롬프트에 관리자 CMS 덮어쓰기가 있는지. 운영 CMS에서 확인해야 한다.
