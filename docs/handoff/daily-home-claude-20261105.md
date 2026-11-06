---
status: active
updated: 2026-11-06
next: 최신 origin/main을 작업 트리에 재병합하고 게이트를 통과시킨 뒤, superpowers:brainstorming으로 프로필 카드 게임의 진입화면 배치를 사용자와 정한다
---

# 오늘의 숲길(연이 게임형 다이어리) 전달과 진입화면 배치

과거 경과는 같은 폴더의 `daily-home-20261104.md`에 있다. 어긋나면 이 문서를 따른다.

## 왜

공개 홈에서 연이와 영냥이가 숲으로 안내하듯 출석, 꿀방울, 프로필 카드 미션, 다이어리를 잇는다. 사용자는 병합, push, 배포 결과 확인을 승인했다. 운영 승격 때는 미승격 커밋이 함께 나가므로 그 시점의 목록을 보여 주고 다시 승인받는다.

2026-11-06 사용자 추가 요청(원문): "웹툰은 메인 진입화면으로 옮겼고 프로필 카드 게임처럼 만드는것은 진입화면 또는 영냥이, 꿀꿀운세 사이트에서 보기 좋게 구현이 되면 좋겠는데 이것도 가능하면 진입화면에 다른 변경들과 조화롭게 구성이 되도록해주면 좋겠다"

- 웹툰 링크가 대표 상담 카드에서 빠진 것은 의도한 변경이다. 웹툰은 진입화면의 서가로 옮겼다.
- 프로필 카드 게임형 경험(숲길)은 진입화면에 두는 것을 우선으로 한다. 어렵다면 영냥이나 꿀꿀운세 사이트에 둔다. 진입화면의 다른 최근 변경과 조화를 이뤄야 한다.

## 지금 상태

- 작업 트리는 `D:\Development\code-destiny\.codex-worktrees\daily-home-20261104-040025`, 브랜치는 `wt/daily-home-20261104-040025`다. 숲길 구현과 리뷰 수정은 커밋을 마쳤고 main에는 아직 들어가지 않았다. 설계는 `docs/superpowers/specs/2026-11-05-forest-daily-walk-design.md`에 있다.
- 작업 트리에는 main `ab85ab02c`까지 병합해 두었다(병합 커밋 `669bb76f5`, 문서 `f67d5dcf7`). 그 시점에는 33 ahead / 28 behind였다. push는 하지 않았다.
- 숲길은 지금 Next 홈 `app/page.js`에 들어가 있다. 순서는 HomeQuestionGuide, HomeCardDeck, `<HomeDailyEntry />`(숲 입구), StoryDiscovery(달빛 서가)다.
- 전에는 `28b2c0b44` 때문에 main이 빨간불이었다. 다른 세션이 `9d12e2c6e`(test: align direct consultation entry guards)로 검증기를 고쳤다. 2026-11-06 기준 main 최신 `408c78d58`은 PR CI를 포함해 필수 CI가 모두 초록이다.
- main에서 진입화면이 크게 바뀌었다. `a4dfb6823`이 캐릭터 서가와 흑월의 경고 19컷 웹툰을 웹 진입 화면에 넣었고, `eef6fb87e`가 질문 카드를 서비스 입구 아래로 옮겼다. `408c78d58`은 꿀꿀운세 상담 버튼을 정돈하고 언어 선택과 웹툰 진입을 복구했다. 그 작업의 인수인계(`docs/handoff/approved-entry-comic-20261106.md`)는 `status: done`이다.
- 옆 세션의 미커밋 8개는 사용자 결정으로 대기 조건에서 뺐다. 건드리지 않는다. automation-4는 사용자가 껐다.
- 이 작업 트리의 mock 서버(127.0.0.1:32722, API 32723)는 이전 세션이 띄워 아직 켜져 있다. 작업 트리를 정리할 때 함께 끈다.

## 표면 지도

- 진입화면: 루트 `index.html`. 서가는 `#cdSigGrid`, `.cd-story-entry`, `styles/home-funnel.css`, `js/core/home-funnel.js`, `scripts/design/build-home-funnel.mjs`가 맡는다. `sync:public`이 이 파일을 `public/index.html`, `public/static/index.html`, `public/ggulggul/index.html`, `public/{en,ja,zh,zh-tw}/index.html`로 복사한다. 그래서 꿀꿀운세 사이트(`/ggulggul/`)도 같은 원본을 공유한다.
- 진입화면 검증기: `scripts/verify-detail-first-entry.mjs`(CI Static guards), `scripts/design/verify-home-funnel.cjs`, `scripts/qa/verify-mobile-home-clarity.mjs`, `__tests__/ui/consultation-webtoon-entry.test.mjs`, `__tests__/ui/home-choice-carousel.test.js`.
- Next 홈: `app/page.js`. 숲길 컴포넌트는 `app/components/forest/`에 있다(ForestGate.tsx, ForestWalk `mode="dialog"`).
- 영냥이: `app/yeongnyangi/`.
- 정적 진입화면은 React가 아니다. 숲길 컴포넌트를 그대로 넣을 수 없다. 진입화면에는 숲 입구 카드(정적 HTML, CSS)만 두고, 열면 Next 쪽 숲길(dialog 또는 전용 경로)로 보내는 방식이 유력하다. 이것은 추정이고, 설계 단계에서 확인한다.

## 첫 행동

