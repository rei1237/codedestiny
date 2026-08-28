# 간지 경로의 로컬 Date 를 벽시계 부품으로 — 인수인계 (2026-08-28)

> 이 문서만 읽고 이어서 시작할 수 있어야 한다. **근거를 못 찾으면 추측하지 말고 사용자에게 물어라.**
> 사용자 승인 계획: "전량 3단계"(2026-08-28). 여기 있는 PR-B~E 가 그것이다.

## ✅ PR-C 완료 (2026-08-28) — **다음은 PR-D(§5)** 부터다

서비스가 부품 정본이 됐고 엔진에 부품 API 가 생겼다. §4 는 이제 "무엇을 만들었나"의 명세로
읽고, 착수점은 §5 다. **계약(`ganji-surface-kst.json` 무수정)은 지켜졌다** — 그 파일은 이 PR 의
변경 목록에 없다.

| 파일 | 무엇이 바뀌었나 |
|---|---|
| `js/core/kasi-calendar-service.js` | `_dateFromParts`·`_toIsoLocal`·`_wallClockMs` 삭제 → `_partsOf`·`_partsValid`·`_partsWallMs`·`_partsToIsoLocal`·`_partsFromLocalDate`. 계산 6벌·`_buildSolarParts`·`_buildDateContext`·`_normalizeTerms`·`_fetchLunarFromSolar`·`_fallbackLunarFromSolar` 전부 부품 입력. 공개 `computeGanjiFromParts` 신설 + `computeGanjiFromDate` 어댑터 |
| `js/saju-engine.js` | `KasiEngine.getGanjiFromParts`·`solarToLunarFromParts` 신설, `getGanji(dateOrParts)`·`solarToLunar(date)` 는 어댑터. 야자시 밀기 `setDate(+1)` → `_kasiShiftPartsByDays` |
| `scripts/verify-ganji-surface-parity.mjs` | 검사 ④ 신설(부품 진입점 == Date 진입점 · 부품 경로의 Date 독출 0). 검사 **37 → 42건**, 픽스처는 안 건드린다 |

### 🔴 PR-C 에서 새로 알게 된 것 — 계획을 고쳐야 하는 것들

1. 🔴 **셸에는 서비스 없이 엔진만 싣는 체인이 하나 더 있다** — `js/core/index-inline-runtime.js:8052`
   (`__cdEnsureSajuCoreLoaded` 계열, 생년월일 모달 경로)은 `korean-calendar` → `compat-llm-prompts` →
   `saju-engine` → `tarot` 만 싣고 **`kasi-calendar-service.js` 가 없다.**
   ⇒ 엔진이 서비스의 함수를 부를 수 있다고 전제하면 안 된다. 그래서 로컬 Date 독출기는 두 파일에
   각각 두되 **카운터 하나(`window.__CD_GANJI_LOCAL_DATE_READS__`)를 공유**한다. PR-E 의 "호출 0"
   가드는 그 전역 하나만 읽으면 된다.
2. **`_partsOf` 의 정규화가 `new Date(y, m-1, d, ...)` 와 같음을 실측했다**(2026-08-28,
   10,692 조합: 연 0/50/99/1899/1900/2100/275760/NaN/문자열 × 월 0~25 × 일 0~60 × 시 0~25).
   `TZ=UTC` **불일치 0건**. `TZ=Asia/Seoul` 은 **3건**인데 전부 `1950-04-01 00:30`(한국 서머타임
   시작) — 즉 차이의 정체가 정규화가 아니라 **이 작업이 없애려는 그 접힘**이다.
3. **`_shiftPartsByDays` 는 서비스에 안 넣었다** — 서비스에 호출부가 없어 데드코드가 된다.
   날짜 밀기는 엔진에만 필요하고, 거기서는 이미 있던 `_shiftDatePartsByDays`(:1250, `Date.UTC` 기반)
   위에 `_kasiShiftPartsByDays` 를 얹었다.
4. **§6-3(`_toIsoLocal` 삭제)은 여기서 이미 끝났다.** 부품 전환으로 호출부가 0 이 됐다.
   `_wallClockMs`·`_dateFromParts` 도 같은 이유로 지웠다. PR-E 는 그 항목을 빼고 시작하라.
5. **`__test.computeMonthGanjiFromTerms` 는 Date 어댑터로 남겼다** —
   `scripts/test-saju-solar-term-regression.mjs:146,154,155,159,160` 이 Date 를 넘긴다(npm 미배선
   스크립트지만 살아 있다). 부품으로 옮기는 것은 그 스크립트와 **같은 커밋**에서.
