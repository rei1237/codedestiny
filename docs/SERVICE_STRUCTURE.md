# Service Structure

## 서비스 한 줄 정의

Code Destiny는 사주, 자미두수, 숙요점, 점성술, 베다 점성술, 타로, AI 상담, 음악실, PDF 리포트, 결제/이용권을 함께 제공하는 운세/상담 웹서비스다.

## 기술 스택

- Framework: Next.js 15 App Router, React 18
- Language: TypeScript 5.5, JavaScript 혼용
- Styling: Tailwind CSS 3.4, 전역 CSS, R2 hosted Code Destiny fonts
- Runtime: Node.js 20 이상, Cloudflare Pages, Cloudflare Workers
- API: Worker-native fetch router 중심, 일부 Next `app/api/*`, 레거시 Express `server/**`
- DB: MongoDB Atlas, Mongoose 중심 Worker 모델, 일부 App/Server 모델
- Payment: PortOne V2, KG이니시스 채널
- AI: Gemini REST, Cloudflare Workers AI fallback, 일부 로컬 엔진 fallback
- Assets: `public/**`, `fuctionassets/**`, R2 custom domains, music R2 bucket
- Mobile: Capacitor Android wrapper under `apps/mobile/**`

## 전체 아키텍처 요약

- 정적 홈/메인 셸: 루트 `index.html`이 실사용 원천이다. `app/page.js`는 홈 운영 화면의 정본이 아니다.
- React route UI: `app/**`의 App Router 페이지가 기능별 화면, 관리자, 인사이트, 결과 페이지를 담당한다.
- Worker API: `worker/index.js`가 `/api/*` 요청을 라우팅하고, `worker/routes/**`가 인증/결제/AI/콘텐츠 API를 처리한다.
- 레거시 API: `server/**`는 Express fallback 또는 로컬 개발 참고다. 운영에서 동등 Worker 라우트가 있으면 Worker가 우선이다.
- 데이터: Worker는 `worker/lib/db.js`와 `worker/lib/models.js`의 Mongoose 모델을 사용한다.
- 결제/권한: `worker/routes/billing.js`, `worker/routes/payments.js`, `worker/lib/paid-feature-registry.js`, `worker/lib/profile-limits.js`가 중심이다.
- LLM: `lib/llm-client.ts`, `worker/lib/gemini.js`, `worker/lib/structured-consultation.js`, AI feature routes가 중심이다.

## 주요 기능군

- 사주: 기본 명식, 대운/세운, 궁합, 신년운, 인생의 책, 연애 비책, 작명, FPTI, 반려동물 사주, 수호동물, 최애운명
- 자미두수: 기본 차트, 12궁, 대한 흐름, 운명의 섬, 전문가 AI 상담
- 숙요점: 기본 숙요, 숙요 궁합, 인연 레이더, 숙요 AI 궁합, 나크샤트라 관련 기능
- 점성술/베다: 서양 점성술, 점성술 AI, 베다 Jyotish, 베다 AI, 나크샤트라
- 타로/오라클: 타로 리딩, 연애/재회/마인드스캔/프롬프트 메이커, 룬, IFA, 로열티, 화투, 드림 타로
- AI 상담: 운명의 찻집, 네오의 팩폭 전략실, 인생의 책, 연애 비책, 운명 나침반, 카르마 운명, 작명 AI
- 부가 기능: 음악 감상실, PDF 저장/다운로드, 리뷰, 피드백/버그 제보, 관리자 CMS/주문/리뷰/캐시

## 라우트 구조

- 정적 셸: `/`, `/index.html`, `public/static/index.html`, `public/{en,ja,zh}/index.html`
- 주요 공개 App Router: `/saju`, `/saju/basic/play`, `/ziwei`, `/ziwei/chart`, `/sukuyo`, `/vedic`, `/astrology`, `/tarot`, `/insights`, `/music`, `/reviews`
- 로그인 필요: `/me`, `/points`, 일부 결과/상담 continuation, 프로필 카드 관리
- 결제 필요 또는 결제 가능: `/life-book-ai`, `/love-secret-ai`, `/ziwei-ai`, `/master-love-codex`, `/neo-operation-room`, `/fortune-tea-house`, `/vedic-ai`, `/astrology-ai`, `/sukuyo-compatibility-ai`, `/naming-ai`, 일부 tarot/oracle premium
- 관리자: `/admin`, `/admin/login`, `/admin/orders`, `/admin/reviews`, `/admin/cms`, `/admin/insights`, `/admin/cache-status`
- 모바일 앱: `/app`, `/app/store`
- API: 자세한 목록은 `docs/ROUTE_MAP.md` 참고

