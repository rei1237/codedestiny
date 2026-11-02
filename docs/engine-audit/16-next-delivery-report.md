# 전체 Next 앱의 mock 결제 복귀·생성·재열람 검증

status: in-progress
updated: 2026-11-02
next: 전체 Next 7개 및 회귀 96개 통과. 로컬 커밋 상태 검사와 종료 기록 후 완료. push/배포 금지.

기준 `50c697d8d`. 기존 감사 워크트리를 계속 사용한다. 공유 체크아웃의 다른 세션 변경은 보존한다. 사용자는 필요한 수정과 회귀를 승인했고 PG/LLM/DB mock, 플래그 OFF, Swiss 차단, 기존 저장·유료 결과 보존, push/배포 금지를 지정했다.

## 실행 범위

실제 Next 개발 서버에 기존 `next.config.mjs`의 mock API beforeFiles rewrite와 원래 페이지·레이아웃·provider·클라이언트를 연결한다. Next/image/link/dynamic/navigation shim을 사용하지 않는다. fixture 설정은 임시 distDir/tsconfig, Swiss resolver 차단, 개발용 디스크 캐시 비활성화를 추가한다. 전체 프로젝트 빌드/운영 배포를 의미하지 않는다.

환경은 OS 실행에 필요한 값만 상속하며 `.env*` 로딩은 Next 환경 로더 경계에서 차단한다. 기존 Node 외부 네트워크 가드와 브라우저 origin 제한/CSP를 유지한다. 실제 API route의 DB 경로는 mock rewrite로 우회하고, 알려지지 않은 API는 501로 닫는다. PG runtime 경계만 test init script로 대체하며 실제 Next 인증/provider와 결제 재개 훅은 유지한다. 기존 서버 하네스의 실제 처리 함수와 허용 공개 명반 어댑터를 사용한다.

## 확인 및 수정 범위

운영 코드의 추가 결함은 현재 검증 범위에서 확인되지 않았다. `tools/oracle/browser-delivery/serve.mjs`에 기존 UI 번들을 생략하고 mock API만 재사용하는 선택과 공통 화면 API fixture 주입을 추가했다. 기본 호출의 component fixture는 유지한다. 새 `tools/oracle/next-delivery/` 러너와 `__tests__/ui/ziwei-next-mock-boundary.test.mjs`를 추가했다.

Next의 custom-server 개발 초기화가 `next({ conf })`를 라우터에 전달하지 않는 점을 설치된 소스에서 확인했다. 테스트 전용 require wrapper가 **원래 config를 먼저 로드한 뒤** 컴파일 경계 차단과 임시 경로를 적용하도록 바꿨다. 컴파일 입력에 `app/layout.js`, 자미 페이지/클라이언트, 실제 인증 provider가 포함되는지 실행 중 확인한다. Swiss 모듈이 입력에 포함되면 실패한다. 환경 파일 로더는 별도 wrapper로 읽기 자체를 생략한다. 실제 Next 로더의 모듈 형식과 이 경계를 신규 테스트로 검사한다.

초기 파일 기반 컴파일 입력 기록이 개발 서버의 변경 감지를 재유발했다. 입력 목록을 IPC로 부모에게 전달하고 서버 종료 후에 저장하도록 수정했다. 또 반복 실행 중 webpack 압축 캐시 읽기에서 `ERR_MEMORY_ALLOCATION_FAILED`가 발생했다. 테스트 서버에만 `cache=false`를 적용했고 운영 config는 수정하지 않았다.

두 창 동시 복귀의 첫 시도에서는 두 번째 창의 `resumed`가 `null`이고 생성 호출이 1회인 실패를 확인했다. 서비스 재개 핸들러가 실행되기 전 **테스트의 context/page init-script 순서**에 따라 가짜 영수증을 너무 일찍 읽은 것이 원인이었다. mock 영수증을 두 init script 설치 후 읽도록 수정했다. 양쪽 초기화 순서 및 영수증 없음의 동작을 검사하는 2개 회귀를 추가했다. [실패 상태](results/next-delivery-20261102/concurrent-failure.json)를 보존한다. timeout을 늘리거나 서버 중복 방지/결제 정책을 바꾸지 않았다.

