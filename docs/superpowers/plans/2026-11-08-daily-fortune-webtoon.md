# 오늘·내일의 운세 웹툰 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (사용자가 바로 구현을 지시해 인라인 실행).

**Goal:** `/fortune/{today|tomorrow}/{sign}` 한국어 페이지 상단에, 그날 실제 계산값으로 대사를 채운 7컷 웹툰을 서버 렌더로 넣는다.

**Architecture:** 순수 빌더 `buildDailyWebtoon(input)`가 뷰모델 값과 날짜 타로로 컷 배열을 만든다. 그림은 슬롯 표에서 (날짜, sign, 슬롯) 해시로 고른다. 서버 컴포넌트 `DailyFortuneWebtoon`이 CutReader(`yehwa` 톤)로 그린다.

**Tech Stack:** Next.js App Router 정적 export, TypeScript, CSS Modules, node:test + `loadTsModule`.

**Spec:** `docs/superpowers/specs/2026-11-08-daily-fortune-webtoon-design.md`

## Global Constraints
- SignFortuneView에 "use client"를 넣지 않는다. 웹툰은 `locale === "ko"`이고 period가 today·tomorrow일 때만 그린다.
- 운세 계산 함수(fortune-score, day-relation, gen-daily)는 고치지 않는다. build-view는 `sky` 필드만 더한다.
- `lib/fortune` 한국어 템플릿에 영어 궁 이름을 넣지 않는다(`korean-prose-has-no-latin-sign-names` 테스트).
- 새 이미지를 만들지 않는다. 기존 `consultation-webtoons` 컷만 참조한다.

## Review Focus
- 같은 sign이 다른 날이면 컷 그림 조합 또는 순서가 달라야 한다.
- 별자리에는 지지가 없다. 네오 컷이 별자리에 띠 관계(삼합·충)를 말하면 안 된다.
- `relation`이 null이거나 basis에 "오행 생극" 행이 없어도 컷이 빠지지 않고 만들어져야 한다.
- 문장 조각 끝의 마침표 처리: 섹션 문장이 마침표 없이 끝나도 첫 문장 추출이 전체 문장을 돌려줘야 한다.
- 슬롯 참조가 존재하지 않는 컷을 가리키면 빌드 시점에 즉시 실패해야 한다(조용히 깨진 이미지 금지).

---

### Task 1: 슬롯 표와 빌더

**Files:**
- Create: `lib/fortune/daily-webtoon-slots.ts`, `lib/fortune/daily-webtoon.ts`
- Modify: `lib/fortune/build-view.ts` (SignViewModel에 `sky?: DailySkyFacts`, buildDaily에서 채움)
- Test: `__tests__/fortune/daily-webtoon.test.mjs`

**Interfaces:**
- Produces: `buildDailyWebtoon(input: DailyWebtoonInput): DailyWebtoon`. `DailyWebtoon = { heading: string; lead: string; note: string; cuts: WebtoonCut[] }`, `DailyWebtoonInput = Pick<SignViewModel, "profile"|"entry"|"score"|"basis"|"relation"> & { period: "today"|"tomorrow"; dateKey: string; sky: DailySkyFacts }`, `DailySkyFacts = { ilchin: string; moonSign: string; moonPhase: string }`.
- Produces: `resolveSlotArt(slot: DailyWebtoonSlot, seed: string)`. 참조를 찾지 못하면 throw한다.

- [ ] 테스트: 7컷, 첫 컷 내레이션에 키워드, 마지막 컷 화자 "연이"와 총운 점수, 띠 페이지 네오 컷에 relation.badge, 별자리 네오 컷에 "삼합"·"충"이 없음, 타로 컷 카드 이름이 `dailyTarotReading(date, "fortune-sign:"+id)`와 같음, 같은 sign 30일 동안 (그림 src 목록 + 순서) 조합이 2가지 이상, 모든 src가 `public/` 아래 `-720.webp`로 존재함.
- [ ] 실패 확인 → 구현 → 통과 확인 → 커밋.

### Task 2: 화면 연결과 예화 스타일

**Files:**
- Create: `app/fortune/[period]/DailyFortuneWebtoon.tsx`, `app/fortune/[period]/daily-fortune-webtoon.module.css`
- Modify: `app/components/webtoon/CutReader.tsx`, `cut-reader.module.css` (tone `yehwa`), `app/fortune/[period]/[sign]/SignFortuneView.tsx` (기준 값 섹션 바로 앞에 삽입)

- [ ] tsc, 관련 테스트, `build:cf` 뒤 adsense-readiness·prose-depth·fortune 가드를 확인하고, 산출물 HTML에서 웹툰 대사가 서버 렌더되는지 본다 → 커밋.
