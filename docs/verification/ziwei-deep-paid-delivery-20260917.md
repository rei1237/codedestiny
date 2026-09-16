# 자미두수 심층 리포트 유료 전달 — 2026-09-17

재검증표 4행 `ziwei-deep-pdf` 하나다. 실제 진입점은 `/ziwei/chart/` → `AdvancedZiweiSectionV2` → `ZiweiDeepPdfPanel` → prepare/공용 결제 게이트 → `/api/ziwei-deep-report/generate`다. 독립 `/ziwei-ai/` 상품은 아직 이번 차례에 검사하지 않았다.

## 재현과 수정

| 재현 | 변경 전 | 변경 후 |
|---|---|---|
| 저장 완료 뒤 공용 실행 완료 검증 | ID만 전달해 실제 검증기 `PDF_ARTIFACT_MISSING` | 확인된 15장 본문을 공용 검증기가 읽는 content 필드로 전달 |
| 전액 취소된 completed의 POST 재열람 | 구매 키/저장 ID 양쪽 모두 200 | GET과 같은 원래 구매 취소 판정, 403 |
| pageshow 또는 focus만 발생 | 원래 서버 구매 재조회 없음 | 기존 재개 함수/정리 경로에 두 이벤트 연결 |
| 첫 4장 저장 뒤 문서 종료, 승인 뒤 첫 생성 전 종료 | 기존 scheduled에 실행자가 없어 partial/미시작 | 기존 10분 tick에서 동일 batch·계산·구매 키로 재개, 암호화된 승인 입력 bootstrap |
| completed 저장 재조회 응답 유실 | 본문은 저장됐지만 원래 실행 완료가 영구 누락 | executionSyncPending을 확인 저장하고 같은 키의 실행 완료를 GET/POST/크론에서 복구 |
| 모든 Storage get/set/remove 차단 | 선택 프로필 읽기 예외로 고객 화면 오류 경계 | 선택 프로필 읽기만 null로 종료, 수동 입력·서버 구매 복구 가능, 타 계정 global 폴백 금지 |
| 충분한 본문과 mock/fallback 또는 공급자 잘림 표시 | isMock·staging-mock/fallback·MAX_TOKENS/length 5case 모두 장 완료 | 실패 장으로 보존/재시도, 정상 Workers AI 전체 본문은 그대로 완료 |

공용 결제·공급자·실행/모델 경계를 mock했다. 실제 PG 취소나 운영 환불을 실행해 확인한 결과가 아니다. 기존 가격 registry·15장/장별 최소 본문·프롬프트·계산·언어·이용권/월정석/단건 계약은 유지한다. 인증/API 결제/DB 스키마와 cron 설정을 변경하지 않았다. 공용 프로필 변경은 선택적 저장본 읽기의 예외 경계만 다룬다.

## A~F mock 근거

