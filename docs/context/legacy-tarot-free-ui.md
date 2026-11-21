# 레거시 타로·무료 UI 정리 기록 (7단계)

원문은 `_graveyard/` 격리였지만 사용자 2026-11-20 "죽은 코드는 지우도록해" 에 따라 **삭제**한다. 승인(2026-11-21, 질문 대화): "/tarot/mingri/play 페이지 (추천)" 만.

| 삭제 | 대체 | 3면 확인 | 롤백 |
|---|---|---|---|
| `app/tarot/mingri/play/page.tsx`(noindex, `redirect("/tarot/mingri")` 만 하던 페이지) | 워커 301 `/tarot/mingri/play` → `/tarot/mingri/`(`public/_worker.js` `CONSOLIDATED_PAGE_REDIRECTS`, 유지) | 소스 링크 0, `__tests__` 는 `consolidated-pages.test.mjs` 의 `PENDING_PAGE_DELETION` 예외뿐(함께 제거), `scripts/verify-*` 0, sitemap 미포함(재생성 diff 0). 생성 스냅샷 문서(inventory·PAGE_INVENTORY)에만 행이 남음 | `git revert d63a7df65` |

유지(미승인, 롤백 경로): `FreePromoBanner` 칩 마크업·`.chips` CSS(D1), 각 흐름의 플래그 끔 경로 원본 컴포넌트. QA 요약: [free-tarot-ux-qa](free-tarot-ux-qa.md).
