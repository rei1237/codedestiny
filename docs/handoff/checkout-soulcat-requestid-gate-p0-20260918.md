---
status: done (핵심 수정), partial (검증 2건 보류)
updated: 2026-09-18
next: (선택) scripts/verify-yeongnyangi-browser.mjs 를 CI shadow 로 배선 + SoulCat 모드(requestId 없는 URL) 시나리오 추가 — scripts/lib/yeongnyangi-mobile-payment.mjs 421줄이 전부 64자리 requestId 존재를 전제해 스캐폴딩이 작다. 실측 브라우저 확인은 2026-09-18 재시도했으나 공유 dev 서버의 로그인 상태가 프로세스 전역이라(다른 세션과 충돌 위험) 보류 유지 — 하려면 격리 워크트리에서 전용 dev 서버로만.
---

# 영냥이(SoulCat) 결제 P0 — requestId 렌더 게이트 회귀 + 인증 프리페치 지연

- 날짜: 2026-09-18
- 등급: RED (결제 화면)
- 커밋: `6c5392d2a`(문제 A), `45232820e`(문제 B) — 둘 다 main 에 직접, **push 완료 확인**
  (다른 세션의 워크트리 머지·sync 커밋에 실려 이미 origin/main 조상에 포함됨 — `git merge-base
  --is-ancestor` 로 확인). 프로덕션 승격 승인 없음.
- 대상: SoulCat(외부 상품) 결제만. CD 내부 영냥이 상품(`app/yeongnyangi/`)은 범위 밖 — 코드 구조상
  `isSoulCatMode` 분기로 완전히 격리되어 무변경.

## 왜

사용자 보고: (A) 결제해도 결과가 안 나옴, (B) 결제 버튼 눌러도 PG 창이 "로그인을 확인 중..."에서
늦게 뜸. 추적 결과 둘 다 `app/checkout/CheckoutClient.tsx` 한 파일, 2026-09-16 커밋(`3fb6ab057`)
회귀 하나로 수렴: 그 커밋이 추가한 렌더 게이트가 `requestId` URL 파라미터를 강제하는데, SoulCat의
유일한 결제 URL 계약(`featureKey`+`returnTo`만, requestId 없음)과 정면으로 충돌해 SoulCat 결제
100%가 결제 버튼조차 못 보고 "돌아가기" 안내만 봄. (B)는 별개로, 이 페이지가 SoulCat 하드
네비게이션으로만 열려 `auth-store` 싱글턴이 매번 콜드 스타트하는데다 `next/dynamic` 청크 로드가
끝나야 인증 확인이 시작되는 직렬 구조였음.

## 무엇을 바꿨나 (2파일 + 신규 테스트 1개)

| 파일 | 내용 |
| --- | --- |
| `app/checkout/CheckoutClient.tsx` | `isSoulCatMode = !params.requestId` 파생값 추가, 6곳 분기: 렌더 게이트·`available`/`checked` effect·`startPayment` 웹훅 선확인 스킵·requestId 채번(`yn-soulcat-{featureKey}-{slug(returnTo)}`)·모바일 PG 복귀 effect·헤더 주석 복원 |
| `app/checkout/CheckoutRouteClient.tsx` | `refreshAuth()` 를 `CheckoutClient` 청크 다운로드와 병렬로 앞당겨 호출(인플라이트 병합·쿨다운 그대로라 중복 네트워크 비용 없음) |
| `__tests__/ui/checkout-soulcat-mode.static.test.js`(신규) | 이번 회귀의 옛 패턴(`!params.requestId` 계열 3곳)이 다시 매치되지 않는지 직접 금지하는 정적 소스 테스트 6개 |

CD 내부 영냥이 상품 경로는 `isSoulCatMode` 가 항상 false 가 되어 코드 구조상 무변경 — 재테스트 없이도
성립하는 보장.

## 검증 (실행·확인 완료)

- `npm run check:fast` — exit 0. `test:jest` 281 suites / 3960 tests 전부 통과. `build:worker` dry-run 통과.
- 결제 필수 verify 7종 전부 PASS: `verify:billing-pass-policy`, `verify:portone-single-payment`,
  `verify:paid-gate-ui`, `verify:payment-choice-parity`, `verify:checkout-pass-card`,
  `verify:paid-feature-billing-policy`, `verify:ai-prompt-billing-policy`.
- `git diff` 로 두 파일 최종 diff 를 계획과 대조, `refreshAuth()` 기존 호출(수정 전부터 있던 것)이
  그대로 남아있음을 grep 으로 재확인.

## 보류한 검증 2건 (의도적 연기, 이유 있음)

1. **`node scripts/verify-yeongnyangi-browser.mjs`(104개 시나리오 Playwright)** — `--build-static`
   단계가 `verify-no-dev-server.mjs` 가드에 막힘: 동시에 다른 워크트리(포트 3217)에서 실제 `next dev`
   가 떠 있었음. `ALLOW_DEV_SERVER_DURING_BUILD=1` 로 우회하면 문서화된 35분 무응답 인시던트
   재현 위험 + 다른 세션 작업 방해 가능성이 있어 강행하지 않음. 게다가 `out/` 산출물 mtime 이
   이미 낡아(9/17) 성공해도 옛 코드를 검증했을 것. 이 스위트는 `package.json`/`.github` 어디에도
   배선돼 있지 않음(2회 독립 확인) — 이번 회귀가 2일 넘게 아무 자동 검증 없이 살아남은 근본 원인.
