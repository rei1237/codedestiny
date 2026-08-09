# 개인정보 암호화 현황 진단 보고서 (2026-08-10)

> 조사 방식: 읽기 전용(코드 수정 없음). Explore 에이전트 3개 병렬 조사(A/B/C, D/G/H, E/F/I/J/K 카테고리) + 핵심 파일 6종 직접 재검증.
> 법적 기준선: 「개인정보의 안전성 확보조치 기준」— 비밀번호(해시 필수), 고유식별정보·카드번호·계좌번호(암호화 필수), 인터넷 전송(암호화 필수).
> 절대 제약 준수: `sajuAdapter.ts`의 `calculateLocalResult()`, `normalizeSaju.ts`, KASI prefetch, 6개 역술 엔진, PortOne/Inicis 실행 파일은 읽기만 하고 수정 제안을 하지 않았음.

---

## 1. 요약

- **자체 비밀번호 로그인: 있음** — `worker/routes/auth.js`의 `handleRegister`(2292행)/`handleLogin`(2603행). Google/Naver/Kakao OAuth와 병행 운영.
- NextAuth/Lucia 미사용(패키지 자체 없음), CLAUDE.md 서술("커스텀 JWT")과 일치 — 인증 전체가 Cloudflare Worker에 자체 구현(HS256, `worker/lib/jwt.js`).
- **P0 (즉시 조치 검토): 3건**
- **P1 (단기 조치): 8건**
- **P2 (개선 권고): 5건**
- 비밀번호 해싱(PBKDF2-SHA256 600,000회) · JWT 서명 · 웹훅 검증 · API 필드 필터링 · IDOR 방어는 조사 범위 내에서 견고하게 구현되어 있음을 확인(6번째 표 "확인된 안전 지점" 참고).

---

## 2. 발견 사항

