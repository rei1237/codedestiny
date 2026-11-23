# 전문가 상담실 영상 제작 기록

2026-11-24. 사전 제작한 Seedance 2.5 영상만 배포한다. 모든 생성은 720p·8초·참조 이미지 기반이며 오디오 생성을 껐다. 각 요청의 견적은 구독 포함 0크레딧이었다. 시작 이미지는 아래 경로의 기존 공개 일러스트다. 생성 요청에는 사용자 정보를 넣지 않았다.

| 마스터 | 원본 이미지 | Higgsfield 작업 ID | 배포 영상 |
|---|---|---|---|
| 꽃돼지 연이 | `/images/fortune-tea-house/renewal/yeoni-tea-welcome.webp` | `b9bacf46-476d-44e9-b595-0bcb9bb0898d` | `/images/fortune-tea-house/renewal/yeoni-tea-loop.mp4` |
| 영냥이 타로 | `/assets/yeongnyangi/readings/tarot-v5.webp` | `1906b75e-4a2a-4010-8623-a5bf11550468` | `/assets/yeongnyangi/readings/tarot-room.mp4` |
| 윤달 | `/images/expert-characters/yun/hero.webp` | `e281f3df-8842-4d02-8bf2-b949d13fb28a` | `/images/consultation-rooms/yun.mp4` |
| 무성 | `/images/expert-characters/musung/hero.webp` | `ba6db306-22e5-47b3-81f2-ec08d023efdd` | `/images/consultation-rooms/musung.mp4` |
| 인간형 서한비 | `/images/expert-characters/hanbi/hero.webp` | `52f978e5-4b3f-4ffd-9ced-4f406642491c` | `/images/consultation-rooms/hanbi.mp4` |
| 인간형 연이 | `/images/fortune-tea-house/renewal/yeoni-human-welcome.webp` | `ea0421be-a414-439d-a3d6-e0d8bf51e69b` | `/images/consultation-rooms/human.mp4` |
| 인연의 서 마스터 | `/images/service-introductions/master-love-codex-960.webp` | `d4c52860-f01f-414c-9ecf-3c9b5fd27ca3` | `/images/consultation-rooms/codex.mp4` |
| 인간형 네오 | `D:/CodeDestiny-Build/네오 인간 프로필1.png`와 동일 도안인 `/images/consultation-webtoons/heukwol/portraits/neo.webp` (얼굴), `/images/service-introductions/neo-operation-room-960.webp` (의상) | `64d1df50-a729-478b-a8a4-208e41045398` | `/images/consultation-rooms/neo.mp4` |
| 영냥이 saju | `/assets/yeongnyangi/readings/saju-v5.webp` | `3b986404-e80c-4872-a1cf-1341c1812c86` | `/assets/yeongnyangi/readings/saju-room.mp4` |
| 영냥이 ziwei | `/assets/yeongnyangi/readings/ziwei-v5.webp` | `9d9db704-a5cd-4694-b71e-be3e0634d31c` | `/assets/yeongnyangi/readings/ziwei-room.mp4` |
| 영냥이 vedic | `/assets/yeongnyangi/readings/vedic-v5.webp` | `e5baf4a1-2656-471c-ba48-b500c044799c` | `/assets/yeongnyangi/readings/vedic-room.mp4` |
| 영냥이 astrology | `/assets/yeongnyangi/readings/astrology-v5.webp` | `c552466a-e564-4742-a594-698bdffcde86` | `/assets/yeongnyangi/readings/astrology-room.mp4` |
| 영냥이 sukuyo | `/assets/yeongnyangi/readings/sukuyo-v5.webp` | `c9a50143-8879-4361-a20c-a964576d1e2a` | `/assets/yeongnyangi/readings/sukuyo-room.mp4` |
| 영냥이 fusion | `/assets/yeongnyangi/readings/fusion-v5.webp` | `5dafae7d-b80d-453b-ab70-33d75d4d2d53` | `/assets/yeongnyangi/readings/fusion-room.mp4` |

초융합에서는 네오·인간형 연이·인간형 서한비·윤달·무성 순으로 각 클립의 첫 3초를 사용한다. 흑월에서는 네오·인간형 연이의 단독 클립을 사용한다. 각 인물의 등장은 서버 진행 표시와 독립적이다. 웹 영상은 H.264, 오디오 스트림 없음, fast-start MP4다. 포스터는 영상 첫 프레임에서 추출했다. 원본 생성 결과는 위 작업 ID로 조회한다.

## 프롬프트

### 인간형 네오

Identity from image one: the adult human Neo in the large upper left portrait of the supplied Korean character sheet. Preserve his delicate angular face, narrow grey-blue eyes, pale complexion, tousled layered silver fringe, earrings and youthful proportions. Use image two for his strategist outfit only: navy-black formal uniform, ivory cape with fine gold embroidery and black gloves. Single premium illustrated 16:9 shot, waist up in the moonlit strategy study, unlettered decision folio and a folded strategy map clearly visible on the desk. Keep face centered with headroom. At rest, quietly look down at the decision folio, gently align its edge with one gloved hand, blink and look up again. Return to opening pose. Locked camera, subtle natural motion. Do not show a character sheet, panel, lettering, tattoo, UI, voices or text. Human ears only. No animals. Silent.

### 꽃돼지 연이

