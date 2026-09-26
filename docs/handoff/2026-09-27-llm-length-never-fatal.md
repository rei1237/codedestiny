---
status: active
updated: 2026-09-27
next: "P3 네 번째 묶음 네오·낙샤트라·자미 심층 전달 SHA와 main CI 확인 후 남은 P3 라우트(사주·찻집·연애 비책·마스터 연애 코덱스 등) 조사 및 다음 묶음 진행. 총합 20,000자 및 서비스별 기존 총합 기준 유지."
---

# 모든 유료 LLM: 분량 미달로 전달이 막히지 않게 (단계 계획)

## 요구 (사용자 원문, 2026-09-27)

> 모든 LLM 기능들이 분량 기준이 아니라 내용이 좋아야해 분량 실패로 생성 실패해서 고객에게 전달안되는 일이 없도록 최적화해주길 바란다

앞선 요구(2026-09-26, 영냥이 참치 사건): 소절 분량 부족으로 12회나 이미 만든 장을 버리고 다시 생성했다. LLM 비용이 낭비됐고 고객에게 결과가 제대로 전달되지 않았다.

## 규칙 (정본은 [ai-and-db](../context/ai-and-db.md#llm-안전-규칙-2026-08-28-agentsmd-에서-이관))

| # | 규칙 |
|---|---|
| L1 | 분량 미달만으로는 생성 실패가 되지 않는다. |
| L2 | 첫 시도가 하한에 못 미치면 기존 재시도 예산 안에서 보강을 1회 요청한다. 보강본(또는 마지막 시도)은 분량을 이유로 거부하지 않는다. 판정은 구조(파싱·필수 섹션·빈 본문)·안전·근거·반복만 한다. 후보가 여럿이면 가장 긴 유효본을 쓴다. |
| L3 | 상한을 넘으면 거부하지 않고 결정적으로 자르거나 나눈다. |
| L4 | 모델이 자주 어기는 형식(문단 수·문장부호 끝)은 분할·병합·정규화로 교정한다. |
| L5 | 출력 토큰은 `tokensRequiredForChars(목표 상한)` + thinking 이상으로 둔다. `attempts:1` 이면 `callGeminiJsonWithRetry` 의 cap 확장이 동작하지 않으므로, base 자체를 필요치 이상으로 둔다. |
| L6 | **2026-09-27 사용자 결정: 총합 20,000자 정책 유지.** `PAID_REPORT_MIN_BODY_CHARS`와 서비스별 기존 총합 하한을 낮추거나 면제하지 않는다. |

## 완료: 영냥이

- 장·소절 거부선을 목표 하한의 70%로 낮췄다(1e50c2654).
- 분량 보강본은 분량으로 다시 거부하지 않는다(`LENGTH_FAILURES`, `validateReadingQuality` 의 `lengthRepair`).
  - `validateChapter` 는 직전 실패 코드가 분량일 때 이 옵션을 켠다.
  - 테스트: `__tests__/ui/yeongnyangi-reading-v6.test.mjs` "a length repair is never rejected…". 변이 검사로 가드가 동작함을 확인했다.
- 보관함·상세의 구매자 재시도 버튼을 보류 주문에도 연다(e8a221c70, a828e4959).
- 남은 영냥이 형식 거부: `worker/yeongnyangi/providers/chapter.ts:59-63` 필드 5000자 초과 시 `INVALID_CHAPTER`. P4 에서 분할 교정으로 바꾼다.

## P1 구현 (2026-09-27)

