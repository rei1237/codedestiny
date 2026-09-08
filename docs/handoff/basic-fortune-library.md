---
status: active
updated: 2026-09-08
next: "PR 검사와 남은 키보드·탐색 검증을 확인한다. 점성술 신규 요약 화면은 재도입하지 않는다."
---

# 기본 운세 결과 모달

## 지금 상태

`codex/basic-fortune-library`에서 숙요점·자미두수 표시 계층을 개선했다. 사용자 요청으로 새 점성술 요약·탭과 로컬 캡처를 제거하고 원래 점성술을 유지했다. 머지·배포하지 않았다.

## 남은 확인

- [ ] PR CI 최종 상태 확인. 모든 필수 검사 성공이 기준이다.
- [ ] 키보드만으로 모달 열기→상세 펼치기→닫기와 포커스 복귀, 브라우저 뒤로가기 2종을 별도로 확인한다. 현 mock 검사는 클릭·새로고침 중심이다.
- [ ] 기존 상세 해석의 언어 혼용을 검토한다. 신규 공통 레이블 5개 언어와 긴 이름은 검사했지만 기존 리포트 전체 번역을 교정하지 않았다.
- [ ] 운영 환경의 LCP·CLS는 배포 후 별도로 측정한다. 로컬 단일 mock 관측을 운영 성능으로 일반화하지 않는다.

## 정본

설계·재현 명령: `docs/design/basic-fortune-library.md`.
계산 회귀·화면 검사: `scripts/verify-basic-fortune-library.mjs`.

## 검증

세 계산 fixture 동일성, 360·390·430·768·1280px 넘침 없음, 궁 선택, 긴 이름·5개 언어, 빈 프로필·정보 일부 누락·새로고침·로딩·오류 복구·모의 공유 검사 통과. 로컬 산출물은 `.impeccable/basic-fortune/`에 보관하며 커밋하지 않는다.

`verify:mobile-detail-nonintrusive`, `verify:mobile-detail-render`, `verify:hero-contrast` 통과. 모바일 정적 fixture 검사는 일부 runtime 제목을 검사하지 않으므로 위 실제 렌더 mock 검사와 함께 해석한다. 실 LLM·결제·운영 DB 호출은 수행하지 않았다.
