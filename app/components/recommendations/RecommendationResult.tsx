"use client";
import dynamic from 'next/dynamic';
import { RECOMMENDATIONS_RELEASED } from '@/js/recommendations-core.mjs';
const Result = dynamic(() => import('./RecommendationSurface').then(m => m.RecommendationResult), { ssr: false });
type Props = { service: string; species?: string; groupId?: string; locale?: string; brand?: string; completed?: boolean; practiceTags?: string[]; source?: string; color?: string; motif?: string };
export function RecommendationResult(props: Props) {
  if (!RECOMMENDATIONS_RELEASED || props.completed === false) return null;
  return <Result {...props}/>;
}
