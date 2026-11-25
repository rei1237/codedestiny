---
status: in-progress
updated: 2026-11-26
next: 단계 8 — PRIV-005 상대방 고지 문구·PRIV-004 위탁/국외이전 표 초안을 docs/security/privacy-drafts-2026-11-26.md 에 작성(반영 안 함)
---

# 개인정보 보안 개선 (PRIV) 인수인계

## 첫 행동
1. `Set-Location D:\Development\codedestiny-worktrees\privacy-hardening-20261126-052931` (이 워크트리에서만 작업. 루트 `D:\Development\code-destiny`는 옆 세션 미커밋 변경이 있으므로 reset/stash/checkout -- 금지, 편집 금지).
2. `git status`, `git log --oneline -3` 확인.
3. 아래 "단계"에서 첫 미체크 항목부터.

## 지금 상태
- 워크트리: `D:\Development\codedestiny-worktrees\privacy-hardening-20261126-052931`, 브랜치 `wt/privacy-hardening-20261126-052931`, 기준 origin/main `0115c2ac85`.
- node_modules 는 루트로 정션, .env.local 하드링크. (create-safe-worktree.ps1 이 PS5.1 stderr 때문에 중간 종료돼 수동으로 마무리함)
- Phase 1 보고서: 루트 체크아웃 `docs/security/PRIVACY_AUDIT_2026-11-26.md` (미추적, **커밋 금지** — 사용자 지시). 진단 근거 줄 번호는 4b2617e036 기준이며 대상 파일은 0115c2ac85 까지 무변경 확인.

