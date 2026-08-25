# 회당 결제 잔존 해금 정리 — 실행 절차

> 🔴 **아직 실행하지 않았다.** 이 문서는 절차서이고, 각 단계는 사용자의 명시적 허락이 필요하다
> (CLAUDE.md 규칙 2 — 프로덕션 DB 쓰기).

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
  `tarot-prompt-maker` 가 2026-08-14~08-21 에만 영구 해금으로 팔렸으나 해당 구매자가 없음이
  확인돼 있다([scripts/audit-tarot-prompt-maker-purchasers.mjs](../scripts/audit-tarot-prompt-maker-purchasers.mjs)).

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

## 기록 (실행 후 채운다)

| 항목 | 값 |
|---|---|
| 실행 시각(UTC) | |
| 백업 위치 · 해시 | |
| 2단계 사전 건수 (entitlement / 계정) | |
| 3단계 실제 삭제 · $pull 건수 | |
| before-image 경로 | |
| 사후 잔여 (0 기대) | |
| 파기 완료 | |
