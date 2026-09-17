# 베다점 전문가 상담 유료 전달 검증 — 2026-09-17

대상은 재검증표 11행 `vedic-ai-consultation` 하나다. 활성 진입점은 `/vedic-ai/` → `app/vedic-ai/page.tsx`(SEO metadata, `robots: noindex` 없음 — 사이트맵 대상) → `app/vedic-ai/VedicAiClient.tsx`(`FEATURE_KEY = "vedic-ai-consultation"`, 2944행) → `worker/routes/vedic-ai.js`의 `handleEnsureAccess`(1215행)·`handleStart`(1583행)·`handleResult`(1610행)·`handleBasis`(1672행)다. 결과 화면은 `app/vedic-ai/result/VedicAiResultClient.tsx`가 별도로 담당한다.

## 사전 확인 — "기존 회귀 있음" 문구의 정체

9~10행 문서에서 이미 확인했듯 이 문구는 아직 개별 검사를 하지 않은 행 전체에 반복되는 상용 상태 표시이지, 베다점 상담에 특정된 결함 보고가 아니다. 실제로 `__tests__/worker/vedic-paid-delivery.test.js`를 이번 세션에서 재실행한 결과 116개 시나리오 전부 통과했다.

## A: 실제 입력·계산

`worker/lib/vedic-ai-chart.js`의 `calculateVedicAiChart(env, consultationInput, options)`를 정상 생년월일시(1993-07-21 09:00, 서울 37.5665/126.978, Asia/Seoul)로 직접 실행했다(스크래치패드 스모크 스크립트). 라그나(사자자리/Leo)·문 낙샤트라(Ashlesha)·빔쇼타리 다샤(Venus mahadasha 진행 중)·그라하 9개·바바 12개가 에러 없이 산출됐고 `calculationMeta.source === "swiss-wasm-local"`로 외부 API 미설정 시 로컬 WASM 폴백이 정상 동작함을 확인했다. 실제 계산 엔진에 신규 결함은 없다.

## 발견과 수정

`VedicAiClient.tsx`의 대기 세션 확인 `useEffect`(수정 전 2996~3005행)와 `VedicAiResultClient.tsx`의 재개 `useEffect`(수정 전 72~77행) 둘 다 `online`·`visibilitychange` 두 이벤트만 구독하고 있었다. 5~10행에서 반복 발견·수정된 것과 같은 결함 종류다 — bfcache 복귀(`pageshow`)나 창 재포커스(`focus`)만 발생하는 경우 이미 결제해 진행 중이던 상담(4개 읽기 섹션 + 1개 근거 흐름 그룹, 5그룹 병렬 생성)을 자동으로 다시 조회하지 못하고 수동 새로고침 전까지 멈춘 화면에 머무를 수 있었다.

| 발견 | 기존 상태 | 이번 조치 |
|---|---|---|
| 시작 화면 대기 세션 확인 effect의 이벤트 배선 누락 | `VedicAiClient.tsx` 2996~3005행이 `online`·`visibilitychange`만 구독 | `pageshow`·`focus` 리스너와 대응 cleanup 추가(+10/-2행) |
| 결과 화면 재개 effect의 이벤트 배선 누락 | `VedicAiResultClient.tsx` 72~77행이 `online`·`visibilitychange`만 구독 | `pageshow`·`focus` 리스너와 대응 cleanup 추가(+9/-2행) |

**재현·변이 검증:** 실제 파일의 `useEffect` 콜백 소스를 TypeScript AST로 직접 추출해(문자열 조작이 아님) `vm` 샌드박스에서 실행하는 신규 테스트(`__tests__/ui/vedic-ai-wake-recovery.behavior.test.js`)를 astrology-ai·nakshatra 패턴을 참고해 작성했다. 수정 전 코드에 대해 먼저 실행해 두 테스트 모두 `window:pageshow handler must be registered`에서 정확히 실패함을 확인한 뒤(2/2 fail), 수정을 적용해 2/2 통과로 전환했다 — 이 테스트가 실제로 무는 가드임을 실측했다. 가드(숨김 문서·`submitBusyRef` 진행 중 잠금·stale owner)와 cleanup의 리스너 전체 해제도 함께 검증한다.

