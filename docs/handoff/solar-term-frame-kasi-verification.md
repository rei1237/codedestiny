# 절기 프레임 세차·월건의 KASI 대조 — 인수인계 (2026-08-28)

> 이 문서만 읽고 이어서 시작할 수 있어야 한다. **근거를 못 찾으면 추측하지 말고 사용자에게 물어라.**

## 0. 무엇이 남았나

[docs/handoff/korean-calendar-migration-2026-08-27.md](korean-calendar-migration-2026-08-27.md) 의 §(B) 가 남긴
미검증 항목 하나다.

> KASI `getLunCalInfo` 의 `lunSecha`/`lunWolgeon` 은 **음력 프레임**이다 — 세차가 설날에 바뀌고
> 월건은 음력 달의 간지다. 우리 코어의 `ganji()` 는 **절기 프레임**이다.
> 그냥 대조하면 45건이 어긋나고, 어느 쪽도 틀린 게 아니다.
> → **절기 프레임 세차·월건을 KASI 로 검증하려면 `get24DivisionsInfo` 를 써야 한다. 아직 안 했다.**

음력 프레임 쪽은 이미 끝났다 — `scripts/verify-korean-calendar-kasi-samples.mjs` 가 232/232 대조했고
`lunIljin`(일진)은 289/289 일치한다. **절기 프레임만 KASI 대조가 없다.**

## 1. 🔴 왜 아직 못 했나 — 업스트림이 403 이다

2026-08-28 실측. 프로덕션·스테이징 **양쪽 모두** 같다.

```
POST https://code-destiny.com/api/kasi/calendar
  {"method":"get24DivisionsInfo","params":{"solYear":"1997","numOfRows":"30"}}
    → 200  source="local"  warnings:["… KASI 응답 오류: HTTP 403"]

  {"method":"getLunCalInfo","params":{"solYear":"1997","solMonth":"02","solDay":"10"}}
    → 200  source="kasi"
```

즉 **음양력(`LrsrCldInfoService`)은 정상이고 24절기(`SpcdeInfoService`)만 403** 이다.

🔴 **`source:"local"` 응답을 정답으로 받으면 안 된다.** 그 폴백은 `worker/routes/kasi.js` 의
`computeLocalSolarTerms` 이고 그것이 곧 **우리 코어**다. 그걸로 대조하면 이 가드는 자기가 검증하려는
대상을 자기 자신으로 확인하는 회로가 된다. 기존 `verify-korean-calendar-kasi-samples.mjs` 가
머리말에서 같은 이유로 `source:"local"` 을 거부한다 — 그 규칙을 그대로 따를 것.

### 이 세션이 고친 것 (그리고 그것으로 안 끝날 수도 있는 이유)

`worker/routes/kasi.js` 에서 원인 후보 둘을 고쳤다(같은 브랜치 `fix/kasi-service-base-fallback`).

1. `buildBaseUrlCandidates` 가 `env.KASI_API_BASE_URL` 을 **메서드별 정답 서비스보다 먼저** 시도했다.
   그 값이 `LrsrCldInfoService` 로 고정돼 있으면 24절기 오퍼레이션이 음양력 서비스로 나가고,
   data.go.kr 은 그 조합을 403 으로 돌려준다. → `preferred` 를 앞으로.
2. `fetchKasiUpstream` 이 401/403 에서 **그 자리에서 던져** 남은 base URL 후보를 시도하지 않았다.
   → 그 base 의 키 후보·재시도만 건너뛰고 다음 base 로 넘어가게 했다.

덤으로 회로 카운트를 요청 단위로 바로잡았다(예전에는 base×키 후보마다 세서 403 한 번이
정상 동작하던 음양력 조회까지 10분간 죽였다 — probe 중 프로덕션이 실제로 그 상태였다).

🔴 **이것으로 살아난다고 단정할 수 없다.** 원격에서는 두 원인을 가를 수 없기 때문이다 —
`KASI_API_BASE_URL` 이 실제로 무엇으로 설정돼 있는지는 워커 시크릿이라 밖에서 안 보이고,
"키가 `SpcdeInfoService` 에 활용신청되지 않음" 도 똑같이 403 을 낸다.

## 2. 다음 단계 — 순서대로

### ① 위 PR 이 머지되면 스테이징에 자동 배포된다. 그 다음 probe 를 다시 돌린다

```js
// node로 그대로 실행. 스테이징이면 충분하다(프로덕션 승격을 기다릴 필요 없다).
const res = await fetch("https://staging.code-destiny.com/api/kasi/calendar", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ method: "get24DivisionsInfo", params: { solYear: "1997", numOfRows: "30" } }),
});
const j = await res.json();
console.log(j.source, j.warnings, (j.rows || []).length);
```

- `source === "kasi"` → **갈래 A** 로 간다.
- 여전히 `source === "local"` + 403 → **갈래 B**.

🔴 회로가 열려 있으면 `"KASI circuit이 열려 있어…"` 경고가 뜬다. 그건 403 과 다른 상태다 —
10분 기다렸다가 다시 볼 것. 앞선 probe 가 회로를 열어 둔 것일 수 있다.

