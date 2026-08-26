# 한국 음양력 코어 마이그레이션 인수인계 — 2026-08-27

> 이 문서만 읽고 이어서 시작할 수 있어야 한다. **근거를 못 찾으면 추측하지 말고 사용자에게 물어라.**
> 🟢 코어(PR-B)는 끝났다. 남은 것은 **소비자 전환**이다.

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
| **#1170** | 이 문서를 담은 PR — 한국 음양력 코어 신설 | **리뷰 대기** (`feat/korean-calendar-core`, base `58267ff8b`) |

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

### (C) `js/` 아래 파일 하나가 22개 파일을 딸려온다

정적 셸용 클래식 스크립트판(`js/core/korean-calendar-table.generated.js`)을 만들면
`sync:public` 이 캐시키를 회전시켜 `index.html` 포함 **22개 파일**이 함께 바뀐다.
그래서 PR-B 에서는 **만들지 않았다** — 셸이 실제로 그 표를 읽는 PR-C 에서 한 번만 회전시킨다.
그때 `verify-korean-calendar-table-fresh.mjs` 의 ② 자리에 "두 산출 파일의 지문이 같다" 검사를 더한다.

## 4. 남은 작업 — 전환 PR

### 판정 도구 — 추측하지 말고 이걸 돌려라

```
node scripts/verify-korean-calendar-divergence.mjs --explain 1980-01-01
  → in-band: no — 이 날짜는 바뀌면 안 된다
```

**모든 기존 고정값 날짜에 이걸 먼저 돌려 표를 만들고 나서 코드를 고친다.**
- 밴드 **안** → 그 픽스처는 중국 음력으로 계산된 값이다. 갱신하고 커밋 메시지에 근거를 적는다.
- 밴드 **밖인데 값이 움직였다** → 🔴 그 PR 의 버그다. 즉시 멈춘다.

### PR-C — 자미두수 3엔진 + 하드코딩 시드 제거

| 대상 | 할 일 |
|---|---|
| `js/saju-engine.js:850` | `KASI_LOCAL_PATCH_SEED` 삭제 |
| `js/core/kasi/calendar.js:10` | 같은 시드 삭제 (🔴 이 파일은 어느 HTML 도 로드하지 않는 고아다) |
| `js/core/kasi-calendar-service.js:165-169` | `_AUTHORITATIVE_*` 삭제 |
| `worker/lib/ziwei-ai-chart.js:168-190` | `getLunarDate` → 코어 |
| `app/_lib/ziwei-engine.ts:117-118` | `Solar.getLunar()` → 코어 |
| `js/core/index-inline-runtime.js:2248` | 로드 체인 맨 앞에 표 스크립트 추가 |

**미리 지목된 고정값**

| 대상 | 판정 |
|---|---|
| `verify-ziwei-star-parity.mjs` 의 1997-02-10 **제외** | 🔴 **제외를 없애야 한다.** 세 엔진이 코어를 쓰면 셋 다 음력 1/3 이 된다. **이 케이스가 다시 들어와 초록이 되는 것이 성공의 증거다** |
| `verify-ziwei-brightness-constraints.cjs` C 케이스 | 값은 안 바뀌고 **근거가 시드 → 로직**으로 바뀐다. 45건 중 19건 실패는 별개 사안(셸 튜닝 명암 모델)이니 **19건 그대로인지** 확인할 것. 숫자가 움직이면 이 PR 이 명암에 손댄 것이다 |
| `verify-admin-saju-prompt-kasi-calendar.mjs` | 음력 1997-01-03 ↔ 양력 1997-02-10 을 **이미 단언 중**. 시드를 지워도 통과해야 한다 |
| `verify-ziwei-sohan` / `verify-ziwei-worker-chart-facts` (1980-01-01 14:10) | `--explain` 으로 밴드 판정 먼저 |

### PR-D — 사주 간지(절기) 전환

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
