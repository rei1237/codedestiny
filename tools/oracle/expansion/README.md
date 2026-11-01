# CR-003/004 한정 확대 검증

기본 OFF, 원래 자료 버전 보존, Swiss·실서비스 네트워크·저장/결제 쓰기 차단. 새 공식 자료와 실행 결과는 `docs/engine-audit/results/expansion-20261101`에만 쓴다. 이전 `implementation`/Phase 1/2 핀과 원문을 갱신하지 않는다.

## 실행 경계

- `collect.mjs --terms` / `--months`: 공개 JPL/KASI 수집만 수행. 같은 URL/해시의 캐시만 재사용한다. 서비스 엔진은 import하지 않는다.
- `verify-evidence.mjs`: 저장 원문 해시, 직접 JPL 부호, KASI 월말/다음 월 순서 검증. 오프라인.
- `build-data.mjs --check`, `build-daeun-golden.mjs --check`: 공식 데이터/독립 sect 1 골든 freshness. `--check`를 빼면 승인된 생성물 작성 명령이다.
- `pin.mjs`: 승인된 변경 파일 목록 안에서 공개 어댑터 그래프 빌드/라이선스 확인. 기존 핀은 보존한다. 승인 diff 검토 없이 핀만 갱신하지 않는다.
- `runner.mjs`: 기존 VM I/O·WASM 차단을 유지하며 공개 어댑터의 세 번째 대운 실행 옵션만 연결한다. 다른 도메인은 즉시 거절한다.
- `regression.mjs off|daeun`, `impact.mjs`: 그래프 핀/라이선스 검증 후 네트워크 차단 프로세스에서 공개 어댑터를 호출한다. OFF는 원래 표본, 대운은 별도 고정 시드 `0xc0de0304`, ON 영향은 원래 표본을 사용한다. 출력이 있으면 거절하므로 재실행은 새 결과 경로를 명시적으로 마련한다.
- `check-lunar-sect1.mjs`: MIT lunar-javascript 1.7.7의 개별 인스턴스에 같은 공식 KST 節·연간·월주를 공급하는 통제 대조다. 함수는 매번 복원하며 설치 소스는 수정하지 않는다. 원래 CST 천문값/다른 관례의 정답 판정이 아니다.
- `checks.mjs`: 명시된 허용 검사와 결과 기록. 전체 Jest/CI/앱 빌드는 실행하지 않는다. `finalize.mjs`는 기존 증거 보존·원시 결과 해시·집계 검증 후 새 매니페스트를 만든다. 완성된 증거를 덮어쓰기 위해 파일을 삭제하지 않는다.

## 신규 계산의 명시적 선택 예

```js
// 기존 두 달력 플래그의 기본값은 그대로 false. 버전 생략 시 원래 한정 자료 유지.
const flags = {
  koreanCalendarAuthorityV2: true,
  sajuTermAuthorityV2: true,
  authorityVersion: 'kasi-jpl-expanded-20261101',
};
computeNatalFromInput(input, { authorityFlags: flags });

// 대운은 별도 opt-in. 서울·양력·원래 검증된 14개 연도만 지원.
computeNatalFromInput(input, { authorityFlags: { sajuTermAuthorityV2: true } }, {
  daeunAuthorityV2: true,
});

// 자미에는 사주 절입 플래그를 넘기지 않는다.
buildZiweiAdapter(input, {
  fusionExpert: true,
  authorityFlags: { koreanCalendarAuthorityV2: true, authorityVersion: flags.authorityVersion },
});
```

이 예시는 검증용 호출 계약이며 운영 호출부/환경/저장 설정을 활성화하지 않는다. 시간·성별 미상 대운은 미산출, 잘못된 입력·지원 범위 밖·미확정 절입은 명시 거절한다. 두 달력 플래그의 조합은 실제 양력 지원 교집합에서만 성공한다.

## 오프라인 회귀

```powershell
node --test __tests__/ui/calendar-authority-regression.test.mjs __tests__/ui/calendar-authority-expansion.test.mjs
node tools/oracle/expansion/verify-evidence.mjs
node tools/oracle/expansion/build-data.mjs --check
node tools/oracle/expansion/build-daeun-golden.mjs --check
```

운영 결과·유료 결과를 새 값으로 갱신하거나 기존 스냅샷을 재생성하는 명령은 포함하지 않는다. 전체 전달/활성화와 해외·역사 시각계·음력 대운은 별도 승인 대상이다.
