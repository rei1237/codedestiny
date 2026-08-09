# 개인정보 암호화 설계안 (Phase 2)

> 전제: [encryption-audit-20260810.md](./encryption-audit-20260810.md) Phase 1 진단 결과에 대한 설계안이다. **코드는 아직 작성하지 않았다.** 항목별로 승인받은 것만 Phase 3에서 구현하고, 한 커밋에 여러 조치를 섞지 않는다.
> 절대 제약 재확인: `sajuAdapter.ts`의 `calculateLocalResult()`, `normalizeSaju.ts`, KASI prefetch, 6개 역술 엔진, PortOne/Inicis 실행 파일은 이 설계안에서도 수정 대상에 포함하지 않았다.

---

## 그룹 A — P0 긴급 조치 (Phase 1 발견)

### A1. 관리자 토큰 이중 저장 제거

- **조치 내용**: `app/admin/login/page.tsx:199-202`의 `sessionStorage.setItem("flower_admin_token", ...)` / `localStorage.setItem("flower_admin_token", ...)` 2줄 제거. 서버가 이미 HttpOnly 쿠키로 `flower_admin_token`을 발급하므로(`worker/routes/admin.js:4289-4298`) 클라이언트 재저장이 필요 없다. `flower_admin_password_ok` 플래그(UX용, 토큰 아님)는 유지 검토.
- **변경 파일**: `app/admin/login/page.tsx` 1개. 이 토큰을 클라이언트에서 직접 읽는 다른 지점이 있는지 확인 후 진행(있다면 쿠키 기반으로 같이 전환).
- **데이터 마이그레이션**: 불필요.
- **롤백 가능 여부**: 가능(코드 되돌리면 즉시 원복).
- **리스크 및 영향받는 기능**: 관리자 로그인/관리자 페이지 접근. 만약 어떤 관리자 페이지가 쿠키가 아니라 `localStorage.getItem("flower_admin_token")`으로 인증 상태를 읽고 있다면 그 화면이 깨진다 — **적용 전 전체 `app/admin/**` grep으로 읽기 지점 전수 확인 필요**(Phase 1에서 "일부만 확인"으로 남겨둔 미확인 항목).
- **검증 방법**: 관리자 로그인 → 각 `/admin/*` 페이지 접근 → 새로고침 후에도 세션 유지되는지 → 로그아웃 후 재접근 차단되는지.

### A2. 취약한 시크릿 폴백 정리

- **조치 내용**: 두 갈래.
  1. `config/env.contract.json`에서 `FLOWER_ADMIN_SECRET`/`JWT_ACCESS_SECRET`/`CSRF_SECRET`/`PREMIUM_ACCESS_TOKEN_SECRET`의 `required_in`을 `AUTH_SECRET`과 동일하게 `["production", "local"]`로 확대해, `scripts/env-parity.mjs` 배포 게이트가 미설정을 차단하도록 함.
  2. `lib/server/pexels.ts:58`, `worker/index.js:63`의 `NEXT_PUBLIC_PEXELS_API_KEY` 폴백 분기 제거(서버 전용 키에 `NEXT_PUBLIC_` 이름을 허용하지 않도록).
- **변경 파일**: `config/env.contract.json`, `lib/server/pexels.ts`, `worker/index.js` — 총 3개.
- **데이터 마이그레이션**: 불필요. 단, **선행 조건으로 Cloudflare 대시보드에 4개 시크릿이 실제로 설정되어 있는지 먼저 확인해야 한다** — 미설정 상태에서 이 조치만 배포하면 다음 배포부터 `verify:env-parity:remote`가 실패해 배포 자체가 막힌다(의도된 동작이지만 사전 확인 없이 진행하면 배포 파이프라인이 갑자기 막히는 것으로 보일 수 있음).
- **롤백 가능 여부**: 가능.
- **리스크 및 영향받는 기능**: 배포 게이트가 엄격해지므로, 실제로 프로덕션에 이 시크릿들이 없다면 **선확인 없이 진행 시 배포가 즉시 막힌다.**
- **검증 방법**: `npm run verify:env-parity:remote` 로컬 실행(또는 CI) → 4개 키 모두 present 확인 → 실패 시 Cloudflare에 값 설정 후 재검증.

### A3. `/api/debug/*` 엔드포인트 확인 및 강화

