import RecommendationBrowse from '@/app/components/recommendations/RecommendationBrowse';
export const metadata = { title: '생활 추천', description: '운세를 읽은 뒤 일상에 이어갈 작은 선택을 모았어요. 도서·기록, 일상 생활, 반려동물, 취향 수집 추천과 고르는 기준을 안내해요.', robots: { index: false, follow: false } };
export default function Page() { return <RecommendationBrowse/>; }
