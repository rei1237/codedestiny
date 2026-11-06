# CR-010 · 자미두수·타로 격리 검증과 운영 설치 경계

2026-11-07 KST. 최신 원격 main `f6b2ac09a`를 기존 타로 보완 워크트리에 통합했다. 새 경로는 Node 24만으로 실행한다. 운영 전체의 설치 검사는 현재 차단 결과가 기대값이다.

| 대상 | 실측 |
| --- | --- |
| 격리 워크플로 | `.github/workflows/engine-release-check.yml`. 별도 설치·PG·LLM·DB 없이 녹화된 자미/타로 사실을 검증한다. 독립 잡이며 기존 필수 CI 목록을 유지한다. |
| 자미두수 | 기존 `ziweiRelationshipClock` 구현을 같은 공개 API 뒤의 별도 래퍼로 옮겼다. 계산식과 적용 조건은 그대로다. UTC 정오의 공식 관측 3건에서 최대 차이 0.331416분. 기존 부호·1분 허용 오차·날짜/시진 경계 4개 단언을 보존했다. |
| 신규와 재개 | 2000년 공식 음력 명반과 1990년 기존 음력 명반을 mock 저장소에 준비한 후 OFF·기준 연도 변경에도 동일 명반을 읽었다. 타로의 최초 카드·방향·해석 digest가 OFF 상태의 상담에 전달됐고 변조된 상태를 거부했다. |
| 깨끗한 디렉터리 | 실행에 실제 사용한 소스 모듈 27개와 러너만 임시 디렉터리에 복사해 재실행했다. `node_modules`·외부 설치 0개. 패키지 및 네트워크 builtin import 거절도 실행 검증했다. |
| 설치 전 검사 | `tools/oracle/release-check/preflight.mjs`가 manifest와 npm lock의 직접/전이 의존성, 별칭·소스·라이선스·설치 스크립트 및 공개 자산 파일명을 확인한다. 복합 SPDX 표현은 자동 승인 대신 원문 검토 대상으로 분류한다. |
| CI 연결 | 워크플로 YAML 17개를 파싱했다. 직접 선언된 npm 설치 명령 18곳의 바로 앞에서 해당 프로젝트를 검사한다. 운영·스테이징·롤백도 포함한다. 변경은 이 로컬 브랜치에만 있다. |
| 전체 루트 | `sweph-wasm` 직접 선언 1개, 잠금 패키지 1개, 해당 자산 16경로, 라이선스 검토 57항목(14개 LGPL 포함), 설치 스크립트 검토 9항목. 57항목은 금지 라이선스 57종이라는 뜻이 아니다. `workers-og` 메타데이터 누락과 복합 표현도 포함한다. |
| 부수 프로젝트 | Toss 잠금 파일도 별도 검토가 필요하다. 에디션 도구에는 추적되는 잠금 파일이 없어 설치를 보류한다. 기존의 잠금 무시 설치를 이 경로에서 허용하지 않는다. |
| 남은 릴리스 조건 | 명반·저장 원문 reader 분리, 대체 공급자 또는 제품별 신규 구매 보류 정책, 루트/부수 프로젝트 의존성·잠금 정리, 정적 자산·CDN·Worker import 제거, 실제 깨끗한 설치본의 LICENSE·빌드 산출물·동적 실행 검증. 비상 롤백도 별도로 성공해야 한다. |

**독립 기준.** JPL Horizons DE441의 지구 경도 0°, 위도 0°, 고도 0에서 태양에 대한 겉보기 태양시(열 34)와 UT1−UTC(열 49)를 받아 고정했다. UTC 정오에서 균시차(분)는 `(겉보기 태양시[h] − 12) × 60 − (UT1−UTC)[s] / 60`이다. 세 관측 시각·값·재현 요청 URL은 `__tests__/fixtures/jpl-greenwich-solar-clock.mjs`에 있다. CI는 이 파일을 오프라인으로 읽는다. 천문 라이브러리를 새로 설치하지 않았다. [Horizons 열 정의](https://ssd.jpl.nasa.gov/horizons/manual.html)

**검증 명령**

```sh
node --test tools/oracle/release-check/preflight.test.mjs
node tools/oracle/release-check/preflight.mjs tools/oracle/release-check
node --experimental-transform-types tools/oracle/release-check/verify.mjs
node tools/oracle/release-check/preflight.mjs .
```

첫 세 명령은 통과했다. 마지막 명령은 전체 루트에 대해 의도대로 종료 코드 1을 반환했다. TypeScript 검사와 worker 미선언 변수 검사도 통과했다. 실제 배포 환경에서 npm을 설치하거나 GitHub Actions 워크플로를 dispatch하지 않았다. 사주·자미·타로의 기존 고객 결과와 결제 정책은 변경하지 않았다.

**운영 결정.** 금지 의존성을 패키지나 빌드에서 이름만 숨겨도 기본 Worker·정적 셸·일부 유료 상품에 실제 호출이 남는다. 준비되지 않은 가드를 main에 올리면 관련 CI·배포·롤백이 함께 중단된다. 전체 경로의 승격과 기존 타로 보완 `fdb4924ba`의 배포는 [CR-011](change-requests/CR-011.md)의 상품 범위와 검증된 공급자/구매 보류 조건을 먼저 해결해야 한다.