- **조치 내용**: 코드 자체는 이미 fail-closed(`DEBUG_MODE` 미설정 시 403)이므로 **1순위는 코드 변경이 아니라 Cloudflare 대시보드에서 `DEBUG_MODE`가 프로덕션에 설정되어 있지 않은지 확인**하는 것이다. 확인 후에도 추가 방어가 필요하다고 판단되면, `worker/routes/debug.js`의 `requireDebugMode()`에 두 번째 조건(예: 특정 관리자 인증 헤더 동시 요구)을 추가하는 방안을 선택지로 제시한다.
- **변경 파일**: 확인만으로 끝나면 0개. 추가 방어까지 원하면 `worker/routes/debug.js` 1개.
- **데이터 마이그레이션**: 불필요.
- **롤백 가능 여부**: 가능.
- **리스크 및 영향받는 기능**: 없음(디버그 전용 라우트, 정상 트래픽 영향 없음).
- **검증 방법**: 프로덕션 URL에 `GET /api/debug/user-exists?email=test@test.com` 요청 → `403 debug_mode_disabled` 확인.

---

## 그룹 B — 원 설계 항목 (사용자 프롬프트 4-1~4-5)

### B1. 비밀번호 해싱 — **변경 불필요 (확인 결과만 보고)**

Cloudflare Workers 런타임 제약(네이티브 bcrypt 불가)을 이미 실측 반영한 구현이 프로덕션에 있다: PBKDF2-HMAC-SHA256(`crypto.subtle`), 반복 600,000회, 16바이트 랜덤 salt, 32바이트 출력, 상수시간 비교(`worker/lib/password.js`). 코드 주석에 실측치도 남아있다("100k≈18ms / 600k≈89ms" vs bcrypt cost 12 ~270ms로 인해 간헐적 `error code: 1102` 발생 이력). OWASP 권고치(PBKDF2-SHA256 600,000회)를 그대로 충족하며, Argon2id(WASM) 안은 **이미 충분히 견고한 구현을 교체할 이유가 없어 검토하지 않는다**(원 프롬프트의 "실제로 빌드·구동되는지 확인되지 않으면 권고하지 말 것" 조건에 따라 불필요한 재작업 배제). 존재 응답시간 차이(계정 유무에 따른 더미 해시 검증) 여부는 Phase 1에서 미확인으로 남았으니, **원하시면 A3와 별개로 별도 확인 작업을 추가할 수 있다.**

### B2. 개인정보 필드 암호화 (AES-256-GCM) — 범위 선택 필요

**공통 설계**: `crypto.subtle`(AES-256-GCM), 레코드마다 12바이트 랜덤 IV, 저장 포맷 `v1:<iv_b64>:<ciphertext_b64>`. 키는 Cloudflare Secret `PII_ENC_KEY`(base64 32바이트)로 주입, `NEXT_PUBLIC_` 절대 금지·소스 하드코딩 금지.

**필드별 후보 (코드 조사로 검증)**:

| 필드 | 저장 위치 | 검색/조회 키로 쓰이는가 | 암호화 시 추가 작업 | 권장 |
|---|---|---|---|---|
| `birthDate` | `User`, `ProfileCard`, 각 `*AiConsultations.birthInfo` | **아니오** — grep 결과 쿼리·인덱스 미사용 확인 | 읽는 지점(계산 엔진 인풋 직전)에서 복호화 삽입 | **권장(선택 시 즉시 적용 가능)** |
| `birthTime` | 위와 동일 | 아니오 | 위와 동일 | **권장** |
| `gender` | 위와 동일 | 아니오 — admin 통계 집계(`$group`)도 `status` 필드만 사용, `gender` 미사용 확인 | 위와 동일 | **권장** |
| `phoneNumber` | `User` | 아니오 | 위와 동일 | **권장** |
| `twoFA.totpSecret` | `User` | 아니오(OTP 검증 시점에만 사용) | 위와 유사 | **권장** |
| `email` | `User` (unique 인덱스, 로그인 조회 키) | **예** — `handleLogin`이 `User.findOne({email})`, OAuth 계정 연결도 이메일 기준 | Blind index(HMAC-SHA256) 컬럼 신설 + 로그인/가입/OAuth 연결 로직 전면 수정 + unique 제약을 blind index로 이전 | **비권장** — 법적 강제 대상(고유식별정보)이 아닌데 위험/공수 대비 이득이 낮음 |
| `name` | `User`, `ProfileCard` | 아니오(표시 전용) | 이름이 노출되는 모든 화면(개인화 인사말·관리자 목록 등)에서 복호화 필요 — 터치 범위가 가장 넓음 | **신중 검토** — 원하면 별도 라운드로 분리 권장 |

