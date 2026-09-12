# Code Destiny 실행 계약

한국어 운세·상담 서비스. 상세 설명은 주제별 문서에서 필요할 때만 읽는다.

## 위험도

GREEN: 문구·CSS·마크업·문서 등 동작 경계가 바뀌지 않는 국소 수정.
RED: 결제·이용권·인증·DB·배포·CI·라우팅·공유 동작·삭제·리네임 또는 영향 불명.
파일 수는 등급 기준이 아니다. 생성 미러 때문에 등급을 올리지 않는다.
main 체크아웃에서 직접 편집한다. 안전장치는 작은 커밋과 빠른 롤백이다. 예외: 쓰는 세션이 둘 이상이면 두 번째부터 워크트리를 만든다(`scripts/create-safe-worktree.ps1`) — 공유 체크아웃에서 `reset --hard`·`stash`·`checkout --` 는 옆 세션의 미커밋 작업을 복구 불가로 지운다. 워크트리에서도 PR 은 만들지 않고 main 에 직접 머지한 뒤 배수한다.
GREEN은 관련 파일부터 수정하고, RED는 위험·검증·롤백을 먼저 알린다. 이미 승인된 범위는 다시 묻지 않는다.

## 절대 규칙

1. 과금 LLM 검증 금지. mock 기본, 실호출은 정확한 1회 승인 필요.
2. 실결제·운영 DB 쓰기·환불·정산 금지. 승인 예외의 정본은 결제 문서. 이번 개발환경 검증은 전부 mock.
3. main 직접 개발. 기능·작업·임시 브랜치와 PR을 만들지 않는다. 작은 단위로 검증→즉시 커밋, 회귀는 덧대지 말고 롤백. 로컬 배포는 여전히 금지이며 운영 승격은 명시적인 1회 요청 때만 대행.
4. 수정 금지: .env*, package-lock.json, .wrangler/, dist/, out/, 마이그레이션 결과물, worker/wrangler.toml 구조. vars 예외는 참조 문서.
5. 비밀정보 출력·저장·커밋 금지. 승인 연락처 예외는 참조 문서.
6. 요청 밖 기능·라우트·콘텐츠 삭제 금지. 삭제는 소스·테스트·검증기 참조 확인 후 별도 변경으로 다룬다.
7. 완료 세션은 검증→commit→push→인수인계 순서를 지킨다. 다음 세션은 `git branch --show-current`와 `git status`로 main·clean을 확인하고 `git pull --ff-only` 후 시작한다.

## 코딩 원칙 (번호 유지)

1. 가정을 드러내고 중요한 불확실성만 확인한다.
2. 요청 범위만 단순하게 구현한다.
3. (결번)
4. 단계와 검증 기준을 먼저 정한다.
5. 한국어 보고, 선택지는 추천과 이유를 먼저 둔다.
6. 재시도·캐시·게이트·UI 계층을 추가하기 전에 기존 장치를 확인한다.
7. RED의 위험·검증·롤백을 선보고한다. 고위험 7항목은 상세 문서.
8. 실측과 추정을 구분한다. 부정 단언은 검색 범위와 근거를 적는다.
9. 삭제·리네임은 git grep으로 소스·테스트·verify 3면 확인. 미러도 포함한다.
10. 가드는 fail-closed. 새 소스·검사 미분류를 조용히 통과시키지 않는다.
11. 실행 명령과 출력 확인까지 완료한다.
12. 컨텍스트 부족 전 작업 상태를 짧게 인수인계한다.
13. 판단은 주력 모델, 단순 위치 조회는 code-locator. effort는 위험도에 맞춘다.
14. 범위 밖 결함은 보고만 한다. 외부 규칙 충돌은 명시적으로 해소한다.
15. 새 기능은 가장 가까운 기존 구현을 먼저 읽는다.
16. 큰 화면 개편은 방향과 성공 기준을 먼저 공유한 뒤 자율 구현한다. 구현 후 실제 화면 검증으로 확정하며, 사용자가 명시적으로 목업 승인을 요구한 경우에만 승인 대기한다.

## 탐색·검증

