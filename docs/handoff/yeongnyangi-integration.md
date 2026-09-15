---
status: active
updated: 2026-09-15
next: SoulCat 레포 codex/soulcat-staging-login-payment 브랜치에서 staging routes `fortune*`·`room*`·`library*`·`ggulggul-fortune*` 와 edge.ts oldScreens 302 를 제거해 CD `/fortune/` 허브 하이재킹을 풀고 워커 재배포(RED, 승인 필요)
---

# 영냥이(SoulCat) 편입 — 홈 노출·계정·결제 준비 상태

## 왜

사용자: 「사주보는 고양이 영냥이」(`C:\Users\user\Desktop\SoulCatProject`)를 CODE DESTINY 에 정식 편입하고, PG MID 미발급 상태에서도 스테이징에 눈에 띄게 노출. 중간 정정: "이미 노출되는데 너무 하단이고 작다 → 위로 올리고 크게".

## 지금 상태

- CD 홈 진입 밴드를 마지막 슬롯(`#cdhGuideSlot`) 뒤에서 **`#cdhQuickSlot`(FORTUNE GATE) 바로 아래**로 이동, "CODE DESTINY NEW WORLD" 밴드로 재설계(2026-09-15, 커밋 `feat(home): promote Yeongnyangi new-world band above the fold`). 게이트는 그대로 `hostname==='staging.code-destiny.com'` — 운영에는 SoulCat 워커 routes/D1 이 없어 CTA 가 404 이므로 사용자 결정으로 스테이징 전용.
- SoulCat 은 별도 워커 `soulcat-service-staging` 이 같은 호스트의 `/yeongnyangi*`, `/_soulcat/*`, `/api/yeongnyangi/*` 를 서빙. 배포 SHA `2348c4e` 는 SoulCat 로컬 브랜치 `codex/soulcat-staging-login-payment`(main 보다 6 커밋 앞, **미푸시**). SoulCat main 워킹트리는 dirty(75 수정/18 미추적) — 이 세션은 건드리지 않았다.
- 계정: SoulCat `server/auth.ts` `sharedUser()` 가 `fortune_auth_token`/`fortune_auth_refresh` 쿠키만 Service Binding(`AUTH_SERVICE → code-destiny-web-staging`)으로 CD `/api/auth/me` 에 넘겨 검증. 별도 회원 DB·URL 토큰·localStorage JWT 없음. 로그인은 CD `/login/?returnTo=` 링크. → 브리프 요구 충족, 변경 없음.
- 결제/공개 분리: `PAYMENTS_ENABLED=false` + `server/payments/catalog.ts` 전 product `enabled:false`. 주문 API 는 503 `PAYMENTS_UNAVAILABLE` fail-closed. 무료 기능(멸치 출석·무료 카테고리·방·프롤로그)은 로그인만 있으면 동작.

## 남은 작업

- [ ] 🔴 **`/fortune/` 허브 하이재킹**(회귀, 보고만): staging `/fortune/`·`/room/`·`/library/`·`/ggulggul-fortune/` → 302 `/yeongnyangi/…`. 원인 SoulCat `wrangler.worker.jsonc` staging routes + `server/edge.ts` `oldScreens`. 운영 `/fortune/` 은 CD 소유 200. 판정: staging `/fortune/` 가 CD `fortune/index.html` 을 200 으로 돌려주면 끝.
- [ ] SoulCat 유료 CTA 의 "준비 중" 전용 모달(브리프 6항): 현재 각주 한 줄(`src/components/FortuneExperience.tsx` `!product.enabled`, `RoomConsultation.tsx`). 대체 행동 2개(무료 운세 먼저 보기 / 영냥이의 방 둘러보기) 포함.
- [ ] CD 저장 프로필(생년월일·출생시간·성별) 자동 재사용(9항): SoulCat 은 자체 D1 `profiles`. CD `/api/profile/current` 를 Service Binding 으로 읽는 SoulCat 측 작업.
- [ ] 운영 노출: SoulCat production env 에 routes/D1/Queue 가 없음. SoulCat 운영 배포 승인 뒤 CD 인젝터 게이트를 `code-destiny.com` 까지 확장.
- [ ] SEO/OG(17항): SoulCat `/yeongnyangi/*` 전부 noindex(오픈 전 의도). 오픈 시 title `사주보는 고양이 영냥이 | CODE DESTINY` 로 SoulCat `layout.tsx` metadata 갱신.
- [ ] SoulCat 브랜치 `codex/soulcat-staging-login-payment` 를 main 에 합치고 push(다른 세션 작업이라 이 세션은 미수행).

## MID 발급 후 할 일 (SoulCat 레포)

1. `wrangler.worker.jsonc` staging `PAYMENTS_ENABLED:"true"`.
2. secrets(`wrangler secret put --env staging`): `PORTONE_API_SECRET`, `PORTONE_STORE_ID`, `PORTONE_CHANNEL_KEY`, `PORTONE_CARD_CHANNEL_KEY`, `PORTONE_KAKAO_CHANNEL_KEY`, `PORTONE_KAKAO_TYPE`, `PORTONE_WEBHOOK_SECRET`. 이름 매핑은 `docs/STAGING-READER-DELIVERY.md`.
3. `server/payments/catalog.ts` 판매 product `enabled:true`, `LLM_VERIFIED_PRODUCTS` 예산 게이트 등록.
4. PortOne 웹훅 `https://staging.code-destiny.com/api/yeongnyangi/payments/webhook`. 실결제 금지 — sandbox 채널만.
5. CD 홈 밴드의 `🐟 생선가게 준비 중` 문구·배지 `영냥이가 손님 맞을 준비 중` 제거(`index.html` `cd-soulcat-navigation-template`).

## 정본 예시

`index.html` `<template id="cd-soulcat-navigation-template">` + 바로 아래 인젝터 IIFE(`data-marker="cd-soulcat-new-world-v20260915"`).

## 함정

- 밴드는 `<template>` 이라 서버 HTML 에 직접 안 보인다. curl 로는 template 존재만, 렌더는 브라우저에서.
- 에셋은 레포에 복사하지 않고 SoulCat 워커가 서빙하는 `/_soulcat/assets/*` 를 참조 — SoulCat 배포가 내려가면 이미지만 빈다(텍스트·CTA 는 유지).
- 생선 이미지(240×108)는 물고기가 이미지 전체를 채우므로 크롭하지 말고 `object-fit:contain` 으로 통째 표시.

## 검증

```
npm run check:fast
curl -s https://staging.code-destiny.com/ | grep -c cd-soulcat-navigation-template
curl -s -o NUL -w "%{http_code}" https://staging.code-destiny.com/yeongnyangi/free-fortune/
```

## 모르는 것

- SoulCat codex 브랜치의 미푸시 6 커밋이 다른 세션에서 진행 중인지 — 사용자 확인 필요.
