# 천문 공급자 독립 검증

Node 24에서 프로젝트 루트를 기준으로 다음 순서로 실행한다. 설치는 이 폴더에 한정한다. 검증은 커밋된 천문 자료와 계산 결과를 읽고, 차이가 있으면 종료 코드 1을 반환한다.

```sh
node tools/oracle/release-check/preflight.mjs tools/oracle/ephemeris-candidate
npm ci --prefix tools/oracle/ephemeris-candidate --ignore-scripts --no-audit --no-fund
node tools/oracle/ephemeris-candidate/verify.mjs
node tools/oracle/ephemeris-candidate/verify-sky.mjs
node tools/oracle/ephemeris-candidate/verify-panchang.mjs
node tools/oracle/ephemeris-candidate/verify-houses.mjs
node tools/oracle/ephemeris-candidate/verify-extended-moon.mjs
```

첫 검증은 패키지 버전·소스 해시·라이선스와 10개 천체의 지심 좌표를 확인한다. 두 번째는 서비스의 태양·달 별자리 함수를 호출한다. 세 번째는 같은 달 경도에 두 가지 항성 기준을 적용해 공식 달력의 전환 시각을 대조한다. 모두 운영 엔트리포인트·고객 정보를 사용하지 않는다.

원자료를 갱신할 때만 `collect-horizons.mjs --refresh` 또는 `collect-panchang.mjs --refresh`를 이 디렉터리에서 명시적으로 실행한다. IMD 수집기는 Saka 1948년 자료 전용이다. 공개 사이트의 연도가 바뀌면 해당 연도의 자료를 확인하고 별도 표본을 추가한다. 결과 파일은 기본 실행으로 갱신되지 않는다. 변경한 원자료·경계 오차를 검토한 뒤에만 개별 검증기에 `--record`를 사용한다. [검증 결과와 적용 조건](../../../docs/engine-audit/32-ephemeris-provider-evaluation.md).
