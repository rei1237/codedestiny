---
status: active
updated: 2026-09-14
next: "사주 2만 자·챕터 저장/재개 구현을 검증했다. main CI 확인 뒤 승인된 심화 자미두수 PDF·초융합·숙요 궁합 및 나머지 상세 리포트로 순차 확대한다."
---

# 유료 LLM 결과 전달 후속 인수인계

## 2026-09-14 심화 자미두수 PDF 생성 중단 예방

- 첫 LLM 호출 전에 원래 입력·멱등키·명반을 저장한다. 요청당 최대 네 챕터를 병렬 생성하고 각 챕터 완료 즉시 개별 체크포인트를 저장·재조회한다. 서버에 저장된 미완료 챕터만 이어 생성하며 클라이언트 startIndex나 토큰의 누적 분량을 완료 근거로 믿지 않는다.
- 기존 15챕터·충분한 분량 목표는 유지한다. 모든 필수 챕터의 최소 본문·잘림·반복 검사를 통과해야 완료 후보가 된다. 챕터별 최대 세 시도를 호출 전에 예약하고 보완 호출에서는 실패 캐시를 재사용하지 않는다. 정상 챕터는 유지한다.
- 원래 결제 증빙을 재확인하고 월정석은 정본 차감 원장으로 확인한다. 취소·환불된 증빙을 이용권으로 우회하지 않도록 재조회한다. 계정·원래 입력 변경을 거부하며 완료된 과거 구매본은 새 분량 기준으로 차단하지 않는다.
- delivery_pending 본문 저장·재조회 후 completed 저장·재조회를 확인한다. 저장 실패는 503 RESULT_STORAGE_UNAVAILABLE로 반환하고 생성 실패 환불과 분리한다. 생성 잠금으로 동시 요청의 중복 생성을 방지한다.
- 화면은 부분 본문을 표시하며 같은 결과 ID로 이어받는다. 새로고침·온라인 복귀·계정 재로그인 시 서버의 진행 중 결과를 찾는다. 계정 전환 뒤 도착한 응답을 화면에 섞지 않는다. 숙요 궁합의 긴 결과를 화면 진입 비율 때문에 숨기던 애니메이션 조건도 제거했다.
- 실제 라우트·생성기·클라이언트 함수 mock 및 숙요 결과 SSR 검사 18개 통과. verify:ziwei-deep-report-flow, worker-no-undef, mongo-query-index-shapes(868쿼리, 위반 0) 통과. check:fast -- --plan 확인. 기존 저장 함수 회귀도 흐름 검사에서 실행한다.
- 직전 신년운세 24285603d13e9fff47cd653a012a2cd48cd04fa9 main CI 34837667967 success. 이 단위는 별도 push 후 CI로 판정한다.
- 한계: 실 LLM 품질·운영 DB·실결제·물리 모바일 복귀는 미검증. 심화 명반의 모든 의미적 모순을 자동 판별하는 것은 미완료이며 최초 계산값 보존과 기존 프롬프트 근거를 유지했다. 전체 LLM 기능 개선은 진행 중이다.

## 2026-09-14 신년운세 생성·전달 개선

