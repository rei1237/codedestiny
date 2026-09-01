---
status: done
updated: 2026-09-02
next: 없음 — 스윕 종료. 다음에 `npm run audit:files` 를 돌리는 사람은 아래 「후보 목록을 어떻게 읽나」 부터 읽는다
---

# unusedCandidates 스윕 — 후보 목록은 삭제 목록이 아니다

## 결론

**스윕 종료. 더 지울 것이 없다.**

| 단계 | 결과 |
|---|---|
| 1차 스윕 (PR #1427) | 실참조 0 확인된 소스 15개 + 미러 4개 삭제 |
| 감사기 수정 (PR #1432) | 위양성 축 3종 제거 → 후보 **1,012 → 162건**, 새 후보 0건 |
| 2차 판정 (2026-09-02) | 잔여 162건 전수 대조 → **삭제 대상 0건** |
| 지뢰 고정 | `scripts/cloudflare-ignore.sh` 를 `PROTECTED_EXACT` 로 |

## 후보 목록을 어떻게 읽나

`npm run audit:files` 의 `unusedCandidates` 는 **삭제 목록이 아니다.** 2026-09-02 전수 판정에서 잔여 161건이 전부 아래 넷 중 하나였다.

1. **손으로 돌리는 운영 도구** (`scripts/` 84건의 대부분) — 마이그레이션 원장 · 읽기 전용 프로덕션 조회 · 라이브 스모크 · 1회성 코드모드/자산 스크립트. 리포 안 참조가 0이어도 죽은 게 아니다. 유일한 흔적이 `docs/` 인 것이 25건이었다.
2. **사용자 결정으로 보류(유지)** — 연이 티하우스 고아 · `lib/stories/*`(집필 원본) · `app/saju/animal-destiny/*` · `DestinyLibraryBanner` · animal-twelve 쌍 · `sajuWorkerService{,Advanced}` · `lib/yeon/timeTheme.ts`. 🔴 **다시 물어보지 말 것.**
3. **감사기가 원리적으로 못 보는 축** — `js/vendor/sweph-wasm/ephe/*.se1`(wasm 이 런타임 계산 이름으로 읽음) · `js/inline/*.js`(빌드가 셸에 인라인 주입) · `js/dream-meaning-library.js`(전역 심볼 `DREAM_MEANING_LIBRARY` 로만 먹힘).
4. **후보끼리만 참조하는 전이적 고아** 17건 — 전부 2번(스토리 33개 챕터 클러스터 등)에 속했다.

🔴 **리포 안 참조 0 ≠ 죽음.** `scripts/cloudflare-ignore.sh` 가 산 증거다 — 리포 참조 0인데 **Cloudflare Pages 대시보드의 Build ignore command** 가 부른다. 지웠으면 Cloudflare 네이티브 빌드가 되살아나 GitHub Actions 배포와 충돌했다. 이제 감사기의 `PROTECTED_EXACT` 에 사유와 함께 박혀 있다.

## 감사기에서 고친 것 (PR #1432)

1. **`hasKnownExtension()` 조기 반환** — `path.extname` 이 `@/lib/seo.v2` 를 `.v2`, `locale-normalize.d` 를 `.d` 로 읽어 **점 있는 파일명이 영영 미해석**이었다. 조기 반환을 없앴다.
2. **specifier 패턴의 쿼리 문자 클래스가 `[^"]*`** 라 작은따옴표를 안 막았다. `'/js/oracle-kcg.js?v=build-...'` 하나가 **파일 뒷부분을 통째로 삼켜** 셸 동적 로더(`js/core/uiBindings.js`)의 리터럴 경로가 전부 사라졌다.
3. **진입점 추가** — jest `roots`(`__tests__/`) · Next pages-router · `.github/workflows` 와 그 `run:` 이 부르는 스크립트 · ambient/sidecar `.d.ts` · 루트 도구 설정 · `package.json` 사이드카.
4. **보호 접두어 추가** — `apps/` · `docs/` · `i18n/` · `config/` · `store-assets/` + 위치 무관 `.md`.

## 다시 판정할 때의 방법

`git ls-files` 로 추적 파일을 전부 읽어 needle(전체 경로 · 확장자 없는 경로 · 파일명 · 확장자 없는 파일명)을 1패스로 대조했다. 3,419개 텍스트 파일에서 zero-reference 는 19건뿐이었고 그중 4건이 보류 대상, 15건이 운영 도구였다.

- 🔴 **`git grep`/`git ls-files` 여야 한다** — 리포 루트 `.ignore` 가 `sync:public` 미러를 rg·Grep 에서 뺀다.
- 🔴 **`-F` 는 부분 문자열을 문다** — `-F ChapterData` 가 `CodexChapterData` 에 걸려 오판했다. 반드시 **`-w -F`**.
- 🔴 **파일명만으로 판정 금지 — 심볼로 다시 재라**(3번 축이 그래서 살아남았다).
- `reports/` 는 gitignore 라 감사 결과는 커밋되지 않는다. 판정하려면 직접 돌린다.

## 검증

```
npm run audit:files
npm run lint
npm run typecheck
npm run verify:guard-wiring
npm run verify:doc-freshness
npm run test:node
```

`npm run check:critical` 의 `build:worker` 실패(`Could not resolve "workers-og"`)는 로컬 전용이고 CI 는 통과한다. [[local-build-worker-fails-workers-og-missing]]
워크트리에서 jest 는 `NODE_OPTIONS=--experimental-vm-modules` 를 손으로 줘야 한다. [[running-jest-inside-a-worktree]]
