---
status: active
updated: 2026-09-26
next: "한국어·영어·일본어 구매 locale 계약과 서버 주문·환불 집계부터 이어서 구현한다."
---

# 영냥이 SEO·다국어·구매 전환 후속 작업

## 현재 전달

- 작업 디렉터리: `D:\Development\code-destiny`
- 상세 근거: `D:\Development\code-destiny\docs\seo\yeongnyangi-conversion-20260926.md`
- 구현 포함 main 커밋: `e14b98741a22f5366f35a40364465619813b0350`, origin/main push 완료.
- CI: [main 실행](https://github.com/rei1237/codedestiny/actions/runs/36171364401). 기록 시 실행 중이며 최종 상태는 이 링크로 확인한다.
- 구현: 질문 CTA의 ask 선택, 먼저 보이는 편집 예시와 sample_view, 360/390px 동선, 꽃돼지 번역 홈의 상호 hreflang·사이트맵. 가격·권리·인증·결제·DB 변경 없음.
- 검증: check:fast Node 1663/Jest 4207 통과, 최종 관련 16개 테스트, analytics·sitemap·미러 검증 통과. 실 PG/LLM·운영 DB 검증 아님.
- 동시 세션의 마케팅 변경 및 미추적 문서는 보존했다. 다른 작업의 질문 근거 엔진은 이 작업 성과에 포함하지 않는다.
- 운영 승격은 실행하지 않았다. 조사 시 운영 Pages/Worker SHA는 모두 `c54484ac0ff59e8eb06b36860bbc34e1e1aee928`. push나 CI를 운영 배포로 보고하지 않는다.

## 확인된 사업 기준선

GSC 최근/이전 28일: 클릭 9/6, 노출 99/136, CTR 9.1%/4.4%, 순위 25.3/27.9. 천원 안내는 색인됐고 Google canonical이 일치한다. 네이버 최근 30일은 2.2k 클릭/330k 노출, 무료 일별 운세 중심이다. GA4 최근 28일은 상품 조회 121·구매 1이며 상품 ID로 사주 고등어 조회 43·구매 1이 연결된다. 항목 이름의 not set을 미판매로 오인하지 않는다. 고객·테스트 구분과 환불 대조 전에는 이 값을 고객 구매율·순매출로 쓰지 않는다.

## 남은 범위와 첫 행동

1. `app/yeongnyangi/_components/Consultation.tsx` → `worker/yeongnyangi/service.ts` → fortune providers의 locale 전달과 주문 snapshot/재시도/validator를 좁게 추적한다. 한국어 고정 UI와 한국어 결과 계약을 함께 풀어야 한다. UI만 번역해 영어 결과를 제공한다고 약속하지 않는다. 기존 결제·권리와 시간대 계산은 유지한다. 다른 활성 질문 엔진 세션과 편집 파일이 겹치면 기존 안전 워크트리 절차를 따른다.
2. 최소 운영 읽기 전용 내보내기를 확보한다: 최근 56일 날짜·불투명 주문 ID·상품·locale·승인 시각/금액·결과 상태/완료 시각·환불 금액·시도/토큰/비용. 질문·출생정보·이름·이메일·결과 본문은 제외한다. 접근/제공 요청은 이미 전달했으며 답변 미수신이다.
3. 기존 GA4 표준 사건을 유지하며 auth/profile/PG 시간과 서버 결과·환불을 연결한다. 승인 기준 purchase transaction_id 중복 억제를 보존하고, 기존 개인정보 최소화 계약을 검토한 뒤 opaque ID 연결을 설계한다.
4. mock에서 결제 취소·만료·복귀·중복 confirm/webhook·부분 챕터·재열람을 검증한다. 현재 로컬 dev fixture는 영냥이 catalog/profile route가 없어 실제 UI 결제 이후는 검증하지 못했다. mock 실패를 운영 장애로 혼동하지 않는다.
5. 7/14/28일은 **승인된 운영 반영일**부터 관찰한다. 상세 보고서의 분모·최소 표본·중단 기준 사용. 자동 일정은 만들지 않는다.

## 재개 지시

`D:\Development\code-destiny`에서 `D:\Development\code-destiny\docs\handoff\yeongnyangi-seo-conversion-20260926.md`를 읽고, main의 미커밋 변경을 보존하면서 `e14b98741a22f5366f35a40364465619813b0350` 포함 여부와 CI 결과를 확인한 뒤 한국어·영어·일본어 구매 locale snapshot 및 생성·보관함 계약부터 이어서 구현하라. 실 과금·운영 DB 쓰기·프로덕션 승격은 별도 승인 없이 실행하지 말라.
