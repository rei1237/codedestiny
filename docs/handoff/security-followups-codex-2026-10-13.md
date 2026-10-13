---
status: active
updated: 2026-10-13
next: "미커밋 변경 7파일 커밋 → 👤 사람이 Google 키 삭제·메일 API 키 교체·콘솔 판정 25건 → 결과를 받아 .gitleaksignore 반영 → 코드 후속(레거시 단건 경로 정리 등)"
---

# 결제·로그인 보안 후속 — Codex 인수인계 (2026-10-13)

다음 세션 첫 문장: "docs/handoff/security-followups-codex-2026-10-13.md 를 읽고 '0. 커밋'부터 해."

이 문서는 `inicis-security-advisory-2026-09.md`(판정·런북·문의 문안)와 `followups-and-key-rotation-2026-10-13.md`(Gift·Shadow·조사·키 교체 명령)를 **대체하지 않고** 그 위에 얹는다. 중복되는 명령은 그쪽을 따른다.

## 지금 상태

- main `d8a868f09` = origin/main. 이전 보안 변경(시크릿 fail-closed·JWT exp·확정 주체·gitleaks 기본 규칙)은 `a4ecd5cc6` 으로 이미 운영 반영됐다. 운영 `/api/health`: `keyHealth.ok true`.
- **이 세션의 미커밋 변경 7개**(작업 트리):
  - `worker/routes/payments.js` — 웹훅 원장 쓰기 삼킴 4곳을 `logSwallowedPaymentError` 로(줄 수 3800 그대로)
  - `worker/payments/orders.js` — `normalizeOrderReturnPath` 추가, 주문 스냅샷 `returnPath` 정규화
  - `__tests__/worker/payments.webhook-ledger.test.js` — 원장 쓰기 거절 케이스 1개 추가
  - `__tests__/worker/payments-v2.order-return-path.test.js` — 신규
  - `.gitleaksignore` — 오탐 3건(`PERSONA_KEY`) 추가
  - `scripts/sync-cloudflare-worker-secrets.mjs` — 미사용 YouTube 키 이름 2개 제거
  - `docs/handoff/inicis-security-advisory-2026-09.md` — 이니시스 회신·현행 값 대조 결과·YouTube 정리 기록
- 미추적 `.claude/skills/fire-your-seo-agency/` 는 **다른 사람 것**이다. 스테이징·커밋 금지.
- 이 세션에서 한 일(코드 밖): 스테이징 Worker 시크릿 `YOUTUBE_API_KEY` 삭제, 로컬 `.env.local` 의 같은 줄 삭제.

## 결정 사항(바꾸지 않는다)

- **결제 채널 키는 교체하지 않는다**(`MID`·`INIsignkey`·`INIAPIKEY`·`INIAPI_IV`·`PORTONE_*` 채널·웹훅). 이력 노출 근거 0건, 이니시스 회신(2026-10-13)도 교체 요구가 아니다. 교체는 결제 중단 위험뿐이다.
- 이니시스·PortOne 코드에 `centerCd`·`P_CHKFAKE`·IDC 값을 넣지 않는다(PortOne V2 이니시스 옵션에 없음 — 문의는 사람 몫).
- 레거시 단건 경로(`/api/payments/single/*`, 410)의 `.catch(() => {})` 4곳(`routes/payments.js` 약 1346·1425·1470·1642행)은 죽은 코드라 손대지 않았다. 지우려면 아래 C-1.

## 0. 커밋 (요청이 있을 때만 — 이 문서를 넘긴다는 것이 그 요청이다)

```bash
cd /d/Development/code-destiny
git status --short                       # 위 7개 + 타인의 .claude/skills/fire-your-seo-agency/ 만 있어야 한다
git add .gitleaksignore \
  __tests__/worker/payments.webhook-ledger.test.js \
  __tests__/worker/payments-v2.order-return-path.test.js \
  scripts/sync-cloudflare-worker-secrets.mjs \
  docs/handoff/inicis-security-advisory-2026-09.md \
  docs/handoff/security-followups-codex-2026-10-13.md \
  worker/payments/orders.js worker/routes/payments.js
NODE_OPTIONS=--experimental-vm-modules npx jest \
  __tests__/worker/payments-v2.order-return-path.test.js \
  __tests__/worker/payments.webhook-ledger.test.js \
  __tests__/worker/payment-refund.swallowed-write.test.js --runInBand --testEnvironment node
npm run test:worker:auth-payments        # 기대: 44 스위트 / 862 테스트 통과
npm run verify:payment-freeze && npm run verify:worker-security-guards && npm run verify:no-secret-leak
npm run verify:handoff-contract && npm run lint && npm run typecheck
git commit    # 메시지 끝에 Co-Authored-By 줄(저장소 규약)
```

주의: `routes/payments.js` 는 동결 파일(상한 3801줄, 현재 3800). 줄을 늘리지 않는다. 동결 구간을 건드리게 되면 `node scripts/verify-payment-freeze.mjs --update` 를 **같은 커밋**에 넣는다. 푸시는 사용자가 말할 때만.

## A. 👤 사람만 할 수 있는 일 (Codex 는 안내만, 값은 받지 않는다)

