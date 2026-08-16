# ④ 티어 결정 — M10 vs Flex

> 이 문서만이 실제 월요금을 바꾼다. 나머지 문서는 이 결정의 입력이거나 부수 효과다.
> 🔴 **결정은 Atlas 콘솔에서 사용자가 한다.** 여기에는 근거와 차단 요인만 적는다.

## 왜 티어인가

M10 Dedicated 는 **사용량과 무관하게 고정 청구**된다. 이 서비스가 M10 에서 쓰는 양은:

| 자원 | 사용량 | M10 제공량 대비 |
|---|---|---|
| 데이터 | 약 18 MB (측정 컬렉션 합) | 10 GB 의 0.2% 미만 |
| 문서 | 26,537건 | — |
| 회원 | 250명 | — |
| 커넥션 | 아이솔레이트당 최대 16소켓(공유 10 + 결제 6) | 노드당 1,490 |

쿼리를 아무리 최적화해도 이 청구서는 1원도 줄지 않는다. 반대로 **티어를 내리면 그 순간부터
쿼리 최적화가 요금이 된다** — Flex 의 과금 단위가 ops/sec 이기 때문이다.

## Atlas Flex 요금 구조

| 구간 (ops/sec) | 월 요금 |
|---|---:|
| 0 ~ 100 (기본, 5 GB 스토리지 포함) | **$8.00** |
| 100 ~ 200 | $15.00 |
| 200 ~ 300 | $21.00 |
| 300 ~ 400 | $26.00 |
| 400 ~ 500 | **$30.00 (상한)** |

