---
status: active
updated: 2026-10-13
next: "판정·전체 이력 Secret Scan·check:fast 완료 → check:pre-push → push origin main → main CI 1회 확인. 운영 승격은 별도 승인 전 실행하지 않는다."
---

# 결제·로그인 보안 후속 — Codex 인수인계 (2026-10-13)

다음 세션 첫 문장: "docs/handoff/security-followups-codex-2026-10-13.md 를 읽고 'A. 사람만 할 수 있는 일'의 완료 증거부터 확인해."

이 문서는 `inicis-security-advisory-2026-09.md`(판정·런북·문의 문안)와 `followups-and-key-rotation-2026-10-13.md`(Gift·Shadow·조사·키 교체 명령)를 **대체하지 않고** 그 위에 얹는다. 중복되는 명령은 그쪽을 따른다.

## 지금 상태

### Codex 재개 실측 (2026-10-13)

- 사용자 결정: F-1은 선택한 연이/영냥이 풀이를 따르고, F-2는 구버전 동의를 유예한다. 외부 키 처리를 대행하도록 승인했으며, 메일은 "유효한것만 남겨"로 지시했다. 발송 승인·수신 주소는 없으므로 테스트 메일은 보내지 않았다.
- `a4d784c0c`: CRM v1에 2026-10-20 23:59:59 KST까지 유예를 적용하고, 당시 문구·버전을 기록한다. 만료 시점과 미등록 버전은 거절한다. 영향받은 사이트맵 서명은 생성기로 갱신했다.
- `d54ce9591`: 사주 AI의 저장된 두 화자 요약·복사·공유를 `cdSajuPersonaV1` 선택에 연결했다. 실제 선택 버튼과 다른 탭 storage 변경을 검증했고 추가 결제·생성 POST는 0건이다. 공통 본문과 서버 LLM 프롬프트는 유지한다.
- 메일 제공자 실측: `RESEND_API_KEY`는 API 조회 200, 이력 탐지 0건이다. 옛 `EMAILAPI_KEY`는 `400 validation_error / API key is invalid`이며 이력 탐지 2건과 정확히 일치한다. 현재 유효한 키를 스테이징·운영 `RESEND_API_KEY`에 적용했고, 운영 `EMAILAPI_KEY` 삭제 및 `.env.local`의 무효 키 1줄 제거를 완료했다. 스테이징에는 옛 이름이 원래 없었다. 운영 메일 시크릿 목록은 `RESEND_API_KEY` 하나만 남았다.
- 적용 후 운영 health는 `keyHealth.ok=true`, broken=[]이다. 스테이징은 기존과 같은 broken=[payments-core]다. 실발송은 미검증이다. 메일 정본 계약도 `RESEND_API_KEY`로 맞췄고 `verify:env-parity --remote`는 PASS(경고 10건), Pages 조회는 프로젝트 이름 미설정으로 생략됐다. 다른 키 별칭은 제거하지 않았다.
- Google 현재 로그인 계정의 프로젝트 13개를 확인했다. 현행 CrUX 키와 Google 키 목록에서 이력 YouTube 키를 찾지 못했다. 소유 프로젝트·다른 계정 여부가 확인되지 않아 삭제·폐기 완료로 처리하지 않는다. 현행 정상 키는 삭제하지 않았다.
- Google `Gemini` 프로젝트 키 표시 응답 중 새 형식 키가 자동 가림에서 빠져 도구 응답에 1회 노출됐다. 파일·커밋에 저장하지 않았으며 이후 키 필드 전체를 가렸다. 해당 현행 키의 순환도 후속으로 남는다. 이력의 Google 키와 동일하다고 판정한 것은 아니다.
- PortOne: 현행 V1 시크릿과 이력의 80자 시크릿은 해시 대조에서 불일치다. V2 발급 목록에는 이력보다 뒤인 8월·9월 발급 2개만 있다. 결제 채널·웹훅·현재 PortOne 키는 변경하지 않았다.
- 로컬 gitleaks v8.24.2 실측은 43건·40지문이었다. 인수인계의 31건 외에 C-6의 새 규칙이 12건을 추가로 탐지했다. `ff669d372`에는 제공자에서 무효/교체를 확인한 메일·PortOne 4지문과 명시적 MongoDB 자리표시자 6지문만 추가했다. 동일 스캔의 남은 미기준선은 33건·30지문이다. 이 숫자는 기준선 반영 후 기존 보고서 재집계이며, exit 0 재스캔·원격 Secret Scan 초록은 아직 없다. 새 규칙의 미확정 MongoDB 3건과 PortOne 테스트 문자열 3건도 남겨 두었다.
- 33건 재판정: PortOne 모의 회귀 테스트 fixture 3건, 관리자 ping의 가림 예시 1건은 실제 자격증명이 아닌 오탐으로 확인했다. 제거된 관리자 입장 SHA-256 상수 2건은 현행 PBKDF2 환경변수 경로와 분리된 비활성 값으로 확인했다. 재스캔에서 기존 `PERSONA_KEY`와 같은 localStorage 키를 쓰는 UI 테스트 오탐 1건을 추가 발견해 함께 기준선에 넣었다. 값은 출력하지 않았다.
- 최종 27건 재판정 완료: Google 형식 19건·19지문(서로 다른 13개 키)은 콘텐츠 생성 없이 메타데이터 GET만 호출해 모두 `API_KEY_INVALID`를 확인했다. 3월 빌드 생성물의 JWT/관리자 계열 6건·3지문은 운영에서 현행 JWT 양성 대조만 200, 과거 값과 임의 대조는 401이었고 `ADMIN_SECRET_HASH` 이름도 운영 Worker에 없음을 확인했다. 실제 계정 데이터나 쓰기 요청은 사용하지 않았다.
- MongoDB 이력 2건·2지문은 2026-03-13·16 노출 뒤 동일 Atlas DB 사용자가 03-29, 04-01, 04-03, 05-01, 09-06에 갱신됐다. 다섯 Activity Feed 이벤트 모두 공개 payload가 사용자 이름과 보호된 변경 객체만 포함하고 역할·스코프 변경 필드는 없었으며, 현행 로컬 URI도 두 과거 값과 불일치한다. 운영 DB 접속이나 비밀번호 변경 없이 회전된 역사 자격 증명으로 판정했다.
- 위 근거를 `.gitleaksignore`에 지문 단위로 반영한 뒤 gitleaks v8.24.2 전체 이력 스캔을 `--redact`로 다시 실행해 **exit 0·탐지 0건**을 확인했다. 가림 보고서는 저장소 밖 `%TEMP%\\codex-security-20261013\\redacted-final.json`에 있다. 원격 Secret Scan·push·운영 승격은 아직 아니다.
- `143954347`: Google·JWT/관리자·MongoDB 역사 지문의 최종 판정과 인수인계를 커밋했다. gitleaks 설정 4/4, 인수인계 계약 201개, 문서 신선도와 `check:fast --committed-head`가 통과했다(유료 게이트 88/88, Node 3,201/3,201, Jest 395 suites/6,033 tests, lint·typecheck·Worker dry-run 포함). 실결제·실 LLM·운영 DB 접속/쓰기·배포는 0건이다.
- `393d54f29`: 위 판정 지문과 인수인계를 커밋했다. gitleaks 설정 회귀 4/4, 인수인계 계약 201개, 문서 신선도, 커밋 기준 `check:fast`가 통과했다(유료 게이트 88/88, Jest 395 suites/6,033 tests, lint·typecheck·Node·Worker dry-run 포함). 실결제·실 LLM·운영 DB 쓰기·배포는 0건이다. 원격 main은 여전히 `b4ee8a845`이고 최신 Secret Scan run 38339017478은 실패라 `check:pre-push`·push를 진행하지 않았다.
- `180ebc2b3`: 메일 환경 계약의 필수 이름을 `RESEND_API_KEY`로 변경했다. 폐기된 별칭을 복구하지 않고 정본 소비자(`worker/lib/resend.js`)를 명시했다. 서버의 기존 호환 별칭 읽기는 유지한다.
- 관련 검사: Jest 14/14, Node 관련 검사 34/34, 사이트맵 6/6, gitleaks 설정 4/4 통과. 첫 `check:fast`는 88개 중 87개 통과하고 서명 원장 미갱신 때문에 사이트맵 테스트 1건이 실패했다. 원장 재생성 후 변경 범위를 `--base=cdfc99e54`로 고정해 재실행한 최종 `check:fast`는 exit 0이다(결제 게이트 88/88, Node 3,201/3,201, Jest 395 suites/6,033 tests). `check:pre-push`는 홈 레지스트리·공개 미러·사이트맵 모두 통과했다. 실제 화면 캡처·실결제·실 LLM·메일 발송은 하지 않았다.
- A-5 읽기 실측: Atlas Codedestiny 프로젝트 Network Access에 `0.0.0.0/0`이 Active다. DB 사용자는 2개이며 기존 서버 MongoDB 이력 2건의 호스트·사용자 이름이 현재 로컬 설정 및 Atlas 사용자와 일치한다. 비밀번호는 현행 로컬 값과 다르지만 운영 값을 확인한 것이 아니므로 폐기 판정하지 않았다. DB 사용자·비밀번호·네트워크·운영 데이터는 변경하지 않았다. 시드 계정·관리자 감사 로그·유니크 인덱스는 미확인이다.
- 원격 main은 여전히 `b4ee8a845`다. PR CI는 성공, Secret Scan run 38339017478은 실패다. 기존 실패 위에 push하지 않았으며 코드 운영 승격도 하지 않았다. 다른 세션의 `.claude/skills/fire-your-seo-agency/`는 보존했다. 새 브랜치·워크트리·PR은 만들지 않았다.
- 임시 도구·가림 보고서 폴더 `C:\Users\user\AppData\Local\Temp\codex-security-20261013`의 정리는 자동 승인 검토가 재귀 삭제와 개별 파일 삭제 모두 차단했다(상세 사유 미제공). 우회 삭제하지 않았다. 보고서의 Secret·Match는 REDACTED이고 값 원문을 파일에 저장하지 않았으며, 이 폴더만 후속 수동 정리가 필요하다.

