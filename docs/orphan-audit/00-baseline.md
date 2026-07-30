# Phase 0 — 안전장치 & 베이스라인

> 고아 코드 진단·정리 감사 / 생성 시점 기준 커밋 `31cab3bdd`
> 작업 격리: **git worktree** (`C:\Users\user\Downloads\codedestiny-orphan-wt`), 브랜치 `chore/orphan-cleanup-20260725`

## 0. 실행 환경 (승인된 계획 대비 변경점)

- **원래 계획**: `integrate-deploy`에서 브랜치 분기.
- **실제**: 브랜치 분기 시작 후, 메인 작업 디렉토리(`codedestiny-main`)에 **감사 범위 밖의 동시 작업**이 능동적으로 돌아가고 있음을 발견 → 사용자 승인으로 **worktree 격리**로 전환.
  - 발견 내용: 루트 `index.html` + `public` 6미러 + `js/core` 런타임(`index-inline-runtime.js`, `uiBindings.js`, `mobile-interaction-patch.js`, 루트·public 양쪽) 등 **정적 셸 시스템 전반 12파일(+698/−542줄)**이 비결정적으로 나타났다 사라짐 = 활성 dev/워처 또는 병렬 세션의 미커밋 홈 리디자인 작업.
  - 조치: 메인 트리는 **원상 복구**(세션 시작 상태 = `.claude/settings.json` 1개만 미커밋). 감사는 커밋된 HEAD `31cab3bdd`에서 새로 체크아웃한 **격리 worktree**에서만 수행 → 메인 디렉토리의 동시 작업과 완전 분리, 재현 가능한 커밋 기준 베이스라인 확보.
- `.claude/settings.json`(세션 시작부터 미커밋이던 로컬 설정 변경)은 감사와 무관 → 메인 트리에 그대로 둠(감사 브랜치엔 미포함).
- worktree는 fresh 체크아웃이라 `node_modules` 부재 → 메인 repo의 `node_modules`를 **정션(junction)**으로 공유(읽기 전용 사용, 안전). `next`/`tsc`/`wrangler` 바인 해석 확인.

## 1. 코드 위생 베이스라인 (기존 상태)

| 항목 | 명령 | 결과 |
|------|------|------|
| **Typecheck** | `tsc --noEmit` | ✅ **exit 0, 에러 0** (완전 통과) |
| **Lint** | `next lint` | ✅ **exit 0(블로킹 에러 0)**, ⚠️ 경고 **약 738건** |
| **Build (로컬)** | `next build` | ⛔ **Windows 로컬 미완주**(`/_not-found` prerender 이슈, 알려진 제약) — 완전 검증은 CI만 |
| **Build (워커 dry-run)** | `wrangler deploy --dry-run` | ✅ **Total Upload 11477.96 KiB / gzip 2403.62 KiB** |
| **라우트 수** | `public/sitemap.xml`(커밋본) | **430 URL** |

- Lint 경고 738건의 **다수가 `@typescript-eslint/no-unused-vars`·`no-explicit-any`** — 이번 고아/데드코드 감사와 **직접 관련**(Phase 1 eslint 스캔의 1차 후보군).
- `next lint`은 Next.js 16에서 제거 예정(deprecation 경고 출력) — 베이스라인 사실로만 기록, 이번 감사 범위 아님.

## 2. 저장소 규모

- **추적 파일: 3,386개** (HEAD `31cab3bdd`)
- 확장자 분포(상위, 커밋된 트리 기준):

  | 확장자 | 수 | 확장자 | 수 |
  |--------|----|--------|----|
  | `.js` | 584 | `.json` | 159 |
  | `.tsx` | 489 | `.css` | 79 |
  | `.ts` | 326 | `.jpeg` | 77 |
  | `.webp` | ~628* | `.png` | ~149* |
  | `.mjs` | 259 | `.jpg` | ~60* |
  | `.html` | 253 | `.jsx` | 25 |
  | `.md` | 161 | `.xml` | 20 |

  \* `git ls-files`가 비ASCII(한글) 경로를 따옴표로 감싸 확장자 집계가 `.webp`/`.webp"` 등으로 분리됨 → 합산치. 한글 경로 자산(예 `에셋/…`, R2 미러)이 상당수임을 시사(보호 표면).

## 3. 🔴 노후 파일 휴리스틱 = 이 저장소에선 무의미

- **6개월 이상 미수정: 0개 / 12개월 이상 미수정: 0개 / 커밋 이력 없음: 0개.**
- 모든 추적 파일이 최근 6개월 내 커밋됨(integrate-deploy가 main 대비 200 커밋 앞선 초고활성 저장소).
- **결론**: 프롬프트 Phase 1의 "12개월 미수정" 나이 기반 신호는 이 저장소에서 고아를 **하나도 못 짚는다.** 고아 탐지는 전적으로 **도달성 분석(`audit:files`) + 외부 도구 교차검증**에 의존해야 함.

## 4. verify 가드 인벤토리 (핫스팟 확정)

- `scripts/verify-*.mjs` **디스크 76개** vs `package.json`의 `verify:*` 스크립트 **68개**, 그중 실제 파일 참조 **63개** → **package.json 미참조 13개**:

  ```
  verify-admin-saju-prompt-kasi-calendar   verify-auth-p0p1-regression
  verify-coin-gate-degraded-preview        verify-famous-saju-magazine
  verify-health-report-regression          verify-insight-authored
  verify-mindscan-reading                  verify-mobile-live-deployment
  verify-mobile-original-requirements      verify-nakshatra-ai-flow
  verify-nakshatra-flow                    verify-physiognomy-scoring
  verify-portone-webhook-signature
  ```

- ⚠️ **아직 "고아" 아님.** 메모리 `orphaned_verify_guards`: 과거 감사에서 하위 에이전트가 이 판정을 **오판**한 전례. Phase 1/2에서 **① package.json ② `.github/workflows/*` ③ git 이력(최근 추가·배선 이력)** 3중 대조 없이는 A등급 승격 금지. (예: `verify-portone-webhook-signature`는 결제 도메인 → 오판 시 파급 큼.)

## 5. 사용 가능한 감사 도구 (재확인)

- **1차 정본(저장소 자체)**: `npm run audit:files`(도달성 기반 미사용/대용량) + `npm run audit:duplicates`(sha256 중복 — 관상 `AnalysisEngine.js`/`PhysiognomyUI.js` 루트↔public 이중사본 식별용). 결과는 `reports/*.json`로만 기록, **삭제 없음**.
- **보조(npx, 미설치 → 설정 미변경, `--fix`/`--write` 금지)**: `knip`·`ts-prune`·`depcheck`·`madge`.
- `safe-clean-repo.mjs`는 캐시/빌드/임시 청소용 → 소스 고아 제거엔 부적합(참고만).

## 6. 다음 단계 결정 사항 (사용자 승인 필요)

- Phase 0 완료. **Phase 1(정적 참조 분석, 읽기 전용)** 진행 승인을 요청함.
- Phase 1 산출물: `docs/orphan-audit/01-static.md` (경로|종류|탐지도구(복수)|최종수정|크기 표).
- 모든 분석은 이 격리 worktree에서만 수행하며, 메인 디렉토리의 동시 작업은 계속 건드리지 않음.
