# CR-006 격리 DB 검증 준비 도구

**기본값은 메모리 모의 실행이다. 실제 DB 실행은 별도 승인이 필요하고 PG·LLM은 차단한다.** 2026-11-02에 승인된 전용 로컬 DB 1회 실험은 [13 보고서](../../../docs/engine-audit/13-local-db-verification-report.md)에 기록했다. 그 승인은 다른 DB/후속 쓰기/운영 연결로 확대되지 않는다. 운영 파일·플래그·기존 저장 결과는 변경하지 않는다. Node 24의 `module.registerHooks`가 필요하며 확인 환경은 Node 24.18.0이다.

## 지금 실행할 수 있는 오프라인 명령

프로젝트/전용 워크트리 루트에서 실행한다. `.env`를 읽거나 외부 서비스로 폴백하지 않는다.

```powershell
node tools/oracle/isolated-db/run.mjs --mode plan
node tools/oracle/isolated-db/run.mjs --mode mock
node tools/oracle/isolated-db/run.mjs --mode check-driver
node --test __tests__/ui/ziwei-isolated-db-runner.test.mjs
```

- `plan`: 소스·설치 패키지 핀 검사 후 승인에 필요한 digest/DB명/한도를 출력. 서비스·Mongo 드라이버 로딩도 하지 않는다.
- `mock` 또는 인수 없음: 메모리 저장소와 실제 공개 준비 래퍼를 호출. 네트워크 전부 차단.
- `check-driver`: 같은 메모리 실험에 설치된 MongoDB 드라이버의 BSON 직렬화 왕복을 적용. **MongoClient 생성·연결은 하지 않는다.** 이 결과는 실제 Mongo 원자성·영속성 증거가 아니다.

`calendarAuthorityV2`는 모든 호출에서 `false`로 고정된다. ON 옵션은 없으며 임의 CLI 인수는 거부한다. 이전 ON 실행의 OFF 복귀 검증은 기존 `ziwei-preparation-pinning.test.mjs` 등의 격리 회귀에서 다루고, 이 DB 준비 도구는 OFF 신규 계산만 사용한다.

## 합성 데이터와 검사 범위

`fixtures.json`의 가상 출생 정보, 가상 사용자 2명, 고정된 2026년 분석 연도를 사용한다. 실제 고객 정보·결제 번호·이용권·잔액은 포함하지 않는다. 상담의 `accessType: paid`는 보존 검증용 합성 표시이며 주문/권한 발급이 아니다.

| 시나리오 | 확인 내용 |
|---|---|
| 동일 키 경합 | 두 저장소 핸들에 20회 동시 준비, 한 확정 명반/버전 유지 |
| 준비→기초 정보→생성 | 해가 2099년으로 바뀌어도 최초 명반 유지, OFF 유지 |
| 입력·지역·계정 분리 | 입력/경도 변경 거부, 다른 계정은 별도 준비 필요 |
| 저장 직후 응답 유실 | 삽입 성공 뒤 합성 오류를 내고 다른 핸들로 원본 재조회 |
| 자료 유실/읽기 실패 | 명반을 새로 선택하지 않고 보류 |
| 손상 자료 | 새 합성 준비 기록 1건을 손상 상태로 삽입해 보류 확인. 기존 문서 업데이트 없음 |
| 완료·유료·부분 결과 | 합성 상담 2건의 전체 문서 해시가 전후 동일, 원래 명반 사용 |

고유 준비 기록 최대 **4개**, 상담 fixture 최대 **2개**, 총 insert 시도 **26회**, 문서 읽기 **160회**를 공유 한도로 강제한다. 모의 실측은 4+2개, insert 시도 25회, 읽기 57회다. 실제 경합 시 insert 시도 횟수는 달라질 수 있다. 중복 키 오류도 시도 횟수에 포함한다. ID는 run-id로 한정하고 잘못된 소유자/입력 해시/버전의 쓰기를 거부한다. update/delete/drop/index 생성 인터페이스는 제공하지 않는다.

## Swiss와 운영 경로 차단

`run.mjs`는 `pins.json`의 소스 27개와 패키지 12개의 버전·라이선스·파일 SHA256을 **코드 로딩 전에** 확인한다. 계산 진입점은 `worker/lib/ziwei-calculation-preparation.js::resolveZiweiPreparation` 하나다. 기존 공개 래퍼와 그 검토된 자미 계산 그래프만 허용한다. 전체 Worker, 운영 `db.js`/`models.js`, 결제 실행 경로, Swiss, dotenv, 미허용 패키지는 로더에서 거부한다. 출력에 실제 로딩 파일 목록이 포함된다.

`network.mjs`는 TCP/TLS/DNS/HTTP/UDP/fetch/WebSocket을 차단한다. DB 모드도 승인된 단일 IPv4/포트의 TCP만 허용하며 HTTP·PG·LLM은 계속 차단한다. 프로세스 안의 우발적 I/O 방지 장치이며 적대적 코드에 대한 OS 보안 격리 보장은 아니다. CI나 미래 실험 환경의 별도 네트워크 제한을 대체하지 않는다.

