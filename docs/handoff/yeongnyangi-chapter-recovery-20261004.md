---
status: blocked
updated: 2026-10-04
next: "사용자가 운영 승격을 명시 승인했다. 정확한 main SHA의 CI 통과 후 1회 승격한다. 참치 복구 execute/실 LLM은 Gate 2 및 결제 커밋 마커 예외 승인 전 실행하지 않는다."
---

# 영냥이 참치 챕터 전달 보강 및 운영 주문 점검

## 범위와 승인 경계

- 사용자 목표: 참치 대운 누락 원인 규명, 1차 생성 성공률/토큰 효율 개선, 실패한 장만 복구, 추가 결제·이용권 변동 금지.
- 대상: 70f6209e67a44924622f18a8ea6e7aa81df4bdf306023d925bb3f7410b621417.
- 읽기 전용 진단 후 사용자의 정확한 수정·시간 여유·복구 요청을 구현 범위로 반영했다. 이후 "바로 운영 승격까지 진행해"로 검증 후 운영 승격 1회가 승인됐다. 주문 복구 쓰기·과금 LLM·PG·환불 승인은 아직 없다.
- 추가 지시: 전체 유료 LLM 전달 상태 조사. 고객 주문 분석 우선순위는 참치이며 모둠/오마카세 개별 분석 제외.
- 작업 디렉터리: D:/Development/codedestiny-worktrees/yeongnyangi-chapter-recovery-20261004-123007.
- 작업 브랜치: codex/yeongnyangi-chapter-recovery. 공유 main의 기존 미커밋 파일은 수정하지 않았다.
- 영냥이는 Code Destiny 내부 worker/yeongnyangi 및 app/yeongnyangi 경로다. 별도 SoulCat 저장소를 수정하지 않았다.
- 이 문서의 실 DB 수치는 2026-10-04 03:56~04:08 UTC 읽기 결과다. 코드/mock/운영 DB 증거를 구분한다.

## 확정 원인과 불확실성

DB audit에서 대상은 saju_tuna, paid, FORTUNE_FAILED / GENERATION_REVIEW_REQUIRED다.
16장 중 4장이 저장됐고 5번째 장에서 DUPLICATE_CHAPTER가 두 번 발생한 뒤 SYSTEM_RECOVERY_EXHAUSTED로 보류됐다.
전체 시도 7회; 장별 1/2/1/1/2회다. 6번째 이후 장은 호출하지 않았다.

- providers/chapter.ts의 구조화 호출 뒤 example 중복 검사에서 예외를 던질 수 있었다. sectioned v6 책은 blocks를 사용하지만 LLM이 불필요한 example을 채우면 정상 본문도 이 검사에서 버려졌다. 저장된 과거 첫 두 장에도 이런 불필요한 scalar 필드가 존재한다.
- service.ts는 해당 예외를 provider 단계로 기록했다. 보정 프롬프트는 quality 단계 실패에만 넣어 다음 시도에 실패 이유가 빠졌다.
- repository.js의 allowedChapterAttempts는 항상 2였다. 수동/시스템 보완 상수도 0이었다. 기존 복구 스크립트로 grant를 늘려도 호출 예산은 늘지 않는 구조였다.
- 거절된 5번째 원문과 당시 finish_reason은 DB에 없다. 그 문장이 실제 중복인지, 중복 검사 오탐인지까지 단정하지 않는다. 시간 초과가 이번 장애의 원인이라는 증거도 없다.
- DB 원본 입력과 계산 결과는 존재한다. 대운 cycle 10개지만 구매 목차는 cycle별 10장이 아니라 v6 주제별 15장 + 예방 1장이다.

## 대상 주문 상태와 dry-run

