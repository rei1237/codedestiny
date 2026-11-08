---
status: active
updated: 2026-11-08
next: "2단계 후속: main PR CI Static guards 실패(verify:saju-summary-browser, 홈 무료 사주 카드 not visible)를 고쳐 push → CI 통과 확인 → 3단계 운영 승격 → 4단계 Play → 5단계 정리"
---

# 오늘·내일 운세 웹툰 마무리와 세 브랜치 운영·Play 배포

## 첫 행동
1. 이 워크트리에서 시작한다: `D:\Development\codedestiny-worktrees\daily-webtoon-20261108-062127` (브랜치 `wt/daily-webtoon-20261108-062127`, 마지막 커밋 `b1eed6a64` 뒤에 이 문서 커밋).
2. `git fetch origin`. 그다음 1단계(네오 대사)부터 진행한다.

## 승인 상태 (다시 묻지 않는다)
- 2026-11-08 사용자 원문: "다음을 점 다음어주고 날짜별 보관은 필요없을것 같고 운영 배포 후 play 배포 절차 진행해줘"
  - "다듬을 점 다듬어 주고" = 아래 1단계(네오 대사).
  - 날짜별 보관 페이지(`/fortune/date/...`)에는 웹툰을 넣지 않는다. 범위에서 뺀다.
  - **운영 승격 1회 승인**: 세 브랜치(아래 표)를 main에 올린 뒤 프로덕션 승격까지 한다.
  - **Play 배포 절차 진행 승인**: 운영 반영 뒤 Android 릴리스 빌드와 Play 업로드를 한다. 트랙은 android 인수인계 문서가 정한 내부 테스트 트랙이다. 프로덕션 트랙 출시처럼 문서에 없는 단계는 사용자에게 한 번 확인한다.

## 지금 상태
| 브랜치 | 워크트리 | origin/main 대비 | 인수인계 문서 |
|---|---|---|---|
| `wt/legacy-cleanup-20261108-034220` | `D:\Development\codedestiny-worktrees\legacy-cleanup-20261108-034220` | ahead 10, behind 8 | 그 워크트리 `docs/handoff/legacy-cleanup-2026-11-08.md` |
| `wt/daily-webtoon-20261108-062127` | 이 워크트리 | ahead 2(+이 문서), behind 2 | 이 문서. 설계: `docs/superpowers/specs/2026-11-08-daily-fortune-webtoon-design.md` |
| `wt/android-size-widget-20261107-021350` | `D:\Development\codedestiny-worktrees\android-size-widget-20261107-021350` | ahead 36, behind 318 | 그 워크트리 `docs/handoff/android-size-widget-2026-11-07.md` (next: final6 빌드 뒤 히어로 이미지 재확인 → push·내부 테스트 트랙) |

- daily-webtoon 검증(b1eed6a64): check-changed(`--base=c1bd4d09f --committed-head`, `ALLOW_DEV_SERVER_DURING_BUILD=1`)가 exit 0이었다. node 테스트, 사이트맵, 구조화 데이터, AdSense, i18n, verify-dist 모두 통과.

