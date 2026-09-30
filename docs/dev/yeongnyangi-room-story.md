---
status: implemented
updated: 2026-09-30
next: main CI 통과 후 별도 승인된 운영 릴리스에서 실기기 음량과 터치 확인
---

# 영냥이의 방 — 내 이름이 네오였던 밤

## 연출 계획과 구현

기존 꿀꿀 운세 라이트 노벨의 내레이션/대사 교차, 삽화 변화와 장면별 BGM을 영냥이의 방에 맞춰 사용한다. 정본 참고는 `content/novel/episodes.source.json`과 `public/codedestiny-novel.html`이다. 꿀꿀 운세 자체의 대본은 수정하지 않는다.

1. 실제 이름 네오 → 두 대통령 운세 적중 → 천기의 대가 → 거울 앞의 상실 → 생선을 거절할 수 없는 저주 → 작은 위로 → 영냥이라는 두 번째 이름 → 사용자의 이야기로 이어지는 9장면.
2. 거울 앞과 멸치 장면에서 독자의 선택에 따라 대사가 달라진다. 원래 서사와 결말은 유지한다.
3. 사용자 요청 문장: “그렇다... 네오 그는 이제 생선만 보면 거부할 수 없는 몸이 되어버렸다...”
4. 쓰다듬기, 찻잔, 창밖, 반복 반응이 있는 생선 장난, 이야기책. 마음별 운세 쪽지 3종과 작은 실천 표시.
5. 무료 운세 서버가 `newlyUnlocked`를 확인한 뒤에만 멸치 수령 → 한숨 → 다정한 답변. 실패와 이미 열린 상태에는 수령 연출 없음.
6. 음악 기본 꺼짐, 직접 켜기, 음량 조절, 숨겨진 탭에서 정지, 화면 이탈 시 해제. 기존 CDN 음악 4곡 사용.
7. 모바일 본문 스크롤, 접근 가능한 선택 버튼, 대화상자 닫기/Escape/포커스 복귀, 모션 줄이기 지원.

실제 이름을 반영하되 고양이 변신과 하늘의 저주는 세계관 창작으로 표시한다. 운세 쪽지는 개인 운세 계산 결과로 표시하지 않는다.

## 유지 경계

무료 16종·출석 멸치의 지급과 소비·프로필·기존 서버 API를 유지한다. 방의 놀이는 클라이언트 상태만 바꾸며 멸치를 소비하지 않는다. 결제·이용권·월정석·단건 결제·인증·DB·LLM 생성 경로 변경 없음.

## 직접 생성한 자산

내장 image_gen 사용. 원본 PNG는 생성 도구 저장소에 보존하고 아래 WebP를 서비스가 사용한다. 기존 영냥이/인간 네오 이미지를 캐릭터 참고로 사용했다.

- `public/assets/yeongnyangi/original/neo-mirror-grief.webp`: 1440px, 거울의 인간 손과 고양이 앞발, 슬픔.
- `public/assets/yeongnyangi/original/neo-fish-curse.webp`: 720px, 한 앞발은 거절하고 다른 앞발은 생선을 받는 모순, 투명 배경.

### 최종 생성 프롬프트 — 거울

Use case: illustration-story. Create one finished premium Korean light-novel cinematic illustration, landscape 1536x1024, for the tragic origin story of Neo, a human fortune reader cursed into a cat after correctly reading the fortunes of two presidents. Reference image 1 defines the EXACT cat character: white fluffy fur, small body, amber-violet eyes, midnight-purple gold crescent/star wizard hat and robe, purple jewel. Reference image 2 defines his lost human face: young adult silver-haired Korean fantasy man. New composition, NOT an edit of the cutouts. In an empty moonlit violet study, the small cat sits on the floor before a tall aged mirror, one white paw pressed to the glass. In the mirror his former human self places a human hand at the matching spot, softly fading like a memory. The cat's ears droop, eyes wet with one restrained tear, mouth trying to stay brave; dignified grief and loneliness, not comic sobbing. An overturned ink brush and open blank book on floor symbolize the hands and name he lost. Pale moonlight and a nearly extinguished candle, deep plum shadows, old gold details, painterly anime light novel key visual, finely drawn fur and fabric. Keep both cat and reflected human centered so usable with portrait cropping. Rich atmospheric room fully painted, no transparency, no text, no lettering, no logos, no watermark, no presidents or political symbols. This is a fictional curse scene, not a real event photograph.

### 최종 생성 프롬프트 — 생선 저주

Use case: illustration-story. One premium Korean light-novel comic character illustration on a truly transparent background. Use reference only to preserve exact Yeongnyangi character: small fluffy white cat, expressive amber-purple eyes, midnight purple wizard hat with gold crescent and stars, purple gold-trim robes and amethyst neck jewel. Show the tragic genius Neo now a cat cursed to be unable to refuse ANY fish, even one absurdly tiny cheap anchovy. Full body three-quarter view seated: his face trying to look haughty and insulted, eyes involuntarily sparkling at one tiny silver anchovy presented from the right by an anonymous human hand; one paw raised in a dignified 'no' gesture while the OTHER paw has already reached eagerly to accept the tiny anchovy. His curled tail gives away his excitement. Small embarrassed tear at outer eye, stubborn pout, one subtle hand-drawn sigh curl near mouth. Visual comedy is contradiction between pride and uncontrollable fish obsession. Elegant painterly anime rendering, detailed fluffy fur, same proportions and outfit as reference, entire hat and tail and both paws in frame, no text no speech bubbles no letters no coins no price tags no watermark. Do not multiply limbs: exactly two front paws, two visible seated back paws. Transparent background, no floor or scene.

## 검증 명령

```powershell
npm run check:fast -- --plan
npm run check:fast
npm run verify:hero-contrast
npm run verify:mobile-detail-nonintrusive
node --test __tests__/ui/yeongnyangi-free-fortune.test.mjs
# 별도 터미널의 격리 로컬 dev 서버 필요
npm run dev:next -- --port 3126
node scripts/verify-yeongnyangi-room-story-browser.mjs
```

브라우저 스크립트는 localhost만 허용하고 모든 /api/ 요청을 mock 처리한다. 실결제·LLM·운영 DB 요청을 보내지 않는다. 음악은 기존 CDN의 실제 재생을 검사한다. 증거는 `tmp/neo-room-verification/`에 저장하며 실기기 또는 운영 배포 증거로 간주하지 않는다.


## 확인 결과

- check:fast 통과(typecheck, node tests, smoke:core 및 관련 검사).
- 무료 운세 정적 계약 3/3, hero-contrast, mobile-detail-nonintrusive 통과.
- Chromium 1440×1000 / 390×844: 상호작용, 9장면 진행, 선택 대사, 실제 CDN BGM 재생/정지, Escape와 포커스 복귀, mock unlock 실패/성공 통과. 브라우저 오류 0.
- 모바일 모션 줄이기에서 한숨 애니메이션 비활성 확인. 실기기는 미검증.
- 내장 이미지 생성 2장: WebP 합계 약 401KiB, 코믹 컷 투명도 유지.
- Windows 드라이브 간 node_modules 정션의 Next 경로 문제는 독립 의존성 복사본으로 해결. 제품 설정 변경 없음.
