# 개발환경 기준선과 최적화

## 측정 범위

2026-09-08 KST. 구현 기준 SHA는 `4ab93cfd9`다. 기존 작업 폴더의 미커밋 변경을 가져오지 않은 별도 워크트리에서 검증한다. 측정 JSON은 [로컬](dev-environment-metrics.json), [GitHub](dev-ci-metrics.json)에 있다.

계획 시 루트 메타데이터: 13.05GiB / 258,961파일, 추적 265.93MiB / 4,589파일, TS·JS 2,711파일, node_modules 1.19GiB, 워크트리 7.51GiB. 논리적 파일 크기이며 정션 2개를 따라가지 않았다. 이후 origin/main 기반 워크트리의 집계와 혼합하지 않는다. 생성물·로그·map 추적 후보는 지정 패턴에서 0개였으며 삭제하지 않았다.

## 실행 결과

| 항목 | 첫 실행 | 반복 실행 | 판정 |
|---|---:|---:|---|
| lint | 20.975초 | 3.704 / 3.867 / 3.779초 | exit 0 |
| typecheck | 36.168초 | 4.691 / 4.367 / 4.587초 | exit 0 |
| mock dev 준비 | 1.645초 | 단일 표본 | 준비 완료 |
| 홈 첫 응답 | 11.45초 | 단일 표본 | HTTP 200; 초기 컴파일 10.2초 포함 |

공유 캐시를 지우지 않았으므로 첫 실행을 확정적인 cold 측정이라고 부르지 않는다. dev의 4회 반복·전체 build의 cold/warm 비교는 아직 미측정이다. Next 설정 변경 때 기존 UMD app-context의 refresh 파싱 오류를 확인해 기존 예외 목록으로 해결했다.

TypeScript 포함 파일은 변경 전 1,854개, 변경 후 1,856개였다. 제거된 파일은 0개이며 추가된 것은 개발 서버 생성 route 선언과 추출한 인증 문구 모듈이다. 따라서 exclude 보완으로 현재 typecheck가 빨라졌다고 주장하지 않는다.

PR #1750 로그의 job 시간: Typecheck and lint 84.6초, Static guards 145.3초, Build Pages and Worker 200.1초, Critical checks 237.9초, paid-flow-gates 170.5초. npm 캐시와 webpack 복원은 적중했다. job은 병렬 실행하므로 합계를 PR 대기시간으로 쓰지 않는다. 로그 시간은 스케줄러 대기시간이 아니다.

최근 완료 PR 30개의 최종 HEAD 실행 상태를 조회했다. 이 표본은 수정 전 실패·재시도 이력을 포함하지 않으므로 실패율을 계산하지 않는다. 모든 step 메타데이터 수집은 인증된 REST 조회가 추가로 필요하다. 로컬 credential 파일을 사용하는 조회는 자동 승인 검토에서 거부되어 사용하지 않았다.

## 명령

- `npm run dev`: mock Next + API. 외부 Node 네트워크와 브라우저 API/스크립트/프레임 폴백 차단.
- `npm run dev:live`: 기존 실제 연동 환경. 일반 테스트·측정에서 호출하지 않는다.
- `npm run check:fast -- --plan`: 기준 SHA·변경 파일·등급·선택 이유 확인.
- `npm run check:fast`, `check:ui`, `check:worker`, `check:payment`: 변경 기반 검증. 위험 변경은 자동 승격, Pages 빌드는 CI로 이관. critical Worker dry-run 계약은 유지.
- `npm run check:all`: CI 정적 검사와 전체 검증. 기존 workflow에서 검사를 읽어 목록 복제를 피한다.
- `npm run measure:dev-environment`: 읽기 전용 메타데이터. `-- --commands=lint,typecheck,test --output=docs/dev-environment-metrics.json`으로 시간 측정. 실패 반복 시 중단한다.
- `npm run measure:ci-timings`: 명시적으로 승인된 GitHub 토큰 환경에서 최근 완료 PR 메타데이터 수집. credential 파일·원문 로그는 저장하지 않는다.

## 안전 범위와 제한

mock API는 사주·자미두수·타로 대표 응답과 메모리 로그인·프로필을 제공한다. 오류·지연·재시도를 재현할 수 있다. 미지원 API는 501이며 운영으로 폴백하지 않는다. PG는 실패 fixture이며 결제 성공·지급 검증은 기존 결제 mock 테스트가 담당한다. 모든 제품 API를 모사하는 환경은 아니다.

