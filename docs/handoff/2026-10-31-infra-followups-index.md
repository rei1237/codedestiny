---
status: active
updated: 2026-10-31
next: "1순위 월정석 해금 경로 문서부터. 먼저 '현재 상태 확인' 세 줄을 돌려 push·스테이징 여부를 본다"
---

# 인프라·DB 최적화 후속 작업 색인 (2026-10-31)

본 작업: [2026-10-31-infra-db-optimization.md](2026-10-31-infra-db-optimization.md) (Task 0–13 진행표).
보고서 7종: [docs/infrastructure/](../infrastructure/).
이 문서는 그 브랜치에서 **고치지 않고 넘긴 것**을 다른 세션이 이어받도록 모은 것이다. SDD 원장은 git 무시 디렉터리라 곧 지워진다. 필요한 내용은 아래 문서들로 옮겼다.

## 우선순위

| 순위 | 문서 | 분류 | 왜 먼저인가 |
|---|---|---|---|
| 1 | [월정석 해금 경로: 차감 결과를 모르는 오류에도 권한을 지운다](2026-10-31-moonstone-unlock-entitlement-drop.md) | RED, 승인 필요 | 잔액은 빠졌는데 해금이 없는 상태가 생길 수 있다. 지시서 최우선 과제인 유료 결과 미전달이다. 환불 기록 행 삭제(전역 제약 위반)도 함께 걸려 있다 |
| 2 | [결제 확인된 서사형 의도가 24시간 TTL로 지워진다](2026-10-31-paid-intent-review-ttl.md) | RED, 승인 필요 | 검토 대기 의도가 운영자 처리 전에 사라질 수 있다. 수정 범위는 작다(`$unset` 1개 + 재등록 가드) |
| 3 | [작은 후속 묶음](2026-10-31-infra-small-followups.md) | 항목별 | 알림 소음·도구·스테이징 확인·문서 정밀도·DR·보안 잔여 |

1·2는 서로 독립이라 다른 세션이 동시에 맡아도 된다. 다만 둘 다 결제 경로라, 한 세션이 둘을 하면 커밋을 나눈다.

## 현재 상태 확인 (시작 전에)

2026-10-31 21:40 KST 기준:
- 본 작업 커밋은 `wt/infra-optimization-20261031-150228`에 있다. 배포용 cherry-pick 트리는 `wt/infra-deploy-20261031-190620`이다(origin/main `c110fc2f1` 위 46개, HEAD `2d56489bd`). 둘 다 **미push**다. push는 사용자 확인 대기다(아래 "이 세션이 못 끝낸 것" 2).
- 스테이징 릴리스는 `c110fc2f1`에서 다른 세션 커밋의 adsense-readiness 빌드 오류로 막혀 있었다(실패 런 41195463516, 41196675384, 41198056546). 21:35에 origin/main이 `1b262f31c`("fix: recover CI and separate SNULIFE review codes")로 움직였다. 그 스테이징 런 41201869815도 실패했다(21:42). adsense-readiness는 통과했지만 배포 전 고위험 mock 게이트의 `verify:phone-encryption`이 `/onboarding must stay removed`(`scripts/verify-phone-encryption.mjs:236`)로 멈췄다. `app/onboarding/page.tsx`는 다른 세션 커밋 `bea087f4c`가 되살렸고 `1b262f31c`도 그 파일을 고쳤다. 이 브랜치의 46개 커밋은 onboarding을 건드리지 않는다. **스테이징은 여전히 다른 세션 변경으로 막혀 있다.**

```bash
git fetch origin main && git log --oneline origin/main | grep -c "이용권 해금 CAS 패배\|cancel이 환불 기록을 되살리지"   # 2면 push됨, 0이면 미push
gh run list --branch main --limit 8 --json workflowName,conclusion,headSha --jq '.[] | "\(.workflowName) \(.conclusion) \(.headSha[0:9])"'   # "Release Cloudflare Pages and Worker"가 success인지
```

## 시작 브랜치

- 본 작업이 origin/main에 들어갔으면 `powershell -File scripts/create-safe-worktree.ps1 -Slug <slug>`(기본 `-Base origin/main`)로 시작한다.
- 아직이면 `-Base wt/infra-deploy-20261031-190620`으로 시작한다. 그 트리의 커밋을 기준으로 해야 Task 3·7 수정이 들어 있다.
- 공유 체크아웃 `D:\Development\code-destiny`에서는 작업하지 않는다(다른 세션 사용 중). 그곳에서 reset·stash·checkout --도 하지 않는다.