- 시작 시 `main` 확인, `git pull --ff-only`는 Already up to date. 주 체크아웃에는 다른 세션의 마케팅·타입 생성 파일 변경이 있어 clean은 아니었으며, 변경을 보존하고 main 기준 clean 격리 체크아웃에서 작업했다.
- 선행 `c4e1a69fd`에 이미 짧은 초안 저장·1회 보강·마지막 시도 수용이 있었다. 이를 다시 구현하지 않고, 반복 보강본이 저장된 유효 초안까지 막던 잔여를 수정했다.
- 현재 본문과 저장 초안을 각각 이미 수용한 파트와 반복 검사한 뒤 가장 긴 유효 후보를 선택한다. 유효 초안이 없으면 빈 본문·잘림·mock·잘못된 근거·반복·미완성 본문은 마지막 시도의 분량 예외 후보로도 수용하지 않는다.
- 섬 `generatePalaceText`의 캐시 `minChars`에 호출 파트의 `minChars`를 연결했다. 캐시는 원시 JSON 텍스트 길이를 검사하고, 본문·근거의 최종 판정은 기존 `validPalacePart`가 담당한다.
- 총합 20,000자 및 서비스별 `minBodyChars`, producer의 구조·근거 검증, 기존 서술형 후보의 2문단·종결부호 조건은 유지한다. **짧은 파트 수용이 전체 리포트 완료를 보장하지는 않는다.** 총합 결정은 P5, 형식 교정은 P4다.
- 핵심 mock: `npm run test:jest -- --runInBand __tests__/worker/geomancy-paid-delivery.test.js __tests__/worker/paid-narrative-candidate.test.js __tests__/worker/ziwei-island-paid-delivery.test.js` → 3 suites / 73 tests 통과.
- 변이 5종(마지막 시도 수용 제거, 보강 초안 수용 제거, 반복 보강 필터 제거, 기존 파트와 겹치는 초안 필터 제거, 섬 캐시 하한 축소) 모두 실제 assertion 실패로 검출 후 원본 복원.
- `regression-scout` / `paid-gate-auditor` 읽기 전용 감사 수행. `npm run check:fast -- --plan` critical 분류, `npm run check:fast` exit 0: 결제 가드 88/88, lint·typecheck·Node 테스트·Worker dry-run 통과, Jest 300 suites / 4,267 tests 통과. `node scripts/verify-handoff-contract.mjs` 198문서 통과. main CI 판정은 이 변경 커밋의 GitHub 실행과 세션 최종 보고를 참조한다. 실 LLM·결제·운영 DB·운영 승격 없음.

## P2 구현 (2026-09-27)

- 주 체크아웃 main `0cad2a975ed169f763220a03afd5670ce3da59e1` 확인. 전달받은 `b7e96a28390a21412ef04851486bfabee3505e13`은 조상이며 `git pull --ff-only`는 Already up to date. 마케팅·사이트맵·타입 파일 등의 기존 변경을 보존하고 main 기준 clean 격리 체크아웃에서 작업했다.
- 숙요 궁합: 요청 목표 1,500~2,250자 유지, 수용 하한 1,200자(80%). 가장 큰 3장 그룹 목표 상한 6,750자를 기준으로 첫 호출 base와 cap 모두 12,375토큰. 폴백 문턱 1,800자와 3회 시도 한도 유지.
- 모든 장을 먼저 확보한 뒤 개별 하한은 통과하지만 총합 20,000자 미만이면 목표 미달 장을 기존 예산 안에서 보강 대상으로 선정한다. 이를 빠뜨리면 생성 대상이 없는 영구 partial이 생긴다는 감사 지적을 반영했다. 총합 기준을 면제하거나 시도 횟수를 늘리지 않는다.
- 수호 운세: 공통 환산식으로 기본/환경값 하한 7,650토큰, 환경값 상한 12,000. 잘못된 글자당 1토큰 주석 수정.
- 초융합: 자체 환산 대신 `tokensRequiredForChars(fusionGroupCeilingChars(group))`. 최대 그룹 5,400자 상한에 10,350토큰, 낮은 env 값도 필요 예산 아래로 내리지 못한다.
- 신년: 기존 5,500자 상한과 52초 timeout 유지, 10,500→12,000토큰. 재시도·분량·총합·결제/저장 계약은 유지한다.
- 공통 Gemini thinking 기본값은 0이며 이번 호출들은 별도 thinking을 활성화하지 않는다. 공유 provider helper는 수정하지 않았다.
- mock 핵심 3 suites / 81 tests(숙요 최종 22개 포함), 전달/스트림 3 suites / 84 tests, 신년 전달 17개, 복원력 1,224 assertions 통과. `check:fast -- --plan`은 critical. `check:fast`에서 목표와 수용 하한을 같은 값으로 보던 `verify:analysis-basis-contract`가 실패하여 목표 합계를 검사하도록 수정했고, 해당 검사 재실행 94 assertions 통과. 전체 검사와 main CI 최종 결과는 전달 커밋의 실행 및 세션 최종 보고를 참조한다.
- `regression-scout`와 `paid-gate-auditor` 읽기 전용 감사 수행. 실 LLM·결제·운영 DB·운영 승격 없음. 토큰 확대만으로 실제 완결·총합 통과를 보장하지 않으며, 분량 미달의 최종 수용은 P3/P5에 남는다.

## P3 첫 묶음 구현 (2026-09-27)

