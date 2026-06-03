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
- If a request requires changing more than 3 files, stop and ask a clarifying question before writing code.
- If the user's prompt is too vague, stop and ask a clarifying question before writing code.
- Ensure every code snippet is copy-paste ready with enough local context for placement.
- Do not write paragraphs of text before or after code blocks; output the code block immediately.
- All fortune-related writing must read as professional and mystical, and must never sound like developer documentation, technical specs, or implementation notes.
- New features should default to full-screen or header/footer-hidden layouts; do not introduce visible headers or footers unless explicitly requested.

## 1.3 AI 개발 작업 기본 원칙 (Must Follow)
- 관련 파일만 먼저 검색하고, 해당 기능과 직접 관련 없는 파일은 수정하지 마라.
- 한 번에 전체 리팩토링하지 말고, 반드시 `원인 분석 → 최소 수정 → 빌드 검증` 순서로 진행해라.
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
- All premium PDF services must follow this exact execution order:
	1. Payment/access verification
	2. User input acquisition
	3. Local calculation engine execution
	4. PDF-ready JSON payload generation
	5. Fixed chapter/category skeleton generation
	6. LLM call
	7. Per-chapter validation
	8. Regenerate missing chapters only or apply local deterministic reinforcement
	9. PDF rendering
- Never skip a prior step to execute a later step.
- If a chapter fails validation, do not block the entire report immediately: attempt targeted chapter regeneration first, then deterministic local reinforcement for only missing/failed chapters.
