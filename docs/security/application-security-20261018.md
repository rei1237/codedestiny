# 애플리케이션 보안 조사 — 2026-10-18

상태: 아래 범위의 보안 수정·main 통합·push, CI required 및 유료 흐름 검증 완료. 전수 동적 감사·운영 안전성 인증 문서가 아니다.

- 기준 SHA: `f11871f4cf9e344ad5c9484e81cc32351b5ebc3c`
- 격리: `wt/security-audit-20261018-20261018-015620`
- 공유 main: 다른 세션 변경 86항목, 기준 원격보다 323커밋 이전. 수정·stash·reset·통합하지 않는다.
- 전달 기반: 초기 AI Locale·main CI 실패는 후속 복구로 해소했다. 복구 SHA `e53c065cf5463b65fbbedc969edc2da6a8c97ca3`의 PR CI39095183552·AI Locale39095183605·Secret Scan39095183563 success를 확인한 뒤 보안 통합을 진행했다. 실패한 main 위로 보안 변경을 push하지 않았다.
- 승인 범위: 로컬/mock 보안 조사·수정·검증·작은 커밋·안전한 main 전달. 운영 배포·DB·시크릿 변경·외부 발송 제외.

## 진행 기록

- [x] 저장소 규칙·아키텍처·정책·과거 보안 후속 문서 확인
- [x] 최신 원격 기준 작업 격리
- [x] 실제 라우트 및 신뢰 경계 점검표(정적 분기 목록, 동적 미검증 구분)
- [x] A–G 조사 및 증거 분류(아래 한계 포함)
- [x] 본문 크기·호출 제한 오류·로그 중첩 후보 재현
- [x] OAuth 브라우저 바인딩 재현·수정, 확인된 경계 결함 수정
- [x] check:fast 실행 및 중단 기록, 계획의 개별 검사·전체 shard 수행, check:pre-push, 커밋
- [x] main 통합·push·정확한 SHA CI required (`e41141536`, 아래 전달 결과)

## 변하지 않는 계약

서버 가격 registry, 이용권·월정석·단건 결제 정책, 주문 가격 스냅샷 및 레거시 권리를 유지한다. 영냥이/꿀꿀운세 보관함을 분리하며 완료 결과 재열람은 원문을 사용하고 추가 결제·차감·LLM 호출을 하지 않는다. 운영 인덱스·TTL·구매 원본을 변경하지 않는다.

## 1. 구조·범위와 읽는 방법

```text
웹 정적 Next export / 레거시 HTML / Capacitor 앱
  → public/_worker.js (Pages: /api 프록시, 정적 자산, 공개 공유 OG)
  → worker/index.js (CORS, 직접 분기, 별칭 rewrite, 일부 AI security wrapper)
  → worker/routes/* / worker/payments/index.js / worker/yeongnyangi/*
  → JWT 또는 관리자/웹훅 자격 → 소유자·서비스·상품·주문 상태 검사
  → Mongo (Mongoose 및 결제 native driver/admission/transaction)
  → PG 조회·취소 / LLM / 메일·알림 / 지도·천문 데이터
```

`next.config.mjs`의 production `output: export`, 실행 가능한 `app/api` 부재를 확인했다. Next 서버 취약점을 자동으로 Worker API에 적용하지 않는다. Worker에 도달하는 모바일 요청도 동일 서버 경계를 쓰지만 앱 토큰 저장·웹뷰 쿠키의 실제 기기 검증은 하지 않았다.

`routes-20261018.json`은 `scripts/audit-security-routes.mjs --write`로 실제 진입점과 literal import를 따라 생성했다. 파일 SHA256, 메서드/경로 조건, 핸들러, 인증 선언, 보안 검사 후보·외부 호출 후보의 줄 번호, 각 점검 열과 미확정 상태를 기록한다. 126파일, 928개 **분기/매처**이며 고유 API 928개라는 뜻이 아니다. import된 레거시 핸들러는 상위 dispatch에 의해 가려질 수 있다. 단순 함수명 출현은 실행 순서·모든 경로에서 검사 실행의 증명이 아니다. 별칭은 상위 `worker/index.js` 분기와 하위 핸들러를 함께 읽는다.

아래 수동 점검표는 중요한 실행 경로의 판단 근거를 보완한다. 나머지 목록 행은 정적 위치 확인이며 인증·소유권·입력 제한의 **동적 전수 검증 미완료**다. 자동 목록을 모두 안전하다고 판정하지 않았다. 이 생성기는 보안 통과 판정기가 아니며 기본 실행은 읽기 전용이다.

