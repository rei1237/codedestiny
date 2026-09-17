# 연애 비책 전문가 상담 유료 전달 검증 — 2026-09-18

대상은 재검증표 14행 `love-secret-ai-consultation` 하나다. 활성 진입점은 `/love-secret-ai/` → `app/love-secret-ai/LoveSecretAiRouteClient.tsx`(순수 `next/dynamic` 코드 스플릿 래퍼, 정적 로딩 셸만 포함) → `app/love-secret-ai/LoveSecretAiClient.tsx`(`FEATURE_KEY = "love-secret-ai-consultation"`) → `worker/routes/love-secret-ai.js`의 `handleStart`(1396행)·`handleResult`(1638행)·`handleMessage`(1725행, 후속 질문) → 6그룹 병렬 생성기(`LOVE_SECRET_AI_GROUPS`, 28절)다. 결과 화면은 `app/love-secret-ai/result/LoveSecretAiResultClient.tsx`가 담당하며, 그 하위에 `LoveSecretChecklist.tsx`·`LoveSecretShareCard.tsx` 2개 보조 화면이 있다(13행 카르마에는 없던 구성). 이전 사주·자미·네오·나크샤트라·점성술·베다·숙요·카르마 행과 같은 뼈대의 client-side 깨어남 복구 버그를 여기서도 재현·수정했고, 핸드오프가 명시적으로 경고한 "필수 절"(6그룹 전원 성공) 품질 게이트의 실측 테스트 공백을 채웠다. 다른 세션의 marketing/payment-freeze 등 무관한 미커밋 변경은 건드리지 않았다.

## 발견과 수정

실제 diff로 대조한 결과 두 effect의 원래 상태는 서로 달랐다. `LoveSecretAiClient.tsx`의 시작 화면 재개 확인(discovery) effect는 `discoveryEpoch`를 갱신하는 이벤트 리스너가 애초에 하나도 없었다(별도 데이터 조회 effect가 `discoveryEpoch` 변경에 반응할 뿐, 그 값을 바꾸는 외부 트리거가 없었다). `LoveSecretAiResultClient.tsx`의 결과 폴링(polling) effect는 `visibilitychange` 하나만 구독했다(`online`은 이 화면에서 원래도 다루지 않는다). 두 경우 모두 bfcache 복귀(`pageshow`)나 창 재포커스(`focus`)만 발생하면 기존 리스너가 반응하지 않거나(혹은 애초에 없어서), 이미 결제해 진행 중이던 6그룹 분할 생성 상담이 자동으로 재조회되지 않고 생성 중 화면에 멈춰 있을 수 있었다.

| 발견 | 기존 상태 | 이번 조치 |
|---|---|---|
| 시작 화면 discovery effect에 재개 리스너 부재 | `LoveSecretAiClient.tsx`는 `discoveryEpoch`를 갱신하는 이벤트 리스너가 전혀 없었음(데이터 조회 effect는 `discoveryEpoch` 변경에만 반응, 외부 트리거 없음) | `online`·`visibilitychange`·`pageshow`·`focus` 4개를 구독하는 새 effect와 cleanup 추가 |
| 결과 화면 polling effect의 이벤트 배선 누락 | `LoveSecretAiResultClient.tsx`가 `visibilitychange`만 구독(`online`은 원래도 다루지 않음) | 같은 effect에 `pageshow`·`focus` 리스너와 대응 cleanup 추가 |

`document.hidden`/`captureDeliveryScope` stale-owner 가드는 그대로이며 회귀 없음(아래 D 검사로 확인).

**재현·변이 검증:** 실제 파일의 `useEffect` 콜백 소스를 TypeScript AST로 직접 추출해(문자열 조작이 아님) `vm` 샌드박스에서 실행하는 신규 테스트(`__tests__/ui/love-secret-ai-wake-recovery.behavior.test.js`, 108행)를 작성했다. 시작 화면 테스트는 `pageshow`·`focus`·`online`·`visibilitychange` 4개 이벤트 모두 `setDiscoveryEpoch`를 실제로 증가시키는지, 문서가 숨겨진 동안은 증가시키지 않는지, cleanup이 리스너를 전부 제거하는지 확인한다. 결과 화면 테스트는 마운트 시 1회 조회 후 `pageshow`·`focus`·`visibilitychange` 3개 이벤트에서 재조회하는지, 숨김 문서·stale owner(`captureDeliveryScope`가 false 반환) 상태에서는 재조회하지 않는지, cleanup 이후에는 이벤트가 들어와도 재조회하지 않는지까지 확인한다.

