---
status: partial (진단 스크립트 작성 + 스테이징 검증 완료, 프로덕션 실행은 사용자 승인 대기)
updated: 2026-09-18
next: 사용자가 승인하면 `node scripts/audit-yeongnyangi-paid-without-result.mjs --db code_destiny` 를
  실행해 실제 영향 고객 수를 확인한다. 0건이 아니면 구체적 requestId 확보 방법(현재 스크립트는
  집계만 내고 ID/PII 는 출력하지 않는다)을 별도로 정하고 나서 `scripts/recover-yeongnyangi-request.mjs`
  로 개별 복구한다.
---

# 영냥이 결제 후 결과 누락(PAID_WITHOUT_RESULT) 진단

- 날짜: 2026-09-18
- 등급: RED (결제·DB)
- 계기: `docs/handoff/checkout-soulcat-requestid-gate-p0-20260918.md` 의 "남은 일" 중
  "PAID_WITHOUT_RESULT 읽기 전용 Mongo 조회 — 필요 여부는 사용자가 다시 확인" 항목을 사용자가
  "영냥이 상품들이 모두 제대로 결제 후 결과가 제공이 되어야해" 로 재확인 요청.

## 결론 (코드로 확인)

**결제됐는데 결과가 막히는 실제 경로가 있다.** SoulCat requestId 게이트 회귀와는 무관한 별개
문제다.

1. 챕터 생성은 서버 큐/크론이 아니라 **클라이언트가 매 챕터마다 트리거**한다
   (`worker/yeongnyangi/service.ts:73-91` `generateNextChapter`). 챕터당 누적 시도가
   `manifest.length*3 + additionalAttempts` 를 넘으면 `GENERATION_REVIEW_REQUIRED` 로
   **영구 차단**된다(`service.ts:79`). 결제(`paymentId`)와 완료된 챕터는 보존된다
   (`repository.js` `finishChapter`/`failChapter`) — 돈이나 진행분이 사라지진 않는다.
2. 서버 쪽 자동 재시도·크론은 없다(`YeongnyangiRequest` 는 route·model·repository·
   payment-intent 4곳에만 등장, `scheduled()` 핸들러와 무관 — 전수 확인).
3. `app/yeongnyangi/_components/Result.tsx` 를 재방문하면 `activate` 만 자동 재호출되고
   (line 29), `generate` 는 사용자가 버튼을 눌러야 호출된다(line 44). `GENERATION_REVIEW_REQUIRED`
   로 막힌 요청은 버튼을 눌러도 즉시 같은 409 가 나고, 화면엔 **"상담을 잠시 멈췄어요. 저장된
   내용부터 다시 이어갈 수 있어요"라는 제네릭 메시지만 반복**된다(`Result.tsx:15`). API 가
   내려주는 `row.errorCode` 는 이 컴포넌트 어디서도 쓰이지 않는다(전체 60줄 확인) — 사용자는
   "재개 가능"처럼 보이는 화면을 계속 보지만 실제로는 운영자가
   `scripts/recover-yeongnyangi-request.mjs` 를 **특정 requestId 로** 수동 실행해야 풀린다.
4. 이걸 운영자에게 알려주는 모니터링/알림은 없다 — 지금까지는 고객이 직접 문의해야만 알 수
   있는 구조.

이 자체는 이번 세션에서 코드를 고치지 않았다(사용자가 "진단까지"를 선택, 코드 개선은
별도 선택지였고 미선택 — 아래 "후속 과제" 참고).

## 별개 확인: yeongnyangi-room-restore.md 의 503 버그, 프로덕션 배포 여부

`docs/handoff/yeongnyangi-room-restore.md` 는 결제 직후 조회 시 간헐적 503 버그를 기록했고,
수정 커밋 `5072d87df`(Mongo 트랜잭션 가드)가 main 에 push 됐지만 그 문서 자체가 "배포 후
Worker QA 재실행 필요" 라고 명시한 채 갱신 이력이 없었다(생성 커밋 1개뿐, `git log` 확인).

