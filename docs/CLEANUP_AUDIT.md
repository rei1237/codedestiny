# Cleanup Audit

## 조사 일시

* 작성일: 2026-08-02 KST
* 브랜치: `feat/today-fortune-ui-upgrade`
* 마지막 커밋: `0ce381d21 fix(today): replace hardcoded TodayClient with real 5-system daily fortune hub`

## 현재 Git 상태

* 현재 브랜치: `feat/today-fortune-ui-upgrade`
* 마지막 커밋: `0ce381d21 fix(today): replace hardcoded TodayClient with real 5-system daily fortune hub`
* 변경된 파일: `public/destiny-island.html`
* untracked 파일: `.claude/settings.local.json`, `destiny-island.html`, `site-url-checklist.txt`, `tmp_out.txt`
* 주의가 필요한 파일: `public/destiny-island.html`은 Git 추적 중인 public 노출 파일이며 현재 수정 상태다. `destiny-island.html`은 미추적 루트 파일이지만 `scripts/sync-legacy-static-to-public.mjs`에서 같은 이름의 정적 소스 동기화 규칙이 있으므로 삭제 전 확인이 필요하다. Git 명령에서 `C:\Users\user/.config/git/ignore` 접근 권한 경고가 반복되었다.

## 요약

* 전체 후보 수: 대표 그룹 기준 48개
* 삭제 안전 후보: 16개 그룹
* 확인 필요 후보: 17개 그룹
* 자동 삭제 금지 후보: 8개 그룹
* 유지 추천 후보: 7개 그룹

## 삭제해도 거의 안전한 후보

| 파일/폴더 | 이유 | Git 추적 여부 | 참조 검색 결과 | 권장 조치 |
| ----- | -- | --------- | -------- | ----- |
| `.next/` | Next 빌드 캐시/산출물, 3,684 files, 173.53MB | 미추적 | `.gitignore` 포함 | 승인 후 삭제 가능 |
| `dist/` | 배포/빌드 산출물, 3,772 files, 494.47MB | 미추적 | `.gitignore` 포함 | 승인 후 삭제 가능 |
| `out/` | 정적 export 산출물, 3,280 files, 426.75MB | 미추적 | `.gitignore` 포함 | 승인 후 삭제 가능 |
| `node_modules/` | 의존성 설치 산출물, 82,362 files, 1083.35MB | 미추적 | `.gitignore` 포함 | 재설치 가능하면 승인 후 삭제 가능 |
| `.wrangler/` | Cloudflare 로컬 캐시, 14 files, 0.62MB | 미추적 | `.gitignore` 포함 | 승인 후 삭제 가능 |
| `worker/.wrangler/` | Worker 로컬 캐시, 8 files, 25.56MB | 미추적 | `.gitignore` 포함 | 승인 후 삭제 가능 |
| `apps/mobile/android/build/` | Android Gradle 빌드 산출물, 0.13MB | 미추적 | 빌드 폴더 | 승인 후 삭제 가능 |
| `apps/mobile/android/app/build/` | Android 앱 빌드 산출물, 10,236 files, 1365.17MB | 미추적 | 빌드 폴더 | 승인 후 삭제 가능 |
| `apps/mobile/android/capacitor-cordova-android-plugins/build/` | Android 플러그인 빌드 산출물, 1,276 files, 4.14MB | 미추적 | 빌드 폴더 | 승인 후 삭제 가능 |
| `tsconfig.tsbuildinfo` | TypeScript 증분 빌드 캐시 | 미추적 | `.gitignore` 포함 | 승인 후 삭제 가능 |
| `tmp-mobile-scroll-dev.out.log`, `tmp-mobile-scroll-dev.err.log` | 루트 임시 dev 로그 | 미추적 | 파일명/내용 참조 없음 | 승인 후 삭제 가능 |
| `tmp-codex-dev.log`, `tmp-codex-dev.err.log` | 루트 임시 dev 로그 | 미추적 | 파일명/내용 참조 없음 | 승인 후 삭제 가능 |
| `tmp_out.txt` | 루트 임시 출력 파일 | 미추적 | `rg tmp_out` 참조 없음 | 승인 후 삭제 가능 |
| `.playwright-mcp/console-*.log` | Playwright MCP 콘솔 로그 | 미추적 | 로그 파일 | 승인 후 삭제 가능 |
| `.codex-tmp/local-dev/*.log` | Codex 로컬 dev 로그 | 미추적 | 로그 파일 | 승인 후 삭제 가능 |
| `.cleanup/*.log` | 이전 cleanup 검증 로그 | 미추적 | 로그 파일 | 승인 후 삭제 가능 |

