import RecommendationBrowse from '@/app/components/recommendations/RecommendationBrowse';
import { CATEGORIES } from '@/js/recommendations-core.mjs';
export const metadata = { title: '생활 추천', description: '생활 추천을 준비하고 있어요. 도서·기록, 일상 생활, 반려동물, 취향 수집을 위한 선택 기준을 안내합니다.', robots: { index: false, follow: false } };
export const dynamicParams = false;
export function generateStaticParams() { return CATEGORIES.map(category => ({ category })); }
export default async function Page({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  return <RecommendationBrowse category={category}/>;
}
