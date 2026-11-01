# Phase 1: 격리 오라클 하네스

확인일: 2026-11-01. **Phase 1 구축 및 합성 입력 기동·계약 검사까지만 완료.** 정확도 인증, Phase 2 차분 검사, 운영 변경은 하지 않았다. [라이선스 원장](../../docs/engine-audit/01-license-ledger.md)을 먼저 읽는다.

## 실행 위치와 설치

동시 작업을 보존하기 위해 기존 감사 워크트리에서만 작성했다.

```text
D:\Development\code-destiny\.codex-worktrees\engine-audit-phase0-20261101-163440
```

Node 20 이상이 필요하다(검증 환경 버전은 원장 참조). 새 환경에서는 이 워크트리를 작업 디렉터리로 삼아 다음을 실행한다. 운영 루트에서 `npm install` 하지 않는다.

```powershell
npm --prefix tools/oracle ci --ignore-scripts --no-audit --no-fund
node tools/oracle/verify-licenses.mjs
```

`package-lock.json`의 정확한 버전·tarball integrity, `source-pins.json`의 소스 SHA를 함께 보존한다. 실행 전 검증기는 모든 잠금 항목의 SPDX와 설치된 메타데이터·라이선스를 직접 읽고, 불명확한 항목·금지 이름·격리 경로 이탈을 거절한다. 선택 의존성 미설치는 별도로 구분한다. 새 버전으로 바꿀 때는 사전 라이선스 검토와 설치 후 확인을 다시 수행한다.

Python은 시스템 패키지와 분리된 **Python 3.13** venv를 사용한다. 이번 환경의 설치 명령은 아래와 같다(`uv`는 환경 도구이며 운영 의존성이 아니다).

```powershell
uv venv tools/oracle-py/.venv --python C:/Users/user/AppData/Local/Programs/Python/Python313/python.exe --no-python-downloads
uv pip install --python tools/oracle-py/.venv/Scripts/python.exe --no-deps --require-hashes -r tools/oracle-py/requirements.txt
```

초기 설치에서는 PyPI wheel을 내려받아 SHA256, ZIP 내부 LICENSE/METADATA를 **설치 전에** 확인하고, 로컬 wheel만 `--no-index --find-links`로 설치했다. 같은 wheel의 해시는 requirements에 고정했다. `pip`·개발 extra·추가 패키지를 넣지 않는다. 러너는 venv 경로, 설치 패키지 집합, MIT 메타데이터와 LICENSE를 실행 전에 다시 확인한다. Linux에서는 venv의 `bin/python`을 사용한다. 이 환경에서 실제 확인한 플랫폼은 Windows x64다.

## CLI

입력은 UTF-8 JSON 객체 하나, 출력은 한 줄 JSON 하나다. 여러 입력은 프로세스를 각각 호출한다. 원격 서비스 폴백은 없다.

```powershell
Get-Content tools/oracle/fixtures/smoke.json -Raw | node tools/oracle/cli.mjs manseryeok
Get-Content tools/oracle/fixtures/smoke.json -Raw | node tools/oracle/cli.mjs lunar-javascript
Get-Content tools/oracle/fixtures/smoke.json -Raw | node tools/oracle/cli.mjs iztro
Get-Content tools/oracle/fixtures/smoke.json -Raw | node tools/oracle/cli.mjs grahan
Get-Content tools/oracle/fixtures/smoke.json -Raw | tools/oracle-py/.venv/Scripts/python.exe -I -X utf8 tools/oracle-py/runner.py

Get-Content tools/oracle/fixtures/smoke.json -Raw | node tools/oracle/service-runner.mjs saju
Get-Content tools/oracle/fixtures/smoke.json -Raw | node tools/oracle/service-runner.mjs ziwei
# 아래 호출은 차단 JSON만 반환한다. 서비스 모듈을 읽거나 실행하지 않는다.
Get-Content tools/oracle/fixtures/smoke.json -Raw | node tools/oracle/service-runner.mjs vedic
```

테스트:

```powershell
npm --prefix tools/oracle test
```

## 공통 입력과 출력

샘플은 실제 이용자 정보가 아닌 합성 입력이다.

