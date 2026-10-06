# 서비스 보관함 분리와 구매 결과 보존

기준일: 2026-10-06. 사용자가 지정한 지속 정책의 실행 근거다.

- 영냥이 상담: `/yeongnyangi/library/`, 원본 `yeongnyangi_requests`.
- 꿀꿀운세 결과: `/records/`, 기존 서비스별 원본과 공용 저장 결과.
- 연이·네오 상담실은 공유 컬렉션을 사용해도 `featureKey`·`persona`로 구분한다. 영냥이 상담을 꿀꿀운세 목록에 넣지 않는다.
- 서비스가 유지되는 동안 받은 구매 결과를 기간·상품 단종·가격 변경·이용권 만료로 삭제하거나 숨기지 않는다. 정상 회원 탈퇴, 환불에 따른 접근 회수와 소유자 인증은 유지한다.
- 완료 결과를 다시 읽을 때 저장된 본문·상품·언어를 사용한다. 추가 결제·월정석 차감·LLM 생성 없이 재열람한다.

## 사고 진단 근거

운영을 읽기 전용으로 확인했다. 진단 중 상세 GET·생성/활성화/복구 POST·DB 쓰기를 수행하지 않았다.

| 확인 | 2026-10-06 관측 |
| --- | --- |
| Pages와 Worker SHA | 둘 다 `e55f521b1cae8bfe3e34f071e73126f17b6d3dde` |
| 진단 코드 기준 | `61f6418111022b0b0f5d4b5c7055980dbbda43f0` |
| 위 두 SHA의 보관함 화면·조회 API·auth-client 비교 | 차이 없음 |
| 영냥이 원본 초기 집계 | 76건: 완료 38, 환불 7, 준비 31 |
| 완료 고등어 사주 | 23건, 저장 챕터 합계 115 |
| 활성 직접 결제와 상담 초기 대조 | 32건, 원본 없음 0·소유자 불일치 0 |
| 18:30 KST 재조회 | 원본 77건: 완료 38·환불 7·준비 31·생성 중 1. 완료 본문 285챕터. 활성 직접 결제 33건, 원본 없음 0·소유자 불일치 0 |
| 과거 주문 형식 추가 확인 | 활성 영냥이 상품 주문은 모두 `yn-`+64자리 형식. 다른 형식의 활성 직접 결제는 이번 조회에서 없음 |
| 현재 Chrome 로그인 계정 | 영냥이 API/화면/원본에 동일 완료 고등어 사주 1건·5챕터 |
| 영냥이·paid_execution_records TTL | 없음. 후자는 원본 38건 |
| 공용 serviceexecutiontransactions TTL | `retentionUntil_1`, 조건 없는 자동 삭제 |
| 기존 공용 저장소의 삭제 기한 대상 | 3건: premium-fpti-report 1, tarot-celestial-harmony 2. 기한 경과 0 |

현재 확인한 계정이 피해 계정인지는 미확인이다. 결제 대조 33건이 일치한다는 사실로 과거 모든 삭제나 다른 결제 수단의 무결성을 단정하지 않는다. 집계는 계속 운영되는 서비스의 해당 시점 값이며 원본 복원 건수는 0이다. 고객 복구 완료를 확인하지 않았다.

최근 업데이트 조사: 2026-10-05 보관함 통합 진입 변경 뒤 `/records/`에 일반 영냥이가 없는 것은 관측했다. 사용자 지정 분리 정책에 따라 통합하지 않고 각각의 전용 보관함을 유지한다. 영냥이의 기존 계정 응답 가드는 9월부터 존재하고, `persona` 분리는 10월 1일, 결제 전 타로 숨김은 10월 3일 도입됐다. 최신 업데이트가 피해 사례의 직접 원인이라는 증거는 아직 없다.

## 구현과 회귀 검사

인증 저장소의 계정 변경도 구독한다. 같은 계정의 인증 갱신은 기존 목록을 유지하면서 새로 조회하고, 계정 전환·로그아웃 때만 이전 계정 목록을 지운다. 오류와 빈 목록을 구분하고, 실패한 페이지 자체를 다시 조회한다. 상품 스냅샷이 없는 한 기록은 목록에 남기고 다른 기록의 조회·렌더링을 깨뜨리지 않는다. 누락 상품을 현재 가격·새 해석으로 대체하지 않는다.

과거 월정석·팩 증거가 있는 기록은 오래된 미결제 필터에서 제외한다. 월정석 증거는 요약 조회에도 포함한다. 완료·부분 저장·생성 중·실패·환불·오래된 상품, 같은 생성일의 145건, 타 계정·상담실 제외, 인증 갱신·전환·로그아웃·페이지 재시도를 mock으로 검증한다.

공용 저장소의 구매 결과 작성자는 `retentionUntil:null`로 저장한다. 스키마 TTL은 `status:awaiting_payment`인 미결제 의도에만 적용한다. 이미 운영에 존재하는 광범위 TTL은 코드 배포만으로 제거되지 않는다.

## 운영 인덱스 수선 승인안

