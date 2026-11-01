# CR-006 Swiss 비연결 테스트 DB 러너·합성 데이터 준비

status: done

요청 범위: 격리 DB 검증용 도구/합성 데이터 준비와 오프라인 검증까지. 실제 DB·PG·LLM 호출, push·배포, 운영 플래그 ON은 승인되지 않았다. 기준 커밋은 `9501323a46330ebea075ae798e6b57c0232870ca`이며 기존 감사 전용 워크트리에서 진행한다. 다른 세션의 main 변경은 섞지 않는다.

## 구현과 유지 경계

- `tools/oracle/isolated-db/`: 공개 준비 래퍼를 읽기 전용 호출하는 runner, 합성 fixture, 실패 우선 승인/대상/쓰기 한도 검사, 네트워크/import 차단, 메모리/네이티브 DB 저장소, 소스·설치 의존성 고정, 기본 거부 승인 예제.
- `__tests__/ui/ziwei-isolated-db-runner.test.mjs`: 합성 경합·저장 보존, 환경 접근 순서, 네트워크/import 차단, 잘못된 승인/대상/URI, 소스·의존성 변조 감지, 저장 한도, 연결 실패/비어 있지 않은 DB 차단을 오프라인 검증.
- 운영 엔진·어댑터·prepare/generate 라우트·모델·결제·인증·저장/KV/R2 스키마·운영 의존성은 변경하지 않는다. `calculateLocalResult`, KASI timezone 규칙, normalizeSaju와 960px/i18n 정책 유지. 공개 UI/URL/SEO 변경 없음.
- 러너는 `calendarAuthorityV2:false`만 전달한다. 기존 준비/유료 결과를 갱신하거나 재계산하여 덮어쓰는 API는 제공하지 않는다. 잘못된 기록은 새 합성 문서 삽입으로만 만들어 보류를 검증한다.

## 확인 범위

사용법·실험 7종·정확한 별도 승인 절차는 [README](../../tools/oracle/isolated-db/README.md)에 고정했다. 기본 `mock`과 `check-driver`는 실제 DB 연결을 하지 않는다. 후자는 설치된 `mongodb@7.1.0`을 로딩하되 MongoClient 생성 없이 BSON 왕복만 사용한다. 승인/URI 검증 및 DB 연결 실패 검사는 주입한 가짜 클라이언트를 사용한다.

합성 owner 2명, 동시 준비 20회, 준비 문서 4개·상담 2개다. 오프라인 실측 insert 시도 25회/문서 읽기 57회이며 한도는 26회/160회다. 출생 정보·상담 문구·paid 표시는 가상이다. 실제 이용권·결제·잔액은 만들지 않는다. 완료/유료·부분 결과의 전체 문서 해시가 실험 전후 같아야 통과한다.

허용한 서비스/도구 소스 27개, 설치 패키지 12개/파일 200개의 해시를 로딩 전에 확인한다. 검토된 공개 준비 래퍼 외의 전체 라우트/운영 DB/Swiss/PG/미허용 패키지를 차단한다. 네트워크 차단은 프로세스 내부의 우발적 연결 방지이며 OS 보안 격리를 대신하지 않는다. 실제 로드 목록과 명반/보존 해시는 새 결과 디렉터리에 기록한다. 기존 감사 증거를 덮어쓰지 않는다.

## 실제 DB·PG 전 남은 준비와 승인

현재 러너는 전용 로컬 일회성 Mongo만 지원한다. 실제 인스턴스·DB 계정·권한·접속 여부는 미확인이다. loopback이 운영 터널이 아님을 확인하고, 새 DB명/run-id/sourceDigest/1시간 이내 유효 승인/컬렉션 이름 목록 읽기/최초 생성/6개 합성 기록 쓰기를 별도 승인해야 한다. 예제 승인은 false이며 DB 실행은 기본 불가다. 기존 데이터가 있는 DB는 사용하지 않고, 자동 청소도 하지 않는다.

운영 Mongoose/schema/index·트랜잭션·실 DB 원자성은 미검증이다. DB 러너는 모델 전체를 불러오는 기존 검사기를 대체하지 않으며, 그 경로의 Swiss 비연결 증명부터 별도 필요하다. 실제 PG 주문 생성·승인·웹훅·취소·환불·기기 복귀 및 실 LLM은 계속 미실행이다. DB 승인으로 PG 승인 범위를 확대하지 않는다. 상세 기존 승인 단위는 [11-payment-cache-pin-report.md](11-payment-cache-pin-report.md)를 유지한다.

