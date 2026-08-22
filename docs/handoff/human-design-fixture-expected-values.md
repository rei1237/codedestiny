# 휴먼 디자인 fixture — 외부 계산기 정답값 요청

> 작성일 2026-08-23 · 대상 PR: `feature/human-design-engine` (PR1)
> **이 문서만 읽고 작업을 이어받을 수 있게 쓴다.**

## 왜 이 문서가 있는가

휴먼 디자인 계산 엔진(PR1)의 코드·테스트·가드는 완성됐다. 남은 것 하나는
**외부의 신뢰할 수 있는 Human Design 계산기와 대조한 정답값**이다.

가드 `npm run verify:human-design` 은 아래 33건 중 하나라도 `expected` 가 비어 있으면
**실패한다(fail-closed)**. 따라서 **정답값이 채워지기 전에는 PR1 을 머지할 수 없다.**

이 설계는 의도된 것이다. 우리 엔진 출력을 그대로 `expected` 에 베껴 넣으면 그건 회귀
테스트일 뿐 정확도 검증이 아니고, "검증했다"고 말할 수 없다.

## 지금 상태 (2026-08-23 실측)

| 항목 | 상태 |
|---|---|
| 순수 계산 엔진 `lib/human-design/**` | 완성 · 테스트 111개 통과 |
| 천체 어댑터 `worker/lib/human-design-ephemeris.js` | 완성 · 실제 Swiss Ephemeris 로 33건 전부 계산됨 |
| fixture 33건 birth 데이터 | 작성 완료 |
| fixture 천체 스냅샷 | 생성 완료 (`ephemeris-snapshot.json`, 재실행 시 비트 단위 동일) |
| fixture `expected` | 🔴 **33건 전부 미기입 — 이 문서가 요청하는 것** |
| `npm run verify:human-design` | 34개 검사 통과 / 1개 실패 (= 위 미기입) |

엔진의 자기정합 신호(정답 대조와는 별개):
- 휠 180° 반대쌍 32개가 HD 프로그래밍 파트너 표와 **완전 일치**
- 게이트 41 이 302°(물병자리 2°)에서 시작 — Rave New Year 앵커와 일치
- 33건 전부에서 Profile 이 기하학상 성립 가능한 12조합 안에 떨어졌고, 12조합이 **모두** 등장
  (앵커가 틀렸거나 Design 순간을 88일 차감으로 근사했다면 여기서 깨진다)
- Design Sun 이 Personality Sun 에서 정확히 88.000000° 이전 (수렴 잔차 ~1e-10°)

## 부탁드리는 일

아래 33건을 **신뢰하시는 Human Design 계산기**에 그대로 넣고 결과를 회신해 주세요.

🔴 **주의: 계산기에 넣을 때 "서머타임" 옵션을 직접 만지지 마세요.** 아래 시각은 전부
**그 지역의 벽시계 시각**이고, 서머타임 적용 여부는 계산기가 타임존과 날짜로 알아서
판정해야 맞습니다. 그 판정이 맞는지가 이 fixture 의 검사 항목 중 하나입니다.

### 요청 목록

