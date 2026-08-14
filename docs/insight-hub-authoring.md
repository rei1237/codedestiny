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
     🔴 **대상 URL 은 후행 슬래시까지 적을 것** — 빼면 301 뒤에 308(`/insights/<slug>/` 정규화)이
     한 번 더 붙어 홉이 2배가 된다. Pages 는 `_redirects` 를 정적 파일보다 **먼저** 본다(실측:
     파일이 있는 `/blog/daewoon-sewoon` 이 301 로 나갔다). 즉 규칙만 넣어도 페이지는 가려진다.
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
- `ziwei-four-transformations-lu-quan-ke-ji-guide` ⟵ `ziwei-sihua`, `ziwei-lucun-and-huaji-practical` — **통합 완료**
- `ziwei-compatibility-palace-method` ⟵ `ziwei-love-compatibility` — **통합 완료**
- 12궁 `ziwei-life-palaces` ⟵ `ziwei-palaces-career-finance-love`, `ziwei-wealth-career` — **통합 완료**(2026-07-10, 재분류: 최초 ziwei-what-is에 잘못 배치됐던 12궁 전체 해석 원고를 이 슬러그로 이전)
- 실천 체크 `ziwei-career-palace-action` ⟵ `ziwei-monthly-action-checklist-by-palace`, `ziwei-promotion-signals-practical-guide` — **통합 완료**
- 개별 주성 시리즈 유지(권장): `ziwei-14-main-stars-complete-guide`, `ziwei-ziwei-star-beginner-guide`, `ziwei-tianfu-star-wealth-and-stability`, `ziwei-tiandong-meaning-and-palaces`, `ziwei-wugok-meaning-and-palaces`, `ziwei-sun-moon-balance`, `ziwei-star-combinations-for-beginners`
- 단독 유지: `ziwei-chart-guide`, `ziwei-star-brightness`, `ziwei-decade-and-annual-flow-reading-guide`, `ziwei-vs-saju`
- 재분류: `asia-divination-traditions-deep-guide` → **기타(세계 점술)**

### 숙요점 (현 26편) — 이미 2편 저자 투입 완료
- 완료: `sukuyo-what-is`, `sukuyo-bonmyeongsuk-how-to-find`
- 입문 중복 정리 **[확정필요]**: `sukuyo-what-is` ⟵ `sukuyo-lunar-mansion-primer`, `sukuyo-what-is-27-lunar-mansions`
- 궁합 개요 `sukuyo-compatibility-guide` ⟵ `sukuyo-compatibility-simple-checklist`, `sukuyo-compatibility-rhythm-guide` [통합 완료 2026-08-14]
- 관계 유형 개별 유지: `sukuyo-eishin`, `sukuyo-antai`, `sukuyo-ankai`, `sukuyo-27-mansions`, `sukuyo-bonmyeongsuk-vs-wolmyeongsuk`
- 나머지 실용편 유지: `sukuyo-love`, `sukuyo-marriage`, `sukuyo-vs-saju-compatibility`, `sukuyo-three-group-types-guide`, `sukuyo-love-communication-rules`, `sukuyo-friendship-teamwork-guide`, `sukuyo-day-by-day-rhythm-usage`, `sukuyo-beginner-terms-easy-dictionary`, `sukuyo-qa-most-asked-questions`, `sukuyo-27-guardian-animals-origin-guide`, `sukuyo-conflict-repair-dialogue-templates`, `sukuyo-boundary-setting-practical-guide`, `sukuyo-couple-finance-rhythm-guide`, `relationship-luck-and-communication-rules`

### 타로 (14/14 완료 — 통합 맵 확정·실행 완료 2026-07-11)
- `tarot-major-arcana-22-complete-meanings` ⟵ `tarot-major-arcana-symbols`, `tarot-major-arcana-0-to-21-with-images` [완료]
- `tarot-how-to-read` ⟵ `tarot-love-question-design`, `how-to-ask-better-fortune-questions` [둘 다 통합 완료. 🔴 이 줄은 오래 틀려 있었다 — `how-to-ask-better-fortune-questions` 는 `app/insights/adsense-ready-articles.js` 에 실재했고 사이트맵에도 올라가 있었다. "존재하지 않는다"는 메모 때문에 마지막 템플릿 조립물로 남아 2026-08-14 까지 색인됐다]
- `saju-and-tarot-combined-reading-framework` ⟵ `tarot-vs-saju` [완료]
- 개별 유지(전부 저자/AI 원고 완료): `tarot-reversed-card-framework`, `tarot-spread-design-principles`, `tarot-minor-arcana-four-suits-practical-guide`, `tarot-court-cards-personality-and-relationship-guide`, `tarot-practical-reading-casebook-by-question`, `tarot-career-reading-7-question-framework`, `tarot-anxiety-safe-reading-method`, `tarot-reunion-reading`, `tarot-partner-mind-reading`, `tarot-compatibility-reading-game`, `today-tarot-routine`
- 재분류: `europe-divination-traditions-deep-guide` → **기타**. 제외 검토: `adsense-ready-content-checklist`(§3)