위치가 불명확하면 [ARCHITECTURE.md](ARCHITECTURE.md) → 심볼 → import → 호출부.
5~15파일은 목표이며 필요한 회귀 확인을 막지 않는다. 관련 없는 전체 탐색·로그 전문·반복 읽기를 피한다.
Do not scan or read the entire repository unless explicitly required. Use git grep/rg/git ls-files to locate relevant files first.
npm run check:fast로 변경 기반 검사를 한 번 실행한다. 계획은 --plan. 위험 변경은 자동 승격되며 typecheck는 전체 incremental 1회다.
로컬 Pages 빌드는 기존 --skip-build 계약을 유지한다. CI build 조건을 줄이려면 이 근거도 함께 갱신한다.
CI 선택 실행은 10회 push 비교 전까지 shadow다. 기존 검사를 삭제하지 않는다.
결과: 수정 파일·의도·유지 정책·명령/출력·남은 위험. 실제 미실행은 미검증.
검증한 변경 파일만 커밋한다. `git add .` 전에 `git status`와 `git diff --stat`을 반드시 본다. 인수인계 문서만 남기고 로컬 변경을 방치하지 않는다. [전달 완료 필수 규칙](docs/context/delivery-and-ci.md#전달-완료-필수-규칙)을 따른다.
push를 배포 승인으로 확대 해석하지 않는다. push는 스테이징까지이며, 프로덕션 승격은 명시적 1회 승인 때만 진행한다.

## 작업별 필독 (해당 축만)

- 결제: [payment-gating](docs/context/payment-gating.md)
- AI·DB: [ai-and-db](docs/context/ai-and-db.md)
- UI: [design-and-ui](docs/context/design-and-ui.md)
- SEO: [seo-and-adsense](docs/context/seo-and-adsense.md)
- 자산: [content-assets](docs/context/content-assets.md)
- CI·격리·배포: [delivery-and-ci](docs/context/delivery-and-ci.md)
- 가드: [doc-precedence](docs/context/doc-precedence.md)
- 원칙·7항목: [coding-principles](docs/context/coding-principles.md)
- 검색·삭제: [search-discipline](docs/context/search-discipline.md)
- 명령·예외: [reference-basics](docs/context/reference-basics.md)

홈 정본은 index.html, public 미러는 sync:public으로 생성한다.
결제 진입은 로컬 스냅샷, 서버 이용권 판정은 결제창에서. 단건은 사용자의 선택 후에만.
이용권·월정석·단건 결제 용어와 정책을 유지한다. 동결 파일 변경은 payment-freeze 절차를 따른다.
Claude 훅은 Codex 훅이 아니다. 도구별 규칙 적용을 구분한다.
충돌은 [CONTEXT_AUDIT](docs/CONTEXT_AUDIT.md)에 기록한다. 현재 상태는 [CURRENT_DEV_BASELINE](docs/CURRENT_DEV_BASELINE.md).

## 2026-09-12 전달 흐름: main 직접 커밋, 브랜치·PR 없음

기본 흐름은 `main`에서 코드 수정→targeted 검사(check:fast)→commit→(안정 시점에) push→main CI 통과 확인에서 끝난다. 브랜치도 PR도 만들지 않는다. 유일한 공식 검증 게이트는 GitHub CI(`CI required` aggregate)이며, push 전에 전체 lint/typecheck/test/build를 로컬에서 반복하지 않는다. 이 절은 이전의 PR·연속 머지·입장 판정(delivery:admit / delivery:batch-plan) 조항을 **폐기**한다.

커밋은 복구 지점, push는 원격 백업 겸 배포 지점이다. 로컬 마이크로 커밋은 자주, push는 작업 단위가 안정됐을 때 묶어서 한다. 서로 무관한 변경을 한 커밋에 섞지 않는다 — 기준은 "이 커밋 하나를 되돌려도 다른 기능이 거의 흔들리지 않는가"다. 커밋 시점의 main은 항상 실행 가능해야 한다. 회귀가 나면 조건·try/catch·CSS 오버라이드를 덧대지 말고 되돌린다: 미커밋은 `git reset --hard HEAD`, 나쁜 커밋은 그 커밋만. 이미 커밋된 다른 정상 작업까지 날리지 않는다. 되돌린 뒤에는 같은 구조로 재시도하지 않고 실패 원인·회귀 영역·새 접근을 보고한 다음 다르게 구현한다.

룰셋 `main-protection`은 `deletion`·`non_fast_forward`를 유지한다. main이 유일한 복구 지점이므로 브랜치 삭제와 force-push 차단이 더 중요하다. 롤백은 `git revert`로 하며 force-push가 필요 없다.

스테이징은 main push마다 비동기로 배포된다. 스테이징 검증(`npm run verify:staging -- --sha=<40자리 SHA>`)은 사용자 요청, 배포 인프라 변경, 운영 릴리스 전(`npm run verify:release`), 대형 결제·로그인 변경 후, 라우팅 변경 후, 스테이징 전용 버그 조사 때만 한다. 운영 승격은 별도 1회 승인 때만 수행한다.

Do not wait for or manually verify staging deployment after every push. Once CI passes, continue to the next task. Verify staging only when explicitly requested, when deployment infrastructure changed, or during a final release verification.
Do not poll staging URLs, deployment status, commit SHA, or freshness markers after routine pushes.
