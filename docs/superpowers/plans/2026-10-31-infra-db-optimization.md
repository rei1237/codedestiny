# CODE DESTINY 서버·MongoDB 종합 최적화 — 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 실측 기준선 위에서 MongoDB 연결·쿼리, 유료 결과 전달 보호, 보안, DR, 비용을 개선하고 근거를 `docs/infrastructure/` 7종 문서로 남긴다. 검증된 변경만 스테이징까지 올린다.

**Architecture:** 측정 먼저 하고(Atlas Admin API GET 전용 + wrangler tail + 소량 GET 프로브), 측정 없이도 정당한 결함 수정(P0·P1)은 바로 TDD로 고친다. 클러스터 등급·DO 도입·접근망처럼 측정이 필요한 결정은 결정 규칙을 문서에 적고 수치로만 판정한다. 기존 정본(`worker/lib/db.js`, `deferred-billing-proof.js`, `reconcile.js alertPaymentAnomalies`, `ops-alert.js`, `IdempotencyKey`, `db-scope.js`)을 재사용하고 새 연결 패턴은 만들지 않는다.

**Tech Stack:** Cloudflare Workers(`code-destiny-web`, nodejs_compat, targeted placement `aws:ap-northeast-2`) · mongoose 9.3.0 / mongodb 7.1.0 · Atlas M10(3노드 RS, 서울) · Jest(`npm run test:jest`) · `check:fast` · CI "CI required".

**Spec:** 이 대화의 지시서 「CODE DESTINY — 서버·MongoDB Atlas 종합 최적화 지시서」와 「특히 집중해야 할 부분」. 추가 근거는 `docs/context/ai-and-db.md`, `docs/handoff/mongo-m10-phase2-2026-09-06.md`, `docs/handoff/2026-10-30-paid-fusion-delivery-recovery.md`, `docs/db-cost-audit-2026-08-16/04-tier-decision.md`.

---

## Context

- 2026-10-30에 초융합 유료 주문이 미전달됐다가 복구됐다. 원인은 Pro 모델 은퇴, HKG 배치, 스키마 400이었다.
- 2026-08~09 M10 최적화로 연결 전략(C1~C4), 인덱스 정리, TTL 정리는 끝났다. 하지만 배치를 ICN으로 고정(10-30)한 뒤 지연과 핸드셰이크를 아무도 다시 재지 않았다.
- 매일 약 $2인 M10 비용은 트래픽 실측(ops/s, 연결 수, 청구서 항목) 없이 판단된 적이 없다.
- 이번 작업 목표는 세 가지다.
  1. 측정이 빠진 곳을 메운다.
  2. 감사에서 확인한 결제·전달 결함을 닫는다.
  3. 등급·DO·접근망 결정을 수치로 내린다.

### 감사 결과 (origin/main 796fcc081 정적 판독, 2026-10-31)

| # | 위험도 | 발견 | 근거 |
|---|---|---|---|
| F3 | **P0** | 지연차감 취소 뒤 같은 requestId로 다시 시도하면 **두 번째 결제**를 요구한다. 첫 결제는 환불되지 않는다. | `billing.js:2520` cancel이 `generation_failed`로 바꾼다. 세 라우트의 증빙 조회가 이 상태를 빼먹는다: `karma-destiny-ai.js:857`, `new-year-ai.js:1196`, `love-secret-ai.js:642`. 정본(`deferred-billing-proof.js:43`, `payments/executions.js:7 USABLE_EXECUTION_STATUSES`)에는 포함돼 있다. 완료 CAS(`billing.js:2427`, `$nin:["refunded","cancelled"]`)는 `generation_failed → completed`를 허용한다. |
| R3 | **P1** | cancel이 **환불된 기록을 되살린다**. `findDeferredUsageRecord`(`billing.js:2388`)에는 상태 필터가 없고, cancel 쓰기(`:2532`)는 `completed`만 제외한다. 그래서 `refunded`/`cancelled` 기록에 cancel을 보내면 `generation_failed`가 된다. 이 상태를 증빙으로 받는 경로(정본 `deferred-billing-proof.js:178`, `fortune-tea-house.js:118`, `life-book-ai.js:964`)에서는 환불 뒤 다시 열 수 있다. | 환불 writer는 모두 `refunded`로 옮긴다(`executions.js:85`, `consultation-delivery-refund.js:242`, `fortune.js:4021`). cancel만 되돌리는 쪽이다. **F3보다 먼저 막아야 한다.** |
| L1 | **P0** | LLM in-flight dedup이 isolate 전역 Map으로 **요청 사이에 Promise를 공유**한다. 같은 키의 동시 요청은 다른 요청 컨텍스트의 Promise를 기다리다가 취소되거나 멈출 수 있다. | `lib/llm-cache.ts:85-98`. 같은 패턴을 `auth.js`·`access-state.js:207`에서 이미 제거했다(2026-08-09 실측 503). |
| C5 | P1 | 10분 크론 약 20개 태스크는 실패해도 로그만 남는다. 복구 스윕이 매 틱 죽어도 아무도 모른다. | `worker/index.js:1975-2073`. 알림은 일일 분기에만 있다(`:2130`). |
| R1 | P1 | 카드 자동환불이 5회 소진되면 `refund_failed`에서 멈추고 운영자 알림이 없다. | `service-execution-task.js:1005-1029` |
| P4 | P1 | 이용권 pass-check의 **영구 해금형(unlock) 경로**에서 grant → consume → unlock → evidence가 트랜잭션 밖의 별도 쓰기다. grant 뒤에 죽으면 예산을 깎지 않은 영구 해금이 남는다. consume 뒤에 죽으면 예산만 깎이고 증빙이 없다. 마커 재생 분기(`:1790`)도 증빙을 남기지 않는다. per_use 경로(`:1765`)는 이미 트랜잭션인 `consumePassForFeature`를 쓴다. | `payments/index.js:1801-1828`. 원자 패턴은 `pass-consumption.js:175-196`이고, 어댑터 `payments/db.js:86 transaction`(중첩 시 throw)을 쓴다. |
| R2 | P1 | 유료 결과가 "검토 필요"에 들어가면 **아무에게도 알리지 않고** 멈춘다. 초융합 자동환불은 카드에만 적용되고, 비카드(월정석·이용권·선물)는 `llmMeta.refundSkipped:"not_card_order"`만 찍힌 뒤 소비자가 없다. paid-narrative와 자미두수 심층도 `reviewRequired:true` 뒤로는 서버 환불과 알림이 없다. | `fusion-fortune-recovery-task.js:96-101`, `paid-narrative-recovery-task.js:74,79`, `ziwei-deep-report-recovery-task.js:86`. `refundSkipped`·`reviewRequired`를 읽는 알림 코드가 없다(grep 0건). |
| Q1 | P2 | 매 요청 새 MongoClient를 만든다(SRV+TXT DNS, 모니터 hello, 풀 소켓 TLS+SCRAM). 결제 요청은 결제 레인 때문에 클라이언트가 둘이다. ICN 고정 뒤 비용은 **미측정**이다. | `db.js:1021,1248,1336`, `wrangler.toml PAYMENTS_DB_SOCKET_LANE=1` |
| Q2 | P2 | `access.js:281-294` N+1(최대 21회 순차 왕복). 배치 버전이 `:348`/`:518`에 이미 있다. | 감사 1 |
| Q3 | P2 | 인사이트 공개 목록에 `withMongoRetry`와 캐시가 없다. | `insights.js:458-475` |
| Q4 | P2 | ops-hq 동기화가 10분마다 `ledger.find({})` 전체 스캔을 2회 한다. 원장은 계속 커진다. | `ops-hq/xp.js:194`, `ops-hq/achievements.js:65` |
| Q5 | P3 | `scripts/migrations/20260906-reconcile-index-drift.mjs:113`이 TTL 선언을 잘못 판정한다. | handoff mongo-m10-phase2 |
| Q6 | P3 | 가입 시 `users {referralCode}`를 최대 8회 COLLSCAN한다(267건, 현재 영향 미미). 인덱스 마이그레이션은 아직 실행하지 않았다. | `auth.js:200-208`, `20260830-add-request-path-indexes` |
| S1 | **HIGH** | 구독 해지 페이지 반사형 XSS. 같은 출처라 쿠키 기반 `/api` 호출과 localStorage의 `cd_premium_access_token`이 노출된다. | `subscriptions.js:236`(미이스케이프), `:243`(CSP 없음). 수정 커밋 W-1(32bffac56)이 미병합 상태다. |
| S2 | **HIGH** | 일일운세 구독 POST에 인증·레이트리밋이 없다. 임의 주소로 즉시 실메일을 보내고(메일 폭탄, Resend 평판), 해지자를 재활성화하고 남의 생년정보를 덮어쓴다. | `subscriptions.js:84-162` |
| S3 | **HIGH** | Atlas 접근 목록이 `0.0.0.0/0`인데 리포는 공개이고 이력에 클러스터 호스트와 DB 사용자명이 있다. DB 비밀번호가 유일한 장벽이다. | `docs/handoff/security-followups-codex-2026-10-13.md:34`, `inicis-security-advisory-2026-09.md:176-186` |
| S4 | **HIGH** | Capacitor 8.4.1 critical 권고(GHSA-rvm3-566m-v7fv). 8.4.3과 Android 재출시가 필요하다. | N-01(98bd06a97) 미병합 |
| S5 | MED | 운영 unique·TTL 인덱스 실물이 확인된 적 없다. 웹훅 멱등은 `{provider,eventId}` unique에 기대고 있다. | `webhook.js:157-200`, A-6 |
| S6 | MED | 무로그인 LLM 라우트 destiny-compass에 IP별 한도(30/분)만 있고 전역 한도가 없다. IP를 바꿔 가며 쓰면 월 지출 상한까지 태울 수 있고, 상한이 걸리면 **유료 생성 전체가 멈춘다**. | `destiny-compass.js:15-17,71` |
| S7 | MED | 미병합 보안 커밋 W-6(라우트 지표 토큰 미설정 시 개방), W-10(OAuth 오류 원문이 리다이렉트 URL로 샘), E-1(운영 CORS에 pages.dev·localhost), N-02(next 15.5.15 권고 2건) | `index.js:386-394,567,946`, `auth.js:4852-4860` |
| S8 | MED | Gemini 키가 도구 응답에 한 번 노출됐고 교체되지 않았다. 관리자 공용 비밀번호에 MFA·개별 폐기가 없다(M2). 탈퇴자 토큰이 결제·선물에서 최대 30분 유효하다(R-01). | `security-followups-codex-2026-10-13.md`, `admin.js:2730`, `payments/index.js:2068` |

