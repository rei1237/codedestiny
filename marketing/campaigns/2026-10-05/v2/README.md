# 10장 캠페인 — 설명형 홍보 개편

상위 preview.html은 갤러리가 아닌 서비스 설명형 랜딩이다. 현재 10번은 무료 체험→상담→소장·리포트 활용 안내다. 과거 사례 카드는 사용하지 않는다.

- 순서: manifest.json, 원본 1번 보존
- 원고: posts.json 및 상위 captions.md
- 새 오행 화면: assets/reading-elements-refined.jpg, ReadingVisuals의 공유 ElementDistribution 실제 렌더
- 7번 차트: 가상 입력·운영 반영 전 표시 유지
- 이미지 제작 원본과 프롬프트: card-*.html, art/, generation-prompts.json
- 시각 검토: 별도 reviewer SHIP. 상세 디자인 기록은 상위 design-notes.md
- 게시 조건: 10/5 09:00 KST, 운영 가격·부분 할인·개선 UI 반영 및 실제 게시 계정 확인 후 실행

차트는 저장된 값과 기존 최댓값 기준 막대 비례를 유지한다. 계산 근거 표의 브라우저 기본 meter를 본문 차트와 같은 컴포넌트로 표시하고 화면의 최댓값과 접근성 meter 최댓값을 일치시켰다. 수치를 새 점수나 적중률로 해석하지 않는다.
