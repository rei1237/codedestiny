# CR-005 실행 선택·재개 고정 구현 기록

status: generation-boundary-implemented-default-off-local-only

기준 `91021aa3a20856f5b4cca6abd8b560ac36ef46ad`. 사용자 CR-005 승인에 따라 기본 OFF로 구현한다. 기존 감사 워크트리를 사용하고 main 병합·push·배포하지 않는다. Swiss·실결제·운영 DB·LLM 호출 금지.

최초 대상은 CR-005의 자미 상담 생성 경계다. 기존 `llmMeta.chartSnapshot`과 `(userId, idempotencyKey)` unique/lease를 사용한다. 신규 문서 생성에 snapshot을 함께 넣고 재개는 저장 snapshot을 사용한다. 사주 유료 라우트·prepare/basis 전환은 자동 편입하지 않는다. 새 필드/키가 필요한 준비 단계 영속 선택은 별도 CR로 남긴다.

## 구현한 경계

- [ziwei-execution-adapter.js](../../worker/lib/ziwei-execution-adapter.js): 새 외부 공개 래퍼. 기본 `calendarAuthorityV2:false`. 명시적인 신뢰된 호출 옵션만 신규 계산에 적용하며 요청 본문의 플래그는 읽지 않는다. 시험 ON은 현대·서울·확인된 시간/성별·양/음력 범위에 한정하고 실제 날짜/보정 날짜 지원은 기존 공개 계산기가 검증한다. 선택 후 오류를 legacy 재계산으로 숨기지 않는다.
- [ziwei-ai.js](../../worker/routes/ziwei-ai.js) `handleStart`: 소유자/기존 실행 확인 후 계산을 사전 검증하고, 새 문서의 **기존 `llmMeta.chartSnapshot` 필드에 최초 명반을 함께 원자 저장**한다. DB unique 인덱스 `(userId, idempotencyKey)`와 기존 lease를 그대로 사용한다. 운영 호출은 옵션을 넘기지 않으므로 계속 OFF다.
- 재시도는 저장 snapshot을 우선 사용하며 새로운 플래그/연도/입력으로 명반을 다시 만들지 않는다. lease 취득 후 읽은 명반이 사전 조회 후보보다 우선한다. 동시 신규 요청이 각자 사전 계산할 수는 있지만 **영속 확정본·생성·차감은 하나**여야 하며 그 조건을 mock으로 검사했다.
- 저장 snapshot은 복사해 소비자에 전달한다. 완료 결과 재열람은 기존 조기 반환 경로 그대로이며 계산·LLM·추가 차감이 없다. delivery_pending 재개도 새 계산 없이 기존 전달을 완료한다. 새 v2 결과를 저장했다가 OFF로 되돌리는 mock에서도 원문이 유지됐다.
- 과거 빈 실행에 snapshot이 없으면 원래 legacy 계산만 허용하고 v2로 편입하지 않는다. 이미 저장된 장/본문/명반이 있는데 snapshot이 없거나 잘못된 구조라면 **기존 오류 응답으로 보류**하고 저장본을 덮어쓰거나 자동 환불하지 않는다. 이는 결과 없는 과거 요청과 결과 손실을 구분하기 위한 제한이다. 데이터 수선이나 기존 권리 회수가 아니다.

신규 최초 생성에 snapshot을 더 일찍 넣는 것 외에 DB 모델·키·상태 enum·결제 데이터 형식을 바꾸지 않았다. 기존 문서 backfill·마이그레이션·유료 원문 재계산 0건이다. 가격/이용권/월정석/단건 결제·권한·소유자 정책을 유지한다.

## 실행한 검증

기록은 [verification.json](results/execution-selection-20261101/verification.json)에 명령·종료값·출력·소스 해시와 함께 보존했다.

| 검사 | 결과·해석 |
|---|---|
| 신규 선택/생명주기 | **12/12 통과**. OFF 최종 결과를 직전 기준 함수와 대조, 새 문서 첫 저장의 명반 포함 확인 |
| 동시 요청·재시도 | 동시 최초 생성, 활성 lease 중 중복 요청, 저장 성공 후 응답 유실, checkpoint 저장 실패, 늦게 획득한 저장 명반 우선, 부분 생성 후 OFF, 완료/전달 대기 재개 통과 |
| 보존·실패 | 저장 원본 동결/해시 불변, 타 계정·입력 충돌·저장 조회 실패·계산 실패·생성 저장 실패·명반 누락/손상 검사 통과. 실패를 새 유료 실행으로 바꾸지 않음 |
| 기존 공식·확대 골든 | **12/12 통과**. 원래 101건/1,109필드 및 추가 4건, 확대 절입/음력/대운 골든 그대로 재검사 |
| 기존 저장·유료 mock | **28/28 통과**. 사주 저장·전달, 자미 재개 포함. 실제 PG·DB·로그인 성공 증거는 아님 |
| 타입·대상 lint·구문 | `tsc --noEmit`, 새 래퍼/자미 라우트 ESLint 및 Node 구문 검사 모두 종료 0 |
| 결제 동결/화면/정책 가드 | payment-freeze, paid-gate-ui, checkout-pass-card, paid-feature-billing-policy, ai-prompt-billing-policy 종료 0 |
| 결제 선택 정합성 | **실패 1개: 기존 정적 캐시 핀 불일치**. 아래 기준 커밋 대조 참조. 통과로 표시하지 않음 |

