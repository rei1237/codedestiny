---
status: active
updated: 2026-09-14
next: "사주 2만 자·챕터 저장/재개 구현을 검증했다. main CI 확인 뒤 승인된 심화 자미두수 PDF·초융합·숙요 궁합 및 나머지 상세 리포트로 순차 확대한다."
---

# 유료 LLM 결과 전달 후속 인수인계

## 2026-09-14 사주 우선 확대 (진행 중)

- 사용자는 사주 전체부터 다른 유료 LLM 상세 리포트까지 개선을 승인했다. 최우선은 결제 이후 실제 LLM 생성·저장·모바일 제공이다. 리포트당 본문 최소 20,000자(제목·목차·마크다운 기호·공백 제외), 기존 12챕터 유지, 기존 구매 결과 재열람 유지.
- 사주 v7: 요청당 미완료 묶음 하나, 묶음별 본문 4,000자 및 챕터별 균등 하한, 총 20,000자. 호출 전 시도 수 예약, 묶음당 최대 4회, 정상 묶음 보존. 명식 십성표 모순·누락·반복·잘림을 완료로 넘기지 않는다.
- 상태는 generating → partial 또는 delivery_pending → 저장 및 재조회 확인 후 completed. 저장 예외/null/재조회 실패는 RESULT_STORAGE_UNAVAILABLE 503이며 생성 실패 환불 경로를 타지 않는다. claim 토큰과 상태 조건으로 완료본 덮어쓰기를 막는다. 중단 회수는 환불 스트라이크에서 제외한다.
- 클라이언트는 부분 결과를 완료로 취급하지 않고 원래 요청 본문·결제 증빙을 보존한다. 서버 jobId 재개, 계정별 로컬 키, 계정 변경 응답 폐기, 서버 기록 탐색, 목차·긴 본문 줄바꿈을 추가했다.
- 검증: 사주 라우트 저장/재개 mock 22개, 기존 사주 근거·stale 포함 61개 통과. 화면·캐시·기본 사주 회귀 16개 통과. section-plan 160개, generation-resilience 884개, auth listener 분류, worker-no-undef, Mongo 쿼리 모양, sitemap drift, typecheck 통과. ESLint 오류 0, 기존 미사용 선언 등 경고 23개.
- check:fast는 paid-gate 88개 중 구형 10챕터/버전 fixture, 새 auth listener 등록, 출력 여유 검사에서 중단했다. 해당 항목은 갱신 후 targeted 재검사 통과. 전체 로컬 suite는 반복하지 않는다. 공식 완료는 해당 push의 main CI로 확인한다.
- 실제 렌더 함수를 이용한 네트워크 차단 Chromium fixture: 360/390/430/1280px에서 12챕터·목차 12링크·가로 넘침 없음. 390px 캡처 확인. 전체 로그인 페이지/실기기 PG 복귀 검증은 아니다. Impeccable 기존 대형 엔진 파일 검사는 기존 advisory를 포함하며 관련 없는 디자인은 수정하지 않았다.
- 실 LLM·실결제·운영 DB·수동 배포 호출 없음. 다른 상세 리포트의 2만 자 계약과 저장 경로는 아직 완료로 보고하지 않는다.

## 현재 기준

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
