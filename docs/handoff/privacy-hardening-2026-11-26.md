---
status: in-progress
updated: 2026-11-26
next: 단계 3 — PRIV-008 worker/lib/log-redact.js redactForLog 신설·LLM 로그 3곳 적용
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
- [ ] 3 PRIV-008
- [ ] 4 PRIV-006
- [ ] 5 PRIV-009
- [ ] 6 PRIV-016
- [ ] 7 PRIV-013
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

## 후속
(범위 밖 발견)
- [PRIV-003 연장, 결정 필요] 서비스별 단기 토큰(예: `worker/routes/love-secret-ai.js:402` `createAccessToken` typ="love-secret-ai-access", astrology·karma·life-book 동형)이 로그인 access 와 같은 시크릿·issuer·audience 로 서명되고 `userId` 를 실어, `extractTokenUserId` 가 이를 로그인 토큰으로도 받아들인다(TTL 45m 등). refresh 만 막은 현재 수정 범위 밖. 더 엄격한 안: typ 허용 목록(없음·"access"만). 발급처 전수 확인 후 별도 RED 로 다룰지 사용자 판단 필요. (social grant/oauth state 는 aud 없음 → audience 검증에서 이미 거부됨, 확인함.)
- [측정] 이 워크트리에서 auth·결제 인접 파일 변경 시 check:fast 가 critical 로 승격돼 1회 약 30~35분. 남은 단계 계획 시 참고.