### 점성술 (8/8 완료 — 통합 맵 확정·실행 완료 2026-07-11)
- `astrology-houses-what-is` ⟵ `astrology-houses-quick-guide` [완료]
- `astrology-birth-chart-guide` ⟵ `sun-moon-rising-difference` [완료]
- 개별 유지(전부 AI 저술 완료): `astrology-vs-saju-differences`, `astrology-synastry-compatibility-fun-guide`, `astrology-mercury-retrograde-practical-guide`, `new-moon-full-moon-fortune-routine`, `career-luck-interview-exam-prep-strategy`, `sleep-rhythm-energy-and-luck-connection`
- 제외/재분류 검토: `structured-data-for-fortune-sites`, `fortune-content-for-adsense-what-google-likes`(§3)

### 베다점 (10/10 완료 — 통합 맵 확정·실행 완료 2026-07-11)
- `vedic-dasha-transit-remedy-practical-guide` ⟵ `vedic-dasha-monthly-action-guide` [완료]
- 개별 유지(전부 AI 저술 완료): `vedic-what-is`, `vedic-lagna-what-is`, `nakshatra-what-is`, `vedic-astrology-navamsa-basics`, `vedic-astrology-12-rasi-complete-personality-guide`, `vedic-compatibility-synastry-basics`, `vedic-retrograde-planets-practical-decoding`, `vedic-moon-sign-emotion-routine-guide`, `vedic-transit-journal-template-90days`

### 궁합 (9/9 완료 — 통합 맵 확정·실행 완료 2026-07-11)
- `saju-compatibility-how-to` ⟵ `saju-compatibility-fun-method`, `goonghap-compatibility-basics-complete` [완료]
- 개별 유지(AI 저술 완료): `ten-gods-practical-map-love-work-money`

### 기타 / 신년 / 오늘 (AI 저술 완료 2026-07-11)
- 세계 점술 시리즈(전부 완료): `world-strange-divination-guide-including-pig-oracle`, `asia-divination-traditions-deep-guide`, `europe-divination-traditions-deep-guide`, `middle-east-divination-traditions-deep-guide`, `africa-divination-traditions-deep-guide`
- 단독 유지(완료): `new-year-fortune-framework`(신년), `how-to-raise-luck-daily-routine-practical-guide`(오늘)

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
진행(2026-07-10): **사주 18/18 완료** · **자미두수 17/17 완료**.

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

### 자미두수 (17, 17편 완료 2026-07-10)
- [x] `ziwei-what-is` — 자미두수란(기존 SEO 원고로 복원. 아래 재분류 참고) [통합 완료: ziwei-doushu-stars-intro, ziwei-doushu-complete-beginner-guide]
- [x] `ziwei-chart-guide` — 명반 보는 법 5단계
- [x] `ziwei-minggong` — 명궁 해석 통합(7단계) [통합 완료: ziwei-minggong-self-analysis-checklist]
- [x] `ziwei-14-main-stars-complete-guide` — 14주성 총론(북두·남두 계열)
- [x] `ziwei-life-palaces` — 12궁 전체 해석(명궁~부모궁 ①~⑫) [통합 완료: ziwei-palaces-career-finance-love, ziwei-wealth-career]

