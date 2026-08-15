# Code Destiny

> AI 기반 사주·타로·점성술 운세 서비스 (code-destiny.com)
> Next.js 15 · Cloudflare Pages/Workers

**이 파일은 매 세션 자동 로드된다. 여기에는 "몰라서 사고가 나는 것"만 둔다.**
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
| 전체 npm 명령·폴더 구조·스택·수정 금지 목록 원문 | [docs/context/reference-basics.md](docs/context/reference-basics.md) |
| 파일·디렉터리를 지우기 전 (삭제 가능/금지 실측 목록) | [docs/context/cleanup-2026-08-15.md](docs/context/cleanup-2026-08-15.md) |

- 분할 직전 원문 스냅샷: [docs/context/CLAUDE.archive-2026-08-15.md](docs/context/CLAUDE.archive-2026-08-15.md) (편집 금지, 대조용)
- Codex 작업의 실행 계약은 [AGENTS.md](AGENTS.md), 에이전트 회귀 방지 규칙은 [Rules/agent-regression-guard.md](Rules/agent-regression-guard.md)
- 현재 개발 초점은 [docs/CURRENT_DEV_BASELINE.md](docs/CURRENT_DEV_BASELINE.md). 문서끼리 어긋나면 **조용히 합치지 말고** [docs/CONTEXT_AUDIT.md](docs/CONTEXT_AUDIT.md) 에서 먼저 정리한다.

## 절대 규칙 (예외 없음)

1. 🔴🔴 **과금 LLM 실호출 금지.** Gemini(`GEMINIF_API_KEY`)·Workers AI(`env.AI.run`)를 **실제로 부르는 검증은 사용자 허락 없이 하지 않는다.** 기본은 mock — 정본 패턴 `scripts/verify-mindscan-reading.mjs`(`fetchImpl` 주입) / `scripts/verify-workers-ai-fallback.mjs`(키 제거). 실호출은 `--live` 뒤에 두고, ①mock으로 왜 안 되는지 ②몇 회 ③어떤 키·모델인지 밝혀 **1회 한정 허락**을 받는다. 문서의 "실측" 수치는 인용하라는 뜻이지 다시 재라는 뜻이 아니다. 막는 주체는 허용목록이 아니라 훅 [.claude/hooks/guard-costly-commands.mjs](.claude/hooks/guard-costly-commands.mjs) 다(걸리면 `deny` 아닌 `ask`, fail-closed). 🔴 **훅을 고쳤으면 세션을 재시작해야 적용된다.**
2. 🔴 **실결제·프로덕션 DB 쓰기·취소/환불/정산 실행도 같다** — 그 정확한 행위에 대한 명시적 허락 없이는 하지 않는다.
3. 🔴 **`main` 직접 작업·직접 배포 금지.** 브랜치(`feature/*`·`fix/*`·`refactor/*`·`chore/*`) → 커밋 → push → PR → CI → **사용자가 머지 = 라이브**. 브랜치 룰셋이 직접 push를 막고, `scripts/lib/production-deploy-guard.mjs` 가 로컬 프로덕션 배포를 막는다. 배포 전 프리뷰 단계는 없다. 우회하지 않는다.
4. 🔴 **수정 금지 대상**: `.wrangler/` · `package-lock.json` · `.env*` 전부(깃 업로드 절대 금지) · `dist/`·`out/` · 마이그레이션 스크립트 **실행 결과물** · `worker/wrangler.toml` **구조**(라우트·크론·바인딩·`compatibility_*`). 단 `worker/wrangler.toml` 의 `[vars]` 추가·수정은 허용 — 다만 `[vars]` 값이 프로덕션 값이 되고 **코드 기본값은 죽으므로** 그 노브를 지키던 테스트를 함께 갱신한다(그러지 않으면 가드가 프로덕션이 안 읽는 값을 지킨다).
5. 🔴 **비밀정보 노출 금지** — API 키·토큰·MongoDB URI·R2 자격증명·OAuth/JWT/PortOne 시크릿.
6. 🔴 **기존 기능·라우트·배지·콘텐츠를 사용자 요청 없이 삭제하지 않는다**(`준비중` 배지 포함).

