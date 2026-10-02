# 라이트 노벨 개편(2026-10) 그림 출처

2026-10-02, 이 작업에서 codex CLI 내장 image_gen(gpt-image-2, ChatGPT 로그인)으로 새로 만들었다. 스톡 이미지·실존 인물 얼굴은 쓰지 않았다. 인물은 모두 가상의 성인이다. 과금 API 키 호출은 없다.

- 생성 스크립트: 세션 스크래치의 `gen.sh` — 한 번에 그림 1장, `codex exec "Use the built-in image_gen tool to generate exactly ONE image (size <SIZE>, quality high). <참조 안내> Prompt: <아래 원문>"`.
- 참조 안내(배경): `The attached images are STYLE REFERENCES only - do not copy their content.` 참조 그림은 기존 배경 `river`·`mirror`(레포에 이미 있는 비겁 아크 배경)의 축소본이다.
- 판정: 모든 결과를 visual-checker 로 판정했다(사람·동물 없음, 읽히는 글자 없음, 가운데 아래 스프라이트 자리 비움, 화풍 일치). 탈락본은 다시 만들었다.
- 파일별 바이트·크기는 `public/images/novel/remaster/manifest.json` 이 정본이다. 모바일 사본은 `content/novel/mobile-assets.json`.

## 배경 (1536x1024 생성)

변환: sharp `resize(1536x1024, cover)` → WebP effort 6, 품질 82에서 4씩 내려 360KB 이하가 되는 첫 값(siksangB 는 1440x960 q74). 모바일 사본은 `node scripts/build-novel-mobile-assets.mjs --keys=<키>`(1280 폭, 품질 78).

### siksang — `remaster/siksang-festival-street-v1.webp`

식상의 섬 — 해 질 녘에 멈춘 축제 거리

정확한 생성 프롬프트:

```text
A festival street at a frozen sunset: the sun hangs motionless just above the horizon at the far end of the street, casting long still amber shadows. Paper lanterns and festival bunting strung between old East Asian wooden shophouses with tiled roofs, food stalls with cloth awnings, a small wooden stage far away at the end of the street. Everything feels paused mid-breath, colors slightly desaturated. Low-saturation warm palette.

Painted anime visual-novel BACKGROUND, matching the painterly brushwork, soft luminous lighting and palette of the attached reference images (same series). Landscape 1536x1024. Fantasy East Asian island of self-expression (cooking, music, performance), fire element. STRICT RULES: absolutely NO people, NO animals, NO creatures, NO characters, NO silhouettes of figures anywhere. NO readable text, letters, numbers or logos; signs may show only simple pictograms (flame, musical note, bowl). Put the main landmark within the middle third of the width; keep the lower-center area of the image open and uncluttered (empty ground or floor) so characters can stand there in the foreground. Not a 3D render, not a theme park, not photorealistic. No UI, no frame, no watermark.
```

### siksang2 — `remaster/siksang-grey-market-v1.webp`

식상의 섬 — 맛을 잃은 회색 야시장

정확한 생성 프롬프트:

```text
A food market alley at dusk where all the food has lost its color: steaming pots, skewers and buns on the stalls are ash-grey, while the wooden stalls keep only faint warm lantern light. Empty stools, a cold griddle, thin grey smoke. Quiet and melancholy; one tiny warm ember glows at the far end of the alley.

Painted anime visual-novel BACKGROUND, matching the painterly brushwork, soft luminous lighting and palette of the attached reference images (same series). Landscape 1536x1024. Fantasy East Asian island of self-expression (cooking, music, performance), fire element. STRICT RULES: absolutely NO people, NO animals, NO creatures, NO characters, NO silhouettes of figures anywhere. NO readable text, letters, numbers or logos; signs may show only simple pictograms (flame, musical note, bowl). Put the main landmark within the middle third of the width; keep the lower-center area of the image open and uncluttered (empty ground or floor) so characters can stand there in the foreground. Not a 3D render, not a theme park, not photorealistic. No UI, no frame, no watermark.
```

### siksangA — `remaster/siksang-underground-stage-v1.webp`

식상의 섬 — 지하 무대

정확한 생성 프롬프트:

```text
A secret underground music stage in a stone cellar beneath the island: a low wooden stage with a worn drum and a microphone stand, string lights and candles, wooden crates and mismatched cushions for an audience, warm orange light against dark brick walls, hand-painted posters showing only flames and musical notes, a narrow stair leading up to a trapdoor. Cozy, hidden, rebellious.

Painted anime visual-novel BACKGROUND, matching the painterly brushwork, soft luminous lighting and palette of the attached reference images (same series). Landscape 1536x1024. Fantasy East Asian island of self-expression (cooking, music, performance), fire element. STRICT RULES: absolutely NO people, NO animals, NO creatures, NO characters, NO silhouettes of figures anywhere. NO readable text, letters, numbers or logos; signs may show only simple pictograms (flame, musical note, bowl). Put the main landmark within the middle third of the width; keep the lower-center area of the image open and uncluttered (empty ground or floor) so characters can stand there in the foreground. Not a 3D render, not a theme park, not photorealistic. No UI, no frame, no watermark.
```

### siksangB — `remaster/siksang-crow-court-v1.webp`

식상의 섬 — 까마귀 재판정

정확한 생성 프롬프트:

```text
A gothic fantasy courtroom of black lacquered wood and grey stone: a towering judge's bench high at the center crowned with a huge empty perch, black feathers drifting in the air, rows of empty grey benches on both sides, a small low defendant's stand in the lower foreground, cold grey light falling from tall narrow windows. Oppressive and silent; monochrome greys with tiny accents of dull gold.

Painted anime visual-novel BACKGROUND, matching the painterly brushwork, soft luminous lighting and palette of the attached reference images (same series). Landscape 1536x1024. Fantasy East Asian island of self-expression (cooking, music, performance), fire element. STRICT RULES: absolutely NO people, NO animals, NO creatures, NO characters, NO silhouettes of figures anywhere. NO readable text, letters, numbers or logos; signs may show only simple pictograms (flame, musical note, bowl). Put the main landmark within the middle third of the width; keep the lower-center area of the image open and uncluttered (empty ground or floor) so characters can stand there in the foreground. Not a 3D render, not a theme park, not photorealistic. No UI, no frame, no watermark.
```

### siksang4 — `remaster/siksang-eclipse-stage-v1.webp`

식상의 섬 — 일식이 걸린 정오 무대

정확한 생성 프롬프트:

```text
An open-air festival stage in a town square at noon during a solar eclipse: a black disk covers the sun leaving a thin burning ring, the sky is dark teal and dim, lanterns unlit, festival banners hanging limp, the square bathed in cold eerie half-light. Ominous but beautiful.

Painted anime visual-novel BACKGROUND, matching the painterly brushwork, soft luminous lighting and palette of the attached reference images (same series). Landscape 1536x1024. Fantasy East Asian island of self-expression (cooking, music, performance), fire element. STRICT RULES: absolutely NO people, NO animals, NO creatures, NO characters, NO silhouettes of figures anywhere. NO readable text, letters, numbers or logos; signs may show only simple pictograms (flame, musical note, bowl). Put the main landmark within the middle third of the width; keep the lower-center area of the image open and uncluttered (empty ground or floor) so characters can stand there in the foreground. Not a 3D render, not a theme park, not photorealistic. No UI, no frame, no watermark.
```

### siksang5 — `remaster/siksang-noon-stage-v1.webp`

식상의 섬 — 해가 돌아온 정오 무대 (추가 참조: siksang4 생성 결과)

정확한 생성 프롬프트:

```text
The SAME open-air festival stage in the same town square as the third attached image (keep the stage, square layout and camera angle), but now the eclipse has ended: the full noon sun blazes back in a clear sky blue, warm golden light floods the square, lanterns glowing, vermilion and gold festival banners lifted by a breeze, scattered petals and sparks of light in the air. Joyful, triumphant, bright.

Painted anime visual-novel BACKGROUND, matching the painterly brushwork, soft luminous lighting and palette of the attached reference images (same series). Landscape 1536x1024. Fantasy East Asian island of self-expression (cooking, music, performance), fire element. STRICT RULES: absolutely NO people, NO animals, NO creatures, NO characters, NO silhouettes of figures anywhere. NO readable text, letters, numbers or logos; signs may show only simple pictograms (flame, musical note, bowl). Put the main landmark within the middle third of the width; keep the lower-center area of the image open and uncluttered (empty ground or floor) so characters can stand there in the foreground. Not a 3D render, not a theme park, not photorealistic. No UI, no frame, no watermark.
```

### siksangNight — `remaster/siksang-lantern-alley-v1.webp`

식상의 섬 — 등불이 켜진 밤 골목

정확한 생성 프롬프트:

```text
A narrow night alley on the festival island lit by warm paper lanterns: indigo starry sky, wet stone path reflecting lantern light, closed wooden shop shutters, potted plants, a tiny roadside shrine with one candle. Calm and intimate; deep navy blue with warm amber lantern accents.

Painted anime visual-novel BACKGROUND, matching the painterly brushwork, soft luminous lighting and palette of the attached reference images (same series). Landscape 1536x1024. Fantasy East Asian island of self-expression (cooking, music, performance), fire element. STRICT RULES: absolutely NO people, NO animals, NO creatures, NO characters, NO silhouettes of figures anywhere. NO readable text, letters, numbers or logos; signs may show only simple pictograms (flame, musical note, bowl). Put the main landmark within the middle third of the width; keep the lower-center area of the image open and uncluttered (empty ground or floor) so characters can stand there in the foreground. Not a 3D render, not a theme park, not photorealistic. No UI, no frame, no watermark.
```

### siksang3 — `remaster/siksang-seaside-hill-v1.webp`

식상의 섬 — 바닷가 언덕

정확한 생성 프롬프트:

```text
A grassy seaside hill on the island at dusk overlooking a calm sea: a lone old pine tree and an empty wooden bench, the frozen sunset sitting on the horizon over the water, the festival town's tiled rooftops and lanterns visible far below on the left. Wistful and open, wind moving the grass.

Painted anime visual-novel BACKGROUND, matching the painterly brushwork, soft luminous lighting and palette of the attached reference images (same series). Landscape 1536x1024. Fantasy East Asian island of self-expression (cooking, music, performance), fire element. STRICT RULES: absolutely NO people, NO animals, NO creatures, NO characters, NO silhouettes of figures anywhere. NO readable text, letters, numbers or logos; signs may show only simple pictograms (flame, musical note, bowl). Put the main landmark within the middle third of the width; keep the lower-center area of the image open and uncluttered (empty ground or floor) so characters can stand there in the foreground. Not a 3D render, not a theme park, not photorealistic. No UI, no frame, no watermark.
```

### timeVault — `remaster/time-vault-v1.webp`

재성의 섬 — 시간 금고

정확한 생성 프롬프트:

