---
status: active
updated: 2026-10-13
next: "A의 남은 Google·JWT·관리자·MongoDB 키 판정과 Secret Scan 해소. F-1·F-2는 사용자 결정에 따라 로컬 커밋 완료. 메일은 유효한 RESEND_API_KEY만 스테이징·운영에 유지했다. 코드 push는 Secret Scan 실패로 대기."
---

# 기존 결함 후속 + 이력 노출 키 교체 — 인수인계

다음 세션 첫 문장: "docs/handoff/followups-and-key-rotation-2026-10-13.md 를 읽고 B부터 해."

## 왜
사용자(2026-10-13): "이전부터 있었던 문제들과 키 교체작업도 해줄 인수인계 문서와 명령어 작성해줘". 사주 풀이 연이/영냥이 전환 작업(main `63ae95649`, 운영 run 38322460960) 중에 봤지만 범위 밖이라 손대지 않은 것들이다.

## 지금 상태
- B~E 코드는 2026-10-13 완료했다. A의 실제 키 교체와 F의 정책 선택은 사람 결정이 필요해 남겨 두었다.
- `Secret Scan`은 A를 마치기 전까지 의도된 미해결 상태다.

## B~E 완료 기록 (2026-10-13)
- B `9548c60b8`: 같은 등급 이용권의 만료 기대값을 기간 없음 정책(`isOpenEndedPassExpiry`)에 맞췄다.
- C `91f0458b9`: 추천·생년월일 대기 주문 API 목과 현재 영냥이 상담/복귀 흐름을 브라우저 픽스처에 반영했다. Chromium·WebKit 분할 시나리오는 모두 통과했다.
- D·E `2e2db5336`: 조사 감사를 0종으로 만들고, 격국 반말판을 원천 데이터로 분리했으며, 귀인 명사구와 영냥이 현실 체크 테마 토큰을 정리했다. 의도된 렌더 변경에 맞춰 패리티 해시와 공개 미러를 갱신했다.
- 공통 로컬 게이트: `npm run check:fast` 통과(Node 3,197건, Jest 394 suites/6,026 tests 포함). 마지막 문구 조정 뒤 관련 사주 테스트 70건도 재통과했다.
- C의 `--build-static`은 다른 세션이 사용 중인 로컬 개발 서버를 중지하지 않기 위해 생략했다. 기존 정적 산출물을 이용한 Chromium·WebKit 검증은 통과했으며, main 전달 뒤 Shadow CI를 다시 실행한다.

## 남은 작업

### A. 👤 이력 노출 키 교체 — 사람 몫, 최우선(저장소 PUBLIC)
정본 런북은 `docs/handoff/inicis-security-advisory-2026-09.md` 의 '키 교체 런북' 표(이름별 영향·순서·주의)다. 여기에는 명령만 둔다. **값과 노출 위치(커밋·파일)는 문서·커밋·PR 어디에도 적지 않는다.**

1. 노출된 이름 확인 — 보고서는 저장소 밖(`$TMP`)에만 두고 공유·커밋하지 않는다.
   ```bash
   gh release download v8.24.2 --repo gitleaks/gitleaks --pattern "gitleaks_8.24.2_windows_x64.zip" --dir "$TMP/gl"
   unzip -o "$TMP/gl/"*.zip -d "$TMP/gl"
   "$TMP/gl/gitleaks.exe" git --redact --no-banner -f json -r "$TMP/gl/report.json" .
   # 기준선(.gitleaksignore)에 없는 탐지를 규칙·파일별로 센다 — 값은 --redact 로 가려져 있다. 기대: 31건(지문 28개)
   node -e "const fs=require('fs');const ig=new Set(fs.readFileSync('.gitleaksignore','utf8').split(/\r?\n/).map(l=>l.trim()).filter(l=>l&&!l.startsWith('#')));const r=JSON.parse(fs.readFileSync(process.argv[1],'utf8')).filter(f=>!ig.has(f.Fingerprint));const g={};for(const f of r){const k=f.RuleID+'  '+f.File;g[k]=(g[k]||0)+1}console.log('미기준선',r.length,'건');for(const[k,n]of Object.entries(g))console.log(n,k)" "$TMP/gl/report.json"
   ```
