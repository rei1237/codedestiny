# Agent Working Rules (Deployment-Only)

## 1) Goal
- Always modify deploy-target source files first.
- Never patch legacy mirror files directly unless explicitly requested.

## 1.1 Response Output Policy
- Do not add greetings or extra explanation around code.
- When showing changes, output only the modified code blocks.
- Add comments only in complex saju logic engine sections; omit comments elsewhere.

## 1.2 Vibe Coding Rules (Must Follow)
- Act as an expert full-stack developer assisting a user who prefers Vibe Coding.
- Explanations must be extremely concise and focus purely on functional results.
- Never explain why unless explicitly asked.
- Skip pleasantries entirely.
- Never rewrite the whole file when modifying code; output only the exact blocks that changed.
- When showing partial edits, use comments like `// ... existing code ...` to represent unchanged sections.
- Read and analyze only the files explicitly mentioned by the user or the currently active file.
- Implement changes only when the root cause is clear and can be validated with evidence; do not apply speculative fixes.
- If the user's prompt is too vague, stop and ask a clarifying question before writing code.
- Ensure every code snippet is copy-paste ready with enough local context for placement.
- Do not write paragraphs of text before or after code blocks; output the code block immediately.
- `준비중` 배지는 사용자 승인 없이 삭제하지 않는다. 계획서/안 작성 시에도 삭제 제안은 금지한다.
- All fortune-related writing must read as professional, mystical, and emotionally natural, and must never sound like developer documentation, technical specs, or implementation notes.
- This rule applies only to fortune-facing writing in Markdown documents, prompt files, generated reports, UI copy, JSON text payloads, PDF manuscripts, and test fixtures.
- Fortune writing must not introduce itself as a feature, service, section, report, analysis result, or content block.
- Phrases such as "비춥니다", "보여 줄 수 있습니다", "말합니다", and similar consultation verbs are allowed when they sound like a human fortune expert speaking naturally. Revise them only when they make the sentence feel functional, mechanical, or product-spec-like.
- Write as the relevant fortune expert speaking directly to the user: 명리학자, 타로 리더, 점성술사, 숙요점 상담가, 자미두수 해석가, 베다 점성술사, 수비학 해석가, or 꿈 상징 해석가.
- Prefer consultation language such as "드러납니다", "흐릅니다", "가리킵니다", "비춥니다", "기울어 있습니다", "열립니다", "머무릅니다", "강하게 떠오릅니다", but do not force replacements when the original sentence is already natural and professional.
- Before finishing any fortune-facing copy change, search the touched fortune content for mechanical labels such as "이 기능은", "이 결과는", "분석 결과는", and revise only sentences that read like product or implementation explanation.
- New features should default to full-screen or header/footer-hidden layouts; do not introduce visible headers or footers unless explicitly requested.
- When the user asks to modify fonts, use R2-hosted Code Destiny font assets first, including the `CodeDestinyBody`, `CodeDestinyDisplay`, `CodeDestinyPremium`, `CodeDestinyPlayful`, and `CodeDestinyDecorative` families declared in `styles/globals.css`.

## 1.25 동시 변경/원복 방지 운영 룰 (Must Follow)
- 세션 단위로 변경을 허용한다. 같은 세션에서 동일/연관 파일을 수정할 때 원복 대신 증분 수정만 허용한다.
- 세션 시작 시 `목표 파일 1~3개`를 확정하고, 대상 범위를 벗어난 파일은 열거나 수정하지 않는다.
- 서로 다른 세션/작업자가 같은 파일을 동시에 건드리지 않도록 파일 소유자(세션 리더)와 변경 책임자를 선점한다.
- 변경 전후에 `git status` 기준 대상 파일 리스트와 핵심 diff를 기록해 추적성을 남긴다.
- 기존 동작을 유지해야 하는 경우 되돌리기 대신 격리 수정(최소 스코프)으로 해결하고, 사용자 요청이 아닌 임의 `restore/reset/revert`는 금지한다.
- 세션 종료 전 변경 로그를 남기고, 이전 세션 산출물을 삭제하거나 되돌리는 작업은 사용자 승인 없이 수행하지 않는다.
- `index.html` 또는 정적 미러 동기화가 필요한 변경은 기존 동기화 절차( `npm run sync:public` → `npm run verify:locale-main-sync` → `npm run verify:runtime-cache-sync` )를 그대로 수행한다.

## 1.26 코딩 후 필수 검증 룰 (Must Follow)
- 모든 코딩 변경 작업 후 즉시 동작 검증을 수행한다.
- 검증 항목은 다음 두 가지를 필수 포함한다.
  - 기능이 의도한 대로 동작하는지(핵심 시나리오 위주)
  - 깨진 문자열, 인코딩 문제, 메시지/문구 노출 이슈가 없는지
- 범위에 맞는 최소 빌드/동기화/검증 절차를 함께 수행하고 결과를 기록한다.