- 범위: `astrology-ai.js`, `vedic-ai.js`, `ziwei-ai.js`의 현재 유료 시작·재개 체크포인트 경로. 세 라우트의 동일한 상한 거절 문제를 묶어 먼저 처리했다. 비체크포인트 레거시 생성 함수는 이번 범위 밖이다.
- 시작 main `0205266106f3ce2f776e4580d84372867efb1e86`, `git pull --ff-only` Already up to date. 기존 마케팅·타입 파일·미추적 파일을 보존하고 격리 워크트리에서 검증 후 main으로 전달한다.
- 구조·필수 제목·빈 본문·반복·기존 근거 검사를 통과한 짧은 초안을 체크포인트에 보존한다. 기존 3회 예산 안에서 분량 보강 1회를 예약하고, 보강 후 또는 마지막 시도는 개별 분량으로 거부하지 않는다. 예약은 기존 `attempts`에 `<group>:lengthRepair` 숫자 플래그로 저장하여 응답 유실 뒤에도 추가 보강을 반복하지 않는다.
- 후보는 가장 긴 유효본을 유지한다. 빈/반복/잘림/근거 오류 보강본은 초안을 덮지 않는다. 자미는 더 짧더라도 기존 근거 오류를 해결한 보강본을 수용하고, 새 근거 누락을 만드는 긴 보강본은 거부한다.
- 새 `paid-report-length.js`는 본문 글자 수 정본으로 상한을 잘라 맞추며, 구조화 그룹은 섹션 비율대로 분배해 제목·키·점수를 보존한다. 원문과 절단본을 검증하여 잘린 뒷부분의 반복을 숨겨 통과시키지 않는다. 자미 프롬프트는 제목·공백 제외 및 목표×1.25 상한으로 판정과 통일했다.
- **총합 20,000자 및 자미 기존 20,700자 하한 유지.** 모든 섹션을 수용해도 총합이 모자라면 목표 미달 섹션을 기존 남은 시도 안에서 보강한다. 소진 뒤에도 총합 미달이면 완료·차감 없이 partial로 남으며 추가 LLM 호출은 하지 않는다. 따라서 이번 개별 분량 개선이 모든 결과의 완료를 보장하지는 않는다.
- 유지: 가격/이용권/월정석/단건 정책, 인증·소유권·환불/취소 차단, 총합 하한, 토큰·타임아웃·폴백 문턱, 시도 상한, DB 스키마, 저장 재조회 후 완료 계약. 실 LLM·실결제·운영 DB·운영 승격 없음.
- 검증 진행: 핵심 4 suites / 94 tests 통과(빈 본문·잘림·반복·근거 누락·잘못된 본문 타입 포함), 복원력 1,224 assertions 통과. `check:fast -- --plan` critical; `check:fast` 통과: 결제 가드 88/88, lint·typecheck·Node 테스트·Worker dry-run·Jest 301 suites / 4,303 tests 통과. 마지막 절단 경계 보완 후 핵심 94개 재검증 통과. `verify:handoff-contract` 199문서 통과. 구현 커밋은 `75f0ceb8ff59e212bb6190546e92c691cb3a8ef9`; main push·CI 최종 결과는 해당 전달 SHA의 GitHub 실행 및 세션 최종 보고에서 확인한다.
- 다음: P3 남은 라우트를 3~4개씩 진행(권장: 숙요 궁합·신년·운명 나침반). P4 형식 교정과 P5 관계 궁합 구조는 미착수. 총합 정책을 다시 결정받을 필요는 없다.

## P3 두 번째 묶음 구현 (2026-09-27)