> **재분류 기록(2026-07-10)**: 최초 제출받은 "자미두수(紫微斗數)란? – 12궁 구조를 완벽하게 이해하기" 원고를
> 제목만 보고 `ziwei-what-is`에 넣었으나, 본문이 실제로는 명궁~부모궁 12개 궁 전체를 ①~⑫로 상세 해설하는
> 내용이라 `ziwei-life-palaces`(12궁 전체 해석)의 취지에 정확히 부합함을 확인. 해당 원고를 `ziwei-life-palaces`로
> 이전하고, `ziwei-what-is`는 기존에 있던 개관형 SEO 원고(14주성·12궁 개관·삼방사정·사화·사주와의 차이)로 복원.
- [x] `ziwei-ziwei-star-beginner-guide` — 자미성(기본의미·성격·장단점·재물운·직업운·조합·궁위·개운법 20장)
- [x] `ziwei-tianfu-star-wealth-and-stability` — 천부성(재물창고·안정과 신뢰·직업운·조합·궁위·개운법 21장)
- [x] `ziwei-tiandong-meaning-and-palaces` — 천동성(복덕·행복·온화함·직업운·조합·궁위·개운법 21장)
- [x] `ziwei-wugok-meaning-and-palaces` — 무곡성(재성·결단력·실행력·직업운·조합·궁위·개운법 21장)
- [x] `ziwei-sun-moon-balance` — 태양·태음 균형
- [x] `ziwei-star-combinations-for-beginners` — 별 조합 입문
- [x] `ziwei-four-transformations-lu-quan-ke-ji-guide` — 사화(화록·화권·화과·화기) [통합 완료: ziwei-sihua, ziwei-lucun-and-huaji-practical]
- [x] `ziwei-star-brightness` — 별 밝기(묘·왕·리·평·함)
- [x] `ziwei-compatibility-palace-method` — 궁합(부처궁) [통합 완료: ziwei-love-compatibility]
- [x] `ziwei-decade-and-annual-flow-reading-guide` — 대한·유년 흐름
- [x] `ziwei-career-palace-action` — 궁별 실천 체크(직업·승진) [통합 완료: ziwei-monthly-action-checklist-by-palace, ziwei-promotion-signals-practical-guide]
- [x] `ziwei-vs-saju` — 자미두수 vs 사주