2. 이름 하나씩 — 제공자 콘솔에서 새 값 발급(구 값은 아직 두기) → 로컬 비공개 env 파일에 새 값 → 아래 순서.
   ```bash
   H='let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const k=JSON.parse(s).keyHealth||{};console.log("ok",k.ok,"broken",JSON.stringify(k.brokenFeatures))})'
   npm run secrets:cf:worker:dry -- --target=staging --only-key=<이름>
   npm run secrets:cf:worker -- --target=staging --only-key=<이름>
   curl -s "https://staging.code-destiny.com/api/health?refresh=1" | node -e "$H"
   # 운영 — --target 을 빼면 production. 사용자 승인 뒤에만.
   npm run secrets:cf:worker:dry -- --only-key=<이름>
   npm run secrets:cf:worker -- --only-key=<이름>
   curl -s "https://code-destiny.com/api/health?refresh=1" | node -e "$H"
   ```
   - `MONGO_URI` 는 Pages 에도 있다: `npm run secrets:cf:pages:dry` → `npm run secrets:cf:pages`. 이 스크립트에는 `--only-key` 가 없어 전체를 동기화하므로 dry-run 출력을 먼저 본다.
   - 확인이 끝나면 제공자 콘솔에서 구 값을 폐기하고 health 를 다시 본다.
   - 순서 주의(런북 표): `JWT_SECRET` 은 전 사용자 로그아웃이라 이용 적은 시간대에. `PORTONE_WEBHOOK_SECRET` 은 포트원 콘솔과 짝이라 콘솔 발급 직후 바로 바꾼다. `PORTONE_API_SECRET` 은 구 값이 언제 꺼지는지 미확인(런북 문의 (4)).
3. 교체를 마친 지문만 `.gitleaksignore` 에 넣는다. 사유는 바로 위 주석 줄에 적는다(`# 2026-MM-DD 교체: <이름>`). 교체 전에는 절대 넣지 않는다(노출 사실이 CI 에서 사라진다).
   ```bash
   "$TMP/gl/gitleaks.exe" git --redact --no-banner .   # exit 0 이면 커밋·푸시
   rm -rf "$TMP/gl"
   ```
- 끝 기준: main `Secret Scan` 초록 + 운영 `keyHealth.ok: true` + 스테이징은 교체 전과 같은 결과(2026-10-13 기준 `broken ["payments-core"]` 는 구 이니시스 키 미설정이라 원래 그렇다 — 런북 문서 '남은 일' 5번) + 모든 구 값이 제공자 쪽에서 폐기됨.

### B. ✅ 완료 — Gift transaction integrity — 테스트 기대값이 옛 정책
- 증상: `tests/integration/gifts.replica.integration.js:120`("same-tier claim preserves spend and adds period and budget")이 만료 = 기존+30일을 기대하는데, 실제 값은 약 100년 뒤다.
- 원인: `6ad346571`(10-11, 이용권 기간 제거)이 같은 등급 지급을 기간 없음(활성화+100년 센티널 `PASS_OPEN_ENDED_MS`)으로 바꿨다. 이 통합 테스트는 jest 기본 roots 밖이라 그때 같이 고쳐지지 않았다. 마지막 성공 `d7b7238f4` → 첫 실패 `395d2d125`.
- 할 일: 테스트만 바꾼다. 기대값을 `isOpenEndedPassExpiry(...)` 로 바꾸고 테스트 이름의 "adds period" 도 정책에 맞춘다. 정본 예시: `__tests__/worker/pass-open-ended.test.js`.
- 검증: 이 PC 에는 Docker 가 없다(리플리카셋 Mongo 필요). `gh workflow run gift-integrity.yml --ref main -R rei1237/codedestiny` → 33/33.

### C. ✅ 완료 — Yeongnyangi Browser Shadow — 새 API 목 누락
- 증상: `scripts/lib/yeongnyangi-mobile-payment.mjs:313` "Unrecognised API must not silently succeed". 목에 없는 `GET /api/payments/birth-profile-pending` 이 호출된다.
- 원인: `73445d45f`(10-10, 프로필 선택 지급 카드)가 추가한 엔드포인트를 브라우저 픽스처가 모른다.
- 할 일: 같은 파일의 API 목에 이 경로를 추가한다. 응답 형태는 워커 쪽 정의를 `git grep birth-profile-pending` 해서 맞추고, 기본값은 "대기 주문 없음"으로 한다.
- 검증: `node scripts/verify-yeongnyangi-browser.mjs --build-static` → `node scripts/verify-yeongnyangi-browser.mjs`, 그다음 `gh workflow run yeongnyangi-browser-shadow.yml --ref main -R rei1237/codedestiny`.

### D. ✅ 완료 — 조사(로/가/와) 받침 오류 — 연이·영냥이 공통
- 감지: `node scripts/audit-saju-josa.mjs`. 2026-10-13 기준 11종이 나온다(근육와·근육가·시력와·시력가·오행로·보석로 등).
- 원인: 렌더러가 `값+'와 '`·`값+'가 '` 처럼 조사를 고정으로 붙인다. 예: `worker/lib/saju-section/paid-renderers.src.js:607`(`health.weak+'와'`), `:611`(`+'가'`).
- 할 일: 서버 렌더러에 받침 조사 도우미를 하나 두고, 고정 접합을 그것으로 바꾼다. 클라 쪽 정본 도우미는 `js/core/saju/reading-rich.js:507` 의 `jo()` 다.
- 연이 문구도 바뀌므로 패리티 픽스처의 pig 해시도 바뀐다. 의도된 변경이라고 커밋 메시지에 적는다.
- 끝 기준: 감사 출력이 비어 있음.