- 범위: 숙요 궁합 `createCompatibilityAnswer`, 신년 `generateNewYearWave`, 운명 나침반 유료 체크포인트 경로. 개인 숙요·무료 나침반·레거시 신년 비체크포인트 전달은 변경하지 않았다.
- 시작 main `bb970446e1fa3ca58833a1c66478008923d29af9`, `git pull --ff-only` Already up to date. 마케팅·타입 파일 등 기존 미커밋 변경을 보존하고 앱 관리 격리 체크아웃에서 작업했다. 브랜치·PR 없이 검증 커밋을 main으로 전달한다.
- 유효한 짧은 초안을 저장하고 기존 3회 예산 안에서 분량 보강 1회를 예약한다. `attempts`의 `:lengthRepair` 숫자 플래그로 보강 예약을 보존하고 마지막 시도 또는 보강 뒤에는 개별 분량만으로 거절하지 않는다. 가장 긴 유효 초안을 유지하며 신년은 필수 근거 오류를 해결하는 더 짧은 보강본도 수용한다.
- 나침반은 `:lengthDraft` 플래그로 검증한 짧은 초안과 기존 품질 미달 보관본을 구분한다. 보강 호출에서는 캐시를 재사용하지 않는다. 총합만 부족할 때도 목표 미달 섹션을 남은 예산 안에서 선택한다.
- 신년 목표는 5,000~5,500자(하한 4,000), 나침반 목표는 2,500~3,600자(하한 2,000)로 분리했다. 토큰·타임아웃·폴백 문턱·3회 시도 상한은 그대로다. 신년 체크포인트에서는 레거시 300자 응답 하한도 초안 폐기 사유로 삼지 않는다.
- 상한은 기존 `trimPaidReportText`로 교정하며 원문·절단본의 반복과 기존 근거 검증을 유지한다. 숙요는 문자열 본문만 수용하고 그룹 내·기존 섹션과의 반복도 검사한다.
- **총합 20,000자 및 기존 서비스 총합 하한 유지.** 예산 소진 뒤 총합 미달은 완료·차감·분량 사유 환불 없이 partial / retryable:false로 보존한다. 구조·근거·반복 실패와 기존 저장 불확실성 처리는 별도 유지한다. 짧은 파트 수용이 전체 리포트 완료를 보장하지는 않는다.
- 유지: 가격/이용권/월정석/단건 정책, 인증·소유권·취소/환불 증빙 차단, DB 스키마, 완료 전 저장 재조회, 기존 차감 계약. 실 LLM·실결제·운영 DB·운영 승격 없음.
- 검증: 핵심 Jest 5 suites / 74 tests(실제 신년·나침반 검증기 포함), Node 전달/재개 29 tests, 복원력 1,224 assertions 통과. 숙요 그룹 원문 반복 검사 보완 후 숙요 28 tests 재통과. 보강 체크포인트 응답 유실 뒤 추가 호출 없이 저장 초안으로 완료하는 신년·나침반 회귀 포함. `check:fast -- --plan` critical. `check:fast` exit 0: 결제 가드 88/88, lint·typecheck·Node 1,743 tests·Worker dry-run·Jest 302 suites / 4,324 tests 통과. `verify:handoff-contract` 199문서 통과. 구현 커밋 `788b836030355c9a27ef0924ffd4cf6e94eb5342`. main push·CI 최종 결과는 이 구현을 포함한 전달 SHA의 GitHub 실행과 세션 최종 보고에서 확인한다.
- 수정 파일: `worker/routes/sukuyo-compatibility-ai.js`, `worker/routes/new-year-ai.js`, `worker/routes/destiny-compass-ai.js`, `worker/lib/destiny-compass-report-contract.js`; 회귀 테스트 `__tests__/worker/sukuyo-compatibility-ai.duplicate-generation.test.js`, `__tests__/worker/new-year-length-repair.test.js`, `__tests__/worker/destiny-compass-paid-delivery.test.js`, `__tests__/worker/destiny-compass-report.basis-and-charge-window.test.js`, `__tests__/ui/new-year-paid-delivery.behavior.test.js`; 이 인수인계 문서.
- 다음: P3 휴먼디자인·카르마·인생책 묶음. P4 형식 교정과 P5 관계 궁합 구조는 미착수. 총합 정책은 다시 결정받지 않는다.

## P3 세 번째 묶음 구현 (2026-09-27)