## 공개 SEO 엔터티와 토픽 클러스터

- 공용 정본: `lib/seo/entity-registry.mjs`. 한국어 공개 허브별 Primary/Secondary/Long-tail 검색 의도와 관련 링크를 관리한다.
- 브랜드 식별자: `CODE DESTINY`, `CodeDestiny`, `code-destiny`, `코드데스티니`, `코드 데스티니`, `CODEDESTINY`, `꿀꿀운세`, `꿀꿀만세력`은 Organization/WebSite 및 브랜드 안내에서만 사용한다. 기능 페이지에 모든 별칭을 반복하지 않는다.
- 핵심 허브: 사주 → 자미두수 → 숙요점 → 베다 점성술 → 서양 점성술의 흐름과 타로·궁합·오늘의 운세·꿈해몽을 맥락 링크로 연결한다.
- `초융합 운세`는 브랜드 안내·Organization `knowsAbout`·보이는 FAQ에 사전 엔터티로 명시한다. `fusion-fortune` 기능의 공개 URL·입력·결과 계약이 병합되어 검증되기 전에는 준비 중인 경로로 내부 링크나 색인 신호를 만들지 않는다.
- 네이버 우선 운영에서는 한국어 제목·설명뿐 아니라 보이는 정의 문단, FAQ, 내부 링크, 루트 robots 및 sitemap 계약을 함께 유지한다. Google·Bing 90일 데이터가 없을 때에는 키워드 볼륨을 추정해 확장하지 않는다.
- URL별 키워드 우선순위는 Search Console·네이버·Bing의 최근 90일 데이터로 갱신한다. 데이터가 없을 때에는 키워드 확장이나 순위 약속을 하지 않는다.

## API 구조

- Entry: `worker/index.js`
- Public/status: `/api/health`, `/api/status`, `/api/version`, `/api/geo`, `/api/geocode`, `/api/pexels-image`
- Auth/profile: `/api/auth/*`, `/api/session`, `/api/me/payment-phone`, `/api/user/*`, `/api/profile/*`, `/api/profiles/*`
- Payment/access: `/api/payments/*`, `/api/payment/*`, `/api/checkout/*`, `/api/billing/*`, `/api/access/*`, `/api/unlocks/*`, `/api/points/me`
- Content/admin: `/api/admin/*`, `/api/cms/*`, `/api/content/*`, `/api/content-feed/*`, `/api/insights/*`, `/api/reviews/*`, `/api/feedback/*`
- Fortune/AI: `/api/fortune/*`, `/api/life-book-ai/*`, `/api/love-secret-ai/*`, `/api/ziwei-ai/*`, `/api/fortune-tea-house/*`, `/api/neo-operation-room/*`, `/api/vedic-ai/*`, `/api/astrology-ai/*`, `/api/sukuyo-compatibility-ai/*`

## 데이터 흐름

1. 사용자가 정적 셸 또는 App Router 화면에서 입력한다.
2. 클라이언트는 같은 origin `/api/*`를 호출한다.
3. Worker가 JWT/session, rate limit, security guard, 결제/권한을 확인한다.
4. 필요한 경우 로컬 계산 엔진이 사주/자미/숙요/점성/타로 기반 데이터를 만든다.
5. 유료 AI 기능은 결제 또는 이용권/월정석 처리를 거친 뒤 LLM 생성 또는 캐시 조회를 수행한다.
6. 결과는 MongoDB 상담/리포트 컬렉션에 저장되거나 클라이언트에서 즉시 표시된다.
7. PDF 기능은 검증된 JSON/결과를 기반으로 렌더 및 다운로드를 제공한다.

## 결제 흐름

최신 정책은 `docs/payment-policy-flow.md`와 `docs/PAYMENT_AND_ACCESS.md`가 우선이다.

1. 로컬 이용권 스냅샷이 커버를 확답하면 즉시 무료 통과한다.
2. 그 외에는 결제창을 열고 `이용권으로 구매`, `단건 결제`, `월정석`을 함께 제시한다.
3. `이용권으로 구매`를 선택한 요청만 Worker가 이용권 커버를 최종 확인한다. `단건 결제`는 클릭 후 PortOne 주문·결제·confirm을 각각 한 번 거친다.
4. PortOne 결제 완료/웹훅/검증 후 `Payment`, `PointHistory`, `ContentEntitlement`, `PaidExecutionRecord` 등 관련 기록을 갱신한다.
5. 실패하면 복구/환불/월정석 복구 경로를 확인한다.