**오늘(2026-09-18) `npx wrangler deployments list` 로 실측 확인한 결과: 이미 프로덕션에
배포돼 있다.**
- 가장 최근 프로덕션 배포: `8ee6b4b`(2026-09-17T20:27:34Z, `chore(sitemap)` 커밋에 얹혀 배포).
- `git merge-base --is-ancestor 5072d87df 8ee6b4b` → true. `8ee6b4b` 는 현재 `origin/main`
  이력에도 포함됨(확인).
- 즉 503 수정 코드 자체는 최소 2026-09-17 저녁부터 라이브다. 다만 room-restore.md 가 요구한
  "수정본에 대한 실제 Worker QA 재실행"(활성화 직후 반복 조회로 503 이 실제로 사라졌는지
  실측)은 여전히 안 된 것으로 보인다 — 코드가 배포된 것과 그 배포로 버그가 실제로 사라졌음을
  확인한 것은 다르다. 이번 세션 범위 밖이라 손대지 않았다.

## 이번 세션 산출물

- `scripts/audit-yeongnyangi-paid-without-result.mjs`(신규): `yeongnyangi_requests` 컬렉션에서
  결제된(`paymentId` 존재) 요청을 state×errorCode 로 집계, `--stuck-hours`(기본 24시간) 넘게
  미완결인 건수와 `GENERATION_REVIEW_REQUIRED` 확정 건수를 따로 낸다. 쓰기 없음, PII/ID 미출력
  (기존 `scripts/audit-tarot-prompt-maker-purchasers.mjs` 정책과 동일). `--db` 는 기본값 없이
  `code_destiny_staging`|`code_destiny` 중 명시 필수 — 실수로 프로덕션을 조회하지 않도록.
- 스테이징 검증: `node scripts/audit-yeongnyangi-paid-without-result.mjs --db code_destiny_staging`
  실행 완료, 정상 종료. 결과는 전부 0건(스테이징은 Gemini 키가 없어 실제 generation 이 잠겨
  있어 유료 `yeongnyangi_requests` 자체가 거의 없음 — room-restore.md 에 이미 기록된 사실과
  일치, 새로운 사실 아님). **이 실행은 스크립트가 안전하게 연결·집계·종료함을 검증한 것이지,
  프로덕션의 실제 영향 고객 수를 알려주진 않는다.**
- `npm run check:fast` 백그라운드 실행 중 — 결과는 다음 세션이 확인(타임아웃으로 background 로
  넘어감, 이 문서 갱신 시점엔 미완료).

## 남은 일 (사용자 승인 필요)

1. **프로덕션 실행**: `node scripts/audit-yeongnyangi-paid-without-result.mjs --db code_destiny`
   — 읽기 전용이지만 실제 운영 결제 DB 접속이라 별도 승인을 받고 진행하기로 함(2026-09-18
   사용자 선택: "배포 확인 → 스테이징 검증까지"만 승인, 운영 조회는 다음 결정).
2. 1번 결과 `stuckCandidates`/`reviewRequiredNow` 가 0이 아니면: 그 요청들을 실제로 복구하려면
   구체적 requestId 가 필요한데 현재 스크립트는 집계만 낸다. ID 확보 방법(제한된 개수만 별도
   조회하는 후속 스크립트 등)은 그 시점에 다시 정한다.
3. `Result.tsx` 의 UI 갭(재시도 버튼이 REVIEW_REQUIRED 상태에서 같은 제네릭 메시지를 무한
   반복, `row.errorCode` 미노출, 운영자 알림 없음) — 근본 원인 수정은 이번 세션에서 사용자가
   선택하지 않아 미착수. 후속 과제로만 보고.
4. room-restore.md 의 "수정본 배포 후 Worker QA 재실행" 자체는 여전히 안 됨 — 필요하면 별도
   요청.