| 실제 경계/경로군 | 조작 입력과 인증 | 소유자/서비스 검사 | 입력·호출 제한 | 민감정보·외부 비용·부작용 | 확인 수준 |
|---|---|---|---|---|---|
| `/api/auth/*` start/callback/login/refresh/logout/withdraw | OAuth state/code/next/appRedirect, cookie/Bearer; `worker/routes/auth.js`, `worker/lib/auth.js` | 소셜 identity, 기존 계정 및 탈퇴 상태; refresh 세션 저장·회전 | 로그인 제한, JWT 만료/issuer/audience; OAuth browser binding 추가 | 이메일·휴대전화·생년; OAuth 토큰 교환·세션/사용자 쓰기 | JWT/secret/refresh 및 전화 재동의 mock; 전체 소셜 로그인 실기기 미검증 |
| `/api/records` 목록/상세/검색 | cursor/source/id/query; `worker/routes/records.js:9` 인증 | `record-library.js:69,84,125,207` 사용자 및 source 조건, lookup에도 사용자 제한 | 페이지 제한·cursor/검색 정규화; private,no-store | 기존 상담/출생정보 읽기; 저장 결과 읽기에 새 생성 없음 | 코드 및 기존 보관함 테스트; 운영 데이터 다양성 미검증 |
| `/api/yeongnyangi/*`, `/yeongnyangi/library/` | requestId/profileId/chart/answers | readRequest와 ownerId, 꿀꿀운세 source와 별도 저장소 | 라우트별 parser/락·queue; common AI wrapper를 일괄 가정하지 않음 | 출생정보·상담·생성/결제 요청 | 소스·기존 전달 회귀; Mongo 실제 동시성 미검증 |
| `/api/yeongnyangi/report-shares/:token` | 공개 capability token; 생성/폐기는 소유자 인증 | 해시 token, request/owner/chart 결합, revoked·30일 만료 확인 | 64hex, 공개 필드 projection, HTML escape | 공유 요약만 공개; no-store/noindex/no-referrer | `report-share.js:22–39` 및 공유 회귀; 이미 외부에 복제된 공유 내용 회수 불가 |
| `/api/payments/{orders,recoveries,...}`, billing/coin-gate 별칭 | JWT userId, product/amount/order; route-table auth | `assertOrderOwner`, registry/주문 snapshot; 시스템 정산은 명시적 systemActor | 본문 256KiB 추가; native DB/admission/일부 cache | 주문·잔액·권리 쓰기, PG 요청 | 실제 진입 본문 테스트, 기존 결제 테스트; 탈퇴 토큰 별도 잔여 항목 |
| `/api/payments/webhook` 및 등록된 구 별칭 | 로그인 없음, 공급자 raw signature | 검증된 PG 주문 확인 후 시스템 정산 | raw 256KiB, 이벤트 예약/중복·재생 락 | 주문 상태·지급, PG 확인 | 기존 서명/재전송/역순 테스트; 운영 인덱스 미확인 |
| `/api/payments/gifts/*` | preview/context 공개 token, 나머지 JWT | purchaser/receiver, token hash, unique claim | Origin/JSON, 4KiB, Mongo counter | 선물권리·요청 상태 변경; 공개 preview 최소화 | 코드와 본문 회귀; 실제 동시 claim DB 미검증 |
| `runAiRouteWithSecurity`로 분기되는 AI 경로 | 질문·profile/result/resumeId | 하위 인증·유료 권리 및 저장 owner; wrapper 자체가 결제 권리는 아님 | action별 분/일 budget, resume 별도; 본문 256KiB; counter 장애503 | LLM 비용·상담 저장·권리 차감 | AI bucket56개, 전달 회귀; wrapper 밖은 따로 검토 |
| `/api/palm/*` 직접 분기 | 이미지/결과ID | 하위 인증·소유권·paid snapshot | 기존72MiB envelope를 stream에 적용; 이미지 자체 제한 유지 | 사진·LLM; 완료 재열람은 저장 원문 | 기존 palm 회귀 및 공통 byte reader |
| 관리자·내부·debug | admin token/역할, 설정 키, 진단 파라미터 | 하위 관리자 검사/로컬 진단 조건 | 관리자별 입력/요청 제한, 전부 공통 wrapper는 아님 | 사용자·주문·알림·관리자 공개URL 진단 fetch | 정적 검사; 모든 권한 조합의 동적 전수검사 미완료 |
| content/fortune/계산·recommendations 등 공개 조회 | slug/query/chart/tags | 공개/유료 분기별 상이; 공개 route를 전부 인증 대상으로 바꾸지 않음 | allowlist/계산별 제한·cache | 공개 데이터, 일부 외부 천문/지도 조회 | 목록+소스 샘플; 모든 URL/중첩 입력 fuzz 미실시 |

## 2. 확인한 결함과 수정

모두 기준 SHA의 코드/합성 입력에서 재현했다. 줄 번호는 이 작업 소스 기준이며 최종 파일 SHA256은 라우트 목록에 있다. 실사용자·실결제·실 LLM·운영 DB는 사용하지 않았다.

### SEC-01 — OAuth state가 로그인 시작 브라우저에 묶이지 않음