- 시작 main `e34c6170f`, 전달 SHA `d071fe9e0b0bd5169cff382bbbcae11973139d61`이 조상임을 확인했다. `git pull --ff-only`로 `4b0bb812a2cf9504260cfac4cc74bac6f19f251d`까지 전진하고 기존 마케팅·타입 파일·미추적 변경을 보존했다. 이번 묶음만 main에 커밋하며 브랜치·PR은 만들지 않는다.
- 휴먼디자인: 개별 분량 이슈만 있는 유효 초안을 보존하고 기존 섹션 시도 예산 안에서 보강 1회를 예약한다. `sections[].lengthRepair`는 호출 전에 저장하며 응답 유실 뒤 재개해도 같은 개별 분량 보강을 반복하지 않는다. 빈 본문·필수 항목·계산 근거·로케일·반복 검사를 유지하고 유효 후보 중 긴 본문을 선택한다. 목표 하한은 수용 하한/0.8, 항목이 많은 차트는 목표 상한과 출력 토큰도 함께 늘린다. 총합 미달 보강은 별도 이슈로 남기며 기존 3회/10웨이브 한도를 유지한다.
- 카르마: 기존 `llmMeta.attempts`에 장별 `:lengthRepair` 예약 플래그를 저장한다. 짧은 유효 장을 보관하고 보강/마지막 시도에서는 개별 하한만 면제한다. 보강본이 빈 본문·반복·금지 내용이면 기존 유효 초안을 유지한다. 필수 핵심 3개와 기존 전체 품질 검사를 유지한다. 총합 보강 대상 선정에서는 예산이 남은 장을 선택한다. **기존 30,000자 plain text 총합과 공백 제외 본문 20,000자 기준을 모두 유지한다.**
- 인생책/인생 총운: 섹션·조립본 집계와 프롬프트를 공백 제외 본문 기준으로 통일한다. 기존 체크포인트에 보강 예약과 목적을 저장해 1회 보강 후 개별 하한을 면제하고, 더 짧거나 구조·근거·반복 검사를 통과하지 못한 보강본은 유효 초안을 덮지 않는다. 총합 부족 시 예산이 남은 장을 보강하며 20,000자 총합은 면제하지 않는다. 전문가 목표 1,500자와 보강 목표에 필요한 출력 토큰을 확보한다.
- 유지: 가격·이용권/월정석/단건 결제 정책, 인증, 결제 증빙 재확인, 차감/환불 계약, DB 스키마, API 경로, 저장 재읽기 계약. 실 LLM·결제·운영 DB·운영 승격 없음.
- 검증: 핵심 Jest 3 suites / 71 tests, Node 전달/재개 19개 및 공통 partial 5개 통과. `verify:human-design-report`, `verify:karma-destiny-ai-flow`, `verify:life-book-ai-flow`, 변경 파일 ESLint, handoff 199문서 검증 통과. 짧은/빈/반복 보강, 예약 후 중단, 마지막 시도 수용, 총합·구조·근거 유지 사례 포함. `check:fast -- --plan`은 critical. 첫 `check:fast`의 가드 87/88은 통과했고 npm test의 Node 1,747개 중 휴먼디자인 VM 테스트 1개가 신규 helper 미주입으로 실패했다. 실제 helper를 로드하도록 픽스처를 수정하고 해당 테스트 5개를 재실행해 통과했다. 로컬 전체 통과로 보고하지 않으며 공식 main CI 최종 결과는 전달 세션 최종 보고를 참조한다.
- 수정 파일: `worker/routes/human-design-report.js`, `worker/lib/human-design-report-prompt.js`, `worker/routes/karma-destiny-ai.js`, `worker/routes/life-book-ai.js`; 관련 worker/UI 테스트 5개와 검증 스크립트 2개, 이 문서.
- 다음: P3 네오·낙샤트라·자미 심층. P4 형식 교정 및 P5 관계 궁합은 미착수. 실출력 품질·완료율은 mock 통과로 입증되지 않으며 총합 정책은 다시 결정받지 않는다.

## P3 네 번째 묶음 구현 (2026-09-27)

