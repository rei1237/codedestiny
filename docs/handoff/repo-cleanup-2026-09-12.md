---
status: active
updated: 2026-09-12
next: 4) 자산 중복은 PR-9 로 종결(125 → 63개, 2.3MB). CSS 축은 29KB 실측으로 제외. 루트 생성 보고서 3개는 PR-10 으로 `reports/` 이동 완료. 남은 것은 로케일 3.8MB(en 폴백 선행 필요)·배포·SEO 체크리스트 통합. 3) 은 크론 축소(사용자 결정)·ai-locale-gate shadow 원장만 남았다. 5) 룰셋 `CI required` 등록은 2026-09-12 완료·검증됨
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
- PR-8(`chore/cachebust-per-asset`): 정적 셸 `?v=` 를 자산별 내용 해시로 전환. index.html 커밋 요동 92줄 → 6줄(실측).
- PR-9(`chore/dedupe-css-assets-locale`): feature-details 히어로 자산 중복 제거(125 → 63개) + CSS·로케일 축 실측 종결.
- PR-10(`chore/dedupe-css-assets-locale`): 루트 생성 보고서 3개를 `reports/` 로 이동(루트 추적본 1,756줄 제거).
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
  - ✅ **cachebust 재설계 완료(PR-8)**. 원인은 전역 빌드 키 하나가 `index.html` 의 `?v=` 94개를 한꺼번에 덮은 것이고, 그 키가 `index.html`+`js/**`+`styles/**` **전체**의 해시라 무관한 한 줄에도 전부 회전했다. 실측(index.html 최근 25커밋): 10건(40%)이 실내용 0줄인데 92줄 변경, 내용 있는 커밋도 92줄이 덤(실내용 6줄 → raw 98줄), 미러 7개까지 커밋당 약 736줄. `scripts/lib/asset-cache-keys.mjs` 로 `?v=` 를 **자산별 내용 해시**로 바꿨다 — 실측 **92줄 → 6줄**. 캐시 정합도 같이 이득이다(전에는 한 줄 고치면 전 자산 엣지 캐시가 통째로 무효화됐다).
  - 🔴 **이미지 `?v=` 는 일부러 전역 키로 남겼다**(남은 6줄의 정체). `index.html` 주석이 "새 일러스트는 같은 경로에 덮어쓰고 sync:public 만 돌린다"고 못 박은 **의도된 장치**다. 이미지는 R2/CDN 배포분이라 레포에 파일이 없어 내용 해시를 계산할 수도 없다. 이 6줄을 더 줄이려면 이미지 배포 경로부터 바꿔야 하는 별건이다.
  - 🔴 새 참조가 레포 파일로 안 풀리면 **빌드가 선다**(fail-closed, 원칙 10). js/css/json 인데 못 풀면 에러, 이미지 확장자는 전역 키, 미분류 확장자는 에러다. 분류표는 `scripts/lib/asset-cache-keys.mjs` 상단에 있다.
  - ✅ **CSS·자산·로케일 3축 실측 완료(PR-9)**. 전 추적 파일 내용 해시로 비미러 중복을 재니 **9.83MB**(미러 227그룹 중 36그룹)였고, 축별 결론이 갈렸다.
    - **CSS = 실질 없음(종결)**. 29개 파일 2.0MB / rule 11,156개에서 동일 selector+body 중복은 **29.1KB**뿐이다(307그룹, 대부분 `fortune-ui.css`↔`fortune-ui-home.css` 와 `core-ui.css`↔`globals.css`). 재설계 비용이 이득을 넘는다 — 4) 에서 뺀다.
    - ✅ **자산 = PR-9 로 제거**. `public/feature-details/assets` 125개 중 **80개가 9개 원본의 바이트 동일 복제**였다(13x·7x·5x·5x·2x). 원인은 `build-visual-details.mjs:67-75` 의 카테고리 공용 fallback 을 슬러그마다 재인코딩한 것. 원본 공유 시 `shared-<sha1 8자>-<폭>.webp` 1개만 쓰게 바꿨다 — **125 → 63개, 5.9MB → 3.5MB**. 고유 원본은 `<slug>-<폭>.webp` 유지(기능별 일러스트를 같은 경로에 넣는 기존 방식 보존).
    - ⏸ **로케일 = 최대(3.8MB)인데 선행 과제가 있다**. `public/i18n/{de,en,es,fr,hi,ms,nl,vi}/loveSimulationScenes.json` **543.6KB 8개가 완전 동일**이다. 그런데 로더(`lib/i18n/dictionary.ts:150-169`, `js/cd-lang-native.js:314-328`)는 404 에 `null` 만 돌려주고 **en 재시도 분기가 없고**, `scripts/i18n-check.mjs:16` 이 파일 존재를 단언한다. 사본 삭제 전에 폴백 규약부터 세우는 별건이다.
  - ✅ **루트 생성 보고서 `reports/` 이동 완료(PR-10)**. 루트 md 중 **스크립트가 쓰는 것은 3개뿐**이었다(실측): `SEO_ADSENSE_AUDIT.md`·`I18N_TRANSLATION_MATRIX.md`(`scripts/audit-seo-adsense-i18n.mjs`), `MOBILE_JOURNEY_MATRIX.md`(`scripts/build-mobile-journey-matrix.mjs`). 셋 다 `reports/`(이미 `.gitignore` + `safe-clean-repo.mjs` 대상)로 돌리고 루트 추적본 1,756줄을 지웠다. 🔴 **`MOBILE_FEATURE_REGISTRY.md`·`MOBILE_FEATURE_DETAIL_TEMPLATE_REPORT.md`·`MOBILE_FINAL_COMPLETION_AUDIT.md` 는 이름이 REPORT 여도 생성물이 아니라 수기 원장이다** — `scripts/verify-mobile-final-audit.mjs:7-9` 와 `verify-mobile-entry-actions.mjs:7` 이 **입력으로 읽으므로** 루트에 남겼다. 참조 2곳(`docs/seo/GROWTH_OPERATIONS.md:41`, `docs/purchase-journey/README.md:13`)은 생성 명령 + `reports/` 경로로 고쳤다. `docs/payments/payment-inventory.json` 의 `excludedFiles` 에도 이름이 있지만 고정 HEAD 스냅샷이고 이를 읽는 검사가 없어(전수 grep) 두었다.
  - ⏳ 남은 하나: 배포·SEO 체크리스트 통합(루트 `DEPLOY_CHECKLIST`·`DEPLOYMENT_MODE`·`CLOUDFLARE_PAGES_SETUP` / `ADSENSE_APPROVAL_CHECKLIST`·`GOOGLE_INDEXING_CHECKLIST`·`SEO_SUBMISSION_GUIDE`·`SEO_ADSENSE_AUDIT`). 🔴 통합 시 `scripts/lib/doc-refs.mjs:24-33` 의 `ROOT_REPO_PATHS` 허용목록(`CLOUDFLARE_PAGES_SETUP.md`·`DEPLOY_CHECKLIST.md` 포함)과 `docs/seo-strategy/**` 의 인바운드 링크 7곳을 같이 고쳐야 한다. **sitemap 요동은 손댈 것이 없다**(확인함) — `config/sitemap-lastmod.json` 내용 서명 원장이 이미 같은 원리로 처리하고 있다.
