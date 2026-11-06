# 오늘의 숲길 그림 제작 기록

2026-11-05 제작. 공개 홈의 숲 입구와 전체 화면 숲길(`app/components/forest/`)에 쓰는 그림이다.

## 파일

| 공개 경로 `public/images/home/forest/` | 쓰는 곳 | 원본 크기 → 공개 폭 |
|---|---|---|
| `gate-wide.{avif,webp}` | 숲 입구, 601px 이상 | 1536×1024 → 1200 |
| `gate-mobile.{avif,webp}` | 숲 입구, 600px 이하 | 1024×1536 → 720 |
| `step-lantern.{avif,webp}` | 첫 걸음 | 1536×1024 → 1200 |
| `step-path.{avif,webp}` | 둘째 걸음 | 1536×1024 → 1200 |
| `step-spring.{avif,webp}` | 셋째 걸음 | 1536×1024 → 1200 |
| `walk-done.{avif,webp}` | 숲 지도 | 1536×1024 → 1200 |
| `piece-<id>.webp` 7종 | 숲 지도의 요일 칸 | 시트에서 잘라 128×128, 배경 투명 |

조각 시트의 칸 순서는 `forest-progress.mjs`의 `FOREST_PIECES`와 같다: `firefly-jar`, `moss-cushion`, `pinecone`, `fern-leaf`, `moon-stone`, `mushroom-lamp`, `petal-letter`.

작업 원본(PNG)과 프롬프트는 저장소 밖 `D:\CodeDestiny-Build\forest-walk\`에 있다.

## 만드는 법

- 도구: `codex exec`의 내장 `image_gen`(OAuth, 과금 API 아님).
- 참조 첨부: 연이 프로필 시트, `public/assets/yeongnyangi/original/hero-800.webp`.
- 조각 시트를 빼고 모든 프롬프트 뒤에 아래 공통 문구를 붙인다.

```text
STYLE
Premium hand-painted storybook illustration, soft gouache with luminous glazes, rich tonal depth, gentle volumetric light through mist, refined and elegant, the characters rendered in the same soft style as their references. Palette: deep moss green and teal shadows, warm amber lantern light, subtle pink glow from the lotus. Quiet, enchanted, luxurious mood.

DO NOT include: any text, letters, numbers, logos, watermarks, name tags with writing, extra characters, giant forest spirits or large furry creatures, buses, or human figures.
```

## 지켜야 할 것

- 특정 작품의 캐릭터·이름·화풍을 프롬프트와 화면에 쓰지 않는다. 고목, 안개, 반딧불, 이끼, 등불의 분위기만 쓴다.
- 영냥이는 원본 크기로 잘라 귀 2개를 세고 통과시킨다. 이번 그림 네 장(`gate-v1`, `gate-mobile`, `step-path`, `walk-done`)은 모두 통과했다.
- 연이는 왼쪽 연꽃, 보라 스카프, 말린 꼬리, 갈색 발끝을 프로필 시트와 대조한다.
- 조각은 꿀방울이나 재화처럼 보이면 안 된다. 교환 가치가 없는 기념품이다.
- 입구 그림은 200KB 이하로 낸다. 첫 화면의 최대 콘텐츠 요소는 타로 카드로 유지한다(입구 그림은 `loading="lazy"`).