## 삭제 가능성이 높지만 확인 필요한 후보

| 파일/폴더 | 이유 | 우려사항 | 추가 확인 필요 |
| ----- | -- | ---- | -------- |
| `.claude/worktrees/*` | 등록된 Git worktree 5개가 약 1.62GB 차지 | `git worktree list`에 실제 등록되어 있음. `feat-today-fortune-hub`는 locked. 소유권 문제로 내부 상태 검증이 막힘 | 각 worktree 브랜치 병합/보관 여부 확인 후 `git worktree remove` 방식 검토 |
| `.claude/settings.local.json` | 미추적 로컬 설정 | 개인/에이전트 설정일 수 있음 | 사용자 로컬 설정 보존 여부 확인 |
| `.codex-tmp/fortune-tea-tarot-assets/*` | 에이전트 산출물 성격의 이미지들, 4.62MB 중 일부 Git 추적 | tracked 9개 존재, 티하우스 타로 에셋 실험/원본 가능성 | 실제 public/src 에셋으로 승격되었는지 확인 |
| `.playwright-mcp/page-*.yml` | Playwright MCP 세션 기록 | tracked 2개 존재 | 재현/디버깅 기록 보존 필요 여부 확인 |
| `.cleanup/*.md`, `.cleanup/*.txt` | 이전 cleanup 분석 문서 | tracked 4개 존재 | 과거 감사 근거로 유지할지 확인 |
| `reports/cleanup-plan.json`, `reports/cleanup-applied.json` | 이전 safe-clean 산출물 | tracked 상태 | 과거 cleanup 이력으로 유지할지 확인 |
| `reports/unused-files-report.json`, `reports/duplicate-files-report.json`, `reports/large-files-report.json` | 대형 분석 산출물 | tracked 상태, 추후 비교 기준일 수 있음 | 최신성/보존 정책 확인 |
| `reports/psi-*`, `reports/lighthouse-*`, `reports/psi-postdeploy-*` | Lighthouse/PSI 실행 결과 다수 | tracked 상태, 성능 추적 근거일 수 있음 | 배포 성능 이력 보존 필요 여부 확인 |
| `reports/i18n-hardcoded-audit.json` | 4.6MB i18n 감사 산출물 | `scripts/i18n-audit-hardcoded-copy.mjs`가 생성 경로로 사용 | 최신 결과인지, 재생성 가능한지 확인 |
| `docs/orphan-audit/*` | 과거 orphan audit 문서 | 내용에 모지바케가 관찰됨. 그래도 tracked 문서 | 새 보고서로 대체 가능한지 확인 |
| `docs/performance-audit/results/*` | 네트워크/성능 측정 CSV/MD | tracked 상태, 과거 측정 근거 | 장기 보관 필요 여부 확인 |
| `cleanup-audit.md`, `cleanup-report.md`, `cleanup-summary.md`, `cleanup-candidates.md`, `CLEANUP_REPORT.md` | 루트 cleanup 문서 중복 가능 | 모두 tracked, 과거 작업 기록일 수 있음 | 이번 `docs/CLEANUP_AUDIT.md`로 통합 가능한지 확인 |
| `seo-audit-report.json`, `seo-audit-report.md`, `adsense-audit-report.md` | 루트 감사 산출물 | tracked 상태, SEO/Adsense 운영 근거일 수 있음 | 최신성/보관 정책 확인 |
| `site-url-checklist.txt` | 미추적 URL 체크리스트 | 운영 URL 검증 메모일 수 있음 | 사용자 작성 여부 확인 |
| `destiny-island.html` | 미추적 루트 정적 HTML | `scripts/sync-legacy-static-to-public.mjs`가 루트 파일을 public으로 동기화하는 구조 | 현재 수정된 `public/destiny-island.html`과 원본/미러 관계 확인 |
| `public/destiny-island.html` | tracked + modified public 노출 파일 | 운영 정적 페이지이며 현재 변경 상태 | 현재 수정이 의도된 것인지 확인 |
| `worker-dev.err` | 루트 에러 로그처럼 보임 | tracked 상태, 과거 audit에서도 부산물로 언급 | 추적 제거 가능 여부 확인 |

