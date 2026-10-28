# 연이 운명 상담 · 꽃빛 살롱

2026-10-19. 범위: /fortune-chat/ 및 /fortune-tea-house/?counsel=letter. Operate 모드.

## 방향

기존 상담 컨트롤러와 서버 계약을 유지하고 입력 표면을 교체한다. 꽃빛 아이보리와 차분한 로즈, 기존 로컬 명조·본문 폰트를 사용한다. 인간형 연이는 환영 장면, 꽃돼지 연이는 질문 안내를 맡는다. 이미지에는 글자를 넣지 않는다.

질문 작성 → 해석 방식·프로필 → 내용 확인 순서. 뒤로 가거나 질문을 수정해도 질문·체계·타로 종류가 유지된다. 타로는 프로필이 필요 없다. 로그인, 프로필 저장, 상담 생성, 결제 복귀, 기존 결과 재열람은 기존 함수로 연결한다.

## 파일

- app/fortune-chat/ConsultationIntake.tsx: 단계별 입력. 의미 있는 label, fieldset, aria-current/pressed, 단계 이동 후 제목 포커스.
- app/fortune-chat/YeoniWelcome.tsx: 반응형 환영 장면. 기존 이미지 원본은 보존.
- app/fortune-chat/yeoni-salon.module.css: 이 표면만의 로즈·아이보리 토큰. 네오 저장 상담에는 적용하지 않는다.
- ConsultationRoom / ConsultationResult / FortuneChatClient: 기존 동작에 새 표현 계층 연결.
- FortuneTeaHouseClient: 중복 찻집 내비게이션을 각 상담 헤더의 찻집·지난 상담 링크로 통합. surface 선택 분기는 유지.

## 이미지 출처

OpenAI 내장 ImageGen으로 이 요청에서 생성. 원본 참조: public/images/fortune-tea-house/yeoni-moonlight-novel.webp, public/images/fortune-chat/persona/yeoni-greet.webp. Sharp로 WebP 리사이즈, 투명도 보존.

- salon-welcome-v1.webp: 1440×960, 174438 bytes. 인간형 연이와 꽃돼지의 새 찻집 장면.
- salon-companion-v1.webp: 320×451 RGBA, 29018 bytes. 찻잔을 든 꽃돼지 연이.

생성 프롬프트:

> Create ONE new premium illustration asset for a Korean fortune consultation app, landscape 3:2. References are identity references only: Yeoni is the adult woman with long muted pink hair, rose eyes, a lotus flower hair ornament, delicate lavender ribbon, ivory and dusty rose Korean-inspired robes; her companion form is a tiny pale pink pig with lotus on head and lavender scarf. Depict the adult human Yeoni seated on the RIGHT half in a beautiful quiet tea salon with pale plaster, dark walnut window frame, a branch of flowering magnolia, softly lit twilight garden. Her full head and upper body clearly visible, gentle thoughtful trustworthy smile, natural modest clothing, one hand beside a porcelain teacup. The tiny flower pig sits beside her on the right near bottom, clearly visible and gracefully cute. LEFT half mostly calm warm ivory wall and faint soft botanical shadow, generous negative space. Luxury contemporary illustrated storybook, refined hand painted anime illustration, restrained muted rose and warm ivory palette, excellent anatomical detail, natural composition, editorial art direction, delicate details without clutter. No text, no letters, no logo, no watermark, no UI elements, no neon, no glitter, no ornate frame. This will be used as a responsive scenic welcome image in a sophisticated chat app.

> Create one transparent-background character illustration for a premium Korean fortune chat app. Identity reference: Yeoni, tiny pale pink flower pig, big gentle brown eyes, lotus flower on left side of head, delicate lavender scarf tied in bow. New pose: seated comfortably holding a small ivory porcelain teacup with both front hooves, head slightly tilted as if attentively listening. Entire body and lotus visible with generous transparent margin on all sides. Refined hand painted soft anime illustration, muted pink and ivory, gentle warm light, delicately detailed, trustworthy warm expression, cute but not babyish, no human, no environment, no floor, no extra objects, no text, no logo, no border. Single character only, centered, clean alpha transparency.

## 검증 범위

scripts/verify-yeoni-salon-browser.mjs: 외부 네트워크 차단 및 API mock. 360/390/430/1440px 질문·해석·확인·결과, 수정 보존, 타로 프로필 생략, 실패 후 입력 보존, 완료 결과의 재과금·재생성 없음. 실제 결제·LLM·운영 DB 검증으로 해석하지 않는다.

SEO: /fortune-chat/의 기존 noindex, title/description/canonical 및 /fortune-tea-house/의 공개 본문은 유지한다. 찻집·지난 상담 내부 링크를 상담 헤더에 보존한다. 변경 의존성의 lastmod는 sitemap:generate로 갱신한다.

2026-10-19 실측: 브라우저 4폭 모두 PASS. 질문 수정·타로 프로필 생략·실패 후 초안 보존·저장 결과 재열람을 확인했다. 관련 node 회귀 검사 26/26 통과. Impeccable detector는 빈 findings 배열을 반환했다. 독립 시각 검토는 최초 16장과 가격 대비·데스크톱 크롭 수정 후 2장을 확인하여 두 지적 모두 해결로 판정했다. 실제 기기 키보드·실결제·실 LLM·운영 DB는 미검증이다.

타입 검사 npm run typecheck는 종료 코드 0. check:fast 최초 실행은 sitemap 원장 드리프트로 중단되어 공식 생성기로 갱신했다. 후속 실행은 새 scripts 검증 파일의 미분류 판정으로 critical 전체 mock 스위트를 선택했다. 약 10분 진행 중 프로젝트의 로컬 전체 검사 반복 금지 원칙에 따라 중단했으며 전체 통과로 기록하지 않는다. 해당 전체 회귀의 최종 판정은 main GitHub CI에 맡긴다.
