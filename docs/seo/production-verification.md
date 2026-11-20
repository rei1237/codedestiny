# 운영 승격 전 패킷과 운영 검증 (2026-11-14 ~ 2026-11-15)

**결론: 2026-11-15 00:54 KST에 운영 승격을 1회 실행했고 성공했다.** 런 43612648387, 운영은 `91e4261d8` → `f8a4ec2af`. 자동 롤백은 없었다. 운영 검증(5절)에서 홈·핵심 허브·유료 라우트의 5xx는 없었다. 승격 때 IndexNow 제출이 실패했고(5-6, 이 승격 전부터 있던 원인), 같은 날 고쳐서 1,081건을 따로 제출했다(5-6a, 수정 `f03d8add0`).

2026-11-14에는 승격을 실행하지 않았다. 다른 세션의 웹 운영 변경이 같이 나가는데 그 동반 출고가 승인되지 않았기 때문이다(2~4절은 그때의 패킷). 2026-11-15에 사용자가 동반 출고를 승인했다.

따로 적지 않으면 모두 직접 실행해 확인한 값이다. 추정은 "추정"이라고 적었다.

## 1. 승인

- 사용자 원문: "승격 승인할께 운영에서 이 변경이 적용되도록해줘" (2026-11-14, 조정 세션이 전달).
- 범위: 로컬 3커밋을 main에 push, 운영 승격 1회. 운영 검증에서 나온 결함의 수정·재승격은 하지 않고 보고.
- 사용자 원문: "함께 내보내" (2026-11-15, 조정 세션이 전달). "다른 세션 변경 약 360커밋(유료 기능 인증·결제 확인 분기, 유료 실행 거래 재시도 래퍼, PaidExecutionRecord 필드 추가, 영냥이 상품·주문 준비, 꿈해몽·숙요 리팩터링 포함)을 함께 운영에 내보낼까요?"에 대한 답이다.
- 합친 범위: 운영 승격 워크플로 **1회**. 재실행, 수동 롤백, main push는 들어 있지 않다.

## 2. 지금 운영과 main

| 항목 | 값 |
|---|---|
| 운영이 서빙하는 버전 (`https://code-destiny.com/api/version`, 2026-11-14 22:36 KST) | `91e4261d8f00309ae10fa0d7b57216304f805248` (커밋 시각 2026-11-13 22:00 KST) |
| Pages·Worker 활성 버전 (`npm run deploy:rollback -- --list`, 읽기 전용) | 둘 다 `91e4261` |
| 패킷을 계산한 main | `7e8d6523a` (이후 toss 문서·테스트 커밋 2개 `118456b3a`·`3095d6149`, 그 위에 이 작업 3커밋이 올라가 지금 main은 `c562be344`) |
| `91e4261d8..7e8d6523a` | 429커밋 |
| 그중 이 작업 | 72커밋 (`9a6ac23eb..cea92ad58`) |
| 그중 다른 세션 | 357커밋 |

## 3. 함께 나가게 되는 다른 세션 커밋 357개

| 구분 | 커밋 수 | 영역 |
|---|---|---|
| toss 미니앱·문서·테스트만 고친 것 | 226 | `apps/toss/`, `worker/toss/`, `docs/`, `__tests__/` |
| 웹 경로 파일을 하나라도 고친 것 | 131 | 아래 |
| 그중 웹 Worker(`worker/routes`·`worker/lib`·`worker/yeongnyangi`)를 고친 것 | 36 | 아래 |

웹 경로 131커밋은 크게 세 갈래다(제목 기준 분류).

- toss 이식 작업이 웹과 같이 쓰는 코드를 고친 것: `worker/routes` 24개 파일, `worker/lib` 17개, `worker/yeongnyangi` 3개, `app/*` 결과 화면 여러 개, `index.html`, `js/saju-engine.js`, `js/core/index-inline-runtime.js`.
- UX 전환 세션: 무료 프로모 배너·상세 페이지 9개, 대기 화면(`GenerationProgress`), 결제 인접 화면(`app/checkout/YeongnyangiCheckout.tsx`), 영냥이 시작 가격 표시.
- 후기 작업: `/reviews`, 결과 화면 후기 작성기, `worker/routes/reviews.js`, `worker/lib/record-library.js`.

`91e4261d8..7e8d6523a`에서 바뀌지 않은 것(직접 `git diff --stat`으로 확인): `worker/wrangler.toml`, `worker/index.js`, `worker/routes/billing.js`·`payments.js`, `worker/payments/`, `worker/lib/paid-feature-registry.js`·`portone.js`·`payment-service.js`, `lib/payment/`(생성 파일 `light-fortunes.generated.json` 2줄은 이 작업), `app/_lib/billing-client.ts`, `app/hooks/useCoinGate.ts`, `js/core/checkout-entry.js`·`payment-service.js`, `worker/routes/app-store.js`·`auth.js`, `worker/lib/auth.js`, `config/payment-freeze.json`, `package.json`·`package-lock.json`, 마이그레이션 폴더. `public/_worker.js` 14줄은 이 작업(`?action=` 헤더)이다.

