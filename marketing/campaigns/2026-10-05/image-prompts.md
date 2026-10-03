# 이미지 제작 기록 — v2

제작 모드: built-in ImageGen. 새 일러스트 3개를 직접 생성하고, 편집 가능한 HTML 문구와 실제 UI 캡처로 1080×1350 카드 9개를 구성했다.

1번은 assets/official-three-characters.png 원본 그대로. 이전 교체본은 assets에 보존. 게시 순서 v2/manifest.json. 이미지 요청은 transparent_background=true. 정확한 JSON은 v2/generation-prompts.json.

## cat-reading

출력: v2/art/cat-reading.png

참조: D:/Development/codedestiny-worktrees/moonstone-oct05-20261003-151816/public/assets/yeongnyangi/original/hero-800.webp

```text
Create a new original polished fantasy storybook illustration for a Korean fortune service marketing carousel. Reference image defines YEONGNYANGI identity exactly: chubby white long-haired cat, purple-gold eyes, slightly aloof yet kind expression, midnight navy pointed crescent/star hat, gold-edged navy cape, blue gemstone neck ornament. No humans, no lions, no additional characters. Cat sits beside an open beautifully bound ivory book of constellations on a small navy velvet desk, one paw gently offering a page to viewer. Soft warm gold rimlight, gentle moon dust, painterly watercolor plus clean premium animation finish. Subject fills frame, complete ears/hat/paws, charming 2.5-head chibi proportions. Isolated illustration with genuinely transparent background, subtle small grounding shadow only. No text, no letters, no logos, no numbers. Landscape-ish compact grouping, not a full poster.
```

## yeoni-gift

출력: v2/art/yeoni-gift.png

참조: C:/Users/user/Desktop/CodeDestiny-Build/연이 프로필1.png

```text
Create a new original ultra-adorable YEONI flower pig illustration using supplied character sheet as strict identity reference. Round soft baby pink face, enormous glossy dark-brown eyes with tiny catchlights, short rounded pink snout, tiny delighted open smile, plush plump cheeks, short pudgy arms and legs, 2.5 heads tall. Pink lotus perched on upper-left head, purple neck scarf, tiny curly tail. Exactly match the sheet; do NOT make long limbs, adult build, small eyes, realistic pig or heavy jowls. Yeoni sits happily holding a little cream gift box overflowing with beautiful lavender moon crystals, crescent ribbon, a few drifting pink petals. Friendly welcoming eye contact. Premium soft watercolor/chibi animation rendering. No humans or other animals, no Neo, no text/numbers/logos. Genuinely transparent background, full complete body, generous small margin around lotus and feet. A single finished character illustration, not a character sheet.
```

## duo-stars

출력: v2/art/duo-stars.png

참조: C:/Users/user/Desktop/CodeDestiny-Build/연이 프로필1.png, D:/Development/codedestiny-worktrees/moonstone-oct05-20261003-151816/public/assets/yeongnyangi/original/hero-800.webp

```text
Create a brand-new premium storybook illustration of ONLY the two supplied mascots together. Yeoni must match reference 1: very cute round baby-pink flower pig, huge brown eyes, short plump limbs, lotus on head and purple scarf, 2.5-head proportions. Yeongnyangi must match reference 2: white fluffy chibi cat, purple-gold eyes, navy/gold moon-star wizard hat and cape, blue gemstone. Both happily investigate a luminous open star atlas together, heads close, small floating motifs around them: one tarot card, a constellation, a crescent moon, an eastern four-pillar wooden tile, an orbital ring and a lotus; abstract icons only, NO invented data, no writing. Deep navy and warm gold accents with soft blush pink. Original high-end watercolor/animation rendering, extraordinarily charming pig. Complete characters, no human/no lion/no Neo. Genuinely transparent background. No text or logos. Compact horizontal group, centered.
```

새 카드에는 네오 그림이 없다. 연이의 둥근 얼굴·큰 갈색 눈·짧은 팔다리·연꽃·보라색 스카프를 확인했다. 실제 UI는 assets/actual-*.jpg를 그대로 배치했다.

## 설명형 개편

이번 개편은 기존 생성 원화를 재사용했다. 새 래스터 생성 없이 편집 가능한 서비스 특징 설명을 preview.html에 추가했다. 10번은 무료 체험·상담·소장으로 교체했고, 7번은 개선한 실제 ElementDistribution 컴포넌트를 가상 입력으로 캡처했다. 운영 화면 반영 전임을 표시한다.
