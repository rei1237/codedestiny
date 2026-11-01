# 전용 로컬 DB 검증과 구매자 전달 후속 기준

status: done-local-db-verified-not-deployed

기준 커밋: `7e2d28969`. 2026-11-02 사용자는 전용 로컬 DB 생성·합성 6건 쓰기·동시 요청/재시도/저장 보존 검증을 승인했다. 별도 [CR-007](change-requests/CR-007.md)에서 MongoDB Community Server 8.0.34의 이번 로컬 서버 사용만 라이선스 예외로 승인했다. 운영 DB/실 PG/실 LLM/push/배포는 금지, 플래그 OFF와 Swiss 차단 유지다.

## 실험 고정값

- run-id: `localdb20261102a`, DB: `cd_engine_audit_cr006_localdb20261102a`, 주소: `127.0.0.1:27186`.
- 전용 경로: `tools/oracle/isolated-db/.local/` 아래 서버 바이너리와 새 run 디렉터리. `.gitignore`로 배포/커밋에서 제외한다. OS 서비스·전역 PATH·운영 환경 파일을 수정하지 않는다.
- 검증한 기존 runner sourceDigest: `46d24b2b9312c1933b22b5c79f6ae225323a217ef528384b5960635d8bc06ae1`. 실행 직전 다시 확인한다. 실행 코드/허용 목록/한도/플래그를 완화하지 않는다.
- 준비 4 + 상담 2개, 동시 준비 20회, insert 시도 최대 26/문서 읽기 최대 160. 같은 키의 응답 유실 복구와 부분/완료 저장 결과의 해시 보존을 검사한다.

## 운영 분리 확인 순서

1. 기존 설치 경로/실행 명령/관련 프로세스/후보 포트 확인. 운영 URI나 자격 증명 조회 없음. 표준 경로에 MongoDB/Docker/Podman 없음, 후보 포트 리스너 없음, D 드라이브 여유 약 140GB 확인.
2. 공식 ZIP SHA256 일치 및 압축 내부 LICENSE/NOTICE 확인 후에만 실행. 전용 새 데이터 디렉터리 존재/비어 있음, 프로세스의 실행 파일 경로·해시·인수, 실제 리스너 PID/bind 주소/포트를 확인.
3. standalone, config/replica/shard/운영 파일 없이 기동하고 DB 빈 상태를 확인. loopback만으로 운영 분리 증거를 대체하지 않는다.
4. 승인 파일은 위 run-id/주소/DB명/sourceDigest에 한정하고 실행 시점부터 1시간 이내 만료한다. 운영 설정을 읽지 않고 명시한 테스트 URI만 자식 프로세스에 전달한다.
5. 검증 후 이번 프로세스만 종료. 데이터는 보존하며 삭제/drop/update/자동 초기화하지 않는다. 재시작 후 기존 기록 확인이 필요해도 지정 합성 기록 읽기만 수행한다.

## 후속 서비스 적용 목표 — 아직 활성화하지 않음

사용자는 정확도 개선 이후 신규 구매자가 개선된 엔진의 올바른 결과를 전달받는 것을 최종 목표로 추가했다. [08 단계 연결 계획](08-service-rollout-plan.md)의 신규 계산 전용·저장 원본 보존·지원 범위 판정·즉시 신규 OFF 기준을 유지한다. CR-005/006은 구현됐고, 이번에는 DB 실증을 보강한다. 이전 08 문서의 미구현 표시는 당시 기록이며 현재 상태는 09~13 보고서를 따른다.