### 승격을 멈춘 이유 — 아직 운영에 없는 웹 운영 경로의 민감 변경

| 파일 | 커밋 | 바뀐 것 | 분류 |
|---|---|---|---|
| `worker/routes/human-design-report.js` | `8d73ae5f6` | `requireAuth` 앞에 `nativeTossContext(request)?.auth` 분기, 결제 확인(`verifyPerUsePayment`)과 환불 가능 실행 기록을 toss 요청이면 다른 경로로 | 인증·결제 확인 |
| `worker/routes/nakshatra-ai.js` | `33b811b63` 외 | 선택 로그인 조회를 toss 컨텍스트로 대체하는 분기, toss 요청이면 환불 가능 실행 기록·사용량 차감을 건너뜀 | 인증·차감 |
| `worker/routes/nakshatra-premium.js` | `202ef4cbf`, `36ce258d5` | `requireAuth` 호출 위치를 종류별 분기 안으로 옮김 | 인증 |
| `worker/routes/master-love-codex.js`, `worker/lib/master-love-codex-session-access.js` | `c859fa6e6`, `e056ad089` | 구매한 세션 복구 판정에 toss 주문 분기와 거부 조건 추가 | 구매 접근 판정 |
| `worker/routes/ziwei-deep-report.js`, `destiny-compass-ai.js`, `naming-prompt.js`, `saju-compat-basic.js` | `528270602`, `119689b72`, `ac8302052`, `6d8839e1f` | 저장된 유료 결과의 접근 판정에 `accessType==='toss'` 분기, 작명 접근 확인 대체 분기 | 구매 접근 판정 |
| `worker/lib/service-execution-task.js`, `worker/lib/llm-cache-store.js` | `f5134775b` | 유료 실행 거래(시작·완료·실패·정산) DB 호출을 `withMongoRetry`로 감쌈(쓰기는 재시도 0) | 유료 실행·정산 DB |
| `worker/lib/models.js` | `43443b914` | `PaidExecutionRecord`에 `tossTarotCheckpoint` 필드 1개 | DB 스키마(마이그레이션 없음) |
| `worker/yeongnyangi/payments/catalog.ts`, `lib/fortune/chat-products.js` | `4ce9da961` | 질문 상담 상품 목록을 `chatFishForDomain()`으로 계산(코드상 결과 목록은 같아 보인다 — 추정) | 상품 목록 |
| `worker/yeongnyangi/service.ts` | `1a69713eb` | 영냥 신점 주문 준비 로직을 `questionSkyReading()`으로 옮김 | 유료 주문 준비 |
| `app/checkout/YeongnyangiCheckout.tsx` | `f1431db52` | `checkout_opened` 이벤트, 안내 문구 위치 | 결제 화면(실행 로직 아님) |
| `worker/routes/dream.js`(-402줄), `sukuyo.js`(-389줄), `career-style.js`, `tarot.js`, `palm.js`, `oracle.js` 등 | toss 이식 커밋 여러 개 | 유료·무료 라우트 본문을 공용 모듈로 옮김 | 라우트 리팩터링 |

- toss 컨텍스트는 `worker/toss/native-context.js`의 `WeakMap`에 toss 라우터가 묶은 요청에만 있고 헤더·쿠키로는 만들 수 없게 되어 있다(코드로 확인). 그래서 웹 요청의 동작은 그대로일 가능성이 높다(추정). 하지만 인증·결제 확인 줄이 실제로 바뀌었고 운영에서 돈 적이 없어, "웹 운영 동작에 영향 없음"을 코드만으로 단정하지 못했다.
- 이 변경들은 스테이징에는 이미 배포돼 있다(`7e8d6523a`).

## 4. 승격 전 조건