## 실제 Next 검증 범위

정상 신규 계산, 인증 복원 지연, 2034년 준비 → 2035년 복귀의 대한 경계, 부분 생성 재개, 완료 저장 실패 재시도, 두 창 동시 복귀, 준비/dayun 메타정보가 없는 과거 합성 저장 형식을 검증한다. 각 사례의 최종 결과와 명령 출력은 `results/next-delivery-20261102/<case>.json`에 기록한다.

- 준비된 명반 해시와 모든 mock LLM 입력의 명반 해시, 저장 스냅샷이 일치하는지 확인한다. 신규 선택 버전은 **legacy(기능 플래그 OFF)**다.
- PG mock 화면으로 **전체 문서 이동** 후 원래 Next 페이지로 복귀하고, 실제 `checkout-entry` → `usePaidResume` → 생성 핸들러가 실행된다. 돌아온 문서에서 결제 게이트 호출은 0회다.
- 새로고침과 실제 보관함 클릭으로 본문을 재열람한다. 상담·준비·주문 전체 해시, 쓰기 횟수, PG 조회 수가 유지되고 추가 생성 요청이 없음을 검사한다.
- 부분 생성은 기존 묶음을 넘겨 완료하고, 저장 실패는 본문 재생성 없이 전달만 재시도한다. 동시 복귀는 두 화면에 한 결과를 전달하며 생성/사용 처리는 1회다.
- Next의 실제 API rewrite를 통해 미구현 API가 501 `MOCK_ROUTE_NOT_IMPLEMENTED`를 반환하는지 확인한다. 실제 DB 경로로 폴백하지 않는다.
- 360/390/430/960/1440px에서 가로 넘침이 없는지 확인한다. 쿠키 안내는 실제 화면의 **필수만 사용** 버튼으로 닫는다. 원격 CDN 글꼴 16–17개는 요청 전에 차단되며 기본 글꼴로 검사한다. 실제 CDN 글꼴·물리 모바일 기기의 시각적 동일성을 보증하지 않는다.

HTTP 402는 신규 유료 계산의 정상 준비 응답이고, storage-failure의 HTTP 503은 의도적으로 만든 저장 실패다. 이를 예상된 응답으로 분리하며 다른 오류는 성공으로 처리하지 않는다. Next 개발 경고(caniuse-lite 데이터 경과/향후 allowedDevOrigins)는 기록만 하고 의존성을 갱신하지 않는다.

## 남은 경계

이는 전체 Next **개발 앱에서 자미 상담 경로**를 검증한 것이다. 전체 라우트 전수/운영 export build/전체 CI 검증이나 6개 엔진 전체 서비스 적용을 의미하지 않는다. 실제 PG SDK·결제사 복귀/웹훅, 실 LLM 해석, 실 DB 내구성·운영 사용자 결과, 운영 CDN 글꼴, 모바일 기기 검증은 포함하지 않는다. Swiss 연결 경로와 베다 주 검증기 미확보는 계속 차단 항목이다.

신규 의존성/엔진/어댑터/결제 실행 파일/인증/가격/DB 스키마/저장 및 유료 결과/운영 기능 플래그는 변경하지 않는다. Next가 임시 타입 경로를 적는 `next-env.d.ts`는 실행 전 바이트로 복원하며 다른 변경이면 덮어쓰지 않고 실패한다. 회귀 시 이번 테스트 도구만 되돌리며 원래 명반·준비 ID·기존 결과를 재계산하지 않는다.

## 최종 검증 결과

