---
status: done
updated: 2026-11-24
next: 없음 — 후속 과제는 `docs/design/moonlit-lotus-ritual.md` "알려진 위험"·"아직 없는 것"(별도 요청 때)
---

# 달빛 연화당 참배 흐름 — 다각도 사찰 그림·효과음 에셋

## 첫 행동
1. `Set-Location D:\Development\codedestiny-worktrees\moonlit-assets-20261122-071606`
2. `git status`, `git log --oneline -3` 로 상태 확인 → 이 문서 `next` 단계부터.

## 지금 상태
- 워크트리: `D:\Development\codedestiny-worktrees\moonlit-assets-20261122-071606`
- 브랜치: `wt/moonlit-assets-20261122-071606` (base origin/main `209371928`)
- node_modules 정션·.env 하드링크 연결 완료.
- 주 체크아웃(`d:\Development\code-destiny`) main 에는 옆 세션(yeongnyangi-hat)의 미push 커밋 6개와 미커밋 파일이 있다 — 건드리지 않는다.

## 요청 원문과 승인 (2026-11-22)
- 사용자: "효과음과 그림 에셋 등도 여러각도에서 실제 절에 온것처럼 볼 수 있도록 해주면 좋겠어 아기자기한 현재 디자인에 맞으면서도 말이지"
- 해석: 직전 참배 흐름(`app/moonlit-lotus/_ritual/`)에서 "목록만" 남겼던 에셋(docs/design/moonlit-lotus-ritual.md 에셋 목록)을 **실제로 만들어 연결**한다. 단계마다 다른 각도(일주문→마당→향로→법당 안→연못→범종각 등)로 장면이 바뀌어 실제 절을 걸어 들어가는 느낌을 준다. 화풍은 현재 아기자기한 2D(달빛 남색·은빛·연분홍·샴페인 골드).
- 그림 생성은 사용자가 요청했으므로 `codex-image` 스킬(gpt-image-2, Codex OAuth) 사용 승인으로 본다. 앱 내 LLM 실호출은 여전히 금지.
- 운영 배포는 별도 1회 요청 때만. 이번 작업 끝은 main push 까지.

