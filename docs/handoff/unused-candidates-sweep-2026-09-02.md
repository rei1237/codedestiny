---
status: active
updated: 2026-09-02
next: 감사기 수정 PR 머지 후 `npm run audit:files` 를 다시 돌려 잔여 후보 162건을 손으로 판정한다
---

# unusedCandidates 스윕 — 후보 목록은 삭제 목록이 아니다

## 지금 상태

- **1차 스윕 완료** (PR #1427 머지). 소스 15개 + 미러 4개 삭제.
- **감사기 수정 완료** — `scripts/audit-unused-files.mjs` 의 위양성 축 3종을 고쳤다. 후보가 **1,012건 → 162건**으로 줄었고 **새로 생긴 후보는 0건**이다(전후 경로 집합 대조).
- **「사용자 판단 대기」 7개 그룹은 2026-09-02 사용자 결정으로 전부 보류(유지)** — 연이 티하우스 고아 · `lib/stories/*` · `app/saju/animal-destiny/*` · `DestinyLibraryBanner` · animal-twelve 쌍 · `sajuWorkerService{,Advanced}` · `lib/yeon/timeTheme.ts`. 다시 물어보지 말 것.

## 남은 작업

수정된 감사기의 잔여 후보 162건을 판정한다. 구성: `scripts/` 84 · `lib/` 46 · `js/` 14 · `src/` 10 · 나머지 8. `src/` 10건과 `components/` 3건은 위 보류 결정 대상이므로 **제외하면 실제 판정 대상은 약 149건**이다.

판정 전에 반드시 6면 `git grep -w -F` (소스 + `__tests__/` + `scripts/verify-*`). 🔴 **`git grep` 이어야 한다** — 리포 루트 `.ignore` 가 `sync:public` 미러를 rg/Grep 에서 뺀다.

잔여 후보 중 **감사기가 여전히 못 보는 것으로 확인된 축**(살아 있다, 지우지 말 것):
- `js/vendor/sweph-wasm/ephe/*.se1` — wasm 이 런타임에 계산된 이름으로 읽는다
- `js/inline/*.js` — 빌드 스크립트가 셸에 인라인으로 주입한다
- `js/dream-meaning-library.js` — 전역 심볼(`DREAM_MEANING_LIBRARY`)로만 먹힌다

## 감사기에서 고친 것 (2026-09-02)

1. 🔴 **`hasKnownExtension()` 이 `path.extname` 으로 조기 반환**했다 — `@/lib/seo.v2` 를 확장자 `.v2`, `locale-normalize.d` 를 `.d` 로 읽어 **점 있는 파일명이 영영 미해석**이었다. 조기 반환 자체를 없앴다(확장자 후보를 더 얹어도 `allFilesSet` 조회가 걸러 준다).
2. 🔴 **specifier 패턴 9 의 쿼리 문자 클래스가 `[^"]*`** 라 작은따옴표를 안 막았다. `'/js/oracle-kcg.js?v=build-...'` 하나가 **파일 뒷부분을 통째로 삼켜** 셸 동적 로더(`js/core/uiBindings.js`)의 리터럴 경로가 전부 사라졌다. `[^"'\`]*` 로 좁혔다.
3. **진입점 누락** — jest `roots`(`__tests__/`) · Next pages-router(`pages/`) · `.github/workflows/*.yml` 과 그 `run:` 이 부르는 스크립트 · ambient/sidecar `.d.ts` · 루트 도구 설정 · `package.json` 사이드카를 전부 추가했다.
4. **보호 접두어 추가** — `apps/`(Capacitor 네이티브 빌드) · `docs/` · `i18n/`(글롭 저작 원본) · `config/`(fs 로 읽는 JSON) · `store-assets/`, 그리고 위치 무관 `.md`. 이 감사기는 죽은 **코드**를 찾는다.

## 함정

- 🔴 **`git grep -F` 는 부분 문자열을 문다** — `-F ChapterData` 가 `CodexChapterData` 에 걸려 오판했다. **반드시 `-w -F`.**
- 🔴 **파일명만으로 판정 금지 — 심볼로 다시 재라.**
- `reports/` 는 gitignore 라 감사 결과는 커밋되지 않는다. 판정하려면 직접 `npm run audit:files` 를 돌린다.
- 워크트리에서 jest 는 `NODE_OPTIONS=--experimental-vm-modules` 를 손으로 줘야 한다. 안 주면 ESM 스위트가 전부 빨간불이라 **회귀로 오독한다**. [[running-jest-inside-a-worktree]]
- `__tests__/worker/fortune-today-hub.route.test.js` 는 전량 병렬 실행에서만 5초 타임아웃으로 깨진다(swiss-ephemeris 초기 로드). 단독 11/11 통과. 이 스윕과 무관한 기존 flake.

## 검증

```
npm run audit:files
npm run lint
npm run typecheck
npm run verify:guard-wiring
npm run verify:doc-freshness
NODE_OPTIONS=--experimental-vm-modules npx --no-install jest
```

`npm run check:critical` 의 `build:worker` 실패(`Could not resolve "workers-og"`)는 로컬 전용이고 CI 는 통과한다. [[local-build-worker-fails-workers-og-missing]]
