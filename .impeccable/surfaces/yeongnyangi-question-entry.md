# 영냥이 홈 질문 선택

Primary target: app/components/QuestionJourney.tsx
Related targets: app/components/QuestionJourney.module.css
Mode: Operate — 내 고민을 적거나 가까운 질문을 골라 상담 범위를 확인한다.

## 2026-10-19 사용자 첨부 화면의 개선
- 제목과 직접 입력 CTA를 첫 그룹으로 묶고 기존 영냥이 밤색·금색 토큰을 사용한다. 캐릭터는 기존 hero-480.webp 원본을 재사용한다. 새 이미지나 폰트 없음.
- 질문 8개는 카드 테두리 대신 가는 구분선으로 나눈다. 모바일은 한 열, 데스크톱은 두 열. 선택 상태는 체크 아이콘과 금색 구분선으로 표시한다.
- 선택한 질문의 상담 안내를 목록 바로 아래, 추가 질문 탐색 앞에 배치한다. 기존 102개 질문 검색·분야 필터·추가 로딩, 가격 레지스트리와 이동 경로를 유지한다.
- 변경 범위는 홈 질문 영역. FreeQuestionNext, 결제·인증·API·DB·계산·생성 계약은 유지한다. 공개 제목/본문/내부 링크는 기존 서버 HTML에 유지하며 canonical/robots 정책 변경 없음. sitemap 원장은 생성기로 갱신한다.

## 검증
- 공통 theme-tokens.css를 포함한 mock fixture: 360/390/430/1440px 홈·질문·신점 12개 캡처 PASS. 가로 넘침·이미지 누락·React 오류 없음.
- 질문 키보드 선택, 선택 안내의 탐색 영역 앞 배치, 검색 결과 없음, 직접 입력 링크 검증 PASS. 외부 API·결제·DB·LLM 호출 없음.
- 독립 시각 검토 PASS: 제목/직접 쓰기/질문 목록 위계와 긴 문장의 줄바꿈 확인. 고정 하단 내비게이션은 전체 요소 캡처에 함께 찍히므로 운영 viewport 동작은 릴리스 뒤 별도 확인한다.
- Impeccable detector: findings []. 수정 파일 ESLint 오류 없음(기존 a/img 경고 유지).
- check:fast는 로컬 sandbox loopback 제한으로 전체 paid-gate-suite의 계산 fixture 검증 실패. UI fixture는 loopback 허용 환경에서 통과. 전체 판정은 공식 GitHub CI를 따른다.
- Finish: ship — mock UI/독립 시각 검토 범위. 운영 릴리스와 실제 사이트 확인은 별도 증거로 보고한다.
