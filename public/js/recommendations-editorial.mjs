// Reviewed against the authored article, not inferred from its service/category name.
export const EDITORIAL_RECOMMENDATIONS = Object.freeze({
  'sukuyo-eishin': { tags: ['boundaries','self-reflection'], evidence: 'seo-growth-articles: 기꺼이 한 배려와 떠맡은 일 구분, 부탁의 범위와 거절할 여지, 조정할 부탁 기록', reviewedAt: '2026-10-09' },
  'today-tarot-routine': { tags: ['habit-building','journaling','self-reflection'], evidence: 'seo-growth-articles: 루틴 세팅, 3줄 저널링, 주간 회고', reviewedAt: '2026-10-09' },
  'new-year-fortune-framework': { tags: ['journaling','self-reflection'], evidence: 'seo-growth-articles: STEP 3 연말 리뷰 습관 만들기', reviewedAt: '2026-10-09' },
  'tarot-practical-reading-casebook-by-question': { tags: ['journaling','self-reflection'], evidence: 'phase3-editorial-content: 질문·관찰·현실 자료·다음 행동을 구분해서 기록', reviewedAt: '2026-10-09' },
  'ziwei-14-main-stars-complete-guide': { tags: ['ziwei-study'], evidence: 'phase3-editorial-content: 14주성을 공부하는 순서', reviewedAt: '2026-10-09' },
});
export function editorialTopics(slug) {
  return Object.hasOwn(EDITORIAL_RECOMMENDATIONS, slug) ? EDITORIAL_RECOMMENDATIONS[slug].tags : [];
}