- 신년운세는 한 요청에서 다섯 분야와 보완 호출을 몰아서 실행하지 않고, 요청당 한 분야만 생성한다. 분야별 52초 한도, 총 요청 예산 82초, 분야별 누적 3회 한도로 미완료/분량 미달/모순/잘림/반복 분야만 보완한다.
- 각 분야를 서버에 즉시 저장하고, 최초 계산 근거와 원래 입력·멱등키·결제 증빙을 보존한다. 생성 잠금은 DB에서 원자적으로 획득한다. 중단된 요청은 저장된 분야를 재사용한다.
- 다섯 분야와 공백 제외 본문 2만 자·기존 계산 일치 검사를 통과한 결과를 delivery_pending으로 먼저 저장·재조회한다. 기존 deferred apply 확인 후 완료 저장과 재조회를 통과해야 completed/saved:true를 반환한다. 저장 null/예외와 apply 응답 유실은 503·동일 결과 ID로 복구하고 생성 실패 환불과 분리한다.
- 모바일 화면은 부분 본문을 완료로 취급하지 않는다. 저장된 분야를 보여주며 같은 상담 ID로 이어받고, 새로고침·온라인 복귀·로그인 후 서버의 진행 중 상담에서도 재개한다. 기존 완료 결과 재열람은 유지한다.
- 현재 증빙 판정은 접근 토큰의 유효성만 믿지 않고 취소/환불 내역과 원래 증빙을 다시 확인한다. 같은 결과의 다른 계정 접근과 같은 멱등키의 입력 변경을 거부한다.
- 실제 라우트/생성기/클라이언트 mock 16개 통과(이용권·월정석·단건, 최종 저장 null, apply 응답 유실, 중복, 부분 저장, 짧은 본문, 19,999/20,000자 경계, 취소 증빙). verify:new-year-ai-flow, generation-resilience 884개, typecheck, worker-no-undef, mongo-query-index-shapes 통과. 대상 ESLint 오류 0. check:fast -- --plan 확인.
- 직전 인생의 책 커밋 31a63015e main CI 34835912367 success. 이 신년운세 변경은 별도 push 후 main CI로 판정한다.
- 실 LLM/실결제/운영 DB/물리 모바일 결제 복귀는 미검증. 다음은 심화 자미두수 PDF·초융합·숙요 궁합의 남은 생성 중단 예방과 기타 LLM 상품 대조다. 전체 상품 개선 완료로 보고하지 않는다.

- 로컬 Next 개발 프리뷰에서 390px/1280px 인생의 책·신년운세 결과를 확인했고 가로 넘침이 없었다. 신년운세의 motion/LazyMotion 충돌과 긴 카드의 화면 진입 비율 조건 때문에 본문이 숨는 문제를 재현해, 결과를 처음부터 노출하도록 수정했다. 프리뷰 상태도 실제 completed/saved 계약에 맞췄다. 외부 및 API 네트워크는 브라우저에서 전부 차단했다. 이 검사는 결제 E2E나 실 LLM 결과의 증거가 아니다.

## 2026-09-14 인생의 책·인생 총운 전달 개선

- 실제 장애 원인: 첫 네 섹션 저장 뒤 상태가 generating인 요청을 전부 작업 중으로 간주하여 다음 웨이브가 실행되지 않았다. 실제 DB 잠금이 살아 있는 경우만 대기하고, partial에서는 다음 미완료 섹션을 진행한다.
- 한 요청은 최대 네 섹션, 섹션 호출은 최대 45초. 시도 횟수를 호출 전에 예약하고 각 섹션 종료 직후 저장·재조회한다. 서버에 최초 계산 근거와 원래 요청/증빙을 보존한다.
- 최종 본문을 delivery_pending으로 저장·재조회한 뒤 기존 deferred apply를 실행한다. 완료 저장 및 재조회 뒤에만 completed/saved:true를 응답한다. 저장 예외/null과 apply 응답 유실은 환불 경로에서 분리한다. 완료 문서와 정상 섹션은 재사용한다.
- 재개 ID는 계정 소유권을 검사한다. 원래 증빙의 취소/환불 상태를 다시 읽고 토큰만으로 접근을 허용하지 않는다. 실패 확정도 생성 잠금을 소유한 요청만 수행한다.
- 인생 총운의 기존 3만~6만 자 생성 목표는 유지한다. 인생의 책은 전체 본문 2만 자 하한에 맞춰 섹션 목표를 보강했다. 충분히 긴 내용은 자동으로 잘라내지 않으며, 과거 completed 결과는 새 품질 기준으로 차단하지 않는다.
- 모바일 결과 화면은 저장된 본문을 표시하면서 다음 웨이브를 요청하고, 화면 복귀/온라인 복귀 때 같은 세션을 이어받는다. 계정 전환 이후 도착한 결과는 폐기한다. 생성 화면은 재개 ID와 같은 멱등키를 쓰고 완료 전 복구 정보를 보존한다.
- 실제 라우트/클라이언트 함수 mock 15개, 섹션 검사 13개, UI 계약 검사 9개 통과. verify:life-book-ai-flow, typecheck, worker-no-undef, mongo-query-index-shapes 통과. check:fast -- --plan 확인. 별도 실브라우저 시각/실기기/실 LLM/실결제/운영 DB 검증은 미실행.
- 연애 비책 커밋 b908e655c main CI는 빌드·critical 검사를 통과했으나 sitemap 기록 누락으로 실패했다. fd1c56725의 사이트맵 생성에는 진행 중 인생의 책 소스가 포함되어 원장 서명만 다시 불일치했다. 인생의 책 소스와 최종 사이트맵 원장을 함께 전달한 뒤 main CI를 확인한다.
- 다음 작업: 신년운세의 긴 생성/차감 후 저장 실패 경로, 이어 나머지 LLM 상품의 중단 예방과 복구 계약. 전체 상품 개선은 아직 완료되지 않았다.