## 이어받는 제약

계획의 Global Constraints가 그대로 적용된다: [docs/superpowers/plans/2026-10-31-infra-db-optimization.md](../superpowers/plans/2026-10-31-infra-db-optimization.md) "Global Constraints". 특히 다음을 지킨다.

- 결제 기록·구매 결과·크레딧·월정석 기록은 자동 삭제하지 않는다. 고객에게 제공된 결과나 결제 내역을 삭제하거나 덮어쓰지 않는다.
- 운영 DB 쓰기·실결제·유료 LLM 실호출·환불·정산은 하지 않는다. 운영 읽기는 사용자에게 다시 확인받은 뒤 건수 위주로만 한다.
- 인덱스 생성·삭제, 클러스터 등급 변경, 접근망 전환, 백업 축소는 변경 계획과 명시적 승인 뒤에만 한다.
- 개인별 결과·결제 상태·잔액·인증 응답을 사용자 사이에 공유하는 캐시는 만들지 않는다.
- 측정하지 않은 성능·비용 수치는 쓰지 않는다. 운영에 배포하지 않았으면 "운영 미배포"라고 쓴다.

## 승인 필요 항목 현황

| # | 항목 | 상태 | 근거 문서 |
|---|---|---|---|
| 1 | 운영 인덱스 `users {referralCode:1}` 생성 | 미승인. `npm run verify:request-path-indexes` → 승인 → `npm run migrate:request-path-indexes`. 롤백은 이름으로 `dropIndex` | MONGODB-OPTIMIZATION "인덱스 생성 승인 항목" |
| 1b | 인덱스 drift 정리 | 미승인. `npm run migrate:reconcile-index-drift -- --check` → 승인 → `-- --apply --expect 7`. 결제 unique 인덱스 누락은 0건 | 같은 문서 "인덱스 드리프트 점검" |
| 2 | 월정석 해금 경로 수정(1순위), 서사형 의도 TTL 보존(2순위) | 미승인(RED). Task 3·7 승인과는 별개 | 위 두 문서 |
| 3 | DB 비밀번호 교체, 앱 사용자 최소 권한 | 미실행. 런북만 있다. 사용자가 Atlas UI에서 실행 | SECURITY-AUDIT 런북 1·2 |
| 4 | N-01 Capacitor 8.4.3 + Android 재출시, N-02 next | 범위 밖(lock 변경) | SECURITY-AUDIT |
| 5 | 비카드 미전달 자동 복원 | 채택하지 않음(6B 알림만) | 계획 사용자 결정 |
| 6 | Atlas 스냅샷 복원 시험(임시 클러스터 약 $0.096/시간), 로컬 mongod 복원 RTO 실측 | 미승인 | DISASTER-RECOVERY "승인 필요" |
| 7 | 등급 변경, DO 파일럿 | 제안하지 않음(M10 유지, DO 미도입). 최종 tail 수치로 확정 | COST-OPTIMIZATION, SERVER-PERFORMANCE |
| 8 | 운영 배포 | 미배포. 사용자의 1회성 명시 요청이 있을 때만 | DEPLOYMENT-REPORT |
| 8a | 스테이징 push(main) | 사용자 확인 대기. main push가 다음 운영 승격의 대상이 되기 때문이다 | DEPLOYMENT-REPORT "배포 경로" 2 |

## 사용자 조치

