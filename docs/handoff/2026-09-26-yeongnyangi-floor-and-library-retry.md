---
status: done
updated: 2026-09-27
next: "완료(운영 d98947f53). 다른 유료 LLM 은 2026-09-27-llm-length-never-fatal.md P1 부터."
---

# 영냥이: 장 거부선 완화 + 분량 보강본 수용 + 보관함 재시도

## 요구 (사용자 원문)

- 2026-09-26: "LLM 관련 기능들이 소절 분량 부족 12회로 이미 생성하고도 버리고 계속 생성했다는것인데.. LLM 비용이라든지 고객에게 전달도 제대로 안되는 문제를 야기하므로 분량에 대해서 빡빡하지 않게해서 제대로 생성되도록 … 결제 이후에 재시도 자체를 줄이고 한번에 잘되도록 정확하게 수정해"
- 2026-09-26: "운영 승격까지 진행하고 영냥이 보관함에서 생성이 안된 부분들은 재시도로 생성가능하도록 설정한다"
- 결정
  - 거부선 완화는 영냥이 장 판정만 한다.
  - 재시도는 보류도 허용하고 장마다 2회로 한다. `ASK_LIMITED_REVIEW_REQUIRED` 는 운영자 전용으로 유지한다.
- 2026-09-27: "모든 LLM 기능들이 분량 기준이 아니라 내용이 좋아야해 분량 실패로 생성 실패해서 고객에게 전달안되는 일이 없도록 최적화해주길 바란다"
  - 영냥이는 이번 세션에서 적용했다.
  - 나머지는 [llm-length-never-fatal](2026-09-27-llm-length-never-fatal.md)로 넘겼다.

## 변경 (main)

| 커밋 | 내용 |
|---|---|
| 1e50c2654 | 장 거부선을 `minimumChars` 전체에서 목표 하한 × 0.7(`chapterFloor`)로 낮췄다. detail 은 `chapter:<n>/<floor>`. `GENERATION_FIX_EPOCH` 1→2. |
| e8a221c70 | 구매자 보류 재시도. `userCanRetryHold`·`userCanRetry`·`resumeHeldByUser`(`worker/yeongnyangi/repository.js`)와 `retry.js` 보류 분기를 추가했다. STOPPED 에서 한 번 누르면 보류 재시도까지 이어진다. 목록 API 에 `canRetry` 가 생겼고 errorCode 는 여전히 노출하지 않는다. 장당 최악 호출은 13→17회다. |
| a828e4959 | 보관함 행마다 "기존 상담 복구하기" 버튼(`Library.tsx`)을 두고, 상세(`Result.tsx`)는 `recovery.canRetryNow` 로 복구 버튼을 띄운다. 사이트맵 lastmod 5개 파일을 재생성했다. |
| a7a439b43 | 분량 보강본은 분량으로 다시 거부하지 않는다. `LENGTH_FAILURES`, `validateReadingQuality(..., {lengthRepair})`. `validateChapter` 가 직전 실패 코드(`input.repair.code`, service.ts 가 품질 실패 재시도 때 넘김)가 분량이면 옵션을 켠다. 구조·근거·중복·주장 판정은 그대로다. |

- epoch 는 3으로 올리지 않았다. epoch 2(1e50c2654)가 아직 운영에 나가지 않아, 이번 커밋과 함께 한 번에 승격된다.
- 추가하지 않은 것
  - 새 과금 경로·결제 호출은 없다.
  - 기존 소유자 필터, `readRequest` 결제 재확인, `chapters:{$size}` 중복 저장 방지는 그대로다.

## 검증

- 테스트
  - reading-v6 12/12 통과. 변이 검사: `!lengthRepair&&` 를 지우면 11/1 로 실패한다.
  - retry·repository·route·contract jest 는 통과했다(커밋 B).
  - Playwright 라우트 mock 으로 보관함·상세 화면을 띄워 visual-checker 로 확인했다(커밋 C).
- `npm run check:fast` 는 커밋마다 exit 0 이었다.
- CI: a828e4959 까지 `CI required` success.
- 과금 LLM·실결제·운영 DB 쓰기: 0.

## 남은 위험

- 짧은 장이 통과할 수 있다. 최악은 목표 하한의 70% 미만인 보강본이다. 빈 본문과 구조 붕괴는 계속 거부한다. 구매 화면에는 분량 약속이 노출되지 않는다(grep 확인).
- 보류 재시도로 장당 호출 상한이 17회로 늘었다. 요청 단위 상한 `reconcileAttemptLimit` 는 system grants 를 합산한다.
- 레거시 보류(`hold` 필드 없음)는 `canRetry:false` 로 둔다(fail-closed). 크론 `keepHold` 가 도장을 찍으면 열린다.
- `INVALID_CHAPTER_BLOCKS`(운영 5건, detail 없음)는 결정적 교정 후보다. 새 detail 이 쌓인 뒤 판단한다.
- `chapter.ts:59-63` 필드 5000자 초과 거부 → 다른 LLM 계획 P4.

## 롤백

커밋 하나씩 `git revert <sha>` 한다. UI 는 a828e4959, 재시도는 e8a221c70, 거부선은 1e50c2654, 분량 보강본은 a7a439b43 이다. 서로 독립적이지만 C 는 B 의 `canRetry` 에 의존한다.

## 운영 승격 (2026-09-27)

- 범위: 373d8f6c8..d98947f53, 9커밋. 이 세션 5개 + 다른 세션의 영냥이 시각 요소 4개(e18bbbb38~d98947f53). 사용자가 범위를 다시 확인해 "전부 승격"을 골랐다.
- 절차: 스테이징 SHA PASS, Mongo 스테이징 픽스처 PASS(실PG·실LLM 0), `verify:release` exit 0, CI `CI required` success. 런 36260459340 success(롤백 없음). 운영 `verify-deployed-sha` Pages·Worker PASS.
- 승격 뒤 감사(읽기 전용, 2026-09-26T18:04Z): 유료 6, 완료 3, `reviewRequiredNow` 0, `stuckCandidates` 0.

## 다음 단계

1. 다른 유료 LLM 서비스: [llm-length-never-fatal](2026-09-27-llm-length-never-fatal.md) P1.