## 승인 상태
- 2026-11-26 사용자 원문: "권장 사항으로 다음 단계 진행해" — Phase 1 보고의 권장안(아래 단계 1~7 자율 수정, 8~12 초안·설계만) 승인.
- 저장소 규칙 우선: 브랜치·PR 없음. 이 wt 브랜치에서 커밋 → 루트가 아닌 방식으로 main 에 fast-forward/merge → push → 워크트리 배수.
- 미승인: 운영 배포, 새 CI 필수 게이트 등록, 결제 실행 파일(worker/payments/**, worker/routes/app-store.js, 동결 매니페스트 대상) 수정, 과금 LLM 호출, 방침 문구 반영, 탈퇴 파기 범위 변경.

## 작업 규칙과 함정
- 커밋 1개 = PRIV 1건. 메시지 `fix(security): ... (PRIV-00x)` + 끝에 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- 각 단계: 재현 테스트(수정 전 실패) → 수정 → 테스트 통과 → `npm run check:fast` 1회 → 변경 파일만 `git add` → commit.
- jest 는 `scripts/run-mock-tests.mjs` 러너 경유(직접 jest 금지). 기존 패턴: `__tests__/worker/auth.require-exp.test.js`, `security.request-boundaries.test.js`.
- 인증 변경(RED): 롤백은 해당 커밋 revert. DB 마이그레이션 없음.
- 결제 동결 여부: 파일 수정 전 payment-freeze 매니페스트(`git grep -n "neo-consultations" -- scripts config docs/context/payment-gating.md`)로 동결 대상인지 확인. 동결이면 수정하지 말고 diff 초안만 이 문서에 남김.
- CRLF: Edit 가 CRLF 를 떨굴 수 있음 → `git diff --stat` 로 전체 줄 변경이 생기지 않았는지 확인.
- 정적 셸(index.html, js/**) 수정 시 `npm run sync:public` 후 public 미러도 같은 커밋.
- 범위 밖 결함은 고치지 말고 이 문서 "후속"에 적기.

## 설계 (단계별)
1. **PRIV-003** `worker/lib/auth.js` `extractTokenUserId`(≈:523): `payload.typ === "refresh"` 면 "" 반환. access 토큰 발급(routes/auth.js signJwt 호출부)은 typ 없음이 정상이므로 typ 없음·"access" 는 허용. peekAccessTokenUserId 등 access 검증 경로 전부 같은 함수를 쓰는지 확인. 테스트: refresh 페이로드를 access 시크릿으로 서명한 토큰을 Bearer 로 → 인증 실패; 일반 access → 성공.
2. **PRIV-002(neo 라우트만)** `worker/routes/neo-consultations.js:76` `peekAccessTokenUserId` → 탈퇴 확인되는 인증(`requireUserFromRequest(request, env, {surfaceDbInfraError:true})` 등 lib/auth.js 의 기존 함수; 실패 시 게스트=''와 동일 의미 유지, DB 장애는 503). GET status 경로는 그대로. 테스트: 탈퇴 사용자 토큰으로 주문 생성 → 401/403. `payments-v2.neo-consultation.test.js` 회귀 통과. payments/index.js:2191·gift-routes.js:53 은 diff 초안만.
3. **PRIV-008** `worker/lib/log-redact.js`(신규) `redactForLog(obj)`: 키 이름 기반 마스킹(birth*, *Date of birth, name, email, phone, token, question, prompt, partner*) + 깊이/길이 제한. 기존 `worker/lib/security/index.js:73 safeObject` 로직 재사용 가능하면 재사용. 적용: love-secret-ai-calculation.js:735,749 / sukuyo-compatibility-ai.js:435 / ziwei-ai-chart.js:573 (경로는 git grep 으로 확인) — birthDate 원문 대신 hasBirthDate/연도. 테스트: 가짜 생년·이메일·토큰 마스킹.
4. **PRIV-006** `worker/lib/feedback-notify.js:40-63` 웹훅 본문에서 사용자 본문·URL 제거, 피드백 ID·카테고리·관리 화면 링크만. 기존 feedback 테스트 갱신.
5. **PRIV-009** `app/_lib/auth-client.ts` `clearClientAuthState`(≈:391) 에서 `FORTUNE_APP_USER_PROFILES` 접두사 키 삭제. 레거시 `js/destiny-profile.js` 의 로그아웃 경로도 같은 키를 남기는지 확인.
6. **PRIV-016** `index.html:12197-12252` familyTest: hostname==localhost 조건 대신 Capacitor 앱 제외(예: `window.Capacitor` 존재 시 비활성) + 개발 전용 조건; `js/inline/api-base-init.js:18-24` api 파라미터 저장을 code-destiny.com·localhost·staging 허용 목록으로 제한. sync:public.
7. **PRIV-013** 경계 `String()` 변환: `worker/toss/birth-readings.js:26`, `worker/yeongnyangi/service.ts:209,216,413`, `worker/lib/relationship-delivery-store.js:76`. 테스트: `{"$ne":null}` 입력이 문자열 "[object Object]" 로 무해화 또는 400.
8. 초안: PRIV-005 상대방 정보 고지 문구 + PRIV-004 방침 위탁·국외이전 표 → `docs/security/privacy-drafts-2026-11-26.md` (반영 안 함).
9. 설계안: PRIV-001 탈퇴 파기(컬렉션별 삭제/`$unset`/보존 표, docs/context/library-preservation.md 정합) → 같은 drafts 문서.
10. 설계·diff 초안: PRIV-002 결제/선물, PRIV-018, PRIV-007/010/011/012/015/021 → 같은 drafts 문서.
11. 머지·전달: `npm run check:pre-push` → main 반영(루트 체크아웃을 건드리지 않고 `git push origin HEAD:main` 이 fast-forward 인지 확인 후) → main CI 결과 1회 확인 → 루트에서 `npm run worktree:remove -- <경로>` 는 루트가 옆 세션 작업 중이므로 **보고만**(사용자/세션 주도).

## 단계
- [x] 1 PRIV-003 (93f73a0bb2)
- [x] 2 PRIV-002 neo (c87f7fe4ac)
- [x] 3 PRIV-008 (79bb0f6d8b)
- [x] 4 PRIV-006 (4176280cb5)
- [x] 5 PRIV-009 (77944d42f7)
- [x] 6 PRIV-016 (49380c9c32, 사이트맵 재생성 d44d9abb39)
- [x] 7 PRIV-013 (코드 변경 없음 — 이미 가드됨, 결과 기록 근거)
- [ ] 8~10 drafts 문서
- [ ] 11 전달

## 결과 기록
(단계별 커밋 SHA·테스트 명령·출력 요약)

### 단계 1 PRIV-003 — `93f73a0bb2`
- 수정: `worker/lib/auth.js` `extractTokenUserId` 첫 줄에서 `typ === "refresh"` 면 "" (requireAuth·getOptionalUserFromRequest·peekAccessTokenUserId 가 모두 이 함수를 지남). typ 없음·"access" 허용.
- 재현 테스트: `__tests__/worker/auth.reject-refresh-typ.test.js` — 수정 전 `node scripts/run-mock-tests.mjs jest --runInBand __tests__/worker/auth.reject-refresh-typ.test.js` → 2 failed / 2 passed(refresh 토큰이 requireAuth·peek 통과). 수정 후 관련 4개 스위트(reject-refresh-typ, require-exp, app-refresh-token, require-auth.fallback) 36/36 pass.
- `npm run check:fast`: tier critical 자동 승격(typecheck·test:node·test:jest 전체 포함, 약 35분), exit 0. jest `Tests: 1 skipped, 8635 passed, 8636 total`.

### 단계 2 PRIV-002(neo) — `c87f7fe4ac`
- 동결 확인: `config/payment-freeze.json`·`docs/context/payment-gating.md` 에 `worker/routes/neo-consultations.js` 없음(`git grep -n "neo-consultations" -- scripts config docs/context/payment-gating.md` → verify-neo-consultation-ui.mjs 참조만) → 직접 수정.
- 수정: `worker/routes/neo-consultations.js` 에 `resolveNeoCustomerUserId(request, env)`(export) 신설 — `resolvePaidRouteAuth`(활성·탈퇴 DB 확인) 결과 userId, 없으면 . `handleNeoRuntimeRequest` 는 peek 대신 이 함수 사용, 503 HttpError 는 `{code:AUTH_STATUS_TEMPORARILY_UNAVAILABLE, retryable:true}` 503 JSON 으로 응답. status GET·admin 경로 무변경.
- 재현 테스트: `__tests__/worker/neo-consultations.withdrawn-auth.test.js`(db.js·models.js 목, 탈퇴→·401·create 미호출 / 활성→userId / 토큰 없음→ / DB 장애→503). 헬퍼를 옛 peek 동작으로 바꿔 돌리면 2 failed(탈퇴·503) 확인 후 원복. 수정 후 이 파일 + `payments-v2.neo-consultation.test.js` 11/11 pass, `node --test __tests__/ui/neo-consultation.test.mjs` 41/41 pass.
- `npm run check:fast`: tier critical, exit 0. test:node `tests 5842 pass 5842 fail 0`, jest `Tests: 1 skipped, 8639 passed, 8640 total`.
- payments/index.js:2191·gift-routes.js:53 diff 초안은 단계 10 에서.

### 단계 3 PRIV-008 — `79bb0f6d8b`
- 신설 `worker/lib/log-redact.js` `redactForLog(value)`: 생년월일 키는 `YYYY-**-**`(연도만), birth/email/phone/token/secret/password/authorization/cookie/question/prompt/message/name/partner 키는 `[redacted]`, 깊이 3·키 40·배열 20·문자열 300자 제한. security/index.js safeObject 는 비공개라 재사용 안 함.
- 적용: love-secret-ai-calculation.js(내/상대 명식 실패 로그 2곳), sukuyo-compatibility-ai.js(계산 실패 로그), ziwei-ai-chart.js(정오 기준 로그).
- 테스트 `__tests__/worker/log-redact.test.js`(단위 + birthDate 를 싣는 console 호출이 redactForLog 로 감싸졌는지 소스 스캔): 수정 전 6/6 fail(모듈 없음) → 수정 후 6/6 pass, sukuyo 중복 생성 스위트 포함 67/67.

### 단계 4 PRIV-006 — `4176280cb5`
- `worker/lib/feedback-notify.js` 웹훅 본문을 `🐞 새 제보 · <분류>` / `ID` / `관리 화면: <PUBLIC_SITE_URL|SITE_URL>/admin/feedback/` 3줄로 축소(제목·본문·URL·제보자 제거). 관리자 메일은 그대로. env 키는 env.contract.json 기존 키.
- 테스트 `__tests__/worker/feedback-notify.webhook-minimal.test.js`(discord·slack·상대경로 폴백): 수정 전 3/3 fail → 수정 후 `payments-v2.fulfillment-alert.test.js` 포함 12/12 pass. 기존 feedback-notify 테스트는 없었음.

### 단계 5 PRIV-009 — `77944d42f7`
- `app/_lib/auth-client.ts` `clearClientAuthState` 에 `clearAccountProfileLocalStorage()` 추가: `FORTUNE_APP_USER_PROFILES*`·`code-destiny.activeProfile*` 키 삭제, `::guest` 로 끝나는 키는 유지(계정 데이터 아님·서버 사본 없음 — 가정, 후속 참고).
- 정적 셸 `index.html` `__cdClearClientAuthState` 에 같은 정리(ES5), sync:public 미러 7개 같은 커밋.
- 테스트 `node --test __tests__/ui/logout-profile-storage-clear.behavior.test.js`: 수정 전 2/2 fail → 수정 후 2/2 pass. 관련 ui 프로필 저장 스위트 18/18·55/55 pass.

### 단계 6 PRIV-016 — `49380c9c32`
- `index.html` `__cdBootstrapLocalFamilyProfile`·`_cdBuildLocalFamilyTestPassAccess`: `location.protocol !== 'http:'`·`window.Capacitor`·`__CODE_DESTINY_RUNTIME_TARGET==='mobile-app'` 이면 비활성. familyTest 의 `api` 파라미터는 localhost/127.0.0.1/[::1] 만, 아니면 `http://localhost:4000`.
- `js/inline/api-base-init.js`: `isTrustedApiHost`(같은 출처·로컬 개발 호스트·https code-destiny.com/*.code-destiny.com)만 허용, workers.dev 는 현재 출처가 workers.dev 일 때만. 저장값 검사·삭제를 분기보다 먼저 실행. 미러·`?v=` 갱신.
- 테스트 `node --test __tests__/ui/dev-family-test-and-api-base.behavior.test.js`: 수정 전 5 fail/1 pass → 수정 후 6/6, android-app-locale 16/16. `node scripts/verify-auth-public-origin.mjs` VERIFY_OK.
- 사이트맵: auth-client.ts·셸 변경이 라우트 서명 330개를 바꿔 check:fast `verify:sitemap-drift` 가 막음 → `npm run sitemap:generate` 결과를 `d44d9abb39` 로 커밋(lastmod 405건 하루 전진, URL 집합 불변). SEO 영향: URL·색인 정책·메타 변화 없음, lastmod 만.

### 단계 7 PRIV-013 — 코드 변경 없음
- 대상 5곳을 현재 코드에서 다시 읽은 결과 모두 필터 진입 전에 `typeof === 'string'`·길이 검사가 있어 `{"$ne":null}` 은 이미 400/422 로 거부된다: birth-readings.js `prepareBirthReading`(profileId), yeongnyangi/service.ts prepare(profileId·partnerProfileId — 동일성 비교 뒤지만 findOne 전 typeof), experienceCheckFortune(profileId), relationship-delivery-store.js `runRelationshipDelivery`(resumeSessionId 정규식·idempotencyKey typeof+길이 12~180, :41-42·:50). birth-readings `owned()` 의 id 는 라우트 정규식 `[a-f0-9]{64}` 로만 들어온다(worker/toss/routes.js:606).
- 수정 전 실패하는 재현 테스트를 만들 수 없어(이미 가드) 코드·테스트를 추가하지 않음. 전역 sanitizeFilter 는 감사대로 보류.

### check:fast (단계 3~7 일괄, `npm run check:fast -- --base=545dbfca2c`)
- 1차: tier critical, `verify:sitemap-drift` 에서 BLOCKED → 사이트맵 재생성 커밋 `d44d9abb39`.
- 2차: whitespace·doc-freshness·paid-gate suite·lint·sitemap-drift·typecheck 통과. test:node `tests 5850 pass 5848 fail 2` — 실패 2건(`__tests__/ui/yeongnyangi-reading-v7-golden.test.mjs`, `yeongnyangi-v7-checkpoint-import.test.mjs`)은 둘 다 spawnSync 60초 타임아웃(status null). 대상 스크립트 `scripts/yeongnyangi-v7-golden.mjs` 단독 실행은 exit 0·48초로, 다른 세션 node 프로세스 46개가 도는 부하에서 60초 한도를 넘긴 시간 초과다(단계 2 에서는 같은 테스트 통과, 이번 변경과 무관한 영냥이 v7 경로). CI 에서 재확인 필요.
- test:node 이후 단계(verify 23종·build:worker·verify:entry-encoding --strict-core·test:jest)는 check-changed 와 같은 env(LLM_DRY_RUN·mock-network-guard)로 개별 실행: 전부 통과, jest `Tests: 1 skipped, 8648 passed, 8649 total`.

## 후속
(범위 밖 발견)
- [PRIV-003 연장, 결정 필요] 서비스별 단기 토큰(예: `worker/routes/love-secret-ai.js:402` `createAccessToken` typ="love-secret-ai-access", astrology·karma·life-book 동형)이 로그인 access 와 같은 시크릿·issuer·audience 로 서명되고 `userId` 를 실어, `extractTokenUserId` 가 이를 로그인 토큰으로도 받아들인다(TTL 45m 등). refresh 만 막은 현재 수정 범위 밖. 더 엄격한 안: typ 허용 목록(없음·"access"만). 발급처 전수 확인 후 별도 RED 로 다룰지 사용자 판단 필요. (social grant/oauth state 는 aud 없음 → audience 검증에서 이미 거부됨, 확인함.)
- [측정] 이 워크트리에서 auth·결제 인접 파일 변경 시 check:fast 가 critical 로 승격돼 1회 약 30~35분. 남은 단계 계획 시 참고.
- [PRIV-016 연장] `fortune_api_base_url` 을 직접 읽는 스크립트가 더 있다(index.html 인라인 ≈23511/23780/23802, js/destiny-profile.js, saju-engine.js, dream-ledger.js, saju-compat-archive.js, index-inline-runtime.js:1653). api-base-init 이 defer 라 그보다 먼저 도는 인라인 읽기는 정리 전 값을 볼 수 있다. 허용 목록을 공용 헬퍼로 모으는 별도 작업 필요.
- [PRIV-016 확인] Capacitor 앱(https://localhost)에서 api-base-init 의 `isLocalDevHost` 분기가 location.origin 을 API base 로 쓴다(기존 동작, 이번에 바꾸지 않음).
- [PRIV-009 범위·결정] `FORTUNE_APP_USER_PROFILE`(단수)·`FORTUNE_APP_VEDIC_PAYLOAD`·`OLYMPUS_ORACLE_PROFILE` 브리지 키는 로그아웃에서 지우지 않았다(레거시 셸이 스코프 전환 때 정리). `::guest` 스코프 키 유지도 사용자 확인 필요.
- [PRIV-006] 관리자 피드백 화면은 id 딥링크를 받지 않아 웹훅 링크는 목록 화면까지만 간다.
