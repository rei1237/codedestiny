# 간지 경로의 로컬 Date 를 벽시계 부품으로 — 인수인계 (2026-08-28)

> 이 문서만 읽고 이어서 시작할 수 있어야 한다. **근거를 못 찾으면 추측하지 말고 사용자에게 물어라.**
> 사용자 승인 계획: "전량 3단계"(2026-08-28). 여기 있는 PR-B~E 가 그것이다.

## ✅ 이 계획은 끝났다 (2026-08-28) — PR-E 머지(#1238) + 야자시 결정 + PR-F(가드 사각지대)

- 🔴 **§6-4 야자시 결정은 뒤집혔다 (2026-08-28, PR-3).** `음력일 축 = OFF` 로 통일했다.
  당시 "현행 유지(ON)" 로 정했던 근거가 **틀린 전제** 위에 있었다 — 아래 "PR-3" 절.
- ✅ **PR-F — 값 축의 사각지대를 닫았다.** PR-E 의 "새로 알게 된 것 3번"이 실제로는 5벌 더 있었다.
  아래 "PR-F" 절.
- ✅ **PR-4 — 사본 동일성 가드(검사 ⑮).** `_partsOf ↔ _kasiPartsOf` 가 지문 단독 그룹인지와
  UTC 부품 조립 함수 6건 전수를 본다. 아래 "PR-4" 절.
- ✅ **PR-5 — null 전환 영향을 쟀다(측정 전용, 값 변화 0).** 🔴 결론은 "안전하다"가 **아니다** —
  그냥 켜면 자미 유년 세차가 **71해 중 40해에서 한 해 뒤로 밀린다.** 아래 "PR-5" 절.
  **남은 것은 별건 3건과 PR-5 가 새로 연 후속 2건뿐.**
- ✅ **후속-1 — `zwFlowGanji` 프로브 시각을 정정했다(2026-08-28).** 축 D 가 **40 → 0** 이 됐고,
  같은 함정을 소스에서 전수 발견해 막는 **검사 ⑯** 이 섰다. 아래 "후속-1" 절.
  **남은 것은 별건 3건과 후속-2(야자시 시프트 범위)뿐.**

Date 를 받는 진입점이 **소스에서 0개**가 됐고, `ganji-dst-gap-census.json` 의 `gaps` 가 6개 존
전부 **문자 그대로 0** 이 됐다.

## ✅ PR-4′ — 고친 값이 **캐시 보유자에게 도달하게** 만들었다 (2026-08-28)

PR-2 가 `kst` 결함을 고쳤지만 **localStorage 180일 보유자에게는 도달하지 않고 있었다.**
회귀가 아니라 **정정의 전달**이다.

### 왜 안 닿았나 (실측)

- 엔트리에 `terms24`(절입 시각 24행) · `ganji` · `lunar` 가 **통째로 박제**된다.
- `_readStorage` 의 유효성 검사는 **`savedAt` 나이 하나뿐**이었다. `context.version` 은
  리터럴 `1` 로 쓰이기만 하고 **읽는 곳이 0** 이었다(전수 grep).
- 유일한 재계산 갈래는 `!cached.ganji || !cached.ganji.hour` 일 때만 돌고,
  **그때조차 낡은 `terms24` 를 입력으로 먹인다.**
- `_applyCoreCalendarCorrection` 은 `lunar` 만 다시 쓴다 — 그래서 PR-3(음력일 축)은
  자동 치유였고 PR-2(절입 시각 축)만 남았다.

재현(가드 이전, 1990-06-15 12:00 · `localOnly`): `version:1` + 자정 24행을 심으면
`source=cache` 로 **자정 24행이 그대로 나온다.**

### 고친 것

| 자리 | 무엇 |
|---|---|
| `js/core/kasi-calendar-service.js` 상수 | `var _CONTEXT_LOGIC_VERSION = 2;` — **스키마가 아니라 계산 로직 세대**. 세대 이력을 주석에 남긴다 |
| 같은 파일 `_readStorage` | TTL 검사 뒤에 `if (parsed.context.version !== _CONTEXT_LOGIC_VERSION) return null;` |
| 같은 파일 `_buildDateContext` | `version: 1` → `version: _CONTEXT_LOGIC_VERSION` |

🔴 **접두사 회전(`v2`→`v3`)을 안 쓴 이유**: 청소 코드가 없어(`clearCache` 는 호출부 0)
옛 키가 사용자 브라우저에 **영구 잔류**한다. 게이트는 폐기 후 **같은 키에** 새 값이 덮이므로
용량 누수가 0이다(검사 ⑫-d 가 그것을 잰다).

### 검사 ⑫ ⑬ (`verify:solar-term-frame-kasi`) · 검사 ⑭ (`verify:shell-korean-calendar`)

| # | 무엇 |
|---|---|
| ⑫-a | `resolveDateContext` 노출 · `_CONTEXT_LOGIC_VERSION` 선언 — 🔴 **블록 밖에서**(⑦ 이 fail-open 이던 사고 반복 금지) |
| ⑫-b | 옛 세대 엔트리가 폐기되고 절입 시각이 다시 계산된다 |
| ⑫-c | 🔴 같은 세대 엔트리는 **그대로 캐시에서 나온다** — 게이트가 과해서 캐시를 죽이는 방향을 막는다 |
| ⑫-d | 폐기된 자리에 같은 키로 다시 쓰인다(옛 키 잔류 0) |
| ⑫-e | 게이트와 배출 지점이 같은 상수를 쓴다(리터럴 되돌림 금지) |
| ⑬-a·b | 🔴 정본의 **로직 지문 lock**. 값이 바뀌는 수정을 하고 세대를 안 올리면 실패한다 — #1246 에서 실제로 일어난 일을 막는 자리다. 주석은 지문에서 걷어낸다 |
| ⑭ | 🔴 간지 경로 7파일의 **무버전 참조가 허용 목록과 정확히 같다**(미분류·stale 양방향). 엣지 캐시 7일 창의 조건부 안전성을 값으로 고정한다 |

🔴 `evalShellService()` 의 localStorage 스텁은 **인자 없이 부르면 지금 그대로**다 —
①-b·⑦·⑪ 의 동작을 바꾸지 않는다. 실동작 백킹은 ⑫ 만 넘긴다.

### 음성 테스트 (실측 — 각각 지정한 검사만 빨강, 복구 후 초록)

게이트 줄 삭제 → ⑫-b·d(+⑫-e·⑬-a) / 게이트를 `===` 로 → ⑫-b·c·d / 배출 지점을 리터럴로 →
⑫-e / 세대만 올리고 lock 은 그대로 → ⑬-a·b / 프로브가 스텁 storage 로 되돌아감 → ⑫-c·d /
버전 토큰 하나 제거 → ⑭ 미분류 / 허용 목록 항목에 `?v=` 를 붙임 → ⑭ stale /
스캔 디렉터리 비움 → ⑭ 3건.

### 🔴 배포 시 알아 둘 것

세대를 올렸으므로 **전 보유자가 날짜컨텍스트를 1회 재생성**한다. 완충은 워커의 인메모리
캐시(`LEGACY_CACHE_TTL_MS` 30분 · `CALENDAR_CACHE_TTL_MS` 12시간)다. 도달성은 위 "PR-2 —
도달성" 표 그대로(`localOnly:true` 는 `js/saju-engine.js` 한 곳뿐, 나머지는 KASI 갈래를 탈 수 있다).

### 🔴 남은 계획 항목 — 착수 전에 이 절을 읽어라 (2026-08-28 실측)

**PR-4 · PR-5 — ✅ 둘 다 끝났다(아래 각 절).** 남은 것은 아래 별건 3건과, PR-5 가 실측으로
연 후속 2건이다.

**PR-5 가 연 후속 (전부 측정 결과이지 결정이 아니다 — 고치려면 사용자 승인부터).**

1. ~~🔴 `zwFlowGanji` 의 프로브 시각이 틀렸다.~~ ✅ **닫혔다 (2026-08-28, 후속-1).** 아래 절.
2. 🔴 **야자시 시프트 범위가 코어와 다르다.** 엔진은 23시대에 **부품 전체**를 하루 밀어
   節 프레임(세차·월건)까지 움직이는데, 코어 `ganji()` 는 **일진만** 민다(`nightZiApplied`).
   전환 후 코어와 어긋나는 표본 19건이 **전부** 이 축이다(절기표 축 0건).

**별건으로 남긴 것 (발견만 기록).**

1. `modalProfileState.js` **이중 로드 가능성** — 체인(`?v=` 있음)과 lazy-src·`__loadScriptOnce`
   (`?v=` 없음)가 서로 다른 URL 이라 dedupe 가 갈린다. 실제 이중 실행 여부는 **미측정**.
2. `kasi:local-calendar-patch:v1`(`js/saju-engine.js`) — **TTL 없음 · 버전 검사 없음**이고
   `solarToLunarFromParts` 가 코어보다 **먼저** 읽는다. 키에 시각이 없어(`YYYY-MM-DD`)
   야자시 축과 무관하다고 **추정**하나 미검증.
3. MongoDB 박제 값(R-h) — `worker/lib/models.js` 의 `ziweiAiChartSchema.lunar` ·
   `sukuyoCompatibility…shuku/shukuIndex` · `lifeBookAi…sajuResult`. 로직 버전 필드가 없다.

## ✅ 후속-1 — `zwFlowGanji` 프로브를 세차 구간 한가운데로 옮겼다 (2026-08-28)

**오늘 화면 값 변화 0.** `getGanjiFromParts` 는 검증캐시 밖(=1990 말고 전부)에서 null 이라
지금은 1984 기준 산술식 폴백이 답한다. 이 PR 은 **null 이 값이 되는 날 터질 것**을 미리 닫는다.

### 무엇이 틀렸었나

세차(年柱) 구간을 가르는 것은 입춘인데 입춘은 **2월 3~5일 사이를 오간다.** 옛 프로브
`(year, 2, 4, 12:00)` 는 그 경계 위에 얹혀 있었다 — 입춘이 2/4 정오보다 늦은 해에는
프로브가 아직 **전해 세차 구간**이라 자미 유년 세차가 통째로 한 해 뒤로 밀린다.

| 프로브 | 어긋난 해 (1960~2030) | 1900~2099 |
|---|---|---|
| 옛 `(year, 2, 4, 12:00)` | **40 / 71** — 전부 정확히 한 해 뒤 | 104 / 200 |
| 새 `(year, 6, 15, 12:00)` | **0 / 71** | 0 / 200 |

6/15 정오는 **레포에 이미 있던 정답 모양**이다 — 대운 세운·연운 두 곳이 처음부터 그 축이었고
PR-5 측정에서 어긋난 해가 0 이었다. 새 규약을 만든 게 아니라 갈린 셋을 하나로 맞춘 것이다.

### 바꾼 것

| 파일 | 무엇 |
|---|---|
| `js/saju-engine.js` `zwFlowGanji` | 프로브 `(year,2,4,12:00)` → `(year,6,15,12:00)`. 왜 경계 위에 있으면 안 되는지 주석에 남겼다 |
| `scripts/verify-shell-korean-calendar.mjs` | **검사 ⑯ 7건** 신설(⑬⑭⑮ 와 `GANJI_PATH_FILES` 공유) |
| `scripts/measure-ganji-null-transition.mjs` | 축 D 의 zwFlow 프로브를 소스에 맞추고, **옛 프로브를 대조군으로** 남겼다 |
| `public/**` · `index.html` 외 | `npm run sync:public` 산출물(미러 + 캐시키 회전). 값 변화 0 |

🔴 폴백 산술식(`year - 1984`)은 **안 건드렸다.** 그 식은 "해 N 의 세차"를 바로 내므로 경계 문제가
없고, 지금 화면에 나오는 값이 그것이다. 이 PR 로 화면 값이 안 바뀌는 이유가 그것이다.

### 검사 ⑯ — 손으로 쓴 목록이 아니다

대상도 판별 기준도 소스·코어에서 **전수 발견**한다(CLAUDE.md 원칙 10).

- `getGanjiFromParts(` 호출을 괄호 균형으로 전수 훑어 첫 인자를 분류한다 —
  실측 **호출 11건 · 고정 프로브 3건 · 생시 축 8건**(PR-5 의 호출부 재고 11곳과 일치).
