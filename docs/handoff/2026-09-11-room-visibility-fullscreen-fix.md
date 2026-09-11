---
status: superseded
updated: 2026-09-11
next: 없음 — PR #1910 닫음(중복). 동일 버그는 이미 main의 PR #1906으로 해결됨
---

## 결론 (2026-09-11 추가)

PR #1910을 열었더니 main과 머지 불가(CONFLICTING) 상태였다. 원인을 추적한 결과 이 브랜치가 오래된
main 스냅샷 기준이었고, 그 사이 다른 세션이 **동일한 버그**를 PR #1906
(`fix/mobile-all-fortunes-isolation`, 커밋 `1e478e684`)으로 이미 고쳐 머지한 상태였다.

실측으로 origin/main의 index.html에서 이 작업의 핵심 어서션 3개가 전부 이미 참임을 확인:
- `body.cd-all-fortunes-fullscreen #inputPage{visibility:hidden!important}` 존재
- `buildPinCard` 블록에 `ensureHomeExpanded()` 없음(programmatic click으로 대체됨)
- `.cd-mobile-collection-fullscreen{pointer-events:auto!important}` 존재
- `scripts/verify-mobile-cdp-smoke.mjs`에 동일한 hit-test/visibility 어서션도 이미 포함

#1906은 `data-cd-mobile-overlay-active` 속성 게이팅을 쓰는 더 정교한 방식이라, 이 PR의 예전 방식
(`#cdhCollections`를 무조건 노출 + `.cd-mobile-collection-fullscreen`에 `visibility:visible` 강제)으로
덮어 병합하면 리그레션 위험이 있다고 판단해 **PR #1910을 닫았다**(강제 병합/재작성 대신 중복 폐기를 선택,
사용자 승인 후 진행).

순증분이었던 CDP smoke의 "개요 스크롤 컨테이너" 어서션(`overviewScrollHeight`/`overviewClientHeight`,
스와이프 응답 확인)은 main에는 없다 — 필요하면 별도의 작은 PR로 다시 낼 것.

이 문서와 브랜치 `codex/bug-report-room-visibility`는 더 참고할 필요 없음.

# 전체화면 운세 오버레이 방 가시성 버그 수정

## 왜

브랜치명 `codex/bug-report-room-visibility`. `body.cd-all-fortunes-fullscreen` 오버레이가 열려도 밑에 깔린 홈 셸(`#inputPage`)이 시각적으로 완전히 안 숨고 hit-test에 간섭하던 버그 제보 대응.

## 지금 상태 (완료)