```text
A vast underground vault of time on a fantasy island of wealth: circular bronze vault door standing open in the center, walls of countless small drawers glowing amber, hourglasses of every size on shelves, golden sand trickling down from the ceiling in thin streams, a large dark-green jade egg resting on a stone pedestal behind the door. Warm gold and shadow, tense heist mood.

Painted anime visual-novel BACKGROUND, matching the painterly brushwork, soft luminous lighting and palette of the attached reference images (same series). Landscape 1536x1024. STRICT RULES: absolutely NO people, NO animals, NO creatures, NO characters, NO silhouettes of figures anywhere. NO readable text, letters, numbers or logos; any signs, book spines, cards or dials may show only simple pictograms or abstract glyph-like marks. Put the main landmark within the middle third of the width; keep the lower-center area of the image open and uncluttered (empty ground or floor) so characters can stand there in the foreground. Not a 3D render, not a theme park, not photorealistic. No UI, no frame, no watermark.
```

### sunkenStacks — `remaster/sunken-stacks-v1.webp`

인성의 도서관 — 물에 잠긴 서고

정확한 생성 프롬프트:

```text
A grand library hall half-sunken under clear deep-blue water: tall wooden bookshelves rising out of the water, floating loose pages, light rays slanting through the water surface from high arched windows, a spiral stair in the center disappearing under water. Quiet, cold, melancholic, beautiful.

Painted anime visual-novel BACKGROUND, matching the painterly brushwork, soft luminous lighting and palette of the attached reference images (same series). Landscape 1536x1024. STRICT RULES: absolutely NO people, NO animals, NO creatures, NO characters, NO silhouettes of figures anywhere. NO readable text, letters, numbers or logos; any signs, book spines, cards or dials may show only simple pictograms or abstract glyph-like marks. Put the main landmark within the middle third of the width; keep the lower-center area of the image open and uncluttered (empty ground or floor) so characters can stand there in the foreground. Not a 3D render, not a theme park, not photorealistic. No UI, no frame, no watermark.
```

### eclipseSky — `remaster/eclipse-sky-v1.webp`

흑월 — 일식 하늘

정확한 생성 프롬프트:

```text
A huge solar eclipse filling the sky above a dark sea of clouds: a black disk with a burning white-gold corona, faint black ink-like tendrils seeping from the black disk across the sky, dim violet and teal twilight, a lone stone cliff ledge in the foreground. Ominous, cosmic dread.

Painted anime visual-novel BACKGROUND, matching the painterly brushwork, soft luminous lighting and palette of the attached reference images (same series). Landscape 1536x1024. STRICT RULES: absolutely NO people, NO animals, NO creatures, NO characters, NO silhouettes of figures anywhere. NO readable text, letters, numbers or logos; any signs, book spines, cards or dials may show only simple pictograms or abstract glyph-like marks. Put the main landmark within the middle third of the width; keep the lower-center area of the image open and uncluttered (empty ground or floor) so characters can stand there in the foreground. Not a 3D render, not a theme park, not photorealistic. No UI, no frame, no watermark.
```

### aptHall — `remaster/apartment-hall-v1.webp`

현실 — 아파트 복도

정확한 생성 프롬프트:

```text
A modern Korean apartment building corridor on a rainy evening: long open-air hallway with a railing on one side, numbered doors replaced by plain blank plates, rain falling beyond the railing, wet floor reflecting warm ceiling lights, a closed black umbrella leaning beside one door in the middle distance. Calm, realistic everyday mood, slightly mysterious.

Painted anime visual-novel BACKGROUND, matching the painterly brushwork, soft luminous lighting and palette of the attached reference images (same series). Landscape 1536x1024. STRICT RULES: absolutely NO people, NO animals, NO creatures, NO characters, NO silhouettes of figures anywhere. NO readable text, letters, numbers or logos; any signs, book spines, cards or dials may show only simple pictograms or abstract glyph-like marks. Put the main landmark within the middle third of the width; keep the lower-center area of the image open and uncluttered (empty ground or floor) so characters can stand there in the foreground. Not a 3D render, not a theme park, not photorealistic. No UI, no frame, no watermark.
```

### skyship — `remaster/observatory-skyship-v1.webp`

점성술 — 천문대 하늘배

정확한 생성 프롬프트:

```text
An astronomical observatory built on a wooden flying sky-ship sailing through a starry night above the clouds: a brass telescope dome in the center of the deck, a giant brass zodiac wheel with twelve abstract pictogram sectors behind it, constellation lines glowing across the deep indigo sky, sails of pale blue cloth. Wonder and adventure.

Painted anime visual-novel BACKGROUND, matching the painterly brushwork, soft luminous lighting and palette of the attached reference images (same series). Landscape 1536x1024. STRICT RULES: absolutely NO people, NO animals, NO creatures, NO characters, NO silhouettes of figures anywhere. NO readable text, letters, numbers or logos; any signs, book spines, cards or dials may show only simple pictograms or abstract glyph-like marks. Put the main landmark within the middle third of the width; keep the lower-center area of the image open and uncluttered (empty ground or floor) so characters can stand there in the foreground. Not a 3D render, not a theme park, not photorealistic. No UI, no frame, no watermark.
```

### nakshatra — `remaster/nakshatra-temple-v1.webp`

베다 — 27 달집 사원

정확한 생성 프롬프트:

```text
An ancient Indian-inspired moon temple at night: a circular open-air stone courtyard ringed by twenty-seven small carved shrines each holding a little glowing lamp, a full moon above the central stone spire, red threads strung between the shrines crisscrossing over the courtyard, marigold petals on the floor. Sacred, warm lamp light against deep blue night.

Painted anime visual-novel BACKGROUND, matching the painterly brushwork, soft luminous lighting and palette of the attached reference images (same series). Landscape 1536x1024. STRICT RULES: absolutely NO people, NO animals, NO creatures, NO characters, NO silhouettes of figures anywhere. NO readable text, letters, numbers or logos; any signs, book spines, cards or dials may show only simple pictograms or abstract glyph-like marks. Put the main landmark within the middle third of the width; keep the lower-center area of the image open and uncluttered (empty ground or floor) so characters can stand there in the foreground. Not a 3D render, not a theme park, not photorealistic. No UI, no frame, no watermark.
```