아래 "지금 상태" 목록은 이전 세션 기록이다. 위 재개 실측이 키 처리·F 결정·검증의 최신 상태다.

- origin/main `b4ee8a845`. 로컬 보안·홈 코드는 `cd9cf63df`까지 커밋돼 있고 이 인수인계 갱신 커밋이 그 위에 있다. 이전 보안 변경(시크릿 fail-closed·JWT exp·확정 주체·gitleaks 기본 규칙)은 `a4ecd5cc6` 으로 이미 운영 반영됐다. 운영 `/api/health`: `keyHealth.ok true`.
- 보안 후속은 `edce37d61 fix(payments): harden security follow-ups` 로 커밋했다:
  - `worker/routes/payments.js` — 웹훅 원장 쓰기 삼킴 4곳을 `logSwallowedPaymentError` 로(줄 수 3800 그대로)
  - `worker/payments/orders.js` — `normalizeOrderReturnPath` 추가, 주문 스냅샷 `returnPath` 정규화
  - `__tests__/worker/payments.webhook-ledger.test.js` — 원장 쓰기 거절 케이스 1개 추가
  - `__tests__/worker/payments-v2.order-return-path.test.js` — 신규
  - `.gitleaksignore` — 오탐 3건(`PERSONA_KEY`) 추가
  - `scripts/sync-cloudflare-worker-secrets.mjs` — 미사용 YouTube 키 이름 2개 제거
  - `docs/handoff/inicis-security-advisory-2026-09.md` — 이니시스 회신·현행 값 대조 결과·YouTube 정리 기록
