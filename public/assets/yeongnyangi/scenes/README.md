# 영냥이 생활 장면 그림

영냥이 결과 리더(`ReadingBook`)의 '생활 속 장면' 소절 제목 아래에 붙는 960×640 WebP.

- 붙는 자리: 부(테마)마다 한 장이고, 같은 그림은 리딩당 한 번만 나온다. 그 그림이 처음 나오는 장의 첫 장면 소절에만 붙는다(`app/yeongnyangi/_lib/reading-visuals.ts`, `sceneArt`).
- 대상: 짧은 리딩에도 붙는다. 1만 자 기준은 장 사이 삽화(`../reading-art/`)에만 쓴다.

## 제작

- 날짜·도구: 2026-10-02, Codex CLI 0.156.1 `codex exec` → 내장 `image_gen`, 1536×1024.
- 모델: 이름(gpt-image-2)은 codex-image 스킬 문서에 적힌 것이고, 로그로는 확인하지 못했다.
- 참조 이미지: `codex exec -i` 로 정본 `hero-800` 의 사본을 붙였다. 사본에서는 명찰을 둘레 색 조화 보간으로 지웠다. 정본 그대로 쓰면 명찰이 그림에 새어 나왔다(style-bible 「생성 파이프라인과 원장」).
  - 가슴의 금빛 생선 장식은 사본에도 남아 있다. 같은 방법으로 지워 봤지만, 꼬리가 실루엣 밖으로 튀어나온 자리에서 경계가 번진 얼룩이 생겨 되돌렸다. 정본은 장식 없는 영냥이라서, 장식이 그림에 새어 나오는지는 장면마다 QA 에서 따로 봤다.
- 프롬프트: style-bible 「정본 프롬프트 머리말」 블록을 다음 순서로 잇는다.
  - FORMAT_LANDSCAPE → STYLE_SCENE → CHARACTER → 장면 문단 → COMPOSITION_SCENE → PALETTE_GUARD → NO_TEXT → LIGHT_SCENE
  - STYLE_SCENE 은 STYLE_CARD 에서 네 곳을 바꾼 것이다: 'tarot' 을 빼고, 빛 번짐을 'soft glow' 로, 털 색 'warm ivory' 를 'snow white' 로, 분위기 'warm' 을 'tender' 로 바꿨다.
  - LIGHT_SCENE 은 달빛을 주광으로 두고 등불을 고양이와 떼어 놓는 조명·털 블록이다. 털 색 지시가 가장 나중에 읽히도록 맨 끝에 둔다.
  - 장면 문단 원문은 아래에 있다. 조립된 전문은 원장 `docs/design/yeongnyangi-tarot/art-ledger.jsonl` 의 `phase:"scenes"` 줄 `prompt` 에 그대로 남겼다. 탈락작도 함께 남겼다.
- 그리지 않은 것:
  - 사람: 사용자의 성별·나이를 그림이 단정하지 않게 하려고 넣지 않았다.
  - 글자·숫자·하트, 연이 요소(분홍 위주 색, 연꽃, 리본, 찻집 실내).
