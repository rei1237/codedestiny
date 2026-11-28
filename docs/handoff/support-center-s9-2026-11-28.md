---
status: in-progress
updated: 2026-11-28
next: "단계 2a — 사용자에게 10개 ref 한정 운영 읽기 전용 조회 1회 승인을 받는다(2026-11-28 요청함, 답 대기). 승인 전 운영 접근 금지"
---

# 결제 전달 후속 + 영냥이 고객센터(S9) 인수인계

이전 세션(040ba62a)이 P0 결제 전달 틈 S1~S8 을 main 에 push 했다(55ea4f0b1d). 이 문서는 그 뒤에 남은 세 가지를 순서대로 끝내기 위한 것이다.

## 첫 행동

1. `git branch --show-current`(main)·`git status` 확인 → `git pull --ff-only`.
2. 루트 체크아웃에 다른 세션의 미커밋 변경이 있으면 건드리지 말고 `scripts/create-safe-worktree.ps1` 로 워크트리를 만든다. PR·원격 브랜치 없이 main 에 직접 머지하고, 끝나면 `npm run worktree:remove -- '<경로>'` 로 배수한다.
3. main CI(`PR CI` 워크플로)를 한 번 확인한다. 55ea4f0b1d 의 결과는 이전 세션 종료 시점에 진행 중이었다. 빨간색이면 원인 커밋부터 보고한다.
4. 아래 "단계"의 첫 미완료 항목부터 진행한다.

## 지금 상태

- main: 55ea4f0b1d (push 완료). 운영 승격은 하지 않았다. 운영은 e0777b28b0ba.
- 이전 세션 워크트리·브랜치는 배수했다.
- 보고서: `docs/operations/` 6종(PAYMENT_DELIVERY_AUDIT, AUTOMATED_RECOVERY_RUNBOOK, SERVICE_HEALTH_AUDIT, PRODUCTION_VERIFICATION_REPORT, OPERATING_COST_REPORT, AI_SUPPORT_ARCHITECTURE).

## 승인 상태 (다시 묻지 말 것 / 꼭 물을 것)

- 2026-11-28 사용자 원문: "미전달 의심 6건은 제대로 잘 수정되었으면 되고 영냥이 결제같은 경우에는 대부분 잘 생경되었으니까 감사 스크립트만 추가 후 고객센터 작업 진행할 수 있도록 새션에 전달할 인수인계 문서와 명령어 만들어줘"
  - 해석: 6건은 고객이 결과를 받게 바로잡는 것이 목표다. 영냥이는 대부분 정상 생성됐다고 사용자가 판단했으므로 **운영 재조회 없이 감사 스크립트 코드만 보강**한다.
  - 🔴 6건 복구는 운영 DB 쓰기(또는 재생성 LLM 비용·환불)다. 프롬프트 원칙("대량 복구·권한 지급·환불·데이터 변경은 dry-run 보고서를 먼저 작성하고 운영자 승인 이후 수행")에 따라 **dry-run 보고서 → 사용자에게 정확한 실행 범위로 1회 승인**을 받고 나서만 실행한다. 위 원문은 실행 승인이 아니다.
- 운영 DB 읽기 전용 조회 1회 승인(S7)은 이미 사용했다. 6건 dry-run 에 운영 조회가 필요하면 새로 1회 승인을 받는다.
- 고객센터 LLM: Workers AI 우선, Gemini flash 대체(2026-11-28 사용자 결정). 실호출은 정확한 1회 승인 뒤에만, 결과 원문을 사용자에게 전달.
- 새 유료 API·SaaS·요금제 추가는 사전 승인 필요. 운영 승격은 명시적 1회 요청 때만.

## 작업 규칙과 함정

- 결제 정본 파일 밖에 결제 판정 로직을 두지 않는다(`docs/context/payment-gating.md`). 인증·결제 검증을 우회·완화하지 않는다.
- LLM 에게 MongoDB·관리자 API 를 주지 않는다. 도구는 로그인한 본인 데이터만 읽는 서버 함수로.
- 알림·로그에 생년월일·상담 내용·이메일·토큰을 넣지 않는다. 식별자는 sha256 앞 12자(`ref`) 규칙.
- 정본 모듈(worker/lib/payment-refund.js 등)에 새 **정적** import 를 넣으면 부분 목 테스트가 링크 단계에서 깨진다 → 지연 import. 넣기 전 `git grep 'worker/lib/<mod>.js"' __tests__` 로 목 export 확인.
- 결제 에러 HTTP 상태는 `worker/payments/errors.js` PAYMENT_ERROR_TABLE(`contractFor`)에서 온다. 에러 객체에 status 를 기대하지 말 것.
- check:fast 는 미커밋 트리만 본다. 여러 커밋을 쌓았으면 머지 전 `npm run check:pre-push`. jest 와 check:fast 를 동시에 돌리면 EPERM 헛실패.
- 파일 다수가 CRLF. Edit 가 CRLF 를 떨굴 수 있으니 diff 로 확인.
- PowerShell `[IO.File]` 상대경로는 루트 체크아웃 기준 — 워크트리에서는 절대경로.
- 리눅스 CI 는 경로 대소문자를 가린다(공개 사전 폴더는 `zh-cn`·`zh-tw`).
- 스테이징은 crons=[] 라 자동 복구는 스테이징에서 검증되지 않는다. 보고서에 "운영 미검증"으로 적는다.
- 검증하지 않은 항목을 PASS 로 적지 않는다. 테스트 기준을 낮추지 않는다.

