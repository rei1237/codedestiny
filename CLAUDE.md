# Code Destiny

> AI 기반 사주·타로·점성술 운세 서비스 (code-destiny.com)
> Next.js 15 · Cloudflare Pages/Workers

**이 파일은 매 세션 자동 로드된다. 여기에는 "도구가 알려줄 수 없어서 사고가 나는 것"만 둔다.**
훅·가드·CI 가 **이미 집행하는 규칙은 장치 이름만** 적는다 — 걸리면 그 장치가 사유와 다음 명령을 알려주므로 여기에 산문으로 다시 쓰지 않는다.
근거·사고 사례·튜닝값 등 상세는 `docs/context/*.md` 로 분리했다 — 자동 로드되지 않으니 **작업 주제에 해당하면 코딩 전에 반드시 Read 로 읽는다**(아래 라우팅 표).

## 작업별 필독 문서 (라우팅)

작업이 아래 축에 걸리면 **코드를 고치기 전에** 해당 문서를 읽는다. "대충 알 것 같다"로 건너뛴 것이 이 레포의 사고 이력 대부분이다.

| 건드리는 것 | 먼저 읽을 문서 |
|---|---|
| 결제·이용권·월정석·잠금 콘텐츠·가격 | [docs/context/payment-gating.md](docs/context/payment-gating.md) |
| Gemini/Workers AI 호출·프롬프트·폴백, MongoDB/Atlas·커넥션·트랜잭션 | [docs/context/ai-and-db.md](docs/context/ai-and-db.md) |
| UI/디자인/테마(연이·네오)·대비·모바일·impeccable 훅 | [docs/context/design-and-ui.md](docs/context/design-and-ui.md) |
| 신규 페이지·라우트·sitemap·AdSense·ads.txt | [docs/context/seo-and-adsense.md](docs/context/seo-and-adsense.md) |
| 브랜치·PR·CI 티어·배포·롤백·캐시 | [docs/context/delivery-and-ci.md](docs/context/delivery-and-ci.md) |
| 연이 이미지 자산·음악·웹소설/VN·관상 엔진 | [docs/context/content-assets.md](docs/context/content-assets.md) |
| 가드·검증기 수정, 워커 크기 | [docs/context/doc-precedence.md](docs/context/doc-precedence.md) |
| 코딩 원칙의 "왜"가 궁금하거나 반박하고 싶을 때 | [docs/context/coding-principles.md](docs/context/coding-principles.md) |
| 검색 범위·재실행 판단 | [docs/context/search-discipline.md](docs/context/search-discipline.md) |
| 전체 npm 명령·폴더 구조·기술 스택·**코드 규칙**·수정 금지 목록 원문 | [docs/context/reference-basics.md](docs/context/reference-basics.md) |
| 파일·디렉터리를 지우기 전 (삭제 가능/금지 실측 목록) | [docs/context/cleanup-2026-08-15.md](docs/context/cleanup-2026-08-15.md) |

- 분할 직전 원문 스냅샷: [docs/context/CLAUDE.archive-2026-08-15.md](docs/context/CLAUDE.archive-2026-08-15.md) (편집 금지, 대조용)
- Codex 작업의 실행 계약은 [AGENTS.md](AGENTS.md), 에이전트 회귀 방지 규칙은 [Rules/agent-regression-guard.md](Rules/agent-regression-guard.md)
- 현재 개발 초점은 [docs/CURRENT_DEV_BASELINE.md](docs/CURRENT_DEV_BASELINE.md). 문서끼리 어긋나면 **조용히 합치지 말고** [docs/CONTEXT_AUDIT.md](docs/CONTEXT_AUDIT.md) 에서 먼저 정리한다.

## 절대 규칙 (예외 없음)

이 절의 1·3·5 는 **훅과 CI 가 실제로 집행한다.** 걸렸을 때 나오는 문구가 사유와 대안을 알려주므로, 여기에는 그 장치가 말해 주지 않는 것만 남긴다. 2·4·6 은 집행 장치가 없어 이 줄이 유일한 방어다.