### tarotHall — `remaster/tarot-corridor-v1.webp`

타로 — 카드 회랑

정확한 생성 프롬프트:

```text
An endless dreamlike corridor made of giant standing tarot-like cards: tall ornate card panels with gilded borders lining both sides like doors, each showing only abstract symbols (sun, moon, star, tower, wheel), a checkered marble floor, soft violet mist, a single bright doorway of light at the far end in the center. Mystical, whimsical, slightly uncanny.

Painted anime visual-novel BACKGROUND, matching the painterly brushwork, soft luminous lighting and palette of the attached reference images (same series). Landscape 1536x1024. STRICT RULES: absolutely NO people, NO animals, NO creatures, NO characters, NO silhouettes of figures anywhere. NO readable text, letters, numbers or logos; any signs, book spines, cards or dials may show only simple pictograms or abstract glyph-like marks. Put the main landmark within the middle third of the width; keep the lower-center area of the image open and uncluttered (empty ground or floor) so characters can stand there in the foreground. Not a 3D render, not a theme park, not photorealistic. No UI, no frame, no watermark.
```

### towerFall — `remaster/falling-tower-v1.webp`

타로 — 무너지는 탑

정확한 생성 프롬프트:

```text
A tall stone tower on a rocky peak being struck by lightning at night: the crowned top breaking apart and falling, fire and sparks, dark storm clouds, stone fragments suspended mid-air, stormy blue and orange light. Dramatic catastrophe, viewed from the ground with an open rocky plateau in the foreground.

Painted anime visual-novel BACKGROUND, matching the painterly brushwork, soft luminous lighting and palette of the attached reference images (same series). Landscape 1536x1024. STRICT RULES: absolutely NO people, NO animals, NO creatures, NO characters, NO silhouettes of figures anywhere. NO readable text, letters, numbers or logos; any signs, book spines, cards or dials may show only simple pictograms or abstract glyph-like marks. Put the main landmark within the middle third of the width; keep the lower-center area of the image open and uncluttered (empty ground or floor) so characters can stand there in the foreground. Not a 3D render, not a theme park, not photorealistic. No UI, no frame, no watermark.
```

### gongmang — `remaster/gongmang-void-v1.webp`

결전 — 공망(일식 속)

정확한 생성 프롬프트:

```text
The inside of a void, an emptiness within an eclipse: a vast black space with a faint ring of white-gold light far above, fragments of different worlds (a lantern, a bookshelf, a temple roof, a tarot card, a cherry branch) drifting and dissolving into black sand, a thin floating stone platform in the foreground. Silent, empty, final-battle atmosphere.

Painted anime visual-novel BACKGROUND, matching the painterly brushwork, soft luminous lighting and palette of the attached reference images (same series). Landscape 1536x1024. STRICT RULES: absolutely NO people, NO animals, NO creatures, NO characters, NO silhouettes of figures anywhere. NO readable text, letters, numbers or logos; any signs, book spines, cards or dials may show only simple pictograms or abstract glyph-like marks. Put the main landmark within the middle third of the width; keep the lower-center area of the image open and uncluttered (empty ground or floor) so characters can stand there in the foreground. Not a 3D render, not a theme park, not photorealistic. No UI, no frame, no watermark.
```

### worldTree — `remaster/world-tree-v1.webp`

결전 — 세계수

정확한 생성 프롬프트:

```text
A colossal world tree rising into the sky at dawn: an enormous trunk in the center with roots spreading like rivers of light, branches holding small glowing orbs like stars, five faint colored lights (green, red, yellow, white, blue) circling the trunk, a mossy open clearing at the foot of the tree. Awe, hope, final sanctuary.

Painted anime visual-novel BACKGROUND, matching the painterly brushwork, soft luminous lighting and palette of the attached reference images (same series). Landscape 1536x1024. STRICT RULES: absolutely NO people, NO animals, NO creatures, NO characters, NO silhouettes of figures anywhere. NO readable text, letters, numbers or logos; any signs, book spines, cards or dials may show only simple pictograms or abstract glyph-like marks. Put the main landmark within the middle third of the width; keep the lower-center area of the image open and uncluttered (empty ground or floor) so characters can stand there in the foreground. Not a 3D render, not a theme park, not photorealistic. No UI, no frame, no watermark.
```

### cherryDay — `remaster/cherry-riverbank-day-v1.webp`

귀환 — 낮의 벚꽃 강가

정확한 생성 프롬프트:

```text
A riverside walking path in a Korean city on a bright spring afternoon: cherry blossom trees in full bloom arching over the path, petals drifting onto a calm blue river, a stone bridge in the middle distance, soft clear sky, a wooden bench to one side. Gentle, warm, peaceful, romantic.

Painted anime visual-novel BACKGROUND, matching the painterly brushwork, soft luminous lighting and palette of the attached reference images (same series). Landscape 1536x1024. STRICT RULES: absolutely NO people, NO animals, NO creatures, NO characters, NO silhouettes of figures anywhere. NO readable text, letters, numbers or logos; any signs, book spines, cards or dials may show only simple pictograms or abstract glyph-like marks. Put the main landmark within the middle third of the width; keep the lower-center area of the image open and uncluttered (empty ground or floor) so characters can stand there in the foreground. Not a 3D render, not a theme park, not photorealistic. No UI, no frame, no watermark.
```

## 서한비 사람 컷 — `remaster/pje/{cry,sad,smile,resolve}.webp`

