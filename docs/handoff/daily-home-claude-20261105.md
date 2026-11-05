---
status: blocked
updated: 2026-11-06
next: 최신 main의 CI required가 초록인지 확인하고, 초록이면 main 재병합 뒤 check:pre-push, verify:handoff-contract, verify:sitemap-drift를 거쳐 push한다
---

# 오늘의 숲길(연이 게임형 다이어리) 전달

과거 경과는 같은 폴더의 `daily-home-20261104.md`에 있다. 어긋나면 이 문서를 따른다.

## 왜

공개 홈에서 연이와 영냥이가 숲으로 안내하듯 출석·꿀방울·프로필 카드 미션·다이어리를 잇는다. 사용자는 병합, push, 배포 결과 확인을 승인했다. 운영 승격은 미승격 커밋이 함께 나가므로 그 시점의 목록을 보여 주고 다시 승인받는다.

## 지금 상태

- 작업 트리 `D:\Development\code-destiny\.codex-worktrees\daily-home-20261104-040025`, 브랜치 `wt/daily-home-20261104-040025`. 구현과 리뷰 수정을 끝내 커밋했고 main에는 미반영이다. 설계는 `docs/superpowers/specs/2026-11-05-forest-daily-walk-design.md`.
- 작업 트리에는 main `ab85ab02c`까지 병합했다(병합 커밋 `669bb76f5`). 홈 순서는 질문 안내, 타로 카드, 숲 입구, 달빛 서가다. push와 배포는 아직 하지 않았다.
- 2026-11-06 01:50 기준 main 최신 `ab85ab02c`의 CI required 실패(run 42063947048). Static guards의 `scripts/verify-detail-first-entry.mjs:62`가 `#cdSigGrid`의 웹툰 링크 6개를 기대하는데 0개다. `index.html`의 `cd-story-entry__link`는 `17c48ec73`까지 6개, `28b2c0b44`부터 0개이므로 그 커밋이 원인이다. 숲길과 무관하다. 빨간불 위에는 push하지 않는다.
- 62줄 단언만 뺀 임시 사본은 현재 트리에서 통과했다. 다만 CI는 이 실패에서 멈춰 Static guards의 뒤 단계는 `ab85ab02c`에서 돌지 않았다.
- `28b2c0b44`를 낸 `wt/entry-webtoons-20261106-004430` 워크트리는 이미 정리되어, 누가 고치고 있는지 확인되지 않았다.
- automation-4는 사용자가 껐다. 옆 세션 미커밋 8개는 사용자 결정으로 대기 조건에서 뺐고, 건드리지 않는다.

## 남은 작업

- [ ] main CI required 초록 확인 → 재병합 → `check:pre-push`, `verify:handoff-contract`, `verify:sitemap-drift` → `git push origin HEAD:main` → main CI 1회 확인
- [ ] 스테이징 화면 확인 → 미승격 커밋 목록을 보여 주고 운영 승격 승인 받기 → 승격 → `verify:deployed-sha`
- [ ] 두 인수인계 문서 `status: done`, `npm run worktree:remove`로 작업 트리 정리

## 함정

- 이 PC는 `core.autocrlf=true`라 작업 트리가 CRLF로 풀려 해시·생성물 비교 테스트가 로컬에서만 실패한다. 공유 git 설정은 바꾸지 않는다. `git ls-files --eol`에서 `i/lf w/crlf`인 파일만 LF로 바꾼 뒤 `sync:public`을 돌려야 CI와 같은 해시가 나온다.
- `check:fast`는 커밋 뒤 실행하면 "변경 없음"으로 끝난다. `--base=<origin/main SHA>`를 준다.
- `verify:handoff-contract`는 CI의 Static guards에서만 돌고 `check:pre-push`로는 잡히지 않는다.
- 병합 시 생성된 정책 HTML이 충돌하면 `sync:public`으로 다시 만든다.

## 검증

병합 전: 브라우저 mock 전체 폭 51건, 경계 상황 35건. `669bb76f5` 기준: `check:fast`(Jest 455 스위트 7,634건), `check:pre-push`, `verify:handoff-contract`, `verify:sitemap-drift` 통과. 병합본 mock 화면 점검 32건(360·390·430·1280px, 순서, 가로 넘침, LCP, 숲길 열기, 뒤로가기) 통과. 실결제·운영 DB 쓰기·과금 LLM 호출 없음. 실제 단말기 터치와 키보드는 미검증(모바일 에뮬레이션만, 사용자 선택).

main 변경으로 낡은 수동 검증기 2개는 숲길과 무관하며 고치지 않았다. CI에 연결되어 있지 않다.

- `scripts/design/verify-home-entry-locale.cjs`: 웹 홈의 옛 제목을 기대한다. 그 단언만 뺀 사본은 통과했다.
- `scripts/verify-home-question-guide.mjs:57`: 추천 결과의 "네오의 팩폭 전략실" 제목이 달빛 서가 제목과 겹쳐 2개가 잡히며 실패한다. 같은 흐름을 따로 재현하면 추천 결과는 정상이다.

```
npm run check:pre-push
npm run verify:handoff-contract
npm run verify:sitemap-drift
```

## 모르는 것

없음.
