# 컨셉·디자인 정본

> 컨셉·디자인·UI 작업은 이 파일부터 읽는다(2026-10-01). 세부 [design-and-ui](design-and-ui.md) · 토큰 [DESIGN.md](../../DESIGN.md) · 제품 [PRODUCT.md](../../PRODUCT.md) · 영냥이 화면 [yeongnyangi-night](../design/yeongnyangi-night.md). 우선순위는 코드 실물 > 이 파일 > 나머지 문서. 어긋나면 고치고 [CONTEXT_AUDIT](../CONTEXT_AUDIT.md)에 적는다.

## 1. 정체성

| 층 | 이름 | 실물 |
|---|---|---|
| 회사 | CODE DESTINY | 푸터·법적 표기에만 |
| 브랜드(노출 1순위) | 꿀꿀 운세(2026-10-15 사용자 결정: 공식 표기. 붙여 쓴 "꿀꿀운세"는 별칭, 운영자는 CODE DESTINY. 여러 점술을 아우르는 운세 플랫폼) — "오늘의 마음이 조금 가벼워지는 곳" | 원본 `lib/brand/brand-facts.mjs`(과거명은 `historyKo` 에만). 파생: `lib/seo/siteSeo.ts`, `app/components/SiteFooterHub.jsx`. 상담 앱 입구는 꽃돼지 `/ggulggul/`(정적 셸 `index.html`) |
| 주인공 상담가 | 영냥이 — 흰 장모 치비 마법사 고양이(남색 모자·금빛 초승달), 달빛 점술방 | `/yeongnyangi/`(`app/yeongnyangi/`). 마스터 이미지 `public/assets/yeongnyangi/original/hero-800.webp`, 묘사 정본 `docs/design/yeongnyangi-tarot/art-ledger.jsonl:1`. 캐릭터 원본은 고치지 않는다 |
| 상담가 | 연이(꽃돼지) 🌸 | 상담실 "꽃빛 상담실"(`worker/yeongnyangi/prompts/persona/yeoni.ts:1`), 기능 "운명의 찻집"(`/fortune-tea-house`) |
| 상담가 | 네오 🦁 | 상담실 "별빛 전략실"(`persona/neo.ts:1`, `app/fortune-chat/`), 기능 "팩폭 전략실"(`lib/consultation-sharing.ts:11`) |

- 사용자: 한국어 우선(+en·ja·zh), 모바일, 위로와 방향을 함께 찾는 사람. 약속은 오락이 아니라 근거 있는 조언이다.
- 영냥이 세계에서는 영냥이가 주인공이고 연이는 꿀꿀운세로 잇는 보조 링크다(yeongnyangi-night 7행).
- 상담실 이름과 기능 이름은 둘 다 살아 있다. 한쪽으로 바꾸지 않는다.
- 식별 이모지는 🌸(꽃돼지)·🦁(네오) 둘뿐이다. 네오에 🌙 를 쓰지 않고 새 장식 이모지를 넣지 않는다.

## 2. 목소리

| 화자 | 말투 | 호칭 | 정본 |
|---|---|---|---|
| 영냥이 | 반말(기본). 한국어 주 상담 주문서에서 존댓말(해요체, 호칭 '손님')을 고를 수 있다 — 말투만 바뀌고 성품·규칙은 같다. 직설적이지만 결국 다정(핵심 판단 먼저 → 이해 → 작은 행동, 응원은 한마디에). 분석은 구체적으로, '~냥'은 짧은 한마디에만 | 너·손님(존댓말은 손님) | `persona/yeongnyangi.ts` `persona`·`honorificPersona` |
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
| 꿀꿀 셸·연이·네오 | `styles/theme-tokens.css` `--cd-*`, Tailwind `cd.*`(`tailwind.config.js:21`) | 연이=핑크 계열, 네오=퍼플 달빛. 가르는 축은 명도가 아니라 색상 계열. 홈 블록 `.cdh` 는 연이 정원 팔레트(`--cdh-*`, DESIGN.md "연이 정원 홈") |
| 반경 6단 | `--cd-r-sm`·`control`·`md`·`card`·`section`·`pill` = 8·12·16·20·26·999px | `theme-tokens.css:176-178`, `:348-350` |
| 간격·타이포·모션·폭·버튼 | DESIGN.md §7 표 | 페이지에 리터럴을 새로 박지 않는다 |

