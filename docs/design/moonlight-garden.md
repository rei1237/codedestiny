---
status: implemented
updated: 2026-09-30
next: main CI, Android device and installed PWA release checks
---

# 사주 달빛정원 — 진입 브랜드

사용자 확정 이름: **사주 달빛정원**. Code Destiny를 함께 표기하고 꿀꿀 운세·꿀꿀운세·꿀꿀 만세력과 기존 주소는 검색 별칭/기존 서비스 이름으로 보존한다. 같은 업종의 달빛정원 이름이 검색되므로 이름의 독점성이나 검색 순위를 주장하지 않는다.

## 시각 결정

- 모드: Experience. 기존 기능 화면의 팔레트·캐릭터·라우팅은 유지한다.
- 스플래시: 연이의 다정함(찻잔), 네오의 자신감(지도), 영냥이의 시크함(마법사 복장)을 한 달빛 정원에 담는다. 검증된 원본 3종을 참조한 built-in ImageGen 생성물.
- 아이콘: 사용자가 제공한 `꿀꿀 운세 로고 앱버전.webp`의 얼굴·표정·포즈가 기준. 연이를 주인공으로 유지하고, 영냥이는 뒤편의 모자/귀 실루엣으로만 표현한다. 앞선 3인 얼굴 시안과 안고 있는 시안은 사용자가 거절하여 배포 대상에서 제외했다.
- PNG 원본은 `public/images/brand/`, 최적화 스플래시는 WebP. 작은 설치 아이콘은 실제 규격 PNG이고 Android adaptive / PWA maskable은 여백 있는 전용 변형을 사용한다.
- 기존 부팅 마일스톤, 세션당 표시 횟수, 해제 타임아웃을 바꾸지 않는다. 가짜 지연이나 새 인증 게이트를 추가하지 않는다. React loading은 실제 Suspense 대기 중에만 표시한다.
- 결제용 꽃돼지 이미지의 URL과 preload는 그 용도대로 보존한다. 가격, 이용권, 월정석, 결제·인증·API·DB 계약은 변경 대상이 아니다.

## 이미지 출처와 재생성

도구: built-in `image_gen` (CLI/API 폴백 없음).

원본 참조: `public/images/saju/yeoni-clue-320.webp`, `public/images/saju/neo-plan-320.webp`, `public/icons/yeongnyangi.webp`; 최종 아이콘은 사용자가 제공한 바탕화면의 앱버전 로고를 edit target으로 사용했다.

스플래시 생성 지시: 원본 세 캐릭터의 정체성을 보존한 고급 수채화풍 달빛 정원. 찻잔의 연이, 지도의 네오, 남색 마법사 영냥이가 함께 손님을 맞는 세로 2:3 장면. 상하 글자 여백, 그림 안 글자·UI 없음.

최종 아이콘의 정확한 생성 프롬프트:

```text
Use case: precise-object-edit. EDIT REFERENCE 1, an existing cute pig app icon. Do NOT redesign the pig. Keep EXACTLY the reference pig's face shape, small head-body proportion, tiny round snout, bright round brown eyes, open smiling mouth, floppy ears, pink lotus on top left, purple scarf, tiny front hooves held at scarf. Preserve the original youthful adorable slim small body; no big cheeks or belly, no fur texture, no realistic anatomy. User likes THIS EXISTING character and rejected a heavier painted redesign. Simplify it into a professional app icon: keep original smooth simple soft illustration, reduce background sparkles and swirls to a calm soft rose-lavender background, keep just a simplified small lotus base. Main pig occupies center and about 80 percent of visual attention, leave comfortable app mask margins. Add only a subtle small flat lavender / muted indigo silhouette of Yeongnyangi BEHIND the pig on the upper-right, like a companion peeking from behind the pig's right ear. Reference 2 is only the cat's identity: pointed cat ears, floppy wizard hat with tiny crescent, compact fluffy head outline. Silhouette should read as a cat wizard, about one quarter the pig head size, no detailed eyes or face, no second large foreground animal. Must not cover the pig or flower. The icon must be clean and readable at 48px. No additional moon in sky, no stars scattered, no scenery, no text, no lettering, no borders, no phone mockup. Full bleed square. Essential invariant: the pig must remain the exact cute pig of reference 1, same pose and expression. This is a minimal background-and-companion edit, not a character redesign.
```