1. 🔴🔴 **과금 LLM 실호출 금지** — Gemini·Workers AI. 훅 [.claude/hooks/guard-costly-commands.mjs](.claude/hooks/guard-costly-commands.mjs) 가 `ask`(fail-closed)로 잡는다. 기본은 mock, 실호출은 `--live` 뒤에 두고 **1회 한정 허락**을 받는다(왜 mock으로 안 되는지·몇 회·어떤 키/모델인지 밝힐 것). 문서의 "실측" 수치는 인용하라는 뜻이지 다시 재라는 뜻이 아니다. 🔴 **훅을 고쳤으면 세션을 재시작해야 적용된다**(훅이 안 알려준다). mock 정본: [docs/context/ai-and-db.md](docs/context/ai-and-db.md)
2. 🔴 **실결제·프로덕션 DB 쓰기·취소/환불/정산 실행도 같다** — 그 정확한 행위에 대한 명시적 허락 없이는 하지 않는다.
3. 🔴 **`main` 직접 작업·직접 배포 금지.** 브랜치 → 커밋 → push → PR → CI → **사용자가 머지 → 자동 스테이징 배포**. 프로덕션은 `workflow_dispatch(mode=production)` 수동 승격이고, 그 실행은 규칙 2와 같은 급이다. 🔴 **다만 사용자가 승격을 명시적으로 요청하면 에이전트가 대신 실행할 수 있다** — `gh workflow run "Release Cloudflare Pages and Worker" --ref main -f mode=production`. 그때 한 번뿐이고 상시 위임이 아니다. 이 문장이 없어 '금지'로만 읽혔고 수정 5건이 머지된 채 대기한 적이 있다(2026-08-25). 프로덕션이 main HEAD 보다 뒤처진 것은 정상이다. 상세: [docs/context/delivery-and-ci.md](docs/context/delivery-and-ci.md)
4. 🔴 **수정 금지 대상**: `.wrangler/` · `package-lock.json` · `.env*` 전부(깃 업로드 절대 금지) · `dist/`·`out/` · 마이그레이션 스크립트 **실행 결과물** · `worker/wrangler.toml` **구조**(라우트·크론·바인딩·`compatibility_*`). 단 `worker/wrangler.toml` 의 `[vars]` 추가·수정은 허용 — 다만 `[vars]` 값이 프로덕션 값이 되고 **코드 기본값은 죽으므로** 그 노브를 지키던 테스트를 함께 갱신한다(그러지 않으면 가드가 프로덕션이 안 읽는 값을 지킨다).
5. 🔴 **비밀정보 노출 금지** — API 키·토큰·MongoDB URI·R2 자격증명·OAuth/JWT/PortOne 시크릿. `verify:no-secret-leak` 과 `secret-scan.yml`(gitleaks)이 CI 에서 잡지만 **커밋에 담기 전까지는 아무도 안 막는다.**
6. 🔴 **기존 기능·라우트·배지·콘텐츠를 사용자 요청 없이 삭제하지 않는다**(`준비중` 배지 포함).

## 코딩 원칙 (다른 규칙과 충돌 시 우선)

근거와 실제 사고 사례는 [docs/context/coding-principles.md](docs/context/coding-principles.md). 여기 있는 것은 요약이 아니라 **집행 대상**이다.

