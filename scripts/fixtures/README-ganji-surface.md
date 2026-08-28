# `ganji-surface-kst.json` · `ganji-dst-gap-census.json`

`scripts/verify-ganji-surface-parity.mjs` 가 쓰는 두 픽스처다. 손으로 고치지 말 것 —
갱신은 `node scripts/verify-ganji-surface-parity.mjs --emit` 이 한다.

## 🔴 이것은 정답이 아니라 **현행**이다

셸 간지 경로의 로컬 `Date` 를 벽시계 부품으로 옮기는 작업(PR-C~E)의 **before-image** 다.
계약은 "이 값이 한 바이트도 안 바뀐다" 하나이고, 값의 **옳고 그름은 이 파일의 관심사가 아니다.**

그래서 여기에는 **알려진 결함이 그대로 고정돼 있다.**

### ① `getGanjiFromParts` 는 1990년 말고 전부 `null` 이다

`KasiEngine.getGanjiFromParts` → `KasiCalendarService.computeGanjiFromParts(parts)` 를 **terms 없이** 부르고,
그 함수는 검증캐시(`_VALIDATED_SOLAR_TERMS_BY_YEAR`, **1990 한 해뿐**)만 본다. 12중절이 모자라니 `null`.
바로 옆에 `_fallbackSolarTerms`(코어 절기표, 1900~2100 전 구간)가 있는데 그 경로가 안 닿는다.

```
1985 null · 1990 {庚午 壬午 辛亥 甲午} · 1997 null · 2024 null · 2026 null
```

🔴 **이것을 고치는 것은 별건이다.** 고치면 `getGanjiFromParts` 호출부 13곳이 한꺼번에 절기 프레임 세차로
갈아탄다(`js/saju-engine.js:2936` 주석이 기록한 사고가 그 모양이다 — 셸 己巳 vs 워커/앱 庚午).
그 전환의 크기를 재려고 이 저울을 먼저 만든 것이다.

🔴 그래서 픽스처는 **값과 `isNull` 을 따로 적는다**(`rows` / `nullMap`). 값 대조만 하면
이 표면 전체가 `null == null` 로 조용히 통과한다 — 회귀 가드가 아무것도 안 지키게 된다.

✅ **표본에 검증캐시 해를 넣어 이 열을 살려 뒀다(2026-08-28, PR-F).** 그 전에는 표본 해가
7년 간격(1960·1967·…)이라 1990 이 하나도 없었고, 그래서 이 표면 3벌의 live 행이 **1516행 중 1행**
(`1990-06-23 12:00`, 윤달 표본이 우연히 걸린 것)뿐이었다. 지금은 가드가 "그 해가 어디냐"를
**셸에 물어서**(`validatedCacheYears()`) 표본을 만든다 — 캐시가 늘면 표본도 따라 는다.
live 행 1 → **130**, 서로 다른 값 2 → **88**. 야자시 경계 표본(23:00·23:29·23:30·23:59)이
그 해에도 생겼으므로 `getGanjiFromParts` 와 `:noYaja` 의 차이가 이제 값으로 드러난다.

### ①-b 🔴 값 축은 5벌을 아예 안 보고 있었다 (2026-08-28 에 고쳤다)

`--emit` 이 찍는 것은 표면의 반환값이 아니라 **투영기가 뽑아낸 문자열**이다. 그 투영기가 틀리면
열은 조용히 상수가 되고, 상수 열은 접어도 안 움직인다 — `isNull` 지도도 못 잡는다(태어날 때부터
죽어 있으면 지도 역시 안 바뀐다). PR-E 까지 실제로 그 상태였다:

| 표면 | 옛 열 | 원인 |
|---|---|---|
| `_cdCivilDayPillar` · `getGanZhiForDate` · `getMonthGanZhi` | 1516행 전부 `"///"` | 셸은 `{ g, j }` 를 돌려주는데 투영기가 `secha/weolgeon/iljin/sigan` 만 읽었다 |
| `_cdHourPillarFromDayStem` | 1516행 전부 `null` | 일간을 그 `{ g, j }` 에서 못 꺼내 인자가 늘 `null` 이었다 |
| `calcZiweiPalaces:calcMeta` | `"////N/"` (N=lunarDay) | `calcMeta` 에 없는 키(`yearGanji`…)를 읽었다 |

