# CR-001/002 승인 구현 검증

네오가 승인한 두 내부 변경만 검증한다. 기본 플래그 OFF, Swiss 차단, 운영 데이터 쓰기 없음, push/배포 없음. 원래 Phase 1/2 소스 핀은 변경하지 않았다. 그 러너는 변경된 서비스 소스를 계속 거절하며, 이 폴더의 별도 승인 핀과 러너만 새 소스를 실행한다.

## 실행 경계

- `collect-authorities.mjs`, `verify-impact.mjs`는 명시 승인된 KASI/JPL 공개 읽기를 한다. 서비스 계산은 하지 않는다. 수집 파일/최종 파일을 덮어쓰지 않는다.
- `pin-approved.mjs`는 공개 어댑터 그래프를 빌드만 하고 CR 파일 허용 목록 밖의 변경을 거절한다. 실행 전 사람이 승인 diff를 검토한 후에만 핀을 갱신한다. 임의 엔진/Swiss import 허용 목록은 늘리지 않았다.
- `runner.mjs`는 새 승인 핀과 일치하는 `computeNatalFromInput`/`buildZiweiAdapter`만 실행한다. 기존 VM의 네트워크·WASM·import 차단을 유지한다.
- `run-impact.mjs`는 같은 시드의 기존 무작위 20,000개를 네 프로세스로 나눈다. 250개마다 체크포인트를 쓰며 같은 소스 핀일 때만 재개한다. 최종 산출물이 이미 있으면 새 실행 디렉터리로 코드를 명시적으로 복사/설정해 기록을 분리해야 한다. 기존 증거를 지워 재실행하지 않는다.
- 운영 모듈은 KASI/JPL을 호출하지 않고 생성된 숫자 자료만 읽는다. 오라클 패키지는 운영 번들과 CI 필수 의존성에 들어가지 않는다.

## 읽기 전용 반복 검사

```powershell
node --test __tests__/ui/calendar-authority-regression.test.mjs
node --test tools/oracle/implementation/regression.test.mjs
node tools/oracle/implementation/verify-evidence.mjs
node tools/oracle/implementation/build-authorities.mjs --check
node tools/oracle/implementation/build-golden.mjs --check
node scripts/build-korean-calendar-table.mjs --check
```

`regression.test.mjs`는 합성 입력으로만 계산하고 감사 결과 `regression-101.json`을 갱신한다. `checks.mjs`도 `verification.json`에 검증 기록을 작성한다. 기존 확정 증거 매니페스트를 보존할 때는 실행 결과를 별도 경로에 보관해야 한다. 운영 스냅샷·저장 결과·유료 결과는 어떤 명령도 변경하지 않는다.

## 플래그 사용 계약

정본 기본값은 `lib/korean-calendar/policy.js::DEFAULT_AUTHORITY_FLAGS`이며 두 값 모두 `false`다. 현재 운영 호출부는 값을 켜지 않는다. 개발 검증에서만 공개 어댑터의 선택 인자로 전달한다.

```js
computeNatalFromInput(input, { authorityFlags: { sajuTermAuthorityV2: true } });
computeNatalFromInput(input, { authorityFlags: { koreanCalendarAuthorityV2: true } });
buildZiweiAdapter(input, { fusionExpert: true, authorityFlags: { koreanCalendarAuthorityV2: true } });
```

범위는 [최종 보고서](../../../docs/engine-audit/05-final-report.md)를 따른다. 범위 밖과 절입의 미해결 40 ms 구간은 명시 오류다. 두 플래그를 전 사용자에게 한꺼번에 켜는 설정이 아니다. 성별 기반 대운 경로는 새 절입 기준 적용 대상에서 제외되어 ON에서 거절된다. 기본값 변경, 확대 적용, 저장 결과 재계산은 이 작업의 승인에 포함되지 않는다.
