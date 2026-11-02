# 전체 Next 앱 전달 검증 — mock 전용

기존 감사 체크아웃 루트에서 실행한다. 설치된 Google Chrome과 프로젝트의 Next/Playwright만 사용한다. 새 설치·운영 코드·환경 파일·운영 플래그 변경은 필요 없다.

```powershell
foreach ($scenario in @('normal','delayed-auth','boundary','partial','storage-failure','concurrent','legacy')) {
  node tools/oracle/next-delivery/verify.mjs "--case=$scenario"
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
node tools/oracle/next-delivery/check.mjs
```

테스트 ON과 OFF 전환 검증은 다음과 같다. `--engine` 생략 시 OFF다. 운영 환경변수/브라우저 옵션은 만들지 않는다.

```powershell
foreach ($scenario in @('normal','prepare-race','delayed-auth','boundary','partial','storage-failure','concurrent','legacy','unsupported')) {
  node tools/oracle/next-delivery/verify.mjs --engine=on "--case=$scenario"
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
foreach ($scenario in @('normal','partial')) {
  node tools/oracle/next-delivery/verify.mjs --engine=rollback "--case=$scenario"
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
node tools/oracle/next-delivery/verify.mjs --engine=off --case=normal
node tools/oracle/next-delivery/check.mjs
```

`selection.mjs`는 테스트 backend의 실제 준비 resolver에만 명시적 옵션을 전달한다. ON은 새 준비에서 선택하고, rollback은 준비 후 PG 복귀 전에 OFF한다. legacy 사례는 OFF로 만든 합성 과거 기록을 ON 상태에서 열람한다. unsupported는 범위 밖 입력이 결제 전에 거부되는지 검사한다. prepare-race는 실제 Next API 요청을 네트워크 경계에서 동시에 두 번 보내 하나의 주문·준비로 수렴하는지 확인한다. 이 기능들은 운영 selector가 아니다.

서버와 Chrome은 같은 권한 환경에서 실행한다. 하나의 임시 Next 출력 디렉터리를 사용하므로 순차 실행한다. 기존 서버를 포트로 찾아 종료하거나 다른 작업의 파일을 삭제하지 않는다. 설치된 Chrome 경로는 `C:/Program Files/Google/Chrome/Application/chrome.exe`이며 각 실행은 새 프로필을 사용한다.

## 실제 코드와 mock 경계

- 실제 Next 개발 서버의 `/ziwei-ai/` 페이지·RootLayout·provider·공통 스크립트·클라이언트·동적 import·라우터·CSS를 사용한다. framework shim은 없다. `next.config.mjs`의 기존 mock `beforeFiles` rewrite가 API를 루프백 mock 서버로 전달한다.
- `browser-init.mjs`는 PG runtime 경계와 합성 로그인 힌트만 만든다. 인증/provider/결제 재개 훅을 교체하지 않는다. 실제 checkout dispatcher가 실제 등록된 화면 핸들러를 호출한다. 준비·명반 계산·생성 orchestration·저장·조회는 기존 허용 하네스 코드다. PG/LLM/DB는 메모리 mock이며 실제 SDK/결제사/DB 연결은 없다.
- 승인 응답을 저장하고 실제 문서 이동 → 복귀 → 생성 → URL 복구 → 새로고침/보관함 순서로 검증한다. 운영 실행 버전 선택은 항상 OFF이며 `--engine`은 테스트 backend에만 적용한다. `legacy` 사례의 과거 저장 구조는 생성한 합성 레코드에만 구성한다.
- Next 내부 config 로더의 test-only wrapper는 원래 설정을 먼저 읽은 뒤 임시 distDir/tsconfig와 Swiss webpack 차단을 추가한다. 공유 PC의 압축 캐시 해제 메모리 부족을 피하기 위해 테스트 서버의 webpack cache만 끈다. 설치된 Next의 custom server는 `next({ conf })` 값을 개발 라우터에 전달하지 않으므로 이 경계를 사용한다. 내부 API 변화 시 `ziwei-next-mock-boundary.test.mjs`에서 실패한다.
- `guard.cjs`는 Next 환경 파일 로더를 mock으로 교체해 `.env*`를 읽지 않는다. 부모는 OS 실행 변수만 자식에게 전달한다. 기존 Node transport guard·Next mock CSP·브라우저 origin 제한을 함께 적용한다. Swiss/실 DB 모듈은 require/webpack resolve 전에 거부한다.
- 미구현 API는 501이며 실제 서비스 폴백이 없다. `assets.code-destiny.com`의 원격 글꼴도 차단한다. 이는 기본 글꼴로 실행한 화면 검증이며 운영 CDN 글꼴의 픽셀 동일성 증거는 아니다.

