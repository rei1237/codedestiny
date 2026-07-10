# 운세 인사이트 허브 — 저자 직접 투입 가이드 & 통합 맵

> 목적: 운영자가 직접 쓴 전문가 톤 글을 허브에 하나씩 넣어, 현재 자동 템플릿으로 나가는 글을
> 순차 교체한다. AI 자동 재작성은 하지 않는다(품질=운영자 손).

---

## 1. 파이프라인 사용법 (글 한 편 넣는 법)

### 1-1. 렌더 원리 (요약)
- 렌더 진실소스: `app/insights/seed-articles.js`의 `INSIGHT_SEED_ARTICLES` → `[slug]/page.js`가 소비.
- 기본은 `buildMysticSections` **6섹션 자동 템플릿**으로 본문을 덮어씀.
- 예외: 글 객체에 **`useOriginalContent: true`** 가 있으면(또는 `ORIGINAL_CONTENT_SLUGS`에 등록되면)
  손수 쓴 `contentHtml`이 그대로 렌더된다. → 저자 글은 이 플래그만 달면 즉시 반영.

### 1-2. 마크다운 → contentHtml 변환 규칙
| 마크다운 | 변환 |
|---|---|
| 최상단 `## 제목` | `title` 필드로만(본문 미포함) |
| `### 소제목` | `<h2>` |
| 문단 | `<p>` (블록 내 줄바꿈은 공백 흐름) |
| 훅/마무리 시적 줄바꿈 | `<br>` (수작업으로 원하는 곳만) |
| `**강조**` | `<strong>` |
| `- 목록` / 이모지 불릿 | `<ul><li>` (이모지 불릿은 수작업) |
| 마크다운 표 | `<table>` (스타일은 `[slug]/page.js`에 이미 반영) |
| `[이미지: …]` | **제외** |
| 말미 `→ [Code Destiny…]` CTA | **제외** (상세 페이지는 CTA 블록을 렌더하지 않음) |

보조 도구: `node scripts/insight-md-to-html.mjs <파일.md> --slug <slug> --category <카테고리>`
→ 붙여넣을 객체 스텁 출력. 단 시적 `<br>`·이모지 불릿은 출력 후 손으로 다듬는다.

### 1-3. 삽입 절차
1. 원문(md) → 규칙대로 `contentHtml` 변환.
2. **canonical 슬러그**: `app/insights/articles.js`에서 해당 슬러그 객체의 본문을 저자 글로 교체하고
   `useOriginalContent: true` 부여. 신규 슬러그면 객체 추가.
3. **통합 대상(old) 슬러그**: canonical 삽입을 먼저 끝낸 뒤 →
   - old 글 객체의 `category`를 **`"통합 리다이렉트"`** 로 변경(소스는 보존). 이 카테고리는
     articles.js `NON_ESSENTIAL_CATEGORIES`·generate-sitemap.mjs `excludedInsightCategories`·
     seed-articles.js MERGED 필터 3곳에 등록돼 있어 **렌더·사이트맵에서 자동 제외**된다(74줄 객체를 지울 필요 없음).
   - `public/_redirects`에 `/insights/<old>    /insights/<canonical>    301` 추가
     (기존 `/blog/* → /insights/*` 블록 형식). 페이지가 미생성되므로 301이 실제로 적용됨.
   - ⚠️ 기존 `_redirects`가 old 슬러그를 **가리키고** 있으면(예: `/blog/saju-pallja`) canonical로 재지정할 것.
4. 검증: `node scripts/verify-insight-authored.mjs <canonical-slug> [--merged old-a,old-b]`
5. 아래 §4 체크리스트 상태 갱신 → 변경 파일만 커밋.

### 1-4. 품질 기준 (검증기가 확인)
- 렌더 시각 텍스트 **≥ 1,200자** (애드센스 eligible 최소치)
- 본문 첫 1,800자 **지문 중복 금지** (그래서 아래 §2 통합이 중요)
- 템플릿 문구("한눈에 보는 핵심") 부재 = 원본 렌더 확인
- `[이미지` / `→ [Code Destiny` 부재

---

## 2. 중복 통합 맵 (확정 ✅ 2026-07-10)

