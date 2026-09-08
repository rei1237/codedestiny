# 모바일 결제 완료 계약 감사 — 긴급 공통 회귀 수정 및 잔여 감사

기준 HEAD: `b2244641d97ecf4b8e82dcc5309fa255c4f2ae7a`. 이 문서는 완료 선언이 아니다.
사용자 변경이 있는 공유 체크아웃은 편집하지 않는다. 작업 위치는 `D:/Development/code-destiny-payment-resume`, 브랜치는 `codex/payment-resume-contract`다.

## 1. 발견된 구조

결제창 렌더러는 셸 `index.html`, 독립 정적 `js/destiny-profile.js`, React `app/_lib/billing-client.ts`다.
React는 `useCoinGate` → 공유 runtime gate → 독립 정적 checkout으로 이어진다.
실제 SDK 호출은 셸, destiny-profile, PointsClient 3곳이다. `lib/payment/portone.ts`에도 래퍼가 있으나 현재 직접 호출자는 검색되지 않았다. 삭제하지 않는다.
Worker는 `worker/payments/index.js`가 prepare/confirm/webhook을 합성하며, 주문·PG검증·entitlement·이용권·월정석은 별도 기존 모듈이다.
주문 확정은 조건부 갱신이고 webhook/redirect/reconcile이 같은 확정 코어를 사용한다. 이 안전 경계를 유지한다.

`checkout-entry.js`에 이미 `{kind, action, args}`, 핸들러 등록, 로컬 복귀 티켓, 24시간 영수증이 있다.
React는 `usePaidResume`를 사용한다. 티켓은 localStorage 우선/sessionStorage 폴백, 30분 TTL, 전체 사이트가 단일 키를 공유한다.
`destiny-profile.js`는 `portone_redirect=1`일 때 서버 confirm을 호출한 뒤 핸들러를 실행한다.

## 2. Inventory와 검색 범위

`node scripts/audit-paid-resume.mjs`로 가격 정본 153개 키(가격표 131 + unlock 22), 1,794개 소스, 결제 관련 524개 파일, 게이트 후보 172개, 이동 후보 1,210개를 수집했다.
별칭/레거시/정책 키와 실제 UI 기능은 일대일이 아니다. [inventory.md](inventory.md)는 후보 URL 표, [inventory.json](inventory.json)은 파일·행 근거와 redirect 전수 원자료다. 후보를 확정 URL이나 완료된 테스트로 해석하지 않는다.
가격표 외 이용권 상점 `/points`, 앱 `/app/store`, 동적 음악 트랙 `/music`, 프로필 추가/삭제, 사주 잠금 섹션을 별도 대조해야 한다.
기존 AST 배선 검사: React 40/40, 정적 46/46, 정적 kind 43 PASS. 이 검사는 입력 보존·자동 결과 제공·멱등성을 검사하지 않는다.
외부 CDN에서 스크립트를 받는 정적 페이지와 타 origin 페이지를 구분해야 한다. 실제 외부 origin 유료 실행 URL 확정은 진행 중이다.

## 3–4. 결함 및 우선순위 TOP 10

| 순위 | 기능/위치 | 심각도 | 코드에서 확인한 문제 | 모바일 영향 / 서비스 미제공 위험 |
|---|---|---|---|---|
|1|공통 `destiny-profile.js` 복귀|CRITICAL|confirm 성공 직후 티켓 삭제, 핸들러 실행 전 URL 제거|승인 후 refresh/실패 시 실행 입력 소실|
|2|공통 `checkout-entry.js` 티켓|CRITICAL|서버 복구 context 없음, 단일 localStorage 키|저장소 유실·복수 탭 결제 시 다른 입력 또는 복구 불가|
|3|이용권 상점 `/points`|CRITICAL|복귀는 URL/label/featureKey만 보존, 자동 실행을 명시적으로 생략|원래 질문/선택 소실, 상담 미실행|
|4|운명의 찻집 서버|CRITICAL|beginFortuneTeaHouseGeneration이 read 후 무조건 update/upsert|동일 요청 동시 진입 시 중복 LLM 및 결과 저장 경쟁|
|5|손금 `/palm-reading`|CRITICAL|큰 요청 payload는 sessionStorage stash, resume는 stash에 의존|새 탭/저장소 유실로 결제 후 입력 복원 불가|
|6|공통 `runPaidResume`|HIGH|문서 내 중복 실행 합류 장치 없음|중복 callback이 동일 핸들러 실행 가능|
|7|공통 영수증|HIGH|게이트가 실행 전에 consume하고 삭제, TTL 24시간|결과 생성 실패 후 재진입에서 결제 복구 불충분|
|8|미완료 주문 복구|CRITICAL|복귀 query가 없으면 direct resume 시작하지 않음|webhook만 성공 후 종료한 브라우저 재방문에서 원래 실행 누락|
|9|React 핸들러 완료 계약|HIGH|일부 핸들러는 상태 설정 직후 true, 비동기 결과 완료와 구분 불가|화면 진입을 결과 완료로 오판 가능|
|10|결과 지표|HIGH|결제/지급 로그와 각 기능 결과 저장이 분산|승인 대비 결과 누락을 공통으로 검출하지 못함|

