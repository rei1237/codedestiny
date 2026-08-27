# 한국 음양력 코어 마이그레이션 인수인계 — 2026-08-27

> 이 문서만 읽고 이어서 시작할 수 있어야 한다. **근거를 못 찾으면 추측하지 말고 사용자에게 물어라.**
> 🟢 코어(PR-B) · 자미두수 3엔진(PR-C) · 사주 절기(PR-D) · 워커 사주(PR-D2) · 절기 프레임(PR-E1) · 숙요(PR-E2) · 낙샤트라(PR-E3) · 나머지 음력 변환(PR-E4) · 정적 셸(PR-E5) · **대운(PR-F1 = #1194, 머지됨 `06c2916fc`)** 까지 끝났다.
> 🟢 **명리 상수 표(PR-F2 ㄹ, 2026-08-28)** 도 끝났다 — `lib/saju/myeongri-tables.js` · `verify:myeongri-tables`.
> 🔴 **달력 축은 전부 끝났다.** 남은 것은 **PR-F2 의 나머지 — 일주·시주 EightChar** 이고,
> 워커 3파일뿐이다. 목록은 `verify:daeun-korean-calendar` 검사 ⑤ 의 `KNOWN_REMAINING` 에 있다.
> 🔴 다음 세션은 가드 세 개의 `KNOWN_REMAINING` 목록을 먼저 열어라 — 남은 일이 거기 적혀 있고, 그 줄을 지우는 것이 완료 조건이다.
> `scripts/verify-saju-solar-term-core.mjs` 검사 ⑤(절기 프레임) · `scripts/verify-lunar-conversion-core.mjs` 검사 ①(음력 변환).
> `scripts/verify-sukuyo-korean-calendar.mjs` 의 목록은 **비었다**(숙요 축 완료).
> 🔴 셸에는 **소스 스캔이 안 보이는 축**이 있다 — `scripts/verify-shell-korean-calendar.mjs` 가
> 셸을 `global.Solar` 없이 실제로 평가해 값까지 대조한다. 셸을 고쳤으면 그것부터 돌려라.

## 0. 왜 하는 작업인가 — 사용자 요구 원문

> "1997-02-10 만 세 엔진의 음력일이 갈립니다 — 셸의 KASI_LOCAL_PATCH_SEED 하루짜리 덮어쓰기(음력 1/3)가 lunar-javascript(1/4) 이 문제인데 lunar-javascript(1/4)가 되어선 안돼 정확한 자미두수 로직으로 나와야하며, 하드 코딩이 아니라 로직 자체가 정확하게 나와야한다. lunar-javascript보다도 천문 api를 통한 정확한 근거로 나와야하고 lunar-javascript 자체도 회귀없이 정확한 값으로 나와야하며, 가능하면 헷갈리게 하므로 회귀없이 정확한 천문 api 기반으로만 날짜를 계산하도록 모든 운세 시스템에 적용되어야해"

## 1. 근본 원인 — 하드코딩이 아니라 타임존이다

`lunar-javascript`(1.7.7)는 **중국 표준시(CST, UTC+8) 기준 중국 음력**을 구현한다. 이 서비스는 한국(KST, UTC+9)용이다.

```
1997년 2월 삭 = 1997-02-07 15:06:44 UTC   (astronomy-engine 실측)
  → CST 1997-02-07 23:06   중국 설날 2/7   → 1997-02-10 = 음력 1/4
  → KST 1997-02-08 00:06   한국 설날 2/8   → 1997-02-10 = 음력 1/3   ← KASI
```

**54분 차이로 날짜가 갈린다.** 삭이 CST 23시대에 들면 그 음력 달 전체(~29.5일)의 음력일이 하루 밀린다.

| 축 | 실측(1900~2100) |
|---|---|
| 일자 전수 | 73,414일 중 **2,997일(4.08%)** 이 lunar-javascript 와 다름 |
| 그 차이의 설명 | CST 2,877일 · 북경 지방평균시(UTC+7:45:40, 1929년 이전) 120일 · **잔차 0** |
| 절기 | 1930~2030 기준 2,424개 중 97개(4.0%)가 CST 23시대 |

자미두수는 음력일로 자미성을 잡으므로 하루가 밀리면 **명반 14주성이 통째로 이동한다.**

🔴 **KASI 가 우리 편임을 실제로 확인했다** — 스테이징 `/api/kasi/calendar` 로 289건을 채집해 전건 일치. 그중 **82건이 lunar-javascript 와 갈리는 날**이다.

## 2. 끝난 것

| PR | 내용 | 상태 |
|---|---|---|
| **#1163** | 자미두수 셸·워커·앱 별 배치 정합 + `verify:ziwei-star-parity` | **머지됨** `d4dbaed05` |
| **#1167** | 섬 별 설명 맵 정합(`록존`→`녹존`·`청양`→`경양`·천마/함지/천요 추가) + `verify:island-star-copy` | **머지됨** `deb2ff514` |
| **#1170** | 이 문서를 담은 PR — 한국 음양력 코어 신설 | **머지됨** `cc22b4520` |
| **#1176** | 자미두수 3엔진을 코어로 + 하드코딩 시드 3곳 제거 | **머지됨** `afd219b6f` |
| **#1179** | 사주 절기 경계 5곳을 코어로 + 표 분 반올림 + `verify:saju-solar-term-core` | **머지됨** `8aa5da6d9` |
| **#1181** | 워커 사주 년·월주를 코어로(월건 경계 60분 정정) + 가드 검사 ④ | **머지됨** `d854ccf1d` |
| **#1183** | 남은 절기 프레임 소비자 6곳 + 가드 검사 ⑤⑥⑦⑧ | **머지됨** `161836714` |
| **#1185** | 숙요 음력일 10곳 + `verify:sukuyo-korean-calendar` | **머지됨** `0366f5152` |
| **#1187** | 낙샤트라 3라우트 · 베다 어댑터 · 숙요 가드 검사 ②③⑤ 확장 | `feat/nakshatra-korean-calendar` (base `0366f5152`) |
| **#1188** | 나머지 음력↔양력 변환 10곳 + `verify:lunar-conversion-core` 신설 | **머지됨** `50f3c0146` |
| **#1192** | 정적 셸 5파일 + `verify:shell-korean-calendar` 신설 | **머지됨** `524e85c88` |
| **#1194** | 대운을 코어로(`lib/korean-calendar/daeun.js`) + `verify:daeun-korean-calendar` 신설 | **머지됨** `06c2916fc` |

🔴 #1170 은 `.github/workflows/pr-ci.yml` 에서 한 번 충돌했다. #1167(섬 가드)과 이 PR(달력 가드 5종)이
**같은 앵커(`run: npm run verify:ziwei-star-parity`) 뒤에** 각자 블록을 넣어서다. 의미 충돌이 아니므로
`origin/main` 위로 리베이스해 **두 블록을 순서대로 남기는 것**으로 해소했다(2026-08-27, 커밋 `8d1141e7a`).
같은 자리에 스텝을 더 넣는 PR 은 또 충돌하니 리베이스로 풀 것 — 어느 한쪽을 지우지 말 것.

### PR-B 가 추가한 것

| 파일 | 내용 |
|---|---|
| `lib/korean-calendar/ephemeris.js` | astronomy-engine 실계산. 🔴 **빌드타임 전용** |
| `scripts/build-korean-calendar-table.mjs` | 정삭·무중치윤으로 1900~2100 표 생성. **이것이 "로직"이다** |
| `lib/korean-calendar/table.generated.js` | 산출물. 블록 202 · 달 2,499 · 절기 4,872 · 지문 `kc1:fc26f10b8aed` |
| `lib/korean-calendar/core.js` | 표 조회(음력·절기). 천문 라이브러리 의존 0 |
| `lib/korean-calendar/ganji.js` | 세차·월건·일진·시주. 공식은 레포 기존 것을 그대로 승계 |
| `lib/korean-calendar/labels.js` | 인덱스 → 한자/한글. **표기 축의 유일한 경계** |
| `lib/korean-calendar/policy.js` | 야자시 정책. 기본값은 현행과 동일 |
| `scripts/verify-korean-calendar-*.mjs` | 가드 5종, 전부 `pr-ci.yml` fast 잡 배선 |

**소비자는 0개다.** 기존 동작은 한 줄도 바뀌지 않았다.

### 가드 5종과 그 실측값

| 가드 | 통과 시 출력 |
|---|---|
| `table-fresh` | 검사 21건 · 블록 202 · 달 2,499 · 절기 4,872 |
| **`divergence`** | **73,414일 · 차이 2,997일(4.08%) · CST 2,877 · LMT 120 · 잔차 0** |
| `solar-terms` | 4,824건 · 평균 0.211분 · 최대 1.04분 · 2분 초과 0건 |
| `midnight-register` | 등기부 51건(절기 34 · 삭 17) · 창 ±300초 |
| `kasi-samples` | 표본 289건 · 일진 289 · 음력프레임 232 · 갈리는날 82 |

음성 테스트 **10종 전부 빨간불 확인**(복원은 메모리 버퍼).

## 3. 🔴 다음 세션이 반드시 알아야 할 것

### (A) 프로토타입이 두 번 낸 버그 — 다시 내지 말 것

1. **S11(동지가 든 삭월)을 순간으로 비교하면 틀린다.** 반드시 **KST 민용일 정수**로 비교한다.
   1984 동지는 KST 12-22 01:23 이고 직전 삭도 KST 12-22 다 — 순간으로는 삭 < 동지라 앞 삭월이
   잡히고, 그 뒤 모든 달이 한 칸 밀려 설날 1985 가 한 달 틀린다.
2. **절기 탐색 시작점이 드리프트하면 엉뚱한 해를 잡는다.** 직전 절기 + 1일에서 다음을 찾는다.
3. **같은 삭을 두 번 탐색하면 안 된다.** 반복 해법의 수렴 차이로 몇 ms 다른 값이 나오고,
   `>=` 비교에서 그 달이 통째로 사라진다(1966년에서 터졌다). 삭은 전역으로 한 번만 열거한다.

### (B) KASI 의 세차·월건은 우리 것과 **다른 프레임**이다

KASI `getLunCalInfo` 의 `lunSecha`/`lunWolgeon` 은 **음력 프레임**이다 — 세차가 **설날**에 바뀌고
월건은 **음력 달**의 간지다. 우리 코어의 `ganji()` 는 **절기 프레임**이다 — 세차가 **입춘**에,
월건이 **절(節)** 에 바뀐다.

🔴 그냥 대조하면 45건이 어긋난다. 어느 쪽도 틀린 게 아니다. 실측으로 확인했다(232/232):
음력 프레임을 코어의 음력 출력에서 유도하면 KASI 와 전건 일치한다. `lunIljin`(일진)은
연속 순환이라 프레임과 무관하고 **289/289 일치**한다.

→ **절기 프레임 세차·월건을 KASI 로 검증하려면 `get24DivisionsInfo` 를 써야 한다.** 아직 안 했다.

### (C) 🟢 클래식 스크립트판은 PR-C 에서 만들어졌다 — `js/core/korean-calendar.js`

**표만이 아니라 코어 소스 자체를 변환해 싣는다.** `scripts/build-korean-calendar-table.mjs` 가
`lib/korean-calendar/{policy,labels,core,ganji}.js` 에서 모듈 구문(import/export)만 걷어내
IIFE 하나로 감싸고, 전역 `window.KoreanCalendar` 를 만든다. 손으로 한 벌 더 쓰지 않은 이유는
그 순간 두 벌이 갈라지기 때문이다 — 이 작업의 시작점이 바로 "엔진마다 달력이 다르다" 였다.

- 공개 표면은 `lib/korean-calendar/index.js` 에서 **읽어서** 만든다(손으로 적은 목록은 가드가 아니다)
- 최상위 이름이 겹치면 **빌드가 죽는다**. 실제로 `core.js`·`ganji.js` 가 `DAY_MS` 를 각자 선언하고
  있었고, 그래서 `core.js` 가 그것을 export 하도록 바꿨다
- `verify:korean-calendar-table-fresh` ② 가 클래식 번들을 **실제로 평가해** ESM 코어와
  2,010건(음력·간지)을 대조하고 지문·표면까지 본다. 검사 21건 → **29건**
- 로드는 `js/core/index-inline-runtime.js` 의 체인 **두 곳**(`__cdEnsureSajuCoreLoaded` ·
  `__cdEnsureSajuRenderersLoaded`) 맨 앞. 하네스도 같은 순서로 미리 평가한다
  (`scripts/lib/ziwei-engine-harness.cjs` 의 `PRELUDE_SCRIPTS`)
- 예고대로 `sync:public` 캐시키가 돌아 `index.html` 포함 22개 미러가 함께 바뀌었다

## 4. 남은 작업 — 전환 PR

### 판정 도구 — 추측하지 말고 이걸 돌려라

```
node scripts/verify-korean-calendar-divergence.mjs --explain 1980-01-01
  → in-band: no — 이 날짜는 바뀌면 안 된다
```

**모든 기존 고정값 날짜에 이걸 먼저 돌려 표를 만들고 나서 코드를 고친다.**
- 밴드 **안** → 그 픽스처는 중국 음력으로 계산된 값이다. 갱신하고 커밋 메시지에 근거를 적는다.
- 밴드 **밖인데 값이 움직였다** → 🔴 그 PR 의 버그다. 즉시 멈춘다.

### 🟢 PR-C — 자미두수 3엔진 + 하드코딩 시드 제거 (끝)

브랜치 `feat/ziwei-korean-calendar`, base `cc22b4520`. 예고된 6곳을 전부 했고, **예고에 없던 것 하나를 더 고쳤다**(아래 (가)).

| 대상 | 한 것 |
|---|---|
| `js/saju-engine.js` | `KASI_LOCAL_PATCH_SEED`·`_applyKasiSeedGuard` 삭제. `KasiEngine.solarToLunar/lunarToSolar` 가 코어를 읽는다. `calcZiweiPalaces`·`safeSolarToLunar`·`safeLunarToSolar` 의 lunar-javascript 폴백 제거 — 코어가 없으면 **던진다** |
| `js/core/kasi/calendar.js` | 같은 시드 삭제 + 변환을 코어로. 🔴 **이 파일은 죽어 있다** — 아래 (나) |
| `js/core/kasi-calendar-service.js` | `_AUTHORITATIVE_*` 하드코딩 표 → `_applyCoreCalendarCorrection`(코어와 어긋나면 코어로 맞추고 `korean-calendar-core-correction` 진단을 남긴다). 두 폴백도 코어로 |
| `worker/lib/ziwei-ai-chart.js` | `getLunarDate` → 코어. 세차는 `sexagenaryYearIndexes(lunarYear)`. lunar-javascript import 0 |
| `app/_lib/ziwei-engine.ts` | 같음. import 는 `@/lib/korean-calendar` |
| `js/core/index-inline-runtime.js` | 체인 **두 곳** 맨 앞에 `/js/core/korean-calendar.js` |
| `scripts/lib/ziwei-engine-harness.cjs` | `PRELUDE_SCRIPTS` — 하네스가 브라우저와 같은 순서로 코어를 먼저 평가한다 |
| `scripts/verify-ziwei-star-parity.mjs` | 1997-02-10 **복귀** + 검사 ⑦ 신설 |

**미리 지목된 고정값 — 전부 예고대로였다**

| 대상 | 결과 |
|---|---|
| star-parity 의 1997-02-10 제외 | 🟢 제외 없앰. 세 엔진 전부 음력 1997/1/3. 검사 20건/28명 → **21건/29명** |
| `verify-ziwei-brightness-constraints.cjs` | 🟢 **45건 중 19건 실패, 숫자 그대로.** C 케이스 값도 그대로고 근거만 시드 → 로직 |
| `verify-admin-saju-prompt-kasi-calendar.mjs` | 🟢 PASS |
| `verify-ziwei-sohan`(35) / `verify-ziwei-worker-chart-facts`(114) | 🟢 통과. 1980-01-01 은 `--explain` 결과 `in-band: no` 라 안 움직이는 게 맞다 |

밴드 판정 실측(2026-08-27): 1980-01-01 · 1991-02-20 · 1991-09-02 · 2000-01-01 = `in-band: no`,
**1997-02-10 만 `in-band: yes`**. 즉 star-parity 케이스 중 값이 움직여야 할 날짜는 하나뿐이었고, 실제로 하나만 움직였다.

#### (가) 🔴 예고에 없던 수정 — 셸의 자미 세차가 브라우저에서만 절기 프레임이었다

셸 `calcZiweiPalaces` 는 년간지를 `KasiEngine.getGanji(baseDate).secha` 로 덮어쓰고 있었다.
그 값은 `js/core/kasi-calendar-service.js` 의 `_yearGanjiFromIpchun` — **절기 프레임(입춘 경계)** 이다.
그러나 자미두수의 년간지는 **음력 프레임(설날 경계)** 이고, 워커·앱은 둘 다 음력 프레임이었다.

- **가드가 못 봤다.** 하네스에는 `window.KasiCalendarService` 가 없어 그 호출이 항상 null 로 떨어졌다.
  브라우저에서만 갈렸다는 뜻이다.
- **실측 범위는 좁다.** `_VALIDATED_SOLAR_TERMS_BY_YEAR` 에 **1990년치만** 있고
  `_computeGanjiFromDate` 는 월경계 절기 12개 미만이면 null 을 낸다. 그래서 실제로 갈리는 것은
  1990-01-27(설날) ~ 1990-02-04 11:13(입춘) 출생 **9일 구간**이고, 셸=己巳 · 워커/앱=庚午 였다.
  🔴 그 표에 다른 해를 추가하면 그 해에도 즉시 갈렸을 것이다.
- 고친 방법: 덮어쓰기를 지우고 `sexagenaryYearIndexes(음력해)` 로 뽑는다. 셸의 표기 축은 한자라
  `STEM_HANJA`/`BRANCH_HANJA` 를 쓴다.
- 🔴 **PR-D 를 할 때 이 구분을 다시 확인할 것** — 사주는 절기 프레임이 맞다. 같은 `getGanji` 를
  사주 경로에서는 계속 쓴다. 프레임이 두 개라는 것이 문제가 아니라, **자미가 사주 것을 쓰던 것**이 문제였다.

#### (나) `js/core/kasi/calendar.js` 는 죽은 파일이다 (3면 grep 실측 2026-08-27)

- 어느 HTML 도 로드하지 않는다(`index.html` 에 스크립트 태그 없음)
- `__tests__/` 참조 0건, `scripts/verify-*` 참조 0건
- 읽는 곳은 `scripts/test-saju-regression.js` · `scripts/test-saju-solar-term-regression.mjs` ·
  `scripts/validate-phase4.mjs` 셋뿐이고, **셋 다 `package.json`·`.github/workflows/` 어디에도 배선돼 있지 않다**
- `window.KasiEngine` 을 두 번째로 만드는 사본이라, 로드되면 살아 있는 정본과 충돌한다

이번에는 **지우지 않고** 시드만 걷어내고 변환을 코어로 맞췄다(다음 세션이 읽고 CST 달력을 복제하는 것을 막기 위해).
🔴 지우는 판단은 사용자에게 남긴다 — 지우려면 위 세 스크립트도 함께 정리해야 한다.

### 🟢 PR-D — 사주 간지(절기) 전환 (끝)

브랜치 `feat/saju-korean-calendar`, base `afd219b6f`, **PR #1179**. 예고된 애드혹 CST 보정 5곳을 전부 코어로 대체했다.
`SOLAR_TERM_BASE_OFFSET_MINUTES = 480` 은 예고대로 **삭제**했고(540 으로 바꾼 게 아니다),
`verify:hour-pillar-parity` 6케이스는 예고대로 **하나도 안 움직였다**.

| 대상 | 한 것 |
|---|---|
| `worker/routes/kasi.js` | `computeLocalSolarTerms` → 코어. 필요 없어진 lunar-javascript 이름 별칭 맵 삭제 |
| `js/saju-engine.js` | 24절기 카드 → `window.KoreanCalendar`. 고아가 된 `ST24_NAME_TO_KO` 삭제 |
| `js/core/kasi-calendar-service.js` | `_fallbackSolarTerms` → 코어 + **호출부 배선**(아래 ㄱ). 고아가 된 `_solarObjToDate` 삭제 |
| `app/saju/animal-destiny/engine/localSajuCalculator.ts` | 480 삭제. `buildSolarTermBoundariesFromCore`, `source: "korean-calendar-core"` |
| `app/fortune/prompt-hub/kusei-calc.ts` | 480 삭제. `makeSolarTerm` 이 `nodeTerms` 를 읽는다 |
| `scripts/build-korean-calendar-table.mjs` | 절기 저장을 **분 절사 → 분 반올림**(아래 ㄴ) |
| `scripts/verify-saju-solar-term-core.mjs` | **신규 가드** + `pr-ci.yml` fast 잡 배선 |

#### (ㄱ) 🔴 `_fallbackSolarTerms` 는 한 번도 불린 적이 없었다

호출부가 `fallbackTerms` 를 하드코딩 `[]` 로 넘기고 있었다. 그래서 KASI 24절기 API 가 죽으면
`_VALIDATED_SOLAR_TERMS_BY_YEAR` 에 든 **1990년 말고는** 12중절이 모자라 `_fallbackGanji` 의
`hasMonthTerms` 가 거짓이 되고 **년주·월주가 통째로 null** 로 떨어졌다. 코어가 1900~2100 을 덮으므로 닫혔다.
순서는 **API → 검증캐시(1990) → 코어** 다. 기존 값이 하나도 안 움직이게 캐시를 앞에 뒀다.

#### (ㄴ) 🔴 절기 표를 분 반올림으로 바꿨다 — 밴드 판정의 실제 사례

`scripts/test-saju-solar-term-regression.mjs` 의 입춘 ±1분 케이스가 잡았다.

- 1990 입춘 실제 = **11:13:58**(astronomy-engine). 절사 저장 → `11:13` → **11:13 출생이 경오로 넘어갔다.**
- 절사는 경계를 **항상 최대 59초 이르게** 만드는 편향이다. 반올림은 최대 오차 30초에 편향이 없다.
- 영향 실측(1899~2101, 4,872건): 분이 바뀌는 것 2,430건 · **민용일이 바뀌는 것 2건**
  (1950 대한 23:59:58 · 2030 우수 23:59:38) · 양력해가 바뀌는 것 0건.
  그 2건은 節이 아닌 **氣** 라 월건 경계가 아니고, 이미 자정 등기부에 올라 있었다.
- 달력 가드 5종 **수치 전부 불변**. 지문만 `kc1:fc26f10b8aed` → **`kc1:fa21fe1cc7dc`**.

🔴 판정 원칙의 적용례로 남긴다: 값이 움직였을 때 **픽스처를 고치지 말고 원인을 찾는다.**
여기서 원인은 코어의 표현 방식이었고, 그것을 고치니 픽스처가 그대로 통과했다.

#### 새 가드 `verify:saju-solar-term-core` (pr-ci **fast** 잡)

- ① `js/`·`worker/`·`app/`·`lib/` 에서 절기를 다루는 파일을 **전수 발견**(44개)해 CST 애드혹 보정
  (`+3600*1000` · `480 * 60000` · `SOLAR_TERM_BASE_OFFSET_MINUTES`)이 되살아났는지 본다. 발견 0이면 실패.
  🔴 주석은 검사에서 뺀다 — 안 그러면 "예전에는 +1시간을 더했다"는 설명이 자기 자신을 잡는다.
- ② 로컬 절기 생성기 **5벌을 실제로 실행**해 표본 7개 연도의 12節을 코어와 분 단위 대조.
  셋(워커 라우트·셸·kasi-calendar-service)은 모듈 표면이 없어 소스에서 함수를 잘라 실행한다.
  워커 라우트는 `time`·`kst`·`locdate` 를 함께 본다(한 필드만 보면 나머지가 조용히 어긋난다 — 실제로 놓쳤다).
- ③ 1990 입춘 ±1분에서 세차·월건이 실제로 갈리는지. 표에만 반영되고 비교가 딴 값을 쓰는 경우를 잡는다.
- 음성 테스트 4종 전부 빨간불 확인.

#### 🔴 이 PR 이 CI 에서 한 번 죽은 이유

`verify:sitemap-drift`. 셸(`index.html`)과 앱 두 파일이 바뀌면 lastmod 원장이 무효가 된다.
`npm run sitemap:generate` 를 돌려 `sitemap.xml`·`public/sitemap.xml`·`config/sitemap-lastmod.json` 을
**같은 PR 에** 담아야 한다. 실패는 `Typecheck and lint` 라는 이름으로 오므로 `--log-failed` 로 스텝을 먼저 볼 것.

### 🟢 PR-D2 — 워커 사주 엔진의 EightChar 경계 (끝)

브랜치 `feat/worker-saju-korean-calendar`, base `8aa5da6d9`, **PR #1181**.

`worker/lib/destiny-bias-engine.js` 가 년주·월주를 lunar-javascript `EightChar` 로 잡고 있었다.
그 라이브러리는 생시도 절기도 CST 벽시계로 보므로 **KST 로는 월건 경계가 정확히 60분 일렀다.**

실측(2026-08-27, 1960~2030 節 경계 ±150분 창 13,632건, 표기 축을 한자로 맞춰 비교):
월주 불일치 **5,553건(40.74%)** · 년주 불일치 **459건(3.37%)** — 전부 오프셋 `-60`~`-1`분 구간.
각 節 직전 60분에 태어난 사람이 월건을 한 칸 밀린 채로 받고 있었다(입춘이면 세차까지).

| 대상 | 한 것 |
|---|---|
| 년주·월주 | `ganji()` 로. 표기는 그 파일의 기존 한자 알파벳. 범위 밖이면 **던진다**(입력은 이미 1900~2100 클램프) |
| `previousMajorTerm`·`nextMajorTerm`·`monthBoundaryTerm`·`ipchun` | CST 벽시계를 `dateTimeKst` 라는 **이름으로** 실어 보내고 있었다. 코어의 KST 절기표로 |
| 대운 기운 나이 | CST 절기 − KST 생시를 그대로 빼서 최대 60분(≈5일) 어긋나 있었다. 양쪽 다 KST 순간으로 |
| 대운 간지 목록 | **코어 월주에서 파생.** 안 그러면 60분 창에서 월주만 코어를 따르고 대운은 갈린다 |
| 삭제 | `normalizeSolarTermName`·`getSolarTermFromTable`·`toSolarTermSummary`·`solarToUtcMs`(3면 grep: 파일 밖 참조 0) |
| `verify:saju-solar-term-core` | 검사 ④ 신설. 검사 39건 → **41건** |

#### 🔴 대운 나이 관례는 일부러 안 건드렸다 — 다음 사람이 판단할 것

실측(1960~2020 표본 2,304건): `getYun()` 의 **간지 목록은 월주 순/역행과 전건 동일**하다.
그러나 **나이는 축이 다르다** — `getYun().getStartAge()` 는 **세는 나이 정수(1부터)** 이고
`buildDaewoonFromCore` 의 `startAgeYearsDecimalByDiff` 는 **0부터의 소수 나이**라 최대 **12년** 벌어진다
(1964-09-07 22:59 여: getYun 12세 vs 워커 0세).

🔴 그래서 한 응답 안에 두 축이 섞여 있다 — `displayText` 는 소수 나이, `list[].startAgeDisplay` 는 세는 나이.
**이 PR 이전부터 있던 결함**이고, 어느 쪽으로 통일하든 화면의 대운 나이가 크게 움직이므로 여기서 정하지 않았다.
PR-F 로 `getYun` 을 지울 때 반드시 같이 결정해야 한다 — 핸드오프가 경고한 "절사 관례" 가 이것이다.

#### 검사 ④ 가 보는 것

節 경계 ±61·30·1분에서 **워커와 앱 두 엔진을 실제로 돌려** 년주·월주가 코어와 같은지 본다
(표본 3개 연도 × 12節 × 6오프셋 = 216건). 경계 그 분(±0)은 일부러 뺐다 — 표가 분 해상도라
그 1분은 어느 쪽으로도 읽힐 수 있고, 잡아야 할 것은 "경계가 60분 밀렸는가" 다.
음성 테스트: 두 줄을 옛 `eightCharClock.getYearGan()/getMonthGan()` 으로 되돌리면 즉시 빨간불.

🔴 `verify:hour-pillar-parity` 는 **시주·일주만** 대조한다. 이 결함이 안 보였던 이유가 그것이다.

#### 🔴 이 PR 이 남기는 것 — 아직 EightChar 로 절기 프레임을 잡는 곳

전수(2026-08-27 `git grep "getEightChar"`):
`js/saju-engine.js:1275` · `js/luck-sync-diary.js:366,436` ·
`js/saju-engine-tarot-sukuyo-quantum.js:3070,3077,6038,6062,16900,17549` · `js/core/kasi/calendar.js:234,243`(죽은 파일).
셸의 메인 사주 경로는 `KasiCalendarService` 를 타므로 코어를 따르지만, 위 파일들은 별도다.

#### 🔴 신규 발견(미조치) — 셸의 세차가 비KST 브라우저에서 어긋난다

`js/core/kasi-calendar-service.js` 의 `_yearGanjiFromIpchun` 은 입춘을 `atLocal + '+09:00'` 로
**절대시각**으로 파싱해 놓고, 브라우저 로컬 시각으로 만들어진 `solarDate.getTime()` 과 비교한다.
브라우저 타임존이 KST 가 아니면 그 비교가 최대 시차만큼 어긋나 입춘 경계 판정이 틀린다.
CST 문제와는 다른 축(브라우저 타임존)이라 이번 범위 밖으로 뒀다. **재현은 `TZ=UTC` 로 셸 서비스를 평가하면 된다.**

### 🟢 PR-E1 — 남은 절기 프레임 소비자 (끝)

브랜치 `feat/consumers-korean-calendar`, base `d854ccf1d`, **PR #1183**.

🔴 **PR-D2 의 "전수 grep" 이 불완전했다.** `git grep "getEightChar"` 만 해서 `getMonthInGanZhi*` ·
`getYearInGanZhiExact` 를 **직접 부르는 곳**과 `js/saju-engine.js` 의 자리 7곳 · `js/sibyl-system.js:900`
을 놓쳤다. 이번에 정규식을 `getEightChar|getMonthInGanZhi|getYearInGanZhiExact|getPrevJieQi|getNextJieQi`
로 넓혀 다시 세웠고, 그 발견을 **가드 검사 ⑤** 로 고정했다(손 목록이 아니라 소스에서 전수 발견).

| 파일 | 한 것 |
|---|---|
| `worker/lib/life-book-ai-saju.js` | 년주·월주·세운 세차 → 코어. **파생 필드를 코어 기둥에서 다시 뽑는다**(아래 ㄱ). 대운 간지는 코어 월주에 재앵커 |
| `worker/routes/new-year-ai.js` | 월주·세운·월운 → 코어. **년주 프레임 교정**(아래 ㄴ). `parseDateParts` 에 1900~2100 범위 검사 추가 |
| `lib/fortune/range-data.ts` | 일진·월건·24절기 → 코어. 절기 이름 **중국 간체 → 한글**(아래 ㄷ) |
| `worker/routes/fortune-today.js` · `worker/routes/rpg.js` | 정오 일주 → 코어. **값 불변**(표본 7,224건 불일치 0) |
| `scripts/gen-daily.mjs` | 매일 발행 달력 블록 전부 코어. 고아가 된 `createRequire` 제거 |
| `scripts/verify-saju-solar-term-core.mjs` | 검사 ⑤⑥⑦⑧ 신설. **41건 → 51건** |

**실측 값 이동(2026-08-27)**
- `gen-daily` 2024~2028 1,827일 — 음력 표기 **90일(4.93%)** · 월건 3 · 세차 2 · **일진 0**
- `range-data` 2024~2028 60개월 — 절기 날짜 **3개월(5.00%)** · 월건 0 · 이름은 전 개월
  (예: 2025-12 `12-21 冬至` → `12-22 동지`, 2026-02 `02-18 雨水` → `02-19 우수`)

#### (ㄱ) 🔴 파생 필드가 기둥과 다른 축에 있었다

`buildPillarDetail` 은 納音·旬·旬空·十二運星·지지 십신을 **eightChar 에서** 가져온다. 그 값들은
lunar-javascript 가 **CST 절기로 잡은 기둥**에 붙어 있어서, 년·월주만 코어로 바꾸면 갈리는 60분 창에서
**한 응답 안에 두 축이 섞인다.** 새 `pillarFacts(key, pillar, dayStem)` 이 `LunarUtil` 의 **문자열 조회**
(`NAYIN`·`getXun`·`getXunKong`·`ZHI_HIDE_GAN`·`SHI_SHEN`·`CHANG_SHENG`)로 같은 값을 코어 기둥에서 만든다.
🔴 **十二運星만 계산이다** — `CHANG_SHENG_OFFSET[일간] ± 지지인덱스`, 부호는 일간 인덱스의 짝수/홀수다.
가드 검사 ⑦ 이 기둥이 같은 날짜 120건에서 `EightChar` 와 전건 대조한다.

#### (ㄴ) 🔴 신년운세 년주가 음력 프레임이었다

`getYearInGanZhi()` 는 **설날 경계**다. 그런데 그 아래는 격국·용신·십신을 뽑는 **사주** 계산이고
사주 년주는 **입춘 경계**다. 실측: 정오 표본 6,804건(1950~2030) 중 **129건(1.90%)** 이 갈렸고
전부 설날~입춘 구간이다(예: 1950-02-11 음력프레임 己丑 vs 절기프레임 庚寅).
`life-book-ai-saju.js` 는 같은 자리에서 `getYearInGanZhiExact()` 를 써서 **두 엔진이 서로 달랐다.**
사용자 확인을 받고 절기 프레임으로 통일했다.

#### (ㄷ) `/fortune` 월간 화면이 중국 간체를 보여주고 있었다

`termFrom.name` 이 `build-view.ts:265` 에서 그대로 렌더된다. 실측한 출력은 `处暑`·`白露`·`惊蛰`·`清明`
등 **24종 전부 간체**였다. 코어의 `TERM_NAME_KO` 로 바꿨다(사용자 확인). 12개 로케일 템플릿의
`{termText}` 에 보간되므로 비한국어 화면에도 한글이 나간다 — 이전에는 거기에 간체가 나갔다.

#### 🔴 일부러 안 건드린 것 — 일주·시주의 야자시 축

코어 기본값 `shift-day`(23시대 = 다음 날 일진)와 lunar-javascript `getDayInGanZhi()`(그 날 일진)가
**정면으로 갈린다** — 실측 23:30 표본 **540/540 불일치**. 반면 0·1·6·12·18·22시는 전부 0/540 일치이고
**시주는 23시대에서도 0/540 일치**한다. 즉 lunar-javascript 는 일주는 안 바꾸고 시주만 다음날 간으로
뽑는다. 이 축을 정하면 23시대 출생자 **전원의 일주가 하루 움직인다.**
🔴 **PR-F 에서 대운 나이 관례(§PR-D2)와 함께 결정해야 한다.**

#### 검사 ⑤ — 잔존 목록이 줄어들기만 하게 만드는 장치

`js`·`worker`·`app`·`lib`·`src`·`scripts` 에서 CST 프레임 간지 API 호출을 **전수 발견**하고,
발견됐는데 `KNOWN_REMAINING` 에 없으면 실패한다. 발견 0이면 실패, 유령 경로도 실패.
**다음 PR 은 이 목록에서 줄을 지우는 것이 곧 완료 조건이다.**

음성 테스트 7종 전부 빨간불 확인(복원은 메모리 버퍼).

🔴 이 PR 도 `verify:sitemap-drift` 에 걸렸다 — `lib/fortune/range-data.ts` 가 `/fortune` 라우트 산출물을
바꾸기 때문이다. `npm run sitemap:generate` 산출물(원장 50개 갱신)을 같은 커밋에 담아 해소했다.

### 🟢 PR-E2 — 숙요 음력일 (끝)

브랜치 `feat/sukuyo-korean-calendar`, base `161836714`, **PR #1185**. 예고한 10개 파일을 전부 했다.

**실측 이동(2026-08-27, 1950~2030 29,585일)**: 음력일 **1,079일(3.65%)** · **27수 본명숙 1,055일(3.57%)**.
예: 1950-03-19 음력 2/2→2/1, 루수→규수.

| 파일 | 자리 |
|---|---|
| `lib/sukuyo-calendar.ts` · `lib/sukuyo-engine-server.ts` | 숙요 달력 · `calcSukuyoForServer` 정본 |
| `worker/routes/sukuyo.js` | **4곳**(달력·본명숙·프로필·1년운 앵커) |
| `worker/routes/sukuyo-compatibility-ai.js` · `fortune-tea-house.js` · `fortune-today.js` | 궁합·찻집·오늘 |
| `worker/lib/guardian-fortune/adapters/sukuyo.js` | 수호 운세 어댑터 |
| `app/fortune/prompt-hub/sukuyo-prompt-facts.ts` · `app/destiny-compass/_engine/adapters/sukuyoAdapter.ts` | 프롬프트 허브 · 음력 입력 |
| `src/features/fortune-tea-house/lib/sukuyoCompatibilityAdapter.ts` | 찻집 궁합(앱) |
| `scripts/verify-sukuyo-korean-calendar.mjs` | **신규 가드** + `pr-ci.yml` fast 잡 배선 |

#### 🔴 다음 사람이 알아야 할 것

1. **`source` 라벨은 옮겼지만 `buildSukuyoFromLunar` 의 기본값은 안 바꿨다.**
   `worker/lib/sukuyo-ai-calculation.js:137` 의 `String(options.source || "lunar-javascript")` 는 그대로다 —
   낙샤트라(E3)·카르마(E4)가 아직 lunar-javascript 음력일을 먹이고 있어서, 기본값을 바꾸면 **그쪽이 거짓 라벨을 단다.**
   🔴 **E3·E4 가 끝나는 PR 에서 기본값도 함께 옮길 것.**
2. **숙요 세차는 음력 프레임(설날 경계)이다.** 사주의 입춘 경계와 일부러 다르다.
   `calcSukuyoForServer` 는 `sexagenaryYearIndexes(코어 음력해)` 를 쓴다. 가드 검사 ④ 가 고정한다.
3. **`calcSukuyoForServer(y, m, d, hour)` 의 `hour` 는 이제 안 쓰인다.**
   생시는 음력일을 바꾸지 않는다 — 실측 0·1·6·12·18·22·**23**시 전부 정오와 같은 음력일(표본 1,944건).
   시그니처는 `destiny-compass` 어댑터가 넘기고 있어 남겨 뒀다(`void hour;`).
4. **테스트가 자기 달력을 갖고 있었다.** `__tests__/worker/today-detail-modules.test.js` 의 `lunarOf` 헬퍼가
   lunar-javascript 로 기대값을 만들고 있었다 — 4% 의 날짜에서 프로덕션과 조용히 갈린다. 헬퍼도 코어로 옮겼다.
   🔴 **다른 도메인을 이관할 때도 테스트 헬퍼를 같이 볼 것.**
5. **픽스처는 하나도 안 움직였다.** 숙요 테스트의 고정값 11개에 `--explain` 을 먼저 돌렸고 밴드 안은
   `1988-03-07` 하나뿐인데, 그 테스트는 캐시 헤더를 단언하지 본명숙을 단언하지 않는다.

#### 가드 `verify:sukuyo-korean-calendar` — 표본을 손으로 적지 않는다

🔴 **밴드 밖 날짜만 보는 가드는 되돌려도 초록불이다.** 그래서 두 달력을 비교해 **27수가 실제로 갈리는 날**
(980일)을 찾아 거기서 표본을 고른다. 소비자 5벌을 실제로 실행해 ②코어 쪽 값을 내는지 ③서로 같은 값을 내는지
④세차가 음력 프레임인지 본다. ①은 숙요 소스 183개를 전수 발견해 잔존 import 를 분류와 대조한다.

음성 테스트 7종 전부 빨간불 확인. 🔴 **가드 작성 중 오탐이 한 번 났다** — 27수 이름이 한 글자라
`text.includes("진")` 이 본문 아무 데나 걸렸다. 문자열 판정은 정확히 잘라 읽을 것.

### 🟢 PR-E3 — 낙샤트라·베다 (끝)

브랜치 `feat/nakshatra-korean-calendar`, base `0366f5152`. 예고된 4개 파일을 전부 했고,
**예고에 없던 것 둘을 더 고쳤다**(아래 ㄱ·ㄴ).

**실측 이동(2026-08-27, 이 브랜치에서 잰 값)**
- 양력→음력 1950~2030 29,585일 — 음력일 1,079일(3.65%) · 27수 1,055일(3.57%)  (E2 와 같은 수치)
- **음력→양력 1950~2030 표본 28,188건 — 1,044건(3.70%)** 이 하루 어긋난다.
  그 하루가 그대로 요일을 밀고, 베다 어댑터의 **바라(지배 행성)** 가 바뀐다.

| 파일 | 한 것 |
|---|---|
| `worker/routes/nakshatra.js` | `lunarFromInput` → 코어. `isValidBirth` 에 1900~2100 범위 추가. 궁합 경로의 `source` 라벨 |
| `worker/routes/nakshatra-ai.js` | `lunarFromInput` → 코어. 범위는 `isValidBirthInput` 이 이미 막고 있었다 |
| `worker/routes/nakshatra-premium.js` | 3곳(택일 스캔·본인 명식·VVIP)을 `sukuyoFromSolarDate` 하나로 접었다. `isValidBirth` 범위 추가 |
| `worker/lib/nakshatra-codex.js` | (ㄱ) `source` 라벨 2곳 |
| `app/destiny-compass/_engine/adapters/vedicAdapter.ts` | `Lunar.fromYmd().getSolar()` → `lunarToSolar`. 실패 시 던진다(상위 try/catch 가 흡수) |
| `scripts/verify-nakshatra-premium.mjs` | (ㄴ) 하네스가 자기 달력을 갖고 있었다 |
| `scripts/verify-sukuyo-korean-calendar.mjs` | 잔존 4건 제거 + 검사 ②③ 에 소비자 3벌 · 검사 ⑤ 신설. **25건/7벌 → 31건/10벌** |

#### (ㄱ) 라벨이 거짓이 될 뻔했다 — `buildSukuyoFromLunar` 의 기본값 두 개

핸드오프가 경고한 `worker/lib/sukuyo-ai-calculation.js:137` 의 `"lunar-javascript"` 기본값은
**낙샤트라와 무관했다.** 낙샤트라는 `worker/lib/sukuyo-premium.js:117` 의 다른 벌을 쓰고
그쪽 기본값은 `"kasi-api"` 다. 실측(2026-08-27 `git grep`):

- `sukuyo-ai-calculation.js` 벌의 프로덕션 호출부 **4곳 전부가 `source` 를 명시로 넘긴다**
  (guardian 어댑터 · 찻집 워커 · 숙요궁합AI · 찻집 앱). 기본값은 이미 도달 불가다.
- `sukuyo-premium.js` 벌에서 아직 코어가 아닌 음력을 먹이는 곳은 `worker/lib/karma-destiny-ai-calculations.js:809`
  와 `worker/routes/admin.js:1141,1156` — **둘 다 E4** 다.

🔴 **그래서 두 기본값은 E4 에서 함께 바꾼다.** E3 만으로는 아직 이르다. 이번에는 낙샤트라가
넘기는 자리(라우트 1곳 + `nakshatra-codex.js` 2곳)에만 `source: "korean-calendar-core"` 를 적었다.

#### (ㄴ) 검증 하네스가 자기 달력을 갖고 있었다 (PR-E2 4번의 재발)

`scripts/verify-nakshatra-premium.mjs` 의 `buildMuhurtaScanDays` 가 `Solar.fromYmdHms` 로
택일 스캔 60일을 만들고 있었다 — 프로덕션 `buildScanDays` 의 사본인데 달력이 달랐다.
단언이 구조적(길일 개수·결정론·목적 6종 분기)이라 값이 안 걸렸을 뿐이다.
🔴 실제로 `2026-08-01`+60일 구간은 코어와 **불일치 0** 이라 이번엔 아무 수치도 안 움직였다.
그래도 옮겼다 — 창이 옮겨가는 순간 조용히 갈릴 자리였다.

#### 🔴 라우트 안 순수 함수의 검증 표면

`worker/routes/nakshatra*.js` 는 **node 로 직접 import 되지 않는다** — Swiss WASM(`.wasm`)과
`@/` TS 모듈을 끌고 온다(`Cannot find module .../lib/cms/build-text`). 그래서 가드는
레포의 다른 낙샤트라 가드와 같이 **esbuild 로 번들해 돌린다**(`loader: { ".wasm": "empty" }` —
이 가드는 달 황경을 안 쓴다). 번들 116ms · 3.6MB, 캐시 없음.
세 라우트에 `__nakshatraTestUtils` · `__nakshatraAiTestUtils` · `__nakshatraPremiumTestUtils` 를 열었다.

#### 검사 ⑤ — 반대 방향(음력→양력)을 보는 첫 검사

이 어댑터는 27수를 안 쓰지만 **같은 달력 축의 반대 방향**이다. 갈리는 음력 날짜를 실제로 찾아
어댑터를 돌리고, `evidence[0].detail` 의 행성이 **코어 양력일의 요일**에서 나온 것인지 본다
(중국 음력 쪽 행성이면 그 사실도 함께 찍는다).

음성 테스트 6종 전부 빨간불 확인(복원은 메모리 버퍼).
🔴 이 PR 도 `verify:sitemap-drift` 에 걸렸다 — `app/destiny-compass/**` 가 원장을 무효화한다.
`npm run sitemap:generate` 산출물을 같은 커밋에 담아 해소했다.

### 🟢 PR-E4 — 나머지 음력↔양력 변환 (끝)

브랜치 `feat/lunar-conversions-korean-calendar`, base `d72d5c672`(**#1187 위에 쌓았다** — 같은
생성 파일 `config/sitemap-lastmod.json` 과 같은 가드를 건드리므로 main 에서 병렬 분기하면 충돌한다).

**실측(2026-08-27, 이 브랜치에서 잰 값 · 1950~2035)**

| 축 | 표본 | 갈리는 것 |
|---|---|---|
| 양력→음력 | 28,896일 | 1,060일(3.67%) · 음력해도 7건 |
| 음력→양력 | 29,928건 | 1,102건(3.68%) |
| **일진** | 28,896일 | **0일(0.00%)** — 이 축은 원래부터 같다 |

| 파일 | 한 것 |
|---|---|
| `worker/routes/kasi.js` | 로컬 폴백 **두 갈래 전부**(아래 ㄱ) |
| `worker/lib/karma-destiny-ai-calculations.js` | `toLunarParts` + `source` 라벨 |
| `worker/routes/admin.js` | 프롬프트 랩 숙요 + 도달 불가 블록 제거(아래 ㄷ) |
| `worker/lib/human-design-ephemeris.js` | `resolveBirthMoment` 음력→양력 |
| `worker/lib/love-secret-ai-calendar.js` | 일진 달력. 🔴 **값 불변**(위 표) — 그래도 옮긴 이유는 달력이 두 벌이면 다음 사람이 어느 쪽을 고칠지 모르기 때문이다 |
| `app/_lib/normalize-ziwei-input.ts` | 음력→양력 + `touchSolarLibrary` 가 이제 지원 범위 확인을 겸한다 |
| `app/fortune/prompt-hub/{dangsaju-calc,kusei-calc,lite-prompt-tools}.ts` | 양방향. `lunarFromSolar` 의 시각 인자는 음력일을 안 바꾸므로 뺐다 |
| `app/saju/animal-destiny/engine/localSajuCalculator.ts` | `resolveSolarDate` 음력 분기 |
| `app/nakshatra/nakshatra-birth.ts` | **클라이언트 폼 변환**(아래 ㄴ) |
| `worker/lib/{sukuyo-ai-calculation,sukuyo-premium}.js` | `source` 기본값 두 개(아래 ㄹ) |
| `scripts/verify-lunar-conversion-core.mjs` | **신규 가드** + `pr-ci.yml` fast 잡 배선 |

#### (ㄱ) 🔴 KASI 폴백이 아직 중국 음력이었다 — 핸드오프 E4 목록에 없던 것

`worker/routes/kasi.js` 의 `computeLocalCalendarFallback` 은 절기(`get24DivisionsInfo`)만 PR-D 에서
코어로 갔고 **음양력 변환 두 갈래(`getLunCalInfo`·`getSolCalInfo`)는 그대로 lunar-javascript** 였다.

이 라우트는 **레포 전체가 "권위 있는 한국 달력"으로 삼는 지점**이다(`localSajuCalculator` 는
`kasiSolarDate` 를 코어 변환보다 우선하기까지 한다). 즉 KASI 업스트림이 죽는 동안에만
3.67% 의 날짜에서 하루 밀린 음력을 조용히 내주고 있었고, 화면에는 아무 표시도 없었다.
🔴 `verify:korean-calendar-kasi-samples` 가 `source:"local"` 응답을 정답으로 받기를 거부하는
이유가 정확히 이것이었다.

#### (ㄴ) 🔴 정적 grep 이 못 본 것 — 동적 import

`app/nakshatra/nakshatra-birth.ts` 는 `await import("lunar-javascript")` 로 **지연 로드**하고 있어서
`git grep "from \"lunar-javascript\""` 에 안 걸렸다. 음력 입력자의 양력일을 여기서 만들어 서버로
보내는데 서버는 이미 코어라, 그대로 두면 **음력 입력자만 두 달력이 섞인 결과**를 받는다.
코어도 같은 방식으로 지연 로드한다 — 표가 gzip **26.6KB** 라 첫 화면 번들에 넣지 않는다.
🔴 다음에도 `import(` 형태를 함께 찾을 것.

#### (ㄷ) [Cleanup] 도달 불가 블록

`assertAdminCalendarBirthDate` 에 무조건 `return;` 뒤로 윤달 검증 블록이 있었다 — 한 번도 돈 적이 없다.
3면 grep(소스·`__tests__`·`scripts/verify-*`)로 `INVALID_LUNAR_LEAP_DATE` 참조 0 확인 후 **지웠다**.
🔴 **되살리지 않은 이유**: 지금 통과하는 관리자 입력을 갑자기 400 으로 막게 되고, 그 판단은 이 PR 것이 아니다.
다만 근거는 남긴다 — 실측(1950~2035) 코어가 "없다"고 하는 윤달 1,001건 중 lunar-javascript 는
999건에서 던지고 **2건은 조용히 값을 낸다.** 코어는 1,001건 전부 null 이다. 되살리려면 코어로 하는 게 맞다.

#### (ㄹ) `source` 기본값 두 개를 이제 옮겼다

PR-E2 가 "E3·E4 가 끝나는 PR 에서 함께" 로 남긴 이월 항목이다. E3 에서 그 노트가 어느 벌을
지목했는지 틀렸다는 것이 드러났고(§PR-E3 ㄱ), 이 PR 이 마지막 비코어 공급자
(`karma-destiny-ai-calculations.js`·`routes/admin.js`)를 없앴다. 이제 두 벌 모두 `korean-calendar-core` 다.

#### 새 가드 `verify:lunar-conversion-core` (pr-ci **fast** 잡)

- ① `js`·`worker`·`app`·`lib`·`src` 에서 변환 API 호출을 **전수 발견**해 잔존 분류와 대조. 발견 0이면 실패.
- ② **소비자 13벌을 실제로 실행**해 갈리는 날짜에서 코어 쪽 날짜를 내는지. 표본은 손으로 안 적고 찾는다.
  중국 음력 답이 나오면 그 사실도 함께 찍는다.
- ③ 음력→양력 소비자 8벌이 서로 같은 날짜를 내는지.
- ④ **일진 축을 매번 다시 잰다** — "이 축은 안 움직인다"가 주석 속 주장이 아니라 실측으로 남게.
- 검사 35건. 음성 테스트 7종 전부 빨간불(숙요 가드까지 합해 8/8).

🔴 **가드를 쓰면서 배운 함정 둘** (그 자리에 주석으로 박아 뒀다):

1. **`.*$` 는 CRLF 파일의 줄 주석을 못 지운다.** JS 의 `.` 는 `\r` 을 안 넘고 `$` 는(`/m` 없이)
   문자열 끝이라 앵커가 막힌다. 그래서 `scripts/gen-daily.mjs` 의 **주석 한 줄이 코드로 잡혔다.**
2. 🔴 **`scripts/` 를 스캔 범위에서 뺐다.** 검증 스크립트는 두 달력을 비교하는 것이 일이라 전부
   잔존 분류에 올라야 하는데, 그러면 이 파일이 `scripts/verify-*.mjs` 경로를 문자열로 갖게 되고
   `verify:guard-wiring` 이 그 문자열을 **배선 간선으로** 읽는다 — 실제로 `verify:love-compat` 이
   미배선에서 배선으로 뒤집혀 CI 가 빨간불이 됐다. 지켜야 할 것은 배포되는 코드다.

#### 이 PR 이 남기는 것

`verify:sukuyo-korean-calendar` 의 `KNOWN_REMAINING` 은 **비었다.** 비어 있는 것이 통과 조건이
아니라, "발견 0 = 실패" 가 fail-closed 를 잡는다.

🔴 이 PR 도 `verify:sitemap-drift` 에 걸렸다(원장 88개 갱신). 같은 커밋에 담아 해소했다.

### 🟢 PR-E5 — 정적 셸 (끝)

브랜치 `feat/shell-korean-calendar`, base `50f3c0146`. 예고된 5파일을 전부 했고,
**예고에 없던 판정 하나를 더 내려야 했다**(아래 ㄱ — 야자시 축이 두 개인 것이 셸 안에서도 그랬다).

**실측(2026-08-27, 이 브랜치에서 잰 값)**

| 축 | 표본 | 갈리는 것 |
|---|---|---|
| 절기 프레임(세차·월건) | 節 1950~2030 직전 30분 | **939건** — 이 구간이 두 프레임의 밴드다 |
| 일진(`getGanZhiForDate`) | 3,888건(1950~2030 · 0/12/23시) | **0건** — 이관 전 값과 전건 같다 |

| 파일 | 한 것 |
|---|---|
| `js/saju-engine.js` | `_coreEightChar` 헬퍼 신설 · `buildGanjiRepairCandidate` 마지막 안전망 · `_calcModalProfilePillars` · `_calculateMonthBranchBySolarTerm` · `runCompatCore` · 세운 카드 2벌 · 유명인 스캔 · `calcZiweiPalaces` 죽은 지역변수 제거 |
| `js/saju-engine-tarot-sukuyo-quantum.js` | `getGanZhiForDate` · `getMonthGanZhi` · 로또 시드 2벌 · 퀀텀 세운 2벌 |
| `js/luck-sync-diary.js` | `_coreGanjiPillars` 신설(야자시 명시) · KasiEngine 폴백 · 활성 프로필 원국 · 진입 게이트 2벌 |
| `js/sibyl-system.js` | `_getMonthGanZhiFor` 월건 폴백 |
| `js/core/index-inline-runtime.js` | 생년월일 모달 의존성 판정 2벌 + lunar CDN 대기를 비치명으로 |
| `lib/korean-calendar/policy.js` | 두 야자시 축과 그 호출부를 주석에 박았다 |
| `scripts/verify-shell-korean-calendar.mjs` | **신규 가드** + `pr-ci.yml` fast 잡 배선 |

#### 🔴 (ㄱ) 야자시 축이 **셸 안에서도** 둘이었다 — 그게 이 PR 의 가장 큰 판정

인수인계는 `options.yaja` 를 명시하는 두 호출부만 짚었는데, 실제로는 **`lunar-javascript` 의
기본 유파(sect 2)가 혼종**이라 축이 하나 더 숨어 있었다. 실측(2024-03-10 23:30):

| | 일주 | 시주 |
|---|---|---|
| lunar-javascript sect 2 (이관 전) | 癸酉 (**안 민다**) | 甲子 (**민 날의 일간**으로 뽑는다) |
| 코어 `shift-day` | 甲戌 | 甲子 |
| 코어 `keep-day` | 癸酉 | 壬子 |

즉 이관 전 셸의 EightChar 는 **일주는 keep-day, 시주는 shift-day** 였다 — 자기 자신과 어긋나 있었다.
그래서 자리마다 축을 정해야 했다:

- **"오늘 일진" 축 = `keep-day`** — `getGanZhiForDate`(퀀텀) 와 `_coreGanjiPillars`(럭싱크).
  근거는 유파가 아니라 **그 값을 덮어쓰는 쪽**이다: `KasiCalendarService.computeGanjiFromDate` 가
  날짜를 안 밀고, 퀀텀의 일·월운 카드는 그 값으로 `dayGZ` 를 덮는다. 기본값으로 부르면
  덮기 전과 후가 23:00~23:59 에만 달라진다. 이 선택으로 **일진 3,888건이 전건 불변**이다.
- **출생 원국 축 = `shift-day`(코어 기본값)** — `_cdCivilDayPillar` 가 셸의 정본이고 그것이 shift-day 다.
  `buildGanjiRepairCandidate` 도 여기에 맞췄다(그래서 그 자리는 23시대 값이 **바뀐다** — 아래 ㄴ).

🔴 **두 축이 다른 것은 유파 결정이고 이 PR 이 정하지 않았다.** 각 호출부가 명시하게 만들고
`lib/korean-calendar/policy.js` 주석에 호출부 목록을 박았다. 통일하려면 그건 별도 결정이다.

#### 🔴 (ㄴ) 값이 움직인 자리는 둘뿐이다

1. **節 경계 ±60분의 세차·월건** — 이 PR 의 목적이다. KST 프레임으로 정정된다.
2. **`buildGanjiRepairCandidate` 의 23시대 일주·시주** — 위 (ㄱ) 의 혼종이 정리되면서
   `_cdCivilDayPillar` 와 같아진다. 🔴 이 자리는 **KASI 두 경로(서비스·엔진)가 모두 죽었을 때만**
   돈다. 하네스에는 `KasiCalendarService` 가 없으므로 새 가드는 항상 이 경로를 밟는다.

그 밖은 전건 불변이다. 특히 `_calcModalProfilePillars`·`runCompatCore`·유명인 스캔은
이관 전에도 일주·시주가 KASI/`_cdCivilDayPillar` 로 덮이고 있어서 값이 그대로다.

#### 🔴 (ㄷ) 모달 프로필에 대운 브리지를 새로 붙였다

`_calcModalProfilePillars` 의 `bazi` 는 이관 전에 **진짜 EightChar** 여서 `getYun` 이 딸려 있었다.
코어 팔자에는 그 축이 없으므로 그냥 바꾸면 **이 경로로 들어온 사용자만 퀀텀 전략·로또의 대운이
조용히 빈다**(`G_BAZI.getYun` 을 `try/catch` 로 감싸고 있어 에러도 안 난다).
그래서 `attachKasiDaewunBridge` 를 `calculate()` 와 같은 모양으로 붙였다 —
넘기는 시각은 **진태양시 보정 전 원본**이다(그쪽 호출과 축을 맞춘다).

#### 🔴 (ㄹ) `index-inline-runtime` 의 lunar CDN 대기를 비치명으로 바꿨다

`__cdEnsureSukuyoZiweiCoreLoaded` 는 체인을 태우기 전에 `__cdEnsureLunarLibReady()` 를 **await** 했고,
그것이 reject 되면 `openSukuyoModal` 의 catch 가 로그만 남기고 끝나 **생년월일 모달이 통째로 안 열렸다.**
이제 숙요·자미의 달력은 코어에서 나오므로 이 라이브러리는 그 화면의 선택 의존성이다 — `.catch` 로 흘린다.
🔴 이건 예고에 없던 변경이다. 넣은 이유는 같은 함수의 `needsCore` 를 코어 기준으로 바꾸는 것만으로는
**아무것도 로드 안 된 첫 진입**에서 여전히 CDN 에 묶이기 때문이다.

#### 새 가드 `verify:shell-korean-calendar` (pr-ci **fast** 잡)

🔴 **왜 별도 가드인가**: `verify:saju-solar-term-core`·`verify:lunar-conversion-core` 는
소스 스캔 + 모듈 실행이라 **정적 셸의 값을 못 본다**(PR-E2 가 그렇게 놓쳤다). 셸은 ESM 이 아니라
브라우저 전역에 얹히는 한 덩어리 스크립트다.

- ① `scripts/lib/ziwei-engine-harness.cjs` 의 `bootstrapDom` 으로 셸 3벌을 평가하되
  **`global.Solar`/`global.Lunar` 를 지운 채** 돌린다. 누가 EightChar 를 되살리면
  조용한 폴백이 아니라 **여기서 터진다.**
- ② 節 직전 30분에서 두 프레임이 갈리는 날을 **찾는다**(손으로 안 적는다). 0 이면 실패.
- ③~⑦ 셸 함수 5벌(`buildGanjiRepairCandidate`·`_calculateMonthBranchBySolarTerm`·
  `getMonthGanZhi`·`getGanZhiForDate`·`calcZiweiPalaces`)의 값을 코어와 대조.
  ⑥ 는 **이관 전 lunar-javascript 값과도 같은지**를 함께 보고(불변 증명),
  ⑥-b 는 23시대 마지막 안전망이 `_cdCivilDayPillar` 와 같은지를 본다.
- ⑧⑨ IIFE 안의 비공개 함수(`_coreGanjiPillars`·`_getMonthGanZhiFor`)는 소스에서
  **중괄호 균형으로 잘라내 실제로 실행**하고 넘어온 인자를 관찰한다 — 문자열 매칭이 아니다.
  스파이가 `nightZiPolicy` 를 기록하고, 표본이 두 정책을 실제로 가르는지도 함께 단언한다.
- 검사 **25건**. 음성 테스트 **7종 전부 빨간불** 확인(복원은 메모리 버퍼).

#### 이 PR 이 남기는 것

`verify:lunar-conversion-core` ① 잔존 6개 · `verify:saju-solar-term-core` ⑤ 잔존 5개(가드 자신 포함).
제품 코드에서 lunar-javascript 가 남은 자리는 아래가 전부다:

| 파일 | 남은 이유 |
|---|---|
| `js/saju-engine.js` | `attachKasiDaewunBridge` 한 자리 — 대운 `getYun` 을 코어 팔자에 붙여 준다 |
| `js/saju-engine.js` 1958·4942·5117 | CDN 로더의 가용성 검사(대운이 아직 이 라이브러리를 쓰므로 유효하다) |
| `js/core/index-inline-runtime.js` | `__cdHasLunarLibReady` — 로더 자신의 준비 판정 |
| `js/core/kasi/calendar.js` | **죽은 사본** — 어느 HTML 도 로드하지 않는다. 삭제 판단은 사용자에게 |
| `worker/lib/destiny-bias-engine.js` · `worker/lib/life-book-ai-saju.js` · `worker/routes/new-year-ai.js` | 일주·시주 EightChar + 대운 — PR-F |

🔴 예고대로 `sync:public` 캐시키가 돌아 **미러 13개 + `index.html`** 이 함께 바뀌었고,
`verify:sitemap-drift` 도 걸려 원장 62개를 같은 커밋에 담았다.

### 🟢 PR-F1 — 대운 (끝)

브랜치 `feat/daeun-korean-calendar`, base `524e85c88`.

🔴 **관례는 한 줄도 안 바꿨다.** 대운의 기운 나이는 유파마다 절사 관례가 갈리므로 "더 정확한
계산"으로 바꾸면 기존 사용자의 대운이 이유 없이 전부 움직인다. `lunar-javascript` 1.7.7
`getYun(gender)` 의 **sect 1** 계산을 그대로 옮겼다. 바뀌는 것은 節의 시간대 하나다.

#### 🔴 (ㄱ) 실측 — 값이 절반에서 움직인다

| 축 | 표본 8,810건(1950~2035) |
|---|---|
| 어떤 축이든 움직인 것 | **4,409건 (50.05%)** |
| 그중 1번 대운 **시작 나이**가 바뀐 것 | 187건 (2.1%) |
| **순역이 뒤집힌 것** | 28건 (0.3%) — 입춘 경계 60분 창의 세차가 갈리는 경우 |

50% 는 오타가 아니다. 사용자의 생시는 **KST 벽시계**인데 lunar-javascript 의 절기는
**CST 벽시계**이고, 대운은 그 둘 사이의 **시진(2시간) 수**를 센다. 두 축이 60분 어긋나 있었으므로
절반 정도의 표본에서 시진 하나(=10일)가 더/덜 세어졌다. PR-D2 가 월건에서 고친 것과 같은 결함이다.

#### 🔴 (ㄴ) 재현한 관례 — 손대면 가드가 잡는다

```
순역   양년(세차 천간 짝수) 남자 · 음년 여자 → 순행
구간   순행이면 [생시 → 다음 節], 역행이면 [직전 節 → 생시]
거리   시진 단위. 🔴 23시대는 시지 0 이 아니라 11 로 본다
       hourDiff<0 이면 +12 하고 dayDiff-1 · monthDiff=floor(hourDiff*10/30)
       month=dayDiff*4+monthDiff · day=hourDiff*10-monthDiff*30 · year=floor(month/12)
시작   생일 + year년 → + month월 → + day일  (🔴 이 **순서**와 월말 보정이 관례의 일부다)
나이   세는 나이 정수. 0번 칸은 미입운 구간(간지 없음), 1번 칸부터 10년씩
```

#### 🔴 (ㄷ) 셸의 호출부는 한 줄도 안 건드렸다

`attachKasiDaewunBridge`(`js/saju-engine.js`)가 코어 대운을 **`getYun()` 과 같은 표면**으로
감싸 붙인다. 소비자 4곳(`js/saju-engine.js` 2 · `quantum` 2)은 그대로다.
🔴 그래서 `.getYun(` 을 grep 해도 두 출처를 못 가른다 — 가드 ⑤ 가 **import 축**을 세는 이유다.

#### 🔴 (ㄹ) 대운은 진태양시 보정 **전** 원본 생시로 잰다

보정본을 넣으면 節까지의 거리가 경도 보정만큼 움직여 기운 나이가 달라진다.
셸(`calculate`·`_calcModalProfilePillars`)과 워커(`destiny-bias-engine`) 모두 같은 축이다.

#### 새 가드 `verify:daeun-korean-calendar` (pr-ci **fast** 잡)

- ① 🔴 **핵심.** `daeunFromFrame` 은 표를 안 읽고 절기를 인자로 받으므로, **lunar-javascript
  자신의 절기·세차·월주를 먹이면 그 라이브러리와 잔차 0** 이어야 한다(표본 8,810건 · 1902~2098).
  이것이 "포팅이 관례 재현" 임의 유일한 근거다. 기운 **시작일**까지 대조한다 —
  years/months/days 만 보면 월말 보정(2/29→2/28)을 지워도 통과한다(음성 테스트에서 실제로 그랬다).
  표본에 말일 4종(1/31·2/29·3/31·5/31)을 넣은 이유가 그것이다.
- ② KST 로 바꾸면 값이 실제로 움직이는지 **매번 다시 잰다**(위 표의 숫자가 여기서 나온다).
- ③④ 소비자를 실제로 실행한다. 정적 셸은 `global.Solar` 를 **지운 채** 평가한다.
- ⑤ lunar-javascript **import** 를 전수 발견해 잔존 분류와 대조. 대운은 이제 0건이다.
- 검사 14건. 음성 테스트 **9종 전부 빨간불** 확인.

### PR-F2 — lunar-javascript 물리적 제거 (남은 작업)

🔴 **여기부터는 달력 작업이 아니다.** 남은 것은 **일주·시주 EightChar** 다.
🟢 **명리 상수 표는 끝났다 — 아래 (ㄹ).**

| 파일 | 아직 쓰는 것 |
|---|---|
| `worker/lib/life-book-ai-saju.js` | 일주·시주 EightChar (`Solar` 하나만 남았다) |
| `worker/lib/destiny-bias-engine.js` | 일주 EightChar + `Lunar`/`Solar` 변환 |
| `worker/routes/new-year-ai.js` | 일주·시주 EightChar |

**정본 목록은 손 목록이 아니다** — `verify:daeun-korean-calendar` 검사 ⑤ 의 `KNOWN_REMAINING` 에서
그대로 옮겨 적은 것이고, 그 줄을 지우는 것이 완료 조건이다.

착수 순서
1. 🔴 **남은 일감 — 일주·시주 EightChar 3곳.** 축이 이미 정해져 있다(`shift-day`, §PR-E5 ㄱ 의 실측표).
   🔴 lunar-javascript 의 sect 2 는 **일주는 안 밀고 시주만 미는 혼종**이라 23시대 값이 그대로
   재현되지 않는다. 어느 축인지 정하고 `nightZiPolicy` 를 명시해 넘길 것.
2. 🟢 **`LunarUtil` 상수 표 이관 — 끝났다(2026-08-28).** 아래 (ㄹ).
3. **그 다음에** `package.json` 에서 `dependencies` → `devDependencies` 로 내린다.
   🔴 **지우면 안 된다** — 가드 5개(`korean-calendar-divergence`·`solar-terms`·
   `shell-korean-calendar`·`daeun-korean-calendar`·**`myeongri-tables`**)가 **대조 대상으로**
   이 라이브러리를 읽는다.
4. **셸의 CDN 로더 제거는 별도 단계로 두는 편이 낫다** — 아래 (ㅁ).

#### 🟢 (ㄹ) `LunarUtil` 명리 표 — `lib/saju/myeongri-tables.js` 로 이관 완료 (2026-08-28)

사용자가 **안 1(새 도메인 디렉터리)** 을 골랐다. `lib/human-design/` 과 같은 모양이고 워커·App Router
양쪽에서 쓸 수 있으며, `lib/korean-calendar/` 의 `CLASSIC_MODULES` concat 밖이라 셸 번들이 안 커진다.
소비자가 하나뿐이라 배럴(`index.js`)은 만들지 않았다.

**옮긴 것** — 표 6종 + 배열 1개 + 함수 2개. 🔴 `LunarUtil` 의 표는 키가 **두 벌**이다(i18n
플레이스홀더 `{tg.jia}`·`{dz.zi}`·`{jz.jiaZi}` 와 한자). 소비자는 한자 키만 쓰고 레포에 그 사전도
없으므로 **한자 키만** 실었다 — 그래서 실제 키 수는 이 문서가 앞서 적은 수의 절반이다.

| 이름 | LunarUtil 총 키 | 옮긴 한자 키 |
|---|---|---|
| `NAYIN` (納音) | 120 | **60** |
| `SHI_SHEN` (십신) | 200 | **100** |
| `ZHI_HIDE_GAN` (지장간) | 24 | **12** |
| `WU_XING_GAN` (오행·천간) | 20 | **10** |
| `WU_XING_ZHI` (오행·지지) | 24 | **12** |
| `CHANG_SHENG` (십이운성) | 배열 12 | **배열 12** |
| `CHANG_SHENG_OFFSET` | 20 | **10** |
| `getXun`/`getXunKong` (순공) | 함수 2개 | 인덱스 산술로 재작성 |

**증명** — `npm run verify:myeongri-tables` (pr-ci **fast 잡** 배선 완료, 검사 24건):

- ① 표 7종을 `LunarUtil` 과 키 단위 전수 대조 → **216키 잔차 0**
- ② 대조 키가 0이 아님(fail-closed) · ③ 旬空 **60갑자 전건** 잔차 0
- ④ `SHI_SHEN` 표를 레포의 **독립 규칙** `tenGodFor`(오행 상생상극 + 음양)와 교차 검증 → **100/100 일치**
- ⑤ `calculateLifeBookAiSaju` 를 **실제로 실행**(258표본 · 대운 순공 2,580건) → 파생 필드 잔차 0
- ⑥ 제품 소스(`js`·`worker`·`app`·`lib`·`src`)에 `LunarUtil` 참조 **0건**
- 음성 테스트 `--self-test`: 값 뒤집기 · 키 누락 · 잉여 키 · 플레이스홀더 혼입 · 배열 순서 변경 **전부 빨간불**.
  파일을 실제로 훼손한 종단 음성 테스트 2종(값 1글자 · `LunarUtil` 참조 되살리기)도 빨간불 확인.

**추가 실측** — 이관 전/후 `calculateLifeBookAiSaju` 출력 1,032표본(1950~2035 × 12월 × 성별 2)을
JSON 으로 덤프해 대조: **sha256 `e9b097fd…` 바이트 동일**(24,046,328 B).
이 표는 시간대와 무관하므로 값이 움직이면 정정이 아니라 이관 실수다 — 그래서 대운(§PR-F1)처럼
"얼마나 움직였나" 가 아니라 **"하나도 안 움직였다"** 를 잰다.

🔴 **찾은 것 하나** — 새로 쓴 `getXun` 이 빈 문자열에 `甲子` 를 돌려줬다(`"".charAt(0)` 이 `""` 이고
`indexOf("")` 가 0). 가드 ③ 이 잡아 고쳤다. 원본은 그 입력에 예외를 던졌고 우리는 `""` 를 돌려준다 —
소비자에 그 경로는 없다(`buildPillarDetail` 이 빈 기둥을 먼저 걸러낸다).

🔴 **범위 밖으로 남긴 것 (이관 전부터 있던 상태, 이 PR 이 만든 것이 아니다)**
- 레포에 흩어진 십신 구현 통합 — `lib/five-element-colors.ts` `tenGodOfStem`,
  `app/saju/animal-destiny/engine/localSajuCalculator.ts` `tenGodForStem`. 값이 다를 수 있어 별도 대조 필요.
- 🔴 **지장간이 두 벌이고 순서가 다르다** — `worker/lib/life-book-ai-saju.js` 의 `HIDDEN_STEMS` 는
  巳를 `["丙","戊","庚"]` 로, `ZHI_HIDE_GAN` 은 `["丙","庚","戊"]` 로 갖는다(원본 그대로 옮겼다).
  실측 2026-08-28 (1977-06-10 10:00 남): 같은 `pillarDetails.year` 안에서
  `branchTenGods=["편인","식신","비견"]` · `hiddenStems=[丙:편인, 戊:비견, 庚:식신]` 로 **집합은 같고
  순서만 다르다.** 어느 쪽이 옳은지는 유파 문제라 판정하지 않았다 — 합칠 때 별도 대조가 필요하다.

#### 🔴 (ㅁ) 셸의 CDN 로더 — PR-F1 이 일부러 안 건드린 것

PR-F1 이후 **정적 셸은 lunar-javascript 를 하나도 안 쓴다**(가드 ③ 이 `global.Solar` 를 지운 채
셸을 평가해 매번 증명한다). 그런데도 아직 받아 온다:

- `js/saju-engine.js:20-25` `CDN_URLS` — 🔴 `lunar-javascript@latest`, **핀 없는 서드파티 실행 코드**
- 같은 파일의 `loadNext`/`waitForSolar`/`onLibReady`/`retrySajuLibraryLoad` + 로딩 오버레이
- `startSajuCalculationFlow`·`calculate` 의 가용성 게이트 2벌
- `js/core/index-inline-runtime.js` `__cdHasLunarLibReady`/`__cdWaitForLunarLibReady`/
  `__cdEnsureLunarLibReady` + `__cdEnsureSajuCoreLoaded` 체인의 CDN URL
- `js/services/saju-library-loader.js` · `js/inline/saju-core-bootstrap.js` 의 호출부
- `scripts/lib/ziwei-engine-harness.cjs` 의 `global.Solar` 스텁

🔴 **왜 미뤘나**: 이 로더는 "엔진 로딩 중" 오버레이와 `__pendingAutoCalculation` 재시도 흐름을
같이 들고 있어서, 지우면 **계산 진입 UI 흐름**이 바뀐다. 값이 절반에서 움직이는 달력 정정과
UI 흐름 변경을 한 PR 에 담으면 회귀가 났을 때 어느 쪽 탓인지 판정할 수 없다
(`lib/korean-calendar/policy.js` 머리말이 말하는 그 이유다). **지울 때 얻는 것**은
핀 없는 CDN 실행 코드 제거 + 첫 계산 경로에서 gzip 약 97KB 다.

## 5. 검증 명령

```
node scripts/build-korean-calendar-table.mjs
npm run verify:korean-calendar-table-fresh
npm run verify:korean-calendar-divergence
npm run verify:korean-calendar-solar-terms
npm run verify:korean-calendar-midnight-register
npm run verify:korean-calendar-kasi-samples          # 기본: 네트워크 0
npm run verify:korean-calendar-kasi-samples -- --live --endpoint https://staging.code-destiny.com/api/kasi/calendar
npm run verify:saju-solar-term-core
npm run verify:sukuyo-korean-calendar
npm run verify:lunar-conversion-core
npm run verify:shell-korean-calendar                 # 🔴 셸을 고쳤으면 이것부터
npm run verify:daeun-korean-calendar                 # 🔴 대운 관례 재현 잔차 0
npm run verify:myeongri-tables                       # 🔴 명리 표 216키 잔차 0 (--self-test 로 음성 테스트)
npm run verify:guard-wiring
npm run typecheck && npm run lint
NODE_OPTIONS=--experimental-vm-modules npx --no-install jest --runInBand
npm run test:node
```

🔴 `--live` 는 **사용자 허락을 받고** 돌린다. 289회 HTTP 요청이고, `source:"local"` 응답은 거부한다
(그걸 정답으로 받으면 가드가 자기가 고치려는 버그를 확인하는 회로가 된다).

기준선(2026-08-27 `58267ff8b`, 리베이스 후 실측): jest **176 스위트 / 1,977 테스트 통과** ·
`test:node` **551 통과 / 0 실패** · `verify:guard-wiring` 252개 중 156개 배선.

**PR-F2 (ㄹ) 이후 실측(2026-08-28, `f518bd2ea` 위)**: jest **176 스위트 / 2,002 테스트 통과** ·
`test:node` **551 통과 / 0 실패** · `verify:guard-wiring` **258개 중 162개 배선** ·
`verify:myeongri-tables` 검사 24건(216키 잔차 0) · `verify:daeun-korean-calendar` 검사 14건 ·
`verify:saju-solar-term-core` 51건 · `verify:lunar-conversion-core` 35건 ·
`verify:worker-size` raw 9.61 MiB / gzip 2.50 MiB(예산 25.0%) · typecheck · lint(에러 0).
이관 전/후 `calculateLifeBookAiSaju` 출력 1,032표본 **바이트 동일**.

**PR-F1 이후 실측(2026-08-27, `524e85c88` 위)**: jest **176 스위트 / 2,002 테스트 통과** ·
`test:node` **551 통과 / 0 실패** · `verify:guard-wiring` 257개 중 161개 배선 ·
`verify:daeun-korean-calendar` 검사 14건(관례 재현 **잔차 0** · KST 전환으로 4,409/8,810건 이동) ·
`verify:shell-korean-calendar` 25건 · `verify:worker-size` gzip 2.50 MiB(예산 25.0%) ·
`verify:public-mirror-fresh` OK · `verify:sitemap-drift` OK · typecheck · lint(에러 0).

**PR-E5 이후 실측(2026-08-27, `50f3c0146` 위)**: jest **176 스위트 / 2,002 테스트 통과** ·
`test:node` **551 통과 / 0 실패** · `verify:guard-wiring` 256개 중 160개 배선 ·
`verify:shell-korean-calendar` 검사 25건 · `verify:lunar-conversion-core` 35건 ·
`verify:saju-solar-term-core` 51건 · `verify:sukuyo-korean-calendar` 31건 ·
`verify:public-mirror-fresh` OK · `verify:sitemap-drift` OK · typecheck · lint(에러 0).

**PR-C 이후 실측(2026-08-27, `cc22b4520` 위)**: 위 세 숫자 **전부 그대로**. 추가로
`verify:ziwei-star-parity` 21건/29명 · `verify:korean-calendar-table-fresh` 29건 ·
`verify:ziwei-sohan` 35 · `verify:ziwei-worker-chart-facts` 114 ·
`verify:worker-size` raw 9.61 MiB / gzip 2.50 MiB (예산 10 MiB, 25.0%) ·
`verify:public-mirror-fresh` OK · `verify:payment-freeze` 통과 · typecheck · lint.
자미 3엔진에 필요한 명령:

```
npm run verify:ziwei-star-parity
npm run verify:ziwei-sohan
npm run verify:ziwei-worker-chart-facts
node scripts/verify-ziwei-brightness-constraints.cjs      # 미배선. 45건 중 19건 실패가 정상값이다
node scripts/verify-admin-saju-prompt-kasi-calendar.mjs
npm run sync:public && npm run verify:public-mirror-fresh # js/ 를 고쳤으면 반드시
```

🔴 `js/core/korean-calendar.js` 는 **생성물**이다. 손으로 고치면
`verify:korean-calendar-table-fresh` ① 이 바이트 비교로 잡는다 —
`node scripts/build-korean-calendar-table.mjs` 를 돌리고 결과를 같은 커밋에 담을 것.

## 6. 🔴 이 레포 고유의 작업 규칙

- **파일을 고치기 전에 `EnterWorktree`** — 기본 작업 디렉터리는 여러 세션이 동시에 쓴다. `origin/main` 에서 분기한다
- **`main` 직접 작업·머지 금지. 머지는 사용자가 한다.** 프로덕션 승격은 사용자가 그때 명시적으로 요청할 때만
- **새 `verify:*` 는 같은 PR 에 CI 배선** — `verify:guard-wiring` 이 티어 무관 항상 돈다. 달력·자미 가드는 `pr-ci.yml` **fast 잡**
  (`scripts/resolve-ci-tier.mjs` 는 `worker/routes/ziwei-ai.js` 만 critical 로 못 박으므로 critical 에 두면 정작 지켜야 할 경로에서 잠든다)
- 🔴 **`js/` 아래에 파일을 추가하면 `sync:public` 이 캐시키를 회전시켜 `index.html` 포함 22개 파일이 딸려온다.**
  정적 셸을 고쳤으면 `npm run sync:public` 산출물을 **같은 커밋에** 담는다(`verify:public-mirror-fresh`)
- 🔴 **`verify:public-mirror-fresh` 는 윈도우에서 `.ignore` 하나로 헛실패한다** — 내용이 아니라 CR 문자 차이뿐이다
  (실측: 작업본 7,783바이트 vs HEAD 7,579바이트, CR 제거 후 완전 동일). 리눅스 CI 는 통과한다
- **워크트리에 `node_modules` 가 없어도** `node scripts/…` 는 상위 탐색으로 돈다. jest 는 `NODE_OPTIONS=--experimental-vm-modules npx --no-install jest --runInBand`
- 🔴 **Bash 툴이 백슬래시를 한 겹 벗긴다.** `node -e` 안에서 개행 이스케이프를 쓰지 말고 `String.fromCharCode(10)` 을 쓸 것
- 🔴 **가드 음성 테스트의 복원은 메모리 버퍼로.** `git checkout` 을 쓰면 그 파일의 미커밋 작업이 통째로 날아간다

## 7. 🔴 근거를 못 찾으면 추측하지 말고 사용자에게 물어라

역법·자미두수 규칙은 유파와 나라에 따라 갈린다. 이 문서의 수치는 전부 2026-08-27 실측이고
재현 명령이 §5 에 있다. **문서의 숫자를 근거로 삼지 말고 직접 돌려서 확인할 것.**
판정이 안 서면 값을 박지 말고 물어라 — 이 작업의 시작점이 바로 그렇게 박힌 하루짜리 하드코딩이었다.
