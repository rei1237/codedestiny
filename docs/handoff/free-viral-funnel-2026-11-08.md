---
status: active
updated: 2026-11-08
next: "2단계 — 운명의 꽃 무료 개방(worker requireAuth 제거 + IP 제한, 레거시 클라이언트, 공유 바·CSS 공개 연출)"
---

# 무료 바이럴 퍼널 (초간단 무료 사주 + 운명의 꽃·최애 운명 무료 개방)

## 첫 행동
1. `Set-Location D:\Development\codedestiny-worktrees\free-viral-funnel-20261108-110954` 후 `git status`·`git log --oneline -3`.
2. 설계: `docs/superpowers/specs/2026-11-08-free-viral-funnel-design.md` 를 끝까지 읽는다(결정·파일·검증이 모두 거기 있다).
3. 아래 단계 중 체크 안 된 첫 단계만 한다. 끝나면 체크·결과 메모를 이 문서에 적고 커밋한다.

## 지금 상태
- 워크트리: `D:\Development\codedestiny-worktrees\free-viral-funnel-20261108-110954`
- 브랜치: `wt/free-viral-funnel-20261108-110954` (base origin/main `1a9f0fb18`)
- 주 체크아웃 `D:\Development\code-destiny` 는 다른 세션의 `feat/world-cast-page` + 미커밋 작업 → **건드리지 않는다.**
- node_modules 는 주 체크아웃으로의 정션. 워크트리 제거 시 정션부터 끊는다(설계 문서 아님, CLAUDE.md).

## 승인 상태 (2026-11-08, 사용자)
- 계획 승인(ExitPlanMode). "기존 것 무료 개방", 최애 운명 "결과 카드만 무료"(details 5,000원 유지), 공유 해제 "버튼 누르면 해제".
- 커밋은 자동. **push·배포·main 머지는 승인 안 됨** — 끝나면 보고만.

## 작업 규칙과 함정
- CLAUDE.md(저장소) 규칙을 따른다: 라우팅·공유 변경은 RED, `package-lock.json` 수정 금지, SEO 체크리스트.
- `docs/context/design-canon.md`: 이모지는 🌸·🦁만, 유아어 금지, `--yn-*` 와 `--cd-*` 토큰 분리.
- 사내 원칙 "새 보상·공유 강요 팝업은 없다"(`docs/purchase-journey/IMPLEMENTATION.md:71`) — 공유 미션은 팝업 금지, 결과 안 인라인 카드. 5단계에서 예외를 문서화.
- 카카오 공유에는 해제 조건을 붙이지 않는다. 코인·금전 보상 없음.
- 범위 밖 버그·정리 거리는 고치지 말고 이 문서 "후속" 절에 적는다.
- 검증은 실제 명령 출력으로. 실패하면 그대로 적는다.

## 단계
- [x] 1. 공용: 스레드 intent + 공용 공유 바(X·스레드·복사·이미지 저장) + trackShare
- [ ] 2. 운명의 꽃 무료 개방(worker requireAuth 제거 + IP 제한, 레거시 클라이언트, 공유 바·CSS 공개 연출)
- [ ] 3. 최애 운명: 결제 검사를 details 로 이동, 슬롯 공개 연출, 문구·레지스트리 설명, 공유 바 교체
- [ ] 4. `/saju/free` 초간단 무료 사주(폼·70/30·블러·공유 미션·PNG 카드·SEO·사이트맵)
- [ ] 5. 문서: 공유 미션 예외 기록, 이 문서 status 정리
- [ ] 6. 전체 검증(타입·린트·테스트·사이트맵 --check·브라우저 390px)

## 결과 메모
- 1단계(2026-11-08, 커밋 `2ece773c4`)
  - intent: `js/share-service.mjs` 의 `withShareUtm(url, source)`·`socialIntentUrl('x'|'threads', {text, url})`(+`.d.mts`, `public/js` 미러). UTM 은 `utm_source=<채널>&utm_medium=share&utm_campaign=public_share`. 스레드는 `https://www.threads.net/intent/post?text=<본문\n링크>`. 레거시 셸(`/flower`)도 같은 모듈을 import 해 쓸 수 있다.
  - 공유 바: `app/components/ViralShareBar.tsx`(default export). props `url`(경로면 현재 origin 기준), `text`, `feature`, `title?`, `imageRef?` 또는 `getImageNode?`(둘 다 없으면 이미지 버튼 숨김), `imageFileName?`, `imageWidth?`·`imageHeight?`(주면 pixelRatio 1, 예: 1080×1350), `onShared?(channel)`, `className?`. channel 은 `"x" | "threads" | "link" | "download"`.
  - `onShared` 는 X·스레드 창 열기, 링크 복사(클립보드 막혀 수동 복사 입력란이 떠도 호출), 이미지 공유·저장 성공 때 부른다. 이미지 공유 시트 취소(AbortError)·생성 실패 때는 부르지 않는다. 카카오는 없다.
  - `trackShare({feature, channel})` 를 버튼마다 쏜다. `useAnalytics` 의 `ShareChannel` 에 `threads` 를 추가했다.
  - 검증: `node --test __tests__/ui/share-service.test.mjs` 6/6 통과(새 intent 테스트 포함). `npm run check:fast` EXIT=0 — typecheck PASS, lint, test:node 4670/4670, jest 455 suites·7700 tests 통과. 페이지 연결은 아직 없음(2~4단계).

## 함정(1단계에서 발견)
- 🔴 `__tests__/ui/saju-bundle-copy.static.test.js:264` 가드: `public·docs·__tests__·marketing` 밖에서 "무료 사주"/"무료사주" 문자열(주석 포함)이 나오면 실패한다("무료 만세력"으로 쓰라고 함). 4단계 `/saju/free` 의 화면 문구·title·메타·주석에 "무료 사주"를 쓰면 막힌다 → 문구를 "무료 만세력"·"초간단 사주 풀이" 등으로 쓰거나, 정말 필요하면 그 가드의 허용 목록을 사용자 결정으로 바꿔야 한다(문서에 없는 결정이라 4단계 시작 때 판단·보고).
- 공용 모듈(`js/share-service.mjs`·`useAnalytics.ts`)을 고치면 `verify:sitemap-drift` 가 실패한다. `npm run sitemap:generate` 결과(28개 URL lastmod)를 같은 커밋에 담았다.
- `node scripts/sync-legacy-static-to-public.mjs` 는 `index.html`·`public/*/index.html` 의 `?v=build-…` 토큰도 바꾼다. 미러 대상 파일만 남기고 나머지는 되돌린다.

## 후속(범위 밖, 보고만)