다른 결함 후보: 관상/전생 관상의 resume args가 비어 있으며 별도 localStorage에 의존, 나침반 일부 단계가 빈 args, 낙관 unlock 서버 거절 후 rollback 경로. 재현·확정 전 수정 완료로 표시하지 않는다.

## 5. Resume Architecture — 설계 중

불변조건: 원래 workflow와 입력을 복구하고, 서버 승인/권한을 확인한 동일 실행 ID로 결과를 제공해야 성공이다.
PG 승인과 결과 완료는 다른 상태다. 클라이언트 쿼리·영수증은 복구 신호이며 서버 권한을 대체하지 않는다.
기존 checkout-entry 서술자를 확장하고, 서버의 기존 주문/실행 레코드와 연계한다. 별도 가격표·PG confirm 코어를 만들지 않는다.
실행 전 claim은 DB 조건부 갱신, 완료는 저장된 결과와 연결, 실패는 같은 주문/실행 ID로 재시도한다.
LLM이 응답한 뒤 저장 전에 프로세스가 죽는 모호한 구간까지 외부 LLM 호출의 무조건 exactly-once를 주장할 수 없다. 중복 전달/중복 차감 방지와 재열람 가능한 결과 저장을 검증하고 모호한 실행은 관측 가능해야 한다.
구현: 기존 주문 metadata에 AES-GCM 암호화 context를 결제 시작 전에 저장한다. 사용자/요청/기능에 바인딩하고, 소유자를 확인한 GET `/api/payments/orders/:id/resume`으로 복원한다. pending 30분, 승인 후 7일 조회 TTL이며 reconcile에서 7일 지난 암호문을 제거한다. URL에는 주문 식별자와 복귀 신호만 추가한다. 저장된 context 자체는 결제 권한이 아니며 기존 confirm/이용권 서버 판정을 유지한다.

클라이언트 티켓은 주문별 키로 분리했고 결과 완료 전에는 지우지 않는다. 동일 문서의 중복 callback은 하나의 Promise에 합류한다. 이용권 상점은 원래 서술자를 보존하고 구매 확인 후 원래 기능으로 돌려보낸다. 모든 기능의 입력 completeness나 서버 완료 상태 연결까지 완료한 것은 아니다.

## 6. 운명의 찻집

`FortuneTeaHousePage.tsx`는 이미 requestPayload/selectedCup/questionInput/attemptId를 서술자로 직렬화한다.
복귀 시 찻잔·질문을 복원하고 prepaid grant로 submitQuestion을 호출, 성공 ref를 반환한다.
3/5카드·사주·사주궁합·숙요궁합 5 SKU이며 카드 배열/질문/상대방 정보는 requestPayload에 포함된다.
인페이지 실패는 unusedPaidAttemptRef로 같은 attemptId를 재사용하지만 React memory이므로 unload 후 보장되지 않는다.
서버는 결과를 fortune_tea_house_results에 저장하고 completed 결과를 재사용한다. 생성 시작의 동시성 결함은 위 4번이다.

## 7. React / 정적 / 외부 정적

