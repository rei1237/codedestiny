# 운영 비용 보고 (OPERATING_COST_REPORT)

2026-11-28. 이번 묶음은 **새 유료 API·SaaS·요금제를 추가하지 않았다.**

| 추가된 것 | 비용 | 근거 |
|---|---|---|
| GitHub Actions 감시(30분, 1회 약 10초~2분) | 0원 | 공개 저장소는 Actions 분 무료. npm ci 없음, sparse checkout |
| 10분 cron 작업 3개(환불 재시도·실행 스윕·검토 알림) | Workers 요금제 안 | 기존 10분 cron 안의 waitUntil. 대상이 없으면 Mongo 조회 몇 번뿐 |
| Mongo 조회 증가 | 추정 미미 | 각 작업 tick당 상한(5~10건), 인덱스 필드 조건. 운영 실측 없음 |
| 과금 LLM 호출 | 0 | 이번 묶음에서 실호출 없음. 자동 복구는 기존 재생성 경로만 씀 |

## S9 고객센터 (구현, 2026-11-28)

- 공급자: 기존 Cloudflare Workers AI 바인딩 우선, 실패 시 기존 Gemini flash 1회. 새 계약·키 없음.
- 호출 상한(코드 상수, `worker/yeongnyangi/support.ts` `SUPPORT_LIMITS`): 사용자 하루 10회, 전체 하루 300회, 전체 30일 3,000회. 카운터를 못 읽으면 호출하지 않는다(fail-closed). 따라서 **최악의 경우 LLM 호출은 월 3,000회**를 넘지 않는다.
- FAQ 키워드 일치·1층 카드(주문 목록)는 LLM 을 부르지 않는다. 1층은 기존 `GET /api/yeongnyangi/requests` 1회, 2층은 상한 카운터 upsert 3회 + 요청 조회 1회(최대 10건, 4초 제한).
- 호출당 크기(추정, 실측 아님): 입력 = 시스템 지시 + 상담 가이드(약 3.6KB, `applyOutputLocale`) + 지식 JSON + 주문 요약, 출력 상한 1,024 토큰·thinking 0.
- 실제 비용·무료 할당 안 여부: **NOT_TESTED**. 실호출은 정확한 1회 승인 뒤 측정해 이 표에 적는다.