- **A:** 실제 SDK 요청 객체와 SDK 호출 AST를 자미두수 가격 키·원래 고객 페이지·주문·회차로 실행했다. 실제 prepareResumeContext/readOrderResumeContext 암호화로 승인 후 generate 전 종료를 연결했다. 미승인/환불/GIFT·다른 기능/회차/계정 암호문·입력 없음은 생성하지 않는다. 입력 없는 과거 주문은 input_required이며 구매를 취소하지 않는다. 실제 월정석 writer→원래 회차의 canonical proof reader 왕복을 추가했다. 기존 공용 지급 지연·새 탭/Storage 없는 복귀 계약은 재사용한다.
- **B:** 실제 입력 정규화·12궁 계산·15장 정의/프롬프트·실제 route의 4+4+4+3 checkpoint·완료 검증을 실행했다. 생시 미상은 실제 정오 기준 uncertainty와 모든 장 프롬프트의 안내를 검사했다. 화면 mock 본문은 공백 제외 53,620자/원문 68,425자다. 짧은 본문·반복 문장·truncated 출력은 장 완료가 아니며 안내 fallback은 전체 완료를 통과하지 않는다. 계산 객체는 저장된 chartSnapshot을 재사용하고 LLM 응답은 본문에만 들어간다. 실 LLM의 의미/사실 정확도는 미검증이다.
- **C:** 앞 장 실패/뒤 장 성공, 실제 생성기의 429/503/공급자 거절/불확실 timeout 뒤 복구, 출력 잘림·짧은 출력, checkpoint null/throw, 완료 null/재조회 유실, 동시 요청·활성 락·이전 소유자 쓰기/finally·입력 변경·계정 변경·취소를 검사했다. 정상 장은 보존하고 실패 장만 다시 생성한다. 이 상품의 공급자 응답은 장별 일반 텍스트이며 구조화 JSON manifest 상품으로 취급하지 않았다. 오류 때문에 원래 증빙 없는 새 이용권 소비로 폴백하지 않는다.
- **D:** 새 Playwright context/document마다 실제 `/ziwei/chart/` 입력 화면에서 계산하고 실제 고객 패널의 저장본을 마지막 장 펼친 본문까지 읽었다. 390/430/1280px 수평 넘침 0, 마지막 줄은 높이 900px 안 y≈894px다. pageshow(persisted=true)/focus/online/visibilitychange 단독과 모든 Storage 차단을 각각 검사했다. 첫 4장 다음의 같은 결과 ID로 3 batch·총 15 공급자 경계 호출·금융 mutation 0회다. 실제 scheduled 메서드 AST도 브라우저 없는 동안 같은 stage 실행을 dispatch해 15장을 완성했다. 물리 OS 잠금/종료와 실 기기는 미검증이다.
- **E:** 품질→delivery_pending 저장/확인→completed+실행 미동기화 표시 저장/확인→원래 실행 완료→동기화 표시 해제/확인 순서다. 확인 응답 유실은 같은 결과로 재조회/실행 완료를 복구한다. 새 문서의 정상 저장본 GET은 추가 생성/원래 실행 시작 0회이며 계정 404·환불 403을 검사했다. 정상 구 완료본은 새 분량/현재 잔액을 요구하지 않는다. 실제 고객 PDF 버튼으로 62페이지/1,716,466바이트 파일을 내려받았고, 15장 전체 제목/본문 추출 일치·페이지 밖 텍스트 영역 0·62장 렌더 배치를 확인했다. mock CSP가 외부 글꼴 fetch를 막으므로 공개 Mulmaru/Paperlogy 바이트를 같은 localhost 경로의 fixture로 제공했다. 제품 PDF 코드는 수정하지 않았다. Poppler는 Adobe-Identity-H 경고를 냈지만 한글 렌더/추출은 정상이다. 모델 fixture와 PDF 내보내기는 실제 Mongo 영속성/운영 CORS 증거가 아니다.
- **F:** 시작 SHA 20fd46f68016cdfd7e6c5fe085ce8bdfa3f50b34와 동일 입력/모델 기본값(gemini-2.5-flash)/모의 응답을 비교했다. 성공 호출 15→15, 생성기에 준 prompt 문자 36,012→36,012, 출력 원문 68,425→68,425다. 공급자 HTTP payload/usage/청구 토큰은 미측정이다. 장별 누적 상한 3·4장 병렬·60초 LLM budget을 고객과 크론이 공유한다. 기본 공용 공급자 설정은 Gemini 최대3(400/900ms backoff)+Workers 모델2까지이므로 장 호출 최대45·공급자 시도 최대225의 이론 상한이며 시간 제한/캐시와 env 모델 설정에 따라 달라진다. 성공 장/재열람은 재호출하지 않는다. 예산 소진은 reviewRequired+budget_exhausted 집계이며 완료나 추정 환불로 바꾸지 않는다. 기존 checkpoint-refund-guard의 자미두수 recoverable 보호를 유지한다.

실결제·과금 LLM·운영 DB·운영 승격은 실행하지 않았다. 4행 외 나머지 상품을 이 기록으로 완료 처리하지 않는다.

## 검증·전달

수정 파일(source `acdf20c386004505e643fd3db7976f640b655fdf`):