Animate the supplied illustration in place, locked camera. The little pale pink flower pig holds her teacup, blinks once, and rests in the starting pose. Preserve her pink lotus, folded ears, lilac scarf, hooves, tea table and warm light exactly. Subtle steam. No text or sound.

### 영냥이 타로

Use the supplied approved existing consultation artwork as the entire identity and setting reference. Locked camera, preserve the exact white cat, crescent hat, golden tassel, purple cape and pendant. Rest both paws on the existing star cards. Briefly lower eyes to a card then look up. Preserve both ears and paws. Return to the initial pose. Quiet repeatable motion, keep proportions and facial landmarks. No text, no generated audio, no additional limbs, no zoom or cuts.

### 윤달

Use the supplied approved existing consultation artwork as the entire identity and setting reference. Locked camera, preserve the existing dark-haired astrologer, dark embroidered robe, pendant, folding fan, and the small white cat. A restrained blink and a slight downward glance at the fan. Return to the initial pose. Quiet repeatable motion, keep proportions and facial landmarks. No text, no generated audio, no additional limbs, no zoom or cuts.

### 무성

Use the supplied approved existing consultation artwork as the entire identity and setting reference. Locked camera, preserve the exact long dark hair, violet eyes, robes, posture and luminous star chart. One gentle blink and a slight glance at the chart. Return to the initial pose. Quiet repeatable motion, keep proportions and facial landmarks. No text, no generated audio, no additional limbs, no zoom or cuts.

### 인간형 서한비

Keep the exact human woman Seo Hanbi, long dark hair, face, embroidered dark hanbok, book against her chest, moonlit river and bridge. Lower her gaze slightly toward the book and blink once. Use the reference composition exactly. Locked camera. Very subtle motion. Return gently to the initial pose. No written text or audio.

### 인간형 연이

Preserve the existing human woman Yeoni, every detail of her face, hairstyle, flowers, clothing and tea room. She gives a small nod and settles. Use the reference composition exactly. Locked camera. Very subtle motion. Return gently to the initial pose. No written text or audio.

### 인연의 서 마스터

Keep the supplied official consultation illustration. The same woman with dark hair and burgundy ornaments sits beside the book of relationships. She blinks and glances gently down at the open book. All objects remain in place, no camera movement, no extra hands, no changes to the face or costume, motion ends at starting expression. No readable text or audio.

## 음악

찻집의 기존 음원은 `destinycafe-05`(Yeoni, DestinyCafe/Moonlit Tea House.mp3), 영냥이의 방 음원은 `dest1nova-35`(DEST1NOVA, DestinyWar/Moonlit Strategy Map.mp3)다. 두 파일은 카탈로그의 free_full 버전이며 전체 디코딩 기준 평균 음량이 각각 -16.1 dB, -16.4 dB다. 보컬 청취 판정은 미검증이다.

## 영냥이 분야별 동작 지시

- yn-saju: Keep the exact adorable white divination cat Yeongnyangi in the attached illustration, the crescent hat, lavender-dark cape and gem, eyes, ears and fluffy tail. Gently blink, glance at the five element materials and the scroll of four pillars, then relax into the starting pose. Keep round soft feline paws and a tiny affectionate smile. Do not substitute tarot cards or another practice. Preserve the exact original room, props, palette and composition.
- yn-ziwei: Keep the exact adorable white divination cat Yeongnyangi in the attached illustration, the crescent hat, lavender-dark cape and gem, eyes, ears and fluffy tail. Gently blink, glance at the stellar globe with palace divisions, then relax into the starting pose. Keep round soft feline paws and a tiny affectionate smile. Do not substitute tarot cards or another practice. Preserve the exact original room, props, palette and composition.
- yn-vedic: Keep the exact adorable white divination cat Yeongnyangi in the attached illustration, the crescent hat, lavender-dark cape and gem, eyes, ears and fluffy tail. Gently blink, glance at the star almanac and brass observation tools, then relax into the starting pose. Keep round soft feline paws and a tiny affectionate smile. Do not substitute tarot cards or another practice. Preserve the exact original room, props, palette and composition.
- yn-astrology: Keep the exact adorable white divination cat Yeongnyangi in the attached illustration, the crescent hat, lavender-dark cape and gem, eyes, ears and fluffy tail. Gently blink, glance at the zodiac chart and planetary orbits, then relax into the starting pose. Keep round soft feline paws and a tiny affectionate smile. Do not substitute tarot cards or another practice. Preserve the exact original room, props, palette and composition.
- yn-sukuyo: Keep the exact adorable white divination cat Yeongnyangi in the attached illustration, the crescent hat, lavender-dark cape and gem, eyes, ears and fluffy tail. Gently blink, glance at the separation between two stars in the night sky, then relax into the starting pose. Keep round soft feline paws and a tiny affectionate smile. Do not substitute tarot cards or another practice. Preserve the exact original room, props, palette and composition.
- yn-fusion: Keep the exact adorable white divination cat Yeongnyangi in the attached illustration, the crescent hat, lavender-dark cape and gem, eyes, ears and fluffy tail. Gently blink, glance at the open book and the astronomical instruments, then relax into the starting pose. Keep round soft feline paws and a tiny affectionate smile. Do not substitute tarot cards or another practice. Preserve the exact original room, props, palette and composition.

공통 지시: Locked camera. Subtle repeatable 2D illustrated idle movement. Retain the first and final framing and character landmarks. No sound, dialogue, text, logos, wardrobe or species changes.