1024x1536, 2x2 초록 배경 시트. 참조: 공개 R2 의 기존 서한비 사람 스프라이트 3장(`pje` 키, 읽기 전용 내려받기). 처리: 초록 키 제거 → 가장자리 1px 침식 → 칸 자르기 → 기존 R2 컷과 머리 크기를 맞추려 0.8배 축소 → 위 45px·아래 80px 투명 여백으로 627px 높이 → WebP q90.

정확한 생성 프롬프트:

```text
A character EXPRESSION SHEET for a Korean anime visual novel. The attached reference sprites show the character SEO HAN-BI: draw exactly the SAME woman with the same face, hair, outfit, colors and art style (same line weight and shading), just with new expressions.

Layout: a precise 2 columns x 2 rows grid of 4 equal cells (each cell 512x768), no borders, no gutters, no labels, no text. Every cell shows her with the SAME framing as the reference (same body crop, same scale, head at the same height, nothing cut at the top), standing, facing the viewer, centered. Background of the whole image: flat solid pure green #00FF00 with no gradient, no shadow, no floor.

These are her softened, human, repentant expressions (no madness, no sneer):
top-left: crying quietly, tears running down her cheeks, eyebrows drawn together, mouth trembling, hands held together at her chest;
top-right: sad and remorseful, eyes lowered, lips pressed, one hand holding her other arm;
bottom-left: a small faint gentle smile, eyes soft and slightly wet, shoulders relaxed;
bottom-right: resolute and determined, steady gaze straight ahead, chin up, one hand closed into a fist at her side.

No other people, no animals, no extra props. No text, no numbers, no watermark.
```

## 윤달 — `remaster/yun/<표정>.webp`

4x2 표정 시트 시도는 탈락했다(yunSheet: 초록 배경 무시·칸 넘침, yunSheet2: 코트가 칸을 꽉 채워 잘림). 인물 설계는 yunSheet 결과를 참조로 yunSheet2 에서 다듬었고, yunSheet2 결과를 인물 참조로만 써서 표정마다 1024x1536 투명 낱장을 만들었다(SIZE=1024x1536, NOREF=1).
참조 안내: `Attachment 1 (ref-yeon.png) is a STYLE reference only - do not draw her. Attachment 2 (ref-yun-char2.png) is a sheet of the CHARACTER - draw exactly this same man ...`. ref-yeon 은 레포의 연이 스프라이트, ref-yun-char2 는 아래 yunSheet2 생성 결과다.
처리: 표정마다 알파 128 초과 첫 행(머리 꼭대기)을 재고, 가장 낮은 값(surprise 204px)에 맞춰 나머지를 아래로만 옮긴 뒤 아래를 잘라 1024x1536 을 유지한다(표정이 바뀔 때 머리가 튀지 않게). 그다음 모두 같은 비율(1/3, lanczos3, 알파 곱셈 리사이즈는 sharp 기본)로 341x512 로 줄여 머리 크기를 맞춘다. void 는 1차본이 좌우 가장자리에서 잘려 같은 프롬프트에 코트 폭 조건을 더해 다시 만들었다(아래가 최종 프롬프트). WebP q90·alphaQuality 100(78KB 이하가 될 때까지 품질을 낮춤).

### 인물 설계 시트 yunSheet (출고하지 않음, 참조: ref-yeon)

```text
BACKGROUND RULE (most important): the entire image background is ONE completely flat chroma-key green #00FF00, filling every cell edge to edge. No dark backdrop, no vignette, no gradient, no glow, no light effects behind the figures, no floor shadow.

A character EXPRESSION SHEET for a Korean anime visual novel, in exactly the same art style, line weight, cel shading and coloring as the attached reference sprite (a young woman; she is only a STYLE reference, do not draw her).

Layout: a precise 4 columns x 2 rows grid of 8 equal cells (each cell 384x512), no borders, no gutters, no labels, no text. Every cell shows the SAME man as a half-body portrait (head to waist), facing the viewer, centered in the cell with the same scale and the same head height in every cell. Draw each figure SMALL enough to fit entirely inside its own 384x512 cell with at least 24 pixels of green margin on the left, right and top; arms, sleeves, coat, hair and fan must never touch or cross a cell edge. Arms stay close to the body. Background of the whole image: flat solid pure green #00FF00 with no gradient, no shadow, no floor.

The character, identical in all 8 cells: YUN-DAL, a Korean man about 27 years old, a charming roguish fortune teller. Slim, medium height. Dark navy-black hair, slightly messy, tied into a short low ponytail with a few loose strands over the forehead. Narrow amused eyes with grey-violet irises, a small mole under the left eye. A single silver crescent-moon earring in the right ear. Outfit: a long deep-navy modern-hanbok style coat (durumagi) worn open, with faint silver embroidery of moon phases along the collar, over a cream high-collar shirt; a round brass compass-like pendant on a cord. His LEFT hand is wrapped in a black cloth bandage up to the wrist. He holds a closed folding fan in his right hand in most cells.

Expressions, left to right, top row: 1 neutral relaxed smile; 2 sly flirtatious grin, one eyebrow raised, fan touching his chin; 3 serious focused look, lips pressed, fan lowered; 4 surprised, eyes wide, mouth open, leaning back slightly.
Bottom row: 5 in pain, wincing, gripping his bandaged left wrist with his right hand; 6 the bandage unwound, LEFT palm raised toward the viewer showing a small swirling black void like a hole of night in the center of the palm, grim determined face; 7 laughing openly, eyes closed, fan opened; 8 quietly sad, eyes lowered, a faint lonely smile.

No other people, no animals, no props besides the fan and pendant. No text, no numbers, no watermark.


REMINDER: flat #00FF00 green background everywhere, at least 24px green margin around each figure inside its cell.
```