- 첫 인자가 `partsOf` 계열 호출도 변수도 아니면(예: 인라인 객체) **미분류로 실패**시킨다.
- 고정 프로브의 시·분이 리터럴이 아니어도 실패시킨다(잴 수 없는 것을 통과시키지 않는다).
- 경계 기준은 상수가 아니라 코어 `solarTerms` 에서 **매 해 입춘을 실제로 읽어** 잰다.
  1900~2100 전 해에 대해 `입춘(y) ≤ 프로브 < 입춘(y+1)` 을 단언한다.
- 🔴 자기검사 — **정정 전 프로브 `2/4 12:00` 이 실제로 걸리는지**를 같이 단언한다. 절기표
  로딩이나 경계 비교가 조용히 죽으면 위 검사는 "0건이라 초록"이 되는데 이 줄이 그때 터진다.
- 🔴 줄 번호는 안 쓴다 — `stripCommentsAndStrings` 가 블록 주석을 길이 보존 없이 지워
  스트립된 소스의 줄 번호가 원본과 어긋난다. 인자 문자열로 지목한다(⑬ 과 같은 방식).

### 음성 테스트 5종 (전부 fail-closed · 바이트 백업으로 복구, 복원 후 71건 초록)

| 심은 것 | 빨강이 된 검사 |
|---|---|
| 프로브를 `(2,4,12:00)` 로 되돌림 | `⑯ 고정 프로브 전건이 … 그 해 세차 구간 안이다` |
| 부품을 인라인 객체로 넘겨 스캐너 우회 | `⑯ getGanjiFromParts 첫 인자가 전부 분류된다` |
| 고정 프로브의 시를 변수로 | `⑯ 고정 프로브의 시·분이 전부 리터럴이다` |
| 입춘 이름 매칭을 `입춍` 으로 깨뜨림 | `⑯ 코어 절기표가 … 입춘을 전부 답한다` + `⑯ 이 검사가 판별력이 있다` |
| 고정 프로브 3건을 전부 변수화 | `⑯ 고정 프로브가 실재한다` |

### 재현

```
npm run measure:ganji-null-transition   # 축 D: zwFlow 0/71 · 대조군(옛 프로브) 40/71
npm run verify:shell-korean-calendar    # 검사 71건 (⑯ 7건 포함)
npm run verify:ganji-surface-parity     # 검사 66건 — 표면 값이 안 움직였다는 증거
```

축 A·B 는 이 PR 로 **한 칸도 안 움직였다**(재실행값이 PR-5 절 표와 동일: null→값 1515 ·
값→같은값 125 · 값→다른값 5 · 축 B 19건/123건). `zwFlowGanji` 는 그 표면 13벌에 없다.

### 🔴 남는 것 (부정 단언 금지)

- 이 PR 은 **프로브 축만** 고쳤다. 후속-2(야자시 시프트 범위)는 그대로다.
- 검사 ⑯ 은 `GANJI_PATH_FILES` 7파일만 본다. 그 밖에서 `getGanjiFromParts` 를 부르면 안 잡힌다 —
  다만 `git grep` 전수상 `js/` 밖에 호출부가 없다(실측 2026-08-28).
- 프로브가 **변수**로 계산되는 자리는 원리상 못 잰다. 지금은 그런 자리가 0건이다.

## ✅ PR-5 — `getGanjiFromParts` null 전환 영향을 쟀다 (2026-08-28, 측정 전용)

**값 변화 0 · 소스 무수정.** 바꾼 것은 `scripts/` 와 `package.json` 뿐이다.

| 파일 | 무엇 |
|---|---|
| `scripts/lib/ganji-samples.mjs` (신설) | 표본 생성기. 코어·서비스를 **주입**받는다 |
| `scripts/verify-ganji-surface-parity.mjs` | 그 모듈을 쓰도록 교체(-215/+15줄). 로직 변화 0 |
| `scripts/measure-ganji-null-transition.mjs` (신설) | 측정기 |
| `package.json` | `measure:ganji-null-transition` — 🔴 **가드가 아니다**(`verify:*` 아님, CI 미배선) |

### 🔴 추출이 무손실이라는 증거 — 픽스처가 **바이트 동일**로 재생성된다

`--emit` 으로 두 픽스처를 다시 만들었더니 `git status` 가 **아무것도 안 내놓았다.**
기본 모드도 추출 전후가 같다 — 검사 66건 · 표본 1645건 · 접힌 벽시계
`Seoul:12 UTC:0 New_York:21 Apia:18 Kiritimati:6 Lord_Howe:18`.

옮긴 것은 계획이 적은 6개(`TZ_MATRIX`·`YEARS`·`LEAP_SCAN_FROM/TO`·`forwardTransitions`·
`spread`·`partsOfWallMs`)에 **3개가 더 붙었다.** 전부 "두 스크립트가 갈리면 측정이 근거를
잃는" 자리다:

- `zoneOffsetMinutes` — `forwardTransitions` 의 전용 헬퍼라 같이 안 가면 안 돈다.
- `cacheYearsFrom`(옛 `validatedCacheYears` + 상한 3 + 버린 해 보고) — **상한이 갈리면 표본이
  갈린다.** 그러면 측정값이 픽스처의 어느 행과도 대응하지 않는다.
- `coreTermRows` — 시뮬레이션이 먹이는 절기표가 회귀 증명기가 먹이는 것과 같아야 한다.

`pad2` 도 한 벌로 합쳤다. 측정기는 그 위에 **표본 수 == 픽스처 `sampleCount`** 를 자기검사로
단언한다(⓪) — 어긋나면 숫자를 내기 전에 죽는다.

### 어떻게 흉내 냈나 — 야자시 규약을 **베끼지 않는다**

`KasiCalendarService.computeGanjiFromParts` 를 감싸 **terms 를 안 받은 호출에만** 코어 절기표를
채우고, 진입점은 프로덕션 코드 그대로 `KasiEngine.getGanjiFromParts` 를 부른다(엔진이
`window.KasiCalendarService` 를 호출 시점에 찾으므로 래핑이 그대로 먹는다). 그래서 23시대 하루
밀기·시주 조립이 사본이 아니라 **원본**으로 측정된다.

🔴 이것은 "검증캐시를 **코어 표**로 채웠을 때"다. KASI 실응답으로 채우면 다를 수 있고,
그 차이의 크기가 아래 축 A 의 "값→다른 값"이다.

### 축 A — 표면 3벌의 전환 지도 (표본 1,645건 · `TZ=Asia/Seoul`)

세 표면(`getGanjiFromParts` · `:noYaja` · `computeGanjiFromParts:noTerms`)이 **숫자가 같다.**

| 분류 | 건수 | 무엇 |
|---|---|---|
| null→값 | **1,515** (92.1%) | 캐시 밖 해 전부. 지금은 호출부가 폴백을 쓴다 |
| 값→같은 값 | 125 (7.6%) | 1990(캐시 해) — 코어 표와 같은 답 |
| 값→다른 값 | **5** (0.3%) | 1990 — 검증캐시 ↔ 코어 절기표 **1분 차**가 월건을 한 칸 민다 |
| 값→null | 0 | 잃는 것은 없다 |

5건은 전부 節 경계 표본이고 세차·일진·시주는 안 움직인다. 예:
`1990-04-05 10:12  庚午/庚辰/庚子/辛巳 → 庚午/己卯/庚子/辛巳`.

### 🔴 축 B — 전환된 값이 **지금 화면의 값**(`_coreEightChar`)과 갈린다

호출부 대부분이 코어로 계산해 둔 기둥을 `_gj` 가 있을 때만 덮는 모양이라, 이 대조가 곧
"화면이 얼마나 바뀌는가"다.

| 표면 | 어긋난 행 | 기둥별 | 시각축 |
|---|---|---|---|
| `getGanjiFromParts`(야자시 ON, 호출부 8곳) | **19** (1.2%) | 세차 4 · 월건 19 · 일진 0 · 시간 0 | 🔴 23시대 **19** · 그 밖 **0** |
| `:noYaja`(호출부 2곳) | **123** (7.5%) | 세차 0 · 월건 0 · 일진 123 · 시간 123 | 23시대 123 · 그 밖 0 |

🔴 **절기표 축은 0건이다. 전부 야자시 규약의 축 차이다.** 엔진은 23시에 **부품 전체**를 하루
밀어 節 프레임까지 움직이는데, 코어 `ganji()` 는 `nightZiApplied` 로 **일진만** 민다.
그래서 23시대 출생이 節을 넘으면 세차·월건이 갈린다 — R1 이 적은 사고 모양 그대로다:

```
1988-02-04 23:00  코어 丁卯/癸丑/庚寅/丙子  →  전환 戊辰/甲寅/庚寅/丙子   (세차·월건)
1990-01-05 23:32  코어 己巳/丙子/辛未/戊子  →  전환 己巳/丁丑/辛未/戊子   (월건)
```

반대로 `yaja:false` 로 부르는 둘(`js/luck-sync-diary.js:407`·`:505`)은 엔진이 안 미는데 코어는
미니까 **일진·시주가 123건 갈린다**. 두 줄이 서로 반대 방향으로 어긋나 있다.

### 🔴 축 D — 인자가 **박혀 있는** 호출부: 자미 유년 세차가 40해 밀린다

표본이 아니라 호출부의 인자 모양 그대로 1960~2030 전 해를 돌렸다.

| 호출부 | 프로브 | 어긋난 해 |
|---|---|---|
| `zwFlowGanji`(자미 유년, `:24300`) | `(year, 2, 4, 12:00)` | 🔴 **40 / 71** — 전부 정확히 **한 해 뒤**로 |
| 대운 세운·연운(`:28961`·`:29086`) | `(year, 6, 15, 12:00)` | **0 / 71** |

원인은 측정으로 갈렸다 — **입춘이 2/4 정오보다 늦은 해가 정확히 40건**이다(40 = 40 = 40).
즉 프로브 시각이 그 해 세차 구간에 안 들어간다. 지금은 `getGanjiFromParts` 가 null 이라 1984
기준 산술식 폴백이 답해서 안 드러날 뿐이고, **살아 있는 유일한 해 1990 은 입춘이 11:14 라
우연히 일치**한다. 고칠 자리는 절기표가 아니라 그 프로브 시각이다.

### 호출부 재고 — 🔴 **11곳이다. 소스 주석의 "13곳"은 낡았다**

범위: `git grep "getGanjiFromParts"` 전수(`public/` 미러·정의·주석 제외). `js/` 밖에는 없다.

| # | 자리 | 답하면 무엇을 덮나 | 지금(null) 화면에 있는 값 |
|---|---|---|---|
| 1 | `saju-engine.js:1229` (repair) | **빈 기둥만** 채운다 | 그 아래 `_coreEightChar` 안전망 |
| 2 | `:1478` 로컬 폴백의 `ganji` | 그 필드 전체 | 그 필드가 통째로 빈다 |
| 3 | `:2920` 모달 원국(퀀텀) | 세차·월건·일진 | `_coreEightChar` — 🔴 일진·시주는 직후 `_cdCivilDayPillar`·`_cdHourPillarFromDayStem` 가 다시 덮는다 |
| 4 | `:24300` `zwFlowGanji` | 세차 | **1984 기준 산술식** ← 후속 1 |
| 5 | `:27796` 궁합 | 세차·월건·일진 (KASI pairCtx 없을 때만) | `_coreEightChar` |
| 6 | `:28961` 대운 현재 세운 | 세차 | `_coreEightChar` |
| 7 | `:29086` 대운 10년 연운 | 세차 | `_coreEightChar` |
| 8 | `:29783` 유명인 매칭 | 세차·월건·일진 | `_coreEightChar` |
| 9 | `luck-sync-diary.js:407` (`yaja:false`) | 3기둥 전부 | 아래 코어 폴백 |
| 10 | `luck-sync-diary.js:505` (`yaja:false`) | 기둥별 `\|\|` | `_coreGanjiPillars`(코어) |
| 11 | `saju-core-bootstrap.js:730` | 3기둥 전부 | `card.fallbackPillars`(FAMOUS_DATA 에 박힌 값) — 일치 여부 **미측정** |

### 음성 테스트 3종 (측정기의 ⓪ 자기검사 — 전부 fail-closed, 바이트 백업으로 복구)

| 심은 것 | 결과 |
|---|---|
| 시뮬레이션 래핑이 terms 를 안 채우게 함 | ⓪ "시뮬레이션이 실제로 먹는다" 빨강 (2000년 → null) |
| `withFilledCache` 의 `finally` 복구 제거 | ⓪ "원상복구된다" 빨강 (복구 후에도 2000년이 답한다) |
| `SAMPLE_YEARS` 에 1961 추가 | ⓪ "표본 수가 픽스처와 같다" 빨강 (1645 / 1774) |