표기: `canonical ⟵ 병합(리다이렉트)될 슬러그`. 운영자 확정으로 아래 **[확정필요] 표시 포함 전부 통합**한다.
(천간·지지 통합, 병오년 시리즈 통합 포함.) 최종 canonical 작성 목록은 §4.

### 사주 (현 35편)
- `saju-how-to-read-step-by-step-beginner-guide` ⟵ `saju-four-pillars-basics`, `saju-free-guide`, `saju-pallja-basic-principles-complete-guide`
- `manseoryeok-what-is` ⟵ `manseoryeok-reading-for-beginners-no-jargon`
- `five-elements-ohang-complete-guide` ⟵ `five-elements-balance-practical`, `five-elements-balance-guide-for-real-life`, `five-elements-personality-deep-dive`
- `yongshin-finding-method-practical-guide` ⟵ `yongshin-how-to-think`
- `daewoon-sewoon-reading-complete-guide` ⟵ `daewoon-vs-sewoon`
- `ten-gods-beginner-map` ⟵ `ten-gods-career-relationship`, `ten-gods-career-aptitude-fun-guide`
- `iljoo-personality-complete-guide-60-pillars` ⟵ `day-master-personality-guide`, `day-master-survival-winning-strategy` — **통합 완료**
- `cheongan-jiji-complete-explanation` ⟵ `ten-heavenly-stems-practical`, `twelve-earthly-branches-and-seasons` — **통합 완료**
- `byeongo-year-reorder-signals` ⟵ `byeongo-year-wealth-winning-strategy`, `byeongo-year-love-winning-strategy` — **통합 완료**
- `lucky-day-selection-without-superstition` ⟵ `reset-routine-when-luck-feels-stuck` — **통합 완료**(길일 택일 + 리셋 루틴 한 편)
- 삭제(비노출): `monthly-fortune-journal-and-feedback-loop` → `/insights/saju`로 301
- 단독 유지: `singang-sinyak-judgment-complete-guide`, `saju-12-unseong-complete-guide`, `saju-2026-monthly-planning-framework`, `saju-2027-monthly-planning-framework`(신규), `saju-job-change-timing-checklist-2026`, `annual-fortune-reading-checklist-no-fear`, `money-luck-habits-and-saju-finance-rules`

### 자미두수 (현 28편)
- `ziwei-what-is` ⟵ `ziwei-doushu-stars-intro`, `ziwei-doushu-complete-beginner-guide` — **통합 완료**
- `ziwei-minggong` ⟵ `ziwei-minggong-self-analysis-checklist` — **통합 완료**
- `ziwei-chart-guide`, `ziwei-14-main-stars-complete-guide` — **저자 투입 완료**(통합 없음)
- `ziwei-four-transformations-lu-quan-ke-ji-guide` ⟵ `ziwei-sihua`
- `ziwei-compatibility-palace-method` ⟵ `ziwei-love-compatibility`
- 12궁 `ziwei-life-palaces` ⟵ `ziwei-palaces-career-finance-love`, `ziwei-wealth-career` — **통합 완료**(2026-07-10, 재분류: 최초 ziwei-what-is에 잘못 배치됐던 12궁 전체 해석 원고를 이 슬러그로 이전)
- 실천 체크 `ziwei-career-palace-action` / `ziwei-monthly-action-checklist-by-palace` / `ziwei-promotion-signals-practical-guide` **[확정필요: 통합]**
- 개별 주성 시리즈 유지(권장): `ziwei-14-main-stars-complete-guide`, `ziwei-ziwei-star-beginner-guide`, `ziwei-tianfu-star-wealth-and-stability`, `ziwei-tiandong-meaning-and-palaces`, `ziwei-wugok-meaning-and-palaces`, `ziwei-sun-moon-balance`, `ziwei-star-combinations-for-beginners`
- 단독 유지: `ziwei-chart-guide`, `ziwei-star-brightness`, `ziwei-lucun-and-huaji-practical`, `ziwei-decade-and-annual-flow-reading-guide`, `ziwei-vs-saju`
- 재분류: `asia-divination-traditions-deep-guide` → **기타(세계 점술)**

