# 기본 자미두수 리포트와 궁합

status: in-progress

## 요청과 범위

기본 자미두수의 전체 해석·참고 기록·해금 UI를 명반의 톤에 맞추고, 새 궁합 이미지 진입점 및 전문적인 정적 종합 리포트를 제공한다.

- Read 모드. 기존 `--fr-*` 네이비·샴페인 골드와 서체를 재사용한다.
- 전체 해석은 대한 흐름의 접힘 안에서 독립된 읽기 영역으로 이동한다. 궁합 진입 링크는 기존 폼을 열고 입력에 초점을 둔다.
- 궁합은 관계 요약, 명반 근거, 사랑·생활·친구, 일·협력, 갈등 조율, 시기 기준, 실천 계획, 참고 기록의 8장이다.
- 기존 명반·궁별 가중치·점수·권한·결제 콜백은 유지한다. 정적 해석만 확장하며 추가 LLM/API 요청은 없다.
- 전생 서사는 상징 창작임을 밝힌 참고 영역으로 둔다. 나이 구간 중첩은 달력 연도의 동기화로 단정하지 않는다. 실제 세운 교차 검증을 수행했다고 표현하지 않는다.

## 이미지

내장 image_gen 사용. 원본: `C:/Users/user/.codex/generated_images/01a11d23-dfbd-7db2-8bc8-18c132255dd5/exec-5598214f-a1ff-4a60-9b3a-a73f80fb8b03.png`.

프로젝트 자산: `public/images/ziwei/compatibility-atlas-v1.webp`, 960×640, 171,242 bytes. 이미지 최적화만 Sharp로 수행했다.

최종 프롬프트:

> Use case: stylized-concept. Asset type: landscape 3:2 editorial entry illustration for a Korean Zi Wei Dou Shu relationship report. Two antique celestial chart disks, each with twelve palace sectors and fine star points, side by side on midnight navy silk, connected by a delicate champagne-gold thread. Elegant East Asian astronomical atlas engraving, subtle handmade ink texture, refined quiet gold illumination, deep blue shadows, dignified intimate atmosphere. Richly detailed craftsmanship with generous breathing room, legible silhouette at small card size. No people, no characters, no zodiac animals, no western zodiac glyphs, no text, no letters, no numbers, no logos, no watermark. Full bleed illustration, no UI or frame.

## 검증 기록

- 실제 정적 셸/엔진 + 차단형 네트워크 mock: 360·390·430·1280px 가로 넘침 없음, 궁합 8장·5분야, 명반 데이터 불변, 기존 궁합 비용/feature key 전달, 목차 포커스, 닫기/재진입, 해금 상태 전환 통과.
- 기준 fixture의 접힌 참고 영역을 제외한 궁합 본문은 3,922자. 명반에 따라 내용 길이가 달라진다.
- 시각 검수: 기존 다색 패널·중첩 여백 개선. 안정된 캡처에서 데스크톱 게이트 가림 없음. 잠금/해금·궁합 이미지/본문 모바일·데스크톱 확인.
- `node scripts/verify-saju-unlock-entitlement-regression.mjs`: OK.
- impeccable detector: 종료 0. 기존 점성술 구분선 1건과 기존/일부 새 글자 크기 advisory. 자미두수의 기존 읽기 크기를 유지한다.
- 본문 생성 중 과금 LLM, 실결제, 운영 DB, 운영 승격은 실행하지 않았다.

## 남은 전달

변경 기반 검사, scoped commit, main 반영·push, 해당 SHA의 CI 확인, 자기 워크트리 정리.
