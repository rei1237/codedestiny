---
status: active
updated: 2026-09-25
next: "C1+C2+C4 와 함께 챕터 생성 수정 5건이 프로덕션에 오른 뒤, 새 유료 상담이 몇 건 쌓이면 읽기 전용 감사로 첫 시도 실패율을 다시 잰다."
---

# 영냥이 상담 결과 첫 시도 통과율

다음 세션 첫 문장: 이 문서의 '다음'을 읽고, 프로덕션 승격 여부를 확인한 뒤 승격 이후 요청만 골라 `recoveryAudit` 실패 코드를 다시 집계한다.

## 왜

> 로그인 재조회 말고 영냥이 운세 상담 결과가 한번에 정확하게 제대로 생성되도록 최적화해줘 (2026-09-24)

## 실측(운영 DB 읽기 전용, 2026-09-24 23:56 KST)

`node scripts/audit-yeongnyangi-paid-without-result.mjs --db code_destiny --json` 과 같은 방식의 읽기 전용 조회(ID·본문 무출력). 유료 요청 4건 중 실패 기록이 있는 2건은 둘 다 `saju_mackerel`(`destiny-book-v6`, 5장).

| 장 | 코드 | 횟수 | 원인 |
|---|---|---|---|
| 5장(action) | `INVALID_CHAPTER_BLOCKS` | 5회(자동 중단 2회, 수동 재시도로 통과) | action 소절 목표 526~614자 > 문단 상한 500자 |
| 2·3장 | `INTERNAL_EVIDENCE_EXPOSED` | 2회(각 1회, 재시도로 통과) | 첫 시도에 영문 근거 키·내부 ID가 본문에 섞임(정확한 문자열은 저장되지 않아 미확인) |
| 2장 | `RESULT_STORAGE_UNAVAILABLE` | 1회 | DB 저장 실패 — DB 세션 소유 |

첫 시도 기준: 약 10장 중 `INTERNAL_EVIDENCE_EXPOSED` 2장(표본 작음). 스테이징에는 실패 기록 0건.

## 한 일

- 이전 세션(2026-09-24, 이 문서 없이 끝남): `f8ee0cd5c` 블록 거부 사유 기록 · `74c2e7a5b` 500자 초과 소절을 문장 끝에서 분할 · `7f9eb015a` 재시도에 실패 규칙 재진술 · `ed5d0c32d` 품질 실패 재시도 5초. 5장 실패는 `74c2e7a5b` 가 겨냥한다.
- 이 세션(`f60318a2c`): 첫 시도 프롬프트를 판정기와 맞췄다(`worker/yeongnyangi/providers/chapter.ts`). 날짜 롤링 사이트맵은 `7dccf7544` 로 분리.
  - `evidencePresentation` 이 재시도 전용이던 `INTERNAL_EVIDENCE_EXPOSED` 규칙 전문(필드 목록·영문 키·시스템 이름·ID는 sources에만)을 처음부터 싣는다. 재시도 2/2가 이 규칙으로 통과한 것이 근거.
  - `paidScope`(고등어·연어·광어)가 `TIER_SCOPE_VIOLATION` 규칙 전문을 싣는다 — 이전 문구 "전문 해석 금지"는 "용신은 다루지 않습니다" 같은 부정문을 유도했고, 판정기는 부정문도 거부한다.
  - 같은 등급에서 `professionalEvidenceNames` 가 '용신과 희신'·'대운의 흐름'을 빼고 보낸다(판정기 금지어와 같은 목록).
  - 판정기·재시도 횟수·스키마는 바꾸지 않았다. 영성·질문 하늘 장은 자체 규칙을 그대로 쓴다.
- 검증: `__tests__/ui/yeongnyangi-section-paragraphs.test.mjs` 에 1건 추가, 변이 3종(각 규칙 되돌림)이 각각 실패시킴. 관련 node 테스트 4파일 30/30. 실 LLM 호출 0 — 실제 통과율 개선은 미검증(추정).

## 다음

1. 프로덕션 승격은 별도 1회 승인 — C1+C2+C4(`docs/handoff/yeongnyangi-paid-result-attach-503.md` 소유)와 같은 승격에 실린다.
2. 승격 뒤 새 요청만 대상으로 `recoveryAudit` 의 `retryable_failure` 코드·`detail` 을 다시 집계한다. `INTERNAL_EVIDENCE_EXPOSED` 가 또 나오면 어떤 키가 샜는지 모르므로, 그때는 판정기에 `detail`(매칭된 키 이름, 모델 본문 아님)을 붙이는 것부터 한다.

## 범위 밖(보고만)

- `RESULT_STORAGE_UNAVAILABLE` 은 DB 연결 축(`worker/lib/db.js`) — 503 문서 소유.
- 실패한 초안은 저장되지 않아 원인 문자열을 사후에 볼 수 없다.
