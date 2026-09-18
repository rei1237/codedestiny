---
status: resolved (프로덕션 실측 완료 — 현재 PAID_WITHOUT_RESULT 0건. Result.tsx UI 갭은 별도 후속 결정 대기)
updated: 2026-09-18
next: (선택, 후속) Result.tsx 가 GENERATION_REVIEW_REQUIRED 등 errorCode 별 안내를 구분해서
  보여주도록 고치는 RED 작업 — 사용자가 아직 요청하지 않음, 요청 시 착수. 그 전까지는 재거론 안 함.
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
- `npm run check:fast` 완료: exit 0, entry-encoding OK, jest 281 suites/3966 tests 전부 통과.
- 커밋 `9faaad662` (push 완료, `origin/main` 반영).

## 프로덕션 실측 결과 (2026-09-18, 사용자 승인 후 실행)

`node scripts/audit-yeongnyangi-paid-without-result.mjs --db code_destiny` 실행 결과:
**결제된(`paymentId` 존재) 요청 0건, 따라서 PAID_WITHOUT_RESULT 0건.**

결과가 너무 깔끔해서(0건) 쿼리 버그(필드명·컬렉션명 오류)가 아닌지 별도 1회성 스크립트로
교차 검증함(커밋하지 않고 확인 후 삭제):
- `yeongnyangi_requests` 컬렉션 전체 문서 수(필터 없음) = **1건뿐**. 그 1건도 `state:"CREATED"`,
  `paymentId` 없음(미결제), `createdAt` 이 오늘(2026-09-18T06:51 UTC) — 즉 이 컬렉션 자체가
  현재 거의 비어 있다. 필드명(`paymentId`)·컬렉션명(`yeongnyangi_requests`) 은 스키마
  (`worker/lib/yeongnyangi-models.js`)와 정확히 일치함을 재확인 — 쿼리 로직 문제 아님.
- 이 결과는 이 문서의 원 계기였던 SoulCat P0 회귀와 맞아떨어진다: `requestId` 렌더 게이트
  버그가 2026-09-16(`3fb6ab057`)부터 오늘 수정(`6c5392d2a`, `45232820e`)까지 SoulCat 결제
  버튼 자체를 100% 막고 있었다([checkout-soulcat-requestid-gate-p0-20260918.md](checkout-soulcat-requestid-gate-p0-20260918.md))
  — 그 기간엔 애초에 결제가 발생할 수 없었으니 결제 후 결과 누락도 발생할 수 없다. 2026-09-16
  이전 기록이 전혀 안 남아있는 것은 이 실측만으로는 "원래 트래픽이 거의 없었다"인지 다른
  이유인지 단정할 수 없음 — 삭제·초기화 정황은 없고 이 세션에서 쓰기 연산은 전혀 하지 않았다.

**결론: 지금 이 순간 기준으로 영냥이(CD 내부+SoulCat) 결제 후 결과 누락 고객은 없다.** 사용자
원 질문("영냥이 상품들이 모두 제대로 결제 후 결과가 제공이 되어야해")에 대한 직접 답.

## 남은 일 (선택, 후속 과제)

1. `Result.tsx` 의 UI 갭(재시도 버튼이 REVIEW_REQUIRED 상태에서 같은 제네릭 메시지를 무한
   반복, `row.errorCode` 미노출, 운영자 알림 없음) — 지금은 실제로 막힌 요청이 0건이라 긴급하진
   않지만, 향후 트래픽이 늘면 같은 경로로 재발할 수 있는 구조적 갭. 근본 원인 수정은 사용자가
   아직 선택하지 않아 미착수.
2. room-restore.md 의 "수정본 배포 후 Worker QA 재실행" 자체는 여전히 안 됨 — 필요하면 별도
   요청.
3. 지금은 0건이라 급하지 않지만, 향후 정기 확인이 필요해지면 이 스크립트를 크론·알림에
   배선하는 것도 후속 후보(현재는 수동 실행 전용, 자동화 없음).
