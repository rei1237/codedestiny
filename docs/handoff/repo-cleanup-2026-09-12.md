---
status: active
updated: 2026-09-12
next: 3) 남은 것은 크론 축소(사용자 결정)·ai-locale-gate shadow 원장. PR-7 이 파서 fail-closed·Playwright 캐시·blob-less 체크아웃을 끝냈다. 5) 룰셋 `CI required` 등록은 2026-09-12 완료·검증됨
---

# 레포 정리 (쓰레기 수거) 후속

## 왜

레포에 쌓인 죽은 파일·완료 핸드오프·중복 산출물을 줄여 탐색·CI 비용을 낮춘다. PR-2(쓰레기 1차, 브랜치 `chore/repo-cleanup-batch1`)에서 3면 grep 감사를 통과한 것만 지웠다.

## 지금 상태

- PR-2(#1933, 머지됨): 죽은 루트 파일·목업 캡처·미참조 자산·완료 핸드오프 20개 삭제 + 참조 문장 정정.
- PR-3(#1936, 머지됨): 미사용 의존성 3개 제거, 규칙 4 예외는 `docs/CONTEXT_AUDIT.md` 2026-09-12 절에 기록.
- PR-4(#1939, 머지됨): 보류 삭제 5건 처리.
- PR-5(#1940, 머지됨): 로컬 preflight 폐기 — 3)의 "preflight 경량화"를 제거로 끝냈다. `upstreamCompatible` 만 `delivery-admit.mjs` 로 이관.
- PR-6(#1941, 머지됨): paid-flow-gates 트리거 paths 구멍 15개 + 결제 PR jest 2회 실행 제거. CI 로그로 실동작 확정 — scope 가 `tier=critical` 을 내고 스위트가 `제외=npm test` 로 85개 항목을 2m29s 에 끝냈다.
- 규약: `docs/AI_HANDOFF.md` (완료 핸드오프는 삭제, 목록은 git grep).

## 남은 작업

- [x] 1) PR-3 의존성 제거 완료. `scripts/test-resend-email.mjs` 는 `worker/lib/resend.js` 를 쓰므로 그대로 둔다.
- [x] 2) 보류 삭제 5건 완료(PR-4). `AUDIT.md` 는 사용자 확인 결과 **결제 원장이 아니다** — 가격·결제 정본은 `worker/lib/paid-feature-registry.js`·`worker/payments/passes.js`·`docs/payment-policy-*` 3부작이고, `AUDIT.md` 는 2026-07-22 시점 실사 스냅샷이라 삭제했다. `docs/design/past-life-webtoon/` 은 `assets/provenance.md` 만 남겼다(배포 중인 `fuctionassets/past-life-webtoon/` 자산의 생성 출처).
- [ ] 3) CI 최적화. ~~preflight 경량화~~ → PR-5 에서 **폐기**로 종결. ~~paid-flow-gates jest 중복 + 트리거 paths 구멍~~ → PR-6 완료.
  - ✅ **PR-7 에서 처리**: ~~파서 fail-open~~ → `resolve-paid-gate-scope.mjs` 의 `paths` 파싱을 순수 함수 `parseTriggerGlobs` 로 분리하고, 어긋난 줄에서 조용히 `break` 하는 대신 **세우도록**(fail-closed, 원칙 10) 고쳤다. 🔴 그 파싱은 그때까지 **아무 테스트도 타지 않았다** — self-test 26건은 문구 탐지기만 봤다. 그래서 파서 축 6건을 더해 32/32 로 늘렸고(항목 수 독립 재계수로 절단 탐지 + 어긋난 블록 fixture 2종 + 합법 형태 1종), 실제 워크플로를 변이시켜 무는 것을 확인했다: 따옴표 없음·들여쓰기 8칸 → 세움, 작은따옴표 → 통과. ~~Playwright 브라우저 캐시~~ → `actions/cache@v4`(`~/.cache/ms-playwright`) 를 4곳(pr-ci 1 + pages-deploy 3)에 삽입. ~~스테이징 blob-less checkout~~ → 스테이징 체크아웃에만 `filter: blob:none` 추가(릴리스·롤백 체크아웃은 건드리지 않았다).
  - 🔴 **main-drift-watchdog 제거는 반대한다**(실측 근거). 이 워치독이 잡는 것은 개별 PR 이 아니라 **조합** 드리프트다(#928 이 남긴 낡은 미러를 #932 에서 발견, #935 로 수습). PR-5 에서 strict(최신 base 요구)를 켜지 않기로 확정했으므로 조합 드리프트 확률은 오히려 **올라갔다**. 최근 10 런 전부 success 이고 `npm ci` 한 번짜리라 싸다. 틀린 것은 워크플로가 아니라 파일 헤더 주석의 "strict ruleset과 함께" 라는 전제뿐이다.
  - ⏸ **ai-locale-gate paths 축소는 차단**. 워크플로 주석과 CLAUDE.md 가 "CI 선택 실행은 10개 PR 비교 전까지 shadow" 를 못 박았는데, shadow 결과는 `GITHUB_STEP_SUMMARY` 에만 남고 레포에 원장이 없다(`git ls-files | grep shadow` → 스크립트 하나뿐). 런 서머리를 긁어 원장부터 만드는 별건이다.
  - ⏳ **크론 축소는 사용자 결정**. `landing-watchdog` 은 `27 * * * *`(매시), `cloudflare-pages-deploy` 는 `*/20 * * * *`(하루 72런)다. 둘 다 감시·스테이징 신선도 장치라 빈도를 줄이면 그만큼 감지가 늦어진다 — 비용과 감지 지연의 교환이므로 단독으로 정하지 않았다.
  - ❓ **"스테이징 checks() 생략"** 은 대상을 못 짚었다(미확인). `cloudflare-pages-deploy.yml` 에서 `checks()` 호출을 찾지 못했다 — 원 저자 의도 확인이 필요하다.
- [ ] 4) 미러·sitemap·cachebust 커밋 요동 재설계, CSS·자산·로케일 중복 제거, 배포·SEO 체크리스트 통합, 루트 생성 보고서를 `reports/` 로 이동.
- [x] 5) **완료(2026-09-12 등록 확인)**. 실측 값: `required_status_checks` = `[{context:"CI required", integration_id:15368}]`, `strict_required_status_checks_policy:false`, ruleset `enforcement:active`. 필수 체크는 **1개뿐**이고 paths 트리거 워크플로 혼입 없음 — 아래 3줄 제약을 모두 만족한다. 🔴 **결정 뒤집힘(PR-5)**: 룰셋 20666260 에 aggregate `CI required` 하나를 required status check 로 **등록했다**. 이전 기록("required check 제거는 사용자 의도")은 로컬 preflight 가 안전망이던 시절의 판단이고, preflight 를 폐기한 지금은 GitHub 강제가 그 자리를 메워야 한다(사용자 확정). strict(최신 base 요구)는 켜지 않는다 — 켜면 main 전진마다 전 PR 재검증이라 `delivery-and-ci.md` 가 기록한 병목이 되살아난다. paths 트리거 워크플로(`Paid Flow Gates`·`Gift transaction integrity`·`AI Locale Gate`)는 절대 넣지 않는다 — 경로가 안 걸린 PR 에서 체크가 생성되지 않아 영구 pending 이 된다. 절차·롤백은 아래 「룰셋 등록」에 남겨둔다 — 되돌리거나 다시 만들 때 쓴다.
- [ ] 6) 범위 밖 발견: `app/_lib/fortune/ganjiGuardianSprite.ts:101-102` 가 레포에 없는 `/fuctionassets/60갑자.webp` 를 가리킨다. R2/CDN 에 있는지 확인(보고만, 미수정).
- [ ] 7) 로컬 정리: 머지되고 clean 한 워크트리·브랜치 제거. 스쿼시 머지라 is-ancestor 로는 판정이 안 되므로 `gh pr list --state merged --json headRefName,headRefOid` 로 판정.

