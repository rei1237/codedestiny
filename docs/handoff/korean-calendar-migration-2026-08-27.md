# 한국 음양력 코어 마이그레이션 인수인계 — 2026-08-27

> 이 문서만 읽고 이어서 시작할 수 있어야 한다. **근거를 못 찾으면 추측하지 말고 사용자에게 물어라.**
> 🟢 코어(PR-B)와 자미두수 3엔진(PR-C)은 끝났다. 남은 것은 **사주 간지(PR-D) · 나머지 소비자(PR-E) · lunar-javascript 제거(PR-F)** 다.

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
| **PR-C** | 자미두수 3엔진을 코어로 + 하드코딩 시드 3곳 제거 | `feat/ziwei-korean-calendar` (base `cc22b4520`) |

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

### 🔴 PR-D — 사주 간지(절기) 전환 — **여기서부터 남았다**

애드혹 CST 보정 **5곳**을 코어로 대체한다:
`worker/routes/kasi.js:176`(+1h) · `js/saju-engine.js:9544`(+1h) · `js/core/kasi-calendar-service.js:840-863`(+1h) ·
`app/saju/animal-destiny/engine/localSajuCalculator.ts:412,609`(`SOLAR_TERM_BASE_OFFSET_MINUTES=480`) ·
`app/fortune/prompt-hub/kusei-calc.ts:110,369`(480).

🔴 `SOLAR_TERM_BASE_OFFSET_MINUTES = 480` 은 **상수를 540 으로 바꾸는 게 아니라 삭제**한다. 표가 이미 KST 다.

🔴 `verify:hour-pillar-parity` 6케이스는 **안 바뀌어야 정상**이다(시주는 절기와 무관). 바뀌면 그 자체가 신호다.

### PR-E — 나머지 소비자

숙요·베다/낙샤트라·구성기학·당사주·휴먼디자인·오늘의운세 등. `lunar-javascript` import 는 **35개 파일**이다.
숙요·낙샤트라는 음력일이 직접 입력이라 4.08% 밴드가 그대로 결과 이동으로 나타난다.

### PR-F — lunar-javascript 제거

워커 번들 **gzip 111KB** 절감. 남는 용도는 대운 `getYun()`/`getDaYun()` **6곳**뿐이다:
`worker/lib/destiny-bias-engine.js:801` · `worker/lib/life-book-ai-saju.js:533,574` ·
`js/saju-engine.js:2861,29037,29601` · `js/saju-engine-tarot-sukuyo-quantum.js:6044,16883`.

포팅 자체는 가능하다(순역은 양남음녀, 기운 나이는 절까지의 거리, 3일=1년 환산). **위험은 절사 관례**다 —
알고리즘 포팅이 아니라 **관례 재현**으로 접근하고, `divergence` 와 같은 구조의 잔차-0 가드를 세운 뒤에 지운다.

🔴 `js/saju-engine.js:20-21` 의 CDN 폴백은 `lunar-javascript@latest` 다 — **핀 없는 서드파티 실행 코드**다.
제거 PR 이 이 구멍도 함께 닫는다.

## 5. 검증 명령

```
node scripts/build-korean-calendar-table.mjs
npm run verify:korean-calendar-table-fresh
npm run verify:korean-calendar-divergence
npm run verify:korean-calendar-solar-terms
npm run verify:korean-calendar-midnight-register
npm run verify:korean-calendar-kasi-samples          # 기본: 네트워크 0
npm run verify:korean-calendar-kasi-samples -- --live --endpoint https://staging.code-destiny.com/api/kasi/calendar
npm run verify:guard-wiring
npm run typecheck && npm run lint
NODE_OPTIONS=--experimental-vm-modules npx --no-install jest --runInBand
npm run test:node
```

🔴 `--live` 는 **사용자 허락을 받고** 돌린다. 289회 HTTP 요청이고, `source:"local"` 응답은 거부한다
(그걸 정답으로 받으면 가드가 자기가 고치려는 버그를 확인하는 회로가 된다).

기준선(2026-08-27 `58267ff8b`, 리베이스 후 실측): jest **176 스위트 / 1,977 테스트 통과** ·
`test:node` **551 통과 / 0 실패** · `verify:guard-wiring` 252개 중 156개 배선.

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