```json
{
  "schemaVersion": 1,
  "calendar": "solar",
  "date": "1990-06-15",
  "leapMonth": false,
  "time": "12:30",
  "timeUnknown": false,
  "gender": "male",
  "place": { "timezone": "Asia/Seoul", "latitude": 37.5665, "longitude": 126.978 },
  "options": {},
  "referenceDate": "2026-11-01"
}
```

- `calendar`: `solar` 또는 `lunar`. 음력 연월일은 해당 제공자가 직접 변환한다. `leapMonth`는 음력에서만 true 허용.
- `date`: 1800–2300년의 `YYYY-MM-DD`. 이 범위는 입력 문법 한계이며 각 라이브러리의 보장 범위가 아니다. 잘못된 양력 날짜는 거절한다. 음력 날짜의 존재 여부는 제공자가 검증한다.
- `time`: 알려진 시각은 `HH:mm`; `timeUnknown:true`일 때 null 또는 생략. 시각 미상 사주 오라클은 달력만 반환하며 임의 정오 원국을 만들지 않는다.
- `gender`: `male`/`female`/`unknown`. 미상 대운은 null, 자미두수는 unsupported.
- `place`: IANA `timezone` 필수, 위경도 선택. Grahan은 위경도가 모두 필요하다. Node는 IANA 이름도 검증한다. Python은 Asia/Seoul만 지원하며 다른 시간대 문자열은 unsupported로 반환한다.
- `utcOffsetMinutes`: 선택. Grahan만 중복된 현지 시각 구별에 사용하며 IANA 실제 오프셋과 대조한다. 존재하지 않는 시각·선택되지 않은 중복 시각은 거절한다. 사주 KST 오라클 및 서비스 러너에서는 override를 거절한다. lunar-javascript/iztro는 현지 시계만 사용하고 시간대·좌표를 계산에 반영하지 않는다는 정책을 기록한다.
- `options`: 아래 제공자별 항목만 허용한다. 학파 기준을 자동으로 통일하거나 바꾸지 않는다.
- `referenceDate`: 비교 기준일. 생략 시 고정값 `2026-11-01`. 서비스의 현재 시각은 그날 UTC 자정, 호스트 TZ는 UTC로 고정한다. 외부 입력의 출생 시간대를 서비스 내부에 새로 주입하는 설정이 아니다.

출력 공통 필드: `schemaVersion`, `provider`, `version`, `status`, `input`, `policy`, `facts`, `school`, `limitations`. 서비스는 출처 파일 해시와 `raw` 원본도 보존한다. 정상은 `ok`, 부분 지원은 `partial`, 지원 불가는 `unsupported`, 금지 경로는 `blocked`; CLI 잘못된 입력/계산 실패는 `error`와 종료 코드 1이다. blocked/unsupported는 정상적으로 거절한 것이므로 종료 코드 0이며 호출자는 반드시 status를 검사해야 한다. 서비스/Python 오류 응답은 최소 `{schemaVersion,status,error}`다.

사주 `facts.pillars`는 연·월·일·시의 한자 2자 또는 null, `facts.calendar`는 양력 ISO 날짜와 `{year,month,day,leapMonth}` 음력으로 통일한다. 자미두수는 `facts.ziwei`, 베다는 `facts.vedic`. 대운·십신·궁별 세부 값은 의미 손실을 피하려고 **제공자 원래 하위 구조**를 보존한다. 따라서 이 단계 출력은 전체 필드 단순 동등 비교용 스키마가 아니다. Phase 2에서 학파·시간 기준을 분리한 필드 매핑이 추가로 필요하다. `facts`라는 이름 자체가 정답 인증을 뜻하지 않는다.

