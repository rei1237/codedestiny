# Phase 1 라이선스 원장과 하네스 검증 기록

> **기존 운영 Swiss 의존성은 해결되지 않았다.** Phase 0의 `sweph-wasm@2.6.9`, LGPL 포함 sharp 전이 의존성, workers-og 라이선스 미확인 경고는 그대로 유효하다. 이번에는 운영 의존성을 제거·교체하거나 실행하지 않았다. 베다·낙샤트라·숙요·서양점성술의 Swiss 연결 서비스 경로는 `blocked`로 남긴다.

- 확인일: **2026-11-01**. 범위: Phase 1 격리 설치·공개 어댑터 러너·기동/계약 검사. Phase 2 정확도 감사는 미착수.
- 상태: 하네스 로컬 검증 완료; main 전달은 기존 CI 실패로 보류. [사용 설명서](../../tools/oracle/README.md), [Phase 0](00-inventory.md).
- 작업 위치: `D:/Development/code-destiny/.codex-worktrees/engine-audit-phase0-20261101-163440`. 동시 작업 격리 예외를 적용한 기존 감사 워크트리를 계속 사용한다.
- 서비스 소스 기준: `20904183a1b0276584ed6f74313bf1e6cdeaf442`(origin/main). Phase 0 문서 커밋 `cf296ea9ab1b99a4230930a6b6d81f7069a22ea2`, `70f1d48e781124872e39abbf7276b4152f1dd0f5` 위에 추가했다. 사용자의 기존 `feat/world-cast-page` 작업은 보존했다.
- 환경: Windows x64, Node **v24.18.0**, Python **3.13.14**, uv **0.13.6**. Linux/macOS 및 다른 Python 버전은 미실행.

## 게이트 적용 결과

허용 SPDX는 MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC, CC0-1.0, Unlicense, 0BSD다. 외부 법적 의무를 판정하는 문서가 아니라 **사용자가 지정한 허용 목록의 준수 기록**이다. 소스·레지스트리의 광고 배지로만 판단하지 않았다.

Node는 설치 전 잠금 파일 37개 항목의 라이선스와 금지 이름을 점검한 후 `npm ci --ignore-scripts --no-audit --no-fund`를 실행했다. 설치 후 12개 package.json과 존재하는 LICENSE/LICENSE.md 11개를 직접 읽었다. 25개 타 플랫폼 선택 의존성은 **미설치**이며 잠금·레지스트리 메타데이터 MIT만 확인했다. 설치 패키지 모두 MIT, 새 GPL/AGPL/LGPL/Swiss 패키지는 없다. 루트 package.json/package-lock.json은 변경하지 않았다.

Python은 PyPI wheel 해시와 압축 내부 MIT LICENSE/License-Expression을 **설치 전에** 읽고, `--no-deps --no-index --require-hashes`로 로컬 wheel 하나만 venv에 설치했다. 설치 후 dist-info 원문을 다시 읽었다. 런타임 전이 의존성은 0개, 개발 extra는 설치하지 않았으며 venv에 pip도 넣지 않았다.

Node 잠금/원장 파일: [package-lock.json](../../tools/oracle/package-lock.json), [source-pins.json](../../tools/oracle/source-pins.json). 각 항목의 정확한 버전, 소스 URL/SHA, SHA512 tarball integrity를 기록했다. 실제 실행은 tarball integrity로 고정된 배포물이다. npm gitHead/태그/소스 스냅샷을 확인한 것이지 모든 npm 배포물과 소스의 재현 빌드 일치를 입증한 것은 아니다. 특히 lunar-lite는 버전 태그·npm gitHead가 없어 **package.json 0.2.8인 공식 저장소 스냅샷**을 참조 SHA로 고정했다.

## Node 설치 원장

아래 경로는 모두 `tools/oracle/` 기준이다. 확인일은 모든 행 2026-11-01. 정확한 SHA와 확인 방식은 source-pins에도 함께 저장했다.