### 인물 참조 시트 yunSheet2 (출고하지 않음, 참조: ref-yeon + yunSheet 결과)

```text
BACKGROUND RULE (most important): fully TRANSPARENT background (alpha 0) everywhere outside the figures. No backdrop, no dark gradient, no vignette, no glow, no aura, no floor shadow, nothing semi-transparent behind the figures.

A character EXPRESSION SHEET for a Korean anime visual novel, in exactly the same art style, line weight, cel shading and coloring as the attached reference sprite (a young woman; she is only a STYLE reference, do not draw her).

Layout: a precise 4 columns x 2 rows grid of 8 equal cells (each cell 384x512), no borders, no gutters, no labels, no text. Every cell shows the SAME man as a BUST portrait (head to mid-chest only), facing the viewer, centered in the cell with the same scale and the same head height in every cell. Draw each figure SMALL: the whole figure including both sleeves and the coat is at most 290 px wide inside its 384 px cell, leaving at least 40 px of empty space on the left and right and 30 px on top. Sleeves hang straight down close to the body. The bottom of the figure is cut off cleanly by the bottom cell edge at mid-chest, no fade. Nothing may touch the left, right or top cell edge. Background of the whole image: transparent.

The character, identical in all 8 cells: YUN-DAL, a Korean man about 27 years old, a charming roguish fortune teller. Slim, medium height. Dark navy-black hair, slightly messy, tied into a short low ponytail with a few loose strands over the forehead. Narrow amused eyes with grey-violet irises, a small mole under the left eye. Exactly one silver crescent-moon earring, in his right ear only; nothing in the left ear. Outfit: a long deep-navy modern-hanbok style coat (durumagi) worn open, with faint silver embroidery of moon phases along the collar, over a cream high-collar shirt; a round brass compass-like pendant on a cord. His LEFT hand is wrapped in a black cloth bandage up to the wrist. He holds a closed folding fan in his right hand in most cells.

Expressions, left to right, top row: 1 neutral relaxed smile; 2 sly flirtatious grin, one eyebrow raised, fan touching his chin; 3 serious focused look, lips pressed, fan lowered; 4 surprised, eyes wide, mouth open, leaning back slightly.
Bottom row: 5 in pain, wincing, gripping his bandaged left wrist with his right hand; 6 the bandage unwound, LEFT palm raised toward the viewer showing a small swirling black void like a hole of night in the center of the palm, grim determined face; 7 laughing openly, eyes closed, fan opened; 8 quietly sad, eyes lowered, a faint lonely smile.

No other people, no animals, no props besides the fan and pendant. No text, no numbers, no watermark.


REMINDER: transparent background with no backdrop; every figure narrow (at most 290 px wide) and centered with at least 40 px of empty space left and right inside its cell.
```

### base

```text
BACKGROUND (most important): fully TRANSPARENT background (alpha 0). No backdrop, no gradient, no glow, no aura, no shadow.

A single character sprite for a Korean anime visual novel, in exactly the same art style, line weight, cel shading and coloring as the attached style reference (a young woman; style only, do not draw her). Portrait canvas 1024x1536.

Framing: ONE man, a BUST portrait from the top of his head down to his waist, facing the viewer, centered. The whole figure including hair, both sleeves, the coat and the fan is at most 700 px wide and stays well inside the canvas with at least 150 px of empty transparent space on the left and on the right and at least 120 px above the head. Sleeves hang close to the body. The bottom of the figure is cut off cleanly by the bottom canvas edge at the waist, no fade. Nothing touches the left, right or top edge.

The character (match the attached character reference exactly): YUN-DAL, a Korean man about 27 years old, a charming roguish fortune teller. Slim. Dark navy-black slightly messy hair tied in a short low ponytail with a few loose strands over the forehead. Narrow amused eyes with grey-violet irises, a small mole under the left eye. Exactly ONE earring: a silver crescent moon in his right ear; his left ear has NO earring. A long deep-navy modern-hanbok style coat (durumagi) worn open with faint silver moon-phase embroidery along the collar, over a cream high-collar shirt; a round brass compass-like pendant on a cord. His LEFT hand is wrapped in a black cloth bandage up to the wrist. A folding fan in his right hand.

Expression and pose: a neutral relaxed easy smile, fan closed and held low in his right hand.

No other people, no animals, no props besides the fan and pendant. No text, no numbers, no watermark.

REMINDER: transparent background; at least 150 px of empty space left and right of the figure; nothing clipped at the sides.
```

### sly

```text
BACKGROUND (most important): fully TRANSPARENT background (alpha 0). No backdrop, no gradient, no glow, no aura, no shadow.

A single character sprite for a Korean anime visual novel, in exactly the same art style, line weight, cel shading and coloring as the attached style reference (a young woman; style only, do not draw her). Portrait canvas 1024x1536.

Framing: ONE man, a BUST portrait from the top of his head down to his waist, facing the viewer, centered. The whole figure including hair, both sleeves, the coat and the fan is at most 700 px wide and stays well inside the canvas with at least 150 px of empty transparent space on the left and on the right and at least 120 px above the head. Sleeves hang close to the body. The bottom of the figure is cut off cleanly by the bottom canvas edge at the waist, no fade. Nothing touches the left, right or top edge.

The character (match the attached character reference exactly): YUN-DAL, a Korean man about 27 years old, a charming roguish fortune teller. Slim. Dark navy-black slightly messy hair tied in a short low ponytail with a few loose strands over the forehead. Narrow amused eyes with grey-violet irises, a small mole under the left eye. Exactly ONE earring: a silver crescent moon in his right ear; his left ear has NO earring. A long deep-navy modern-hanbok style coat (durumagi) worn open with faint silver moon-phase embroidery along the collar, over a cream high-collar shirt; a round brass compass-like pendant on a cord. His LEFT hand is wrapped in a black cloth bandage up to the wrist. A folding fan in his right hand.

Expression and pose: a sly flirtatious grin with one eyebrow raised, the closed fan lightly touching his chin.

No other people, no animals, no props besides the fan and pendant. No text, no numbers, no watermark.

REMINDER: transparent background; at least 150 px of empty space left and right of the figure; nothing clipped at the sides.
```

