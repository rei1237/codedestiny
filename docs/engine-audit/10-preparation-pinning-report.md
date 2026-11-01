# CR-006 준비·생성·재개 선택 고정

status: implemented-default-off-local-only

후속 상태: 이 문서에 남겼던 결제 캐시 핀 실패는 사용자 후속 승인 작업에서 수정하고 회귀 검증했다. 최신 결과와 실 DB·PG 검증의 준비/승인 범위는 [11-payment-cache-pin-report.md](11-payment-cache-pin-report.md)를 따른다. 아래 수치와 실패 기록은 CR-006 당시 증거로 보존한다.

기준 `b69790198a9c94988a2f7c0c93604ef603bdc376`. CR-006 사용자 승인 구현. 기존 감사 워크트리에서 작업하고 push·배포·main 병합하지 않는다. 6개 엔진·불변 함수·결제 실행 파일은 보존하고 Swiss/실 LLM/운영 DB/실결제를 실행하지 않는다.

## 구현한 범위

- [ziwei-calculation-preparation.js](../../worker/lib/ziwei-calculation-preparation.js): 엔진 밖 래퍼. `owner + featureKey + 기존 requestId`의 SHA-256을 준비 레코드 `_id`로 고정한다. 최초 insert만 허용하고 중복 키 경합은 저장된 승자를 다시 읽는다. 조회 실패·저장 성공 여부 불명은 신규 실행으로 바꾸지 않는다. 프로세스 메모리나 브라우저 값으로 버전을 결정하지 않는다.
- [models.js](../../worker/lib/models.js): **새 전용 `ziweiCalculationPreparations` 컬렉션 선언만 추가**했다. 기존 모델 정의는 원문 비교로 보존했다. `_id` 기본 고유성을 사용하므로 `autoIndex:false`에서 별도 unique 인덱스 작업이 필요하지 않다. 실제 운영 컬렉션/인덱스 생성이나 마이그레이션은 하지 않았다.
- 준비 레코드는 소유자·기능·요청 키, 기존 입력 해시, 원 요청 출생지 지문, 기준 연도, 자료 버전, 전체 명반, 검증 해시, 생성 시각을 담는다. 만료 TTL·수정·삭제 경로는 없다. 결제 복귀/재개가 보관 기간 때문에 다른 계산이 되지 않도록 무기한 보존하는 계약이며, 별도 정리 정책은 이번에 만들지 않았다.
- [ziwei-ai.js](../../worker/routes/ziwei-ai.js): prepare에서 권리/결제 준비 전에 명반을 영속 확정한다. basis와 generate는 확정본만 읽고, 새 생성 문서의 `llmMeta.calculationPreparationId`에 연결한다. lease 취득 후에도 준비 자료와 명반을 재검사한다. 최초 저장 응답 유실·두 Worker 경합·설정/연도 변경 뒤에도 같은 명반을 소비한다.
- [ZiweiAiClient.tsx](../../app/ziwei-ai/ZiweiAiClient.tsx): 새 요청에 `calculationProtocol:ziwei-prepared-v1`을 표시하고 준비 확인 뒤에 근거 표시/생성을 진행한다. 준비 응답의 `calculationReady:true`가 없으면 결제창으로 진행하지 않는다. 기존 결제 복귀 직렬화가 같은 요청 키·프로토콜·입력을 보존한다. 공유 결제 훅이나 결제 실행 파일은 수정하지 않았다.

v2 계산 옵션은 계속 기본 false. 새로운 요청 프로토콜은 legacy 명반도 준비 단계에 고정하며, 과거 프로토콜/이미 저장된 결과를 마이그레이션하지 않는다. 프로토콜은 새 요청의 누락 자료를 거절하기 위한 표시이며 v2 활성화 권한이 아니다. 기존 주문 키/토큰/결제 payload는 변경하지 않는다.

**기본 OFF의 의미:** 운영 호출부는 `calendarAuthorityV2`를 전달하지 않고 기존 기본값 false를 사용한다. 새 프로토콜의 준비 저장은 OFF에서도 legacy 명반을 고정한다. ON은 테스트에서만 신뢰된 호출 옵션으로 주입했다. 요청 본문/환경 변수/브라우저 저장값으로 ON을 선택하는 연결은 없다.

## 보존·지원 범위·되돌림