## 2026-09-14 연애 비책 생성·전달 개선

- 사용자 우선순위 재확인: 모든 LLM 기능에서 긴 호출이 실행 제한으로 끊기지 않게 하는 것이 우선이다. 결제 후 정상 생성·저장·전달을 먼저 고치며 충분히 긴 기존 본문은 불필요하게 늘리지 않는다.
- 연애 비책은 기존 6그룹·28절·3만~3만6천 자 생성 목표를 유지한다. 요청당 한 그룹(최대 기본 생성+보완 2회), 그룹별 누적 4회 한도. 정상 그룹과 최초 계산 근거를 서버에 보존하고 다음 요청은 미완료/품질 미달 그룹만 생성한다.
- 최종 저장 대기와 부분 생성을 분리했다. 완료는 필수 절/공백 제외 2만 자/기존 근거 품질 검사를 거쳐 저장 및 재조회 뒤에만 반환한다. 저장 장애는 환불 경로와 분리하고 최종 본문을 재사용한다.
- 같은 결과 ID의 서버 재개, 원래 멱등키/증빙 유지, 만료된 접근 토큰 대신 원래 증빙 재확인, 취소·환불 거부, 생성 claim CAS를 추가했다. 새로고침·계정 재로그인 시 서버의 최근 상담으로 접근할 수 있다.
- 모바일 화면은 부분 본문으로 완료 처리하지 않고 자동 이어받는다. 결과 화면은 저장된 절을 보여주며 이어받고 화면 복귀 시 다시 확인한다. 저장 장애/재시도는 결제창을 다시 열지 않는다. 계정 전환 뒤 응답은 폐기한다. 90초 완료 안내는 단계별 저장 안내로 12개 언어에서 수정했다.
- mock: 실제 라우트·클라이언트 함수·생성기 호출 범위·취소 증빙 결정 18개 통과. love-secret flow(28절/본문 23,835자 fixture), typecheck, worker-no-undef, Mongo 쿼리 모양, generation-resilience 884개 통과. 대상 ESLint 오류 0, 기존 경고 15개. 실제 LLM 출력·운영 DB/PG·물리 모바일 결제 복귀는 미검증이다.
- 앞선 a7d9f6b8095f7653a66eb16729a7ab69e6b6e09f main CI 34832408776은 success. 이 연애 비책 작업의 CI는 push 후 별도로 확인한다.
- 다음 우선 작업은 인생의 책/인생 총운과 신년운세의 생성 중단 예방·체크포인트·최종 저장 계약이다. 다른 LLM 서비스 전체 목록 대조 및 남은 품질/결제 조합 검증도 계속 필요하다.
## 2026-09-14 저장 장애 확대 중간 검증

- 추가 지시: 사주 기반 연애 비책·인생의 책/인생 총운·신년운세 등 모든 개별 LLM 서비스를 포함한다. 이미 충분히 긴 리포트의 생성 목표를 불필요하게 늘리지 않는다.
- 심화 자미두수 PDF 배치 저장 throw/null/재조회 실패를 503 RESULT_STORAGE_UNAVAILABLE로 분리했다. 저장 장애에 생성 실패 환불을 실행하지 않으며 완료 문서를 덮지 않는다.
- 초융합은 저장 ID가 없거나 저장 예외가 나면 성공 SSE/HTTP 결과를 보내지 않는다. 기존 3만 자 이상 생성 목표는 유지한다.
- 숙요 궁합은 delivery_pending 본문을 재사용해 최종 저장을 확인한다. claim 토큰과 입력 해시로 중복 생성/오래된 실패 쓰기를 제한한다. 아직 전체 장별 재개와 모든 결제 증빙 취소 조합의 검증은 완료하지 않았다.
- mock 검증: 숙요 실제 라우트 12개, 초융합 실제 스트림 라우트 7개, 자미두수 실제 저장 함수 8개 통과. 외부 네트워크는 차단했고 천문 좌표 입력은 mock이다. 자미두수 flow, 초융합 stage/reopen, Mongo 쿼리 모양 통과. 관련 ESLint 오류 0/미사용 경고 10.
- 사주 CI의 구형 mock 의존성은 2627b0da781e460bf02ff70c4867057fb02b7981에서 수정(39개 통과). 이어 public cache key 미러 불일치를 d995ea5b1에서 수정했다. 최신 CI 통과는 별도 확인 중이다.
- 남은 작업: 연애 비책·인생의 책·신년운세를 우선하여 다른 상세 리포트의 2만 자/근거/필수 장 완료, 체크포인트, 모바일 재개, 결제 취소·환불 재확인을 적용한다. 현재 저장 장애 수정만으로 전체 계획 완료를 의미하지 않는다.
- 실 LLM 품질·실결제·운영 DB·실기기 결제 복귀·배포는 미검증이다.
## 2026-09-14 사주 우선 확대 (진행 중)

