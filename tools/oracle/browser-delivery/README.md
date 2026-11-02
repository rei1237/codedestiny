# 실제 Chrome의 자미 상담 전달 검증 (mock 전용)

작업 체크아웃 루트에서 실행한다. 운영 서버, PG, LLM, DB를 연결하지 않는다. 기존 승인 어댑터와 실제 클라이언트/서버 처리 함수를 사용하며, 실행 선택은 기본 OFF다. 새 패키지 설치는 필요 없다.

```powershell
node tools/oracle/browser-delivery/verify.mjs --case=normal
node tools/oracle/browser-delivery/verify.mjs --case=boundary
node tools/oracle/browser-delivery/verify.mjs --case=partial
node tools/oracle/browser-delivery/verify.mjs --case=storage-failure
node tools/oracle/browser-delivery/verify.mjs --case=delayed-auth
node tools/oracle/browser-delivery/verify.mjs --case=concurrent
node tools/oracle/browser-delivery/verify.mjs --case=legacy
node tools/oracle/browser-delivery/check.mjs
```

같은 임시 번들 경로를 사용하므로 브라우저 시나리오는 순차 실행한다. 설치된 `C:/Program Files/Google/Chrome/Application/chrome.exe`를 새 headless 프로필로 실행한다. 로컬 서버와 Chrome은 같은 권한 환경에서 실행해야 한다. 실행이 제한되면 네트워크 가드를 끄거나 실제 서비스로 폴백하지 않는다. `verify.mjs`의 `finally`에서 브라우저와 서버를 닫는다.

| 파일 | 역할 |
|---|---|
| `serve.mjs` | 루프백 HTTP, 허용 소스 번들, 실제 처리 함수, PG/LLM/DB mock. 허용되지 않은 API는 501 |
| `browser.tsx` | 실제 React 화면·billing-client·결제 재개 훅 마운트. PG 경계만 mock |
| `next-shims.tsx` | Next image/link/dynamic/navigation의 브라우저 호스팅 대체 |
| `verify.mjs` | 실제 입력·결제 전체 문서 이동·복귀·생성·새로고침·보관함·화면 폭 검증 |
| `check.mjs` | 91개 기존 회귀, 변경 타입/린트, 결제 보호, 문서 검사, 보호 파일 비교 |

결제 서술자를 sessionStorage로 복원하는 **fixture**이며 실제 PG SDK/웹훅/쿠키 정책의 검증은 아니다. DB는 메모리의 제한된 모델 구현으로, 실 DB의 트랜잭션/쿼리 계획/장애 내구성을 보증하지 않는다. 정렬 동작은 이번 한 결과 시나리오에서 사용하지 않는다. LLM 본문은 고정 합성 문장이므로 해석 품질 검증이 아니다.

외부 요청은 브라우저 origin allowlist·CSP와 기존 Node transport guard로 차단한다. UI resolver는 Swiss Ephemeris 연결 모듈을 거부하며, `lucide-react`의 Swiss-franc 통화 아이콘은 별개로 구분한다. 서버 소스는 기존 `delivery-integration`의 AST 추출/소스 핀/허용 공개 어댑터만 사용한다. Worker 전체 import, PortOne SDK, legacy 엔진 runtime 스크립트, 실 DB 연결은 하지 않는다.

증거는 `docs/engine-audit/results/browser-delivery-20261102/`, 설명은 `docs/engine-audit/15-browser-delivery-report.md`에 남긴다. 임시 번들은 `.tmp/engine-audit-browser-delivery/`에만 생성한다. 실행 종료 뒤 이 폴더만 정리한다. 전체 CI/build/배포는 이 러너의 범위가 아니다. `check.mjs`의 `fast-plan-only`는 실행 계획 확인만 의미한다.
