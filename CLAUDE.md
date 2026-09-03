# Code Destiny

> AI 기반 사주·타로·점성술 운세 서비스 (code-destiny.com)
> Next.js 15 · Cloudflare Pages/Workers

**이 파일은 매 세션 자동 로드된다. 여기에는 "도구가 알려줄 수 없어서 사고가 나는 것"만 둔다.**
훅·가드·CI 가 이미 집행하는 규칙은 **장치 이름만** 적는다 — 걸리면 그 장치가 사유와 다음 명령을 알려준다.
근거·사고 사례·실측값은 `docs/context/*.md` 에 있고 자동 로드되지 않는다 — **작업 주제에 해당하면 코딩 전에 Read 로 읽는다.**

## 작업별 필독 문서 (라우팅)

작업이 아래 축에 걸리면 **코드를 고치기 전에** 읽는다. "대충 알 것 같다"로 건너뛴 것이 이 레포 사고 이력의 대부분이다.

| 건드리는 것 | 먼저 읽을 문서 |
|---|---|
| 결제·이용권·월정석·잠금 콘텐츠·가격 | [docs/context/payment-gating.md](docs/context/payment-gating.md) |
| Gemini/Workers AI 호출·프롬프트·폴백, MongoDB/Atlas·커넥션·트랜잭션 | [docs/context/ai-and-db.md](docs/context/ai-and-db.md) |
| UI/디자인/테마(연이·네오)·대비·모바일·impeccable 훅 | [docs/context/design-and-ui.md](docs/context/design-and-ui.md) |
| 신규 페이지·라우트·sitemap·AdSense·ads.txt | [docs/context/seo-and-adsense.md](docs/context/seo-and-adsense.md) |
| 브랜치·PR·CI 티어·배포·롤백·캐시·**격리 워크트리 환경** | [docs/context/delivery-and-ci.md](docs/context/delivery-and-ci.md) |
| 연이 이미지 자산·음악·웹소설/VN·관상 엔진 | [docs/context/content-assets.md](docs/context/content-assets.md) |
| 가드·검증기 수정, 워커 크기 | [docs/context/doc-precedence.md](docs/context/doc-precedence.md) |
| 코딩 원칙의 "왜"·사고 사례·세션 경제 실측 | [docs/context/coding-principles.md](docs/context/coding-principles.md) |
| 검색 범위·재실행 판단 | [docs/context/search-discipline.md](docs/context/search-discipline.md) |
| 전체 npm 명령·폴더 구조·기술 스택·**코드 규칙**·수정 금지 목록 원문 | [docs/context/reference-basics.md](docs/context/reference-basics.md) |
| 파일·디렉터리를 지우기 전 (삭제 가능/금지 실측 목록) | [docs/context/cleanup-2026-08-15.md](docs/context/cleanup-2026-08-15.md) |

- Codex 작업의 **진입점**은 [AGENTS.md](AGENTS.md) — 표지판이지 규칙 정본이 아니다. 에이전트 회귀 방지 규칙은 [Rules/agent-regression-guard.md](Rules/agent-regression-guard.md)
- 현재 개발 초점은 [docs/CURRENT_DEV_BASELINE.md](docs/CURRENT_DEV_BASELINE.md). 문서끼리 어긋나면 **조용히 합치지 말고** [docs/CONTEXT_AUDIT.md](docs/CONTEXT_AUDIT.md) 에서 먼저 정리한다.
- 분할 직전 원문 스냅샷: [docs/context/CLAUDE.archive-2026-08-15.md](docs/context/CLAUDE.archive-2026-08-15.md) (편집 금지, 대조용)

## 절대 규칙 (예외 없음)

1·3·5 는 **훅과 CI 가 실제로 집행한다** — 걸렸을 때 나오는 문구가 사유와 대안을 알려준다. 2·4·6 은 집행 장치가 없어 이 줄이 유일한 방어다.