### 숙요점 (현 26편) — 이미 2편 저자 투입 완료
- 완료: `sukuyo-what-is`, `sukuyo-bonmyeongsuk-how-to-find`
- 입문 중복 정리 **[확정필요]**: `sukuyo-what-is` ⟵ `sukuyo-lunar-mansion-primer`, `sukuyo-what-is-27-lunar-mansions`
- 궁합 개요 `sukuyo-compatibility-guide` ⟵ `sukuyo-compatibility-simple-checklist`, `sukuyo-compatibility-rhythm-guide` **[확정필요]**
- 관계 유형 개별 유지: `sukuyo-eishin`, `sukuyo-antai`, `sukuyo-ankai`, `sukuyo-27-mansions`, `sukuyo-bonmyeongsuk-vs-wolmyeongsuk`
- 나머지 실용편 유지: `sukuyo-love`, `sukuyo-marriage`, `sukuyo-vs-saju-compatibility`, `sukuyo-three-group-types-guide`, `sukuyo-love-communication-rules`, `sukuyo-friendship-teamwork-guide`, `sukuyo-day-by-day-rhythm-usage`, `sukuyo-beginner-terms-easy-dictionary`, `sukuyo-qa-most-asked-questions`, `sukuyo-27-guardian-animals-origin-guide`, `sukuyo-conflict-repair-dialogue-templates`, `sukuyo-boundary-setting-practical-guide`, `sukuyo-couple-finance-rhythm-guide`, `relationship-luck-and-communication-rules`

### 타로 (현 21편)
- `tarot-major-arcana-22-complete-meanings` ⟵ `tarot-major-arcana-symbols`, `tarot-major-arcana-0-to-21-with-images`
- `tarot-how-to-read` ⟵ `how-to-ask-better-fortune-questions`, `tarot-love-question-design` **[확정필요]**
- `saju-and-tarot-combined-reading-framework` ⟵ `tarot-vs-saju` **[확정필요]**
- 개별 유지: `tarot-reversed-card-framework`, `tarot-spread-design-principles`, `tarot-minor-arcana-four-suits-practical-guide`, `tarot-court-cards-personality-and-relationship-guide`, `tarot-practical-reading-casebook-by-question`, `tarot-career-reading-7-question-framework`, `tarot-anxiety-safe-reading-method`, `tarot-reunion-reading`, `tarot-partner-mind-reading`, `tarot-compatibility-reading-game`, `today-tarot-routine`
- 재분류: `europe-divination-traditions-deep-guide` → **기타**. 제외 검토: `adsense-ready-content-checklist`(§3)

### 점성술 (현 12편)
- `astrology-houses-what-is` ⟵ `astrology-houses-quick-guide`
- `astrology-birth-chart-guide` ⟵ `sun-moon-rising-difference` **[확정필요]**
- 개별 유지: `astrology-vs-saju-differences`, `astrology-synastry-compatibility-fun-guide`, `astrology-mercury-retrograde-practical-guide`, `new-moon-full-moon-fortune-routine`
- 제외/재분류 검토: `structured-data-for-fortune-sites`, `fortune-content-for-adsense-what-google-likes`(§3), `career-luck-interview-exam-prep-strategy`·`sleep-rhythm-energy-and-luck-connection`(사주/루틴으로 재분류 **[확정필요]**)

### 베다점 (현 11편)
- `vedic-dasha-transit-remedy-practical-guide` ⟵ `vedic-dasha-monthly-action-guide` **[확정필요]**
- 개별 유지: `vedic-what-is`, `vedic-lagna-what-is`, `nakshatra-what-is`, `vedic-astrology-navamsa-basics`, `vedic-astrology-12-rasi-complete-personality-guide`, `vedic-compatibility-synastry-basics`, `vedic-retrograde-planets-practical-decoding`, `vedic-moon-sign-emotion-routine-guide`, `vedic-transit-journal-template-90days`

### 궁합 (현 5편)
- `saju-compatibility-how-to` ⟵ `saju-compatibility-fun-method`, `goonghap-compatibility-basics-complete` **[확정필요]**
- 개별 유지: `byeongo-year-love-winning-strategy`, `ten-gods-practical-map-love-work-money`

### 기타 / 신년 / 오늘 (현 5편)
- 세계 점술 시리즈 유지: `world-strange-divination-guide-including-pig-oracle`, `middle-east-divination-traditions-deep-guide`, `africa-divination-traditions-deep-guide` (+ 재분류 편입 `asia-…`, `europe-…`)
- 단독 유지: `new-year-fortune-framework`(신년), `how-to-raise-luck-daily-routine-practical-guide`(오늘)