시간 단위 종량이고 30일 기준 **$30 을 넘지 않는다**. 데이터 전송은 무제한 포함.
출처: [Atlas Flex Costs](https://www.mongodb.com/docs/atlas/billing/atlas-flex-costs/)

2026-01-22 부로 M2·M5 공유 티어와 Serverless 는 폐지되었고 전부 Flex 로 이관됐다. 즉
**M10 아래 선택지는 Free 와 Flex 둘뿐이다.**

## 🔴 차단 요인 — 이것부터 해소해야 한다

### 1. 다중문서 트랜잭션 (최우선, 현재 `미검증`)

이 레포는 `withTransaction` 을 **15곳**에서 쓴다:

| 파일:줄 | `isTransactionUnsupported` 폴백 |
|---|---|
| `worker/routes/payments.js:3197` · `:4284` · `:4595` | ✅ `:3321` · `:4332` · `:4653` |
| `worker/routes/billing.js:4759` | ✅ `:4798` |
| `worker/routes/fortune.js:2937` | ✅ `:2972` |
| `worker/lib/payment-service.js:164` | ✅ `:169` |
| `worker/routes/rpg.js:1216` | ❌ **없음** |
| `worker/lib/guardian-fortune-usage.js:392` | ❌ **없음** |

M0 시절에는 리플리카셋이 없어 이 경로들이 전부 영구 503(`MONTHLY_ATOMIC_UNAVAILABLE`)이었고,
M10 전환으로 **배포 없이 되살아났다**([docs/context/ai-and-db.md:20](../context/ai-and-db.md)).

🔴 **Flex 가 다중문서 트랜잭션을 지원하는지는 확인되지 않았다.** 웹 검색 결과가 서로 모순돼
근거로 쓸 수 없었다. 공식 [Atlas Flex Limitations](https://www.mongodb.com/docs/atlas/reference/flex-limitations/)
문서를 직접 확인하거나 MongoDB 지원에 문의해 **확정한 뒤에만** 강등을 검토한다.

- 지원한다면 → 강등의 최대 장벽이 사라진다.
- 지원하지 않는다면 → `rpg.js` · `guardian-fortune-usage.js` 두 곳에 폴백을 먼저 배선해야 하고,
  결제 경로 6곳은 폴백이 돌기 시작하면서 원자성이 보상 로직으로 내려간다. **이는 결제 정책
  변경이므로 별도 승인 사항이다.**

### 2. ops/sec 실측 (요금 구간 결정)

현재 값을 모른다. Atlas `Metrics → Opcounters` 7일 그래프의 평균과 피크를 봐야
$8 구간인지 $30 구간인지 갈린다. **강등 후 절감액을 계산할 수 있는 유일한 숫자다.**

상시 바닥값이 있다는 점에 유의한다: `heartbeatFrequencyMS 30000` × 노드 수 × 살아있는
아이솔레이트 수 × 클라이언트 2개(공유 + 결제 레인). 트래픽이 0이어도 발생한다
(`worker/lib/db.js:646`, `:806-808`). 강등 시 **결제 전용 레인을 유지할지**를 함께 재검토해야 한다.

### 3. 연결 상한

Flex 는 **500 연결**(Free 와 동일). 현재 아이솔레이트당 최대 16소켓이므로 동시 아이솔레이트가
31개를 넘으면 상한에 닿는다. M10 의 1,490 에 비해 훨씬 빡빡하다.

🔴 **다만 M10 튜닝의 방향이 그대로 M0/Flex 의 오답이 된다.** `maxIdleTimeMS 60000` 은
"신규 커넥션 생성률 15/s"(M10·M20 한정 제약)를 피하려고 **늘린** 값이다
([docs/context/ai-and-db.md:16-18](../context/ai-and-db.md)). 총 연결이 벽인 티어로 내려가면
방향이 다시 뒤집힌다 — 그 규칙과 `__tests__/worker/db.pool-timeout-alignment.test.js` 를 함께 고쳐야 한다.

### 4. 스토리지

Flex 기본 제공 5 GB. 측정 합계 약 18 MB 로 여유는 압도적이다.
🔴 단, 측정하지 않은 컬렉션(전체 71개 중 17개만 쟀다)과 **인덱스 크기**가 빠져 있다.
Atlas `Metrics → Disk Usage` 또는 `Collections` 탭의 총계로 확인한다.

## Atlas 콘솔에서 직접 확인할 것

| # | 경로 | 얻을 값 |
|:--:|---|---|
| 1 | `Clusters → <클러스터> → ⋯ → Edit Configuration → Cluster Tier → Auto-scale` | **Max Compute Tier 상한.** 상한이 없으면 M20/M30 자동 확장으로 요금이 뛴다 |
| 2 | `Metrics → Opcounters` (7일) | 평균·피크 ops/sec → Flex 요금 구간 |
| 3 | `Metrics → Connections` | 그래프 모양 (톱니=churn / 계단=누수 / 평탄=정상) |
| 4 | `Metrics → Disk Usage` 또는 `Collections` | 인덱스 포함 총 크기 → Flex 5 GB 판정 |
| 5 | [Flex Limitations](https://www.mongodb.com/docs/atlas/reference/flex-limitations/) 또는 MongoDB 지원 | **다중문서 트랜잭션 지원 여부** |

## 권장 결정 순서

1. **1번(Max Compute Tier 상한)을 먼저 건다.** 티어를 내리든 말든, 지금 요금이 예고 없이 뛰는 것을
   막는 것이 가장 급하다. 되돌리기 쉽고 부작용이 없다.
2. **5번(트랜잭션)을 확정한다.** 여기서 "미지원"이 나오면 강등은 결제 정책 변경을 동반하므로
   비용 절감액과 위험을 따로 저울질해야 한다.
3. **2번(ops/sec)으로 절감액을 계산한다.** $8~$30 중 어디에 떨어지는지에 따라 강등의 실익이 달라진다.
4. 1~3이 모두 우호적일 때만 강등을 검토한다. 그 시점에 **커넥션 튜닝 방향 되돌리기**(위 3번)를
   같은 작업으로 묶는다.

🔴 **1~3의 값을 받기 전에는 강등을 권고하지 않는다.** 현재까지 확인된 것은 "데이터가 M10 에 비해
극히 작다"는 사실뿐이고, 그것만으로는 트랜잭션·연결 제약을 감당할 수 있는지 알 수 없다.