1. 🔴🔴 **과금 LLM 실호출 금지** (Gemini·Workers AI) — 기본은 mock, 실호출은 `--live` 뒤에 두고 **1회 한정 허락**을 받는다(왜 mock 으로 안 되는지·몇 회·어떤 키/모델인지 밝힐 것). 문서의 "실측" 수치는 **인용하라는 뜻이지 다시 재라는 뜻이 아니다.** 훅 [.claude/hooks/guard-costly-commands.mjs](.claude/hooks/guard-costly-commands.mjs) 가 `ask`(fail-closed)로 잡는다. 🔴 **훅을 고쳤으면 세션을 재시작해야 적용된다**(훅이 안 알려준다). mock 정본: [docs/context/ai-and-db.md](docs/context/ai-and-db.md)
2. 🔴 **실결제·프로덕션 DB 쓰기·취소/환불/정산 실행도 같다** — 그 정확한 행위에 대한 명시적 허락 없이는 하지 않는다.
3. 🔴 **`main` 직접 작업·직접 배포 금지** — 브랜치 → 커밋 → push → PR → CI → **사용자가 머지 → 스테이징 자동 배포**. 프로덕션 승격은 규칙 2와 같은 급이지만, **사용자가 명시적으로 요청하면 에이전트가 그때 한 번 대신 실행한다**: `gh workflow run "Release Cloudflare Pages and Worker" --ref main -f mode=production`. 상시 위임이 아니다. 프로덕션이 `main` HEAD 보다 뒤처진 것은 정상이다. 상세: [docs/context/delivery-and-ci.md](docs/context/delivery-and-ci.md)
4. 🔴 **수정 금지 대상**: `.wrangler/` · `package-lock.json` · `.env*` 전부(깃 업로드 절대 금지) · `dist/`·`out/` · 마이그레이션 스크립트 **실행 결과물** · `worker/wrangler.toml` **구조**(라우트·크론·바인딩·`compatibility_*`). `[vars]` 추가·수정만 허용 — 다만 그 값이 프로덕션 값이 되고 **코드 기본값은 죽으므로** 그 노브를 지키던 테스트를 함께 갱신한다.
5. 🔴 **비밀정보 노출 금지** — API 키·토큰·MongoDB URI·R2 자격증명·OAuth/JWT/PortOne 시크릿. `verify:no-secret-leak` 과 `secret-scan.yml`(gitleaks)이 CI 에서 잡지만 **커밋에 담기 전까지는 아무도 안 막는다.** 유일한 예외는 [docs/context/reference-basics.md](docs/context/reference-basics.md) 에 있다.
6. 🔴 **사용자에게 보이는 것을 요청 없이 삭제하지 않는다** — 기능·라우트·배지(`준비중` 포함)·콘텐츠. 🔴 **참조가 없는 죽은 코드는 다르다** — 원칙 9의 3면 grep 으로 확인했으면 **격리하지 말고 지운다**(격리 디렉터리는 빌드에서만 빠지고 grep·AI 읽기에는 남아 다음 세션이 복제한다. 안전망은 git 히스토리 — 복구 목록 [docs/cleanup-2026-08/06-deleted.md](docs/cleanup-2026-08/06-deleted.md)).

## 코딩 원칙 (다른 규칙과 충돌 시 우선)

근거·사고 사례·실측은 [docs/context/coding-principles.md](docs/context/coding-principles.md). 🔴 **번호는 상호참조 정본이다** — 다른 문서·훅·테스트가 `원칙 N` 을 번호로 가리키므로 비우지도 다시 매기지도 않는다.

