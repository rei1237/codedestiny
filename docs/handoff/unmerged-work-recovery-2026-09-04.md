---
status: done
updated: 2026-09-04
next: "없음 — 이 갈래는 끝났다. 다음에 세션이 날아가면 /resume-unmerged 를 먼저 돌린다"
---

# 전원 차단으로 날아간 미머지 작업 (2026-09-04) — 완료

## 왜

컴퓨터를 껐다 켜면서 진행 중이던 세션이 통째로 날아갔다. 사용자 요청:
"대기 중인 PR·워크트리 중 **머지 안 된 것을 수정 후 정상 배포**, 필요 없는 워크트리는 삭제.
단 **진행 중인 이용권 결제 버그는 제외**."

## 결과 — 4갈래 전부 착륙

`#1534` 닫음(이미 머지된 #1532 와 바이트 동일한 중복이라, 머지하면 오히려 #1533 을 되돌린다) ·
`#1537` 조회 도구/절차 · `#1536` 원화 문구 가드 · `#1535` 하단 탭바 접기 · `#1541` 로케일 이벤트 수리.
스테이징까지 자동 배포됐다. 프로덕션 승격은 하지 않았다.

## 이 사고가 남긴 것 (다음에 쓸 것)

- **`/resume-unmerged`** — 세션이 날아간 뒤 **처음** 돌리는 절차. 순서를 지키는 것이 요점이다
- **`npm run worktree:unmerged`** — 워크트리·브랜치·열린 PR 을 "이어받을 것 / 정리할 것 / 건드리지 말 것"으로 분류한다.
  🔴 **이 출력이 정본이다. 문서에 적힌 상태는 언제나 스냅샷이다**
- **`__tests__/ui/custom-event-wiring.static.test.js`** — `cd:*` 이벤트에 dispatcher 가 없는 리스너를 막는다.
  이 축에 가드가 0건이라 죽은 배선이 리뷰를 세 번 통과했었다

## 🔴 이번에 손대지 않은 것 (여전히 유효)

- 워크트리 **`mobile-pay-resume`** — 살아 있는 세션의 **이용권 결제** 갈래. 사용자가 명시적으로 제외했다
- 착수 금지였고 아직 남은 갈래 2건:
  `docs/handoff/pass-monthly-limit-enforcement.md` §2-A~2-E · `docs/handoff/pass-tier-price-cap-leak.md`
- `docs/handoff/feature-marketing-copy-i18n-and-route-metadata.md` §3 — 7개 로케일의 `featureMarketing*` 이 영어 복사 상태(사용자가 "나중에 일괄 번역" 지시)

## 함정 (이 사고가 실측한 것만)

1. **스쿼시 머지가 SHA 판정을 전부 위양성으로 만든다.** `git branch --contains`·`git cherry`·patch-id·`rev-list origin/main..HEAD` 는 머지된 브랜치를 "미머지"로 부른다. 세 점 `origin/main...HEAD` 도 착륙 여부와 무관하다. 믿을 것은 **PR 상태와 파일별 two-dot 내용 대조**뿐이다 — `worktree:unmerged` 가 그렇게 판정한다.
2. **`mergeable=CONFLICTING` 이 착시일 수 있다.** `.gitattributes` 가 셸·로더 21개 파일에 `merge=cachebust` 를 걸어 두었는데 **GitHub 은 그 드라이버를 돌리지 않는다.** #1536·#1535 둘 다 로컬 리베이스에서 **충돌 0건**이었다. 조치는 손 병합이 아니라 로컬 리베이스 + force-push, 남으면 `npm run resolve:cachebust`.
3. **verify 를 낱개로 돌린 것은 스위트를 돌린 것이 아니다.** #1536 의 `paid-flow-gates` 가 `scripts/run-paid-gate-suite.mjs` 의 문법 오류로 죽었는데, 개별 `verify:*` 는 전부 통과했었다. 스위트를 배선하거나 고쳤으면 **스위트 자체**를 돌린다.
4. **워크트리는 여러 세션이 동시에 몬다.** 이번에 남의 세션이 같은 브랜치에 커밋 2개를 얹었고, 다른 세션이 #1535 를 먼저 머지했다. 브랜치가 예상과 다르면 클로버하지 말고 `ListAgents`·`SendMessage` 로 먼저 묻는다.