이미 견고해서 **다시 만들지 않는** 것:
- 결정적 주문 ID와 unique 인덱스, CAS 전이, PG 사실 불일치 422 / 미도달 503 분리
- 웹훅 HMAC·리플레이, 5분 재지급 + 30분 미지급 알림
- 영냥이 큐 durable row(사실상 아웃박스), 보관함 소유권 필터
- 상품 171종 전달 인벤토리: `llmWithoutServerRecovery: []`

## Global Constraints

이 대화의 지시서와 저장소 CLAUDE.md에서 그대로 옮긴다. 모든 작업의 요구사항에 포함된다.

**데이터 보존**
- "결제 기록, 구매 결과, 크레딧 내역, 회원 자산, 월정석 기록은 비용 절감을 이유로 자동 삭제하지 마라."
- "이 과정에서 고객에게 이미 제공된 결과나 결제 내역을 삭제하거나 덮어쓰지 마라."
- "백업 비용을 줄이더라도 실제 구매 데이터의 복구 능력은 훼손하지 마라."
- "기존 인덱스 제거 및 운영 DB의 대규모 인덱스 생성은 사전 검증과 변경 계획 없이는 수행하지 마라."

**인프라 결정**
- "성급하게 다운그레이드하거나 DB를 교체하지 마라." / "MongoDB에 Cloudflare Hyperdrive를 사용할 수 있다고 가정하지 마라."
- "운영 데이터 삭제, 클러스터 등급 변경, 대규모 인덱스 삭제, 접근망 전환, 백업 축소처럼 영향이 큰 작업은 사전 백업·복구 및 변경계획을 마련하고 명시적 승인을 받은 후 진행하라."
- "운영 DB 전체에 부하를 주는 벤치마크는 금지한다."
- "성능이 거의 개선되지 않는데 운영비만 증가하는 구성은 채택하지 마라."

**보안·고객 보호**
- "개인별 운세 결과, 결제 상태, 크레딧 잔액, 인증 응답이 다른 사용자에게 노출되는 캐싱은 절대 허용하지 마라."
- "접근 제한을 변경하기 전 반드시 기존 서비스 연결이 유지되는지 확인하라." / "보안 강화 때문에 정상 고객의 결제·로그인·결과 열람이 차단되지 않도록 테스트하라."

**측정·보고 정직성**
- "실제 측정하지 않은 성능·비용 수치를 만들어내지 않는다." / "운영 배포 권한이 없으면 성공했다고 주장하지 말고 미배포 상태를 명확하게 보고하라."

**저장소 CLAUDE.md 규칙**
- 유료 LLM 실호출 금지(mock 기본). 실결제·운영 DB 쓰기·환불·정산 금지.
- `.env*`, `package-lock.json`, `.wrangler/`, `dist/`, `out/`, `worker/wrangler.toml` 구조는 수정 금지.
- secret을 출력·저장·커밋하지 않는다.
- 새 `withTransaction`은 `mongoTransactionOptions()`를 넘긴다. 새 인덱스는 선언과 `scripts/migrations/` 항목을 함께 두고 `verify:mongo-query-index-shapes`를 통과해야 한다. `worker/lib/db.js` 기본값은 `[vars]`와 일치해야 한다.
- 공유 체크아웃(`D:\Development\code-destiny`, 다른 세션이 작업 중)은 건드리지 않는다. 작업 트리에서 하고, push는 origin/main 기준 cherry-pick으로 한다. push는 스테이징 배포다. 운영 승격은 1회성 명시 요청이 있을 때만 한다.
- 커밋 꼬리: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. 보고는 한국어로 한다.

## Review Focus

1. **같은 requestId 재시도와 환불 뒤 cancel**(F3·R3): 취소된 지연차감 기록이 남아 있으면 재시도는 결제창 없이 기존 결제로 생성을 다시 이어야 한다. 환불된 기록에 cancel을 보내도 `refunded`가 유지돼야 하고, 증빙으로 쓰이면 안 된다. → Task 3에 "refunded + cancel → 상태 불변·증빙 아님" 테스트를 둔다.
2. **같은 프롬프트의 동시 요청 두 건**(L1): 서로 다른 요청이면 각자 결과를 받아야 하고, 한쪽이 끊겨도 다른 쪽이 멈추면 안 된다. 한 요청 안의 중복은 계속 합쳐져야 한다. → Task 4.
3. **DB 장애 중 10분 크론 실패**(C5): 중복 억제 키를 못 쓰는 상황이 가장 알려야 할 상황이다. 알림이 막히면 안 되고 시간당 소음도 제한해야 한다. → Task 5에 "IdempotencyKey 쓰기 실패 시에도 isolate 메모로 1회 발송" 테스트를 둔다.
4. **알림 채널 미설정이나 발송 실패**(R1): 표식을 남기지 않고 다음 틱에 다시 보내야 한다. 기존 섹션 A·B의 계약과 같다. → Task 6.
5. **이용권 소비 중간 예외**(P4): 소비만 되고 증빙이 없는 상태가 생기면 안 된다. 같은 요청을 재시도하면 두 번 소비되지 않아야 한다. → Task 7.

---

## Task 0: 작업 트리 준비

**Files:** 없음(작업 환경)

- [ ] **Step 1:** `D:\Development\code-destiny`에서 `powershell -File scripts/create-safe-worktree.ps1 -Slug infra-optimization`을 실행한다. 기준은 origin/main이고, 결과는 `D:\Development\codedestiny-worktrees\infra-optimization-<stamp>`에 생긴다.
- [ ] **Step 2:** 작업 트리에서 `npm ci --ignore-scripts`를 실행한다(lock 파일은 수정하지 않는다). 그다음 `npm run check:fast`로 기준 통과를 확인한다. 실패하면 사전 실패로 기록하고 이후 비교 기준으로 쓴다.
- [ ] **Step 3:** 이 계획을 `docs/superpowers/plans/2026-10-31-infra-db-optimization.md`로 복사한다. 이 세션은 이미 한 번 압축됐으므로, 진행 상태(완료 Task, 다음 Task, 실측 파일 경로)를 담은 `docs/handoff/2026-10-31-infra-db-optimization.md`도 함께 만들고 커밋한다. Task가 끝날 때마다 이 인수인계 문서를 갱신한다.