1. **코딩 전 사고** — 가정을 명시한다. 불확실하면 숨기지 말고 묻는다. 해석이 여럿이면 임의로 하나 고르지 않는다. 더 단순한 방법이 있으면 말하고, 필요하면 반박한다.
2. **단순성 우선** — 요청한 것만 구현. 1회성 코드에 추상화 금지, 요청 안 한 유연성·설정가능성 금지, 발생 불가 시나리오의 에러 처리 금지.
3. **수술적 변경** — 필요한 부분만. 인접 코드·주석·포맷팅을 "개선"하지 않는다. 기존 스타일을 따른다. 무관한 데드코드는 언급만 하고 지우지 않는다(단, 내 변경으로 생긴 미사용 import/변수는 제거).
4. **목표 지향** — 작업을 검증 가능한 목표로 바꾼다("버그 수정" → "재현 테스트 작성 후 통과"). 다단계 작업은 `단계 → 검증 방법` 으로 계획을 밝힌다.
5. **사용자 안내는 한국어 + 추천안 명시** — 코드·커밋 메시지·식별자를 뺀 모든 전달 텍스트는 한국어. 선택지를 줄 때는 **가장 권하는 안을 먼저, `추천`으로 표시하고** 한두 문장으로 이유를 붙인다. 중립 비교를 명시 요청받은 경우가 아니면 우열 없이 나열만 하고 끝내지 않는다.
6. 🔴 **중첩 사전검사** — 방어 장치나 UI 계층을 **추가하기 전에 안팎에 같은 장치가 이미 있는지 확인**하고, 있으면 감싸지 말고 그 지점을 고친다. 대상: 재시도·타임아웃·캐시·락/단일비행·트랜잭션·에러 폴백 / 모달·오버레이·스크롤락·결제 게이트·`z-index`·이벤트 델리게이션·지연로딩. 🔴 **검사기 `npm run verify:no-nested-retry` 는 재시도 축만 본다** — 나머지 축은 손으로 확인해야 하고, 방법과 오탐 사례는 [docs/context/coding-principles.md](docs/context/coding-principles.md) 6번에 있다.
7. **회귀 위험 상시 점검·선보고** — 공유 모듈·공통 훅·다중 참조 함수·조건 분기·기본값 변경처럼 회귀 가능성이 있으면, 끝내고 결과만 보고하지 말고 **어떤 위험이 어떤 시나리오에서 생기는지 먼저 안내**한다. 애매하면 생략하지 않는다.
8. 🔴 **실측으로만 말한다 — 부정 단언 금지** — "없다/안 쓴다/영향 없다/이미 고쳐졌다"는 **전수 검색을 실제로 돌린 뒤에만** 쓰고 **검색 범위를 함께 적는다**. 확인 못 한 것은 `추정`·`미검증`으로 표시한다. 문서의 수치도 근거가 아니라 그날의 측정값이므로 날짜와 재현 명령을 함께 남긴다.
9. 🔴 **삭제·리네임은 3면 grep** — 소스 + `__tests__/` + `scripts/verify-*` 를 함께 본다. **"임포터 0"은 죽었다는 증거가 아니다**(`lib/payment/portone.ts` 는 import 0이지만 verify 스크립트가 파일로 읽어 단언한다). 🔴 **이 grep 은 반드시 `git grep`** — 리포 루트 `.ignore` 가 `sync:public` 미러 169개를 Grep/Glob 에서 빼므로 rg 로는 미러의 참조를 못 본다([docs/context/search-discipline.md](docs/context/search-discipline.md)). 삭제가 2개 이상 PR로 나뉘면 마지막 `main` 에서 `npm run check:critical` 을 한 번 돌린다.
10. 🔴 **가드는 fail-closed 여야 하고, 손으로 쓴 대상 목록은 가드가 아니다** — 검사 대상이 없을 때 통과시키는 가드는 가드가 아니다. 배열에 파일명을 열거하지 말고 **소스에서 전수 발견해 미분류를 실패시킨다**(정본: `verify:auth-changed-coverage`·`verify:guard-wiring`). 가드가 보는 파일은 그 가드를 부르는 워크플로 트리거 `paths` 에도 있어야 한다 — `verify:guard-wiring` 이 미배선·낡은 선언을 이름별로 잡아 준다.
11. 🔴 **끝은 "검증했다"까지다** — 변경마다 **실행한 명령과 그 출력**을 근거로 보고한다. 출력을 안 보고 "통과"라고 쓰지 않는다. 못 돌린 검증은 **"미검증"으로 명시**한다. 최종 보고에 수정 파일 · 의도 · 안 건드린 영역 · 검증 명령 · 추가 확인 필요 지점을 남긴다.
12. 🔴 **컨텍스트가 모자라면 밀어붙이지 말고 인수인계** — 훅 [.claude/hooks/session-context-budget.mjs](.claude/hooks/session-context-budget.mjs) 가 300k/450k/650k 구간에서 담을 항목 8개·정본 예시·`/clear` 절차를 통째로 안내한다. 훅이 말해 주지 않는 것 둘만 여기 둔다:
    - 🔴 **판단은 작업을 시작하기 전에** 한다. 넘긴 범위를 "완료"로 적지 않는다.
    - 🔴 **인수인계 문서를 만들거나 갱신했으면 그 파일명을 사용자 보고에 반드시 적는다** — `docs/handoff/<주제 이름>.md` 전체 경로로(🔴 자리표시자의 공백을 빼지 말 것 — 아래 워크트리 항목과 같은 이유로 `verify:doc-freshness` 가 실패한다). 이름을 빠뜨리면 사용자가 다음 세션에서 그 문서를 찾지 못한다(실제로 간헐적으로 빠뜨렸다). `/clear` 를 권할 때는 **그 경로를 같은 문단에** 둔다. 새 세션에 넘길 다음 작업을 안내할 때도 근거 문서의 경로와 절 번호를 함께 적는다.
13. **모델 사용** — 판단이 들어가는 일(구현·디버깅·회귀 분석·**코드 리뷰**·설계·삭제 영향 판정)은 세션 주력 모델에서 그대로 하고 reasoning effort 는 `high` 이상. 낮춰도 되는 건 판단 없는 기계적 조회뿐이며 **그 결과만으로 결론 내지 않는다**. 규칙에 구 모델명을 박아 두지 않는다.
    - 그 "기계적 조회"의 실행 수단이 `code-locator` 서브에이전트다. **위치만 찾으면 되는 조회는 메인 세션에서 직접 훑지 말고 거기로 보낸다.** 🔴 돌아온 위치 목록은 **재료지 결론이 아니다**; 판정은 주력 모델에서 실제 함수 본문을 열어 한다.