## 설계

### 단계 1 — 감사 스크립트 영냥이 판정

- 대상: `scripts/audit-paid-orphans.mjs`. 지금 `RESULT_COLLECTIONS` 에 `yeongnyangi_requests` 가 없어 영냥이 결제 104건이 전부 evidenceNotFound 로 떨어졌다(미전달 증거 아님).
- 영냥이 요청 스키마: `worker/lib/yeongnyangi-models.js`(collection `yeongnyangi_requests`, `chapters` 배열, `userId`). 결제 ↔ 요청 연결 필드와 완료 상태 값은 그 파일과 생성 경로(`worker/routes/yeongnyangi.js`, 복구 테스트 `__tests__/worker/yeongnyangi-recovery.test.js`)에서 실측해 정한다. 추측으로 매칭하지 않는다.
- `lib/records/service-registry.js:28` 처럼 같은 컬렉션을 연이·네오 상담실(`persona` yeoni/neo)도 쓴다. 소유 서비스 조건을 구분한다.
- 같은 소유자(userId) 조건은 유지한다(다른 계정 토큰 매칭 금지 — 기존 `classifyPaidOrphans` 주석).
- 검증: `__tests__/ui/paid-orphans-audit.test.mjs`(node --test)에 영냥이 전달/미전달/소유자 불일치 사례 추가, 변이 1회(매칭 제거 → 실패 확인 후 원복). 운영 재실행은 하지 않는다.
- `docs/operations/PAYMENT_DELIVERY_AUDIT.md` 의 영냥이 항목을 "스크립트 보강 완료·운영 재조회 미실행(사용자 판단: 대부분 정상 생성)"으로 갱신.

### 단계 2 — 미전달 의심 6건 dry-run

- 대상(ref = 결제 _id sha256 앞 12자): fusion `756a1430e24c`·`291a1da67f47`, destiny-compass `7c986fced41e`, human-design `42c29352eafd`·`15d7a355b006`, new-year `70ddbcfa109e`. 멈춘 기록 4건: execution `c9a1158bdd44`, transaction `98fdfecfae0f`·`0aab94e0dc22`·`35f99ca465c7`.
- 원본 감사 JSON 은 이전 세션이 지웠다. ref → 실제 문서를 찾으려면 운영 읽기 전용 조회가 다시 필요하다 → **먼저 사용자에게 읽기 전용 1회 승인을 받는다.**
- 건별로: 결과 문서 유무·상태, 기존 복구 어댑터(`worker/lib/consultation-recovery-registry.js`, 서사 재시도 `worker/routes/paid-narrative-retry.js`)로 재생성 가능한지, 환불 가능 기간·수단, 예상 LLM 비용을 표로 만든다(개인정보 마스킹). 쓰기 없음.
- 사용자에게 "건별 재생성/환불 중 무엇을, 어떤 명령으로" 정확한 범위로 1회 실행 승인을 받는다. 승인 전에는 실행하지 않는다. 실행하면 결과(전달 확인)를 같은 보고서에 기록한다.

### 단계 3 — 영냥이 고객센터(S9)

설계 정본은 `docs/operations/AI_SUPPORT_ARCHITECTURE.md`. 요약:

- 입구: 기존 `app/components/HelpDesk.jsx` 확장(지금 `app/yeongnyangi/` 에서는 쓰지 않는다 — 영냥이 화면 어디에 둘지 먼저 정한다). LLM 이 꺼져도 동작하는 "결제했는데 결과가 없어요" 카드를 먼저 둔다.
- 지식: paid-feature-registry·FAQ 문구·`lib/brand/brand-facts.mjs` 에서 빌드 때 생성(하드코딩 금지).
- 도구(읽기 전용, 본인 데이터만): `/api/payments/me`, `/api/records`, `/api/yeongnyangi/requests`, 서사 재시도 가능 여부. 복구·환불은 LLM 이 실행하지 않고 기존 사용자 경로로 안내만.
- LLM: `lib/llm-client.ts` cloudflare 공급자 → 실패 시 Gemini flash → 그것도 실패하면 FAQ·사람 문의 안내. 일·월 상한, 사용자·IP 속도 제한(`worker/lib/security` 재사용). 재시도·캐시·게이트를 새로 만들기 전에 기존 장치를 먼저 확인(코딩 원칙 6).
- 사람 넘김: 결제 ref 와 상품 키만 붙인다.
- 시작 전 `docs/context/design-canon.md`, `docs/context/ai-and-db.md`, `docs/context/yeongnyangi-ask.md` 를 읽고, 큰 화면 개편이면 방향·성공 기준을 사용자에게 먼저 공유(코딩 원칙 16).
- 검증: mock LLM 으로 도구 권한 테스트(남의 데이터 거부), 모바일 너비 실제 브라우저 캡처(headed), SEO 영향 점검(비공개면 noindex 유지). Workers AI 실호출은 정확한 1회 승인 뒤.
- 끝나면 `docs/operations/AI_SUPPORT_ARCHITECTURE.md`·`OPERATING_COST_REPORT.md` 를 실측으로 갱신.

