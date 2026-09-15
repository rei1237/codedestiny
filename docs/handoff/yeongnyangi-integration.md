---
status: active
updated: 2026-09-15
next: 1단계 결제 일원화 — CD `paid-feature-registry.js` 에 영냥이 상품을 회당 결제 featureKey 로 등록하고 SoulCat 결제 CTA 를 CD 결제창(`/checkout?featureKey=…&returnTo=/yeongnyangi/…`)으로 보낸 뒤 SoulCat 이 Service Binding 으로 CD 증빙을 조회하게 바꾼다(RED, 양 레포, 승인 필요). 착수 전 PG 사에 "같은 code-destiny.com 호스트의 기존 MID·기존 결제창으로 영냥이 상품 판매 시 추가 MID 불요" 를 확인한다.
---

# 영냥이(SoulCat) 편입 — 방향 결정과 남은 작업

## 결정 (2026-09-15, 사용자 승인)

**하이브리드**: 사용자·사업 관점은 한 사이트(신원·지갑·SEO 트리·탈퇴 통합), 개발 관점은 SoulCat Worker + D1 런타임 유지. 계획 정본은 `C:\Users\user\.claude\plans\6-replicated-lynx.md`(세션 로컬) — 핵심은 아래에 옮겨 둔다.

- SEO 는 서버 통합과 무관. 같은 호스트 `/yeongnyangi/` 서브디렉터리로 도메인 권위는 이미 공유. 남은 SEO 과제는 sitemap 편입·noindex 해제·중복 canonical.
- **별도 MID 신청 중단.** 결제는 CD PortOne 스토어 + `worker/lib/paid-feature-registry.js` 로 일원화.
- Mongo 이식은 하지 않음. 병합 전환 기준: (a) 영냥이 월 유료 주문이 CD 유료 주문의 30% 초과, (b) CD 엔진 정정이 SoulCat `server/vendor/code-destiny/` 사본(22.8k 줄)에 반영되지 않아 결과 차이가 보고됨. 둘 중 하나면 병합 착수.

## PG 계약 확인 항목 (사용자 요청, 미확인)

사용자는 PG 사로부터 "도메인이 다르면 MID 추가 발급 필요" 안내를 받았다. 이 계획에서는 결제가 **기존 호스트(code-destiny.com)의 기존 결제창**에서 일어나므로 도메인이 달라지지 않는다. 다음을 PG 담당자에게 확인 후 여기에 기록한다.
1. 현재 MID 에 등록된 사이트 URL 이 `code-destiny.com`(호스트 단위)인지, 특정 경로까지인지.
2. 같은 호스트·같은 사업자에서 판매 상품군(영냥이 운세 책)이 추가될 때 신고만 필요한지, 계약 변경이 필요한지.
3. 결제 완료 후 `returnTo` 가 `/yeongnyangi/…` 경로여도 문제없는지(리다이렉트 URL 허용 목록 여부).
예상: 추가 MID 불요. 확인 전까지는 추정.

## 지금 상태

- **0단계 완료(2026-09-15)**: SoulCat 커밋 `d246d48`(codex 브랜치, 워크트리 `C:\Users\user\Desktop\SoulCatProject-staging-login-payment`)에서 staging routes `fortune*`·`room*`·`library*`·`ggulggul-fortune*` 4개와 `server/edge.ts` `oldScreens` 302 제거, 테스트·OPERATIONS-READINESS 갱신. `npm test` 7/7, tsc 무오류, dry-run 성공.
- 🔴 배포 함정: `wrangler deploy` 직접 호출은 `SOULCAT_PAGES_ORIGIN`·`RELEASE_SHA` 를 빠뜨려 `/yeongnyangi/*` 가 503 이 됐다. 정식 경로는 `node scripts/deploy-staging.mjs <immutable-preview-url>` 이며 **고정 Pages preview 의 SHA 가 HEAD 와 같아야** 한다(새 커밋 뒤에는 build → Pages preview 업로드 선행). 즉시 `wrangler rollback` 으로 복구(현재 워커 버전 `be245542`, 코드는 `2348c4e`).
- 라우트는 버전과 별개 트리거라 제거 상태가 유지됨. 실측: `/fortune/` CD 200(무료 운세 허브), `/room/`·`/library/`·`/ggulggul-fortune/` CD 404(CD 에 없는 경로, 정상), `/yeongnyangi/`·`/yeongnyangi/free-fortune/`·`/api/yeongnyangi/products`·`/_soulcat/version.json` 200, `/_soulcat` 302. **하이재킹 해소 확인.**
- 워커 코드에는 아직 옛 `oldScreens` 가 남아 있지만 라우트가 없어 도달 불가. 다음 정식 배포(다른 세션의 LLM 최적화 작업과 함께)에서 `d246d48` 코드가 실린다.
- SoulCat codex 브랜치는 다른 세션이 LLM 최적화 작업 중(미푸시 7커밋). 이 세션은 위 4파일 1커밋만 얹었다.
- CD 홈 밴드: `#cdhQuickSlot` 아래 "CODE DESTINY NEW WORLD", 게이트 `hostname==='staging.code-destiny.com'`. 정본 `index.html` `<template id="cd-soulcat-navigation-template">` + 인젝터 IIFE(`data-marker="cd-soulcat-new-world-v20260915"`).
- 계정: SoulCat `server/auth.ts` `sharedIdentity()` 가 CD 쿠키만 Service Binding 으로 `/api/auth/me` 에 넘겨 검증. D1 키 `codedestiny:<id>`. 변경 없음.
- 🔴 범위 밖: main CI `AI Locale Gate` 가 `9fa1c714f` 부터 `recoverGeomancy is not defined` 로 실패 중(다른 세션 축).

