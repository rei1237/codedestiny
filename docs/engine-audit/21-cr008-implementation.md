# CR-008 구현·회귀 기록

status: done

## 승인과 경계

2026-11-02 사용자 승인: 격국·외격·용신을 같은 프로필로 연결, 신규 계산용 기본 OFF, 기존 저장·유료 결과 보존. push·배포 금지. 다른 미커밋 작업 보존.

작업 위치: `results-main-gyeokguk-20261102`, 기준 `276d112dcb85adcf0c392b6ab3c76858a4c42bce`. 기존 감사 브랜치를 암묵적으로 합치지 않는다. `calculateLocalResult`, 역법, 공통 natal-core 규칙, 결제 실행 파일은 수정하지 않는다.

## 구현 계획과 위험

- [x] 별도 공개 어댑터의 명시적 opt-in만 허용. 기존 호출 기본 OFF.
- [x] 공통 프로필의 격국·외격 상태와 용신 축/충돌을 함께 투영. 미평가 상신·병약이나 불명확한 단일 용신을 만들지 않는다.
- [x] 새 판정을 사용하는 보고서는 구 판정에 따른 직업·재물·운세 점수를 섞지 않는다. 계산되지 않은 영역은 미평가로 남긴다.
- [x] 신규 준비 시 전체 결과·입력·버전 고정. 재개는 저장된 snapshot만 사용하며 전환/재시도에 재계산하지 않는다.
- [x] OFF 이전 결과 깊은 비교, 외격 양성/음성/미상, 판정 ID 일치, 핀·동시 요청·되돌림, 기존 101건과 허용 회귀 실행.
- [x] 검증 후 로컬 커밋·보고. 운영 선택 OFF 유지.

회귀 위험: 격국 명칭만 교체하면 구 용신 및 구 점수가 새 명반의 판단처럼 제공될 수 있다. 새 경로는 공통 판정이 실제 산출한 내용만 제공한다. 동일 명반인데 해석 ID가 다름, 원문 변경, 핀 변조 허용, OFF 출력 변화는 실패다. 되돌림은 신규 선택 OFF이며 기존 pin/저장 결과를 재계산하지 않는다.

## 실측

### 구현 범위

- `localSajuCalculator.ts`: 선택 인자를 분리하고 ON인 경우에만 승인 어댑터의 분석/보고서로 분기한다. 역법·원국·대운 시작 계산은 그대로다. `sajuAdapter.ts` 전체와 `calculateLocalResult()`는 변경하지 않았다.
- `lib/saju/gyeokguk-authority.mjs`: 읽기 전용 공통 공개 래퍼 호출. 최종격, 월령 구조, 외격 전체 후보 pass/fail/unknown, 채택 ID, 미평가 외격, 억부·조후·격국·통관·병약 축을 보존한다. 생시 미상은 보류하며 가짜 시주를 채우지 않는다. 잘못된 간지 음양 짝은 거부한다.
- `gyeokguk-authority-copy.mjs`: 고객 결론·직업·재물·행동 해석을 i18n 키로 분리. 판정 규칙과 문장 템플릿을 분리하고 단정·수익 보장을 피한다. 이 엔진의 기존 출력처럼 한국어 콘텐츠 범위다.
- `approvedSajuAnalysis.ts`: 신규 계산, 준비, 재개, 프롬프트 사실 입력의 공개 경계. 준비 시점부터 명반 전체와 계산 버전을 고정한다. 원자적 `insertIfAbsent`를 호출자 저장소 계약으로 요구한다. SHA-256은 손상 검출용이며 계정 인증을 대신하지 않는다.
- 외격: 전왕 5종, 종재·종살·종아·종강·종왕, 가종재·가종살, 화기 5종의 기존 승인 규칙을 연결했다. 양신성상·가화·종세는 미평가로 남긴다. 새로운 학파 규칙을 추가하지 않았다.

**의도적인 범위 제한:** 공통 프로필은 단일 최종 용신을 자동 중재하지 않는다. 새 경로는 각 축의 후보와 충돌을 제공하고 `coreYongshin=null`로 둔다. 구 분석의 상신·병약·숫자 점수·사건 시기·관계 해석을 새 격국에 붙이지 않는다. 미평가 영역은 `not-evaluated`이고 0점이 아니다. 따라서 이 보고서를 완성된 종합 사주 상품 전체에 바로 대체 적용하면 안 된다. 기존 호출은 OFF여서 기존 보고서가 그대로 유지된다.

### 실행 결과