| 패키지 | 버전 | SPDX | 직접 확인 경로 | 소스 SHA |
|---|---|---|---|---|
| @babel/runtime | 7.29.10 | MIT | `node_modules/@babel/runtime/package.json`; `node_modules/@babel/runtime/LICENSE` | `ffc2562036c8de34981523d74a88ea0c712d2662` |
| @esbuild/win32-x64 | 0.25.12 | MIT | `node_modules/@esbuild/win32-x64/package.json`; 루트 LICENSE 없음(메타데이터 확인) | `208f539945b145e7c9d6d844290f81c3fe5af320` |
| @grahan/core | 1.0.1 | MIT | `node_modules/@grahan/core/package.json`; `node_modules/@grahan/core/LICENSE` | `7f3e21f3461759943533c56efe84470ff8af9b6f` |
| @grahan/vedic | 1.0.1 | MIT | `node_modules/@grahan/vedic/package.json`; `node_modules/@grahan/vedic/LICENSE` | `7f3e21f3461759943533c56efe84470ff8af9b6f` |
| dayjs | 1.11.23 | MIT | `node_modules/dayjs/package.json`; `node_modules/dayjs/LICENSE` | `4549b8d03307891143e8a50d39fcdab1f16f77cf` |
| esbuild | 0.25.12 | MIT | `node_modules/esbuild/package.json`; `node_modules/esbuild/LICENSE.md` | `208f539945b145e7c9d6d844290f81c3fe5af320` |
| i18next | 23.16.8 | MIT | `node_modules/i18next/package.json`; `node_modules/i18next/LICENSE` | `8e600662ca3d4ebb0c734421502ec30b6280c16b` |
| iztro | 2.6.3 | MIT | `node_modules/iztro/package.json`; `node_modules/iztro/LICENSE` | `f24f2d9f21c37a3d48aa06c76d73372e4cc9bc94` |
| lunar-javascript | 1.7.7 | MIT | `node_modules/lunar-javascript/package.json`; `node_modules/lunar-javascript/LICENSE` | `eecd5d12c8221b82ce574dc2bad2d7aefcb46e56` |
| lunar-lite | 0.2.8 | MIT | `node_modules/lunar-lite/package.json`; `node_modules/lunar-lite/LICENSE` | `1d104fffa31609e9f112898cc57545827e8d57ae` |
| lunar-typescript | 1.8.6 | MIT | `node_modules/lunar-typescript/package.json`; `node_modules/lunar-typescript/LICENSE` | `a376ec2b8fd1b3069e24c92801bab8707fccd49d` |
| manseryeok | 2.0.0 | MIT | `node_modules/manseryeok/package.json`; `node_modules/manseryeok/LICENSE` | `fba3253d7305b8b61189bd78318a7a27ed8c9b09` |

직접 의존성은 manseryeok, lunar-javascript, iztro, @grahan/vedic 네 개이며 esbuild는 서비스 공개 인터페이스의 읽기 전용 번들 도구다. iztro → lunar-lite/lunar-typescript, i18next/@babel/runtime, dayjs 등의 전이 그래프는 잠금 파일에 고정했다. `@esbuild/win32-x64`는 패키지 루트 LICENSE가 없지만 설치 package.json의 MIT를 직접 확인한 **메타데이터 근거**이며, 원문 라이선스 파일 확인과 구분한다. 다른 플랫폼 binary 25개는 실제 설치 확인 대상이 아니다.

## Python 설치 원장

| 패키지 | 버전 | SPDX | 설치 후 직접 확인 경로 | 전이 의존성 | 확인일 |
|---|---|---|---|---|---|
| korean-saju | 0.3.0 | MIT | `tools/oracle-py/.venv/Lib/site-packages/korean_saju-0.3.0.dist-info/METADATA`, `licenses/LICENSE` | 런타임 0개, dev extra 미설치 | 2026-11-01 |

