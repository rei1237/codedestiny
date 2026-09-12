# 구조적 문제 TOP 20

측정일 **2026-09-12**(20번의 가드 전수 실측만 **2026-09-13**). 전부 실측이며 줄번호는 그 날짜 기준이다. 순위는 "회귀를 만드는 힘"이다 — 빈도 × 피해 × 조용함.

상태 열: `미해소` / `Phase N` 진행 중 / `해소 (커밋)`. Phase 를 끝낼 때 이 열을 고친다.

| # | 문제 | 근거 | 상태 |
|---|---|---|---|
| 1 | 38,517줄 수작업 `index.html` 이 production `/` — 인라인 스크립트 21,803줄, 단일 블록 12,721줄 | 120일 커밋 24%(1,525/6,436), 렌더링 테스트 0, 가드 61개가 텍스트로만 읽음 | 미해소 (Phase 5) |
| 2 | 사주 엔진 5벌이 한 생일에 다른 답을 낼 수 있다 | `js/saju-engine.js:5072`, `app/saju/animal-destiny/engine/localSajuCalculator.ts`, `worker/lib/destiny-bias-engine.js:936`, `life-book-ai-saju.js:723`, `saju-snapshot-from-birth.js:56` | 미해소 (Phase 7) |
| 3 | 이용권 판정 3벌이 하드코딩돼 있고 값이 불일치 | `worker/lib/profile-limits.js:97,115`(정본) vs `app/_lib/billing-client.ts:569,579,587`(월한도·familyQuota 없음) vs `js/core/pass-verdict.js:51,55` | 미해소 (Phase 4) |
| 4 | 권한 상태 writer 4개 × TTL 4종 → 결제한 잠금이 화면마다 보였다 안 보임 | `access-store.js:14`(24h grace), `user-session-cache.ts:202-207`, `optimistic-unlock-ledger.ts:16`, 서버 | 미해소 (Phase 4) |
| 5 | `window.fetch` 몽키패치 | `app/_lib/user-session-cache.ts:556-557,619` → `js/**` 의 raw fetch 전부가 모르는 캐시로 우회된다 | 미해소 (Phase 4) |
| 6 | `/api/auth/me` 를 독립 시계 3개가 호출(8s / 30s / 30·15·2s) | 계약은 1회(`docs/DEBUGGING_GUIDE.md:204-221`), 실측 5회(`scripts/verify-entry-fanout.mjs`) | 미해소 (Phase 4) |
| 7 | repository 계층 부재 | worker 69파일에 인라인 모델 접근 ~681곳. 동일 30필드 projection 이 `worker/routes/profile.js` 945·1024·1057·1245·1391·1427 에 6번 | 미해소 (Phase 6) |
| 8 | `worker/routes/fortune.js` 6,915줄이 결제·권한·인증·Mongo·LLM·프롬프트·엔진을 융합 | 손으로 만든 402 응답 ~20개 | 미해소 (Phase 6) |
| 9 | AI 상담 라우트 8개 17,805줄이 각자 전 과정을 재구현 | 공용 `permission-service.js`·`payment-service.js` import **0** | 미해소 (Phase 6) |
| 10 | LLM 추상화 우회 3곳 + mock 게이트 5벌 재구현 | `lib/tarot/oracle-consultation.mjs:299`, `mindscan-reading.mjs:841`, `love-reading-llm.mjs:167` | 미해소 (Phase 2) |
| 11 | 🔴 jest 목 매퍼가 경로 모양에 의존 → **테스트가 실과금 LLM 호출을 할 수 있다** | `jest.config.cjs` 가 `^\.\./\.\./lib/llm-client\.ts$` 만 매핑. 깊이가 다른 테스트는 목을 못 받는다 | 미해소 (Phase 2) |
| 12 | 결제 스택 2개를 body-sniffing 으로 중개, PortOne 로더 3개 경쟁, 환불 경로 4개, identity 2개 | `worker/index.js:1327-1448`; `index.html:22061`, `js/destiny-profile.js:3968`, `lib/payment/portone.ts:294` | 미해소 (Phase 8) |
| 13 | 주문 상태기 정본 외 병렬 status enum 6개 이상 | 정본 `worker/payments/orders.js:35`; 경쟁 `worker/lib/models.js:315,316,462,732,738,772,781,821` | 미해소 (Phase 8) |
| 14 | resume 영속 스키마 3개 | `checkout-entry.js:154,1549`, `app/_lib/paid-attempt-session.ts:42`, `access-store.js:10` | 미해소 (Phase 8) |
| 15 | fetch 래퍼 5개 + 재시도·서킷브레이커 정책 4종, API base 재도출 ~20곳, 기본 origin 4개 | `http-client.ts`, `auth-client.ts:570`, `billing-client.ts:1916,1971`, `service-read-client.ts`, `access-store.js:258` | 미해소 (Phase 4) |
| 16 | 동일 상수 재선언 | `KRW_PER_COIN` 이 3곳이 아니라 **5곳**(정본 `billing-policy.js:1`, 복사 `profile-limits.js:9`·`coin-pricing.ts:3`, 가드 내 하드코딩 `verify-payment-policy-md.mjs:12`·`verify-krw-copy-canonical.mjs:60`). pass 가격은 **이미 묶여 있었다** | 해소 (`dc93b4545`·`6559cb245`·`827248162`) — 원화 **포맷** 인라인은 이관, 아래 참조 |
| 17 | 범용 유틸 중복 | `normalizeGender` 31벌, `Asia/Seoul` 하드코딩 **179**파일(121 은 글롭 범위가 달랐다), Julian day 9벌, `iana-offset` 정본 importer 6 vs 경쟁 파서 4 | **C급 오분류** — 아래 참조. Phase 1 에서 하지 않는다 |
| 18 | 타입·린트 사각지대 | `tsconfig` include 가 `**/*.ts(x)` 뿐 → `js/`·`worker/`(73파일)·`scripts/` 전부 미검사. `next.config.mjs` `ignoreBuildErrors: true`. `eslint --quiet` 로 `no-explicit-any` 등 warn 전부 비가시 | 미해소 (Phase 3) |
| 19 | 필수 CI 가 `skipped` 를 통과로 인정 | `.github/workflows/pr-ci.yml:969-972` `ci-required` 가 `if: always()` + `needs:[classify,fast,guards,build,critical]` → `classify` 오분류가 초록불과 구분되지 않는다 | 미해소 (Phase 3) |
| 20 | 가드 44개가 "배선 후보(미승인)"로 아무것도 지키지 않음 | `scripts/verify-guard-wiring.mjs` `UNWIRED_BY_DESIGN`. 2026-09-13 전수 실측: **41개 통과 / 3개 실패** — 통과분을 안 돌리는 것은 순수 손실 | 부분 해소 (`9163a7dac`) — 41개는 `SHADOW_OBSERVING` 에서 비차단 관측 중, 차단 승격은 Phase 9 |

