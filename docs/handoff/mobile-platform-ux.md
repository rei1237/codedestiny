---
status: done
updated: 2026-09-08
next: 로컬 전체 검사와 PR #1824 최신 CI를 확인한다. 필수 검사가 모두 통과하면 사용자 승인 후 머지·스테이징 SHA를 검증한다.
---

# 모바일 플랫폼 UX와 기능별 상세페이지

## 전달 상태

- 브랜치: `codex/mobile-platform-ux-20260908`
- 초안 PR: https://github.com/rei1237/codedestiny/pull/1824
- 작업 경로: `D:\Development\code-destiny-mobile-platform-ux`
- 운영 배포·실결제·실 LLM·운영 DB 쓰기 없음

## 완료한 범위

- 모바일 찻집 대기 화면 중첩 장식 제거, 질문 초안 보존, 240ms 강제 홈 이동 제거.
- React 공유 fallback을 공통 서비스로 연결. 개인 결과 공개 공유 백엔드는 만들거나 활성화하지 않음.
- 레지스트리 69개 목적지를 64개 고유 기능으로 정규화. 구현 근거를 확인한 62개에 독립 소개주소·canonical/OG·기존 CTA 제공.
- 소개 목록 slug 중복 제거. 검색, 7개 분류 필터, 검색 빈 상태와 복구 추가.
- 기능별 마케팅 정본을 SVG/HTML 편집형 핵심 흐름 미리보기로 재사용. 개인 결과를 가장하지 않음.
- 정적 팝업은 CSS 로드 완료 후에만 기존 설명을 감춤. CSS 실패 시 기존 설명 유지와 재시도 제공. 비한국어 locale 전환 시 한국어 상세 패널 제거.
- `/app/` Neo 유료 카드는 상세 모달을 열고, 모달 CTA가 `/neo-operation-room/`으로 이동한다. Escape와 카드 포커스 복귀를 검증한다.
- 생성 JSON 원자 교체. 동시 dev 렌더의 일시적 `Unexpected end of JSON input` 방지.

## 제외한 범위

- `points`: 이용권 상점이며 결과 상세 기능이 아님. 결제 정책을 소개 콘텐츠로 재해석하지 않음.
- `face-reading`: 현재 레지스트리 CTA가 관상 대신 `/saju-guardian`으로 연결됨. 잘못된 CTA 공개 대신 source-inventory-only 유지.
- 개인 결과 공개 요약·소유권·90일 만료 백엔드: 개인정보·DB 범위. 상세 소개 UX 완료를 위해 임의 구현하지 않음.
- 운영 Kakao 설정, 실기기 iOS/Android, 운영 CWV: 외부 환경 미검증.

## 검증

정본 명령:

```powershell
Set-Location -LiteralPath 'D:\Development\code-destiny-mobile-platform-ux'
npm run sync:public
node --test __tests__/ui/feature-detail-preview.test.mjs __tests__/ui/feature-visual-details.test.mjs __tests__/ui/share-service.test.mjs
npm run typecheck
npm run verify:mobile-detail-nonintrusive
npm run verify:mobile-detail-render
$env:MOBILE_AUDIT_ORIGIN = 'http://127.0.0.1:26504'
node scripts/test-feature-visual-details-mobile.mjs
npm run check:fast
npm run verify:public-mirror-fresh
```

62개 상세주소 검증은 직접 진입·새로고침·OG·CTA·320/360/375/390/412/430/768/1280px overflow를 포함한다. 최신 실행 결과는 커밋과 PR 검사에 맞춰 최종 보고한다.

## 재개

정확한 복사용 명령은 [RESUME.md](../mobile-platform/RESUME.md)에 있다. 머지·스테이징은 사용자 승인 전 실행하지 않는다.
