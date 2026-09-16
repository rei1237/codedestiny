# 초융합 유료 전달 검증 — 2026-09-17

대상은 재검증표 3행 `fusion-fortune-consultation` 하나다. 활성 진입점은 `app/fusion-fortune/FusionFortuneClient.tsx`의 `ensurePaidAccess` → 원래 requestId의 `/api/fusion-fortune/generate/stream` → `generateFusionFortuneRequest` → 설정된 생성기다. HTTP 생성도 같은 stage 실행을 사용한다. 마스터 기존 수정은 재구현하지 않았다.

## 재현과 수정

| 재현 | 변경 전 | 변경 후 |
|---|---|---|
| 이전 생성기 락 만료 후 다른 생성기가 락 획득 | 부분 전달이 lease 없이 새 소유자의 결과를 덮고 202 | 부분 전달도 원래 lease를 전달, 503·새 소유자/결과 보존 |
| 1단계 저장 직후 문서 종료 | 기존 scheduled 핸들러에 초융합 복구가 없어 partial 유지 | 기존 10분 tick에서 원래 계산 snapshot·구매 키로 2단계 완료 |
| PG 승인 직후 첫 generate 전에 종료, 복귀 URL·브라우저 영수증 없음 | consultation 0개·생성 미시작 | 기존 주문의 암호화 입력·원래 requestId로 1단계 시작, 다음 tick 2단계 완료 |
| 유효 JSON이지만 공급자 `truncated=true`/`MAX_TOKENS` | 해당 전문가를 완료로 인정 | 미완료로 보존, 해당 전문가만 재시도 |
| 서버 저장본이 생긴 동안 bfcache/화면 복귀 | pageshow 단독으로 재조회하지 않아 마지막 본문 도달 실패 | 기존 복구 함수에 pageshow/focus 연결, 같은 2단계 1회 재개 |
| 영수증 Storage 읽기/쓰기 차단 | 서버가 알려준 구매 키를 ref에 보관해도 Storage 재조회가 null이면 재개 중단 | 계정 변경 시 지워지는 기존 ref의 원래 구매 키/입력으로 재개 |
| 결제 게이트 반환 직후 첫 stream 전 종료 | 구매 키만 보관하고 body=null | 이미 준비한 body도 즉시 보관, 새 문서에서 같은 질문·출생지·언어 복구 |

새 복구 태스크의 권한 검토에서는 증빙 부재 때 기존 증빙 함수가 이용권 소비로 폴백할 수 있는 경로도 실패 fixture로 확인했다. 자동 복구는 정본의 `requireExisting:true`를 사용한다. 고객이 시작하는 원래 이용권 소비 정책은 유지한다.
복구 단계는 저장된 nextStage=1을 우선한다. 여섯 전문가 본문 일부가 있어도 1단계 필수 필드가 미완료이면 2단계로 건너뛰지 않는다.

## A~F mock 근거와 경계

- **A:** 실제 SDK 요청 객체/호출 AST에 초융합 registry 가격·featureKey·원래 redirectUrl/주문/requestId를 넣어 실행했다. 실제 암호화 prepare/read와 scheduled bootstrap을 연결해 승인 후 generate 전 종료를 확인했다. 대기/환불/GIFT/복구 입력 없음/회차 불일치/타 계정 암호문은 생성하지 않는다. 입력 없는 구 주문은 input_required로 표시하고 권리를 보존한다. 공용 모바일 복귀와 초융합 월정석 writer→reader 회귀를 함께 재사용한다. 실제 PG는 호출하지 않았다.
- **B:** 실제 계산 엔진 6체계·서버 타로 6장 → 설정된 mock 생성기의 2단계 → 실제 고객 컴포넌트 저장본 재열람을 연결했다. 화면 본문 36,763자·맺음말 1,021자다. 별도 provider-boundary fixture가 실제 LLM 생성기 검증을 실행하며 필수 그룹, 짧은 출력, 환각, 중복, 생시 미상/출생지 한계, 품질 미달 완료 차단을 검사한다. mock 본문은 실 LLM 품질 증거가 아니다.
- **C:** 실제 route/consultation/생성기에서 부분 checkpoint, 실패 앞 전문가·성공 뒤 전문가, JSON 파싱 실패, 잘림, 429/503, deadline/중단, 저장 throw/null/확인 유실, final 저장 실패, lease 경합을 주입했다. 성공 전문가 5개는 보존하고 실패 전문가만 복구 1회 호출한다. 실제 API/DB 대신 공급자 함수·모델/결제 증빙 경계를 mock했다.
- **D:** Playwright의 새 context/document마다 실제 `/fusion-fortune/?cid=af-saved`를 렌더했다. 390/430/1280px 수평 넘침 0, 마지막 맺음말 줄은 높이 900px의 화면에서 y≈790px로 읽힌다. 미완료 구매가 뒤늦게 발견되는 경우 pageshow(persisted=true)/focus/online/visibilitychange를 각각 단독 주입해 같은 구매의 2단계 stream 1회·결제 0회를 확인했다. 영수증 Storage 차단도 동일하다. 실제 scheduled 메서드 AST가 태스크를 dispatch하고, 실제 stage/저장 경로가 브라우저 없이 완료하는 별도 서버 검사가 있다. 물리 기기 잠금·OS 프로세스 종료는 미검증이다.
- **E:** 품질 통과 → delivery_pending 저장/재조회 확인 → completed 저장/재조회 확인 → 원래 generation attempt commit 순서를 유지했다. 완료 저장 응답 유실은 같은 구매 재조회로 복구한다. 실제 route의 fresh GET은 추가 생성/결제 증빙 확인 0회이며, 타 계정은 404·환불은 403이다. 정상 legacy completed는 원문 보존·생성 0회다. 모델 fixture는 실제 MongoDB 영속성 증거가 아니다.
- **F:** 시작 소스 `20fd46f68016cdfd7e6c5fe085ce8bdfa3f50b34`와 변경 소스를 동일 입력/모델/응답으로 비교했다. 공급자 경계 호출 12→12, 입력 문자(사용자+system prompt) 111,458→111,458, 출력 JSON 문자 52,353→52,353, 모델 gemini-2.5-flash다. 12회는 필수 9그룹+이 fixture의 2단계 품질 보완 3회이며 실제 과금 횟수가 아니다. prompt/가격/분량은 바꾸지 않았다. 공급자 내부 attempts=1·실패 그룹 1회 보완·구매별 그룹 누적 상한 3을 유지하고 자동 복구와 공유한다. 예산 소진은 snapshot reviewRequired와 태스크 로그 budget_exhausted에 남기며 완료하지 않는다. 재열람 LLM/결제/차감 0회. provider usage/청구 토큰은 미측정이며 문자 수와 구분한다.