## 작업 규칙과 함정
- Bash는 호출마다 cwd가 `C:\Users\user`로 돌아간다. 매번 `cd <워크트리> && ...`로 실행한다.
- Python이 없다. 파일 수정은 Edit 도구나 sed를 쓴다.
- check-changed는 10분을 넘는다. `run_in_background`로 돌리고 로그를 scratchpad에 남긴다.
- **사이트맵 원장**: 운세 뷰처럼 라우트 소스를 바꾸면 `config/sitemap-lastmod.json`의 서명이 바뀐다. `npm run sitemap:generate`로 다시 만든 원장과 사이트맵(루트·public)을 **같은 커밋에 넣는다**. 되돌려 두면 `__tests__/release/sitemap-volatile-lastmod-kst.test.js`의 주간 lastmod 단언이 실패한다(2026-11-08 실측).
- node:test 파일(`.test.mjs`)은 `scripts/lib/mock-test-config.mjs`의 NODE_TEST_PATTERNS에 등록하고 `jest.config.cjs` testPathIgnorePatterns에서 뺀다.
- 공유 main push 규칙: 루트 체크아웃 `D:\Development\code-destiny`의 로컬 main에는 다른 세션의 미push 커밋이 있을 수 있다. 로컬 main을 push하지 않는다. D:에 `git worktree add --detach <경로> origin/main`을 만들고 node_modules를 junction으로 연결한다. 내 브랜치 커밋만 올리고 `git push origin HEAD:main`(fast-forward)으로 보낸다. 끝나면 `cmd /c rmdir`로 junction만 푼다.
- 워크트리 제거는 `npm run worktree:remove`만 쓴다.
- 웹툰 그림은 생성하지 않는다(2026-11-07 뒤 웹툰 컷은 사용자 제작).
- 실제 앱 `com.codedestiny.app`은 기기에서 건드리지 않는다. 실기기 확인은 benchmark 패키지로만 한다.
- `.env*`, `package-lock.json`, `ads.txt`는 수정하지 않는다.

## 단계

### 1. 네오 대사 다듬기 (`lib/fortune/daily-webtoon.ts`의 `sajuLine`)
지금 출력(돼지띠, 2026-11-08): `오늘 일진은 丙戌. 돼지띠 쪽에서 보면 「일진 술(戌)」. 크게 당기지도 밀지도 않는 날이야. 준비한 순서가 하루를 정해. 천간 쪽은 화(丙) → 수 · 재성 — 내가 다루는 기운.`

문제와 고칠 방향:
- [x] **일진이 한자만 나온다.** 천간 10자·지지 12자의 한글 독음 표를 두고 `병술(丙戌)일`로 쓴다. 별자리 쪽 대사도 같은 함수를 쓴다.
- [x] **배지를 그대로 읽는다.** `relation.badge`를 낭독하지 말고 `relation.kind`별 자연어로 바꾼다.
  - neutral: `술(戌)의 날이라 돼지띠와는 합도 충도 아니야.`
  - clash: badge의 `· ` 뒤 글자를 써서 `돼지띠와 정면으로 부딪히는 사해충(巳亥沖)이 든 날이야.` (한자는 BRANCH 표에 있으면)
  - trine: `돼지띠와 ○○ 삼합 그룹으로 이어지는 날이야.`
  - same: `돼지띠와 같은 지지가 겹치는 비화(比和)의 날이야.`
  - 그 뒤에 기존 `NEO_KIND_LINE`을 붙인다. neutral 문구가 "외부 변수가 적다"고 예측하지 않게 둔다(`day-relation.ts` neutral detail의 단서 참고).
- [x] **근거가 표 문자열 그대로다.** `basis`의 "오행 생극" 값(`화(丙) → 수 · 재성 — 내가 다루는 기운`)을 정규식 `^(.)\((.)\)\s*→\s*(.)\s*·\s*([^—]+?)\s*—\s*(.+)$`로 풀어 `천간 병(丙)은 화(火)라, 수(水)인 돼지띠에겐 재성, 곧 내가 다루는 기운이야.`로 쓴다. 형식이 다르면 지금처럼 원문을 쓴다.
- [x] `__tests__/fortune/daily-webtoon.test.mjs`에 단언을 더한다: 네오 대사에 한글 독음 일진이 들어가고, `「`나 `→`가 들어가지 않는다. 띠 12종과 30일을 돌려 확인한다.
- [x] `node --test __tests__/fortune/daily-webtoon.test.mjs` 통과 → `npm run sitemap:generate`(원장 서명) → 커밋.

