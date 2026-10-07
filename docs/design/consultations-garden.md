# 상담 모음 꽃빛 정원

status: done

## Direction contract

- THESIS: 고민에서 상담 선택으로 이어지는 밝은 꽃빛 안내. 기록 보관함의 밤 테마와 분리한다.
- OWN-WORLD: 꿀꿀 홈의 아이보리·꽃분홍·로즈, 기존 명조 제목과 달빛 예화 라인아트. 기존 기능 WebP를 그대로 사용한다.
- STORY: 마음 상담 → 체계별 전문가 → 독립 작명 → 심층 리포트 → 이용 안내. AI 상담임을 명시하며 모든 기존 진입을 보존한다.
- FIRST VIEWPORT: 홈·보관함 링크, 짧은 제목, 네 분류 바로가기, 찻집 대표 이미지와 CTA. 모바일 1열, 데스크톱 대표 2열/전문가 3열.
- FORM: 사용자 승인 구성으로 code-led 구현. 새 콘셉트 추첨 및 이미지 생성 없음. 모션은 버튼 호버만, reduced-motion 존중.
- FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

## Asset provenance

기존 `public/feature-details/assets/*-480.webp` 및 `*-960.webp`를 원본 그대로 참조한다. 찻집·전략실·작명 및 전문가 이미지는 동일 기능의 기존 상세 페이지 자산이다. 나머지 리포트는 기존 records service registry 이미지를 재사용한다. 신규 이미지 생성·캐릭터 수정 없음. 전역 DESIGN.md는 기존 연이 정원 규칙을 유지한다.

## Verification

- mock 서버 360/390/430/1280 × 844px 실제 렌더링 통과. 13개 상담 경로·분류 이동·FAQ·키보드 포커스·이미지 decode 및 실패 시 CTA·5개 비한국어 로케일 폴백 확인.
- axe 대비/링크명/제목 순서 검사 위반 0, 가로 넘침 0, 44px 미만 터치 영역 0, 브라우저 오류 0, API mutation 0. 외부 요청은 차단했다.
- 첫 CTA가 하단 내비 위에 완전히 노출되는지 좌표 검증. 저장된 네오 상태에서도 밝은 본체 유지. 하단 내비 색상은 이 페이지가 있을 때만 전체 색 세트를 적용한다.
- npm run check:fast 성공(typecheck, 변경 lint, Node 테스트, smoke 포함). 추가 변경된 검사 스크립트 node --check 및 eslint 성공. eslint는 기존 방식의 img/일반 anchor 및 기존 검사 미사용 변수 경고가 남아 있다.
- impeccable detect 결과 []. 최종 visual review: SHIP. 1차 검토의 첫 CTA 미노출·어두운 내비·인생의 책 이미지 구도를 한 묶음으로 수정 후 확인했다.
- 재현: CONSULTATIONS_TEST_ORIGIN을 mock 서버 주소로 지정하고 node scripts/design/verify-consultations-garden.mjs. 기본 출력 build-cache/consultations-garden.
- 배포/실결제/실 LLM/운영 DB 변경 없음. main 전달 SHA와 CI는 최종 작업 보고에서 기록한다.
