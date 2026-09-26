---
status: active
updated: 2026-09-26
next: "참치 주문 15/15 복구 완료. 남은 일은 신규 주문 모니터링과 남은 위험 후속 판단."
---

# 영냥이 참치 유료 주문 복구·생성 중단 근본 수정 인수인계

## 사건

- 주문(요청 ID): `056f1a52b8051143672741c90dcb973b6150d57446d281754239ca4fc6d64d86`, 상품 `saju_tuna` 15항목, ₩10,000.
- 결제(운영 DB·PortOne 서버 조회): paid / PAID_VERIFIED, 결제 1건, refundLock 없음. 중복 과금 0.
- 생성이 9/15에서 멈춤: `FORTUNE_FAILED` / `GENERATION_REVIEW_REQUIRED`. 구매자 화면은 "문의하세요"로 끝나는 막다른 상태.

## 원인 (실측)

- 시도 27회 중 18회가 품질 검증 거부였다(`CHAPTER_SECTION_TOO_SHORT` 12, `INTERNAL_EVIDENCE_EXPOSED` 6). 타임아웃·잘림·DB·Worker 오류는 0.
- 소절 하한이 목표 하한의 약 81%로 빡빡했다. 소절 하나가 조금만 짧아도 장 전체를 버리고 다시 생성했다(원칙 17 위반).
- 내부 근거 ID 노출은 교정할 수 있는데도 장 전체를 폐기했다.
- ordinal 9에서 자동 3회와 사용자 복구 2회를 다 쓰자 `MANUAL_RECOVERY_LIMIT_REACHED` 보류로 넘어갔다. 크론과 큐가 보류를 제외해 영구 정지됐다. 알림도, 자동 재개도, 실패 장 번호(감사 `chapter:null`)도 없었다.

## 변경 (main, 브랜치·PR 없음)

| 커밋 | 내용 |
| --- | --- |
| 994b4cad7 | 소절은 `minimumChars×0.7` 미만일 때만 거부한다. 장 하한은 그대로다. |
| cf1ae0699 | 노출된 내부 근거 ID를 교정한다(재생성하지 않음). |
| 1b2ad35d7 | 실패 감사에 장 번호와 detail을 남긴다. |
| 6558cdf91 | 보류(hold)·시스템 재시도·수정 epoch 자동 재개·운영자 알림을 추가했다. |
| 2c50b6ce4 | 보류 주문을 "복구 중 n/total"로 보여 주고 30초마다 계속 확인한다. "문의" 막다른 문구를 없앴다. |
| e36da442d | 수정으로 재개할 수 없는 기존 보류도 알림을 1회 보낸다. |
| b8a77cceb | 운영자 스크립트가 `--operator`를 필수로 받는다. 진단 정보와 적용 전 상태 파일을 남긴다. |
| e7544a674 | 전 상품 소절 거부 하한이 목표 하한×0.6 이하임을 고정하는 테스트를 추가했다. |
| 7a5889b38 | 스테이징 Mongo 검증기를 09-23 재구성 이후 흐름에 맞췄다. 이전 코드에서도 같은 줄에서 실패하던 낡은 단언이었다. |

- 비용: 짧은 소절과 ID 노출은 추가 호출 없는 교정·통과로 바뀐다. 장 하나의 최악은 3+2+2+6=13회이고, 전체 한도가 이를 묶는다. 무한 재시도는 없다.
- 유지: 소유자 필터, 결제 증빙 트랜잭션, `$size` 중복 저장 방지, FAMILY 이용권 복원. `ASK_LIMITED_REVIEW_REQUIRED`는 자동 재개하지 않는다(운영자만).

## 검증

- 워크트리 커밋마다 `npm run check:fast`(critical 등급, 전체 tsc·jest)가 exit 0이었다. UI node 테스트는 142 pass였다.
- main CI `CI required`: e7544a674와 7a5889b38 모두 success.
- 스테이징
  - `verify:staging --sha=e7544a674…` → Pages·Worker PASS.
  - `verify-yeongnyangi-mongo-staging.mjs --staging-fixtures` → 28개 상품 PASS, 픽스처 정리 PASS, 실결제·실LLM 0.
  - 스테이징은 크론이 없다(crons=[]). 크론 재개 경로는 mock 테스트로만 검증했다.