## Task 1: Atlas 읽기 전용 스냅샷 도구 + 실측 (PHASE 1·2·4·6·7의 수치 근거)

**Files:**
- Create: `scripts/audit-atlas-readonly.mjs`
- Create: `scripts/lib/atlas-readonly-client.mjs`
- Test: `__tests__/scripts/atlas-readonly-client.test.js`
- Modify: `package.json` scripts에 `"audit:atlas-readonly": "node scripts/audit-atlas-readonly.mjs"`를 추가한다(scripts 항목만, lock은 건드리지 않는다).

**Interfaces:**
- Produces: `createAtlasReadonlyClient({ publicKey, privateKey, fetchImpl?, cnonce? }) → { get(path: string): Promise<object> }`
  - `get` 이외의 메서드는 없다.
  - path가 `ALLOWED_GET_PREFIXES`에 없으면 throw한다.
  - HTTP Digest(RFC 2617, MD5, qop=auth)를 `node:crypto`로 직접 계산한다. 첫 요청의 401 `WWW-Authenticate`로 받은 nonce로 재요청한다. 외부 프로세스는 띄우지 않으므로 secret이 프로세스 인자에 남지 않는다.
- Produces: `redactAtlasSnapshot(snapshot) → snapshot`
  - IP·CIDR은 /16까지만 남긴다(`0.0.0.0/0`은 그대로 둔다).
  - DB 사용자명은 앞 2자 + `***`로 줄인다.
  - 키·토큰·연결 문자열 필드는 제거한다.

- [ ] **Step 1: 실패하는 테스트 작성**

```js
test("get 외 메서드가 없고 허용 목록 밖 경로를 거부한다", async () => {
  const client = createAtlasReadonlyClient({ publicKey: "p", privateKey: "s", fetchImpl: async () => { throw new Error("no call"); } });
  expect(Object.keys(client)).toEqual(["get"]);
  await expect(client.get("/api/atlas/v2/groups/x/clusters/y/restoreJobs")).rejects.toThrow(/not allowed/);
});
test("Digest 응답값이 RFC 2617 예제와 같고 모든 요청이 GET이다", async () => {
  // RFC 2617 §3.5 벡터: Mufasa / "Circle Of Life" / testrealm@host.com / nonce dcd98b… / cnonce 0a4f113b / nc 00000001
  const calls = [];
  const fetchImpl = async (url, init) => { calls.push(init); return calls.length === 1
    ? new Response("", { status: 401, headers: { "www-authenticate": 'Digest realm="testrealm@host.com", qop="auth", nonce="dcd98b7102dd2f0e8b11d0f600bfb0c093", opaque="5ccc069c403ebaf9f0171e9517f40e41"' } })
    : new Response("{}", { status: 200 }); };
  const client = createAtlasReadonlyClient({ publicKey: "Mufasa", privateKey: "Circle Of Life", fetchImpl, cnonce: "0a4f113b", baseUrl: "http://www.nowhere.org", pathPrefix: "" });
  await client.get("/dir/index.html", { allowUnlisted: true, _testOnly: true });
  expect(calls.every((c) => c.method === "GET")).toBe(true);
  expect(calls[1].headers.Authorization).toContain('response="6629fae49393a05397450978507c4ef1"');
});
test("redact: IP는 /16로 줄이고 0.0.0.0/0은 유지, 사용자명 마스킹", () => {
  const out = redactAtlasSnapshot({ accessList: [{ cidrBlock: "203.0.113.7/32" }, { cidrBlock: "0.0.0.0/0" }], dbUsers: [{ username: "appuser", roles: [] }] });
  expect(out.accessList.map(r => r.cidrBlock)).toEqual(["203.0.x.x/32", "0.0.0.0/0"]);
  expect(out.dbUsers[0].username).toBe("ap***");
});
```

- [ ] **Step 2:** `npm run test:jest -- __tests__/scripts/atlas-readonly-client.test.js`를 실행한다. 모듈이 없어 FAIL이 나야 한다.
- [ ] **Step 3: 구현**
  - 인증은 programmatic API key의 HTTP Digest다. Node fetch는 Digest를 내장하지 않으므로 위 Interfaces처럼 `node:crypto` MD5로 직접 계산한다. 테스트 전용 옵션(`baseUrl`, `pathPrefix`, `allowUnlisted`)은 `_testOnly` 없이는 무시해 운영 실행에서 허용 목록을 우회할 수 없게 한다.
  - Accept는 `application/vnd.atlas.2023-02-01+json`이다. 실행 전에 각 엔드포인트가 받는 버전을 Atlas Admin API v2 문서로 확인한다.
  - `ALLOWED_GET_PREFIXES`는 아래 목록이다. groupId·clusterName·processId·orgId는 앞 호출 결과에서 얻는다.
    - `/groups`
    - `/groups/{g}/clusters`
    - `/groups/{g}/processes`
    - `/groups/{g}/processes/{p}/measurements`
    - `/groups/{g}/processes/{p}/performanceAdvisor/suggestedIndexes`
    - `/groups/{g}/processes/{p}/performanceAdvisor/slowQueryLogs`
    - `/groups/{g}/accessList`
    - `/groups/{g}/databaseUsers`
    - `/groups/{g}/clusters/{c}/backup/schedule`
    - `/groups/{g}/clusters/{c}/backup/snapshots`
    - `/groups/{g}/alertConfigs`
    - `/groups/{g}/auditLog`
    - `/orgs/{o}/invoices`(최근 3개월) 및 `/orgs/{o}/invoices/{id}`
  - measurements 기간은 `P30D`, 단위는 `PT1H`다. 지표: `CONNECTIONS`, `OPCOUNTER_QUERY|INSERT|UPDATE|DELETE|GETMORE|CMD`, `NETWORK_BYTES_IN|OUT`, `NETWORK_NUM_REQUESTS`, `SYSTEM_NORMALIZED_CPU_USER`, `PROCESS_CPU_USER`, `QUERY_TARGETING_SCANNED_OBJECTS_PER_RETURNED`, `DISK_PARTITION_SPACE_USED_DATA`, `LOGICAL_SIZE`.
  - 출력은 두 갈래다.
    - 원본: `D:\Development\code-destiny-backups\atlas-snapshots\<YYYYMMDD-HHmm>\raw.json`. 리포 밖이고 커밋하지 않는다.
    - 요약: `redactAtlasSnapshot`을 거친 `summary.json`과 콘솔 표. 노드별 30일 p50/p95/max(연결, ops/s 합계, NET out GB/일, CPU%), 청구서 항목별 금액(클러스터, 백업, 데이터 전송), auto-scaling 설정, PITR 여부, 스냅샷 주기·보존, 접근 목록, DB 사용자 역할.
  - 키는 사용자 셸 환경변수 `ATLAS_PUBLIC_KEY`·`ATLAS_PRIVATE_KEY`·`ATLAS_ORG_ID`·`ATLAS_GROUP_ID`에서만 읽는다. `.env*`에는 쓰지 않고, 출력하지 않는다.
- [ ] **Step 4:** 테스트 PASS를 확인한다.
- [ ] **Step 5 (사용자 준비 필요):** 사용자가 Atlas → Organization Access Manager → Applications → API Keys에서 키를 발급하고 환경변수를 설정한다.
  - 권한: Organization **Billing Viewer**, Project **Read Only**.
  - Org 설정에 API Access List 필수가 켜져 있으면 실행 PC의 공인 IP를 등록해야 한다.
  - 설정 후 `npm run audit:atlas-readonly`를 실행한다. 성공 기준은 summary 표의 모든 항목에 값이 있거나 "권한 없음" 사유가 표시되는 것이다.
- [ ] **Step 6:** 커밋 `feat(ops): Atlas Admin API 읽기 전용 스냅샷 감사 도구`를 남긴다.

## Task 2: Worker 기준선 실측 (배치 ICN 고정 이후 첫 측정)

