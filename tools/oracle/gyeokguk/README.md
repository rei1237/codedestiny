# 격국 프로필 차이 재현

```powershell
node tools/oracle/gyeokguk/verify.mjs
```

프로젝트의 기존 esbuild 0.25.4(MIT 메타데이터 확인)를 빌드 도구로 사용한다. 추가 설치/운영 의존성 변경 없음. 공개 사주 어댑터와 워커의 명반 변환 래퍼만 번들하고, 외부 패키지/Swiss/라우트/API 경로를 거부한다. 실행은 네트워크 없는 VM에서 한다.

19개 합성 명반은 문서화된 서비스 프로필 계약을 검증한다. 48개 출생 입력은 앱의 명반을 그대로 워커 래퍼에 전달해 프로필 차이를 기록한다. 한글→한자만 변환하며 역법·timezone을 다시 계산하거나 주입하지 않는다. 학교 차이는 B이며 독립 정답이나 확정 오류율이 아니다. 출력은 `.tmp/gyeokguk-audit/report.json`이다.

전왕 5종 양성, 종재/종살/종아/종강/종왕/화토/가종살, 살아 있는 뿌리·인성 반례, 생시 미상 및 가색 이설 보류를 포함한다. 모든 화기·가종 양성/반례를 망라하지 않는다.

Python 독립 오라클 1건은 기존 감사 체크아웃의 격리된 MIT `korean-saju@0.3.0` 러너로 별도 실행했다. 이 명령은 그 Python 환경을 요구하지 않는다. 결과는 CR-008 및 커밋된 요약 JSON에 기록되어 있다. 시주 기준이 달라 D로 분류했으며 정답 확정에 쓰지 않았다.

## CR-008 승인 구현 회귀

```powershell
node tools/oracle/gyeokguk/verify-authority.mjs
```

기준 커밋 `276d112dcb85adcf0c392b6ab3c76858a4c42bce`의 계산기를 별도 VM으로 번들해 OFF 48건 전체 JSON을 비교한다. 현재 공개 어댑터의 ON 48건은 원국·역법 값 보존 및 보고서/격국/용신/직업의 판정 ID를 검증한다. 명명 계약 26건, 유효 간지 단일 필드 변형 1,144건, 잘못된 간지 거부 1,144건은 서비스 프로필 계약이며 독립 정답 개수나 오류율이 아니다. 변형에는 원래 값과 같은 값도 포함한다. 합성 명반은 출생 일시의 실존을 주장하지 않는다.

신규 어댑터: `app/saju/animal-destiny/lib/approvedSajuAnalysis.ts`.

- `computeNewSajuAnalysis(input, options?, kasi?)`: 명시적 `gyeokgukAuthorityV2: true`만 ON. 생년월일 입력이나 환경 변수로 켤 수 없다.
- `prepareNewSajuAnalysis(requestId, input, store, options?, kasi?)`: 입력·명반·버전·무결성 digest를 고정한다. `store`는 호출 서비스의 인증/소유자 범위를 적용한 저장소이며 `insertIfAbsent`가 **원자적으로 기존 승자를 반환**해야 한다. 이 PR은 실 저장소를 구현하거나 연결하지 않는다.
- `resumePreparedSajuAnalysis(pin)`, `preparedSajuPromptFacts(pin)`: 현재 플래그/시간과 무관하게 snapshot을 반환한다. 엔진 재실행·LLM·차감·DB 호출 없음. digest는 데이터 손상 검출용이며 인증·소유권 검증을 대체하지 않는다.
- 기존 저장/유료 결과는 기존 리더로 읽는다. 새 준비 어댑터에 레거시 저장 객체가 들어오면 덮어쓰지 않고 거부한다. 새 버전 도입 시에도 이미 저장된 pin 버전의 reader 지원을 유지해야 한다.

ON의 범위는 공통 프로필의 격국/외격과 용신 각 축이다. 단일 용신 중재, 상신·병약, 구 점수제·사건 시기 해석은 자동 확정하지 않는다. 고객 보고서는 결론·직업·재물·행동 조언을 먼저 제공하고 근거는 접힘 메타데이터에 둔다. 관련 없는 영역을 레거시 판단으로 채우지 않는다. 완성된 종합 사주 상품을 이 범위의 보고서로 자동 교체할 수 없다.

동일 명반 독립 비교(기존 격리 Python venv만 사용, 새 설치 없음):

```powershell
& 'D:/Development/code-destiny/.codex-worktrees/engine-audit-phase0-20261101-163440/tools/oracle-py/.venv/Scripts/python.exe' -B tools/oracle/gyeokguk/same-pillars.py .tmp/gyeokguk-authority/same-pillars-input.json .tmp/gyeokguk-authority/oracle-comparison.json
```

실행 시 MIT 원문·메타데이터, 버전 0.3.0, 추가 의존성 없음, venv를 직접 확인한다. 네트워크/프로세스/Swiss import를 차단하며 기둥을 직접 넘겨 역법을 재계산하지 않는다. 결과 27건 중 정격 이름 및 외격 없음 일치 3건, 학파/명명 차이 B 24건이다. B는 미확정 차이이며 서비스 버그로 자동 분류하지 않는다. 상세한 출력은 [구현 보고서](../../../docs/engine-audit/21-cr008-implementation.md)를 참조한다.
