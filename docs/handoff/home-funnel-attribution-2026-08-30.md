---
status: active
updated: 2026-08-30
next: "GA4 에서 home_section_click 이 실제로 들어오는지 1주 확인 후, 그 수치로 A/B(요청 19) 설계"
---

# 홈 섹션 클릭 귀속 (감사 로드맵 P4)

## 왜

감사 §5 P4 "퍼널 이벤트 계측" — A/B 가능한 홈 구조(요청 19)의 선행 작업.
근거는 [code-destiny-audit.md](../code-destiny-audit.md) §5.

## 지금 상태

- 브랜치 `worktree-home-funnel-attribution-0830` · PR 미제출(이 문서 작성 시점).
- P4 는 감사 문서에서 닫았다. **전제의 절반이 낡아 있었다** — 결제·무료사주·인증·리텐션·공유·크로스셀은
  전부 이미 계측돼 있었고, 실제 구멍은 "홈의 어느 섹션이 이 클릭을 만들었나" 하나뿐이었다.
  재실측 표는 감사 §5 의 "P4 의 전제도 절반이 낡았다" 절에 있다.

## 남은 작업

- [ ] GA4 에서 `home_section_click` 수신 확인 — `section` 10종이 실제로 들어오는지. 판정 기준: 배포 후 1주
      안에 `hero`·`concern_pick`·`today_hub` 최소 3종이 0 이 아닐 것. 0 이면 CSP 나 동의 기본값(denied)을 먼저 본다.
- [ ] 요청 18 의 남은 절반 — **KPI 정의 문서·대시보드는 여전히 없다.** 이벤트만 있고 무엇을 성공으로 볼지가 없다.
- [ ] 요청 19(A/B) 는 로드맵에 P 번호가 없다. 착수하려면 순위부터 사용자에게 확인.

## 정본 예시

`js/core/analytics.js:129` — 앵커 클릭 위임 한 곳에서 `cross_sell_click` 과 `home_section_click` 두 축을 받는다.
표식은 `index.html` 의 `data-cd-funnel-section` 10개(전부 `<main id="inputPage">` 안).

## 함정

- 🔴 **`app/hooks/useAnalytics.ts` 를 계측의 정본으로 읽지 말 것.** 홈은 정적 셸이라 React 훅이 애초에
  돌 수 없다. "호출자 0" 은 계측이 없다는 증거가 아니었다. 정본은 `window.cdTrack`.
- 🔴 **`useAnalytics.trackPaymentAttempt` 를 결제 호출부에 붙이지 말 것** — `checkout_option_click`
  (`js/core/checkout-entry.js:131` 의 `FUNNEL_EVENTS`)과 같은 행동을 두 번 쏘게 되어 분해가 불가능해진다.
- 🔴 **축을 늘릴 때 리스너를 새로 달지 말 것** — 같은 노드·같은 이벤트에 위임을 겹치면 실행 순서가
  암묵적이 되고 `stopImmediatePropagation` 하나에 다른 축이 조용히 죽는다. 기존 리스너 안에 `try` 블록을 추가한다.
- 🔴 **앵커만 센다.** 탭 전환·펼치기 버튼은 화면을 떠나지 않아 퍼널 이탈이 아니다. 가드가 이걸 음성 테스트로 고정한다.
- 🔴 **이 변경은 CI 티어 `standard` 로 분류된다** (`scripts/lib/change-risk.mjs`). `verify:analytics-events` 는
  `runs_critical == 'true'` 에서만 도는 게이트라(`.github/workflows/pr-ci.yml:699`) **PR 에 `full-ci` 라벨을
  붙이지 않으면 이 작업의 가드가 CI 에서 한 번도 안 돈다.**
- `index.html` 을 고쳤으므로 `sync:public` + `sitemap:generate` 가 필수(빠뜨리면 "Typecheck and lint" 이름으로 실패).

## 검증

```
npm run verify:analytics-events      # ⑩ 홈 귀속 위임 · ⑪ 셸 표식
npm run verify:public-parity && npm run verify:sitemap-drift
npm run lint && npm run typecheck && npm test && npm run test:node
npm run build:cf                     # postbuild 의 [adsense-readiness] OK 까지
```

가드 음성 테스트 5종(표식 삭제·결과 페이지 오염·값 중복·버튼 포함·발화 제거)을 손으로 돌려 전부 실패하는 것을
확인했다. 🔴 되돌릴 때 `git checkout` 을 쓰지 말 것 — 원본을 메모리에 들고 복원한다.

## 모르는 것

- `home_section_click` 의 GA4 실수신은 배포 전이라 **미검증**이다. 로컬 jsdom 발화만 확인했다.
- 동의 배너를 거부한 사용자 비율을 모른다. `analytics_storage: denied` 에서도 익명 집계는 되지만,
  섹션별 분해가 얼마나 성길지는 실제 데이터를 봐야 안다.