- 코드 변경은 `index.html`(정본)에만 있고, `js/**`·`public/**`의 diff는 전부 `index.html` 편집에 따른 캐시버스팅 빌드 해시 재부여(`build-3791d3232981` → `build-1cca2e655781`)뿐 — 로직 변경 없음. 실측으로 재확인함(diff 라인 전수 grep, `v=build-` 외 변경 없음).
- `public/**` 미러는 `sync:public`으로 동기화 완료.
- **sitemap 드리프트 원인 확인 완료**: `origin/main`과 로컬 `main`은 실제로는 차이 0(핸드오프 작성 시점의 "326커밋 뒤처짐" 추정은 틀렸음 — 이미 해소된 상태였음). 드리프트는 이 브랜치 자체의 room-visibility 수정(`index.html`/`public/**` 홈 콘텐츠 변경)이 sitemap lastmod 서명을 바꾼 것이 원인 — **범위 안**. `git stash`로 확인: 커밋된 HEAD만으로는 `sitemap:check` OK, 작업트리 변경을 얹으면 드리프트 발생. `npm run sitemap:generate` 실행해 해소, 변경된 sitemap 파일들을 같은 커밋에 포함.
- `npm run check:fast` 재실행 → **critical 티어로 자동 승격**(scripts/verify-mobile-cdp-smoke.mjs가 `scripts/**` 경로라 `shared` 판정) → `typecheck`·`lint`·`test:node`(1048개)·`verify:sitemap-drift` 전부 통과. **`test:jest`(smoke:core 포함)는 이 저장소 전역에서 사전에 깨져 있음** — `origin/main` 기준 완전히 새로운 워크트리(`.claude/worktrees/ci-delivery-friction`, 이번 브랜치와 무관)에서도 동일하게 132개 스위트가 `SyntaxError: Cannot use import statement outside a module`로 실패(Node v24.18.0, jest 30.5.1, jest.config.cjs에 ESM/babel 트랜스폼 미설정). 이번 작업 파일은 jest 커버리지가 아예 없음(테스트는 `__tests__/ui/`에 있고 jest가 아니라 `test:node`가 돈다). 범위 밖 결함으로 보고만 함 — 고치지 않음.
- `scripts/verify-mobile-cdp-smoke.mjs` 전체 실행 시 이번 작업과 무관한 기존 블록(`.moon-preview-card[href="/tarot/mingri/"]` 스와이프, `2026-08-15` 오탭 회귀 구간)이 `visible:false`로 먼저 실패 — **git stash로 커밋된 HEAD 기준으로도 동일 재현 확인, 사전 존재·무관**. `MOBILE_CDP_FOCUS=all-fortunes node scripts/verify-mobile-cdp-smoke.mjs`로 이번에 추가한 hit-test/visibility 어서션만 실행 → **`Mobile CDP smoke OK`, `Focused all-fortunes touch flow: OK`**.
- 작업 디렉터리에 이 브랜치와 무관한 다른 세션의 미커밋 변경이 섞여 있었음(`.claude/hooks/guard-costly-commands.mjs`·`.test.mjs`, `scripts/ci-preflight.mjs`, `scripts/list-cleanup-candidates.mjs`, `docs/context/delivery-and-ci.md`, `package.json`의 `cleanup:apply`) — 손대지 않고 그대로 둠, 이번 커밋에서 제외.
- 변경 파일만 커밋 → push → PR 생성 완료.

## 남은 작업

- [ ] (다음 세션이 관심 있다면) 저장소 전역 `test:jest` ESM 실패 원인 규명 — Node 24/jest 30 조합 문제로 추정, CI도 Node 24를 쓰므로 CI에서도 재현될 가능성. 이 작업 범위 밖.
- [ ] PR 머지·스테이징 확인은 사용자 승인 범위에서만 진행.

## 정본 예시

- `index.html:37073` — `body.cd-all-fortunes-fullscreen #inputPage{visibility:hidden!important}` 추가 (핵심 수정)
- `index.html:13812` 부근 — 컬렉션 클릭 시 `ensureHomeExpanded()` 호출 제거, programmatic click으로 대체
- `__tests__/ui/mobile-fortune-render-policy.static.test.js` — 이번 정책에 대한 정적 테스트 추가

## 함정

- `js/**`·`public/**`의 diff가 커 보여도 실제 로직 변경은 `index.html` 하나뿐이다. 리뷰 시 build-hash 라인만 있는 파일은 건너뛰어도 된다.
- 나머지는 CLAUDE.md/`docs/context/design-and-ui.md`의 기존 정적 셸 함정(늦은 CSS=CLS, sync:public 필수 등)과 동일 — 새로 추가할 것 없음.

## 검증

```
npm run sitemap:generate
npm run typecheck
npm run lint
npm run test:node
npm run smoke:core   # 저장소 전역 test:jest ESM 실패로 4/8 스위트 FAIL — 범위 밖, 사전 존재
MOBILE_CDP_FOCUS=all-fortunes node scripts/verify-mobile-cdp-smoke.mjs   # OK
```

## 모르는 것

- 저장소 전역 `test:jest`(및 이를 쓰는 `smoke:core`, critical 티어 `check:fast`)가 왜 깨졌는지 근본 원인 미확인. `origin/main` 기준 클린 워크트리에서도 동일 재현되므로 이 브랜치 원인은 아님. CI(Node 24)도 같은 문제를 겪는지는 미확인.
