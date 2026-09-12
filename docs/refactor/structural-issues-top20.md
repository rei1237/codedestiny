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
| 16 | 동일 상수 재선언 | pass 가격 4종이 `lib/payment/pass-pricing.js:18-21` + `worker/lib/app-store-pricing.js:73-76`; `KRW_PER_COIN` 3곳; 원화 포맷 인라인 ~25곳 | 미해소 (Phase 1) |
| 17 | 범용 유틸 중복 | `normalizeGender` 31벌, `Asia/Seoul` 하드코딩 121파일, Julian day 9벌, `iana-offset` 정본 importer 6 vs 경쟁 파서 4 | 미해소 (Phase 1) |
| 18 | 타입·린트 사각지대 | `tsconfig` include 가 `**/*.ts(x)` 뿐 → `js/`·`worker/`(73파일)·`scripts/` 전부 미검사. `next.config.mjs` `ignoreBuildErrors: true`. `eslint --quiet` 로 `no-explicit-any` 등 warn 전부 비가시 | 미해소 (Phase 3) |
| 19 | 필수 CI 가 `skipped` 를 통과로 인정 | `.github/workflows/pr-ci.yml:969-972` `ci-required` 가 `if: always()` + `needs:[classify,fast,guards,build,critical]` → `classify` 오분류가 초록불과 구분되지 않는다 | 미해소 (Phase 3) |
| 20 | 가드 44개가 "배선 후보(미승인)"로 아무것도 지키지 않음 | `scripts/verify-guard-wiring.mjs` `UNWIRED_BY_DESIGN`. 2026-09-13 전수 실측: **41개 통과 / 3개 실패** — 통과분을 안 돌리는 것은 순수 손실 | 부분 해소 (`9163a7dac`) — 41개는 `SHADOW_OBSERVING` 에서 비차단 관측 중, 차단 승격은 Phase 9 |

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