## 남은 작업 (각 단계 별도 세션·별도 승인)

- [ ] **1. 결제 일원화 (RED, 양 레포)** — CD: `paid-feature-registry.js` 에 `yeongnyangi-<system>-<tier>` 회당 결제 키 등록(SoulCat `server/payments/catalog.ts` 6 체계 × 4 어종 1,000/3,000/5,000/10,000 + 퓨전 4종), 이용권 제외(passExcluded)·월정석 차감 허용을 `docs/context/payment-gating.md` 에 명시, Service Binding 전용 증빙 조회 API 추가. 가장 가까운 구현 `worker/routes/vedic-ai.js`. SoulCat: `POST orders`·webhook·verify·PortOne 비밀 7종 제거, `entitlements` 를 CD 판정 캐시로 격하, `docs/DOMAIN-INTEGRATION.md` 별도 MID 조항 폐기. 검증: `verify:paid-feature-billing-policy`·`verify:billing-pass-policy`·`verify:portone-single-payment`, SoulCat `npm test`, 스테이징 mock 결제 1회. 실결제 금지.
- [ ] **2. 프로필 재사용 (SoulCat)** — `sharedIdentity()` 방식으로 `/api/profile/current` 를 읽어 `ProfileCard`(name·gender·birth·location)를 `profiles.input_json` 프리필.
- [ ] **3. SEO 오픈 (양 레포, 운영 배포와 함께)** — CD `scripts/generate-sitemap.mjs` `coreRoutes` 에 `/yeongnyangi/*` 등록 + 색인 판정 5개소 동기(`docs/context/seo-and-adsense.md:64-76`). SoulCat `src/app/layout.tsx:11` 전역 noindex 해제, `robots.txt` Disallow 제거, library·share 는 noindex 유지. `/yeongnyangi/terms|privacy|refund` 는 CD 법무 페이지로 canonical, `/yeongnyangi/ggulggul-fortune/` 은 CD `/kkul-kkul-unse` 와 키워드 경쟁하므로 sitemap 제외 또는 canonical `/`.
- [ ] **4. 탈퇴 연동 (RED, 양 레포)** — CD `POST /api/auth/withdraw` 가 SoulCat D1 `codedestiny:<id>` 행을 모른다(SoulCat 에 수신 엔드포인트 없음, `worker/routes/auth.js:5441-5468` 에 외부 호출 없음). Service Binding 으로 SoulCat `DELETE /api/yeongnyangi/account` 호출, 실패 시 탈퇴를 막지 않고 재시도 로그.
- [ ] **5. 운영 노출 (RED, 1회 승인)** — SoulCat production routes/D1/Queue 생성, CD 인젝터 게이트를 `code-destiny.com` 까지 확장, 홈 밴드 "🐟 생선가게 준비 중"·"영냥이가 손님 맞을 준비 중" 제거.
- [ ] 유료 CTA "준비 중" 모달(브리프 6항): `src/components/FortuneExperience.tsx` `!product.enabled`, `RoomConsultation.tsx`. 대체 행동 2개 포함.

## 함정

- 밴드는 `<template>` 이라 서버 HTML 에 직접 안 보인다. 렌더는 브라우저에서.
- 에셋은 SoulCat 워커가 서빙하는 `/_soulcat/assets/*` 참조 — SoulCat 배포가 내려가면 이미지만 빈다.
- 생선 이미지(240×108)는 `object-fit:contain` 으로 통째 표시.
- SoulCat 워커는 `scripts/deploy-staging.mjs` 로만 배포한다. 직접 `wrangler deploy` 는 503 을 만든다(위 참조).
- `/fortune/` 302 가 보이면 엣지 캐시다. `?cb=` 를 붙여 재확인.

## 검증

```
npm run check:fast
curl -s https://staging.code-destiny.com/ | grep -c cd-soulcat-navigation-template
curl -s -o NUL -w "%{http_code}" "https://staging.code-destiny.com/fortune/?cb=1"            # 200 (CD)
curl -s -o NUL -w "%{http_code}" "https://staging.code-destiny.com/yeongnyangi/free-fortune/?cb=1"   # 200 (SoulCat)
```
