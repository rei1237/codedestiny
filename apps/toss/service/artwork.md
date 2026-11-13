# 앱인토스 이미지 파생본

2026-11-09 사용자 승인: 기존 PNG 두 장을 앱인토스에서만 WebP로 최적화한다.
웹의 원본·URL·결제·서비스 동작과 100,000,000바이트 검사는 유지한다.

`bundle-art.mjs`의 두 원본을 sharp의 `webp({quality:88,alphaQuality:100,effort:6})`로 변환해
`apps/toss/public/assets/toss-art/`에 저장했다. 모두 1254×1254이며 알파 채널은 원본과 정확히 같다.
원본 합계 3,809,054바이트 → 파생본 합계 632,580바이트, 3,176,474바이트 감소다.
Toss Image 어댑터만 로컬 표시 URL을 치환하고 Vite는 원본 PNG의 중복 패키징을 제외한다.
서버 기록·리포트 데이터·외부 공유의 원본 웹 URL은 치환하지 않는다.
아래 토스 화면용 예외를 제외한 원본 이미지는 그대로 포함한다.

`npm test --prefix apps/toss`는 치환 범위·해상도·투명도·절감량을 검사하고,
`npm run build --prefix apps/toss`는 최종 AIT와 압축 해제 크기를 기존 제한으로 검증한다.

2026-11-13 통합 홈 번들은 타로 뒷면 back-600.webp를 패키징할 때 같은 600×900 크기로 인코딩한다. 원본 833,178바이트, WebP quality 88 파생본 192,902바이트. 카드 앞면과 웹 원본은 그대로 사용한다.

상담가 초상과 상담 표지(images/master-profiles, images/consultation-editorial, images/fusion-fortune) 중 가로 800px를 넘는 이미지는 토스 번들에서 800px WebP로 만든다. 작은 원본과 인쇄용 리포트 이미지는 원래 해상도를 사용한다.
