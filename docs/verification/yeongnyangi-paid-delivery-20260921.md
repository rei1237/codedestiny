# 영냥이 28상품 유료 전달 mock 검증 — 2026-09-21

## 결론

Code Destiny 통합 영냥이 28개 구매 키를 현행 단건 결제 계약으로 검사했다. 모든 상품이 서버 가격 registry와 일치했고, 환불 동의가 기록된 결제 확인 뒤 별도 시작 클릭 없이 누락 챕터가 자동 생성됐다. 완료본 새로고침·재열람에서는 추가 주문, 결제 SDK 호출, 생성 요청이 발생하지 않았다. 환불·취소·권한 없음 상태에서는 생성하지 않았다.

이번 검증은 로컬 mock 전송과 실제 애플리케이션·Worker 코드의 계약 검사다. 실 PG 승인, 과금 LLM, 운영 MongoDB 쓰기, 실제 기기, 프로덕션 승격의 증거가 아니다.

## 구매 키별 결과

| 체계 | 구매 키 | manifest·가격·자동 생성·재열람 |
|---|---|---|
| 사주 | `yeongnyangi-saju-mackerel` | PASS |
| 사주 | `yeongnyangi-saju-salmon` | PASS |
| 사주 | `yeongnyangi-saju-flounder` | PASS |
| 사주 | `yeongnyangi-saju-tuna` | PASS |
| 자미두수 | `yeongnyangi-ziwei-mackerel` | PASS |
| 자미두수 | `yeongnyangi-ziwei-salmon` | PASS |
| 자미두수 | `yeongnyangi-ziwei-flounder` | PASS |
| 자미두수 | `yeongnyangi-ziwei-tuna` | PASS |
| 숙요 | `yeongnyangi-sukuyo-mackerel` | PASS |
| 숙요 | `yeongnyangi-sukuyo-salmon` | PASS |
| 숙요 | `yeongnyangi-sukuyo-flounder` | PASS |
| 숙요 | `yeongnyangi-sukuyo-tuna` | PASS |
| 베다 | `yeongnyangi-vedic-mackerel` | PASS |
| 베다 | `yeongnyangi-vedic-salmon` | PASS |
| 베다 | `yeongnyangi-vedic-flounder` | PASS |
| 베다 | `yeongnyangi-vedic-tuna` | PASS |
| 서양 점성술 | `yeongnyangi-astrology-mackerel` | PASS |
| 서양 점성술 | `yeongnyangi-astrology-salmon` | PASS |
| 서양 점성술 | `yeongnyangi-astrology-flounder` | PASS |
| 서양 점성술 | `yeongnyangi-astrology-tuna` | PASS |
| 타로 | `yeongnyangi-tarot-mackerel` | PASS |
| 타로 | `yeongnyangi-tarot-salmon` | PASS |
| 타로 | `yeongnyangi-tarot-flounder` | PASS |
| 타로 | `yeongnyangi-tarot-tuna` | PASS |
| 융합 | `yeongnyangi-fusion-saju-ziwei` | PASS |
| 융합 | `yeongnyangi-fusion-sukuyo-vedic` | PASS |
| 융합 | `yeongnyangi-fusion-astrology-tarot` | PASS |
| 융합 | `yeongnyangi-fusion-all` | PASS |

## A~F 근거

- **A 결제:** 28개 `cdFeatureKey`를 서버 가격 registry와 대조하고, 환불·청약철회 동의가 참인 단건 카드·카카오페이 주문만 진행했다. 이용권·월정석은 적용하지 않았다.
- **B 생성:** 사주·자미두수·숙요·베다·서양 점성술·타로 6개 실제 계산 어댑터와 28상품 manifest·프롬프트·입력 변이·품질 계약 35건이 통과했다.
- **C 장애:** 결제 확인 보류, 조회·증빙 활성화 503, 생성 실패·중단, 환불, PG 취소·실패, 인증 만료, 소유권·상품·복귀 URL 변조를 주입했다. 환불 상태 생성은 0회였다.
- **D 전달:** Chromium·WebKit, 360·390·430px, 카드·카카오페이, 일반 복귀·새 탭/저장소 유실을 포함한 104개 브라우저 mock 시나리오가 통과했다.
- **E 저장·복구:** 생성 중단 뒤 보관함을 거쳐 다시 열면 기존 챕터부터 자동 재개했고, 새 탭에서는 서버 결제 재개 문맥을 사용했다.
- **F 재열람:** 완료 후 새로고침에서 주문 수와 결제 SDK 호출 수는 그대로 1회였고, 생성 호출 수가 증가하지 않았다.

## 실행 결과

```text
node scripts/verify-yeongnyangi-engines.mjs
PASS 35 engine/product contracts; no paid LLM or PG calls

node scripts/run-mock-tests.mjs jest <영냥이 Worker 7 suite> --runInBand
Test Suites: 7 passed, 7 total
Tests: 70 passed, 70 total

YEONGNYANGI_TEST_BASE=http://127.0.0.1:<mock-port> node scripts/verify-yeongnyangi-browser.mjs
PASS: 104 cases, 28 products
realPgCalls: 0, realLlmCalls: 0, productionDbWrites: 0
```

Worker의 결제 증빙 소비, 생성 lease, 저장·복구 경로에서는 제품 결함이 재현되지 않아 제품 코드는 수정하지 않았다. 브라우저 검증기만 환불 동의, 결제 후 자동 생성·자동 복구, 완료본 무과금 재열람 계약에 맞춰 갱신했다.