## 절대 자동 삭제 금지 후보

| 파일/폴더 | 이유 |
| ----- | -- |
| `.env*`, `.secret.example`, `.dev.vars` 계열 | 환경변수/시크릿 정책 영역 |
| `wrangler.toml`, `wrangler.assets.toml`, `worker/wrangler.toml` | Cloudflare/Workers 배포 설정 |
| `package.json`, lockfile, `next.config.*`, `tsconfig.json`, `tailwind.config.*`, `middleware.*` | 빌드/런타임 핵심 설정 |
| `worker/**`, `app/api/**`, `server/**`, `scripts/migrate*`, `scripts/payment*`, `scripts/index*` | 결제/LLM/DB/API/Worker 민감 영역 |
| `public/**` 서비스 에셋 | 정적 서비스 노출 및 동적 경로 참조 가능성 |
| `public/codedestinyassets/**` | R2/정적 에셋 원본 또는 로컬 캐시로 보이며 음악/이미지 동적 참조 가능 |
| `public/fuctionassets/meryok-new.webp`, `public/fuctionassets/vilun-new.webp` | `js/core/saju/reportDashboard.js`에서 실제 썸네일로 참조 |
| `public/myungwun_final.html`, `myungwun_final.html` | `/myungwun_final.html` 라우트, sync 스크립트, 헤더, 랜딩 카드에서 실제 참조 |

## 유지 추천 파일

| 파일/폴더 | 이유 |
| ----- | -- |
| `app/_content/seo-copy.js`, `app/_content/seo-copy/seo-copy.js` | `HomeClient`, `SajuBasicPage`, `app/_content/seo-copy/index.js`에서 import |
| `app/_content/faq-copy.js`, `app/_content/about-copy.js` | SEO/홈 콘텐츠 구조상 copy 명칭이 도메인 의미로 사용됨 |
| `lib/fpti/fpti-copy.ts` | `lib/fpti/fpti-engine.ts`에서 import |
| `lib/tarot/sun-recovery-card-copy.mjs` | `lib/tarot/tarot-interpretation-engine.mjs`와 검증 스크립트에서 import |
| `scripts/i18n-audit-hardcoded-copy.mjs` | `package.json`의 `i18n:audit`에서 호출 |
| `scripts/verify-sun-recovery-card-copy.mjs` | `package.json`의 `verify:sun-recovery-copy`에서 호출 |
| 핵심 문서 `AGENTS.md`, `README`, `PROJECT_STRUCTURE.md`, `PAYMENT_POLICY.md`, `SECURITY.md` | 운영/정책/온보딩 근거 문서 |

## 대용량 파일 후보

