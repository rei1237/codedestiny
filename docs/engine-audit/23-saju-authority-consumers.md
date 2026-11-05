# CR-008 판정의 상담 소비 경로 연결

status: done

요청: 신규 계산의 같은 명반·버전을 LLM 상담과 다른 운세에 전달하고 용신 후보·보류를 보존한다. 기본 OFF, Swiss 차단, 기존 저장·유료 원문 보존, PG·LLM·DB mock, push·배포 금지.

기준: `692080c4ebccd61968885573d3651bcc30527fc7`, 격리된 `codex/results-main-gyeokguk-20261102`. 다른 체크아웃과 미커밋 작업은 변경하지 않는다.

## 범위와 위험

- 명식 맞춤 상담: 기존 실행 생성 CAS에 판정 스냅샷을 함께 저장한다. 신규 실행만 서버 `SAJU_GYEOKGUK_AUTHORITY_V2 === "true"`에서 선택한다. 요청 본문의 판정 메타데이터로 활성화하지 않는다.
- 인생의 책·인생 총운: 기존 `llmMeta.factSnapshot`에 같은 판정을 저장하고 각 장 프롬프트에 전달한다. 원 엔진의 계산 결과를 래퍼에서 투영하며 엔진은 수정하지 않는다.
- 연이·네오 사주 유료 턴: 기존 paid narrative의 신규 seed에서만 선택하고 저장된 context를 재사용한다. 다른 체계의 턴은 전환하지 않는다.
- 초융합: 사주 어댑터/프롬프트의 스냅샷 전달 계약만 준비한다. Swiss 연결 전체 생성 경로의 플래그는 연결하지 않고 실행도 하지 않는다.
- 새 분석은 CR-008 `saju-gyeokguk-authority-v1` / `rok-yangin-strictjong-v1`을 그대로 소비한다. 후보/충돌/미평가/시각 미상을 보존한다. 단일 용신이나 기신 확정 규칙을 추가하지 않는다.
- 위험: 일부 장에 구 용신이 섞이거나 재개 시 버전이 바뀔 수 있다. 구 해석 필드를 새 판정으로 투영하고 해시·명반·판정 ID를 검증한다. 스냅샷 오류는 구 로직으로 폴백하지 않는다.
- 되돌림: 신규 선택 플래그 OFF. 기존 pin을 가진 진행 중 요청의 reader는 유지한다. 기존 완료본을 재생성·덮어쓰기하지 않는다.

## 유지 경계

`calculateLocalResult()`, 역법/6개 엔진 내부, KASI timezone, 결제 실행 파일, 가격/권한/차감 정책, DB 스키마, 운영 설정은 변경하지 않는다. 저장 데이터는 기존 Mixed 필드의 부가 메타데이터다. 결과 원문과 구매 증빙은 유지한다. 공개 URL·SEO·레이아웃 변화 없음.

이번 pin 경계는 서버의 **신규 생성 기록/seed**다. 결제 이전 준비 API 전체의 통합이나 별도 감사 브랜치 CR-001~006의 병합을 완료했다고 주장하지 않는다. 기준 역법은 현재 트리의 기존 계산을 사용한다. 다른 운세 체계를 사주 규칙으로 대체하지 않는다.

## 검증 기록

