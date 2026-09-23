---
status: active
updated: 2026-09-24
next: "2차 재실사 수정은 main·스테이징까지 나갔다. 운영 승격은 13번대로 보류 릴리스에 합류한다(꿀꿀 번역 뒤, 결제 커밋 이름을 밝혀 새 1회 승인). 사람 몫: 4 포트원 문의·6 이니시스 MID 분류·7 Atlas Network Access·8 포트원 콘솔 채널·9 운영 읽기 조회 ⓐ~ⓓ·11·12 제품 결정. 3번 엄격 모드는 승격 뒤 확정 20건에서 재집계. 코드 작업은 후속(보고만)뿐이고, 그중 🔴 자미두수 V2 만료 취소(결제됐는데 402)가 가장 급하다 — 운영 읽기 집계부터."
---

# KG이니시스 가맹점 보안 권고(2026-09-18) 적용 — 인수인계

다음 세션 첫 문장: "docs/handoff/inicis-security-advisory-2026-09.md 를 읽고 '남은 일'부터 이어서 해."

## 2026-09-24 재실사(2차) — 1차가 안 본 경로
- 범위: 구 단건 `/api/payments/single/*`·재조정 크론·클라이언트 실패 보고·자미두수 AI 2종·영냥이·앱 이용권 상점. 7d1989347 기준 재실측.
- 판정은 1차와 같다. 이니시스 직접 연동 0건(`P_CHKFAKE`·`P_IDCCODE`·`centerCd`·`INIStdPay`·`authUrl`·`checkAckUrl`·`netCancelUrl`·`idc_name` git grep 0, docs·marketing 제외), 포트원 V1 호출 0, 서버가 부르는 조회 URL 은 상수 `https://api.portone.io/payments/{id}` 뿐. 포트원 V2 `inicis_v2` 의 `P_RESERVED` 허용값(`below1000`·`noeasypay`·`global_visa3d`)에 `centerCd` 가 없다(포트원 공식 문서) → 해시·IDC 검증은 계속 포트원 몫이고 우리 요청에 넣지 않았다.
- 우리 몫(포트원 재조회 대조·복귀 경로·결제→결과 무결성)에서 결함 6건·방어 1겹·테스트 공백 1건을 실측해 고쳤다. 키 유출 증거 0 → 키 교체 없음.

