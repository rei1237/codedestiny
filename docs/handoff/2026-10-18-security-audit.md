---
status: active
updated: 2026-10-18
next: "복구 HEAD 9c139bc3c8dbe5ac6548a3811d93d15b3232ba6c의 PR CI 39092174340와 AI Locale Gate 39092174318 통과 후 보안 변경을 통합한다. 공유 main 변경86개를 보존한다."
---

# 보안 조사·수정 전달 재개

- 작업 경로: `D:\Development\codedestiny-worktrees\security-audit-20261018-20261018-015620`
- 문서 절대 경로: `D:\Development\codedestiny-worktrees\security-audit-20261018-20261018-015620\docs\handoff\2026-10-18-security-audit.md`
- 브랜치: `wt/security-audit-20261018-20261018-015620`
- 기준 원격 SHA: `f11871f4cf9e344ad5c9484e81cc32351b5ebc3c`
- 마지막 코드 커밋: `aee5d23dee1b71b965338dafbd243eda4d15321b`
- 조사 증거 커밋: `7dc368b6e`(이 인수인계와 후속 검증 기록은 이후 문서 커밋)
- push/통합/운영 배포: 미실행. 작업 브랜치·PR 추가 생성 금지.

## 차단 및 보존

시작 시 공유 main은 `3be4b029d2e3438831b2f5b440b74c149041cd93`, 원격보다323커밋 이전, 다른 세션 변경86개였다. 공유 checkout의 파일·index·stash를 변경하지 않았다. 기준 원격 main의 AI Locale Gate39051090837이 `LLM call inventory changed`로 실패했다. 사용자와 저장소 규칙에 따라 그 위로 push하지 않는다. 최종 조회 결과는 아래 전달 기록과 조사 문서를 확인한다.

자기 워크트리는 미전달 커밋 보존을 위해 남긴다. `node_modules`는 공유 main으로 향하는 junction이다. 통합 완료 전 제거하지 말고, 완료 후 junction만 먼저 해제한 뒤 저장소 배수 규칙을 적용한다. 다른 세션의 파일/워크트리를 정리하지 않는다.