## 대조 결과 (기존 코드가 이미 올바름 — 수정 없음)

- **라우트 분리 구조:** `LoveSecretAiRouteClient.tsx`(40행)는 `next/dynamic(() => import("./LoveSecretAiClient"), { ssr: false })`만 감싸는 얇은 코드 스플릿 래퍼이며 정적 로딩 셸(`LoveSecretAiShell`) 외에 별도 상태·이펙트가 없다 — 13행 카르마와 동일한 전례를 그대로 따른다. 수정 대상은 정확히 시작·결과 화면 2개 파일뿐임을 확인했다.
- **`LoveSecretChecklist.tsx`(393행, 13행에는 없던 신규 화면 파일):** props로 이미 전달된 `secrets`·`sevenDayGuide`·`consultationKey`만 사용하며, 두 `useEffect` 모두 (1) `languagechange`/`cd:locale-ready` 로케일 동기화, (2) `consultationKey` 기반 `localStorage` 체크리스트 상태 마운트 1회 로드다. 서버 폴링·생성 상태 의존이 전혀 없어 깨어남 복구 결함이 적용될 여지가 없다 — 수정 없음.
- **`LoveSecretShareCard.tsx`(130행, 마찬가지로 신규 화면 파일):** `useEffect`·`addEventListener`·`fetch(`·`authFetch`·`useState` 전부 0건. 순수 프레젠테이션 컴포넌트다 — 수정 없음. 핸드오프가 "아직 미정독, 범위가 13행보다 넓을 수 있다"고 경고한 부분을 실측으로 "해당 없음"으로 확정했다.
- **"필수 절" 게이트가 실제로 테스트되는지:** 기존 `__tests__/ui/love-secret-paid-delivery.behavior.test.js`(214행)는 `generateFirstConsultation`의 그룹 재사용·호출 제한 로직을 검증하지만, 178~181행에서 `assembleLoveSecretConsultation`·`validateLoveSecretConsultation`·`mapLoveSecretIssuesToGroups`·`countLoveSecretConsultationBodyChars` 4개 함수를 전부 **모킹**해 주입한다 — 실제 게이트 로직은 한 번도 실행되지 않는다. 8행(인생 총운)에서 공유 컴포넌트의 핵심 게이트가 테스트에서 한 번도 실행된 적 없었던 전례와 정확히 같은 공백이다. "공유 모듈이라 검증됐다"고 가정하지 않고 직접 확인한 결과이며, 아래 신규 테스트로 공백을 메웠다.
- **후속 질문 부모 내역·취소 증빙 재확인 (이번 행의 보존 특성):** `handleResult`(GET, 1638행)는 `isStoredPaidResultRevoked`(`worker/lib/paid-result-revocation.js:61`)를 직접 호출한다. `handleMessage`(POST, 1725행)는 자체 로직 없이 `worker/lib/expert-follow-up-delivery.js`의 `deliverExpertFollowUp`에 전량 위임한다(1743행) — 이 공유 모듈은 13행 카르마도 동일하게 import해서 쓴다. 두 GET/POST 경로가 이름이 다른 함수(`isStoredPaidResultRevoked` vs `isPaidResultRevoked`)를 쓰길래 처음엔 불일치를 의심했으나, `paid-result-revocation.js`를 직접 읽어 `isStoredPaidResultRevoked`가 완료본 레코드의 19개 증거 경로(`RESULT_EVIDENCE_PATHS`)에서 토큰을 뽑아 **동일한** `isPaidResultRevoked` 코어 함수(같은 4개 컬렉션·같은 상태 매칭)에 위임하는 얇은 래퍼임을 확인했다. `deliverExpertFollowUp`은 `idempotencyKey`·`paymentId`·`id` 3개로 좁힌 토큰으로 생성 **전**과 저장 **직전** 두 차례 `isPaidResultRevoked`를 호출한다(더 보수적) — 토큰 집합은 다르지만 코어 판정 로직은 완전히 동일하다. 전용 테스트 `__tests__/worker/expert-follow-up-delivery.test.js` 101행이 `test.each(['karma-destiny-ai', 'love-secret-ai'])`로 **연애 비책을 이름으로 명시**해 파라미터화하고 있어 "재사용할 수 있다"는 핸드오프의 주장이 구조적 추정이 아니라 실측으로 확인됐다.
- **가격 정본:** `worker/lib/paid-feature-registry.js:328`에 `"love-secret-ai-consultation": { cost: 300, amountKRW: 30000, reason: "연애 비책 전문가 상담" }`가 존재함을 확인했다. `love-secret-ai.js`의 `getPricing()`이 실제로 호출하는 `worker/lib/billing-feature-registry.js`는 소스 주석("가격(cost)과 사유(reason)는 FEATURE_KEY_PRICE_TABLE 에서 파생한다 — 여기에 숫자를 다시 적으면 정본과 조용히 갈라진다")으로 `paid-feature-registry.js`에서 파생만 하는 분류 계층임을 확인했다 — 별도 정본이 아니므로 불일치 없음.