## 서브에이전트 (대규모 탐색 격리)

전수 검색·영향 분석은 메인 세션 컨텍스트를 태우므로 [.claude/agents/](.claude/agents/) 의 전용 에이전트에 위임한다. **어떤 에이전트가 있고 언제 쓰는지는 각 에이전트의 `description` 이 매 요청 자동 주입하므로 여기 표로 다시 적지 않는다.**

🔴 `deletion-auditor`·`regression-scout`·`paid-gate-auditor` 를 Haiku 로 내리지 않는다 — 전부 **판정**이 결과물이라 원칙 8·9와 충돌한다(2026-08-14 에 "리뷰 Haiku 고정" 룰이 폐기된 이유). 싸게 돌릴 수 있는 건 `code-locator` 한 곳뿐이다.

## 검증 — 고친 기능의 `verify:*` 를 먼저 돌린다

`verify:*` 가 **266개** 있다(2026-08-28 `verify:guard-wiring` 실측). 고친 기능의 것을 먼저 돌린다. 결제 최소: `verify:billing-pass-policy` · `verify:portone-single-payment` · `verify:paid-gate-ui` · `verify:payment-choice-parity` · `verify:checkout-pass-card`. UI: `verify:hero-contrast` + `verify:mobile-detail-nonintrusive`.

## 레포 함정 (모르면 사고 나는 것)

- **홈 `/` 은 정적 셸 `index.html` 의 승격본이다** — 홈 콘텐츠·메타는 `app/page.js` 가 아니라 정적 셸에 둔다. `public/**/index.html` 은 `sync:public` 이 만드는 미러이므로 직접 패치하지 않는다.
- **`veda/` 와 `models/` 는 존재하지 않는다.** 실체는 `lib/vedicSwissChart.js`·`lib/vedicCalculator.js`·`worker/lib/vedic-*.js`·`worker/lib/nakshatra-*.js`. `tsconfig.json` `exclude` 등에 남은 `veda` 는 잔재이니 근거로 삼지 말 것.
- **죽은 코드는 격리하지 말고 지운다** — 격리 디렉터리는 빌드에서만 빠지고 grep·AI 읽기에는 그대로 노출돼 다음 세션이 복제한다. 안전망은 git 히스토리다(복구: [docs/cleanup-2026-08/06-deleted.md](docs/cleanup-2026-08/06-deleted.md)).
- 🔴 **스크린샷 1장이 세션 전체를 태운다** — 이미지 토큰은 파일 크기가 아니라 **치수**로 정해지고(`가로×세로/750`), 한 번 컨텍스트에 들어오면 **그 세션의 모든 후속 요청에서 다시 지불된다.** 훅 `guard-image-read.mjs` 가 비싼 Read 를 잡고 `visual-checker` 위임과 `shrink-shot.mjs --crop` 명령을 문구로 알려준다.

## 결제 게이팅 — 절대 순서

전체 정책·금지 패턴·렌더러 규격은 [docs/context/payment-gating.md](docs/context/payment-gating.md) 에 있고, **결제를 건드리면 그 문서를 먼저 읽는다.** 여기 있는 것은 벗어나면 안 되는 뼈대다.

1. **진입 판정은 로컬 스냅샷만** — 커버 확답이면 즉시 무료 통과, 확답 못 하면 기다리지 말고 결제창. 🔴 진입 시 서버 이용권 선검사를 되살리지 말 것.
2. **결제창이 이용권 검사 지점** — 첫 카드는 **[이용권으로 구매]**(`data-mode="pass-store"`), 누르면 그 자리에서 서버 판정. 결제창에는 **[이용권으로 구매] · 단건결제(KRW, PortOne) · 월정석 3옵션이 항상 함께** 보이고 뒤 둘은 동등 우선순위다.
3. **스냅샷 없는 보유자의 구제 지점은 2번 하나다.** 🔴 카드 주문 직전에 서버 이용권 재검사를 넣지 말 것(verify 가드 4곳이 막는다).
4. **단건 결제는 사용자가 결제창에서 '단건'을 고른 뒤에만** 실행한다.