네트워크 가드는 Node fetch/TCP/TLS/DNS/UDP 및 Node 하위 프로세스를 대상으로 한다. OS 방화벽이나 임의 native 바이너리 차단 기능은 아니다. 기본 테스트도 같은 preload를 사용한다. `.next`는 워크트리별로 분리하며 npm 설치본만 정션으로 공유한다. dev와 build를 같은 워크트리에서 동시에 실행하지 않는다.

VS Code 설정은 개인 경로·자동승인을 제외한 항목만 공유한다. public 원본 전체를 숨기지 않는다. 루트 로컬 설정과 충돌하면 개인 설정을 보존하면서 필요한 항목만 병합한다.

## CI 전환과 완료 기준

현재 CI는 shadow다. 기존 required check·검사 조건을 유지하면서 선택 계획을 artifact로 남긴다. 10개 PR에 문서·UI·Worker·결제·테스트·공유 설정 사례를 포함해 실패 누락과 불필요한 실행을 비교한다. 누락 발견 시 분류를 수정하고 비교를 다시 시작한다. 관측이 끝나기 전 실행 범위 축소를 활성화하지 않는다.

로컬과 CI의 순수 검사 계획을 공유하고 전체 검사에서는 workflow의 정적 검사도 실행해 PR에서 처음 발견되는 오류를 줄인다. 타입 캐시는 입력이 바뀌면 TypeScript가 다시 검사하며 성공 결과 자체를 재사용하지 않는다.

시작 속도 2~5배·토큰 40~70% 감소·UI PR 3~8분·일반 PR 5~15분은 아직 성능 보장이 아니다. 같은 유형의 요청 전후에서 시간·파일 수·캐시/비캐시 입력 토큰·출력 토큰을 비교한다. 사용자 머지 대기는 별도다. Claude와 Codex 새 세션의 실제 규칙 전달 확인, 10개 PR 관측, dev/build 반복 측정은 후속 검증으로 남는다.

각 변경은 git revert로 되돌린다. 운영 배포·실 LLM·실결제·DB 쓰기·결제 cutover·폴더 전면 이동은 이 변경에 포함하지 않는다.

## 동시 작업과 전달 확인
작업 시작 시 npm run worktree:status로 미커밋·main 미반영 커밋의 파일 겹침, 공유 의존성 lock 일치, merge driver를 확인한다. --strict는 겹침·조회 불가에도 실패하며 --json은 전체 근거를 제공한다. 타 작업의 변경을 stash/reset/checkout하거나 공유 설치본에서 npm ci를 실행하지 않는다. 이번 작업은 자체 build-cache 아래에 lockfile 기반 설치본을 만들었다.

중첩 워크트리 ESLint가 상위 설정을 상속해 플러그인이 충돌하던 문제는 root:true로, Next가 부모 lockfile을 root로 선택하던 문제는 outputFileTracingRoot로 수정했다. dev는 포트 점유 시 기존 서버를 건드리지 않고 중단한다. 테스트는 절대 preload 경로를 사용해 다른 cwd의 자식 Node에도 mock 차단이 유지된다.

check:fast는 커밋 전 검사다. check:all은 커밋 후 push 전 검사이며, clean HEAD를 요구하는 기존 public-mirror-fresh 검사를 초반에 실행한다. 검사의 clean 조건을 약화하지 않는다. PR 필수 검사 후 안전하게 머지하고 스테이징 SHA·응답을 확인한다. 프로덕션 승격은 별도 명시 승인 때만 한다.

독립 설치 시 npm audit는 기존 lockfile에 취약점 경고 77건(높음 22건)을 보고했다. 도달 가능성·운영 영향은 미분석이며 의존성 자동 업데이트는 하지 않았다. 별도 보안 검토 대상으로 남긴다.

최종 통합 검증: 최신 main을 격리 브랜치에 통합한 뒤 lint·typecheck·public-mirror-fresh·guard-wiring 통과. 초기 전체 계획에서 env 키 등록 누락을 발견해 정본에 추가하고 재검사했으며, 이미 통과한 정적 검사에 이어 추가/잔여 47개 검사와 Worker dry-run 빌드가 통과했다. Jest는 217 suites / 2401 tests 통과(100.216초), 종료 후 타이머 지연은 별도 진단한다. CI critical 정적 명령을 YAML과 대조한 로컬 계획의 누락은 0개다. CI 전용 설치·캐시·배포 단계까지 로컬에서 재현한다는 의미는 아니다.

Jest 종료 지연은 찻집 mock 3스위트의 남은 그룹 deadline(최대 66초)으로 재현했다. 응답/콘텐츠를 검사하는 해당 스위트에만 fake timers와 teardown을 적용해 24개 테스트가 총 2.117초에 정상 종료했다. 제품 타이머와 실제 timeout 계약 테스트는 변경하지 않았다.
