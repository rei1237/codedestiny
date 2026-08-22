# 휴먼 디자인 계산 엔진 — 외부 계산기 대조 기록

> 2026-08-23 · 브랜치 `feature/human-design-engine`
> **이 문서만 읽고 이어받을 수 있게 쓴다.**

## 결론

외부 Human Design 계산기 차트 **20건**과 대조해 **전 항목 일치**했다.

| 대조 항목 | 결과 |
|---|---|
| 26 activation(게이트.라인) × 20건 | **520 / 520 셀 일치** |
| 출생 UTC (벽시계 + IANA 타임존 → UTC) | 20 / 20 일치 |
| Type | 20 / 20 |
| Authority | 20 / 20 |
| Definition | 20 / 20 |
| Profile | 20 / 20 |
| Incarnation Cross (4 게이트) | 20 / 20 |

재현:
```
npx cross-env NODE_OPTIONS=--experimental-vm-modules npx jest --runInBand \
  --testEnvironment node __tests__/worker/human-design-fixtures.test.js
npm run verify:human-design
```

## 무엇이 검증됐나

520개 셀이 전부 맞는다는 것은 아래가 **동시에** 맞아야만 가능하다.

1. **Rave Mandala 게이트 배열과 휠 앵커** — 한 칸만 틀려도 520 셀이 무더기로 어긋난다.
   (`GATE_WHEEL_SEQUENCE`, `WHEEL_ANCHOR_DEG = 358.25°`)
2. **88° 태양호 역탐색** — Design 쪽 13천체 × 20건 = 260 셀이 전적으로 여기 의존한다.
   "출생일 − 88일" 근사였다면 여기서 무너진다(실측: 기준 케이스의 실제 간격은 86.6일).
3. **True Node** — North/South Node 40 셀이 `SE_TRUE_NODE` 로 일치. Mean Node 였다면 갈라진다.
   → `HD_NODE_MODE = "true"` 로 확정, 미검증 표시 해소.
4. **Earth = Sun + 180°, South Node = North Node + 180°** — 각 20건에서 성립.
5. **2-pass IANA 오프셋(역사적 DST)** — 아래 10개 타임존이 계산기와 같은 UTC 로 풀렸다.
6. **채널 완성 → 센터 정의 → Type/Authority/Definition 규칙 엔진** — Type 5종·Authority 6종·
   Definition 4종이 모두 등장했고 전부 일치.

## 커버리지

**타임존 10종**: `Asia/Seoul`(+9) · `America/Los_Angeles`(-8, DST 종료 후) · `Europe/London`(+1 BST) ·
`Europe/Paris`(+2 CEST) · `America/Havana`(-4 CDT) · `America/Costa_Rica`(-6, DST 미시행) ·
`Africa/Dakar`(0) · `Atlantic/St_Helena`(0) · `Pacific/Guam`(+10) · `Asia/Kabul`(**+4:30**)

**Type 5종 전부**: Generator · Manifesting Generator · Projector · Manifestor · **Reflector**(정의된 센터 0개)
**Authority 6종**: Sacral · Solar Plexus(Emotional) · Splenic · Ego Manifested · Self Projected · Lunar Cycle
**Definition 4종**: Single · Split · Triple Split · None
**Profile**: 1/3 · 2/4 · 2/5 · 3/5 · 4/6 · 5/1 · 6/2 · 6/3

## fixture 구조

`__tests__/fixtures/human-design/cases.json` 은 두 배열로 나뉜다.

| 배열 | 건수 | 성격 |
|---|---|---|
| `cases` | 20 | 외부 계산기 차트에서 옮긴 `expected` 가 있다. 값 대조 대상 |
| `structuralCases` | 13 | 외부 차트가 없다. 구조 불변식만 검사 |

🔴 **`structuralCases` 에 `expected` 를 넣지 말 것.** 대조되지 않는 값이 되어 "검증됐다"는
착각만 만든다. 가드가 이걸 막는다(`구조 탐침에는 기대값이 없다`).

`structuralCases` 의 13건은 외부 차트를 구할 수 있으면 `cases` 로 옮길 가치가 있는 것들이다:

| id | 왜 가치 있나 |
|---|---|
| `gate-edge-kr-1994-03-19-1112` / `-1113` | 1분 차이로 게이트가 바뀌는 지점. 휠 wrap-around(36→25)도 함께 밟는다 |
| `gate-edge-uk-1986-10-14-1039` | 게이트 경계 + 영국 서머타임 |
| `line-edge-kr-1993-03-11-1646` / `-1647` | 1분 차이로 라인이 바뀌어 **Profile 이 4/1 → 5/1 로 바뀐다** |
| `line-edge-us-1980-09-23-1911` | 라인 경계 + 미국 서머타임 |
| `kr-seoul-1988-05-08-0900` | 🔴 한국이 1987~1988 두 해만 시행한 DST(+10). 고정 오프셋 표를 쓰는 구현이 여기서 1시간 틀린다 |
| `kr-lunar-leap-1987-06-15-0700` | 음력 윤6월 변환(→ 양력 1987-08-09) + 한국 DST |
| `us-losangeles-1999-10-31-0130` | 🔴 그날 **두 번 존재하는** 벽시계. 아래 참고 |
| `delta-kr-1991-02-20-08{25,29,31,35}` | 기준 케이스 ±1분/±5분 민감도 |

## 🔴 남은 정책 판단 1건 — 모호 시각

`1999-10-31 01:30 America/Los_Angeles` 는 서머타임 종료로 그날 두 번 존재한다.
우리 엔진은 **첫 번째 발생(PDT, -7)** 을 택한다. 이건 버그가 아니라 **정책 선택**이고,
외부 계산기가 두 번째(PST, -8)를 택하면 결과가 1시간 어긋난다.

정하려면 그 출생 데이터의 외부 차트 하나만 있으면 된다. 그때까지는
`structuralCases` 에 남겨 두고 구조만 본다.

## 값을 더 받았을 때의 절차

1. `cases.json` 의 `cases` 배열에 `{ id, label, axis, birth, expected }` 를 추가한다.
   `expected` 규격은 같은 파일의 기존 항목과 `expectedFieldsRequired` 참고.
   - `personality` / `design` 은 13천체 키 객체이고, 순서 정본은 `planetOrder` 다:
     `Sun, Earth, Moon, NorthNode, SouthNode, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto`
   - `authority` 는 계산기 표기 그대로 써도 된다(`Solar Plexus`·`Ego Manifested`·`Lunar Cycle` 등).
     흡수는 `lib/human-design/labels.js` 가 한다.
   - `incarnationCross` 는 이름을 그대로 적어도 되고 괄호 안 4게이트만 있어도 된다.
2. `node scripts/human-design-fixture-snapshot.mjs` — 새 케이스의 천체 스냅샷 생성
3. `npm run verify:human-design` — 가드 전 항목 통과 확인
4. `npx jest __tests__/worker/human-design` — 값 대조 통과 확인
5. 어긋나면 조정 대상은 셋뿐이다. 그 외를 손대면 안 된다.
   - `lib/human-design/mandala.js` 의 `GATE_WHEEL_SEQUENCE` / `WHEEL_ANCHOR_DEG`
   - `lib/human-design/version.js` 의 `HD_NODE_MODE`
   - `worker/lib/iana-offset.js` 의 모호 시각 정책
   조정했으면 `MAPPING_VERSION` 을 반드시 올린다(저장된 계산 문서의 재검증 신호).

## 관련 파일

| 파일 | 역할 |
|---|---|
| `__tests__/fixtures/human-design/cases.json` | 외부 검증값 20건 + 구조 탐침 13건 |
| `__tests__/fixtures/human-design/ephemeris-snapshot.json` | 생성물. 손대지 말 것 |
| `scripts/human-design-fixture-snapshot.mjs` | 스냅샷 생성/대조(`--check`). 로컬 루프백으로 `public/ephe/` 를 먹여 네트워크 0 |
| `scripts/verify-human-design.mjs` | fail-closed 가드 40개 검사 |
| `lib/human-design/**` | 순수 계산 엔진 |
| `worker/lib/human-design-ephemeris.js` | 88° 태양호 역탐색 + 26 activation |
| `worker/lib/iana-offset.js` | 2-pass IANA 오프셋(역사적 DST) |
