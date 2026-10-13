---
status: active
updated: 2026-10-14
next: "구현·mock 검증 완료. 2026-10-14-consultation-followup-progress.md에서 main 전달 CI를 확인한다"
---

# LLM 상담 PDF와 가입 로그인 후속 작업

## 후속 구현 상태

네 작업과 추천 홈/상담 품질 지침을 구현했고 check:fast가 통과했다. 세부 증거와 남은 main CI 확인은 [후속 전달 문서](2026-10-14-consultation-followup-progress.md)를 따른다. 아래의 500개 정책과 미재현 표기는 인수인계 당시 기록이며, 신규 가입 정책은 현재 2,000개/30일로 구현했다.

## 왜

반복 설명 대신 합리적인 세부 질문의 챕터를 추가한다. PC 글꼴·PDF 첫 페이지 깨짐·페이지 경계 잘림을 개선한다.
이메일 가입·로그인을 고치고 카카오톡 가입을 우선 안내한다.
팝업 문구 목표는 “카카오톡으로 1분 가입”, “가입하면 2만원 할인에 쓸 월정석 지급”이다. 사용자 요청대로 구현을 다음 세션에 인수인계한다.

## 지금 상태

- main 구현·운영 기준 `cb4e36dac01ec12d1a6079f4e0bc8cd03435d974`: push·공식 CI·운영 양쪽 SHA 검증 완료. 증거는 `build-cache/yn-quality-release-20261014/release-receipt.md`.
- 이번 변경은 문서뿐이다. 첨부의 PC/PDF/이메일 실패는 미재현 제보다. 발신자 개인정보·이미지는 Git에 저장하지 않는다.
- 첫 가입은 현재 월정석 500개(5,000원 상당), 30일 유효. 팝업은 비회원 뒤로가기/종료에 페이지당 1회, 오늘 숨김 적용. 로그인 회원에게 안 뜨는 것은 현재 조건이다.

## 남은 작업

- [x] **이메일 2경로 우선:** 가입→로그인과 기존 회원 로그인을 재현한다. 이메일 정규화·비밀번호·OAuth 전용 계정·CSRF·쿠키/토큰·복귀/세션 복원을 분리한다. 정상/오류 비밀번호·만료·재로그인·네이버/카카오·보관함을 mock 회귀한다. 이메일 경로를 숨겨 해결하지 않는다.
- [x] **초융합 1개부터:** 기존 consultationPlan.questions/subchapters로 질문·근거·새 판단 역할을 배정한다. 대안 비교, 판단이 바뀌는 조건, 현실 점검, 실행 계획으로 반복 분량을 교체한다. 같은 문장과 의미 반복을 전후 비교하고 기타 LLM 상담 목록·개수를 확정해 적용한다. 계산·체계 구분·구매 계약을 살리고 반복만으로 새 폐기/환불 조건을 만들지 않는다.
- [x] **PC/PDF:** 초융합 후 PDF 호출부를 목록화한다. 실제 조판/캔버스 경로별 글꼴 로딩·한글·굵기·줄높이·여백·분할을 점검한다. 표지·긴 문단/표·경계·끝 페이지를 실제 PDF로 렌더해 깨짐·잘림·겹침·빈 페이지가 없음을 확인한다. Windows Chrome/Edge 1280/1440px, DPR 1/1.25 및 모바일 360/390/430px 비교. PDF 저장 UI도 읽기 좋게 하고 기존 모바일 가독성을 보존한다.
- [x] **가입 혜택/팝업:** 2만원은 현재 정책과 다르므로 환산 정본 확인 후 신규 지급 목표 2,000개에 서버·멱등 원장·표시·번역을 맞춘다. 상품 적용/차감 조건과 30일 기한을 안내하며 현금 쿠폰으로 쓰지 않는다. 기존 회원 소급/중복 지급 없음. 카카오 우선 CTA·이메일 대안을 유지하고 1분은 실제 필수 입력 흐름을 확인한다. 첫 방문 비회원이 발견할 수 있게 노출하며 인증 확인 중/회원·숨김·재방문·로그아웃·OAuth 취소를 검증한다. 회원은 가입 유도 대신 실제 월정석 잔액/혜택을 안내한다.

## 정본 예시

- 질문: `worker/lib/fusion-fortune-prompt.js:816`; `worker/lib/fusion-fortune-consultation.js`; `worker/yeongnyangi/providers/chapter.ts`.
- 글꼴/PDF: `app/fusion-fortune/fusion-fortune.module.css:28`; `lib/pdf/export-fusion-report-pdf.ts:155`; `lib/pdf/export-result-pdf.ts:85`. 공용은 글꼴 실패 시 기본 서체 fallback, 초융합은 오류를 반환한다. 원인으로 단정하지 않는다.
- 인증/혜택: `app/login/LoginClient.tsx`; `app/signup/SignupClient.tsx`; `app/_lib/auth-client.ts`; `worker/routes/auth.js:91`; `js/signup-benefit-exit.js:22`; `app/components/SignupChannelInvite.tsx`; `index.html:10231`.

## 검증과 모르는 것

오류 코드·환경·원본 PDF는 미확인이다. 먼저 합성 입력/저장본으로 재현하고 필요하면 개인정보 없이 OS/브라우저·순서·오류·페이지 번호를 확인한다. PDF 작업은 렌더 검수 스킬을 적용한다. `CLAUDE.md`와 AI/결제/전달 문서를 따른다. 구매 결과를 재생성/삭제하지 않는다. 이전 실호출·운영 승격 승인은 완료된 캠페인이므로 후속 실호출·실결제·운영 DB 쓰기·승격은 별도 범위다. 다른 세션 파일과 `scripts/grant-family-pass.mjs` 및 첨부의 가족 이용권 요청은 이 범위에서 제외한다.

```powershell
npm run verify:auth-p0p1
npm run verify:auth-session-stability
npm run verify:signup-phone-required
npm run verify:fusion-fortune-pdf
npm run check:fast
npm run check:pre-push
```

후속 완료 기준: 재현 사례 개선, 실제 PDF 렌더 증거, 인증/보상 mock 회귀, main CI 통과. 이번 문서 검증과 기능 검증을 구분한다.

## 재개

```text
D:\Development\code-destiny에서 D:\Development\code-destiny\docs\handoff\2026-10-14-llm-pdf-auth-signup-followup.md를 읽고 이어서 작업해. 기준 구현 SHA는 cb4e36dac01ec12d1a6079f4e0bc8cd03435d974다. 먼저 mock·저장 결과로 이메일 로그인과 초융합 PC/PDF 문제를 재현하고 가입 월정석 정본을 확인해. 네 후속 작업을 구현해. 실호출·실결제·운영 DB 쓰기·승격은 별도 범위다.
```

문서 커밋은 `git log -1 -- docs/handoff/2026-10-14-llm-pdf-auth-signup-followup.md`로 확인한다.