- Worker: `worker/routes/ziwei-deep-report.js`, `worker/lib/ziwei-deep-report-recovery-task.js`, `worker/index.js` — 같은 구매의 batch/크론 복구·원래 실행 완료 확인.
- 고객 화면: `app/components/ziwei/ZiweiDeepPdfPanel.tsx`, `app/_lib/profile-card-storage.ts` — 화면 재개 이벤트와 선택 프로필 Storage 예외 경계.
- 행동/증빙 검사: `__tests__/ui/ziwei-deep-paid-delivery.behavior.test.js`, `__tests__/ui/paid-report-storage.behavior.test.js`, `__tests__/ui/direct-payment-sdk-return.behavior.test.js`, `__tests__/worker/per-use-proof-roundtrip.test.js`, `__tests__/worker/fusion-paid-delivery-route.test.js`.
- 고객 화면 재검사: `scripts/verify-ziwei-deep-paid-reopen-browser.mjs`.
- 생성 원장: `config/sitemap-lastmod.json` — 실제 수정에 따른 signature 갱신만, URL/날짜 유지.
- 기록: `docs/handoff/paid-llm-service-delivery-20260916.md`, `docs/verification/paid-llm-service-checklist-20260916.md`, 이 문서.

```powershell
node --test __tests__/ui/ziwei-deep-paid-delivery.behavior.test.js __tests__/ui/paid-report-storage.behavior.test.js __tests__/ui/direct-payment-sdk-return.behavior.test.js
npm run test:jest -- --runInBand __tests__/worker/per-use-proof-roundtrip.test.js __tests__/worker/fusion-paid-delivery-route.test.js
# npm run dev가 기존 mock launcher로 실행된 별도 터미널 필요
node --require=./scripts/lib/mock-network-guard.cjs scripts/verify-ziwei-deep-paid-reopen-browser.mjs http://127.0.0.1:13070
# 별도 output/fonts/Mulmaru.ttf, Paperlogy-5Medium.ttf fixture 필요
node --require=./scripts/lib/mock-network-guard.cjs scripts/verify-ziwei-deep-paid-reopen-browser.mjs http://127.0.0.1:13070 'C:\Users\user\.codex\visualizations\2026\09\16\01a0aab7-9788-7971-96a4-1d12b32f514f\ziwei-af' 20fd46f68016cdfd7e6c5fe085ce8bdfa3f50b34 --pdf-only
npm run verify:ziwei-deep-report-flow
npm run verify:cron-mongo-op-coverage
npm run verify:no-nested-retry
npm run verify:mongo-query-index-shapes
npm run check:fast -- --plan
npm run check:fast
```

관련 Node 62개·Jest 125개·8개 실제 고객 화면/재개 mock case와 PDF 다운로드/추출/렌더 통과. 다른 세션의 main 5aae0c6fd를 반영한 뒤 실제 화면 8개도 재검사해 통과했다. 첫 check:fast는 결제 88/88 뒤 sitemap 원장 드리프트로 exit1이었다. 공식 sitemap:generate로 소스 signature 35개를 갱신했으며 URL/lastmod 날짜는 유지, verify:sitemap-drift 1,265 URL 통과 후 check:fast를 재실행했다. 기존 AST 저장 fixture에는 새 DB guard dependency만 mock했다. 단건/월정석 가격 writer나 권한 테스트의 조건을 무력화하지 않았다. 출력과 임시 스크린샷은 `C:\Users\user\.codex\visualizations\2026\09\16\01a0aab7-9788-7971-96a4-1d12b32f514f\ziwei-af\evidence.json`, ziwei-closing-390/430/1280.png, pdf-evidence.json/pdf-qa.json/pdf-render/ziwei-*.png이며 저장소에는 커밋하지 않는다. 무료 계산 영역의 기존 React 중복 key 경고와 차단한 외부 자원 console 오류는 유료 전달 오류로 판정하지 않았으며 pageerror는 0이다.

