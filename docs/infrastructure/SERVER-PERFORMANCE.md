# 서버 성능: Workers 배치·DB 연결·Task 9 판정 (2026-10-31)

- **측정 시각:** 2026-10-31 15:09~18:59 KST(tail 중간 창). CF 7일 집계는 같은 날 15:07 KST.
- **출처:** [INFRASTRUCTURE-AUDIT 출처 목록](INFRASTRUCTURE-AUDIT.md#출처-목록)의 T-INT·T-KIND·T-EARLY·CF-7D·CF-PATH·CF-COLO·CF-CRON·LAT·ATL·MDB·LEDGER.
- **기준 커밋:** origin/main `f4c5458a0`. 작성 시점 브랜치 HEAD는 `35be53295`다. **운영 미배포.**
- **함께 보는 문서:**
  - 기준선과 이슈 현황: [INFRASTRUCTURE-AUDIT](INFRASTRUCTURE-AUDIT.md)
  - 등급 판정: [COST-OPTIMIZATION](COST-OPTIMIZATION.md)
  - 연결 한도·인덱스: [MONGODB-OPTIMIZATION](MONGODB-OPTIMIZATION.md)
  - 지연의 구조와 2026-08 LAX 시절 기록: [ai-and-db](../context/ai-and-db.md)
  - 2026-08 연결·ops 감사: [01-connection-and-ops](../db-cost-audit-2026-08-16/01-connection-and-ops.md)

## 결론

- **DO 연결 프록시는 도입하지 않는다.** 이 판정은 **중간 판정(피크 미포함)**이다.
  - 공유 연결 p50은 87ms로 규칙 문턱 150ms보다 낮다.
  - DB를 쓰는 요청 비중은 40.8%로 문턱 50%보다 낮다.
  - 두 조건이 모두 넘을 때만 판정이 바뀐다.
- **중앙값은 좋아졌지만 꼬리가 남았다.**
  - ICN 고정 뒤 연결 중앙값이 2026-08 LAX 시절의 핸드셰이크 1.3초대([ai-and-db](../context/ai-and-db.md))에서 87ms로 내려왔다.
  - 꼬리는 p95 2,351ms, p99 4,643ms다.
  - 느린 연결(800ms 초과)의 지연은 거의 전부 소켓 준비(socketReady) 단계에서 생긴다. DNS·hello 단계는 빠르다.
  - 느린 연결 73건 중 52건이 10분 크론 직후 분에 몰려 있다. 원인은 미확인이다.
- **결제 레인 연결은 기록만 한다.**
  - p50은 389ms다. fetch에서는 124ms, 크론에서는 1,857ms다.
  - 결제 확정 p95는 **미측정**이다. 창 안에 `/api/payments/confirm` 요청이 0건이었다.
- **`SECURITY_DB_TIMEOUT_MS=1000`은 유지한다.** 판정 입력인 첫 op p95는 **미측정**이다.
- **Gemini 위치 오류는 0건이다**(이벤트 1,855). 크론·큐 분리 계획은 세우지 않는다.
- **exceededResources가 7일에 50건 있었다.** 모두 CPU 30초 상한에 걸린 장시간 연결이고, 경로는 아직 특정하지 못했다.

## 측정 조건

- **배치:**
  - `/api/health` 응답의 `cf-placement`가 3회 모두 `remote-ICN`이었다(LEDGER).
  - CF 실행 colo의 ICN 비율(CF-COLO). 날짜는 UTC다. 10-31은 조회 시각(07:00:11Z)까지의 부분일이다.

    | 날짜 | ICN 비율(ICN/전체) | ICN 밖 상위 colo(10% 이상) |
    |---|---|---|
    | 10-24 | 88%(9,964/11,261) | 없음 |
    | 10-25 | 44%(6,956/15,903) | NRT 43% |
    | 10-26 | 35%(7,136/20,189) | HKG 43%, SEA 18% |
    | 10-27 | 0.02%(3/14,222) | HKG 34%, NRT 31%, LAX 13% |
    | 10-28 | 33%(6,918/20,708) | NRT 32%, PDX 15%, HKG 15% |
    | 10-29 | 3.4%(1,712/49,822) | HKG 33%, SEA 23%, NRT 11% |
    | 10-30 | 37%(13,538/36,994) | HKG 41%, KIX 11% |
    | 10-31 | 99%(3,966/4,007) | 없음 |

  - 10-25~10-30의 ICN 비율은 0.02~44%로 날마다 크게 달랐다.

  - 따라서 ICN 고정이 실제로 효과를 낸 것은 10-31부터다.
- **colo의 두 가지 뜻:** tail 이벤트의 `request.cf.colo`는 클라이언트가 접속한 엣지(LAX·SEA·NRT 등)이고, 실행 위치가 아니다. 실행 위치는 CF GraphQL의 colo(CF-COLO)로 본다.
- **tail 완전성:** 06:29:55~06:50:51Z 창에서 tail 이벤트 25건과 CF 집계 25건이 같았다(LEDGER). 누락이나 샘플링은 없었다.
- **연결 방식:**
  - 요청마다 새 MongoClient를 만든다. 요청 컨텍스트가 끝나면 소켓이 죽기 때문이다.
  - 새 연결마다 SRV·TXT DNS 조회, hello 모니터, TLS+SCRAM 인증을 다시 한다.
  - 결제 요청은 별도 클라이언트(`PAYMENTS_DB_SOCKET_LANE=1`)를 하나 더 만든다.
- **백분위:** nearest-rank 방식이다(`scripts/lib/worker-tail-db-connect.mjs`).

## 중간 tail 실측 표

- 아래 T-1~T-7은 모두 같은 창이다: 2026-10-31 06:09:28Z~09:59:05Z(15:09~18:59 KST), **피크 미포함**.
- 전체 tail이 끝나면(2026-11-01 00:40 KST) 같은 명령으로 다시 집계해 표를 통째로 바꾼다.
  - 리포트: `npm run report:worker-tail-latency -- <파일> --all`
  - T-KIND 계열: 같은 스크래치 집계
- 판정 문단의 수치도 함께 바꾼다.

**표 T-1. 라우트별 wallTime(ms)** — 출처 T-INT `--all`. 이벤트 1,855. 상위 라우트만 싣는다. outcome은 전부 ok다.

| 라우트 | n | p50 | p95 | max | CPU p50 |
|---|---|---|---|---|---|
| `GET /api/auth/me` | 594 | 2 | 176 | 4,992 | 1 |
| `GET /api/honey/attendance` | 512 | 150 | 482 | 6,775 | 28 |
| `GET /api/profile` | 294 | 5 | 201 | 4,538 | 1 |
| `GET /api/rpg/characters` | 93 | 1,043 | 6,467 | 6,964 | 31 |
| `GET /api/honey/catalog` | 65 | 1 | 10 | 19 | 1 |
| `GET /api/subscription/status` | 28 | 140 | 250 | 324 | 24 |
| `GET /api/me/access-state` | 19 | 125 | 234 | 4,741 | 26 |
| `GET /api/health` | 19 | 1 | 5 | 18 | 1 |
| `GET /api/payments/birth-profile-pending` | 18 | 231 | 376 | 606 | 51 |
| `GET /api/insights` | 15 | 211 | 311 | 338 | 25 |
| `GET /api/recommendations` | 14 | 177 | 306 | 337 | 37 |
| `POST /api/kasi/calendar` | 9 | 44 | 6,531 | 6,531 | 3 |
| `GET /api/payments/service-packs/wallet` | 8 | 161 | 412 | 412 | 17 |

- 이 창에 `POST /api/payments/confirm` 요청은 0건이다.
- 리포트는 p99를 출력하지 않는다. 라우트 p99는 미측정이다.

**표 T-2. DB 연결 완료 시간(ms)** — 출처 T-INT. `[db-connect]` 완료 줄 기준.

| 레인 | n | p50 | p95 | p99 |
|---|---|---|---|---|
| shared | 745 | 87 | 2,351 | 4,643 |
| payment | 49 | 389 | 2,374 | 2,533 |

- 연결이 있는 이벤트 기준으로 요청당 연결 수는 p50 1, max 2다.
- `db-connect-error`·`db-op-timeout`·`db-op-admission`·`db-ping`·EventEmitter 누수 카운터는 모두 0이다.

**표 T-3. 실행 종류별 연결 시간(ms)** — 출처 T-KIND. 이 파서의 이벤트 수는 1,857로, T-INT보다 2건 많다.

| 종류 | 레인 | n | p50 | p95 | max |
|---|---|---|---|---|---|
| fetch | shared | 722 | 85 | 2,338 | 5,092 |
| fetch | payment | 26 | 124 | 389 | 396 |
| scheduled(`*/10`) | shared | 23 | 1,865 | 2,424 | 2,534 |
| scheduled(`*/10`) | payment | 23 | 1,857 | 2,433 | 2,533 |

**표 T-4. 연결 단계 분해(ms)** — 출처 T-KIND. `[db-connect]` 완료 줄의 단계 필드다. 느림 기준은 800ms 초과다.

| 대상 | n | dnsMs p50/p95/max | helloRttMs p50/p95/max | socketReadyMs p50/p95/max |
|---|---|---|---|---|
| fetch shared, 느림 | 73 | 3 / 8 / 9 | 4 / 6 / 6 | 1,212 / 2,487 / 2,619 |
| fetch shared, 빠름 | 649 | 3 / 7 / 40 | 3 / 6 / 16 | 39 / 106 / 340 |
| scheduled shared, 느림 | 22(전체 23건 중) | 30 / 45 / 58 | 372 / 512 / 545 | 984 / 1,294 / 1,343 |

느린 fetch shared 연결 73건의 발생 분을 10으로 나눈 나머지별 분포: 0 → 6건, 1 → 52건, 6 → 15건. 크론은 매 10분 정각(나머지 0)에 돈다.

**표 T-5. 느린 DB op(`[db-slow-op]`, ms, p50/p95)** — 출처 T-INT.

| 라우트 | n | total | connect | op | 레인 |
|---|---|---|---|---|---|
| `GET /api/rpg/characters` | 93 | 1,671 / 4,165 | 561 / 4,162 | 4 / 2,398 | shared |
| `GET /api/honey/attendance` | 48 | 1,370 / 4,646 | 807 / 4,643 | 528 / 2,390 | shared |
| `GET /api/auth/me` | 3 | 4,753 / 4,963 | 4,750 / 4,960 | 3 / 4 | shared |
| `GET /api/payments/birth-profile-pending` | 1 | 586 | 0 | 586 | payment |
| `GET /api/me/access-state` | 1 | 4,702 | 4,699 | 3 | shared |
| `GET /api/profile` | 1 | 4,483 | 4,480 | 3 | shared |

**표 T-6. 결제 컨텍스트(`[pay]`, ms)** — 출처 T-INT.

| 라우트 | n | 상태 | duration p50/p95 | connect p50/p95 | op p50/p95 | attempts>1 |
|---|---|---|---|---|---|---|
| `GET /api/payments/pass-offers` | 14 | 200:14 | 0 / 0 | - | - | 0/14 |
| `GET /api/payments/birth-profile-pending` | 18 | 200:18 | 194 / 333 | 0 / 0 | 194 / 333 | 0/18 |
| `GET /api/payments/service-packs/wallet` | 8 | 200:8 | 145 / 399 | 0 / 0 | 145 / 399 | 0/8 |

**표 T-7. DB 사용 비중과 응답 상태** — 출처 T-KIND.

| 항목 | 값 |
|---|---|
| fetch 이벤트 | 1,834 |
| 연결 완료 줄이 있는 fetch 이벤트 | 748 |
| DB 사용 비중 | 748 / 1,834 = 40.8% |
| scheduled 이벤트 | 23 |
| queue 이벤트 | 0 |
| HTTP 상태(fetch 1,834) | 200: 1,658 · 204: 4 · 302: 2 · 304: 2 · 401: 138 · 402: 3 · 404: 27 · 503: 0 |
| `User location is not supported` 줄 | 0 |

## 판정 규칙과 중간 판정

Task 9 규칙이다. 규칙을 먼저 적고, 판정은 위 표의 수치로만 한다. 등급 판정(M10 vs Flex)은 [COST-OPTIMIZATION](COST-OPTIMIZATION.md#등급-판정-m10-유지-vs-flex)에 있다.

### 1. DO 연결 프록시

**규칙**

- 다음 두 조건을 모두 만족할 때만 파일럿 계획을 별도 문서로 세운다.
  - `shared [db-connect] p50 > 150ms`
  - DB를 쓰는 요청 비중 > 50%
- 파일럿 대상은 핫 라우트 1~2개의 읽기 경로뿐이다.
- 기준 밖이면 "도입하지 않음"과 수치를 기록한다.

**배경**

- 2026-09 검토에서 이미 기각됐다. mongoose 모델과 트랜잭션은 DO RPC로 돌려줄 수 없기 때문이다([yeongnyangi-paid-result-attach-503](../handoff/yeongnyangi-paid-result-attach-503.md)).
- Hyperdrive는 MongoDB를 지원하지 않는다.

**실측**

- shared p50: 87ms(표 T-2, n=745)
- DB 사용 비중: 40.8%(표 T-7, 748/1,834)

**판정:** 도입하지 않음. **중간 판정(피크 미포함)**이다.

**뒤집히는 조건**

- 전체 tail(피크 포함)이나 운영 승격 뒤 재측정에서 두 조건이 함께 성립하면 판정이 바뀐다.
  - shared p50 > 150ms
  - DB 사용 비중 > 50%
- 그때도 하는 일은 파일럿 계획 문서 작성까지다. 착수는 승인 항목 7이다.
- 지금 값 기준으로 p50은 63ms 차이(150 − 87), 비중은 9.2%p 차이(50 − 40.8)로 문턱에 못 미친다.

**별도 기록:** 꼬리 지연(p95 2,351ms, p99 4,643ms)은 이 규칙이 다루지 않는다. 아래 [꼬리 지연 위험](#꼬리-지연-위험)에서 따로 본다.

### 2. 결제 레인 2번째 클라이언트

**규칙:** `payment lane connected` p50과 결제 확정 p95를 기록한다. 레인을 끄는 것은 격리 설계를 바꾸는 일이라 범위 밖이고, 수치만 남긴다.

**실측**

- payment 연결: p50 389ms, n=49(표 T-2)
  - fetch: p50 124ms, n=26(표 T-3)
  - scheduled: p50 1,857ms, n=23(표 T-3)
- 결제 확정 p95: **미측정**.
  - 이유: 창 안에 `POST /api/payments/confirm`이 0건이었다(표 T-1).
  - 측정 방법:
    - 전체 tail(피크 포함)을 같은 리포트로 집계해 `[pay]` 표에 확정 라우트가 잡히는지 본다.
    - 0건이면 스테이징에서 테스트 결제 확정 흐름을 돌리고 tail로 잰다. 이 경우 실결제는 0회여야 한다.
- 참고: 창 안의 `[pay]` 요청 40건은 모두 attempts>1이 0이다(표 T-6).

**판정:** 기록 전용이라 뒤집을 판정은 없다. **중간 판정(피크 미포함)**이다. 레인을 끄는 안은 설계 변경이라 이번 범위 밖이다.

### 3. `SECURITY_DB_TIMEOUT_MS = 1000`

**규칙:** ICN 이후 첫 op p95 < 800ms이면 유지한다. 800ms 이상이면 조정안을 승인 항목으로 올린다.

**현재 설정**

- `worker/lib/security/index.js`의 코드 상수다.
  - 시도 타임아웃 1,000ms, 재시도 0
  - 동시 2, 대기 250ms
- 관리자 진입과 찻집 카운터만 3,000ms다.
- 코드 주석에 따르면 enforce 모드에서 필수 호출 제한 확인이 실패하면 503을 돌려준다. 로그·점수 기록이 실패해도 그 실패는 다른 작업으로 번지지 않는다.

**실측**

- 첫 op p95는 **미측정**이다. 가드 op만 따로 잰 로그가 없다. `[db-slow-op]`은 라우트 단위로만 집계된다.
- 측정 방법(택일):
  - 스테이징에서 가드 op에 첫 op 타이밍 로그를 붙여 tail로 잰다.
  - `[db-slow-op]` 줄에 가드 op 식별자를 남기도록 한 뒤 필터해서 잰다.
  - 둘 다 코드 변경이라 이번 범위 밖이다.

**참고 수치**

판정 입력이 아닌 맥락 자료다.

- 같은 창의 shared 연결 p95는 2,351ms다(표 T-2).
- 찻집 카운터 주석은 시도 타임아웃에 연결 수립이 포함된다고 적고 있다. 1,000ms 가드도 그렇다면, 연결 꼬리에 걸린 요청에서 가드가 실패할 수 있다. 다만 1,000ms 가드에 대해서는 확인하지 않았다.
- 같은 창의 fetch 응답에 503은 0건이다(표 T-7). enforce 모드 여부는 확인하지 않았다.

**판정:** 현행 유지. **중간 판정(피크 미포함)**이다. 판정 입력이 미측정이라 근거는 규칙의 기본값뿐이다.

**뒤집히는 조건:** 위 방법으로 잰 첫 op p95가 800ms 이상이면, 조정안(시도 타임아웃 상향 또는 연결 포함 여부 분리)을 승인 항목으로 올린다.

### 4. 큐·크론의 배치 밖 실행

**규칙:** Gemini 위치 오류가 1건 이상이면 후속 계획으로 분리하고 위험으로 보고한다. 이번엔 코드를 바꾸지 않는다.

**실측**

- `User location is not supported` 0건(표 T-7, 이벤트 1,855, scheduled 23, queue 0)
- 크론 실행 colo: **미측정**.
  - tail의 scheduled 이벤트에는 colo가 없다.
  - CF scheduled 데이터셋은 7일·24시간 모두 0행이다(CF-CRON).
  - 측정 방법: 사용자가 CF 대시보드의 Cron 이벤트 화면에서 실행 위치를 확인한다.

**판정:** 후속 계획 없음. **중간 판정(피크 미포함)**이다.

**뒤집히는 조건:** 전체 tail이나 이후 관측에서 위치 오류가 1건 이상 나오면, 크론·큐 분리 계획을 후속으로 세운다.

**참고: 크론 연결이 느리다**

- 크론 연결 p50은 1,865ms다(표 T-3). helloRtt p50이 372ms로, fetch의 3~4ms보다 훨씬 크다(표 T-4).
- 원인은 미확인이고 가설이 둘이다(LEDGER).
  1. 크론이 배치 밖, 서울에서 먼 곳에서 실행된다.
  2. 크론 시작 때 약 20개 태스크가 동시에 기동하면서 이벤트 루프가 경합한다.
- 10-31 비ICN 실행은 41건으로, 그날 크론 실행 수(약 96회)보다 적다. 그래서 2번 가설도 배제하지 못한다.

## 꼬리 지연 위험

| 항목 | 값 | 출처 |
|---|---|---|
| shared 연결 p95 / p99 | 2,351 / 4,643ms | 표 T-2 |
| fetch shared 느린 연결(>800ms) | 73 / 722건(10.1%) | 표 T-4 |
| 느린 연결의 소켓 준비 시간 p50 | 1,212ms(빠른 연결은 39ms) | 표 T-4 |
| 느린 연결의 DNS·hello p50 | 3ms·4ms(빠른 연결과 같은 수준) | 표 T-4 |
| 크론 직후 분(나머지 1)에 몰린 비율 | 52 / 73(71%) | T-4 아래 분포 |

**해석**

- 느린 연결은 거리 때문이 아니다. hello 왕복이 4ms이기 때문이다.
- 지연은 소켓 준비 단계(TLS+SCRAM 인증 구간으로 추정)에 몰려 있다.
- 크론 직후 분에 몰리므로, 크론이 만드는 부하나 연결 생성과 관련 있을 가능성이 있다. 확인되지는 않았다.
- 참고로 M10은 노드당 새 연결 생성을 초당 15개로 제한한다(Atlas 문서, 2026-10-31 조회. 출처는 [MONGODB-OPTIMIZATION](MONGODB-OPTIMIZATION.md#연결)). 관측 구간(15:42~17:12 KST)의 거부 증가는 0이었다.

**고객 영향**

- 연결 꼬리가 큰 라우트일수록 처리 시간 꼬리도 크다.
  - `GET /api/rpg/characters`: p95 6,467ms(표 T-1). 느린 op p50 분해에서 연결이 561ms, op가 4ms다(표 T-5).
  - `GET /api/honey/attendance`: 느린 op p50에서 연결 807ms, op 528ms(표 T-5).
- 두 라우트는 CF 7일 경로 집계에서 각각 31,435건, 46,790건이다(CF-PATH).

**다음 조치**(코드 변경 없음, 측정만)

1. 전체 tail에서 같은 분포를 다시 본다. 피크에서도 나머지 1인 분에 몰리는지 확인한다.
2. 몰림이 다시 보이면, 그 분에 도는 크론 태스크와 Atlas 연결 생성률을 같은 시각으로 맞춰 본다.
3. 연결 재사용은 요청 컨텍스트 한계 때문에 지금 구조로는 불가능하다. 구조를 바꾸는 안(DO 등)은 위 1번 판정을 따른다.

## exceededResources 50건/7일

| 항목 | 값 | 출처 |
|---|---|---|
| 건수 | 50 / 174,639 요청(7일) | CF-7D |
| 원인 | 50건 모두 CPU 30초 상한. 이벤트별 최대 CPU 30.0~63.6초 | LEDGER |
| wall | 2.8~11.5시간(장시간 연결) | LEDGER |
| 이벤트당 서브요청 | 6 | LEDGER |
| 실행 colo | ICN 26, HKG 18, NRT 4, SEA 1, KIX 1 | LEDGER |
| 마지막 발생 | 2026-10-30T07:29Z. 이후 24시간 0건 | LEDGER |
| 고객 영향 | 해당 요청은 1102 또는 연결 종료로 끝난다 | LEDGER |

- **경로:** 특정하지 못했다.
  - 정적 판독으로 추린 장시간 스트림 후보는 3곳이다.
    - 초융합 SSE: 심박과 하드 스톱이 있다.
    - 수호신 채팅 SSE(`worker/routes/fortune.js:6739` 부근): 심박이 없다.
    - 음악 미리듣기
  - 이 중 어느 것인지는 확정하지 못했다.
  - Workers Observability API는 권한이 없어 403이었다.
- **사용자 조치:** CF 대시보드 Workers Logs에서 `outcome=exceededCpu`로 필터해 경로를 확인한다.
- **상태:** 잔여. 경로를 특정한 뒤 후속 과제로 넘긴다([INFRASTRUCTURE-AUDIT 후속](INFRASTRUCTURE-AUDIT.md#후속-과제)).

## 확장 계획 (임계값 → 단계)

- 임계값 중 "제안"이라고 표시한 것은 측정값이 아니라 정책 값이다. 실측 최대치의 배수로 계산했으며, 사용자가 조정할 수 있다.
- 연결·ops·CPU 값은 ATL 30일 집계다.

| 신호 | 현재(출처) | 임계값 | 단계 |
|---|---|---|---|
| shared 연결 p50과 DB 사용 비중 | 87ms, 40.8%(T-2, T-7) | p50 > 150ms 이고 비중 > 50%(Task 9 규칙) | DO 파일럿 계획 문서 작성. 핫 라우트 1~2개 읽기 경로. 착수는 승인 7 |
| 연결 거부(serverStatus `connections.rejected`) | 누적 17,523, 관측 구간 증가 0(MDB, MDB2) | 재측정에서 증가가 보이면 | 증가 시각과 배포 시각을 대조한다. 평시에도 증가하면 등급 상향을 검토한다. M30은 MongoDB 9.0 미만(현재 8.0.34)에서는 생성률 제한이 꺼져 있고, 9.0 이상에서는 노드당 초당 24개다(Atlas 문서, 2026-10-31 조회. 출처는 [MONGODB-OPTIMIZATION](MONGODB-OPTIMIZATION.md#연결)). 검토할 때 Atlas 문서의 현재 값을 다시 확인한다. 승인 7. M30 단가는 청구서에 없어 미측정 |
| 노드 연결 수 | 30일 노드 max 100(ATL), 노드 한도 1,500(MDB: current 90 + available 1,410) | 제안: 300(= 30일 max 100 × 3) | 원인 조사. 지속되면 Atlas 경보로 고정([SECURITY-AUDIT](SECURITY-AUDIT.md#런북-3-atlas-경보-권장-목록)) |
| 노드 ops/s | 30일 노드 max 47.79(ATL) | 제안: 143(= 47.79 × 3) | 쿼리 원장과 인덱스 점검([MONGODB-OPTIMIZATION](MONGODB-OPTIMIZATION.md)). 지속되면 등급 검토 |
| 노드 CPU | 30일 노드 max 14.34%(ATL) | 제안: 43%(= 14.34 × 3) | 같은 조치 |
| 디스크 | fsUsed 2.58 / 10.63GB(ATL), 디스크 자동 확장 켜짐 | 자동 확장 범위 안 | 별도 단계 없음 |
| Gemini 위치 오류 | 0(T-7) | 1건 이상 | 크론·큐 분리 후속 계획 |
| exceededResources | 50 / 7일(CF-7D) | 경로 특정 후에도 재발 | 해당 스트림에 심박·하드 스톱 적용(후속 코드 과제) |

## 미측정 항목

| 항목 | 이유 | 측정 방법 |
|---|---|---|
| 결제 확정 p95 | 창 안 요청 0건 | 전체 tail 집계 → 없으면 스테이징 테스트 결제(실결제 0회) |
| 보안 가드 첫 op p95 | 가드 전용 타이밍 로그 없음 | 스테이징에서 타이밍 로그 추가 후 tail(코드 변경, 범위 밖) |
| 크론 실행 colo | tail에 colo 없음, CF scheduled 데이터셋 0행 | 대시보드 Cron 이벤트 화면 |
| 라우트 p99 | 리포트가 p50/p95/max만 출력 | 리포트에 p99 열 추가 후 재집계 |
| 인증 GET 지연(클라이언트 측) | `CD_LATENCY_COOKIE` 없음 | 테스트 계정 쿠키로 `measure:post-deploy-latency` 재실행 |
| 운영 승격 후 전후 비교 | **운영 미배포로 after 미측정** | 승격 뒤 Task 2 Step 3 재측정([DEPLOYMENT-REPORT](DEPLOYMENT-REPORT.md)) |
| 피크 포함 전체 tail | 2026-11-01 00:40 KST 종료 예정 | 같은 명령으로 T-1~T-7 교체 |
