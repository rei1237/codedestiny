---
status: blocked
updated: 2026-11-04
next: 최신 main PR CI 완료와 main 체크아웃 정리를 확인한 뒤 오가닉 마케팅 커밋을 전달
---

# WordPress 운세 신문 오가닉 재유통 인수인계

## 보존 상태

- 작업 디렉터리: `D:\Development\code-destiny\.codex-worktrees\organic-marketing-20261104-180112`
- 구현 커밋: `09f8d3329582b2b23ae2e9078fa4b2756b5be212`
- push: 보류. 최신 `origin/main` `6eec763f087fe84502e4db22e04047d86c12ba21`의 PR CI가 실행 중이다: https://github.com/rei1237/codedestiny/actions/runs/41815536887
- 이전 CI 실패는 `__tests__/ui/home-overseas-runtime.test.mjs`가 흑월 웹툰 한국어 문구의 해외 로케일 잔존을 감지한 건이었다. 이 작업의 WordPress·인사이트 변경과 무관하다.
- `main` 체크아웃은 `e6aa5a287322ebfe98edf792af15ff969dcf2cf9`에 머물러 있고, 상담 접근·꿀 지갑 관련 8개 파일에 다른 세션의 미커밋 변경이 있어 clean하지 않다. 해당 변경은 건드리지 않았다.

## 완료한 작업

- WordPress 공개 API의 발행물 5편을 로컬 레지스트리로 동기화했다.
- `/insights/`에 최신 운세 신문 3편, 전체 신문, RSS 진입점을 서버 렌더링으로 추가했다.
- `/admin/wordpress/`가 하드코딩된 원고 대신 공개 발행물과 기존 초안 상태 파일을 보여주도록 바꿨다.
- 서비스 역링크, 최신순, 공개 URL, 본문 길이를 검증하는 스크립트와 테스트를 추가했다.
- `/insights/` 변경에 맞춰 사이트맵 추적본을 갱신했다.

## 검증 상태

- 통과: 변경 파일 ESLint, `npm run typecheck`, `npm run verify:wordpress-publications`, WordPress 레지스트리 Node 테스트 2개, `npm run verify:sitemap-drift`.
- 통과: 로컬 `/insights/` HTTP 200 및 실제 브라우저에서 최신 글 3편·신문 전체보기·RSS 링크 렌더링 확인.
- `npm run check:fast`: 유료 게이트 묶음에서 장시간 정지하여 중단했다. 이후 관련 검사를 개별 실행했다.
- `npm run test:node`: 기존 저장소 실패 여러 건과 로컬 mock 소켓 제한을 확인한 뒤 중단했다. 새 WordPress 테스트는 단독 통과했다.
- `npm run check:pre-push`: 현재 `origin/main` 자체의 공개 미러 8개 stale 상태로 실패한다. 본 커밋은 해당 미러 소스를 변경하지 않았다.

## 재개 명령

`D:\Development\code-destiny\.codex-worktrees\organic-marketing-20261104-180112`에서 이 문서를 읽고, 작업 트리가 clean한지와 구현 커밋 `09f8d3329582b2b23ae2e9078fa4b2756b5be212`를 확인한다. 먼저 `origin/main`의 PR CI가 초록인지와 `main` 체크아웃의 다른 세션 변경이 정리됐는지 확인한다. 둘 다 안전하면 최신 `origin/main` 위로 재배치한 뒤 `npm run check:pre-push`를 통과시켜 `main`에 push한다. 전달 후 워크트리와 `wt/organic-marketing-20261104-180112` 브랜치를 정리한다.
