---
status: blocked
updated: 2026-11-05
next: 최신 main의 CI required가 초록인지 확인하고, 초록이면 main 재병합 뒤 check:pre-push와 verify:handoff-contract를 거쳐 push한다
---

# 오늘의 숲길(연이 게임형 다이어리) 전달

과거 경과는 같은 폴더의 `daily-home-20261104.md`에 있다. 어긋나면 이 문서를 따른다.

## 왜

공개 홈에서 연이와 영냥이가 숲으로 안내하듯 출석·꿀방울·프로필 카드 미션·다이어리를 잇는다. 사용자는 병합, push, 배포 결과 확인을 승인했다. 운영 승격은 미승격 커밋이 함께 나가므로 그 시점의 목록을 보여 주고 다시 승인받는다.

## 지금 상태

- 작업 트리 `D:\Development\code-destiny\.codex-worktrees\daily-home-20261104-040025`, 브랜치 `wt/daily-home-20261104-040025`. 구현과 리뷰 수정을 끝내 커밋했고 main에는 미반영이다. 설계는 `docs/superpowers/specs/2026-11-05-forest-daily-walk-design.md`.
- 2026-11-05 20:50 기준 main `f4591634f`까지 병합했다. 직전 두 실패(`214200dbc` 프론트매터 누락, `58d4e8bfa` 문서 전용 push에서 png를 받지 않아 난 `verify:doc-freshness` 거짓 실패)는 다른 세션이 고쳐 push했다. `f4591634f`의 CI required가 초록인지 확인한 뒤 push한다. 빨간불 위에는 push하지 않는다.
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

브라우저 mock 전체 폭 51건, 경계 상황 35건, `verify-home-entry-locale` 13건, `check:fast`(Jest 450 스위트 7,525건), 병합 트리 `check:pre-push` 통과. 실결제·운영 DB 쓰기·과금 LLM 호출 없음. 실제 단말기 터치와 키보드는 미검증(모바일 에뮬레이션만, 사용자 선택).

```
npm run check:pre-push
npm run verify:handoff-contract
npm run verify:sitemap-drift
```

## 모르는 것

없음.
