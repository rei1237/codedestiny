# 컨셉·디자인 정본

> 컨셉·디자인·UI 작업은 이 파일부터 읽는다(2026-10-01). 세부 [design-and-ui](design-and-ui.md) · 토큰 [DESIGN.md](../../DESIGN.md) · 제품 [PRODUCT.md](../../PRODUCT.md) · 영냥이 화면 [yeongnyangi-night](../design/yeongnyangi-night.md). 우선순위는 코드 실물 > 이 파일 > 나머지 문서. 어긋나면 고치고 [CONTEXT_AUDIT](../CONTEXT_AUDIT.md)에 적는다.

## 1. 정체성

| 층 | 이름 | 실물 |
|---|---|---|
| 회사 | CODE DESTINY | 푸터·법적 표기에만 |
| 브랜드(노출 1순위) | 꿀꿀 운세 — "오늘의 마음이 조금 가벼워지는 곳" | `lib/seo/siteSeo.ts:81`, `app/components/SiteFooterHub.jsx:192`. `/`(`app/page.js`)는 꽃돼지 `/ggulggul/`(정적 셸 `index.html`)로 보낸다 |
| 주인공 상담가 | 영냥이 — 흰 장모 치비 마법사 고양이(남색 모자·금빛 초승달), 달빛 점술방 | `/yeongnyangi/`(`app/yeongnyangi/`). 마스터 이미지 `public/assets/yeongnyangi/original/hero-800.webp`, 묘사 정본 `docs/design/yeongnyangi-tarot/art-ledger.jsonl:1`. 캐릭터 원본은 고치지 않는다 |
| 상담가 | 연이(꽃돼지) 🌸 | 상담실 "꽃빛 상담실"(`worker/yeongnyangi/prompts/persona/yeoni.ts:1`), 기능 "운명의 찻집"(`/fortune-tea-house`) |
| 상담가 | 네오 🦁 | 상담실 "별빛 전략실"(`persona/neo.ts:1`, `app/fortune-chat/`), 기능 "팩폭 전략실"(`lib/consultation-sharing.ts:11`) |

- 사용자: 한국어 우선(+en·ja·zh), 모바일, 위로와 방향을 함께 찾는 사람. 약속은 오락이 아니라 근거 있는 조언이다.
- 영냥이 세계에서는 영냥이가 주인공이고 연이는 꿀꿀 운세로 잇는 보조 링크다(yeongnyangi-night 7행).
- 상담실 이름과 기능 이름은 둘 다 살아 있다. 한쪽으로 바꾸지 않는다.
- 식별 이모지는 🌸(꽃돼지)·🦁(네오) 둘뿐이다. 네오에 🌙 를 쓰지 않고 새 장식 이모지를 넣지 않는다.

## 2. 목소리

| 화자 | 말투 | 호칭 | 정본 |
|---|---|---|---|
| 영냥이 | 반말. 직설적이지만 결국 다정(핵심 판단 먼저 → 이해 → 작은 행동, 응원은 한마디에). 분석은 구체적으로, '~냥'은 짧은 한마디에만 | 너·손님 | `persona/yeongnyangi.ts:1-4` |
| 연이 | 부드러운 존댓말·편지체. 답과 근거를 위로보다 먼저 | 당신 | `persona/yeoni.ts:1-6` |
| 네오 | 짧고 정돈된 존댓말. 핵심 판단을 먼저 | 당신 | `persona/neo.ts:1-6` |
| UI 크롬(버튼·안내·결제·법적 문구) | 해요체. 짧고 행동 중심 | — | 이 파일 |

- 말버릇은 제 캐릭터 것만 쓴다 — '~냥'은 영냥이 전용이다. 사용자를 돼지나 상담가 이름으로 부르지 않는다. 아기 말투·과한 애교·이모지 남발 금지.
- 모든 화자 금지: 공포 조장, 재회·합격·금전·건강 같은 확정 예언, 결과 보장, 결제 압박, 의료·법률·투자 결정 대행(`persona/yeoni.ts:5`, `persona/neo.ts:3`, [content-assets](content-assets.md) 콘텐츠 보이스).

## 3. 용어

- 결제 수단은 **달빛 이용권**(별칭 문라이트 패스, 30일·자동갱신 없음)·**월정석**(이벤트 지급, 구매 불가)·**단건 결제** 셋이다. 코인은 화면에 내지 않는다([payment-gating](payment-gating.md) 14행).
- 🌸 꽃돼지 달빛 이용권과 영냥이 전용 이용권(횟수권)은 따로 보유·적용된다. 한 이름으로 섞지 않는다(`app/components/service-packs/service-pack-copy.ts:7`, `:77`).
- 영냥이 상품 등급은 생선이다: 고등어·연어·광어·참치·모둠·오마카세(`worker/yeongnyangi/payments/catalog.ts:7-8`). 표기는 표준어 '모둠'.