## 로컬 검증

2026-11-01 시작, 11-02 KST 최종 검증. [검사 원문](results/isolated-db-runner-20261102/verification.json)에는 각 실행 인수/종료 상태/표준 출력/오류 출력을 보존했다. 외부 I/O 차단 모듈을 선행 적용했다.

| 명령 / 검사 | 실제 결과 |
|---|---|
| `node tools/oracle/isolated-db/run.mjs --mode plan` | 종료 0. 서비스/드라이버 로딩 없이 도구 2개만 import. DB 미연결 |
| 위 러너 `--mode mock`, `--mode check-driver` | 각각 종료 0, 7개 시나리오 통과. 명반 및 저장 결과 해시 동일, 실제 DB/PG/LLM 0회 |
| `node --test __tests__/ui/ziwei-isolated-db-runner.test.mjs` | **15/15**. 승인/대상/한도/네트워크/모듈/해시 차단과 가짜 연결 실패 검증 포함 |
| 기존 `ziwei-{preparation-pinning,execution-selection,execution-lifecycle}.test.mjs` | **23/23**. 이전 v2 선택의 OFF 복귀는 격리 회귀 내에서만 검사; 운영/이번 DB 러너의 플래그는 OFF |
| 기존 `calendar-authority-{regression,expansion}.test.mjs` | **12/12**. 최초 확정 101건과 확대 골든 포함. 공식 API 재호출/스냅샷 재생성 없음 |
| 기존 `paid-report-storage`, `saju-paid-delivery`, `ziwei-paid-resume` behavior test | **28/28**. 저장/유료 보존 mock이며 실제 고객 기록 증거는 아님 |
| 도구 mjs 6개와 테스트 1개 대상 ESLint | 종료 0. 운영 TS/빌드 변경 없음 |
| `node scripts/verify-payment-freeze.mjs` | 통과: region 4 / file 3 / 상한 2 |
| `node scripts/verify-payment-choice-parity.mjs --self-test` | 통과: 10 렌더러 / 105 CSS / 12 로케일. fsmonitor IPC 경고가 있었으나 종료 0; 환경 설정 수정 없음 |
| `node scripts/verify-doc-freshness.mjs` | 종료 0 |
| `npm run check:fast -- --plan` 및 같은 검사기 계획 출력 | 종료 0, critical로 전체 테스트/Worker 빌드를 선택 |

합계 **78/78 테스트 통과**다. [plan](results/isolated-db-runner-20261102/plan.json), [mock](results/isolated-db-runner-20261102/mock.json), [BSON 왕복](results/isolated-db-runner-20261102/check-driver.json)에 import 목록 및 sourceDigest를 기록했다. 계획/모의/BSON 실행 모두 `databaseConnected:false`다. BSON 모드의 드라이버 전체 JS 로딩은 실제 DB 작업 실행을 뜻하지 않는다.

[소스 보존 증거](results/isolated-db-runner-20261102/source-proof.json)는 운영 관련 39개 파일을 기준 커밋과 LF 정규화 SHA256 비교했고 모두 같았다. 변경 경로도 tools/tests/docs 범위로 한정됐다. 운영 package/lock 및 과거 감사 결과는 보존했다. 초기 봉인 과정의 `punycode/LICENSE-MIT.txt` 파일명 탐색 실패는 원문 직접 확인 후 파일명 패턴을 바로잡아 해결했으며 허용 라이선스 기준을 낮추지 않았다.

전체 `check:fast` 실행/전체 test:node·Jest/Worker 빌드/CI는 **미실행**이다. Swiss 연결 테스트·전체 결제 그래프가 포함되어 사용자 차단 조건과 충돌한다. 검사기 분류·기대값·금지 경로를 바꾸지 않았다. 이번 mjs 도구 변경에 전체 TypeScript/서비스 빌드 통과를 주장하지 않는다.

로컬 커밋 후 `check:pre-push`를 검사하고 전달 기록을 추가한다. push·배포·main 통합은 하지 않으며 미통합 감사 워크트리와 검증 자료를 보존한다. 별도 실제 DB/PG 승인이 있기 전까지 추가 실행은 하지 않는다.