- 게이팅 재화 순서: **이용권**(30일, 자동갱신 없음) → **월정석**(이벤트 지급, 구매 불가) → **코인**(레거시 내부 단위).
- **코인은 폐지된 개념** — 사용자에게는 항상 KRW 환산 표시(`1코인=100원`). 신규 UI에 `coinPrice`/`cost` 를 그대로 렌더링하지 않는다.
- 위 순서를 벗어나는 결제 구현은 금지이며 **작업 중 우연히 발견해도 그냥 지나치지 말고 사용자에게 보고**한다.
- 🔴 `config/payment-freeze.json` 에 등록된 파일·함수를 건드렸으면 매니페스트를 **같은 커밋에** 갱신한다(순수 CSS/문구 변경도 예외 없다). `verify:payment-freeze` 가 실패하면서 `--update` 명령과 절차를 알려준다. 체크 무력화 금지.

## 작업 격리 — 파일을 고치기 전에 worktree 로 들어간다

🔴 **파일을 수정하는 작업은 시작 전에 `EnterWorktree` 로 격리된 git worktree 를 만들고 그 안에서 한다.** 사용자가 매번 지시하지 않아도 **이 문서가 그 지시다.** 기본 작업 디렉터리는 **여러 세션이 동시에 쓴다** — 남의 미커밋 변경이 내 커밋에 휩쓸리고, 작업 중에 남이 브랜치를 갈아타면 내 HEAD 가 통째로 바뀐다(둘 다 실사고 — 2026-08-20 한 세션에서 두 번). 배선은 [.claude/settings.json](.claude/settings.json) 의 `worktree` 이고, 워크트리는 `.claude/worktrees/<워크트리 이름>` 에 `origin/main` 에서 분기해 생긴다.

🔴 자리표시자의 공백을 빼지 말 것 — 공백이 없으면 `verify:doc-freshness` 가 이 줄을 "스크래치 경로 참조"로 읽어 실패한다(`scripts/lib/doc-refs.mjs` 의 `looksLikeRepoPath` 가 공백 있는 문자열만 경로에서 제외한다).

설정이 알려주지 않는 실측(전부 여기서만 볼 수 있다):

- 🔴 **`node_modules` 가 딸려온다고 믿지 말 것** — 설정에 `symlinkDirectories: ["node_modules"]` 가 있는데도 실제로는 대개 안 생긴다(2026-08-23 실측: 워크트리 41개 중 **8개만** 보유). 원인은 미확인이다. 그런데도 `npm test`·`typecheck`·`lint`·`verify:*` 는 대개 도는데, 그건 Node·도구들이 상위 디렉터리를 타고 올라가 저장소 루트의 설치본을 주워 쓰기 때문이다.
- 🔴 그래서 **`<rootDir>/node_modules` 같은 절대 경로를 코드에 박으면 그 한 줄만 빗나간다** — `require.resolve` 를 쓸 것. 상위 탐색이 안 통하는 유일한 자리라, 박은 그 도구만 죽고 나머지는 전부 초록불이라 늦게 발견된다. 두 번 났다: `jest.config`(21개 스위트 사망) · `next-build-with-pages-manifest.mjs` 의 next CLI 경로(lint·typecheck·jest 가 **전부 통과한 채로** 빌드에서만 `Cannot find module`).
- 빌드를 돌려야 하면 링크부터 확인한다: `ls -ld node_modules`. 없으면 저장소 루트에서 돌리거나 정션을 건다 — `cmd /c mklink /J "<워크트리 경로>\node_modules" "<저장소 루트 경로>\node_modules"`. 🔴 지울 때는 **링크부터 끊는다**(`cmd /c rmdir "<워크트리 경로>\node_modules"`) — 안 그러면 공유 설치본을 지울 위험이 있다.

예외: 읽기만 하는 조사·질문, 그리고 사용자가 "여기서 하라"고 한 경우. 끝나면 `ExitWorktree` — push·PR 까지 마쳤으면 `remove`, 이어서 할 일이 남았으면 `keep`.

## Workflow

- 5줄 이상 변경은 코딩 전 계획(plan) 우선
- 코딩 후: `lint` → `typecheck` → 관련 `verify:*` → **변경 파일만** `git add` → Conventional Commits
- 커밋 전 `git diff --name-only` 로 요청 범위와 일치하는지, `git diff --numstat` 로 비정상 대량 변경이 없는지 확인한다. 범위 밖 파일이 섞이면 staging 을 풀고 다시 검증한다([Rules/agent-regression-guard.md](Rules/agent-regression-guard.md))
- 취약점·보안 위험·재현 가능한 버그를 발견하면 즉시 보고하고, 분리 디버깅이 가능하도록 위험도와 짧은 제안을 남긴다
- 판단이 애매하면 머지하지 말고 안내를 택한다
- 세션 전환 시 `/clear` 로 컨텍스트 오염 방지