| 장 | 구매 당시 제목 | 저장 글자 수 | 시도 | 처리 |
|---|---|---:|---:|---|
| tuna-01 | 현재 시기의 핵심 과제 | 3542 | 1 | 보존 |
| tuna-02 | 현재 흐름과 타고난 기질 | 3537 | 2 | 보존 |
| tuna-03 | 현재 강점이 살아나는 조건 | 3455 | 1 | 보존 |
| tuna-04 | 현재 부담이 커지는 조건 | 3516 | 1 | 보존 |
| tuna-05 | 현재 시기의 일과 책임 | 0 | 2 | 생성 예정 |
| tuna-06 | 현재 시기의 재물과 자원 | 0 | 0 | 생성 예정 |
| tuna-07 | 현재 시기의 관계 조율 | 0 | 0 | 생성 예정 |
| tuna-08 | 큰 흐름과 가까운 시기의 연결 | 0 | 0 | 생성 예정 |
| tuna-09 | 현재와 다음 시기의 차이 | 0 | 0 | 생성 예정 |
| tuna-10 | 다음 전환 전에 준비할 조건 | 0 | 0 | 생성 예정 |
| tuna-11 | 시기 근거가 상충하는 지점 | 0 | 0 | 생성 예정 |
| tuna-12 | 서두르기와 기다리기의 조건 | 0 | 0 | 생성 예정 |
| tuna-13 | 계산된 기간과 예측의 한계 | 0 | 0 | 생성 예정 |
| tuna-14 | 현실에서 확인할 변화 | 0 | 0 | 생성 예정 |
| tuna-15 | 대운 · 실천과 점검 | 0 | 0 | 생성 예정 |
| tuna-prevention-v1 | 조심해야 할 흐름과 나를 지키는 선택 | 0 | 0 | 생성 예정 |

- 최소 예정 챕터 호출 12회. 모든 미생성 장이 한 번씩 성공했을 때다. 자동 보완까지 전부 소진하면 추가 호출 상한 35회다. 실제 비용이나 성공률 실측이 아니다.
- 기존 4장 재생성 없음. 과거 scalar 필드/스냅샷을 정규화해서 다시 저장하지 않는다.
- dry-run planSha: 0ed50610a041077f9162414da67b041c52c03005cd371ed54ba1e610303ce4cd.
- dry-run ready=false: PAYMENT_COMMIT_MARKER_APPROVAL_REQUIRED. 쓰기/LLM 0회.
- 기존 장 해시:
  1. c3deb63e9c7c54306150eabf4340d94b13ec8d5b73e80c00d9616d695108ac25
  2. c28500666d3b0997ded87473029b4eeb66118028eae5a1473ecc7cf68ba65d8a
  3. add753e2554bfc5135a2742fb17aed7c3922652d2f6451310e85d36742999311
  4. 773ee08990152e813f04bf05f3c98f723f94ceac8924c549543c96b327b9611d

## 구현과 시간 상한의 영향

- chapter-delivery-contract.js: 신규 생성 버전, JSON chapterId/complete, 최소 분량, 구매 목차의 section 순서/존재, 절단 문구 검사.
- providers/chapter.ts, delivery.ts: 기존 페르소나 그대로 사용. 1장당 1응답. sectioned 책의 새 응답에서 사용하지 않는 scalar 필드는 로컬 정리하여 본문을 버리는 불필요한 호출을 줄인다.
- providers/code-destiny.ts, worker/lib/gemini.js: 영냥이 챕터에만 preserveTermination 옵션. MAX_TOKENS/LENGTH를 로컬 복구 성공으로 바꾸지 않는다. 다른 LLM의 기본 복구 경로/시간 제한은 바꾸지 않았다.
- service.ts: 신규 주문에 전달 계약 버전 추가. 구매 시 고정된 기존 manifest 그대로 사용. 실패 이유를 다음 장이 아닌 같은 장의 교정 입력으로 전달한다.
- repository.js: 검증된 장과 draft 즉시 저장, 완료 전 전수 점검. 이미 저장된 body를 재사용할 때 공급자 시도 횟수 증가 없음.
- 새 계약 주문: 최초 1회 + 즉시 보완 1회, 이후 10분 크론의 서버 보완 최대 1회. 보완 대기 대상은 5분 이상 정체된 주문. 사용자/운영자 명시 재개 예산은 별도 최대 2회로 제한한다. 과거 보류 주문은 배포만으로 자동 재생성하지 않는다.
- 관측성: 공급자/모델/종료사유/상태/입출력 토큰/추정 여부/thinking/호출 상한/경과시간을 success draft 또는 실패 audit에 저장한다. 본문과 출생 입력을 로그에 출력하지 않는다.
- 기존 큐 구조 유지: 메시지 1개당 1장, batch 1, 소비 동시성 2, 주문별 직렬. 주문 간 분산이며 모든 Code Destiny LLM의 전역 동시성 상한은 아니다. 새 계약 주문은 큐가 없을 때 크론에서 LLM 직접 호출로 우회하지 않는다.
- DB 상태 이름은 PAID/GENERATING/FORTUNE_FAILED를 유지한다. partial이라는 새 enum을 추가하지 않았다. 하나라도 없으면 COMPLETED가 아니며 기존 화면에서 저장된 장을 표시한다. UI 문자열/레이아웃 변경 없음.

