# `sukuyo-shell-axis.json`

`scripts/verify-sukuyo-korean-calendar.mjs` 의 **검사 ⑥**(셸 음력일 축)이 쓰는 픽스처다.
손으로 고치지 말 것 — 갱신은 `node scripts/verify-sukuyo-korean-calendar.mjs --emit` 이 한다.

## 계약 — 시각과 무관하게 **갈래 1**

셸(`js/`)의 음력일 소비자 7벌을 브라우저와 같은 로드 체인에서 실제로 돌린 결과다.
계약은 두 가지다: **소비자끼리 같은 값을 낸다**(`groupCounts` 전 행 1), 그리고 **그 값이
한국 음양력 코어와 같다**(검사 ⑥-a, 대조군과 23시대 둘 다).

### ① 23시대(야자시) — PR-1 때는 갈래 **2**, PR-3 이후 **1**

```
PR-1 (세울 때)   대조군 33행 갈래 1 · 23시대 44행 갈래 2
PR-3 (지금)      전 77행 갈래 1
```

PR-1 때의 `1950-03-19 23:00` — 같은 사람의 본명숙이 화면마다 갈렸다:

```
KasiEngine.solarToLunarFromParts        루(婁)   ← 밀었다 (야자시 ON 기본값)
calcZiweiPalaces:calcMeta               루(婁)   ← 밀었다
buildFallbackDateContext                루(婁)   ← 밀었다
modalProfileState._resolveSukuyoLunarObj 루(婁)  ← 밀었다
indexInlineRuntime._dfExtractSukuyoLiveData 루(婁) ← 밀었다
quantum.syRadarResolveLunar             규(奎)   ← 안 밀었다 (서비스 컨텍스트 우선)
resolvePrimaryCalendarContext           규(奎)   ← 안 밀었다
```

PR-3 이 `js/saju-engine.js` 의 `solarToLunarFromParts` 기본값을 **OFF** 로 뒤집어 전원을
`규(奎)` 로 모았다. 방향은 "OFF 를 ON 으로"가 아니라 **이미 안 밀던 쪽에 미는 쪽을 맞춘 것**이다:

- **앱·워커는 처음부터 안 밀었다** — `app/_lib/ziwei-engine.ts:110` ·
  `worker/lib/ziwei-ai-chart.js:147` · `lib/sukuyo-calendar.ts` 는 전부 3인자
  `solarToLunar(y, m, d)` 라 야자시 개념이 없다.
- 음력일은 삭망(달의 위상)이 정하는 천문 날짜라 명리학의 자시 경계와 무관하다.

**서비스 갈래는 왜 원래부터 안 밀었나** — `js/core/kasi-calendar-service.js:193` 의
`_applyCoreCalendarCorrection` 이 `context.lunar` 를 **밀지 않은**
`KoreanCalendar.solarToLunar(y, m, d)` 로 덮어쓰고, 그 호출은 `:1074`(캐시 히트)·`:1238`(신규
생성)에서 **무조건** 돈다.

🔴 **그래서 ⑥-e 의 의미가 PR-3 에서 뒤집혔다.** PR-1 때는 진단 태그
`korean-calendar-core-correction` 이 **찍히는지**를 봤다(보정이 밀린 값을 되돌린 증거).
지금은 폴백이 애초에 코어와 같은 값을 내므로 그 보정이 **no-op** 이고 태그가 안 찍힌다 —
⑥-e 는 이제 **안 찍히는지**를 본다. 음력 축 야자시가 되살아나면 보정이 다시 돌아 태그가
찍히고 그 자리가 빨강이 된다. "네트워크가 없어서 통과"는 별도 태그
`lunar conversion fallback` 이 실제로 찍혔는지로 계속 막는다.

### ② 이 저울이 못 보는 자리 — 정적 도달 3곳

`solarToLunarFromParts` 호출부는 `js/**` 에 **10곳**이고 그중 3곳은 렌더러·핸들러 안이라
하네스에서 실행이 안 닿는다:

| 호출부 | 왜 못 도나 |
|---|---|
| `js/saju-engine-tarot-sukuyo-quantum.js#renderSukuyo` | Lunar Nexus 렌더러 — `window._ziweiBirth` + DOM 의존 |
| `js/saju-engine-tarot-sukuyo-quantum.js#syOpenAiChat` | 숙요 3 폼 submit 핸들러 안 |
| `js/saju-engine.js#_resetDashboardBeforeCalc` | 히어로 카드 innerHTML 조립 안 |

그래서 이 셋은 **값이 아니라 발견으로** 지킨다 — 검사 ⑥ 의 전수 발견이 셋 다 분류에 있는지
보고, 미분류·stale 을 실패시킨다. 새 호출부가 옵션 없이 생기면 여기서 걸린다.

### ③ `nullMap` 을 값과 따로 적는 이유

값만 대조하면 **태어날 때부터 죽어 있는 열**이 `null == null` 로 조용히 통과한다
(`README-ganji-surface.md` §①-b 가 기록한 그 병). 지금은 전 행이 `0000000` — 죽은 열이 없다.
`④ 상수 열 금지`(열의 서로 다른 값이 2 미만이면 실패)도 같이 건다.

### ④ 표본이 검증캐시 해를 담는다

`getGanjiFromParts` 는 검증캐시에 있는 해(현재 **1990**) 말고는 전부 `null` 이다. 그 해가
표본에 없으면 간지 축 검사 ⑥-f 가 `null == null` 로 통과한다 — PR-F 가 닫은 그 함정이다.
그래서 가드는 **그 해가 어디냐를 셸에 물어서**(프로브의 발견 모드) 표본에 넣는다. 검증캐시가
늘면 표본도 따라 는다.

### ⑤ 간지(일주) 축은 여기서 안 바뀐다

`getGanjiFromParts` 의 야자시는 **ON 이 정본**이고 이 축과 규약이 다르다. 그 비대칭이 의도임을
검사 ⑥-f 가 값으로 지킨다 — 23시대에 `{yaja:true}` 와 `{yaja:false}` 의 일주가 갈려야 한다.
PR-3 이 음력 축을 OFF 로 통일할 때 간지 축까지 껐다면 여기서 빨간불이 났다.

`ganji-surface-kst.json` 은 같은 비대칭을 **네 열**로 한 번 더 적는다 —
`getGanjiFromParts`(ON) / `:noYaja`(OFF) / `solarToLunarFromParts`(OFF) /
`:yaja`(ON). 누가 "규약을 정리"하면 열이 움직여 그쪽이 깨진다.

### ⑥ 날짜 밀기 유틸도 전수 발견한다 (PR-3)

`solarToLunarFromParts` 만 지키면 구멍이 남는다 — 그 함수를 **안 거치고** 부품을 직접 미는
자리가 있기 때문이다. 실제로 숙요 3 폼의 음력 입력 갈래
(`js/saju-engine-tarot-sukuyo-quantum.js`)가 `_kasiShiftPartsByDays(tBirthParts, 1)` 로 직접
밀고 있었고, 기본값만 뒤집었다면 **같은 폼에서 양력은 안 밀고 음력은 미는 자가당착**이 남았다.
그래서 검사 ⑥-0c 가 `_kasiShiftPartsByDays(` 호출을 전부 찾아 축(`lunar`/`ganji`/`util`)으로
분류하고 미분류·stale 을 실패시킨다. 발견은 주석을 걷어낸 소스에서 하고
(설명 주석이 호출로 잡히는 헛빨강을 막는다), 이름은 `function 이름(` 뿐 아니라
`이름: function(` 도 본다(밀기 호출 둘이 `KasiEngine` 객체 리터럴 안에 있다).

## 시각 축

```
대조군   00:00 · 12:00 · 22:00
야자시   23:00 · 23:29 · 23:30 · 23:59
```

23:29/23:30 은 간지 축의 `min >= 30` 갈래와 대칭을 이루려고 넣었다 —
**음력 축에는 30분 하위 경계가 없다**는 사실을 값으로 박아 둔다.

날짜 축은 ①~⑤ 와 같은 표본(중국 음력과 27수가 갈리는 날을 **찾아서** 쓴다)에 검증캐시 해를
더한 것이다. 손으로 적은 날짜는 없다.
