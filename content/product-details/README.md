# 상품별 편집 원본

각 폴더의 panels.cjs·layout.css가 이미지 편집 원본이다. manifest.json에는 전체 본문·alt·이미지 순서를 저장한다. 가격은 원본에 넣지 않고 기존 화면의 가격 정본을 그대로 사용한다.

- 종합 사주: 사용자 지정 saju-summary-crafted-v2의 승인된 WebP 10장을 원본 그대로 사용. source-render-evidence.json은 제작 당시의 합성 명식/실제 렌더러 근거이며 실고객 결과가 아니다.
- 대운: 현행 renderDaewun/showDwDetail/renderLifeGraph/buildCycle을 대조하여 별도 원고와 9장 구성으로 편집. 후기 없음. 조건부 코드 문장만 실제 출처로 인용.
- 이미지: 종합 사주 기준작의 study/daily/relation 및 기존 public/images/feature-details/saju-hero-v2.webp 재사용. 신규 인물·캐릭터를 만들지 않았다.
- 폰트: public/styles/service-intro-fonts.css의 Noto Sans KR / Nanum Myeongjo. 실제 파일과 LICENSE는 public/assets/yeongnyangi/fonts에 있다.

재출력: 저장소 루트에서 `node scripts/render-crafted-detail.cjs saju-daewun` (종합 사주는 `saju-summary`). 이 명령은 로컬 서버만 사용하며 외부 요청을 차단한다. 글자를 줄여 넘침을 숨기지 않고 원고 편집이나 패널 분할로 수정한다.

공개 산출물은 public/feature-details/crafted/{id}/, PNG·연결 미리보기·검수는 docs/product-details/verification/{id}/에 둔다. 재출력 전 해당 상품만 수정하고, 확인된 WebP만 적용한다.

- 영냥이 전체 소개: 질문 상담의 근거/범위/예시/준비를 별도로 편집한10장. 공식 hero-480, reading-art/insight, conversion/saju-pattern 재사용. 상담 계약 실행 근거는 docs/product-details/yeongnyangi-contract-snapshot.json. 실제 고객 후기나 생성 결과로 사용하지 않음.