1. 작업 트리에서 `git fetch origin` 후 `git merge origin/main`을 한다. 충돌이 나면 다음 순서로 푼다.
   - `app/page.js`는 main의 구성을 살리고 `<HomeDailyEntry />`만 유지한다.
   - 사이트맵 원장은 theirs를 받은 뒤 `npm run sitemap:generate`를 다시 돌린다.
   - 생성된 HTML은 `sync:public`으로 다시 만든다.
2. 게이트를 돌린다: `check:fast --base=<origin/main SHA>`, `check:pre-push`, `verify:handoff-contract`, `verify:sitemap-drift`.
3. 스크래치의 `forest-merge-check.cjs`로 mock 화면 점검 32건을 다시 돌린다. 위치는 `D:\Development\Temp\claude\ec29f026d20d029c\cfd16bb1-d7c9-4244-bbfa-fc7f792c2e15\scratchpad\forest-merge-check.cjs`다. 이 스크래치는 다음 세션에서 사라질 수 있다. 없으면 같은 항목으로 다시 만든다: 4개 폭, 순서, h1 하나, 가로 넘침, LCP, 숲길 열기, 뒤로가기.
4. 먼저 Next 홈 숲길을 그대로 push해 전달할지, 진입화면 배치까지 묶어서 push할지 사용자에게 한 번 묻는다. 추천은 먼저 push하는 것이다. 이미 검증을 마친 큰 변경을 오래 들고 있을수록 재병합 비용이 커지기 때문이다.

## 단계

- [ ] 재병합, 게이트, `git push origin HEAD:main`, main CI 1회 확인(빨간불 위에는 push하지 않는다)
- [ ] superpowers:brainstorming으로 진입화면 배치를 정한다. 사용자가 정할 질문은 셋이다.
  - 위치: 진입화면 서비스 입구, 질문 카드, 서가 중 어디에 숲 입구를 둘지
  - 열기 방식: 열었을 때 dialog로 띄울지, 전용 경로로 이동할지
  - 꿀꿀운세 처리: `/ggulggul/`에도 같은 입구를 보일지, 숨길지
- [ ] 정해진 설계를 spec과 plan으로 쓰고 구현한다. 각 단계는 check:fast 후 커밋한다. 진입화면 검증기들을 함께 갱신한다.
- [ ] 스테이징 화면을 확인한다. 미승격 커밋 목록을 보여 주고 운영 승격 승인을 받은 뒤 승격하고 `verify:deployed-sha`를 돌린다.
- [ ] 두 인수인계 문서(`daily-home-20261104.md` 포함)를 `status: done`으로 바꾸고, `npm run worktree:remove`로 작업 트리를 정리한다. 정리 전에 node_modules 정션부터 해제하고, 정리 뒤 병합된 `wt/*` 브랜치를 지운다. mock 서버를 끄고 스크래치를 삭제한다.

## 함정

- 이 PC는 `core.autocrlf=true`라 작업 트리가 CRLF로 풀린다. 그래서 해시나 생성물을 비교하는 테스트가 로컬에서만 실패한다. 공유 git 설정은 바꾸지 않는다. `git ls-files --eol`에서 `i/lf w/crlf`인 파일만 LF로 바꾼 뒤 `sync:public`을 돌려야 CI와 같은 해시가 나온다.
- `check:fast`를 커밋 뒤에 돌리면 "변경 없음"으로 끝난다. `--base=<origin/main SHA>`를 준다.
- `verify:handoff-contract`는 CI의 Static guards에서만 돈다. `check:pre-push`로는 잡히지 않는다.
- 병합할 때 생성된 정책 HTML이 충돌하면 `sync:public`으로 다시 만든다.
- 설계 문서는 아직 `#forest-walk` 해시를 쓴다고 적고 있다. 실제 코드는 `145e61e1c`에서 공용 dialog 가드로 바뀌었다. 진입화면에서 열 때 이 차이를 고려한다.
- mock 포트는 작업 트리 경로의 해시로 정해진다. 이 작업 트리는 32722다. `EADDRINUSE`가 나면 이미 떠 있는 서버를 재사용한다.

## 검증

- 병합 전: 브라우저 mock 전체 폭 51건, 경계 상황 35건.
- `669bb76f5` 기준 통과: `check:fast`(Jest 455 스위트 7,634건), `check:pre-push`, `verify:handoff-contract`, `verify:sitemap-drift`.
- 병합본 mock 화면 점검 32건 통과(360·390·430·1280px).
- 실결제, 운영 DB 쓰기, 과금 LLM 호출은 없었다.
- 실제 단말기의 터치와 키보드는 검증하지 않았다. 모바일 에뮬레이션만 했고, 이는 사용자의 선택이다.

main 변경으로 낡은 수동 검증기 2개가 있다. 숲길과 무관하고 CI에 연결되어 있지 않아 고치지 않았다.

- `scripts/design/verify-home-entry-locale.cjs`: 웹 홈의 옛 제목을 기대한다. 그 단언만 뺀 사본은 통과했다.
- `scripts/verify-home-question-guide.mjs:57`: 추천 결과의 "네오의 팩폭 전략실" 제목이 달빛 서가 제목과 겹쳐 2개가 잡히며 실패한다. 같은 흐름을 따로 재현하면 추천 결과는 정상이다.

```
npm run check:pre-push
npm run verify:handoff-contract
npm run verify:sitemap-drift
```

## 모르는 것

- 진입화면에 숲 입구를 둘 정확한 위치, 열기 방식, 꿀꿀운세 노출 여부. 사용자에게 묻는다.
- 정적 진입화면에서 Next 숲길로 넘어갈 때 로그인, 출석 상태를 어떻게 넘길지. 설계 단계에서 코드를 보고 정한다.
