// 인사이트 글의 최초 발행일. 글 객체에 publishedAt 이 없는 글만 여기서 채운다.
//
// 왜 따로 두는가: 글 데이터의 updatedAt 은 "본문이 마지막으로 바뀐 날"이라, 그 값만 쓰면
// RSS pubDate 와 datePublished 가 글을 고칠 때마다 움직인다. RSS pubDate·datePublished 는
// 최초 발행일(이 값), 사이트맵 lastmod·dateModified 는 updatedAt 을 쓴다.
//
// 근거: 2026-11-14 에 "git log --reverse -p -- app/insights/" 로 각 슬러그가 저장소에 처음
// 추가된 커밋의 작성일(짧은 SHA 를 옆에 적었다). 배포일이 아니라 커밋일이다.
// 생성기(RSS·사이트맵)는 실행 중에 git 을 조회하지 않는다 — 그래서 값을 데이터로 적어 둔다.
// 새 글은 여기에 추가하지 말고 글 객체에 publishedAt 을 직접 적는다.
export const INSIGHT_FIRST_PUBLISHED = Object.freeze({
  "astrology-synastry-compatibility-fun-guide": "2026-03-20", // d912bd564
  "astrology-vs-saju-differences": "2026-03-20", // d6fe412c0
  "byeongo-year-reorder-signals": "2026-03-20", // d912bd564
  "saju-12-unseong-complete-guide": "2026-03-20", // d912bd564
  "sukuyo-27-guardian-animals-origin-guide": "2026-03-20", // d912bd564
  "sukuyo-beginner-terms-easy-dictionary": "2026-03-20", // d912bd564
  "sukuyo-day-by-day-rhythm-usage": "2026-03-20", // d912bd564
  "sukuyo-friendship-teamwork-guide": "2026-03-20", // d912bd564
  "sukuyo-love-communication-rules": "2026-03-20", // d912bd564
  "sukuyo-qa-most-asked-questions": "2026-03-20", // d912bd564
  "sukuyo-three-group-types-guide": "2026-03-20", // d912bd564
  "tarot-compatibility-reading-game": "2026-03-20", // d912bd564
  "tarot-reversed-card-framework": "2026-03-20", // d6fe412c0
  "tarot-spread-design-principles": "2026-03-20", // d6fe412c0
  "ten-gods-beginner-map": "2026-03-20", // d6fe412c0
  "vedic-astrology-navamsa-basics": "2026-03-20", // d6fe412c0
  "vedic-compatibility-synastry-basics": "2026-03-20", // d912bd564
  "ziwei-14-main-stars-complete-guide": "2026-03-20", // d912bd564
  "ziwei-compatibility-palace-method": "2026-03-20", // d912bd564
  "ziwei-star-combinations-for-beginners": "2026-03-20", // d912bd564
  "ziwei-sun-moon-balance": "2026-03-20", // d912bd564
  "ziwei-tiandong-meaning-and-palaces": "2026-03-20", // d912bd564
  "ziwei-tianfu-star-wealth-and-stability": "2026-03-20", // d912bd564
  "ziwei-wugok-meaning-and-palaces": "2026-03-20", // d912bd564
  "ziwei-ziwei-star-beginner-guide": "2026-03-20", // d912bd564
  "africa-divination-traditions-deep-guide": "2026-03-25", // a0e7441ea
  "asia-divination-traditions-deep-guide": "2026-03-25", // a0e7441ea
  "europe-divination-traditions-deep-guide": "2026-03-25", // a0e7441ea
  "middle-east-divination-traditions-deep-guide": "2026-03-25", // a0e7441ea
  "tarot-court-cards-personality-and-relationship-guide": "2026-03-25", // a0e7441ea
  "tarot-minor-arcana-four-suits-practical-guide": "2026-03-25", // a0e7441ea
  "tarot-practical-reading-casebook-by-question": "2026-03-25", // a0e7441ea
  "vedic-dasha-transit-remedy-practical-guide": "2026-03-25", // a0e7441ea
  "world-strange-divination-guide-including-pig-oracle": "2026-03-25", // a0e7441ea
  "ziwei-decade-and-annual-flow-reading-guide": "2026-03-25", // a0e7441ea
  "ziwei-four-transformations-lu-quan-ke-ji-guide": "2026-03-25", // a0e7441ea
  "astrology-mercury-retrograde-practical-guide": "2026-03-29", // 7e91f5f45
  "new-moon-full-moon-fortune-routine": "2026-03-29", // 7e91f5f45
  "saju-2026-monthly-planning-framework": "2026-03-29", // 7e91f5f45
  "saju-job-change-timing-checklist-2026": "2026-03-29", // 3c3844a10
  "sukuyo-boundary-setting-practical-guide": "2026-03-29", // 3c3844a10
  "sukuyo-conflict-repair-dialogue-templates": "2026-03-29", // 3c3844a10
  "sukuyo-couple-finance-rhythm-guide": "2026-03-29", // 3c3844a10
  "tarot-anxiety-safe-reading-method": "2026-03-29", // 3c3844a10
  "tarot-career-reading-7-question-framework": "2026-03-29", // 7e91f5f45
  "vedic-moon-sign-emotion-routine-guide": "2026-03-29", // 3c3844a10
  "vedic-retrograde-planets-practical-decoding": "2026-03-29", // 3c3844a10
  "vedic-transit-journal-template-90days": "2026-03-29", // 3c3844a10
  "annual-fortune-reading-checklist-no-fear": "2026-04-03", // 93f32a13e
  "career-luck-interview-exam-prep-strategy": "2026-04-03", // 93f32a13e
  "how-to-raise-luck-daily-routine-practical-guide": "2026-04-03", // 93f32a13e
  "lucky-day-selection-without-superstition": "2026-04-03", // 93f32a13e
  "money-luck-habits-and-saju-finance-rules": "2026-04-03", // 93f32a13e
  "relationship-luck-and-communication-rules": "2026-04-03", // 93f32a13e
  "saju-and-tarot-combined-reading-framework": "2026-04-03", // 93f32a13e
  "saju-how-to-read-step-by-step-beginner-guide": "2026-04-03", // 93f32a13e
  "sleep-rhythm-energy-and-luck-connection": "2026-04-03", // 93f32a13e
  "ten-gods-practical-map-love-work-money": "2026-04-03", // 93f32a13e
  "cheongan-jiji-complete-explanation": "2026-04-05", // d5256771a
  "five-elements-ohang-complete-guide": "2026-04-05", // d5256771a
  "iljoo-personality-complete-guide-60-pillars": "2026-04-05", // d5256771a
  "singang-sinyak-judgment-complete-guide": "2026-04-05", // d5256771a
  "tarot-major-arcana-22-complete-meanings": "2026-04-05", // d5256771a
  "vedic-astrology-12-rasi-complete-personality-guide": "2026-04-05", // 776ec1c06
  "yongshin-finding-method-practical-guide": "2026-04-05", // d5256771a
  "astrology-birth-chart-guide": "2026-05-10", // bbabdd388
  "astrology-houses-what-is": "2026-05-10", // bbabdd388
  "manseoryeok-what-is": "2026-05-10", // bbabdd388
  "nakshatra-what-is": "2026-05-10", // bbabdd388
  "new-year-fortune-framework": "2026-05-10", // bbabdd388
  "saju-compatibility-how-to": "2026-05-10", // bbabdd388
  "sukuyo-27-mansions": "2026-05-10", // bbabdd388
  "sukuyo-ankai": "2026-05-10", // bbabdd388
  "sukuyo-antai": "2026-05-10", // bbabdd388
  "sukuyo-bonmyeongsuk-vs-wolmyeongsuk": "2026-05-10", // bbabdd388
  "sukuyo-compatibility-guide": "2026-05-10", // bbabdd388
  "sukuyo-eishin": "2026-05-10", // bbabdd388
  "sukuyo-love": "2026-05-10", // bbabdd388
  "sukuyo-marriage": "2026-05-10", // bbabdd388
  "sukuyo-vs-saju-compatibility": "2026-05-10", // bbabdd388
  "sukuyo-what-is": "2026-05-10", // bbabdd388
  "tarot-how-to-read": "2026-05-10", // bbabdd388
  "tarot-partner-mind-reading": "2026-05-10", // bbabdd388
  "tarot-reunion-reading": "2026-05-10", // bbabdd388
  "today-tarot-routine": "2026-05-10", // bbabdd388
  "vedic-lagna-what-is": "2026-05-10", // bbabdd388
  "vedic-what-is": "2026-05-10", // bbabdd388
  "ziwei-career-palace-action": "2026-05-10", // bbabdd388
  "ziwei-chart-guide": "2026-05-10", // bbabdd388
  "ziwei-life-palaces": "2026-05-10", // bbabdd388
  "ziwei-minggong": "2026-05-10", // bbabdd388
  "ziwei-star-brightness": "2026-05-10", // bbabdd388
  "ziwei-vs-saju": "2026-05-10", // bbabdd388
  "ziwei-what-is": "2026-05-10", // bbabdd388
  "saju-2027-monthly-planning-framework": "2026-07-10", // dd2a7efbd
  "sukuyo-bonmyeongsuk-how-to-find": "2026-07-10", // dd2a7efbd
  "sukuyo-myeongseong": "2026-07-10", // 6a18d267b
  "sukuyo-useo": "2026-07-10", // 6a18d267b
  "sukuyo-wiseong": "2026-07-10", // 6a18d267b
  "famous-saju-day-master-reading-practice": "2026-08-24", // b507b59da
  "saju-without-birth-time-three-pillars-guide": "2026-08-24", // b507b59da
  "ziwei-jumen-star-speech-and-doubt": "2026-08-24", // b507b59da
  "ziwei-lianzhen-star-principle-and-passion": "2026-08-24", // b507b59da
  "ziwei-pojun-star-change-and-rebuild": "2026-08-24", // b507b59da
  "ziwei-qisha-star-decision-and-frontier": "2026-08-24", // b507b59da
  "ziwei-tanlang-star-desire-and-talent": "2026-08-24", // b507b59da
  "ziwei-tianji-star-strategy-and-change": "2026-08-24", // b507b59da
  "ziwei-tianliang-star-guardian-and-principle": "2026-08-24", // b507b59da
  "ziwei-tianxiang-star-coordination-and-trust": "2026-08-24", // b507b59da
});