## 코딩 원칙 (다른 규칙과 충돌 시 우선)

근거와 실제 사고 사례는 [docs/context/coding-principles.md](docs/context/coding-principles.md). 여기 있는 것은 요약이 아니라 **집행 대상**이다.

1. **코딩 전 사고** — 가정을 명시한다. 불확실하면 숨기지 말고 묻는다. 해석이 여럿이면 임의로 하나 고르지 않는다. 더 단순한 방법이 있으면 말하고, 필요하면 반박한다.
2. **단순성 우선** — 요청한 것만 구현. 1회성 코드에 추상화 금지, 요청 안 한 유연성·설정가능성 금지, 발생 불가 시나리오의 에러 처리 금지.
3. **수술적 변경** — 필요한 부분만. 인접 코드·주석·포맷팅을 "개선"하지 않는다. 기존 스타일을 따른다. 무관한 데드코드는 언급만 하고 지우지 않는다(단, 내 변경으로 생긴 미사용 import/변수는 제거).
4. **목표 지향** — 작업을 검증 가능한 목표로 바꾼다("버그 수정" → "재현 테스트 작성 후 통과"). 다단계 작업은 `단계 → 검증 방법` 으로 계획을 밝힌다.
5. **사용자 안내는 한국어 + 추천안 명시** — 코드·커밋 메시지·식별자를 뺀 모든 전달 텍스트는 한국어. 선택지를 줄 때는 **가장 권하는 안을 먼저, `추천`으로 표시하고** 한두 문장으로 이유를 붙인다. 중립 비교를 명시 요청받은 경우가 아니면 우열 없이 나열만 하고 끝내지 않는다.
6. 🔴 **중첩 사전검사** — 방어 장치나 UI 계층을 **추가하기 전에 안팎에 같은 장치가 이미 있는지 확인**하고, 있으면 감싸지 말고 그 지점을 고친다. 대상: 재시도·타임아웃·캐시·락/단일비행·트랜잭션·에러 폴백 / 모달·오버레이·스크롤락·결제 게이트·`z-index`·이벤트 델리게이션·지연로딩. **이름 grep으로 판단하지 말고 함수 본문을 중괄호 균형으로 잘라 실제로 열어본다**(이름 스캔이 9곳 오탐). 검사: `npm run verify:no-nested-retry`
7. **회귀 위험 상시 점검·선보고** — 공유 모듈·공통 훅·다중 참조 함수·조건 분기·기본값 변경처럼 회귀 가능성이 있으면, 끝내고 결과만 보고하지 말고 **어떤 위험이 어떤 시나리오에서 생기는지 먼저 안내**한다. 애매하면 생략하지 않는다.
8. 🔴 **실측으로만 말한다 — 부정 단언 금지** — "없다/안 쓴다/영향 없다/이미 고쳐졌다"는 **전수 검색을 실제로 돌린 뒤에만** 쓰고 **검색 범위를 함께 적는다**. 확인 못 한 것은 `추정`·`미검증`으로 표시한다. 문서의 수치도 근거가 아니라 그날의 측정값이므로 날짜와 재현 명령을 함께 남긴다.
9. 🔴 **삭제·리네임은 3면 grep** — 소스 + `__tests__/` + `scripts/verify-*` 를 함께 본다. **"임포터 0"은 죽었다는 증거가 아니다**(`lib/payment/portone.ts` 는 import 0이지만 verify 스크립트가 파일로 읽어 단언한다). 삭제가 2개 이상 PR로 나뉘면 마지막 `main` 에서 `npm run check:critical` 을 한 번 돌린다.
10. 🔴 **가드는 fail-closed 여야 하고, 손으로 쓴 대상 목록은 가드가 아니다** — 검사 대상이 없을 때 통과시키는 가드는 가드가 아니다. 배열에 파일명을 열거하지 말고 **소스에서 전수 발견해 미분류를 실패시킨다**(정본: `verify:auth-changed-coverage`·`verify:guard-wiring`). 가드가 보는 파일은 그 가드를 부르는 워크플로 트리거 `paths` 에도 있어야 한다.
11. 🔴 **끝은 "검증했다"까지다** — 변경마다 **실행한 명령과 그 출력**을 근거로 보고한다. 출력을 안 보고 "통과"라고 쓰지 않는다. 못 돌린 검증은 **"미검증"으로 명시**한다. 최종 보고에 수정 파일 · 의도 · 안 건드린 영역 · 검증 명령 · 추가 확인 필요 지점을 남긴다.
12. 🔴 **컨텍스트가 모자라면 밀어붙이지 말고 인수인계** — 남은 작업이 컨텍스트에 안 들어오면 절반만 하고 "했다"고 하거나 후반부를 근거 없이 채우지 않는다. [docs/handoff/](docs/handoff/) 아래에 주제별 문서를 만들어 **그 문서만 읽고 시작할 수 있게** 넘기고, 무엇이 남았는지 사용자에게 분명히 보고한다(넘긴 범위를 "완료"로 적지 않는다). 판단은 **작업 시작 전에** 한다. 담을 항목: [docs/context/coding-principles.md](docs/context/coding-principles.md) 13번 · 정본 예시 [docs/handoff/detail-sheet-copy-rewrite.md](docs/handoff/detail-sheet-copy-rewrite.md)
13. **모델 사용** — 판단이 들어가는 일(구현·디버깅·회귀 분석·**코드 리뷰**·설계·삭제 영향 판정)은 세션 주력 모델에서 그대로 하고 reasoning effort 는 `high` 이상. 낮춰도 되는 건 판단 없는 기계적 조회뿐이며 **그 결과만으로 결론 내지 않는다**. 규칙에 구 모델명을 박아 두지 않는다.