드라이버는 이미 설치된 루트 `mongodb@7.1.0`을 읽기 전용 재사용한다. 신규 설치/운영 package·lock 변경은 없다. 필수 전이 폐쇄 12개는 MIT/Apache-2.0/BSD-2-Clause이며 원문·메타데이터·파일 해시를 직접 검사했다. 선택 peer는 허용하지 않는다. 자세한 원장은 [01-license-ledger.md](../../../docs/engine-audit/01-license-ledger.md)의 격리 DB 준비 절을 본다. 설치 상태가 달라지면 통과를 위해 자동 설치/핀 재생성을 하지 않고 멈춘다.

명시적 유지보수 명령 `node tools/oracle/isolated-db/seal.mjs --write`는 검토한 도구/의존성 변경을 새 핀에 고정할 때만 사용한다. 서비스 해시는 이전 승인 증거와 비교하므로 엔진 변경을 자동 승인하지 않는다. 실행 도중이나 실패 회피용으로 사용하지 않는다. 과거 증거는 덮어쓰지 않는다.

## 나중에 실제 테스트 DB를 사용할 때의 별도 승인

후속 실제 검증 승인은 **정확한 실행 digest·run-id·격리 인스턴스·DB명·계정 역할·6개 합성 문서 쓰기 및 최초 컬렉션 생성**을 포함해야 한다. 완료한 로컬 실험의 승인 파일은 만료되는 감사 증거이며 재사용 승인서가 아니다. PG 주문·결제·환불·실 LLM·운영 DB·인덱스 수선·청소·배포는 포함하지 않는다.

1. 운영과 분리된 전용 일회성 Mongo 인스턴스를 준비하고 `127.0.0.1`의 명시적 포트에만 연결한다. 터널/프록시로 운영 DB에 이어진 주소를 허용하지 않는다. **루프백 주소만으로 실제 격리를 증명할 수 없으므로 환경 소유자가 확인해야 한다.** 현재 도구는 Atlas/SRV/원격 호스트/TLS 환경을 지원하지 않는다.
2. 새로운 영소문자·숫자 run-id 8~24자로 `plan --run-id <run-id>`를 실행한다. DB명은 정확히 `cd_engine_audit_cr006_<run-id>`여야 한다. 고객 자료가 있는 DB를 재사용하지 않는다.
3. `approval.example.json`은 `approved:false`로 배포된다. 별도 승인 후 복사본에 plan의 `sourceDigest`, 정확한 run-id/호스트/포트/DB명, 승인 시점부터 1시간 이내 만료 시각, 전용 일회성 인스턴스/컬렉션 생성 동의를 기입한다. 한도는 변경할 수 없다. 승인 파일은 실행자 확인 자료이며 암호학적 서명이 아니다.
4. URI는 보안 경로로 `ENGINE_AUDIT_TEST_MONGO_URI` 환경 변수에만 제공한다. `.env`나 일반 `MONGODB_URI`로 폴백하지 않는다. `mongodb://127.0.0.1:<port>/<database>` 형식이며 필요 시 지정 DB 전용 계정만 사용한다. query/hash/SRV/추가 호스트는 거부한다. 비밀값을 문서·명령 기록·커밋에 넣지 않는다.
5. 승인된 실행자만 `node tools/oracle/isolated-db/run.mjs --mode db --run-id <run-id> --approval <승인-복사본-경로>`를 실행한다. 승인 유효성 확인 전에는 URI 환경 변수도 읽지 않는다. 승인 이후 두 MongoClient가 연결되며, DB의 컬렉션 **이름 목록**만 읽어 비어 있는지 검사한다. 하나라도 있으면 문서 읽기/쓰기 핸들을 얻기 전에 중단한다. 따라서 해당 메타데이터 읽기도 승인 범위다.
6. 대상 컬렉션은 `ziweiCalculationPreparations`, `ziweiAiConsultations` 두 개뿐이다. DB 전용 최소 역할과 최초 생성 허용 범위를 환경 관리자가 확인해야 한다. 드라이버 옵션은 directConnection, retryWrites:false, 각 클라이언트 pool 1, 유한 연결/소켓 타임아웃이다.
7. 실패/중단 시 자동 삭제하지 않는다. 부분 생성 자료와 run-id를 보존하고, 원인과 남은 기록을 확인하기 전 재실행하지 않는다. 전체 CLI 재실행은 기존 컬렉션 감지로 멈춘다. 응답 유실 재시도는 한 실험 안에서 같은 ID로 검증한다. 새 실험 DB/정리도 새 승인 범위로 정한다.

## 증거의 한계

이 도구의 DB 연결부는 네이티브 드라이버를 주입하는 좁은 저장소 구현이다. 운영 DB singleton이나 Mongoose 모델을 import하지 않는다. 따라서 운영의 연결 관리, schema casting, 명시적 unique/TTL 인덱스, 샤딩, replica failover, 실제 트랜잭션/권한/지연은 확인하지 않는다. 기본 `_id` 경합과 디스크 재시작 보존은 13 보고서의 로컬 standalone에서만 확인했다.

준비 래퍼 수준의 `basis`/`generate`/재개만 호출하며 실제 API 라우트·결제 복귀 브라우저·PG·LLM 결과 생성을 실행하지 않는다. 향후 실제 DB 실험 성공만으로 전체 결제 흐름이나 운영 준비 완료를 주장하지 않는다. 필요하면 별도의 Swiss 비연결 모델/인덱스 검사 경로를 승인 범위로 준비한다. 기존 Swiss 연결 서비스 경로 및 베다 주 검증기 미확보는 계속 차단 항목이다.