총 13개 검사 명령 중 12개 종료 0, 1개 기존 실패다. 자동 테스트는 52/52 통과다. 지난 OFF 40,000비교·대운 20,000 무작위·2,340 오라클 통제 대조를 이번에 다시 실행한 것으로 세지 않는다. 계산 엔진의 승인 소스 핀은 그대로이며 이번 범위는 소비/재개 계약이다.

실제 `handleStart` 함수 본문을 AST로 추출한 VM에서 저장소·결제·LLM 의존성을 mock으로 바꿔 실행했다. **라우트 모듈 전체/전체 Worker를 import하지 않았다.** DB unique/lease 경합은 mock 의미론에 대한 증거이며 실제 분산 Mongo 동시성 인증이 아니다. 새 어댑터의 기존 전이 계산 소스는 승인 해시와 대조한 뒤 실행했다. 기존 엔진 34개 파일과 새 래퍼/라우트 2개의 해시를 기록했다.

`resolveStartAccess`, `handleEnsureAccess`, `handleBasis`, `handleResult`, `applyUsageOnce`, `createOrReusePaymentPayload`, `verifyPaymentForStart`, `saveZiweiDelivery`의 함수 본문은 직전 커밋과 동일함을 검사했다. `sajuAdapter`, `normalizeSaju`, DB 모델, package/lock, payment-freeze 원장은 원문 보존 검사 통과. 6개 엔진 내부·PortOne/Inicis 실행 파일·저장/유료 자산 스키마 수정 없음. 새 사용자 노출 문자열·UI·960px 레이아웃·공개 URL/SEO 변경 없음.

## 확인한 기존 실패와 미실행 검사

`verify:payment-choice-parity`는 `yoga-guru.html`의 독립 결제 런타임 핀 `build-2029b9340aa4`와 기대 `build-fc0c52ff363f`의 차이로 실패했다. [기준 커밋 대조](results/execution-selection-20261101/pre-existing-cache-pin.json)에서 검사기·자산·해당 HTML·루트/공개 index 5개가 `91021aa3...`와 동일함을 확인하고, 그 커밋의 자산 내용으로 기대 핀을 재산출해 같은 불일치를 확인했다. 이번 변경으로 생긴 회귀로 분류하지 않으며 관련 없는 페이지/검사기를 고쳐 통과시키지 않았다.

검증 도구 최초 실행은 Windows 경로 구분자 비교에서 실행 전에 멈췄다. 절대 경로로 정규화하여 수정 후 위 검사를 실행했다. 런타임 회귀나 검사 실패를 없애기 위한 허용 오차 변경은 없었다.

`check:fast -- --plan`은 critical/full 검사와 Worker 빌드를 선택했다. Swiss 연결 전체 Node/Jest/Worker 빌드·공식 CI는 미실행이며 가드를 약화하지 않았다. `verify:billing-pass-policy`는 billing→fortune 전체 경로 import 때문에 차단했고, `verify:portone-single-payment`도 전체 payments 경로의 실행 그래프가 승인되지 않아 미실행이다. 해당 명령의 mock 존재만으로 Swiss 비연결을 추정하지 않는다. 실결제·운영 DB·외부 oracle/LLM·브라우저·물리 기기 검증은 미실행이다.

## 남은 연결과 CR-006

**CR-005의 최초 생성/재개 경계는 구현했고, prepare→basis→generate 전체 연결은 보류했다.** 준비 단계에 저장된 선택이 없고 기준 연도·출생지 계약까지 확정해야 하므로 [CR-006](change-requests/CR-006.md)에 영속 준비 선택을 제안했다. CR-005에서 별도 승인 대상으로 남긴 신규 필드/키 확장을 우회하지 않는다.

운영 ON, 단계 비율 제어, 사주 유료 라우트, 다른 소비 화면, 학파/범위 확대는 이번에 구현하지 않았다. 전체 경로 활성화 전에는 CR-006, 기존 정적 가드 실패, Swiss 비연결 통합 검사·공식 CI가 해결되어야 한다. 기존 snapshot 없는 신규/과거 기록을 더욱 엄밀히 구분하는 영속 선택도 CR-006에서 검증한다.

되돌림은 이후 신규 선택을 OFF로 두고 저장 snapshot reader를 유지하는 것이다. 구현의 신규 ON은 직접 호출한 테스트 옵션에서만 검증했으며 운영 요청에서 켜지지 않는다. 정확도 의심 시 영향을 받는 재개만 보류하고 원문·결제 증거를 보존한다. 이전 코드로 저장 명반을 지우거나 새 버전 결과를 일괄 재계산하지 않는다.

구현 로컬 커밋: `bba0426e06b662574b49e470fd4877eeb2a3815b`. 커밋된 트리에서 `npm run check:pre-push` 종료 0(홈 등록부 63개·공개 미러 재생성 차이 0·사이트맵 1,037 URL·llms·SEO 등록부). 이 검사에는 앞서 실패한 `payment-choice-parity`가 포함되지 않으며 해당 실패는 여전히 보류다. 문서 상대 링크 25개·코드 블록 짝·doc freshness·공백 검사 통과, Git에 커밋된 새 증거 2개 해시 보존 확인. main 병합·push·배포 없이 기존 격리 작업 공간에 보존하고 종료했다.