호출 제한은 150초에서 240초로 90초 증가했다. 잠금과 dispatch marker는 330초로 맞췄다.
이는 정상 응답을 240초 기다리게 만드는 지연이 아니라 최대 대기 상한이다.
부작용은 느린 호출의 큐 점유 증가, 장애 감지 지연, 장애 시 처리량 저하다.
모든 호출이 상한까지 걸린다는 극단 가정에서 두 슬롯의 처리량은 시간 비율 150/240로 줄어든다(실측 아님).
토큰 상한은 기존 장별 분량·thinking 예산을 유지하므로 시간 증가가 토큰 상한을 늘리지는 않는다.
원격 공급자는 로컬 중단 뒤에도 처리/과금할 가능성이 있으므로, 잠금과 1회 호출 예산으로 겹친 재시도를 막되 비용 0을 보장하지 않는다.
다른 HTTP 동기 LLM에 240초를 일괄 적용하면 브라우저/상위 타임아웃을 넘어설 수 있으므로 적용하지 않았다.
Cloudflare 공식 제한도 확인했다: 큐 소비 작업 wall time은 15분이며 HTTP 응답/연결 종료 뒤 waitUntil 연장은 30초다.
따라서 240초 작업은 기존 장별 큐에서 처리한다. CPU 시간과 네트워크 대기 시간은 별도 제한이다.
근거: https://developers.cloudflare.com/workers/platform/limits/#wall-time-limits-by-invocation-type
자동 3회가 모두 실패하면 현재 정책은 여전히 보류된다. 무한 재시도 비용을 만들지 않았으며, 외부 장애에도 영구적으로 무개입 완성을 보장하는 상태는 아니다.

## 영냥이 운영 주문 전수 대조

scripts/audit-yeongnyangi-chapter-completeness.mjs로 단일 체계 상품의 저장된 전체 기간을 조회했다.
paid/success/fulfilled 결제, 소유자, requestId, consumedBy, 환불 마커를 함께 대조했다.

- 정상 결제 증빙 30건: 완료 29, 미완료 1(대상 참치).
- 결제는 있으나 요청이 연결되지 않은 건 0.
- 이용권/월정석 등 카드 결제 외 영냥이 5건: 모두 목차/분량/section 검사상 누락 없음. 자산 원장 전수 검증과는 구분한다.
- 환불 주문 8건은 복구에서 제외했다. 과거 완료 주문을 새 포맷으로 변경하지 않았다.
- 참치 8건 중 사주 7, 베다 1. 완료 7건의 저장 목차와 본문 검사는 모두 통과했다.

| 감사용 해시 | 상품 | 저장/목차 | 시도 | 기록된 과거 문제 |
|---|---|---|---:|---|
| 642866d95d25 | 사주 참치 | 15/15 | 33 | 소절 분량 12회, 내부 근거 노출 6회, 수동/수정 후 재개 |
| c0c19e073a16 | 베다 참치 | 15/15 | 15 | 실패 기록 없음 |
| 5a81cee2ac11 | 사주 참치 | 16/16 | 16 | 실패 기록 없음 |
| cd6f29abbd8a | 사주 참치 | 25/25 | 26 | 공급자 실패 1회 |
| 18df7b85dac2 | 사주 참치 | 16/16 | 16 | 보상 원장 이후 구매, 실패 기록 없음 |
| 8047dfb3e2c7 | 사주 참치 | 4/16 | 7 | 현재 대상; DUPLICATE_CHAPTER 후 보류 |
| 359aa6d9231a | 사주 참치 | 16/16 | 18 | DUPLICATE_CHAPTER 2회 후 완결 |
| cdcf956b9085 | 사주 참치 | 16/16 | 16 | 실패 기록 없음 |

9월 29일 보상성 월정석 지급 원장과 같은 고객의 이후 10월 1일 참치 구매가 16/16 완료인 것을 확인했다.
이 원장이 사용자가 말씀한 보상 사례와 같은 건인지는 사건 식별자가 없어 확정하지 않는다.
시도 횟수는 호출 예약 기록이며 실제 청구 토큰/공급자 성공률과 동일하지 않다.

## 전체 유료 LLM 확대 조사: 추가 Gate 1