## LLM 상담 흐름

1. 결제/접근 권한 확인
2. 사용자 입력 정규화 및 로컬 계산 엔진 실행
3. 프롬프트 생성
4. 캐시/중복 요청 확인
5. Gemini 호출, 실패 시 Workers AI fallback
6. 결과 품질/분량/스키마 검증
7. DB 저장 및 결과 응답
8. 실패 시 결제/권한/월정석 복구 가능성 확인

테스트는 mock만 사용한다. 실제 LLM API 호출은 사용자 명시 승인 후 1회 한정으로만 가능하다.

## 인증/권한 흐름

- 인증 중심: `worker/routes/auth.js`, `worker/lib/auth.js`, `worker/lib/jwt.js`
- 세션: custom JWT access/refresh token 기반으로 보이며 NextAuth 정본이 아니다.
- 로그인·세션 복원 bootstrap: `GET /api/me/access-state?profileId=...` 한 번으로 이용권, 월정석, 계정 공통 해금, 현재 프로필 해금을 `CodeDestinyAccessStore`에 적재한다.
- 잠금 표시: React Context는 Store 구독과 selector만 제공하고, 정적 UI의 `unlockedFeatureMap`은 Store의 호환 projection으로만 동작한다. 카드 렌더마다 `/api/access/unlocks`를 호출하지 않는다.
- 인증과 권한은 분리한다. 최종 `401`만 로그인 필요이며, `403`/`404` 프로필·권한 오류와 `503`/`504` 일시 장애는 마지막 정상 스냅샷을 삭제하지 않는다.
- OAuth: Google, Naver, Kakao callback 경로가 Worker config와 auth route에 있다.
- 프로필: `User.destinyProfiles`, `ProfileCard`, `/api/profile/*`, `/api/user/destiny-profiles`
- 권한: `profileSubscription`, `ContentEntitlement`, `PaidExecutionRecord`, monthly credit lots, paid feature registry를 함께 본다.

## 에셋/R2 구조

- 로컬 정적 자산: `public/**`, 루트 HTML 파일, `fuctionassets/**`, `icons/**`, `styles/**`, `js/**`
- R2 공개 에셋: `assets.code-destiny.com` 형태의 공개 자산 도메인 사용
- 음악: `music.code-destiny.com` 기반 공개 스트리밍/커버 자산
- Worker R2 binding: `FEEDBACK_IMAGES_BUCKET`, `INSIGHT_IMAGES_BUCKET`
- R2 credential, account id, access key, secret key는 클라이언트 문서나 코드에 기록 금지

## 배포 구조

- Pages config: 루트 `wrangler.toml`
- Worker config: `worker/wrangler.toml`
- Build: `npm run build`, `npm run build:cf`
- Worker dry run: `npm run build:worker`
- Deploy scripts: `npm run deploy:cf:pages`, `npm run deploy:cf:worker`, `npm run deploy:cf:opennext`
- Cache policy: `_headers`, `public/_headers`, `docs/deploy-cache.md`
- Redirect policy: `public/_redirects`

운영 배포는 사용자 명시 승인 후에만 진행한다.

## 운영상 주의점

- `index.html` 변경 시 미러 동기화와 cache key 검증이 필수다.
- 결제/권한/환불/월정석/이용권은 mock/sandbox 검증 외 실결제 금지다.
- LLM은 mock 검증이 기본이다.
- MongoDB migration scripts는 운영 DB 쓰기 가능성이 있으므로 승인 없이 실행하지 않는다.
- Worker 라우트 순서 변경은 접두사 충돌을 만들 수 있다.
- R2 에셋 경로 변경은 모바일 성능, 이미지 로딩, 음악 재생에 영향을 준다.
- `server/**`만 고치는 운영 API 수정은 대체로 위험하다.

## 신규 개발자가 가장 먼저 봐야 할 파일 목록

- `AGENTS.md`
- `CLAUDE.md`
- `docs/SERVICE_STRUCTURE.md`
- `docs/FEATURE_MAP.md`
- `docs/ROUTE_MAP.md`
- `docs/PAYMENT_AND_ACCESS.md`
- `docs/LLM_AND_AI_POLICY.md`
- `docs/DEPLOYMENT_AND_INFRA.md`
- `docs/DEBUGGING_GUIDE.md`
- `package.json`
- `next.config.mjs`
- `worker/index.js`
- `worker/lib/models.js`
- `worker/lib/paid-feature-registry.js`
- `worker/routes/billing.js`
- `worker/routes/payments.js`
- `lib/llm-client.ts`
- `index.html`