## 대조 결과 (백엔드는 기존 코드가 이미 올바르게 동작함을 코드 정독으로 확인 — 수정 없음)

`worker/routes/vedic-ai.js`를 정독하고 `__tests__/worker/vedic-paid-delivery.test.js`의 기존 116개 시나리오와 1:1로 대응하는지 대조했다.

- **섹션 계약(`VEDIC_SECTION_GROUPS`, 90행):** 읽기 섹션 4개(카르마의 기원·물질적 성취와 다르마·인연과 영혼의 파트너·현재의 다샤 흐름과 우파야, 각 4,400~6,000자) + 근거 흐름 1그룹(2,600~4,200자, 분량 합계 제외) = 5그룹 병렬 생성. 전체 하한/상한은 `MIN_INITIAL_READING_CHARS = 15000` / `MAX_INITIAL_READING_CHARS = 25000`(41~42행)이며, 주석에 "한 호출로 묶으면 모델이 6천자 근처에서 멈춰 total_body_too_short repair가 반복됐다"는 이전 실패 경험이 근거로 남아 있다 — 5~10행과 동일한 설계 클래스(그룹 분할+체크포인트+부족분 재시도)다.
- **접근 판정(`handleEnsureAccess`, 1215행):** 입력·계산 가능성 검증 → pass/월정석/코인 커버리지 판정 순서를 확인했다.
- **생성·저장(`handleStart`, 1583행):** `resumeSessionId` 기반 멱등 재개, lease 기반 동시성 직렬화(`startLocks`, 127행), 완료 직전 접근 재검증 후 차감, 저장 확인 절차가 코드에 존재함을 확인했다.
- **조회(`handleResult`, 1610행):** 생성 중/부분/`delivery_pending`에서 202 응답과 재검증된 접근 판정, `isStoredPaidResultRevoked`(1664행)를 통한 취소 증거 차단을 확인했다.
- **가격표:** `worker/lib/paid-feature-registry.js:213`의 `{ cost: 300, amountKRW: 30000, reason: "베다점 전문가 상담" }` — 체크리스트에 기재된 300코인/30,000원과 일치한다.
- **교차 상품 저장·권한 스위트:** `vedic-ai-consultation`은 `__tests__/fixtures/paid-completed-result-access-fixtures.mjs` 11번째 항목에 이미 `{ products: ["vedic-ai-consultation"], file: "worker/routes/vedic-ai.js", marker: "isStoredPaidResultRevoked" }`로 등록돼 있어 `paid-completed-result-access.test.js`의 완료본 재접근 차단 시나리오를 그대로 상속받는다 — 이번 세션에서 필터 재실행으로 통과를 재확인했다(신규 케이스 추가는 하지 않음). 이전 조사에서 이 fixtures 파일에 "vedic" 문자열이 없어 등록 공백을 의심했으나, 실제로는 featureKey가 이 파일에서 import되는 정상 구조였음을 직접 열람해 정정했다(오진 방지).

## A~F mock 근거와 경계

- **A 구매·계산:** `paid-feature-registry.js:213`(300코인/30,000원) 대조, `FEATURE_KEY` 캡처 일치 확인. `calculateVedicAiChart`를 정상 입력으로 직접 실행해 라그나·나크샤트라·다샤·그라하·바바 정상 산출을 실측했다(위). 실제 PG는 호출하지 않았다.
- **B 생성:** 5그룹(읽기 4 + 근거 흐름 1) 병렬+체크포인트+부족분 재시도 구조를 코드 정독으로 확인, 기존 워커 회귀 116개 재실행으로 재확인. 이번 라운드에 새로 발견된 백엔드 생성 로직 결함은 없다.
- **C 장애:** 새로 주입하지 않았다. 기존 워커 테스트의 짧은 섹션 컷오프, 저장 실패, lease 만료, 동시 요청 직렬화 시나리오 재실행으로 확인했다.
- **D 전달:** 프런트 재개 배선 결함을 이번에 재현·수정·변이검증했다(위). 실제 화면·모바일 뷰포트 렌더링 재현은 하지 않았다. **D 실화면 증거는 여전히 없다(경계, 5~10행과 동일).**
- **E 저장·권한:** `handleResult`의 소유자 범위 조회·`isStoredPaidResultRevoked` 취소 증거 차단을 코드 정독 + 기존 워커 회귀 + 교차 상품 스위트 재실행으로 확인했다.
- **F 예산·운영:** 기존 워커 테스트가 재확인 이후 정확히 1회 차감·재시도 경로 추가 LLM 호출 없음을 이미 담고 있어 재실행으로 재확인했다. **전용 전후 호출 수 diff 스크립트나 예산 실측은 만들지 않았다(경계, 5~10행과 동일).**

