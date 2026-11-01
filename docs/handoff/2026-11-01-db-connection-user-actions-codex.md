---
status: active
updated: 2026-11-01
next: "오늘 20:45 KST에 P1a를 Codex에 붙여 넣는다 → 23:15 뒤 P1b → 결과에 따라 P5"
---

# P1 장애 후속: 사용자 조치를 Codex로 하는 프롬프트

본문: [2026-11-01-db-connection-rate-limit-outage.md](2026-11-01-db-connection-rate-limit-outage.md) · 색인: [2026-10-31-infra-followups-index.md](2026-10-31-infra-followups-index.md)

이 문서의 프롬프트는 순서대로 Codex에 붙여 넣는다. 프롬프트마다 맨 위에 **공통 머리말**을 함께 붙인다. 사람 손이 꼭 필요한 일(키 삭제, Atlas UI 클릭, push 승인)은 각 표의 "사용자 몫"에 적었다.

| # | 언제 (KST) | Codex가 하는 일 | 사용자 몫 |
|---|---|---|---|
| P1a | 오늘 20:45 | 측정 준비 점검(dry-run) → 20:50~23:10 측정을 백그라운드로 시작 | 노트북을 켜 두고 절전 끄기, wrangler 로그인 상태 유지 |
| P1b | 23:15 이후 | 종료·PID 정리 확인 → 판정 → 문서 2개에 결과 기록 → 문서만 커밋 | 없음 |
| P2 | P1b 뒤 아무 때 | Atlas 기존 경보 설정을 읽기 전용으로 GET → 런북 3과 대조 → UI 클릭 목록 작성 | Atlas UI에서 경보 생성 |
| P3 | 아무 때 | M30 단가를 출처와 함께 기록(추정 금액 금지) | 청구서 화면 로그인이 필요하면 직접 확인 |
| P4 | P1b·P2·P3 뒤 | 사용자 환경변수 `ATLAS_*` 4개 삭제·확인 | Org Access Manager에서 읽기 전용 API 키 삭제 |
| P5 | P1b 판정 뒤 | 차단기 커밋 push 판단 자료 정리(실행하지 않음) | 승인 10 push, 승인 7(M30) 결정 |

## 공통 머리말 (모든 프롬프트 앞에 붙인다)

```text
[공통 규칙 — 반드시 지킨다]
- 작업 디렉터리: D:\Development\codedestiny-worktrees\infra-deploy-20261031-190620 (브랜치 wt/infra-deploy-20261031-190620).
  공유 체크아웃 D:\Development\code-destiny 는 읽지도 쓰지도 않는다(AGENTS.md "main 에서 직접 편집"의 예외: 이 작업은 이 작업 트리에서만 한다).
- 운영 DB 쓰기 0회, 실결제 0회, 유료 LLM 호출 0회. 운영 부하 시험 금지.
- Secret(MONGO_URI, ATLAS_* 키, Cloudflare 토큰)과 IP 주소를 화면·파일·커밋에 쓰지 않는다. tail 원본(IP·헤더 포함)은 리포에 넣지 않고 집계 수치만 옮긴다.
- 실제로 재지 않은 성능·비용 수치를 만들지 않는다. 모르면 "미확인"이라고 쓴다.
- git push, 배포(wrangler deploy 등), wrangler.toml 수정은 하지 않는다. 커밋은 이 브랜치에 문서만 한다.
- 데이터 파일은 리포 밖 D:\Development\code-destiny-backups\ 에 둔다.
- 보고는 한국어로 한다. 끝에 한 일·결과·남은 일을 짧게 정리한다.
```

## P1a. 오늘 20:45 — 피크 측정 시작

운영 DB serverStatus 1분 읽기는 **2026-11-01 20:50~23:10 KST 창에만** 승인됐다. 다른 날짜에 다시 돌리려면 사용자 승인을 새로 받는다.

