---
status: active
updated: 2026-09-11
next: PR(숙요 브라우저·잠금화면 Swiss 코어 통일) 머지·스테이징 SHA 확인 후, 스테이징에서 숙요 화면 3곳(사주 결과 숙요 탭·운명의 꽃 숙요·잠금화면 숙요 카드)이 같은 날 같은 숙을 내는지 눈으로 확인한다.
---

# 숙요 정밀 코어 — 브라우저·잠금화면 통일 완료

선행: [2026-09-11-sukuyo-precise-core-browser-followup.md](2026-09-11-sukuyo-precise-core-browser-followup.md) 의 「남은 일 4곳」.
브랜치 `worktree-sukuyo-precise-browser` · PR: (생성 후 기재)

## 한 일

모든 숙 결정이 「현지시각 → UTC/JD → Swiss 항성 달 황경(Lahiri) → `floor(lon/13.333°)+16 mod 27`」 한 코어를 탄다.

1. `js/saju-engine-tarot-sukuyo-quantum.js` `calcSukuyoData` — 음력 월 시작 숙 표 제거. `moonEclipticLongitude` 가 없으면 null.
   - `renderSukuyo` 는 황경이 없으면 `syComputeSukuyoAstronomy` 로 채운 뒤 스스로 다시 부른다(렌더 순번 토큰으로 낡은 결과 버림, 실패 시 `syAstronomyUnavailable` 표식으로 1회 재렌더).
   - 궁합 폼·`syRadarResolveLunar`(양력·음력 입력 모두)도 코어를 거친다.
2. `js/core/index-inline-runtime.js`
   - 🔴 `js/core/sukuyo-astronomy.js` 가 그동안 **어떤 로더에도 없었다**. 메인 사주 체인·출생 모달 체인 모두 quantum.js 직전에 싣는다.
   - `_dfExtractSukuyoLiveData` → 출생정보 키(`y|m|d|h|min|tz|lat|lon`)별 비동기 캐시(`_dfSukuyoAstronomyCache`). 첫 호출은 null, 계산 완료 후 스튜디오를 연 적이 있으면 `_dfRefreshStudioForSource(active, true)`.
3. `worker/lib/destiny-flower-engine.js` — `estimateSukuyoMansionIndexFromBirth`(해시) 삭제. 숙 이름·번호가 없으면 `matchSukuyoFlower` 가 null.
4. `lib/lock-screen-daily-fortune.ts` — `JD % 27` 삭제. `todayMansionIndex` 입력(0-based)만 쓰고 없으면 중립 문구. `LockScreenFortuneClient.tsx` 가 `/api/fortune/today-hub`(공개·credentials omit)를 불러 `date === 오늘 KST` 이고 0~26 정수일 때만 받는다.
   - `worker/routes/fortune-today.js` 숙요 카드에 `mansionIndex` 가산 필드(공개·개인화 둘 다).
- 가드: `scripts/verify-sukuyo-korean-calendar.mjs` 에 옛 경로 재유입·로더 순서 검사 8건.

## 검증

- typecheck OK · test:jest 228/2686 pass · UI node --test 47 pass · verify-sukuyo-korean-calendar 19 · verify:sukuyo-astronomy PASS · verify-shell-korean-calendar 96 OK.
- 스크래치로 코어 인덱스 순서 = 잠금화면 표 순서(27/27), 꽃 엔진 null 동작, 로더 가드 변이 검출 확인.
- 🔴 미검증: 실제 브라우저 화면(스테이징에서 확인할 것). 잠금화면은 앱 WebView 전용이라 웹에서 안 뜬다.

## 알려진 위험

- 브라우저 숙요는 Swiss WASM 로드에 의존 — 실패하면 「계산 불가」(fail-closed, 숙을 지어내지 않음).
- today-hub 공개 응답 엣지 캐시 30분 → 배포 직후 최대 30분 잠금화면 숙요 카드가 중립 문구.

## 범위 밖 (보고만, 미수정)

- `npm run verify:today-hub-gate` 가 이 워크트리에서 전 항목 실패(호출 0회). 이 PR 의 index.html 차이는 빌드 해시뿐, 게이트는 CI 미배선 — 기존 결함 추정.
- `scripts/verify-fusion-expert.mjs` 미배선, `verify-nakshatra-premium` +13 전제, `sukuyo-premium` 尾 `shadows` 누락 — 선행 문서 그대로.
- `scripts/lib/sukuyo-shell-probe.cjs`·관련 fixture 는 #1886 이후 호출처 없음.
- 로컬 `build:worker` 는 워크트리에 wrangler 가 없으면 실패한다(공유 node_modules 부분 설치).

## 다음 세션 첫 문장

> handoff=docs/handoff/2026-09-11-sukuyo-precise-browser-done.md 로 시작해서, 숙요 통일 PR 머지·스테이징 SHA 확인 후 스테이징에서 숙요 화면 3곳이 같은 숙을 내는지 확인해줘.