6. **캐시 복구 갈래가 조금 엄격해졌다**(`_buildDateContext` 의 `cached.ganji.hour` 없음 경로).
   예전에는 `cached.solar` 가 깨져 있으면 Invalid Date 가 그대로 흘러 일주가 `甲子` 로 나왔다.
   지금은 `_partsOf` 가 `null` 을 내고 캐시된 간지를 그대로 둔다. 정상 캐시에서는 도달 불가라
   픽스처·가드 어디에도 안 나타난다.

### PR-C 음성 테스트 4종 전건 확인 (전부 fail-closed → 복구 후 초록)

부품 경로에서 로컬 Date 를 읽게 만들기 / **공개 `computeGanjiFromParts` 만 terms 를 버리기** /
`solarToLunarFromParts` 제거 / 서비스의 Date 어댑터를 정본과 갈라놓기.
🔴 두 번째가 검사 ④ 의 존재 이유다 — 픽스처는 Date 표면만 찍으므로 **공개 부품 API 만 깨지면
①③ 이 전부 초록**이다. PR-D 가 호출부 22곳을 그 API 로 옮기므로 지금 고정해 둔다.

---

## ✅ PR-B 완료 (2026-08-28)

저울이 섰다. 아래 §3 은 "무엇을 만들었나"의 명세다.

| 만든 것 | 무엇 |
|---|---|
| `scripts/lib/shell-ganji-harness.cjs` | 반쪽 하네스 두 벌을 합쳤다. 브라우저와 같은 로드 체인 6벌, `lunar-javascript` 전역 삭제, `fetch` 는 **던지는 스텁** |
| `scripts/lib/kst-clock.mjs` | `pinTimezone(tz)` + 자기검사 2단(오프셋 숫자 · `Intl` 해석 존). 🔴 Node 는 모르는 존 이름을 **조용히 UTC 로** 떨어뜨린다 |
| `scripts/lib/ziwei-engine-harness.cjs` | 얇은 어댑터로. `PRELUDE_SCRIPTS` 가 위 체인에서 나온다 |
| `scripts/verify-ganji-surface-parity.mjs` | 표본 1516 × 표면 12벌 × TZ 6종. 검사 37건(PR-C 가 ④ 를 더해 **42건**) · **실측 5.6초**(fast 잡 예산 안) |
| `scripts/fixtures/ganji-surface-kst.json` | before-image(249KB). `rows` 와 `nullMap` 이 **따로** |
| `scripts/fixtures/ganji-dst-gap-census.json` | 구멍의 현행 크기 |
| `scripts/fixtures/README-ganji-surface.md` | "정답이 아니라 현행" · `--emit` 을 언제 돌리는가 |

### 🔴 첫 관문 결과 — 하네스에 서비스를 넣어도 기존 가드가 **한 건도 안 움직였다**

`verify:ziwei-star-parity`(21) · `ziwei-sohan`(35) · `ziwei-worker-chart-facts`(114) ·
`ziwei-chart-detail-view`(46) · `shell-korean-calendar` · `daeun-korean-calendar`(16) 전부 그대로.
`verify-ziwei-brightness-constraints.cjs` 의 **45건 중 19건 실패도 숫자 그대로**(문서화된 기존값).
⇒ §1-(1) 이 실측으로 재확인됐다 — `getGanji` 가 1990 말고 전부 `null` 이라 서비스를 실어도 값이 안 생긴다.

### 🔴 새로 알게 된 것 — **정본 축(`Asia/Seoul`)에도 구멍이 12건 있다**

```
Asia/Seoul 12 · UTC 0 · America/New_York 21 · Pacific/Apia 18
Pacific/Kiritimati 6 · Australia/Lord_Howe 18          (표본 1516 기준)
```

한국은 1948~51 · 1955~60 · **1987~88** 에 서머타임을 썼다. 즉 이 결함은 "해외 사용자만"이 아니라
**그 창에 태어난 한국 사용자에게 지금 라이브로 일어나고 있다.** PR-D 의 명분이 여기 있다.

🔴 구멍 표본은 손으로 안 적는다 — `Intl` 로 6개 존의 **시계 앞당김 전이**를 찾아 그 안의 분을 쓴다.
처음엔 절기·음력에서만 표본을 유도했더니 뉴욕 3건 말고 **전부 0** 이었다(존이 매트릭스에 있어도
그 구멍을 안 밟으면 아무것도 안 잰다). 가드의 `② 서머타임 존이 전부 최소 1건` 이 그것을 막는다.