- 새 색은 토큰으로만 쓴다. 새 하드코딩 hex, 레거시 팔레트, `dark:`, `prefers-color-scheme` 은 들이지 않는다(DESIGN.md §9).
- `*.module.css` 안에서 `--cd-*` 를 재선언하지 않는다. 사설 네임스페이스를 쓴다(DESIGN.md §7).
- 영냥이 밤 예화 = `--yn-yehwa-mask-*`(`app/yeongnyangi/yehwa-night.generated.css`, `scripts/design/gen-yehwa-motifs.mjs`의 `renderYnNight()`), 금색(`--yn-gold`) 전용. 홈의 `--cd-yehwa-mask-*`와 분리 유지 — 섞지 않는다.

## 5. 표면 규칙

| 표면 | 스타일 | 고치는 곳 |
|---|---|---|
| 영냥이 | CSS Modules + `_original/*.css`, 키프레임 애니메이션 포함 | `app/yeongnyangi/` |
| 그 밖 App Router | Tailwind. 읽기형·허브·정책 화면은 DESIGN.md §8 표면 3종 중 하나 | `app/**` |
| 정적 셸(꽃돼지 `/ggulggul/`, 로케일) | `index.html` 정본 → `npm run sync:public` 으로 미러 생성 | `index.html` |

- 신규 화면은 몰입형이다. 전역 헤더·푸터를 붙이지 않는다([design-and-ui](design-and-ui.md) 20행).
- 루트 `/`는 2026-10-25 사용자 확정에 따라 두 캐릭터 카드 중심의 단순한 입구다. `app/page.js`가 정본이며 `/ggulggul/`·`/yeongnyangi/` 직접 진입과 기존 그림을 유지한다. 보조 안내·기존 탐색 콘텐츠는 기본 닫힌 네이티브 펼침 영역에 보존한다. 아래 달빛 예화 기본 UI 계약이 이전의 상시 펼침 순서를 대체한다.
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

## 달빛 예화 기본 UI 계약 — 2026-10-25 사용자 확정

- 새 버튼·안내·카드를 만들거나 수정할 때 기존 달빛 예화 컴포넌트와 실제 화면을 먼저 참조한다. 사용자가 매번 요청해야 적용되는 선택 장식이 아니다. 최신 명시적 사용자 지시가 우선한다.
- 꿀꿀 운세는 꽃빛 정원: 크림·로즈·샴페인 골드, 연꽃 속 연이, 가는 이중 테두리와 모서리 꽃가지. 영냥이는 밤의 점술방: 전용 밤색·아이보리·금빛 토큰과 도도한 흰 고양이. 영냥이를 분홍색으로 통일하지 않는다. 네오의 별도 정체성은 보존한다.
- 제목·서비스명은 기존 명조, 조작·설명은 기존 본문 서체. 읽기 본문은 모바일 14~16px 수준, 충분한 행간. 주 행동은 48px 이상, 얇은 장식 테두리·역할에 맞는 문양·분명한 포커스·빠른 눌림 반응을 함께 설계한다. 장식은 얼굴·본문·터치를 가리지 않는다.
- 긴 보조 안내는 하나의 달빛 메모(옅은 종이 표면, 이중 테두리, 여백의 꽃 장식, 연꽃 인장)에 소제목별로 정리한다. 영냥이에서는 같은 구조를 밤빛 토큰으로 표현한다. 사실·가격·정책의 의미는 바꾸지 않는다.
- 꽃 아이콘만 덧붙인 일반 버튼, 장문을 그대로 쌓은 안내, 모든 행동을 똑같이 강하게 칠한 UI는 완성으로 인정하지 않는다. 반복 반짝임·자동 튜토리얼·등장 대기로 핵심 조작을 늦추지 않는다.
- 공개 메인은 두 실제 그림 카드 → 요청 시 여는 ‘어디로 가면 좋을까요?’ → 기본 닫힌 ‘더 둘러보기’ → 필수 푸터. 기존 대표 상담·분야·결과 예시·FAQ·내부 링크는 더 둘러보기의 서버 HTML에 보존한다. 안내의 네오는 작은 직접 검수 상담 링크이며 세 번째 주 카드가 아니다.
- 코드 참조: app/home-main.module.css(두 카드·행동), styles/consultation-method-guide.css(그림 안내·메모), lib/brand/consultation-methods.mjs(entry/full 내용). 실제 360·390·430px와 데스크톱 기본/펼침 화면을 대조하고 브랜드 구분·대비·터치·줄바꿈을 함께 확인한다.