## 1.3 AI 개발 작업 기본 원칙 (Must Follow)
- 관련 파일만 먼저 검색하고, 해당 기능과 직접 관련 없는 파일은 수정하지 마라.
- 의존성 변화(패키지 버전 변경, 공유 라이브러리 수정, 인터페이스 변경 등)로 기존 기능 회귀 가능성이 높아 보이면, 변경 실행 전에 즉시 중단하고 영향 범위·우려 포인트·필요 검증 항목을 경고해 승인을 요청한 뒤 진행한다.
- 한 번에 전체 리팩토링하지 말고, 반드시 `원인 분석 → 정확한 수정 → 빌드 검증` 순서로 진행해라.
- 수정 전에는 현재 기능의 실제 파일 구조, 호출 흐름, 상태 관리, API/Worker 연결을 먼저 확인해라.
- 존재하지 않는 파일명, 함수명, 라우트, 데이터 구조를 상상해서 만들지 마라.
- 사용자가 요청한 범위 밖의 기능을 임의로 추가하거나 삭제하지 마라.
- 결제, 코인, 구독, PDF, 로컬 계산 엔진처럼 민감한 기능은 요청 범위에 직접 포함된 경우에만 수정해라.
- 기능 수정 후에는 가능한 범위에서 TypeScript 체크, lint, build 검증을 수행하고 결과를 보고해라.

## 1.4 API 호출 최소화 & 핀셋 검색 규칙 (Must Follow)
- 전체 파일을 처음부터 끝까지 훑지 말고, 요청 키워드(기능명/함수명/에러문구/라우트)를 먼저 추출해 검색 기반으로 필요한 위치만 읽어라.
- 검색 우선순위는 `정확 키워드 → 동의어/별칭 → 호출 경로` 순서로 진행하고, 각 단계에서 관련 파일이 3개를 넘으면 사용자에게 범위 확인을 먼저 요청해라.
- 동일한 목적의 API/툴 호출은 1회 결과를 재사용하고 중복 호출하지 마라. 재조회는 코드가 변경되었거나 근거가 충돌할 때만 수행해라.
- 읽기 범위는 항상 최소 라인으로 제한하고, 수정 전후 검증도 변경된 파일/심볼 중심으로 핀셋 검증해라.
- 전체 빌드/전체 테스트/광범위 스캔은 사용자 요청이 있거나 변경 영향이 명확히 넓을 때만 실행해라.
- 최종 보고에는 어떤 키워드로 어떤 파일을 좁혀서 찾았는지 한 줄로 남겨, 추적 가능한 작업 근거를 유지해라.
- 세션에 터미널/파일 검색/파일 읽기 도구가 제공되어 있으면 해당 도구를 사용해 진행하고, 도구 부재를 이유로 중단하기 전 실제 가용 도구를 먼저 확인해라.

## 1.45 Tool Install Permission (Must Follow)
- 코딩 진행에 필요한 도구가 로컬에 없으면 사용자가 별도 제한을 두지 않는 한 직접 설치하고 작업을 계속 진행해라.
- 설치는 현재 작업 검증에 필요한 최소 범위로 제한하고, 설치한 도구와 목적을 최종 보고에 남겨라.

## 1.5 모지바케 무조건 차단 규칙 (Must Follow)
- 텍스트가 포함된 파일을 수정·생성·동기화·자동번역·코드젠한 모든 작업은 변경량과 무관하게 모지바케 검증 대상이다.
- 커밋/푸시/PR 생성 전에는 반드시 변경된 텍스트 파일 전체를 대상으로 깨진 문자와 대표 모지바케 패턴을 검색한다.
  - 필수 검색 문자/패턴: `U+FFFD`, `\\uFFFD`, `Ã`, `Â`, `ì`, `í`, `ê`, `ë`, `ð`
  - 단, 실제 정상 문장에 포함된 문자는 파일/라인 근거를 남기고 예외 처리한다.
- 한국어/일본어/중국어/베트남어/힌디어/다국어 JSON, Markdown, prompt, UI copy, HTML, TS/JS 문자열, PDF 원고, 테스트 fixture를 수정한 경우 다음을 추가로 실행한다.
  - `node scripts/verify-entry-encoding.mjs --strict-core`
  - 동치 npm 명령이 필요한 환경에서는 `npm run verify:entry-encoding -- --strict-core`
- `index.html`, `scripts/sync-legacy-static-to-public.mjs`, `public/i18n/**`, `public/**/index.html`, 런타임 캐시/로케일 미러에 영향을 주는 변경은 동기화 후 원본과 산출물 모두에서 같은 모지바케 검색을 반복한다.
- 1000줄 이상 삭제·재작성·대량 번역·대량 JSON 정렬·라인엔딩 변환·인코딩 변환이 발생한 경우에는 모지바케 고위험 작업으로 간주하고, 위 검증에 더해 `git diff --check`와 변경 파일별 샘플 라인 확인을 수행한다.
- 검증 실패, 의심 문자 발견, 콘솔 출력 깨짐, 파일 읽기 결과가 깨져 보이는 경우에는 절대 커밋/푸시하지 않는다. 원인 파일을 격리해 UTF-8로 재생성/동기화하고, 모든 검증이 패스될 때까지 반복한다.
- 최종 보고와 커밋/PR 본문에는 실행한 모지바케 검증 명령과 결과를 반드시 기록한다.

