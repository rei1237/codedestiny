---
status: active
updated: 2026-09-12
next: PR-3 — 미사용 의존성 resend·recharts·@tiptap/extension-link 를 npm uninstall 로 제거하고 규칙 4 예외를 CONTEXT_AUDIT 에 기록한다
---

# 레포 정리 (쓰레기 수거) 후속

## 왜

레포에 쌓인 죽은 파일·완료 핸드오프·중복 산출물을 줄여 탐색·CI 비용을 낮춘다. PR-2(쓰레기 1차, 브랜치 `chore/repo-cleanup-batch1`)에서 3면 grep 감사를 통과한 것만 지웠다.

## 지금 상태

- PR-2: 죽은 루트 파일·목업 캡처·미참조 자산·완료 핸드오프 20개 삭제 + 참조 문장 정정. 머지는 사용자.
- 규약: `docs/AI_HANDOFF.md` (완료 핸드오프는 삭제, 목록은 git grep).

## 남은 작업

- [ ] 1) PR-3 의존성: `resend`·`recharts`·`@tiptap/extension-link` 를 `npm uninstall` 로 제거(lock 은 npm 이 재생성, 손편집 금지). CLAUDE.md 규칙 4 예외를 `docs/CONTEXT_AUDIT.md` 에 기록. `scripts/test-resend-email.mjs` 처리 먼저 확인. 판정: `git grep` 으로 세 패키지 import 0 + `npm run check:fast` 통과.
- [ ] 2) 보류 삭제 5건: `PROJECT_STRUCTURE.md`·`PAYMENT_CONCURRENCY_AUDIT.md`(`docs/CONTEXT_AUDIT.md:138,140` 과 `scripts/lib/doc-refs.mjs:27,29` 함께 수정), `docs/handoff/session-pr-stacking-2026-09-08.md`(done), `AUDIT.md`(아직 결제 원장인지 사용자에게 확인), `docs/design/past-life-webtoon/` 목업 세트 전체.
- [ ] 3) CI 최적화: Playwright 브라우저 캐시, paid-flow-gates jest 중복 제거, 스테이징 checks() 생략·blob-less checkout, main-drift-watchdog 제거, 매시 크론 축소, preflight 경량화, ai-locale-gate paths 필터.
- [ ] 4) 미러·sitemap·cachebust 커밋 요동 재설계, CSS·자산·로케일 중복 제거, 배포·SEO 체크리스트 통합, 루트 생성 보고서를 `reports/` 로 이동.
- [ ] 5) 룰셋 20666260의 required check 제거는 사용자 의도 — 머지 가능 보고 전 PR 체크 전체 통과를 확인한다(delivery:admit 이 전체 체크를 본다, PR #1932).
- [ ] 6) 범위 밖 발견: `app/_lib/fortune/ganjiGuardianSprite.ts:101-102` 가 레포에 없는 `/fuctionassets/60갑자.webp` 를 가리킨다. R2/CDN 에 있는지 확인(보고만, 미수정).
- [ ] 7) 로컬 정리: 머지되고 clean 한 워크트리·브랜치 제거. 스쿼시 머지라 is-ancestor 로는 판정이 안 되므로 `gh pr list --state merged --json headRefName,headRefOid` 로 판정.

## 함정

- 공개 미러(`public/_headers`·`public/js/README.md` 등)는 손편집하지 않고 `npm run sync:public` 으로 만든다.
- 다른 열린 PR 이 `CLAUDE.md`·`docs/CONTEXT_AUDIT.md`·`package.json`·`.github/workflows/**` 를 고친다. 그 PR 머지 뒤에 2)·3)을 한다.

## 검증

```
npm run verify:doc-freshness
npm run verify:handoff-contract
npm run check:fast
npm run ci:preflight
```
