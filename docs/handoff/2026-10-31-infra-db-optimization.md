# 인수인계 — 서버·MongoDB 종합 최적화 (2026-10-31)

계획: [docs/superpowers/plans/2026-10-31-infra-db-optimization.md](../superpowers/plans/2026-10-31-infra-db-optimization.md)
작업 트리: `D:\Development\codedestiny-worktrees\infra-optimization-20261031-150228` (브랜치 `wt/infra-optimization-20261031-150228`, 기준 origin/main `f4c5458a0`)
실행 방식: superpowers:subagent-driven-development. 진행 원장은 작업 트리의 `.superpowers/sdd/2026-10-31-infra-db-optimization/progress.md`(git 무시)다. 원장과 `git log`를 기억보다 먼저 믿는다.

## 사용자 결정 (2026-10-31)

- 운영 측정은 읽기 전용 전부 허용: tail(D 드라이브 보관), 공개 GET, Atlas Admin GET, 운영 DB 인덱스 dry-run, 소수 explain. 운영 DB 쓰기·실결제·유료 LLM 0회.
- Atlas 접근망은 0.0.0.0/0 유지 + 보완 통제(런북만 작성, 실행은 사용자가 Atlas UI에서).
- 보안 브랜치는 코드 4건(W-1 `32bffac56`, W-6 `33caf2935`, W-10 `362459e30`, E-1 `b88008c24`)만 반영. N-01·N-02는 이번 범위 밖.
- RED 결제 변경 Task 3·Task 7은 스테이징까지 승인. 비카드 자동 복원은 채택하지 않음(Task 6B 알림만).

## 진행 상태