## 함정

- 공개 미러(`public/_headers`·`public/js/README.md` 등)는 손편집하지 않고 `npm run sync:public` 으로 만든다.
- 다른 열린 PR 이 `CLAUDE.md`·`docs/CONTEXT_AUDIT.md`·`package.json`·`.github/workflows/**` 를 고친다. 그 PR 머지 뒤에 3)을 한다.

## 검증

```
npm run verify:doc-freshness
npm run verify:handoff-contract
npm run check:fast
```

로컬 전체 preflight 는 폐기했다(PR-5). 나머지 검증은 PR CI 가 한다.

## 룰셋 등록 (5번, 사용자)

**웹 UI 가 가장 빠르다**(도구 불필요): `Settings → Rules → Rulesets → main-protection → Require status checks to pass` 체크 → `Add checks` 에서 **`CI required`** 검색·추가 → 🔴 `Require branches to be up to date before merging`(strict)은 **끈 채로 둔다** → `Save changes`.

CLI 로 할 때 — 🔴 이 PC 에 `jq` 가 없다(실측). `gh --jq` 는 gh 내장이라 동작하지만 파이프 `jq` 는 안 된다. 그래서 페이로드 가공은 node 로 한다(`package.json` 은 commonjs).

```bash
# 0) 백업 — 되돌릴 때 이 파일이 유일한 근거다. 레포 밖(임시 폴더)에 둔다.
gh api repos/rei1237/codedestiny/rulesets/20666260 > ruleset-20666260.backup.json

# 1) 규칙 하나만 더한 페이로드 생성 (이미 있으면 중단)
node --input-type=commonjs -e "
const fs=require('fs');
const r=JSON.parse(fs.readFileSync('ruleset-20666260.backup.json','utf8'));
if(r.rules.some(x=>x.type==='required_status_checks')){console.log('이미 등록됨 — 중단');process.exit(1);}
r.rules.push({type:'required_status_checks',parameters:{strict_required_status_checks_policy:false,do_not_enforce_on_create:false,required_status_checks:[{context:'CI required'}]}});
const {name,target,enforcement,conditions,rules,bypass_actors}=r;
fs.writeFileSync('ruleset-20666260.next.json',JSON.stringify({name,target,enforcement,conditions,rules,bypass_actors},null,2));
console.log('보낼 rules:',rules.map(x=>x.type).join(', '));"

# 2) 적용
gh api --method PUT repos/rei1237/codedestiny/rulesets/20666260 --input ruleset-20666260.next.json

# 3) 검증 — parameters 가 찍히면 등록된 것이다
gh api repos/rei1237/codedestiny/rulesets/20666260 \
  --jq '.rules[]|select(.type=="required_status_checks")|.parameters'
```

롤백은 백업 파일로 같은 PUT 한 줄: `gh api --method PUT repos/rei1237/codedestiny/rulesets/20666260 --input ruleset-20666260.backup.json`. `pr-ci.yml` 에 `workflow_dispatch` 가 있어 체크가 큐에 안 잡히면 수동 재발행할 수 있다.

등록 후 첫 PR 에서 `CI required` 가 **Required** 로 표시되는지 한 번 확인한다. paths 트리거 워크플로를 실수로 넣으면 그 즉시 전 PR 이 영구 pending 이 되므로 required 목록에는 `CI required` **하나만** 있어야 한다.