- 사용자는 사주 전체부터 다른 유료 LLM 상세 리포트까지 개선을 승인했다. 최우선은 결제 이후 실제 LLM 생성·저장·모바일 제공이다. 리포트당 본문 최소 20,000자(제목·목차·마크다운 기호·공백 제외), 기존 12챕터 유지, 기존 구매 결과 재열람 유지.
- 사주 v7: 요청당 미완료 묶음 하나, 묶음별 본문 4,000자 및 챕터별 균등 하한, 총 20,000자. 호출 전 시도 수 예약, 묶음당 최대 4회, 정상 묶음 보존. 명식 십성표 모순·누락·반복·잘림을 완료로 넘기지 않는다.
- 상태는 generating → partial 또는 delivery_pending → 저장 및 재조회 확인 후 completed. 저장 예외/null/재조회 실패는 RESULT_STORAGE_UNAVAILABLE 503이며 생성 실패 환불 경로를 타지 않는다. claim 토큰과 상태 조건으로 완료본 덮어쓰기를 막는다. 중단 회수는 환불 스트라이크에서 제외한다.
- 클라이언트는 부분 결과를 완료로 취급하지 않고 원래 요청 본문·결제 증빙을 보존한다. 서버 jobId 재개, 계정별 로컬 키, 계정 변경 응답 폐기, 서버 기록 탐색, 목차·긴 본문 줄바꿈을 추가했다.
- 검증: 사주 라우트 저장/재개 mock 22개, 기존 사주 근거·stale 포함 61개 통과. 화면·캐시·기본 사주 회귀 16개 통과. section-plan 160개, generation-resilience 884개, auth listener 분류, worker-no-undef, Mongo 쿼리 모양, sitemap drift, typecheck 통과. ESLint 오류 0, 기존 미사용 선언 등 경고 23개.
- check:fast는 paid-gate 88개 중 구형 10챕터/버전 fixture, 새 auth listener 등록, 출력 여유 검사에서 중단했다. 해당 항목은 갱신 후 targeted 재검사 통과. 전체 로컬 suite는 반복하지 않는다. 공식 완료는 해당 push의 main CI로 확인한다.
- 실제 렌더 함수를 이용한 네트워크 차단 Chromium fixture: 360/390/430/1280px에서 12챕터·목차 12링크·가로 넘침 없음. 390px 캡처 확인. 전체 로그인 페이지/실기기 PG 복귀 검증은 아니다. Impeccable 기존 대형 엔진 파일 검사는 기존 advisory를 포함하며 관련 없는 디자인은 수정하지 않았다.
- 실 LLM·실결제·운영 DB·수동 배포 호출 없음. 다른 상세 리포트의 2만 자 계약과 저장 경로는 아직 완료로 보고하지 않는다.

## 찻집 단계 기준 (이후 승인 범위는 위 진행 기록 참조)

- 작업 디렉터리: `D:\Development\code-destiny`, `main`.
- 마지막 구현 커밋: `dd01ead6fc290d2a320bd8a82681aeb9ea87f4a2` (`fix(tea-house): recover saved paid deliveries`). 기준 커밋은 `ffc080579c5c22f8d36d2b308b0f15b27c08285c`였다.
- 사용자의 중지 요청 뒤 “다시 재개해줘” 지시로 미커밋 초안을 이어받아 구현했다. 중지 체크포인트는 이 문서로 대체한다.
- 이번 승인 범위는 **찻집 저장·복구까지**. 심화 자미두수 PDF·초융합·숙요 궁합 등은 미수정이며 해결 완료로 보고하지 않는다.
- 조사 상세: [paid-llm-delivery-findings-20260914.md](paid-llm-delivery-findings-20260914.md).