🔴 `CACHE_YEAR_LIMIT` 을 3→1 로 낮추는 것은 **탐지되지 않는다** — 검증캐시에 해가 1개뿐이라
상한이 아무것도 안 자르기 때문이다. 캐시가 늘면 그때는 위 표본 수 검사가 잡는다.

### 재현

```
npm run measure:ganji-null-transition     # 이 절의 모든 숫자 (약 30초)
npm run verify:ganji-surface-parity       # 추출이 무손실인지 (검사 66건)
```

### 🔴 한계 (부정 단언 금지)

- 표본은 절기·야자시·설날·윤달·서머타임 경계에 **집중**돼 있다. "몇 %의 사용자"로 읽으면 안 된다.
- 축 B 는 `TZ=Asia/Seoul` 단일 축이다(다른 존은 회귀 증명기가 이미 전건 일치를 못박았다).
- 11번(유명인 카드)의 박힌 폴백과 엔진 값이 같은지는 **안 쟀다** — 하네스가 그 파일을 안 싣는다.
- 측정기는 `zwFlowGanji` 의 1984 산술식을 **베껴 쓴다**(중첩 지역 함수라 밖에서 못 부른다).
  저쪽이 바뀌면 여기도 바꿔야 한다 — 그 사실을 스크립트 주석에 적어 뒀다.

## ✅ PR-4 — `_partsOf` 사본 동일성 가드(검사 ⑮)를 넣었다 (2026-08-28)

값 변화 0. 바꾼 파일은 `scripts/verify-shell-korean-calendar.mjs` **하나**다.

### 🔴 원 계획의 발견 규칙은 역시 틀렸고, 실측은 7벌도 아니었다

*"본문에 `Date.UTC(` · `getUTCFullYear()` · `getUTCMonth() + 1` 을 전부 포함하는 함수"* 는
`GANJI_PATH_FILES` 7개 안에서 **6벌**이다 — 앞선 실측이 적은 7벌 중 `_dpHasValidProfileDate`
는 `js/destiny-profile.js` 소속이라 **이 목록 밖**이다(R10 이 못 건드리게 한 그 파일).
그리고 그 6벌도 마커를 **공백 무시**로 봐야 다 잡힌다 — `_formatUtcFromLocal` 이
`getUTCMonth()+1`(공백 없음)이라 띄어쓰기 하나로 발견에서 빠졌다.

또 하나: 마커 스캔은 **감싸는 바깥 함수까지** 잡는다. `renderAstroInsightLegacyNeon`
(지문 199,858자)이 `_formatUtcFromLocal` 을 품고 있어 그대로 세면 7건이 된다. 그래서 검사는
**최내곽**(자기 범위 안에 다른 매치가 없는) 함수만 센다.

### 넣은 것 — 검사 ⑮ 5건 (같은 파일 ⑬⑭ 블록 안, `GANJI_PATH_FILES` 공유)

축을 둘로 나눴다. 지문 그룹이 **동일성**을, 마커 전수가 **신규 유입**을 맡는다.

| # | 무엇 | 실측 (2026-08-28, 이 브랜치) |
|---|---|---|
| ⑮-a | 스캐너 생존 — `function <이름>(` 느슨한 전수 == 슬라이스 전수 | 함수 **1,840**개 · 서로 다른 지문 **1,822**개 · 중복 그룹 **15**개 |
| ⑮-b | 사본 2벌이 이름으로 실재(리네임·삭제 탐지) | `kasi-calendar-service.js:_partsOf` · `saju-engine.js:_kasiPartsOf` |
| ⑮-c | 🔴 그 지문을 가진 함수 집합이 **정확히 2벌** | 332자 단독 그룹. 드리프트 → 1벌, 사본 증가 → 3벌 |
| ⑮-d | 얼려 둔 그룹이 정말 부품 정규화다(조각 8종 존재) | 씨앗을 `_pad2` 로 바꾸면 즉시 빨강 |
| ⑮-e | 🔴 마커 3종 최내곽 함수 전수 == 등재 목록(미분류·stale 양방향) | **6**건 등재 |

등재된 6건과 역할: `_partsOf`(정본) · `_kasiPartsOf`(셸 사본) ·
`saju-engine.js:_shiftDatePartsByDays`(날짜 축만, 시·분 없음) ·
`saju-engine.js:_cdCivilDayPillar`(일진 60갑자 UTC 일련번호) ·
`saju-engine.js:_formatUtcFromLocal`(디버그 표시) ·
`luck-sync-diary.js:_addDaysToParts`(부품 시프트, 시·분 보존).

- ⑮-a 의 "느슨한 전수 == 슬라이스 전수"는 **조용한 누락 탐지**다. 파라미터에 `)` 가 든 선언
  (기본값·구조분해)이 생기면 `DECL_RE` 가 그 함수를 통째로 건너뛰는데, 그 순간 ⑮-e 가
  "0건이라 통과"가 된다. 실측으로 심어 확인했다(느슨 1,841 vs 슬라이스 1,840 → 빨강).
- 절단은 계획대로 `scripts/lib/js-source-slice.mjs` 의 `sliceFunction`·`stripComments` 를
  import 한다. 🔴 `sliceFunction` 은 `indexOf` 로 **첫** 마커를 찾으므로 `src.slice(match.index)`
  를 넘겨 마커가 0번에 오게 해야 한다 — 전체 소스를 넘기면 같은 시그니처의 앞선 선언을 잘라 온다.
- 계획대로 **public 미러 지문 대조는 안 넣었다**(원칙 6, `verify:public-mirror-fresh` 중복).
- 중복 그룹 15개 중 14개는 `escapeHtml`·`_pad2` 류의 무해한 복제 = 정상 배경이라 **세지 않는다**
  (그 수를 단언하면 무관한 헬퍼 하나에 빨개진다).

### 음성 테스트 7종 (전부 fail-closed → 바이트 백업으로 복구, 복원 후 64건 초록)

| 심은 것 | 빨개진 검사 |
|---|---|
| `_kasiPartsOf` 의 `s \|\| 0` → `s \|\| 1` (한쪽만 드리프트) | ⑮-c 만 (그룹 1벌) |
| `_kasiPartsOf` 를 파일 전역 리네임 | ⑮-b · ⑮-c · ⑮-e |
| 같은 파일에 **글자 그대로 같은** 3번째 사본 추가 | ⑮-c(3벌) · ⑮-e(미분류) |
| 다른 모양의 새 UTC 부품 함수 추가 | ⑮-e 만 |
| 파라미터 기본값 `(a = Math.max(1, 2))` 함수 추가 | ⑮-a 만 |
| 등재 목록에 없는 함수 이름 한 줄 추가 | ⑮-e (stale) |
| 씨앗을 `_pad2`/`_kasiPad2`(진짜 2벌 그룹)로 교체 | ⑮-d 만 |

### 여기서 안 쓴 실측 (PR-5·후속용으로 남긴다)

- **R9 대상 곳수 정정**: 계획의 "`_kasiPartsOf` 13곳" 은 `js/saju-engine.js` 안만 센 값이다.
  실측은 saju-engine.js 13곳(래퍼 제외) + `saju-engine-tarot-sukuyo-quantum.js` **5곳** = 18곳.
  `_partsOf` 4곳 · 공개 `partsOf` 외부 3곳을 더해 **총 25곳**(계획의 20곳이 아니다).
- `_partsValid` 는 `js/core/kasi-calendar-service.js` 에 있고 호출부 4곳.

## ✅ PR-3 — 음력일 축 야자시를 **OFF 로 통일**했다 (2026-08-28)

🔴 **§6-4 의 "현행 유지(ON)" 결정을 뒤집는다.** 그 결정의 근거였던
*"셸 전체의 축이 shift-day 인데 숙요만 반대로 두면 같은 화면에서 규칙이 갈린다"* 는 **전제가
틀렸다** — 셸은 이미 갈려 있었다. 서비스 컨텍스트를 거치는 소비자는 안 밀고,
`solarToLunarFromParts` 를 직접 부르는 소비자는 밀었다(PR-1 의 검사 ⑥ 이 그것을 값으로 박았다:
23시대 갈래 **2**). 그리고 앱·워커는 처음부터 안 밀었다.

⇒ 방향은 "OFF 를 ON 으로"가 아니라 **이미 안 밀던 다수(서비스 경로·앱·워커)에 미는 소수를
맞춘 것**이다. 🔴 **간지(일주·시주) 축의 야자시 ON 은 그대로다** — `getGanjiFromParts` 는
한 글자도 안 건드렸다.

### 바꾼 코드 4곳

| # | 자리 | 무엇 |
|---|---|---|
| 1 | `js/saju-engine.js` `solarToLunarFromParts` | `options = options \|\| { yaja: true }` → `options = options \|\| {}` + 규약 비대칭 머리주석 |
| 2 | `js/saju-engine-tarot-sukuyo-quantum.js` `syRadarResolveLunar` | 주석 정정(현행과 반대로 적혀 있었다) |
| 3 | 같은 파일 `syBuildMonthlySukuyoLunar` | 주석 정정(정오 고정이라 값은 무관) |
| 4 | 같은 파일, 숙요 3 폼의 **음력 입력** 갈래 | `if (h >= 23) _kasiShiftPartsByDays(tBirthParts, 1)` 제거 |

🔴 **4번은 원 계획의 표에 없던 자리다.** 그 갈래는 `solarToLunarFromParts` 를 **안 거치고**
부품을 직접 민다. 기본값만 뒤집었다면 **같은 폼에서 양력은 안 밀고 음력은 미는 자가당착**이
남았다. 그래서 검사 ⑥-0c 로 `_kasiShiftPartsByDays(` 호출을 전수 발견해 축별로 분류하고
미분류·stale 을 실패시킨다(발견은 주석을 걷어낸 소스에서, 이름은 `이름: function(` 형태까지).

### 값 변화 — 전부 23시대 출생에만 해당 (실측 2026-08-28, 이 브랜치)

```
ganji-surface-kst.json  표본 1,645행 중 23시대 123행
  solarToLunarFromParts       123칸 이동 (23시대 전건)
  calcZiweiPalaces:calcMeta   123칸 이동 (lunarMonth/lunarDay 부분)
  합계 246칸 · 23시대 밖 1,522행 0칸 · nullMap 0칸
  getGanjiFromParts · :noYaja · computeGanjiFromParts:* · 기둥 4벌 · getMonthGanZhi = 0칸
sukuyo-shell-axis.json  표본 77행 중 23시대 44행의 본명숙이 이동, groupCounts 2 → 1
```

재현: `git show <PR-3 직전>:scripts/fixtures/ganji-surface-kst.json` 과 현재 파일을 표면 이름으로
짝지어 열 단위로 센다(`scripts/fixtures/README-ganji-surface.md` §①-d).

### 🔴 fail-closed 증거 — 자미 가드가 23시대를 아예 안 보고 있었다

`ziwei-star-parity`·`ziwei-worker-chart-facts`·`ziwei-chart-detail-view`·`ziwei-sohan` 은
**23시 케이스가 한 건도 없어서** 이 불일치를 못 봤다. 그 무변화가 곧 사각지대였다.
그래서 `verify-ziwei-star-parity.mjs` 의 `CASES` 에 2004~2015 × `23:30` 12건을 넣었다.

```
코드 수정 **전** (케이스만 추가한 커밋)
  [verify:ziwei-star-parity] 실패 2건 / 검사 21건 · 대조 인물 41명
    ④ 별 위치 불일치 308건   예) 2004-05-15 23:30 M · 자미 · 셸=丑 워커=戌
    ⑤ 달력 드리프트 12건     예) 2004-05-15 23:30 M · 셸=3월 28일 · 워커=3월 27일

코드 수정 **후**
  [verify:ziwei-star-parity] 통과 — 검사 21건 · 대조 인물 41명 · 공용 별 28개
```

12건 전부 셸의 음력일이 워커보다 **하루 앞서** 있었다 — 정확히 야자시 밀기의 모양이다.

### 가드 쪽 변경

- `verify-sukuyo-korean-calendar.mjs` ⑥-b: 갈래 **2 → 1**.
- ⑥-a 신설: 23시대도 **코어 값과 직접 대조**한다. 갈래 수만 보면 소비자 전원이 *같이* 밀어도 1 이라
  통과하기 때문이다.