## 2) Source of Truth (Edit These)
- Worker runtime API: `worker/**`
- Next.js app/runtime UI: `app/**`, `components/**`, top-level runtime modules imported by app routes (for example `StonehengeRune.jsx`)
- Main static shell source: `index.html`
- Build/deploy pipeline scripts: `scripts/**`, `package.json`

## 3) Legacy / Mirror Paths (Do Not Edit Directly)
- `public/static/index.html`
- `public/ja/index.html`
- `public/en/index.html`
- `public/zh/index.html`
- Any other generated mirror under `public/**` that is synced from root source
- Node server fallback routes for production billing/auth behavior when equivalent worker route exists: `server/**`

## 4) Required Sync Flow for Main Shell
1. Edit only `index.html`.
2. Run `npm run sync:public` to propagate to `public/*` mirrors.
3. Run `npm run verify:locale-main-sync` and `npm run verify:runtime-cache-sync`.

## 5) Payment/Coin/Auth Policy
- New payment/coin/auth logic must be implemented in worker-native routes (`worker/routes/**`).
- Frontend must call worker-backed runtime endpoints (for example `/api/billing/*`) and avoid direct legacy server endpoints.
- Feature pricing must be resolved server-side from registry, not hardcoded in frontend for final billing decision.
- All paid feature payment flows must support single KRW payment, monthly credit, and membership pass access by default; direct-only payment gates are allowed only when the user explicitly requests that restriction.

## 6) PR Safety Checklist
- No direct edits in mirror locales unless explicitly requested.
- No behavior-only fix applied exclusively under `server/**` when worker route is active.
- Build and runtime sync checks pass before commit.

## 7) Deployment Reflection & Cache Guard (Must Follow)
- Before editing UI, identify live-render source first:
	- Static main screen users see first: `index.html` (not auxiliary React home).
	- React route UI: `app/**` only when that route is actually served.
- If request targets main shell UX/cards, modify `index.html` and any referenced runtime styles in `styles/**`.
- After `index.html` or static-style edits, always run in order:
	1. `npm run sync:public`
	2. `npm run verify:locale-main-sync`
	3. `npm run verify:runtime-cache-sync`
- Cache-bust rule for static assets:
	- When changing a file loaded by fixed URL (for example `/styles/core-ui.css`), bump the query version in `index.html` (for example `?v=YYYYMMDD-tag`) in the same commit.
	- When changing an already versioned runtime/static file (for example `/js/core/index-inline-runtime.js` or `/js/saju-engine-tarot-sukuyo-quantum.js`), always bump to a NEW cache key in the same commit (never reuse the previous `?v=` value).
	- If the changed file is loaded through another loader map, bump BOTH levels together:
		1. entry include key (for example `index.html` script `?v=`)
		2. loader target key (for example runtime map URL `?v=`)
	- Verify the new key exists in root source and synced mirrors after `npm run sync:public`.
- Reflection verification before reporting "done":
	- Confirm changed marker text/attribute exists in root `index.html` and mirrored `public/static/index.html` after sync.
	- Include the exact changed marker in commit message/body or report so production verification is immediate.

## 8) Login UI Regression Guard (Must Follow)
- For logged-in main-shell card changes, treat `index.html` auth hero/card block as a protected block.
- After any `index.html` or `scripts/sync-legacy-static-to-public.mjs` edits, verify these markers exist in root + mirrors:
	- `id="authQuickLinks"`
	- `.cd-user-card__avatar-ring::before`
	- `animation:cdPlanetRingDrift 5.4s ease-in-out infinite`
	- `id="cdAuthLogoutBtn" class="auth-btn auth-btn--logout"`
- Mandatory check command before commit:
	- `npm run verify:locale-main-sync`

## 9) Long-Run Execution Continuity (Must Follow)
- Do not stop work only because the task is taking a long time or requires many iterations.
- Continue until the requested outcome is fully completed, or a real blocker is identified with concrete evidence.
- If execution takes long, provide short progress updates and keep iterating instead of ending early.
- Do not ask for "continue" to resume normal work unless a hard blocker requires user input/decision.

## 10) Premium PDF Execution Order (All Services)
- 인생의 책 PDF는 아래 흐름만 유지한다.
	1. 결제/접근 권한 확인
	2. 사용자 입력 수집 및 로컬 계산 엔진 실행으로 PDF JSON 정합성 확보
	3. 검증된 JSON 기반으로 LLM 생성(필요 장은 보강)
	4. PDF 렌더 후 다운로드 버튼 제공

## 11) No Regression Guardrails (Must Follow)
- 이번 수정으로 인해 기존에 잘 작동하던 다른 기능이 멈추거나 바뀌지 않도록 No Regression을 최우선으로 적용한다.
- 수정 대상 기능 외에 의존성으로 연결된 코드가 있다면, 부작용이 없도록 격리 범위를 명확히 제한한다.
- 변경이 기존 동작과 충돌할 수 있는 경우, 해당 위험과 완화 방안을 사전에 명시하고 대응 여부를 기록한다.