최종 조회 main: `2d55a5bd8e7d73487c7ff58f7f2a2a6c07e8fca3`. [AI Locale Gate39053081824](https://github.com/rei1237/codedestiny/actions/runs/39053081824) failure(동일 inventory mismatch), [PR CI39053081775](https://github.com/rei1237/codedestiny/actions/runs/39053081775) in_progress, Critical checks skipped, [Secret Scan39053081881](https://github.com/rei1237/codedestiny/actions/runs/39053081881) success. 공유 main은 여전히 같은 HEAD/다른 변경86개. merge-tree 시뮬레이션 충돌 없음, 실제 통합 미실시. 이 보안 SHA의 원격 CI/배포는 없다.

## 변경과 검증

1. `93d8b7bbbe74bb13b7e1b00caa3389c10f080455` 실제 body byte 상한·rate counter fail-closed·깊은 로그 정화, 테스트와 generator 원장.
2. `39c3bc4ab8e555a4a4cbb7e8f502736d5505465f` payment/webhook/gift/coin-gate/palm의 직접 body reader 제한.
3. `aee5d23dee1b71b965338dafbd243eda4d15321b` OAuth state의 browser cookie 결합·exp 필수와 정상/공격 회귀.

가격·권리·보존·DB 스키마/인덱스 변경 없음. 인증·결제 코드의 보안 수정은 사용자 승인 범위다. 운영 키 회전/폐기·DB 변경·배포·실 LLM/결제는 별도 승인 없이는 실행하지 않는다.

상세 증거: `docs/security/application-security-20261018.md`, 실제 분기 목록: `docs/security/routes-20261018.json`. 새 테스트는 기존 CI critical의 Jest 수집에 포함되고 guard-wiring/freeze 검사 통과. targeted 보안/인증/결제 회귀 통과, Node3374개·typecheck·lint 통과. 커밋된 트리 check:pre-push 통과. 전체 check:fast는 paid suite 도중 exit -1 종료했으므로 통과라고 하지 않는다. 모든 Jest shard와 나머지 paid gates를 별도로 실행해 결과를 후속 기록한다.

최종 로컬 결과: Jest4shard **420suite/6664테스트 모두 통과**, Node3374통과. npm test를 별도로 수행한 나머지 paid suite89항목 전부 통과. check:fast 계획의 나머지13개(env, 암호화, snapshot, mock, no-undef, Mongo, worker dry-run build, encoding 등)도 모두 exit0. 검사·스캐너·기대값을 약화하지 않았다. 자체 검증 로그와 내려받은 스캐너는 요약을 이 문서에 보존한 뒤 정리한다.

Git 전체 이력 secret scan은 메모리 할당 실패로 미완료. 부분 탐지1건(생성 runtime.generic-api-key)은 오탐 의심/추가 확인이며 값은 출력하지 않았다. 기준 HEAD 단일커밋·3개 보안 커밋 staged diff scan은 exit0. ignore 확대 없음. 전체 이력과 현재 운영 키 폐기는 확인하지 못했다.

## 재개 순서

1. 위 경로에서 `git status --short`, 코드 SHA와 조사 문서를 읽는다. 공유 main에서 자동 pull/merge/reset/stash하지 않는다.
2. `git fetch origin main` 후 최신 정확한 SHA의 PR CI·AI Locale·Secret Scan을 한 번 확인한다. 외부 main 실패는 원인 커밋과 함께 보고하고 push 보류.
3. 미검증/실패 검증을 확인하고 필요 시 전체 테스트를4개 shard로 실행한다(모든 shard 수행, ignore/기대값 변경 금지). `npm run check:fast -- --plan --base=f11871f4cf9e344ad5c9484e81cc32351b5ebc3c`로 전체 작업 범위를 다시 산정한다.
4. 최신 main 통합이 안전할 때만 저장소 절차로 통합하고 영향 검사·커밋된 트리 `npm run check:pre-push` 후 `git push origin main`. 정확한 전달 SHA의 CI는 최종 보고 전1회 확인. 진행/실패/skipped를 구분한다.
5. 탈퇴 access token 결제 경로, 실기기 OAuth/cookie, 실제 Mongo index·트랜잭션·CSP/CDN, 전체 비밀 이력/공급망 미검증을 남은 작업으로 유지한다.
6. 전달 완료 후 이 문서를 done으로 닫고 자기 temporary 파일·junction·worktree·머지된 wt branch만 정리한다.

## 2026-10-18 재개 확인: main 실패 지속

- 요청한 시작 HEAD `774038cdf16995d4917dc7920064d7cb9ebc8633` 일치, 작업 트리 clean 확인. 이번 재개에서는 보안 코드 변경·실제 merge·push·운영 행위를 하지 않았다.
- `git fetch origin main` 후 정확한 원격 SHA는 `34d3447ed0234c4bd03d2ac3069726e171996e6b`.
- [PR CI 39054796742](https://github.com/rei1237/codedestiny/actions/runs/39054796742): **failure**. `CI required`, `Static guards`, `Build Pages and Worker` 실패. Risk tier·Typecheck and lint·Critical checks는 success.
- Static guards: 3381개 중3378통과·3실패. 사주 직행 링크 기대값(`/saju/basic` → `/?action=cdOneStepFreeSajuEntry`), `why-saju-results-differ-between-services` 원고 검토 해시 불일치, `sukuyo-landing-scope.test.mjs`의 베다 페이지 dateModified 기대값(`2026-10-12`)과 실제(`2026-10-18`) 불일치.
- Build: `verify-adsense-readiness.mjs`에서 홈페이지 meta description 표시 폭180이 상한160을 초과. 홈페이지·SEO 소스 변경 커밋 `952a76208506e42943526c24d328cefe2abaed4d`가 관련되며, 해당 변경의 최초 실패 여부까지는 재실행하지 않았다. 이 보안 작업의 커밋은 원격에 없으므로 위 실패는 보안 수정의 원격 검증 결과가 아니다.
- [AI Locale Gate 39054796839](https://github.com/rei1237/codedestiny/actions/runs/39054796839): **failure**, `audit-ai-locale-calls.mjs:59`의 `LLM call inventory changed`. [Secret Scan 39054796735](https://github.com/rei1237/codedestiny/actions/runs/39054796735): success.
- 공유 main은 `3be4b029d2e3438831b2f5b440b74c149041cd93`, 다른 세션 변경86개. 파일·index·stash·브랜치 포인터를 변경하지 않았다.
- `git merge-tree --write-tree HEAD origin/main`: **config/sitemap-lastmod.json 충돌**. 이전 원격에 대한 무충돌 기록은 현재 원격에 적용되지 않는다. 실제 merge 미실행. main 복구 후 소스를 합치고 `npm run sitemap:generate`로 원장을 생성해야 하며 원장을 손으로 편집하지 않는다.
- `npm run check:fast -- --plan --base=f11871f4cf9e344ad5c9484e81cc32351b5ebc3c`: exit0, 17파일·critical. 계획 확인이며 검사 실행 통과를 뜻하지 않는다. 기존 전체 테스트 증거는 위 이전 실행 기록이며 이번에 반복하지 않았다.
- 사용자 요청 및 전달 규칙에 따라 실패한 main 위로 push하지 않는다. 이번 문서 갱신만 로컬 커밋하고 보안 워크트리·junction·미전달 커밋을 보존한다. `status: blocked` 유지. CI 복구와 안전한 공유 main 통합이 끝나기 전에는 done이나 정리 완료로 바꾸지 않는다.
- 이번 문서 검증: `git diff --check` exit0, `npm run verify:handoff-contract` 222개 문서 통과, `npm run verify:doc-freshness` 통과. 공유 main 최종 재확인도 같은 HEAD·변경86개. 코드 변경이 없고 원격 CI가 차단 상태이므로 전체 코드 검사·check:pre-push는 반복하지 않았다.

## 2026-10-18 CI 직접 복구 요청

- 사용자 요청: main 실패 원인부터 직접 수정하고, 복구 수정만 검증·push한 뒤 CI 통과 후 보안 변경을 통합·검증·push한다.
- 공유 main을 변경하지 않기 위해 기존 보안 브랜치 `7c29465a1bbbd9d6738534d69f8ba165766af149`를 보존하고 같은 전용 워크트리를 원격 main에서 detached checkout하여 복구만 분리했다. 새 브랜치·PR·워크트리는 만들지 않았다.
- 복구 커밋 `f0b3e7c5dc985460e2d81218a49643215e20e08a`를 `git push origin HEAD:refs/heads/main`으로 전달했다. 10파일: 메타 설명, 경로·수정일 테스트, AI 호출 원장, AI 편집 검토 기록, 생성 sitemap 원장·미러. 보안 커밋은 아직 합치지 않았다.
- `952a76208506e42943526c24d328cefe2abaed4d`의 의도한 `/saju` 경로·2026-10-18 실제 콘텐츠 수정일에 테스트를 맞췄다. 원고는 같은 커밋에서 `/saju/basic/`→`/saju/` 링크 한 곳만 바뀐 것을 확인하고 AI 검토 해시·기록을 갱신했다. 인간 검토·광고 허용 상태는 그대로다.
- AI 원장의 불일치는 `c70354de9`에서 없어진 `ziwei-island-ai.js`의 import·호출 2건이었다. 실제 라우트는 기존 결과 재열람만 제공하므로 호출이 없음을 확인하고 기존 생성기로 갱신했다. 검사기·ignore·예외는 변경하지 않았다.
- 로컬 복구 검증: 관련 Node20/20, AI inventory62파일150근거, browser/provider locale mock(12로케일), 변경 파일 ESLint exit0(기존 CommonJS warning5), `git diff --check`, `check:pre-push` 모두 통과. 홈페이지 설명은 빌드 검사기의 동일 폭 함수로150/160, 나머지6개 변경된 체계 소개 설명도134~153/160. sitemap 생성1022URL·원장1개 갱신. check:fast 계획은critical이며, 가용 물리 메모리 약63MiB여서 전체 로컬 검사를 반복하지 않고 공식 CI 전체 lane으로 검증한다.
- 첫 복구 [PR CI39091146895](https://github.com/rei1237/codedestiny/actions/runs/39091146895): failure. Node3381개·Critical checks·Typecheck/lint는 통과했지만, 앞선 실패 뒤에 가려져 있던 `/ggulggul/` 메타 설명 폭169/160과 `verify:sukuyo-reading-house`의 이미지 배경 즉시 판정에서 실패했다. [AI Locale39091146847](https://github.com/rei1237/codedestiny/actions/runs/39091146847), [Secret Scan39091146863](https://github.com/rei1237/codedestiny/actions/runs/39091146863)은 success.
- 보안 브랜치로 돌아와 통합 전 재검증: Jest9suite254테스트 통과(request boundaries/payment body/AI buckets/OAuth/exp/payment context/webhook/replay/palm), worker-security-guards, security-hardening530소스, payment-freeze, guard-wiring 모두 통과. 보안 소스와 원격 후속 변경의 중복 수정은 없고 merge-tree는 생성 sitemap 원장에서만 충돌한다.
- 두 번째 복구: `2f1406d77`에서 공통 브랜드 문구의 ggulggul 설명을144/160으로 줄이고 sync:public·sitemap 생성기로 미러·원장을 갱신했다. 영냥이156/160, 생성 영어150·일본어136·중국어122·번체122/160도 확인했다. 공통 import로 원장 signature486개·lastmod 값5개가 바뀌었다(생성기 갱신 카운트6개). JSON 전후 비교로 확인했고 수동 편집하지 않았다.
- `9c139bc3c8dbe5ac6548a3811d93d15b3232ba6c`: 이미지 디코딩만 기다리던 읽기집 검사를 같은 투명 배경 조건까지 제한 시간 안에서 기다리도록 했다. 이미지 수 하한과 엄격한 색상 단언을 유지했다. 로컬 일반 검사4화면은 수정 전후 통과. CSS 적용을1.2초 지연시킨 mock은 기존 검사 실패/수정 검사 통과, 불투명 상태 고정 mock은 수정 검사도 timeout 실패. CI 실패의 정확한 브라우저 타이밍은 관측하지 못했으므로 실제 화면 결함을 확정하지 않는다.
- 두 커밋 모두 별도 검증 후 main에 push 완료. 변경 파일 lint exit0(기존 no-var warning1), check:pre-push 통과. SEO public inventory13/13, guide CTA19, JS graph296소스122참조, CSS mirror45/45 통과. 최신 [PR CI39092174340](https://github.com/rei1237/codedestiny/actions/runs/39092174340), [AI Locale39092174318](https://github.com/rei1237/codedestiny/actions/runs/39092174318), [Secret Scan39092174305](https://github.com/rei1237/codedestiny/actions/runs/39092174305)은 진행 중. 사용자가 지정한 선행조건이므로 성공 전에 보안 변경을 합치지 않는다.

### 복사할 재개 지시

```text
D:\Development\codedestiny-worktrees\security-audit-20261018-20261018-015620에서 D:\Development\codedestiny-worktrees\security-audit-20261018-20261018-015620\docs\handoff\2026-10-18-security-audit.md를 읽고, 재개 기준 774038cdf16995d4917dc7920064d7cb9ebc8633과 이후 문서 커밋을 확인하라. 먼저 git fetch origin main 후 정확한 원격 SHA의 CI required와 AI Locale Gate 복구 여부를 확인하라. 실패한 main 위로 push하지 않는다. green 이후 공유 main의 다른 변경86개를 보존하면서 sitemap 생성기 충돌 해결, 보안 통합 검사, check:pre-push, 안전한 main push를 진행하라.
```