### E. ✅ 완료 — 영냥이 문구 마감(코드, 작음)
1. 귀인: `paid-renderers.src.js:1032` 의 `guiinByDomNeo` 값은 "~야."로 끝나는 완결문인데, `:1537`·`:1578` 이 그 값을 문장 중간(`<b>…</b>와의 만남`, `귀인(…)과의 인연`)에 끼운다. 명사구 표를 따로 둔다.
2. 격국 판단 이유: `lib/saju/reading-depth.mjs:272` 의 `neoReason` 이 존댓말 원문(`worker/lib/saju-gyeokguk.js` 의 `judgmentReason`)을 정규식으로 반말로 바꾼다. 새 어미가 생기면 존댓말이 샌다. 원천에서 반말판을 내거나, 가능한 끝맺음 전수를 테스트로 고정한다. 재생성: `node scripts/build-saju-reading-depth.mjs`.
3. 현실 체크 상자: `paid-renderers.src.js` 1630~1636 의 인라인 스타일이 옛 '팩폭' 빨강(`#e53935`, 짙은 적색 그라데이션)이다. `docs/context/design-canon.md` 의 영냥이 톤으로 바꾸고, 라이트·다크 둘 다 본다.

### F. ✅ 사용자 결정 반영 — 로컬 커밋 완료, 원격 전달 대기
1. AI 상담 화자(`d54ce9591`): 선택한 연이/영냥이 풀이를 따르도록 승인했다. 저장된 두 화자 요약을 사용하고 공통 상담문·서버 프롬프트를 유지한다. 실제 버튼 선택과 storage 변경으로 요약·복사·공유를 전환하며, 추가 결제·LLM 생성·결과 삭제는 없다. mock 동작 검증에서 POST 0건이다.
2. 카카오 CRM 동의 버전(`a4d784c0c`): 구버전 유예를 승인했다. 이름 변경 전 v1만 2026-10-20까지 수신하며 표시했던 v1 문구·버전을 그대로 기록한다. 경계 시각부터 거절하고 v2는 계속 받는다. 기간 내 동의/철회·기간 경계·알 수 없는 버전을 mock으로 검증했다.

외부 키 실측·메일 정리·추가 시크릿 탐지·최신 검증 기록은 `security-followups-codex-2026-10-13.md`의 "Codex 재개 실측"을 따른다. 메일 제공자 조회와 스테이징·운영 시크릿 정리는 완료했지만 실제 메일 발송은 하지 않았다. Secret Scan 초록·push·코드 운영 승격은 완료되지 않았다.

### G. 로컬 전용 — site-name 테스트 헛실패
`__tests__/ui/site-name-signals.static.test.js` 는 `dist/`·`out/` 이 있으면 그 안도 훑는다. 이 PC 에 있는 것은 개명 전 빌드라 "꿀꿀운세"가 남아 실패한다. 둘 다 gitignore 대상이라 CI 와는 무관하다. `rm -rf dist out` 뒤 `npm run test:node`.

## 함정
- 사주 렌더러(`paid-renderers.src.js`·`paid-cycle.src.js`)를 고치면 `node scripts/extract-saju-section-runtime.mjs --write` → `__tests__/fixtures/saju-section-client-parity.json` 해시 갱신(1칸 들여쓰기 JSON) → `npm run sync:public` 을 한다. 커밋하면 빌드 스탬프가 바뀌므로 `sync:public` 을 한 번 더 돌려 커밋한다. `verify:public-mirror-fresh` 는 깨끗한 트리에서만 판정한다.
- `verify:saju-result-login` 은 CI 에서 가끔 모달 대기 시간 초과로 실패한다(`63ae95649` 에서 1회, 재실행으로 통과). 코드 결함으로 보지 말고 `gh run rerun <id> --failed` 한다.
- Bash 히어독은 이 환경에서 역슬래시를 잃는다. 정규식이 든 줄은 Edit 도구로 고친다.

## 검증
```bash
node scripts/audit-saju-josa.mjs
node scripts/extract-saju-section-runtime.mjs --check
npm run test:node
node scripts/run-mock-tests.mjs jest
npm run verify:saju-summary-browser
npm run verify:handoff-contract
```

## 모르는 것
- 이전 점검에서 본 '비견로'·'경험가'·'햇빛로'는 위 감사(종합 풀이 26렌더)에 잡히지 않는다. 대운·세부 섹션이나 클라 경로에서 나왔을 수 있다. 출처는 미확인이다.
- 포트원이 `PORTONE_API_SECRET` 구 값을 즉시 끄는지 — 런북 문의 (4)의 답을 기다린다.
