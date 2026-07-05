# Baseline — feat/dead-code-cleanup

기준 브랜치: `feat/dead-code-cleanup` (from `main` @ c95e7dc2)
캡처일: 2026-07-05

## 안전망 결과 (변경 전 기준선)

| 항목 | 명령 | 결과 |
|------|------|------|
| Typecheck | `npx tsc --noEmit` | **0 errors** (통과) |
| Lint | `npx next lint` | **798 warnings + 1 error** (기존) |
| Worker 회귀 테스트 | `npm run test:worker:auth-payments` | **21/21 passed** (3 suites) |
| Full build | `npm run build` (CF) | **성공 (exit 0)** |

### 기존 lint error (신규 아님, 무시 기준)
- `components/TurnstileWidget.tsx:26` — `no-empty-object-type` (빈 interface). 이번 작업과 무관, 회귀 판정에서 제외.

**회귀 판정 기준**: typecheck 신규 error 0개, lint 신규 error 0개(warning 798개 초과 금지), worker 테스트 21/21 유지.

## 코드 규모 (소스 파일 수: ts/tsx/js/jsx/mjs)

| 디렉토리 | 파일 수 |
|------|------|
| app/ | 594 |
| worker/ | 112 |
| lib/ | 87 |
| js/ | 81 |
| src/ | 80 |
| components/ | 46 |
| server/ | 37 |

> 주의: `src/`(80 파일, `src/features/fortune-tea-house/*`)는 초기 탐색에서 누락됐던 트리 — 탐지 범위에 포함.

## 라우트 인벤토리

- Next.js app 라우트(page 파일): **173개**
- Worker 등록 라우트: **42개** — `worker/index.js`의 `createLazyRouteHandler("./routes/*.js")` 등록 목록은 `.cleanup/registered-worker-routes.txt`.
- 디스크상 `worker/routes/*.js`: **42개** → **전부 등록됨(orphan 0)**. worker/routes 하위는 삭제 후보에서 전면 제외.

## 로그 파일
- `.cleanup/baseline-typecheck.log`
- `.cleanup/baseline-lint.log`
- `.cleanup/baseline-test.log`
- `.cleanup/baseline-build.log` (+ `-meta.log` 타이밍)
- `.cleanup/registered-worker-routes.txt`
