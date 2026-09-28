---
status: active
updated: 2026-09-29
next: v15 실제 생성도 중대 의미 오류로 불합격이었다. 전 챕터와 캐릭터 요약의 재물 인과·시기 예고·매수 권유를 교정하고 mock·CI 전달 후 새 실측 승인을 받는다. 사주 검수 통과 전 후속 네 서비스는 미착수로 유지한다.
---

# 꿀꿀 운세 자체 상담 UX 인수인계

## 진행 규칙

- 순서: 사주 → 기본 자미두수 → 기본 숙요점 → 기본 서양 점성술 → 기본 베다점.
- 각 서비스의 구현·검증·증거를 기록하고 이 문서를 읽은 뒤 다음 단계에 착수한다.
- 현재: **v15 실제 생성 중대 의미 품질 불합격**. 이후 네 단계는 미착수. 사주 실제 생성에서 중대 오류가 없기 전 사주 단계 완료로 표기하지 않는다.
- 기본 자체 상담만 대상이다. 별도 `/…-ai`, 영냥이, 운명의 섬 상품은 합치지 않는다.
- 가격·이용권·월정석·단건 결제 정책과 주문·결과 읽기 계약을 유지한다. 운영 승격·실결제·실 LLM·운영 DB 쓰기는 실행하지 않는다.

## 2026-09-28 조사 기준

