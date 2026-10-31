---
status: active
updated: 2026-11-01
next: "0순위 DB 연결 장애 문서부터(다음 저녁 피크 전에 읽기 전용 분 단위 표본 준비). 그다음 1순위 월정석 해금 경로. 먼저 '현재 상태 확인' 명령으로 push·스테이징 여부를 본다"
---

# 인프라·DB 최적화 후속 작업 색인 (2026-10-31)

본 작업: [2026-10-31-infra-db-optimization.md](2026-10-31-infra-db-optimization.md) (Task 0–13 진행표).
보고서 7종: [docs/infrastructure/](../infrastructure/).
이 문서는 그 브랜치에서 **고치지 않고 넘긴 것**을 다른 세션이 이어받도록 모은 것이다. SDD 원장은 git 무시 디렉터리라 곧 지워진다. 필요한 내용은 아래 문서들로 옮겼다.

## 우선순위

| 순위 | 문서 | 분류 | 왜 먼저인가 |
|---|---|---|---|
| 0 | [DB 연결 생성률 장애(P1) 후속: 저녁 피크에 새 연결이 막혀 503이 난다](2026-11-01-db-connection-rate-limit-outage.md) | 측정은 읽기 전용, 코드는 RED 승인 필요 | 2026-10-31 21:59~22:10에 503이 30.9%였고 유료 결과 조회 28건도 막혔다. 같은 연결 코드가 지금 운영에서 돈다. 다음 피크에 다시 날 수 있고 지금 경보로는 안 보인다 |
| 1 | [월정석 해금 경로: 차감 결과를 모르는 오류에도 권한을 지운다](2026-10-31-moonstone-unlock-entitlement-drop.md) | RED, 승인 필요 | 잔액은 빠졌는데 해금이 없는 상태가 생길 수 있다. 지시서 최우선 과제인 유료 결과 미전달이다. 환불 기록 행 삭제(전역 제약 위반)도 함께 걸려 있다 |
| 2 | [결제 확인된 서사형 의도가 24시간 TTL로 지워진다](2026-10-31-paid-intent-review-ttl.md) | RED, 승인 필요 | 검토 대기 의도가 운영자 처리 전에 사라질 수 있다. 수정 범위는 작다(`$unset` 1개 + 재등록 가드) |
| 3 | [작은 후속 묶음](2026-10-31-infra-small-followups.md) | 항목별 | 알림 소음·도구·스테이징 확인·문서 정밀도·DR·보안 잔여 |

0·1·2는 서로 독립이라 다른 세션이 동시에 맡아도 된다. 0은 측정부터라 코드 충돌이 없다. 1·2는 둘 다 결제 경로라, 한 세션이 둘을 하면 커밋을 나눈다.

## 현재 상태 확인 (시작 전에)