- [x] 5) **완료(2026-09-12 등록 확인)**. 실측 값: `required_status_checks` = `[{context:"CI required", integration_id:15368}]`, `strict_required_status_checks_policy:false`, ruleset `enforcement:active`. 필수 체크는 **1개뿐**이고 paths 트리거 워크플로 혼입 없음 — 아래 3줄 제약을 모두 만족한다. 🔴 **결정 뒤집힘(PR-5)**: 룰셋 20666260 에 aggregate `CI required` 하나를 required status check 로 **등록했다**. 이전 기록("required check 제거는 사용자 의도")은 로컬 preflight 가 안전망이던 시절의 판단이고, preflight 를 폐기한 지금은 GitHub 강제가 그 자리를 메워야 한다(사용자 확정). strict(최신 base 요구)는 켜지 않는다 — 켜면 main 전진마다 전 PR 재검증이라 `delivery-and-ci.md` 가 기록한 병목이 되살아난다. paths 트리거 워크플로(`Paid Flow Gates`·`Gift transaction integrity`·`AI Locale Gate`)는 절대 넣지 않는다 — 경로가 안 걸린 PR 에서 체크가 생성되지 않아 영구 pending 이 된다. 절차·롤백은 아래 「룰셋 등록」에 남겨둔다 — 되돌리거나 다시 만들 때 쓴다.
- [ ] 8) 범위 밖 발견(PR-9): `verify:feature-marketing-schema` 가 `scripts/verify-guard-wiring.mjs:158` 에서 `UNWIRED_BY_DESIGN` 이라 **CI 에서 돌지 않는다**. `index.html` 의 수기 `outlineImage` 36개가 실제 파일을 가리키는지 보는 유일한 가드이므로, 깨지면 CI 초록인데 화면만 빈 액자가 된다. PR-9 에서는 로컬 1회 + 없는 경로 주입 변이로 무는 것을 확인했지만(실측), 배선 자체는 범위 밖이라 손대지 않았다.
- [ ] 9) 범위 밖 발견(PR-9): `scripts/lib/build-visual-details.mjs` 의 자산 prune 은 **이 생성기가 소유한 이름**(`<알려진 슬러그>|shared-*` + `-<폭>.webp`)만 지운다. 수기 자산 `feature-detail-shared-hero-v1-*.webp` 를 보호하려는 의도적 제약이다. 규약 밖 이름의 stale 자산은 여전히 자동으로 안 지워진다.
- [ ] 6) 범위 밖 발견: `app/_lib/fortune/ganjiGuardianSprite.ts:101-102` 가 레포에 없는 `/fuctionassets/60갑자.webp` 를 가리킨다. R2/CDN 에 있는지 확인(보고만, 미수정).
- [ ] 7) 로컬 정리: 머지되고 clean 한 워크트리·브랜치 제거. 스쿼시 머지라 is-ancestor 로는 판정이 안 되므로 `gh pr list --state merged --json headRefName,headRefOid` 로 판정.

## 함정

- 공개 미러(`public/_headers`·`public/js/README.md` 등)는 손편집하지 않고 `npm run sync:public` 으로 만든다.
- 🔴 **`check:fast` 는 CI 의 Static guards 를 돌지 않는다**(PR-8 실측). 캐시 키·셸 규약을 바꾸면 로컬이 전부 초록이어도 CI 에서 처음 터진다. PR-8 에서 `verify:hero-firstpaint-lock` 이 그랬다 — 전역 키 시절 "배포마다 회전한다"를 *서로 다른 두 파일의 `?v=` 가 같은지*로 표현하고 있었는데, 자산별 해시에서는 당연히 달라진다. 값 비교 대신 **각 값이 제 파일 내용 해시와 맞는지**로 바꿨다(약화가 아니라 강화 — 낡은 수기 키까지 잡는다). 같은 유형을 `verify-mobile-final-audit`·`verify-payment-choice-parity` 에서도 확인했고 둘은 안전했다.
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
