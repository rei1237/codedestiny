# 결과 화면 통합 검증 — mock 전용

최신 main 기반 UI 통합 체크아웃에서 실행한다. PG·LLM·DB는 합성 응답이며 실제 서비스 폴백은 없다. 엔진 개선 선택은 켜지 않는다.

```powershell
node tools/oracle/next-delivery/verify-service-results.mjs
```

설치된 Next/Playwright와 Chrome을 사용한다. 신규 의존성을 설치하지 않는다. 15개 결과 시나리오를 960px·390px에서 확인한다. 저장된 결론이 계산 근거보다 앞서는지, 근거가 기본 닫힘인지, 키보드 펼침/접힘과 새로고침 후 원문이 보존되는지 검사한다.

`guard.cjs`는 환경 파일 로딩, 외부 Node 네트워크, Swiss·실 DB 모듈을 차단한다. `server.mjs`는 실제 Next 앱을 임시 경로에서 컴파일하고 Swiss webpack 의존성도 거부한다. 브라우저는 루프백만 허용하며 외부 폰트 차단을 기록한다. 실제 CDN 글꼴의 픽셀 동일성 검증은 아니다.

증거는 `.tmp/result-integration-evidence/`, 임시 번들은 `.tmp/engine-audit-next/`에 생성한다. 서버는 이 실행에서 만든 PID만 종료하며 `next-env.d.ts`는 실행 전 바이트로 복원한다. 스크린샷은 커밋하지 않는다.

감사 브랜치의 엔진 ON/결제 생성 하네스는 이 UI 통합에 포함하지 않았다. 이 검사는 저장 결과 전달·표시 회귀이며, 전체 엔진의 천문 정확도나 실 결제 검증을 의미하지 않는다.

## 현재 트리의 신규 자미 전달 검증

승인 CR-001~006 선별 통합 뒤 아래 mock 전용 검사를 실행할 수 있다. 실제 PG/DB/LLM은 호출하지 않는다. 계산 import는 delivery-integration/consumer-source-pins.json으로 고정하고 guard.cjs를 유지한다. 산출물은 .tmp/all-engine-next-enabled 아래에만 둔다.

```powershell
node tools/oracle/next-delivery/verify.mjs --engine=on --case=normal --customer-view
node tools/oracle/next-delivery/verify.mjs --engine=rollback --case=partial
```

기존 문서의 마지막 문단은 이전 상태다. 현재는 위 신규 자미 두 시나리오까지 검증했다. 전체 타로/Swiss/모든 상품의 신규 E2E를 의미하지 않는다.