기존 전달표 docs/handoff/paid-llm-delivery-matrix-20260915.md와 현재 models.js의 실제 모델을 따라
18개 저장소의 상태 집계를 확인했다. 공용 paidNarrative 외 개별 상품 저장소가 존재하므로
영냥이 수정으로 전체 LLM 문제가 해결됐다고 보고하지 않는다.

- MasterLoveCodexSession generation_failed 9건: 원래 결제 모두 refunded, PURCHASE_REFUNDED. 재생성 제외.
- PaidExecutionRecord 미완료 4건 중 사용자가 제공한 본인 계정 2건은 고객 피해 집계에서 제외.
- 나머지 오래된 기록: PaidExecutionRecord 2건(7~9월), AstrologyAiConsultation 3건(7월), HumanDesignReport 1건(8월).
  직접 카드 결제 ID 연결이 없어 현재 결과/이용권·월정석 증빙을 추가 대조해야 한다. 미완료 상태만으로 미제공 확정 처리하지 않았다.
- ServiceExecutionTransaction의 현재 공용 paidNarrative 기록은 0. 이 저장소의 TTL/보존 범위가 있으므로 과거 장애가 없었다는 뜻이 아니다.

### 관계 경계 리포트 — 다른 고객 계정의 현행 미완료

- 감사용 해시 f08927a31cd0. 2026-10-04 생성. 월정석 500 차감 원장 존재.
- 결과 generation_failed, reason READING_INCOMPLETE. 11개 부분 중 0~5의 6개만 저장, 6~9와 frame의 5개 없음.
- 6번 부분은 2회 invalid. 최종 raw response 2901자, JSON 파싱 성공, evidenceHash 일치, 점수 모순 없음, 자체 반복 없음.
  저장된 다른 부분과 합친 본문에서 기존 hasRepeatedReportPassage가 true다.
- relationship-report-delivery.js: 이전 부분 전체와 문장 하나라도 중복이면 부분을 거절.
  relationship-delivery-store.js: knownFailed면 generation_failed 저장 후 환급을 시도하며, 이후 같은 결과의 재개는 retryable:false로 거절.
- 동일 serviceKey의 차감 이후 환급 원장과, 같은 계정의 이후 MONTHLY_CREDIT_GRANT는 조회 범위에서 없다.
  환급 시도 자체의 실패 이유는 실행 로그가 없어 불명이다. 자동 환급이 성공했다고 단정하지 않는다.
- 사용자가 제공한 본인 계정 3개 모두 존재하며 해당 결과의 소유자 ID는 세 계정 어느 것과도 다름을 재확인했다.
  다른 고객 이메일/이름/출생 정보는 출력하지 않았다.

추가 수정안(미구현): 정상 6부분 보존, 거절된 원문의 정확한 중복 문장을 로컬 편집해 부족하지 않으면 재사용,
필요한 부분만 동일 입력/기존 결제 증빙으로 1회 교정, 프레임 포함 전체 저장 확인 전 완료 금지,
형식/문장 중복 실패를 즉시 환급·영구 중단으로 연결하지 않는 제한된 자동 복구.
부분별 실패 코드와 원문 길이를 남기고, 환급 불확실성은 원장 재대조 전 생성하지 않도록 한다.
이 상품의 전용 복구 dry-run은 아직 작성/실행하지 않았으므로 호출 비용을 확정하지 않는다.
결제/환급 경로를 건드리는 변경은 기존 사용자 규칙에 따라 별도 승인 대상이다.

## Gate 2: 참치 실행 승인에 필요한 사항

1. 검증된 코드의 운영 승격은 최신 사용자 메시지로 승인됨. CI 및 릴리스 게이트 이후 실행한다.
2. 위 참치 주문의 누락 12장 생성(기존 4장 보존, 최소 12회/자동 상한 35회).
3. 기존 동시 환불 방어용 Payment 메타데이터 마커 예외:
   metadata.yeongnyangiChapterCommit, metadata.yeongnyangiCompletionCommit, updatedAt.
   결제 금액·결제 상태·환불·이용권·월정석 잔액은 변경하지 않는다.
   기존 finishChapter/completeStoredRequest 트랜잭션이 이 마커로 환불과의 경합을 직렬화하므로 안전장치를 제거하지 않았다.

환경변수는 MONGO_URI 또는 MONGODB_URI로만 사용한다. 값은 출력/커밋하지 않는다.
다음 명령은 현재 dry-run으로만 실행했다:

```powershell
node scripts/recover-yeongnyangi-request.mjs --db code_destiny --request 70f6209e67a44924622f18a8ea6e7aa81df4bdf306023d925bb3f7410b621417
```

다음은 승인 이후에만 실행할 명령이다. 직전 dry-run의 해시가 아래 값과 다르면 새 계획 확인이 필요하다.

```powershell
node scripts/recover-yeongnyangi-request.mjs --db code_destiny --request 70f6209e67a44924622f18a8ea6e7aa81df4bdf306023d925bb3f7410b621417 --execute --plan-sha 0ed50610a041077f9162414da67b041c52c03005cd371ed54ba1e610303ce4cd --reason tuna-chapter-incident-20261004 --operator ops --allow-payment-commit-markers
```

execute는 고객 결과를 로컬에서 생성하지 않는다. 해당 주문의 버전/제한된 복구 허용만 원자적으로 기록하고 기존 크론/큐가 처리한다.
동일 planSha 재실행은 audit를 확인해 허용 횟수를 다시 늘리지 않는다.
원래 챕터·입력·결제의 SHA와 복구 제어 필드만 임시 before-state 파일에 기록한다. 개인정보 본문 백업 파일은 만들지 않는다.
새로 완성된 장을 삭제하는 롤백은 하지 않는다. 중단이 필요하면 진행 중 잠금이 없는 것을 확인한 뒤
해당 주문의 복구 허용을 해제하는 별도 dry-run/승인으로 처리한다. 코드 롤백은 관련 커밋만 revert한다.

## 검증/전달 기록

- mock 단위·실패 주입: 절단/파싱/429 코드 연속, 동시 재개, 저장 중단/재개, 완료 게이트, 기존 장 보존, 복구 기본 dry-run/승인 해시/CAS 경합/멱등.
- 원래 123개 상품·상담 준비 불변성 검사: 새 deliveryContract 키만 별도 단언하며 기존 계산·목차·정체성 해시는 유지.
- 대운 입력 8/10/12 cycle 및 순행/역행: 기존 주제별 목차 유지, 해당 장에 제공되는 원래 계산 근거 선택 확인.
- typecheck 통과. 수정 후 `npm run check:fast`의 paid-gate-suite 88/88과 lint는 통과했다.
  이후 sitemap drift 검사에서 중단되어 check:fast 전체 통과로 보고하지 않는다. 최신 main 통합 후 생성기로 원장 서명을 갱신했고 sitemap drift 재검사는 통과했다.
- 절단/계약/복구 스크립트 관련 targeted 검사 24개, benchmark/fusion/기존 준비 불변성 12개 통과.
- 생성·저장 공통 수정 커밋: `a8ea7348f` (`fix(yeongnyangi): validate durable chapters and bound recovery`).
- 운영 도구/진단 커밋: `deda9151a` (`fix(ops): require reviewed plans for chapter recovery`).
- 최신 main 통합 뒤 계약/불변성/복구 targeted 17개 및 저장소/크론 Jest 109개 통과, typecheck 통과.
- main CI와 운영 승격은 별개다. 최종 전달 SHA의 CI 결과는 채팅 전달 기록에 남긴다.
- 최초 check:fast는 변경된 절단 거부 계약/완결 마커가 없는 구 mock/새 snapshot 키의 기존 기대값 때문에 실패했다.
  검사를 제거하지 않고, 절단은 거부하고 완결 마커를 제공하도록 기대 계약과 fixture를 갱신했다.
- 실 LLM·PG·운영 DB 쓰기·운영 승격·실고객 화면 검증은 수행하지 않았다. 실제 1차 성공률/비용 절감률은 미측정이다.
- calculateLocalResult, 6개 엔진, normalizeSaju timezone, KASI timezone, PortOne/Inicis 실행, 가격/이용권/월정석 정책, KV/R2 스키마, 960px 레이아웃은 수정하지 않았다.

## 고객 안내 초안 — 운영자 직접 발송

“참치 상담 일부가 작성 도중 멈춘 것을 확인했습니다. 기존에 작성된 내용은 보존하고 누락된 부분을 이어 작성하는 복구를 준비하고 있습니다. 추가 결제나 이용권 차감 없이 처리한 뒤 전체 내용이 정상적으로 열리는지 확인해 안내드리겠습니다.”

복구 완료 확인 전에는 완료했다고 안내하지 않는다. 이번 세션에서 고객에게 메시지를 보내지 않았다.