- 미추적 `.claude/skills/fire-your-seo-agency/` 는 **다른 사람 것**이다. 스테이징·커밋 금지.
- 이 세션에서 한 일(코드 밖): 스테이징 Worker 시크릿 `YOUTUBE_API_KEY` 삭제, 로컬 `.env.local` 의 같은 줄 삭제.
- 홈 바로가기는 `9fb545e73 feat(home): surface fortune systems above fold` 로 별도 커밋했다. 사주·자미두수·숙요점·베다점·점성술·타로의 기존 직접 진입 계약은 그대로 두고 접힌 카탈로그 밖으로 이동했다.
- 홈·초기 보안 커밋 뒤 `npm run check:pre-push`, `npm run verify:release`가 통과했다. C 후속까지 반영한 마지막 `npm run check:fast`도 통과했다(결제 게이트 88/88, Node 3,200건, Jest 395 suites/6,030 tests). 홈 브라우저 검증은 320~1440px 오버플로 없음, 여섯 직접 진입 성공이다.
- origin/main의 `PR CI`는 초록이지만 `Secret Scan` run `38339017478`은 아래 A가 끝나지 않아 붉다. 저장소 규칙상 이 red 위에 push하지 않았고 운영 승격도 실행하지 않았다.
- `Yeongnyangi Browser Shadow` run `38339025962` attempt 1·2는 서로 다른 WebKit 시나리오의 페이지 전환 중 일반 `[object Event]` 1건만 실패했다. 둘 다 결제·활성화·5챕터 결과는 성공했다. `424020bad`에서 이 이벤트를 WebKit + 알려진 전환 페이지 + 결제·활성화·전체 챕터 완료 조건에만 무시하도록 좁혔고, 실패했던 두 시나리오를 로컬에서 재실행해 통과했다(실 PG·LLM·운영 DB 쓰기 0). main 전달 전이므로 CI 재실행은 아직 없다.