- **높음 / 확정 / 로컬 수정**. `worker/routes/auth.js:1440,4391,4642` (`verifySocialState`, `handleOAuthStart`, `handleOAuthCallback`).
- 전제/경로: 공격자가 자기 브라우저에서 정상 서명된 state와 자기 공급자 인증 code를 확보한 뒤 다른 브라우저에 callback URL을 열게 하는 로그인 CSRF. 전화 동의 재인증도 같은 callback 경계 사용.
- 기존 방어: 서명·purpose·provider·10분 TTL은 위조/다른 공급자를 막지만 정상 발급 state의 다른 브라우저 이식을 막지 못함. 휴대전화 재동의는 별도 계정 identity 비교가 있어 곧바로 타인 전화 변경으로 확대하지 않는다.
- 재현: 기존 전화 재동의 fixture에서 정상 callback의 cookie를 제거/다른 값으로 바꾸면 수정 전 두 사례 모두 200 및 공급자 교환 진행. 수정 후 302 실패 리다이렉트, 공급자 fetch/DB 갱신 0회. 일반 start의 세 공급자, 앱 리다이렉트, 기존 정상 전화 재동의 함께 테스트.
- 수정: 32바이트 난수 HttpOnly/Secure/SameSite=Lax/600초 host-only cookie, state에 SHA256만 저장, callback에서 타이밍 안전 비교를 DB/공급자 호출 전에 수행. 서버 설정 callback host로 start 정규화. state exp 필수.
- 영향/회귀: 같은 브라우저에서 정상 로그인 시작→callback 계약 유지. 배포 전에 시작한 구 state는 재시작 필요(최대10분 창). cookie 차단 브라우저·앱 외부 브라우저·다중 탭 및 www 정규화는 실기기 확인 필요. PKCE가 필요 없는 것으로 결론 내리지 않는다.
- 검증: `auth.phone-consent-reauth.test.js` 19개 통과. RFC9700의 사용자 에이전트에 결합된 CSRF 방어 취지와 일치: https://www.rfc-editor.org/rfc/rfc9700.html
- 롤백: 해당 인증 커밋만 revert; DB migration 없음. 롤백하면 원래 CSRF 위험이 다시 열리므로 공급자 로그인 일시 제한/패치 재적용 계획과 함께 판단.

### SEC-02 — 본문 실제 바이트 상한 누락/늦은 검사

- **중간 / 확정 / 로컬 수정**. `worker/lib/http.js:47`, `worker/lib/security/index.js:419`, `worker/payments/index.js:2041`, `worker/payments/gift-routes.js:60`, `worker/index.js:1466`, `worker/routes/palm.js:63`.
- 전제/경로: 공개 webhook 또는 인증 가능한 POST에 Content-Length가 없거나 작게 선언된 큰 스트림. Cloudflare의 플랫폼 상한 안에서도 앱이 전부 버퍼링/JSON 파싱하거나 로그만 남긴 뒤 처리. 플랫폼 상한을 넘는 공격 성공은 주장하지 않는다.
- 재현: header 없음/축소/정상 큰 값과 다바이트 입력을 공통 guard에 전달. 수정 전 허용; 실제 payment webhook/orders/gift 및 coin-gate 분기에서 이제 DB/PG 이전413. 고정 길이 헤더를 신뢰하지 않고 실제 chunk 바이트를 더한다.
- 수정: 독립 `readBoundedText` helper. 일반 JSON16MiB(기존 대형 관리/결과 입력 호환), 민감 guard·결제256KiB, gift4KiB, palm의 기존72MiB 유지. 첫 초과 chunk에서 취소. 원문 서명용 공백/UTF-8/CRLF 유지. clone 취소를 기다리며 교착하지 않음.
- 정상 영향: 기존 malformed400, empty JSON{}, multipart 원문, 웹훅 서명과 정상 손금 계약 유지. 기존에 과대한 입력을 보내던 클라이언트는413. 이 상한은 JSON 중첩/필드별 schema 및 동시성 상한의 대체물이 아님.
- 테스트: `security.request-boundaries.test.js`, `security.payment-body.test.js`; 정상 웹훅/재생/손금 테스트 함께 실행.
- 잔여: 모든 직접 request.json/text/formData 호출을 이 helper로 이관한 것은 아님. 매우 느린 스트림 시간 제한/플랫폼 ingress, 업로드 전체 조합·압축 해제 폭탄은 미검증.
- 롤백: 진입점 커밋을 먼저, 공통 helper 커밋을 나중에 revert. 데이터 변환 없음. 공통 http의 프론트 간접 참조 때문에 sitemap 원장3개 서명은 기존 generator로 갱신.

### SEC-03 — 유료 AI 호출 제한 저장소 실패 시 허용

- **중간 / 확정 / 로컬 수정**. `worker/lib/security/index.js:346` `enforceRateLimit` → `enforceAiRouteSecurity` → `worker/index.js:570`.
- 전제: Mongo counter 작업 실패/시간초과/잘못된 counter 반환 시 반복 요청. 인증·가격·이용권 검사가 우회된다는 뜻은 아니지만 작업별 비용/요청 budget 방어가 사라짐.
- 재현: mock counter throw/null/NaN/-1/Infinity. 기존 코드가 ok:true를 반환; 수정 후 enforce에서503 `RATE_LIMIT_UNAVAILABLE`, Retry-After1. 정상 counter와 초과429 유지. AI start 진입에서 실패 시 더 진행하지 않음 확인.
- 수정: enforce만 fail-closed, 유효한 양의 정수 counter 요구. monitor/off 의미 유지. 관측 로그·abuse score 쓰기는 계속 선택적이며 필수 인증/권리 검사를 대체하지 않음.
- 영향: 보안 DB의 짧은 admission/timeout(2슬롯/250ms/1초) 실패 시 정상 요청도503 가능. 한도를 늘리거나 정상 budget/가격을 바꾸지 않았다. 배포 시503 비율·DB admission 관측 필수.
- 테스트: 요청 경계17개와 기존 AI bucket56개. 운영 부하/분산 counter 실제 unique-index 효력은 미검증.
- 롤백: 공통 경계 커밋 revert, DB 상태 변경 불필요. fail-open 복귀 위험을 명시하고 가용성 문제가 생기면 원인인 저장소/분산 limiter를 우선 해결.

### SEC-04 — 보안 로그의 깊은 객체가 정화 없이 반환됨