### 단계 3 방향·성공 기준 (2026-11-28 세션 404e5840 확정, 코딩 원칙 16 — 공유 후 자율 구현)

- 위치: 새 클라이언트 컴포넌트 `app/yeongnyangi/_components/SupportDesk.tsx` 를 `/yeongnyangi/faq/` 본문 아래와 `/yeongnyangi/library/` 상단에 둔다. FAQ 페이지의 title/description/H1/FAQ JSON-LD 는 바꾸지 않는다.
- 1층(LLM 없음, 먼저 구현): "결제했는데 결과가 없어요" 카드. 로그인 상태면 기존 `GET /api/yeongnyangi/requests`(`worker/routes/yeongnyangi.js:161`)로 본인 요청 중 결제됐지만 COMPLETED 가 아닌 것을 보여 주고 기존 결과 화면(재시도·대기 화면이 복구를 맡음)으로 보낸다. 비로그인이면 로그인 안내 + 기존 `OrderLookup`(`_components/OrderRecovery.tsx`). 사람 넘김은 `/contact/` 링크에 주문 ref(sha256 앞 12자)·featureKey 만 붙인다.
- 2층: "영냥이에게 물어보기" → 새 `POST /api/yeongnyangi/support`(`worker/routes/yeongnyangi.js` 하위, 인증 필수, `Cache-Control: private, no-store`). 질문 길이 상한, 기존 `worker/lib/security`(`enforceAiRouteSecurity`/`enforceRateLimit`) 재사용, 사용자 일 상한·전체 일/월 상한. FAQ 일치면 LLM 을 부르지 않는다. LLM 에는 도구를 주지 않고, 서버가 본인 userId 로만 읽은 요청 상태 요약(이름·생년월일·상담 본문 제외)과 빌드 생성 지식(FAQ·가격·브랜드 JSON)만 넣는다. `callLLM` cloudflare → Gemini flash → FAQ·문의 안내 폴백. 새 LLM 호출 파일은 인벤토리·가드 배선이 필요하다(메모리: guard-and-test-pitfalls).
- 성공 기준: (1) LLM 이 꺼져도 카드와 폴백이 동작 (2) 다른 계정 데이터가 응답·프롬프트에 0 (mock 테스트) (3) 상한 초과 시 429 + 폴백 안내 (4) 390px 모바일 실제 화면 캡처에서 잘림·대비 문제 없음 (5) `/yeongnyangi/faq/` SEO 메타·JSON-LD 불변, API 는 색인 대상 아님 (6) 실호출 없음(mock). Workers AI 실호출은 정확한 1회 승인 뒤.

## 단계

- [x] 1. 감사 스크립트 영냥이 판정 추가 + node --test + 변이 + 보고서 갱신 → commit → da9336c0c1
- [ ] 2a. 6건·멈춘 4건 dry-run 을 위한 운영 읽기 전용 조회 1회 승인 요청
- [ ] 2b. dry-run 보고서(마스킹) 작성 → 건별 실행 범위 1회 승인 요청
- [ ] 2c. 승인 범위만 실행 → 전달 확인 결과 기록
- [x] 3a. 고객센터 방향·성공 기준 공유 → 지식 생성·도구·HelpDesk 카드 구현(mock) → c41f82d9c9(API·지식·인벤토리), e8d58bfeec(SupportDesk FAQ 본문 아래·library 상단)
- [x] 3b. 속도·호출 상한, 사람 넘김, 권한 테스트 → c41f82d9c9 (__tests__/ui/yeongnyangi-support.test.mjs 7/7, mock only. 변이: 상한 fail-open→2건 실패, 소유자 필터 제거→1건 실패)
- [x] 3c. 모바일 실제 화면 캡처 검수, check:fast → commit → e8d58bfeec, 문서 af64b21f66. 390px headed 캡처 4장 visual-checker 3차 PASS, FAQ title/description/H1/JSON-LD 불변. 실 Workers AI 는 NOT_TESTED(정확한 1회 승인 필요)
- [x] 4. (단계 1·3 몫) check:pre-push exit 0 → main fast-forward push 2760fdf8d5(2026-11-28) → 워크트리 support-s9-20261128-180306 배수. 단계 2 가 남아 status 는 in-progress 유지. 운영 승격 안 함