## 결정 사항(바꾸지 않는다)

- **결제 채널 키는 교체하지 않는다**(`MID`·`INIsignkey`·`INIAPIKEY`·`INIAPI_IV`·`PORTONE_*` 채널·웹훅). 이력 노출 근거 0건, 이니시스 회신(2026-10-13)도 교체 요구가 아니다. 교체는 결제 중단 위험뿐이다.
- 이니시스·PortOne 코드에 `centerCd`·`P_CHKFAKE`·IDC 값을 넣지 않는다(PortOne V2 이니시스 옵션에 없음 — 문의는 사람 몫).
- 레거시 단건 경로(`/api/payments/single/*`, 410)의 `.catch(() => {})` 4곳(`routes/payments.js` 약 1346·1425·1470·1642행)은 죽은 코드라 손대지 않았다. 지우려면 아래 C-1.

## 0. 커밋 — 완료

`edce37d61`로 완료했다. `routes/payments.js` 는 동결 파일(상한 3801줄, 현재 3800)이므로 후속에서 줄을 늘리지 않는다. 동결 구간을 건드리면 `node scripts/verify-payment-freeze.mjs --update` 를 **같은 커밋**에 넣는다.

Secret Scan이 초록이 된 뒤 전달 순서:

```bash
cd /d/Development/code-destiny
git status --short
git log --oneline origin/main..HEAD
npm run check:pre-push
git push origin main
# main CI 결과는 한 번만 확인한 뒤, 성공하면 사용자가 승인한 1회 운영 승격을 실행한다.
gh workflow run "Release Cloudflare Pages and Worker" --ref main -f mode=production
```

## A. 👤 사람만 할 수 있는 일 (Codex 는 안내만, 값은 받지 않는다)

| # | 일 | 근거·상태 |
|---|---|---|
| A-1 | Google Cloud 콘솔에서 **YouTube 용 Google API 키 삭제** | 미사용(호출 코드 없음). 현행 값과 일치(이력 노출 4탐지). 삭제=폐기라 재발급 불필요 |
| A-2 | **메일 API 키(`EMAILAPI_KEY`) 교체** | 현행 값과 일치(2탐지). 운영 Worker 에 `EMAILAPI_KEY`·`RESEND_API_KEY` 둘 다 있다(2026-10-13 이름 확인). 코드(`worker/lib/resend.js:45`, `worker/lib/env.js` 별칭)는 `RESEND_API_KEY` 를 먼저, 없으면 `emailapi`/`EMAILAPI_KEY` 를 읽는다 → **새 키를 `RESEND_API_KEY` 에 넣고 `EMAILAPI_KEY` 는 삭제**(두 이름이 다른 값이면 어느 쪽이 쓰였는지 헷갈린다). 스테이징 먼저 → 발송 확인 → 운영 |
| A-3 | **완료 — 불일치 25건 판정** | Google 13종은 제공자 `API_KEY_INVALID`, PortOne 이력 값은 현행·발급 목록과 불일치, 3월 JWT는 운영 음성/양성 대조로 비활성, `ADMIN_SECRET_HASH`는 운영 미등록, 제거된 관리자 입장 SHA-256은 현행 PBKDF2 경로와 분리됨을 확인했다. 값은 기록하지 않았다. |
| A-4 | 포트원 고객센터 웹 문의 발송 | 문안: advisory 문서 '포트원 문의 문안'. 이니시스 기술문의 ts@kggroup.co.kr |
| A-5 | Atlas Network Access 가 `0.0.0.0/0` 이 아닌지, 시드·테스트 계정 비밀번호, 관리자 감사 로그(2026-04-07 이후) 확인 | 값 인용 금지, "변경 필요/불필요"만 보고 |
| A-6 | 유니크 인덱스 3종 읽기 전용 확인 | `docs/content-entitlements-unique-indexes-2026-10.md` 절차. **생성은 별도 승인 후** |
| A-7 | 이니시스 시크릿 4종(`MID`·`INIsignkey`·`INIAPIKEY`·`INIAPI_IV`) 보유 정책 결정(W10) | 제거하려면 `config/env.contract.json` `required_in`·`worker/lib/key-health.js` `payments-core` 그룹·고정 테스트를 함께 바꿔야 한다 |
| A-8 | `/api/payments/single/start\|complete`(410)를 부르는 외부 클라이언트가 없는지 | Worker 로그 |