| 커밋 | 항목 | 내용 |
|---|---|---|
| b2fb33652 | W2 위변조 | 자미두수 AI 2종(`worker/routes/ziwei-ai.js`·`ziwei-island-ai.js`)의 자체 검증기(채널 대조 없음, `amount.paid` 우선, paid/fulfilled 면 재조회 생략)를 V2 와 같은 `verifyPgPayment` 로 교체. 재조회 생략은 이 검증기가 남긴 `rawPortOne.channelCheck` 가 있을 때만. 실패 사유는 PG 조회 실패(`portone_fetch_failed`)만 `{ _id, status:"pending" }` CAS 로 쓰고, 대조 불일치(채널·금액·상태)는 로그만 남긴다(예전 검증기와 같다) |
| ~~ca7f4eab0~~ → 4ece2e89e, ~~96533b654~~ → c2f25e546 | W2 앞 두 구현 되돌림 | 첫 구현은 실패 사유를 모든 미결제 주문에 써서, 취소·환불 주문에 start 가 다시 오면 관리자 검토 표시(`cancel_admin_review`·`webhook_cancel_admin_review`)를 덮었다. 두 번째는 대기 주문 CAS 로 그걸 막았지만 대조 불일치도 써서, PG 부분취소 웹훅이 상태를 바꾸지 않고 대기 주문에 남긴 `partial_cancel_admin_review` 를 start 재시도가 덮었다(둘 다 감사 적발, 상태·금전 영향 없음). 규칙대로 덧대지 않고 각각 revert 한 뒤 위 b2fb33652 로 재구현 — 실패 사유를 쓰는 경우가 예전 코드의 부분집합이라 이 축의 회귀가 구조상 없다 |
| d896f2048 | W4·W5 이중 지급·지연 | V2 주문(`cd`+hex38 — `worker/payments/order-id.js` `isV2OrderId`, `deriveOrderId` 실출력과 테스트로 묶음)은 구 `/single/complete` 에서 409(멱등 재지급 블록보다 앞 — 감사 R2), 재조정 크론은 V2 대기 주문을 V2 `settleOrderFromReconcile` 로 보낸다(채널 대조·영냥이 enqueue 포함) |
| d28e64ea6 | ② 복귀 경로 테스트 | `sanitizeAuthReturnPath`·`resolveAuthReturnPath` 행동 테스트(외부·`//`·`/\`·제어문자·`javascript:`·인증 루프·1201자), 구 `returnPath` 는 외부 절대 URL 의 경로만 남김, 영냥이 결제 증명은 한 번만 붙는다(`consumedBy` 단언) |
| 8e0cfd044 | W3 결제→결과 | 클라이언트 실패 보고는 `status:"pending"` 정확 일치 CAS 로만 닫는다. paid 가 failed 로 덮이던 것, 늦은 Paid 웹훅이 되살리는 `PG_PAYMENT_NOT_PAID` 표식이 지워지던 것 차단 |
| 01800b896 | L1 위변조 | 구 `/single/complete` 에 채널 대조(응답에 `channel.key` 가 있을 때만, 이니시스·카카오페이 채널키) → 400 `CHANNEL_MISMATCH`, 지급 0, 키 값은 로그에 안 남김 |
| 518f77445 | W7 위조 웹훅 | `Transaction.PartialCancelled` 도 포트원 재조회 뒤 원본 상태가 `PARTIAL_CANCELLED` 일 때만 반영, 아니면 200 `PG_STATUS_MISMATCH` |
| a2f67175d | W12 ② 방어 1겹 | 앱 이용권 상점이 저장된 복귀 URL 을 같은 origin 일 때만 따라간다(쓰는 곳 4곳 모두 같은 사이트 경로라 지금은 오픈 리다이렉트 아님) |
| 83800a38e | R3 이중 지급·가격 우회 | 레거시 단건(`cd-single-…` — `order-id.js` `isLegacySingleOrderId`)은 V2 확정 공통 관문 `evaluateConfirmable`(`/confirm`·이용권 confirm·웹훅·리플레이·크론 V2 정산)에서 상태와 무관하게 409, Paid 웹훅은 `ignored: LEGACY_SINGLE_ORDER` 로 ack(재전송 중단). 전에는 레거시 지급 위에 V2 지급이 겹쳤고, 레거시 `productId` 가 클라이언트 `serviceId` 라 결제 금액과 다른 상품이 풀릴 수 있었다. 대기 레거시 주문은 레거시 크론이 계속 정산한다 |

- `worker/routes/payments.js` 동결 상한 3668 → 3710(C2·C3·C5, `verify-payment-freeze --update` 를 같은 커밋에).
- 검증(전부 mock — 실결제·실PG 호출 0, 유료 LLM 호출 0):
  - 새 가드마다 변이 검사: 가드를 지우거나 항상 통과로 바꾸면 새 테스트가 실패한다(전부 확인). C8 은 웹훅 가드 제거 −2·확정 가드 제거 −1·둘 다 −3·판별식을 `!isV2OrderId` 로 넓힘 −1(이용권 `sub_…` 확정이 막힘)·항상 false −4. b2fb33652 는 라우트마다(스위트 18개 중) 불일치에도 쓰기 −2·상태 조건 제거 −3·무조건 `findByIdAndUpdate` 복귀 −4·`channelCheck` 없이 조기 통과 −1.
  - 최종 트리 `run-paid-gate-suite` 88/88(전체 `npm test` 포함), `git diff --check`·변경 파일 eslint·`tsc --noEmit`·`verify:worker-no-undef` 통과. critical `check:fast`: C2 시점 jest 292 suites / 4142 tests, C8 시점 293 / 4167, b2fb33652 시점 293 / 4177(같은 실행에서 `run-paid-gate-suite` 88/88, 자미두수 스위트 5개 71/71은 따로) — lint·typecheck·`test:node`·`build:worker`·결제 verify 전부 통과.
  - DB: `verify:reconcile-index-drift`(`--check`)가 인덱스 비교를 위해 운영 DB 에 읽기 전용으로 붙었다. 쓰기 0.
- 하지 않은 것: 구 본인 취소(`/single/*` 환불)의 V2 차단 — 화면이 대기·완료 단건에 취소 버튼을 띄워 사용자 동작이 바뀐다(사람 몫 12). 구 `/single/*` 삭제 — 규칙 6, 별도 변경.

## 결론
- 웹 단건 결제는 **전부 포트원 V2 경유**다. KG이니시스 직접 연동은 0건이고(`stdpay`·`INIpayPRO`·`P_CHKFAKE`·`P_IDCCODE`·`centerCd`·`acceptmethod` 없음), authUrl 을 fetch 하는 코드도 없다.
  따라서 권고 ①의 `P_CHKFAKE`/`signature` 와 권고 ②의 IDC 승인 URL 검증은 **포트원↔이니시스 구간의 책임**이다. 우리 코드에는 넣지 않았다(추측 주입 금지).
- 앱(Capacitor)은 Google Play Billing 만 쓰고 포트원이 없다(`scripts/app-payment-guard.js`).
- 우리 쪽에서 해당되는 부분만 커밋 3개로 보강했다.

| 커밋 | 내용 | 파일 |
|---|---|---|
| 2eccfcf58 | 구 단건 `returnPath` 오픈 리다이렉트 차단: `/\evil.com`, 탭, `https://x//evil.com` 이 외부 origin 으로 새던 것 | `worker/routes/payments.js`(동결, 매니페스트 갱신), `__tests__/worker/payments.return-path.test.js` |
| 0158a4bc9 | 포트원 조회 대조 강화: 금액을 `amount.total` 로 비교(공식 예시), `channel.key` 가 있으면 우리 채널(이니시스·카카오페이)인지 대조 → `CHANNEL_MISMATCH`(422) | `worker/payments/pg.js`, `errors.js`, `reconcile.js` |
| dcb3f9153 | 웹훅 Failed·전액 Cancelled 는 PortOne 재조회 뒤 상태가 맞을 때만 적용. 불일치는 `PG_STATUS_MISMATCH` 로 ack, 조회 실패는 503 + 이벤트 failed(재전송으로 복구) | `worker/payments/index.js`, `__tests__/worker/payments-v2.webhook-events.test.js` |

## 상품 매핑(실측)
- 서버 카탈로그 `listProducts()` 의 유료 상품 158개(영냥이 28개 포함)가 모두 `resolveProduct` → `/prepare` → `confirmOrder` → `verifyPgPayment` 한 경로를 탄다.
- 영냥이는 `confirmOrder` 안에서 `enqueuePaidConsultation` 으로 이어진다(`worker/payments/index.js` 의 영냥이 분기). 이후 큐 → `attachPayment`(금액·소유자 재대조) → 챕터 생성 순서이고, 복구 크론이 10분마다 돈다.

## 검증(전부 mock, 실결제·유료 LLM 호출 0)
- `__tests__/worker/payments-v2*` + webhook-ledger + return-path: 32 suites / 617 tests 통과.
- 재조회 가드 변이 검사: 판정 함수를 항상 true 로 바꾸면 새 테스트 4개가 실패했다.
- resume UI(node --test) 45개, 영냥이 intent·queue·recovery 27개 통과.
- `run-paid-gate-suite` 88/88, `verify-security-hardening`, `verify-payment-concurrency-guards`, `verify-portone-single-payment-regression`, `verify-worker-security-guards`, `verify-payment-freeze` 모두 통과.

## 하지 않은 것(근거)
- 키 재발급: 유출 증거가 없다. 조사 범위는 추적 파일, out/·dist/·.next/·public/·안드로이드 에셋, git 이력 전체, 로그 호출이다. 이력 리터럴 5건은 전부 placeholder 였다.
- 웹훅 타임스탬프 24h 창: 재전송 지평에 맞춘 의도적 설계다(`worker/payments/webhook.js` 주석). eventId unique 가 1차 방어다.
- 구 `/api/payments/single/*` 삭제: 프런트 호출 0건이지만, 삭제는 규칙 6에 따라 별도 변경으로 다룬다.

## 남은 일 / 미확인(완료로 표시하지 말 것)
1. ~~운영 승격~~ 완료(2026-09-23). 운영 Pages·Worker 모두 `11d0be467` in-sync(`verify-merge-landed --check=drift`). 승격은 workflow_dispatch run 35860013925(2026-09-23 12:22:00Z 시작·12:33:08Z 완료 = 21:22–21:33 KST)가 수행했다.
   - 승격 전 확인: 11d0be467 `PR CI` 통과, 스테이징 릴리스는 스모크의 `_next/static/chunks/webpack-*.js` 일시 404 로 1회 자동 롤백 → 청크 200 확인 뒤 `rerun --failed` 로 통과. `verify:release` 는 메인 체크아웃에서 CRLF 작업 트리(1,961파일) 때문에 `verify:billing-pass-policy`·`verify:paid-gate-ui` 가 헛실패했고, LF 분리 워크트리에서 나머지 전 단계(`build:worker` 포함)가 통과했다.
   - 이 세션이 연 운영 승격 run 35864616459 는 대기 중 main 이 `4986336c3`(다른 세션의 패밀리 이용권·퓨전 가격 결제 변경)로 앞서 있어 **배포 단계 전에 취소**했다. 그 변경의 운영 승격은 별도 검증·승인 대상이다.
2. ~~운영 결제 성공률과 결제→결과 제공 지표~~ 확인 완료(2026-09-24 00:16 KST, 사용자 권한 부여 뒤 `code_destiny` 읽기 전용 집계 — find/count/aggregate 만, 식별자 무출력).
   - 09-16 이후 생성 11건: `refunded` 9 · `paid` 1 · `pending` 1(전부 `digital_content`). 환불 9건은 모두 `failureCode: cancel_admin_review` 이고 결제 후 1~43분 안에 환불됐다 → 운영 점검 결제로 보인다(추정).
   - 결제됐는데 권한이 안 붙은 `paid` 건: **0**. 결제된 10건 모두 `entitlementGrantedAt` 이 paidAt 뒤 1~9초 안에 찍혔다.
   - 영냥이 `scripts/audit-yeongnyangi-paid-without-result.mjs --db code_destiny`: 결제 요청 3 = COMPLETED 1 · REFUNDED 2, 24h 정체 0, REVIEW 대기 0.
   - `pending` 1건(09-23 12:41Z, 3,000원)은 Transaction.Paid 웹훅이 없다 — 포트원도 결제로 보지 않은 이탈 건이다.
   - 즉 자연 결제 표본이 거의 없어 "성공률"은 의미 있는 수치가 아니다. 결제→결과 누락은 0건.
3. `channelCheck`/`storeIdCheck` absent 비율을 실측한 뒤 엄격 모드 전환을 검토한다. 이 필드는 0158a4bc9 에서 생겨 2026-09-23 승격(2026-09-23 12:22:00Z 시작·12:33:08Z 완료 = 21:22–21:33 KST, run 35860013925)부터 운영에 있다 — 실결제가 쌓인 뒤에만 잴 수 있다.
   - **2026-09-24 실측: 보류.** 승격 이후 확정 1건(`channel matched`·`store matched`). `storeIdCheck` 는 09-18 부터 6/6 matched, absent 0. absent 가 0 이어도 `channelCheck` 표본 1건으로는 엄격 모드(absent→실패, 결제 확정 전면 중단 위험) 근거가 안 된다. 승격 이후 확정 20건 이상이 되면 아래 3번 집계를 다시 돌린다.
   - 시각 정정(2026-09-24, 로드맵 세션 지적): 처음엔 승격을 "12:22 KST = 03:22Z" 로 잘못 적어 집계가 승격 전 약 9시간을 포함했다. 기준을 완료 시각 12:33:08Z 로 고쳤다. 위 1건은 `channel matched`(새 코드만 쓰는 값)라 보류 결론은 같다.
   - 🔴 로그가 아니라 **운영 Mongo** 에 있다: `markOrderPaid` 가 `pg.summary` 를 `Payment.rawPortOne` 에 저장한다(`worker/payments/orders.js`). 그래서 2번과 같은 운영 DB 읽기 권한이 필요하다(09-23 세션 확인).
   - 2·3번 읽기 전용 mongosh 집계(사람이 실행, 쓰기 없음):
     ```js
     // 3번: 승격 이후 확정 건의 채널·상점 대조 분포. absent 가 0 이고 표본이 충분하면 엄격 모드(absent→실패) 검토
     db.payments.aggregate([{ $match: { paidAt: { $gte: ISODate("2026-09-23T12:33:08Z") } } },
       { $group: { _id: { ch: "$rawPortOne.channelCheck", st: "$rawPortOne.storeIdCheck" }, n: { $sum: 1 } } }])
     // 2번: 최근 7일 상태 분포와, 결제는 됐는데 권한이 안 붙은 채 paid 에 머무는 건수
     // (단건은 fulfilled 로 닫히며 entitlementGrantedAt 을 쓰지 않으므로 status:"paid" 로 한정한다)
     db.payments.aggregate([{ $match: { createdAt: { $gte: ISODate("2026-09-16T00:00:00Z") } } },
       { $group: { _id: "$status", n: { $sum: 1 } } }])
     db.payments.countDocuments({ status: "paid", paidAt: { $ne: null }, entitlementGrantedAt: null })
     ```
4. 포트원 문의(사람이 실행): `cs@portone.io` 는 **발신 전용이라 회신이 안 된다**(메일 본문 명시) — 포트원 고객센터 웹 문의로 보낸다. V2 KG이니시스 채널에서 `P_CHKFAKE`/`signature` 검증과 IDC centerCd 승인 URL 검증을 포트원이 수행하는가? 권고 메일 대응 공지가 있는가?
   - 문의 초안: "V2 KG이니시스 채널 결제에서, 이니시스가 2026-09-18 가맹점에 권고한 ① 인증 결과 위변조 검증(P_CHKFAKE / signature)과 ② IDC(centerCd)별 승인 URL 검증을 포트원이 연동 구간에서 수행하고 있는지, 가맹점 측 추가 조치가 필요한지 확인 부탁드립니다. 저희는 브라우저 SDK 결제 후 서버에서 결제 단건 조회 API로 금액·상점·채널을 대조하고 있습니다."
5. 포트원 콘솔: 운영·스테이징 웹훅 시크릿과 웹훅 URL 이 등록돼 있는지.
   - **워커 쪽은 확인 완료**(2026-09-23, 값 출력 없이 이름·판정만): 운영 `/api/health?refresh=1` → `keyHealth.ok: true`, `brokenFeatures: []` 라서 `PORTONE_WEBHOOK_SECRET`·`PORTONE_WEBHOOK_URL` 을 포함한 `payments-core` 키가 전부 실값이다(`worker/lib/key-health.js`). 스테이징 워커 `wrangler secret list --name code-destiny-web-staging` 에도 두 이름이 있다.
   - 스테이징 `/api/health` 는 `payments-core`·`admin-gate` 가 broken 이다. `admin-gate` 는 의도된 부재(`FLOWER_ADMIN_SECRET` 미설정). `payments-core` 는 시크릿 이름 목록상 `INIAPI_IV` 계열이 없다 — 포트원 V2 경로와 무관한 구 이니시스 키로 보이나 **미확인**(범위 밖, 보고만).
   - ~~포트원 콘솔의 웹훅 URL·시크릿 대조~~ **운영은 간접 확인 완료**(2026-09-24). `payment_webhook_events` 는 서명 검증을 통과한 뒤에만 기록된다(`worker/payments/webhook.js` `acceptWebhook`). 운영 09-16 이후 Ready 10 · Paid 10 · Cancelled 9 가 전부 `processed`, failed 0, 마지막 수신 09-23 13:55Z → 운영 콘솔 URL 이 이 워커를 가리키고 시크릿이 같다.
   - 스테이징(`code_destiny_staging`)은 마지막 수신이 09-17 09:33Z(Ready·Paid 각 1, processed)다. 그 시점까지는 맞았다. 이후 스테이징 결제가 없어서 그 뒤 변경 여부는 미확인이다.
   - 포트원 "웹훅 전송 실패 안내" 메일은 08-04~09-04 사이 반복됐고 09-05 이후로는 없다(Gmail `from:cs@portone.io 웹훅 after:2026/09/05` 0건, 09-24).
6. 이니시스 가맹점 관리자: 포트원 연동 MID 가 권고 대상인 "직접 연동"으로 분류되는지.
7. ~~`server/.env` `MONGO_URI` 템플릿 여부~~ 판정 완료(2026-09-23, 값 출력 없이 구조만 검사). 42a28e593 에 추가되고 ab1bfa7d1 에서 추적 해제된 파일이다.
   - 비밀번호 자리는 Atlas 템플릿 토큰(`<…password…>` 꺾쇠 형태)이다 → **비밀번호 유출 아님, 교체 불필요**. 같은 파일의 `JWT_SECRET`·`PORTONE_API_KEY`·`PORTONE_API_SECRET` 도 placeholder 문구(your/replace 류)다.
   - 다만 **실제 Atlas 클러스터 호스트(`*.mongodb.net`)와 DB 사용자명은 실값**이고 저장소는 PUBLIC 이다. 자격증명은 아니지만, 사람이 Atlas Network Access 가 `0.0.0.0/0` 전체 허용이 아닌지 한 번 확인한다(전체 허용이면 사용자명+호스트만으로 무차별 대입 표면이 된다).
8. 포트원 콘솔(2차 재실사): 운영 상점(storeId)에 테스트 채널이 함께 있는지, 스테이징이 같은 상점을 쓰는지. 있으면 W2·L1(채널 대조 없던 경로)의 악용 전제가 성립하므로 9번 조회로 과거 흔적을 본다.
9. 운영 읽기 전용 조회(자격증명 필요, 쓰기 없음). 복구 지급은 운영 DB 쓰기라 별도 승인.
   ```js
   // ⓐ W4·W5 과거 흔적: V2 주문은 paid 로 닫힌다. fulfilled 면 구 경로가 정산한 것 — 구 본인 환불 시 V2 권한이 남을 수 있다
   db.payments.countDocuments({ merchantUid: { $regex: "^cd[0-9a-f]{38}$" }, status: "fulfilled" })
   // ⓑ W3 과거 피해 후보: 클라이언트 보고로 닫힌 주문 — 각 건을 포트원 콘솔에서 결제 상태로 대조(paid 면 결제됐는데 결과 없음)
   db.payments.find({ failureStage: "client_report", status: { $in: ["failed", "cancelled"] } }, { merchantUid: 1, createdAt: 1, failureCode: 1 })
   // ⓒ R3 과거 흔적: 레거시 단건에 V2 지급이 붙은 건(entitlementGrantedAt 은 V2 markEntitlementGranted 만 쓴다 — worker/payments/orders.js)
   db.payments.countDocuments({ merchantUid: { $regex: "^cd-single-" }, entitlementGrantedAt: { $ne: null } })
   // ⓓ R3 뒤 정체 후보: failed+PG_PAYMENT_NOT_PAID 레거시 단건은 크론이 V2 정산으로 보내는데(payment-reconcile-task.js revivable) 이제 409 다.
   //    각 건을 포트원 콘솔에서 대조 — 결제됐으면 결과 없이 남은 것이라 수동 처리(운영 DB 쓰기는 별도 승인)
   db.payments.find({ merchantUid: { $regex: "^cd-single-" }, status: "failed", failureCode: "PG_PAYMENT_NOT_PAID" }, { merchantUid: 1, createdAt: 1 })
   ```
10. SoulCat 저장소는 운영에 배포하지 않는다. 라우트가 CD 의 영냥이 경로를 가려 결제 사용자가 잠긴다(운영 영냥이는 전부 CD 가 서빙, 배포 스크립트도 거부).
11. 영냥이 B-2(Family 이용권이 클릭 없이 차감될 수 있음)가 의도인지 — 제품 결정. 상세는 `docs/handoff/yeongnyangi-paid-flow-speed-2026-09-24.md`.
12. V2 대기 주문의 구 본인 취소를 막을지. 막으면 대기·완료 단건의 취소 버튼 동작이 바뀐다. W4·W5 뒤 새 V2 주문은 fulfilled 가 되지 않아, 남는 위험은 V2 대기 주문 취소와 V2 확정 사이의 좁은 경합뿐이다.
13. 운영 승격: 2차 수정은 **스테이징까지만** 나갔다. 운영은 사용자가 2026-09-24 보류한 릴리스에 합류한다 — 꿀꿀 홈 개편 `7096f61f7` 의 4개 로케일 번역이 main 에 들어와 CI 가 통과한 뒤 `npm run verify:release` → main HEAD 한 번에 승격(`docs/handoff/competitiveness-roadmap-20260923.md` '지금 상태'). 릴리스는 main HEAD 전체를 내보내므로 이것만 따로 올리면 그 결정을 깬다. 승격 요청 때 위 표의 결제 커밋(d896f2048·8e0cfd044·b2fb33652·01800b896·518f77445·a2f67175d·83800a38e)을 이름으로 밝히고 새 1회 승인을 받는다. 승격 뒤 2·3번 집계와 9번 조회를 다시 돌린다.

## 후속(코드, 보고만 — 이번 범위 밖)
- W3 잔여: 대기 중인데 실제로는 결제된 주문이 확정적 4xx(401 등)로 오보고되거나 사용자가 취소를 보고하면 여전히 닫히고, 늦은 Paid 웹훅은 409 를 받는다(좁은 경로).
- R4: `worker/lib/payment-reconcile-task.js` 만 바뀐 변경은 `check:fast` 계획이 결제 심층 검사로 올리지 않는다(`deepRequired=false`, 기존 동작). CI Paid Flow Gates 트리거에는 있다.
- R3 잔여: 83800a38e 이전에 되살림 표식(failed + `PG_PAYMENT_NOT_PAID`)이 붙은 레거시 단건은 크론이 V2 정산으로 보내는데(`payment-reconcile-task.js` `revivable`) 이제 409 이고, 레거시 complete 도 failed 주문을 거부해 자동 복구 경로가 없다. 크론은 주문당 시도 상한(`payment-reconcile-task.js` `maxAttempts` 기본 10)에 닿으면 후보에서도 뺀다 → 사람 몫 9ⓓ 로 건수부터 본다.
- CI 트리거 공백(기존): `app/app/store/**`(앱 이용권 상점, a2f67175d)는 Paid Flow Gates `paths` 에 없다(`worker/routes/app-store.js` 만 있음). 이번 머지는 `worker/payments/**`·`worker/routes/payments.js` 로 게이트가 깨어난다.
- 동결 스크립트(기존 동작): `verify-payment-freeze` 는 `--update` 없이도 결제 파일 줄 수가 줄면 `config/payment-freeze.json` 상한을 조여 고쳐 쓴다 — 결제 파일을 줄인 커밋은 그 JSON 을 같은 커밋에 담는다.
- R5(b2fb33652 절충, 감사 정정): `channelCheck` 가 없는 닫힌 자미두수 주문은 `ziwei-ai` 에서 시작마다 2회(`resolveStartAccess` 호출 두 곳)와 생성 중 3초 폴링마다, 섬에서는 저장된 접근 정보가 없을 때 시작 1회 포트원을 재조회한다(호출당 타임아웃 최대 8초, `worker/lib/portone.js`). 과거 주문만이 아니다 — 재조정 크론이 자미두수 ID 를 레거시 정산으로 보내고(`worker/lib/payment-reconcile-task.js`) 레거시 정산은 `channelCheck` 없이 `rawPortOne` 을 쓰므로(`worker/routes/payments.js` `/single/complete` 지급 블록) 이런 주문이 계속 생긴다. 재조회가 실패하거나 불일치해도 폴백(`resolveBillingGateAccess`)이 받으므로 거부되는 구매자는 없고 비용은 지연뿐이다(결과 유실·이중 결제 없음). 개선안(별도 변경): 레거시 정산도 L1 대조 결과로 `channelCheck` 를 남긴다 — `payments.js` 는 동결 상한 3710 에 닿아 있어 `--update` 를 같은 커밋에.
- R6 🔴(기존 동작 — 이번 변경 전부터, 회귀 아님): `channelCheck` 가 없는 닫힌(paid·success·fulfilled) 자미두수 주문은 재조회 대조가 실패해도 라우트가 `resolveBillingGateAccess` 폴백으로 같은 주문을 받아 상담을 연다(`ziwei-ai.js`·`ziwei-island-ai.js` 모두 검증 실패 뒤 이 함수를 부른다). 대기 주문은 폴백이 받지 않으므로 W2 의 주된 경우(새 주문을 다른 채널 결제로 확정)는 막혔다. L1 뒤로는 구 complete·크론 레거시 정산도 채널을 대조하므로, 남는 틈은 L1 배포 전에 닫혔거나 응답에 `channel.key` 가 없던 주문이다(`channelCheck` 없는 닫힌 주문 자체는 크론 레거시 정산이 앞으로도 만든다 — R5. 그 경로는 L1 로 채널을 대조하므로 우회 틈이 아니라 비용 문제다). 고치는 안: 대조 불일치면 폴백 없이 402, 조회 실패(`PG_UNAVAILABLE`)에만 폴백 유지, 라우트 수준 테스트 추가(지금 테스트는 검증 함수를 직접 부른다). 선행 조건: 사람 몫 8(콘솔 채널·키 이력)과 `channelCheck` 없는 닫힌 자미두수 주문 수 읽기 전용 집계. 이것 없이 바꾸면 채널 키가 바뀐 적 있는 정상 구매자가 402 로 잠길 수 있다.
- 🔴 자미두수 × V2 만료 취소(기존 결함 — 이번 변경 전부터, 회귀 아님. 추적 에이전트 실측, 위치는 b2fb33652 기준으로 주 세션이 재확인): `worker/payments/reconcile.js` `expireStalePendingOrders`(필터 103-107: 대기·기한 경과·`metadata.reconcile.lastPgStatus` 가 있고 paid 아님)는 주문 형식을 가리지 않아 자미두수 대기 주문도 `cancelled`·`failureCode:"ORDER_EXPIRED"`(`worker/payments/orders.js` `markOrderCancelled`)로 닫는다. ① 같은 탭 재제출은 같은 키를 쓴다(`app/ziwei-ai/ZiweiAiClient.tsx:1012`) → 자미두수 /prepare 가 상태를 보지 않고 같은 키 문서를 재사용(`ziwei-ai.js` 869-884) → V2 prepare 가 새 주문을 만들고 사용자가 결제 → 상담 시작 관문이 같은 키의 취소 문서를 회수로 보고 402(`ziwei-ai.js` `resolveStartAccess` 2437-2448) → **결제됐는데 상담 없음, 자동 환불 없음**. 섬 상담은 제출마다 새 키(`app/island-consult/IslandConsultClient.tsx:765`)라 화면으로는 안 걸린다. ② 같은 키로 이미 완료된 상담도 만료 뒤 다시 열면 403 `PAYMENT_REVOKED`(`ziwei-ai.js` 2606-2608 → `worker/lib/paid-result-revocation.js` `isStoredPaidResultRevoked`, 섬 623). ③ [추정] 예전 paymentId 를 새 키로 보내면 폴백 `resolveBillingGateAccess`(`ziwei-ai.js` 694·2458, 섬 271·607)가 소진 여부 없이 paid 주문만 찾아 연다 — R6 와 같은 축. 미확인 전제: 버려진 결제창에도 포트원이 기록을 남겨 크론이 `lastPgStatus` 를 쓰는지. 고치는 안(라우트 로컬 우선): 시작 관문이 `ORDER_EXPIRED` 취소를 회수로 보지 않기(2438 목록 조회), 결과 재열람도 같은 기준(2606·섬 623), 또는 만료 필터에서 자미두수 제외(`reconcile.js` 103-107). `paid-result-revocation.js` 는 임포터 23곳이고 Paid Flow Gates 경로 밖이라 건드리지 않는다. 테스트 공백: 만료 테스트는 `cd-old` 만 쓴다(`__tests__/worker/payments-v2.reconcile.test.js`). 선행: 운영 읽기 전용 집계 — `cd-zwai-`·`cd-zwisl-` 중 `failureCode:"ORDER_EXPIRED"` 건수, 그중 같은 `idempotencyKey` 로 paid 주문이 있는 건(결제됐는데 상담 없음 후보).
- 추적 결론(2026-09-24): 자미두수 주문이 V2 확정 경로를 타는 것은 **이중 지급이 아니다**. 자미두수 /prepare 의 대기 주문을 V2 prepare 가 `{userId, idempotencyKey, paymentType}` upsert 로 재사용하고(`worker/payments/orders.js`), `/api/billing/confirm` 이 만드는 `PurchaseEntitlement` 1건의 소비자는 `GET /orders/:id/status` 뿐이며, 자미두수 전달은 `{userId, idempotencyKey}` 멱등이다. 그러니 83800a38e(R3) 레거시 관문을 자미두수로 넓히지 말 것 — 카드 결제 뒤 상담이 안 열린다. d896f2048 은 자미두수 ID 를 V2 로 보지 않아 크론·구 complete 는 레거시 경로로 간다(저장 위치만 다르고 전달 횟수는 같다). [추정] V2 `markOrderPaid` 와 레거시 지급 CAS 가 겹치면 두 저장소에 기록이 남을 수 있다 — 상태 오염이지 이중 지급은 아니다.
- 경미(b2fb33652 자미두수 검증, 예전과 같거나 나아짐): ① processing 주문과 failed+`PG_PAYMENT_NOT_PAID` 주문은 조회 실패여도 사유가 남지 않는다(대기 CAS 밖 — 되살림 표식은 지켜진다) ② 읽기와 성공 쓰기 사이에 웹훅이 paid 로 바꾸면 조건 없는 성공 쓰기가 paid→success 로 덮는다(예전과 같다) ③ 부분취소 표시가 붙은 대기 주문도 PG 조회 **실패** 때는 표시를 덮는다(예전엔 조회 실패면 상태와 무관하게 덮었다) ④ 통화 `KRW` 대조(`worker/payments/pg.js`)는 V2 확정 경로가 2026-08-11 부터 써 온 기준이고, 자미두수 결제 실응답의 통화 필드는 이번에 실측하지 않았다 ⑤ `rawPortOne` 이 포트원 원본 전체(고객 정보 포함)에서 검증기 요약본으로 바뀌었다 — V2 주문과 같은 모양이고 고객 PII 를 더 저장하지 않는다(개선). 결제 내역 응답의 승인번호(`payments.js` `formatPaymentResponse`)는 새 자미두수 주문에서 null 이다(V2 주문과 같은 한계, 예전 저장본에서 채워졌는지는 미실측). 로그 문구가 `PortOne payment lookup failed` → `PortOne payment verify failed`(+사유 코드)로 바뀌었다 — 리포 안 소비처 0, 운영 알림·대시보드는 미확인 ⑥ 테스트 공백(감사 변이 확인): 닫힌 주문의 기대 금액이 `order.paymentAmount` 인지, 조회 실패 분류 중 PaymentError 아닌 오류·`PG_NOT_CONFIGURED`, 통화 불일치, `channelCheck:"absent"` 조기 통과, `resolveStartAccess` 폴백(지금 테스트는 검증 함수를 직접 부른다).
- 영냥이: B-3 🔴 중복 결제 주문 미소비 + 복구 기아(`worker/yeongnyangi/repository.js` `attachPayment` 의 이미 열린 요청 조기 반환 — 두 번째 결제 주문이 소비되지 않고 남는다), B-4·5·6 큐 DLQ 없음·복구 처리량·오도 로그, B-1·7·13 SoulCat 가격 사본 드리프트·라우트 가림, B-8·10 죽은 코드(삭제는 별도 변경), B-9 자동 환불 없음.
- W6 웹훅 타임스탬프 24h·관대 파싱(의도 설계, 위 '하지 않은 것'), W8 Play Billing `packageName` 본문 우선·빈 계정ID, W10 미사용 이니시스 키 4종이 `env.contract.json` 운영 required, W11 포트원 오류가 전부 503. 권고 ③ 관련 보고만: 구 경로가 포트원 원본을 `rawPortOne` 에 저장, SoulCat 시크릿 스캔 없음, 503 에 누락 키 **이름** 노출.