```text
[P1a — P1 장애 피크 측정 시작]
목표: 2026-11-01 20:50~23:10 KST 에 Worker tail + 프라이머리 serverStatus 60초 표본(연결 1개, maxPoolSize 1)을 수집하고,
끝나면 Atlas 1분·CF 1분 수집과 분석이 자동으로 돌게 한다. 스크립트는 이미 있다. 고치지 않는다.

1) 지금 시각이 20:40~20:50 KST 인지 확인한다. 23:10 이 지났으면 아무것도 하지 말고 보고만 한다.
2) 점검(연결 없음):
   node D:\Development\code-destiny-backups\scripts\p1-peak\run-peak.mjs --worktree=D:\Development\codedestiny-worktrees\infra-deploy-20261031-190620 --start=2026-11-01T20:50:00+09:00 --end=2026-11-01T23:10:00+09:00 --dry-run
   출력 JSON 의 envLocal, mongodb 가 둘 다 true 인지 본다. false 면 시작하지 말고 무엇이 없는지 보고한다.
   wrangler 로그인 확인: 작업 디렉터리에서 npx wrangler whoami (계정 이메일·ID 는 보고에 쓰지 않는다. 로그인 여부만).
3) 시작: 이 Codex 세션이 끝나도 계속 돌도록 PowerShell 에서 분리 실행한다.
   Start-Process -FilePath node -ArgumentList 'D:\Development\code-destiny-backups\scripts\p1-peak\run-peak.mjs','--worktree=D:\Development\codedestiny-worktrees\infra-deploy-20261031-190620','--start=2026-11-01T20:50:00+09:00','--end=2026-11-01T23:10:00+09:00' -WorkingDirectory D:\Development\codedestiny-worktrees\infra-deploy-20261031-190620 -WindowStyle Minimized
   (start 가 미래면 스크립트가 20:50 까지 기다린다.)
4) 20:52 이후에 한 번 확인한다:
   - 로그 D:\Development\code-destiny-backups\scripts\p1-peak\20261101-2050-peak.log 에 "tail 시작" 줄이 있다.
   - D:\Development\code-destiny-backups\mongodb-readonly\20261101-2050-peak-conn-counters-minute.jsonl 에 줄이 1개 이상 생겼다.
     줄에 "error" 만 있으면 내용(앞 200자, URI 없음)을 보고한다.
   - D:\Development\code-destiny-backups\tail\20261101-2050-peak-seg-*.jsonl 파일이 커지고 있다.
5) 보고: 시작 여부, 위 3가지 확인 결과, 문제가 있으면 무엇이 멈췄는지. 측정 도중에는 스크립트를 고치거나 다시 시작하지 않는다.
   멈췄으면 PID 파일(20261101-2050-peak.pids)의 PID 를 taskkill /PID <pid> /T /F 로 정리하고 보고만 한다.
```

## P1b. 23:15 이후 — 판정과 기록