## 서브에이전트 (대규모 탐색 격리)

전수 검색·영향 분석은 메인 세션 컨텍스트를 태우므로 [.claude/agents/](.claude/agents/) 의 전용 에이전트에 위임한다. 각 에이전트는 결론과 근거(파일:줄)만 돌려준다.

| 에이전트 | 쓸 때 |
|---|---|
| `regression-scout` | 공유 모듈·훅·분기를 고치기 전에 영향 경로 전수 추적 (원칙 7) |
| `deletion-auditor` | 심볼·파일 삭제/리네임 전 3면 grep (원칙 9) |
| `paid-gate-auditor` | 결제·이용권·게이팅 변경의 정책 정합성 확인 |

## Quick Start

```bash
npm run dev            # 로컬 개발 서버 (local-auth 포함)
npm run build:cf       # prebuild:cf && build (SEO/AdSense 게이트가 여기서 돈다)
npm run lint           # next lint
npm run typecheck      # tsc --noEmit
npm run deploy:check   # 업로드 없이 변경 집합만 확인 (프로덕션 배포는 로컬 불가)
```

`verify:*` 스크립트가 190개 이상 있다. **기능을 고쳤으면 그 기능의 `verify:*` 를 먼저 돌린다.** 결제 수정 시 최소: `verify:billing-pass-policy` · `verify:portone-single-payment` · `verify:paid-gate-ui` · `verify:payment-choice-parity` · `verify:checkout-pass-card`. UI 수정 시: `verify:hero-contrast` + `verify:mobile-detail-nonintrusive`.

## Folder Structure

```
app/            # Next.js App Router (라우트, app/api/*, [locale]/)
worker/         # Cloudflare Worker 백엔드 (routes/, lib/ — billing/AI/pdf/music)
lib/            # 공유 라이브러리 (llm-client, mongodb, i18n, payment, vedic*)
components/     # 공용 React 컴포넌트 (yeon/, stories/, ui/, fortune/)
src/features/   # 기능 단위 모듈 (fortune-tea-house, neo-war-room)
pages/          # 레거시 Pages Router (_app, _document, 에러 페이지)
scripts/        # 빌드/배포/검증/마이그레이션 스크립트
apps/mobile/    # Capacitor 래퍼 + Android 네이티브
js/             # 정적 셸이 동적 로드하는 레거시 브라우저 번들 (public/js/ 는 sync:public 미러)
public/, dist/, out/   # 정적 자산 및 빌드 산출물
```

