---
status: done
updated: 2026-09-12
next: 완료 — PR #1921 머지, 스테이징 3곳 숙 일치 확인 끝. 후속 작업 없음.
---

# 숙요 정밀 코어 — 브라우저·잠금화면 통일 완료

선행: [2026-09-11-sukuyo-precise-core-browser-followup.md](2026-09-11-sukuyo-precise-core-browser-followup.md) 의 「남은 일 4곳」.
브랜치 `worktree-sukuyo-precise-browser` · PR: [#1921](https://github.com/rei1237/codedestiny/pull/1921)

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
## 2026-09-12 스테이징 3곳 실측 검증 (완료)

PR #1921 머지(875401499f33), 스테이징 Pages·Worker 모두 이 SHA 로 배포됨(`/version.json`·`/api/version` 확인).
기준 순간: 2026-09-12 12:00 KST(양력) — 잠금화면 `resolveTodaySky`가 항상 이 시각(서울 37.5665,126.978)으로 "오늘의 숙"을 정하므로 동일 순간으로 맞춤.

- 잠금화면 공개 카드: `GET /api/fortune/today-hub` → `sukuyo.mansionIndex=0`, `각(角)`.
- 서버 코어(`worker/lib/sukuyo-astronomy.js` `calculateSukuyoForMoment`, 위 순간 그대로): `nameKo=각, nameHan=角, index=0` — 잠금화면과 일치.
- 운명의 꽃(`worker/lib/destiny-flower-engine.js` `matchSukuyoFlower`)에 위 이름·인덱스를 그대로 넘기면 `등나무꽃`(null 아님) — 숙 값을 정상 소비.
- 사주 결과 숙요 탭(브라우저, `staging.code-destiny.com`, Playwright): 같은 생년월일시(2026-09-12 12:00 양력)로 `_ModalProfileState.dispatch`(모달이 실제로 쓰는 렌더 경로)를 태워 `#sukuyoSection` 렌더 결과 확인 → "당신의 본명숙 **각(角)**" — 동일.
  - 🔴 방법 메모: `dpSaveProfile`로 실제 프로필을 저장하려 하면 스테이징에서 익명 사용자는 "로그인 후에만 생성할 수 있습니다" 확인창으로 막힌다(로그인 계정 없이 검증하려고 DPStorage 저장을 우회해 정규화된 프로필 객체를 렌더 파이프라인에 직접 넣었다 — 계산·렌더 코어 검증이 목적이며 저장·로그인 UX는 건드리지 않았다).

결론: 세 화면 모두 같은 날 같은 시각 기준으로 **각(角)/index 0**을 낸다 — 실측 일치. 잠금화면은 앱 WebView 카드가 아니라 이 값을 채우는 서버 API·코어 함수 수준에서 확인(앱 WebView 자체는 여전히 웹에서 렌더 불가).

## 알려진 위험

- 브라우저 숙요는 Swiss WASM 로드에 의존 — 실패하면 「계산 불가」(fail-closed, 숙을 지어내지 않음).
- today-hub 공개 응답 엣지 캐시 30분 → 배포 직후 최대 30분 잠금화면 숙요 카드가 중립 문구.

## 범위 밖 (보고만, 미수정)

- `npm run verify:today-hub-gate` 가 이 워크트리에서 전 항목 실패(호출 0회). base(25c8ee704) 셸 7개로도 똑같이 실패 → 기존 결함 확인. 게이트는 CI 미배선.
- `scripts/verify-fusion-expert.mjs` 미배선, `verify-nakshatra-premium` +13 전제, `sukuyo-premium` 尾 `shadows` 누락 — 선행 문서 그대로.
- `scripts/lib/sukuyo-shell-probe.cjs`·관련 fixture 는 #1886 이후 호출처 없음 — 2026-09-12 삭제 완료(deletion-auditor 3면 확인).
- 로컬 `build:worker` 는 워크트리에 wrangler 가 없으면 실패한다(공유 node_modules 부분 설치).

## 다음 세션 첫 문장

완료 — 다음 세션이 이어받을 항목 없음. 「범위 밖」 항목들은 별도 요청이 있을 때만 착수.