## A~F mock 근거와 경계

- **A 구매:** 위 가격 정본 대조 완료. 기존 `love-secret-paid-delivery.behavior.test.js`의 `for (accessType of ['pass','subscription','paid'])` 3변형("여섯 묶음 저장·같은 요청 재개·완료 뒤 사용 기록", "최종 저장 null은 환불 없이 503, 보존된 본문 재사용")을 재실행해 이용권·월정석·단건 3경로 전부 원래 멱등 키로 재개되고 저장 실패 시 무차감임을 재확인했다. 실제 PG는 호출하지 않았다.
- **B 생성:** `npm run verify:love-secret-ai-flow` 재실행 — `[verify-love-secret-ai-flow] groups=6 sections=28 body chars=23835` / `PASS`로 6그룹·28절 구조와 하한(20,000자) 충족을 확인했다. 신규 `__tests__/worker/love-secret-ai-prompt.gate.test.js`(4개 테스트, 모킹 없이 실제 `assembleLoveSecretConsultation`/`validateLoveSecretConsultation`/`mapLoveSecretIssuesToGroups`/`countLoveSecretConsultationBodyChars` 직접 호출)로 (1) 6그룹 전원 성공 시 무이슈·비degraded, (2) 한 그룹(`partner`) 전체 실패 시 `SECTION_EMPTY:partner` 하나만 발생하고 수리 대상도 그 그룹뿐, (3) 한 그룹(`timing`)이 자기 최소치의 70% 미만이면 `SECTION_MIN_CHARS:timing`만 발생, (4) `countLoveSecretConsultationBodyChars`의 pdfSections→sections→answer 우선순위를 검증했다. **변이 검증:** `validateLoveSecretConsultation`의 `SECTION_EMPTY`/`SECTION_MIN_CHARS` `issues.push` 를 일시적으로 early-return으로 바꿔 (2)·(3) 테스트가 정확히 실패로 전환됨을 확인한 뒤 원복했고, `git diff --stat`으로 무변경 원복을 확인했다.
- **C 장애:** 새로 주입하지 않았다. 기존 `love-secret-paid-delivery.behavior.test.js`의 "체크포인트 저장 실패는 LLM 호출 전에 중단하며 환불로 흐르지 않는다", "재개는 계정 소유권과 현재 결제 권한을 다시 확인한다", "같은 키의 입력 변경은 409로 거부한다", "동시 요청은 같은 문서를 잠그고 한 묶음만 생성한다", "실제 연애 생성기는 저장한 그룹을 재사용하고 요청당 호출을 제한한다"(실패/성공 2변형)를 재실행해 통과를 재확인했다. 이번 수정은 이 경로를 건드리지 않는다.
- **D 전달:** 실제 클라이언트 파일 2개에서 TypeScript AST로 discovery/polling effect 본문을 추출해 `vm.runInNewContext`로 실행하는 행동 검사(`__tests__/ui/love-secret-ai-wake-recovery.behavior.test.js`, 신규 108행)를 작성했다. 기존 UI 회귀 `__tests__/ui/love-secret-paid-delivery.behavior.test.js`(18건)와 함께 실행해 **20/20 통과**(무회귀)를 재확인했다. **실제 브라우저 렌더(390/430px·데스크톱 화면 증거)는 이번 차례에 만들지 않았다** — 함수 단위 행동 검사로만 확인했으며, 이전 행들과 동일한 경계다.
- **E 저장·권한:** 새로 주입하지 않았다. `paid-result-revocation.js` 직접 정독으로 GET(`isStoredPaidResultRevoked`)·POST(공유 모듈의 `isPaidResultRevoked`, 생성 전/저장 직전 2회) 두 경로가 같은 코어 로직으로 귀결됨을 확인했다. `expert-follow-up-delivery.test.js`(`love-secret-ai`를 이름으로 파라미터화)를 재실행해 **12/12 통과**를 재확인했다.
- **F 예산·운영 확인:** 별도 전후 호출/문자 비교 스크립트는 새로 만들지 않았다. `LOVE_SECRET_AI_GROUP_TIMEOUT_MS`/`LOVE_SECRET_AI_REPAIR_TIMEOUT_MS`/`LOVE_SECRET_AI_REPAIR_MIN_REMAINING_MS` 등 시간 예산 상수는 코드에서 확인했으나 카르마처럼 "챕터당 정확히 N회" 형태의 하드 카운트 상한을 이번에 새로 실측하지는 않았다 — 이번 수정이 클라이언트 이벤트 리스너 2개 추가에 한정돼 provider 호출 경로를 바꾸지 않는다는 점을 근거로 생략했다(이전 행들과 동일한 경계). 기존 "실제 연애 생성기는 저장한 그룹을 재사용하고 요청당 호출을 제한한다" 테스트가 그룹 재사용에 의한 호출 절약(실패 시 2회, 성공 시 1회)을 재확인한다.