- **죽은 코드는 격리하지 말고 지운다** — 격리 디렉터리는 빌드에서만 빠지고 grep·AI 읽기에는 그대로 노출돼 다음 세션이 복제한다. 안전망은 git 히스토리다(복구: [docs/cleanup-2026-08/06-deleted.md](docs/cleanup-2026-08/06-deleted.md)).
- **`veda/` 와 `models/` 는 존재하지 않는다.** 실체는 `lib/vedicSwissChart.js`·`lib/vedicCalculator.js`·`worker/lib/vedic-*.js`·`worker/lib/nakshatra-*.js`. `tsconfig.json` `exclude` 등에 남은 `veda` 는 잔재이니 근거로 삼지 말 것.
- **홈 `/` 은 정적 셸 `index.html` 의 승격본이다** — 홈 콘텐츠·메타는 `app/page.js` 가 아니라 정적 셸에 둔다. `public/**/index.html` 은 `sync:public` 이 만드는 미러이므로 직접 패치하지 않는다.

## Tech Stack

- **Framework**: Next.js 15 (App Router, `output: "export"` 정적 빌드), React 18.3.1
- **언어/스타일**: TypeScript 5.5 (`strict: false`, `strictNullChecks: true`), Tailwind 3.4
- **DB**: MongoDB Atlas **M10** (Mongoose) — 프로덕션 경로 `worker/lib/db.js`, App Router 잔여 경로 `app/_lib/dbConnect.js`
- **AI**: Gemini REST 직접 호출(`gemini-2.5-flash`) + 실패 시 Cloudflare Workers AI **체인** 폴백
- **배포**: Cloudflare Pages + Workers (wrangler 4.73, `@opennextjs/cloudflare`)
- **결제**: PortOne V2 (+ KG Inicis 채널), 포인트/코인 기반 유료 기능
- **인증**: 커스텀 JWT (NextAuth 아님), Google/Kakao/Naver OAuth
- **i18n**: `ko`(기본, prefix 없음) / `ja`, `zh`, `en`(경로 prefix)

## Code Rules

- ES Modules만, `any` 지양, `strictNullChecks` 위반 금지(`strict` 자체는 off이므로 과신 금지)
- 환경변수 하드코딩 금지 — 반드시 `process.env`/`env` 바인딩 경유
- 스타일은 Tailwind 클래스만(인라인 스타일 지양), 애니메이션은 `transition-*`/`animate-*`(`framer-motion` 은 기존 의존성)
- 외부 API 호출·DB 접근에 try-catch 필수
- `worker/` 는 Node 내장 API(`fs`, `net`) 금지 — 순수 fetch/Web API. 번들 **1MB(gzip 3MiB)** 제한 유의
- 네이밍: 컴포넌트 `PascalCase`, 유틸 `camelCase`, 라우트 폴더 `kebab-case`. 서버 컴포넌트 기본, 클라이언트는 `'use client'` 명시
- 이미지는 `<Image>` 사용(`img` 금지), `alt` 필수, 인터랙티브 버튼 `aria-label` 필수, 모바일 퍼스트 + `dark:` 병행

## 결제 게이팅 — 절대 순서

전체 정책·금지 패턴·렌더러 규격은 [docs/context/payment-gating.md](docs/context/payment-gating.md) 에 있고, **결제를 건드리면 그 문서를 먼저 읽는다.** 여기 있는 것은 벗어나면 안 되는 뼈대다.