```text
[P1b — P1 피크 측정 판정과 문서 기록]
1) 종료 확인:
   - D:\Development\code-destiny-backups\scripts\p1-peak\20261101-2050-peak.log 마지막 줄이 "완료. 보고서: ..." 인지 본다.
   - 20261101-2050-peak.pids 가 비어 있는지 보고, wrangler tail 이나 run-peak 로 남은 node 프로세스가 없는지 본다
     (Get-CimInstance Win32_Process | Where-Object CommandLine -match 'wrangler.*tail|run-peak' ). 남아 있으면 taskkill /PID <pid> /T /F.
   - "완료" 가 없으면 23:40 까지 기다렸다 다시 본다. 그래도 없으면 남은 프로세스를 정리하고, 아래 3) 의 분석만 손으로 돌린다.
2) 보고서: D:\Development\code-destiny-backups\tail\20261101-2050-peak-analysis.txt 를 읽는다.
3) (보고서가 없을 때만) 분석을 직접 돌린다:
   node D:\Development\code-destiny-backups\scripts\p1-peak\analyze-peak.mjs --tail-prefix=D:\Development\code-destiny-backups\tail\20261101-2050-peak-seg- --counters=D:\Development\code-destiny-backups\mongodb-readonly\20261101-2050-peak-conn-counters-minute.jsonl --cf=D:\Development\code-destiny-backups\cf-analytics\20261101-2050-peak-cf-1m.json --out=D:\Development\code-destiny-backups\tail\20261101-2050-peak-analysis.txt
   (CF·Atlas 파일이 없으면 그 인자를 빼고 돌리고, 빠진 것을 보고에 적는다. CF 1분 수집만 다시 돌리려면
    node D:\Development\code-destiny-backups\scripts\p1-peak\cf-1m.mjs --start=2026-11-01T20:50:00+09:00 --end=2026-11-01T23:10:00+09:00 --out=<위 cf 경로>)
4) 판정 줄("판정: ...")을 그대로 옮긴다. 판정 규칙은 장애 문서 "### 1. 피크 실측" 에 있고 스크립트가 이미 적용한다. 판정을 바꾸어 해석하지 않는다.
   - serverStatus 카운터는 프라이머리 mongod 한 대 값이다. 초당 생성률을 노드 수로 나누지 않는다(한도는 노드당 15/초).
5) 문서 기록(작업 트리 안, 2곳):
   a. docs/handoff/2026-11-01-db-connection-rate-limit-outage.md — "## 이번 세션 결과 (2026-11-01)" 절의 "P1 피크 실측" 칸에:
      창, 표본 수, tail 이벤트 수, 503 수와 비율, 오류 분 수, Δrejected(창 전체·오류 분), 프라이머리 생성률 최대/초와 한도 대비 %, 판정 문장, 데이터 파일 경로.
      frontmatter next 를 판정에 맞게 바꾼다: 확정·불확정 → "P5 판단 자료 → 차단기 push 승인", 기각 → "TLS·DNS·Atlas 프록시 가설 재조사", 여유 → "평시 여유 기록 → 다음 피크 재측정 여부 결정".
   b. docs/infrastructure/SERVER-PERFORMANCE.md — "P1 장애" 절의 "원인 가설과 한계" 끝에 같은 수치를 3~6줄로 덧붙인다(출처: 위 데이터 파일 이름).
   IP·URI·키는 쓰지 않는다. 표에 없는 수치를 만들지 않는다.
6) 검증·커밋: git diff --check 와 npm run verify:doc-freshness 를 돌린다.
   doc-freshness 가 docs/CURRENT_DEV_BASELINE.md 날짜(Last curated 2026-10-17)만으로 실패하면 사전 실패이니 그 사실만 보고하고 진행한다.
   git add 는 위 2개 파일만. 커밋 메시지: "docs(infra): P1 피크 실측 판정 기록 (2026-11-01 20:50~23:10)". push 하지 않는다.
7) 보고: 판정 문장, 핵심 수치 5개 이하, 커밋 SHA, 남은 프로세스 0개 확인.
```

## P2. Atlas 경보 — 중복 확인과 클릭 목록

