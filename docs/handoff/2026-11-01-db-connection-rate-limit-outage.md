---
status: active
updated: 2026-11-01
next: "읽기 전용 피크 serverStatus 1분 표본부터(다음 저녁 피크 21~23시 KST 전에 준비, 운영 읽기는 사용자 재확인). 코드 변경은 RED 승인 뒤"
---

# DB 연결 생성률 장애(P1): 저녁 피크에 새 연결이 거부된다

색인: [2026-10-31-infra-followups-index.md](2026-10-31-infra-followups-index.md) (0순위)
출처: [SERVER-PERFORMANCE — P1 장애](../infrastructure/SERVER-PERFORMANCE.md#p1-장애-저녁-피크-db-연결-실패), 근거 파일은 [INFRASTRUCTURE-AUDIT 출처 목록](../infrastructure/INFRASTRUCTURE-AUDIT.md#출처-목록). 데이터 파일(tail·CF·Atlas·MDB)은 리포 밖 `D:\Development\code-destiny-backups\`에 있다.

## 요약

- 2026-10-31 21:59~22:10 KST에 운영 Worker가 DB 연결을 못 만들어 503을 냈다. 장애 창 tail 이벤트 2,561건 중 791건(30.9%)이 503이다.
- 유력 원인은 Atlas M10의 **노드당 초당 새 연결 15개 한도**다. 프라이머리 `connections.rejected`가 17,523 → 31,035(+13,512)로 늘었다. 확정은 아니다(아래 "원인 가설과 한계").
- 재발 위험이 남아 있다. 장애 시점 커밋 `1592b6013`부터 지금 origin/main까지 연결 코드(`worker/lib/db.js`, `worker/wrangler.toml`, `worker/payments/db.js`)의 diff가 비어 있다. 요청마다 새 MongoClient를 만드는 구조도 그대로다.
- 11-01 00:18~00:24에 같은 모양의 두 번째 에피소드가 있었다(p99 4.4~8.7초). tail을 받지 않던 시간이라 연결 거부와의 연결은 미확인이다.
- 유료 결과 미전달은 새로 생기지 않았다("유료 전달 영향").
- 분류
  - 측정(1단계): **GREEN**. 운영 읽기 전용이다. 운영 DB 읽기라 착수 전에 사용자에게 다시 확인한다.
  - 경보(2단계): GREEN. 다만 알림 채널 설정이 사용자 조치일 수 있다.
  - 코드 변경(3~5단계): **RED**. 운영 DB 연결 경로라 승인 10이 필요하다.
  - 등급·구조 변경(6~7단계): 승인 7이 필요하다.

## 타임라인 (KST)

| 시각 | 관측 | 출처 |
|---|---|---|
| 평시 | 성공 22~107건/분 | T-FINAL |
| 21:59~22:02 | 성공 1.9~3.1건/초, 느린 연결 73~100건/분 | T-CONN |
| 22:03~22:10 | 연결 오류 줄 508~1,094건/분 | T-FINAL·T-SPLIT |
| 22:11 | 회복. 요청이 12건/분으로 줄었다 | T-FINAL |
| 22:20, 22:23~22:25, 22:30 | 짧은 재발. 22:30은 22:28 Atlas CLUSTER_UPDATE와 겹친다 | T-FINAL·ATL-EV |
| 11-01 00:18~00:24 | 두 번째 에피소드 | CF-0018·CF-MIX |

503 내역(장애 창, T-KIND-FINAL):

| 경로 | 503 |
|---|---|
| `/api/rpg/characters` | 662 |
| attendance | 99 |
| 유료 결과 조회(ziwei 9, sukuyo 7, astrology 7, relationship-boundary-test 5) | 28 |
| birth-profile-pending | 2 |

- 요청 구성이 평시와 달랐다(T-MIX). rpg/characters는 574 → 838로 늘고 auth/me는 638 → 269로 줄었다. 늘어난 이유는 미확인이다(5단계).
- Cloudflare 분석의 오류 수는 0이었다(CF-INC). CF는 Worker가 정상 반환한 503을 성공으로 센다. **CF 대시보드만 보면 이 장애가 보이지 않는다.**

## 배제한 원인

| 후보 | 배제 근거 | 출처 |
|---|---|---|
| 배포 | Worker 버전 `6e7c62f7`(커밋 `1592b60`)이 장애 전후로 같다. 직전 배포 18:56, 다음 변경은 장애 뒤 22:46 secret 변경 | LEDGER·DEP |
| Atlas 사건 | 사건은 모두 22:28 이후 | ATL-EV·ATL-EV2 |
| 프라이머리 교체 | uptime이 끊기지 않았다 | MDB2·MDB3 |
| 연결 수 한도 | 장애 창 프라이머리 연결 99~128 / 노드 한도 1,500 | ATL-1M·MDB |
| CPU | 프라이머리 정규화 CPU 최대 25.2% | ATL-1M |
| 요청량 | 평시 피크 범위 안 | T-FINAL·CF-INC |

## 장애 뒤 운영 변경 (다른 세션)

이 브랜치는 운영에 들어가지 않았다. 아래는 모두 다른 세션의 변경이다(DEP).

- 22:46 secret 변경 3번
- 22:57 배포 `b255b50`, 23:21 수동 롤백
- 11-01 운영 릴리스 런 41213033014: 배포 단계 00:06~00:22, Worker 교체 00:20:29(`4d58f3d`)
- 런 41213773173: 00:26 실패(`--pages-only` 차단)
- 런 41215094790: Pages 재배포(00:32~00:50), Worker 행 없음

지금 운영은 `4d58f3dc5`다. 연결 코드는 장애 시점과 같다.

## 두 번째 에피소드 (11-01 00:18~00:24)

- 요청 203~343건/분, p99 4.4~8.7초, 00:22 p50 13.9초. CF 오류 0, 00:25 회복(CF-0018).
- 요청 구성(CF-MIX, 00:17~00:26): 상위 경로가 P1과 같다(rpg/characters 766, auth/me 575, attendance 351, profile 281). KR 2,282 / US 30, 모바일 브라우저 1,776, headless 115. **고객 트래픽**이다.
- 운영 릴리스 배포 단계(00:06~00:22)와 겹치지만 Worker 교체(00:20:29)보다 먼저 시작했다. 원인으로 확정하지 않았다.
- 00:32~00:44에는 US 914 / KR 581로 국가 구성이 뒤집혔다. Pages 재배포 단계(00:32:40~00:50:42)와 겹친다. 배포 검증 트래픽일 수 있으나 미확인이다.
- tail을 받지 않던 시간이라 503 수와 연결 단계 지연은 미측정이다.

## 원인 가설과 한계

가설: 피크에 isolate가 늘면서 요청마다 새 연결을 만든다. 생성률이 M10 한도(노드당 15개/초)를 넘으면 mongod가 새 연결을 거부한다. 거부된 연결은 재시도되고, 생성 시도가 더 늘어난다.

근거:
- `rejected` +13,512, `totalCreated` +61,963(MDB2 → MDB3). 같은 카운터가 15:42~17:12에는 0 늘었다.
- tail에서 실패가 socketReady 단계에 몰렸다(T-CONN).
- M30 이상은 MongoDB 9.0 미만에서 이 한도가 없다(Atlas 문서). 등급 문제일 수 있다는 뜻이지만 가격은 미측정이다.

한계:
- `rejected`는 누적값이다. 13,512건이 장애 창에 났다고 못 박을 수 없다. 이 구간에 00:18 에피소드와 다른 세션의 Worker 변경 8번도 들어 있다(DEP). 다만 거부 증가가 0이던 15:42~17:12에도 배포가 2번 있었다.
- 초 단위 생성률은 미측정이다. Atlas 1분 지표에는 연결 수만 있고 생성률이 없다.
- 1단계 측정으로 이 한계를 메운다.

## 유료 전달 영향

- 장애 창에 생성된 결제 1건은 22:21~22:23에 완료됐다(PAYW).
- 영냥이 5/5, tarot-mindscan 1건 성공(DLV).
- 상담 전달 리포트 미해결 3건(10-30 생성)은 장애 전에 생긴 건이다. 상세는 DLV 파일에 있다.
- 유료 결과 조회 503 28건은 DB 연결 전에 실패한 조회라 결과 기록을 바꾸지 않았다.

## 코드 위치

줄 번호는 origin/main `4d58f3dc5` 기준이다. 줄이 밀렸으면 따옴표 안의 문자열로 다시 찾는다.

`worker/lib/db.js`:

| 줄 | 내용 |
|---|---|
| 664 | `backoffDelayMs`: 선형 `base × (attempt+1)`, ±30% 지터 |
| 711 | `serverSelectionTimeoutMS` 3000 |
| 746 | `retryBaseDelayMS` |
| 913-918 | ipFamily 후보 |
| 961 / 966 / 971 | `maxPoolSize` 10 / `minPoolSize` 0 / `maxConnecting` 2 |
| 1001 / 1009 | `serverMonitoringMode` "poll" / `heartbeatFrequencyMS` 30000 |
| 1030, 1243 | 재시도 루프 |
| 1061, 1069 | family 연결 오류 로그 |
| 1238 / 1248 | `establishScopedSharedLane` / `createConnection` |
| 1271 / 1277 / 1280 | "connected successfully" / shared 실패 로그 / 백오프 sleep |
| 1365 | 결제 레인 풀 6 |
| 1415 | `laneRetryCount` |
| 1427 / 1429 | 결제 재시도 / `createConnection` |
| 1440 / 1444 / 1446 | "payment lane connected" / 결제 실패 / 결제 백오프 |

`worker/wrangler.toml` `[vars]`(139행 주석: 값은 db.js 기본값과 한 세트):

| 줄 | 변수 | 값 |
|---|---|---|
| 85 | `PAYMENTS_DB_SOCKET_LANE` | "1" |
| 145 / 146 / 147 | `MONGO_SERVER_SELECTION_TIMEOUT_MS` / `MONGO_CONNECT_TIMEOUT_MS` / `MONGO_SOCKET_TIMEOUT_MS` | 3000 / 5000 / 7000 |
| 149 | `MONGO_WORKER_CONNECT_RETRIES` | 2 |
| 170 / 184 | `MONGO_MAX_POOL_SIZE` / `MONGO_MAX_CONNECTING` | 10 / 2 |
| 196 | `MONGO_PAYMENT_CONNECT_RETRIES` | 1 |
| 212 / 220 / 221 | `MONGO_OP_ATTEMPT_TIMEOUT_MS` / `MONGO_OP_RETRIES` / `MONGO_OP_RETRY_DELAY_MS` | 8000 / 1 / 120 |
| 226 / 232 | `MONGO_OP_ADMISSION_TIMEOUT_MS` / `MONGO_WORKER_RETRY_DELAY_MS` | 2500 / 220 |

클라이언트(5단계):

| 위치 | 내용 |
|---|---|
| `js/core/profile-character-card.mjs:7-14` | 포커스·visibilitychange 때 KST 날짜가 바뀌었을 때만 다시 마운트 |
| `js/core/profile-character-card.mjs:15-18` | `cd:auth-changed`에 다시 마운트 |
| `js/core/profile-character-card.mjs:71` | 수동 재시도 버튼 |
| `js/core/profile-character-card.mjs:107-111, 130` | `refresh()`가 `/api/rpg/characters`를 부른다. 마운트마다 1회 |
| `js/destiny-profile.js` `"onQuestExp"` 근처 | 카드 마운트. `request`가 `_dpFetchJsonWithFallback(path, init, { timeoutMs: 10000, allowWorkerFallback: false })`를 부른다(`retryTransient` 없음) |
| `js/destiny-profile.js` `"function _dpShouldDedupeGet"`, `"function _dpShouldApplyCooldown"` | 중복 합치기·쿨다운 대상 목록. `/api/rpg/characters`는 **없다** |
| `js/destiny-profile.js` `"var retryable = looksHtml"` | JSON 503은 다음 후보 주소로 재시도하지 않는다 |
| `js/destiny-profile.js` `.catch` 안 `"if (method === 'GET' && index < candidates.length - 1)"` | **타임아웃·네트워크 오류(status 0)는 GET이면 다음 후보 주소로 다시 요청한다**. 비인증 경로 후보는 상대경로와 `location.origin`(같은 Worker)이라 최소 2개다 |
| `js/destiny-profile.js` `"function _dpRunTransientRetry"` | `opts.retryTransient`일 때만 503·504·0을 최대 2번 재시도. 카드 요청은 해당 없음 |

## 단계

### 1. 피크 실측 (GREEN, 운영 읽기 전용)

목표: 장애 분과 `rejected` 증가 분이 맞는지 1분 단위로 본다.

- 시점: 저녁 피크(21~23시 KST)와 다른 세션의 운영 배포 전후. 시작 전에 사용자에게 "운영 DB serverStatus 1분 읽기"를 다시 확인한다.
- 병행 수집(모두 리포 밖 `D:\Development\code-destiny-backups\`에 둔다):
  - tail: `npx wrangler tail code-destiny-web --config worker/wrangler.toml --format json > ...\tail\<stamp>.jsonl`. pretty JSON이 여러 줄이라 줄 단위로 읽으면 안 된다. 중괄호 깊이로 객체를 나눈다.
  - CF GraphQL `httpRequestsAdaptiveGroups` 1분 단위(503을 상태 코드로 나눠 센다).
  - Atlas 1분 지표: `scripts/lib/atlas-readonly-client.mjs`의 `createAtlasReadonlyClient`로 GET `/groups/{g}/processes`, `/groups/{g}/processes/{p}/measurements?granularity=PT1M&start=…&end=…&m=CONNECTIONS&m=SYSTEM_NORMALIZED_CPU_USER`. 둘 다 허용 목록 안이다. 키는 사용자 환경변수 4개에서 읽고 출력하지 않는다.
  - serverStatus 1분 표본: 아래 리더를 클라이언트 1개(`maxPoolSize: 1`)를 열어 둔 채 60초마다 돌리도록 고친다. 출력은 `D:\Development\code-destiny-backups\mongodb-readonly\<stamp>-conn-counters-minute.jsonl`. 리더 자체는 연결 1개라 한도에 영향을 주지 않는다.

```js
// 읽기 전용: 프라이머리 연결 카운터 serverStatus 1회. URI는 출력하지 않는다.
// 실행: node <이 파일> <작업 트리 경로>  (.env.local의 MONGO_URI를 읽는다. 파일은 리포 밖 스크래치에 둔다)
import { createRequire } from "node:module"; import { readFileSync } from "node:fs"; import path from "node:path";
const [, , worktree] = process.argv;
const require = createRequire(path.join(worktree, "package.json"));
const { MongoClient } = require("mongodb");
const envText = readFileSync(path.join(worktree, ".env.local"), "utf8");
const uri = (/^MONGO_URI\s*=\s*"?([^"\r\n]+)/m.exec(envText) || [])[1];
const client = new MongoClient(uri, { maxPoolSize: 1, appName: "cd-infra-readonly-audit", serverSelectionTimeoutMS: 15000 });
await client.connect();
const s = await client.db("admin").command({ serverStatus: 1, repl: 1, metrics: 0, locks: 0, wiredTiger: 0, tcmalloc: 0 });
await client.close();
const c = s.connections || {};
console.log(JSON.stringify({ at: new Date().toISOString(), host: s.host, primary: s.repl?.ismaster ?? s.repl?.isWritablePrimary, uptimeSec: s.uptime, current: c.current, available: c.available, totalCreated: c.totalCreated, rejected: c.rejected, establishmentRateLimit: c.establishmentRateLimit, queuedForEstablishment: c.queuedForEstablishment, threaded: c.threaded, exhaustHello: c.exhaustHello, awaitingTopologyChanges: c.awaitingTopologyChanges }));
```

- 판정 규칙
  - 연결 오류·503이 많은 분에 `rejected` 증가가 몰리면 원인 확정이다. 이때 `totalCreated` 분당 증가 ÷ 60 ÷ 노드 수로 초당 생성률을 함께 적는다.
  - 오류가 많은 분에 `rejected` 증가가 없으면 가설을 버리고 다시 연다. 다음 후보는 TLS·DNS 단계 지연과 Atlas 쪽 프록시다.
  - 피크에 장애가 없으면, 평시 분당 `totalCreated` 증가로 한도까지 남은 여유를 적는다.
- 결과는 [SERVER-PERFORMANCE](../infrastructure/SERVER-PERFORMANCE.md#p1-장애-저녁-피크-db-연결-실패)의 "원인 가설과 한계"와 이 문서에 쓴다.

### 2. 경보 (GREEN)

- CF 분석은 503을 성공으로 센다. 경보는 Worker 로그를 기준으로 건다.
  - `[db-connect-error]` 분당 건수
  - 응답 중 503 비율
- 기존 계획: [DISASTER-RECOVERY](../infrastructure/DISASTER-RECOVERY.md) 런북 1(DB 연결 장애)과 [small-followups F3](2026-10-31-infra-small-followups.md).
- Atlas 경보 권장 목록은 [SECURITY-AUDIT 런북 3](../infrastructure/SECURITY-AUDIT.md#런북-3-atlas-경보-권장-목록)에 있다. 설정은 사용자가 Atlas UI에서 한다.

### 3. 연결 실패 차단기 또는 재시도 축소 (RED, 승인 10)

- 재시도에는 이미 선형 백오프와 ±30% 지터가 있다(`db.js:664`, 기본 220ms × 시도 번호). 간격이 수백 ms라 동시 요청이 많으면 전체 생성률을 낮추지 못한다. 백오프를 "추가"하는 안은 의미가 없다.
- 후보
  - isolate 단위 차단기: 연속 실패 N번 뒤 T초 동안 새 연결을 시도하지 않고 바로 503을 낸다. 결제 레인은 따로 둔다.
  - `MONGO_WORKER_CONNECT_RETRIES` 2 → 1. 1단계 수치로 효과를 먼저 추정한다.
- 제약: `worker/lib/db.js` 기본값과 `wrangler.toml [vars]`는 한 세트로 바꾼다. wrangler.toml은 값만 바꾸고 구조는 건드리지 않는다.
- 테스트: 연속 실패 뒤 차단 창 안에서 `createConnection`이 호출되지 않는다. 창이 지나면 다시 시도한다. 결제 레인은 차단되지 않는다.

### 4. 요청당 연결 수 줄이기 (RED, 설계 결정)

- 결제 요청은 공유 클라이언트에 결제 레인 클라이언트(`PAYMENTS_DB_SOCKET_LANE=1`)가 더해져 2개다. 클라이언트마다 모니터 연결도 있다.
- Task 9는 결제 레인을 **유지**로 판정했다(격리 설계). 끄는 안은 격리를 포기하는 설계 결정이라 별도 승인이 필요하다.
- 비결제 경로에서 모니터 연결을 줄이는 안(`serverMonitoringMode`, `heartbeatFrequencyMS`)부터 1단계 수치로 효과를 본다.

### 5. 클라이언트 재시도 폭주 확인 (GREEN 조사 → 수정은 별도 분류)

- 장애 창에 rpg/characters가 574 → 838로 늘었다(T-MIX). 503의 84%가 이 경로다.
- 확인할 것
  - 카드 요청은 10초 타임아웃이다. 서버가 느리면 타임아웃(status 0)이 나고, GET이라 두 번째 후보 주소(같은 Worker)로 다시 요청한다(코드 위치 표). 느린 요청이 요청 수를 두 배로 만들 수 있다. tail에서 같은 사용자·같은 경로가 10초 간격으로 두 번 오는지 본다.
  - `el.__profileCharacterProfile !== profile` 조건 때문에 프로필 객체가 바뀔 때마다 카드가 다시 마운트되는지 본다(mount → refresh 1회).
  - 쿨다운·중복 합치기 목록에 `/api/rpg/characters`를 넣는 안. 넣으면 503 뒤 5초 쿨다운이 걸린다.
- 클라이언트 수정은 결제 경로가 아니면 GREEN이다. 쿨다운은 사용자 화면에 "불러오지 못했어요"를 더 자주 보이게 할 수 있으므로 문구와 수동 재시도(`:71`)가 남는지 확인한다.

### 6. 등급 M30 검토 (승인 7)

- M30 이상은 MongoDB 9.0 미만에서 생성률 한도가 없다. 가격은 청구서로 아직 재지 않았다. 추정 금액을 만들지 말고, Atlas 가격 페이지나 청구서 단가로 잰 뒤 [COST-OPTIMIZATION](../infrastructure/COST-OPTIMIZATION.md#등급-판정-m10-유지-vs-flex)에 적는다.
- 3~5단계로 생성률을 한도 아래로 낮출 수 있으면 등급을 올리지 않는다. 낮추지 못하면 M30 비용과 장애 빈도(1단계 측정)를 나란히 놓고 판단한다.
- 등급 변경은 사전 백업·변경 계획·명시 승인 뒤에만 한다.

### 7. 연결 재사용 / DO 재판정 (승인 7)

- Task 9의 DO 판정 규칙은 연결 지연(`shared [db-connect] p50 > 150ms`) 기준이었다. 생성률 한도는 다른 축이다.
- 새 규칙 안: 1단계에서 초당 생성률이 한도의 50%를 피크에 넘으면, 연결 재사용(DO 프록시 파일럿) 계획을 [SERVER-PERFORMANCE](../infrastructure/SERVER-PERFORMANCE.md#판정-규칙과-판정)에 다시 쓴다. 범위는 핫 라우트 1~2개의 읽기 경로다.
- Hyperdrive는 MongoDB를 지원하지 않는다.

## 승인

- 승인 7: 등급 변경(M10 → M30), DO 파일럿
- 승인 10: 연결 경로 코드 변경(차단기·재시도 축소, 요청당 연결 수 축소). 경보는 GREEN이지만 채널 설정이 사용자 조치일 수 있다.
- 승인 번호는 [색인](2026-10-31-infra-followups-index.md)의 승인 표와 같다.

## 검증·롤백

- 운영 부하 시험은 금지다. 생성률 한도는 스테이징에서 재현할 수 없다(스테이징 클러스터와 트래픽이 다르다). 효과는 배포 뒤 1단계 측정을 다시 해서 본다.
- 단위 테스트: 3단계의 차단기 동작, `[vars]`와 db.js 기본값 일치(기존 가드).
- 롤백: 커밋 revert 뒤 재배포. `[vars]` 값 변경도 같은 커밋에 넣어 함께 되돌린다.

## 제약

[계획의 Global Constraints](../superpowers/plans/2026-10-31-infra-db-optimization.md#global-constraints)를 그대로 따른다. 특히:

- 운영 DB 쓰기·실결제·유료 LLM 호출은 0회다.
- 실제 측정하지 않은 성능·비용 수치를 만들지 않는다.
- 접근 권한과 Secret(MONGO_URI, Atlas 키)을 출력·커밋하지 않는다.
- 공유 체크아웃 `D:\Development\code-destiny`는 건드리지 않는다. 작업 트리에서 하고, push는 origin/main 기준 cherry-pick으로 한다.
