# 운영 승격 전 패킷과 운영 검증 (2026-11-14)

**결론: 운영 승격을 실행하지 않았다.** 승격하면 이 SEO 작업과 함께 다른 세션의 웹 운영 변경(유료 라우트의 인증·결제 확인 분기 등)이 같이 나가기 때문이다. 사용자가 승인한 것은 이 SEO 변경의 승격이고, 다른 세션 변경을 함께 내보내는 것은 따로 정해야 한다. 그래서 운영 검증 표(5절)는 비어 있다.

따로 적지 않으면 모두 직접 실행해 확인한 값이다. 추정은 "추정"이라고 적었다.

## 1. 승인

- 사용자 원문: "승격 승인할께 운영에서 이 변경이 적용되도록해줘" (2026-11-14, 조정 세션이 전달).
- 범위: 로컬 3커밋을 main에 push, 운영 승격 1회. 운영 검증에서 나온 결함의 수정·재승격은 하지 않고 보고.

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

## 5. 운영 검증

승격하지 않아 하지 않았다. 승격 뒤에 할 항목은 `docs/handoff/naver-seo-geo-2026-11-13.md`의 "운영 승격 시도" 절에 있다.

## 6. 롤백 방법 (실행하지 않음, 승격 뒤 문제가 있을 때)

- GitHub Actions → *Release Cloudflare Pages and Worker* → Run workflow → `mode: rollback`, `pages_deployment_id`·`worker_version_id` 지정. 명령으로는 `gh workflow run "Release Cloudflare Pages and Worker" --ref main -f mode=rollback -f pages_deployment_id=<ID> -f worker_version_id=<ID>`.
- 되돌릴 대상은 `npm run deploy:rollback -- --list`(읽기 전용)로 본다. 지금 운영인 `91e4261`의 Worker 버전은 `c20216d0-4b9d-4882-b6c8-25cceb02eddd`다. Pages 배포 ID는 같은 목록에서 `91e4261` 줄을 찾는다.
- 릴리스 잡은 승격 뒤 스모크나 SHA 대조가 실패하면 Pages와 Worker를 스스로 함께 되돌린다(`docs/context/delivery-and-ci.md`).
- 코드 되돌리기는 `git revert <커밋>` 뒤 main push다. force-push는 막혀 있다.
