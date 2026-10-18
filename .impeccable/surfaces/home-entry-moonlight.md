# 꿀꿀 운세 입구

- Primary target: app/page.js
- Related targets: app/home-main.module.css, lib/seo/home-discovery.mjs
- Mode: Persuade
- Direction: 달빛 예화. 짧은 도입 → 연이·영냥이 선택 → 8개 분야의 문 → 고민·인간형 연이와 네오 → 해설·FAQ.
- User scope: 기존 SEO·진입·계측·결제 계약을 유지한다. 2026-10-18 추가 요청에 따라 책 읽는 연이 그림을 원본에서 제거하고, 새 버튼용 그림으로 타로의 문을 고르는 느낌을 만든다.

## 구현

큰 카드의 기울기·로마 숫자·겹테두리를 덜고 이름·역할·실제 행동을 같은 구조로 배치했다. 모바일은 두 캐릭터와 분야 2열, 데스크톱은 캐릭터 가로 배치와 분야 4열이다. 모든 분야를 실제 링크로 제공하고 상단 앵커로 바로 탐색할 수 있다.

기존 테마 토큰·명조 폰트를 유지한다. 새 문 그림 하나를 8개 분야가 공유하고 상징만 달리한다. 그림 아래 제목과 설명은 HTML이다. hover는 작은 상징 이동이며 reduced-motion에서는 생략한다. 인간형 연이·네오는 각각 기존 찻집·전략실로 연결한다.

## 자산 출처

새 파일은 imagegen 기본 도구로 2026-10-18 생성했다. PNG 원본을 비율 보존 축소하고 알파를 유지한 WebP로 내보냈다. 생성 원본은 Codex generated_images에 있으며 웹은 저장소 내 결과만 참조한다.

| 결과 파일 (public/images/home/illustrated/) | 생성 원본 | 지시 요약 |
| --- | --- | --- |
| tarot-door-v1-400.webp | exec-812e401e-5c52-48c2-93c2-aa6ce3d4b8a3.png | 상아·금빛 아치와 열린 문, 달빛 정원, 연꽃, 가운데 상징을 놓을 빈 공간, 투명 배경, 문자 없음 |
| method-naming-v1-160.webp | exec-63b3d69f-a377-4b91-919e-66d36901e66c.png | 이름첩·붓·연꽃의 상아/남색 상징, 투명 배경, 문자 없음 |
| method-zodiac-v1-160.webp | exec-0ffe2be7-7c81-40ab-8380-0925b6cb4ef4.png | 초승달·천구·별의 금빛 상징, 투명 배경, 문자 없음 |

기존 6개 method 그림, root-card 캐릭터, moon-floral 배경, yeoni-hanbok 및 neo-human을 재사용했다. 요청으로 제거한 daily-fortune-hero-v2.webp의 사용처는 기존 yeoni-room-1280.webp로 전환하고 정적 미러·상세 이미지 4종을 생성기로 갱신했다.

## 검증 범위

360·390·430·1440px 로컬 mock 브라우저, 원본 HTML/FAQ/링크와 실제 CTA 계측, 밝은/어두운 테마 및 키보드를 검사한다. 비교 화면과 상세 수치는 작업 외부 증거 폴더 D:/Development/home-entry-evidence-20261018에 둔다. 운영 배포·실결제·실 LLM·운영 DB 및 전환율 실험을 뜻하지 않는다.