| 조건 | 상태 |
|---|---|
| 로컬 검증 (`7e8d6523a` 위 rebase HEAD) | `check:pre-push`, `typecheck`, `verify-analytics-events`, `verify:payment-freeze`, 빌드(`ALLOW_DEV_SERVER_DURING_BUILD=1`) 모두 exit 0. 빌드된 `dist/saju/index.html`은 새 핀 1회, 옛 핀 0회 |
| main PR CI | **초록으로 돌아왔다.** 경과: `438f6c16d` push 런 43595865519 실패(Critical checks: `apps/toss/test/routes.test.mjs`가 `apps/toss/public/styles/astro-reading.css`를 찾지 못함, toss 작업) → `7e8d6523a` push 런 43598296786 성공(Critical checks는 위험 등급 판정으로 건너뜀), 같은 SHA의 전체 CI 수동 런 43598295559는 toss 비공개 시뮬레이션 단계에서 실패 → `3095d6149` 전체 CI 수동 런 43601482167 **성공**(Critical checks 포함 전 잡). 3커밋은 이 초록을 확인한 뒤 올렸다 |
| 3커밋 push | `3095d6149..c562be344` (2026-11-14 23:25 KST쯤). push 뒤 CI·스테이징 결과는 인수인계 문서 "운영 승격 시도" 절 |
| Secret Scan | 실패 중(아래). 릴리스 워크플로를 막지는 않음 |

### Secret Scan

- 지금도 실패다: `7e8d6523a` 런 43598296749, `3095d6149` 런 43601482477, `c562be344` 런 43604643281 모두 탐지 1건(같은 지문).
- 탐지 내용: gitleaks `generic-api-key`, `worker/lib/saju-section/runtime.generated.mjs` 9행, 커밋 `9bbc65bbf`.
- 판단: **오탐**. 9행은 78만 자짜리 `const I18N = {…}` 번역 사전 한 줄이고, 잡힌 문자열은 인도네시아어 번역 값 두 개("Api Karma", "Taman Emas") 사이에 있는 **번역 키 이름**이다. 모양은 `sajuQuantum.sq_<숫자 4자리>_prop_label`(30자)이고 같은 사전의 다른 키(`se_1516_prop_description` 등)와 같은 규칙이다. 키 값·토큰·자격 증명이 아니다(파일을 읽어 모양만 확인, 값은 옮기지 않음).
- 릴리스를 막는가: 막지 않는다. `.github/workflows/cloudflare-pages-deploy.yml`의 잡은 `gate`만 `needs`로 두고 Secret Scan 워크플로를 참조하지 않는다. 릴리스 안의 `npm run verify:no-secret-leak`은 gitleaks가 아니라 빌드 산출물(`.open-next`, `dist`, `.next/static`)에서 환경 변수 이름·값 패턴을 찾는 다른 검사이고, 같은 파일이 들어간 스테이징 릴리스(`438f6c16d`, `7e8d6523a`)가 이 단계를 통과했다.
- 해결(파일 주인인 toss 세션 몫, 이 작업은 손대지 않음): `.gitleaksignore`에 지문 `9bbc65bbf88d5c7f6701df89efe4f41d3e1d24ee:worker/lib/saju-section/runtime.generated.mjs:generic-api-key:9` 한 줄을 넣고 사유를 커밋 메시지에 남긴다(그 파일 머리말의 규칙).

## 4-1. 승격 직전 확인 (2026-11-15 00:40~00:54 KST, 직접 실행)

동반 출고 승인: 사용자 원문 "함께 내보내" (2026-11-15, 조정 세션이 전달. "다른 세션 변경 약 360커밋을 함께 운영에 내보낼까요?"에 대한 답). 범위는 운영 승격 워크플로 1회.

| 항목 | 값 |
|---|---|
| 운영 `/api/version` | `91e4261d8f00309ae10fa0d7b57216304f805248` (그대로) |
| 스테이징 `/api/version` | `f8a4ec2afa7ba2bacb7913201aae6962c4c6e232` |
| `origin/main` HEAD (`git fetch` + `git ls-remote`) | `f8a4ec2af` — 스테이징과 같음 |
| `91e4261d8..origin/main` | 438커밋 (§2의 429 + toss 문서·테스트 2 + 이 작업 3 + 아래 4) |
| `f8a4ec2af` 스테이징 배포 런 43611431455 | 성공(끝날 때까지 기다린 뒤 승격) |

`c562be344` 이후 새로 들어온 커밋 4개(모두 toss 세션, `apps/toss/`와 `docs/toss/`·`docs/handoff/`만 고침. 웹 Worker·웹 화면·결제·워크플로 변경 없음, `git diff c562be344..origin/main --stat` 13파일 +205 −38):

| 커밋 | 내용 |
|---|---|
| `6407d8582` | fix(toss): AIT 번들에서 원본 리포트 그림 경로 해석 (`apps/toss/service/vite-service.mjs`, 테스트) |
| `4337ad8f1` | origin/main을 toss 브랜치로 합친 머지 커밋 |
| `14685e048` | docs(toss): 리포트 그림 회귀와 수정 기록 |
| `f8a4ec2af` | docs(toss): Linux AIT·비공개 QR 전달 기록 |

