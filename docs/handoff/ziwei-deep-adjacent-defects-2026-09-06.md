---
status: active
updated: 2026-09-06
next: 개관·마스터플랜 챕터의 ensureMinLength 필러를 없앤다 — 4건 중 유일하게 지금 사용자 화면에 보이는 결함이다.
---

# 자미두수 심화 — 인접 결함 3건

## 왜

PR #1629(심화 해석 카드 전환) 중 발견했지만 인접 결함이라 손대지 않은 것들이다.

## 지금 상태

- PR #1629 는 **머지 완료**(main 3f4ae6a02). 궁 8절만 카드로 바꿨고 **개관·마스터플랜은 산문 경로 그대로**다.
- 아래 3건 중 손댄 것 없음. 이 문서 외 코드 변경 없음.

## 남은 작업

### [ ] 1. 개관·마스터플랜에 길이 채우기 필러가 화면에 보인다 (우선순위 1)

`ensureMinLength` 가 목표 글자수까지 `개관 노트 N` / `마스터플랜 노트 N` 소제목을 붙이는데,
**pool 을 순환하므로 같은 문장이 반복된다.** 실측(2026-09-06, 가드 픽스처 A):

| 챕터 | 길이 | 필러 | 고유 필러 문장 |
|---|---|---|---|
| 개관 | 3,851자 | **22개** | **3개** |
| 마스터플랜 | 4,201자 | **24개**(루프 상한) | **3개** |

같은 3문장이 22~24번 반복되어 그대로 나간다. 궁 8절에서 없앤 것과 같은 결함이다.

**됐다의 판정**: 두 챕터 `fullText` 에 `노트 \d+` 0개, 반복 문장 최대치가 궁 챕터 수준(≤4).
🔴 하한(3800/4200)을 두고 필러만 빼면 다른 데서 다시 채운다 — **하한 자체를 품질 축으로 교체**한다
(#1629 가 궁 8절에 한 방식).

### [ ] 2. `transformationTypeToLabel` 이 잘못된 입력을 조용히 `화기` 로 만든다

`if/if/if → return "화기"` 구조라 록·권·과가 아니면 **무엇이 들어와도 화기**다. 화기는 사화의 유일한 흉이라,
오작동하면 없는 흉을 만들어 보여준다.

지금 틀린 값을 내는 호출부는 **찾지 못했다**(TS 가 `TransformationType` 으로 막는다). 다만 `palace.sihua` 는
`string[]` 로 **이미 라벨을 담고 있어**(`ziwei-engine.ts:381-384` 는 라벨을 직접 push) 앞으로 그 원소를
이 함수에 넣으면 조용히 화기가 된다.

**됐다의 판정**: 알 수 없는 입력에서 던지거나 `null` 반환(fail-open 제거). 기존 호출부 12곳은 그대로 통과.

### [ ] 3. `verify-ziwei-brightness-constraints.cjs` — 45건 중 19건 실패·미배선

🔴 **여기에 다시 쓰지 말 것.** 그 파일 헤더(1~21행)에 2026-08-27 실측·판정 못 한 이유·정본 세우는 법
(`verify:ziwei-sohan` 방식)이 정리돼 있다. 2026-09-06 재실행도 **19건 그대로**다.

🔴 **3건 중 이것만 밝기 계산(`js/saju-engine.js`)에 닿는다.** 지금 엔진 출력으로 기대값을 다시 뜨면
"틀린 값을 고정하는 가드"가 된다. 외부 명반 대조로 정본을 세운 뒤 배선한다.

**됐다의 판정**: 45건 통과 + `package.json`·워크플로 배선 + 기대값마다 출처 주석.

> 함께 보고했던 `(N차 관점)` 유출은 **이미 없다**. `git grep "차 관점"` 전수 1건이고 그것은
> `ziwei-deep-reading.ts:582` 의 금지어 항목이다(회귀 그물 — 지우지 않는다). 다시 쫓지 말 것.

## 정본 예시

`app/_lib/generate-ziwei-deep-chapter.ts:107` (`ensureMinLength`) · `:160` · `:238` (호출부 2곳)
`app/_lib/ziwei-advanced-normalization.ts:217`

## 함정

- 이 파일들은 **CRLF** 다. Edit·sed 가 줄끝을 떨군다 — node 패치 스크립트로 고친다(메모리 `windows-shell-crlf-pitfalls`).
- 워크트리에 `node_modules` 가 없다. 스크래치 스크립트는 **리포 안**(`scripts/`)에 둬야 `require("typescript")` 가 상위 탐색으로 잡힌다. 스크래치 디렉터리에 두면 `MODULE_NOT_FOUND`.
- 챕터 id 는 `overview` / **`master`** 다(`masterplan` 아님 — `generate-ziwei-deep-chapter.ts:254-255`).
- 1번을 고치면 `ziwei:deep:runtime:v3` → **v4**. 안 올리면 기존 방문자가 캐시된 필러를 계속 본다(`ziwei-deep-runtime.ts:5`). 결과 캐시 `premium:ziwei:result:v9` 는 건드리지 않는다.

## 검증

```
node scripts/verify-ziwei-deep-counseling-quality.cjs
node scripts/verify-ziwei-chart-customer-copy.mjs
node scripts/verify-ziwei-brightness-constraints.cjs   # 3번 작업 시에만
npm run lint && npm run typecheck && npm run check:quick
```

가드를 고쳤으면 **변이로 무는지** 확인한다(도는 가드 ≠ 무는 가드).

## 모르는 것

- 1번의 하한 3800/4200 이 **어디서 온 숫자인지** 근거를 못 찾았다. 유료 PDF 표기("15개 장 34,000자 이상")와 묶여 있으면 낮추기 전에 사용자에게 확인한다. 🔴 추측해서 낮추지 말 것.
- 3번 기대값 45개의 출처. 파일 안에 주석이 없다.