실제 Chrome `156.0.8078.74`, 실제 Next 개발 컴파일에서 **7/7 시나리오 통과**. 컴파일에서 기록한 프로젝트 입력은 사례당 231개이며 Next/React/webpack 자체 파일은 제외한 수치다. [전체 페이지 캡처](results/next-delivery-20261102/full-next-page.png), [모바일 캡처](results/next-delivery-20261102/mobile.png), [대한 경계 캡처](results/next-delivery-20261102/boundary.png)를 확인했다. 최종 모든 사례의 브라우저 미처리 오류 0, 앱 외부 서비스 호출 없음. 원격 글꼴은 차단 기록에 별도로 남긴다.

| 사례 | 생성 호출 | mock 결제 승인 | 사용 처리 | 핵심 결과 |
|---|---:|---:|---:|---|
| normal | 1 | 1 | 1 | 준비/복귀/생성/재열람 및 미구현 API 501 |
| delayed-auth | 1 | 1 | 1 | 복귀 인증 API 1.5초 지연 후 실제 provider 복원 |
| boundary | 1 | 1 | 1 | 2035년 복귀에도 2034년 명반·명궁 3–12세 유지 |
| partial | 2 | 1 | 1 | 기존 묶음으로 이어서 완료 |
| storage-failure | 1 | 1 | 1 | 동일 작업 저장만 재시도 |
| concurrent | 1 | 1 | 1 | 두 창 모두 같은 완료 결과 표시 |
| legacy | 1 | 1 | 1 | 합성 과거 형식 재열람의 저장 원본 보존, 기존 대한 표시 |

표의 생성/승인은 합성 원본을 준비한 최초 작업을 포함한다. 새로고침·보관함 재열람은 모든 사례에서 추가 생성/PG 조회/승인/저장 쓰기 0이다. DB를 통해 실제 사용자 결과를 조회하거나 수정하지 않았다.

`node tools/oracle/next-delivery/check.mjs` 최종 종료 0. [명령/출력](results/next-delivery-20261102/verification.json), [소스 보존 증거](results/next-delivery-20261102/source-proof.json).

| 검사 | 결과 |
|---|---|
| 기존 전달 통합 | 13/13 |
| 준비·실행 선택/재개 | 23/23 |
| 격리 DB 러너 오프라인 차단 | 15/15 |
| 공식·확대 골든 | 12/12, 확정 **101건 포함** |
| 저장·유료 결과·화면 재개 | 28/28 |
| 신규 Next 차단·mock 초기화 회귀 | 5/5 |
| 합계 | **96/96**, skipped 0 |
| 변경 JS/MJS/CJS ESLint | 종료 0 |
| 기존 component fixture 기본 빌드·미구현 API 차단 | 종료 0 |
| 결제 freeze / 선택 parity self-test | 각각 종료 0, 검증기와 핀 수정 없음 |
| 문서 신선도 | 종료 0 |
| `check:fast` 계획 | 종료 0, 전체 Swiss 연결 경로 실행은 보류 |
| 보호 소스 비교 | 기준 `50c697d8d` 대비 **49개 모두 동일** |

최초 check 실행에서는 로컬 연결 권한 제한으로 component fixture의 loopback 요청이 EACCES였다. 동일 외부 차단을 유지한 로컬 서버 실행 환경에서 재실행하여 통과했다. 개발 캐시의 메모리 오류도 [별도 실패 기록](results/next-delivery-20261102/normal-failure.json)으로 구분한다. 운영 코드의 회귀로 간주하거나 실패를 지워 성공으로 표시하지 않는다.

이번에는 운영 TS/TSX/CSS 변경이 없고 전체 타입 검사·전체 build·CI는 실행하지 않았다. 실제 Next 컴파일과 변경 테스트 파일 lint, 보호 해시 검사를 수행했다. 새로 실행하지 않은 검사를 통과로 적지 않는다.

로컬 커밋·종료 정리는 아래에 완료 기록을 추가한다. push·배포는 하지 않는다.