이번 차례는 client-side 깨어남 복구 버그 재현·수정 1건, "필수 절" 품질 게이트의 실측 테스트 공백 보강 1건, 신규 화면 2개·후속 질문 공유 모듈·가격 정본의 코드 대조 확인에 한정했다. **14행 자체도 D의 실제 화면 증거와 F의 전용 전후 diff는 아직 없다.** 실결제·과금 LLM·운영 DB·운영 승격은 실행하지 않았다.

## 재검사 명령과 결과

수정/신규 파일:

- 시작 화면: `app/love-secret-ai/LoveSecretAiClient.tsx` — discovery effect에 `pageshow`/`focus` 추가.
- 결과 화면: `app/love-secret-ai/result/LoveSecretAiResultClient.tsx` — polling effect에 `pageshow`/`focus` 추가.
- 행동 검사(신규): `__tests__/ui/love-secret-ai-wake-recovery.behavior.test.js`(108행).
- 게이트 계약 검사(신규): `__tests__/worker/love-secret-ai-prompt.gate.test.js`(151행).
- 사이트맵: `config/sitemap-lastmod.json`·미러 12개 — 클라이언트 파일 변경에 따른 서명 재생성(날짜 창 롤오버분 포함, 이번 행과 무관).
- 검증 기록(신규): 이 문서.

```bash
node --test __tests__/ui/love-secret-ai-wake-recovery.behavior.test.js __tests__/ui/love-secret-paid-delivery.behavior.test.js
node scripts/run-mock-tests.mjs jest __tests__/worker/love-secret-ai-prompt.gate.test.js __tests__/worker/expert-follow-up-delivery.test.js --runInBand
npm run verify:love-secret-ai-flow
npm run sitemap:generate
npm run check:fast -- --skip-build
```

결과: UI 행동 검사 **20/20 통과**(신규 2 + 기존 18, 무회귀). 워커 jest `love-secret-ai-prompt.gate.test.js` **4/4**(변이 검증 포함) + `expert-follow-up-delivery.test.js` **12/12**, 합계 **16/16 통과**(1.255초). `verify:love-secret-ai-flow`는 `[verify-love-secret-ai-flow] groups=6 sections=28 body chars=23835` / `PASS`.

`npm run check:fast`(클라이언트 파일 변경으로 critical 등급 자동 승격, 변경 파일 4개: 클라이언트 2 + 신규 테스트 2)는 두 차례 실행했다. 1차는 `verify:sitemap-drift`에서 예상대로 BLOCKED(날짜 창 롤오버로 `/fortune/date/2026-08-19/*` → `/fortune/date/2026-09-18/*` 12쌍 드리프트, 이번 수정과 무관) — `npm run sitemap:generate`로 해소했다. 2차 전체 재실행은 `run-paid-gate-suite.mjs` 88/88 ok를 포함해 처음부터 끝까지 통과했다(종료 코드 0). `config/payment-freeze.json`은 두 차례 모두 diff 없음(자동 조임 노이즈 없음).

## 전달

워크트리 `love-secret-mock-20260918-050418`에서 수정/신규 파일을 커밋한 뒤 main에 병합하고 push한다. CI(`CI required` aggregate)를 `gh api commits/<sha>/check-runs`로 확인한다. 실결제·운영 승격은 진행하지 않는다.
