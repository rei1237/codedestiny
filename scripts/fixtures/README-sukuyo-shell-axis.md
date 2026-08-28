# `sukuyo-shell-axis.json`

`scripts/verify-sukuyo-korean-calendar.mjs` 의 **검사 ⑥**(셸 음력일 축)이 쓰는 픽스처다.
손으로 고치지 말 것 — 갱신은 `node scripts/verify-sukuyo-korean-calendar.mjs --emit` 이 한다.

## 🔴 이것은 정답이 아니라 **현행**이다

셸(`js/`)의 음력일 소비자 7벌을 브라우저와 같은 로드 체인에서 실제로 돌린 결과다.
계약은 "이 값이 안 바뀐다" 하나이고, **값의 옳고 그름은 이 파일의 관심사가 아니다.**

그래서 여기에는 **지금 라이브인 불일치가 그대로 고정돼 있다.**

### ① 23시대(야자시)에 셸 소비자끼리 답이 갈린다 — 갈래 **2**

```
갈래 1 (대조군 00·12·22시)  33행
갈래 2 (23:00·23:29·23:30·23:59) 44행
```

예 — `1950-03-19 23:00`:

```
KasiEngine.solarToLunarFromParts        루(婁)   ← 민다 (야자시 ON 기본값)
calcZiweiPalaces:calcMeta               루(婁)   ← 민다
buildFallbackDateContext                루(婁)   ← 민다
modalProfileState._resolveSukuyoLunarObj 루(婁)  ← 민다
indexInlineRuntime._dfExtractSukuyoLiveData 루(婁) ← 민다
quantum.syRadarResolveLunar             규(奎)   ← 안 민다 (서비스 컨텍스트 우선)
resolvePrimaryCalendarContext           규(奎)   ← 안 민다
```

**왜 서비스 갈래는 안 미는가** — `js/core/kasi-calendar-service.js:193` 의
`_applyCoreCalendarCorrection` 이 `context.lunar` 를 **밀지 않은**
`KoreanCalendar.solarToLunar(y, m, d)` 로 덮어쓰고, 그 호출은 `:1074`(캐시 히트)·`:1238`(신규
생성)에서 **무조건** 돈다. 진단 태그 `korean-calendar-core-correction` 이 그 증거이고, 검사 ⑥-e 가
그 태그가 실제로 찍혔는지 본다 — 안 그러면 "네트워크가 없어서 통과"와 구별되지 않는다.

**앱·워커는 이미 안 민다** — `app/_lib/ziwei-engine.ts:110` · `worker/lib/ziwei-ai-chart.js:147` ·
`lib/sukuyo-calendar.ts` 는 전부 3인자 `solarToLunar(y, m, d)` 라 야자시 개념이 없다.
즉 지금 셸의 "미는 갈래"는 **앱·워커와도 갈려 있다.**

🔴 **이것을 고치는 것은 다음 PR 이다.** 그때 `groupCounts` 가 전 행 **1** 이 되고, 이 파일을
`--emit` 으로 다시 뽑는다. 그 diff 가 곧 "무엇이 얼마나 바뀌었나"의 답이다.

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
음력 축을 통일하는 PR 이 실수로 간지 축까지 끄면 여기서 빨간불이 난다.

## 시각 축

```
대조군   00:00 · 12:00 · 22:00
야자시   23:00 · 23:29 · 23:30 · 23:59
```

23:29/23:30 은 간지 축의 `min >= 30` 갈래와 대칭을 이루려고 넣었다 —
**음력 축에는 30분 하위 경계가 없다**는 사실을 값으로 박아 둔다.

날짜 축은 ①~⑤ 와 같은 표본(중국 음력과 27수가 갈리는 날을 **찾아서** 쓴다)에 검증캐시 해를
더한 것이다. 손으로 적은 날짜는 없다.