- 결제 실행 파일·설정: `git diff 91e4261d8..origin/main --stat -- worker/routes/billing.js worker/routes/payments.js worker/payments wrangler.toml worker/wrangler.toml js/core/checkout-entry.js js/core/payment-service.js worker/lib/portone.js worker/lib/payment-service.js lib/payment config/payment-freeze.json` 결과는 `lib/payment/light-fortunes.generated.json` +2줄(이 작업의 `freeCount`·`paidValueKRW`, 1-12)뿐이다. 직전 확인과 같다.
- 마이그레이션·`.env*`·`package.json`·`package-lock.json` 변경 없음. `.github/`에서는 `pr-ci.yml`(+81 −1, PR 검사)만 바뀌었고 배포 워크플로 `cloudflare-pages-deploy.yml`은 운영과 같다. 이름에 secret이 든 변경 파일은 모두 연애 비책(love-secret) 기능 파일이고 자격 증명이 아니다.
- main CI(`gh run list --branch main --limit 30` 전부 확인): `f8a4ec2af`의 PR CI 43611366848, Release push 43611366919, Landing Watchdog, Main drift watchdog, Edition test issuer 성공. 빨간 것은 Secret Scan 43611366837 하나이고 로그의 지문이 알려진 오탐(`9bbc65bbf…:worker/lib/saju-section/runtime.generated.mjs:generic-api-key:9`, leaks found: 1)과 같다. `14685e048`의 push PR CI 43607109785는 다음 push에 밀려 취소됐고 같은 SHA의 수동 PR CI 43607109624는 성공이다.
- 승격 전 운영 응답을 같은 스크립트로 한 번 받아 두었다(`D:\Development\Temp\naver-seo-production\probe-before-91e4261d8.json`). 유료 라우트 비로그인 응답의 기준값으로 쓴다.

### 롤백 대상 (`npm run deploy:rollback -- --list`, 읽기 전용, 승격 전)

| 대상 | ID | 비고 |
|---|---|---|
| Pages 운영 배포 | `513b3e1e-e102-4b4d-beca-48655e71c3bf` | `91e4261`, 2026-11-14T15:25:23Z(일일 운세 재발행으로 보임 — 추정). 승격 전 가장 최신 운영 배포 |
| Pages 그 전 배포 | `5f23408f-b711-42c3-8a88-527925d876cc` | `91e4261`, 2026-11-13T13:21:20Z |
| Worker 버전 | `c20216d0-4b9d-4882-b6c8-25cceb02eddd` | `91e4261`, 승격 전 active (기록과 같음) |

## 5. 운영 승격과 운영 검증 (2026-11-15)

### 5-1. 승격 런

| 항목 | 값 |
|---|---|
| 명령 (1회) | `gh workflow run "Release Cloudflare Pages and Worker" --ref main -f mode=production` |
| 실행 시각 | 2026-11-14T15:54:05Z (2026-11-15 00:54 KST) |
| 런 ID | 43612648387 (head `f8a4ec2afa7ba2bacb7913201aae6962c4c6e232`) |
| 결론 | success (약 16:09Z). 자동 롤백 없음 |
| 배포·SHA 대조 | "Deploy Pages and Worker at the exact SHA" 성공, "Verify deployed SHA" 성공(`[verify-deployed-sha] PASS: Pages 와 Worker 모두 f8a4ec2afa7b`), 읽기 전용 스모크 통과 |
| 새 Pages 배포 | `da6878a5-60cd-48d0-8496-f03639fa8cb6` (`https://3073eff1.codedestiny-5md.pages.dev`) |
| 새 Worker 버전 | `48113a5d-7c78-47a7-bb8b-eb41235329f0` (promoted=true) |
| 런이 기록한 롤백 대상 | Pages `513b3e1e-e102-4b4d-beca-48655e71c3bf`, Worker `c20216d0-4b9d-4882-b6c8-25cceb02eddd` |
| 승격 뒤 운영 `/api/version`·`/version.json` | `f8a4ec2afa7ba2bacb7913201aae6962c4c6e232` |

검증 스크립트의 원본 출력은 `D:\Development\Temp\naver-seo-production\`에 있다: `probe-before-91e4261d8.json`(승격 전), `probe-after-f8a4ec2af.json`(승격 뒤), `browser-report.json`, 스크린샷 20장.

### 5-2. 핵심 20개 URL (Yeti UA와 모바일 UA, 실제 응답)

20개 모두: 두 UA에서 200, title·description·H1 각 1개, canonical은 자기 자신(`https://code-destiny.com<경로>`), JSON-LD 전부 파싱 성공, 두 UA의 메타가 같음, `X-Robots-Tag` 헤더 없음. robots meta는 `/points/`만 `noindex, nofollow`이고 나머지는 `index, follow`(대부분 `max-video-preview:-1, max-image-preview:large, max-snippet:-1` 포함)다. 스테이징 검증 표(`staging-verification.md`)와 title·길이·hreflang·JSON-LD 수가 같다.