2026-11-01 01시 KST 기준:
- 본 작업 커밋은 `wt/infra-optimization-20261031-150228`에 있다. 배포용 cherry-pick 트리는 `wt/infra-deploy-20261031-190620`이다(origin/main `c110fc2f1` 위). 문서 커밋이 더해질 때마다 개수와 HEAD가 바뀐다. 문서 속 "46개"·"48개"는 그 시점 값이다. 지금 목록은 `git log --oneline c110fc2f1..wt/infra-deploy-20261031-190620`로 본다. 둘 다 **미push**다. push는 사용자 확인 대기다(아래 "이 세션이 못 끝낸 것" 2).
- origin/main은 `4d58f3dc5`다. `c110fc2f1` 뒤로 다른 세션 커밋 6개(`1b262f31c`~`4d58f3dc5`, 48파일)가 올라갔고, 이 브랜치와 함께 바꾼 파일은 0개다. 스테이징을 막던 두 문제는 풀렸다. adsense-readiness(실패 런 41195463516, 41196675384, 41198056546)는 `1b262f31c`에서, `verify:phone-encryption`(`/onboarding must stay removed`, 실패 런 41201869815)은 `app/onboarding/page.tsx`를 다시 뺀 `90b7f7875`에서 풀렸다. `4d58f3dc5`의 스테이징 런 41210005340이 성공했다.
- 운영은 다른 세션이 올린 `4d58f3dc5`다(운영 릴리스 런 41213033014, Worker 교체 11-01 00:20:29 KST). 이 브랜치는 들어 있지 않다. 10-31 P1 장애를 낸 연결 코드(`worker/lib/db.js`, `worker/wrangler.toml`)는 그 뒤로 바뀌지 않았다([0순위 문서](2026-11-01-db-connection-rate-limit-outage.md)).

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
| 7 | 등급 변경, DO 파일럿 | M10 유지·DO 미도입 확정(최종 tail). 다운그레이드는 P1 장애로 더 위험해졌다. M30 승격은 검토 대상이지만 원인 확정 전에는 하지 않는다(M30 가격 미측정) | COST-OPTIMIZATION, SERVER-PERFORMANCE, [장애 후속](2026-11-01-db-connection-rate-limit-outage.md) |
| 8 | 운영 배포 | 미배포. 사용자의 1회성 명시 요청이 있을 때만 | DEPLOYMENT-REPORT |
| 8a | 스테이징 push(main) | 사용자 확인 대기. main push가 다음 운영 승격의 대상이 되기 때문이다 | DEPLOYMENT-REPORT "배포 경로" 2 |
| 10 | P1 장애 대응 코드 변경(연결 실패 차단기·재시도 축소, 요청당 연결 수 축소, 연결 실패·503 비율 경보) | 미승인 RED. 결제·로그인 경로에 닿는다 | [장애 후속](2026-11-01-db-connection-rate-limit-outage.md), INFRASTRUCTURE-AUDIT 승인 10 |

## 사용자 조치

