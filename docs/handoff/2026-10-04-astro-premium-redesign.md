---
status: done
updated: 2026-10-04
next: "완료. 남은 것은 사용자 라이브 검수(§10-10)와 아래 '완료 기록'의 후속 과제뿐이다."
---

## 완료 기록 (2026-10-04, 세션 cd28de1e)

- main `954f4ceca` 에 1~8단계 반영, CI 9종 통과. 커밋: d605fab50·7d4f42872·a67606269·9aa69aef9·7e8ee8767·54b7e2995·4b1ab94ae(+ origin/main 머지 3회).
- 7단계(죽은 CSS): 옛 블록이 "이전 해석 기록" 서랍 안에서 그대로 렌더되므로 옛 CSS 는 모두 살아 있다. as-* 클래스도 전부 JS 가 출력한다 → 지울 것 0, 커밋 없음.
- 실측(b1@390, astro-read-probe 동일 도구): 기본 높이 17,175px(기준선 17,243; b2 17,130·b3 17,315). 상담 5,849 + 읽을거리 2,327 이 그대로라 ≤12,000 은 숨기지 않고는 불가 — 미달로 보고.
- 특정성(#asStory 문장): 시간 앎 정확 1.5%·가림 4.4%, 모름 1.7%·6.6% → 기준 충족. 깊이 읽기는 정확 28.8%·가림 40.7%(행성 정의 문장 10개가 공통, 옛 planets 47%).
- 대비 최소 5.05, 탭 44px, 13px 미만 0, 넘침 0, pageerror 0, verifier 4종·check:fast exit 0.
- 후속(보고만): 옛 applyMode 가 document.getElementById 로 wrap 을 찾음; verify-basic-fortune-library :581 공유 수 플레이크(2!==3); 옛 피르다리아 섹트 무시·프로펙션 계산 결함; p.fr-brand·상담 유료 항목 이름/가격이 14px 미만; 금색 토스트·페이지 크롬 이모지; 깊이 읽기 행성 정의 문장의 공통성.

# 점성술 결과 화면 고급 재설계 — 새 시각 언어 + 카테고리별 "내 이야기" 해석

작성 2026-10-04, 이전 세션 38cfed91(상태 파일 `.claude/state/38cfed91.md`). 이 문서만 읽고 시작할 수 있게 썼다. 줄 번호는 `d3f819ee9` 기준이다(35c751141과 동일, 이후 커밋이 이 파일들을 안 건드림). 다르면 `git grep` 이 정본이다.

대상 화면: `/ggulggul/` → 프로필 → 운세 선택 "점성술"(`.dp-fsel-btn--astro`) → `#astroModalOverlay` 안 `#astroResult > #astroBodyWrap`.

## 0. 시작 절차

1. CLAUDE.md 세션 시작 점검. 🔴 main 체크아웃에는 남의 미커밋(`index.html`·`public/*/index.html`·`marketing/*`·rss·llms)이 있어 `pull --ff-only` 가 막힐 수 있다. 그러면 `scripts/create-safe-worktree.ps1 -Slug astro-premium`(base origin/main)으로 워크트리를 만든다. 남의 파일은 건드리지 않는다.
2. 상태 파일에 요청 원문(§1)과 §9 체크리스트를 옮긴다.
3. 큰 화면 개편이다(원칙 16). 방향과 성공 기준을 사용자에게 5줄 이내로 먼저 공유한다(§4·§6·§10 요약). 사용자가 목업 승인을 요구하지 않았으므로 승인을 기다리지 않고 구현한다.
4. 기준선을 실측한다(`<W>`=작업 디렉터리, `<S>`=스크래치패드). 수치가 §3과 다르면 실측이 정본이다.
   ```
   node d:/tmp/astro-redesign-tools/astro-outline-probe.mjs <W> <S>/before --births=b1,b2,b3 --full
   node d:/tmp/astro-redesign-tools/sentence-overlap.cjs <S>/before b1,b2,b3
   node d:/tmp/astro-redesign-tools/sentence-overlap.cjs <S>/before b1,b2,b3 --mask
   node d:/tmp/astro-redesign-tools/astro-read-probe.mjs <W> <S>/read-before --births=b1,b2,b3 --widths=390,1280
   node scripts/verify-basic-fortune-library.mjs --baseline
   ```
5. 라이브 뷰어를 띄운다(사용자 검수용, 메모리 ui-work-show-live-browser). `node d:/tmp/astro-redesign-tools/life-live.mjs <W> b1` 을 Bash `run_in_background`, timeout 7200000으로 실행한다. 2시간 뒤 종료되면 다시 띄운다. 커밋마다 "창에서 F5"를 안내한다.

## 1. 요청 원문과 해석

2026-10-04 원문이다. 스크린샷 2장이 함께 왔다. ① 행성 카드: "천칭자리(♎) · 천칭자리(♎)" 중복, Placidus/Whole Sign, "키워드:", "자세히 보기". ② "현실에서 쓰는 별자리 조언"·"차트 전체 요약"의 "12H / 12H (체감: … / 큰 흐름: …)" 문단 벽.

> "지금도 이런 부분들이 고급스럽지 못한데 다른 세션에서 기존 디자인을 참조하지 않으면서 점성술 UI/UX를 더 고급스럽게 개선해줄 인수인계 문서를 만들어서 작업 가능하도록해줘 최고의 ui 디자이너로서 깔끔하면서 폰트까지도 보기 좋아야하며, 내용도 사람들이 너무 알기 어려워 직관적이고 연애, 재물. 인간관계 이런 카테고리별로 알기 쉽고 내 이야기를 하는것처럼 타고난 성향에 대한 설명도 여러 별자리를 보면서 정확하게 해줄 필요가 있어보인다."

10-03 결정도 유지한다: "접을 수 있도록해주고 깔끔하게 나오도록 해줘 디자인도 점성술이니 우주와 별자리, 은하수 컨셉으로 해주면 좋겠다". 그래서 콘텐츠는 삭제 0, 접기로 정리한다. 컨셉은 우주·별자리·은하수다.

| # | 요구 | 판정(§10) |
|---|---|---|
| R1 | 고급스럽고 깔끔하게 | 시각 루브릭 + 사용자 라이브 검수 |
| R2 | 폰트까지 보기 좋게 | 실제로 로드된 제목 세리프, 크기 하한, 줄 길이 |
| R3 | 직관적으로(전문용어 장벽 제거) | 1차 층 금지어 0 |
| R4 | 연애·재물·인간관계 등 카테고리별 | 카테고리 6개, 접힌 상태에서도 결론 한 줄씩 |
| R5 | 내 이야기처럼, 여러 별자리를 종합해 정확하게 | 문장 특정성 지표 + 근거와 차트 일치 테스트 |

"기존 디자인을 참조하지 않으면서"는 이렇게 해석한다. 지금 점성술 화면의 시각 실행(네온·코스믹 스킨, 카드 모양, 인라인 스타일, `astro-*` 클래스)을 출발점으로 삼지 않는다. 새 클래스 네임스페이스 `as-*` 와 토큰 `--as-*` 로 새로 짓고, 옛 CSS 가 새 마크업에 새지 않게 한다. 레포 공통 규칙(DESIGN.md 간격·반경·모션 토큰, 대비, 말투, 가드)은 그대로 적용한다. 충돌 해소 기록은 `docs/CONTEXT_AUDIT.md` 2026-10-04 항목이다.

## 2. 범위·등급

등급은 RED다. 공유 렌더러, verifier 계약, 미러 7개, 결제 영역 인접이 이유다. 결제 로직은 건드리지 않는다.

- **바꾼다**: `#astroBodyWrap` 안 무료 해석 영역의 정보 구조·마크업·카피·CSS, 새 결정론 해석 모듈(LLM 없음).
- **그대로 둔다(마크업·로직·스타일 불변)**:
  - 상담 블록: `#astroActionHub`, `#astroAiPromptSection`, `.astro-stellar-archive`(유료 게이트 4개), `.astro-compat-panel` ×2
  - 계산: `calcAstroSwissChartOrThrow`(`js/saju-engine.js:12260`)와 AstroEngine 계산
  - App Router `/astrology-ai`, 결제·이용권 경로
  - 새 스킨은 이 블록들을 감싸는 바탕만 준다. 어울림 문제가 보이면 보고만 한다.
- **삭제 0**: 새 해석이 흡수한 옛 블록은 "깊이 읽기" 아래 접힘으로 옮긴다(§4 매핑표). 지우려면 §13-3 확인 + deletion-auditor + 별도 커밋이 필요하다. 옛 CSS 정리도 deletion-auditor 판정 뒤 별도 커밋으로 한다.
- **본문은 한국어 전용**(지금도 엔진 산문은 ko 전용이다). 새 제목·요약줄은 bFP copy 배열 5개 로케일에 키를 추가한다. 비ko 화면의 제목에는 한글 0이어야 한다(§8).

## 3. 현재 실측 (35c751141, 2026-10-04, mock)

출생 표본: b1 1990-10-14 14:30 서울 / b2 1985-03-02 06:10 부산 / b3 2001-07-21 22:45 서울. 원본 덤프는 `d:/tmp/astro-redesign-tools/baseline-35c751141/`(outline·전문 텍스트)에 있다.

**구조 (b1 @390)**

| 섹션 | 글자 | details |
|---|---:|---:|
| fr-astro-reading | 4,088 | 8 |
| fr-astro-chart | 1,294 | 1 |
| fr-astro-planets | 9,861 | 22 |
| fr-astro-consult(그대로) | 5,842 | 3 |
| fr-astro-explore(잔여 수거함) | 6,593 | 1 |
| fr-astro-articles | 1,321 | — |

- 기본 높이 17,243px, 전부 펼친 높이 37,860px, details 36개, 인라인 `style=` 370개.

**문장 특정성** — b1 문장(15자 이상) 가운데 b2·b3에도 똑같이 나오는 비율이다. "가림"은 별자리·행성 이름과 숫자를 가린 뒤의 비율로, 이름만 바꿔 끼운 템플릿 문장도 같은 문장으로 센다.

| 섹션 | 그대로 | 가림 |
|---|---:|---:|
| reading | 22% | 31% |
| chart | 10% | 77% |
| planets | 33% | 47% |
| consult(정적·유료, 범위 밖) | 88% | 90% |

**결함 목록** (`js/saju-engine.js`)
- 탄생 지도 행성 카드(`birthMapSummaryChips` :13380~):
  - 요약줄에 "천칭자리(♎) · 천칭자리(♎) 20°37'Placidus 8H · Whole Sign 9H · 순행 키워드: …"처럼 별자리가 두 번 나온다. 출처는 순행/역행 :13396, 하우스 방식 :13404.
  - "자세히 보기"가 10번 반복된다.
  - 카드마다 "Placidus N하우스 해석"과 "Whole Sign N하우스 해석" 두 줄이 붙는다(:13413–13414). 두 하우스가 같아도(예: 달 7/7) 같은 문장이 두 번 나온다.
  - FAQ "하우스 해석 방식이 뭐예요? (Placidus vs Whole Sign)"(:13452)가 1차 층에 있다.
- `_housePairText` :13223 / `_friendlyHousePair` :13332는 "8H / 9H (체감: … / 큰 흐름: …)" 형태를 만든다. 호출부가 19곳이다(:13780·13784·13786, 13841 일대, 13986–13987, 14284–14329, 14361, 14615, 14624).
- 현실 조언 :13777은 "1)~5)" 번호에 "(a)(b)(c)"가 섞인 문단 벽이다.
- 차트 전체 요약 :13838:
  - 괄호가 겹친다(…20° 36'(8H / 9H (체감: …))).
  - "차트 룰러 천왕성(Uranus)는"에는 조사 오류와 영어 병기가 있다. 현대 룰러 표 `chartRulerByAsc` :12719를 쓴다.
  - "어스펙트 편한 각(삼합)" 같은 전문용어가 나온다.
- "오늘 먼저 볼 키워드: #학문 #밸런스흙"처럼 해시태그가 나온다. 도수는 `20° 36'`(아포스트로피·공백)로 표기된다.
- 피르다리아 문구 :12869~에 확정 예언과 압박이 있다. 예: "임신·출산이 이 기간에 집중", "미루는 것은 우주의 흐름을 역행", "인생 최고의 행운 기간". design-canon §2 위반이다. 깊이 층에서 새로 쓸 때 고친다.
- 잔여 수거함에 "💞 궁합 핵심 리포트" 이모지 제목이 남아 있다. 정체성이 같은 블록이 흩어져 있다: 커리어 방향, 연애 설렘 포인트, 목성, 집중 포인트, 시너지, 4원소, 피르다리아, 프로펙션(:12974).

**폰트 사실**
- CSP는 `font-src 'self' data: https://assets.code-destiny.com`이다. Google Fonts는 막힌다.
- 지금 astro CSS가 부르는 'Gowun Batang'(`styles/basic-fortune-library.css:77·551`)과 'Noto Sans KR'(:29·533)은 @font-face가 없다. OS 폰트로 떨어지고, 기기별로 무엇이 뜨는지는 미측정이다.
- 실제로 쓸 수 있는 폰트:
  - `styles/fonts-serif.css`(`index.html:899` 비동기 로드):
    - `CodeDestinySerifKR`: 나눔명조, **700만**
    - `CodeDestinySerifLatin`: Cinzel 400–700
    - `CodeDestinyPlayful`: 고운돋움 400
  - `CodeDestinyBody`: 로컬 Pretendard / Apple SD Gothic Neo / 맑은 고딕(`index.html:1432`)
  - DESIGN.md §3 "Quiet Body Rule": 본문은 시스템 스택, 브랜드 세리프는 제목과 결과 산문에만 쓴다.
- 다른 굵기를 쓰려면 `scripts/build-serif-font-assets.mjs --apply`(R2 업로드, 외부 행위)가 필요하다 → §13-2.

## 4. 새 정보 구조 (위 → 아래)

nav는 5개를 유지한다(verifier). 섹션 id `fr-astro-reading/chart/planets/consult/articles`는 그대로 두고 라벨만 바꾼다: **나의 이야기 · 출생 차트 · 깊이 읽기 · 상담 · 읽을거리**.

1. **표지** (`fr-astro-reading` 맨 위)
   - 초상 한 문장을 세리프 디스플레이로 둔다. 예: "겉은 부드럽게 맞춰 주지만, 속은 끝까지 파고드는 사람이에요".
   - 빅3를 쉬운 말 3줄로 둔다: **의식하는 나**(해) · **속마음**(달) · **첫인상**(상승). 각 줄은 "역할 — 별자리 — 한 구절"이다.
   - 표지 그림은 개인화한 **황도 띠** SVG다. 가로 한 줄의 황도에 12칸 눈금을 두고, 행성 10개를 점으로 실제 경도에 찍는다. 해·달·상승만 이름을 붙인다. 은하수는 표지 뒤 저채도 대각 띠 1개만 둔다.
   - 시간 모름 배지: "태어난 시간을 몰라 첫인상·삶의 무대 해석은 뺐어요".
2. **타고난 성향** — 문단 3개 이하, 문단마다 근거 2개 이상
   - ① 겉과 속: 해·달·상승의 대비
   - ② 에너지의 결: 우세 원소·기질, 몰림(stellium)
   - ③ 내 안의 긴장 또는 재능: 개인 행성 사이 가장 정확한 각 1개
3. **삶의 카테고리 6개** — `<details>` 목록. 카드 격자가 아니라 헤어라인으로 나눈 행이다.
   - 순서: 연애 · 재물 · 인간관계 · 일 · 마음과 회복 · 성장
   - 요약줄 = 카테고리 이름 + **결론 한 문장**. 접힌 채로 6개 결론이 읽혀야 한다. 기본으로 첫 번째만 열지는 사용자 검수로 정한다.
   - 펼친 본문 순서:
     - "당신은 이래요" 불릿 3개. 서로 다른 요인에서 뽑는다.
     - 장면 하나("예를 들면 …")
     - 잘 맞는 것 / 조심할 것
     - 이번 주 해볼 한 가지
     - 접힌 "왜 이렇게 읽었나요": 근거 목록. 예: "금성 · 전갈자리 · 8번째 집", "금성과 토성이 부딪히는 각(정확도 높음)"
4. **오늘의 하늘**: `.astro-flow-card`(`#astroReadingModeToggle` 포함)다. 동작은 그대로 두고 카테고리 뒤로 옮긴다. 모드 토글이 무엇을 바꾸는지 먼저 확인한다.
5. **출생 차트** (`fr-astro-chart`)
   - `.astro-wheel-card` 1개는 details 밖에 둔다(verifier). 휠 SVG는 새 시각 언어로 다시 그려도 되지만 차트 데이터는 같아야 한다.
   - 그 아래 접힌 "행성 위치 표": 행성 | 별자리 | 집 | 한 줄 의미. 도수는 `20°36′`(프라임, tabular-nums)로 쓴다.
   - 하우스 방식 각주는 **플라시더스와 별자리 단위 집이 다를 때만** 한 줄 단다.
6. **깊이 읽기** (`fr-astro-planets`)
   - 행성 10개 해설: 한 줄 + 펼침 3문장. 하우스 방식 병기, "키워드:", "자세히 보기"는 쓰지 않는다.
   - 행성끼리의 대화: 정확한 각 상위 5개를 쉬운 말로 쓴다.
   - 인생 시기: 피르다리아·연간 프로펙션. 확정 예언 없이 새로 쓴다.
   - 원소·기질 균형 막대
   - 계산 정보: 정밀도, 하우스 방식 설명. 옛 FAQ가 여기로 온다.
   - 맨 아래 접힘 "이전 해석 기록"(옛 블록 보관, §13-3)
7. **상담** (`fr-astro-consult`): 그대로.
8. **읽을거리** (`astroArticleLibrary`, bFP :334): 그대로.

**옛 → 새 매핑**

| 옛 블록 | 새 위치 |
|---|---|
| bFP 히어로 facts, `#astroBig3Snapshot` :13981 | 표지 빅3 (옛 블록 → 이전 해석 기록) |
| `#astroLifeAreaSection` :13754 (7영역) | 삶의 카테고리 6 (옛 → 기록) |
| `#astroPersonalGuidanceSection`: 현실 조언 :13777, 차트 전체 요약 :13838, 한눈에 보는 나의 기질 :13841 | 타고난 성향·카테고리로 흡수 (옛 → 기록) |
| `#astroBirthMapSection` 탄생 지도 10카드 | 깊이 읽기 "행성 10개"로 다시 씀 (옛 → 기록) |
| `#astroAspectStorySection` | 깊이 읽기 "행성끼리의 대화" |
| `.precision-insight-card` | 깊이 읽기 "계산 정보" |
| 잔여 수거함(커리어 방향·연애 설렘·목성·집중·시너지·궁합 핵심·4원소·피르다리아·프로펙션) | 카테고리(일·연애·인간관계)로 흡수하거나 깊이 읽기 "인생 시기"·"균형"으로 옮김. `fr-astro-explore` 가 비어야 정상 |

## 5. 해석 엔진 명세

**형식**: 선례는 `js/core/saju/reading-rich.js`(커밋 e05aa23f7)다. 새 파일 `js/core/astro/natal-reading.js`를 IIFE `root.AstroNatalReading` 로 만든다. 순수 함수로, DOM·전역·`Math.random`·`new Date()` 를 쓰지 않는다. 날짜는 인자로 받는다. e05aa23f7이 건드린 파일 목록이 배선 체크리스트다: `.ignore` 의 public 미러 줄, `index.html` script 1줄(:5319 옆), sync 미러, 테스트.

```
AstroNatalReading.build(chart, { timeKnown, today: 'YYYY-MM-DD', name }) → model
AstroNatalReading.render(model) → HTML 문자열(ko)
model = { cover, portrait, categories[6], planets[10], aspects[], periods, balance, notes }
근거 항목 = { body:'Venus', signIdx:7, house:8, aspect:{ with:'Saturn', type:'square', orb:1.2 }, label:'금성 · 전갈자리 · 8번째 집' }
```

**입력**: `calcAstroSwissChartOrThrow` 반환값. `chart.sun/moon/asc/mc` = `{idx, deg, sign}`, `chart.planets[Name]` = `{sign:{idx,deg,sign}, retro}`(Sun…Pluto), `chart.houses.h1..h12` = 커스프 sign 객체. 형태 정본은 :11584~ AstroEngine과 :11949 Swiss 교체부다. 노드(NorthNode)가 결과에 있는지는 미확인(:33372에 이름표만 있음). 있으면 성장 카테고리에 쓴다.

**요인 사전**
- 지배 행성은 **전통 지배**를 쓴다. 양 화성, 황소 금성, 쌍둥이 수성, 게 달, 사자 태양, 처녀 수성, 천칭 금성, 전갈 화성, 사수 목성, 염소 토성, 물병 토성, 물고기 목성. 이유: 현대 지배(천왕·해왕·명왕)를 쓰면 차트 주인이 세대 행성이 되어 개인차가 사라진다.
- 품위:
  - 본궁 +5, 고양 +4, 손상 −5, 추락 −4
  - 고양: 해–양, 달–황소, 수성–처녀, 금성–물고기, 화성–염소, 목성–게, 토성–천칭
  - 문구는 "자연스럽게 잘 쓰는 힘 / 애써 다듬는 힘"으로 쓴다. "나쁘다"라고 쓰지 않는다.
- 각진 자리: 1·4·7·10번째 집, 또는 ASC·MC·DSC·IC에서 8° 이내면 강조한다.
- 각: 0/60/90/120/180. 오차 허용은 해·달 8°, 개인 행성 6°, 사회·외행성 5°다. 3° 이하는 "정확도 높음"이다. 시간을 알면 ASC·MC도 포함한다.
- 원소·기질 가중: 해·달·ASC 3, 수·금·화 2, 목·토 1, 외행성 0.5. 40% 이상이면 우세, 개인 행성 기준 0이면 빈 원소다.
- 몰림: 해~토성 가운데 3개 이상이 한 별자리 또는 한 집에 있을 때.

**카테고리별 요인** (괄호 = 가중치. 상위 요인 3개를 불릿으로, 1위를 결론으로 쓴다)

| 카테고리 | 요인 |
|---|---|
| 연애 | 금성 별자리·집(3), 달(2), 화성(2), 5번째 집 커스프와 그 주인 위치(2), 7번째 집·DSC와 그 주인(2), 금성·화성의 정확한 각(2) |
| 재물 | 2번째 집 커스프와 그 주인 위치(3), 2번째 집 안 행성(2), 목성(2), 금성(1), 8번째 집(공유 자산 — 투자 판단 대행 금지)(1), 토성(지출 구조)(1) |
| 인간관계 | 11번째 집(2), 7번째 집(2), 수성(대화 방식)(2), 달(정서 교류)(2), ASC(첫인상)(2), 3번째 집(1) |
| 일 | MC 별자리와 그 주인 위치(3), 10번째 집 행성(2), 6번째 집(일상 업무)(2), 토성(숙련·책임)(2), 해의 집(1), 화성(추진)(1) |
| 마음과 회복 | 달 별자리·집·각(3), 4번째 집(2), 12번째 집(2), 6번째 집(몸의 리듬 — 의료 판단 금지)(1), 해왕성(1), 빈 원소 채우기(1) |
| 성장 | 올해 프로펙션 집과 그 주인(3), 현재 피르다리아(2), 토성(2), 목성(2) |

**합성 규칙**
- 결론은 1위 요인을 쓴다. 2위가 반대 결이면 "…하지만 …" 한 문장으로 잇는다. 예: 금성 손상 + 토성 사각 → "깊고 오래가는 사랑을 원하지만, 마음을 여는 데 시간이 걸려요".
- 초상 헤드라인: ASC 원소 ≠ 달 원소면 "겉은 [ASC 구절], 속은 [달 구절]" 대비형으로 쓴다. 같으면 "[해 구절]과 [달 구절]이 한 방향으로 흐르는" 일치형으로 쓴다.
- 중복 방지:
  - 앞 카테고리에서 불릿으로 쓴 요인은 다음 카테고리에서 가중치 ×0.4.
  - 같은 문구 셀은 한 화면에 한 번만 쓴다(`used` Set).
- 바넘 문장 금지: 모든 불릿은 근거 항목 1개 이상에 묶인다. 근거 없는 일반론("누구나 …")은 쓰지 않는다.
- 시간 모름(`timeKnown:false`, 정오 계산 `js/saju-engine.js:5410`):
  - 집·ASC·MC·프로펙션 주장을 모두 뺀다.
  - 달이 그날 별자리를 바꿨으면(00:00과 23:59 계산의 별자리가 다르면) "달은 X자리 또는 Y자리"로 쓴다.

**문구 테이블** (손으로 쓰고, LLM 호출은 없다)

| 테이블 | 수 | 내용 |
|---|---:|---|
| `SIGN_ROLE` | 12×3 = 36 | 겉/의식/속 구절 |
| `SIGN_STYLE` | 12×6 = 72 | 카테고리별 결 구절. 특정성은 여기서 나온다 |
| `HOUSE_ARENA` | 12 | 삶의 무대 |
| `PLANET_ROLE` | 약 25 | 카테고리 안에서 행성이 맡는 일 |
| 각 짝 문구 | 약 20 | 금성–화성, 달–토성, 해–달 등 |
| 장면 | 12 | — |
| 이번 주 행동 | 6×4 = 24 | 카테고리 × 원소 |
| 잘 맞는/조심 | 12×2 | — |

- 합계 약 250개, 1~1.5만 자다. 이 작업의 품질은 대부분 여기서 갈린다.
- 원재료로 다시 쓸 옛 테이블: `PLANET_MEANINGS` :13245, `SIGN_MEANINGS` :13257, `HOUSE_MEANINGS` :13271, `ASPECT_MEANINGS` :13285, `LIFE_FLAVOR` :13466, `LIFE_HOUSE_SCENES` :13581, `LIFE_WEEKLY_ACTION` :13595, `LIFE_ELEMENT_REFILL` :13611. 문장은 새로 쓴다.

**카피 규칙**
- 말투: 무료 결과 본문에 지정된 화자가 없다. 연이 규칙(design-canon §2: 부드러운 존댓말, 호칭 '당신', 답과 근거를 위로보다 먼저)을 해요체로 쓴다. 이름이 있으면 표지에서 한 번만 부른다.
- 문장 길이는 약 60자 이하, 문단은 3문장 이하로 쓴다.
- 금지:
  - 공포 조장
  - 재회·합격·금전·건강에 대한 확정 예언
  - 의료·법률·투자 결정 대행
- 1차 층(표지·성향·카테고리 요약줄과 본문) 금지어. 정규식으로 검사한다:
  - Placidus, Whole Sign, 플라시더스, 홀사인, `\d+H\b`
  - 체감:, 큰 흐름:, 키워드:, 자세히 보기
  - 어스펙트, 오브, orb, 룰러
  - 영어 괄호 병기 `\([A-Z][a-z]+\)`, 겹괄호 `\)\)`
  - 번호 `^\d\)`·`\([a-c]\)`, 해시태그 `#\S`
- 쉬운 말 사전:
  - 하우스 → "N번째 집"(삶의 무대)
  - 상승궁 → 첫인상 별자리
  - MC → 사회에서 보이는 모습
  - 차트 룰러 → 차트의 주인 행성
  - 합 → 한자리에 모임
  - 육분 → 가볍게 돕는 사이
  - 사각 → 부딪히며 키우는 사이
  - 삼분 → 편하게 돕는 사이
  - 대립 → 마주 보며 균형을 찾는 사이
  - 역행 → 안으로 곱씹는 흐름
  - 기질 → 시작형·유지형·적응형
  - 피르다리아 → 인생 시기 지도
  - 프로펙션 → 올해의 주제 집
  - 깊이 읽기 층에서는 원어를 괄호로 한 번 병기해도 된다.

**테스트** (`__tests__/ui/astro-natal-reading.test.mjs`, node:test + vm, 선례 `__tests__/ui/saju-reading-rich.test.mjs`)
- 픽스처: b1–b3 차트 JSON. 브라우저에서 `calcAstroSwissChartOrThrow(...)` 결과를 한 번 덤프한다(Swiss wasm을 node에서 돌릴 수 있는지는 미확인이라 덤프 방식으로 한다).
- 단언:
  - 같은 입력 → 같은 출력
  - b1–b3 결론이 6개 중 5개 이상 서로 다름
  - 근거 label이 픽스처의 별자리·집과 일치(테스트에서 독립 계산)
  - 1차 층 금지어 0
  - 시간 모름이면 집·첫인상·MC 주장 0
  - 한 출생 안에서 같은 문장 반복 0

## 6. 시각 시스템

**컨셉 "밤하늘 관측 기록"**: 에디토리얼 한 칼럼이다(최대 760px = DESIGN 폭 토큰). 우주·별자리·은하수 컨셉은 **표지에만 집중**하고, 본문은 조용한 잉크 바탕 위의 활자와 헤어라인으로 짠다. 다음은 쓰지 않는다:
- 카드 격자, 유리 효과, 발광
- 그라데이션 글자, 옆줄 카드, 보라 그라데이션 타로 클리셰
- 반복되는 "01 / 연애" 같은 눈썹·번호 비계

**토큰**: 간격 `--cd-sp-*`, 반경, 모션, 폭은 DESIGN.md §7을 그대로 쓴다. 색만 `.as-reading` 루트에 `--as-*` 로 새로 선언한다. 새 hex는 토큰 선언에만 둔다. 시작 제안값은 미측정이라 대비를 실측해 확정한다:

| 토큰 | 값 | 용도 |
|---|---|---|
| ink-0 | `#0c0f1c` | — |
| ink-1 | `#12162a` | — |
| text | `#efe9dc` | — |
| text-2 | `#b9b3a6` | — |
| gold | `#d8b77a` | 유일한 강조. 선택 상태·주 CTA·지표 1개에만 |
| rule | `rgba(239,233,220,.14)` | 헤어라인 |
| 원소 4색 | 저채도 | 균형 막대·문양에만. 글자색 금지 |

**폰트** (결정)
- 제목·초상: `'CodeDestinySerifKR','Nanum Myeongjo','AppleMyungjo',serif` 700, **20px 이상에서만**. 작은 크기에서는 700 명조가 무겁다.
- 본문: `CodeDestinyBody` 스택 400/600, `word-break:keep-all`, `text-wrap:pretty`.
- 도수·연도 숫자: `font-variant-numeric:tabular-nums`. Cinzel은 라틴 소문자 라벨에만 아껴 쓴다.
- 새 층에서 'Gowun Batang'·'Noto Sans KR' 이름을 지운다.
- 별자리·행성 기호: OS 기호 폰트마다 모양이 제각각이고, 디자인 훅이 DESIGN.md 밖 폰트 스택을 지적한다. 그래서 **인라인 SVG `<symbol>` 스프라이트 1벌**(선 굵기 통일)을 권장한다. 텍스트 기호를 쓸 때는 VS15(U+FE0E)와 `font-variant-emoji:text`를 함께 쓴다.

**타입 스케일 (390 / ≥768)**

| 역할 | 크기 | 비고 |
|---|---|---|
| 디스플레이 | 30 / 40 | 줄간격 1.3 |
| H2 | 22 / 26 | — |
| H3 | 18 / 20 | — |
| 본문 | 16 | 줄간격 1.75 |
| 보조 | 14 | — |
| 라벨 | 13 | 최소 |

- p·li는 15 이상이다. 데스크톱 본문 줄 길이는 36em 이하다.

**컴포넌트 상태**
- details 요약줄: 기본 / hover / `:focus-visible` (gold 2px, offset 2) / 열림. 표식 회전은 120ms다. 탭 영역은 44px 이상이다.
- 내비 선택 상태는 gold 밑줄이다.
- 모션은 120/220ms만 쓰고 `prefers-reduced-motion`에서 0이다. 반짝임은 쓰지 않는다.
- 인라인 `style=` 0(CSS 변수 `--pos` 류만 허용), 장식 이모지 0.

**그림**: 표지 황도 띠와 카테고리 선화 문양은 결정적 인라인 SVG로, `aria-hidden`, `currentColor`+토큰으로 만든다. 래스터 일러스트는 §13-1.

## 7. 파일 지도

- `js/saju-engine.js`:
  - 렌더러 `renderAstroInsightLegacyNeon` :12664~약 14650. `#astroBodyWrap` innerHTML 조립 → `_astroCounselPolishRestored` :34172 → bFP `astro()` 재배치 순서로 돈다.
  - 새 모듈 호출은 렌더러 안 한 곳에서 한다.
  - 스타일 문자열: `astroNeonCss` :13990, `astroCosmicRestoredStyle` :34111, `astroCounselUiStyle` :34334. 새 층은 여기에 의존하지 않는다.
- `js/core/saju/basicFortunePresentation.js`:
  - copy 배열 5개 로케일 :6–10, labelKeys :14, `fr-profile-notice` :75, `astroArticleLibrary` :334, `astro()` :736–793(nav :759, `collect` :764)
  - 🔴 새 섹션 셀렉터를 `collect` 목록에 넣지 않으면 explore 잔여로 빠진다.
- CSS: 선례 `styles/saju-reading.css`(`index.html:5315` link)를 따라 새 파일 `styles/astro-reading.css`를 둔다. 옛 astro 스킨은 `styles/basic-fortune-library.css:521–704`(`--fr-*`)다.
- 미러: `npm run sync:public`이 `public/` 미러와 7개 셸의 `?v=` 를 만든다. `?v=` 는 손으로 쓰지 않는다(verify:js-module-graph).

## 8. 지켜야 할 계약

- `scripts/verify-basic-fortune-library.mjs`:
  - :175 `#fr-astro-chart` 안 `.astro-wheel-card` 1개, :176 details 밖
  - :177 nav 5개, :178–183 읽을거리
  - :185–189 상담 요소가 존재하고 닫힌 details 밖
  - :152–172 빈 details 0
  - 7폭 넘침 0
  - :497 비ko(en·ja·zh·zh-TW) `.fr-heading`·`.fr-disclosure > summary` 한글 0
  - 시간 모름 ko에서 `.fr-profile-notice` 1개
- `scripts/verify-mobile-detail-render.mjs:58–60` 제목 셀렉터 `.astro-head h2, .astro-hero h2, header h2, header h3`.
- 그 밖: `verify-basic-consultation-entry-ux`, `verify-sukuyo-reading-house`(공용 CSS를 로드), `npm run check:fast`. `verify-basic-fortune-library`는 CI 게이트가 아니라 로컬 결과만 근거가 된다.

## 9. 커밋 순서 (각각 독립 롤백 단위)

1. 모듈 뼈대 + 요인 계산 + 픽스처·테스트(배선 없음)
2. 문구 테이블 + 합성·중복 방지 + 금지어 테스트
3. 배선: script 태그, 렌더러 삽입, bFP collect·nav 라벨 5개 로케일. 옛 블록은 아직 제자리에 둔다.
4. `styles/astro-reading.css` 새 시각 시스템(표지·성향·카테고리)
5. 출생 차트 층: 휠 스킨 + 행성 위치 표
6. 깊이 읽기 재작성 + 옛 블록을 "이전 해석 기록"으로 이동 + 잔여 수거함 비우기
7. 죽은 CSS 정리(deletion-auditor 판정 뒤)
8. origin/main 머지 → sync:public 수렴 → verifier 4종을 하나씩 단독 실행 → check:fast → push → CI 확인

## 10. 성공 기준 (실측으로 판정)

1. 특정성: 새 1차 층의 b1–b3 공통 문장이 그대로 ≤5%, 가림 ≤10%다(지금 reading 31%, planets 47%).
2. 카테고리 결론이 b1–b3에서 6개 중 5개 이상 서로 다르다. 한 출생 안에서 문장 반복 0이다.
3. 근거 정확도는 테스트로 단언한다.
4. 1차 층 금지어 0. 접힘과 펼침 모두 innerText로 검사한다.
5. 글자: 보이는 글자 13px 이상, p·li 15px 이상이다. 제목 계산 폰트 첫 이름이 `CodeDestinySerifKR`이고 실제 텍스트로 `document.fonts.check` 가 true다.
6. 대비는 합성색 기준 본문 4.5 이상, 큰 글자·UI 3 이상이다. 탭 영역 44px 이상이다.
7. b1@390 기본 높이: 목표 ≤12,000px(지금 17,243). 숨겨서 맞추지 않고 실측값 그대로 보고한다.
8. 7폭 넘침 0, pageerror 0, verifier 4종 exit 0, check:fast exit 0.
9. 시간 모름: 안내 1개, 집·첫인상 주장 0.
10. 시각 판정: visual-checker 루브릭(위계·리듬·강조 예산·기호 렌더·이모지 0)과 impeccable critique/audit 뒤 **사용자 라이브 검수**.

## 11. 도구 (`d:/tmp/astro-redesign-tools/`, 레포 밖, 이 작업 끝나면 지움)

| 파일 | 용도 |
|---|---|
| `astro-outline-probe.mjs <W> <out> [--births=] [--width=] [--full]` | 섹션 → 제목 → 글자 수, `--full` 이면 전문 텍스트 |
| `sentence-overlap.cjs <dir> [b1,b2,b3] [--mask]` | 섹션별 공통 문장 비율 |
| `astro-read-probe.mjs <W> <out> [--base] [--shots] [--births=] [--widths=]` | 높이·작은 글자·대비·탭·넘침·이모지/영어 제목. `--base` = origin/main 판 |
| `life-live.mjs <W> [b1\|b2\|b3]` | 사용자 검수용 headed 라이브 창 |
| `life-probe.mjs <W> <out>` | 옛 Life Area 덤프(참고) |
| `baseline-35c751141/` | 기준선 덤프 |

모두 /api를 mock하고, 외부 호스트는 `assets.code-destiny.com` 폰트만 통과시킨다. 출력이 바뀌면(섹션 제목 등) `sentence-overlap.cjs` 의 `SECTIONS` 를 새 nav 라벨로 고친다.

## 12. 함정 (이 작업 고유)

- sync:public은 해시 사슬(CSS→bFP→uiBindings→init→app) 때문에 한 단계씩 전파된다. `git diff | md5sum` 이 같아질 때까지 3~6회 반복한다. 워크트리 머지 직후에도 다시 돈다.
- KST 자정을 넘기면 두 가지가 바뀐다:
  - vbfl baseline의 숙요 daily가 바뀐다 → 마지막 정상 커밋에서 `--baseline`을 다시 잡는다.
  - `verify:sitemap-drift` → `npm run sitemap:generate` 또는 origin/main 머지.
- `verify-basic-consultation-entry-ux`는 tracked `artifacts/`를 덮어쓴다 → 커밋 전 `git checkout -- artifacts/`. verifier는 병렬·체인 실행 시 history.back 타이밍 때문에 헛실패가 난다 → 하나씩 실행한다.
- Bash 도구는 백슬래시를 한 겹 지운다. VS15(U+FE0E) 같은 문자는 Write로 만든 .cjs(`String.fromCharCode`)로 넣는다.
- 셸과 서브에이전트에서 python을 호출하지 않는다. `taskkill /IM`·`Stop-Process -Name`도 금지다. 10-04에 visual-checker가 남의 python 3개를 종료한 사고가 있었다.
- 스크린샷은 메인 세션에서 Read하지 않고 visual-checker로만 판정한다.
- 고정 별 층이 스크롤되는 글자 옆에 오면 밝은 별이 구두점처럼 읽힌다(10-03 실패). 별밭을 쓰면 밝은 별은 760 칼럼 바깥에만 둔다.
- 워크트리 배수 순서:
  1. 정션 `node_modules` 해제
  2. `git worktree remove --force`
  3. "Filename too long"이면 reparse point 0을 확인한 뒤 `cmd /c rd /s /q "\\?\<경로>"` → `git worktree prune`
  4. `git branch -d`
- `.astro-stellar-archive` 게이트 CTA 대비 1.06(그라데이션 오탐 추정)은 범위 밖이다. 보고만 한다.

## 13. 모르는 것 (추측하지 말고 사용자에게 묻기 — 기본값으로 진행하며 함께 묻는다)

1. 표지 래스터 일러스트가 필요한가. Codex `image_gen` 은 Claude 세션에 없고 유료 이미지 API 경로도 없다 → 기본은 SVG만.
2. 나눔명조 400 등 추가 굵기를 R2에 올릴지(외부 행위, 1회 승인 필요) → 기본은 700만, 20px 이상에서만.
3. 새 해석과 완전히 겹치는 옛 블록(Life Area 7카드·현실 조언·차트 전체 요약·한눈에 기질·빅3 스냅샷)을 지울지 → 기본은 "이전 해석 기록" 접힘에 보존(10-03 "삭제 0").

## 14. 롤백

커밋마다 `git revert <sha>`. 미커밋 회귀는 `git reset --hard HEAD`(쓰는 세션이 혼자일 때만). 덧대지 않는다.

## 재개 정보

- 작업 디렉터리: `D:\Development\code-destiny`(남의 미커밋이 있으면 새 워크트리)
- 문서: `D:\Development\code-destiny\docs\handoff\2026-10-04-astro-premium-redesign.md`
- 마지막 커밋: 이 문서를 추가한 커밋(`git log -1 --format=%H -- docs/handoff/2026-10-04-astro-premium-redesign.md`)
- 첫 행동: §0의 1→4(기준선 실측)