증거 생성 스크립트는 API 응답/권한을 mock하고 외부 요청을 차단한다. 전체 화면 검사와 함수·모델 fixture 검사 범위를 구분한다. **74구매 키+후속3경로 전체의 A~F 완료를 뜻하지 않는다.** 실결제·과금 LLM·운영 DB·운영 승격은 실행하지 않았다.

## 재검사 명령

```powershell
npm run test:jest -- --runInBand __tests__/worker/fusion-fortune.test.js __tests__/worker/fusion-paid-delivery-route.test.js __tests__/worker/fusion-snapshot-delivery.test.js __tests__/worker/fusion-fortune-stream-termination.test.js __tests__/worker/per-use-proof-roundtrip.test.js
node --test __tests__/ui/direct-payment-sdk-return.behavior.test.js __tests__/ui/payment-resume-context.test.js __tests__/ui/fusion-owner-recovery.behavior.test.js __tests__/ui/fusion-reading-position.behavior.test.js __tests__/ui/fusion-wake-recovery.behavior.test.js __tests__/ui/direct-payment-resume.behavior.test.js
node --require=./scripts/lib/mock-network-guard.cjs scripts/verify-fusion-paid-efficiency.mjs
# 별도 터미널에서 npm run dev (기존 mock 서버 launcher)
node --require=./scripts/lib/mock-network-guard.cjs scripts/verify-fusion-paid-reopen-browser.mjs http://127.0.0.1:13070
npm run check:fast -- --plan
npm run check:fast
```

브라우저 증거의 이번 로컬 위치: `C:\Users\user\.codex\visualizations\2026\09\16\01a0aab7-9788-7971-96a4-1d12b32f514f\fusion-af\evidence.json`, `fusion-closing-390.png`/`fusion-closing-430.png`/`fusion-closing-1280.png`. 파일은 저장소에 커밋하지 않는다.

## 전달

동시 Claude 편집/기존 워크트리가 있어 안전 워크트리 `D:\Development\codedestiny-worktrees\paid-af-mock-20260916-20260916-235632`에서 작업했다. main의 marketing 변경과 다른 워크트리는 보존한다. KST 날짜 변경으로 드러난 사이트맵 drift는 공식 생성기로 갱신하고 별도 커밋 `fe38fdfb54cc2fe596cad5f746b4d0031927d168`으로 분리했다.

최종 `check:fast` exit0: 자동 critical 승격, paid gate 88/88, lint/typecheck/Node/Worker dry-run/정적 가드 성공, Jest 276 suite·3,873/3,873 통과(162.212초). 관련 서버·월정석 5suite 192개와 추가 nextStage 3개, 복귀·화면 재개 Node 32개, 실제 화면 mock, 전후 문자/호출 비교가 통과했다. env parity의 기존 alias 설정 경고 8개는 통과와 구분하며 값은 출력하지 않았다. 검증 SHA·동일 SHA main CI는 push 후 아래에 갱신한다.
