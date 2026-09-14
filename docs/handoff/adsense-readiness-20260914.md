---
status: active
updated: 2026-09-14
next: "sukuyo-useo, vedic-retrograde-planets-practical-decoding, career-luck-interview-exam-prep-strategy 순으로 과장·현실 결과 단정 감사를 이어간다."
---

# AdSense 승인 준비 인수인계

2026-09-14 KST. **NOT READY**. Google 계정에는 계속 `low value content`가 표시되며, 공개 `ads.txt`의 HTTP 200과 계정의 `찾을 수 없음` 상태가 일치하지 않는다. 재심사 버튼, 광고 활성화, CMP 계정 설정은 변경하지 않았다.

## 이번 변경

- 2026-09-09 선별 감사에서 지목한 `sukuyo-antai`, `sukuyo-ankai`, `vedic-astrology-navamsa-basics`, `tarot-major-arcana-22-complete-meanings`를 수정했다.
- 숙요 관계명을 운명·전생·재회·사업 성공·성별 역할의 증거처럼 제시한 문장을 계산 표지와 실제 관계의 동의·안전·경계 질문으로 바꿨다.
- D9를 행성의 진짜 힘이나 최종 판정으로 제시한 문장과 출전 없는 인용을 제거했다. 학파 차이와 과거의 성별 이분법적 관행을 명시했다.
- RWS 계열 덱과 현대의 바보의 여정 설명 틀을 구분했다. 임신·합격·화해·치료·법적·사업 결과는 카드가 확인하지 않는다고 명시했다.
- AI 편집 검토 원장을 20편에서 24편으로 확장하고 원고 해시를 고정했다. `humanReview: unconfirmed`, `adsAllowed: false`는 유지했다.
- 위험 문구가 다시 들어오면 실패하는 검사를 `scripts/verify-editorial-manuscripts.mjs`에 추가했다.

## 현재 판정

- 운영 잠정 AdSense Ready Score: **67/100 유지**. 이번 변경을 운영 배포와 전체 질적 감사로 간주하지 않는다.
- AI 편집 검토 24편, 인간 전문가 검수 확인 0편, 광고 허용 0편.
- 씨드 전체와 유명인·도구·가이드·다국어 페이지의 질적 감사는 남아 있다.
- 다음 고위험 감사 대상은 `sukuyo-useo`, `vedic-retrograde-planets-practical-decoding`, `career-luck-interview-exam-prep-strategy`다.

## 검증

- 구현 커밋: `7af0e16fcf5cc67eae58836a3299b818209241d8`
- `node scripts/build-editorial-review-packet.mjs`: 24편 검수 묶음 생성, 승인 생성 0.
- `node scripts/verify-editorial-manuscripts.mjs`: 24편 해시·제목·검수/광고 미승격 확인.
- `npm run verify:adsense-route-policy`: 통과.
- `npm run verify:adsense-readiness`: 오래된 `dist/index.html`에 `/about` 링크가 없어 실패했다. 소스 기준 검사가 아니라 기존 빌드 산출물 불일치이므로 새 CI 빌드에서 재확인한다.
- `npm run check:fast`: 통과. 결제 안전 88개, Node 1,086개, Jest 2,730개, lint, typecheck, sitemap 1,264 URL 정합, Worker dry-run을 포함했다. 실 LLM·실결제 호출은 없었다.

## 유지한 영역

결제 가격·이용권·월정석·단건 결제·환불 조건·인증·API·DB·실 LLM·실결제는 변경하지 않았다. AdSense 계정의 재심사, 광고 활성화, CMP 게시도 실행하지 않았다.

## 재개 정보

작업 디렉터리: `D:\Development\code-destiny`

재개 지시: `D:\Development\code-destiny`에서 이 문서를 읽고 main이 clean한지와 구현 커밋 `7af0e16fcf5cc67eae58836a3299b818209241d8` 및 최신 main CI를 확인한 뒤 `sukuyo-useo` 품질 감사부터 이어간다. 사람의 실제 확인 없이 인간 검수나 광고 허용을 부여하지 않는다.