**Files:**
- Create: `scripts/lib/worker-tail-db-connect.mjs`. `summarizeDbConnect(events) → { shared:{count,p50,p95,p99}, payment:{count,p50,p95,p99}, connectsPerRequest:{p50,max}, counters:{dbPing,dbOpAdmission,dbOpTimeout,dbConnectError,eventEmitterLeak} }`.
  - 입력 `events`는 tail JSON 이벤트 배열이다. 각 이벤트의 `logs[].message`에서 `[db-connect] mongodb connected successfully. lane=shared … elapsedMs=N`(`db.js:1271`)과 `[db-connect] payment lane connected. elapsedMs=N`(`db.js:1440`)을 파싱한다.
  - 기존 스크립트는 최상위 즉시 실행 구조라 import할 수 없어서 순수 함수를 따로 둔다.
- Modify: `scripts/report-worker-tail-latency.mjs`. 위 함수를 import해 기존 라우트 표 아래에 "DB 연결" 표를 출력한다. 기존 출력은 바꾸지 않는다.
- Test: `__tests__/scripts/worker-tail-db-connect.test.js`(jest, 같은 폴더의 `birth-scope-unlock-plan.test.js` 형식).

- [ ] **Step 1:** 집계 테스트를 작성한다.
  - 입력 이벤트 4건: E1 shared `elapsedMs=120`, E2 shared `180`, E3 shared `900`과 shared `150`(한 요청에 2회), E4 payment `300`.
  - 기대값: `shared.count === 4`, `shared.p50 === 150`(정렬 [120,150,180,900]의 nearest-rank 2번째), `shared.p99 === 900`, `payment.count === 1`, `connectsPerRequest.max === 2`.
  - 백분위는 nearest-rank로 계산하고, 그 기준을 함수 머리 주석에 적는다.
  - `npm run test:jest -- worker-tail-db-connect`로 FAIL을 확인한다.
- [ ] **Step 2:** 구현 → PASS → 커밋 `feat(ops): tail 지연 리포트에 DB 연결 단계 집계 추가`.
- [ ] **Step 3: 운영 읽기 전용 측정.** 쓰기·결제·LLM은 없고 소량 GET만 한다.
  - `curl -s -o /dev/null -D - https://code-destiny.com/api/health | grep -i cf-placement`. 기대값은 `remote-ICN` 계열이다.
  - `npx wrangler tail code-destiny-web --config worker/wrangler.toml --format json > D:\Development\code-destiny-backups\tail\<stamp>.jsonl`. 피크(KST 21~23시)를 포함해 60분 이상 받는다. IP·헤더가 있으므로 리포 밖에 두고 커밋하지 않는다.
  - `npm run report:worker-tail-latency -- <파일>`로 라우트별 wallTime p50/p95/p99와 DB 연결 단계를 뽑는다.
  - `npm run measure:post-deploy-latency -- --base https://code-destiny.com --iterations 10`. 공개 GET만 쓰고 부하 시험이 아니다.
  - Cloudflare 요청 수, CPU p50/p99, 서브요청, 오류율(최근 7일): wrangler OAuth 토큰으로 GraphQL `workersInvocationsAdaptive`를 시도한다. 권한이 없으면 대시보드 값을 사용자에게 받는다.
  - 크론·큐 실행 위치: tail 이벤트의 `scheduled`/`queue` 항목에서 colo와 Gemini 위치 오류(`User location is not supported`) 건수를 센다.
- [ ] **Step 4:** 결과를 `docs/infrastructure/INFRASTRUCTURE-AUDIT.md` §기준선 표에 기록한다. 측정 시각, 도구, 표본 수를 함께 적는다. 값이 없는 칸은 "미측정 — 계측 방법"으로 쓴다.

## Task 3: [P0·P1] cancel의 환불 부활 차단(R3) → 취소 후 재결제 차단(F3)

R3를 먼저 고친다. 그렇지 않으면 F3가 증빙 범위를 넓혀 부활 경로를 세 라우트로 더 퍼뜨린다. 두 수정은 한 커밋으로 묶는다.

**Files:**
- Modify: `worker/routes/billing.js:2529,2533`. **줄 수를 늘리지 않는다**(현재 6493줄, 동결 상한 6494).
  - 2529행은 같은 줄에서 조건을 바꾼다: `if (!record || ["completed", "refunded", "cancelled", "canceled"].includes(record.status)) {`.
  - 2533행 필터에 `status: { $in: ["paid_pending_generation", "generating", "generation_failed"] }`를 덧붙인다(같은 줄). 동시에 환불이 끼어들어도 CAS로 막힌다.
- Modify: `worker/routes/karma-destiny-ai.js:857`, `worker/routes/new-year-ai.js:1196`, `worker/routes/love-secret-ai.js:642`.
  - 상태 배열 사본을 기존 export `USABLE_EXECUTION_STATUSES`(`worker/payments/executions.js:7`, 값 `["paid_pending_generation","generating","completed","generation_failed"]`)로 바꾼다. 새 상수는 만들지 않는다.
  - love-secret은 레거시 결제 상태도 유지하므로 `[...USABLE_EXECUTION_STATUSES, "paid", "success", "fulfilled"]`로 쓴다(빠져 있던 `generating`도 이렇게 들어간다).
- Test: `__tests__/worker/deferred-cancel-retry-no-double-charge.test.js`

**Interfaces:**
- Consumes: `USABLE_EXECUTION_STATUSES` (`worker/payments/executions.js:7`, 기존 export, 변경 없음)

- [ ] **Step 1: 실패하는 테스트**
  - (a) R3: `PaidExecutionRecord{status:"refunded"}`에 `POST /coin-gate/deferred/cancel`을 보낸다. 응답은 200이고 기록 `status`는 `"refunded"` 그대로다. `"cancelled"`도 같다.
  - (b) R3 경쟁: `findDeferredUsageRecord`가 `generating`을 읽은 뒤 DB 상태가 `refunded`로 바뀐 경우를 모킹한다. updateOne 필터에 `status.$in`이 들어가서 matched 0이어야 한다(필터 인자 단언).
  - (c) F3, 세 라우트 `describe.each`: `{status:"generation_failed", requestId:R}` 기록이 있을 때 같은 R의 증빙 조회는 `ok:true`, `paymentId === String(record._id)`, `deferredUsage === true`이고 402가 없다.
  - (d) F3 부정: `{status:"refunded"}` 기록은 세 라우트 모두 증빙이 아니다.
- [ ] **Step 2:** `npm run test:jest -- deferred-cancel-retry`로 (a)·(b)·(c)가 FAIL인지 확인한다.
- [ ] **Step 3:** 위 Files대로 구현한다.
- [ ] **Step 4:** PASS를 확인한다. 이어서 `npm run test:jest -- deferred-billing-proof love-secret karma-destiny new-year billing.deferred`로 회귀를 보고, `node scripts/verify-payment-freeze.mjs`(또는 `check:payment` 안의 동결 검사)를 통과시킨다.
- [ ] **Step 5:** 커밋 `fix(billing): cancel이 환불 기록을 되살리지 않게 하고 취소 기록을 재시도 증빙으로 인정`. 본문에 R3/F3 근거 줄 번호를 적는다.

## Task 4: [P0] LLM in-flight dedup을 요청 범위로 한정 (L1)

`llm-cache.ts`는 의존성 없이 유지한다. 기존 `__tests__/ui/llm-cache-quality.behavior.test.js`가 이 파일을 `ts.transpileModule`로 CJS 변환해 `require`가 없는 `vm` 샌드박스에서 돌리기 때문에, import를 추가하면 그 테스트가 깨진다. 그래서 스코프는 유일한 호출부(`lib/llm-client.ts:1302`)가 config로 넘긴다.

**Files:**
- Modify: `lib/llm-cache.ts`
  - `LLMCacheConfig`(8행)에 `inflightScope?: string`을 추가한다.
  - `deduplicatedCall(cacheKey, callFn, scope?: string)`는 `scope`가 빈 문자열이거나 없으면 **공유하지 않고** `callFn()`을 그대로 돌려준다. 있으면 Map 키를 `${scope}\u0000${cacheKey}`로 쓴다.
  - `withLLMCache` 170행은 `config?.inflightScope`를 넘긴다. 주석 1줄을 단다: 요청 간 Promise 공유 금지, 근거 `worker/routes/access-state.js:207`.
- Modify: `lib/llm-client.ts:1302`. config를 `{ ...localized.cache, inflightScope: currentDbScopeId() || "" }`로 넘긴다. `currentDbScopeId`는 `../worker/lib/db-scope.js:92`에서 import한다(이 파일은 이미 `../worker/lib/*`를 import한다).
- Test: `__tests__/ui/llm-cache-inflight-scope.test.js`(node:test, `llm-cache-quality.behavior.test.js`와 같은 vm 로딩 방식). 배선 확인은 `llm-client.ts` 소스에 `inflightScope: currentDbScopeId()`가 있는지 보는 정적 단언 1건으로 같은 파일에 둔다. jest는 `llm-client.ts`를 모킹하므로 쓰지 않는다.