## 찻집 구현과 계약

- 생성 결과를 기존 결과 컬렉션의 `delivery_pending`으로 저장/재조회한 뒤 원래 증빙으로 deferred apply, 최종 `completed` 저장/재조회, 리워드 순으로 진행한다.
- 저장 throw/null/완료 확인 실패는 HTTP 503 `ok:false`, `retryable:true`, `reason:RESULT_STORAGE_UNAVAILABLE`, `resultId`. apply 응답 유실은 `RESULT_DELIVERY_PENDING`으로 안내하고 cancel/새 요청으로 바꾸지 않는다.
- pending 재개는 생성 본문을 그대로 사용한다. 사용자·결과 ID·requestId·입력 해시·결제 식별자를 묶고 UUID 잠금 토큰의 조건부 쓰기로 늦은 응답이 다른 소유자의 결과를 덮지 못하게 한다. 원문/증빙 변경은 409다.
- 명시적 증빙은 현재 이용권보다 먼저 확인한다. 취소/환불된 실행 레코드와 원결제 상태를 거부하며, 생성 후 apply 직전에도 권한을 재확인한다. 조회 실패는 다른 증빙이나 이용권으로 우회하지 않는다.
- 리워드 실패는 저장된 상담 성공과 분리한다. 저장 성공 응답 유실 뒤 재조회되는 기존 완료 결과도 새로 생성/차감하지 않는다.
- 화면은 계정별로 원문·찻잔·attemptId·증빙을 보존한다. 기존 유료 재개 코어를 사용하고 이용권 직접 통과도 같은 요청으로 재시도한다. localStorage 우선/sessionStorage 폴백, 24시간 유효 기간이며 저장소가 막히면 인페이지 메모리 복구만 가능하다. 로그인/계정 전환 시 해당 계정의 기록만 복원하고 완료 시 해당 시도만 지운다.
- 상담 API 호출 이후의 저장/전달 실패는 로컬 초안 성공으로 바꾸지 않는다.

## 수정 파일과 유지 범위

- 서버: `worker/routes/fortune-tea-house.js`.
- 화면/복구: `src/features/fortune-tea-house/FortuneTeaHousePage.tsx`, `src/features/fortune-tea-house/lib/consultRecovery.ts`.
- 테스트: 찻집 honey-drops, delivery-billing, saju-timing, tarot-cardwise Jest 및 recovery.behavior Node 검사. 기존 콘텐츠 검사 두 곳의 빈 DB 스텁을 `__tests__/fixtures/fortune-tea-result-store.cjs`로 보완했다.
- 화면 소스 변경으로 찻집 URL lastmod/signature 및 사이트맵 미러를 재생성했다. URL 집합 변경 없음.
- 가격·이용권·월정석·단건 결제·환불 정책, 인증 공통 코드, billing 공통 구현, DB 스키마/인덱스, 타 기능의 생성 코드는 변경하지 않았다.

## 검증 근거와 한계

