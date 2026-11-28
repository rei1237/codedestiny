# 운영 비용 보고 (OPERATING_COST_REPORT)

2026-11-28. 이번 묶음은 **새 유료 API·SaaS·요금제를 추가하지 않았다.**

| 추가된 것 | 비용 | 근거 |
|---|---|---|
| GitHub Actions 감시(30분, 1회 약 10초~2분) | 0원 | 공개 저장소는 Actions 분 무료. npm ci 없음, sparse checkout |
| 10분 cron 작업 3개(환불 재시도·실행 스윕·검토 알림) | Workers 요금제 안 | 기존 10분 cron 안의 waitUntil. 대상이 없으면 Mongo 조회 몇 번뿐 |
| Mongo 조회 증가 | 추정 미미 | 각 작업 tick당 상한(5~10건), 인덱스 필드 조건. 운영 실측 없음 |
| 과금 LLM 호출 | 0 | 이번 묶음에서 실호출 없음. 자동 복구는 기존 재생성 경로만 씀 |

## 다음 묶음(S9 고객센터) 예상

- LLM: Cloudflare Workers AI 우선(무료 할당 안), Gemini flash 대체. 일·월 상한과 사용자·IP 제한을 둔다.
- 실제 비용은 S9 구현 뒤 로그로 측정한다. 지금 수치는 없다 — NOT_TESTED.