| # | 등급 | 항목 | 현재 상태 | 위험 | 파일:라인 |
|---|---|---|---|---|---|
| 1 | P0 | 관리자 토큰 이중 저장 | 서버는 HttpOnly 쿠키로 발급하는데 클라이언트가 같은 토큰을 localStorage/sessionStorage에도 평문 저장 | XSS 시 관리자 세션 탈취, HttpOnly 방어 무력화 | `app/admin/login/page.tsx:199-202` |
| 2 | P0 | 시크릿 미설정 시 하드코딩 폴백값 사용 (6개 파일) | `FLOWER_ADMIN_SECRET` 등 4개 시크릿이 배포 필수 검증(`env-parity`) 대상이 아니어서, 미설정 시 리포에 커밋된 고정 문자열로 서명 | 프로덕션에 미설정 시 관리자 토큰·CSRF·프리미엄 접근 토큰 위조 가능 | `app/_lib/flowerAdminToken.js:19`, `app/_lib/csrf.js:14`, `app/_lib/route-auth.ts:49-51`, `worker/lib/premium-access-token.js:7-14`, `worker/routes/auth.js:1764`, `server/utils/subscription-link.js:10` |
| 3 | P0 | `/api/debug/user-exists` 무인증 이메일 열거 가능성 | `DEBUG_MODE=true`일 때 인증 없이 이메일 존재 여부+내부 ID/role/가입일 반환 | 계정 존재 여부 열거, 내부 ID 노출 | `worker/routes/debug.js:11-20,129-159` |
| 4 | P1 | `NEXT_PUBLIC_PEXELS_API_KEY` 폴백 설계 결함 | 서버 전용 시크릿을 `NEXT_PUBLIC_` 이름으로도 유효하게 받아들임(현재 미설정으로 활성 유출은 아님) | 그 이름으로 설정되는 순간 클라이언트 번들에 키 노출 | `lib/server/pexels.ts:55-65`, `worker/index.js:60-70` |
| 5 | P1 | 캐시/저장 키에 생년월일시 평문 포함 (2건) | 사주 계산 dedup 캐시(인메모리 Map)와 나침반 세션 캐시(sessionStorage) 모두 키 자체에 생년월일시·성별을 JSON 그대로 사용 | sessionStorage는 DevTools에서 평문 열람 가능(로컬 기기 한정) | `app/saju/animal-destiny/lib/sajuAdapter.ts:91-99`, `app/destiny-compass/_hooks/useCompassSession.ts:86` |
| 6 | P1 | 이메일 로그 평문 노출 (일일/월간 운세 발송 Cron) | 구독자 이메일이 발송 루프마다 `console.log`/`console.error`에 그대로 기록 | Worker 로그·CI 로그에 이메일 PII 누적 | `worker/lib/daily-fortune-task.js:399,442,446,452,460,463`, `server/jobs/daily-content-cron.js:122,157` |
| 7 | P1 | 30일 TTL 리퍼럴 공유 토큰이 URL에 노출 | 서명된 JWT(`rs` 파라미터)가 공유 URL에 실림(세션 토큰 자체는 URL에 없음 — 별개) | 브라우저 히스토리/Referer/로그에 장기 유효 토큰 잔존 | `worker/routes/auth.js:193-205,279-281` |
| 8 | P1 | `/admin/*` 리다이렉트 가드가 프로덕션에서 미동작 | `middleware.ts`는 정적 export(`output:"export"`) 빌드에 포함되지 않아 실제 배포본에서 실행 안 됨 | UX 차원 접근 제어 부재(단, Worker API 레벨 별도 인가가 실질 방어선) | `middleware.ts:1-9,504-512`, `next.config.mjs:153` |
| 9 | P1 | 이름·이메일·전화번호·인증 토큰이 localStorage에 평문 상시 저장 | `fortune_auth_user`(이름/이메일/전화번호), 모바일 런타임의 `fortune_auth_token`/refresh 토큰 | XSS 시 PII·토큰 탈취 범위 확대 | `app/_lib/auth-storage.ts:92-104`, `app/_lib/auth-client.ts:161-192` |
| 10 | P1 | 클라이언트 디버그 로그가 응답 페이로드 전체 노출 | 토큰은 마스킹하면서 같은 함수 내 다른 로그에서 결제/리딩 결과 payload 전체를 콘솔 출력(마스킹 정책 불일치) | 브라우저 콘솔에 결제·리딩 데이터 노출 | `celestial-harmony.html:2157` |
| 11 | P1 | `config/env.contract.json` 커버리지 갭 | `NEXT_PUBLIC_TURNSTILE_SITE_KEY` 등 일부 `NEXT_PUBLIC_*`가 contract 미등재(스캔 루트 경로 차이 추정) | 향후 시크릿이 같은 사각지대에 추가돼도 정합성 검증이 못 잡을 수 있음 | `config/env.contract.json` (`scanRoots`), `public/js/inline/site-verification-inject.js:10-26` |
| 12 | P2 | PII 필드(이름·이메일·생년월일시·성별·전화번호) 애플리케이션 레벨 암호화 전무 | MongoDB `User`/`ProfileCard`/각 AI 상담 컬렉션 전부 평문 저장. 단, 이 필드들은 한국 법령상 "고유식별정보"(주민등록번호 등)가 아니라 **법적 강제 대상은 아님** — 사주 서비스 특성상 권고 사항 | DB 유출 시 생년월일시+이름+성별 조합으로 실질 식별 가능 | `worker/lib/models.js:16-23`, 각 `*AiConsultations` 컬렉션 |
| 13 | P2 | `twoFA.totpSecret` 평문 저장 | TOTP 재계산을 위해 원문 보관이 필요한 정상 설계이나 필드 암호화는 없음 | DB 유출 시 즉시 OTP 우회 가능 | `worker/lib/models.js:82-86` |
| 14 | P2 | HSTS `preload` 미지정, 전용 `X-Frame-Options` 헤더 부재 | HSTS는 `max-age=31536000; includeSubDomains`까지만(preload 없음), 클릭재킹은 CSP `frame-ancestors 'self'`로 대체 방어(실질 공백은 아님) | HSTS preload 리스트 미등록 상태 지속 | `_headers:17,19` |
| 15 | P2 | 테스트 계정 평문 비밀번호 콘솔 출력 | 시드 스크립트가 이메일+평문 비밀번호를 그대로 로그에 출력(로컬/CI 한정) | CI 아티팩트에 평문 비밀번호 잔존 가능 | `scripts/seed-test-users.mjs:257` |
| 16 | P2 | www→apex 정규화 자동 회귀 검증 부재 | 2026-08-08에 일일 CI 게이트(`canonical-host-check.yml`)가 삭제되어 현재는 수동 실행 전용 | 프로덕션 리다이렉트 규칙이 깨져도 자동 감지 안 됨 | `scripts/verify-www-canonical.mjs:18-24` |