고친 뒤 서로 다른 값: 1 → **60**(기둥 4벌) · 30 → **892**(calcMeta). 🔴 **셸은 한 글자도 안 바뀌었다** —
투영기만 바뀌었다. 무손실 증거: 투영기를 안 건드린 7벌을 옛 픽스처와 공유 표본 1,516건으로 대조해
값 0건 · `isNull` 0건 불일치, 그리고 옛 `calcMeta` 열이 나르던 유일한 정보(`lunarDay`)가 1,516건 전부
새 열에 그대로 있다.

이 병이 다시 생기는 것은 가드 검사 **④ 상수 열이 없다** 가 막는다(열의 서로 다른 값이 2개 미만이면 실패).

### ①-c 🔴 그래도 값 대조가 못 보는 자리가 남는다 — ⑮ 가 실행으로 덮는다

검증캐시 해 **밖**에서는 위 3벌이 여전히 `null` 이라, 그 표본에서는 무엇을 해도 `null == null` 이다.
실측(2026-08-28): `getGanjiFromParts` 안에서 부품을 로컬 `Date` 로 접어도 **가드 57건이 전부 초록**이었다.
그래서 값이 아니라 **행위**를 보는 검사 ⑮ 를 넣었다 — 표면 13벌을 표본 전건에 돌리는 동안
로컬 타임존을 읽는 `Date` 조작(다인자 `new Date(`, `getFullYear()` 류)이 한 번이라도 일어나면 실패다.
🔴 소스 검사(`verify:shell-korean-calendar` ⑬)는 `Date.UTC` 로 감싼 것을 안전으로 치므로
`new Date(Date.UTC(...)).getFullYear()` 를 못 본다. ⑮ 는 그 모양도 잡는다(음성 테스트 확인).

### ①-d 야자시 규약의 비대칭을 **네 열**로 적는다 (PR-3)

음력일 축과 간지 축은 야자시 규약이 **일부러 다르다.** 주석은 아무도 안 읽으므로 값으로 적는다:

| 열 | 기본값 | 23시대에 하루를 미는가 |
|---|---|---|
| `getGanjiFromParts` | ON | 민다 |
| `getGanjiFromParts:noYaja` | (명시 OFF) | 안 민다 |
| `solarToLunarFromParts` | **OFF**(PR-3) | 안 민다 |
| `solarToLunarFromParts:yaja` | (명시 ON) | 민다 |

누가 "규약을 정리"해 두 축을 한쪽으로 통일하면 이 네 열의 관계가 무너져 픽스처가 깨진다.
근거는 `js/saju-engine.js` 의 `solarToLunarFromParts` 머리주석.

**PR-3 이 실제로 움직인 칸** — 표본 1,645행 중 **23시대 123행**에서 기존 열 두 개만 바뀌었다:

```
solarToLunarFromParts       123칸
calcZiweiPalaces:calcMeta   123칸   (lunarMonth/lunarDay 부분)
합계 246칸 · 23시대 밖 0칸 · nullMap 0칸
getGanjiFromParts · :noYaja · computeGanjiFromParts:* · 기둥 4벌 · getMonthGanZhi = 0칸
```

그 **0칸**이 "간지 축을 안 건드렸다"의 증거다. 재현:
`git show <PR-3 직전>:scripts/fixtures/ganji-surface-kst.json` 과 현재 파일을 표면 이름으로
짝지어 열 단위로 세면 위 숫자가 나온다.

### ② `Asia/Seoul` 에도 접히는 벽시계가 12건 있다

정본 축인데도 0 이 아니다. 한국은 1948~51 · 1955~60 · 1987~88 에 서머타임을 썼고, 그 시계
앞당김 구간의 벽시계는 **로컬 `Date` 에 담을 수 없다.** PR-E 이전에는 가드 자신이 그 캐리어를
쓰느라 그 12건을 통째로 버렸고, 그것이 아래 census 의 정체였다.

## `ganji-dst-gap-census.json` — ✅ **PR-E 에서 총계 0 을 달성했다**

```
gaps              전부 0            ← 대조에서 버린 표본. 구조적으로 0 이다
foldedWallClocks  Asia/Seoul 12 · UTC 0 · America/New_York 21
                  Pacific/Apia 18 · Pacific/Kiritimati 6 · Australia/Lord_Howe 18
```

🔴 **두 숫자를 헷갈리지 말 것.**

