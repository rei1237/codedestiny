# 전체 Next 앱 전달 검증 — mock 전용

기존 감사 체크아웃 루트에서 실행한다. 설치된 Google Chrome과 프로젝트의 Next/Playwright만 사용한다. 새 설치·운영 코드·환경 파일·운영 플래그 변경은 필요 없다.

```powershell
foreach ($scenario in @('normal','delayed-auth','boundary','partial','storage-failure','concurrent','legacy')) {
  node tools/oracle/next-delivery/verify.mjs "--case=$scenario"
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
node tools/oracle/next-delivery/check.mjs
```

서버와 Chrome은 같은 권한 환경에서 실행한다. 하나의 임시 Next 출력 디렉터리를 사용하므로 순차 실행한다. 기존 서버를 포트로 찾아 종료하거나 다른 작업의 파일을 삭제하지 않는다. 설치된 Chrome 경로는 `C:/Program Files/Google/Chrome/Application/chrome.exe`이며 각 실행은 새 프로필을 사용한다.

## 실제 코드와 mock 경계

- 실제 Next 개발 서버의 `/ziwei-ai/` 페이지·RootLayout·provider·공통 스크립트·클라이언트·동적 import·라우터·CSS를 사용한다. framework shim은 없다. `next.config.mjs`의 기존 mock `beforeFiles` rewrite가 API를 루프백 mock 서버로 전달한다.
- `browser-init.mjs`는 PG runtime 경계와 합성 로그인 힌트만 만든다. 인증/provider/결제 재개 훅을 교체하지 않는다. 실제 checkout dispatcher가 실제 등록된 화면 핸들러를 호출한다. 준비·명반 계산·생성 orchestration·저장·조회는 기존 허용 하네스 코드다. PG/LLM/DB는 메모리 mock이며 실제 SDK/결제사/DB 연결은 없다.
- 승인 응답을 저장하고 실제 문서 이동 → 복귀 → 생성 → URL 복구 → 새로고침/보관함 순서로 검증한다. 서비스 실행 버전 선택은 항상 OFF. `legacy` 사례의 과거 저장 구조는 생성한 합성 레코드에만 구성한다.
- Next 내부 config 로더의 test-only wrapper는 원래 설정을 먼저 읽은 뒤 임시 distDir/tsconfig와 Swiss webpack 차단을 추가한다. 공유 PC의 압축 캐시 해제 메모리 부족을 피하기 위해 테스트 서버의 webpack cache만 끈다. 설치된 Next의 custom server는 `next({ conf })` 값을 개발 라우터에 전달하지 않으므로 이 경계를 사용한다. 내부 API 변화 시 `ziwei-next-mock-boundary.test.mjs`에서 실패한다.
- `guard.cjs`는 Next 환경 파일 로더를 mock으로 교체해 `.env*`를 읽지 않는다. 부모는 OS 실행 변수만 자식에게 전달한다. 기존 Node transport guard·Next mock CSP·브라우저 origin 제한을 함께 적용한다. Swiss/실 DB 모듈은 require/webpack resolve 전에 거부한다.
- 미구현 API는 501이며 실제 서비스 폴백이 없다. `assets.code-destiny.com`의 원격 글꼴도 차단한다. 이는 기본 글꼴로 실행한 화면 검증이며 운영 CDN 글꼴의 픽셀 동일성 증거는 아니다.

## 파일·결과·종료

`server.mjs`는 실제 Next를 호스팅하고 compile fileDependencies를 IPC로 보낸다. 컴파일 완료 때 소스 감시 범위에 증거 파일을 쓰지 않는다. `verify.mjs`는 부모에서 서버 종료 뒤 증거를 저장하고, Next가 임시 타입 경로를 기록한 `next-env.d.ts`를 실행 전 바이트로 복원한다. 다른 변경이면 덮어쓰지 않고 실패한다.

검증 증거는 `docs/engine-audit/results/next-delivery-20261102/`, 보고서는 `docs/engine-audit/16-next-delivery-report.md`에 남긴다. `*-modules.json`은 webpack 컴파일 입력 파일 목록으로 실제 화면 클릭 범위 이상의 실행을 뜻하지 않는다.

브라우저/서버는 `finally`에서 종료한다. 응답하지 않는 자식은 이 실행이 만든 PID 트리만 종료한다. 임시 번들은 `.tmp/engine-audit-next/`와 기존 fixture 확인의 `.tmp/engine-audit-browser-delivery/`에 남으므로 작업 종료 후 절대 경로를 확인하고 자기 산출물만 삭제한다. 실패 시 테스트 실행 파일과 증거를 수정하기 전에 원인을 확인한다.

`check.mjs`는 기존 91개와 신규 차단/fixture 회귀 5개, 이전 component fixture 기본 빌드, lint, 결제 보호, 문서 검사와 `check:fast` 계획만 실행한다. 전체 운영 build/CI/배포, 실제 PG SDK·웹훅·LLM 내용·DB 내구성·모바일 기기는 별도 검증 대상이다.