| 명령 / 범위 | 실측 |
| --- | --- |
| `node tools/oracle/gyeokguk/verify-authority.mjs` | OFF 48건 전체 JSON 기준 커밋과 일치, ON 48건 원국·역법 값 보존 및 판정 ID 일치 |
| 같은 러너의 구조 계약 | 명명 사례 26건, 유효 짝 변형 1,144건, 잘못된 간지 거부 1,144건, 생시 미상·가색 이설 보류 통과 |
| 같은 러너의 신규 준비/재개 | 동시 요청 16개 → 삽입 1회, 서로 다른 출생 입력 경합은 1개 성공/1개 거부, 응답 유실 후 재시도·OFF 전환·입력 변경·pin 변조·저장 장애·준비 중 인자 변경 통과 |
| 기존 저장 객체가 준비 저장소에 반환된 경우 | 재계산/쓰기 없이 거부, 원문 불변 |
| `node --require ./tools/oracle/next-delivery/guard.cjs --test __tests__/ui/saju-natal-core.test.mjs __tests__/ui/saju-gyeokguk-claim-guard.test.mjs __tests__/ui/paid-report-storage.behavior.test.js __tests__/ui/saju-paid-delivery.behavior.test.js __tests__/ui/ziwei-paid-resume.behavior.test.js` | 48 tests, 48 pass |
| 별도 감사 체크아웃에서 `node --require ./tools/oracle/next-delivery/guard.cjs --test __tests__/ui/calendar-authority-regression.test.mjs` | 5 tests pass: 공식 101 입력/1,109 필드, JPL 168 절입 경계, 24 음력 월 왕복, 추가 4건 등 |
| `node tools/oracle/next-delivery/verify-service-results.mjs` | 실제 Next 결과 화면 15개, 960px/390px, 결론 먼저·근거 접힘·저장 원문 해시 보존, 15/15 pass |
| `node node_modules/typescript/bin/tsc --noEmit` | exit 0 |
| 변경 TS/JS/MJS 대상 ESLint 및 `npm run lint` | exit 0 |
| `git -c core.fsmonitor=false diff --check` | exit 0 |

증거: [CR-008 회귀](results/cr008-regression.json), [동일 명반 오라클](results/cr008-same-pillars-oracle.json), [브라우저 회귀](results/cr008-browser-regression.json).

**101건의 위치 구분:** 공식 스냅샷 회귀는 `engine-audit-phase0-20261101-163440`(기준 `c6ec06f2f`)의 승인된 CR-001/002 구현을 읽기 전용으로 실행했다. CR-001~006을 현재 브랜치로 합쳤다는 의미가 아니며, 현재 main 통합본 전체가 그 101건의 새 역법을 사용한다는 의미도 아니다. CR-008의 현재 브랜치 OFF/ON 비교는 별도의 48건이다.

**브라우저 범위 구분:** 기존 저장 결과를 mock API로 전달하는 실제 Next 경로의 표시 회귀다. 신규 CR-008의 실 서비스 선택/LLM 생성/결제 생성 경로를 연결한 E2E 검증은 아니다. 최초 실행은 Chrome의 루프백 접근이 샌드박스에서 `ERR_NETWORK_ACCESS_DENIED`로 차단되었다. 외부 네트워크/Swiss 차단을 유지하고 로컬 실행 권한을 적용한 재실행이 통과했다. 실제 DB/PG/LLM 호출 없음.

### 독립 비교와 실패 분석

기존 격리 venv의 `korean-saju@0.3.0` MIT 원문과 메타데이터를 다시 읽고, 전이 의존성 없음(배포 패키지 1개)을 실행 시 확인했다. 신규 설치·운영 의존성 추가 없음. 라이선스 경로와 SHA는 위 oracle JSON에 있다. `same-pillars.py`로 기둥을 직접 생성해 시각 보정 차이 D를 제거했다.

- 27건: 정격 이름/외격 없음 일치 3건, 규칙·명명 차이 **B 후보 24건**, 역법 차이 D 없음. B는 개별 학파 판정이 더 필요하며 확정 버그 A로 올리지 않았다. 다수결로 서비스 프로필을 바꾸지 않았다.
- 주요 재현 `戊辰 丁巳 庚午 己卯`: ON 및 오라클 모두 편인격/외격 없음. 기존 OFF 전왕격은 그대로 보존했다. 승인 프로필 아래의 일치이며 보편 정답 주장 아님.
- 초기 확장 fixture의 가종재 기대값은 甲己 합화의 우선 조건을 놓쳤다. 화토 우선 사례와 가종재 사례를 분리했다. 화수·화화 양성 초안도 천간충 조건을 놓쳐 반례로 보존하고 양성 입력을 따로 작성했다. 공통 엔진 규칙은 바꾸지 않았다.
- 이전 합성 명반의 간지 불가능 조합 3건은 오라클이 거부했다. 새 회귀는 유효 간지로 교체하고 불가능 조합 거부를 별도 검증한다. 단일 필드 변형은 구조 검사이지 실존 출생 정보 표본이나 정확도 비율이 아니다.
- 최초 타입 검사에서 pin schema의 문자열 리터럴 타입 확장이 발견되어 payload 타입을 명시했다. 최종 타입 검사는 통과했다.

### 미실행·차단 및 후속

`check:fast -- --plan`은 critical을 선택했다. 전체 실행에는 Swiss 연결 전체 테스트/워커 빌드 및 결제 그래프가 포함되어 실행하지 않았다. 전체 프로덕션 빌드·CI·실 DB/PG/LLM·운영 승격은 미검증이다. 허용 모듈 번들과 실제 Next mock 경로 컴파일은 통과했다.

현재 production 호출부는 새 선택을 켜지 않는다. `prepare` 저장소 계약은 mock으로 검증했으며 실 DB 원자 쓰기나 결제 실행 파일에 연결하지 않았다. 다른 미커밋 작업, 인증/가격/이용권/월정석/단건 결제, KV/R2·DB 스키마, 저장/유료 결과, 960px 레이아웃은 수정하지 않았다. push·배포 없음.

2026-11-02 추가 요청인 **새 판정을 LLM 서비스와 기타 운세 결과에도 반영**하는 작업을 [후속 연결 계획](22-authority-consumer-rollout.md)에 등록했다. 전체 엔진 정확도 개선·운영 적용 완료를 의미하지 않는다.