- ⑥-e 의 의미가 뒤집혔다. 전에는 진단 태그 `korean-calendar-core-correction` 이 **찍히는지**를
  봤다(보정이 밀린 값을 되돌린 증거). 지금은 폴백이 애초에 코어와 같은 값을 내므로 그 보정이
  **no-op** 이고 태그가 안 찍힌다 — 이제 **안 찍히는지**를 본다. "네트워크가 없어서 통과" 는
  별도 태그 `lunar conversion fallback` 이 실제로 찍혔는지로 계속 막는다.
- ⑥-0c 신설: `_kasiShiftPartsByDays(` 전수 발견 + 축 분류(위 4번).
- `verify-ganji-surface-parity.mjs` `SURFACES` 에 `solarToLunarFromParts:yaja` 열 추가(12 → 13벌).
  규약 비대칭을 **네 열**로 적어 둔다 — `getGanjiFromParts`(ON) / `:noYaja`(OFF) /
  `solarToLunarFromParts`(OFF) / `:yaja`(ON).

### 안 건드린 것

- `getGanjiFromParts` — 간지 축은 야자시 ON 이 정본이다(⑥-f 가 지킨다).
- `js/destiny-profile.js` · 하네스 `SHELL_CHAIN` · `js/core/kasi-calendar-service.js`.
- 앱·워커·`lib/` — 원래 안 밀고 있었다.

### ✅ 남는 위험이라 적었던 둘 — PR-4′ 에서 실측으로 갈랐다 (2026-08-28)

착수 당시 이 자리에 "엣지 캐시 7일 공존"과 "localStorage 180일" 을 나란히 적었다.
🔴 **재실측 결과 셋으로 갈렸다 — 하나는 해당 없음, 하나는 자동 치유, 하나만 실재하는 결함이었다.**

- 🟢 **엣지 캐시 7일 공존 — 이 축에 해당 없음.** 아래 "새로 알게 된 것 1"(PR-E 실측)과 같은 결론이고,
  PR-4′ 가 세 사실로 다시 확인했다: ① HTML 이 `no-cache`(`public/_headers` 의 `/` · `/index.html` ·
  `/*.html` · `/*/`) + 서비스워커가 문서를 `no-store` network-only 로 강제(`service-worker.js:106-121`)
  ② PR-2·PR-3 이 바꾼 3파일의 **로드 지점 전건**이 `?v=build-<hash>`(`js/core/index-inline-runtime.js`
  체인, 진입점 자체도 `index.html` 에서 토큰을 단다) ③ 그 토큰이 빌드마다 돈다
  (`scripts/sync-legacy-static-to-public.mjs` `resolveDeterministicCacheKey()`, CI 는 커밋 SHA).
  ⇒ 새 HTML → 새 토큰 → 새 캐시 키 → 미스. SWR 은 *같은 URL* 에만 걸리므로 관여할 자리가 없다.
  **공지 불필요.**
  🔴 다만 **조건부**다 — 무버전 참조가 하나라도 생기면 그 파일은 7일 창이 실재한다.
  현행 무버전 참조는 `js/core/saju/modalProfileState.js` 2건(`index.html` 의 `data-cd-lazy-src`,
  `js/core/uiBindings.js` 의 `__loadScriptOnce`)이고, **PR-4′ 의 검사 ⑭**
  (`verify:shell-korean-calendar`)가 그 목록을 fail-closed 로 고정한다.
- 🟢 **음력일 축은 캐시 보유자도 자동 치유된다.** 캐시 히트마다 `_applyCoreCalendarCorrection` 이
  `context.lunar` 를 `KoreanCalendar.solarToLunar(y, m, d)` **3인자(시각 없음 = 야자시 개념 없음)**
  로 덮어쓰고 재저장한다 — 그게 곧 PR-3 이 만든 OFF 값이다. **코드 변경 불필요.**
- 🔴 **절입 시각 축만 실재했다** — `terms24` 가 엔트리에 통째로 박제되고 재계산 갈래조차 낡은
  `terms24` 를 먹인다. PR-2 가 고친 값이 보유자에게 도달하지 않았다.
  ⇒ **PR-4′ 가 로직 세대 게이트로 닫았다**(`_CONTEXT_LOGIC_VERSION`). 아래 "PR-4′" 절.
- **저장된 리포트·캐시된 LLM 결과**와 새 계산이 어긋날 수 있다(스냅샷에 로직 버전 필드가 있는지
  확인은 별건 — `worker/lib/models.js` 의 `ziweiAiChartSchema.lunar` ·
  `sukuyoCompatibility…shuku` · `lifeBookAi…sajuResult` 가 그 표면이다).

## ✅ PR-2 — R4 는 이미 닫혀 있었고, 같은 자리에 **더 큰 것**이 있었다 (2026-08-28)

R4("`_normalizeTerms` 의 `atLocal` 이 Date 왕복으로 접힌다")를 확인하러 갔다가 나온 결과다.
**R4 자체는 PR-C 가 이미 닫았다** — `atLocal` 은 `_partsOf`+`_partsToIsoLocal` 로만 만들어지고
로컬 `Date` 를 캐리어로 쓰지 않는다. 그런데 그 함수의 **입력을 읽는 쪽**이 틀려 있었다.

### 🔴 결함 — 셸이 KASI 절입 시각 필드(`kst`)를 아예 안 읽었다

- `js/core/kasi-calendar-service.js:870` 이 `_pick(row, ['time','tm','locTime'])` 로 시각을 찾는데,
  **파일 전체에 `kst` 문자열이 0회** 등장했다.
- 워커의 메서드 프록시는 `get24DivisionsInfo` 업스트림 행을 **정규화 없이 passthrough** 한다
  (`worker/routes/kasi.js:683` `rows: upstreamRows`). `kst→time` 변환기
  `normalizeSolarTermRows`(`:224`)는 `requestCalendarSummary` 경로(`:725`·`:751`) 전용이다.
- `time` 을 붙여 주는 로컬 폴백(`worker/routes/kasi.js:150`)은 `source:"local"` 이라 셸이
  `KASI_UNVERIFIED_SOURCE` 로 던진다(`kasi-calendar-service.js:487-495`) — 브라우저에 도달하지 않는다.

**실측 2026-08-28 (프로덕션 `/api/kasi/calendar`, `solYear=2020` 1회 조회):**

```
source=kasi rows=24
row[0] = {"dateKind":"03","dateName":"소한","isHoliday":"N","kst":"0630      ","locdate":20200106,"seq":1,"sunLongitude":285}
time 필드: 0/24행   ·   kst 필드: 24/24행   ·   solYear/solMonth/solDay: 없음(locdate 갈래를 탄다)
```

⇒ **KASI 갈래의 절입 시각이 전건 `T00:00:00` 으로 뭉개졌다.**
크기(픽스처 `__tests__/fixtures/korean-calendar/kasi-24divisions.json` 29년 실측):
`節 348건 중 자정(00:00)인 節 0건` · `자정 절사 오차 총합 4,156.6시간 = 연평균 143.3시간(5.97일/년)`.
즉 KASI 가 살아 있는 **2000~2028 생** 중 연 6일 폭 구간의 월건이 한 칸 밀려 있었다
(월건 한 칸 = 십신 전부 이동). `_applyCoreCalendarCorrection` 은 음력만 고치고 간지는 안 건드린다.

🔴 **회귀가 아니라 정정이다** — 코어도 KASI 도 옳은 값을 갖고 있었고 셸만 자정을 썼다.

### 도달성 (부정 단언 금지 — 실측 2026-08-28)

| 축 | 실측 |
|---|---|
| 프로덕션 응답 | `--probe` 1회: `status=200 source=kasi rows=24` — **KASI 갈래가 라이브다** |
| 캐시 창 | 워커 `LEGACY_CACHE_TTL_MS` 30분 · 셸 `_METHOD_CACHE_TTL_MS` 30분 · 셸 날짜컨텍스트 localStorage `cacheTtlMs` **180일** |
| 진입점 | 셸에서 `resolveDateContext` 에 닿는 호출부 **10곳** 중 **9곳이 `localOnly` false 또는 미지정**(=KASI 갈래를 탈 수 있다). `localOnly:true` 는 `saju-engine.js:5212` 한 곳뿐 |

🔴 `localOnly` grep 이 잡는 `js/entertain-engine.js:1231` 은 **RPG 스냅샷의 동명 필드**이지
`resolveDateContext` 옵션이 아니다(실측 확인).

🔴 **R6 재등장** — localStorage 180일 TTL 보유자는 옛(자정) 값을 계속 본다.
`kasi:date-context:v2:` 는 **스키마가 안 바뀌므로 키 회전은 하지 않았다**(R6 의 원칙 그대로).
회전이 필요하다는 판단이 서면 멈추고 보고할 것.

✅ **PR-4′ 가 닫았다 (2026-08-28).** 판단은 "회전이 필요하다"가 아니라 **"기준이 스키마가 아니라
계산 로직이어야 한다"** 였다. `_readStorage` 가 보던 것은 `savedAt` 나이 하나뿐이었고
`context.version` 은 리터럴 `1` 로 쓰이기만 하고 **읽는 곳이 0** 이었다. 상수
`_CONTEXT_LOGIC_VERSION`(현재 2)을 세우고 읽기 시점에 게이트를 걸었다.
🔴 접두사 회전(`v2`→`v3`)을 안 쓴 이유: 청소 코드가 없어(`clearCache` 호출부 0) 옛 키가
사용자 브라우저에 **영구 잔류**한다. 게이트는 같은 키에 새 값이 덮이므로 용량 누수가 0이다.
아래 "PR-4′" 절 · 검사 ⑫ ⑬.

### 수정과 검사 ⑪

| 파일 | 무엇 |
|---|---|
| `js/core/kasi-calendar-service.js:870~` | `_pick` 에 `'kst'` 추가 + `HHMM`(3~4자리, **우측 공백 trim**) 파싱 갈래. 기존 `HH:MM(:SS)` 갈래는 그대로. 규칙은 워커 `normalizeSolarTermRows` 와 같다 |
| `scripts/verify-solar-term-frame-kasi.mjs` | `runLive()` 의 인라인 파서를 **`parseLiveTermRow()` 로 추출**(동작 변화 0) — 채집기와 검사가 같은 함수를 쓴다. `synthesizeKasiRows()` 신설. **검사 ⑪ 7건** 신설. 검사 42 → **51건** |

🔴 **왜 여기에 붙였나** — 기존 검사 ⑦ 은 이 구멍을 **구조적으로 볼 수 없다.** ⑦ 은 검증캐시 행
(`atLocal` 이 이미 박힌 모양)만 먹이므로 `_normalizeTerms` 를 아예 안 지난다.
🔴 `scripts/test-saju-solar-term-regression.mjs` 는 `package.json`·워크플로 **어디에도 없는 미배선**이라
거기 붙였으면 영원히 안 돌았다(실측).

| # | 단언 | 어디를 지키나 |
|---|---|---|
| ⑪-a | `shellTest.normalizeTerms` 가 함수다 — 🔴 **블록 밖에서** | 정규화기가 사라지면 블록이 통째로 안 돌고 "0건이라 통과"가 되는 fail-open |
| ⑪-b | 합성 행 24개가 `parseLiveTermRow` 를 전건 통과 + 셀 왕복 일치 | 표본이 실응답 모양에서 멀어지는 것 |
| ⑪-c | `normalizeTerms(rows, [], year)` 전 행이 `source==='kasi-api'` | 검증캐시·폴백 갈래로 새는 것 |
| ⑪-d | 🔴 **본체** — 정규화된 절입 시각이 KASI 원본과 **전건 같다**(696셀) | 자정 뭉갬 |
| ⑪-e | `kst` 3모양(`"1723      "` · `"1723"` · `"17:23"`)이 같은 `atLocal` | `.trim()` 이 죽는 것 |
| ⑪-f | 그 terms 로 돌린 셸의 세차·월건이 코어와 같다(⑦ 과 같은 밴드 제외, 1,344건) | 프레임이 갈리는 것 |
| ⑪-g | 대조 행 수 = 24 × 픽스처 연도(696) | 0건 통과 |