---

## 3. 허브 부적합(운영 메타) 글 — 처리 완료 ✅

독자용 운세 콘텐츠가 아니라 SEO/운영 how-to. 4편 모두 `category`를 NON_ESSENTIAL로 바꿔
**렌더·사이트맵에서 제외**(소스는 git에 보존, seed 143 → 139편):
- `adsense-ready-content-checklist` → `운영 체크리스트` (요청대로 유지·비노출)
- `copyright-safe-writing-for-fortune` → `법률/운영`
- `structured-data-for-fortune-sites` → `기술 SEO`
- `fortune-content-for-adsense-what-google-likes` → `콘텐츠 운영`

---

## 4. 저자 백로그 — 작성할 canonical 주제 (통합 후 ~99편, 현재 seed 116편)

운영자가 canonical 글을 공급하는 대로 `[x]`. 각 항목 = `<slug> — 주제 [통합: 흡수될 슬러그]`.
우선순위: 사주 → 자미두수 → 숙요점 재정비 → 타로 → 점성술 → 베다점 → 나머지.
진행(2026-07-10): **사주 18/18 완료** · 자미두수 5/17(명궁·명반·12궁 전체 해석·14주성·자미두수란 완료).

### 완료
- [x] `sukuyo-what-is` — 숙요점이란(달자리로 나를 읽는 법)
- [x] `sukuyo-bonmyeongsuk-how-to-find` — 본명숙 찾는 법

### 사주 (18)
- [x] `saju-how-to-read-step-by-step-beginner-guide` — 사주 입문·보는 법(사주팔자 4기둥 개념→첫 리딩) [통합 완료: saju-four-pillars-basics, saju-free-guide, saju-pallja-basic-principles-complete-guide]
- [x] `manseoryeok-what-is` — 만세력이란/보는 법 [통합 완료: manseoryeok-reading-for-beginners-no-jargon]
- [x] `cheongan-jiji-complete-explanation` — 천간·지지 완전 해설(십천간·십이지) [통합 완료: ten-heavenly-stems-practical, twelve-earthly-branches-and-seasons]
- [x] `iljoo-personality-complete-guide-60-pillars` — 일간·일주 성격(60갑자) [통합 완료: day-master-personality-guide, day-master-survival-winning-strategy]
- [x] `ten-gods-beginner-map` — 십성 입문 지도 [통합 완료: ten-gods-career-relationship, ten-gods-career-aptitude-fun-guide]
- [x] `five-elements-ohang-complete-guide` — 오행 균형·성격 완전 가이드 [통합 완료: five-elements-balance-practical, five-elements-balance-guide-for-real-life, five-elements-personality-deep-dive]
- [x] `yongshin-finding-method-practical-guide` — 용신 찾는 법 [통합 완료: yongshin-how-to-think]
- [x] `singang-sinyak-judgment-complete-guide` — 신강·신약 판단법
- [x] `daewoon-sewoon-reading-complete-guide` — 대운·세운 읽는 법 [통합 완료: daewoon-vs-sewoon]
- [x] `saju-12-unseong-complete-guide` — 십이운성 완전 가이드
- [x] `byeongo-year-reorder-signals` — 2026 병오년 종합 운세(재물·연애 포함) [통합 완료: byeongo-year-wealth-winning-strategy, byeongo-year-love-winning-strategy]
- [x] `saju-2026-monthly-planning-framework` — 2026 월별 계획 프레임(일간별 실행 로드맵)
- [x] `saju-2027-monthly-planning-framework` — 2027 정미년 월별 계획 프레임(신규 추가, 2026-07-10)
- [x] `saju-job-change-timing-checklist-2026` — 이직 타이밍 체크리스트(15단계+점수표)
- [x] `annual-fortune-reading-checklist-no-fear` — 신년운세 두려움 없이 읽기
- [x] `lucky-day-selection-without-superstition` — 길일 택일(미신 없이) + 운이 막혔을 때 리셋 루틴 [통합 완료: reset-routine-when-luck-feels-stuck]
- ~~`monthly-fortune-journal-and-feedback-loop`~~ — 삭제(요청, 2026-07-10) → `/insights/saju`로 301, 소스는 통합 리다이렉트로 비노출
- [x] `money-luck-habits-and-saju-finance-rules` — 재물운 습관·사주 재정 규칙(오행·십성별 재정 스타일 표, 10대 재정 규칙)