| # | 일 | 근거·상태 |
|---|---|---|
| A-1 | Google Cloud 콘솔에서 **YouTube 용 Google API 키 삭제** | 미사용(호출 코드 없음). 현행 값과 일치(이력 노출 4탐지). 삭제=폐기라 재발급 불필요 |
| A-2 | **메일 API 키(`EMAILAPI_KEY`) 교체** | 현행 값과 일치(2탐지). 운영 Worker 에 `EMAILAPI_KEY`·`RESEND_API_KEY` 둘 다 있다(2026-10-13 이름 확인). 코드(`worker/lib/resend.js:45`, `worker/lib/env.js` 별칭)는 `RESEND_API_KEY` 를 먼저, 없으면 `emailapi`/`EMAILAPI_KEY` 를 읽는다 → **새 키를 `RESEND_API_KEY` 에 넣고 `EMAILAPI_KEY` 는 삭제**(두 이름이 다른 값이면 어느 쪽이 쓰였는지 헷갈린다). 스테이징 먼저 → 발송 확인 → 운영 |
| A-3 | **불일치 25건 판정**(교체가 필요 없을 수도 있다) | (a) 나머지 Google 키 12종: 콘솔에서 존재·Referer/API 제한·호출 로그 확인, 남아 있고 제한이 없으면 삭제 (b) 80자 포트원 API 시크릿: 포트원 콘솔 발급 목록에 그 값이 남아 있는지 (c) `JWT_SECRET`·`ADMIN_SECRET_HASH`(2026-03-19 빌드 스냅샷): 운영 설정 시점이 그 뒤인지 (d) 관리자 입장 비밀번호 해시: 2026-04-03 이후 변경했는지(A2b) |
| A-4 | 포트원 고객센터 웹 문의 발송 | 문안: advisory 문서 '포트원 문의 문안'. 이니시스 기술문의 ts@kggroup.co.kr |
| A-5 | Atlas Network Access 가 `0.0.0.0/0` 이 아닌지, 시드·테스트 계정 비밀번호, 관리자 감사 로그(2026-04-07 이후) 확인 | 값 인용 금지, "변경 필요/불필요"만 보고 |
| A-6 | 유니크 인덱스 3종 읽기 전용 확인 | `docs/content-entitlements-unique-indexes-2026-10.md` 절차. **생성은 별도 승인 후** |
| A-7 | 이니시스 시크릿 4종(`MID`·`INIsignkey`·`INIAPIKEY`·`INIAPI_IV`) 보유 정책 결정(W10) | 제거하려면 `config/env.contract.json` `required_in`·`worker/lib/key-health.js` `payments-core` 그룹·고정 테스트를 함께 바꿔야 한다 |
| A-8 | `/api/payments/single/start\|complete`(410)를 부르는 외부 클라이언트가 없는지 | Worker 로그 |

## B. A 의 결과를 받은 뒤 Codex 가 하는 일 — `.gitleaksignore` 반영

**교체·삭제가 끝났다고 사용자가 말한 항목만** 넣는다. 말하지 않은 것은 넣지 않는다(넣으면 노출 사실이 CI 에서 사라진다). 현재 미기준선 = 31건·28지문(`Secret Scan` 이 붉은 이유).

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
| C-1 | 레거시 단건 결제 경로의 죽은 코드 정리(`routes/payments.js` 의 `single_*` 단계, `.catch(() => {})` 4곳 포함) | 410 으로 닫혀 있다. **재조정 크론이 이 핸들러 본문에 의존하는지** 먼저 증명(`git grep`·`verify:payment-reconcile`). 동결 구간이면 `--update` |
| C-2 | AI 라우트 자체 `verifyJwt` 에 `requireExp` 적용 | 기존 토큰 호환 위험 — exp 없는 토큰이 실제로 쓰이는지 데이터 확인 후. 액세스·리프레시는 이미 적용됨(`worker/lib/auth.js`) |
| C-3 | `lib/payment/portone.ts:444` 의 `new URL(redirectPath, origin)` 는 절대 URL `redirectPath` 를 그대로 따른다 | `redirectPath` 출처를 추적해 사이트 내부 상대경로만 허용하는지 확인. 출처 확인 전에는 단정하지 않는다 |
| C-4 | 공개 `GET /api/payments/config` 의 `inicis*Configured`·`missing` 최소화 | 값이 아니라 설정 여부일 뿐. 고정 테스트·검증 스크립트·픽스처를 같이 바꿔야 해 결제 게이트에 연쇄 — 우선순위 낮음 |
| C-5 | B1 엄격 모드(storeId/channel 부재 시 거부) | 운영 데이터(absent 비율) 선결. 현재 present-only 는 `payments-v2.db-pg.test.js:111,149` 가 의도로 고정 |
| C-6 | 사용 중인 DB URI·PortOne 시크릿용 커스텀 gitleaks 규칙 | `.gitleaks.toml` 은 `[extend] useDefault = true` + 단수 `[allowlist]` 만 적용된다(`[[allowlists]]` 는 v8.24.2 에서 무시됨) |
| C-7 | PR 단계 시크릿 스캔 | `.github/workflows/secret-scan.yml` 수정이 필요 — **사용자 승인 없이 수정 금지** |
| C-8 | `.env.local` 에 같은 값이 두 이름으로(`PORTONE_STORE`/`PORTONE_STORE_ID`, `INISTOREID`/`MID` 등) | `verify:env-parity` 경고. 교체 때 한쪽만 바꾸면 어긋난다 — 이름 정리는 계약·동기화 스크립트·테스트를 함께 |

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
