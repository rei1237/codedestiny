---
status: in-progress
updated: 2026-11-12
next: "가디언 에이전트(/handoff saju-guardian-prompt-2026-11-11.md 2단계)의 결과를 받아 두 번째 운영 승격을 확인한다. 그 뒤 무료화 문서를 닫고 최종 보고한다."
---

# 무료화 릴리스 마무리와 앱 출시 점검 (2026-11-11~12)

## 첫 행동
1. `gh run list --branch main --limit 10`으로 70e2b413d(또는 그 뒤 main)의 PR CI, Paid Flow Gates, 스테이징 릴리스 결과를 확인한다.
2. 실패했다면 `gh run view <id> --log-failed`를 본다. `Temporary failure resolving 'azure.archive.ubuntu.com'`이면 러너의 apt 장애이므로 `gh run rerun <id> --failed`로 다시 실행한다. 다른 오류면 원인부터 찾는다.

## 지금 상태
- 워크트리: `D:\Development\codedestiny-worktrees\seo-og-gaps-20261108-133839`
  - 브랜치: `wt/seo-og-gaps-20261108-133839`
  - HEAD는 origin/main과 같은 `70e2b413d`
- 70e2b413d에서 고친 것
  - 인연 route 이중 실행: `index.html`의 직접 실행 분기에 `_cdSafeBlockEvent`를 추가했다.
  - 요가 비로그인 무안내 복귀: `yoga-guru.html`에서 `history.back()` 대신 `/login?next=`로 보낸다.
  - 검사 대기 보강: `scripts/verify-rpt-preview-cta-flow.mjs`
- 로컬 Static guards 51개 명령은 모두 통과했다.
- CI 상태(2026-11-11 23:45~00:20 KST)
  - Static guards, Paid Flow Gates, 스테이징 배포가 모두 Playwright `--with-deps` 설치 단계에서 apt DNS 장애로 실패했다. 재실행 1회도 같은 원인으로 실패했다.
  - 코드 검사 자체는 실행되지 않았다.
- 승격 전 운영은 162081df1, 스테이징은 37258e3e9다.

## 승인 상태 (원문·날짜)
- 2026-11-11 사용자: "다 운영 배포해줘 / 지금 작업 제대로 마무리해줘"
  - 운영 승격이 승인돼 있다: `gh workflow run cloudflare-pages-deploy.yml --ref main -f mode=production`(나머지 입력은 기본값).
- 2026-11-11 AskUserQuestion 답변
  - "생년월일 1건 3,000원 (Recommended)"
  - "무료화 먼저, 가디언은 바로 뒤 (Recommended)"
  - "빌드·기기 검증까지 (Recommended)": Android는 Play 업로드·심사 제출을 사용자가 직접 한다.

## 작업 규칙과 함정
- `js/core/free-fortune-policy.{js,mjs}`, `public/js/core/free-fortune-policy.{js,mjs}` 4개 파일은 `sync:public` 뒤 CRLF 차이만 있는 거짓 변경이다. 커밋하지 않는다.
- Git Bash에서 `origin/main:path` 형식을 쓸 때는 `MSYS_NO_PATHCONV=1`을 붙인다.
- 가디언은 user-65 세션이 `saju-guardian-prompt-20261111-215425` 워크트리에서 진행한다.
  - 그 세션은 무료화 승격이 끝났다는 알림을 받기 전에는 push하지 않기로 했다.
  - 승격 뒤 운영 SHA를 SendMessage(user-65)로 알린다. 가디언용 에이전트를 따로 띄우지 않는다.
- `saju-crystals-20261111-215428`은 다른 세션이 작업 중이다. 건드리지 않는다.
- 다른 세션 작업이 남아 있으면 절전하지 않는다.

## 단계
- [x] CI 실패 원인 수정과 push (70e2b413d)
- [x] CI·Paid Flow Gates·스테이징 성공 확인. 최종 main은 37258e3e9다.
  - 70e2b413d
    - PR CI와 스테이징은 성공했다.
    - Paid Flow Gates 43040502979는 취소됐다. 실패 1건을 merge-base에서 다시 실행해 귀책을 가리던 중 20분 제한에 걸렸다.
  - 실패 원인
    - `__tests__/fortune/sky-and-range.test.mjs`(9de7b61e5, 11-09)가 KST 오늘자 `fortune/data/daily-*.json`을 읽는다. 이 파일은 gitignore 대상이다.
    - pr-ci는 `npm run fortune:build-data`를 먼저 실행한다. paid-flow-gates의 non-critical tier `npm test`는 실행하지 않았다.
  - 37258e3e9에서 고친 것: paid-flow-gates에 `Build daily fortune data for npm test` 단계를 추가했다(non-critical tier만).
    - 로컬에서는 데이터를 생성한 뒤 7/7 통과했다.
    - CI 두 번(push, dispatch)은 모두 critical tier로 판정돼 이 단계를 건너뛰었다. 그래서 CI에서 이 단계를 실제로 거친 기록은 아직 없다.
  - 37258e3e9의 결과는 모두 success다.
    - PR CI 43068937505
    - Paid Flow Gates 43068937755, 43070188800
    - 스테이징 43069042847. 스테이징 gitSha는 37258e3e9다.
  - KST 11-12 일일 운세 발행 43046147329는 같은 apt DNS 장애로 실패했다. 운영 승격 빌드의 prebuild가 오늘 데이터를 다시 만든다.
