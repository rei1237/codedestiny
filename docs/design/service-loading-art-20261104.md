# 서비스 로딩 이미지 교체

- 요청일: 2026-11-04. 두 서비스 로딩 교체 승인 범위.
- 원본: 사용자 인수인계 폴더의 `ggulggul-loading-human-draft.webp`, `yeongnyangi-loading-draft.webp` (내장 imagegen 제작).
- 저장: `public/images/brand/ggulggul-masters-loading-v1-source.webp`, `yeongnyangi-fish-loading-v1-source.webp`.
- 재생성: `node scripts/build-service-loading-assets.mjs`. 480/720/1024w WebP/AVIF, 원본 비율 2:3, 크롭 없음.
- 꿀꿀 운세: `index.html`의 `cd-boot-gate` picture만 교체. 표시 조건·진행률·해제·딥링크는 유지. 정적 셸 미러는 기존 생성기 사용.
- 영냥이: `ReadingLoading.tsx`의 결과 준비 그림 교체. 새 정지 그림을 덮는 기존 불투명 전체 프레임 스프라이트와 그 재생 버튼만 제거. 결과 상태·저장 수·생성 중 이탈 안내는 유지.
- 캐릭터: 집합 일러스트에 새 인물 이름·담당을 확정하지 않는다. `master-profiles.ts`와 기존 배정은 변경하지 않는다.
- 비영향: 가격·이용권·월정석·단건 결제·인증·상담 API·DB·결과 저장·라우팅·구매 기록. SEO 제목·설명·canonical·색인 정책도 유지한다. 로딩 그림은 장식용 빈 alt이며 상태 안내는 별도 텍스트로 제공한다.
- 새 웹툰·흑월 상담·휴먼디자인 진입 그림·서비스별 랜딩·FAQ는 별도 승인용 목업이며 이 변경에 포함하지 않는다.