- **낮음 / helper 결함 확정, 실제 개인정보 유입 미확정 / 로컬 수정**. `worker/lib/security/index.js:73` `safeObject` → `writeSecurityLog`.
- 재현: 합성 metadata의 깊은 password/token 키를 SecurityEvent.create까지 전달하면 기존 정화기가 원본 객체를 반환. 실제 호출부는 주로 얕은 count/product/resource metadata이며 공격자가 이 깊은 객체를 주입하는 현재 라우트는 확인하지 못했다. 운영 유출로 분류하지 않는다.
- 수정: 깊이 초과는 `[omitted]`, 문자열·배열 길이 제한, null-prototype 결과 객체. 허용된 shallow 진단 정보 유지.
- 테스트: 합성 marker가 저장 payload에 남지 않음 확인. 다른 일반 console 로그·메일·LLM 입력 정화 전체를 해결한 것은 아님.
- 롤백: 공통 경계 커밋 revert. 기존 로그의 삭제/보존/비밀 회전은 별도 운영 판단이며 이번 작업에서 실행하지 않음.

## 3. A–G 조사 결과와 남은 위험

### A 인증·세션

`worker/lib/jwt.js` HS256 제한, access/refresh의 issuer·audience·requireExp와 필수 secret의 production fail-closed, refresh session 저장/회전/재사용 방어를 확인했다. 쿠키 속성 및 모바일 전용 refresh header는 `worker/lib/auth.js`의 origin+runtime 조건을 사용한다. OAuth state는 SEC-01로 보강했다. 비밀번호 재설정/이메일 확인/관리자 등 모든 토큰 발급·소비 조합을 동적으로 검증한 것은 아니다.

**R-01 / 중간 / 코드상 확인·악용 범위 추가 검증 필요:** payments와 gifts는 `peekAccessTokenUserId`로 JWT 서명/만료만 확인한다(`worker/payments/index.js:2068`, `gift-routes.js:53`). 일반 인증의 User.status=withdrawn 검사와 다르다. 탈퇴가 refresh를 폐기해도 남은 access token의 수명(기본30분) 동안 어떤 결제 읽기/권리 작업이 허용되는지 완전한 route별 재현은 남았다. 결제의 단일 admission·적은 DB 왕복 설계를 깨는 전역 auth 조회를 즉석 추가하지 않았다. 개선안: 기존 결제 DB 슬롯 안에서 active-account 검사를 공유하고, cache hit도 같은 폐기 기준을 갖게 설계한 뒤 주문 읽기/소비/선물/탈퇴 경쟁을 함께 검증. 가격/보존 정책은 유지한다. 타인 계정 접근으로 과장하지 않는다.

### B 소유권·결과 보존

records는 인증 userId를 ownerQuery에 사용하고 source discriminator를 별도로 적용한다. ID 단독 조회가 아니라 `$and` owner/source/identity를 사용한다. join도 owner를 조건으로 한다. 영냥이 공유는 소유자만 생성하고 해시 capability+expiry/revocation+chart binding으로 읽으며 공개 projection과 escaping을 적용한다. credential-scoped cache는 Authorization+Cookie 해시, 무자격/Set-Cookie/오류 응답의 cache 배제를 사용한다. 계정 교체·완료 결과 재열람 회귀를 기존 테스트에서 확인하되 실제 CDN Rule, 브라우저 저장소·PDF 다운로드 전 경로는 미검증이다.

### C 결제·이용권·월정석

상품 registry·주문 snapshot·assertOrderOwner·명시적 systemActor, confirm 공유 함수, 원문 서명, event id 예약/재전송/정체 회복 경로를 추적했다. webhook 시간 창이 길어도 이벤트 중복 처리 방어와 별도이며 시간 창만으로 안전하다고 판단하지 않았다. 기존 mock의 중복·역순·지급/차감·완료 결과 재열람 회귀를 실행한다. DB unique index/transaction이 실제 운영에 적용됐는지 확인하지 않았고 mock을 실제 병렬 commit의 증거로 확대하지 않는다. 금액·수량·통화·상품 정책이나 레거시 구매 snapshot은 수정하지 않았다.

### D 입력·출력·외부 요청

SEC-02 수정. SavedReadingParts의 HTML은 `app/insights/_lib/sanitizePublicHtml.js` allowlist 재구성을 통과하고, report-share는 동적 텍스트/속성을 escape한다. 이 regex 기반 HTML 정화기의 모든 malformed HTML/mutation XSS를 증명한 것은 아니며 브라우저 fuzz가 남는다. 구조화 Mongo 조건/ID validation을 확인한 경로에서는 client JSON을 그대로 query/update로 전달하는 근거를 찾지 못했으나 전수 mass-assignment 검증은 아니다.

외부 URL은 확인한 Google purchase/PortOne/OAuth/천문·Nominatim 경로에서 서버 endpoint와 encoded/query 입력을 사용한다. 관리자 공개URL 점검은 설정 origin과 slug에서 URL을 만들고 fetch가 redirect를 따르므로 설정 권한·리다이렉트 chain은 추가 조사 대상이다. 파일 업로드 MIME/확장자/이미지 decoder 전체, 임의 파일 접근·명령/템플릿 주입 전체 fuzz는 미실시. 오류응답은 결제 publicErrorMessage에서 내부 DB 오류를 마스킹하지만 일반 로그의 메타가 모두 최소화됐다고 결론 내리지 않는다.

### E 개인정보·비밀

