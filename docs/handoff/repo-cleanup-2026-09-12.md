---
status: active
updated: 2026-09-12
next: 3) CI 최적화 — Playwright 브라우저 캐시부터 착수한다
---

# 레포 정리 (쓰레기 수거) 후속

## 왜

레포에 쌓인 죽은 파일·완료 핸드오프·중복 산출물을 줄여 탐색·CI 비용을 낮춘다. PR-2(쓰레기 1차, 브랜치 `chore/repo-cleanup-batch1`)에서 3면 grep 감사를 통과한 것만 지웠다.

## 지금 상태

- PR-2(#1933, 머지됨): 죽은 루트 파일·목업 캡처·미참조 자산·완료 핸드오프 20개 삭제 + 참조 문장 정정.
- PR-3(#1936, 머지됨): 미사용 의존성 3개 제거, 규칙 4 예외는 `docs/CONTEXT_AUDIT.md` 2026-09-12 절에 기록.
- PR-4(브랜치 `chore/repo-cleanup-batch2`): 보류 삭제 5건 처리. 머지는 사용자.
- 규약: `docs/AI_HANDOFF.md` (완료 핸드오프는 삭제, 목록은 git grep).

## 남은 작업

- [x] 1) PR-3 의존성 제거 완료. `scripts/test-resend-email.mjs` 는 `worker/lib/resend.js` 를 쓰므로 그대로 둔다.
- [x] 2) 보류 삭제 5건 완료(PR-4). `AUDIT.md` 는 사용자 확인 결과 **결제 원장이 아니다** — 가격·결제 정본은 `worker/lib/paid-feature-registry.js`·`worker/payments/passes.js`·`docs/payment-policy-*` 3부작이고, `AUDIT.md` 는 2026-07-22 시점 실사 스냅샷이라 삭제했다. `docs/design/past-life-webtoon/` 은 `assets/provenance.md` 만 남겼다(배포 중인 `fuctionassets/past-life-webtoon/` 자산의 생성 출처).
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