- 시작 main `6797c40a831bc5d4332a38da6437067511640a8b`에서 `git pull --ff-only`로 `3f27d4be0`까지 갱신. 기존 마케팅·타입 파일·미추적 변경을 보존하고 이번 파일만 전달한다.
- 네오 초기 상담·현실 점검 보강: 기존 JSON 구조·필수 항목 수·계산 근거·금지 내용·반복 검사를 통과하는 짧은 초안을 보존한다. 기존 `llmMeta.attempts`와 `refinement.attempts`에 `:lengthRepair` 예약을 먼저 저장해 보강 중 응답이 유실돼도 같은 개별 분량 보강을 반복하지 않는다. 보강본 또는 마지막 시도는 개별 하한을 면제하고 가장 긴 유효 초안을 유지한다. 초기 20,000자와 현실 점검의 기존 섹션 하한 합계 8,000자는 유지한다.
- 낙샤트라: 베다·숙요 근거 필드와 실제 계산된 별 이름 확인을 유지하면서 짧은 초안을 보존한다. 기존 장별 3회 예산 안에서 보강 1회를 예약한다. 빈/반복/근거 오류/더 짧은 보강본은 초안을 덮지 않는다. 기존 `MIN_TOTAL_CHARS` 21,600자와 20,000자 중 큰 총합 기준을 유지한다.
- 자미 심층: 실제 공급자 생성기부터 짧은 유효 본문을 반환하고 체크포인트에서 보존한다. 호출 전 보강 예약, 마지막 시도 개별 하한 면제, 가장 긴 유효 초안 선택을 적용한다. 잘림·mock·빈 본문·잘못된 본문 타입·반복 거부는 유지한다. 15장 구조와 기존 20,000자 완료 기준을 유지한다.
- 세 서비스 모두 총합 부족이면 남은 기존 시도 예산 안에서 목표 미달 장을 보강한다. 예산 소진 후에도 총합 미달이면 완료·차감 없이 partial로 보존하고 추가 LLM 호출은 하지 않는다. **개별 분량 개선은 모든 결과의 완료를 보장하지 않는다.**
- 프롬프트 목표 하한은 기존 수용 하한/0.8로 맞췄다. 네오·자미 심층의 공백 포함 기준을 제목·공백 제외 본문 기준으로 통일했다. 자미 심층은 최대 목표 4,500자에 기존 9,000토큰을 유지하고 thinking 0을 명시한다. 네오·낙샤트라의 기존 토큰·timeout·폴백 문턱은 유지한다.
- 유지: 가격·이용권/월정석/단건 결제 정책, 인증·소유권, 결제 증빙 재확인, 저장 재조회, 환불/취소 차단, DB 스키마, API 경로, 시도 상한. 실 LLM·실결제·운영 DB·운영 승격 없음.
- 검증: 짧은/더 짧은/빈/반복/잘못된 근거 보강, 예약 후 중단, 마지막 시도, 총합 미달 시 예산 소진을 mock으로 검증했다. 핵심 Jest 3 suites / 77 tests, 자미 심층 Node 57 tests, 낙샤트라·네오·자미 심층 흐름 검증 및 handoff 199문서 검증 통과. `check:fast -- --plan`은 critical, `check:fast`와 main CI 최종 결과는 전달 커밋 및 이 세션 최종 보고를 참조한다.
- 수정 파일: `worker/routes/neo-operation-room.js`, `worker/routes/nakshatra-ai.js`, `worker/routes/ziwei-deep-report.js`; 각 서비스 프롬프트 3개, 관련 테스트 4개, 이 문서.
- 첫 전달 `19024857d0b17914e488ad2a2e0ce2a613683c44`의 CI는 타입·lint·Critical checks·Pages/Worker 빌드가 통과했으나 정적 미러 신선도에서 실패했다. 기존 정적 소스의 캐시 키 10개 불일치를 `npm run sync:public`으로 갱신해 별도 커밋한다. 동기화 전후 기존 미커밋 파일 SHA-256은 모두 동일했다. 보정 push 중 원격 `5ce067e6e`가 전진해 `7d2efd79f`로 병합했고, `js/app.js` 캐시 키를 셸 8개에 재동기화했다. 재생성 전후 12개 정적 파일 해시 비교에서 추가 변경 0개를 확인했다. 미러 검증기는 미커밋 트리에서 실행을 거부하므로 최종 판정은 새 main CI에서 확인한다.
- 다음: 남은 P3 라우트의 현재 구현을 확인한 뒤 다음 3~4개를 묶는다. P4 형식 교정·P5 관계 궁합은 미착수. 총합 정책은 다시 결정받지 않는다.

## 전수 조사 (2026-09-27, P1 구현 전 스냅샷·실호출 0)

- 방식: `git grep`/코드 읽기.
- 환산: `worker/lib/llm-budget.js` 1.5토큰/자 + 1,500자.
- 여유는 `floor(토큰/1.5) − 목표 상한` 이다.
- 표시가 없으면 코드로 확인한 값이고, [추정] 은 추론이다.

**공통 사실:** 유료 주 경로 어디에도 "마지막 시도가 짧아도 완료로 수용" 하는 장치가 없다. 섹션 하나가 분량 미달로 3회 거부되면 경로마다 다음 중 하나로 끝난다.

- 환불: 사주 2차, 점성술, 베딕, 자미, 낙샤트라, 네오, 자미 심층, 관계 궁합
- 이용 취소: 신년, 카르마
- 보류: 나침반·휴먼디자인 202, paid-narrative·작명·천체 `retryable:false`

부분 수용은 세 곳뿐이다: 초융합 degraded 배달, 찻집 레거시 degrade, 무료 숙요 200자 수용.

### 대형 유료 리포트

