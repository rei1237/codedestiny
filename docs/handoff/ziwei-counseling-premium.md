---
status: active
updated: 2026-09-08
next: "PR #1823의 최신 검사를 확인하고 사용자가 검토·머지한다. 실서비스 점검은 별도 승인 범위다."
---

# 심화 자미두수 상담 경험 개편

## 왜

/ziwei/chart의 지식 나열을 질문에 먼저 답하는 상담으로 개편한다. 사용자 2026-09-08 “오케이 이렇게 진행해줘”로 HTML 목업을 승인했다.

## 지금 상태

- 격리 워크트리 D:/Development/code-destiny-worktrees/ziwei-counseling-premium, codex/ziwei-counseling-premium. 구현 bcd8e9eab, 사이트맵381b44891 커밋·푸시 완료. PR https://github.com/rei1237/codedestiny/pull/1823. 최신 main c0bc1b86e 반영, 머지는 사용자에게 남긴다.
- 8개 질문 선택, 개인화 Hero, 질문별 답변·행동·근거, 접힌 명반·상세, 프로필 소유자별 캐시 복원과 실제 프로필 변경 이벤트 구현.
- 해석 정본·요약·궁별 상담·15장 PDF 프롬프트 수정. 화면 문자열 임시 치환 없음. 캐시 v10/v4.
- 공유 미리보기→기기 공유/복사. 이름·생일·자유 질문·토큰 제외, 취소는 오류 아님.
- 새 PDF는 공용 텍스트 조판기로 저장. 저장본 일반 문단과 접힌 장 모두 보존. 한글 글꼴 실패 후 재시도 가능.
- Hero/PDF 표지 WebP 한 벌 재사용. 결과390px 기본 높이3239px, 버튼 하단512px(합성 입력·로컬 실제 컴포넌트 기준).

## 유지한 경계

계산·점수·궁 배치·정규화·API/DB 스키마·결제 가격과 이용권/월정석/단건 결제 계약을 유지한다. 출생년 annualFlow를 올해 예측으로 사용하지 않는다. 기존 유료 저장본 재생성/덮어쓰기 없음. 15장 ID·순서·분량 계약 유지. 공용 PDF 폰트 로더의 실패 캐시 해제만 수정했다.

## 검증

- PASS: node scripts/verify-ziwei-consultation.mjs — 5계산 fixture 기준 SHA90b36b7d009b0d88deeaa8bd61a2383f9f696da2 비교,40답변,음력·윤달·시각 미상·무주성 포함.
- PASS: node scripts/verify-ziwei-consultation-browser.mjs — 360/390/430/768/1440,8질문,새로고침,공유 성공·취소·복사 실패·미지원,저장본15장/부분9장,빈 기록·조회 실패,글꼴 실패·재시도,긴 이름,프로필 전환·계산 취소,키보드 포커스,44px CTA,모션 감소,기존 명반 앵커.
- PASS: verify:ziwei-chart-customer-copy, verify:ziwei-deep-counseling-quality, verify:ziwei-deep-report-flow.
- PASS: verify:ziwei-chart-detail-view(48), verify:ziwei-star-parity(21검사/41명/28별), verify:ziwei-borrowed-strength(88검사/336조합).
- PASS: npm run typecheck. check:fast -- --plan은 full/high 범위. check:fast 전체 PASS(종료0), Jest218스위트/2417테스트. 추가 node:test 계산 회귀도 별도 PASS.
- PDF: pypdf로 19쪽/한글25871자/15장 마지막 문장 확인. 긴 첫 문단이 페이지를 건너며 목차·쪽번호·표지·본문 실제 PNG 렌더 검토. 반복 문장은 스트레스 검사용 합성 데이터다.
- 로컬 글꼴 CORS는 공개 기존 폰트 바이트 fixture로 처리. 운영 설정 변경 없음. Windows 기본 CRLF 때문에 기존 yehwa-branch.svg 재현 검사가 실패해 로컬 바이트만 LF로 맞춤(기능 diff 없음).
- 실 LLM·실결제·운영 DB·배포 호출 0회. 브라우저 /api 요청은 전부 Mock. 전체 테스트도 기존 mock-network-guard 사용.

## 정본 예시

app/_lib/ziwei-consultation-narrative.ts → app/components/ziwei/ZiweiConsultation.tsx. PDF: worker/lib/ziwei-deep-report-prompt.mjs → lib/pdf/export-ziwei-report-pdf.ts. 캡처·수치는 docs/design/ziwei-counseling/implementation/.

## 남은 작업

- [x] 독립 리뷰의 천문도 대비·펼침 아이콘 2건 resolved, disposition: ship(해당 수정 범위).
- [x] check:fast 전체 PASS, handoff 계약113문서 PASS.
- [x] 변경 파일 커밋·푸시·PR #1823 생성, CI 실행/검사 조회. 최신 커밋의 최종 결론은 PR Checks가 정본이다. 머지하지 않았다.
- [ ] 실제 결제/LLM/실물 모바일 기기 검증은 이번 Mock 검증 범위 밖이며 미실행.

## 함정

공유는 고정 진입 URL만 사용한다. 프로필이 바뀌면 PDF 패널을 새로 마운트해 이전 개인 질문을 제거한다. 저장본 표지 이름은 현재 프로필에서 가져오지 않는다. 브라우저 테스트는 실제 document destinyProfileChanged 이벤트를 사용한다. 별도 브라우저 스크립트로 실행하며, 계산·문장 회귀는 node:test/CI에도 연결했다.

## 모르는 것

실제 LLM 출력의 문체 품질은 실호출 금지 조건으로 검증하지 않았다. 프롬프트 계약·Mock 결과로 확인했다. 실제 출력은 승인된 운영 점검에서 확인해야 한다.

## 이어서 실행

D:/Development/code-destiny-worktrees/ziwei-counseling-premium의 docs/handoff/ziwei-counseling-premium.md를 읽고 PR #1823 최신 검사부터 확인해줘. 실제 LLM·결제·DB·배포·머지는 실행하지 마.

최신 main 반영 후 sitemap:generate / verify:sitemap-drift / verify:public-mirror-fresh PASS. 로컬 최종 check:fast 재실행 로그는 implementation/check-fast-final.log(비추적), CI는 PR의 최신 커밋을 기준으로 읽는다. 기존 lint 경고는 유지하며 새 타입 오류는 없다.