| # | id | 생년월일 | 시각 | 타임존 | 달력 | 확인 목적 |
|---|---|---|---|---|---|---|
| 1 | `kr-seoul-1991-02-20-0835` | 1991-02-20 | 08:35 | Asia/Seoul | solar | 한국 · 서울 · 표준시 |
| 2 | `kr-seoul-1988-05-08-0900` | 1988-05-08 | 09:00 | Asia/Seoul | solar | 한국 · 1988 서머타임(+10) |
| 3 | `kr-daegu-1987-08-20-1430` | 1987-08-20 | 14:30 | Asia/Seoul | solar | 한국 · 1987 서머타임(+10) · 대구 |
| 4 | `kr-lunar-leap-1987-06-15-0700` | 1987-06-15 | 07:00 | Asia/Seoul | **음력 윤6월** | 음력 윤달 변환 (양력 1987-08-09) · 서머타임 |
| 5 | `kr-busan-1975-11-03-2359` | 1975-11-03 | 23:59 | Asia/Seoul | solar | 한국 · 부산 · 날짜 경계 직전 |
| 6 | `kr-seoul-2001-07-15-0001` | 2001-07-15 | 00:01 | Asia/Seoul | solar | 한국 · 자정 직후 |
| 7 | `kr-seoul-1966-01-01-1200` | 1966-01-01 | 12:00 | Asia/Seoul | solar | 한국 · 정오 · 연초(Design 이 전년도로 넘어감) |
| 8 | `us-newyork-1985-07-04-1420` | 1985-07-04 | 14:20 | America/New_York | solar | 미국 · 뉴욕 · 여름(EDT, -4) |
| 9 | `us-newyork-1985-01-04-1420` | 1985-01-04 | 14:20 | America/New_York | solar | 미국 · 뉴욕 · 겨울(EST, -5) |
| 10 | `us-losangeles-1979-04-29-0130` | 1979-04-29 | 01:30 | America/Los_Angeles | solar | 서머타임 시작 직전(PST) |
| 11 | `us-losangeles-1999-10-31-0130` | 1999-10-31 | 01:30 | America/Los_Angeles | solar | 🔴 **서머타임 종료일 모호 시각** — 아래 주의 참고 |
| 12 | `us-chicago-1960-06-15-0800` | 1960-06-15 | 08:00 | America/Chicago | solar | 미국 · 연방 DST 표준화(1966) 이전 |
| 13 | `us-honolulu-1993-03-14-1000` | 1993-03-14 | 10:00 | Pacific/Honolulu | solar | 미국이지만 DST 미시행(-10) |
| 14 | `eu-berlin-1996-06-01-1200` | 1996-06-01 | 12:00 | Europe/Berlin | solar | 유럽 · 여름(CEST, +2) |
| 15 | `eu-berlin-1996-12-01-1200` | 1996-12-01 | 12:00 | Europe/Berlin | solar | 유럽 · 겨울(CET, +1) |
| 16 | `eu-london-1972-08-11-0715` | 1972-08-11 | 07:15 | Europe/London | solar | 영국 서머타임(BST, +1) |
| 17 | `eu-paris-2004-03-28-0330` | 2004-03-28 | 03:30 | Europe/Paris | solar | 서머타임 시작 당일, 점프 직후 |
| 18 | `jp-tokyo-1990-09-09-0000` | 1990-09-09 | 00:00 | Asia/Tokyo | solar | 자정 정각 |
| 19 | `kr-seoul-1995-12-31-0000` | 1995-12-31 | 00:00 | Asia/Seoul | solar | 자정 + 연도 경계 |
| 20 | `au-sydney-1982-02-14-1200` | 1982-02-14 | 12:00 | Australia/Sydney | solar | 남반구 서머타임(+11) |
| 21 | `in-delhi-1977-06-21-1200` | 1977-06-21 | 12:00 | Asia/Kolkata | solar | 30분 오프셋(+5:30) |
| 22 | `nz-auckland-2003-05-31-2359` | 2003-05-31 | 23:59 | Pacific/Auckland | solar | UTC+12 대역 날짜 경계 |
| 23 | `br-saopaulo-1998-01-01-0001` | 1998-01-01 | 00:01 | America/Sao_Paulo | solar | 남반구 DST + 연도 경계 |
| 24 | `gate-edge-kr-1994-03-19-1112` | 1994-03-19 | 11:12 | Asia/Seoul | solar | 🔴 게이트 경계 직전 |
| 25 | `gate-edge-kr-1994-03-19-1113` | 1994-03-19 | 11:13 | Asia/Seoul | solar | 🔴 게이트 경계 직후(위 +1분) |
| 26 | `gate-edge-uk-1986-10-14-1039` | 1986-10-14 | 10:39 | Europe/London | solar | 🔴 게이트 경계 + BST |
| 27 | `line-edge-kr-1993-03-11-1646` | 1993-03-11 | 16:46 | Asia/Seoul | solar | 🔴 라인 경계 직전 |
| 28 | `line-edge-kr-1993-03-11-1647` | 1993-03-11 | 16:47 | Asia/Seoul | solar | 🔴 라인 경계 직후(위 +1분, Profile 이 바뀐다) |
| 29 | `line-edge-us-1980-09-23-1911` | 1980-09-23 | 19:11 | America/New_York | solar | 🔴 라인 경계 + EDT |
| 30 | `delta-kr-1991-02-20-0834` | 1991-02-20 | 08:34 | Asia/Seoul | solar | 1번의 -1분 |
| 31 | `delta-kr-1991-02-20-0836` | 1991-02-20 | 08:36 | Asia/Seoul | solar | 1번의 +1분 |
| 32 | `delta-kr-1991-02-20-0830` | 1991-02-20 | 08:30 | Asia/Seoul | solar | 1번의 -5분 |
| 33 | `delta-kr-1991-02-20-0840` | 1991-02-20 | 08:40 | Asia/Seoul | solar | 1번의 +5분 |

### 11번에 대한 주의

`1999-10-31 01:30 America/Los_Angeles` 는 **그날 두 번 존재하는 벽시계**다(서머타임 종료로
01:00~02:00 이 반복된다). 우리 엔진은 **첫 번째 발생(PDT, -7)** 을 택한다. 외부 계산기가
두 번째(PST, -8)를 택한다면 결과가 1시간 어긋나는데, 이건 버그가 아니라 **정책 선택**이다.
회신 시 그 계산기가 어느 쪽을 택했는지 알 수 있으면 함께 적어 주시면 좋겠다 — 우리 쪽 정책을
맞출지 그대로 둘지 결정하겠다.

## 회신 형식