- 원본 PNG 는 커밋하지 않는다. 저장소 밖 `D:\Development\yeongnyangi-tarot-art\scenes\` 에 있다.
- 털 색 보정: v3 그림 몇 장은 털 그림자가 서늘한 라일락으로 과채도였다. 이 그림들은 `scenes/tools/grade.mjs` (K=0.35)로 결정적으로 고쳤다. 라일락 색상대(250–300°)의 밝고 채도가 낮은 픽셀만 채도를 ×(1−0.35w)로 낮추고, 색상·명도와 나머지 픽셀은 그대로 두며 마스크는 쓰지 않는다. 보정본은 다시 QA 했고, 표의 채택 후보 옆에 `graded` 로 표시했다. 방법은 원장 `derived[].method` 에 있다.
- 인코딩: sharp lanczos3 로 960×640 으로 줄이고, WebP q78 부터 4씩 낮춰 장당 140KB 이하로 맞췄다.

## 그림과 붙는 곳

| 파일 | 장면 | 그림 | 붙는 곳 | 보이는 리딩(166개 중) | 채택 후보 |
|---|---|---|---|---:|---|
| `self.webp` | 나를 들여다보기 | 창가 의자에서 달을 내다보는 옆모습 | 테마 self, 그리고 그림이 정해지지 않은 테마 | 142 | self-a3 (42KB, q78, graded) |
| `love.webp` | 나란히 | 돌다리 난간에서 강물에 나란히 떠가는 등불 두 개를 내려다본다 | 테마 love(결혼 부 제외) | 95 | love-a3 (108KB, q78) |
| `home.webp` | 함께 앉는 식탁 | 2인 식탁 의자에 앉아 빈 맞은편 의자를 본다 | v7 결혼 부(`part.marriage`) | 24 | home-a2 (40KB, q78) |
| `wealth.webp` | 가진 것 세기 | 달빛 책상에서 가죽 주머니·민무늬 동전·빈 장부를 내려다본다 | 테마 wealth | 51 | wealth-a3 (54KB, q78, graded) |
| `work.webp` | 퇴근 뒤 책상 | 파란빛만 도는 노트북 화면을 보는 밤 책상 | 테마 career | 83 | work-a3 (46KB, q78, graded) |
| `people.webp` | 모임이 끝난 뒤 | 모임이 끝난 옥상 식탁에서 빈 의자들을 둘러본다 | 테마 relations | 87 | people-a2 (72KB, q78, graded) |
| `journey.webp` | 떠나기 전 | 밤 기차 플랫폼 벤치에서 가죽 가방 옆에 앉아 열린 문을 본다 | 테마 timing | 15 | journey-a2 (90KB, q78) |
| `crossroads.webp` | 두 갈래 길 | 등불이 늘어선 두 갈래 길의 갈림목 | 테마 cross·action | 116 | crossroads-a2 (95KB, q78) |

쉼(rest, 건강) 장면은 만들지 않았다. 판매 상품 × 상담 종류 166개 매니페스트를 모두 확인했는데, 건강 장에는 장면 소절이 한 번도 없어서 붙을 곳이 없다.

## 장면 문단 원문 (v3)

v1 파일럿 2장과 v2 8장은 모두 불합격이었다. 이유와 고친 점은 style-bible 「생성 파이프라인과 원장」의 '생활 장면 파일럿'에 있다.

- v2: 공통 블록 COMPOSITION_SCENE 을 새로 만들고, 참조를 명찰 없는 사본으로 바꿨다. self·love 문단도 고쳤다.
- v3: 장면마다 영냥이가 어느 쪽을 보는 옆모습인지 적었다. 등불은 고양이와 떼고 달빛을 주광으로 두는 LIGHT_SCENE 을 넣었고, STYLE_SCENE 에서 따뜻함을 부르는 낱말을 뺐다. 소품을 줄였고, self 의 창유리 반사는 없앴다.
- v3.1: 책상 장면(wealth·work)의 키가 넘쳐, COMPOSITION_SCENE 에 "340px·바닥이 보임"을 넣고 "방 건너편에서 본 책상 전체"로 바꿨다. 아래 문단은 채택작이 실제로 받은 판이다.

### self — 나를 들여다보기

```text
Scene — Looking at yourself. A quiet, nearly empty room at night, lit only by cool silver-blue moonlight through one tall arched window; plain dark walls with no shelves, books, instruments, plants, candles or lamps. A wide cushioned window seat sits under the window. The room is shown wide: the whole window, the window seat and the floor below it are visible, with plenty of empty dark wall around them. Yeongnyangi sits on the window seat facing the window, seen from the side and slightly behind, its face in clear side profile as it gazes out at a thin gold crescent moon over dark, quiet rooftops. The glass is clear and shows no reflection of the cat. There is only one cat in the scene. Yeongnyangi's hat tip reaches only to the lower third of the window. The moonlight makes its white fur glow pale and cool. Quiet, honest, self-reflective mood.
```

### love — 나란히

```text
Scene — Side by side. A small old stone arch bridge over a calm, dark river at night. Yeongnyangi sits on the flat top of the bridge's low stone parapet, seen in clear side profile from the left: its body and face point toward the right of the picture, its head is bowed and its eyes look down at the water below, so its face is turned away from the viewer. On the water below and to the right, two small round lanterns float side by side, drifting in the same direction, their warm amber glow reflected in gentle ripples. The lanterns are plain glowing spheres with no markings. Willow branches at one side, distant soft town lights and a crescent moon. Cool silver moonlight from above lights the cat; the lanterns' glow stays down on the water. The stretch of parapet between two posts is about three times as long as Yeongnyangi is tall. Tender, hopeful and calm mood. No heart shapes, no wedding motifs.
```

### home — 함께 앉는 식탁

```text
Scene — A shared home table. A small, simple apartment dining nook at night, clearly a home, not a café, shop or tea house. A round wooden table for two stands in the centre with two plain wooden chairs facing each other across it; on the table, two empty plates and a small bowl of tangerines. A fabric-shade floor lamp stands in the back corner, well away from the table, and a window behind shows a crescent moon. Bare walls with no pictures. Yeongnyangi sits on the seat of the left chair, seen in side profile facing right, so only its head, hat and shoulders rise above the tabletop; it looks across the table at the empty chair opposite with a calm, patient expression. Cool moonlight from the window falls on the cat and the table; the lamp adds a soft warm glow to the far corner. Domestic, steady and gently hopeful mood.
```

### wealth — 가진 것 세기

```text
Scene — Counting what you have. A dark wooden desk at night beside a tall window with cool moonlight, seen from across the room: the whole desk with its legs, the floor beneath it and the window beside it are visible, and the desk fills only the middle half of the picture width. On the desk: a soft leather drawstring pouch with a few plain, smooth gold coins spilled beside it (no engravings, symbols or inner rims), and an open ledger book whose pages are completely blank. A small brass oil lamp stands at the far right end of the desk, well away from the cat. Nothing else is on the desk. Yeongnyangi sits on the desk to the left of the coins, seen in side profile facing right, its head bowed as it looks down at the coins with a thoughtful, steady expression. The oil lamp is about as tall as Yeongnyangi. Moonlight lights the cat; the lamp's gold glow pools only on the coins and the ledger. Grounded, careful, practical mood — no piles of treasure.
```

### work — 퇴근 뒤 책상

```text
Scene — The desk after hours. A tidy work desk at night in front of a large window with distant city lights, seen from across the room: the whole desk with its legs, the floor beneath it and the window behind it are visible, and the desk fills only the middle half of the picture width. On the desk: a neat stack of plain paper folders, a plain mug, and an open laptop turned three-quarters toward the viewer, its screen showing only a soft, plain blue glow with no interface, no icons and no writing. There is no desk lamp; the only light is the screen, the window and the moon. Nothing else is on the desk. Yeongnyangi sits on the desk to the left of the laptop, seen in side profile facing right toward the screen, its hat tip level with the top of the laptop screen; its expression is focused, slightly tired but determined. Cool blue light from the screen and the window falls on the cat. Calm, professional, quietly hardworking mood.
```

### people — 모임이 끝난 뒤

```text
Scene — After the gathering. A small rooftop terrace at night after friends have gone home. A round wooden table stands in the centre with several empty glasses, a few plates with crumbs and folded napkins; three empty chairs are pushed back at different angles around it, as if everyone has just left. One string of small warm lights hangs high overhead, far above the table; city rooftops and stars beyond. Yeongnyangi sits on a low wooden stool at the left of the table, seen in side profile facing right, looking across the table at the empty chairs with a soft, thoughtful expression. Cool moonlight lights the cat; the string lights are only small warm dots above. Warm, slightly wistful but kind mood. No other characters or animals.
```

### journey — 떠나기 전

```text
Scene — Before the departure. A quiet, old-fashioned small train platform at night. On the right, a train with warmly lit windows waits with one door open, the open door well inside the picture; there are no signs, numbers or route boards anywhere. A wooden bench stands in the centre of the platform, and an iron lamp post with a lantern stands at the far end of the platform, well away from the bench. Yeongnyangi sits on the bench next to a small brown leather travel bag, seen in side profile facing right, looking at the open train door with a calm, ready expression. The lamp post is about three times taller than Yeongnyangi. Soft mist, stars and a crescent moon above; cool moonlight lights the cat. Anticipating, steady mood.
```

### crossroads — 두 갈래 길

```text
Scene — Two paths. A quiet grassy hill at night where a single dirt path splits into two paths that curve away to the left and right into soft mist. Each path is lined with a few small lanterns on wooden posts, glowing warm amber, all well inside the picture and away from its edges; the nearest posts are about twice Yeongnyangi's height. There is no signpost. Yeongnyangi sits on the grass exactly at the fork, seen in a three-quarter back view, its head turned in profile toward the right-hand path as it calmly weighs both. Stars and a crescent moon over distant hills; cool moonlight lights the cat. Thoughtful, unhurried mood — neither path looks dangerous.
```

## 확인

2026-10-02, visual-checker 에이전트가 14개 기준으로 판정했다(키·글자 없음·해부학·고양이 한 마리·연이 요소 없음·액자 없음·시선·생선 장식 없음·서늘한 털 등). 털 채도는 sharp 로 쟀다. 기준은 털 픽셀(V≥.50·S≤.35)의 채도 중앙값 ≤.11, S>.12 비율 ≤40% 이고, 채택된 타로 카드 4장(중앙값 .08–.10)으로 보정했다. 판정 전문은 원장 `phase:"scenes"` 줄의 `reason`·`qa` 에 있다.

- 시도: 모두 20회(파일럿 2, v2 8, v3·v3.1 10)이고 장면당 최대 3회다. 채택 8장은 모두 ADOPT_WITH_NOTES 다. 남은 메모는 화면 폭 354–604px 에서 거의 보이지 않는 경미한 것이다.
- 털 보정(graded 4장): `scenes/tools/grade.mjs` 를 쓰기 전과 쓴 뒤 같은 털 마스크로 쟀다(중앙값 / S>.12 비율).
  - people: .126 → .086, 52% → 26%
  - wealth: .114 → .093, 45% → 26%
  - self: .121 → .079, 51% → 15%
  - work: .114 → .090, 47% → 31%
  - 망토·금장식·달·배경은 사실상 그대로다(바뀐 픽셀은 대부분 고양이, 최대 21–26/255). 띠 모양 계조 단절이나 얼룩은 없다. work 는 털 그림자 중앙값 .146 으로 타로 카드(.116–.128)보다 아직 조금 진하다. 털의 17% 가 보정 대역 밖(H 220–250)이라서다.
- 장면별로 남긴 메모:
  - home: 키 .49(상한 .5 바로 아래)이다. 의자를 빼놓아 앉은 몸 전체가 보이고, 스탠드 갓이 오른쪽 가장자리에 잘린다.
  - crossroads: 키 .496 이다. 한 길이 갈라지는 대신 두 길이 아래 가장자리에서 들어온다. 가까운 등불 기둥이 가장자리 10% 안에 있다.
  - journey: 벤치가 왼쪽 가장자리에 잘린다. 가로등이 고양이 키의 약 1.2배다.
  - love: 난간 기둥 사이가 키의 약 1.6배다(요청은 3배).
  - people: 오른쪽 앞 의자가 가장자리에 잘린다.
  - wealth: 책상이 폭의 약 78% 이고 오른쪽 가장자리로 넘어간다.
  - self: 창 아치 위가 잘린다. 모자 끝이 창 중간 높이에 있고, 시선은 달이 아니라 지붕을 향한다.
  - work: 책상이 폭의 69% 이고, 요청에 없던 의자가 있다. 머리는 3/4 시점이다.
- 원장 기록 한 가지: self-a3 는 codex 가 그림을 복사한 뒤 끝나지 않아 프로세스를 종료했다. 그래서 그 줄은 `source:null`, `promptPassedVerbatim:"unknown"` 이고, `prompt` 는 생성 시점의 프롬프트 스냅숏(`logs/self-a3.prompt.txt`)에서 가져왔다.