React와 정적은 같은 checkout-entry 계약을 공유하지만 복귀 후 실제 기능 모듈 로드와 입력 복원은 별개다.
타 origin에서는 브라우저 저장소를 공유한다고 가정하지 않는다. URL에 질문/생년월일 등을 싣지 않는다.
독립 정본인 public/ifa-oracle.html, public/static/geomancy-oracle-v4.html도 조사 범위에 포함한다.

## 8. 멱등성

기존 서버 주문/월정석/이용권 CAS 및 영수증 검증을 유지한다. 클라이언트 단일 실행만으로 서버 멱등성을 주장하지 않는다.
찻집과 명식 사주 AI의 read-then-write를 조건부 claim으로 수정했다. 기존 상태/갱신시각을 확인하고 최초 생성은 고유 ID 경합을 처리한다. 동시 요청에서 하나만 시작하는 mock 테스트가 통과했다. 사주에서는 durable claim 실패 시 LLM을 시작하지 않고 재시도 가능한 응답을 반환한다.

이용권 차감 CAS의 패자는 동일 소비 마커가 이미 기록됐는지 서버에서 다시 읽는다. 같은 요청이면 기존 성공을 재사용하고, 다른 요청이면 성공으로 간주하지 않는다. 마지막 한도를 사용한 요청은 현재 한도가 소진됐더라도 동일 기능/요청의 소비 마커로 이어갈 수 있다. 이 판정을 정적 AI 공통 권한 검사, V2 pass-check, Nakshatra, Master Love에 적용했다.

## 9. 복구 정책

승인된 주문은 생성 실패가 있어도 신규 결제를 요구하지 않고 기존 실행을 조회/복원한다.
승인 이전 context의 TTL과 승인된 미완료 실행 보존 기간은 분리한다. 기존 이용권 기간·월정석 정책·가격은 바꾸지 않는다.
과거 저장되지 않았던 입력은 소급 복구할 수 없다. 과거 승인 주문의 결과/증빙 조회와 재과금 방지가 별도로 필요하다.

## 10. 테스트

|검사|현재 결과|
|---|---|
|verify:paid-resume-wiring|PASS — React 40/40, 정적 46/46|
|긴급 AI 이용권 회귀 mock|PASS 19 — 실제 공통 권한 함수, 4등급 커버 경계, 궁성 결과 응답, 사주 저장 결과 재사용, 동시 생성 claim, 정적 3종 비동기 완료|
|전체 Jest|PASS 217 suites / 2,408 tests|
|전체 Node|PASS 906 tests; 이후 추가한 4등급 테스트까지 긴급 파일 19개 별도 PASS|
|npm run check:fast -- --base=HEAD|PASS exit 0 — 전체 필수 정책 검사, Node, Jest, Worker dry-run 포함|
|lint / typecheck / Worker dry-run build|PASS — lint 기존 warning 존재, 배포 없음|
|이용권 등급/월 한도 정책|PASS — verify:pass-tier-policy / verify:billing-pass-policy|
|독립 정적 결제 캐시 배포 경로|PASS — verify:payment-choice-parity, 오래된 콘텐츠 핀 갱신|
|직접 결제 복귀 mock|PASS 13 — 서버 context fallback / 이용권 상점 복귀 / 주문별 티켓 등|
|찻집 생성 claim mock|PASS 5|
|서버 암호화 context mock|PASS 5|
|Desktop 실제 기능 결과 제공|미검증|
|Mobile unload/redirect|미검증|
|Refresh/중복 callback|미검증|
|브라우저 종료/로그인 복구|미검증|
|local/sessionStorage 소실|미검증|
|취소/실패|미검증|
|승인 후 생성 실패 재시도|미검증|
|이용권/월정석|미검증|
|외부 정적 origin|미검증|
|webhook/redirect 순서 A–F|미검증|

실제 PG·LLM·운영 DB·배포 호출은 금지한다. mock 실패 시 실제 연동으로 폴백하지 않는다.

## 11. 남은 위험

전체 기능별 입력/결과 완료 계약, 외부 origin, native Play Billing, 과거 미완료 주문, 서버 저장 개인정보 보존, PWA 재진입, 모바일 브라우저별 실제 lifecycle 모두 추가 검증 대상이다.
위 표에 미검증이 남아 있는 동안 전체 완료 또는 SAFE를 선언하지 않는다.

## 12. 변경 파일

