---
status: active
updated: 2026-09-26
next: "스테이징 명시 배치(remote-ICN)를 프로덕션에 올릴지 사용자에게 별도 1회 승인으로 묻는다. Browser Shadow webkit-refund 는 환경 불안정으로 분류돼 있으니 새 실행 결과만 본다."
---

# 영냥이 결제 이탈 화면 버그 + 서버 지연 (2026-09-26)

다음 세션 첫 문장: "docs/handoff/yeongnyangi-latency-abandon-fix.md 를 읽고, 스테이징 명시 배치(remote-ICN)를 프로덕션에 올릴지 사용자에게 별도 1회 승인으로 묻는다. Browser Shadow 는 새 실행 결과만 확인한다."

## 왜
결제하려다 그만두고 뒤로 가면 "0 / 5개 챕터 저장됨" 챕터 화면이 나왔다(결제 안 했으면 이전 화면이어야 함). 영냥이 서버가 느리니 병목을 찾아 최적화하라는 요청.

## 지금 상태
- ① 버그 수정 `9d23051a8`(푸시·`CI required` 통과): 체크아웃 "← 영냥이 방" → `/yeongnyangi/`(직전이 같은 출처 영냥이 비-Result 화면이면 `history.back()`), "생선 다시 고르기" → `/yeongnyangi/fortune/`, 미결제 Result 는 진행바·목차 생략. SoulCat 모드·결제 시작·PG 복귀·성공 이동은 무변경. PG 복귀 키 가드는 뺐다(paid-gate 감사: 생략해도 안전).
- ② 스테이징 전용 명시 배치 `483760d86`(주석 정정 `d36605381`). 프로덕션 무변경.
- Browser Shadow(비차단): ① 포함 CI 에서 `webkit-refund` 까지 간 2건은 `Return must execute shared server payment confirmation` 로 실패(변경 전 3건 통과). 같은 커밋 재실행 3건은 그 앞에서 죽었다(`webkit-generation-interrupted` `ChunkLoadError` 2, `webkit-360-CARD-redirect` WebKit 내부 오류 1). 로컬 WebKit `webkit-refund` 4/4 통과. 판정: 환경 불안정 + 기존 하네스 경쟁, ① 회귀 증거 없음(표본이 작아 완전 배제는 아님).

## 지연 — 원인과 실측
원인: Worker 가 진입 colo(ATL/BOS/LAX)에서 돌고 Atlas 는 서울이다. 요청 스코프 연결(C3)이 요청마다 콜드 핸드셰이크 1.3~2.3s + op 당 ≈415~480ms(문서 기준선)를 낸다. 프로덕션 `smart` 배치는 효과 0 — Mongo TCP 를 못 보는 탓으로 **추정**(미검증).

| 스테이징 `/api/*`, curl 3회 | 기준(smart) | targeted `aws:ap-northeast-2` | 배포 2회 뒤 |
|---|---|---|---|
| cf-placement | local-ATL·BOS | remote-ICN | remote-ICN |
| 캐시 미스 `/api/reviews` | 4.10~4.64s | 1.04~1.06s | 1.01~1.10s |
| `/api/health` | 1.16~1.50s | 0.81~0.88s | 0.60~0.97s |

측정(공개 GET 만): `curl -s -o /dev/null -D h.txt -w '%{time_total}\n' "https://staging.code-destiny.com/api/reviews?page=<처음 보는 큰 수>"` 후 `grep -i cf-placement h.txt`(page 를 바꿔야 캐시 미스).

tail(`npx wrangler tail code-destiny-web-staging --config worker/wrangler.staging.toml --format json --ip self`, targeted, 캐시 미스 reviews 6건·health 6건): reviews 는 Worker wall 152~320ms(중앙 266)·`[db-connect]` elapsedMs 77~225(중앙 161)·Mongo 명령(`aggregate`·`find`) 3~5ms·스코프 close 1ms. health 는 Worker 처리 1~4ms 라 curl 0.6~0.97s 는 전부 진입 colo 경로+ICN 홉이다(코드로 못 고침 — `worker/wrangler.toml` 애니캐스트 IP 주석). 문서 기준선과 같은 조건의 대조는 아니다. 원본 캡처는 IP·헤더가 있어 스크래치에만 뒀다. 명령별 ms(`[db-cmd-ok]`)는 `APP_ENV=staging` 일 때만 찍힌다(`worker/lib/db.js:692,1340`) — 프로덕션 tail 은 `[db-connect]` elapsedMs·wall 로 본다.