별도 승인 전에는 실행하지 않는다. 구매 결과 본문·원본 ID·소유자·결제 연결은 수정하지 않는다.

1. `node scripts/audit-library-retention.mjs --env-file=.env.local --db=code_destiny`로 운영 인덱스와 대상 목록을 다시 읽는다. 출력의 `targets`에는 원본 ID, 소유자 해시, 기존 기한이 포함되며 원문·계정 이메일·비밀값은 포함하지 않는다. 이 명령은 읽기 전용이다.
2. 운영 `serviceexecutiontransactions`의 인덱스 정의를 백업하고, 키 `{retentionUntil:1}`·TTL `0`·조건 없음인 `retentionUntil_1`이 맞는지 확인한다. 예상과 다르면 중단한다.
3. `unpaid_intent_retention_v1` 인덱스를 생성한다: 키 `{retentionUntil:1}`, TTL `0`, 부분 조건 `{status:'awaiting_payment'}`. 이미 같은 정의로 있으면 건너뛴다. Mongo 버전의 동일 키 부분 인덱스 공존 지원을 확인한 뒤 실행한다.
4. 위 조건 없는 `retentionUntil_1`만 제거한다. 이미 없으면 건너뛴다. 원본 문서는 수정하지 않는다. 대상 3건은 기존 기한이 남아 있어도 부분 TTL 조건에 해당하지 않으므로 삭제되지 않는다.
5. 읽기 전용 감사에서 `indexPlan.drop=[]`, `indexPlan.create=null`임을 확인하고 대상 ID·소유자 해시·본문 해시·원본 수가 같음을 대조한다. 피해 계정의 실제 목록과 결과를 별도로 확인한다.

중간 실패 시 구매 기록을 삭제하는 광범위 TTL을 재생성하지 않는다. 새 부분 TTL을 제거해도 미결제 주문 정리만 지연되며 원본은 보존된다. 기존 인덱스 정의를 재현하는 역복구는 격리된 복사본에서만 시험한다. 코드 롤백이 필요해도 이 보존 경계는 유지한다.

실제 삭제가 확인되면 백업을 격리 복원하고 사고 대상의 원본 ID·소유자·저장 본문·결제 연결을 대조한다. 현재 없는 사고 대상만 선별 복원하며 기존 문서와 정상 탈퇴 계정은 복원하지 않는다. 원본을 확보하지 못한 기록은 복구 완료로 처리하지 않는다.

## 검증 명령

수정 파일은 다음과 같다. 가격·이용권·월정석·단건 결제의 금액, 차감과 환불 정책은 바꾸지 않았다.

- 조회·화면: `app/yeongnyangi/_components/Library.tsx`, `app/yeongnyangi/_lib/api.ts`, `worker/routes/yeongnyangi.js`.
- 보관함 이름: `app/yeongnyangi/_lib/reading-copy.ts`, `lib/records/copy.ts`.
- 결과 보존: `worker/lib/models.js`, `worker/lib/service-execution-task.js`, `worker/lib/celestial-delivery-store.js`, `worker/routes/fpti.js`, `worker/routes/sukuyo.js`.
- 재발 방지: `__tests__/ui/yeongnyangi-library.behavior.test.mjs`, `__tests__/ui/library-retention-contract.test.mjs`, `__tests__/worker/yeongnyangi-route.test.js`, `__tests__/worker/record-library.test.js`, `__tests__/worker/celestial-paid-delivery.test.js`.
- 운영 감사·지속 규칙: `scripts/audit-library-retention.mjs`, `CLAUDE.md`, 이 문서.

```powershell
node --test __tests__/ui/yeongnyangi-library.behavior.test.mjs __tests__/ui/library-retention-contract.test.mjs
npm run test:jest -- --runInBand __tests__/worker/record-library.test.js __tests__/worker/yeongnyangi-route.test.js __tests__/worker/yeongnyangi-delivery.test.js __tests__/worker/celestial-paid-delivery.test.js
npm run check:fast -- --plan
npm run check:fast
```

mock/로컬 검사, 정확한 push SHA의 GitHub CI, 승인 후 운영 반영, 고객 복구 확인은 각각 다른 완료 기준이다. CI 통과가 고객 복구나 운영 반영을 뜻하지 않는다.

2026-10-06 로컬 결과: 변경 파일 린트·전체 린트·typecheck 통과, Node 2,804/2,804, Jest 343스위트·5,159/5,159, 결제 게이트 88/88, Worker dry-run 빌드·strict-core 인코딩·사이트맵 954 URL 정합 검사 통과. `check:fast` 최초 실행은 새 테스트 변수명의 린트 오류로 중단됐고, 변수명 수정과 사이트맵 원장 갱신 후 실패 단계와 나머지 동일 계획의 검사들을 이어 실행해 통과했다. 통과한 88개 결제 검사를 다시 실행하거나 실패를 숨기는 방식은 사용하지 않았다. Worker dry-run은 로그 디렉터리 권한 경고가 있었지만 번들 빌드 종료 코드는 0이었다. 운영 반영·원본 복원·피해 고객 검수는 미완료다.