| 제공자 | 노출 옵션 / 기준 | 한계 |
|---|---|---|
| manseryeok 2.0.0 | `dayBoundary`: midnight 기본/jasi/splitJasi; `solarCorrection`: none 기본/local-mean/apparent | 보정 시 경도 필수, EoT·과거 DST 옵션을 라이브러리에 전달. Asia/Seoul만 지원. 내장 데이터와 실 KASI 검증은 별개 |
| lunar-javascript 1.7.7 | `sect`: 2 기본/1; `yunSect`: 1 기본/2 | 중국 음력, 원시 현지 시계. 한국 음력의 독립 정답으로 간주하지 않음 |
| iztro 2.6.3 | `yearDivide`: normal 기본/exact; `dayDivide`: forward 기본/current; `algorithm`: default 기본/zhongzhou; `fixLeap`: true 기본/false | 설치 타입 정의의 실제 옵션명. 0시=0, 23시=12, 나머지는 시진 인덱스. 중국 음력·보정 없는 시계. zh-CN 원명 보존 |
| korean-saju 0.3.0 | `yajaSiSeparated`: true 기본/false; 진태양시 보정은 라이브러리 기본으로 필수 | bundled 음력 범위 내만 지원(1900–2050 envelope, 실제 포함 여부 추가 확인). KASI 절기 2000–2027 밖은 라이브러리 Meeus fallback. 역대 KST/DST 대응 미확인. 격국·용신·강약·조후는 `school`에 보관 |
| @grahan/vedic 1.0.1 | `node`: mean 기본/true; Lahiri, whole-sign | 보조 검증기만. nakshatra 0부터, pada 1부터. **아야남사 계수는 Swiss 참조값으로 적합된 모델이며 독립 아야남사 oracle이 아님**. 런타임 Swiss 의존·호출은 없음. 문서의 정밀도 주장은 미검증 |

## 서비스 실행 경계

| 요청 | 상태 | 공개 진입점 / 사유 |
|---|---|---|
| saju | 허용 | `app/saju/animal-destiny/lib/sajuAdapter.ts::computeNatalFromInput` |
| ziwei | 허용 | `worker/lib/guardian-fortune/adapters/ziwei.js::buildZiweiAdapter`의 fusionExpert projection |
| vedic / nakshatra | 차단 | 공통 Swiss 브리지 연결 경로 |
| sukuyo | 차단 | 달 경도 계산이 Swiss 연결 경로. 음력 변환만으로 전체를 검증할 수 없음 |
| astrology / western | 차단 | 공통 Swiss 브리지 연결 경로 |
| tarot 등 | unsupported | 이번 명반 하네스에서 승인된 계산 진입점 없음 |

차단은 서비스 import/build **이전**에 일어난다. 사주·자미만 격리 esbuild로 메모리에 묶고 `service-source-pins.json`과 전체 import 파일 해시(LF 정규화)를 비교한다. 총 사주 23개, 자미 16개 파일을 검토했다. 파일/그래프가 달라지면 실행을 거절한다. 해시 자동 재생성 옵션은 제공하지 않는다.

서비스 모듈은 호스트에 import하지 않으며, Node 내장 모듈·외부 패키지·Swiss·결제 실행 경로는 resolver가 거절한다. 런타임에는 require/process/환경변수/파일 API가 없는 VM에서 공개 함수만 호출하고 fetch/타이머를 막는다. 잡아서 숨긴 fetch 실패도 호출 흔적으로 검출한다. 이는 **검토된 코드의 우발적 I/O 방지**이며 악성 코드를 다루는 보안 경계라는 주장은 하지 않는다.

사주 import 그래프의 pricing/billing 파일은 기존 정적 설정 참조다. PG 실행 모듈을 포함하지 않는다. `fetchSajuEngineResult`, `prefetchKasiContext`, 모든 도메인을 합쳐 가져오는 워커 인덱스는 호출하지 않는다. 사주 공개 진입점은 gender·출생지·timezone을 계산기에 전달하지 않으므로 이를 출력 한계에 명시한다. 임의로 내부 엔진을 직접 호출해 보완하지 않는다. 자미는 기존 birthPlace 전달 및 보정/폴백 정책을 그대로 사용한다. 저장 사용자 결과는 읽거나 재계산하지 않는다.

## 검증 수준과 다음 경계

하네스 테스트 21개: 재실행 동일 출력, 날짜/시간/옵션 거절, 음력 입력, 시각 미상, UTC 중복/틈 처리, Swiss 경로 차단, 서비스 그래프 변경·금지 import·I/O 실패 주입, 설치 라이선스 확인. 오라클 간 합의나 외부 정답에 맞는지 검사하지 않았다.

독립 베다 주 검증기는 확보되지 않았다. `ndastro-engine`은 전이 라이선스 허용 목록을 충족하지 않아 미설치, `orrery` upstream은 AGPL로 미설치다. Swiss 서비스 계산·KASI API·LLM·결제·운영 DB·스냅샷 재생성·Phase 2 대량 입력은 미실행이다. 다음 단계는 네오의 별도 승인 대상이다.