|파일군|변경 목적|
|---|---|
|worker/lib/pass-consumption.js, worker/payments/passes.js, worker/payments/index.js|동일 이용권 소비 경쟁/소진 후 재개 공통 수정|
|worker/routes/fortune.js|AI 공통 이용권 증거 재사용, 사주 생성 시작 CAS|
|worker/lib/nakshatra-paid-access.js, worker/routes/master-love-codex.js|동일 소비 마커를 새 구매와 구분|
|worker/routes/fortune-tea-house.js|중복 생성 claim 차단|
|js/saju-engine.js 및 public 미러|사주/점성술/궁성 resume 실제 결과 대기, 사주 반복 402에서 재결제 유도 방지|
|js/core/checkout-entry.js/.d.ts, js/destiny-profile.js, index.html 및 미러|공통 context, 주문별 티켓, 중복 callback 합류, 실행 실패 복구 유지|
|worker/payments/resume-context.js, orders.js, reconcile.js, worker/lib/pii-crypto.js, worker/index.js|기존 주문의 암호화 context 저장/소유자 조회/TTL 삭제|
|app/points/PointsClient.tsx, app/_lib/billing-client.ts|이용권 상점에서 구매 전 기능으로 복귀|
|app/nakshatra 각 클라이언트, _premium/use-premium-report.ts|입력 복원과 실제 결과 완료 반환, 일시 거절 시 낙관 이용권 유지|
|app/palm-reading/PalmDestinyMain.tsx|resume에 손금 요청 입력 포함|
|독립 정적 HTML, app/layout.js, 런타임 로더|변경된 공유 스크립트의 캐시 핀 갱신|
|__tests__ 관련 mock/fixture|PG·LLM 없는 재현 및 경쟁 조건 검증|
|config/payment-freeze.json, config/sitemap-lastmod.json|필수 정본/캐시 변경에 따른 매니페스트 갱신|

가격, 이용권 4등급 커버 범위/30일 기간/월 한도, 월정석 정책은 변경하지 않았다. 보유 이용권의 낙관 통과와 추가 PG 증빙 없는 생성 경로를 유지한다. 실제 월 한도 초과 판정까지 무시하는 변경은 하지 않았다.

## 긴급 회귀 원인과 적용 범위

1. **CRITICAL — 이용권 소비 경쟁**: 화면의 낙관 통과 후 백그라운드 기록과 생성 API가 같은 소비 요청을 동시에 실행하면 CAS 패자가 거절됐다. 공유 차감 함수를 수정해 동일 마커 성공을 재사용한다.
2. **CRITICAL — 소진 직후 재개 차단**: 마지막 한도를 이미 쓴 요청에도 현재 커버 가능 여부를 먼저 검사했다. 기존 소비 증거를 먼저 검사하고 새 요청만 현행 한도를 적용한다.
3. **HIGH — 정적 AI 조기 완료**: Promise 자체를 `!== false`로 검사하고 핵심 핸들러가 결과 전에 true를 반환했다. 사주·궁성·점성술에서 실제 결과를 기다린다.
4. **CRITICAL — 중복 LLM 가능**: 명식 사주/찻집의 시작 기록을 무조건 갱신했다. 조건부 claim으로 같은 시점의 중복 시작을 차단했다.
5. **HIGH — 수정 미도달**: 독립 정적 HTML의 결제 스크립트 캐시 핀이 구버전이었다. 소스 콘텐츠 기반 핀을 갱신했다.

위 수정은 로컬 격리 브랜치에 있으며 배포하지 않았다. 긴급 재현 테스트 통과를 서비스 전체 완료로 해석하지 않는다. 특히 모든 UI의 서버 입력 복원, query 없는 미완료 주문 자동 탐색, 자미두수 등 나머지 생성 API의 durable 결과 재사용, 승인 대비 결과 완료 지표는 아직 남아 있다.

2차 소스 검색: `node scripts/audit-paid-resume.mjs` — 1,795개 소스, 결제 후보 525파일, 가격 키 153개, 게이트 172개, 이동 1,210개. 이 결과는 누락 후보를 찾는 자료이며 모든 유료 기능의 동작 검증을 대신하지 않는다. 마지막 자체 검수 답변은 **아직 서비스 미제공 경로가 남을 수 있다**다.
