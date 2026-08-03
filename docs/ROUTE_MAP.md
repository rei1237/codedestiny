# Route Map

## 공개 페이지

- 홈 정적 셸: `/`, `/index.html`
- 주요 허브: `/saju`, `/tarot`, `/ziwei`, `/sukuyo`, `/vedic`, `/astrology`, `/today`, `/daily-fortune`, `/insights`, `/reviews`, `/music`
- 사주: `/saju/basic/play`, `/saju/compatibility`, `/saju/five-elements`, `/saju/ten-gods`, `/saju/guide`, `/manse`
- 자미두수: `/ziwei`, `/ziwei/chart`, `/ziwei/guide`, `/island-consult`
- 숙요점: `/sukuyo`, `/sukuyo/compatibility`, `/sukuyo/calendar`, `/oracle/sukuyo`, `/sukyo`
- 점성술/베다: `/astrology`, `/astrology/cosmic`, `/astrology/guide`, `/vedic`, `/vedic/jyotish`, `/vedic/guide`
- 타로: `/tarot`, `/tarot/mingri`, `/tarot/mingri/play`, `/tarot/love`, `/tarot/reunion`, `/tarot/mindscan`, `/tarot/healing`, `/tarot/prompt-maker`
- 오라클/기타: `/oracle/rune`, `/oracle/royal-tea`, `/oracle/ifa`, `/oracle/hwatu-life`, `/oracle/sikojen-povailu`, `/maya`, `/palm-reading`, `/physiognomy`, `/dream`, `/fpti`
- SEO/정책: `/about`, `/faq`, `/methodology`, `/privacy-policy`, `/terms-of-service`, `/disclaimer`, `/advertising-policy`, `/editorial-policy`, `/contact`
- 로케일: `/en`, `/ja`, `/zh`, `[locale]` 하위 일부 route

## 로그인 필요 페이지

- `/me`
- `/points`
- `/points/history`
- `/account/delete`
- AI 상담 결과/이어쓰기 중 사용자 저장 결과가 필요한 route
- 프로필 카드 추가/삭제와 결제 복구 UI

## 결제 필요 또는 결제 가능 페이지

- `/life-book-ai`, `/life-book-ai/result`
- `/love-secret-ai`, `/love-secret-ai/result`
- `/ziwei-ai`
- `/master-love-codex`, `/master-love-codex/result`
- `/karma-destiny-ai`, `/karma-destiny-ai/result`
- `/vedic-ai`, `/vedic-ai/result`
- `/astrology-ai`, `/astrology-ai/result`
- `/sukuyo-compatibility-ai`
- `/fortune-tea-house`
- `/neo-operation-room`, `/neo-operation-room/result`
- `/destiny-compass`
- `/naming-ai`, `/naming-ai/result`
- `/tarot/prompt-maker`, `/tarot/year`, 일부 oracle premium
- `/music` 다운로드 기능

정확한 유료 여부와 가격은 `worker/lib/paid-feature-registry.js`와 `docs/payment-policy-content-access.md`가 우선이다.

## 관리자 페이지

- `/admin`
- `/admin/login`
- `/admin/orders`
- `/admin/reviews`
- `/admin/cms`
- `/admin/content`
- `/admin/insights`
- `/admin/monthly-credits` — 마케팅 월정석 지급 UI
- `/admin/site-content`
- `/admin/cache-status`

관리자 API는 `/api/admin/*`이며 `worker/routes/admin.js`가 우선이다.

- `POST /api/admin/monthly-credits/grant` — 관리자 전용 마케팅 월정석 지급(운영 플래그 필요)

## Next.js App API Routes

정적 export/Worker 운영에서 실제 사용 여부는 확인 필요다. 운영 API 정본은 일반적으로 Worker다.

- `app/api/hello/route.ts`
- `app/api/vedic-reading/route.ts`
- `app/api/kasi/calendar/route.ts`
- `app/api/sukuyo/calendar/route.ts`
- `app/api/sukuyo-basic/route.ts`
- `app/api/palm/analyze/route.ts`
- `app/api/tarot/draw/route.js`
- `app/api/tarot/reading/route.js`
- `app/api/tarot/love-reading/route.js`
- `app/api/tarot/mindscan/route.js`
- Worker `GET /api/tarot/year/result?year=YYYY|resultId=...` — 로그인 사용자의 저장된 연간 리딩 재조회
- `app/api/tarot/crystal-soul/route.js`
- `app/api/celestial-harmony/route.js`
- `app/api/neo-operation-room/[...path]/route.ts`
- `app/api/fortune-tea-house/consult/route.ts`
- `app/api/fortune-tea-house/results/[...slug]/route.ts`
- `app/api/fortune-tea-house/results/honey-letter/route.ts`
- `app/api/fortune-tea-house/honey-drops/balance/route.ts`
- `app/api/fortune-tea-house/honey-drops/tarot-album/unlock/route.ts`