| Task | 상태 | 커밋 | 비고 |
|---|---|---|---|
| 0 작업 트리 | 완료 | (이 문서 커밋) | `npm ci` 생략: 스크립트가 node_modules를 공유 체크아웃으로 정션 연결함. 기준 `check:fast` EXIT=0 |
| 1 Atlas 스냅샷 도구 | 완료(실측 대기) | a452d553b, fa5156d3b | 리뷰 통과. 실측은 사용자 API 키(ATLAS_PUBLIC_KEY·ATLAS_PRIVATE_KEY·ATLAS_ORG_ID·ATLAS_GROUP_ID) 설정 뒤 `npm run audit:atlas-readonly` |
| 2 tail DB 연결 집계 | 완료(피크 실측 대기) | 02441bcac | 리뷰 통과. 중간 실측: fetch shared 연결 p50 119ms/p95 268ms, 크론(*/10) 연결 p50 1764ms(배치 밖 실행). 피크 포함 전체 리포트는 9시간 tail(~00:29 KST) 뒤 |
| 3 R3·F3 | 완료 | 4de80b27c | RED 승인됨. 리뷰 Approved(Minor 3). 환불·취소 기록에 cancel → 상태 불변(CAS), 세 라우트가 generation_failed를 재시도 증빙으로 인정 → apply 경로(billing.js:2479 revoked 403, CAS $nin refunded/cancelled)로 completed 전이 확인. check:payment 잔여는 기존 shell-dictionary-parity 1건 |
| 4 L1 | 완료 | 238ec6554 | 리뷰 Approved(Minor 2). LLM in-flight dedup을 currentDbScopeId() 요청 스코프로 한정, 스코프 없으면 공유 안 함. node:test 18/18, jest llm 116/116 |
| 5 C5 | 완료 | 7a40ea881 | 리뷰 Approved(Minor 3). 10분 크론 18개 태스크 실패를 태스크별 시간당 1회 운영자 알림(IdempotencyKey cron10-failure-alert, DB 장애 시 isolate 메모로 억제하고 발송). test:node UI 14건은 origin/main 사전 실패(셸↔ko.json 3키 등) |
| 6 R1·R2 | 완료 | c322f998f | 리뷰 Approved(리뷰 전 보완 + 수정 1라운드, Minor 4 이월). 6A 자동환불 소진(refund_failed) 알림 섹션 C, 6B 비카드 초융합·서사형·자미두수 검토 대기 알림(10분 크론, 알림만·자동 복원 없음). 표식은 전달 성공 뒤 CAS, 상위 객체 null 문서도 표식. 인덱스 생성 없음(Fusion 조회 1건 allowlist) |
| 7 P4 | 완료 | 927b56623 | RED 승인됨(스테이징까지). 리뷰 Approved(plan-mandated Important 1 수정 1라운드, Minor 5 이월). unlock 분기 grant→consume→unlock→evidence 단일 트랜잭션, CAS 패배는 sentinel abort로 신규 지급·REFUNDED 복원 함께 롤백(행 삭제 없음), 마커 재생 분기 증빙 보강. 레플리카셋 동시성은 스테이징 확인 항목. 후속: 월정석 해금 경로(/coin-gate/moonstone)의 같은 drop 문제 |
| 8 쿼리 핫스팟 | 완료 | 30ef0c7ac | 리뷰 Approved(Minor 4 이월). access 백필 증빙 결제 조회 최대 20회 → `$in` 1회(우선순위 유지), insights 목록 집계 withMongoRetry(캐시는 넣지 않음 — insight-public-cache.js:26-27 기존 결정, 실측 ≈5회/시간), ops-hq XP `$group` 1회·남은 업적만 판정(원장 105행, 증가 상한 목적), drift TTL 예외 + self-test 22건. Step 3 운영 인덱스 `users{referralCode}`는 승인 항목으로 미실행 |
| 9 측정 판정 | Task 12에 합침 | | 코드 변경 없음. DO·결제 레인·SECURITY_DB_TIMEOUT·M10 판정은 SERVER-PERFORMANCE.md·COST-OPTIMIZATION.md에 피크 포함 전체 tail 수치로 기록 |
| 10 보안 | 완료 | 014703a08 | 리뷰 Approved(Minor 5 이월). 10A 보안 커밋 4건 `-x` cherry-pick(W-1 83c7e699a, W-6 9872dd9a8, W-10 4aef96200, E-1 4aedaf1a8) + CORS 단언(`https://localhost` 앱 출처 유지), 10B 구독 POST IP 5/시간·이메일 3/일(실측 7일 POST 0건), 10C compass 전역 300/일(실측 D=1). 10D·10E·10F는 문서라 Task 12에서. 스테이징 route-metrics는 토큰 미설정으로 닫힘(사용자 조치) |
| 11 DR | 완료 | 89bb3cd1a | Task 12 문서와 한 커밋. 오프라인 리허설(덤프·검증)만 실측, 복원 단계 RTO는 미측정(로컬 mongod 실행이 권한 분류기에서 거부됨). Atlas 스냅샷 복원 시험은 승인 항목 |
| 12 문서 7종 | 완료(최종 tail 수치 대기) | 89bb3cd1a, da47f58b1 | 리뷰 Needs fixes → 수정 1라운드(ICN 비율 원본 재계산 일별 0.02~44%, Atlas 연결 제한 공식 문서 출처, 판정 라벨) → 재리뷰 전부 ADDRESSED. Minor 7 이월. tail 표·Task 9 판정은 "중간 판정(피크 미포함)", 00:40 뒤 최종 수치로 교체 |
| 13 검증·스테이징 | 진행 중(미push) | | 최종 리뷰 With fixes → fix wave(`da47f58b1..f947073ef`) → 재리뷰 ADDRESSED, 신규 Important(TTL)는 주석 정정 `25729b770` + 후속 문서. 배포 트리 `D:\Development\codedestiny-worktrees\infra-deploy-20261031-190620`(origin/main `c110fc2f1` 위 46개 cherry-pick, HEAD `2d56489bd`). `check:fast --base=origin/main` EXIT=1이지만 남은 3건은 merge-base와 ✖ 목록 동일, jest 452/7,360 통과. `verify:worker-size`·`verify:mongo-query-index-shapes` EXIT=0. `check:payment` ok 87 / FAIL 3(사전 실패와 같음). 스테이징 릴리스는 `c110fc2f1`에서 adsense-readiness로, `1b262f31c`(런 41201869815)에서 고위험 mock 게이트의 `verify:phone-encryption`(`/onboarding must stay removed`)으로 막혔다. 둘 다 다른 세션 변경 때문이다. push는 사용자 확인 대기: 운영 승격이 main HEAD를 배포하므로 push하면 RED 변경이 다음 운영 승격에 실린다(DEPLOYMENT-REPORT "배포 경로" 2). 운영 미배포, 요청 시에만 |

## 실측 파일 위치 (리포 밖, 커밋 금지)

- Atlas 스냅샷: `D:\Development\code-destiny-backups\atlas-snapshots\<stamp>\`
- wrangler tail: `D:\Development\code-destiny-backups\tail\<stamp>.jsonl`
- Mongo 덤프: `D:\Development\code-destiny-backups\mongodb\<stamp>\`

## 다음 세션이 할 일

후속 작업은 색인 [2026-10-31-infra-followups-index.md](2026-10-31-infra-followups-index.md)에서 시작한다. 이 브랜치의 남은 마무리(최종 tail 수치, 스테이징 push, 검증 결과 기록, 작업 트리 정리)는 그 문서 "이 세션이 못 끝낸 것"에 있다.

1. [월정석 해금 경로 권한 삭제](2026-10-31-moonstone-unlock-entitlement-drop.md): RED, 1순위.
2. [서사형 의도 검토 대기의 TTL 삭제](2026-10-31-paid-intent-review-ttl.md): RED, 2순위.
3. [작은 후속 묶음](2026-10-31-infra-small-followups.md): 알림·도구·스테이징 확인·문서·DR·보안 잔여.

승인 필요 항목은 자동 실행하지 않는다(색인 문서 "승인 필요 항목 현황").