### 2. 세 브랜치를 origin/main에 올리기
- [x] 위 공유 main 규칙대로 origin/main 기준 분리 워크트리를 만든다.
- [x] 순서: legacy-cleanup → daily-webtoon → android-size-widget. 각 브랜치는 merge-base 이후 자기 커밋만 cherry-pick한다(`git log --reverse --format=%h origin/main..<브랜치>`; 병합 커밋은 건너뛴다).
- [x] 충돌 처리: 사이트맵 원장과 사이트맵 XML은 origin 판을 받고 마지막에 `npm run sitemap:generate` 한 번. 공개 미러와 캐시 키는 `npm run sync:public`으로 다시 만든다. 그 밖의 충돌은 양쪽 의도를 읽고 합친다. 결제·인증 파일에서 충돌이 나면 멈추고 보고한다.
- [x] android 브랜치는 behind 318이라 충돌이 가장 많다. `scripts/build-mobile-app.mjs`와 모바일 가드 테스트(`__tests__/release/mobile-app-size-scope.test.js`)를 특히 본다. legacy-cleanup이 지운 파일을 android 쪽이 참조하면 남긴다.
- [x] 검증: `ALLOW_DEV_SERVER_DURING_BUILD=1 node scripts/check-changed.mjs --base=origin/main --committed-head`(백그라운드)와 `npm run check:pre-push`.
- [x] `git push origin HEAD:main`. 그 뒤 main CI 결과를 한 번만 확인한다(폴링 금지). 다른 사람 커밋으로 main이 이미 빨갛다면 그 커밋을 보고한다.

### 3. 운영 승격 (승인됨, 1회)
- [x] main CI 통과를 확인한다. 운영 릴리스 전 검증으로 `npm run verify:release`를 한다(CLAUDE.md 92행).
- [x] `gh workflow run "Release Cloudflare Pages and Worker" --ref main -f mode=production`
- [x] 그 실행 하나의 결과를 확인한다(`gh run watch <id>` 한 번). 릴리스 잡이 스모크, SHA 대조, 실패 시 자동 롤백을 맡는다.
- [x] 운영에서 `/fortune/today/pig/`와 `/fortune/tomorrow/aries/`를 열어 웹툰 7컷과 대사를 확인한다. legacy-cleanup 301 매핑표(`docs/seo/2026-11-08-legacy-cleanup-redirects.md`)에서 몇 개를 골라 301 한 번에 200이 나오는지 본다.
- 롤백: Actions → *Release Cloudflare Pages and Worker* → `mode: rollback`(`npm run deploy:rollback -- --list`로 대상 확인).

### 4. Play 배포 절차 (승인됨)
- [ ] android 인수인계 문서의 next를 따른다: main HEAD에서 final6 릴리스 빌드(`build-android.ps1 -Out D:\Development\code-destiny\output\android-size-widget-20261107\final6`), VERSION_CODE는 Play에 올린 마지막 값보다 크게 한다.
- [ ] benchmark APK로 실기기 확인: `/oracle/hwatu-life/`, `/tarot/love/` 히어로 이미지, 홈 첫 줄 7개, 위젯 진입 버튼, 깨진 이미지 0, 오늘의 운세 웹툰.
- [ ] 문서에 적힌 업로드 방식으로 내부 테스트 트랙에 AAB를 올린다. 업로드 수단(API 키나 Play Console 로그인)이 없으면 AAB 경로와 출시 노트 초안을 사용자에게 넘긴다.
- [ ] 스토어 스크린샷과 홍보 이미지는 사용자가 만든다. 손대지 않는다.

### 5. 마무리
- [ ] 이 문서와 android, legacy-cleanup 문서에 결과(SHA, 운영 run id, AAB 크기와 VERSION_CODE)를 적고 `status: done`.
- [ ] 병합이 끝난 워크트리 세 개는 `npm run worktree:remove`로 정리한다. 미병합 커밋이 남았으면 남긴다.
- [ ] 사용자에게 한국어로 보고: 운영 반영 내용, 301 확인, Play 업로드 결과, 남은 위험.