- `gaps` 는 **가드가 대조에서 버린 표본 수**다. PR-B~D 동안 이 가드는 로컬 `Date` 를 캐리어로
  받는 옛 진입점 12벌을 따로 재고 있었고, `probeSample` 이 `new Date(...)` 를 직접 조립하다
  접히면 그 표본을 버렸다. 그래서 **구멍을 만드는 것은 셸이 아니라 가드 자신**이었고, 셸
  호출부 22곳을 전부 부품으로 옮긴 뒤에도(PR-D, #1234) census 는 **완전히 동일**했다.
  PR-E 가 그 진입점들을 소스에서 지우면서 표면 목록이 부품 축 하나로 합쳐졌고, 버릴 표본이
  없어져 0 은 값이 아니라 **구조**가 됐다.
- `foldedWallClocks` 는 **그 존에 존재하지 않는 벽시계 표본 수**다. 코드가 아니라 그 존의
  IANA 데이터가 정하는 값이라 PR-E 로도 안 움직인다(실측: 옛 `gaps` 와 숫자가 같다).
  🔴 이쪽은 **0 이면 안 된다** — 0 은 그 존이 매트릭스에서 빠졌거나 TZ 핀이 안 먹었다는 뜻이고,
  그러면 전건 대조가 UTC 를 여섯 번 재는 셈이 된다. 가드가
  `② 서머타임 존이 전부 최소 1건의 접힌 벽시계를 낸다` 로 잡는다.

표본은 손으로 적지 않는다. `Intl` 로 6개 존의 **시계 앞당김 전이**를 직접 찾아
그 안의 분(시작·중간·끝)을 표본에 넣는다.

## 언제 `--emit` 을 돌리는가

| 상황 | 해야 할 일 |
|---|---|
| PR-C(부품 API 신설) | 🔴 **돌리지 않는다.** `ganji-surface-kst.json` 이 한 바이트도 안 바뀌는 것이 그 PR 의 계약이고, 여기를 고치면 리뷰 거절 사유다 |
| PR-D(조립 22곳 전환) | 🔴 **돌리지 않는다.** census 는 호출부 전환으로 안 움직인다(실측). 실제로 #1234 는 두 픽스처를 한 바이트도 안 바꿨다 |
| PR-E(Date 진입점 제거) | ✅ 끝났다(돌렸다). `gaps` 가 0 이 되고 `ganji-surface-kst.json` 의 `DST-GAP` 12행이 값으로 바뀌었다 — **Date 축 before-image 계약은 여기서 끝났다.** 무손실 증거: 옛 픽스처와 새 픽스처를 표면 이름으로 짝지어 1,504행 × 12벌 = 18,048셀 대조, 값 0건·`isNull` 0건 불일치 |
| 표면·표본 정의를 바꿨을 때 | 돌린다. **바뀐 줄 수와 이유를 커밋 메시지에 적는다** |
| PR-F(투영기 교정 + 검증캐시 해 표본) | ✅ 끝났다(돌렸다). 표본 1516 → **1645**, 상수였던 5열이 값을 나르기 시작했다. 셸은 안 바뀌었고, 무손실 증거는 위 ①-b 에 있다 |
| PR-3(야자시 OFF 통일) | ✅ 끝났다(돌렸다). 표면 12 → **13**(`solarToLunarFromParts:yaja` 추가), 기존 열은 23시대 123행 × 2열 = 246칸만 움직였다. 위 ①-d 참조 |
| 가드가 빨간불인데 원인을 모를 때 | 🔴 돌리지 않는다. `--emit` 은 회귀를 지우는 버튼이다 |

## 형식

`rows` / `nullMap` 은 표본과 **인덱스가 같은** 배열이고 각 줄은
`"<YYYY-MM-DD HH:mm>\t<표면1>\t<표면2>…"` 다.
`nullMap` 쪽은 표면별 `isNull` 비트 문자열(`"001000100000"`)이다.
표면 순서는 `surfaces` 배열이 갖고, 가드가 그 목록과 현재 코드의 목록을 대조한다.
🔴 PR-E 이전에는 접힌 표본 줄이 `"<키>\tDST-GAP"` 이었다. 지금은 그런 줄이 없다.

## 같이 볼 것

- [docs/handoff/ganji-wallclock-parts-migration.md](../../docs/handoff/ganji-wallclock-parts-migration.md) — 계획 전문(PR-B~E)
- `scripts/lib/shell-ganji-harness.cjs` — 브라우저와 같은 로드 체인
- `scripts/lib/kst-clock.mjs` — TZ 핀과 자기검사
