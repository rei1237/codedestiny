---
status: active
updated: 2026-10-05
next: "1단계(점수·유형 출처 통일 설계)부터 — 아래 '시작 전 확인'을 먼저 실측하고 진행."
---

# 최애운명 K-POP 케미 개편 — 남은 한계 개선 + 기존 엔진 살리기

다음 세션 첫 문장: **"docs/handoff/destiny-bias-kpop-followups-20261005.md 를 읽고 next 단계부터 이어서 진행해"**

## 요청 원문 (2026-10-05)

> 새 세션에서 남은 한계 부분에 대해서 개선해야할것 같고 기존 엔진에서 살릴 수 있는 부분은 살리도록해줘
> 인수인계 문서 만들어서 작업해야할것 같다

## 지금까지 (세션 e3e61482, main 반영·CI 통과, 운영 승격 안 함)

- 마지막 main SHA: `2de32e0c0` (PR CI run 37255975940 `CI required` success). `0350aeb14` 는 CI 실패본(meta 설명 폭) — 기준으로 쓰지 말 것.
- 주요 커밋: A 로스터 `154004795` / B 엔진 `d029f0f1c` / C 카피 `8967c1d2f` / D 자산 `c0f16971f` / E UI `8fab451de` / F 공유 API / G 공유 랜딩 / K1 브리지 / K2 `91e94bee4` / K2-art+K3 `f7d8634b0` / K4 카피 `9ffba90e2` / H 홈 카드 `3b2defeb3` / I 본문 `e67b19203` / J 삭제 `d8c8978da`.
- 구조 요약:
  - 새 엔진 `lib/idol-chemi/`(연·월·일주, 9유형, 근거 신호, 카피 풀 `COPY_VERSION chemi-copy-2.0.0`). 서버 공유 스냅샷도 이걸로 재계산.
  - 기존 클라이언트 엔진 `app/saju/destiny-bias/engine/`(`destinyBiasEngine.ts` `analyzeDestinyBias`, `favoriteDestinyReading.ts` 세부 6종·총점, `destinyBiasMeta.ts` 등급).
  - 둘을 묶는 브리지 `app/saju/destiny-bias/engine/chemiReportBridge.ts` → `{result, copy, vm, totalScore, subScores[6], grade, gradeTitle, serial, issuedAt}`.
  - 계획 정본(이전): `C:\Users\user\.claude\plans\pasted-content-id-96d7-joyful-wilkes.md`.

## 사용자 확정 (재질문 금지)

비로그인 허용 / 전부 결정론(LLM 없음) / 프리셋 295 유지 / 주소 유지 `/saju/destiny-bias`, 공유 `/saju/destiny-bias/share/?s=<id>` / 점수·등급 전부 표시 / 사진 업로드는 기기 안에서만(저장 이미지에만, 공유 파일·링크엔 없음) / 무드·테마·사진은 결과 뒤 「포카 꾸미기」 / 페이지 전체 밤 콘서트 무대 디자인.

불변 제약: 생일은 카드·URL·저장 문서·localStorage·분석 이벤트에 넣지 않음. 한쪽이라도 만 19세 미만이면 우정·팀워크 표현만, 만 14세 미만 차단. 실존 인물 얼굴·로고 그림 금지(가상 실루엣만). 로컬 API 는 실 DB 에 붙으므로 Playwright 는 `/api/*` 를 반드시 가로챈다.

## 남은 한계 → 할 일 (단계 = 커밋)

### 1. 점수와 유형의 출처 통일 (핵심, RED)
- 현상: 점수·등급·세부 6종은 기존 엔진(일주·연주 중심), 9유형은 새 엔진(연·월·일주). 같은 결과 안에서 "점수는 높은데 유형은 '다른 결'"처럼 어긋날 수 있다.
- 방향(추천): 점수 계산은 기존 엔진 식을 살리되 **입력을 새 엔진 명식(`lib/idol-chemi/engine/pillars.js`)으로 통일**하고, 유형 신호(합·충·상생 등)가 세부 점수에 같은 방향으로 반영되는지 표로 대조한다. 순수 함수로 `lib/idol-chemi/` 쪽에 옮기면 서버도 같은 점수를 낼 수 있다(2단계 전제).
- 검증: 295 프리셋 × 생일 표본으로 유형별 총점 분포(유형 간 역전 비율) 실측 → 보고. 결정성 jest. `chemiIndex:null` 기존 테스트 계약을 바꾸면 같은 커밋에서 갱신.

### 2. 공개 공유 링크에 점수·등급 싣기
- 현상: 공유 랜딩은 서버 재계산 유형 + 한 줄만. 점수는 서버 재계산 경로가 없어 뺐다.
- 1단계로 서버가 같은 점수를 재계산할 수 있으면 `worker/routes/destiny-bias.js:252~`(공유 스냅샷) 저장 모델에 `score`·`grade` 를 **서버 재계산값**으로 추가(클라이언트 값 신뢰 금지). `worker/lib/models.js:1841` 스냅샷 스키마, `__tests__/worker/destiny-bias-share.test.js` 갱신.