## 결과 기록
- 1단계: 네오 대사 커밋 `efd5a0d4b`(main에서는 rebase 뒤 새 SHA). check:fast exit 0(node 4655, Jest 7705).
- 2단계: 병합 워크트리 `D:\Development\codedestiny-worktrees\release-merge-20261108`에서 legacy 10 + webtoon 4 + android 34(사이트맵 전용 d9138b654·12c8e67ec는 빈 커밋이라 건너뜀) cherry-pick, 공개 미러·사이트맵 재생성. 충돌은 사이트맵 원장뿐(origin 판 → 재생성).
  - 🔴 1차 check-changed 실패 2건, 둘 다 병합 뒤 테스트 문제: ① android 손님 세션 테스트가 legacy가 이름을 바꾼 `_original` 경로를 읽음 ② 일일 타로 브라우저 테스트가 `process is not defined`(android `IS_APP_BUILD`가 esbuild 번들에서 process.env를 읽음, android 브랜치 단독에서도 실패). 테스트만 고쳤다.
  - 2차 check-changed exit 0(node fail 0, Jest 7700, 빌드·verify-dist·AdSense), check:pre-push 6종 통과.
  - push 직전 origin/main에 toss 커밋 4개(6d93669df까지)가 들어와 rebase, toss 테스트 10/10·pre-push 재통과 뒤 `git push origin HEAD:main` → **`6d93669df..70eaf737b`**.
  - 문서 결과 커밋 `661109b06`(병합 워크트리, 아직 push 안 함).
  - `npm run verify:release`(=deploy:critical) exit 0 (70eaf737b 기준).
  - main CI(70eaf737b): 나머지 워크플로는 전부 success, **PR CI run 42427325565만 failure**.
    - 실패 잡은 Static guards의 "Run the static UI guards the release runs" 단계다. `npm run verify:saju-summary-browser`(scripts/verify-saju-summary-browser.mjs:129)에서 `locator('#cdQuickServices a[data-action="cdOneStepFreeSajuEntry"]').click` 15초 타임아웃: 요소는 찾았지만 **element is not visible**. 진단 출력 `case: mobile-restored`, `SUMMARY DOM: null`. 그 결과 "CI required"도 실패(lane skipped).
    - 바로 앞 main 커밋 6d93669df의 PR CI는 success였다. 따라서 **세 브랜치 병합이 깨뜨린 것**으로 본다. 홈 첫 줄 레이아웃을 바꾼 android-size-widget 쪽(홈 첫 줄 7개 등)이나 legacy-cleanup의 `_home` 이동이 의심된다. 가리는 요소는 아직 확인하지 않았다.
    - 실패 로그 사본: `D:\Development\Temp\claude\ec29f026d20d029c\ccecc842-2a09-4af6-b3e9-689ca5d1e944\scratchpad\prci.log`(8342행 부근).
  - **이 실패를 고치고 main PR CI가 초록이 될 때까지 3단계(운영 승격)는 하지 않는다.** 고칠 때는 검증 스크립트를 느슨하게 만들지 말고, 모바일에서 무료 사주 카드가 실제로 보이게 제품 쪽을 고친다. 카드를 의도적으로 숨겼다면 숨긴 쪽의 의도를 읽고 판단한다.

  - **원인 확인·수정(e6d966fb4)**: 가리는 요소는 `styles/yehwa-home.css`의 `@media(max-width:699px){#cdHomeFunnel :is(.cdh-free,.cdh-all-cta){display:none}}`다. android 브랜치 6e44d94eb·d6924ef65가 모바일 첫 줄에 일곱 입구(.yh-entries, 사주 포함 같은 `data-action="cdOneStepFreeSajuEntry"`)를 두고 중복인 '무료로 먼저' 격자를 **일부러** 숨겼다(사용자 요청 작업). 제품을 되돌리지 않고, 검사 4개(saju-summary-browser·saju-result-login·relationship-inline-browser·fortune-consultation-ux)가 같은 action의 입구 중 **화면에 보이는 쪽**을 누르게 했다. 데스크톱은 그대로 #cdQuickServices 카드. 로컬에서 saju-summary-browser·saju-result-login 통과, check:fast exit 0(Jest 7700).
    - 별건(CI 밖, 손대지 않음): `verify-relationship-inline-browser`는 3107 포트 외부 서버가 있어야 돈다. `verify-fortune-consultation-ux`는 입구 클릭 뒤 99행(`#letterContent .saju-letter` readingMode 대기)에서 타임아웃 — 입구 변경과 무관.

  - push `70eaf737b..cc1ae9598` 뒤 PR CI 42431515558도 실패: 이번엔 Static guards 첫 단계 `verify:handoff-contract`(허용 status는 active|blocked|done, 전역 규칙의 `in-progress`는 이 저장소에서 쓰면 안 됨) — 이 문서·android 문서 `status: active`, legacy 문서에 프론트매터 추가. 같은 잡의 나머지 가드 124개를 로컬에서 전부 돌려 `verify:mobile-entry-actions` 실패 1건(`/tadagochi` 삭제, 301은 `public/_worker.js`라 가드가 못 봄)을 더 찾아 `docs/design/mobile-feature-registry.md` 입구를 `/ggulggul/#dpMasterCard`로 고쳤다.

  - push `cc1ae9598..1a9f0fb18` → PR CI **42435934902 success**(CI required success).
