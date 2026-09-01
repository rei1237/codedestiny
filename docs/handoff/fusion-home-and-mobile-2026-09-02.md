---
status: active
updated: 2026-09-02
next: PR #1438·#1440 머지 여부를 확인하고, 홈 `대표 운명 상담`이 기본 접혀 있는 문제(index.html `<details class="cd-home-fold">`)를 판단한다
---

# 초융합 홈 노출 + 진입/결과 모바일 개선

## 왜

> "메인 화면의 대표 운명 상담에는 초융합 운세를 추가해주고 초융합 운세의 메인 화면이나 결과 ui/ux를 폰트, 모바일 최적화 등을 고려해서 더 개선해줘"

계획: `.claude/plans/bubbly-painting-bumblebee.md` (축 1 = 홈 배너, 축 2 = 초융합 자체 UI).

## 지금 상태

- **머지됨** — #1431(축 1 홈 와이드 배너) · #1435(축 2 폰트·모바일) · #1437.
- **열려 있음(사용자 머지 대기)** — #1438 `fix/fusion-hero-form-anchor`(히어로→폼 CTA), #1440 `fix/diary-iam-persist`(다이어리 확언 저장). 둘 다 CI 전부 통과, 파일이 겹치지 않아 **머지 순서 무관**.
- 계획의 인수 조건 4개는 모두 닫혔다. 축 2 의 "PDF 실캡처 미검증"도 #1438 에서 실렌더로 닫았다.

## 남은 작업

- [ ] **홈 `대표 운명 상담`이 기본 접혀 있다** — `index.html:842-845` 가 `#cdSignatureConsult` · `#fortuneGatewayEntry` · `.cd-home-guide` 를 `<details class="cd-home-fold">` 로 감싼다. 축 1 배너를 넣어도 펼치기 전에는 안 보이므로 발견성 이득이 반감된다. 🔴 **다른 워크트리 `.claude/worktrees/home-pr5-fold`(브랜치 `feat/home-pr7-axis3-perf`)가 같은 마크업을 들고 있을 수 있다 — 손대기 전에 그 브랜치부터 확인할 것.** 접힘을 푸는 것이 맞는지(CLS·LCP 이유로 접었을 수 있다)는 미판정이라 사용자 확인이 필요하다.
- [ ] **360×640 에서 히어로 CTA 아래 여유 7px** (#1438 본문에 기록). 390×844 는 203px 라 실사용 문제는 아니지만, 히어로 문안 블록을 줄이면 더 안전해진다. 판정 기준: 360폭에서 CTA 하단과 뷰포트 사이 여유 ≥ 24px.

## 정본 예시

- 초융합 진입/결과 클라이언트: `app/fusion-fortune/FusionFortuneClient.tsx` (CRLF 파일)
- 그 화면의 CSS: `app/fusion-fortune/fusion-fortune.module.css` (LF)
- 전용 가드: `__tests__/ui/fusion-fortune.static.test.js`

## 함정

- 🔴 `__tests__/ui/**` 는 **jest 가 건너뛴다** — `node --test` 로 돌린다(메모리 `jest-skips-the-static-source-guards`).
- 🔴 결과 화면 실렌더는 **LLM 실호출 없이** 된다 — `worker/lib/fusion-fortune.js` 의 `generateFusionFortuneWithMockLLM` 산출물을 `/api/fusion-fortune/result` 스텁으로 주입하고 `?cid=` 로 진입한다.
- 🔴 기본 PDF 경로 `exportFusionReportPdf` 는 **DOM 캡처가 아니라 jsPDF 텍스트 조판**이다. `data-fusion-pdf-section` 캡처는 R2 한글 폰트 실패 시의 폴백이므로, 타이포·폭 변경은 기본 경로 PDF 본문을 바꾸지 않는다.
- `npm run build` 전에 `npm run fortune:build-data` 를 돌리지 않으면 `fortune/data/daily-<내일>.json` 에서 프리렌더가 죽는다.
- Playwright 라우트 핸들러는 **등록 역순**으로 매칭된다 — catch-all 을 먼저 등록할 것.

## 검증

```
npm run test:node                             # 620 pass (초융합 20 + 다이어리 11)
npm run lint && npm run typecheck
npm run verify:fusion-fortune-pdf             # 12개 장 · 22,810자 계약
npm run verify:hero-contrast
npm run verify:mobile-detail-nonintrusive
npm run verify:public-mirror-fresh            # 🔴 로컬 Windows 는 .ignore 개행 1건으로 위양성
```

## 모르는 것

- 홈 접힘(`cd-home-fold`)이 **의도된 성능 대책인지** 단순 정리인지 근거를 못 찾았다. 풀기 전에 사용자에게 확인할 것.