- **변경 파일 예상**: 암호화 유틸 1개 신설(`worker/lib/pii-crypto.js` 성격) + 스키마 getter/setter 또는 라우트별 명시적 encrypt/decrypt 삽입 지점(선택 필드 수 × 관련 라우트 수, birthDate/birthTime/gender/phoneNumber/totpSecret만 선택 시 약 8~12개 파일 추정 — `User`/`ProfileCard` CRUD 라우트 + AI 상담 라우트들의 `birthInfo` 입출력 지점).
- **데이터 마이그레이션**: **필요** — 기존 평문 레코드를 일괄 암호화하는 dry-run 우선 스크립트(Phase 3에서 작성, 실제 실행은 별도 승인).
- **롤백 가능 여부**: **불가** — 배포 후 데이터 포맷이 바뀌므로 CLAUDE.md 규칙대로 `rel/` 태그 롤백 금지 대상이 된다. 배포 전 KV/D1(이 경우 MongoDB) 백업 확보 필수, 확보 전에는 구현 시작 금지(원 프롬프트 5절 경고 그대로 적용).
- **리스크 및 영향받는 기능**: 사주/프로필/모든 AI 상담 라우트의 읽기·쓰기 경로 전부. 회귀 범위가 이번 설계안 중 가장 넓다.
- **검증 방법**: 암호화→복호화 왕복 일치 테스트, IV 매번 다른지 확인, 잘못된 키로 복호화 실패 확인, 마이그레이션 dry-run 결과와 실행 후 결과 비교, 사주 계산 결과가 **변경 전과 완전히 동일한지** 회귀 확인(원 프롬프트 Phase 4 필수 항목).

### B3. 캐시/저장 키 해시화

- **조치 내용**: 두 지점 모두 **클라이언트 사이드**라 비밀키가 필요한 HMAC이 아니라 **일반 SHA-256 해시**로 충분하다(비밀키를 브라우저에 둘 수 없으므로).
  1. `app/saju/animal-destiny/lib/sajuAdapter.ts:91-99` `stableInputKey()` — 실제로는 브라우저 JS 힙 메모리에만 잠깐(요청 완료 즉시 삭제) 존재해 지속 저장·로그 노출이 없다. 실질 위험은 낮지만 원 프롬프트가 명시적으로 짚은 패턴이라 최소 변경으로 함께 처리.
  2. `app/destiny-compass/_hooks/useCompassSession.ts:86` — sessionStorage **키 이름**에 생년월일시가 그대로 들어가 DevTools에서 상시 열람 가능 — 이쪽이 실질 위험이 더 크다.
  - 이미 같은 목적의 안전한 패턴이 `lib/llm-cache.ts:23,69`에 구현되어 있음(`sha256Hex` + `buildCacheKey`, 서버 전용 모듈)이나 이 두 지점은 클라이언트 컴포넌트라 서버 전용 모듈을 그대로 import하지 않고, `crypto.subtle.digest`를 쓰는 동일한 방식의 짧은 로컬 헬퍼를 각 파일에 둔다(기존 안전 패턴과 동일 알고리즘, import 경계만 존중).
- **변경 파일**: 2개.
- **데이터 마이그레이션**: 불필요(둘 다 휘발성 클라이언트 캐시 — 자연 무효화).
- **롤백 가능 여부**: 가능.
- **리스크 및 영향받는 기능**: 사주 계산 dedup, 나침반 세션 캐시. 키 알고리즘만 바뀌므로 기능 영향 없음(무효화로 인한 재계산 1회만 발생).
- **검증 방법**: 캐시 히트/미스 동작이 이전과 동일한지, 계산 결과가 동일한지 확인.

### B4. 쿠키·보안 헤더

- **현재 상태**: HttpOnly/Secure/SameSite=Lax 이미 적절히 적용됨(A1과 무관하게 서버 측은 정상). CSP는 이미 강제 모드로 프로덕션에 라이브 중이라 **Report-Only 2단계 도입은 불필요**(이미 그 단계를 지난 상태).
- **조치 내용(선택)**: `_headers:17`의 HSTS에 `preload` 지시어만 추가(`max-age=31536000; includeSubDomains; preload`). **주의**: 이 지시어 추가 자체는 안전하고 되돌리기 쉽지만(브라우저가 실제로 강제하려면 도메인이 hstspreload.org 목록에 별도 제출·등재돼야 함), **목록 등재 자체는 이번 설계안 범위에 포함하지 않는다** — 등재는 사실상 되돌리기 매우 어려운 별개의 결정이라 원하시면 이후 별도로 명시적 승인을 받는다.
- **변경 파일**: 1개(`_headers`, `public/_headers`도 `verify-security-hardening.mjs`가 동등성을 강제하므로 함께).
- **데이터 마이그레이션**: 불필요.
- **롤백 가능 여부**: 가능.
- **리스크 및 영향받는 기능**: Android WebView·PortOne 결제창은 HSTS 헤더 자체에 영향받지 않음(쿠키/CSP 변경이 아니므로 원 프롬프트가 우려한 지점과 무관). 영향 없음으로 판단.
- **검증 방법**: `curl -I` 응답 헤더 확인, `npm run verify:security-hardening`(존재 시) 재실행.