| 상황 | 처리 |
|---|---|
| 새 프로토콜 prepare | 저장이 확인된 최초 버전·기준 연도·명반을 사용. 입력/원 출생지 지문이 다른 동일 키는 409 |
| 새 프로토콜 basis/generate에서 준비 자료 없음 | 503 보류. 재계산·결제/차감·환불로 폴백하지 않음 |
| 준비 명반·자료 버전·검증 해시 손상/조회 장애 | 안전 보류. 새로운 명반으로 대체하지 않음 |
| 시험 ON 지원 밖 입력 | 422. 현대 2000~2028·서울·확인된 시간/성별 및 기존 공개 계산기가 지원하는 실제 날짜 범위. 원 출생지가 정규화에서 없어졌더라도 ON 적격으로 오인하지 않음 |
| OFF 이후/연도 변경/결제 복귀/부분 생성 재개 | 준비 자료를 그대로 사용. 이후 설정을 저장된 선택에 소급 적용하지 않음 |
| 기존 완료 결과 | 기존 조기 반환·결과 reader 유지. 준비 저장소 장애/유실이어도 기존 원문 재열람 유지 |
| 과거 snapshot 있는 진행 결과 | 원래 snapshot 사용. 신규 준비 계약으로 마이그레이션하지 않음 |
| 과거 빈 실행 | 원래 legacy 계산만 허용. 이미 내용이 있는데 명반이 없으면 기존 보류 계약 유지 |
| 새 클라이언트와 과거 Worker 혼용 | 준비 확인 응답이 없으면 새 결제 진행 중단. 활성화 전 클라이언트/Worker 호환 배포 검증 필요 |

회귀 시 **신규 선택 OFF + 이 호환 reader 유지**가 되돌림 기준이다. 새 자료를 이해하지 못하는 과거 Worker로 단순 복귀하거나 준비 레코드를 삭제하지 않는다. 원본/결제 증거를 보존하고 문제가 있는 재개만 보류한다. 단계 비율 제어·운영 ON·사주 유료/다른 소비자 확대는 이번 범위 밖이다.

## 검사 중 발견하고 수정한 저장 차이

Mongoose 실제 스키마를 오프라인으로 적용하자 기본 `minimize`가 빈 객체를 생략해 명반 검증값이 달라졌다. 새 준비 스키마에만 `minimize:false`를 지정해 전체 명반을 보존했다. 기존 상담 스키마는 바꾸지 않았다. 기존 상담 snapshot과 비교할 때에만 빈 객체 속성의 생략을 동일한 저장 표현으로 취급하며, **실제 계산/생성에는 준비 저장소의 완전한 명반을 반환**한다. 숫자·별 배치·배열·자료 버전 등의 변경은 여전히 거절한다. 두 실제 스키마의 오프라인 왕복과 실제 명반의 사실값 변경 거절을 검사했다.

테스트 작성 중에는 mock 오류 문자열 누락과 JSON 직렬화의 `undefined` 생략도 발견했다. 실제 전송 계약에 맞게 테스트를 수정했으며 운영 결제 훅/데이터 형식을 바꾸지 않았다. 과거 요청 키 없는 basis의 계산 실패 422 응답도 보존 검사에 포함했다.

## 실행한 검증

[checks.mjs](../../tools/oracle/preparation-pinning/checks.mjs)가 승인된 계산 소스 핀을 먼저 검사한다. 새 래퍼는 `node:crypto`와 기존 공개 계산 어댑터만 import한다. 전체 라우트/Worker/결제 모듈은 import하지 않고, 실제 함수 본문을 AST로 추출해 DB·권리·LLM을 mock으로 실행한다. [최종 검증 원문](results/preparation-pinning-20261101/final-verification.json)에 명령·종료값·출력·44개 소스 해시를 남겼다. 첫 실행 결과도 별도 보존한다.

| 명령/검사 | 결과 |
|---|---|
| `node --test` 준비/선택/생명주기 3개 파일 | **23/23 통과** |
| 기존 공식·확대 골든 2개 파일 | **12/12 통과**. 최초 확정 101건/1,109필드 및 추가 4건, 확대 절입/음력/대운 회귀 포함 |
| 저장·유료 결과 mock 3개 파일 | **28/28 통과** |
| `tsc --noEmit` | 종료 0 |
| 수정 런타임 4개 파일 대상 ESLint | 종료 0 |
| payment-freeze, paid-gate-ui-regression, checkout-pass-card, paid-feature-billing-policy, ai-prompt-billing-policy | 모두 종료 0 |
| payment-choice-parity | **기존 실패 유지**. 아래 별도 기록 |

자동 테스트 합계 **63/63 통과**. 검사 명령 11개 중 10개 종료 0, 1개 기존 실패다. 핵심 재현은 다음과 같다.