### 음성 테스트 6종 전건 확인 (전부 fail-closed → 복구 후 초록)

체인에서 서비스 제거 · TZ 핀 무력화 후 `TZ=UTC` · 매트릭스에서 `Pacific/Apia` 제거 ·
픽스처 한 줄 손편집 · census 를 0 으로 · **`isNull` 지도만 뒤집기(값은 그대로)**.
🔴 마지막 것이 이 가드의 핵심이다 — 값 대조만 있으면 그 변조가 통과한다.

### 덤으로 닫은 것 — §1-(3) 의 동어반복

`verify:shell-korean-calendar` ⑫ 의 baseline 을 머신 로컬이 아니라 **`TZ=Asia/Seoul` 자식**에서 뽑고
매트릭스를 6종으로 넓혔다(검사 40 → **51건**). CI 에서 UTC↔UTC 를 재던 자리가 없어졌다.

### 🔴 PR-C 착수 전 주의

- 🔴 `ganji-surface-kst.json` 을 **고치면 리뷰 거절 사유다**(§4 계약). `--emit` 은 회귀를 지우는 버튼이다.
- 실행: `npm run verify:ganji-surface-parity` (CI 배선 완료 — fast 잡).
- 표면 12벌의 이름·순서는 픽스처의 `surfaces` 가 갖고 가드가 대조한다. 늘리면 `--emit` 이 필요하다.

## 0. 무엇을 고치는가

브라우저에서 사주 간지를 계산할 때 **KST 벽시계 부품으로 로컬 `Date` 를 조립**한다.
그 벽시계가 그 타임존에 **존재하지 않으면**(서머타임 시계 앞당김 구간) JS 가 조용히 다른 시각으로 접고,
되읽은 부품이 입력과 달라져 시주·일주·월주가 틀어진다.

🔴 **존재하지 않는 벽시계를 담을 수 있는 로컬 `Date` 는 없다.** 그래서 "조립 후 보정"은 불가능하고,
간지 경로에서 **로컬 `Date` 를 캐리어로 쓰는 것 자체를 그만두는 것**이 유일한 정답이다.

### 이 레포에 이미 있는 정답 패턴 (새 규약을 만드는 게 아니다)