### 숙요점 (재정비, 완료 2편 제외 21 + 확장분 4, 22편 전체 완료 2026-07-10)
- [x] `sukuyo-what-is` 재정비 [통합 완료: sukuyo-lunar-mansion-primer, sukuyo-what-is-27-lunar-mansions]
- [x] `sukuyo-compatibility-guide` — 궁합 총정리(6유형 개관, "우쇠"로 용어 통일) [통합 완료 2026-08-14: sukuyo-compatibility-simple-checklist, sukuyo-compatibility-rhythm-guide]
- [x] `sukuyo-27-mansions` — 27수 전체 해석
- [x] `sukuyo-eishin` — 영친관계 / [x] `sukuyo-antai` — 업태관계 / [x] `sukuyo-ankai` — 안괴관계
- [x] `sukuyo-bonmyeongsuk-vs-wolmyeongsuk` — 본명숙 vs 월명숙
- [x] `sukuyo-love` — 연애 궁합 / [x] `sukuyo-marriage` — 결혼 궁합
  (기존 SEO 원고를 폐기하고 6유형 완전 가이드와 같은 톤·구조로 재작성 — 유형별 절을 "연애/결혼에서의
  모습"으로 재구성해 6편 원문과 지문 중복 없이 새로 서술, `ORIGINAL_CONTENT_SLUGS`로 전환)
- [x] `sukuyo-vs-saju-compatibility` — 숙요 vs 사주 궁합(범위 확장: 숙요점·사주 전반 비교)
- [x] `sukuyo-three-group-types-guide` — 근·중·원 3분류
- [x] `sukuyo-love-communication-rules` · [x] `sukuyo-friendship-teamwork-guide` · [x] `sukuyo-day-by-day-rhythm-usage`
  ("제8편 실천가이드" 원고 — sukuyo-love/marriage와 제목 불일치 확인 후 섹션별로 재분류하여 삽입)
- [x] `sukuyo-beginner-terms-easy-dictionary` · [x] `sukuyo-qa-most-asked-questions` · [x] `sukuyo-27-guardian-animals-origin-guide`
  (원전엔 동물 배정 근거 없음을 명시 + 한국식 상징표(각숙=늑대 등, 비표준 caveat 포함) + 기존 나크샤트라
  요니 체계를 "원전에 실제 있는 유일한 동물 배정"으로 구분해 병기)
- [x] `sukuyo-conflict-repair-dialogue-templates` · [x] `sukuyo-boundary-setting-practical-guide` · [x] `sukuyo-couple-finance-rhythm-guide` · [x] `relationship-luck-and-communication-rules`

**확장분(2026-07-10, 사용자가 6유형 관계론으로 확장 집필)** — 기존 영친·업태·안괴 3유형에 이어
사이트의 6유형 궁합 프레임(`sukuyo-compatibility-guide`: 명·영친·우쇠·안괴·위성·업태)을 완성하는 나머지 유형:
- [x] `sukuyo-myeongseong` — 명성관계(命成關係, 신규 슬러그)
- [x] `sukuyo-wiseong` — 위성관계(危成關係, 신규 슬러그 — 기존 프레임의 "위성"이 처음으로 전용 페이지를 가짐)
- [x] `sukuyo-useo` — 우쇠관계(友衰關係, 신규 슬러그) — 사용자가 "성쇠(成衰)"로 표기해 보낸 원고를
  전부 "우쇠(友衰)"로 정정해 삽입. 16~20번 섹션 일부가 메시지 길이 제한으로 누락되어, 이후 도착한
  "심화편"(21~30+최종결론)과 중복되는 주제를 병합·재구성해 20개 섹션으로 완성(내용 손실 없음, 번호만 재부여).

### 타로 (14/14 완료 2026-07-11)
- [x] `tarot-major-arcana-22-complete-meanings` — 메이저 22장 완전 해설 [통합 완료: tarot-major-arcana-symbols, tarot-major-arcana-0-to-21-with-images]
- [x] `tarot-how-to-read` — 타로 보는 법·질문 설계 [통합 완료: tarot-love-question-design, how-to-ask-better-fortune-questions(2026-08-14)]
- [x] `tarot-reversed-card-framework` — 역방향 프레임
- [x] `tarot-spread-design-principles` — 스프레드 설계 원칙
- [x] `tarot-minor-arcana-four-suits-practical-guide` — 마이너 4수트
- [x] `tarot-court-cards-personality-and-relationship-guide` — 코트 카드
- [x] `tarot-practical-reading-casebook-by-question` — 질문별 실전 케이스북
- [x] `tarot-career-reading-7-question-framework` — 직업 리딩 7질문
- [x] `tarot-anxiety-safe-reading-method` — 불안 안전 리딩
- [x] `tarot-reunion-reading` — 재회 리딩 / `tarot-partner-mind-reading` — 상대 속마음 / `tarot-compatibility-reading-game` — 궁합 게임
- [x] `today-tarot-routine` — 오늘의 타로 루틴
- [x] `saju-and-tarot-combined-reading-framework` — 사주+타로 통합 리딩 [통합 완료: tarot-vs-saju]

**2026-07-11 배치**: 사용자가 "각 분야 최고의 운세 전문가로서" 39편(타로12·점성술8·베다점10·궁합기타9) 전체를
AI가 직접 저술해 달라고 명시적으로 요청(기존 "저자 직접 투입" 원칙의 예외). 타로 12편은 Agent 도구
병렬 디스패치로 초안 작성 후 삽입·검증 완료. 나머지 3개 카테고리(점성술·베다점·궁합기타)도 동일 방식으로
자동 연속 진행 중.

### 점성술 (8/8 완료 2026-07-11)
- [x] `astrology-birth-chart-guide` — 출생차트(태양·달·상승궁) [통합 완료: sun-moon-rising-difference]
- [x] `astrology-houses-what-is` — 하우스 입문 [통합 완료: astrology-houses-quick-guide]
- [x] `astrology-vs-saju-differences` — 점성술 vs 사주
- [x] `astrology-synastry-compatibility-fun-guide` — 시나스트리 궁합
- [x] `astrology-mercury-retrograde-practical-guide` — 수성 역행 실전
- [x] `new-moon-full-moon-fortune-routine` — 신월·보름 루틴
- [x] `career-luck-interview-exam-prep-strategy` — 면접·시험 운 전략
- [x] `sleep-rhythm-energy-and-luck-connection` — 수면 리듬·운 연결

### 베다점 (10/10 완료 2026-07-11)
- [x] `vedic-what-is` — 베다 점성술이란 / `vedic-lagna-what-is` — 라그나 / `nakshatra-what-is` — 나크샤트라
- [x] `vedic-astrology-navamsa-basics` — 나밤샤 / `vedic-astrology-12-rasi-complete-personality-guide` — 12라시
- [x] `vedic-dasha-transit-remedy-practical-guide` — 다샤·트랜짓·레머디 [통합 완료: vedic-dasha-monthly-action-guide]
- [x] `vedic-compatibility-synastry-basics` — 궁합 / `vedic-retrograde-planets-practical-decoding` — 역행 행성
- [x] `vedic-moon-sign-emotion-routine-guide` — 달자리 감정 루틴 / `vedic-transit-journal-template-90days` — 트랜짓 90일 저널

### 궁합 (2) · 기타/신년/오늘 (7) — 9/9 완료 2026-07-11
- [x] `saju-compatibility-how-to` — 사주 궁합 보는 법 [통합 완료: saju-compatibility-fun-method, goonghap-compatibility-basics-complete]
- [x] `ten-gods-practical-map-love-work-money` — 십성 실전(연애·일·돈)
- [x] `world-strange-divination-guide-including-pig-oracle` · `asia-divination-traditions-deep-guide` · `europe-divination-traditions-deep-guide` · `middle-east-divination-traditions-deep-guide` · `africa-divination-traditions-deep-guide` — 세계 점술 시리즈(자미/타로에서 기타로 재분류)
- [x] `new-year-fortune-framework` — 신년운세 프레임
- [x] `how-to-raise-luck-daily-routine-practical-guide` — 운 높이는 데일리 루틴

**2026-07-11 배치 완료**: 타로12·점성술8·베다점10·궁합기타9 총 39편 AI 저술 배치가 모두 완료되었습니다.
사용자가 "각 분야 최고의 운세 전문가로서" 요청한 예외적 AI 자동 저술로, Agent 도구 병렬 디스패치로
카테고리별 초안을 작성하고 삽입·검증·리다이렉트·커밋을 순차 진행했습니다.

> 실제 리다이렉트·소스 제거는 각 canonical 글을 공급받아 삽입할 때 함께 실행한다(§1-3 절차).
> 그때까지 흡수 대상 old 슬러그는 템플릿으로 정상 노출 유지.

---

## 5. 색인 정책 (2026-08-14)

`buildMysticSections` 로 조립되는 글은 **검색 색인 대상이 아니다.** 3개 문안을 슬러그 해시로
골라 6섹션을 찍어내는 구조라, 1,800자 지문 검사는 어휘 주입 때문에 통과하지만 Google 의
scaled content abuse 기준에서는 대량 자동생성물이다. `/editorial-policy` 도 "얇은 자동 생성
문서, 문장만 바꾼 중복 페이지는 게시 기준에 맞지 않습니다" 라고 스스로 밝히고 있다.

**남은 조립물은 0편이다**(2026-08-14 기준, 아티클 106편 중 103편이 저자 원고였고 마지막 3편을
§2 절차로 통합했다). 앞으로 조립물이 다시 생기면 두 갈래 중 하나로 처리한다.

1. **정본이 있으면 통합** — §1-3 절차(`category: "통합 리다이렉트"` + `_redirects` 301).
   링크 자산이 정본으로 모이므로 이쪽이 낫다.
2. **정본이 없으면** 저자 원고로 교체할 때까지 색인에서 뺀다.

### 구 `/blog` 은퇴 (2026-08-14) — 되살리지 말 것

`public/blog/*.html` 손글 10편 + 인덱스를 삭제하고 전부 `/insights` 정본으로 301 했다.
`blog-style.css` 만 남겼다 — `/famous` 가 그 스타일시트를 쓴다.

되살리자는 제안이 나오면 아래 실측을 먼저 다시 확인할 것(2026-08-14 측정):

- 10편 **전부** 대응하는 `/insights` 저자 원고가 있고, 조립물 마커(§5) 는 **0편**이다.
- 렌더 텍스트 분량은 **9/10 에서 `/insights` 쪽이 더 길다**(예: 타로 대아르카나 7,559 vs 15,372자).
  `/blog` 가 더 긴 건 사주 기초 1편(7,742 vs 6,888)뿐이다. HTML 파일 크기(31KB)는 인라인 스타일이
  대부분이라 분량 근거가 못 된다.
- `/blog` 는 `_headers` 의 noindex 로 원래부터 색인 밖이었고, **색인 페이지發 인바운드 링크가 0**이었다
  (유일한 링크원 `/famous` 자체가 noindex. 검색 범위: `dist/**/*.html`).

즉 색인을 풀면 얻는 것은 없고 정본 10편과 서로 순위를 갉아먹는다.

### 조립물이 남아 있는지 확인하는 법

빌드 산출물에서 템플릿 헤딩 3종이 모두 있는 글을 센다. 소스 스캔은
`ORIGINAL_CONTENT_SLUGS` 만 보고 오판하기 쉽다 — 판정 관문은 **둘**이다
(`seed-articles.js:859`: `ORIGINAL_CONTENT_SLUGS.has(slug) || article?.useOriginalContent === true`).
2026-08-13 감사에서 앞쪽 관문만 보고 "33편만 저자 원고" 로 잘못 셌던 적이 있다.

```bash
node -e '
const fs=require("fs"),path=require("path");
const M=["한눈에 보는 핵심","처음엔 이 순서로 읽어보세요","많이 헷갈리는 포인트"];
for (const e of fs.readdirSync("dist/insights",{withFileTypes:true})) {
  if (!e.isDirectory()) continue;
  const f=path.join("dist/insights",e.name,"index.html");
  if (!fs.existsSync(f)) continue;
  const h=fs.readFileSync(f,"utf8");
  if (M.every(m=>h.includes(m))) console.log("template:", e.name);
}'
```
