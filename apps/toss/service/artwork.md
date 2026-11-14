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

## 2026-11-14 전략실 휘장
원본: https://assets.code-destiny.com/DestinyWar/%EC%9E%91%EC%A0%84%EC%8B%A4%20%EC%97%90%EC%85%8B1-Photoroom.webp
토스 파생본: public/assets/toss-art/neo-war-room-seal.webp (320×240, 38,528 bytes).
sharp resize width=320, withoutEnlargement=true, webp quality=82. 원본 비율·알파 유지.
character-room-art.ts는 네오 본문·배경과 찻집 배경도 기존 번들 원화에 연결한다.


### 2026-11-14 패키지 중복 정리
- 카드 78장의 원본 600×900 해상도와 그림을 유지하고 Toss 빌드에서만 WebP quality90/effort6으로 인코딩한다. 더 커지면 원본 바이트를 사용한다. 웹 원본·manifest·카드 선택/해석은 바꾸지 않는다. M00/W01/S01을 원본과 직접 비교했고 밝은 영역·밤하늘·금빛 테두리의 가독성을 확인했다. 원본파일 불변·크기·78장 검사는 screen-tarot-encoding.test.mjs.
- miniapp 상담 예시는 기존 fallback과 원본960 responsive 후보를 유지한다. 찻집은 공유 hero의320/480/640/960 후보를 유지한다. 같은 장면의 중복320/640 후보를 별도 포함하지 않는다.
- Bias/연이 꽃안내/달빛 배경과 진로 표지는 같은 바이트의 canonical 원본 경로로 통합했다. 같은 그림 복제 파일126,078bytes와 Vite 이중 emit254,742bytes를 제거했다. 디자인·해상도 변경 없음.
- private build9의 확장 크기99,519,144bytes. 새 Linux artifact와 실제 휴대폰 검증은 별도다.
