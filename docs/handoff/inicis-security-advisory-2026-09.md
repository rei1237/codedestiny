---
status: active
updated: 2026-09-23
next: "사람이 '남은 일' 2·3번 mongosh 집계를 돌리고(운영 읽기 권한 필요), 4~6번 포트원·이니시스 확인과 7번 Atlas Network Access 확인을 한다. 코드 작업은 3번 결과가 나온 뒤 엄격 모드 검토뿐이다."
---

# KG이니시스 가맹점 보안 권고(2026-09-18) 적용 — 인수인계

다음 세션 첫 문장: "docs/handoff/inicis-security-advisory-2026-09.md 를 읽고 '남은 일'부터 이어서 해."

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
1. ~~운영 승격~~ 완료(2026-09-23). 운영 Pages·Worker 모두 `11d0be467` in-sync(`verify-merge-landed --check=drift`). 승격은 12:22 workflow_dispatch run 35860013925 가 수행했다.
   - 승격 전 확인: 11d0be467 `PR CI` 통과, 스테이징 릴리스는 스모크의 `_next/static/chunks/webpack-*.js` 일시 404 로 1회 자동 롤백 → 청크 200 확인 뒤 `rerun --failed` 로 통과. `verify:release` 는 메인 체크아웃에서 CRLF 작업 트리(1,961파일) 때문에 `verify:billing-pass-policy`·`verify:paid-gate-ui` 가 헛실패했고, LF 분리 워크트리에서 나머지 전 단계(`build:worker` 포함)가 통과했다.
   - 이 세션이 연 운영 승격 run 35864616459 는 대기 중 main 이 `4986336c3`(다른 세션의 패밀리 이용권·퓨전 가격 결제 변경)로 앞서 있어 **배포 단계 전에 취소**했다. 그 변경의 운영 승격은 별도 검증·승인 대상이다.
2. 운영 결제 성공률과 결제→결과 제공 지표: 미확인. 읽기 전용 Mongo 집계(Payment 상태 분포·paidAt 있고 entitlementGrantedAt 없는 건수)를 시도했으나 자동 모드가 운영 읽기를 차단했다. 사람이 직접 돌리거나 권한 규칙을 허용해야 한다.
3. `channelCheck`/`storeIdCheck` absent 비율을 실측한 뒤 엄격 모드 전환을 검토한다. 이 필드는 0158a4bc9 에서 생겨 2026-09-23 승격(12:22 KST = 03:22Z)부터 운영에 있다 — 실결제가 쌓인 뒤에만 잴 수 있다.
   - 🔴 로그가 아니라 **운영 Mongo** 에 있다: `markOrderPaid` 가 `pg.summary` 를 `Payment.rawPortOne` 에 저장한다(`worker/payments/orders.js`). 그래서 2번과 같은 운영 DB 읽기 권한이 필요하다(09-23 세션 확인).
   - 2·3번 읽기 전용 mongosh 집계(사람이 실행, 쓰기 없음):
     ```js
     // 3번: 승격 이후 확정 건의 채널·상점 대조 분포. absent 가 0 이고 표본이 충분하면 엄격 모드(absent→실패) 검토
     db.payments.aggregate([{ $match: { paidAt: { $gte: ISODate("2026-09-23T03:22:00Z") } } },
       { $group: { _id: { ch: "$rawPortOne.channelCheck", st: "$rawPortOne.storeIdCheck" }, n: { $sum: 1 } } }])
     // 2번: 최근 7일 상태 분포와, 결제는 됐는데 권한이 안 붙은 채 paid 에 머무는 건수
     // (단건은 fulfilled 로 닫히며 entitlementGrantedAt 을 쓰지 않으므로 status:"paid" 로 한정한다)
     db.payments.aggregate([{ $match: { createdAt: { $gte: ISODate("2026-09-16T00:00:00Z") } } },
       { $group: { _id: "$status", n: { $sum: 1 } } }])
     db.payments.countDocuments({ status: "paid", paidAt: { $ne: null }, entitlementGrantedAt: null })
     ```
4. 포트원 문의: V2 KG이니시스 채널에서 `P_CHKFAKE`/`signature` 검증과 IDC centerCd 승인 URL 검증을 포트원이 수행하는가? 권고 메일 대응 공지가 있는가?
   - 문의 초안: "V2 KG이니시스 채널 결제에서, 이니시스가 2026-09-18 가맹점에 권고한 ① 인증 결과 위변조 검증(P_CHKFAKE / signature)과 ② IDC(centerCd)별 승인 URL 검증을 포트원이 연동 구간에서 수행하고 있는지, 가맹점 측 추가 조치가 필요한지 확인 부탁드립니다. 저희는 브라우저 SDK 결제 후 서버에서 결제 단건 조회 API로 금액·상점·채널을 대조하고 있습니다."
5. 포트원 콘솔: 운영·스테이징 웹훅 시크릿과 웹훅 URL 이 등록돼 있는지.
6. 이니시스 가맹점 관리자: 포트원 연동 MID 가 권고 대상인 "직접 연동"으로 분류되는지.
7. ~~`server/.env` `MONGO_URI` 템플릿 여부~~ 판정 완료(2026-09-23, 값 출력 없이 구조만 검사). 42a28e593 에 추가되고 ab1bfa7d1 에서 추적 해제된 파일이다.
   - 비밀번호 자리는 Atlas 템플릿 토큰(`<…password…>` 꺾쇠 형태)이다 → **비밀번호 유출 아님, 교체 불필요**. 같은 파일의 `JWT_SECRET`·`PORTONE_API_KEY`·`PORTONE_API_SECRET` 도 placeholder 문구(your/replace 류)다.
   - 다만 **실제 Atlas 클러스터 호스트(`*.mongodb.net`)와 DB 사용자명은 실값**이고 저장소는 PUBLIC 이다. 자격증명은 아니지만, 사람이 Atlas Network Access 가 `0.0.0.0/0` 전체 허용이 아닌지 한 번 확인한다(전체 허용이면 사용자명+호스트만으로 무차별 대입 표면이 된다).