## B. A 의 결과를 받은 뒤 Codex 가 하는 일 — `.gitleaksignore` 반영

**교체·삭제가 완료된 증거가 있는 항목만** 넣는다. 사용자 대행 승인 이후 제공자의 무효 판정·현행 키 대조도 증거로 삼되, 추측으로 제외하지 않는다. 2026-10-13 최종 재스캔은 미기준선 0건·0지문, exit 0이다. 원격 Secret Scan은 아직 재실행 전이다.

1. gitleaks v8.24.2 준비·재스캔 명령은 `followups-and-key-rotation-2026-10-13.md` A-1 을 따른다. **보고서는 `--redact` 로 만들고 저장소 밖(`$TMP`)에만 둔다.**
2. YouTube 키 지문 뽑기(A-1 완료 후). `gcp-api-key` 규칙은 `Match` 자체가 키라 **비-redact 출력을 화면에 찍으면 키가 노출된다.** 파이프로 메모리에서만 처리하고 지문만 출력한다:
   ```bash
   "$TMP/gl/gitleaks.exe" git --no-banner --log-level error -f json -r - . 2>/dev/null | node -e "
   let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{
   const fs=require('fs');
   const ig=new Set(fs.readFileSync('.gitleaksignore','utf8').split(/\r?\n/).map(l=>l.trim()).filter(l=>l&&!l.startsWith('#')));
   const all=JSON.parse(s).filter(f=>!ig.has(f.Fingerprint));
   const anchor=all.find(f=>f.RuleID==='gcp-api-key'&&f.File==='app/api/youtube/search/route.js');
   if(!anchor){console.log('anchor 없음 — 이미 반영됐거나 이력이 바뀜');return}
   const fps=all.filter(f=>f.RuleID==='gcp-api-key'&&f.Secret===anchor.Secret).map(f=>f.Fingerprint);
   console.log(fps.length+'개 지문(기대 4)');
   fs.appendFileSync('.gitleaksignore','# YYYY-MM-DD 폐기: YOUTUBE_API_KEY (콘솔에서 삭제 확인)\n'+fps.join('\n')+'\n');
   })"
   ```
   `YYYY-MM-DD` 는 실제 날짜로 바꾼다. 4개가 아니면 멈추고 보고한다.
3. 메일 API 키 지문(A-2 완료 후): 규칙 `generic-api-key`, `Match` 식별자가 `EMAILAPI`·`emailapi` 이고 길이 36 인 2건. 같은 방식으로 지문만 뽑아 `# YYYY-MM-DD 교체: EMAILAPI_KEY` 로 추가.
4. A-3 에서 사용자가 "더 이상 유효하지 않음"이라고 확인한 항목도 같은 방식(규칙·파일·식별자로 좁혀서, 사유 주석에 확인 일시와 이름만).
5. 검증: `gitleaks git --redact --no-banner .` exit 0 이면 `node --test __tests__/release/gitleaks-config.test.js` → 커밋. 푸시는 사용자 요청 시.

## C. 코드 후속 (Codex 가 해도 되는 것 — 각각 별도 커밋, 승인 범위 확인)