가장 편한 형태로 주셔도 되지만, 아래처럼 주시면 그대로 반영하기 쉽다.
`__tests__/fixtures/human-design/cases.json` 의 각 케이스 `"expected": null` 자리를 이걸로 바꾼다.

```json
"expected": {
  "designMomentUtc": "1990-11-25T08:49:00Z",
  "personalitySun":       { "gate": 55, "line": 1 },
  "personalityEarth":     { "gate": 59, "line": 1 },
  "personalityNorthNode": { "gate": 12, "line": 3 },
  "designSun":            { "gate": 34, "line": 3 },
  "designEarth":          { "gate": 20, "line": 3 },
  "designNorthNode":      { "gate": 11, "line": 5 },
  "profile": "1/3",
  "type": "Manifesting Generator",
  "authority": "Sacral",
  "definition": "Single",
  "definedCenters": ["Throat", "G", "Sacral"],
  "definedChannels": ["7-31", "20-34"],
  "incarnationCross": "Right Angle Cross of the Sleeping Phoenix (55/59 | 34/20)"
}
```

### 필드별 허용 표기

대조기가 표기 흔들림을 흡수한다(`lib/human-design/labels.js`). 아래는 전부 인식된다.

| 필드 | 허용 |
|---|---|
| `type` | `Generator` · `Manifesting Generator` · `MG` · `Projector` · `Manifestor` · `Reflector` (대소문자·공백·하이픈 무관) |
| `authority` | `Emotional`(=`Solar Plexus`) · `Sacral` · `Splenic` · `Ego`(=`Heart`) · `Self-Projected` · `Mental`(=`Environmental`/`Outer`) · `Lunar`(=`None`) |
| `definition` | `Single` · `Split` · `Triple Split` · `Quadruple Split` · `None` (뒤에 `Definition` 붙어도 됨) |
| `definedCenters` | `Head`(=`Crown`) · `Ajna` · `Throat` · `G`(=`Self`) · `Heart`(=`Ego`/`Will`) · `Solar Plexus`(=`Emotional`) · `Sacral` · `Spleen` · `Root` |
| `definedChannels` | `20-34` · `34-20` · `20/34` 다 됨 (순서 무관) |
| `incarnationCross` | 이름은 무시하고 괄호 안 4게이트만 대조한다. `55/59 \| 34/20` 만 적어도 됨 |
| `designMomentUtc` | ISO8601. 계산기가 현지시각으로 준다면 UTC 로 변환. **60초 이내면 일치로 본다**(계산기 대부분이 분 단위 표기) |

### 일부만 채워도 되는가

`expectedFieldsRequired`(cases.json 상단)에 있는 14개 필드가 다 있어야 가드를 통과한다.
계산기가 안 주는 항목이 있다면 알려 주시면 그 필드를 필수 목록에서 빼겠다 —
**임의로 우리 엔진 값을 채워 넣지는 않는다.**

특히 `personalityNorthNode` / `designNorthNode` 는 **노드 방식(True Node vs Mean Node) 판정에만**
쓰인다. 우리는 현재 True Node 를 쓰고 있고(`HD_NODE_MODE = "true"`), 이 값이 어긋나면
`"mean"` 으로 뒤집고 `MAPPING_VERSION` 을 올린다. 이 두 필드가 가장 정보량이 크다.

## 값을 받은 뒤의 절차

1. `__tests__/fixtures/human-design/cases.json` 의 `expected` 를 채운다.
2. `npm run verify:human-design` → 전 항목 통과 확인.
3. `npx jest __tests__/worker/human-design` → 기대값 대조 블록이 skip 에서 실행으로 바뀐다.
4. 어긋나면 조정 대상은 셋 중 하나다(그 외를 손대면 안 된다):
   - `lib/human-design/mandala.js` 의 `GATE_WHEEL_SEQUENCE` / `WHEEL_ANCHOR_DEG`
   - `lib/human-design/version.js` 의 `HD_NODE_MODE`
   - `worker/lib/human-design-ephemeris.js` 의 모호 시각 정책
   조정했으면 `lib/human-design/version.js` 의 `MAPPING_VERSION` 을 올린다.
5. 전부 일치하면 `MAPPING_VERSION` 을 `hd-mandala-draft` → `hd-mandala-1` 로 승격하고 PR 을 연다.

## 참고 — 관련 파일

| 파일 | 역할 |
|---|---|
| `__tests__/fixtures/human-design/cases.json` | 🔴 채워야 할 파일 |
| `__tests__/fixtures/human-design/ephemeris-snapshot.json` | 생성물. 손대지 말 것 |
| `scripts/human-design-fixture-snapshot.mjs` | 스냅샷 생성/대조 (`--check`) |
| `scripts/verify-human-design.mjs` | fail-closed 가드 |
| `lib/human-design/**` | 순수 계산 엔진 |
| `worker/lib/human-design-ephemeris.js` | 88° 태양호 역탐색 + 26 activation |
| `worker/lib/iana-offset.js` | 2-pass IANA 오프셋(역사적 DST) |