## Workers Endpoints

Entry: `worker/index.js`

- Health/status: `/api/health`, `/api/health/auth-env`, `/api/health/route-metrics`, `/api/status`, `/api/version`
- Utility: `/api/geo`, `/api/geocode`, `/api/pexels-image`
- Auth: `/api/auth/*`, `/api/session`, `/api/me/payment-phone`
- Admin/content: `/api/admin/*`, `/api/cms/*`, `/api/content/*`, `/api/content-feed/*`, `/api/insights/*`
- Reviews/feedback: `/api/reviews/*`, `/api/feedback/*`
- Payments/access: `/api/payments/*`, `/api/payment/*`, `/api/checkout/*`, `/api/billing/*`, `/api/access/*`, `/api/unlocks/*`, `/api/points/me`, `/api/points/balance`
- Legacy COIN compatibility: `/api/billing/coin-gate` (route name retained; new COIN debit is disabled), `/api/fortune/pig-coin/*` (read-only historical compatibility or `PAYMENT_REQUIRED`)
- App store: `/api/app-store/*`
- User/profile/subscription: `/api/user/*`, `/api/profile/*`, `/api/profiles/*`, `/api/subscriptions/*`, `/api/subscription/status`, `/api/subscription/me`, `GET /api/me/access-state?profileId=...` (complete account/current-profile access bootstrap snapshot)
- Fortune core: `/api/fortune/*`, `/api/tarot/*`, `/api/fpti/*`, `/api/celestial-harmony/*`, `/api/dream/*`, `/api/oracle/*`, `/api/kasi/*`, `/api/palm/*`, `/api/destiny-bias/*`
- Saju AI: `/api/life-book-ai/*`, `/api/love-secret-ai/*`, `/api/saju-new-year/*`, `/api/new-year-ai/*`, `/api/karma-destiny-ai/*`, `/api/guardian/*`, `/api/naming-prompt/*`
- Ziwei: `/api/ziwei-ai/*`, `/api/ziwei-deep-report/*`, `/api/ziwei/daehan/*`, `/api/ziwei-island-ai/*`, `/api/ziwei-island-report/*`, `/api/ziwei-island/*`
- Pet/compass: `/api/pet-saju-ai/*`, `/api/pet-saju/*`, `/api/destiny-compass-ai/*`, `/api/destiny-compass/*`
- 상담 캐릭터: `/api/fortune-tea-house/*`, `/api/neo-operation-room/*`
- Astrology/Vedic/Sukuyo/Nakshatra: `/api/astro/*`, `/api/astrology/*`, `/api/astrology-ai/*`, `/api/vedic/*`, `/api/vedic-ai/*`, `/api/sukuyo/*`, `/api/sukyo/*`, `/api/sukuyo-compatibility-ai/*`, `/api/nakshatra/*`, `/api/nakshatra-ai/*`, `/api/nakshatra-premium/*`
- Music/RPG: `/api/music/*`, `/api/rpg/*`

## 더 이상 쓰지 않는 것으로 보이는 라우트

- `/sukyo`는 `/sukuyo` alias/redirect 성격이다.
- `/face-reading`은 `_redirects`에서 `/physiognomy`로 이동한다.
- `/saju/lifebook`은 `/life-book-ai`로 redirect된다.
- `/saju/love-secret`은 `/love-secret-ai`로 redirect된다.
- `/en-us`, `/ja-jp`, `/zh-cn`은 `/en`, `/ja`, `/zh`로 redirect된다.
- `/blog/*`는 `/insights/*`로 redirect된다.
- 다수 루트 HTML 파일은 legacy/static noindex 자산으로 보인다. 예: `/vedic-astrology.html`, `/destiny-island.html`, `/secret-house_real.html`, `/royal-tea-oracle.html`

## 확인 필요한 라우트

- `app/api/*`: Cloudflare Pages 정적 export와 Worker 구성에서 운영 호출 여부 확인 필요
- `server/routes/*`: Worker 포팅이 끝난 경로와 fallback으로 남은 경로 구분 필요
- `/premium/*`, `/premium-reports`, `/premium-unlock`: 실제 결제 상품/권한 매핑 확인 필요
- `/app/*`: Capacitor 앱 번들에서 pruning된 route와 웹 route 차이 확인 필요
- 정적 HTML 게임/오라클 파일: 현재 홈/서비스 카드에서 링크되는지, noindex 의도인지 확인 필요