2. **실측 브라우저 확인**(desktop+mobile, `/checkout/?featureKey=...&returnTo=...` 결제 폼 렌더 +
   체감 지연) — 계획 자체가 "체감 지연"은 사람 판단이라 명시한 항목. 로컬 dev 서버를 새로 띄우면
   위 가드를 다시 막게 되어 연기.

이 두 항목의 위험은 낮게 평가함: 회귀 원인이 명확히 특정됐고(단일 파일, 단일 게이트), 신규 정적
테스트가 옛 패턴 재발을 직접 잡고, CD 내부 경로는 분기 구조상 손대지 않음이 코드로 보장됨.

## 2026-09-18 후속 세션 메모 (보류 2건 재확인 시도 — 여전히 보류)

- `CheckoutClient.tsx`/`CheckoutRouteClient.tsx` 를 다시 읽어 이 문서가 설명한 수정과 전부 일치함을
  재확인(변경 없음). `__tests__/ui/checkout-soulcat-mode.static.test.js` 도 커밋에 포함됨.
- **실측 브라우저 확인을 다시 시도하다 새 리스크를 발견해 다시 보류함:**
  - `verify-no-dev-server.mjs` 는 포트가 아니라 **시스템 전체 node.exe 커맨드라인**을 스캔한다.
    실측 당시 이 저장소 자신의 `npm run dev`(포트 18290)도 떠 있어, 다른 워크트리(3217)를 끄는
    것만으로는 가드가 풀리지 않았을 것.
  - 단, `verify-yeongnyangi-browser.mjs` 는 `--build-static` 없이 쓰면 이 가드를 아예 안 타고
    **이미 떠 있는 서버**(기본 `127.0.0.1:3108`)에 접속만 한다 — `check:fast`/`verify:staging` 도
    이 가드와 무관. 즉 "가드 충돌"은 걱정했던 것보다 좁은 문제.
  - 🔴 **진짜 걸림돌은 따로 있었다.** 포트 18290 dev 서버(다른 세션 소유, 이 저장소 자신의
    체크아웃)에 실측하려면 로그인 상태가 있어야 결제 폼이 렌더된다(미로그인은 `/login` 리다이렉트 —
    이건 버그와 무관한 정상 동작). 그런데 `scripts/mock-dev-api.mjs` 의 로그인 상태(`loggedIn`)는
    **세션·쿠키가 아니라 프로세스 전역 변수**(`scripts/mock-dev-api.mjs:38,59-64`) — 내가
    `POST /api/auth/login` 을 부르면 그 dev 서버를 쓰는 **다른 세션의 로그인 상태까지 같이 바뀐다.**
    격리 없이는 안전하게 실측할 수 없다는 뜻.
  - `scripts/lib/yeongnyangi-mobile-payment.mjs` 의 기존 24개 시나리오는 Playwright 로 자체
    context(쿠키·라우트 모킹)를 격리해서 이 문제가 없지만, 전부 64자리 `requestId` 를 전제로
    URL·픽스처를 만들어 SoulCat 모드(requestId 없음)엔 그대로 못 쓴다 — 이미 위에 적힌 한계 그대로.
  - 35분 무응답 인시던트의 정확한 원인(문서 없음, 커밋 `08b37f675` 메시지에만 있음): dev 서버와
    `next build` 가 `.next/` 를 공유해, dev 서버가 켜진 채 빌드하면 `clean:build` 가 그 밑을 지우고
    두 프로세스가 같은 경로에 번갈아 써서 에러 없이 조용히 멈춘다.
- **사용자 결정(2026-09-18): 지금은 보류 유지.** 코드 대조·신규 정적 테스트·전체 스위트 통과로 수정
  자체의 신뢰도는 이미 충분하다고 판단, 공유 dev 서버 간섭 리스크를 감수할 실익이 낮다고 봄. 다음에
  이 실측을 시도한다면 **격리 워크트리(`scripts/create-safe-worktree.ps1`)에서 전용 dev 서버로**
  하는 것이 유일하게 안전한 경로 — 공유 체크아웃의 기존 dev 서버는 로그인 상태 공유 때문에 쓰지 말 것.

## 남은 일 (후속, 이번 세션 범위 밖)

- `scripts/verify-yeongnyangi-browser.mjs` CI shadow 배선 — 계획엔 포함 권장이었으나 이번 세션은
  핵심 수정·필수 검증에 집중, 미착수.
- `scripts/lib/yeongnyangi-mobile-payment.mjs`(421줄)에 SoulCat 모드(requestId 없는 URL) 시나리오
  추가 — 이 파일은 거의 모든 헬퍼·24개 시나리오가 64자리 `row.id` 존재를 전제해 새 스캐폴딩이 작지
  않음. 미착수.
- SoulCat `purchase()` 의 순차 신원확인 중복 호출 최적화 — **사용자가 이번 P0에서 명시적으로 제외**.
  후속 과제로만 보고.
- PAID_WITHOUT_RESULT 읽기 전용 Mongo 조회(2026-09-15~16 실결제 후 결과 누락 고객 존재 여부) — 계획
  에서 "필요 여부는 사용자가 다시 확인" 으로 남긴 항목, 요청 없으면 재거론 안 함.