민감 정보는 profile/consultation/order DB, 일부 브라우저 결과 저장, OAuth/PG, 상담 LLM·배송 메일에 걸쳐 있다. records/private cache와 공유 projection은 확인했다. SEC-04는 helper 누출 방지이며 전체 로그 PII 감사와 다르다. `logPayment`의 userId/orderId/provider metadata, 외부 LLM 질문·출생정보, 메일 본문의 보존기간·위탁 설정은 운영 확인이 필요하다. 탈퇴 시 구매 기록 보존과 결과 접근 종료 정책을 무단 변경하지 않았다.

과거 secret-scan 후속 문서의 통과·회전 주장을 현재 키 폐기 증거로 재사용하지 않는다. Gitleaks8.24.2를 공식 release checksum 대조 후 로컬 실행, 값은 `--redact`로 가린다. 최종 결과와 역사적 fingerprint 분류는 아래 검증 기록에 남긴다. `.env`·실키를 읽거나 출력하지 않았고 외부 secret 검증 요청을 보내지 않았다. Git 추적 목록/정적 코드와 역사 스캔이 런타임 secrets·배포 bundle/source-map의 전수 검사인 것은 아니다.

### F LLM·비용

wrapper 적용 경로를 실제 `worker/index.js` 호출로 추적했다. resume 예외는 인증 userId+저장된 checkpoint/feature/service 조건을 사용하며 임의 resumeId를 일괄 무료 생성으로 인정하지 않는다. prompt/model text가 검토한 흐름에서 서버 권리 판정/도구 실행의 권위가 되는 근거는 없었다. 각 generator의 최대 token/time/retry/락은 다르며 모든 경로에 동일하다고 가정하지 않는다. mock runner의 외부 네트워크 차단을 사용했다. 실제 provider 장애·지연·사용량·모델 prompt injection 성공률은 미검증이다.

### G 인프라·공급망·CI

Worker CORS와 Pages hardenResponse, public/_headers를 확인했다. CSP에 legacy 연동용 unsafe-inline/unsafe-eval이 남아 있어 XSS 방어 심도가 제한된다. Pages advanced worker 생성 응답·프록시 응답에 실제 어떤 헤더가 최종 적용되는지는 배포 설정 확인이 필요하다. IP는 cf-connecting-ip 우선, 없으면 forwarded fallback이므로 신뢰할 수 없는 직접 프록시가 앞에 있는 환경에서 IP bucket 우회가 가능할 수 있다. Cloudflare 경계와 Worker 직접 주소 정책은 외부 확인 대상이다.

PR CI/Secret Scan/AI Locale workflow의 permissions와 실행 조건을 읽었다. 검토한 workflow에서 pull_request_target 실행은 발견하지 않았다. 외부 Action은 @v4 태그이며 완전한 SHA pin이 아니고 CI gitleaks 다운로드 무결성 확인 보강 여지가 있다. 침해가 발생했다는 뜻은 아니다. 전체 조직 권한·branch rules·secret scopes와 모든 workflow 공급망은 미검증이다.

공식 advisory 대조(외부 스캐너 결과를 취약점으로 복사하지 않음):

- lockfile Next15.5.15. https://github.com/vercel/next.js/security/advisories/GHSA-q4gf-8mx6-v5v3 의 수정 버전15.5.15에 해당. production static export도 확인. **해당 advisory만**의 판단이며 전체 Next 취약점 부재 선언이 아니다.
- DOMPurify3.4.11. https://github.com/cure53/DOMPurify/security/advisories/GHSA-c2j3-45gr-mqc4 는3.4.12 수정, 특정 CUSTOM_ELEMENT_HANDLING+afterSanitizeElements hook 조합이 필요. 현재 앱에서 해당 hook/직접 DOMPurify 사용을 찾지 못해 도달 가능한 XSS로 확정하지 않았다. transitive jsPDF/browser bundle 경로 추가 확인 및 허용된 의존성 갱신 절차 필요. 수정 금지 package-lock은 변경하지 않았다.
- mongoose9.3.0/mongodb7.1.0/react18.3.1/esbuild0.25.4/wrangler4.85.0을 lockfile에서 확인. 모든 버전의 모든 advisory를 완주한 것은 아니다. `npm audit fix --force`나 ignore 확대 없음.

## 4. 초기 격리 조사 검증 기록 (main 전달 전)

검증은 `scripts/run-mock-tests.mjs`/check:fast의 network guard, 합성 fixture를 사용했다. 별도 운영 환경 파일을 로드하지 않았다.