- 정확한 wheel: `korean_saju-0.3.0-py3-none-any.whl`.
- SHA256: `8940b141a50c5931b6cc026a73c3a755802a64ac7d9cf2c5d9ac348a2984c52c`.
- 공식 소스 SHA: `8c81256db10d3179d31f551beacaa69f2ab2fcc5` ([source](https://github.com/glee1228/korean_saju/tree/8c81256db10d3179d31f551beacaa69f2ab2fcc5)). v0.3.0 태그는 찾지 못했다. 이 SHA의 소스 ZIP과 wheel의 **Python 파일 44개**를 줄끝 정규화 후 비교하여 일치 확인했다. 데이터 파일 전체의 소스 등가성·재현 빌드는 미확인.
- [requirements.txt](../../tools/oracle-py/requirements.txt), [source-pin.json](../../tools/oracle-py/source-pin.json)으로 버전·wheel 해시·SHA 고정. [PyPI 해당 버전 메타데이터](https://pypi.org/pypi/korean-saju/0.3.0/json).
- 운영 root node_modules와 Python 시스템 site-packages를 사용하지 않는다. uv/Python은 기존 환경 도구이며 서비스 번들 또는 oracle 런타임 dependency로 추가하지 않았다.

## 후보별 채택·차단 사유

| 후보 | 결정 | 직접 확인 근거 / 확인 수준 |
|---|---|---|
| manseryeok 2.0.0 | 설치·기동 확인 | 설치 MIT 원문, 버전 태그 peeled SHA. 내장 음력/절기 API 호출 결과의 JSON 형태만 확인; 실 KASI 정답 검증 아님 |
| lunar-javascript 1.7.7 | 설치·기동 확인 | 설치 MIT 원문, npm gitHead. 한국 달력과의 정책 차이 보존 |
| iztro 2.6.3 | 설치·기동 확인 | 설치 MIT 원문, npm gitHead, 설치 타입/구현에서 astro.config와 bySolar/byLunar 옵션 확인 |
| korean-saju 0.3.0 | 설치·기동 확인 | wheel/설치 MIT 원문과 44 Python 소스 일치. 격국·용신 결과를 school로 분리, 정답 확정 아님 |
| @grahan/vedic 1.0.1 | **보조만 설치·기동 확인** | 설치 MIT 원문, @grahan/core도 MIT. 후보 프롬프트의 v0.x와 달리 확인 버전은 1.0.1. 독립 주 검증기로 승격하지 않음 |
| upstream rath/orrery | **금지·미설치·미실행** | 확인 SHA `dced6958abc502dba1d6431e62bcfb271eb86aee`의 package.json `AGPL-3.0-only`, LICENSE AGPLv3. [고정 소스](https://github.com/rath/orrery/tree/dced6958abc502dba1d6431e62bcfb271eb86aee). romantic-coding 포크 미사용. npm의 동명 0.0.0 패키지는 동일 upstream으로 취급하지 않음 |
| ndastro-engine 0.28.1 | **전이 게이트 차단·미설치·미실행** | 자체 MIT이나 `skyfield>=1.53,<2` → certifi, numpy 등. [Skyfield 1.55 메타데이터](https://pypi.org/pypi/skyfield/1.55/json), [ndastro 0.28.1](https://pypi.org/pypi/ndastro-engine/0.28.1/json) |
| certifi 2026.10.23 | 허용 목록 밖 | 공식 [PyPI 메타데이터](https://pypi.org/pypi/certifi/2026.10.23/json)의 `MPL-2.0`; 미설치. 금지 GPL과 동일하다는 뜻이 아니라 사용자 허용 목록 밖이라는 뜻 |
| numpy 2.5.4 | 허용 목록 밖 성분 | 공식 [PyPI 메타데이터](https://pypi.org/pypi/numpy/2.5.4/json)의 `BSD-3-Clause AND 0BSD AND MIT AND Zlib AND CC0-1.0`에 Zlib 포함. 미설치. 다른 버전/플랫폼 wheel 전체를 검토한 것은 아니며 numpy 모든 버전 불가로 일반화하지 않음 |
| x-iztro 0.6.1 | 보류·미설치 | 레지스트리 MIT 메타데이터만 확인, 실제 설치 LICENSE·바이너리 구성 미확인. iztro 계열 포팅을 독립 표로 추가해 다수결하는 것을 피함 |
| Swiss Ephemeris 및 wrapper | 설치·실행 대상 제외 | 운영에 이미 존재하는 sweph-wasm도 실행하지 않음. 별도 상용 라이선스 확보 여부 미확인 |

**Grahan의 독립성 한계:** 설치 파일 `tools/oracle/node_modules/@grahan/vedic/dist/ayanamsa.d.ts`는 Lahiri 계수를 Swiss Ephemeris 2.10의 1900–2100년 41개 epoch 참조값에 적합했다고 명시한다. 이 주석을 직접 확인했으나 잔차/정밀도 수치 자체는 재현하지 않았다. 런타임은 순수 TS 및 MIT @grahan/core만 의존하며 Swiss wrapper가 아니다. upstream fixture 생성 스크립트나 Swiss 자체는 설치·실행하지 않았다. 출력 `limitations`와 `policy.role=auxiliary-only`에도 기록했다. 따라서 **베다 독립 주 검증기는 아직 확보되지 않은 차단 항목**이다. JPL DE441 데이터의 다운로드·라이선스도 미검토/미실행이다.

## 서비스 경계 및 검사 근거

- 사주 공개 함수: `app/saju/animal-destiny/lib/sajuAdapter.ts::computeNatalFromInput`. `calculateLocalResult()` 수정 없음. KASI prefetch 호출 없음, timezone 추가/주입 없음. 현재 공개 함수가 계산기에 전달하지 않는 gender/위경도/timezone을 대신 내부로 주입하지 않는다.
- 자미 공개 함수: `worker/lib/guardian-fortune/adapters/ziwei.js::buildZiweiAdapter`에 `fusionExpert:true`. 출력은 해당 어댑터의 투영 범위이며 엔진 전체 응답이라고 주장하지 않는다.
- 사주 23개/자미 16개 import 파일을 읽기 전용 분석하고 LF 정규화 SHA256을 [service-source-pins.json](../../tools/oracle/service-source-pins.json)에 고정했다. Node 내장/외부 import 및 Swiss 경로는 거부, 일치한 그래프만 VM에서 실행. 운영 코드 수정이나 파일 생성 번들은 없다.
- 정적 가격/정책 상수가 기존 사주 import 그래프에 포함되어 있지만 결제 실행 코드나 PG 호출은 없다. `process`, `require`, 네트워크, 파일 API를 서비스 VM에 제공하지 않는다. 호스트 네트워크 호출도 차단한다. 이 격리는 검토 코드의 우발적 I/O 방지이며 적대적 코드 보안 보장은 아니다.
- `vedic`, `nakshatra`, `sukuyo`, `astrology`, `western`은 import/build 앞에서 즉시 `blocked/SWISS_CONNECTED_SERVICE_PATH`. 호출 실패 시 운영 경로나 다른 엔진으로 폴백하지 않는다.
- 기존 운영 package.json/lock, 6개 엔진, 어댑터, 결제·인증·API·DB·KV/R2·저장 결과, 960px 레이아웃/i18n 모두 미변경. 새 CLI 문구는 개발 도구 내부이며 사용자 화면에 노출되지 않는다. 공개 URL/SEO 영향 없음.

## 검증 및 전달 기록

| 명령/검사 | 결과와 범위 |
|---|---|
| `node tools/oracle/verify-licenses.mjs` | 통과: 설치 12개 MIT, 37개 잠금 항목, 미설치 선택 25개 구분 |
| `npm --prefix tools/oracle test` | **21/21 통과**. 합성 입력 기동·스키마·반복 결정성·옵션·음력·시각 미상, UTC gap/fold, 금지 서비스/import/네트워크/라이선스 실패 주입 |
| Python 격리 CLI | 0.3.0 로드, facts 및 school 직렬화 확인. 21개 테스트에 Python 프로세스 검사 포함 |
| `node scripts/verify-doc-freshness.mjs` | 통과. 기존 활성 문서의 신선도 검사이며 오라클 정답 검증은 아님 |
| `node --check` (하네스 mjs 7개), 알 수 없는 provider 거절 검사 | 통과. CLI 제공자 이름은 자체 허용 목록만 허용 |
| `git diff --cached --check`, 변경 경로 점검 | 통과. Phase 1 추가 파일은 docs 1개 및 격리 tools 18개뿐이며 운영 파일 변경 없음 |
| `npm run check:pre-push` | 구현 커밋 `aace915b9fd7a4d27c225bd580d53ba31bb9f844`에서 통과: home registry, public mirror, sitemap 1037 URL, llms 문서, SEO registry. 검사 후 추적 파일 변경 없음. 엔진 정확도 테스트 아님 |
| `npm run check:fast -- --plan` | 실행 완료. 새 tools 경로와 격리 lockfile을 미분류/critical로 판단하여 전체 test:node/test:jest, 워커 빌드 등을 선택 |
| `npm run check:fast` | **미실행**. 계획에 Swiss 연결 서비스 테스트가 포함되므로 사용자 실행 금지와 충돌. `__tests__/lib/vedicSwissChart.test.js`, `__tests__/worker/astro-basic-deep.test.js` 등은 mock 여부와 무관하게 이번 서비스 실행 허용 목록 밖. 검사기 분류나 게이트를 수정하지 않음 |
| 전체 lint/typecheck/build/기존 엔진 회귀 | 미실행, 통과로 주장하지 않음. 운영 변경이 없는 도구 단계이며 전체 엔진 실행 승인이 아님 |
| Phase 2 대량 샘플·오라클 간 정답 비교 | **미실행**. 21개 테스트는 정확도 판정/결함 개수 증거가 아님 |

main 기존 실패: `20904183a1b0276584ed6f74313bf1e6cdeaf442`, [CI run 41284797775](https://github.com/rei1237/codedestiny/actions/runs/41284797775). Static guards의 기존 `__tests__/ui/fortune-tea-house-recovery.behavior.test.js`에서 requestPayload null 관련 실패가 확인되어 다른 작업 위에 push를 쌓지 않는다. 종료 전 `gh run list --repo rei1237/codedestiny --workflow pr-ci.yml --branch main -L 1 --json status,conclusion,headSha,url` 한 번 확인에서도 같은 completed/failure였다. 하네스 작업으로 해당 테스트를 수정하지 않았다. 미통합 워크트리는 설치물과 함께 보존한다. Phase 1 완료는 로컬 하네스에 한정하며 공식 main CI 통과·배포 완료를 뜻하지 않는다.