- 3단계: 운영 릴리스 run **42437586072 success**(release 잡, Pages·Worker SHA 모두 1a9f0fb18d02). verify:release는 70eaf737b 기준 exit 0, 이후 변경은 테스트·문서뿐.
  - 운영 `/fortune/today/pig/`·`/fortune/tomorrow/aries/` 200, 웹툰 7컷, 컷 이미지 7장 200, 네오 대사 `일진은 병술(丙戌)일이야`·`정해(丁亥)일이야`.
  - 301 확인 10건 모두 301 한 번 → 200: /fpti, /saju-picture, /famous/, /fortune/sikojen-povailu, /dev-status, /tadagochi(.html), /static/geomancy-oracle-v4.html, /fortune-tea-house/tarot-debug, /sukyo/relationship-encyclopedia.
- 4단계: 병합 워크트리(1a9f0fb18)에서 VERSION_CODE 58 빌드. 스크립트 `D:\Development\Temp\claude\ec29f026d20d029c\ccecc842-2a09-4af6-b3e9-689ca5d1e944\scratchpad\build-android-58.ps1`(서명 설정 `release-signing.properties`를 android 워크트리에서 복사, git 무시 파일). 출력 `D:\Development\code-destiny\output\android-size-widget-20261107\final6`.

## 이어받는 쪽 첫 행동 (2026-11-08 갱신)
1. 병합 워크트리 `D:\Development\codedestiny-worktrees\release-merge-20261108`(detached, node_modules junction)에서 `git fetch origin`. origin/main이 앞서 있으면 rebase한다.
2. 로컬에서 `npm run build` 뒤 `npm run verify:saju-summary-browser`로 재현한다. 원인을 고치고 check:fast → 커밋. 이 문서 커밋 포함 `git push origin HEAD:main`. PR CI 결과를 한 번만 확인한다.
3. 3단계부터 진행한다(승인됨).
4. 4단계 빌드 메모:
   - 이전 세션 스크립트는 `D:\Development\Temp\claude\ec29f026d20d029c\b796b1ab-c87d-4804-ae0a-3651ac10cc40\scratchpad\build-android.ps1`(`-Out`, `-W <워크트리>`)이다. VERSION_CODE가 57로 하드코딩돼 있으니 **58**로 바꿔 쓴다. 57은 빌드만 했고 업로드하지 않았다.
   - 빌드 순서는 `mobile:android:sync` → bundleRelease → `prepare-benchmark.mjs`(에셋을 바꾼다) → assembleBenchmark(`D:\Development\code-destiny\output\android-latest-candidate-20261101-214248\benchmark.init.gradle`)이다. 약 1시간 걸리니 백그라운드로 돌린다.
   - Play API 서비스 계정(`GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`)이 없다. 업로드는 Play Console 브라우저 로그인으로 하고, 그게 안 되면 AAB 경로와 출시 노트 초안을 사용자에게 넘긴다.