| 경로 | title (글자 수) | desc 글자 수 | hreflang | JSON-LD | 승격 전과 달라진 것 |
|---|---|---|---|---|---|
| `/` | 꿀꿀 운세 \| 사주·타로·자미두수 운세 상담 (24) | 80 | 9 | 2 | 전 title "꿀꿀 운세 · 운세보는 영냥이 \| 서비스 선택", hreflang 0 |
| `/ggulggul/` | 꽃돼지 연이 운세 \| 사주·타로 시작하기 – 꿀꿀 운세 (30) | 77 | 0 | 1 | 전 hreflang 9 |
| `/saju/` | 사주 원국 확인·사주팔자 해석 안내 \| 꿀꿀 운세 (27) | 72 | 9 | 5 | 전 desc 90 |
| `/saju/free/` | 무료 사주 모음 \| 오늘의 운세, 운명의 꽃, 최애운명, 타로 (34) | 90 | 0 | 5 | 전 desc 94 |
| `/manse/` | 무료 만세력 보는 법 \| 사주팔자 원국·오행 균형 확인 (30) | 74 | 0 | 5 | 전 desc 90 |
| `/compatibility/` | 궁합 보기 \| 무료 안내·사주·숙요점·타로 비교 (26) | 92 | 9 | 5 | |
| `/saju/compatibility/` | 사주 궁합 — 두 사람의 성향과 관계 풀이 \| 꿀꿀 운세 (31) | 88 | 9 | 5 | 전 desc 92 |
| `/tarot/` | 타로 카드·속마음·재회 질문 고르기 \| 꿀꿀 운세 (27) | 89 | 9 | 5 | |
| `/ziwei/` | 무료 자미두수 명반 계산기·12궁 풀이 \| 꿀꿀 운세 (29) | 88 | 9 | 5 | |
| `/ziwei/chart/` | 자미두수 심화 풀이 \| 가입 없이 무료로 보는 명반 (28) | 81 | 0 | 2 | 전 title "심화 자미두수 상담 · 12궁·사화·대한 해석" |
| `/love/` | 연애운 사주로 읽는 법 \| 로그인 후 무료 기본 풀이 (29) | 86 | 0 | 5 | 전 title "무료 연애운 \| …" |
| `/fortune/2027/` | 2027년 띠별 운세·삼재띠 \| 정미년 12띠 무료 풀이 \| 꿀꿀 운세 (39) | 83 | 0 | 4 | 전 desc 102 |
| `/new-year-ai-consultation/` | 2027 신년운세 보는 곳 \| 정미년 월별·재물·연애운 풀이 (33) | 75 | 0 | 2 | |
| `/yeongnyangi/` | 영냥이 상담 \| 꿀꿀 운세의 사주보는 고양이 (24) | 90 | 9 | 5 | 전 title "운세보는 영냥이 \| …" |
| `/yeongnyangi/1000-won-fortune/` | 영냥이 사주 상담 가격과 구성 \| 옛 천원 운세 안내 (29) | 91 | 0 | 5 | 전 title "옛 천원 운세 \| 사주 리포트와 AI 상담" |
| `/about/` | 꿀꿀 운세 소개 \| 운영자·해석 기준·서비스 안내 (27) | 91 | 7 | 2 | 전 desc 80 |
| `/points/` | 이용권 상점 (6) | 34 | 0 | 1 | robots meta `noindex, nofollow` |
| `/compare/fortune-apps/` | 운세 앱마다 답이 다른 이유 \| 점신·포스텔러·헬로우봇 비교 (33) | 88 | 0 | 4 | |
| `/compare/saju-vs-ziwei/` | 사주와 자미두수는 무엇이 다른가 \| 꿀꿀 운세 (25) | 74 | 0 | 4 | |
| `/compare/sukuyo-vs-vedic/` | 숙요점 vs 베다 점성술 — 같은 27수를 다르게 읽는 이유 (33) | 88 | 0 | 4 | |

### 5-3. 파일·`?action=`·analytics 핀 (실제 응답)

