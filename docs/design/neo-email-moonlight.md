# 네오 이메일 상담 — 달빛 예화

status: done

2026-10-16 사용자 승인: 청색·남색, 달빛 아이보리, 금선. 화면에 콘셉트 이름을 인쇄하지 않는다. 기존 인간형 네오를 유지하고 홈 진입점과 상담 화면을 함께 다듬는다.

## 화면 계약

- 홈의 기존 네오 카드 하나를 추천 서비스 앞에 유지한다. 모바일 읽기 순서는 설명 → 질문 작성 버튼 → 초상이다.
- 상단은 생성 달빛 목련 배경과 기존 네오 초상 금선 달문으로 구성한다. 입력 영역은 아이보리, 본문은 청색으로 충분한 대비를 둔다.
- 주요 버튼은 청색 바탕·아이보리 글자·금선 이중 테두리, 보조 버튼은 밝은 면·청색 글자, 삭제는 텍스트형이다. 최소 높이 48px, 포커스 표시, 처리 중 비활성 상태를 유지한다.
- 색은 theme-tokens.css의 상담 전용 --cd-neo-letter-* 토큰을 사용한다. 다른 상품의 테마는 바꾸지 않는다.
- 키보드가 가릴 수 있는 고정 결제바를 만들지 않는다. 합계와 확인 버튼은 문서 흐름에 둔다.

## 자산 출처

- 인간형 네오: 기존 public/images/master-profiles/neo-strategy-portrait.webp, 원본 무수정.
- 생성 도구: built-in imagegen, 2026-10-16. 원본 exec-66fab7f0-954c-4f87-b659-15c42ad7518e.png.
- 생성 배경: public/images/neo-consultation/moonlight-garden-1536.webp (1536×1024, 102674 bytes), moonlight-garden-768.webp (768×512, 28856 bytes).
- 최적화: 원본 비율 유지, WebP quality 82/80. 장식용 빈 alt, 명시적 크기. 화면 문구는 HTML로 출력한다.

생성 프롬프트 원문:

> Create a refined luxury Korean moonlit illustrated background plate for a consultation website. Landscape 3:2 composition. Deep midnight blue and desaturated indigo silk-like painted sky, a softly luminous ivory moon in upper right quadrant, extremely delicate pale magnolia flower branches with restrained antique gold accents at far right and lower corners. Fine watercolor on textured silk, poetic editorial illustration, quietly rational and elegant, sophisticated Korean moonlight floral aesthetic. Left 60 percent is spacious dark navy negative space suitable for separately rendered readable UI, no bright objects there. No person, no character, no text, no lettering, no logo, no border, no buttons, no interface. Subtle depth and natural moonlight, no neon, no sparkles, no busy stars. The central-right region will sit behind an existing character portrait, keep decoration at edges.

## 결제·검증 경계

실판매는 계속 차단한다. 페이지 복귀·뒤로 가기·탭 재활성화는 서버 주문을 다시 읽고, 복귀 URL의 성공 표시는 신뢰하지 않는다. 중복 탭은 동기 잠금으로 차단한다. 결제창 취소·확인 실패·확정 후 연결 끊김에도 같은 주문에서 재확인하며 새 결제를 만들지 않는다.

verify:neo-consultation-ui는 실제 고객·관리자 컴포넌트를 인증/API/Next Image 어댑터 mock으로 렌더한다. 외부 요청은 차단한다. 360·390·430·1280px, 낮은 화면 높이, 회전, 텍스트 확대, reduced motion, 포커스를 확인한다. 실제 iOS/Android 키보드, 결제사 앱 전환과 실결제는 검증하지 않았다.

검증 결과: 상담 계약 15개 통과. 브라우저에서 중복 탭·취소·확인 실패·결제 확정 뒤 연결 끊김·새로고침·뒤로 가기·pageshow 복귀 후에도 주문/결제 1건 유지. 성공 query 위조는 완료로 처리하지 않는다. 입력 영역·입력값·보조 문구·주요 버튼 대비 4.5:1 이상. 시각 검토는 중복 SVG 달을 제거하고 이미지 로딩 완료 후 모바일/데스크톱 캡처를 재검토하여 통과했다. 전체 검사·전달 CI 결과는 최종 작업 보고에서 구분한다.