| 서비스 | 위치 | 하한/목표 하한 | 문제 |
|---|---|---|---|
| 숙요 궁합 | `worker/routes/sukuyo-compatibility-ai.js:1442-1492,1553` | 1500/1500 = **1.0** | `attempts:1` 이라 실효 토큰이 8000(5333자)이다. 그룹 하한 4500자에 필요한 9000토큰에도 못 미친다(**부족**). 잘리면 그룹 3섹션을 통째로 버린다. 카드 결제는 환불 제외(`:1684`). |
| 수호 운세 | `worker/lib/guardian-fortune-llm.js:124,170`, `guardian-fortune-prompt.js:313` | 2600/2600 = **1.0** | 5200토큰(3466자)으로 목표 상한 3600자에 **−134자**다. 주석의 "글자당 1토큰" 이 틀렸다(`guardian-fortune-llm-policy.js:7-9`). |
| 초융합 | `worker/lib/fusion-fortune.js:663-667,745-760` | 3600/4300 = 0.84 | 자체 환산(×1.8+900 = 8640)이 필요치 10350 보다 작다. 섹션 `section_depth` 는 하드 거절이다. |
| 신년운세 | `worker/routes/new-year-ai.js:74-123,2305-2350` | 4000/4000 = **1.0** | 토큰 여유가 +1500으로 최소치에 딱 걸린다. |
| 운명 나침반 | `worker/lib/destiny-compass-report-contract.js:392-430` | 2000/2000 = **1.0** | 소진되면 202 보류(환불 없음)다. |
| 휴먼디자인 | `worker/routes/human-design-report.js:545-632` | 비율 **1.0** | 202 partial 보류. 총합이 미달이면 섹션을 degraded 로 강등한다. |
| 카르마 | `worker/routes/karma-destiny-ai.js:145-317,2637-2644` | **0.857~0.89** | 이용 취소 503. |
| 인생책 | `worker/routes/life-book-ai.js:1300-1360` | 전문가 **0.857** | 장은 공백 포함 `.length`, 총합은 공백 제외로 센다(기준 불일치). |
| 자미 AI | `worker/routes/ziwei-ai.js:1490,1791-1843` | 0.79~0.80 | 목표×1.25를 넘으면 거절한다. 프롬프트 `:1490` 은 1.35×를 허용해 서로 충돌한다. |
| 점성술 AI | `worker/routes/astrology-ai.js:1179-1188` | 0.79 | 6000자를 넘으면 거절한다(L3 위반). |
| 베딕 AI | `worker/routes/vedic-ai.js:1450-1462` | 0.80 | 7000자를 넘으면 거절한다(L3 위반). |
| 자미 심층 | `worker/routes/ziwei-deep-report.js:245-286` | 실효 >1 [추정 약 1.2] | 프롬프트는 "공백 포함 최소 min", 판정은 공백 제외다. |
| 네오 작전실 | `worker/routes/neo-operation-room.js:1698-1743` | 0.83 | 섹션 하한 합이 20050이다. 총합이 20000에 못 미치면 즉시 `LLM_FAILED` 다. 공백 기준이 `:818`·`:1708` 에서 서로 다르다. |
| 낙샤트라 | `worker/routes/nakshatra-ai.js:692-710` | 0.83 | 환불 503. |
| 운명의 섬 12궁 | `worker/lib/island/consult/palace-delivery.js:37-54`, `worker/routes/ziwei-island-ai.js:538` | 0.83 | 캐시에 `minChars` 를 넘기지 않아 30일 캐시가 미달 응답을 저장할 수 있다. |
| 찻집 | `worker/routes/fortune-tea-house.js:4157-4252` | 0.83 | 소진되면 202 보류. |
| 사주 AI | `worker/routes/fortune.js:470-474,1137-1152` | 0.80 | 2차에서 자동 환불된다. |
| 연애 비밀 | `worker/routes/love-secret-ai.js:788-809` | 0.70 | 결제 게이트 복원 503. |
| 마스터 연애 코덱스 | `worker/lib/master-love-codex-quality.js:162-186` | 약 0.6 | 원시 `body.length` 로 센다. 부분 책은 보류된다. |

### paid-narrative 공통 헬퍼 (`worker/lib/paid-narrative-delivery.js:110-113`)

- 적용 서비스: 질문형 상담, 꿈 심리, 지오맨시 오라클, 연애 타로, 마인드스캔, 타로 오라클, 요가 구루, 애니멀 토템, 반려동물 사주, 전문가 후속, 수호 운세 전달.
- 판정: 공백 제외 본문이 `task.minChars` 미만이면 거절한다. task당 3회까지 시도한다.
- 소진 시: 202 `retryable:false` 보류, 또는 `onExhausted` 로 환불(질문형 상담).
- 형식 거절:
  - 연애 타로: matrix 정확히 4문단 (`worker/lib/love-tarot-delivery.js`)
  - 마인드스캔: summary 정확히 10문단 (`worker/lib/mindscan-delivery.js`)
  - 질문형 상담: 문장부호로 끝나야 함 (`worker/lib/feature-question-delivery.js:67`)

### 그 밖

- 작명 `worker/lib/naming-report-delivery.js`: 0.78. 빈 품질 실패는 503, 그 외는 보류.
- 천체 조화 `worker/lib/celestial-report-delivery.js`: 0.77. 보류.
- 관계 궁합 `worker/lib/relationship-report-delivery.js:50-100`: **한 파트라도 3회 무효면 다른 파트가 있어도 환불로 끝난다.**
- 공통 헬퍼 `worker/lib/structured-consultation.js:57-104` `callGeminiJsonWithRetry`: 길이 검사가 없고 가장 긴 성공본을 돌려준다. `attempts:1` 이면 cap 확장이 동작하지 않는다(숙요 궁합·섬·초융합·관계 궁합·애니멀 토템).
- mock 가드 `scripts/verify-llm-generation-resilience.mjs:1080-1120`: `MAX_FLOOR_TO_TARGET` 0.8. dream·master-love-codex 는 예외로 빠져 있다. 런타임에서는 강제하지 않는다.

