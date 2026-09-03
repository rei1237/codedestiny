---
status: active
updated: 2026-09-04
next: "git fetch origin --prune && npm run worktree:unmerged 로 현재 상태를 재측정한 뒤, 🔴 표시된 갈래 하나만 골라 시작한다"
---

# 전원 차단으로 날아간 미머지 작업 (2026-09-04)

## 왜

컴퓨터를 껐다 켜면서 진행 중이던 세션이 통째로 날아갔다. 사용자 요청:
"대기 중인 PR·워크트리 중 **머지 안 된 것을 수정 후 정상 배포**, 필요 없는 워크트리는 삭제.
단 **진행 중인 이용권 결제 버그는 제외**."

## 지금 상태

🔴 **여기 적힌 상태는 작성 시점 스냅샷이다. 정본은 `npm run worktree:unmerged` 출력이다** — 그것부터 돌린다.

- #1534 는 닫았다(이미 머지된 #1532 와 바이트 동일한 중복이라, 머지하면 오히려 #1533 을 되돌린다).
- 남은 갈래는 셋: **#1536**(구가격 문구 가드) · **#1535**(하단 탭바 접기+예화) · **로케일 이벤트 배선 수리**(워크트리 `locale-price-approx`, 커밋도 PR 도 없음).

## 남은 작업

- [ ] **#1536** — 워크트리 `old-price-copy-purge`. base 는 `main` 으로 옮겨 뒀다. `origin/main` 리베이스 → 로케일 JSON 충돌 해소 → 머지.
      🔴 해소 방향은 하나다: main 의 문구(#1532·#1533)를 **전부 살리고** `premiumPdf` 삭제만 얹는다. `passMonthly*` 키가 하나라도 줄면 잘못 푼 것이다.
      끝 판정: `git grep -c premiumPdf -- public/i18n/` → 0, 그리고 `verify:krw-copy-canonical` 통과.
- [ ] **#1535** — 워크트리 `mnav-collapse-yehwa`. **CI 가 한 번도 안 돌았다.** 리베이스 → `sync:public` → 산출물까지 커밋 → 머지.
      끝 판정: `verify:mobile-bottom-nav-clearance` + `verify:locale-text-fit` 통과 후 CI 초록.
- [ ] **로케일 이벤트 수리** — 워크트리 `locale-price-approx`, 미커밋 80파일 + 미추적 테스트 1개. 브랜치가 main 보다 **17커밋 뒤처져 있다**(ahead 0).
      정본은 `cd:locale-ready` 다. 발행자는 `app/components/LocaleRuntimeBridge.tsx:34` **하나뿐**이고, `cd:language-change`(48파일)·`cd:locale-change`(27파일) 는 **발행자가 0건이라 구독이 전부 죽어 있었다.**
      끝 판정: `npm run test:node` 의 `custom-event-wiring.static.test.js` 통과.

## 정본 예시

`app/components/LocaleRuntimeBridge.tsx:34` — 유일한 로케일 이벤트 발행 지점.

## 🔴 손대지 않는 것

- 워크트리 **`mobile-pay-resume`** — 살아 있는 세션의 **이용권 결제 버그** 갈래다. 사용자가 명시적으로 제외했고 "그 세션이 알아서 한다"고 했다. **읽지도 고치지도 지우지도 않는다.**
- 같은 이유로 착수 금지: `docs/handoff/pass-monthly-limit-enforcement.md` §2-A~2-E · `docs/handoff/pass-tier-price-cap-leak.md`
- `worktree:unmerged` 가 `LOCKED` 로 찍는 것은 전부 같다 — 잠금은 다른 세션이 쓰는 중이라는 뜻이다.

## 함정

이 작업 고유의 것 셋만. 나머지는 CLAUDE.md 와 메모리에 있다.

1. **스쿼시 머지가 SHA 판정을 전부 위양성으로 만든다.** `git branch --contains`·`git cherry`·patch-id·`rev-list origin/main..HEAD` 는 머지된 브랜치를 "미머지"로 부른다. 세 점 `origin/main...HEAD` 도 착륙 여부와 무관하다. 믿을 것은 PR 상태와 파일별 two-dot 내용 대조뿐이다 — `worktree:unmerged` 가 그렇게 판정한다.
2. **`mergeable=CONFLICTING` 이 착시일 수 있다.** `.gitattributes` 가 셸·로더 21개 파일에 `merge=cachebust` 를 걸어 두었는데 **GitHub 은 그 드라이버를 돌리지 않는다.** #1535 의 충돌면 20개 중 19개가 이 대상이다. 조치는 손 병합이 아니라 로컬 리베이스 + force-push, 남으면 `npm run resolve:cachebust`.
3. **로케일 테스트는 소스와 같은 커밋에 넣어야 한다.** `__tests__/ui/custom-event-wiring.static.test.js` 만 먼저 들어가면 main 에서 즉시 실패한다(죽은 리스너 75파일이 아직 살아 있으므로). 러너는 `node --test` 이고 jest 는 `__tests__/ui/` 를 통째로 무시한다.

## 검증

```
npm run worktree:unmerged          # 먼저. 이 문서보다 이것이 정본이다
npm run lint && npm run typecheck
npm run verify:guard-wiring        # 배선 정본
gh pr checks <번호> --watch --fail-fast
```

머지되면 *Release Cloudflare Pages and Worker* 가 스테이징에 자동 배포하고 `verify:deployed-sha` 로 자가 검증한다.
🔴 프로덕션 승격은 사용자 요청이 있을 때만: `gh workflow run "Release Cloudflare Pages and Worker" --ref main -f mode=production`

## 모르는 것

- #1535 를 실제로 리베이스했을 때 cachebust 드라이버가 못 먹는 충돌이 얼마나 남는지. `app/layout.js` 하나는 확실히 손으로 봐야 한다.
- 로케일 수리로 75개 컴포넌트의 `sync` 콜백이 **처음 실행된다.** 렌더 외 부수효과가 있는지는 커밋 전에 전수로 봐야 한다.
