# 정적 사주 읽기 에셋

- 용도: 무료 사주와 정적 대운·종합 풀이 안내. LLM 상품용 에셋을 교체하지 않는다.
- 출처: 프로젝트의 `public/images/fortune-chat/persona/yeoni-think.webp`, `neo-read.webp`를 참고해 2026-09-27 내장 imagegen 도구로 새 포즈 제작.
- 연이: 확대경으로 관찰하고 메모를 건네는 모습. 네오: 네 칸 명식을 살피는 모습.
- 원본 생성: `exec-05d7402e-6959-41b3-9afb-d5f7fa1d5468.png`, `exec-5943c750-9c53-43a0-bdbd-a6cf7ed7350d.png`.
- 배포: 투명 WebP, 160·320px, quality 85. 장식 이미지이므로 인접 캐릭터 이름과 설명이 의미를 전달하며 이미지 alt는 비운다.

## 영냥이 (2026-10-13)

- 사주 풀이 페르소나 연이/네오 전환이 연이/영냥이로 바뀌었다. `neo-plan-*`은 더 쓰지 않는다.
- `yeongnyangi-{160,320}.webp`: `public/assets/yeongnyangi/original/hero-480.webp`를 정사각으로 맞춘 아바타.
- `yeongnyangi-{read,think,listen,cheer}.webp`(270×360): 노벨 표정 컷 talk·serious·calm·smile에서 만든 풀이 사이 장식 컷.
- 재생성: `node scripts/build-saju-yeongnyangi-assets.mjs`. 투명 WebP, quality 85, alt는 비운다.