### serious

```text
BACKGROUND (most important): fully TRANSPARENT background (alpha 0). No backdrop, no gradient, no glow, no aura, no shadow.

A single character sprite for a Korean anime visual novel, in exactly the same art style, line weight, cel shading and coloring as the attached style reference (a young woman; style only, do not draw her). Portrait canvas 1024x1536.

Framing: ONE man, a BUST portrait from the top of his head down to his waist, facing the viewer, centered. The whole figure including hair, both sleeves, the coat and the fan is at most 700 px wide and stays well inside the canvas with at least 150 px of empty transparent space on the left and on the right and at least 120 px above the head. Sleeves hang close to the body. The bottom of the figure is cut off cleanly by the bottom canvas edge at the waist, no fade. Nothing touches the left, right or top edge.

The character (match the attached character reference exactly): YUN-DAL, a Korean man about 27 years old, a charming roguish fortune teller. Slim. Dark navy-black slightly messy hair tied in a short low ponytail with a few loose strands over the forehead. Narrow amused eyes with grey-violet irises, a small mole under the left eye. Exactly ONE earring: a silver crescent moon in his right ear; his left ear has NO earring. A long deep-navy modern-hanbok style coat (durumagi) worn open with faint silver moon-phase embroidery along the collar, over a cream high-collar shirt; a round brass compass-like pendant on a cord. His LEFT hand is wrapped in a black cloth bandage up to the wrist. A folding fan in his right hand.

Expression and pose: a serious focused look, lips pressed, eyes sharp, fan lowered.

No other people, no animals, no props besides the fan and pendant. No text, no numbers, no watermark.

REMINDER: transparent background; at least 150 px of empty space left and right of the figure; nothing clipped at the sides.
```

### surprise

```text
BACKGROUND (most important): fully TRANSPARENT background (alpha 0). No backdrop, no gradient, no glow, no aura, no shadow.

A single character sprite for a Korean anime visual novel, in exactly the same art style, line weight, cel shading and coloring as the attached style reference (a young woman; style only, do not draw her). Portrait canvas 1024x1536.

Framing: ONE man, a BUST portrait from the top of his head down to his waist, facing the viewer, centered. The whole figure including hair, both sleeves, the coat and the fan is at most 700 px wide and stays well inside the canvas with at least 150 px of empty transparent space on the left and on the right and at least 120 px above the head. Sleeves hang close to the body. The bottom of the figure is cut off cleanly by the bottom canvas edge at the waist, no fade. Nothing touches the left, right or top edge.

The character (match the attached character reference exactly): YUN-DAL, a Korean man about 27 years old, a charming roguish fortune teller. Slim. Dark navy-black slightly messy hair tied in a short low ponytail with a few loose strands over the forehead. Narrow amused eyes with grey-violet irises, a small mole under the left eye. Exactly ONE earring: a silver crescent moon in his right ear; his left ear has NO earring. A long deep-navy modern-hanbok style coat (durumagi) worn open with faint silver moon-phase embroidery along the collar, over a cream high-collar shirt; a round brass compass-like pendant on a cord. His LEFT hand is wrapped in a black cloth bandage up to the wrist. A folding fan in his right hand.

Expression and pose: surprised, eyes wide and mouth open, leaning back slightly.

No other people, no animals, no props besides the fan and pendant. No text, no numbers, no watermark.

REMINDER: transparent background; at least 150 px of empty space left and right of the figure; nothing clipped at the sides.
```

### pain

```text
BACKGROUND (most important): fully TRANSPARENT background (alpha 0). No backdrop, no gradient, no glow, no aura, no shadow.

A single character sprite for a Korean anime visual novel, in exactly the same art style, line weight, cel shading and coloring as the attached style reference (a young woman; style only, do not draw her). Portrait canvas 1024x1536.

Framing: ONE man, a BUST portrait from the top of his head down to his waist, facing the viewer, centered. The whole figure including hair, both sleeves, the coat and the fan is at most 700 px wide and stays well inside the canvas with at least 150 px of empty transparent space on the left and on the right and at least 120 px above the head. Sleeves hang close to the body. The bottom of the figure is cut off cleanly by the bottom canvas edge at the waist, no fade. Nothing touches the left, right or top edge.

The character (match the attached character reference exactly): YUN-DAL, a Korean man about 27 years old, a charming roguish fortune teller. Slim. Dark navy-black slightly messy hair tied in a short low ponytail with a few loose strands over the forehead. Narrow amused eyes with grey-violet irises, a small mole under the left eye. Exactly ONE earring: a silver crescent moon in his right ear; his left ear has NO earring. A long deep-navy modern-hanbok style coat (durumagi) worn open with faint silver moon-phase embroidery along the collar, over a cream high-collar shirt; a round brass compass-like pendant on a cord. His LEFT hand is wrapped in a black cloth bandage up to the wrist. A folding fan in his right hand.

Expression and pose: in pain, wincing with gritted teeth, his right hand gripping his bandaged left wrist in front of his chest.

No other people, no animals, no props besides the fan and pendant. No text, no numbers, no watermark.

REMINDER: transparent background; at least 150 px of empty space left and right of the figure; nothing clipped at the sides.
```