## 남은 작업
- [ ] 프로덕션 승격 결정(사용자, 별도 1회 승인): `worker/wrangler.toml` `[placement]` smart → targeted+region, 검증기 선언 둘(`placement.mode` MUST_DIFFER, `placement.region` STAGING_ONLY) 삭제(규칙 4 협의). 위험: 해외 사용자 홉 +1, 지역 장애 폴백 미검증, fetch 핸들러만 적용(큐·크론·RPC 제외), 표본 3×3·한 머신. 승격 뒤 프로덕션 tail 로 `[db-connect]` elapsedMs 를 재서 콜드 1.3~2.3s 기준선과 비교.
- [ ] 이번에 안 한 최적화(사유):
  - P2 `attachPayment` 중복 읽기: 환불 감지 완화(`readRequest` 가 DIRECT_KRW 환불 검사 포함)·`retry.js:13` 이 `__tests__/worker/yeongnyangi-retry.test.js:17` 에 고정·큐/복구 크론이 간접 호출. 재개 조건: id·owner 가드+폴백, `worker/yeongnyangi/service.ts` 의 `attachPayment(` 호출(현재 :180)만.
  - P3 폴링 상한 횟수→시간: 창이 줄면 결제한 사용자가 "확인 중"에서 놓친다. 대안 백오프 1.5→3→5s, 배치 효과를 본 뒤 재평가.
  - 클라 팬아웃(Result·Library 인증·프로필 ≈13건)·`app/components/PaymentProcessingContext.tsx:1234-1267` 400KB 프리워밍 건너뛰기: 공유 결제 Provider(RED), 요청 수 전후 계측 먼저.
  - `/api/insights` 목록 캐시: 의도된 미캐시(`worker/lib/insight-public-cache.js` — 쿼리 변형 집계, prefix purge 없음). 정규화+무효화 설계가 먼저.
  - 인증 읽기 병렬화(`peekAccessTokenUserId`)·폴링 응답 슬림화(RED)·챕터 pre-LLM 중복 읽기(단계별 시간 로그 먼저)·프로덕션 인덱스 실측(운영 DB → 승인).
  - 하지 말 것: 챕터 병렬화(프롬프트가 앞 장을 입력), `max_concurrency`(toml 구조), `thinkingBudget` 하향, `countTokens` 생략.

## 정본 예시
`app/checkout/CheckoutClient.tsx` 의 `canGoBackToPreviousScreen`·`leaveToPreviousScreen`. 시나리오는 `scripts/lib/yeongnyangi-mobile-payment.mjs` 의 `abandon-back`·`abandon-from-result`.

## 함정
- E2E: `node scripts/verify-yeongnyangi-browser.mjs --build-static` 는 `out/` 만 빌드한다. 서빙 뒤 `YEONGNYANGI_TEST_BASE` 로 플래그 없이 돌리고 `--payment-filter=<정규식>` 으로 좁힌다. Playwright `framenavigated` 는 `replaceState` 에도 발화하니 이동 경로 단언은 연속 중복을 접는다.
- 결제 이탈 뒤 폼 재제출은 CREATED 유령 행을 또 만든다(알려진 결과). 모바일 PG 복귀는 문서가 새로 열려 `/yeongnyangi/` 로 간다(의도). 히스토리 0번 체크아웃에 앞 항목이 있으면 `history.back()` 이 무동작(폴백 미도입).
- 🔴 보고만(범위 밖): B-2 Family 이용권이 미결제 Result 를 열기만 해도 조용히 유료 처리될 수 있음 / B-3 중복 결제 주문 미소비 → 복구 크론 굶음 / 결제 성공 뒤 뒤로가기 시 체크아웃이 Result 로 튕김 / `app/yeongnyangi/_components/SpiritResult.tsx:24-26` 미결제 상태·진행바 / `docs/payment-policy-flow.md:28`(direct_only)↔`docs/context/payment-gating.md:23`(direct_or_family) / `worker/routes/billing.js:4572` 주석 TTL 5s↔실제 `BILLING_BALANCE_CACHE_TTL_MS`=45000(:332) / `app/yeongnyangi/yeongnyangi.module.css` design-system-font 훅 기존 8건 / `verify-yeongnyangi-result-sharing.mjs` 낡음 / 하네스 페이지 에러 허용 목록에 `/api/auth/me` 없음.
- Browser Shadow 는 첫 실패에서 멈춘다 → 판정 전에 "어디까지 갔나"부터 본다. 정적 청크 로드 실패도 페이지 에러로 세어 네비게이션과 겹치면 실패한다. `refund` 시나리오는 `row.paid=true` 로 시작해 체크아웃의 두 비동기 사슬(행 읽기→Result 이동 / 런타임 로드→`/api/billing/confirm`)이 경쟁한다 — 느린 WebKit 에서 앞 사슬이 이기면 `waitResult` 의 `confirm>0` 이 깨진다(가설). 확정은 지연 주입 로컬 A/B(변경 전·후). ① 회귀로 확정되면 조건을 덧대지 말고 ① 를 revert.

## 검증
```
node --test __tests__/ui/checkout-soulcat-mode.static.test.js
node scripts/verify-yeongnyangi-result-retry.mjs
npm run verify:payment-freeze ; npm run verify:worker-config-parity
```
로컬 mock 브라우저 E2E 108/108, 실 PG·LLM·운영 DB 호출 0.

## 모르는 것
health 기준선(1.16~1.5s)이 배치 뒤보다 느렸던 이유(Worker 처리 1~4ms — 시간대별 네트워크 변동 가능, 미분리) · 프로덕션에서도 같은 폭인지(프로덕션 tail 미실측) · 결제·생성 레인(쓰기·LLM)의 배치 효과(미측정) · 지역 장애 폴백 · 실기기 PG 왕복.