**Interfaces:**
- Produces: `LLMCacheConfig.inflightScope?: string`, `deduplicatedCall(cacheKey: string, callFn, scope?: string)`
- Consumes: `currentDbScopeId(): string | null` (`worker/lib/db-scope.js:92`)

- [ ] **Step 1: 실패하는 테스트**
  - (a) 같은 request, 서로 다른 `inflightScope`("A", "B")로 `withLLMCache`를 부른다. A의 callUncached는 끝나지 않는 Promise다. 그래도 B는 자기 결과로 끝나고, callUncached는 2회 호출된다.
  - (b) 같은 `inflightScope`로 동시 2건이면 callUncached는 1회다.
  - (c) `inflightScope`가 없으면 동시 2건에 callUncached 2회다(안전한 기본값).
  - (d) 정적 단언: `lib/llm-client.ts`에 `inflightScope: currentDbScopeId()`가 있다.
- [ ] **Step 2:** `node --test __tests__/ui/llm-cache-inflight-scope.test.js`로 FAIL을 확인한다. (a)는 현재 전역 공유 때문에 타임아웃, (c)는 1회 호출이 나와야 한다.
- [ ] **Step 3:** 위 Files대로 구현한다.
- [ ] **Step 4:** PASS를 확인한다. 이어서 `node --test __tests__/ui/llm-cache-quality.behavior.test.js __tests__/ui/yeongnyangi-response-cache.test.mjs`와 `npm run test:jest -- llm`으로 회귀를 확인한다.
- [ ] **Step 5:** 커밋 `fix(llm): in-flight dedup을 요청 스코프로 한정해 교차 요청 Promise 공유 제거`.

## Task 5: [P1] 10분 크론 실패 알림 (시간당 태스크별 1회)

**Files:**
- Create: `worker/lib/cron-tick-failure-alert.js`
- Modify: `worker/index.js:1975-2073`. 각 `ctx.waitUntil(...catch(...))`의 catch에서 `failures.push({name, message})`만 하도록 바꾼다. 분기 끝에서는 모든 태스크 Promise를 `allSettled`로 모은 뒤 `notifyTickFailures`를 waitUntil 1개로 부른다. 태스크 격리(각자 catch)와 실행 순서는 유지한다.
- Test: `__tests__/worker/cron-tick-failure-alert.test.js`

**Interfaces:**
- Produces: `notifyTickFailures(env, failures: Array<{name:string,message:string}>, { now?: Date, send?: Function, model?: IdempotencyKey }) → Promise<{sent:string[], suppressed:string[]}>`
  - 키: `endpoint:"cron10-failure-alert"`, `keyHash:"<task>:<KST YYYY-MM-DDTHH>"`, `userId:null`, `expiresAt: now+3h`. 태스크마다 `IdempotencyKey.create`를 시도해서 11000이 나면 suppressed다.
  - create가 11000 외의 이유로 실패하면(DB 장애) isolate-local `Map<task,hourBucket>`로 억제하고 **발송한다**.
  - 발송은 `ops-alert.js sendOperatorAlert(env, notifyOperators, message)`로 한다(운영자 전용 채널, 고객 데이터 없음). 한 틱에 1통이다.

- [ ] **Step 1: 실패하는 테스트**
  - (a) 같은 시간대 두 번째 호출은 suppressed이고 send는 1회다.
  - (b) 시간대가 바뀌면 다시 발송한다.
  - (c) `model.create`가 `MongoServerSelectionError`를 던져도 send가 1회 호출된다.
  - (d) failures가 비면 DB 호출 0회, send 0회다.
  - (e) 메시지에 태스크 이름, 사유 200자, "Workers Logs에서 [<task>] 검색" 안내가 들어간다.
- [ ] **Step 2:** FAIL 확인 → 구현 → PASS를 확인한다.
- [ ] **Step 3:** `npm run verify:cron-mongo-op-coverage`와 `npm run verify:mongo-query-index-shapes`를 실행한다. `idempotency_keys`의 unique `{userId,endpoint,keyHash}`를 쓰므로 새 인덱스가 필요 없음을 확인한다.
- [ ] **Step 4:** 커밋 `feat(cron): 10분 크론 태스크 실패를 시간당 1회 운영자 알림으로 표면화`.

## Task 6: [P1] 환불 실패(R1)·전달 검토 대기(R2) 운영자 알림

R2는 **알림만** 추가한다. 비카드 자동 복원(월정석·이용권 반환) 같은 환불 정책 변경은 승인 항목으로 남긴다.

### 6A. 환불 실패 (alertPaymentAnomalies 섹션 C)

**Files:**
- Modify: `worker/payments/reconcile.js:227-289`
  - 섹션 C 조회: `ServiceExecutionTransaction{refundStatus:"refund_failed", refundFailedAt:{$gte: now-30d}, "metadata.refundFailureAlert":{$exists:false}}`, `limit`, `sort:{refundFailedAt:1}`.
  - 전달에 성공한 뒤에만 CAS로 `$set metadata.refundFailureAlert.lastAlertedAt`을 찍는다(A·B와 같은 계약).
- Modify: `worker/payments/fulfillment-alert.js`. `buildPaymentAlert`에 refundFailures 섹션을 추가한다. 실행 ID는 `maskId` 뒤 8자, 서비스ID, 결제수단, `reasonCode`, 경과시간만 넣고 userId·이메일은 넣지 않는다.
- Test: 확장 `__tests__/worker/payments-v2.fulfillment-alert.test.js`, `__tests__/worker/payments-v2.reconcile.test.js`

**Interfaces:**
- Produces: `alertPaymentAnomalies(...)`의 summary에 `refundFailures: number`를 추가한다.

- [ ] **Step 1: 실패하는 테스트**
  - (a) refund_failed 1건 → 알림 본문에 "환불 실패" 섹션, 표식 1건.
  - (b) notify가 `delivered:false` → 표식 0건.
  - (c) 이미 표식이 있는 건은 조회되지 않는다.
  - (d) 본문에 userId 문자열이 없다.
- [ ] **Step 2:** FAIL → 구현 → PASS를 확인한다. `npm run verify:mongo-query-index-shapes`도 실행한다. `refundStatus` 단일 인덱스가 실재하지 않으면 allowlist에 "수 건 규모, 30일 창" 근거로 등록하고, 인덱스는 만들지 않는다.
- [ ] **Step 3:** 커밋 `feat(payments): 자동환불 소진(refund_failed)을 운영자 알림에 포함`.

### 6B. 전달 검토 대기 알림 (새 모듈, 10분 크론)

**Files:**
- Create: `worker/lib/delivery-review-alert.js`
- Modify: `worker/index.js`의 10분 크론 분기. Task 5와 같은 방식으로 태스크 1개(`deliveryReviewAlert`)를 추가해 실패도 Task 5 알림을 탄다.
- Test: `__tests__/worker/delivery-review-alert.test.js`

**Interfaces:**
- Produces: `alertDeliveryReviews(env, { now?: Date, send?: Function, limit?: number = 20 }) → Promise<{ found: number, delivered: boolean, marked: number }>`
  - 조회 대상 3종. 모두 `createdAt >= now-30d`이고 표식이 없는 건만 본다.
    - `FusionFortuneConsultation`: `llmMeta.refundSkipped:"not_card_order"` 또는 (`generationSnapshot.recovery.reviewRequired:true`이고 `llmMeta.refundEligibleAt` 없음). 표식 `llmMeta.reviewAlertAt`.
    - `ServiceExecutionTransaction`: `metadata.paidNarrativeRecovery.reviewRequired:true`. 표식 `metadata.paidNarrativeRecovery.reviewAlertAt`.
    - `ZiweiDeepReport`: `llmMeta.recovery.reviewRequired:true`. 표식 `llmMeta.recovery.reviewAlertAt`.
  - 본문에는 종류, `maskId` 뒤 8자, 상품·기능 키, 사유 코드, 경과 시간만 넣는다. userId·이메일·생년정보·결과 본문은 넣지 않는다.
  - 발송은 `sendOperatorAlert(env, notifyOperators, message)`다. 전달 성공 뒤에만 표식을 `$set`하고, `{ timestamps: false }`로 `updatedAt`을 건드리지 않는다. 고객 결과 필드는 읽지도 쓰지도 않는다.