### 자미두수 (17, 5편 완료 2026-07-10)
- [x] `ziwei-what-is` — 자미두수란(기존 SEO 원고로 복원. 아래 재분류 참고) [통합 완료: ziwei-doushu-stars-intro, ziwei-doushu-complete-beginner-guide]
- [x] `ziwei-chart-guide` — 명반 보는 법 5단계
- [x] `ziwei-minggong` — 명궁 해석 통합(7단계) [통합 완료: ziwei-minggong-self-analysis-checklist]
- [x] `ziwei-14-main-stars-complete-guide` — 14주성 총론(북두·남두 계열)
- [x] `ziwei-life-palaces` — 12궁 전체 해석(명궁~부모궁 ①~⑫) [통합 완료: ziwei-palaces-career-finance-love, ziwei-wealth-career]

> **재분류 기록(2026-07-10)**: 최초 제출받은 "자미두수(紫微斗數)란? – 12궁 구조를 완벽하게 이해하기" 원고를
> 제목만 보고 `ziwei-what-is`에 넣었으나, 본문이 실제로는 명궁~부모궁 12개 궁 전체를 ①~⑫로 상세 해설하는
> 내용이라 `ziwei-life-palaces`(12궁 전체 해석)의 취지에 정확히 부합함을 확인. 해당 원고를 `ziwei-life-palaces`로
> 이전하고, `ziwei-what-is`는 기존에 있던 개관형 SEO 원고(14주성·12궁 개관·삼방사정·사화·사주와의 차이)로 복원.
- [ ] `ziwei-ziwei-star-beginner-guide` — 자미성
- [ ] `ziwei-tianfu-star-wealth-and-stability` — 천부성
- [ ] `ziwei-tiandong-meaning-and-palaces` — 천동성
- [ ] `ziwei-wugok-meaning-and-palaces` — 무곡성
- [ ] `ziwei-sun-moon-balance` — 태양·태음 균형
- [ ] `ziwei-star-combinations-for-beginners` — 별 조합 입문
- [ ] `ziwei-four-transformations-lu-quan-ke-ji-guide` — 사화(화록·화권·화과·화기) [통합: ziwei-sihua, ziwei-lucun-and-huaji-practical]
- [ ] `ziwei-star-brightness` — 별 밝기(묘·왕·리·평·함)
- [ ] `ziwei-compatibility-palace-method` — 궁합(부처궁) [통합: ziwei-love-compatibility]
- [ ] `ziwei-decade-and-annual-flow-reading-guide` — 대한·유년 흐름
- [ ] `ziwei-career-palace-action` — 궁별 실천 체크(직업·승진) [통합: ziwei-monthly-action-checklist-by-palace, ziwei-promotion-signals-practical-guide]
- [ ] `ziwei-vs-saju` — 자미두수 vs 사주

### 숙요점 (재정비, 완료 2편 제외 22)
- [ ] `sukuyo-what-is` 재정비 [통합: sukuyo-lunar-mansion-primer, sukuyo-what-is-27-lunar-mansions] (기존 완료본에 흡수)
- [ ] `sukuyo-compatibility-guide` — 궁합 총정리 [통합: sukuyo-compatibility-simple-checklist, sukuyo-compatibility-rhythm-guide]
- [ ] `sukuyo-27-mansions` — 27수 전체 해석
- [ ] `sukuyo-eishin` — 영친관계 / `sukuyo-antai` — 업태관계 / `sukuyo-ankai` — 안괴관계
- [ ] `sukuyo-bonmyeongsuk-vs-wolmyeongsuk` — 본명숙 vs 월명숙
- [ ] `sukuyo-love` — 연애 궁합 / `sukuyo-marriage` — 결혼 궁합 / `sukuyo-vs-saju-compatibility` — 숙요 vs 사주 궁합
- [ ] `sukuyo-three-group-types-guide` — 근·중·원 3분류
- [ ] `sukuyo-love-communication-rules` · `sukuyo-friendship-teamwork-guide` · `sukuyo-day-by-day-rhythm-usage`
- [ ] `sukuyo-beginner-terms-easy-dictionary` · `sukuyo-qa-most-asked-questions` · `sukuyo-27-guardian-animals-origin-guide`
- [ ] `sukuyo-conflict-repair-dialogue-templates` · `sukuyo-boundary-setting-practical-guide` · `sukuyo-couple-finance-rhythm-guide` · `relationship-luck-and-communication-rules`