### B5. 로그 마스킹

- **조치 내용**: 기존 `maskBirthDate()` 컨벤션(`YYYY-**-**`, 운세 AI 라우트군 8곳에 이미 개별 구현됨)과 같은 스타일로 이메일 마스킹을 적용한다.
  1. **`worker/lib/daily-fortune-task.js`**(프로덕션 실제 cron 경로 — `worker/wrangler.toml:113`의 `crons = ["0 22 * * *", ...]`이 이 경로를 호출함을 확인) — 6개 로그 지점의 `sub.email`을 마스킹된 값으로 교체.
  2. **`server/jobs/daily-content-cron.js`** — 이 파일을 참조하는 코드가 `server/` 전체에서 발견되지 않아(grep 결과 0건) **현재 어디서도 호출되지 않는 것으로 보이는 legacy 파일**이다. 우선순위 낮음 — 원하시면 A안(같이 수정) 또는 B안(현재 미사용 확인만 하고 스킵) 중 선택 가능.
  3. **`celestial-harmony.html:2157`** — `console.log('[CelestialHarmony][Restore] response', { status, payload })`을 payload 필드 단위로 축약(토큰은 이미 마스킹 중인 것과 동일 수준으로).
  4. **`scripts/seed-test-users.mjs:257`** — 평문 비밀번호 콘솔 출력 제거 또는 마스킹(로컬/CI 스크립트, 영향 최소).
- **변경 파일**: 3~4개(2번 스킵 시 3개).
- **데이터 마이그레이션**: 불필요.
- **롤백 가능 여부**: 가능.
- **리스크 및 영향받는 기능**: 로그 가독성만 영향(디버깅 시 이메일 뒷부분이 가려짐) — 운영에 필요하면 마스킹 대신 내부 전용 로그 레벨 분리도 대안으로 제시 가능.
- **검증 방법**: 로컬에서 cron 핸들러 실행 후 로그 출력에 이메일 마스킹 형식(`a***@d***.com`) 확인.

---

## 그룹 C — Phase 1 P1 중 위 그룹에 안 걸리는 항목

### C1. localStorage 평문 PII/토큰 축소

- **조치 내용**: 웹 브라우저 경로에서 `fortune_auth_user`(이름/이메일/전화번호, `app/_lib/auth-storage.ts:92-104`)를 localStorage 대신 세션 상태(메모리) 또는 서버 세션 조회로 대체하는 것이 이상적이나, **모바일 앱(Capacitor WebView)은 오리진 제약(`https://localhost`)으로 쿠키를 못 써서 설계상 localStorage 토큰 저장이 불가피**하다(`worker/routes/auth.js:1122-1150` 근거 주석 확인됨). 따라서 이번 라운드는 **웹 전용 `fortune_auth_user` 캐시의 보관 범위 축소(전화번호 등 민감 필드 제외, 표시에 필요한 최소 필드만 유지)** 정도로 좁혀 제안한다. 전면 재설계(서버 세션 조회로 완전 대체)는 인증 흐름 전반을 건드리는 별도 과제로 분리 권장.
- **변경 파일**: 1~2개.
- **데이터 마이그레이션**: 불필요.
- **롤백 가능 여부**: 가능.
- **리스크 및 영향받는 기능**: 로그인 후 UI에 표시되는 사용자 정보(이름/이메일 등)가 캐시에서 못 읽는 필드는 서버 재조회가 필요해질 수 있음 — 화면별 영향 확인 필요.
- **검증 방법**: 로그인 → 새로고침 → 프로필 표시 정상 확인, 결제용 전화번호 조회가 필요한 화면(주석에 "결제용 휴대폰 번호는 반드시 통과시킨다"고 명시된 지점)이 깨지지 않는지 별도 확인 필수.

### C3. 리퍼럴 공유 토큰 TTL 단축 (낮은 우선순위)

- **조치 내용**: `worker/routes/auth.js:193-205`의 `signReferralShareToken()` TTL을 30일에서 단축하는 안. 세션 접근 권한은 없는 추천 코드 클레임 전용이라 실질 위험이 낮아 **이번 라운드 보류를 권장** — 참고용으로만 목록에 남긴다.
- **권장**: 이번 승인 대상에서 제외, Phase 1 보고서에 기록만 유지.

---

## 승인 요청 (STOP 2)

"전체 승인"이 아니라 **항목별로** 선택해 주세요. 아래 질문에서 고른 항목만 Phase 3(구현)로 진행하고, 항목마다 별도 커밋으로 분리합니다.
