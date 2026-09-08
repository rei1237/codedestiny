# 원본과 제작 기록

2026-09-08~09, 내장 image_gen으로 이 작업에서 신규 제작. 스톡 이미지/업로드 얼굴 미사용. 인물은 가상의 성인. 목업용이며 모든 사용자 결과에 이 인물을 적용하지 않는다.

원본 디렉터리: `C:/Users/user/.codex/generated_images/01a0817e-355f-7a92-ab39-284d00c8638e/`. 원본은 보존했다. `optimize-assets.cjs`가 sharp로 480/800px WebP quality74/effort6 변환. 파일별 크기는 `../asset-sizes.json`.

## harbor

원본: exec-f251b442-d78c-4415-9912-0105bc12327b.png

정확한 생성 프롬프트:

Create a single exquisite Korean historical romance-fantasy webtoon illustration, portrait 2:3 ratio, NO text NO lettering NO panel borders. Scene one of an original CODE DESTINY story: a young adult East Asian woman cartographer with dark hair tied in a low loose bun, ivory linen hanbok-inspired travel robe, muted teal sleeveless outer garment, rust red thin ribbon at the wrist, carrying a rolled paper chart. She stands on an ancient East Asian wooden harbor pier at dawn, seen in a cinematic three-quarter portrait with her thoughtful eyes clearly rendered and a small quiet smile; misty sailing boats and stone town behind her. Restrained moon-silver, sea-green, warm apricot light, subtle rose reflections. Beautiful delicate linework, nuanced expressive face, flat cel-shaded shapes with painterly atmosphere, premium Korean webtoon, beautifully drawn hands, atmospheric depth, generous airy composition. Narrative: she is about to leave home to chart an unknown route. No photorealism, no 3D, no purple neon, no logos. Entire image is a scene, no UI. Output saveable image.

## choice

원본: exec-14e2f8d3-e01e-4370-a007-35f8f52ca002.png

정확한 생성 프롬프트:

A single portrait 2:3 premium Korean historical romance fantasy webtoon panel, no lettering or speech balloons or logos. Original CODE DESTINY episode, same character design described exactly: adult East Asian woman cartographer, black hair in a low loose bun, ivory linen hanbok-inspired travel robe, muted teal sleeveless outer garment, thin rust-red ribbon on wrist. Scene: a quiet high-stakes choice at an ancient East Asian harbor cartography workshop. Cinematic overhead-close angle on her face, upper torso and hands illuminated by one amber oil lamp. She carefully places a rolled chart into an older woman's open hands across a plain worn wooden desk. Loose drawings, a compass, warm tea on the desk. Rain in the window behind. Her expression quietly resolute, older woman relieved, no melodramatic tears. Fine expressive ink linework and rich clean cel shading, subtle teal and rose-gray shadows, cinematic candle light, beautiful hand anatomy. This is a moment of generosity and courage, no combat or menace. Exquisite Korean webtoon art, not photographic, not 3D. Minimal clean composition and believable historical atmosphere.

## memory

원본: exec-b3039f80-9378-41a5-9b25-10d859b879ee.png

정확한 생성 프롬프트:

Single vertical portrait 2:3 illustration, exquisite premium Korean historical fantasy webtoon final panel, no text no logo no speech balloons. Original CODE DESTINY story ending. A young adult East Asian woman cartographer, long black hair in a loose low bun, ivory linen historical hanbok-inspired travel robe, muted teal sleeveless outer garment, thin rust-red ribbon around wrist. Wide cinematic rear three-quarter angle: she stands on the deck of a small sailing boat looking toward a far harbor at moonset and apricot sunrise. The viewer sees her soft thoughtful profile. Her hand rests on the railing, holding one plain folded map. Tiny distant pier figures wave farewell. The sky has a silver crescent and early peach light, quiet teal ocean reflecting the light. Wind gently moves the red wrist ribbon. Mood: she chose to leave, feels uncertainty and possibility, bittersweet but hopeful, never tragic. Fine Korean webtoon ink linework, clean cel-shaded character, painterly atmospheric background, beautiful anatomy, sophisticated subdued palette, uncluttered image, no purple neon, no photorealism, no 3D.

## 실제 서비스 공통 컷 (2026-09-09)

내장 image_gen으로 제작했다. 원본 디렉터리는 `C:/Users/user/.codex/generated_images/01a0818c-82b8-7260-b01d-a72f1f2f3894/`이며 원본은 보존했다. 역할·시대와 충돌하지 않는 상징 컷으로 설계했고, sharp로 480/800px WebP(quality 72~78, effort 6)로 변환해 `fuctionassets/past-life-webtoon/`에 저장했다.

### clue

원본: `exec-b32670bc-fc91-42b5-9795-eb7f51dfb686.png`

프롬프트:

Use case: illustration-story. Asset type: mobile vertical webtoon scene for a Korean fortune-reading result. A symbolic close-up of an androgynous person's eyes reflected in an antique bronze mirror, suggesting a remembered past life without identifying any occupation, place, culture, or exact historical era. Quiet dawn haze, handmade paper texture, faint doorway geometry. Premium editorial Korean webtoon illustration, painterly ink and restrained cinematic realism. Portrait 2:3, no panel borders or captions. Warm paper cream, wine plum, muted rose, restrained antique gold. No specific uniform, tools, architecture, animals, text, logo, watermark, UI elements; no chibi, neon fantasy, generic tarot symbols, celebrity face, or horror.

### choice

원본: `exec-0bdd6a7c-0bed-4c0d-a754-0f475074d999.png`

프롬프트:

Use case: illustration-story. Asset type: mobile vertical webtoon scene. Close-up of two human hands making a difficult choice, one releasing a small tied paper token while the other reaches toward an open threshold; no particular occupation, country, gender, or exact era. Premium editorial Korean webtoon, painterly ink, handmade paper texture, restrained cinematic realism. Portrait 2:3, hands dominate, no borders or captions. Warm candlelight crossing cool dawn; paper cream, wine plum, muted rose, antique gold. Neutral modest sleeves; no specific tools, weapons, money, maps, animals, text, logos, watermark, UI; no chibi, neon fantasy, tarot symbols, gore, or horror.

### threshold

원본: `exec-c8e630fe-0337-438e-82dd-82ca52e57527.png`

프롬프트:

Use case: illustration-story. Asset type: mobile vertical webtoon closing scene. An androgynous figure seen from behind crossing a luminous threshold at dawn, leaving a dim interior and walking toward a branching path; symbolic of carrying a past-life lesson into the present, without implying any occupation, country, culture, or exact era. Premium editorial Korean webtoon illustration, painterly ink and handmade paper texture, restrained cinematic realism. Portrait 2:3, full-bleed, figure small enough to remain universal. First sunlight; paper cream, wine plum shadows, muted rose, restrained antique gold. Neutral timeless clothing and architecture; no tools, weapons, currency, maps, animals, text, logo, watermark, UI; no chibi, neon fantasy, tarot symbols, or horror.