1. **진입 판정은 로컬 스냅샷만** — 커버 확답이면 즉시 무료 통과, 확답 못 하면 기다리지 말고 결제창. 🔴 진입 시 서버 이용권 선검사를 되살리지 말 것.
2. **결제창이 이용권 검사 지점** — 첫 카드는 **[이용권으로 구매]**(`data-mode="pass-store"`), 누르면 그 자리에서 서버 판정. 결제창에는 **[이용권으로 구매] · 단건결제(KRW, PortOne) · 월정석 3옵션이 항상 함께** 보이고 뒤 둘은 동등 우선순위다.
3. **스냅샷 없는 보유자의 구제 지점은 2번 하나다.** 🔴 카드 주문 직전에 서버 이용권 재검사를 넣지 말 것(verify 가드 4곳이 막는다).
4. **단건 결제는 사용자가 결제창에서 '단건'을 고른 뒤에만** 실행한다.

- 게이팅 재화 순서: **이용권**(30일, 자동갱신 없음) → **월정석**(이벤트 지급, 구매 불가) → **코인**(레거시 내부 단위).
- **코인은 폐지된 개념** — 사용자에게는 항상 KRW 환산 표시(`1코인=100원`). 신규 UI에 `coinPrice`/`cost` 를 그대로 렌더링하지 않는다.
- 위 순서를 벗어나는 결제 구현은 금지이며 **작업 중 우연히 발견해도 그냥 지나치지 말고 사용자에게 보고**한다.
- 🔴 `config/payment-freeze.json` 에 등록된 파일·함수를 건드렸으면 `node scripts/verify-payment-freeze.mjs --update` 로 매니페스트를 갱신해 **같은 커밋에** 담는다. 순수 CSS/문구 변경도 예외 없다. 체크 무력화 금지.

## 검색 & 수정 원칙

> 🔴 **읽기 제한과 수정 제한은 다르다.** 아래는 *목적 없는 훑기*를 막는 규칙이지 *확인*을 막는 규칙이 아니다. 회귀 추적(원칙 7)·삭제 전 3면 grep(원칙 9)·부정 단언의 근거 확보(원칙 8)에 필요한 읽기는 **사용자 확인 없이 한다.** 코딩 원칙이 이 섹션보다 우선한다.

- 요청 키워드(기능명/함수명/에러 문구/라우트명)를 먼저 뽑아 Grep/Glob 으로 좁혀 읽는다. **파일 수로 읽기를 끊지 않는다** — 회귀 경로가 20개 파일에 걸치면 20개를 본다. 다만 범위가 요청보다 훨씬 넓어지면 그때 사용자에게 알린다.
- **읽는 범위와 고치는 범위는 별개다.** 범위 밖 파일은 근거 확인용으로 읽되 **수정하지 않는다.**
- 이미 얻은 정보를 다시 사지 않는다: 방금 내가 만든 `git diff` 를 통째로 다시 읽지 않고(`git diff -- <path>`), 실패한 검증만 재실행하며, 이미 통과한 check 는 그 파일이 안 바뀌었으면 신뢰한다. 🔴 **예외 — 심볼·파일 삭제가 포함된 변경은 CI 와 같은 전체 명령을 한 번 돌린다.**
- `deploy:preview` 를 습관적으로 돌리지 않는다(Cloudflare 아티팩트가 남는다). 점검은 업로드 없는 `deploy:check`.
- 최종 보고에 어떤 키워드로 어떤 파일을 좁혔는지 한 줄 남긴다. 탐색 과정과 중간 추론을 장황하게 노출하지 않는다.

## Workflow

- 5줄 이상 변경은 코딩 전 계획(plan) 우선
- 코딩 후: `lint` → `typecheck` → 관련 `verify:*` → **변경 파일만** `git add` → Conventional Commits
- 커밋 전 `git diff --name-only` 로 요청 범위와 일치하는지, `git diff --numstat` 로 비정상 대량 변경이 없는지 확인한다. 범위 밖 파일이 섞이면 staging 을 풀고 다시 검증한다([Rules/agent-regression-guard.md](Rules/agent-regression-guard.md))
- 취약점·보안 위험·재현 가능한 버그를 발견하면 즉시 보고하고, 분리 디버깅이 가능하도록 위험도와 짧은 제안을 남긴다
- 판단이 애매하면 머지하지 말고 안내를 택한다
- 세션 전환 시 `/clear` 로 컨텍스트 오염 방지