### 확인 못 한 곳

- 초융합 복구 태스크의 최종 처리 (`worker/lib/fusion-fortune-recovery-task.js:82`)
- 섬 일부 파트 소진 시의 retryable 값
- 찻집 필드 절단과 글자 수 판정의 순서
- 애니멀 토템 3·5장 모드
- 전문가 후속·반려동물의 토큰
- `worker/routes/fortune.js:5226` 이후의 형제 기능
- 비고객 출력(threads·admin·i18n)은 범위 밖이다.
- 실제 출력 분량은 실호출 금지로 측정하지 않았다. 코드 주석의 실측값만 참고했다.

## 단계 (한 세션에 한 단계; 모두 RED; 검증은 mock만)

| 단계 | 범위 | 핵심 변경 | 검증 |
|---|---|---|---|
| **P1 구현 완료** | `paid-narrative-delivery.js` (11개 서비스) | 선행 초안/마지막 수용을 유지하고 반복 보강본의 초안 차단을 수정. 섬 캐시에 파트 `minChars` 연결. | 핵심 mock 73개·변이 5종 통과. 위 P1 검증·전달 기록 참조. |
| **P2 구현 완료** | 토큰 부족 3곳 + 신년 | 숙요 궁합 base ≥ 12,375, 하한 = 목표 하한×0.8. 수호 ≥ 7,650(env 범위 포함)과 주석 수정. 초융합 환산을 `tokensRequiredForChars` 로 교체. 신년 여유 확대. | `verify-llm-generation-resilience` 확장. 각 라우트 mock 테스트. |
| **P3 진행 중** | 대형 리포트 라우트 18개 중 점성술·베딕·자미 AI, 숙요 궁합·신년·운명 나침반, 휴먼디자인·카르마·인생책, 네오·낙샤트라·자미 심층 12개 구현 | 섹션 분량 판정에 L2(보강본 수용)를 적용한다. 점성술·베딕·자미 상한 거절은 자르기로 바꾼다(L3). 자미·자미 심층·네오·인생책 프롬프트의 공백 기준을 판정 기준(`countPaidReportBodyChars`, 공백 제외)과 통일한다. 비율 1.0·0.85+ 인 곳은 프롬프트 목표를 하한/0.8 이상으로 올린다. | 라우트별 mock 테스트. 서비스 3~4개씩 나눠 커밋한다. |
| **P4** | 형식 교정 | 연애 타로 4문단·마인드스캔 10문단은 분할·병합으로 맞춘다. 질문형 문장부호 끝은 정규화한다. 영냥이 필드 5000자는 분할한다. | 단위 테스트. |
| **P5** | 구조 | 관계 궁합이 한 파트 실패로 전체 환불되는 구조를 부분 수용 + 재시도로 바꾼다. 총합 20,000자 정책은 사용자 결정대로 유지한다. | 기존 총합 유지하며 설계. |

각 단계 공통 절차:

1. 가장 가까운 기존 구현을 먼저 읽는다(원칙 15).
2. `regression-scout` 로 공유 헬퍼의 영향을 확인한다.
3. 변경마다 `npm run check:fast` 를 돌린다.
4. `paid-gate-auditor` 로 결제 정책 이탈을 감사한다.
5. commit → push → CI 까지 진행한다. 운영 승격은 별도로 1회 승인을 받는다.
6. 과금 LLM 실호출로 통과율을 확인하려면 호출 1회마다 정확한 승인을 받는다.

## 기각한 것

- **하한을 일괄 0으로 낮추기:** 빈 본문이나 한 줄짜리 응답까지 통과한다. 구조·반복 판정은 남긴다.
- **한 번에 30개 경로 수정:** 결제 경로 전체가 한 커밋 묶음에 들어가 롤백 단위가 사라진다.

## 다음 세션 첫 문장

"D:\Development\code-destiny에서 D:\Development\code-destiny\docs\handoff\2026-09-27-llm-length-never-fatal.md를 읽고, 네 번째 묶음의 전달 SHA(직전 세션 최종 보고)와 main CI를 확인한 뒤 git pull --ff-only 후 남은 P3 라우트(사주·찻집·연애 비책·마스터 연애 코덱스 등)를 조사하고 다음 묶음을 진행하라. 기존 미커밋 변경을 보존하고 총합 20,000자 및 서비스별 기존 총합 기준은 유지하라."