## 작업 규칙과 함정
- 워크트리 안에서만 편집. 커밋은 작게, `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- 수정 금지: .env*, package-lock.json, .wrangler/, dist/, out/, worker/wrangler.toml 구조, 결제 파일, 6개 점술 엔진.
- 빌드 부산물(public/** 미러, sitemap, ?v= 재스탬프, js/core/**)은 커밋 안 함. 단 `public/assets/moonlit-lotus/<새 폴더>/` 의 새 에셋 파일과 `public/i18n/*/moonlitRitual.json` 은 소스다(기존에도 커밋됨 — git log 로 확인).
- 사용자 문자열은 전부 `moonlitRitual` i18n 키(`i18n/authored/moonlitRitual-0N.json` → 생성기). alt 텍스트 포함.
- 이미지는 메인/에이전트 세션에서 직접 Read 하지 말고 `visual-checker` 에이전트로 판정(스크린샷 토큰 비용).
- check:fast 가 fortune/data ENOENT 로 실패하면 `npm run fortune:build-data`.
- `yeongnyangi-reading-invariance` 테스트는 동시 실행 시 플래키(단독 통과) — 무관.
- reduced-motion: `space.module.css` 의 `.page *` 규칙이 애니메이션을 죽인다 — 지난 작업에서 대상별 `!important` 로 복원함. 새 카메라 전환도 같은 함정 확인.
- 효과음은 라이선스 문제 없게 **직접 합성**(node 스크립트로 WAV 생성 → ffmpeg 있으면 mp3/ogg). 합성 스크립트는 `scripts/` 에 두고 manifest.json 에 "self-synthesized, CC0" 기록. 외부 음원 반입은 출처·라이선스가 CC0 일 때만.
- 용량: 장면 이미지 AVIF/WebP, 모바일 768 / 데스크톱 1536 폭. 소품은 투명 WebP. 단계 이미지는 다음 단계 것을 미리 preload(전부 한꺼번에 받지 않기).
- 저사양(low tier)·reduced-motion 에서는 카메라 팬을 디졸브로 대체.

## 설계 (단계 A 확정 2026-11-22)
- 참배 단계별 시점(카메라). 세로 = ≤700px 세로 화면, 가로 = 그 밖(기존 `(min-width:701px)` source 규칙 유지).
  | 단계 | 장면 | 세로(768×1152) | 가로(1536×1024) | 소품 |
  |---|---|---|---|---|
  | enter | 일주문 밖 돌길(**새 그림**) | `ritual-v1/gate-768.{avif,webp}` | `ritual-v1/gate-1536.{avif,webp}` | — |
  | breathe | 안마당 정면(재사용) | `views-v1/courtyard-front-768.webp` | `space-v1/courtyard-1536.webp` | — |
  | incense | 안마당 오른편 사선(재사용) + 향로 | `views-v1/courtyard-right-768.webp` | `views-v1/courtyard-right-1536.webp` | `ritual-v1/prop-incense-burner.webp` |
  | bow | 법당 안 불단 정면(재사용, 현재 그림) | `views-v1/hall-front-768.webp` | `space-v1/hall-1536.webp` | — |
  | wish | 연못가 왼편 넓게(재사용) + 연등 | `views-v1/pond-left-wide-768.webp` | `views-v1/pond-left-wide-1536.webp` | `ritual-v1/prop-lantern-dim.webp`, `prop-lantern-lit.webp` |
  | dedication | 범종각 달밤 전경(**새 그림**) | `ritual-v1/bell-768.{avif,webp}` | `ritual-v1/bell-1536.{avif,webp}` | — |
- 새로 만들 것은 **장면 2(gate·bell) × 2크기 × 2포맷 = 8파일 + 투명 소품 3장**이 전부다. 재사용 4장면은 이미 일관된 WebP 이므로 AVIF 로 재인코딩하지 않는다(손실 재압축·용량 이득 작음) — `<picture>` 에서 새 장면만 `type="image/avif"` source 를 둔다.
- 새 장면 규격: 원본 생성 세로 1024×1536 → 768×1152, 가로 1536×1024 → 1536×1024. sharp WebP q80 effort6(views-v1 과 같음) + AVIF q50 effort6. 목표 용량 768 ≤220KB, 1536 ≤350KB(views-v1 범위). 세로·가로는 각각 따로 구도를 잡아 생성(views-v1 방식, 크롭 금지).
- 소품 규격: 투명 WebP(알파 q100, 색 q90), 긴 변 512px(+ `-256` 1장씩은 불필요 — 화면 표시 ≤ 200 CSS px 라 512 로 2x 충족). 바닥 기준선은 그림 하단 4% 이내, 그림자 없음(CSS 로 처리).
  - `prop-incense-burner.webp`: 다리 셋 달린 둥근 청동·금빛 향로, 연꽃 뚜껑 무늬, 향 3대 꽂힘(불 안 붙은 상태). 불씨·연기는 기존 SceneFx·CSS 가 그린다.
  - `prop-lantern-dim.webp` / `prop-lantern-lit.webp`: 같은 연꽃 연등(분홍 꽃잎 등갓·금 받침)의 꺼진/켜진 상태. 두 장은 **같은 실루엣·같은 캔버스 위치**여야 크로스페이드가 자연스럽다 → 한 장 생성 후 lit 은 dim 을 참조로 "same lantern, now glowing" 편집 생성, 또는 lit 하나만 만들고 dim 은 sharp 로 채도·밝기 낮춰 파생(권장: 파생 — 실루엣 일치 보장).
- 새 장면 내용
  - gate(enter): 달밤 숲길 끝의 작은 둥근 일주문(기둥 둘, 보라 기와, 민트·분홍 단청, 등롱 한 쌍). 문 사이로 멀리 법당 불빛과 금빛 꽃돼지 불상의 실루엣이 작게 보임(내부 디테일 X). 오른쪽 위 보름달. 하단 중앙은 문을 향해 가는 빈 판석/흙길.
  - bell(dedication): 마당 한쪽 범종각(작은 정자형 누각, 둥근 범종, 당목 매달림), 왼편 넓은 시점으로 연못·법당 지붕 일부가 뒤에 겹쳐 같은 절임을 보여 줌. 보름달 크게, 연등 몇 개가 하늘로 떠오른 흔적(작게). 하단 중앙 빈 판석.
- 생성 방법(단계 C): `codex exec -i <reference>` 로 참조 첨부. gate·bell 참조는 `D:/CodeDestiny-Build/moonlit-lotus/space-v1/courtyard-source.png`(없으면 `public/.../space-v1/courtyard-1536.webp`), 소품 참조도 같은 courtyard. 원본 PNG 는 `D:/CodeDestiny-Build/moonlit-lotus/ritual-v1/` 에 보관(저장소 밖, 기존 관례), 변환은 `scripts/sprites/prepare-moonlit-ritual.mjs`(prepare-moonlit-space.mjs 패턴) 로 하고 manifest 에 generator·reference·brief 전문·sha256·bytes·width/height 기록.
- 이미지 프롬프트 공통 스타일 문단(모든 C 생성 프롬프트 끝에 그대로 붙인다)
  > Same world, same painting as the reference: Code Destiny Moonlit Lotus Temple. Premium soft digital watercolor + gouache storybook background with subtle paper grain and soft gradients, not flat cel shading, not photorealistic, not 3D. Thin 1–2px warm dark-brown/maroon outlines, never black. Rounded, short, plump Korean hanok architecture with softly curved eaves, muted plum-gray roof tiles (#5A4A70), terracotta-rose pillars (#D77068), mint/pink/gold dancheong patterns, repeated lotus motifs. Palette: cream-peach stone paving (#FECEB3), warm apricot wood (#FBAA7A), lavender twilight sky (#CEAFD5), moon cream (#FFE1B7), lotus/magnolia pink (#F2A7B3), golden accents (#E57E2D), indigo-violet water (#3E4A80), sage lotus leaves (#8FA08A). Light: big full moon plus warm lanterns with soft golden bloom; shadows painted violet or maroon, never gray. Night sky but the foreground stays bright and warm like dusk — do NOT darken the whole image. Cozy, adorable, serene, uncluttered. Keep a generous EMPTY clear floor at bottom center for a separately animated character. No people, no animals or living characters, no text, letters, signs, UI, borders or watermark.
  - 소품용 추가 문단: `Single isolated prop on a fully transparent background, centered, complete silhouette with generous padding, no ground, no cast shadow, no scene.` — gpt-image-2 의 투명 배경 지원은 **미확인**. 안 되면 단색 #00FF00 배경으로 생성 → sharp 로 크로마키 + 1px 가장자리 정리(가장자리 녹색 번짐을 visual-checker 로 확인).
- 단계 전환(카메라): 두 겹(`current`/`next`) `<img>` 크로스디졸브 + transform 만(레이아웃 없음).
  - enter→breathe: 일주문으로 걸어 들어감 — 이전 그림 `scale(1→1.14) translateY(-2%)` + 페이드아웃, 새 그림 `scale(1.06→1)` 페이드인.
  - breathe→incense: 오른쪽으로 몇 걸음 — 이전 `translateX(0→-4%)`, 새 `translateX(4%→0)`.
  - incense→bow: 법당 안으로 — 이전 `scale(1→1.12)` 중앙 기준(불상 쪽 transform-origin 50% 40%), 새 `scale(1.05→1)`.
  - bow→wish: 법당을 나와 왼편 연못 — 이전 `translateX(0→4%)`, 새 `translateX(-4%→0)`.
  - wish→dedication: 고개 들어 범종각·달 — 이전 `translateY(0→3%)`, 새 `translateY(-3%→0)`, 회향 그림 opacity .8(기존 값).
  - 시간: transform 700ms ease-in-out, 크로스페이드 450ms. low tier·reduced-motion 은 transform 없이 opacity 300ms 디졸브. `space.module.css` 의 `.page *` 규칙에 죽지 않도록 대상별 `!important` 확인(함정 절).
  - 소품: 향로는 incense 단계에서 무대 하단 오른쪽(캐릭터 옆) `width:min(22vw,140px)`, 연등은 wish 단계 캐릭터 앞 중앙 — 기존 CSS `WishLantern` span 을 그림으로 교체하거나 그 안 배경으로 넣는다(D 에서 결정, 기존 접근성 role=img·aria-label 유지).
- 프리로드: 단계 진입 400ms 뒤 **다음 단계 그림 1장만**(현재 화면 방향 크기만) `new Image().decode()`. 소품은 해당 단계 직전 단계에서. 전부 한꺼번에 받지 않는다. 실패해도 기존 그림 유지(전환 생략).
- alt: 배경은 장식(`alt=""`, aria-hidden 기존 유지) — 새 i18n alt 키는 소품 그림만, 필요 시 `moonlitRitual` 에 추가.
- 효과음 슬롯 연결: 범종(회향), 풍경(마당 앰비언트, 간헐), 향 불붙기(향 완료), 연등 떠오름(소원 완료), 목탁(기존).
- 화면 구성은 기존 RitualFlow·CompanionStage 레이아웃을 유지(캐릭터·말풍선·연꽃 진행 위치 그대로).

## 조사 결과 (단계 A, 2026-11-22)

### 현재 참배 화면(실측: 코드)
- `RitualFlow.tsx:100-103` — 6단계 **모두 같은 그림** `space-v1/hall-768.webp`(≤700px) / `hall-1536.webp`(≥701px) 한 장. `<picture>` 에 AVIF source 없음.
- 단계 차이는 `ritual.module.css:18-24` 의 `[data-step]` 별 `scale(1.02~1.08)/translateY` 800ms 뿐. `.backdrop img { opacity:.62 }` + 아래쪽 `--ml-paper` 그라데이션으로 어둡게 깔린다.
- 캐릭터(`.figure`)는 무대 **하단 중앙**, 말풍선은 상단 → 새 배경도 하단 중앙 바닥을 비워야 한다.
- 연등은 `WishLantern.tsx` 의 CSS span(그림 없음), 향 연기는 `_fx/SceneFx.tsx` CSS+canvas. SFX 슬롯 `audio-engine.ts:11` bell·windChime·fire = null(단계 B 소관).
- `_lib/scene-views.ts`·`use-scene-view.ts` 는 **Space(둘러보기) 전용**: 장면 3(courtyard/hall/pond) × 시점 5(left-wide/left/front/right/right-wide). `viewImage()` 는 가로+front 일 때만 `space-v1/<scene>-1536.webp`, 나머지는 `views-v1/<scene>-<view>-<768|1536>.webp`. 프리로드는 현재 시점 ±1 만 400ms 지연, 이미지 캐시 3장 상한. 세로 판정 `(max-width:700px) and (orientation:portrait)`. 참배 흐름은 이 훅을 쓰지 않는다.

### 기존 장면 그림 인벤토리(실측: 파일·manifest, 내용은 visual-checker 판정)
| 파일 | 크기 | 내용 |
|---|---|---|
| `space-v1/courtyard-{768,1536}.webp` | 3:2, 126KB/468KB | 안마당 정면, 약간 높은 카메라. 상단 중앙 법당과 금빛 꽃돼지 불상(x≈40%,y≈37%), 처마 등롱 2, 오른쪽 위 보름달, 오른쪽 연못·징검돌·잉어, 석등 2, 왼쪽 오르골 소반, 오른쪽 목탁·염주. 빈 판석 x16–78% y55–100% |
| `space-v1/hall-{768,1536}.webp` | 3:2, 108KB/401KB | 법당 내부 정면, 서까래. 중앙 불상, 천장 등롱, 왼창 목련·오른창 달/연못, 중앙 아래 분홍 방석, 빈 마루 y55% 아래 |
| `space-v1/pond-{768,1536}.webp` | 3:2, 138KB/469KB | 연못 정원 사선. 왼쪽 위 작은 법당, 붉은 아치 다리, 연꽃·잉어, 석등. 빈 판석 길 왼아래→중앙 |
| `views-v1/<scene>-<view>-1536.webp` | 1536×1024, 264–347KB | 위 3장면의 left/left-wide/right/right-wide 가로(front 가로 = space-v1 재사용) |
| `views-v1/<scene>-<view>-768.webp` | 768×1152 세로, 151–215KB | 3장면 × 5시점 세로(front 포함) |
- 판정: views-v1 은 space-v1 과 건축·소품 배치·색조가 일관(같은 장소의 진짜 시점 변경). 
- **없는 것**(9장 전수 육안): 일주문, 세워진 향로 근접, 범종각, 띄우는 연등. pond 소반 위 뚜껑 단지는 향합 수준.
- 장면 그림은 전부 WebP 만, AVIF 없음.

### 화풍(visual-checker 판정, "실측"은 sharp 픽셀)
- 매체: 디지털 수채+구아슈 그림책 배경, 종이 그레인, 부드러운 그라데이션(플랫 셀 아님). 외곽선 1–2px 짙은 갈색/적갈, 검정선 없음.
- 팔레트: 판석 #FECEB3(실측), 마루 #FBAA7A(실측), 달 크림 #FFE1B7(실측), 라벤더 하늘 #CEAFD5(실측), 연꽃·목련 분홍 #F2A7B3(실측), 불상 금 #E57E2D(실측), 기둥 적갈 #D77068(실측), 기와 보라회 ≈#5A4A70·연못 남보라 ≈#3E4A80·연잎 세이지 ≈#8FA08A(추정).
- 조명: 보름달+등롱·연꽃 촛불 금빛 블룸, 그림자는 보라/적갈. 하늘은 밤이지만 전경은 황혼처럼 **밝다**(평균 휘도 courtyard 164, hall 145). UI 쪽 어둡기는 CSS(opacity .62+그라데이션)가 만든다 → 새 그림도 같은 밝기로 그려야 한다(어둡게 그리면 이중으로 어두워짐).
- 건축: 짧고 통통한 한옥, 둥근 처마, 민트·분홍·금 단청, 연꽃 모티프 반복. 캐릭터(연이) 머리:몸 ≈1:1–1:1.2 치비, 큰 눈·볼 블러시(`entry-v2`). 캐릭터 일러스트(entry-v2·story-v1)는 배경보다 선이 굵고 매끈 — 배경 그림에는 캐릭터를 넣지 않는 기존 규칙 유지.
- 주의: UI 토큰은 밤 남색(`--ml-paper #161b35`, `--ml-gold #d8bd83`, `--ml-rose #e9b5c7`, `--ml-lavender #b8a4e3`). 그림 자체는 밝은 크림·피치 — 둘을 섞지 말 것.

### 제작 이력(실측: git log·manifest·원본 폴더)
- space-v1(2026-11-15 `8a2407cf1`): built-in ImageGen 원본 PNG → `scripts/sprites/prepare-moonlit-space.mjs`(sharp resize 768/1536, WebP q86 effort6, manifest 에 sourceSha256·bytes). 원본·프롬프트 정본 `D:/CodeDestiny-Build/moonlit-lotus/space-v1/{courtyard,hall,pond}-source.png`, `prompts.md`(spaceBgPrompt·spacePondPrompt·spaceHallPrompt) — 저장소 밖.
- views-v1(2026-11-17 `88b2f03af`): `generator: "OpenAI image_gen"`, 각 자산에 `reference: ../space-v1/<scene>-1536.webp`, `brief`(프롬프트 전문), WebP q80, sha256. 변환 스크립트는 저장소에 없음(일회성). 세로 1024×1536 생성 → 768×1152.
- entry-v1/photo-v1: `generator: "built-in image_gen"`, sharp WebP q84. 오디오 audio-v1/v2: Freesound CC0 녹음 반입(출처·sha256 manifest).
- 변환 관련 기존 스크립트: `scripts/sprites/prepare-moonlit-space.mjs`, `scripts/optimize-images.mjs`, `scripts/webp-exclusions.mjs`.

### 도구(실측 2026-11-22)
- ffmpeg/ffprobe: PATH 에 **없음**(`which` 실패, node_modules 에도 ffmpeg 패키지 없음). cwebp·avifenc·magick 도 없음.
- sharp 0.34.5 있음(워크트리 node_modules 정션). `sharp.format.heif.output.alias=['avif']` → AVIF 인코딩 가능, WebP(알파 포함) 가능.
- codex-cli 0.156.1 있음. `codex exec -i <FILE>` 로 참조 이미지 첨부 가능 → views-v1 처럼 space-v1 원본을 reference 로 붙여 화풍 고정. 로그인 상태는 미확인(첫 생성 때 확인).
- codex-image 스킬 SKILL.md 는 "생성 이미지를 Read 로 표시"라고 하지만 이 저장소 규칙(이미지는 visual-checker)이 우선한다.

## 단계 C 결과 (2026-11-22)
- 산출: `public/assets/moonlit-lotus/ritual-v1/` — gate·bell × 768(768×1152)/1536(1536×1024) × webp/avif 8장 + 투명 소품 512×512 3장 + `manifest.json`(generator·reference·brief 전문·sha256·bytes·크기). 변환 `scripts/sprites/prepare-moonlit-ritual.mjs`(재실행 가능, 원본 `D:/CodeDestiny-Build/moonlit-lotus/ritual-v1/<name>-source.png` + `prompts/<name>.txt`).
- 용량(실측): gate-768 webp 108KB/avif 64KB, gate-1536 209/119KB, bell-768 134/82KB, bell-1536 233/141KB, prop-incense-burner 62KB, prop-lantern-lit 38KB, prop-lantern-dim 26KB.
- visual-checker: 장면 4장 통과(평균 휘도 156–164, 참조 164–168 ±5%; 사람·동물·글자 없음; 하단 중앙 빈 바닥). 소품 3장 통과(녹색 잔여 0–2px, 바닥 여백 2%, 가로 중앙, dim/lit 알파 픽셀 동일).
- 생성 방식(실측): `codex exec -m gpt-6-sol -s read-only -i space-v1/courtyard-source.png` 후 `~/.codex/generated_images/<session>/` 에서 직접 복사. 함정: ① config 기본 모델(gpt-6.2-*)은 ChatGPT 계정에서 400 → `-m gpt-6-sol` 필수. ② codex 샌드박스가 저장소 밖 경로 복사를 막음 → 세션 폴더에서 복사. ③ 6개 동시 실행 시 3개가 `memory allocation failed` 로 죽음 → 동시 3개 이하. ④ 투명 배경은 시도하지 않고 #00FF00 크로마키로 바로 생성(설계의 대체 경로).
- dim 연등: 단순 밝기 감산은 노란 불빛이 올리브로 탁해져 실패 → 등갓(y<290)만 노랑→모브 전환+#7c6fa8 multiply, 금 받침은 금빛 유지로 파생(재판정 통과).
- 남은 불완전: ① gate-768 과 gate-1536 은 같은 계열이지만 세부가 다름(등 매단 위치 안/밖, 기둥 연꽃 그림 유무, 용마루 연꽃 장식 유무) — 세로·가로가 동시에 보이지 않아 허용. 엄격히 맞추려면 gate-1536 을 참조로 gate-768 재생성. ② bell 두 장은 참조보다 채도가 약간 높고 바닥이 연어·분홍 쪽(B·G 차), bell-1536 달은 왼쪽 위(x≈32%). ③ bell-1536 정자 계단이 x56–76% 하단에 있어 캐릭터는 중앙~왼쪽 중앙에 둘 것. ④ 가드: views-v1 만 `__tests__/ui/moonlit-scene-views.test.mjs` 가 인벤토리 — ritual-v1 은 등록 의무 없음(D 에서 예산 테스트 추가 권장). 모바일 앱 빌드(`scripts/build-mobile-app.mjs`)에 moonlit 전용 포함/제외 규칙 없음 — avif 도 앱 사본만 재인코딩, 빌드 영향 없음.

## 단계
- [x] A. 조사: 화풍·기존 시점·에셋 이력·도구(ffmpeg, codex-image) 확인, 설계 확정, 이 문서 갱신·커밋
- [x] B. 효과음 합성: 범종·풍경·향 불붙기·연등 떠오름 → `public/assets/moonlit-lotus/audio-v3/` + manifest, 합성 스크립트, 커밋 (42b187b60)
- [x] C. 그림 생성: 새로 필요한 장면·소품 생성 → 리사이즈·포맷 변환 → `public/assets/moonlit-lotus/ritual-v1/` + manifest(프롬프트 기록), visual-checker 로 화풍 일치 판정, 커밋
- [x] D. 연결: 단계별 시점·전환·소품·SFX 를 RitualFlow 에 연결, i18n alt 키, preload, low tier/reduced-motion, 테스트 추가/갱신, check:fast, 커밋 (a26bee08aa)
- [x] E. 화면 검증: dev(mock) 360·390·844×390·1440 전 흐름 캡처 → visual-checker, 수정, 커밋 (4184e5d194)
- [x] F. 마무리: docs/design/moonlit-lotus-ritual.md 갱신(00f009c26d), check:pre-push, origin/main 머지 → `git push origin HEAD:main`(2755f4e0d5..00f009c26d), 이 문서 status: done

## 단계 D·E·F 결과 (2026-11-24)
- 이어받기: 남은 미커밋 3파일은 WIP be88633b23 로 보존 → origin/main 머지 → D a26bee08aa(RitualBackdrop 두 겹 크로스페이드·카메라, 다음 단계 1장 프리로드, img error 시 마지막 그림 유지, 향로·연등 소품, SFX 불붙기·연등·범종·풍경(14–24s, 숨김 탭 쉼), `moonlitRitual` 100키, 테스트 2파일).
- 검증(실측): `npx tsc --noEmit` exit 0; check:fast 통과(jest 493 suites/8600 tests, BLOCKED 없음); moonlit 테스트 74/74; check:pre-push exit 0.
- E 캡처: headed Chrome(`channel:'chrome'` — Playwright chromium-1228 미설치), 쿠키 동의 `cd_cookie_consent=essential` 미리 설정, 매 장 `scrollTo(0,0)`·마우스 치움. 콘솔 오류·실패 요청 0. 프리로드는 단계마다 다음 그림 1장+소품만.
- E 수정 4184e5d194: 향로가 오른쪽 아래 음악 버튼(44px·"소리 켜기" 알약)에 가려 → 캐릭터 왼편 바닥으로. 재판정 통과(360 x7·390 x8·844 x21·1440 x430, 겹침 0).
- 이미지 무게(실측): 첫 화면 세로 hall-768 106KB → gate-768.avif 64KB, 가로 hall-1536 391KB → gate-1536.avif 119KB. 전 흐름 누적 세로 약 1.0MB·가로 약 1.9MB(단계별로 나눠 받음).
- SEO: title·description·robots noindex,nofollow·H1 변경 전후 동일, canonical 없음 동일, page.tsx 무변경, sitemap 밖 — 영향 없음.
- visual-checker 남긴 것(보고만): 회향 달이 휴대폰·844 에서 말풍선 뒤, 844 삼배 불상이 말풍선 뒤(기존 hall 그림), 360·390 소원 단계 상단 단계명 "소원 ..." 잘림(이전 상단 캡처 없음 — 기존 여부 미확인), 844 5·5b 패널 안쪽 스크롤바, 삼배 캐릭터 뒤 사각 바탕(기존).
- 롤백: 플래그 없음 → `git revert 4184e5d194 a26bee08aa`(문서 커밋은 남겨도 무방).
