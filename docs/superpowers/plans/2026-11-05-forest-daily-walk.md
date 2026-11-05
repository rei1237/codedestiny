# 오늘의 숲길 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 공개 홈 `/`의 다이어리 카드를 연이·영냥이가 안내하는 숲 입구 + 전체 화면 세 걸음으로 바꾸고 최신 main에 병합한다.

**Architecture:** `HomeDaily.tsx`의 로직을 훅(`useDailyJourney`)과 순수 함수(`forest-progress.mjs`)로 분리하고, 화면을 입구(`ForestGate`)와 걸음(`ForestWalk`)으로 나눈다. 저장은 기존 `DiaryStoreProvider`, 서버는 기존 API를 그대로 쓴다.

**Tech Stack:** Next.js 정적 export, React, CSS Modules, node:test, codex-image.

**Spec:** `docs/superpowers/specs/2026-11-05-forest-daily-walk-design.md`

## Global Constraints

- 새 보상·서버 원장·API·DB·결제·인증 변경 없음. 퀘스트 꿀방울 없음.
- 실결제·운영 DB 쓰기·과금 LLM 호출 없음. `.env*`, `package-lock.json`, `worker/wrangler.toml` 구조, `dist/`, `out/` 수정 없음.
- 새 색은 `--cd-forest-*`만. `dark:` 금지. 탭 44px, 입력 16px, 가로 넘침 없음. `prefers-reduced-motion` 준수.
- 연이: 존댓말, 호칭 "당신". 영냥이: 반말, 짧은 한마디만 `~냥`. UI 크롬: 해요체. 새 장식 이모지 금지.
- 스크린샷은 `.tmp/` 또는 D:\. docs에 PNG 커밋 금지.
- 토토로·지브리 이름, 화풍 지정 금지(프롬프트 포함).

## Review Focus

- 전체 화면을 연 채 새로고침하거나 해시로 진입: 같은 걸음이 다시 열리고 스크롤이 잠긴 채 남지 않아야 한다.
- 전체 화면에서 뒤로가기: 홈을 떠나지 않고 닫혀야 하며, 다시 열고 닫아도 history가 쌓여 꼬이지 않아야 한다.
- 입력 중 전체 화면 닫기 또는 걸음 이동: 한 줄 기록 초안이 사라지지 않아야 한다.
- 출석 API 실패·로그아웃 상태: 등불 영역만 안내로 바뀌고 실천·기록은 계속 쓸 수 있어야 한다.
- 자정(KST)을 넘긴 복귀, 저장소 손상·빈 값: 주간 지도가 예외 없이 그려져야 한다.

---

### Task 1: 설계·계획 커밋과 최신 main 병합

**Files:** `docs/superpowers/**`, `app/page.js`, 사이트맵 5종(재생성)

- [ ] 설계·계획 문서 커밋
- [ ] `git merge origin/main`. `app/page.js`는 main의 `HomeInstallEntry`, `HOME_QUICK_LINKS`, `StoryDiscovery`, 키워드를 살리고 `<HomeDailyEntry />`를 카드 바로 아래로 옮긴다
- [ ] `npm run sitemap:generate` 뒤 `npm run verify:sitemap-drift` 통과 확인, 병합 커밋

### Task 2: 진행 계산 순수 함수

**Files:** Create `app/components/forest/forest-progress.mjs`, `__tests__/ui/forest-progress.test.mjs`

**Interfaces — Produces:**
- `litLanternCount(streak, streakEvery, attended) -> number`: 기존 카드 수식과 동일
- `journeyStepsDone({ attended, questDone, hasRecord }) -> 0..3`
- `weekForestMap(todayYmd, readEntry, ext) -> [{ ymd, piece, isToday, filled }]` 길이 7, 월요일 시작. `readEntry`는 호출부에서 `(ymd) => readStoredEntry(store, ymd)`로 넘긴다
- `forestZoneForLevel(level) -> string`
- `dailyLine(ymd, step) -> { yeoni, yeongnyangi }`

- [ ] 실패 테스트 작성: 연속 출석 0, 4, 5, 10(출석 전후), 빈 저장소, 손상 값(null, 문자열), 월말·연말 주 경계, 음수·NaN 레벨, 같은 날 같은 대사
- [ ] `node --test __tests__/ui/forest-progress.test.mjs` 실패 확인
- [ ] 구현. 기록 판정은 `practiceNote || nightLog`가 공백이 아닐 때, 실천 판정은 `home-quest:` 접두 할 일의 `done`
- [ ] 통과 확인 후 커밋

