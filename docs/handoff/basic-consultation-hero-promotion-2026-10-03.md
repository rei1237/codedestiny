---
status: done
updated: 2026-10-04
next: 없음 — 사용자 지시로 운영 승격은 하지 않고 스테이징 확인으로 종료했다. 운영 반영은 다음 정기 승격에 함께 실린다.
---

# 기본 상담 히어로 이미지 + 자미두수 접기 UX — 완료(스테이징 확인, 운영 승격 보류)

## 종료 (2026-10-04)

- 사용자: "작업이 많으므로 운영 승격은 하지말고 스테이징에 적용되었는지만 체크해".
- 스테이징 `5260a9812` Pages·Worker SHA 일치, 자미두수·숙요·점성·베다 4상품 × 3폭 히어로 img 표시·`loading=eager`, 자미두수 접기 CSS 배포 확인.
- 아래 "남은 작업"의 승격 항목은 사용자 지시로 취소됐다. 다음 정기 운영 승격 뒤 위 4상품 이미지를 한 번 확인하면 된다.

## 왜

사용자 요청 1: "아직도 기본 자미두수 등의 상담에 기본 이미지가 안들어가있는 문제가 있는데 기본 자미두수, 베다점, 숙요점 상담 등에 이미지가 반드시 들어가도록 수정 후 운영 배포까지 진행해"
사용자 요청 2: "기본 자미두수 기능에서 UI/UX적으로 열고 닫는것이 직관적이지 않고 숨겨져있는것 같아 … 깔끔하게 제대로 접고 여는것이 직관적으로 보이도록 ui/ux 전문가로서 최적화해줘"

## 지금 상태

- main 반영·CI 통과: `72800d7ab`(히어로 img 숨김 제외 + 모바일 lazy 예외), `cec0a9480`(sync 수렴 — 1회 sync 는 해시 한 단계만 전파해 미러 가드가 실패했다).
- main 반영: `7c02f3ecf`(자미두수 궁 요약의 접기 카드·32px 셰브론 칩·44px "요약 닫기" 알약, `#ziweiModalOverlay` 한정 CSS). 로컬 check:fast·verify-basic-fortune-library·verify:ziwei-chart-detail-view·시각 판정 통과.
- 운영 승격은 **보류**(사용자 선택 2026-10-03): 승인 뒤 main 에 꿀꿀 홈 개편 커밋(`947c10e86`·`b97b29804`·`08ac8e4d8`·`e79e78bac`·`4882f9e20`, 워크트리 `ggulggul-home-art-20261003-181209`)이 올라왔고, `e79e78bac` PR CI 가 `verify:home-service-registry`(tarot 카드 href `#tarotCollection` ≠ 레지스트리 `/index.html?action=openTarotModal`)로 실패했으며 `docs/design/ggulggul-illustrated-home.md` 상 최신판 시각 검토가 대기 중이다. 릴리스는 main HEAD 만 내보내므로 홈 완료 뒤 함께 승격한다.
- `7c02f3ecf` PR CI 도 Static guards 실패: `__tests__/ui/feature-visual-details.test.mjs` "restored hero artwork, catalog reuse, and collection previews stay in sync"(마스터 운명 연애 비책.webp 기대). 부모 `4882f9e20`(홈 커밋)에서도 같은 1건이 실패한다(로컬 실측) — 홈 세션 회귀이며 자미두수 CSS 와 무관.
- 운영 실측(수정 전): 자미두수 히어로 img `hidden=true`·`display:none`(전 폭, Chromium·WebKit).

## 남은 작업

- [ ] 꿀꿀 홈 세션의 CI 초록·시각 검토 완료 확인(`gh run list --commit $(git rev-parse origin/main)`).
- [ ] 사용자에게 운영 SHA..main HEAD 범위를 적어 승격 승인을 다시 받는다(이전 승인은 승인 시점 범위 한정).
- [ ] 한 명령 dispatch: `git fetch` → `rev-parse origin/main` 이 승인 SHA 와 같을 때만 `gh workflow run "Release Cloudflare Pages and Worker" --ref main -f mode=production` → `gh run view <id> --json headSha`.
- [ ] 운영 1회 확인: `/ggulggul/?action=cdOneStepFreeSajuEntry` 진입 뒤 자미두수·숙요·점성·베다 히어로 img 가 `hidden=false`·높이>100·`loading=eager` 인지.

## 정본 예시

`js/core/saju/basicFortunePresentation.js` 의 아틀라스 img 숨김 줄 — `if (!img.closest('.fc-entry__scene')) img.hidden = true;` 상담 장면은 장식이 아니라 상품 이미지라 제외한다.

## 범위 밖 결함(보고만)

- `vedic-astrology.html` 이 `fortune-consultation-ui.js?v=build-000000000000` 고정 캐시 키를 쓴다(max-age 7일 + swr 30일) — 수정이 늦게 퍼질 수 있다.
- 숙요·점성 모달의 접기 UI 는 이번 자미두수 한정 개선과 시각 언어가 다르다. 카드 테두리(1.7~1.9:1)는 장식선이라 3:1 미만.