| 대상 | 승격 뒤 | 승격 전 |
|---|---|---|
| `/robots.txt` | 200, 1,097바이트. `Sitemap: https://code-destiny.com/sitemap-index.xml` | 1,116바이트. 차이는 `Disallow: /points/` 한 줄이 빠진 것뿐 |
| `/sitemap.xml` | 200, loc 1,081 | loc 1,072 |
| `/sitemap-index.xml` | 200 | 200 |
| `/rss.xml` | 200, item 60 | |
| `/llms.txt`, `/llms-full.txt` | 200 (7,332 / 19,192바이트), 한 문장 정의 있음 | 정의 문장 없음 |
| `/js/core/analytics.js?v=20261114-entry-source-v1` | 200, 25,571바이트, `entry-20261114-v1` 1회, `cache-control: public, max-age=604800` | 24,104바이트, 0회 |
| `/?action=cdOneStepFreeSajuEntry` | 302 → `https://code-destiny.com/ggulggul/?action=cdOneStepFreeSajuEntry`, `X-Robots-Tag: noindex, follow` | 헤더 없음 |
| `/ggulggul/?action=cdOneStepFreeSajuEntry` | 200, `X-Robots-Tag: noindex, follow` | 헤더 없음 |
| `/index.html` | 301 → `/` | 같음 |

- `/ggulggul/?action=…`의 헤더는 스테이징에서는 추론만 했던 것이고 운영에서 실제 응답으로 확인했다. 본문의 robots meta는 `index, follow…`로 남아 있고 헤더가 더 제한적이다(헤더가 우선한다).
- analytics 핀: 20개 가운데 Next 페이지 18개의 HTML이 `20261114-entry-source-v1`을 부르고 옛 핀은 0회다. `/ggulggul/`은 빌드 해시(`build-6669e1a0f102`)로 부르고, `/about/`은 원래 analytics.js를 부르지 않는다.
- 유입 분류가 운영에서 실제로 쿠키를 남기는지는 시험하지 않았다(테스트 트래픽을 만들지 않으려고 스크립트 로드까지만 확인).

### 5-4. 유료 라우트 비로그인 읽기 전용 응답

승격 전·후가 15개 모두 같고 5xx가 없다. 경로는 `worker/index.js`와 `worker/routes/*.js`에서 확인했다.

| 요청 | 응답 |
|---|---|
| `GET /api/human-design-report/result` | 401 LOGIN_REQUIRED |
| `GET /api/nakshatra-ai/result` | 401 LOGIN_REQUIRED |
| `GET /api/nakshatra-premium/muhurta/purposes` | 200 |
| `POST /api/nakshatra-premium/muhurta` (빈 본문) | 401 LOGIN_REQUIRED |
| `GET /api/master-love-codex/plan` | 200 |
| `GET /api/master-love-codex/session` | 422 INVALID_INPUT |
| `GET /api/ziwei-deep-report/plan` | 200 |
| `GET /api/ziwei-deep-report/result` | 401 LOGIN_REQUIRED |
| `GET /api/destiny-compass-ai/result` | 401 LOGIN_REQUIRED |
| `GET /api/naming-prompt/` | 404 NOT_FOUND |
| `POST /api/naming-prompt/basis` (빈 본문) | 400 NAMING_INPUT_REQUIRED |
| `GET /api/saju-compat-basic/archive` | 401 UNAUTHORIZED |
| `GET /api/yeongnyangi/products` | 200, 상품 28개 (13,070바이트, 전과 같은 크기) |
| `GET /api/yeongnyangi/attendance` | 401 UNAUTHORIZED |
| `GET /api/health` | 200 |

이 표가 보여 주는 것은 "비로그인 요청이 예전과 똑같이 막히고 서버 오류가 없다"까지다. 로그인 뒤의 유료 실행, 결제 확인 분기, 구매 세션 복구는 확인하지 못했다(실결제·로그인 유료 실행 금지). 웹 요청에서 그 분기의 동작이 그대로라는 것은 §3의 코드 근거에 따른 추정이다.

### 5-5. 화면 (Playwright, 분석 호스트와 GET이 아닌 요청은 모두 차단)

모바일 390×844와 데스크톱 1280×900에서 5개 페이지, 10화면 모두 200이고 가로 넘침 없음(문서 폭 = 화면 폭), 페이지 오류 0건, 5xx 응답 0건, analytics.js 새 핀 로드.

| 페이지 | H1 |
|---|---|
| `/` | 꿀꿀 운세 — 사주·타로·자미두수 운세 상담 |
| `/saju/` | 사주 풀이, 나의 오행과 삶의 흐름 |
| `/saju/free/` | 무료 사주·운세 모음 |
| `/ziwei/chart/` | 자미두수 심화 풀이 — 가입 없이 무료로 보는 명반 |
| `/yeongnyangi/1000-won-fortune/` | 영냥이 사주 상담, 가격과 구성 (본문에 10,000원 등 표기) |