## 16·17 재측정 (2026-09-13, Phase 1)

원장의 16·17 은 "같은 값이 여러 벌"만 보고 전부 C급(기계적 수렴)으로 묶었다. 변이 검증까지 해 보니 **네 축 중 둘은 이미 묶여 있었고, 둘은 C급이 아니었다.** 남은 하나만 실제 작업이었다.

| 축 | 실측 | 판정 |
|---|---|---|
| pass 가격 4종 | `PASS_MONTHLY_WON.standard` → 10900 변이 시 `verify:pass-tier-policy` 가 "앱 SKU cd_pass_standard_30d: 웹가 정본 일치"·셸 `goldenPackages` 까지 3건으로 탐지 | 이미 묶임. `app-store-pricing.js` 의 `webAmountKRW` 는 [의도된 복사](../../worker/lib/app-store-pricing.js)다(10-13행: 합치면 Play Console 등록가가 조용히 따라 움직인다). 건드리지 않는다 |
| `KRW_PER_COIN` worker 2벌 | `profile-limits.js` → 120 변이 시 가드 3개 탐지 | 이미 묶임. 그래도 재선언은 제거(수렴 후 4개가 탐지) |
| `KRW_PER_COIN` 가드 내 2벌 | `billing-policy.js` → 120 변이 시 `verify-payment-policy-md` **PASS(미탐)** — 지킬 상수를 자기 안에 다시 적어 둔 탓 | 실제 구멍. 정본 import 로 수정 |
| `coin-pricing.ts` 프론트 2벌 | `scripts/**`·`__tests__/**` 참조 **0**. 주석만 "반드시 일치해야 한다" | 실제 구멍. `verify:krw-copy-canonical` 에 대조 추가 |
| 원화 **포맷** 인라인 | 번들 도달 범위에서 11곳. 정본 `formatKrwAmount` 는 이미 있고 20곳 넘게 쓴다 | **기계적 수렴 불가** — 사이트마다 계약이 다르다. `useServerPrice.ts:50` 은 `Math.floor`+`""`, 정본은 `Math.round`+`"0원"`. 바꾸면 동작이 바뀐다 |
| `normalizeGender` 31벌 | 토큰 집합(`남자`·`man` 포함 여부)·`clean()` 상한(20/40/무제한)·폴백(`""`/`"unknown"`/`"other"`/`text\|\|""`)·반환 집합(`male`/`M`/`GenderLean`/`ProfileGender`)이 전부 다름. 완전 동일 쌍은 3쌍뿐 | **C급 아님**. 하나로 수렴하면 입력 정규화 결과가 라우트마다 바뀐다 = 동작 변경 |
| `Asia/Seoul` 179파일 | 값이 하나뿐인 리터럴이라 드리프트가 성립하지 않는다. 정적 셸(번들러 없음)·worker·app·scripts 네 세계에 공통 import 경로가 없다 | **C급 아님**. 상수화해도 얻는 보호가 0이고 CSP 해시 청크만 흔든다 |

