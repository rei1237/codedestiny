# CR-005 허용 경계 검사

이 도구는 기본 OFF인 자미 실행 선택·저장 명반 재사용과 추출된 실제 생성 함수의 mock 계약을 검사한다. 전체 라우트를 import하거나 엔진 내부를 바꾸지 않는다. 운영 데이터·결제·LLM·Swiss 실행은 금지다.

```powershell
node --test __tests__/ui/ziwei-execution-selection.test.mjs __tests__/ui/ziwei-execution-lifecycle.test.mjs
node tools/oracle/execution-selection/checks.mjs verification-new-run.json
```

두 번째 명령은 새 결과 이름이 필요하다. 기존 결과 파일이 있으면 거절한다. 원래 `verification.json`에는 결제 선택 정합성의 기존 캐시 핀 실패도 보존돼 있다. `pre-existing-cache-pin.json`은 기준 커밋 대조다. 이전 단계의 자료/핀/매니페스트를 갱신하지 않는다.

실제 계산을 import하기 전에 기존 승인 소스 핀을 확인한다. 생명주기 검사는 원 라우트의 `handleStart` 본문을 추출하여 VM에서 실행하고 DB unique/lease·과금·LLM은 mock이다. 소스 함수를 테스트 안에서 다시 구현하지 않는다. 실제 DB의 원자성/운영 과금 증거로 해석하지 않는다. 테스트에서만 명시적인 ON 옵션으로 저장한 v2 명반을 OFF 후 재개하며 운영 라우트는 옵션을 전달하지 않는다.

준비 단계·출생지 전달·새 저장 형식·다른 소비자 전환은 CR-006 및 별도 검증 대상이다. 허용 검사만 통과한 것을 전체 CI·활성화 준비 완료로 보고하지 않는다.