| 명령/증거 | 실제 결과 |
|---|---|
| 새 request-boundaries 수정 전 | 15개 중11실패·4통과, 후보 재현 |
| OAuth missing/wrong browser cookie 수정 전 | 15개 중2실패·13통과; 잘못된 브라우저도200 |
| targeted request boundaries + AI buckets | 73개 통과(17+56) |
| auth.phone-consent-reauth | 19개 통과 |
| 기존 JWT expiry/required secret/AI 경계 포함5suite | 113개 통과(후속 OAuth start4개 추가 전 실행) |
| 결제 context·webhook·replay·palm·request boundaries | 5suite165개 통과 |
| security.payment-body | 4개 통과, actual Worker/payment entrypoint |
| npm run test:node | 3374개 통과, 실패/skip0 |
| npm run typecheck | exit0 |
| verify:worker-security-guards / verify:security-hardening | 통과, Worker530소스 검사 |
| verify:guard-wiring | 통과,340검증기(274연결/66선언제외),27/27 deploy gates |
| npm run check:fast -- --plan | critical, paid suite/full tests/worker build 등 승격 |
| 첫 check:fast | sitemap 원장 드리프트 중단. http 간접 의존3페이지가 원인으로 확인되어 generator 실행 |
| npm run sitemap:generate | 1027URL, 원장824개 중3개 갱신,821유지; 정본 생성기만 사용 |
| 이후 check:fast | paid suite의 전체 테스트 도중 exit -1 종료; 통과 아님. 앞선 별도 전체 Jest도 esbuild spawn UNKNOWN 실패가 있어 완료하지 못함 |
| 변경 파일 ESLint / verify:payment-freeze | 통과; freeze region4/file3/상한2 유지 |
| Gitleaks8.24.2 전체 Git 이력 | git malloc 실패로 미완료. 부분 보고서1건을 전체 스캔 결과로 취급하지 않음 |
| Gitleaks 기준 HEAD 단일커밋 / 수정별 staged diff | 각각 exit0; 전체 이력/현재 운영 비밀의 부재를 의미하지 않음 |
| `npm run test:jest -- --shard=N/4 --silent` (N=1,2,3,4 전부) | 총420suite6664개 통과. 각105suite:1864/1613/1414/1773개; 전체 범위를4분할했으며 테스트 제외 없음 |
| `node scripts/run-paid-gate-suite.mjs --skip 'npm test' --jobs 1` (mock network guard 포함) | 나머지89개 전부 통과,411.3초. 제외한 npm test는 위 전체 Jest4shard와 Node3374개로 별도 수행. 이 실행 단독을 전체 paid suite 통과로 부르지 않음 |
| npm run check:pre-push | exit0; home registry·public mirror·sitemap1027URL·llms.txt·SEO entity 통과 |
| check:fast 계획 중 별도 실행한 잔여13개 | 모두 exit0: env-parity, phone-encryption, signup-phone-required, pass-snapshot, staging-llm-mock, analytics-events, no-nested-retry, worker-no-undef, mongo-reset-callers, cron-mongo-op-coverage, admin-route-error-context, build:worker(dry-run), entry-encoding(strict-core) |

새 회귀 파일은 기존 Jest `__tests__/worker/*.test.js` 수집 대상이다. `worker/**` 변경은 CI critical로 분류되고 `.github/workflows/pr-ci.yml:1062` 부근의 Test에서 `npm run test:jest`를 실행한다(Node 테스트는 required guards lane). paid suite도 `npm test`를 포함한다. 독립 검증기를 추가해 CI 밖에 방치하지 않았다. 라우트 목록 스크립트는 수동 증거 생성기이며 통과 판정·운영 상태 검증은 하지 않는다.

이력 부분 탐지: `06ee9a28ac44b36178a855bce4227fc13aaa9646:worker/lib/saju-section/runtime.generated.mjs:generic-api-key:8`. 생성 번들의 번역 지명 label 주변이어서 오탐 가능성이 있으나 스캔이 중단되어 확정하지 않았다. 실제 비밀값은 출력/보고/fixture에 넣지 않았다. ignore를 추가하지 않았으며 키 유출·폐기를 확정하지 않는다. 충분한 메모리가 있는 격리 환경에서 전체 이력을 재스캔하고 해당 fingerprint의 AST 원천 값 종류를 값 노출 없이 확인해야 한다.

전체 검증에서 관측한 환경 제약: 16GiB 호스트의 가용 물리 메모리가 약107MiB까지 내려갔고 git malloc 실패·esbuild spawn UNKNOWN이 발생했다. 다른 세션의 프로세스는 중단하지 않았다. 자체 중복 Jest만 종료했고 검사 범위/기대값/ignore를 줄이지 않은4개 shard 전체 재실행으로 검증을 완료했다. 종료 원인이 명시되지 않은 check:fast exit -1을 명령 자체 통과나 확정된 코드 결함으로 해석하지 않는다. 이후 계획의 개별 검사는 통과했지만 공식 GitHub CI 완료와 구분한다.

로컬 코드 커밋:

- `93d8b7bbbe74bb13b7e1b00caa3389c10f080455` 공통 body/counter/log 경계 및 회귀·원장
- `39c3bc4ab8e555a4a4cbb7e8f502736d5505465f` 실제 payment/coin-gate/palm 진입점 및 회귀
- `aee5d23dee1b71b965338dafbd243eda4d15321b` OAuth 브라우저 결합 및 회귀

다음은 초기 조사 시점의 전달 차단 기록이다. 이후 복구·통합 결과는 이 문서 처음과 인수인계 문서의 최신 기록을 우선한다.

최종 원격 확인(2026-10-18 KST, 반복 polling 없음):