### 남은 것을 어디로 보냈나

- 원화 **포맷** 인라인 11곳 · `normalizeGender` 31벌: 동작 변경을 동반하므로 "보호 테스트 → 계약 통일 → 호출부 이관" 순서가 필요하다. 계약을 고르는 일은 판정 수렴이라 **Phase 6**(repository 계층, 라우트 공통화)에서 라우트별 입력 정규화와 함께 다룬다.
- `Asia/Seoul` · Julian day · `iana-offset`: 이번 리팩터링에서 **하지 않는다**. 상수화는 보호를 만들지 않고, 날짜 엔진 통합은 Phase 7(엔진 단일화)의 characterization 뒤에야 안전하다.

🔴 교훈: "같은 값이 N벌"은 그 자체로 C급 근거가 아니다. **이미 묶여 있는지(변이로 확인)** 와 **벌끼리 계약이 같은지** 를 먼저 봐야 한다. 이 표의 여섯 축 중 실제 작업은 둘이었다.

## 측정 방법 재현

```bash
# 줄 수·커밋 수
git ls-files | xargs wc -l | sort -rn | head -20
git log --since=120.days --name-only --pretty=format: | sort | uniq -c | sort -rn | head -20
# 공동 변경(동반 수정 덩어리)
git log --since=120.days --name-only --pretty=format:%H | node scripts/... # 임시 집계로 측정했다
# 중복 판정
git grep -n "normalizeGender" -- '*.js' '*.ts' '*.mjs' | wc -l
git grep -ln "Asia/Seoul" | wc -l
# 가드 배선
node scripts/verify-guard-wiring.mjs --report
```

🔴 이 원장의 숫자를 **다시 전수 측정하지 않는다.** 필요한 항목만 위 명령으로 재확인하고 그 행의 날짜를 갱신한다. 반복 전수 분석은 토큰 낭비이며, 그게 애초에 이 문서를 만든 이유다.