- `npm run test:jest -- --runInBand fortune-tea-house`: **6 suites, 85/85 통과**.
- `npm run test:jest -- --runInBand __tests__/worker/fortune-tea-house-honey-drops.test.js __tests__/worker/fortune-tea-house-delivery-billing.test.js __tests__/worker/deferred-billing-proof.test.js`: **73/73 통과**(앞 검사와 중복 포함).
- `node --test __tests__/ui/fortune-tea-house-recovery.behavior.test.js __tests__/ui/fortune-tea-house-paid-resume.static.test.js`: **14/14 통과**. 실제 제출 함수와 복구 effect를 추출하여 저장 실패/409/402/응답 유실, 원문 유지, 저장소 차단, 재로그인/계정 전환을 mock으로 실행했다. 실제 브라우저/실기기 로그인 E2E 증명은 아니다.
- 첫 push CI `34819300548`의 Static guards에서 기존 찻집 정적 검사 2개와 concurrency VM 3개가 실패했다. 예전 변수명/저장 블록 문자열 단언과 randomUUID 의존성 누락을 새 계약에 맞췄으며, 실제 freshness 함수를 사용하는 VM에 pending 동시 재개를 추가했다. `node --test __tests__/ui/fortune-tea-attempt-reuse.static.test.js __tests__/ui/fortune-tea-generation-concurrency.test.js __tests__/ui/fortune-tea-house-recovery.behavior.test.js` **23/23 통과**. 첫 push의 Critical checks 및 타입/린트는 통과했다. 최종 CI는 후속 push의 run을 확인한다.
- billing 검사 3개는 실제 apply/완료 함수 본문을 실행하고 DB/최하위 소비 함수를 mock으로 대체했다. 완료 응답 유실 후 동일 키 재요청이 소비 함수에 재진입하지 않음을 확인했다. 실 PG/실차감·운영 DB 증명은 아니다.
- `npm run check:fast -- --plan`: critical 선택. `npm run check:fast`는 문서/변경 lint/전체 lint를 통과하고 sitemap drift에서 중단했다. `npm run sitemap:generate` 후 `npm run verify:sitemap-drift` 통과. check:fast 전체 성공으로 보고하지 않는다.
- 별도 `npm run typecheck`, `verify:billing-pass-policy`, `verify:portone-single-payment`, `verify:paid-gate-ui`, `verify:payment-choice-parity`, `verify:checkout-pass-card`, `verify:paid-feature-billing-policy`, `verify:ai-prompt-billing-policy`, `verify:paid-resume-wiring`, `verify:worker-no-undef`, `verify:mongo-query-index-shapes`, `git diff --check` 통과.
- 추가 `verify:ai-consultation-flows`는 사주 캐시 쓰기 조건을 찾는 `verify:saju-ai-consultation-recovery`에서 실패했다. 해당 검사 및 입력 4파일(`fortune.js`, 사주 엔진/미러, `lib/llm-cache.ts`)은 기준 HEAD와 동일함을 확인했다. 이번 찻집 범위 밖 기존 실패이며 미수정이다.
- Impeccable 변경 UI detector: `[]`. 레이아웃 변경 없음, 실브라우저 시각 검사 미실행.
- 실 LLM·실결제·운영 DB·수동 배포 호출 없음. 로컬 전체 검사를 반복하지 않고 공식 판정은 push 후 main CI를 확인한다.

## 전달 확인

이 문서는 구현 커밋 후 작성했다. 최종 push의 CI는 다음 명령으로 확인하고, 같은 commit의 `CI required` 성공을 전달 기준으로 삼는다. 이전 기준 커밋의 CI 성공을 이번 변경의 근거로 쓰지 않는다.

```powershell
git status -sb
git log -2 --oneline
gh run list --branch main --workflow pr-ci.yml --limit 3
```

## 남은 작업

1. 이번 찻집 범위 외 P1: 심화 자미두수 PDF의 첫/후속 저장, 초융합 최종 저장, 숙요 궁합 null 저장 경로. 별도 요청 시 진행한다.
2. 점성술·베다·자미두수·신년운세·연애 비책 품질 미달 partial 보존은 이전 조사 그대로 미수정이다.
3. 기존 인연의 서의 의미적 모순 검사/경계 fixture 및 나머지 registry 전수 검사는 별개다. 기존 구매 재열람을 새로운 품질 계약으로 차단하지 않는다.
4. 실제 브라우저/실기기 PG 복귀·실 LLM 품질·운영 주문 복구 및 환불 경합은 이번 mock 검증과 분리한다. 실서비스 검증에는 별도 승인이 필요하다.

## 복사할 재개 지시

```text
D:\Development\code-destiny에서 D:\Development\code-destiny\docs\handoff\paid-llm-delivery-20260914.md와 연결된 조사 문서를 읽어라. 마지막 찻집 구현 커밋은 dd01ead6fc290d2a320bd8a82681aeb9ea87f4a2다. 먼저 main 상태와 해당 구현이 포함된 최신 push의 CI를 확인하고 기존 변경을 보존하라. 찻집 서버 저장/복구 및 계정별 화면 재개는 mock으로 구현·검증됐으며, 남은 타 기능의 P1 저장 경로는 새 요청 범위에 맞춰 선택하라. 실 LLM·실결제·운영 DB 호출 없이 mock으로 검증하라.
```