| 파일/폴더 | 크기 | 이유 | 권장 조치 |
| ----- | -: | -- | ----- |
| `.claude/worktrees/` | 1617.49MB | 등록된 Git worktree 복제본 | 확인 필요. 직접 삭제 금지 |
| `apps/mobile/android/app/build/` | 1365.17MB | Android 빌드 산출물 | 승인 후 삭제 가능 |
| `node_modules/` | 1083.35MB | 의존성 설치 산출물 | 재설치 가능하면 승인 후 삭제 가능 |
| `dist/` | 494.47MB | 빌드 산출물 | 승인 후 삭제 가능 |
| `out/` | 426.75MB | 빌드 산출물 | 승인 후 삭제 가능 |
| `.next/` | 173.53MB | Next 빌드 캐시 | 승인 후 삭제 가능 |
| `worker/.wrangler/` | 25.56MB | Worker 로컬 캐시 | 승인 후 삭제 가능 |
| `reports/i18n-hardcoded-audit.json` | 4.60MB | 감사 결과 JSON | 확인 필요 |
| `public/codedestinyassets/music/**` | 최대 5.99MB/파일 | 음악 에셋 원본/로컬 캐시 | public/R2 참조 확인 전 삭제 금지 |
| `public/images/fortune-tea-house/*sprite*.png` | 최대 2.77MB/파일 | 캐릭터 스프라이트 | 동적 에셋 참조 가능. 삭제 금지 |

## 중복 가능 파일 후보

| 파일 A | 파일 B | 유사 이유 | 권장 조치 |
| ---- | ---- | ----- | ----- |
| `dist/codedestinyassets/**` | `out/codedestinyassets/**`, `public/codedestinyassets/**` | 동일 해시 음악/이미지 다수 | `dist/out`만 산출물로 삭제 가능. `public`은 삭제 금지 |
| `dist/images/fortune-tea-house/**` | `out/images/fortune-tea-house/**`, `public/images/fortune-tea-house/**` | 동일 해시 스프라이트 다수 | `dist/out`만 산출물로 삭제 가능 |
| `apps/mobile/android/app/build/intermediates/assets/**` | `apps/mobile/android/app/src/main/assets/**` | Android 빌드가 앱 assets를 복제 | `build/intermediates`만 삭제 가능. `src/main/assets`는 확인 필요 |
| `.next/server/app/**` | `out/**` | Next 빌드 결과와 export 결과 중복 | 둘 다 산출물로 승인 후 삭제 가능 |
| `.claude/worktrees/*/public/**` | 루트 `public/**` | 등록 worktree 내 복제본 | worktree 단위 확인 후 처리 |
| `.codex-tmp/fortune-tea-tarot-assets/major-debug-boxes.png` | `.claude/worktrees/*/.codex-tmp/.../major-debug-boxes.png` | 동일 해시 디버그 이미지 | tracked 여부와 에셋 승격 여부 확인 |
| `reports/psi-postdeploy-*/psi-*.json` | `reports/psi-*.json` | 성능 측정 결과 반복 저장 | 보관 정책 확인 |

## 다음 단계 제안

* 1차 삭제 가능 목록: `.next/`, `dist/`, `out/`, `node_modules/`, `.wrangler/`, `worker/.wrangler/`, Android `build/` 폴더 3개, `tsconfig.tsbuildinfo`, 루트 `tmp-*.log`, `tmp_out.txt`, 미추적 `.log` 파일들.
* 추가 확인이 필요한 목록: `.claude/worktrees/*`, `destiny-island.html`/`public/destiny-island.html`, `.codex-tmp/fortune-tea-tarot-assets/*`, tracked `reports/**`, tracked cleanup 문서, tracked `worker-dev.err`.
* 문서화 전에 정리하면 좋은 목록: 루트 cleanup 문서 5개와 `docs/orphan-audit/*`는 새 감사 문서와 중복 가능성이 높고 일부 모지바케가 보여 통합 여부를 먼저 결정하는 것이 좋다.
* 조사에 사용한 핵심 검색: `git status --short`, `git branch --show-current`, `git log -1 --oneline`, `git ls-files`, `git ls-files --others --exclude-standard`, `rg` 파일명/basename/reference 검색, 대용량/중복 해시 PowerShell 정적 스캔.