## 4. 토큰 지도

| 범위 | 색 토큰 정본 | 비고 |
|---|---|---|
| 영냥이(`app/yeongnyangi/`, `/checkout`) | `app/yeongnyangi/night-tokens.css` `--yn-*` | 밤색·금색은 영냥이 범위의 결정(yeongnyangi-night 11행) |
| 꿀꿀 셸·연이·네오 | `styles/theme-tokens.css` `--cd-*`, Tailwind `cd.*`(`tailwind.config.js:21`) | 연이=핑크 계열, 네오=퍼플 달빛. 가르는 축은 명도가 아니라 색상 계열 |
| 반경 6단 | `--cd-r-sm`·`control`·`md`·`card`·`section`·`pill` = 8·12·16·20·26·999px | `theme-tokens.css:176-178`, `:348-350` |
| 간격·타이포·모션·폭·버튼 | DESIGN.md §7 표 | 페이지에 리터럴을 새로 박지 않는다 |

- 새 색은 토큰으로만 쓴다. 새 하드코딩 hex, 레거시 팔레트, `dark:`, `prefers-color-scheme` 은 들이지 않는다(DESIGN.md §9).
- `*.module.css` 안에서 `--cd-*` 를 재선언하지 않는다. 사설 네임스페이스를 쓴다(DESIGN.md §7).

## 5. 표면 규칙

| 표면 | 스타일 | 고치는 곳 |
|---|---|---|
| 영냥이 | CSS Modules + `_original/*.css`, 키프레임 애니메이션 포함 | `app/yeongnyangi/` |
| 그 밖 App Router | Tailwind. 읽기형·허브·정책 화면은 DESIGN.md §8 표면 3종 중 하나 | `app/**` |
| 정적 셸(꽃돼지 `/ggulggul/`, 로케일) | `index.html` 정본 → `npm run sync:public` 으로 미러 생성 | `index.html` |

- 신규 화면은 몰입형이다. 전역 헤더·푸터를 붙이지 않는다([design-and-ui](design-and-ui.md) 20행).
- 모바일 공용 래퍼는 인체공학만 다룬다: 탭 44px, 입력 16px, 가로 넘침 없음, safe-area(19행).
- 대비: 본문 4.5:1, 큰 글씨·UI 3:1, 반투명 표면은 합성색으로 잰다. 고칠 때 색상 계열은 두고 명도·채도만 바꾼다. 배경만 바꾸는 반쪽 오버라이드는 금지(15·30·75행).

## 6. 검증 루프

1. UI 파일을 저장하면 impeccable 감지 훅이 자동으로 돈다(`.claude/settings.json` PostToolUse). 대비는 못 잡는다(design-and-ui 32행).
2. 화면 인상이 바뀌는 변경이면 모델이 critique → 수정 → audit·polish 스킬을 직접 부른다.
3. 실제 화면은 visual-checker 에이전트가 판정한다. 스크린샷을 메인 세션에서 직접 읽지 않는다.
4. 축별 검사: `npm run verify:hero-contrast`, `npm run verify:mobile-detail-nonintrusive`(CI 차단), 터치 영역은 `npm run measure:touch-targets`.

## 7. 충돌 해소 기록 (2026-10-01, 상세는 CONTEXT_AUDIT)

1. `/` 정체 → 꿀꿀 운세 진입(`app/page.js`). CLAUDE.md·BASELINE 정정.
2. 영냥이 누락 → PRODUCT·design-and-ui·content-assets 에 상담가 셋과 이 파일 링크.
3. `dark:` 필수(07-09·08-15) ↔ 금지(DESIGN.md §9, 09-05) → 금지.
4. 애니메이션 "Tailwind 만" → 영냥이 CSS 키프레임 예외.
5. 테마 축 → DESIGN.md §9 에 `--yn-*`, "App Router 는 네오 단일"에 영냥이 예외.
6. 반경 "3종" → 6단.
7. "따뜻한 존댓말" 일괄 → 화자별 표. 상담실·기능 이름은 둘 다 살아 있어 개명하지 않음.
8. impeccable "항상 사용" ↔ 수동 전용 → 스킬 4종 name-only.