규격 파생: `node scripts/build-moonlight-brand-assets.mjs` → `npm run sync:public`. 그림을 재생성하는 스크립트가 아니라 승인 방향의 래스터 원본을 리사이즈한다.

## 검증 경계

로컬 브라우저 캡처는 웹 렌더링 증거다. Android 실기기 시작 화면, 기존 설치 앱의 업데이트, iOS 홈 화면의 기존 캐시 갱신과 검색엔진 재수집은 별도 확인 대상이다. 앱 ID·URL scheme·manifest start_url/scope는 유지한다. 운영 승격이나 스토어 업로드는 수행하지 않는다.

## 구현·검수 기록

- HTML 부팅 게이트의 제목은 불투명 `#1b1028` 배경에 `#fff5e5` 글자로 표시하며, 그림은 `object-fit: contain`으로 전체 구도를 보존한다.
- 일반 아이콘은 원본, PWA maskable은 adaptive 전용 원본, Android foreground는 adaptive 원본에 8% inset을 적용한다. 얼굴·연꽃·영냥이 모자의 원형 잘림을 검수했다.
- 실제 index 소스에서 추출한 CSS·마크업을 고정 진행률로 렌더링하여 360·390·430·1440px를 확인했다. 실제 부팅 시간 측정이 아니다. 별도의 실제 셸 smoke에서 부팅 해제와 제목·manifest를 확인했다. 외부 네트워크 요청은 차단했다.
- 브랜드/static 검사 19개 통과. 디자인 detector `[]`. 독립 검수의 두 지적(데스크톱 대비, Android 원형 실루엣)이 재검수에서 resolved로 판정됐다.
- 캡처: `C:/Users/user/.codex/visualizations/2026/09/30/01a0eff6-38a8-7542-8344-ba90e56483ca/`의 `splash-360.png`, `splash-390.png`, `splash-430.png`, `splash-1440.png`, `icons-review.png`. 실기기 증거가 아니다.

설치 전용 adaptive 변형의 정확한 프롬프트:

```text
Use case: precise-object-edit. This is a technical adaptive-app-icon canvas expansion, NOT a redesign. Preserve the supplied cute pig and small cat-wizard silhouette EXACTLY: identical face, expression, flower, proportions, colours and pose. Zoom OUT the entire existing composition: scale its pig, lotus and cat silhouette down together to fit completely inside the CENTER 56% of the square canvas, leaving 22% background space on all four sides. Extend the existing soft lavender pink background naturally to all outer edges with no seam, no inner square, no visible picture border. Continue a calm uniform pastel lavender (#dfb2e8) around the outskirts, remove floating petal decoration in the extra margins. Nothing else changes. The full figure and cat silhouette must be visible within a circle centered on canvas with diameter 80 percent of canvas. Full bleed square 1024x1024, no text, no rounded border, no phone mockup. This image will be cropped by Android's circular app icon mask; the added margins are intentional mandatory technical safe area. Do NOT zoom into the face or fill the canvas with the pig.
```

- 루트 app/loading.js는 정적 소개·정책 페이지를 스트리밍 HTML로 바꿔 AdSense 본문 검사에 실패하므로 제거했다. 웹 로딩은 기존 HTML 부팅 게이트, 네이티브 로딩은 Android splash 자산이 담당한다.
- 실제 셸 390px 캡처에서 스크롤바 여백을 게이트 동안만 없애고 삽화 고유 비율로 중앙 정렬함을 확인했다.
