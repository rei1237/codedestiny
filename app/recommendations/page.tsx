import RecommendationBrowse from '@/app/components/recommendations/RecommendationBrowse';
export const metadata = { title: '영냥이의 생활 추천 | 꿀꿀 운세', description: '영냥이의 생활 추천을 준비하고 있어요. 도서·기록, 일상 생활, 반려동물, 취향 수집을 위한 선택 기준을 안내합니다.', robots: { index: false, follow: false } };
export default function Page() { return <RecommendationBrowse/>; }