---

## 3. 항목별 상세 (근거 코드 인용 포함)

### A. 인증 방식 인벤토리

지원 로그인 수단: **Google/Naver/Kakao OAuth**(`worker/routes/auth.js:39` `OAUTH_PROVIDERS`) + **자체 이메일/비밀번호**(`handleRegister` 2292행, 필수 필드 `worker/routes/auth.js:2319`) + **로컬 개발 전용 백도어**(`resolveLocalDevAuthUser()`, `worker/routes/auth.js:561-568`, `LOCAL_DEV_AUTH_ENABLED` env + localhost 호스트 조건, 하드코드 기본 비밀번호 `"LocalTest!2026"`이 코드에 존재하나 프로덕션 도메인에서는 `isLocalHostname` 체크로 차단됨).

매직링크·익명 세션: **미확인**(관련 키워드 매칭 없음, 게스트는 단순 미인증 `null` 상태로 취급).

루트 `package.json`의 `bcrypt`/`jsonwebtoken` 의존성은 **레거시 Express 서버(`server/`) 전용**이며 프로덕션 라우팅(`worker/wrangler.toml`)은 이를 가리키지 않는다. 다만 두 auth 구현이 같은 MongoDB `passwordHash` 필드를 다루므로, 레거시 서버가 실수로 프로덕션에 노출되면 해시 검증 로직이 갈라질 수 있다는 점은 리스크로 기록해둔다(등급 부여는 보류 — 활성 경로가 아님).

### B. 비밀번호 저장 방식

**저장 위치**: MongoDB `User` 컬렉션, `passwordHash` 필드(`worker/lib/models.js:20`, `select: false`로 기본 조회에서 제외).

**해시 알고리즘 — PBKDF2-HMAC-SHA256, 견고함(직접 확인)**:
```js
// worker/lib/password.js:6-11
const PBKDF2_SALT_BYTES = 16;
const PBKDF2_KEY_BYTES = 32;
const PBKDF2_ITERATIONS = 600000;
```
매 비밀번호마다 `crypto.getRandomValues`로 랜덤 salt 생성(95행), 비교는 상수시간(`timingSafeEqual`, 40-50행). 평문/MD5/SHA-1/무salt-SHA256 사용 지점은 발견되지 않았다.

**레거시 호환**: bcrypt 포맷(`$2a$/$2b$/$2y$`)도 검증 가능하고, 로그인 성공 시 자동으로 PBKDF2로 재해시(`needsPasswordRehash`, `worker/routes/auth.js:2586-2601`). 주석에 따르면 Worker CPU 제한(`error code: 1102`) 때문에 bcryptjs cost 12(~270ms)에서 PBKDF2(~89ms)로 전환한 이력이 있다.

**비밀번호 재설정/변경 경로**: 코드베이스 전체에서 **발견되지 않음** — `passwordHash`를 다루는 라우트는 회원가입/로그인/회원탈퇴(비밀번호 재확인) 3곳뿐이다. 이는 보안 결함이 아니라 **기능 부재**이므로 등급을 부여하지 않았지만, Phase 2에서 비밀번호 관리 정책을 다룰 때 함께 고려할 필요가 있다.