### 갈래 A — 살아났다면 픽스처를 채집하고 가드를 만든다

사용자는 2026-08-28 에 **"픽스처 채집 1회"** 를 이미 승인했다. 그 승인은 그때 한 번에 대한 것이고,
다시 채집하려면 다시 물을 것.

새 가드 `scripts/verify-solar-term-frame-kasi.mjs` 를 만든다. 정본 패턴은
`scripts/verify-korean-calendar-kasi-samples.mjs` 다(2층 구조 · `--live` · 표본 규칙 해싱).

- **기본 모드(CI, 네트워크 0)**: 픽스처 `__tests__/fixtures/korean-calendar/kasi-24divisions.json` 대조.
  픽스처가 없거나 `source:"local"` 이 하나라도 섞여 있으면 **실패**한다(skip 아님).
- **`--live`**: 1930~2050 을 연도마다 한 번 부른다(121요청 · 24절기 × 121 = 2,904행).
  🔴 KASI `LrsrCldInfoService` 커버리지가 1391~2050 이라 2051~2100 은 검증할 수 없다.
  기존 픽스처가 그러듯 `coverageGap` 으로 적어 둘 것.

검사 설계(전부 **값이 아니라 프레임**을 본다):

| # | 보는 것 |
|---|---|
| ① | 픽스처의 모든 행이 KASI 유래다(`source` 가 `kasi`/`cache`, `local` 0건). 미채집이면 실패 |
| ② | KASI 절기 시각 ↔ 코어 `solarTerms(year)` 가 분 단위로 같다. 🔴 **허용 오차를 먼저 실측해서 정할 것** — 코어는 astronomy-engine 산출물이고 KASI 는 자체 산출이라 1분 차가 실재한다(셸의 1990 검증캐시와 코어 사이에 12중절 중 5건이 1분 차라고 `js/core/kasi-calendar-service.js` 주석이 적고 있다). 임계를 먼저 정하지 말고 분포를 보고 정한다 |
| ③ | **세차 프레임** — KASI 입춘 순간 ±1분에서 `ganji()` 의 세차가 KASI 절기로 유도한 것과 같다 |
| ④ | **월건 프레임** — 12중절 각각 ±1분에서 월건이 같다 |
| ⑤ | 그 대조가 **음력 프레임과 실제로 다르다**는 것을 보여준다. §(B) 의 45건이 여기서 재현돼야 "무엇을 검증했는지" 가 분명해진다 |

배선: 🔴 `verify-guard-wiring` 이 티어와 무관하게 항상 돌아 **미배선 검증기를 즉시 실패**시킨다.
같은 PR 에 배선(또는 사유와 함께 미배선 선언)을 담을 것.

### 갈래 B — 여전히 403 이면 그건 코드가 아니라 계정 작업이다

data.go.kr 에서 그 서비스키에 **`SpcdeInfoService`(특일 정보) 활용신청**이 돼 있는지 확인해야 한다.
`LrsrCldInfoService`(음양력)만 신청돼 있으면 24절기는 계속 403 이다.
🔴 **에이전트가 할 수 없는 일이다** — 사용자에게 그 사실만 명확히 전달하고 대기할 것.
승인이 나면 갈래 A 로 간다.

그 동안 24절기는 코어 폴백으로 계속 정상 동작한다(값은 맞다). 다만 `source:"local"` 경고가
매 호출 붙고, KASI 대조는 성립하지 않는다.

## 3. 실패한 시도 (다시 하지 말 것)

- **`/api/kasi/calendar` 에 `{year,month,day}` 로 POST** — 응답이 그 해의 24절기를 `isoLocal` 까지
  담아 편해 보이지만, 업스트림이 죽으면 `source:"local"` 로 조용히 코어 값을 돌려준다.
  레거시 형태(`{method,params}`)와 마찬가지로 **`source` 를 반드시 볼 것.**
- **`get24DivisionsInfo` 를 여러 해 연속 호출해 403 을 우회하려는 시도** — 첫 403 이 회로를 열어
  뒤 요청이 전부 `"circuit is open"` 이 된다. 위 수정 전에는 그 회로가 음양력까지 막았다.
- **`scripts/verify-korean-calendar-solar-terms.mjs` 를 근거로 삼는 것** — 이름과 달리 그 가드는
  KASI 가 아니라 **lunar-javascript** 와 절기 순간을 대조한다. `worker/routes/kasi.js` 주석의
  "KASI 와 평균 0.211분 차이다(verify:korean-calendar-solar-terms)" 는 그 가드가 실제로 하는 일과
  다르다. 절기의 KASI 대조는 아직 **어디에도 없다** — 그게 이 문서의 이유다.

## 4. 같이 봐야 할 문서

- [docs/handoff/korean-calendar-migration-2026-08-27.md](korean-calendar-migration-2026-08-27.md) — 마이그레이션 본체. §(B) 가 이 항목의 출처
- [docs/context/ai-and-db.md](../context/ai-and-db.md) — 외부 호출 규칙
- [CLAUDE.md](../../CLAUDE.md) 원칙 8·10 — 부정 단언 금지 · 가드는 fail-closed