설정은 사용자가 Atlas UI에서 한다([SECURITY-AUDIT 런북 3](../infrastructure/SECURITY-AUDIT.md#런북-3-atlas-경보-권장-목록)). Codex는 읽기 전용 키로 지금 설정을 읽고 클릭할 목록만 만든다.

```text
[P2 — Atlas 경보 중복 확인]
1) scripts/lib/atlas-readonly-client.mjs 의 createAtlasReadonlyClient 로 GET /groups/{g}/alertConfigs 를 읽는 짧은 스크립트를
   리포 밖 D:\Development\code-destiny-backups\scripts\p1-peak\atlas-alert-configs.mjs 로 만든다(허용 목록 안의 GET 만, 키 출력 금지).
   결과는 eventTypeName·enabled·threshold·metricThreshold 의 metricName/operator/threshold/units 만 추린 요약으로
   D:\Development\code-destiny-backups\atlas-snapshots\20261101-alert-configs-summary.json 에 쓴다(알림 대상 이메일·전화·웹훅 URL 은 쓰지 않는다).
2) docs/infrastructure/SECURITY-AUDIT.md "### 런북 3. Atlas 경보 권장 목록" 표의 각 행과 대조해
   "이미 있음 / 없음 / 비슷한 것이 있으나 임계값이 다름" 으로 나눈다. 연결 수 경보(노드 현재 연결 300 이상 5분)는 꼭 본다.
3) 없는 경보마다 Atlas UI 클릭 순서(Project → Alerts → Add New Alert 이후 선택 항목과 값)를 쓴다. UI 이름이 문서와 다르면 "UI 이름 미확인" 으로 둔다.
4) 위 결과를 런북 3 아래 "현재 설정 대조 (2026-11-01)" 소절로 기록하고 그 파일만 커밋한다. push 하지 않는다.
5) 보고: 있음/없음 개수, 사용자가 UI에서 만들 경보 목록(순서대로).
```

사용자 몫: 보고에 나온 목록대로 Atlas UI에서 경보를 만들고 알림 채널(이메일 등)을 고른다.

## P3. M30 단가 기록

```text
[P3 — Atlas M30 단가 기록]
1) MongoDB Atlas 공식 가격 페이지에서 지금 클러스터와 같은 클라우드·리전의 M10 과 M30 시간당 단가를 찾는다.
   클라우드·리전은 D:\Development\code-destiny-backups\atlas-snapshots\ 의 최신 스냅샷이나 docs/infrastructure/COST-OPTIMIZATION.md 에서 읽는다.
2) 찾은 단가만 출처 URL·확인 날짜와 함께 docs/infrastructure/COST-OPTIMIZATION.md "## 등급 판정: M10 유지 vs Flex" 의
   "### P1 장애가 등급 판정에 더한 것" 아래에 적는다. 월 환산은 "시간당 단가 × 730" 처럼 계산식을 같이 쓴다.
   페이지에 단가가 안 보이거나 로그인이 필요하면 추정하지 말고 "미확인 — 사용자 청구서 확인 필요" 로 적는다.
3) 그 파일만 커밋한다. push 하지 않는다. 보고: 단가 2개(또는 미확인), 출처.
```

사용자 몫: 가격 페이지에 단가가 없으면 Atlas 청구서(Billing) 화면에서 M10 단가를 직접 보고 Codex에 알려 준다.

## P4. Atlas 읽기 전용 키 정리

P1b·P2·P3가 끝난 뒤에 한다. 키를 지우면 Atlas 분 단위 수집과 P2 스크립트가 더는 돌지 않는다.

```text
[P4 — ATLAS_* 사용자 환경변수 삭제]
1) 먼저 사용자에게 "Atlas Organization Access Manager 에서 읽기 전용 API 키를 지웠는지" 묻는다. 지웠다는 답을 받기 전에는 2) 를 하지 않는다.
2) 사용자 환경변수 4개를 지운다(값은 출력하지 않는다):
   foreach ($n in 'ATLAS_PUBLIC_KEY','ATLAS_PRIVATE_KEY','ATLAS_ORG_ID','ATLAS_GROUP_ID') { [Environment]::SetEnvironmentVariable($n, $null, 'User') }
3) 확인: foreach ($n in ...) { "$n=" + [bool][Environment]::GetEnvironmentVariable($n, 'User') } 가 모두 False.
4) docs/handoff/2026-10-31-infra-followups-index.md 의 "Atlas 읽기 전용 API 키 삭제" 줄에 완료 날짜를 적고 그 파일만 커밋한다. push 하지 않는다.
```

사용자 몫: Atlas Organization → Access Manager → API Keys에서 이번 감사용 읽기 전용 키를 삭제한다.

## P5. 차단기 push 판단 자료 (실행하지 않음)

```text
[P5 — 승인 10 판단 자료]
읽기만 한다. push·배포·설정 변경은 하지 않는다.
1) P1b 판정과 수치를 읽는다(장애 문서 "## 이번 세션 결과 (2026-11-01)").
2) 차단기 커밋(장애 문서에 SHA 가 있다)의 git show --stat 과 __tests__/worker/db.shared-connect-breaker.test.js 의 테스트 이름을 요약한다.
3) 재시도 축소(MONGO_WORKER_CONNECT_RETRIES 2→1)의 효과를 P1b 수치로만 추정한다:
   실패한 요청 하나의 연결 시도는 family 후보 2개 × (재시도+1) 이다(2→6회, 1→4회). 오류 분의 [db-connect-error] 줄 수에 이 비율을 곱한 값까지만 쓰고,
   그 이상(503 감소율 등)은 "배포 뒤 재측정 필요" 로 둔다.
4) 다음 셋을 나란히 정리해 보고한다(문서에는 쓰지 않는다):
   - 판정이 확정이면: 차단기 push → 스테이징 → 운영 배포 순서와 각 단계의 확인 지표, 롤백(커밋 revert, [vars] 변경 없음)
   - 판정이 기각·여유면: push 를 미루는 이유와 다음 측정 시점
   - M30(승인 7) 판단에 필요한데 아직 없는 값(P3 결과 포함)
```

사용자 몫: 보고를 보고 승인 10(차단기 push·배포)과 승인 7(M30)을 결정한다. push는 Codex가 아니라 Claude 세션에서 origin/main 기준 cherry-pick으로 한다.