- Gemini 키 교체: 새 키 → `wrangler secret put`(스테이징 → 운영) → 스테이징 확인 → 구 키 폐기. 로컬 `.env.local`의 키도 교체 대상이다.
- 스테이징 `WORKER_ROUTE_METRICS_TOKEN` 설정: `npx wrangler secret put WORKER_ROUTE_METRICS_TOKEN --config worker/wrangler.staging.toml`. 운영에는 이미 있다.
- DB 비밀번호 교체·권한 축소(승인 항목 3).
- 고아 tail 프로세스 종료: 아래 "이 세션이 못 끝낸 것" 1.
- Atlas 읽기 전용 API 키 삭제: 측정이 끝나면(0순위 장애 문서의 1단계에서 Atlas 분 단위 지표를 쓰면 그 뒤에) Atlas Organization Access Manager에서 키를 지운다. 사용자 환경변수 `ATLAS_PUBLIC_KEY`·`ATLAS_PRIVATE_KEY`·`ATLAS_ORG_ID`·`ATLAS_GROUP_ID`도 지운다.
- DR 리허설 덤프(`D:\Development\code-destiny-backups\mongodb\`, 개인정보 포함) 보관 기간 결정.

## 다른 세션 소유의 origin/main 사전 실패

이 브랜치 탓이 아니다. merge-base에서도 같은 목록으로 실패한다(`check:fast --base` 비교). 고치지 말고, 이 실패를 내 회귀로 오인하지 않는다. `1b262f31c`~`4d58f3dc5`가 일부를 고쳤을 수 있으니 다시 확인한다.

- `npm test`의 Playwright 2건(daily tarot, hat story), `shell-dictionary-parity`
- `verify:payment-copy-dictionary`
- `verify:i18n-price-drift`(`auth.guestMoonstoneTeaser`)
- 릴리스 워크플로의 adsense-readiness(`out/onboarding` description). `1b262f31c`에서 풀렸다
- `verify:phone-encryption`(`/onboarding must stay removed`). `90b7f7875`가 `app/onboarding/page.tsx`를 다시 빼서 풀렸다(스테이징 런 41210005340 성공). `c110fc2f1` 기준인 배포 트리에서는 단독 실행하면 아직 EXIT=1이다. 배포 트리를 최신 origin/main 위로 다시 올린 뒤 단독 실행으로 다시 확인한다
- content-unlocks 크론 커버리지

## 이 세션이 못 끝낸 것 (세션이 끊기면 이어받기)

진행표 [2026-10-31-infra-db-optimization.md](2026-10-31-infra-db-optimization.md)의 Task 2·12·13 행이 기준이다. 행이 "완료"로 바뀌었으면 아래는 끝난 것이다.

1. ~~최종 tail 수치~~ → 2026-11-01에 끝냈다(T-FINAL, SERVER-PERFORMANCE "최종 tail 실측 표"). Task 9 판정도 확정했다(DO 미도입, 결제 레인 유지, M10 유지).
   - 읽기 전용 tail 루프의 고아 프로세스가 아직 떠 있다: bash 26836·24656, cmd 37944, node 12124·21600·16420(10-31 22:06:59~22:07:01 시작). eventTimestamp 13:36:22Z(22:36:22 KST) 뒤로는 아무것도 기록하지 않는다. 자동 모드가 종료를 거부했으므로 **사용자가 끈다.** PID는 재사용되니 먼저 `Get-Process -Id 26836,24656,37944,12124,21600,16420 | Select-Object Id,ProcessName,StartTime`으로 시작 시각을 확인한 뒤 `Stop-Process -Id 26836,24656,37944,12124,21600,16420` 또는 작업 관리자로 끈다.
   - 중복 세그먼트: `seg-20261031-220659.jsonl`(909 이벤트)과 `seg-20261031-220705.jsonl`(906)은 eventTimestamp 범위가 같고(07:36:14Z~13:36:22Z) 키 880개가 겹친다. T-FINAL은 220705만 썼다. 지우지 않았다.
   - tail 파일에는 IP·헤더가 있다. 저장소에 넣지 않는다.
2. **스테이징 push**: **먼저 사용자 확인을 받는다.** 운영 승격(`mode=production`)은 main HEAD(`github.sha`)를 배포한다(`.github/workflows/cloudflare-pages-deploy.yml:14`, `:265`). push한 뒤 어느 세션이든 운영 승격을 누르면 Task 3·7의 RED 변경이 스테이징 확인 없이 운영으로 나간다. RED 승인 범위는 "스테이징까지"다. 확인을 받으면 배포 트리를 최신 origin/main 위로 다시 cherry-pick한다(내 커밋만, 공유 main에 남의 미push 커밋을 섞지 않음). origin/main은 2026-11-01 01시 기준 `4d58f3dc5`이고, `c110fc2f1` 뒤 다른 세션 커밋 6개와 이 브랜치가 함께 바꾼 파일은 0개다. `npm run check:fast -- --base=origin/main`이 사전 실패 외에 새 실패가 없음을 확인한다. 그 뒤 push(= 스테이징 배포) → CI required 확인 → `npm run verify:staging` → [작은 후속 묶음](2026-10-31-infra-small-followups.md) C1. upstream 차단은 `90b7f7875`로 풀렸다(스테이징 런 41210005340 성공). 다시 막혀 있으면 push하지 않고 "스테이징 미배포(빌드 차단)"로 적는다.
3. ~~DEPLOYMENT-REPORT "검증 결과" 채우기~~ → 2026-10-31 22시에 채웠다. `check:payment`는 ok 87 / FAIL 3이고, 실패 3건은 위 사전 실패와 같다. `verify:worker-size`와 `verify:mongo-query-index-shapes`는 EXIT=0이다. push 전에 최신 origin/main 위에서 다시 돌리면 그 결과로 표를 갱신한다.
4. **작업 트리 정리**(모든 커밋이 origin/main에 들어간 뒤): `(Get-Item <트리>\node_modules -Force).Delete()`로 정션만 지운 뒤 `git worktree remove --force <트리>`. 정션을 먼저 지우지 않으면 공유 node_modules가 지워진다.