- 새 소비 경로 테스트는 허용 import 그래프를 검사한 뒤 메모리 번들/VM으로 실행한다. Swiss/DB/라우트 전체 import를 금지하고 초융합의 선택적 전체 계산 helper는 throw stub으로 차단한다.
- 실제 라우트 함수는 AST로 추출하고 DB·PG·LLM 경계를 mock으로 대체한다. 이 테스트를 운영 HTTP/실 PG/실 LLM/실 DB 검증이라고 세지 않는다.
- `node --test __tests__/ui/saju-authority-consumers.test.mjs __tests__/ui/life-book-paid-delivery.behavior.test.js`: **58/58 통과**. 변경 전 `692080c4e`와 24개 명반의 전체 OFF 프롬프트·인생 총운·사주 어댑터 JSON 동일. ON 판정/명반 ID와 후보 배열 일치, 시각 미상의 pending 유지, 위변조/교차 명반 거절.
- 실제 사주 handler를 mock 의존성과 실행: 신규 ON → 부분 생성 → OFF 재개 → 저장 → 재열람에서 같은 pin 유지. 원자적 생성 함수 16경합 중 1개만 획득, 낡은 lease 완료 저장 거절. 클라이언트가 보낸 가짜 pin은 선택 근거가 아님.
- 인생의 책·총운 handler: 이용권/구독/단건 3종 각각 8동시 시작 → OFF 재개 → 15개 장 중복 없이 완성, 차감 1회, 원문 재열람 시 쓰기·재생성 없음. 기존 pin 없는 세션은 ON 전환 뒤에도 legacy 유지. 저장 실패·응답 유실·환불/계정/locale 회귀 포함.
- 연이·네오 사주 paid seed와 formatter: 신규 사주에만 ON 전달, 저장 context OFF 재사용, 타 체계 전환 없음. 저장 orchestration은 mock 경계이며 실제 DB 트랜잭션 검증이 아님.
- `node --require ./tools/oracle/next-delivery/guard.cjs --test` 아래 8개 파일: **74/74 통과**: `saju-natal-core.test.mjs`, `saju-gyeokguk-claim-guard.test.mjs`, `paid-report-storage.behavior.test.js`, `saju-paid-delivery.behavior.test.js`, `ziwei-paid-resume.behavior.test.js`, `life-book-wake-recovery.behavior.test.js`, `guardian-paid-turn-recovery.test.js`, `ai-prompt-pass-recovery.behavior.test.js` (모두 `__tests__/ui/`).
- `node tools/oracle/gyeokguk/verify-authority.mjs`: 기존 CR-008 OFF 48개 동일, ON 48개 일관성, 명명 사례 26개, 변형 1,144개·잘못된 간지 1,144개 거절, 16요청/1삽입, I/O 시도 0. 독립 학파 정답 검증으로 세지 않음.
- `node node_modules/typescript/bin/tsc --noEmit`: 통과. 변경 worker 9개 파일 ESLint `--quiet`: 통과. `git diff --check`: 통과.
- `npm run verify:worker-no-undef`: 797개 파일 통과(기존 데드코드 예외 3건). `npm run verify:ai-prompt-billing-policy`, `npm run verify:no-nested-retry`: 통과.
- `npm run check:pre-push`: 첫 실행에서 사이트맵 원장 드리프트 검출. `npm run sitemap:generate`로 소스 서명 7개만 동기화(URL/날짜 변경 없음) 후 **재실행 통과**. fsmonitor IPC 경고는 있었으나 각 검사 종료 코드는 0, 저장소 위생 검사 통과.
- `npm run check:fast -- --plan`: critical. 전체 Node/Jest/worker build에 Swiss 연결 범위가 포함되므로 전체 실행은 보류하고 위 허용 경로만 실행. 이 범위 제한을 전체 CI 통과로 표기하지 않음.
- 초기 테스트 fixture의 누락된 mock(`clean`, `hasRepeatedReportPassage`)을 수정한 뒤 해당 전체 테스트를 재실행했다. 운영 코드에 검증 우회 조건은 추가하지 않았다.

## 변경 파일

| 파일 | 의도 |
| --- | --- |
| `worker/lib/saju-authority-consumer.js` | 동일 CR-008 투영·동결·digest/ID/명반 검증, 후보/보류 유지, 기존 raw 불변 |
| `worker/lib/saju-ai-prompt.js` | 고정 판정으로 신규 프롬프트 생성, 구 용신/격국 혼입 차단, 사실·표시 근거 ID 전달 |
| `worker/routes/fortune.js` | 신규 선택을 기존 원자적 생성 기록에 저장, OFF 재개 및 완료 저장 전달 |
| `worker/routes/life-book-ai.js` | 기존 factSnapshot으로 각 장 생성, pin 오류 시 구 판정 폴백 차단 |
| `worker/lib/guardian-fortune/adapters/saju.js` | 고정 명반 우선 사주 투영, 다른 엔진 실행 없음 |
| `worker/lib/guardian-fortune-context.js`, `guardian-fortune-prompt.js` | 사주 pin을 context와 프롬프트 허용 필드에 보존 |
| `worker/lib/guardian-paid-delivery.js` | 신규 사주 paid seed에만 서버 플래그 전달 |
| `worker/lib/fusion-fortune-prompt.js` | 사주 pin을 받은 경우만 구 성향 재판정 대신 후보/보류 전달 |
| `__tests__/ui/saju-authority-consumers.test.mjs`, `life-book-paid-delivery.behavior.test.js` | 격리 번들, 실제 함수 + mock 저장/결제/LLM 생명주기 회귀 |
| `docs/engine-audit/22-authority-consumer-rollout.md`, 이 문서 | 연결 범위와 미활성/차단 범위 구분 |
| `config/sitemap-lastmod.json` | 생성기 기준 소스 서명 7개 동기화, URL·날짜·색인 정책 유지 |

로컬 구현 커밋 `7b4ac41cc12030bb8604af4d0919f7f86d817e21`, 생성 메타데이터 커밋 `fd466db1c`. 검증용 `.tmp/gyeokguk-authority`만 정리했다. 다른 세션의 작업/산출물은 보존한다. 이 격리 브랜치의 로컬 변경이며 이번 작업에서 main 병합·원격 push·배포를 하지 않았다.

## 남은 적용 조건

운영 기본 OFF 및 push·배포 금지 유지. 실제 공급자의 응답 품질과 외부 연동, 전체 Next 브라우저에서 새 판정 소비 경로의 추가 검증은 이번 mock 계약 검증과 별도다. Swiss 연결 체계·베다 주 검증기·궁합 당사자별 pin 및 기타 사주 소비 경로는 아직 이 플래그로 전환하지 않는다.
