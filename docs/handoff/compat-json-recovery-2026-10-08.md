---
status: done
updated: 2026-10-08
next: 개발 코드와 가격 회귀의 CI required 통과를 확인했다. 운영 배포와 저장 원문 복원은 별도 명시적 승인 후 재개한다.
---

# 궁합 3/4 및 공통 LLM JSON 구조 복구

## 전달 상태

- 작업 디렉터리: `D:\Development\code-destiny`
- 마지막 코드 커밋: `b31032697ff4dd0360fde97429a962492a5b55db` — main 커밋·푸시 완료.
- 주요 구현 커밋: `3aca7cef2c7e5408cff2f72fa56ada1f9e342eaf`, `792f9d1d7` 및 마지막 원문 보존 보강.
- PR 없음. 작업 워크트리 `compat-delivery-20261007-235835`, node_modules 정션, 작업 브랜치와 임시 진단 파일·로그는 모두 정리했다. main의 node_modules와 다른 세션 파일은 보존했다.
- 이전 전달 시 main은 `b13097450d2b70afcbf386f0c4ccd1f4e3b1bac8`이며 위 코드 커밋을 포함한다. 다른 세션의 `d05663147` 병합이 진행 중이고 index.html·다국어 미러·sitemap 설정 등에 충돌이 있다. 이를 임의로 abort/reset/restore하거나 대신 확정하지 않는다.
- 재개 확인: 진행 중인 MERGE_HEAD와 미해결 충돌은 없다. d05663147 자체는 main 조상이 아니므로 병합 완료로 기록하지 않는다. main에는 가격 표시 수정 42ecc7b12 및 회귀 테스트 수정 13db6be3c가 포함돼 있다. 다른 세션 파일은 보존한다.

## 확인된 원인과 기존 이용 증빙

- 상품: `compat-saju-compatibility`
- 실행: `paid-narrative:90b2d889f569d27556e4a687db5b2af4f8a874a9a8c22ed2fcf14bb03472c556`
- 운영 DB 읽기 전용 검사 당시 pending, core/reasons/practice 저장 완료. 시도 기록은 1/2/1/2였다.
- 마지막 rawResponses.pastLife 원문 1,447자에 story/prescription/questions가 존재하지만 pastLife.crossReadings 아래에 잘못 중첩돼 있었다. 세 필드가 없다고 판정되어 검수 대기하고, 기존 cron은 검수 대기를 제외했다.
- 같은 이용자의 해당 상품에 연결된 PointHistory kind=deduct, delta=0 기록을 확인했다. 기존 isPaidResultRevoked 조회는 false였다. PG 실조회는 하지 않았다. 운영 복구 시 환불/접근 회수 상태를 다시 확인해야 한다.
- 보관 원문을 로컬 정규화하면 missing=[] 및 complete=true임을 확인했다. 운영 DB 쓰기나 실제 4/4 복구를 수행했다는 뜻이 아니다.

## 구현

- 공통 json-text-repair와 gemini 경로에 명시적 스키마 기반 위치 보정, JSON 코드펜스·제어문자 복구를 추가했다. 목적지/출처가 유일하고 타입이 맞을 때만 옮기며, 기존 값·다른 배열 항목·계산 근거는 덮어쓰거나 만들어내지 않는다.
- 궁합, 영냥이, 찻집, 네오, 타로, 자미두수, 베다, 나크샤트라, 숙요 궁합, 인생의 책 등 JSON 출력 호출에 기존 출력 예시/필드 정의를 이용한 responseSchema를 연결했다. 일반 텍스트 출력은 유지한다.
- 궁합의 보관 원문 복구 어댑터와 서버 savedOnly 복구를 추가했다. 기존 소유자·환불·잠금 검사를 유지하고 완료 항목, 시도 횟수, 원문 기록을 보존한다. savedOnly는 LLM 호출·환불 실행을 하지 않는다.
- 검수 상태의 해당 궁합 실행은 기존 24시간 cron 조회 창 안에서 저장 원문만 한 번 복구한다. 실패 시 시도 한도를 초기화하지 않는다. 저장 장애/중단 시 복구 전용 상태를 보존하며, 완료 상태와 검수 해제는 함께 저장한다.
- 잘림 복구가 이어져도 최초 rawText를 보존한다. 결제 정책·가격·인증·DB 스키마는 이 작업에서 변경하지 않았다.

## 검증과 차단

