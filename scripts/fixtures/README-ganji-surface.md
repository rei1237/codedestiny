# `ganji-surface-kst.json` · `ganji-dst-gap-census.json`

`scripts/verify-ganji-surface-parity.mjs` 가 쓰는 두 픽스처다. 손으로 고치지 말 것 —
갱신은 `node scripts/verify-ganji-surface-parity.mjs --emit` 이 한다.

## 🔴 이것은 정답이 아니라 **현행**이다

셸 간지 경로의 로컬 `Date` 를 벽시계 부품으로 옮기는 작업(PR-C~E)의 **before-image** 다.
계약은 "이 값이 한 바이트도 안 바뀐다" 하나이고, 값의 **옳고 그름은 이 파일의 관심사가 아니다.**

그래서 여기에는 **알려진 결함이 그대로 고정돼 있다.**

### ① `getGanji` 는 1990년 말고 전부 `null` 이다

`KasiEngine.getGanji` → `KasiCalendarService.computeGanjiFromDate(date)` 를 **terms 없이** 부르고,
그 함수는 검증캐시(`_VALIDATED_SOLAR_TERMS_BY_YEAR`, **1990 한 해뿐**)만 본다. 12중절이 모자라니 `null`.
바로 옆에 `_fallbackSolarTerms`(코어 절기표, 1900~2100 전 구간)가 있는데 그 경로가 안 닿는다.

```
1985 null · 1990 {庚午 壬午 辛亥 甲午} · 1997 null · 2024 null · 2026 null
```

🔴 **이것을 고치는 것은 별건이다.** 고치면 `getGanji` 호출부 13곳이 한꺼번에 절기 프레임 세차로
갈아탄다(`js/saju-engine.js:2936` 주석이 기록한 사고가 그 모양이다 — 셸 己巳 vs 워커/앱 庚午).
그 전환의 크기를 재려고 이 저울을 먼저 만든 것이다.

🔴 그래서 픽스처는 **값과 `isNull` 을 따로 적는다**(`rows` / `nullMap`). 값 대조만 하면
이 표면 전체가 `null == null` 로 조용히 통과한다 — 회귀 가드가 아무것도 안 지키게 된다.

### ② `Asia/Seoul` 에도 서머타임 구멍이 12건 있다

정본 축인데도 0 이 아니다. 한국은 1948~51 · 1955~60 · 1987~88 에 서머타임을 썼고, 그 시계
앞당김 구간의 벽시계는 **로컬 `Date` 에 담을 수 없다.** 즉 그 창에 태어난 사용자는 지금
브라우저에서 다른 시각으로 접힌 값을 받는다. 이 파일은 그 사실을 **숫자로** 못박는다.

## `ganji-dst-gap-census.json` — 🔴 **PR-E** 의 졸업 조건 (PR-D 가 아니다)

```
Asia/Seoul 12 · UTC 0 · America/New_York 21 · Pacific/Apia 18
Pacific/Kiritimati 6 · Australia/Lord_Howe 18
```

가드는 지금 이 숫자와 **정확히 같은지**만 본다. 🔴 **총계 0 은 아직 요구하지 않는다** —
그것은 **PR-E**(Date 진입점 제거)의 졸업 조건이다(사용자 결정 2026-08-28).

🔴 원래 PR-D 몫으로 적혀 있었는데 옮겼다. **PR-D 로는 이 숫자가 안 움직이기** 때문이다 —
구멍을 만드는 것은 셸이 아니라 **가드 자신**이다. `probeSample` 이 Date 표면 12벌에 넘기려고
`new Date(...)` 를 직접 조립하고, 그게 접히면 그 표본을 버린다. 그래서 셸 호출부 22곳을 전부
부품으로 옮긴 뒤에도(PR-D, #1234) census 는 **완전히 동일**했다. 이 숫자가 0 이 되는 것은 PR-E 가
Date 진입점을 지워 그 12벌이 존립할 수 없게 될 때이고, 그때 `ganji-surface-kst.json` 의
`DST-GAP` 12행도 함께 값으로 바뀐다 — **before-image 계약이 끝나는 지점**이 거기다.
절차와 같이 갈아야 할 가드 3곳은 계획 문서 §6-6 에 있다.

구멍 표본은 손으로 적지 않는다. `Intl` 로 6개 존의 **시계 앞당김 전이**를 직접 찾아
그 안의 분(시작·중간·끝)을 표본에 넣는다. 존을 매트릭스에서 빼면 그 존의 구멍이 0 이 되고
가드가 `② 서머타임 존이 전부 최소 1건의 구멍을 낸다` 로 잡는다.

## 언제 `--emit` 을 돌리는가

| 상황 | 해야 할 일 |
|---|---|
| PR-C(부품 API 신설) | 🔴 **돌리지 않는다.** `ganji-surface-kst.json` 이 한 바이트도 안 바뀌는 것이 그 PR 의 계약이고, 여기를 고치면 리뷰 거절 사유다 |
| PR-D(조립 22곳 전환) | 🔴 **돌리지 않는다.** census 는 호출부 전환으로 안 움직인다(실측). 실제로 #1234 는 두 픽스처를 한 바이트도 안 바꿨다 |
| PR-E(Date 진입점 제거) | 돌린다. census 가 0 이 되고 `ganji-surface-kst.json` 의 `DST-GAP` 12행이 값으로 바뀐다 — **before-image 계약은 여기서 끝난다** |
| 표면·표본 정의를 바꿨을 때 | 돌린다. **바뀐 줄 수와 이유를 커밋 메시지에 적는다** |
| 가드가 빨간불인데 원인을 모를 때 | 🔴 돌리지 않는다. `--emit` 은 회귀를 지우는 버튼이다 |

## 형식

`rows` / `nullMap` 은 표본과 **인덱스가 같은** 배열이고 각 줄은
`"<YYYY-MM-DD HH:mm>\t<표면1>\t<표면2>…"` 다(구멍이면 `"<키>\tDST-GAP"`).
`nullMap` 쪽은 표면별 `isNull` 비트 문자열(`"001000100000"`)이다.
표면 순서는 `surfaces` 배열이 갖고, 가드가 그 목록과 현재 코드의 목록을 대조한다.

## 같이 볼 것

- [docs/handoff/ganji-wallclock-parts-migration.md](../../docs/handoff/ganji-wallclock-parts-migration.md) — 계획 전문(PR-B~E)
- `scripts/lib/shell-ganji-harness.cjs` — 브라우저와 같은 로드 체인
- `scripts/lib/kst-clock.mjs` — TZ 핀과 자기검사