- 소스 기준 SHA: `1fcf3b2e55c2468ce712f53c8b4f48143d3b0d5b`.
- 조사 당시 운영 Pages/Worker: `01dbf1fb3cd45abde3657a97a1bee287175c9ad4`.
- 조사 당시 staging Pages/Worker: `1fcf3b2e55c2468ce712f53c8b4f48143d3b0d5b`.
- 운영·staging `/api/billing/features` GET: 사주 `saju_ai_question_prompt` 10,000원, 기본 자미·숙요·서양·베다의 `*_ai_prompt_generator` 각 5,000원. 서버 정본과 코드 값이 일치했다. 서버 reason의 ‘프롬프트 생성’ 표현과 실제 생성 상담을 혼동하지 않도록 표시 문구만 개선한다.
- 사주 클라이언트 alias: `saju_ai_prompt_generator`. 요청 `/api/fortune/saju/ai-prompt`, 동일 주문 생성·복구 `/api/fortune/saju-ai-consultation/create`, status/result GET을 유지한다.
- 다른 활성 작업이 있어 관리형 detached worktree를 사용했다. main의 marketing/** 및 next-env.d.ts 변경은 이 작업에 포함하지 않는다.

## 1단계 — 사주

### 발견 문제와 전후 경로

- 운영 첫 화면: 영냥이 사주 1,000원은 보이지만 기본 사주 자체 상담의 가치는 드러나지 않았다.
- 소스 기준 mock 무료 결과에서는 상담 카드가 이미 명식 바로 다음에 표시됐다. 접힌 메뉴에 숨었다고 단정하지 않는다. 핵심 문제는 작은 상품 소개 다음 긴 입력·선택 폼이 이어져 제공 내용을 먼저 이해하기 어렵다는 점이었다.
- 개선 전: 무료 입력 → 명식 → 어두운 상담 폼(하드코딩 가격·태극 장식) → 질문·주제·개인정보·선택 보정 입력 → 생성 버튼.
- 개선 후: 무료 입력 아래 유료 상담 예고 → 명식 → 실제 일간을 연결한 상담 소개·현재 가격·연이 그림 → 내용 확인 → AI 상담 설명·무료와의 차이·설명용 예시·출생정보 확인/수정·질문 → 기존 결제 선택 → 저장 상태 기반 진행 → 12챕터 결과/7개 읽기 흐름 → 기존 보관함.
- 명식 카드 상단→상담 진입점 상단 거리(로컬 CSS px): 360px 폭 372→379, 390px 폭 387→394, 430px 폭 405→414, 1440px 폭 594→601. 전후 모두 접힌 조상 없음·추가 발견 클릭 0회. 스크롤 절감으로 보고하지 않으며, 소개 뒤 입력 열기 1회는 정보 분리의 의도된 단계다.
- 소개와 입력을 details로 나누되 주 진입 버튼·상품명·가격은 접지 않는다. 결과·복구·보관함 버튼은 details 밖에 있다.
- 생성 버튼이 기존 가격/권리 확인을 호출한다. 새 주문·결제 경로를 추가하지 않았다.

### 디자인·입력·결과

- 새 그림: `docs/design/fortune-consultation-ux/saju-yeoni-original.png`; 배포본 `public/images/consultation/saju-yeoni-{320,640}.webp`.
- 원본은 ImageGen으로 제작. 참조는 기존 `public/icons/app-logo-512.webp`의 꽃돼지 연이. 그림 속 글자는 연출용 상징이며 실제 고객 명식이 아니다. 상품명·가격·행동은 HTML 텍스트다.
- 320px 20,468바이트 / 640px 68,754바이트. Sharp quality 82, 3:2 비율, srcset·명시 크기·lazy·async decoding 적용.
- 연이 로즈·플럼, 네오 모드 대응. CTA/폼/결과를 전용 CSS로 범위 제한했다.
- 가격은 `CodeDestinyFeaturePricingStore.getOrLoad`로 조회한다. 실패 시 금액을 만들지 않고 결제창 확인으로 표시한다.
- 질문 초안은 같은 탭의 계정·프로필별 sessionStorage에 보관하며 계정 전환 때 표시를 비운다. 기존 유료 복구 저장소와 구분한다.
- 시간 경과만으로 진행률을 올리던 UI 타이머를 제거했다. 서버가 전달한 진행 문구를 사용하며 새 예측 시간을 만들지 않는다.
- 12챕터 제목·본문을 보존하면서 일곱 읽기 흐름으로 목차를 묶었다. 굵게 표시된 과거 제목을 인식하고 제목으로 시작하는 일반 문장은 버리지 않는다.
- 화면 검증 결과는 fixture임을 본문에 표시한다. 실제 AI 결과로 제시하지 않는다.

### 상품 결과 품질

- 신규 프롬프트 버전 `saju-myeongsik-ai-v8`. 기존 12챕터·5그룹·총합 20,000자 계약과 토큰/호출 상한은 유지한다.
- 5~6장: 질문의 쟁점과 직접 관련된 영역을 우선하고 개인사를 만들지 않는다.
- 7~8장: 제공된 대운·세운만 사용한다. 월운이 없는데 특정 월/반기 차이를 요구하던 지시를 제거했다.
- 9~12장: 반대 조건, 선택지의 동일 기준 비교, 통제 가능한 행동과 확인 방법, 질문 중심 요약으로 역할을 구분했다.
- 짧은 유효 초안·부분 결과 보존, 같은 주문 재개, 저장 재조회 완료 판정은 기존 구현을 유지하며 회귀 검사한다.

### 실제 데이터와 한계

- 사용자 승인에 따라 운영 DB를 읽기 전용 조회했다. 2026-08-29~09-28 조회 시 `paid_execution_records`의 사주 기록은 completed 1건이었다.
- 모델 기록 Gemini 2.5 Flash, 이용권 사용. 저장 문자열 22,806자 / 공백 제외 17,582자. 정본 countPaidReportBodyChars 기준 본문은 17,309자다. 구·신규 렌더러 모두 12챕터·77문단을 표시하며 과거 결과에 새 완성 기준을 소급하지 않는다. 생성→완료 40,301ms는 LLM 단독 지연이 아니다.
- 기록 1건을 실제 고객 평균·전체 실패율로 해석하지 않는다. 테스트 주문 여부와 다른 저장소 포함 범위를 확인하지 않았으므로 대표성 미확인이다.
- 현재 구조 변경이 실제 생성 내용의 밀도를 개선했는지는 **미검증**. 실제 익명화 전후 결과 비교, 토큰 로그 기반 원가·실행 시간 측정은 아직 없다.
- 새 실호출은 mock·CI·스테이징 확인 후 구체적 호출 범위/상한으로 별도 승인받는다. 이 조건 전 다음 서비스로 넘어가지 않는다.

### 증거·검증

- `artifacts/fortune-consultation-ux/saju/before`: 변경 전 소스의 네 화면 폭 캡처·metrics.json.
- `artifacts/fortune-consultation-ux/saju/before-production`: 운영 배포 자산의 동일 규격 캡처. API는 모두 mock이며 실구매 증거가 아니다.
- `artifacts/fortune-consultation-ux/saju/stored-result-render-audit.json`: 운영 저장 1건의 익명 집계만 보관. 원문·개인정보·식별자는 없음.
- `artifacts/fortune-consultation-ux/saju/after`: 변경 후 진입점·입력·fixture 보관함 결과 캡처·metrics.json.
- 캡처는 Playwright mock 정적 셸이다. 모든 API를 대역 처리하고 외부 요청을 차단한다. 운영 전체 구매 흐름 검증으로 해석하지 않는다.
- `node --test __tests__/ui/saju-paid-delivery.behavior.test.js`: 9/9 통과. 부분 저장·같은 주문 재시도·앱 복귀·계정 격리·보관함·12챕터 보존·질문 초안 범위.
- `node scripts/verify-saju-ai-section-plan.mjs`: mock 160 checks 통과. provider/token 로그도 이 검사에서는 대역 값이다.
- `npm run check:fast -- --plan`: critical 자동 승격 확인. 실행 결과/CI/스테이징 증거는 아래 전달 기록에 갱신한다.
- 디자인·생성만 확인하고 실결제 성공, 비용 절감, 전환 향상을 주장하지 않는다.

## 다음 단계에 재사용할 요소

- `.consultation-entry`, `.consultation-form`, `.consultation-report`의 골격·터치·목차 규칙. 현재 사주만 활성화한다.
- 가격 저장소, 계정별 기존 복구 컨트롤러, 명시적으로 표시되는 AI 상담 설명, 계산 근거 직후 CTA.
- 체계별 입력·계산 자료·상담 문구를 사주와 공유하지 않는다. 각 단계의 저장·생성 경로를 확인해 어댑터만 최소 확장한다.

## 측정 정의

- `consultation_entry_view`: 주 카드 50% 이상 노출. `consultation_entry_click`: 주 버튼 클릭. `consultation_description_view`: 상품 설명 펼침.
- 이벤트 payload: service_id / entry_location / ux_version만 전달한다. 질문·생년월일·명식·결과·주문 ID는 보내지 않는다. 기존 cdTrack/동의 흐름을 사용한다.
- 클릭률은 해당 서비스 카드 노출 세션 중 클릭 세션으로 산정해 반복 이벤트를 세션 수준에서 중복 제거한다.
- 설명→결제는 기존 checkout_opened 이벤트의 feature_key(사주 alias 정규화 필요)와 설명 이벤트를 같은 세션에서 연결한다. 상담 시작 클릭을 결제 완료로 간주하지 않는다.
- 정상 전달률은 서버 주문/권리 사용 기록과 저장 재조회 완료 기록으로 주문별 집계한다. 브라우저 이벤트만으로 정상 전달을 확정하지 않는다. 즉시·복구 완료를 분리한다.
- 배포 전 28일 기준. 기존 이벤트가 없으면 기준을 복원하지 않고 수집 시작일·버전부터 같은 기간으로 비교한다. 표본이 쌓이기 전 성과 주장을 하지 않는다.

## 전달 기록

- 사주 코드 단위 전달 준비. 다음 네 상담은 미착수.
- 로컬 브라우저: 360·390·430·1440px, 무료 실제 계산→카드→입력, 키보드 진입, 출생 정보 수정 후 초안 유지, 시각 미상, 200% 글자 확대, 네오 모드, fixture 보관함 12챕터/7목차 통과. API는 전부 mock.
- `npm run check:fast` 실행: critical 승격. 초기 가격 하드코딩 가드를 가격 저장소 계약으로 수정 후 해당 검사 통과. 재실행 도중 문구 정리로 미러 불일치가 발생했으며 sync:public 완료 후 `npm run verify:ai-consultation-flows` 전체 통과. 추가 두 실패는 Windows CRLF를 고정 문자열 검사에서 다르게 읽은 경우였다. LF 정규화 후 해당 2검사 통과. 커밋 고정 재실행의 paid-gate-suite는 88/88 통과했으며 나머지 계획 검사는 후속 기록으로 남긴다.
- `npm run verify:sitemap-drift`: 1,300 URL 일치. `git diff --check`: 통과. 사주 behavior 9/9 재통과.
- 변경 정본: `index.html`, `js/saju-engine.js`, `styles/fortune-consultation.css`, `worker/lib/saju-ai-prompt.js`, `worker/routes/fortune.js`. 가격·주문·권리·인증·DB 스키마는 변경하지 않음.
- 검증 변경: `__tests__/ui/saju-paid-delivery.behavior.test.js`, `scripts/verify-ai-prompt-billing-policy.mjs`, `scripts/verify-fortune-consultation-ux.mjs`. public 미러·캐시키·sitemap은 공식 생성기로 갱신.
- 커밋·main CI·staging SHA 및 변경 후 staging 캡처는 전달 후 이 문서에 누적한다. 실제 생성 품질·원가는 아직 미검증.


### 실제 생성 비교의 별도 승인 범위 (아직 실행 안 함)

- 비교 대상: 읽기 전용으로 확인한 기존 결과 1건. 이름·연락처·장소·개인 식별 표현을 제거한 질문과 계산 근거를 사용해 v8 결과 1건을 생성하고, 질문 답변·근거 연결·반대 조건·선택지·실행성·중복·가독성을 사람이 비교한다. 테스트 표본을 고객 평균으로 보고하지 않는다.
- 제안 범위: Gemini 2.5 Flash, 기존 5그룹 각각 1회(최대 5 생성 호출), 그룹 출력 상한 12,000토큰/합계 60,000토큰. 자동 보강·재시도·모델 폴백 없이 실패도 그대로 기록한다. 가격 정책/실결제/운영 DB 쓰기는 실행하지 않는다.
- 입력 합계 100,000토큰 이하를 사전 확인하고 이를 넘으면 실행하지 않는다. 외부 검색·명시 캐시 생성은 사용하지 않는다. 예산 한도 USD 1.00, 이 범위의 정가 토큰 상한은 입력 $0.03 + 출력(생각 포함) $0.15 = $0.18이다. 이는 청구 실측이 아닌 상한 계산이다.
- 가격 근거: 2026-09-28 확인한 [Google Gemini 공식 가격](https://ai.google.dev/gemini-api/docs/pricing#gemini-2.5-flash), Standard 입력 $0.30/1M, 출력 $2.50/1M. 실행 직전 모델·가격·입력 계측을 재확인한다.
- 필요한 이유: CLAUDE.md 절대 규칙 1: “과금 LLM 검증 금지. mock 기본, 실호출은 정확한 1회 승인 필요.” 사용자의 이번 계획도 새 실호출의 범위·예산 별도 승인을 명시했다. 구현/mock/main CI/staging 증거를 모두 확보한 뒤 승인 요청한다.
- 승인 후 산출물: 익명화 전후 비교, 각 그룹의 usageMetadata(입력/출력/생각/캐시), 호출 지연, 전체 조립 시간, 저장 없는 오프라인 렌더 캡처. 실제 저장·재조회 운영 통계와 구분한다.


### 생성 파일 정합 수정

- 사주 구현 main 커밋: `2903cd057` (격리 원본 `6378a7ff2`).
- 최초 [main CI](https://github.com/rei1237/codedestiny/actions/runs/36363250239)는 Typecheck/lint 및 Critical checks 통과 후 public 미러 신선도에서 실패했다. 새 CSS의 검색 제외 목록과 index-inline-runtime의 전이 캐시 참조 9파일을 생성기로 다시 맞췄다. 기능 우회나 검사 완화는 하지 않았다.
- 수정 main 커밋: `b2b024c89` (격리 원본 `c48bf7da5`). `npm run verify:public-mirror-fresh`: 생성 후 변화 없음, 통과.
- [수정 main CI](https://github.com/rei1237/codedestiny/actions/runs/36363850566) 및 스테이징 완료 증거는 아래 갱신한다.

- `npm run check:fast -- --committed-head` 최종 exit 0. paid-gate-suite 88/88, Jest 309 suites / 4,512 tests 통과. 초기 실패의 수정 후 검사를 완료했다.
- 수정 CI의 미러 검사는 통과. 인수인계 frontmatter 누락만 남아 템플릿의 status/updated/next를 추가했다. 문서 변경 외 제품 코드는 추가 수정하지 않았다.


### main CI 통과와 스테이징 화면 증거

- [main CI 36364334500](https://github.com/rei1237/codedestiny/actions/runs/36364334500): `52af571dce151b29f6b11f6d74911e54eb6c81ee`, success / CI required success. 본문·Worker 구현의 Critical checks는 최초 구현 CI에서, 미러/빌드는 정합 수정 CI에서 통과했고, 마지막 문서 수정 후 정적 가드 전체도 통과했다.
- staging 모의 브라우저 결과: 360·390·430·1440px 진입·가격·질문 입력·프로필 수정·시각 미상·200% 확대·Neo·12챕터/7목차 보관함·다시 질문 통과. `after-staging/` 캡처를 확인했다.
- 브라우저 하네스는 무료 계산의 지연 렌더 완료를 기다린다. 보관함 fixture 주입 시 mock 인증 API도 같은 fixture 사용자를 반환한다. 이전 `user:null` 대역 때문에 제품이 정상적으로 로그아웃 처리한 실패는 제품 결함으로 분류하지 않는다. 실제 인증·결제·생성 호출은 없다.
- `b2b024c89` staging job의 success는 최신 커밋에 양보한 종료였다. 이 SHA의 배포 확인은 불일치로 실패했으며 배포 증거로 사용하지 않는다. 최종 실배포 SHA는 후속 확인으로 남긴다.


### 확정한 스테이징 검증

- `npm run verify:staging -- --sha=4f407762eb17b6e9aacf27a9d51918333c21d0bf`: Pages /version.json 및 Worker /api/version 모두 PASS, 같은 SHA. [배포 작업](https://github.com/rei1237/codedestiny/actions/runs/36364401868).
- 위 배포에서 `node scripts/verify-fortune-consultation-ux.mjs --base https://staging.code-destiny.com`: exit 0. `artifacts/fortune-consultation-ux/saju/after-staging/`가 이 SHA의 최종 화면 증거다. 결과 캡처는 실제 viewport 기준이며 본문 전체 보존은 DOM 및 렌더 검사가 별도로 확인한다.
- 이 SHA의 검증 후 결과 상단의 기존 260자 발췌가 챕터 제목을 섞어 보여주는 점을 발견했다. 본문 원문은 그대로 두고 첫 문단만 보여주며 “상담 첫 문단”으로 정확히 표시했다. 이 작은 표시 수정의 최종 CI/스테이징 결과를 후속 기록한다.
- 현재 사주 단계는 **실제 생성 품질 비교 승인 대기**다. 코드·mock·스테이징 검증을 마쳤지만 전체 단계 완료는 아니며 나머지 네 서비스는 미착수다. 운영 승격·실결제·실 LLM·운영 DB 쓰기는 0회.

- 첫 문단 발췌 검사 추가 후 saju behavior 10/10 통과. 제목/후속 챕터 혼입 방지·HTML 이스케이프·과거 단일 본문 호환을 확인했다. 로컬 네 규격 브라우저 재검증 통과.


### 최종 전달 증거 — 상담 첫 문단 표시 포함

- 최종 제품 커밋: `f4e3de3e47cd0e527cd548fe527f05163892009d` (격리 원본 `4c0652a15`). [main CI 36365543804](https://github.com/rei1237/codedestiny/actions/runs/36365543804): Risk tier / Typecheck and lint / Build Pages and Worker / Critical checks / Static guards / CI required **모두 success**.
- [staging 배포 36365567517](https://github.com/rei1237/codedestiny/actions/runs/36365567517): success. `npm run verify:staging -- --sha=f4e3de3e47cd0e527cd548fe527f05163892009d`의 Pages·Worker **모두 PASS**.
- 해당 배포의 네 규격 브라우저 전체 재검증 exit 0. `after-staging/` 캡처를 이 최종 배포로 갱신했다. 서버 결제/생성/인증 응답은 대역이며 실제 무료 계산과 배포된 정적 자산을 사용했다.
- 마지막 수정 이후 `npm run check:fast -- --committed-head --plan` 및 실행 exit 0. paid-gate-suite 88/88, saju behavior 10/10, Jest 309 suites / 4,512 tests 통과. public mirror freshness도 통과.
- CSS 색상값으로 계산한 대비: 연이 본문 13.19:1, 보조 문구 6.51:1, 주요 버튼 7.10:1, 네오 본문 14.63:1/버튼 10.90:1, 결과 본문 13.10:1. 이는 지정 색상 대비 계산이며 전체 사이트 접근성 인증을 의미하지 않는다.
- 이 이후 커밋은 검증 문서·캡처 증거만 갱신한다. 다음 작업은 위 승인 범위의 **신규 사주 상담 1건 실제 생성 비교**다. 실측 승인 전 자미두수로 넘어가지 않는다.


### 승인 후 실제 생성 비교와 후속 교정 — 2026-09-28

- 사용자의 “응 허가할테니 진행해”에 따라 위 사주 1건·최대 5회·USD 1 범위를 실행했다. 생성 호출 5회, 입력 97,471토큰/출력 17,154토큰, 계산 비용 USD 0.0721263, 병렬 LLM wall time 23,696ms. 실결제·운영 DB 쓰기·운영 승격·생성 재시도는 0회다.
- 비용은 [공식 표준 요금](https://ai.google.dev/gemini-api/docs/pricing#gemini-2.5-flash)으로 토큰 사용량을 계산한 값이며 실제 청구액은 아니다. 기존 표본 비용/LLM 시간은 알 수 없다.
- 최초 v8 입력 사전 계측은 첫 그룹 30,647토큰이었다. 승인된 총 입력 상한 때문에 생성 전에 동일 사실 구조/카드의 중복을 제거하고 반복 행은 열 이름을 한 번만 보내도록 했다. 저장·응답 factSnapshot/advancedFactors는 그대로 유지하고 값 복원 검사를 추가했다. 실제 호출 버전은 v9다.
- 기존 실제 1건: v6, 본문 17,309자/12챕터. 신규 실제 1건: v9, 본문 22,216자/12챕터. 질문은 재물운을 묻는 일반 질문이며 이름·생년월일·주문/사용자 식별자는 신규 요청에서 제외했다. 기존 원본 요청이 없어 저장 근거로 재구성했으며, 일부 파생 근거와 원래 CMS 설정을 재현하지 못했다. **통제된 A/B 비교나 고객 평균으로 일반화하지 않는다.**
- 편집 검수는 **불합격**: 계산되지 않은 도화살, 생활 오행 활동이 재물을 끌어당긴다는 인과, 현재 나이 없이 현재 대운 추정, 반복 설명이 남았다. 30일 행동·확인 기준이 구체화된 부분은 있지만 전체 품질 개선을 선언하지 않는다.
- 실제 본문에서 확인한 오류 세 가지를 수정했다: ① “권해드립니다” 정상 끝맺음 오탐 ② 가까운 별도 천간·십성 쌍을 섞는 18자 근접 검사 ③ 부제 있는 8장 제목을 인식하지 못해 11챕터로 묶는 화면 파서. 완결/직접 대응/제목 구조 기준으로 수정하고 잘린 문장·잘못된 십성·일반 본문 오인 방지 검사를 남겼다. 원문을 잘라내거나 바꾸지 않는다.
- v10 지침은 근거 밖 신살/현재 대운 추정/점수 과장/오행 활동과 재물의 인과를 금지하고, 첫 답변·짧은 문단·중복 방지를 강화했다. **v10 신규 실제 생성은 미검증**이다. 기존 v9 원문을 오프라인으로 다시 검사하면 구조 검사는 12챕터/카테고리 5항목으로 통과하지만 의미적 검수 불합격은 유지한다.
- 새 증거: `artifacts/fortune-consultation-ux/saju/live-benchmark-summary.json`, `live-quality-review.md`, `reviewed-result/result-390.png`, `result-1440.png`, `metrics.json`. 화면은 실제 생성 텍스트 + 로컬 보관함 fixture이며 결제/인증/저장은 mock이다. 실제 정상 전달률 증거로 쓰지 않는다.
- 변경 파일: `worker/lib/saju-ai-prompt.js`, `worker/routes/fortune.js`, `js/saju-engine.js` 및 생성 미러/캐시 참조, 사주 prompt 2종/UI behavior 검사, `scripts/benchmark-saju-consultation.mjs`, `scripts/verify-fortune-consultation-ux.mjs`, 본 문서와 위 증거. benchmark는 기본 오프라인이며 명시 실행 플래그·사전 토큰 계측·5회 상한·재실행 방지 파일을 사용한다. 원본 입력/제공자 응답은 저장소 밖 비공개 로컬 경로에만 보관했다.
- targeted 검사: 사주 prompt 27/27, UI behavior 11/11, section plan 160(mock). 최종 check:fast/CI/스테이징 기록은 이 단위 전달 후 아래에 확정한다.
- **다음 단계:** 승인한 5회는 소진되었다. 후속 실측은 v10 사주 1건, 동일 익명화 근거, Gemini 2.5 Flash 최대 5회, 입력 합계 100,000·출력 최대 60,000토큰, USD 1 이내, 자동 재시도/폴백/실결제/운영 쓰기 없음으로 별도 승인 후 실행한다. 예산은 사전 확인하며 넘으면 호출 전 중단한다. 사주 검수 통과 전 나머지 네 서비스는 미착수다.

- 로컬 확정: `npm run check:fast -- --plan` 및 `npm run check:fast` exit 0. paid gate 88/88, Jest 309 suites/4,515 tests. 사후 최종 변경을 포함한 targeted prompt 27/27, UI 11/11, section-plan 160/160, 실제 생성 텍스트를 넣은 mock 브라우저 exit 0. 12챕터·7개 탐색과 8장 부제 보존을 확인했다. 긴 문단/근거 밖 해석은 그대로 캡처해 미해결 품질 문제로 남겼다.
- `npm run verify:sitemap-drift`: 1,300 URL 일치. public mirror freshness는 커밋 전 실행 시 dirty-tree 때문에 판정 불가였으며, 커밋 후 확인해야 한다. `git diff --check` 통과. 검증 중 추가된 수정은 위 targeted 검사를 다시 실행했으며 최종 스냅샷의 공식 판정은 main CI를 따른다.


### v10 전달 및 다음 실측 준비

- 제품 main 커밋: `fcbdc3faaecd19272eff640571244dda3411fccb` (격리 원본 `04d061915`). main push 완료. [CI 36368872481](https://github.com/rei1237/codedestiny/actions/runs/36368872481), [스테이징 배포 36368905363](https://github.com/rei1237/codedestiny/actions/runs/36368905363)의 최종 상태는 후속 확인으로 확정한다.
- 커밋 후 `npm run verify:public-mirror-fresh`: PASS. 생성기로 재실행해도 미러 변경 없음. `npm run verify:handoff-contract`: 206개 문서 PASS.
- v10 **토큰 수만** 사전 조회: 그룹별 19,716 / 19,722 / 19,770 / 19,796 / 19,812, 합계 **98,816**. 새 generation 호출 0회. 동일 상한(입력 100,000·출력 60,000)에서 후속 실측을 준비했다.
- 다음 실측 승인 전에는 아래 명령의 `--execute-approved`를 실행하지 않는다. 기존 live-v9 출력의 승인 사용 기록은 보존하며 같은 폴더로 재실행하지 않는다. 비용 상한/동일 질문·계산 근거/최대 5회 조건으로 새 승인이 있어야 한다.

```powershell
Set-Location 'C:\Users\user\.codex\worktrees\fortune-consultation-ux\code-destiny'
# 기본 실행은 오프라인 입력 점검만 수행한다.
node scripts/benchmark-saju-consultation.mjs --input D:/Development/fortune-consultation-private/reconstructed-input.json --output D:/Development/fortune-consultation-private/live-v10
# 새 승인 후에만 실행:
# node scripts/benchmark-saju-consultation.mjs --input D:/Development/fortune-consultation-private/reconstructed-input.json --output D:/Development/fortune-consultation-private/live-v10 --env-file D:/Development/code-destiny/.env.local --execute-approved
```


### v10 배포·화면 검증 확정

- `fcbdc3faaecd19272eff640571244dda3411fccb`의 [main CI](https://github.com/rei1237/codedestiny/actions/runs/36368872481)는 Risk tier / Static guards / Typecheck and lint / Critical checks / Build Pages and Worker / CI required **모두 success**. 별도 [Paid Flow Gates](https://github.com/rei1237/codedestiny/actions/runs/36368872534)도 success.
- [배포 36368905363](https://github.com/rei1237/codedestiny/actions/runs/36368905363) success 후 `npm run verify:staging -- --sha=fcbdc3faaecd19272eff640571244dda3411fccb`: **Pages PASS / Worker PASS**. 배포 종료 전에 실행한 확인은 이전 `4160641ee` 때문에 실패했으며, 이를 배포 성공 증거로 사용하지 않았다.
- `node scripts/verify-fortune-consultation-ux.mjs --base https://staging.code-destiny.com --result-file D:/Development/fortune-consultation-private/live-v9/result.txt`: exit 0. 360·390·430·1440px의 카드/설명/입력 및 실제 본문 화면, 12챕터/7개 탐색/8장 부제, 결과 가로 넘침 없음을 확인했다. 서버 API는 전부 mock, 외부 호출 차단. 실제 생성 본문을 mock 보관함에서 읽은 것이며 실제 주문 저장·전달 증거가 아니다.
- 최종 화면 증거: `artifacts/fortune-consultation-ux/saju/reviewed-result-staging/metrics.json`, `result-{360,390,430,1440}.png`, `result-chapter8-{360,390,430,1440}.png`. 360px/1440px 부제 화면을 시각 확인했다. v9의 근거 밖 문구는 삭제하지 않았고 품질 불합격 증거로 보존했다.
- 이 이후 증거 커밋은 인수인계/브라우저 검사 범위/캡처만 갱신한다. 제품 정본과 배포 증거는 위 fcbdc3faa다. **전체 사주 단계는 추가 실측 승인 대기**이며 자미두수·숙요·서양·베다는 미착수다.


### v10 실제 생성과 v11 교정 — 2026-09-28

- 사용자의 추가 승인으로 `live-v10`을 정확히 한 번 실행했다. Gemini 2.5 Flash 생성 5회, 입력 98,816토큰, 출력 14,854토큰, 병렬 wall time 25,961ms, 공식 Standard 요금 기준 계산 비용 USD 0.0667798. 5회 모두 `STOP`이었다.
- 실결제·운영 DB 쓰기·재시도·폴백·명시 캐시 생성·운영 승격은 0회다. 원본과 제공자 응답은 저장소 밖 `D:/Development/fortune-consultation-private/live-v10`에만 보존한다.
- 본문은 공백·제목 제외 19,411자, 12챕터, 카테고리 5항목이다. 기존 검증기는 20,000자보다 589자 짧다는 이유만으로 실패시켰다. 구조·근거·반복·완결 검사를 통과한 마지막 후보는 분량 경고를 남기고 전달하도록 바꿨고, bounded 그룹 보강은 유지했다.
- 편집 검수는 **불합격**이다. v9의 근거 밖 도화살·현재 대운 추정·생활 오행 의식은 줄었지만, 오행 부재→재정 통제/질환 인과, 점수→큰 수익·절호의 기회 확대, 금융상품·부동산·주식·코인 조언, 비겁/십성 반복이 남았다.
- v11은 점수·등급 산문 전재, 결과 규모 예언, 오행→성격/재정/질환 직접 인과, 특정 투자 선택 조언을 금지했다. 구조 설명(2~4장)·질문 적용(5~8장)·선택/행동(9~12장)의 역할도 분리했다.
- 증거: `artifacts/fortune-consultation-ux/saju/live-v10-benchmark-summary.json`, `live-v10-quality-review.md`. 원문·요청 해시·개인정보는 저장소에 넣지 않았다.
- targeted 검증: `node scripts/verify-saju-ai-section-plan.mjs` 183 checks 통과. prompt/advanced-factor Jest 27/27 통과. v10 원문 오프라인 재검사는 12챕터·5항목·분량 advisory로 구조 통과했지만, 의미 품질 불합격은 그대로다.
- `npm run check:fast -- --plan`은 critical로 자동 승격했다. `npm run check:fast` 최종 exit 0: paid-gate-suite 88/88, Jest 309 suites / 4,515 tests, Node 1,795 tests, lint·typecheck·Worker dry-run·사주/결제/복구 게이트 통과. 첫 실행은 이전 “분량 미달 영구 partial” 기대 테스트 1개가 실패했고, 새 계약인 bounded 보강 후 완료·저장 재조회·추가 호출 없음으로 고친 뒤 전체 재실행했다.
- **다음 단계:** v11 변경을 `check:fast`·main CI로 전달한다. 새 실호출은 다시 별도 승인받기 전 실행하지 않으며, v11 의미 품질 통과 전 자미두수에 착수하지 않는다.


### v11 전달 확정

- v11 제품·검사·증거 main 커밋: `825cfdeb63bc90a32cd10e26e618ec522558bbe6` (격리 원본 `7dfde7b78`). 정확히 사주 관련 8개 파일만 반영했고 기존 마케팅·카드뉴스·영냥이 작업은 포함하지 않았다.
- 해당 SHA의 [Paid Flow Gates](https://github.com/rei1237/codedestiny/actions/runs/36373475328)는 success. 동시 세션이 `main`을 `412dda4987f0d503a3df5b9bbef0ee62d6175ca5`까지 전진시켰으며, `825cfdeb6`가 최신 main의 조상임을 확인했다.
- 최신 main의 [PR CI](https://github.com/rei1237/codedestiny/actions/runs/36373646056)는 Risk tier / Typecheck and lint / Build Pages and Worker / Critical checks / Static guards **모두 success**. AI Locale Gate·Landing Watchdog·Main drift watchdog·Secret Scan도 success. 최초 Release 실행도 success였고, 중복 후속 Release 실행 1건은 동시 실행 정책으로 취소됐다. 스테이징 URL·버전은 일상 push 범위에서 별도 확인하지 않았다.
- **현재 단계:** v10 실제 의미 품질은 불합격이며 자미두수는 미착수다. v11은 mock·정적·회귀·CI 검증만 통과했다. 다음 행동은 동일 안전 상한의 v11 사주 1건 실제 생성에 대한 새 별도 승인 후 실측하고, 의미 품질이 통과할 때만 자미두수를 시작하는 것이다.


### v11 실제 생성 불합격·v12 교정과 사주 진입점 v2 — 2026-09-28

- 사용자 승인 범위로 v11 사주 1건을 실측했다. 첫 실시간 사전 계측은 입력 100,398토큰으로 상한을 398토큰 넘겨 생성 0회로 중단했다. 반복된 공통 시스템 지시만 축약한 뒤 새 재실행 방지 경로에서 5개 그룹을 정확히 한 번 생성했다.
- 실제 생성 5회 모두 `STOP`: 입력 99,608토큰, 출력 16,019토큰, 본문 21,514자, 병렬 wall time 23,931ms, 공식 Standard 요금 기준 계산 비용 USD 0.0699299. 실결제·운영 DB 쓰기·재시도·폴백·명시 캐시 생성·운영 승격은 0회다.
- 의미 품질은 **불합격**이다. 같은 290~395자 문단 세 개가 두 번씩 반복됐고, 화 오행 부재를 재정 통제력·충동 투자로, 비겁을 동업 손실로, 재성을 투자 성향으로 확대했다. 부동산·채권·배당주 권유와 특정 대운 나이의 사업·투자 확대 예고도 남았다. 자미두수는 미착수 상태를 유지한다.
- v12는 위 네 종류의 근거 밖 금융 인과를 결과 검증에서 거부하고, 대운 나이를 사건 예고로 사용하지 않으며, 출력 전 문단 중복 제거와 챕터별 근거 소유를 요구한다. 새 실호출은 하지 않았다.
- 사주 진입점은 작은 썸네일 카드에서 전용 장면형 히어로로 재설계했다. 기존 연이 원본을 참조해 딥 플럼·한지·옻칠·샴페인 골드의 사주 전용 에셋을 새로 만들고, 640/1280 WebP로 배포한다. 데스크톱은 왼쪽 질문 중심 CTA와 오른쪽 명식 장면, 모바일은 16:10 장면 뒤 밝은 상담 설명으로 이어진다.
- 가격은 서버 정본을 그대로 읽고 이용권·월정석·단건 결제 구조, 인증·결제·API·DB 계약은 변경하지 않았다. 다음 서비스도 각 체계의 계산·상담 장면을 별도 에셋과 진입 UX로 설계한다.
- 증거: `artifacts/fortune-consultation-ux/saju/live-v11-benchmark-summary.json`, `live-v11-quality-review.md`, `after/entry-{360,390,430,1440}.png`. 원문·제공자 응답·요청 해시는 저장소 밖 비공개 경로에만 보존한다.
- **다음 단계:** v12와 사주 진입점 v2를 검증·전달한다. v12 실제 의미 품질은 새 별도 승인 전 미검증이며, 통과 전 자미두수로 넘어가지 않는다.


### v12·사주 진입점 v2 전달 확정

- 제품·에셋·검사·증거 main 커밋: `c5656f3f0e397337efc47fc4464e73b7e955b14b` (재배치 전 격리 원본 `b85551282`). 기존 main의 카드뉴스·영냥이·`next-env.d.ts` 미커밋 작업은 포함하거나 덮어쓰지 않았다.
- [main CI 36386035230](https://github.com/rei1237/codedestiny/actions/runs/36386035230): Risk tier / Critical checks / Typecheck and lint / Build Pages and Worker / Static guards / CI required **모두 success**. [Paid Flow Gates 36386035265](https://github.com/rei1237/codedestiny/actions/runs/36386035265)도 success.
- 로컬 최종 `npm run check:fast` exit 0: paid-gate-suite 88/88, Jest 309 suites / 4,519 tests, Node 1,823 tests, lint·typecheck·Worker dry-run·사이트맵·사주/결제/복구 게이트 통과. 커밋 후 public mirror freshness와 handoff contract도 통과했다.
- UI 브라우저 검증은 360·390·430·1440px에서 진입점·명식·상담·결과 화면과 가로 넘침을 확인했다. API는 mock이고 외부 요청은 차단했으므로 실제 결제·저장·운영 전달 증거가 아니다.
- **다음 단계:** v12 사주 1건 실측은 새 별도 승인 전 실행하지 않는다. 의미 품질 통과 시에만 기본 자미두수의 전용 에셋·진입 UX 작업을 시작한다.


### v12 실제 생성 불합격·v13 교정 — 2026-09-28

- 사용자의 새 승인 범위로 `live-v12`를 정확히 한 번 실행했다. Gemini 2.5 Flash 생성 5회 모두 `STOP`: 입력 99,573토큰, 출력 14,044토큰, 본문 18,299자, 병렬 wall time 22,597ms, 공식 Standard 요금 기준 계산 비용 USD 0.0649819.
- 실결제·운영 DB 쓰기·재시도·폴백·명시 캐시 생성·운영 승격은 0회다. 원본과 제공자 응답은 저장소 밖 `D:/Development/fortune-consultation-private/live-v12`에만 보존한다.
- 의미 품질은 **불합격**이다. 완전 동일 문단 반복은 사라졌지만, 오행→재정/건강 인과, 비겁→동업 손실, 재성·식상→수익 가능성, 특정 금융상품 제안, 대운 점수·나이별 투자/사업 사건 예고가 남았다. 다섯 생성 그룹 모두 v13 검증에서 별도 거부됐다.
- 원인은 안전 지시와 동시에 재물 분석 각도가 동업 리스크·수익 모델 추천·재성 시점을 요구한 프롬프트 내부 모순이었다. v13은 이 지시를 실제 기록 확인·작은 검증·되돌릴 수 있는 선택 기준으로 바꾼다.
- 생성용 사실 카드와 JSON에서는 점수·등급 라벨을 제외하되 저장·응답 `factSnapshot`은 유지한다. 위험한 그룹은 길이가 충분해도 보강 대상으로 보내며 더 긴 위험 원문보다 안전한 보강본을 우선한다.
- 증거: `artifacts/fortune-consultation-ux/saju/live-v12-benchmark-summary.json`, `live-v12-quality-review.md`. 요청 해시·원문·제공자 응답·개인정보는 저장소에 넣지 않았다.
- 자미두수는 미착수 상태를 유지한다. v13 새 실호출은 다시 별도 승인받기 전 실행하지 않는다.
- 전달: 사주 v13 본체 `f454d8a71`, main 병합 `39cf9313e`, CI 보정 `6b5fe6954`·`cf3259cea`. 사주 변경 SHA의 Paid Flow Gates `36391806115`와 AI Locale Gate `36391806117`, 최종 main PR CI `36392693696`이 통과했다.


### v14 실제 생성 불합격·v15 교정 — 2026-09-28

- 사용자 승인 범위로 저장소 밖 `live-v14` 경로에서 사주 1건을 정확히 한 번 실행했다. Gemini 2.5 Flash 생성 5회 모두 `STOP`: 입력 98,824토큰, 출력 15,454토큰, 본문 20,658자, 병렬 wall time 30,272ms, 공식 Standard 요금 기준 계산 비용 USD 0.0682822.
- 실결제·운영 DB 쓰기·자동 재시도·모델 폴백·명시 캐시 생성·운영 승격은 0회다. 원본 입력·원문·제공자 응답·요청 해시는 저장소 밖에만 보존한다.
- 의미 품질은 완화한 게이트에서도 **중대 오류로 불합격**이다. 오행·십성에서 재정 통제·수입 능력·동업/투자 손실을 인과로 만들고, 대운 나이에 자산 성장·수입 안정·투자 유불리를 예고했으며, 금융상품 이용을 제안했다. 문체나 분량의 경미한 흠만으로 차단한 것이 아니다.
- v15는 재물 템플릿과 rubric의 내부 모순을 제거한다. 명식으로 수익 모델·투자 위험을 예언하지 않고 실제 현금흐름 기록, 비용 비교, 손실 감당 범위, 계약·정산 조건, 30일 재검토로 답한다. 등급 이름·나이별 재정 사건·금융상품 우회 권유를 회귀 검사에 추가한다.
- 품질 게이트는 완화했다. 카테고리 5항목 중 4개는 목표이며 3개 직접 답변은 경고와 함께 전달한다. 2개 이하, 계산 근거 충돌, 금융상품 권유, 건강 인과, 시기 사건 보장은 중대 오류로 차단한다. 분량 미달은 기존처럼 단독 실패 사유가 아니다.
- 증거: `artifacts/fortune-consultation-ux/saju/live-v14-benchmark-summary.json`, `live-v14-quality-review.md`. 후속 자미두수·숙요·서양 점성술·베다점과 해당 이미지 생성은 게이트에 따라 미착수다.
- **다음 단계:** v15 코드·mock·CI를 전달한 뒤, 동일 상한의 v15 사주 1건 실제 생성은 새 별도 승인 후 실행한다. 중대 오류가 없으면 경미한 문체·밀도 경고는 허용하고 자미두수부터 네 서비스를 중간 승인 없이 연속 진행한다.
- v15 제품·검사·익명 증거 main 커밋: `a870d9e4583af17057ed812625bdb70c5403f20d`. [PR CI 36398164976](https://github.com/rei1237/codedestiny/actions/runs/36398164976)의 Risk tier / Typecheck and lint / Critical checks / Build Pages and Worker / Static guards / CI required가 모두 success였고, Paid Flow Gates·AI Locale Gate·Secret Scan·Landing Watchdog·Main drift watchdog도 같은 SHA에서 success였다. 배포 인프라 변경이 없어 별도 staging 검증은 생략했다.

### v15 승인 실측 — 2026-09-29 (KST)

- 사용자의 “승인할테니 나머지 큰 문제없으면 나머지 운세 작업 진행해줘”에 따라 v15 사주 1건을 실측했다. Gemini 2.5 Flash 5그룹 각각 1회, 모두 `STOP`: 입력 99,359토큰, 출력 16,258토큰, 본문 21,581자, 병렬 생성 wall time 25,090ms.
- benchmark 설정 요금 기준 계산 비용 USD 0.0704527, 사전 상한 계산 USD 0.1798077. 청구 실측이나 현재 요금 재검증은 아니다. 실결제·운영 DB 쓰기·자동 재시도·모델 폴백·명시 캐시 생성·운영 승격은 0회다.
- **중대 오류로 불합격**. 자동 검증 `element-causality` 차단을 원문 검수에서도 확인했다. 화 부재→재정 규율 어려움, 비겁→동업 손실, 재성·상관→수입 능력, 대운 나이·세운→수입·투자 기회, 소액 주식 매수 예시가 남았다. 문체·분량 경고만으로 차단한 것이 아니다.
- 익명 증거: `artifacts/fortune-consultation-ux/saju/live-v15-benchmark-summary.json`, `live-v15-quality-review.md`. 원문·입력·제공자 응답·요청 해시는 저장소 밖 `D:/Development/fortune-consultation-private/live-v15`에만 보존한다.
- 승인된 5회는 소진했다. 후속 네 서비스의 진행 조건을 충족하지 못했으므로 구현·이미지 생성은 미착수이며, 새 실호출은 하지 않았다. 제품·가격·이용권·월정석·단건 결제·인증·API·DB 로직 변경은 없다.
- 다음 교정은 재물 전용 지시만 바꾸는 방식 대신 전체 챕터와 캐릭터 요약의 근거 경계를 함께 검토한다. ‘작은 검증’은 금융상품 매수 제안으로 바꾸지 않는다. 후속 실측에는 새 별도 승인이 필요하다.
- 이번 단위는 실측 판정과 증거 기록이다. 제품 수정·교정 구현·후속 운세 작업을 완료했다고 표시하지 않는다.
- 재개 위치: `D:/Development/code-destiny`, 문서 `D:/Development/code-destiny/docs/handoff/fortune-consultation-ux.md`, 시작 기준 커밋 `f14a8e3325718cabde36e005d1bf7b07ba5384cf`. 기존 `marketing/**`·`next-env.d.ts` 미커밋 변경은 보존한다. 최신 증거 커밋은 `git log -1 --format=%H -- docs/handoff/fortune-consultation-ux.md`로 확인한다.
- 기록 검증: `node scripts/verify-handoff-contract.mjs` exit 0 (207개 문서), `git diff --check` exit 0. `npm run check:fast -- --plan`은 JSON 증거 미분류로 critical 승격했다. `npm run check:fast` 실행 중 paid-gate-suite 88/88 통과(536.1초)를 확인했으며 후속 단계와 main CI 상태는 전달 뒤 확인한다.
- 로컬 최종 결과: `npm run check:fast` exit 1. paid-gate-suite 88/88·문서 freshness·lint는 통과했지만 `verify:sitemap-drift`에서 날짜 롤링 URL(9월 29일 추가 12 / 8월 30일 제거 12)의 추적본 불일치로 중단했다. 뒤의 typecheck·Node·Worker build·Jest 단계는 이 실행에서 도달하지 않았다. 시작 SHA와 이번 증거 SHA 사이에 사이트맵·생성기·제품 소스 변경은 없다. 별도 기존 사이트맵 확인이 필요하며 증거 기록 범위에서 생성물은 수정하지 않았다.
- main 증거 전달: `63139012d5d8a6bda698cbe7907b42b4d252c16b`, `git push origin main` 완료. PR CI `36468256906`의 Typecheck and lint는 success이며 나머지 결과는 진행 중이다. staging URL이나 배포 완료는 별도로 검증하지 않는다.