### void

```text
BACKGROUND (most important): fully TRANSPARENT background (alpha 0). No backdrop, no gradient, no glow, no aura, no shadow.

A single character sprite for a Korean anime visual novel, in exactly the same art style, line weight, cel shading and coloring as the attached style reference (a young woman; style only, do not draw her). Portrait canvas 1024x1536.

Framing: ONE man, a BUST portrait from the top of his head down to his waist, facing the viewer, centered. The whole figure including hair, both sleeves, the coat and the fan is at most 700 px wide and stays well inside the canvas with at least 150 px of empty transparent space on the left and on the right and at least 120 px above the head. Sleeves hang close to the body. The bottom of the figure is cut off cleanly by the bottom canvas edge at the waist, no fade. Nothing touches the left, right or top edge.

The character (match the attached character reference exactly): YUN-DAL, a Korean man about 27 years old, a charming roguish fortune teller. Slim. Dark navy-black slightly messy hair tied in a short low ponytail with a few loose strands over the forehead. Narrow amused eyes with grey-violet irises, a small mole under the left eye. Exactly ONE earring: a silver crescent moon in his right ear; his left ear has NO earring. A long deep-navy modern-hanbok style coat (durumagi) worn open with faint silver moon-phase embroidery along the collar, over a cream high-collar shirt; a round brass compass-like pendant on a cord. His LEFT hand is wrapped in a black cloth bandage up to the wrist. A folding fan in his right hand.

Expression and pose: grim and determined, his LEFT hand raised close in front of his chest with the palm facing the viewer, elbow tucked against his side so the hand stays near the center of the image, the bandage unwound from the palm and still wrapped around the wrist, a small swirling black void like a hole of night in the center of the palm. The open coat hangs straight and narrow along his body and does NOT spread out to the sides; both coat edges stay at least 150 px away from the left and right canvas edges all the way down to the bottom.

No other people, no animals, no props besides the fan and pendant. No text, no numbers, no watermark.

REMINDER: transparent background; at least 150 px of empty space left and right of the figure; nothing clipped at the sides.
```

### laugh

```text
BACKGROUND (most important): fully TRANSPARENT background (alpha 0). No backdrop, no gradient, no glow, no aura, no shadow.

A single character sprite for a Korean anime visual novel, in exactly the same art style, line weight, cel shading and coloring as the attached style reference (a young woman; style only, do not draw her). Portrait canvas 1024x1536.

Framing: ONE man, a BUST portrait from the top of his head down to his waist, facing the viewer, centered. The whole figure including hair, both sleeves, the coat and the fan is at most 700 px wide and stays well inside the canvas with at least 150 px of empty transparent space on the left and on the right and at least 120 px above the head. Sleeves hang close to the body. The bottom of the figure is cut off cleanly by the bottom canvas edge at the waist, no fade. Nothing touches the left, right or top edge.

The character (match the attached character reference exactly): YUN-DAL, a Korean man about 27 years old, a charming roguish fortune teller. Slim. Dark navy-black slightly messy hair tied in a short low ponytail with a few loose strands over the forehead. Narrow amused eyes with grey-violet irises, a small mole under the left eye. Exactly ONE earring: a silver crescent moon in his right ear; his left ear has NO earring. A long deep-navy modern-hanbok style coat (durumagi) worn open with faint silver moon-phase embroidery along the collar, over a cream high-collar shirt; a round brass compass-like pendant on a cord. His LEFT hand is wrapped in a black cloth bandage up to the wrist. A folding fan in his right hand.

Expression and pose: laughing openly with eyes closed, the fan opened in his right hand near his shoulder.

No other people, no animals, no props besides the fan and pendant. No text, no numbers, no watermark.

REMINDER: transparent background; at least 150 px of empty space left and right of the figure; nothing clipped at the sides.
```

### sad

```text
BACKGROUND (most important): fully TRANSPARENT background (alpha 0). No backdrop, no gradient, no glow, no aura, no shadow.

A single character sprite for a Korean anime visual novel, in exactly the same art style, line weight, cel shading and coloring as the attached style reference (a young woman; style only, do not draw her). Portrait canvas 1024x1536.

Framing: ONE man, a BUST portrait from the top of his head down to his waist, facing the viewer, centered. The whole figure including hair, both sleeves, the coat and the fan is at most 700 px wide and stays well inside the canvas with at least 150 px of empty transparent space on the left and on the right and at least 120 px above the head. Sleeves hang close to the body. The bottom of the figure is cut off cleanly by the bottom canvas edge at the waist, no fade. Nothing touches the left, right or top edge.

The character (match the attached character reference exactly): YUN-DAL, a Korean man about 27 years old, a charming roguish fortune teller. Slim. Dark navy-black slightly messy hair tied in a short low ponytail with a few loose strands over the forehead. Narrow amused eyes with grey-violet irises, a small mole under the left eye. Exactly ONE earring: a silver crescent moon in his right ear; his left ear has NO earring. A long deep-navy modern-hanbok style coat (durumagi) worn open with faint silver moon-phase embroidery along the collar, over a cream high-collar shirt; a round brass compass-like pendant on a cord. His LEFT hand is wrapped in a black cloth bandage up to the wrist. A folding fan in his right hand.

Expression and pose: quietly sad, eyes lowered, a faint lonely smile.

No other people, no animals, no props besides the fan and pendant. No text, no numbers, no watermark.

REMINDER: transparent background; at least 150 px of empty space left and right of the figure; nothing clipped at the sides.
```
