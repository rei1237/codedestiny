---
status: done
updated: 2026-09-11
next: 완료 — 후속은 docs/handoff/2026-09-11-sukuyo-precise-browser-done.md 를 따른다.
---

> ✅ 아래 「남은 일」 4곳은 브랜치 `worktree-sukuyo-precise-browser` 에서 모두 옮겼다. 후속·검증 결과는 [2026-09-11-sukuyo-precise-browser-done.md](2026-09-11-sukuyo-precise-browser-done.md).

# 숙요 정밀 코어 — 브라우저·잠금화면 후속

## 왜

#1886(ec7f2ea29)이 숙요 판정을 「현지시각 → UTC/JD → Swiss 항성 달 황경(Lahiri) → `floor(lon/13.333°)+16 mod 27`」 한 코어로 바꿨다. 워커·서버 경로는 이번 PR 로 전부 이 코어를 탄다. 🔴 숙요를 보여 주는 모든 화면이 같은 숙을 내야 한다 — 아직 옛 방식(음력 월·일 표, 날짜 카운트, 해시)이 남은 곳이 브라우저·잠금화면에 4곳 있다.

## 새 코어 판정 (실측, 이번 세션)

- Swiss 달 황경 vs 독립 Meeus 저정밀식 − 라히리 근사: 252 표본 최대 오차 0.075°.
- 오프셋 16 vs 전통 宿曜経 월초표(室,奎,胃,畢,參,鬼,張,角,氐,心,斗,虛) 일치 수: 16=101/252, 17=69, 15=31, 14=7 → 16 이 최적 고정 원점. 브라우저 `js/core/sukuyo-astronomy.js` 도 OFFSET=16.
- 크로스워크: `nakshatraIdx = (sukuyoIdx + 11) % 27` (`constants/nakshatra-crosswalk.js` `CROSSWALK_OFFSET`). 16+11=27 이 역변환이라 같은 달 황경에서 숙요·나크샤트라가 항상 이 관계다.

## 이번 PR 에서 끝난 것 (워커)

- 초융합 숙요 어댑터 `expertEvidence {birth,target,targetDate,dayFortune}` 복원(#1881 필드 + `calculationBasis`·`moonSiderealLongitude`). 주입 계산기는 코어와 같은 `(env, moment, options)` 시그니처.
- `+13` 잔재 교정: `worker/lib/nakshatra-codex.js` `assembleTodayMoon`, `worker/routes/fortune-today.js` `natalNakshatraNameKo` → `CROSSWALK_OFFSET`(11).
- `scripts/verify-fusion-expert.mjs` 가 await + 고정 황경 mock 계산기로 통과.

## 남은 일 — 브라우저·잠금화면 옛 방식 4곳

1. `js/saju-engine-tarot-sukuyo-quantum.js` `calcSukuyoData` 달력표 폴백(:6711/:6730). 도달 경로: `renderSukuyo`(saju-engine.js:5523, saju-engine-continuation.js:295), `syBindSukuyoBondReport`(:13004/:13012), 궁합 폼(:16852). async `__cdCalculateSukuyoAstronomy` 를 먼저 불러 결과를 넘기는 구조로 바꿔야 한다(동기 호출부가 많아 await 전파 범위부터 잴 것).
2. `js/core/index-inline-runtime.js` `_dfExtractSukuyoLiveData`(:4334/:4355) → 운명꽃 입력.
3. `worker/lib/destiny-flower-engine.js` `estimateSukuyoMansionIndexFromBirth`(:1627) 해시 폴백.
4. `lib/lock-screen-daily-fortune.ts` `buildSukuyo`(:297) 날짜 카운트.

- 🔴 홈 정본은 `index.html`, `sync:public` 미러 산출물을 함께 커밋한다.
- 줄 번호는 2026-09-11 origin/main(c082e9518) 기준 — 먼저 심볼로 다시 찾는다.

## 범위 밖 발견 (보고만, 미수정)

- `scripts/verify-fusion-expert.mjs` 는 package.json·ci-preflight·.github 어디에도 배선돼 있지 않다(git grep 0건) — 그래서 #1886 의 누락이 main 에 들어갔다. 게이트 추가는 별도 승인.
- `scripts/verify-nakshatra-premium.mjs:268` 「교집합」 전제: 숙요·나크샤트라가 같은 달 황경에서 나오면 날짜별로 항상 +11 이라 교집합 개념이 성립하지 않는데, 검사는 +13 으로 재서 무의미하게 통과한다. `worker/lib/nakshatra-muhurta.js:5` 주석도 같다. 택일 상품 설계 판단 필요.
- `worker/lib/sukuyo-premium.js` 尾 항목에 `shadows` 가 없다(초융합 근거에서 target.shadows 가 빈다).
- 공유 체크아웃 `node_modules` 가 락파일 대비 321개 패키지 누락(부분 설치 추정). 이번 세션은 워크트리 전용 `npm ci` 로 우회했고, 공유 폴더에는 `lru-cache@11.5.2` dist 누락 파일만 보충했다.