- [ ] **Step 1: 실패하는 테스트**
  - (a) 세 종류 각 1건 → 알림 1통에 3건, 표식 3건.
  - (b) 발송 `delivered:false` → 표식 0건, 다음 호출에서 다시 조회된다.
  - (c) 표식이 있는 건과 30일 넘은 건은 조회되지 않는다.
  - (d) 본문에 userId와 이메일 문자열이 없다.
  - (e) 표식 쓰기의 업데이트 문서에 `$set` 표식 경로 외의 필드가 없다(결과 덮어쓰기 금지 단언).
- [ ] **Step 2:** FAIL → 구현 → PASS를 확인한다. `npm run verify:mongo-query-index-shapes`와 `npm run verify:cron-mongo-op-coverage`도 실행한다. 새 조회 모양은 allowlist에 "30일 창·수 건 규모"로 등록하고 인덱스는 만들지 않는다.
- [ ] **Step 3:** 커밋 `feat(ops): 유료 결과 전달 검토 대기(비카드 초융합·서사형·자미두수)를 운영자 알림으로 표면화`.

## Task 7: [P1·RED] 이용권 pass-check 원자화 (P4)

grant를 먼저 하는 순서는 **유지한다**. `:1795-1800` 주석의 계약대로, 이미 가진 콘텐츠의 재열람이 월 예산을 다시 깎지 않게 하려고 소유 확인을 먼저 한다. 바꾸는 것은 원자성뿐이다.

**Files:**
- Modify: `worker/payments/index.js:1801-1828`(unlock 분기). `grantEntitlement` → `consumePassCoverage` → (CAS 패배 시 `dropEntitlementByIdentity`) → `markUserFeatureUnlocked` → `recordPassUsageEvidence`를 `db.transaction(async tx => ...)` 하나 안에서 같은 순서로 실행한다. 각 함수에는 `tx`를 넘긴다.
  - `alreadyOwned`면 트랜잭션 안에서 바로 반환한다.
  - CAS 패배면 tx 안에서 drop한 뒤 conflict를 반환한다. null 반환은 커밋되므로 drop을 생략하면 안 된다.
  - 패턴은 `pass-consumption.js:191-196`과 같다. `db`는 `withDb`의 카운팅 어댑터라 `transaction`을 지원하고(`payments/db.js:86`), 이 분기는 바깥 트랜잭션 안이 아니므로 중첩 오류가 없다.
- Modify: `worker/payments/index.js:1790` 마커 재생 분기. 반환 전에 `recordPassUsageEvidence(db, ...)`를 부른다(`pass-consumption.js:176`과 같다). 이 함수는 결정적 `_id`에 `$setOnInsert` upsert라 멱등이다(`passes.js:660-695`).
- Test: 기존 `__tests__/worker/payments-v2.pass-check.test.js`의 "라우트 — 왕복 예산·소비·봉투" describe를 확장한다.

**Interfaces:**
- Consumes: `grantEntitlement(db, …)`, `dropEntitlementByIdentity(db, …)`, `markUserFeatureUnlocked(db, …)` (`payments/entitlements.js:153,290,264`), `consumePassCoverage(db, …)`, `recordPassUsageEvidence(db, …)` (`payments/passes.js:543,660`). 시그니처는 바꾸지 않고 첫 인자에 `tx`를 넘긴다.

- [ ] **Step 1: 실패하는 테스트**(unlock형 상품, fake-payment-db 픽스처의 트랜잭션 롤백 지원 확인 후)
  - (a) `recordPassUsageEvidence`에서 throw하면 이용권 `monthlySpendCoin`, ContentEntitlement, `featureUnlocks`가 모두 변하지 않는다.
  - (b) `consumePassCoverage` 직전 throw → ContentEntitlement가 없다(무료 해금 없음).
  - (c) 같은 requestId 두 번 → 소비 1회, PointHistory 1행.
  - (d) 마커는 있고 PointHistory가 없는 사용자(구 경로 잔재)의 재요청 → 200, PointHistory 1행 생성.
  - (e) 기존 182행 "왕복 2회" 단언과 231행 재열람 무과금 단언이 그대로 통과한다.
- [ ] **Step 2:** FAIL → 구현 → PASS를 확인한다. 이어서 `npm run check:payment`와 `npm run verify:payment-concurrency-guards`를 실행한다.
- [ ] **Step 3:** 커밋 `fix(payments): 이용권 영구 해금 경로의 지급·소비·증빙을 단일 트랜잭션으로 묶음`. RED 분류다. 위험(트랜잭션 재시도 시 재실행되므로 각 쓰기가 멱등이어야 함, 확인 완료), 검증, 롤백(커밋 revert)을 커밋 본문에 적는다.

## Task 8: [P2] Mongo 쿼리 핫스팟

**Files:**
- Modify: `worker/routes/access.js:281-294`. 행별 `Payment.findOne` 루프를 같은 파일 `:348`/`:518`의 배치 조회(`$in`, 1회)로 바꾼다.
- Modify: `worker/routes/insights.js:458-475`. aggregate 2개를 `withMongoRetry`로 감싸고, 공개 목록 응답을 `worker/lib/cms-cache.js`로 캐시한다(30s fresh / 900s stale). **사용자별 필드가 없는 응답인지 먼저 확인한다.** `q` 검색과 로그인 상태에 따라 달라지는 필드가 있으면 그 경로는 캐시하지 않는다.
- Modify: `worker/ops-hq/xp.js:194`, `worker/ops-hq/achievements.js:65`. 원장 전체 `find({})`를 `$group` 집계 1회(`total`, `bySource`, `byMastery`)로 바꾼다. achievements의 타임라인은 아직 달성하지 않은 업적이 있을 때만 읽는다. 결과 값은 기존과 같아야 한다.
- Modify: `scripts/migrations/20260906-reconcile-index-drift.mjs:113`. TTL 선언(`expireAfterSeconds`)을 옵션까지 비교해 판정한다.
- Test: 각 대상의 기존 테스트 파일을 확장한다.
  - access: N행 → `Payment.find` 1회.
  - insights: 두 번째 호출은 DB 0회. 일시 오류 1회 후 성공.
  - ops-hq: 집계 결과가 기존 루프 결과와 같다(고정 원장 50행).
  - drift: TTL 선언 일치 시 drift 0.

- [ ] **Step 1:** 네 대상별로 실패 테스트 작성 → FAIL → 구현 → PASS를 반복한다. 대상마다 커밋 1개를 남긴다.
- [ ] **Step 2:** `npm run verify:mongo-query-index-shapes`와 `npm run verify:worker-size`를 실행한다.
- [ ] **Step 3 (승인 게이트, RED):** 운영 인덱스 생성 `20260830-add-request-path-indexes`(`users {referralCode:1}`, 267건)를 진행한다. 순서는 `backup:mongo` → `--dry-run` → 승인 → 실행 → explain IXSCAN 확인이고, 롤백은 `dropIndex`다. **승인 전에는 실행하지 않는다.**

## Task 9: 측정 기반 결정 (코드 변경은 게이트 통과 시에만)

결정 규칙은 문서에 먼저 적는다. 판정은 Task 1·2 수치로만 한다.

- **DO 연결 프록시:**
  - `shared [db-connect] p50 > 150ms` 이고 DB를 쓰는 요청 비중이 50%를 넘을 때만 파일럿 계획을 별도 문서로 세운다.
  - 파일럿 대상은 핫 라우트 1~2개의 읽기 경로뿐이다. 현재 mongoose 모델 100+ 라우트를 DO RPC로 옮겨야 하고(모델·트랜잭션은 RPC로 반환할 수 없음), 2026-09 검토에서 기각된 바 있다(`docs/handoff/yeongnyangi-paid-result-attach-503.md:129`).
  - 이 기준 밖이면 "도입하지 않음"과 수치를 기록한다. Hyperdrive는 MongoDB를 지원하지 않는다.