눈으로 열어 본 스크린샷은 3장이다(`mobile-home.png`, `mobile-saju-free.png`, `desktop-yeongnyangi-price.png`). 글자 깨짐이나 레이아웃 붕괴는 없었다. 세 장 모두 쿠키 안내창이 화면 아래쪽을 덮고 있어(첫 방문 상태) 그 밑의 내용은 보지 못했다. 나머지 17장은 수치만 확인했다.

### 5-6. 결함 — IndexNow 제출 실패 (승격 당시 기록, 수정은 5-6a)

- 런 43612648387의 "Notify IndexNow of changed URLs" 단계가 `[indexnow] Non-public sitemap URL rejected` 뒤 exit code 1로 끝났다. 이 단계는 `continue-on-error`라 런은 success로 표시되지만 "Save successful IndexNow checkpoint"가 건너뛰어졌다. **이번 승격의 변경 URL은 IndexNow에 제출되지 않았다.** 복원할 이전 체크포인트 캐시도 없었다("Cache not found").
- 원인(확인함): `scripts/lib/indexnow-delta.mjs`의 `publicNotificationUrl()`은 `/yeongnyangi/` 아래 경로를 허용 목록(`/yeongnyangi/`, `/yeongnyangi/1000-won-fortune/`, `/yeongnyangi/season-1/`)에 있는 것만 통과시키는데, 사이트맵에 `https://code-destiny.com/yeongnyangi/season-1/prologue/`가 있다. 운영 `sitemap.xml`의 loc 1,081개에 그 함수를 적용하면 거부되는 것은 이 1건뿐이다. `buildSubmissionState()`는 1건이라도 거부되면 전체를 던진다.
- 이 URL은 승격 전 운영(`91e4261d8`)의 사이트맵에도 있었다. 이 SEO 작업이나 이번 승격이 만든 문제가 아니다. 이전 운영 승격에서도 같은 이유로 실패했을 가능성이 높다(추정, 이전 런 로그는 보지 않았다).
- 영향: 네이버·Bing으로 가는 IndexNow 알림이 빠진다. 사이트맵과 robots는 정상이라 일반 크롤로는 수집된다. 네이버 서치어드바이저 수동 제출(`docs/seo/naver-console-checklist.md`)과는 별개다.
- 고치는 방법(승격 당시에는 하지 않음): 허용 목록에 `/yeongnyangi/season-1/prologue/`를 넣거나 사이트맵에서 그 URL을 뺀다. → 2026-11-15에 승인받아 고치고 제출했다(5-6a).

### 5-6a. IndexNow 수정과 수동 제출 (2026-11-15 01:20~01:50 KST, 직접 실행)