**2FA**: `totpSecret`은 평문(표 #13), `backupCodesHash`는 bcrypt 해시로 정상 저장(`server/models/User.js:109` 주석).

### C. 세션/토큰

**쿠키**: `worker/routes/auth.js:687-696` `appendAuthCookies()`에서 access/refresh 쿠키 모두 `httpOnly: true`가 항상 적용됨을 직접 확인. `Secure`는 `resolveCookieSecure()`(599-615행, https/`NODE_ENV=production`이면 true), `SameSite`는 기본 `Lax`(`resolveCookieSameSite()`, 617-622행). Max-Age는 access 기본 30분, refresh 기본 14일(`worker/lib/auth.js:123-129`).

**JWT**: 자체 구현(`worker/lib/jwt.js`, crypto.subtle HMAC-SHA256). `alg`는 `HS256` 고정이며 그 외 값(none 포함)은 명시적으로 거부(89-95행). 시크릿 플레이스홀더 값("dev-secret", "change_me" 등)은 로컬 개발 환경이 아니면 예외를 던져 조용한 약한 서명을 막는다(`resolveRequiredAuthSecret()`, `worker/lib/auth.js:92-105`) — 단 이 방어는 `AUTH_SECRET` 계열에만 적용되고, 표 #2의 4개 시크릿에는 적용되지 않는다.

**로그아웃**: 리프레시 세션은 즉시 폐기됨(`revokeAllUserRefreshSessions`, `worker/routes/auth.js:2148-2158`, MongoDB `refresh_tokens` 컬렉션의 `revokedAt` 갱신). 다만 access 토큰은 상태 비저장 JWT라 자체 만료(최대 30분)까지는 로그아웃 후에도 유효 — 일반적인 설계 트레이드오프이며 결함은 아니다.

**URL 노출**: 표 #7(리퍼럴 토큰) 외에, `social_grant`(OAuth 콜백, TTL 180초)도 URL에 실리나 TTL이 짧아 리스크가 낮다. 실제 세션 access/refresh 토큰은 URL에 노출되지 않음(정상).

### D. 전송 구간 보안

**HTTPS 강제**: 저장소 안에는 정본이 없음 — `middleware.ts`의 리다이렉트 로직은 프로덕션(정적 export)에서 비활성(표 #8과 동일 원인). 실제 프로덕션 정본은 Cloudflare 대시보드 Redirect Rule(저장소 밖, 미확인)이며, 이를 검증하던 CI 게이트는 2026-08-08 삭제되어 현재 수동 실행 전용(표 #16).

**보안 헤더** (`_headers`, 루트/`public/` 동일 파일, 직접 확인):

| 헤더 | 상태 |
|---|---|
| `Strict-Transport-Security` | 있음(`max-age=31536000; includeSubDomains`, preload 없음 — 표 #14) |
| `Content-Security-Policy` | 있음(`upgrade-insecure-requests` 포함) |
| `X-Content-Type-Options` | 있음(`nosniff`) |
| `X-Frame-Options` | 전용 헤더는 없으나 CSP `frame-ancestors 'self'`로 대체 |
| `Referrer-Policy` | 있음(`strict-origin-when-cross-origin`) |
| `Permissions-Policy` | 있음 |

`_headers` 파일 자체 주석이 중대한 운영 위험을 명시: Cloudflare Pages는 규칙을 **최초 100개까지만 적용**하며 초과분은 조용히 버려진다(실측 사례: `/version.json`, `/ads.txt` 미적용 이력). 보안 헤더 블록은 현재 파일 앞쪽(14행)에 있어 100개 예산 안에 들지만, 향후 규칙이 늘어나면 조용히 탈락할 수 있는 구조다.

### E. 저장 데이터 — 개인정보 필드 인벤토리

| 필드 | 저장소 | 키·컬럼명 | 현재 저장 형태 | 암호화 여부 | 근거 파일:라인 |
|---|---|---|---|---|---|
| 이메일 | MongoDB | `User.email` | 평문 | 없음 | `worker/lib/models.js:17` |
| 이름 | MongoDB | `User.name`, `ProfileCard.name` | 평문 | 없음 | `worker/lib/models.js:16`, `:174-203` |
| 생년월일 | MongoDB | `User.birthDate`, `ProfileCard.birth.*`, 각 AI 상담 `birthInfo.birthDate` | 평문 | 없음 | `worker/lib/models.js:21`, `:702-1247` 전역 |
| 출생시각 | MongoDB | `User.birthTime`, `birthInfo.birthTime` | 평문 | 없음 | `worker/lib/models.js:22` |
| 성별 | MongoDB | `User.gender`, `birthInfo.gender` | 평문 | 없음 | `worker/lib/models.js:23` |
| 전화번호 | MongoDB | `User.phoneNumber` | 평문 | 없음 | `worker/lib/models.js:19` |
| 결제 식별자 | MongoDB | `Payment.impUid/merchantUid` | 평문(카드번호/CVC 필드 자체가 없음) | 해당없음 | `worker/lib/models.js:205-262` |
| 사주 계산 결과 캐시 | MongoDB(LLM 응답), 인메모리, sessionStorage | `llm_response_cache.cacheKey`(SHA-256 해시, 안전) / `sajuAdapter.ts` Map 키·`useCompassSession` sessionStorage 키(평문, 표 #5) | 혼재 | 부분적 | `lib/llm-cache.ts:57-70`(안전) vs 표 #5(평문) |

애플리케이션 레벨 필드 암호화(AES 등) 구현은 저장소 전체에서 발견되지 않았다(표 #12). `passwordHash`만 단방향 해시이고 나머지 PII는 전부 평문.

### F. 클라이언트 저장소

localStorage/sessionStorage에 이름·이메일·전화번호·인증토큰이 평문 저장되는 지점은 표 #9 참고. 관리자 토큰 이중 저장은 표 #1. 사주 프로필 카드(생년월일시·출생지 포함)도 다중 키로 localStorage/sessionStorage에 캐시됨(`app/_lib/profile-card-storage.ts:295-318`) — 이는 프로필 자동입력 기능(CLAUDE.md 명시 요구사항)의 의도된 동작이라 별도 등급을 부여하지 않았다.

Android WebView/SharedPreferences(`apps/mobile/`)에서 이메일·생년월일 등 원본 PII 필드를 직접 저장하는 지점은 발견되지 않음(잠금화면 운세 텍스트만 평문 저장, `CodeDestinyLockScreenPlugin.java:42-46`). 단 WebView 자체의 로컬 저장 파일(`app_webview/Local Storage`)에는 F절 localStorage 내용이 OS 표준 위치에 그대로 남을 것으로 추정되나, 파일을 직접 열어 확인하지는 못했다(미확인).

### G. 환경변수/시크릿 노출

`NEXT_PUBLIC_` 접두사로 정식 등록된 18개 키는 전부 client-safe로 올바르게 분류됨(`config/env.contract.json`). 예외는 표 #4(`NEXT_PUBLIC_PEXELS_API_KEY`)이며, 실제 배포환경(`.env.local`)에는 해당 이름으로 값이 설정되어 있지 않아 **현재는 활성 유출이 아니다**.

하드코딩된 폴백 시크릿 6개 파일은 표 #2 참고. `AUTH_SECRET`은 `env-parity` 배포 게이트로 프로덕션 미설정 시 배포 자체가 막히도록 되어 있으나, `FLOWER_ADMIN_SECRET`/`JWT_ACCESS_SECRET`/`CSRF_SECRET`/`PREMIUM_ACCESS_TOKEN_SECRET`은 `required_in: []`로 그 방어선 밖에 있다.

해시 솔트는 랜덤 생성이 확인되어(B절) 고정 솔트 사용 사례는 없다.

### H. 로그 마스킹

이메일 평문 로그(표 #6) 외에, 운세 AI 라우트군(`love-secret-ai`, `life-book-ai`, `karma-destiny-ai`, `new-year-ai`, `ziwei-island-ai`, `ziwei-ai`, `vedic-ai`, `sukuyo-compatibility-ai`)에는 `maskBirthDate()` 헬퍼가 각각 구현되어 생년월일을 `YYYY-**-**` 형태로 마스킹하는 컨벤션이 정착되어 있음(대조군, 좋은 사례). `worker/routes/auth.js` 로그인/가입 흐름에서 비밀번호 원문을 로깅하는 지점은 발견되지 않았다.

예외 응답 본문에 스택트레이스가 노출되는 패턴은 조사 범위 내에서 발견되지 않음 — `worker/lib/http.js`의 공용 에러 빌더가 `stack`을 로그 전용으로 분리하고, 클라이언트 응답은 프로덕션에서 정형화된 메시지만 반환한다(`isDevelopmentLike` 게이팅).

### I. API 응답 과다노출 / 권한 검증

`normalizeUserResponse()`(`worker/lib/auth.js:768-782`)와 `ME_USER_PROJECTION`(`worker/routes/auth.js:2803-2838`)이 allowlist 방식으로 `passwordHash`/`twoFA`/`adminRefreshTokenHash` 등을 응답에서 제외함을 확인. `worker/routes/user.js`, `worker/routes/profile.js`의 모든 핸들러가 `auth.userId`(세션 기반)로만 스코프를 걸어 조회하며, 클라이언트가 보낸 `userId`를 신뢰해 DB를 조회하는 IDOR 패턴은 발견되지 않았다. `admin-orders.js`의 임의 `userId` 조회는 `authorizeAdminRequest` 통과 후에만 호출되는 의도된 관리자 기능이다.

### J. 결제 관련 (읽기 전용)

카드번호/CVC/계좌번호를 직접 수신·저장하는 필드나 코드는 스키마·로직 어디에도 없음(`worker/lib/portone.js` 전체 확인). 서버가 다루는 것은 결제ID, 금액, 환불 계좌(환불 지급용, 결제승인 절차와 무관)뿐이다. 웹훅 서명 검증은 Standard Webhooks 규격 HMAC-SHA256 + 타이밍 세이프 비교 + fail-closed(시크릿 미설정 시 503)로 정상 구현되어 있음을 확인(`worker/routes/payments.js:196-244,3312-3342`).

### K. 관리자 경로

미들웨어 레벨 `/admin/*` 가드는 프로덕션 미동작(표 #8)하지만, 실제 데이터 접근은 Worker API 레벨의 별도 인가(`authorizeAdminRequest()`, `worker/routes/admin.js:2979-3033`, HMAC 토큰 검증 + `role==="admin"` JWT 폴백)로 보호되고 있어 데이터 자체의 무인증 열람 가능성은 낮다. `/api/debug/*` 무인증 엔드포인트는 표 #3 참고 — 저장소 기준 기본 비활성이나 Cloudflare 프로덕션 실제값은 확인 불가.

---

## 4. 미확인 항목 및 확인이 필요한 이유

| 항목 | 확인이 필요한 이유 |
|---|---|
| Cloudflare 프로덕션 실제 환경변수 값(`FLOWER_ADMIN_SECRET`, `CSRF_SECRET`, `JWT_ACCESS_SECRET`, `DEBUG_MODE`, `PREMIUM_ACCESS_TOKEN_SECRET`) | 저장소 코드만으로는 값 존재 여부를 알 수 없음. **표 #2·#3의 실제 위험도를 좌우하는 가장 중요한 미확인 항목** — Cloudflare 대시보드에서 직접 확인 필요 |
| 프로덕션 www→apex/HTTPS 강제 리다이렉트 규칙 | Cloudflare 대시보드 Redirect Rule로 관리되며 저장소에 커밋되지 않음 |
| Android WebView 자체 로컬 저장소 파일(`app_webview/Local Storage`) 실제 내용 | 코드 정적 분석만으로는 확인 불가, 실기기/에뮬레이터 파일 열람 필요 |
| 각 `app/admin/*/page.tsx`의 클라이언트 자체 인증 가드 존재 여부 | 일부 컴포넌트만 확인, 전수 조사는 이번 범위를 벗어남(3개 Explore 에이전트가 핵심 흐름 위주로 조사) |
| `worker/routes/*.js` 227개+ 파일 전수 로그 마스킹 여부 | 인증/결제/프로필 핵심 경로와 grep 매칭 지점만 확인, 나머지 라우트는 개별 미확인 |
| 로그인 시 계정 존재 여부에 따른 응답시간 차이(더미 해시 검증 수행 여부) | 이번 조사에서 확인하지 못함 — Phase 2 설계(4-1절 요구사항)에서 함께 확인 필요 |
| `scripts/env-parity.mjs` 실제 스캔 결과(표 #11 관련) | 검증 로직의 존재만 코드로 확인했고 직접 실행하지는 않음(읽기 전용 범위 준수) |
| Inicis 서명/실행 경로 세부 구현 | 지시에 따라 설정 로딩부만 확인, 그 이상은 범위 밖으로 남겨둠 |

### 확인된 안전 지점 (대조군)

- 비밀번호: PBKDF2-HMAC-SHA256 600,000회, 16바이트 랜덤 salt, 상수시간 비교, 레거시 bcrypt→자동 재해시
- JWT: HS256 고정, `alg:none` 명시적 차단, 시크릿 플레이스홀더 프로덕션 거부(단 `AUTH_SECRET` 계열 한정)
- 세션 쿠키: HttpOnly 항상 true, Secure(프로덕션/https 조건부), SameSite=Lax
- 웹훅 서명 검증: HMAC-SHA256, fail-closed, 타이밍 세이프
- API 응답: allowlist 방식, IDOR 패턴 미발견
- 결제: 카드번호/CVC 서버 미수신, 스택트레이스 클라이언트 미노출

---

## 5. 조치 제안 (우선순위 순)

1. **[P0-확인] Cloudflare 프로덕션 환경변수 실측** — 코드 변경 없음, 이 저장소 밖의 확인 작업. `FLOWER_ADMIN_SECRET`/`CSRF_SECRET`/`JWT_ACCESS_SECRET`/`DEBUG_MODE`/`PREMIUM_ACCESS_TOKEN_SECRET`이 실제로 설정되어 있는지부터 확인하는 것이 다른 모든 P0 조치의 선행 조건이다.
2. **[P0] 관리자 토큰 이중 저장 제거** — 예상 변경 파일 1개(`app/admin/login/page.tsx`), 마이그레이션 불필요, 롤백 용이. localStorage/sessionStorage 기록 4줄만 제거하고 HttpOnly 쿠키 단독 사용으로 전환.
3. **[P0] 시크릿 필수 검증 대상 확대** — 예상 변경 파일 1개(`config/env.contract.json`) + `scripts/env-parity.mjs` 로직 확인, 마이그레이션 불필요. 표 #2의 4개 시크릿을 `required_in`에 포함해 배포 게이트가 미설정을 차단하도록 강화.
4. **[P0] `/api/debug/*` 프로덕션 완전 제거 또는 라우팅 자체 차단 검토** — 예상 변경 파일 1~2개(`worker/routes/debug.js`, `worker/index.js`), 마이그레이션 불필요. `DEBUG_MODE` 게이팅에만 의존하지 않고 라우팅 자체를 프로덕션 빌드에서 제외하는 방안 검토.
5. **[P1] localStorage 평문 PII/토큰 축소** — 웹 경로는 쿠키로 일원화, 모바일 앱 전용 토큰 저장은 설계상 불가피(오리진 제약)하므로 유지. 예상 변경 파일 2~3개, 마이그레이션 불필요(클라이언트 캐시라 자연 대체됨).
6. **[P1] 캐시/저장 키 해시화** — 생년월일시가 들어간 sessionStorage/인메모리 키를 SHA-256/HMAC 해시로 대체(`lib/llm-cache.ts` 패턴 재사용). 예상 변경 파일 2개, 캐시 무효화만 발생(데이터 손실 없음).
7. **[P1] 이메일 로그 마스킹 적용** — 기존 `maskBirthDate` 컨벤션과 동일하게 이메일 마스킹 유틸을 cron 로그에 적용. 예상 변경 파일 2개, 마이그레이션 불필요.
8. **[P2] PII 필드 암호화 범위 결정** — 법적 강제 대상은 아니므로 우선순위는 낮으나, Phase 2에서 어떤 필드를 암호화할지(전부 암호화 시 조회/정렬/캐시 영향) 표로 제안 후 선택받는 절차 필요. 변경 범위가 가장 크고 데이터 마이그레이션이 필요한 항목.

**공통 주의**: 위 조치들은 모두 Phase 2(설계안 제시) 대상이며, 이 보고서는 진단 결과만 제출한다. 코드 변경은 STOP 1 이후 네오의 명시적 승인을 받은 항목만, 항목별로 커밋을 분리해 진행한다.
