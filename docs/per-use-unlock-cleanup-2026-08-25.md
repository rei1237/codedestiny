# 회당 결제 잔존 해금 정리 — 실행 절차

> **2026-08-25 프로덕션 실행 완료.** 아래 "기록" 절 참고. 절차 자체는 재실행·감사용으로 남긴다.
> 🔴 각 단계는 사용자의 명시적 허락이 필요하다(CLAUDE.md 규칙 2 — 프로덕션 DB 쓰기).

## 무엇을 정리하나

단건 KRW 확정 경로(`worker/payments/index.js` `grantOrderEntitlement`)가 `billingType` 검사 없이
`grantEntitlement` + `markUserFeatureUnlocked` 를 부른 탓에, **회당 결제 featureKey 가 영구 해금으로
기록된** 행이 남아 있다.

| 대상 | 무엇 |
|---|---|
| `ContentEntitlement` | `featureKey` 가 회당 결제인 행 (status 무관) |
| `User.unlockedFeatures` · `User.paidFeatures` | 같은 키 |

**이미 무료 통과는 못 만든다** — 쓰는 경로는 [#1137](https://github.com/rei1237/codedestiny/pull/1137),
읽는 경로는 [#1141](https://github.com/rei1237/codedestiny/pull/1141)·[#1142](https://github.com/rei1237/codedestiny/pull/1142)
에서 닫혔다. 남은 문제는 회계 정합성이다: `/api/access/unlocks`·관리자 주문 조회·리뷰 자격 등이
계속 이 행을 읽고, "이 계정이 무엇을 보유하는가"에 거짓이 섞인다.

## 안 건드리는 것

- **영구 해금 키** — `isPerUsePaidFeatureKey` 가 false 를 주므로 대상에서 제외된다. 이게 뒤집히면
  돈 낸 사용자의 콘텐츠를 지우게 되므로, `--self-test` 가 대표 키 3종으로 매 CI 에서 확인한다.
- **레지스트리에서 은퇴한 키** — `isPerUsePaidFeatureKey` 가 false 다. 정당한 과거 구매일 수 있다.
- **과금 유형이 바뀐 적 있는 키의 구간 구매자** — 예외를 만들지 않는다(2026-08-25 사용자 결정).
  🔴 계획 당시 전제는 "`tarot-prompt-maker` 의 그 구간 구매자가 없다" 였는데 **틀렸다** —
  2026-08-20 자 ￦10,000 구매가 1건 있었다(아래 "실행 전에 멈추고 확인한 것"). 실행 시점에 그 계정이
  오너 본인임을 확인하고 진행했다. 다음에 같은 정리를 할 때는 **전제를 믿지 말고 먼저 조회할 것**.

## 실행 순서

각 단계 사이에 사람이 결과를 보고 다음 단계를 승인한다.

| # | 명령 | 성격 | 비고 |
|---|---|---|---|
| 0 | `npm run backup:mongo -- --out <레포 밖 경로>` | 읽기 | 개인정보 포함. 레포 밖에 두고 검증 후 파기 |
| 1 | 스테이징 DB(`code_destiny_staging`)로 `verify:drop-per-use-unlocks` → `migrate:drop-per-use-unlocks` | 리허설 | 프로덕션과 분리된 DB |
| 2 | 프로덕션 `npm run verify:drop-per-use-unlocks` | 읽기 | 건수·featureKey 분포·status 분포를 보고 |
| 3 | 프로덕션 `node scripts/migrations/20260825-drop-per-use-permanent-unlocks.mjs --apply --expect <2단계 건수>` | **쓰기** | 건수 불일치 시 자동 중단 |
| 4 | 아래 "기록" 채우기 | — | |

🔴 인자 없이 실행하거나 `--check`·`--dry-run` 을 붙이면 **아무것도 쓰지 않는다.** 쓰기는 `--apply`
하나뿐이다.

## 안전장치

- **기대 건수 게이트** — `--expect` 와 실제가 다르면 즉시 중단한다. 2단계와 3단계 사이에 데이터가
  바뀌었다는 뜻이다.
- **before-image** — 삭제 **전에** 대상 전량을 `backups/migrations/20260825-…before.json` 에 남긴다.
  `_id` 가 있으므로 그 파일만으로 되돌릴 수 있다. 🔴 개인정보 포함 — 검증 후 파기.
- **자체 검증** — 적용 후 잔여 0 을 재조회로 확인하고, 아니면 exit 1.
- **개인정보 무출력** — 화면에는 카운트와 featureKey/status 분포만 찍는다.

## 되돌리기

before-image 의 `documents` 를 그대로 `ContentEntitlement` 에 다시 넣고, 같은 `featureKey` 를
해당 `userId` 의 `unlockedFeatures`/`paidFeatures` 에 `$addToSet` 한다. 전량 백업(0단계)은 최후 수단이다.

🔴 이 저장소의 일반 규약은 "환불은 status 전환, 삭제는 방금 만든 행 한정"
([worker/payments/entitlements.js](../worker/payments/entitlements.js))이다. 여기서 삭제를 택한 것은
**애초에 존재하면 안 되는 행**이기 때문이며(2026-08-25 사용자 결정), 그 대가로 되돌릴 근거를
before-image 와 전량 백업 두 겹으로 둔다.

## 기록 — 2026-08-25 프로덕션 실행

| 항목 | 값 |
|---|---|
| 실행 시각(UTC) | 2026-08-25 08:0x (승격 `403768ee0` 이후) |
| 대상 DB | `code_destiny` (실행 전 `databaseName` 으로 확인) |
| 백업 | `D:\Development\codedestiny-backups\20260825-per-use-unlock-cleanup` (레포 밖) · `users` 264건 + `content_entitlements` 1,385건 = 1,649건 |
| 사전 건수 | ContentEntitlement **1** · 계정 **1** |
| 실행 명령 | `--apply --expect 1` |
| 삭제 | ContentEntitlement **1건** |
| 배열 정리 | 계정 **1건** (`tarot-prompt-maker`, `tarot-love-relationship`) |
| before-image | `backups/migrations/20260825-drop-per-use-permanent-unlocks.before.json` |
| 사후 잔여 | **0 / 0** (스크립트 자체 검증 + 독립 `--check` 재확인) |
| 결과 | `RESULT OK` |

### 실행 전에 멈추고 확인한 것

🔴 **조회 결과가 예상과 달랐다.** 유일한 대상 행이 `tarot-prompt-maker` 였는데, 이 키는
2026-08-14~08-21 에만 **₩10,000 영구 해금 상품**으로 팔린 이력이 있다. 그래서 삭제를 보류하고
행의 내역을 먼저 읽었다(개인정보 미출력):

| 필드 | 값 | 해석 |
|---|---|---|
| `grantedAt` | 2026-08-20 | 영구 해금으로 팔던 구간 **안** |
| `coinPrice` / `amountKRW` | 100 / ₩10,000 | 영구 해금 가격(회당가는 50 / ₩5,000) |
| `source` | `MONTHLY` | 월정석 결제 |
| `grantType` | `permanent_unlock` | |

즉 **버그 잔존분이 아니라 정상 구매**였다. 월정석 경로에는 `billingType` 경계가 원래 있었고, 그
시점에 이 키는 실제로 unlock 유형이었다 — 서버가 옳게 동작한 결과이고 나중에 상품 정의가 바뀐 것이다.

사용자에게 보고한 뒤 **회당 결제로 통일(B)** 을 선택받았고, 그 근거인 "아직 고객이 없다"를
읽기 전용으로 검증했다 — **해당 계정은 오너 본인 계정**(전체 가입 264계정 중)이었다. 실제 고객의
구매를 회수하는 것이 아님을 확인한 뒤 진행했다.

### 부수 확인

- **카드 경로 잔존분은 0건이었다.** 이 정리의 원래 표적이었던 `grantOrderEntitlement` 버그로 생긴
  행은 하나도 없었다 — 그 경로가 라이브였던 창이 짧았기 때문으로 보인다(미검증 추정).
- 실제로 지워진 잔존분은 계정 배열의 `tarot-love-relationship` 하나다. 이 키는 한 번도 unlock 인
  적이 없어 명백한 잔존분이었고, 대응하는 entitlement 행은 없었다.

### 남은 파기 대상

검증이 끝났으므로 아래 둘은 파기한다(둘 다 개인정보 포함):

1. `D:\Development\codedestiny-backups\20260825-per-use-unlock-cleanup`
2. `backups/migrations/20260825-drop-per-use-permanent-unlocks.before.json`
   — 워크트리 안에 생성됐으므로 그 워크트리를 지우면 함께 사라진다.