| 연결 전 증거 | 통과 기준 / 현재 경계 |
|---|---|
| 엔진 사실값 | 사주·자미의 승인된 지원 입력과 공식 골든부터 적용. 격국/용신·윤달/자시 등 학파 선택은 결정표 유지. 전체 입력·6개 엔진으로 자동 확대하지 않음 |
| 나머지 엔진 | 베다/서양/숙요의 Swiss 연결과 베다 주 검증기 미확보는 차단 유지. 타로 포함 각 엔진의 실제 공개 인터페이스·허용 oracle·결정성/출력 계약을 따로 검증 |
| 구매 전 고정 | 지원 판정→준비 명반/버전 원자적 고정→기존 결제 준비 순서. 확인되지 않은 명반으로 주문 진행 금지 |
| 결제 후 전달 | 동일 owner/feature/requestId/주문에 준비·생성·LLM 사실 입력·결과 화면·PDF가 같은 snapshot을 사용. 결제 복귀/두 탭/재시도/부분 재개에서 새 계산·중복 차감·장 혼합 0 |
| 완료/유료 원본 | 기존 결과는 읽기만, 원문/명반/언어/소유권 해시 보존. 새 버전 결과도 OFF 이후 그대로 열람. 재구매·새 주문으로 오류 우회 금지 |
| 검증 승급 | 이번 네이티브 DB 실험은 운영 Mongoose·전체 API·브라우저·PG·실 LLM 검증을 대체하지 않음. Swiss 비연결 통합 경로와 정식 CI, 승인된 결제 왕복 증거를 먼저 확보 |
| 단계 연결/중단 | 허용된 신규 요청만 제한 시범→단계 확대. 저장 변경/명반 혼합/중복 과금/타 계정 노출/공식 골든 실패 1건이면 신규 선택 OFF, 진행 기록과 기존 유료 원본은 보존 |

엔진/불변 함수/결제 실행 파일/자산 스키마의 추가 변경이 필요하면 별도 CR로 정리한다. 향후 연결 목표는 현재 push·배포·실 PG 금지를 해제하지 않는다. 실제 서비스 연결 완료나 모든 엔진 무회귀를 이번 결과로 주장하지 않는다.

## 실행 결과

**실제 전용 로컬 MongoDB 검증 통과.** [실행 원문](results/local-db-20261102/db-execution.json)과 [구조화 결과](results/local-db-20261102/db-result.json)에 시작/종료 시각·인수·exit 0·실제 DB 연결·허용 import 목록을 보존했다. DB명/fixture ID는 전부 합성이며 실제 고객 기록이나 운영 설정은 조회하지 않았다.

| 확인 항목 | 실측과 증거 |
|---|---|
| 서버 패키지 | 공식 8.0.34 ZIP 807,616,685 bytes, 공식 SHA256과 실측 일치. gitVersion `51db4515a6597aedcf6188ee4e48a27e65b065ae`. 설치 LICENSE·MPL-2·THIRD-PARTY-NOTICES 직접 읽기/해시 고정. Authenticode는 NotSigned이므로 서명 검증 성공으로 표시하지 않음. [설치 증거](results/local-db-20261102/server-package.json) |
| 쓰기 전 운영 분리 | 신규 빈 데이터 폴더, 포트 선점 없음, 직접 시작한 PID 12264의 실행 파일/인수와 실제 loopback 리스너 대조. startup options에 config·replication·sharding 없음. 운영 URI 미조회. [분리 증거](results/local-db-20261102/isolation-before-write.json) |
| 권한·코드 고정 | 사용자 DB 승인 + CR-007 예외. run-id/주소/DB명/sourceDigest/45분 만료/한도 한정 [승인 기록](results/local-db-20261102/approval.json). 기존 false 예제·기능 플래그·runner 코드/핀 미변경 |
| 실제 경합 | 두 MongoClient/각 pool 1에서 동일 요청 20회 준비. 확정본 1개 유지. insert 시도 합계 **25회**에는 중복 키 경합이 포함되며 고유 준비 **4건**, 상담 **2건**만 생성. 문서 읽기 **57회** |
| 응답 유실·재시도 | 실제 insert 성공 뒤 합성 응답 유실을 주입, 다른 연결로 같은 저장 명반 회수. 서버/네트워크 패킷 손실 전체를 실제로 주입한 실험은 아님 |
| 재개·거부 경계 | basis/generate의 분석 연도 변경, 다른 입력/경도/계정, 없는 자료/읽기 실패, 손상 fixture 보류 통과. 읽기 실패·손상은 통제된 합성 주입 |
| 저장·유료 보존 | 완료 유료/부분 상담 fixture의 전후 전체 해시 동일. 실제 DB의 컬렉션 이름과 4+2 개수를 추가 readback으로 확인. 4개 준비 기록 모두 `authorityVersion:legacy`, 신규 v2 OFF. [종료 전 재조회](results/local-db-20261102/readback-before-shutdown.json) |
| 디스크 보존 | 정상 종료 후 같은 데이터 폴더로 PID 4428 재기동, 실행 파일/소유 리스너 재확인. 6개 **전체 문서** 해시가 재시작 전후 동일, 추가 fixture 쓰기 0. [재기동 분리](results/local-db-20261102/restart-isolation.json), [재조회](results/local-db-20261102/readback-after-restart.json) |
| 종료·보존 | 정상 종료 로그 exitCode 0 두 번, 두 PID 모두 종료, 27186 리스너 0. WiredTiger 합성 데이터 파일 보존, drop/delete 0. [종료 증거](results/local-db-20261102/shutdown.json) |
| 오프라인 차단 회귀 | 기존 `node --test __tests__/ui/ziwei-isolated-db-runner.test.mjs` **15/15 통과** 재확인. [출력](results/local-db-20261102/offline-regression.json) |
| 운영 소스 불변 | 이전 증거의 운영 관련 39개 파일 해시 일치, 기존 runner sourceDigest 동일. [소스 증거](results/local-db-20261102/source-proof.json) |