- 승인 원문: "인덱스 나우는 고쳐줘 로컬 문서 커밋은 올리지 않아도 될것 같다" (2026-11-15, 조정 세션이 전달). 범위는 IndexNow 수정 커밋만 main push, 운영 승격 없는 제출 1회.
- 원인 재확인: 런 43612648387 로그에 `Cache not found for input keys: indexnow-production-43612648387-1, indexnow-production-`와 `[indexnow] Non-public sitemap URL rejected`가 있다. 운영 `sitemap.xml` loc 1,081개를 수정 전 `publicNotificationUrl()`에 넣으면 거부는 `/yeongnyangi/season-1/prologue/` 1건, 수정 뒤에는 0건이다. 5-6의 진단과 같다.
- 허용 목록의 취지: `37cb17270`(2026-11-09)이 넣은 정확 일치 목록이다. `api`·`result`·`library` 같은 비공개 이름과 겹치는 공개 소개 페이지만 정확한 경로로 통과시키고 대시보드·결과·하위 경로는 계속 막는다. 프롤로그는 `8248e3a98`(2026-11-13)에서 사이트맵에 들어갔는데 이 목록은 같이 고쳐지지 않았다.
- 프롤로그가 색인 대상인지: 운영에서 200, `meta robots`는 `index, follow`, canonical은 자기 자신, `X-Robots-Tag` 없음, robots.txt Disallow 아님. `scripts/generate-sitemap.mjs`의 주석대로 프롤로그(1화)만 항상 공개라 사이트맵에 있고, 2화부터의 회차(`app/yeongnyangi/season-1/[episode]/page.tsx`)는 `robots: index false`라 사이트맵에 넣지 않는다. 그래서 계열 전체가 아니라 **정확한 경로 1건**만 허용 목록에 넣었다.
- 수정: `scripts/lib/indexnow-delta.mjs`의 `PUBLIC_SERVICE_PAGES`에 `/yeongnyangi/season-1/prologue/` 추가, `__tests__/ui/indexnow-delta.test.mjs`에 통과 1건과 거부 2건(`/yeongnyangi/season-1/ep2/`, `/yeongnyangi/season-1/prologue/result/`) 추가. 로컬 커밋 `b954a1a91`, main에는 `f03d8add0`(origin/main `f8a4ec2af` 위에 이 커밋만 올림, force 아님).
- 검증: `node --test __tests__/ui/indexnow-delta.test.mjs` 7/7 통과(수정 전 모듈로는 새 단언이 실패하는 것도 확인), `npm run typecheck`·`npm run lint`·`node scripts/verify-sitemap-integrity.mjs`(1,081 URL)·`npm run verify:indexnow-wiring`·`npm run check:pre-push` 모두 exit 0, `node scripts/indexnow-submit.mjs --dry-run`은 1,081건 선택.
- push 뒤 CI(`f03d8add0`): PR CI 43615888362, AI Locale Gate, Main drift watchdog, Landing Watchdog 모두 success. Secret Scan 43615888346만 failure이고 로그의 발견은 알려진 1건(`9bbc65bbf`, `worker/lib/saju-section/runtime.generated.mjs` 9행)뿐이다. 스테이징 배포 런 43615962112 success, 스테이징 `/api/version`이 `f03d8add0`. 운영은 `f8a4ec2af` 그대로다(승격하지 않음).
- 제출: IndexNow 키는 시크릿이 아니라 저장소(`lib/indexnow.ts`)와 운영 키 파일에 있는 공개 값이다. 운영 키 파일이 200이고 내용이 일치하는 것, 로컬 `sitemap.xml`의 loc 집합이 운영 사이트맵과 같은 것(1,081 대 1,081, 한쪽에만 있는 것 0)을 확인한 뒤 이 워크트리에서 `CD_DEPLOY_TARGET=production npm run seo:indexnow`에 해당하는 명령을 **1회** 실행했다(2026-11-14T16:30:22Z). 결과: `sitemap 1081 URLs; changes/removals 1081; checkpoint initial`, `batch 1 attempt 1: 200 OK`, `OK — 1081건 제출 완료`.
- 체크포인트: 릴리스 워크플로의 체크포인트는 GitHub Actions 캐시(`indexnow-production-<run_id>-<attempt>`)에만 저장되고 로컬에서는 쓸 수 없다. **캐시는 여전히 비어 있다.** 다음 운영 승격 때 IndexNow 단계는 "initial"로 사이트맵 전체(지금 기준 1,081건, 한 배치)를 다시 보내고, 성공하면 그때 체크포인트가 저장된다. 중복 제출 1회는 해가 없다. 그 뒤부터는 변경분만 나간다.
- 로컬 `sitemap.xml`의 lastmod는 운영 것과 376건 다르다(운영 빌드가 다시 생성). 첫 제출은 전체라 제출 목록에는 영향이 없다.

### 5-7. 확인하지 못한 것

- 로그인 뒤 결과 화면, 유료 실행, 결제 확인 분기, 구매 세션 복구.
- `/saju/free/` 등에서 입력을 넣은 뒤의 결과 화면(운영에서는 실행하지 않았다. 스테이징 검증에는 있다).
- 운영에서 유입 쿠키가 실제로 남는지.
- 쿠키 안내창 아래의 화면 내용, 눈으로 보지 않은 스크린샷 17장.
- Secret Scan은 계속 빨갛다(알려진 오탐, §4). 손대지 않았다.

## 6. 롤백 방법 (실행하지 않음, 승격 뒤 문제가 있을 때)

- 이번 승격을 되돌리는 명령(실행하지 않았다. 실행 여부는 사용자가 정한다):
  `gh workflow run "Release Cloudflare Pages and Worker" --ref main -f mode=rollback -f pages_deployment_id=513b3e1e-e102-4b4d-beca-48655e71c3bf -f worker_version_id=c20216d0-4b9d-4882-b6c8-25cceb02eddd`
- 그러면 Pages와 Worker가 `91e4261`로 돌아간다. 지금 운영은 Pages `da6878a5-60cd-48d0-8496-f03639fa8cb6`, Worker `48113a5d-7c78-47a7-bb8b-eb41235329f0`(`f8a4ec2af`)다.
- GitHub Actions → *Release Cloudflare Pages and Worker* → Run workflow → `mode: rollback`, `pages_deployment_id`·`worker_version_id` 지정으로도 같다.
- 되돌릴 대상은 `npm run deploy:rollback -- --list`(읽기 전용)로 다시 볼 수 있다.
- 릴리스 잡은 승격 뒤 스모크나 SHA 대조가 실패하면 Pages와 Worker를 스스로 함께 되돌린다(`docs/context/delivery-and-ci.md`).
- 코드 되돌리기는 `git revert <커밋>` 뒤 main push다. force-push는 막혀 있다.