🔴 **⑪-d 는 문자열이 아니라 벽시계 ms 로 잰다.** KASI 는 분 60 을 그대로 보내는 셀이 있다
(실측: 2019 대한 `kst="1760"` — 픽스처 29년 696셀 중 유일). `_partsOf` 의 `Date.UTC` 가 그것을
18:00 으로 정규화하므로 문자열 대조는 그 정규화를 결함으로 오독한다. 자정 탐지력은 그대로다.

### 음성 테스트 7종 — 전부 fail-closed (복원 후 51건 초록)

| 변형 | 잡은 검사 |
|---|---|
| `__test` 에서 `normalizeTerms` 삭제 | ⑪-a |
| 합성 행에서 `kst` 제거 | ⑪-b · ⑪-d · ⑪-f |
| 🔴 **`_pick` 의 `'kst'` 를 다시 뺀다(수정 되돌리기)** | ⑪-d(696셀 전건) · ⑪-f |
| `HHMM` 파싱에서 `.trim()` 제거 | ⑪-e(+⑪-d·⑪-f) |
| `normalizeTerms` 가 항상 `[]` | ⑪-d · ⑪-g · ⑪-e · ⑪-f |
| 정규화 결과 `source` 를 `validated-cache` 로 | ⑪-c |
| 픽스처 셀 한 칸 손편집 | ①-f · ② · ②-b · ⑨ |

수정을 되돌렸을 때 ⑪-f 가 찍는 실제 값(= 라이브 결함의 모양):

```
2000-01-06 08:31  코어 己卯/丙子 · 셸 己卯/丁丑
2000-02-04 20:10  코어 己卯/丁丑 · 셸 庚辰/戊寅   ← 입춘 경계라 세차까지 갈린다
2000-03-05 14:13  코어 庚辰/戊寅 · 셸 庚辰/己卯
```

🔴 복원은 `git checkout` 이 아니라 **스크래치 백업본**에서 했다(checkout 은 그 파일의 미커밋 작업을
통째로 날린다).

### 안 건드린 것

`scripts/fixtures/ganji-surface-kst.json` **무변경**(실측 확인) — 하네스 `fetch` 가 던지는 스텁이라
KASI 갈래를 안 탄다. `_VALIDATED_SOLAR_TERMS_BY_YEAR`·`KASI_KNOWN_ERRATA`·픽스처도 무변경.

---

## ✅ PR-F — 값 축의 사각지대를 닫았다 (2026-08-28)

**무엇이 문제였나.** PR-E 의 "새로 알게 된 것 3번"은 `getGanjiFromParts` 한 벌만 지목했는데,
실측해 보니 **12벌 중 8벌이 정도만 다를 뿐 같은 병**이었다. `verify:ganji-surface-parity` 가 찍는 것은
표면의 반환값이 아니라 **투영기가 뽑아낸 문자열**인데, 그 투영기가 셸의 반환 모양과 어긋나 있었다.

| 표면 | PR-E 픽스처(1516행)에서 그 열이 나른 것 | 원인 |
|---|---|---|
| `_cdCivilDayPillar` · `getGanZhiForDate` · `getMonthGanZhi` | 전부 `"///"` — 서로 다른 값 **1개** | 셸은 `{ g, j }` 를 돌려주는데 투영기가 `secha/weolgeon/iljin/sigan` 만 읽었다 |
| `_cdHourPillarFromDayStem` | 전부 `null` — live **0행** | 일간을 `{ g, j }` 에서 못 꺼내 인자가 늘 `null`(PR-E 가 "열 수를 12로 맞추려고" 넣은 열이다) |
| `calcZiweiPalaces:calcMeta` | `"////N/"` — `lunarMonth`·`hourBranch` 는 안 나름 | `calcMeta` 에 **없는 키**(`yearGanji`…)를 읽었다 |
| `getGanjiFromParts` · `:noYaja` · `computeGanjiFromParts:noTerms` | live **1행**(1516행 중) | 검증캐시가 1990 한 해뿐인데 표본 해가 7년 간격이라 1990 이 없었다 — 우연히 걸린 윤달 표본 하나가 전부 |

즉 **접어도 안 움직이는 열이 5벌**, **거의 안 움직이는 열이 3벌**이었다. 그래서 PR-E 의 음성 테스트에서
`getGanjiFromParts` 를 로컬 Date 로 접었을 때 57건이 전부 초록이었던 것이다.

| 파일 | 무엇이 바뀌었나 |
|---|---|
| `scripts/verify-ganji-surface-parity.mjs` | 투영기 교정(`gz()` 신설 · 일간을 `.g` 에서 · calcMeta 는 실제 키) · 검증캐시 해를 **셸에 물어** 표본에 넣는다(`validatedCacheYears()`) · **④ 상수 열 금지** 신설 · **⑮ Date 스파이** 신설 · ⓪ 검증캐시 해 자기검사 신설. 검사 57 → **66** |
| `scripts/fixtures/ganji-surface-kst.json` · `ganji-dst-gap-census.json` | `--emit` 재생성. 표본 1516 → **1645**(검증캐시 해가 들어와서) |
| `scripts/fixtures/README-ganji-surface.md` · `.github/workflows/pr-ci.yml` | 사각지대와 ⑮ 를 적었다 |

🔴 **셸 코드는 한 줄도 안 바뀌었다.** 이 PR 은 저울만 고친다.

### 고친 뒤 (실측 2026-08-28)

```
열이 나르는 서로 다른 값
  _cdCivilDayPillar / _cdHourPillarFromDayStem / getGanZhiForDate / getMonthGanZhi   1 → 60
  calcZiweiPalaces:calcMeta                                                         30 → 892
  getGanjiFromParts / :noYaja / computeGanjiFromParts:noTerms      live 1행 → 130행 · 값 2 → 88
```

### ✅ 픽스처 교체는 무손실이다 — 공유 표본 1,516건 실측

투영기를 **안 건드린 7벌**을 옛 픽스처(`git show origin/main:scripts/fixtures/ganji-surface-kst.json`)와
공유 표본 1,516건으로 대조: **값 불일치 0건 · isNull 불일치 0건.**
재투영한 5벌 중 넷은 옛 열이 상수(서로 다른 값 1개)라 잃을 정보가 없었고, `calcMeta` 는 옛 열의 유일한
정보였던 `lunarDay` 가 **1,516건 전부** 새 열에 그대로 있다.

### PR-F 음성 테스트 6종 (전부 fail-closed → 바이트 백업으로 복구, 복원 검산 동일)

| 변조 | 잡은 검사 |
|---|---|
| `getGanjiFromParts` 를 로컬 Date 로 접기(조립) | `✗ ⑮ 표면 12벌이 로컬 Date 를 한 번도 안 만지고 계산한다` — 🔴 **PR-E 에서는 아무것도 안 잡던 그 변조다** |
| 같은 자리를 `new Date(Date.UTC(...))` + 로컬 독출로 접기 | ⑮ + ① + ③ 5개 존 (**소스 검사 ⑬ 은 이 모양을 못 본다**) |
| `_cdCivilDayPillar` 투영기를 옛 `pill()` 로 되돌리기 | `✗ ④ 상수 열이 없다` + ① |
| 스파이의 **독출** 계측 죽이기 | ⑮ 자기검사 2건 |
| 스파이의 **조립** 계측 죽이기 | ⑮ 자기검사 1건 |
| 검증캐시 해 유도 죽이기 | `✗ ⓪ 검증캐시 해를 표본에 넣었다` + ①③건 |

🔴 자기검사를 처음 썼을 때는 **예외가 자기검사를 만족시켜** 계측을 죽여도 통과했다(THROW 를 ops 에
같이 담았다). 지금은 던진 것을 `ops` 와 분리하고, 조립·독출을 **따로** 세우고, 스파이가 `Date` 를
원상복구했는지까지 본다.

## ✅ PR-E 완료 (2026-08-28, 머지 #1238)

| 파일 | 무엇이 바뀌었나 |
|---|---|
| `js/core/kasi-calendar-service.js` | `_partsFromLocalDate` · `_localDateReads` · `_computeGanjiFromDate` · 공개 `computeGanjiFromDate` · `__test.computeGanjiFromDate` 삭제. `__test.computeMonthGanjiFromTerms` 를 부품 인자로 |
| `js/saju-engine.js` | `_kasiPartsFromLocalDate` · `_kasiLocalDateReads` · `KasiEngine.getGanji` · `KasiEngine.solarToLunar` · `buildGanjiRepairCandidate` · `_calculateMonthBranchBySolarTerm` 삭제(어댑터 6벌) |
| `js/luck-sync-diary.js` | `_parseDateKeyToDate` 유효성을 `Date.UTC` 왕복으로. `_makeLocalNoonDate` 자체는 유지(표시 축) |
| `app/_lib/normalize-ziwei-input.ts` · `app/fortune/prompt-hub/{dangsaju-calc,kusei-calc,lite-prompt-tools}.ts` | 생일 유효성 4곳을 `Date.UTC` 왕복으로 (§6-2) |
| `scripts/verify-ganji-surface-parity.mjs` | Date 표면 12벌 삭제 → 부품 표면 **12벌**이 정본(`_cdHourPillarFromDayStem`·`getMonthGanZhi` 를 부품 축에 추가해 열 수를 맞췄다). ②③ 재편 · ④ 축소 · **⑭ 신설** · 검사 51→57건 |
| `scripts/verify-shell-korean-calendar.mjs` | ③④⑥-b⑪⑫ 를 부품으로. ⑫ 의 `DST-GAP` 제외 갈래 삭제(제외 없이 전건) |
| `scripts/verify-solar-term-frame-kasi.mjs` | ⑦ 을 부품으로 + **fail-open 을 fail-closed 로**(아래 참조). 검사 41→42건 |
| `scripts/test-saju-solar-term-regression.mjs` | `computeMonthGanjiFromTerms` 호출 7곳을 부품으로(`kstParts(iso)` 헬퍼 신설) |
| 픽스처 2개 · `README-ganji-surface.md` · `pr-ci.yml` | `--emit` 재생성 + 문구를 "달성"으로 |

### ✅ 픽스처 교체는 무손실이다 — 18,048셀 실측

`ganji-surface-kst.json` 의 `rows`/`nullMap` 이 **Date 축 12벌 → 부품 축 12벌**로 통째로 바뀌었다.
그 교체가 값을 안 움직였다는 증거는 옛 픽스처(`git show 83f0cfe54:scripts/fixtures/ganji-surface-kst.json`)와
새 픽스처를 **표면 이름으로 짝지어** 대조한 결과다:

```
행 1516 · 옛 축이 버린 DST-GAP 행 12 · 대조 행 1504 · 대조 셀 18048
값 불일치 0건 · isNull 불일치 0건
옛 축이 버린 12행 중 새 축이 값을 낸 행 12
```

짝은 `getGanji↔getGanjiFromParts` · `solarToLunar↔solarToLunarFromParts` ·
`computeGanjiFromDate:*↔computeGanjiFromParts:*` · `buildGanjiRepairCandidate↔…FromParts` ·
`_calculateMonthBranchBySolarTerm↔…FromParts` + 이름이 같은 4벌이다.
🔴 재현하려면 옛 픽스처를 꺼내 같은 짝짓기로 다시 돌려야 한다 — 일회성 스크립트라 레포에 안 남겼다.

### 🔴 새로 알게 된 것

1. **R7(캐시 7일 공존)은 이 축에 해당이 없다 — 실측.** 간지 경로 js 는 `index.html` 이 직접 참조하지
   않고 `js/core/index-inline-runtime.js:2193` 의 체인이 **전부 같은 `?v=build-<hash>` 토큰**으로 부른다
   (`saju-engine.js` · `saju-engine-tarot-sukuyo-quantum.js` · `luck-sync-diary.js:2509` 등).
   `sync:public` 이 그 토큰을 빌드마다 돌리므로 **옛 파일과 새 파일이 섞일 캐시 키 조합이 없다.**
   `public/_headers:310` 의 `max-age=604800` 은 그 토큰이 같은 동안에만 유효하다.
   → 그래서 어댑터를 유예 없이 지웠다. 다음에 셸 모듈 간 API 를 지울 때도 같은 근거를 쓸 수 있다.
2. 🔴 **`verify:solar-term-frame-kasi` ⑦ 은 fail-open 이었다** — `if (shellTest && typeof
   shellTest.computeGanjiFromDate === "function")` 하나로 블록 전체를 감싸고 있어서, 그 이름이
   사라지면 **검사 3건이 통째로 안 돌고 초록**이었다(원칙 10 위반). 존재 단언을 블록 밖으로 꺼냈다.
   음성 테스트로 확인: `__test` 에서 그 줄을 빼면 `✗ ⑦ 셸의 부품 진입점이 __test 에 있다`.