| # | 일 | 메모 |
|---|---|---|
| C-1 | **삭제 안 함 — 의존성 확인 완료** | `worker/lib/payment-reconcile-task.js` → `settleSinglePaymentForReconcile` → 내부 `/api/payments/single/complete` 요청으로 본문을 실제 재사용한다. 죽은 코드가 아니므로 삭제하면 재조정 정산이 깨진다 |
| C-2 | **운영 데이터 대기** | 기존 토큰 호환 위험 — exp 없는 토큰이 실제로 쓰이는지 데이터 확인 후. 액세스·리프레시는 이미 적용됨(`worker/lib/auth.js`) |
| C-3 | **완료 `b46531856`** | PortOne redirect를 사이트 내부 절대경로로 제한하고 외부·protocol-relative·역슬래시·제어문자 입력은 루트로 폴백 |
| C-4 | **완료 `cd9cf63df`** | 공개 `GET /api/payments/config`에서 `inicis*Configured`·`serverVerificationConfigured`·`missing` 상세 제거. 결제창 필수 공개 키는 유지 |
| C-5 | **운영 데이터 대기** | B1 엄격 모드는 storeId/channel 부재 비율 확인이 선결. 현재 present-only 는 고정 테스트의 의도 |
| C-6 | **완료 `d73f327c4`** | `.gitleaks.toml`에 MongoDB URI 자격증명·PortOne API 시크릿 규칙과 회귀 테스트 추가 |
| C-7 | **적용 대상 아님** | 2026-09-12 이후 PR을 쓰지 않는 main-only 전달 정책이다. 현재 Secret Scan은 `push: main`과 수동 dispatch에서 실행됨 |
| C-8 | **키 교체와 함께 처리** | `verify:env-parity` 경고 7건. 로컬·스테이징·운영의 실제 이름을 한 번에 정리해야 하므로 A 결과 없이 코드 별칭만 제거하지 않는다 |

CI 에서 이미 붉은 것은 이 문서의 범위가 아니다: Gift·Shadow·조사·영냥이 문구는 `followups-and-key-rotation-2026-10-13.md` B~E. 공개 미러(`.ignore` 1개): `npm run sync:public` 을 돌려 결과를 같은 커밋에. LLM 호출 인벤토리: 호출 라우트를 검토한 뒤 `node scripts/audit-ai-locale-calls.mjs --write`(마지막 변경 커밋 `d8a868f09`).

## 함정 (이 세션에서 실제로 겪은 것)

- **값 출력 금지.** 지켜도 새는 길: `gcp-api-key` 규칙의 `Match`=키 자체, `.env*` 줄을 `cut`/`sed -n` 로 앞부분만 찍어도 키 앞 글자가 노출된다. 이름·길이·일치 여부만 출력한다. `gitleaks --redact`, 보고서는 저장소 밖.
- `git ls-files` 는 지웠지만 커밋 전인 추적 파일도 낸다 → 파일을 읽는 스크립트는 `if (!existsSync(p)) continue;` 관용구(`verify-krw-copy-canonical.mjs`, `audit-payment-p0-inventory.mjs`).
- Jest ESM: `NODE_OPTIONS=--experimental-vm-modules npx jest <파일> --runInBand --testEnvironment node`. `__tests__/release/*.test.js` 는 CommonJS `node:test` → `node --test <파일>`.
- gitleaks 지문은 `커밋:파일:규칙:줄`. 이력을 재작성하면 해시가 바뀌어 `.gitleaksignore` 가 전부 무효가 된다. 이력 재작성은 사용자 결정 사항.
- 운영 시크릿 이름은 읽기 전용으로 볼 수 있다: `npx wrangler secret list --config worker/wrangler.toml --format json`(스테이징은 `worker/wrangler.staging.toml`). **이름만** 출력한다. "로컬 env 와 같다/다르다"로 운영 값을 판단하지 않는다 — 운영 `ADMIN_ENTRY_PASSWORD_HASH`·`PORTONE_API_SECRET` 은 로컬 파일에 없다.
- Bash 히어독은 이 환경에서 역슬래시를 잃는다. 정규식이 든 줄은 Edit 도구로 고친다. 작업 트리가 `core.autocrlf=true` 라 `LF will be replaced by CRLF` 경고가 나지만 무해하다(blob 은 LF).
- 다른 사람의 미커밋 변경은 stash·checkout·reset·clean 금지. 파일 단위로만.
- 시크릿 교체 도구: `scripts/sync-cloudflare-worker-secrets.mjs`(`--dry-run`, `--only-key`, `--target=staging|production`). 운영 적용은 사용자 승인 뒤에만.

## 끝 기준

- main `Secret Scan` 초록(= A 완료 + B 반영), 운영 `keyHealth.ok true`, 결제 확정 경로 테스트(`test:worker:auth-payments`) 통과.
- 미실행으로 남은 것: 스테이징/운영 실결제·웹훅 E2E, `verify:env-parity --remote`, 유니크 인덱스 읽기 조회. 완료로 표시하지 말 것.
