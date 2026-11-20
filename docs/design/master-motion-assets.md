# 마스터 모션 후속 그림 목록 (W4, 2026-11-21)

사용자 요청(2026-11-21): "각 전문가, 대표 상담에서 설정된 마스터들이 움직이거나 주변에 꽃이 휘날리는 효과를 주도록해줘 현재 이미지 생성은 어렵기 때문에 바로 안되더라도 후속으로 진행가능하도록해주면 좋겠다".

지금은 그림 없이 CSS만 쓴다(`app/components/master-motion/MasterMotion.tsx`): 기존 WebP 초상의 숨쉬기·흔들림과 꽃잎(꿀꿀)·금빛 별가루(영냥이) 레이어다. 이 문서는 나중에 그림을 만들 때 그대로 따라 할 목록이다. 이번 작업에서는 새 이미지 파일을 만들지 않았고 원본 캐릭터 그림도 고치지 않았다.

## 연결 방법 (코드는 이미 준비됨)

1. 아래 규격으로 파일을 만든다. 위치는 해당 초상 옆이다(예: `public/images/master-profiles/motion/<key>/`).
2. `components/fortune/master-profiles.ts`의 해당 항목에 선택 필드 `motion`을 넣는다. 형태는 `MasterMotionArt = { frames?: string[]; video?: string; poster: string }`(정의 `app/components/master-motion/MasterMotion.tsx`)다.
   - `masterProfiles.<key>.motion`: 소개장(MasterProfile 소개장 초상)
   - `productMasters.<상품>[i].motion`: 히어로 마스터 띠 아바타(ProductMasterStrip)
3. 값이 있으면 화면에 보이고 움직임 줄이기가 꺼져 있을 때만 영상(`muted`·`playsinline`·`loop`·`preload="none"`·`poster`)이나 프레임 줄(CSS `steps()` 한 줄, JS 루프 없음)을 초상 위에 겹친다. 값이 없거나 플래그가 꺼져 있으면 지금의 CSS 모션이나 정적 초상으로 돌아간다.
4. 롤백 스위치는 `lib/master-motion/flags.mjs`의 `MASTER_MOTION_ENABLED`와 정적 셸 `js/core/yehwa-home.mjs`의 같은 이름 상수다.

## 공통 규격

| 항목 | 대기 루프 영상 | 프레임 줄 | 포스터 |
|---|---|---|---|
| 형식 | WebM(VP9, 알파 필요 시 VP9 alpha) + 같은 이름 MP4(H.264) 대체본 | WebP 프레임 6~12장 | WebP |
| 크기 | 소개장 600×720(360×432 함께), 아바타 112×112 | 같은 크기 | 영상·프레임 첫 장과 같은 크기 |
| 길이 | 3~5초 무한 반복, 첫 장과 끝 장이 이어질 것 | 프레임당 120ms | — |
| 용량 상한 | 소개장 600KB, 아바타 120KB | 합계 소개장 400KB, 아바타 80KB | 소개장 80KB, 아바타 12KB |
| 동작 | 눈 깜빡임·호흡·머리카락/옷자락·소품(찻잔·부채·깃털) 작은 흔들림. 얼굴·실루엣·의상은 원본과 같게 | 같음 | 지금 초상과 같은 구도 |

- 소리는 없다. 텍스트·로고·워터마크를 넣지 않는다. 배경은 지금 초상과 같은 배경(투명 컷이면 투명)을 쓴다.
- 꽃잎·별가루는 그림에 그려 넣지 않는다. CSS 레이어가 따로 그리므로 둘이 겹치면 과해진다.
- 출처 규칙([content-assets](../context/content-assets.md#캐릭터-삽화-제작-원본)): 원본 폴더 `D:\CodeDestiny-Build`의 해당 인물 시트를 이미지 입력으로 첨부해 만들고, 기존 `public/images/master-profiles/provenance.json`에 `source`·`references`·`generationTool`·`promptSummary`·변환 작업을 항목별로 적는다. 사용자 제공 원본이 있으면 그것이 우선이다. 정체성이 달라 보이면 넣지 않는다.

## 마스터별 목록

| 마스터 · 쓰는 곳 | 기준 초상(바꾸지 않음) | 만들 것 | 동작 메모 |
|---|---|---|---|
| 연이 · 연애 비책 공동 마스터 | `yeoni-love-portrait.webp`, 아바타 `avatars/yeoni-love.webp` | 소개장 루프 + 아바타 루프 + 포스터 | 장밋빛 머리카락·꽃장식 살랑임, 미소 깜빡임 |
| 서한비 · 연애 비책 공동 마스터 | `hanbi-love-portrait.webp`, 아바타 `avatars/hanbi-love.webp` | 소개장 루프 + 아바타 루프 + 포스터 | 흑발·레이스 소매 흔들림, 붉은 보석 반짝임 |
| 네오 · 신년운세 | `neo-new-year-portrait.webp`, 아바타 `avatars/neo-new-year.webp` | 소개장 루프 + 아바타 루프 + 포스터 | 은발·흰 망토 자락, 푸른 눈 깜빡임 |
| 윤달 · 인생의 책 | `yun-life-book-portrait.webp`, 아바타 `avatars/yun-life-book.webp` | 소개장 루프 + 아바타 루프 + 포스터 | 접부채 살짝 펼침, 원형 펜던트 흔들림 |
| 윤달 · 점성술 전문가 무대 | `src/features/expert-characters` idle 컷 | idle 루프(무대 프레임 비율) | 말하기 프레임과 겹치지 않게 입은 다문 상태 |
| 무성 · 자미두수 전문가 무대 | 같은 위치 idle 컷 | idle 루프 | 금빛 깃털 흔들림, 후드 술 |
| 서한비 · 숙요점 전문가 무대 | 같은 위치 idle 컷 | idle 루프 | 레이스 소매 |
| 연이 · 손금 전문가 무대 | 같은 위치 idle 컷 | idle 루프 | 꽃무늬 블라우스, 손바닥 들어 보이기 |
| 무성·서한비·윤달 · 홈 기본 마스터 카드(`/ggulggul/`) | 각 카드 160px 그림 | 160×160 프레임 줄(선택) | 정적 셸이라 지금은 CSS만. 그림을 넣으려면 `js/core/yehwa-home.mjs`에 연결을 따로 추가한다 |

## 4단계 웹툰 결과에서 빠진 표정 그림

`lib/webtoon-result/narrator.mjs`의 `MISSING_EXPRESSION_ART`가 가까운 표정으로 대신 쓰고 있는 그림이다. 만들면 `EXPRESSION_ART`의 대체 항목만 바꾼다.

| 캐릭터 | 표정 | 쓰임 | 규격 |
|---|---|---|---|
| 연이(꽃돼지) | greet | 첫 컷 인사 | 기존 연이 컷과 같은 캔버스·비율, WebP, 투명 배경 |
| 연이(꽃돼지) | worry | 주의·경고 카드 앞 | 같음 |
| 영냥이 | explain | 근거 설명 컷 | 기존 영냥이 moods 컷과 같은 캔버스, WebP |
| 영냥이 | worry | 주의 컷 | 같음 |
| 영냥이 | cheer | 응원·끝맺음 컷 | 같음 |
| 영냥이 | serious | 경고 카드(M18 등) | 같음 |

영냥이는 분홍을 쓰지 않는다(밤색·아이보리·금빛). 연이와 영냥이 그림을 서로 섞지 않는다.