3. 🔴 **`getGanjiFromParts` 를 로컬 Date 로 접어도 가드가 못 잡는다** — 음성 테스트에서 실측했다
   (57건 전부 초록). 이유는 그 표면이 **1990 말고 전부 null** 이라 접힘이 `null==null` 로 묻히기
   때문이다(README ①). 같은 변조를 `_computeGanjiFromParts`(서비스 정본)에 넣으면 **9건 실패**한다.
   → ✅ **PR-F 에서 닫았다**(아래 절). 🔴 여기 적었던 "소스 검사 ⑬·⑭ 가 막는다"는 **틀렸다** —
   ⑬ 은 `Date.UTC` 로 감싼 것을 안전으로 치므로 `new Date(Date.UTC(...)).getFullYear()` 를 못 보고,
   ⑭ 는 "Date 를 넘기면 null" 만 본다. 실제로 막는 것은 PR-F 의 검사 ⑮ 다.
4. **`gaps` 와 `foldedWallClocks` 는 다른 수다.** census 를 문자 그대로 0 으로 만들면 옛 ②의
   자기검사(`서머타임 존이 전부 최소 1건의 구멍`)가 뒤집혀 죽는다 — §6-6 이 예고한 그대로다.
   그래서 "그 존에 존재하지 않는 벽시계 표본 수"를 **출력 경로 밖에서** 계속 세어
   `foldedWallClocks` 로 픽스처에 넣고, **0 이 아님**을 요구한다. 숫자는 옛 `gaps` 와 정확히 같다
   (Seoul 12 · UTC 0 · New_York 21 · Apia 18 · Kiritimati 6 · Lord_Howe 18) — 즉 매트릭스는 그대로다.
5. **§6-4 의 두 줄은 PR-D 가 이미 처리했다.** `tarot:13261` 의 2번째 인자 `true` 는 PR-D 의 부품
   전환에서 사라졌고, `tarot:11626` 도 인자 1개다. 부품 갈래는 옵션을 안 주면 야자시가 켜지므로
   **현행과 값이 같다.** 남은 것은 "켜 두는 게 맞나"라는 **의미 결정**뿐이다(아래).

### ~~✅ 야자시 결정 — **현행 유지(ON)**~~ → 🔴 **뒤집혔다 (PR-3, 2026-08-28)**

🔴 **아래는 그날의 판단으로만 남긴다. 현행은 위 "PR-3" 절이다 — 음력일 축은 OFF 다.**
뒤집힌 이유는 근거의 전제가 틀렸기 때문이다: "셸 전체가 shift-day" 가 아니라 **셸은 이미
갈려 있었고**, 앱·워커는 처음부터 안 밀었다.

선택지 1번이 채택됐다. **코드 변경 0** 이다 — `syRadarResolveLunar:11629` 와
`_fallbackLunarFromSolar:697` 은 그대로 두고, `yaja` 기본값 ON 이 정본이다.
근거는 아래 표 그대로다: 셸 전체의 축(`getGanjiFromParts` · `_cdCivilDayPillar`)이 shift-day 인데
숙요만 반대로 두면 같은 화면에서 규칙이 갈린다.

🔴 **그 대신 남는 것**(별건, 이 계획 밖):

- ~~**소스 간 불일치가 그대로 남는다** — KASI API 가 살아 있으면 23시대를 안 밀고, 죽어서
  `_fallbackLunarFromSolar` 로 내려가면 민다.~~
  🔴 **이 서술은 틀렸다 — 정정 2026-08-28.** 아래 "야자시 축 정정" 절을 볼 것.
- ~~그 불일치를 지금 재는 가드는 없다.~~ ✅ **저울이 섰다** — `verify:sukuyo-korean-calendar`
  **검사 ⑥**(셸 음력일 축)이 셸 소비자 7벌을 실제로 실행해 현행 불일치를 픽스처로 고정한다.

아래는 그 결정의 근거로 남긴 실측이다(고치지 말 것).

### 🔴 야자시 축 정정 (2026-08-28) — "KASI 생사에 따라 갈린다"는 **틀렸다**

위 표의 **KASI API vs 폴백** 축은 실재하지 않는다. `js/core/kasi-calendar-service.js:193`
`_applyCoreCalendarCorrection` 이 `context.lunar` 를 **밀지 않은** `KoreanCalendar.solarToLunar(y,m,d)`
로 덮어쓰고, 그 호출은 `:1074`(캐시 히트)·`:1238`(신규 생성)에서 **무조건** 돈다. 그래서
`_fallbackLunarFromSolar`(`:698`)가 야자시로 하루를 밀어도 **즉시 되돌아간다.**
하네스 실측: 던지는 fetch(= KASI 죽은 상태)로도 `resolvePrimaryCalendarContext` 가 안 밀린 값을 내고
진단에 `korean-calendar-core-correction` 이 찍힌다.

**실재하는 불일치는 소비자마다 우선순위가 정반대**라는 것이다(실측 `1990-06-15 23:00`):

| 소비자 | 1순위 | 23시 |
|---|---|---|
| `quantum:11629` `syRadarResolveLunar` · `resolvePrimaryCalendarContext` | 서비스 컨텍스트 | **안 민다** |
| `KasiEngine.solarToLunarFromParts` · `calcZiweiPalaces`(`saju-engine.js:2979`) · `buildFallbackDateContext`(`:1424`) · `modalProfileState.js:107` · `index-inline-runtime.js:4162` | 직접 호출 | **민다** |
| 앱 `app/_lib/ziwei-engine.ts:110` · 워커 `worker/lib/ziwei-ai-chart.js:147` · `lib/sukuyo-calendar.ts` | 3인자 호출 | 야자시 개념 없음 = **안 민다** |

⇒ 같은 사용자가 **어느 렌더러로 들어왔느냐**에 따라 본명숙과 자미 명반이 갈린다. 그리고 셸의
"미는 갈래"는 **앱·워커와도 갈려 있다**(실측: 23:30 셸 음력 5/24 vs 워커 5/23).

🔴 이 구멍은 그동안 어느 가드에도 안 잡혔다 — 자미 가드 4벌의 표본 시각이 9·14:10·8:30·11:45·
12:00·0:20 뿐이라 **23시대가 한 건도 없고**, `verify-sukuyo-korean-calendar` 의 `CONSUMERS` 10벌은
전부 `lib/`·`worker/`·`app/` 이라 셸은 실행 대상이 아니었다.

✅ **검사 ⑥ 이 그 저울이다**(2026-08-28). 셸 소비자 7벌을 브라우저와 같은 로드 체인에서 실제로
돌리고(자식 프로세스 `scripts/lib/sukuyo-shell-probe.cjs`), 현행을
`scripts/fixtures/sukuyo-shell-axis.json` 에 박는다 — **대조군 갈래 1 · 23시대 갈래 2** 가 계약이다.
통일하는 PR 이 그 숫자를 1 로 바꾸고, 그 diff 가 곧 변화량이다.
상세: [scripts/fixtures/README-sukuyo-shell-axis.md](../../scripts/fixtures/README-sukuyo-shell-axis.md)

### 🔴 (결정 완료) §6-4 야자시 의미 결정 — 근거 실측

**어디가 걸리나.** `js/saju-engine-tarot-sukuyo-quantum.js` 의 `syRadarResolveLunar`(인연 레이더).
🔴 **호출 2곳 중 내 쪽은 `'12:00'` 하드코딩이라 안 걸린다**(`:12386`). 23시가 들어올 수 있는 것은
**상대방 경로 하나**다(`:12394`, `partnerTime`). 같은 결정에 `js/core/kasi-calendar-service.js`
`_fallbackLunarFromSolar`(`:697`)도 걸린다 — KASI 가 죽는 동안에만 돈다.

**지금 무엇이 벌어지나.** 셸의 세 음력 소스가 23시대에 **서로 다른 답**을 낸다:

🔴 **아래 표는 낡았다 (2026-08-28 정정)** — KASI 생사 축은 `_applyCoreCalendarCorrection` 이
지우고 있다. 위 "야자시 축 정정" 절의 표가 현행이다. 이 표는 그날의 서술로만 남긴다.

| 소스 | 23시 처리 |
|---|---|
| `KasiEngine.solarToLunarFromParts`(옵션 없음) | **하루 민다**(야자시 ON — 현행 기본값) |
| KASI API `_fetchLunarFromSolar` | 안 민다 |
| `KoreanCalendar.solarToLunar`(서비스 내부 2차 폴백 `:709`) | 안 민다 |

**실측 (2026-08-28, `TZ=Asia/Seoul`).** 1950~2030 × 6일 × 23:00/23:29/23:30/23:59 = **1,944 표본**:

```
야자시를 끄면 본명숙이 옆 칸으로 옮겨가는 표본: 1,924건 (99.0%)
  1950-01-09 23:00 · 음력 ON 1949-11-22 → OFF 1949-11-21 · 본명숙 익(翼)숙 → 장(張)숙
  1950-03-21 23:00 · 음력 ON 1950-2-4  → OFF 1950-2-3  · 본명숙 묘(昴)숙 → 위(胃)숙
대조군(00·12·22시) 729건 · 옮겨간 표본 0건   ← 23시대 밖은 이 결정에 안 걸린다
```

**선택지**(추천 순):

1. **`추천` 현행 유지(야자시 ON).** 값 변화 0. 명리 관례상 23시 이후는 다음 날 자시로 보는 것이
   셸 전체의 축(`getGanjiFromParts`·`_cdCivilDayPillar` 모두 shift-day)이라 숙요만 반대로 두면
   같은 화면에서 규칙이 갈린다. 대신 위 표의 **소스 간 불일치는 남는다**(KASI 가 살아 있으면 안 밀고,
   죽으면 민다) — 그것을 닫으려면 KASI 응답에도 같은 밀기를 얹어야 하고, 그건 별건이다.
2. **숙요만 야자시 OFF.** 27수는 원래 태음일(lunar day) 기반이라 명리 자시 경계와 무관하다는 해석.
   고르면 **23시대 사용자의 본명숙이 99% 바뀐다** — 회귀가 아니라 정정이지만 사용자에게 보이는 변화다.

~~✅ **1번이 채택됐다**(위 절).~~ 🔴 **2026-08-28 PR-3 에서 사실상 2번으로 뒤집혔다** — 다만
호출부마다 `{ yaja: false }` 를 다는 방식이 아니라 `solarToLunarFromParts` 의 **기본값**을
OFF 로 뒤집었다(호출부 방식은 새 호출부가 생기면 조용히 ON 으로 되돌아가 fail-open 이다 —
실측상 옵션을 주는 호출부가 0건이라 기본값 뒤집기가 무손실이었다). 위 "PR-3" 절을 볼 것.

### PR-E 음성 테스트 7종 (전부 fail-closed → 복구 후 초록)

| 변조 | 잡은 검사 |
|---|---|
| `KasiEngine.getGanji` 어댑터 되살리기 | `✗ ⑭ Date 를 받던 진입점 6벌이 전부 사라졌다` |
| census `foldedWallClocks['Pacific/Apia']` → 0 | `✗ ② 접힌 벽시계 수가 census 와 같다` + `✗ ② 서머타임 존이 전부 최소 1건` |
| census `gaps['America/New_York']` → 21 | `✗ ② 버린 표본 수가 census 와 같다` + `✗ ② 구멍 총계가 0 이다` |
| `_computeGanjiFromParts` 를 로컬 Date 로 접기 | **9건** — ① + ③ 6개 존(그중 `접힌 벽시계 N건도 KST 와 같다` 4건) |
| `solarToLunarFromParts` → 항상 null | `✗ ⑭ 같은 표면이 부품에는 답한다` + ⓪① |
| `__test.computeGanjiFromParts` 제거 | `✗ ⑦ 셸의 부품 진입점이 __test 에 있다` (이번에 fail-closed 로 고친 자리) |
| `getGanjiFromParts` 를 로컬 Date 로 접기 | 🔴 **아무것도 안 잡힌다**(위 "새로 알게 된 것" 3번) |

### 검증 (전부 이 브랜치에서 실행한 출력)