- 서로 다른 계산 설정/연도를 가진 두 호출이 같은 `_id`에 경합하고 저장 승자 하나를 읽음. 동시 generate도 생성/최종 이용 처리 한 번.
- 준비 저장 후 응답 유실 → 다른 설정으로 재시도 → 기존 명반 유지. 저장 전 실패/조회 실패는 결제 준비 전에 보류.
- prepare → basis → 결제 복귀 → 부분 생성 → 재개 전 과정의 명반 일치. OFF·연도 변경 뒤 새 계산 없음.
- 타 계정·다른 입력·출생지 변경 충돌, 자료 유실·손상·새 metadata 손실을 신규 legacy 계산으로 숨기지 않음.
- 실제 클라이언트 함수에서 미확인/503/구 Worker 응답은 결제 진입 0회. 실제 pack/unpack과 결제 복귀 콜백은 같은 키/입력을 복원하고 결제창을 다시 열지 않음.
- 새/기존 Mongoose 스키마 오프라인 왕복, 완료 원문 보존, 기존 결제/권리/입력 해시/결과 reader 함수 원문 동일성 검사.

## 기존 실패·미검증·유지한 영역

`payment-choice-parity`는 여전히 `yoga-guru.html`의 캐시 핀 `build-2029b9340aa4`와 기대 `build-fc0c52ff363f` 차이로 실패한다. [앞선 기준 증거](results/execution-selection-20261101/pre-existing-cache-pin.json)와 [이번 기준 대조](results/preparation-pinning-20261101/pre-existing-cache-pin.json)에서 관련 5개 파일 동일성을 다시 확인했다. 무관한 정적 페이지나 검사기를 수정해 통과시키지 않았다.

`check:fast -- --plan`은 critical/full 검사·Worker 빌드를 선택했다. Swiss 연결 전체 검사/빌드/공식 CI는 미실행이다. `verify:billing-pass-policy`의 billing→fortune import, `verify:portone-single-payment`의 전체 결제 그래프 실행도 차단했다. 외부 oracle 설치·KASI/LLM·실결제·운영 DB 호출 0건. 실제 Mongo 다중 프로세스 경합·브라우저/물리 기기의 PG 복귀는 **미검증**이며 mock/오프라인 스키마 통과를 운영 증거로 확대하지 않는다.

기존 결과/유료 원문 재계산·backfill·덮어쓰기 없음. 기존 결제/권리/가격/토큰/입력 해시·인증 로직과 저장 모델은 보존했다. 새 준비 전용 스키마 및 신규 `llmMeta` 연결 필드만 승인 범위로 추가했다. 6개 엔진 내부, `calculateLocalResult`, `normalizeSaju`, KASI prefetch timezone, PortOne/Inicis, package/lock 불변. 새 사용자 노출 문구·960px 레이아웃·공개 URL·SEO/색인 정책 변경 없음.

작업은 격리 감사 워크트리에 보존한다. 다른 세션 변경은 건드리지 않고 main 병합·push·배포하지 않는다. 로컬 커밋 및 마지막 정적 검사 결과는 아래에 기록한다.

재실행 명령은 `node tools/oracle/preparation-pinning/checks.mjs <새-결과파일명.json>`이다. 기존 증거는 덮어쓰지 않는다. [manifest.json](results/preparation-pinning-20261101/manifest.json)에 테스트·검사기·증거 파일 해시를 고정했다. 문서 상대 링크 검사·`verify:doc-freshness`·공백 검사는 통과했다.

구현 로컬 커밋: `bb6923f4dca309310c15be2874845b4cb92f9a74`. 첫 `check:pre-push`에서 `config/sitemap-lastmod.json`의 `/ziwei-ai/` 소스 지문 드리프트가 발생했다. 네트워크 차단 상태에서 공식 `scripts/generate-sitemap.mjs`를 실행했고, **해당 지문 한 줄만** 바뀌었다(수정일·1,037개 URL·색인 정책 불변). 생성 원장은 `2d5480eb6`에 로컬 커밋했다.

이후 커밋된 트리에서 `npm run check:pre-push` **종료 0**: 홈 등록부 63개, 공개 미러 차이 없음, 사이트맵 1,037개, llms, SEO 등록부 통과. 이 정적 전달 검사에는 기존 실패인 `payment-choice-parity`가 포함되지 않으므로 그 실패는 여전히 남는다. 검증된 코드/증거/원장은 격리 작업 공간에 커밋했고, push·배포·운영 ON·main 병합 없이 종료한다.