## 재검사 명령과 결과

수정 파일 3개(`app/vedic-ai/VedicAiClient.tsx` +10/-2행, `app/vedic-ai/result/VedicAiResultClient.tsx` +9/-2행, `__tests__/ui/vedic-ai-wake-recovery.behavior.test.js` 신규 98행):

```bash
node --test __tests__/ui/vedic-ai-wake-recovery.behavior.test.js

node scripts/run-mock-tests.mjs jest \
  __tests__/worker/vedic-paid-delivery.test.js \
  __tests__/worker/paid-completed-result-access.test.js \
  -t "vedic-ai-consultation" --runInBand

npm run sitemap:generate
npm run check:fast
```

결과: `node --test` **2 pass / 2 total, 0 fail**(신규). 변이 검증(수정 되돌리기 → 2/2 `window:pageshow handler must be registered`로 정확히 실패 → 복원 → 2/2 재통과)도 확인했다(위 "발견과 수정" 참고). 워커 jest는 vedic-paid-delivery **116/116 통과** + paid-completed-result-access 필터 매칭 통과(무관 상품은 스킵). `sitemap:generate`는 워크트리 커밋 시점에 `/vedic-ai/` 항목 1개(signature·lastmod)만 갱신됐고(다른 상품 영향 없음), main 병합 후 재실행에서는 갱신 0건으로 드리프트 없음을 재확인했다.

`npm run check:fast`는 결제 인접 파일 수정으로 RED 등급 자동 승격돼 전체 게이트를 끝까지 실행했다 — **전부 통과**: `lint` 0, `verify:sitemap-drift` OK(URL 1,269개), `typecheck` 0, `test:node` **1,407/1,407**, `run-paid-gate-suite` **88/88**, `build:worker` dry-run 정상, `verify:entry-encoding` OK, `test:jest` **Test Suites: 277 passed, 277 total / Tests: 3,881 passed, 3,881 total**, 종료 코드 0.

## 전달

동시 편집 세션이 있어 워크트리(`D:\Development\codedestiny-worktrees\vedic-ai-mock-20260917-20260917-172000`)에서 작업했다. 수정 파일 3개 + sitemap 재생성 산출물 5개(`config/sitemap-lastmod.json`·`public/sitemap-ko.xml`·`public/sitemap.xml`·`sitemap-ko.xml`·`sitemap.xml`)만 스테이징해 커밋 `108282e34`(`fix(vedic-ai): 화면 재개 pageshow/focus 리스너 추가 + sitemap 재생성`)를 생성했다. `config/payment-freeze.json`은 이 세션이 건드리지 않은 기존 dirty 상태(대화 시작 시점부터 존재)라 커밋에서 명시적으로 제외했다.

main 워킹 디렉터리에서 `git fetch origin main`으로 동료 세션이 먼저 push한 문서 커밋 1개(`96bdd7a11`, zh-TW 허브 완료 반영)를 확인하고, 워크트리에서 `git merge origin/main`으로 병합했다(머지 커밋 `e215e541a`, 충돌 없음 — docs/handoff 파일 2개만 병합). 병합 후 `sitemap:generate` 재실행으로 드리프트 없음을 재확인한 뒤 `git push origin HEAD:main`(`96bdd7a11..e215e541a`)했다.

push 직후 같은 SHA(`e215e541a`)의 GitHub CI를 `gh api .../check-runs`로 직접 실측했다(백그라운드 `Monitor` 폴링과 별도로 최종 확인).
