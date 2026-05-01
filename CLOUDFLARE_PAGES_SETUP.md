# Cloudflare Pages + Workers 복구 배포 가이드

## 현재 권장 구조

- Frontend: Cloudflare Pages, `dist/` 정적 배포
- API entrypoint: Cloudflare Worker `code-destiny-web`
- Worker URL: `https://code-destiny-web.bulegyung.workers.dev`
- API routing: Pages의 `public/_redirects`가 `/api/*` 요청을 Worker로 전달
- Worker-native routes: `/api/auth/*`, `/api/payments/*`, `/api/fortune/*`
- Optional fallback proxy: `API_UPSTREAM_ORIGIN`은 아직 Worker로 포팅하지 않은 API 그룹이 있을 때만 사용

이번 구성은 기존 `server/routes/auth.routes.js`, `payment.routes.js`, `fortune.routes.js`의 핵심 로직을 Worker Fetch 핸들러로 옮깁니다. MongoDB 컬렉션 구조, JWT 토큰, OAuth, PortOne 결제 검증, 포인트/구독 로직은 기존 데이터와 맞도록 유지했습니다.

## 로컬에서 먼저 확인

```bash
npm run build:cf
npm run build:worker
npm run secrets:cf:worker:dry
npm run secrets:cf:pages:dry
```

`npm run build:cf`는 Pages용 `dist/`를 만들고, `npm run build:worker`는 Worker 번들 dry-run을 실행합니다.

## Worker 설정

Worker 설정 파일:

```text
worker/wrangler.toml
```

운영 Worker에 필요한 주요 값:

```text
AUTH_API_BASE_URL=https://code-destiny-web.bulegyung.workers.dev
AUTH_FRONTEND_BASE_URL=https://code-destiny.com
SITE_BASE_URL=https://code-destiny.com
JWT_SECRET=<강한 랜덤 문자열>
MONGO_URI=<MongoDB Atlas connection string>
MONGO_DB_NAME=code_destiny
PORTONE_API_KEY=<PortOne key>
PORTONE_API_SECRET=<PortOne secret>
AUTH_SIGNUP_BONUS_POINTS=50
MONGO_WORKER_CONNECT_GUARD_MS=8000
```

OAuth를 사용한다면 아래도 Worker secret 또는 vars로 들어가야 합니다.

```text
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=
NAVER_OAUTH_CLIENT_ID=
NAVER_OAUTH_CLIENT_SECRET=
KAKAO_OAUTH_CLIENT_ID=
KAKAO_OAUTH_CLIENT_SECRET=
```

아직 Worker로 옮기지 않은 `/api/*`가 필요할 때만 `API_UPSTREAM_ORIGIN`을 외부 Express API origin으로 설정하세요. 절대 `https://code-destiny-web.bulegyung.workers.dev`나 Pages 프론트 주소로 설정하면 안 됩니다. 자기 자신 또는 프론트로 프록시 루프가 생깁니다.

시크릿 일괄 반영:

```bash
npm run secrets:cf:worker
```

배포:

```bash
npm run deploy:cf:worker
```

헬스체크:

```text
https://code-destiny-web.bulegyung.workers.dev/api/health
```

정상이라면 `mode: "worker-native"`와 `nativeRoutes: ["auth","payments","fortune"]`가 보여야 합니다.

## Pages 설정

Cloudflare Pages 프로젝트 설정:

- Project name: `codedestiny`
- Build command: `npm run build:cf`
- Build output directory: `dist`
- Root directory: `/`
- Node version: `20` 이상 권장

배포:

```bash
npm run deploy:cf:pages
```

전체 배포:

```bash
npm run deploy:cf:all
```

## Pages 환경변수

운영에서는 프론트가 같은 origin의 `/api/*`를 호출하고 `_redirects`가 Worker로 넘기도록 두는 것이 가장 단순합니다.

권장:

```text
NEXT_PUBLIC_API_BASE_URL=
NEXT_PUBLIC_CODE_DESTINY_API_URL=
```

로컬 개발에서만 필요하면:

```text
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
```

## GitHub 저장소 복구

새 GitHub 저장소:

```text
https://github.com/rei1237/codedestiny
```

로컬에서 원격을 다시 연결:

```bash
git remote -v
git remote set-url origin https://github.com/rei1237/codedestiny.git
git push -u origin main
```

새 저장소가 완전히 비어 있다면 첫 push 때 `main` 브랜치를 그대로 올리면 됩니다. Cloudflare Pages에서 Git 연결 배포를 쓰려면 새 GitHub 저장소를 Pages 프로젝트에 다시 연결하세요. 아니면 `npm run deploy:cf:pages`로 직접 배포해도 됩니다.

## 반드시 확인할 외부 설정

- MongoDB Atlas Network Access: Workers는 고정 IP가 없으므로 Atlas에서 접근 정책을 맞춰야 합니다. 가장 단순한 복구는 Atlas Network Access를 `0.0.0.0/0`로 열고 DB 계정 권한/비밀번호를 강하게 관리하는 방식입니다.
- PortOne Webhook URL: `https://code-destiny-web.bulegyung.workers.dev/api/payments/webhook`
- OAuth redirect URI:
  - Google: `https://code-destiny-web.bulegyung.workers.dev/api/auth/oauth/google/callback`
  - Naver: `https://code-destiny-web.bulegyung.workers.dev/api/auth/oauth/naver/callback`
  - Kakao: `https://code-destiny-web.bulegyung.workers.dev/api/auth/oauth/kakao/callback`
- Cloudflare custom domain:
  - Pages: `code-destiny.com`
  - API Worker: 가능하면 `api.code-destiny.com`을 Worker custom domain으로 연결하면 OAuth/결제 설정이 더 깔끔해집니다.

## 아직 남은 포팅 후보

이번에 옮긴 범위는 사용자가 요청한 세 파일입니다. 다음 API들은 별도 점검이 필요합니다.

- `server/routes/admin.routes.js`
- `server/routes/tarot.routes.js`
- `server/routes/astro.routes.js`
- `server/routes/kasi.routes.js`
- `server/routes/translate.routes.js`
- `server/routes/subscription.routes.js`
- Next static export에서 비활성화되는 `app/api/*`
