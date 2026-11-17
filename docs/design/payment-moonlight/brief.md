# 결제 복귀와 달빛 예화

## 범위와 기준

- 2026-11-18 사용자 승인: 카카오페이 복귀 오류 수정, 완료 즉시 생성/결과 표시, 공통·영냥이 결제 UI 개선, 운영 배포. 가격·이용권·월정석·단건 결제 정책 유지.
- 기존 정체성을 결제 화면에 확장한 작업이다. `PRODUCT.md`, `DESIGN.md`와 전역 디자인 sidecar는 변경하지 않는다. 가격·조건은 기존 정책과 데이터 소스를 유지한다.

## 구현된 화면

- 공통 결제 대기·완료는 `--cd-welcome-*`의 크림·로즈·금빛 표면, `/yeongnyangi/`와 `/checkout`은 독립된 `--yn-*` 밤색·아이보리·금빛 표면을 사용한다. 제목은 기존 `--font-display`, 본문은 읽기 쉬운 별도 위계와 짧은 문단을 유지한다.
- 대기 카드는 가는 이중 테두리와 제한된 그림자로 구분한다. 공통 React 대기의 행동 버튼은 최소 48px, checkout 결제 버튼은 최소 54px이며 포커스 윤곽선을 제공한다. checkout은 넓은 화면의 2열 구성을 760px 이하에서 1열로 바꾸고 결제 행동을 하단 안전 영역에 둔다.
- 완료 안내는 하단의 비차단 상태 알림이다. 배경을 덮거나 입력·스크롤·포커스를 잡지 않고 생성/결과 화면으로 이어진다. 고양이는 기존 셸 48px, React 52px이며, 기존 셸 완료 카드의 검수 실측 높이는 82.89px다. 이 수치는 특정 검수 화면의 실측이며 다국어·줄바꿈 전체의 고정 높이가 아니다.
- 결제 진행 단계는 실제 상태를 따르고 시간 경과만으로 완료처럼 표시하지 않는다. 영냥이 생성의 장 수·제목은 서버 응답을 사용하며, 장 수가 없으면 임의의 백분율을 표시하지 않는다.
- 새 명상 영냥이는 공통 결제 대기·완료와 영냥이 `ReadingLoading`에 사용한다. 연이·네오 전용 생성 장면과 원본 캐릭터는 유지.
- 구현 기준: `app/components/common/PaymentLoading.tsx`, `PaymentWelcome.tsx`와 각 CSS 모듈, `styles/payment-moonlight.css`, `app/checkout/yeongnyangi-checkout.module.css`, 영냥이 `ReadingLoading.tsx`와 CSS 모듈.

## 이미지와 출처

- 신규 자산: public/images/brand/yeongnyangi-meditating-v2.webp, 480×480, 49,622 bytes. 내장 imagegen, 참조 public/assets/yeongnyangi/original/hero-800.webp. 투명 배경, 단일 자세에 CSS 호흡 모션, reduced-motion 정지.
- 생성 프롬프트: 흰 장모 치비 고양이의 남색 마법사 모자·금빛 초승달·망토·분홍 귀를 유지하고, 눈을 감은 작은 미소와 무릎 위 앞발, 둥근 명상 자세로 귀엽고 평온하게. 작은 아이보리 연꽃 방석과 금색 테두리. 돌 조각이 아닌 살아 있는 영냥이. 전신 정면 중앙, 투명 정사각 배경, 글자·로고·장면·테두리 없음. 부드러운 CSS 호흡에 쓸 한 자세.
- React 이미지는 비동기로 디코딩하며 결제 확인·생성 시작의 대기 조건으로 사용하지 않는다. 완료 알림의 작은 이미지는 정지한다. 장식 이미지는 빈 alt와 숨김 처리, 상태는 별도 텍스트와 `aria-live="polite"`로 제공한다.
- 이전 fish-loading-v1 480/720/1024 WebP·AVIF 6개는 소스·테스트·검증기·미러·동적 접두 검색에서 참조 없음 확인 후 삭제. 원본 source.webp는 보존.

## 검증 근거와 한계

- 실제 React·영냥이 화면 20장, 360/390/430/1280px 검수의 reviewer 판정은 SHIP. 기존 셸 8장 최초 HOLD에서 지적한 완료 카드 과대 높이(284px → 82.89px), 남은 광륜·공통 어두운 카드, 파란 안내문·`ACCESS GRANT` 표현은 수정했다. 검수 당시 화면 자료는 `.tmp/kakaopay/screens`에 저장했다.
- 모바일 mock 복귀 시나리오 114건(Chromium 71건, WebKit 43건) 통과. critical 검사에서 Jest 479개 suite·8,012개 test 통과. Node 검사는 최초 5,221/5,222 통과였으며, 누락된 daily 데이터는 mock 빌드 후 관련 7/7 재검사로 확인했다. 이를 Node 전체 재실행 통과로 표현하지 않는다.
- 실결제·실 LLM·운영 DB 쓰기는 검증하지 않았다. UI 검수와 mock 테스트 결과는 운영 결제 성공 또는 운영 배포 완료의 증거가 아니다.
- SEO: 결제/생성 상태 UI만 변경하며 title/canonical/robots/sitemap 정책 영향 없음. 장식 이미지는 빈 alt, 상태는 별도 텍스트.