- [x] 운영 승격(43072907911, 37258e3e9) 성공
  - 운영 `/version.json`과 `/api/version`의 gitSha가 모두 37258e3e9다(2026-11-12 10:48 KST).
  - `/`, `/saju/`, `/saju/free/`, `/yoga-guru`, `/fortune/today/`, `/login/`이 200이다.
  - `/fortune/today/`에 "11월 12일"이 나온다. 승격 빌드로 오늘 운세가 갱신됐다.
- [ ] 화면 360·390·1280 읽기 전용 확인
- [x] 가디언 진행 방식 변경
  - user-65 세션은 종료됐다(2026-11-12 10:50 ListAgents). 가디언 워크트리는 00:14 커밋 뒤로 활동이 없다.
  - 계획 2단계대로 새 general-purpose 에이전트가 `/handoff`로 가디언 문서 2단계부터 진행한다(rebase → 재검증 → push → 두 번째 운영 승격).
- 후속 보고: Fortune daily publish가 11-09, 11-10, 11-11 사흘 연속 실패했다(마지막 단계: release).
  - 11-11 실패는 apt DNS 장애 때문이다. 앞의 두 번은 릴리스 런의 conclusion이 빈 값이었다.
  - 원인은 아직 조사하지 않았다(범위 밖).
- [ ] 무료화 인계 문서(`saju-free-classic-ui-20261111` 워크트리)를 done으로 닫는다.
- [x] Android 1.0.60 빌드와 기기 검증. 70e2b413d 기준이며 업로드는 하지 않았다. 승격 SHA는 37258e3e9이지만 70e2b413d와 다른 것은 `.github/workflows/paid-flow-gates.yml` 하나뿐이다. 그래서 다시 빌드하지 않는다.
  - 워크트리: `D:\Development\codedestiny-worktrees\android-1060-20261112-005825`
    - 빌드 과정에서 추적 파일 19개가 바뀌었다(생성물·CRLF). 커밋하지 않는다.
    - `.env.local`, `.env.cloudflare.local`, 서명 properties 사본이 이 워크트리에 있다. 정리할 때는 `npm run worktree:remove`를 쓴다.
  - AAB: `D:\Development\codedestiny-output\android-1060-20261112\app-release.aab` (SHA-256 be617f19…68337)
  - manifest: versionCode 60, versionName 1.0.60, targetSdk 36
  - 에뮬레이터 API 36 검증
    - 설치, 홈, 로그인 화면, 무료 타로 결과: 정상
    - Play 결제: 에뮬레이터에서는 연결되지 않아 이용권 화면이 "판매 준비 중"으로 나온다.
  - 후속 확인
    - 앱 안에 수동 "구매 복원" 진입점이 없다(`/app/` 루트에만 있음).
    - 무료 만세력이 로그인을 요구하는 것은 정책상 의도된 동작이다(무료화 문서: "로그인 … 보존").
- [ ] 최종 보고와 절전(다른 세션이 끝난 뒤에만)

## 보고할 사실
- 앱인토스(2026-11-11 점검)
  - 대표 7개와 테스트 62/62는 준비됐다.
  - 막힌 것
    - 승인 SKU 0/5
    - 운영 Worker에 mTLS와 TOSS 비밀값 4개가 없다.
    - `SERVICE_AVAILABLE`=false
    - WSL이 없어 공식 Linux 번들이 없다.
    - 기존 `.ait`는 Windows 빌드라 제출할 수 없다.
- iOS: StoreKit 상품과 서버 영수증 검증이 아직 구현되지 않았다. Mac이 필요해 출시가 막혀 있다(`docs/mobile-japan-ios-readiness.md`).
- 워드프레스: `docs/handoff/organic-marketing-wordpress-20261104.md`가 status blocked다. 게시하지 않았다.
- 후속 결함: `neville-meditation.html` 705~707줄에도 같은 `history.back()` 무안내 복귀가 있다(범위 밖).