### Task 3: 이미지

**Files:** Create `public/images/home/forest/*`, `docs/design/forest-walk-art.md`

- [ ] 숲 입구 이미지 1장 생성(원본 2종 첨부), 원본과 나란히 비교, 귀 2개 검수
- [ ] **사용자 톤 확인**. 수정 요청 시 반영
- [ ] 나머지 생성: 모바일 입구, 걸음 3장, 완주 1장, 조각 7종 시트
- [ ] avif/webp 변환(입구 200KB 이하 목표), 제작 기록 작성, 커밋

### Task 4: 훅 추출과 입구

**Files:** Create `useDailyJourney.ts`, `ForestGate.tsx`, `forest.module.css`; Modify `HomeDailyEntry.tsx`, `styles/theme-tokens.css`

**Interfaces — Produces:** `useDailyJourney({ surface, enabled }) -> { status, honey, progress, products, profile, busy, message, quest, picked, savedAction, attend, retry, selectQuest, rerollQuest, toggleQuest }`. API 호출과 trackEvent 동작은 `HomeDaily.tsx`와 동일하되, `enabled`가 true가 된 뒤에 로드한다.

- [ ] 입구 구현: `IntersectionObserver`로 `enabled` 전환, 이미지 lazy, h2 id 유지, 걸음 n/3, 등불 표시, CTA
- [ ] `/` 화면 확인(360/390/430/데스크톱), 커밋

### Task 5: 전체 화면과 인라인 걸음

**Files:** Create `ForestWalk.tsx`; Modify `ForestGate.tsx`, `app/diary/page.tsx`; Delete `HomeDaily.tsx`, `home-daily.module.css`

**Interfaces — Consumes:** `useDailyJourney`, `forest-progress.mjs`, `nextCardPageIndex`, `DiaryRecordCard embedded`, `DiaryMoodPicker`.
**Produces:** `<ForestWalk mode="dialog"|"inline" initialStep journey onClose />`

- [ ] `next/dynamic` 로드, `<dialog>` showModal, `#forest-walk` 해시 push/pop, 진입 해시 처리, body 스크롤 잠금 해제 보장
- [ ] 걸음 3개 + 완주 장면. 기존 안내 문구(꿀방울 미지급, 기기 저장, 사용처 details) 유지
- [ ] `/diary/`를 inline으로 교체, Flow/Self/Plan details 유지
- [ ] Review Focus 시나리오를 mock 브라우저로 확인, typecheck, 커밋

### Task 6: 재미 요소

**Files:** Modify `ForestWalk.tsx`, `ForestGate.tsx`, `forest.module.css`

- [ ] 등불 켜짐 애니메이션, 꿀단지 표시, 숲 구역 이름, 경험치 막대 갱신
- [ ] 주간 숲 지도와 "기념 조각" 문구, 완주 이벤트 `daily_home_walk_completed`, 입구 `daily_home_forest_opened`. `verify:analytics-events` 확인
- [ ] 화면 확인, 커밋

### Task 7: 정본 갱신과 검증

**Files:** `docs/context/design-canon.md`

- [ ] 60·89행 `/` 구성 갱신(2026-11-05 사용자 승인)
- [ ] `npm run check:fast -- --plan`, `npm run check:fast`, 커밋된 트리에서 `npm run check:pre-push`
- [ ] 스펙 검증 목록을 mock 브라우저로 수행, `verify-home-entry-locale.cjs`, LCP가 카드 이미지인지 확인
- [ ] 전체 브랜치 코드 리뷰(새 에이전트 1회)

### Task 8: 전달 (게이트 조건부)

- [ ] 최신 main SHA·CI 재확인. 빨간불이면 실패 항목과 링크를 보고하고 인수인계 갱신 후 중단
- [ ] 정상이면 재병합 → `check:pre-push` → 원격 재확인 → `git push origin HEAD:main` → main CI 1회 확인 → 스테이징 화면 확인
- [ ] 미승격 커밋 목록과 스테이징 화면을 보여 드리고 **운영 승격 승인** 수령 → 승격 → `verify:deployed-sha`
- [ ] 인수인계 `status: done`, `npm run worktree:remove`, 스크래치 파일 삭제
