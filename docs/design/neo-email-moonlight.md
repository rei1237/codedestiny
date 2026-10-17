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

판매 가능 여부는 서버 설정과 결제·메일 준비 상태 정본을 따른다. 페이지 복귀·뒤로 가기·탭 재활성화는 서버 주문을 다시 읽고, 복귀 URL의 성공 표시는 신뢰하지 않는다. 중복 탭은 동기 잠금으로 차단한다. 결제창 취소·확인 실패·확정 후 연결 끊김에도 같은 주문에서 재확인하며 새 결제를 만들지 않는다.

verify:neo-consultation-ui는 실제 고객·관리자 컴포넌트를 인증/API/Next Image 어댑터 mock으로 렌더한다. 외부 요청은 차단한다. 360·390·430·1280px, 낮은 화면 높이, 회전, 텍스트 확대, reduced motion, 포커스를 확인한다. 실제 iOS/Android 키보드, 결제사 앱 전환과 실결제는 검증하지 않았다.

검증 결과: 상담 계약 15개 통과. 브라우저에서 중복 탭·취소·확인 실패·결제 확정 뒤 연결 끊김·새로고침·뒤로 가기·pageshow 복귀 후에도 주문/결제 1건 유지. 성공 query 위조는 완료로 처리하지 않는다. 입력 영역·입력값·보조 문구·주요 버튼 대비 4.5:1 이상. 시각 검토는 중복 SVG 달을 제거하고 이미지 로딩 완료 후 모바일/데스크톱 캡처를 재검토하여 통과했다. 전체 검사·전달 CI 결과는 최종 작업 보고에서 구분한다.

전달 검사: check:fast -- --plan 실행 후 check:fast의 결제 가드 88개(전체 npm test 포함), 변경 lint, 공통 lint, sitemap, typecheck 통과. 이후 이미 통과한 Node/Jest를 다시 실행하는 중복 구간은 저장소의 반복 검사 금지 규칙에 따라 중단했다. 남은 고유 가드 13개(환경·휴대전화·이용권 스냅샷·mock·분석 이벤트·재시도·Worker·Mongo·관리자 오류·인코딩 및 Worker dry-run)는 별도로 모두 통과했다. check:pre-push도 통과했다. 따라서 check:fast 단일 프로세스의 정상 종료를 주장하지 않는다.

이전 main ea14dde54의 CI 실패는 .ignore의 public/styles/home-funnel.css 항목 누락이었다. 커밋된 소스·미러 바이트가 같음을 확인했으며, 이번 생성 결과에 해당 항목을 포함했다. 원래 main 폴더의 다른 세션 미커밋 변경은 그대로 보존한다.

## 2026-10-17 편지지 개선

- 푸른 달빛 배경과 기존 네오 초상을 재사용하고, 은빛 외곽선·얇은 내부 선·중앙 편지지로 작성 흐름을 정리했다.
- 제목과 인사말은 기존 serif 토큰, 본문·입력·결제 버튼은 body 토큰으로 역할을 나눴다. 외부 폰트 로딩은 mock 화면에서 검증하지 않는다.
- 좋았던 시기와 힘들었던 시기는 각 1,000자 이내 선택 입력이다. 연도·나이와 상황을 자유롭게 적으며 질문 수와 금액에 포함하지 않는다.
- 시기 기록은 최종 확인·관리자·회사 접수 메일에 포함한다. 서버 타입/길이 검사와 기존 상담 본문 삭제 주기를 따른다.
- 가격·필수 출생정보·서버 결제 확인·메일 재시도 및 기존 주문 계약은 유지한다.
