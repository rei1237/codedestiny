# 영냥이 상담 작업 큐 연결

## 구현과 활성화 경계

결제 확정은 상담 ID를 큐로 보내고, 소비자는 서버 스냅샷과 결제 증명을 다시 읽어 다음 미저장 챕터 하나를 처리한다. 챕터 저장·재조회 후 다음 메시지를 보낸다. 소비자 실행 중 브라우저는 필요하지 않다. 기존 10분 복구는 등록 실패·메시지 유실을 복구한다.

2026-09-23 사용자 승인으로 `yeongnyangi-consultation-staging`과 `yeongnyangi-consultation-production`을 생성했다. 두 환경의 정본 Wrangler 설정에 생산자·소비자를 포함하여 공식 릴리스가 바인딩을 유지한다. 큐 생성만으로 운영 활성화가 완료된 것은 아니며 Worker 릴리스 후 소비자 연결을 확인한다.

오프라인 설정 생성기는 큐가 없는 설정을 검토할 때만 사용한다. 이미 큐가 있는 현재 정본에는 중복 적용하지 않는다. 환경별 큐 이름 분리와 배치·동시성 제한은 config parity와 큐 회귀 검사로 검증한다.

## 제한과 복구

- 메시지에는 `requestId`만 포함한다. 원문 질문·출생정보·토큰은 큐와 로그에 넣지 않는다.
- 배치 1, 동시 소비자 2. 챕터별 90초 provider 제한과 DB 저장 여유를 유지한다.
- 챕터 호출은 자동 3회까지, 30초·120초 대기한다. 사용자 명시 복구는 현재 미생성 챕터에 1회씩 최대 2회만 추가하며, 기존 시도 횟수는 초기화하지 않는다. 따라서 provider 호출 상한은 챕터당 5회다.
- 큐 재전달은 최대 5회다. 이후에도 DB의 미완료 주문이 주기 복구의 근거이며, 자동 중단된 상담은 재등록하지 않는다.
- 중복 메시지·결제 콜백·새로고침은 동일 주문·챕터 잠금을 사용한다. 저장된 챕터를 덮어쓰지 않는다.
- 큐가 생성된 뒤에만 실제 연결·재전달·최장 상담의 완료 시간·실기기 이탈을 검증한다. 현재 mock 결과를 운영 검증으로 취급하지 않는다.

## 관측

`[yeongnyangi-queue]`의 상담 ID·저장 챕터 수·오류 코드와 `[yeongnyangi-recovery]`의 집계만 사용한다. `AUTOMATIC_RECOVERY_STOPPED`는 사용자 복구 가능 상태이고 `GENERATION_REVIEW_REQUIRED`는 총 예산 소진으로 추가 확인이 필요한 상태다. 2026-09-23 운영 로그에서 결과 조회 MongoDB operation timeout 및 첫 챕터 quality 단계 INVALID_EVIDENCE 3회를 확인했다. 근거 스키마를 Gemini responseSchema에 전달하고, 유효한 소절 인용의 합집합을 결과 인용 목록으로 정규화한다. 알 수 없는 인용은 계속 거부한다. 마지막 실패의 code/stage/at는 lastFailure로 보존한다.

상태 전이는 `CREATED → PAID → GENERATING → PAID(다음 챕터)`를 반복하고, 마지막 챕터의 저장본·결제 증명을 같은 트랜잭션에서 다시 읽은 뒤에만 `COMPLETED`로 닫는다. 일시 실패는 `FORTUNE_FAILED`에서 backoff 후 재개하고, 자동 3회 소진은 `AUTOMATIC_RECOVERY_STOPPED`, 사용자 추가 2회 소진·불변 manifest 오류·저장 내용 검수 실패는 `GENERATION_REVIEW_REQUIRED`로 보낸다. 환불·취소·권한 중지는 `REFUNDED` 또는 `PAYMENT_NOT_ACTIVE`로 차단한다. 큐 claim은 `queue`/`scheduled`, 명시 복구는 `user`, 운영자 승인은 `operator`로 `recoveryAudit`에 구분한다.

## 수동 복구

결제·환불 상태를 확인한 자동 중단 건만 `scripts/recover-yeongnyangi-request.mjs --db <database> --request <id> --resume-stop --reason <incident> --operator <name>`로 사전 점검한다. dry-run 은 시도·부여·보류 사유·최근 실패 코드를 식별자와 숫자만으로 보여 주고, `--apply` 는 적용 전 상태(장 본문은 sha256 만)를 임시 폴더(`--out-dir` 로 변경)에 먼저 기록한 뒤 감사 기록에 운영자를 남긴다. 승인된 적용에만 `--apply`를 추가한다. 이 모드는 현재 챕터에 사용자 복구와 같은 1회만 추가하고 기존 시도 횟수를 보존하며, HTTP/LLM/PG를 직접 호출하지 않는다. `GENERATION_REVIEW_REQUIRED`는 원인을 확인한 뒤 `--attempts 1..5`로 명시한 횟수만 추가한다. ask 품질 보류(`ASK_LIMITED_REVIEW_REQUIRED`)도 자동 재개 없이 이 경로로만 운영자가 재개한다. 이후 운영 큐 또는 기존 복구 tick이 원래 스냅샷에서 이어간다.

생성 품질 규칙을 고쳐 배포할 때는 `worker/yeongnyangi/repository.js` 의 `GENERATION_FIX_EPOCH` 를 1 올린다. 그러면 10분 크론이 결제가 유효하고 사용자 한도·시도 한도·시스템 재시도 소진으로 멈춘 보류 주문(ask 보류 제외)을 주문당 최대 2회까지 이어서 생성한다. 재개할 수 없는 보류는 운영자 알림을 1회 보낸다. 2026-09-26 참치 주문이 이 경로로 복구됐다.

UI의 다시 불러오기는 읽기 오류를 재조회한다. 상담 이어가기는 기존 생성 API로 동일 상담을 재개하며 큐 등록 실패는 503과 Retry-After를 반환한다. 읽기 작업만 공유 DB 재시도 장치의 timeout/admission 복구를 사용하고 쓰기 작업에는 이를 확장하지 않는다.

## 구조화 출력 호환성

2026-09-23 운영 복구에서 v5의 `example`·`advice` 빈 문자열 enum이 Gemini의 생성 전 countTokens 단계에서 HTTP 400으로 거부되는 것을 확인했다. 공급자 스키마 변환은 빈 enum을 제거하되 인용 ID enum은 유지한다. 빈 레거시 필드는 기존 프롬프트와 validateChapter가 계속 검증한다. 같은 스키마의 비과금 검사 응답은 수정 전 400, 수정 후 200이었다. 공급자 오류의 제한된 코드·상태만 로그에 남기며 원문 요청·출생정보·응답 본문을 기록하지 않는다.
