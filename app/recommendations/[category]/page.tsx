import RecommendationBrowse from '@/app/components/recommendations/RecommendationSurface';
import { CATEGORIES } from '@/js/recommendations-core.mjs';
export const metadata = { title: '생활 추천 | 꿀꿀 운세', robots: { index: false, follow: false } };
export const dynamicParams = false;
export function generateStaticParams() { return CATEGORIES.map(category => ({ category })); }
export default async function Page({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  return <RecommendationBrowse category={category}/>;
}