## 파일·결과·종료

`server.mjs`는 실제 Next를 호스팅하고 compile fileDependencies를 IPC로 보낸다. 컴파일 완료 때 소스 감시 범위에 증거 파일을 쓰지 않는다. `verify.mjs`는 부모에서 서버 종료 뒤 증거를 저장하고, Next가 임시 타입 경로를 기록한 `next-env.d.ts`를 실행 전 바이트로 복원한다. 다른 변경이면 덮어쓰지 않고 실패한다.

현재 검증 증거는 `docs/engine-audit/results/next-enabled-delivery-20261102/<engine>-<case>.*`, 보고서는 `docs/engine-audit/17-next-enabled-delivery-report.md`에 남긴다. 이전 OFF 검증은 `16-next-delivery-report.md`와 기존 결과 디렉터리에 보존한다. `*-modules.json`은 webpack 컴파일 입력 파일 목록으로 실제 화면 클릭 범위 이상의 실행을 뜻하지 않는다.

브라우저/서버는 `finally`에서 종료한다. 응답하지 않는 자식은 이 실행이 만든 PID 트리만 종료한다. 임시 번들은 `.tmp/engine-audit-next/`와 기존 fixture 확인의 `.tmp/engine-audit-browser-delivery/`에 남으므로 작업 종료 후 절대 경로를 확인하고 자기 산출물만 삭제한다. 실패 시 테스트 실행 파일과 증거를 수정하기 전에 원인을 확인한다.

`check.mjs`는 기존 96개, ON 선택/주문 경합 6개, 결과 표시 5개, 영냥이 결과 우선 4개로 총 111개 회귀와 이전 component fixture 기본 빌드, lint, 결제 보호, 문서 검사, `check:fast` 계획을 실행한다. 브라우저 러너가 종료하고 `next-env.d.ts`를 복원한 뒤 실행해야 한다. 주문 재사용 helper/결과 UI의 의도한 변경과 보호 소스 47개를 구분해 비교한다. 전체 운영 build/CI/배포, 실제 PG SDK·웹훅·LLM 내용·DB 내구성·모바일 기기는 별도 검증 대상이다.

고객 화면과 PDF 검증:

```powershell
node tools/oracle/next-delivery/verify.mjs --engine=on --case=normal --customer-view
node tools/oracle/next-delivery/verify-references.mjs
node scripts/verify-paid-editorial-report.mjs docs/engine-audit/results/next-enabled-delivery-20261102/legacy-reference
```

`--customer-view`는 합성 상담 4개 섹션으로 결론 우선·근거 접힘·원문 재열람을 검사한다. ON normal은 실제 PDF 다운로드도 검사한다. `--debug-pdf`는 진단용 예외 정지를 켜므로 정상 검증에 쓰지 않는다. `verify-references.mjs`는 6개 domain의 실제 공유 컴포넌트와 PDF를 검사하되 Next 링크/이미지만 DOM shim이다. 모든 서비스 계산/결제 E2E를 뜻하지 않으며 Swiss 그래프는 허용하지 않는다. 순수 UI fixture의 외부 API는 501이고 실제 연동 폴백이 없다.

실제 다른 서비스 결과 URL 검증은 `node tools/oracle/next-delivery/verify-service-results.mjs`로 실행한다. 베다·서양점성술·신년·숙요·인생의 책·연애 비책·운명의 업·융합 및 영냥이 6종의 **완료된 합성 저장 응답**을 로컬 mock API로 읽는다. 계산·생성·실결제 경로를 실행하지 않는다. `AUDIT_SERVICES`에 `sukuyo,karma`처럼 키를 지정하면 해당 사례만 재검증한다. 390/960px, 키보드 접힘·펼침, 원문과 재열람 응답 해시, 결제 창 미호출을 검사한다. `service-results-20261102/*-report.json`에 실행별 증거를 기록하며, 전체 설명과 한계는 `docs/engine-audit/19-service-results-browser-report.md`에 있다.