- main `2d55a5bd8e7d73487c7ff58f7f2a2a6c07e8fca3`
- [AI Locale Gate](https://github.com/rei1237/codedestiny/actions/runs/39053081824): **failure**, LLM call inventory mismatch.
- [PR CI](https://github.com/rei1237/codedestiny/actions/runs/39053081775): **in_progress**. Risk tier/Typecheck and lint/Build Pages and Worker success, Static guards in_progress, Critical checks **skipped**. CI required 성공 확인 없음.
- [Secret Scan](https://github.com/rei1237/codedestiny/actions/runs/39053081881): success. 이 사실을 로컬 전체 이력 완료/운영 키 폐기 증거로 확대하지 않는다.
- 공유 main HEAD와 다른 변경86개는 시작 때와 동일. 원격의 후속3커밋을 작업 트리에 합치지 않았다. `git merge-tree --write-tree HEAD origin/main`은 충돌 없이 계산됐으나 실제 merge/push/통합 검증의 대체물이 아니다.
- 이 초기 기록 시점에는 로컬 보안 커밋이 미push였다. 이후 main 전달과 정확한 SHA의 GitHub CI 증거는 6절에 기록했다. 관측한 원격 배포 workflow는 다른 세션의 작업이며 이 보안 수정의 운영 적용이 아니다.

## 5. 운영 승인 대상 실행안

현재 운영 행위는 실행하지 않았다. 아래 순서의 별도 승인이 필요하다.

1. **배포**: main CI가 정상인 통합 SHA 확보 → 검토된 SHA를 공식 production workflow로 승격 → Pages/Worker 동일 SHA와 정상 로그인/정상 결과 읽기의 읽기 전용 확인. OAuth 구 state 재시작 안내, 503 rate limiter 실패율 관측. 실패 시 해당 수정 커밋을 개별 revert하고 새 CI·배포로 복구. DB migration 없음.
2. **키 유출 의심이 확인될 경우**: 파일·종류·fingerprint만 사건 기록 → 공급자 소유자와 새 키 발급 → 환경 secret 교체 → 합성 최소 동작 확인 → 구 키 폐기 → 사용 이력 확인. 키 삭제 커밋은 폐기를 대체하지 않는다. 롤백은 안전한 새 키 재발급이며 노출된 구 키 재활성화 금지.
3. **DB index/TTL**: 결제 event/claim/idempotency unique 및 보존용 TTL의 현재 정의를 읽기 전용으로 비교 → 중복 데이터·구매보존 영향 분석 → 별도 승인 후 적용. mock 통과만으로 운영 index가 있다고 선언하지 않는다. 중복 정리/TTL은 이 작업에서 실행하지 않았다.
4. **인프라**: 실제 CSP/CORS/CDN private response policy·프록시 신뢰 경계·관리자/Worker 직접 endpoint 공개 범위 읽기 전용 확인 → report-only CSP 검증안과 구체적 allowlist를 준비 → 승인 후 변경. 기존 정상 결제/OAuth 외부 스크립트가 깨지는 강제 CSP를 즉석 배포하지 않는다.

보안 통합 트리에서 Jest9suite254테스트, worker-security-guards, security-hardening530소스, payment-freeze, guard-wiring341검사 배선·27개 배포 게이트를 확인했다. 사이트맵은 최신 main 원장을 기준으로 생성했으며1022URL을 유지했다. 원격 전달 SHA의 CI 확인은 별도 완료 기준이다. 공유 checkout의 다른 변경86개는 그대로 보존하며, 로컬·CI 결과를 운영 안전성으로 확대하지 않는다.

## 6. main 복구·보안 통합 전달 결과

사용자가 main CI 직접 복구를 요청한 뒤, 보안 변경은 복구 CI 성공 후에만 통합했다. 시작 HEAD774038cdf16995d4917dc7920064d7cb9ebc8633을 확인했고 공유 checkout의 파일·index·stash·로컬 main 포인터를 변경하지 않았다.

| 복구 커밋 | 실제 수정과 확인 |
|---|---|
| f0b3e7c5d | 사주 경로·베다 수정일 기대값, 링크만 바뀐 원고의 검토 해시, 제거된 AI 호출 목록을 실제 소스에 맞춤. 홈페이지 메타 폭150/160. 원고의 인간 검토·광고 허용 상태 유지. |
| 2f1406d77 | ggulggul 설명144/160. sync:public·sitemap 생성기로 미러·원장 갱신. |
| 9c139bc3c | 읽기집 검사에서 이미지 디코딩과 같은 투명 배경 조건이 준비될 때까지 제한 시간 안에서 기다림. 기존/수정 검사 비교와 지연/고정 불투명 mock으로 판정 강도 유지 확인. |
| c08a62dbe | 작명 설명148/160. 무료 초안과 별도 유료 상세 작명서 구분 유지. |
| 37ea6b16b | 모바일 목록의 점성술·베다점 진입을 현재 canonical로 갱신. 옛 Worker301 정보 보존. |
| 1fb2c4ae1 | public/famous/index.html의 정책 링크2개를 canonical로 수정. 실제 빌드 링크 검사 함수로 전2실패·후0 확인. |
| e53c065cf | app/guides/page.js에서 휴먼 디자인 가이드 연결. 서버 렌더링과 사이트맵으로 ggulggul→guides→human-design/guide 2홉 확인. |

복구 SHA **e53c065cf5463b65fbbedc969edc2da6a8c97ca3**의 [PR CI39095183552](https://github.com/rei1237/codedestiny/actions/runs/39095183552)와 AI Locale·Secret Scan 성공을 확인한 뒤, 보안 브랜치에 원격 main을 merge했다. 유일한 충돌은 생성 원장 config/sitemap-lastmod.json이었다. 최신 main 원장을 채택하고 생성기로1022URL·원장3개를 갱신했다. 정책·원장을 수동 합성하지 않았다.

보안 통합 **15765bd83c85ae012a86d41f168d844f8ce30cbb**의 로컬 targeted9suite254테스트·보안/동결/배선·check:pre-push가 통과했고 정상 fast-forward push했다. 원격 Critical checks는420suite6664테스트, 빌드·타입/lint·Paid Flow·Gift integrity가 통과했다. 정적 검사는 로컬 요청에 운영 callback을 섞은 OAuth fixture가 첫 응답에서 state를 찾다가 실패했다. 이 실패를 성공으로 바꾸거나 숨기지 않았다.

다른 세션이 이 보안 SHA를 포함한96d5372bd7e6dd68f172db19868dbc33256781ec와 문서fd4143e15fbe330bd8bd054f1fc5683827a4302f를 전달했다. 보안 소스·회귀 파일은 변경 없이 유지된 것을 비교했고, 후속 main의 Critical checks420suite6671테스트·빌드·타입/lint와 Paid Flow 재실행도 success였다. 경합 push는 non-fast-forward로 거절됐고, 후속 문서를 merge하여 보존했다. force-push는 사용하지 않았다.

**d91d6a2d8**은 scripts/verify-auth-public-origin.mjs만 보완했다. 로컬 callback의 기존 localhost frontend 계약, 운영 callback/별칭 호스트의 정확한 시작 URL 이동, 잘못된 호스트에서 쿠키 미발급, host-only HttpOnly 쿠키와 state 해시 일치를 검사한다. 공급자 네트워크 호출 없이 handler를 직접 실행한다. 기존 local refresh 검사의 loopback Mongo 연결 거절 로그는 있었지만 검사는 exit0이며 운영 DB에는 연결하지 않았다. ESLint·인증2suite29테스트·check:pre-push도 통과했다. 인증 런타임 코드를 덧대지 않았다.

OAuth 검증 보완 전달 SHA **e32dae2fa5b3f8aad7412a526d6d6e348879cad8**:

- [PR CI39097257553](https://github.com/rei1237/codedestiny/actions/runs/39097257553): CI required·Static guards·Typecheck/lint·Build Pages and Worker success. Critical checks는 경로 분류상 skipped이며 동일 런타임인 직전96d의 성공과 구분한다.
- [AI Locale39097257417](https://github.com/rei1237/codedestiny/actions/runs/39097257417), [Secret Scan39097257476](https://github.com/rei1237/codedestiny/actions/runs/39097257476): success. 후자는 fetch-depth0의 Git 이력 자동 검사이며, 과거 로컬 스캔의 메모리 실패와 별개다. 운영 키 폐기나 수동 유출 조사를 완료했다는 뜻은 아니다.
- [Paid Flow39097257429](https://github.com/rei1237/codedestiny/actions/runs/39097257429): 20분 timeout으로 cancelled. 남은 프로세스는 test:node와 두 브라우저 fixture였고, Paid 잡에는 Chromium 설치가 없었다.

변경 범위는 worker/index.js, worker/lib/{http,request-body,security/index}.js, worker/payments/{index,errors,gift-routes}.js, worker/routes/{auth,palm}.js, 관련 회귀3파일, 정적 라우트 조사 스크립트·증거 문서와 생성 sitemap이다. CI 복구는 위 표의 메타·목록·검증 fixture에 한정했다. 원격의 별도 기능 변경과 공유 main의 기존86변경은 보존했다. 이 전달에 운영 승격·실 LLM/결제·운영 DB 쓰기·키 회전은 포함되지 않는다.

후속 CI 복구 **3a1b3f9e4007d5749c24f95abc4868ca64af8c9a**는 Paid Flow의 non-critical 경로에 Chromium 설치를 추가하고 두 브라우저 fixture가 launch 실패에도 서버를 닫도록 했다. 20분 제한·검사 목록·단언은 유지했다. 정상 브라우저2검사는11.4초에 통과했고, Chromium 부재를 강제하면 두 검사 모두 오류 exit1로1.1초 안에 종료했다. YAML 구조·guard-wiring·check:pre-push 통과. Paid Flow39098889158은89가드/92.8초 success, AI Locale39098889047·Secret Scan39098889088 success. PR CI39098889228의 Critical checks420suite6671테스트·Build Pages and Worker·Typecheck/lint success, Static guards·CI required도 success.

대기 중 다른 세션이 추가한 홈 스타일 f0cd52449a4189b1b9878f0c096742e71cf6a337도 ff-only로 보존했다. 보안/인증/CI 복구 파일과 겹치지 않았으며 공유 main checkout은 그대로 두었다. 후속 PR CI39099289896은 홈5경로의 sitemap 원장 signature 드리프트로 실패했다. e411415364b5e3485617fcfd9ca9e453433307c2에서 생성기로 원장 한 파일만 갱신했다. 1022URL·날짜와 홈 스타일을 유지했고 sitemap:check·check:pre-push 통과 후 복구만 push했다. [Paid Flow39099289792](https://github.com/rei1237/codedestiny/actions/runs/39099289792)는 Chromium 설치 단계와 npm test를 포함해90개 항목을772.9초에 모두 통과했다. [복구 SHA PR CI39100150363](https://github.com/rei1237/codedestiny/actions/runs/39100150363)는 Static guards·Typecheck/lint·CI required success. Build·Critical은 원장만 변경한 경로 분류상 skipped이며3a1b3f9e4의 전체 실행 성공과 구분한다. Secret Scan39100150310도 success. 이 결과를 확인한 뒤 완료 문서만 전달한다.
