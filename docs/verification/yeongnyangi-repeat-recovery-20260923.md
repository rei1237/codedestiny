# 영냥이 새 상담 및 첫 챕터 이후 복구 검증

## 확인한 원인과 변경

- 같은 날짜·프로필·상품·입력으로 요청 ID를 만들던 구조 때문에 새 상담도 기존 결과에 합쳐졌다. 일반 상담·신점·질문 순간 상담에 상담 시작 단위 UUID를 추가했다. 응답이 불확실한 재시도는 같은 UUID를 유지하고, 요청이 확정된 뒤 다시 시작하면 새 UUID를 사용한다. 구 클라이언트의 요청 ID와 보관함 재열람은 유지한다.
- Worker가 챕터 작업을 선점한 뒤 강제 종료되면 실패 기록 함수에 도달하지 못한다. 이런 중단으로 시도 한도를 소진하면 기존 코드는 오류만 던지고 DB에는 생성 중 상태를 남겼다. 보관함 복구도 중단 상태를 찾지 못해 재개할 수 없었다. 만료된 작업의 한도를 원자적으로 확인해 복구 가능한 상태를 저장하고, 사용자가 이어가기를 누른 경우 같은 요청에서 기존 수동 복구 한도를 사용한다.
- 진행 중인 마지막 허용 시도는 다른 요청이 중단시키지 못하게 유지한다. 이전 실패 원인을 품질 재시도에 전달하며, 저장에 성공하면 해당 실패 정보를 비운다.
- 초기 결과 조회는 새 상담·기존 상담 모두 거치므로 “저장된 상담” 대신 “결제와 상담 준비 상태”를 확인한다고 안내한다.

## 검증 범위

- 수정 전 재현: 첫 장 저장 후 다음 장의 Worker가 3회 중단되면 상태가 GENERATING에 남는 테스트 실패. 마지막 허용 시도의 진행 중 요청에 중단 오류를 반환하는 테스트도 실패.
- 수정 후: 사주 고등어 5개 챕터에서 첫 장 보존 → 큐 또는 사용자 복구 → 나머지 4장 저장 → 같은 결제로 COMPLETED. 이미 저장된 장은 재생성하지 않는다.
- 5·8·11·15·18·28개 챕터 큐 완료·재열람, 환불 차단, 중복 선점 방지, 저장 후 재조회, 시도 상한을 검증했다.
- 일반·영감·프라슈나 모드에서 같은 입력의 새 구매 분리, 같은 시작 요청 재시도, 소유자 분리, 기존 결과 불변을 확인했다.
- `node scripts/verify-yeongnyangi-engines.mjs`: 6개 계산 체계와 28개 상품의 전체 챕터 계약 포함 35개 검사 통과.
- `npm run check:fast -- --plan`: critical 판정.
- `npm run check:fast`: lint·typecheck·결제 가드·Worker dry-run, Node 1,639개, Jest 4,137개 통과.
- 마지막 저장 메타데이터 수정 후 targeted Jest: repository·queue·retry 55개 통과.
- `node --test __tests__/ui/yeongnyangi-spirit-service.test.mjs __tests__/ui/yeongnyangi-paid-recovery-contract.test.mjs`: 9개 통과.
- `node scripts/verify-yeongnyangi-result-retry.mjs`: 390/1280px에서 같은 결제·첫 장 보존·중복 클릭 방지·완료 통과.
- `node scripts/verify-yeongnyangi-consultation-browser.mjs`: 360/390/430/1280px에서 재시도 UUID 유지·새 진입 UUID 분리·성공 후 뒤로 갔다 재진입·보관함 조회 통과.
- `node scripts/verify-yeongnyangi-spirit-ui.mjs`: 390/1280px 프라슈나 부분 재열람·완료·보관함 재열람과 무료 호라리 통과. 초기 실행은 로컬 최초 컴파일 및 부분 결과 대기에서 시간 초과했으며, 현재 서버와 동일한 구버전 목차로 fixture를 맞추고 마지막 전체 실행에서 4개 시나리오 모두 통과했다.
- Impeccable 변경 UI 정적 검사와 `git diff --check` 통과. 모든 브라우저 API·결제·LLM은 mock 경계 안에서 실행했다.

## 변경 파일

- `app/yeongnyangi/_components/{Consultation,SpiritConsultation,QuestionSkyConsultation}.tsx`: 새 상담과 재시도 구분.
- `app/yeongnyangi/_components/ReadingLoading.tsx`: 조회 단계 안내.
- `worker/yeongnyangi/{service.ts,repository.js}`: 요청 ID, 실패 원인 전달, 중단 상태 복구.
- `__tests__/ui/yeongnyangi-{spirit-service,paid-recovery-contract}.test.mjs`, `__tests__/worker/yeongnyangi-repository.test.js`: 회귀 재현 및 검증.
- `scripts/verify-yeongnyangi-{consultation-browser,spirit-ui}.mjs`: 화면 재시도·재진입과 현재 서버의 신점 목차 계약 검증.

## 정책 및 남은 확인

가격·Family/단건 결제 정책·인증·DB 스키마·환불 차단·자동 3회와 수동 2회 한도는 유지했다. 실제 결제·LLM·운영 DB 접근 및 운영 승격은 실행하지 않았다.

사용자가 알려준 상품은 사주 고등어다. 운영 공개 버전은 조사 시작 시 `a054b152e4b2026d7ef1ec8b376a404c11a71bf6`로 로컬 조사 기준과 같았다. 개별 상담 ID/오류 기록은 확보하지 못했으므로 해당 상담의 실제 최초 실패 원인을 확정한 것은 아니다. 실 LLM 응답 품질, 운영 큐 처리량, 실제 완료 시간은 mock 성공으로 입증할 수 없으며 운영 반영 후 별도 확인이 필요하다.