- 최신 main 통합 후 관련 Jest 8 suites / 129 tests 통과. 마지막 원문 보존 보강의 gemini-json-contract 5 tests 통과.
- npm run typecheck, npm run verify:worker-no-undef, npm run verify:ai-consultation-flows 통과.
- check:fast는 88개 묶음 중 87개 통과 후 문자열 lifeFortune을 외부 변수로 오인하는 정적 검사에서 중단됐다. 기존 isLifeFortuneInput 함수를 재사용했고, 실패했던 ai-consultation-flows를 재실행해 통과했다. 전체 check:fast 재완료라고 보고하지 않는다.
- 코드 SHA CI: https://github.com/rei1237/codedestiny/actions/runs/37648264010 — 핵심 검사, 타입·린트, Pages·Worker 빌드 성공. 정적 검사/CI required는 다른 가격 변경과 홈 표시의 24곳 불일치로 실패.
- 가격 표시 수정 포함 최신 main CI: https://github.com/rei1237/codedestiny/actions/runs/37649180020 — 홈 서비스 검색/가격 관련 구형 기대값 테스트 3개 실패. 전체 CI 성공은 아직 확인하지 못했다.
- 이 작업의 운영 배포, 실 LLM, 결제/환불, 운영 DB 쓰기는 실행하지 않았다.

## 2026-10-08 재개 검증

- 확인 기준 main: `184d373b6d52ceddd83eef89cfb737d46fb540f8`. `b31032697ff4dd0360fde97429a962492a5b55db` 포함을 조상 검사로 확인했다.
- `node --test __tests__/ui/home-service-finder.test.js __tests__/ui/mobile-pricing-source.static.test.js`: 34 tests, 34 pass, 0 fail. 이전 가격 기대값으로 실패한 3개를 포함한다.
- `npm run verify:home-service-registry`: 통과. 레지스트리 57개, 결제 타일 31개, 상세 문안 57/57, 질문 카드 가격 37곳, 패널 8개 대조.
- 가격 테스트 수정 CI: https://github.com/rei1237/codedestiny/actions/runs/37650520852 — 전체 lane 및 CI required 성공.
- 최신 문서 main CI: https://github.com/rei1237/codedestiny/actions/runs/37651243293 — 문서 작성 시 정적 검사 진행 중. 문서 push 이후의 최종 main CI 결과는 전달 응답에서 보고한다.
- 문서 검증: npm run check:fast -- --plan, npm run check:fast, npm run verify:handoff-contract 통과(170개 문서 계약 확인).
- 이번 재개는 인수인계 문서만 갱신한다. 소스·결제 정책·인증·API·DB 스키마를 변경하지 않았다. 운영 배포·원본 복원·유료 호출은 수행하지 않았다.

## 다음 행동

1. 개발 전달 확인 완료: 진행 중 병합·충돌 없음, 복구 코드 포함, 가격 회귀 34개 및 코드 CI required 성공. d05663147을 임의 병합하지 않았다.
2. 이 문서는 개발 작업 완료(status: done) 기록이다. 운영 복구 완료를 뜻하지 않는다. 문서만 별도 커밋·push하고 최종 main CI를 확인한다.
3. CLAUDE.md 53/76행의 별도 승인 규칙에 따라 운영 승격과 저장 원문 복원 승인을 받은 뒤 진행한다. 승인 없이 운영 작업을 시작하지 않는다.
4. 승인된 배포 후에는 기존 소유 계정의 `/api/saju-compat-basic/generate` 복구 경로에 `{resumeResultId: 실행키}`를 사용하거나, 24시간 조회 창 내라면 savedOnly cron 복구를 확인한다. 추가 결제·전체 재생성·시도 횟수 초기화를 하지 않는다. 24시간 경과 시 자동 cron 복구를 약속하지 않는다.
5. 실제 저장 4/4, 완료본 재열람, 원래 세 항목과 시도·원문 보존, 추가 LLM 호출 없음까지 운영 증거로 확인한다.

재개 지시:

```text
D:\Development\code-destiny에서 D:\Development\code-destiny\docs\handoff\compat-json-recovery-2026-10-08.md를 읽고 이어서 진행하세요. 마지막 코드 커밋은 b31032697ff4dd0360fde97429a962492a5b55db이며 원격 main에 포함되어 있습니다. 개발 코드와 홈 가격 회귀 검증은 완료됐습니다. 먼저 운영 승격·저장 원문 복원에 대한 명시적 승인 여부를 확인하세요. 승인 후 현재 환불/접근 회수 상태를 재확인하고 기존 저장 원문만 복구하세요. 운영 승격·DB 복원·유료 호출은 별도 승인 전 실행하지 마세요.
```
