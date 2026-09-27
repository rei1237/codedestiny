---
status: done
updated: 2026-09-28
next: "완료. 1·2절 측정 결과 크론 LLM 호출 0(실측). 첫 18키 결제가 생기면 1절 집계만 다시 돌린다. 나머지 3단계는 상위 문서 next를 따른다(착수 전 우선순위 확인)."
---

# 유료 결과 크론 LLM 호출 계측 — 3단계 이어받기

상위 작업 문서는 [2026-09-27-paid-delivery-reliability](2026-09-27-paid-delivery-reliability.md)다. 승인·금지 경계(실결제·과금 LLM은 시험표 승인 후, 운영 DB 쓰기 금지)는 그 문서를 따른다. 이 문서는 3단계 중 **크론 호출 수·비용 측정**만 떼어 낸 것이다.

## 현재 상태 (기준 `01dbf1fb3`, main CI·필수 PR CI 성공)

- `f0182a579`: 서버 이어생성(`resumePaidNarrativeOnServer`)의 공급자 호출이 `[llm token_usage]` 로그에 `generationSource: server_initial|server_repair|server_recovery`로 찍힌다. 전에는 브라우저 재시도와 같은 라벨이라 크론 비용을 로그로도 분리할 수 없었다. `lib/payment/llm-cost-report.mjs`는 `server_repair/server_recovery`를 재시도 비용으로 센다.
- **프로덕션 승격 실행(사용자 1회 승인, 2026-09-27):** `01dbf1fb3`(`f0182a579` 포함)을 [run 36313466265](https://github.com/rei1237/codedestiny/actions/runs/36313466265)로 dispatch 했다. 직전에 origin/main = `01dbf1fb3`·PR CI 성공(run 36312871011)을 확인했고 런 headSha 도 일치했다. 저장소 규칙대로 런을 폴링하지 않았다 — **런 결과와 Pages `/version.json`·Worker `/api/version` 일치는 다음 세션이 먼저 확인한다**(실패면 릴리스 잡이 양쪽을 자동 롤백하므로 `server_*` 로그 측정 전제도 무너진다).
- 1A·1B 크론은 `9d2b30b8c` 승격(2026-09-27T05:06:19Z 커밋, run 36296950632)부터 프로덕션에서 돈다.
- 운영 DB 읽기 전용 집계는 이전 세션에서 자동 모드 분류기(`Production Reads`)가 거부했다. 사용자가 허용하겠다고 했으나, 승격을 요청받은 세션에서 다시 시도한 실행도 분류기가 거부했다(허용 규칙이 아직 없음). 다음 세션은 사용자가 Bash 허용 규칙을 넣었는지 확인한 뒤 실행하고, 또 거부되면 우회하지 말고 보고한다.

## 1. 크론 호출 수 — 운영 DB 읽기 전용 집계 (다음 세션 첫 작업)

```powershell
node scripts/report-paid-narrative-cron-calls.mjs --db code_destiny
# 기본 --since 2026-09-27T05:06:19Z (1A·1B 승격). 넓히려면 --since 2026-09-01T00:00:00Z
```

- 무엇을 재나: `metadata.paidNarrative`가 있는 실행(엔진 18키)의 항목별 `attempts` 합 = 공급자 호출 수(브라우저+크론 합계 상한). `cronProven`은 1B 크론이 결제를 증명해 만든 실행(`metadata.paidNarrativeProof`), `recoveryCode`·`reviewRequired`는 1A 크론의 백오프·검토 표시(엔진이 저장마다 비우므로 완료된 건에는 남지 않는다). `awaiting_payment` 의도 수도 함께 낸다.
- 안전: HTTP 차단, 쓰기 없음, 본문·userId 미출력(featureKey·상태·수·시각만). `scripts/report-paid-delivery-health.mjs`와 같은 방식.
- 검증 범위(실측): 스테이징 `code_destiny_staging`에서 exit 0, 대상 0건. **행이 있을 때의 합산 경로는 아직 실데이터로 확인하지 않았다.**
- 예상(추정): 09-01~09-27 이 18키 결제가 0건이었으므로 호출 0일 가능성이 높다. 0이 아니면 `executions` 행별로 `cronProven`·시각을 보고 크론 몫을 가른다. 브라우저·크론 분리의 확정은 `server_*` 로그로만 된다.
- 결과를 이 절에 수치로 적는다(실측/추정 구분, 0을 미측정으로 대체하지 않는다).

### 결과 (실측, 2026-09-28 세션, 운영 `code_destiny` 읽기 전용)

- 승격 확인: run 36313466265 성공(release 성공·rollback 스킵). 그 뒤 다른 세션의 dispatch run 36329155957(`cdc226c77`)도 성공. 운영 Pages `/version.json`·Worker `/api/version` 모두 `01dbf1fb3`(f0182a579 포함) — 한 번 읽음, 폴링 없음.
- 기본 구간(`--since 2026-09-27T05:06:19Z`, until 2026-09-27T16:20Z): executions 0 · callsUpperBound 0 · cronProvenExecutions 0 · awaiting_payment 의도 0.
- 넓힌 구간(`--since 2026-09-01T00:00:00Z`): 위와 같이 전부 0.
- 0의 근거 확인: 같은 컬렉션(`ServiceExecutionTransaction`)의 전 기간 추정 행 수 3, 09-01 이후 생성 행 0(featureKey 무관). 즉 조회 대상이 틀린 것이 아니라 **09-01 이후 운영에 결제 실행 자체가 없다.**
- 결론: 1A·1B 크론의 과금 LLM 호출 수는 승격 이후 **0(실측 상한)**. 1B 의도 승격 대상도 0이다. 행이 있을 때의 합산 경로는 여전히 실데이터로 미확인.

### 코드 상한 (상수 계산, 실측 아님)

서버 경로도 항목당 3회(`attempts < 3`)를 브라우저와 공유한다 → 주문당 크론 호출 ≤ `3 × 항목 수 − 브라우저 사용분`. 호출당 출력 상한 9,500토큰(`capTokens`). 틱당 실행 3건·작업 240초·파 65초·파당 4호출(`paid-narrative-recovery-task.js:11`), 의도 승격 틱당 20건(`paid-narrative-intent.js:20`). 크론은 주문당 새 예산을 만들지 않는다.

## 2. 크론 토큰·비용 — `server_*` 로그 (승격 뒤)

- `f0182a579` 이후 SHA가 프로덕션에 올라간 뒤에만 가능하다. 저장소에 Workers Logs 조회 도구는 없다 — `npx wrangler tail --format json > llm.log`(main 체크아웃에서) 또는 대시보드 내보내기 뒤 `node scripts/report-llm-token-usage.mjs llm.log --json`.
- 틱 요약은 `[paid-narrative-recovery]`(scanned·outcomes)와 `[paid-narrative-intent]`(expired·scanned·outcomes) 두 줄이다. 둘 다 executionKey·featureKey·결과 코드만 싣는다.
- 2026-09-28 판단: 전제(`01dbf1fb3` 운영 반영)는 충족됐지만, 1절대로 대상 실행·의도가 0이라 크론이 공급자를 부를 입력이 없다 → 크론 토큰·비용 = 0(DB 근거 추론, 로그 실측 아님). `wrangler tail`은 과거 로그를 못 읽으므로 지금 돌려도 0 확인 외 정보가 없다. **첫 18키 결제가 생긴 뒤** 1절 집계를 다시 돌리고, 0이 아니면 그때 tail/대시보드 내보내기로 `server_*` 몫을 가른다.

## 3. 나머지 3단계 계측 (상위 문서 3절)

로그인→세션→주문 준비→PG 표시→승인→확정→작업 등록→첫/최종 저장→보관함의 주문 상관관계 계측, 7일 p50·p95 분리, 주문 단위 모델별 비용 합산. 입력: 상위 문서 2절의 서버 이어생성 없는 LLM 24키(`node scripts/report-paid-delivery-inventory.mjs` 출력의 `llmWithoutServerRecovery`)와 2절·5절 범위 밖 발견. 길이 품질 인수인계(`2026-09-27-llm-length-never-fatal.md`)와 겹치는 구현을 먼저 확인한다.

## 주의

- main 체크아웃을 다른 세션(영냥이·마케팅 파일)이 동시에 쓰고 있었다. reset·stash·일괄 add 금지, 자기 파일만 경로로 stage 한다. `check:fast`는 커밋 뒤 `--committed-head`로 돌리면 옆 세션 미커밋 파일이 섞이지 않는다.
- 실 PG·과금 LLM·운영 DB 쓰기 0회 유지. 프로덕션 승격은 별도 1회 승인.
