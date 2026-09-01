---
status: in-progress
updated: 2026-09-02
next: PR #1427 머지 후, 「사용자 판단 대기」 7개 그룹에 대한 사용자 결정을 받아 2차 스윕
---

# unusedCandidates 스윕 — 후보 목록은 삭제 목록이 아니다

## 지금 상태

1차 스윕 완료, **PR #1427** 리뷰 대기. 15개 소스 + 미러 4개 삭제.

핵심 발견: `reports/unused-files-report.json` 의 후보 1,026건 중 **883건(86%)은 감사기 사각지대에서 나온 구조적 위양성**이다. 이 비율을 모르고 목록을 삭제 대상으로 읽으면 사고가 난다.

- 883건 = 구조적 위양성 (jest 디스커버리 · docs · i18n 동적 로딩 · 모바일 `apps/` · npm/워크플로가 부르는 스크립트 · 루트 도구 설정 · 스토어 자산)
- 143건 = 실제 코드 잔재. 그중 대부분도 감사기가 못 보는 경로로 **살아 있다**(셸 동적 로더의 리터럴 경로 `js/core/uiBindings.js:60-119` · verify 스크립트가 파일로 읽는 것 · pages-router 관례 · ambient/sidecar `.d.ts` · 선행 감사의 keep 결정)
- 15건 = 6면 `git grep` 단어 경계 통과 → 삭제함

## 사용자 판단 대기 (2차 스윕의 입력)

절대규칙 6("기존 기능·콘텐츠를 사용자 요청 없이 삭제하지 않는다") 또는 선행 감사의 keep 결정에 걸려 손대지 않았다. **사용자 결정 없이는 지우지 말 것.**

| 대상 | 걸린 이유 |
|---|---|
| `src/features/fortune-tea-house/` 고아 8개 + `lib/tarotAssetMap.ts` + `data/tarotAnimationAtlas.ts` | `docs/cleanup-2026-08/02-dynamic.md:133` — 2026-07-25 B-2 에서 "keep" 결정. 뒤집으려면 그 결정부터 재검토 |
| `lib/stories/data.ts` + `lib/stories/chapters/*` 33개 | 집필 원본 의도적 보존 |
| `app/saju/animal-destiny/components/` 고아 11개 | 선행 감사 2-C 클러스터 |
| `components/DestinyLibraryBanner.tsx` | 유일 참조가 `tailwind.config.js:20` 의 **주석** |
| `components/fortune/animal-twelve/{AnimalCard,AnimalCharacterSvg}.tsx` | 서로만 참조하는 쌍. UI 라 자동 판정 보류 |
| `js/services/sajuWorkerService{,Advanced}.js` | 참조는 이번에 지운 `sajuWorkerExamples.js` 와 `scripts/i18n-migrate-fallback-tables.mjs:41` 의 표뿐 |
| `lib/yeon/timeTheme.ts` | 유일 흔적이 `i18n/.fallback-gaps.json:419` 감사 산출물 |

## 함정

- 🔴 **`scripts/audit-unused-files.mjs` 에 실제 버그가 있다** — `hasKnownExtension()` 이 `path.extname` 을 써서 `@/lib/seo.v2` 를 확장자 `.v2`, `locale-normalize.d` 를 `.d` 로 읽는다. **점 있는 파일명은 영영 해석되지 않는다.** 2차 스윕 전에 고치면 노이즈가 크게 준다.
- 🔴 감사기 진입점에 **jest 디스커버리 · Next pages-router 관례 · `.github/workflows` 호출 · 셸 동적 로더 · ambient/sidecar `.d.ts` · i18n 동적 로딩**이 전부 빠져 있다.
- 🔴 **`git grep -F` 는 부분 문자열을 문다** — `-F ChapterData` 가 `CodexChapterData` 에 걸려 `types/astro-premium-report.ts` 를 살아 있다고 오판했다. **반드시 `-w -F`.**
- 🔴 **`.d.ts` 사이드카는 경로 needle 로 재면 전부 죽어 보인다** — 모든 needle 에 `.d` 세그먼트가 들어가 형제 `.js` 의 임포터가 안 잡힌다. 맨 모듈명으로 다시 grep 할 것. 실제로 6개가 살아 있었다(`app/_lib/{api-config,auth-client,billing-client}.ts` · `lib/i18n/dictionary.ts:15`).
- 🔴 **파일명만으로 판정 금지 — 심볼로 다시 재라.** `js/dream-meaning-library.js` 는 basename grep 으로 죽어 보였지만 전역 `DREAM_MEANING_LIBRARY`/`DreamMeaningLibraryUtils` 를 `js/dream-ledger.js`·`lib/ai-engine.js` 가 먹는다. 안 지웠다.
- 워크트리에서 jest 는 `NODE_OPTIONS=--experimental-vm-modules` 를 손으로 줘야 한다. 안 주면 ESM 임포트 스위트가 전부 실패해 **회귀로 오독하기 쉽다**(이번에 6스위트 31건이 그렇게 빨간불이었다). [[running-jest-inside-a-worktree]]
- `__tests__/worker/fortune-today-hub.route.test.js` 는 **전량 병렬 실행에서만** 5초 타임아웃으로 깨진다(swiss-ephemeris 초기 로드). 단독 11/11 통과. 이 스윕과 무관한 기존 flake.

## 검증

```
npm run typecheck
npm run lint
npm run verify:guard-wiring
npm run verify:doc-freshness
npm run verify:entry-encoding
npm run verify:public-mirror-fresh
NODE_OPTIONS=--experimental-vm-modules npx --no-install jest
```

`npm run check:critical` 의 `build:worker` 실패(`Could not resolve "workers-og"`)는 로컬 전용이고 CI 는 통과한다. [[local-build-worker-fails-workers-og-missing]]