```
verify:ganji-surface-parity   통과 — 검사 57건 · 표본 1516건 · TZ 6종 · 버린 표본 0
verify:shell-korean-calendar  OK  — 검사 55건
verify:solar-term-frame-kasi  통과 — 검사 42건 · 지상값 provider 29개
test-saju-solar-term-regression PASS
verify:ziwei-star-parity      통과 — 검사 21건 · 대조 인물 29명
verify:hour-pillar-parity     모든 케이스 통과 — 세 엔진의 시주가 일치한다
verify:lunar-conversion-core  통과 — 검사 40건
verify:sukuyo-korean-calendar 통과 — 검사 31건
verify:daeun-korean-calendar  OK  — 검사 16건 · 관례 재현 잔차 0
verify:payment-freeze         통과 · verify:guard-wiring OK (262개 중 166 배선)
jest 177 스위트 2007개 · test:node 555개 · typecheck 0 · lint 오류 0
```

---

## ✅ PR-D 완료 · **머지됨 (#1234, 2026-08-28)**

간지 경로에서 **로컬 `Date` 를 캐리어로 쓰는 조립이 0건**이 됐다. 착수점은 §6 이다.

| 파일 | 무엇이 바뀌었나 |
|---|---|
| `js/saju-engine.js` | 조립 13곳 전부 부품으로. `buildGanjiRepairCandidateFromParts` · `_calculateMonthBranchBySolarTermFromParts` · `_resolveMonthCommandBirthParts` 신설(옛 이름은 어댑터로 유지) · `_kasiPartsOf` 신설 · `KasiEngine.partsOf` 공개 |
| `js/saju-engine-tarot-sukuyo-quantum.js` | 조립 5곳(§2 의 4곳 + **문서가 놓친 `qDailyFlow`**) 부품으로. 야자시 `setDate(+1)` → `_kasiShiftPartsByDays` |
| `js/core/index-inline-runtime.js` · `js/core/saju/modalProfileState.js` · `js/inline/saju-core-bootstrap.js` | 각 1곳. `KasiEngine.partsOf` + `…FromParts` |
| `js/luck-sync-diary.js` | **간지 축만** 부품으로(`_readGanzhiFromEngineParts` · `getGanZhiByParts` · `_addDaysToParts` 신설, 월 간지맵·궁합 7일 루프·원국). 달력 표시 축은 PR-E |
| `scripts/verify-ganji-surface-parity.mjs` | 검사 ⑤ 신설 — **부품 축 10벌을 구멍 제외 없이 6개 존 전건 대조**. 51건 · 6.1초 |
| `scripts/verify-shell-korean-calendar.mjs` | 검사 ⑬ 신설 — 간지 경로 7개 파일에 `Date.UTC` 로 안 감싸인 다인자 `new Date(` 0건. 55건 |

### 🔴 §5 의 졸업 조건은 **자기모순이었다** — 그래서 다르게 잰다

```
✅ TZ=Asia/Seoul 산출물 == ganji-surface-kst.json (전건, 무수정)
✅ 🔴 DST-GAP 총계 == 0
```

**이 둘은 동시에 성립할 수 없다.** 픽스처 `rows` 안에 값이 `DST-GAP` 인 행이 **12개 들어 있기**
때문이다(Seoul 1960-05-01 ×3 · 1961-08-10 ×3 · 1987-05-10 ×3 · 1988-05-08 ×3). 구멍이 0 이 되면
그 12행이 값으로 바뀌므로 픽스처가 반드시 바뀐다. §5 는 PR-B 가 "정본 축에도 구멍 12건" 을
발견하기 **전에** 쓰였고, 그래서 "census 만 바뀐다"고 적혀 있다.

게다가 그 구멍은 **셸이 만드는 것이 아니라 가드가 만든다** — `probeSample` 이 Date 표면에 넘기려고
직접 `new Date(...)` 를 조립하고, 그게 접히면 그 표본을 버린다. 즉 호출부를 아무리 고쳐도
그 숫자는 안 움직인다(실측: 변환 전후 census 완전 동일).

**그래서 졸업 조건을 픽스처를 건드리지 않는 형태로 옮겼다** — 검사 ⑤:

```
✅ 부품 축 10벌 × 표본 1516건 × TZ 6종, **구멍 제외 없이** 전건 KST 와 일치
✅ 옛 축이 버리던 KST 구멍 12건도 부품 축에서는 값이 나온다
✅ 부품 산출물이 전부 비어 있지 않다 (빈 값끼리 대조하는 것을 막는다)
```

의미는 §5 가 원하던 것과 같다("간지 경로가 브라우저 타임존과 무관해졌다"). 다른 점은 **골든 파일을
다시 뽑지 않고** 존 간 동일성으로 재는 것이라, PR-B 가 세운 before-image 가 그대로 살아 있다는 것이다.

✅ **사용자 결정 (2026-08-28) — 문자 그대로 0 은 PR-E 에서 한 번에 한다.**
문자 그대로 `ganji-dst-gap-census.json` 을 0 으로 만들려면 가드가 붙들고 있는 **Date 표면 12벌
(`SURFACES`)을 걷어내고 `--emit` 으로 픽스처를 다시 뽑아야** 한다. 그건 before-image 를 버리는
일이고, 그 12벌은 `computeGanjiFromDate`·`getGanji(Date)`·`solarToLunar(Date)` 어댑터를 부르므로
**PR-E 가 진입점을 지우면 어차피 존립할 수 없다.** 그래서 따로 뽑지 않고 PR-E 에서 한 번에
정리한다 — 절차와 **같은 커밋에서 갈아야 할 가드 3곳**은 §6-6 에 적어 뒀다.

### 🔴 문서가 놓쳤던 조립 사이트 3곳 (전부 이번에 변환했다)

| 위치 | 무엇 |
|---|---|
| `js/saju-engine.js` `_resolveMonthCommandBirthDate` 의 **첫 갈래** | §2 는 `:26011`(두 번째 갈래)만 적었다. 두 갈래 모두 월지 판정에 들어간다 |
| `js/saju-engine-tarot-sukuyo-quantum.js` `qDailyFlow` | "오늘부터 7일" 일운. 매 칸을 `new Date(y, m, d+i, 12, 0, 0)` 로 재조립해서, 하루가 통째로 없는 존(Apia 2011-12-30)에서 그 칸의 일진이 밀렸다 |
| `js/luck-sync-diary.js` 궁합 7일 루프 | 같은 모양(`d+i`, 9시) |

### 🔴 새로 알게 된 것

1. **`KasiEngine.partsOf` 를 공개했다** — `js/core/**`·`js/inline/**`·`js/luck-sync-diary.js` 는 이미
   `window.KasiEngine` 존재를 확인하고 들어오므로, 전역 함수 이름(`_kasiPartsOf`)에 새로 의존하지 않고
   같은 가드 안에서 정규화를 쓸 수 있다. 🔴 인자 규약이 `new Date` 와 달리 **월이 1-based** 다.
2. **`_makeLocalNoonDate` 는 안 지웠다** — `_parseDateKeyToDate` 가 그것을 쓰고, 그 반환 Date 를
   5곳이 `getTime()`·`getDay()`·`getDate()` 로 쓰거나 `_classifyDayFromSaju` 에 넘긴다. 그 축은
   간지가 아니라 **달력 표시**라 §2 가 이미 PR-E 로 분류해 둔 자리다(`js/luck-sync-diary.js:272`).
   검사 ⑬ 의 `ALLOWED` 표가 그 9곳을 사유와 함께 등재하고 **도달 검사**로 지킨다.
3. **월 인덱스 off-by-one 은 §5 가 예고한 4건 + 2건이었다** — `saju-engine:24229`(`,1,4,` → 월 **2**) ·
   `:28893`·`:29018`(`,5,15,` → 월 **6**) · `tarot:13261`(`monthIndex` → **+1**) 에 더해
   `tarot:qDailyFlow`(`getMonth()` → **+1**) · `luck-sync:_getGanzhiMonthMap`(`monthIndex` → **+1**).

### PR-D 음성 테스트 5종 (전부 fail-closed → 복구 후 초록)

부품 진입점을 다시 로컬 Date 로 되돌리기(→ **Apia·Kiritimati 가 KST 와 갈린다**) · 부품 표면을 전부
빈 값으로 만들기 / 간지 경로에 다인자 `new Date(` 되살리기 · 허용 목록의 코드 없애기(도달 검사) ·
스캐너 죽이기.
🔴 첫 번째가 이 PR 의 증거다 — 그 변조는 옛 축(①②③)으로는 **안 잡힌다**(구멍 표본을 빼고 재니까).

---

## ✅ PR-C 완료 (2026-08-28)

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
2. `public/_headers` 가 `/js/*.js` 를 max-age 7일·SWR 30일로 잡아 **옛 셸과 새 셸이 최대 7일 공존**한다.
   앞뒤 양방향 호환이 필요하다.
   🔴 **이 판단은 PR-B 설계 시점의 것이고 뒤에 뒤집혔다** — 아래 "새로 알게 된 것 1"(PR-E)과
   PR-4′ 의 재실측이 "간지 경로에는 그 창이 없다"를 값으로 확인했다. 신중한 쪽으로 틀린
   것이라 PR-B 의 어댑터 결정 자체는 손해가 아니었다.
3. 어댑터 호출 건수를 계측할 수 있어 PR-E 의 삭제가 주장이 아니라 측정이 된다.

### 🔴 `solarToLunar` 는 인자 1개로 고정한다
두 호출부가 2번째 인자로 `true` 를 넘기는데(`tarot:11626`, `:13261`) **오늘은 무시된다.**
여기에 `options` 를 붙이면 `true` 가 갑자기 의미를 갖고 `options.yaja` 가 `undefined` 로 읽혀 야자시가
꺼진다 → 23시대 음력일이 하루 당겨지고 **자미 14주성이 통째로 이동**한다.
옵션은 새 이름 `solarToLunarFromParts(parts, options)` 에만 붙인다.

---

## 5. ✅ PR-D — 조립 22곳 전환 · DST 구멍 0 (완료 — 졸업 조건은 문서 맨 위대로 바뀌었다)

§2 의 표대로 전부 "부품을 만들어 부품 API 에 넘긴다". 중간에 `Date` 를 만들지 않는다.

### 🔴 가장 위험한 것 — 월 인덱스 off-by-one 4건
`new Date(y, 5, 15)` → `{month: 5}` (정답은 **6**). 대상:
`saju-engine.js:24229`(`,1,4,` → 월 2) · `:28893` · `:29018` · `tarot:13261`(`monthIndex` → `+1`).
`Date` 의 월은 0-based, 부품은 1-based다. 기계적으로 옮기면 **월건이 통째로 한 칸 밀린다.**
리뷰에서 개별로 짚고, KST 픽스처가 바로 잡는다.

또 하나: `js/luck-sync-diary.js:265` `_makeLocalNoonDate` 는 **`monthIndex`(0-based)를 받는다.**
`_makeNoonParts(year, month, day)` 로 바꾸면 **인자 규약이 바뀌므로** 호출 3곳을 함께 고쳐야 한다.

### 졸업 조건 (🔴 두 번째 줄은 **PR-E 로 이관**했다 — 문서 맨 위와 §6-6)
```
✅ TZ=Asia/Seoul 산출물 == ganji-surface-kst.json (전건, 무수정)
➡️ 🔴 DST-GAP 총계 == 0            ← ①과 동시 성립 불가. PR-E(§6-6)로 이관
✅ 6개 TZ 전부 == KST (예외 0건)
✅ getGanji 의 isNull 지도가 픽스처와 동일
✅ (대체) 검사 ⑤ — 부품 축 10벌이 6개 존에서 **구멍 제외 없이** 전건 KST 와 같다
```
🔴 위 두 번째 줄 탓에 여기 적혀 있던 *"census 를 0 으로 바꾸는 것이 이 PR 의 의도된 유일한 픽스처
변경"* 은 **틀렸다.** PR-D 는 픽스처를 **한 바이트도 안 바꿨고**, census 0 은 §6-6 이 맡는다.

### ✅ 신설 검사 ⑬ (`verify:shell-korean-calendar`)
간지 경로 파일에 `Date.UTC` 로 감싸이지 않은 다인자 `new Date(` 0건.
대상 파일 목록·허용 목록 **둘 다 고정 리터럴**. 🔴 **도달 검사**: 허용 목록의 각 원소가 실제 스캔
결과와 매치돼야 한다(스캐너 사망 탐지).
🔴 **스캐너는 주석·문자열을 걷어내고 센다** — 안 그러면 이 검사가 자기를 설명하는 주석에 걸린다
(실제로 걸렸다: `_partsOf` 의 "`new Date(y, m - 1, d, ...)` 와 같아야 한다" 설명이 첫 오탐이었다).