| 어디 | 무엇 |
|---|---|
| `app/saju/animal-destiny/engine/localSajuCalculator.ts` | 전 구간 **숫자 부품**. `Date` 는 `Date.UTC` 산술 도구로만(`shiftDatePartsByDays:390` · `shiftWallTimeByMinutes:451` · 일주 시리얼 `:798`). 로컬 조립 **0건** |
| `app/_lib/ziwei-engine.ts` | `Date` 를 **전혀 안 쓴다**. `calcZiweiPalaces(year, month, day, hour, minute, gender)` |
| `worker/**` | 다인자 `new Date(...)` **17곳 전부** `Date.UTC` 로 감싸여 있다 |
| `js/saju-engine.js:1313` `_shiftDatePartsByDays` · `:1252` | 이미 `Date.UTC` 기반 · TZ 무관 |
| `js/core/kasi-calendar-service.js` `_wallClockMs` · `_termWallClockMs` | 벽시계 축 ms(#1217 이 추가) |

⇒ **브라우저를 워커·앱이 이미 지키는 규약에 맞추는 것**이다. 새 유틸을 만들지 말고 위를 쓴다.

---

## 1. 🔴 착수 전에 반드시 알아야 할 실측 4가지

전부 2026-08-28 에 코드를 돌려 확인했다. 이게 없으면 계획이 틀린다.

### (1) 🔴 `KasiEngine.getGanji` 는 지금 **1990년 말고 전부 `null`** 이다

`js/saju-engine.js:950` 이 `computeGanjiFromDate(tDate)` 를 **terms 없이** 부른다 →
`_readValidatedSolarTerms(year)` → `_VALIDATED_SOLAR_TERMS_BY_YEAR` 에는 `'1990'` 한 해뿐 →
`_countMonthBoundaryTerms < 12` → `null`.

```
1985 null · 1990 {庚午 壬午 辛亥 甲午} · 1997 null · 2024 null
```

- ✅ 그래서 호출부 13곳의 Date→parts 전환은 **KST 에서 정의상 무손실**이다(null 이 계속 null).
- 🔴 그러나 실수로 **getGanji 가 답하기 시작하면** 13곳이 한꺼번에 절기 프레임 세차로 갈아탄다.
  `js/saju-engine.js:2936` 주석이 기록한 사고(셸 己巳 vs 워커/앱 庚午)가 그 모양이다.
- ⇒ **가드 1순위는 값이 아니라 "null 지도가 한 칸도 안 바뀐다"** 다.
  값 대조만으로는 `null == null` 로 통과한다. 픽스처에 **`isNull` 을 별도 필드**로 찍어라.

### (2) 🔴 `getGanji`/`computeGanjiFromDate` 를 **실행해 값을 단언하는 하네스가 하나도 없다**

셸 평가 부트스트랩이 두 벌로 갈려 있고 둘 다 반쪽이다.

| 하네스 | 싣는 것 | 빠진 것 |
|---|---|---|
| `scripts/lib/ziwei-engine-harness.cjs` | `korean-calendar.js` + `saju-engine.js` | **`KasiCalendarService` 없음** |
| `scripts/verify-shell-korean-calendar.mjs` `evalKasiService()` | 서비스만 | **`saju-engine` 없음** |

`js/saju-engine.js:2938` 주석이 그 사실을 적는다 — *"하네스에는 KasiCalendarService 가 없어 그 호출이
항상 null 이라 verify:ziwei-star-parity 가 이 경로를 보지 못했고, 브라우저에서만 셸이 워커·앱과 갈렸다."*

### (3) 🔴 CI 는 UTC, 개발 머신은 KST, 레포에 TZ 핀이 **0건**이었다

`verify:shell-korean-calendar` 검사 ⑫ 의 `TZ=UTC` 대조는 **CI 에서 UTC↔UTC 동어반복**이고,
정본인 `Asia/Seoul` 축은 CI 에서 한 번도 안 돈다.
🟢 **선례가 생겼다** — `scripts/verify-solar-term-frame-kasi.mjs`(PR #1225)가 `process.env.TZ="UTC"` 를
박고 `getTimezoneOffset()` 으로 자기검사한다. Node 에서 재할당이 즉시 먹는 것은 실측 확인했다.

### (4) 🔴 접힘은 시각만이 아니라 **날짜·해**도 민다

```
Pacific/Apia         2011-12-30 12:00 → 12-31        하루가 통째로 없는 날 — 일주가 밀린다
Pacific/Kiritimati   1994-12-31 12:00 → 1995-01-01   해가 넘어간다 — 세차까지
America/New_York     1974-01-06 02:19 → 03:19        시주
Australia/Lord_Howe  2024-10-06 02:15 → 02:45        30분 DST — "±1시간" 가정을 깬다
```

---

## 2. 전환 대상 — 조립 22곳 (파일 7개)

간지·절기·음력 경로에서 KST 부품으로 로컬 `Date` 를 만드는 지점 전수. `git grep` 축(미러 제외).

| 파일 | 줄 |
|---|---|
| ~~`js/core/kasi-calendar-service.js`~~ | ✅ **PR-C 에서 끝났다** — `_dateFromParts` 정의 + 호출 4곳(`_normalizeTerms` · `_buildSolarDate` 양력/음력 · 캐시 복구) |
| `js/saju-engine.js` | repair(`:1205`) · fallback 2(`:1385`,`:1390`) · 모달 원국(`:2849`) · 자미 baseDate(`:2916`) · 히어로(`:5348`) · 유년(`:24229`) · 월지(`:26011`) · 궁합(`:27727`) · 세운(`:28893`) · 대운연운(`:29018`) · 유명인(`:29715`) |
| `js/core/index-inline-runtime.js` | `:4162` |
| `js/core/saju/modalProfileState.js` | `:107` |
| `js/inline/saju-core-bootstrap.js` | `:730` |
| `js/luck-sync-diary.js` | `_makeLocalNoonDate`(`:265`, 호출 3곳 `:278/:2717/:3953`) · `_readGanzhiFromEngineDate`(`:366`, 호출 2곳) · `:464` |
| `js/saju-engine-tarot-sukuyo-quantum.js` | `:10233` · `:11626` · `:13261` · `:15848`+`:15881` |

**야자시 로컬 산술**(같이 고친다): `js/saju-engine.js:947`(`getGanji`) · `:908`(`solarToLunar`, options 를
안 받아 야자시가 항상 켜짐) · `tarot:15881`.

**표시·유효성 계열**(PR-E): `app/_lib/normalize-ziwei-input.ts:43` ·
`app/fortune/prompt-hub/{dangsaju-calc.ts:344, kusei-calc.ts:306, lite-prompt-tools.ts:126}` ·
`js/luck-sync-diary.js:272`. 왕복 유효성 검사가 **DST 접힘 탐지기 그 자체**라 그 구멍에서
**유효한 생일을 거부**한다.

---

## 3. PR-B — 검증 하네스·계측 (동작 변화 0) ← 여기서 시작한다

소스는 한 줄도 안 고친다. `scripts/`·`package.json`·`pr-ci.yml` 만.

1. **`scripts/lib/shell-ganji-harness.cjs`** 신설 — 위 두 반쪽 하네스를 합친다. 로드 순서는
   브라우저와 같게(`js/core/index-inline-runtime.js:2186-2196` 의 chain) 하되 **목록은 고정 리터럴**
   (탐지 대상에서 유도하면 동어반복). `lunar-javascript` 전역은 지운 채 평가.
   `kasi-calendar-service.js` 는 로드시 부작용이 없다(fetch·타이머·localStorage 순회가 전부 함수 안).
   `ziwei-engine-harness.cjs` 의 `PRELUDE_SCRIPTS` 는 이것에 위임(DOM 스텁 두 벌 방지).
2. **`scripts/lib/kst-clock.mjs`** 신설 — `pinTimezone(tz="Asia/Seoul")` + 오프셋 자기검사.
   정본은 `scripts/verify-solar-term-frame-kasi.mjs` 의 ⓪ 검사.
3. **`scripts/verify-ganji-surface-parity.mjs`** 신설 — 회귀 증명의 본체.
   - 표본(손으로 안 적는다): 節 경계 ±1분·±540분 / 야자시 23:00·23:29·23:30·23:59 /
     1월 1일~소한 / 설날 ±1일 / 윤달 전수 / DST 구멍(TZ 매트릭스에서 유도)
   - 표면: `getGanji(d)` · `(d,{yaja:false})` · `solarToLunar(d)` · `computeGanjiFromDate(d,terms)` 두 갈래 ·
     `buildGanjiRepairCandidate` · `_cdCivilDayPillar` · `_cdHourPillarFromDayStem` · `getGanZhiForDate` ·
     `getMonthGanZhi` · `_calculateMonthBranchBySolarTerm` · `calcZiweiPalaces(...).calcMeta`
   - 🔴 **`isNull` 을 값과 별도 필드로** 찍는다(§1-(1))
   - 모드: `--emit`(픽스처 갱신 전용) / 기본(전건 대조) / `--tz-matrix`(TZ 만 바꿔 자식으로)
   - TZ 매트릭스 6종 고정 리터럴: `Asia/Seoul`(정본·재현성) · `UTC`(CI) · `America/New_York` ·
     `Pacific/Apia` · `Pacific/Kiritimati` · `Australia/Lord_Howe`
4. **픽스처 2개**: `scripts/fixtures/ganji-surface-kst.json`(before-image) ·
   `ganji-dst-gap-census.json`(구멍 크기 고정). 픽스처 옆 README 에
   *"정답이 아니라 **현행**이다. getGanji 가 1990 말고 null 인 것은 알려진 결함이며 별건"* 을 명시.
5. `verify-shell-korean-calendar.mjs` ⑫ 의 baseline 을 머신 로컬이 아니라 **`TZ=Asia/Seoul` 자식**에서
   뽑고 매트릭스를 6종으로(§1-(3) 의 동어반복을 닫는다).

### PR-B 의 판정
```
✅ TZ=Asia/Seoul 산출물 == ganji-surface-kst.json (전건)
✅ 각 TZ 의 DST-GAP 건수 == ganji-dst-gap-census.json 의 고정 숫자
✅ DST-GAP 을 뺀 나머지에서 모든 TZ == KST
❌ 아직 요구하지 않음: DST-GAP 총계 == 0        ← PR-D 의 졸업 조건
```

### 🔴 PR-B 의 첫 관문
하네스에 서비스를 넣으면 `verify:ziwei-star-parity` 값이 움직일 수 있다(§1-(1) 때문에 1990 표본 한정).
**첫 커밋을 "하네스만 바꾸고 기존 가드 전부 초록"으로 만들어 이 사실을 실측으로 확정한다.**
초록이 아니면 **그 자리에서 멈추고 사용자에게 보고**한다.

### PR-B 음성 테스트
하네스 로드 체인에서 `kasi-calendar-service.js` 제거 → 🔴 **탐지자는 1990 표본**
(`computeGanjiFromDate(new Date(1990,5,15,12,0))` 가 non-null 이어야 한다. 다른 해로 프로브를 만들면
null==null 로 통과한다) / `pinTimezone()` 제거 후 `TZ=UTC` / 매트릭스에서 `Pacific/Apia` 제거
(목록 길이 + "각 TZ 가 최소 1건의 DST-GAP") / 픽스처 한 줄 손편집 / census 를 0 으로.

---

## 4. ✅ PR-C — 서비스 parts 정본 + 엔진 parts API (완료)

**계약: `ganji-surface-kst.json` 이 한 바이트도 안 바뀐다. 이 PR 에서 그 파일을 고치면 리뷰 거절 사유다.**
→ 지켜졌다. 아래는 착수 전에 적어 둔 명세이고, 실제로 어떻게 됐는지는 문서 맨 위 PR-C 절에 있다.

- `_dateFromParts` 삭제 → `_partsOf` / `_partsValid` / `_partsWallMs` / `_shiftPartsByDays` / `_partsToIsoLocal`
- 계산 6벌을 부품 입력으로: `_dayGanjiFromDate` · `_yearGanjiFromIpchun` · `_hourGanjiFromDay` ·
  `_fallbackGanji` · `_computeGanjiFromDate` · `_computeMonthGanjiFromTerms`
- 🔴 입력 가드를 **정확히 같은 강도**로 옮긴다. 느슨해지면 §1-(1) 의 전면 회귀다.
- 🔴 `_partsOf` 는 지금 `new Date(y,m-1,d,...)` 가 하던 **정규화(초과 일수를 다음 달로)를 그대로** 한다.
  2월 30일 거부 같은 엄격화는 PR-E 에서 별도 실측과 함께.
- **출력 스키마 불변** ⇒ `kasi:date-context:v2:` 캐시 마이그레이션 불필요. `context.version` 도 `1` 유지.
  🔴 회전이 필요해지면 그것은 "값이 바뀌었다"는 뜻이므로 **멈추고 보고**한다.
- 공개 표면: `computeGanjiFromParts(parts, terms)` 신설(정본) + `computeGanjiFromDate` 를 얇은 어댑터로 유지.
  `_partsFromLocalDate` 가 **레포에 남는 유일한 로컬 Date 독출 지점**이 되고 호출 건수를 계측해
  PR-E 의 삭제 근거로 삼는다.
- `KasiEngine`: `getGanjiFromParts(parts, options)` 신설 + `getGanji(dateOrParts, options)` 어댑터.
  야자시 밀기를 `setDate(+1)` → `_shiftPartsByDays`. 🔴 **조건식을 "정리"하지 말 것** —
  `(h===23&&min>=30&&yaja)||(h===23&&yaja)` 는 같은 값이지만 그 단순화는 무손실 계약 밖이다.

### 🔴 왜 리네임이 아니라 새 메서드 + 어댑터인가
1. 13개 호출부가 전부 `typeof ke.getGanji === 'function'` 가드 안이라 하드 리네임은 예외가 아니라
   **조용한 성능저하**로 끝난다.
2. `public/_headers:310` 이 `/js/*.js` 를 max-age 7일·SWR 30일로 잡아 **옛 셸과 새 셸이 최대 7일 공존**한다.
   앞뒤 양방향 호환이 필요하다.
3. 어댑터 호출 건수를 계측할 수 있어 PR-E 의 삭제가 주장이 아니라 측정이 된다.

### 🔴 `solarToLunar` 는 인자 1개로 고정한다
두 호출부가 2번째 인자로 `true` 를 넘기는데(`tarot:11626`, `:13261`) **오늘은 무시된다.**
여기에 `options` 를 붙이면 `true` 가 갑자기 의미를 갖고 `options.yaja` 가 `undefined` 로 읽혀 야자시가
꺼진다 → 23시대 음력일이 하루 당겨지고 **자미 14주성이 통째로 이동**한다.
옵션은 새 이름 `solarToLunarFromParts(parts, options)` 에만 붙인다.

---

## 5. PR-D — 조립 22곳 전환 · DST 구멍 0

§2 의 표대로 전부 "부품을 만들어 부품 API 에 넘긴다". 중간에 `Date` 를 만들지 않는다.

### 🔴 가장 위험한 것 — 월 인덱스 off-by-one 4건
`new Date(y, 5, 15)` → `{month: 5}` (정답은 **6**). 대상:
`saju-engine.js:24229`(`,1,4,` → 월 2) · `:28893` · `:29018` · `tarot:13261`(`monthIndex` → `+1`).
`Date` 의 월은 0-based, 부품은 1-based다. 기계적으로 옮기면 **월건이 통째로 한 칸 밀린다.**
리뷰에서 개별로 짚고, KST 픽스처가 바로 잡는다.

또 하나: `js/luck-sync-diary.js:265` `_makeLocalNoonDate` 는 **`monthIndex`(0-based)를 받는다.**
`_makeNoonParts(year, month, day)` 로 바꾸면 **인자 규약이 바뀌므로** 호출 3곳을 함께 고쳐야 한다.

### 졸업 조건
```
✅ TZ=Asia/Seoul 산출물 == ganji-surface-kst.json (전건, 무수정)
✅ 🔴 DST-GAP 총계 == 0            ← PR-B 에서는 못 켰던 조건
✅ 6개 TZ 전부 == KST (예외 0건)
✅ getGanji 의 isNull 지도가 픽스처와 동일
```
`ganji-dst-gap-census.json` 을 0 으로 바꾸는 것이 **이 PR 의 의도된 유일한 픽스처 변경**이다.

### 신설 검사 ⑬ (`verify:shell-korean-calendar`)
간지 경로 파일에 `Date.UTC` 로 감싸이지 않은 다인자 `new Date(` 0건.
대상 파일 목록·허용 목록 **둘 다 고정 리터럴**. 🔴 **도달 검사**: 허용 목록의 각 원소가 실제로 그 파일에서
매치돼야 한다(스캐너 사망 탐지 — `verify:lunar-conversion-core` 방식).

### `public/` · 캐시키
`js/**` 를 건드리므로 캐시키가 회전한다 — `index.html` `?v=` 87곳 + 미러 = **#1217 과 같은 25파일** 규모.
`npm run sync:public` **만** 돌리고 `public/` 을 손으로 고치지 않는다.
✅ `verify:payment-choice-parity` 의 핀 25곳 회전은 **필요 없다**(`PIN_GROUPS` 는 `js/destiny-profile.js` 와
`js/core/{checkout-entry,pass-verdict}.js` 뿐). 🔴 혹시라도 `js/destiny-profile.js` 에 손이 가면 **즉시 멈추고**
비용(방문자 전원 gzip 171KB 재다운로드)부터 보고한다.

---

## 6. PR-E — Date 진입점 제거 · 유효성 · 🔴 야자시 결정

1. `computeGanjiFromDate` · `_partsFromLocalDate` · `getGanji(Date)` 어댑터 삭제 —
   **PR-C 가 심은 계측이 호출 0 임을 가드로 증명한 뒤에만.**
   🔴 계측의 실체는 전역 `window.__CD_GANJI_LOCAL_DATE_READS__.count` 하나다(두 파일이 공유).
   `verify:ganji-surface-parity` 의 검사 ④ 가 이미 "부품 경로에서 그 수가 안 오른다"를 단언하므로,
   PR-E 는 "전 표면을 부품으로 한 바퀴 돌린 뒤 그 수가 **0**" 을 더하면 된다.
   🔴 `verify:shell-korean-calendar` ③⑥-b·⑪ 이 전역 이름으로 Date 를 넘기므로 **같은 커밋**에서 부품으로.
2. 유효성 5곳(§2 마지막 줄)을 `Date.UTC` 왕복으로. 2월 30일은 여전히 거르고 DST 구멍은 안 거른다.
3. ~~`_toIsoLocal` 삭제, `isoLocal` 을 정수에서 직접 조립.~~ ✅ **PR-C 에서 끝났다**
   (`_partsToIsoLocal`). 출력 문자열은 한 글자도 안 바뀌었다.
4. 🔴 **야자시 의미 결정 — 이 계획 전체에서 값이 바뀌는 유일한 자리.**
   - `tarot:13261` 은 정오 고정이라 야자시가 절대 안 걸린다 → `true` 를 지운다. **값 변화 0**(가드로 증명).
   - `tarot:11626` 은 입력 시각이 23시일 수 있다 → **유일한 실제 결정 지점.**
     *"1950~2030 23시대 표본 N건 중 M건에서 본명숙이 옆 칸으로 이동"* 실측 표를 PR 본문에 붙이고
     **사용자 결정을 받는다.** 결정 전에는 `true` 를 남긴 채(=현행) 둔다.
   - `kasi-calendar-service.js` `_fallbackLunarFromSolar` 도 같은 결정에 걸린다(KASI 가 죽는 동안에만 돈다).
5. 신설 검사 ⑭: `KasiCalendarService`·`KasiEngine` 공개 표면에 **Date 를 받는 함수 0개**임을
   실행으로 확인(`fn.length` 가 아니라 `new Date(...)` 를 넘겼을 때 null 을 내는지로).

---

## 7. 🔴 위험 목록

| # | 위험 | 왜 조용한가 | 잡는 방법 |
|---|---|---|---|
| R1 | **`getGanji` 가 답하기 시작한다** — 13곳이 한꺼번에 갈아탄다 | null→값 은 어떤 값 대조도 못 잡는다 | 픽스처의 `isNull` 별도 필드 전건 대조 |
| R2 | **월 인덱스 off-by-one** 4건 | 세운·유년 표시라 눈에 안 띈다. 월건 한 칸 = 십신 전부 이동 | KST 픽스처가 바로 잡는다 + 리뷰 체크리스트 |
| R3 | **`solarToLunar` 에 옵션을 붙이면 `true` 둘이 의미를 갖는다** | 야자시 OFF → 자미 14주성 이동 | 인자 1개 고정. 옵션은 새 이름에만 |
| R4 | **`_normalizeTerms` 의 `atLocal` 이 지금 Date 왕복으로 접히고 있다** | KASI 응답 + DST 구멍이 겹칠 때만. `get24DivisionsInfo` 는 403 이라 **가드에서 재현이 안 된다** | 픽스처에 **API 응답 모킹 갈래** — `__test.normalizeTerms` 에 KASI 형태 행을 먹여 `atLocal` 대조 |
| R5 | **가드가 `buildGanjiRepairCandidate`·`_cdCivilDayPillar` 를 전역 이름으로 꺼내 쓴다** | 가드는 초록인데 재는 대상이 바뀐다(`extractFunctionSource` 는 이름으로 자른다) | PR-D 에서 옛 이름 어댑터 유지, PR-E 에서 가드와 소스를 같은 커밋에 |
| R6 | **localStorage 캐시 TTL 180일이 옛 값을 되살린다** | 캐시 보유자는 옛 값을 계속 본다 | 출력 스키마 불변이므로 **값이 같아야 정상**. 회전이 필요하면 멈추고 보고 |
| R7 | **캐시키 회전으로 옛 셸 + 새 셸이 최대 7일 공존** | 규약이 갈리면 그 창에서 조용히 null | PR-C 의 어댑터 필수(앞뒤 양방향). `sync:public` 을 같은 커밋에 |
| R8 | **CI 는 UTC, 개발은 KST** | 둘 다 초록인데 서로 다른 것을 잰다 | `pinTimezone()` + 6종 매트릭스 + 오프셋 자기검사 |
| R9 | **`_partsOf` 를 지금보다 엄격하게 만들면** 접혀서 계산되던 입력이 null 이 된다 | "고침"이지만 무손실 계약 위반 | PR-C 는 현행과 같은 정규화. 엄격화는 PR-E |
| R10 | **`js/destiny-profile.js` 에 손이 닿으면** 핀 25곳 + `payment-freeze` 회전 필요, `verify:payment-choice-parity` 는 **CI 에서만** 터진다 | 로컬 전부 초록인데 CI 만 빨갛다 | 전 PR 이 그 파일을 안 건드리는 것이 계약 |
| R11 | **`verify:ganji-surface-parity` 가 fast 잡 예산을 넘긴다** | 가드가 있는데 안 돈다 | 표본 수를 재고 예산 안에. 쪼개도 **둘 다 fast 잡**에 |
| R12 | **픽스처가 "지금 값"이라 결함(R1 의 null 지도)을 정본으로 고정한다** | 회귀 가드가 결함을 지킨다 | **의도적이다** — "회귀 없음이 최우선"이 사용자 요구. README 에 "정답이 아니라 현행"을 명시하고 별건으로 넘긴다 |

---

## 8. 같이 봐야 할 것

- [docs/handoff/korean-calendar-migration-2026-08-27.md](korean-calendar-migration-2026-08-27.md) — 마이그레이션 본체. 이 축의 출처는 §PR-D2 의 "신규 발견"
- [docs/handoff/solar-term-frame-kasi-verification.md](solar-term-frame-kasi-verification.md) — 같은 계획의 다른 축(절기 프레임 KASI 대조, PR #1225 로 tier-1 완료)
- `scripts/verify-solar-term-frame-kasi.mjs` — **TZ 핀 · 소스 전수 발견 · 동결 지문 · pending 마커**의 정본 구현. PR-B 의 하네스·픽스처가 그대로 따라 하면 된다
- CLAUDE.md 원칙 8(부정 단언 금지) · 10(가드는 fail-closed) · 12(인수인계)
