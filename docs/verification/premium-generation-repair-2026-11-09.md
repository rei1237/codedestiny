# 고가 운세 빈 장 복구 및 정적 섬 검증

사용자 요청(2026-11-09): 진행 중인 3만원 이상 운세의 빈 장과 초융합·나머지 기능 생성 정상화, 자미두수의 섬은 LLM 대신 정적 방식 유지.

## 반영 위치와 수정

- 진행 중이던 `feat/premium-llm-chapter-upgrade`에 `a0d9b364d`, `ad7ac891e`로 반영했다. 다른 세션의 PDF·숙요 테스트·인수인계 미커밋 변경 4개는 보존했다.
- 초융합: 빈 분야 장 구제가 한 번 실패하면 남은 예약 횟수를 쓰지 않고 완료하던 경로를 수정했다. 장별 기존 한도 안에서 재개하며 한 요청의 구제는 두 장까지다. 구제와 분량 보충을 같은 요청에서 겹쳐 실행하지 않는다.
- 자미두수 상담 판 2: 일부 섹션만 있어도 묶음을 완료하던 경로에 빠진 섹션만 요청하는 구제 1회를 추가했다. 기존 본문은 유지하며 예약을 먼저 저장한다.
- 심화 자미두수 판 2: 일반 시도를 소진한 빈 장은 저장된 별도 구제 1회 후에만 건너뛴다. 서버 복구도 이 경로를 사용한다. 판 1 예산은 유지한다.
- 섬: 기존 생성은 이미 정적 명반 해설 조합이다. 이를 유지하고 오래된 모듈 설명을 정정했다. UI가 청사진 API만 요청하며 생시 입력·미상 모두 열두 궁 해설이 생기는 행동 검사를 추가했다.
- 공급자가 계속 실패하면 정상 본문을 보존하여 기존 부분 전달 정책을 따른다. 빈 장 완성을 보장하는 가짜 본문은 넣지 않는다. 저장 완료본은 재생성하지 않는다.

## 검증

실 LLM·실결제·운영 DB 없이 mock과 로컬 계산으로 검증했다. 중복 실행을 제외한 집중·회귀 테스트 790개 통과.

| 명령 / 묶음 | 결과 |
| --- | --- |
| `npm run test:jest -- --runInBand --silent` + `astrology/vedic/karma/master-love-codex/naming/nakshatra/neo/ziwei-island/fusion-paid-delivery-route/fusion-snapshot-delivery` | 10 suites, 411 tests 통과 |
| 같은 Jest 명령 + `human-design-paid-delivery`, `destiny-compass-paid-delivery`, `new-year-section-plan-v2`, `fusion-group-plan-v2` | 4 suites, 111 tests 통과 |
| 같은 Jest 명령 + `ziwei-paid-delivery` | 42 tests 통과 |
| `node --test __tests__/ui/ziwei-deep-paid-delivery.behavior.test.js` | 63 tests 통과 |
| `node --test` + `love-secret-paid-delivery`, `life-book-paid-delivery`, `new-year-paid-delivery`, `sukuyo-legacy-delivery`, `sukuyo-compat-chapters` | 161 tests 통과 |
| `node --test __tests__/ui/island-free-exploration.behavior.test.js` | 2 tests 통과 |
| `node scripts/verify-island-report.mjs` | 픽스처 9개 결정론·완전성·순수성·톤 검사 통과 |
| `buildPaidDeliveryInventory()` + `inventoryIsComplete()` | `complete: true` |
| `git diff --check` | 통과 |
| `npm run verify:worker-no-undef` | worker·lib 874개 파일 검사 통과 |
| `npm run check:fast -- --plan` | critical 승격 확인 |
| `npm run check:fast` | critical 승격 후 광범위 게이트가 순차 실행됨. 별도 pre-push의 기존 미러 불일치로 전달 불가를 확인하여 중단(exit 1). 완료한 하위 항목은 통과했으나 종합 검사는 미완료이며 통과로 간주하지 않음 |
| `npm run check:pre-push` | `verify:public-mirror-fresh`에서 실패: 기존 소스·미러 16개 불일치 |

## 유지한 경계와 남은 확인

- 가격·이용권·월정석·단건 결제 정책, 인증·소유권·차감·환불 조건, DB 스키마 및 API 응답 구조를 변경하지 않았다. 변경은 생성 예약·재개·정적 해설 계약에 한정한다.
- 공개 URL·title/description/H1·canonical·robots·sitemap·공개 본문에는 변경이 없어 SEO 영향은 없다.
- 실제 공급자의 생성 품질·성공률과 운영 동작은 미검증이다.
- 진행 중인 개선 브랜치는 시작 시점에 원격 main보다 99커밋 앞서고 53커밋 뒤처져 있었다. 이번 수정만으로 그 전체 작업을 main에 합치거나 push하지 않았다. 기존 정적 미러 불일치와 전체 개선 작업 통합 검증이 먼저 필요하다. 운영 배포는 하지 않았다.

## 수정 파일

- `worker/lib/fusion-fortune.js`
- `worker/routes/ziwei-ai.js`
- `worker/routes/ziwei-deep-report.js`
- `worker/lib/ziwei-deep-delivery-v2.js`
- `worker/lib/ziwei-deep-report-recovery-task.js`
- `worker/lib/island/island-report.js`
- `__tests__/worker/fusion-group-plan-v2.test.js`
- `__tests__/worker/ziwei-paid-delivery.test.js`
- `__tests__/ui/ziwei-deep-paid-delivery.behavior.test.js`
- `__tests__/ui/island-free-exploration.behavior.test.js`
- 이 검증 기록