### `public/` · 캐시키
`js/**` 를 건드리므로 캐시키가 회전한다 — `index.html` `?v=` 87곳 + 미러 = **#1217 과 같은 25파일** 규모.
`npm run sync:public` **만** 돌리고 `public/` 을 손으로 고치지 않는다.
✅ `verify:payment-choice-parity` 의 핀 25곳 회전은 **필요 없다**(`PIN_GROUPS` 는 `js/destiny-profile.js` 와
`js/core/{checkout-entry,pass-verdict}.js` 뿐). 🔴 혹시라도 `js/destiny-profile.js` 에 손이 가면 **즉시 멈추고**
비용(방문자 전원 gzip 171KB 재다운로드)부터 보고한다.

---

## 6. ✅ PR-E — Date 진입점 제거 · 유효성 (완료) · 야자시 결정도 끝났다

착수 전에 적어 둔 명세다. **실제로 어떻게 됐는지는 문서 맨 위 PR-E 절**에 있고, 아래는 그
명세에 결과를 표시해 둔 것이다.

1. ✅ `computeGanjiFromDate` · `_partsFromLocalDate` · `getGanji(Date)` 어댑터 삭제.
   🔴 실제로는 **6벌**이었다 — 위 셋에 더해 `KasiEngine.solarToLunar` · `buildGanjiRepairCandidate` ·
   `_calculateMonthBranchBySolarTerm` 도 `_kasiPartsFromLocalDate` 를 타고 있었다.
   삭제 근거: `git grep` 축(미러 제외)에서 **프로덕션 호출부 0건** — 남은 호출부는 가드 4개뿐이라
   같은 커밋에서 부품으로 옮겼다(`verify-ganji-surface-parity` · `verify-shell-korean-calendar` ③④⑥-b⑪⑫ ·
   `verify-solar-term-frame-kasi` ⑦ · `test-saju-solar-term-regression`).
   🔴 계측 전역 `__CD_GANJI_LOCAL_DATE_READS__` 는 **함께 지웠다** — 어댑터가 사라지면 쓰는 쪽이
   없어 계측만 남은 데드코드가 된다. 그 자리를 검사 ⑭ 가 "전역이 아예 없다"로 대신 지킨다.
2. ✅ 유효성 5곳을 `Date.UTC` 왕복으로. 2월 30일은 여전히 거르고 DST 구멍은 안 거른다.
   `app/_lib/normalize-ziwei-input.ts` · `app/fortune/prompt-hub/{dangsaju-calc,kusei-calc,lite-prompt-tools}.ts` ·
   `js/luck-sync-diary.js` `_parseDateKeyToDate`. 🔴 마지막 것은 **유효성만** 옮겼다 —
   `_makeLocalNoonDate` 가 돌려주는 Date 를 5곳이 `getTime()`·`getDay()` 로 쓰는 **표시 축**이라
   그 캐리어는 그대로 두고, 검사 ⑬ 의 `ALLOWED` 에 사유와 함께 등재된 상태를 유지한다.
3. ~~`_toIsoLocal` 삭제~~ ✅ **PR-C 에서 끝났다**(`_partsToIsoLocal`).
4. ✅ **야자시 의미 결정 — 현행 유지(ON). 사용자 결정 2026-08-28. 코드 변경 0.**
   - `tarot:13261` 의 `true` 는 ✅ PR-D 의 부품 전환에서 이미 사라졌다(값 변화 0).
   - `tarot:11626`(=현행 `:11629`) 과 `kasi-calendar-service.js` `_fallbackLunarFromSolar` 가
     결정 지점이었고, **둘 다 그대로 둔다**. 근거·실측은 **문서 위 "야자시 결정"** 절에 있다.
   - 🔴 남는 것: KASI 가 살아 있으면 안 밀고 죽으면 미는 **소스 간 불일치**. 별건이다.
5. ✅ 신설 검사 ⑭: `KasiCalendarService`·`KasiEngine` 공개 표면에 Date 를 받는 함수 0개.
   네 갈래로 잰다 — ① 지운 이름 6벌이 실제로 없다 ② 살아남은 부품 표면에 `new Date(...)` 를
   넘기면 전부 값을 안 낸다(`fn.length` 가 아니라 **실행**으로) ③ 🔴 그런데 같은 표면이 **부품에는**
   답한다(전부 죽어서 ②가 통과하는 것을 막는다) ④ 계측 전역이 남아 있지 않다.
6. ✅ **`ganji-dst-gap-census.json` 을 문자 그대로 0 으로.** `SURFACES`(Date 축 12벌)와
   `probeSample` 의 gap 갈래를 걷어내고 부품 축을 `rows`/`nullMap` 의 정본으로 올린 뒤 `--emit`
   으로 두 픽스처를 같이 다시 뽑았다. census 는 값이 아니라 **구조적으로** 0 이다.
   - 🔴 예고대로 가드 3곳을 같은 커밋에서 갈았다:
     - 검사 ② `서머타임 존이 전부 최소 1건의 구멍` → **`… 최소 1건의 접힌 벽시계`** 로.
       구멍(=버린 표본)과 접힌 벽시계(=그 존에 없는 시각)를 분리해 census 에 `foldedWallClocks`
       필드를 추가했다. 숫자는 옛 `gaps` 와 정확히 같다 — 즉 매트릭스는 그대로다.
     - 검사 ⑤ `KST 구멍 표본도 부품 축에서는 값이 나온다` → ③ 안으로 흡수.
       `TZ=<존> 의 접힌 벽시계 N건도 KST 와 같다` 가 그 자리를 대신한다(집합이 비면 실패한다).
     - 검사 ③ 의 하한 `floor = SAMPLES - gaps` → **`제외 없이 표본 전부`** 로. 의도한 강화다.
   - ✅ **before-image 계약은 무손실로 넘겼다.** 옛 픽스처와 새 픽스처를 표면 이름으로 짝지어
     1,504행 × 12벌 = **18,048셀** 대조 — 값 0건·`isNull` 0건 불일치(문서 맨 위 참조).
   - ✅ 문구는 전부 "달성"으로 돌렸다: `README-ganji-surface.md` · census `note` · 가드 머리주석 ·
     보고 줄 · `.github/workflows/pr-ci.yml`.

---

## 7. 🔴 위험 목록

| # | 위험 | 왜 조용한가 | 잡는 방법 |
|---|---|---|---|
| R1 | **`getGanji` 가 답하기 시작한다** — 호출부 **11곳**(13 아니다, PR-5 실측)이 한꺼번에 갈아탄다 | null→값 은 어떤 값 대조도 못 잡는다 | 픽스처의 `isNull` 별도 필드 전건 대조. 🔴 **PR-5 가 그 폭을 쟀다** — 표본 1,645건 중 1,515건이 null→값, 그중 코어와 갈리는 것 19건(전부 23시대 야자시 축)이고, 자미 유년 세차는 **71해 중 40해**가 밀린다. 위 "PR-5" 절 |
| R2 | **월 인덱스 off-by-one** 4건 | 세운·유년 표시라 눈에 안 띈다. 월건 한 칸 = 십신 전부 이동 | KST 픽스처가 바로 잡는다 + 리뷰 체크리스트 |
| R3 | **`solarToLunar` 에 옵션을 붙이면 `true` 둘이 의미를 갖는다** | 야자시 OFF → 자미 14주성 이동 | 인자 1개 고정. 옵션은 새 이름에만 |
| R4 | ✅ **닫혔다(PR-C)** — `atLocal` 은 `_partsOf`+`_partsToIsoLocal` 로만 만들어져 Date 왕복이 없다. 🔴 **그런데 같은 자리에 더 큰 것이 있었다** — 셸이 KASI 의 시각 필드 `kst` 를 아예 안 읽어 절입 시각을 전건 자정으로 뭉갰다 | 403 이 풀리기 전에는 실응답 모양을 만나 볼 수 없었다 | ✅ **PR-2 가 수정 + 검사 ⑪**(`verify:solar-term-frame-kasi`). 위 "PR-2" 절 |
| R5 | ✅ **닫혔다(PR-E)** — 가드가 `buildGanjiRepairCandidate`·`_calculateMonthBranchBySolarTerm` 를 전역 이름으로 꺼내 썼다 | 가드는 초록인데 재는 대상이 바뀐다 | PR-D 가 옛 이름 어댑터를 유지했고, PR-E 가 가드와 소스를 같은 커밋에서 `…FromParts` 로 옮겼다 |
| R6 | ✅ **닫혔다(PR-4′)** — localStorage 캐시 TTL 180일이 옛 값을 되살린다 | 캐시 보유자는 옛 값을 계속 본다 | 🔴 **PR-2 에서 실제로 걸렸다** — 보유자는 옛(자정) 절입 시각으로 만든 월건을 최대 180일 계속 봤다. **PR-4′ 가 `_CONTEXT_LOGIC_VERSION` 게이트로 닫았다**: 기준은 스키마가 아니라 **계산 로직 세대**이고, `_readStorage` 가 세대 불일치 엔트리를 폐기한다. 접두사 회전은 옛 키가 영구 잔류해서 안 썼다. 🔴 음력일 축(PR-3)은 `_applyCoreCalendarCorrection` 이 캐시 히트마다 덮으므로 **처음부터 자동 치유**였다 |
| R7 | ✅ **이 축에는 해당 없음 — 실측(PR-E)** | — | 간지 경로 js 는 `index-inline-runtime.js:2193` 체인이 **전부 같은 `?v=build-<hash>`** 로 부르고 `sync:public` 이 빌드마다 그 토큰을 돌린다. 옛 파일과 새 파일이 섞일 캐시 키 조합이 없다 → 어댑터를 유예 없이 지웠다. `sync:public` 을 같은 커밋에 담는 것은 그대로 필수 |
| R8 | **CI 는 UTC, 개발은 KST** | 둘 다 초록인데 서로 다른 것을 잰다 | `pinTimezone()` + 6종 매트릭스 + 오프셋 자기검사 |
| R9 | **`_partsOf` 를 지금보다 엄격하게 만들면** 접혀서 계산되던 입력이 null 이 된다 | "고침"이지만 무손실 계약 위반 | PR-C 는 현행과 같은 정규화. 🔴 **PR-E 도 엄격화를 안 했다** — 유효성 5곳만 UTC 왕복으로 옮겼고 `_partsOf` 의 정규화는 그대로다. 엄격화가 필요하면 별건으로 실측과 함께 |
| R10 | **`js/destiny-profile.js` 에 손이 닿으면** 핀 25곳 + `payment-freeze` 회전 필요, `verify:payment-choice-parity` 는 **CI 에서만** 터진다 | 로컬 전부 초록인데 CI 만 빨갛다 | 전 PR 이 그 파일을 안 건드리는 것이 계약 |
| R11 | **`verify:ganji-surface-parity` 가 fast 잡 예산을 넘긴다** | 가드가 있는데 안 돈다 | 표본 수를 재고 예산 안에. 쪼개도 **둘 다 fast 잡**에 |
| R12 | **픽스처가 "지금 값"이라 결함(R1 의 null 지도)을 정본으로 고정한다** | 회귀 가드가 결함을 지킨다 | **의도적이다** — "회귀 없음이 최우선"이 사용자 요구. README 에 "정답이 아니라 현행"을 명시하고 별건으로 넘긴다 |

---

## 8. 같이 봐야 할 것

- [docs/handoff/korean-calendar-migration-2026-08-27.md](korean-calendar-migration-2026-08-27.md) — 마이그레이션 본체. 이 축의 출처는 §PR-D2 의 "신규 발견"
- [docs/handoff/solar-term-frame-kasi-verification.md](solar-term-frame-kasi-verification.md) — 같은 계획의 다른 축(절기 프레임 KASI 대조, PR #1225 로 tier-1 완료)
- `scripts/verify-solar-term-frame-kasi.mjs` — **TZ 핀 · 소스 전수 발견 · 동결 지문 · pending 마커**의 정본 구현. PR-B 의 하네스·픽스처가 그대로 따라 하면 된다
- CLAUDE.md 원칙 8(부정 단언 금지) · 10(가드는 fail-closed) · 12(인수인계)