1. **코딩 전 사고** — 가정을 명시한다. 불확실하면 숨기지 말고 묻는다. 해석이 여럿이면 임의로 하나 고르지 않는다. 더 단순한 방법이 있으면 말하고, 필요하면 반박한다.
2. **단순성 우선** — 요청한 것만 구현. 1회성 코드에 추상화 금지, 요청 안 한 유연성·설정가능성 금지, 발생 불가 시나리오의 에러 처리 금지.
3. ~~**수술적 변경**~~ — **폐기**(2026-09-04 사용자 요청). "필요한 부분만"이 **범위 안의 결함까지 손대지 않는 근거**로 쓰였다. 대신 **범위 안에서 발견한 결함은 같은 변경에서 고치고 가드까지 붙인다**(원칙 14). 범위 밖은 언급만 하고, 기존 스타일은 그대로 따르며, 내 변경으로 생긴 미사용 import/변수는 제거한다.
4. **목표 지향** — 작업을 검증 가능한 목표로 바꾼다("버그 수정" → "재현 테스트 작성 후 통과"). **5줄 이상 변경은 코딩 전에** `단계 → 검증 방법` 형태의 계획을 먼저 낸다.
5. **사용자 안내는 한국어 + 추천안 명시** — 코드·커밋 메시지·식별자를 뺀 모든 전달 텍스트는 한국어. 선택지를 줄 때는 **가장 권하는 안을 먼저 `추천`으로 표시하고** 이유를 한두 문장 붙인다. 중립 비교를 명시 요청받은 경우가 아니면 우열 없이 나열만 하고 끝내지 않는다.
6. 🔴 **중첩 사전검사** — 방어 장치나 UI 계층을 **추가하기 전에 안팎에 같은 장치가 이미 있는지 확인**하고, 있으면 감싸지 말고 그 지점을 고친다. 대상: 재시도·타임아웃·캐시·락/단일비행·트랜잭션·에러 폴백 / 모달·오버레이·스크롤락·결제 게이트·`z-index`·이벤트 델리게이션·지연로딩. 🔴 `npm run verify:no-nested-retry` 는 **재시도 축만** 본다 — 나머지 축은 손으로 확인하고, 방법과 오탐 사례는 context 문서 6번에 있다.
7. **회귀 위험 상시 점검·선보고** — 공유 모듈·공통 훅·다중 참조 함수·조건 분기·기본값처럼 회귀 가능성이 있는 것을 고치면, 끝내고 결과만 보고하지 말고 **어떤 위험이 어떤 시나리오에서 생기는지 먼저 안내**한다. 애매하면 생략하지 않는다. 고위험 축(LLM·결제·프로덕션 DB·배포·인증·Worker 라우팅·R2)에 걸리면 코드를 고치기 전에 **사전 보고 7항목**을 낸다(context 문서).
8. 🔴 **실측으로만 말한다 — 부정 단언 금지** — "없다/안 쓴다/영향 없다/이미 고쳐졌다"는 **전수 검색을 실제로 돌린 뒤에만** 쓰고 **검색 범위를 함께 적는다**. 이름 grep 결과만으로 결론 내지 않는다(함수 본문을 연다). 확인 못 한 것은 `추정`·`미검증`으로 표시한다. 문서의 수치도 그날의 측정값이므로 인용할 때 날짜와 재현 명령을 함께 남긴다.
9. 🔴 **삭제·리네임은 3면 grep** — 소스 + `__tests__/` + `scripts/verify-*` 를 함께 본다. **"임포터 0"은 죽었다는 증거가 아니다**(`lib/payment/portone.ts` 는 import 0이지만 verify 스크립트가 파일로 읽어 단언한다). 🔴 **이 grep 은 반드시 `git grep`** — 리포 루트 `.ignore` 가 `sync:public` 미러를 Grep/Glob 에서 빼므로 rg 로는 미러의 참조를 못 본다([docs/context/search-discipline.md](docs/context/search-discipline.md)). 삭제가 2개 이상 PR 로 나뉘면 마지막 `main` 에서 `npm run check:critical` 을 한 번 돌린다.
10. 🔴 **가드는 fail-closed 여야 하고, 손으로 쓴 대상 목록은 가드가 아니다** — 검사 대상이 없을 때 통과시키는 가드는 가드가 아니다. 배열에 파일명을 열거하지 말고 **소스에서 전수 발견해 미분류를 실패시킨다**(정본: `verify:auth-changed-coverage`·`verify:guard-wiring`). 가드가 보는 파일은 그 가드를 부르는 워크플로 트리거 `paths` 에도 있어야 한다.
11. 🔴 **끝은 "검증했다"까지다** — 아래 [§검증 · 커밋](#검증--커밋) 이 정본이다.
12. 🔴 **컨텍스트가 모자라면 밀어붙이지 말고 인수인계** — 훅 [.claude/hooks/session-context-budget.mjs](.claude/hooks/session-context-budget.mjs) 가 임계 구간에서 담을 항목·템플릿·`/clear` 절차를 통째로 안내한다. 🔴 **그 임계는 실측이라 되돌리지 않는다** — `/clear` 는 비용이 아니라 이 레포에서 가장 큰 절감 수단이다. 훅이 말해 주지 않는 것 셋만 여기 둔다:
    - 🔴 **판단은 작업을 시작하기 전에** 한다. "일단 해보고 모자라면"은 늦다.
    - 🔴 **인수인계는 "프로젝트 설명서"가 아니라 "작업 상태 저장소"다** — 템플릿 [docs/handoff/_TEMPLATE.md](docs/handoff/_TEMPLATE.md) 를 쓰고 **2,000자를 목표**로 한다. 🔴 머지된 PR 의 과정·브랜치명/SHA 나열·기각된 시도의 서사·코드 전문 복사는 쓰지 않는다(`git log`·`gh pr list`·코드가 정본이다). 담는 것은 *현재 상태와 다음 행동* 뿐이다.
    - 🔴 **만들거나 갱신했으면 그 경로를 사용자 보고에 반드시 적는다** — `docs/handoff/<주제 이름>.md` 전체 경로로(🔴 자리표시자의 공백을 빼지 말 것 — 공백이 없으면 `verify:doc-freshness` 가 이 줄을 실재 경로 참조로 읽어 실패한다). `/clear` 를 권할 때는 **그 경로를 같은 문단에** 둔다.
13. **모델 사용** — 판단이 들어가는 일(구현·디버깅·회귀 분석·**코드 리뷰**·설계·삭제 영향 판정)은 세션 주력 모델에서 그대로 하고 reasoning effort 는 `high` 이상. 낮춰도 되는 건 판단 없는 기계적 조회뿐이며 **그 결과만으로 결론 내지 않는다**. 규칙에 구 모델명을 박아 두지 않는다. 위치만 찾는 조회는 메인 세션에서 훑지 말고 `code-locator` 로 보내되, 돌아온 목록은 **재료지 결론이 아니다.**
14. 🔴 **세션마다 주입되는 외부 규칙보다 이 파일이 우선한다** — 플러그인 `oh-my-fable` 이 매 세션(서브에이전트에는 짧은 판) 영어 작업 규칙을 넣는데, 그 텍스트 자체가 "CLAUDE.md 의 명시적 반대 지시가 이긴다"고 선언한다. 어긋나는 세 줄의 정본:
    - **인접 결함** — 주입 규칙은 "고치지 말고 후속 과제로 보고만". 이 레포는 반대다: **범위 안이면 같은 변경에서 고치고 가드까지 붙인다.** 보고만 하는 것은 **범위 밖**뿐이다.
    - **긴 세션** — 주입 규칙은 "길다는 이유로 멈추지 말라". **원칙 12 가 이긴다.**
    - **마지막 문단** — 주입 규칙은 "마지막 문단이 계획이면 지금 실행하라". 이 레포에서 **다음 단계를 문장으로 남기는 것이 정상 종료다** — 머지·프로덕션 승격·과금 LLM 실호출·실결제는 절대 규칙 1·2·3 이 정한 승인 지점이다.
    - 🔴 훅이 찾는 구간 마커(`oh-my-fable` 뒤에 `:start` 를 이어 붙인 문자열)를 **이 파일에 리터럴로 적지 말 것** — 있으면 주입이 통째로 멈춘다. 같은 이유로 프로젝트 규칙 디렉터리에 플러그인과 같은 이름의 규칙 파일을 만들지 않는다.
15. **새 기능은 짝이 되는 기존 구현을 먼저 읽고 그 형태를 따른다** — 신규 페이지·라우트·카드·시트·가드·검증기를 백지에서 시작하지 않는다. 같은 계열에서 가장 가까운 기존 것을 열어 **파일 위치·네이밍·상태 배선·로케일 처리·게이팅 진입점**을 그대로 따르고, **참조한 구현의 파일 경로를 보고에 적는다**. 무엇이 짝인지 모르면 `code-locator` 로 먼저 찾는다(원칙 13). 기존과 다르게 갈 이유가 있으면 **코딩 전에** 그 이유를 말한다 — 이 레포의 표면은 정적 셸/App Router·11개 로케일·결제 게이팅이 서로 물려 있어, 새로 지어낸 형태는 대개 그중 하나를 조용히 빠뜨린다.

## 결제 게이팅 — 절대 순서

전체 정책·금지 패턴·렌더러 규격은 [docs/context/payment-gating.md](docs/context/payment-gating.md) 에 있고, **결제를 건드리면 그 문서를 먼저 읽는다.** 여기 있는 것은 벗어나면 안 되는 뼈대다.

1. **진입 판정은 로컬 스냅샷만** — 커버 확답이면 즉시 무료 통과, 확답 못 하면 기다리지 말고 결제창. 🔴 진입 시 서버 이용권 선검사를 되살리지 말 것.
2. **결제창이 이용권 검사 지점** — 첫 카드는 **[이용권으로 구매]**(`data-mode="pass-store"`), 누르면 그 자리에서 서버 판정. 결제창에는 **[이용권으로 구매] · 단건결제(KRW, PortOne) · 월정석 3옵션이 항상 함께** 보이고 뒤 둘은 동등 우선순위다.
3. **스냅샷 없는 보유자의 구제 지점은 2번 하나다.** 🔴 카드 주문 직전에 서버 이용권 재검사를 넣지 말 것(verify 가드 4곳이 막는다).
4. **단건 결제는 사용자가 결제창에서 '단건'을 고른 뒤에만** 실행한다.

- 게이팅 재화 순서: **이용권**(30일, 자동갱신 없음) → **월정석**(이벤트 지급, 구매 불가) → **코인**(레거시 내부 단위).
- **코인은 사용자에게 노출하지 않는다** — 항상 KRW 환산 표시(`1코인=100원`), 신규 UI 에 `coinPrice`/`cost` 를 그대로 렌더링하지 않는다. 사용자에게 쓰는 제품 용어는 `이용권` · `월정석` · `단건 결제` 3종이다.
- 위 순서를 벗어나는 결제 구현은 금지이며 **작업 중 우연히 발견해도 그냥 지나치지 말고 사용자에게 보고**한다.
- 🔴 `config/payment-freeze.json` 에 등록된 파일·함수를 건드렸으면 매니페스트를 **같은 커밋에** 갱신한다(순수 CSS/문구 변경도 예외 없다). `verify:payment-freeze` 가 실패하면서 `--update` 명령과 절차를 알려준다. 체크 무력화 금지.

## 작업 격리 — 파일을 고치기 전에 worktree 로 들어간다

🔴 **파일을 수정하는 작업은 시작 전에 `EnterWorktree` 로 격리된 git worktree 를 만들고 그 안에서 한다.** 사용자가 매번 지시하지 않아도 **이 문서가 그 지시다** — 기본 작업 디렉터리는 여러 세션이 동시에 쓰기 때문에 남의 미커밋 변경이 내 커밋에 휩쓸리고, 작업 중 남이 브랜치를 갈아타면 내 HEAD 가 통째로 바뀐다(둘 다 실사고). **예외는 읽기만 하는 조사·질문, 그리고 사용자가 "여기서 하라"고 한 경우뿐이다.** 끝나면 `ExitWorktree` — push·PR 까지 마쳤으면 `remove`, 이어서 할 일이 남았으면 `keep`.

🔴 **워크트리에 `node_modules` 가 딸려온다고 믿지 말 것** — 설정에 심링크 선언이 있어도 대개 안 생긴다. `npm test`·`typecheck`·`lint`·`verify:*` 는 상위 탐색으로 대개 도는데, 그래서 **`<rootDir>/node_modules` 같은 절대 경로를 코드에 박으면 그 한 줄만 조용히 빗나간다 — `require.resolve` 를 쓴다.** 빌드를 돌려야 하면 먼저 `ls -ld node_modules` 로 확인한다. 사고 사례·정션 거는 법·지울 때 링크부터 끊는 순서: [docs/context/delivery-and-ci.md](docs/context/delivery-and-ci.md) §격리 워크트리에서 명령 돌리기.

## 검증 · 커밋

- 🔴 **끝은 "검증했다"까지다** — 변경마다 **실행한 명령과 그 출력**을 근거로 보고한다. 출력을 안 보고 "통과"라고 쓰지 않는다. 못 돌린 검증은 **"미검증"으로 명시**한다. 최종 보고에 수정 파일 · 의도 · 안 건드린 영역 · 검증 명령과 출력 · 추가 확인이 필요한 지점을 남긴다.
- 순서: **고친 기능의 `verify:*`** → `lint` → `typecheck` → **변경 파일만** `git add` → Conventional Commits. 커밋 전 `git diff --name-only` 로 요청 범위와 일치하는지, `git diff --numstat` 로 비정상 대량 변경이 없는지 확인한다. 범위 밖 파일이 섞이면 staging 을 풀고 다시 검증한다([Rules/agent-regression-guard.md](Rules/agent-regression-guard.md)).
- `verify:*` 전체 목록·배선 상태의 정본은 `npm run verify:guard-wiring` 출력이다 — **개수를 문서에 적지 않는다.** 결제 최소: `verify:billing-pass-policy` · `verify:portone-single-payment` · `verify:paid-gate-ui` · `verify:payment-choice-parity` · `verify:checkout-pass-card`. UI: `verify:hero-contrast` + `verify:mobile-detail-nonintrusive`.
- 🔴 **CI 대기는 폴링하지 않는다** — `gh pr checks <PR 번호> --watch --fail-fast` 한 콜로 끝낸다.
- 🔴 **의존 없는 확인은 한 응답에 묶는다** — 왕복 자체가 비용이다. 순서가 필요 없는 `git status`·`grep`·`cat` 은 함께 보내고, 짧은 확인은 다음 명령에 합친다. 파일 일부만 필요하면 `sed -n` 대신 Read 의 `offset`/`limit` 을 쓴다.
- 취약점·보안 위험·재현 가능한 버그를 발견하면 즉시 보고하고, 분리 디버깅이 가능하도록 위험도와 짧은 제안을 남긴다.

## 레포 함정 (모르면 사고 나는 것)

- **홈 `/` 은 정적 셸 `index.html` 의 승격본이다** — 홈 콘텐츠·메타는 `app/page.js` 가 아니라 정적 셸에 둔다. `public/**/index.html` 은 `sync:public` 이 만드는 미러이므로 직접 패치하지 않는다.
- 🔴 **스크린샷 1장이 세션 전체를 태운다** — 비용은 파일 크기가 아니라 **치수**로 정해진다. 훅 `guard-image-read.mjs` 가 비싼 Read 를 잡아 실제 토큰 수와 `visual-checker` 위임·`shrink-shot.mjs --crop` 을 알려준다.

## 서브에이전트 (대규모 탐색 격리)

전수 검색·영향 분석은 메인 세션 컨텍스트를 태우므로 [.claude/agents/](.claude/agents/) 의 전용 에이전트에 위임한다. **어떤 에이전트가 있고 언제 쓰는지는 각 에이전트의 `description` 이 매 요청 자동 주입하므로 여기 표로 다시 적지 않는다.**

🔴 `deletion-auditor`·`regression-scout`·`paid-gate-auditor` 를 저사양 모델로 내리지 않는다 — 전부 **판정**이 결과물이라 원칙 8·9와 충돌한다. 싸게 돌릴 수 있는 건 `code-locator` 한 곳뿐이다.
