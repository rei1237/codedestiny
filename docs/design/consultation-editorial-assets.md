# 마스터 상담 상세 삽화

2026-10-20. 사용자 승인 범위: 초융합 및 새 마스터 상담 전체의 상세 소개.

## 자산

`public/images/consultation-editorial/`의 13개 삽화는 내장 imagegen으로 새로 제작했다.
각 원본은 1536×1024 WebP, 모바일 변형은 768×512 WebP다.
Sharp로 비율을 유지해 인코딩했으며 얼굴이나 몸을 잘라내지 않았다.
이미지에 한국어를 넣지 않고 소개·풀이 방식·예시는 HTML로 제공한다.

| 파일 | 장면 | 캐릭터 참조 |
| --- | --- | --- |
| fusion | 다섯 마스터가 여섯 관점을 함께 검토 | 아래 다섯 공식 초상 |
| neo | 네오의 전략 검토 | neo-strategy-portrait.webp |
| yeoni | 연이의 차와 타로 | yeoni-teahouse-portrait.webp |
| hanbi | 서한비의 관계 기록 | hanbi-sukuyo-portrait.webp |
| yun | 윤달의 출생 차트 | yun-astrology-portrait.webp |
| musung | 무성의 명반 검토 | musung-ziwei-portrait.webp |
| master | 인연의 서 | master-love-portrait.webp |
| karma | 네오·서한비의 붉은 실 | neo-strategy, hanbi-sukuyo 공식 초상 |
| love | 연이·서한비의 공동 상담 | yeoni-teahouse, hanbi-sukuyo 공식 초상 |
| vedic | 윤달의 베다 차트 | yun-astrology-portrait.webp |
| life | 윤달이 펼치는 인생의 책 | yun-astrology-portrait.webp |
| year | 네오의 한 해 계획 | neo-strategy-portrait.webp |
| chat | 이야기를 듣는 연이 | yeoni-teahouse-portrait.webp |

참조 초상 위치는 `public/images/master-profiles/`다. 삽화 속 도표는 분위기를
설명하는 장식이며 실제 사용자 계산값이나 결과 화면으로 제시하지 않는다.
원본 생성물은 Codex generated_images의 이 대화 폴더에 보존했다.

## 콘텐츠 정본과 재생성

`content/product-details/*/manifest.json` 중 `layout: editorial`인 21개 판본이 정본이다.
`npm run sync:marketing-copy`가 프로필 정본의 이름·초상·소개와 상품별 담당을 결합해
공개 manifest 및 상세 데이터를 만든다. `npm run sync:public`은 정적 셸과 CSS·JS 미러도
동기화한다. 이전 `panels.cjs` 렌더링으로 새 판본을 덮어쓰지 않도록 생성기에서 거부한다.

초융합 설명은 `worker/lib/fusion-expert-contract.js`의 근거 비교와
`lib/fusion-premium-report.js`의 화자 배정을 참조했다. 상품별 마스터는
`components/fortune/master-profiles.ts`를 재사용한다. 베다 상담의 윤달은
서양 점성술 소개가 섞이지 않도록 상품별 근거·역할·소개를 명시한다.

결제 정책·가격·API·DB·운세 계산·저장된 구매 결과는 변경하지 않는다.
이전 공개 이미지 URL은 다른 표지·OG·저장 링크를 위해 남겨두되, 개편 판본은
새 이미지 경로만 참조한다. 실제 상담과 혼동하지 않도록 AI 캐릭터 및 편집 예시를 표시한다.