주 시나리오 **7/7** 통과. 명반 해시 `c0c657e197148b9c172baddde70e8dbaf0d7a4491bd5d4918daed072e52caaaf`는 앞선 오프라인 실행과 같다. 이번 저장 상담 해시 `8b37fc281ddc36627db3d4ba249c3d7e9c698c25125b6639b98c3373184beb76`는 해당 run-id 안에서 비교했다. 다른 실행 ID가 포함된 과거 모의 상담 해시와 같아야 한다고 주장하지 않는다.

종료 전후 진단은 같은 전용 DB의 메타데이터와 지정 합성 ID만 읽었다. 추가 문서 읽기/개수 조회 18회를 주 시나리오 57회와 합쳐 75회이며 160회 상한 안이다. 메타데이터 명령과 프로토콜 내부 메시지는 이 문서 읽기 횟수와 별개다. 재조회 진단은 Mongo 드라이버와 TCP 단일 목적지 가드만 사용하고 엔진/전체 Worker/PG 모듈을 import하지 않았다.

이번 서버는 직접 기동한 **loopback 전용·무인증 standalone**이다. 운영 DB 계정/권한, replica failover, Mongoose casting/index/lease와 실제 결제/API/브라우저 흐름은 미검증이며 운영 환경의 증거로 확대하지 않는다. 실제 PG/LLM/운영 DB 호출 0, push/배포/플래그 ON 0이다. 기존 63개 정확도/저장 회귀는 앞선 12 보고서의 결과를 유지하며 이번에 재실행한 것으로 합산하지 않는다.

데이터·필수 서버 실행 파일/원문 라이선스·로컬 로그는 `.local/`에 보존했다. 설치 ZIP/PDB 및 사용하지 않은 부가 파일 6개(2,993,440,467 bytes)는 이번 생성 경로가 전용 디렉터리 안임을 확인하고 정리했다. [정리 기록](results/local-db-20261102/cleanup.json). 합성 DB와 기존 자료는 삭제하지 않았다.

`verify-doc-freshness` 통과, `check:fast -- --plan` 종료 0. 계획은 새 도구 `.gitignore`를 미분류 critical로 판정해 Swiss 연결 전체 테스트/빌드까지 선택했다. 따라서 **전체 check:fast/CI/build는 미실행**이며 분류나 가드를 완화하지 않았다. 변경은 문서·증거·로컬 산출물 ignore뿐으로, 서비스/runner mjs의 추가 수정은 없다. 공식 CI·서비스 연결은 아직 완료하지 않았으며 후속 단계는 위 구매자 전달 기준을 따른다.

실측/문서/승인 기록을 `46dd376e0a073ef175daf5d1c0f3cb2ebc9c2884`에 로컬 커밋했다. 그 깨끗한 트리에서 **`npm run check:pre-push` 종료 0**, 검사 전후 추적/미추적 변경 0을 확인했다. 홈 registry·공개 미러·1,037 URL 사이트맵·llms 문서·SEO registry 통과 [원문](results/local-db-20261102/committed-check.json). 전달 기록은 별도 로컬 커밋으로 남긴다. push·배포·main 통합은 하지 않았고 전용 워크트리를 보존한다.