### 타로 (14)
- [ ] `tarot-major-arcana-22-complete-meanings` — 메이저 22장 완전 해설 [통합: tarot-major-arcana-symbols, tarot-major-arcana-0-to-21-with-images]
- [ ] `tarot-how-to-read` — 타로 보는 법·질문 설계 [통합: how-to-ask-better-fortune-questions, tarot-love-question-design]
- [ ] `tarot-reversed-card-framework` — 역방향 프레임
- [ ] `tarot-spread-design-principles` — 스프레드 설계 원칙
- [ ] `tarot-minor-arcana-four-suits-practical-guide` — 마이너 4수트
- [ ] `tarot-court-cards-personality-and-relationship-guide` — 코트 카드
- [ ] `tarot-practical-reading-casebook-by-question` — 질문별 실전 케이스북
- [ ] `tarot-career-reading-7-question-framework` — 직업 리딩 7질문
- [ ] `tarot-anxiety-safe-reading-method` — 불안 안전 리딩
- [ ] `tarot-reunion-reading` — 재회 리딩 / `tarot-partner-mind-reading` — 상대 속마음 / `tarot-compatibility-reading-game` — 궁합 게임
- [ ] `today-tarot-routine` — 오늘의 타로 루틴
- [ ] `saju-and-tarot-combined-reading-framework` — 사주+타로 통합 리딩 [통합: tarot-vs-saju]

### 점성술 (8)
- [ ] `astrology-birth-chart-guide` — 출생차트(태양·달·상승궁) [통합: sun-moon-rising-difference]
- [ ] `astrology-houses-what-is` — 하우스 입문 [통합: astrology-houses-quick-guide]
- [ ] `astrology-vs-saju-differences` — 점성술 vs 사주
- [ ] `astrology-synastry-compatibility-fun-guide` — 시나스트리 궁합
- [ ] `astrology-mercury-retrograde-practical-guide` — 수성 역행 실전
- [ ] `new-moon-full-moon-fortune-routine` — 신월·보름 루틴
- [ ] `career-luck-interview-exam-prep-strategy` — 면접·시험 운 전략
- [ ] `sleep-rhythm-energy-and-luck-connection` — 수면 리듬·운 연결

### 베다점 (10)
- [ ] `vedic-what-is` — 베다 점성술이란 / `vedic-lagna-what-is` — 라그나 / `nakshatra-what-is` — 나크샤트라
- [ ] `vedic-astrology-navamsa-basics` — 나밤샤 / `vedic-astrology-12-rasi-complete-personality-guide` — 12라시
- [ ] `vedic-dasha-transit-remedy-practical-guide` — 다샤·트랜짓·레머디 [통합: vedic-dasha-monthly-action-guide]
- [ ] `vedic-compatibility-synastry-basics` — 궁합 / `vedic-retrograde-planets-practical-decoding` — 역행 행성
- [ ] `vedic-moon-sign-emotion-routine-guide` — 달자리 감정 루틴 / `vedic-transit-journal-template-90days` — 트랜짓 90일 저널

### 궁합 (2) · 기타/신년/오늘 (7)
- [ ] `saju-compatibility-how-to` — 사주 궁합 보는 법 [통합: saju-compatibility-fun-method, goonghap-compatibility-basics-complete]
- [ ] `ten-gods-practical-map-love-work-money` — 십성 실전(연애·일·돈)
- [ ] `world-strange-divination-guide-including-pig-oracle` · `asia-divination-traditions-deep-guide` · `europe-divination-traditions-deep-guide` · `middle-east-divination-traditions-deep-guide` · `africa-divination-traditions-deep-guide` — 세계 점술 시리즈(자미/타로에서 기타로 재분류)
- [ ] `new-year-fortune-framework` — 신년운세 프레임
- [ ] `how-to-raise-luck-daily-routine-practical-guide` — 운 높이는 데일리 루틴

> 실제 리다이렉트·소스 제거는 각 canonical 글을 공급받아 삽입할 때 함께 실행한다(§1-3 절차).
> 그때까지 흡수 대상 old 슬러그는 템플릿으로 정상 노출 유지.
