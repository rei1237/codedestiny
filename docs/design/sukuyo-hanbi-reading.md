# 숙요점 기본 해석의 서한비 안내

2026-10-18 사용자 승인: 기본 숙요점의 무료 해석·소액 상세·기본 AI 상담을 기존 마스터 서한비가 안내한다. 계산·상품·가격·이용권 정책은 그대로 유지한다. 나머지 기본 점술의 마스터 배정은 후속 작업이다.

## 캐릭터와 자산

- 정체성 정본: `components/fortune/master-profiles.ts`의 hanbi, `worker/lib/expert-character-persona-text.js`의 HANBI_PERSONA_KO.
- 기존 초상: `/images/master-profiles/hanbi-sukuyo-portrait.webp`. 첨부된 초융합 마스터 소개와 동일 인물이다.
- 신규 일러스트: `/images/master-profiles/hanbi-sukuyo-reading.webp`, 1200×800 WebP. 내장 imagegen으로 아래 프롬프트와 기존 초상을 참조해 생성한 뒤 sharp로 크기와 포맷만 변환했다. 새 외부 생성 API는 사용하지 않았다.
- 달은 장식적 상징이며 출생 당시 위상 자료가 아니다. 본명숙 카드의 이미지는 장식 처리하고 기존 위상 계산과 설명은 유지한다.
- 텍스트는 이미지에 넣지 않는다. 제목·개인 해석·서한비 안내는 실제 HTML로 표시한다.

## 생성 프롬프트

Create a new landscape illustration for Code Destiny's free Sukuyo reading screen featuring exactly the same adult Korean female master Seo Hanbi in the reference: long flowing black hair, dark rain-indigo high-neck embroidered coat dress with antique gold patterns, silver drop earrings, calm precise kind expression. Premium intricate Korean fantasy manhwa painting matching reference identity. Waist-up composition on the right half, she gently opens her moon-embossed ledger toward the viewer as if explaining their lunar mansion. Left half features a large finely textured luminous ivory moon reflected in tranquil dark blue water and thin antique-gold orbital motifs; background a quiet rain-washed observatory terrace, restrained warm lanterns, elegant ink-blue and champagne gold. Balanced subdued atmospheric lighting, face clearly legible on mobile, gorgeous polished editorial art. Wide 3:2 landscape composition. No text, no lettering, no UI, no logos, no additional people, no speech bubbles. Moon is decorative symbolism, not an astronomical chart.

## 후속 요청: 다른 기본 점술의 마스터 배정

이번 변경에는 사주·자미두수·점성술·베다점의 배정을 포함하지 않는다. 후속 구현에서 기존 마스터 정본을 확인하고 사주 네오, 자미두수 무성, 점성술 윤달의 기존 역할을 출발점으로 삼는다. 베다점은 현재 서비스의 역할 설정을 확인한 뒤 배정을 확정한다. 무료 결과·소액 해석·기본 AI 상담의 안내와 말투를 같은 마스터로 일관되게 연결하되, 각 점술의 계산 체계·프롬프트 데이터·가격은 섞거나 변경하지 않는다.