### 3. 결과별 OG 이미지
- 기존 자산 재사용 후보: `worker/routes/destiny-bias.js` 의 `buildDestinyBiasOgSvg`(title·score·grade·relation 쿼리, 옛 네이비 디자인) 와 `worker/lib/destiny-bias-share-og.js`(workers-og PNG). 공유 랜딩 `app/saju/destiny-bias/share/page.tsx:8` 은 지금 정적 `og-default-1200x630.png` 고정.
- 방향: 공유 id 로 OG PNG 를 무대 디자인으로 렌더(생일·사진 없음), 크롤러용 바운스 HTML 이 필요한지 먼저 확인(정적 export 라 page 메타는 id 별로 못 바꾼다).

### 4. 기존 엔진에서 살릴 수 있는 것 (조사 → 선별 → 복원)
조사 대상: `app/saju/destiny-bias/engine/*.ts`, `app/saju/destiny-bias/components/Bias*.tsx`, `lib/destinyBiasCopy.ts`, `lib/destinyBiasTheme.ts`, 서버 `worker/lib/destiny-bias-engine.js`(`buildDestinyBiasAnalysis:1269`, `buildDestinyBiasCanonical:1330`, `buildRuleBasedDestinyReport:1345`, 테마 프리셋 `:162`).
이미 복원됨(K1~K3): 총점·세부 6종·등급, 아우라·에디션·페어링 별칭·팬사인, 오행 분포, 5탭, 팬덤 리포트 20필드, MZ 레이어(케미 4글자·전생 썰·등급 밈·해시태그), 테마 5종·무드·사진.
남은 후보(사용 여부 실측 필요):
- `BiasDestinyHero.tsx` + `BiasDestinyAlbumStage.tsx` + `app/saju/destiny-bias/lib/destinyBiasAlbumAssets.ts` + `components/DestinyBiasLoadingScreen.tsx` — 현재 임포터 0(꽃돼지 무대). 살릴 장면이 있으면 새 무대 아트로 옮기고, 없으면 deletion-auditor 3면 확인 후 한 커밋으로 삭제.
- `engine/birthEnergy.ts` 의 `getSeasonEnergy`·`getBirthNumberEnergy`·`getNameHashEnergy`(172·187·201행) — compatibilityScore 삭제로 사용처 0.
- 서버 `buildRuleBasedDestinyReport` 의 규칙 리포트 문장 — 공유 랜딩 공개 요약 보강 후보(생일 미포함 확인).
- 최근 결과 목록에 등급·총점 표시(localStorage, 생일 없음), X·인스타 공유를 공유 바 「더 보기」로(구 `DestinyBiasActionBar` 핸들러).

### 5. 화면 다듬기
- 공유 랜딩 `/saju/destiny-bias/share/` 를 밤 무대 톤으로(지금은 이전 톤).
- 홈 카드 390 폭: 실루엣이 버튼 오른쪽 끝·부제 끝에 붙음(`styles/home-funnel.css` `.cdh-chemi__art` 모바일 `object-position`). 수정 후 `npm run sync:public` 미러 커밋.
- 정사각 공유 카드: 카드 안과 오른쪽 열에 페어·점수·유형이 중복(`app/saju/destiny-bias/share-card.module.css`).
- 결과 화면 고정 뒤로/홈 버튼이 스크롤 콘텐츠와 겹침, 1280 점 배경 격자, 레거시 리포트 카드의 흰 테두리·이모지.
- `CodeDestinySerifKR` 이 헤디드에서 `document.fonts.check` false(미조사).
- 하단 안내 네이비 블록은 `app/components/ServiceIntroSection.tsx`(공유 컴포넌트, 수정 금지) — 감싸는 래퍼로만.

### 6. 로스터 v2 (선택)
RIIZE·ILLIT·BABYMONSTER·NMIXX 추가(`lib/idol-chemi` 로스터 + 검증기). 생일 출처 확인된 멤버만.

## 시작 전 확인
1. `git branch --show-current`·`git status`·`git pull --ff-only`. 루트 체크아웃에 다른 세션 미커밋이 있으면 `scripts/create-safe-worktree.ps1` 로 워크트리.
2. `git log --oneline 2de32e0c0..origin/main -- app/saju/destiny-bias lib/idol-chemi worker/routes/destiny-bias.js worker/lib/destiny-bias*` — 다른 세션이 저장 리포트 쪽을 고친 적 있음(`be1f7732a`, `a9583e207`). 겹치면 먼저 읽는다.
3. 1단계 전에 브리지·두 엔진의 명식 계산 차이를 실측(같은 생일에서 일주가 같은지, 음력·자정 경계).

## 검증 명령 (이전 세션 실측으로 통한 것)
- `npx tsc --noEmit -p .` / `node scripts/run-mock-tests.mjs jest` / `npm run -s test:node` (메모리 부족 시 `check:fast` 안의 `npm test` 가 OOM 134 로 죽음 → 따로 실행)
- `npm run qa:destiny-bias-touch` / `node scripts/verify-profile-card-action-policy.mjs` / `npm run verify:hero-contrast`
- `npm run check:fast` (사이트맵 드리프트 걸리면 `npm run sitemap:generate`)
- meta 제목 폭 ≤60, 설명 폭 ≤160(한중일 2배) — `scripts/verify-adsense-readiness.mjs` 가 CI 빌드에서만 검사한다.
- 화면: `npm run dev`(25332) + 헤디드 Playwright 360/390/1280, `/api/*` 가로채기, 스크린샷은 visual-checker 로만 판정.

## 위험·롤백
RED(공유 API·저장 모델·점수 로직). 단계마다 커밋, 회귀 시 그 커밋만 `git revert`. 운영 승격은 별도 1회 승인 때만.