check:fast는 critical/failClosed로 결제 88/88·lint/typecheck·Node 1,391·Worker dry-run·276 suite/3,874 Jest(173.008초), exit0이었다. 마지막 공급자 완료 표시 보완은 변경 전 5case 실패를 남겼고, 정상 Workers AI를 포함한 관련 Node 62개 및 verify:ziwei-deep-report-flow를 현재 소스로 다시 검사해 통과했다. 전체 검사 실행 중 마지막 조건을 보완했으므로 Node 전체 단계의 1,391개를 추가 6개 포함 결과라고 표현하지 않는다. 동일 SHA main CI에서 최종 소스 전체를 확인한다.

마지막 화면 검사의 첫 실행은 전체 Jest와 겹친 동안 focus case에서 입력 폼 mount를 찾지 못해 timeout이었다. 코드를 더 바꾸지 않고 전체 검사 종료 뒤 같은 화면 스크립트를 독립 실행했으며 8case·총 API mock 요청 72개·pageerror 0으로 통과했다(browser-final-serial.log). 환경이 안정된 실행에서 같은 오류는 재현되지 않아 별도 UI 수정은 하지 않았다.

source `acdf20c386004505e643fd3db7976f640b655fdf`를 main fast-forward/push했고 [동일 SHA main CI](https://github.com/rei1237/codedestiny/actions/runs/35123293719)는 모든 lane·CI required success다. 최종 소스의 CI Node 1,397/Jest 276 suite·3,874개도 통과했다. root 반영 전후 dirty 84개·경로·파일별 SHA256이 같았다(root-preservation.json). 실결제·청구 LLM·운영 DB·운영 승격은 실행하지 않았다.

CI 대기 중 타 세션의 Threads 작업 21개 파일을 main `af79c733ee8da1530b8497a07b8d7de05121867b`에서 보존/반영했다. 기존 자미두수 scheduled VM의 다른 작업 mock에 새 runThreadsDailyJobs만 없어 Node 1개가 실패했다. 그 의존성만 no-op으로 추가한 뒤 62개가 통과했다. 실제 자미두수 route/크론/증빙은 그대로 실행하며 SNS 작업은 실행하지 않는다. 동기화의 공식 check:fast는 critical·Node 1,397·Jest 276 suite/3,874개(exit0)다. 이후 handoff 계약 검사에서 새 Threads 문서의 누락된 frontmatter를 재현해 머리말 6줄만 별도 보완했다. 본문은 그대로이며 152개 문서 계약 검사가 통과했다. main 반영 직전에 다른 세션이 같은 mock 보완과 LLM inventory 갱신을 `851cbe758c2833d02d0c8bf5a3a9002f0688b537`로 먼저 전달했다. 이를 보존해 안전 워크트리를 rebase했고 중복 테스트 수정은 사라졌다. 남은 문서만 전달해 동일 SHA CI 후 완료 칸을 갱신한다.

타 세션 후속 SHA `851cbe758c2833d02d0c8bf5a3a9002f0688b537`의 CI 35125534991은 Typecheck/lint·Critical·Build 성공, Static만 같은 Threads 문서 frontmatter 1건으로 실패했다(threads-sync-ci-failure.log). 머리말 보완과 검증 기록은 `1a622b55595daa7ed5cf1323d49c6a5415dd55d0`로 main fast-forward/push했다. root dirty 84개와 파일별 SHA256은 반영 전후 같았다(fixture-root-preservation.json). 코드의 중복 수정이나 SNS 실제 실행은 없었다.

문서 전달 SHA `1a622b55595daa7ed5cf1323d49c6a5415dd55d0`의 [동일 SHA main CI 35125744683](https://github.com/rei1237/codedestiny/actions/runs/35125744683)는 Risk·Static·CI required success다. Type/Build/Critical은 문서 tier로 skipped이며 source `acdf20c386004505e643fd3db7976f640b655fdf`의 전체 lane 성공과 구분한다. 4행을 A~F mock 완료로 체크했다. 사용자 요청에 따라 다음 네오 5행부터의 70구매 키+후속3경로는 인수인계에 남겼고 이번 완료로 처리하지 않는다. 이 최종 체크/인수인계 변경도 문서 gate·commit/push·동일 SHA main CI까지 전달한다.
