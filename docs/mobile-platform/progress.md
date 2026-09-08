# 모바일 UX 개선 진행 보고 — 2026-09-08

구현 완료, PR 검토 단계. 배포 완료 보고가 아니다.

## 핵심 결과

- 찻집: 대기 화면 중첩 이미지·장식 제거, 질문 초안 복원, 320~1280px overflow 없음.
- 라우팅: `history.back()` 뒤 240ms 강제 홈 이동 제거. `/app/` Neo 유료 카드는 상세 모달을 열고 CTA에서 작전실로 이동하는 계약 유지.
- 공유: Kakao/native/clipboard 실패 결과를 공통 서비스로 정리. 개인 결과 공개 공유는 활성화하지 않음.
- 상세 소개: 등록 목적지 69개를 64개 고유 기능으로 정규화. 실제 소스를 확인한 62개 공개, `points`와 잘못 연결된 `face-reading` 제외.
- 목록 UX: 기능명·고민 검색, 7개 분류 필터, 빈 상태 복구, slug 중복 제거.
- 상세 UX: 대표 이미지 → 한 줄 핵심 → 제공 내용 → 이용 순서 → 기존 가격/CTA. 기능별 SVG/HTML 미리보기는 실제 마케팅 정본을 사용하며 개인 결과를 가장하지 않음.
- 정적 팝업: CSS 로드 성공 후 교체. 실패 시 기존 설명 유지와 재시도. 비한국어 locale에서는 한국어 패널 제거.
- 생성 안정성: JSON 임시 파일 완성 후 원자 교체. dev/build의 부분 JSON 읽기 방지.

## 검증 범위

- 62개 소개주소: 직접 진입, 새로고침, canonical/OG, CTA, 320/360/375/390/412/430/768/1280px.
- 목록: 62개 고유 링크, 검색, 결과 없음, 전체 복구.
- 정적 팝업: CSS 대기·실패 fallback·locale 제거 단위 검사.
- 공통 상세·공유 단위, typecheck, mobile detail 비침입/렌더 검사.
- 실제 LLM·PG·운영 DB·배포 사용 없음.

최신 명령·PR 상태는 [handoff](../handoff/mobile-platform-ux.md), 기능 범위는 [coverage](feature-detail-coverage.md)를 따른다.

## 남은 외부 확인

- 최신 PR CI. 과거 `Static guards` 실패는 `verify:quantum-card-cascade` 10초 timeout이었고 같은 커밋 로컬 재실행은 통과했다. 새 head CI로 판정한다.
- 실기기 iOS/Android, 운영 Kakao 도메인/키, 배포 후 CWV.
- 머지·스테이징·운영 승격은 사용자 승인 전 실행하지 않는다.