- Gemini 키 교체: 새 키 → `wrangler secret put`(스테이징 → 운영) → 스테이징 확인 → 구 키 폐기. 로컬 `.env.local`의 키도 교체 대상이다.
- 스테이징 `WORKER_ROUTE_METRICS_TOKEN` 설정: `npx wrangler secret put WORKER_ROUTE_METRICS_TOKEN --config worker/wrangler.staging.toml`. 운영에는 이미 있다.
- DB 비밀번호 교체·권한 축소(승인 항목 3).
- Atlas 읽기 전용 API 키 삭제: 측정이 끝나면 Atlas Organization Access Manager에서 키를 지운다. 사용자 환경변수 `ATLAS_PUBLIC_KEY`·`ATLAS_PRIVATE_KEY`·`ATLAS_ORG_ID`·`ATLAS_GROUP_ID`도 지운다.
- DR 리허설 덤프(`D:\Development\code-destiny-backups\mongodb\`, 개인정보 포함) 보관 기간 결정.

## 다른 세션 소유의 origin/main 사전 실패

이 브랜치 탓이 아니다. merge-base에서도 같은 목록으로 실패한다(`check:fast --base` 비교). 고치지 말고, 이 실패를 내 회귀로 오인하지 않는다. `1b262f31c`가 일부를 고쳤을 수 있으니 다시 확인한다.

- `npm test`의 Playwright 2건(daily tarot, hat story), `shell-dictionary-parity`
- `verify:payment-copy-dictionary`
- `verify:i18n-price-drift`(`auth.guestMoonstoneTeaser`)
- 릴리스 워크플로의 adsense-readiness(`out/onboarding` description). `1b262f31c`에서 풀렸다
- `verify:phone-encryption`(`/onboarding must stay removed`). `app/onboarding`이 있는 한 실패한다. 스테이징 배포의 고위험 mock 게이트가 이 검사를 돌린다. 21:38의 `check:payment`는 이 검사를 고르지 않았다. 단독 실행하면 배포 트리에서도 EXIT=1이다
- content-unlocks 크론 커버리지

## 이 세션이 못 끝낸 것 (세션이 끊기면 이어받기)

진행표 [2026-10-31-infra-db-optimization.md](2026-10-31-infra-db-optimization.md)의 Task 2·12·13 행이 기준이다. 행이 "완료"로 바뀌었으면 아래는 끝난 것이다.

1. **최종 tail 수치**(2026-11-01 00:40 KST 뒤). 읽기 전용 tail 루프가 `D:\Development\code-destiny-backups\tail\seg-20261031-163557.jsonl`에 기록 중이다. 루프는 다시 띄우지 않는다.
   - `cat D:/Development/code-destiny-backups/tail/20261031-1506.jsonl D:/Development/code-destiny-backups/tail/20261031-1529.jsonl D:/Development/code-destiny-backups/tail/seg-*.jsonl > <스크래치>/tail-all.jsonl`
   - `npm run -s report:worker-tail-latency -- <스크래치>/tail-all.jsonl --all`
   - 결과로 [작은 후속 묶음](2026-10-31-infra-small-followups.md) E절의 중간 수치를 바꾸고, Task 9 판정(DO 미도입, 결제 레인 유지, M10 유지)을 최종으로 확정한다. 판정 규칙은 SERVER-PERFORMANCE·COST-OPTIMIZATION에 있다. 수치가 규칙의 문턱을 넘으면 판정을 바꾸고 이유를 적는다.
   - tail 파일에는 IP·헤더가 있다. 저장소에 넣지 않는다.
2. **스테이징 push**: **먼저 사용자 확인을 받는다.** 운영 승격(`mode=production`)은 main HEAD(`github.sha`)를 배포한다(`.github/workflows/cloudflare-pages-deploy.yml:14`, `:265`). push한 뒤 어느 세션이든 운영 승격을 누르면 Task 3·7의 RED 변경이 스테이징 확인 없이 운영으로 나간다. RED 승인 범위는 "스테이징까지"다. 확인을 받으면 배포 트리를 최신 origin/main 위로 다시 cherry-pick한다(내 커밋만, 공유 main에 남의 미push 커밋을 섞지 않음). 21:35의 `1b262f31c`와 46개 커밋이 함께 바꾼 파일은 0개다. `npm run check:fast -- --base=origin/main`이 사전 실패 외에 새 실패가 없음을 확인한다. 그 뒤 push(= 스테이징 배포) → CI required 확인 → `npm run verify:staging` → [작은 후속 묶음](2026-10-31-infra-small-followups.md) C1. 스테이징이 여전히 막혀 있으면 push하지 않고 "스테이징 미배포(빌드 차단)"로 적는다.
3. ~~DEPLOYMENT-REPORT "검증 결과" 채우기~~ → 2026-10-31 22시에 채웠다. `check:payment`는 ok 87 / FAIL 3이고, 실패 3건은 위 사전 실패와 같다. `verify:worker-size`와 `verify:mongo-query-index-shapes`는 EXIT=0이다. push 전에 최신 origin/main 위에서 다시 돌리면 그 결과로 표를 갱신한다.
4. **작업 트리 정리**(모든 커밋이 origin/main에 들어간 뒤): `(Get-Item <트리>\node_modules -Force).Delete()`로 정션만 지운 뒤 `git worktree remove --force <트리>`. 정션을 먼저 지우지 않으면 공유 node_modules가 지워진다.