- **결제 레인 2번째 클라이언트**(`PAYMENTS_DB_SOCKET_LANE`): `payment lane connected` p50과 결제 확정 p95를 기록한다. 끄는 것은 격리 설계를 바꾸는 일이라 이번 범위 밖이고, 수치만 남긴다.
- **`SECURITY_DB_TIMEOUT_MS=1000`(fail-open):** ICN 이후 첫 op p95가 800ms 미만이면 유지한다. 넘으면 조정안을 승인 항목으로 올린다.
- **M10 유지 vs Flex vs 상한:**
  - 판정 입력: 30일 ops/s p95·max(Flex 상한 500), 연결 수 max(Flex 500), 데이터 크기(Flex 5GB), 청구서 항목.
  - Flex는 PITR·주문형 스냅샷·Performance Advisor가 없고 RPO가 24시간이며, 전용 클러스터에서 내려갈 수 없어(신규 클러스터 + 이전) "구매 데이터 복구 능력" 제약과 충돌한다.
  - 기본 결론은 **M10 유지**다. 비용 레버는 auto-scaling 상한 확인, 백업 보존 과다 여부, 데이터 전송 항목 축소(projection, 공개 응답 캐시)다.
  - 수치가 Flex 상한의 30% 미만이고 사용자가 RPO 24시간을 수용할 때만 이전 계획(승인 필요)을 쓴다.
- **큐·크론의 배치 밖 실행:** Task 2에서 Gemini 위치 오류가 1건 이상이면 후속 계획으로 분리하고 위험으로 보고한다(이번엔 코드 변경 없음).

- [ ] **Step 1:** 위 규칙과 수치 판정을 `docs/infrastructure/SERVER-PERFORMANCE.md`(DO, 레인, 타임아웃)와 `COST-OPTIMIZATION.md`(등급)에 기록한다.

## Task 10: 보안 — 감사 결과 반영 (S1~S8)

### 10A. 보류 보안 커밋 반영 (S1·S7)

브랜치 `fix/security-hardening-20261024`에서 코드 커밋 4개를 가져온다: W-1 `32bffac56`, W-6 `33caf2935`, W-10 `362459e30`, E-1 `b88008c24`. 네 커밋 모두 `package-lock.json`을 건드리지 않는다. N-01 `98bd06a97`·N-02 `67e716884`는 lock을 바꾸므로 승인 뒤에만 가져온다.

- [ ] **Step 1: 사전 확인(연결 유지)**
  - E-1은 `https://codedestiny.pages.dev` 두 줄만 지운다. 소유한 `code-destiny.pages.dev`와 모바일 앱 출처 `https://localhost`(`apps/mobile/capacitor.config.ts:16` androidScheme https, 로컬 webDir)가 허용 목록에 남는지 `cors.allowed-origins.test.js`에 단언을 추가해 고정한다.
  - W-6을 배포하면 운영 `WORKER_ROUTE_METRICS_TOKEN`이 없을 때 `/api/health/route-metrics`가 닫힌다. `npx wrangler secret list --config worker/wrangler.toml`과 `--env staging`으로 **이름만** 확인한다. 없으면 사용자 조치 항목으로 올린다(고객 경로 영향은 없고, `measure:post-deploy-latency`에 `CD_ROUTE_METRICS_TOKEN`이 필요해진다).
- [ ] **Step 2:** 작업 트리에서 `git cherry-pick -x 32bffac56 33caf2935 362459e30 b88008c24`를 실행한다. 충돌이 나면 main의 현재 동작을 보존하는 쪽으로 해소한다.
- [ ] **Step 3:** `npm run test:jest -- cors.allowed-origins route-metrics.token-required subscriptions auth`와 `npm run check:fast`를 실행한다. 기대값은 PASS다.

### 10B. 구독 POST 레이트리밋 (S2)

**Files:**
- Modify: `worker/routes/subscriptions.js` `handleDailyFortunePost`(84행). 이메일 검증(99행) 직후, upsert(142행) 전에 한도 두 개를 센다. 구현은 `destiny-compass.js:68-82` 패턴을 그대로 따른다(`incrementRateLimit` + DB 실패 시 isolate 로컬 폴백).
  - IP: `subjectHash = sha256(getRequestMeta(request).ip)`(`worker/lib/http.js:102`), `endpoint "subscriptions:daily-fortune:ip"`, `windowMs 3_600_000`, 최대 5회.
  - 이메일: `subjectHash = sha256(email)`, `endpoint "subscriptions:daily-fortune:email"`, `windowMs 86_400_000`, 최대 3회.
  - 초과 시 `429 { message: "잠시 후 다시 시도해 주세요." }`와 `Retry-After`를 돌려준다. upsert와 메일 발송은 하지 않는다.
- Test: `__tests__/worker/subscriptions-rate-limit.test.js`

- [ ] **Step 1: 실패하는 테스트**
  - (a) 같은 IP의 6번째 POST → 429이고 `DailyFortuneSubscription.findOneAndUpdate` 0회, `sendSingleFortune` 0회.
  - (b) IP가 달라도 같은 이메일의 4번째 POST → 429.
  - (c) 처음 구독하는 고객 → 200, 메일 1회(정상 고객 차단 없음).
  - (d) `incrementRateLimit`이 throw → 로컬 폴백으로 첫 요청은 200.
- [ ] **Step 2:** FAIL → 구현 → PASS를 확인한다. 이어서 `npm run verify:mongo-query-index-shapes`를 실행한다(`abuse_scores`는 기존 인덱스를 쓴다).
- [ ] **Step 3:** 커밋 `fix(security): 일일운세 구독 POST에 IP·이메일 레이트리밋 추가`.
- 해지 링크 서명 토큰은 이미 발송된 메일의 링크 호환 문제가 있어 이번에 넣지 않는다. 더블 옵트인도 제품 결정이라 넣지 않는다. 둘 다 SECURITY-AUDIT.md 잔여 위험에 적는다.

### 10C. destiny-compass 전역 일일 한도 (S6, 측정 게이트)

- [ ] **Step 1:** Task 2 tail과 Cloudflare 지표에서 `/api/destiny-compass/narrate`의 일별 요청 수(관측 기간 최대값 `D`)를 구한다. 측정값이 없으면 이 절을 건너뛰고 "미측정으로 보류"를 기록한다.
- [ ] **Step 2: 실패하는 테스트**(`__tests__/worker/destiny-compass-global-cap.test.js`). 한도 `N = max(300, 5 × D)`(상수 `GLOBAL_DAILY_MAX`)로 둔다.
  - (a) 서로 다른 IP의 N+1번째 요청 → 429, LLM 호출 0회.
  - (b) N 이하 → 200.
  - (c) 전역 카운터 증가가 throw하면 전역 한도를 건너뛰고 IP 한도만 적용한다.
- [ ] **Step 3:** `checkRateLimit`(`destiny-compass.js:68`)에서 IP 한도를 통과한 뒤 `incrementRateLimit({ subjectHash: "global", endpoint: "destiny-compass:narrate:global-day", windowMs: 86_400_000, env })`을 센다. 초과 응답은 기존 429와 같다. 클라이언트는 이때도 결정론 템플릿을 보여 주므로 화면이 비지 않는다(`:65-66` 주석).
- [ ] **Step 4:** PASS 확인 → 커밋 `fix(security): 무로그인 운명의 지도 문장화에 전역 일일 한도 추가`.

### 10D. 운영 인덱스 실물 확인 (S5, 읽기 전용)

- [ ] **Step 1:** 측정 허가 범위 안에서 사용자 셸의 운영 `MONGO_URI`로 `npm run migrate:reconcile-index-drift -- --dry-run`을 실행한다. `--apply`는 주지 않는다. 스크립트는 `--apply`가 없으면 쓰기를 하지 않는다(`20260906-reconcile-index-drift.mjs:178,379`).
- [ ] **Step 2:** 결제 멱등을 받치는 unique 인덱스와 TTL의 실재 여부를 `MONGODB-OPTIMIZATION.md`에 표로 남긴다. 대상은 웹훅 `{provider,eventId}`, `idempotency_keys {userId,endpoint,keyHash}`, ContentEntitlement unique, 결정적 주문 ID, 각 TTL이다. 빠진 인덱스의 생성은 승인 항목으로 올리고 자동 실행하지 않는다.

### 10E. Atlas 접근망·DB 사용자 (S3)