- 운영 승격: 사용자 1회 승인(2026-09-26). 범위는 625e9430b → 7a5889b38(다른 세션 문서 커밋 f043bc491 포함). Release run 36244821515 success. `verify-deployed-sha --origin=https://code-destiny.com` → Pages·Worker 7a5889b38 PASS.

## 복구 전 상태 (2026-09-26T03:08Z, 운영 읽기 전용)

- 저장 9/15, attempts 27, manualRecoveryGrants `{0:2,1:1,9:2}`.
- chapterAttempts `{0:5,1:4,2:3,3:1,4:3,5:2,6:2,7:1,8:1,9:5}`.
- 장 0~8 sha256 앞 16자: `1d9fe2c345cc2c24`, `12fb4c6402a86b3c`, `22d0787cd778083c`, `5694246377c0b666`, `76ff1c81927108df`, `105c3f2c3cd07608`, `936079a80a45ed02`, `f0fee05e70a6909a`, `d882cc33355f0963`.
- sha 방식은 `sha256(JSON.stringify(chapter))`로, 운영자 스크립트와 같다.

## 복구 결과

운영 승격(13:33Z 배포 SHA 확인) 후 첫 크론 tick에서 자동 재개됐다. 감사 기록 `system_resume_after_fix`(13:40:06Z)부터 `completed_after_reread`(13:43:01Z)까지 이어졌다. 운영자 수동 적용은 쓰지 않았다.

- 상태: `COMPLETED`, 15/15. 시도 27→33으로, 남은 6장에 LLM 호출 6회를 썼고 실패는 0회다. 수정 전에는 저장 1장당 약 3.0회였다.
- 장 0~8 sha256: 9/9 불변. 15장 모두 현재 품질 검사(`validateReadingQuality`)를 통과했다. 장 하한 미달 0, 최소 비율 1.23배, 중복 장 없음.
- 결제: paid ₩10,000, refundLock 없음, consumedBy 일치. 이 요청과 이 구매자의 영냥이 결제는 모두 1건이다(새 Payment 0).
- 열람: 운영 행에 `presentFortune`을 적용하면 15장, `nextAction:"reread"`다. 비로그인 GET `/api/yeongnyangi/requests/<id>`는 401이다. 구매자 세션의 실제 화면은 미검증.
- 운영 집계(13:43:54Z): 결제 6건 중 완료 3건과 기존 환불 3건이다. `reviewRequiredNow` 0, `stuckCandidates` 0.

다음에 생성 품질 규칙을 고쳐 배포할 때는 `GENERATION_FIX_EPOCH`를 1 올린다. 운용 설명은 docs/verification/yeongnyangi-consultation-queue.md의 수동 복구 절에 있다.

## 남은 위험

- STOPPED·보류 스캔이 tick당 10건이라 결제 무효 행이나 전 장 저장 행이 자리를 차지할 수 있다.
- epoch 고정과 시스템 부여 고정 조건은 변이 테스트에서 살아남았다(심층 방어, 미검증).
- 소절 단위 부분 재생성은 도입하지 않았다. 배포 후 `CHAPTER_SECTION_TOO_SHORT` 비율을 보고 판단한다.
- `RECOVERY_ID_MISMATCH` 문구에는 여전히 "문의"가 있다(클라이언트 무결성 오류). 결제가 무효인 행은 결제 링크를 보여 준다(기존 동작).
- 구매자 실제 화면은 확인할 수 없다(미검증).

## 다음 단계

1. 운영 모니터링: `node scripts/audit-yeongnyangi-paid-without-result.mjs --db code_destiny --json`(읽기 전용). `reviewRequiredNow`, 새 실패 코드·detail, 장당 호출 수를 본다.
2. 보류가 다시 생기면 알림 메일의 수동 명령을 따른다. dry-run 진단을 확인한 뒤 `--apply --operator <이름>`을 쓴다.

## 복사할 재개 지시

```text
D:\Development\code-destiny에서 docs/handoff/2026-09-26-yeongnyangi-tuna-recovery.md를 읽고, main·clean 확인과 git pull --ff-only 후 audit-yeongnyangi-paid-without-result.mjs --db code_destiny --json(읽기 전용)으로 참치 주문 COMPLETED 유지와 신규 보류 0을 확인하라.
```
