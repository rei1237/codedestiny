---
status: active
updated: 2026-08-30
next: "히어로 문구 변경 후 390x844 실기기에서 줄 수·히어로 높이·CLS 를 재고, 이상 없으면 docs/code-destiny-audit.md §5 P2 로 넘어간다"
---

# 홈 히어로 포지셔닝 (교차검증을 H1 로)

## 왜

사용자 요구: "새 기능을 무분별하게 추가하지 말고 기존 자산을 보존하면서 서비스 이해도·전환을 개선하라. 첫 방문자가 5초 안에 차별점을 이해해야 한다."
실측 결과 H1 이 **폭(breadth)** 을 팔고 차별점(여섯 체계 교차검증)은 2차 CTA 로 강등돼 있었다.

## 지금 상태

- 브랜치 `worktree-home-hero-positioning-0830`. PR 1건, **미머지**.
- 감사 문서 [docs/code-destiny-audit.md](../code-destiny-audit.md) 신규 — 요청 20단계 매핑 + 남은 로드맵 P1~P6 이 거기에 있다.
- 이번 변경은 **포지셔닝 문구 + 카드 순서 + 배지 재조준**뿐. 삭제 0건, 라우트·결제 경로 변경 0건.

## 남은 작업

- [ ] **실기기 CLS 검증** — 390x844 에서 H1/lead 줄 수가 변경 전과 같은지. 판정 기준: 히어로 높이 변화 0px, CLS 증가 0. `verify:hero-firstpaint-lock` 은 마크업 구조만 보므로 이걸 대신하지 못한다.
- [ ] **비색인 7개 로케일**(vi·hi·es·fr·de·nl·ms)의 lead·2차 CTA 는 옛 문구 그대로다. 의도된 보류. 되살리려면 손으로 쓴다 — `i18n:translate-pending` 은 과금 실호출이라 금지.
- [ ] 로드맵 P2 이후는 감사 문서 §5.

## 정본 예시

`index.html:9257` (H1) · `scripts/verify-hero-firstpaint-lock.mjs:43` (`TRUST_TARGETS`)

## 함정

- 🔴 **배지 3번의 목적지를 바꾸면 가드도 같이 고쳐야 한다.** `verify-hero-firstpaint-lock.mjs` 의 `TRUST_TARGETS` 가 배지 3개의 앵커 id 를 문자열로 박아 두고 있어, 마크업만 고치면 가드가 실패한다.
- 배지 3번은 `#honeyMembershipMini` → `#cdWhyUs` 로 **재조준**했다. 섹션·`/points` 라우트·결제창 [이용권으로 구매] 카드는 그대로다. 되돌리려면 마크업·JS 폴백 배열(`index.html` 의 `home.heroTrust.*` 배열)·`TRUST_TARGETS` 세 곳을 함께 되돌린다. 옛 키 `home.heroTrust.membership{,Aria}` 는 12개 사전에 **남겨 뒀다.**
- 클릭 리스너의 `data-cd-hero-trust-kind === 'membership'` 분기는 이제 히어로에서 도달하지 않는다. **지우지 않고 남겼다** — 배지를 되돌릴 때 필요하다.
- lead 는 자동해시 키 `shell.normalLogo.moonHeroCopy.kbm4p3d` 를 쓴다. 명명 키 `home.hero2.lead` 가 12개 사전에 따로 있지만 **마크업이 안 쓰는 죽은 키**다. 이관하면 고아 키만 생겨 하지 않았다.
- 🔴 `i18n/authored/*.json` 은 항목 사이 빈 줄이 있는 사람 대조표다. `JSON.stringify` 로 다시 쓰면 빈 줄 39개가 사라져 무관한 diff 가 난다 — **값 문자열만 텍스트 치환**할 것. `public/i18n/*.json` 은 2-space stringify 로 왕복 일치(12/12 확인).

## 검증

```
npm run sync:public && npm run verify:public-parity
npm run verify:hero-firstpaint-lock
npm run verify:entry-encoding -- --strict-core
npm run verify:hero-contrast && npm run verify:mobile-detail-nonintrusive
npm run verify:home-service-registry && npm run verify:locale-main-sync
npm run i18n:check
npm run lint && npm run typecheck && npm test && npm run test:node
npm run build   # [adsense-readiness] OK 확인
```

## 모르는 것

- 새 H1·lead 가 실제로 이해도를 올리는지는 **계측이 없어 알 수 없다**. `useAnalytics` 훅은 호출자 0(2026-08-30 `git grep`)이다. 감사 문서 §5 P4 가 그 선행 작업이다.