- [ ] **Step 1:** Task 1 스냅샷의 `accessList`·`databaseUsers`(마스킹본)로 현재 상태를 SECURITY-AUDIT.md에 기록한다.
- [ ] **Step 2:** 아래 승인 항목 3의 결정대로 진행한다. Workers 아웃바운드 IP는 고정되지 않아서 목록을 좁히면 운영 연결이 끊길 수 있다. 어떤 변경이든 스테이징 DB 사용자로 먼저 연결을 확인한 뒤에만 한다.
- [ ] **Step 3:** 앱 DB 사용자가 `readWrite@<앱 DB>`를 넘는 권한(`atlasAdmin`, `dbAdminAnyDatabase`, `readWriteAnyDatabase`)을 가졌으면 축소안과 롤백 절차를 승인 항목으로 올린다.

### 10F. 사용자 조치와 잔여 위험 (S4·S8)

- Gemini 키 교체는 사용자 조치다. 순서: 새 키 발급 → `wrangler secret put`(스테이징 → 운영) → 스테이징 생성 확인(mock 아님, 운영 승격 승인 범위 안에서) → 구 키 폐기.
- Capacitor 8.4.3(N-01)은 Android 재출시가 필요해 별도 릴리스로 분리한다.
- M2(관리자 MFA·개별 폐기), R-01(탈퇴자 토큰 30분), LOW 항목(fortune-chat 세션 증가, 가입 레이트리밋, 웹훅 타임스탬프 창, `workers_dev = true`, CSP `unsafe-inline/eval`, Actions SHA 고정)은 SECURITY-AUDIT.md 잔여 위험 표에 위험도·권장 조치·필요 승인과 함께 적는다. 이번 범위에서는 코드를 바꾸지 않는다.

## Task 11: DR — 백업 정책 실측과 격리 복원 시험

**Files:** `docs/infrastructure/DISASTER-RECOVERY.md`

- [ ] **Step 1:** Task 1 스냅샷에서 스냅샷 주기, 보존, PITR 여부를 기록하고 RPO와 RTO를 산정한다. RTO는 아래 복원 시험의 실측 시간이다.
- [ ] **Step 2: 격리 복원 시험(운영 무영향).** `npm run backup:mongo`로 읽기 전용 덤프를 `D:\Development\code-destiny-backups\mongodb\<stamp>`에 받는다. 로컬 임시 mongod(설치돼 있지 않으면 portable zip을 `D:\Development\Temp`에 둔다)에 `mongorestore`하고, `payments`·`pointhistories`·`paid_execution_records`·`content_entitlements`·`monthly_credit_ledgers` 건수가 덤프 매니페스트와 같은지 확인한다. 소요 시간을 기록한 뒤 임시 mongod를 삭제한다. Atlas 스냅샷 복원 시험은 임시 클러스터 비용이 들어서 승인 항목으로 둔다.
- [ ] **Step 3:** 런북을 작성한다.
  - DB 연결 장애: `[db-connect-error]` 급증 시 확인 순서
  - Gemini 장애: provider-outage 알림 이후
  - 결제 미전달 대응: `audit-paid-order-delivery.mjs` → `recover-*` 스크립트
  - 배포 롤백: `npm run deploy:rollback`
  - 알림 채널 목록

## Task 12: 문서 7종

**Files (Create):** `docs/infrastructure/INFRASTRUCTURE-AUDIT.md`, `MONGODB-OPTIMIZATION.md`, `SECURITY-AUDIT.md`, `SERVER-PERFORMANCE.md`, `COST-OPTIMIZATION.md`, `DISASTER-RECOVERY.md`, `DEPLOYMENT-REPORT.md`

- [ ] **Step 1:** 각 문서 공통 머리말에 측정 시각, 출처, 기준 커밋을 적는다.
  - COST는 "현재 비용 / 개선 후 예상 / 근거 / 위험도" 표로 쓰고 청구서 실측만 넣는다. 예상치는 계산식을 함께 쓴다.
  - 기존 문서(`docs/db-cost-audit-2026-08-16/*`, `docs/db-query-plans-2026-08-30.md`, `docs/security/application-security-20261018.md`)는 링크하고 복사하지 않는다.
- [ ] **Step 2:** `docs/context/ai-and-db.md`의 "배치·지연" 수치를 Task 2 실측으로 갱신한다. 표에 측정일을 적는다.
- [ ] **Step 3:** 커밋 `docs(infra): 인프라·DB·보안·성능·비용·DR·배포 보고서`.

## Task 13: 검증 → 스테이징 → (승인 시) 운영

- [ ] **Step 1:** `npm run check:fast`와 `npm run test:jest`(변경 영역), `npm run check:payment`, `npm run verify:worker-size`, `npm run verify:mongo-query-index-shapes`를 실행한다. 모두 PASS여야 하고, 출력은 DEPLOYMENT-REPORT에 붙인다.
- [ ] **Step 2:** origin/main 위로 내 커밋만 cherry-pick하고 push한다(= 스테이징 배포). CI "CI required"가 green인지 확인한 뒤 `npm run verify:staging`을 실행한다.
- [ ] **Step 3:** 스테이징 수동 확인(mock LLM, 테스트 결제 없음)
  - 로그인
  - 보관함 열람
  - 지연차감 상품 취소 → 재시도에서 결제창이 뜨지 않음(Task 3)
  - `/api/health`
- [ ] **Step 4:** 운영 승격은 사용자의 1회성 명시 요청이 있을 때만 `npm run deploy:production`으로 한다. 요청이 없으면 DEPLOYMENT-REPORT에 "운영 미배포"로 적는다. 승격 후에는 Task 2 Step 3을 다시 측정해 전후 표를 채운다.

---

## 사용자 결정 (2026-10-31)

- Atlas 측정: 읽기 전용 API 키(Project Read Only + Billing Viewer)
- 운영 측정 범위: **읽기 전용 전부**. tail(D 드라이브 보관), 공개 GET, Atlas Admin GET, 운영 DB 인덱스 dry-run과 소수 explain까지 허용한다. 운영 DB 쓰기, 실결제, 유료 LLM은 0회다.
- Atlas 접근망: **0.0.0.0/0 유지 + 보완 통제**. 10E Step 2는 다음 세 가지 런북을 SECURITY-AUDIT.md에 쓰는 것으로 대체한다. 읽기 전용 키로는 실행할 수 없으므로 실행은 사용자가 Atlas UI에서 하고, 나는 런북을 쓰고 실행 뒤 연결 유지를 확인한다.
  - DB 비밀번호 교체 런북: 새 사용자 또는 비밀번호 → 스테이징 secret → 연결 확인 → 운영 secret → 구 자격 폐기
  - 앱 사용자 최소 권한 런북
  - Atlas 경보 권장 목록: 연결 급증, 인증 실패
- 보안 브랜치: **코드 4건(W-1·W-6·W-10·E-1)만** 반영한다. N-01·N-02는 이번에 하지 않는다.
- RED 결제 변경: **Task 3과 Task 7 착수를 승인**받았다(테스트 → 스테이징까지). 비카드 자동 복원 정책은 채택하지 않았으므로 Task 6B 알림만 한다.

## 승인 필요 항목 (자동 실행 금지)

1. ~~RED 결제 변경 착수: Task 3, Task 7~~ → 2026-10-31 승인됨(스테이징까지)
2. 운영 인덱스 `users {referralCode:1}` 생성(Task 8 Step 3), 10D에서 빠진 것으로 드러난 결제 unique 인덱스 생성
3. DB 사용자 권한 축소와 비밀번호 교체 실행(10E 런북, 사용자가 Atlas UI에서 실행). 접근 목록은 유지로 결정됐다.
4. 보안 브랜치 N-01·N-02 의존성 승격(`package-lock.json` 변경): 이번 범위 밖
5. 비카드 미전달 자동 복원(월정석·이용권 반환) 같은 환불 정책 변경: 이번엔 채택하지 않음(R2는 Task 6B 알림만)
6. Atlas 스냅샷 복원 시험(임시 클러스터 비용)
7. 등급 변경(M10 → 다른 등급), DO 파일럿 착수
8. 사용자 조치: Gemini 키 교체, `WORKER_ROUTE_METRICS_TOKEN` 설정(10A), Atlas API 키 발급(Task 1)
9. 운영 배포

## 검증 요약

- 단위·통합: Task 3~8의 Jest와 `check:fast`, `check:payment`, `verify:*` 가드
- 운영 영향 없음 확인: 모든 운영 측정은 GET·tail·Atlas Admin GET뿐이다. 운영 DB 쓰기, 실결제, LLM 실호출은 0회다.
- 전후 비교: Task 2 기준선 대비, 운영 승격 후 같은 절차로 재측정한다. 승격하지 않으면 "after 미측정"으로 둔다.
